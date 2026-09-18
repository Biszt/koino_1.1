// koino/meres/dhtMeres.js — A DHT MINT HIRDETŐTÁBLA: gyors-e, megbízható-e? (36. mérés)

import { kiir } from './naplo.js';     // ⚠️ az ELSŐ import: elnémítja a naplót

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT — és a VALÓDI BitTorrent DHT-n fut.
//
// ===== A KÉRDÉS (Csaba döntése, 2026-09-19) =====
//
// A 35. mérés szerint a kötés-háló a hálózatváltást csak HIRDETŐTÁBLÁVAL éli túl, és a
// modell feltételezte, hogy a tábla **egy 5 perces ablak alatt** írható és olvasható. Csaba
// a DHT-t választotta (gazda nélküli tábla). Ez a mérés azt nézi meg, igaz-e a feltevés:
//
//   · sikerül-e feltenni egy aláírt bejegyzést, és HÁNY gép tárolja;
//   · egy MÁSIK kliens (új foglalat, új azonosító) megtalálja-e, és MENNYI IDŐ ALATT;
//   · ⭐ megy-e BELÉPŐ NÉLKÜL, csak a korábban megismert gépekkel (2. szabály);
//   · ⏸️ és — két készülékkel — NAT mögül, mobilról is (`tesz` + `keres`).
//
// A kliens a `js/csere/dht.js` — *a mért kód maga a valódi kód, nem utánzat* (29/b tanulsága).
//
// ===== FUTTATÁS =====
//
//   node koino/meres/dhtMeres.js [kor] [körök] [szünet mp]    → egy készüléken (alap: 5 kör)
//   node koino/meres/dhtMeres.js tesz [szöveg]                → feltesz, kiírja a kulcsot
//   node koino/meres/dhtMeres.js keres [kulcs-hex]            → megkeresi (másik készüléken)
//
//   KOINO_DHT_BELEPOK=nincs          → belépő NÉLKÜL, csak a megjegyzett gépekkel
//   KOINO_DHT_BELEPOK=hoszt:port,…   → más belépők
//   KOINO_DHT_KERDESIDO=1000         → egy kérdésre ennyi ms (alap: 2000)
//   KOINO_DHT_UJKULCS=1              → minden kör ÚJ kulccsal (új célszám — az első keresés esete)
//
// A megismert gépek a `koino-adat/dht-csomopontok.json`-ba kerülnek (a `KOINO_ADAT`
// szerint), a mérő-kulcs a `dht-meres-kulcs.json`-ba — ⚠️ ez NEM a koino-azonosság kulcsa.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  dhtKliens, bejegyzesKeszitese, nyersNyilvanosKulcs, ALAP_BELEPOK
} from '../js/csere/dht.js';
import { alapHely } from '../js/tar/fajlTar.js';

const SO = 'koino-meres';
const GYORSITOTAR = join(alapHely(), 'dht-csomopontok.json');
const KULCSFAJL = join(alapHely(), 'dht-meres-kulcs.json');

// ===================================
// BEÁLLÍTÁSOK ÉS FÁJLOK
// ===================================

function belepok() {
  const e = process.env.KOINO_DHT_BELEPOK;
  if (e === undefined) return ALAP_BELEPOK;
  if (e === 'nincs' || e === '') return [];
  return e.split(',').map((s) => s.trim()).filter(Boolean);
}

async function ismertek() {
  try { return JSON.parse(await readFile(GYORSITOTAR, 'utf8')); } catch { return []; }
}

async function ismertekMentese(kliensek) {
  const osszes = new Map((await ismertek()).map((c) => [c.cim + ':' + c.port, c]));
  for (const k of kliensek) for (const c of k.ismertCsomopontok()) osszes.set(c.cim + ':' + c.port, c);
  // ⛔ Korlátos (9. szabály): a legutóbb felelt 300 marad.
  const lista = [...osszes.values()].slice(-300);
  await mkdir(alapHely(), { recursive: true });
  await writeFile(GYORSITOTAR, JSON.stringify(lista));
  return lista.length;
}

async function meroKulcspar() {
  try {
    const jwk = JSON.parse(await readFile(KULCSFAJL, 'utf8'));
    const privateKey = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, true, ['sign']);
    const publicKey = await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x },
      { name: 'Ed25519' }, true, ['verify']);
    return { privateKey, publicKey };
  } catch {
    const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    await mkdir(alapHely(), { recursive: true });
    await writeFile(KULCSFAJL, JSON.stringify(await crypto.subtle.exportKey('jwk', kp.privateKey)));
    return kp;
  }
}

