// backend/controllers/tartalomController.js

// ===================================
// IMPORTOK
// ===================================
// Service - üzleti logika kezelése
const TartalomService = require('../services/tartalomService');

// ===================================
// TARTALOM CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class TartalomController {

  /**
   * ----- ÚJ TARTALOM LÉTREHOZÁSA -----
   * MÓDOSÍTVA: szuloId + szuloTipus fogadása request-ben
   * Új tartalom létrehozása
   * POST /api/tartalom
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomLetrehozasa(req, res) {
    try {
      // 1. LÉPÉS - Ember ID kiolvassa JWT middleware-ből
      // Az authMiddleware már beállította a req.user objektumot
      const emberId = req.user?.id;
      
      if (!emberId) {
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
      //   tartalomTipusId: ObjectId,
      //   kategoriaIds: [ObjectId],
      //   szuloId: ObjectId,           // ← ÚJ
      //   szuloTipus: string,          // ← ÚJ ('Tartalom', 'Javaslat', 'Egyezmeny')
      //   statusz: string,
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
      const ujTartalom = await TartalomService.tartalomLetrehozasa(
        adatok,           // ← Tartalmazza: szuloId, szuloTipus
        emberId,
        kezdoTudatpont
      );
      
      // 5. LÉPÉS - Sikeres válasz küldése
      // 201 Created - Új erőforrás sikeresen létrehozva
      res.status(201).json({
        success: true,
        message: 'Tartalom sikeresen létrehozva',
        tartalom: ujTartalom
      });
      
    } catch (error) {
      // HIBAKEZELÉS - Ha bármi hiba történik
      console.error('Tartalom létrehozása hiba:', error);
      
      // 400 Bad Request - Kliens oldali hiba (validációs hiba)
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }


  // =====================================
  // ----- TARTALOM LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy tartalom lekérése
   * GET /api/tartalom/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomLekerese(req, res) {
    try {
      // 1. LÉPÉS - Tartalom ID kiolvasása URL paraméterből
      const tartalomId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből (opcionális)
      const emberId = req.user?.id || null;

      // 3. LÉPÉS - Service hívás - tartalom lekérése jogosultság ellenőrzéssel
      const tartalom = await TartalomService.tartalomLekerese(tartalomId, emberId);

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        tartalom: tartalom
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom lekérése hiba:', error);

      // 404 Not Found - Ha nem található a tartalom
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
        message: 'Szerver hiba történt a tartalom lekérése során'
      });
    }
  }

  // =====================================
  // ----- TARTALMAK LISTÁZÁSA -----
  // =====================================
  /**
   * Tartalmak listázása szűrőkkel
   * GET /api/tartalom
   * Query paraméterek: tartalomTipusId, szuloId, kategoriaId, statusz
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomokListazasa(req, res) {
    try {
        console.log('===== TARTALMAK LISTÁZÁSA KEZDŐDIK =====');
        
        // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
        const szurok = {
            tartalomTipusId: req.query.tartalomTipusId,
            szuloId: req.query.szuloId,
            kategoriaId: req.query.kategoriaId, // EGY kategória ID szűréshez (bármelyik a 3 közül)
            statusz: req.query.statusz
        };
        console.log('1. Szűrők:', JSON.stringify(szurok, null, 2));
        
        // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből (opcionális)
        const emberId = req.user?.id || null;
        console.log('2. Ember ID:', emberId);
        
        // 3. LÉPÉS - Service hívás - tartalmak lekérése szűrőkkel
        console.log('3. Service hívás ELŐTT...');
        const tartalmak = await TartalomService.tartalomListazasa(szurok, emberId);
        console.log('3. Service hívás UTÁN - Tartalmak száma:', tartalmak.length);
        
        // 4. LÉPÉS - Sikeres válasz küldése
        // 200 OK - Sikeres lekérés
        res.status(200).json({
            success: true,
            count: tartalmak.length,
            tartalmak: tartalmak
        });
        
        console.log('===== TARTALMAK LISTÁZÁSA VÉGE - SIKER =====');
        
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
            message: 'Szerver hiba történt a tartalmak lekérése során'
        });
    }
  }

  // =====================================
  // ----- TARTALOM ModositasA -----
  // =====================================
  /**
   * Egy tartalom módosítása
   * PATCH /api/tartalom/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomModositasa(req, res) {
    try {
      // 1. LÉPÉS - Tartalom ID kiolvasása URL paraméterből
      const tartalomId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      const emberId = req.user?.id;
      
      if (!emberId) {
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
      const frissitettTartalom = await TartalomService.tartalomModositasa(
        tartalomId,
        frissitesek,
        emberId
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres módosítás
      res.status(200).json({
        success: true,
        message: 'Tartalom sikeresen módosítva',
        tartalom: frissitettTartalom
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom módosítása hiba:', error);

      // 404 Not Found - Ha nem található a tartalom
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
        message: 'Szerver hiba történt a tartalom módosítása során'
      });
    }
  }

  // =====================================
  // ----- TARTALOM RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Tartalom részletes adatainak lekérése tudatpont adatokkal
   * GET /api/tartalom/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomReszleteinekLekerese(req, res) {
    try {
      // 1. LÉPÉS - Tartalom ID kiolvasása URL paraméterből
      const tartalomId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      const emberId = req.user?.id || null;

      // 3. LÉPÉS - Service hívás - részletes adatok lekérése
      const reszletek = await TartalomService.tartalomReszleteinekLekerese(
        tartalomId,
        emberId
      );

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: reszletek
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található a tartalom
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
        message: 'Szerver hiba történt a tartalom részleteinek lekérése során'
      });
    }
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A tartalmak NEM törölhetők direkt API híváson keresztül.
  // 
  // Törlés csak automatikusan történik:
  // 
  //  AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden ember, vagy eggyezmény visszavonja a tudatpontjait (pontok: 0)
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan törlődik (tudatpontService.js → entitasTorlese0PontNal)
}

// Controller exportálása
module.exports = new TartalomController();
