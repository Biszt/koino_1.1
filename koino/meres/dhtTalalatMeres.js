// koino/meres/dhtTalalatMeres.js

// Felelősség: A 87. MÉRÉS — MEGTALÁLJA-E A MEGHÍVÓ A BELÉPŐ CETLIJÉT A DHT-N? (a belépő megtalálása két hálózat között —
// docs/belepo_megtalalasa_atvizsgalas.md; a 2026-11-04-i terep lelete: a laptop nem találta a mobilneten lévő telefon
// bejelentését, a DHT a témáin szinte csak zajt adott).
//
// KÉT ÚT, EGYMÁS MELLETT:
//   · BEP 5 (`announce_peer` / `get_peers`) — ma ezen jelentkezik a belépő (a kopogtató téma; a címjegyzék, D91);
//   · BEP 44 (aláírt, módosítható bejegyzés — `put` / `get`) — a hirdetőtábla útja (2026-09-20), ami a terepen megbízhatóan
//     olvasta a társak címét. Itt a kulcspár a kódból származik (mint egy meghívó titkából), a bejegyzés aláírt: hamisítani nem lehet.
//
// KÉT KÉSZÜLÉK, KÉT SZEREP (ugyanazzal a kóddal — a témák, a felismerő port és a kulcspárok a kódból jönnek):
//   · a TELEFON (mobilneten — mint a belépő): `bejelent <kód>` — K témán mindkét úton kiír, és 20 percenként megismétli (mint a
//     belépő őrjárata); minden kiírás után egy FRISS klienssel megnézi, látja-e a saját cetlijét (az M1 „ellenőrző keresése”).
//   · a LAPTOP (otthon — mint a meghívó): `keres <kód>` — 2 percenként két friss klienssel (A, B) minden témát mindkét úton
//     SORBAN keres (ahogy az őrjárat), és egy véletlen, soha nem használt ellenpróba-témát (a zaj — M3 (b)).
//
// Amit kimond (a laptopon, a végén): úton­ként egy keresés találati aránya (A), két kliensé együtt (A∪B); a zaj (a BEP 5 nem a mi
// portunkon jött címei, és amelyik az ellenpróbán is megjelent); a TÉVES szűrés (a mi címünk az ellenpróbán); egy keresés ideje
// és bájtja.
//
// ⚠️ NEM ÖNPRÓBA (számokat ad), a valódi BitTorrent DHT-t használja (a belépők: `ALAP_BELEPOK` + a megjegyzett gépek).
//   node koino/meres/dhtTalalatMeres.js bejelent <kód> [percek=40] [témák=4]     ← a telefonon, mobilneten (előbb ez)
//   node koino/meres/dhtTalalatMeres.js keres <kód> [percek=40] [témák=4]        ← a laptopon, otthon
// (Egy gépen is fut — két ablakban; a valódi kérdés a két hálózat.)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { dhtKliens, ALAP_BELEPOK, bejegyzesKeszitese } from '../js/csere/dht.js';
import { cimjegyzekTema } from '../js/csere/cimjegyzek.js';
import { alapHely } from '../js/tar/fajlTar.js';

const kiir = (s) => process.stdout.write(s + '\n');
console.log = () => {};
console.warn = () => {};

// ===== A KÖZÖS ALAP: a témák, a felismerő port és a kulcspárok a kódból =====

const [mod, kod] = process.argv.slice(2);
const percek = Number(process.argv[4]) > 0 ? Number(process.argv[4]) : 40;
const temaDb = Number(process.argv[5]) > 0 ? Math.min(Number(process.argv[5]), 16) : 4;
if (!['bejelent', 'keres'].includes(mod) || !kod) {
  kiir('Használat:');
  kiir('  node koino/meres/dhtTalalatMeres.js bejelent <kód> [percek=40] [témák=4]   (a telefonon, mobilneten — előbb ez)');
  kiir('  node koino/meres/dhtTalalatMeres.js keres <kód> [percek=40] [témák=4]      (a laptopon)');
  process.exit(2);
}
const lenyomat = (s) => createHash('sha256').update('meres87|' + kod + '|' + s).digest();
/** A felismerő port: a kódból — a laptop erről ismeri fel a telefon BEP 5 cetlijét (a mobilcím ismeretlen és változik). */
const PORT = 20000 + (lenyomat('port').readUInt32BE(0) % 30000);
const KOINO = 'meres87-' + lenyomat('koino').subarray(0, 8).toString('hex');
const temak = Array.from({ length: temaDb }, (_, i) => cimjegyzekTema(KOINO, 'szelet', 'tema-' + i));
/** A BEP 44 só témánként (a kódból). */
const sok = Array.from({ length: temaDb }, (_, i) => lenyomat('so-' + i).subarray(0, 16));

