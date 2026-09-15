// koino/meres/fajlAtvitelProba.js — A BÁJTOK ÁTVITELE (5.7 / B)

// Mit bizonyít ez a lap?
//
// ⭐⭐ HOGY A MEGSZAKADT LETÖLTÉS FOLYTATHATÓ, ÉS SOHA NEM HAGY HÁTRA HAMIS FÁJLT.
// A részleges fájl **mérete maga az állapot** (abból következik, hol folytassuk), és a
// lezárás **újra lenyomatol** — ha a bájtok nem azt adják ki, eldobjuk az egészet.
//
// ⛔ ÉS HOGY A MUNKA SZÉTTERÜL: három egyidejű átvitel, **társanként legfeljebb egy** —
// enélkül egy lassú társ lefoglalná az egész készüléket (Csaba döntése).

import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { fajlBlobTarolo, FAJL_KORLAT } from '../js/tar/fajlTar.js';
import {
  kovetkezoKeres, szeletEllenorzes, atvitelTerv, SZELET_MERET, EGYIDEJU_ATVITEL,
  turelemForrasokbol, TURELEM_MAX, TURELEM_MIN,
  // ⭐ TÖBB FORRÁSBÓL EGY FÁJL (D68 / 6., 2026-09-15)
  ujMunkamegosztas, FORRASONKENT_EGY_FAJLRA,
  // ⭐ A ROSSZ SZELET HELYI TANULSÁGA (D68 / 6.)
  romlottJegyzes, romlottFelejtes, valaszthatoForrasok
} from '../js/csere/fajlAtvitel.js';
import { bajtLenyomat } from '../js/esemeny/kanonikusAlak.js';

import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A FÁJL-ÁTVITEL — szeletek és folytatás (5.7)');

const KOINO = 'proba';

async function ujTar() {
  const hely = await mkdtemp(join(tmpdir(), 'koino-atvitel-'));
  return { hely, tar: fajlBlobTarolo(KOINO, hely) };
}

const L = (n) => String(n).padStart(43, 'y');

// ===================================
// 1. ⭐ HOL TARTOK? — a méret maga az állapot
// ===================================

proba('⭐⭐ A RÉSZLEGES MÉRET mondja meg, hol folytassuk — nincs külön nyilvántartás',
  async () => {
    const elso = kovetkezoKeres(0);
    const masodik = kovetkezoKeres(SZELET_MERET);
    const kozepen = kovetkezoKeres(SZELET_MERET + 100);

    return elso.eltolas === 0 && elso.index === 0
      && masodik.eltolas === SZELET_MERET && masodik.index === 1
      // ⚠️ Egy félbeszakadt szelet után is pontosan onnan folytatjuk, ahol abbamaradt.
      && kozepen.eltolas === SZELET_MERET + 100;
  });

proba('⭐ A hiányzó/hibás méret 0-nak számít — nem esünk el rajta', async () => {
  return kovetkezoKeres(undefined).eltolas === 0
    && kovetkezoKeres(-5).eltolas === 0
    && kovetkezoKeres(null).eltolas === 0;
});

// ===================================
// 2. ⛔⛔ A SZELET-ELLENŐRZÉS — három támadás ellen
// ===================================

proba('⛔ ROSSZ ELTOLÁSRA érkezett szeletet nem fogadunk el', async () => {
  // ⚠️ Enélkül a fájl CSENDBEN romlana el: a bájtok rossz helyre kerülnének, és csak a
  // lezáráskor derülne ki — feleslegesen letöltve az egészet.
  // ⚠️ 2026-09-15 óta a KÉRT eltoláshoz mérünk, nem az eddigi mérethez (D68 / 6.) —
  // több forrásnál a szeletek sorrendje nem rögzített, a saját kérésünk viszont tény.
  const v = szeletEllenorzes(1000, 500, 100, FAJL_KORLAT);
  return v.rendben === false && /nem arra/.test(v.ok);
});

proba('⛔ TÚL NAGY szeletet nem fogadunk el — egy kérés nem hozhat végtelen adatot',
  async () => {
    const v = szeletEllenorzes(0, 0, SZELET_MERET + 1, FAJL_KORLAT);
    return v.rendben === false && /hossz/.test(v.ok);
  });

