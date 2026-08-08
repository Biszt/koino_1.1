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

  // ===================================
  // GET /api/sikidom/gyerekek
  // ===================================
  // Egy szülő gyerekei egy TUDATPONT-KÜSZÖB fölött — a Síkidom nézet
  // képernyő-vezérelt betöltésének adatforrása. NEM lapozás: a kliens a síkidom
  // pillanatnyi képernyő-méretéből számolja a küszöböt, és azt kéri, ami elér oda.
  //   GET /api/sikidom/gyerekek?szulo=<id|elhagyva>&minPont=<szám>
  //                            &kurzorPont=<szám>&kurzorId=<id>&darab=<szám>
  //                            &osszesKell=<0|1>
  // A `szulo` elhagyva → a GYÖKEREK. A kurzor a válaszból jön vissza.
  // Az `osszesKell=0` kihagyja az `osszesGyerekPont` aggregációt (a válaszban null).
  async gyerekek(req, res) {
    console.log('SikidomController.gyerekek - KEZDÉS', { query: req.query });

    try {
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // A szülő elhagyható — ilyenkor a gyökereket adjuk
      const szulo = req.query.szulo || null;

      // A tudatpont-küszöb: ez alatt a gyerek túl kicsi volna a képernyőn
      let minPont = parseFloat(req.query.minPont);
      if (!Number.isFinite(minPont) || minPont < 0) minPont = 0;

      // Kurzor: meddig jutottunk (mindkettő együtt érvényes)
      let kurzorPont = parseFloat(req.query.kurzorPont);
      if (!Number.isFinite(kurzorPont)) kurzorPont = null;
      const kurzorId = req.query.kurzorId || null;
      if (kurzorPont === null || !kurzorId) {
        kurzorPont = null;
      }

      // Biztonsági darab-plafon (a service a saját maximumára vágja)
      let darab = parseInt(req.query.darab, 10);
      if (!Number.isInteger(darab) || darab < 1) darab = 300;

      // Kell-e az ÖSSZES gyerek együttes pontja? Alapból IGEN (visszafelé
      // kompatibilis); a kliens `osszesKell=0`-val hagyja ki, ha már tudja.
      const osszesKell = req.query.osszesKell !== '0';

      const eredmeny = await SikidomService.gyerekekLekerese(
        szulo, minPont, kurzorPont, kurzorId, darab, osszesKell
      );

      console.log('SikidomController.gyerekek - VÉGE', {
        visszaadottDarab: eredmeny.gyerekek.length,
        vanTovabb: eredmeny.vanTovabb
      });

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('SikidomController.gyerekek - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Síkidom gyerek-lekérési hiba'
      });
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new SikidomController();
