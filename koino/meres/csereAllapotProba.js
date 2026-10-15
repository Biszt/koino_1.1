// koino/meres/csereAllapotProba.js — A CSERE ÁLLAPOTA A LAPNAK önpróbája (az alsó sáv, 2026-10-15)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a lap alsó sávja igazat mond a cseréről — és hogy a frissítés jele csak akkor lép, ha tényleg van mit frissíteni:
//
//   · az őrjárat köre (kezdet, vég, a következő ablak) és az utolsó csere egy feljegyzésbe kerül (`csereAllapot.js`);
//   · ⭐ az „új eseményt hozott” időpont (`utolsoUj`) CSAK új eseménynél lép — a „nincs újdonság” csere nem rajzoltatja
//     újra a lapot;
//   · ⛔ ha az őrjárat nem jelentkezik (két ablak + tartalék), a lap azt mondja: nem fut — nem egy régi visszaszámlálást;
//   · a sérült fájl nem töri el a lapot (a hiány kimondva), és a folyamaton belüli egyidejű írások nem vesznek el.
//
// A bekötést (az őrjárat valóban írja, a felület valóban adja) a `parancssorProba.js` méri, viselkedéssel.

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { csereAllapotTarolo } from '../js/tar/fajlTar.js';
import {
  uresCsereAllapot, csereAllapotAlakja, korKezdete, korVege, csereFeljegyzese, csereAllapotKepe, ORJARAT_TARTALEK
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
