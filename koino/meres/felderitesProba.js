// koino/meres/felderitesProba.js — A FELDERÍTÉS önpróbája (D108/1, D112 ③ — a tiszta számítások)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a felderítés beállítása, jegyzéke és lépése azt teszi, amit a D112 kimondott:
//   · a beállítás az alapértékekkel (K = 200, csak fejléc, 20 MB, 4 kérés / kör) és a határok közé szorítva (F4);
//   · egyszerre legfeljebb 8 futhat, együtt legfeljebb 1 GB; ugyanarra az ágra az újrafelderítés a régi helyére lép;
//   · a lépés: KÉSZ, ha a sorrend az első K-ig biztos (vagy az ág kisebb, és nincs mit kérni); KERET a méretnél;
//     ELAKADT két óra haladás nélkül; különben legfeljebb a beállított kérésszámot kéri;
//   · a 30 napnál régebbi pillanatkép elévül; a hibás jegyzék-bejegyzés kiesik.

import {
  felderitesBeallitasa, uresFelderitesJegyzek, felderitesJegyzekAlakja, ujFelderites, felderitesLepese, elevultFelderitesek,
  felderitesTorlese, FELDERITES_ALAP, FELDERITES_HATAR, FELDERITES_ELEVULES, FELDERITES_ELAKADAS, GYOKER_AG
} from '../js/allapot/felderites.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FELDERÍTÉS (D108/1, D112 ③)');

const AG = (c) => c.repeat(43);
const MB = 1024 * 1024;

// Rontás: a határ nincs érvényesítve (a K vagy az MB) → a túl nagy átmegy → bukik; az alapérték hiányzik → bukik.
proba('⭐ D112 (F4): a beállítás az alapértékekkel, a határok közé szorítva — a hibás ág nem ág', () => {
  const alap = felderitesBeallitasa({ ag: AG('a') });
  const nagy = felderitesBeallitasa({ ag: AG('a'), k: 99999, melyseg: 500, mb: 99999, keresKor: 99, torzs: true });
  const kicsi = felderitesBeallitasa({ k: 0, mb: 0, keresKor: 0, melyseg: -3 });
  let hibas = false;
  try { felderitesBeallitasa({ ag: 'rovid' }); } catch { hibas = true; }
  return alap.k === FELDERITES_ALAP.k && alap.mb === FELDERITES_ALAP.mb && alap.torzs === false && alap.melyseg === null
    && alap.keresKor === FELDERITES_ALAP.keresKor
    && nagy.k === FELDERITES_HATAR.k && nagy.melyseg === FELDERITES_HATAR.melyseg && nagy.mb === FELDERITES_HATAR.mb
    && nagy.keresKor === FELDERITES_HATAR.keresKor && nagy.torzs === true
    && kicsi.ag === GYOKER_AG && kicsi.k === 1 && kicsi.mb === 1 && kicsi.keresKor === 1 && kicsi.melyseg === 0 && hibas;
});

// Rontás: a futók száma nincs nézve → a kilencedik is elindul → bukik; az együttes méret nincs nézve → bukik; az
// újrafelderítés új bejegyzést nyit → két felderítés egy ágra → bukik.
proba('⭐ D112 (F4): egyszerre legfeljebb 8 futhat, együtt legfeljebb 1 GB — ugyanarra az ágra az újrafelderítés a régi helyére lép', () => {
  let j = uresFelderitesJegyzek();
  for (let i = 0; i < FELDERITES_HATAR.aktiv; i++) j = ujFelderites(j, { ag: AG(String.fromCharCode(97 + i)) }, 1000, 'f' + i).jegyzek;
  let kilencedik = false;
  try { ujFelderites(j, { ag: AG('z') }, 1000, 'f9'); } catch { kilencedik = true; }
  const ujra = ujFelderites(j, { ag: AG('a'), k: 50 }, 2000, 'masik');
  let tulNagy = false;
  try {
    let k = uresFelderitesJegyzek();
    k = ujFelderites(k, { ag: AG('a'), mb: 500 }, 1, 'x1').jegyzek;
    k = ujFelderites(k, { ag: AG('b'), mb: 500 }, 1, 'x2').jegyzek;
    ujFelderites(k, { ag: AG('c'), mb: 100 }, 1, 'x3');
  } catch { tulNagy = true; }
  return kilencedik && tulNagy && ujra.ujra && ujra.felderites.az === 'f0' && ujra.felderites.k === 50
    && ujra.jegyzek.felderitesek.length === FELDERITES_HATAR.aktiv && ujra.felderites.allapot === 'fut';
});

