// koino/meres/terProba.js — A BELÉPŐ TÉR önpróbája (Szakasz 5.6)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a tér **a koinók FÖLÖTT** lát — és hogy közben egyik szabályt sem lépi át:
//
//   · ⛔ **nem lehet létszám szerint rendezni** (D18/2: a hamisítható toplista alakja),
//   · ⭐ **a létszám SÚLYA látszik**: három szám, nem egy (tag · nem ellenőrizhető · belépő),
//   · ⚠️ **a hiány megnevezve jelenik meg**, nem kitalálva (D19) — ha nem ismerem a koino
//     születését, a kártya ezt MONDJA, nem pedig nevet talál ki,
//   · ⛔ **a hatókör kimondva**: csak amit ez a készülék ismer.

import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa, ismertKoinok } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import { terKartyai, koinoKartyaja, RENDEZESEK } from '../js/allapot/ter.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A BELÉPŐ TÉR (Szakasz 5.6)');

// ===================================
// SEGÉDEK
// ===================================

/** Egy eldobható „készülék": egy adat-mappa, több koinóval. */
async function ujKeszulek() {
  return mkdtemp(join(tmpdir(), 'koino-ter-'));
}

/**
 * Egy koino létrehozása a készüléken: alapító + `KoinoLetrehozas`.
 * @returns {Promise<Object>} { tar, alapito, horgony }
 */
async function koinotAlapit(hely, koino, nev, ido) {
  const tar = await esemenyTarNyitasa(koino, hely);
  const alapito = await ujEember(koino);
  const e = await alapito.tesz('KoinoLetrehozas', { nev, leiras: null, alapitok: [] }, ido);
  await esemenyMentese(tar, e);
  return { tar, alapito, horgony: e.azonosito };
}

/** Egy belépő — ez még NEM tagság (nincs meghívása). */
async function belep(tar, koino) {
  const eember = await ujEember(koino);
  const e = await eember.tesz('Belepes', {});
  await esemenyMentese(tar, e);
  return { eember, horgony: e.azonosito };
}

/** Meghívás: a meghívott szeletébe kerül, és hozza a meghívó horgonyát. */
async function meghiv(tar, meghivo, meghivott, sajatBelepes) {
  const e = await meghivo.eember.tesz(
    'Meghivas',
    { kit: meghivott.eember.szerzo, sajatBelepes: sajatBelepes ?? meghivo.horgony },
    undefined,
    { entitas: meghivott.horgony }
  );
  await esemenyMentese(tar, e);
  return e;
}

// ===================================
// 1. MIT LÁT A TÉR?
// ===================================

proba('⭐ A tér felsorolja a készüléken lévő koinókat — és CSAK azokat', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'falu', 'Faluközösség');
  await koinotAlapit(hely, 'kert', 'Közösségi kert');

  const { kartyak, koinok } = await terKartyai(hely);
  const nevek = kartyak.map((k) => k.nev).sort();
  return koinok === 2 && nevek[0] === 'Faluközösség' && nevek[1] === 'Közösségi kert';
});

proba('⛔ Egy mappa esemény-fájl NÉLKÜL nem koino — nem jelenik meg üres kártyaként', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'falu', 'Faluközösség');

  // Egy odatévedt mappa (pl. egy mentés vagy egy szerkesztő ideiglenes mappája).
  await mkdir(join(hely, 'valami-mas'), { recursive: true });
  await writeFile(join(hely, 'valami-mas', 'jegyzet.txt'), 'nem esemény', 'utf8');

  const koinok = await ismertKoinok(hely);
  return koinok.length === 1 && koinok[0] === 'falu';
});

proba('⛔ Üres adat-mappa: üres tér, nem hiba', async () => {
  const hely = await ujKeszulek();
  const { kartyak, koinok } = await terKartyai(hely);
  return koinok === 0 && kartyak.length === 0;
});

proba('⛔⛔ A tér KIMONDJA a határát — nem ígér teljességet (D19)', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'falu', 'Faluközösség');

  // ⚠️ A kereső-réteg nélkül ez nem a világ összes koinója. Ha a mező eltűnne, a felület
  // némán teljességet ígérne — ezért méri próba, nem csak komment.
  const { csakAmitIsmerunk } = await terKartyai(hely);
  return csakAmitIsmerunk === true;
});

// ===================================
// 2. ⚠️ A HIÁNY MEGNEVEZVE (D19)
// ===================================

