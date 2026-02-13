// frontend/js/components/regisztralasForm.js

// ===== FORM ELEMEK LEKÉRÉSE =====
// Tároljuk a form és az input mezők referenciáit
let form;
let felhasznaloNevInput;
let emailInput;
let jelszoInput;
let jelszoIsmetlesInput;
let nevInput;
let orszagInput;
let regioInput;
let telepulesInput;
let orszagDatalist;
let regioDatalist;
let telepulesDatalist;

// Error üzenetek referenciái
let felhasznaloNevError;
let emailError;
let jelszoError;
let jelszoIsmetlesError;
let nevError;
let orszagError;
let regioError;
let telepulesError;
let generalError;

// Linkek
let bejelentkezesLink;

// ===== INICIALIZÁLÁS =====
// Ez a függvény akkor fut le, amikor a template betöltődik
export function init() {
  console.log('Regisztrációs form inicializálása...');
  
  // ===== FORM ELEMEK LEKÉRÉSE A DOM-ból =====
  form = document.getElementById('regisztracioForm');
  
  // Input mezők
  felhasznaloNevInput = document.getElementById('emberNev');
  emailInput = document.getElementById('regEmail');
  jelszoInput = document.getElementById('regJelszo');
  jelszoIsmetlesInput = document.getElementById('jelszoIsmetles');
  nevInput = document.getElementById('nev');
  orszagInput = document.getElementById('orszag');
  regioInput = document.getElementById('regio');
  telepulesInput = document.getElementById('telepules');
  orszagDatalist = document.getElementById('orszagLista');
  regioDatalist = document.getElementById('regioLista');
  telepulesDatalist = document.getElementById('telepulesLista');
  
  // Error üzenetek
  felhasznaloNevError = document.getElementById('felhasznaloNevError');
  emailError = document.getElementById('emailError');
  jelszoError = document.getElementById('jelszoError');
  jelszoIsmetlesError = document.getElementById('jelszoIsmetlesError');
  nevError = document.getElementById('nevError');
  orszagError = document.getElementById('orszagError');
  regioError = document.getElementById('regioError');
  telepulesError = document.getElementById('telepulesError');
  generalError = document.getElementById('generalError');
  
  // Linkek
  bejelentkezesLink = document.getElementById('bejelentkezesLink');
  
  // ===== EVENT LISTENER-ek HOZZÁADÁSA =====
  // Form submit esemény
  form.addEventListener('submit', handleSubmit);
  
  // Input mezőkön az error üzenetek eltávolítása beírás közben
  felhasznaloNevInput.addEventListener('input', () => {
    felhasznaloNevError.textContent = '';
  });
  
  emailInput.addEventListener('input', () => {
    emailError.textContent = '';
  });
  
  jelszoInput.addEventListener('input', () => {
    jelszoError.textContent = '';
    jelszoIsmetlesError.textContent = '';
  });
  
  jelszoIsmetlesInput.addEventListener('input', () => {
    jelszoIsmetlesError.textContent = '';
  });
  
  nevInput.addEventListener('input', () => {
    nevError.textContent = '';
  });
  
  orszagInput.addEventListener('input', () => {
    orszagError.textContent = '';
  });
  
  regioInput.addEventListener('input', () => {
    regioError.textContent = '';
  });
  
  telepulesInput.addEventListener('input', () => {
    telepulesError.textContent = '';
  });
  
  // Bejelentkezés link kattintás
  bejelentkezesLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.bejelentkezesMutatasa();
  });

  // Ország mező autocomplete
  orszagInput.addEventListener('input', async () => {
    orszagError.textContent = '';
    await orszagJavaslatokFrisitese(orszagInput.value);
  });

  // ÚJ: Ország mező kiválasztás kezelése
  orszagInput.addEventListener('change', () => {
    console.log('change');
    // Datalist tartalom törlése kiválasztás után
    orszagDatalist.innerHTML = '';
    // Fókusz eltávolítása (bezárja a legördülőt)
    orszagInput.blur();
  });
    
  // Régió mező autocomplete
  regioInput.addEventListener('input', async () => {
    regioError.textContent = '';
    await frissitRegioJavaslatok(regioInput.value);
  });

  // ÚJ: Régió mező kiválasztás kezelése
  regioInput.addEventListener('change', () => {
    // Datalist tartalom törlése kiválasztás után
    regioDatalist.innerHTML = '';
    // Fókusz eltávolítása (bezárja a legördülőt)
    regioInput.blur();
  });
  
  // Település mező autocomplete
  telepulesInput.addEventListener('input', async () => {
    telepulesError.textContent = '';
    await frissitTelepulesJavaslatok(telepulesInput.value);
  });

  // ÚJ: Település mező kiválasztás kezelése
  telepulesInput.addEventListener('change', () => {
    // Datalist tartalom törlése kiválasztás után
    telepulesDatalist.innerHTML = '';
    // Fókusz eltávolítása (bezárja a legördülőt)
    telepulesInput.blur();
  });
}

