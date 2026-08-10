function isPersistableImageUrl(url) {
  const u = String(url || '').trim();
  if (!u || /^blob:/i.test(u) || /^data:/i.test(u)) return false;
  return /^https?:\/\//i.test(u) || u.startsWith('/');
}

/** First durable gallery URL — skips temporary blob:/data: previews. */
function pickImage(doc) {
  const urls = Array.isArray(doc.imageUrls) ? doc.imageUrls : [];
  for (const raw of urls) {
    if (isPersistableImageUrl(raw)) return String(raw).trim();
  }
  return null;
}

/** Trim a long description to a card-friendly snippet (no mid-word cuts). */
function snippet(text, max = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function carSlugSource(doc) {
  return [doc.make, doc.model, doc.variant, doc.year].filter((x) => x != null && String(x).trim()).join(' ');
}

function carDisplayTitle(doc) {
  return [doc.make, doc.model, doc.variant]
    .filter((x) => x != null && String(x).trim())
    .join(' ')
    .trim();
}

module.exports = {
  pickImage,
  isPersistableImageUrl,
  snippet,
  carSlugSource,
  carDisplayTitle,
};
