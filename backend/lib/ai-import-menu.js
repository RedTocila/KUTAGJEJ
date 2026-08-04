'use strict';

const { randomUUID } = require('crypto');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MENU_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
const MAX_IMAGES = 20;
const BATCH_SIZE = 4;
const MAX_CATEGORIES = 40;
const MAX_ITEMS = 250;
const MAX_IMAGE_CHARS = 6_500_000; // ~base64 of ~4.5MB

function isOpenAiConfigured() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function buildSystemPrompt() {
  return [
    'You extract restaurant / cafe / bar menus from photos.',
    'Return ONLY valid JSON with this shape:',
    '{',
    '  "categories": [',
    '    {',
    '      "name": "Category name",',
    '      "items": [',
    '        {',
    '          "name": "Item name",',
    '          "description": "Short description or empty string",',
    '          "price": 0,',
    '          "currency": "EUR" or "LEK"',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    'Rules:',
    '- Prefer Albanian category/item names when the menu is in Albanian.',
    '- Group items under clear categories (e.g. Paragjysime, Pizza, Pije).',
    '- price must be a number >= 0. If unknown, use 0.',
    '- currency is EUR unless LEK/ALL/Lekë is clearly shown.',
    '- Skip decorative text, addresses, wifi passwords, and phone numbers.',
    '- Do not invent items that are not visible.',
    '- Extract every readable item from the provided photos.',
  ].join('\n');
}

function normalizeDataUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.length > MAX_IMAGE_CHARS) return null;
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  return null;
}

function normalizeExtractedMenu(parsed) {
  const categoriesIn = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const categories = [];
  const items = [];

  for (let ci = 0; ci < categoriesIn.length && categories.length < MAX_CATEGORIES; ci += 1) {
    const row = categoriesIn[ci];
    const name = String(row?.name || '').trim().slice(0, 80);
    if (!name) continue;
    const categoryId = randomUUID();
    categories.push({ id: categoryId, name, sortOrder: categories.length });

    const rowItems = Array.isArray(row?.items) ? row.items : [];
    for (let ii = 0; ii < rowItems.length && items.length < MAX_ITEMS; ii += 1) {
      const item = rowItems[ii];
      const itemName = String(item?.name || '').trim().slice(0, 120);
      if (!itemName) continue;
      let price = Number(item?.price);
      if (!Number.isFinite(price) || price < 0) price = 0;
      const currency = String(item?.currency || '').toUpperCase() === 'LEK' ? 'LEK' : 'EUR';
      items.push({
        id: randomUUID(),
        categoryId,
        name: itemName,
        description: String(item?.description || '').trim().slice(0, 500),
        price,
        currency,
        imageUrl: null,
        sortOrder: items.length,
      });
    }
  }

  return { categories, items };
}

function mergeMenus(parts) {
  const categories = [];
  const items = [];
  const categoryIdByKey = new Map();

  const keyFor = (name) => name.trim().toLowerCase();

  for (const part of parts) {
    for (const cat of part.categories || []) {
      const key = keyFor(cat.name);
      let categoryId = categoryIdByKey.get(key);
      if (!categoryId) {
        if (categories.length >= MAX_CATEGORIES) continue;
        categoryId = randomUUID();
        categoryIdByKey.set(key, categoryId);
        categories.push({
          id: categoryId,
          name: cat.name,
          sortOrder: categories.length,
        });
      }

      const partItems = (part.items || []).filter((item) => item.categoryId === cat.id);
      for (const item of partItems) {
        if (items.length >= MAX_ITEMS) break;
        const dup = items.some(
          (row) =>
            row.categoryId === categoryId &&
            row.name.trim().toLowerCase() === String(item.name || '').trim().toLowerCase(),
        );
        if (dup) continue;
        items.push({
          ...item,
          id: randomUUID(),
          categoryId,
          sortOrder: items.length,
        });
      }
    }
  }

  return { categories, items };
}

async function extractMenuBatch(apiKey, imageUrls) {
  const content = [
    {
      type: 'text',
      text: 'Extract every readable menu category and item from these photo(s). Return JSON only.',
    },
    ...imageUrls.map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' },
    })),
  ];

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content },
      ],
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }

  const raw = payload?.choices?.[0]?.message?.content;
  let parsed;
  try {
    parsed = JSON.parse(typeof raw === 'string' ? raw : '{}');
  } catch {
    parsed = {};
  }

  return normalizeExtractedMenu(parsed);
}

async function importMenuFromImages({ images }) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('AI import is not configured');
    err.status = 503;
    throw err;
  }

  const list = Array.isArray(images) ? images : [];
  const imageUrls = [];
  for (const raw of list) {
    const normalized = normalizeDataUrl(raw);
    if (!normalized) continue;
    imageUrls.push(normalized);
    if (imageUrls.length >= MAX_IMAGES) break;
  }

  if (!imageUrls.length) {
    const err = new Error('Ngarkoni të paktën një foto të menusë.');
    err.status = 400;
    throw err;
  }

  const parts = [];
  for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
    const batch = imageUrls.slice(i, i + BATCH_SIZE);
    const part = await extractMenuBatch(apiKey, batch);
    if (part.categories.length) parts.push(part);
  }

  const menu = mergeMenus(parts);
  if (!menu.categories.length) {
    const err = new Error('Nuk u gjetën artikuj menuje në foto. Provoni foto më të qarta.');
    err.status = 422;
    throw err;
  }

  return menu;
}

module.exports = {
  isOpenAiConfigured,
  importMenuFromImages,
  MAX_IMAGES,
};
