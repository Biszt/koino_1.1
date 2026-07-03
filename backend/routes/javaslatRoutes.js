// backend/routes/javaslatRoutes.js

// ===================================
// EXPRESS ROUTER IMPORTÁLÁSA
// ===================================
const express = require('express');

// ===================================
// ROUTER PÉLDÁNY LÉTREHOZÁSA
// ===================================
const router = express.Router();

// ===================================
// CONTROLLER IMPORTÁLÁSA
// ===================================
const JavaslatController = require('../controllers/javaslatController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
// Destrukturálással importáljuk, mert objektumként van exportálva
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// (útvonalak, amelyek az összes javaslatra vonatkoznak)
// -------------------------------------

// Új javaslat létrehozása
// POST /api/javaslat
// VÉDETT - csak bejelentkezett eemberek
router.post('/', authMiddleware, JavaslatController.javaslatLetrehozasa);

// Javaslatok listázása szűrőkkel
// GET /api/javaslat
// NYILVÁNOS - mindenki elérheti
router.get('/', JavaslatController.javaslatokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Javaslat részletes adatainak lekérése
// GET /api/javaslat/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
router.get('/:id/reszletek', authMiddleware, JavaslatController.javaslatReszleteinekLekerese);

// Javaslat szavazatainak listázása
// GET /api/javaslat/:id/szavazatok
// NYILVÁNOS - mindenki elérheti
router.get('/:id/szavazatok', JavaslatController.javaslatSzavazatainakLekerese);

// Szavazatok statisztikájának lekérése
// GET /api/javaslat/:id/statisztika
// NYILVÁNOS - mindenki elérheti
router.get('/:id/statisztika', JavaslatController.szavazatokStatisztikaja);

// Szavazat leadása egy javaslatra
// POST /api/szavazat
// VÉDETT - csak bejelentkezett eemberek
// Body: { javaslatId, szavazatTipus }
router.post('/szavazat', authMiddleware, JavaslatController.szavazatLeadasa);

// Szavazat visszavonása
// DELETE /api/szavazat
// VÉDETT - csak bejelentkezett eemberek
// Body: { javaslatId }
router.delete('/szavazat', authMiddleware, JavaslatController.szavazatVisszavonasa);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy javaslat lekérése ID alapján
// GET /api/javaslat/:id
// NYILVÁNOS - mindenki elérheti
router.get('/:id', JavaslatController.javaslatLekerese);

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;
