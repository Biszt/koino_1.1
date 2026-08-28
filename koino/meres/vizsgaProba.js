// koino/meres/vizsgaProba.js — A SZAKASZ 2 VIZSGÁJA (2. lépés)
//
// Egyetlen kérdést tesz fel, sokféleképpen:
//
//   ⭐ HA KÉT KÉSZÜLÉK KICSERÉLI, AMIT TUD, UGYANAZT A KOINÓT LÁTJA-E?
//
// Nem „ugyanannyi eseményt" — UGYANAZT AZ ÁLLAPOTOT: ugyanazokat az entitásokat,
// ugyanazokkal a tudatpontokkal és küszöbökkel, ugyanazt a javaslat-eredményt, ugyanazt
// az egyezményt, és ugyanazokat a jelzéseket. Ez a D17 ígérete, futtatható alakban.
//
// A mérőeszköz: az ÁLLAPOT UJJLENYOMATA (js/allapot/osszehasonlitas.js) — egyetlen 43
// karakteres szöveg, ami mindent lefed, ami döntés.
//
// ⚠️ EGY VIZSGA, AMI MINDIG ÁTMEGY, NEM VIZSGA. Ezért az első próbák egyike épp azt
// bizonyítja, hogy az összehasonlítás TUD nemet mondani: csere ELŐTT a két készülék
// ujjlenyomatának KÜLÖNBÖZNIE kell.

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import {
  allapotUjjlenyomata, allapotOsszefoglaloja, elteresek
} from '../js/allapot/osszehasonlitas.js';
import { figyeloIndulasa, csereVonalon } from '../js/csere/vonal.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A Szakasz 2 VIZSGÁJA');

const KOINO = 'proba';
const NAP = 86400 * 1000;
const KEZDET = Date.UTC(2026, 0, 1);
const KESOBB = KEZDET + 30 * NAP;     // ekkorra minden döntés lezárult

const mappak = [];

// ===================================
// SEGÉDEK
// ===================================

async function ujTar() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-vizsga-'));
  mappak.push(mappa);
  return esemenyTarNyitasa(KOINO, mappa);
}

async function ment(tar, esemenyek) {
  for (const e of esemenyek) await esemenyMentese(tar, e);
}

/** A tár állapota és javaslatai — MINDIG ugyanarra az időpontra. */
async function kep(tar, most = KESOBB) {
  const allapot = allapotSzamitasa(await koinoEsemenyei(tar, KOINO));
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);
  return { allapot, javaslatok };
}

/** Egy tár állapotának ujjlenyomata. */
async function ujjlenyomat(tar, most) {
  const { allapot, javaslatok } = await kep(tar, most);
  return allapotUjjlenyomata(allapot, javaslatok);
}

/** Két tár cseréje valódi TCP-n. */
async function csereDroton(egyikTar, masikTar) {
  const figyelo = await figyeloIndulasa(masikTar, KOINO, 0, { hoszt: '127.0.0.1' });
  try {
    return await csereVonalon(egyikTar, KOINO, '127.0.0.1', figyelo.port);
  } finally {
    await figyelo.bezar();
  }
}

// ===================================
// A TELJES ESET — egy koino teljes köre
// ===================================
//
// Minden esemény-fajta szerepel benne, amit a Szakasz 1 ismer: koino, tartalom,
// tudatpont-rendezés, érték javaslat, javaslat, szavazat. Ha a vizsga ezen átmegy, akkor
// nem egy leegyszerűsített esetre megy át.

async function teljesEset() {
  const anna = await ujEember(KOINO);
  const bela = await ujEember(KOINO);
  const cili = await ujEember(KOINO);
  const esemenyek = [];

  esemenyek.push(await anna.tesz('KoinoLetrehozas',
    { nev: 'Vizsga koino', leiras: 'a Szakasz 2 vizsgájához' }, KEZDET));

  // ----- KÉT TARTALOM, KÉT SZERZŐTŐL -----
  const elso = await anna.tesz('TartalomLetrehozas',
    { cim: 'Anna tartalma', szoveg: 'az A gépen', meret: 120 }, KEZDET);
  esemenyek.push(elso);
  esemenyek.push(await anna.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 300, szerep: 'aktiv' }, KEZDET));

  const masodik = await bela.tesz('TartalomLetrehozas',
    { cim: 'Béla tartalma', szoveg: 'a B gépen', meret: 80 }, KEZDET);
  esemenyek.push(masodik);
  esemenyek.push(await bela.tesz('TudatpontRendezes',
    { entitas: masodik.azonosito, pont: 200, szerep: 'aktiv' }, KEZDET));

  // ----- MINDKETTEN AZ ELSŐ TARTALOMRA IS TESZNEK PONTOT -----
  esemenyek.push(await bela.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 50, szerep: 'aktiv' }, KEZDET));
  esemenyek.push(await cili.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 70, szerep: 'aktiv' }, KEZDET));

  // ----- KÜSZÖBÖK (érték javaslat) -----
  esemenyek.push(await anna.tesz('ErtekJavaslat', {
    entitas: elso.azonosito,
    // ⚠️ A küszöbök SZÁZALÉKBAN vannak (lásd ALAP_KUSZOBOK), az arányok viszont
    // ezrelékben jönnek vissza — a kettő könnyen összekeverhető.
    ertekek: {
      elfogadasiKuszob: 60, reszveteliKuszob: 50,
      minimumDontesiIdo: 3600, maximumDontesiIdo: 7 * 86400
    }
  }, KEZDET));

  // ----- JAVASLAT ÉS SZAVAZATOK -----
  const javaslat = await anna.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: elso.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Anna javított tartalma' }, indoklas: 'Pontosabb így.'
  }, KEZDET + 1000);
  esemenyek.push(javaslat);

  esemenyek.push(await anna.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));
  esemenyek.push(await bela.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000));
  esemenyek.push(await cili.tesz('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Ellenez' }, KEZDET + 2000));

  return { esemenyek, anna, bela, cili, elso, masodik, javaslat };
}

