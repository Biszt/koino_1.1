// backend/routes/kategoriaRoutes.js

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
const kategoriaController = require('../controllers/kategoriaController');

// ===================================
// MIDDLEWARE IMPORTÁLÁSOK
// ===================================
// Auth middleware: ellenőrzi, hogy be van-e jelentkezve az eember
const { authMiddleware } = require('../middlewares/authMiddleware');

// VÁLTOZÁS: Upload middleware bekötése
// ikonFeltoltes: a Multer single() példánya, ami a 'ikon' nevű form mezőt kezeli
// Ez fut le ELŐBB, mint a controller – elmenti a fájlt, és req.file-ba teszi az adatait
const { ikonFeltoltes } = require('../middlewares/uploadMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// -------------------------------------

// Új kategória létrehozása
// POST /api/kategoria
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva – lefut az authMiddleware után,
// a controller előtt; a feltöltött fájl adatait req.file-ba helyezi
router.post('/', authMiddleware, ikonFeltoltes, kategoriaController.kategoriaLetrehozasa);

// Kategóriák listázása szűrőkkel
// GET /api/kategoria
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: listázáshoz nem kell fájlfeltöltés
router.get('/', authMiddleware, kategoriaController.kategoriakListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Kategória részletes adatainak lekérése tudatpont adatokkal
// GET /api/kategoria/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id/reszletek', authMiddleware, kategoriaController.kategoriaReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy kategória lekérése ID alapján
// GET /api/kategoria/:id
// VÉDETT - csak bejelentkezett eemberek
// Nem változott: lekéréshez nem kell fájlfeltöltés
router.get('/:id', authMiddleware, kategoriaController.kategoriaLekerese);

// Kategória módosítása ID alapján
// PATCH /api/kategoria/:id
// VÉDETT - csak bejelentkezett eemberek
// VÁLTOZÁS: ikonFeltoltes middleware hozzáadva – ha az eember új ikont tölt fel
// módosításkor, azt is kezeli; ha nem küld fájlt, req.file undefined lesz,
// amit a controller majd kezelni fog
router.patch('/:id', authMiddleware, ikonFeltoltes, kategoriaController.kategoriaModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A kategóriák NEM törölhetők direkt DELETE kéréssel.
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