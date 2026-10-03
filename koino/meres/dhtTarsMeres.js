// koino/meres/dhtTarsMeres.js

// Felelősség: AZ 58. MÉRÉS — A BEP 5 A VALÓDI BITTORRENT-DHT-N (D91, a G hash-elhelyezésének közege).
//
// A kérdések (a döntés — D91 — után, az építés előtt):
//   1. Mennyibe kerül egy bejelentés (`announce_peer`) és egy keresés (`get_peers`): idő, kérdésszám, bájt?
//   2. Megtalálja-e egy MÁSIK kliens (más azonosítóval, más foglalaton) a bejelentett címet?
//   3. ⭐ MEDDIG őrzi a háló a bejelentést? (Ha csak percekig, a ritka hirdetés értelmetlen — és ez szabja
//      meg, mit lehet a DHT-ra bízni: a gyökér-darabok hirdetésének ütemét és a közvetlen keresés árát.)
//
// A menet: egy kliens `T` témát bejelent (vakított téma, `cimjegyzek.js`; a port egy véletlen „kapu-port",
// ebből ismerjük fel a saját bejegyzésünket), MEGISMÉTLÉS NÉLKÜL; utána a megadott időpontokban (perc) mindig
// egy FRISS kliens keresi meg mind a `T` témát.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad), a valódi hálózatot használja (a belépők: `ALAP_BELEPOK`, és a 36. mérés
// megjegyzett gépei). Hosszú: a leghosszabb várakozásig fut.
//   node koino/meres/dhtTarsMeres.js [témák=3] [percek=0,5,15,30,60,120]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { dhtKliens, ALAP_BELEPOK } from '../js/csere/dht.js';
import { cimjegyzekTema } from '../js/csere/cimjegyzek.js';
import { alapHely } from '../js/tar/fajlTar.js';

const kiir = (s) => process.stdout.write(s + '\n');
console.log = () => {};
console.warn = () => {};

const GYORSITOTAR = join(alapHely(), 'dht-csomopontok.json');
async function ismertek() {
  try { return JSON.parse(await readFile(GYORSITOTAR, 'utf8')); } catch { return []; }
}
async function ismertekMentese(k) {
  const osszes = new Map((await ismertek()).map((c) => [c.cim + ':' + c.port, c]));
  for (const c of k.ismertCsomopontok()) osszes.set(c.cim + ':' + c.port, c);
  await mkdir(alapHely(), { recursive: true });
  await writeFile(GYORSITOTAR, JSON.stringify([...osszes.values()].slice(-300)));
}
const kliens = async () => dhtKliens({ belepok: ALAP_BELEPOK, ismertek: await ismertek() });
const kb = (b) => (b / 1024).toFixed(1).replace('.', ',') + ' KB';
const varj = (ms) => new Promise((t) => setTimeout(t, ms));

const temaDb = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 3;
const percek = (process.argv[3] ?? '0,5,15,30,60,120').split(',').map(Number).filter((x) => x >= 0);
const port = 20000 + Math.floor(Math.random() * 40000);
const koino = 'meres-' + randomBytes(6).toString('hex');
const temak = Array.from({ length: temaDb }, (_, i) => cimjegyzekTema(koino, 'szelet', 'tema-' + i));

kiir('');
kiir('58. MÉRÉS — A BEP 5 A VALÓDI DHT-N (D91) — ' + new Date().toLocaleString('hu-HU'));
kiir('  ' + temaDb + ' téma · port ' + port + ' · keresések: ' + percek.join(', ') + ' perc múlva (megismétlés nélkül)');

// ----- 1. A BEJELENTÉS -----
const a = await kliens();
const t0 = Date.now();
for (const [i, tema] of temak.entries()) {
  const elotte = a.forgalom();
  const k0 = Date.now();
  const be = await a.bejelent(tema, port);
  const utana = a.forgalom();
  kiir('  BEJELENTÉS ' + (i + 1) + ': ' + be.tarolta + '/' + be.probalt + ' gép tárolta · ' + ((Date.now() - k0) / 1000).toFixed(1)
    + ' mp · ' + be.kereses.kerdes + ' kérdés (' + be.kereses.valasz + ' felelt) · ki ' + kb(utana.ki - elotte.ki)
    + ', be ' + kb(utana.be - elotte.be));
}
await ismertekMentese(a);
a.bezar();

// ----- 2. A KERESÉSEK — mindig friss klienssel -----
const sorok = [];
for (const perc of percek) {
  const varakozas = t0 + perc * 60000 - Date.now();
  if (varakozas > 0) await varj(varakozas);
  const b = await kliens();
  let talalt = 0, kerdes = 0, ido = 0;
  const elotte = b.forgalom();
  for (const tema of temak) {
    const k0 = Date.now();
    const k = await b.tarsakKeresese(tema);
    ido += Date.now() - k0;
    kerdes += k.kereses.kerdes;
    if (k.tarsak.some((t) => t.port === port)) talalt++;
  }
  const utana = b.forgalom();
  await ismertekMentese(b);
  b.bezar();
  const sor = '  ' + String(perc).padStart(4) + ' perc múlva: ' + talalt + '/' + temaDb + ' téma megvan · keresésenként '
    + (ido / temaDb / 1000).toFixed(1) + ' mp, ' + Math.round(kerdes / temaDb) + ' kérdés, '
    + kb((utana.ki - elotte.ki + utana.be - elotte.be) / temaDb);
  sorok.push(sor);
  kiir(sor);
}
kiir('');
