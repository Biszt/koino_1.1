// koino/felulet/js/utils/apiHelper.js

// ⭐ A PROTOTÍPUSBÓL ÖRÖKÖLVE (frontend/js/utils/apiHelper.js), a Szakasz 5.3-ban.
//
// ⚠️ EZ AZ EGYETLEN FÁJL, AMIT AZ ÁTEMELÉSKOR ÉRDEMBEN ÁT KELLETT ÍRNI — és pontosan ezért
// volt olcsó az átemelés: a prototípus **teljes szerver-kapcsolata** ezen az egy fájlon ment
// át (`API_ALAP_URL` + 7 `fetch(`). A kártyák, a menük, a szövegmegjelenítő mind
// változatlanul jöttek.
//
// ===== KÉT VÁLTOZÁS A PROTOTÍPUSHOZ KÉPEST =====
//
// 1. ⭐ **A JWT token helyett a KAPU JELSZAVA.** A **D15** szerint a koinóban nincs
//    bejelentkezés: a személyazonosság a készülék kulcsa. A jelszó itt nem azonosít, csak
//    azt bizonyítja, hogy a kérés a **saját gépről, a saját lapról** jön — hogy egy másik
//    weboldal ne írhasson eseményt a te kulcsoddal (lásd `js/felulet/kapu.js`).
//    ⚠️ *A koino kapuja változatlanul az `esemenyMentese` (3. szabály); ez a jelszó
//    NEM biztonsági réteg a koinón belül.*
// 2. A hiba-mezők közé bekerült a koino `hiba` mezője.
//
// ⚠️ Az `API_ALAP_URL` **változatlan**: relatív útvonal, ugyanarra az origin-re, ahonnan a
// lap betöltődött. A prototípusban a backend szolgálta ki a lapot és az `/api`-t; itt a
// helyi kapu teszi ugyanezt. *Ettől nem kellett hozzányúlni.*

export const API_ALAP_URL = '/api/';

// ===================================
// A KAPU JELSZAVA
// ===================================
//
// A program indításkor kiír egy címet, amiben benne van (`?kulcs=…`) — ez az egyetlen, amit
// kézzel át tudsz adni. Innentől FEJLÉCBEN küldjük, hogy ne legyen benne minden kérés
// címében (a `referrer-policy: no-referrer` mellett ez a második őr ellene).
const KAPU_KULCS = new URLSearchParams(location.search).get('kulcs') ?? '';

/** A jelszó — hogy a lap többi része is elérje, ha kell. */
export function kapuKulcs() {
  return KAPU_KULCS;
}

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
  if (KAPU_KULCS) {
    fejlecek['X-Koino-Kulcs'] = KAPU_KULCS;   // ⭐ a JWT helyett a kapu jelszava (D15)
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
      // A backend hiba-válaszai vegyes mezőnevet használnak (message / error / uzenet);
      // mindhármat megnézzük, hogy a szerver valódi hibaszövege eljusson a felhasználóhoz.
      const hibaUzenet = adatok.hiba || adatok.message || adatok.error || adatok.uzenet || `HTTP hiba: ${valasz.status}`;
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
  if (KAPU_KULCS) {
    fejlecek['X-Koino-Kulcs'] = KAPU_KULCS;   // ⭐ a JWT helyett a kapu jelszava (D15)
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
      // A backend hiba-válaszai vegyes mezőnevet használnak (message / error / uzenet);
      // mindhármat megnézzük, hogy a szerver valódi hibaszövege eljusson a felhasználóhoz.
      const hibaUzenet = adatok.hiba || adatok.message || adatok.error || adatok.uzenet || `HTTP hiba: ${valasz.status}`;
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
  if (KAPU_KULCS) {
    fejlecek['X-Koino-Kulcs'] = KAPU_KULCS;   // ⭐ a JWT helyett a kapu jelszava (D15)
  }

  try {
    const valasz = await fetch(API_ALAP_URL + utvonal, {
      method: 'PATCH',
      headers: fejlecek,
      body: formData,
    });

    const adatok = await valasz.json();

    if (!valasz.ok) {
      // A backend hiba-válaszai vegyes mezőnevet használnak (message / error / uzenet);
      // mindhármat megnézzük, hogy a szerver valódi hibaszövege eljusson a felhasználóhoz.
      const hibaUzenet = adatok.hiba || adatok.message || adatok.error || adatok.uzenet || `HTTP hiba: ${valasz.status}`;
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
// PUT KÉRÉS (JSON)
// ===================================
// "Helyettesítő" művelethez (upsert): ha létezik → frissít, ha nem → létrehoz.
// Pl. értesítési beállítás mentése (PUT /api/ertesitesi-beallitasok).
// @param {string} utvonal
// @param {Object} adatok
// @param {string|null} token
async function apiPut(utvonal, adatok, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPut - KEZDÉS', { utvonal });
  const eredmeny = await apiKeres(utvonal, {
    method: 'PUT',
    body: JSON.stringify(adatok),
  }, token);
  // Metódus vég log
  console.log('apiHelper.apiPut - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// DELETE KÉRÉS (JSON)
// ===================================
// Törléshez, ahol a törlendő elemet a request body azonosítja
// (pl. szavazat visszavonása: { javaslatId }).
// @param {string} utvonal - pl. 'javaslat/szavazat'
// @param {Object} adatok  - A body-ban küldendő JS objektum
// @param {string|null} token
async function apiDelete(utvonal, adatok, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiDelete - KEZDÉS', { utvonal });
  const eredmeny = await apiKeres(utvonal, {
    method: 'DELETE',
    body: JSON.stringify(adatok),
  }, token);
  // Metódus vég log
  console.log('apiHelper.apiDelete - VÉGE', { utvonal });
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
export { apiPost, apiPostFormData, apiGet, apiPut, apiPatch, apiPatchFormData, apiDelete, kepFeltoltes, fajlFeltoltes };