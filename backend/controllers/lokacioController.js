// backend/controllers/lokacioController.js

// ===== SERVICE IMPORTÁLÁSA =====
const LokacioService = require('../services/lokacioService');

// ===== LOKÁCIÓ CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
class LokacioController {
  
  // ----- ORSZÁG JAVASLATOK VÉGPONT -----
  /**
   * GET /api/lokacio/orszag?kereses=xyz
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async getOrszagJavaslatok(req, res) {
    try {
      // Keresési szöveg lekérése a query paraméterből
      const keresesiSzoveg = req.query.kereses || '';
      
      // Service hívás
      const javaslatok = await LokacioService.getOrszagJavaslatok(keresesiSzoveg);
      
      // Sikeres válasz küldése
      res.status(200).json(javaslatok);
      
    } catch (error) {
      // Hiba esetén 500-as státuszkód
      console.error('Ország javaslatok lekérési hiba:', error);
      res.status(500).json({ message: 'Szerverhiba az ország javaslatok lekérésekor' });
    }
  }
  
  // ----- RÉGIÓ JAVASLATOK VÉGPONT -----
  /**
   * GET /api/lokacio/regio?kereses=xyz
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async getRegioJavaslatok(req, res) {
    try {
      // Keresési szöveg lekérése a query paraméterből
      const keresesiSzoveg = req.query.kereses || '';
      
      // Service hívás
      const javaslatok = await LokacioService.getRegioJavaslatok(keresesiSzoveg);
      
      // Sikeres válasz küldése
      res.status(200).json(javaslatok);
      
    } catch (error) {
      // Hiba esetén 500-as státuszkód
      console.error('Régió javaslatok lekérési hiba:', error);
      res.status(500).json({ message: 'Szerverhiba a régió javaslatok lekérésekor' });
    }
  }
  
  // ----- TELEPÜLÉS JAVASLATOK VÉGPONT -----
  /**
   * GET /api/lokacio/telepules?kereses=xyz
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async getTelepulesJavaslatok(req, res) {
    try {
      // Keresési szöveg lekérése a query paraméterből
      const keresesiSzoveg = req.query.kereses || '';
      
      // Service hívás
      const javaslatok = await LokacioService.getTelepulesJavaslatok(keresesiSzoveg);
      
      // Sikeres válasz küldése
      res.status(200).json(javaslatok);
      
    } catch (error) {
      // Hiba esetén 500-as státuszkód
      console.error('Település javaslatok lekérési hiba:', error);
      res.status(500).json({ message: 'Szerverhiba a település javaslatok lekérésekor' });
    }
  }
}

// Controller exportálása
module.exports = new LokacioController();
