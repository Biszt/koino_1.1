// koino/meres/darabMeres.js

// Felelősség: ⭐ A 81. MÉRÉS — MENNYIBE KERÜL AZ ÖSSZ-DARAB A VONALON (D116)? Nem önpróba: számokat ad, nem igen/nem-et.
//
// Valódi aláírt eseményekből egy véletlen fát épít (a gyökér alatt, legfeljebb `MELYSEG` szint, csomópontonként legfeljebb
// `TESTVER` gyerek, gondolatonként 1–3 szerző pontjával), és a gyökérre két fejléc-kérelem útját méri a kérelem saját
// függvényeivel (`kerelem.js` — a vonal ugyanezeket a JSON-üzeneteket küldi): (a) a gyökér szintje egy szinten (a lap első
// kérdése), (b) a legerősebb ág mélyen, 50 fejléccel (a bogár kérése). Üzenetenként a bájtok: FEJLECEK (a lista), MINTAKEREK
// (a helyek), MINTAK (a minták és az események) — és hány minta-gyerek születése utazott külön.
//
// ⭐ A RÉGI kóddal is futtatható (`KOINO_KOD=<egy régebbi koino/js mappa>`, pl. `git archive 15afaf3 koino/js`): ugyanaz a fa,
// ugyanaz a mérés — így a D116 többlete a kettő különbsége. A minta-helyek véletlenek (a kérdező sorsolja): a minták mérete
// futásonként kicsit ingadozik, ezért `ISMETLES` futás átlaga.
//
// Futtatás: node koino/meres/darabMeres.js [gondolatok ...]   (alapból 60 és 400)

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { ujEember, tagokkal } from './probaFuttato.js';

const KOD = process.env.KOINO_KOD ? pathToFileURL(resolve(process.env.KOINO_KOD)).href : new URL('../js', import.meta.url).href;
const { fejlecekValasza, mintaKeres, mintakValasza, fejlecekEllenorzese } = await import(KOD + '/csere/kerelem.js');
const { reszfaKarbantarto } = await import(KOD + '/allapot/osszPont.js');
const { allapotSzamitasa } = await import(KOD + '/allapot/allapotSzamitas.js');
const { GYOKER_KULCS } = await import(KOD + '/csere/szeletEgyeztetes.js');

const MELYSEG = 8, TESTVER = 8, SZERZOK = 5, ISMETLES = 20;
const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');

// Determinisztikus véletlen (a fa minden futásnál ugyanaz — a régi és az új kód ugyanazt méri).
let mag = 116;
const vel = () => { mag = (Math.imul(mag, 1664525) + 1013904223) >>> 0; return mag / 2 ** 32; };
const egesz = (a, b) => a + Math.floor(vel() * (b - a + 1));

async function fa(n) {
  mag = 116 + n;
  const emberek = [];
  for (let i = 0; i < SZERZOK; i++) emberek.push(await ujEember('meres'));
  const es = [];
  const csomopontok = [{ melyseg: 0, gyerek: 0 }];
  const gyoker = await emberek[0].tesz('GondolatLetrehozas', { cim: 'GYÖKÉR', meret: 10 });
  es.push(gyoker);
  csomopontok[0].az = gyoker.azonosito;
  // a gyökérnek TESTVER gyereke, a többi véletlenül (a sekélyebb nagyobb eséllyel)
  while (csomopontok.length < n) {
    const jeloltek = csomopontok.filter((c) => c.melyseg < MELYSEG && c.gyerek < TESTVER);
    const elsok = csomopontok[0].gyerek < TESTVER ? [csomopontok[0]] : null;
    const sulyok = jeloltek.map((c) => MELYSEG + 1 - c.melyseg);
    let r = vel() * sulyok.reduce((a, b) => a + b, 0), i = 0;
    while ((r -= sulyok[i]) > 0) i++;
    const szulo = elsok ? elsok[0] : jeloltek[i];
    const e = await emberek[egesz(0, SZERZOK - 1)].tesz('GondolatLetrehozas',
      { cim: 'Ág ' + csomopontok.length, meret: 10, szulo: szulo.az });
    es.push(e);
    szulo.gyerek++;
    csomopontok.push({ az: e.azonosito, melyseg: szulo.melyseg + 1, gyerek: 0 });
  }
  for (const c of csomopontok) {
    const db = egesz(1, 3);
    for (const ki of [...emberek].sort(() => vel() - 0.5).slice(0, db)) {
      es.push(await ki.tesz('TudatpontRendezes', { entitas: c.az, pont: egesz(1, 40) }));
    }
  }
  const allapot = await allapotSzamitasa(await tagokkal(es));
  return { allapot, terkep: new Map(es.map((e) => [e.azonosito, e])), gyoker: gyoker.azonosito };
}

