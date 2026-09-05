// koino/js/muveletek.js

// Felelősség: a koino MŰVELETEI — amit egy e-ember tehet. Mindegyik ugyanazt a három
// lépést végzi: megkeresi a saját lánca végét, létrehoz egy ALÁÍRT eseményt, és elmenti.
//
// Ez a réteg köti össze a kulcsot, a láncot és a tárat. Fölötte már csak a felület van,
// alatta pedig nincs semmi, ami „engedélyezné" a műveletet — nincs szerver, aki
// jóváhagyná. Amit aláírsz, az megtörtént; hogy MI KÖVETKEZIK belőle, azt a számítás
// dönti el (D17).
//
// ===== A HÁROM ÖNHORDÓ MEZŐ (2026-08-31, a Szakasz 3 / 3.1 lépése) =====
//
// Ez a réteg TÖLTI KI a burkolat három új mezőjét, és ezért itt kell érteni, mire valók.
// Mindhárom ugyanazt a hiányt pótolja: ha a tárolást szeleteljük, a másik készülék már NEM
// látja egy szerző teljes láncát — tehát *ahol a tudás elfogy, ott az esemény hozza magával
// a bizonyítékát*.
//
//   entitas + entitasSorszam → melyik szelethez tartozom, és hányadikként (a hézag újra jel)
//   latott                   → horgony az időhöz (a visszadátumozás bizonyíthatóvá válik)
//   adat.kiosztva            → ⭐ D42: a tudatpont-keret EGYETLEN eseményből ellenőrizhető
//
// Használják: koino.js (a parancssori arc).

import { TUDATPONT_KERET } from './allapot/szabalyok.js';
import { esemenyLetrehozasa } from './esemeny/esemeny.js';
import { kanonikusBajtok } from './esemeny/kanonikusAlak.js';
import {
  esemenyMentese, lancVege, sajatLancEsemenyei,
  kovetkezoEntitasSorszam, horgonyok, esemenyLekerese
} from './tar/esemenyTar.js';

// ===== A TUDATPONT-KERET =====
// Mindenkinek UGYANANNYI tudatpontja van: nem elkölthető, csak szétosztható és bármikor
// átrendezhető.
//
// ⚠️ AZ ELLENŐRZÉS ITT KÉNYELEM, NEM VÉDELEM. Azért van, hogy ne írjunk alá olyan
// eseményt, ami sérti a keretet — de a VALÓDI őrzés a SZÁMÍTÁSBAN van (szabalyok.js),
// mert a másik gép felülete semmitől nem véd meg. A keret értéke onnan jön, egy
// példányban, hogy a kettő ne csúszhasson szét.
export { TUDATPONT_KERET };

// Hány horgonyt tegyünk egy határidő-mozgató eseményre? Egy is elég ahhoz, hogy az esemény
// bizonyíthatóan „azután" keletkezzen — és minden további horgony ~50 bájt.
const HORGONY_DARAB = 1;

// ===================================
// SEGÉD: ESEMÉNY LÉTREHOZÁSA ÉS MENTÉSE
// ===================================

/**
 * A közös váz: lánc vége → aláírt esemény → mentés.
 *
 * @param {Object} kornyezet - { koino, kulcspar, szerzo, tar }
 * @param {string} tipus
 * @param {Object} adat
 * @param {Object} [beallitas]
 * @param {string|null} [beallitas.entitas] - a SZELET-KULCS; null = az esemény a saját
 *        szeletét nyitja (koino- és tartalom-létrehozás)
 * @param {boolean} [beallitas.horgonyozzunk] - kérünk-e horgonyt (a határidőt mozgató
 *        eseményeknél igen: szavazat, tudatpont-rendezés, érték javaslat)
 * @returns {Promise<Object>} a létrehozott esemény
 */
