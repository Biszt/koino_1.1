// koino/meres/titkositasMeres.js

// Felelősség: AZ 57. MÉRÉS — MIBE KERÜL A CSERE TITKOSÍTÁSA? (D89/1, a ②)
//
// Ugyanazt a forgalmat futtatja kétféleképpen a gépen belüli UDP-résen, és a dróton ténylegesen utazó
// bájtokat és csomagokat számolja (a foglalat `send`-jénél, a nyugtákkal együtt):
//
//   · NYÍLTAN — a ② előtti alak: a `parbeszed` / a fájl-út közvetlenül a nyers résen;
//   · TITKOSÍTVA — ahogy most élesben fut: kézfogás (2 × 33 B), és minden csomag titkosítva
//     (`[jel][számláló][rejtjel][GCM-címke]`), a tábla-kulcs pedig a kézfogás aláírásával (`CIMEK`).
//
// Három helyzet: „nincs újdonság” (a hétköznapi eset), egy eltérés, és egy 200 KB-os fájl átvitele.
// ⚠️ Mindkét oldal tábla-kulcsot cserél (ahogy az őrjárat): a titkosított változat ehhez az aláírást is viszi.
//
// *(Az építés ELŐTT ez a szkript a szerkezetből becsülte a többletet, és ebből derült ki, hogy a külön,
// JSON-os kézfogás 692 B lenne munkánként — ezért lett 33 bájtos bináris; lásd `eredmenyek.md` 57.)*
//
// ⚠️ NEM ÖNPRÓBA (számokat ad), nem kerül a `mind.js`-be.
//   node koino/meres/titkositasMeres.js [darab]     → alapból 2000 esemény

import { kiir } from './naplo.js';

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSocket } from 'node:dgram';
import { randomBytes } from 'node:crypto';

import { tarGyartasa } from './skalaMeres.js';
import { esemenyTarNyitasa, fajlBlobTarolo } from '../js/tar/fajlTar.js';
import { csereUdpResen, udpKapcsolat, kezfogasUdpResen } from '../js/csere/udpVonal.js';
import { parbeszed, fajlKiszolgalas, fajlHozatala } from '../js/csere/vonal.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import { kezfogasAlairasa } from '../js/csere/titkositas.js';

const KOINO = 'skalameres';

async function udpParos() {
  const egyik = createSocket({ type: 'udp4' });
  const masik = createSocket({ type: 'udp4' });
  await new Promise((t) => egyik.bind(0, '127.0.0.1', t));
  await new Promise((t) => masik.bind(0, '127.0.0.1', t));
  const meres = { bajt: 0, csomag: 0 };
  for (const s of [egyik, masik]) {
    const eredeti = s.send.bind(s);
    s.send = (adat, ...tobbi) => {
      meres.bajt += Buffer.isBuffer(adat) ? adat.length : Buffer.byteLength(String(adat));
      meres.csomag++;
      return eredeti(adat, ...tobbi);
    };
  }
  return { egyik, masik, egyikPort: egyik.address().port, masikPort: masik.address().port, meres,
    bezar() { egyik.close(); masik.close(); } };
}

const utohang = () => new Promise((t) => setTimeout(t, 300));

/** Egy csere — nyíltan (a nyers résen) vagy titkosítva (`csereUdpResen`). */
async function csere(tarA, tarB, tA, tB, titkosan) {
  const p = await udpParos();
  const oldal = (t) => ({ tablaKulcs: nyilvanosResz(t), tablaAlairo: (atirat) => kezfogasAlairasa(t, atirat) });
  try {
    if (titkosan) {
      await Promise.all([
        csereUdpResen(p.egyik, '127.0.0.1', p.masikPort, tarA, KOINO, oldal(tA)),
        csereUdpResen(p.masik, '127.0.0.1', p.egyikPort, tarB, KOINO, oldal(tB))
      ]);
    } else {
      const nyilt = async (halo, port, tar, t) => {
        const k = udpKapcsolat(halo, '127.0.0.1', port);
        k.setTimeout(10000, () => k.destroy(new Error('csend')));
        try {
          await parbeszed(k, tar, KOINO, { tablaKulcs: nyilvanosResz(t) });
          await k.kiurites();
        } finally { k.end(); }
      };
      await Promise.all([nyilt(p.egyik, p.masikPort, tarA, tA), nyilt(p.masik, p.egyikPort, tarB, tB)]);
    }
    await utohang();
    return { ...p.meres };
  } finally { p.bezar(); }
}

