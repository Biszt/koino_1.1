// backend/routes/lokacioRoutes.js

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
const express = require('express');

// ===== ROUTER PÉLDÁNY LÉTREHOZÁSA =====
const router = express.Router();

// ===== CONTROLLER IMPORTÁLÁSA =====
const lokacioController = require('../controllers/lokacioController');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// Ország javaslatok lekérése
// GET /api/lokacio/orszag?kereses=xyz
router.get('/lokacio/orszag', lokacioController.getOrszagJavaslatok);

// Régió javaslatok lekérése
// GET /api/lokacio/regio?kereses=xyz
router.get('/lokacio/regio', lokacioController.getRegioJavaslatok);

// Település javaslatok lekérése
// GET /api/lokacio/telepules?kereses=xyz
router.get('/lokacio/telepules', lokacioController.getTelepulesJavaslatok);

// ===== ROUTER EXPORTÁLÁSA =====
module.exports = router;
