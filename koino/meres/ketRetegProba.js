// koino/meres/ketRetegProba.js — ⭐⭐ D118 (a költözés ③): a koinó képe két rétegben
//
// Azt bizonyítja, hogy egy szülőre épülő koinó a szülő múltját a SZÜLŐ szabályaival, a vágás pillanatára számolja, és a
// lezárt döntések rögzítve jönnek át (D118/3 — a gyermek szigorúbb küszöbe sem fordítja meg őket); hogy a jelenben a
// szerkezet mindenkié, a súly csak a költözőké (D118/1 — a nem költöző pontja és szavazata nem számít, a D14 itt ítél);
// hogy a nem költöző nyitott javaslata nem folytatódik, a költözőé a gyermek küszöbeivel igen (KZ6 (A)); és hogy a szülő
// nélküli koinó képe ugyanaz, mint eddig.

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { koinoKepe } from '../js/allapot/ketReteg.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from '../js/allapot/szerkesztesiVegrehajtas.js';
import { allapotUjjlenyomata } from '../js/allapot/osszehasonlitas.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoBemenete } from '../js/tar/esemenyTar.js';
import { tudatpontRendezese } from '../js/muveletek.js';
import { pakliOldal, ujPakliNezet } from '../js/allapot/pakli.js';

const { proba, futtatas } = probaGyujtemeny('A koinó képe két rétegben (D118 ③)');

const NAP = 86400 * 1000;
const ORA = 3600 * 1000;
const T0 = Date.UTC(2026, 0, 1);
const VAGAS = T0 + 10 * NAP;

/**
 * A szülő és a gyermek: A az alapító (és a gyermek létrehozója — a születésével költözik), B és C tag a szülőben.
 * X: csak A pontja · Y: csak B pontja · Z: A és B pontja. J1: A javaslata X-re, 2/3-dal elfogadva a vágás előtt. J2: B
 * javaslata Z-re, nyitott a vágáskor. J3: A javaslata Z-re, nyitott a vágáskor (A támogatja, B ellenzi). A gyermek
 * elfogadási küszöbe 80% (a szülőé 51%).
 * @param {Object} [b]
 * @param {boolean} [b.bKoltozik] - B is beköltözik (a gyermekben tag, a ③-ban paraméterként költöző)
 */
