// backend/routes/feltoltesRoutes.js

const express = require('express');
const router = express.Router();

// Kontrollerek
const { kepFeltoltes, fajlFeltoltes, feltoltesHibaKezelo } = require('../controllers/feltoltesController');

// Auth middleware – bejelentkezés kötelező
const { authMiddleware } = require('../middlewares/authMiddleware');

// Upload middleware-ek – a valódi mezőnevekkel ('kep' és 'fajl')
const { szovegKepFeltoltes, szovegFajlFeltoltes } = require('../middlewares/uploadMiddleware');

router.post('/kep',  authMiddleware, szovegKepFeltoltes,  kepFeltoltes,  feltoltesHibaKezelo);
router.post('/fajl', authMiddleware, szovegFajlFeltoltes, fajlFeltoltes, feltoltesHibaKezelo);

module.exports = router;