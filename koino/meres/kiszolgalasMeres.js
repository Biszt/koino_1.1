// koino/meres/kiszolgalasMeres.js

// Felelősség: ⭐ A 76. MÉRÉS — MENNYIBE KERÜL EGY KÉRÉS KISZOLGÁLÁSA? (D108: a kiszolgálási keret előtt, 2026-10-17)
//
// A D108 szerint a valódi védelem a kiszolgálónál van: egy közös és egy társankénti időkeret. Hogy mekkora legyen, ahhoz két
// dolgot kell tudni: (1) mennyibe kerül a KISZOLGÁLÓNAK egy-egy kéréstípus (a válasz bájtjai ÉS a számítás ideje), és (2)
// mennyit kér egy BECSÜLETES használat (egy új tag böngészése, egy felderítés) — a keret ezt soha ne fogja meg.
//
// Mit mér (egy szintetikus koinón, a memóriában — a valódi aláírt eseményekkel, a kiszolgáló valódi függvényeivel):
//   · az ÁLLAPOT kiszámítása (a `kepetKeszit` magja — ma MINDEN fejléc-kérelem újraszámolja, gyorsítótár nélkül);
//   · a FEJLÉCEK válasza (`fejlecekValasza` — a gyökér mélyen és egy belső csomópont egy szinten, n = 50) és a MINTÁK
//     (`mintakValasza` a kérdező alap-választásával): idő és bájt, hidegen és melegen (a részfa-karbantartó megmarad);
//   · a SZELET válasza (a saját eseményei + a hozzá bejelentett születések): bájt;
//   · és a mai kérésenkénti felső határokból a legrosszabb válasz (`VALASZ_ESEMENY_KORLAT`, `FEJLEC_KORLAT`, `TORZS_KORLAT`
//     × `FAJL_KORLAT`, `SOROZAT_KORLAT`).
// ⚠️ A beolvasás (a tár → memória) nincs benne: a 49. mérés szerint 100 000 esemény ~0,4 s (egy adatfájl + a mutató).
//
// Futtatás: node koino/meres/kiszolgalasMeres.js [gondolatok száma ...]   (alapból 500 2500 10000)

import { performance } from 'node:perf_hooks';

import { ujEember, tagokkal } from './probaFuttato.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { reszfaKarbantarto, osszPontokSzamitasa } from '../js/allapot/osszPont.js';
import { GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';
import { szelet, bejelentesHelyei } from '../js/esemeny/esemeny.js';
import {
  fejlecekValasza, fejlecKepe, mintakValasza, mintaKeres, FEJLEC_KORLAT, SOROZAT_KORLAT, VALASZ_ESEMENY_KORLAT, TORZS_KORLAT,
  BEJARAS_LEPES_KORLAT
} from '../js/csere/kerelem.js';
import { FAJL_KORLAT } from '../js/tar/fajlTar.js';

// A könyvtár részletes naplója a mérést elnyomná — a mérés a saját kiírását használja.
const kiir = console.log.bind(console);
console.log = () => {};
console.warn = () => {};

const meretek = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0);
const GONDOLATOK = meretek.length ? meretek : [500, 2500, 10000];
const EMBEREK = 120;

// ===== Egy magvas véletlen (összevethető futások) =====
let mag = 20261017;
const veletlen = () => { mag = (mag * 1103515245 + 12345) % 2147483648; return mag / 2147483648; };

const kb = (b) => (b / 1024).toFixed(1) + ' KB';
const ms = (t) => t.toFixed(1) + ' ms';
const bajt = (x) => Buffer.byteLength(JSON.stringify(x));
async function idozit(fn) { const t0 = performance.now(); const r = await fn(); return { r, t: performance.now() - t0 }; }

/**
 * A koinó: `g` gondolat, ~50 legfelső szintű, a többi egy korábbi alá (a frissebbek felé húzva — mély ágak is vannak);
 * mindegyiken a szerzője pontja, és fele eséllyel egy másik e-emberé is. A szerzők tagok (`tagokkal`).
 */
async function koinoEpitese(g, lapos = false) {
  const emberek = [];
  for (let i = 0; i < EMBEREK; i++) emberek.push(await ujEember('meres'));
  const es = [];
  const gondolatok = [];
  for (let i = 0; i < g; i++) {
    const ki = emberek[Math.floor(veletlen() * EMBEREK)];
    const szulo = lapos || i < 50 ? null : gondolatok[Math.floor(Math.sqrt(veletlen()) * gondolatok.length)];
    const e = await ki.tesz('GondolatLetrehozas', { cim: 'G' + i, meret: 10, ...(szulo ? { szulo } : {}) });
    es.push(e);
    gondolatok.push(e.azonosito);
    es.push(await ki.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 1 + Math.floor(veletlen() * 20) }));
    if (veletlen() < 0.5) {
      const masik = emberek[Math.floor(veletlen() * EMBEREK)];
      if (masik !== ki) es.push(await masik.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 1 + Math.floor(veletlen() * 10) }));
    }
  }
  return { esemenyek: await tagokkal(es), gondolatok };
}

