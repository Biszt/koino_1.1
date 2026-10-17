// koino/js/tar/keresoTar.js

// Felelősség: ⭐⭐ A KERESŐ-TÁR (D107 L1 (A) — a kereső-réteg ③): a régióm BEJEGYZÉSEI — puha állapot.
//
// ⭐ Miért külön tár (L1): a bejegyzés egy MÁSIK gondolatról szól (a szó régiójában, nem a vállalásomban), és a csomagja
// pont-eseményeket is hoz (K3 — két tag-tulajdonos). Ha ezek a tartós tárba kerülnének, a saját állapotom egy NEM tartott
// gondolatra részleges össz-pontot számolna. Itt a koinó állapotába NEM számítanak; a tár korlátos és eldobható (mint az
// átmeneti — B/2), és ⭐ UGYANAZON A KAPUN át íródik: a csomag minden eseménye az `esemenyMentese`-n megy át a kereső-tár
// három műveletével (`esemeny`, `sorszamSzerint`, `hozzafuz` — 3. szabály).
//
// ===== A BEJEGYZÉS (a kereső-átvizsgálás 12. szakasza) =====
//
// Egy gondolat EGY fiókban: `{ k, s, g, esemenyek, m }` — a fiók kulcsa (`e:…` / `p:…` — K2 (C)), az osztódás mélysége
// (K7), a gondolat azonosítója, a csomag (a születés, a címadó javaslat — K9 —, a pont-események — K3), és a megújítás
// (L3 — a ④-ben; addig null). ⭐ A régió halmazának eleme a bejegyzés AZONOSÍTÓJA (a tartalmának lenyomata): egy gondolat
// több fiókban él ugyanazokkal az eseményekkel, a megújítás nem esemény, és egy pont-eseményről (címe nincs) a fogadó nem
// tudná, melyik régióba tartozik. A megújított vagy bővült bejegyzés ÚJ elem — a tár gondolatonként és fiókonként a
// FRISSEBBET tartja (a régi kiesik), így két tartó a különbség után ugyanazt tartja.
//
// ⚠️ A tagság (K3: a két tulajdonos ellenőrzött TAG, a nem tag szerző születése nem kerül indexbe) a ④-ben jön, a tagsági
// kísérők gépével — itt az alak és a tartalom (`bejegyzesTartalma`).
//
// ===== AZ ALAK A LEMEZEN =====
//
// `<adat>/<koino>/kereso/bejegyzesek.jsonl` — soronként egy bejegyzés (hozzáfűzés); a kiesett és a felülírt bejegyzés a
// tömörítéskor tűnik el a fájlból (`tomorites` — a fájl újraírása). ⚠️ Gyorsítótár: a sérült sort átlépjük (a tartósnál ez
// hiba volna), és amit MÁS folyamat fűzött hozzá, azt a `frissit` olvassa be.
//
// Használják: koino.js (a `kereso` parancs, a csere — ③b), a próbák (`keresoTarProba.js`).

