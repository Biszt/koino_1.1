// koino/js/allapot/lancEllenorzes.js

// Felelősség: A LÁNC-ELLENŐRZÉS A CSERÉBEN (D98/2–4 — az A pillér hátralévői, 2026-10-09): a szigorú (b) alatt egy szerző
// teljes láncát csak ő maga tartja, a két ág (a kettős lánc) könnyen KÜLÖN tartókhoz kerül, és ott senki nem látja együtt —
// a szerző a tudatpont-keretet így kétszer használhatná. Ez a modul a két oldalt adja: a KÉRDEZŐT (aki egy szerző néhány
// eseményét tartja, és meg akarja tudni, egy láncon vannak-e) és a SZERZŐ OLDALÁT (aki a láncot tartja, és felel).
//
// ===== ⭐ MIT KÉRDEZÜNK =====
//
// A kérdező a szerző nálam lévő LEGÚJABB eseményét veszi fejnek (a `lancGyoker.naplo`-ja az 1..d sorszámú eseményeit köti
// el — D78, D81), és megkérdezi:
//   · a FEJ — „a d+1. eseményed ez?” (`f`): ha nem, a szerző a sajátját adja, és a két azonos sorszámú, aláírt esemény a
//     meglévő ELÁGAZÁS-bizonyíték (D82);
//   · a nálam lévő többi eseménye (legfeljebb `LANC_KERDES_KORLAT`) — „benne van-e a fej gyökerében?” (`i`): ha igen, egy
//     tagsági bizonyíték (log n), ha nem, a szerző az ott álló SAJÁT eseményét adja — ismét elágazás-bizonyíték;
//   · a KÖVETKEZETESSÉG (`r`): ha korábban egy kisebb gyökeret már ellenőriztem, a régi a mostaninak előtagja-e (RFC 9162)
//     — ettől a korábban ellenőrzött eseményeket nem kell újra kérdezni;
//   · és (D79) 5% eséllyel egy új fejnél a TELJES kiosztás-listát (`k`): ha a lista a fej aláírt kiosztás-gyökerét adja, és
//     van benne nem pozitív levél, az a meglévő NEGATÍV LEVÉL bizonyíték (D80).
// ⭐ Új bizonyíték-fajta nem kell: a válaszból a meglévő `Ellentmondas` fajták lesznek, és a kapu ugyanúgy ellenőrzi őket.
//
// ===== ⭐ KI FELEL =====
//
// Aki a kérdezett fej láncát tartja (a fejtől `elozo` mutatókon visszafelé — akkor is, ha a szerzőnek nála más ága is
// van), vagy ha a fej nincs nála, a szerző EGYETLEN láncát hézag nélkül — a szerző maga (a saját láncát mindig), és a
// „mindent” beállítású készülék (akinél megvan). A válasz önmagát igazolja (a szerző aláírt gyökereihez), tehát nem kell tudni, ki adta. ⚠️ A
// hallgatás nem bűn (D19, D79/3): ami nem igazolódott, az a kérdezőnél FÜGGŐBEN marad (és a függés ideje kiolvasható) — nem
// vád.
//
// ⚠️ HÁLÓZATOT NEM IMPORTÁL (1. szabály): a vonal (`vonal.js`, a LANCKEREK/LANCVALASZ kör) viszi az üzeneteket, a hívó
// (`koino.js`) a tárat, a feljegyzést és a bejelentést.
//
// Használják: koino.js (a csere lánc-köre), a próbák.

import {
  levelOsszegzes, osszegzesAlakja, azonosOsszegzes, naploBizonyitek, naploBizonyitekEllenorzese, naploKovetkezetesseg,
  naploKovetkezetessegEllenorzese, ujAllapotFa, allapotBeallitas, allapotGyokere, allapotBizonyitek, allapotLista
} from '../esemeny/osszegzoFa.js';
import { NAPLO_FAJTA, KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, lancAllapotaLancbol } from './lancGyoker.js';
import { esemenyEllenorzese, AZONOSITO_MINTA } from '../esemeny/esemeny.js';
import { ellentmondasEllenorzese } from './ellentmondas.js';

// ===================================
// A PARAMÉTEREK — ⚠️ egyik sem állapot-befolyásoló (D66): csak azt szabják meg, mennyit kérdezünk
// ===================================

