// koino/meres/pakliProba.js — a KÉRDEZHETŐ PAKLI-LEKÉRDEZÉS önpróbája (Szakasz 5 / 5.2)

// Mit bizonyít ez a lap?
//
// ⛔⛔ A 9. SZABÁLYT. A pakli az utolsó pont, ahol a felület visszahozhatná a „add ide
// mindet" kérdést a programba. Itt azt mérjük, hogy **nem hozza vissza**: a darabszám
// felülről korlátos, a lapozás kulcs-alapú, és a válasz nem hordozza a szövegeket.
//
// ⭐⭐ ÉS A LEGFONTOSABBAT: hogy a lapozás **nem csúszik el**, ha közben változik a koino.
// A tudatpont bármikor átrendezhető — enélkül egy kártya kimaradna vagy kétszer jönne.

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import {
  pakliOldal, ujPakliNezet, entitasSzovege, entitasTudatpontja,
  entitasReszletei, entitasKuszobei, hianyzoFelmenok, MAX_DARAB, RENDEZESEK
} from '../js/allapot/pakli.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KÉRDEZHETŐ PAKLI (Szakasz 5 / 5.2)');

const KOINO = 'proba';

// ===================================
// SEGÉDEK
// ===================================

/** Eldobható tár egy e-emberrel. */
async function ujKoino() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-pakli-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const anna = await ujEember(KOINO);
  return { tar, anna };
}

/**
 * Egy gondolat + tudatpont. A pont nélkül nem is létezne (D14).
 * @returns {Promise<string>} az entitás azonosítója
 */
async function gondolat(tar, ki, cim, pont, szulo = null, ido) {
  const e = await ki.tesz('GondolatLetrehozas', { cim, meret: 10, szulo }, ido);
  await esemenyMentese(tar, e);
  const p = await ki.tesz('TudatpontRendezes', { entitas: e.azonosito, pont }, ido);
  await esemenyMentese(tar, p);
  return e.azonosito;
}

/**
 * Végiglapoz, és visszaadja MINDEN oldal kártyáit egymás után.
 *
 * ⚠️ A `frissNezet` NEM kényelmi kapcsoló: azt méri, hogy a **horgony** tartja-e a
 * lapozást, nem a gyorsítótár. Élesben minden oldal külön HTTP-kérés, és a nézet
 * bármikor kieshet — akkor a horgony az egyetlen, ami a képet együtt tartja.
 */
async function vegiglapoz(tar, beallitas, kozben, frissNezet = false) {
  const nezet = ujPakliNezet();
  const mind = [];
  let kurzor = null, oldalak = 0;

  do {
    const oldal = await pakliOldal(tar, KOINO,
      { ...beallitas, kurzor, nezet: frissNezet ? ujPakliNezet() : nezet });
    mind.push(...oldal.kartyak);
    kurzor = oldal.kovetkezoKurzor;
    oldalak++;
    // ⭐ A próba itt tud „belepiszkálni" a koinóba két oldal között.
    if (kozben && oldalak === 1) await kozben();
    if (oldalak > 50) throw new Error('a lapozás nem ér véget — végtelen ciklus?');
  } while (kurzor);

  return { mind, oldalak, nezet };
}

/** Van-e ismétlődés az azonosítók közt? */
const egyediE = (kartyak) => new Set(kartyak.map((k) => k.azonosito)).size === kartyak.length;

// ===================================
// 1. AZ OLDAL KORLÁTOS — a 9. szabály
// ===================================

proba('Egy oldal legfeljebb annyi kártyát ad, amennyit kértek', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 12; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  const oldal = await pakliOldal(tar, KOINO, { darab: 5 });
  return oldal.kartyak.length === 5 && oldal.osszes === 12 && oldal.kovetkezoKurzor !== null;
});

