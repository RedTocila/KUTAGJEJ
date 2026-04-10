const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Classified listings — placeholder until Listing model + CRUD are added.
 * Keeps the API surface small and aligned with KuTaGjej.
 */
router.get('/', authMiddleware, async (_req, res) => {
  try {
    res.json({ listings: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
