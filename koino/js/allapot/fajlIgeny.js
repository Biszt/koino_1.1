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

// ===================================
// ⭐⭐ D120: A TÖRZS-HATÁR (Csaba ötlete és döntése, 2026-10-29)
// ===================================
//
// Böngészés közben a NEM VÁLLALT entitás törzséből elemenként csak a határ alatti jön magától: a szöveg-darab (és a kártya
// jegyzéke) mindig, egy fájl (kép, csatolmány) a határig — a nagyobbat a letöltő az első szeletnél felismeri (`teljes`),
// megáll, és a méretét megjegyezzük; a kártya kód-csomagja EGY elem (a fájljai egyenként kicsik — a határ így nem fogná meg
// őket): csak a vállalónak és a kérőnek. Amit kértek (a „kattintás”), az határ nélkül jön; amire pontot tettem, az is.
// ⚠️ Helyi mennyiség: a koinóban semmiről nem dönt (D66), csak arról, mit hoz el a készülék magától — később a beállításokban.

/** A határ (bájt) — e fölött egy nem vállalt elem csak kérésre jön. */
export const TORZS_HATAR = 1024 * 1024;
/** A kártya kód-csomagjának elem-kulcsa (a kért elemek jegyzékében). */
export const KOD_ELEM = 'kod:';
const NAGY_KORLAT = 1024;          // ennyi nagy fájl méretét jegyezzük meg
const KERT_KORLAT = 256;           // ennyi kért elem él egyszerre
const ELEM_ELETTARTAM = 30 * 24 * 3600 * 1000;   // a feljegyzés ennyi után elévül

/** ⭐ D120: a helyi jegyzék alakja (`fajlTar.js` `torzsElemTarolo`) — a hibás részt eldobja, a régit elévülteti, korlátosan. */
export function torzsElemJegyzek(nyers, most = Date.now()) {
  const tiszta = (x, jo, korlat) => {
    const t = Object.entries(x && typeof x === 'object' && !Array.isArray(x) ? x : {})
      .filter(([k, v]) => jo(k, v) && most - v.ido <= ELEM_ELETTARTAM)
      .sort((a, b) => b[1].ido - a[1].ido).slice(0, korlat);
    return Object.fromEntries(t);
  };
  const lenyomatE = (k) => /^[A-Za-z0-9_-]{43}$/.test(k);
  return {
    nagy: tiszta(nyers?.nagy, (k, v) => lenyomatE(k) && Number.isSafeInteger(v?.teljes) && v.teljes > 0
      && Number.isFinite(v?.ido), NAGY_KORLAT),
    kert: tiszta(nyers?.kert, (k, v) => (lenyomatE(k) || (k.startsWith(KOD_ELEM) && lenyomatE(k.slice(KOD_ELEM.length))))
      && Number.isFinite(v?.ido), KERT_KORLAT)
  };
}

/** ⭐ D120: a határ fölöttinek talált fájlok feljegyzése (a letöltő első szeletéből). */
export function nagyokFeljegyzese(nyers, nagyok, most = Date.now()) {
  const j = torzsElemJegyzek(nyers, most);
  for (const [l, teljes] of nagyok) j.nagy[l] = { teljes, ido: most };
  return torzsElemJegyzek(j, most);
}

/** ⭐ D120: egy elem kérése (a „kattintás”) — a lenyomata, vagy a kártya kód-csomagja (`KOD_ELEM` + a kártya). */
export function elemKerese(nyers, kulcs, most = Date.now()) {
  const j = torzsElemJegyzek(nyers, most);
  j.kert[kulcs] = { ido: most };
  return torzsElemJegyzek(j, most);
}

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
  // ⭐⭐ D119 (①b): és egy negyedik — a koino-verzió kártya KÓDJA. A jegyzék maga is igény (úgy jön, mint a szöveg-darab); a
  // benne felsorolt fájlokat a `fajlIgenyek` a jegyzék megérkezése után látja (`kodOlvas`).
  if (szovegHivatkozasE(entitas?.koinoVerzio?.kod)) talalt.add(entitas.koinoVerzio.kod.lenyomat);

  return talalt;
}

