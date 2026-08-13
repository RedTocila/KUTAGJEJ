/** ISO/IEC 7810 ID-1 card aspect ratio (credit card / ID). */
export const ID_CARD_ASPECT = 85.6 / 53.98;

export interface CardGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanQualitySample {
  brightness: number;
  contrast: number;
  inFrame: boolean;
}

function grayAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  const i = (y * width + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

export function measureBrightnessAndContrast(imageData: ImageData): { brightness: number; contrast: number } {
  const { data, width, height } = imageData;
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const g = grayAt(data, width, x, y);
      sum += g;
      sumSq += g * g;
      count += 1;
    }
  }

  if (!count) return { brightness: 0, contrast: 0 };
  const mean = sum / count;
  const variance = Math.max(0, sumSq / count - mean * mean);
  return { brightness: mean, contrast: Math.sqrt(variance) };
}

/** Loose check: something visible inside the frame (not a flat blank surface). */
export function evaluateFrameReady(imageData: ImageData): ScanQualitySample {
  const { brightness, contrast } = measureBrightnessAndContrast(imageData);
  const inFrame = contrast >= 12 && brightness >= 24 && brightness <= 245;
  return { brightness, contrast, inFrame };
}

/** Map on-screen guide box to video pixel coordinates when video uses object-fit: cover. */
export function mapGuideToVideoCrop(
  guide: CardGuideRect,
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  const scale = Math.max(containerW / videoW, containerH / videoH);
  const renderedW = videoW * scale;
  const renderedH = videoH * scale;
  const offsetX = (renderedW - containerW) / 2;
  const offsetY = (renderedH - containerH) / 2;

  const sx = Math.max(0, Math.round((guide.x + offsetX) / scale));
  const sy = Math.max(0, Math.round((guide.y + offsetY) / scale));
  const sw = Math.min(videoW - sx, Math.round(guide.width / scale));
  const sh = Math.min(videoH - sy, Math.round(guide.height / scale));

  return { sx, sy, sw, sh };
}

export function computeCardGuide(containerW: number, containerH: number): CardGuideRect {
  const maxW = containerW * 0.88;
  const maxH = containerH * 0.52;
  let width = maxW;
  let height = width / ID_CARD_ASPECT;
  if (height > maxH) {
    height = maxH;
    width = height * ID_CARD_ASPECT;
  }
  return {
    x: (containerW - width) / 2,
    y: (containerH - height) / 2,
    width,
    height,
  };
}
