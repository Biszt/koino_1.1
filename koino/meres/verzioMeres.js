// koino/meres/verzioMeres.js

// Felelősség: megmérni, MI TÖRTÉNIK, ha két készülék **eltérő program-állandókkal** olvassa
// UGYANAZOKAT az eseményeket.
//
// ===== ⛔⛔ MIÉRT (2026-09-11) =====
//
// A koino alapmondata: *ugyanazokból az eseményekből ugyanaz jön ki* (D17). ⚠️ Ez csak
// AZONOS PROGRAM-VERZIÓ mellett igaz — a `TUDATPONT_KERET`, a `KATEGORIA_KORLAT` és az
// `ALAP_KUSZOBOK` a **programban** van, nem az eseményekben.
//
// Ez a mérés azt dönti el, hogy ez **elméleti aggodalom-e vagy mérhető kár**. ⭐ Ha nem
// történik semmi baj, akkor az érvelés a hibás, nem a kód.
//
// ===== HOGYAN =====
//
// Két lépés, mert ugyanazt az esemény-halmazt kell KÉT programnak elolvasnia:
//
//   node koino/meres/verzioMeres.js ir      → legyártja az eseményeket egy fájlba
//   node koino/meres/verzioMeres.js olvas   → beolvassa és kiírja, mit SZÁMOL belőle
//
// A kettő között a `szabalyok.js` állandóját kézzel átírjuk (rontás-próba módjára,
// `.bak` másolattal — ⛔ SOHA nem `git checkout`-tal), és újra olvassuk. Az esemény-halmaz
// bájtra ugyanaz; csak a programot cseréltük.
//
// ⭐ A mérce az `allapotUjjlenyomata` — a koino saját műszere arra, hogy „ugyanazt
// látjuk-e?" —, és az `elteresek`, ami megmondja, MELYIK szakaszban térnek el.

import './naplo.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { ujEember } from './probaFuttato.js';
import { TUDATPONT_KERET } from '../js/allapot/szabalyok.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { allapotOsszefoglaloja, allapotUjjlenyomata } from '../js/allapot/osszehasonlitas.js';

const FAJL = new URL('./verzioMeres.esemenyek.json', import.meta.url);
const KEZDET = Date.UTC(2026, 0, 1);
const MOST = KEZDET + 30 * 24 * 3600 * 1000;

const kiir = (szoveg) => process.stdout.write(szoveg + '\n');

/**
 * ⭐ A KULCS-ESET: a kiosztott összeg a két keret KÖZÉ esik.
 *
 * Négy gondolat, egyenként 2000 pont → összesen 8000. Ez a 10 000-es keretben rendben van,
 * az 5000-esben viszont a harmadik esemény már túllépné — vagyis a két program **más
 * esemény-halmazt** tart érvényesnek, ugyanabból a láncból.
 */
async function esemenyekIrasa() {
  const gazda = await ujEember();
  const esemenyek = [];

  for (let i = 1; i <= 4; i++) {
    const g = await gazda.tesz('GondolatLetrehozas',
      { cim: 'GONDOLAT ' + i, meret: 10 }, KEZDET + i);
    esemenyek.push(g);
    esemenyek.push(await gazda.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 2000 }, KEZDET + 100 + i));
  }

  writeFileSync(FAJL, JSON.stringify(esemenyek, null, 1), 'utf-8');
  kiir('\nLegyártva: 4 gondolat, egyenként 2000 tudatpont (összesen 8000).');
  kiir('A fájl: ' + FAJL.pathname);
  kiir('A gyártó program kerete: ' + TUDATPONT_KERET);
  kiir('\nMost írd át a `szabalyok.js`-ben a TUDATPONT_KERET-et (pl. 5000-re), és futtasd:');
  kiir('  node koino/meres/verzioMeres.js olvas\n');
}

/** Ugyanaz a lánc, EZZEL a programmal elolvasva. */
async function esemenyekOlvasasa() {
  const esemenyek = JSON.parse(readFileSync(FAJL, 'utf-8'));
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(esemenyek, allapot, MOST);

  const osszefoglalo = allapotOsszefoglaloja(allapot, javaslatok);
  const ujjlenyomat = await allapotUjjlenyomata(allapot, javaslatok);

  let osszPont = 0;
  for (const e of allapot.entitasok.values()) osszPont += e.osszesPont;

  kiir('\nEZ A PROGRAM EZT SZÁMOLJA UGYANABBÓL A ' + esemenyek.length + ' ESEMÉNYBŐL:');
  kiir('  TUDATPONT_KERET (ebben a programban): ' + TUDATPONT_KERET);
  kiir('  létező entitás:        ' + allapot.entitasok.size);
  kiir('  összes tudatpont:      ' + osszPont);
  kiir('  KIVÉTEL (kihagyott):   ' + allapot.kivetelek.length);
  for (const k of allapot.kivetelek) kiir('      · ' + k.ok);
  kiir('  ⭐ ÁLLAPOT-UJJLENYOMAT: ' + ujjlenyomat);
  kiir('\n  (a szakaszok: ' + Object.keys(osszefoglalo).join(', ') + ')\n');
}

const parancs = process.argv[2];
if (parancs === 'ir') await esemenyekIrasa();
else if (parancs === 'olvas') await esemenyekOlvasasa();
else {
  kiir('\nHasználat:');
  kiir('  node koino/meres/verzioMeres.js ir      — legyártja az eseményeket');
  kiir('  node koino/meres/verzioMeres.js olvas   — kiírja, mit SZÁMOL belőlük ez a program\n');
}