async function esemenytTeszek(kornyezet, tipus, adat, beallitas = {}) {
  const { entitas = null, horgonyozzunk = false } = beallitas;
  console.log('muveletek.esemenytTeszek - KEZDÉS', { tipus, entitas });

  const veg = await lancVege(kornyezet.tar, kornyezet.szerzo);

  // A saját szeletét nyitó eseménynél az entitás-sorszám mindig 1 — nincs mihez képest
  // hányadiknak lennie, hiszen a szelet most keletkezik.
  const entitasSorszam = entitas === null
    ? 1
    : await kovetkezoEntitasSorszam(kornyezet.tar, kornyezet.koino, kornyezet.szerzo, entitas);

  // A horgony csak ott ér valamit, ahol van mihez kötni: a saját szeletét nyitó eseménynél
  // a szelet még üres.
  const latott = (horgonyozzunk && entitas !== null)
    ? await horgonyok(kornyezet.tar, kornyezet.koino, entitas, kornyezet.szerzo, HORGONY_DARAB)
    : [];

  const esemeny = await esemenyLetrehozasa(
    { koino: kornyezet.koino, tipus, adat, entitas, entitasSorszam, latott, ...veg },
    kornyezet.kulcspar
  );

  const eredmeny = await esemenyMentese(kornyezet.tar, esemeny);
  if (!eredmeny.mentve) {
    throw new Error('Az esemény nem menthető: ' + eredmeny.ok);
  }

  console.log('muveletek.esemenytTeszek - VÉGE', { azonosito: esemeny.azonosito });
  return esemeny;
}

// ===================================
// SEGÉD: MENNYI TUDATPONTOT OSZTOTTAM KI EDDIG? (a D42-höz)
// ===================================

/**
 * Végigmegy a SAJÁT láncon, és kiszámolja, mennyi tudatpontot osztottam ki összesen — és
 * mennyi van most az adott entitáson.
 *
 * ⚠️ MIÉRT A SAJÁT LÁNCBÓL, ÉS MIÉRT NEM AZ ÁLLAPOTBÓL? Mert pontosan ugyanazt a számítást
 * kell végeznünk, amit a `szabalyok.js` végez majd az ellenőrzéskor — különben a bemondott
 * összeg nem egyezne azzal, amit a másik gép kiszámol, és a saját eseményünk mondana
 * ellent önmagának.
 *
 * ⭐ ÉS EZ AZ, AMI A D42-t ÉRTELMESSÉ TESZI: a saját láncát MINDENKI ismeri (ő írta). A
 * másik gép viszont a szeletelés után NEM — ezért kell bemondani neki.
 *
 * @param {Object} kornyezet
 * @param {string} entitas
 * @returns {Promise<{osszeg: number, regi: number}>}
 */
async function sajatKiosztott(kornyezet, entitas) {
  const lanc = (await sajatLancEsemenyei(kornyezet.tar, kornyezet.szerzo))
    .filter((e) => e.koino === kornyezet.koino);

  const pontok = new Map();
  let osszeg = 0;

  for (const e of lanc) {
    if (e.tipus !== 'TudatpontRendezes') continue;
    const pont = e.adat?.pont;
    if (!Number.isInteger(pont) || pont < 0) continue;

    // Ugyanaz a szabály, mint a szabalyok.js-ben: a keretet túllépő esemény NEM SZÁMÍT,
    // tehát a régi érték marad érvényben.
    const regi = pontok.get(e.adat.entitas) ?? 0;
    const ujOsszeg = osszeg - regi + pont;
    if (ujOsszeg > TUDATPONT_KERET) continue;

    pontok.set(e.adat.entitas, pont);
    osszeg = ujOsszeg;
  }

  return { osszeg, regi: pontok.get(entitas) ?? 0 };
}

// ===================================
// A KOINO LÉTREHOZÁSA
// ===================================

/**
 * Létrehoz egy koinót. A Szakasz 1-ben a MINIMUMOT tartalmazza (név, leírás); a D25
 * további paraméterei (belépési szabály, hitelesítési küszöb) a bizalmi hálóval együtt
 * jönnek majd, és a D13/c szerint amúgy is entitássá válnak.
 *
 * A szelet-kulcsa `null` — vagyis a saját szeletét nyitja.
 *
 * @param {Object} kornyezet
 * @param {string} nev
 * @param {string} [leiras]
 */
