// koino/js/csere/kerelem.js

// Felelősség: A KÉRELEM (D76, D84/1, D92/4–6) — a nézet-független ALAPKÉRDÉSEK alakja, a tartó válasza és a
// kérdező ellenőrzése. Hálózat nélkül (1. szabály): a menetet a `vonal.js` viszi (`KERELEM` → válasz), ez a modul
// tudja, MI a kérdés és MI a jó válasz.
//
// ===== AZ ALAPKÉRDÉSEK (D92/6) =====
//
//   · SZELET    — X eseményei (a csere halmaza: a saját eseményei + a hozzá bejelentettek) — bárkitől (D84/1);
//   · FEJLÉCEK  — X alatt a legjobb n csomópont össz-pont szerint — ⭐ D102 (J1): MÉLYEN (`m`) a válaszoló MAGA jár be
//                 legjobb-először, amit tud (egy csomópont gyerekeit akkor ismeri, ha a szeletét tartja), egyébként csak
//                 X gyerekei; a FOLYTATÁS (`utan`) a sorrend következő n eleme. A gyökér (`GYOKER_KULCS`) gyerekei a
//                 legfelső szintű entitások;
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
// ⭐⭐ D102: A SORREND. Mivel az össz-pont lefelé nem nő (a gyerek sosem nagyobb a szülőjénél), a legjobb-először bejárás
// sorrendje PONTOSAN az „össz-pont szerint csökkenő” sorrend (holtversenyben az azonosító szerint növekvő). A válasz ezért
// egyetlen lista ebben a sorrendben; minden tétel megmondja a SZÜLŐJÉT (a válaszoló állapota szerint — a kérő ebből
// illeszti a fába) és — ha a válaszoló tartja — a GYEREKSZÁMÁT (J2: a kérő ebből tudja, mikor ismeri egy csomópont összes
// gyerekét). Ha a lista nem fogyott ki (`teljes: false`), a válaszoló tartott csomópontjainak a listából kimaradt gyerekei
// mind az utolsó tétel UTÁN jönnének — a kérő ebből tud határt húzni (`pakli.js`, a bejáró).
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
// ⭐ D107 L4 (④c): a felajánlás kulcsa egy kereső-régió; a korlátok a felajánlás moduljáé.
import { keresoRegioBol } from './keresoReteg.js';
import { FELAJANLAS_KORLAT, FELAJANLAS_KISERO_KORLAT } from './felajanlas.js';

/**
 * ⭐ D107 L4 (④c): a felajánlás válaszának alakja — hányat vett fel a tartó (és ebből hány függő), hány volt már meg, hányat
 * utasított el, és mely fiók OSZTÓDOTT (K7: `{ k, s }` — a felajánló a mélyebb darab régiójába viszi).
 * @returns {{felvett: number, fuggo: number, megvolt: number, elutasitott: number, osztodott: Array<{k: string, s: number}>}}
 */
export function felajanlasValaszAlakja(u) {
  const db = (x) => (Number.isInteger(x) && x >= 0 ? Math.min(x, 100000) : 0);
  const osztodott = (Array.isArray(u?.osztodott) ? u.osztodott : []).slice(0, FELAJANLAS_KORLAT)
    .filter((o) => o && typeof o.k === 'string' && o.k.length <= 80 && Number.isInteger(o.s) && o.s > 0 && o.s <= 144)
    .map((o) => ({ k: o.k, s: o.s }));
  return { felvett: db(u?.felvett), fuggo: db(u?.fuggo), megvolt: db(u?.megvolt), elutasitott: db(u?.elutasitott), osztodott };
}

export const KERELEM_FAJTAK = ['szelet', 'fejlecek', 'torzs', 'felajanlas', 'kereses'];
/** A továbbadható fajták (D92/1 (c)) — a felajánlás nem: a tulajdonos maga keresi a régió tartóit. */
export const TOVABBADHATO_FAJTAK = ['szelet', 'fejlecek', 'torzs'];

