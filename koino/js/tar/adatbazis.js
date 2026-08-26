// koino/js/tar/adatbazis.js

// Felelősség: a készüléken lévő adatbázis (IndexedDB) megnyitása és a tárak létrehozása.
// Ez az EGYETLEN hely, ahol az adatbázis szerkezete le van írva.
//
// Miért IndexedDB? Mert a koino adata a KÉSZÜLÉKEN él, nem szerveren (D22). A böngésző
// erre két tárolót ad: a localStorage (kicsi, csak szöveg) és az IndexedDB (nagy, bármit
// tárol — mértük: ~2,5 GB, és a kriptográfiai kulcsokat is közvetlenül elfogadja).
//
// A tárak (a Szakasz 1 terve szerint):
//   - esemenyek : minden aláírt esemény, az azonosítója (hash) szerint
//   - allapot   : az eseményekből SZÁMÍTOTT entitások — eldobható gyorsítótár
//   - kulcsok   : a saját kulcspár (egy kulcs az egész belépő térben — D25)
//
// Használják: kulcsTar.js (és a további lépésekben az esemény- és állapot-rétegek).

// ===== ÁLLANDÓK =====

// Az adatbázis neve és verziója. A verziószám emelése futtatja le a szerkezet-frissítést.
const ADATBAZIS_NEV = 'koino';
const ADATBAZIS_VERZIO = 1;

// A tárak nevei — máshol EZEKRE hivatkozunk, sosem szövegesen beírva
export const TAR = {
  ESEMENYEK: 'esemenyek',
  ALLAPOT: 'allapot',
  KULCSOK: 'kulcsok'
};

// A megnyitott adatbázis — egyszer nyitjuk meg, utána újrahasználjuk
let adatbazisIgeret = null;

// ===================================
// AZ ADATBÁZIS MEGNYITÁSA
// ===================================

/**
 * Megnyitja (és ha kell, létrehozza) a koino adatbázisát.
 * Többszöri hívás ugyanazt a kapcsolatot adja vissza.
 * @returns {Promise<IDBDatabase>}
 */
export function adatbazisMegnyitasa() {
  if (adatbazisIgeret) return adatbazisIgeret;

  console.log('adatbazisMegnyitasa - KEZDÉS', { nev: ADATBAZIS_NEV, verzio: ADATBAZIS_VERZIO });

  adatbazisIgeret = new Promise((kesz, hiba) => {
    const keres = indexedDB.open(ADATBAZIS_NEV, ADATBAZIS_VERZIO);

    // ----- A SZERKEZET LÉTREHOZÁSA / FRISSÍTÉSE -----
    // Ez CSAK akkor fut le, ha az adatbázis még nincs meg, vagy a verzió nőtt.
    keres.onupgradeneeded = (esemeny) => {
      const db = keres.result;
      console.log('adatbazisMegnyitasa - szerkezet létrehozása', {
        regiVerzio: esemeny.oldVersion,
        ujVerzio: esemeny.newVersion
      });

      // ----- ESEMÉNYEK -----
      // Kulcs: az esemény azonosítója (a tartalmának lenyomata). Az esemény MAGA a
      // kulcsa — ezért nincs külön "id" mező, és ezért nem lehet két különböző esemény
      // ugyanazon a néven.
      if (!db.objectStoreNames.contains(TAR.ESEMENYEK)) {
        const esemenyek = db.createObjectStore(TAR.ESEMENYEK, { keyPath: 'azonosito' });
        // A saját lánc bejárásához: ki írta és hányadikként
        esemenyek.createIndex('szerzoSorszam', ['szerzo', 'sorszam'], { unique: false });
        // Egy készüléken több koino is lehet (D25)
        esemenyek.createIndex('koino', 'koino', { unique: false });
      }

      // ----- ÁLLAPOT -----
      // Az eseményekből számított entitások. ELDOBHATÓ: bármikor újraszámolható
      // (mértük: 10 000 esemény ellenőrzése ~0,58 mp). Azért tároljuk, hogy az indulás
      // gyors legyen, nem azért, mert ez lenne az igazság.
      if (!db.objectStoreNames.contains(TAR.ALLAPOT)) {
        db.createObjectStore(TAR.ALLAPOT, { keyPath: 'azonosito' });
      }

      // ----- KULCSOK -----
      // A saját kulcspár. Egyszerű név→érték tár (nincs keyPath), mert kevés elem van
      // benne, és a nevük rögzített (lásd kulcsTar.js).
      if (!db.objectStoreNames.contains(TAR.KULCSOK)) {
        db.createObjectStore(TAR.KULCSOK);
      }
    };

    keres.onsuccess = () => {
      console.log('adatbazisMegnyitasa - VÉGE (sikeres)');
      kesz(keres.result);
    };

    keres.onerror = () => {
      console.error('adatbazisMegnyitasa - HIBA', keres.error);
      adatbazisIgeret = null; // legközelebb újra lehessen próbálni
      hiba(keres.error);
    };
  });

  return adatbazisIgeret;
}