export function koinoLetrehozasa(kornyezet, nev, leiras, alapitok) {
  // ⭐⭐ AZ ALAPÍTÓ KÖR — és miért nem elég egyetlen alapító.
  //
  // A 2. lépcsőhöz (pénztárca) három tanúsítás kell felhatalmazott tanúsítóktól. Egyetlen
  // alapító viszont csak EGYET tud adni, és új tanúsító sem születhetne, mert ahhoz `N`
  // felhatalmazás kellene 2. lépcsősöktől — akikből szintén csak egy van.
  // ⚠️ **A koino tehát születésétől befagyna.** Ezért nevezhet meg a létrehozás egy alapító
  // kört: ők a rekurzió ALAPESETE, nem kivétel.
  //
  // *(Ha nincs megadva, a lista üres, és csak a létrehozó alapító — a régi
  // koino-létrehozások így is érvényesek maradnak.)*
  return esemenytTeszek(kornyezet, 'KoinoLetrehozas', {
    nev,
    leiras: leiras || null,
    alapitok: Array.isArray(alapitok) ? [...alapitok] : []
  });
}

// ===================================
// A BELÉPÉS ÉS A MEGHÍVÁS — az 1. lépcső (D56)
// ===================================

/**
 * ⭐⭐ A KÖZÖS VÁZ: „állítok valamit VALAKI MÁSRÓL."
 *
 * A meghívás, a felhatalmazás és a tanúsítás **pontosan ugyanolyan alakú** — csak a
 * jelentésük más. Ezért egy helyen írjuk le, és ha az alak változik, egy helyen változik.
 *
 * Két dolog teszi ellenőrizhetővé, és mindkettő szándékos:
 *
 *   · `entitas` = a MÁSIK horgonya → az esemény az ő szeletébe kerül, tehát a „hányan
 *     állították ezt rólam?" kérdés **egyetlen szelet-lekérdezés** (3.2), akárhányan vagyunk;
 *   · `adat.sajatBelepes` = az ÉN horgonyom → aki ellenőrzi, **ne keresse** a láncomat,
 *     hanem egy lépéssel tovább tudjon menni visszafelé. *(A D42 mintája: ahol a tudás
 *     elfogy, ott az esemény hozza a bizonyítékát.)*
 *
 * ⚠️ A `kit` mező sem díszlet: enélkül egy idegen szeletébe tett esemény is beszámítana.
 * Az ellenőrzés összeveti a horgony szerzőjével.
 */
function allitokRola(kornyezet, tipus, { kit, horgonya, sajatBelepes }) {
  if (typeof kit !== 'string' || typeof horgonya !== 'string') {
    throw new Error('Kell a másik fél kulcsa és a horgonya.');
  }
  if (typeof sajatBelepes !== 'string') {
    throw new Error('Meg kell adni a SAJÁT horgonyodat is — enélkül a másik gép nem tudja '
      + 'ellenőrizni, hogy te magad jogosult vagy-e rá.');
  }
  return esemenytTeszek(kornyezet, tipus, { kit, sajatBelepes }, { entitas: horgonya });
}

/**
 * ⭐ BELÉPÉS: megnyitom a SAJÁT azonosság-szeletemet ebben a koinóban.
 *
 * Ez még nem tagság — csak annyit mond: *„ide szeretnék tartozni."* A tagság ebből és a
 * kapott meghívásokból SZÁMÍTÓDIK (`allapot/identitas.js`), nem ez az esemény adja.
 *
 * ⭐ A szelet-kulcsa `null`, tehát a saját szeletét nyitja: a szelet neve maga az esemény
 * azonosítója lesz. **Ez a horgonyom** — erre mutatnak majd a rólam szóló események
 * (meghívás, később felhatalmazás és tanúsítás), és ettől lesz a „hányan hívtak be?”
 * kérdés EGYETLEN szelet-lekérdezés.
 *
 * ⚠️ MIÉRT ÜRES AZ `adat`? Mert a **D28** szerint a tagság ténye és a személyes adatok KÉT
 * KÜLÖN esemény: a `Belepes` a tagságé, a `Profil` a névé és a lakóhelyé. Így a tagság
 * bizonyítéka nem tartalmaz személyes adatot — különben a létszám ellenőrzése egyben a
 * névsor kiadása volna.
 *
 * @param {Object} kornyezet
 * @param {string} [alapitas] - ⭐ CSAK ALAPÍTÓKNAK: a koino-létrehozás eseményének
 *        azonosítója. Aki benne van a létrehozás `alapitok` listájában, ezzel mutatja meg,
 *        hogy oda tartozik — és ő a rekurzió alapesete, meghívás nélkül.
 */
