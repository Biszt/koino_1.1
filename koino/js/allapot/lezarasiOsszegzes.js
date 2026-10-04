// koino/js/allapot/lezarasiOsszegzes.js

// Felelősség: D95/1 — A LEZÁRÁSI ÖSSZEGZÉS: egy NAGY szeletű érintett döntésének ellenőrizhető átadása annak, aki a
// szeletet csak összegezve tartja (a két fokú vállalás — a skálázási terv 4.6, a B1 műszaki terve 2.). Hálózat nélkül
// (1. szabály): épít, mintát ad, ellenőriz; hogy min utazik, az a csere dolga.
//
// ===== MIÉRT KELL =====
//
// A döntés (`javaslatSzamitas.js`) időrendben „visszajátssza” az érintett szeletét a lezárásig: a tulajdonosok
// változását (a nevező), az érték javaslatokat (a küszöbök mediánja) és a szavazatokat. A nagy szelet összegző tartója a
// nyers eseményeket nem tartja (egymillió tagnál egy népszerű gondolaté százezres), tehát ezt nem tudja megtenni. ⭐ Ezért
// aki a teljes szeletet tartja, a lezáráskori PILLANATKÉPBŐL (`lezarasiPillanatkep`) összegzést épít: a végső számok, a
// küszöbök, a lezárás ideje — és három fa gyökere:
//
//   · a SZAVAZAT-fa — a beszámított szavazatok ('v:' + szerző → a szavazat; az összegek: támogat · ellenez · tartózkodik);
//   · a NEVEZŐ-fa — az aktív tulajdonosok ∪ a szavazók ('n:' + szerző → a pont-esemény vagy a szavazat; az összeg: 1);
//   · az ÉRTÉK-naplók — küszöbönként az érték javaslatok érték szerint RENDEZVE (a medián a középső index — a helyét a
//     napló-bizonyíték adja).
//
// Az összegző tartó a számokból UGYANAZZAL a képlettel (`allasSzamokbol`) újraszámolja az állást és a határidőt, és a gyökér
// bemondása UTÁN mintát sorsol mindhárom fából (`lezarasiMintaHelyek` — kriptográfiai véletlen, az ellenőrzőé); minden
// minta aláírt esemény, ami a levéllel egyezik, a lezárás előtti, jogosult, és tagtól jött. Ha a számok és a minták
// egyeznek, a rész eredménye az övé — és tárolva marad (a döntéshez nincs élő lekérdezés). ⚠️ Az ELHALLGATÁST (egy kihagyott,
// érvényes szavazat) a kihagyott szavazó veszi észre: a saját aláírt szavazata és a szavazat-fa hiány-bizonyítéka
// (`kimaradtSzavazat`) — a skálázási terv 4.6 elve: *aki kimarad, pontosan az, aki észreveszi.*
//
// ⚠️ A határai, kimondva: (1) egy tulajdonos-levél régi, de aláírt pont-esemény is lehet (a frissességet csak a teljes lánc
// mutatná — ugyanaz a korlát, mint az össz-pontnál, D92/5); (2) egy érték javaslat szerzőjének pontját a lezáráskor nem
// bizonyítjuk; (3) a régi (lánc-gyökér nélküli) szavazat jogosultsága a pont-eseményekből jött — ilyen mintánál a jog
// „nem ellenőrizhető”, nem hiba. Ezek mind a mintavétel valószínűségi biztonságát tompítják, nem törik.
//
// Használják: a döntés-számítás (a nagy szeletű rész — a bekötés a következő lépés), a csere (a minták), a próbák.

import { randomInt } from 'node:crypto';
import {
  ujAllapotFa, allapotBeallitas, allapotGyokere, allapotBizonyitek, allapotBizonyitekEllenorzese,
  allapotSulyozottKeresese, allapotSulyozottEllenorzese, levelOsszegzes, naploGyokere, naploBizonyitek,
  naploBizonyitekEllenorzese, osszegzesAlakja
} from '../esemeny/osszegzoFa.js';
import { esemenyEllenorzese } from '../esemeny/esemeny.js';
import { lezarasiPillanatkep, allasSzamokbol, ALAP_KUSZOBOK, KUSZOB_NEVEK } from './javaslatSzamitas.js';
import { szavazatSajatPontjai, javaslatEntitasai } from './szabalyok.js';

