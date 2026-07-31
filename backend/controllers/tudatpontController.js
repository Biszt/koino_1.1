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
      
      // 1. LÉPÉS - eEmber ID kiolvasása JWT token-ből
      // Az authMiddleware már dekódolta a token-t és req.user-be helyezte
      const eemberId = req.user.id;

      // 2. LÉPÉS - Adatok kiolvasása request body-ból
      // Frontend küldi: { entitasId, entitasTipus, pontok, felmenoketAutomatikusan?, szerep? }
      // felmenoketAutomatikusan: ha true, a hiányzó felmenőkre 1-1 pontot tesz (opció)
      // szerep: 'passziv' | 'aktiv' — csak az ELSŐ allokáláskori szerep-választáshoz
      const { entitasId, entitasTipus, pontok, felmenoketAutomatikusan, szerep } = req.body;

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

      // 6. LÉPÉS - Service hívás - felhasználói belépési pont
      // A felmenő-kitöltés OPCIONÁLIS (felmenoketAutomatikusan). A szerep csak az ELSŐ
      // allokáláskor érvényesül. A régi HIANYZO_FELMENOK kényszer MEGSZŰNT (2026-07-30).
      const eredmeny = await TudatpontService.felhasznaloTudatpontHozzarendelese(
        eemberId,
        entitasId,
        entitasTipus,
        pontok,
        felmenoketAutomatikusan === true,
        szerep
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
      if (error.message.includes('Nincs elég tudatpont')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      // 404 Not Found - Ha nem található az entitás vagy eember
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

      // 2. LÉPÉS - eEmber ID kiolvasása JWT token-ből (opcionális)
      // Ha be van jelentkezve, megkapjuk a eember hozzájárulását is
      const eemberId = req.user ? req.user.id : null;

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
        eemberId
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
  // Bejelentkezett eember tudatpont hozzárendeléseinek lekérése (GET kérés)
  // Endpoint: GET /api/tudatpont/hozzarendelesek?limit=20&skip=0
  // Query paraméterek: limit, skip (lapozás)
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async eemberHozzarendeleseinekLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - eEmber ID kiolvasása JWT token-ből
      const eemberId = req.user.id;

      // 2. LÉPÉS - Lapozási paraméterek kiolvasása query-ből
      const limit = parseInt(req.query.limit) || 20;   // Alapértelmezett: 20
      const skip = parseInt(req.query.skip) || 0;      // Alapértelmezett: 0

      // 3. LÉPÉS - Limit validálása (max 100)
      const validLimit = Math.min(limit, 100);

      // 4. LÉPÉS - Service hívás - hozzárendelések lekérése
      const hozzarendelesek = await TudatpontService.eemberHozzarendeleseinekLekerese(
        eemberId,
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
  async eemberAktivHozzarendeleseinekLekerese(req, res) {
    try {
      
      // 1. LÉPÉS - eEmber ID kiolvasása JWT token-ből
      const eemberId = req.user.id;

      // 2. LÉPÉS - Lapozási paraméterek kiolvasása query-ből
      const limit = parseInt(req.query.limit) || 20;   // Alapértelmezett: 20
      const skip = parseInt(req.query.skip) || 0;      // Alapértelmezett: 0

      // Opcionális ág-szűrő (Tudatpontok nézet a kártya-menükből): csak az adott
      // entitás ága alatti hozzárendelések
      const agEntitasId = req.query.agEntitasId || null;

      // 3. LÉPÉS - Limit validálása (max 100)
      const validLimit = Math.min(limit, 100);

      // 4. LÉPÉS - Service hívás - aktív hozzárendelések lekérése
      const hozzarendelesek = await TudatpontService.eemberAktivHozzarendeleseinekLekerese(
        eemberId,
        validLimit,
        skip,
        agEntitasId
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
  // TUDATPONTOK VISSZAOSZTÁSA — CONTROLLER ELTÁVOLÍTVA (2026-07-20)
  // ============================================================
  // A `tudatpontokVisszaosztasa` controller-metódust (a `POST /api/tudatpont/visszaosztas`
  // végpont kezelőjét) ELTÁVOLÍTOTTUK, mert governance-lyuk volt: admin-védelem nélkül
  // bárki entitást töröltethetett a szavazás megkerülésével (lásd a route-fájl
  // megjegyzését). A visszaosztás LOGIKÁJA a `TudatpontService.tudatpontokVisszaosztasa`
  // service-metódusban él tovább, amit a törlés-/egyesítés-végrehajtók közvetlenül hívnak.

  // ============================================================
  // FELMENŐ-SZABÁLY FELMÉRÉSE (a tudatpont módosítás megnyitásakor)
  // ============================================================

  // ----- HIÁNYZÓ FELMENŐK FELMÉRÉSE -----
  // Végigjárja az entitás szülőláncát, és visszaadja azokat a felmenőket,
  // amelyeken a bejelentkezett eembernek nincs tudatpontja.
  // Endpoint: GET /api/tudatpont/hianyzo-felmenok/:entitasTipus/:entitasId
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async hianyzoFelmenokLekerese(req, res) {
    try {
      // 1. LÉPÉS - eEmber ID kiolvasása JWT token-ből
      const eemberId = req.user.id;

      // 2. LÉPÉS - Entitás azonosítók kiolvasása URL paraméterekből
      const { entitasTipus, entitasId } = req.params;

      // 3. LÉPÉS - Paraméterek validálása
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező paraméterek: entitasId, entitasTipus'
        });
      }

      // 4. LÉPÉS - Service hívás - felmenők felmérése
      const eredmeny = await TudatpontService.hianyzoFelmenokFelmerese(
        eemberId,
        entitasId,
        entitasTipus
      );

      // 5. LÉPÉS - Sikeres válasz küldése
      res.status(200).json({
        success: true,
        data: eredmeny
      });

    } catch (error) {
      // ===== HIBAKEZELÉS =====
      console.error('Hiba a hiányzó felmenők felmérése során:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a felmenők felmérése során',
        error: error.message
      });
    }
  }

  // ============================================================
  // RÉSZVÉTELI SZEREP BEÁLLÍTÁSA (a kártya „Részvételi beállítások" menüje)
  // ============================================================

  // ----- RÉSZVÉTELI SZEREP BEÁLLÍTÁSA -----
  // A eember explicit passzív↔aktív váltása egy entitáson. A pontokhoz NEM nyúl;
  // feltétel: legyen már tudatpont-hozzárendelése az entitáson.
  // Endpoint: PUT /api/tudatpont/szerep/:entitasTipus/:entitasId  Body: { szerep }
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async szerepBeallitasa(req, res) {
    try {
      // 1. LÉPÉS - eEmber ID a JWT tokenből + paraméterek
      const eemberId = req.user.id;
      const { entitasTipus, entitasId } = req.params;
      const { szerep } = req.body;

      // 2. LÉPÉS - Validáció
      if (!entitasId || !entitasTipus) {
        return res.status(400).json({
          success: false,
          message: 'Hiányzó kötelező paraméterek: entitasId, entitasTipus'
        });
      }
      if (szerep !== 'passziv' && szerep !== 'aktiv') {
        return res.status(400).json({
          success: false,
          message: "Érvénytelen szerep. Megengedett értékek: 'passziv' vagy 'aktiv'"
        });
      }

      // 3. LÉPÉS - Service hívás
      const eredmeny = await TudatpontService.szerepBeallitasa(
        eemberId,
        entitasId,
        entitasTipus,
        szerep
      );

      // 4. LÉPÉS - Sikeres válasz
      res.status(200).json({
        success: true,
        message: 'A részvételi szereped frissítve.',
        data: { szerep: eredmeny.szerep }
      });

    } catch (error) {
      console.error('Hiba a részvételi szerep beállítása során:', error);

      // Kliens-oldali hibák (nincs hozzárendelés / érvénytelen szerep) → 400
      if (
        error.message.includes('Nincs tudatpont-hozzárendelésed') ||
        error.message.includes('Érvénytelen szerep')
      ) {
        return res.status(400).json({ success: false, message: error.message });
      }

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a részvételi szerep beállítása során',
        error: error.message
      });
    }
  }

  // ============================================================
  // JAVASLAT RENDSZERHEZ SZÜKSÉGES VÉGPONTOK
  // ============================================================

  // ----- EMBER HOZZÁJÁRULÁSÁNAK ELLENŐRZÉSE ENTITÁSON -----
  // Ellenőrzi, hogy egy eember rendelkezik-e tudatponttal egy entitáson (GET kérés)
  // Endpoint: GET /api/tudatpont/jogosultsag/:entitasTipus/:entitasId
  // Használat: szavazási jogosultság ellenőrzéséhez (javaslat rendszer)
  // @param {Object} req - Express request objektum
  // @param {Object} res - Express response objektum
  async eemberJogosultsagEllenorzes(req, res) {
    try {
      
      // 1. LÉPÉS - eEmber ID kiolvasása JWT token-ből
      const eemberId = req.user.id;

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
      const eredmeny = await TudatpontService.eemberHozzajarulasaEntitason(
        eemberId,
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
