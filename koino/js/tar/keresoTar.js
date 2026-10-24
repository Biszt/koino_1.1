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
// (L3 — `keresoMegujitas.js`; null, ha még nincs). ⭐ A régió halmazának eleme a bejegyzés AZONOSÍTÓJA (a tartalmának lenyomata): egy gondolat
// több fiókban él ugyanazokkal az eseményekkel, a megújítás nem esemény, és egy pont-eseményről (címe nincs) a fogadó nem
// tudná, melyik régióba tartozik. A megújított vagy bővült bejegyzés ÚJ elem — a tár gondolatonként és fiókonként a
// FRISSEBBET tartja (a régi kiesik), így két tartó a különbség után ugyanazt tartja.
//
// ⭐ A TAGSÁG (K3 — a ④b): a bejegyzés csak akkor kerül az INDEXBE (a régió halmazába, a kérdés válaszába), ha a születés
// szerzője és a csomag minden tulajdonosa ellenőrzött tag — a tagság-ellenőrzőt a hívó adja (`beallitas.tagE`: a `koino.js`
// tagsági kérdezője, ami a nem tudott szerzőt a függő tagság-kérdések közé is felveszi — így a következő csere tagsági köre
// elhozza a csomagját, D95/2). Amíg nem tudjuk, a bejegyzés FÜGGŐ: a tár egy korlátos részében (`FUGGO_HANYAD`), és ha a hely
// kell, előbb a függő megy — így a nem tag (ingyen kulcsú) szerzők nem szoríthatják ki a valódiakat. A függőt nem adjuk tovább
// (a régió halmazában nincs), a `fuggokFrissitese` emeli az indexbe, ha a tagság kiderült.
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
import { azonositoAlaku, esemenyKoinoja } from '../esemeny/esemeny.js';
import { lenyomatSzinkron } from '../esemeny/kanonikusAlak.js';
import { rendezettHalmaz } from '../esemeny/halmaz.js';
import { esemenyMentese } from './esemenyTar.js';
import { cimKulcsai, bejegyzesHelye, regiobaEsik, KERESHETO_TIPUSOK } from '../csere/keresoReteg.js';
// ⭐ D107 L3 (④a): az aláírt megújítás és a lejárat — `keresoMegujitas.js`.
import { megujitasEllenorzese, bejegyzesIdeje, lejartE, MEGUJITAS_ELETTARTAM } from './keresoMegujitas.js';
import { DARAB_MAX_MELYSEG } from '../csere/cimjegyzek.js';

// ===================================
// AZ ÁLLANDÓK
// ===================================

/** A kereső-tár mérete — kiinduló érték (a 75. mérés: a legtöbbet tartó készülék ~1,4 MB; ennek a sokszorosa). */
export const KERESO_KORLAT = 16 * 1024 * 1024;

/** Egy bejegyzés legfeljebb ennyi eseményt hoz (a születés, egy címadó javaslat, legfeljebb hat pont-esemény). */
export const BEJEGYZES_ESEMENY_KORLAT = 8;

/** ⭐ K3: ennyi különböző tulajdonos pontja kell (a tagságuk a ④b-ben). */
export const BEJEGYZES_TULAJDONOS_MIN = 2;

/** ⭐ ④b: a FÜGGŐ (még nem ellenőrzött tagságú) bejegyzések együtt legfeljebb a korlát ennyied részét foglalhatják. */
export const FUGGO_HANYAD = 10;

/**
 * ⭐ D111 (K11): a TARTÓ-TIPP — melyik KÉSZÜLÉK (tábla-aláíró) ajánlotta fel egy gondolat bejegyzéseit (a felajánló a
 * tulajdonos, tehát a gondolat szeletét vállalásból tartja). Gondolatonként legfeljebb ennyi (a legfrissebbek)…
 */
export const TIPP_KORLAT = 4;
/** …legfeljebb ennyi gondolatnál (a legrégebben frissített esik ki)… */
export const TIPP_GONDOLAT_KORLAT = 4096;
/** …és a kérdés válasza találatonként ennyit ad. */
export const TIPP_VALASZ = 2;
const TIPP_FAJL = 'tippek.json';
const TIPP_MINTA = /^[A-Za-z0-9_-]{43}$/;

