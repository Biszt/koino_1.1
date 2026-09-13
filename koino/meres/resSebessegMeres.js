// koino/meres/resSebessegMeres.js — MENNYIRE LASSÚ A FÁJL AZ ÁTFÚRT RÉSEN? (16. mérés)

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT. Azért készült, mert a randevú
// (5.7 / C) megépítésekor egy szerkezeti tulajdonság látszott, amit **meg kell mérni,
// nem megbecsülni**:
//
// ⛔⛔ A UDP-VONAL EGYSZERRE EGY DARABOT TART ÚTON (stop-and-wait, `udpVonal.js`), és egy
// darab 1000 bájt. Egy 64 KB-os szelet tehát ~87 oda-vissza — ⭐ **és a szelet mérete
// ezen NEM segít**: 87 darab az 87 oda-vissza, akár egy szeletben van, akár nyolcban.
//
// ⭐ A kérdés tehát nem az, hogy „mekkora legyen a szelet", hanem hogy **kell-e a vonalnak
// ABLAK** (több darab úton egyszerre). Ez a mérés ehhez ad számot.
//
// Futtatás:  node koino/meres/resSebessegMeres.js

import { mkdtemp } from 'node:fs/promises';

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { fajlBlobTarolo } from '../js/tar/fajlTar.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { parbeszed, fajlHozatala, tcpNyito, figyeloIndulasa } from '../js/csere/vonal.js';
import { udpKapcsolat, fajlUdpResen } from '../js/csere/udpVonal.js';

// ⚠️ A koino minden metódusa naplóz — a mérés számai csak így olvashatók.
console.log = () => {};
console.warn = () => {};
const kiir = (sz = '') => process.stdout.write(String(sz) + String.fromCharCode(10));

const KOINO = 'meres';

/** Két UDP-foglalat, egymásnak címezve — ez az „átfúrt rés" a mérésben. */
async function udpParos(kesleltetes = 0) {
  const nyit = () => new Promise((kesz) => {
    const h = createSocket('udp4');
    h.bind(0, '127.0.0.1', () => kesz(h));
  });
  const egyik = await nyit();
  const masik = await nyit();

  // ⭐ MESTERSÉGES KÉSLELTETÉS: helyben minden 0 ms, de a valóság nem ilyen. Ezzel
  // látszik, mit jelent a stop-and-wait egy VALÓDI hálózaton.
  if (kesleltetes > 0) {
    for (const h of [egyik, masik]) {
      const eredeti = h.send.bind(h);
      h.send = (...ervek) => setTimeout(() => eredeti(...ervek), kesleltetes);
    }
  }

  return {
    egyik, masik,
    egyikPort: egyik.address().port,
    masikPort: masik.address().port,
    bezar: () => { egyik.close(); masik.close(); }
  };
}

async function ujBlob(nev) {
  return fajlBlobTarolo(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-' + nev + '-')));
}

async function ujTar() {
  return esemenyTarNyitasa(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-tar-')));
}

/** Egy fájl átvitele az átfúrt résen — mennyi idő alatt? */
async function resenMeres(meret, kesleltetes) {
  const gazda = await ujBlob('a');
  const vendeg = await ujBlob('b');

  const tartalom = new Uint8Array(meret);
  for (let i = 0; i < meret; i++) tartalom[i] = i % 251;
  const { lenyomat } = await gazda.ir(tartalom);

  const p = await udpParos(kesleltetes);
  const gazdaTar = await ujTar();

  const kezd = Date.now();
  try {
    const [, eredmeny] = await Promise.all([
      parbeszed(udpKapcsolat(p.egyik, '127.0.0.1', p.masikPort), gazdaTar, KOINO,
        { fajlOlvas: (l) => gazda.olvas(l) }),
      fajlUdpResen(p.masik, '127.0.0.1', p.egyikPort, vendeg, KOINO, lenyomat,
        { varakozasiIdo: 120000 })
    ]);
    const ido = Date.now() - kezd;
    return { kesz: eredmeny.kesz, ido, szeletek: eredmeny.szeletek };
  } finally {
    p.bezar();
  }
}

/** Ugyanaz TCP-n — hogy legyen mihez hasonlítani. */
async function tcpMeres(meret) {
  const gazda = await ujBlob('ta');
  const vendeg = await ujBlob('tb');

  const tartalom = new Uint8Array(meret);
  for (let i = 0; i < meret; i++) tartalom[i] = i % 251;
  const { lenyomat } = await gazda.ir(tartalom);

  const figyelo = await figyeloIndulasa(await ujTar(), KOINO, 0,
    { fajlOlvas: (l) => gazda.olvas(l) });

  const kezd = Date.now();
  try {
    const e = await fajlHozatala(vendeg, KOINO, lenyomat,
      tcpNyito('127.0.0.1', figyelo.port));
    return { kesz: e.kesz, ido: Date.now() - kezd, szeletek: e.szeletek };
  } finally {
    await figyelo.bezar();
  }
}

// ===================================
// A MÉRÉS
// ===================================

const sor = (cimke, meret, e) => {
  const kbs = e.ido > 0 ? (meret / 1024) / (e.ido / 1000) : Infinity;
  kiir(
    '  ' + cimke.padEnd(28)
    + String(Math.round(meret / 1024)).padStart(5) + ' KB  '
    + String(e.ido).padStart(7) + ' ms  '
    + (Number.isFinite(kbs) ? kbs.toFixed(0).padStart(6) + ' KB/s' : '     —')
    + (e.kesz ? '' : '   ⛔ NEM SIKERÜLT')
  );
};

kiir('\n⭐ A FÁJL-ÁTVITEL SEBESSÉGE — TCP vs. az átfúrt rés\n');
kiir('  ' + 'mérés'.padEnd(28) + 'méret'.padStart(8) + '        idő      sebesség');
kiir('  ' + '─'.repeat(62));

for (const meret of [64 * 1024, 256 * 1024]) {
  sor('TCP (helyben)', meret, await tcpMeres(meret));
  sor('UDP-rés (helyben)', meret, await resenMeres(meret, 0));
}

// ⭐ ÉS A LÉNYEG: mit jelent a stop-and-wait egy VALÓDI hálózaton?
kiir('');
for (const kesleltetes of [1, 5]) {
  sor('UDP-rés (+' + kesleltetes + ' ms/csomag)', 64 * 1024, await resenMeres(64 * 1024, kesleltetes));
}

kiir('\n⚠️ A `+N ms/csomag` a valódi hálózat közelítése. A stop-and-wait miatt a');
kiir('   késleltetés MINDEN darabra rárakódik: ~1000 bájtonként egy oda-vissza.');
kiir('   ⭐ Ha ez kevés, a vonalnak ABLAK kell (több darab úton egyszerre) —');
kiir('   a szelet méretének növelése NEM segít rajta.\n');

process.exit(0);