/** Egy fejléc-kérés kiszolgálása a mintákkal együtt (a kérdező alap-választásával), a válaszok bájtjával. */
async function fejlecKeres(allapot, terkep, karbantarto, kulcs, m, kep = null) {
  const esemenyOlvas = async (az) => terkep.get(az) ?? null;
  const fej = await idozit(() => fejlecekValasza({ allapot, kulcs, n: FEJLEC_KORLAT, m, karbantarto, esemenyOlvas, kep }));
  const { valasz, fak } = fej.r;
  const kert = mintaKeres(valasz, { kivalasztott: valasz.lista[0]?.az ?? null });
  const minta = await idozit(() => mintakValasza({ fak, kert, esemenyOlvas }));
  return { tFej: fej.t, tMinta: minta.t, bFej: bajt({ uzenet: 'FEJLECEK', valasz }), bMinta: bajt({ uzenet: 'MINTAK', ...minta.r }),
    tetel: valasz.lista.length };
}

kiir('A 76. MÉRÉS — MENNYIBE KERÜL EGY KÉRÉS KISZOLGÁLÁSA (a kiszolgáló oldalán, a memóriában; a beolvasás nélkül)');
kiir('');

const eredmenyek = [];
for (const g of GONDOLATOK) {
  const epit = await idozit(() => koinoEpitese(g));
  const { esemenyek, gondolatok } = epit.r;
  const terkep = new Map(esemenyek.map((e) => [e.azonosito, e]));
  const atlagBajt = esemenyek.reduce((o, e) => o + bajt({ uzenet: 'ESEMENY', esemeny: e }), 0) / esemenyek.length;

  // ----- Az állapot (a `kepetKeszit` magja): háromszor, a legjobb (a JIT bemelegedése után) -----
  let tAllapot = Infinity;
  let allapot = null;
  for (let i = 0; i < 3; i++) {
    const a = await idozit(async () => {
      const al = allapotSzamitasa(esemenyek);
      javaslatokSzamitasa(al.szamitok, al, Date.now(), {});
      return al;
    });
    tAllapot = Math.min(tAllapot, a.t);
    allapot = a.r;
  }

  // ----- A fejlécek: a gyökér mélyen, és a legtöbb gyerekű belső csomópont egy szinten — hidegen és melegen -----
  const gyerekSzam = new Map();
  for (const e of allapot.entitasok.values()) if (e.szulo) gyerekSzam.set(e.szulo, (gyerekSzam.get(e.szulo) ?? 0) + 1);
  const belso = [...gyerekSzam.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? gondolatok[0];
  const karbantarto = reszfaKarbantarto();
  const gyokerHideg = await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true);
  const gyokerMeleg = await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true);
  const belsoMeleg = await fejlecKeres(allapot, terkep, karbantarto, belso, false);
  // ⭐ D109 (KK1): a kiszolgáló képe a gyorsítótárból — a kép egyszer készül (változásonként), a kérések újrahasznosítják.
  const kepKeszul = await idozit(() => fejlecKepe(allapot, osszPontokSzamitasa(allapot.entitasok, new Map(), () => true)));
  await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true, kepKeszul.r);
  const gyokerKeppel = await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true, kepKeszul.r);
  const belsoKeppel = await fejlecKeres(allapot, terkep, karbantarto, belso, false, kepKeszul.r);

  // ----- A szelet: a saját eseményei + a hozzá bejelentettek (a gyerekek születése) -----
  const szeletBajt = new Map();
  for (const e of esemenyek) {
    const b = bajt({ uzenet: 'ESEMENY', esemeny: e });
    for (const k of [szelet(e), ...bejelentesHelyei(e)]) szeletBajt.set(k, (szeletBajt.get(k) ?? 0) + b);
  }
  const gondolatSzeletek = gondolatok.map((az) => szeletBajt.get(az) ?? 0).sort((a, b) => a - b);
  const median = gondolatSzeletek[Math.floor(gondolatSzeletek.length / 2)];
  const legnagyobb = gondolatSzeletek[gondolatSzeletek.length - 1];

  eredmenyek.push({ g, n: esemenyek.length, tEpit: epit.t, atlagBajt, tAllapot, gyokerHideg, gyokerMeleg, belsoMeleg,
    tKep: kepKeszul.t, gyokerKeppel, belsoKeppel,
    belsoGyerek: gyerekSzam.get(belso) ?? 0, median, legnagyobb });

  kiir('— ' + g + ' gondolat, ' + esemenyek.length + ' esemény (felépítés ' + (epit.t / 1000).toFixed(1) + ' s), egy esemény a vonalon átlag '
    + Math.round(atlagBajt) + ' B');
  kiir('   az állapot kiszámítása (minden fejléc-kérelem ma újraszámolja):     ' + ms(tAllapot));
  kiir('   a gyökér fejlécei mélyen, n = 50 — hidegen:  ' + ms(gyokerHideg.tFej) + ' + minták ' + ms(gyokerHideg.tMinta)
    + ' · válasz ' + kb(gyokerHideg.bFej) + ' + minták ' + kb(gyokerHideg.bMinta) + ' (' + gyokerHideg.tetel + ' tétel)');
  kiir('                                    melegen:   ' + ms(gyokerMeleg.tFej) + ' + minták ' + ms(gyokerMeleg.tMinta));
  kiir('   egy belső csomópont (' + (gyerekSzam.get(belso) ?? 0) + ' gyerek) egy szinten, melegen: ' + ms(belsoMeleg.tFej)
    + ' · válasz ' + kb(belsoMeleg.bFej) + ' + minták ' + kb(belsoMeleg.bMinta));
  kiir('   egy gondolat szelete (+ a bejelentett gyerekszületések): medián ' + kb(median) + ', a legnagyobb ' + kb(legnagyobb));
  kiir('   ⭐ D109 (KK1) a kép gyorsítótárával: a kép (változásonként egyszer) ' + ms(kepKeszul.t) + ' · egy kérés: a gyökér mélyen '
    + ms(gyokerKeppel.tFej) + ', egy szint ' + ms(belsoKeppel.tFej) + ' (+ minták)');
  kiir('');
}

