// backend/routes/strukturaRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const strukturaController = require('../controllers/strukturaController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// A Struktúra nézet (fa-nézet) előzetes darabszáma
// GET /api/struktura/darabszam?agEntitasId=<id>
// VÉDETT - csak bejelentkezett eemberek
router.get('/struktura/darabszam', authMiddleware, strukturaController.darabszam);

// A fa lapozott lekérése (kurzoros)
// GET /api/struktura?kurzor=<utolsoLapKurzor>&lapMeret=2000
// VÉDETT - csak bejelentkezett eemberek
router.get('/struktura', authMiddleware, strukturaController.lap);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