/** Egy tipp-lista alakja: `[{ a: tábla-aláíró, t: idő }]` (a szöveg magában a „most”-tal), a hibás kiesik, korlátos. */
export function tippekAlakja(lista, most = Date.now()) {
  const ki = [];
  for (const x of Array.isArray(lista) ? lista : [lista]) {
    const a = typeof x === 'string' ? x : x?.a;
    if (typeof a !== 'string' || !TIPP_MINTA.test(a) || ki.some((y) => y.a === a)) continue;
    const t = typeof x === 'object' && Number.isFinite(x?.t) ? Math.min(x.t, most) : most;
    ki.push({ a, t });
    if (ki.length >= TIPP_KORLAT) break;
  }
  return ki;
}

/** A bejegyzés szerzői, akiknek tagnak kell lenniük (K3): a születés szerzője és a csomag pont-eseményeinek szerzői. */
export function bejegyzesSzerzoi(b) {
  const sz = new Set();
  const szuletes = (b?.esemenyek ?? []).find((e) => e?.azonosito === b?.g);
  if (szuletes?.szerzo) sz.add(szuletes.szerzo);
  for (const e of b?.esemenyek ?? []) if (e?.tipus === 'TudatpontRendezes' && e.szerzo) sz.add(e.szerzo);
  return [...sz];
}

const FIOK_KULCS_MINTA = /^[ep]:[\p{L}\p{M}\p{N}]{1,64}$/u;
const FAJL = 'bejegyzesek.jsonl';
// ⭐ Az újraírás jele: minden újraíró átírja (véletlen jel) — a másik folyamat `frissit`-je ebből tudja, hogy a fájl NEM csak
// nőtt (az újraírás azonos hosszal is történhet — a függő jel 1 → 0 —, vagy hosszabbal, és akkor a régi helyről olvasna).
const GENERACIO = 'generacio';

// ===================================
// A BEJEGYZÉS ALAKJA, AZONOSÍTÓJA ÉS TARTALMA
// ===================================

/**
 * Egy (kívülről jött) bejegyzés alakja — vagy null, ha nem bejegyzés. A megújítás (`m`, L3) null vagy egy `{ szerzo, ido,
 * alairas }` — az ellenőrzése a TARTALOMÉ (`bejegyzesTartalma`: az aláírás, a tulajdonos, a jövő-tűrés).
 * @param {*} b
 * @returns {{k: string, s: number, g: string, esemenyek: Array<Object>, m: Object|null}|null}
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
  let m = null;
  if (b.m !== undefined && b.m !== null) {
    if (typeof b.m !== 'object' || Array.isArray(b.m) || Object.keys(b.m).length !== 3) return null;
    m = { szerzo: b.m.szerzo, ido: b.m.ido, alairas: b.m.alairas };
  }
  return { k: b.k, s: b.s, g: b.g, esemenyek: b.esemenyek, m };
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
 * ⭐ D107 L3 (④a): a megújítás érvényes (a csomag egyik tulajdonosa írta alá erre a gondolatra és csomagra, nem jövőbeli), és
 * a bejegyzés nem járt le (a megújítása — vagy a csomag legfrissebb eseménye — + 30 nap; bárkinél ugyanaz). A frissesség a
 * bejegyzés ideje (`bejegyzesIdeje`): a megújított bejegyzés felülírja a régit.
 * @param {Object} b - `bejegyzesAlakja` kimenete
 * @param {string} koino
 * @param {number} [most] - a tartó órája
 * @returns {{rendben: boolean, ok?: string, cim?: string, hely?: bigint, frissesseg?: number}}
 */