/** Egy cserében legfeljebb ennyi szerzőről kérdezünk (a2: a társ szerzői kulcsa + a most kapott események szerzői). */
export const LANC_SZERZO_KORLAT = 3;
/** Szerzőnként legfeljebb ennyi eseményt kérdezünk egy cserében (D98/3). */
export const LANC_KERDES_KORLAT = 8;
/** D79: egy új fejnél ennyi eséllyel kérjük a teljes kiosztás-listát. */
export const LISTA_ESELY = 0.05;
/** A teljes kiosztás-lista legfeljebb ennyi levél (a keret úgyis korlátozza). */
export const LISTA_KORLAT = 4096;
/** Ennyi szerzőről tartunk ellenőrzött állást (a legrégebben frissített esik ki). */
export const LANC_EMLEKEZET_KORLAT = 256;
/** Szerzőnként ennyi ellenőrzött esemény-azonosítót jegyzünk meg (a legrégebbi esik ki — legfeljebb újra kérdezzük). */
export const ELLENORZOTT_KORLAT = 256;

// ===================================
// A FEJ — a szerző nálam lévő legújabb, lánc-gyökeres eseménye
// ===================================

/** Hordoz-e az esemény használható napló-gyökeret (az 1..sorszám-1 eseményeiről)? */
function naploGyokere(e) {
  const n = e?.lancGyoker?.naplo;
  return n && osszegzesAlakja(n, 0) && n.d === e.sorszam - 1 ? n : null;
}

/** A szerző nálam lévő eseményei (a koinóból) és a feje. */
async function szerzoNalam(tar, koino, sz) {
  const lanc = (await tar.szerzoLanca(sz)).filter((e) => e && e.koino === koino && Number.isSafeInteger(e.sorszam));
  let fej = null;
  for (const e of lanc) if (naploGyokere(e) && (!fej || e.sorszam > fej.sorszam)) fej = e;
  return { lanc, fej };
}

// ===================================
// ⭐ A KÉRDEZŐ — a kérdések, és a válaszok feldolgozása
// ===================================

/** Egy tárolt szerző-állás alakja (a fájlból jön — nem bízunk benne). */
function allasAlakja(x) {
  if (!x || typeof x !== 'object') return { gy: null, fej: null, ok: [], elso: null, kerdezve: 0 };
  return {
    gy: x.gy && osszegzesAlakja(x.gy, 0) ? x.gy : null,
    fej: typeof x.fej === 'string' ? x.fej : null,
    ok: Array.isArray(x.ok) ? x.ok.filter((a) => typeof a === 'string').slice(-ELLENORZOTT_KORLAT) : [],
    elso: Number.isSafeInteger(x.elso) ? x.elso : null,
    kerdezve: Number.isSafeInteger(x.kerdezve) ? x.kerdezve : 0
  };
}

/**
 * ⭐ A KÉRDÉSEK egy cseréhez — a jelölt szerzőkről (sorrendben), akiknél van mit kérdezni.
 * @param {{tar: Object, koino: string, tarolo: Object, sajat?: string|null, veletlen?: Function}} k
 * @param {Array<string>} szerzok - a jelöltek (a társ szerzői kulcsa elöl, aztán a most kapott események szerzői)
 * @returns {Promise<Array<Object>>} a kérdések (a vonalon mennek — `lancKerdesAlakja`)
 */