proba('⛔⛔ A FELSŐ MÉRETKORLÁTOT sem lehet átlépni — a lemezünket nem töltik meg',
  async () => {
    const v = szeletEllenorzes(FAJL_KORLAT - 10, FAJL_KORLAT - 10, 100, FAJL_KORLAT);
    return v.rendben === false && /korlát/.test(v.ok);
  });

proba('⭐ A jó szelet átmegy', async () => {
  return szeletEllenorzes(0, 0, SZELET_MERET, FAJL_KORLAT).rendben === true
    && szeletEllenorzes(100, 100, 50, FAJL_KORLAT).rendben === true;
});

// ===================================
// 3. ⭐⭐ A RÉSZLEGES FÁJL — folytatás és lezárás
// ===================================

proba('⭐⭐ SZELETENKÉNT összeáll, és a lezárás a VÉGLEGES nevére teszi', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(1000).fill(3);
  const lenyomat = await bajtLenyomat(teljes);

  await tar.reszlegesIras(lenyomat, 0, teljes.subarray(0, 400));
  const felutnal = await tar.reszlegesMeret(lenyomat);
  await tar.reszlegesIras(lenyomat, 400, teljes.subarray(400));

  const lezaras = await tar.reszlegesLezaras(lenyomat);
  const vissza = await tar.olvas(lenyomat);

  return felutnal === 400 && lezaras.rendben === true
    && vissza !== null && Buffer.from(vissza).equals(Buffer.from(teljes))
    // ⭐ És a részleges már nincs sehol — a félkész és a kész két külön állapot.
    && (await tar.reszlegesMeret(lenyomat)) === 0;
});

proba('⛔⛔ A MEGHAMISÍTOTT letöltés NEM kerül a végleges nevére — eldobjuk', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(500).fill(9);
  const lenyomat = await bajtLenyomat(teljes);

  // ⚠️ A társ mást küldött, mint amit a lenyomat ígért — ez a valódi támadás.
  await tar.reszlegesIras(lenyomat, 0, new Uint8Array(500).fill(1));

  const lezaras = await tar.reszlegesLezaras(lenyomat);
  return lezaras.rendben === false && /lenyomatot/.test(lezaras.ok)
    // ⛔ ÉS NEM HAGY HÁTRA SEMMIT: se végleges, se félkész.
    && (await tar.van(lenyomat)) === false
    && (await tar.reszlegesMeret(lenyomat)) === 0;
});

proba('⛔ A félkész fájl NEM számít „megvan"-nak — másnak sem ajánljuk fel', async () => {
  const { tar } = await ujTar();
  const teljes = new Uint8Array(1000).fill(5);
  const lenyomat = await bajtLenyomat(teljes);

  await tar.reszlegesIras(lenyomat, 0, teljes.subarray(0, 400));

  // ⚠️ Enélkül a bulin felajánlanánk másnak valamit, ami még nincs készen.
  return (await tar.van(lenyomat)) === false
    && !(await tar.lista()).includes(lenyomat)
    && (await tar.reszlegesMeret(lenyomat)) === 400;
});

proba('⛔ A KORLÁT TÚLLÉPÉSEKOR eldobjuk az egészet', async () => {
  const { tar } = await ujTar();
  const lenyomat = L(1);
  try {
    await tar.reszlegesIras(lenyomat, 0, new Uint8Array(FAJL_KORLAT + 1));
    return false;
  } catch (hiba) {
    return /határt/.test(hiba.message) && (await tar.reszlegesMeret(lenyomat)) === 0;
  }
});

// ===================================
// 4. ⭐ A MUNKA ELOSZTÁSA
// ===================================

const jegyzettel = (parok) => {
  const j = {};
  for (const [lenyomat, tarsak] of parok) {
    j[lenyomat] = { tarsak: Object.fromEntries(tarsak.map((t) => [t, 1])) };
  }
  return j;
};

