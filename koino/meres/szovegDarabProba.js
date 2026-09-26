// koino/meres/szovegDarabProba.js

// Felelősség: bizonyítani, hogy A GONDOLAT SZÖVEGE KÜLÖN DARAB (D72, 2026-09-26) — és hogy
// ettől semmi nem romlik el, ami eddig működött.
//
// ⭐ MIT KELL ITT BIZONYÍTANI:
//   · a szöveg darabbá és vissza — a hivatkozás a kanonikus alak lenyomata;
//   · a gondolat eseménye NEM hordozza a szöveget, csak a hivatkozást — a darab a fájl-tárban;
//     darab-tár nélkül a művelet MEGNEVEZETTEN leáll (nem teszi csendben az eseménybe);
//   · ⭐⭐⭐ A D72 ÍGÉRETE: az állapot ujjlenyomata UGYANAZ, akár megvan a darab, akár nem —
//     és ami még nincs meg, azt a megjelenítés kimondja;
//   · a régi (szöveget hordozó) esemény ugyanúgy számol;
//   · az elfogadott módosítás a hivatkozást viszi át; és a különváló támogatók a JAVASOLT
//     szöveget viszik (a blokk-tömb és a hivatkozás ott eddig csendben kiesett);
//   · a fájl-igény: a darab maga, a benne lévő képek, és a javaslat új szövege;
//   · a kézi út viszi a darabot, és a hamis darabot nem veszi be.
//
// Futtatás: node koino/meres/mind.js szovegdarab

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import {
  szovegDarabra, szovegDarabbol, szovegHivatkozasE, azonosSzoveg
} from '../js/esemeny/szovegDarab.js';
import { lenyomat, kanonikusBajtok } from '../js/esemeny/kanonikusAlak.js';
import { esemenyTarNyitasa, fajlBlobTarolo } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import {
  koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese, javaslatLetrehozasa
} from '../js/muveletek.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { allapotUjjlenyomata } from '../js/allapot/osszehasonlitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from '../js/allapot/szerkesztesiVegrehajtas.js';
import { entitasSzovege } from '../js/allapot/pakli.js';
import { fajlIgenyek } from '../js/allapot/fajlIgeny.js';
import { kivitelSzovege, behozatalSzovegbol } from '../js/csere/fajlCsere.js';

const { proba, futtatas } = probaGyujtemeny('A SZÖVEG KÜLÖN DARAB (D72)');

const KOINO = 'szovegdarab-proba';

/** Egy valódi tár és fájl-tár egy eldobható mappában, egy valódi kulccsal. */
async function ujKornyezet() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-szovegdarab-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey))
    .toString('base64url');
  const darabTar = fajlBlobTarolo(KOINO, mappa);
  const kornyezet = { koino: KOINO, kulcspar, szerzo, tar, darabTar };
  await koinoLetrehozasa(kornyezet, 'Szöveg-darab próba');
  return { mappa, tar, kornyezet, darabTar };
}

// ===================================
// 1. A DARAB
// ===================================

proba('⭐ A SZÖVEG DARABBÁ ÉS VISSZA — a hivatkozás a kanonikus alak lenyomata', async () => {
  const blokkok = [{ id: 'b1', tipus: 'szoveg', tartalom: 'Árvíztűrő tükörfúrógép' }];
  const { hivatkozas, bajtok } = await szovegDarabra(blokkok);
  const sima = await szovegDarabra('egy sor');
  const mar = await szovegDarabra(hivatkozas);
  return szovegHivatkozasE(hivatkozas)
    && hivatkozas.lenyomat === await lenyomat(blokkok)
    && hivatkozas.bajt === bajtok.length
    // ⚠️ A kanonikus alak RENDEZI a mezőneveket — tehát kanonikusan hasonlítunk, nem JSON-sorrendben.
    && azonosSzoveg(szovegDarabbol(bajtok), blokkok)
    && szovegDarabbol(sima.bajtok) === 'egy sor'
    && mar.hivatkozas === hivatkozas && mar.bajtok === null        // nem csomagoljuk kétszer
    && (await szovegDarabra(null)).hivatkozas === null
    && (await szovegDarabra('')).hivatkozas === null;
});