export const LEZARASI_OSSZEGZES = 'LezarasiOsszegzes';
export const SZAVAZAT_FA = 'lezaras-szavazat';
export const NEVEZO_FA = 'lezaras-nevezo';
export const ERTEK_NAPLO = 'lezaras-ertek';
/** Fánként ennyi minta (a 67. mérés: k = 8-cal ~60–70 KB döntésenként). */
export const LEZARASI_MINTA = 8;
/** Egy válaszban legfeljebb ennyi minta fánként (a kérő kérése felülről korlátos). */
export const LEZARASI_MINTA_KORLAT = 32;

const SZAVAZAT_SORREND = ['Tamogat', 'Ellenez', 'Tartozkodik'];
const kozepe = (n) => Math.floor((n - 1) / 2);         // ugyanaz, mint a `median` (az alsó középső elem)

// ===================================
// AZ ÉPÍTÉS — a teljes tartónál
// ===================================

/**
 * A lezárási összegzés egy javaslat egy érintettjéről, a teljes bemenetből.
 * @param {Array<Object>} esemenyek - a számító események (a javaslat, a szavazatai, az érintett pont- és érték-eseményei)
 * @param {Object} javaslatEsemeny
 * @param {string} entitas - az érintett (a rész)
 * @returns {Promise<null|{osszegzes: Object, epito: Object}>} az `epito` a minták kiszolgálásához kell
 */
export async function lezarasiOsszegzesEpitese(esemenyek, javaslatEsemeny, entitas) {
  const pk = lezarasiPillanatkep(esemenyek, javaslatEsemeny);
  const p = pk.pillanatkepek.get(entitas);
  const resz = pk.reszek.find((r) => r.entitas === entitas);
  if (!p || !resz) return null;

  const szavazatFa = ujAllapotFa(SZAVAZAT_FA, 3);
  for (const x of p.szavazatok) {
    await allapotBeallitas(szavazatFa, 'v:' + x.szerzo, x.azonosito, SZAVAZAT_SORREND.map((t) => (t === x.szavazat ? 1 : 0)));
  }
  const nevezoFa = ujAllapotFa(NEVEZO_FA, 1);
  for (const x of p.nevezo) await allapotBeallitas(nevezoFa, 'n:' + x.szerzo, { e: x.azonosito, t: x.tulajdonos ? 1 : 0 }, [1]);
  const naplok = {};
  for (const nev of KUSZOB_NEVEK) {
    const lista = p.ertekJavaslatok.filter((x) => Number.isInteger(x.ertekek?.[nev]))
      .map((x) => ({ szerzo: x.szerzo, azonosito: x.azonosito, ertek: x.ertekek[nev] }))
      .sort((a, b) => a.ertek - b.ertek || (a.azonosito < b.azonosito ? -1 : 1));
    const levelek = [];
    for (const x of lista) levelek.push(await levelOsszegzes(ERTEK_NAPLO, x.azonosito, null, [x.ertek]));
    naplok[nev] = { lista, levelek, gyoker: await naploGyokere(ERTEK_NAPLO, levelek, 1) };
  }

  const osszegzes = {
    javaslat: javaslatEsemeny.azonosito,
    entitas,
    lezaras: pk.lezarasIdeje,
    reszLezaras: resz.allas.lezarasIdeje,
    szamok: { tamogatok: resz.allas.tamogatok, ellenzok: resz.allas.ellenzok, tartozkodok: resz.allas.tartozkodok,
      nevezo: resz.allas.nevezo },
    kuszobok: { ...resz.kuszobok },
    kulonvalok: { ellenzok: [...resz.kulonvalok.ellenzok], tamogatok: [...resz.kulonvalok.tamogatok] },
    fak: {
      szavazat: await allapotGyokere(szavazatFa),
      nevezo: await allapotGyokere(nevezoFa),
      ertek: Object.fromEntries(KUSZOB_NEVEK.map((n) => [n, naplok[n].gyoker]))
    }
  };
  return { osszegzes, epito: { szavazatFa, nevezoFa, naplok, pillanatkep: p } };
}

