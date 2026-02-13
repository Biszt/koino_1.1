// backend/controllers/ertekJavaslatController.js

// ===================================
// SERVICE IMPORTÁLÁSA
// ===================================
const ertekSzamitasService = require('../services/ertekSzamitasService');

// ===================================
// ÉRTÉK ÉRTÉK JAVASLAT CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Felelősség: request/response kezelés, validáció, hibakezelés
class ErtekJavaslatController {

  // ===================================
  // ÉRTÉK JAVASLAT LÉTREHOZÁSA VAGY MÓDOSÍTÁSA
  // ===================================
  
  // ----- EMBERI ÉRTÉK JAVASLAT MENTÉSE -----
  /**
   * POST /api/ertekJavaslat
   * Ember javaslatot ad vagy módosít egy tartalom küszöbértékeihez
   * 
   * Body:
   * {
   *   tartalomId: string,
   *   javaslatElfogadasiKuszob: number (51-100),
   *   reszveteliAranyKuszob: number (0-100),
   *   minimumDontesiIdo: number (0-31536000),
   *   maximumDontesiIdo: number (0-315360000),
   * }
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async ertekJavaslatLetrehozasaVagyModositasa(req, res) {
    try {
      console.log('ertekJavaslatLetrehozasaVagyModositasa endpoint hívás');
      
      // 1. LÉPÉS - EMBER AZONOSÍTÁSA
      // A ember ID-t az auth middleware-ből kapjuk (req.user)
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({ 
          message: 'Authentikáció szükséges' 
        });
      }
      
      console.log('Ember ID:', emberId);
      
      // 2. LÉPÉS - KÉRÉS ADATAINAK KIOLVASÁSA
      const { 
        tartalomId, 
        javaslatElfogadasiKuszob, 
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo,
      } = req.body;
      
      console.log('Kérés adatai:', { 
        tartalomId, 
        javaslatElfogadasiKuszob, 
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo,
      });
      
      // 3. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA
      if (!tartalomId) {
        return res.status(400).json({ 
          message: 'A tartalom ID megadása kötelező' 
        });
      }
      
      if (javaslatElfogadasiKuszob === undefined || javaslatElfogadasiKuszob === null) {
        return res.status(400).json({ 
          message: 'A érték javaslat elfogadási küszöb megadása kötelező' 
        });
      }
      
      if (reszveteliAranyKuszob === undefined || reszveteliAranyKuszob === null) {
        return res.status(400).json({ 
          message: 'A részvételi arány küszöb megadása kötelező' 
        });
      }

      if (minimumDontesiIdo === undefined || minimumDontesiIdo === null) {
        return res.status(400).json({ 
          message: 'A minimum döntési idő megadása kötelező' 
        });
      }

      if (maximumDontesiIdo === undefined || maximumDontesiIdo === null) {
        return res.status(400).json({ 
          message: 'A maximum döntési idő megadása kötelező' 
        });
      }
      
      // 4. LÉPÉS - TÍPUS VALIDÁLÁSA
      if (typeof javaslatElfogadasiKuszob !== 'number' || isNaN(javaslatElfogadasiKuszob)) {
        return res.status(400).json({ 
          message: 'A érték javaslat elfogadási küszöbnek számnak kell lennie' 
        });
      }
      
      if (typeof reszveteliAranyKuszob !== 'number' || isNaN(reszveteliAranyKuszob)) {
        return res.status(400).json({ 
          message: 'A részvételi arány küszöbnek számnak kell lennie' 
        });
      }

      if (typeof minimumDontesiIdo !== 'number' || isNaN(minimumDontesiIdo)) {
        return res.status(400).json({ 
          message: 'A minimum döntési időnek számnak kell lennie' 
        });
      }

      if (typeof maximumDontesiIdo !== 'number' || isNaN(maximumDontesiIdo)) {
        return res.status(400).json({ 
          message: 'A maximum döntési időnek számnak kell lennie' 
        });
      }
      
      // 5. LÉPÉS - SERVICE HÍVÁS
      // A service végzi el a tudatpont ellenőrzést, validációt és mentést
      const eredmeny = await ertekSzamitasService.ertekJavaslatLetrehozasaVagyModositasa(
        emberId,
        tartalomId,
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo,
      );
      
      // 6. LÉPÉS - SIKERES VÁLASZ
      console.log('Érték javaslat sikeres mentése');
      
      res.status(200).json({
        message: 'Érték javaslat sikeresen mentve',
        ertekJavaslat: {
          javaslatElfogadasiKuszob: eredmeny.ertekJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: eredmeny.ertekJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: eredmeny.ertekJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: eredmeny.ertekJavaslat.maximumDontesiIdo,
          letrehozva: eredmeny.ertekJavaslat.letrehozva,
          modositva: eredmeny.ertekJavaslat.modositva
        },
        aktualisErtekek: eredmeny.hisztogram
      });
      
    } catch (error) {
      // HIBAKEZELÉS
      console.error('Érték javaslat létrehozási/módosítási hiba:', error.message);
      
      // Különböző hibakódok különböző hibatípusokhoz
      if (error.message.includes('tudatpont')) {
        // Tudatpont hiány - 403 Forbidden
        return res.status(403).json({ 
          message: error.message 
        });
      } else if (error.message.includes('küszöb') || 
                 error.message.includes('egész szám') ||
                 error.message.includes('döntési idő')) {
        // Validációs hiba - 400 Bad Request
        return res.status(400).json({ 
          message: error.message 
        });
      } else if (error.message.includes('nem található')) {
        // Nem található - 404 Not Found
        return res.status(404).json({ 
          message: error.message 
        });
      } else {
        // Általános szerverhiba - 500 Internal Server Error
        return res.status(500).json({ 
          message: 'Szerverhiba a érték javaslat mentésekor',
          hiba: error.message 
        });
      }
    }
  }

  // ===================================
  // AKTUÁLIS ÉRTÉKEK LEKÉRÉSE
  // ===================================
  
  // ----- TARTALOM AKTUÁLIS KÜSZÖBÉRTÉKEI -----
  /**
   * GET /api/ertekJavaslat/aktualis/:tartalomId
   * Egy tartalom aktuális (medián alapú) küszöbértékeinek lekérése
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async aktualisErtekekLekerese(req, res) {
    try {
      console.log('aktualisErtekekLekerese endpoint hívás');
      
      // 1. LÉPÉS - TARTALOM ID KIOLVASÁSA
      const { tartalomId } = req.params;
      
      console.log('Tartalom ID:', tartalomId);
      
      // 2. LÉPÉS - VALIDÁLÁS
      if (!tartalomId) {
        return res.status(400).json({ 
          message: 'A tartalom ID megadása kötelező' 
        });
      }
      
      // 3. LÉPÉS - SERVICE HÍVÁS
      const aktualisErtekek = await ertekSzamitasService.aktulisErtekekLekerese(tartalomId);
      
      // 4. LÉPÉS - SIKERES VÁLASZ
      console.log('Aktuális értékek lekérve');
      
      res.status(200).json({
        tartalomId: tartalomId,
        javaslatElfogadasiKuszob: aktualisErtekek.javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: aktualisErtekek.reszveteliAranyKuszob,
        aktualMinimumDontesiIdo: aktualisErtekek.aktualMinimumDontesiIdo,
        aktualMaximumDontesiIdo: aktualisErtekek.aktualMaximumDontesiIdo,
        osszesJavaslat: aktualisErtekek.osszesJavaslat,
        utolsoFrissites: aktualisErtekek.utolsoFrissites
      });
      
    } catch (error) {
      // HIBAKEZELÉS
      console.error('Aktuális értékek lekérési hiba:', error.message);
      
      if (error.message.includes('nem található')) {
        // Nem található - 404 Not Found
        return res.status(404).json({ 
          message: error.message 
        });
      } else {
        // Általános szerverhiba - 500 Internal Server Error
        return res.status(500).json({ 
          message: 'Szerverhiba az aktuális értékek lekérésekor',
          hiba: error.message 
        });
      }
    }
  }

  // ===================================
  // EMBER SAJÁT ÉRTÉK JAVASLATA
  // ===================================
  
  // ----- EMBER JAVASLATÁNAK LEKÉRÉSE -----
  /**
   * GET /api/ertekJavaslat/sajat/:tartalomId
   * A bejelentkezett ember saját javaslatának lekérése egy tartalomhoz
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async sajatErtekJavaslatLekerese(req, res) {
    try {
      console.log('sajatErtekJavaslatLekerese endpoint hívás');
      
      // 1. LÉPÉS - EMBER AZONOSÍTÁSA
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({ 
          message: 'Authentikáció szükséges' 
        });
      }
      
      console.log('Ember ID:', emberId);
      
      // 2. LÉPÉS - TARTALOM ID KIOLVASÁSA
      const { tartalomId } = req.params;
      
      console.log('Tartalom ID:', tartalomId);
      
      // 3. LÉPÉS - VALIDÁLÁS
      if (!tartalomId) {
        return res.status(400).json({ 
          message: 'A tartalom ID megadása kötelező' 
        });
      }
      
      // 4. LÉPÉS - SERVICE HÍVÁS
      const ertekJavaslat = await ertekSzamitasService.emberErtekJavaslatanakLekerese(
        emberId,
        tartalomId
      );
      
      // 5. LÉPÉS - VÁLASZ
      if (!ertekJavaslat) {
        // Nincs érték javaslat - 404 Not Found
        console.log('Nincs érték javaslat ehhez a tartalomhoz');
        
        return res.status(404).json({ 
          message: 'Nincs javaslatod ehhez a tartalomhoz',
          vanJavaslat: false
        });
      }
      
      // Van érték javaslat - 200 OK
      console.log('Érték javaslat lekérve');
      
      res.status(200).json({
        vanJavaslat: true,
        ertekJavaslat: {
          javaslatElfogadasiKuszob: ertekJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: ertekJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: ertekJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: ertekJavaslat.maximumDontesiIdo,
          letrehozva: ertekJavaslat.letrehozva,
          modositva: ertekJavaslat.modositva
        }
      });
      
    } catch (error) {
      // HIBAKEZELÉS
      console.error('Saját érték javaslat lekérési hiba:', error.message);
      
      // Általános szerverhiba - 500 Internal Server Error
      return res.status(500).json({ 
        message: 'Szerverhiba a érték javaslat lekérésekor',
        hiba: error.message 
      });
    }
  }

  // ===================================
  // TARTALOM RÉSZLETES ADATAI ÉRTÉKEKKEL
  // ===================================
  
  // ----- TARTALOM + AKTUÁLIS ÉRTÉKEK + EMBER ÉRTÉK JAVASLATA -----
  /**
   * GET /api/ertekJavaslat/reszletek/:tartalomId
   * Egy tartalom aktuális értékei + a ember saját javaslata (ha van)
   * 
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomErtekReszletei(req, res) {
    try {
      console.log('tartalomErtekReszletei endpoint hívás');
      
      // 1. LÉPÉS - EMBER AZONOSÍTÁSA (opcionális)
      const emberId = req.user?.id || null; 
      
      console.log('Ember ID:', emberId || 'vendég');
      
      // 2. LÉPÉS - TARTALOM ID KIOLVASÁSA
      const { tartalomId } = req.params;
      
      console.log('Tartalom ID:', tartalomId);
      
      // 3. LÉPÉS - VALIDÁLÁS
      if (!tartalomId) {
        return res.status(400).json({ 
          message: 'A tartalom ID megadása kötelező' 
        });
      }
      
      // 4. LÉPÉS - AKTUÁLIS ÉRTÉKEK LEKÉRÉSE
      const aktualisErtekek = await ertekSzamitasService.aktulisErtekekLekerese(tartalomId);
      
      // 5. LÉPÉS - EMBER JAVASLATÁNAK LEKÉRÉSE (ha be van jelentkezve)
      let emberJavaslat = null;
      
      if (emberId) {
        emberJavaslat = await ertekSzamitasService.emberErtekJavaslatanakLekerese(
          emberId,
          tartalomId
        );
      }
      
      // 6. LÉPÉS - ÖSSZESÍTETT VÁLASZ
      console.log('Részletek lekérve');
      
      res.status(200).json({
        tartalomId: tartalomId,
        aktualisErtekek: {
          javaslatElfogadasiKuszob: aktualisErtekek.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: aktualisErtekek.reszveteliAranyKuszob,
          aktualMinimumDontesiIdo: aktualisErtekek.aktualMinimumDontesiIdo,
          aktualMaximumDontesiIdo: aktualisErtekek.aktualMaximumDontesiIdo,
          osszesJavaslat: aktualisErtekek.osszesJavaslat,
          utolsoFrissites: aktualisErtekek.utolsoFrissites
        },
        emberJavaslat: emberJavaslat ? {
          javaslatElfogadasiKuszob: emberJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: emberJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: emberJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: emberJavaslat.maximumDontesiIdo,
          letrehozva: emberJavaslat.letrehozva,
          modositva: emberJavaslat.modositva
        } : null
      });
      
    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom érték részletek lekérési hiba:', error.message);
      
      if (error.message.includes('nem található')) {
        // Nem található - 404 Not Found
        return res.status(404).json({ 
          message: error.message 
        });
      } else {
        // Általános szerverhiba - 500 Internal Server Error
        return res.status(500).json({ 
          message: 'Szerverhiba a részletek lekérésekor',
          hiba: error.message 
        });
      }
    }
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Controller osztály SINGLETON példány exportálása
module.exports = new ErtekJavaslatController();