proba('⛔⛔ TÁRSANKÉNT EGY ÁTVITEL — egy lassú társ nem foglalhatja le a készüléket',
  async () => {
    // Mindhárom fájl ugyanannál az egy társnál van meg.
    const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['a:1']], [L(3), ['a:1']]]);
    const terv = atvitelTerv(
      [{ lenyomat: L(1) }, { lenyomat: L(2) }, { lenyomat: L(3) }], jegyzet);

    // ⭐ Csak EGY indul el — a többi a következő körben, vagy mástól.
    return terv.length === 1 && terv[0].tarsak.length === 1 && terv[0].tarsak[0] === 'a:1';
  });

proba('⭐ HÁROM társtól három átvitel indul — a munka szétterül', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['b:1']], [L(3), ['c:1']]]);
  const terv = atvitelTerv(
    [{ lenyomat: L(1) }, { lenyomat: L(2) }, { lenyomat: L(3) }], jegyzet);
  return terv.length === 3 && new Set(terv.flatMap((t) => t.tarsak)).size === 3;
});

proba('⭐⭐⭐ EGY FÁJL, HÁROM FORRÁS — ha mindhárom társnál megvan (D68 / 6.)', async () => {
  // ⚠️ Ez az új képesség (29. mérés: ×2,7, ha a források feltöltése a szűk). Korábban
  // ugyanez a jegyzet EGY átvitelt adott: a többletet a program nem használta ki.
  const jegyzet = jegyzettel([[L(1), ['a:1', 'b:1', 'c:1']]]);
  const terv = atvitelTerv([{ lenyomat: L(1) }], jegyzet);

  return terv.length === 1
    && terv[0].tarsak.length === 3
    && new Set(terv[0].tarsak).size === 3
    // ⭐ És a türelem a VALÓDI forrásszámból jön, nem az ágakéból.
    && terv[0].forrasok === 3;
});

proba('⛔ …de a fájlonkénti forrásszám FELÜLRŐL KORLÁTOS (9. szabály)', async () => {
  // *Egy nagy koinóban egyetlen fájlért nem nyithatunk száz kapcsolatot.*
  const sok = [];
  for (let i = 0; i < 12; i++) sok.push('t' + i + ':1');
  const terv = atvitelTerv([{ lenyomat: L(1) }], jegyzettel([[L(1), sok]]),
    { osszesen: 99 });

  return terv[0].tarsak.length === FORRASONKENT_EGY_FAJLRA
    // ⚠️ A türelem viszont MIND A TIZENKETTŐT látja: van hova menni, ha ez a három néma.
    && terv[0].forrasok === 12;
});

proba('⛔ Az EGYIDEJŰ KORLÁT felül is zár', async () => {
  const parok = [];
  for (let i = 0; i < 10; i++) parok.push([L(i), ['t' + i + ':1']]);
  const sorrend = parok.map(([lenyomat]) => ({ lenyomat }));

  return atvitelTerv(sorrend, jegyzettel(parok)).length === EGYIDEJU_ATVITEL;
});

proba('⚠️ AKIRŐL NEM TUDJUK, KINÉL VAN MEG, azt kihagyjuk — nem kérdezünk vaktában',
  async () => {
    // ⭐ A hiány nem hiba: a következő buli megmondja (D19).
    const terv = atvitelTerv([{ lenyomat: L(1) }, { lenyomat: L(2) }],
      jegyzettel([[L(2), ['a:1']]]));
    return terv.length === 1 && terv[0].lenyomat === L(2);
  });

proba('⭐ A SORRENDET tiszteletben tartja (a ritkábbat/vállaltat előbb)', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1']], [L(2), ['b:1']]]);
  // A hívó már rendezett: L(2) az első.
  const terv = atvitelTerv([{ lenyomat: L(2) }, { lenyomat: L(1) }], jegyzet);
  return terv[0].lenyomat === L(2);
});