async function szuloEsGyermek({ bKoltozik = false } = {}) {
  const A = await ujEember('');
  const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true,
    szabalyok: teljesSzabalyok() }, T0);
  A.koinotValt(P.azonosito);
  const p = [P];
  const tag = async (ido) => {
    const x = await ujEember(P.azonosito);
    const be = await x.tesz('Belepes', {}, ido);
    p.push(be, await A.tesz('Meghivas', { kit: x.szerzo, sajatBelepes: P.azonosito }, ido + 1, { entitas: be.azonosito }));
    return x;
  };
  const B = await tag(T0 + 10);
  const C = await tag(T0 + 20);
  const gondolat = async (ki, cim, ido) => {
    const g = await ki.tesz('GondolatLetrehozas', { cim, meret: 10 }, ido);
    p.push(g, await ki.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 100 }, ido + 1));
    return g;
  };
  const X = await gondolat(A, 'X', T0 + 100);
  const Y = await gondolat(B, 'Y', T0 + 200);
  const Z = await gondolat(A, 'Z', T0 + 300);
  p.push(await B.tesz('TudatpontRendezes', { entitas: Z.azonosito, pont: 100 }, T0 + 310));
  // C is tulajdonos X-en (a J1 szavazója)
  p.push(await C.tesz('TudatpontRendezes', { entitas: X.azonosito, pont: 100 }, T0 + 320));
  p.push(await B.tesz('TudatpontRendezes', { entitas: X.azonosito, pont: 100 }, T0 + 330));

  const javaslat = async (ki, mire, cim, ido) => {
    const j = await ki.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: mire.azonosito, muvelet: 'Modositas',
      valtozas: { cim }, indoklas: 'próba' }, ido);
    p.push(j);
    return j;
  };
  const szavaz = async (ki, j, szavazat, ido) => p.push(...await ki.szavaz(j, { szavazat }, ido));
  const J1 = await javaslat(A, X, 'X új', T0 + 1000);
  await szavaz(A, J1, 'Tamogat', T0 + 1100);
  await szavaz(B, J1, 'Tamogat', T0 + 1200);
  await szavaz(C, J1, 'Ellenez', T0 + 1300);
  // J4: A javaslata X-re, a szülőben ELVETVE (1/3) — a költöző egyedül elfogadná.
  const J4 = await javaslat(A, X, 'X elvetett', T0 + 2000);
  await szavaz(A, J4, 'Tamogat', T0 + 2100);
  await szavaz(B, J4, 'Ellenez', T0 + 2200);
  await szavaz(C, J4, 'Ellenez', T0 + 2300);
  const J2 = await javaslat(B, Z, 'Z a nem költözőtől', VAGAS - ORA);
  await szavaz(B, J2, 'Tamogat', VAGAS - ORA + 10);
  const J3 = await javaslat(A, Z, 'Z a költözőtől', VAGAS - ORA + 100);
  await szavaz(A, J3, 'Tamogat', VAGAS - ORA + 110);
  await szavaz(B, J3, 'Ellenez', VAGAS - ORA + 120);

  // ----- A gyermek: A születése (a láncát folytatja) -----
  A.koinotValt('');
  const K = await A.tesz('KoinoLetrehozas', { nev: 'Gyermek', leiras: null, alapitok: [], zart: true,
    szulo: P.azonosito, szuloTagsag: { horgony: P.azonosito, lanc: [] },
    szabalyok: teljesSzabalyok({ alapKuszobok: { elfogadasiKuszob: 80 } }) }, VAGAS);
  // ⛔ A létrehozó vágás UTÁNI szülőbeli pont-eseménye (a lánc-pontja után — a sorszáma a gyermekbeli láncáé fölött, hogy ne
  // ütközzön vele: egy elágazást a kép a kisebb azonosító szerint oldana fel, és az a próbát véletlenné tenné) — a kapu nem
  // engedi a gyermekbe; ha mégis a bemenetbe kerülne, a kép akkor sem számolhatja. Az órája a vágás ELŐTT jár.
  const utana = await esemenyLetrehozasa({ koino: P.azonosito, tipus: 'TudatpontRendezes',
    adat: { entitas: X.azonosito, pont: 300, kiosztva: 300 }, elozo: null, sorszam: 1000, ido: VAGAS - 10,
    entitas: X.azonosito, entitasSorszam: 99, latott: [] }, A.kulcspar);
  A.koinotValt(K.azonosito);
  const k = [K];
  k.push(await A.tesz('GondolatLetrehozas', { cim: 'A gyermekben', meret: 10 }, VAGAS + 100));
  k.push(await A.tesz('TudatpontRendezes', { entitas: k[1].azonosito, pont: 50 }, VAGAS + 101));
  // ⚠️ B a gyermekben TAG (A meghívja) — különben a nem tag súlya a D93/1 miatt amúgy sem számítana, és a próba nem a
  // költözés szabályát mérné. Költözni csak a `bKoltozik`-kal költözik (a lánc-pontja az első gyermekbeli eseménye — a
  // ④-ig paraméter).
  B.koinotValt(K.azonosito);
  const bBe = await B.tesz('Belepes', {}, VAGAS + 200);
  k.push(bBe, await A.tesz('Meghivas', { kit: B.szerzo, sajatBelepes: K.azonosito }, VAGAS + 201, { entitas: bBe.azonosito }));
  const koltozok = bKoltozik ? new Map([[B.szerzo, bBe.sorszam]]) : null;
  return { A, B, C, P, K, X, Y, Z, J1, J2, J3, J4, p, k, koltozok, sajat: k[1], utana };
}

/** A régi út: a három fázis egy rétegen. */
async function haromFazis(esemenyek, most) {
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);
  return { allapot, javaslatok };
}