// ⚠️ EZ A PRÓBA EGYSZER MÁR VAK VOLT. Elsőre 12 entitáson kért egymilliót — és mivel 12 ≤
// 100, akkor is átment, amikor a korlátot KIVETTÜK. ⭐ A korlátot csak úgy lehet mérni, ha
// **több kártya van, mint amennyi a korlát**: itt 120 a 100-hoz.
proba('⛔⛔ A DARABSZÁM FELÜLRŐL KORLÁTOS — nem lehet „add ide mindet"', async () => {
  const { tar, anna } = await ujKoino();
  const mennyi = MAX_DARAB + 20;
  // Kis pontok, hogy a 10 000-es tudatpont-keretbe beleférjen mind (120 × ~70 = 8 340).
  for (let i = 0; i < mennyi; i++) await gondolat(tar, anna, 'Gondolat ' + i, 10 + i);

  // A hívó egymilliót kér. A koino legfeljebb MAX_DARAB-ot ad.
  const oldal = await pakliOldal(tar, KOINO, { darab: 1000000 });
  return oldal.osszes === mennyi
    && oldal.kartyak.length === MAX_DARAB
    && oldal.kovetkezoKurzor !== null;      // vagyis tényleg maradt még
});

proba('⛔ A SZÖVEG NINCS a kártyában — a lista nem hordoz gondolat-szövegeket', async () => {
  const { tar, anna } = await ujKoino();
  const e = await anna.tesz('GondolatLetrehozas',
    { cim: 'Van szövege', szoveg: 'HOSSZÚ SZÖVEG, AMI NEM UTAZHAT A LISTÁVAL', meret: 10 });
  await esemenyMentese(tar, e);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 100 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  const k = oldal.kartyak[0];
  return k.szoveg === undefined
    && k.vanSzoveg === true
    && !JSON.stringify(oldal).includes('HOSSZÚ SZÖVEG');
});

// ===================================
// 2. A LAPOZÁS TELJES ÉS PONTOS
// ===================================

proba('Végiglapozva MINDEN kártya előjön, pontosan egyszer', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 12; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  const { mind, oldalak } = await vegiglapoz(tar, { darab: 5 });
  return mind.length === 12 && egyediE(mind) && oldalak === 3;
});

proba('⭐ HOLTVERSENY: azonos pontszámnál sem ismétel és nem hagy ki', async () => {
  const { tar, anna } = await ujKoino();
  // MINDENKI ugyanannyi pontot kap — a rendezési érték nem különbözteti meg őket.
  for (let i = 0; i < 9; i++) await gondolat(tar, anna, 'Egyforma ' + i, 100);

  const { mind } = await vegiglapoz(tar, { darab: 2 });
  return mind.length === 9 && egyediE(mind);
});

proba('Az utolsó oldal után nincs kurzor', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 3; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  const oldal = await pakliOldal(tar, KOINO, { darab: 10 });
  return oldal.kartyak.length === 3 && oldal.kovetkezoKurzor === null;
});

// ===================================
// 3. ⭐⭐ A HORGONY — ez a lap legfontosabb próbája
// ===================================

proba('⭐⭐⭐ A LAPOZÁS NEM CSÚSZIK EL, ha közben ÁTRENDEZIK A TUDATPONTOT', async () => {
  const { tar, anna } = await ujKoino();
  const azonositok = [];
  for (let i = 0; i < 12; i++) {
    azonositok.push(await gondolat(tar, anna, 'Gondolat ' + i, 100 + i));
  }

  // Az első oldal UTÁN a leggyengébb kártya a legerősebbé válik: rendezés szerint
  // átugrana a lista elejére. Horgony nélkül vagy kimaradna, vagy kétszer jönne.
  const { mind } = await vegiglapoz(tar, { darab: 5, rendezes: 'sajatPont' }, async () => {
    await esemenyMentese(tar,
      await anna.tesz('TudatpontRendezes', { entitas: azonositok[0], pont: 5000 }));
  });

  return mind.length === 12 && egyediE(mind);
});

proba('⭐⭐ …és a közben SZÜLETETT kártya nem keveredik bele', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 12; i++) await gondolat(tar, anna, 'Régi ' + i, 100 + i);

  let ujAzonosito = null;
  const { mind } = await vegiglapoz(tar, { darab: 5 }, async () => {
    ujAzonosito = await gondolat(tar, anna, 'ÚJ, LAPOZÁS KÖZBEN', 9000);
  });

  return mind.length === 12
    && egyediE(mind)
    && !mind.some((k) => k.azonosito === ujAzonosito);
});