// ===================================
// A MINTÁK — az ellenőrző sorsol, a teljes tartó felel
// ===================================

/**
 * A minta-helyek (az ELLENŐRZŐ sorsolja, a gyökér bemondása UTÁN): a szavazat-fából (a három fajta együtt, egyenletesen),
 * a nevező-fából, és küszöbönként a rendezett naplóból — a medián helye MINDIG, mellé k véletlen index.
 */
export function lezarasiMintaHelyek(osszegzes, k = LEZARASI_MINTA) {
  const db = Math.max(0, Math.min(LEZARASI_MINTA_KORLAT, k));
  const sz = osszegzes.szamok;
  const szavazok = sz.tamogatok + sz.ellenzok + sz.tartozkodok;
  const szavazat = [];
  for (let j = 0; j < (szavazok > 0 ? db : 0); j++) {
    let r = randomInt(szavazok);
    let i = 0;
    for (const n of [sz.tamogatok, sz.ellenzok, sz.tartozkodok]) { if (r < n) break; r -= n; i++; }
    szavazat.push({ r, i });
  }
  const nevezo = sz.nevezo > 0 ? Array.from({ length: db }, () => randomInt(sz.nevezo)) : [];
  const ertek = {};
  for (const nev of KUSZOB_NEVEK) {
    const n = osszegzes.fak.ertek[nev].d;
    ertek[nev] = n > 0 ? [kozepe(n), ...Array.from({ length: db }, () => randomInt(n))] : [];
  }
  return { szavazat, nevezo, ertek };
}

/**
 * A TELJES TARTÓ válasza a minta-helyekre: a levelek bizonyítéka és az aláírt események.
 * @param {Object} epito - a `lezarasiOsszegzesEpitese` építője
 * @param {Object} helyek - a `lezarasiMintaHelyek` (az ellenőrzőtől)
 * @param {Function} esemenyOlvas - async (azonosító) → esemény
 */
export async function lezarasiMintakValasza(epito, helyek, esemenyOlvas) {
  const vag = (lista) => (Array.isArray(lista) ? lista.slice(0, LEZARASI_MINTA_KORLAT) : []);
  const valasz = { szavazat: [], nevezo: [], ertek: {} };
  for (const h of vag(helyek?.szavazat)) {
    const m = await allapotSulyozottKeresese(epito.szavazatFa, h?.r, h?.i);
    const x = m && epito.pillanatkep.szavazatok.find((s) => 'v:' + s.szerzo === m.kulcs);
    valasz.szavazat.push(m ? { ...h, kulcs: m.kulcs, bizonyitek: m.bizonyitek, esemeny: x ? await esemenyOlvas(x.azonosito) : null } : null);
  }
  for (const r of vag(helyek?.nevezo)) {
    const m = await allapotSulyozottKeresese(epito.nevezoFa, r, 0);
    const x = m && epito.pillanatkep.nevezo.find((s) => 'n:' + s.szerzo === m.kulcs);
    valasz.nevezo.push(m ? { r, kulcs: m.kulcs, bizonyitek: m.bizonyitek, esemeny: x ? await esemenyOlvas(x.azonosito) : null } : null);
  }
  for (const nev of KUSZOB_NEVEK) {
    const napl = epito.naplok[nev];
    valasz.ertek[nev] = [];
    for (const index of vag(helyek?.ertek?.[nev])) {
      if (!Number.isSafeInteger(index) || index < 0 || index >= napl.levelek.length) { valasz.ertek[nev].push(null); continue; }
      valasz.ertek[nev].push({ index, bizonyitek: await naploBizonyitek(ERTEK_NAPLO, napl.levelek, index, 1),
        esemeny: await esemenyOlvas(napl.lista[index].azonosito) });
    }
  }
  return valasz;
}

// ===================================
// AZ ELLENŐRZÉS — az összegző tartónál
// ===================================

