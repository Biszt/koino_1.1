// koino/js/esemeny/kanonikusAlak.js

// Felelősség: egy adatot MINDIG UGYANAZOKKÁ A BÁJTOKKÁ alakítani — és ezekből
// kiszámolni az esemény azonosítóját (a tartalmának lenyomatát).
//
// MIÉRT EZ A LEGVESZÉLYESEBB RÉSZLET AZ EGÉSZ SZAKASZBAN?
// A koinóban egy esemény NEVE a tartalmának lenyomata (hash) — pontosan úgy, ahogy a
// git nevezi el az objektumait. Ez adja azt a három tulajdonságot, amin minden más áll:
//   - két gép ugyanarra az eseményre UGYANAZT a nevet adja → az összefésülés triviális,
//   - egyetlen bájt változása MÁS nevet ad → a hamisítás nem rejthető el,
//   - a hivatkozás („erre a javaslatra szavaztam") önmagát ellenőrzi.
// Mindhárom azon múlik, hogy ugyanaz a logikai adat MINDIG ugyanazokat a bájtokat adja.
// Ha ez elromlik, két gép ugyanarra az eseményre két különböző nevet ad, és SOHA nem
// fognak egyetérteni — méghozzá némán, mert semmi nem jelez hibát.
//
// A `JSON.stringify` erre önmagában ALKALMATLAN: a mezők sorrendje a beszúrás
// sorrendjét követi, tehát ugyanaz az adat máshogy összerakva más szöveget ad.
//
// A minta: RFC 8785 (JSON Canonicalization Scheme). A mi változatunk annak egyszerűbb
// és SZIGORÚBB alakja — a szigorítást lásd a „csak egész szám" szabálynál.
//
// Használják: az esemény-réteg (aláírás, azonosító), és minden, ami hash-t számol.

// ===================================
// A KANONIKUS ALAK SZABÁLYAI
// ===================================
//
// 1. MEZŐNEVEK RENDEZVE — mindig ábécé (pontosabban kódegység) szerint, rekurzívan.
//    Ettől lesz mindegy, milyen sorrendben raktuk össze az objektumot.
//
// 2. CSAK EGÉSZ SZÁM (saját szigorítás, 2026-08-27). A törtszámok (lebegőpontos
//    számok) írásmódja nyelvenként és motoronként eltérhet, és az eltérés NÉMA.
//    Ezért a koino eseményeiben tört szám NEM SZEREPELHET — a kód hibát dob rá.
//    Ahol tört kellene (pl. egy küszöb 66,7%-a), ott KISEBB ALAPEGYSÉGET használunk
//    (pl. ezrelék: 667). Ugyanez a szabály készít fel a pénzre is (D10/D16), ahol az
//    egész aritmetika amúgy is kötelező lesz.
//
// 3. SZÖVEG NFC-RE NORMALIZÁLVA. Az „é" betű a Unicode-ban kétféleképpen is leírható
//    (egy karakterként, vagy „e" + ékezet). Szemre azonos, bájtban különböző. Az NFC
//    az egységesített alak.
//
// 4. `undefined` MEZŐ NEM SZEREPEL. A `null` viszont igen: annak jelentése van
//    („szándékosan üres"), míg az `undefined` azt jelenti, „nincs ilyen mező".
//
// 5. A TÖMBÖK SORRENDJE MARAD. Ott a sorrend jelentés, nem véletlen.

/**
 * Egy értéket kanonikus JSON-szöveggé alakít.
 * @param {*} ertek - objektum, tömb, szöveg, egész szám, logikai érték vagy null
 * @returns {string}
 */
export function kanonikusSzoveg(ertek) {
  return kanonizal(ertek, []);
}

/**
 * A tényleges átalakítás — rekurzívan.
 * @param {*} ertek
 * @param {Array<string>} ut - hol tartunk (csak a hibaüzenethez, hogy megtalálható legyen)
 * @returns {string}
 */
