// koino/meres/mind.js

// Felelősség: az ÖSSZES önpróba lefuttatása egy paranccsal — vagy csak egy témakörükéi.
//
//   node koino/meres/mind.js               → mind, részletesen
//   node koino/meres/mind.js fa            → egy CSOPORT (lásd lent: CSOPORTOK)
//   node koino/meres/mind.js fa csere      → több csoport együtt
//   node koino/meres/mind.js eszlelo       → egyetlen próba-fájl (ha a neve nem csoport)
//   node koino/meres/mind.js csak csere    → egyetlen próba-fájl akkor is, ha a neve csoport is
//
// A kilépési kód 1, ha bármi bukott — így egy szkript is észreveszi, nem csak a szem. A 2 azt
// jelenti, hogy nem is futott semmi (ismeretlen név, vagy hibás a besorolás).
//
// Miért nincs teszt-könyvtár? Mert nem kell: a próbák tiszta függvényeket mérnek, és a
// keretrendszer csak egy újabb dolog lenne, amiben meg kellene bízni.

// ⚠️ EZ AZ ELSŐ IMPORT, ÉS EZ FONTOS: elnémítja a naplót, mielőtt a próba-fájlok
// betöltődnének (az `import` sorok a modul törzse ELŐTT futnak le).
import { kiir } from './naplo.js';

import { readdirSync } from 'node:fs';

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
// ⭐ A tartomány-egyeztetés (S4, D74, 2026-09-27) — hálózat nélkül. (2026-10-01-ig „egyeztetes”
// volt a neve, mert a részszó-szűrő a `tar`-ra a tár-próbákkal együtt indította volna.)
import tartomany from './tartomanyProba.js';
// ⭐ Az összegző Merkle-fa (D78, 2026-09-27) — a két elrendezés, a bizonyítékok, a változás.
import osszegzoFa from './osszegzoFaProba.js';
// ⭐ A szerző lánc-gyökere (D78, az A pillér 2. lépése) — az új események `lancGyoker`-e.
import lancGyoker from './lancGyokerProba.js';
// ⭐ Az ellentmondás bizonyítéka (D79, D80) — a kapu, a szabály és a bejelentés.
import ellentmondas from './ellentmondasProba.js';
// ⭐ Az észlelő (D82) — a beérkezett események körül bizonyítható ellentmondások.
import eszlelo from './eszleloProba.js';
// ⭐ A döntési csomag (D85 T3, a (B)) — a csak-G1-nézet a csomaggal ugyanazt számolja.
import dontesiCsomag from './dontesiCsomagProba.js';
// ⭐ A csere titkosítása (D89/1) — a kriptográfia, és hogy a lehallgató semmit nem lát.
import titkositas from './titkositasProba.js';
import cimjegyzek from './cimjegyzekProba.js';
import osszpont from './osszPontProba.js';
import kerelem from './kerelemProba.js';
import tagsag from './tagsagProba.js';
// ⭐ A vállalás és az átmeneti tár (B/1–B/2, D75) — a kapu, az eldobás, a D14 csak a tartósra.
import atmeneti from './atmenetiProba.js';
// ⭐ D95/1: a lezárási összegzés — a nagy szeletű érintett döntése az összegző tartónak.
import lezarasiOsszegzes from './lezarasiOsszegzesProba.js';
// ⭐ D95/1, D95/3: a két fokú vállalás szerepei a valódi cserén.
import osszegzoTartas from './osszegzoTartasProba.js';
import tagsagKisero from './tagsagKiseroProba.js';
import gyokerDarab from './gyokerDarabProba.js';
import kozosHalmaz from './kozosHalmazProba.js';
import reszvetel from './reszvetelProba.js';
import tarsEmlekezet from './tarsEmlekezetProba.js';
import lancEllenorzes from './lancEllenorzesProba.js';

