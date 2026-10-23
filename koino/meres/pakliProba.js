// koino/meres/pakliProba.js — a KÉRDEZHETŐ PAKLI-LEKÉRDEZÉS önpróbája (Szakasz 5 / 5.2)

// Mit bizonyít ez a lap?
//
// ⛔⛔ A 9. SZABÁLYT. A pakli az utolsó pont, ahol a felület visszahozhatná a „add ide
// mindet" kérdést a programba. Itt azt mérjük, hogy **nem hozza vissza**: a darabszám
// felülről korlátos, a lapozás kulcs-alapú, és a válasz nem hordozza a szövegeket.
//
// ⭐⭐ ÉS A LEGFONTOSABBAT: hogy a lapozás **nem csúszik el**, ha közben változik a koino.
// A tudatpont bármikor átrendezhető — enélkül egy kártya kimaradna vagy kétszer jönne.

import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';
import {
  pakliOldal, ujPakliNezet, entitasSzovege, entitasTudatpontja,
  entitasReszletei, entitasKuszobei, hianyzoFelmenok, MAX_DARAB, RENDEZESEK, kuszobokBefele,
  pakliHierarchia, TESTVER_KORLAT,
  agHelyzete, sajatHozzarendelesek, HOZZARENDELES_KORLAT, biztosElotag, ELORE_KERES,
  strukturaDarabszam, strukturaLap, STRUKTURA_KERET, STRUKTURA_KERES, felderitesAllasa,
  sikidomGyerekek, sikidomOslanc, SIKIDOM_DARAB,
  keresesHelyben, KERESES_ALAP, KERESES_MAX,
  helyiStatisztika
} from '../js/allapot/pakli.js';
import { GYOKER_KULCS } from '../js/csere/szeletEgyeztetes.js';

import { ALAP_KUSZOBOK } from '../js/allapot/javaslatSzamitas.js';

import { probaGyujtemeny, ujEember, ujTag, tagsagiEsemenyei } from './probaFuttato.js';
import { toredekAzonosito } from '../js/allapot/szabalyok.js';

const { proba, futtatas } = probaGyujtemeny('A KÉRDEZHETŐ PAKLI (Szakasz 5 / 5.2)');

const KOINO = 'proba';

// ===================================
// SEGÉDEK
// ===================================

/** Eldobható tár egy e-emberrel. */
async function ujKoino() {
  const mappa = await mkdtemp(join(tmpdir(), 'koino-pakli-'));
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  // ⭐ D93/1: anna TAG (a pontja csak így számít) — a koinó születése és a tagsági eseményei a tárban.
  const anna = await ujTag(KOINO);
  for (const e of tagsagiEsemenyei(anna)) await esemenyMentese(tar, e);
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
  // ⭐ D85/2: a szavazó a javaslatra is pontot tesz — ahogy a művelet.
  for (const ev of await anna.szavaz(j, { szavazat: 'Tamogat' }, kezdet + 2000)) await esemenyMentese(tar, ev);

  // ⚠️ A GONDOLAT kártyáját keressük, nem a nulladikat: az 5.5 óta a JAVASLAT is kártya a
  // pakliban, és a rendezési értéke az érintettével azonos — tehát bármelyik lehet elöl.
  const gondolatKartya = (oldal) => oldal.kartyak.find((k) => k.tipus === 'Gondolat');

  // Közvetlenül a javaslat után: még a RÉGI cím (a döntés folyamatban).
  const korai = await pakliOldal(tar, KOINO, { most: kezdet + 3000 });
  // Jóval később: az egyezmény megszületett, a cím megváltozott.
  const kesoi = await pakliOldal(tar, KOINO, { most: kezdet + 30 * 24 * 3600 * 1000 });

  return gondolatKartya(korai).cim === 'EREDETI CÍM'
    && gondolatKartya(kesoi).cim === 'MEGVÁLTOZOTT CÍM';
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
  // ⭐ D85/2: a szavazó a javaslatra is pontot tesz — ahogy a művelet.
  for (const ev of await anna.szavaz(j, { szavazat: 'Tamogat' }, kezdet + 2000)) await esemenyMentese(tar, ev);

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
  // ⚠️ AZ ÁLLANDÓRA HIVATKOZUNK, NEM BEÉGETETT SZÁMRA. Korábban 86400 állt itt, és amikor
  // Csaba 1 másodpercre vitte le az alap-minimumot (2026-09-12), ez a próba bukott — pedig
  // a mért viselkedés („az alapértelmezés jön") **nem változott**. *Egy próba, ami a
  // paraméter ÉRTÉKÉT rögzíti, a paraméter minden hangolását álhibának mutatja.*
  const alapRendben = alap.aktualisErtekek.javaslatElfogadasiKuszob === ALAP_KUSZOBOK.elfogadasiKuszob
    && alap.aktualisErtekek.aktualMinimumDontesiIdo === ALAP_KUSZOBOK.minimumDontesiIdo
    && alap.eemberJavaslat === null;

  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat', {
    entitas: azonosito,
    ertekek: { elfogadasiKuszob: 66, reszveteliKuszob: 10,
               minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 }
  }));

  const uj = await entitasKuszobei(tar, KOINO, azonosito, { szerzo: anna.szerzo });
  // ⛔ D101 (elágazás 109): a SAJÁT javaslat a javaslat-alakban jön (`minimumDontesiIdo` — az `ErtekJavaslatModal` így
  // tölti ki a mezőit), a medián a medián-alakban (`aktualMinimumDontesiIdo`). Itt korábban a saját javaslatot is a medián
  // nevével vártuk — a próba a hibát rögzítette, nem a hívó igényét.
  return alapRendben
    && uj.aktualisErtekek.javaslatElfogadasiKuszob === 66
    && uj.aktualisErtekek.reszveteliAranyKuszob === 10
    && uj.aktualisErtekek.aktualMinimumDontesiIdo === 3600
    && uj.eemberJavaslat.minimumDontesiIdo === 3600
    && uj.eemberJavaslat.aktualMinimumDontesiIdo === undefined;
});