export function belepes(kornyezet, alapitas) {
  const adat = typeof alapitas === 'string' ? { alapitas } : {};
  return esemenytTeszek(kornyezet, 'Belepes', adat);
}

/**
 * ⭐ MEGHÍVÁS: behívok valakit a koinóba.
 *
 * Az esemény a MEGHÍVOTT szeletébe kerül (`entitas` = az ő horgonya), nem az enyémbe —
 * ettől lesz a „hányan hívták be X-et?” kérdés korlátos, akárhányan vagyunk.
 *
 * ⭐⭐ ÉS MAGÁVAL HOZZA A BIZONYÍTÉKÁT: az `adat.sajatBelepes` az ÉN horgonyomra mutat,
 * hogy aki ellenőrzi, ne KERESSE a láncomat, hanem egyetlen lépéssel tovább tudjon menni
 * visszafelé. Ugyanaz a minta, mint a D42 bemondott összegénél.
 *
 * ⚠️ A `kit` mező (a meghívott nyilvános kulcsa) sem díszlet: enélkül egy idegen szeletébe
 * tett meghívás is beszámítana. Az ellenőrzés összeveti a horgony szerzőjével.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok
 * @param {string} adatok.kit - a meghívott nyilvános kulcsa
 * @param {string} adatok.horgonya - a meghívott `Belepes` eseményének azonosítója
 * @param {string} adatok.sajatBelepes - a SAJÁT horgonyom (alapítónál a koino-létrehozás)
 */
export function meghivas(kornyezet, adatok) {
  return allitokRola(kornyezet, 'Meghivas', adatok);
}

/**
 * ⭐ FELHATALMAZÁS: rábízom valakire a tanúsítást (D56, D60).
 *
 * ⭐⭐ **MEGBÍZÁS, NEM PONTSZÁM.** A felületen ez így jelenik meg: *„27-en bízták rá a
 * tanúsítást"* — soha nem *„becsületesség: 27"*. A különbség nem szépészeti: egy nyilvános
 * **jellem-szám** hírnév-rendszerré romlik (amit a D18/1 kizárt és a D49/b tilt), míg ez
 * **tény**, és nem az emberről szól, hanem arról, amit **mások tettek**.
 *
 * ⚠️ Csak **2. lépcsős** felhatalmazása számít, és **emberenként egy** — a számítás
 * (`identitas.js`) ezt érvényesíti, nem ez a művelet. *A zárt választótestület nélkül a
 * támadó hamis azonosságai egymást hatalmaznák fel.*
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { kit, horgonya, sajatBelepes }
 */
export function felhatalmazas(kornyezet, adatok) {
  return allitokRola(kornyezet, 'Felhatalmazas', adatok);
}

/**
 * ⭐ TANÚSÍTÁS: a 2. lépcső — ettől lesz valakinek pénztárcája (D11, D56).
 *
 * ⚠️ **EGYETLEN, EGYFORMA MONDAT** (D45): *„létező, külön ember"*. Akárhogy győződött meg
 * róla a tanú — ismeri, kérdezett másoktól, vagy igazolványt kért —, az esemény ugyanaz.
 * **Nem lehet ráírni, hogy „igazolvánnyal ellenőrizve"**, mert akkor elkerülhetetlen volna
 * a nyomás, hogy a fontos dolgokhoz csak az „erős" fajta számítson.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { kit, horgonya, sajatBelepes }
 */
