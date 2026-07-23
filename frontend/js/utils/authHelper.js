// frontend/js/utils/authHelper.js

// ===== KOINO – Auth Helper =====
// JWT token és eemberi adatok kezelése.
// TÁROLÁSI STRATÉGIA:
//   - Token: memória (gyors elérés) + localStorage (oldalfrissítés túlélése)
//   - Eember adatok: memória (oldalfrissítéskor az API-ból újratöltjük)
// MIÉRT localStorage a tokennek?
//   Az eredeti sandbox-korlátozás már nem érvényes a valódi szerveren.
//   A localStorage-ban tárolt token lehetővé teszi, hogy oldalfrissítés
//   után ne kelljen újra bejelentkezni.

// Modul szintű változók – az alkalmazás életciklusa alatt élnek
let token = null;
let eember = null;

// A localStorage kulcsa – ha változtatni kell, csak itt kell módosítani
const TOKEN_KULCS = 'koino_token';

// ===== JWT TOKEN MENTÉSE =====
// Memóriába ÉS localStorage-ba menti a tokent.
// @param {string} ujToken – A szerver által visszaadott JWT token
function tokenMentese(ujToken) {
  console.log('authHelper.tokenMentese - KEZDÉS', { tokenHossz: ujToken?.length ?? 0 });

  // Memóriába mentés (gyors elérés az alkalmazás futása közben)
  token = ujToken;

  // localStorage-ba mentés (oldalfrissítés után is megmarad)
  if (ujToken) {
    localStorage.setItem(TOKEN_KULCS, ujToken);
  } else {
    localStorage.removeItem(TOKEN_KULCS);
  }

  console.log('authHelper.tokenMentese - VÉGE', { tokenMentve: !!token });
}

// ===== JWT TOKEN LEKÉRÉSE =====
// Először memóriából próbál olvasni.
// Ha ott nincs (pl. oldalfrissítés után), localStorage-ból tölti vissza.
// @returns {string|null}
function tokenLekerese() {
  console.log('authHelper.tokenLekerese - KEZDÉS');

  // Ha a memóriában nincs token, megpróbáljuk visszatölteni localStorage-ból
  if (!token) {
    const mentettToken = localStorage.getItem(TOKEN_KULCS);
    if (mentettToken) {
      // Visszatöltés a memóriába (a következő hívásnál már memóriából jön)
      token = mentettToken;
      console.log('authHelper.tokenLekerese - token visszatöltve localStorage-ból');
    }
  }

  console.log('authHelper.tokenLekerese - VÉGE', { vanToken: !!token });
  return token;
}

// ===== TOKEN ÉS EEMBER TÖRLÉSE =====
// Kijelentkezéskor: memóriából ÉS localStorage-ból is törli a tokent.
function tokenTorlese() {
  console.log('authHelper.tokenTorlese - KEZDÉS');

  // Memória törlése
  token = null;
  eember = null;

  // localStorage törlése
  localStorage.removeItem(TOKEN_KULCS);

  console.log('authHelper.tokenTorlese - VÉGE', { tokenTorolt: true });
}

// ===== EEMBER ADATOK MENTÉSE =====
// Csak memóriába menti – oldalfrissítéskor az API-ból töltjük újra.
// @param {object} eemberAdatok – A szerver által visszaadott eember objektum
function eemberMentese(eemberAdatok) {
  console.log('authHelper.eemberMentese - KEZDÉS', { eemberNev: eemberAdatok?.eemberNev });
  eember = eemberAdatok;
  console.log('authHelper.eemberMentese - VÉGE', { eemberMentve: !!eember });
}

// ===== EEMBER ADATOK LEKÉRÉSE =====
// @returns {object|null}
function eemberLekerese() {
  console.log('authHelper.eemberLekerese - KEZDÉS/VÉGE', { vanEember: !!eember });
  return eember;
}

// ===== BE VAN JELENTKEZVE? =====
// Ellenőrzi, hogy van-e érvényes token (memóriában VAGY localStorage-ban).
// @returns {boolean}
function beVanJelentkezve() {
  console.log('authHelper.beVanJelentkezve - KEZDÉS');

  // tokenLekerese() automatikusan megnézi a localStorage-t is, ha kell
  const aktualisToken = tokenLekerese();

  console.log('authHelper.beVanJelentkezve - VÉGE', { bejelentkezve: !!aktualisToken });
  return aktualisToken !== null;
}

// ===== AKTÍV ENTITÁS MENTÉSE =====
// Elmenti a legutóbb kiválasztott entitás azonosítóját és típusát localStorage-ba,
// hogy oldalfrissítés után vissza lehessen tölteni.
// @param {string} entitasId   – az entitás azonosítója
// @param {string} entitasTipus – pl. 'Tartalom', 'Kategoria'
function aktivEntitasMentese(entitasId, entitasTipus) {
  console.log('authHelper.aktivEntitasMentese - KEZDÉS', { entitasId, entitasTipus });

  if (entitasId && entitasTipus) {
    localStorage.setItem('koino_aktiv_entitas_id',     entitasId.toString());
    localStorage.setItem('koino_aktiv_entitas_tipus',  entitasTipus);

    // ===== KÖZÖS NAVIGÁCIÓS JELZÉS =====
    // MINDEN entitás-váltás átfut ezen a függvényen (kártya-koppintás, testvér-ugrás,
    // térkép/kereső/értesítés – akár a fő menüből, akár egy kártya menüjéből), ezért
    // ez az egyetlen közös hely, ahonnan a vissza/előre történetet rögzíteni lehet.
    // A FoOldal erre az eseményre figyel (koino:aktivEntitasValtozas) és rögzít.
    document.dispatchEvent(new CustomEvent('koino:aktivEntitasValtozas', {
      detail: { entitasId: entitasId.toString(), entitasTipus }
    }));
  } else {
    localStorage.removeItem('koino_aktiv_entitas_id');
    localStorage.removeItem('koino_aktiv_entitas_tipus');
  }

  console.log('authHelper.aktivEntitasMentese - VÉGE', { mentve: !!(entitasId && entitasTipus) });
}

// ===== AKTÍV ENTITÁS LEKÉRÉSE =====
// Visszaadja a localStorage-ban tárolt entitás azonosítóját és típusát,
// vagy null értékeket, ha nincs mentett adat.
// @returns {{ entitasId: string|null, entitasTipus: string|null }}
function aktivEntitasLekerese() {
  console.log('authHelper.aktivEntitasLekerese - KEZDÉS');

  const entitasId    = localStorage.getItem('koino_aktiv_entitas_id')    ?? null;
  const entitasTipus = localStorage.getItem('koino_aktiv_entitas_tipus') ?? null;

  console.log('authHelper.aktivEntitasLekerese - VÉGE', { entitasId, entitasTipus });
  return { entitasId, entitasTipus };
}

// ===== EXPORTÁLÁS =====
export {
  tokenMentese,
  tokenLekerese,
  tokenTorlese,
  eemberMentese,
  eemberLekerese,
  beVanJelentkezve,
  aktivEntitasMentese,   
  aktivEntitasLekerese, 
};