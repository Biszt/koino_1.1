// koino/felulet/js/utils/authHelper.js

// Felelősség: azt adni, amit a prototípus `authHelper.js`-e adott — csak a koino világában.
//
// ===== ⚠️ EZ A FÁJL NEM MÁSOLAT, HANEM CSERE — és ennek oka van =====
//
// A prototípus `authHelper.js`-e **a bejelentkezésről** szólt: JWT token mentése,
// lekérése, törlése, „be van-e jelentkezve". ⛔ **A koinóban ebből semmi nincs (D15):**
// nincs jelszó, nincs bejelentkezés, nincs token — *a kulcs maga vagy te*, és a kulcs a
// készüléken van, nem a lapon.
//
// ⭐ Az EXPORT-NEVEK viszont ugyanazok maradtak. Ez szándékos: a `Kartya.js` így
// **változatlanul** hozzáfér ahhoz, amit vár (`tokenLekerese`, `aktivEntitasMentese`), és
// egy későbbi átemelt fájl sem fog beleakadni egy hiányzó névbe.
//
// ⚠️ AMI A „TOKEN" HELYÉN ÁLL: a **kapu jelszava**. Az sem azonosít — csak azt bizonyítja,
// hogy a kérés a saját gépről, a saját lapról jön. A koino kapuja változatlanul az
// `esemenyMentese` (3. szabály).
//
// Használják: `components/kartya/Kartya.js` (és később a többi átemelt komponens).

import { kapuKulcs } from './apiHelper.js';

// ===================================
// A „TOKEN" — valójában a kapu jelszava
// ===================================

/**
 * ⭐ A prototípusban ez a JWT tokent adta vissza. Itt a kapu jelszavát adja — amit az
 * `apiHelper` amúgy is minden kéréshez hozzátesz. A hívónak nem kell tudnia a
 * különbségről.
 *
 * @returns {string|null}
 */
export function tokenLekerese() {
  const kulcs = kapuKulcs();
  return kulcs || null;
}

/**
 * ⛔ NINCS MIT MENTENI. A jelszó a címsorból jön, minden indításkor új, és sehol nem
 * tároljuk — ha eltárolnánk, épp azt a tulajdonságát veszítené el, ami véd.
 */
export function tokenMentese() {
  console.warn('authHelper.tokenMentese - a koinóban nincs token, amit menteni kellene (D15)');
}

/** ⛔ Ugyanezért nincs mit törölni sem. */
export function tokenTorlese() {
  console.warn('authHelper.tokenTorlese - a koinóban nincs token (D15)');
}

// ===================================
// „KI VAGYOK?" — a helyi kulcs
// ===================================

// A programtól kérdezzük meg, egyszer, és megjegyezzük a lap életére.
let eember = null;

/**
 * A saját azonosságom. ⚠️ Nem „bejelentkezett felhasználó": a készülék kulcsa.
 * @param {Object} adat - { azonosito, rovid, koino }
 */
export function eemberMentese(adat) {
  eember = adat;
}

/** @returns {Object|null} */
export function eemberLekerese() {
  return eember;
}

/**
 * ⭐ A koinóban ez MINDIG igaz, amíg a lap el tudja érni a programot: a kulcs ott van a
 * gépen. Nincs „kijelentkezve" állapot.
 */
export function beVanJelentkezve() {
  return true;
}

// ===================================
// AZ AKTÍV ENTITÁS — hova navigáljon vissza a pakli
// ===================================
//
// ⭐ Ez a rész VÁLTOZATLANUL értelmes a koinóban is: ha egy menüpontból elnavigálunk,
// jegyezzük meg, melyik kártyánál álltunk. Helyi kényelem, semmi több — nem esemény, nem
// terjed, semmit nem dönt el (3. szabály).

const AKTIV_KULCS = 'koino-aktiv-entitas';

/**
 * @param {string} entitasId
 * @param {string} entitasTipus
 */
export function aktivEntitasMentese(entitasId, entitasTipus) {
  console.log('authHelper.aktivEntitasMentese - KEZDÉS', { entitasId, entitasTipus });
  try {
    sessionStorage.setItem(AKTIV_KULCS, JSON.stringify({ entitasId, entitasTipus }));
  } catch {
    // Egy tiltott tároló nem akadályozhatja meg a felület működését.
    console.warn('authHelper.aktivEntitasMentese - a tároló nem elérhető, kihagyva');
  }
  console.log('authHelper.aktivEntitasMentese - VÉGE');
}

/** @returns {{entitasId: string|null, entitasTipus: string|null}} */
export function aktivEntitasLekerese() {
  try {
    const nyers = sessionStorage.getItem(AKTIV_KULCS);
    if (!nyers) return { entitasId: null, entitasTipus: null };
    const adat = JSON.parse(nyers);
    return { entitasId: adat?.entitasId ?? null, entitasTipus: adat?.entitasTipus ?? null };
  } catch {
    return { entitasId: null, entitasTipus: null };
  }
}
