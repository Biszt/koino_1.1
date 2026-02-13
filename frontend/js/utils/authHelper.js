// frontend/js/utils/authHelper.js

// ===== AUTH HELPER OSZTÁLY =====
// JWT token kezelésére szolgáló segédfüggvények gyűjteménye
class AuthHelper {
  
  // ----- TOKEN MENTÉSE -----
  /**
   * JWT token mentése localStorage-ba
   * @param {string} token - A JWT token amit menteni szeretnénk
   */
  static mentToken(token) {
    // Token mentése a localStorage-ba 'authToken' kulcs alatt
    localStorage.setItem('authToken', token);
    console.log('Token sikeresen elmentve');
  }
  
  // ----- TOKEN LEKÉRÉSE -----
  /**
   * JWT token lekérése localStorage-ból
   * @returns {string|null} A tárolt token vagy null ha nincs
   */
  static getToken() {
    // Token lekérése a localStorage-ból
    return localStorage.getItem('authToken');
  }
  
  // ----- TOKEN TorlesE -----
  /**
   * JWT token törlése localStorage-ból (kijelentkezés)
   */
  static torolToken() {
    // Token törlése a localStorage-ból
    localStorage.removeItem('authToken');
    console.log('Token sikeresen törölve');
  }
  
  // ----- BEJELENTKEZVE VAN-E -----
  /**
   * Ellenőrzi hogy a ember be van-e jelentkezve
   * @returns {boolean} true ha van token, false ha nincs
   */
  static bejelentkezveVan() {
    // Token lekérése
    const token = this.getToken();
    
    // Ha van token, akkor be van jelentkezve
    return token !== null && token !== '';
  }
  
  // ----- TOKEN DEKÓDOLÁSA -----
  /**
   * JWT token payload részének dekódolása (Base64)
   * Figyelem: Ez NEM validálja a token-t, csak dekódolja!
   * @returns {Object|null} A dekódolt token adatok vagy null
   */
  static dekodolToken() {
    // Token lekérése
    const token = this.getToken();
    
    // Ha nincs token, return null
    if (!token) {
      return null;
    }
    
    try {
      // JWT token 3 részből áll: header.payload.signature
      // Minket a payload érdekel (középső rész)
      const payload = token.split('.')[1];
      
      // Base64 dekódolás
      const dekodolt = atob(payload);
      
      // JSON parse - objektummá alakítás
      return JSON.parse(dekodolt);
    } catch (error) {
      // Ha hiba van a dekódolás során
      console.error('Token dekódolási hiba:', error);
      return null;
    }
  }
  
  // ----- TOKEN LEJÁRT-E -----
  /**
   * Ellenőrzi hogy a token lejárt-e
   * @returns {boolean} true ha lejárt, false ha még érvényes
   */
  static tokenLejart() {
    // Token dekódolása
    const dekodolt = this.dekodolToken();
    
    // Ha nincs dekódolt token, akkor lejártnak tekintjük
    if (!dekodolt) {
      return true;
    }
    
    // Token-ben lévő lejárati idő (exp = expiration, másodpercben)
    const exp = dekodolt.exp;
    
    // Ha nincs lejárati idő, akkor lejártnak tekintjük
    if (!exp) {
      return true;
    }
    
    // Jelenlegi idő másodpercben
    const most = Math.floor(Date.now() / 1000);
    
    // Ha a lejárati idő kisebb mint a mostani idő -> lejárt
    return exp < most;
  }
  
  // ----- EMBER ADATOK LEKÉRÉSE -----
  /**
   * A bejelentkezett ember adatainak lekérése a token-ből
   * @returns {Object|null} Ember adatok vagy null
   */
  static getFelhasznaloAdatok() {
    // Token dekódolása
    const dekodolt = this.dekodolToken();
    
    // Ha nincs dekódolt token
    if (!dekodolt) {
      return null;
    }
    
    // Ember adatok visszaadása (amit a backend a token-be tett)
    return {
      id: dekodolt.id,
      email: dekodolt.email,
      emberNev: dekodolt.emberNev
    };
  }
}

// ===== EXPORTÁLÁS =====
// Hogy más fájlokból is használható legyen
export default AuthHelper;
