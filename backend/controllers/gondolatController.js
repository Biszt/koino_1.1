// backend/controllers/gondolatController.js

// ===================================
// IMPORTOK
// ===================================
// Service - üzleti logika kezelése
const GondolatService = require('../services/gondolatService');

// ===================================
// GONDOLAT CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class GondolatController {

  /**
   * ----- ÚJ GONDOLAT LÉTREHOZÁSA -----
   * MÓDOSÍTVA: szuloId + szuloTipus fogadása request-ben
   * Új gondolat létrehozása
   * POST /api/gondolat
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatLetrehozasa(req, res) {
    try {
      // 1. LÉPÉS - eEmber ID kiolvassa JWT middleware-ből
      // Az authMiddleware már beállította a req.user objektumot
      const eemberId = req.user?.id;
      
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }
      
      // 2. LÉPÉS - Adatok kiolvassa request body-ből
      // MÓDOSÍTVA: Frontend küldi szuloId-t és szuloTipus-t is
      // {
      //   cim: string,
      //   szoveg: string,
      //   gondolatTipusId: ObjectId,
      //   kategoriaIds: [ObjectId],
      //   szuloId: ObjectId,           // ← ÚJ
      //   szuloTipus: string,          // ← ÚJ ('Gondolat', 'Javaslat', 'Egyezmeny')
      //   kezdoTudatpont: number
      // }
      const adatok = req.body;
      
      // 3. LÉPÉS - Inicialis tudatpont validálása
      // Kötelező paraméter, legalább 1 tudatpont szükséges
      const kezdoTudatpont = adatok.kezdoTudatpont;
      
      if (!kezdoTudatpont) {
        return res.status(400).json({
          success: false,
          message: 'A kezdoTudatpont megadása kötelező'
        });
      }
      
      // 4. LÉPÉS - Service hívás - üzleti logika végrehajtása
      // Service validál, tisztít, ment adatbázisba
      // ÉS hozzárendel tudatpontot
      // Service ellenőrzi a kategoriaIds tömb validitását (max 3, léteznek-e, duplikáció)
      // Service ellenőrzi a szuloId + szuloTipus konzisztenciát
      const ujGondolat = await GondolatService.gondolatLetrehozasa(
        adatok,           // ← Tartalmazza: szuloId, szuloTipus
        eemberId,
        kezdoTudatpont
      );
      
      // 5. LÉPÉS - Sikeres válasz küldése
      // 201 Created - Új erőforrás sikeresen létrehozva
      res.status(201).json({
        success: true,
        message: 'Gondolat sikeresen létrehozva',
        gondolat: ujGondolat
      });
      
    } catch (error) {
      // HIBAKEZELÉS - Ha bármi hiba történik
      console.error('Gondolat létrehozása hiba:', error);
      
      // 400 Bad Request - Kliens oldali hiba (validációs hiba)
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }


  // =====================================
  // ----- GONDOLAT LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy gondolat lekérése
   * GET /api/gondolat/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatLekerese(req, res) {
    try {
      // 1. LÉPÉS - Gondolat ID kiolvasása URL paraméterből
      const gondolatId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből (opcionális)
      const eemberId = req.user?.id || null;

      // 3. LÉPÉS - Service hívás - gondolat lekérése jogosultság ellenőrzéssel
      const gondolat = await GondolatService.gondolatLekerese(gondolatId, eemberId);

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        gondolat: gondolat
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Gondolat lekérése hiba:', error);

      // 404 Not Found - Ha nem található a gondolat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 403 Forbidden - Ha nincs jogosultság
      if (error.message.includes('jogosultság')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat lekérése során'
      });
    }
  }

  // =====================================
  // ----- GONDOLATOK LISTÁZÁSA -----
  // =====================================
  /**
   * Gondolatok listázása szűrőkkel
   * GET /api/gondolat
   * Query paraméterek: gondolatTipusId, szuloId, kategoriaId
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatokListazasa(req, res) {
    try {
        console.log('===== GONDOLATOK LISTÁZÁSA KEZDŐDIK =====');
        
        // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
        const szurok = {
            gondolatTipusId: req.query.gondolatTipusId,
            szuloId: req.query.szuloId,
            kategoriaId: req.query.kategoriaId // EGY kategória ID szűréshez (bármelyik a 3 közül)
        };
        console.log('1. Szűrők:', JSON.stringify(szurok, null, 2));
        
        // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből (opcionális)
        const eemberId = req.user?.id || null;
        console.log('2. eEmber ID:', eemberId);
        
        // 3. LÉPÉS - Service hívás - gondolatok lekérése szűrőkkel
        console.log('3. Service hívás ELŐTT...');
        const gondolatok = await GondolatService.gondolatListazasa(szurok, eemberId);
        console.log('3. Service hívás UTÁN - Gondolatok száma:', gondolatok.length);
        
        // 4. LÉPÉS - Sikeres válasz küldése
        // 200 OK - Sikeres lekérés
        res.status(200).json({
            success: true,
            count: gondolatok.length,
            gondolatok: gondolatok
        });
        
        console.log('===== GONDOLATOK LISTÁZÁSA VÉGE - SIKER =====');
        
    } catch (error) {
        // HIBAKEZELÉS
        console.error('===== HIBA TÖRTÉNT =====');
        console.error('Hiba típusa:', error.name);
        console.error('Hiba üzenete:', error.message);
        console.error('Teljes stack trace:', error.stack);
        console.error('========================');
        
        // 500 Internal Server Error
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt a gondolatok lekérése során'
        });
    }
  }

  // =====================================
  // ----- GONDOLAT ModositasA -----
  // =====================================
  /**
   * Egy gondolat módosítása
   * PATCH /api/gondolat/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatModositasa(req, res) {
    try {
      // 1. LÉPÉS - Gondolat ID kiolvasása URL paraméterből
      const gondolatId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;
      
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Frissítendő adatok kiolvasása request body-ból
      // MÓDOSÍTVA: kategoriaIds is módosítható (tömb)
      const frissitesek = req.body;

      // 4. LÉPÉS - Service hívás - módosítás jogosultság ellenőrzéssel
      // Service validálja a kategoriaIds tömböt (max 3, léteznek-e, duplikáció)
      const frissitettGondolat = await GondolatService.gondolatModositasa(
        gondolatId,
        frissitesek,
        eemberId
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres módosítás
      res.status(200).json({
        success: true,
        message: 'Gondolat sikeresen módosítva',
        gondolat: frissitettGondolat
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Gondolat módosítása hiba:', error);

      // 404 Not Found - Ha nem található a gondolat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 403 Forbidden - Ha nincs jogosultság
      if (error.message.includes('jogosultság')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      // 400 Bad Request - Validációs hiba
      if (error.message.includes('kötelező') || 
          error.message.includes('érvénytelen') ||
          error.message.includes('Maximum') ||
          error.message.includes('kategória')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat módosítása során'
      });
    }
  }

  // =====================================
  // ----- GONDOLAT RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Gondolat részletes adatainak lekérése tudatpont adatokkal
   * GET /api/gondolat/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatReszleteinekLekerese(req, res) {
    try {
      // 1. LÉPÉS - Gondolat ID kiolvasása URL paraméterből
      const gondolatId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id || null;

      // 3. LÉPÉS - Service hívás - részletes adatok lekérése
      const reszletek = await GondolatService.gondolatReszleteinekLekerese(
        gondolatId,
        eemberId
      );

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: reszletek
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Gondolat részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található a gondolat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 403 Forbidden - Ha nincs jogosultság
      if (error.message.includes('jogosultság')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat részleteinek lekérése során'
      });
    }
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A gondolatok NEM törölhetők direkt API híváson keresztül.
  // 
  // Törlés csak automatikusan történik:
  // 
  //  AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden eember, vagy eggyezmény visszavonja a tudatpontjait (pontok: 0)
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan törlődik (tudatpontService.js → entitasTorlese0PontNal)
}

// Controller exportálása
module.exports = new GondolatController();