/** Egy fejléc-listában legfeljebb ennyi kártya. */
export const FEJLEC_KORLAT = 50;
/** ⭐ D102 (J3): egy kapcsolaton legfeljebb ennyi kérelem (a sorozat — a lap egy lekérdezése is legfeljebb ennyit kér). */
export const SOROZAT_KORLAT = 16;
/** ⭐ D102: a válaszoló legfeljebb ennyi lépést tesz egy mély bejárásban (a folytatás elejéig is) — a terhe korlátos. */
export const BEJARAS_LEPES_KORLAT = 5000;
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
  // ⭐⭐ D107 L4 (④c): A FELAJÁNLÁS — a kulcs egy kereső-régió (vagy a gyökér: „ami a régióidba esik”), a teher a
  // bejegyzések és a szerzőik tagsági kísérői (korlátosan; az alakjukat és a tartalmukat a tartó maga ellenőrzi).
  // ⭐⭐ A kereső-réteg ⑤: A KÉRDÉS — egy hely (a fiók kulcsa, az osztódás mélysége, a darab) és a kérdés szövege; a kulcs a
  // régió (vagy a gyökér). A tartó a hely találatait adja (`kereses.js` `helyTalalatai`), a kérdező maga ellenőriz.
  if (u.fajta === 'kereses') {
    if (!gyokerE && !keresoRegioBol(kulcs)) return null;
    if (typeof u.k !== 'string' || !/^[ep]:[\p{L}\p{M}\p{N}]{1,64}$/u.test(u.k)) return null;
    if (typeof u.kerdes !== 'string' || !u.kerdes.trim() || u.kerdes.length > 200) return null;
    const s = Number.isInteger(u.s) && u.s >= 0 && u.s <= 144 ? u.s : 0;
    const darab = typeof u.darab === 'string' && /^[0-9a-f]{1,40}$/.test(u.darab) ? u.darab : '0';
    const n = Number.isInteger(u.n) && u.n > 0 ? Math.min(u.n, 50) : 50;
    return { fajta: 'kereses', kulcs, k: u.k, s, darab, kerdes: u.kerdes, n };
  }
  if (u.fajta === 'felajanlas') {
    if (!gyokerE && !keresoRegioBol(kulcs)) return null;
    return { fajta: 'felajanlas', kulcs,
      bejegyzesek: Array.isArray(u.bejegyzesek) ? u.bejegyzesek.slice(0, FELAJANLAS_KORLAT) : [],
      kiserok: Array.isArray(u.kiserok) ? u.kiserok.slice(0, FELAJANLAS_KISERO_KORLAT) : [] };
  }
  // ⚠️ A gyökér kulcsa (43 nulla) maga is azonosító alakú — ezért külön: csak fejlécre kérhető.
  if (gyokerE ? u.fajta !== 'fejlecek' : !azonositoAlaku(kulcs)) return null;
  const egesz = (x, alap, max) => (Number.isInteger(x) && x >= 0 ? Math.min(x, max) : alap);
  // ⭐ D92/1 (c): a TOVÁBBADHATÓ kérelem azonosítója (nincs kétszeres továbbadás) és ugrás-számlálója (K3). ⚠️ A kérdező
  // címét SEMMI nem hordozza (D87/2).
  const tovabb = typeof u.az === 'string' && /^[A-Za-z0-9_-]{8,40}$/.test(u.az) && Number.isInteger(u.htl) && u.htl > 0
    ? { az: u.az, htl: Math.min(u.htl, UGRAS_MAX) } : {};
  // ⭐ D102: MÉLYEN (a válaszoló maga jár be) — és a FOLYTATÁS: a sorrend `utan` utáni elemei. ⛔ A rossz alakú folytatás
  // nem „az eleje”: a kérdés hibás (különben a kérő ugyanazt az n-et kapná vissza újra és újra).
  let utan;
  if (u.utan !== undefined && u.utan !== null) {
    if (typeof u.utan !== 'object' || !Number.isSafeInteger(u.utan.p) || u.utan.p < 0 || !azonositoAlaku(u.utan.az)) return null;
    utan = { p: u.utan.p, az: u.utan.az };
  }
  return { fajta: u.fajta, kulcs, n: egesz(u.n, 20, FEJLEC_KORLAT), m: u.m === true || u.m === 1,
    ...(utan ? { utan } : {}), ...tovabb };
}

/**
 * ⭐ D102: a sorrend — „a előbb jön-e, mint b?” (össz-pont szerint csökkenő, holtversenyben az azonosító szerint növekvő).
 * EGY helyen: a válaszoló bejárása, a kérdező ellenőrzése és a folytatás ugyanezt használja.
 */
export function elobbJon(a, b) {
  return a.p > b.p || (a.p === b.p && a.az < b.az);
}

/** Az ugrás-számláló kiinduló (és legnagyobb) értéke — D76/4, D92/3. */
export const UGRAS_MAX = 3;

