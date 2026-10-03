// koino/js/csere/kerelem.js

// Felelősség: A KÉRELEM (D76, D84/1, D92/4–6) — a nézet-független ALAPKÉRDÉSEK alakja, a tartó válasza és a
// kérdező ellenőrzése. Hálózat nélkül (1. szabály): a menetet a `vonal.js` viszi (`KERELEM` → válasz), ez a modul
// tudja, MI a kérdés és MI a jó válasz.
//
// ===== AZ ALAPKÉRDÉSEK (D92/6) =====
//
//   · SZELET    — X eseményei (a csere halmaza: a saját eseményei + a hozzá bejelentettek) — bárkitől (D84/1);
//   · FEJLÉCEK  — X gyerekei össz-pont szerint, legfeljebb n, és (ha a válaszoló tartja) a legjobb ág d szintig;
//                 a gyökér (`GYOKER_KULCS`) gyerekei a legfelső szintű entitások;
//   · TÖRZS     — X szöveg-darabja és fájljai — CSAK a vállalótól (D84/1).
//
// ⭐ A pakli első betöltése (D76/2) ezekből áll össze — a gyökér fejlécei, a legjobb ág, a kiválasztott törzse —, és a
// síkidom, a térkép később ugyanezt használja. A válaszolónak nem kell az egész utat tartania.
//
// ===== A FEJLÉC (D92/4) =====
//
// A létrehozó esemény (cím, típus, szülő — aláírva, a kérdező ellenőrzi) + az össz-pont + a részfa-fa gyökere (ha a
// válaszoló tartja a szeletet — ha nem, a bemondott össz-pontot mondja tovább, és ezt kimondja: `forras`). A kérdező
// a gyökerek bemondása UTÁN kér mintákat (`mintaKeres`): a kiválasztott ágat k = 8-cal, a legfelső testvéreket k =
// 4-gyel, a többi bemondás marad (62. mérés: egy 20 kártyás lap mind k = 8-cal ~100–400 KB volna).
//
// Használják: a `vonal.js` (a menet), a `koino.js` (a kiszolgálás és a kérés), a próbák.

import { GYOKER_KULCS } from './szeletEgyeztetes.js';
import { azonositoAlaku, esemenyEllenorzese } from '../esemeny/esemeny.js';
import { javaslatEntitasai } from '../allapot/szabalyok.js';
import {
  osszPontokSzamitasa, gyerekJegyzek, reszfaLevelei, reszfaGyokere, fejlecMintai, fejlecEllenorzese, mintaHelyek,
  MINTA_KORLAT
} from '../allapot/osszPont.js';
import { osszegzesAlakja } from '../esemeny/osszegzoFa.js';
import { entitasFajljai, lenyomatUrlbol } from '../allapot/fajlIgeny.js';
import { szovegDarabbol } from '../esemeny/szovegDarab.js';

export const KERELEM_FAJTAK = ['szelet', 'fejlecek', 'torzs'];

/** Egy fejléc-listában legfeljebb ennyi kártya. */
export const FEJLEC_KORLAT = 50;
/** A legjobb ág legfeljebb ennyi szintig. */
export const MELYSEG_KORLAT = 4;
/** Egy minta-kérésben legfeljebb ennyi fejléc. */
export const MINTAZOTT_FEJLEC_KORLAT = 8;
/** Egy törzsben legfeljebb ennyi fájl-lenyomat. */
export const TORZS_KORLAT = 64;

/** A pakli alapértelmezése (62. mérés): a kiválasztott ág k = 8, a legfelső 3 testvér k = 4. */
export const MINTA_ALAP = { kivalasztott: 8, testver: 4, testverDb: 3 };

/**
 * Az esemény az `az` entitás LÉTREHOZÓJA-e, és ha igen, ki a szülője (null: a gyökér). ⭐ Ugyanabból az egy forrásból,
 * mint az állapot: a gondolatnál a `szulo`, a javaslatnál és a töredékeinél a `javaslatEntitasai` (az érintett).
 * @returns {undefined|null|string} undefined, ha nem ő a létrehozó
 */
