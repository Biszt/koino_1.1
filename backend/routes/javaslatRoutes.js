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

// TÖRÖLVE (V3 szavazat-láthatóság, 2026-07-18): a GET /:id/szavazatok végpont
// nyersen kiadta az egyéni szavazatokat (ki hogyan szavazott) — auth nélkül.
// A D2 döntés szerint az egyéni szavazat NEM lehet látható más e-emberek felé,
// ezért a végpont (a frontend nem is használta) megszűnt. Az EREDMÉNY nyilvános
// marad: az összesített statisztika (lent) és a javaslat arány-mezői adják.

// Szavazatok statisztikájának lekérése — CSAK ÖSSZESÍTETT számok (darabszámok,
// arányok), egyéni szavazat nincs benne; a D2 szerint az eredmény nyilvános.
// GET /api/javaslat/:id/statisztika
// NYILVÁNOS - mindenki elérheti
router.get('/:id/statisztika', JavaslatController.szavazatokStatisztikaja);

// Saját szavazat lekérése egy javaslaton
// GET /api/javaslat/:id/sajat-szavazat
// VÉDETT - csak bejelentkezett eemberek
// A bejelentkezett eember szavazatát adja vissza (vagy null-t, ha még nem szavazott)
router.get('/:id/sajat-szavazat', authMiddleware, JavaslatController.sajatSzavazatLekerese);

// Szavazat leadása egy javaslatra
// POST /api/javaslat/szavazat
// VÉDETT - csak bejelentkezett eemberek
// Body: { javaslatId, szavazatTipus }
router.post('/szavazat', authMiddleware, JavaslatController.szavazatLeadasa);

// Szavazat visszavonása
// DELETE /api/javaslat/szavazat
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
