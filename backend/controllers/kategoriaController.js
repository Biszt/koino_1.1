// backend/controllers/kategoriaController.js

// ===================================
// IMPORTOK
// ===================================
// Service - üzleti logika kezelése
const KategoriaService = require('../services/kategoriaService');

// ===================================
// KATEGÓRIA CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class KategoriaController {

  // =====================================
  // ----- ÚJ KATEGÓRIA LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új kategória létrehozása
   * POST /api/kategoria
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async kategoriaLetrehozasa(req, res) {
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
      // Frontend küldi: nev, leiras, szin, kezdoTudatpont
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
      const ujKategoria = await KategoriaService.kategoriaLetrehozasa(
        adatok, 
        emberId, 
        kezdoTudatpont
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 201 Created - új erőforrás sikeresen létrehozva
      res.status(201).json({
        success: true,
        message: 'Kategória sikeresen létrehozva',
        kategoria: ujKategoria
      });

    } catch (error) {
      // HIBAKEZELÉS - Ha bármi hiba történik
      console.error('Kategória létrehozása hiba:', error);
      
      // 400 Bad Request - Kliens oldali hiba (validációs hiba)
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy kategória lekérése
   * GET /api/kategoria/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async kategoriaLekerese(req, res) {
    try {
      // 1. LÉPÉS - Kategória ID kiolvasása URL paraméterből
      const kategoriaId = req.params.id;

      // 2. LÉPÉS - Service hívás - kategória lekérése
      const kategoria = await KategoriaService.kategoriaLekerese(kategoriaId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        kategoria: kategoria
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Kategória lekérése hiba:', error);

      // 404 Not Found - Ha nem található a kategória
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória lekérése során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIÁK LISTÁZÁSA -----
  // =====================================
  /**
   * Kategóriák listázása szűrőkkel
   * GET /api/kategoria
   * Query paraméterek: letrehozo, nev
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async kategoriakListazasa(req, res) {
    try {
      console.log('===== KATEGÓRIÁK LISTÁZÁSA KEZDŐDIK =====');
      
      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        letrehozo: req.query.letrehozo,
        nev: req.query.nev
      };
      console.log('1. Szűrők:', JSON.stringify(szurok, null, 2));
      
      // 2. LÉPÉS - Service hívás - kategóriák lekérése szűrőkkel
      console.log('2. Service hívás ELŐTT...');
      const kategoriak = await KategoriaService.kategoriaListazasa(szurok);
      console.log('2. Service hívás UTÁN - Kategóriák száma:', kategoriak.length);
      
      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: kategoriak.length,
        kategoriak: kategoriak
      });
      
      console.log('===== KATEGÓRIÁK LISTÁZÁSA VÉGE - SIKER =====');
      
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
        message: 'Szerver hiba történt a kategóriák lekérése során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA ModositasA -----
  // =====================================
  /**
   * Egy kategória módosítása
   * PATCH /api/kategoria/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async kategoriaModositasa(req, res) {
    try {
      // 1. LÉPÉS - Kategória ID kiolvasása URL paraméterből
      const kategoriaId = req.params.id;

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
      const frissitettKategoria = await KategoriaService.kategoriaModositasa(
        kategoriaId,
        frissitesek,
        emberId
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres módosítás
      res.status(200).json({
        success: true,
        message: 'Kategória sikeresen módosítva',
        kategoria: frissitettKategoria
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Kategória módosítása hiba:', error);

      // 404 Not Found - Ha nem található a kategória
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
      if (error.message.includes('kötelező') || error.message.includes('létezik') || error.message.includes('formátum')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória módosítása során'
      });
    }
  }

  // =====================================
  // ----- KATEGÓRIA RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Kategória részletes adatainak lekérése tudatpont adatokkal
   * GET /api/kategoria/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async kategoriaReszleteinekLekerese(req, res) {
    try {
      // 1. LÉPÉS - Kategória ID kiolvasása URL paraméterből
      const kategoriaId = req.params.id;

      // 2. LÉPÉS - Ember ID kiolvasása JWT middleware-ből
      const emberId = req.user?.id;
      
      if (!emberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Service hívás - részletes adatok lekérése
      const reszletek = await KategoriaService.kategoriaReszleteinekLekerese(
        kategoriaId,
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
      console.error('Kategória részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található a kategória
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a kategória részleteinek lekérése során'
      });
    }
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A kategóriák NEM törölhetők direkt API híváson keresztül.
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
module.exports = new KategoriaController();
