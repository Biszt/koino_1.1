// backend/controllers/keresesController.js

// ===================================
// IMPORTOK
// ===================================
const KeresesService = require('../services/keresesService');

// ===================================
// KERESÉS CONTROLLER OSZTÁLY
// ===================================
// Felelősség: a GET /api/kereses végpont kiszolgálása — a query paraméterek
// kiolvasása és a KeresesService hívása. Cím/név alapú entitás-keresés a
// frontend közös keresőjéhez.
class KeresesController {

  // ===================================
  // ENTITÁS KERESÉSE
  // ===================================
  // GET /api/kereses?q=<szoveg>&tipusok=Tartalom,Kategoria,TartalomTipus&limit=10
  async entitasKereses(req, res) {
    console.log('KeresesController.entitasKereses - KEZDÉS', { query: req.query });

    try {
      // 1. LÉPÉS - Bejelentkezés ellenőrzése (a route authMiddleware-es, de biztos ami biztos)
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 2. LÉPÉS - Query paraméterek kiolvasása
      const kifejezes = req.query.q ?? '';

      // A tipusok vesszővel elválasztott lista (pl. "Tartalom,Kategoria"); ha nincs, null
      const tipusok = req.query.tipusok
        ? req.query.tipusok.split(',').map(t => t.trim()).filter(Boolean)
        : null;

      // Limit: opcionális szám, ésszerű korlátok között (1–50), alap 10
      let limit = parseInt(req.query.limit, 10);
      if (!Number.isInteger(limit) || limit < 1) limit = 10;
      if (limit > 50) limit = 50;

      // Opcionális ág-szűrő (a kártya-menük Keresés pontja): csak az adott
      // entitás ága alatti találatok
      const agEntitasId = req.query.agEntitasId || null;

      // 3. LÉPÉS - Service hívás
      const talalatok = await KeresesService.entitasKereses(kifejezes, tipusok, limit, agEntitasId);

      console.log('KeresesController.entitasKereses - VÉGE', { talalatok: talalatok.length });

      // 4. LÉPÉS - Sikeres válasz
      return res.status(200).json({
        success: true,
        talalatok
      });

    } catch (error) {
      console.error('KeresesController.entitasKereses - HIBA', { hiba: error.message });
      return res.status(500).json({
        success: false,
        message: error.message ?? 'Keresési hiba'
      });
    }
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new KeresesController();