// ===== FORM SUBMIT KEZELÉS =====
// Ez fut le amikor a user megnyomja a "Regisztráció" gombot
async function handleSubmit(e) {
  e.preventDefault();
  
  // ===== VALIDÁCIÓS HIBAÜZENETEK TorlesE =====
  clearAllErrors();
  
  // ===== INPUT ADATOK LEKÉRÉSE =====
  const emberNev = felhasznaloNevInput.value.trim();
  const email = emailInput.value.trim();
  const jelszo = jelszoInput.value.trim();
  const jelszoIsmetles = jelszoIsmetlesInput.value.trim();
  const nev = nevInput.value.trim();
  const orszag = orszagInput.value.trim();
  const regio = regioInput.value.trim();
  const telepules = telepulesInput.value.trim();
  
  // ===== ALAPVETŐ VALIDÁCIÓK =====
  let hasError = false;
  
  // Embernév ellenőrzése
  if (!emberNev) {
    felhasznaloNevError.textContent = 'A embernév kötelező';
    hasError = true;
  } else if (emberNev.length < 3) {
    felhasznaloNevError.textContent = 'Legalább 3 karakter szükséges';
    hasError = true;
  }
  
  // Email ellenőrzése
  if (!email) {
    emailError.textContent = 'Az email cím kötelező';
    hasError = true;
  }
  
  // Jelszó ellenőrzése
  if (!jelszo) {
    jelszoError.textContent = 'A jelszó kötelező';
    hasError = true;
  } else if (jelszo.length < 6) {
    jelszoError.textContent = 'Legalább 6 karakter szükséges';
    hasError = true;
  }
  
  // Jelszó ismétlés ellenőrzése
  if (!jelszoIsmetles) {
    jelszoIsmetlesError.textContent = 'A jelszó ismétlése kötelező';
    hasError = true;
  } else if (jelszo !== jelszoIsmetles) {
    jelszoIsmetlesError.textContent = 'A két jelszó nem egyezik';
    hasError = true;
  }
  
  // Teljes név ellenőrzése
  if (!nev) {
    nevError.textContent = 'A teljes név kötelező';
    hasError = true;
  }
  
  // Ország ellenőrzése
  if (!orszag) {
    orszagError.textContent = 'Az ország kötelező';
    hasError = true;
  }
  
  // Régió ellenőrzése
  if (!regio) {
    regioError.textContent = 'A régió kötelező';
    hasError = true;
  }
  
  // Település ellenőrzése
  if (!telepules) {
    telepulesError.textContent = 'A település kötelező';
    hasError = true;
  }
  
  // Ha van validációs hiba, ne menjen tovább
  if (hasError) {
    return;
  }
  
  try {
    // ===== API HÍVÁS A BACKEND-RE =====
    // POST kérés a /api/ember/regisztracio végpontra
    const response = await fetch('http://localhost:3000/api/ember/regisztracio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emberNev: emberNev,
        email: email,
        jelszo: jelszo,
        nev: nev,
        lokacio: {
          orszag: orszag,
          regio: regio,
          telepules: telepules
        }
      })
    });
    
    // ===== VÁLASZ FELDOLGOZÁSA =====
    const data = await response.json();
    
    // Ha a regisztráció sikertelen
    if (!response.ok) {
      // Backend visszaküldhet specifikus hibákat
      if (data.message) {
        generalError.textContent = data.message;
      } else {
        generalError.textContent = 'A regisztráció sikertelen';
      }
      return;
    }
    
    // ===== SIKERES REGISZTRÁCIÓ =====
    console.log('Sikeres regisztráció!', data);
    
    // Alert üzenet és átirányítás bejelentkezésre
    alert('Sikeres regisztráció! Most már bejelentkezhetsz.');
    window.bejelentkezesMutatasa();
    
  } catch (error) {
    // ===== HÁLÓZATI HIBA VAGY EGYÉB PROBLÉMA =====
    console.error('Regisztrációs hiba:', error);
    generalError.textContent = 'Hálózati hiba vagy szerver probléma';
  }
}

