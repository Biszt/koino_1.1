// koino/meres/skalaMeres.js

// Felelősség: MEGMÉRNI, HOL VAN A FAL — az S1 lépés a skálázási tervből
// ([`docs/skalazas_terv.md`](../../docs/skalazas_terv.md), 8. szakasz).
//
// ===== MIÉRT EZ AZ ELSŐ LÉPÉS =====
//
// A skálázási terv három falat nevez meg. Kettő MÉRVE van (162 bájt/e-ember az ÁLLÁS-ban;
// 435 bájt egy esemény), a harmadik viszont — hogy a globális lenyomat megtakarítása
// mérettel ELPÁROLOG — csak SZÁMÍTÁS. A projekt visszatérő tanulsága, hogy az ilyet nem
// saccoljuk meg. Ha ez a mérés mást mutat, a terv sorrendje változik.
//
// Az `eredmenyek.md` utolsó szakasza egyébként már kéri is: *„a valódi terhelés (több
// tízezer esemény betöltése) külön mérendő, amikor már van mit betölteni."*
//
// ===== EZ NEM ÖNPRÓBA =====
//
// A `mind.js` próbái igen/nem választ adnak; ez SZÁMOKAT ad. Ezért külön belépő, és
// szándékosan NEM kerül bele a `mind.js`-be: egy mérés nem „bukhat meg", és nem is szabad,
// hogy a próbafuttatás idejét megsokszorozza.
//
//   node koino/meres/skalaMeres.js                 → 1 000 / 10 000 / 100 000
//   node koino/meres/skalaMeres.js 1000 5000       → csak ezek
//   node --expose-gc koino/meres/skalaMeres.js     → pontosabb memória-adat
//
// ===== A GENERÁTOR KÉT ÚTON JÁR, ÉS EZ SZÁNDÉKOS =====
//
// ⚠️ A tár ELŐÁLLÍTÁSA nem mehet a valódi `esemenyMentese`-n, mert az minden mentésnél
// végigolvassa az EGÉSZ fájlt (`tar.betolt()`), a `lancVege` pedig még egyszer. Vagyis a
// beírás ára a tár méretével nő — N esemény legyártása így NÉGYZETES. Százezernél ez
// órákban mérhető lenne.
//
// Ezért:
//   · a GENERÁLÁS gyors úton megy: valódi kulcsok, valódi aláírások, valódi kanonikus alak
//     és valódi lánc — de a lánc végét memóriában tartjuk, és egyszerre írunk fájlba;
//   · a MÉRÉS viszont a VALÓDI API-t hajtja meg azon a táron.
//
// ⭐ És magát a négyzetes beírást is megmérjük (E. mérés): a valódi `esemenyMentese`-t
// EGYSZER futtatjuk különböző méretű tárakon. Így a jelenséget megmérjük anélkül, hogy
// megfizetnénk.

import { kiir } from './naplo.js';

import { mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { kanonikusBajtok } from '../js/esemeny/kanonikusAlak.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese, koinoEsemenyei } from '../js/tar/esemenyTar.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { allasOsszeallitasa, allasLenyomata, hianyokSzamitasa } from '../js/csere/csere.js';
import { TUDATPONT_KERET } from '../js/allapot/szabalyok.js';

// ===================================
// A MÉRÉS PARAMÉTEREI
// ===================================

const KOINO = 'skalameres';

// ⚠️ FELTEVÉS, NEM TUDÁS. A keverék abból a képből jön, hogy egy e-ember sok mindenre tesz
// pontot (és át is rendezi), keveset ír, még kevesebbet javasol. Ha kiderül, hogy a valódi
// használat más, EZT A TÁBLÁZATOT kell először átírni — és a mérést megismételni.
const KEVEREK = {
  TudatpontRendezes: 60,
  GondolatLetrehozas: 25,
  Szavazat: 10,
  Javaslat: 3,
  ErtekJavaslat: 2
};

// Hány e-ember legyen? A létszám a lánc-hosszt is meghatározza (esemény / fő), és az ÁLLÁS
// ára ettől függ — ezért a mérethez kötjük, nem rögzítjük.
const ESEMENY_PER_FO = 200;

// ===================================
// SEGÉD: SZÖVEG-GYÁR (valódi szórású címekkel)
// ===================================
//
// ⚠️ MIÉRT NEM EGYFORMA HOSSZÚ CÍMEK? Mert akkor a mérés önmagát igazolná: a „435 bájt egy
// esemény" mai száma 9 eseményből jön, tehát a szórás ismeretlen. Egyforma címekkel pont
// azt nem tudnánk meg, amit meg akarunk.

const SZAVAK = [
  'lakótelepi', 'parkolás', 'iskolabusz', 'közösségi', 'kert', 'javaslat', 'útfelújítás',
  'zajvédelem', 'játszótér', 'szelektív', 'hulladék', 'buszmegálló', 'kerékpárút',
  'orvosi', 'ügyelet', 'könyvtár', 'nyitvatartás', 'térfigyelő', 'fásítás', 'csapadékvíz',
  'közvilágítás', 'piac', 'sportpálya', 'ivóvíz', 'menetrend', 'gyalogátkelő'
];

/** Álvéletlen szám-generátor — hogy a mérés MEGISMÉTELHETŐ legyen (ugyanaz a mag, ugyanaz az adat). */
function veletlenGyar(mag = 20260831) {
  let allapot = mag >>> 0;
  return () => {
    allapot = (allapot * 1664525 + 1013904223) >>> 0;
    return allapot / 4294967296;
  };
}

/** Egy cím: 2–9 szó, tehát valódi szórással. */
function cimetGyartok(veletlen) {
  const hossz = 2 + Math.floor(veletlen() * 8);
  const szavak = [];
  for (let i = 0; i < hossz; i++) {
    szavak.push(SZAVAK[Math.floor(veletlen() * SZAVAK.length)]);
  }
  return szavak.join(' ');
}

// ===================================
// A GENERÁTOR
// ===================================

/**
 * Legyárt egy szintetikus koino-tárat: valódi kulcsok, valódi aláírások, valódi lánc.
 *
 * ⚠️ A tudatpont-keretet BETARTJA (szerzőnként nyilvántartja, mennyi van kiosztva), mert
 * különben a `szabalyok.js` az események zömét kivételként kiszórná — és akkor nem a
 * valódi terhelést mérnénk, hanem egy szűrő sebességét.
 *
 * @param {number} darab - hány eseményt gyártsunk
 * @param {string} hely - hova (ideiglenes mappa)
 * @returns {Promise<{fajl: string, fok: number, sorok: Array<string>}>}
 */
async function tarGyartasa(darab, hely) {
  const veletlen = veletlenGyar();
  const fok = Math.max(2, Math.ceil(darab / ESEMENY_PER_FO));

  // ----- KULCSOK -----
  const emberek = [];
  for (let i = 0; i < fok; i++) {
    const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    emberek.push({
      kulcspar,
      elozo: null,          // a lánc vége, MEMÓRIÁBAN (ezért gyors)
      sorszam: 0,
      pontok: new Map(),    // entitás → a rá tett pontom
      osszeg: 0,            // mennyit osztottam ki eddig (a keret ellenőrzéséhez)
      entitasSorszamok: new Map()   // szelet → hányadik eseményem rajta (3.1)
    });
  }

  // ----- A KEVERÉK KISORSOLHATÓ ALAKJA -----
  const sorsolo = [];
  for (const [tipus, suly] of Object.entries(KEVEREK)) {
    for (let i = 0; i < suly; i++) sorsolo.push(tipus);
  }

  const sorok = [];
  const entitasok = [];    // a létrehozott gondolatok azonosítói
  const javaslatok = [];   // a létrehozott javaslatok azonosítói
  const idoAlap = Date.now() - darab * 1000;

  /**
   * A SZELET-KULCS — ugyanaz a szabály, amit a `muveletek.js` követ.
   * *(A `Szavazat`-nál a javaslat azonosítója közelít; a mérés a MÉRETET nézi, nem a
   * szeletelés helyességét.)*
   */
  function szeletKulcs(tipus, adat) {
    if (tipus === 'TudatpontRendezes' || tipus === 'ErtekJavaslat') return adat?.entitas ?? null;
    if (tipus === 'Javaslat') return adat?.erintett ?? null;
    if (tipus === 'Szavazat') return adat?.javaslat ?? null;
    return null;
  }

  /**
   * Egy esemény legyártása és a sorhoz fűzése — a valódi aláíró úton.
   *
   * ⚠️ A BURKOLAT HÁROM ÚJ MEZŐJÉT IS KITÖLTI (3.1): enélkül a mérés a RÉGI alakot mérné,
   * és a szabály-réteg minden tudatpont-eseményt kivételként szórna ki — vagyis nem valódi
   * terhelést mérnénk, hanem egy szűrő sebességét.
   */
  async function esemenyt(ember, tipus, adat, index) {
    ember.sorszam++;

    const entitas = szeletKulcs(tipus, adat);
    let entitasSorszam = 1;
    if (entitas !== null) {
      entitasSorszam = (ember.entitasSorszamok.get(entitas) ?? 0) + 1;
      ember.entitasSorszamok.set(entitas, entitasSorszam);
    }

    const esemeny = await esemenyLetrehozasa(
      {
        koino: KOINO,
        tipus,
        adat,
        elozo: ember.elozo,
        sorszam: ember.sorszam,
        ido: idoAlap + index * 1000,
        entitas,
        entitasSorszam,
        // A horgony a határidő-mozgató eseményeken él (a `muveletek.js` szerint); itt egy
        // hihető helykitöltő, hogy a MÉRET valósághű legyen.
        latott: (tipus === 'Szavazat' || tipus === 'TudatpontRendezes' || tipus === 'ErtekJavaslat')
          && entitasok.length
          ? [entitasok[Math.floor(veletlen() * entitasok.length)]]
          : []
      },
      ember.kulcspar
    );
    ember.elozo = esemeny.azonosito;
    sorok.push(JSON.stringify(esemeny));
    return esemeny;
  }

  // ----- 1. A KOINO LÉTREHOZÁSA (az első esemény) -----
  await esemenyt(emberek[0], 'KoinoLetrehozas', { nev: 'Skála-mérés', leiras: null }, 0);

  // ----- 2. EGY ADAG GONDOLAT ELŐRE -----
  // Kell néhány entitás, amire a többi esemény hivatkozhat.
  const elolegDarab = Math.min(Math.max(10, Math.floor(darab / 20)), 2000);
  for (let i = 0; i < elolegDarab && sorok.length < darab; i++) {
    const ember = emberek[Math.floor(veletlen() * fok)];
    const e = await gondolatot(ember, sorok.length);
    entitasok.push(e.azonosito);
  }

  /** Egy gondolat-esemény (a méret a valódi módon, a kanonikus alak hosszából). */
  async function gondolatot(ember, index) {
    const gondolat = {
      tipus: 'Gondolat',
      cim: cimetGyartok(veletlen),
      szoveg: veletlen() < 0.5 ? cimetGyartok(veletlen) + '.' : null,
      szulo: entitasok.length && veletlen() < 0.7
        ? entitasok[Math.floor(veletlen() * entitasok.length)]
        : null
    };
    gondolat.meret = kanonikusBajtok(gondolat).length;
    return esemenyt(ember, 'GondolatLetrehozas', gondolat, index);
  }

  // ----- 3. A TÖBBI, A KEVERÉK SZERINT -----
  while (sorok.length < darab) {
    const index = sorok.length;
    const ember = emberek[Math.floor(veletlen() * fok)];
    const tipus = sorsolo[Math.floor(veletlen() * sorsolo.length)];

    if (tipus === 'GondolatLetrehozas' || entitasok.length === 0) {
      const e = await gondolatot(ember, index);
      entitasok.push(e.azonosito);
      continue;
    }

    const entitas = entitasok[Math.floor(veletlen() * entitasok.length)];

    if (tipus === 'TudatpontRendezes') {
      // ⭐ A KERET BETARTÁSA. Ha nem férne bele, ÁTRENDEZÜNK: elveszünk egy meglévőről és
      // ide tesszük. Ez nem trükk — pontosan ez a tudatpont természete („nem elkölthető,
      // csak szétosztható és bármikor átrendezhető").
      const regi = ember.pontok.get(entitas) ?? 0;
      let pont = 10 + Math.floor(veletlen() * 500);
      if (ember.osszeg - regi + pont > TUDATPONT_KERET) {
        // Nincs hely: inkább csökkentsük a meglévőt (átrendezés).
        pont = Math.max(0, Math.floor(regi / 2));
      }
      ember.osszeg = ember.osszeg - regi + pont;
      ember.pontok.set(entitas, pont);
      await esemenyt(ember, 'TudatpontRendezes', {
        entitas,
        pont,
        szerep: veletlen() < 0.9 ? 'aktiv' : 'passziv',
        // ⭐ A D42 BEMONDOTT ÖSSZEGE — a szabály-réteg ezt veti össze a számítottal.
        kiosztva: ember.osszeg
      }, index);
      continue;
    }

    if (tipus === 'Javaslat') {
      // Javaslatot csak az tehet, akinek van pontja rajta (szabalyok.js) — különben
      // kivételként kiesne, és nem a valódi terhelést mérnénk.
      const sajatEntitasok = [...ember.pontok.entries()].filter(([, p]) => p > 0);
      if (!sajatEntitasok.length) continue;
      const [sajat] = sajatEntitasok[Math.floor(veletlen() * sajatEntitasok.length)];
      const e = await esemenyt(ember, 'Javaslat', {
        fajta: veletlen() < 0.3 ? 'altalanos' : 'szerkesztesi',
        erintett: sajat,
        muvelet: 'Modositas',
        valtozas: { cim: cimetGyartok(veletlen) },
        indoklas: cimetGyartok(veletlen)
      }, index);
      javaslatok.push(e.azonosito);
      continue;
    }

    if (tipus === 'Szavazat') {
      if (!javaslatok.length) continue;
      const javaslat = javaslatok[Math.floor(veletlen() * javaslatok.length)];
      const melyik = veletlen();
      await esemenyt(ember, 'Szavazat', {
        javaslat,
        szavazat: melyik < 0.6 ? 'Tamogat' : melyik < 0.9 ? 'Ellenez' : 'Tartozkodik'
      }, index);
      continue;
    }

    // ErtekJavaslat
    await esemenyt(ember, 'ErtekJavaslat', {
      entitas,
      ertekek: {
        elfogadasiKuszob: 50 + Math.floor(veletlen() * 20),
        reszveteliKuszob: Math.floor(veletlen() * 30),
        minimumDontesiIdo: 86400,
        maximumDontesiIdo: 604800
      }
    }, index);
  }

  // ----- 4. EGYETLEN ÍRÁS -----
  const mappa = join(hely, KOINO);
  await mkdir(mappa, { recursive: true });
  const fajl = join(mappa, 'esemenyek.jsonl');
  await writeFile(fajl, sorok.join('\n') + '\n', 'utf8');

  return { fajl, fok, sorok };
}

// ===================================
// SEGÉD: IDŐ ÉS MEMÓRIA
// ===================================

/** Megméri egy művelet idejét ezredmásodpercben. */
async function ido(muvelet) {
  const kezd = performance.now();
  const eredmeny = await muvelet();
  return { ms: performance.now() - kezd, eredmeny };
}

/**
 * A heap mérete — GC után, ha lehet.
 * ⚠️ `--expose-gc` nélkül ez csak becslés: a szemétgyűjtő bármikor közbeszólhat.
 */
function heapMB() {
  if (typeof global.gc === 'function') global.gc();
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

const kerekit = (szam, tizedes = 1) => Number(szam.toFixed(tizedes));
const bajtSzoveg = (b) =>
  b < 1024 ? b + ' B'
    : b < 1024 * 1024 ? kerekit(b / 1024) + ' KB'
      : kerekit(b / 1024 / 1024) + ' MB';

// ===================================
// A MÉRÉS
// ===================================

/**
 * Egy méret végigmérése.
 * @param {number} darab
 * @param {string} hely
 */
async function egyMeret(darab, hely) {
  kiir('');
  kiir('══════════════════════════════════════════════════════════════');
  kiir('  ' + darab.toLocaleString('hu-HU') + ' ESEMÉNY');
  kiir('══════════════════════════════════════════════════════════════');

  // ----- GENERÁLÁS -----
  const gen = await ido(() => tarGyartasa(darab, hely));
  const { fajl, fok } = gen.eredmeny;
  const fajlMeret = (await stat(fajl)).size;

  kiir('');
  kiir('  GENERÁLÁS (nem a mérés tárgya, csak tájékoztató)');
  kiir('    e-emberek:            ' + fok);
  kiir('    generálás ideje:      ' + kerekit(gen.ms) + ' ms');
  kiir('    fájl a lemezen:       ' + bajtSzoveg(fajlMeret));
  kiir('    ⭐ egy esemény átlag:  ' + kerekit(fajlMeret / darab, 0) + ' B'
    + '   (a terv 435 B-tal számol)');

  // ⚠️ A MEGNYITÁS IDEJE KÜLÖN MÉRENDŐ (3.2 óta). A tároló megnyitáskor épít egy mutatót,
  // tehát a fájl beolvasása IDE került át a `betolt()`-ből. Ha ezt nem mérnénk, a „betöltés"
  // száma látszólag összeomlana — pedig a munka nem tűnt el, csak áthelyeződött, és
  // futásonként EGYSZER történik, nem műveletenként.
  const nyitas = await ido(() => esemenyTarNyitasa(KOINO, hely));
  const tar = nyitas.eredmeny;

  // ===== A. BETÖLTÉS ÉS ÁLLAPOTSZÁMÍTÁS =====
  const heapElotte = heapMB();

  const betoltes = await ido(() => koinoEsemenyei(tar, KOINO));
  const esemenyek = betoltes.eredmeny;

  const allapotMeres = await ido(async () => allapotSzamitasa(esemenyek));
  const allapot = allapotMeres.eredmeny;

  const javaslatMeres = await ido(async () =>
    javaslatokSzamitasa(esemenyek, allapot, Date.now()));

  const heapUtana = heapMB();

  kiir('');
  kiir('  A. BETÖLTÉS ÉS SZÁMÍTÁS — „meddig bírja egy készülék?"');
  kiir('    tár megnyitása (mutató):    ' + kerekit(nyitas.ms) + ' ms'
    + '   ⚠️ futásonként EGYSZER');
  kiir('    betöltés (betolt + szűrés): ' + kerekit(betoltes.ms) + ' ms');
  kiir('    allapotSzamitasa:           ' + kerekit(allapotMeres.ms) + ' ms');
  kiir('    javaslatokSzamitasa:        ' + kerekit(javaslatMeres.ms) + ' ms');
  kiir('    ─────────────────────────────────────────');
  kiir('    EGYÜTT:                     ' + kerekit(betoltes.ms + allapotMeres.ms + javaslatMeres.ms) + ' ms');
  kiir('    heap (közelítés):           ' + kerekit(heapUtana - heapElotte) + ' MB'
    + (typeof global.gc === 'function' ? '' : '   ⚠️ --expose-gc nélkül becslés'));
  kiir('    entitás / javaslat:         ' + allapot.entitasok.size + ' / ' + javaslatMeres.eredmeny.size);
  kiir('    kivétel (szabálysértő):     ' + (allapot.kivetelek?.length ?? 0));

  // ===== B. AZ ÁLLÁS ÁRA =====
  const allasMeres = await ido(() => allasOsszeallitasa(tar, KOINO));
  const allas = allasMeres.eredmeny;
  const allasBajt = Buffer.byteLength(JSON.stringify(allas), 'utf8');
  const lenyomatMeres = await ido(() => allasLenyomata(allas));

  kiir('');
  kiir('  B. AZ ÁLLÁS ÁRA — „mennyibe kerül egy csere?"');
  kiir('    összeállítás ideje:   ' + kerekit(allasMeres.ms) + ' ms');
  kiir('    ÁLLÁS mérete:         ' + bajtSzoveg(allasBajt));
  kiir('    ⭐ bájt / e-ember:     ' + kerekit(allasBajt / fok, 0) + ' B'
    + '   (a terv 162 B-tal számol)');
  kiir('    lenyomat ideje:       ' + kerekit(lenyomatMeres.ms) + ' ms');

  // ===== C. ⭐ A FŐ KÉRDÉS: EGY ELTÉRÉS ÁRA =====
  //
  // A terv állítása: nagy koinóban a globális lenyomat SOHA nem egyezik, tehát minden kör
  // visszaesik a teljes ÁLLÁS-ra. Ezt úgy mérjük, hogy elveszünk EGY eseményt a másik fél
  // tudásából, és megnézzük, mibe kerül a kör.
  const szegenyebbSorok = gen.eredmeny.sorok.slice(0, -1);
  const szegenyHely = join(hely, 'masik');
  await mkdir(join(szegenyHely, KOINO), { recursive: true });
  await writeFile(join(szegenyHely, KOINO, 'esemenyek.jsonl'),
    szegenyebbSorok.join('\n') + '\n', 'utf8');

  const szegenyTar = await esemenyTarNyitasa(KOINO, szegenyHely);
  const szegenyAllas = await allasOsszeallitasa(szegenyTar, KOINO);
  const szegenyLenyomat = await allasLenyomata(szegenyAllas);
  const gazdagLenyomat = await allasLenyomata(allas);

  const lenyomatEgyezik = szegenyLenyomat === gazdagLenyomat;
  const kerelem = hianyokSzamitasa(szegenyAllas, allas);
  const kerelemBajt = Buffer.byteLength(JSON.stringify(kerelem), 'utf8');
  const szegenyAllasBajt = Buffer.byteLength(JSON.stringify(szegenyAllas), 'utf8');

  // Egy kör ára: két LENYOMAT + (ha eltér) két ÁLLÁS + két KÉREK + a hiányzó esemény
  const lenyomatBajt = Buffer.byteLength(JSON.stringify(
    { uzenet: 'LENYOMAT', koino: KOINO, lenyomat: gazdagLenyomat }), 'utf8');
  const hianyzoBajt = Buffer.byteLength(gen.eredmeny.sorok.at(-1), 'utf8');
  const korAra = lenyomatEgyezik
    ? 2 * lenyomatBajt
    : 2 * lenyomatBajt + allasBajt + szegenyAllasBajt + 2 * kerelemBajt + hianyzoBajt;

  kiir('');
  kiir('  C. ⭐ EGY ELTÉRÉS ÁRA — a terv legfontosabb, MÉG NEM MÉRT állítása');
  kiir('    a két fél különbsége: 1 esemény ' + darab.toLocaleString('hu-HU') + '-ből');
  kiir('    a lenyomatok egyeznek? ' + (lenyomatEgyezik ? 'IGEN' : 'NEM — a részletes ÁLLÁS elindul'));
  kiir('    ⭐ egy kör teljes ára:  ' + bajtSzoveg(korAra));
  kiir('    ebből hasznos adat:    ' + bajtSzoveg(hianyzoBajt)
    + '   (' + kerekit(100 * hianyzoBajt / korAra, 2) + '%)');
  kiir('    → egy hasznos bájtra jut: ' + kerekit(korAra / hianyzoBajt, 0) + ' bájt forgalom');

  // ===== D. ⭐⭐ A BEÍRÁS ÁRA — a négyzetes út =====
  //
  // A valódi `esemenyMentese`-t EGYSZER futtatjuk ezen a táron. Ha ez az idő a tár
  // méretével nő, akkor N esemény beírása NÉGYZETES — és ez a fal jóval a tárolás előtt
  // jön el.
  const ujEmber = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const ujEsemeny = await esemenyLetrehozasa(
    { koino: KOINO, tipus: 'GondolatLetrehozas', elozo: null, sorszam: 1,
      adat: { tipus: 'Gondolat', cim: 'mérő esemény', szoveg: null, szulo: null, meret: 42 } },
    ujEmber
  );
  const mentes = await ido(() => esemenyMentese(tar, ujEsemeny));

  kiir('');
  kiir('  D. ⭐⭐ EGY MENTÉS ÁRA ilyen méretű táron — a beírási út');
  kiir('    esemenyMentese (1 db):  ' + kerekit(mentes.ms) + ' ms');
  kiir('    ha ez a mérettel nő → N esemény beírása NÉGYZETES');
  kiir('    becsült idő ' + darab.toLocaleString('hu-HU') + ' esemény beírására ezen az úton: '
    + kerekit(mentes.ms * darab / 2 / 1000) + ' mp');

  return {
    darab, fok, fajlMeret,
    esemenyAtlag: fajlMeret / darab,
    betoltesMs: betoltes.ms,
    szamitasMs: allapotMeres.ms + javaslatMeres.ms,
    heapMB: heapUtana - heapElotte,
    allasBajt, allasPerFo: allasBajt / fok,
    lenyomatEgyezik, korAra, hianyzoBajt,
    mentesMs: mentes.ms
  };
}

// ===================================
// ÖSSZEFOGLALÓ
// ===================================

function osszefoglalo(sorok) {
  kiir('');
  kiir('══════════════════════════════════════════════════════════════');
  kiir('  ÖSSZEFOGLALÓ');
  kiir('══════════════════════════════════════════════════════════════');
  kiir('');
  kiir('  esemény   | betölt+szám | heap    | ÁLLÁS/fő | 1 kör ára  | 1 mentés');
  kiir('  ----------|-------------|---------|----------|------------|----------');
  for (const s of sorok) {
    kiir('  ' + String(s.darab).padStart(9) + ' | '
      + (kerekit(s.betoltesMs + s.szamitasMs) + ' ms').padStart(11) + ' | '
      + (kerekit(s.heapMB) + ' MB').padStart(7) + ' | '
      + (kerekit(s.allasPerFo, 0) + ' B').padStart(8) + ' | '
      + bajtSzoveg(s.korAra).padStart(10) + ' | '
      + (kerekit(s.mentesMs) + ' ms').padStart(8));
  }

  kiir('');
  kiir('  MIT KELL EBBŐL KIOLVASNI:');
  kiir('   · nő-e a „1 kör ára" a mérettel? Ha igen, a globális lenyomat NEM ment meg —');
  kiir('     ez a terv C. állítása, és ez volt eddig SZÁMÍTÁS, nem mérés.');
  kiir('   · nő-e az „1 mentés" ideje? Ha igen, a beírási út NÉGYZETES, és a fal');
  kiir('     ELŐBB jön el, mint a tárolásé.');
  kiir('   · tartja-e magát a 435 B/esemény és a 162 B/e-ember?');
  kiir('');
}

// ===================================
// BELÉPŐ
// ===================================

async function fut() {
  const meretek = process.argv.slice(2).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const listak = meretek.length ? meretek : [1000, 10000, 100000];

  kiir('');
  kiir('SKÁLA-MÉRÉS — S1 a skálázási tervből (docs/skalazas_terv.md)');
  kiir('Node ' + process.version + ' · ' + process.platform);
  kiir('Méretek: ' + listak.join(', '));
  if (typeof global.gc !== 'function') {
    kiir('⚠️ A memória-adat becslés. Pontosabb: node --expose-gc koino/meres/skalaMeres.js');
  }

  const eredmenyek = [];
  for (const darab of listak) {
    const hely = join(tmpdir(), 'koino-skalameres-' + darab + '-' + Date.now());
    try {
      eredmenyek.push(await egyMeret(darab, hely));
    } finally {
      await rm(hely, { recursive: true, force: true });
    }
  }

  osszefoglalo(eredmenyek);
}

fut().catch((hiba) => {
  kiir('');
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
