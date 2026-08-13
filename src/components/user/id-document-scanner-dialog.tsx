'use client';

import * as React from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { X as XIcon } from '@phosphor-icons/react/dist/ssr/X';

import {
  computeCardGuide,
  mapGuideToVideoCrop,
  type CardGuideRect,
} from '@/lib/id-document-scan-quality';
import { scanIdDocumentWithAi } from '@/lib/id-document-scan-client';

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
  const captureCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const capturingRef = React.useRef(false);
  const guideRef = React.useRef<CardGuideRect | null>(null);
  const restartScanRef = React.useRef<(() => void) | null>(null);

  const [phase, setPhase] = React.useState<ScanPhase>('starting');
  const [error, setError] = React.useState<string | null>(null);
  const [guide, setGuide] = React.useState<CardGuideRect | null>(null);
  const [cameraReady, setCameraReady] = React.useState(false);

  const updateGuide = React.useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cardGuide = computeCardGuide(rect.width, rect.height);
    guideRef.current = cardGuide;
    setGuide(cardGuide);
  }, []);

  const stopCamera = React.useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    capturingRef.current = false;
    setCameraReady(false);
  }, []);

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

    setPhase('validating');

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
  }, [onCapture, onClose, stopCamera]);

  React.useEffect(() => {
    if (!open) {
      stopCamera();
      setPhase('starting');
      setError(null);
      setGuide(null);
      guideRef.current = null;
      return;
    }

    let cancelled = false;

    const start = async () => {
      setPhase('starting');
      setError(null);
      setCameraReady(false);

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

        updateGuide();
        setCameraReady(true);
        setPhase('scanning');
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
  }, [open, stopCamera, updateGuide]);

  React.useEffect(() => {
    if (!open || !cameraReady) return;

    const onResize = () => updateGuide();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open, cameraReady, updateGuide]);

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
              borderColor: cameraReady ? 'primary.main' : 'rgba(255,255,255,0.85)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
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
            bottom: 'max(20px, env(safe-area-inset-bottom))',
            zIndex: 2,
            px: 2.5,
            pb: 1,
            pointerEvents: 'none',
          }}
        >
          {phase === 'capturing' || phase === 'validating' ? (
            <Stack sx={{ alignItems: 'center' }}>
              <CircularProgress size={36} sx={{ color: 'primary.main' }} />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
              {error ? (
                <Typography variant="body2" sx={{ color: '#ffb4ab', textAlign: 'center', fontWeight: 700, px: 1 }}>
                  {error}
                </Typography>
              ) : null}
              <Box
                component="button"
                type="button"
                aria-label="Kap foton"
                onClick={() => {
                  if (phase === 'error') {
                    setError(null);
                    capturingRef.current = false;
                    restartScanRef.current?.();
                    return;
                  }
                  void captureFromGuide();
                }}
                disabled={phase === 'starting' || (phase === 'scanning' && !cameraReady)}
                sx={{
                  width: 78,
                  height: 78,
                  borderRadius: '50%',
                  border: '4px solid #fff',
                  bgcolor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 0,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'opacity 0.2s ease',
                  '&:disabled': { opacity: 0.4, cursor: 'not-allowed' },
                  '&:active:not(:disabled) .id-shutter-inner': {
                    transform: 'scale(0.9)',
                  },
                }}
              >
                <Box
                  className="id-shutter-inner"
                  sx={{
                    width: 62,
                    height: 62,
                    borderRadius: '50%',
                    bgcolor: '#fff',
                    transition: 'transform 0.1s ease',
                  }}
                />
              </Box>
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
