// backend/routes/gondolatTipusRoutes.js

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
const gondolatTipusController = require('../controllers/gondolatTipusController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSOK
// ===================================
// Auth middleware: ellenőrzi, hogy be van-e jelentkezve az eember
const { authMiddleware } = require('../middlewares/authMiddleware');

// VÁLTOZÁS: Upload middleware bekötése
// Ugyanaz az ikonFeltoltes, amit a kategoriaRoutes.js is használ –
// közös middleware, közös uploads/icons/ mappa
const { ikonFeltoltes } = require('../middlewares/uploadMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// -------------------------------------

// Új gondolat típus létrehozása
// POST /api/gondolatTipus
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva –
// lefut az authMiddleware után, a controller előtt;
// a feltöltött fájl adatait req.file-ba helyezi
router.post('/', authMiddleware, ikonFeltoltes, gondolatTipusController.gondolatTipusLetrehozasa);

// Gondolat típusok listázása szűrőkkel
// GET /api/gondolatTipus
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: listázáshoz nem kell fájlfeltöltés
router.get('/', authMiddleware, gondolatTipusController.gondolatTipusokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Gondolat típus részletes adatainak lekérése tudatpont adatokkal
// GET /api/gondolatTipus/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id/reszletek', authMiddleware, gondolatTipusController.gondolatTipusReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy gondolat típus lekérése ID alapján
// GET /api/gondolatTipus/:id
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id', authMiddleware, gondolatTipusController.gondolatTipusLekerese);

// Gondolat típus módosítása ID alapján
// PATCH /api/gondolatTipus/:id
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva –
// ha az eember új ikont tölt fel módosításkor, azt is kezeli;
// ha nem küld fájlt, req.file undefined lesz (a controller kezeli)
router.patch('/:id', authMiddleware, ikonFeltoltes, gondolatTipusController.gondolatTipusModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A gondolat típusok NEM törölhetők direkt DELETE kéréssel.
//
// Törlés csak automatikusan történik a következő esetekben:
//
// 1. AUTOMATIKUS Torles - Tudatpont nullázás
//    - Ha minden eember visszavonja a tudatpontjait
//    - És az osszesPont 0-ra csökken
//    - Automatikusan törlődik (tudatpontService.js kezeli)
//
// 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
//    - Törlési javaslat indítása
//    - Közösségi szavazás
//    - Hatályba lépési idő után automatikus törlés
//    - Tudatpontok visszautalása a hozzájárulóknak

// ===================================
// ROUTER EXPORTÁLÁSA
// ===================================
module.exports = router;