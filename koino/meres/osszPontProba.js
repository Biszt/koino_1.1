// koino/meres/osszPontProba.js

// Felelősség: AZ ÖSSZ-PONT próbája (D76/2, D92/5 — `js/allapot/osszPont.js`), hálózat nélkül.
//
// Amit mér: (1) a felfelé összegzés: a saját pont + a gyerekek össz-pontja; a nem tartott gyerek bemondása számít,
// a se nem tartott, se nem bemondott 0, és ezt kimondja; a kör nem végtelen; a mély lánc nem csordul túl; (2) a
// részfa levelei: a szerző pontja az aláírt eseményéhez kötve, az egyezmény által átvitt pont jelölve, a gyerekek
// össz-pontja; (3) a karbantartó a különbséget vezeti rá, és ugyanazt a gyökeret adja, mint egy friss fa; (4) ⭐ a
// teljes szúrópróba VALÓDI aláírt eseményekkel: a becsületes fejléc átmegy, a felfújt lebukik, a más entitás
// eseménye és a hiányos válasz elbukik, a hiányzó esemény nem hiba, csak kimondott.

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import {
  osszPontokSzamitasa, gyerekJegyzek, reszfaLevelei, reszfaKarbantarto, mintaHelyek, fejlecMintai,
  fejlecEllenorzese, reszfaGyokere, OSSZPONT_FA
} from '../js/allapot/osszPont.js';
import { allapotGyokereListabol, azonosOsszegzes, ujAllapotFa, allapotBeallitas, allapotGyokere } from '../js/esemeny/osszegzoFa.js';

const { proba, futtatas } = probaGyujtemeny('Az össz-pont a szeletelt világban (D92/5)');

/** Egy kitalált entitás a felfelé összegzés próbáihoz. */
const ent = (azonosito, szulo, osszesPont, tobb = {}) => [azonosito, {
  azonosito, szulo, osszesPont, hozzajarulok: new Map(osszesPont > 0 ? [['sz-' + azonosito, { pont: osszesPont }]] : []), ...tobb
}];

// ===================================
// 1. A FELFELÉ ÖSSZEGZÉS
// ===================================

proba('⭐ az össz-pont = a saját pont + a gyerekek össz-pontja, minden szinten', () => {
  const m = new Map([ent('A', null, 5), ent('B', 'A', 3), ent('C', 'B', 2), ent('D', 'A', 1), ent('E', null, 7)]);
  const o = osszPontokSzamitasa(m);
  return o.get('A').osszPont === 11 && o.get('B').osszPont === 5 && o.get('C').osszPont === 2
    && o.get('D').osszPont === 1 && o.get('E').osszPont === 7 && o.get('A').sajat === 5
    && [...o.values()].every((x) => x.forras === 'szamolt' && x.bizonytalan === 0);
});

proba('⭐ a NEM TARTOTT gyerek bemondása számít; ha az sincs, a saját pontja 0, az ismert gyerekei számítanak — és a `bizonytalan` kimondja', () => {
  const m = new Map([ent('A', null, 5), ent('B', 'A', 0, { pontokIsmeretlenek: true }), ent('C', 'B', 9), ent('D', 'A', 1)]);
  const bemondva = osszPontokSzamitasa(m, new Map([['B', { osszPont: 40 }]]));
  const nelkule = osszPontokSzamitasa(m);
  // A bemondás a B egész részfáját fedi — a C (amit történetesen tartunk) nem számít kétszer.
  return bemondva.get('A').osszPont === 46 && bemondva.get('B').forras === 'bemondott' && bemondva.get('A').bizonytalan === 0
    && nelkule.get('A').osszPont === 15 && nelkule.get('B').forras === 'ismeretlen' && nelkule.get('B').osszPont === 9
    && nelkule.get('B').sajat === null && nelkule.get('A').bizonytalan === 1 && nelkule.get('C').osszPont === 9;
});

proba('⛔ a hibás bemondás (negatív, tört, szöveg) nem számít — ismeretlen marad', () => {
  const m = new Map([ent('A', null, 5), ent('B', 'A', 0, { pontokIsmeretlenek: true })]);
  // (B-nek nincs ismert gyereke: az össz-pontja 0 marad)
  return [-3, 2.5, '40', null].every((x) => {
    const o = osszPontokSzamitasa(m, new Map([['B', { osszPont: x }]]));
    return o.get('A').osszPont === 5 && o.get('B').forras === 'ismeretlen';
  });
});

proba('⛔ a körbe mutató szülő-lánc nem végtelen, és mindenki csak egyszer számít', () => {
  const m = new Map([ent('A', 'B', 2), ent('B', 'A', 3), ent('C', 'A', 1)]);
  const o = osszPontokSzamitasa(m);
  return o.size === 3 && Math.max(...[...o.values()].map((x) => x.osszPont)) === 6;
});

