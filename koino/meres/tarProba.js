// koino/meres/tarProba.js — a tár-réteg önpróbája (Szakasz 1 / 4. lépés)
//
// Azt bizonyítja, hogy az események megmaradnak, hogy ellenőrizetlen esemény nem kerül a
// tárba, és hogy a kettős cselekvés már mentéskor lelepleződik.
//
// ⚠️ A D29 (a koino önálló program) után a tár FÁJL, nem IndexedDB. A próbák ezért egy
// külön, eldobható mappában dolgoznak — soha nem a valódi adaton.

import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { esemenyTarNyitasa, udpCimTarolo, kotesTarolo, tarsakTarolo } from '../js/tar/fajlTar.js';
import {
  esemenyMentese, esemenyLekerese, lancVege, lancEllenorzese,
  sajatLancEsemenyei, koinoEsemenyei
} from '../js/tar/esemenyTar.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A tár-réteg próbája');

// ----- Eldobható mappa a próbákhoz -----
const MAPPA = await mkdtemp(join(tmpdir(), 'koino-proba-'));
const KOINO = 'proba';
const tar = await esemenyTarNyitasa(KOINO, MAPPA);

const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const nyersKulcs = await crypto.subtle.exportKey('raw', kulcspar.publicKey);
let s = ''; for (const b of new Uint8Array(nyersKulcs)) s += String.fromCharCode(b);
const SZERZO = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Segéd: a lánc végére fűz egy eseményt (mentés nélkül). */
async function ujEsemeny(adat, tipus = 'GondolatLetrehozas') {
  const veg = await lancVege(tar, SZERZO);
  return esemenyLetrehozasa({ koino: KOINO, tipus, adat, ...veg }, kulcspar);
}

// ===== ALAPMŰKÖDÉS =====

proba('Az esemény elmentődik és visszaolvasható', async () => {
  const e = await ujEsemeny({ cim: 'Első gondolat', meret: 128 });
  const eredmeny = await esemenyMentese(tar, e);
  const vissza = await esemenyLekerese(tar, e.azonosito);
  return eredmeny.mentve === true && vissza?.azonosito === e.azonosito;
});

proba('Az ISMÉTELT mentés nem hiba (ugyanaz a gondolat = ugyanaz a név)', async () => {
  const elso = (await sajatLancEsemenyei(tar, SZERZO))[0];
  const eredmeny = await esemenyMentese(tar, elso);
  return eredmeny.mentve === true && eredmeny.marMegvolt === true;
});

// ===== A TÁR VÉDELME =====

proba('HAMISÍTOTT esemény NEM kerül a tárba', async () => {
  const e = await ujEsemeny({ cim: 'Tisztességes', meret: 64 });
  const hamis = { ...e, adat: { cim: 'Átírva', meret: 64 } };
  const eredmeny = await esemenyMentese(tar, hamis);
  const vissza = await esemenyLekerese(tar, hamis.azonosito);
  return eredmeny.mentve === false && vissza === undefined;
});

// ===== A SAJÁT LÁNC =====

proba('Üres láncnál a következő esemény az 1. (előzmény nélkül)', async () => {
  const idegen = await ujEember(KOINO);
  const veg = await lancVege(tar, idegen.szerzo);
  return veg.elozo === null && veg.sorszam === 1;
});

proba('A lánc épül: három esemény egymás után, hézag nélkül', async () => {
  await esemenyMentese(tar, await ujEsemeny({ cim: 'Második', meret: 200 }));
  await esemenyMentese(tar, await ujEsemeny({ cim: 'Harmadik', meret: 300 }));
  const lanc = await sajatLancEsemenyei(tar, SZERZO);
  const sorszamok = lanc.map((e) => e.sorszam);
  // 1,2,3… (a hamisított nem került be, ezért nem hagyott lyukat)
  return sorszamok.every((sz, i) => sz === i + 1) && lanc.length >= 3;
});

proba('Minden esemény az ELŐZŐRE mutat', async () => {
  const lanc = await sajatLancEsemenyei(tar, SZERZO);
  for (let i = 1; i < lanc.length; i++) {
    if (lanc[i].elozo !== lanc[i - 1].azonosito) return false;
  }
  return lanc[0].elozo === null;
});

