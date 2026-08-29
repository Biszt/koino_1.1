// koino/meres/mind.js

// Felelősség: az ÖSSZES önpróba lefuttatása egy paranccsal.
//
//   node koino/meres/mind.js            → mind, részletesen
//   node koino/meres/mind.js szabaly    → csak amelyik nevében szerepel a szó
//
// A kilépési kód 1, ha bármi bukott — így egy szkript is észreveszi, nem csak a szem.
//
// Miért nincs teszt-könyvtár? Mert nem kell: a próbák tiszta függvényeket mérnek, és a
// keretrendszer csak egy újabb dolog lenne, amiben meg kellene bízni.

// ⚠️ EZ AZ ELSŐ IMPORT, ÉS EZ FONTOS: elnémítja a naplót, mielőtt a próba-fájlok
// betöltődnének (az `import` sorok a modul törzse ELŐTT futnak le).
import { kiir } from './naplo.js';

import kanonikus from './kanonikusProba.js';
import esemeny from './esemenyProba.js';
import tar from './tarProba.js';
import allapot from './allapotProba.js';
import javaslat from './javaslatProba.js';
import szabaly from './szabalyProba.js';
import csere from './csereProba.js';
import tarsak from './tarsakProba.js';
import vizsga from './vizsgaProba.js';

const PROBAK = [
  { nev: 'kanonikus', futtat: kanonikus },
  { nev: 'esemeny', futtat: esemeny },
  { nev: 'tar', futtat: tar },
  { nev: 'allapot', futtat: allapot },
  { nev: 'javaslat', futtat: javaslat },
  { nev: 'szabaly', futtat: szabaly },
  { nev: 'csere', futtat: csere },
  { nev: 'tarsak', futtat: tarsak },
  { nev: 'vizsga', futtat: vizsga }
];

const szuro = process.argv[2];
const futtatandok = szuro
  ? PROBAK.filter((p) => p.nev.includes(szuro.toLowerCase()))
  : PROBAK;

if (!futtatandok.length) {
  console.error('Nincs ilyen próba: ' + szuro);
  console.error('Választható: ' + PROBAK.map((p) => p.nev).join(', '));
  process.exit(2);
}

let osszes = 0, sikeres = 0;
const bukottak = [];

for (const p of futtatandok) {
  const eredmeny = await p.futtat();
  osszes += eredmeny.osszes;
  sikeres += eredmeny.sikeres;
  for (const b of eredmeny.bukottak) bukottak.push(p.nev + ': ' + b);
}

const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', vastag: '', vege: '' };

console.log('\n' + SZIN.vastag + '───── ÖSSZESEN ─────' + SZIN.vege);
if (bukottak.length) {
  kiir(SZIN.nem + '❌ ' + bukottak.length + ' próba BUKOTT (' + osszes + '-ből)' + SZIN.vege);
  for (const b of bukottak) kiir('   · ' + b);
  process.exit(1);
} else {
  kiir(SZIN.jo + '✅ Mind a ' + osszes + ' próba rendben' + SZIN.vege);
}