// Rontás: a „kész” feltétele hiányzik → soha nem zárul → bukik; a méret nincs nézve → bukik; az elakadás nincs nézve → bukik;
// a kérésszám nem a beállított → bukik.
proba('⭐⭐ D112 ③: a lépés — kész (az első K biztos, vagy a kisebb ág teljes), keret (a méret), elakadt (2 óra), különben kér', () => {
  const f = ujFelderites(uresFelderitesJegyzek(), { ag: AG('a'), k: 10, mb: 2, keresKor: 3 }, 1000, 'f').felderites;
  const lep = (allas, most = 2000) => felderitesLepese(f, { ismert: 0, latszik: 0, biztos: 0, hianyzik: 0, agIsmert: true, bajt: 0, ...allas }, most);
  const fut = lep({ ismert: 20, latszik: 10, biztos: 4, hianyzik: 5 });
  const keszK = lep({ ismert: 20, latszik: 10, biztos: 10, hianyzik: 5 });
  const keszKicsi = lep({ ismert: 4, latszik: 4, biztos: 4, hianyzik: 0 });
  const nemKeszKicsi = lep({ ismert: 4, latszik: 4, biztos: 4, hianyzik: 1 });
  const agNemIsmert = lep({ ismert: 0, latszik: 0, biztos: 0, hianyzik: 0, agIsmert: false });
  const keret = lep({ ismert: 20, latszik: 10, biztos: 4, hianyzik: 5, bajt: 2 * MB });
  const elakadt = lep({ ismert: 20, latszik: 0, biztos: 0, hianyzik: 5 }, 1000 + FELDERITES_ELAKADAS + 1);
  const haladt = lep({ ismert: 20, latszik: 3, biztos: 2, hianyzik: 5 }, 1000 + FELDERITES_ELAKADAS + 1);
  const lezartNemKer = felderitesLepese({ ...keszK.f }, { ismert: 20, latszik: 10, biztos: 4, hianyzik: 5, agIsmert: true, bajt: 0 }, 3000);
  return fut.f.allapot === 'fut' && fut.kerj === 3 && keszK.f.allapot === 'kesz' && keszK.kerj === 0
    && keszKicsi.f.allapot === 'kesz' && nemKeszKicsi.f.allapot === 'fut' && agNemIsmert.f.allapot === 'fut'
    && keret.f.allapot === 'keret' && /méret/.test(keret.f.ok) && elakadt.f.allapot === 'elakadt'
    && haladt.f.allapot === 'fut' && lezartNemKer.kerj === 0 && lezartNemKer.f.allapot === 'kesz';
});

// Rontás: az elévülés nincs nézve → a régi pillanatkép soha nem esik ki → bukik; a hibás bejegyzés átjut → bukik.
proba('⭐ D112: a 30 napnál régebbi pillanatkép elévül; a jegyzék alakja a hibás bejegyzést elveti; a törlés kiveszi', () => {
  let j = ujFelderites(uresFelderitesJegyzek(), { ag: AG('a') }, 0, 'regi').jegyzek;
  j = ujFelderites(j, { ag: AG('b') }, FELDERITES_ELEVULES, 'friss').jegyzek;
  const elevult = elevultFelderitesek(j, FELDERITES_ELEVULES + 10);
  const alak = felderitesJegyzekAlakja({ felderitesek: [...j.felderitesek, { az: 'rossz', ag: 'x', allapot: 'fut' },
    { az: 'r2', ag: AG('c'), allapot: 'ismeretlen' }, null] });
  const torolt = felderitesTorlese(j, 'regi');
  return elevult.join() === 'regi' && alak.felderitesek.length === 2 && torolt.felderitesek.map((f) => f.az).join() === 'friss';
});

export default futtatas;
