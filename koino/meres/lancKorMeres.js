// koino/meres/lancKorMeres.js

// Felelősség: A 71. MÉRÉS — a LÁNC-KÖR ÁRA (D98/2–4, 2026-10-09): egy cserében mennyit visz a kérdés és a válasz, a szerző
// láncának hosszától és a kérdezett események számától függően — és mennyi ideig számol a szerző (a részfa-gyorsítótárral
// és nélküle). A 6. szabály mércéje: új protokoll-üzenetnél azt kell nézni, ami utazik.
//
// Egy szerző n eseményes lánca (gondolatok és pontok, a valódi műveletekkel — lánc-gyökérrel); egy tartó a fejet és még
// k eseményt tart. Bájt = a kérdés és a válasz JSON-hossza (a vonal keret nélkül); idő = a szerző válasza (első és
// második kérdés — a második már a gyorsítótárból), és összevetésül gyorsítótár nélkül (a régi `naploBizonyitek` útja).
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad), és nem kerül a `mind.js`-be.
//   node koino/meres/lancKorMeres.js [n1 n2 ...]     → alapból 100 1000 5000

import { kiir } from './naplo.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese } from '../js/tar/esemenyTar.js';
import { koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese } from '../js/muveletek.js';
import { NAPLO_FAJTA } from '../js/allapot/lancGyoker.js';
import { levelOsszegzes, naploBizonyitek } from '../js/esemeny/osszegzoFa.js';
import { lancKerdesek, lancValaszokFeldolgozasa, lancKiszolgalo, memoriaLancTarolo } from '../js/allapot/lancEllenorzes.js';

const KOINO = 'lanckormeres';
const kb = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

async function keszulek() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-lanckor-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { mappa, k: { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa), lancTarolo: lancTarolo(KOINO, mappa) } };
}

async function egyMeret(n) {
  const X = await keszulek();
  try {
    await koinoLetrehozasa(X.k, 'Mérés');
    const gondolatok = [];
    for (let i = 1; i < n; i++) {
      if (i % 4 === 0 && gondolatok.length) await tudatpontRendezese(X.k, gondolatok[i % gondolatok.length].azonosito, 1 + (i % 7));
      else gondolatok.push(await gondolatLetrehozasa(X.k, { cim: 'G' + i }));
    }
    const lanc = await sajatLancEsemenyei(X.k.tar, X.k.szerzo);
    for (const tart of [1, 8]) {
      const H = await keszulek();
      try {
        // a tartó a fejet és még `tart` eseményt tart (egyenletesen szétszórva)
        const valasztott = [lanc[lanc.length - 1]];
        for (let j = 0; j < tart; j++) valasztott.push(lanc[Math.floor((j + 1) * (lanc.length - 1) / (tart + 1))]);
        for (const e of valasztott) await esemenyMentese(H.k.tar, e);
        const tarolo = memoriaLancTarolo();
        const kerdesek = await lancKerdesek({ tar: H.k.tar, koino: KOINO, tarolo, veletlen: () => 1 }, [X.k.szerzo]);
        const kiszolgalo = lancKiszolgalo({ tar: X.k.tar, koino: KOINO });
        let t = Date.now();
        const valasz = await kiszolgalo.valasz(kerdesek);
        const elso = Date.now() - t;
        t = Date.now();
        await kiszolgalo.valasz(kerdesek);
        const masodik = Date.now() - t;
        // összevetésül: a tagsági bizonyítékok gyorsítótár nélkül (minden levél újraszámolva)
        const levelek = [];
        for (const e of lanc.slice(0, kerdesek[0].d)) levelek.push(await levelOsszegzes(NAPLO_FAJTA, e.azonosito));
        t = Date.now();
        for (const [s] of kerdesek[0].i) await naploBizonyitek(NAPLO_FAJTA, levelek, s - 1);
        const nelkul = Date.now() - t;
        const r = await lancValaszokFeldolgozasa({ tar: H.k.tar, koino: KOINO, tarolo }, kerdesek, valasz);
        const kerdesBajt = Buffer.byteLength(JSON.stringify({ uzenet: 'LANCKEREK', en: X.k.szerzo, kerdesek }));
        const valaszBajt = Buffer.byteLength(JSON.stringify({ uzenet: 'LANCVALASZ', valaszok: valasz }));
        kiir('  n = ' + String(lanc.length).padStart(5) + ' · ' + String(tart).padStart(1) + ' + fej kérdezve: kérdés '
          + kb(kerdesBajt).padStart(7) + ' · válasz ' + kb(valaszBajt).padStart(7) + ' · igazolva ' + r.igazolt
          + ' · a szerző: ' + elso + ' ms, másodszor ' + masodik + ' ms (gyorsítótár nélkül a bizonyítékok ' + nelkul + ' ms)');
      } finally {
        await rm(H.mappa, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(X.mappa, { recursive: true, force: true });
  }
}

async function fut() {
  const meretek = process.argv.slice(2).map(Number).filter((x) => x > 0);
  kiir('');
  kiir('A LÁNC-KÖR ÁRA (71.) — Node ' + process.version + ' · ' + process.platform);
  kiir('  (egy szerző n eseményes lánca; a tartó a fejet és még 1 / 8 eseményt tart; a kérdés és a válasz JSON-ja)');
  for (const n of meretek.length ? meretek : [100, 1000, 5000]) await egyMeret(n);
  kiir('');
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
