// backend/routes/ertekJavaslatRoutes.js

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
const express = require('express');

// ===== ROUTER PÉLDÁNY LÉTREHOZÁSA =====
const router = express.Router();

// ===== CONTROLLER IMPORTÁLÁSA =====
const ertekJavaslatController = require('../controllers/ertekJavaslatController');

// ===== MIDDLEWARE IMPORTÁLÁSA =====
// Authentikációs middleware - ellenőrzi a JWT tokent
const { authMiddleware } = require('../middlewares/authMiddleware');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// -----ÉRTÉK JAVASLAT LÉTREHOZÁSA VAGY MÓDOSÍTÁSA -----
// POST /api/ertekJavaslat
// Védett endpoint - authentikáció szükséges
// Body: { tartalomId, javaslatElfogadasiKuszob, reszveteliAranyKuszob }
router.post(
  '/ertekJavaslat',
  authMiddleware,  // Authentikáció kötelező
  ertekJavaslatController.ertekJavaslatLetrehozasaVagyModositasa
);

// ----- AKTUÁLIS ÉRTÉKEK LEKÉRÉSE -----
// GET /api/ertekJavaslat/aktualis/:tartalomId
// Nyilvános endpoint - bárki lekérheti
router.get(
  '/ertekJavaslat/aktualis/:tartalomId',
  ertekJavaslatController.aktualisErtekekLekerese
);

// ----- SAJÁT ÉRTÉK JAVASLAT LEKÉRÉSE -----
// GET /api/ertekJavaslat/sajat/:tartalomId
// Védett endpoint - authentikáció szükséges
router.get(
  '/ertekJavaslat/sajat/:tartalomId',
  authMiddleware,  // Authentikáció kötelező
  ertekJavaslatController.sajatErtekJavaslatLekerese
);

// ----- TARTALOM RÉSZLETES ÉRTÉKEI -----
// GET /api/ertekJavaslat/reszletek/:tartalomId
// Részben védett endpoint - authentikáció opcionális (vendégként is elérhető)
// Ha be van jelentkezve, megkapja a saját érték javaslatát is
router.get(
  '/ertekJavaslat/reszletek/:tartalomId',
  (req, res, next) => {
    // Opcionális authentikáció - ha van token, ellenőrizzük, ha nincs, folytatjuk
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      // Van token - próbáljuk meg validálni
      authMiddleware(req, res, next);
    } else {
      // Nincs token - folytatjuk vendégként
      next();
    }
  },
  ertekJavaslatController.tartalomErtekReszletei
);

// ===== ROUTER EXPORTÁLÁSA =====
module.exports = router;
