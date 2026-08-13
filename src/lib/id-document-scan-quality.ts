/** ISO/IEC 7810 ID-1 card aspect ratio (credit card / ID). */
export const ID_CARD_ASPECT = 85.6 / 53.98;

export interface CardGuideRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ScanQualityHint =
  | 'no_card'
  | 'partial_card'
  | 'too_dark'
  | 'too_bright'
  | 'blurry'
  | 'low_detail'
  | 'hold_steady'
  | 'almost'
  | 'ready';

export interface ScanQualitySample {
  brightness: number;
  contrast: number;
  sharpness: number;
  coverage: number;
  detailScore: number;
  inFrame: boolean;
  readable: boolean;
  hint: ScanQualityHint;
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

/** Laplacian variance — higher means sharper / less motion blur. */
function measureSharpness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  if (width < 3 || height < 3) return 0;

  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const c = grayAt(data, width, x, y);
      const lap =
        grayAt(data, width, x - 1, y) +
        grayAt(data, width, x + 1, y) +
        grayAt(data, width, x, y - 1) +
        grayAt(data, width, x, y + 1) -
        4 * c;
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }

  if (!count) return 0;
  const mean = sum / count;
  return Math.max(0, sumSq / count - mean * mean);
}

function sobelMagnitude(data: Uint8ClampedArray, width: number, height: number, x: number, y: number): number {
  const gx =
    -grayAt(data, width, x - 1, y - 1) +
    grayAt(data, width, x + 1, y - 1) -
    2 * grayAt(data, width, x - 1, y) +
    2 * grayAt(data, width, x + 1, y) -
    grayAt(data, width, x - 1, y + 1) +
    grayAt(data, width, x + 1, y + 1);
  const gy =
    -grayAt(data, width, x - 1, y - 1) -
    2 * grayAt(data, width, x, y - 1) -
    grayAt(data, width, x + 1, y - 1) +
    grayAt(data, width, x - 1, y + 1) +
    2 * grayAt(data, width, x, y + 1) +
    grayAt(data, width, x + 1, y + 1);
  return Math.sqrt(gx * gx + gy * gy);
}

/** Share of 3×3 grid cells that contain enough edge energy (something document-like is present). */
function measureGridCoverage(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const cols = 3;
  const rows = 3;
  const cellW = width / cols;
  const cellH = height / rows;
  let activeCells = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.floor(col * cellW);
      const y0 = Math.floor(row * cellH);
      const x1 = Math.min(width - 1, Math.floor((col + 1) * cellW));
      const y1 = Math.min(height - 1, Math.floor((row + 1) * cellH));

      let edgeSum = 0;
      let count = 0;
      for (let y = Math.max(1, y0); y < y1 - 1; y += 2) {
        for (let x = Math.max(1, x0); x < x1 - 1; x += 2) {
          edgeSum += sobelMagnitude(data, width, height, x, y);
          count += 1;
        }
      }

      const avgEdge = count ? edgeSum / count : 0;
      if (avgEdge >= 10) activeCells += 1;
    }
  }

  return activeCells / (cols * rows);
}

/** Text / fine-detail score from local contrast transitions in the inner area. */
function measureDetailScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const marginX = Math.floor(width * 0.1);
  const marginY = Math.floor(height * 0.1);
  const x0 = marginX;
  const y0 = marginY;
  const x1 = width - marginX;
  const y1 = height - marginY;

  let transitions = 0;
  let samples = 0;

  for (let y = y0; y < y1; y += 3) {
    let prev = grayAt(data, width, x0, y);
    for (let x = x0 + 1; x < x1; x += 1) {
      const g = grayAt(data, width, x, y);
      if (Math.abs(g - prev) >= 14) transitions += 1;
      prev = g;
      samples += 1;
    }
  }

  for (let x = x0; x < x1; x += 3) {
    let prev = grayAt(data, width, x, y0);
    for (let y = y0 + 1; y < y1; y += 1) {
      const g = grayAt(data, width, x, y);
      if (Math.abs(g - prev) >= 14) transitions += 1;
      prev = g;
      samples += 1;
    }
  }

  return samples ? transitions / samples : 0;
}

function pickHint(params: {
  brightness: number;
  contrast: number;
  sharpness: number;
  coverage: number;
  detailScore: number;
  inFrame: boolean;
  readable: boolean;
}): ScanQualityHint {
  const { brightness, contrast, sharpness, coverage, detailScore, inFrame, readable } = params;

  if (brightness < 20) return 'too_dark';
  if (brightness > 250) return 'too_bright';
  if (contrast < 8) return 'no_card';
  if (coverage < 0.34) return 'no_card';
  if (coverage < 0.45) return 'partial_card';
  if (!inFrame) return 'partial_card';
  if (sharpness < 35) return 'blurry';
  if (detailScore < 0.035) return 'low_detail';
  if (!readable) return 'hold_steady';
  return 'ready';
}

/**
 * Lightweight pre-check before capture. Only blocks empty/dark/blurry frames.
 * Document validation (clutter, screen photos, OCR) is handled by the server AI.
 */
export function evaluateFrameReady(imageData: ImageData): ScanQualitySample {
  const { brightness, contrast } = measureBrightnessAndContrast(imageData);
  const sharpness = measureSharpness(imageData);
  const coverage = measureGridCoverage(imageData);
  const detailScore = measureDetailScore(imageData);

  const inFrame =
    contrast >= 10 &&
    brightness >= 22 &&
    brightness <= 248 &&
    coverage >= 0.45;

  const readable =
    inFrame &&
    sharpness >= 45 &&
    detailScore >= 0.038 &&
    contrast >= 12;

  const hint = pickHint({
    brightness,
    contrast,
    sharpness,
    coverage,
    detailScore,
    inFrame,
    readable,
  });

  return {
    brightness,
    contrast,
    sharpness,
    coverage,
    detailScore,
    inFrame,
    readable,
    hint,
  };
}

/** Minimal sanity check — only reject completely unusable captures before AI. */
export function isCaptureUsable(imageData: ImageData): boolean {
  const { brightness, contrast } = measureBrightnessAndContrast(imageData);
  const sharpness = measureSharpness(imageData);
  const coverage = measureGridCoverage(imageData);
  return brightness >= 18 && brightness <= 252 && contrast >= 6 && coverage >= 0.28 && sharpness >= 20;
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
  const maxH = containerH * 0.5;
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

export function scanQualityHintMessage(hint: ScanQualityHint, stableCount: number, readyFrames: number): string {
  switch (hint) {
    case 'no_card':
      return 'Vendoseni ID-në brenda kornizës';
    case 'partial_card':
      return 'Vendoseni të gjithë kartën brenda kornizës';
    case 'too_dark':
      return 'Më shumë dritë e nevojshme';
    case 'too_bright':
      return 'Shumë dritë — lëvizeni pak';
    case 'blurry':
      return 'Mbajeni telefonin fiks — foto e turbullt';
    case 'low_detail':
      return 'Afrojeni kamerën — detajet nuk lexohen';
    case 'hold_steady':
      return 'Mbajeni kartën brenda kornizës';
    case 'almost':
      return 'Duke verifikuar lexueshmërinë…';
    case 'ready':
      return stableCount >= readyFrames - 1 ? 'Duke skanuar…' : 'Lexueshmëria OK — mbajeni fiks';
    default:
      return 'Vendoseni ID-në brenda kornizës';
  }
}
