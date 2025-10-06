const express = require('express');
const User = require('../models/User');
const router = express.Router();

// Obtenir le profil de l'utilisateur connecté
router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
});

// Mettre à jour le profil
router.put('/me', async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

module.exports = router;
