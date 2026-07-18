// backend/controllers/meghivoController.js

// Felelősség: a meghívó HTTP-végpontok kezelése (kérés → service → válasz).
// Használja: meghivoRoutes.

// ===== IMPORTOK =====
const MeghivoService = require('../services/meghivoService');

// ===== MEGHÍVÓ CONTROLLER OSZTÁLY =====
class MeghivoController {

  // ===== KÖTELEZŐ-E A MEGHÍVÓ? =====
  // GET /api/meghivo/kotelezo — NYILVÁNOS végpont: a regisztrációs űrlap
  // ebből tudja, hogy mutassa-e a „Meghívó kód" mezőt.
  async kotelezoLekerese(req, res) {
    console.log('MeghivoController.kotelezoLekerese - KEZDÉS');
    try {
      const kotelezo = MeghivoService.meghivasKotelezoE();

      res.status(200).json({ success: true, kotelezo });

      console.log('MeghivoController.kotelezoLekerese - VÉGE (siker)', { kotelezo });
    } catch (error) {
      console.error('MeghivoController.kotelezoLekerese - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== ÚJ MEGHÍVÓ LÉTREHOZÁSA =====
  // POST /api/meghivo — védett; body: { tanusitva: true }
  async letrehozas(req, res) {
    console.log('MeghivoController.letrehozas - KEZDÉS', { eemberId: req.user?.id, body: req.body });
    try {
      const meghivo = await MeghivoService.meghivoLetrehozasa(req.user.id, req.body?.tanusitva);

      res.status(201).json({
        success: true,
        message: 'Meghívó létrehozva',
        meghivo
      });

      console.log('MeghivoController.letrehozas - VÉGE (siker)', { id: meghivo._id });
    } catch (error) {
      console.error('MeghivoController.letrehozas - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== SAJÁT MEGHÍVÓK LISTÁZÁSA =====
  // GET /api/meghivo/sajat — védett
  async sajatLista(req, res) {
    console.log('MeghivoController.sajatLista - KEZDÉS', { eemberId: req.user?.id });
    try {
      const meghivok = await MeghivoService.sajatMeghivokLekerese(req.user.id);

      res.status(200).json({
        success: true,
        count: meghivok.length,
        meghivok
      });

      console.log('MeghivoController.sajatLista - VÉGE (siker)', { darab: meghivok.length });
    } catch (error) {
      console.error('MeghivoController.sajatLista - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== MEGHÍVÓ VISSZAVONÁSA =====
  // POST /api/meghivo/:id/visszavonas — védett; csak a kibocsátó, csak Aktiv
  async visszavonas(req, res) {
    console.log('MeghivoController.visszavonas - KEZDÉS', { eemberId: req.user?.id, meghivoId: req.params.id });
    try {
      const meghivo = await MeghivoService.meghivoVisszavonasa(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Meghívó visszavonva',
        meghivo
      });

      console.log('MeghivoController.visszavonas - VÉGE (siker)', { id: meghivo._id });
    } catch (error) {
      console.error('MeghivoController.visszavonas - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new MeghivoController();
