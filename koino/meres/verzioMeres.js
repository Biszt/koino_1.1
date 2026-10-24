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
// ===== ⭐⭐ A MEGISMÉTELT MÉRÉS (D118/2 ①b, 2026-10-24) =====
//
// Az ①b óta a szabályok a koinó SZÜLETÉSÉBEN állnak (`koinoSzabalyok.js`), és a program az új születésbe MINDET kiírja.
// A mérés ugyanazt a láncot KÉT koinóban gyártja le: egy régi alakúban (a születésnek nincs `szabalyok` mezője — ott a
// program mai értéke dönt) és egy új alakúban (minden szabály a születésben). ⭐ A várt eredmény: a program-állandó
// átírása a régi alakút kettéhasítja (ezért nem változhat soha a mai érték), az új alakút nem.
// *(A régi mérés születés és tagság nélküli eseményeket gyártott — a D93/1 óta abból semmi nem számítana.)*
//
// ===== HOGYAN =====
//
// Két lépés, mert ugyanazt az esemény-halmazt kell KÉT programnak elolvasnia:
//
//   node koino/meres/verzioMeres.js ir      → legyártja az eseményeket egy fájlba
//   node koino/meres/verzioMeres.js olvas   → beolvassa és kiírja, mit SZÁMOL belőle
//
// A kettő között a `koinoSzabalyok.js` `ALAP_SZABALYOK.tudatpontKeret`-jét kézzel átírjuk (rontás-próba módjára,
// `.bak` másolattal — ⛔ SOHA nem `git checkout`-tal), és újra olvassuk. Az esemény-halmaz
// bájtra ugyanaz; csak a programot cseréltük.
//
// ⭐ A mérce az `allapotUjjlenyomata` — a koino saját műszere arra, hogy „ugyanazt
// látjuk-e?" —, és az `elteresek`, ami megmondja, MELYIK szakaszban térnek el.

import './naplo.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { ujEember } from './probaFuttato.js';
import { TUDATPONT_KERET } from '../js/allapot/szabalyok.js';
import { teljesSzabalyok } from '../js/esemeny/koinoSzabalyok.js';
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
 *
 * ⭐ Az alapító maga a szerző (ő az egyetlen tag — a pontjai a D93/1 szerint is számítanak).
 * @param {boolean} ujAlak - új alakú születés (a koinó neve a lenyomata, minden szabály benne), vagy régi (mező nélkül)
 */
async function koinoLanca(ujAlak) {
  const gazda = await ujEember(ujAlak ? '' : 'verzio-regi');
  const szuletes = await gazda.tesz('KoinoLetrehozas', {
    nev: ujAlak ? 'Új alakú' : 'Régi alakú', leiras: null, alapitok: [], zart: true,
    ...(ujAlak ? { szabalyok: teljesSzabalyok() } : {})
  }, KEZDET);
  if (ujAlak) gazda.koinotValt(szuletes.azonosito);
  const esemenyek = [szuletes];

  for (let i = 1; i <= 4; i++) {
    const g = await gazda.tesz('GondolatLetrehozas',
      { cim: 'GONDOLAT ' + i, meret: 10 }, KEZDET + i);
    esemenyek.push(g);
    esemenyek.push(await gazda.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 2000 }, KEZDET + 100 + i));
  }
  return esemenyek;
}

async function esemenyekIrasa() {
  const lancok = { regi: await koinoLanca(false), uj: await koinoLanca(true) };
  writeFileSync(FAJL, JSON.stringify(lancok, null, 1), 'utf-8');
  kiir('\nLegyártva két koinóban (régi és új alakú születés): 4 gondolat, egyenként 2000 tudatpont (összesen 8000).');
  kiir('A fájl: ' + FAJL.pathname);
  kiir('A gyártó program mai kerete: ' + TUDATPONT_KERET);
  kiir('\nMost írd át a `koinoSzabalyok.js`-ben az ALAP_SZABALYOK.tudatpontKeret-et (pl. 5000-re), és futtasd:');
  kiir('  node koino/meres/verzioMeres.js olvas\n');
}

/** Ugyanaz a lánc, EZZEL a programmal elolvasva — mindkét koinóban. */
async function esemenyekOlvasasa() {
  const lancok = JSON.parse(readFileSync(FAJL, 'utf-8'));
  kiir('\nEZ A PROGRAM (mai kerete: ' + TUDATPONT_KERET + ') EZT SZÁMOLJA UGYANABBÓL A LÁNCBÓL:');
  for (const [nev, esemenyek] of Object.entries(lancok)) {
    const allapot = allapotSzamitasa(esemenyek);
    const javaslatok = javaslatokSzamitasa(esemenyek, allapot, MOST);
    const osszefoglalo = allapotOsszefoglaloja(allapot, javaslatok);
    const ujjlenyomat = await allapotUjjlenyomata(allapot, javaslatok);

    let osszPont = 0;
    for (const e of allapot.entitasok.values()) osszPont += e.osszesPont;

    kiir('\n  ' + (nev === 'uj' ? 'AZ ÚJ ALAKÚ KOINÓ (minden szabály a születésben)' : 'A RÉGI ALAKÚ KOINÓ (a születésben nincs szabály)')
      + ' — ' + esemenyek.length + ' esemény');
    kiir('    a keret, amivel számol: ' + allapot.koino?.szabalyok?.tudatpontKeret);
    kiir('    létező entitás:        ' + allapot.entitasok.size);
    kiir('    összes tudatpont:      ' + osszPont);
    kiir('    KIVÉTEL (kihagyott):   ' + allapot.kivetelek.length);
    for (const k of allapot.kivetelek) kiir('        · ' + k.ok);
    kiir('    ⭐ ÁLLAPOT-UJJLENYOMAT: ' + ujjlenyomat);
    kiir('    (a szakaszok: ' + Object.keys(osszefoglalo).join(', ') + ')');
  }
  kiir('');
}

const parancs = process.argv[2];
if (parancs === 'ir') await esemenyekIrasa();
else if (parancs === 'olvas') await esemenyekOlvasasa();
else {
  kiir('\nHasználat:');
  kiir('  node koino/meres/verzioMeres.js ir      — legyártja az eseményeket');
  kiir('  node koino/meres/verzioMeres.js olvas   — kiírja, mit SZÁMOL belőlük ez a program\n');
}