/**
 * ⭐⭐ D119 (①b): a koino-verzió kártya kódjának fájljai — a jegyzékből (a hívó `kodOlvas`-a: async hivatkozás → a jegyzék,
 * ha megvan; különben null). A jegyzék nélkül üres (a jegyzék maga az `entitasFajljai`-ban igény).
 * @param {Object} entitas
 * @param {Function|null} kodOlvas
 * @returns {Promise<Array<string>>}
 */
export async function kodFajljai(entitas, kodOlvas) {
  const h = entitas?.koinoVerzio?.kod;
  if (!szovegHivatkozasE(h) || typeof kodOlvas !== 'function') return [];
  let j = null;
  try { j = await kodOlvas(h); } catch { return []; }
  return Array.isArray(j?.fajlok) ? j.fajlok.map((f) => f?.[1]).filter((l) => typeof l === 'string') : [];
}

/**
 * ⭐ D120: a kártya kód-csomagjának mérete — a hivatkozás `torzs`-a, ha nincs (a D120 előtti kártya), a jegyzékből (ha megvan);
 * különben null (nem tudjuk).
 */
export async function kodCsomagMerete(entitas, kodOlvas) {
  const h = entitas?.koinoVerzio?.kod;
  if (!szovegHivatkozasE(h)) return null;
  if (Number.isSafeInteger(h.torzs)) return h.torzs;
  if (typeof kodOlvas !== 'function') return null;
  let j = null;
  try { j = await kodOlvas(h); } catch { return null; }
  if (!Array.isArray(j?.fajlok)) return null;
  return h.bajt + j.fajlok.reduce((s, f) => s + (Number.isSafeInteger(f?.[2]) ? f[2] : 0), 0);
}

/**
 * Mely fájlokra van szükségem, és melyek vannak meg?
 *
 * @param {Object} allapot - az `allapotSzamitasa` eredménye
 * @param {Function} megvanE - async (lenyomat) → boolean · ⭐ KÍVÜLRŐL JÖN (1. szabály)
 * @param {Object} [beallitas]
 * @param {string} [beallitas.szerzo] - a saját kulcsom (a „vállaltam-e?" kérdéshez)
 * @returns {Promise<Object>} { hianyzok, megvan, osszes, vallaltLenyomatok, kerhetok } — ⭐ D84/1: a vállalt entitásaim fájljai (és
 *   szöveg-darabjai): a TÖRZSET alapból csak ezekre szolgálom ki
 */
