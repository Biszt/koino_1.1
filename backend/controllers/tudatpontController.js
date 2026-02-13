// backend/controllers/tudatpontController.js

// ===== IMPORTOK =====
// Service - üzleti logika kezelése
const TudatpontService = require('../services/tudatpontService');

// ===== TUDATPONT CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class TudatpontController {

  // ============================================================
  // TUDATPONTOK HOZZÁRENDELÉSE
  // ============================================================

  // ----- TUDATPONTOK HOZZÁRENDELÉSE ENTITÁSHOZ -----
  // Tudatpontok hozzárendelése egy entitáshoz (POST kérés)
  // Endpoint: POST /api/tudatpont/hozzarendeles
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async tudatpontHozzarendelese(req, res) {
    try {
      
      // 1. LÉPÉS - Ember ID kiolvasása JWT token-ből
      // Az authMiddleware már dekódolta a token-t és req.user-be helyezte
      const emberId = req.user.id;

      // 2. LÉPÉS - Adatok kiolvasása request body-ból
      // Frontend küldi: { entitasId, entitasTipus, pontok }
      const { entitasId, entitasTipus, pontok } = req.body;

      // 3. LÉPÉS - Kötelező mezők validálása
      if (!entitasId || !entitasTipus || pontok === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező mezők: entitasId, entitasTipus, pontok'
        });
      }

      // 4. LÉPÉS - Pontok típusának validálása
      if (typeof pontok !== 'number' || isNaN(pontok)) {
        return res.status(400).json({
          success: false,
          message: 'A pontok értékének számnak kell lennie'
        });
      }

      // 5. LÉPÉS - Negatív pontok ellenőrzése
      if (pontok < 0) {
        return res.status(400).json({
          success: false,
          message: 'A tudatpontok nem lehetnek negatívak'
        });
      }

      // 6. LÉPÉS - Service hívás - üzleti logika végrehajtása
      // Service validál, számol, ment adatbázisba (transaction-nel)
      const eredmeny = await TudatpontService.tudatpontHozzarendelese(
        emberId,
        entitasId,
        entitasTipus,
        pontok
      );

      // 7. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres művelet
      res.status(200).json({
        success: true,
        message: 'Tudatpontok sikeresen hozzárendelve',
        data: eredmeny
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      // Ha bármi hiba történik
      console.error('Hiba a tudatpontok hozzárendelése során:', error);

      // 400 Bad Request - Kliens oldali hiba (pl. nincs elég tudatpont)
      if (error.message === 'Nincs elég tudatpont a művelet végrehajtásához') {
        return res.status(400).json({
          success: false,
          message: 'Nincs elég tudatpont a művelet végrehajtásához'
        });
      }

      // 404 Not Found - Ha nem található az entitás vagy ember
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tudatpontok hozzárendelése során',
        error: error.message
      });
    }
  }

  // ============================================================
  // ENTITÁS ALLOKÁCIÓJÁNAK LEKÉRÉSE
  // ============================================================

  // ----- ENTITÁSHOZ TARTOZÓ TUDATPONT ADATOK LEKÉRÉSE -----
  // Egy entitás tudatpont allokációjának lekérése (GET kérés)
  // Endpoint: GET /api/tudatpont/entitas/:entitasTipus/:entitasId
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async entitasAllokaciLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - Entitás azonosítók kiolvasása URL paraméterekből
      const { entitasTipus, entitasId } = req.params;

      // 2. LÉPÉS - Ember ID kiolvasása JWT token-ből (opcionális)
      // Ha be van jelentkezve, megkapjuk a ember hozzájárulását is
      const emberId = req.user ? req.user.id : null;

      // 3. LÉPÉS - Paraméterek validálása
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező paraméterek: entitasId, entitasTipus'
        });
      }

      // 4. LÉPÉS - Service hívás - allokáció lekérése
      const allokacio = await TudatpontService.entitasAllokaciLekerese(
        entitasId,
        entitasTipus,
        emberId
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: allokacio
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba az entitás allokációjának lekérése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tudatpont adatok lekérése során',
        error: error.message
      });
    }
  }

  // ============================================================
  // EMBER HOZZÁRENDELÉSEINEK LEKÉRÉSE
  // ============================================================

  // ----- BEJELENTKEZETT EMBER HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
  // Bejelentkezett ember tudatpont hozzárendeléseinek lekérése (GET kérés)
  // Endpoint: GET /api/tudatpont/hozzarendelesek?limit=20&skip=0
  // Query paraméterek: limit, skip (lapozás)
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async emberHozzarendeleseinekLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - Ember ID kiolvasása JWT token-ből
      const emberId = req.user.id;

      // 2. LÉPÉS - Lapozási paraméterek kiolvasása query-ből
      const limit = parseInt(req.query.limit) || 20;   // Alapértelmezett: 20
      const skip = parseInt(req.query.skip) || 0;      // Alapértelmezett: 0

      // 3. LÉPÉS - Limit validálása (max 100)
      const validLimit = Math.min(limit, 100);

      // 4. LÉPÉS - Service hívás - hozzárendelések lekérése
      const hozzarendelesek = await TudatpontService.emberHozzarendeleseinekLekerese(
        emberId,
        validLimit,
        skip
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: hozzarendelesek.length,
        data: hozzarendelesek
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba a hozzárendelések lekérése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a hozzárendelések lekérése során',
        error: error.message
      });
    }
  }

  // ----- BEJELENTKEZETT EMBER AKTÍV HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
  // Csak azok a hozzárendelések, ahol tudatPontok > 0 (GET kérés)
  // Endpoint: GET /api/tudatpont/aktiv-hozzarendelesek?limit=20&skip=0
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async emberAktivHozzarendeleseinekLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - Ember ID kiolvasása JWT token-ből
      const emberId = req.user.id;

      // 2. LÉPÉS - Lapozási paraméterek kiolvasása query-ből
      const limit = parseInt(req.query.limit) || 20;   // Alapértelmezett: 20
      const skip = parseInt(req.query.skip) || 0;      // Alapértelmezett: 0

      // 3. LÉPÉS - Limit validálása (max 100)
      const validLimit = Math.min(limit, 100);

      // 4. LÉPÉS - Service hívás - aktív hozzárendelések lekérése
      const hozzarendelesek = await TudatpontService.emberAktivHozzarendeleseinekLekerese(
        emberId,
        validLimit,
        skip
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: hozzarendelesek.length,
        data: hozzarendelesek
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba az aktív hozzárendelések lekérése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt az aktív hozzárendelések lekérése során',
        error: error.message
      });
    }
  }

  // ============================================================
  // ENTITÁS HOZZÁJÁRULÓINAK LEKÉRÉSE
  // ============================================================

  // ----- ENTITÁS HOZZÁJÁRULÓINAK LEKÉRÉSE -----
  // Egy entitás tudatpont hozzájárulóinak lekérése (GET kérés)
  // Endpoint: GET /api/tudatpont/hozzajarulok/:entitasTipus/:entitasId?limit=100&skip=0
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async entitasHozzajaruloinakLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - Entitás azonosítók kiolvasása URL paraméterekből
      const { entitasTipus, entitasId } = req.params;

      // 2. LÉPÉS - Lapozási paraméterek kiolvasása query-ből
      const limit = parseInt(req.query.limit) || 100;  // Alapértelmezett: 100
      const skip = parseInt(req.query.skip) || 0;      // Alapértelmezett: 0

      // 3. LÉPÉS - Paraméterek validálása
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező paraméterek: entitasId, entitasTipus'
        });
      }

      // 4. LÉPÉS - Limit validálása (max 200)
      const validLimit = Math.min(limit, 200);

      // 5. LÉPÉS - Service hívás - hozzájárulók lekérése
      const hozzajarulok = await TudatpontService.entitasHozzajaruloinakLekerese(
        entitasId,
        entitasTipus,
        validLimit,
        skip
      );

      // 6. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: hozzajarulok.length,
        data: hozzajarulok
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba a hozzájárulók lekérése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a hozzájárulók lekérése során',
        error: error.message
      });
    }
  }

  // ============================================================
  // TUDATPONTOK VISSZAOSZTÁSA (ADMIN/SYSTEM MŰVELET)
  // ============================================================

  // ----- TUDATPONTOK VISSZAOSZTÁSA -----
  // Egy entitás összes tudatpontjának visszaosztása a hozzájárulóknak (POST kérés)
  // Endpoint: POST /api/tudatpont/visszaosztas
  // Használat: entitás törléskor (pl. moderátor törli a tartalmat)
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async tudatpontokVisszaosztasa(req, res) {
    try {
      
      // 1. LÉPÉS - Adatok kiolvasása request body-ból
      const { entitasId, entitasTipus } = req.body;

      // 2. LÉPÉS - Kötelező mezők validálása
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező mezők: entitasId, entitasTipus'
        });
      }

      // 3. LÉPÉS - Service hívás - tudatpontok visszaosztása
      const eredmeny = await TudatpontService.tudatpontokVisszaosztasa(
        entitasId,
        entitasTipus
      );

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres visszaosztás
      res.status(200).json({
        success: true,
        message: `${eredmeny.visszaosztottPontok} tudatpont visszaosztva ${eredmeny.emberekSzama} embernak`,
        data: eredmeny
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba a tudatpontok visszaosztása során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tudatpontok visszaosztása során',
        error: error.message
      });
    }
  }

  // ============================================================
  // JAVASLAT RENDSZERHEZ SZÜKSÉGES VÉGPONTOK
  // ============================================================

  // ----- EMBER HOZZÁJÁRULÁSÁNAK ELLENŐRZÉSE ENTITÁSON -----
  // Ellenőrzi, hogy egy ember rendelkezik-e tudatponttal egy entitáson (GET kérés)
  // Endpoint: GET /api/tudatpont/jogosultsag/:entitasTipus/:entitasId
  // Használat: szavazási jogosultság ellenőrzéséhez (javaslat rendszer)
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async emberJogosultsagEllenorzes(req, res) {
    try {
      
      // 1. LÉPÉS - Ember ID kiolvasása JWT token-ből
      const emberId = req.user.id;

      // 2. LÉPÉS - Entitás azonosítók kiolvasása URL paraméterekből
      const { entitasTipus, entitasId } = req.params;

      // 3. LÉPÉS - Paraméterek validálása
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező paraméterek: entitasId, entitasTipus'
        });
      }

      // 4. LÉPÉS - Service hívás - jogosultság ellenőrzése
      const eredmeny = await TudatpontService.emberHozzajarulasaEntitason(
        emberId,
        entitasId,
        entitasTipus
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres ellenőrzés
      res.status(200).json({
        success: true,
        data: eredmeny
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba a jogosultság ellenőrzése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a jogosultság ellenőrzése során',
        error: error.message
      });
    }
  }

}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new TudatpontController();
