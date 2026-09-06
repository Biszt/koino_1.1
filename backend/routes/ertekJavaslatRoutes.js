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
// Body: { entitasId, entitasTipus, javaslatElfogadasiKuszob, reszveteliAranyKuszob,
//         minimumDontesiIdo, maximumDontesiIdo }
router.post(
  '/ertekJavaslat',
  authMiddleware,  // Authentikáció kötelező
  ertekJavaslatController.ertekJavaslatLetrehozasaVagyModositasa
);

// ----- AKTUÁLIS ÉRTÉKEK LEKÉRÉSE -----
// GET /api/ertekJavaslat/aktualis/:entitasTipus/:entitasId
// Nyilvános endpoint - bárki lekérheti
router.get(
  '/ertekJavaslat/aktualis/:entitasTipus/:entitasId',
  ertekJavaslatController.aktualisErtekekLekerese
);

// ----- ENTITÁS ÉRTÉK-ELOSZLÁSA -----
// GET /api/ertekJavaslat/eloszlas/:entitasTipus/:entitasId
// Nyilvános endpoint - bárki lekérheti (érték → hány javaslat, mind a 4 küszöbre)
router.get(
  '/ertekJavaslat/eloszlas/:entitasTipus/:entitasId',
  ertekJavaslatController.ertekEloszlasLekerese
);

// ----- SAJÁT ÉRTÉK JAVASLAT LEKÉRÉSE -----
// GET /api/ertekJavaslat/sajat/:entitasTipus/:entitasId
// Védett endpoint - authentikáció szükséges
router.get(
  '/ertekJavaslat/sajat/:entitasTipus/:entitasId',
  authMiddleware,  // Authentikáció kötelező
  ertekJavaslatController.sajatErtekJavaslatLekerese
);

// ----- ENTITÁS RÉSZLETES ÉRTÉKEI -----
// GET /api/ertekJavaslat/reszletek/:entitasTipus/:entitasId
// Részben védett endpoint - authentikáció opcionális (vendégként is elérhető)
// Ha be van jelentkezve, megkapja a saját érték javaslatát is
router.get(
  '/ertekJavaslat/reszletek/:entitasTipus/:entitasId',
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
  ertekJavaslatController.gondolatErtekReszletei
);

// ===== ROUTER EXPORTÁLÁSA =====
module.exports = router;
