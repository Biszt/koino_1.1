// backend/routes/meghivoRoutes.js

// Felelősség: a meghívó-végpontok útvonalainak definiálása.
// A server.js '/api/meghivo' prefixszel regisztrálja.

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
const express = require('express');
const router = express.Router();

// ===== CONTROLLER ÉS MIDDLEWARE IMPORTÁLÁSA =====
const meghivoController = require('../controllers/meghivoController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// ----- KÖTELEZŐ-E A MEGHÍVÓ A REGISZTRÁCIÓHOZ? -----
// GET /api/meghivo/kotelezo
// Nyilvános – a regisztrációs űrlap kérdezi le bejelentkezés előtt
router.get('/kotelezo', meghivoController.kotelezoLekerese);

// ----- SAJÁT MEGHÍVÓK LISTÁZÁSA -----
// GET /api/meghivo/sajat
// Védett – a „Meghívóim" modal listája
router.get('/sajat', authMiddleware, meghivoController.sajatLista);

// ----- ÚJ MEGHÍVÓ LÉTREHOZÁSA -----
// POST /api/meghivo  (body: { tanusitva: true })
// Védett – a tanúsító nyilatkozat elfogadása kötelező
router.post('/', authMiddleware, meghivoController.letrehozas);

// ----- MEGHÍVÓ VISSZAVONÁSA -----
// POST /api/meghivo/:id/visszavonas
// Védett – csak a kibocsátó, csak Aktiv státuszban
router.post('/:id/visszavonas', authMiddleware, meghivoController.visszavonas);

// ===== ROUTER EXPORTÁLÁSA =====
module.exports = router;
