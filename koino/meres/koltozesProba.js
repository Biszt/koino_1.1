// koino/meres/koltozesProba.js — ⭐⭐ D118 (a költözés ④a): a beköltözés
//
// Azt bizonyítja, hogy a szülő vágáskori tagja a beköltözésével a gyermekbe viszi a súlyát és a tagságát: a beköltözés a
// szülőbeli láncát a vágás előtti utolsó eseménye után folytatja, és a tagsági bizonyítékát hozza; a kapu a koinó és a
// szülő születésével ellenőriz (a nem tagot, a vágás utáni meghívást, a rossz lánc-pontot, a más koinóból jövőt, a hamis
// bizonyítékot elveti — a tagsági csomagba csomagolt hamis beköltözést is); a gyermekben a beköltözés tagsági horgony (D118/3);
// a koinó képe a beköltözésekből tudja, ki költözött (a lánc-pontjával, és ami a költöző elhagyott — KZ3 (A)); és a
// művelet bemondott összege ugyanezt számolja.

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoBemenete } from '../js/tar/esemenyTar.js';
import { koinoKepe } from '../js/allapot/ketReteg.js';
import { tagsagiIndex, szerzoTagsaga, tagsagiLanc, TAGSAGI_CSOMAG } from '../js/allapot/tagsag.js';
import { tudatpontRendezese } from '../js/muveletek.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';

const { proba, futtatas } = probaGyujtemeny('A beköltözés (D118 ④a)');

const NAP = 86400 * 1000;
const T0 = Date.UTC(2026, 0, 1);
const VAGAS = T0 + 10 * NAP;

/**
 * A szülő (A alapítja, B tag), a gyermek (A hozza létre a vágáskor), és B beköltözése. B a szülőben: Y gondolat (100 pont),
 * W gondolat (100 pont), egy nyitott javaslat Y-ra. A beköltözés B vágás előtti utolsó eseménye után folytatja a láncát.
 * @param {Object} [b]
 * @param {Array<string>} [b.elhagy] - B a beköltözéskor elhagyja (KZ3)
 * @param {boolean} [b.kesoMeghivas] - B meghívása a vágás UTÁN (nem vágáskori tag)
 */
async function koltozes({ elhagy, kesoMeghivas = false, gyermekKeret = null } = {}) {
  const A = await ujEember('');
  const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok() }, T0);
  A.koinotValt(P.azonosito);
  const B = await ujEember(P.azonosito);
  const bBe = await B.tesz('Belepes', {}, T0 + 10);
  const bM = await A.tesz('Meghivas', { kit: B.szerzo, sajatBelepes: P.azonosito }, kesoMeghivas ? VAGAS + 100 : T0 + 11,
    { entitas: bBe.azonosito });
  const Y = await B.tesz('GondolatLetrehozas', { cim: 'Y', meret: 10 }, T0 + 100);
  const yp = await B.tesz('TudatpontRendezes', { entitas: Y.azonosito, pont: 100 }, T0 + 101);
  const W = await B.tesz('GondolatLetrehozas', { cim: 'W', meret: 10 }, T0 + 200);
  const wp = await B.tesz('TudatpontRendezes', { entitas: W.azonosito, pont: 100 }, T0 + 201);
  const p = [P, bBe, bM, Y, yp, W, wp];
  const c = wp;   // B vágás előtti utolsó szülőbeli eseménye
  // ----- a gyermek (A, a vágáskor) -----
  A.koinotValt('');
  const K = await A.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
    szuloTagsag: { horgony: P.azonosito, lanc: [] },
    szabalyok: teljesSzabalyok(gyermekKeret ? { tudatpontKeret: gyermekKeret } : {}) }, VAGAS);
  A.koinotValt(K.azonosito);
  // ----- B kiköltözése (a szülőben, a vágás után — a láncának szülőbeli ága) és beköltözése (a gyermekben) -----
  const kik = await esemenyLetrehozasa({ koino: P.azonosito, tipus: 'Kikoltozes', adat: { gyermek: K.azonosito },
    elozo: c.azonosito, sorszam: c.sorszam + 1, ido: VAGAS + 500, entitas: bBe.azonosito, entitasSorszam: 9, latott: [] },
  B.kulcspar);
  B.koinotValt(K.azonosito);
  const bek = await B.tesz('Bekoltozes', { szulo: P.azonosito, kikoltozes: kik.azonosito,
    lanc: { sorszam: c.sorszam, azonosito: c.azonosito }, szuloTagsag: { horgony: bBe.azonosito, lanc: [bBe, bM] },
    ...(elhagy ? { elhagy } : {}) }, VAGAS + 600);
  return { A, B, P, K, Y, W, bBe, bM, kik, bek, p, c };
}

