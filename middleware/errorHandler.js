const errorHandler = (error, req, res, next) => {
  console.error('❌ Erreur:', error);

  // Erreur de validation Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      error: 'Erreur de validation',
      details: errors
    });
  }

  // Erreur de duplication MongoDB
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      error: `${field} déjà utilisé`,
      field
    });
  }

  // Erreur JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token invalide'
    });
  }

  // Erreur JWT expirée
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expiré'
    });
  }

  // Erreur par défaut
  res.status(error.status || 500).json({
    error: error.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;
