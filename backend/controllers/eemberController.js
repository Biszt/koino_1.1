// backend/controllers/eemberController.js

// ===== IMPORTOK =====
// Service: üzleti logika kezelése
const eEmberService = require('../services/eemberService');

// ===== EEMBER CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Feladata: kérés fogadása → service hívás → válasz küldése
class eEmberController {

  // ===== REGISZTRÁCIÓ =====
  // Új eember létrehozása
  // POST /api/eember/regisztracio
  // @param {Object} req - Express request (body: eemberNev, email, jelszo, nev, lokacio)
  // @param {Object} res - Express response
  async regisztracio(req, res) {
    console.log('eEmberController.regisztracio - KEZDÉS', { body: req.body });
    try {
      // Regisztrációs adatok kiolvasása a kérés body-jából
      const adatok = req.body;

      // Service hívás – validáció, mentés, JWT generálás
      const eredmeny = await eEmberService.regisztracio(adatok);

      // 201 Created – sikeres regisztráció
      res.status(201).json({
        success: true,
        message: 'Regisztráció sikeres',
        eember:  eredmeny.eember,
        token:   eredmeny.token
      });

      console.log('eEmberController.regisztracio - VÉGE (siker)', { id: eredmeny.eember._id });

    } catch (error) {
      console.error('eEmberController.regisztracio - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== BEJELENTKEZÉS =====
  // eEmber azonosítása email vagy eemberNev + jelszó alapján
  // POST /api/eember/bejelentkezes
  // @param {Object} req - Express request (body: azonosito, jelszo)
  // @param {Object} res - Express response
  async bejelentkezes(req, res) {
    console.log('eEmberController.bejelentkezes - KEZDÉS', { body: req.body });
    try {
      // azonosito: lehet email CÍM vagy eemberNev – a service dönti el
      const { azonosito, jelszo } = req.body;

      // Kötelező mezők ellenőrzése
      if (!azonosito || !jelszo) {
        return res.status(400).json({
          success: false,
          message: 'Azonosító (email vagy eemberNev) és jelszó megadása kötelező'
        });
      }

      // Service hívás – azonosítás + JWT generálás
      const eredmeny = await eEmberService.bejelentkezes(azonosito, jelszo);

      // 200 OK – sikeres bejelentkezés
      res.status(200).json({
        success: true,
        message: 'Bejelentkezés sikeres',
        eember:  eredmeny.eember,
        token:   eredmeny.token
      });

      console.log('eEmberController.bejelentkezes - VÉGE (siker)', { eemberNev: eredmeny.eember?.eemberNev });

    } catch (error) {
      console.error('eEmberController.bejelentkezes - VÉGE (hiba)', { hiba: error.message });
      res.status(401).json({ success: false, message: error.message });
    }
  }

  // ===== SAJÁT ADATOK LEKÉRÉSE =====
  // A bejelentkezett eember aktuális adatainak visszaadása
  // Használat: Főoldal statisztika sáv tölti be (eemberNev, tudatpontok)
  // GET /api/eember/sajat-adatok
  // @param {Object} req - Express request (req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async sajatAdatokLekereses(req, res) {
    console.log('eEmberController.sajatAdatokLekereses - KEZDÉS', { eemberId: req.user?.id });
    try {
      // eEmber ID kiolvasása a JWT middleware által beállított req.user-ből
      const eemberId = req.user?.id;

      // Bejelentkezés ellenőrzése
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // Service hívás – friss adatok lekérése az adatbázisból
      const adatok = await eEmberService.sajatAdatokLekereses(eemberId);

      // 200 OK – sikeres lekérés
      res.status(200).json({
        success:    true,
        eemberNev:  adatok.eemberNev,   // Eembernév a sávhoz
        nev:        adatok.nev,          // Valódi név
        tudatpontok: adatok.tudatpontok  // Aktuális egyenleg
      });

      console.log('eEmberController.sajatAdatokLekereses - VÉGE (siker)', { eemberNev: adatok.eemberNev });

    } catch (error) {
      console.error('eEmberController.sajatAdatokLekereses - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new eEmberController();