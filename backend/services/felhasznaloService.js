// backend/services/emberService.js

// ===== IMPORTOK =====
// Repository: Adatbázis műveletek
const EmberRepository = require('../repositories/emberRepository');

// Helper: Jelszó műveletek (hash, összehasonlítás, validáció)
const JelszoHelper = require('../utils/jelszoHelper');

// JWT: JSON Web Token generáláshoz és ellenőrzéshez
const jwt = require('jsonwebtoken');

// ===== EMBER SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az ÜZLETI LOGIKÁT
// Validációk, több lépéses folyamatok, szabályok végrehajtása
class EmberService {
  
  // ===== REGISZTRÁCIÓ (FRISSÍTVE!) =====
  /**
   * Új ember regisztrációja
   * Lépések:
   * 1. Email foglaltság ellenőrzése
   * 2. Embernév foglaltság ellenőrzése
   * 3. Jelszó erősség validálása
   * 4. Jelszó hash-elése
   * 5. Ember létrehozása adatbázisban
   * 6. Jelszó eltávolítása a válaszból
   * 
   * @param {Object} adatok - { emberNev, email, jelszo, nev, lokacio }
   * @returns {Promise<Object>} Létrehozott ember (jelszó nélkül)
   * @throws {Error} Ha email vagy embernév már létezik, vagy jelszó gyenge
   */
  async regisztracio(adatok) {

    console.log("=================================== regisztracio:: ", {
      adatok: adatok
    });
    
    
    // === 1. LÉPÉS: EMAIL FOGLALTSÁG ELLENŐRZÉSE ===
    // ÜZLETI SZABÁLY: Egy email cím csak egyszer használható
    console.log("regisztracio >>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.findByEmail", {
      email: adatok.email
    });
    
    const emailLetezik = await EmberRepository.findByEmail(adatok.email);
    if (emailLetezik) {
      // Ha már létezik, hibát dobunk
      throw new Error('Ez az email cím már használatban van');
    }
    
    // === 2. LÉPÉS: EMBERNÉV FOGLALTSÁG ELLENŐRZÉSE ===
    // ÜZLETI SZABÁLY: Egy embernév csak egyszer használható

    console.log("regisztracio >>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.findByEmberNev", {
      emberNev: adatok.emberNev
    });
    const nevFoglalt = await EmberRepository.findByEmberNev(adatok.emberNev);
    if (nevFoglalt) {
      // Ha már létezik, hibát dobunk
      throw new Error('Ez a embernév már foglalt');
    }
    
    // === 3. LÉPÉS: JELSZÓ ERŐSSÉG VALIDÁLÁSA ===
    // ÜZLETI SZABÁLY: Jelszónak erősnek kell lennie (min 8 kar, nagybetű, kisbetű, szám, speciális)
    const jelszoErosseg = JelszoHelper.validalJelszoErosseg(adatok.jelszo);
    if (!jelszoErosseg.ervényes) {
      // Ha gyenge a jelszó, hibát dobunk az összes hibaüzenettel
      throw new Error(`Gyenge jelszó: ${jelszoErosseg.hibak.join(', ')}`);
    }
    
    // === 4. LÉPÉS: JELSZÓ HASH-ELÉSE ===
    // Biztonsági okokból a jelszót hash-elve tároljuk (bcrypt)

    console.log("regisztracio >>>>>>>>>>>>>>>>>>>>>>>>> JelszoHelper.hashJelszo", {
      jelszo: adatok.jelszo
    });
    const hashedJelszo = await JelszoHelper.hashJelszo(adatok.jelszo);
    
    // === 5. LÉPÉS: EMBER LÉTREHOZÁSA ADATBÁZISBAN ===
    // Repository hívás: csak technikai mentés, nincs validáció

    console.log("regisztracio >>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.create", {
      emberNev: adatok.emberNev,
      email: adatok.email,
      jelszo: hashedJelszo,     
      nev: adatok.nev,
      lokacio: adatok.lokacio
    });
    const ujEmber = await EmberRepository.create({
      emberNev: adatok.emberNev,
      email: adatok.email,
      jelszo: hashedJelszo,        // ← Hash-elt jelszó!
      nev: adatok.nev,
      lokacio: adatok.lokacio
    });
    
    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    // BIZTONSÁGI SZABÁLY: Jelszó (még hash-elve is) nem mehet ki a válaszban
    const valasz = ujEmber.toObject(); // Mongoose dokumentum -> plain objektum
    delete valasz.jelszo;                     // Jelszó mező törlése
    
    // Tisztított ember objektum visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<< regisztracio===valasz: ", {
      valasz: valasz
    });
    
    return valasz;
  }
  
  // ===== BEJELENTKEZÉS (NEM VÁLTOZOTT) =====
  /**
   * Ember bejelentkezése
   * Lépések:
   * 1. Ember keresése email alapján
   * 2. Jelszó ellenőrzése (hash összehasonlítás)
   * 3. Utolsó bejelentkezés időpontjának frissítése
   * 4. JWT token generálása
   * 5. Jelszó eltávolítása a válaszból
   * 
   * @param {string} email - Email cím
   * @param {string} jelszo - Egyszerű szöveges jelszó
   * @returns {Promise<Object>} { ember, token }
   * @throws {Error} Ha email nem létezik vagy jelszó helytelen
   */
  async bejelentkezes(email, jelszo) {

    console.log("=================================== bejelentkezes:: ", {
      email: email,
      jelszo: jelszo
    });
    
    
    // === 1. LÉPÉS: EMBER KERESÉSE EMAIL ALAPJÁN ===
    console.log("bejelentkezes >>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.findByEmail", {
      email: email
    });
    const ember = await EmberRepository.findByEmail(email);
    
    if (!ember) {
      // BIZTONSÁGI SZABÁLY: Ne árulj el, hogy az email nem létezik!
      // Általános hibaüzenetet dobunk (támadók ne tudják, mely emailek léteznek)
      throw new Error('Hibás email vagy jelszó');
    }
    
    // === 2. LÉPÉS: JELSZÓ ELLENŐRZÉSE ===
    // bcrypt.compare: összehasonlítja az egyszerű jelszót a hash-sel
    console.log("bejelentkezes >>>>>>>>>>>>>>>>>>>>>>>>> JelszoHelper.osszehasonlitJelszo", {
      jelszo: jelszo,
      ember_jelszo: ember.jelszo
    });
    const jelszoHelyes = await JelszoHelper.osszehasonlitJelszo(jelszo, ember.jelszo);
    if (!jelszoHelyes) {
      // BIZTONSÁGI SZABÁLY: Ugyanaz az üzenet, mint az email hibánál
      throw new Error('Hibás email vagy jelszó');
    }
    
    // === 3. LÉPÉS: UTOLSÓ BEJELENTKEZÉS FRISSÍTÉSE ===
    // ÜZLETI SZABÁLY: Rögzítjük, mikor jelentkezett be utoljára

    console.log("bejelentkezes >>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.updateUtolsoBejelentkezes", {
      ember: ember._id
    });
    await EmberRepository.updateUtolsoBejelentkezes(ember._id);
    
    // === 4. LÉPÉS: JWT TOKEN GENERÁLÁSA ===
    // JWT payload: ember adatai, amiket a tokenbe csomagolunk
    const payload = {
      id: ember._id,              // Ember ID
      email: ember.email,         // Email
      emberNev: ember.emberNev  // Embernév
    };
    
    // Token generálása
    // jwt.sign(payload, titkos_kulcs, opciók)
    const token = jwt.sign(
      payload,                          // Adat, amit a tokenbe rakunk
      process.env.JWT_SECRET,           // Titkos kulcs (környezeti változóból)
      { expiresIn: '7d' }               // Token érvényessége: 7 nap
    );
    
    // === 5. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    // BIZTONSÁGI SZABÁLY: Jelszó nem mehet ki a válaszban
    const valasz = ember.toObject();  // Mongoose dokumentum -> plain objektum
    delete valasz.jelszo;                    // Jelszó mező törlése
    
    // Ember és token visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<< bejelentkezes====Eredmény: ", {
      ember: valasz,  
      token: token 
    });
    
    return {
      ember: valasz,    // Ember adatok (jelszó nélkül)
      token: token            // JWT token (authentikációhoz)
    };
  }
  
  // ===== TOKEN ELLENŐRZÉSE (NEM VÁLTOZOTT) =====
  /**
   * JWT token validálása és ember lekérése
   * Használat: Védett route-oknál middleware-ben
   * 
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Ember objektum
   * @throws {Error} Ha token érvénytelen vagy lejárt
   */
  async ellenorizToken(token) {

    console.log("=================================== ellenorizToken:: ", {
      token: token
    });
    
    try {
      // Token dekódolása és validálása
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Ember lekérése a token-ben lévő ID alapján

      console.log("ellenorizToken >>>>>>>>>>>>>>>>>>>>>>>>>>>> EmberRepository.findById", {
        decoded: decoded.id
      });
      
      const ember = await EmberRepository.findById(decoded.id);
      
      if (!ember) {
        throw new Error('Ember nem található');
      }
      
      // Jelszó eltávolítása
      const valasz = ember.toObject();
      delete valasz.jelszo;

      console.log("<<<<<<<<<<<<<<<<<<< ellenorizToken====valasz: ", {
        valasz: valasz
      });
      
      
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
module.exports = new EmberService();