/**
 * Kétfelé osztja az eseményeket — VÁLTAKOZVA, hogy mindkét lánc lyukas legyen.
 * Ez a legrosszabb eset: nem „az egyik lemaradt", hanem mindkettő hiányosan tud.
 */
function ketfele(esemenyek) {
  const egyike = esemenyek.filter((_, i) => i % 2 === 0);
  const masike = esemenyek.filter((_, i) => i % 2 === 1);
  return { egyike, masike };
}

// ===================================
// 1. A SORREND — hálózat nélkül
// ===================================

proba('⭐ UGYANAZ A HALMAZ, MÁS SORREND → ugyanaz az ujjlenyomat', async () => {
  const { esemenyek } = await teljesEset();

  const egyenes = await ujTar(); await ment(egyenes, esemenyek);
  const fordított = await ujTar(); await ment(fordított, [...esemenyek].reverse());

  return await ujjlenyomat(egyenes) === await ujjlenyomat(fordított);
});

proba('⭐ A LISTÁK SORRENDJE is azonos (nem csak az értékek)', async () => {
  // Ez az, ami a kézi próbán elromlott: a két gép ugyanazokat az entitásokat számolta,
  // de más sorrendben sorolta fel őket. Az ujjlenyomat ezt is fedi — de nézzük meg
  // közvetlenül is, hogy a próba ne csak közvetve mérje.
  const { esemenyek } = await teljesEset();

  const egyenes = await ujTar(); await ment(egyenes, esemenyek);
  const fordított = await ujTar(); await ment(fordított, [...esemenyek].reverse());

  const a = (await kep(egyenes)).allapot;
  const b = (await kep(fordított)).allapot;
  const sorrend = (allapot) => [...allapot.entitasok.keys()].join(',');

  return sorrend(a) === sorrend(b) && a.entitasok.size === 2;
});

// ===================================
// 2. AZ ÖSSZEHASONLÍTÁS TUD NEMET MONDANI
// ===================================

proba('⭐ A VIZSGA NEM VAK: csere ELŐTT a két készülék MÁST számol', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  return await ujjlenyomat(egyik) !== await ujjlenyomat(masik);
});

proba('Az eltérés MEGNEVEZHETŐ: melyik szakaszban van', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  const a = allapotOsszefoglaloja(...Object.values(await kep(egyik)));
  const b = allapotOsszefoglaloja(...Object.values(await kep(masik)));
  const hol = elteresek(a, b);

  // Nem elég, hogy „eltér" — meg is kell tudni mondani, hol
  return hol.length > 0 && hol.includes('entitasok');
});

// ===================================
// 3. A VIZSGA
// ===================================

proba('⭐⭐ A VIZSGA: kevert események, csere, AZONOS ÁLLAPOT', async () => {
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);

  await csereDroton(egyik, masik);

  return await ujjlenyomat(egyik) === await ujjlenyomat(masik);
});

proba('⭐ …és ez UGYANAZ, mintha egyik gép mindent tudott volna', async () => {
  // Fontosabb, mint amilyennek látszik: két hiányos gép megegyezhetne egy KÖZÖS TÉVEDÉSBEN
  // is. Ezért nem elég, hogy egyeznek — azzal kell egyezniük, ami az IGAZSÁG.
  const { esemenyek } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  const mindentTudo = await ujTar(); await ment(mindentTudo, esemenyek);

  await csereDroton(egyik, masik);

  const igazsag = await ujjlenyomat(mindentTudo);
  return await ujjlenyomat(egyik) === igazsag && await ujjlenyomat(masik) === igazsag;
});