proba('⭐ …DE MEGMONDJA, hogy érkezett újdonság (nem hallgatja el)', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 6; i++) await gondolat(tar, anna, 'Régi ' + i, 100 + i);

  const nezet = ujPakliNezet();
  const elso = await pakliOldal(tar, KOINO, { darab: 3, nezet });
  await gondolat(tar, anna, 'Új', 500);
  const masodik = await pakliOldal(tar, KOINO, { darab: 3, kurzor: elso.kovetkezoKurzor, nezet });

  return elso.ujdonsag === false
    && masodik.ujdonsag === true
    && masodik.ujEsemenyek === 2;      // létrehozás + tudatpont
});

// ⚠️⚠️ ÉS A PRÓBA, AMI NÉLKÜL A HORGONY MÉRETLEN MARADNA.
//
// A fenti két próba GYORSÍTÓTÁRRAL fut: a lapozás végig ugyanazt a nézetet kapja, tehát a
// képet a gyorsítótár tartja együtt — a horgony „első N esemény" szeletelése meg sem
// szólal. ⛔ Kimérve: a horgony kikapcsolásával **egyetlen próba sem bukott**.
//
// ⭐ Élesben viszont minden oldal külön HTTP-kérés, és a nézet bármikor kieshet. Ez a próba
// FRISS NÉZETTEL lapoz — így a stabilitást csakis a horgony adhatja.
proba('⭐⭐⭐ A HORGONY MAGA tartja a lapozást — friss nézettel, gyorsítótár nélkül is',
  async () => {
    const { tar, anna } = await ujKoino();
    const azonositok = [];
    for (let i = 0; i < 12; i++) {
      azonositok.push(await gondolat(tar, anna, 'Gondolat ' + i, 100 + i));
    }

    const { mind } = await vegiglapoz(tar, { darab: 5, rendezes: 'sajatPont' }, async () => {
      // A leggyengébb a legerősebbé válik, ÉS születik egy új kártya is.
      await esemenyMentese(tar,
        await anna.tesz('TudatpontRendezes', { entitas: azonositok[0], pont: 5000 }));
      await gondolat(tar, anna, 'ÚJ, LAPOZÁS KÖZBEN', 7000);
    }, true);   // ← friss nézet minden oldalhoz

    return mind.length === 12
      && egyediE(mind)
      && !mind.some((k) => k.cim === 'ÚJ, LAPOZÁS KÖZBEN');
  });

proba('⭐ ÚJ lapozás (kurzor nélkül) MÁR LÁTJA az újat — a horgony nem ragad be', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 4; i++) await gondolat(tar, anna, 'Régi ' + i, 100 + i);
  await pakliOldal(tar, KOINO, { darab: 2 });

  await gondolat(tar, anna, 'Új', 500);
  const friss = await pakliOldal(tar, KOINO, { darab: 10 });

  return friss.osszes === 5 && friss.ujdonsag === false;
});

// ===================================
// 4. A NÉGY RENDEZÉS
// ===================================

proba('sajatPont, csökkenő: a legtöbb pontos elöl', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Kicsi', 100);
  await gondolat(tar, anna, 'Nagy', 900);
  await gondolat(tar, anna, 'Közepes', 500);

  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'sajatPont', irany: 'csokkeno' });
  return oldal.kartyak.map((k) => k.cim).join(',') === 'Nagy,Közepes,Kicsi';
});

proba('sajatPont, növekvő: fordítva', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Kicsi', 100);
  await gondolat(tar, anna, 'Nagy', 900);

  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'sajatPont', irany: 'novekvo' });
  return oldal.kartyak.map((k) => k.cim).join(',') === 'Kicsi,Nagy';
});

proba('ido: a létrehozás sorrendjében', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Első', 100, null, 1000);
  await gondolat(tar, anna, 'Második', 100, null, 2000);
  await gondolat(tar, anna, 'Harmadik', 100, null, 3000);

  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'ido', irany: 'novekvo' });
  return oldal.kartyak.map((k) => k.cim).join(',') === 'Első,Második,Harmadik';
});