proba('⭐ A HIÁNYZÓ FELMENŐK: amelyik ősre nincs pontom, az felsorolódik', async () => {
  const { tar, anna } = await ujKoino();
  const nagyszulo = await gondolat(tar, anna, 'Nagyszülő', 100);

  // A szülőt MÁSVALAKI tartja — nekem nincs rajta pontom.
  const bela = await ujTag(KOINO);                 // D93/1: Béla is tag (különben a Szülő pontja nem számítana)
  for (const e of tagsagiEsemenyei(bela)) await esemenyMentese(tar, e);
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

// ===================================
// ⭐⭐ A HÁZ (D100): A HIERARCHIKUS PAKLI — felmenők, bogár, testvérek, és ami hiányzik
// ===================================

/** Egy kis fa: A (erős gyökér) → A1 (erős) → A11; A → A2 (gyenge); B (gyenge gyökér). */
async function kisFa() {
  const { tar, anna } = await ujKoino();
  const A = await gondolat(tar, anna, 'A', 50);
  const A1 = await gondolat(tar, anna, 'A1', 30, A);
  const A2 = await gondolat(tar, anna, 'A2', 5, A);
  const A11 = await gondolat(tar, anna, 'A11', 10, A1);
  const B = await gondolat(tar, anna, 'B', 20);
  return { tar, anna, A, A1, A2, A11, B };
}

proba('⭐⭐ A HIERARCHIKUS PAKLI: a legerősebb gyökértől a bogár lefelé, a testvérek oldalt — és mindent tartva semmi nem hiányzik', async () => {
  const f = await kisFa();
  const h = await pakliHierarchia(f.tar, KOINO, { szerzo: f.anna.szerzo });
  const k = await pakliHierarchia(f.tar, KOINO, { entitas: f.A1, szerzo: f.anna.szerzo });
  const az = (l) => l.map((x) => x.azonosito).join(',');
  return h.kivalasztott === f.A && az(h.pakli) === [f.A, f.A1, f.A11].join(',') && az(h.testverek) === f.B
    && h.pakli.map((x) => x.melysegiSzint).join(',') === '1,2,3' && h.hianyzik.length === 0
    && k.kivalasztott === f.A1 && az(k.pakli) === [f.A, f.A1, f.A11].join(',') && az(k.testverek) === f.A2
    && k.testverek[0].melysegiSzint === 2 && h.pakli.every((x) => x.tartom && x.osszPontForras === 'szamolt')
    && h.pakli[0].agazatiPont === 50 + 30 + 5 + 10;
});

proba('⭐⭐ A SZIGORÚ (b) ALATT: amit nem tartok, annak a gyerekeit és a gyökér szintjét KÉRENDŐNEK mondja, és a kártyán jelöli', async () => {
  const f = await kisFa();
  const csakA = new Set([f.A]);
  const h = await pakliHierarchia(f.tar, KOINO, { entitas: f.A, tartott: (x) => csakA.has(x), gyokerTeljes: false });
  const kerendo = (fajta, kulcs) => h.hianyzik.some((x) => x.fajta === fajta && x.kulcs === kulcs);
  // ⭐ a bogárnál csak az ELSŐ bizonytalan szint kérendő, MÉLYEN (D102: a tartó maga jár be legjobb-először)
  const a1 = h.hianyzik.find((x) => x.fajta === 'fejlecek' && x.kulcs === f.A1);
  return kerendo('fejlecek', '') && a1?.m === true && !kerendo('fejlecek', f.A11) && !kerendo('fejlecek', f.A)
    && h.pakli[0].tartom === true && h.pakli[1].tartom === false;
});

proba('⭐ AZ ÖSSZ-PONT FORRÁSA a kártyán (H2): ellenőrizve · bemondás · ismeretlen · részleges', async () => {
  const { tar, anna } = await ujKoino();
  // A-t tartom (pontom van rajta); a gyerekeinek és B-nek CSAK A SZÜLETÉSE van meg (a szigorú (b) alatt így jön el)
  const A = await gondolat(tar, anna, 'A', 50);
  const masik = await ujEember(KOINO);
  const szuletes = async (cim, szulo = null) => {
    const e = await masik.tesz('GondolatLetrehozas', { cim, meret: 10, szulo });
    await esemenyMentese(tar, e);
    return e.azonosito;
  };
  const A1 = await szuletes('A1', A), A2 = await szuletes('A2', A), A3 = await szuletes('A3', A), B = await szuletes('B');
  const nezet = ujPakliNezet({ tartott: async () => new Set([A]) });
  const bemondasok = new Map([[A1, { osszPont: 77, ellenorzott: true }], [A2, { osszPont: 9, ellenorzott: false }]]);
  const h = await pakliHierarchia(tar, KOINO, { entitas: A1, nezet, bemondasok });
  const kartyak = new Map([...h.pakli, ...h.testverek].map((x) => [x.azonosito, x]));
  const b = await pakliHierarchia(tar, KOINO, { entitas: B, nezet, bemondasok });
  const ki = {
    ellenorzott: kartyak.get(A1)?.osszPontForras === 'ellenorzott' && kartyak.get(A1)?.agazatiPont === 77,
    bemondas: kartyak.get(A2)?.osszPontForras === 'bemondas',
    ismeretlenTestver: kartyak.get(A3)?.osszPontForras === 'ismeretlen',
    ismeretlenGyoker: b.pakli.find((x) => x.azonosito === B)?.osszPontForras === 'ismeretlen',
    reszleges: kartyak.get(A)?.osszPontForras === 'reszleges' && kartyak.get(A)?.tartom === true
      && kartyak.get(A)?.agazatiPont === 50 + 77 + 9
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (forrás — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ⭐⭐ D116: a FELDERÍTETLEN RÉSZ — egy segédből a kártyán, a testvéreknél, a Struktúra és a Síkidom soraiban, és a felderítés
// állásában. A-t tartom (két gyereke: A1, A2 — csak a születésük); A1-ről a tartó azt mondta: 5 gyereke van és 12 entitás alatta
// (ebből egyet ismerek: A11); A2-ről csak az össz-pontot (a darabját nem — „nem tudom”); a gyökér szintjéről: 4 legfelső
// szintű és 30 entitás. Rontás: a bemondott alatta helyett a helyben ismert → a hiány eltűnik → bukik.
proba('⭐⭐ D116: a FELDERÍTETLEN RÉSZ — a kártyán, a testvéreknél, a Struktúra és a Síkidom soraiban, és a felderítés állásában', async () => {
  const { tar, anna } = await ujKoino();
  const A = await gondolat(tar, anna, 'A', 50);
  const masik = await ujEember(KOINO);
  const szuletes = async (cim, szulo = null) => {
    const e = await masik.tesz('GondolatLetrehozas', { cim, meret: 10, szulo });
    await esemenyMentese(tar, e);
    return e.azonosito;
  };
  const A1 = await szuletes('A1', A), A2 = await szuletes('A2', A), A11 = await szuletes('A11', A1);
  const nezet = ujPakliNezet({ tartott: async () => new Set([A]) });
  const bemondasok = new Map([[A1, { osszPont: 77, alatta: 12 }], [A2, { osszPont: 9 }]]);
  const fejlecTudas = new Map([[A1, { gy: 5 }], [GYOKER_KULCS, { gy: 4, ad: 30 }]]);
  const b = { nezet, bemondasok, fejlecTudas };
  const h = await pakliHierarchia(tar, KOINO, { entitas: A1, ...b });
  const gy = await pakliHierarchia(tar, KOINO, { entitas: A, ...b });
  const kartya = (hh, az) => [...hh.pakli, ...hh.testverek].find((x) => x.azonosito === az);
  const sorok = (await strukturaLap(tar, KOINO, b)).sorok;
  const sor = (az) => sorok.find((x) => x.entitasId === az);
  const sikidom = await sikidomGyerekek(tar, KOINO, { szulo: A, ...b });
  const agA1 = await felderitesAllasa(tar, KOINO, { agazat: A1, keret: 10, ...b });
  const egesz = await felderitesAllasa(tar, KOINO, { keret: 10, ...b });
  const ki = {
    // A1: 5 gyerekből 1 ismert, 12 alatta-ból 1 → 4 gyerek és 11 entitás hiányzik (pontosan)
    a1: kartya(h, A1)?.hiany?.gyerek === 4 && kartya(h, A1).hiany.alatta === 11 && kartya(h, A1).hiany.legalabb === false
      && kartya(h, A1).hiany.osszesAlatta === 12,
    // A (tartom): a gyerekeit mind ismerem; alatta (1 + 12) + (1 + ?) — legalább 14, ebből 3-at ismerek
    a: kartya(h, A)?.hiany?.gyerek === 0 && kartya(h, A).hiany.alatta === 11 && kartya(h, A).hiany.legalabb === true,
    // A2: semmit nem tudok róla („+?”)
    a2: kartya(h, A2)?.hiany?.gyerek === null && kartya(h, A2).hiany.legalabb === true,
    // a testvérek: A1 szülője A — mind ismert; a gyökérnél 4-ből 1
    testver: h.testverHiany?.gyerek === 0 && gy.testverHiany?.gyerek === 3 && gy.testverHiany.alatta === 26,
    struktura: sor(A1)?.koinoHiany?.alatta === 11 && sor(A)?.koinoHiany?.legalabb === true,
    sikidom: sikidom.gyerekek.find((x) => x.entitasId === A1)?.koinoHiany?.gyerek === 4,
    felderites: agA1.agOsszes === 13 && agA1.agOsszesLegalabb === false && egesz.agOsszes === 30
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (D116 — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

// ⭐ D116: ha mindent tartok („mindent” mód), egyik kártyán sincs hiány-jel (null) — a jel csak a valódi hiányé.
proba('⭐ D116: „mindent” módban egyik kártyán sincs hiány-jel — és a felderítés az ág pontos méretét mondja', async () => {
  const f = await kisFa();
  const h = await pakliHierarchia(f.tar, KOINO, { entitas: f.A1 });
  const ag = await felderitesAllasa(f.tar, KOINO, { agazat: f.A, keret: 10 });
  return [...h.pakli, ...h.testverek].every((x) => x.hiany === null) && h.testverHiany === null
    && ag.agOsszes === 4 && ag.agOsszesLegalabb === false;
});

proba('⭐ A HIÁNYZÓ FELMENŐ és a kért, de nem ismert entitás: kérendő szelet — a lánc ott csonka, nem hibás', async () => {
  const { tar, anna } = await ujKoino();
  const ismeretlenSzulo = 'Z'.repeat(43);
  const G = await gondolat(tar, anna, 'árva', 10, ismeretlenSzulo);
  const h = await pakliHierarchia(tar, KOINO, { entitas: G });
  const n = await pakliHierarchia(tar, KOINO, { entitas: 'Q'.repeat(43) });
  return h.kivalasztott === G && h.pakli.length === 1 && h.hianyzik.some((x) => x.fajta === 'szelet' && x.kulcs === ismeretlenSzulo)
    && n.hianyzik.some((x) => x.fajta === 'szelet' && x.kulcs === 'Q'.repeat(43));
});

proba('⛔ A TESTVÉREK KORLÁTOSAK (9. szabály) — 60 gyökérből legfeljebb ' + TESTVER_KORLAT + ' testvér, a legerősebbek', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 61; i++) await gondolat(tar, anna, 'G' + i, 1 + i);
  const h = await pakliHierarchia(tar, KOINO, {});
  const pontok = h.testverek.map((x) => x.agazatiPont);
  return h.testverek.length === TESTVER_KORLAT && h.pakli[0].agazatiPont === 61
    && pontok.every((p, i) => i === 0 || p <= pontok[i - 1]) && pontok[pontok.length - 1] === 61 - TESTVER_KORLAT;
});

proba('⭐ A MEGNYITOTT KÁRTYA SZÖVEGE: ha a darab hiányzik, kérendő törzs (a vállalótól)', async () => {
  const { tar, anna } = await ujKoino();
  const e = await anna.tesz('GondolatLetrehozas', { cim: 'Szöveges', meret: 10, szulo: null,
    szoveg: { lenyomat: 'L'.repeat(43), bajt: 12 } });
  await esemenyMentese(tar, e);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: e.azonosito, pont: 5 }));
  const h = await pakliHierarchia(tar, KOINO, { entitas: e.azonosito, darabOlvas: async () => null });
  return h.hianyzik.some((x) => x.fajta === 'torzs' && x.kulcs === e.azonosito);
});

// ⭐ A ház (D100, H3): a felület az örökölt `Pakli.js`-t futtatja, ami a PROTOTÍPUS útvonalait kérdezi, és a prototípus
// alakját várja — a lap fordít (`felulet/js/kartyaAdat.js`). A fordító tiszta függvények, node alatt is futnak: a valódi
// `pakliHierarchia` válaszából a `Pakli.js` alakja (a kiválasztott a típusával, a mélység és a létrehozás a kártya legfelső
// szintjén — a testvér-sorrend ebből rendez —, a forrás-jel), és az útvonalak (a fa-szelet, a lapos nézet; a program
// saját lapos útja nem fordul). Rontás: a fordító a koinó szótárát adná tovább → a `Pakli.js` mezői hiányoznak.
proba('⭐ D100: a prototípus pakli-útvonalai és alakja — a lap fordít (a `Pakli.js` bájtra a prototípusé)', async () => {
  const { prototipusUtvonala, hierarchiaAdatta, rendezettAdatta, LAPOS_OLDAL } = await import('../felulet/js/kartyaAdat.js');
  const { tar, anna } = await ujKoino();
  const A = await gondolat(tar, anna, 'A', 30);
  const A1 = await gondolat(tar, anna, 'A1', 20, A);
  await gondolat(tar, anna, 'A2', 5, A);
  const h = await pakliHierarchia(tar, KOINO, { entitas: A1 });
  const p = hierarchiaAdatta(h);
  const fa = prototipusUtvonala('pakli?entitasId=' + A1 + '&entitasTipus=Gondolat');
  const gyoker = prototipusUtvonala('pakli');
  const lapos = prototipusUtvonala('pakli/rendezett?mod=sajatPont&irany=novekvo');
  const jel = fa.jel({ ...h, betoltes: true, kitolKerni: 1 });
  const ki = {
    kivalasztott: p.kivalasztottEntitas?.entitasId === A1 && p.kivalasztottEntitas?.entitasTipus === 'Gondolat'
      // ⛔ D101 ④: a teljes kártya-adat (a Síkidom adatlapja ebből épít — a prototípusban „(cím nélkül)” állt)
      && p.kivalasztottEntitas?.adatok?.cim === 'A1',
    lanc: p.pakli.map((x) => x.entitasId).join() === [A, A1].join() && p.pakli[1].szuloId === A
      && p.pakli[0].melysegiSzint === 1 && p.pakli[1].melysegiSzint === 2,
    testver: p.testverek.length === 1 && p.testverek[0].hierarchikusOsszesPont === 5
      && Number.isFinite(p.testverek[0].letrehozva),
    forras: p.pakli[1].koinoForras?.osszPontForras === 'szamolt' && p.pakli[1].koinoForras?.tartom === true,
    utak: fa.utvonal === 'pakli/hierarchikus?entitas=' + encodeURIComponent(A1) && gyoker.utvonal === 'pakli/hierarchikus'
      && lapos.utvonal === 'pakli?rendezes=sajatPont&irany=novekvo&darab=' + LAPOS_OLDAL
      && prototipusUtvonala('pakli?rendezes=ido&darab=10') === null && prototipusUtvonala('pakli/szoveg/Gondolat/' + A) === null,
    jel: jel.fajta === 'hierarchia' && jel.betoltes === true && jel.kitolKerni === 1 && jel.kivalasztott === A1 && jel.kert === A1,
    laposAlak: rendezettAdatta({ kartyak: h.pakli }).rendezettLista.length === 2,
    // ⭐ D101: a kártya menüjének Rendezése (`agazatId`) a program `agazat`-ja; a megjegyzés a jelzésben megy a lapnak
    agazat: prototipusUtvonala('pakli/rendezett?mod=ido&irany=csokkeno&agazatId=' + A).utvonal
        === 'pakli?rendezes=ido&irany=csokkeno&darab=' + LAPOS_OLDAL + '&agazat=' + encodeURIComponent(A)
      && lapos.jel({ kartyak: [], koinoMegjegyzes: 'x', nemEldontheto: 2, agazat: A }).koinoMegjegyzes === 'x'
      && lapos.jel({ kartyak: [], nemEldontheto: 2, agazat: A }).nemEldontheto === 2
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (fordító — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⛔ Ismeretlen entitás részletei/küszöbei: null, nem hiba', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Egy', 100);
  return (await entitasReszletei(tar, KOINO, 'nincs-ilyen')) === null
    && (await entitasKuszobei(tar, KOINO, 'nincs-ilyen')) === null
    && (await hianyzoFelmenok(tar, KOINO, 'nincs-ilyen')) === null;
});

// ===================================
// 10. ⭐ A JAVASLAT MINT KÁRTYA (5.5)
// ===================================

/** Gondolat + rá adott javaslat + szavazat. */
async function javaslatosEset(tar, anna, { szavazat = 'Tamogat', kezdet = Date.UTC(2026, 0, 1) } = {}) {
  const g = await anna.tesz('GondolatLetrehozas',
    { tipus: 'Gondolat', cim: 'EREDETI', meret: 10 }, kezdet);
  await esemenyMentese(tar, g);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
    { entitas: g.azonosito, pont: 400 }, kezdet));
  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat',
    { entitas: g.azonosito,
      ertekek: { elfogadasiKuszob: 51, reszveteliKuszob: 0,
                 minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } }, kezdet));

  const j = await anna.tesz('Javaslat',
    { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Modositas',
      valtozas: { cim: 'JAVASOLT CÍM' }, indoklas: 'Mert jobb.' }, kezdet + 1000);
  await esemenyMentese(tar, j);

  // ⭐⭐ A JAVASLAT IS ENTITÁS (2026-09-06), tehát tudatpont nélkül a D14 szerint NEM
  // LÉTEZNE — ugyanúgy, ahogy a gondolat sem. A parancssor is ezt teszi.
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
    { entitas: j.azonosito, pont: 100 }, kezdet + 1500));

  await esemenyMentese(tar, await anna.tesz('Szavazat',
    { javaslat: j.azonosito, szavazat }, kezdet + 2000));

  return { gondolat: g, javaslat: j, kezdet };
}

