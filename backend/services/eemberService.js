// backend/services/eemberService.js

// ===== IMPORTOK =====
// Repository: Adatbázis műveletek
const eEmberRepository = require('../repositories/eemberRepository');

// Helper: Jelszó műveletek (hash, összehasonlítás, validáció)
const JelszoHelper = require('../utils/jelszoHelper');

// JWT: JSON Web Token generáláshoz és ellenőrzéshez
const jwt = require('jsonwebtoken');

// Meghívó service: meghívásos regisztráció (MEGHIVAS_KOTELEZO kapcsoló)
const MeghivoService = require('./meghivoService');

// ===== EMBER SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az ÜZLETI LOGIKÁT
// Validációk, több lépéses folyamatok, szabályok végrehajtása
class eEmberService {

  // ===== REGISZTRÁCIÓ =====
  // Új eember regisztrációja
  // Lépések: (meghívó kód, ha kötelező), email/eembernév foglaltság,
  // jelszó erősség, hash, mentés, meghívó felhasználtra állítása
  // @param {Object} adatok - { eemberNev, email, jelszo, nev, lokacio, meghivoKod }
  // @returns {Promise} Létrehozott eember (jelszó nélkül)
  async regisztracio(adatok) {
    console.log('eEmberService.regisztracio - KEZDÉS', { eemberNev: adatok.eemberNev, email: adatok.email });

    // === 0. LÉPÉS: MEGHÍVÓ KÓD ELLENŐRZÉSE (ha a kapcsoló be van kapcsolva) ===
    // MEGHIVAS_KOTELEZO=true esetén érvényes, Aktiv meghívó kód kell a
    // regisztrációhoz. A kódot itt csak ÉRVÉNYESÍTJÜK — felhasználtra majd a
    // sikeres mentés UTÁN állítjuk (6.b lépés), hogy hibás regisztráció ne
    // költse el a meghívót.
    let meghivo = null;
    if (MeghivoService.meghivasKotelezoE()) {
      meghivo = await MeghivoService.kodErvenyesitese(adatok.meghivoKod);
    }

    // === 1. LÉPÉS: EMAIL FOGLALTSÁG ELLENŐRZÉSE ===
    // ÜZLETI SZABÁLY: Egy email cím csak egyszer használható
    const emailLetezik = await eEmberRepository.findByEmail(adatok.email);
    if (emailLetezik) {
      throw new Error('Ez az email cím már használatban van');
    }

    // === 2. LÉPÉS: EMBERNÉV FOGLALTSÁG ELLENŐRZÉSE ===
    // ÜZLETI SZABÁLY: Egy eembernév csak egyszer használható
    const nevFoglalt = await eEmberRepository.findByeEmberNev(adatok.eemberNev);
    if (nevFoglalt) {
      throw new Error('Ez a eembernév már foglalt');
    }

    // === 3. LÉPÉS: JELSZÓ ERŐSSÉG VALIDÁLÁSA ===
    // ÜZLETI SZABÁLY: Jelszónak erősnek kell lennie
    const jelszoErosseg = JelszoHelper.validalJelszoErosseg(adatok.jelszo);
    if (!jelszoErosseg.ervényes) {
      throw new Error(`Gyenge jelszó: ${jelszoErosseg.hibak.join(', ')}`);
    }

    // === 4. LÉPÉS: JELSZÓ HASH-ELÉSE ===
    // Biztonsági okokból a jelszót hash-elve tároljuk (bcrypt)
    const hashedJelszo = await JelszoHelper.hashJelszo(adatok.jelszo);

    // === 5. LÉPÉS: EMBER LÉTREHOZÁSA ADATBÁZISBAN ===
    // Repository hívás: csak technikai mentés, nincs validáció
    const ujeEmber = await eEmberRepository.create({
      eemberNev: adatok.eemberNev,
      email:     adatok.email,
      jelszo:    hashedJelszo, // ← Hash-elt jelszó!
      nev:       adatok.nev,
      lokacio:   adatok.lokacio,
      // A bizalmi gráf első éle: ki hívta meg (null, ha nyílt a regisztráció)
      meghivoEemberId: meghivo ? meghivo.kibocsatoEemberId : null
    });

    // === 5.b LÉPÉS: MEGHÍVÓ FELHASZNÁLTRA ÁLLÍTÁSA ===
    // Csak sikeres mentés után — a kód innentől nem használható újra
    if (meghivo) {
      await MeghivoService.kodFelhasznalasa(meghivo, ujeEmber._id);
    }

    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    // BIZTONSÁGI SZABÁLY: Jelszó (még hash-elve is) nem mehet ki a válaszban
    const valasz = ujeEmber.toObject(); // Mongoose dokumentum -> plain objektum
    delete valasz.jelszo;               // Jelszó mező törlése

    // === 7. LÉPÉS: JWT TOKEN GENERÁLÁSA ===
    // A bejelentkezéssel megegyező payload, hogy regisztráció után rögtön be legyen jelentkezve
    const payload = {
      id:        valasz._id,
      email:     valasz.email,
      eemberNev: valasz.eemberNev
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('eEmberService.regisztracio - VÉGE', { id: valasz._id });
    return { eember: valasz, token };
  }

  // ===== BEJELENTKEZÉS =====
  // eEmber bejelentkezése email CÍM vagy eemberNev alapján
  // @param {string} azonosito - Email cím VAGY eemberNev
  // @param {string} jelszo - Egyszerű szöveges jelszó
  // @returns {Promise} { eember, token }
  async bejelentkezes(azonosito, jelszo) {
    console.log('eEmberService.bejelentkezes - KEZDÉS', { azonosito });

    // === 1. LÉPÉS: AZONOSÍTÓ TÍPUSÁNAK MEGHATÁROZÁSA ===
    // Ha tartalmaz '@' karaktert, email cím – különben eemberNev
    const emailE = azonosito.includes('@');

    // === 2. LÉPÉS: EEMBER KERESÉSE ===
    // Email esetén findByEmail, eemberNev esetén findByeEmberNev
    let eember;
    if (emailE) {
      eember = await eEmberRepository.findByEmail(azonosito);
    } else {
      eember = await eEmberRepository.findByeEmberNev(azonosito);
    }

    if (!eember) {
      // BIZTONSÁGI SZABÁLY: ne áruljuk el, melyik mező hibás
      throw new Error('Hibás azonosító vagy jelszó');
    }

    // === 3. LÉPÉS: JELSZÓ ELLENŐRZÉSE ===
    const jelszoHelyes = await JelszoHelper.osszehasonlitJelszo(jelszo, eember.jelszo);
    if (!jelszoHelyes) {
      throw new Error('Hibás azonosító vagy jelszó');
    }

    // === 4. LÉPÉS: UTOLSÓ BEJELENTKEZÉS FRISSÍTÉSE ===
    await eEmberRepository.updateUtolsoBejelentkezes(eember._id);

    // === 5. LÉPÉS: JWT TOKEN GENERÁLÁSA ===
    // A token payload-ba kerül az ID, email és eemberNev
    const payload = {
      id:        eember._id,
      email:     eember.email,
      eemberNev: eember.eemberNev
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    const valasz = eember.toObject();
    delete valasz.jelszo;

    console.log('eEmberService.bejelentkezes - VÉGE', { eemberNev: valasz.eemberNev });
    return { eember: valasz, token };
  }

  // ===== SAJÁT ADATOK LEKÉRÉSE =====
  // A bejelentkezett eember aktuális adatainak lekérése
  // Használat: Főoldal statisztika sáv - eemberNev, tudatpontok
  // @param {string} eemberId - JWT-ből kiolvasott MongoDB ObjectId
  // @returns {Promise} { eemberNev, nev, tudatpontok }
  async sajatAdatokLekereses(eemberId) {
    console.log('eEmberService.sajatAdatokLekereses - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: EEMBER KERESÉSE AZ ADATBÁZISBAN ===
    // Az ID alapján lekérjük a friss adatokat (tudatpont változhatott!)
    const eember = await eEmberRepository.findById(eemberId);

    // === 2. LÉPÉS: LÉTEZÉS ELLENŐRZÉSE ===
    if (!eember) {
      throw new Error('eEmber nem található');
    }

    // === 3. LÉPÉS: CSAK A SZÜKSÉGES MEZŐK VISSZAADÁSA ===
    // Jelszót NEM adunk vissza. Az e-mail és a lokáció a SAJÁT adat (a végpont
    // auth-os, csak a bejelentkezett e-ember kapja) — az eember beállítások
    // modal (terv 8. pont) tölti ki belőlük az űrlapot.
    const valasz = {
      eemberNev:   eember.eemberNev,   // Megjelenítendő felhasználónév
      nev:         eember.nev,          // Valódi név
      email:       eember.email,        // Saját e-mail (más felé SOHA nem megy ki)
      lokacio:     eember.lokacio,      // Ország / régió / település
      tudatpontok: eember.tudatpontok   // Aktuális tudatpont egyenleg
    };

    console.log('eEmberService.sajatAdatokLekereses - VÉGE', { eemberNev: valasz.eemberNev, tudatpontok: valasz.tudatpontok });
    return valasz;
  }

  // ===== PROFIL-ADATOK MÓDOSÍTÁSA =====
  // Az eember beállítások (terv 8. pont): a valódi név és a lokáció módosítható.
  // Az eemberNev és az e-mail v1-ben NEM módosítható (azonosítók).
  // @param {string} eemberId - A bejelentkezett e-ember azonosítója
  // @param {Object} adatok - { nev, lokacio: { orszag, regio, telepules } }
  // @returns {Promise} Frissített adatok (jelszó nélkül)
  async profilModositasa(eemberId, adatok) {
    console.log('eEmberService.profilModositasa - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: VALIDÁLÁS ===
    const nev = adatok?.nev?.trim();
    const lokacio = adatok?.lokacio ?? {};
    if (!nev) {
      throw new Error('A valódi név megadása kötelező');
    }
    if (!lokacio.orszag?.trim() || !lokacio.regio?.trim() || !lokacio.telepules?.trim()) {
      throw new Error('Az ország, régió és település megadása kötelező');
    }

    // === 2. LÉPÉS: MENTÉS ===
    const frissitett = await eEmberRepository.updateProfil(eemberId, {
      nev,
      lokacio: {
        orszag:    lokacio.orszag.trim(),
        regio:     lokacio.regio.trim(),
        telepules: lokacio.telepules.trim()
      }
    });
    if (!frissitett) {
      throw new Error('eEmber nem található');
    }

    // === 3. LÉPÉS: JELSZÓ NÉLKÜLI VÁLASZ ===
    const valasz = frissitett.toObject();
    delete valasz.jelszo;

    console.log('eEmberService.profilModositasa - VÉGE', { eemberId });
    return valasz;
  }

  // ===== JELSZÓVÁLTÁS =====
  // Csak a RÉGI jelszó helyes megadásával — az új jelszóra ugyanaz az
  // erősség-szabály érvényes, mint regisztrációkor.
  // @param {string} eemberId - A bejelentkezett e-ember azonosítója
  // @param {string} regiJelszo - A jelenlegi jelszó
  // @param {string} ujJelszo - Az új jelszó
  // @returns {Promise<boolean>} true, ha sikeres
  async jelszoValtas(eemberId, regiJelszo, ujJelszo) {
    console.log('eEmberService.jelszoValtas - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: PARAMÉTEREK ===
    if (!regiJelszo || !ujJelszo) {
      throw new Error('A jelenlegi és az új jelszó megadása is kötelező');
    }

    // === 2. LÉPÉS: EEMBER + RÉGI JELSZÓ ELLENŐRZÉSE ===
    const eember = await eEmberRepository.findById(eemberId);
    if (!eember) {
      throw new Error('eEmber nem található');
    }
    const regiHelyes = await JelszoHelper.osszehasonlitJelszo(regiJelszo, eember.jelszo);
    if (!regiHelyes) {
      throw new Error('A jelenlegi jelszó nem megfelelő');
    }

    // === 3. LÉPÉS: ÚJ JELSZÓ ERŐSSÉGE ===
    const jelszoErosseg = JelszoHelper.validalJelszoErosseg(ujJelszo);
    if (!jelszoErosseg.ervényes) {
      throw new Error(`Gyenge jelszó: ${jelszoErosseg.hibak.join(', ')}`);
    }

    // === 4. LÉPÉS: HASH + MENTÉS ===
    const hashedJelszo = await JelszoHelper.hashJelszo(ujJelszo);
    await eEmberRepository.updateJelszo(eemberId, hashedJelszo);

    console.log('eEmberService.jelszoValtas - VÉGE', { eemberId });
    return true;
  }

  // ===== TOKEN ELLENŐRZÉSE =====
  // JWT token validálása és eember lekérése
  // Használat: Védett route-oknál middleware-ben
  // @param {string} token - JWT token
  // @returns {Promise} eEmber objektum
  async ellenorizToken(token) {
    console.log('eEmberService.ellenorizToken - KEZDÉS');

    try {
      // Token dekódolása és validálása
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // eEmber lekérése a token-ben lévő ID alapján
      const eember = await eEmberRepository.findById(decoded.id);

      if (!eember) {
        throw new Error('eEmber nem található');
      }

      // Jelszó eltávolítása
      const valasz = eember.toObject();
      delete valasz.jelszo;

      console.log('eEmberService.ellenorizToken - VÉGE', { eemberNev: valasz.eemberNev });
      return valasz;

    } catch (error) {
      // JWT hibák: TokenExpiredError, JsonWebTokenError
      if (error.name === 'TokenExpiredError') {
        throw new Error('A token lejárt');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Érvénytelen token');
      } else {
        throw error;
      }
    }
  }

}

// ===== EXPORTÁLÁS =====
// Service osztály SINGLETON példány exportálása
module.exports = new eEmberService();