/** Az összegzés alakja (a kapu is ezt hívja — a tartalmat a minták ellenőrzik). */
export function lezarasiOsszegzesAlakja(o) {
  const egesz = (x) => Number.isSafeInteger(x) && x >= 0;
  if (!o || typeof o !== 'object') return false;
  if (typeof o.javaslat !== 'string' || typeof o.entitas !== 'string') return false;
  if (!egesz(o.lezaras) || !egesz(o.reszLezaras) || o.lezaras < o.reszLezaras) return false;
  const sz = o.szamok;
  if (!sz || ![sz.tamogatok, sz.ellenzok, sz.tartozkodok, sz.nevezo].every(egesz)) return false;
  if (!o.kuszobok || !KUSZOB_NEVEK.every((n) => Number.isFinite(o.kuszobok[n]))) return false;
  const kv = o.kulonvalok;
  if (!kv || !Array.isArray(kv.ellenzok) || !Array.isArray(kv.tamogatok)) return false;
  const f = o.fak;
  if (!f || !osszegzesAlakja(f.szavazat, 3) || !osszegzesAlakja(f.nevezo, 1) || !f.ertek) return false;
  return KUSZOB_NEVEK.every((n) => osszegzesAlakja(f.ertek[n], 1));
}

/**
 * A számok önmagukban: a gyökerek összegei egyeznek a számokkal, és a számokból UGYANAZZAL a képlettel a rész határideje
 * jön ki. Ha rendben, az állást is visszaadja (a döntés-számításnak).
 * @returns {{rendben: boolean, ok?: string, allas?: Object}}
 */
export function lezarasiSzamokEllenorzese(o, javaslatEsemeny) {
  if (!lezarasiOsszegzesAlakja(o)) return { rendben: false, ok: 'hibás összegzés' };
  if (o.javaslat !== javaslatEsemeny?.azonosito) return { rendben: false, ok: 'más javaslatról szól' };
  const sz = o.szamok;
  const [t, e, tz] = o.fak.szavazat.o;
  if (t !== sz.tamogatok || e !== sz.ellenzok || tz !== sz.tartozkodok) return { rendben: false, ok: 'a szavazat-fa mást számol' };
  if (o.fak.nevezo.d !== sz.nevezo || o.fak.nevezo.o[0] !== sz.nevezo) return { rendben: false, ok: 'a nevező-fa mást számol' };
  if (sz.nevezo < sz.tamogatok + sz.ellenzok + sz.tartozkodok) return { rendben: false, ok: 'a nevező kisebb a szavazóknál' };
  for (const nev of KUSZOB_NEVEK) {
    if (o.fak.ertek[nev].d === 0 && o.kuszobok[nev] !== ALAP_KUSZOBOK[nev]) return { rendben: false, ok: 'üres naplóhoz nem alapérték' };
  }
  const allas = allasSzamokbol(javaslatEsemeny, sz, sz.nevezo, o.kuszobok);
  if (allas.lezarasIdeje !== o.reszLezaras) return { rendben: false, ok: 'a határidő nem a számokból jön' };
  return { rendben: true, allas };
}

/**
 * ⭐ AZ ELLENŐRZÉS: a számok (`lezarasiSzamokEllenorzese`), és minden kért mintára jött-e válasz, a bizonyíték a gyökérhez
 * tartozik-e, és az aláírt esemény a levéllel egyezik-e, a lezárás előtti-e, jogosult-e, és a szerzője tag-e.
 * ⛔ Egyetlen hamis minta az egészet elveti; ami nem ellenőrizhető (hiányzó tagság, régi szavazat), azt megszámolja.
 *
 * @param {Object} b
 * @param {Object} b.osszegzes
 * @param {Object} b.javaslatEsemeny
 * @param {Object} b.helyek - amit az ellenőrző sorsolt
 * @param {Object} b.mintak - a teljes tartó válasza
 * @param {Function} [b.tagE] - async (szerző) → true | false | null (nem ellenőrizhető)
 * @returns {Promise<{rendben: boolean, ok?: string, allas?: Object, ellenorzott: number, nemEllenorizheto: number}>}
 */