proba('⭐ AZ EGYEZMÉNY mindkét gépen megszületik — ugyanazzal a pillanatképpel', async () => {
  // „Az egyezmény nem esemény, hanem SZÁMÍTÁS eredménye" (D17) — senki nem mondja ki.
  // Ez a próba azt méri, hogy két gép ugyanazt SZÁMOLJA ki, nem azt, hogy megegyeztek.
  const { esemenyek, javaslat } = await teljesEset();
  const { egyike, masike } = ketfele(esemenyek);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).javaslatok.get(javaslat.azonosito);
  const b = (await kep(masik)).javaslatok.get(javaslat.azonosito);

  return !!a?.egyezmeny && !!b?.egyezmeny
      && a.statusz === b.statusz
      && a.egyezmeny.megszuletett === b.egyezmeny.megszuletett
      && a.egyezmeny.pillanatkep.tamogatottsagEzrelek === b.egyezmeny.pillanatkep.tamogatottsagEzrelek;
});

// ===================================
// 4. A NEHÉZ ESETEK
// ===================================

proba('⭐ KETTŐS SZAVAZAT KÉT KÉSZÜLÉKEN: a csere után mindkettő ugyanazt veszi', async () => {
  // A hétköznapi eset: valakinek két készüléke van, mindkettőn szavaz, mielőtt összeérnének.
  // A saját lánca kettéágazik. A koino nem büntet — determinisztikusan választ, és JELEZ.
  const { esemenyek, javaslat, cili } = await teljesEset();

  // Cili ugyanarról a pontról egy MÁSIK szavazatot is aláír (a másik készülékén)
  const masikSzavazat = await cili.elagaztat('Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat' }, KEZDET + 2000);

  const egyik = await ujTar(); await ment(egyik, esemenyek);
  const masik = await ujTar(); await ment(masik, [...esemenyek.slice(0, -1), masikSzavazat]);

  // Csere ELŐTT: az egyik az egyik szavazatot ismeri, a másik a másikat
  const elotte = await ujjlenyomat(egyik) !== await ujjlenyomat(masik);

  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).allapot;
  const b = (await kep(masik)).allapot;

  return elotte
      && await ujjlenyomat(egyik) === await ujjlenyomat(masik)
      && a.ellentmondasok.length === 1 && b.ellentmondasok.length === 1;
});

proba('⭐ A SZABÁLYSÉRTŐ esemény mindkét gépen UGYANÚGY esik ki', async () => {
  // A keretet túllépő tudatpont: nem törlődik, de nem is számít — és a KIVÉTELEK
  // listájában mindkét gépen ugyanúgy jelenik meg.
  const { esemenyek, cili, elso } = await teljesEset();
  const tullepo = await cili.tesz('TudatpontRendezes',
    { entitas: elso.azonosito, pont: 999999, szerep: 'aktiv' }, KEZDET + 3000);

  const mind = [...esemenyek, tullepo];
  const { egyike, masike } = ketfele(mind);

  const egyik = await ujTar(); await ment(egyik, egyike);
  const masik = await ujTar(); await ment(masik, masike);
  await csereDroton(egyik, masik);

  const a = (await kep(egyik)).allapot;
  const b = (await kep(masik)).allapot;

  return await ujjlenyomat(egyik) === await ujjlenyomat(masik)
      && a.kivetelek.length === 1
      && a.kivetelek[0].azonosito === tullepo.azonosito
      && b.kivetelek[0].azonosito === tullepo.azonosito;
});

proba('⭐ HÁROM KÉSZÜLÉK: a harmadik is ugyanoda jut, láncolt cserével', async () => {
  // A ↔ B, majd B ↔ C — a harmadik gép sosem beszélt A-val, mégis mindent megtud.
  // Ez a P2P lényege: nincs kitüntetett gép, amin minden átmegy.
  const { esemenyek } = await teljesEset();
  const harmad = Math.ceil(esemenyek.length / 3);

  const a = await ujTar(); await ment(a, esemenyek.slice(0, harmad));
  const b = await ujTar(); await ment(b, esemenyek.slice(harmad, 2 * harmad));
  const c = await ujTar(); await ment(c, esemenyek.slice(2 * harmad));

  await csereDroton(a, b);
  await csereDroton(b, c);
  await csereDroton(a, b);   // A-nak vissza kell kapnia, amit B C-től kapott

  const egy = await ujjlenyomat(a);
  return egy === await ujjlenyomat(b) && egy === await ujjlenyomat(c);
});

export async function takaritas() {
  for (const mappa of mappak) await rm(mappa, { recursive: true, force: true });
}

export default async function (csendes) {
  const eredmeny = await futtatas(csendes);
  await takaritas();
  return eredmeny;
}
