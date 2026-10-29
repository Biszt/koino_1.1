// koino/meres/fajlIgenyProba.js — MELY FÁJLOKRA VAN SZÜKSÉGEM? (a szállítás első fele)

// Mit bizonyít ez a lap?
//
// ⭐⭐ HOGY A FELDERÍTÉS NEM KÍVÁN ÚJ ADATOT. Csaba terve szerint *„az eseményekből a buli
// alkalmával megtudják a készülékek, hogy kinek mire van szüksége"* — és tényleg: a
// gondolat szövegében ott a kép-hivatkozás, a besorolásban az ikon. Ez a réteg csak
// **összeveti** azzal, ami a lemezen megvan.
//
// ⛔⛔ ÉS HOGY A TUDATPONT TÁROLÁSI VÁLLALÁS (D3). A válasz nem egy lista, hanem **két**:
// amit vállaltam (pontot tettem rá), és ami csak „arra jár". Enélkül a felderítés azt
// jelentené: *„add ide a koino összes képét"* — épp az az alak, amit a 9. szabály tilt.

import { fajlIgenyek, entitasFajljai, lenyomatUrlbol } from '../js/allapot/fajlIgeny.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FÁJL-IGÉNY — mire van szükségem? (5.7)');

const L1 = 'A'.repeat(43);
const L2 = 'B'.repeat(43);
const L3 = 'C'.repeat(43);

/** Kézzel épített állapot — a számítás itt nem érdekes, csak az entitások alakja. */
function allapotbol(entitasok) {
  return { entitasok: new Map(entitasok.map((e) => [e.azonosito, e])) };
}

/** Egy entitás, a tudatpont-térképpel. */
function entitas(azonosito, mezok = {}, pontok = {}) {
  return {
    azonosito,
    cim: mezok.cim ?? azonosito,
    ikon: mezok.ikon ?? null,
    szoveg: mezok.szoveg ?? null,
    hozzajarulok: new Map(Object.entries(pontok).map(([k, p]) => [k, { pont: p }]))
  };
}

const kep = (lenyomat) => ({ id: 'b', tipus: 'kep', url: '/api/fajl/' + lenyomat });

// ===================================
// 1. A HIVATKOZÁSOK KIOLVASÁSA
// ===================================

proba('⭐ A kép-blokk és az IKON is fájl-hivatkozás', async () => {
  const e = entitas('x', { ikon: '/api/fajl/' + L1, szoveg: [kep(L2)] });
  const talalt = entitasFajljai(e);
  return talalt.size === 2 && talalt.has(L1) && talalt.has(L2);
});

proba('⛔⛔ IDEGEN CÍMET NEM veszünk fel — a koino nem hoz be adatot máshonnan (2. szabály)',
  async () => {
    // ⚠️ Egy `https://valahol.example/kep.png` NEM a koino fájlja, és nem is akarjuk
    // letölteni. A szigor itt szándékos.
    return lenyomatUrlbol('https://valahol.example/kep.png') === null
      && lenyomatUrlbol('/api/fajl/' + L1) === L1
      && lenyomatUrlbol('/api/fajl/tulrovid') === null
      && lenyomatUrlbol('/api/fajl/' + L1 + '/../../kulcs.json') === null
      && lenyomatUrlbol(null) === null;
  });

proba('⭐ Az EMOJI ikon nem fájl (5.4: az ikon lehet emoji vagy kép)', async () => {
  return entitasFajljai(entitas('x', { ikon: '🌿' })).size === 0;
});

proba('⭐ A sima SZÖVEG (nem blokk-tömb) nem akasztja meg', async () => {
  return entitasFajljai(entitas('x', { szoveg: 'sima szöveg' })).size === 0;
});

// ===================================
// 2. ⭐ MI HIÁNYZIK?
// ===================================

proba('⭐⭐ A hiányzó fájl MEGNEVEZI, melyik entitáshoz tartozik (D19)', async () => {
  const allapot = allapotbol([
    entitas('g1', { cim: 'Képes gondolat', szoveg: [kep(L1)] })
  ]);
  const { hianyzok, megvan, osszes } = await fajlIgenyek(allapot, async () => false);

  return osszes === 1 && megvan === 0 && hianyzok.length === 1
    && hianyzok[0].lenyomat === L1
    && hianyzok[0].entitasok.length === 1 && hianyzok[0].entitasok[0] === 'g1';
});

