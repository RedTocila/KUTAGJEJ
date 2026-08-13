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
  | 'cluttered'
  | 'hold_steady'
  | 'almost'
  | 'ready';

export interface ScanQualitySample {
  brightness: number;
  contrast: number;
  sharpness: number;
  coverage: number;
  detailScore: number;
  borderScore: number;
  edgeCompleteness: number;
  clutterScore: number;
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

/** Share of 3×3 grid cells that contain enough edge energy (card fills the guide). */
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
      if (avgEdge >= 14) activeCells += 1;
    }
  }

  return activeCells / (cols * rows);
}

/** Text / fine-detail score from local contrast transitions in the inner card area. */
function measureDetailScore(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const marginX = Math.floor(width * 0.12);
  const marginY = Math.floor(height * 0.12);
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
      if (Math.abs(g - prev) >= 18) transitions += 1;
      prev = g;
      samples += 1;
    }
  }

  for (let x = x0; x < x1; x += 3) {
    let prev = grayAt(data, width, x, y0);
    for (let y = y0 + 1; y < y1; y += 1) {
      const g = grayAt(data, width, x, y);
      if (Math.abs(g - prev) >= 18) transitions += 1;
      prev = g;
      samples += 1;
    }
  }

  return samples ? transitions / samples : 0;
}

/** Strong edges along guide borders suggest a rectangular document boundary. */
function measureBorderStructure(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const bandX = Math.max(2, Math.floor(width * 0.08));
  const bandY = Math.max(2, Math.floor(height * 0.08));

  const sampleBand = (xStart: number, xEnd: number, yStart: number, yEnd: number): number => {
    let sum = 0;
    let count = 0;
    for (let y = yStart; y < yEnd; y += 2) {
      for (let x = xStart; x < xEnd; x += 2) {
        if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
        sum += sobelMagnitude(data, width, height, x, y);
        count += 1;
      }
    }
    return count ? sum / count : 0;
  };

  const top = sampleBand(0, width, 0, bandY);
  const bottom = sampleBand(0, width, height - bandY, height);
  const left = sampleBand(0, bandX, 0, height);
  const right = sampleBand(width - bandX, width, 0, height);
  const center = sampleBand(bandX, width - bandX, bandY, height - bandY);

  const borderAvg = (top + bottom + left + right) / 4;
  const borderStrong = [top, bottom, left, right].filter((v) => v >= 16).length;
  const centerOk = center >= 10;

  if (borderStrong >= 3 && centerOk && borderAvg >= 14) return 1;
  if (borderStrong >= 2 && centerOk) return 0.6;
  return borderStrong / 4;
}

/** All four card edges must be visible — rejects cropped captures. */
function measureEdgeCompleteness(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const bandX = Math.max(2, Math.floor(width * 0.08));
  const bandY = Math.max(2, Math.floor(height * 0.08));

  const sampleBand = (xStart: number, xEnd: number, yStart: number, yEnd: number): number => {
    let sum = 0;
    let count = 0;
    for (let y = yStart; y < yEnd; y += 2) {
      for (let x = xStart; x < xEnd; x += 2) {
        if (x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1) continue;
        sum += sobelMagnitude(data, width, height, x, y);
        count += 1;
      }
    }
    return count ? sum / count : 0;
  };

  const edges = [
    sampleBand(0, width, 0, bandY),
    sampleBand(0, width, height - bandY, height),
    sampleBand(0, bandX, 0, height),
    sampleBand(width - bandX, width, 0, height),
  ];

  return edges.filter((v) => v >= 18).length / 4;
}

interface BandStats {
  mean: number;
  variance: number;
  saturation: number;
}

function sampleBandStats(
  data: Uint8ClampedArray,
  width: number,
  xStart: number,
  xEnd: number,
  yStart: number,
  yEnd: number,
): BandStats {
  let sum = 0;
  let sumSq = 0;
  let satSum = 0;
  let count = 0;

  for (let y = yStart; y < yEnd; y += 2) {
    for (let x = xStart; x < xEnd; x += 2) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gVal = grayAt(data, width, x, y);
      sum += gVal;
      sumSq += gVal * gVal;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      satSum += max > 0 ? (max - min) / max : 0;
      count += 1;
    }
  }

  if (!count) return { mean: 0, variance: 0, saturation: 0 };
  const mean = sum / count;
  return {
    mean,
    variance: Math.max(0, sumSq / count - mean * mean),
    saturation: satSum / count,
  };
}

