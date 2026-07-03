// frontend/js/utils/apiHelper.js

// ===================================
// BACKEND ALAP URL
// ===================================
// Ha változik, csak itt kell módosítani
export const API_ALAP_URL = 'http://localhost:3000/api/';

// ===================================
// ÁLTALÁNOS API KÉRÉS
// ===================================
// Az összes többi függvény ezt használja
// @param {string} utvonal - pl. 'eember/bejelentkezes'
// @param {Object} beallitasok - fetch beállítások: method, body, stb.
// @param {string|null} token - JWT token, ha a végpont hitelesítést igényel
// @returns {Promise<Object>} - A szerver JSON válasza
async function apiKeres(utvonal, beallitasok = {}, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiKeres - KEZDÉS', { utvonal, method: beallitasok.method || 'GET' });

  // Fejlécek összeállítása
  const fejlecek = {
    'Content-Type': 'application/json',
    ...beallitasok.headers, // Ha extra fejlécet adtak meg, hozzáfűzzük
  };

  // Ha van JWT token, hozzáadjuk az Authorization fejléchez
  if (token) {
    fejlecek['Authorization'] = `Bearer ${token}`;
  }

  try {
    // Tényleges HTTP kérés
    const valasz = await fetch(API_ALAP_URL + utvonal, {
      ...beallitasok,
      headers: fejlecek,
    });

    // JSON-ná alakítás
    const adatok = await valasz.json();

    // Ha a szerver hibakódot küldött (4xx, 5xx), hibát dobunk
    if (!valasz.ok) {
      const hibaUzenet = adatok.message || adatok.error || `HTTP hiba: ${valasz.status}`;
      throw new Error(hibaUzenet);
    }

    // Metódus vég log (siker)
    console.log('apiHelper.apiKeres - VÉGE siker', { utvonal, status: valasz.status });
    return adatok;

  } catch (hiba) {
    // Metódus vég log (hiba)
    console.log('apiHelper.apiKeres - VÉGE hiba', { utvonal, hiba: hiba.message });
    // Továbbdobjuk a hibát a hívónak
    throw hiba;
  }
}