proba('Az ép lánc ellenőrzése: ép', async () => {
  const e = await lancEllenorzese(tar, SZERZO);
  return e.ep === true && e.hezagok.length === 0 && e.elagazasok.length === 0;
});

// ===== A KETTŐS CSELEKVÉS LELEPLEZŐDÉSE =====

proba('ELÁGAZÁS: a mentés jelzi az ellentmondást', async () => {
  // Ugyanarra a pontra két különböző esemény — mintha valaki két különböző dolgot
  // mutatna két különböző embernek
  const veg = await lancVege(tar, SZERZO);
  const egyik = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'Neked ezt', meret: 10 }, ...veg }, kulcspar);
  const masik = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'Neki azt', meret: 10 }, ...veg }, kulcspar);

  await esemenyMentese(tar, egyik);
  const eredmeny = await esemenyMentese(tar, masik);

  // MINDKETTŐ elmentődik — együtt ők a bizonyíték
  return eredmeny.mentve === true && !!eredmeny.elagazas;
});

proba('A lánc-ellenőrzés is megtalálja az elágazást', async () => {
  const e = await lancEllenorzese(tar, SZERZO);
  return e.ep === false && e.elagazasok.length === 1;
});

// ===== ELKÜLÖNÍTÉS =====

proba('A koinók elkülönülnek egymástól', async () => {
  const enyeim = await koinoEsemenyei(tar, KOINO);
  const masike = await koinoEsemenyei(tar, 'nem-letezo-koino');
  return enyeim.length >= 3 && masike.length === 0;
});

// ===== MEGMARADÁS =====
//
// A böngészős korszakban ehhez kézzel újra kellett tölteni a lapot. Fájllal ez sokkal
// egyszerűbb és szigorúbb: ELDOBJUK az egész tár-objektumot, újranyitjuk ugyanazt a
// fájlt, és megnézzük, ott van-e minden.

proba('MEGMARADÁS: új tár-objektum ugyanabból a fájlból ugyanazt olvassa', async () => {
  const elotte = await koinoEsemenyei(tar, KOINO);
  const ujraNyitott = await esemenyTarNyitasa(KOINO, MAPPA);
  const utana = await koinoEsemenyei(ujraNyitott, KOINO);
  return elotte.length === utana.length
      && elotte.every((e, i) => e.azonosito === utana[i].azonosito);
});

proba('A tár HOZZÁFŰZŐ: a fájl sorai megegyeznek az eseményekkel', async () => {
  const szoveg = await readFile(tar.fajl, 'utf8');
  const sorok = szoveg.split('\n').filter((sor) => sor.trim());
  const esemenyek = await tar.betolt();
  return sorok.length === esemenyek.length;
});

proba('A SÉRÜLT sor nem teszi olvashatatlanná a tárat', async () => {
  const kulon = await mkdtemp(join(tmpdir(), 'koino-serult-'));
  const serultTar = await esemenyTarNyitasa('proba', kulon);
  const e = await esemenyLetrehozasa(
    { koino: 'proba', tipus: 'GondolatLetrehozas', adat: { cim: 'Ép', meret: 4 },
      elozo: null, sorszam: 1 }, kulcspar);
  await esemenyMentese(serultTar, e);

  // Kézzel odaírunk egy értelmetlen sort — mintha megszakadt volna egy írás
  const { appendFile } = await import('node:fs/promises');
  await appendFile(serultTar.fajl, '{ ez nem JSON\n', 'utf8');

  const esemenyek = await serultTar.betolt();
  await rm(kulon, { recursive: true, force: true });
  return esemenyek.length === 1 && esemenyek[0].azonosito === e.azonosito;
});

