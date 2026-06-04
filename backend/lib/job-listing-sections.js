/** Shared validation for job listing structured sections (responsibilities, requirements, benefits). */

const BENEFIT_ID_VALUES = new Set([
  'pay',
  'negotiable-pay',
  'growth',
  'health',
  'flex',
  'bonus',
  'training',
  'meals',
  'transport',
  'custom',
]);

const MAX_LINES = 8;
const MIN_LINE_LEN = 8;
const MAX_LINE_LEN = 500;
const MAX_BENEFITS = 8;
const MIN_BENEFITS = 1;

function normalizeLines(raw, { minItems = 1, maxItems = MAX_LINES } = {}) {
  if (!Array.isArray(raw)) return { ok: false, message: 'Lista duhet të jetë varg.' };
  const lines = raw
    .map((line) => String(line ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, maxItems);

  if (lines.length < minItems) {
    return { ok: false, message: `Shtoni të paktën ${minItems} pika.` };
  }
  for (const line of lines) {
    if (line.length < MIN_LINE_LEN) {
      return { ok: false, message: `Çdo pikë duhet të ketë të paktën ${MIN_LINE_LEN} karaktere.` };
    }
    if (line.length > MAX_LINE_LEN) {
      return { ok: false, message: `Çdo pikë mund të ketë deri në ${MAX_LINE_LEN} karaktere.` };
    }
  }
  return { ok: true, lines };
}

function normalizeBenefits(raw) {
  if (!Array.isArray(raw)) return { ok: false, message: 'Përfitimet duhet të jenë listë.' };
  const items = [];
  const seen = new Set();

  for (const entry of raw.slice(0, MAX_BENEFITS)) {
    const id = String(entry?.id ?? '').trim();
    const label = String(entry?.label ?? '').replace(/\s+/g, ' ').trim();
    if (!id || !label) continue;
    if (!BENEFIT_ID_VALUES.has(id)) {
      return { ok: false, message: 'Përfitimi i zgjedhur nuk është i vlefshëm.' };
    }
    if (label.length < 3 || label.length > 120) {
      return { ok: false, message: 'Etiketa e përfitimit duhet të jetë 3–120 karaktere.' };
    }
    const key = `${id}:${label.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ id, label });
  }

  if (items.length < MIN_BENEFITS) {
    return { ok: false, message: 'Zgjidhni të paktën një përfitim.' };
  }
  return { ok: true, benefits: items };
}

function validateJobSections(body) {
  const resp = normalizeLines(body?.responsibilities, { minItems: 1 });
  if (!resp.ok) return { ok: false, message: `Detyrat: ${resp.message}` };

  const req = normalizeLines(body?.requirements, { minItems: 1 });
  if (!req.ok) return { ok: false, message: `Kërkesat: ${req.message}` };

  const ben = normalizeBenefits(body?.benefits);
  if (!ben.ok) return { ok: false, message: ben.message };

  return {
    ok: true,
    responsibilities: resp.lines,
    requirements: req.lines,
    benefits: ben.benefits,
  };
}

module.exports = {
  BENEFIT_ID_VALUES,
  validateJobSections,
  normalizeLines,
  normalizeBenefits,
};
