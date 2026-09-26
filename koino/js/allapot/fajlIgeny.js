// koino/js/allapot/fajlIgeny.js

// Felelősség: MEGMONDANI, MELY FÁJLOKRA VAN SZÜKSÉGEM — és melyekre nincs.
//
// ===== ⭐ EZ A SZÁLLÍTÁS ELSŐ FELE (Csaba terve, 2026-09-12) =====
//
// > *„az eseményekből a buli alkalmával megtudják a készülékek, hogy kinek mire van
// > szüksége, és a buli után fent kell tartani a kapcsolatot azon eszközöknek, amik
// > nagyobb csomagot kell hogy küldjenek egymásnak."*
//
// ⭐⭐ **A FELDERÍTÉS NEM KÍVÁN ÚJ ADATOT.** A gondolatok szövegében ott a kép-hivatkozás,
// a besorolásokban az ikon — vagyis az **események már elmondják**, mely fájlok tartoznak
// a koinóhoz. Ez a lap csak összeveti azzal, ami a lemezen megvan. *Az olcsó rész
// (a hivatkozások) mondja meg, mire érdemes elindítani a drága részt (a bájtokat).*
//
// ===== ⛔⛔ ÉS A TUDATPONT ITT TÁROLÁSI VÁLLALÁS (D3) =====
//
// *„Egy entitást a tudatpont-tulajdonosainak készülékei tárolnak… Amihez senki nem rendel
// pontot → közösségi felejtés."*
//
// ⭐ Ezért a válasz **nem egy lista, hanem két lista**: amire nekem magamnak szükségem van
// (tudatpontot tettem rá, tehát **vállaltam**), és ami csak „arra jár". Enélkül a
// felderítés azt jelentené, hogy *„add ide a koino összes képét"* — pontosan az az alak,
// amit a 9. szabály tilt.
//
// ===== ⚠️ HÁLÓZATOT ÉS TÁRAT NEM IMPORTÁL =====
//
// A „megvan-e?" kérdést **kívülről kapja** (`megvanE`), ugyanúgy, ahogy a `tarsak.js` a
// cserét végző függvényt (1. szabály). Ettől tár nélkül próbázható, és ettől cserélhető ki
// alatta a tárolás anélkül, hogy ez a logika változna.
//
// Használják: a csere (a buli kérelem-listájához) és a `koino.js` (`fajlok` parancs).

// ⭐ A FÁJL-HIVATKOZÁS ALAKJA: `/api/fajl/<43 karakteres lenyomat>`. Ez a felület útvonala,
// és szándékosan ez van az eseményben is — így a kép a lapon **fordítás nélkül** megjelenik.
import { szovegHivatkozasE } from '../esemeny/szovegDarab.js';

const HIVATKOZAS = /^\/api\/fajl\/([A-Za-z0-9_-]{43})$/;

/**
 * Egy `url` mezőből a lenyomat — vagy null, ha nem a koino fájlja.
 *
 * ⚠️ A SZIGOR SZÁNDÉKOS: egy `https://valahol.example/kep.png` **nem** a koino fájlja, és
 * nem is akarjuk letölteni. *A koino nem hoz be adatot idegen címről* (2. szabály).
 */
export function lenyomatUrlbol(url) {
  if (typeof url !== 'string') return null;
  const talalat = url.match(HIVATKOZAS);
  return talalat ? talalat[1] : null;
}

/**
 * Egy entitás fájl-hivatkozásai.
 *
 * Két helyen lehet fájl:
 *   · a **szöveg blokkjaiban** (`kep`, `fajl` — a blokk `url` mezője),
 *   · az **ikonban** (a besorolásoké lehet emoji VAGY kép — 5.4).
 *
 * @param {Object} entitas
 * @returns {Set<string>} lenyomatok
 */
export function entitasFajljai(entitas) {
  const talalt = new Set();

  const felvesz = (url) => {
    const lenyomat = lenyomatUrlbol(url);
    if (lenyomat) talalt.add(lenyomat);
  };

  felvesz(entitas?.ikon);

  // ⚠️ A szöveg kétféle alakú lehet (sima szöveg VAGY blokk-tömb) — csak a tömbben lehet
  // fájl, de a másikon sem szabad elhasalni.
  if (Array.isArray(entitas?.szoveg)) {
    for (const blokk of entitas.szoveg) felvesz(blokk?.url);
  }
  // ⭐ D72: és egy harmadik — a szöveg-hivatkozás. A DARAB maga is igény (úgy jön, mint egy kép);
  // a benne lévő képeket a `fajlIgenyek` a darab megérkezése után látja.
  if (szovegHivatkozasE(entitas?.szoveg)) talalt.add(entitas.szoveg.lenyomat);

  return talalt;
}

