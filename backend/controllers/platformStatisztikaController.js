// backend/controllers/platformStatisztikaController.js

// ===== IMPORTOK =====
// Service: üzleti logika kezelése
const platformStatisztikaService = require('../services/platformStatisztikaService');

// ===== PLATFORM STATISZTIKA CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Feladata: kérés fogadása → service hívás → válasz küldése
class PlatformStatisztikaController {

  // ===== PLATFORM STATISZTIKA LEKÉRÉSE =====
  // Az összes platformszintű statisztikai adat visszaadása
  // Használat: Főoldal alsó statisztika sáv tölti be bejelentkezés után
  // GET /api/platform/statisztika
  // @param {Object} req - Express request (req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async platformStatisztikaLekereses(req, res) {
    console.log('platformStatisztikaController.platformStatisztikaLekereses - KEZDÉS', {
      eemberId: req.user?.id
    });
    try {

      // === 1. LÉPÉS: BEJELENTKEZÉS ELLENŐRZÉSE ===
      // Csak bejelentkezett eemberek kérhetik le a statisztikát
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // === 2. LÉPÉS: SERVICE HÍVÁS ===
      // A service lekéri az eemberek és tartalmak számát az adatbázisból
      const statisztika = await platformStatisztikaService.platformStatisztikaLekereses();

      // === 3. LÉPÉS: SIKERES VÁLASZ KÜLDÉSE ===
      // 200 OK – sikeres lekérés
      res.status(200).json({
        success:        true,
        eemberekSzama:  statisztika.eemberekSzama,   // Platformon regisztrált eemberek száma
        tartalmakSzama: statisztika.tartalmakSzama   // Platformon lévő tartalmak száma
      });

      console.log('platformStatisztikaController.platformStatisztikaLekereses - VÉGE (siker)', {
        eemberekSzama:  statisztika.eemberekSzama,
        tartalmakSzama: statisztika.tartalmakSzama
      });

    } catch (error) {
      console.error('platformStatisztikaController.platformStatisztikaLekereses - VÉGE (hiba)', {
        hiba: error.message
      });

      // 500 Internal Server Error – szerver oldali hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a statisztika lekérése során'
      });
    }
  }

}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new PlatformStatisztikaController();