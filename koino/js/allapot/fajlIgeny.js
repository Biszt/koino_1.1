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

  for (const entitas of allapot.entitasok.values()) {
    const fajlok = entitasFajljai(entitas);
    if (!fajlok.size) continue;

    // ⭐ VÁLLALTAM-E? A tudatpont tárolási vállalás is (D3) — ha tettem rá pontot, az
    // entitás fájljai az én dolgom is, nem csak „arra járok".
    const vallaltam = en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) > 0 : false;

    for (const lenyomat of fajlok) {
      const eddig = hivatkozasok.get(lenyomat);
      if (eddig) {
        eddig.entitasok.push(entitas.azonosito);
        eddig.vallaltam = eddig.vallaltam || vallaltam;
      } else {
        hivatkozasok.set(lenyomat, { entitasok: [entitas.azonosito], vallaltam });
      }
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