proba('⭐⭐ A JAVASLAT megjelenik a pakliban, saját kártyaként', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  const oldal = await pakliOldal(tar, KOINO,
    { most: kezdet + 3000, szerzo: anna.szerzo });
  const k = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito);

  return k !== undefined
    && k.tipus === 'Javaslat'
    && k.cim === 'JAVASOLT CÍM'
    && k.javaslat.muvelet === 'Modositas'
    && k.javaslat.erintettCim === 'EREDETI'
    && k.javaslat.indoklas === 'Mert jobb.';
});

// ⭐⭐ EZ A PRÓBA MÁS LETT, ÉS AZ OKA TANULSÁGOS.
//
// Korábban a javaslat rendezési értékét KÉZZEL kölcsönöztük az érintettétől, mert magának
// nem volt tudatpontja — és a próba azt mérte, hogy a kényszer-megoldás működik-e. Mióta a
// javaslat **entitás**, és a **szülője az érintett** (D27/1: „gondolatból ágazik ki"), ez a
// szerkezetből következik: a hierarchikus rendezés amúgy is a szülő UTÁN teszi.
//
// *A jó szerkezet elvette a szabály dolgát.*
proba('⭐⭐ A javaslat a GONDOLATA GYEREKE — a hierarchikus rendezés mellé teszi', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'Erős', 900);
  const { javaslat, gondolat: g, kezdet } = await javaslatosEset(tar, anna);

  const oldal = await pakliOldal(tar, KOINO,
    { most: kezdet + 3000, rendezes: 'hierarchikus', irany: 'novekvo' });
  const sorrend = oldal.kartyak.map((k) => k.azonosito);

  // A javaslat KÖZVETLENÜL az érintettje után áll — mert a gyereke.
  return sorrend.indexOf(javaslat.azonosito) - sorrend.indexOf(g.azonosito) === 1;
});

proba('⭐ És a javaslatnak SAJÁT tudatpontja van, mint bármely entitásnak', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 3000, szerzo: anna.szerzo });
  const k = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito);
  return k.osszesPont === 100 && k.sajatPont === 100 && k.hozzajarulok === 1;
});

proba('⭐ A SZAVAZÁS ÁLLÁSA a kártyán van — ezrelékben, egész számként', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 3000, szerzo: anna.szerzo });
  const j = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito).javaslat;

  return j.tamogatottsagEzrelek === 1000        // egyetlen támogató szavazat
    && Number.isInteger(j.tamogatottsagEzrelek)  // ⭐ SOHA nem tört (egész aritmetika)
    && j.szavazok === 1
    && j.statusz === 'folyamatban'
    && j.szavazhatok === true;                   // van tudatpontom az érintetten
});

proba('⛔ AKINEK NINCS TUDATPONTJA az érintetten, az nem szavazhat', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  // Egy másik kulcs: neki nincs pontja a gondolaton.
  const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 3000, szerzo: 'valaki-mas' });
  const j = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito).javaslat;
  return j.szavazhatok === false;
});

proba('⭐⭐ AZ EGYEZMÉNY megszületése a kártyán is látszik', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  const kesobb = kezdet + 30 * 24 * 3600 * 1000;
  const oldal = await pakliOldal(tar, KOINO, { most: kesobb, szerzo: anna.szerzo });
  const j = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito).javaslat;

  return j.statusz === 'elfogadva' && j.egyezmeny !== null;
});

// ⭐⭐ D85/4 (Csaba, 2026-10-02): az egyezmény UGYANAZ AZ ENTITÁS, mint a javaslat, új fázisban —
// és a kártya ezt mondja ki: a típusa `Egyezmeny` lesz, a többi változatlan.
proba('⭐⭐ D85/4: elfogadás után a kártya EGYEZMÉNY — ugyanaz az azonosító, ugyanazok a pontok',
  async () => {
    const { tar, anna } = await ujKoino();
    const { javaslat, kezdet } = await javaslatosEset(tar, anna);

    const elotte = (await pakliOldal(tar, KOINO, { most: kezdet + 3000, szerzo: anna.szerzo }))
      .kartyak.find((x) => x.azonosito === javaslat.azonosito);
    const utana = (await pakliOldal(tar, KOINO,
      { most: kezdet + 30 * 24 * 3600 * 1000, szerzo: anna.szerzo }))
      .kartyak.find((x) => x.azonosito === javaslat.azonosito);

    return elotte?.tipus === 'Javaslat' && elotte.javaslat.statusz === 'folyamatban'
      && utana?.tipus === 'Egyezmeny' && utana.javaslat.statusz === 'elfogadva'
      && utana.osszesPont === elotte.osszesPont && utana.osszesPont === 100
      && utana.szulo === elotte.szulo;
  });

// ⭐⭐ D85/5: a több érintettes javaslat MINDEN érintett gondolat alatt megjelenik — a töredéke
// kártyájaként, a SAJÁT részével (művelet, érintett, „1/2”); elfogadás után mindegyik egyezmény.
proba('⭐⭐ D85/5: a TÖREDÉK-KÁRTYÁK minden érintett alatt, a saját részükkel — és egyezmény lesz belőlük',
  async () => {
    const { tar, anna } = await ujKoino();
    const kezdet = Date.UTC(2026, 0, 1);
    const g = [];
    for (const cim of ['ELSŐ', 'MÁSODIK']) {
      const x = await anna.tesz('GondolatLetrehozas', { tipus: 'Gondolat', cim, meret: 10 }, kezdet);
      await esemenyMentese(tar, x);
      await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: x.azonosito, pont: 200 }, kezdet));
      await esemenyMentese(tar, await anna.tesz('ErtekJavaslat', { entitas: x.azonosito,
        ertekek: { elfogadasiKuszob: 51, reszveteliKuszob: 0, minimumDontesiIdo: 3600, maximumDontesiIdo: 7200 } },
        kezdet));
      g.push(x);
    }
    const j = await anna.tesz('Javaslat', { fajta: 'szerkesztesi', erintettek: [
      { entitas: g[0].azonosito, muvelet: 'Modositas', valtozas: { cim: 'ÚJ ELSŐ' } },
      { entitas: g[1].azonosito, muvelet: 'Athelyezes', valtozas: { szulo: g[0].azonosito } }
    ] }, kezdet + 1000);
    await esemenyMentese(tar, j);
    const t = g.map((x) => toredekAzonosito(j.azonosito, x.azonosito));
    for (const ti of t) {
      await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: ti, pont: 50 }, kezdet + 1500));
    }
    await esemenyMentese(tar, await anna.tesz('Szavazat', { javaslat: j.azonosito, szavazat: 'Tamogat' },
      kezdet + 2000));

    const nyitva = (await pakliOldal(tar, KOINO, { most: kezdet + 3000, szerzo: anna.szerzo })).kartyak;
    const k = t.map((ti) => nyitva.find((x) => x.azonosito === ti));
    const reszJo = k.every((x, i) => x !== undefined && x.tipus === 'Javaslat'
      && x.szulo === g[i].azonosito
      && x.javaslat.erintett === g[i].azonosito
      && x.javaslat.toredek?.sorszam === i + 1 && x.javaslat.toredek.darab === 2
      && x.javaslat.szavazhatok === true);
    const muveletJo = k[0]?.javaslat.muvelet === 'Modositas' && k[1]?.javaslat.muvelet === 'Athelyezes';

    const lezarva = (await pakliOldal(tar, KOINO, { most: kezdet + 30 * 24 * 3600 * 1000 })).kartyak;
    const egyezmenyek = t.map((ti) => lezarva.find((x) => x.azonosito === ti));
    return reszJo && muveletJo
      && !nyitva.some((x) => x.azonosito === j.azonosito)          // a csoport nem kártya
      && egyezmenyek.every((x) => x?.tipus === 'Egyezmeny');
  });