/** Az Ed25519 kulcspár egy 32 bájtos magból — a két készülék ugyanazt számolja (mint egy meghívó titkából). */
const PKCS8_ELOTAG = Buffer.from('302e020100300506032b657004220420', 'hex');
async function kulcsparMagbol(mag) {
  const privateKey = await crypto.subtle.importKey('pkcs8', Buffer.concat([PKCS8_ELOTAG, mag]), { name: 'Ed25519' }, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const nyilvanos = Buffer.from(jwk.x, 'base64url');
  const publicKey = await crypto.subtle.importKey('raw', nyilvanos, { name: 'Ed25519' }, true, ['verify']);
  return { kulcspar: { privateKey, publicKey }, nyilvanos };
}
const kulcsparok = await Promise.all(Array.from({ length: temaDb }, (_, i) => kulcsparMagbol(lenyomat('kulcs-' + i))));

const GYORSITOTAR = join(alapHely(), 'dht-csomopontok.json');
async function ismertek() {
  try { return JSON.parse(await readFile(GYORSITOTAR, 'utf8')); } catch { return []; }
}
async function ismertekMentese(k) {
  try {
    const osszes = new Map((await ismertek()).map((c) => [c.cim + ':' + c.port, c]));
    for (const c of k.ismertCsomopontok()) osszes.set(c.cim + ':' + c.port, c);
    await mkdir(alapHely(), { recursive: true });
    await writeFile(GYORSITOTAR, JSON.stringify([...osszes.values()].slice(-300)));
  } catch { /* a gyorsítótár kényelem */ }
}
const ujKliens = async () => dhtKliens({ belepok: ALAP_BELEPOK, ismertek: await ismertek() });
const kb = (b) => (b / 1024).toFixed(1).replace('.', ',') + ' KB';
const mp = (ms) => (ms / 1000).toFixed(1).replace('.', ',') + ' mp';
const ora = () => new Date().toLocaleTimeString('hu-HU', { hour12: false });
const varj = (ms) => new Promise((t) => setTimeout(t, ms));
const szazalek = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');

kiir('');
kiir('87. MÉRÉS — MEGTALÁLJA-E A MEGHÍVÓ A BELÉPŐ CETLIJÉT? — ' + new Date().toLocaleString('hu-HU'));
kiir('  szerep: ' + (mod === 'bejelent' ? 'KIÍRÓ (a belépő)' : 'KERESŐ (a meghívó)') + ' · kód ' + kod + ' · ' + temaDb
  + ' téma · a felismerő port ' + PORT + ' · ' + percek + ' perc');

/** Egy kliens: a témák sorban, mindkét úton — témánként: megvan-e (BEP 5: a mi portunk; BEP 44: érvényes aláírt bejegyzés). */
async function keresesek(kliens) {
  const ki = [];
  for (let i = 0; i < temaDb; i++) {
    let e = kliens.forgalom();
    let k0 = Date.now();
    const p = await kliens.tarsakKeresese(temak[i]);
    let u = kliens.forgalom();
    const b5 = { megvan: p.tarsak.some((x) => x.port === PORT), cimek: p.tarsak.map((x) => x.cim + ':' + x.port),
      ido: Date.now() - k0, bajt: u.ki - e.ki + u.be - e.be };
    e = kliens.forgalom();
    k0 = Date.now();
    const g = await kliens.keres(kulcsparok[i].nyilvanos, sok[i]);
    u = kliens.forgalom();
    const b44 = { megvan: !!g?.legjobb, ido: Date.now() - k0, bajt: u.ki - e.ki + u.be - e.be };
    ki.push({ b5, b44 });
  }
  return ki;
}

// ===== A KIÍRÓ (a telefon) =====

async function kiiro() {
  const vege = Date.now() + percek * 60000;
  let kor = 0;
  while (Date.now() < vege) {
    kor++;
    const a = await ujKliens();
    const elotte = a.forgalom();
    const k0 = Date.now();
    const t5 = [], t44 = [];
    for (let i = 0; i < temaDb; i++) {
      const be = await a.bejelent(temak[i], PORT);
      t5.push(be.tarolta + '/' + be.probalt);
      const b = await bejegyzesKeszitese({ kulcspar: kulcsparok[i].kulcspar, salt: sok[i], seq: Math.floor(Date.now() / 1000),
        ertek: 'meres87:' + i });
      const k = await a.kozzetesz(b);
      t44.push(k.tarolta + '/' + k.probalt);
    }
    const utana = a.forgalom();
    await ismertekMentese(a);
    a.bezar();
    kiir('  ' + ora() + ' KIÍRÁS ' + kor + ': BEP 5 ' + t5.join(', ') + ' · BEP 44 ' + t44.join(', ') + ' gép tárolta · '
      + mp(Date.now() - k0) + ' · ' + kb(utana.ki - elotte.ki + utana.be - elotte.be));
    // ⭐ Az M1 ellenőrző keresése: egy FRISS kliens (másik azonosító, másik foglalat) látja-e a saját cetlinket?
    await varj(5000);
    const c = await ujKliens();
    const r = await keresesek(c);
    await ismertekMentese(c);
    c.bezar();
    kiir('           ellenőrző keresés: BEP 5 ' + r.filter((x) => x.b5.megvan).length + '/' + temaDb + ' · BEP 44 '
      + r.filter((x) => x.b44.megvan).length + '/' + temaDb + ' témán látom a saját cetlimet');
    // a belépő őrjárata ~20 percenként jelentkezik újra
    const kovetkezo = k0 + 20 * 60000;
    if (kovetkezo >= vege) break;
    await varj(kovetkezo - Date.now());
  }
  kiir('  ' + ora() + ' vége.');
}

// ===== A KERESŐ (a laptop) =====

const o = { korok: 0, kerdes: 0, b5A: 0, b5AB: 0, b44A: 0, b44AB: 0, b5db: 0, b5ido: 0, b5bajt: 0, b44db: 0, b44ido: 0,
  b44bajt: 0, zajCimek: new Map(), zajEllenproban: new Set(), tevesSzures: 0, sajatCimek: new Set() };

async function kereso() {
  const kezdet = Date.now();
  const vege = kezdet + percek * 60000;
  while (Date.now() < vege) {
    const korKezdet = Date.now();
    o.korok++;
    const a = await ujKliens();
    const rA = await keresesek(a);
    await ismertekMentese(a);
    a.bezar();
    const b = await ujKliens();
    const rB = await keresesek(b);
    const ellen = await b.tarsakKeresese(randomBytes(20));
    await ismertekMentese(b);
    b.bezar();

    const ellenCimek = new Set(ellen.tarsak.map((x) => x.cim + ':' + x.port));
    for (const c of ellenCimek) o.zajEllenproban.add(c);
    let teves = 0;
    for (let i = 0; i < temaDb; i++) {
      o.kerdes++;
      if (rA[i].b5.megvan) o.b5A++;
      if (rA[i].b5.megvan || rB[i].b5.megvan) o.b5AB++;
      if (rA[i].b44.megvan) o.b44A++;
      if (rA[i].b44.megvan || rB[i].b44.megvan) o.b44AB++;
      for (const r of [rA[i], rB[i]]) {
        o.b5db++; o.b5ido += r.b5.ido; o.b5bajt += r.b5.bajt;
        o.b44db++; o.b44ido += r.b44.ido; o.b44bajt += r.b44.bajt;
        for (const c of r.b5.cimek) {
          if (Number(c.split(':')[1]) === PORT) {
            o.sajatCimek.add(c);
            if (ellenCimek.has(c)) teves++;
          } else {
            o.zajCimek.set(c, (o.zajCimek.get(c) ?? 0) + 1);
          }
        }
      }
    }
    o.tevesSzures += teves;
    const jel = (r, ut) => r.map((x) => (x[ut].megvan ? '●' : '·')).join('');
    kiir('  ' + ora() + ' (' + String(Math.round((korKezdet - kezdet) / 60000)).padStart(2) + '. perc)  BEP 5: A ' + jel(rA, 'b5')
      + ' B ' + jel(rB, 'b5') + '   BEP 44: A ' + jel(rA, 'b44') + ' B ' + jel(rB, 'b44')
      + '   · ellenpróba: ' + (ellenCimek.size ? [...ellenCimek].join(' ') : '(senki)') + (teves ? '  ⛔ a mi címünk az ellenpróbán!' : ''));
    const kovetkezo = korKezdet + 2 * 60000;
    if (kovetkezo >= vege) break;
    if (kovetkezo > Date.now()) await varj(kovetkezo - Date.now());
  }
  osszegzes();
}

function osszegzes() {
  if (!o.kerdes) return;
  const zajSzurt = [...o.zajCimek.keys()].filter((c) => o.zajEllenproban.has(c)).length;
  kiir('');
  kiir('  ÖSSZESEN ' + o.korok + ' kör, ' + o.kerdes + ' téma-kérdés (● = megvan a cetli):');
  kiir('    BEP 5  — egy kliens (A): ' + szazalek(o.b5A, o.kerdes) + ' · két kliens (A∪B): ' + szazalek(o.b5AB, o.kerdes)
    + ' · egy keresés átlag ' + mp(o.b5ido / o.b5db) + ', ' + kb(o.b5bajt / o.b5db));
  kiir('    BEP 44 — egy kliens (A): ' + szazalek(o.b44A, o.kerdes) + ' · két kliens (A∪B): ' + szazalek(o.b44AB, o.kerdes)
    + ' · egy keresés átlag ' + mp(o.b44ido / o.b44db) + ', ' + kb(o.b44bajt / o.b44db));
  kiir('  a BEP 5 cetli ezekről a címekről jött: ' + ([...o.sajatCimek].join(' ') || '(egyikről sem)'));
  kiir('  zaj (BEP 5): ' + o.zajCimek.size + ' különböző idegen cím — ebből ' + zajSzurt
    + ' az ellenpróbán is megjelent (ennyit szűrne ki az M3 (b)) · téves szűrés (a mi címünk az ellenpróbán): ' + o.tevesSzures);
  kiir('');
}

process.on('SIGINT', () => {
  if (mod === 'keres') osszegzes();
  process.exit(0);
});

if (mod === 'bejelent') await kiiro();
else await kereso();
process.exit(0);