// ⚠️ A név a fájl neve, kisbetűvel, a „Proba.js” nélkül — a besorolás-őr ezen méri, hogy minden
// próba-fájl itt van-e. A sorrend a teljes sor futási sorrendje (egy csoport is ebben fut).
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
  { nev: 'dontesicsomag', futtat: dontesiCsomag },
  { nev: 'lezarasiosszegzes', futtat: lezarasiOsszegzes },
  { nev: 'felszabaditas', futtat: felszabaditas },
  { nev: 'parancssor', futtat: parancssor },
  { nev: 'vizsga', futtat: vizsga },
  { nev: 'dht', futtat: dht },
  { nev: 'kotes', futtat: kotes },
  { nev: 'tabla', futtat: tabla },
  { nev: 'udpkapu', futtat: udpKapu },
  { nev: 'iro', futtat: iro },
  { nev: 'atmeneti', futtat: atmeneti },
  { nev: 'szovegdarab', futtat: szovegDarab },
  { nev: 'tartomany', futtat: tartomany },
  { nev: 'titkositas', futtat: titkositas },
  { nev: 'cimjegyzek', futtat: cimjegyzek },
  { nev: 'osszpont', futtat: osszpont },
  { nev: 'kerelem', futtat: kerelem },
  { nev: 'osszegzotartas', futtat: osszegzoTartas },
  { nev: 'tagsagkisero', futtat: tagsagKisero },
  { nev: 'gyokerdarab', futtat: gyokerDarab },
  { nev: 'kozoshalmaz', futtat: kozosHalmaz },
  { nev: 'reszvetel', futtat: reszvetel },
  { nev: 'tarsemlekezet', futtat: tarsEmlekezet },
  { nev: 'lancellenorzes', futtat: lancEllenorzes },
  { nev: 'tagsag', futtat: tagsag },
  { nev: 'osszegzofa', futtat: osszegzoFa },
  { nev: 'lancgyoker', futtat: lancGyoker },
  { nev: 'ellentmondas', futtat: ellentmondas },
  { nev: 'eszlelo', futtat: eszlelo }
];

// ===== A CSOPORTOK (Csaba, 2026-10-01) =====
//
// ⛔⛔ A PRÓBÁK RENDJE: fejlesztés közben a változott témakör csoportja fut; a TELJES sor csak ha
// KÖZÖS réteg változott (az esemény alakja, a kapu, a tár, a szabály-réteg), vagy egy lépés
// lezárásakor, commit előtt. *(Miért kell mégis a teljes: a D81 alakváltása egyszerre három
// csoport próbáit törte el.)*
//
// ⭐ A besorolást a próba-fájl TARTALMA döntötte el (amit mér), nem a neve:
//   · a `fajlcsere` az ESEMÉNYEK kézi útja (`kivisz`/`behoz`, 4. szabály) — a „fájl” ott a
//     hordozó, nem a kép vagy a csatolmány —, ezért a cseréé;
//   · az `iro` a tár rétege (`js/tar/iro.js`, D70) — az alapé;
//   · a `vizsga` két készülék cseréje a programon belül, az UDP-kapun — a cseréé (folyamatot
//     csak a parancssor-próba indít);
//   · a `felulet` a felületnek felelő réteg: a helyi kapu, a pakli és a belépő tér.
//
// ⛔ A szűrő PONTOSAN illeszkedik: a régi részszó-szűrő a `tar`-ra a `tarsak`-ot is elindította.
const CSOPORTOK = {
  // a kanonikus alak, a kulcs, az aláírt esemény és a tár (az íróval)
  alap: ['kanonikus', 'kulcs', 'esemeny', 'tar', 'iro', 'atmeneti'],
  // események → állapot: entitások, döntéshozatal, szabályok, egyezmények, tagság
  allapot: ['allapot', 'javaslat', 'szabaly', 'egyezmeny', 'dontesicsomag', 'lezarasiosszegzes', 'osszpont', 'felszabaditas', 'identitas', 'tagsag'],
  // a felületnek felelő réteg
  felulet: ['kapu', 'pakli', 'ter'],
  // két készülék között: a párbeszéd, a kézi út, a társak, a kapu, a kötések, a tábla, a DHT
  csere: ['csere', 'fajlcsere', 'tarsak', 'tartomany', 'titkositas', 'udpkapu', 'kotes', 'tabla', 'dht', 'cimjegyzek', 'kerelem', 'osszegzotartas', 'tagsagkisero', 'gyokerdarab', 'kozoshalmaz', 'reszvetel', 'tarsemlekezet', 'vizsga'],
  // a fájl-bájtok és a szöveg-darab: tár, igény, kérelem, átvitel
  fajl: ['fajl', 'fajligeny', 'fajlkerelem', 'fajlatvitel', 'szovegdarab'],
  // az A pillér: az összegző Merkle-fa és ami rá épül
  fa: ['osszegzofa', 'lancgyoker', 'ellentmondas', 'eszlelo', 'lancellenorzes'],
  // a kézi út a parancssorból, külön folyamatokban (viselkedést mér, nem feliratot)
  parancssor: ['parancssor']
};