proba('⭐⭐ D84/1: a VÁLLALT entitásaim fájljai (a törzs) — megvannak-e vagy sem — külön halmazban; a más gondolatáé nem', async () => {
  const allapot = allapotbol([
    entitas('g1', { szoveg: [kep(L1)] }, { en: 5 }),
    entitas('g2', { szoveg: [kep(L2)] }, { mas: 5 }),
    entitas('g3', { ikon: '/api/fajl/' + L3 }, { en: 0, mas: 3 })
  ]);
  const { vallaltLenyomatok } = await fajlIgenyek(allapot, async (l) => l === L1, { szerzo: 'en' });
  return vallaltLenyomatok.has(L1) && !vallaltLenyomatok.has(L2) && !vallaltLenyomatok.has(L3) && vallaltLenyomatok.size === 1;
});

proba('⭐ Ami megvan, az nem hiányzik', async () => {
  const allapot = allapotbol([entitas('g1', { szoveg: [kep(L1), kep(L2)] })]);
  const { hianyzok, megvan } = await fajlIgenyek(allapot, async (l) => l === L1);
  return megvan === 1 && hianyzok.length === 1 && hianyzok[0].lenyomat === L2;
});

proba('⭐ UGYANAZ a fájl két entitásban EGYSZER szerepel — de mindkettőt megnevezi', async () => {
  const allapot = allapotbol([
    entitas('g1', { szoveg: [kep(L1)] }),
    entitas('g2', { szoveg: [kep(L1)] })
  ]);
  const { hianyzok, osszes } = await fajlIgenyek(allapot, async () => false);
  return osszes === 1 && hianyzok.length === 1 && hianyzok[0].entitasok.length === 2;
});

// ===================================
// 3. ⛔⛔ A TUDATPONT TÁROLÁSI VÁLLALÁS (D3)
// ===================================

proba('⛔⛔ AMIRE PONTOT TETTEM, azt VÁLLALTAM — a többi csak „arra jár"', async () => {
  const en = 'ENKULCSOM';
  const allapot = allapotbol([
    entitas('enyem', { szoveg: [kep(L1)] }, { [en]: 100 }),
    entitas('masé', { szoveg: [kep(L2)] }, { MASIK: 100 })
  ]);

  const { hianyzok } = await fajlIgenyek(allapot, async () => false, { szerzo: en });
  const enyem = hianyzok.find((h) => h.lenyomat === L1);
  const mase = hianyzok.find((h) => h.lenyomat === L2);
  return enyem.vallaltam === true && mase.vallaltam === false;
});

proba('⭐ A VÁLLALTAK ELŐRE kerülnek — és a sorrend determinisztikus', async () => {
  const en = 'ENKULCSOM';
  // ⚠️ Az `L3` (vállalt) ábécében HÁTRÉBB van, mint az L1/L2 — ha a vállalás nem
  // számítana, a végére kerülne. *Enélkül a próba vak lenne.*
  const allapot = allapotbol([
    entitas('a', { szoveg: [kep(L1)] }),
    entitas('b', { szoveg: [kep(L2)] }),
    entitas('c', { szoveg: [kep(L3)] }, { [en]: 50 })
  ]);

  const { hianyzok } = await fajlIgenyek(allapot, async () => false, { szerzo: en });
  return hianyzok[0].lenyomat === L3 && hianyzok[0].vallaltam === true
    // A többi a lenyomat szerint, hogy két készülék UGYANAZT a sorrendet kapja.
    && hianyzok[1].lenyomat === L1 && hianyzok[2].lenyomat === L2;
});

proba('⭐ Ha KÉT entitás hivatkozik rá, és az EGYIKEN van pontom: vállalt', async () => {
  const en = 'ENKULCSOM';
  const allapot = allapotbol([
    entitas('a', { szoveg: [kep(L1)] }),
    entitas('b', { szoveg: [kep(L1)] }, { [en]: 50 })
  ]);
  const { hianyzok } = await fajlIgenyek(allapot, async () => false, { szerzo: en });
  return hianyzok.length === 1 && hianyzok[0].vallaltam === true;
});

proba('⛔ Szerző nélkül SEMMI nem vállalt — nem találunk ki tulajdonost', async () => {
  const allapot = allapotbol([entitas('a', { szoveg: [kep(L1)] }, { VALAKI: 100 })]);
  const { hianyzok } = await fajlIgenyek(allapot, async () => false);
  return hianyzok[0].vallaltam === false;
});