export function tanusitas(kornyezet, adatok) {
  return allitokRola(kornyezet, 'Tanusitas', adatok);
}

// ===================================
// TARTALOM LÉTREHOZÁSA
// ===================================

/**
 * Új tartalmat hoz létre.
 *
 * A MÉRET (D26) itt születik meg: a tartalom kanonikus alakjának bájthossza. Ez az az
 * adat, ami a hivatkozásban utazik majd — hogy aki tudatpontot akar rá tenni, előre
 * tudja, mekkora tárolást vállal.
 *
 * ⭐ A szelet-kulcsa `null`: a tartalom MAGA hozza létre a szeletét, és a szelet neve az
 * esemény azonosítója lesz. (A saját azonosítót nem lehetne a mezőbe írni — önmagára
 * hivatkozna —, ezért mondja ki a `szelet()` szabály, hogy a `null` ezt jelenti.)
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { cim, szoveg, szulo }
 */
export async function tartalomLetrehozasa(kornyezet, { cim, szoveg, szulo }) {
  const tartalom = {
    tipus: 'Tartalom',
    cim,
    szoveg: szoveg || null,
    szulo: szulo || null
  };

  // A méret a tartalom SAJÁT adatára vonatkozik (a burkolat és az aláírás nélkül)
  tartalom.meret = kanonikusBajtok(tartalom).length;

  return esemenytTeszek(kornyezet, 'TartalomLetrehozas', tartalom);
}

// ===================================
// TUDATPONT-RENDEZÉS
// ===================================

/**
 * Tudatpontot rendel egy entitáshoz (vagy átrendezi/elveszi).
 *
 * ⭐ A D42 ITT ÉL: az esemény magával viszi az `adat.kiosztva` mezőt — mennyi tudatpontom
 * van ÖSSZESEN kiosztva ezen esemény után. Ettől a keret EGYETLEN eseményből ellenőrizhető
 * (`kiosztva <= 10 000`), nem kell hozzá a lánc többi része.
 *
 * ⭐⭐ ÉS A CSALÁS BIZONYÍTÉKA POZITÍVVÁ VÁLIK. Aki elhallgat egy pont-eseményt, annak a
 * bemondott összege sem stimmel — és akkor KÉT SAJÁT ALÁÍRT ÁLLÍTÁSA mond ellent egymásnak.
 * Ma a bizonyíték egy HIÁNY (kétértelmű: támadás vagy lemaradás?), és nem átadható. A
 * bemondott összeggel a bizonyíték átadható: odaadom a két eseményt, bárki ellenőrzi.
 *
 * @param {Object} kornyezet
 * @param {string} entitas - az entitás azonosítója
 * @param {number} pont - egész szám; 0 = elveszem a pontomat (és ezzel a vállalást is)
 * @param {string} [szerep] - 'aktiv' (alap) vagy 'passziv' (figyelő, nem szavaz)
 * @param {number} [_marKiosztott] - ⚠️ ELAVULT: már nem használjuk, a saját láncból
 *        számoljuk (különben a bemondott összeg elcsúszhatna attól, amit az ellenőrző
 *        kiszámol). A paraméter csak a régi hívások kedvéért maradt meg.
 */
export async function tudatpontRendezese(kornyezet, entitas, pont, szerep = 'aktiv', _marKiosztott) {
  if (!Number.isInteger(pont) || pont < 0) {
    throw new Error('A tudatpont csak egész szám lehet, és nem lehet negatív.');
  }

  // A tudatpont ÁTRENDEZHETŐ: ami ezen az entitáson már ott van, az nem „új" kiadás.
  const { osszeg, regi } = await sajatKiosztott(kornyezet, entitas);
  const kiosztva = osszeg - regi + pont;

  if (kiosztva > TUDATPONT_KERET) {
    throw new Error(
      'Ennyi tudatpontod nincs. Kereted ' + TUDATPONT_KERET +
      ', ebből máshol ' + (osszeg - regi) + ' van kiosztva.'
    );
  }

  return esemenytTeszek(
    kornyezet,
    'TudatpontRendezes',
    { entitas, pont, szerep, kiosztva },
    { entitas, horgonyozzunk: true }   // a tudatpont mozgatja a részvételi arányt → a határidőt is
  );
}

