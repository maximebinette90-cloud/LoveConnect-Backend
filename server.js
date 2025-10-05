/**
 * LoveConnect Backend Server
 * Serveur principal pour l'application de rencontres LoveConnect
 * Inclut toutes les fonctionnalités : activités, mode ghost, genre/humeurs, etc.
 */

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression des réponses
app.use(compression());

// CORS configuration
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

// Rate limiting strict pour l'authentification
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limite à 5 tentatives de connexion par IP
  message: {
    error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.'
  }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Parsing du body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
  process.exit(1);
});

// Configuration Socket.IO pour les fonctionnalités temps réel
io.on('connection', (socket) => {
  console.log('👤 Utilisateur connecté:', socket.id);

  // Rejoindre une room basée sur l'ID utilisateur
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 Utilisateur ${userId} a rejoint sa room`);
  });

  // Gestion des invitations en temps réel
  socket.on('send-invitation', (data) => {
    io.to(`user-${data.recipientId}`).emit('new-invitation', data);
  });

  // Gestion des réponses aux invitations
  socket.on('invitation-response', (data) => {
    io.to(`user-${data.senderId}`).emit('invitation-updated', data);
  });

  // Gestion des matchs
  socket.on('new-match', (data) => {
    io.to(`user-${data.user1Id}`).emit('match-created', data);
    io.to(`user-${data.user2Id}`).emit('match-created', data);
  });

  // Gestion de la géolocalisation en temps réel
  socket.on('update-location', (data) => {
    socket.to(`user-${data.userId}`).emit('location-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('👤 Utilisateur déconnecté:', socket.id);
  });
});

// Routes de santé
app.get('/', (req, res) => {
  res.json({
    message: '🚀 LoveConnect Backend API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    features: [
      'Authentification JWT',
      'Profils utilisateurs avec genre et humeurs',
      'Système d\'activités sociales',
      'Mode Ghost premium',
      'Intégration Google Maps',
      'Paiements Stripe',
      'Notifications temps réel'
    ]
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
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
app.use('/api/payments', paymentRoutes); // Pas d'auth pour les webhooks Stripe

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/profiles/me',
      'GET /api/activities',
      'GET /api/venues/search'
    ]
  });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur LoveConnect démarré sur le port ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Base de données: ${mongoose.connection.readyState === 1 ? '✅ Connectée' : '❌ Déconnectée'}`);
});

// Export pour les tests
module.exports = { app, server, io };
