// koino/meres/szeletTarMeres.js

// Felelősség: A B LÉPÉS ELŐTTI MÉRÉS (49.) — mit ér és mibe kerül az entitásonkénti tár
// (S3, [`docs/szeleteles_terv.md`](../../docs/szeleteles_terv.md) 3. és 5./B).
//
// ===== MIÉRT KELL ELŐBB MÉRNI =====
//
// A terv azt mondja: szeletenként egy fájl, egy kis jegyzék, lusta betöltés — és a megnyitás
// „csak a jegyzéket olvassa". ⚠️ De a tárat ma NÉGY kérdés éri, és a jegyzék csak az egyikre
// felel:
//
//   · `szeletEsemenyei(szelet)`   — a szelet-fájl (ez a terv magja)
//   · `esemeny(azonosito)`        — azonosító szerint (horgonyok, javaslatok) → melyik szeletben?
//   · `szerzoLanca(szerzo)`       — egy szerző lánca (a saját is, az IDEGEN is: jelzések,
//                                   identitás) → a lánc sok szeleten át fut
//   · `sorszamSzerint(szerzo, n)` — MINDEN mentésnél (az elágazás-keresés)
//
// Ma mind a négy egy memóriabeli mutatóból felel, amit a megnyitás az ÖSSZES eseményből épít
// (48. mérés: 813 ms). A kérdés tehát nem az, hogy „fájlokra bontsuk-e", hanem hogy a másik
// három kérdés MIBŐL feleljen — és az mennyibe kerül megnyitáskor, íráskor, kérdezéskor.
//
// ===== AMIT MÉR =====
//
//   A. a mai megnyitás (az alapvonal)
//   B. a szeletek alakja: hány szelet, mekkora a legnagyobb (a tömeges entitás, 4.6)
//   C. a jelölt fájlok mérete, és a MEGNYITÁS ára mindegyikkel:
//        1. jegyzék (szeletenként: darab + lenyomat)
//        2. egyetlen mutató-napló (eseményenként egy rövid sor: azonosító, szelet, szerző, sorszám)
//        3. szétosztott mutató (azonosító-vödrök + szerzőnkénti lánc-fájlok) — lustán olvasva
//   D. az alapműveletek ára: hozzáfűzés, egy szelet / vödör / lánc betöltése, minden fájl
//      végigkérdezése (`stat`), a legnagyobb szelet lenyomata
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad, nem igen/nem-et), és nem kerül a `mind.js`-be.
//
//   node koino/meres/szeletTarMeres.js            → 100 000 esemény
//   node koino/meres/szeletTarMeres.js 10000      → más méret

import { kiir } from './naplo.js';

