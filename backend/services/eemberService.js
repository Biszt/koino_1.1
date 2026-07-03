// backend/services/eemberService.js

// ===== IMPORTOK =====
// Repository: Adatbázis műveletek
const eEmberRepository = require('../repositories/eemberRepository');

// Helper: Jelszó műveletek (hash, összehasonlítás, validáció)
const JelszoHelper = require('../utils/jelszoHelper');

// JWT: JSON Web Token generáláshoz és ellenőrzéshez
const jwt = require('jsonwebtoken');

// ===== EMBER SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az ÜZLETI LOGIKÁT
// Validációk, több lépéses folyamatok, szabályok végrehajtása
class eEmberService {

  // ===== REGISZTRÁCIÓ =====
  // Új eember regisztrációja
  // Lépések: email/eembernév foglaltság, jelszó erősség, hash, mentés
  // @param {Object} adatok - { eemberNev, email, jelszo, nev, lokacio }
  // @returns {Promise} Létrehozott eember (jelszó nélkül)
  async regisztracio(adatok) {
    console.log('eEmberService.regisztracio - KEZDÉS', { eemberNev: adatok.eemberNev, email: adatok.email });

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
      lokacio:   adatok.lokacio
    });

    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    // BIZTONSÁGI SZABÁLY: Jelszó (még hash-elve is) nem mehet ki a válaszban
    const valasz = ujeEmber.toObject(); // Mongoose dokumentum -> plain objektum
    delete valasz.jelszo;               // Jelszó mező törlése

    console.log('eEmberService.regisztracio - VÉGE', { id: valasz._id });
    return valasz;
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
    // Jelszót és egyéb érzékeny adatot NEM adunk vissza
    const valasz = {
      eemberNev:   eember.eemberNev,   // Megjelenítendő felhasználónév
      nev:         eember.nev,          // Valódi név
      tudatpontok: eember.tudatpontok   // Aktuális tudatpont egyenleg
    };

    console.log('eEmberService.sajatAdatokLekereses - VÉGE', { eemberNev: valasz.eemberNev, tudatpontok: valasz.tudatpontok });
    return valasz;
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