proba('⭐ D85/4: az ELVETETT javaslat javaslat marad — egyezmény csak elfogadásból lesz', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna, { szavazat: 'Ellenez' });

  const k = (await pakliOldal(tar, KOINO, { most: kezdet + 30 * 24 * 3600 * 1000 }))
    .kartyak.find((x) => x.azonosito === javaslat.azonosito);
  return k?.tipus === 'Javaslat' && k.javaslat.statusz === 'elvetve';
});

// ⭐ A prototípus „tárhely”-szabálya (`egyezmenyTarhelyId`): törlésnél az egyezmény a törölt entitás
// SZÜLŐJE alá kerül. Az a) változatban ez magától így alakul: a törölt gondolat gyerekei — köztük az
// egyezmény — a nagyszülőhöz kerülnek fel (`szerkezetIgazitasa`, 2026-09-07).
proba('⭐⭐ D85/4: a TÖRLÉSI egyezmény a törölt gondolat szülője alá kerül (a tárhely-szabály)',
  async () => {
    const { tar, anna } = await ujKoino();
    const kezdet = Date.UTC(2026, 0, 1);
    const szulo = await anna.tesz('GondolatLetrehozas', { tipus: 'Gondolat', cim: 'SZÜLŐ', meret: 10 }, kezdet);
    await esemenyMentese(tar, szulo);
    await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
      { entitas: szulo.azonosito, pont: 300 }, kezdet));
    const g = await anna.tesz('GondolatLetrehozas',
      { tipus: 'Gondolat', cim: 'TÖRLENDŐ', szulo: szulo.azonosito, meret: 10 }, kezdet + 100);
    await esemenyMentese(tar, g);
    await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 300 }, kezdet + 100));
    const j = await anna.tesz('Javaslat',
      { fajta: 'szerkesztesi', erintett: g.azonosito, muvelet: 'Torles', indoklas: 'Felesleges.' },
      kezdet + 1000);
    await esemenyMentese(tar, j);
    await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
      { entitas: j.azonosito, pont: 100 }, kezdet + 1500));
    await esemenyMentese(tar, await anna.tesz('Szavazat',
      { javaslat: j.azonosito, szavazat: 'Tamogat' }, kezdet + 2000));

    const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 30 * 24 * 3600 * 1000 });
    const k = oldal.kartyak.find((x) => x.azonosito === j.azonosito);
    return !oldal.kartyak.some((x) => x.azonosito === g.azonosito)   // a gondolat törlődött
      && k?.tipus === 'Egyezmeny'
      && k.szulo === szulo.azonosito;                                 // ⭐ a nagyszülőhöz került fel
  });

// ⚠️⚠️ EZ A PRÓBA MEGFORDULT, ÉS A MODELL FORDÍTOTTA MEG.
//
// Amíg a javaslat nem volt entitás, az érintettjével EGYÜTT tűnt el (a rendezési értékét is
// tőle kölcsönözte). Mióta **saját tudatpontja van**, a **D14 rá is külön vonatkozik**: attól
// létezik, hogy valaki áll mögötte — nem attól, hogy a tárgya még megvan.
//
// ⭐ És ez következetes: a `szulo`-ja egy elfelejtett entitásra mutat, tehát a fa-bejárások
// (ágazati pont, hierarchikus út) átugorják — gyökér-szintű kártya lesz belőle. Az
// egyezmény-végrehajtás pedig már eddig is tudta kezelni: *„az érintett entitás nem
// létezik"* — kihagyva, indoklással (D19).
proba('⭐⭐ A javaslat TÚLÉLI az érintettje elfelejtését — mert SAJÁT tudatpontja van (D14)',
  async () => {
    const { tar, anna } = await ujKoino();
    const { gondolat: g, javaslat, kezdet } = await javaslatosEset(tar, anna);

    // A gazda elveszi a tudatpontját a GONDOLATRÓL → az az entitás megszűnik létezni.
    await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
      { entitas: g.azonosito, pont: 0 }, kezdet + 3000));

    const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 4000 });
    const k = oldal.kartyak.find((x) => x.azonosito === javaslat.azonosito);

    return oldal.osszes === 1                 // a gondolat eltűnt, a javaslat maradt
      && k !== undefined
      && k.osszesPont === 100
      && k.javaslat.erintettCim === null;      // az érintettje már nem oldható fel
  });

proba('⭐ …DE ha a javaslatról is elveszik a pontot, ő is elfelejtődik', async () => {
  const { tar, anna } = await ujKoino();
  const { javaslat, kezdet } = await javaslatosEset(tar, anna);

  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes',
    { entitas: javaslat.azonosito, pont: 0 }, kezdet + 3000));

  const oldal = await pakliOldal(tar, KOINO, { most: kezdet + 4000 });
  return !oldal.kartyak.some((k) => k.azonosito === javaslat.azonosito);
});

// ===================================
// 11. A GYORSÍTÓTÁR
// ===================================

proba('⭐ Egy lapozás alatt EGYSZER számol állapotot, nem oldalanként', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 12; i++) await gondolat(tar, anna, 'Gondolat ' + i, 100 + i);

  const { nezet, oldalak } = await vegiglapoz(tar, { darab: 3 });
  return oldalak === 4 && nezet.szamitasok === 1;
});

// ===================================
// 12. ⭐⭐ A KÁRTYA-VÉGPONTOK A LAP HORGONYÁT KAPJÁK (2026-09-12)
// ===================================
//
// Mit bizonyít ez a szakasz? Hogy a kártya UGYANABBÓL A KÉPBŐL felel, amiből a lista
// készült — se nem mást mond, mint a lista, se nem számoltatja újra a koinót minden
// kattintásra.
//
// ⛔⛔ ÉS MIÉRT NEM VAK. Mindkét ágat mérjük: horgonnyal **nem** látja a közben érkezett
// eseményt, horgony nélkül **látja**. Ha valaki visszaállítaná a régi viselkedést (a
// `lapKepe` mindig a mostani eseményszámmal számolna), az első próba azonnal bukna; ha
// pedig a tartalék-ágat rontaná el valaki, a második bukna. *Egy zöld próba önmagában nem
// bizonyíték — ezért van itt a tükörpárja is.*

/**
 * Egy lap, és a horgonya.
 *
 * ⚠️⚠️ A `pillanat` NEM kényelem, hanem a próba éle. Ha a lapot `Date.now()`-val kérnénk,
 * a próba **vak lenne**: egy szoros ciklusban minden hívás ugyanabba az ezredmásodpercbe
 * esik, tehát a gyorsítótár akkor is találna, ha a program eldobná a lap `most`-ját.
 * *Pontosan ez rejtette el a hibát 2026-09-12-ig.* Egy rögzített, távoli pillanattal a
 * két eset szétválik: a lap `most`-ja és a `Date.now()` biztosan különbözik.
 */
async function lapEsHorgony(tar, pillanat = Date.now() + 3600_000) {
  const nezet = ujPakliNezet();
  const oldal = await pakliOldal(tar, KOINO, { darab: 10, most: pillanat, nezet });
  return { nezet, horgony: oldal.horgony, most: oldal.most };
}

proba('⭐⭐ A kártya NEM lépi át a lap horgonyát: a közben érkezettet nem mutatja', async () => {
  const { tar, anna } = await ujKoino();
  const az = await gondolat(tar, anna, 'A gondolat', 5);

  const { nezet, horgony, most } = await lapEsHorgony(tar);

  // Közben érkezik egy esemény — csere, vagy a másik készülékem.
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: az, pont: 9 }));

  const kartya = await entitasTudatpontja(tar, KOINO, az,
    { szerzo: anna.szerzo, horgony, most, nezet });

  // A lap képében még 5 volt — a kártyának is 5-öt kell mondania.
  return kartya.data.eemberHozzajarulas === 5;
});

proba('⭐ …HORGONY NÉLKÜL viszont a mostani állapot a válasz (a tartalék-ág)', async () => {
  const { tar, anna } = await ujKoino();
  const az = await gondolat(tar, anna, 'A gondolat', 5);

  const { nezet } = await lapEsHorgony(tar);
  await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: az, pont: 9 }));

  // ⚠️ Ez a parancssor és a többi kliens útja: aki nem lapozásból kérdez, a MAI állapotot
  // kapja. Ettől értelmes a horgonyos ág is — a kettő tényleg különbözik.
  const kartya = await entitasTudatpontja(tar, KOINO, az, { szerzo: anna.szerzo, nezet });

  return kartya.data.eemberHozzajarulas === 9;
});

proba('⭐⭐ A lap horgonyával a kártya-kérések INGYEN vannak (nincs újraszámolás)', async () => {
  const { tar, anna } = await ujKoino();
  const azonositok = [];
  for (let i = 0; i < 6; i++) azonositok.push(await gondolat(tar, anna, 'G' + i, 100 + i));

  const { nezet, horgony, most } = await lapEsHorgony(tar);
  const oldalUtan = nezet.szamitasok;          // = 1

  // Négy kártya-végpont, hat kártyára: 24 kérés.
  for (const az of azonositok) {
    const k = { szerzo: anna.szerzo, horgony, most, nezet };
    await entitasSzovege(tar, KOINO, az, k);
    await entitasTudatpontja(tar, KOINO, az, k);
    await entitasReszletei(tar, KOINO, az, k);
    await entitasKuszobei(tar, KOINO, az, k);
  }

  // ⛔ A LÉNYEG: egyetlen további állapot-számítás sem. A `most` a horgonyból jön, nem
  // friss `Date.now()`-ból — ezért talál a gyorsítótár.
  return oldalUtan === 1 && nezet.szamitasok === 1;
});

proba('⭐ A hibás horgony nem dönti el a kérést — a mostani állapot a mérvadó', async () => {
  const { tar, anna } = await ujKoino();
  const az = await gondolat(tar, anna, 'A gondolat', 5);
  const { nezet, most } = await lapEsHorgony(tar);

  // ⚠️ Nagyobb horgony, mint amennyi eseményünk van (pl. másik adat-mappából jött kurzor),
  // és egy negatív. Egyik sem ejtheti el a kérést.
  const tul = await entitasTudatpontja(tar, KOINO, az,
    { szerzo: anna.szerzo, horgony: 999999, most, nezet });
  const negativ = await entitasTudatpontja(tar, KOINO, az,
    { szerzo: anna.szerzo, horgony: -5, most, nezet });

  // A negatív horgony = üres bemenet → az entitás ott még nem létezik (D14), tehát null.
  return tul?.data.eemberHozzajarulas === 5 && negativ === null;
});