import { readFile, writeFile, appendFile, mkdir, rm, rename, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

import { tarGyartasa } from './skalaMeres.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { szelet } from '../js/esemeny/esemeny.js';

const KOINO = 'skalameres';

// ===================================
// SEGÉDEK
// ===================================

async function ido(muvelet) {
  const kezdet = process.hrtime.bigint();
  const eredmeny = await muvelet();
  return { ms: Number(process.hrtime.bigint() - kezdet) / 1e6, eredmeny };
}

const ms = (x) => x.toFixed(x < 10 ? 2 : 0) + ' ms';
const kb = (b) => (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB';
const vodor = (azonosito) => azonosito.slice(0, 2);
const lenyomat = (azonositok) => createHash('sha256')
  .update([...azonositok].sort().join('\n')).digest('base64url');

/** Soronként JSON — ahogy a tár olvas. */
function sorokbol(szoveg) {
  const ki = [];
  for (const sor of szoveg.split('\n')) if (sor.trim()) ki.push(JSON.parse(sor));
  return ki;
}

// Egyszerű, magvas véletlen — hogy két futás ugyanazokat a szeleteket válassza.
function veletlenGyar(mag = 49) {
  let x = mag;
  return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
}

// ===================================
// A MÉRÉS
// ===================================

async function fut() {
  const darab = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100000;
  const hely = join(tmpdir(), 'koino-szelettar-' + darab + '-' + Date.now());
  const veletlen = veletlenGyar();

  kiir('');
  kiir('SZELET-TÁR MÉRÉS (49.) — ' + darab.toLocaleString('hu-HU') + ' esemény · Node '
    + process.version + ' · ' + process.platform);

  try {
    const { fajl } = await tarGyartasa(darab, hely);
    const mappa = join(hely, KOINO);

    // ----- A. A VALÓDI TÁR (D73) — az első és a második megnyitás -----
    // ⚠️ A D73 előtti megnyitás (minden esemény a memóriában, pillanatkép nélkül) ugyanezen a
    // gépen 689–759 ms volt — ennek a mérésnek az első futásai (eredmenyek.md, 49.).
    const mai = await ido(() => esemenyTarNyitasa(KOINO, hely));
    const kepbol = await ido(() => esemenyTarNyitasa(KOINO, hely));
    const t = kepbol.eredmeny;
    const nyitasUtan = t.mutatoAllapota();
    const tSzeletek = (await t.szeletek()).map((x) => x.szelet);
    const tSzelet = await ido(async () => {
      for (let i = 0; i < 200; i++) await t.szeletEsemenyei(tSzeletek[Math.floor(veletlen() * tSzeletek.length)]);
    });
    const tLenyomat = await ido(async () => {
      for (let i = 0; i < 200; i++) await t.szeletLenyomata(tSzeletek[Math.floor(veletlen() * tSzeletek.length)]);
    });
    const tMind = await ido(() => t.betolt());
    kiir('');
    kiir('A. A VALÓDI TÁR (D73: egy adatfájl + a mutató pillanatképe)');
    kiir('   első megnyitás (a fájlból, és megírja a képet):  ' + ms(mai.ms)
      + '   · pillanatképből: ' + mai.eredmeny.mutatoAllapota().pillanatkepbol);
    kiir('   ⭐ második megnyitás (a pillanatképből):          ' + ms(kepbol.ms)
      + '   · pillanatképből: ' + nyitasUtan.pillanatkepbol
      + ' · betöltött test a megnyitás után: ' + nyitasUtan.betoltottTest);
    kiir('   egy szelet eseményei (a képből nyitott tárban):  ' + ms(tSzelet.ms / 200));
    kiir('   egy szelet lenyomata (test nélkül):              ' + ms(tLenyomat.ms / 200));
    kiir('   a teljes betöltés (betolt) a képből nyitott tárban: ' + ms(tMind.ms)
      + ' (' + tMind.eredmeny.length + ' esemény)');

    // ----- B. A SZELETEK ALAKJA -----
    const esemenyek = sorokbol(await readFile(fajl, 'utf8'));
    const szeletek = new Map();          // szelet → események
    const szerzok = new Map();           // szerző → események
    for (const e of esemenyek) {
      const s = szelet(e);
      if (!szeletek.has(s)) szeletek.set(s, []);
      szeletek.get(s).push(e);
      if (!szerzok.has(e.szerzo)) szerzok.set(e.szerzo, []);
      szerzok.get(e.szerzo).push(e);
    }
    const meretek = [...szeletek.values()].map((l) => l.length).sort((a, b) => a - b);
    const hanyad = (p) => meretek[Math.min(meretek.length - 1, Math.floor(p * meretek.length))];
    kiir('');
    kiir('B. A SZELETEK: ' + szeletek.size.toLocaleString('hu-HU') + ' szelet · '
      + szerzok.size + ' szerző · eseményszám szeletenként: medián ' + hanyad(0.5)
      + ', 99% ' + hanyad(0.99) + ', legnagyobb ' + meretek[meretek.length - 1]);

    // ----- C. A JELÖLT FÁJLOK -----
    // 0. A szelet-fájlok (a terv magja — mindhárom jelöltben ugyanaz).
    const szeletIras = await ido(async () => {
      let bajt = 0;
      for (const [s, lista] of szeletek) {
        const dir = join(mappa, 'szeletek', vodor(s));
        await mkdir(dir, { recursive: true });
        const szoveg = lista.map((e) => JSON.stringify(e)).join('\n') + '\n';
        bajt += Buffer.byteLength(szoveg);
        await writeFile(join(dir, s + '.jsonl'), szoveg);
      }
      return bajt;
    });

    // 1. A jegyzék: szeletenként [darab, lenyomat].
    const jegyzekObj = {};
    for (const [s, lista] of szeletek) jegyzekObj[s] = [lista.length, lenyomat(lista.map((e) => e.azonosito))];
    const jegyzekSzoveg = JSON.stringify(jegyzekObj);
    const jegyzekFajl = join(mappa, 'szeletek.json');
    const jegyzekIras = await ido(async () => {
      await writeFile(jegyzekFajl + '.uj', jegyzekSzoveg);
      await rename(jegyzekFajl + '.uj', jegyzekFajl);
    });
    const jegyzekOlvasas = await ido(async () => JSON.parse(await readFile(jegyzekFajl, 'utf8')));

    // 2. Egyetlen mutató-napló: eseményenként egy rövid sor.
    const mutatoFajl = join(mappa, 'mutato.jsonl');
    await writeFile(mutatoFajl, esemenyek.map((e) =>
      JSON.stringify({ a: e.azonosito, s: szelet(e), z: e.szerzo, n: e.sorszam })).join('\n') + '\n');
    const mutatoOlvasas = await ido(async () => {
      const azon = new Map(), lanc = new Map(), db = new Map();
      for (const m of sorokbol(await readFile(mutatoFajl, 'utf8'))) {
        azon.set(m.a, m.s);
        if (!lanc.has(m.z)) lanc.set(m.z, []);
        lanc.get(m.z).push(m);
        db.set(m.s, (db.get(m.s) ?? 0) + 1);
      }
      return azon.size;
    });

    // 3. Szétosztott mutató: azonosító-vödrök (az első két jel) + szerzőnkénti lánc-fájlok.
    const vodrok = new Map();
    for (const e of esemenyek) {
      const v = vodor(e.azonosito);
      if (!vodrok.has(v)) vodrok.set(v, []);
      vodrok.get(v).push(JSON.stringify({ a: e.azonosito, s: szelet(e) }));
    }
    let vodorBajt = 0;
    for (const [v, sorok] of vodrok) {
      await mkdir(join(mappa, 'azonositok'), { recursive: true });
      const sz = sorok.join('\n') + '\n';
      vodorBajt += Buffer.byteLength(sz);
      await writeFile(join(mappa, 'azonositok', v + '.jsonl'), sz);
    }
    let lancBajt = 0;
    for (const [z, lista] of szerzok) {
      const dir = join(mappa, 'lancok', vodor(z));
      await mkdir(dir, { recursive: true });
      const sz = lista.map((e) => JSON.stringify({ n: e.sorszam, a: e.azonosito, s: szelet(e) })).join('\n') + '\n';
      lancBajt += Buffer.byteLength(sz);
      await writeFile(join(dir, z + '.jsonl'), sz);
    }

    const esemenyBajt = (await stat(fajl)).size;
    kiir('');
    kiir('C. A JELÖLTEK — méret és a MEGNYITÁS ára');
    kiir('   a mai egy fájl:                 ' + kb(esemenyBajt));
    kiir('   0. a szelet-fájlok:             ' + kb(szeletIras.eredmeny) + ' ('
      + szeletek.size + ' fájl; a szétválogatás ideje ' + ms(szeletIras.ms) + ')');
    kiir('   1. jegyzék:                     ' + kb(Buffer.byteLength(jegyzekSzoveg))
      + ' · megnyitás (olvasás + JSON): ' + ms(jegyzekOlvasas.ms)
      + ' · újraírás (átnevezéssel): ' + ms(jegyzekIras.ms));
    kiir('   2. egyetlen mutató-napló:       ' + kb((await stat(mutatoFajl)).size)
      + ' · megnyitás (olvasás + a három térkép): ' + ms(mutatoOlvasas.ms));
    kiir('   3. szétosztott mutató:          azonosító-vödrök ' + kb(vodorBajt) + ' ('
      + vodrok.size + ' vödör, átlag ' + Math.round(esemenyek.length / vodrok.size)
      + ' sor) · lánc-fájlok ' + kb(lancBajt) + ' (' + szerzok.size + ' fájl) · megnyitáskor 0');

    // ----- D. AZ ALAPMŰVELETEK -----
    const minta = [...szeletek.keys()];
    const valassz = (lista) => lista[Math.floor(veletlen() * lista.length)];
    const sor = JSON.stringify(esemenyek[0]) + '\n';

    const egyFajlba = await ido(async () => {
      const f = join(mappa, 'hozzafuzes-proba.jsonl');
      for (let i = 0; i < 500; i++) await appendFile(f, sor);
    });
    const sokFajlba = await ido(async () => {
      for (let i = 0; i < 500; i++) {
        const s = valassz(minta);
        await appendFile(join(mappa, 'szeletek', vodor(s), s + '.jsonl'), sor);
      }
    });
    const szeletBetoltes = await ido(async () => {
      for (let i = 0; i < 200; i++) {
        const s = valassz(minta);
        sorokbol(await readFile(join(mappa, 'szeletek', vodor(s), s + '.jsonl'), 'utf8'));
      }
    });
    const vodorBetoltes = await ido(async () => {
      const kulcsok = [...vodrok.keys()];
      for (let i = 0; i < 200; i++) {
        sorokbol(await readFile(join(mappa, 'azonositok', valassz(kulcsok) + '.jsonl'), 'utf8'));
      }
    });
    const lancBetoltes = await ido(async () => {
      const kulcsok = [...szerzok.keys()];
      for (let i = 0; i < 200; i++) {
        const z = valassz(kulcsok);
        sorokbol(await readFile(join(mappa, 'lancok', vodor(z), z + '.jsonl'), 'utf8'));
      }
    });
    const mindStat = await ido(async () => {
      let n = 0;
      for (const v of await readdir(join(mappa, 'szeletek'))) {
        for (const f of await readdir(join(mappa, 'szeletek', v))) {
          await stat(join(mappa, 'szeletek', v, f));
          n++;
        }
      }
      return n;
    });
    const legnagyobb = [...szeletek.values()].reduce((a, b) => (b.length > a.length ? b : a));
    const nagyBetoltes = await ido(async () => {
      const s = szelet(legnagyobb[0]);
      return sorokbol(await readFile(join(mappa, 'szeletek', vodor(s), s + '.jsonl'), 'utf8'));
    });
    const nagyLenyomat = await ido(async () => lenyomat(legnagyobb.map((e) => e.azonosito)));

    kiir('');
    kiir('D. AZ ALAPMŰVELETEK');
    kiir('   hozzáfűzés, ugyanabba a fájlba:        ' + ms(egyFajlba.ms / 500) + ' / sor');
    kiir('   hozzáfűzés, véletlen szelet-fájlba:    ' + ms(sokFajlba.ms / 500) + ' / sor');
    kiir('   egy szelet betöltése (véletlen):       ' + ms(szeletBetoltes.ms / 200));
    kiir('   egy azonosító-vödör betöltése:         ' + ms(vodorBetoltes.ms / 200));
    kiir('   egy szerző lánc-fájlja:                ' + ms(lancBetoltes.ms / 200)
      + ' (átlag ' + Math.round(esemenyek.length / szerzok.size) + ' sor)');
    kiir('   minden szelet-fájl végigkérdezése:     ' + ms(mindStat.ms) + ' (' + mindStat.eredmeny + ' fájl)');
    kiir('   a legnagyobb szelet (' + legnagyobb.length + ' esemény): betöltés '
      + ms(nagyBetoltes.ms) + ', lenyomat ' + ms(nagyLenyomat.ms));

    // ----- E. AZ ÖSSZES SZELET-FÁJL BETÖLTÉSE -----
    // ⚠️ A C lépésig a hétköznapi út (az állapot-számítás, a csere ÁLLÁS-a) MINDENT kér
    // (`koinoEsemenyei` → `betolt()`). Szelet-fájlokkal ez minden fájl megnyitása.
    const osszesSorban = await ido(async () => {
      let n = 0;
      for (const [s] of szeletek) {
        n += sorokbol(await readFile(join(mappa, 'szeletek', vodor(s), s + '.jsonl'), 'utf8')).length;
      }
      return n;
    });
    const osszesParhuzam = await ido(async () => {
      const kulcsok = [...szeletek.keys()];
      let n = 0;
      for (let i = 0; i < kulcsok.length; i += 64) {
        const reszek = await Promise.all(kulcsok.slice(i, i + 64).map((s) =>
          readFile(join(mappa, 'szeletek', vodor(s), s + '.jsonl'), 'utf8')));
        for (const r of reszek) n += sorokbol(r).length;
      }
      return n;
    });
    kiir('');
    kiir('E. A TELJES BETÖLTÉS SZELET-FÁJLOKBÓL (amit a C lépésig minden számítás kér)');
    kiir('   sorban:                   ' + ms(osszesSorban.ms) + ' (' + osszesSorban.eredmeny + ' esemény)');
    kiir('   64-esével párhuzamosan:   ' + ms(osszesParhuzam.ms));
    kiir('   (egy fájlból, a D73 tárral: ' + ms(tMind.ms) + ' a képből nyitott tárban)');

    // ----- F. EGY ADATFÁJL + MUTATÓ-PILLANATKÉP (a git csomag-fájljának mintájára) -----
    // Az adat marad, ahol ma van (egy hozzáfűzhető fájl, a kézi út alakja); mellette egy
    // PILLANATKÉP a mutatóról: eseményenként a sor helye (eltolás, hossz), az azonosító, a
    // szerző, a sorszám és a szelet — az esemény teste NÉLKÜL. A megnyitás ezt olvassa (és a
    // fájl pillanatkép utáni végét); a testek kérésre, a nyitva tartott fájlból jönnek.
    const nyers = await readFile(fajl);
    const helyek = [];
    for (let kezdet = 0; kezdet < nyers.length;) {
      const vege = nyers.indexOf(0x0a, kezdet);
      if (vege < 0) break;
      helyek.push([kezdet, vege - kezdet]);
      kezdet = vege + 1;
    }
    const szerzoTabla = [...szerzok.keys()];
    const szeletTabla = [...szeletek.keys()];
    const szerzoIndex = new Map(szerzoTabla.map((z, i) => [z, i]));
    const szeletIndex = new Map(szeletTabla.map((s, i) => [s, i]));
    const kep = {
      v: 1, fedett: nyers.length, szerzok: szerzoTabla, szeletek: szeletTabla,
      e: esemenyek.map((e, i) => [helyek[i][0], helyek[i][1], e.azonosito,
        szerzoIndex.get(e.szerzo), e.sorszam, szeletIndex.get(szelet(e))])
    };
    const kepFajl = join(mappa, 'mutato-jelolt.json');
    const kepIras = await ido(async () => {
      await writeFile(kepFajl + '.uj', JSON.stringify(kep));
      await rename(kepFajl + '.uj', kepFajl);
    });
    const kepNyitas = await ido(async () => {
      const k = JSON.parse(await readFile(kepFajl, 'utf8'));
      const azon = new Map(), lanc = new Map(), sz = new Map();
      for (const x of k.e) {
        azon.set(x[2], x);
        const z = k.szerzok[x[3]], s = k.szeletek[x[5]];
        if (!lanc.has(z)) lanc.set(z, []);
        lanc.get(z).push(x);
        if (!sz.has(s)) sz.set(s, []);
        sz.get(s).push(x);
      }
      return { azon, lanc, sz };
    });
    const { lanc: kLanc, sz: kSz } = kepNyitas.eredmeny;
    const { open } = await import('node:fs/promises');
    const fogantyu = await open(fajl, 'r');
    const testek = async (bejegyzesek) => {
      const ki = [];
      for (const x of bejegyzesek) {
        const b = Buffer.alloc(x[1]);
        await fogantyu.read(b, 0, x[1], x[0]);
        ki.push(JSON.parse(b.toString('utf8')));
      }
      return ki;
    };
    let kepSzelet, kepLanc;
    try {
      kepSzelet = await ido(async () => {
        for (let i = 0; i < 200; i++) await testek(kSz.get(valassz(minta)));
      });
      kepLanc = await ido(async () => {
        const kulcsok = [...kLanc.keys()];
        for (let i = 0; i < 20; i++) await testek(kLanc.get(valassz(kulcsok)));
      });
    } finally {
      await fogantyu.close();
    }
    kiir('');
    kiir('F. EGY ADATFÁJL + MUTATÓ-PILLANATKÉP');
    kiir('   a pillanatkép:            ' + kb((await stat(kepFajl)).size) + ' · írás (átnevezéssel): '
      + ms(kepIras.ms));
    kiir('   ⭐ megnyitás (olvasás + a három térkép, testek nélkül): ' + ms(kepNyitas.ms));
    kiir('   egy szelet testei (a nyitott fájlból): ' + ms(kepSzelet.ms / 200));
    kiir('   egy szerző lánca (átlag ' + Math.round(esemenyek.length / szerzok.size)
      + ' test):   ' + ms(kepLanc.ms / 20));
    kiir('   a teljes betöltés:        ugyanaz, mint ma (a fájl sorban olvasva)');
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