// ===================================
// ÉRTÉK JAVASLAT (küszöbök)
// ===================================

/**
 * Küszöbértékeket javasol egy entitáshoz. Az érvényes küszöb a tulajdonosok
 * javaslatainak MEDIÁNJA (D4) — tehát ez nem parancs, hanem szavazat a küszöbről.
 *
 * Horgonyzunk: az érték javaslat a MIN/MAX döntési időt is átírhatja, tehát mozgatja a
 * határidőt.
 *
 * @param {Object} kornyezet
 * @param {string} entitas
 * @param {Object} ertekek - { elfogadasiKuszob, reszveteliKuszob, minimumDontesiIdo, maximumDontesiIdo }
 */
export function ertekJavaslat(kornyezet, entitas, ertekek) {
  return esemenytTeszek(
    kornyezet, 'ErtekJavaslat', { entitas, ertekek },
    { entitas, horgonyozzunk: true }
  );
}

// ===================================
// JAVASLAT
// ===================================

/**
 * Javaslatot tesz. A `fajta` dönti el, mi történik elfogadáskor (D27):
 *   'szerkesztesi' → a koino végrehajtja a változást
 *   'altalanos'    → nem történik semmi automatikusan; az egyezmény MAGA az álláspont
 *
 * A szelet-kulcs az ÉRINTETT entitás — így a javaslat és a rá adott szavazatok ugyanabban
 * a szeletben lesznek, mint a döntés többi bemenete (tudatpontok, érték javaslatok).
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { erintett, muvelet, valtozas, indoklas, fajta }
 */
export function javaslatLetrehozasa(kornyezet, { erintett, muvelet, valtozas, indoklas, fajta }) {
  return esemenytTeszek(
    kornyezet,
    'Javaslat',
    {
      fajta: fajta === 'altalanos' ? 'altalanos' : 'szerkesztesi',
      erintett,
      muvelet: muvelet || 'Modositas',
      valtozas: valtozas || null,
      indoklas: indoklas || null
    },
    { entitas: erintett }
  );
}

// ===================================
// SZAVAZAT
// ===================================

/**
 * Szavaz egy javaslatra. A szavazat MÓDOSÍTHATÓ: egy újabb szavazat-esemény felülírja a
 * korábbit (a saját láncodban az utolsó számít). Ez nem kijátszás, hanem szabály — a
 * meggondolás joga.
 *
 * ⭐ A SZELET-KULCS AZ ÉRINTETT ENTITÁS, NEM A JAVASLAT. Ez szándékos: a döntés bemenete
 * (szavazatok + tudatpont-rendezések + érték javaslatok) így EGY szeletben van együtt.
 * Aki tartja az entitást, definíció szerint tartja a döntés teljes bemenetét.
 *
 * @param {Object} kornyezet
 * @param {string} javaslat
 * @param {string} szavazat - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
 */
export async function szavazas(kornyezet, javaslat, szavazat) {
  if (!['Tamogat', 'Ellenez', 'Tartozkodik'].includes(szavazat)) {
    throw new Error('Érvénytelen szavazat: ' + szavazat);
  }

  // Melyik entitásról szól a javaslat? Ez adja a szelet-kulcsot.
  const javaslatEsemeny = await esemenyLekerese(kornyezet.tar, javaslat);
  if (!javaslatEsemeny) {
    throw new Error('Nem ismerem ezt a javaslatot: ' + javaslat);
  }
  const entitas = javaslatEsemeny.adat?.erintett ?? null;

  return esemenytTeszek(
    kornyezet, 'Szavazat', { javaslat, szavazat },
    { entitas, horgonyozzunk: true }
  );
}
