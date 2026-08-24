// backend/routes/eemberRoutes.js

// ===== EXPRESS ROUTER IMPORTÁLÁSA =====
// Ez kezeli az útvonalakat
const express = require('express');

// ===== ROUTER PÉLDÁNY LÉTREHOZÁSA =====
// Ez egy mini Express alkalmazás
const router = express.Router();

// ===== CONTROLLER IMPORTÁLÁSA =====
// Ez fogja kezelni az üzleti logikát
const eemberController = require('../controllers/eemberController');

// ===== MIDDLEWARE IMPORTÁLÁSA =====
// Az authMiddleware ellenőrzi a JWT tokent és beállítja a req.user objektumot
const { authMiddleware } = require('../middlewares/authMiddleware');

// A kérés-korlát: a levélküldő végpontokat védi a visszaéléstől (levél-özön)
const { keresKorlat } = require('../middlewares/keresKorlatMiddleware');

// ===== ÚTVONALAK DEFINIÁLÁSA =====

// ----- EEMBER REGISZTRÁCIÓ -----
// POST kérés: /api/eember/regisztracio
// Nyilvános – authentikáció nem szükséges
router.post('/eember/regisztracio', eemberController.regisztracio);

// ----- EEMBER BEJELENTKEZÉS -----
// POST kérés: /api/eember/bejelentkezes
// Nyilvános – authentikáció nem szükséges
router.post('/eember/bejelentkezes', eemberController.bejelentkezes);

// ----- SAJÁT ADATOK LEKÉRÉSE -----
// GET kérés: /api/eember/sajat-adatok
// Védett – csak bejelentkezett eemberek érhetik el
// Visszaadja: eemberNev, nev, tudatpontok (főoldal statisztika sávhoz)
router.get('/eember/sajat-adatok', authMiddleware, eemberController.sajatAdatokLekereses);

// ----- PROFIL-ADATOK MÓDOSÍTÁSA -----
// PUT kérés: /api/eember/adatok (body: nev, lokacio)
// Védett – az eember beállítások modal használja (terv 8. pont)
router.put('/eember/adatok', authMiddleware, eemberController.profilModositasa);

// ----- JELSZÓVÁLTÁS -----
// POST kérés: /api/eember/jelszovaltas (body: regiJelszo, ujJelszo)
// Védett – csak a régi jelszó helyes megadásával
router.post('/eember/jelszovaltas', authMiddleware, eemberController.jelszoValtas);

// ----- FIÓK-TÖRLÉS (ÖNKÉNTES) -----
// DELETE kérés: /api/eember (body: jelszo)
// Védett – a saját fiók végleges törlése, a jelszóval igazolva (visszafordíthatatlan)
router.delete('/eember', authMiddleware, eemberController.eemberTorlese);

// ----- MEGERŐSÍTŐ LEVÉL KÉRÉSE -----
// POST kérés: /api/eember/email-megerosites-keres
// Védett – a bejelentkezett e-ember kéri a SAJÁT címére. Maga a kérés a felhatalmazás
// a levél kiküldésére: a koino magától soha nem küld levelet.
// Kérés-korlát: óránként 5 — a levél-özön ellen (a saját címére is).
router.post(
  '/eember/email-megerosites-keres',
  keresKorlat({ percek: 60, max: 5, uzenet: 'Túl sok megerősítő levelet kértél. Próbáld újra egy óra múlva.' }),
  authMiddleware,
  eemberController.emailMegerositesKeres
);

// ===== ELFELEJTETT JELSZÓ (3. lépés) =====

// ----- HELYREÁLLÍTÓ LEVÉL KÉRÉSE -----
// POST kérés: /api/eember/jelszo-helyreallitas-keres (body: azonosito)
// NYILVÁNOS – aki nem tud belépni, épp ezért használja.
// A válasz MINDIG ugyanaz, akár létezik az azonosító, akár nem (különben a végpont
// kiderítené, ki tagja a koinónak).
// Kérés-korlát: óránként 5 kérés IP-nként — enélkül bárki levél-özönt zúdíthatna egy
// e-emberre a MI nevünkben, és a szolgáltatói keretünket is elhasználná.
router.post(
  '/eember/jelszo-helyreallitas-keres',
  keresKorlat({ percek: 60, max: 5, uzenet: 'Túl sok helyreállítási kérés. Próbáld újra egy óra múlva.' }),
  eemberController.jelszoHelyreallitasKeres
);

// ----- A HIVATKOZÁS ELLENŐRZÉSE -----
// GET kérés: /api/eember/jelszo-helyreallitas/:token
// NYILVÁNOS – a frontend ezzel dönti el, megmutassa-e az új-jelszó űrlapot.
router.get('/eember/jelszo-helyreallitas/:token', eemberController.jelszoHelyreallitasEllenorzes);

// ----- ÚJ JELSZÓ BEÁLLÍTÁSA -----
// POST kérés: /api/eember/jelszo-helyreallitas (body: token, ujJelszo)
// NYILVÁNOS – a token maga az igazolás. A beállítás MINDEN korábbi bejelentkezést
// érvénytelenít (tokenVerzio léptetés), így a betolakodót is kizárja.
// Kérés-korlát: óránként 10 — a token-találgatás kifárasztására.
router.post(
  '/eember/jelszo-helyreallitas',
  keresKorlat({ percek: 60, max: 10, uzenet: 'Túl sok próbálkozás. Próbáld újra egy óra múlva.' }),
  eemberController.jelszoHelyreallitas
);

// ----- MEGERŐSÍTŐ HIVATKOZÁS BEVÁLTÁSA -----
// GET kérés: /api/eember/email-megerosites/:token
// NYILVÁNOS – a levelet más gépen/böngészőben is megnyithatja, ahol nincs bejelentkezve.
// A biztonságot a token kitalálhatatlansága adja (32 bájt véletlen), nem a bejelentkezés.
router.get('/eember/email-megerosites/:token', eemberController.emailMegerositesBevaltas);

// ===== ROUTER EXPORTÁLÁSA =====
// Ezt importálja a server.js
module.exports = router;