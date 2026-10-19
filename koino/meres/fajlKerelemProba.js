// koino/meres/fajlKerelemProba.js — A FÁJL-KÉRELEM önpróbája (a szállítás középső darabja)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a bulin **kiderül, kinél van meg**, amire szükségem van — és hogy közben
// egyik szabályt sem lépjük át:
//
//   · ⛔ **csak arra felelünk, amit kérdeztek** (a teljes fájl-listám elárulná, mit néztem
//     meg — D6), és a kérdés is korlátos (6. szabály);
//   · ⭐ **a ritkábbat előbb** (Csaba döntése) — de ⛔ **„ki mennyit adott" mérleg NÉLKÜL**,
//     mert az rangsor lenne (D18/2, D48);
//   · ⚠️ amit tanulunk, az **helyi feljegyzés** (3. szabály), nem esemény.

import {
  kerelemOsszeallitasa, valaszOsszeallitasa, birtoklasBeolvasztasa, ritkasagSzerint, birtoklasTakaritasa,
  KERELEM_KORLAT
} from '../js/csere/fajlKerelem.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FÁJL-KÉRELEM — kinél van meg? (5.7)');

const L = (n) => String(n).padStart(43, 'x');

// ===================================
// 1. AMIT KÉRDEZEK
// ===================================

proba('⛔⛔ A KÉRELEM FELÜLRŐL KORLÁTOS — a csere-kör mérete a 6. szabály alatt marad',
  async () => {
    // ⚠️ TÖBB hiányzó, mint a korlát — különben a próba VAK lenne (ugyanaz a tanulság,
    // mint a pakli `MAX_DARAB`-jánál: a korlátot csak fölötte lehet mérni).
    const hianyzok = [];
    for (let i = 0; i < KERELEM_KORLAT + 20; i++) hianyzok.push({ lenyomat: L(i) });

    const kerelem = kerelemOsszeallitasa(hianyzok);
    return kerelem.length === KERELEM_KORLAT && kerelem[0] === L(0);
  });

proba('⭐ A kérelem a MEGADOTT sorrendet követi (a vállaltak előre)', async () => {
  const kerelem = kerelemOsszeallitasa([
    { lenyomat: L(7), vallaltam: true },
    { lenyomat: L(1), vallaltam: false }
  ]);
  return kerelem[0] === L(7) && kerelem[1] === L(1);
});

// ===================================
// 2. ⛔⛔ AMIT VÁLASZOLOK — csak amit kérdeztek
// ===================================

proba('⛔⛔ CSAK A KÉRDEZETTEKRŐL beszélünk — a fájl-listám nem szivárog ki (D6)', async () => {
  // ⚠️ Nálam MEGVAN az L(9) is, de nem kérdezték — tehát nem mondjuk el. *A fájl-listám
  // elárulná, mit néztem meg, akkor is, ha a kérdező sosem hallott arról a gondolatról.*
  const nalam = new Set([L(1), L(2), L(9)]);
  const van = await valaszOsszeallitasa([L(1), L(3)], async (l) => nalam.has(l));
  return van.length === 1 && van[0] === L(1) && !van.includes(L(9));
});

proba('⛔ A KÉRDÉST is korlátozzuk — százezer lenyomat nem indíthat százezer lemez-kérdést',
  async () => {
    let kerdesek = 0;
    const kertek = [];
    for (let i = 0; i < 500; i++) kertek.push(L(i));

    await valaszOsszeallitasa(kertek, async () => { kerdesek++; return false; });
    return kerdesek === KERELEM_KORLAT;
  });

proba('⭐ Üres kérdésre üres válasz, nem hiba', async () => {
  return (await valaszOsszeallitasa([], async () => true)).length === 0
    && (await valaszOsszeallitasa(null, async () => true)).length === 0;
});

// ===================================
// 3. ⚠️ A BIRTOKLÁS-JEGYZET — helyi feljegyzés
// ===================================

proba('⭐ A tanult birtoklás társanként gyűlik', async () => {
  let jegyzet = birtoklasBeolvasztasa({}, 'anna:7373', [L(1), L(2)], 1000);
  jegyzet = birtoklasBeolvasztasa(jegyzet, 'bela:7373', [L(1)], 2000);

  return Object.keys(jegyzet[L(1)].tarsak).length === 2
    && jegyzet[L(1)].tarsak['anna:7373'] === 1000
    && jegyzet[L(1)].tarsak['bela:7373'] === 2000
    && Object.keys(jegyzet[L(2)].tarsak).length === 1;
});