// ===================================
// 1. A SZÜLŐ NÉLKÜLI KOINÓ: ugyanaz, mint eddig
// ===================================

proba('⭐ D118 (③): a szülő nélküli koinó képe UGYANAZ, mint a három fázis eddig (az ujjlenyomat bájtra)', async () => {
  const { p, P } = await szuloEsGyermek();
  const most = VAGAS + 30 * NAP;
  const regi = await haromFazis(p, most);
  const uj = await koinoKepe(p, { koino: P.azonosito, most });
  return (await allapotUjjlenyomata(regi.allapot, regi.javaslatok)) === (await allapotUjjlenyomata(uj.allapot, uj.javaslatok))
    && uj.mult === null && uj.allapot.entitasok.size >= 3;
});

// ===================================
// 2. A MÚLT: a lezárt döntés rögzítve, a szülő szabályaival
// ===================================

proba('⭐⭐ D118/3: a vágás előtt LEZÁRT döntések rögzítve jönnek át — az elfogadott az egyezményével, az elvetett elvetve; se a költözők egyedül, se a gyermek szigorúbb küszöbe (80%) nem fordítja meg',
  async () => {
    const s = await szuloEsGyermek();
    const most = VAGAS + 30 * NAP;
    const kep = await koinoKepe([...s.p, ...s.k], { koino: s.K.azonosito, most });
    const j1 = kep.javaslatok.get(s.J1.azonosito);
    const j4 = kep.javaslatok.get(s.J4.azonosito);
    // ⚠️ A próba nem vak: a múlt adataira a gyermek küszöbét téve a J1 elbukna (667‰ < 800‰), a jelen bemenetéből (csak a
    // költöző szavazatával) a J4 átmenne.
    const szigorubb = javaslatokSzamitasa(kep.mult.allapot.szamitok, kep.mult.allapot, most,
      { alapKuszobok: { ...kep.mult.allapot.koino.szabalyok.alapKuszobok, elfogadasiKuszob: 80 } }).get(s.J1.azonosito);
    const csakKoltozo = javaslatokSzamitasa(kep.allapot.szamitok, kep.allapot, most).get(s.J4.azonosito);
    return j1?.mult === true && j1.statusz === 'elfogadva' && j1.tamogatottsagEzrelek === 667
      && j4?.mult === true && j4.statusz === 'elvetve'
      && kep.allapot.entitasok.get(s.X.azonosito)?.cim === 'X új'
      && szigorubb?.statusz === 'elvetve' && csakKoltozo?.statusz === 'elfogadva';
  });

// ===================================
// 3. A JELEN: a súly csak a költözőké
// ===================================

proba('⭐⭐ D118/1: a súly csak a költözőké — a nem költöző pontja nem számít (a csak az övé entitás a gyermekben nem él), a szerkezet mindenkié',
  async () => {
    const s = await szuloEsGyermek();
    const kep = await koinoKepe([...s.p, s.utana, ...s.k], { koino: s.K.azonosito, most: VAGAS + 30 * NAP });
    const e = kep.allapot.entitasok;
    if (!(s.utana.sorszam > s.K.sorszam) || !(s.utana.ido < s.K.ido)) return false;   // a próba nem vak: a lánc-pont után, az óra előtte
    return e.get(s.X.azonosito)?.osszesPont === 100 && [...e.get(s.X.azonosito).hozzajarulok.keys()].join() === s.A.szerzo
      && !e.has(s.Y.azonosito) && kep.allapot.elfelejtettek.includes(s.Y.azonosito)
      && e.get(s.Z.azonosito)?.osszesPont === 100 && !e.get(s.Z.azonosito).hozzajarulok.has(s.B.szerzo)
      && e.get(s.sajat.azonosito)?.osszesPont === 50
      // a szülő a vágáskor mindhármat ismerte, B pontjaival
      && kep.mult.allapot.entitasok.get(s.Y.azonosito)?.osszesPont === 100;
  });