export async function lezarasiOsszegzesEllenorzese({ osszegzes: o, javaslatEsemeny, helyek, mintak, tagE = async () => null }) {
  const ered = { rendben: true, ellenorzott: 0, nemEllenorizheto: 0 };
  const hiba = (ok) => ({ ...ered, rendben: false, ok });
  const szamok = lezarasiSzamokEllenorzese(o, javaslatEsemeny);
  if (!szamok.rendben) return hiba(szamok.ok);
  const reszJavaslata = javaslatEntitasai(javaslatEsemeny).find((je) => je.resz?.entitas === o.entitas)?.azonosito;
  const tagsag = async (szerzo) => {
    const t = await tagE(szerzo);
    if (t === false) return false;
    if (t !== true) ered.nemEllenorizheto++;
    return true;
  };
  const hiteles = async (e) => (await esemenyEllenorzese(e)).rendben;

  // ----- A SZAVAZATOK -----
  const szH = Array.isArray(helyek?.szavazat) ? helyek.szavazat : [];
  if (!Array.isArray(mintak?.szavazat) || mintak.szavazat.length !== szH.length) return hiba('nem minden szavazat-helyre jött minta');
  for (let j = 0; j < szH.length; j++) {
    const m = mintak.szavazat[j];
    if (!m || m.r !== szH[j].r || m.i !== szH[j].i || typeof m.kulcs !== 'string') return hiba('a szavazat-minta nem a kért helyre szól');
    const v = await allapotSulyozottEllenorzese(SZAVAZAT_FA, 3, o.fak.szavazat, m.kulcs, m.bizonyitek, m.r, m.i);
    if (!v.rendben) return hiba('hamis szavazat-minta: ' + v.ok);
    const e = m.esemeny;
    const szerzo = m.kulcs.slice(2);
    if (!e || e.azonosito !== v.ertek || e.tipus !== 'Szavazat' || e.szerzo !== szerzo || e.adat?.javaslat !== o.javaslat
        || e.adat?.szavazat !== SZAVAZAT_SORREND[m.i] || v.osszegek[m.i] !== 1) return hiba('a szavazat mást mond, mint a levél');
    if (!(e.ido <= o.lezaras)) return hiba('a lezárás utáni szavazat a fában');
    if (!(await hiteles(e))) return hiba('a szavazat nem hiteles');
    const sajat = szavazatSajatPontjai(e);
    if (sajat) {
      if ((sajat.get(o.entitas) ?? 0) <= 0 || (reszJavaslata && (sajat.get(reszJavaslata) ?? 0) <= 0)) {
        return hiba('jogosulatlan szavazat a fában');
      }
    } else ered.nemEllenorizheto++;
    if (!(await tagsag(szerzo))) return hiba('nem tag szavazata a fában');
    ered.ellenorzott++;
  }

  // ----- A NEVEZŐ -----
  const nH = Array.isArray(helyek?.nevezo) ? helyek.nevezo : [];
  if (!Array.isArray(mintak?.nevezo) || mintak.nevezo.length !== nH.length) return hiba('nem minden nevező-helyre jött minta');
  for (let j = 0; j < nH.length; j++) {
    const m = mintak.nevezo[j];
    if (!m || m.r !== nH[j] || typeof m.kulcs !== 'string') return hiba('a nevező-minta nem a kért helyre szól');
    const v = await allapotSulyozottEllenorzese(NEVEZO_FA, 1, o.fak.nevezo, m.kulcs, m.bizonyitek, m.r, 0);
    if (!v.rendben) return hiba('hamis nevező-minta: ' + v.ok);
    const e = m.esemeny;
    const szerzo = m.kulcs.slice(2);
    if (!e || e.azonosito !== v.ertek?.e || e.szerzo !== szerzo || !(e.ido <= o.lezaras)) return hiba('a nevező tagja mást mond, mint a levél');
    if (v.ertek?.t === 1) {
      if (e.tipus !== 'TudatpontRendezes' || e.adat?.entitas !== o.entitas || !(e.adat?.pont > 0) || e.adat?.szerep === 'passziv') {
        return hiba('a nevezőben nem aktív tulajdonos');
      }
    } else if (e.tipus !== 'Szavazat' || e.adat?.javaslat !== o.javaslat) return hiba('a nevezőben se tulajdonos, se szavazó');
    if (!(await hiteles(e))) return hiba('a nevező eseménye nem hiteles');
    if (!(await tagsag(szerzo))) return hiba('nem tag a nevezőben');
    ered.ellenorzott++;
  }

  // ----- A KÜSZÖBÖK (a rendezett naplók) -----
  for (const nev of KUSZOB_NEVEK) {
    const gyoker = o.fak.ertek[nev];
    const h = Array.isArray(helyek?.ertek?.[nev]) ? helyek.ertek[nev] : [];
    const ms = mintak?.ertek?.[nev];
    if (!Array.isArray(ms) || ms.length !== h.length) return hiba('nem minden küszöb-helyre jött minta');
    if (gyoker.d > 0 && h[0] !== kozepe(gyoker.d)) return hiba('a medián helye nincs a kért helyek közt');
    for (let j = 0; j < h.length; j++) {
      const m = ms[j];
      const e = m?.esemeny;
      if (!m || m.index !== h[j] || !e || e.tipus !== 'ErtekJavaslat' || e.adat?.entitas !== o.entitas || !(e.ido <= o.lezaras)) {
        return hiba('a küszöb-minta nem a kért helyre szól');
      }
      const ertek = e.adat?.ertekek?.[nev];
      if (!Number.isInteger(ertek)) return hiba('a küszöb-minta értéke hiányzik');
      const level = await levelOsszegzes(ERTEK_NAPLO, e.azonosito, null, [ertek]);
      if (!(await naploBizonyitekEllenorzese(ERTEK_NAPLO, level, m.bizonyitek, gyoker, 1))) return hiba('hamis küszöb-minta');
      const kozep = kozepe(gyoker.d);
      if ((m.index < kozep && ertek > o.kuszobok[nev]) || (m.index > kozep && ertek < o.kuszobok[nev])
          || (m.index === kozep && ertek !== o.kuszobok[nev])) return hiba('a medián nem a rendezett sor közepén áll');
      if (!(await hiteles(e))) return hiba('az érték javaslat nem hiteles');
      if (!(await tagsag(e.szerzo))) return hiba('nem tag érték javaslata');
      ered.ellenorzott++;
    }
  }
  return { ...ered, allas: szamok.allas };
}

