// koino/meres/csereAllapotProba.js — A CSERE ÁLLAPOTA A LAPNAK önpróbája (az alsó sáv, 2026-10-15)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a lap alsó sávja igazat mond a cseréről — és hogy a frissítés jele csak akkor lép, ha tényleg van mit frissíteni:
//
//   · az őrjárat köre (kezdet, vég, a következő ablak) és az utolsó csere egy feljegyzésbe kerül (`csereAllapot.js`);
//   · ⭐ az „új eseményt hozott” időpont (`utolsoUj`) CSAK új eseménynél lép — a „nincs újdonság” csere nem rajzoltatja
//     újra a lapot;
//   · ⛔ ha az őrjárat nem jelentkezik (két ablak + tartalék), a lap azt mondja: nem fut — nem egy régi visszaszámlálást;
//   · a sérült fájl nem töri el a lapot (a hiány kimondva), és a folyamaton belüli egyidejű írások nem vesznek el;
//   · ⭐⭐ M7: a BELÉPÉS ÚTJA — elfogadva → bejelentkezett → kopog (próbálkozásonként) → kapcsolat → tag; a kopogás csak célos
//     körben és a kapcsolat előtt számít, a lejárt meghívónál semmi nem lép, a „bent vagy” néhány perc múlva eltűnik, és a
//     régi tagnak nem mond „bent vagy”-ot.
//
// A bekötést (az őrjárat valóban írja, a felület valóban adja) a `parancssorProba.js` méri, viselkedéssel.

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { csereAllapotTarolo } from '../js/tar/fajlTar.js';
import {
  uresCsereAllapot, csereAllapotAlakja, korKezdete, korVege, csereFeljegyzese, csereAllapotKepe, ORJARAT_TARTALEK,
  belepesKezdete, belepesJelentkezese, belepesKopogasa, belepesKapcsolata, belepesTagsaga, belepesKepe,
  BELEPES_SEGITSEG, BELEPES_KESZ_LATSZIK, BELEPES_LEJART_LATSZIK
} from '../js/csere/csereAllapot.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A CSERE ÁLLAPOTA A LAPNAK (az alsó sáv)');

const PERC = 60 * 1000;

