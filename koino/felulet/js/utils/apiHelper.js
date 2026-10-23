// koino/felulet/js/utils/apiHelper.js

// ⭐ A PROTOTÍPUSBÓL ÖRÖKÖLVE (frontend/js/utils/apiHelper.js), a Szakasz 5.3-ban.
//
// ⚠️ EZ AZ EGYETLEN FÁJL, AMIT AZ ÁTEMELÉSKOR ÉRDEMBEN ÁT KELLETT ÍRNI — és pontosan ezért
// volt olcsó az átemelés: a prototípus **teljes szerver-kapcsolata** ezen az egy fájlon ment
// át (`API_ALAP_URL` + 7 `fetch(`). A kártyák, a menük, a szövegmegjelenítő mind
// változatlanul jöttek.
//
// ===== HÁROM VÁLTOZÁS A PROTOTÍPUSHOZ KÉPEST =====
//
// 1. ⭐ **A JWT token helyett a KAPU JELSZAVA.** A **D15** szerint a koinóban nincs
//    bejelentkezés: a személyazonosság a készülék kulcsa. A jelszó itt nem azonosít, csak
//    azt bizonyítja, hogy a kérés a **saját gépről, a saját lapról** jön — hogy egy másik
//    weboldal ne írhasson eseményt a te kulcsoddal (lásd `js/felulet/kapu.js`).
//    ⚠️ *A koino kapuja változatlanul az `esemenyMentese` (3. szabály); ez a jelszó
//    NEM biztonsági réteg a koinón belül.*
// 2. A hiba-mezők közé bekerült a koino `hiba` mezője.
// 3. ⭐ (D100, a ház) A `Pakli.js` prototípus-útvonalai a program útvonalaira fordulnak — lásd `apiGet`
//    (a fordítás maga a `kartyaAdat.js`-é).
// 4. ⭐ (D101) A program megjegyzése (`koinoMegjegyzes` — a tudás határa) egy eseménnyel megy tovább a
//    `koinoModalok.js`-hez — lásd `apiGet`.
// 5. ⭐ (D101) A `FormData`-küldés JSON-ra fordul (a fájl-mezők a feltöltésen át lenyomat-címmé) — lásd
//    `formDataJsonna`.
//
// ⚠️ Az `API_ALAP_URL` **változatlan**: relatív útvonal, ugyanarra az origin-re, ahonnan a
// lap betöltődött. A prototípusban a backend szolgálta ki a lapot és az `/api`-t; itt a
// helyi kapu teszi ugyanezt. *Ettől nem kellett hozzányúlni.*

import { prototipusUtvonala } from '../kartyaAdat.js';

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
// ⭐⭐ A LAP HORGONYA (2026-09-12)
// ===================================
//
// A `/api/pakli` válasza megmondja, melyik KÉPBŐL készült a lista (`horgony` + `most`), és
// minden további kártya-kérésnek **ugyanabból** kell dolgoznia. Enélkül a kártya a mostani
// állapotot mutatná: mást mondana, mint a lista, amiből megnyitották — és a program
// gyorsítótára sem találna, tehát minden kattintás újraszámolná az egész koinót.
//
// ⭐ MIÉRT ITT, ÉS NEM A KÁRTYÁKBAN? Mert a kártyák és a modálok **változatlanul jöttek át
// a prototípusból**, és ez az érték maradjon is így. A prototípus teljes szerver-kapcsolata
// ezen az egy fájlon megy át — ugyanaz az érv, amiért a JWT → kapu-jelszó csere is itt
// történt, és nem húsz hívási helyen.
//
// ⚠️ Csak GET-re tesszük rá: az írás (POST/PUT) nem képből olvas, hanem eseményt írat.

let LAP_HORGONYA = null;

/**
 * A lap horgonyának beállítása — minden pakli-válasz után (a `Pakli.js` útvonalain magától, lásd `apiGet`).
 * `null`-lal törli (új lapozás kezdetén), és onnantól a program a mostani állapotot adja.
 *
 * @param {{horgony: number, most: number}|null} horgony
 */
export function lapHorgonyaBeallitasa(horgony) {
  LAP_HORGONYA = (Number.isInteger(horgony?.horgony) && Number.isInteger(horgony?.most))
    ? { horgony: horgony.horgony, most: horgony.most }
    : null;
  console.log('apiHelper.lapHorgonyaBeallitasa', LAP_HORGONYA);
}

