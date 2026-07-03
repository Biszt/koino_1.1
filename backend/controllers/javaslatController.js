// backend/controllers/javaslatController.js

// ===================================
// IMPORTOK
// ===================================
// Service rétegek - üzleti logika kezelése
const JavaslatService = require('../services/javaslat/javaslatService');
const SzavazatService = require('../services/szavazatService');

// ===================================
// JAVASLAT CONTROLLER OBJEKTUM
// ===================================
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Fogadja a request-et, átadja a Service-nek, visszaküldi a response-t
const JavaslatController = {

  /**
 /**
 * ----- ÚJ JAVASLAT LÉTREHOZÁSA -----
 * MÓDOSÍTVA: szuloId kötelező + kezdoTudatpont visszatéve
 * POST /api/javaslat
 */
async javaslatLetrehozasa(req, res) {
  try {
    // 1. LÉPÉS - eEmber ID
    const eemberId = req.user?.id;
    
    if (!eemberId) {
      return res.status(401).json({
        success: false,
        message: 'Bejelentkezés szükséges'
      });
    }
    
    // 2. LÉPÉS - Adatok kiolvasása
    const javaslatAdatok = req.body;

    console.log("javaslatAdatok: ", javaslatAdatok);
    
    
    // 3. LÉPÉS - szuloId validáció (ÚJ!)
    if (!javaslatAdatok.szuloId) {
      return res.status(400).json({
        success: false,
        message: 'A javaslat létrehozásához szülő tartalom megadása kötelező'
      });
    }
    
    // 4. LÉPÉS - kezdoTudatpont validáció (VISSZATÉVE!)
    const kezdoTudatpont = javaslatAdatok.kezdoTudatpont;
    
    if (!kezdoTudatpont) {
      return res.status(400).json({
        success: false,
        message: 'Az kezdoTudatpont megadása kötelező'
      });
    }
    
    // 5. LÉPÉS - Service hívás (3 paraméterrel!)
    const eredmeny = await JavaslatService.javaslatLetrehozas(
      javaslatAdatok,    // 1. paraméter
      eemberId,     // 2. paraméter
      kezdoTudatpont     // 3. paraméter ← VISSZATÉVE!
    );
    
    console.log("eredmeny", eredmeny);
    
    // 6. LÉPÉS - Azonnali végrehajtás ellenőrzése (VISSZATÉVE!)
    if (!eredmeny) {
      return res.status(201).json({
        success: true,
        message: 'Javaslat sikeresen létrehozva és azonnal végrehajtva',
        javaslat: null,
        vegrehajtva: true
      });
    }
    
    console.log('5. SERVICE hívás UTÁN - Javaslat ID:', eredmeny._id);
    
    // 7. LÉPÉS - Sikeres válasz
    res.status(201).json({
      success: true,
      message: 'Javaslat sikeresen létrehozva',
      javaslat: eredmeny
    });
    
  } catch (error) {
    console.error('❌ Javaslat létrehozása hiba:', error);
    
    // 403 Forbidden - Nincs jogosultság
    if (error.message.includes('jogosultság')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    // 404 Not Found - Entitás nem található
    if (error.message.includes('nem található')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    // 400 Bad Request - Validációs és egyéb hibák
    if (error.message.includes('kötelező') ||
        error.message.includes('létezik')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // 500 Internal Server Error - Minden más hiba
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a javaslat létrehozása során'
    });
  }
},




  // =====================================
  // ----- JAVASLAT LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy javaslat lekérése
   * GET /api/javaslat/:id
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async javaslatLekerese(req, res) {
    try {
      // 1. LÉPÉS - Javaslat ID kiolvasása URL paraméterből
      const javaslatId = req.params.id;

      // 2. LÉPÉS - Service hívás - javaslat lekérése
      const javaslat = await JavaslatService.javaslatLekerese(javaslatId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        javaslat: javaslat
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Javaslat lekérése hiba:', error);

      // 404 Not Found - Ha nem található a javaslat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a javaslat lekérése során'
      });
    }
  },

  // =====================================
  // ----- JAVASLATOK LISTÁZÁSA -----
  // =====================================
  /**
   * Javaslatok listázása szűrőkkel
   * GET /api/javaslat
   * Query paraméterek: statusz, javaslatTipus, letrehozo, entitasId, entitasTipus
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async javaslatokListazasa(req, res) {
    try {
      // 1. LÉPÉS - Szűrők kiolvasása query paraméterekből
      const szurok = {
        statusz: req.query.statusz,
        javaslatTipus: req.query.javaslatTipus,
        letrehozo: req.query.letrehozo,
        entitasId: req.query.entitasId,
        entitasTipus: req.query.entitasTipus
      };

      // 2. LÉPÉS - Service hívás - javaslatok lekérése szűrőkkel
      const javaslatok = await JavaslatService.javaslatListazasa(szurok);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: javaslatok.length,
        javaslatok: javaslatok
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Javaslatok listázása hiba:', error);

      // 500 Internal Server Error
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a javaslatok lekérése során'
      });
    }
  },

  // =====================================
  // ----- JAVASLAT RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Javaslat részletes adatainak lekérése tudatpont adatokkal
   * GET /api/javaslat/:id/reszletek
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async javaslatReszleteinekLekerese(req, res) {
    try {
      // 1. LÉPÉS - Javaslat ID kiolvasása URL paraméterből
      const javaslatId = req.params.id;

      // 2. LÉPÉS - eEmber ID kiolvasása JWT middleware-ből
      const eemberId = req.user?.id;

      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // 3. LÉPÉS - Service hívás - részletes adatok lekérése
      const reszletek = await JavaslatService.javaslatReszleteinekLekerese(javaslatId, eemberId);

      // 4. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: reszletek
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Javaslat részleteinek lekérése hiba:', error);

      // 404 Not Found - Ha nem található a javaslat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a javaslat részleteinek lekérése során'
      });
    }
  },

  
  /**
 * ----- SZAVAZAT LEADÁSA -----
 * Szavazat leadása egy javaslatra
 * POST /api/szavazat
 * @param {Object} req - Express request objektum
 * @param {Object} res - Express response objektum
 */
async szavazatLeadasa(req, res) {
  try {
    // 1. LÉPÉS - eEmber ID kiolvassa JWT middleware-ből
    const eemberId = req.user?.id;
    if (!eemberId) {
      return res.status(401).json({
        success: false,
        message: 'Bejelentkezés szükséges'
      });
    }

    // 2. LÉPÉS - Javaslat ID és szavazat típus kiolvassa request body-ből (JSON)
    const { javaslatId, szavazatTipus } = req.body;
    
    // 3. LÉPÉS - Validációk
    if (!javaslatId) {
      return res.status(400).json({
        success: false,
        message: 'A javaslat azonosítója kötelező'
      });
    }
    
    if (!szavazatTipus) {
      return res.status(400).json({
        success: false,
        message: 'A szavazat típusa kötelező'
      });
    }

    // 4. LÉPÉS - Service hívás - szavazat leadása
    const eredmeny = await SzavazatService.szavazatLeadasa(
      eemberId,
      javaslatId,
      szavazatTipus
    );

    // 5. LÉPÉS - Sikeres válasz küldése
    // 200 OK - Sikeres szavazat leadás
    res.status(200).json({
      success: true,
      message: 'Szavazat sikeresen leadva',
      data: eredmeny
    });
    
  } catch (error) {
    // HIBAKEZELÉS
    console.error('Szavazat leadása hiba:', error);

    // 404 Not Found - Ha nem található a javaslat
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
    if (
      error.message.includes('kötelező') ||
      error.message.includes('Csak Aktiv') ||
      error.message.includes('érvénytelen')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // 500 Internal Server Error - Minden más hiba
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a szavazat leadása során'
    });
  }
},