/**
 * ⭐ D92/3 — A FREENET MINTÁJA: a kérő `UGRAS_MAX`-ot küld; aki ennyit kap, FELE ESÉLLYEL csökkenti (így az első
 * továbbító nem tudja, hogy a szomszédja maga a kérdező-e), egyébként eggyel csökken. 0-nál nem adjuk tovább.
 * @param {number} htl - amit kaptunk
 * @param {Function} [veletlen]
 * @returns {number} amit továbbküldünk
 */
export function tovabbiUgras(htl, veletlen = Math.random) {
  if (!Number.isInteger(htl) || htl <= 0) return 0;
  if (htl >= UGRAS_MAX) return veletlen() < 0.5 ? UGRAS_MAX : UGRAS_MAX - 1;
  return htl - 1;
}

/**
 * Egy (kívülről jött) VÁLASZ alakja — a továbbadott kérelem visszaútja (D87: lépésenként). Korlátos.
 * @returns {null|{az: string, fajta: string, kulcs: string, esemenyek: Array, valasz: Object|null, fajlok: Array}}
 */
export function valaszAlakja(u) {
  if (!u || typeof u.az !== 'string' || !/^[A-Za-z0-9_-]{8,40}$/.test(u.az) || !TOVABBADHATO_FAJTAK.includes(u.fajta)) return null;
  if (u.kulcs !== GYOKER_KULCS && !azonositoAlaku(u.kulcs)) return null;
  const esemenyek = (Array.isArray(u.esemenyek) ? u.esemenyek : []).filter((e) => e && typeof e === 'object').slice(0, VALASZ_ESEMENY_KORLAT);
  const fajlok = (Array.isArray(u.fajlok) ? u.fajlok : [])
    .filter((f) => f && typeof f.lenyomat === 'string' && /^[A-Za-z0-9_-]{43}$/.test(f.lenyomat) && typeof f.adat === 'string')
    .slice(0, TORZS_KORLAT);
  const valasz = u.valasz && typeof u.valasz === 'object' && !Array.isArray(u.valasz) ? u.valasz : null;
  return { az: u.az, fajta: u.fajta, kulcs: u.kulcs, esemenyek, valasz, fajlok };
}

/** Egy továbbadott válaszban legfeljebb ennyi esemény. */
export const VALASZ_ESEMENY_KORLAT = 4000;

// ===================================
// A TARTÓ VÁLASZA — a fejlécek
// ===================================

/**
 * Egy kis bináris kupac a sorrendhez (`elobbJon`) — a válaszoló bejárásához (egy válasz legfeljebb n tétel, de a
 * határ — a gyerekek — nagy is lehet).
 */
function sorrendKupac() {
  const a = [];
  const elobb = (i, j) => elobbJon(a[i], a[j]);
  return {
    meret: () => a.length,
    betesz(x) {
      a.push(x);
      let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (!elobb(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; }
    },
    kivesz() {
      const t = a[0], u = a.pop();
      if (a.length) {
        a[0] = u;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < a.length && elobb(l, m)) m = l;
          if (r < a.length && elobb(r, m)) m = r;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]]; i = m;
        }
      }
      return t;
    }
  };
}

/**
 * ⭐⭐ D109 (KK1): A FEJLÉC-VÁLASZ KÉPE — amit egy fejléc-válasz a teljes entitás-halmazból számol (az össz-pontok, a
 * gyerek-jegyzék, és csomópontonként a gyerekek a sorrendben), egyszer, és sok kérésen át újrahasznosíthatóan. A kiszolgáló
 * a tár állása szerint gyorsítótárban tartja (`koino.js` `kiszolgaloKepe`) — így egy kérés ára a lista hosszával arányos,
 * nem a tárral (a 76. mérés: e nélkül egy „mindent” tartónál 125 000 eseménynél ~150 ms csak ez, kérésenként). A
 * csomópontonkénti rendezett lista lustán épül (amelyikhez egy kérés eljut), és a képpel együtt megmarad.
 * @param {Object} allapot - a válaszoló állapota
 * @param {Map} osszPontok - `osszPontokSzamitasa` eredménye (a bemondásokkal és a tartott-kérdéssel)
 * @returns {{osszPontok: Map, gyerekek: Map, gyerekeiOf: Function, rendezett: Function}}
 */
