// backend/controllers/egyezmenyController.js

// =====================================================
// IMPORTOK
// =====================================================
// Service - üzleti logika kezelése
const EgyezmenyService = require('../services/egyezmenyService');

// =====================================================
// EGYEZMÉNY CONTROLLER OSZTÁLY
// =====================================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
class EgyezmenyController {

  // ----- EGYEZMÉNY LEKÉRÉSE ID ALAPJÁN -----
  /**
   * Egy egyezmény lekérése
   * GET /api/egyezmeny/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async egyezmenyLekerese(req, res) {
    try {
      // Log: endpoint hívás
      console.log('GET /api/egyezmeny/:id - KEZDÉS');

      // 1. LÉPÉS - Egyezmény ID kiolvasása URL paraméterből
      const egyezmenyId = req.params.id;

      console.log('Egyezmény ID:', egyezmenyId);

      // 2. LÉPÉS - Service hívás - egyezmény lekérése
      const egyezmeny = await EgyezmenyService.egyezmenyLekerese(egyezmenyId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        egyezmeny: egyezmeny
      });

      console.log('GET /api/egyezmeny/:id - VÉGE (siker)');

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Egyezmény lekérése hiba:', error);

      // 404 Not Found - Ha nem található az egyezmény
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt az egyezmény lekérése során'
      });
    }
  }

  // ----- EGYEZMÉNYEK LISTÁZÁSA -----
  /**
   * Egyezmények listázása szűrőkkel
   * GET /api/egyezmeny?javaslatTipus=Torles&letrehozo=xyz&limit=20&skip=0
   * Query paraméterek: javaslatTipus, letrehozo, limit, skip
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async egyezmenyekListazasa(req, res) {
    try {
      // Log: endpoint hívás
      console.log('GET /api/egyezmeny - KEZDÉS');

      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        javaslatTipus: req.query.javaslatTipus, // Szűrés javaslat típus szerint
        letrehozo: req.query.letrehozo, // Szűrés létrehozó szerint
        javaslatId: req.query.javaslatId // Szűrés javaslat ID szerint
      };

      // Limit és skip lapozáshoz
      const limit = parseInt(req.query.limit) || 20; // Alapértelmezett: 20
      const skip = parseInt(req.query.skip) || 0; // Alapértelmezett: 0

      console.log('Szűrők:', JSON.stringify(szurok, null, 2));
      console.log('Lapozás:', { limit, skip });

      // 2. LÉPÉS - Service hívás - egyezmények lekérése szűrőkkel
      const egyezmenyek = await EgyezmenyService.egyezmenyekListazasa(szurok, limit, skip);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: egyezmenyek.length,
        egyezmenyek: egyezmenyek
      });

      console.log('GET /api/egyezmeny - VÉGE (siker):', egyezmenyek.length, 'db');

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Egyezmények listázása hiba:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt az egyezmények lekérése során'
      });
    }
  }

  // ----- EGYEZMÉNY RÉSZLETES ADATAI -----
  /**
   * Egyezmény részletes adatainak lekérése tudatpont adatokkal
   * GET /api/egyezmeny/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async egyezmenyReszleteinekLekerese(req, res) {
    try {
      // Log: endpoint hívás
      console.log('GET /api/egyezmeny/:id/reszletek - KEZDÉS');

      // 1. LÉPÉS - Egyezmény ID kiolvasása URL paraméterből
      const egyezmenyId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ból (opcionális)
      const eemberId = req.user?.id || null;

      console.log('Egyezmény ID:', egyezmenyId);
      console.log('eEmber ID:', eemberId || 'vendég');

      // 3. LÉPÉS - Service hívás - egyezmény alapadatok
      const egyezmeny = await EgyezmenyService.egyezmenyLekerese(egyezmenyId);

      // 4. LÉPÉS - Tudatpont adatok lekérése az egyezményhez
      const TudatpontService = require('../services/tudatpontService');
      const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
        egyezmenyId,
        'Egyezmeny',
        eemberId
      );

      // 5. LÉPÉS - Összesített válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: {
          egyezmeny: egyezmeny,
          tudatpontok: tudatpontAdatok
        }
      });

      console.log('GET /api/egyezmeny/:id/reszletek - VÉGE (siker)');

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Egyezmény részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található az egyezmény
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt az egyezmény részleteinek lekérése során'
      });
    }
  }

  // ----- JAVASLAT EGYEZMÉNYE -----
  /**
   * Egy javaslathoz tartozó egyezmény lekérése
   * GET /api/egyezmeny/javaslat/:javaslatId
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async javaslatEgyezmenye(req, res) {
    try {
      // Log: endpoint hívás
      console.log('GET /api/egyezmeny/javaslat/:javaslatId - KEZDÉS');

      // 1. LÉPÉS - Javaslat ID kiolvasása URL paraméterből
      const javaslatId = req.params.javaslatId;

      console.log('Javaslat ID:', javaslatId);

      // 2. LÉPÉS - Service hívás - egyezmény keresése javaslat alapján
      const egyezmeny = await EgyezmenyService.javaslatEgyezmenye(javaslatId);

      // 3. LÉPÉS - Válasz
      if (!egyezmeny) {
        // Nincs egyezmény - 404 Not Found
        console.log('Nincs egyezmény ehhez a javaslathoz');
        return res.status(404).json({
          success: false,
          message: 'Nincs egyezmény ehhez a javaslathoz',
          vanEgyezmeny: false
        });
      }

      // Van egyezmény - 200 OK
      console.log('Egyezmény találat:', egyezmeny._id);
      res.status(200).json({
        success: true,
        vanEgyezmeny: true,
        egyezmeny: egyezmeny
      });

      console.log('GET /api/egyezmeny/javaslat/:javaslatId - VÉGE (siker)');

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Javaslat egyezményének lekérése hiba:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a javaslat egyezményének lekérése során'
      });
    }
  }

  // MEGJEGYZÉS: TÖRLÉS METÓDUS NINCS!
  // Az egyezmények NEM törölhetők direkt API híváson keresztül.
  // Törlés csak automatikusan történik:
  // 1. AUTOMATIKUS Törlés - Tudatpont nullázás
  //    - Ha minden eember visszavonja a tudatpontjait (pontok → 0)
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan törlődik (tudatpontService.js kezeli)

}

// =====================================================
// CONTROLLER EXPORTÁLÁSA
// =====================================================
// Controller exportálása
module.exports = new EgyezmenyController();