export async function lancKerdesek({ tar, koino, tarolo, sajat = null, veletlen = Math.random }, szerzok) {
  const kerdesek = [];
  const jegyzek = lancJegyzekVagasa(await tarolo.olvas());
  let valtozott = false;
  for (const sz of [...new Set(szerzok)]) {
    if (kerdesek.length >= LANC_SZERZO_KORLAT) break;
    if (typeof sz !== 'string' || sz === sajat) continue;
    const { lanc, fej } = await szerzoNalam(tar, koino, sz);
    if (!fej) continue;
    const R = naploGyokere(fej);
    const d = R.d;
    const st = allasAlakja(jegyzek.szerzok[sz]);
    const ok = new Set(st.ok);
    const ujFej = !(st.gy && azonosOsszegzes(st.gy, R) && st.fej === fej.azonosito);
    // ⭐ Új fejnél a RÉGI (ellenőrzött) fejet is kérdezzük, elöl: ha a szerzőnek két ága van, és a régi fej a másikon volt,
    // a szerző az ott álló saját eseményét adja — a bizonyíték így azonnal megvan (a következetesség hiánya csak jelezné).
    const regiFej = ujFej && st.fej ? lanc.find((e) => e.azonosito === st.fej && e.sorszam <= d) ?? null : null;
    const fuggok = [...(regiFej ? [regiFej] : []), ...lanc.filter((e) => e.sorszam <= d && !ok.has(e.azonosito)
      && e !== regiFej).sort((a, b) => b.sorszam - a.sorszam)].slice(0, LANC_KERDES_KORLAT);
    if (!ujFej && !fuggok.length) continue;
    const kovetkezetesseg = st.gy && ujFej && st.gy.d > 0 && st.gy.d < d ? st.gy.d : null;
    kerdesek.push({
      sz, d, f: fej.azonosito, i: fuggok.map((e) => [e.sorszam, e.azonosito]),
      ...(kovetkezetesseg ? { r: kovetkezetesseg } : {}),
      ...(ujFej && veletlen() < LISTA_ESELY ? { k: 1 } : {})
    });
    jegyzek.szerzok[sz] = { ...st, elso: st.elso ?? Date.now(), kerdezve: st.kerdezve + 1, ido: Date.now() };
    valtozott = true;
  }
  if (valtozott) await tarolo.ir(lancJegyzekVagasa(jegyzek));
  return kerdesek;
}

/** A társ kérdésének alakja a vonalon — a hibás tételt kihagyjuk (a társ hibázott vagy ellenséges). */
export function lancKerdesAlakja(x) {
  if (!x || typeof x !== 'object' || typeof x.sz !== 'string' || !AZONOSITO_MINTA.test(x.sz)) return null;
  if (!Number.isSafeInteger(x.d) || x.d < 0 || typeof x.f !== 'string' || !AZONOSITO_MINTA.test(x.f)) return null;
  const i = Array.isArray(x.i) ? x.i.filter((t) => Array.isArray(t) && Number.isSafeInteger(t[0]) && t[0] >= 1
    && t[0] <= x.d && typeof t[1] === 'string' && AZONOSITO_MINTA.test(t[1])).slice(0, LANC_KERDES_KORLAT) : [];
  const r = Number.isSafeInteger(x.r) && x.r > 0 && x.r < x.d ? x.r : null;
  return { sz: x.sz, d: x.d, f: x.f, i, ...(r ? { r } : {}), ...(x.k === 1 ? { k: 1 } : {}) };
}

/**
 * ⭐ A VÁLASZOK FELDOLGOZÁSA — ami igazolódott, azt feljegyezzük; ami ellentmond, abból bizonyíték lesz (ellenőrizve, a
 * kapuéval azonos módon); ami nem jött, az függőben marad.
 * @param {{tar: Object, koino: string, tarolo: Object}} k
 * @param {Array<Object>} kerdesek - a SAJÁT kérdéseim (`lancKerdesek`)
 * @param {Array<Object>} valaszok - a társ válaszai (nyersen, a vonalról)
 * @returns {Promise<{igazolt: number, leletek: Array<Object>, fuggo: number}>}
 */
