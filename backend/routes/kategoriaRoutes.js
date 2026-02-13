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
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
// Destrukturálással importáljuk, mert objektumként van exportálva
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// (útvonalak, amelyek az összes kategóriára vonatkoznak)
// -------------------------------------

// Új kategória létrehozása
// POST /api/kategoria
// VÉDETT - csak bejelentkezett emberek
router.post('/', authMiddleware, kategoriaController.kategoriaLetrehozasa);

// Kategóriák listázása szűrőkkel
// GET /api/kategoria
// VÉDETT - csak bejelentkezett emberek
router.get('/', authMiddleware, kategoriaController.kategoriakListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Kategória részletes adatainak lekérése tudatpont adatokkal
// GET /api/kategoria/:id/reszletek
// VÉDETT - csak bejelentkezett emberek
router.get('/:id/reszletek', authMiddleware, kategoriaController.kategoriaReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy kategória lekérése ID alapján
// GET /api/kategoria/:id
// VÉDETT - csak bejelentkezett emberek
router.get('/:id', authMiddleware, kategoriaController.kategoriaLekerese);

// Kategória módosítása ID alapján
// PATCH /api/kategoria/:id
// VÉDETT - csak bejelentkezett emberek
router.patch('/:id', authMiddleware, kategoriaController.kategoriaModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A kategóriák NEM törölhetők direkt DELETE kéréssel.
// 
// Törlés csak automatikusan történik a következő esetekben:
// 
// 1. AUTOMATIKUS Torles - Tudatpont nullázás
//    - Ha minden ember visszavonja a tudatpontjait
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
