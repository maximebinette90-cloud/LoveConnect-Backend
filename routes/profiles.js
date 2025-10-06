const express = require('express');
const router = express.Router();

// Route de base pour les profils
router.get('/me', (req, res) => {
  res.json({ message: 'Route profils - en développement' });
});

module.exports = router;