proba('⭐ Fájl nélküli koino: üres válasz, nem hiba', async () => {
  const { hianyzok, megvan, osszes } = await fajlIgenyek(
    allapotbol([entitas('a', { cim: 'Sima gondolat' })]), async () => false);
  return osszes === 0 && megvan === 0 && hianyzok.length === 0;
});

export default futtatas;

// ===================================
// ⭐⭐ D120: A TÖRZS-HATÁR (Csaba ötlete és döntése, 2026-10-29)
// ===================================

const L4 = 'D'.repeat(43);
const L5 = 'E'.repeat(43);
const L6 = 'F'.repeat(43);
const JEGYZEK = 'J'.repeat(43);
const ENGEM = 'en';

/** Egy kártya (koino-verzió) a kódjával — a jegyzékben két fájl. */
function kartya(azonosito, pontok = {}) {
  return { ...entitas(azonosito, {}, pontok), koinoVerzio: { gyermek: 'G'.repeat(43), kod: { lenyomat: JEGYZEK, bajt: 100, torzs: 5100 } } };
}
const kodOlvas = async () => ({ fajlok: [['a.js', L5, 2000], ['b.js', L6, 3000]] });

proba('⭐⭐ D120: a határ mellett a nem vállalt elem korláttal kért, az ismerten nagy csak kérhető; a vállalt, a kért és a szöveg határ nélkül',
  async () => {
    const nem = entitas('nem', { szoveg: { lenyomat: L4, bajt: 50, torzs: 9000 } });
    const vallalt = entitas('val', { szoveg: [kep(L2)] }, { [ENGEM]: 10 });
    const nagyos = entitas('nagy', { szoveg: [kep(L3)] });
    const kertes = entitas('kert', { szoveg: [kep(L1)] });
    const allapot = allapotbol([nem, vallalt, nagyos, kertes]);
    const nagyok = new Map([[L3, 4000], [L1, 6000]]);
    const r = await fajlIgenyek(allapot, async () => false, { szerzo: ENGEM, hatar: 1000, nagyok, kertek: new Set([L1]) });
    const h = new Map(r.hianyzok.map((x) => [x.lenyomat, x]));
    return h.has(L4) && h.get(L4).korlat === undefined                 // a szöveg-darab mindig, határ nélkül
      && h.has(L2) && h.get(L2).korlat === undefined                    // vállalt: határ nélkül
      && !h.has(L3) && r.kerhetok.some((k) => k.elem === L3 && k.meret === 4000)   // ismerten nagy: csak kérhető
      && h.has(L1) && h.get(L1).korlat === undefined                    // kért: határ nélkül (a nagysága ellenére)
      // határ nélkül (a régi hívó) minden igény, korlát nélkül
      && (await fajlIgenyek(allapot, async () => false, { szerzo: ENGEM })).hianyzok.every((x) => x.korlat === undefined);
  });

proba('⭐⭐ D120: a kártya kód-csomagja EGY elem — a jegyzék mindig, a fájljai csak a vállalónak és a kérőnek (a méretével kérhető)',
  async () => {
    const megvanE = async (l) => l === JEGYZEK;   // a jegyzék már megjött
    const nem = await fajlIgenyek(allapotbol([kartya('k1')]), megvanE, { szerzo: ENGEM, hatar: 1000, kodOlvas });
    const val = await fajlIgenyek(allapotbol([kartya('k1', { [ENGEM]: 5 })]), megvanE, { szerzo: ENGEM, hatar: 1000, kodOlvas });
    const kert = await fajlIgenyek(allapotbol([kartya('k1')]), megvanE,
      { szerzo: ENGEM, hatar: 1000, kodOlvas, kertek: new Set(['kod:k1']) });
    const lenyomatok = (r) => r.hianyzok.map((x) => x.lenyomat).sort().join();
    const kerheto = nem.kerhetok.find((k) => k.kod);
    return lenyomatok(nem) === '' && kerheto?.elem === 'kod:k1' && kerheto.meret === 5100 && kerheto.hianyzik === 2
      && lenyomatok(val) === [L5, L6].sort().join() && val.kerhetok.length === 0
      && lenyomatok(kert) === [L5, L6].sort().join() && kert.hianyzok.every((x) => x.korlat === undefined);
  });

// Önállóan is futtatható: node koino/meres/fajlIgenyProba.js
if (process.argv[1] && process.argv[1].endsWith('fajlIgenyProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