// ===================================
// ⛔⛔⛔ AZ ELVESZETT ÍRÁS (2026-09-21)
// ===================================
//
// ⛔ MIT MÉR, ÉS HONNAN JÖTT: egy parancssor-próba **szeszélyesen bukott** — a teljes
// suite-ban 8 futásból ~2-szer, önmagában 0/15-ször. A diagnosztika mutatta meg, hogy a
// készülék a résen MEGTANULTA a saját külső címét a társtól (ki is írta), ⛔ **de az nem
// került a lemezre**: a túlélő és az elveszett írás között **1 ms** telt el.
//
// ⭐ Az ok nem időzítés volt, hanem SZERKEZET: a „beolvas → módosít → kiír" a hívóban élt,
// védtelenül. *A szeszélyes próba igazat mondott — ez az a hiba, amit meg akart fogni.*
//
// ⚠️ Ez a próba NEM valószínűséget mér: a két írást SZÁNDÉKOSAN egyszerre indítjuk, tehát
// a régi kódon MINDIG bukik, az újon MINDIG átmegy.

proba('⛔⛔ KÉT EGYIDEJŰ ÍRÁS EGYIKE SEM VESZHET EL — a jegyzék sorba állít', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor-'));
  try {
    const tarolo = udpCimTarolo(hely);

    // ⚠️ A LÉNYEG: egyiket sem várjuk meg a másik előtt — pontosan úgy, ahogy a résen
    // történik (a tükör válasza és a társ `latlak`-ja ezredmásodperceken belül érkezik).
    await Promise.all([
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.1', port: 1111, mikor: 1000 }]),
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.2', port: 2222, mikor: 1001 }]),
      tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.3', port: 3333, mikor: 1002 }])
    ]);

    const vegul = await tarolo.olvas();
    return vegul.length === 3
      && vegul.some((c) => c.port === 1111)
      && vegul.some((c) => c.port === 2222)
      && vegul.some((c) => c.port === 3333);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ …és a KÖTÉS-jegyzék ugyanígy — ott két ág ír (a postaláda és a kör)', async () => {
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor2-'));
  try {
    const tarolo = kotesTarolo(hely);
    await Promise.all([
      tarolo.modosit((j) => [...j, { alairo: 'A'.repeat(43), utoljara: 1 }]),
      tarolo.modosit((j) => [...j, { alairo: 'B'.repeat(43), utoljara: 2 }])
    ]);
    const vegul = await tarolo.olvas();
    return vegul.length === 2;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔⛔ …és a TÁRS-LISTA is — ott a leghosszabb a rés: egy TELJES csere-kör', async () => {
  // ⛔ MIÉRT KELLETT KÉSŐBB (2026-09-22): a `modosit()` 2026-09-21-én megszületett, és a
  // társ-lista **kimaradt belőle** — ott egy külön ígéret-lánc állt a `koino.js`-ben,
  // ami viszont az őrjárat kör végi írását nem fogta meg. ⭐ *Egy problémára két
  // gépezet: az egyik előbb-utóbb kimarad valahonnan.*
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor4-'));
  try {
    const tarolo = tarsakTarolo(hely);
    await Promise.all([
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.1', port: 1 }]),
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.2', port: 2 }]),
      tarolo.modosit((l) => [...l, { hoszt: '198.51.100.3', port: 3 }])
    ]);
    const vegul = await tarolo.olvas();
    return vegul.length === 3 && vegul.every((t) => t.hoszt.startsWith('198.51.100.'));
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⚠️ EGY BUKÓ MÓDOSÍTÁS NEM AKASZTJA MEG A SORT — a következő lefut', async () => {
  // ⛔ Egy ígéret-lánc könnyen beragad: ha a bukás nem fogódik meg, a MÖGÖTTE álló munka
  // soha nem indul el. *A nem-esemény a legrosszabb hiba (25. mérés).*
  const hely = await mkdtemp(join(tmpdir(), 'koino-sor3-'));
  try {
    const tarolo = udpCimTarolo(hely);
    let bukott = false;
    await tarolo.modosit(() => { throw new Error('szándékos'); }).catch(() => { bukott = true; });
    await tarolo.modosit((lista) => [...lista, { hoszt: '198.51.100.9', port: 9999, mikor: 5 }]);
    const vegul = await tarolo.olvas();
    return bukott && vegul.length === 1 && vegul[0].port === 9999;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// A próbák után takarítunk: a mappa eldobható
export async function takaritas() {
  await rm(MAPPA, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