const kliensBeallitas = async () => ({
  belepok: belepok(),
  ismertek: await ismertek(),
  kerdesIdo: Number(process.env.KOINO_DHT_KERDESIDO) || undefined
});

/**
 * Az érték: ~200 bájt, mert a valódi bejegyzés három társnak titkosított címet hordozna
 * (a 6. szabály szerint ennyivel kell számolni, nem a „Hello World!"-del).
 */
const ertekKeszitese = (seq) => Buffer.concat([Buffer.from('koino-meres ' + seq + ' '), Buffer.alloc(180, 0x2e)]);

const mp = (ms) => ms === null || ms === undefined ? '—' : (ms / 1000).toFixed(1) + ' mp';

function keresesSor(k) {
  const hibak = Object.entries(k.hibak).map(([kod, db]) => kod + '×' + db).join(' ') || '—';
  return k.kerdes + ' kérdés · ' + k.valasz + ' felelt · ' + k.lejart + ' néma · hiba: ' + hibak
    + (k.findNodeTartalek ? ' · find_node-tartalék ' + k.findNodeTartalek : '') + ' · vége: ' + k.ok;
}

// ===================================
// 1. KÖRÖK EGY KÉSZÜLÉKEN
// ===================================

async function korok(n, szunet) {
  const kp = await meroKulcspar();
  const beall = await kliensBeallitas();
  kiir('');
  kiir('⭐ A DHT MINT HIRDETŐTÁBLA — ' + n + ' kör egy készüléken (36. mérés)');
  kiir('  belépők: ' + (beall.belepok.length ? beall.belepok.join(', ') : 'NINCS')
    + ' · megjegyzett gépek: ' + beall.ismertek.length
    + ' · kérdésidő: ' + (beall.kerdesIdo ?? 2000) + ' ms'
    + (process.env.KOINO_DHT_UJKULCS ? ' · MINDEN KÖR ÚJ KULCCSAL' : ' · egy kulcs minden körben'));
  kiir('');

  const eredmenyek = [];
  for (let i = 1; i <= n; i++) {
    const seq = Math.floor(Date.now() / 1000);
    // ⚠️ UGYANAZ A KULCS = UGYANAZ A CÉLSZÁM: a megjegyzett gépek között ott lesznek épp a
    // TÁROLÓI, és a kereső elsőre hozzájuk fordul (mérve: 0,1 mp). Egy visszatérő társnál ez
    // valósághű, az ELSŐ keresésnél túl kedvező. `KOINO_DHT_UJKULCS=1`: minden kör új kulccsal.
    const korKulcs = process.env.KOINO_DHT_UJKULCS
      ? await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) : kp;
    const bejegyzes = await bejegyzesKeszitese({ kulcspar: korKulcs, salt: SO, seq, ertek: ertekKeszitese(seq) });

    const a = await dhtKliens(beall);
    let t = Date.now();
    const p = await a.kozzetesz(bejegyzes);
    const putIdo = Date.now() - t;
    a.bezar();

    // ⭐ A KERESŐ ÚJ KLIENS: új foglalat, új azonosító — nem a feltevő emlékezetéből dolgozik.
    const b = await dhtKliens(beall);
    t = Date.now();
    const g = await b.keres(bejegyzes.k, SO);
    const getIdo = Date.now() - t;
    b.bezar();

    // ⭐ A megismert gépeket a következő kliensek is megkapják — egy valódi készülék is
    // emlékszik rájuk. Enélkül minden kör a belépőkön múlna (mérve: 2 kör 5-ből elakadt).
    await ismertekMentese([a, b]);
    beall.ismertek = await ismertek();

    const megvan = g.legjobb !== null && g.legjobb.seq === BigInt(seq);
    eredmenyek.push({ putIdo, tarolta: p.tarolta, probalt: p.probalt, getIdo, elso: g.elsoErvenyes,
      ervenyes: g.ervenyesek, ervenytelen: g.ervenytelen, megvan });

    kiir('  ' + i + '. kör  FELTÉVE ' + p.tarolta + '/' + p.probalt + ' gépre, ' + mp(putIdo)
      + '   ·   ' + (megvan ? 'MEGVAN' : '⛔ NINCS MEG') + ' — az első érvényes ' + mp(g.elsoErvenyes)
      + ' alatt (' + g.ervenyesek + ' gépről, ' + g.ervenytelen + ' érvénytelen), a keresés ' + mp(getIdo));
    kiir('         feltevés: ' + keresesSor(p.kereses));
    kiir('         keresés:  ' + keresesSor(g.kereses));
    if (i < n) await new Promise((r) => setTimeout(r, szunet * 1000));
  }

  const median = (tomb) => {
    const s = tomb.filter((x) => x !== null).sort((x, y) => x - y);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const megvan = eredmenyek.filter((e) => e.megvan).length;
  kiir('');
  kiir('  ⭐ ÖSSZESEN: ' + megvan + '/' + n + ' kör találta meg · a feltevés mediánja '
    + mp(median(eredmenyek.map((e) => e.putIdo))) + ' · az első érvényes találat mediánja '
    + mp(median(eredmenyek.map((e) => e.elso))) + ' · a teljes keresés mediánja '
    + mp(median(eredmenyek.map((e) => e.getIdo))));
  kiir('     tároló gépek: ' + eredmenyek.map((e) => e.tarolta + '/' + e.probalt).join(', '));
  const db = (await ismertek()).length;
  kiir('     (megjegyzett gépek: ' + db + ' — a következő futás belépő nélkül is indulhat:'
    + ' KOINO_DHT_BELEPOK=nincs)');
  kiir('');
}

