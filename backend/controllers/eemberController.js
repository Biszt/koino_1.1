// backend/controllers/eemberController.js

// ===== IMPORTOK =====
// Service: üzleti logika kezelése
const eEmberService = require('../services/eemberService');

// E-mail cím megerősítése (2. lépés): megerősítő levél küldése + a hivatkozás beváltása
const emailMegerositesService = require('../services/emailMegerositesService');

// Elfelejtett jelszó (3. lépés): helyreállító levél + új jelszó beállítása
const jelszoHelyreallitasService = require('../services/jelszoHelyreallitasService');

// ===== EEMBER CONTROLLER OSZTÁLY =====
// Ez a réteg kezeli a HTTP kéréseket és válaszokat
// Feladata: kérés fogadása → service hívás → válasz küldése
class eEmberController {

  // ===== REGISZTRÁCIÓ =====
  // Új eember létrehozása
  // POST /api/eember/regisztracio
  // @param {Object} req - Express request (body: eemberNev, email, jelszo, nev, lokacio)
  // @param {Object} res - Express response
  async regisztracio(req, res) {
    console.log('eEmberController.regisztracio - KEZDÉS', { body: req.body });
    try {
      // Regisztrációs adatok kiolvasása a kérés body-jából
      const adatok = req.body;

      // Service hívás – validáció, mentés, JWT generálás
      const eredmeny = await eEmberService.regisztracio(adatok);

      // 201 Created – sikeres regisztráció
      res.status(201).json({
        success: true,
        message: 'Regisztráció sikeres',
        eember:  eredmeny.eember,
        token:   eredmeny.token
      });

      console.log('eEmberController.regisztracio - VÉGE (siker)', { id: eredmeny.eember._id });

    } catch (error) {
      console.error('eEmberController.regisztracio - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== BEJELENTKEZÉS =====
  // eEmber azonosítása email vagy eemberNev + jelszó alapján
  // POST /api/eember/bejelentkezes
  // @param {Object} req - Express request (body: azonosito, jelszo)
  // @param {Object} res - Express response
  async bejelentkezes(req, res) {
    console.log('eEmberController.bejelentkezes - KEZDÉS', { body: req.body });
    try {
      // azonosito: lehet email CÍM vagy eemberNev – a service dönti el
      const { azonosito, jelszo } = req.body;

      // Kötelező mezők ellenőrzése
      if (!azonosito || !jelszo) {
        return res.status(400).json({
          success: false,
          message: 'Azonosító (email vagy eemberNev) és jelszó megadása kötelező'
        });
      }

      // Service hívás – azonosítás + JWT generálás
      const eredmeny = await eEmberService.bejelentkezes(azonosito, jelszo);

      // 200 OK – sikeres bejelentkezés
      res.status(200).json({
        success: true,
        message: 'Bejelentkezés sikeres',
        eember:  eredmeny.eember,
        token:   eredmeny.token
      });

      console.log('eEmberController.bejelentkezes - VÉGE (siker)', { eemberNev: eredmeny.eember?.eemberNev });

    } catch (error) {
      console.error('eEmberController.bejelentkezes - VÉGE (hiba)', { hiba: error.message });
      res.status(401).json({ success: false, message: error.message });
    }
  }

  // ===== SAJÁT ADATOK LEKÉRÉSE =====
  // A bejelentkezett eember aktuális adatainak visszaadása
  // Használat: Főoldal statisztika sáv tölti be (eemberNev, tudatpontok)
  // GET /api/eember/sajat-adatok
  // @param {Object} req - Express request (req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async sajatAdatokLekereses(req, res) {
    console.log('eEmberController.sajatAdatokLekereses - KEZDÉS', { eemberId: req.user?.id });
    try {
      // eEmber ID kiolvasása a JWT middleware által beállított req.user-ből
      const eemberId = req.user?.id;

      // Bejelentkezés ellenőrzése
      if (!eemberId) {
        return res.status(401).json({
          success: false,
          message: 'Bejelentkezés szükséges'
        });
      }

      // Service hívás – friss adatok lekérése az adatbázisból
      const adatok = await eEmberService.sajatAdatokLekereses(eemberId);

      // 200 OK – sikeres lekérés
      res.status(200).json({
        success:    true,
        eemberNev:  adatok.eemberNev,   // Eembernév a sávhoz
        nev:        adatok.nev,          // Valódi név
        email:      adatok.email,        // Saját e-mail (beállítások modalhoz)
        // Meg van-e erősítve a cím — ebből mutatja a beállítások képernyő az
        // állapotot és dönti el, kell-e a „Cím megerősítése" gomb.
        emailMegerositve: adatok.emailMegerositve,
        lokacio:    adatok.lokacio,      // Ország / régió / település
        tudatpontok: adatok.tudatpontok  // Aktuális egyenleg
      });

      console.log('eEmberController.sajatAdatokLekereses - VÉGE (siker)', { eemberNev: adatok.eemberNev });

    } catch (error) {
      console.error('eEmberController.sajatAdatokLekereses - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ===== PROFIL-ADATOK MÓDOSÍTÁSA =====
  // A bejelentkezett eember valódi nevének és lokációjának módosítása
  // PUT /api/eember/adatok
  // @param {Object} req - Express request (body: nev, lokacio; req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async profilModositasa(req, res) {
    console.log('eEmberController.profilModositasa - KEZDÉS', { eemberId: req.user?.id });
    try {
      const frissitett = await eEmberService.profilModositasa(req.user.id, req.body);

      res.status(200).json({
        success: true,
        message: 'Profil-adatok mentve',
        eember:  frissitett
      });

      console.log('eEmberController.profilModositasa - VÉGE (siker)', { eemberId: req.user?.id });
    } catch (error) {
      console.error('eEmberController.profilModositasa - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== JELSZÓVÁLTÁS =====
  // A bejelentkezett eember jelszavának módosítása (régi jelszóval igazolva)
  // POST /api/eember/jelszovaltas
  // @param {Object} req - Express request (body: regiJelszo, ujJelszo)
  // @param {Object} res - Express response
  async jelszoValtas(req, res) {
    console.log('eEmberController.jelszoValtas - KEZDÉS', { eemberId: req.user?.id });
    try {
      const { regiJelszo, ujJelszo } = req.body;
      const eredmeny = await eEmberService.jelszoValtas(req.user.id, regiJelszo, ujJelszo);

      res.status(200).json({
        success: true,
        message: 'Jelszó sikeresen módosítva',
        // FRISS token: a jelszóváltás minden korábbi bejelentkezést érvénytelenített
        // (más eszközökön is). Ezt a tokent a kliens elmenti, így EZ a munkamenet
        // folytatódhat — az e-ember nem esik ki a saját jelszóváltásától.
        token: eredmeny.token
      });

      console.log('eEmberController.jelszoValtas - VÉGE (siker)', { eemberId: req.user?.id });
    } catch (error) {
      console.error('eEmberController.jelszoValtas - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== FIÓK-TÖRLÉS (ÖNKÉNTES) =====
  // A bejelentkezett e-ember saját fiókjának végleges törlése, a jelszavával igazolva.
  // DELETE /api/eember
  // @param {Object} req - Express request (body: jelszo; req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async eemberTorlese(req, res) {
    console.log('eEmberController.eemberTorlese - KEZDÉS', { eemberId: req.user?.id });
    try {
      const { jelszo } = req.body;
      await eEmberService.eemberTorlese(req.user.id, jelszo);

      res.status(200).json({
        success: true,
        message: 'A fiókod és a hozzá tartozó adatok törölve'
      });

      console.log('eEmberController.eemberTorlese - VÉGE (siker)', { eemberId: req.user?.id });
    } catch (error) {
      console.error('eEmberController.eemberTorlese - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== MEGERŐSÍTŐ LEVÉL KÉRÉSE =====
  // A bejelentkezett e-ember a beállításokban a „Cím megerősítése" gombbal kérte.
  // EZ A KÉRÉS maga a felhatalmazás a levél kiküldésére — a koino magától nem küld.
  // POST /api/eember/email-megerosites-keres
  // @param {Object} req - Express request (req.user az authMiddleware-től)
  // @param {Object} res - Express response
  async emailMegerositesKeres(req, res) {
    console.log('eEmberController.emailMegerositesKeres - KEZDÉS', { eemberId: req.user?.id });
    try {
      const eredmeny = await emailMegerositesService.megerositoLevelKuldese(req.user.id);

      res.status(200).json({
        success: true,
        kuldve:  eredmeny.kuldve,
        message: eredmeny.uzenet
      });

      console.log('eEmberController.emailMegerositesKeres - VÉGE (siker)', {
        eemberId: req.user?.id, kuldve: eredmeny.kuldve
      });
    } catch (error) {
      console.error('eEmberController.emailMegerositesKeres - VÉGE (hiba)', { hiba: error.message });
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ===== MEGERŐSÍTŐ HIVATKOZÁS BEVÁLTÁSA =====
  // A levélben lévő hivatkozás megnyitásakor a frontend hívja.
  // NYILVÁNOS végpont (nincs authMiddleware): a levelet más gépen, más böngészőben is
  // megnyithatja az e-ember, ahol nincs bejelentkezve. A biztonságot a token
  // kitalálhatatlansága adja (32 bájt véletlen), nem a bejelentkezés.
  // GET /api/eember/email-megerosites/:token
  // @param {Object} req - Express request (params: token)
  // @param {Object} res - Express response
  async emailMegerositesBevaltas(req, res) {
    console.log('eEmberController.emailMegerositesBevaltas - KEZDÉS');
    try {
      const eredmeny = await emailMegerositesService.tokenBevaltasa(req.params.token);

      // A sikertelen beváltás sem SZERVERHIBA: a hivatkozás lehet lejárt vagy már
      // felhasznált. 200-zal válaszolunk, a `sikeres` mező hordozza az eredményt —
      // így a frontend emberi üzenetet tud mutatni, nem hibaképernyőt.
      res.status(200).json({
        success:   true,
        sikeres:   eredmeny.sikeres,
        message:   eredmeny.uzenet,
        eemberNev: eredmeny.eemberNev ?? null
      });

      console.log('eEmberController.emailMegerositesBevaltas - VÉGE', { sikeres: eredmeny.sikeres });
    } catch (error) {
      console.error('eEmberController.emailMegerositesBevaltas - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: 'Szerver hiba a megerősítés során' });
    }
  }

  // ===== JELSZÓ-HELYREÁLLÍTÁS KÉRÉSE =====
  // A bejelentkezési képernyő „Elfelejtetted a jelszavad?" űrlapjáról.
  // NYILVÁNOS végpont — hiszen aki nem tud belépni, épp ezért használja.
  //
  // A VÁLASZ MINDIG UGYANAZ, akár létezik a megadott azonosító, akár nem. Ez nem
  // lustaság: különben a végpont KERESŐVÉ válna, amivel bárki kiderítheti, ki tagja a
  // koinónak. A tagság nem nyilvános adat.
  // POST /api/eember/jelszo-helyreallitas-keres
  // @param {Object} req - Express request (body: azonosito)
  // @param {Object} res - Express response
  async jelszoHelyreallitasKeres(req, res) {
    console.log('eEmberController.jelszoHelyreallitasKeres - KEZDÉS');
    try {
      const eredmeny = await jelszoHelyreallitasService.helyreallitasKerese(req.body?.azonosito);

      res.status(200).json({ success: true, message: eredmeny.uzenet });

      console.log('eEmberController.jelszoHelyreallitasKeres - VÉGE (semleges válasz elküldve)');
    } catch (error) {
      // Ide elvileg nem jutunk (a service maga nyeli a hibákat), de ha mégis:
      // itt is a semleges válasz megy vissza, nehogy a hiba árulkodjon.
      console.error('eEmberController.jelszoHelyreallitasKeres - VÉGE (hiba)', { hiba: error.message });
      res.status(200).json({
        success: true,
        message: 'Ha tartozik ehhez az azonosítóhoz megerősített e-mail cím, elküldtük rá a helyreállító hivatkozást.'
      });
    }
  }

  // ===== A HELYREÁLLÍTÓ HIVATKOZÁS ELLENŐRZÉSE =====
  // A frontend ezzel kérdezi meg, érdemes-e megmutatni az új-jelszó űrlapot.
  // GET /api/eember/jelszo-helyreallitas/:token
  // @param {Object} req - Express request (params: token)
  // @param {Object} res - Express response
  async jelszoHelyreallitasEllenorzes(req, res) {
    console.log('eEmberController.jelszoHelyreallitasEllenorzes - KEZDÉS');
    try {
      const eredmeny = await jelszoHelyreallitasService.tokenEllenorzese(req.params.token);

      res.status(200).json({
        success:   true,
        ervenyes:  eredmeny.ervenyes,
        message:   eredmeny.uzenet,
        eemberNev: eredmeny.eemberNev ?? null
      });

      console.log('eEmberController.jelszoHelyreallitasEllenorzes - VÉGE', { ervenyes: eredmeny.ervenyes });
    } catch (error) {
      console.error('eEmberController.jelszoHelyreallitasEllenorzes - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: 'Szerver hiba az ellenőrzés során' });
    }
  }

  // ===== ÚJ JELSZÓ BEÁLLÍTÁSA A HIVATKOZÁSRÓL =====
  // POST /api/eember/jelszo-helyreallitas
  // @param {Object} req - Express request (body: token, ujJelszo)
  // @param {Object} res - Express response
  async jelszoHelyreallitas(req, res) {
    console.log('eEmberController.jelszoHelyreallitas - KEZDÉS');
    try {
      const { token, ujJelszo } = req.body ?? {};
      const eredmeny = await jelszoHelyreallitasService.ujJelszoBeallitasa(token, ujJelszo);

      // A sikertelenség itt sem szerverhiba (lejárt hivatkozás, gyenge jelszó) — a
      // `sikeres` mező hordozza az eredményt, hogy a frontend emberi üzenetet mutasson.
      res.status(200).json({
        success: true,
        sikeres: eredmeny.sikeres,
        message: eredmeny.uzenet
      });

      console.log('eEmberController.jelszoHelyreallitas - VÉGE', { sikeres: eredmeny.sikeres });
    } catch (error) {
      console.error('eEmberController.jelszoHelyreallitas - VÉGE (hiba)', { hiba: error.message });
      res.status(500).json({ success: false, message: 'Szerver hiba a jelszó beállítása során' });
    }
  }

}

// ===== EXPORTÁLÁS =====
// Controller osztály SINGLETON példány exportálása
module.exports = new eEmberController();