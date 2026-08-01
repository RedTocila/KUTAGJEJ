const express = require('express');
const crypto = require('crypto');
const { getSupabaseAdmin } = require('../lib/supabase');
const authMiddleware = require('../middleware/auth');
const { imageUpload, MAX_IMAGES } = require('../lib/image-upload');

const router = express.Router();

const UPLOADS_BUCKET = 'uploads';

function requirePortalUser(req, res, next) {
  const model = req.user?.constructor?.modelName;
  if (model !== 'IndividualUser' && model !== 'BusinessUser') {
    return res.status(403).json({ message: 'Vetëm llogaritë individuale ose biznesi mund të ngarkojnë foto.' });
  }
  next();
}

/**
 * Upload an array of multer file objects to Supabase Storage.
 * Returns the list of public URLs.
 */
async function uploadBuffersToSupabase(files, folder = 'listings') {
  const sb = getSupabaseAdmin();
  const urls = [];
  for (const file of files || []) {
    const ext = String(file.originalname || 'image').split('.').pop() || 'jpg';
    const path = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const { error } = await sb.storage.from(UPLOADS_BUCKET).upload(path, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (error) throw error;
    const { data: publicUrlData } = sb.storage.from(UPLOADS_BUCKET).getPublicUrl(path);
    urls.push(publicUrlData.publicUrl);
  }
  return urls;
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
  imageUpload.array('images', MAX_IMAGES),
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ message: 'Nuk u zgjodh asnjë foto.' });
      }

      const rawFolder = String(req.query.folder || req.body?.folder || 'listings').trim();
      const folder = /^[a-z0-9-]{1,40}$/i.test(rawFolder) ? rawFolder : 'listings';

      const urls = await uploadBuffersToSupabase(files, folder);
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
