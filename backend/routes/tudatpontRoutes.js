// backend/routes/tudatpontRoutes.js

// ===== IMPORTOK =====
const express = require('express');
const router = express.Router();

// Controller importálása
const TudatpontController = require('../controllers/tudatpontController');

// Middleware importálása (authentikáció)
// Az authMiddleware ellenőrzi a JWT token-t és req.user-be teszi a eember adatait
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');
// ✅ JAVÍTVA: Destrukturálás használata

// ===== TUDATPONT ÚTVONALAK (ROUTES) =====

// ============================================================
// TUDATPONT HOZZÁRENDELÉS
// ============================================================

// ----- TUDATPONTOK HOZZÁRENDELÉSE ENTITÁSHOZ -----
// Endpoint: POST /api/tudatpont/hozzarendeles
// Body: { entitasId, entitasTipus, pontok }
// Védett: Csak bejelentkezett eemberek érhetik el
router.post(
  '/hozzarendeles',
  authMiddleware,  // ✅ Most már function
  (req, res) => TudatpontController.tudatpontHozzarendelese(req, res)
);

// ----- RÉSZVÉTELI SZEREP BEÁLLÍTÁSA -----
// Endpoint: PUT /api/tudatpont/szerep/:entitasTipus/:entitasId
// Body: { szerep: 'passziv' | 'aktiv' }
// Védett: Csak bejelentkezett eemberek (a SAJÁT szerepük az entitáson).
// A kártya „Részvételi beállítások" menüpontja hívja; a pontokhoz nem nyúl.
router.put(
  '/szerep/:entitasTipus/:entitasId',
  authMiddleware,
  (req, res) => TudatpontController.szerepBeallitasa(req, res)
);

// ============================================================
// ALLOKÁCIÓ LEKÉRDEZÉS
// ============================================================

// ----- ENTITÁS ALLOKÁCIÓJÁNAK LEKÉRÉSE -----
// Endpoint: GET /api/tudatpont/entitas/:entitasTipus/:entitasId
// URL paraméterek: entitasTipus, entitasId
// Nyilvános: Bárki lekérdezheti (nem szükséges bejelentkezés)
// Ha be van jelentkezve, megkapja a saját hozzájárulását is
router.get(
  '/entitas/:entitasTipus/:entitasId',
  optionalAuthMiddleware,  // ✅ Opcionális auth használata
  (req, res) => TudatpontController.entitasAllokaciLekerese(req, res)
);

// ----- HIÁNYZÓ FELMENŐK FELMÉRÉSE -----
// Endpoint: GET /api/tudatpont/hianyzo-felmenok/:entitasTipus/:entitasId
// URL paraméterek: entitasTipus, entitasId
// Védett: Csak bejelentkezett eemberek (a saját felmenő-hiányaik)
// A tudatpont módosítás megnyitásakor hívjuk: megmutatja, hány felmenőre kell még pont.
router.get(
  '/hianyzo-felmenok/:entitasTipus/:entitasId',
  authMiddleware,
  (req, res) => TudatpontController.hianyzoFelmenokLekerese(req, res)
);

// ============================================================
// EMBER HOZZÁRENDELÉSEI
// ============================================================

// ----- EMBER ÖSSZES HOZZÁRENDELÉSÉNEK LEKÉRÉSE -----
// Endpoint: GET /api/tudatpont/hozzarendelesek?limit=20&skip=0
// Query paraméterek: limit (max 100), skip (lapozás)
// Védett: Csak bejelentkezett eemberek (saját hozzárendelések)
router.get(
  '/hozzarendelesek',
  authMiddleware,  // ✅ Kötelező auth
  (req, res) => TudatpontController.eemberHozzarendeleseinekLekerese(req, res)
);

// ----- EMBER AKTÍV HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
// Endpoint: GET /api/tudatpont/aktiv-hozzarendelesek?limit=20&skip=0
// Query paraméterek: limit (max 100), skip (lapozás)
// Védett: Csak bejelentkezett eemberek (saját aktív hozzárendelések)
router.get(
  '/aktiv-hozzarendelesek',
  authMiddleware,  // ✅ Kötelező auth
  (req, res) => TudatpontController.eemberAktivHozzarendeleseinekLekerese(req, res)
);

// ============================================================
// ENTITÁS HOZZÁJÁRULÓI
// ============================================================

// ----- ENTITÁS HOZZÁJÁRULÓINAK LEKÉRÉSE -----
// Endpoint: GET /api/tudatpont/hozzajarulok/:entitasTipus/:entitasId?limit=100&skip=0
// URL paraméterek: entitasTipus, entitasId
// Query paraméterek: limit (max 200), skip (lapozás)
// Nyilvános: Bárki lekérdezheti (ki adott pontokat egy gondolatra)
router.get(
  '/hozzajarulok/:entitasTipus/:entitasId',
  (req, res) => TudatpontController.entitasHozzajaruloinakLekerese(req, res)
);

// ============================================================
// TUDATPONTOK VISSZAOSZTÁSA — HTTP-VÉGPONT ELTÁVOLÍTVA (2026-07-20)
// ============================================================
// A `POST /api/tudatpont/visszaosztas` végpontot ELTÁVOLÍTOTTUK: csak authMiddleware
// védte (admin-védelem nélkül), így bármely bejelentkezett e-ember bármely entitást
// töröltethetett vele — a javaslat→szavazás→egyezmény folyamat MEGKERÜLÉSÉVEL. A
// tulajdonos döntése (2026-07-20): egyezmény nélkül entitás nem törlődhet. A
// frontend úgysem használta. A visszaosztás LOGIKÁJA változatlanul él a
// `TudatpontService.tudatpontokVisszaosztasa` service-metódusban, amit a
// törlés-/egyesítés-végrehajtók KÖZVETLENÜL hívnak (a szavazás után) — ezt NEM
// érinti az útvonal törlése.

// ============================================================
// JAVASLAT RENDSZERHEZ (JOGOSULTSÁG ELLENŐRZÉS)
// ============================================================

// ----- EMBER JOGOSULTSÁGÁNAK ELLENŐRZÉSE -----
// Endpoint: GET /api/tudatpont/jogosultsag/:entitasTipus/:entitasId
// URL paraméterek: entitasTipus, entitasId
// Védett: Csak bejelentkezett eemberek
// Használat: szavazási jogosultság ellenőrzéséhez (javaslat rendszer)
router.get(
  '/jogosultsag/:entitasTipus/:entitasId',
  authMiddleware,  // ✅ Kötelező auth
  (req, res) => TudatpontController.eemberJogosultsagEllenorzes(req, res)
);

// ===== ROUTER EXPORTÁLÁSA =====
module.exports = router;
