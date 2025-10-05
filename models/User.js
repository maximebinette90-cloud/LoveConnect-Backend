/**
 * Modèle User - Utilisateur principal de LoveConnect
 * Inclut authentification, profil de base, et références aux autres modèles
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Informations d'authentification
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false // Ne pas inclure dans les requêtes par défaut
  },

  // Informations de base
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },

  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },

  dateOfBirth: {
    type: Date,
    required: [true, 'La date de naissance est requise'],
    validate: {
      validator: function(date) {
        const age = Math.floor((Date.now() - date.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18 && age <= 100;
      },
      message: 'Vous devez avoir entre 18 et 100 ans'
    }
  },

  // Identité de genre (système inclusif)
  genderIdentity: {
    myGender: {
      type: String,
      required: [true, 'L\'identité de genre est requise'],
      enum: [
        'homme',
        'femme', 
        'homme_transgenre',
        'femme_transgenre',
        'non_binaire',
        'genre_fluide',
        'autre',
        'prefere_ne_pas_dire'
      ]
    },
    interestedIn: [{
      type: String,
      enum: [
        'homme',
        'femme',
        'homme_transgenre', 
        'femme_transgenre',
        'non_binaire',
        'genre_fluide',
        'autre',
        'tous'
      ]
    }],
    preferences: {
      showTransInclusive: { type: Boolean, default: true },
      showNonBinaryInclusive: { type: Boolean, default: true },
      strictGenderMatching: { type: Boolean, default: false }
    }
  },

  // Système d'humeurs
  moodSystem: {
    currentMood: {
      type: String,
      enum: [
        'amoureux', 'coup_de_foudre', 'romantique',
        'seul', 'furieux', 'timide',
        'bonne_humeur', 'confiant',
        'relaxation', 'zen',
        'sexuel',
        'aventureux', 'energique', 'sportif',
        'joueur', 'festif',
        'intellectuel',
        'creatif',
        'mysterieux',
        'gourmand'
      ],
      default: 'bonne_humeur'
    },
    moodHistory: [{
      mood: String,
      timestamp: { type: Date, default: Date.now },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      }
    }],
    displaySettings: {
      showMoodToAll: { type: Boolean, default: true },
      moodExpiryHours: { type: Number, default: 24 }
    }
  },

  // Localisation
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
    address: String,
    city: String,
    country: String,
    lastUpdated: { type: Date, default: Date.now }
  },

  // Photos de profil
  photos: [{
    url: String,
    cloudinaryId: String,
    isMain: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Statut du compte
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },

  // Abonnements et mode Ghost
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  
  ghostMode: {
    isActive: { type: Boolean, default: false },
    expiresAt: Date,
    activatedAt: Date
  },

  // Préférences de l'app
  preferences: {
    searchRadius: { type: Number, default: 10000 }, // en mètres
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 35 }
    },
    notifications: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      showAge: { type: Boolean, default: true },
      showDistance: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true }
    }
  },

  // Statistiques
  stats: {
    profileViews: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    activitiesJoined: { type: Number, default: 0 },
    activitiesCreated: { type: Number, default: 0 }
  },

  // Tokens et sécurité
  refreshTokens: [String],
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,

  // Modération
  reportCount: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  banExpiresAt: Date

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index géospatial pour les recherches de proximité
userSchema.index({ location: '2dsphere' });

// Index pour les recherches
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1, isBanned: 1 });
userSchema.index({ 'genderIdentity.myGender': 1, 'genderIdentity.interestedIn': 1 });
userSchema.index({ 'moodSystem.currentMood': 1 });

// Virtual pour l'âge
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Virtual pour le nom complet
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual pour la photo principale
userSchema.virtual('mainPhoto').get(function() {
  return this.photos.find(photo => photo.isMain) || this.photos[0] || null;
});

// Middleware pre-save pour hasher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware pre-save pour valider la photo principale
userSchema.pre('save', function(next) {
  if (this.photos && this.photos.length > 0) {
    const mainPhotos = this.photos.filter(photo => photo.isMain);
    if (mainPhotos.length === 0) {
      this.photos[0].isMain = true;
    } else if (mainPhotos.length > 1) {
      // Garder seulement la première comme principale
      this.photos.forEach((photo, index) => {
        photo.isMain = index === 0;
      });
    }
  }
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Erreur lors de la comparaison du mot de passe');
  }
};

// Méthode pour vérifier la compatibilité de genre
userSchema.methods.isGenderCompatibleWith = function(otherUser) {
  const myInterestedIn = this.genderIdentity.interestedIn;
  const otherInterestedIn = otherUser.genderIdentity.interestedIn;
  
  const iAmInterestedInThem = myInterestedIn.includes(otherUser.genderIdentity.myGender) || 
                              myInterestedIn.includes('tous');
  
  const theyAreInterestedInMe = otherInterestedIn.includes(this.genderIdentity.myGender) || 
                                otherInterestedIn.includes('tous');
  
  return iAmInterestedInThem && theyAreInterestedInMe;
};

// Méthode pour calculer la distance avec un autre utilisateur
userSchema.methods.distanceTo = function(otherUser) {
  if (!this.location.coordinates || !otherUser.location.coordinates) {
    return null;
  }
  
  const [lon1, lat1] = this.location.coordinates;
  const [lon2, lat2] = otherUser.location.coordinates;
  
  const R = 6371000; // Rayon de la Terre en mètres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return Math.round(R * c); // Distance en mètres
};

// Méthode pour vérifier si l'utilisateur est en mode Ghost
userSchema.methods.isInGhostMode = function() {
  return this.ghostMode.isActive && 
         this.ghostMode.expiresAt && 
         this.ghostMode.expiresAt > new Date();
};

// Méthode pour obtenir le profil public (sans données sensibles)
userSchema.methods.getPublicProfile = function() {
  const user = this.toObject();
  
  // Supprimer les données sensibles
  delete user.password;
  delete user.email;
  delete user.refreshTokens;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  delete user.emailVerificationExpires;
  
  return user;
};

// Méthode statique pour rechercher des utilisateurs compatibles
userSchema.statics.findCompatibleUsers = function(user, options = {}) {
  const {
    maxDistance = user.preferences.searchRadius || 10000,
    ageMin = user.preferences.ageRange.min || 18,
    ageMax = user.preferences.ageRange.max || 35,
    mood = null,
    limit = 50
  } = options;
  
  const query = {
    _id: { $ne: user._id },
    isActive: true,
    isBanned: false,
    location: {
      $near: {
        $geometry: user.location,
        $maxDistance: maxDistance
      }
    }
  };
  
  // Filtrer par âge
  const now = new Date();
  const maxBirthDate = new Date(now.getFullYear() - ageMin, now.getMonth(), now.getDate());
  const minBirthDate = new Date(now.getFullYear() - ageMax, now.getMonth(), now.getDate());
  
  query.dateOfBirth = {
    $gte: minBirthDate,
    $lte: maxBirthDate
  };
  
  // Filtrer par humeur si spécifié
  if (mood) {
    query['moodSystem.currentMood'] = mood;
  }
  
  return this.find(query)
    .select('-password -refreshTokens -passwordResetToken -emailVerificationToken')
    .limit(limit)
    .sort({ lastSeen: -1 });
};

module.exports = mongoose.model('User', userSchema);