// ===== ⭐ D109 (KK1): a LAPOS koinó — minden gondolat legfelső szintű, a gyökér gyerekszáma maga a koinó =====
// A lusta összefésülés előtt a gyökér minden gyereke minden kérésnél a kupacba került (a koinóval nőtt); a kép rendezett
// gyereklistájával a kérés a lista hossza.
{
  const g = Math.max(...GONDOLATOK);
  const { esemenyek } = await koinoEpitese(g, true);
  const terkep = new Map(esemenyek.map((e) => [e.azonosito, e]));
  const allapot = allapotSzamitasa(esemenyek);
  const karbantarto = reszfaKarbantarto();
  await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true);
  const kepNelkul = await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true);
  const kep = await idozit(() => fejlecKepe(allapot, osszPontokSzamitasa(allapot.entitasok, new Map(), () => true)));
  await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true, kep.r);
  const keppel = await fejlecKeres(allapot, terkep, karbantarto, GYOKER_KULCS, true, kep.r);
  kiir('— LAPOS koinó: ' + g + ' legfelső szintű gondolat (' + esemenyek.length + ' esemény) — a gyökér fejlécei mélyen, n = 50, melegen:');
  kiir('   kép nélkül (minden kérés mindent számol és rendez): ' + ms(kepNelkul.tFej)
    + ' · a kép gyorsítótárával: ' + ms(keppel.tFej) + ' (a kép egyszer: ' + ms(kep.t) + ')');
  kiir('');
}

// ===== A mai kérésenkénti felső határok — a legrosszabb válasz (számolva) =====
const atlag = eredmenyek.length ? eredmenyek[eredmenyek.length - 1].atlagBajt : 500;
const szeletMax = VALASZ_ESEMENY_KORLAT * atlag;
const torzsMax = TORZS_KORLAT * FAJL_KORLAT;
kiir('A MAI KÉRÉSENKÉNTI FELSŐ HATÁROK — a legrosszabb válasz (számolva, ~' + Math.round(atlag) + ' B/esemény):');
kiir('   szelet:   ≤ ' + VALASZ_ESEMENY_KORLAT + ' esemény ≈ ' + kb(szeletMax) + ' (+ a tagsági kísérők, ≤ 1024 esemény ≈ ' + kb(1024 * atlag) + ')');
kiir('   fejlécek: ≤ ' + FEJLEC_KORLAT + ' tétel + minták (lásd fent), a bejárás ≤ ' + BEJARAS_LEPES_KORLAT + ' lépés');
kiir('   törzs:    ≤ ' + TORZS_KORLAT + ' fájl × ' + (FAJL_KORLAT / 1024 / 1024) + ' MB = ' + (torzsMax / 1024 / 1024) + ' MB');
kiir('   egy kapcsolaton ≤ ' + SOROZAT_KORLAT + ' kérés: szeletből ≈ ' + (SOROZAT_KORLAT * szeletMax / 1024 / 1024).toFixed(1)
  + ' MB, törzsből ≈ ' + (SOROZAT_KORLAT * torzsMax / 1024 / 1024 / 1024).toFixed(1) + ' GB — és a kapcsolat után a következő jöhet');
