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
      console.log('=================================== tartalomTipusLetrehozasa (controller):: ');

      // 1. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 2. LÉPÉS - IKON FÁJL ELLENŐRZÉSE
      // VÁLTOZÁS: korábban az ikon szövegként érkezett req.body-ból,
      // most a Multer middleware a feltöltött fájl adatait req.file-ba teszi.
      // Ha nem töltött fel fájlt az eember, req.file undefined lesz.
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Az ikon fájl feltöltése kötelező'
        });
      }

      console.log('tartalomTipusLetrehozasa - req.file: ', {
        originalname: req.file.originalname, // Eredeti fájlnév (pl. 'tartalom-ikon.png')
        filename:     req.file.filename,     // Szerveren tárolt egyedi fájlnév
        path:         req.file.path,         // Teljes fájlútvonal (pl. 'uploads/icons/ikon-123.png')
        size:         req.file.size          // Fájlméret byte-ban
      });

      // 3. LÉPÉS - ADATOK ÖSSZEÁLLÍTÁSA
      // Teljes URL-t építünk az ikon elérési útjaként, amit a böngésző közvetlenül használhat
      // req.protocol: "http" vagy "https"
      // req.get('host'): "localhost:3000"
      // req.file.filename: "ikon-1778191022759-408.png"
      // Eredmény: "http://localhost:3000/uploads/icons/ikon-1778191022759-408.png"
      const adatok = {
        ...req.body,
        ikon: `${req.protocol}://${req.get('host')}/uploads/icons/${req.file.filename}`
      };

      // 4. LÉPÉS - Inicialis tudatpont validálása
      // VÁLTOZÁS: parseInt() szükséges, mert a multipart/form-data
      // minden mezőt szövegként küld – a Service viszont számot vár
      const kezdoTudatpont = parseInt(adatok.kezdoTudatpont);

      if (!kezdoTudatpont) {
        return res.status(400).json({
          success: false,
          message: 'Az kezdoTudatpont megadása kötelező'
        });
      }

      console.log('tartalomTipusLetrehozasa >>>>>>>>>>>> TartalomTipusService.tartalomTipusLetrehozasa', {
        adatok:         adatok,
        eemberId:       eemberId,
        kezdoTudatpont: kezdoTudatpont
      });

      // 5. LÉPÉS - Service hívás - üzleti logika végrehajtása
      const ujTartalomTipus = await TartalomTipusService.tartalomTipusLetrehozasa(
        adatok,
        eemberId,
        kezdoTudatpont
      );

      // 6. LÉPÉS - Sikeres válasz küldése
      // 201 Created - új erőforrás sikeresen létrehozva
      console.log('<<<<<<<<<<<<<<<<<< tartalomTipusLetrehozasa (controller) - siker');
      res.status(201).json({
        success: true,
        message: 'Tartalom típus sikeresen létrehozva',
        tartalomTipus: ujTartalomTipus
      });

    } catch (error) {
      console.error('Tartalom típus létrehozása hiba:', error);

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
      console.log('=================================== tartalomTipusLekerese (controller):: ');

      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - Service hívás
      console.log('tartalomTipusLekerese >>>>>>>>>>>> TartalomTipusService.tartalomTipusLekerese');
      const tartalomTipus = await TartalomTipusService.tartalomTipusLekerese(tartalomTipusId);

      // 3. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< tartalomTipusLekerese (controller) - siker');
      res.status(200).json({
        success: true,
        tartalomTipus: tartalomTipus
      });

    } catch (error) {
      console.error('Tartalom típus lekérése hiba:', error);

      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

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
      console.log('=================================== tartalomTipusokListazasa (controller):: ');

      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        letrehozo: req.query.letrehozo,
        nev:       req.query.nev
      };

      console.log('tartalomTipusokListazasa >>>>>>>>>>>> TartalomTipusService.tartalomTipusListazasa', {
        szurok: szurok
      });

      // 2. LÉPÉS - Service hívás
      const tartalomTipusok = await TartalomTipusService.tartalomTipusListazasa(szurok);

      // 3. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< tartalomTipusokListazasa (controller) - siker, db: ', tartalomTipusok.length);
      res.status(200).json({
        success: true,
        count:         tartalomTipusok.length,
        tartalomTipusok: tartalomTipusok
      });

    } catch (error) {
      console.error('Tartalom típusok listázása hiba:', error);

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a tartalom típusok lekérése során'
      });
    }
  }

  // =====================================
  // ----- TARTALOM TÍPUS MÓDOSÍTÁSA -----
  // =====================================
  /**
   * Egy tartalom típus módosítása
   * PATCH /api/tartalomTipus/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async tartalomTipusModositasa(req, res) {
    try {
      console.log('=================================== tartalomTipusModositasa (controller):: ');

      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - FRISSÍTÉSEK ÖSSZEÁLLÍTÁSA
      // req.body tartalmazza: nev, leiras (szövegmezők)
      // Ha az eember új ikont töltött fel, teljes URL-ként mentjük el.
      // Ha NEM töltött fel új ikont, az ikon mező NEM kerül a frissítésekbe,
      // tehát a régi ikon megmarad az adatbázisban.
      const frissitesek = { ...req.body };

      if (req.file) {
        // Új ikon érkezett: teljes URL-ként mentjük
        frissitesek.ikon = `${req.protocol}://${req.get('host')}/uploads/icons/${req.file.filename}`;
        console.log('tartalomTipusModositasa - új ikon feltöltve: ', { ikon: frissitesek.ikon });
      } else {
        // Nem töltöttek fel új ikont: az ikon mező nem változik
        console.log('tartalomTipusModositasa - nem töltöttek fel új ikont, ikon változatlan marad');
      }

      console.log('tartalomTipusModositasa >>>>>>>>>>>> TartalomTipusService.tartalomTipusModositasa', {
        tartalomTipusId: tartalomTipusId,
        frissitesek:     frissitesek,
        eemberId:        eemberId
      });

      // 4. LÉPÉS - Service hívás
      const frissitettTartalomTipus = await TartalomTipusService.tartalomTipusModositasa(
        tartalomTipusId,
        frissitesek,
        eemberId
      );

      // 5. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< tartalomTipusModositasa (controller) - siker');
      res.status(200).json({
        success: true,
        message:       'Tartalom típus sikeresen módosítva',
        tartalomTipus: frissitettTartalomTipus
      });

    } catch (error) {
      console.error('Tartalom típus módosítása hiba:', error);

      if (error.message.includes('nem található')) {
        return res.status(404).json({ success: false, message: error.message });
      }

      if (error.message.includes('jogosultság')) {
        return res.status(403).json({ success: false, message: error.message });
      }

      if (error.message.includes('kötelező') || error.message.includes('létezik') || error.message.includes('üres')) {
        return res.status(400).json({ success: false, message: error.message });
      }

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
      console.log('=================================== tartalomTipusReszleteinekLekerese (controller):: ');

      // 1. LÉPÉS - Tartalom típus ID kiolvasása URL paraméterből
      const tartalomTipusId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Service hívás
      console.log('tartalomTipusReszleteinekLekerese >>>>>>>>>>>> TartalomTipusService.tartalomTipusReszleteinekLekerese');
      const reszletek = await TartalomTipusService.tartalomTipusReszleteinekLekerese(
        tartalomTipusId,
        eemberId
      );

      // 4. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< tartalomTipusReszleteinekLekerese (controller) - siker');
      res.status(200).json({
        success: true,
        data: reszletek
      });

    } catch (error) {
      console.error('Tartalom típus részleteinek lekérése hiba:', error);

      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

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
  //    - Ha minden eember visszavonja a tudatpontjait (pontok: 0)
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