// A `meres/` mappa `*Proba.js` fájljai közül, ami NEM önpróba (nem ide tartozik, külön futtatandó).
const NEM_ONPROBA = [
  'ebredes' // mérés két hálózat között, paraméterekkel (`ebredesProba.js fut | res <cím> <port>`)
];

// ===== A BESOROLÁS-ŐR =====
//
// ⛔ Minden próba-fájl PONTOSAN EGY csoportban van, és minden `*Proba.js` fájl itt van — különben
// semmi nem fut. Egy új próba-fájl így nem maradhat ki némán: a 2026-10-01-i átnézéskor a tervezett
// csoport-lista a 33-ból egyet (a `kapu`-t, 38 próbával) kihagyott.
const besorolasHibak = [];
const csoportja = new Map(); // próba neve → csoport
for (const [csoport, nevek] of Object.entries(CSOPORTOK)) {
  for (const nev of nevek) {
    if (!PROBAK.some((p) => p.nev === nev)) besorolasHibak.push('a „' + csoport + '” csoportban ismeretlen próba: ' + nev);
    else if (csoportja.has(nev)) besorolasHibak.push(nev + ': két csoportban is (' + csoportja.get(nev) + ', ' + csoport + ')');
    else csoportja.set(nev, csoport);
  }
}
for (const p of PROBAK) {
  if (!csoportja.has(p.nev)) besorolasHibak.push(p.nev + ': egyik csoportban sincs');
}
const fajlok = readdirSync(new URL('.', import.meta.url))
  .filter((f) => f.endsWith('Proba.js'))
  .map((f) => ({ fajl: f, nev: f.slice(0, -'Proba.js'.length).toLowerCase() }));
for (const { fajl, nev } of fajlok) {
  if (!NEM_ONPROBA.includes(nev) && !PROBAK.some((p) => p.nev === nev)) {
    besorolasHibak.push(fajl + ': a mappában van, de a `mind.js` nem futtatja');
  }
}
for (const p of PROBAK) {
  if (!fajlok.some((f) => f.nev === p.nev)) besorolasHibak.push(p.nev + ': nincs ilyen nevű próba-fájl');
}

if (besorolasHibak.length) {
  console.error('⛔ A próbák besorolása hibás (mind.js — PROBAK, CSOPORTOK, NEM_ONPROBA):');
  for (const h of besorolasHibak) console.error('   · ' + h);
  process.exit(2);
}

// ===== A VÁLASZTÁS =====

const argok = process.argv.slice(2).map((a) => a.toLowerCase());
const valasztott = new Set();
const ismeretlenek = [];

if (argok[0] === 'csak') {
  // Csak próba-fájl nevek — a csoportnévvel egyező fájl is így érhető el egymagában.
  if (argok.length < 2) ismeretlenek.push('(a „csak” után próba-fájl neve kell)');
  for (const nev of argok.slice(1)) {
    if (csoportja.has(nev)) valasztott.add(nev);
    else ismeretlenek.push(nev);
  }
} else {
  for (const nev of argok) {
    if (CSOPORTOK[nev]) for (const p of CSOPORTOK[nev]) valasztott.add(p);
    else if (csoportja.has(nev)) valasztott.add(nev);
    else ismeretlenek.push(nev);
  }
}

if (ismeretlenek.length) {
  console.error('Nincs ilyen csoport vagy próba: ' + ismeretlenek.join(', '));
  console.error('A csoportok (a név pontosan illeszkedik):');
  for (const [csoport, nevek] of Object.entries(CSOPORTOK)) console.error('   ' + csoport + ': ' + nevek.join(', '));
  console.error('Egy csoportnévvel egyező próba-fájl egymagában: node koino/meres/mind.js csak <név>');
  process.exit(2);
}

const futtatandok = argok.length ? PROBAK.filter((p) => valasztott.has(p.nev)) : PROBAK;

// ===== A FUTÁS =====

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
// ⭐ Ha csak egy része futott, azt kimondjuk — a részleges próbaszám ne látsszon a teljes sornak.
if (argok.length) {
  kiir('Csak: ' + argok.join(' ') + ' — ' + futtatandok.length + ' próba-fájl a ' + PROBAK.length + '-ből');
}
// ⭐ …és ha a próbák nevére is szűrtünk (`KOINO_PROBA`, `probaFuttato.js`), azt is.
if (process.env.KOINO_PROBA) kiir('Szűrve: KOINO_PROBA=„' + process.env.KOINO_PROBA + '” — csak a nevükben ezt tartalmazó próbák futottak');
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