proba('⭐ agazatiPont: a szülő megkapja a gyerekei pontjait is', async () => {
  const { tar, anna } = await ujKoino();
  const szulo = await gondolat(tar, anna, 'Szülő', 100);
  await gondolat(tar, anna, 'Gyerek A', 400, szulo);
  await gondolat(tar, anna, 'Gyerek B', 300, szulo);
  await gondolat(tar, anna, 'Magányos', 600);

  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'agazatiPont', irany: 'csokkeno' });
  const elso = oldal.kartyak[0];
  // A szülő 100 + 400 + 300 = 800, tehát megelőzi a 600-as magányost.
  return elso.cim === 'Szülő' && elso.agazatiPont === 800 && elso.osszesPont === 100;
});

proba('⭐ hierarchikus: a gyerek a SZÜLŐJE UTÁN jön', async () => {
  const { tar, anna } = await ujKoino();
  const szulo = await gondolat(tar, anna, 'Szülő', 100);
  await gondolat(tar, anna, 'Gyerek', 400, szulo);

  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'hierarchikus', irany: 'novekvo' });
  const cimek = oldal.kartyak.map((k) => k.cim);
  return cimek.indexOf('Szülő') < cimek.indexOf('Gyerek');
});

proba('Mind a négy rendezés végiglapozható, hiánytalanul', async () => {
  const { tar, anna } = await ujKoino();
  const szulo = await gondolat(tar, anna, 'Szülő', 100);
  for (let i = 0; i < 7; i++) await gondolat(tar, anna, 'Gy ' + i, 100 + i, szulo);

  for (const rendezes of RENDEZESEK) {
    const { mind } = await vegiglapoz(tar, { darab: 3, rendezes });
    if (mind.length !== 8 || !egyediE(mind)) return false;
  }
  return true;
});

// ===================================
// 5. ⛔ RONTÁS-PRÓBÁK
// ===================================

proba('⛔ ISMERETLEN RENDEZÉS: hiba, nem csendes alapértelmezés', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  try {
    await pakliOldal(tar, KOINO, { rendezes: 'legnepszerubb' });
    return false;
  } catch (hiba) {
    return hiba.message.includes('Ismeretlen rendezés');
  }
});

proba('⛔ ROMLOTT KURZOR: hiba, nem rossz eredmény', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  try {
    await pakliOldal(tar, KOINO, { kurzor: 'ez-nem-kurzor' });
    return false;
  } catch (hiba) {
    return hiba.message.includes('kurzor');
  }
});

proba('⛔ HIÁNYOS KURZOR (jó base64, rossz tartalom): szintén hiba', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  const hamis = Buffer.from(JSON.stringify({ h: 'nem szám' }), 'utf8').toString('base64url');
  try {
    await pakliOldal(tar, KOINO, { kurzor: hamis });
    return false;
  } catch (hiba) {
    return hiba.message.includes('kurzor');
  }
});

proba('⛔⛔ KÖR a szülő-láncban nem akasztja meg a lapozást', async () => {
  const { tar, anna } = await ujKoino();
  // Két gondolat, amik EGYMÁSRA mutatnak szülőként. Szabálytalan, de egy hibás vagy
  // rosszindulatú esemény előállíthatja — egy naiv bejárás végtelen ciklusba futna.
  const a = await anna.tesz('GondolatLetrehozas', { cim: 'A', meret: 10 });
  await esemenyMentese(tar, a);
  const b = await anna.tesz('GondolatLetrehozas', { cim: 'B', meret: 10, szulo: a.azonosito });
  await esemenyMentese(tar, b);
  const aUjra = await anna.tesz('GondolatLetrehozas',
    { cim: 'A2', meret: 10, szulo: b.azonosito });
  await esemenyMentese(tar, aUjra);
  for (const e of [a, b, aUjra]) {
    await esemenyMentese(tar,
      await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 100 }));
  }

  const { mind } = await vegiglapoz(tar, { darab: 2, rendezes: 'hierarchikus' });
  return mind.length === 3 && egyediE(mind);
});