/** Ráfűzi a horgonyt az útvonalra, ha van. A `?` vagy `&` attól függ, van-e már kérdés. */
function horgonnyal(utvonal) {
  if (!LAP_HORGONYA) return utvonal;
  const jel = utvonal.includes('?') ? '&' : '?';
  return utvonal + jel + 'horgony=' + LAP_HORGONYA.horgony + '&most=' + LAP_HORGONYA.most;
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
// ⭐ D101: A FORMDATA A LAPON FORDUL JSON-RA
// ===================================
//
// A prototípus modáljai (`KategoriaModal`, `GondolatTipusModal`) az ikont `FormData`-ban küldték (multipart, a
// Multernek). ⛔ A koino kapuja CSAK `application/json` testet fogad (az 5.5 harmadik őre — a JSON tartalomtípus
// kötelezővé teszi a böngésző előellenőrzését, ami az idegen írást megállítja; egy multipart küldés ezt kerülné meg).
// ⭐ Ezért a lap fordít, EGY helyen: a fájl-mezők a meglévő feltöltésen át (`kepFeltoltes` — base64, a lenyomat alatt
// tárolva) a fájl lenyomat-címévé (`/api/fajl/<lenyomat>`) válnak — az ikon így fájl-igény lesz a többi készüléken is
// (`fajlIgeny.js`) —, a többi mező szövegként marad, és az egész JSON-ként megy. A modálok ettől nem változnak.
// @param {FormData} formData
// @param {string|null} token
// @returns {Promise<Object>}
async function formDataJsonna(formData, token) {
  const ki = {};
  for (const [nev, ertek] of formData.entries()) {
    ki[nev] = (typeof File !== 'undefined' && ertek instanceof File)
      ? ((await kepFeltoltes(ertek, token))?.url ?? null)
      : ertek;
  }
  return ki;
}

// ===================================
// POST KÉRÉS (FORMDATA - FÁJLFELTÖLTÉS)
// ===================================
// Fájlt tartalmazó form küldéséhez (pl. ikon feltöltés) — ⭐ D101: JSON-ra fordítva (lásd fent).
// @param {string} utvonal - pl. 'kategoria'
// @param {FormData} formData - A feltöltendő FormData objektum
// @param {string|null} token
async function apiPostFormData(utvonal, formData, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPostFormData - KEZDÉS', { utvonal });
  const eredmeny = await apiPost(utvonal, await formDataJsonna(formData, token), token);
  // Metódus vég log
  console.log('apiHelper.apiPostFormData - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// PATCH KÉRÉS (FORMDATA - FÁJLFELTÖLTÉS)
// ===================================
// Ugyanaz, PATCH metódussal — ⭐ D101: JSON-ra fordítva. ⚠️ A koinóban a besorolás SZERKESZTÉSE javaslat (a
// `JavaslatModal` útja), a kapu ezért ezt az útvonalat nem szolgálja ki; a fordítás csak az egyformaságért van itt.
// @param {string} utvonal - pl. 'kategoria/abc123'
// @param {FormData} formData
// @param {string|null} token
async function apiPatchFormData(utvonal, formData, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiPatchFormData - KEZDÉS', { utvonal });
  const eredmeny = await apiPatch(utvonal, await formDataJsonna(formData, token), token);
  // Metódus vég log
  console.log('apiHelper.apiPatchFormData - VÉGE', { utvonal });
  return eredmeny;
}

// ===================================
// GET KÉRÉS
// ===================================
// @param {string} utvonal
// @param {string|null} token
async function apiGet(utvonal, token = null) {
  // Metódus kezdő log
  console.log('apiHelper.apiGet - KEZDÉS', { utvonal });

  // ⭐⭐ A HÁZ (D100): A PROTOTÍPUS PAKLI-ÚTVONALAI. Az örökölt `Pakli.js` a prototípus útvonalait kérdezi; a program
  // a sajátjait beszéli. A fordítás a `kartyaAdat.js`-é (egy fájl), itt csak a kérés megy máshova, és a válasz
  // fordítva jön vissza. A pakli válasza egyben a lap új horgonya (a kártyák szövege, tudatpontja ugyanabból a
  // képből), és a `Pakli.js` által nem tárolt részt (betöltés, hiányzók, lapozás) egy esemény viszi a
  // `koinoPakli.js`-nek.
  const proto = prototipusUtvonala(utvonal);
  if (proto) {
    const nyers = await apiKeres(proto.utvonal, { method: 'GET' }, token);
    if (proto.horgonyt) lapHorgonyaBeallitasa({ horgony: nyers?.horgony, most: nyers?.most });
    document.dispatchEvent(new CustomEvent('koino:pakliValasz', { detail: proto.jel(nyers) }));
    console.log('apiHelper.apiGet - VÉGE (prototípus-útvonal)', { utvonal, hova: proto.utvonal });
    return proto.fordit(nyers);
  }

  // ⭐ A LAP HORGONYA: minden olvasás ugyanabból a képből jöjjön, amiből a lista készült.
  const eredmeny = await apiKeres(horgonnyal(utvonal), { method: 'GET' }, token);
  // ⭐ D101: a tudás határa — ha a program megjegyzést fűzött a válaszhoz (D19: kimondja, amit nem tud), az esemény a
  // `koinoModalok.js`-hez viszi (az örökölt modál nem ismeri ezt a mezőt). ⭐ D101 ④: vele a `betoltes` jel is (a
  // program elkérte, ami hiányzik — érdemes később újrakérdezni).
  if (eredmeny && typeof eredmeny === 'object' && 'koinoMegjegyzes' in eredmeny) {
    document.dispatchEvent(new CustomEvent('koino:megjegyzes',
      { detail: { utvonal, szoveg: eredmeny.koinoMegjegyzes, betoltes: eredmeny.betoltes === true,
        // ⭐ (2026-10-23) a lapozás (a Tudatpontok „További” gombja): a következő oldal kurzora és az összes
        kovetkezoKurzor: eredmeny.kovetkezoKurzor ?? null, osszes: Number.isInteger(eredmeny.osszes) ? eredmeny.osszes : null } }));
  }
  // ⭐ D116: a felderítetlen rész jele — a sorok `koinoHiany`-ja (a Síkidom gyerekei és ős-lánca); az örökölt modál nem ismeri
  // ezt a mezőt, a `koinoModalok.js` veszi át (az esemény viszi, a modál adat-útja érintetlen).
  const hianyok = valaszHianyai(eredmeny);
  if (hianyok.length) document.dispatchEvent(new CustomEvent('koino:hiany', { detail: hianyok }));
  // Metódus vég log
  console.log('apiHelper.apiGet - VÉGE', { utvonal });
  return eredmeny;
}

/** ⭐ D116: egy válasz soraiban a `koinoHiany` mezők — [entitás, hiány] párok (a sor nélküli válasznál üres). */
function valaszHianyai(eredmeny) {
  const ki = [];
  if (!eredmeny || typeof eredmeny !== 'object') return ki;
  for (const mezo of ['gyerekek', 'oslanc', 'sorok']) {
    for (const sor of Array.isArray(eredmeny[mezo]) ? eredmeny[mezo] : []) {
      if (sor && sor.entitasId != null && 'koinoHiany' in sor) ki.push([String(sor.entitasId), sor.koinoHiany ?? null]);
    }
  }
  return ki;
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
// ⭐⭐ A KOINÓBAN NEM `multipart/form-data`, HANEM BASE64 EGY JSON TESTBEN (5.7).
//
// ⛔ MIÉRT: az 5.5 harmadik őre szerint a kapu **csak `application/json` testet** fogad el,
// mert a JSON tartalomtípus **kötelezővé teszi** a böngésző előellenőrzését (preflight),
// amit a kapunk nem enged át — *így a böngésző maga állítja meg az idegen írást, még
// mielőtt ideérne.* Egy `multipart` feltöltés pontosan ezt az őrt kerülné meg.
//
// ⚠️ Az ára +33% méret — de ez egy **helyi** kérés (127.0.0.1), nem megy hálózaton.
//
// ⭐ A FÁJL a lenyomata alatt kerül tárolásra; a válasz `url`-je erre mutat, és a program
// olvasáskor újra lenyomatolja. *A hívó (`FeltoltesKezelo`) ettől nem változott — bájtra
// ugyanaz, mint a prototípusban.*
async function fajlBase64(fajl) {
  const puffer = await fajl.arrayBuffer();
  const bajtok = new Uint8Array(puffer);
  let szoveg = '';
  // Darabokban, mert a `String.fromCharCode(...nagyTomb)` túlcsordítja a hívási vermet.
  const DARAB = 0x8000;
  for (let i = 0; i < bajtok.length; i += DARAB) {
    szoveg += String.fromCharCode.apply(null, bajtok.subarray(i, i + DARAB));
  }
  return btoa(szoveg);
}

async function kepFeltoltes(fajl, token = null) {
  console.log('apiHelper.kepFeltoltes - KEZDÉS', { nev: fajl.name, meret: fajl.size });
  const eredmeny = await apiPost('feltoltes/kep',
    { adat: await fajlBase64(fajl), nev: fajl.name }, token);
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
  const eredmeny = await apiPost('feltoltes/fajl',
    { adat: await fajlBase64(fajl), nev: fajl.name }, token);
  console.log('apiHelper.fajlFeltoltes - VÉGE', { url: eredmeny?.url });
  return eredmeny;
}

// ===================================
// EXPORTÁLÁS
// ===================================
// VÁLTOZÁS: apiPostFormData és apiPatchFormData hozzáadva az exporthoz
export { apiPost, apiPostFormData, apiGet, apiPut, apiPatch, apiPatchFormData, apiDelete, kepFeltoltes, fajlFeltoltes };
// A `lapHorgonyaBeallitasa` és a `kapuKulcs` fent, a saját szakaszukban exportálódik.