// ===================================
// 13. ⭐ A KÜSZÖB-FORDÍTÁS MINDKÉT IRÁNYA (5.7)
// ===================================
//
// ⛔ MIÉRT MÉRJÜK? Mert a két irány EGY táblázatból származik, és ez szándékos: két
// egymás mellé írt fordítás előbb-utóbb szétcsúszik, és abból **néma** hiba lesz — egy
// küszöb az ellenkezőjére állna. *(Ugyanaz a tanulság, mint az `ALLASOK` kettős
// definíciójánál.)*

proba('⭐ A küszöb-fordítás ODA-VISSZA ugyanazt adja (egy táblázatból, nem kettőből)', async () => {
  const belso = {
    elfogadasiKuszob: 51, reszveteliKuszob: 20,
    minimumDontesiIdo: 86400, maximumDontesiIdo: 604800
  };

  // A pakli KIFELÉ fordítja (a prototípus nevei), a lap ugyanazt küldi vissza.
  const { tar, anna } = await ujKoino();
  const az = await gondolat(tar, anna, 'Egy gondolat', 100);
  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat',
    { entitas: az, ertekek: belso }));

  const ki = await entitasKuszobei(tar, KOINO, az, { szerzo: anna.szerzo });
  const vissza = kuszobokBefele(ki.eemberJavaslat);

  return vissza !== null
    && vissza.elfogadasiKuszob === 51 && vissza.reszveteliKuszob === 20
    && vissza.minimumDontesiIdo === 86400 && vissza.maximumDontesiIdo === 604800;
});

proba('⛔ HIÁNYOS küszöb-négyes: null, nem féligkész javaslat', async () => {
  // ⚠️ A lap üresen is elküldheti a mezőket. Egy féligkész érték javaslat rosszabb, mint
  // a semmi: beleszámítana a mediánba (D4), és a hiányzó mezők helyére 0 kerülne.
  return kuszobokBefele({ javaslatElfogadasiKuszob: 51 }) === null
    && kuszobokBefele({}) === null
    && kuszobokBefele(null) === null
    // ⛔ És a tört sem megy: a kanonikus alak csak egész számot tűr. (⚠️ D101: a lap NEVEIVEL — korábban a medián
    // neveivel állt itt, és így a hiányzó név miatt bukott, nem a tört miatt.)
    && kuszobokBefele({
      javaslatElfogadasiKuszob: 51.5, reszveteliAranyKuszob: 20,
      minimumDontesiIdo: 1, maximumDontesiIdo: 2
    }) === null
    && kuszobokBefele({
      javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 20,
      minimumDontesiIdo: 1, maximumDontesiIdo: 2
    }) !== null;
});

// ⛔⛔ D101 (2026-10-11, mérve): a prototípusban a küszöbnek KÉT alakja van — a medián az időket `aktualMinimumDontesiIdo`
// néven mondja, egy e-ember javaslata (amit a modálok KÜLDENEK és visszaolvasnak) `minimumDontesiIdo` néven. Egy táblával,
// a medián nevein, a lapról jött küszöb soha nem fordult le. Ez a próba a modálok VALÓDI rakományát fordítja.
proba('⛔⛔ D101: a lap küszöb-rakománya (a modálok `kuszobMezokOsszegyujtese`-je) lefordul — és a saját javaslat ugyanazon a néven jön vissza', async () => {
  const { tar, anna } = await ujKoino();
  const az = await gondolat(tar, anna, 'Küszöb', 10);
  const rakomany = { javaslatElfogadasiKuszob: 60, reszveteliAranyKuszob: 25, minimumDontesiIdo: 7200, maximumDontesiIdo: 172800 };
  const belso = kuszobokBefele(rakomany);
  if (!belso) return false;
  await esemenyMentese(tar, await anna.tesz('ErtekJavaslat', { entitas: az, ertekek: belso }));
  const ki = await entitasKuszobei(tar, KOINO, az, { szerzo: anna.szerzo });
  return belso.elfogadasiKuszob === 60 && belso.reszveteliKuszob === 25
    && belso.minimumDontesiIdo === 7200 && belso.maximumDontesiIdo === 172800
    // a medián a medián nevein (a ReszletekModal és az ErtekJavaslatModal összegzése így olvassa)…
    && ki.aktualisErtekek.javaslatElfogadasiKuszob === 60 && ki.aktualisErtekek.aktualMinimumDontesiIdo === 7200
    // …a saját javaslat a javaslat nevein (a mezők kitöltése így olvassa)
    && ki.eemberJavaslat.minimumDontesiIdo === 7200 && ki.eemberJavaslat.maximumDontesiIdo === 172800
    && ki.eemberJavaslat.reszveteliAranyKuszob === 25;
});

// ===================================
// ⭐ D101 (a maradék modálok, az I. csoport): „X ÁGA ALATT VAN-E?” és A SAJÁT HOZZÁRENDELÉSEIM
// ===================================

proba('⭐ D101: „X ága alatt van-e?” — a felmenő-láncon; maga az ág is alatta; ami nincs a láncon, nem', async () => {
  const f = await kisFa();
  const kep = (await pakliOldal(f.tar, KOINO, { rendezes: 'ido', darab: MAX_DARAB })).kartyak;
  const entitasok = new Map(kep.map((k) => [k.azonosito, { azonosito: k.azonosito, szulo: k.szulo }]));
  const h = (az, ag) => agHelyzete(entitasok, az, ag).alatta;
  return h(f.A11, f.A) === true && h(f.A11, f.A1) === true && h(f.A1, f.A1) === true
    && h(f.A2, f.A1) === false && h(f.B, f.A) === false && h(f.A, f.A11) === false;
});

proba('⭐ D101: ha a lánc egy ismeretlen felmenőnél szakad meg, NEM ELDÖNTHETŐ (D19) — és megnevezi, ki hiányzik', async () => {
  const P = 'P'.repeat(43);
  const entitasok = new Map([
    ['C', { azonosito: 'C', szulo: P }],
    ['K1', { azonosito: 'K1', szulo: 'K2' }], ['K2', { azonosito: 'K2', szulo: 'K1' }]
  ]);
  // egy 70 hosszú lánc: a korláton (64) túl sem dönt
  for (let i = 0; i < 70; i++) entitasok.set('L' + i, { azonosito: 'L' + i, szulo: i ? 'L' + (i - 1) : null });
  const nem = agHelyzete(entitasok, 'C', 'X');
  const kozvetlen = agHelyzete(entitasok, 'C', P);           // a hiányzó szülő MAGA az ág: ez eldönthető
  const ismeretlen = agHelyzete(entitasok, 'Z', 'X');        // maga az entitás sincs meg
  const kor = agHelyzete(entitasok, 'K1', 'X');              // kör a szülő-láncon: nem szül fát
  const mely = agHelyzete(entitasok, 'L69', 'L0');
  return nem.alatta === null && nem.hianyzo === P && kozvetlen.alatta === true
    && ismeretlen.alatta === null && ismeretlen.hianyzo === 'Z' && kor.alatta === false
    && mely.alatta === null && agHelyzete(entitasok, 'L60', 'L0').alatta === true;
});

proba('⭐⭐ D101: a SAJÁT hozzárendeléseim — csak az enyéim, a legutóbb rendezett elöl, a szabad ponttal', async () => {
  const f = await kisFa();
  const bela = await ujTag(KOINO);
  for (const e of tagsagiEsemenyei(bela)) await esemenyMentese(f.tar, e);
  await esemenyMentese(f.tar, await bela.tesz('TudatpontRendezes', { entitas: f.B, pont: 7 }));
  // Anna később átrendezi az A1-et → az kerül előre (a SAJÁT láncának sorszáma szerint, nem az óra szerint)
  await esemenyMentese(f.tar, await f.anna.tesz('TudatpontRendezes', { entitas: f.A1, pont: 31 }, 1));
  const l = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo });
  const b = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: bela.szerzo });
  const a1 = l.data[0];
  return l.data.length === 5 && a1.entitasId === f.A1 && a1.tudatPontok === 31 && a1.entitasCim === 'A1'
    && a1.entitasTipus === 'Gondolat' && l.data[1].entitasId === f.B
    && l.szabad === 10000 - (50 + 31 + 5 + 10 + 20)
    && b.data.length === 1 && b.data[0].entitasId === f.B && b.data[0].tudatPontok === 7 && b.szabad === 10000 - 7;
});

proba('⭐⭐ D101: ág-szűrve csak az ág alattiak; a nem eldönthetőt kihagyja, megszámolja, és a felmenőt kérendőnek mondja', async () => {
  const f = await kisFa();
  // Egy gondolat, aminek a SZÜLŐJE nem jött meg (a szigorú (b) alatt így jön: a szelete igen, a szülőé nem)
  const masik = await ujEember(KOINO);
  const szulo = await masik.tesz('GondolatLetrehozas', { cim: 'P', meret: 10, szulo: f.A });   // NEM mentjük
  const c = await gondolat(f.tar, f.anna, 'C', 3, szulo.azonosito);
  const ag = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo, ag: f.A1 });
  const agA = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo, ag: f.A });
  const agP = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo, ag: szulo.azonosito });
  const azok = (x) => x.data.map((t) => t.entitasId).sort().join(',');
  // ⚠️ Az A1 ága alatt sem dönthető el a C helye: a P-t nem ismerjük — akár az A1 alatt is lehetne.
  return azok(ag) === [f.A1, f.A11].sort().join(',') && ag.nemEldontheto === 1
    && azok(agA) === [f.A, f.A1, f.A2, f.A11].sort().join(',') && agA.nemEldontheto === 1
    && agA.hianyzik.length === 1 && agA.hianyzik[0].fajta === 'szelet' && agA.hianyzik[0].kulcs === szulo.azonosito
    && azok(agP) === c && agP.nemEldontheto === 0;
});

proba('⭐⭐ D101: a lapos rendezés ÁG-SZŰRVE (a Rendezés modál) — csak az ág, a lapozás is az ágon marad, a nem eldönthetőt megszámolja', async () => {
  const f = await kisFa();
  const masik = await ujEember(KOINO);
  const szulo = await masik.tesz('GondolatLetrehozas', { cim: 'P', meret: 10, szulo: f.A });   // NEM mentjük
  await gondolat(f.tar, f.anna, 'C', 3, szulo.azonosito);
  const azok = (l) => l.map((k) => k.azonosito).sort().join(',');
  const a1 = await pakliOldal(f.tar, KOINO, { rendezes: 'ido', agazat: f.A1 });
  const a = await pakliOldal(f.tar, KOINO, { rendezes: 'agazatiPont', agazat: f.A });
  const egesz = await pakliOldal(f.tar, KOINO, { rendezes: 'ido' });
  // lapozás egyesével: a kurzor után is csak az ág jön
  const lapok = [];
  let kurzor = null;
  do {
    const o = await pakliOldal(f.tar, KOINO, { rendezes: 'ido', agazat: f.A, darab: 1, kurzor });
    lapok.push(...o.kartyak);
    kurzor = o.kovetkezoKurzor;
  } while (kurzor && lapok.length < 20);
  return azok(a1.kartyak) === [f.A1, f.A11].sort().join(',') && a1.agazat === f.A1 && a1.osszes === 2
    && azok(a.kartyak) === [f.A, f.A1, f.A2, f.A11].sort().join(',') && a.kartyak[0].azonosito === f.A
    && a.nemEldontheto === 1 && a.hianyzik[0]?.kulcs === szulo.azonosito
    && egesz.agazat === null && egesz.nemEldontheto === 0 && egesz.kartyak.length === 6
    && azok(lapok) === azok(a.kartyak);
});

