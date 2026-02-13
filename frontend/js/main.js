// frontend/js/main.js

// ===== IMPORTOK =====
// Auth helper importálása bejelentkezés ellenőrzéshez
import AuthHelper from './utils/authHelper.js';

// ===== TEMPLATE BETÖLTÉS =====
// Betölti a HTML template-et a megfelelő konténerbe
async function loadTemplate(templatePath, containerId) {
  // Fetch-eli a template fájlt
  const response = await fetch(templatePath);
  const html = await response.text();
  
  // Beilleszti a konténerbe
  const container = document.getElementById(containerId);
  container.innerHTML = html;
  container.style.display = 'block';
}

// ===== KONTÉNEREK ELREJTÉSE =====
// Elrejti az összes konténert
function hideAllContainers() {
  document.getElementById('bejelentkezesContainer').style.display = 'none';
  document.getElementById('regisztralasContainer').style.display = 'none';
  document.getElementById('fooldalContainer').style.display = 'none';
}

// ===== FŐOLDAL MEGJELENÍTÉSE ===== 
// ÚJ FÜGGVÉNY
async function fooldalMutatasa() {
  // Minden konténer elrejtése
  hideAllContainers();
  
  // Főoldal template betöltése
  await loadTemplate('templates/fooldal.html', 'fooldalContainer');
  
  // Főoldal inicializálása
  const module = await import('./components/fooldalForm.js');
  if (module.init) module.init();
}

// ===== KIJELENTKEZÉS =====
// Kijelentkezés funkció
function kijelentkezes() {
  // Token törlése
  AuthHelper.torolToken();
  
  // Összes konténer elrejtése
  hideAllContainers();
  
  // Bejelentkezési oldal megjelenítése
  bejelentkezesMutatasa();
  
  console.log('Sikeres kijelentkezés');
}

// ===== BEJELENTKEZÉS OLDAL MEGJELENÍTÉSE =====
async function bejelentkezesMutatasa() {
  // Minden konténer elrejtése
  hideAllContainers();
  
  // Bejelentkezés template betöltése
  await loadTemplate('templates/bejelentkezes.html', 'bejelentkezesContainer');
  
  // Bejelentkezés form inicializálása
  const module = await import('./components/bejelentkezesForm.js');
  if (module.init) module.init();
}

// ===== REGISZTRÁCIÓ OLDAL MEGJELENÍTÉSE =====
async function regisztralasMutatasa() {
  // Minden konténer elrejtése
  hideAllContainers();
  
  // Regisztráció template betöltése
  await loadTemplate('templates/regisztracio.html', 'regisztralasContainer');
  
  // Regisztráció form inicializálása
  const module = await import('./components/regisztralasForm.js');
  if (module.init) module.init();
}

// ===== GLOBÁLIS ELÉRHETŐSÉG =====
// Más fájlokból is elérhető legyen
window.bejelentkezesMutatasa = bejelentkezesMutatasa;
window.regisztralasMutatasa = regisztralasMutatasa;
window.hideAllContainers = hideAllContainers;
window.fooldalMutatasa = fooldalMutatasa; 
window.kijelentkezes = kijelentkezes; 

// ===== APP INDÍTÁSA =====
// Bejelentkezési állapot ellenőrzése és megfelelő oldal megjelenítése
document.addEventListener('DOMContentLoaded', () => {
  // Ellenőrizzük hogy be van-e jelentkezve a ember
  if (AuthHelper.bejelentkezveVan() && !AuthHelper.tokenLejart()) {
    // Ha be van jelentkezve és a token érvényes
    console.log('Ember már be van jelentkezve');
    
    // Főoldal megjelenítése - MÓDOSÍTOTT SOR
    fooldalMutatasa();
    
  } else {
    // Ha nincs bejelentkezve vagy lejárt a token
    console.log('Ember nincs bejelentkezve');
    
    // Token törlése ha lejárt
    if (AuthHelper.getToken() && AuthHelper.tokenLejart()) {
      console.log('Token lejárt - törlés');
      AuthHelper.torolToken();
    }
    
    // Bejelentkezési oldal megjelenítése
    bejelentkezesMutatasa();
  }
});

