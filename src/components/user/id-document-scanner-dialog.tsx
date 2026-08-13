'use client';

import * as React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  computeCardGuide,
  evaluateFrameReady,
  ID_CARD_ASPECT,
  isCaptureUsable,
  mapGuideToVideoCrop,
  scanQualityHintMessage,
  type CardGuideRect,
} from '@/lib/id-document-scan-quality';
import { scanIdDocumentWithAi } from '@/lib/id-document-scan-client';

const ANALYSIS_INTERVAL_MS = 160;
/** Stable frames before auto-capture. */
const READY_FRAMES = 4;

export interface IdDocumentScanCapture {
  file: File;
  previewUrl: string;
  idNumber?: string | null;
}

export interface IdDocumentScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (capture: IdDocumentScanCapture) => void;
}

type ScanPhase = 'starting' | 'scanning' | 'capturing' | 'validating' | 'error';

async function openCameraStream(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // @ts-expect-error — focusMode is supported on some mobile browsers
        focusMode: { ideal: 'continuous' },
      },
      audio: false,
    },
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    {
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    },
    { video: true, audio: false },
  ];

  let lastErr: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

export function IdDocumentScannerDialog({ open, onClose, onCapture }: IdDocumentScannerDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const analysisCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stableCountRef = React.useRef(0);
  const capturingRef = React.useRef(false);
  const guideRef = React.useRef<CardGuideRect | null>(null);
  const intervalRef = React.useRef<number | null>(null);

  const [phase, setPhase] = React.useState<ScanPhase>('starting');
  const [error, setError] = React.useState<string | null>(null);
  const [guide, setGuide] = React.useState<CardGuideRect | null>(null);
  const [qualityHint, setQualityHint] = React.useState('Duke hapur kamerën…');
  const [progress, setProgress] = React.useState(0);
  const [frameReady, setFrameReady] = React.useState(false);
  const restartScanRef = React.useRef<(() => void) | null>(null);

  const stopAnalysis = React.useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    stopAnalysis();
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    stableCountRef.current = 0;
    capturingRef.current = false;
  }, [stopAnalysis]);

  const handleClose = React.useCallback(() => {
    stopCamera();
    onClose();
  }, [onClose, stopCamera]);

  const captureFromGuide = React.useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;
    const activeGuide = guideRef.current;
    if (!video || !container || !activeGuide || capturingRef.current) return;
    if (video.videoWidth <= 0 || video.videoHeight <= 0) return;

    capturingRef.current = true;
    setPhase('capturing');
    stopAnalysis();

    const crop = mapGuideToVideoCrop(
      activeGuide,
      container.clientWidth,
      container.clientHeight,
      video.videoWidth,
      video.videoHeight,
    );

    const canvas = captureCanvasRef.current ?? document.createElement('canvas');
    captureCanvasRef.current = canvas;
    canvas.width = crop.sw;
    canvas.height = crop.sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Nuk u arrit skanimi i fotos.');
      setPhase('error');
      capturingRef.current = false;
      stopCamera();
      return;
    }

    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
    stopCamera();

    const imageData = ctx.getImageData(0, 0, crop.sw, crop.sh);
    if (!isCaptureUsable(imageData)) {
      capturingRef.current = false;
      const sample = evaluateFrameReady(imageData);
      setError(
        sample.hint === 'too_dark'
          ? 'Foto shumë e errët. Provoni me më shumë dritë.'
          : sample.hint === 'blurry' || sample.hint === 'low_detail'
            ? 'Foto e turbullt. Mbajeni telefonin fiks dhe afrojeni kamerën.'
            : 'Vendoseni ID-në brenda kornizës dhe provoni përsëri.',
      );
      setPhase('error');
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
    if (!blob) {
      setError('Nuk u arrit skanimi i fotos.');
      setPhase('error');
      capturingRef.current = false;
      return;
    }

    const file = new File([blob], `id-front-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(blob);

    setPhase('validating');
    setQualityHint('Duke verifikuar fotografinë…');

    const ai = await scanIdDocumentWithAi(file);
    if (ai.error) {
      setError(ai.error);
      setPhase('error');
      capturingRef.current = false;
      return;
    }

    if (!ai.result?.isIdCard) {
      URL.revokeObjectURL(previewUrl);
      setError(
        ai.result?.message ||
          'Nuk u njoh si kartë ID e vërtetë. Skanoni pjesën e përparme të ID-së tuaj fizike.',
      );
      setPhase('error');
      capturingRef.current = false;
      return;
    }

    onCapture({
      file,
      previewUrl,
      idNumber: ai.result.idNumber ?? null,
    });
    capturingRef.current = false;
    onClose();
  }, [onCapture, onClose, stopAnalysis, stopCamera]);

  const runAnalysis = React.useCallback(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container || capturingRef.current) return;
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    const rect = container.getBoundingClientRect();
    const cardGuide = computeCardGuide(rect.width, rect.height);
    guideRef.current = cardGuide;
    setGuide(cardGuide);

    const sampleW = 320;
    const sampleH = Math.max(40, Math.round(sampleW / ID_CARD_ASPECT));
    const canvas = analysisCanvasRef.current ?? document.createElement('canvas');
    analysisCanvasRef.current = canvas;
    canvas.width = sampleW;
    canvas.height = sampleH;

    const crop = mapGuideToVideoCrop(
      cardGuide,
      rect.width,
      rect.height,
      video.videoWidth,
      video.videoHeight,
    );

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, sampleW, sampleH);
    const sample = evaluateFrameReady(ctx.getImageData(0, 0, sampleW, sampleH));

    if (sample.readable) {
      stableCountRef.current += 1;
    } else {
      stableCountRef.current = 0;
    }

    const hint =
      sample.readable && stableCountRef.current >= READY_FRAMES - 2 ? 'almost' : sample.hint;

    setProgress(Math.min(100, Math.round((stableCountRef.current / READY_FRAMES) * 100)));
    setQualityHint(scanQualityHintMessage(hint, stableCountRef.current, READY_FRAMES));
    setPhase('scanning');

    if (sample.readable && stableCountRef.current >= READY_FRAMES) {
      void captureFromGuide();
    }
  }, [captureFromGuide]);

  React.useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase('starting');
      setError(null);
      setGuide(null);
      guideRef.current = null;
      setQualityHint('Duke hapur kamerën…');
      setProgress(0);
      setFrameReady(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setPhase('starting');
      setError(null);
      setQualityHint('Duke hapur kamerën…');

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Kamera nuk mbështetet në këtë pajisje.');
        setPhase('error');
        return;
      }

      try {
        const stream = await openCameraStream();
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        await video.play();

        setFrameReady(true);
        setPhase('scanning');
        intervalRef.current = window.setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
      } catch {
        setError('Nuk u hap kamera. Lejoni aksesin te kamera dhe provoni përsëri.');
        setPhase('error');
      }
    };

    restartScanRef.current = () => {
      stopCamera();
      void start();
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, runAnalysis, stopCamera]);

  const borderColor =
    progress >= 100 ? 'success.main' : progress >= 55 ? 'primary.main' : 'rgba(255,255,255,0.85)';

  return (
    <Dialog
      open={open}
      onClose={phase === 'capturing' || phase === 'validating' ? undefined : handleClose}
      fullScreen
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#000',
            backgroundImage: 'none',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          bgcolor: '#000',
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          muted
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
        />

        {guide ? (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: guide.x,
              top: guide.y,
              width: guide.width,
              height: guide.height,
              borderRadius: 3,
              border: '3px solid',
              borderColor,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              transition: 'border-color 0.25s ease',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />
        ) : null}

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'max(16px, env(safe-area-inset-top))',
            zIndex: 2,
            px: 2,
            pt: 7,
            pr: 8,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800 }}>
            Skano pjesën e përparme të ID-së
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.75, fontWeight: 600 }}>
            Vendoseni të gjithë kartën brenda kornizës. Fotoja duhet të jetë e qartë dhe e lexueshme.
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            zIndex: 2,
            px: 2.5,
            pb: 1,
            pointerEvents: 'none',
          }}
        >
          {phase === 'capturing' || phase === 'validating' ? (
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <CircularProgress size={36} sx={{ color: 'primary.main' }} />
              {phase === 'validating' ? (
                <Typography variant="body2" sx={{ color: '#fff', textAlign: 'center', fontWeight: 700 }}>
                  {qualityHint}
                </Typography>
              ) : null}
            </Stack>
          ) : error ? (
            <Stack spacing={1.5} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#ffb4ab', textAlign: 'center', fontWeight: 700 }}>
                {error}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setError(null);
                    setPhase('starting');
                    setQualityHint('Duke hapur kamerën…');
                    setProgress(0);
                    capturingRef.current = false;
                    restartScanRef.current?.();
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  Provo përsëri
                </Button>
                <Button variant="outlined" onClick={handleClose} sx={{ fontWeight: 700, color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}>
                  Mbyll
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.25} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#fff', textAlign: 'center', fontWeight: 700 }}>
                {qualityHint}
              </Typography>
              <LinearProgress
                variant={frameReady ? 'determinate' : 'indeterminate'}
                value={progress}
                sx={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
              <Button
                variant="contained"
                onClick={() => void captureFromGuide()}
                disabled={!frameReady || phase !== 'scanning'}
                sx={{ fontWeight: 700, mt: 0.5, minWidth: 160 }}
              >
                Kap foton
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      <IconButton
        type="button"
        onClick={handleClose}
        disabled={phase === 'capturing' || phase === 'validating'}
        aria-label="Mbyll skanerin"
        sx={{
          position: 'fixed',
          top: 'max(10px, env(safe-area-inset-top))',
          right: 'max(10px, env(safe-area-inset-right))',
          zIndex: 9999,
          width: 48,
          height: 48,
          minWidth: 48,
          minHeight: 48,
          color: '#fff',
          bgcolor: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.28)',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          pointerEvents: 'auto',
          '&:hover': { bgcolor: 'rgba(0,0,0,0.72)', color: '#fff' },
          '&:active': { bgcolor: 'rgba(0,0,0,0.85)' },
        }}
      >
        <XIcon size={24} weight="bold" />
      </IconButton>
    </Dialog>
  );
}