proba('⭐⭐ KZ6 (A): a NEM KÖLTÖZŐ nyitott javaslata nem folytatódik; a KÖLTÖZŐÉ igen — a nem költöző szavazata nélkül, a gyermek küszöbével',
  async () => {
    const s = await szuloEsGyermek();
    const most = VAGAS + 30 * NAP;
    const kep = await koinoKepe([...s.p, ...s.k], { koino: s.K.azonosito, most });
    const multban = kep.mult.javaslatok;
    const j3 = kep.javaslatok.get(s.J3.azonosito);
    // ⚠️ A próba nem vak: a vágáskor mindkettő nyitott volt; a szülőben a J3 1:1-re állna (elvetve).
    const szuloben = (await haromFazis(s.p, most)).javaslatok.get(s.J3.azonosito);
    return multban.get(s.J2.azonosito)?.statusz === 'folyamatban' && multban.get(s.J3.azonosito)?.statusz === 'folyamatban'
      && !kep.javaslatok.has(s.J2.azonosito)
      && j3 && !j3.mult && j3.statusz === 'elfogadva' && j3.ellenzok === 0
      && kep.allapot.entitasok.get(s.Z.azonosito)?.cim === 'Z a költözőtől'
      && szuloben?.statusz === 'elvetve';
  });

proba('⭐ D118 (③): egy MÁSIK költöző (a ④-ig paraméter) a pontjait és a szavazatát is hozza — az ő entitása él, és a szavazata számít',
  async () => {
    const s = await szuloEsGyermek({ bKoltozik: true });
    const most = VAGAS + 30 * NAP;
    const kep = await koinoKepe([...s.p, ...s.k], { koino: s.K.azonosito, most, koltozok: s.koltozok });
    const j3 = kep.javaslatok.get(s.J3.azonosito);
    return kep.allapot.entitasok.get(s.Y.azonosito)?.osszesPont === 100
      && kep.allapot.entitasok.get(s.Z.azonosito)?.osszesPont === 200
      && j3?.ellenzok === 1 && j3.statusz === 'elvetve'
      && kep.javaslatok.has(s.J2.azonosito);   // B is költözött: az ő nyitott javaslata is folytatódik
  });

// ===================================
// 4. TÖBB NEMZEDÉK
// ===================================

proba('⭐ D118 (③): több nemzedéken át — a nagyszülőben lezárt döntés a szülőn át az unokába is rögzítve jön, a súly a költözőkkel halad',
  async () => {
    const A = await ujEember('');
    const G = await A.tesz('KoinoLetrehozas', { nev: 'Nagyszülő', leiras: null, alapitok: [], zart: true,
      szabalyok: teljesSzabalyok() }, T0);
    A.koinotValt(G.azonosito);
    const g = await A.tesz('GondolatLetrehozas', { cim: 'G gondolat', meret: 10 }, T0 + 10);
    const gp = await A.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 100 }, T0 + 11);
    const j = await A.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
      valtozas: { cim: 'G gondolat, módosítva' }, indoklas: 'próba' }, T0 + 100);
    const szav = await A.szavaz(j, { szavazat: 'Tamogat' }, T0 + 110);
    A.koinotValt('');
    const P = await A.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true, szulo: G.azonosito,
      szuloTagsag: { horgony: G.azonosito, lanc: [] }, szabalyok: teljesSzabalyok() }, T0 + 10 * NAP);
    A.koinotValt(P.azonosito);
    const p = await A.tesz('GondolatLetrehozas', { cim: 'P gondolat', meret: 10 }, T0 + 10 * NAP + 10);
    const pp = await A.tesz('TudatpontRendezes', { entitas: p.azonosito, pont: 100 }, T0 + 10 * NAP + 11);
    A.koinotValt('');
    const K = await A.tesz('KoinoLetrehozas', { nev: 'Unoka', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
      szuloTagsag: { horgony: P.azonosito, lanc: [] }, szabalyok: teljesSzabalyok() }, T0 + 20 * NAP);
    const kep = await koinoKepe([G, g, gp, j, ...szav, P, p, pp, K], { koino: K.azonosito, most: T0 + 30 * NAP });
    const jk = kep.javaslatok.get(j.azonosito);
    return jk?.mult === true && jk.statusz === 'elfogadva'
      && kep.allapot.entitasok.get(g.azonosito)?.cim === 'G gondolat, módosítva'
      && kep.allapot.entitasok.get(g.azonosito)?.osszesPont === 100 && kep.allapot.entitasok.get(p.azonosito)?.osszesPont === 100
      && kep.mult?.mult?.javaslatok.get(j.azonosito)?.statusz === 'elfogadva';
  });

