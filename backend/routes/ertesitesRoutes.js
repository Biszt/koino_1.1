// backend/routes/ertesitesRoutes.js

const express = require('express');
const router = express.Router();

// A controller importálása
const ertesitesController = require('../controllers/ertesitesController');

// A hitelesítési middleware importálása
// Ez ellenőrzi, hogy az eEmber be van-e jelentkezve, és beállítja a req.user objektumot
const { authMiddleware } = require('../middlewares/authMiddleware');

// Minden értesítési végpont csak bejelentkezett eEmbereknek érhető el
// A authMiddleware middleware minden route elé kerül

// GET /api/ertesitesek
// A bejelentkezett eEmber postafiókja – lapozható lista
router.get('/', authMiddleware, ertesitesController.postafiokLekereses);

// GET /api/ertesitesek/olvasatlan-szam
// Csak az olvasatlan értesítések száma (badge frissítéshez)
// Fontos: ezt a route-ot a /:id előtt kell definiálni,
// különben az Express az 'olvasatlan-szam' szöveget id-ként értelmezné
router.get('/olvasatlan-szam', authMiddleware, ertesitesController.olvasatlanokSzama);

// PATCH /api/ertesitesek/mind-olvasott
// Az összes olvasatlan értesítés olvasottnak jelölése
// Szintén a /:id előtt kell lennie
router.patch('/mind-olvasott', authMiddleware, ertesitesController.mindetOlvasottnak);

// PATCH /api/ertesitesek/:id/olvasott
// Egy konkrét értesítés olvasottnak jelölése
router.patch('/:id/olvasott', authMiddleware, ertesitesController.megjelolOlvasottnak);

// DELETE /api/ertesitesek/:id
// Egy konkrét értesítés végleges törlése a postafiókból (csak a saját értesítését).
// Külön HTTP-metódus (DELETE), ezért nem ütközik a fenti GET/PATCH nevesített
// útvonalakkal (olvasatlan-szam, mind-olvasott).
router.delete('/:id', authMiddleware, ertesitesController.torolErtesites);

module.exports = router;