function letrehozoSzuloje(e, az) {
  if (e?.tipus === 'GondolatLetrehozas') return e.azonosito === az ? (typeof e.adat?.szulo === 'string' ? e.adat.szulo : null) : undefined;
  if (e?.tipus === 'Javaslat') {
    const je = javaslatEntitasai(e).find((x) => x.azonosito === az);
    return je ? (je.resz?.entitas ?? null) : undefined;
  }
  return undefined;
}

// ===================================
// A KÉRDÉS ALAKJA
// ===================================

/**
 * Egy (kívülről jött) kérelem alakja — normalizálva, vagy null.
 * @returns {null|{fajta: string, kulcs: string, n: number, d: number}}
 */
export function kerelemAlakja(u) {
  if (!u || typeof u !== 'object' || !KERELEM_FAJTAK.includes(u.fajta)) return null;
  const kulcs = u.kulcs;
  const gyokerE = kulcs === GYOKER_KULCS;
  // ⚠️ A gyökér kulcsa (43 nulla) maga is azonosító alakú — ezért külön: csak fejlécre kérhető.
  if (gyokerE ? u.fajta !== 'fejlecek' : !azonositoAlaku(kulcs)) return null;
  const egesz = (x, alap, max) => (Number.isInteger(x) && x >= 0 ? Math.min(x, max) : alap);
  return { fajta: u.fajta, kulcs, n: egesz(u.n, 20, FEJLEC_KORLAT), d: egesz(u.d, 0, MELYSEG_KORLAT) };
}

// ===================================
// A TARTÓ VÁLASZA — a fejlécek
// ===================================

/**
 * ⭐ A FEJLÉCEK: X gyerekei össz-pont szerint (holtversenynél az azonosító), legfeljebb n — és a legjobb ág d
 * szintig (szintenként a legjobb kibontva, a testvérei fejlécként). A részfa-fák a mintákhoz megmaradnak (`fak`).
 *
 * @param {Object} b
 * @param {Object} b.allapot - a válaszoló állapota (a két tárból)
 * @param {string} b.kulcs - X, vagy `GYOKER_KULCS`
 * @param {number} b.n
 * @param {number} b.d
 * @param {Object} b.karbantarto - `reszfaKarbantarto()`
 * @param {Function} b.esemenyOlvas - async (azonosító) → esemény | null
 * @param {Map} [b.bemondasok] - a nem tartott entitások bemondott össz-pontja
 * @returns {Promise<{valasz: Object, fak: Map<string, Object>}>}
 */
export async function fejlecekValasza({ allapot, kulcs, n, d, karbantarto, esemenyOlvas, bemondasok = new Map() }) {
  const osszPontok = osszPontokSzamitasa(allapot.entitasok, bemondasok);
  const gyerekek = gyerekJegyzek(allapot.entitasok);
  const fak = new Map();

  const gyerekeiOf = (k) => (k === GYOKER_KULCS
    ? [...allapot.entitasok.values()].filter((e) => !e.szulo).map((e) => e.azonosito)
    : (gyerekek.get(k) ?? []));

  const szint = async (k, melyseg) => {
    const rendezett = gyerekeiOf(k)
      .map((az) => ({ az, o: osszPontok.get(az) }))
      .filter((x) => x.o)
      .sort((a, b) => b.o.osszPont - a.o.osszPont || (a.az < b.az ? -1 : 1))
      .slice(0, n);
    const lista = [];
    for (const { az, o } of rendezett) {
      // ⚠️ A töredéknek nincs saját eseménye: a létrehozója a javaslat (D85/5).
      const e = allapot.entitasok.get(az);
      const letrehozo = await esemenyOlvas(e?.toredek ? e.toredek.csoport : az);
      if (!letrehozo) continue;
      let gyoker = null;
      if (o.forras === 'szamolt') {
        const fa = await karbantarto.fa(az, reszfaLevelei(az, allapot, osszPontok, gyerekek));
        fak.set(az, fa);
        gyoker = await reszfaGyokere(fa);
      }
      // ⚠️ A FELKERÜLT gyerek (a szülőjét a D14 elfelejtette — `szerkezetIgazitasa`): a létrehozója más szülőt mond.
      // Ezt kimondjuk; a kérdező nem tudja ellenőrizni, hogy a régi szülő valóban elfelejtődött (D19).
      const felkerult = letrehozoSzuloje(letrehozo, az) !== (k === GYOKER_KULCS ? null : k);
      lista.push({ az, letrehozo, osszPont: o.osszPont, forras: o.forras, bizonytalan: o.bizonytalan, gyoker,
        ...(felkerult ? { felkerult: true } : {}) });
    }
    const valasz = { kulcs: k, lista };
    // A legjobb ág: csak ha tartjuk (különben a gyerekeit sem ismerjük biztosan).
    if (melyseg > 0 && lista.length && lista[0].forras === 'szamolt') valasz.ag = await szint(lista[0].az, melyseg - 1);
    return valasz;
  };
  return { valasz: await szint(kulcs, d), fak };
}

