const express = require('express');
const authMiddleware = require('../middleware/auth');
const { imageUpload, uploadBuffersToBlob, MAX_IMAGES } = require('../lib/image-upload');

const router = express.Router();

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Vetëm llogaritë individuale ose biznesi mund të ngarkojnë foto.' });
  }
  next();
}

// ---------------------------------------------------------------------------
// POST /api/uploads/images
// Generic image upload used by every listing category. Accepts multipart files
// under the `images` field and returns their public URLs. An optional `folder`
// (query or field) groups uploads in Vercel Blob (e.g. cars, real-estate).
// ---------------------------------------------------------------------------
router.post(
  '/images',
  authMiddleware,
  requirePortalUser,
  imageUpload.array('images', MAX_IMAGES),
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Nuk u zgjodh asnjë foto.' });
      }

      const rawFolder = String(req.query.folder || req.body?.folder || 'listings').trim();
      const folder = /^[a-z0-9-]{1,40}$/i.test(rawFolder) ? rawFolder : 'listings';

      const urls = await uploadBuffersToBlob(files, folder);
      return res.status(201).json({ urls });
    } catch (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Çdo foto duhet të jetë nën 8 MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: `Mund të ngarkoni maksimumi ${MAX_IMAGES} foto.` });
      }
      if (/images are allowed/i.test(err.message || '')) {
        return res.status(400).json({ message: 'Lejohen vetëm foto JPEG, PNG, WEBP dhe GIF.' });
      }
      console.error('POST /uploads/images:', err?.message || err);
      return res.status(500).json({ message: 'Server error' });
    }
  },
);

module.exports = router;
