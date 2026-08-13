/** ISO/IEC 7810 ID-1 card aspect ratio (credit card / ID). */
export const ID_CARD_ASPECT = 85.6 / 53.98;

export interface CardGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScanQualitySample {
  sharpness: number;
  brightness: number;
  contrast: number;
  motion: number;
  score: number;
  readable: boolean;
}

function grayAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  const i = (y * width + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
}

/** Laplacian variance — higher means sharper focus. */
export function measureSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const c = grayAt(data, width, x, y);
      const lap =
        4 * c -
        grayAt(data, width, x - 1, y) -
        grayAt(data, width, x + 1, y) -
        grayAt(data, width, x, y - 1) -
        grayAt(data, width, x, y + 1);
      sum += lap * lap;
      count += 1;
    }
  }
  return count ? sum / count : 0;
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

/** Mean absolute difference vs previous frame (lower = more stable). */
export function measureMotion(current: ImageData, previous: ImageData | null): number {
  if (!previous || current.width !== previous.width || current.height !== previous.height) return 999;
  const a = current.data;
  const b = previous.data;
  const { width, height } = current;
  let sum = 0;
  let count = 0;

  for (let y = 0; y < height; y += 3) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      sum += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      count += 3;
    }
  }
  return count ? sum / count : 999;
}

const MIN_SHARPNESS = 95;
const MIN_CONTRAST = 28;
const MIN_BRIGHTNESS = 72;
const MAX_BRIGHTNESS = 228;
const MAX_MOTION = 11;

export function evaluateScanQuality(
  imageData: ImageData,
  previous: ImageData | null,
): ScanQualitySample {
  const sharpness = measureSharpness(imageData);
  const { brightness, contrast } = measureBrightnessAndContrast(imageData);
  const motion = measureMotion(imageData, previous);

  const sharpOk = sharpness >= MIN_SHARPNESS;
  const contrastOk = contrast >= MIN_CONTRAST;
  const lightOk = brightness >= MIN_BRIGHTNESS && brightness <= MAX_BRIGHTNESS;
  const stableOk = motion <= MAX_MOTION;

  const score =
    (sharpOk ? 0.4 : 0) +
    (contrastOk ? 0.25 : 0) +
    (lightOk ? 0.2 : 0) +
    (stableOk ? 0.15 : 0);

  return {
    sharpness,
    brightness,
    contrast,
    motion,
    score,
    readable: sharpOk && contrastOk && lightOk && stableOk,
  };
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
