// frontend/js/components/fooldalForm.js

// ===== IMPORTOK =====
// Auth helper importálása ember adatok lekéréséhez
import AuthHelper from '../utils/authHelper.js';

// ===== INICIALIZÁLÁS =====
// Ez a függvény akkor fut le, amikor a főoldal betöltődik
export function init() {
  console.log('Főoldal inicializálása...');
  
  // ===== EMBER ADATOK BETÖLTÉSE =====
  // Ember adatok lekérése a token-ből
  const felhasznaloAdatok = AuthHelper.getFelhasznaloAdatok();
  
  // Ha nincsenek ember adatok, valami hiba van
  if (!felhasznaloAdatok) {
    console.error('Nem sikerült betölteni a ember adatokat!');
    // Kijelentkeztetés
    window.kijelentkezes();
    return;
  }
  
  // ===== ADATOK MEGJELENÍTÉSE A DOM-BAN =====
  // Embernév megjelenítése az üdvözlő üzenetben
  const felhasznaloNevElem = document.getElementById('emberNev');
  if (felhasznaloNevElem) {
    felhasznaloNevElem.textContent = felhasznaloAdatok.emberNev;
  }
  
  console.log('Ember adatok betöltve:', felhasznaloAdatok);
  
  // ===== KIJELENTKEZÉS GOMB EVENT LISTENER =====
  const kijelentkezesGomb = document.getElementById('kijelentkezesGomb');
  if (kijelentkezesGomb) {
    kijelentkezesGomb.addEventListener('click', () => {
      console.log('Kijelentkezés gombra kattintás');
      // Kijelentkezés függvény hívása (a main.js-ben van definiálva)
      window.kijelentkezes();
    });
  }
  
  console.log('Főoldal sikeresen inicializálva');
}