// ⭐ A súly nemzedékenként: aki a nagyszülőből a szülőbe költözött, de onnan az unokába nem, annak a nagyszülőbeli súlya az
// unokában nem számít — és aki a szülőbe csak meghívással jött (nem költözött), annak a nagyszülőbeli súlya sem.
proba('⭐ D118 (③): a súly NEMZEDÉKENKÉNT — a nagyszülőből a szülőbe költözött, de tovább nem költözött szerző nagyszülőbeli pontja az unokában nem él',
  async () => {
    const A = await ujEember('');
    const G = await A.tesz('KoinoLetrehozas', { nev: 'Nagyszülő', leiras: null, alapitok: [], zart: true,
      szabalyok: teljesSzabalyok() }, T0);
    A.koinotValt(G.azonosito);
    const D = await ujEember(G.azonosito);
    const dBe = await D.tesz('Belepes', {}, T0 + 10);
    const dM = await A.tesz('Meghivas', { kit: D.szerzo, sajatBelepes: G.azonosito }, T0 + 11, { entitas: dBe.azonosito });
    const q = await D.tesz('GondolatLetrehozas', { cim: 'Q a költözött szerzőtől', meret: 10 }, T0 + 20);
    const qp = await D.tesz('TudatpontRendezes', { entitas: q.azonosito, pont: 100 }, T0 + 21);
    const g = await A.tesz('GondolatLetrehozas', { cim: 'g az alapítótól', meret: 10 }, T0 + 30);
    const gp = await A.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 100 }, T0 + 31);
    // D hozza létre a szülőt (költözik G → P); A a szülőben csak meghívott tag.
    D.koinotValt('');
    const P = await D.tesz('KoinoLetrehozas', { nev: 'Szülő', leiras: null, alapitok: [], zart: true, szulo: G.azonosito,
      szuloTagsag: { horgony: dBe.azonosito, lanc: [dBe, dM] }, szabalyok: teljesSzabalyok() }, T0 + 10 * NAP);
    D.koinotValt(P.azonosito);
    A.koinotValt(P.azonosito);
    const aBe = await A.tesz('Belepes', {}, T0 + 10 * NAP + 10);
    const aM = await D.tesz('Meghivas', { kit: A.szerzo, sajatBelepes: P.azonosito }, T0 + 10 * NAP + 11, { entitas: aBe.azonosito });
    const r = await A.tesz('GondolatLetrehozas', { cim: 'R a szülőben', meret: 10 }, T0 + 10 * NAP + 20);
    const rp = await A.tesz('TudatpontRendezes', { entitas: r.azonosito, pont: 100 }, T0 + 10 * NAP + 21);
    // A hozza létre az unokát (költözik P → K).
    A.koinotValt('');
    const K = await A.tesz('KoinoLetrehozas', { nev: 'Unoka', leiras: null, alapitok: [], zart: true, szulo: P.azonosito,
      szuloTagsag: { horgony: aBe.azonosito, lanc: [aBe, aM] }, szabalyok: teljesSzabalyok() }, T0 + 20 * NAP);
    // ⚠️ D az unokában TAG (A meghívja, nem költözik) — a nem tag súlya amúgy sem számítana (D93/1).
    A.koinotValt(K.azonosito);
    D.koinotValt(K.azonosito);
    const dKBe = await D.tesz('Belepes', {}, T0 + 20 * NAP + 10);
    const dKM = await A.tesz('Meghivas', { kit: D.szerzo, sajatBelepes: K.azonosito }, T0 + 20 * NAP + 11, { entitas: dKBe.azonosito });
    const most = T0 + 30 * NAP;
    const kep = await koinoKepe([G, dBe, dM, q, qp, g, gp, P, aBe, aM, r, rp, K, dKBe, dKM], { koino: K.azonosito, most });
    // ⚠️ A próba nem vak: a szülőben D (a költöző) nagyszülőbeli pontja él, A-é nem.
    const szulo = kep.mult.allapot.entitasok;
    const e = kep.allapot.entitasok;
    return szulo.get(q.azonosito)?.osszesPont === 100 && !szulo.has(g.azonosito)
      && !e.has(q.azonosito) && !e.has(g.azonosito) && e.get(r.azonosito)?.osszesPont === 100;
  });