/**
 * A MINTÁK: a kért helyekre a levelek bizonyítéka, és a szerzői levelek aláírt pont-eseményei (amit a kérdező még
 * nem jelzett meglévőnek). Korlátos: legfeljebb `MINTAZOTT_FEJLEC_KORLAT` fejléc, fejlécenként `MINTA_KORLAT` minta.
 * @returns {Promise<{mintak: Object, esemenyek: Array}>}
 */
export async function mintakValasza({ fak, kert, esemenyOlvas, megvan = [] }) {
  const mintak = {};
  const kell = new Set();
  const meglevo = new Set(Array.isArray(megvan) ? megvan.filter((x) => typeof x === 'string') : []);
  const tetelek = kert && typeof kert === 'object' && !Array.isArray(kert) ? Object.entries(kert) : [];
  for (const [az, helyek] of tetelek.slice(0, MINTAZOTT_FEJLEC_KORLAT)) {
    const fa = fak.get(az);
    if (!fa || !Array.isArray(helyek)) continue;
    const m = await fejlecMintai(fa, helyek.filter((r) => Number.isSafeInteger(r)).slice(0, MINTA_KORLAT));
    mintak[az] = m;
    for (const x of m) {
      const e = x.bizonyitek?.vegpont?.ertek?.e;
      if (x.kulcs.startsWith('p:') && typeof e === 'string' && !meglevo.has(e)) kell.add(e);
    }
  }
  const esemenyek = [];
  for (const az of kell) {
    const e = await esemenyOlvas(az);
    if (e) esemenyek.push(e);
  }
  return { mintak, esemenyek };
}

// ===================================
// A KÉRDEZŐ OLDALA — a fejlécek ellenőrzése
// ===================================

/**
 * Mely fejléceket ellenőrizzük, és hol (a gyökerek bemondása UTÁN — a kérdező véletlene). A kiválasztott (ha van)
 * k = `kivalasztott` mintával, a lista legfelső `testverDb` tételéből a többi k = `testver`-rel. Csak aminek van
 * gyökere (a bemondott össz-pont a tartójánál ellenőrizhető).
 * @returns {Object} { [azonosító]: [helyek] }
 */
export function mintaKeres(valasz, { kivalasztott = null, minta = MINTA_ALAP } = {}) {
  const kert = {};
  const mind = [];
  const bejar = (v) => { for (const t of v?.lista ?? []) mind.push(t); if (v?.ag) bejar(v.ag); };
  bejar(valasz);
  const kivalasztottak = new Set(kivalasztott ? [kivalasztott] : []);
  if (!kivalasztott && valasz?.ag) kivalasztottak.add(valasz.lista?.[0]?.az);      // a legjobb ág a „kiválasztott”
  let testver = 0;
  for (const t of mind) {
    if (Object.keys(kert).length >= MINTAZOTT_FEJLEC_KORLAT) break;
    if (!t?.gyoker || !osszegzesAlakja(t.gyoker, 1) || kert[t.az]) continue;
    if (kivalasztottak.has(t.az)) kert[t.az] = mintaHelyek(t.gyoker.o[0], minta.kivalasztott);
    else if (testver < minta.testverDb) { kert[t.az] = mintaHelyek(t.gyoker.o[0], minta.testver); testver++; }
  }
  return kert;
}

/**
 * ⭐ A FEJLÉCEK ELLENŐRZÉSE: minden tétel létrehozó eseménye hiteles, ő maga az entitás, és a szülője a kérdezett
 * kulcs (a gyökérnél: nincs szülője); a bemondott gyökér összege az össz-pont; a mintázott fejlécek mintái
 * átmennek (`fejlecEllenorzese`). ⛔ Egy hamis tétel nem dönti el a többit: tételenként mondjuk ki.
 *
 * @returns {Promise<{tetelek: Map<string, Object>, hibas: number, ellenorzott: number}>}
 */
