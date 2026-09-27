// koino/meres/osszegzoFaProba.js

// Felelősség: AZ ÖSSZEGZŐ MERKLE-FA próbája (D78 — `js/esemeny/osszegzoFa.js`), hálózat nélkül.
//
// Amit mér: (1) a napló-fa alakja a szabványé (RFC 6962), és a szerző csúcsaiból ugyanaz a gyökér
// jön, mint a teljes listából; (2) a napló bizonyítékai átmennek, a meghamisítottak elbuknak;
// (3) az állapot-fa NEM függ a sorrendtől, és törlés után is kanonikus; (4) a kulcs bizonyítéka a
// jelenlétet ÉS a hiányt is bizonyítja, a hamis bizonyíték elbukik; (5) ⭐ a változás a
// bizonyítékból PONTOSAN azt a gyökeret adja, amit a valódi fa — minden esetre (beszúrás üres helyre,
// két levél szétválása, felülírás, törlés feljebb csúszással, nem létező törlése); (6) a lenyomat a
// darabot és az összeget is fedi; (7) ⚠️ és ami a fa HATÁRA (D78 pontosítás): a rejtett negatív
// levelet az útba eső ellenőrzés nem látja — a teljes lista igen.
//
// ⚠️ A véletlen MAGVAS (a bukás megismételhető): ugyanaz a mag, ugyanaz a sorozat.

import { probaGyujtemeny } from './probaFuttato.js';
import {
  levelOsszegzes, csomopontOsszegzes, uresOsszegzes, azonosOsszegzes,
  naploGyokere, naploBizonyitek, naploBizonyitekEllenorzese, ujNaplo, naploHozzafuzes,
  naploCsucsGyokere, naploMerete,
  ujAllapotFa, allapotBeallitas, allapotTorles, allapotGyokere, allapotLista, allapotGyokereListabol,
  allapotBizonyitek, allapotBizonyitekEllenorzese, allapotValtozasa
} from '../js/esemeny/osszegzoFa.js';

const { proba, futtatas } = probaGyujtemeny('Az összegző Merkle-fa próbája (D78)');

const N = 'naplo';
const K = 'kiosztas';

