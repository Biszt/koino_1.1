// backend/routes/egyezmenyRoutes.js

// =====================================================
// EXPRESS ROUTER IMPORTÁLÁSA
// =====================================================
const express = require('express');

// =====================================================
// ROUTER PÉLDÁNY LÉTREHOZÁSA
// =====================================================
const router = express.Router();

// =====================================================
// CONTROLLER IMPORTÁLÁSA
// =====================================================
const egyezmenyController = require('../controllers/egyezmenyController');

// =====================================================
// MIDDLEWARE IMPORTÁLÁSA
// =====================================================
// Destrukturálással importáljuk, mert objektumként van exportálva
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');

// =====================================================
// ÚTVONALAK DEFINIÁLÁSA
// =====================================================

// -------------------------------------
// KOLLEKCIÓ SZINTŰ ÚTVONALAK
// Útvonalak, amelyek az összes egyezményre vonatkoznak
// -------------------------------------

/**
 * Egyezmények listázása szűrőkkel
 * GET /api/egyezmeny?javaslatTipus=Torles&limit=20&skip=0
 * NYILVÁNOS - mindenki elérheti
 */
router.get(
  '/',
  (req, res) => egyezmenyController.egyezmenyekListazasa(req, res)
);

// -------------------------------------
// SPECIFIKUS ERŐFORRÁS ÚTVONALAK
// Részletesebb, többszegmensű útvonalak előbb!
// -------------------------------------

/**
 * Javaslat egyezményének lekérése
 * GET /api/egyezmeny/javaslat/:javaslatId
 * NYILVÁNOS - mindenki elérheti
 */
router.get(
  '/javaslat/:javaslatId',
  (req, res) => egyezmenyController.javaslatEgyezmenye(req, res)
);

/**
 * Egyezmény részletes adatainak lekérése tudatpont adatokkal
 * GET /api/egyezmeny/:id/reszletek
 * RÉSZBEN VÉDETT - opcionális authentikáció
 * Ha be van jelentkezve, megkapja a saját tudatpont hozzájárulását is
 */
router.get(
  '/:id/reszletek',
  optionalAuthMiddleware, // Opcionális auth - vendégként is elérhető
  (req, res) => egyezmenyController.egyezmenyReszleteinekLekerese(req, res)
);

// -------------------------------------
// ÁLTALÁNOS ERŐFORRÁS ÚTVONALAK
// Egyszegmensű dinamikus útvonalak később!
// -------------------------------------

/**
 * Egy egyezmény lekérése ID alapján
 * GET /api/egyezmeny/:id
 * NYILVÁNOS - mindenki elérheti
 */
router.get(
  '/:id',
  (req, res) => egyezmenyController.egyezmenyLekerese(req, res)
);

// MEGJEGYZÉS: TÖRLÉS ENDPOINT NINCS!
// Az egyezmények NEM törölhetők direkt DELETE kéréssel.
// Törlés csak automatikusan történik a következő esetben:
// 
// 1. AUTOMATIKUS Törlés - Tudatpont nullázás
//    - Ha minden ember visszavonja a tudatpontjait
//    - És az osszesPont 0-ra csökken
//    - Automatikusan törlődik (tudatpontService.js kezeli)

// =====================================================
// ROUTER EXPORTÁLÁSA
// =====================================================
module.exports = router;
