// backend/repositories/emberRepository.js

// ===== EMBER MODEL IMPORTÁLÁSA =====
// A Mongoose model, ami az adatbázis struktúrát definiálja
const Ember = require('../models/ember');

// ===== EMBER REPOSITORY OSZTÁLY =====
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class EmberRepository {
  
  // ===== REGISZTRÁCIÓHOZ SZÜKSÉGES MŰVELETEK =====
  
  // ----- ÚJ EMBER LÉTREHOZÁSA -----
  /**
   * Új ember mentése az adatbázisba
   * @param {Object} adatok - Ember adatai (email, jelszó, név, stb.)
   * @returns {Promise<Object>} Létrehozott ember dokumentum
   */
  async create(adatok) {
    // Új Mongoose dokumentum példány létrehozása
    const ember = new Ember(adatok);
    
    // Mentés az adatbázisba (MongoDB insert művelet)
    return await ember.save();
  }
  
  // ----- EMBER KERESÉSE EMAIL ALAPJÁN -----
  /**
   * Ember keresése email cím alapján
   * Használat: Email foglaltság ellenőrzése regisztrációkor + bejelentkezés
   * @param {string} email - Email cím
   * @returns {Promise<Object|null>} Ember dokumentum vagy null
   */
  async findByEmail(email) {
    // MongoDB findOne művelet email alapján
    // Email már kisbetűsítve van a model-ben (lowercase: true)
    
    return await Ember.findOne({ email: email.toLowerCase() });
  }
  
  // ----- EMBER KERESÉSE EMBERNÉV ALAPJÁN -----
  /**
   * Ember keresése embernév alapján
   * Használat: Embernév foglaltság ellenőrzése regisztrációkor
   * @param {string} emberNev - Embernév
   * @returns {Promise<Object|null>} Ember dokumentum vagy null
   */
  async findByEmberNev(emberNev) {
    // MongoDB findOne művelet embernév alapján
    return await Ember.findOne({ emberNev: emberNev });
  }
  
  // ===== BEJELENTKEZÉSHEZ SZÜKSÉGES MŰVELETEK =====
  
  // ----- EMBER KERESÉSE ID ALAPJÁN -----
  /**
   * Ember keresése MongoDB ObjectId alapján
   * Használat: Token alapú authentikáció (JWT payload-ból ID)
   * @param {string} id - MongoDB ObjectId (_id mező)
   * @returns {Promise<Object|null>} Ember dokumentum vagy null
   */
  async findById(id) {
    // MongoDB findById művelet
    // Visszaadja a dokumentumot vagy null-t ha nem találja
    return await Ember.findById(id);
  }
  
  // ----- UTOLSÓ BEJELENTKEZÉS FRISSÍTÉSE -----
  /**
   * Ember utolsó bejelentkezési idejének frissítése
   * Használat: Bejelentkezés után rögzítjük az időpontot
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>} Frissített ember
   */
  async updateUtolsoBejelentkezes(id) {
    // MongoDB findByIdAndUpdate - csak az utolsoBejelentkezes mező frissítése
    return await Ember.findByIdAndUpdate(
      id,
      { utolsoBejelentkezes: new Date() },  // Jelenlegi időpont
      { new: true }                          // Frissített dokumentum visszaadása
    );
  }
  
}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new EmberRepository();