// ===================================
// ⭐⭐⭐ A TÜRELEM: AMENNYIT AZ ALTERNATÍVA HIÁNYA INDOKOL (D68, 2026-09-15)
// ===================================
//
// ⛔ A régi `FELADAS_IDO = 30 000` **honnan sem jött**: egyetlen 1000 bájtos darabért
// küzdöttünk fél percig, akkor is, ha ugyanaz a fájl tíz másik társnál megvolt.
// ⭐ Csaba döntése nem egy kisebb fix szám volt (*„az ugyanolyan varázsszám lenne"*), hanem
// hogy **függjön a források számától**.

proba('⭐⭐ A TÜRELEM CSÖKKEN, ahogy nő a források száma', async () => {
  const egy = turelemForrasokbol(1);
  const ketto = turelemForrasokbol(2);
  const ot = turelemForrasokbol(5);
  return egy === TURELEM_MAX          // ⭐ egy forrásnál: nincs hova menni
    && ketto < egy && ot < ketto       // ⭐ monoton csökken
    && ketto === 15000 && ot === 6000;
});

proba('⛔ DE VAN ALSÓ KORLÁT — a lassú vonal alapeset, nem kivétel (9. szabály)', async () => {
  // ⚠️ Száz forrásnál sem eshet olyan alacsonyra, hogy egy 800 ms oda-visszájú vonalon
  // egyetlen tisztességes próbálkozás se férjen bele.
  return turelemForrasokbol(100) === TURELEM_MIN
    && turelemForrasokbol(1000) === TURELEM_MIN
    && TURELEM_MIN >= 5000;
});

proba('⚠️ AZ ISMERETLEN FORRÁSSZÁM a LEGÓVATOSABB választ adja (D19)', async () => {
  // *Ha nem tudunk alternatíváról, akkor nincs alternatíva — a hiány nem ok a
  // türelmetlenségre.*
  return turelemForrasokbol(0) === TURELEM_MAX
    && turelemForrasokbol(null) === TURELEM_MAX
    && turelemForrasokbol(undefined) === TURELEM_MAX
    && turelemForrasokbol(-3) === TURELEM_MAX;
});

proba('⭐⭐⭐ ÉS A TERV VISZI MAGÁVAL — a vonal nem tudhatja, hány forrás van', async () => {
  // Az L(1) fájl EGY társnál van meg, az L(2) NÉGYNÉL.
  const jegyzet = jegyzettel([
    [L(1), ['a:1']],
    [L(2), ['b:1', 'c:1', 'd:1', 'e:1']]
  ]);
  const terv = atvitelTerv([{ lenyomat: L(1) }, { lenyomat: L(2) }], jegyzet);

  const egyForras = terv.find((t) => t.lenyomat === L(1));
  const negyForras = terv.find((t) => t.lenyomat === L(2));

  return egyForras.forrasok === 1 && negyForras.forrasok === 4
    // ⭐ A LÉNYEG: akinek több forrása van, azzal kevesebbet küzdünk.
    && egyForras.turelem === TURELEM_MAX
    && negyForras.turelem === 7500
    && negyForras.turelem < egyForras.turelem;
});

// ===================================
// ⭐⭐⭐ A MUNKAMEGOSZTÁS — TÖBB FORRÁSBÓL EGY FÁJL (D68 / 6., 2026-09-15)
// ===================================
//
// ⚠️ Ez a darab **hálózat nélkül mérhető** (1. szabály: a `fajlAtvitel.js` nem importál
// vonalat) — pedig épp ő dönti el, melyik ág mit hoz, és ki zárja le a fájlt.

proba('⭐ EGY FORRÁS: sorban kapja a szeleteket, és a végén nincs több dolga', async () => {
  const m = ujMunkamegosztas();

  const elso = await m.kovetkezo();          // a méret még ismeretlen → a 0. szelet
  m.meretMegvan(2 * SZELET_MERET);
  m.kesz(elso);

  const masodik = await m.kovetkezo();
  m.kesz(masodik);

  return elso === 0 && masodik === SZELET_MERET
    && m.keszEgesz() === true
    && (await m.kovetkezo()) === null;
});

