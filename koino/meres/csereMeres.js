// koino/meres/csereMeres.js

// Felelősség: AZ 51. MÉRÉS — a SZELETENKÉNTI CSERE a vonalon (a C 7–8. pontja, 2026-09-27).
//
// Az 50. mérés a tartomány-egyeztetés LOGIKÁJÁT mérte (az üzenetek JSON-hossza, hálózat nélkül).
// Ez a VALÓDI párbeszédet (`vonal.js` → `parbeszed`) futtatja két tár között, a gépen belüli
// UDP-résen (`udpVonal.js` → `csereUdpResen`), és azt méri, amit a vonal ténylegesen visz —
// a keretekkel, a nyugtákkal, a fájl-körrel és a címjegyzékkel együtt:
//
//   1. egy eltérés — az egyik tárból hiányzik EGY esemény (a 48. mérés kérdése);
//   2. utána „nincs újdonság" — ugyanaz a két tár még egyszer (a hétköznapi eset).
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad), és nem kerül a `mind.js`-be.
//   node koino/meres/csereMeres.js [darab]     → alapból 10 000 és 100 000

import { kiir } from './naplo.js';

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';

import { tarGyartasa } from './skalaMeres.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';

const KOINO = 'skalameres';

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return {
    egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); }
  };
}

/** Egy csere a két tár között; a két fél bájtjai és az idő. */
async function csere(tarA, tarB) {
  const p = await udpParos();
  const kezdet = Date.now();
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO)
    ]);
    return { a, b, ms: Date.now() - kezdet, bajt: a.bajtKuldott + a.bajtKapott };
  } finally {
    p.bezar();
  }
}

const kb = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

async function egyMeret(darab) {
  const hely = join(tmpdir(), 'koino-csere-meres-' + darab + '-' + Date.now());
  try {
    const { fajl } = await tarGyartasa(darab, join(hely, 'A'));
    const sorok = (await readFile(fajl, 'utf8')).split('\n').filter(Boolean);
    // ⭐ A B tárból EGY esemény hiányzik (középről).
    const kozep = Math.floor(sorok.length / 2);
    await mkdir(join(hely, 'B', KOINO), { recursive: true });
    await writeFile(join(hely, 'B', KOINO, 'esemenyek.jsonl'),
      sorok.filter((_, i) => i !== kozep).join('\n') + '\n');

    const tarA = await esemenyTarNyitasa(KOINO, join(hely, 'A'));
    const tarB = await esemenyTarNyitasa(KOINO, join(hely, 'B'));

    const elso = await csere(tarA, tarB);
    const masodik = await csere(tarA, tarB);

    kiir('');
    kiir('  ' + darab.toLocaleString('hu-HU') + ' esemény:');
    kiir('    1 eltérés:         ' + kb(elso.bajt) + ' · ' + elso.ms + ' ms · eltérő szelet: '
      + elso.a.elteroSzeletek + ' · egyeztető üzenet: ' + (elso.a.egyeztetoUzenetek + elso.b.egyeztetoUzenetek)
      + ' · B kapott: ' + elso.b.uj + ' új');
    kiir('    nincs újdonság:    ' + kb(masodik.bajt) + ' · ' + masodik.ms + ' ms · egyeztető üzenet: '
      + (masodik.a.egyeztetoUzenetek + masodik.b.egyeztetoUzenetek));
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
}

async function fut() {
  const meretek = process.argv.slice(2).map(Number).filter((n) => n > 0);
  kiir('');
  kiir('A SZELETENKÉNTI CSERE A VONALON (51.) — Node ' + process.version + ' · ' + process.platform);
  kiir('  (a 48. mérés, a régi csere: 1 eltérés 100 000 közt = 160,2 KB; a 43. mérés terepen:');
  kiir('   „nincs újdonság" a résen 1,2–1,7 KB)');
  for (const darab of meretek.length ? meretek : [10000, 100000]) await egyMeret(darab);
  kiir('');
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