// ===== AUTOCOMPLETE JAVASLATOK BETÖLTÉSE =====

// Ország javaslatok frissítése
async function orszagJavaslatokFrisitese(keresesiSzoveg) {
  
  try {
    // API hívás a backend felé
    const response = await fetch(`http://localhost:3000/api/lokacio/orszag?kereses=${encodeURIComponent(keresesiSzoveg)}`);
    
    if (!response.ok) {
      console.error('Hiba az ország javaslatok betöltésekor');
      return;
    }
    
    // Válasz feldolgozása
    const javaslatok = await response.json();
    
    // Datalist frissítése
    orszagDatalist.innerHTML = '';
    javaslatok.forEach(orszag => {
      const option = document.createElement('option');
      option.value = orszag;
      orszagDatalist.appendChild(option);
    });
    
  } catch (error) {
    console.error('Hálózati hiba az ország javaslatok lekérésekor:', error);
  }
}

// Régió javaslatok frissítése
async function frissitRegioJavaslatok(keresesiSzoveg) {
  
  try {
    // API hívás a backend felé
    const response = await fetch(`http://localhost:3000/api/lokacio/regio?kereses=${encodeURIComponent(keresesiSzoveg)}`);
    
    if (!response.ok) {
      console.error('Hiba a régió javaslatok betöltésekor');
      return;
    }
    
    // Válasz feldolgozása
    const javaslatok = await response.json();
    
    // Datalist frissítése
    regioDatalist.innerHTML = '';
    javaslatok.forEach(regio => {
      const option = document.createElement('option');
      option.value = regio;
      regioDatalist.appendChild(option);
    });
    
  } catch (error) {
    console.error('Hálózati hiba a régió javaslatok lekérésekor:', error);
  }
}

// Település javaslatok frissítése
async function frissitTelepulesJavaslatok(keresesiSzoveg) {
  
  try {
    // API hívás a backend felé
    const response = await fetch(`http://localhost:3000/api/lokacio/telepules?kereses=${encodeURIComponent(keresesiSzoveg)}`);
    
    if (!response.ok) {
      console.error('Hiba a település javaslatok betöltésekor');
      return;
    }
    
    // Válasz feldolgozása
    const javaslatok = await response.json();
    
    // Datalist frissítése
    telepulesDatalist.innerHTML = '';
    javaslatok.forEach(telepules => {
      const option = document.createElement('option');
      option.value = telepules;
      telepulesDatalist.appendChild(option);
    });
    
  } catch (error) {
    console.error('Hálózati hiba a település javaslatok lekérésekor:', error);
  }
}

// ===== SEGÉDFÜGGVÉNY: ÖSSZES ERROR TorlesE =====
// Törli az összes hibaüzenetet
function clearAllErrors() {
  felhasznaloNevError.textContent = '';
  emailError.textContent = '';
  jelszoError.textContent = '';
  jelszoIsmetlesError.textContent = '';
  nevError.textContent = '';
  orszagError.textContent = '';
  regioError.textContent = '';
  telepulesError.textContent = '';
  generalError.textContent = '';
}