function kanonizal(ertek, ut) {
  const hol = ut.length ? ' (itt: ' + ut.join('.') + ')' : '';

  // ----- NULL -----
  if (ertek === null) return 'null';

  // ----- LOGIKAI -----
  if (typeof ertek === 'boolean') return ertek ? 'true' : 'false';

  // ----- SZÁM: CSAK EGÉSZ -----
  if (typeof ertek === 'number') {
    if (!Number.isFinite(ertek)) {
      throw new Error('Az eseményben nem lehet végtelen vagy NaN érték' + hol);
    }
    if (!Number.isInteger(ertek)) {
      throw new Error(
        'Az eseményben csak EGÉSZ szám lehet, de ez tört: ' + ertek + hol +
        ' — használj kisebb alapegységet (pl. százalék helyett ezreléket).'
      );
    }
    if (!Number.isSafeInteger(ertek)) {
      throw new Error('Ez a szám túl nagy ahhoz, hogy pontos maradjon: ' + ertek + hol);
    }
    // A -0 és a 0 ugyanaz a szám, de a `String(-0)` „0"-t ad — ez itt szerencsés,
    // mert így nem lehet két különböző írásmódja ugyanannak a nullának.
    return String(ertek);
  }

  // ----- SZÖVEG -----
  if (typeof ertek === 'string') {
    // Az NFC normalizálás UTÁN idézőjelezünk, hogy a menekítés a végleges alakra menjen
    return JSON.stringify(ertek.normalize('NFC'));
  }

  // ----- TÖMB: a sorrend marad -----
  if (Array.isArray(ertek)) {
    const elemek = ertek.map((elem, i) => {
      if (elem === undefined) {
        // A tömbben lévő „lyuk" némán null-lá válna a JSON.stringify-ban — ezt inkább
        // hibának tekintjük, mint csendben másra cserélni.
        throw new Error('Tömbben nem lehet undefined elem' + hol + '[' + i + ']');
      }
      return kanonizal(elem, ut.concat(String(i)));
    });
    return '[' + elemek.join(',') + ']';
  }

  // ----- OBJEKTUM: a mezőnevek RENDEZVE -----
  if (typeof ertek === 'object') {
    const nevek = Object.keys(ertek)
      .filter((nev) => ertek[nev] !== undefined)   // a hiányzó mező nem szerepel
      .sort();                                     // ← ITT dől el a determinizmus

    const parok = nevek.map((nev) => {
      const kanonikusNev = JSON.stringify(nev.normalize('NFC'));
      return kanonikusNev + ':' + kanonizal(ertek[nev], ut.concat(nev));
    });
    return '{' + parok.join(',') + '}';
  }

  // ----- BÁRMI MÁS: nem mehet eseménybe -----
  throw new Error('Ez a típus nem szerepelhet eseményben: ' + typeof ertek + hol);
}

// ===================================
// BÁJTOK ÉS LENYOMAT
// ===================================

/**
 * A kanonikus alak UTF-8 bájtjai. EZT hasheljük és EZT írjuk alá.
 * @param {*} ertek
 * @returns {Uint8Array}
 */
export function kanonikusBajtok(ertek) {
  return new TextEncoder().encode(kanonikusSzoveg(ertek));
}

/**
 * Egy érték lenyomata (SHA-256), base64url alakban.
 *
 * Miért base64url? Mert rövidebb, mint a hexadecimális (43 karakter a 64 helyett), és
 * biztonságosan szerepelhet URL-ben és fájlnévben is.
 *
 * @param {*} ertek
 * @returns {Promise<string>} 43 karakteres azonosító
 */
export async function lenyomat(ertek) {
  const bajtok = kanonikusBajtok(ertek);
  const hash = await crypto.subtle.digest('SHA-256', bajtok);
  return bajtokBase64Url(new Uint8Array(hash));
}

/**
 * Bájtok → base64url szöveg.
 * @param {Uint8Array} bajtok
 * @returns {string}
 */
export function bajtokBase64Url(bajtok) {
  let szoveg = '';
  for (const b of bajtok) szoveg += String.fromCharCode(b);
  return btoa(szoveg).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * base64url szöveg → bájtok (az ellenőrzéshez kell, pl. az aláírás visszaolvasásához).
 * @param {string} szoveg
 * @returns {Uint8Array}
 */
export function base64UrlBajtok(szoveg) {
  const base64 = szoveg.replace(/-/g, '+').replace(/_/g, '/');
  const nyers = atob(base64);
  const bajtok = new Uint8Array(nyers.length);
  for (let i = 0; i < nyers.length; i++) bajtok[i] = nyers.charCodeAt(i);
  return bajtok;
}
