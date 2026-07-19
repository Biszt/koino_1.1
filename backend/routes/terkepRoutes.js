// backend/routes/terkepRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const terkepController = require('../controllers/terkepController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// A Térkép (fa-nézet) előzetes darabszáma
// GET /api/terkep/darabszam?agEntitasId=<id>
// VÉDETT - csak bejelentkezett eemberek
router.get('/terkep/darabszam', authMiddleware, terkepController.darabszam);

// A fa lapozott lekérése (kurzoros)
// GET /api/terkep?kurzor=<utolsoLapKurzor>&lapMeret=2000
// VÉDETT - csak bejelentkezett eemberek
router.get('/terkep', authMiddleware, terkepController.lap);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