async function ujTar(koino) {
  return esemenyTarNyitasa(koino, await mkdtemp(join(tmpdir(), 'koino-koltozes-')));
}

/** A tárba: a szülő (a vágás előtti) eseményei, a gyermek születése, és amit még kér. */
async function tarba(s, ...tobbi) {
  const tar = await ujTar(s.K.azonosito);
  for (const e of [...s.p, s.K, ...tobbi]) {
    const m = await esemenyMentese(tar, e);
    if (!m.mentve) throw new Error('nem menthető (' + e.tipus + '): ' + m.ok);
  }
  return tar;
}

// ===================================
// 1. A KAPU
// ===================================

proba('⭐⭐ D118 (④a): a beköltözés a kapun — a koinó és a szülő születésével átmegy; nélkülük nem (de nem végleg)', async () => {
  const s = await koltozes();
  const ures = await ujTar(s.K.azonosito);
  const nincsKoino = await esemenyMentese(ures, s.bek);
  if (!(await esemenyMentese(ures, s.P)).mentve) return false;
  const nincsKoino2 = await esemenyMentese(ures, s.bek);   // a szülő megvan, a koinó még nem
  const tar = await tarba(s);
  const jo = await esemenyMentese(tar, s.bek);
  return !nincsKoino.mentve && nincsKoino.hianyzik === true && !nincsKoino2.mentve && nincsKoino2.hianyzik === true
    && jo.mentve === true;
});

proba('⛔ D118 (④a): a kapu elveti a hamis beköltözést — nem tag, a vágás utáni meghívás, rossz lánc-pont, más szülőből, átírt bizonyíték',
  async () => {
    const tar = async (s) => tarba(s);
    // ⚠️ A változatok ugyanarról a lánc-pontról, mint a beköltözés (`elagaztat`) — különben a lánc-pont bukna, nem a hiba.
    // (a) nem tag: a bizonyítékból hiányzik a meghívás
    const a = await koltozes();
    const nemTag = await a.B.elagaztat('Bekoltozes', { ...a.bek.adat, szuloTagsag: { horgony: a.bBe.azonosito, lanc: [a.bBe] } });
    // (b) a meghívás a vágás után
    const b = await koltozes({ kesoMeghivas: true });
    // (c) rossz lánc-pont: a beköltözés nem a megnevezett esemény után folytat
    const c = await koltozes();
    const rosszPont = await c.B.elagaztat('Bekoltozes', { ...c.bek.adat, lanc: { sorszam: c.c.sorszam - 1, azonosito: c.p[3].azonosito } });
    // (d) más szülőből: a beköltözés egy másik koinót nevez meg szülőnek
    const d = await koltozes();
    const masik = await koltozes();
    const masSzulo = await d.B.elagaztat('Bekoltozes', { ...d.bek.adat, szulo: masik.P.azonosito });
    // (e) átírt bizonyíték-esemény (az aláírás a régi)
    const e = await koltozes();
    const atirt = await e.B.elagaztat('Bekoltozes', { ...e.bek.adat,
      szuloTagsag: { horgony: e.bBe.azonosito, lanc: [e.bBe, { ...e.bM, ido: e.bM.ido + 1 }] } });
    const r = [
      [await esemenyMentese(await tar(a), nemTag), /nem tagja a szülőnek/],
      [await esemenyMentese(await tar(b), b.bek), /vágás utáni/],
      [await esemenyMentese(await tar(c), rosszPont), /folytatja/],
      [await esemenyMentese(await tar(d), masSzulo), /nem a koinó szülőjéből/],
      [await esemenyMentese(await tar(e), atirt), /nem hiteles/]
    ];
    const ok = r.every(([m, minta]) => !m.mentve && minta.test(m.ok));
    if (!ok) process.stderr.write('    (' + JSON.stringify(r.map(([m]) => m.ok)) + ')\n');
    return ok;
  });