// ===================================
// 5. A MŰVELET UGYANAZT SZÁMOLJA — a hozott pontokkal
// ===================================
//
// ⛔ A létrehozó a gyermekben új pontot tesz: a bemondott összegnek (`kiosztva`) a HOZOTT pontjait is tartalmaznia kell —
// ugyanazt, amit a koinó képe a jelen rétegében lát. Ha a művelet csak a gyermek eseményeit nézné, a bemondás ellentmondana
// a láncának (rontás-próba: a régi szűrővel a szabály-réteg jelzést ad, és a bemondott összeg elmarad a láncából).
proba('⛔⛔ D118 (③): a létrehozó új pontja a gyermekben a HOZOTT pontjaival együtt mondja be az összegét — a művelet és a kép egy szabályból',
  async () => {
    const s = await szuloEsGyermek();
    const tar = await esemenyTarNyitasa(s.K.azonosito, await mkdtemp(join(tmpdir(), 'koino-ketreteg-')));
    for (const e of [...s.p, ...s.k]) {
      const m = await esemenyMentese(tar, e);
      if (!m.mentve) { process.stderr.write('    (nem menthető: ' + m.ok + ')\n'); return false; }
    }
    const kornyezet = { koino: s.K.azonosito, kulcspar: s.A.kulcspar, szerzo: s.A.szerzo, tar };
    const uj = await tudatpontRendezese(kornyezet, s.X.azonosito, 150);
    const kep = await koinoKepe(await koinoBemenete(tar, s.K.azonosito), { koino: s.K.azonosito, most: VAGAS + 30 * NAP });
    const hozott = [...kep.allapot.kiosztasok].filter(([k]) => k.startsWith(s.A.szerzo + '|')).reduce((a, [, v]) => a + v, 0);
    return uj?.adat?.kiosztva === hozott && hozott > 150 + 50
      && !kep.allapot.nemEllenorizhetok.some((x) => x.azonosito === uj.azonosito)
      && !kep.allapot.kivetelek.some((x) => x.azonosito === uj.azonosito)
      && kep.allapot.entitasok.get(s.X.azonosito)?.osszesPont === 150;
  });

// ===================================
// 6. A FELÜLET IS EZT LÁTJA — a pakli képe
// ===================================

proba('⭐ D118 (③): a pakli (a felület) ugyanazt a két réteget látja — a hozott entitás a vágáskori alakjával, a nem költözőé nincs',
  async () => {
    const s = await szuloEsGyermek();
    const tar = await esemenyTarNyitasa(s.K.azonosito, await mkdtemp(join(tmpdir(), 'koino-ketreteg-')));
    for (const e of [...s.p, ...s.k]) if (!(await esemenyMentese(tar, e)).mentve) return false;
    const oldal = await pakliOldal(tar, s.K.azonosito, { nezet: ujPakliNezet(), most: VAGAS + 30 * NAP, darab: 50 });
    const kartya = (az) => oldal.kartyak.find((k) => k.azonosito === az);
    return kartya(s.X.azonosito)?.cim === 'X új' && !kartya(s.Y.azonosito) && !!kartya(s.Z.azonosito)
      && !!kartya(s.sajat.azonosito);
  });

export default futtatas;