/**
 * ⭐ AZ ELHALLGATÁS BIZONYÍTÉKA: egy érvényes, a lezárás előtti, jogosult szavazat, ami NINCS a szavazat-fában (a fa
 * hiány-bizonyítéka). Ha igaz, az összegzés hamis — az összegző tartó elveti. A kihagyott szavazó maga állítja elő
 * (a saját szavazata és a fa bizonyítéka a teljes tartótól).
 * @returns {Promise<boolean>}
 */
export async function kimaradtSzavazat(o, javaslatEsemeny, szavazat, hianyBizonyitek) {
  if (!lezarasiOsszegzesAlakja(o) || szavazat?.tipus !== 'Szavazat' || szavazat.adat?.javaslat !== o.javaslat) return false;
  if (!(szavazat.ido <= o.lezaras) || !(await esemenyEllenorzese(szavazat)).rendben) return false;
  const sajat = szavazatSajatPontjai(szavazat);
  const reszJavaslata = javaslatEntitasai(javaslatEsemeny).find((je) => je.resz?.entitas === o.entitas)?.azonosito;
  if (!sajat || (sajat.get(o.entitas) ?? 0) <= 0 || (reszJavaslata && (sajat.get(reszJavaslata) ?? 0) <= 0)) return false;
  const e = await allapotBizonyitekEllenorzese(SZAVAZAT_FA, 3, o.fak.szavazat, 'v:' + szavazat.szerzo, hianyBizonyitek);
  return e.rendben === true && e.van === false;
}

/** A teljes tartónál: egy szerző hiány-bizonyítéka a szavazat-fából (a kimaradt szavazó kéri). */
export async function szavazatFaBizonyitek(epito, szerzo) {
  return allapotBizonyitek(epito.szavazatFa, 'v:' + szerzo);
}
