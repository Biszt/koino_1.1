// backend/services/lokacioService.js

// ===== REPOSITORY IMPORTÁLÁSA =====
const LokacioRepository = require('../repositories/lokacioRepository');

// ===== LOKÁCIÓ SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az üzleti logikát
class LokacioService {
  
  // ----- ORSZÁG JAVASLATOK LEKÉRÉSE -----
  /**
   * Ország javaslatok lekérdezése keresési szöveg alapján
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Országnevek tömb
   */
  async getOrszagJavaslatok(keresesiSzoveg) {

    console.log("getOrszagJavaslatok:: ", {
      keresesiSzoveg: keresesiSzoveg
    });
    
    // Validáció: minimum 2 karakter szükséges
    if (!keresesiSzoveg) {
      return [];
    }
    
    // Repository hívás
    return await LokacioRepository.findOrszagok(keresesiSzoveg);
  }
  
  // ----- RÉGIÓ JAVASLATOK LEKÉRÉSE -----
  /**
   * Régió javaslatok lekérdezése keresési szöveg alapján
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Régiónevek tömb
   */
  async getRegioJavaslatok(keresesiSzoveg) {

    console.log("getRegioJavaslatok:: ", {
      keresesiSzoveg: keresesiSzoveg
    });
    
    // Validáció: minimum 2 karakter szükséges
    if (!keresesiSzoveg) {
      return [];
    }
    
    // Repository hívás
    return await LokacioRepository.findRegiok(keresesiSzoveg);
  }
  
  // ----- TELEPÜLÉS JAVASLATOK LEKÉRÉSE -----
  /**
   * Település javaslatok lekérdezése keresési szöveg alapján
   * @param {string} keresesiSzoveg - A keresési kifejezés
   * @returns {Promise<Array<string>>} Településnevek tömb
   */
  async getTelepulesJavaslatok(keresesiSzoveg) {

    console.log("getTelepulesJavaslatok:: ", {
      keresesiSzoveg: keresesiSzoveg
    });
    
    // Validáció: minimum 2 karakter szükséges
    if (!keresesiSzoveg) {
      return [];
    }
    
    // Repository hívás
    return await LokacioRepository.findTelepulesek(keresesiSzoveg);
  }
}

// Service exportálása
module.exports = new LokacioService();