export async function fajlIgenyek(allapot, megvanE, beallitas = {}) {
  console.log('fajlIgeny.fajlIgenyek - KEZDÉS');

  const en = beallitas.szerzo ?? null;
  // ⭐ D120: a törzs-határ — csak ha a hívó megadja (a randevú, a `fajlok` parancs); nélküle a régi viselkedés (minden igény).
  const hatar = Number.isSafeInteger(beallitas.hatar) && beallitas.hatar > 0 ? beallitas.hatar : null;
  const nagyok = beallitas.nagyok instanceof Map ? beallitas.nagyok : new Map();   // lenyomat → a teljes mérete
  const kertek = beallitas.kertek instanceof Set ? beallitas.kertek : new Set();   // lenyomat | KOD_ELEM + kártya
  const kerhetok = [];   // ⭐ D120: ami a határ miatt nem jön magától — kérésre (a lapnak és a parancsnak)

  // lenyomat → { entitasok: [azonosító], vallaltam: boolean, kert: boolean, mindig: boolean }
  const hivatkozasok = new Map();
  const felvesz = (lenyomat, azonosito, vallaltam, { kert = false, mindig = false } = {}) => {
    const eddig = hivatkozasok.get(lenyomat);
    if (eddig) {
      if (!eddig.entitasok.includes(azonosito)) eddig.entitasok.push(azonosito);
      eddig.vallaltam = eddig.vallaltam || vallaltam;
      eddig.kert = eddig.kert || kert;
      eddig.mindig = eddig.mindig || mindig;
    } else {
      hivatkozasok.set(lenyomat, { entitasok: [azonosito], vallaltam, kert, mindig });
    }
  };
  // ⭐ D120: a szöveg-darab és a kártya jegyzéke mindig jön (a törzs „szövege” — kicsi, és nélküle a többit sem látnánk)
  const mindigE = (entitas, lenyomat) => (szovegHivatkozasE(entitas?.szoveg) && entitas.szoveg.lenyomat === lenyomat)
    || (szovegHivatkozasE(entitas?.koinoVerzio?.kod) && entitas.koinoVerzio.kod.lenyomat === lenyomat);
  // ⭐ D112 ① (a fájl-tár kerete): a hívó tágabb „vállalt”-at is adhat (a saját létrehozás, a vállalás kifutása).
  const vallaltamE = typeof beallitas.vallaltE === 'function' ? beallitas.vallaltE
    : (entitas) => (en ? (entitas?.hozzajarulok.get(en)?.pont ?? 0) > 0 : false);

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
    for (const lenyomat of entitasFajljai(entitas)) {
      felvesz(lenyomat, entitas.azonosito, vallaltam, { kert: kertek.has(lenyomat), mindig: mindigE(entitas, lenyomat) });
    }
    for (const lenyomat of await szovegKepei(entitas.szoveg)) {
      felvesz(lenyomat, entitas.azonosito, vallaltam, { kert: kertek.has(lenyomat) });
    }
    // ⭐ D119 (①b): a kártya vállalása a kódjára is vállalás (a fájl-tár kerete védi, a fájl-randevú kiszolgálja).
    // ⭐ D120: a kód-csomag EGY elem — a fájljai a határ mellett csak a vállalónak és a kérőnek (a jegyzék mindig jön).
    const kodKert = kertek.has(KOD_ELEM + entitas.azonosito);
    const kodok = await kodFajljai(entitas, beallitas.kodOlvas);
    if (hatar === null || vallaltam || kodKert) {
      for (const lenyomat of kodok) felvesz(lenyomat, entitas.azonosito, vallaltam, { kert: kodKert });
    } else if (kodok.length) {
      let hianyzik = 0;
      for (const l of kodok) if (!(await megvanE(l))) hianyzik++;
      if (hianyzik) {
        kerhetok.push({ elem: KOD_ELEM + entitas.azonosito, entitas: entitas.azonosito, kod: true, fajlok: kodok.length, hianyzik,
          meret: await kodCsomagMerete(entitas, beallitas.kodOlvas) });
      }
    }
  }

  // ⭐ D72: A JAVASLATOK ÚJ SZÖVEGE IS IGÉNY — aki szavaz, annak el kell tudnia olvasni, mire.
  // A javaslat az érintett entitás ügye: vállalt, ha az érintettre tettem pontot.
  for (const dontes of beallitas.javaslatok?.values?.() ?? []) {
    for (const r of dontes.erintettek ?? []) {
      const ertek = r.valtozas?.szoveg;
      if (!szovegHivatkozasE(ertek)) continue;
      const vallaltam = vallaltamE(allapot.entitasok.get(r.entitas));
      felvesz(ertek.lenyomat, dontes.azonosito ?? r.entitas, vallaltam, { mindig: true });   // ⭐ D120: a szöveg mindig jön
      for (const lenyomat of await szovegKepei(ertek)) felvesz(lenyomat, dontes.azonosito ?? r.entitas, vallaltam);
    }
  }

  const hianyzok = [];
  let megvanDb = 0;
  const vallaltLenyomatok = new Set([...hivatkozasok].filter(([, a]) => a.vallaltam).map(([l]) => l));

  for (const [lenyomat, adat] of hivatkozasok) {
    if (await megvanE(lenyomat)) { megvanDb++; continue; }
    // ⭐ D120: a vállalt, a kért és a „mindig” elem határ nélkül (a régi fájl-korlátig); a többi a határig — ami már ismerten
    // nagyobb, az nem igény, hanem kérhető (a méretével).
    const teljesen = hatar === null || adat.vallaltam || adat.kert || adat.mindig;
    if (!teljesen && nagyok.has(lenyomat)) {
      kerhetok.push({ elem: lenyomat, entitas: adat.entitasok[0], entitasok: adat.entitasok, meret: nagyok.get(lenyomat) });
      continue;
    }
    hianyzok.push({
      lenyomat,
      // ⭐ MEGNEVEZZÜK, MELYIK ENTITÁSHOZ TARTOZIK — így a felület megmondhatja, MI hiányzik,
      // nem csak azt, hogy „valami" (D19).
      entitasok: adat.entitasok,
      vallaltam: adat.vallaltam,
      ...(teljesen ? {} : { korlat: hatar })
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
  return { hianyzok, megvan: megvanDb, osszes: hivatkozasok.size, vallaltLenyomatok, kerhetok };
}
