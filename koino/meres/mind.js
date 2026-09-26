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
// ⭐ A kulcs-réteg lapja 2026-09-15-ig hiányzott — a személyazonosság volt méretlen.
import kulcs from './kulcsProba.js';
import esemeny from './esemenyProba.js';
import tar from './tarProba.js';
import allapot from './allapotProba.js';
import javaslat from './javaslatProba.js';
import szabaly from './szabalyProba.js';
import csere from './csereProba.js';
import fajlCsere from './fajlCsereProba.js';
import tarsak from './tarsakProba.js';
import identitas from './identitasProba.js';
import kapu from './kapuProba.js';
import pakli from './pakliProba.js';
import ter from './terProba.js';
import fajl from './fajlProba.js';
import fajlIgeny from './fajlIgenyProba.js';
import fajlKerelem from './fajlKerelemProba.js';
import fajlAtvitel from './fajlAtvitelProba.js';
import egyezmeny from './egyezmenyProba.js';
import felszabaditas from './felszabaditasProba.js';
import parancssor from './parancssorProba.js';
import vizsga from './vizsgaProba.js';
import dht from './dhtProba.js';
import kotes from './kotesProba.js';
import tabla from './tablaProba.js';
// ⭐ Az állandó UDP-kapu (D69/3, 2026-09-25) — hamis munkával, a kapu szabályai egymagukban.
import udpKapu from './udpKapuProba.js';
// ⭐ Az író (D70, 2026-09-26) — koinónként és készülékenként egy folyamat fűz a tárhoz.
import iro from './iroProba.js';
import szovegDarab from './szovegDarabProba.js';

const PROBAK = [
  { nev: 'kanonikus', futtat: kanonikus },
  { nev: 'kulcs', futtat: kulcs },
  { nev: 'esemeny', futtat: esemeny },
  { nev: 'tar', futtat: tar },
  { nev: 'allapot', futtat: allapot },
  { nev: 'javaslat', futtat: javaslat },
  { nev: 'szabaly', futtat: szabaly },
  { nev: 'csere', futtat: csere },
  { nev: 'fajlcsere', futtat: fajlCsere },
  { nev: 'tarsak', futtat: tarsak },
  { nev: 'identitas', futtat: identitas },
  { nev: 'kapu', futtat: kapu },
  { nev: 'pakli', futtat: pakli },
  { nev: 'ter', futtat: ter },
  { nev: 'fajl', futtat: fajl },
  { nev: 'fajligeny', futtat: fajlIgeny },
  { nev: 'fajlkerelem', futtat: fajlKerelem },
  { nev: 'fajlatvitel', futtat: fajlAtvitel },
  { nev: 'egyezmeny', futtat: egyezmeny },
  { nev: 'felszabaditas', futtat: felszabaditas },
  { nev: 'parancssor', futtat: parancssor },
  { nev: 'vizsga', futtat: vizsga },
  { nev: 'dht', futtat: dht },
  { nev: 'kotes', futtat: kotes },
  { nev: 'tabla', futtat: tabla },
  { nev: 'udpkapu', futtat: udpKapu },
  { nev: 'iro', futtat: iro },
  { nev: 'szovegdarab', futtat: szovegDarab }
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
const ismertHibak = [];

for (const p of futtatandok) {
  const eredmeny = await p.futtat();
  osszes += eredmeny.osszes;
  sikeres += eredmeny.sikeres;
  for (const b of eredmeny.bukottak) bukottak.push(p.nev + ': ' + b);
  for (const h of eredmeny.ismertHibak ?? []) ismertHibak.push(p.nev + ': ' + h);
}

const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', vastag: '', vege: '' };

console.log('\n' + SZIN.vastag + '───── ÖSSZESEN ─────' + SZIN.vege);
// ⭐ Az ismert hibák ELŐBB, az összegzés UTOLJÁRA — a telefon `tail -3`-ja így is az összegzést
// látja (lásd `probaFuttato.js`, „AZ ISMERT HIBA").
if (ismertHibak.length) {
  kiir('⚠️ ' + ismertHibak.length + ' ISMERT HIBA nyitva — a próbája a javításig bukik:');
  for (const h of ismertHibak) kiir('   · ' + h);
}
const ismert = ismertHibak.length ? ' · ⚠️ ' + ismertHibak.length + ' ismert hiba nyitva' : '';
if (bukottak.length) {
  kiir(SZIN.nem + '❌ ' + bukottak.length + ' próba BUKOTT (' + osszes + '-ből)' + ismert + SZIN.vege);
  for (const b of bukottak) kiir('   · ' + b);
  process.exit(1);
} else {
  kiir(SZIN.jo + '✅ Mind a ' + sikeres + ' próba rendben' + ismert + SZIN.vege);
}
