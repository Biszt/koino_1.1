// backend/controllers/tartalomTipusController.js

// ===================================
// IMPORTOK
// ===================================
// Service - üzleti logika kezelése
const TartalomTipusService = require('../services/tartalomTipusService');

// ===================================
// TARTALOM TÍPUS CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class TartalomTipusController {

  // =====================================
  // ----- ÚJ TARTALOM TÍPUS LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új tartalom típus létrehozása
   * POST /api/tartalomTipus
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusLetrehozasa(req, res) {
    try {
      // 1. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      // Az authMiddleware már beállította a req.user objektumot
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 2. LÉPÉS - Adatok kiolvasása request body-ból
      // Frontend küldi: nev, leiras, ikon, kezdoTudatpont
      const adatok = req.body;

      // 3. LÉPÉS - Inicialis tudatpont validálása
      // Kötelező paraméter, legalább 1 tudatpont szükséges
      const kezdoTudatpont = adatok.kezdoTudatpont;
      
      if (!kezdoTudatpont) {
        return res.status(400).json({
          success: false,
          message: 'Az kezdoTudatpont megadása kötelező'
        });
      }

      // 4. LÉPÉS - Service hívás - üzleti logika végrehajtása
      // Service validál, tisztít, ment adatbázisba ÉS hozzárendel tudatpontot
      const ujTartalomTipus = await TartalomTipusService.tartalomTipusLetrehozasa(
        adatok, 
        emberId, 
        kezdoTudatpont
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 201 Created - új erőforrás sikeresen létrehozva
      res.status(201).json({
        success: true,
        message: 'Tartalom típus sikeresen létrehozva',
        tartalomTipus: ujTartalomTipus
      });

    } catch (error) {
      // HIBAKEZELÉS - Ha bármi hiba történik
      console.error('Tartalom típus létrehozása hiba:', error);
      
      // 400 Bad Request - Kliens oldali hiba (validációs hiba)
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // =====================================
  // ----- TARTALOM TÍPUS LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy tartalom típus lekérése
   * GET /api/tartalomTipus/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusLekerese(req, res) {
    try {
      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - Service hívás - tartalom típus lekérése
      const tartalomTipus = await TartalomTipusService.tartalomTipusLekerese(tartalomTipusId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        tartalomTipus: tartalomTipus
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom típus lekérése hiba:', error);

      // 404 Not Found - Ha nem található a tartalom típus
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tartalom típus lekérése során'
      });
    }
  }

  // =====================================
  // ----- TARTALOM TÍPUSOK LISTÁZÁSA -----
  // =====================================
  /**
   * Tartalom típusok listázása szűrőkkel
   * GET /api/tartalomTipus
   * Query paraméterek: letrehozo, nev
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusokListazasa(req, res) {
    try {
      console.log('===== TARTALOM TÍPUSOK LISTÁZÁSA KEZDŐDIK =====');
      
      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        letrehozo: req.query.letrehozo,
        nev: req.query.nev
      };
      console.log('1. Szűrők:', JSON.stringify(szurok, null, 2));
      
      // 2. LÉPÉS - Service hívás - tartalom típusok lekérése szűrőkkel
      console.log('2. Service hívás ELŐTT...');
      const tartalomTipusok = await TartalomTipusService.tartalomTipusListazasa(szurok);
      console.log('2. Service hívás UTÁN - Tartalom típusok száma:', tartalomTipusok.length);
      
      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: tartalomTipusok.length,
        tartalomTipusok: tartalomTipusok
      });
      
      console.log('===== TARTALOM TÍPUSOK LISTÁZÁSA VÉGE - SIKER =====');
      
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
        message: 'Szerver hiba történt a tartalom típusok lekérése során'
      });
    }
  }

  // =====================================
  // ----- TARTALOM TÍPUS ModositasA -----
  // =====================================
  /**
   * Egy tartalom típus módosítása
   * PATCH /api/tartalomTipus/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusModositasa(req, res) {
    try {
      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Frissítendő adatok kiolvasása request body-ból
      const frissitesek = req.body;

      // 4. LÉPÉS - Service hívás - módosítás jogosultság ellenőrzéssel
      const frissitettTartalomTipus = await TartalomTipusService.tartalomTipusModositasa(
        tartalomTipusId,
        frissitesek,
        emberId
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres módosítás
      res.status(200).json({
        success: true,
        message: 'Tartalom típus sikeresen módosítva',
        tartalomTipus: frissitettTartalomTipus
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Tartalom típus módosítása hiba:', error);

      // 404 Not Found - Ha nem található a tartalom típus
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
      if (error.message.includes('kötelező') || error.message.includes('létezik') || error.message.includes('üres')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tartalom típus módosítása során'
      });
    }
  }

  // =====================================
  // ----- TARTALOM TÍPUS RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Tartalom típus részletes adatainak lekérése tudatpont adatokkal
   * GET /api/tartalomTipus/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusReszleteinekLekerese(req, res) {
    try {
      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Service hívás - részletes adatok lekérése
      const reszletek = await TartalomTipusService.tartalomTipusReszleteinekLekerese(
        tartalomTipusId,
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
      console.error('Tartalom típus részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található a tartalom típus
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tartalom típus részleteinek lekérése során'
      });
    }
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A tartalom típusok NEM törölhetők direkt API híváson keresztül.
  // 
  // Törlés csak automatikusan történik:
  // 
  // 1. AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden ember visszavonja a tudatpontjait (pontok: 0)
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan törlődik (tudatpontService.js → entitasTorlese0PontNal)
  //
  // 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
  //    - Törlési javaslat indítása
  //    - Közösségi szavazás
  //    - Hatályba lépési idő után automatikus törlés
  //    - Tudatpontok visszautalása a hozzájárulóknak
}

// Controller exportálása
module.exports = new TartalomTipusController();
