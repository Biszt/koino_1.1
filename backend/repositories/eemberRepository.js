// backend/repositories/eemberRepository.js

// ===== EMBER MODEL IMPORTÁLÁSA =====
// A Mongoose model, ami az adatbázis struktúrát definiálja
const eEmber = require('../models/eember');

// ===== EMBER REPOSITORY OSZTÁLY =====
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class eEmberRepository {

  // ===== REGISZTRÁCIÓHOZ SZÜKSÉGES MŰVELETEK =====

  // ----- ÚJ EMBER LÉTREHOZÁSA -----
  // Új eember mentése az adatbázisba
  // @param {Object} adatok - eEmber adatai (email, jelszó, név, stb.)
  // @returns {Promise} Létrehozott eember dokumentum
  async create(adatok) {
    console.log('eEmberRepository.create - KEZDÉS', { eemberNev: adatok.eemberNev });

    // Új Mongoose dokumentum példány létrehozása
    const eember = new eEmber(adatok);

    // Mentés az adatbázisba (MongoDB insert művelet)
    const eredmeny = await eember.save();

    console.log('eEmberRepository.create - VÉGE', { id: eredmeny._id });
    return eredmeny;
  }

  // ----- EMBER KERESÉSE EMAIL ALAPJÁN -----
  // eEmber keresése email cím alapján
  // Használat: Email foglaltság ellenőrzése regisztrációkor + bejelentkezés
  // @param {string} email - Email cím
  // @returns {Promise} eEmber dokumentum vagy null
  async findByEmail(email) {
    console.log('eEmberRepository.findByEmail - KEZDÉS', { email });

    // MongoDB findOne művelet email alapján
    // Email már kisbetűsítve van a model-ben (lowercase: true)
    const eredmeny = await eEmber.findOne({ email: email.toLowerCase() });

    console.log('eEmberRepository.findByEmail - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ----- EMBER KERESÉSE EMBERNÉV ALAPJÁN -----
  // eEmber keresése eembernév alapján
  // Használat: eEmbernév foglaltság ellenőrzése regisztrációkor
  // @param {string} eemberNev - eEmbernév
  // @returns {Promise} eEmber dokumentum vagy null
  async findByeEmberNev(eemberNev) {
    console.log('eEmberRepository.findByeEmberNev - KEZDÉS', { eemberNev });

    // MongoDB findOne művelet eembernév alapján
    const eredmeny = await eEmber.findOne({ eemberNev: eemberNev });

    console.log('eEmberRepository.findByeEmberNev - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ===== BEJELENTKEZÉSHEZ SZÜKSÉGES MŰVELETEK =====

  // ----- EMBER KERESÉSE ID ALAPJÁN -----
  // eEmber keresése MongoDB ObjectId alapján
  // Használat: Token alapú authentikáció (JWT payload-ból ID)
  // @param {string} id - MongoDB ObjectId (_id mező)
  // @returns {Promise} eEmber dokumentum vagy null
  async findById(id) {
    console.log('eEmberRepository.findById - KEZDÉS', { id });

    // MongoDB findById művelet
    // Visszaadja a dokumentumot vagy null-t ha nem találja
    const eredmeny = await eEmber.findById(id);

    console.log('eEmberRepository.findById - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ----- UTOLSÓ BEJELENTKEZÉS FRISSÍTÉSE -----
  // eEmber utolsó bejelentkezési idejének frissítése
  // Használat: Bejelentkezés után rögzítjük az időpontot
  // @param {string} id - MongoDB ObjectId
  // @returns {Promise} Frissített eember
  async updateUtolsoBejelentkezes(id) {
    console.log('eEmberRepository.updateUtolsoBejelentkezes - KEZDÉS', { id });

    // MongoDB findByIdAndUpdate - csak az utolsoBejelentkezes mező frissítése
    const eredmeny = await eEmber.findByIdAndUpdate(
      id,
      { utolsoBejelentkezes: new Date() }, // Jelenlegi időpont
      { new: true }                         // Frissített dokumentum visszaadása
    );

    console.log('eEmberRepository.updateUtolsoBejelentkezes - VÉGE', { id: eredmeny?._id });
    return eredmeny;
  }

  // ----- EEMBEREK SZÁMLÁLÁSA -----
  // A platformon regisztrált összes eember számának lekérése
  // Használat: Főoldal statisztika sávhoz
  // @returns {Promise<number>} eemberek száma
  async countAll() {
    console.log('eEmberRepository.countAll - KEZDÉS');

    // MongoDB countDocuments - összes dokumentum megszámlálása
    const szam = await eEmber.countDocuments();

    console.log('eEmberRepository.countAll - VÉGE', { szam });
    return szam;
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new eEmberRepository();