// ===================================
// ⭐⭐ D102: A BEJÁRÓ — az ágazati pont szerint csökkenő sor biztos előtagja
// ===================================

/** Egy kis, kézzel írt entitás-térkép a bejáróhoz: { az: [szülő, saját pont, ágazati pont] }. */
function terkepe(leiras) {
  const entitasok = new Map();
  const agazati = new Map();
  for (const [az, [szulo, sajat, agaz]] of Object.entries(leiras)) {
    entitasok.set(az, { azonosito: az, szulo, osszesPont: sajat, pontokIsmeretlenek: sajat === null });
    agazati.set(az, agaz);
  }
  const lista = [...agazati.keys()].sort((a, b) => agazati.get(b) - agazati.get(a) || (a < b ? -1 : 1));
  return { entitasok, agazati, lista };
}

proba('⭐⭐ D102: MINDENT tartva az egész sor biztos — semmit nem kér', () => {
  const { entitasok, agazati, lista } = terkepe({ A: [null, 10, 30], A1: ['A', 15, 15], A2: ['A', 5, 5], B: [null, 8, 8] });
  const b = biztosElotag(lista, entitasok, agazati, { tartott: () => true, gyokerTeljes: true });
  return b.biztos === 4 && b.kerendo.length === 0;
});

proba('⭐⭐ D102: a SZIGORÚ (b) alatt a gyökér szintje nem ismert — semmi nem biztos, és a gyökeret (mélyen) kéri', () => {
  const { entitasok, agazati, lista } = terkepe({ A: [null, 10, 30], A1: ['A', 15, 15], A2: ['A', 5, 5] });
  const b = biztosElotag(lista, entitasok, agazati, { tartott: () => true, gyokerTeljes: false });
  return b.biztos === 0 && b.kerendo[0]?.kulcs === '' && b.kerendo[0].m === true;
});

proba('⭐⭐ D102: a gyökér LEVÁGÁSA és a nem tartott csomópont HATÁRA dönti el a biztos előtagot', () => {
  // A (30) nem tartott — a gyerekei közül csak A1 (15) ismert, a saját pontja 10: egy még nem ismert gyereke legfeljebb
  // 30 − 10 − 15 = 5 lehet. A gyökér egy válaszban 6-nál levágva. → A, A1 biztos; B (8) is (8 > 6 és 8 > 5); C (5) nem.
  const { entitasok, agazati, lista } = terkepe({ A: [null, 10, 30], A1: ['A', 15, 15], B: [null, 8, 8], C: [null, 5, 5] });
  const tudas = new Map([[GYOKER_KULCS, { levag: { p: 6, az: 'Z'.repeat(43) } }]]);
  const b = biztosElotag(lista, entitasok, agazati, { tartott: (az) => az !== 'A', tudas });
  const kertA = b.kerendo.find((x) => x.kulcs === 'A');
  const gyoker = b.kerendo.find((x) => x.kulcs === '');
  return b.biztos === 3 && kertA?.m === true && gyoker?.utan?.p === 6;
});

proba('⭐ D102 (J2): ha a fejléc bemondta a gyerekszámot, és ennyit ismerek, a csomópont TELJES — nem blokkol, nem kér', () => {
  // A (30, saját 5): az ismert gyerekei 15 + 5 — egy harmadik gyerek legfeljebb 5 lehetne. Ha a fejléc 2 gyereket mondott,
  // A teljes (a sor végig biztos); ha 3-at, A2 (5) már nem biztos (egy még nem ismert, 5 pontos testvér elé kerülhetne).
  const { entitasok, agazati, lista } = terkepe({ A: [null, 5, 30], A1: ['A', 15, 15], A2: ['A', 5, 5], B: [null, 3, 3] });
  const tudas = new Map([['A', { gy: 2 }], [GYOKER_KULCS, { levag: 'teljes' }]]);
  const b = biztosElotag(lista, entitasok, agazati, { tartott: (az) => az !== 'A', tudas });
  const kevesebb = biztosElotag(lista, entitasok, agazati, { tartott: (az) => az !== 'A',
    tudas: new Map([['A', { gy: 3 }], [GYOKER_KULCS, { levag: 'teljes' }]]) });
  return b.biztos === 4 && !b.kerendo.some((x) => x.kulcs === 'A')
    && kevesebb.kerendo.some((x) => x.kulcs === 'A') && kevesebb.biztos === 2;
});

proba('⭐ D102: ág-szűrve az ág maga a kiindulás; a még nem ismert ágat kéri; az előre kérés korlátos', () => {
  const leiras = { X: [null, 1, 200] };
  for (let i = 0; i < 40; i++) leiras['Y' + String(i).padStart(2, '0')] = ['X', null, 100 - i];
  const { entitasok, agazati, lista } = terkepe(leiras);
  const ag = lista.filter((az) => az !== 'X' || true);
  const b = biztosElotag(ag, entitasok, agazati, { tartott: () => false, agazat: 'X',
    tudas: new Map([['X', { gy: 40 }]]) });
  const ismeretlen = biztosElotag([], entitasok, agazati, { tartott: () => false, agazat: 'Q'.repeat(43) });
  // X teljes (40 gyerek, mind ismert), a gyerekei nem tartottak és nem teljesek: az első blokkol, a többit előre kéri
  return b.biztos === 2 && b.kerendo.length === ELORE_KERES && b.kerendo[0].kulcs === 'Y00'
    && ismeretlen.biztos === 0 && ismeretlen.kerendo[0]?.kulcs === 'Q'.repeat(43);
});

// ⭐ 2026-10-23 (Csaba lelete: a telefon egy nyitva hagyott listával az egész koinót lehúzta, „felderítés nélkül”): a bejáró
// csak a SZÜKSÉGES helyekig kér — amit a nézet mutat. Egy hely biztosságát csak az előtte álló nem teljes csomópontok rontják,
// tehát a szükséges helyeken túl nincs mit kérni. Rontás: a korlát kimarad → mindkét próba bukik.
proba('⭐ a bejáró csak a SZÜKSÉGES helyekig kér (amit a nézet mutat) — az oldal végén túl nem', () => {
  const leiras = { X: [null, 1, 200] };
  for (let i = 0; i < 40; i++) leiras['Y' + String(i).padStart(2, '0')] = ['X', null, 100 - i];
  const { entitasok, agazati, lista } = terkepe(leiras);
  const b = { tartott: () => false, agazat: 'X', tudas: new Map([['X', { gy: 40 }]]) };
  const harom = biztosElotag(lista, entitasok, agazati, { ...b, szukseges: 3 });
  const mind = biztosElotag(lista, entitasok, agazati, b);
  // az első három hely: X (teljes), Y00 (blokkol), Y01 (előre) — a többiért nem kér
  return harom.kerendo.map((x) => x.kulcs).join() === 'Y00,Y01' && harom.biztos === mind.biztos
    && mind.kerendo.length === ELORE_KERES;
});

// ⭐ (Csaba, 2026-10-23: „(B) Az első 200-at”) — a Struktúra magától csak az első `STRUKTURA_KERES` (200) helyig kér, a
// felderítés a saját K-jáig. A-t tartom, 210 gyereke csak születéssel és bemondással ismert; az első 205-ről a tartó azt
// mondta, nincs gyereke (teljes), a többiről semmit. A sor A-val kezdődik, tehát a nem teljesek a 207. helytől állnak.
// Rontás: a Struktúra a keretéig kér → a 206. utáni gyerekeket is kéri → bukik.
proba('⭐ a Struktúra magától csak az első 200 helyig kér — a felderítés a saját K-jáig', async () => {
  const { tar, anna } = await ujKoino();
  const A = await gondolat(tar, anna, 'A', 50);
  const masik = await ujEember(KOINO);
  const gyerekek = [];
  for (let i = 0; i < 210; i++) {
    const e = await masik.tesz('GondolatLetrehozas', { cim: 'gy' + i, meret: 10, szulo: A });
    await esemenyMentese(tar, e);
    gyerekek.push(e.azonosito);
  }
  const nezet = () => ujPakliNezet({ tartott: async () => new Set([A]) });
  const bemondasok = new Map(gyerekek.map((az, i) => [az, { osszPont: 1000 - i }]));
  const fejlecTudas = new Map(gyerekek.slice(0, 205).map((az) => [az, { gy: 0 }]));
  const b = { bemondasok, fejlecTudas };
  const struktura = await strukturaDarabszam(tar, KOINO, { ...b, nezet: nezet() });
  const felderites = await felderitesAllasa(tar, KOINO, { ...b, nezet: nezet(), agazat: A, keret: 300 });
  const kesoi = (h) => h.hianyzik.filter((x) => gyerekek.slice(205).includes(x.kulcs)).length;
  return STRUKTURA_KERES === 200 && struktura.kerHatar === 200 && kesoi(struktura) === 0 && kesoi(felderites) > 0;
});

proba('⭐ a lapos lista (ágazati pont szerint) csak az OLDAL végéig kér — a többi még nem ismert ágért nem', async () => {
  const { tar, anna } = await ujKoino();
  const A = await gondolat(tar, anna, 'A', 50);
  const masik = await ujEember(KOINO);
  const gyerekek = [];
  for (let i = 0; i < 6; i++) {
    const e = await masik.tesz('GondolatLetrehozas', { cim: 'gy' + i, meret: 10, szulo: A });
    await esemenyMentese(tar, e);
    gyerekek.push(e.azonosito);
  }
  // A-t tartom; a gyerekeit nem (csak a születésük és a bemondott össz-pontjuk ismert) — mind blokkol, amíg nem kérjük
  const nezet = ujPakliNezet({ tartott: async () => new Set([A]) });
  const bemondasok = new Map(gyerekek.map((az, i) => [az, { osszPont: 40 - i * 5 }]));
  const oldal = await pakliOldal(tar, KOINO, { rendezes: 'agazatiPont', irany: 'csokkeno', darab: 2, nezet, bemondasok });
  const kertGyerekek = oldal.hianyzik.filter((h) => gyerekek.includes(h.kulcs)).map((h) => h.kulcs);
  // az oldal két helye: A és a legerősebb gyerek — csak ő kérendő (a többi öt nem)
  return oldal.kartyak.length === 2 && kertGyerekek.join() === gyerekek[0];
});

