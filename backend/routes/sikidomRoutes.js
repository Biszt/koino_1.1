// backend/routes/sikidomRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const sikidomController = require('../controllers/sikidomController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// A Síkidom nézet részfája (best-first, effektív méret szerint)
// GET /api/sikidom?gyoker=<id|null>&kuszob=<szám>&maxCsomopont=<szám>
// VÉDETT - csak bejelentkezett eemberek
router.get('/sikidom', authMiddleware, sikidomController.reszfa);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
