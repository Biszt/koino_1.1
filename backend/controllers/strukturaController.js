// backend/controllers/strukturaController.js

// ===================================
// IMPORTOK
// ===================================
const StrukturaService = require('../services/strukturaService');

// ===================================
// TÉRKÉP CONTROLLER OSZTÁLY
// ===================================
// Felelősség: a Struktúra nézet (teljes képernyős fa-nézet) két végpontja —
// a query paraméterek kiolvasása és a StrukturaService hívása.
//   GET /api/struktura/darabszam — előzetes darabszám ("N entitás — elkészíted?")
//   GET /api/struktura           — a fa lapozott lekérése (kurzoros)
class StrukturaController {

  // ===================================
  // DARABSZÁM
  // ===================================
  // GET /api/struktura/darabszam?agEntitasId=<id>
  async darabszam(req, res) {
    console.log('StrukturaController.darabszam - KEZDÉS', { query: req.query });

    try {
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // Opcionális ág-szűrő (a kártya-menük Struktúra nézet pontja)
      const agEntitasId = req.query.agEntitasId || null;

      const eredmeny = await StrukturaService.darabszamLekerese(agEntitasId);

      console.log('StrukturaController.darabszam - VÉGE', eredmeny);

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('StrukturaController.darabszam - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Darabszám-lekérési hiba'
      });
    }
  }

  // ===================================
  // LAP LEKÉRÉSE
  // ===================================
  // GET /api/struktura?kurzor=<utolsoLapKurzor>&lapMeret=2000&agEntitasId=<id>
  async lap(req, res) {
    console.log('StrukturaController.lap - KEZDÉS', { query: req.query });

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

      // Opcionális ág-szűrő (a kártya-menük Struktúra nézet pontja): ág-módban csak a
      // részfát lapozzuk le, nem a teljes fát (skálázható, osLanc-alapú szűrés).
      const agEntitasId = req.query.agEntitasId || null;

      const eredmeny = await StrukturaService.lapLekerese(kurzor, lapMeret, agEntitasId);

      console.log('StrukturaController.lap - VÉGE', {
        sorokSzama: eredmeny.sorok.length,
        vanKovetkezoLap: !!eredmeny.kovetkezoKurzor
      });

      return res.status(200).json({
        success: true,
        ...eredmeny
      });

    } catch (error) {
      console.error('StrukturaController.lap - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Struktúra nézet-lekérési hiba'
      });
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new StrukturaController();
