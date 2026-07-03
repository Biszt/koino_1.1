// backend/routes/tartalomRoutes.js

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
const tartalomController = require('../controllers/tartalomController');

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
// (útvonalak, amelyek az összes tartalomra vonatkoznak)
// -------------------------------------

// Új tartalom létrehozása
// POST /api/tartalom
// VÉDETT - csak bejelentkezett eemberek
router.post('/', authMiddleware, tartalomController.tartalomLetrehozasa);

// Tartalmak listázása szűrőkkel
// GET /api/tartalom
// VÉDETT - csak bejelentkezett eemberek
router.get('/', authMiddleware, tartalomController.tartalomokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Tartalom részletes adatainak lekérése tudatpont adatokkal
// GET /api/tartalom/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
router.get('/:id/reszletek', authMiddleware, tartalomController.tartalomReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy tartalom lekérése ID alapján
// GET /api/tartalom/:id
// VÉDETT - csak bejelentkezett eemberek
router.get('/:id', authMiddleware, tartalomController.tartalomLekerese);

// Tartalom módosítása ID alapján
// PATCH /api/tartalom/:id
// VÉDETT - csak bejelentkezett eemberek
router.patch('/:id', authMiddleware, tartalomController.tartalomModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A tartalmak NEM törölhetők direkt DELETE kéréssel.
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