// ===================================
// ⭐⭐ D101 ③: A STRUKTÚRA — a fa a legerősebb ágaktól kifelé, egy keretig
// ===================================

proba('⭐⭐ D101 ③: a Struktúra sorai a bejáró sorrendjében — a szülő mindig a gyereke előtt, és a lapozás a horgonnyal hiánytalan', async () => {
  const f = await kisFa();
  const d = await strukturaDarabszam(f.tar, KOINO, {});
  const egyben = await strukturaLap(f.tar, KOINO, {});
  const lapok = [];
  let kurzor;
  do {
    const l = await strukturaLap(f.tar, KOINO, { lapMeret: 2, kurzor });
    lapok.push(...l.sorok);
    kurzor = l.kovetkezoKurzor ?? undefined;
  } while (kurzor && lapok.length < 20);
  const azok = (l) => l.map((x) => x.entitasId);
  const helye = new Map(azok(egyben.sorok).map((az, i) => [az, i]));
  const szuloElotte = egyben.sorok.every((x) => !x.szuloId || helye.get(x.szuloId) < helye.get(x.entitasId));
  const csokken = egyben.sorok.every((x, i) => i === 0 || egyben.sorok[i - 1].hierarchikusOsszesPont >= x.hierarchikusOsszesPont);
  const a1 = egyben.sorok.find((x) => x.entitasId === f.A1);
  return d.osszesDarab === 5 && d.agDarab === null && d.ismert === 5 && d.keret === STRUKTURA_KERET
    && egyben.sorok.length === 5 && egyben.kovetkezoKurzor === null && szuloElotte && csokken
    && azok(lapok).join() === azok(egyben.sorok).join()
    && a1.szuloId === f.A && a1.entitasTipus === 'Gondolat' && a1.hierarchikusOsszesPont === 40
    && Array.isArray(a1.kategoriaIkonok) && a1.tipusIkon === null && a1.javaslatTipus === null;
});

proba('⭐ D101 ③: ág-szűrve az ág részfája (agDarab), és a keret a legerősebbeket hagyja — a többit kimondja (`ismert`)', async () => {
  const f = await kisFa();
  const ag = await strukturaDarabszam(f.tar, KOINO, { agazat: f.A1 });
  const agLap = await strukturaLap(f.tar, KOINO, { agazat: f.A1 });
  const keretes = await strukturaDarabszam(f.tar, KOINO, { keret: 3 });
  const keretesLap = await strukturaLap(f.tar, KOINO, { keret: 3 });
  return ag.agDarab === 2 && agLap.sorok.map((x) => x.entitasId).join() === [f.A1, f.A11].join()
    && keretes.ismert === 5 && keretes.latszik === 3 && keretesLap.sorok.length === 3
    && keretesLap.sorok[0].entitasId === f.A;
});

// ⭐ D112 ③ (F1): a felderítés állása — a Struktúra sorrendje az ágban, a kerettel és a MÉLYSÉG-korláttal. Rontás: a
// mélység-korlát nincs nézve → az unoka is látszik → bukik.
proba('⭐ D112 ③: a felderítés állása — a legjobb K az ágban, legfeljebb d szint mélyen (az ágban és a gyökértől is)', async () => {
  const f = await kisFa();
  const ag = await felderitesAllasa(f.tar, KOINO, { agazat: f.A, keret: 10 });
  const sekely = await felderitesAllasa(f.tar, KOINO, { agazat: f.A, keret: 10, maxMelyseg: 1 });
  const gyokerbol = await felderitesAllasa(f.tar, KOINO, { keret: 10, maxMelyseg: 0 });
  const keretes = await felderitesAllasa(f.tar, KOINO, { agazat: f.A, keret: 2 });
  return ag.latszik.length === 4 && ag.latszik.includes(f.A11) && ag.agIsmert
    && sekely.latszik.length === 3 && !sekely.latszik.includes(f.A11) && sekely.latszik[0] === f.A
    && gyokerbol.latszik.sort().join() === [f.A, f.B].sort().join()
    && keretes.latszik.join() === [f.A, f.A1].join() && keretes.ismert === 4;
});

// ⭐ D112 (a böngészős próba lelete): az egész koinó felderítésénél a tartó TELJES gyökér-válasza elég — a gyökér nem marad
// kérendő (különben a felderítés soha nem lenne kész). Rontás: a gyökér-szűrés kimarad → a gyökér kérendő marad → bukik.
proba('⭐ D112: az egész koinó felderítése — a tartó teljes gyökér-válasza után a gyökér nem marad kérendő', async () => {
  const f = await kisFa();
  const nezet = ujPakliNezet({ tartott: async () => new Set() });
  const gy = new Map([[f.A, { gy: 2 }], [f.A1, { gy: 1 }], [f.A2, { gy: 0 }], [f.A11, { gy: 0 }], [f.B, { gy: 0 }]]);
  const teljes = await felderitesAllasa(f.tar, KOINO, { keret: 10, nezet,
    fejlecTudas: new Map([...gy, [GYOKER_KULCS, { levag: 'teljes' }]]) });
  const reszben = await felderitesAllasa(f.tar, KOINO, { keret: 10, nezet: ujPakliNezet({ tartott: async () => new Set() }),
    fejlecTudas: gy });
  return teljes.latszik.length === 5 && teljes.biztos === 5 && teljes.hianyzik.length === 0
    && reszben.hianyzik.some((h) => h.kulcs === '');
});

proba('⭐ D101 ③: a program sorait a prototípus fa-elrendezője (`faElrendezes.js`) hiánytalanul elhelyezi — ágban is', async () => {
  const { default: FaElrendezes } = await import('../felulet/js/utils/faElrendezes.js');
  const f = await kisFa();
  const helyez = (sorok, ag = null) => {
    const e = new FaElrendezes(sorok, ag);
    for (const _ of e.elhelyezesLepesekben(1000)) { /* végig */ }
    return e.csomopontok.length;
  };
  const egesz = (await strukturaLap(f.tar, KOINO, {})).sorok;
  const ag = (await strukturaLap(f.tar, KOINO, { agazat: f.A1 })).sorok;
  return helyez(egesz) === 5 && helyez(ag, f.A1) === 2;
});

// ===================================
// ⭐⭐ D101 ④: A SÍKIDOM — egy szülő gyerekei egy küszöb fölött, és az ős-lánc
// ===================================