export function bejegyzesTartalma(b, koino, most = Date.now()) {
  if (!b.esemenyek.every((e) => esemenyKoinoja(e) === koino)) return { rendben: false, ok: 'más koinó eseménye' };
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
  if (b.m) {
    const r = megujitasEllenorzese(b.m, { koino, g: b.g, esemenyek: b.esemenyek, most });
    if (!r.rendben) return { rendben: false, ok: r.ok };
  }
  if (lejartE(b, most)) return { rendben: false, ok: 'a bejegyzés lejárt (30 napja nem újították — L3)' };
  return { rendben: true, cim, hely: bejegyzesHelye(b.k, b.g, b.s), frissesseg: bejegyzesIdeje(b) };
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
export function bejegyzesekEpitese({ szuletes, javaslat = null, pontEsemenyek, megujitas = null },
  { tulajdonosok = BEJEGYZES_TULAJDONOS_MIN } = {}) {
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
  // ⭐ D107 L3 (④a): a megújítást (ha a hívó ad — egy függvény a kész csomagra) a csomag tulajdonosa írja alá; egy aláírás a
  // gondolat minden fiók-bejegyzésére szól.
  const m = typeof megujitas === 'function' ? megujitas(esemenyek) : null;
  return cimKulcsai(cim).map((k) => ({ k, s: 0, g, esemenyek, m }));
}

// ===================================
// A TÁR
// ===================================

/**
 * A kereső-tár megnyitása.
 * @param {string} koino
 * @param {string} mappa - a koinó mappája (`<adat>/<koino>`) — a kereső-tár ennek `kereso/` almappája
 * @param {{korlat?: number, most?: () => number, tagE?: (szerzo: string) => Promise<boolean|null>}} [beallitas] — a `tagE`
 *   nélkül nincs tagság-ellenőrzés (minden bejegyzés az indexbe kerül — a modul-próbáknak)
 */
export async function keresoTarNyitasa(koino, mappa, beallitas = {}) {
  const hely = join(mappa, 'kereso');
  const fajl = join(hely, FAJL);
  const generacioFajl = join(hely, GENERACIO);
  let latottGeneracio = null;
  const generacioOlvasasa = async () => { try { return await readFile(generacioFajl, 'utf8'); } catch { return null; } };
  const korlat = beallitas.korlat ?? KERESO_KORLAT;
  const most = beallitas.most ?? (() => Date.now());
  const tagE = typeof beallitas.tagE === 'function' ? beallitas.tagE : null;
  /** ⭐ ④b: minden szerzője ellenőrzött tag-e? (mindet megkérdezzük — a nem tudottak így mind a függő kérdések közé kerülnek) */
  const mindTag = async (b) => {
    if (!tagE) return true;
    let mind = true;
    for (const sz of bejegyzesSzerzoi(b)) {
      let t = null;
      try { t = await tagE(sz); } catch { t = null; }
      if (t !== true) mind = false;
    }
    return mind;
  };
  await mkdir(hely, { recursive: true });

  // ⭐ D111 (K11): a TARTÓ-TIPPEK — gondolat → [{ a, t }] (a legfrissebb elöl). Puha, helyi tipp: senki nem kezeskedik érte (a
  // hamis tipp elérhetetlenség, nem hamisítás — D6). Külön fájl (a bejegyzés azonosítója a tartalmáé, a tipp nem része); a
  // más folyamat írását a fájl módosítási ideje mutatja. A tipp 30 nap után elévül (mint a bejegyzés — L3).
  const tippFajl = join(hely, TIPP_FAJL);
  let tippMap = new Map();
  let tippIdo;
  const tippekBetoltese = async () => {
    let m;
    try { m = (await stat(tippFajl)).mtimeMs; } catch { m = null; }
    if (m === tippIdo) return;
    tippIdo = m;
    tippMap = new Map();
    if (m === null) return;
    try {
      const nyers = JSON.parse(await readFile(tippFajl, 'utf8'));
      for (const [g, lista] of Object.entries(nyers && typeof nyers === 'object' ? nyers : {})) {
        const jo = azonositoAlaku(g) ? tippekAlakja(lista, most()) : [];
        if (jo.length) tippMap.set(g, jo);
      }
    } catch { tippMap = new Map(); }
  };
  const tippekIrasa = async () => {
    while (tippMap.size > TIPP_GONDOLAT_KORLAT) tippMap.delete(tippMap.keys().next().value);
    const ideiglenes = tippFajl + '.' + process.pid + '.uj';
    await writeFile(ideiglenes, JSON.stringify(Object.fromEntries(tippMap)), 'utf8');
    await rename(ideiglenes, tippFajl);
    try { tippIdo = (await stat(tippFajl)).mtimeMs; } catch { tippIdo = null; }
  };

  const rekordok = new Map();       // azonosító → { b, hely, frissesseg, bajt, erkezett, f } (f: függő — ④b)
  const helyek = new Map();         // 'g|k|s' → azonosító (fiókonként a frissebb)
  const esemenyek = new Map();      // esemény-azonosító → { e, db } (a kapu „már megvan”-ja és a `sorszamSzerint`)
  const fuggo = new Map();          // a kapun átment, még bejegyzésbe nem vett események (egy befogadás idejére)
  let olvasva = 0;                  // a fájlból ennyi bájtot olvastunk (a `frissit` innen folytatja)
  let valtozasSzam = 0;
  let osszBajt = 0;
  let fuggoBajt = 0;

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
    if (r.f) fuggoBajt -= r.bajt;
    valtozasSzam++;
  };

  /**
   * Egy (ellenőrzött) bejegyzés a memóriába — fiókonként a FRISSEBB marad (holtversenynél a kisebb azonosító): mindkét
   * tartó ugyanígy dönt, ezért a különbség után ugyanazt tartják. @returns {string|null} az azonosító, ha bekerült
   */
  const memoriaba = (b, tartalom, bajt, erkezett, f = false) => {
    const id = bejegyzesAzonositoja(b);
    if (rekordok.has(id)) return null;
    const regiId = helyek.get(helyKulcs(b));
    if (regiId) {
      const regi = rekordok.get(regiId);
      const frissebb = tartalom.frissesseg > regi.frissesseg || (tartalom.frissesseg === regi.frissesseg && id < regiId);
      if (!frissebb) return null;
      kivesz(regiId);
    }
    rekordok.set(id, { b, hely: tartalom.hely, frissesseg: tartalom.frissesseg, bajt, erkezett, f: !!f });
    helyek.set(helyKulcs(b), id);
    for (const e of b.esemenyek) esemenyFel(e);
    osszBajt += bajt;
    if (f) fuggoBajt += bajt;
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
      const t = bejegyzesTartalma(b, koino, most());
      if (!t.rendben) continue;
      // ⭐ ④b: a függő jel a sorból (a régi, jel nélküli sor függő, ha van tagság-ellenőrző — a `fuggokFrissitese` emeli)
      memoriaba(b, t, Buffer.byteLength(sor) + 1, Number.isInteger(j.erkezett) ? j.erkezett : 0, tagE ? j.f !== 0 : false);
    }
  };

  const teljesBeolvasas = async () => {
    latottGeneracio = await generacioOlvasasa();
    rekordok.clear(); helyek.clear(); esemenyek.clear();
    osszBajt = 0;
    fuggoBajt = 0;
    let szoveg = '';
    try { szoveg = await readFile(fajl, 'utf8'); } catch { szoveg = ''; }
    // csak a teljes sorokat (egy éppen író folyamat félbe írt sorát a következő `frissit` olvassa)
    const vege = szoveg.lastIndexOf('\n') + 1;
    sorokBeolvasasa(szoveg.slice(0, vege));
    olvasva = Buffer.byteLength(szoveg.slice(0, vege));
    valtozasSzam++;
  };
  await teljesBeolvasas();

  /**
   * Ha az eldobható tár túlnőtt: előbb a FÜGGŐ megy (④b — a nem ellenőrzött tagságú nem szoríthatja ki a valódit), aztán a
   * legrégebben érkezett; és a függők együtt legfeljebb a korlát `FUGGO_HANYAD`-od részét foglalják (a kívül esőket a hívó a
   * `tomorites`-sel dobja).
   */
  const meretben = async () => {
    if (osszBajt <= korlat && fuggoBajt <= korlat / FUGGO_HANYAD) return 0;
    const sorrend = [...rekordok.entries()]
      .sort((a, b) => (b[1].f - a[1].f) || a[1].erkezett - b[1].erkezett || (a[0] < b[0] ? -1 : 1));
    let db = 0;
    for (const [id, r] of sorrend) {
      if (osszBajt <= korlat * 0.9 && fuggoBajt <= korlat / FUGGO_HANYAD) break;
      if (!r.f && osszBajt <= korlat * 0.9) break;
      kivesz(id);
      db++;
    }
    await fajlUjrairasa();
    return db;
  };

  const fajlUjrairasa = async () => {
    const sorok = [...rekordok.values()].map((r) => JSON.stringify({ b: r.b, erkezett: r.erkezett, f: r.f ? 1 : 0 }) + '\n');
    const ideiglenes = fajl + '.' + process.pid + '.uj';
    await writeFile(ideiglenes, sorok.join(''), 'utf8');
    await rename(ideiglenes, fajl);
    olvasva = Buffer.byteLength(sorok.join(''));
    latottGeneracio = process.pid + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
    try { await writeFile(generacioFajl, latottGeneracio, 'utf8'); } catch { /* a következő frissítés teljesen olvas */ }
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
      const t = bejegyzesTartalma(b, koino, most());
      if (!t.rendben) return { uj: false, ok: t.ok };
      const erkezett = most();
      // ⭐ ④b: a szerzők tagsága — ha valamelyik nem ellenőrzött, a bejegyzés FÜGGŐ (nem kerül az indexbe, nem megy tovább).
      const f = !(await mindTag(b));
      const sor = JSON.stringify({ b, erkezett, f: f ? 1 : 0 }) + '\n';
      const id = memoriaba(b, t, Buffer.byteLength(sor), erkezett, f);
      if (!id) return { uj: false, azonosito: bejegyzesAzonositoja(b), ok: 'megvan (vagy van frissebb)' };
      await appendFile(fajl, sor, 'utf8');
      olvasva += Buffer.byteLength(sor);
      await meretben();
      return { uj: rekordok.has(id), azonosito: id, fuggo: f };
    },

    /** A kapu átmeneti emlékezetének ürítése (egy befogadás végén). */
    fuggoUrites() { fuggo.clear(); },

    bejegyzes(id) { return rekordok.get(id)?.b ?? null; },
    bejegyzesek() { return [...rekordok.values()].map((r) => r.b); },
    /** A nálam lévő bejegyzések helye (a mélység becsléséhez — `keresoMelysegBecslese`). */
    helyek() { return [...rekordok.values()].map((r) => r.hely); },

    /**
     * ⭐ Egy régió halmaza (a vonalnak): a bejegyzés-azonosítók rendezve. ⛔ A LEJÁRT bejegyzés nincs benne (L3): ami nálam
     * lejárt, azt nem adom tovább — a „temető” így a rajból sem jön vissza (a fogadó maga is elveti).
     */
    regioHalmaza(melyseg, darab) {
      const t = most();
      return rendezettHalmaz([...rekordok.entries()]
        .filter(([, r]) => !r.f && regiobaEsik(r.hely, melyseg, darab) && !lejartE(r.b, t)).map(([id]) => id));
    },
    /** A régió INDEXELT (nem függő, nem lejárt) bejegyzései. */
    regioBejegyzesei(melyseg, darab) {
      const t = most();
      return [...rekordok.values()].filter((r) => !r.f && regiobaEsik(r.hely, melyseg, darab) && !lejartE(r.b, t)).map((r) => r.b);
    },
    /** ⭐ A kereső-réteg ⑤: egy hely INDEXELT (nem függő, nem lejárt) bejegyzései — a kérdés válaszához. */
    helyBejegyzesei(hely) {
      const t = most();
      return [...rekordok.values()].filter((r) => !r.f && r.hely === hely && !lejartE(r.b, t)).map((r) => r.b);
    },
    /** ⭐ ④c (K7): hány INDEXELT (nem függő, nem lejárt) bejegyzés áll egy helyen — a fiók (vagy darabja) mérete nálam. */
    helyMerete(hely) {
      const t = most();
      let n = 0;
      for (const r of rekordok.values()) if (!r.f && r.hely === hely && !lejartE(r.b, t)) n++;
      return n;
    },
    /** Függő-e (④b: a szerzők tagsága még nem ellenőrzött). */
    fuggoE(id) { return rekordok.get(id)?.f ?? null; },
    fuggoDarab() { let n = 0; for (const r of rekordok.values()) if (r.f) n++; return n; },
    /**
     * ⭐ ④b: a függők újraértékelése — akinek minden szerzője azóta ellenőrzött tag lett, az indexbe kerül.
     * @returns {Promise<number>} hány került az indexbe
     */
    async fuggokFrissitese() {
      if (!tagE) return 0;
      let db = 0;
      for (const r of rekordok.values()) {
        if (!r.f) continue;
        if (await mindTag(r.b)) { r.f = false; fuggoBajt -= r.bajt; db++; }
      }
      if (db) { valtozasSzam++; await fajlUjrairasa(); }
      return db;
    },

    /**
     * ⭐ D111 (K11): egy gondolat TARTÓ-TIPPJEI — `[{ a, t }]`, a legfrissebb elöl, az elévültek (30 nap) nélkül.
     * @param {string} g
     */
    async tippek(g) {
      await tippekBetoltese();
      const hatar = most() - MEGUJITAS_ELETTARTAM;
      return (tippMap.get(g) ?? []).filter((x) => x.t > hatar).map((x) => ({ ...x }));
    },
    /**
     * ⭐ D111 (K11): tippek feljegyzése egy gondolathoz — a felajánló készüléke (a kérelem ellenőrzött tábla-kulcsából), a
     * régió társától kapott tipp (az idejével), vagy a kézi út. A régiek közül ugyanaz a készülék a frissebb idővel marad.
     * @param {string} g
     * @param {Array<string|{a: string, t?: number}>|string} lista
     * @returns {Promise<boolean>} változott-e
     */
    async tippFeljegyzese(g, lista) {
      if (!azonositoAlaku(g)) return false;
      const ujak = tippekAlakja(lista, most());
      if (!ujak.length) return false;
      await tippekBetoltese();
      const egyben = new Map();
      for (const x of [...(tippMap.get(g) ?? []), ...ujak]) {
        const regi = egyben.get(x.a);
        if (!regi || regi.t < x.t) egyben.set(x.a, x);
      }
      const lista2 = [...egyben.values()].sort((x, y) => y.t - x.t).slice(0, TIPP_KORLAT);
      if (JSON.stringify(lista2) === JSON.stringify(tippMap.get(g) ?? [])) return false;
      tippMap.delete(g);
      tippMap.set(g, lista2);
      await tippekIrasa();
      return true;
    },

    /** A változás jele (a vonal párjainak gyorsítótára ebből tudja, hogy újra kell számolni). */
    valtozat() { return valtozasSzam; },
    darab() { return rekordok.size; },
    meret() { return osszBajt; },

    /**
     * ⭐ A tömörítés: csak a `megtart(bejegyzés, hely)` szerinti bejegyzések maradnak (a régióimon kívül esők kiesnek); ⭐ a
     * LEJÁRT bejegyzés mindig kiesik (L3 — a ⑥ halványulás).
     */
    async tomorites(megtart = () => true) {
      let db = 0;
      const t = most();
      for (const [id, r] of [...rekordok.entries()]) {
        if (lejartE(r.b, t) || !megtart(r.b, r.hely)) { kivesz(id); db++; }
      }
      if (db) await fajlUjrairasa();
      // ⭐ D111: a tipp csak a nálam lévő gondolatokhoz kell (és az elévült kiesik).
      await tippekBetoltese();
      const gondolatok = new Set([...rekordok.values()].map((r) => r.b.g));
      const hatar = t - MEGUJITAS_ELETTARTAM;
      let tippValtozott = false;
      for (const [g, lista] of [...tippMap.entries()]) {
        const marad = gondolatok.has(g) ? lista.filter((x) => x.t > hatar) : [];
        if (marad.length === lista.length) continue;
        tippValtozott = true;
        if (marad.length) tippMap.set(g, marad); else tippMap.delete(g);
      }
      if (tippValtozott) await tippekIrasa();
      return db;
    },

    /** Amit MÁS folyamat fűzött hozzá (vagy írt újra) — beolvasás. */
    async frissit() {
      // ⭐ Ha valaki újraírta (más a generáció), teljesen újraolvassuk; különben csak a hozzáfűzött végét.
      if ((await generacioOlvasasa()) !== latottGeneracio) { await teljesBeolvasas(); return true; }
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
