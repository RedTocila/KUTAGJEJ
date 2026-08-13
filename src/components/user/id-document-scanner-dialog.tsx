'use client';

import * as React from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  IconButton,
  LinearProgress,
  Typography,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  computeCardGuide,
  evaluateScanQuality,
  ID_CARD_ASPECT,
  mapGuideToVideoCrop,
  type CardGuideRect,
} from '@/lib/id-document-scan-quality';

const ANALYSIS_INTERVAL_MS = 160;
const STABLE_READABLE_FRAMES = 9;

export interface IdDocumentScannerDialogProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
}

type ScanPhase = 'starting' | 'scanning' | 'capturing' | 'error';

function statusMessage(quality: ReturnType<typeof evaluateScanQuality> | null, stableCount: number): string {
  if (!quality) return 'Duke hapur kamerën…';
  if (quality.brightness < 72) return 'Shtoni më shumë dritë mbi ID-në';
  if (quality.brightness > 228) return 'Shumë dritë — shmangni shkëlqimin';
  if (quality.contrast < 28) return 'Afrojeni ID-në brenda kornizës';
  if (quality.sharpness < 95) return 'Mbajeni telefonin të qetë — fokusoni detajet';
  if (quality.motion > 11) return 'Mbajeni të palëvizshme për skanim automatik';
  if (stableCount >= STABLE_READABLE_FRAMES - 2) return 'Detajet janë të lexueshme — skanim…';
  return 'Detajet duken mirë — mbajeni të qetë';
}

export function IdDocumentScannerDialog({ open, onClose, onCapture }: IdDocumentScannerDialogProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const analysisCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const prevFrameRef = React.useRef<ImageData | null>(null);
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
    prevFrameRef.current = null;
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
    onCapture(file, previewUrl);
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

    const sampleW = 240;
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
    const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
    const quality = evaluateScanQuality(imageData, prevFrameRef.current);
    prevFrameRef.current = imageData;

    if (quality.readable) {
      stableCountRef.current += 1;
    } else {
      stableCountRef.current = 0;
    }

    setProgress(Math.min(100, Math.round((stableCountRef.current / STABLE_READABLE_FRAMES) * 100)));
    setQualityHint(statusMessage(quality, stableCountRef.current));
    setPhase('scanning');

    if (stableCountRef.current >= STABLE_READABLE_FRAMES) {
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
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
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
      onClose={phase === 'capturing' ? undefined : handleClose}
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
      <IconButton
        type="button"
        onClick={handleClose}
        disabled={phase === 'capturing'}
        aria-label="Mbyll skanerin"
        sx={{
          position: 'fixed',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 'max(12px, env(safe-area-inset-right))',
          zIndex: 4,
          width: 44,
          height: 44,
          color: '#fff',
          bgcolor: 'rgba(255,255,255,0.12)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)', color: '#fff' },
        }}
      >
        <XIcon size={22} weight="bold" />
      </IconButton>

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
              zIndex: 3,
            }}
          />
        ) : null}

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'max(16px, env(safe-area-inset-top))',
            zIndex: 4,
            px: 2,
            pt: 6,
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 800 }}>
            Skano pjesën e përparme të ID-së
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.82)', mt: 0.75, fontWeight: 600 }}>
            Vendoseni kartën brenda kornizës. Skanimi bëhet vetë kur detajet janë të lexueshme.
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            zIndex: 4,
            px: 2.5,
            pb: 1,
          }}
        >
          {phase === 'capturing' ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={36} sx={{ color: 'primary.main' }} />
            </Box>
          ) : error ? (
            <Typography variant="body2" sx={{ color: '#ffb4ab', textAlign: 'center', fontWeight: 700 }}>
              {error}
            </Typography>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: '#fff', textAlign: 'center', fontWeight: 700, mb: 1.25 }}>
                {qualityHint}
              </Typography>
              <LinearProgress
                variant={frameReady ? 'determinate' : 'indeterminate'}
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 999,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '& .MuiLinearProgress-bar': { borderRadius: 999 },
                }}
              />
            </>
          )}
        </Box>
      </Box>
    </Dialog>
  );
}
