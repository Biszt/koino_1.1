// koino/meres/reszvetelMeres.js

// Felelősség: A 68. MÉRÉS — a „nincs újdonság” csere ára a SZIGORÚ (b) alatt (a bekapcsolás átvizsgálása, 2026-10-06).
//
// A kérdés: ha a részvétel a vállalásból jön, két készülék szelet-halmaza MÁS (mindenki mást vállal) — a nyitó lenyomat
// (a résztvevő szeletek párjaié) így soha nem egyezik, és a párbeszéd minden cserén végigfuttatja az első szintet (a
// tartomány-egyeztetést a nem közös szeleteken is). Mennyibe kerül ez, a vállalt szeletek számától és az átfedéstől?
//
// Két tár: mindkettő n szeletet vállal, ebből `átfedés` hányad KÖZÖS és egyező, a többi csak az egyiké (a részvétel a
// saját halmaz). A valódi párbeszéd (`csereUdpResen`) a gépen belüli UDP-résen, titkosítva — azt méri, amit a vonal visz.
// Összevetésül: ugyanez, ha mindkét fél CSAK a közös szeletekben venne részt (a „közös halmaz” ideális esete).
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad), és nem kerül a `mind.js`-be.
//   node koino/meres/reszvetelMeres.js [n1 n2 ...]     → alapból 50 200 1000

import { kiir } from './naplo.js';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';

import { ujEember } from './probaFuttato.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';
import { memoriaHalmazTar } from '../js/csere/kozosHalmaz.js';

const KOINO = 'reszvetelmeres';
const ATFEDESEK = [0.1, 0.5, 0.9, 1];

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port,
    bezar() { egyik.close(); masik.close(); } };
}

async function csere(tarA, tarB, reszveszA, reszveszB, kozos = null) {
  const p = await udpParos();
  const kezdet = Date.now();
  // ⭐ D97/1: a közös halmaz (ha megadva): a tábla-kulcs és a halmaz-tár mindkét félnél.
  const oldal = (reszvesz, k) => (k ? { reszvesz, tablaKulcs: nyilvanosResz(k.t), tablaAlairo: (x) => kezfogasAlairasa(k.t, x),
    reszvetelHalmaz: async () => k.p, halmazTar: k.h } : { reszvesz });
  try {
    const [a, b] = await Promise.all([
      csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, oldal(reszveszA, kozos?.a)),
      csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, oldal(reszveszB, kozos?.b))
    ]);
    return { bajt: a.bajtKuldott + a.bajtKapott, ms: Date.now() - kezdet,
      uzenetek: a.egyeztetoUzenetek + b.egyeztetoUzenetek };
  } finally {
    p.bezar();
  }
}

const kb = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

async function tarIrasa(hely, esemenyek) {
  await mkdir(join(hely, KOINO), { recursive: true });
  await writeFile(join(hely, KOINO, 'esemenyek.jsonl'), esemenyek.map((e) => JSON.stringify(e)).join('\n') + '\n');
  return esemenyTarNyitasa(KOINO, hely);
}

async function egyMeret(n, szerzo) {
  for (const atfedes of ATFEDESEK) {
    const kozos = Math.round(n * atfedes);
    const ujSzelet = async (i) => szerzo.tesz('GondolatLetrehozas', { cim: 'S' + i, meret: 10 });
    const kozosek = [];
    for (let i = 0; i < kozos; i++) kozosek.push(await ujSzelet(i));
    const csakA = [], csakB = [];
    for (let i = 0; i < n - kozos; i++) { csakA.push(await ujSzelet('a' + i)); csakB.push(await ujSzelet('b' + i)); }
    const hely = join(tmpdir(), 'koino-reszvetel-meres-' + n + '-' + atfedes + '-' + Date.now());
    try {
      const tarA = await tarIrasa(join(hely, 'A'), [...kozosek, ...csakA]);
      const tarB = await tarIrasa(join(hely, 'B'), [...kozosek, ...csakB]);
      const halmazA = new Set([...kozosek, ...csakA].map((e) => e.azonosito));
      const halmazB = new Set([...kozosek, ...csakB].map((e) => e.azonosito));
      const kozosHalmaz = new Set(kozosek.map((e) => e.azonosito));
      await csere(tarA, tarB, (k) => halmazA.has(k), (k) => halmazB.has(k));          // bemelegítés
      const sajat = await csere(tarA, tarB, (k) => halmazA.has(k), (k) => halmazB.has(k));
      const idealis = await csere(tarA, tarB, (k) => kozosHalmaz.has(k), (k) => kozosHalmaz.has(k));
      // ⭐ D97/1: a közös halmaz — az első találkozás (a halmazok cseréje) és utána a „nincs újdonság”.
      const kz = { a: { t: await ujTablaKulcs(), p: halmazA, h: memoriaHalmazTar() },
        b: { t: await ujTablaKulcs(), p: halmazB, h: memoriaHalmazTar() } };
      const kElso = await csere(tarA, tarB, (k) => halmazA.has(k), (k) => halmazB.has(k), kz);
      const kMasodik = await csere(tarA, tarB, (k) => halmazA.has(k), (k) => halmazB.has(k), kz);
      kiir('  n = ' + String(n).padStart(4) + ' · átfedés ' + String(Math.round(atfedes * 100)).padStart(3) + '%: '
        + 'saját halmaz ' + kb(sajat.bajt).padStart(8) + ' (' + sajat.uzenetek + ' egyeztető üzenet, ' + sajat.ms + ' ms)'
        + ' · csak a közös ' + kb(idealis.bajt).padStart(7) + ' (' + idealis.uzenetek + ')'
        + ' · D97: első ' + kb(kElso.bajt).padStart(7) + ', utána ' + kb(kMasodik.bajt).padStart(7) + ' (' + kMasodik.uzenetek + ')');
    } finally {
      await rm(hely, { recursive: true, force: true });
    }
  }
}

async function fut() {
  const meretek = process.argv.slice(2).map(Number).filter((x) => x > 0);
  kiir('');
  kiir('A „NINCS ÚJDONSÁG” CSERE A SZIGORÚ (b) ALATT (68.) — Node ' + process.version + ' · ' + process.platform);
  kiir('  (két készülék, n vállalt szelet, a közösek egyeznek; a részvétel a saját halmaz, ill. csak a közös)');
  const szerzo = await ujEember(KOINO);
  for (const n of meretek.length ? meretek : [50, 200, 1000]) await egyMeret(n, szerzo);
  kiir('');
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