proba('⭐ A jegyzet NEM íródik át helyben — a régi példány érintetlen marad', async () => {
  // ⚠️ Nem szépészeti: ha helyben írnánk át, egy félbeszakadt kör a memóriában már
  // „megtörténtnek" látszana, holott a lemezre sosem került ki.
  const regi = {};
  const uj = birtoklasBeolvasztasa(regi, 'anna:7373', [L(1)]);
  return Object.keys(regi).length === 0 && Object.keys(uj).length === 1;
});

// Rontás: az új hír eldobja a tétel többi mezőjét → a romlott eltűnik → bukik; a cím nem kerül be → bukik.
proba('⭐ D114 (T5): a birtoklás a társ nevével és CÍMÉVEL gyűlik — és a bukott lezárás tanulsága megmarad', async () => {
  const regi = { [L(1)]: { tarsak: { anna: 1000 }, romlott: { anna: 1000 } } };
  const uj = birtoklasBeolvasztasa(regi, 'bela', [L(1)], 2000, '9.9.9.9:7373');
  return uj[L(1)].romlott?.anna === 1000 && uj[L(1)].tarsak.bela === 2000 && uj[L(1)].cimek?.bela === '9.9.9.9:7373'
    && uj[L(1)].tarsak.anna === 1000;
});

// Rontás: nincs fájlonkénti korlát → bukik; az elévült hír marad → bukik; nincs összes korlát → bukik.
proba('⛔ D114 (T5): a birtoklás jegyzete KORLÁTOS — fájlonként a legfrissebb 8, az elévült kiesik, összesen a legutóbbiak', async () => {
  const NAP = 24 * 3600 * 1000;
  const most = 100 * NAP;
  let j = {};
  for (let i = 0; i < 12; i++) j = birtoklasBeolvasztasa(j, 't' + i, [L(1)], most - i * 1000, '1.1.1.1:' + (i + 1));
  j = birtoklasBeolvasztasa(j, 'regi', [L(2)], most - 40 * NAP);
  j = birtoklasBeolvasztasa(j, 'x', [L(3)], most - 2000);
  j = birtoklasBeolvasztasa(j, 'y', [L(4)], most - 1000);
  const t = birtoklasTakaritasa(j, { most });
  const ketto = birtoklasTakaritasa(j, { most, fajlKorlat: 2 });
  const l1 = Object.keys(t[L(1)].tarsak);
  return l1.length === 8 && l1.includes('t0') && !l1.includes('t11') && Object.keys(t[L(1)].cimek).length === 8
    && !t[L(2)] && Object.keys(ketto).length === 2 && !!ketto[L(1)] && !!ketto[L(4)];
});

// ===================================
// 4. ⭐ A RITKÁBBAT ELŐBB
// ===================================

proba('⭐⭐ A RITKÁBB fájl előbbre kerül — a veszélyeztetettet mentjük először', async () => {
  const jegyzet = birtoklasBeolvasztasa(
    birtoklasBeolvasztasa({}, 'a', [L(1)]), 'b', [L(1)]);   // L(1): két birtokos

  const sorrend = ritkasagSzerint(
    [{ lenyomat: L(1), vallaltam: false }, { lenyomat: L(2), vallaltam: false }], jegyzet);

  // L(2)-ről semmit nem tudunk (0 birtokos) → az a ritkább, az megy előre.
  return sorrend[0].lenyomat === L(2) && sorrend[0].birtokosok === 0
    && sorrend[1].lenyomat === L(1) && sorrend[1].birtokosok === 2;
});

proba('⛔⛔ DE A VÁLLALÁS ERŐSEBB a ritkaságnál (D3: a tudatpont tárolási vállalás)',
  async () => {
    // ⚠️ Az L(1) vállalt, de SOK birtokosa van; az L(2) ritka, de nem vállaltam.
    // ⭐ A vállalás nyer: *amit magamra vettem, az az én dolgom.*
    let jegyzet = {};
    for (const t of ['a', 'b', 'c']) jegyzet = birtoklasBeolvasztasa(jegyzet, t, [L(1)]);

    const sorrend = ritkasagSzerint(
      [{ lenyomat: L(2), vallaltam: false }, { lenyomat: L(1), vallaltam: true }], jegyzet);
    return sorrend[0].lenyomat === L(1) && sorrend[0].vallaltam === true;
  });

proba('⭐ Holtversenynél a LENYOMAT dönt — a sorrend sosem esetleges', async () => {
  const sorrend = ritkasagSzerint(
    [{ lenyomat: L(5) }, { lenyomat: L(3) }, { lenyomat: L(4) }], {});
  // ⚠️ Két készüléknek ugyanabból az állapotból ugyanazt a sorrendet kell kapnia.
  return sorrend.map((h) => h.lenyomat).join() === [L(3), L(4), L(5)].join();
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/fajlKerelemProba.js
if (process.argv[1] && process.argv[1].endsWith('fajlKerelemProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
