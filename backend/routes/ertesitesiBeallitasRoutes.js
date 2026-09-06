// backend/routes/ertesitesiBeallitasRoutes.js

const express = require('express');
const router = express.Router();

const ertesitesiBeallitasController = require('../controllers/ertesitesiBeallitasController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// PUT /api/ertesitesi-beallitasok
// Beállítás létrehozása vagy frissítése (upsert)
// PUT-ot használunk POST helyett, mert ez egy "helyettesítő" művelet:
// ha létezik → frissít, ha nem → létrehoz
router.put('/', authMiddleware, ertesitesiBeallitasController.beallitasLetrehozasVagyFrissites);

// GET /api/ertesitesi-beallitasok
// Az összes saját beállítás lekérése
router.get('/', authMiddleware, ertesitesiBeallitasController.sajatBeallitasokLekereses);

// GET  /api/ertesitesi-beallitasok/globalis – a fő menüs GLOBÁLIS alapbeállítás lekérése
// PUT  /api/ertesitesi-beallitasok/globalis – a globális alapbeállítás mentése
// Fontos: a konkrét '/globalis' útvonalat a '/:id'-jellegű minták ELŐTT definiáljuk.
router.get('/globalis', authMiddleware, ertesitesiBeallitasController.globalisLekereses);
router.put('/globalis', authMiddleware, ertesitesiBeallitasController.globalisMentese);

// GET /api/ertesitesi-beallitasok/entitas/:entitasTipus/:entitasId
// Egy konkrét entitáson lévő beállítás lekérése
// Az entitasTipus az URL-ben van, mert az entitasId önmagában nem egyedi
// (pl. egy Gondolat és egy Kategoria is lehet ugyanolyan ObjectId-vel)
router.get(
  '/entitas/:entitasTipus/:entitasId',
  authMiddleware,
  ertesitesiBeallitasController.entitasBeallitasLekereses
);

// GET /api/ertesitesi-beallitasok/ervenyes/:entitasTipus/:entitasId
// Az entitáson ÉPP ÉRVÉNYES (örökölt vagy saját) beállítás – a beállító ablak előkitöltéséhez.
// A cascade a szülőkön felfelé megkeresi a legközelebbi beállítást; a válasz jelzi, hogy
// saját rekord-e vagy örökölt (forras: 'sajat' | 'orokolt' | 'nincs', + vanSajat).
router.get(
  '/ervenyes/:entitasTipus/:entitasId',
  authMiddleware,
  ertesitesiBeallitasController.ervenyesBeallitasLekereses
);

// DELETE /api/ertesitesi-beallitasok/:id
// Egy beállítás törlése
router.delete('/:id', authMiddleware, ertesitesiBeallitasController.beallitasTorles);

module.exports = router;