export async function lancValaszokFeldolgozasa({ tar, koino, tarolo }, kerdesek, valaszok) {
  const leletek = [];
  let igazolt = 0, fuggo = 0;
  const jegyzek = lancJegyzekVagasa(await tarolo.olvas());
  const lista = Array.isArray(valaszok) ? valaszok.filter((v) => v && typeof v === 'object') : [];
  const elagazas = async (kit, esemeny, masik) => {
    const adat = { kit, fajta: 'elagazas', esemeny, masik,
      vesztes: esemeny.azonosito < masik.azonosito ? masik.azonosito : esemeny.azonosito };
    if ((await ellentmondasEllenorzese(adat, koino)).rendben) leletek.push(adat);
  };
  const sajatEsemenye = async (e, sz, sorszam) => !!e && typeof e === 'object' && e.szerzo === sz && e.koino === koino
    && e.sorszam === sorszam && (await esemenyEllenorzese(e)).rendben === true;

  for (const q of kerdesek) {
    const a = lista.find((v) => v.sz === q.sz && v.d === q.d);
    const fej = await tar.esemeny(q.f);
    const R = naploGyokere(fej);
    const st = allasAlakja(jegyzek.szerzok[q.sz]);
    if (!a || !R) { fuggo++; continue; }

    // ----- A FEJ: a d+1. esemény az övé? -----
    let fejRendben = a.f === 1;
    if (!fejRendben && await sajatEsemenye(a.f, q.sz, q.d + 1) && a.f.azonosito !== q.f) await elagazas(q.sz, fej, a.f);

    // ----- A KÖVETKEZETESSÉG: a régi ellenőrzött gyökér a mostaninak előtagja? -----
    const kovetkezetes = q.r && st.gy && Array.isArray(a.c)
      ? await naploKovetkezetessegEllenorzese(NAPLO_FAJTA, st.gy, R, { regi: q.r, meret: q.d, ut: a.c }) : false;

    // ----- A TÖBBI ESEMÉNY: benne van a fej gyökerében, vagy ellentmond -----
    const igazoltak = [];
    const tetelek = Array.isArray(a.i) ? a.i : [];
    for (const [s, az] of q.i) {
      const t = tetelek.find((x) => x && x.s === s);
      if (!t) continue;
      if (t.e) {
        const nalam = await tar.esemeny(az);
        if (nalam && await sajatEsemenye(t.e, q.sz, s) && t.e.azonosito !== az) await elagazas(q.sz, nalam, t.e);
        continue;
      }
      if (Array.isArray(t.ut) && await naploBizonyitekEllenorzese(NAPLO_FAJTA, await levelOsszegzes(NAPLO_FAJTA, az),
        { index: s - 1, meret: q.d, ut: t.ut }, R)) {
        igazoltak.push(az);
      }
    }

    // ----- D79: A TELJES KIOSZTÁS-LISTA (ha kértük): a fej kiosztás-gyökerét adja? van-e benne nem pozitív levél? -----
    if (q.k === 1 && Array.isArray(a.k) && a.k.length <= LISTA_KORLAT && fej.lancGyoker?.kiosztas) {
      const fa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
      const lattuk = new Set();
      let jo = true;
      for (const t of a.k) {
        if (!Array.isArray(t) || typeof t[0] !== 'string' || !AZONOSITO_MINTA.test(t[0]) || !Number.isSafeInteger(t[1])
          || lattuk.has(t[0])) { jo = false; break; }
        lattuk.add(t[0]);
        await allapotBeallitas(fa, t[0], null, [t[1]]);
      }
      if (jo && azonosOsszegzes(await allapotGyokere(fa), fej.lancGyoker.kiosztas)) {
        const negativ = a.k.find((t) => t[1] <= 0);
        if (negativ) {
          const adat = { kit: q.sz, fajta: 'negativ', vadpont: fej.sorszam, esemeny: fej, kulcs: negativ[0],
            bizonyitek: await allapotBizonyitek(fa, negativ[0]) };
          if ((await ellentmondasEllenorzese(adat, koino)).rendben) leletek.push(adat);
        }
      }
    }

    // ----- AZ ÁLLÁS: a fej gyökere akkor lesz az ellenőrzött, ha a fejet a szerző megerősítette -----
    let ok = new Set(st.ok);
    let gy = st.gy, fejAz = st.fej;
    if (fejRendben) {
      if (st.gy && !azonosOsszegzes(st.gy, R) && !kovetkezetes) ok = new Set();   // a régi ellenőrzések nem öröklődnek
      gy = R;
      fejAz = q.f;
      ok.add(q.f);
    }
    for (const az of igazoltak) ok.add(az);
    igazolt += igazoltak.length + (fejRendben ? 1 : 0);
    const { lanc } = await szerzoNalam(tar, koino, q.sz);
    const maradt = lanc.some((e) => !ok.has(e.azonosito) && (!gy || e.sorszam <= gy.d + 1));
    if (maradt) fuggo++;
    jegyzek.szerzok[q.sz] = { gy, fej: fejAz, ok: [...ok].slice(-ELLENORZOTT_KORLAT),
      elso: maradt ? (st.elso ?? Date.now()) : null, kerdezve: st.kerdezve, ido: Date.now() };
  }
  await tarolo.ir(lancJegyzekVagasa(jegyzek));
  return { igazolt, leletek, fuggo };
}

