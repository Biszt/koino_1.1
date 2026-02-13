// backend/routes/emberRoutes.js

// Express Router importálása - ez kezeli az útvonalakat
const express = require('express');

// Router példány létrehozása - ez egy mini Express alkalmazás
const router = express.Router();

// Controller importálása - ez fogja kezelni az üzleti logikát
const emberController = require('../controllers/emberController');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// Ember regisztráció
// POST kérés: /api/ember/regisztracio
router.post('/ember/regisztracio', emberController.regisztracio);

// Ember bejelentkezés
// POST kérés: /api/ember/bejelentkezes
router.post('/ember/bejelentkezes', emberController.bejelentkezes);

// Router exportálása - ezt importálja a server.js
module.exports = router;