/** Magvas véletlen (egy egyszerű LCG) — a bukás megismételhető. */
function magvas(mag) {
  let x = mag >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

/** n napló-levél (a kulcs egy „esemény-azonosító"). */
async function naploLevelek(n) {
  const ki = [];
  for (let i = 0; i < n; i++) ki.push(await levelOsszegzes(N, 'esemeny-' + i));
  return ki;
}

// ===================================
// A NAPLÓ-FA
// ===================================

proba('⭐ A NAPLÓ ALAKJA A SZABVÁNYÉ (RFC 6962): 3 és 5 levélnél a bal ág a legnagyobb kisebb kettőhatvány', async () => {
  const L = await naploLevelek(5);
  const cs = (a, b) => csomopontOsszegzes(N, a, b);
  const harom = await cs(await cs(L[0], L[1]), L[2]);
  const ot = await cs(await cs(await cs(L[0], L[1]), await cs(L[2], L[3])), L[4]);
  return azonosOsszegzes(await naploGyokere(N, L.slice(0, 3)), harom)
    && azonosOsszegzes(await naploGyokere(N, L), ot)
    && (await naploGyokere(N, [])).d === 0;
});

proba('⭐⭐ A SZERZŐ CSÚCSAIBÓL UGYANAZ A GYÖKÉR, mint a teljes listából — 0-tól 70 levélig és 257-nél', async () => {
  const L = await naploLevelek(257);
  let naplo = ujNaplo(N);
  for (let n = 0; n <= 257; n++) {
    if (n <= 70 || n === 257) {
      const teljes = await naploGyokere(N, L.slice(0, n));
      const csucsbol = await naploCsucsGyokere(naplo);
      if (!azonosOsszegzes(teljes, csucsbol) || naploMerete(naplo) !== n || teljes.d !== n) return false;
      // ⭐ A csúcsok száma legfeljebb log₂ n (+1) — ennyit tárol a szerző.
      if (naplo.csucsok.length > Math.floor(Math.log2(Math.max(n, 1))) + 1) return false;
    }
    if (n < 257) naplo = await naploHozzafuzes(naplo, L[n]);
  }
  return true;
});

proba('⭐⭐ A NAPLÓ BIZONYÍTÉKA minden méretnél és minden indexnél átmegy — és legfeljebb ⌈log₂ n⌉ lépés', async () => {
  const L = await naploLevelek(33);
  for (const n of [1, 2, 3, 5, 7, 8, 9, 16, 17, 33]) {
    const gyoker = await naploGyokere(N, L.slice(0, n));
    for (let i = 0; i < n; i++) {
      const b = await naploBizonyitek(N, L.slice(0, n), i);
      if (b.ut.length > Math.ceil(Math.log2(n))) return false;
      if (!await naploBizonyitekEllenorzese(N, L[i], b, gyoker)) return false;
    }
  }
  return true;
});

proba('⛔⛔ A MEGHAMISÍTOTT NAPLÓ-BIZONYÍTÉK ELBUKIK — más levél, más index, átírt testvér, más méret, csonka út', async () => {
  const L = await naploLevelek(13);
  const gyoker = await naploGyokere(N, L);
  const b = await naploBizonyitek(N, L, 6);
  const esetek = [
    ['eredeti', await naploBizonyitekEllenorzese(N, L[6], b, gyoker), true],
    ['más levél', await naploBizonyitekEllenorzese(N, L[7], b, gyoker), false],
    ['más index', await naploBizonyitekEllenorzese(N, L[6], { ...b, index: 7 }, gyoker), false],
    ['átírt testvér-lenyomat', await naploBizonyitekEllenorzese(N, L[6],
      { ...b, ut: b.ut.map((p, i) => (i === 1 ? { ...p, l: L[0].l } : p)) }, gyoker), false],
    ['más méret', await naploBizonyitekEllenorzese(N, L[6], { ...b, meret: 12 }, gyoker), false],
    ['csonka út', await naploBizonyitekEllenorzese(N, L[6], { ...b, ut: b.ut.slice(0, -1) }, gyoker), false],
    ['toldott út', await naploBizonyitekEllenorzese(N, L[6], { ...b, ut: [...b.ut, L[0]] }, gyoker), false],
    ['index a fán kívül', await naploBizonyitekEllenorzese(N, L[6], { ...b, index: 13 }, gyoker), false],
    ['hibás alak', await naploBizonyitekEllenorzese(N, L[6], { index: 6, meret: 13, ut: 'x' }, gyoker), false]
  ];
  const rossz = esetek.filter(([, kapott, vart]) => kapott !== vart).map(([nev]) => nev);
  if (rossz.length) console.log('    (rosszul ítélt esetek: ' + rossz.join(', ') + ')');
  return rossz.length === 0;
});

// ===================================
// AZ ÁLLAPOT-FA
// ===================================

/** Egy véletlen kiosztás: kulcs → pont (1–100). */
function veletlenKiosztas(veletlen, darab, elotag = 'entitas-') {
  const ki = [];
  for (let i = 0; i < darab; i++) ki.push({ kulcs: elotag + i, ertek: null, osszegek: [1 + Math.floor(veletlen() * 100)] });
  return ki;
}

/** Keverés (Fisher–Yates, magvasan). */
function kevert(veletlen, lista) {
  const ki = [...lista];
  for (let i = ki.length - 1; i > 0; i--) { const j = Math.floor(veletlen() * (i + 1)); [ki[i], ki[j]] = [ki[j], ki[i]]; }
  return ki;
}

proba('⭐⭐ AZ ÁLLAPOT-FA NEM FÜGG A SORRENDTŐL — két keverés és a listából épített ugyanazt a gyökeret adja', async () => {
  const v = magvas(1);
  const lista = veletlenKiosztas(v, 200);
  const gyokerek = [];
  for (let k = 0; k < 2; k++) {
    const fa = ujAllapotFa(K, 1);
    // ⚠️ Közbeiktatott felülírások is: az utolsó érték számít, nem a sorrend.
    for (const e of kevert(v, lista)) await allapotBeallitas(fa, e.kulcs, null, [e.osszegek[0] + 7]);
    for (const e of kevert(v, lista)) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
    gyokerek.push(await allapotGyokere(fa));
  }
  gyokerek.push(await allapotGyokereListabol(K, 1, lista));
  const osszeg = lista.reduce((s, e) => s + e.osszegek[0], 0);
  return azonosOsszegzes(gyokerek[0], gyokerek[1]) && azonosOsszegzes(gyokerek[0], gyokerek[2])
    && gyokerek[0].d === 200 && gyokerek[0].o[0] === osszeg;     // ⭐ a gyökér összege = a kiosztás
});

proba('⭐⭐ TÖRLÉS UTÁN IS KANONIKUS — a megmaradt levelek fája ugyanaz, mintha a törölteket be sem tettük volna', async () => {
  const v = magvas(2);
  const lista = veletlenKiosztas(v, 120);
  const fa = ujAllapotFa(K, 1);
  for (const e of lista) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const torlendo = new Set(kevert(v, lista).slice(0, 100).map((e) => e.kulcs));
  for (const kulcs of torlendo) await allapotTorles(fa, kulcs);
  await allapotTorles(fa, 'soha-nem-volt-benne');
  const marad = lista.filter((e) => !torlendo.has(e.kulcs));
  const listaEgyezik = allapotLista(fa).map((e) => e.kulcs).sort().join() === marad.map((e) => e.kulcs).sort().join();
  return listaEgyezik && azonosOsszegzes(await allapotGyokere(fa), await allapotGyokereListabol(K, 1, marad));
});

proba('⭐⭐ A KULCS BIZONYÍTÉKA a jelenlétet ÉS a hiányt is bizonyítja — mindkét fajta hiány-végponttal', async () => {
  const v = magvas(3);
  const lista = veletlenKiosztas(v, 150);
  const fa = ujAllapotFa(K, 1);
  for (const e of lista) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  for (const e of lista) {
    const b = await allapotBizonyitek(fa, e.kulcs);
    const ered = await allapotBizonyitekEllenorzese(K, 1, gyoker, e.kulcs, b);
    if (!ered.rendben || !ered.van || ered.osszegek[0] !== e.osszegek[0]) return false;
  }
  // ⚠️ A hiány két alakja: üres hely, vagy egy MÁSIK kulcs levele ott, ahol a miénknek kellene
  // lennie. Mindkettőnek elő kell fordulnia, különben a próba az egyiket nem méri.
  let uresVeg = 0, masLevelVeg = 0;
  for (let i = 0; i < 200; i++) {
    const kulcs = 'nincs-' + i;
    const b = await allapotBizonyitek(fa, kulcs);
    const ered = await allapotBizonyitekEllenorzese(K, 1, gyoker, kulcs, b);
    if (!ered.rendben || ered.van) return false;
    if (b.vegpont === null) uresVeg++; else masLevelVeg++;
  }
  return uresVeg > 0 && masLevelVeg > 0;
});

proba('⛔⛔ A HAMIS KULCS-BIZONYÍTÉK ELBUKIK — átírt érték, átírt testvér, idegen levél, csonka út, hibás alak', async () => {
  const v = magvas(4);
  const lista = veletlenKiosztas(v, 60);
  const fa = ujAllapotFa(K, 1);
  for (const e of lista) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  const kulcs = lista[10].kulcs;
  const b = await allapotBizonyitek(fa, kulcs);
  const masik = await allapotBizonyitek(fa, lista[40].kulcs);
  const ell = async (bb, k = kulcs) => (await allapotBizonyitekEllenorzese(K, 1, gyoker, k, bb)).rendben;
  const esetek = [
    ['eredeti', await ell(b), true],
    ['átírt érték', await ell({ ...b, vegpont: { ...b.vegpont, osszegek: [b.vegpont.osszegek[0] + 1] } }), false],
    ['átírt testvér-lenyomat', await ell({ ...b, testverek: b.testverek.map((t, i) => (i === 0 ? { ...t, l: masik.testverek[0].l === t.l ? 'A'.repeat(43) : masik.testverek[0].l } : t)) }), false],
    // Egy másik kulcs HELYES bizonyítéka a mi kulcsunkra: a levele nem a mi utunkon áll.
    ['idegen levél', await ell(masik), false],
    ['csonka út', await ell({ ...b, testverek: b.testverek.slice(1) }), false],
    ['hibás alak', await ell({ testverek: 'x', vegpont: null }), false],
    ['hiányzó végpont', await ell({ testverek: b.testverek }), false]
  ];
  const rossz = esetek.filter(([, kapott, vart]) => kapott !== vart).map(([nev]) => nev);
  if (rossz.length) console.log('    (rosszul ítélt esetek: ' + rossz.join(', ') + ')');
  return rossz.length === 0;
});

// ⛔⛔ A CSALÓ (NEM KANONIKUS) FA — amit csak kézzel lehet összerakni, és épp ezért kell próba rá: a
// szerző maga építi a fáját, tehát a bizonyíték ellenőrzése nem támaszkodhat arra, hogy becsületes.

/** Két kulcs, amelyek útja már az első biten elválik: [a balra megy, b jobbra]. */
async function ketElvaloKulcs() {
  for (let i = 1; ; i++) {
    const fa = ujAllapotFa(K, 1);
    await allapotBeallitas(fa, 'a', null, [1]);
    await allapotBeallitas(fa, 'b-' + i, null, [1]);
    const ba = await allapotBizonyitek(fa, 'a');
    if (ba.testverek.length !== 1) continue;
    // A gyökér node(bal, jobb): ha „a" a bal oldalon van, a testvére (a jobb) b levele.
    const La = await levelOsszegzes(K, 'a', null, [1]);
    const Lb = await levelOsszegzes(K, 'b-' + i, null, [1]);
    const aBalra = azonosOsszegzes(await allapotGyokere(fa), await csomopontOsszegzes(K, La, Lb));
    return aBalra ? { bal: 'a', jobb: 'b-' + i, Lbal: La, Ljobb: Lb } : { bal: 'b-' + i, jobb: 'a', Lbal: Lb, Ljobb: La };
  }
}

proba('⛔⛔ A CSALÓ FA HIÁNY-BIZONYÍTÉKA ELBUKIK — a rossz oldalra tett levél nem „bizonyítja", hogy a kulcs nincs benne', async () => {
  const { bal, jobb, Lbal, Ljobb } = await ketElvaloKulcs();
  // A csaló gyökér: a két levél FELCSERÉLVE (a „jobb" kulcs a bal oldalon áll).
  const csaloGyoker = await csomopontOsszegzes(K, Ljobb, Lbal);
  // A „bal" kulcs útja balra megy: ott a „jobb" kulcs levelét találja — a hash stimmel, és ha nem
  // néznénk, hogy a végpont a mi utunkon áll-e, a „bal" kulcs hiányzónak látszana.
  const ered = await allapotBizonyitekEllenorzese(K, 1, csaloGyoker, bal,
    { testverek: [Lbal], vegpont: { kulcs: jobb, ertek: null, osszegek: [1] } });
  return ered.rendben === false;
});

proba('⛔⛔ A CSALÓ FA NEM KANONIKUS CSOMÓPONTJA ELBUKIK — egy levél üres testvérrel (nem csúszott feljebb)', async () => {
  const { bal, Lbal } = await ketElvaloKulcs();
  const ures = await uresOsszegzes(K, 1);
  const csaloGyoker = await csomopontOsszegzes(K, Lbal, ures);          // node(levél, üres) — nem kanonikus
  const ered = await allapotBizonyitekEllenorzese(K, 1, csaloGyoker, bal,
    { testverek: [ures], vegpont: { kulcs: bal, ertek: null, osszegek: [1] } });
  return ered.rendben === false;
});

proba('⭐⭐⭐ A VÁLTOZÁS A BIZONYÍTÉKBÓL = A VALÓDI FA — 400 véletlen lépés, minden eset előfordul', async () => {
  const v = magvas(5);
  const fa = ujAllapotFa(K, 1);
  const bent = new Map();
  const esetek = { uresHelyre: 0, szetvalas: 0, feluliras: 0, torles: 0, feljebbCsuszas: 0, nemLetezoTorlese: 0 };
  for (let lepes = 0; lepes < 400; lepes++) {
    const r = v();
    let kulcs, uj;
    if (r < 0.45 || bent.size < 3) { kulcs = 'k-' + lepes; uj = { ertek: null, osszegek: [1 + Math.floor(v() * 50)] }; }
    else if (r < 0.65) { kulcs = [...bent.keys()][Math.floor(v() * bent.size)]; uj = { ertek: null, osszegek: [1 + Math.floor(v() * 50)] }; }
    else if (r < 0.95) { kulcs = [...bent.keys()][Math.floor(v() * bent.size)]; uj = null; }
    else { kulcs = 'soha-' + lepes; uj = null; }

    const regiGyoker = await allapotGyokere(fa);
    const b = await allapotBizonyitek(fa, kulcs);
    const szamitott = await allapotValtozasa(K, 1, regiGyoker, kulcs, b, uj);
    if (!szamitott.rendben) return false;

    // Az eset besorolása (a lefedettséghez).
    if (uj && !bent.has(kulcs)) esetek[b.vegpont === null ? 'uresHelyre' : 'szetvalas']++;
    else if (uj) esetek.feluliras++;
    else if (bent.has(kulcs)) { esetek.torles++; if (b.testverek.length && b.testverek[b.testverek.length - 1].d === 1) esetek.feljebbCsuszas++; }
    else esetek.nemLetezoTorlese++;

    if (uj) { await allapotBeallitas(fa, kulcs, uj.ertek, uj.osszegek); bent.set(kulcs, uj.osszegek[0]); }
    else { await allapotTorles(fa, kulcs); bent.delete(kulcs); }
    if (!azonosOsszegzes(szamitott.gyoker, await allapotGyokere(fa))) {
      console.log('    (eltérés a ' + lepes + '. lépésben)');
      return false;
    }
  }
  const hianyzik = Object.entries(esetek).filter(([, db]) => db === 0).map(([nev]) => nev);
  if (hianyzik.length) console.log('    (nem fordult elő: ' + hianyzik.join(', ') + ')');
  return hianyzik.length === 0;
});

proba('⛔ A VÁLTOZÁS HAMIS BIZONYÍTÉKBÓL NEM SZÁMOLHATÓ — elutasítás, nem csendes rossz gyökér', async () => {
  const fa = ujAllapotFa(K, 1);
  for (const e of veletlenKiosztas(magvas(6), 30)) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  const b = await allapotBizonyitek(fa, 'entitas-3');
  const hamis = { ...b, vegpont: { ...b.vegpont, osszegek: [0] } };   // „nálam csak 0 volt rajta"
  const ered = await allapotValtozasa(K, 1, gyoker, 'entitas-3', hamis, { ertek: null, osszegek: [9] });
  return ered.rendben === false;
});

// ⛔ A FENYEGETÉS: csak a gyökér LENYOMATA aláírt (az utazik az eseményben) — a hozzá mondott darabot
// és összeget a bizonyító adja. Egy hamis összeg csak akkor bukik le, ha a lenyomat köti.
// ⚠️ Rontás-próba tanulsága (2026-09-27): az első változat csak a TESTVÉR összegét írta át, és az
// úgyis lebukott a szülő összegén — a lenyomat fedését nem mérte.
proba('⛔ A LENYOMAT KÖTI A DARABOT ÉS AZ ÖSSZEGET — ha csak a gyökér lenyomata aláírt, a hozzá mondott szám sem hamisítható', async () => {
  const fa = ujAllapotFa(K, 1);
  for (const e of veletlenKiosztas(magvas(7), 40)) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  const b = await allapotBizonyitek(fa, 'entitas-5');
  // A hamisító a testvér összegét ÉS a gyökérhez mondott összeget egyformán megnöveli (a lenyomat marad).
  const t0 = b.testverek[0];
  const felfujt = (mezo) => ({
    b: { ...b, testverek: [{ ...t0, [mezo]: mezo === 'd' ? t0.d + 1000 : [t0.o[0] + 1000] }, ...b.testverek.slice(1)] },
    g: { ...gyoker, [mezo]: mezo === 'd' ? gyoker.d + 1000 : [gyoker.o[0] + 1000] }
  });
  const darab = felfujt('d');
  const osszeg = felfujt('o');
  const belsoDarab = await allapotBizonyitekEllenorzese(K, 1, darab.g, 'entitas-5', darab.b);
  const belsoOsszeg = await allapotBizonyitekEllenorzese(K, 1, osszeg.g, 'entitas-5', osszeg.b);
  // Az egyelemű fa: a gyökér MAGA a levél — ott a levél lenyomatának kell kötnie az összeget.
  const egy = ujAllapotFa(K, 1);
  await allapotBeallitas(egy, 'egyetlen', null, [7]);
  const egyGyoker = await allapotGyokere(egy);
  const egyB = await allapotBizonyitek(egy, 'egyetlen');
  const levelOsszeg = await allapotBizonyitekEllenorzese(K, 1, { ...egyGyoker, o: [9999] }, 'egyetlen',
    { ...egyB, vegpont: { ...egyB.vegpont, osszegek: [9999] } });
  return !belsoDarab.rendben && !belsoOsszeg.rendben && !levelOsszeg.rendben;
});

proba('⛔ A TÚL HOSSZÚ TESTVÉR-LISTÁT MUNKA NÉLKÜL ELUTASÍTJA — megnevezett okkal (az út minden eleme egy lenyomat)', async () => {
  const fa = ujAllapotFa(K, 1);
  for (const e of veletlenKiosztas(magvas(8), 10)) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  const b = await allapotBizonyitek(fa, 'entitas-1');
  const hosszu = { ...b, testverek: [...new Array(300).fill(b.testverek[0] ?? gyoker), ...b.testverek] };
  const ered = await allapotBizonyitekEllenorzese(K, 1, gyoker, 'entitas-1', hosszu);
  return ered.rendben === false && ered.ok.startsWith('túl hosszú');
});

proba('⚠️ A FA HATÁRA (D78 pontosítás): a rejtett NEGATÍV levelet az útba eső ellenőrzés nem látja — a teljes lista igen', async () => {
  // Egy csaló szerző „fája": a valódi kiosztás 15 000, egy nem létező entitáson −5000 — a gyökér 10 000.
  const valodi = [{ kulcs: 'e-1', ertek: null, osszegek: [8000] }, { kulcs: 'e-2', ertek: null, osszegek: [7000] }];
  const csalo = [...valodi, { kulcs: 'nem-letezo', ertek: null, osszegek: [-5000] }];
  const fa = ujAllapotFa(K, 1);
  for (const e of csalo) await allapotBeallitas(fa, e.kulcs, e.ertek, e.osszegek);
  const gyoker = await allapotGyokere(fa);
  // Az e-1 bizonyítéka HELYES, és a gyökér összege a keret alatt van: az útba eső ellenőrzés átengedi…
  const ered = await allapotBizonyitekEllenorzese(K, 1, gyoker, 'e-1', await allapotBizonyitek(fa, 'e-1'));
  const utonAtmegy = ered.rendben && ered.osszegek[0] === 8000 && gyoker.o[0] === 10000;
  // …a TELJES lista viszont a gyökérhez illik, és benne a negatív levél: átadható bizonyíték.
  const lista = allapotLista(fa);
  const listaIllik = azonosOsszegzes(await allapotGyokereListabol(K, 1, lista), gyoker);
  const negativLatszik = lista.some((e) => e.osszegek[0] < 0);
  return utonAtmegy && listaIllik && negativLatszik;
});

export default futtatas;
