// backend/controllers/sikidomController.js

// ===================================
// IMPORTOK
// ===================================
const SikidomService = require('../services/sikidomService');

// ===================================
// SÍKIDOM CONTROLLER OSZTÁLY
// ===================================
// Felelősség: a Síkidom nézet végpontja — a query paraméterek kiolvasása és a
// SikidomService hívása.
//   GET /api/sikidom?gyoker=<id|null>&kuszob=<szám>&maxCsomopont=<szám>
class SikidomController {

  // GET /api/sikidom
  async reszfa(req, res) {
    console.log('SikidomController.reszfa - KEZDÉS', { query: req.query });

    try {
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // A nézet gyökere (opcionális; hiányában a legerősebb gyökér)
      const gyoker = req.query.gyoker || null;

      // Minimum effektív méret (opcionális): ez alatt a csomópontok kimaradnak
      let kuszob = parseFloat(req.query.kuszob);
      if (!Number.isFinite(kuszob) || kuszob < 0) kuszob = null;

      // Biztonsági darab-plafon (a service a saját maximumára vágja)
      let maxCsomopont = parseInt(req.query.maxCsomopont, 10);
      if (!Number.isInteger(maxCsomopont) || maxCsomopont < 1) maxCsomopont = 500;

      const eredmeny = await SikidomService.reszfaLekerese(gyoker, kuszob, maxCsomopont);

      console.log('SikidomController.reszfa - VÉGE', {
        gyokerVan: !!eredmeny.gyoker,
        csomopontokSzama: eredmeny.csomopontok.length
      });

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('SikidomController.reszfa - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Síkidom-lekérési hiba'
      });
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new SikidomController();