proba('⭐ A kör és a csere egy feljegyzésben — a lap látja, hogy köröz-e, mikor jön a következő ablak, és mi volt az utolsó csere', () => {
  const t0 = Date.UTC(2026, 9, 15, 12, 0, 0);
  let a = uresCsereAllapot();
  const ures = csereAllapotKepe(a, t0);
  a = korKezdete(a, { perc: 1, port: 7373, most: t0 });
  const kozben = csereAllapotKepe(a, t0 + 5000);
  a = csereFeljegyzese(a, { uj: 3, kuldott: 1, most: t0 + 8000 });
  a = korVege(a, { perc: 1, port: 7373, kovetkezo: t0 + PERC, sikeres: 1, celok: 2, uj: 3, most: t0 + 10000 });
  const utana = csereAllapotKepe(a, t0 + 20000);
  const ki = {
    ures: !ures.orjarat.fut && ures.utolsoCsere === null && ures.utolsoUj === null,
    kozben: kozben.orjarat.fut && kozben.orjarat.korFut && kozben.orjarat.kovetkezo === null,
    utana: utana.orjarat.fut && !utana.orjarat.korFut && utana.orjarat.kovetkezo === t0 + PERC && utana.orjarat.perc === 1,
    kor: utana.orjarat.utolsoKor?.sikeres === 1 && utana.orjarat.utolsoKor.celok === 2 && utana.orjarat.utolsoKor.uj === 3
      && utana.orjarat.utolsoKor.ido === t0 + 10000,
    csere: utana.utolsoCsere?.ido === t0 + 8000 && utana.utolsoCsere.uj === 3 && utana.utolsoCsere.kuldott === 1
      && utana.utolsoUj === t0 + 8000 && utana.ujOsszes === 3
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ⭐ A frissítés jele: a lap az `utolsoUj` változásából tudja, hogy újra kell rajzolnia. Ha a „nincs újdonság” csere is
// léptetné, a lap minden körben újrarajzolna (villogás, és a néző kiválasztása is elmozdulhatna).
// Rontás: az `ujIdo` minden cserénél lép → a második csere után az `utolsoUj` változik → bukik.
proba('⭐ Az „új eseményt hozott” jel CSAK új eseménynél lép — a „nincs újdonság” csere nem frissíttet', () => {
  const t0 = Date.UTC(2026, 9, 15, 12, 0, 0);
  let a = csereFeljegyzese(uresCsereAllapot(), { uj: 2, kuldott: 0, most: t0 });
  const elso = csereAllapotKepe(a, t0);
  a = csereFeljegyzese(a, { uj: 0, kuldott: 4, most: t0 + 60000 });
  const masodik = csereAllapotKepe(a, t0 + 60000);
  a = csereFeljegyzese(a, { uj: 1, kuldott: 0, most: t0 + 120000 });
  const harmadik = csereAllapotKepe(a, t0 + 120000);
  return elso.utolsoUj === t0 && masodik.utolsoUj === t0 && masodik.utolsoCsere.ido === t0 + 60000
    && masodik.utolsoCsere.uj === 0 && harmadik.utolsoUj === t0 + 120000 && harmadik.ujOsszes === 3;
});

// ⛔ Egy leállított őrjárat utolsó feljegyzése nem hazudhat visszaszámlálást. A határ a kör üteméből jön (két ablak —
// egy kör maga is eltarthat egy ablaknyit — és a tartalék), nem egy varázsszámból.
// Rontás: a frissesség vizsgálata kikapcsolva → a régi feljegyzés is „fut” → bukik.
proba('⛔ Ha az őrjárat nem jelentkezik (két ablak + tartalék), a lap azt mondja: nem fut — és nincs következő kör', () => {
  const t0 = Date.UTC(2026, 9, 15, 12, 0, 0);
  const a = korVege(uresCsereAllapot(), { perc: 5, port: 7373, kovetkezo: t0 + 5 * PERC, sikeres: 0, celok: 1, uj: 0, most: t0 });
  const hatar = 2 * 5 * PERC + ORJARAT_TARTALEK;
  const meg = csereAllapotKepe(a, t0 + hatar);
  const mar = csereAllapotKepe(a, t0 + hatar + 1);
  return meg.orjarat.fut === true && mar.orjarat.fut === false && mar.orjarat.kovetkezo === null
    && mar.orjarat.korFut === false && mar.orjarat.utolsoJel === t0;
});

proba('⚠️ A sérült feljegyzés nem töri el a lapot: ami nem illik, kiesik (a hiány kimondva)', () => {
  const rossz = csereAllapotAlakja({ kor: { perc: -1, port: 99999, fut: 'igen', frissitve: 'tegnap', kovetkezo: NaN },
    csere: { ido: 'most', uj: 3 } });
  const tomb = csereAllapotAlakja({ kor: [], csere: [] });
  const semmi = csereAllapotAlakja(null);
  const kep = csereAllapotKepe(rossz, Date.now());
  return rossz.csere === null && rossz.kor.perc === null && rossz.kor.port === null && rossz.kor.fut === false
    && rossz.kor.frissitve === null && kep.orjarat.fut === false && tomb.kor === null && tomb.csere === null
    && semmi.kor === null && semmi.csere === null;
});

// ⭐⭐ M7: A BELÉPÉS ÚTJA a lapnak (Csaba, 2026-11-04: „értesítse a meghívottat, hogy a készüléke éppen próbálja felvenni az első
// kapcsolatot, és jelezhetné a próbálkozásokat is”). A lépések sorban; a kép mindig a legelőrébb tartó lépést mondja.
// Rontás: (a) a kopogás a kapcsolat után is számol → a kapcsolat utáni kör léptet → bukik; (b) a cél nélküli kör is számol → bukik;
// (c) a kép a lépések sorrendje helyett az utolsó írást mondja → a kapcsolat után jött jelentkezés „jelentkezett”-et mutat → bukik.
proba('⭐⭐ M7: a belépés útja — elfogadva → bejelentkezett → kopog (próbálkozásonként) → kapcsolat → tag, a kép mindig a legelőrébb lépés', () => {
  const t0 = Date.UTC(2026, 10, 4, 21, 0, 0);
  const lejar = t0 + 30 * 24 * 3600 * 1000;
  let a = belepesKezdete(uresCsereAllapot(), { elfogadva: t0, lejar });
  const k1 = csereAllapotKepe(a, t0 + 1000).belepes;
  a = belepesJelentkezese(a, { gepek: 8, kovetkezo: t0 + 21 * PERC, most: t0 + PERC });
  const k2 = belepesKepe(a.belepes, t0 + 2 * PERC);
  a = belepesKopogasa(a, { celok: 2, most: t0 + 2 * PERC });
  a = belepesKopogasa(a, { celok: 0, most: t0 + 3 * PERC });            // cél nélküli kör: nem kopogott
  a = belepesKopogasa(a, { celok: 1, most: t0 + 4 * PERC });
  const k3 = belepesKepe(a.belepes, t0 + 4 * PERC + 1000);
  a = belepesKapcsolata(a, { most: t0 + 5 * PERC });
  a = belepesKopogasa(a, { celok: 2, most: t0 + 6 * PERC });            // a kapcsolat után már nem próbálkozás
  a = belepesKapcsolata(a, { most: t0 + 7 * PERC });                    // a második nem írja felül az elsőt
  a = belepesJelentkezese(a, { gepek: 5, kovetkezo: t0 + 27 * PERC, most: t0 + 7 * PERC });
  const k4 = belepesKepe(a.belepes, t0 + 7 * PERC);
  a = belepesTagsaga(a, { most: t0 + 8 * PERC });
  const k5 = belepesKepe(a.belepes, t0 + 9 * PERC);
  a = belepesTagsaga(a, { most: t0 + 10 * PERC });                      // egyszer
  const k6 = belepesKepe(a.belepes, t0 + 8 * PERC + BELEPES_KESZ_LATSZIK + 1);
  const ki = {
    elfogadva: k1?.allapot === 'elfogadva' && k1.elfogadva === t0 && k1.lejar === lejar && k1.kopogas.szam === 0 && !k1.segitseg,
    jelentkezett: k2?.allapot === 'jelentkezett' && k2.jelentkezes?.gepek === 8 && k2.jelentkezes.kovetkezo === t0 + 21 * PERC,
    kopog: k3?.allapot === 'kopog' && k3.kopogas.szam === 2 && k3.kopogas.utolso === t0 + 4 * PERC && k3.kapcsolat === null,
    kapcsolat: k4?.allapot === 'kapcsolat' && k4.kapcsolat === t0 + 5 * PERC && k4.kopogas.szam === 2,
    tag: k5?.allapot === 'tag' && k5.tag === t0 + 8 * PERC,
    eltunik: k6 === null
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ⭐ M7: a sáv igazat mond a szélein is. Rontás: (a) a „legközelebb” a múltban is látszik → bukik; (b) a segítő mondat a kapcsolat
// után is → bukik; (c) a lejárt meghívónál a kopogás tovább számol → bukik; (d) a régi tagnál (a kezdet a tagsággal) „bent vagy”
// látszik → bukik.
proba('⭐ M7: a sáv szélei — a múltbeli „legközelebb” nem látszik, a segítő mondat fél óra után (kapcsolatig), a lejárt meghívó nem lép, a régi tag nem „bent vagy”', () => {
  const t0 = Date.UTC(2026, 10, 4, 21, 0, 0);
  const lejar = t0 + 24 * 3600 * 1000;
  let a = belepesKezdete(uresCsereAllapot(), { elfogadva: t0, lejar });
  a = belepesJelentkezese(a, { gepek: 0, kovetkezo: t0 + 20 * PERC, most: t0 + PERC });
  const elmult = belepesKepe(a.belepes, t0 + 25 * PERC);
  const segitsegElotte = belepesKepe(a.belepes, t0 + BELEPES_SEGITSEG - 1);
  const segitseg = belepesKepe(a.belepes, t0 + BELEPES_SEGITSEG);
  const kapcsolattal = belepesKepe(belepesKapcsolata(a, { most: t0 + 40 * PERC }).belepes, t0 + 41 * PERC);
  // a lejárat után semmi nem lép, és a kép kimondja
  let l = belepesKopogasa(a, { celok: 2, most: lejar + 1 });
  l = belepesKapcsolata(l, { most: lejar + 2 });
  const lejartKep = belepesKepe(l.belepes, lejar + 3);
  const lejartRegi = belepesKepe(l.belepes, lejar + BELEPES_LEJART_LATSZIK + 1);
  // a régi tag: a kezdet a tagsággal (a régebben elfogadott meghívó) — a kép semmit nem mutat
  const regiTag = belepesKepe(belepesKezdete(uresCsereAllapot(), { elfogadva: t0 - 9 * 24 * 3600 * 1000, lejar, tag: t0 - 8 * 24 * 3600 * 1000 }).belepes, t0);
  // a sérült rész kiesik, az ép megmarad (a fájl alakja)
  const alak = csereAllapotAlakja({ belepes: { elfogadva: t0, lejar: 'holnap', kopogas: -3, jelentkezes: { ido: 'x' }, tag: null } });
  const ures = csereAllapotAlakja({ belepes: { kopogas: 4 } });
  const ki = {
    elmult: elmult?.jelentkezes?.ido === t0 + PERC && elmult.jelentkezes.kovetkezo === null,
    segitseg: segitsegElotte?.segitseg === false && segitseg?.segitseg === true && kapcsolattal?.segitseg === false,
    lejart: lejartKep?.allapot === 'lejart' && lejartKep.kopogas.szam === 0 && lejartKep.kapcsolat === null && lejartRegi === null,
    regiTag: regiTag === null,
    alak: alak.belepes?.elfogadva === t0 && alak.belepes.lejar === null && alak.belepes.kopogas === 0
      && alak.belepes.jelentkezes === null && ures.belepes === null && uresCsereAllapot().belepes === null
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ⭐ A tároló: a fájl a koinó mappájában, a módosítások a folyamaton belül sorban (az őrjárat körének vége és egy
// bekopogó cseréje egyszerre írhat). Rontás: a sor nélkül a párhuzamos módosítások egymást írják felül → bukik.
proba('⭐ A tároló: a feljegyzés a koinó mappájában, a párhuzamos módosítások sorban (egy sem vész el), a sérült fájl üres', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-csereallapot-'));
  const t = csereAllapotTarolo('proba', hely, csereAllapotAlakja);
  const t0 = Date.UTC(2026, 9, 15, 12, 0, 0);
  await Promise.all(Array.from({ length: 12 }, (_, i) => t.modosit((a) => csereFeljegyzese(a, { uj: 1, kuldott: 0, most: t0 + i }))));
  const a = await t.olvas();
  const fajl = JSON.parse(await readFile(join(hely, 'proba', 'csere.json'), 'utf8'));
  await writeFile(join(hely, 'proba', 'csere.json'), '{ ez nem json', 'utf8');
  const serult = await t.olvas();
  const ujra = await csereAllapotTarolo('proba', hely, csereAllapotAlakja).modosit((x) => korKezdete(x, { perc: 1, port: 1, most: t0 }));
  return a.csere?.ujOsszes === 12 && fajl.csere?.ujOsszes === 12 && serult.kor === null && serult.csere === null
    && ujra?.kor?.fut === true;
});

export default futtatas;