proba('⚠️ Ha nem ismerem a koino SZÜLETÉSÉT, a kártya ezt MONDJA — nem talál ki nevet', async () => {
  const hely = await ujKeszulek();

  // Egy koino, aminek csak egy gondolatát ismerem (pl. fájlból hozott szelet) — a
  // `KoinoLetrehozas` nincs meg.
  const tar = await esemenyTarNyitasa('idegen', hely);
  const valaki = await ujEember('idegen');
  await esemenyMentese(tar, await valaki.tesz('GondolatLetrehozas',
    { cim: 'Egy gondolat', meret: 10, szulo: null }));

  const { kartyak } = await terKartyai(hely);
  const k = kartyak[0];
  return k.nev === null && k.ismeremASzuleteset === false
    && k.letrehozva === null && k.alapito === null && k.esemenyek === 1;
});

proba('⭐ És a „nem vagyok tag" INDOKOLT — nem csak egy üres nem (D19)', async () => {
  const hely = await ujKeszulek();
  const { alapito } = await koinotAlapit(hely, 'falu', 'Faluközösség');
  const kivulallo = await ujEember('falu');

  const { kartyak } = await terKartyai(hely, { szerzo: kivulallo.szerzo });
  const k = kartyak[0];
  return k.enTagVagyok === false && typeof k.miert === 'string' && k.miert.length > 0
    // …az alapító viszont igen:
    && (await koinoKartyaja(hely, 'falu', { szerzo: alapito.szerzo })).enTagVagyok === true;
});

// ===================================
// 3. ⭐⭐ A HÁROM SZÁM — a létszám súlya
// ===================================

proba('⭐⭐ A BELÉPŐ NEM TAG: a két szám ELTÉR, és ez a különbség a szám súlya', async () => {
  const hely = await ujKeszulek();
  const { tar } = await koinotAlapit(hely, 'falu', 'Faluközösség');

  // Hárman belépnek — de senki nem hívta be őket.
  await belep(tar, 'falu');
  await belep(tar, 'falu');
  await belep(tar, 'falu');

  const k = await koinoKartyaja(hely, 'falu');
  // ⭐ Négy horgony (az alapító + három belépő), de csak az alapító tag.
  return k.belepok === 4 && k.tagok === 1 && k.nemEllenorizhetok === 0;
});

proba('⭐ A behívott belépő TAG lesz — a szám ettől nő', async () => {
  const hely = await ujKeszulek();
  const { tar, alapito, horgony } = await koinotAlapit(hely, 'falu', 'Faluközösség');

  const uj = await belep(tar, 'falu');
  await meghiv(tar, { eember: alapito, horgony }, uj);

  const k = await koinoKartyaja(hely, 'falu');
  return k.belepok === 2 && k.tagok === 2 && k.nemEllenorizhetok === 0;
});

proba('⚠️ A HIÁNYZÓ LÁNC nem „nem tag", hanem NEM ELLENŐRIZHETŐ — külön szám (D19)', async () => {
  const hely = await ujKeszulek();
  const { tar } = await koinotAlapit(hely, 'falu', 'Faluközösség');

  // ⚠️ A meghívó horgonya olyan eseményre mutat, ami NINCS MEG nekünk — a normális eset
  // egy P2P hálózaton: a lánc egy darabja még nem ért ide.
  const ismeretlen = await ujEember('falu');
  const nemMentett = await ismeretlen.tesz('Belepes', {});     // szándékosan NEM mentjük

  const uj = await belep(tar, 'falu');
  await meghiv(tar, { eember: ismeretlen, horgony: nemMentett.azonosito }, uj,
    nemMentett.azonosito);

  const k = await koinoKartyaja(hely, 'falu');
  // ⛔ A lényeg: NEM vádoljuk meg — külön számban jelenik meg.
  return k.belepok === 2 && k.tagok === 1 && k.nemEllenorizhetok === 1;
});

// ===================================
// 4. A SORREND
// ===================================

proba('⭐ Az alap a LÉTREHOZÁS IDEJE, ÚJ ELÖL', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'regi', 'A régi', 1000);
  await koinotAlapit(hely, 'uj', 'Az új', 9000);

  const { kartyak, rendezes, irany } = await terKartyai(hely);
  return rendezes === 'letrehozva' && irany === 'csokkeno'
    && kartyak[0].nev === 'Az új' && kartyak[1].nev === 'A régi';
});

proba('⭐ …és megfordítható: RÉGI elöl', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'regi', 'A régi', 1000);
  await koinotAlapit(hely, 'uj', 'Az új', 9000);

  const { kartyak } = await terKartyai(hely, { irany: 'novekvo' });
  return kartyak[0].nev === 'A régi' && kartyak[1].nev === 'Az új';
});