proba('⭐ A 0 PONTOS entitás nincs a pakliban (D14)', async () => {
  const { tar, anna } = await ujKoino();
  const marad = await gondolat(tar, anna, 'Marad', 100);
  const tunik = await gondolat(tar, anna, 'Eltűnik', 100);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: tunik, pont: 0 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  return oldal.osszes === 1 && oldal.kartyak[0].azonosito === marad;
});

// ===================================
// 6. ⭐ AZ EGYEZMÉNY A PAKLIBAN IS LÁTSZIK
// ===================================
//
// ⛔ EZ VOLT A SZAKASZ 5.3 ELSŐ ÓRÁJÁBAN MÉRT RÉS: az egyezmény megszületett, de a kártya a
// RÉGI címet mutatta volna. A `pakli.js` azóta futtatja a harmadik fázist is.

proba('⭐⭐⭐ A PAKLI a MEGVÁLTOZOTT címet mutatja az egyezmény után', async () => {
  const { tar, anna } = await ujKoino();
  const kezdet = Date.UTC(2026, 0, 1);

  const g = await anna.tesz('GondolatLetrehozas',
    { cim: 'EREDETI CÍM', meret: 10 }, kezdet);
  await esemenyMentese(tar, g);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
    { entitas: g.azonosito, pont: 100 }, kezdet));
  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat',
    { entitas: g.azonosito,
      ertekek: { elfogadasiKuszob: 51, reszveteliKuszob: 0,
                 minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } }, kezdet));

  const j = await anna.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
      valtozas: { cim: 'MEGVÁLTOZOTT CÍM' }, indoklas: null }, kezdet + 1000);
  await esemenyMentese(tar, j);
  await esemenyMentese(tar, await anna.tesz('Szavazat',
    { javaslat: j.azonosito, szavazat: 'Tamogat' }, kezdet + 2000));

  // Közvetlenül a javaslat után: még a RÉGI cím (a döntés folyamatban).
  const korai = await pakliOldal(tar, KOINO, { most: kezdet + 3000 });
  // Jóval később: az egyezmény megszületett, a cím megváltozott.
  const kesoi = await pakliOldal(tar, KOINO, { most: kezdet + 30 * 24 * 3600 * 1000 });

  return korai.kartyak[0].cim === 'EREDETI CÍM'
    && kesoi.kartyak[0].cim === 'MEGVÁLTOZOTT CÍM';
});

proba('⭐⭐ …és a LAPOZÁS akkor sem csúszik el, ha közben LEJÁR egy döntés', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 9; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  // A horgony az IDŐT is rögzíti, tehát a további oldalak ugyanabban a pillanatban
  // számolnak — akkor is, ha közben egy javaslat lejárna.
  const { mind } = await vegiglapoz(tar, { darab: 3, most: Date.UTC(2026, 0, 1) }, null, true);
  return mind.length === 9 && egyediE(mind);
});

// ===================================
// 7. A KÜLÖN KÉRDÉSEK — amiket a lista szándékosan nem hoz
// ===================================

proba('⭐ A SZÖVEG külön kérdésre megjön (a lista nem hozza)', async () => {
  const { tar, anna } = await ujKoino();
  const e = await anna.tesz('GondolatLetrehozas',
    { cim: 'Van szövege', szoveg: 'A TELJES SZÖVEG', meret: 10 });
  await esemenyMentese(tar, e);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 100 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  const kulon = await entitasSzovege(tar, KOINO, e.azonosito);

  return oldal.kartyak[0].szoveg === undefined     // a listában NINCS
    && kulon.szoveg === 'A TELJES SZÖVEG'          // külön kérdésre VAN
    && kulon.cim === 'Van szövege';
});

