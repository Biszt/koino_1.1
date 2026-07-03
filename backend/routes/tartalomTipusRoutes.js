// backend/routes/tartalomTipusRoutes.js

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
const tartalomTipusController = require('../controllers/tartalomTipusController');

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

// Új tartalom típus létrehozása
// POST /api/tartalomTipus
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva –
// lefut az authMiddleware után, a controller előtt;
// a feltöltött fájl adatait req.file-ba helyezi
router.post('/', authMiddleware, ikonFeltoltes, tartalomTipusController.tartalomTipusLetrehozasa);

// Tartalom típusok listázása szűrőkkel
// GET /api/tartalomTipus
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: listázáshoz nem kell fájlfeltöltés
router.get('/', authMiddleware, tartalomTipusController.tartalomTipusokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Tartalom típus részletes adatainak lekérése tudatpont adatokkal
// GET /api/tartalomTipus/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id/reszletek', authMiddleware, tartalomTipusController.tartalomTipusReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy tartalom típus lekérése ID alapján
// GET /api/tartalomTipus/:id
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id', authMiddleware, tartalomTipusController.tartalomTipusLekerese);

// Tartalom típus módosítása ID alapján
// PATCH /api/tartalomTipus/:id
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva –
// ha az eember új ikont tölt fel módosításkor, azt is kezeli;
// ha nem küld fájlt, req.file undefined lesz (a controller kezeli)
router.patch('/:id', authMiddleware, ikonFeltoltes, tartalomTipusController.tartalomTipusModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A tartalom típusok NEM törölhetők direkt DELETE kéréssel.
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