/**
 * ----- SZAVAZAT VISSZAVONÁSA -----
 * Szavazat visszavonása
 * DELETE /api/szavazat
 * @param {Object} req - Express request objektum
 * @param {Object} res - Express response objektum
 */
async szavazatVisszavonasa(req, res) {
  try {
    // 1. LÉPÉS - eEmber ID kiolvassa JWT middleware-ből
    const eemberId = req.user?.id;
    if (!eemberId) {
      return res.status(401).json({
        success: false,
        message: 'Bejelentkezés szükséges'
      });
    }

    // 2. LÉPÉS - Javaslat ID kiolvassa request body-ből (JSON)
    const { javaslatId } = req.body;
    
    // 3. LÉPÉS - Validáció
    if (!javaslatId) {
      return res.status(400).json({
        success: false,
        message: 'A javaslat azonosítója kötelező'
      });
    }

    // 4. LÉPÉS - Service hívás - szavazat törlése
    const eredmeny = await SzavazatService.szavazatTorlese(
      eemberId,
      javaslatId
    );

    // 5. LÉPÉS - Sikeres válasz küldése
    // 200 OK - Sikeres visszavonás
    res.status(200).json({
      success: true,
      message: eredmeny.uzenet
    });
    
  } catch (error) {
    // HIBAKEZELÉS
    console.error('Szavazat visszavonása hiba:', error);

    // 404 Not Found - Ha nem található a szavazat
    if (error.message.includes('nem található')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // 400 Bad Request - Validációs hiba
    if (error.message.includes('Csak Aktiv')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // 500 Internal Server Error - Egyéb szerver hiba
    res.status(500).json({
      success: false,
      message: 'Szerver hiba történt a szavazat visszavonása során'
    });
  }
},

  // =====================================
  // ----- JAVASLAT SZAVAZATAINAK LISTÁZÁSA -----
  // =====================================
  /**
   * Javaslat szavazatainak listázása
   * GET /api/javaslat/:id/szavazatok
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async javaslatSzavazatainakLekerese(req, res) {
    try {
      // 1. LÉPÉS - Javaslat ID kiolvasása URL paraméterből
      const javaslatId = req.params.id;

      // 2. LÉPÉS - Service hívás - szavazatok lekérése
      const szavazatok = await SzavazatService.javaslatSzavazatainakLekerese(javaslatId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        count: szavazatok.length,
        szavazatok: szavazatok
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Szavazatok lekérése hiba:', error);

      // 404 Not Found - Ha nem található a javaslat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a szavazatok lekérése során'
      });
    }
  },

  // =====================================
  // ----- SZAVAZATOK STATISZTIKÁJA -----
  // =====================================
  /**
   * Szavazatok statisztikájának lekérése
   * GET /api/javaslat/:id/statisztika
   * @param {Object} req - Express request objektum
   * @param {Object} res - Express response objektum
   */
  async szavazatokStatisztikaja(req, res) {
    try {
      // 1. LÉPÉS - Javaslat ID kiolvasása URL paraméterből
      const javaslatId = req.params.id;

      // 2. LÉPÉS - Service hívás - statisztika lekérése
      const statisztika = await SzavazatService.szavazatokStatisztikaja(javaslatId);

      // 3. LÉPÉS - Sikeres válasz küldése
      // 200 OK - Sikeres lekérés
      res.status(200).json({
        success: true,
        data: statisztika
      });

    } catch (error) {
      // HIBAKEZELÉS
      console.error('Statisztika lekérése hiba:', error);

      // 404 Not Found - Ha nem található a javaslat
      if (error.message.includes('nem található')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      // 500 Internal Server Error - Egyéb szerver hiba
      res.status(500).json({
        success: false,
        message: 'Szerver hiba történt a statisztika lekérése során'
      });
    }
  }
};

// ===================================
// CONTROLLER EXPORTÁLÁSA
// ===================================
module.exports = JavaslatController;