// A minta-számok (a kérdező választja): `KOINO_MINTA=kd,kg,td,tg` — a kiválasztott és a testvérek darab és gyerek szerinti
// mintái (a pont szerintiek a 62. méréséi: 8 és 4).
const MINTA = process.env.KOINO_MINTA ? (() => {
  const [kd, kg, td, tg] = process.env.KOINO_MINTA.split(',').map(Number);
  return { kivalasztott: 8, testver: 4, testverDb: 3, kivalasztottDarab: kd, kivalasztottGyerek: kg, testverDarab: td,
    testverGyerek: tg };
})() : undefined;

async function kerdes(v, kulcs, n, m) {
  const olvaso = async (az) => v.terkep.get(az) ?? null;
  const ossz = { fejlecek: 0, kerek: 0, mintak: 0, szuletes: 0, hibas: 0 };
  for (let i = 0; i < ISMETLES; i++) {
    const r = await fejlecekValasza({ allapot: v.allapot, kulcs, n, m, karbantarto: reszfaKarbantarto(), esemenyOlvas: olvaso });
    const kert = mintaKeres(r.valasz, MINTA ? { minta: MINTA } : {});
    const mv = await mintakValasza({ fak: r.fak, kert, esemenyOlvas: olvaso, letrehozoAz: r.letrehozoAz, listazott: r.listazott });
    const e = await fejlecekEllenorzese({ valasz: r.valasz, kert, mintak: mv.mintak, esemenyek: mv.esemenyek });
    ossz.fejlecek += bajt({ uzenet: 'FEJLECEK', ...r.valasz });
    ossz.kerek += bajt({ uzenet: 'MINTAKEREK', kert, megvan: [] });
    ossz.mintak += bajt({ uzenet: 'MINTAK', ...mv });
    ossz.szuletes += mv.esemenyek.filter((x) => x.tipus !== 'TudatpontRendezes').length;
    ossz.hibas += e.hibas;
  }
  const kb = (x) => (x / ISMETLES / 1024).toFixed(1).padStart(5);
  return `FEJLECEK ${kb(ossz.fejlecek)} KB · MINTAKEREK ${kb(ossz.kerek)} KB · MINTAK ${kb(ossz.mintak)} KB · együtt `
    + `${kb(ossz.fejlecek + ossz.kerek + ossz.mintak)} KB · születés a mintákkal ${(ossz.szuletes / ISMETLES).toFixed(1)}`
    + (ossz.hibas ? ` · ⚠️ ${ossz.hibas} hibás` : '');
}

const meretek = process.argv.slice(2).map(Number).filter((x) => x > 1);
console.log('A 81. mérés — az össz-darab a vonalon · kód: ' + (process.env.KOINO_KOD ?? 'a mai')
  + (MINTA ? ' · minták (kd,kg,td,tg): ' + process.env.KOINO_MINTA : '') + '\n');
for (const n of meretek.length ? meretek : [60, 400]) {
  const v = await fa(n);
  const legjobb = [...v.allapot.entitasok.values()].filter((e) => e.szulo === v.gyoker)
    .sort((a, b) => (b.osszesPont - a.osszesPont))[0]?.azonosito;
  console.log(`${n} gondolat (≤ ${MELYSEG} szint, ≤ ${TESTVER} testvér):`);
  console.log('  a gyökér szintje (egy szinten, 20):  ' + await kerdes(v, GYOKER_KULCS, 20, false));
  console.log('  a gyökér-gondolat mélyen (50):       ' + await kerdes(v, v.gyoker, 50, true));
  if (legjobb) console.log('  egy első szintű ág mélyen (50):      ' + await kerdes(v, legjobb, 50, true));
  console.log('');
}