proba('⭐⭐ …és a szöveg is a MEGVÁLTOZOTT alakot adja egyezmény után', async () => {
  const { tar, anna } = await ujKoino();
  const kezdet = Date.UTC(2026, 0, 1);

  const g = await anna.tesz('GondolatLetrehozas',
    { cim: 'Cím', szoveg: 'RÉGI SZÖVEG', meret: 10 }, kezdet);
  await esemenyMentese(tar, g);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
    { entitas: g.azonosito, pont: 100 }, kezdet));
  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat',
    { entitas: g.azonosito,
      ertekek: { elfogadasiKuszob: 51, reszveteliKuszob: 0,
                 minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } }, kezdet));

  const j = await anna.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
      valtozas: { szoveg: 'ÚJ SZÖVEG' }, indoklas: null }, kezdet + 1000);
  await esemenyMentese(tar, j);
  await esemenyMentese(tar, await anna.tesz('Szavazat',
    { javaslat: j.azonosito, szavazat: 'Tamogat' }, kezdet + 2000));

  const kesoi = await entitasSzovege(tar, KOINO, g.azonosito,
    { most: kezdet + 30 * 24 * 3600 * 1000 });
  return kesoi.szoveg === 'ÚJ SZÖVEG';
});

proba('⛔ Ismeretlen entitás szövege: null, nem hiba', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  return (await entitasSzovege(tar, KOINO, 'nem-letezo-azonosito')) === null;
});

proba('⭐ A TUDATPONT-KÉP a SAJÁT pontomat adja (ettől él a kártya menüje)', async () => {
  const { tar, anna } = await ujKoino();
  const azonosito = await gondolat(tar, anna, 'Enyém', 700);

  const enyem = await entitasTudatpontja(tar, KOINO, azonosito, { szerzo: anna.szerzo });
  const masse = await entitasTudatpontja(tar, KOINO, azonosito, { szerzo: 'valaki-mas' });

  return enyem.data.eemberHozzajarulas === 700
    && enyem.data.osszesPont === 700
    && enyem.data.hozzajarulokSzama === 1
    // ⭐ Akinek nincs pontja rajta, annak 0 — a kártya ebből tiltja a menüpontokat.
    && masse.data.eemberHozzajarulas === 0;
});

proba('⭐ A kártya SAJÁT pontja a pakliban is ott van', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Enyém', 300);

  const enyem = await pakliOldal(tar, KOINO, { szerzo: anna.szerzo });
  const nevtelen = await pakliOldal(tar, KOINO, {});
  return enyem.kartyak[0].sajatPont === 300 && nevtelen.kartyak[0].sajatPont === 0;
});

// ===================================
// 8. ⭐ A BESOROLÁS — kategória és gondolattípus (5.4)
// ===================================
//
// ⛔ 2026-09-06-ig ez a két entitástípus NEM LÉTEZETT a koinóban: a végpont-térkép találata
// volt (tíz prototípus-végpont mögött nem volt esemény). Itt azt mérjük, hogy megvan — és
// hogy a korlátot a SZÁMÍTÁS tartja, nem a felület.

/** Egy besorolás-entitás (kategória vagy gondolattípus) a tárba. */
async function besorolas(tar, ki, tipus, nev, ikon) {
  const e = await ki.tesz('GondolatLetrehozas', { tipus, cim: nev, ikon, meret: 10 });
  await esemenyMentese(tar, e);
  await esemenyMentese(tar,
    await ki.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 100 }));
  return e.azonosito;
}

proba('⭐ A KATEGÓRIA és a GONDOLATTÍPUS önálló entitás — saját kártyával', async () => {
  const { tar, anna } = await ujKoino();
  await besorolas(tar, anna, 'Kategoria', 'Természet', '🌲');
  await besorolas(tar, anna, 'GondolatTipus', 'Kérdés', '❓');

  const oldal = await pakliOldal(tar, KOINO, {});
  const tipusok = oldal.kartyak.map((k) => k.tipus).sort();
  return oldal.osszes === 2
    && tipusok.join(',') === 'GondolatTipus,Kategoria'
    && oldal.kartyak.find((k) => k.cim === 'Természet').ikon === '🌲';
});