// ===================================
// ⭐ A SZERZŐ OLDALA — aki a láncot tartja, felel (D98/4: logaritmikusan)
// ===================================

/**
 * A lánc-kör kiszolgálója. A szerző láncát a tárból olvassa (hézag és elágazás nélkül — ha nem ép, nem felel), a levelek
 * összegzését és a részfa-gyorsítótárat szerzőnként a folyamat memóriájában tartja (a lánc csak nő).
 * @param {{tar: Object, koino: string}} k
 * @returns {{valasz: (kerdesek: Array<Object>) => Promise<Array<Object>>}}
 */
export function lancKiszolgalo({ tar, koino }) {
  const emlek = new Map();                   // szerző → { ids: [...], levelek: [...], memo: Map } (a legutóbb kérdezett lánc)
  const MEMORIA_SZERZOK = 32;

  /**
   * A lánc, amire a kérdés vonatkozik: ha a kérdezett FEJ nálam van, a tőle `elozo` mutatókon visszafelé járt lánc (a fej
   * aláírása ezt köti el — akkor is, ha nálam a szerzőnek más ága is van); ha nincs nálam, a szerző nálam lévő EGYETLEN
   * lánca (hézag és elágazás nélkül). Null, ha egyik sem áll elő.
   * @returns {Promise<{lanc: Array<Object>, fejNalam: boolean}|null>}
   */
  async function lancFejtol(sz, d, fejAz) {
    const fej = await tar.esemeny(fejAz);
    if (fej && fej.szerzo === sz && fej.koino === koino && fej.sorszam === d + 1) {
      const lanc = new Array(d + 1);
      lanc[d] = fej;
      let jo = true;
      for (let s = d; s >= 1; s--) {
        const e = await tar.esemeny(lanc[s].elozo);
        if (!e || e.szerzo !== sz || e.koino !== koino || e.sorszam !== s) { jo = false; break; }
        lanc[s - 1] = e;
      }
      if (jo && (lanc[0].elozo ?? null) === null) return { lanc, fejNalam: true };
    }
    const lanc = [];
    let elozo = null;
    for (let s = 1; s <= d + 1; s++) {
      const ott = (await tar.sorszamSzerint(sz, s)).filter((e) => e.koino === koino);
      if (ott.length !== 1 || (ott[0].elozo ?? null) !== elozo) {
        // a d+1. (a fej helye) hiányozhat: a fát akkor is felépítjük, csak a fejről nem mondunk semmit
        if (s === d + 1 && ott.length === 0) return { lanc, fejNalam: false };
        return null;
      }
      lanc.push(ott[0]);
      elozo = ott[0].azonosito;
    }
    return { lanc, fejNalam: false };
  }

  /** A lánc első d levelének összegzése és a részfa-gyorsítótár (szerzőnként, amíg a lánc eleje ugyanaz). */
  async function levelei(sz, lanc, d) {
    let m = emlek.get(sz);
    if (!m || m.ids.some((az, i) => i < d && lanc[i].azonosito !== az)) m = { ids: [], levelek: [], memo: new Map() };
    if (m.ids.length > d) { m.ids.length = d; m.levelek.length = d; m.memo = new Map(); }
    for (let i = m.ids.length; i < d; i++) {
      m.ids.push(lanc[i].azonosito);
      m.levelek.push(await levelOsszegzes(NAPLO_FAJTA, lanc[i].azonosito));
    }
    emlek.delete(sz);
    emlek.set(sz, m);
    while (emlek.size > MEMORIA_SZERZOK) emlek.delete(emlek.keys().next().value);
    return { levelek: m.levelek.slice(0, d), memo: m.memo };
  }

  return {
    async valasz(kerdesek) {
      const ki = [];
      for (const nyers of Array.isArray(kerdesek) ? kerdesek.slice(0, LANC_SZERZO_KORLAT) : []) {
        const q = lancKerdesAlakja(nyers);
        if (!q) continue;
        const l = await lancFejtol(q.sz, q.d, q.f);
        if (!l) continue;                                    // nem tartom épen: nem felelek (nem tudom)
        const { levelek, memo } = await levelei(q.sz, l.lanc, q.d);
        // ⭐ A fej: ha nálam van, a lánca az övé (1); ha a saját láncomon a d+1. helyen MÁS esemény áll, azt adom (a két
        // azonos sorszámú esemény a kérdezőnél elágazás-bizonyíték); ha a helye üres, nem mondok semmit (null).
        const enyem = l.lanc[q.d] ?? null;
        const v = { sz: q.sz, d: q.d, f: l.fejNalam || enyem?.azonosito === q.f ? 1 : enyem, i: [] };
        for (const [s, az] of q.i) {
          const ott = l.lanc[s - 1];
          v.i.push(ott.azonosito === az ? { s, ut: (await naploBizonyitek(NAPLO_FAJTA, levelek, s - 1, 0, memo)).ut } : { s, e: ott });
        }
        if (q.r) v.c = (await naploKovetkezetesseg(NAPLO_FAJTA, levelek, q.r, 0, memo)).ut;
        if (q.k === 1) {
          const a = await lancAllapotaLancbol(l.lanc.slice(0, q.d));
          const lista = a ? allapotLista(a.kiosztasFa) : null;
          if (lista && lista.length <= LISTA_KORLAT) v.k = lista.map((t) => [t.kulcs, t.osszegek[0]]);
        }
        ki.push(v);
      }
      return ki;
    }
  };
}