proba('⭐⭐ A GONDOLAT ESEMÉNYE NEM HORDOZZA A SZÖVEGET — csak a hivatkozást; a darab a fájl-tárban', async () => {
  const { kornyezet, darabTar } = await ujKornyezet();
  const szoveg = [{ id: 'b1', tipus: 'szoveg', tartalom: 'Egy hosszú gondolat szövege' }];
  const e = await gondolatLetrehozasa(kornyezet, { cim: 'Cím', szoveg });
  const h = e.adat.szoveg;
  const darab = szovegHivatkozasE(h) ? await darabTar.olvas(h.lenyomat) : null;
  const { meret, ...adatMeretNelkul } = e.adat;
  return szovegHivatkozasE(h)
    && !JSON.stringify(e).includes('hosszú gondolat')                     // a szöveg NINCS benne
    && darab !== null
    && azonosSzoveg(szovegDarabbol(darab), szoveg)
    // ⭐ D26: a tárolási vállalás a darabot is magában foglalja
    && meret === kanonikusBajtok(adatMeretNelkul).length + h.bajt;
});

proba('⛔ DARAB-TÁR NÉLKÜL A MŰVELET MEGNEVEZETTEN LEÁLL — a szöveg nem kerül csendben az eseménybe', async () => {
  const { kornyezet } = await ujKornyezet();
  const { darabTar, ...nelkule } = kornyezet;
  // Szöveg NÉLKÜL a művelet darab-tár nélkül is megy (nincs mit darabbá tenni).
  const szovegNelkul = await gondolatLetrehozasa(nelkule, { cim: 'Csak cím' });
  try {
    await gondolatLetrehozasa(nelkule, { cim: 'Szöveggel', szoveg: 'valami' });
    return false;
  } catch (hiba) {
    return /darab-tár/.test(hiba.message) && szovegNelkul.adat.szoveg === null;
  }
});

// ===================================
// 2. ⭐⭐⭐ A D72 ÍGÉRETE
// ===================================

proba('⭐⭐⭐ A D72 ÍGÉRETE: az állapot ujjlenyomata UGYANAZ, akár megvan a darab, akár nem — és a hiányt kimondjuk', async () => {
  // ⭐ Két készülék UGYANAZOKKAL az eseményekkel; az egyiknél megvan a szöveg-darab, a másiknál
  // (még) nincs. A számítás a szöveg tartalmából semmit nem dönt el — ha valaki egyszer a
  // darabot az állapotba húzná, ez a próba bukna.
  const a = await ujKornyezet();
  const e = await gondolatLetrehozasa(a.kornyezet, { cim: 'Cím', szoveg: 'A gondolat szövege' });
  await tudatpontRendezese(a.kornyezet, e.azonosito, 50);

  const bMappa = await mkdtemp(join(tmpdir(), 'koino-szovegdarab-b-'));
  const bTar = await esemenyTarNyitasa(KOINO, bMappa);
  for (const ev of await a.tar.betolt()) await esemenyMentese(bTar, ev);

  const lenyomatA = await allapotUjjlenyomata(allapotSzamitasa(await a.tar.betolt()));
  const lenyomatB = await allapotUjjlenyomata(allapotSzamitasa(await bTar.betolt()));
  const szA = await entitasSzovege(a.tar, KOINO, e.azonosito,
    { darabOlvas: (l) => a.darabTar.olvas(l) });
  const szB = await entitasSzovege(bTar, KOINO, e.azonosito,
    { darabOlvas: (l) => fajlBlobTarolo(KOINO, bMappa).olvas(l) });
  return lenyomatA === lenyomatB
    && szA.szoveg === 'A gondolat szövege' && !szA.szovegHianyzik
    && szB.szoveg === null && szB.szovegHianyzik === true && szB.szovegLenyomat === e.adat.szoveg.lenyomat;
});

proba('⭐ A RÉGI (szöveget hordozó) ESEMÉNY UGYANÚGY SZÁMOL — és a megjelenítés darab nélkül is mutatja', async () => {
  const { tar } = await ujKornyezet();
  const anna = await ujEember(KOINO);
  const e = await anna.tesz('GondolatLetrehozas', { cim: 'Régi', szoveg: 'régi szöveg', meret: 10 });
  await esemenyMentese(tar, e);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 10 }));
  const sz = await entitasSzovege(tar, KOINO, e.azonosito, {});
  const allapot = allapotSzamitasa(await tar.betolt());
  return sz.szoveg === 'régi szöveg' && !sz.szovegHianyzik
    && allapot.entitasok.get(e.azonosito).szoveg === 'régi szöveg';
});

