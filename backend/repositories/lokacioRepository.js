// backend/repositories/lokacioRepository.js

// ===== EMBER MODEL IMPORTÁLÁSA =====
const eEmber = require('../models/eember');

// ===== LOKÁCIÓ REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a lokáció adatok lekérdezéséért
class LokacioRepository {
  
  // ----- ORSZÁG NEVEK KERESÉSE -----
  /**
   * Egyedi ország nevek lekérdezése az adatbázisból
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Országnevek tömb
   */
  async findOrszagok(keresesiSzoveg) {
    // Regex létrehozása (case-insensitive, kezdődik a keresési szöveggel)
    const regex = new RegExp(`^${keresesiSzoveg}`, 'i');
    
    // MongoDB aggregáció: distinct országnevek, amik illeszkednek
    const orszagok = await eEmber.distinct('lokacio.orszag', {
      'lokacio.orszag': regex
    });
    
    // Maximum 10 találat visszaadása, rendezve ABC szerint
    return orszagok.sort().slice(0, 10);
  }
  
  // ----- RÉGIÓ NEVEK KERESÉSE -----
  /**
   * Egyedi régió nevek lekérdezése az adatbázisból
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Régiónevek tömb
   */
  async findRegiok(keresesiSzoveg) {
    // Regex létrehozása (case-insensitive, kezdődik a keresési szöveggel)
    const regex = new RegExp(`^${keresesiSzoveg}`, 'i');
    
    // MongoDB aggregáció: distinct régiónevek, amik illeszkednek
    const regiok = await eEmber.distinct('lokacio.regio', {
      'lokacio.regio': regex
    });
    
    // Maximum 10 találat visszaadása, rendezve ABC szerint
    return regiok.sort().slice(0, 10);
  }
  
  // ----- TELEPÜLÉS NEVEK KERESÉSE -----
  /**
   * Egyedi település nevek lekérdezése az adatbázisból
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Településnevek tömb
   */
  async findTelepulesek(keresesiSzoveg) {
    // Regex létrehozása (case-insensitive, kezdődik a keresési szöveggel)
    const regex = new RegExp(`^${keresesiSzoveg}`, 'i');
    
    // MongoDB aggregáció: distinct településnevek, amik illeszkednek
    const telepulesek = await eEmber.distinct('lokacio.telepules', {
      'lokacio.telepules': regex
    });
    
    // Maximum 10 találat visszaadása, rendezve ABC szerint
    return telepulesek.sort().slice(0, 10);
  }
}

// Repository exportálása
module.exports = new LokacioRepository();
