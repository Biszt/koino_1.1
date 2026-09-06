// backend/controllers/gondolatTipusController.js

// ===================================
// IMPORTOK
// ===================================
// Service - üzleti logika kezelése
const GondolatTipusService = require('../services/gondolatTipusService');

// ===================================
// GONDOLAT TÍPUS CONTROLLER OSZTÁLY
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class GondolatTipusController {

  // =====================================
  // ----- ÚJ GONDOLAT TÍPUS LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új gondolat típus létrehozása
   * POST /api/gondolatTipus
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatTipusLetrehozasa(req, res) {
    try {
      console.log('=================================== gondolatTipusLetrehozasa (controller):: ');

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

      console.log('gondolatTipusLetrehozasa - req.file: ', {
        originalname: req.file.originalname, // Eredeti fájlnév (pl. 'gondolat-ikon.png')
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

      console.log('gondolatTipusLetrehozasa >>>>>>>>>>>> GondolatTipusService.gondolatTipusLetrehozasa', {
        adatok:         adatok,
        eemberId:       eemberId,
        kezdoTudatpont: kezdoTudatpont
      });

      // 5. LÉPÉS - Service hívás - üzleti logika végrehajtása
      const ujGondolatTipus = await GondolatTipusService.gondolatTipusLetrehozasa(
        adatok,
        eemberId,
        kezdoTudatpont
      );

      // 6. LÉPÉS - Sikeres válasz küldése
      // 201 Created - új erőforrás sikeresen létrehozva
      console.log('<<<<<<<<<<<<<<<<<< gondolatTipusLetrehozasa (controller) - siker');
      res.status(201).json({
        success: true,
        message: 'Gondolat típus sikeresen létrehozva',
        gondolatTipus: ujGondolatTipus
      });

    } catch (error) {
      console.error('Gondolat típus létrehozása hiba:', error);

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // =====================================
  // ----- GONDOLAT TÍPUS LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy gondolat típus lekérése
   * GET /api/gondolatTipus/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatTipusLekerese(req, res) {
    try {
      console.log('=================================== gondolatTipusLekerese (controller):: ');

      // 1. LÉPÉS - Gondolat típus ID kiolvasása URL paraméterből
      const gondolatTipusId = req.params.id;

      // 2. LÉPÉS - Service hívás
      console.log('gondolatTipusLekerese >>>>>>>>>>>> GondolatTipusService.gondolatTipusLekerese');
      const gondolatTipus = await GondolatTipusService.gondolatTipusLekerese(gondolatTipusId);

      // 3. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< gondolatTipusLekerese (controller) - siker');
      res.status(200).json({
        success: true,
        gondolatTipus: gondolatTipus
      });

    } catch (error) {
      console.error('Gondolat típus lekérése hiba:', error);

      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat típus lekérése során'
      });
    }
  }

  // =====================================
  // ----- GONDOLAT TÍPUSOK LISTÁZÁSA -----
  // =====================================
  /**
   * Gondolat típusok listázása szűrőkkel
   * GET /api/gondolatTipus
   * Query paraméterek: letrehozo, nev
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatTipusokListazasa(req, res) {
    try {
      console.log('=================================== gondolatTipusokListazasa (controller):: ');

      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        letrehozo: req.query.letrehozo,
        nev:       req.query.nev
      };

      console.log('gondolatTipusokListazasa >>>>>>>>>>>> GondolatTipusService.gondolatTipusListazasa', {
        szurok: szurok
      });

      // 2. LÉPÉS - Service hívás
      const gondolatTipusok = await GondolatTipusService.gondolatTipusListazasa(szurok);

      // 3. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< gondolatTipusokListazasa (controller) - siker, db: ', gondolatTipusok.length);
      res.status(200).json({
        success: true,
        count:         gondolatTipusok.length,
        gondolatTipusok: gondolatTipusok
      });

    } catch (error) {
      console.error('Gondolat típusok listázása hiba:', error);

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat típusok lekérése során'
      });
    }
  }

  // =====================================
  // ----- GONDOLAT TÍPUS MÓDOSÍTÁSA -----
  // =====================================
  /**
   * Egy gondolat típus módosítása
   * PATCH /api/gondolatTipus/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatTipusModositasa(req, res) {
    try {
      console.log('=================================== gondolatTipusModositasa (controller):: ');

      // 1. LÉPÉS - Gondolat típus ID kiolvasása URL paraméterből
      const gondolatTipusId = req.params.id;

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
        console.log('gondolatTipusModositasa - új ikon feltöltve: ', { ikon: frissitesek.ikon });
      } else {
        // Nem töltöttek fel új ikont: az ikon mező nem változik
        console.log('gondolatTipusModositasa - nem töltöttek fel új ikont, ikon változatlan marad');
      }

      console.log('gondolatTipusModositasa >>>>>>>>>>>> GondolatTipusService.gondolatTipusModositasa', {
        gondolatTipusId: gondolatTipusId,
        frissitesek:     frissitesek,
        eemberId:        eemberId
      });

      // 4. LÉPÉS - Service hívás
      const frissitettGondolatTipus = await GondolatTipusService.gondolatTipusModositasa(
        gondolatTipusId,
        frissitesek,
        eemberId
      );

      // 5. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< gondolatTipusModositasa (controller) - siker');
      res.status(200).json({
        success: true,
        message:       'Gondolat típus sikeresen módosítva',
        gondolatTipus: frissitettGondolatTipus
      });

    } catch (error) {
      console.error('Gondolat típus módosítása hiba:', error);

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
        message: 'Szerver hiba történt a gondolat típus módosítása során'
      });
    }
  }

  // =====================================
  // ----- GONDOLAT TÍPUS RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Gondolat típus részletes adatainak lekérése tudatpont adatokkal
   * GET /api/gondolatTipus/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async gondolatTipusReszleteinekLekerese(req, res) {
    try {
      console.log('=================================== gondolatTipusReszleteinekLekerese (controller):: ');

      // 1. LÉPÉS - Gondolat típus ID kiolvasása URL paraméterből
      const gondolatTipusId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Service hívás
      console.log('gondolatTipusReszleteinekLekerese >>>>>>>>>>>> GondolatTipusService.gondolatTipusReszleteinekLekerese');
      const reszletek = await GondolatTipusService.gondolatTipusReszleteinekLekerese(
        gondolatTipusId,
        eemberId
      );

      // 4. LÉPÉS - Sikeres válasz
      console.log('<<<<<<<<<<<<<<<<<< gondolatTipusReszleteinekLekerese (controller) - siker');
      res.status(200).json({
        success: true,
        data: reszletek
      });

    } catch (error) {
      console.error('Gondolat típus részleteinek lekérése hiba:', error);

      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a gondolat típus részleteinek lekérése során'
      });
    }
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  //
  // A gondolat típusok NEM törölhetők direkt API híváson keresztül.
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
module.exports = new GondolatTipusController();