export function fejlecKepe(allapot, osszPontok) {
  const gyerekek = gyerekJegyzek(allapot.entitasok);
  let gyokerLista = null;
  const gyerekeiOf = (k) => (k === GYOKER_KULCS
    ? (gyokerLista ??= [...allapot.entitasok.values()].filter((e) => !e.szulo).map((e) => e.azonosito))
    : (gyerekek.get(k) ?? []));
  const memo = new Map();
  return {
    osszPontok,
    gyerekek,
    gyerekeiOf,
    /** `k` gyerekei a sorrendben (`elobbJon`), össz-ponttal — csak amelyiknek van. */
    rendezett(k) {
      let l = memo.get(k);
      if (!l) {
        l = [];
        for (const az of gyerekeiOf(k)) {
          const o = osszPontok.get(az);
          if (o) l.push({ p: o.osszPont, az, o });
        }
        l.sort((x, y) => (elobbJon(x, y) ? -1 : elobbJon(y, x) ? 1 : 0));
        memo.set(k, l);
      }
      return l;
    }
  };
}

/**
 * ⭐⭐ A FEJLÉCEK (D92/4, D102): X alatt a legjobb n csomópont a sorrendben (össz-pont szerint csökkenő) — MÉLYEN (`m`) a
 * válaszoló maga jár be legjobb-először: egy csomópont gyerekeit akkor teszi a sorba, ha a szeletét TARTJA (a születések
 * oda vannak bejelentve — különben nem ismeri mind); egyébként csak X gyerekei. A FOLYTATÁS (`utan`): a sorrend `utan`
 * utáni elemei. Minden tétel: a szülője (`sz` — a válaszoló állapota szerint), a létrehozó esemény, az össz-pont, a
 * részfa-fa gyökere (ha a válaszoló számolja), és ha tartja: a GYEREKSZÁMA (`gy`, J2). A részfa-fák a mintákhoz
 * megmaradnak (`fak`).
 *
 * ⛔ 9. szabály: a lista legfeljebb n, a bejárás legfeljebb `BEJARAS_LEPES_KORLAT` lépés (ha eléri, a lista nem teljes —
 * ahogy egy levágott lista).
 *
 * @param {Object} b
 * @param {Object} b.allapot - a válaszoló állapota (a két tárból)
 * @param {string} b.kulcs - X, vagy `GYOKER_KULCS`
 * @param {number} b.n
 * @param {boolean} [b.m] - mélyen (a válaszoló maga jár be)
 * @param {{p: number, az: string}} [b.utan] - a folytatás
 * @param {Function} [b.tartott] - az → tartom-e a szeletét (a `GYOKER_KULCS`-ra: az egész gyökeret tartom-e — „mindent”)
 * @param {Object} b.karbantarto - `reszfaKarbantarto()`
 * @param {Function} b.esemenyOlvas - async (azonosító) → esemény | null
 * @param {Map} [b.bemondasok] - a nem tartott entitások bemondott össz-pontja
 * @param {Object} [b.kep] - ⭐ D109 (KK1): a `fejlecKepe` (a kiszolgáló gyorsítótárából) — ha nincs, itt készül (ugyanaz az út)
 * @returns {Promise<{valasz: Object, fak: Map<string, Object>}>}
 */