proba('⛔⛔ AMÍG A MÉRET ISMERETLEN, CSAK EGY ÁG DOLGOZIK — a többi VÁR, nem lép ki',
  async () => {
    // ⚠️ Ez a finom pont: a fájl méretét az ELSŐ válasz `teljes` mezője mondja meg. Addig
    // nem tudjuk, hány szelet van. ⛔ Ha a többi ág ilyenkor `null`-t kapna, **kilépnének**,
    // és a párhuzamosság sosem indulna el — egyetlen forrás hozná az egészet.
    const m = ujMunkamegosztas();
    const elso = await m.kovetkezo();

    let masodikMegjott = false;
    const masodik = m.kovetkezo().then((e) => { masodikMegjott = true; return e; });

    // Egy környi várakozás: a második ág NEM kaphatott munkát.
    await new Promise((t) => setTimeout(t, 20));
    const vartE = masodikMegjott === false;

    // ⭐ És most megjön a méret — ettől indulhat a többi.
    m.meretMegvan(3 * SZELET_MERET);
    m.kesz(elso);

    const masodikEltolas = await masodik;
    return elso === 0 && vartE === true
      && masodikEltolas !== null && masodikEltolas !== 0;
  });

proba('⛔ UGYANAZT A SZELETET KETTEN NEM HOZZÁK — a kiosztás kizárólagos', async () => {
  const m = ujMunkamegosztas();
  const elso = await m.kovetkezo();
  m.meretMegvan(4 * SZELET_MERET);
  m.kesz(elso);

  // Három ág egyszerre kér — mindegyiknek MÁST kell kapnia.
  const harom = await Promise.all([m.kovetkezo(), m.kovetkezo(), m.kovetkezo()]);
  return new Set(harom).size === 3 && !harom.includes(0) && !harom.includes(null);
});

proba('⭐⭐ HA EGY ÁG ELBUKIK, A SZELETE VISSZAKERÜL — más elviheti', async () => {
  // *Enélkül egy elnémult társ magával vinné azt a darabot, amit épp ő kért — és a fájl
  // sosem lenne kész, pedig a bájtok másnál is megvannak.*
  const m = ujMunkamegosztas();
  const elso = await m.kovetkezo();
  m.meretMegvan(2 * SZELET_MERET);
  m.kesz(elso);

  const masikE = await m.kovetkezo();        // egy ág elviszi…
  m.elengedi(masikE);                        // …majd elbukik

  const ujra = await m.kovetkezo();
  return masikE === SZELET_MERET && ujra === SZELET_MERET && m.keszEgesz() === false;
});

proba('⛔⛔ A LEZÁRÁS JOGA EGYSZER ADÓDIK KI — és a másik ág ugyanazt az eredményt kapja',
  async () => {
    // ⚠️ Több forrásnál MINDEGYIK ág látja, hogy minden szelet megvan. Ha mind lezárna, a
    // második már „nincs részleges fájl"-t kapna — *hibának látszana, hogy más volt gyorsabb.*
    const m = ujMunkamegosztas([0]);
    m.meretMegvan(SZELET_MERET);

    const egyik = m.lezarasEnyem();
    const masik = m.lezarasEnyem();

    // A vesztes megvárja az eredményt — ezt a nyertes rögzíti.
    const varakozas = m.lezarasraVar();
    m.lezarasKesz({ rendben: true });

    return egyik === true && masik === false && (await varakozas).rendben === true;
  });

proba('⭐ AMI A LEMEZEN MÁR MEGVAN, AZT NEM KÉRJÜK EL ÚJRA', async () => {
  // *A részleges fájl szeletei túlélik a program leállását — ez a „társ-váltás olcsó"
  // másik fele (28. mérés).*
  const m = ujMunkamegosztas([0, SZELET_MERET]);
  m.meretMegvan(3 * SZELET_MERET);

  const kovetkezo = await m.kovetkezo();
  return kovetkezo === 2 * SZELET_MERET;
});

proba('⛔ Ha MINDEN szelet megvan a lemezen, nincs mit kérni — de kész sincs méret nélkül',
  async () => {
    const m = ujMunkamegosztas([0, SZELET_MERET]);
    // ⚠️ Méret nélkül nem jelenthetjük ki, hogy kész: hátha van még egy szelet.
    const meretNelkul = m.keszEgesz();
    m.meretMegvan(2 * SZELET_MERET);
    return meretNelkul === false && m.keszEgesz() === true
      && (await m.kovetkezo()) === null;
  });

