// backend/routes/keresesRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const keresesController = require('../controllers/keresesController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// Cím/név alapú entitás-keresés
// GET /api/kereses?q=<szoveg>&tipusok=Tartalom,Kategoria,TartalomTipus&limit=10
// VÉDETT - csak bejelentkezett eemberek
router.get('/kereses', authMiddleware, keresesController.entitasKereses);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