export async function fejlecekEllenorzese({ valasz, kert, mintak = {}, esemenyek = [] }) {
  const terkep = new Map((Array.isArray(esemenyek) ? esemenyek : []).map((e) => [e?.azonosito, e]));
  const tetelek = new Map();
  let hibas = 0, ellenorzott = 0;

  const bejar = async (v, kulcs, melyseg) => {
    if (!v || typeof v !== 'object' || !Array.isArray(v.lista) || v.kulcs !== kulcs || melyseg > MELYSEG_KORLAT) return;
    for (const t of v.lista.slice(0, FEJLEC_KORLAT)) {
      const ered = await tetelEllenorzese(t, kulcs);
      if (ered.rendben && kert?.[t.az]) {
        const m = await fejlecEllenorzese({ azonosito: t.az, gyoker: t.gyoker, helyek: kert[t.az], mintak: mintak[t.az],
          esemenyek: terkep });
        if (!m.rendben) Object.assign(ered, { rendben: false, ok: m.ok });
        else Object.assign(ered, { mintazott: true, minta: m });
      }
      if (!ered.rendben) hibas++;
      else if (ered.mintazott) ellenorzott++;
      if (azonositoAlaku(t?.az)) tetelek.set(t.az, ered);
    }
    if (v.ag && v.lista.length) await bejar(v.ag, v.lista[0].az, melyseg + 1);
  };
  await bejar(valasz, valasz?.kulcs, 0);
  return { tetelek, hibas, ellenorzott };
}

async function tetelEllenorzese(t, kulcs) {
  const hiba = (ok) => ({ rendben: false, ok });
  if (!t || typeof t !== 'object' || !azonositoAlaku(t.az)) return hiba('hibás tétel');
  if (!Number.isSafeInteger(t.osszPont) || t.osszPont < 0) return hiba('hibás össz-pont');
  const e = t.letrehozo;
  const szulo = letrehozoSzuloje(e, t.az);
  if (szulo === undefined) return hiba('a létrehozó esemény nem az entitásé');
  const al = await esemenyEllenorzese(e);
  if (!al.rendben) return hiba('a létrehozó esemény nem hiteles: ' + al.ok);
  const helyen = kulcs === GYOKER_KULCS ? szulo === null : szulo === kulcs;
  if (!helyen && t.felkerult !== true) return hiba('a tétel nem a kérdezett entitás gyereke');
  if (t.gyoker !== null && t.gyoker !== undefined) {
    if (!osszegzesAlakja(t.gyoker, 1)) return hiba('hibás gyökér');
    if (t.gyoker.o[0] !== t.osszPont) return hiba('a gyökér összege nem a bemondott össz-pont');
  }
  return { rendben: true, osszPont: t.osszPont, forras: t.forras ?? null, gyokerVan: !!t.gyoker,
    ...(helyen ? {} : { felkerult: true }) };
}

// ===================================
// A TÖRZS (D84/1, D92/4)
// ===================================

/**
 * X törzsének fájl-lenyomatai: a szöveg-darab, a szövegben hivatkozott fájlok és az ikon — és ha a darab megvan, a
 * BENNE hivatkozott képek is. Korlátos.
 * @param {Object} entitas
 * @param {Function} [darabOlvas] - async (lenyomat) → bájtok | null
 * @returns {Promise<Array<string>>}
 */
export async function torzsLenyomatai(entitas, darabOlvas = null) {
  const ki = new Set(entitasFajljai(entitas));
  const sz = entitas?.szoveg;
  if (darabOlvas && sz && typeof sz === 'object' && !Array.isArray(sz) && typeof sz.lenyomat === 'string') {
    try {
      const bajtok = await darabOlvas(sz.lenyomat);
      const szoveg = bajtok ? szovegDarabbol(bajtok) : null;
      if (Array.isArray(szoveg)) for (const blokk of szoveg) { const l = lenyomatUrlbol(blokk?.url); if (l) ki.add(l); }
    } catch { /* a hibás darab nem dönti el a törzset */ }
  }
  return [...ki].slice(0, TORZS_KORLAT);
}