// ===================================
// 2. A TAGSÁG ÖRÖKLÉSE (D118/3)
// ===================================

proba('⭐⭐ D118/3: a beköltözött a gyermekben TAG (a horgonya a beköltözése) — beköltözés nélkül nem', async () => {
  const s = await koltozes();
  const tar = await tarba(s, s.bek);
  const esemenyek = await koinoBemenete(tar, s.K.azonosito);
  const vele = szerzoTagsaga(tagsagiIndex(esemenyek, s.K.azonosito), s.B.szerzo);
  const nelkule = szerzoTagsaga(tagsagiIndex(esemenyek.filter((e) => e !== s.bek && e.azonosito !== s.bek.azonosito),
    s.K.azonosito), s.B.szerzo);
  return vele.igen === true && vele.horgony === s.bek.azonosito && nelkule.igen !== true;
});

proba('⛔ D118 (④a): a tagsági csomagba csomagolt HAMIS beköltözés nem ad tagságot — a csomag kapuja a születésekkel ellenőrzi',
  async () => {
    const s = await koltozes();
    const tar = await tarba(s);
    // A jó: B tagsági csomagja a gyermekben (a lánca: a beköltözése és a koinó születése).
    const idx = tagsagiIndex([s.K, s.bek], s.K.azonosito);
    const lanc = tagsagiLanc(idx, s.bek.azonosito);
    const jo = await s.B.tesz(TAGSAGI_CSOMAG, { lanc }, undefined, { entitas: s.bek.azonosito });
    // A hamis: egy idegen „beköltözése” bizonyíték nélküli tagsággal (a szülőben nem tag), csomagba téve.
    const idegen = await ujEember(s.K.azonosito);
    const hamisBek = await idegen.tesz('Bekoltozes', { ...s.bek.adat, szuloTagsag: { horgony: s.bBe.azonosito, lanc: [s.bBe, s.bM] } });
    const hamisLanc = tagsagiLanc(tagsagiIndex([s.K, hamisBek], s.K.azonosito), hamisBek.azonosito);
    const hamis = await idegen.tesz(TAGSAGI_CSOMAG, { lanc: hamisLanc }, undefined, { entitas: hamisBek.azonosito });
    const h = await esemenyMentese(tar, hamis);
    const j = await esemenyMentese(tar, jo);
    return Array.isArray(hamisLanc) && !h.mentve && /beköltözése nem áll meg/.test(h.ok) && j.mentve === true;
  });

// ===================================
// 3. A KÉPBEN: a súly a beköltözéssel jön
// ===================================

proba('⭐⭐ D118 (④a): a beköltözött súlya a képben — a hozott pontjai élnek, amit elhagyott, az nem (KZ3 (A)); beköltözés nélkül egyik sem',
  async () => {
    const s = await koltozes();
    const e = await koltozes({ elhagy: [] });
    const most = VAGAS + 30 * NAP;
    const vele = await koinoKepe([...s.p, s.K, s.bek], { koino: s.K.azonosito, most });
    const nelkule = await koinoKepe([...s.p, s.K], { koino: s.K.azonosito, most });
    const el = await koltozes();
    const elhagyva = await el.B.elagaztat('Bekoltozes', { ...el.bek.adat, elhagy: [el.Y.azonosito] });
    const reszben = await koinoKepe([...el.p, el.K, elhagyva], { koino: el.K.azonosito, most });
    return vele.allapot.entitasok.get(s.Y.azonosito)?.osszesPont === 100 && vele.allapot.entitasok.get(s.W.azonosito)?.osszesPont === 100
      && !nelkule.allapot.entitasok.has(s.Y.azonosito) && !nelkule.allapot.entitasok.has(s.W.azonosito)
      && !reszben.allapot.entitasok.has(el.Y.azonosito) && reszben.allapot.entitasok.get(el.W.azonosito)?.osszesPont === 100
      && (await koinoKepe([...e.p, e.K, e.bek], { koino: e.K.azonosito, most })).allapot.entitasok.has(e.Y.azonosito);
  });

