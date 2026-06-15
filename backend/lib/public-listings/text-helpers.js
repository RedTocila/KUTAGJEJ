function pickImage(doc) {
  return Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0 ? doc.imageUrls[0] : null;
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
  snippet,
  carSlugSource,
  carDisplayTitle,
};
