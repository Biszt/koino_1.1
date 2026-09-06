// backend/routes/gondolatRoutes.js

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
const gondolatController = require('../controllers/gondolatController');

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
// (útvonalak, amelyek az összes gondolatra vonatkoznak)
// -------------------------------------

// Új gondolat létrehozása
// POST /api/gondolat
// VÉDETT - csak bejelentkezett eemberek
router.post('/', authMiddleware, gondolatController.gondolatLetrehozasa);

// Gondolatok listázása szűrőkkel
// GET /api/gondolat
// VÉDETT - csak bejelentkezett eemberek
router.get('/', authMiddleware, gondolatController.gondolatokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Gondolat részletes adatainak lekérése tudatpont adatokkal
// GET /api/gondolat/:id/reszletek
// VÉDETT - csak bejelentkezett eemberek
router.get('/:id/reszletek', authMiddleware, gondolatController.gondolatReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy gondolat lekérése ID alapján
// GET /api/gondolat/:id
// VÉDETT - csak bejelentkezett eemberek
router.get('/:id', authMiddleware, gondolatController.gondolatLekerese);

// Gondolat módosítása ID alapján
// PATCH /api/gondolat/:id
// VÉDETT - csak bejelentkezett eemberek
router.patch('/:id', authMiddleware, gondolatController.gondolatModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A gondolatok NEM törölhetők direkt DELETE kéréssel.
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