proba('a 20 000 mély lánc sem csordul túl (iteratív bejárás)', () => {
  const m = new Map();
  for (let i = 0; i < 20000; i++) m.set('n' + i, ent('n' + i, i ? 'n' + (i - 1) : null, 1)[1]);
  return osszPontokSzamitasa(m).get('n0').osszPont === 20000;
});

// ===================================
// 2. A RÉSZFA LEVELEI ÉS A KARBANTARTÓ
// ===================================

proba('a részfa levelei: a szerző pontja az aláírt eseményhez kötve, az átvitt pont jelölve, a gyerekek össz-pontja; a 0 kimarad', () => {
  const entitasok = new Map([
    ['X', { azonosito: 'X', szulo: null, osszesPont: 7, hozzajarulok: new Map([['anna', { pont: 4 }], ['bela', { pont: 3 }]]) }],
    ent('G1', 'X', 6), ent('G2', 'X', 0, { pontokIsmeretlenek: true })
  ]);
  const allapot = { entitasok, pontEsemenyek: new Map([['anna|X', 'E-anna']]) };   // a béláét egyezmény vitte át
  const l = reszfaLevelei('X', allapot, osszPontokSzamitasa(entitasok));
  const k = new Map(l.map((x) => [x.kulcs, x]));
  return l.length === 3 && k.get('p:anna').ertek.e === 'E-anna' && k.get('p:anna').osszegek[0] === 4
    && k.get('p:bela').ertek.atvitt === true && k.get('g:G1').osszegek[0] === 6 && !k.has('g:G2');
});

proba('⭐ a karbantartó a KÜLÖNBSÉGET vezeti rá — és minden lépés után ugyanaz a gyökér, mint egy friss fáé', async () => {
  const karb = reszfaKarbantarto();
  let levelek = [];
  let x = 7;
  const v = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
  for (let lepes = 0; lepes < 40; lepes++) {
    const kulcs = 'p:sz' + Math.floor(v() * 12);
    levelek = levelek.filter((l) => l.kulcs !== kulcs);
    if (v() < 0.8) levelek.push({ kulcs, ertek: { e: 'E' + lepes }, osszegek: [1 + Math.floor(v() * 50)] });
    const fa = await karb.fa('X', levelek);
    const friss = await allapotGyokereListabol(OSSZPONT_FA, 1, levelek);
    if (!azonosOsszegzes(await reszfaGyokere(fa), friss)) return false;
  }
  return true;
});

proba('a karbantartó korlátos — a legrégebben használt fa kiesik', async () => {
  const karb = reszfaKarbantarto(3);
  for (const az of ['a', 'b', 'c', 'd', 'e']) await karb.fa(az, [{ kulcs: 'p:x', ertek: null, osszegek: [1] }]);
  return karb.meret() === 3;
});

// ===================================
// 3. ⭐ A TELJES SZÚRÓPRÓBA — VALÓDI ALÁÍRT ESEMÉNYEKKEL
// ===================================

/** Egy gondolat (X), két gyerekkel; négy e-ember tesz rá pontot. */
async function valodiAllapot() {
  const emberek = [];
  for (let i = 0; i < 4; i++) emberek.push(await ujEember('proba'));
  const [anna] = emberek;
  const x = await anna.tesz('GondolatLetrehozas', { cim: 'GYOKER', meret: 10 });
  const g1 = await anna.tesz('GondolatLetrehozas', { cim: 'ELSO', meret: 10, szulo: x.azonosito });
  const g2 = await anna.tesz('GondolatLetrehozas', { cim: 'MASIK', meret: 10, szulo: x.azonosito });
  const esemenyek = [x, g1, g2];
  for (const [i, e] of emberek.entries()) {
    esemenyek.push(await e.tesz('TudatpontRendezes', { entitas: x.azonosito, pont: 3 + i * 4 }));
    esemenyek.push(await e.tesz('TudatpontRendezes', { entitas: g1.azonosito, pont: 2 + i }));
  }
  esemenyek.push(await anna.tesz('TudatpontRendezes', { entitas: g2.azonosito, pont: 5 }));
  const allapot = await allapotSzamitasa(esemenyek);
  return { allapot, esemenyek, x: x.azonosito, terkep: new Map(esemenyek.map((e) => [e.azonosito, e])) };
}

async function fejlec(allapot, x) {
  const o = osszPontokSzamitasa(allapot.entitasok);
  const fa = await reszfaKarbantarto().fa(x, reszfaLevelei(x, allapot, o, gyerekJegyzek(allapot.entitasok)));
  return { fa, gyoker: await reszfaGyokere(fa), osszPont: o.get(x).osszPont };
}