// ===================================
// 2. KÉT KÉSZÜLÉK: tesz + keres
// ===================================

async function tesz(szoveg) {
  const kp = await meroKulcspar();
  const seq = Math.floor(Date.now() / 1000);
  const ertek = szoveg ? Buffer.from(szoveg) : ertekKeszitese(seq);
  const bejegyzes = await bejegyzesKeszitese({ kulcspar: kp, salt: SO, seq, ertek });
  const a = await dhtKliens(await kliensBeallitas());
  const t = Date.now();
  const p = await a.kozzetesz(bejegyzes);
  a.bezar();
  await ismertekMentese([a]);
  kiir('');
  kiir('FELTÉVE ' + p.tarolta + '/' + p.probalt + ' gépre, ' + mp(Date.now() - t) + ' (sorszám: ' + seq + ')');
  kiir('  ' + keresesSor(p.kereses));
  kiir('');
  kiir('A MÁSIK KÉSZÜLÉKEN:');
  kiir('  node koino/meres/dhtMeres.js keres ' + (await nyersNyilvanosKulcs(kp)).toString('hex'));
  kiir('');
}

async function keres(kulcsHex) {
  const k = kulcsHex ? Buffer.from(kulcsHex, 'hex') : await nyersNyilvanosKulcs(await meroKulcspar());
  if (k.length !== 32) { kiir('A kulcs 64 hexa-jegy (32 bájt).'); process.exit(2); }
  const b = await dhtKliens(await kliensBeallitas());
  const t = Date.now();
  const g = await b.keres(k, SO);
  b.bezar();
  await ismertekMentese([b]);
  kiir('');
  if (g.legjobb) {
    const kor = Math.floor(Date.now() / 1000) - Number(g.legjobb.seq);
    kiir('MEGVAN — sorszám ' + g.legjobb.seq + ' (' + Math.round(kor / 60) + ' perce tették fel) · '
      + g.ervenyesek + ' érvényes, ' + g.ervenytelen + ' érvénytelen');
    kiir('  érték: ' + Buffer.from(g.legjobb.ertek).toString().slice(0, 60));
  } else {
    kiir('⛔ NINCS MEG (' + g.ervenytelen + ' érvénytelen találat)');
  }
  kiir('  az első érvényes ' + mp(g.elsoErvenyes) + ' alatt, a keresés ' + mp(Date.now() - t));
  kiir('  ' + keresesSor(g.kereses));
  kiir('');
}

// ===================================
// INDÍTÁS
// ===================================

const [mod = 'kor', e1, e2] = process.argv.slice(2);
if (mod === 'kor') await korok(parseInt(e1, 10) || 5, e2 === undefined ? 5 : Number(e2));
else if (mod === 'tesz') await tesz(e1);
else if (mod === 'keres') await keres(e1);
else { kiir('Használat: node koino/meres/dhtMeres.js [kor [körök] [szünet mp] | tesz [szöveg] | keres [kulcs-hex]]'); process.exit(2); }
process.exit(0);