proba('⭐⭐ A gondolat besorolása FELOLDVA érkezik (név + ikon, nem azonosító)', async () => {
  const { tar, anna } = await ujKoino();
  const tipus = await besorolas(tar, anna, 'GondolatTipus', 'Kérdés', '❓');
  const kat = await besorolas(tar, anna, 'Kategoria', 'Természet', '🌲');

  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Miért zöld a levél?', meret: 10,
      gondolatTipus: tipus, kategoriak: [kat] });
  await esemenyMentese(tar, g);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 900 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  const kartya = oldal.kartyak.find((k) => k.cim === 'Miért zöld a levél?');

  return kartya.gondolatTipus.nev === 'Kérdés'
    && kartya.gondolatTipus.ikon === '❓'
    && kartya.kategoriak.length === 1
    && kartya.kategoriak[0].nev === 'Természet';
});

proba('⛔⛔ NÉGY KATEGÓRIA nem megy át — és a SZÁMÍTÁS tartja, nem a felület', async () => {
  const { tar, anna } = await ujKoino();
  const katak = [];
  for (let i = 0; i < 4; i++) katak.push(await besorolas(tar, anna, 'Kategoria', 'K' + i, '🌲'));

  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Túl sok kategória', meret: 10, kategoriak: katak });
  await esemenyMentese(tar, g);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 900 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  // ⭐ A négy kategória bent van; a szabálysértő GONDOLAT nincs — nem jött létre az entitás.
  return oldal.osszes === 4
    && !oldal.kartyak.some((k) => k.cim === 'Túl sok kategória');
});

proba('⭐ HÁROM kategória viszont rendben (a korlát pontosan ott van)', async () => {
  const { tar, anna } = await ujKoino();
  const katak = [];
  for (let i = 0; i < 3; i++) katak.push(await besorolas(tar, anna, 'Kategoria', 'K' + i, '🌲'));

  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Pont három', meret: 10, kategoriak: katak });
  await esemenyMentese(tar, g);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 900 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  const kartya = oldal.kartyak.find((k) => k.cim === 'Pont három');
  return kartya !== undefined && kartya.kategoriak.length === 3;
});

proba('⛔ UGYANAZ a kategória háromszor nem három besorolás', async () => {
  const { tar, anna } = await ujKoino();
  const kat = await besorolas(tar, anna, 'Kategoria', 'Egy', '🌲');

  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Ismétlés', meret: 10, kategoriak: [kat, kat, kat] });
  await esemenyMentese(tar, g);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 900 }));

  const oldal = await pakliOldal(tar, KOINO, {});
  return !oldal.kartyak.some((k) => k.cim === 'Ismétlés');
});

proba('⚠️ A HIÁNYZÓ kategória nem hiba: a gondolat áll, a besorolás nem oldódik fel (D19)',
  async () => {
    const { tar, anna } = await ujKoino();
    const g = await anna.tesz('GondolatLetrehozas',
      { tipus: 'Gondolat', cim: 'Ismeretlen kategóriával', meret: 10,
        kategoriak: ['meg-nem-erkezett-kategoria'] });
    await esemenyMentese(tar, g);
    await esemenyMentese(tar,
      await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 900 }));

    const oldal = await pakliOldal(tar, KOINO, {});
    const kartya = oldal.kartyak[0];
    // ⭐ A gondolat LÉTEZIK, csak a besorolása üres — nem találunk ki nevet hozzá.
    return oldal.osszes === 1
      && kartya.cim === 'Ismeretlen kategóriával'
      && kartya.kategoriak.length === 0;
  });

// ===================================
// 9. ⭐ A MODÁLOK KÉRDÉSEI (5.5)
// ===================================

proba('⭐ A RÉSZLETEK az egyezmény UTÁNI alakot adják, és a besorolást is', async () => {
  const { tar, anna } = await ujKoino();
  const kat = await besorolas(tar, anna, 'Kategoria', 'Természet', '🌲');
  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Címe', szoveg: 'Szövege', meret: 10, kategoriak: [kat] });
  await esemenyMentese(tar, g);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 400 }));

  const r = await entitasReszletei(tar, KOINO, g.azonosito, { szerzo: anna.szerzo });
  return r.data.cim === 'Címe'
    && r.data.nev === 'Címe'                       // a kártya `nev`-et is olvashat
    && r.data.eemberHozzajarulas === 400
    && r.data.kategoriak[0].nev === 'Természet'
    && r.data.hozzajarulok.length === 1;
});