/**
 * Mely fájlokra van szükségem, és melyek vannak meg?
 *
 * @param {Object} allapot - az `allapotSzamitasa` eredménye
 * @param {Function} megvanE - async (lenyomat) → boolean · ⭐ KÍVÜLRŐL JÖN (1. szabály)
 * @param {Object} [beallitas]
 * @param {string} [beallitas.szerzo] - a saját kulcsom (a „vállaltam-e?" kérdéshez)
 * @returns {Promise<Object>} { hianyzok, megvan, osszes }
 */
export async function fajlIgenyek(allapot, megvanE, beallitas = {}) {
  console.log('fajlIgeny.fajlIgenyek - KEZDÉS');

  const en = beallitas.szerzo ?? null;

  // lenyomat → { entitasok: [azonosító], vallaltam: boolean }
  const hivatkozasok = new Map();
  const felvesz = (lenyomat, azonosito, vallaltam) => {
    const eddig = hivatkozasok.get(lenyomat);
    if (eddig) {
      if (!eddig.entitasok.includes(azonosito)) eddig.entitasok.push(azonosito);
      eddig.vallaltam = eddig.vallaltam || vallaltam;
    } else {
      hivatkozasok.set(lenyomat, { entitasok: [azonosito], vallaltam });
    }
  };
  const vallaltamE = (entitas) => (en ? (entitas?.hozzajarulok.get(en)?.pont ?? 0) > 0 : false);

  // ⭐ D72 (2026-09-26): a SZÖVEG-DARAB képei csak a darab megérkezése UTÁN ismerhetők meg
  // (ahogy a képek maguk is egy bulival később jönnek, mint az események). Ha a hívó ad
  // `szovegOlvas`-t (async lenyomat → a szöveg, ha megvan), a meglévő szöveg képei is igények.
  const szovegKepei = async (ertek) => {
    if (!szovegHivatkozasE(ertek) || !beallitas.szovegOlvas) return [];
    const szoveg = await beallitas.szovegOlvas(ertek.lenyomat);
    return Array.isArray(szoveg) ? szoveg.map((b) => lenyomatUrlbol(b?.url)).filter(Boolean) : [];
  };

  for (const entitas of allapot.entitasok.values()) {
    // ⭐ VÁLLALTAM-E? A tudatpont tárolási vállalás is (D3) — ha tettem rá pontot, az
    // entitás fájljai az én dolgom is, nem csak „arra járok".
    const vallaltam = vallaltamE(entitas);
    for (const lenyomat of entitasFajljai(entitas)) felvesz(lenyomat, entitas.azonosito, vallaltam);
    for (const lenyomat of await szovegKepei(entitas.szoveg)) felvesz(lenyomat, entitas.azonosito, vallaltam);
  }

  // ⭐ D72: A JAVASLATOK ÚJ SZÖVEGE IS IGÉNY — aki szavaz, annak el kell tudnia olvasni, mire.
  // A javaslat az érintett entitás ügye: vállalt, ha az érintettre tettem pontot.
  for (const dontes of beallitas.javaslatok?.values?.() ?? []) {
    for (const r of dontes.erintettek ?? []) {
      const ertek = r.valtozas?.szoveg;
      if (!szovegHivatkozasE(ertek)) continue;
      const vallaltam = vallaltamE(allapot.entitasok.get(r.entitas));
      felvesz(ertek.lenyomat, dontes.azonosito ?? r.entitas, vallaltam);
      for (const lenyomat of await szovegKepei(ertek)) felvesz(lenyomat, dontes.azonosito ?? r.entitas, vallaltam);
    }
  }

  const hianyzok = [];
  let megvanDb = 0;

  for (const [lenyomat, adat] of hivatkozasok) {
    if (await megvanE(lenyomat)) { megvanDb++; continue; }
    hianyzok.push({
      lenyomat,
      // ⭐ MEGNEVEZZÜK, MELYIK ENTITÁSHOZ TARTOZIK — így a felület megmondhatja, MI hiányzik,
      // nem csak azt, hogy „valami" (D19).
      entitasok: adat.entitasok,
      vallaltam: adat.vallaltam
    });
  }

  // ⭐ A VÁLLALTAK ELŐRE. A rendezés determinisztikus (holtversenynél a lenyomat szerint),
  // hogy két készülék ugyanabból az állapotból ugyanazt a sorrendet kapja.
  hianyzok.sort((a, b) => {
    if (a.vallaltam !== b.vallaltam) return a.vallaltam ? -1 : 1;
    return a.lenyomat < b.lenyomat ? -1 : 1;
  });

  console.log('fajlIgeny.fajlIgenyek - VÉGE',
    { hianyzo: hianyzok.length, megvan: megvanDb });
  return { hianyzok, megvan: megvanDb, osszes: hivatkozasok.size };
}