proba('⛔⛔ D118 (④a): a beköltözött új pontja a gyermekben a hozott pontjaival (és az elhagyottak nélkül) mondja be az összegét',
  async () => {
    const el = await koltozes();
    const elhagyva = await el.B.elagaztat('Bekoltozes', { ...el.bek.adat, elhagy: [el.Y.azonosito] });
    const tar = await tarba(el, elhagyva);
    const kornyezet = { koino: el.K.azonosito, kulcspar: el.B.kulcspar, szerzo: el.B.szerzo, tar };
    // Az új pont az ELHAGYOTT Y-ra: a hozott W 100 megmarad, az Y-on a hozott 100 nem jön — a bemondás 100 + 150 = 250.
    // ⚠️ A próba nem vak: a hozott pontok nélkül 150 volna, az elhagyás nélkül (a régi Y 100 helyére) szintén 250, de akkor a
    // kép az Y-t 150-nel és a láncot ellentmondással mutatná.
    const uj = await tudatpontRendezese(kornyezet, el.Y.azonosito, 150);
    const kep = await koinoKepe(await koinoBemenete(tar, el.K.azonosito), { koino: el.K.azonosito, most: VAGAS + 30 * NAP });
    return uj?.adat?.kiosztva === 250 && kep.allapot.entitasok.get(el.Y.azonosito)?.osszesPont === 150
      && kep.allapot.entitasok.get(el.W.azonosito)?.osszesPont === 100
      && !kep.allapot.kivetelek.some((x) => x.azonosito === uj.azonosito)
      && !kep.allapot.nemEllenorizhetok.some((x) => x.azonosito === uj.azonosito);
  });

// ===================================
// 4. KZ3 — A KISEBB KERET: a költöző elhagy, és a többi befér
// ===================================

proba('⭐⭐ KZ3 (A): a gyermek kisebb keretébe (150) a hozott pontok a SZÁMÍTOTT összeggel férnek — elhagyás nélkül a második nem fér, Y elhagyásával a W befér (a szülőbeli bemondása 200)',
  async () => {
    const most = VAGAS + 30 * NAP;
    const s = await koltozes({ gyermekKeret: 150 });
    const kep = await koinoKepe([...s.p, s.K, s.bek], { koino: s.K.azonosito, most });
    const el = await koltozes({ gyermekKeret: 150 });
    const elhagyva = await el.B.elagaztat('Bekoltozes', { ...el.bek.adat, elhagy: [el.Y.azonosito] });
    const kep2 = await koinoKepe([...el.p, el.K, elhagyva], { koino: el.K.azonosito, most });
    // A művelet ugyanígy: B új pontja az elhagyott Y-ra (40) — a bemondás a hozott W 100-zal 140.
    const tar = await tarba(el, elhagyva);
    const uj = await tudatpontRendezese({ koino: el.K.azonosito, kulcspar: el.B.kulcspar, szerzo: el.B.szerzo, tar },
      el.Y.azonosito, 40);
    // ⚠️ A próba nem vak: a W pont-eseménye a szülőben 200-at mondott be (Y + W) — a bemondás szerint a 150-be nem férne.
    return uj?.adat?.kiosztva === 140
      && el.p.find((e) => e.adat?.entitas === el.W.azonosito)?.adat?.kiosztva === 200
      && kep.allapot.entitasok.get(s.Y.azonosito)?.osszesPont === 100 && !kep.allapot.entitasok.has(s.W.azonosito)
      && kep.allapot.kivetelek.some((k) => /túllépné a gyermek keretét/.test(k.ok))
      && !kep2.allapot.entitasok.has(el.Y.azonosito) && kep2.allapot.entitasok.get(el.W.azonosito)?.osszesPont === 100;
  });

