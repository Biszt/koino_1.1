// backend/controllers/emberController.js

// ===== IMPORTOK =====
// Service: Üzleti logika kezelése
const EmberService = require('../services/emberService');

// ===== EMBER CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class EmberController {
  
  // ===== REGISZTRÁCIÓ =====
  /**
   * Új ember regisztrálása
   * POST /api/regisztracio
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async regisztracio(req, res) {
    try {
      // === 1. LÉPÉS: Adatok kiolvasása a kérés body-jából ===
      // Frontend küld: { emberNev, email, jelszo, nev, lokacio }
      const adatok = req.body;
      
      // === 2. LÉPÉS: Service hívás - üzleti logika végrehajtása ===
      // Service validál, hash-el, ment adatbázisba
      const ujEmber = await EmberService.regisztracio(adatok);
      
      // === 3. LÉPÉS: Sikeres válasz küldése ===
      // 201 Created - Új erőforrás sikeresen létrehozva
      res.status(201).json({
        success: true,
        message: 'Regisztráció sikeres',
        ember: ujEmber
      });
      
    } catch (error) {
      // === HIBAKEZELÉS ===
      // Ha bármi hiba történik (email foglalt, gyenge jelszó, stb.)
      console.error('Regisztráció hiba:', error);
      
      // 400 Bad Request - Kliens oldali hiba (validációs hiba)
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
  
  // ===== BEJELENTKEZÉS =====
  /**
   * Ember bejelentkeztetése
   * POST /api/bejelentkezes
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async bejelentkezes(req, res) {
    
    try {
      // === 1. LÉPÉS: Email és jelszó kiolvasása ===
      // Frontend küld: { email, jelszo }
      const { email, jelszo } = req.body;
      
      // === 2. LÉPÉS: Ellenőrzés - kötelező mezők ===
      if (!email || !jelszo) {
        return res.status(400).json({
          success: false,
          message: 'Email és jelszó megadása kötelező'
        });
      }
      
      // === 3. LÉPÉS: Service hívás - bejelentkezés végrehajtása ===
      // Service ellenőrzi email + jelszó, generál JWT token-t
      const eredmeny = await EmberService.bejelentkezes(email, jelszo);
      
      // === 4. LÉPÉS: Sikeres válasz küldése ===
      // 200 OK - Sikeres bejelentkezés
      res.status(200).json({
        success: true,
        message: 'Bejelentkezés sikeres',
        ember: eredmeny.ember,
        token: eredmeny.token
      });
      
    } catch (error) {
      // === HIBAKEZELÉS ===
      // Ha hiba történik (rossz email/jelszó)
      console.error('Bejelentkezés hiba:', error);
      
      // 401 Unauthorized - Hibás azonosítás
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }
  
}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new EmberController();
