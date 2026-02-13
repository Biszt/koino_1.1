// backend/utils/jelszoHelper.js

// ===== BCRYPT IMPORTÁLÁSA =====
// bcrypt: Jelszó hash-eléshez és összehasonlításhoz használt library
const bcrypt = require('bcrypt');

// ===== JELSZÓ HELPER OSZTÁLY =====
// Jelszókezeléshez kapcsolódó általános technikai műveletek
class JelszoHelper {
  
  // ----- JELSZÓ HASH-ELÉSE -----
  /**
   * Biztonságos hash készítése egyszerű szöveges jelszóból
   * @param {string} jelszo - Az egyszerű szöveges jelszó
   * @returns {Promise<string>} Hash-elt jelszó
   */
  static async hashJelszo(jelszo) {
    // Salt generálása (10 iteráció = 2^10 = 1024)
    // Minél magasabb a szám, annál biztonságosabb, de lassabb
    const salt = await bcrypt.genSalt(10);
    
    // Jelszó hash-elése a salt-tal együtt
    const hashedJelszo = await bcrypt.hash(jelszo, salt);
    
    // Hash-elt jelszó visszaadása
    return hashedJelszo;
  }
  
  // ----- JELSZÓ ÖSSZEHASONLÍTÁSA -----
  /**
   * Összehasonlítja az egyszerű szöveges jelszót a tárolt hash-sel
   * @param {string} jelszo - A megadott egyszerű szöveges jelszó
   * @param {string} hashedJelszo - A tárolt hash-elt jelszó
   * @returns {Promise<boolean>} true ha egyezik, false ha nem
   */
  static async osszehasonlitJelszo(jelszo, hashedJelszo) {
    // bcrypt.compare automatikusan kezeli a salt-ot
    // Nem kell manuálisan kinyerni a hash-ből
    const egyezik = await bcrypt.compare(jelszo, hashedJelszo);
    
    // Boolean visszaadása (true vagy false)
    return egyezik;
  }
  
  // ----- JELSZÓ ERŐSSÉG VALIDÁLÁSA -----
  /**
   * Ellenőrzi, hogy a jelszó megfelel-e a biztonsági követelményeknek
   * @param {string} jelszo - Az ellenőrizendő jelszó
   * @returns {Object} { ervényes: boolean, hibak: string[] }
   */
  static validalJelszoErosseg(jelszo) {
    // Hibák gyűjtése ebbe a tömbbe
    const hibak = [];
    
    // === SZABÁLY 1: Minimum hossz ===
    const minHossz = 8;
    if (jelszo.length < minHossz) {
      hibak.push(`A jelszónak legalább ${minHossz} karakter hosszúnak kell lennie`);
    }
    
    // Eredmény objektum visszaadása
    return {
      ervényes: hibak.length === 0,  // Ha nincs hiba, akkor érvényes
      hibak: hibak                    // Hibaüzenetek tömbje
    };
  }
  
}

// ===== EXPORTÁLÁS =====
// JelszoHelper osztály exportálása más fájloknak
module.exports = JelszoHelper;