// ===================================
// EGYSZERŰ ÍRÁS / OLVASÁS
// ===================================

/**
 * Egy érték kiolvasása egy tárból.
 * @param {string} tarNev - a TAR állandó egyik értéke
 * @param {*} kulcs
 * @returns {Promise<*>} az érték, vagy undefined ha nincs
 */
export async function olvasas(tarNev, kulcs) {
  const db = await adatbazisMegnyitasa();
  return new Promise((kesz, hiba) => {
    const keres = db.transaction(tarNev, 'readonly').objectStore(tarNev).get(kulcs);
    keres.onsuccess = () => kesz(keres.result);
    keres.onerror = () => hiba(keres.error);
  });
}

/**
 * Egy érték beírása egy tárba.
 * @param {string} tarNev - a TAR állandó egyik értéke
 * @param {*} ertek
 * @param {*} [kulcs] - csak a keyPath NÉLKÜLI táraknál (pl. kulcsok)
 * @returns {Promise<void>}
 */
export async function iras(tarNev, ertek, kulcs) {
  const db = await adatbazisMegnyitasa();
  return new Promise((kesz, hiba) => {
    const trans = db.transaction(tarNev, 'readwrite');
    trans.objectStore(tarNev).put(ertek, kulcs);
    trans.oncomplete = () => kesz();
    trans.onerror = () => hiba(trans.error);
  });
}

// ===================================
// TARTÓS TÁROLÁS KÉRÉSE
// ===================================

/**
 * Megkéri a böngészőt, hogy NE ürítse ki magától a tárat.
 *
 * MIÉRT FONTOS (mérve, 2026-08-26): alapból a böngésző helyszűke esetén törölheti az
 * adatot — és ezzel a KULCSOT is, ami maga az azonosságod. Ez nem ritka határeset,
 * hanem hétköznapi kockázat, ezért kérjük meg rögtön a kulcs létrehozásakor.
 *
 * A böngésző dönt: van, ahol magától megadja (ha az oldal "fontosnak" tűnik), van, ahol
 * rákérdez, és van, ahol elutasítja. Az elutasítás NEM hiba — ezért is kérjük a
 * kulcs-mentést a felhasználótól.
 *
 * @returns {Promise<boolean>} sikerült-e
 */
export async function tartosTarolasKerese() {
  console.log('tartosTarolasKerese - KEZDÉS');

  if (!navigator.storage || !navigator.storage.persist) {
    console.log('tartosTarolasKerese - VÉGE (a böngésző nem ismeri)');
    return false;
  }

  // Ha már engedélyezve van, ne kérjük újra
  const mar = await navigator.storage.persisted();
  if (mar) {
    console.log('tartosTarolasKerese - VÉGE (már engedélyezve volt)');
    return true;
  }

  const sikerult = await navigator.storage.persist();
  console.log('tartosTarolasKerese - VÉGE', { sikerult });
  return sikerult;
}