proba('⭐⭐ D101 ④: a Síkidom gyerekei pont szerint, a küszöb fölött, kurzorral hiánytalanul — és az ős-lánc', async () => {
  const f = await kisFa();
  // az ágazati pontok: A = 50 + 30 + 10 + 5 = 95 · A1 = 40 · A11 = 10 · A2 = 5 · B = 20
  const gyoker = await sikidomGyerekek(f.tar, KOINO, {});
  const a = await sikidomGyerekek(f.tar, KOINO, { szulo: f.A });
  const kuszob = await sikidomGyerekek(f.tar, KOINO, { szulo: f.A, minPont: 10 });
  const elso = await sikidomGyerekek(f.tar, KOINO, { szulo: f.A, darab: 1 });
  const masodik = await sikidomGyerekek(f.tar, KOINO, { szulo: f.A, darab: 1, kurzor: elso.kurzor, osszesKell: false });
  const lanc = await sikidomOslanc(f.tar, KOINO, { entitas: f.A11 });
  const azok = (r) => r.gyerekek.map((x) => x.entitasId).join();
  const a1 = a.gyerekek[0];
  const ki = {
    gyoker: azok(gyoker) === [f.A, f.B].join() && gyoker.osszesGyerekPont === 115 && gyoker.teljes && !gyoker.vanTovabb
      && gyoker.hianyzik.length === 0 && gyoker.gyerekek[0].vanGyereke === true && gyoker.gyerekek[1].vanGyereke === false,
    sor: a1.entitasId === f.A1 && a1.entitasTipus === 'Gondolat' && a1.cim === 'A1' && a1.hierarchikusOsszesPont === 40
      && !('szuloId' in a1) && 'letrehozva' in a1 && Array.isArray(a1.kategoriaIkonok),
    a: azok(a) === [f.A1, f.A2].join() && a.osszesGyerekPont === 45,
    kuszob: azok(kuszob) === f.A1 && kuszob.vanTovabb === false,
    kurzor: azok(elso) === f.A1 && elso.vanTovabb === true && elso.kurzor?.pont === 40 && elso.kurzor?.id === f.A1
      && azok(masodik) === f.A2 && masodik.vanTovabb === false && masodik.osszesGyerekPont === null,
    lanc: lanc.oslanc.map((x) => x.entitasId).join() === [f.A11, f.A1, f.A].join() && lanc.teljesLanc === true
      && lanc.legerosebbGyokerPont === 95 && lanc.hianyzik.length === 0 && lanc.oslanc[1].vanGyereke === true,
    korlat: SIKIDOM_DARAB === 300
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (síkidom — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⭐⭐ D101 ④: a szigorú (b) alatt — a nem tartott síkidom gyerekeit elkéri (mélyen), a helyüket az össz-pontból foglalja, és a hiányzó felmenőt is', async () => {
  const { tar, anna } = await ujKoino();
  // A-t tartom; a gyerekeinek és B-nek CSAK A SZÜLETÉSE van meg (a szigorú (b) alatt így jön el)
  const A = await gondolat(tar, anna, 'A', 50);
  const masik = await ujEember(KOINO);
  const szuletes = async (cim, szulo = null) => {
    const e = await masik.tesz('GondolatLetrehozas', { cim, meret: 10, szulo });
    await esemenyMentese(tar, e);
    return e.azonosito;
  };
  const A1 = await szuletes('A1', A), A2 = await szuletes('A2', A), B = await szuletes('B');
  const arva = await gondolat(tar, anna, 'árva', 10, 'Z'.repeat(43));
  const nezet = ujPakliNezet({ tartott: async () => new Set([A, arva]) });
  const bemondasok = new Map([[A1, { osszPont: 77, ellenorzott: true }], [A2, { osszPont: 9, ellenorzott: false }]]);
  const gyoker = await sikidomGyerekek(tar, KOINO, { nezet, bemondasok });
  const a = await sikidomGyerekek(tar, KOINO, { szulo: A, nezet, bemondasok });
  const a1 = await sikidomGyerekek(tar, KOINO, { szulo: A1, nezet, bemondasok });
  // ⭐ ha a tartó azt mondta, hogy A1-nek nincs gyereke (gy = 0), A1 teljes: levél, nem kér
  const tudas = new Map([[A1, { gy: 0 }]]);
  const a1Level = await sikidomGyerekek(tar, KOINO, { szulo: A1, nezet, bemondasok, fejlecTudas: tudas });
  const aTudva = await sikidomGyerekek(tar, KOINO, { szulo: A, nezet, bemondasok, fejlecTudas: tudas });
  const lanc = await sikidomOslanc(tar, KOINO, { entitas: arva, nezet, bemondasok });
  const sora = (r, az) => r.gyerekek.find((x) => x.entitasId === az);
  const ki = {
    // a gyökér szintje a szigorú (b) alatt soha nem teljes — kéri (a lap ''-ként)
    gyoker: !gyoker.teljes && gyoker.hianyzik.some((x) => x.fajta === 'fejlecek' && x.kulcs === '' && x.m === true),
    // A-t tartom: a gyerekeit mind ismerem, nem kér; a nem tartott gyerekeknek a bemondásból van gyereke
    a: a.teljes && a.hianyzik.length === 0 && sora(a, A1)?.vanGyereke === true && sora(a, A2)?.vanGyereke === true
      && a.gyerekek[0].entitasId === A1,
    // A1-et nem tartom: a gyerekeit nem ismerem — mélyen kéri, és a helyük az össz-pontból: 77 − 1 (a saját ≥ 1)
    a1: !a1.teljes && a1.gyerekek.length === 0 && a1.osszesGyerekPont === 76
      && a1.hianyzik.some((x) => x.fajta === 'fejlecek' && x.kulcs === A1 && x.m === true),
    level: a1Level.teljes && a1Level.hianyzik.length === 0 && a1Level.osszesGyerekPont === 0
      && sora(aTudva, A1)?.vanGyereke === false,
    // a hiányzó felmenő: a lánc ott véget ér, kimondja, és elkéri
    lanc: lanc.oslanc.length === 1 && lanc.oslanc[0].entitasId === arva && lanc.teljesLanc === false
      && lanc.hianyzik.some((x) => x.fajta === 'szelet' && x.kulcs === 'Z'.repeat(43)) && lanc.legerosebbGyokerPont >= 10
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (síkidom (b) — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ')
    + ' ' + JSON.stringify({ g: gyoker.hianyzik, a: a.hianyzik, a1: [a1.osszesGyerekPont, a1.hianyzik], l: [a1Level.teljes, a1Level.osszesGyerekPont] }) + ')');
  return Object.values(ki).every(Boolean);
});

// ⛔ D101 ④: A LAP MODUL-FÁJA. Az örökölt kártyák körbe importálnak (Kartya → SikidomModal → SikidomKartyaPanel →
// kartyaGyar → GondolatKartya → Kartya); ha a fát a `Kartya.js` felől érjük el először, a leszármazott a még nem kész
// szülőből öröklődne, és a lap semmit nem töltene be („Cannot access 'Kartya' before initialization” — a böngésző mérte). A
// próba az ES-modulok kiértékelési sorrendjét járja be (mélységi, utólagos — ahogy a böngésző) az `index.html` belépőitől, és
// megnézi, hogy minden `extends` szülője előbb kész-e. Rontás: a kártya-gyár sora nélkül bukik.
proba('⛔ D101 ④: a lap modul-fája — egy kártya-osztály sem értékelődik ki a szülője előtt (az örökölt importkör)', async () => {
  const felulet = resolve(dirname(fileURLToPath(import.meta.url)), '../felulet');
  const html = await readFile(join(felulet, 'index.html'), 'utf8');
  const szkript = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] ?? '';
  const importok = (s) => [...s.matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?['"](\.[^'"]+)['"]/gm)].map((m) => m[1]);
  const belepok = importok(szkript).map((x) => resolve(felulet, x));
  const allapot = new Map();
  const kesz = new Set();
  const hibak = [];
  const bejar = async (f) => {
    if (allapot.has(f)) return;
    allapot.set(f, 'fut');
    const s = await readFile(f, 'utf8');
    for (const x of importok(s)) await bejar(resolve(dirname(f), x));
    kesz.add(f);
    const ext = s.match(/class\s+\w+\s+extends\s+(\w+)/);
    const imp = ext && [...s.matchAll(/^\s*import\s+(\w+)[^'"]*from\s+['"](\.[^'"]+)['"]/gm)].find((m) => m[1] === ext[1]);
    if (imp && !kesz.has(resolve(dirname(f), imp[2]))) hibak.push(basename(f));
  };
  for (const b of belepok) await bejar(b);
  if (hibak.length) console.log('    (a szülője előtt: ' + hibak.join(', ') + ')');
  return belepok.length >= 5 && kesz.size > 50 && hibak.length === 0;
});

// ===================================
// ⭐⭐ D101 ⑤: A KERESÉS — a helyi alja (M4)
// ===================================

proba('⭐⭐ D101 ⑤: a helyi keresés — típusonként a legerősebb elöl, a típus-szűrő, és ág-szűrve csak az ág (a hiányzó felmenőt elkéri)', async () => {
  const f = await kisFa();
  // az ágazati pontok: A = 95 · A1 = 40 · A11 = 10 · A2 = 5 · B = 20 — a cím mind egy betű + szám
  const mind = await keresesHelyben(f.tar, KOINO, { q: 'a' });
  const nagy = await keresesHelyben(f.tar, KOINO, { q: 'A1' });
  const ag = await keresesHelyben(f.tar, KOINO, { q: 'a', agazat: f.A1 });
  const kategoria = await keresesHelyben(f.tar, KOINO, { q: 'a', tipusok: ['Kategoria'] });
  const ures = await keresesHelyben(f.tar, KOINO, { q: '   ' });
  const arva = await gondolat(f.tar, f.anna, 'árva A', 10, 'Z'.repeat(43));
  const agArva = await keresesHelyben(f.tar, KOINO, { q: 'a', agazat: f.A1 });
  const azok = (r) => r.talalatok.map((t) => t.entitasId).join();
  const ki = {
    // mind a négy „A” című gondolat, a legerősebb elöl (B címében nincs „a”); kisbetűs kérdés, nagybetűs cím
    sorrend: azok(mind) === [f.A, f.A1, f.A11, f.A2].join() && mind.talalatok.every((t) => t.entitasTipus === 'Gondolat'),
    resz: azok(nagy) === [f.A1, f.A11].join(),
    ag: azok(ag) === [f.A1, f.A11].join() && ag.nemEldontheto === 0,
    tipus: kategoria.talalatok.length === 0,
    ures: ures.talalatok.length === 0,
    // az árva felmenője nincs meg: nem dönthető el, hogy az ágban van-e — kimondja és elkéri
    arva: agArva.nemEldontheto === 1 && !azok(agArva).includes(arva)
      && agArva.hianyzik.some((h) => h.fajta === 'szelet' && h.kulcs === 'Z'.repeat(43)) && agArva.ismert === 6
  };
  if (!Object.values(ki).every(Boolean)) console.log('    (keresés — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return Object.values(ki).every(Boolean);
});

proba('⭐ D101 ⑤: a keresés típusonként korlátos — alapból 10, legfeljebb 50 (a prototípusé)', async () => {
  const { tar, anna } = await ujKoino();
  for (let i = 0; i < 55; i++) await gondolat(tar, anna, 'sok ' + i, 1 + (i % 7));
  const alap = await keresesHelyben(tar, KOINO, { q: 'sok' });
  const husz = await keresesHelyben(tar, KOINO, { q: 'sok', limit: 20 });
  const sok = await keresesHelyben(tar, KOINO, { q: 'sok', limit: 1000 });
  return KERESES_ALAP === 10 && KERESES_MAX === 50 && alap.talalatok.length === 10 && husz.talalatok.length === 20
    && sok.talalatok.length === 50;
});

proba('⭐ D101: a lista felülről korlátos (a prototípus 100-a), és megmondja, hány van összesen', async () => {
  const f = await kisFa();
  const ketto = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo, limit: 2 });
  const sok = await sajatHozzarendelesek(f.tar, KOINO, { szerzo: f.anna.szerzo, limit: 1e9 });
  const senki = await sajatHozzarendelesek(f.tar, KOINO, {});
  return ketto.data.length === 2 && ketto.count === 2 && ketto.osszes === 5
    && sok.data.length === 5 && HOZZARENDELES_KORLAT === 100 && senki.data.length === 0;
});

// ===================================
// ⭐ AZ ALSÓ SÁV SZÁMAI (2026-10-15) — a készüléken ismert rész, a lap képéből
// ===================================
//
// A prototípus alsó sávja a platform számait mutatta; itt a lap képének számai állnak (9. szabály): a kártyák típusonként
// (az elfogadott javaslat EGYEZMÉNY — ugyanaz a típus, amit a kártya mutat, D85/4), és az e-emberek, akiknek eseménye a
// bemenetben van. ⭐ A lap horgonyával ugyanaz a kép, mint a paklié: a horgony utáni események nem számítanak bele.
// Rontás: a kártya-típus helyett az entitás típusa → az egyezmény javaslatnak számít; a horgony kihagyva → a késői
// események is beleszámítanak.
proba('⭐ Az alsó sáv: a készüléken ismert rész számai típusonként (az elfogadott javaslat egyezmény), a lap horgonyával', async () => {
  const { tar, anna } = await ujKoino();
  await gondolat(tar, anna, 'A', 5);
  const horgony = (await tar.betolt()).length;
  const bela = await ujTag(KOINO);
  for (const e of tagsagiEsemenyei(bela)) await esemenyMentese(tar, e);
  await gondolat(tar, bela, 'B', 3);
  await besorolas(tar, anna, 'Kategoria', 'Természet', '🌲');
  await besorolas(tar, anna, 'GondolatTipus', 'Kérdés', '❓');
  await javaslatosEset(tar, anna);                                  // 2026-01-01-i: mára elfogadva → egyezmény
  await javaslatosEset(tar, bela, { kezdet: Date.now() - 1000 });   // most indult: folyamatban → javaslat
  const st = await helyiStatisztika(tar, KOINO, {});
  const regi = await helyiStatisztika(tar, KOINO, { horgony });
  const ki = {
    eemberek: st.eemberekSzama === 3,                               // az alapító, anna, béla
    gondolatok: st.gondolatokSzama === 4,                           // A, B és a két javaslat gondolata
    besorolasok: st.kategoriakSzama === 1 && st.gondolatTipusokSzama === 1,
    dontesek: st.javaslatokSzama === 1 && st.egyezmenyekSzama === 1,
    horgony: regi.eemberekSzama === 2 && regi.gondolatokSzama === 1 && regi.kategoriakSzama === 0
      && regi.javaslatokSzama === 0 && regi.egyezmenyekSzama === 0
  };
  if (!Object.values(ki).every(Boolean)) {
    console.log('    (az alsó sáv számai — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ' · '
      + JSON.stringify({ st, regi }) + ')');
  }
  return Object.values(ki).every(Boolean);
});

export default futtatas;