// ===================================
// ⭐⭐⭐ A ROSSZ SZELET HELYI TANULSÁGA (D68 / 6., 2026-09-15)
// ===================================
//
// ⛔ Ma a lenyomat a TELJES fájlra szól: egy hamis szelet az egészet elbuktatja, és **nem
// tudjuk, melyik volt**. A válasz nem újabb adat a láncon, hanem egy **helyi** tanulság:
// a következő körben mással próbáljuk.

proba('⭐ A BUKOTT FORRÁSOKAT FELJEGYEZZÜK — fájlonként, nem társanként', async () => {
  const jegyzet = romlottJegyzes({}, L(1), ['a:1', 'b:1']);

  return Object.keys(jegyzet[L(1)].romlott).sort().join(',') === 'a:1,b:1'
    // ⛔ ÉS CSAK ERRE A FÁJLRA: nincs globális mérleg a társakról (D18/2, D48).
    && jegyzet[L(2)] === undefined;
});

proba('⭐⭐ A KÖVETKEZŐ KÖRBEN MÁST VÁLASZTUNK — ha van kit', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1', 'b:1', 'c:1']]]);
  const bukott = romlottJegyzes(jegyzet, L(1), ['a:1', 'b:1']);

  const terv = atvitelTerv([{ lenyomat: L(1) }], bukott);
  return terv.length === 1
    && terv[0].tarsak.length === 1 && terv[0].tarsak[0] === 'c:1';
});

proba('⛔⛔ DE HA NEM MARAD SENKI, FELEJTÜNK — a védekezés nem vághatja el az utat',
  async () => {
    // ⚠️ Ez a legfontosabb korlát. Egy fájl, amit CSAK EGY társ birtokol, egyetlen bukás
    // után **soha többé** nem jönne meg, ha a kerülés örökre szólna.
    const jegyzet = jegyzettel([[L(1), ['a:1']]]);
    const bukott = romlottJegyzes(jegyzet, L(1), ['a:1']);

    const terv = atvitelTerv([{ lenyomat: L(1) }], bukott);
    return terv.length === 1 && terv[0].tarsak[0] === 'a:1';
  });

proba('⭐ …és amint a fájl MEGJÖN, a tanulság tárgytalan (felejtés)', async () => {
  const jegyzet = jegyzettel([[L(1), ['a:1', 'b:1']]]);
  const bukott = romlottJegyzes(jegyzet, L(1), ['a:1']);
  const felejtve = romlottFelejtes(bukott, L(1));

  return bukott[L(1)].romlott !== undefined
    && felejtve[L(1)].romlott === undefined
    // ⚠️ A birtoklás-tudás VISZONT MEGMARAD: az másról szól (kinél van meg).
    && Object.keys(felejtve[L(1)].tarsak).length === 2;
});

proba('⛔ A jegyzést nem írjuk felül a helyén — új jegyzetet ad (mint a birtoklásnál)',
  async () => {
    const eredeti = jegyzettel([[L(1), ['a:1']]]);
    const uj = romlottJegyzes(eredeti, L(1), ['a:1']);
    return eredeti[L(1)].romlott === undefined && uj[L(1)].romlott !== undefined;
  });

proba('⭐ A `valaszthatoForrasok` önmagában is a fenti szabályt mondja', async () => {
  const harom = ['a:1', 'b:1', 'c:1'];
  return valaszthatoForrasok(harom, { 'a:1': 1 }).join(',') === 'b:1,c:1'
    // ⛔ mind kizárva → felejtés
    && valaszthatoForrasok(harom, { 'a:1': 1, 'b:1': 1, 'c:1': 1 }).length === 3
    // ⚠️ üres jegyzet → változatlan
    && valaszthatoForrasok(harom, undefined).length === 3;
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/fajlAtvitelProba.js
if (process.argv[1] && process.argv[1].endsWith('fajlAtvitelProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
