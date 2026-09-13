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

/**
 * ⭐⭐ MAGVAS VÉLETLEN — hogy a mérés ÖSSZEHASONLÍTHATÓ legyen (2026-09-14).
 *
 * ⛔ Enélkül a veszteség-mérés minden futáson mást adna, és az „ablak előtt / ablak után"
 * összevetés **nem mérés lenne, hanem szerencse**. Ugyanaz a mag → ugyanaz a veszteség-minta.
 *
 * ⚠️ A HATÁRA KIMONDVA: a mag a *mintát* rögzíti, az *időzítést* nem — az újraküldések
 * sorrendje futásonként kicsit így is eltér. A szórást csökkenti, nem szünteti meg.
 */
function magvasVeletlen(mag) {
  let a = mag >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Két UDP-foglalat, egymásnak címezve — ez az „átfúrt rés" a mérésben.
 *
 * ⭐⭐ A VONAL HÁROM TULAJDONSÁGA ÁLLÍTHATÓ, és mindhárom a valóság egy-egy darabja:
 *
 *   · `kesleltetes` — az alap oda-út (a stop-and-wait ezt MINDEN darabra rárakja),
 *   · `ingadozas`   — ⭐ ehhez hozzáadódó szórás; ettől a csomagok **sorrendet is
 *                     cserélhetnek**, ami valódi hálózaton mindennapos,
 *   · `vesztes`     — ⛔ a csomagok ekkora hányada **elvész**.
 *
 * ⛔⛔ MIÉRT KELLETT A VESZTESÉG (Csaba, 2026-09-14): a vonalnak **veszteségre reagáló
 * ablakot** kell kapnia, és *veszteség-választ nem lehet becsületesen megépíteni olyan
 * műszerrel, ami soha nem veszít csomagot*. Az ugyanaz a csapda lenne, mint a vak próba:
 * zöld, és semmit nem bizonyít.
 */
async function udpParos({ kesleltetes = 0, ingadozas = 0, vesztes = 0, mag = 1 } = {}) {
  const nyit = () => new Promise((kesz) => {
    const h = createSocket('udp4');
    h.bind(0, '127.0.0.1', () => kesz(h));
  });
  const egyik = await nyit();
  const masik = await nyit();

  const veletlen = magvasVeletlen(mag);
  const szamlalo = { kuldott: 0, eldobott: 0 };

  // ⚠️⚠️ EZT A MÉRÉS TALÁLTA MEG A SAJÁT MŰSZERÉBEN (2026-09-14): 400 ms-os késleltetésnél
  // a függőben lévő küldések **TÚLÉLIK a foglalat bezárását**, és zárt foglalatra ütnek
  // (`ERR_SOCKET_DGRAM_NOT_RUNNING`) — a mérés összeomlott a leglassabb sornál.
  // *A műszert is meg kell mérni; a hiba nem a vonalé volt, hanem az enyém.*
  let zarva = false;
  const orak = new Set();

  // ⚠️ MINDIG beépítjük a számlálót — a késleltetés nélküli sor adja a VISZONYÍTÁST.
  // *Enélkül a „hányszor ment ki" oszlopnak nincs alapvonala, és az első olvasásra
  // újraküldésnek látszott az, ami valójában base64 + nyugta volt.*
  {
    for (const h of [egyik, masik]) {
      const eredeti = h.send.bind(h);
      h.send = (...ervek) => {
        if (zarva) return;
        szamlalo.kuldott++;

        // ⛔ A VESZTESÉG: a csomag elindul, és SOHA nem érkezik meg. ⚠️ A visszahívást
        // (callback) azért hívjuk meg sikerként, mert a küldő oldalon a UDP is ezt teszi:
        // a `send` sikere csak annyit jelent, hogy KIMENT — nem azt, hogy megérkezett.
        // *Ha itt hibát jeleznénk, a vonal olyat tudna meg, amit a valóságban nem tudhat.*
        if (vesztes > 0 && veletlen() < vesztes) {
          szamlalo.eldobott++;
          const visszahivas = ervek[ervek.length - 1];
          if (typeof visszahivas === 'function') visszahivas(null);
          return;
        }

        const ido = kesleltetes + (ingadozas > 0 ? veletlen() * ingadozas : 0);
        if (ido <= 0) return eredeti(...ervek);

        const ora = setTimeout(() => {
          orak.delete(ora);
          if (zarva) return;                 // ⛔ a foglalat közben bezárt
          eredeti(...ervek);
        }, ido);
        orak.add(ora);
      };
    }
  }

  return {
    egyik, masik, szamlalo,
    egyikPort: egyik.address().port,
    masikPort: masik.address().port,
    bezar: () => {
      zarva = true;
      for (const ora of orak) clearTimeout(ora);
      orak.clear();
      egyik.close(); masik.close();
    }
  };
}

async function ujBlob(nev) {
  return fajlBlobTarolo(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-' + nev + '-')));
}

async function ujTar() {
  return esemenyTarNyitasa(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-tar-')));
}

/**
 * Egy fájl átvitele az átfúrt résen — mennyi idő alatt?
 *
 * ⚠️⚠️ A BUKÁS IS EREDMÉNY, NEM HIBA (D19). Veszteség mellett a mai vonal **fel is adhatja**
 * (`UJRAKULDES_KORLAT = 20`), és ezt **ki kell írni**, nem elszállni rajta — *épp ez az egyik
 * dolog, amit meg akarunk tudni a mai vonalról.*
 */
async function resenMeres(meret, beallitas = {}) {
  const gazda = await ujBlob('a');
  const vendeg = await ujBlob('b');

  const tartalom = new Uint8Array(meret);
  for (let i = 0; i < meret; i++) tartalom[i] = i % 251;
  const { lenyomat } = await gazda.ir(tartalom);

  const p = await udpParos(beallitas);
  const gazdaTar = await ujTar();

  const kezd = Date.now();
  try {
    const [, eredmeny] = await Promise.all([
      parbeszed(udpKapcsolat(p.egyik, '127.0.0.1', p.masikPort), gazdaTar, KOINO,
        { fajlOlvas: (l) => gazda.olvas(l) }),
      fajlUdpResen(p.masik, '127.0.0.1', p.egyikPort, vendeg, KOINO, lenyomat,
        { varakozasiIdo: 120000 })
    ]);
    return {
      kesz: eredmeny.kesz, ido: Date.now() - kezd, szeletek: eredmeny.szeletek,
      csomag: p.szamlalo
    };
  } catch (hiba) {
    // ⛔ A vonal feladta. Ez SZÁM, nem összeomlás — a mérés kiírja, és megy tovább.
    return { kesz: false, ido: Date.now() - kezd, ok: hiba.message, csomag: p.szamlalo };
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

/** Méret → hány csomagba kerül ez a fájl TÖKÉLETES vonalon. Ez a viszonyítás. */
const alapvonal = new Map();

const sor = (cimke, meret, e) => {
  const kbs = e.ido > 0 ? (meret / 1024) / (e.ido / 1000) : Infinity;
  // ⭐ A TÉNYLEGES veszteséget írjuk ki, nem a kértet — a kettő kis mintán eltér, és a
  // mérésnek azt kell mondania, ami TÖRTÉNT (D19).
  const cs = e.csomag;
  // ⭐⭐ A CSOMAGSZÁM TESZI LÁTHATÓVÁ A PAZARLÁST — de csak VISZONYÍTVA.
  //
  // ⚠️ Az első kiírásom itt hazudott: a „×1,4" újraküldésnek látszott, pedig a **base64
  // (+33%) és a nyugták** adták. Ezért a viszonyítás a MÉRT alapvonal (a helyi sor
  // ugyanekkora fájlra), nem egy számolt ideál. *Ami e fölött van, az a pazarlás.*
  const alap = alapvonal.get(meret);
  const extra = cs && cs.kuldott
    ? '  ' + String(cs.kuldott).padStart(5) + ' csomag'
      + (alap && alap !== cs.kuldott ? '  ×' + (cs.kuldott / alap).toFixed(1) : '')
      + (cs.eldobott ? '  ' + (100 * cs.eldobott / cs.kuldott).toFixed(1) + '% veszett' : '')
    : '';
  kiir(
    '  ' + cimke.padEnd(30)
    + String(Math.round(meret / 1024)).padStart(5) + ' KB  '
    + String(e.ido).padStart(7) + ' ms  '
    + (e.kesz && Number.isFinite(kbs) ? kbs.toFixed(0).padStart(6) + ' KB/s' : '       —')
    + (e.kesz ? extra : '   ⛔ FELADTA' + extra)
  );
};

kiir('\n⭐ A FÁJL-ÁTVITEL SEBESSÉGE — TCP vs. az átfúrt rés\n');
kiir('  ' + 'mérés'.padEnd(30) + 'méret'.padStart(8) + '        idő      sebesség');
kiir('  ' + '─'.repeat(72));

for (const meret of [64 * 1024, 256 * 1024]) {
  sor('TCP (helyben)', meret, await tcpMeres(meret));
  const helyi = await resenMeres(meret);
  alapvonal.set(meret, helyi.csomag.kuldott);      // ⭐ EZ lesz a viszonyítás
  sor('UDP-rés (helyben)', meret, helyi);
}

// ⚠️ A lassú sorok 8 KB-tal mérnek — ahhoz is kell alapvonal, különben a `×` oszlopnak
// nincs mihez képest. Ezt csendben vesszük fel (nem tábla-sor, csak viszonyítás).
alapvonal.set(8 * 1024, (await resenMeres(8 * 1024)).csomag.kuldott);

// ⭐ MIT JELENT A STOP-AND-WAIT EGY VALÓDI HÁLÓZATON?
kiir('');
for (const kesleltetes of [1, 5]) {
  sor('UDP-rés (+' + kesleltetes + ' ms)', 64 * 1024, await resenMeres(64 * 1024, { kesleltetes }));
}

// ⭐⭐ ÉS AMI 2026-09-14-TŐL VAN: INGADOZÁS ÉS VESZTESÉG.
//
// ⛔ A D67 szerint a vonalnak **veszteségre reagáló ablakot** kell kapnia. Ez a szakasz
// adja hozzá az ALAPVONALAT: mit tud a MAI (stop-and-wait, fix 300 ms-os) vonal, ha a
// hálózat nem tökéletes. *Amit itt látunk, azt kell majd megjavítani.*
kiir('');
for (const ingadozas of [5, 20]) {
  sor('UDP-rés (1 ms ± ' + ingadozas + ' ms szórás)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, ingadozas }));
}

kiir('');
for (const vesztes of [0.01, 0.05, 0.15]) {
  sor('UDP-rés (1 ms, ' + (vesztes * 100) + '% vesztés)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, vesztes }));
}

// ⛔⛔ ÉS A LEGÉLESEBB PRÓBA A FIX ÚJRAKÜLDÉSI IDŐRE: egy LASSÚ vonal.
//
// A `UJRAKULDES_KOZ` **300 ms**. Ha az oda-vissza ennél hosszabb, a vonal **minden darabot
// újraküld, MIELŐTT a nyugta megérkezne** — vagyis dupla forgalom, önhibából. ⚠️ Ez nem
// elképzelt eset: műholdas, mobil- és zsúfolt vonalakon a 400–600 ms hétköznapi.
//
// ⭐ Kisebb fájllal mérjük, mert itt minden darab drága — a KÉP a fontos, nem a KB/s.
kiir('');
for (const kesleltetes of [200, 400]) {
  sor('UDP-rés (' + kesleltetes + ' ms → ' + (2 * kesleltetes) + ' ms oda-vissza)', 8 * 1024,
    await resenMeres(8 * 1024, { kesleltetes }));
}

kiir('\n⚠️ A `+N ms` a valódi hálózat közelítése. A stop-and-wait miatt a késleltetés');
kiir('   MINDEN darabra rárakódik: ~1000 bájtonként egy oda-vissza.');
kiir('   ⭐ Ezért kell a vonalnak ABLAK (több darab úton egyszerre) — a szelet');
kiir('   méretének növelése NEM segít rajta.');
kiir('');
kiir('⛔⛔ A VESZTESÉG- ÉS LASSÚ-SOROK A D67 ALAPVONALA.');
kiir('');
kiir('⚠️ ÉS AMIT A MÉRÉS CÁFOLT: azt vártam, hogy a vonal FELADJA (20 próbálkozás után).');
kiir('   Nem adta fel — sem 15% veszteségnél, sem 800 ms oda-visszánál. A `×` oszlop');
kiir('   mutatja a valódi kárt: hányszor megy ki egy darab ÁTLAGOSAN. ⭐ Ha ez 1,0');
kiir('   fölé megy lassú vonalon, az ÖNHIBÁNK: a fix 300 ms rövidebb, mint az');
kiir('   oda-vissza, tehát újraküldünk olyat, ami éppen ÚTON van.');
kiir('   ⛔ Ezért kell MÉRT újraküldési idő (RTT), nem beégetett szám.');
kiir('');
kiir('⚠️ A veszteség MAGVAS véletlenből jön (ugyanaz a mag → ugyanaz a minta), hogy az');
kiir('   „ablak előtt / ablak után" összevetés mérés legyen, ne szerencse. A mag a');
kiir('   mintát rögzíti, az időzítést nem — kis szórás marad.\n');

process.exit(0);