// ===================================
// A TÁROLÓ — memóriában (a próbáknak); a fájlos párja a `fajlTar.js` `lancEllenorzesTarolo`-ja (`lancellenorzes.json`)
// ===================================

/** @returns {{olvas: Function, ir: Function}} */
export function memoriaLancTarolo() {
  let adat = { szerzok: {}, tarsak: {} };
  return {
    async olvas() { return JSON.parse(JSON.stringify(adat)); },
    async ir(uj) { adat = lancJegyzekVagasa(uj); }
  };
}

/** A jegyzék korlátai: legfeljebb `LANC_EMLEKEZET_KORLAT` szerző és ugyanennyi társ (a legrégebben frissített esik ki). */
export function lancJegyzekVagasa(j) {
  const vag = (o) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {})
    .sort((a, b) => (b[1]?.ido ?? 0) - (a[1]?.ido ?? 0)).slice(0, LANC_EMLEKEZET_KORLAT));
  return { szerzok: vag(j?.szerzok), tarsak: vag(j?.tarsak) };
}

/**
 * A társ bemondott szerzői kulcsa (a lánc-kör `en`-je) a tábla-aláírója alatt — a következő cserén őt kérdezzük a saját
 * láncáról. ⚠️ Nem bizalom: a válasz úgyis önmagát igazolja; legfeljebb rossz helyen kérdezünk.
 */
export async function lancTarsFeljegyzese(tarolo, alairo, szerzo) {
  if (typeof alairo !== 'string' || typeof szerzo !== 'string' || !AZONOSITO_MINTA.test(szerzo)) return;
  const j = lancJegyzekVagasa(await tarolo.olvas());
  if (j.tarsak[alairo]?.sz === szerzo) return;
  j.tarsak[alairo] = { sz: szerzo, ido: Date.now() };
  await tarolo.ir(lancJegyzekVagasa(j));
}

/** A társ (tábla-aláíró) ismert szerzői kulcsa, vagy null. */
export async function lancTarsSzerzoje(tarolo, alairo) {
  const x = (await tarolo.olvas())?.tarsak?.[alairo];
  return typeof x?.sz === 'string' ? x.sz : null;
}

/**
 * ⭐ A LÁNC-ELLENŐRZÉS ÁLLÁSA (a kiíráshoz): szerzőnként ellenőrizve-e, és ha függ, mióta. ⚠️ A függés nem vád (D19).
 * @returns {Promise<Array<{szerzo: string, ellenorzott: number|null, fuggoOta: number|null, kerdezve: number}>>}
 */
export async function lancEllenorzesAllasa(tarolo) {
  const j = lancJegyzekVagasa(await tarolo.olvas());
  return Object.entries(j.szerzok).map(([sz, x]) => {
    const st = allasAlakja(x);
    return { szerzo: sz, ellenorzott: st.gy ? st.gy.d : null, fuggoOta: st.elso, kerdezve: st.kerdezve };
  });
}

