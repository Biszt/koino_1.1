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
// MIDDLEWARE IMPORTÁLÁSA
// ===================================
// Destrukturálással importáljuk, mert objektumként van exportálva
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===================================
// ÚTVONALAK DEFINIÁLÁSA
// ===================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// (útvonalak, amelyek az összes tartalom típusra vonatkoznak)
// -------------------------------------

// Új tartalom típus létrehozása
// POST /api/tartalomTipus
// VÉDETT - csak bejelentkezett emberek
router.post('/', authMiddleware, tartalomTipusController.tartalomTipusLetrehozasa);

// Tartalom típusok listázása szűrőkkel
// GET /api/tartalomTipus
// VÉDETT - csak bejelentkezett emberek
router.get('/', authMiddleware, tartalomTipusController.tartalomTipusokListazasa);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// (Részletesebb, többszegmensű útvonalak előbb!)
// -------------------------------------

// Tartalom típus részletes adatainak lekérése tudatpont adatokkal
// GET /api/tartalomTipus/:id/reszletek
// VÉDETT - csak bejelentkezett emberek
router.get('/:id/reszletek', authMiddleware, tartalomTipusController.tartalomTipusReszleteinekLekerese);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// (Egyszegmensű dinamikus útvonalak később!)
// -------------------------------------

// Egy tartalom típus lekérése ID alapján
// GET /api/tartalomTipus/:id
// VÉDETT - csak bejelentkezett emberek
router.get('/:id', authMiddleware, tartalomTipusController.tartalomTipusLekerese);

// Tartalom típus módosítása ID alapján
// PATCH /api/tartalomTipus/:id
// VÉDETT - csak bejelentkezett emberek
router.patch('/:id', authMiddleware, tartalomTipusController.tartalomTipusModositasa);

// ===================================
// Torles ENDPOINT NINCS!
// ===================================
// A tartalom típusok NEM törölhetők direkt DELETE kéréssel.
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
