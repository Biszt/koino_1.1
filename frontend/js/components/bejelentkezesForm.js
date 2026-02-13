// frontend/js/components/bejelentkezesForm.js

// ===== IMPORTOK =====
// Auth helper importálása token kezeléshez
import AuthHelper from '../utils/authHelper.js';

// ===== FORM ELEMEK LEKÉRÉSE =====
// Tároljuk a form és az input mezők referenciáit
let form;
let emailInput;
let jelszoInput;
let emailError;
let jelszoError;
let generalError;
let regisztracioLink;

// ===== INICIALIZÁLÁS =====
// Ez a függvény akkor fut le, amikor a template betöltődik
export function init() {
  console.log('Bejelentkezési form inicializálása...');
  
  // ===== FORM ELEMEK LEKÉRÉSE A DOM-ból =====
  form = document.getElementById('bejelentkezesForm');
  emailInput = document.getElementById('email');
  jelszoInput = document.getElementById('jelszo');
  emailError = document.getElementById('emailError');
  jelszoError = document.getElementById('jelszoError');
  generalError = document.getElementById('generalError');
  regisztracioLink = document.getElementById('regisztracioLink');
  
  // ===== EVENT LISTENER-ek HOZZÁADÁSA =====
  // Form submit esemény
  form.addEventListener('submit', handleSubmit);
  
  // Input mezőkön az error üzenetek eltávolítása beírás közben
  emailInput.addEventListener('input', () => {
    emailError.textContent = '';
  });
  
  jelszoInput.addEventListener('input', () => {
    jelszoError.textContent = '';
  });
  
  // Regisztrációs link kattintás
  regisztracioLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.regisztralasMutatasa();
  });
}

// ===== FORM SUBMIT KEZELÉS =====
// Ez fut le amikor a user megnyomja a "Bejelentkezés" gombot
async function handleSubmit(e) {
  e.preventDefault();
  
  // ===== VALIDÁCIÓK TorlesE =====
  emailError.textContent = '';
  jelszoError.textContent = '';
  generalError.textContent = '';
  
  // ===== INPUT ADATOK LEKÉRÉSE =====
  const email = emailInput.value.trim();
  const jelszo = jelszoInput.value;
  
  // ===== ALAPVETŐ VALIDÁCIÓ =====
  let hasError = false;
  
  // Email ellenőrzése
  if (!email) {
    emailError.textContent = 'Az email cím kötelező';
    hasError = true;
  }
  
  // Jelszó ellenőrzése
  if (!jelszo) {
    jelszoError.textContent = 'A jelszó kötelező';
    hasError = true;
  }
  
  // Ha van hiba, ne továbbmenj
  if (hasError) {
    return;
  }
  
  try {
    // ===== API HÍVÁS A BACKEND-RE =====
    // POST kérés a /api/ember/bejelentkezes végpontra
    const response = await fetch('http://localhost:3000/api/ember/bejelentkezes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        jelszo: jelszo
      })
    });
    
    // ===== VÁLASZ FELDOLGOZÁSA =====
    const data = await response.json();
    
    // Ha a bejelentkezés sikertelen
    if (!response.ok) {
      generalError.textContent = data.message || 'A bejelentkezés sikertelen';
      return;
    }
    
            // ===== SIKERES BEJELENTKEZÉS =====
    console.log('Sikeres bejelentkezés!', data);
    
    // Token mentése localStorage-ba
    AuthHelper.mentToken(data.token);
    
    // Főoldal megjelenítése - MÓDOSÍTOTT SOR
    window.fooldalMutatasa();
    
  } catch (error) {
    // ===== HÁLÓZATI HIBA VAGY EGYÉB PROBLÉMA =====
    console.error('Bejelentkezési hiba:', error);
    generalError.textContent = 'Hálózati hiba vagy szerver probléma';
  }
}
