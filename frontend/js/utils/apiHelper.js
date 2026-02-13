// frontend/js/utils/apiHelper.js

// ===== AUTH HELPER IMPORTÁLÁSA =====
// Token kezeléshez szükséges
import AuthHelper from './authHelper.js';

// ===== API HELPER OSZTÁLY =====
// API hívások kezelésére szolgáló segédfüggvények
class ApiHelper {
  
  // API alap URL (ezt módosíthatod környezetenként)
  static BASE_URL = 'http://localhost:3000/api';
  
  // ----- FETCH HÍVÁS AUTOMATIKUS TOKEN-NEL -----
  /**
   * Fetch hívás automatikus Authorization header hozzáadással
   * @param {string} endpoint - API végpont (pl: '/ember/profil')
   * @param {Object} options - Fetch options (method, body, stb.)
   * @returns {Promise<Response>} Fetch válasz
   */
  static async fetchWithAuth(endpoint, options = {}) {
    // Token lekérése
    const token = AuthHelper.getToken();
    
    // Ha van token, hozzáadjuk az Authorization header-hez
    if (token) {
      // Headers objektum létrehozása vagy bővítése
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}` // JWT token formátum
      };
    }
    
    // Teljes URL összeállítása
    const url = `${this.BASE_URL}${endpoint}`;
    
    try {
      // Fetch hívás
      const response = await fetch(url, options);
      
      // Ha 401-es válasz (Unauthorized) -> token lejárt vagy érvénytelen
      if (response.status === 401) {
        console.warn('Token érvénytelen vagy lejárt - kijelentkeztetés');
        
        // Token törlése
        AuthHelper.torolToken();
        
        // Átirányítás bejelentkezési oldalra
        window.bejelentkezesMutatasa();
      }
      
      // Válasz visszaadása
      return response;
      
    } catch (error) {
      // Hálózati vagy egyéb hiba
      console.error('API hívási hiba:', error);
      throw error;
    }
  }
  
  // ----- GET KÉRÉS -----
  /**
   * GET kérés automatikus token-nel
   * @param {string} endpoint - API végpont
   * @returns {Promise<Object>} JSON válasz
   */
  static async get(endpoint) {
    // Fetch hívás GET metódussal
    const response = await this.fetchWithAuth(endpoint, {
      method: 'GET'
    });
    
    // JSON válasz visszaadása
    return await response.json();
  }
  
  // ----- POST KÉRÉS -----
  /**
   * POST kérés automatikus token-nel
   * @param {string} endpoint - API végpont
   * @param {Object} data - Küldendő adatok
   * @returns {Promise<Object>} JSON válasz
   */
  static async post(endpoint, data) {
    // Fetch hívás POST metódussal
    const response = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    // JSON válasz visszaadása
    return await response.json();
  }
  
  // ----- PUT KÉRÉS -----
  /**
   * PUT kérés automatikus token-nel
   * @param {string} endpoint - API végpont
   * @param {Object} data - Módosítandó adatok
   * @returns {Promise<Object>} JSON válasz
   */
  static async put(endpoint, data) {
    // Fetch hívás PUT metódussal
    const response = await this.fetchWithAuth(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    // JSON válasz visszaadása
    return await response.json();
  }
  
  // ----- DELETE KÉRÉS -----
  /**
   * DELETE kérés automatikus token-nel
   * @param {string} endpoint - API végpont
   * @returns {Promise<Object>} JSON válasz
   */
  static async delete(endpoint) {
    // Fetch hívás DELETE metódussal
    const response = await this.fetchWithAuth(endpoint, {
      method: 'DELETE'
    });
    
    // JSON válasz visszaadása
    return await response.json();
  }
}

// ===== EXPORTÁLÁS =====
export default ApiHelper;
