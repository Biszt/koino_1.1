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
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
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
async function ujEsemeny(adat, tipus = 'TartalomLetrehozas') {
  const veg = await lancVege(tar, SZERZO);
  return esemenyLetrehozasa({ koino: KOINO, tipus, adat, ...veg }, kulcspar);
}

// ===== ALAPMŰKÖDÉS =====

proba('Az esemény elmentődik és visszaolvasható', async () => {
  const e = await ujEsemeny({ cim: 'Első tartalom', meret: 128 });
  const eredmeny = await esemenyMentese(tar, e);
  const vissza = await esemenyLekerese(tar, e.azonosito);
  return eredmeny.mentve === true && vissza?.azonosito === e.azonosito;
});

proba('Az ISMÉTELT mentés nem hiba (ugyanaz a tartalom = ugyanaz a név)', async () => {
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
    { koino: KOINO, tipus: 'TartalomLetrehozas', adat: { cim: 'Neked ezt', meret: 10 }, ...veg }, kulcspar);
  const masik = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'TartalomLetrehozas', adat: { cim: 'Neki azt', meret: 10 }, ...veg }, kulcspar);

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
    { koino: 'proba', tipus: 'TartalomLetrehozas', adat: { cim: 'Ép', meret: 4 },
      elozo: null, sorszam: 1 }, kulcspar);
  await esemenyMentese(serultTar, e);

  // Kézzel odaírunk egy értelmetlen sort — mintha megszakadt volna egy írás
  const { appendFile } = await import('node:fs/promises');
  await appendFile(serultTar.fajl, '{ ez nem JSON\n', 'utf8');

  const esemenyek = await serultTar.betolt();
  await rm(kulon, { recursive: true, force: true });
  return esemenyek.length === 1 && esemenyek[0].azonosito === e.azonosito;
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