export async function fejlecekValasza({ allapot, kulcs, n, m = false, utan = null, tartott = () => true, karbantarto,
  esemenyOlvas, bemondasok = new Map(), kep = null }) {
  // ⛔ D101 ④: a nem tartott gyerek össz-pontja a bemondás (akkor is, ha a saját pontjait ismerem).
  const k0 = kep ?? fejlecKepe(allapot, osszPontokSzamitasa(allapot.entitasok, bemondasok, (az) => tartott(az)));
  const { osszPontok, gyerekek, gyerekeiOf } = k0;
  const fak = new Map();

  // ⭐ D109 (KK1): LUSTA ÖSSZEFÉSÜLÉS — csomópontonként csak a következő legjobb gyerek ül a kupacban (a rendezett listájából;
  // amikor kikerül, a testvére lép a helyére). A sorrend bájtra ugyanaz, mint amikor minden gyerek bekerült, de egy kérés ára
  // a lista hosszával arányos, nem a csomópont gyerekszámával (a lapos gyökér egy nagy koinóban akár mindent).
  const kupac = sorrendKupac();
  const sorba = (k) => {
    const rendezett = k0.rendezett(k);
    if (rendezett.length) kupac.betesz({ ...rendezett[0], sz: k === GYOKER_KULCS ? null : k, rendezett, i: 0 });
  };
  sorba(kulcs);

  const lista = [];
  let lepes = 0;
  while (lista.length < n && kupac.meret() && lepes++ < BEJARAS_LEPES_KORLAT) {
    const x = kupac.kivesz();
    if (x.i + 1 < x.rendezett.length) {
      kupac.betesz({ ...x.rendezett[x.i + 1], sz: x.sz, rendezett: x.rendezett, i: x.i + 1 });
    }
    // ⭐ Mélyen: a tartott csomópont gyerekei is a sorba (a kimaradtak — a folytatás eleje előtt — is, hogy a mélyebbek
    // a helyükre kerüljenek a sorrendben).
    const tartja = tartott(x.az);
    if (m && tartja) sorba(x.az);
    if (utan && !elobbJon(utan, x)) continue;                   // a folytatás eleje előtt (vagy maga a határ)
    // ⚠️ A töredéknek nincs saját eseménye: a létrehozója a javaslat (D85/5).
    const e = allapot.entitasok.get(x.az);
    const letrehozo = await esemenyOlvas(e?.toredek ? e.toredek.csoport : x.az);
    if (!letrehozo) continue;
    let gyoker = null;
    if (x.o.forras === 'szamolt') {
      const fa = await karbantarto.fa(x.az, reszfaLevelei(x.az, allapot, osszPontok, gyerekek));
      fak.set(x.az, fa);
      gyoker = await reszfaGyokere(fa);
    }
    // ⚠️ A FELKERÜLT gyerek (a szülőjét a D14 elfelejtette — `szerkezetIgazitasa`): a létrehozója más szülőt mond.
    // Ezt kimondjuk; a kérdező nem tudja ellenőrizni, hogy a régi szülő valóban elfelejtődött (D19).
    const felkerult = letrehozoSzuloje(letrehozo, x.az) !== x.sz;
    lista.push({ az: x.az, sz: x.sz, letrehozo, osszPont: x.o.osszPont, forras: x.o.forras, bizonytalan: x.o.bizonytalan,
      gyoker, ...(tartja ? { gy: gyerekeiOf(x.az).length } : {}), ...(felkerult ? { felkerult: true } : {}) });
  }
  const tartjaX = tartott(kulcs);
  const valasz = { kulcs, m: !!m, lista, teljes: kupac.meret() === 0,
    ...(tartjaX ? { gy: gyerekeiOf(kulcs).length } : {}), ...(utan ? { utan } : {}) };
  return { valasz, fak };
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
 * Mely fejléceket ellenőrizzük, és hol (a gyökerek bemondása UTÁN — a kérdező véletlene). A kiválasztott (ha van; mély
 * válasznál alapból a lista első tétele — a legjobb) k = `kivalasztott` mintával, a lista legfelső `testverDb` tételéből a
 * többi k = `testver`-rel. Csak aminek van gyökere (a bemondott össz-pont a tartójánál ellenőrizhető).
 * @returns {Object} { [azonosító]: [helyek] }
 */
export function mintaKeres(valasz, { kivalasztott = null, minta = MINTA_ALAP } = {}) {
  const kert = {};
  const lista = Array.isArray(valasz?.lista) ? valasz.lista : [];
  const kivalasztottak = new Set(kivalasztott ? [kivalasztott] : (valasz?.m && lista[0] ? [lista[0].az] : []));
  let testver = 0;
  for (const t of lista) {
    if (Object.keys(kert).length >= MINTAZOTT_FEJLEC_KORLAT) break;
    if (!t?.gyoker || !osszegzesAlakja(t.gyoker, 1) || kert[t.az]) continue;
    if (kivalasztottak.has(t.az)) kert[t.az] = mintaHelyek(t.gyoker.o[0], minta.kivalasztott);
    else if (testver < minta.testverDb) { kert[t.az] = mintaHelyek(t.gyoker.o[0], minta.testver); testver++; }
  }
  return kert;
}

/**
 * ⭐ A FEJLÉCEK ELLENŐRZÉSE: minden tétel létrehozó eseménye hiteles, ő maga az entitás, a szülője az, amit a tétel mond
 * (`sz`), és ez a kérdezett kulcs (a gyökérnél: nincs szülője) — mély válasznál egy KORÁBBI, rendben lévő tétel is lehet;
 * a sorrend csökkenő (és a folytatásnál az `utan` után kezdődik); a gyerekszám egész; a bemondott gyökér összege az
 * össz-pont; a mintázott fejlécek mintái átmennek (`fejlecEllenorzese`). ⛔ Egy hamis tétel nem dönti el a többit:
 * tételenként mondjuk ki.
 *
 * @param {Function} [b.ismert] - az → ismeri-e már a kérő (a folytatás szülője egy korábbi oldalon állhatott)
 * @returns {Promise<{tetelek: Map<string, Object>, hibas: number, ellenorzott: number}>}
 */
export async function fejlecekEllenorzese({ valasz, kert, mintak = {}, esemenyek = [], ismert = () => false }) {
  const terkep = new Map((Array.isArray(esemenyek) ? esemenyek : []).map((e) => [e?.azonosito, e]));
  const tetelek = new Map();
  let hibas = 0, ellenorzott = 0;
  if (!valasz || typeof valasz !== 'object' || !Array.isArray(valasz.lista)) return { tetelek, hibas, ellenorzott };
  const kulcs = valasz.kulcs;
  const kulcsSzulo = kulcs === GYOKER_KULCS ? null : kulcs;
  const rendbenLevok = new Set();
  let elozo = valasz.utan && Number.isSafeInteger(valasz.utan.p) && azonositoAlaku(valasz.utan.az) ? valasz.utan : null;
  for (const t of valasz.lista.slice(0, FEJLEC_KORLAT)) {
    // ⭐ D102: mélyen a szülő egy korábbi (rendben lévő) tétel is lehet — a folytatásnál egy KORÁBBI oldalé, amit a kérő
    // már ismer (`ismert`): akkor a saját tudásából illeszti a fába.
    const helyesSzulo = t?.sz === kulcsSzulo
      || (valasz.m === true && typeof t?.sz === 'string' && (rendbenLevok.has(t.sz) || ismert(t.sz)));
    let ered = await tetelEllenorzese(t, helyesSzulo);
    // ⛔ D102: a sorrend csökkenő — a kérő a levágás határát erre építi (egy összekevert lista hamis teljességet mutatna).
    if (ered.rendben && elozo && !elobbJon(elozo, { p: t.osszPont, az: t.az })) ered = { rendben: false, ok: 'a sorrend nem csökkenő' };
    if (ered.rendben && t.gy !== undefined && !(Number.isSafeInteger(t.gy) && t.gy >= 0)) ered = { rendben: false, ok: 'hibás gyerekszám' };
    if (ered.rendben && kert?.[t.az]) {
      const m = await fejlecEllenorzese({ azonosito: t.az, gyoker: t.gyoker, helyek: kert[t.az], mintak: mintak[t.az],
        esemenyek: terkep });
      if (!m.rendben) Object.assign(ered, { rendben: false, ok: m.ok });
      else Object.assign(ered, { mintazott: true, minta: m });
    }
    if (!ered.rendben) hibas++;
    else {
      rendbenLevok.add(t.az);
      elozo = { p: t.osszPont, az: t.az };
      if (ered.mintazott) ellenorzott++;
    }
    if (azonositoAlaku(t?.az)) tetelek.set(t.az, ered);
  }
  return { tetelek, hibas, ellenorzott };
}

async function tetelEllenorzese(t, helyesSzulo) {
  const hiba = (ok) => ({ rendben: false, ok });
  if (!t || typeof t !== 'object' || !azonositoAlaku(t.az)) return hiba('hibás tétel');
  if (!Number.isSafeInteger(t.osszPont) || t.osszPont < 0) return hiba('hibás össz-pont');
  if (!helyesSzulo) return hiba('a tétel nem a kérdezett entitás gyereke');
  const e = t.letrehozo;
  const szulo = letrehozoSzuloje(e, t.az);
  if (szulo === undefined) return hiba('a létrehozó esemény nem az entitásé');
  const al = await esemenyEllenorzese(e);
  if (!al.rendben) return hiba('a létrehozó esemény nem hiteles: ' + al.ok);
  const helyen = szulo === t.sz;
  if (!helyen && t.felkerult !== true) return hiba('a tétel nem a kérdezett entitás gyereke');
  if (t.gyoker !== null && t.gyoker !== undefined) {
    if (!osszegzesAlakja(t.gyoker, 1)) return hiba('hibás gyökér');
    if (t.gyoker.o[0] !== t.osszPont) return hiba('a gyökér összege nem a bemondott össz-pont');
  }
  return { rendben: true, osszPont: t.osszPont, forras: t.forras ?? null, gyokerVan: !!t.gyoker, sz: t.sz ?? null,
    ...(Number.isSafeInteger(t.gy) ? { gy: t.gy } : {}), ...(helyen ? {} : { felkerult: true }) };
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
