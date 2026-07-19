// backend/controllers/terkepController.js

// ===================================
// IMPORTOK
// ===================================
const TerkepService = require('../services/terkepService');

// ===================================
// TÉRKÉP CONTROLLER OSZTÁLY
// ===================================
// Felelősség: a Térkép (teljes képernyős fa-nézet) két végpontja —
// a query paraméterek kiolvasása és a TerkepService hívása.
//   GET /api/terkep/darabszam — előzetes darabszám ("N entitás — elkészíted?")
//   GET /api/terkep           — a fa lapozott lekérése (kurzoros)
class TerkepController {

  // ===================================
  // DARABSZÁM
  // ===================================
  // GET /api/terkep/darabszam?agEntitasId=<id>
  async darabszam(req, res) {
    console.log('TerkepController.darabszam - KEZDÉS', { query: req.query });

    try {
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // Opcionális ág-szűrő (a kártya-menük Térkép pontja)
      const agEntitasId = req.query.agEntitasId || null;

      const eredmeny = await TerkepService.darabszamLekerese(agEntitasId);

      console.log('TerkepController.darabszam - VÉGE', eredmeny);

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('TerkepController.darabszam - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Darabszám-lekérési hiba'
      });
    }
  }

  // ===================================
  // LAP LEKÉRÉSE
  // ===================================
  // GET /api/terkep?kurzor=<utolsoLapKurzor>&lapMeret=2000
  async lap(req, res) {
    console.log('TerkepController.lap - KEZDÉS', { query: req.query });

    try {
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // Kurzor: az előző lap utolsó sorának lapKurzor értéke (null = első lap)
      const kurzor = req.query.kurzor || null;

      // Lapméret: opcionális szám, a service a saját maximumára vágja
      let lapMeret = parseInt(req.query.lapMeret, 10);
      if (!Number.isInteger(lapMeret) || lapMeret < 1) lapMeret = 2000;

      const eredmeny = await TerkepService.lapLekerese(kurzor, lapMeret);

      console.log('TerkepController.lap - VÉGE', {
        sorokSzama: eredmeny.sorok.length,
        vanKovetkezoLap: !!eredmeny.kovetkezoKurzor
      });

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('TerkepController.lap - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Térkép-lekérési hiba'
      });
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new TerkepController();