// ===================================
// 5. ⛔ A BIZONYÍTÉKBAN UTAZÓ BEKÖLTÖZÉS — több nemzedéken
// ===================================
//
// B a nagyszülőből a szülőbe költözött (a szülőbeli horgonya a beköltözése), és onnan tovább a gyermekbe: a gyermekbeli
// beköltözése bizonyítékában a SZÜLŐBELI beköltözése utazik. A kapu ezt is ellenőrzi (a tár születéseivel) — különben egy
// hamis szülőbeli beköltözés ingyen tagságot adna a gyermekben.
proba('⛔⛔ D118 (④a): a bizonyítékban utazó szülőbeli beköltözést a kapu a születésekkel ellenőrzi — a valódi átmegy, a hamis (nem tag a nagyszülőben) nem',
  async () => {
    const A = await ujEember('');
    const G = await A.tesz('KoinoLetrehozas', { nev: 'Nagyszülő', leiras: null, alapitok: [], zart: true,
      szabalyok: teljesSzabalyok() }, T0);
    A.koinotValt(G.azonosito);
    const B = await ujEember(G.azonosito);
    const bBe = await B.tesz('Belepes', {}, T0 + 10);
    const bM = await A.tesz('Meghivas', { kit: B.szerzo, sajatBelepes: G.azonosito }, T0 + 11, { entitas: bBe.azonosito });
    const E = await ujEember(G.azonosito);
    const eBe = await E.tesz('Belepes', {}, T0 + 20);   // E-t senki nem hívta meg
    A.koinotValt('');
    const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true, szulo: G.azonosito,
      szuloTagsag: { horgony: G.azonosito, lanc: [] }, szabalyok: teljesSzabalyok() }, T0 + 10 * NAP);
    B.koinotValt(P.azonosito);
    const bPB = await B.tesz('Bekoltozes', { szulo: G.azonosito, kikoltozes: G.azonosito,
      lanc: { sorszam: bBe.sorszam, azonosito: bBe.azonosito }, szuloTagsag: { horgony: bBe.azonosito, lanc: [bBe, bM] } },
    T0 + 10 * NAP + 100);
    E.koinotValt(P.azonosito);
    const ePB = await E.tesz('Bekoltozes', { szulo: G.azonosito, kikoltozes: G.azonosito,
      lanc: { sorszam: eBe.sorszam, azonosito: eBe.azonosito }, szuloTagsag: { horgony: eBe.azonosito, lanc: [eBe] } },
    T0 + 10 * NAP + 200);
    A.koinotValt('');
    const K = await A.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
      szuloTagsag: { horgony: P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok() }, T0 + 20 * NAP);
    const tovabb = async (ki, pb) => {
      ki.koinotValt(K.azonosito);
      return ki.tesz('Bekoltozes', { szulo: P.azonosito, kikoltozes: P.azonosito,
        lanc: { sorszam: pb.sorszam, azonosito: pb.azonosito }, szuloTagsag: { horgony: pb.azonosito, lanc: [pb] } },
      T0 + 20 * NAP + 100);
    };
    const bKB = await tovabb(B, bPB);
    const eKB = await tovabb(E, ePB);
    const tar = await ujTar(K.azonosito);
    for (const e of [G, P, K]) if (!(await esemenyMentese(tar, e)).mentve) return false;
    const hamis = await esemenyMentese(tar, eKB);
    const valodi = await esemenyMentese(tar, bKB);
    return !hamis.mentve && /beköltözése nem áll meg/.test(hamis.ok) && valodi.mentve === true;
  });

export default futtatas;
