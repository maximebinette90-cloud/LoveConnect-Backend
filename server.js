/**
 * LoveConnect Backend Server
 * Serveur principal pour l'application de rencontres LoveConnect
 * Utilise maintenant PostgreSQL avec Sequelize.
 */

require('dotenv').config();
const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const profileRoutes = require('./routes/profiles');
const activitiesRoutes = require('./routes/activities');
const venuesRoutes = require('./routes/venues');
const invitationsRoutes = require('./routes/invitations');
const matchesRoutes = require('./routes/matches');
const ghostRoutes = require('./routes/ghost');
const subscriptionRoutes = require('./routes/subscriptions');
const paymentRoutes = require('./routes/payments');

// Import des middlewares
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"]
  }
});

// Configuration du port
const PORT = process.env.PORT || 3000;

// Configuration de la base de données Sequelize
const sequelize = new Sequelize(process.env.URL_BASE_DE_DONNEES || process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? { require: true, rejectUnauthorized: false } : false
  },
  logging: false
});

// Test de la connexion à la base de données
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connexion à PostgreSQL réussie');
  })
  .catch(err => {
    console.error('❌ Erreur de connexion à PostgreSQL:', err);
    process.exit(1);
  });

// Middlewares de sécurité
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par windowMs
  message: {
    error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Parsing du body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes de santé
app.get('/', (req, res) => {
  res.json({
    message: '🚀 LoveConnect Backend API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/profiles', authMiddleware, profileRoutes);
app.use('/api/activities', authMiddleware, activitiesRoutes);
app.use('/api/venues', authMiddleware, venuesRoutes);
app.use('/api/invitations', authMiddleware, invitationsRoutes);
app.use('/api/matches', authMiddleware, matchesRoutes);
app.use('/api/ghost', authMiddleware, ghostRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur LoveConnect démarré sur le port ${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server, io, sequelize };