proba('⭐⭐ a BECSÜLETES fejléc átmegy: a gyökér összege az össz-pont, a minták a valódi aláírt pont-eseményekre esnek', async () => {
  const { allapot, x, terkep } = await valodiAllapot();
  const { fa, gyoker, osszPont } = await fejlec(allapot, x);
  const helyek = mintaHelyek(gyoker.o[0], 16);
  const mintak = await fejlecMintai(fa, helyek);
  const e = await fejlecEllenorzese({ azonosito: x, gyoker, helyek, mintak, esemenyek: terkep });
  // X saját pontja 3+7+11+15 = 36; a gyerekek: G1 2+3+4+5 = 14, G2 5 → 55.
  return osszPont === 55 && gyoker.o[0] === 55 && e.rendben && e.ellenorzott + e.gyerek === 16 && e.ellenorzott > 0;
});

proba('⭐⭐ a FELFÚJT fejléc lebukik — a hamis szerzői levelekre esik minta, és a hozzájuk mutatott esemény nem azt mondja', async () => {
  const { allapot, x, terkep, esemenyek } = await valodiAllapot();
  const o = osszPontokSzamitasa(allapot.entitasok);
  const levelek = reszfaLevelei(x, allapot, o, gyerekJegyzek(allapot.entitasok));
  // A csaló a valódi összeggel azonos többletet tesz hozzá: egy valódi (de más entitásra szóló) eseményre mutató,
  // és egy nem létező eseményre mutató hamis levelekben.
  const masik = esemenyek.find((e) => e.tipus === 'TudatpontRendezes' && e.adat.entitas !== x);
  const fa = ujAllapotFa(OSSZPONT_FA, 1);
  for (const l of levelek) await allapotBeallitas(fa, l.kulcs, l.ertek, l.osszegek);
  await allapotBeallitas(fa, 'p:' + masik.szerzo + 'x', { e: masik.azonosito }, [30]);
  await allapotBeallitas(fa, 'p:' + masik.szerzo, { e: masik.azonosito }, [25]);
  const gyoker = await allapotGyokere(fa);
  const helyek = mintaHelyek(gyoker.o[0], 32);
  const mintak = await fejlecMintai(fa, helyek);
  const e = await fejlecEllenorzese({ azonosito: x, gyoker, helyek, mintak, esemenyek: terkep });
  return !e.rendben && /mást mond/.test(e.ok);
});

proba('⛔ a hiányos válasz (kevesebb minta, mint a kért hely) és a máshová szóló minta elbukik', async () => {
  const { allapot, x, terkep } = await valodiAllapot();
  const { fa, gyoker } = await fejlec(allapot, x);
  const helyek = mintaHelyek(gyoker.o[0], 8);
  const mintak = await fejlecMintai(fa, helyek);
  const hianyos = await fejlecEllenorzese({ azonosito: x, gyoker, helyek, mintak: mintak.slice(1), esemenyek: terkep });
  const maskor = await fejlecEllenorzese({ azonosito: x, gyoker, helyek: helyek.map((r) => (r + 1) % gyoker.o[0]), mintak, esemenyek: terkep });
  return !hianyos.rendben && !maskor.rendben;
});

proba('a hiányzó pont-esemény nem hiba, csak kimondott (`hianyzoEsemeny`) — a kérdező elkérheti', async () => {
  const { allapot, x } = await valodiAllapot();
  const { fa, gyoker } = await fejlec(allapot, x);
  const helyek = mintaHelyek(gyoker.o[0], 16);
  const e = await fejlecEllenorzese({ azonosito: x, gyoker, helyek, mintak: await fejlecMintai(fa, helyek), esemenyek: new Map() });
  return e.rendben && e.ellenorzott === 0 && e.hianyzoEsemeny + e.gyerek === 16;
});

proba('⛔ az ÁTÍRT pont-esemény (az aláírás már nem stimmel) elbukik', async () => {
  const { allapot, x, terkep } = await valodiAllapot();
  // Ugyanaz az azonosító, de átírt tartalom — az esemény-térképben ez van a valódi helyett. A levél pontja is ehhez
  // igazodik, tehát csak az aláírás leplezheti le.
  const atirt = new Map(terkep);
  const o = osszPontokSzamitasa(allapot.entitasok);
  const levelek = reszfaLevelei(x, allapot, o, gyerekJegyzek(allapot.entitasok));
  const fa = ujAllapotFa(OSSZPONT_FA, 1);
  for (const l of levelek) {
    let osszegek = l.osszegek;
    if (l.kulcs.startsWith('p:') && l.ertek?.e) {
      const eredeti = terkep.get(l.ertek.e);
      atirt.set(l.ertek.e, { ...eredeti, adat: { ...eredeti.adat, pont: eredeti.adat.pont + 40 } });
      osszegek = [eredeti.adat.pont + 40];
    }
    await allapotBeallitas(fa, l.kulcs, l.ertek, osszegek);
  }
  const gyoker = await allapotGyokere(fa);
  const helyek = mintaHelyek(gyoker.o[0], 32);
  const e = await fejlecEllenorzese({ azonosito: x, gyoker, helyek, mintak: await fejlecMintai(fa, helyek), esemenyek: atirt });
  return !e.rendben && /nem hiteles/.test(e.ok);
});

export default futtatas;