// ===================================
// 3. A SZERKESZTÉS — a hivatkozás mint új szöveg
// ===================================

const KEZDET = Date.UTC(2026, 0, 1);
const KESOBB = KEZDET + 30 * 24 * 3600 * 1000;
const KUSZOBOK = { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 };

async function kep(esemenyek) {
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, KESOBB);
  return { allapot, javaslatok, ...(await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok)) };
}

proba('⭐⭐ AZ ELFOGADOTT MÓDOSÍTÁS A SZÖVEG-HIVATKOZÁST VISZI ÁT (D72)', async () => {
  const gazda = await ujEember();
  const uj = (await szovegDarabra([{ id: 'b1', tipus: 'szoveg', tartalom: 'ÚJ SZÖVEG' }])).hivatkozas;
  const g = await gazda.tesz('GondolatLetrehozas', { cim: 'C', szoveg: 'régi', meret: 10 }, KEZDET);
  const esemenyek = [g,
    await gazda.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 100 }, KEZDET),
    await gazda.tesz('ErtekJavaslat', { entitas: g.azonosito, ertekek: KUSZOBOK }, KEZDET)];
  const j = await gazda.tesz('Javaslat', { fajta: 'szerkesztesi', erintett: g.azonosito,
    muvelet: 'Modositas', valtozas: { szoveg: uj }, indoklas: null }, KEZDET + 1000);
  esemenyek.push(j, await gazda.tesz('Szavazat', { javaslat: j.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));
  const k = await kep(esemenyek);
  return azonosSzoveg(k.allapot.entitasok.get(g.azonosito).szoveg, uj) && k.alkalmazottak.length === 1;
});

proba('⛔⛔ A KÜLÖNVÁLÓ TÁMOGATÓK A JAVASOLT SZÖVEGET VISZIK — a blokk-tömb és a hivatkozás nem esik ki csendben', async () => {
  // ⭐ Az elvetett javaslat támogatói, akik külön ágat kértek, a MÓDOSÍTOTT változatot viszik.
  // ⛔ Eddig itt csak a sima szöveget vettük át: egy blokk-tömb (a szerkesztőből) csendben
  // kiesett, és a különváltak a RÉGI szöveget vitték volna. A D72 hivatkozása ugyanígy járt volna.
  const gazda = await ujEember();
  const uj = (await szovegDarabra([{ id: 'b1', tipus: 'szoveg', tartalom: 'A JAVASOLT' }])).hivatkozas;
  const g = await gazda.tesz('GondolatLetrehozas', { cim: 'C', szoveg: 'régi', meret: 10 }, KEZDET);
  const esemenyek = [g,
    await gazda.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 60 }, KEZDET),
    await gazda.tesz('ErtekJavaslat', { entitas: g.azonosito, ertekek: KUSZOBOK }, KEZDET)];
  const ellenzok = [await ujEember(), await ujEember(), await ujEember()];
  for (const x of ellenzok) {
    esemenyek.push(await x.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10 }, KEZDET));
  }
  const j = await gazda.tesz('Javaslat', { fajta: 'szerkesztesi',
    erintettek: [{ entitas: g.azonosito, muvelet: 'Modositas', valtozas: { szoveg: uj } }] }, KEZDET + 1000);
  esemenyek.push(j, await gazda.tesz('Szavazat',
    { javaslat: j.azonosito, szavazat: 'Tamogat', kulonvalasIgeny: true }, KEZDET + 2000));
  for (const x of ellenzok) {
    esemenyek.push(await x.tesz('Szavazat',
      { javaslat: j.azonosito, szavazat: 'Ellenez', kulonvalasIgeny: false }, KEZDET + 2000));
  }
  const k = await kep(esemenyek);
  const ag = k.allapot.entitasok.get(k.kulonvalasok[0]?.kulonvaltAg);
  return k.kulonvalasok.length === 1 && ag !== undefined && azonosSzoveg(ag.szoveg, uj)
    && k.allapot.entitasok.get(g.azonosito).szoveg === 'régi';
});

// ===================================
// 4. A FÁJL-IGÉNY ÉS A KÉZI ÚT
// ===================================