proba('⛔⛔ A HIÁNYZÓ létrehozási idejű koino MINDKÉT irányban HÁTRA kerül', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'regi', 'A régi', 1000);
  await koinotAlapit(hely, 'uj', 'Az új', 9000);

  // Egy koino, aminek nem ismerem a születését → nincs létrehozási ideje.
  const tar = await esemenyTarNyitasa('nevtelen', hely);
  const valaki = await ujEember('nevtelen');
  await esemenyMentese(tar, await valaki.tesz('GondolatLetrehozas',
    { cim: 'Gondolat', meret: 10, szulo: null }));

  // ⚠️ Enélkül megfordításkor épp a LEGKEVÉSBÉ ismert koino ugrana a lista élére.
  const le = await terKartyai(hely, { irany: 'csokkeno' });
  const fel = await terKartyai(hely, { irany: 'novekvo' });
  return le.kartyak[2].azonosito === 'nevtelen' && fel.kartyak[2].azonosito === 'nevtelen';
});

proba('⛔⛔ LÉTSZÁM SZERINT NEM LEHET RENDEZNI — ez a D18/2 elvetett alakja', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'falu', 'Faluközösség');

  // ⭐ A tiltás nem komment, hanem a lista: ha valaki felvenné, ez a próba engedné át.
  if (RENDEZESEK.includes('eemberek') || RENDEZESEK.includes('tagok')
      || RENDEZESEK.includes('belepok')) return false;

  try {
    await terKartyai(hely, { rendezes: 'tagok' });
    return false;                                   // nem lett volna szabad idáig jutnia
  } catch (hiba) {
    return /Ismeretlen rendezés/.test(hiba.message);
  }
});

proba('⭐ Név szerint is rendezhető', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'b', 'Zebra', 1000);
  await koinotAlapit(hely, 'a', 'Alma', 9000);

  const { kartyak } = await terKartyai(hely, { rendezes: 'nev', irany: 'novekvo' });
  return kartyak[0].nev === 'Alma' && kartyak[1].nev === 'Zebra';
});

// ===================================
// 5. ⭐ AZ „ELŐSZÖR LÁTTAM" — helyi feljegyzés (3. szabály)
// ===================================

proba('⭐ Az „először láttam" az ELSŐ lekéréskor jegyződik fel, és utána NEM változik', async () => {
  const hely = await ujKeszulek();
  await koinotAlapit(hely, 'falu', 'Faluközösség');

  const elso = await terKartyai(hely, { most: 111111 });
  const masodik = await terKartyai(hely, { most: 999999 });

  // ⚠️ Ha a második lekérés felülírná, az „először" szó hazudna — és a szerinte rendezett
  // lista minden frissítésnél átrendeződne.
  return elso.kartyak[0].eloszorLattam === 111111
    && masodik.kartyak[0].eloszorLattam === 111111;
});

proba('⭐ …és HELYI FELJEGYZÉS: a saját fájljában él, nem eseményként (3. szabály)', async () => {
  const hely = await ujKeszulek();
  const { tar } = await koinotAlapit(hely, 'falu', 'Faluközösség');
  await terKartyai(hely, { most: 222222 });

  // ⛔ SEHOL nem lett belőle esemény — különben terjedne, és két készüléken mást jelentene.
  const nyers = await readFile(join(hely, 'falu', 'esemenyek.jsonl'), 'utf8');
  const jegyzet = JSON.parse(await readFile(join(hely, 'ter.json'), 'utf8'));
  return jegyzet.falu === 222222 && !nyers.includes('222222');
});

proba('⭐ Az „először láttam" szerint is rendezhető (a hamisíthatatlan, de gépfüggő sorrend)',
  async () => {
    const hely = await ujKeszulek();
    // ⚠️ A létrehozási idő szerint a „regi" a régebbi — de ha ELŐBB látom meg az újat,
    // az „először láttam" MÁS sorrendet ad. Pont ez a két mérce közti különbség.
    await koinotAlapit(hely, 'regi', 'A régi', 1000);
    await terKartyai(hely, { most: 5000 });              // a régit most látom először
    await koinotAlapit(hely, 'uj', 'Az új', 9000);
    await terKartyai(hely, { most: 6000 });              // az újat később

    const { kartyak } = await terKartyai(hely, { rendezes: 'eloszorLattam', irany: 'novekvo' });
    return kartyak[0].azonosito === 'regi' && kartyak[1].azonosito === 'uj';
  });

export default futtatas;

// Önállóan is futtatható: node koino/meres/terProba.js
if (process.argv[1] && process.argv[1].endsWith('terProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