proba('⭐⭐ A KÜSZÖBÖK a prototípus NEVEIVEL érkeznek (a modal így olvassa)', async () => {
  const { tar, anna } = await ujKoino();
  const azonosito = await gondolat(tar, anna, 'Küszöbös', 100);

  const alap = await entitasKuszobei(tar, KOINO, azonosito, { szerzo: anna.szerzo });
  // Még senki nem javasolt: az alapértelmezés jön, a saját javaslat üres.
  const alapRendben = alap.aktualisErtekek.javaslatElfogadasiKuszob === 51
    && alap.aktualisErtekek.aktualMinimumDontesiIdo === 86400
    && alap.eemberJavaslat === null;

  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat', {
    entitas: azonosito,
    ertekek: { elfogadasiKuszob: 66, reszveteliKuszob: 10,
               minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 }
  }));

  const uj = await entitasKuszobei(tar, KOINO, azonosito, { szerzo: anna.szerzo });
  return alapRendben
    && uj.aktualisErtekek.javaslatElfogadasiKuszob === 66
    && uj.aktualisErtekek.reszveteliAranyKuszob === 10
    && uj.eemberJavaslat.aktualMinimumDontesiIdo === 3600;
});

proba('⭐ A HIÁNYZÓ FELMENŐK: amelyik ősre nincs pontom, az felsorolódik', async () => {
  const { tar, anna } = await ujKoino();
  const nagyszulo = await gondolat(tar, anna, 'Nagyszülő', 100);

  // A szülőt MÁSVALAKI tartja — nekem nincs rajta pontom.
  const bela = await ujEember(KOINO);
  const sz = await bela.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Szülő', meret: 10, szulo: nagyszulo });
  await esemenyMentese(tar, sz);
  await esemenyMentese(tar,
    await bela.tesz('TudatpontRendezes', { entitas: sz.azonosito, pont: 100 }));

  const gy = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'Gyerek', meret: 10, szulo: sz.azonosito });
  await esemenyMentese(tar, gy);
  await esemenyMentese(tar,
    await anna.tesz('TudatpontRendezes', { entitas: gy.azonosito, pont: 100 }));

  const f = await hianyzoFelmenok(tar, KOINO, gy.azonosito, { szerzo: anna.szerzo });
  // ⭐ A Szülőre nincs pontom (Béláé), a Nagyszülőre van — tehát egy hiányzik.
  return f.data.hianyzoDb === 1
    && f.data.hianyzoFelmenok[0].nev === 'Szülő'
    && f.data.eemberEgyenleg === 10000 - 200;      // két entitáson 100-100
});

proba('⛔⛔ KÖR a szülő-láncban a felmenő-felmérést sem akasztja meg', async () => {
  const { tar, anna } = await ujKoino();
  const a = await anna.tesz('GondolatLetrehozas', { tipus: 'Gondolat', cim: 'A', meret: 10 });
  await esemenyMentese(tar, a);
  const b = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'B', meret: 10, szulo: a.azonosito });
  await esemenyMentese(tar, b);
  const c = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'C', meret: 10, szulo: b.azonosito });
  await esemenyMentese(tar, c);
  for (const e of [a, b, c]) {
    await esemenyMentese(tar,
      await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 100 }));
  }

  const f = await hianyzoFelmenok(tar, KOINO, c.azonosito, { szerzo: anna.szerzo });
  return f.data.hianyzoDb === 0;      // mindegyiken van pontom, és nem fagyott le
});

proba('⛔ Ismeretlen entitás részletei/küszöbei: null, nem hiba', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  return (await entitasReszletei(tar, KOINO, 'nincs-ilyen')) === null
    && (await entitasKuszobei(tar, KOINO, 'nincs-ilyen')) === null
    && (await hianyzoFelmenok(tar, KOINO, 'nincs-ilyen')) === null;
});

// ===================================
// 10. A GYORSÍTÓTÁR
// ===================================

proba('⭐ Egy lapozás alatt EGYSZER számol állapotot, nem oldalanként', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 12; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  const { nezet, oldalak } = await vegiglapoz(tar, { darab: 3 });
  return oldalak === 4 && nezet.szamitasok === 1;
});

export default futtatas;