/** Egy fájl átvitele — nyíltan vagy titkosítva (mindkét oldal kezet fog, és a védett résen beszél). */
async function fajl(bajt, hely, titkosan) {
  const p = await udpParos();
  const forras = fajlBlobTarolo(KOINO, join(hely, 'fajl-forras-' + titkosan));
  const cel = fajlBlobTarolo(KOINO, join(hely, 'fajl-cel-' + titkosan));
  const { lenyomat } = await forras.ir(randomBytes(bajt));
  try {
    const [rEgyik, rMasik] = titkosan
      ? await Promise.all([kezfogasUdpResen(p.egyik, '127.0.0.1', p.masikPort),
        kezfogasUdpResen(p.masik, '127.0.0.1', p.egyikPort)])
      : [p.egyik, p.masik];
    const kiszolgalo = (async () => {
      const k = udpKapcsolat(rEgyik, '127.0.0.1', p.masikPort, { torlodasJel: 'vegas' });
      k.setTimeout(10000, () => k.destroy(new Error('csend')));
      try { await fajlKiszolgalas(k, (l) => forras.olvas(l)); } finally { await k.kiurites(); k.end(); }
    })().catch(() => null);
    const nyito = async () => {
      const k = udpKapcsolat(rMasik, '127.0.0.1', p.egyikPort, { torlodasJel: 'vegas' });
      k.setTimeout(10000, () => k.destroy(new Error('csend')));
      return k;
    };
    const [, e] = await Promise.all([kiszolgalo, fajlHozatala(cel, KOINO, lenyomat, nyito, { korlat: bajt * 2 })]);
    if (!e?.kesz) kiir('  ⚠ a fájl nem jött át: ' + JSON.stringify(e));
    if (titkosan) { rEgyik.zar(); rMasik.zar(); }
    await utohang();
    return { ...p.meres };
  } finally { p.bezar(); }
}

function sor(cimke, nyilt, titkos) {
  const t = titkos.bajt - nyilt.bajt;
  kiir('  ' + cimke.padEnd(17) + 'nyíltan ' + String(nyilt.bajt).padStart(7) + ' B (' + nyilt.csomag + ' csomag) · '
    + 'titkosítva ' + String(titkos.bajt).padStart(7) + ' B (' + titkos.csomag + ' csomag) · többlet +' + t
    + ' B (+' + (t / nyilt.bajt * 100).toFixed(1).replace('.', ',') + '%)');
}

async function fut() {
  const darab = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 2000;
  const hely = join(tmpdir(), 'koino-titkositas-meres-' + Date.now());
  kiir('');
  kiir('57. MÉRÉS — A CSERE TITKOSÍTÁSÁNAK ÁRA (D89/1) — Node ' + process.version + ' · ' + process.platform);
  kiir('  (' + darab + ' esemény a tárban; a dróton utazó bájtok a nyugtákkal; mindkét oldal tábla-kulcsot cserél)');
  kiir('');
  try {
    const { fajl: fajlUt } = await tarGyartasa(darab, join(hely, 'A'));
    const sorok = (await readFile(fajlUt, 'utf8')).split('\n').filter(Boolean);
    const kozep = Math.floor(sorok.length / 2);
    const tarPar = async (nev, hianyos) => {
      await mkdir(join(hely, nev + 'A', KOINO), { recursive: true });
      await mkdir(join(hely, nev + 'B', KOINO), { recursive: true });
      await writeFile(join(hely, nev + 'A', KOINO, 'esemenyek.jsonl'), sorok.join('\n') + '\n');
      await writeFile(join(hely, nev + 'B', KOINO, 'esemenyek.jsonl'),
        sorok.filter((_, i) => !hianyos || i !== kozep).join('\n') + '\n');
      return [await esemenyTarNyitasa(KOINO, join(hely, nev + 'A')), await esemenyTarNyitasa(KOINO, join(hely, nev + 'B'))];
    };
    const tA = await ujTablaKulcs(), tB = await ujTablaKulcs();
    const [n1, n2] = await tarPar('nyiltEgy', true);
    const [t1, t2] = await tarPar('titkosEgy', true);
    sor('1 eltérés:', await csere(n1, n2, tA, tB, false), await csere(t1, t2, tA, tB, true));
    sor('nincs újdonság:', await csere(n1, n2, tA, tB, false), await csere(t1, t2, tA, tB, true));
    sor('200 KB-os fájl:', await fajl(200 * 1024, hely, false), await fajl(200 * 1024, hely, true));
    kiir('');
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
