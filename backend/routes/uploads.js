const express = require('express');
const authMiddleware = require('../middleware/auth');
const { imageUpload, MAX_IMAGES, MAX_IMAGE_BYTES } = require('../lib/image-upload');
const {
  uploadBuffersToSupabase,
  mirrorRemoteImageUrls,
} = require('../lib/storage-uploads');

const router = express.Router();

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  // Portal users upload listing photos; platform admins upload home banners, etc.
  if (model !== 'IndividualUser' && model !== 'BusinessUser' && model !== 'Admin') {
    return res.status(403).json({ message: 'Vetëm llogaritë individuale, biznesi ose admin mund të ngarkojnë foto.' });
  }
  next();
}

/** Multer errors run outside the route try/catch — map them to JSON. */
function parseImages(req, res, next) {
  imageUpload.array('images', MAX_IMAGES)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `Çdo foto duhet të jetë nën ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: `Mund të ngarkoni maksimumi ${MAX_IMAGES} foto.` });
    }
    if (/images are allowed/i.test(err.message || '')) {
      return res.status(400).json({ message: 'Lejohen vetëm foto JPEG, PNG, WEBP dhe GIF.' });
    }
    console.error('POST /uploads/images multer:', err?.message || err);
    return res.status(400).json({ message: 'Nuk u arrit ngarkimi i fotove.' });
  });
}

function resolveFolder(raw) {
  const folder = String(raw || 'listings').trim();
  return /^[a-z0-9-]{1,40}$/i.test(folder) ? folder : 'listings';
}

// ---------------------------------------------------------------------------
// POST /api/uploads/images
// Generic image upload used by every listing category. Accepts multipart files
// under the `images` field and returns their public URLs. An optional `folder`
// (query or field) groups uploads in Supabase Storage (e.g. cars, real-estate).
// ---------------------------------------------------------------------------
router.post(
  '/images',
  authMiddleware,
  requirePortalUser,
  parseImages,
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Nuk u zgjodh asnjë foto.' });
      }

      const folder = resolveFolder(req.query.folder || req.body?.folder);
      const urls = await uploadBuffersToSupabase(files, folder);
      return res.status(201).json({ urls });
    } catch (err) {
      console.error('POST /uploads/images:', err?.message || err);
      const msg = String(err?.message || '');
      if (/bucket|not found|row-level security|unauthorized|permission/i.test(msg)) {
        return res.status(500).json({
          message: 'Ruajtja e fotove nuk është e konfiguruar. Kontaktoni administratën.',
        });
      }
      return res.status(500).json({ message: 'Nuk u arrit ngarkimi i fotove.' });
    }
  },
);

/**
 * POST /api/uploads/from-urls
 * Mirror remote listing photos (e.g. AI-scraped) into our storage so create
 * flows are not blocked by browser CORS / hotlink protection.
 */
router.post('/from-urls', authMiddleware, requirePortalUser, async (req, res) => {
  try {
    const rawUrls = Array.isArray(req.body?.urls) ? req.body.urls : [];
    const urls = rawUrls
      .map((u) => String(u || '').trim())
      .filter((u) => /^https?:\/\//i.test(u))
      .slice(0, MAX_IMAGES);

    if (!urls.length) {
      return res.status(400).json({ message: 'Nuk u dërgua asnjë URL fotoje.' });
    }

    const folder = resolveFolder(req.body?.folder || req.query.folder);
    const mirrored = await mirrorRemoteImageUrls(urls, folder, MAX_IMAGES);

    if (!mirrored.length) {
      return res.status(422).json({
        message: 'Nuk u arrit të shkarkohen fotot nga linku. Provo t’i ngarkosh manualisht.',
        urls: [],
      });
    }

    return res.status(201).json({
      urls: mirrored,
      mirrored: mirrored.length,
      requested: urls.length,
    });
  } catch (err) {
    console.error('POST /uploads/from-urls:', err?.message || err);
    const msg = String(err?.message || '');
    if (/bucket|not found|row-level security|unauthorized|permission/i.test(msg)) {
      return res.status(500).json({
        message: 'Ruajtja e fotove nuk është e konfiguruar. Kontaktoni administratën.',
      });
    }
    return res.status(500).json({ message: 'Nuk u arrit ngarkimi i fotove.' });
  }
});

module.exports = router;