import { mkdir, readFile, appendFile, writeFile, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { azonositoAlaku } from '../esemeny/esemeny.js';
import { lenyomatSzinkron } from '../esemeny/kanonikusAlak.js';
import { rendezettHalmaz } from '../esemeny/halmaz.js';
import { esemenyMentese } from './esemenyTar.js';
import { cimKulcsai, bejegyzesHelye, regiobaEsik, KERESHETO_TIPUSOK } from '../csere/keresoReteg.js';
import { DARAB_MAX_MELYSEG } from '../csere/cimjegyzek.js';

// ===================================
// AZ ÁLLANDÓK
// ===================================

/** A kereső-tár mérete — kiinduló érték (a 75. mérés: a legtöbbet tartó készülék ~1,4 MB; ennek a sokszorosa). */
export const KERESO_KORLAT = 16 * 1024 * 1024;

/** Egy bejegyzés legfeljebb ennyi eseményt hoz (a születés, egy címadó javaslat, legfeljebb hat pont-esemény). */
export const BEJEGYZES_ESEMENY_KORLAT = 8;

/** ⭐ K3: ennyi különböző tulajdonos pontja kell (a tagságuk a ④-ben). */
export const BEJEGYZES_TULAJDONOS_MIN = 2;

const FIOK_KULCS_MINTA = /^[ep]:[\p{L}\p{M}\p{N}]{1,64}$/u;
const FAJL = 'bejegyzesek.jsonl';

// ===================================
// A BEJEGYZÉS ALAKJA, AZONOSÍTÓJA ÉS TARTALMA
// ===================================

/**
 * Egy (kívülről jött) bejegyzés alakja — vagy null, ha nem bejegyzés. ⛔ A megújítás (`m`) a ④-ben jön: addig csak a null
 * megújítású bejegyzés érvényes (egy ellenőrizetlen megújítás a lejáratot tolhatná ki — L3).
 * @param {*} b
 * @returns {{k: string, s: number, g: string, esemenyek: Array<Object>, m: null}|null}
 */
export function bejegyzesAlakja(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (typeof b.k !== 'string' || !FIOK_KULCS_MINTA.test(b.k)) return null;
  if (!Number.isInteger(b.s) || b.s < 0 || b.s > DARAB_MAX_MELYSEG) return null;
  if (!azonositoAlaku(b.g)) return null;
  if (!Array.isArray(b.esemenyek) || b.esemenyek.length < 1 + BEJEGYZES_TULAJDONOS_MIN
    || b.esemenyek.length > BEJEGYZES_ESEMENY_KORLAT) return null;
  if (!b.esemenyek.every((e) => e && typeof e === 'object' && !Array.isArray(e) && azonositoAlaku(e.azonosito))) return null;
  if (new Set(b.esemenyek.map((e) => e.azonosito)).size !== b.esemenyek.length) return null;
  if (b.m !== undefined && b.m !== null) return null;
  return { k: b.k, s: b.s, g: b.g, esemenyek: b.esemenyek, m: null };
}

/**
 * ⭐ A bejegyzés AZONOSÍTÓJA — a tartalmának lenyomata (a fiók, az osztódás, a gondolat, az események azonosítói rendezve, a
 * megújítás). A fogadó maga számolja (a küldő szavát nem hisszük).
 * @param {{k: string, s: number, g: string, esemenyek: Array<Object>, m: *}} b
 * @returns {string} 43 jel
 */
export function bejegyzesAzonositoja(b) {
  return lenyomatSzinkron({
    fajta: 'koino-kereso-bejegyzes-1', k: b.k, s: b.s, g: b.g,
    e: rendezettHalmaz(b.esemenyek.map((e) => e.azonosito)), m: b.m ?? null
  });
}

/** Egy javaslat a gondolat címét adja-e (K9) — és ha igen, melyik címet. */
function javasoltCim(e, g) {
  if (e?.tipus !== 'Javaslat' || !Array.isArray(e.adat?.erintettek)) return null;
  const r = e.adat.erintettek.find((x) => x?.entitas === g && typeof x?.valtozas?.cim === 'string');
  return r ? r.valtozas.cim : null;
}

/**
 * ⭐ A bejegyzés TARTALMA (az aláírásokat a kapu ellenőrzi — ez a jelentést): a születés ez a gondolat (kereshető típus, ebben
 * a koinóban); legfeljebb egy címadó javaslat (K9 — ha van, az ő címe számít); a pont-események erre a gondolatra szólnak,
 * pozitívak, és legalább `BEJEGYZES_TULAJDONOS_MIN` különböző szerzőtől (K3); más esemény nincs benne; és a fiók kulcsa a
 * cím egyik kulcsa (a tartó maga számolja — K1: hamisítani nem lehet, csak elhallgatni).
 * @param {Object} b - `bejegyzesAlakja` kimenete
 * @param {string} koino
 * @returns {{rendben: boolean, ok?: string, cim?: string, hely?: bigint, frissesseg?: number}}
 */
export function bejegyzesTartalma(b, koino) {
  if (!b.esemenyek.every((e) => e.koino === koino)) return { rendben: false, ok: 'más koinó eseménye' };
  const szuletes = b.esemenyek.find((e) => e.azonosito === b.g);
  if (!szuletes || szuletes.tipus !== 'GondolatLetrehozas' || typeof szuletes.adat?.cim !== 'string'
    || !KERESHETO_TIPUSOK.includes(szuletes.adat.tipus ?? 'Gondolat')) {
    return { rendben: false, ok: 'nincs benne a gondolat (kereshető) születése' };
  }
  const javaslatok = b.esemenyek.filter((e) => e.tipus === 'Javaslat');
  if (javaslatok.length > 1) return { rendben: false, ok: 'egynél több javaslat' };
  const ujCim = javaslatok.length ? javasoltCim(javaslatok[0], b.g) : null;
  if (javaslatok.length && ujCim === null) return { rendben: false, ok: 'a javaslat nem ennek a gondolatnak a címét adja' };
  const pontok = b.esemenyek.filter((e) => e.tipus === 'TudatpontRendezes');
  if (pontok.length + javaslatok.length + 1 !== b.esemenyek.length) return { rendben: false, ok: 'idegen esemény a csomagban' };
  if (!pontok.every((e) => e.adat?.entitas === b.g && Number.isInteger(e.adat?.pont) && e.adat.pont > 0)) {
    return { rendben: false, ok: 'a pont-esemény nem erre a gondolatra szól, vagy nem pozitív' };
  }
  if (new Set(pontok.map((e) => e.szerzo)).size !== pontok.length) return { rendben: false, ok: 'egy szerzőtől két pont-esemény' };
  if (pontok.length < BEJEGYZES_TULAJDONOS_MIN) return { rendben: false, ok: 'kevesebb tulajdonos, mint ' + BEJEGYZES_TULAJDONOS_MIN };
  const cim = ujCim ?? szuletes.adat.cim;
  if (!cimKulcsai(cim).includes(b.k)) return { rendben: false, ok: 'a fiók kulcsa nem a cím kulcsa' };
  const frissesseg = Math.max(...b.esemenyek.map((e) => (Number.isInteger(e.ido) ? e.ido : 0)));
  return { rendben: true, cim, hely: bejegyzesHelye(b.k, b.g, b.s), frissesseg };
}

/**
 * ⭐ A kézi út és a ④ felajánlásának építője: egy gondolat bejegyzései a cím minden kulcsa alatt (osztódás nélkül — a K7
 * osztódását a tartó mondja meg a ④-ben). A pont-eseményekből a legtöbb pontú `BEJEGYZES_TULAJDONOS_MIN`… legfeljebb hat
 * tulajdonosét veszi (holtversenynél a kisebb szerző-azonosítóét) — az átadott pont-események a NYERTESEK legyenek (a hívó
 * az állapot főkönyvéből adja).
 * @param {{szuletes: Object, javaslat?: Object|null, pontEsemenyek: Array<Object>}} adatok
 * @param {{tulajdonosok?: number}} [beallitas]
 * @returns {Array<Object>} a bejegyzések (üres, ha nincs elég tulajdonos vagy a cím nem ad kulcsot)
 */
export function bejegyzesekEpitese({ szuletes, javaslat = null, pontEsemenyek }, { tulajdonosok = BEJEGYZES_TULAJDONOS_MIN } = {}) {
  if (szuletes?.tipus !== 'GondolatLetrehozas') return [];
  const g = szuletes.azonosito;
  const ujCim = javaslat ? javasoltCim(javaslat, g) : null;
  const cim = ujCim ?? szuletes.adat?.cim;
  if (typeof cim !== 'string') return [];
  const pontok = (pontEsemenyek ?? [])
    .filter((e) => e?.tipus === 'TudatpontRendezes' && e.adat?.entitas === g && Number.isInteger(e.adat?.pont) && e.adat.pont > 0)
    .sort((a, b) => b.adat.pont - a.adat.pont || (a.szerzo < b.szerzo ? -1 : a.szerzo > b.szerzo ? 1 : 0));
  const valasztott = [];
  const lattuk = new Set();
  for (const e of pontok) {
    if (lattuk.has(e.szerzo)) continue;
    lattuk.add(e.szerzo);
    valasztott.push(e);
    if (valasztott.length >= Math.min(Math.max(tulajdonosok, BEJEGYZES_TULAJDONOS_MIN), BEJEGYZES_ESEMENY_KORLAT - 2)) break;
  }
  if (valasztott.length < BEJEGYZES_TULAJDONOS_MIN) return [];
  const esemenyek = [szuletes, ...(ujCim !== null ? [javaslat] : []), ...valasztott];
  return cimKulcsai(cim).map((k) => ({ k, s: 0, g, esemenyek, m: null }));
}

// ===================================
// A TÁR
// ===================================

/**
 * A kereső-tár megnyitása.
 * @param {string} koino
 * @param {string} mappa - a koinó mappája (`<adat>/<koino>`) — a kereső-tár ennek `kereso/` almappája
 * @param {{korlat?: number, most?: () => number}} [beallitas]
 */
export async function keresoTarNyitasa(koino, mappa, beallitas = {}) {
  const hely = join(mappa, 'kereso');
  const fajl = join(hely, FAJL);
  const korlat = beallitas.korlat ?? KERESO_KORLAT;
  const most = beallitas.most ?? (() => Date.now());
  await mkdir(hely, { recursive: true });

  const rekordok = new Map();       // azonosító → { b, hely, frissesseg, bajt, erkezett }
  const helyek = new Map();         // 'g|k|s' → azonosító (fiókonként a frissebb)
  const esemenyek = new Map();      // esemény-azonosító → { e, db } (a kapu „már megvan”-ja és a `sorszamSzerint`)
  const fuggo = new Map();          // a kapun átment, még bejegyzésbe nem vett események (egy befogadás idejére)
  let olvasva = 0;                  // a fájlból ennyi bájtot olvastunk (a `frissit` innen folytatja)
  let valtozasSzam = 0;
  let osszBajt = 0;

  const helyKulcs = (b) => b.g + '|' + b.k + '|' + b.s;

  const esemenyFel = (e) => {
    const x = esemenyek.get(e.azonosito);
    if (x) x.db++; else esemenyek.set(e.azonosito, { e, db: 1 });
  };
  const esemenyLe = (e) => {
    const x = esemenyek.get(e.azonosito);
    if (!x) return;
    if (--x.db <= 0) esemenyek.delete(e.azonosito);
  };

  const kivesz = (id) => {
    const r = rekordok.get(id);
    if (!r) return;
    rekordok.delete(id);
    if (helyek.get(helyKulcs(r.b)) === id) helyek.delete(helyKulcs(r.b));
    for (const e of r.b.esemenyek) esemenyLe(e);
    osszBajt -= r.bajt;
    valtozasSzam++;
  };

  /**
   * Egy (ellenőrzött) bejegyzés a memóriába — fiókonként a FRISSEBB marad (holtversenynél a kisebb azonosító): mindkét
   * tartó ugyanígy dönt, ezért a különbség után ugyanazt tartják. @returns {string|null} az azonosító, ha bekerült
   */
  const memoriaba = (b, tartalom, bajt, erkezett) => {
    const id = bejegyzesAzonositoja(b);
    if (rekordok.has(id)) return null;
    const regiId = helyek.get(helyKulcs(b));
    if (regiId) {
      const regi = rekordok.get(regiId);
      const frissebb = tartalom.frissesseg > regi.frissesseg || (tartalom.frissesseg === regi.frissesseg && id < regiId);
      if (!frissebb) return null;
      kivesz(regiId);
    }
    rekordok.set(id, { b, hely: tartalom.hely, frissesseg: tartalom.frissesseg, bajt, erkezett });
    helyek.set(helyKulcs(b), id);
    for (const e of b.esemenyek) esemenyFel(e);
    osszBajt += bajt;
    valtozasSzam++;
    return id;
  };

  /** A fájl (új) sorainak beolvasása — a sérült, az idegen és a már ismert sort átlépjük (a tartalmat újra ellenőrizzük). */
  const sorokBeolvasasa = (szoveg) => {
    for (const sor of szoveg.split('\n')) {
      if (!sor.trim()) continue;
      let j;
      try { j = JSON.parse(sor); } catch { continue; }
      const b = bejegyzesAlakja(j?.b);
      if (!b) continue;
      const t = bejegyzesTartalma(b, koino);
      if (!t.rendben) continue;
      memoriaba(b, t, Buffer.byteLength(sor) + 1, Number.isInteger(j.erkezett) ? j.erkezett : 0);
    }
  };

  const teljesBeolvasas = async () => {
    rekordok.clear(); helyek.clear(); esemenyek.clear();
    osszBajt = 0;
    let szoveg = '';
    try { szoveg = await readFile(fajl, 'utf8'); } catch { szoveg = ''; }
    // csak a teljes sorokat (egy éppen író folyamat félbe írt sorát a következő `frissit` olvassa)
    const vege = szoveg.lastIndexOf('\n') + 1;
    sorokBeolvasasa(szoveg.slice(0, vege));
    olvasva = Buffer.byteLength(szoveg.slice(0, vege));
    valtozasSzam++;
  };
  await teljesBeolvasas();

  /** Ha az eldobható tár túlnőtt: a legrégebben érkezett megy (a kívül esőket a hívó a `tomorites`-sel dobja). */
  const meretben = async () => {
    if (osszBajt <= korlat) return 0;
    const sorrend = [...rekordok.entries()].sort((a, b) => a[1].erkezett - b[1].erkezett || (a[0] < b[0] ? -1 : 1));
    let db = 0;
    for (const [id] of sorrend) {
      if (osszBajt <= korlat * 0.9) break;
      kivesz(id);
      db++;
    }
    await fajlUjrairasa();
    return db;
  };

  const fajlUjrairasa = async () => {
    const sorok = [...rekordok.values()].map((r) => JSON.stringify({ b: r.b, erkezett: r.erkezett }) + '\n');
    const ideiglenes = fajl + '.' + process.pid + '.uj';
    await writeFile(ideiglenes, sorok.join(''), 'utf8');
    await rename(ideiglenes, fajl);
    olvasva = Buffer.byteLength(sorok.join(''));
  };

  return {
    koino,

    // ----- a kapu három művelete (`esemenyMentese`) -----
    async esemeny(azonosito) {
      return fuggo.get(azonosito) ?? esemenyek.get(azonosito)?.e ?? null;
    },
    async sorszamSzerint(szerzo, sorszam) {
      const ki = [];
      for (const { e } of esemenyek.values()) if (e.szerzo === szerzo && e.sorszam === sorszam) ki.push(e);
      for (const e of fuggo.values()) if (e.szerzo === szerzo && e.sorszam === sorszam) ki.push(e);
      return ki;
    },
    async hozzafuz(e) {
      fuggo.set(e.azonosito, e);
    },

    /**
     * ⭐ Egy bejegyzés FELVÉTELE — a csomag eseményei már átmentek a kapun (`bejegyzesBefogadasa` hívja). @returns
     * {{uj: boolean, azonosito?: string, ok?: string}}
     */
    async felvesz(nyers) {
      const b = bejegyzesAlakja(nyers);
      if (!b) return { uj: false, ok: 'nem bejegyzés alakú' };
      const t = bejegyzesTartalma(b, koino);
      if (!t.rendben) return { uj: false, ok: t.ok };
      const erkezett = most();
      const sor = JSON.stringify({ b, erkezett }) + '\n';
      const id = memoriaba(b, t, Buffer.byteLength(sor), erkezett);
      if (!id) return { uj: false, azonosito: bejegyzesAzonositoja(b), ok: 'megvan (vagy van frissebb)' };
      await appendFile(fajl, sor, 'utf8');
      olvasva += Buffer.byteLength(sor);
      await meretben();
      return { uj: rekordok.has(id), azonosito: id };
    },

    /** A kapu átmeneti emlékezetének ürítése (egy befogadás végén). */
    fuggoUrites() { fuggo.clear(); },

    bejegyzes(id) { return rekordok.get(id)?.b ?? null; },
    bejegyzesek() { return [...rekordok.values()].map((r) => r.b); },
    /** A nálam lévő bejegyzések helye (a mélység becsléséhez — `keresoMelysegBecslese`). */
    helyek() { return [...rekordok.values()].map((r) => r.hely); },

    /** ⭐ Egy régió halmaza (a vonalnak): a bejegyzés-azonosítók rendezve. */
    regioHalmaza(melyseg, darab) {
      return rendezettHalmaz([...rekordok.entries()].filter(([, r]) => regiobaEsik(r.hely, melyseg, darab)).map(([id]) => id));
    },
    regioBejegyzesei(melyseg, darab) {
      return [...rekordok.values()].filter((r) => regiobaEsik(r.hely, melyseg, darab)).map((r) => r.b);
    },

    /** A változás jele (a vonal párjainak gyorsítótára ebből tudja, hogy újra kell számolni). */
    valtozat() { return valtozasSzam; },
    darab() { return rekordok.size; },
    meret() { return osszBajt; },

    /** ⭐ A tömörítés: csak a `megtart(bejegyzés, hely)` szerinti bejegyzések maradnak (a kívül esők — a ③b, a lejártak — a ⑥). */
    async tomorites(megtart) {
      let db = 0;
      for (const [id, r] of [...rekordok.entries()]) {
        if (!megtart(r.b, r.hely)) { kivesz(id); db++; }
      }
      if (db) await fajlUjrairasa();
      return db;
    },

    /** Amit MÁS folyamat fűzött hozzá (vagy írt újra) — beolvasás. */
    async frissit() {
      let meret;
      try { meret = (await stat(fajl)).size; } catch { meret = 0; }
      if (meret === olvasva) return false;
      if (meret < olvasva) { await teljesBeolvasas(); return true; }
      let szoveg;
      try { szoveg = (await readFile(fajl)).subarray(olvasva).toString('utf8'); } catch { return false; }
      const vege = szoveg.lastIndexOf('\n') + 1;
      sorokBeolvasasa(szoveg.slice(0, vege));
      olvasva += Buffer.byteLength(szoveg.slice(0, vege));
      return true;
    }
  };
}

/**
 * ⭐⭐ Egy bejegyzés BEFOGADÁSA — a csomag minden eseménye UGYANAZON A KAPUN (`esemenyMentese` a kereső-tár műveleteivel — 3.
 * szabály), és ha mind átment, a bejegyzés a tárba. Egy hamis esemény az egész bejegyzést elveti.
 * @param {Object} keresoTar
 * @param {*} nyers
 * @returns {Promise<{uj: boolean, azonosito?: string, ok?: string}>}
 */
export async function bejegyzesBefogadasa(keresoTar, nyers) {
  const b = bejegyzesAlakja(nyers);
  if (!b) return { uj: false, ok: 'nem bejegyzés alakú' };
  try {
    for (const e of b.esemenyek) {
      const r = await esemenyMentese(keresoTar, e);
      if (!r.mentve) return { uj: false, ok: 'egy esemény nem ment át a kapun: ' + r.ok };
    }
    return await keresoTar.felvesz(b);
  } finally {
    keresoTar.fuggoUrites();
  }
}