/** Penalize foreign objects (lighters, boxes, hands) visible beside the card. */
function measureBackgroundClutter(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const margin = Math.max(3, Math.floor(Math.min(width, height) * 0.1));
  const innerMargin = Math.max(margin + 2, Math.floor(Math.min(width, height) * 0.18));

  const center = sampleBandStats(data, width, innerMargin, width - innerMargin, innerMargin, height - innerMargin);
  const bands = [
    sampleBandStats(data, width, 0, width, 0, margin),
    sampleBandStats(data, width, 0, width, height - margin, height),
    sampleBandStats(data, width, 0, margin, 0, height),
    sampleBandStats(data, width, width - margin, width, 0, height),
  ];

  let penalty = 0;
  for (const band of bands) {
    const colorDiff = Math.abs(band.mean - center.mean);
    if (colorDiff >= 35 && band.variance >= 700) penalty += 1;
    if (band.saturation >= 0.28 && colorDiff >= 22) penalty += 0.75;
  }

  return Math.max(0, 1 - penalty / 2.5);
}

function pickHint(params: {
  brightness: number;
  contrast: number;
  sharpness: number;
  coverage: number;
  detailScore: number;
  borderScore: number;
  edgeCompleteness: number;
  clutterScore: number;
  inFrame: boolean;
  readable: boolean;
}): ScanQualityHint {
  const {
    brightness,
    contrast,
    sharpness,
    coverage,
    detailScore,
    borderScore,
    edgeCompleteness,
    clutterScore,
    inFrame,
    readable,
  } = params;

  if (brightness < 24) return 'too_dark';
  if (brightness > 245) return 'too_bright';
  if (contrast < 10) return 'no_card';

  if (coverage < 0.5 || borderScore < 0.5 || edgeCompleteness < 0.5) {
    return coverage < 0.38 ? 'no_card' : 'partial_card';
  }

  if (clutterScore < 0.55) return 'cluttered';
  if (!inFrame) return 'partial_card';
  if (sharpness < 60) return 'blurry';
  if (detailScore < 0.05) return 'low_detail';
  if (!readable) return 'hold_steady';
  return 'ready';
}

export interface EvaluateFrameOptions {
  /** Stricter thresholds for the final full-resolution capture sent to AI. */
  forCapture?: boolean;
}

/**
 * Decide whether an ID card fully fills the guide and details look readable enough to capture.
 * Uses grid coverage, border structure, sharpness, and fine-detail heuristics — no OCR.
 */
export function evaluateFrameReady(imageData: ImageData, options?: EvaluateFrameOptions): ScanQualitySample {
  const forCapture = options?.forCapture === true;
  const { brightness, contrast } = measureBrightnessAndContrast(imageData);
  const sharpness = measureSharpness(imageData);
  const coverage = measureGridCoverage(imageData);
  const detailScore = measureDetailScore(imageData);
  const borderScore = measureBorderStructure(imageData);
  const edgeCompleteness = measureEdgeCompleteness(imageData);
  const clutterScore = measureBackgroundClutter(imageData);

  const minCoverage = forCapture ? 0.72 : 0.67;
  const minBorder = forCapture ? 0.8 : 0.75;
  const minEdge = forCapture ? 0.8 : 0.75;
  const minSharpness = forCapture ? 95 : 85;
  const minDetail = forCapture ? 0.072 : 0.065;

  const inFrame =
    contrast >= 16 &&
    brightness >= 28 &&
    brightness <= 240 &&
    coverage >= minCoverage &&
    borderScore >= minBorder &&
    edgeCompleteness >= minEdge &&
    clutterScore >= 0.65;

  const readable =
    inFrame &&
    sharpness >= minSharpness &&
    detailScore >= minDetail &&
    contrast >= 18;

  const hint = pickHint({
    brightness,
    contrast,
    sharpness,
    coverage,
    detailScore,
    borderScore,
    edgeCompleteness,
    clutterScore,
    inFrame,
    readable,
  });

  return {
    brightness,
    contrast,
    sharpness,
    coverage,
    detailScore,
    borderScore,
    edgeCompleteness,
    clutterScore,
    inFrame,
    readable,
    hint,
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
  const maxW = containerW * 0.82;
  const maxH = containerH * 0.46;
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
      return 'Afrojeni kamerën — karta duhet të mbushë kornizën';
    case 'too_dark':
      return 'Më shumë dritë e nevojshme';
    case 'too_bright':
      return 'Shumë dritë — lëvizeni pak';
    case 'blurry':
      return 'Mbajeni telefonin fiks — foto e turbullt';
    case 'low_detail':
      return 'Afrojeni kamerën — detajet nuk lexohen';
    case 'cluttered':
      return 'Hiqni objektet pranë kartës — vetëm ID-ja në kornizë';
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