// ===================================
// POST KÉRÉS (JSON)
// ===================================
// Normál JSON küldéshez (pl. bejelentkezés, regisztráció)
// @param {string} utvonal
// @param {Object} adatok - A küldendő adat JS objektum
// @param {string|null} token
async function apiPost(utvonal, adatok, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPost - KEZDÉS', { utvonal });
  const eredmeny = await apiKeres(utvonal, {
    method: 'POST',
    body: JSON.stringify(adatok),
  }, token);
  // Metódus vég log
  console.log('apiHelper.apiPost - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// POST KÉRÉS (FORMDATA - FÁJLFELTÖLTÉS)
// ===================================
// VÁLTOZÁS: ÚJ FÜGGVÉNY
// Fájlt tartalmazó form küldéséhez szükséges (pl. ikon feltöltés)
// Fontos különbség a sima apiPost-tól:
//   1. A body nem JSON.stringify(), hanem FormData objektum
//   2. A 'Content-Type' fejlécet NEM állítjuk be kézzel –
//      a böngésző automatikusan beállítja 'multipart/form-data'-ra
//      a boundary értékkel együtt, amit a Multer elvár
// @param {string} utvonal - pl. 'kategoria'
// @param {FormData} formData - A feltöltendő FormData objektum
// @param {string|null} token
async function apiPostFormData(utvonal, formData, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPostFormData - KEZDÉS', { utvonal });

  // Fejlécek: CSAK az Authorization kell, Content-Type-t NEM adjuk meg!
  // Ha megadnánk, a böngésző nem tudná automatikusan beállítani a boundary-t,
  // és a Multer nem tudná feldolgozni a fájlt
  const fejlecek = {};
  if (token) {
    fejlecek['Authorization'] = `Bearer ${token}`;
  }

  try {
    const valasz = await fetch(API_ALAP_URL + utvonal, {
      method: 'POST',
      headers: fejlecek, // Csak Authorization, Content-Type nincs!
      body: formData,     // FormData objektum, nem JSON string
    });

    // JSON-ná alakítás
    const adatok = await valasz.json();

    // Ha a szerver hibakódot küldött (4xx, 5xx), hibát dobunk
    if (!valasz.ok) {
      const hibaUzenet = adatok.message || adatok.error || `HTTP hiba: ${valasz.status}`;
      throw new Error(hibaUzenet);
    }

    // Metódus vég log (siker)
    console.log('apiHelper.apiPostFormData - VÉGE siker', { utvonal, status: valasz.status });
    return adatok;

  } catch (hiba) {
    // Metódus vég log (hiba)
    console.log('apiHelper.apiPostFormData - VÉGE hiba', { utvonal, hiba: hiba.message });
    throw hiba;
  }
}

// ===================================
// PATCH KÉRÉS (FORMDATA - FÁJLFELTÖLTÉS)
// ===================================
// VÁLTOZÁS: ÚJ FÜGGVÉNY
// Módosításhoz, ha az eember új ikont is feltölt
// Ugyanaz a logika, mint az apiPostFormData, de PATCH metódussal
// @param {string} utvonal - pl. 'kategoria/abc123'
// @param {FormData} formData
// @param {string|null} token
async function apiPatchFormData(utvonal, formData, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPatchFormData - KEZDÉS', { utvonal });

  // Content-Type-t itt sem adjuk meg, a böngésző kezeli
  const fejlecek = {};
  if (token) {
    fejlecek['Authorization'] = `Bearer ${token}`;
  }

  try {
    const valasz = await fetch(API_ALAP_URL + utvonal, {
      method: 'PATCH',
      headers: fejlecek,
      body: formData,
    });

    const adatok = await valasz.json();

    if (!valasz.ok) {
      const hibaUzenet = adatok.message || adatok.error || `HTTP hiba: ${valasz.status}`;
      throw new Error(hibaUzenet);
    }

    // Metódus vég log (siker)
    console.log('apiHelper.apiPatchFormData - VÉGE siker', { utvonal, status: valasz.status });
    return adatok;

  } catch (hiba) {
    // Metódus vég log (hiba)
    console.log('apiHelper.apiPatchFormData - VÉGE hiba', { utvonal, hiba: hiba.message });
    throw hiba;
  }
}

// ===================================
// GET KÉRÉS
// ===================================
// @param {string} utvonal
// @param {string|null} token
async function apiGet(utvonal, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiGet - KEZDÉS', { utvonal });
  const eredmeny = await apiKeres(utvonal, { method: 'GET' }, token);
  // Metódus vég log
  console.log('apiHelper.apiGet - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// PATCH KÉRÉS (JSON)
// ===================================
// Normál JSON módosításhoz (ikon nélkül)
// @param {string} utvonal
// @param {Object} adatok
// @param {string|null} token
async function apiPatch(utvonal, adatok, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPatch - KEZDÉS', { utvonal });
  const eredmeny = await apiKeres(utvonal, {
    method: 'PATCH',
    body: JSON.stringify(adatok),
  }, token);
  // Metódus vég log
  console.log('apiHelper.apiPatch - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// KÉP FELTÖLTÉS
// ===================================
// A FeltoltesKezelo.js hívja kép beszúrásakor.
// A backend a 'kep' mezőnevű fájlt várja (Multer konfig alapján).
// @param {File} fajl - A feltöltendő képfájl
// @param {string|null} token
async function kepFeltoltes(fajl, token = null) {
  console.log('apiHelper.kepFeltoltes - KEZDÉS', { nev: fajl.name, meret: fajl.size });
  // FormData összeállítása – Content-Type-t a böngésző kezeli automatikusan
  const formData = new FormData();
  formData.append('kep', fajl);
  const eredmeny = await apiPostFormData('feltoltes/kep', formData, token);
  console.log('apiHelper.kepFeltoltes - VÉGE', { url: eredmeny?.url });
  return eredmeny;
}

// ===================================
// FÁJL FELTÖLTÉS
// ===================================
// A FeltoltesKezelo.js hívja fájl csatolásakor.
// A backend a 'fajl' mezőnevű fájlt várja (Multer konfig alapján).
// @param {File} fajl - A feltöltendő fájl
// @param {string|null} token
async function fajlFeltoltes(fajl, token = null) {
  console.log('apiHelper.fajlFeltoltes - KEZDÉS', { nev: fajl.name, meret: fajl.size });
  const formData = new FormData();
  formData.append('fajl', fajl);
  const eredmeny = await apiPostFormData('feltoltes/fajl', formData, token);
  console.log('apiHelper.fajlFeltoltes - VÉGE', { url: eredmeny?.url });
  return eredmeny;
}

// ===================================
// EXPORTÁLÁS
// ===================================
// VÁLTOZÁS: apiPostFormData és apiPatchFormData hozzáadva az exporthoz
export { apiPost, apiPostFormData, apiGet, apiPatch, apiPatchFormData, kepFeltoltes, fajlFeltoltes };