proba('⭐ A FÁJL-IGÉNY: a szöveg-darab maga, a MEGLÉVŐ szöveg képei, és a javaslat új szövege', async () => {
  const { kornyezet, tar, darabTar } = await ujKornyezet();
  const kep = '/api/fajl/' + 'K'.repeat(43);
  const e = await gondolatLetrehozasa(kornyezet, { cim: 'Képes',
    szoveg: [{ id: 'b1', tipus: 'kep', url: kep }] });
  await tudatpontRendezese(kornyezet, e.azonosito, 50);
  await javaslatLetrehozasa(kornyezet, { erintett: e.azonosito, muvelet: 'Modositas',
    valtozas: { szoveg: 'javasolt új szöveg' } });
  const esemenyek = await tar.betolt();
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now());
  const javasolt = [...javaslatok.values()][0].erintettek[0].valtozas.szoveg;
  const semmiNincsMeg = async () => false;
  // Darab-olvasó nélkül: a képet még nem láthatjuk (a darab a „képes" szövegé).
  const elotte = await fajlIgenyek(allapot, semmiNincsMeg, { szerzo: kornyezet.szerzo, javaslatok });
  // A darab nálunk megvan (a művelet írta) — a képe innen látszik.
  const utana = await fajlIgenyek(allapot, semmiNincsMeg, { szerzo: kornyezet.szerzo, javaslatok,
    szovegOlvas: async (l) => { const b = await darabTar.olvas(l); return b ? szovegDarabbol(b) : null; } });
  const lenyomatai = (r) => new Set(r.hianyzok.map((h) => h.lenyomat));
  const e1 = lenyomatai(elotte), e2 = lenyomatai(utana);
  return szovegHivatkozasE(javasolt)
    && e1.has(e.adat.szoveg.lenyomat) && e1.has(javasolt.lenyomat) && !e1.has('K'.repeat(43))
    && e2.has('K'.repeat(43))
    && utana.hianyzok.find((h) => h.lenyomat === e.adat.szoveg.lenyomat)?.vallaltam === true;
});

proba('⭐ A KÉZI ÚT VISZI A SZÖVEG-DARABOT (4. szabály) — és a HAMIS darabot nem veszi be', async () => {
  const a = await ujKornyezet();
  const e = await gondolatLetrehozasa(a.kornyezet, { cim: 'Vinni', szoveg: 'átviendő szöveg' });
  await tudatpontRendezese(a.kornyezet, e.azonosito, 50);
  const ki = await kivitelSzovege(a.tar, KOINO, { darabOlvas: (l) => a.darabTar.olvas(l) });

  const bMappa = await mkdtemp(join(tmpdir(), 'koino-szovegdarab-c-'));
  const bTar = await esemenyTarNyitasa(KOINO, bMappa);
  const bDarab = fajlBlobTarolo(KOINO, bMappa);
  const be = await behozatalSzovegbol(bTar, KOINO, ki.szoveg, { darabIr: (b) => bDarab.ir(b) });
  const sz = await entitasSzovege(bTar, KOINO, e.azonosito, { darabOlvas: (l) => bDarab.olvas(l) });

  // ⛔ A hamis darab: a bájtok mások, mint amit a neve mond.
  const hamis = ki.szoveg.split('\n').map((sor) => {
    if (!sor.includes('"szovegDarab"')) return sor;
    const d = JSON.parse(sor);
    return JSON.stringify({ ...d, bajtok: Buffer.from('"hamisított szöveg"').toString('base64url') });
  }).join('\n');
  const cMappa = await mkdtemp(join(tmpdir(), 'koino-szovegdarab-d-'));
  const cDarab = fajlBlobTarolo(KOINO, cMappa);
  const beHamis = await behozatalSzovegbol(await esemenyTarNyitasa(KOINO, cMappa), KOINO, hamis,
    { darabIr: (b) => cDarab.ir(b) });

  return ki.szovegDarabok === 1 && be.szovegDarabok === 1 && sz.szoveg === 'átviendő szöveg'
    && beHamis.szovegDarabok === 0 && beHamis.hibasDarabok.length === 1
    && !(await cDarab.van(e.adat.szoveg.lenyomat));
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/szovegDarabProba.js
if (process.argv[1] && process.argv[1].endsWith('szovegDarabProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
