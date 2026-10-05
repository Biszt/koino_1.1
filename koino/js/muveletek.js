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

import {
  TUDATPONT_KERET, ALLASOK, pontEsemenyMerlege, javaslatEntitasai, erintettek, toredekAzonosito
} from './allapot/szabalyok.js';
// ⭐ D78 (az A pillér 2. lépése): a lánc-gyökér — a szerző esemény előtti naplója és kiosztása.
import { lancUjEsemenyhez } from './allapot/lancGyoker.js';
// ⭐ D80: az ellentmondás bizonyítéka — a bejelentés előtt magunk is ellenőrizzük.
import { ellentmondasEllenorzese } from './allapot/ellentmondas.js';
import { esemenyLetrehozasa } from './esemeny/esemeny.js';
import { kanonikusBajtok } from './esemeny/kanonikusAlak.js';
import { szovegDarabra } from './esemeny/szovegDarab.js';
// ⭐ D93: a tagság (a csomag kiadásához) és a tár-alapú lánc-gyűjtés.
import { tagsagiIndex, horgonyTagsaga, tagsagiLanc, TAGSAGI_CSOMAG } from './allapot/tagsag.js';
import {
  tagsagiEsemenyekGyujtese,
  // ⭐ D94: a 2. lépcső bemondása, és a tanúsítás bemondásának szűrése.
  lepcso2E, ervenyesTanusitasaim, alapitoHorgony, ujIdentitasNezet, LEPCSO_BEMONDAS
} from './allapot/identitas.js';
import {
  esemenyMentese, lancVege, sajatLancEsemenyei,
  kovetkezoEntitasSorszam, horgonyok, esemenyLekerese, entitasEsemenyei, koinoEsemenyei
} from './tar/esemenyTar.js';
import { allapotSzamitasa } from './allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from './allapot/javaslatSzamitas.js';
import {
  CSOMAG_TIPUS, CSOMAG_BAJT_KORLAT, dontesBemenete, celbolHianyzik, csomagokra, bajt
} from './allapot/dontesiCsomag.js';

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

// ⭐ A TANÚSÍTÁSNÁL TÖBB HORGONY KELL. Nem az időt kötjük meg vele, hanem azt bizonyítjuk,
// *kitől meddig láttam* a rólam szóló eseményeket — és ehhez több felhatalmazótól kell
// friss pontot fognunk. Az ár ~50 bájt horgonyonként.
const TANUSITAS_HORGONY = 5;

// ⭐ A BULI-ELISMERÉSNÉL többet fogunk, mert ez a rendszeres, „hivatalos" pont: ez köti el a
// legszorosabban, meddig látok. Az ára ~50 bájt horgonyonként, körönként egyszer.
const ELISMERES_HORGONY = 12;

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
 *        szeletét nyitja (koino- és gondolat-létrehozás)
 * @param {boolean} [beallitas.horgonyozzunk] - kérünk-e horgonyt (a határidőt mozgató
 *        eseményeknél igen: szavazat, tudatpont-rendezés, érték javaslat)
 * @returns {Promise<Object>} a létrehozott esemény
 */
/**
 * ⭐ D72 (2026-09-26): A SZÖVEG KÜLÖN DARAB. A szöveg bájtjai a környezet darab-tárába
 * (`kornyezet.darabTar` — a fájl-tár, ahol a képek is) kerülnek, és a HIVATKOZÁS jön vissza,
 * amit az esemény hordoz.
 *
 * ⚠️ ELŐBB A DARAB, CSAK UTÁNA AZ ESEMÉNY: így egy aláírt esemény soha nem hivatkozik olyan
 * darabra, ami a saját gépünkön nincs meg. (Ha az esemény mentése utána bukik, a darab
 * árván marad — ártalmatlan: a neve a tartalma.)
 *
 * ⛔ HA NINCS DARAB-TÁR, NEM TESSZÜK A SZÖVEGET CSENDBEN AZ ESEMÉNYBE — megnevezett hibával
 * leállunk. *Egy elhallgatott döntés-szegés rosszabb, mint egy megtagadott művelet.*
 *
 * @param {Object} kornyezet
 * @param {string|Array|Object|null} szoveg
 * @returns {Promise<Object|null>} a hivatkozás (vagy null, ha nincs szöveg)
 */
async function szovegDarabbaTetele(kornyezet, szoveg) {
  const { hivatkozas, bajtok } = await szovegDarabra(szoveg);
  if (!bajtok) return hivatkozas;
  if (!kornyezet.darabTar) {
    throw new Error('A szöveg külön darab (D72) — ehhez a környezetben darab-tár kell (darabTar).');
  }
  const irt = await kornyezet.darabTar.ir(bajtok);
  if (irt.lenyomat !== hivatkozas.lenyomat) {
    throw new Error('A darab-tár más lenyomatot adott, mint a szövegé — nem írunk alá rá hivatkozást.');
  }
  return hivatkozas;
}

async function esemenytTeszek(kornyezet, tipus, adat, beallitas = {}) {
  const { entitas = null } = beallitas;
  console.log('muveletek.esemenytTeszek - KEZDÉS', { tipus, entitas });

  // ⛔⛔ D70 (2026-09-26): A TÁR MÖGÖTT AZ ÍRÓ ÁLL. Egy készüléken több folyamat ír a saját
  // láncunkba (az őrjárat felszabadítása, a második ablak parancsa, a felület); az író a SAJÁT
  // új eseményt csak a lánc VÉGÉRE engedi. Ha közben egy másik folyamat írt, a válasz
  // „ELAVULT": frissítünk, és a lánc új végéről újra aláírunk. *Elágazás így nem születhet.*
  //
  // ⚠️ Az ADAT is újraszámolódhat (függvényként adva): a tudatpont bemondott összege a saját
  // láncból jön — egy közben beírt pont-esemény után a régi összeg hazudna (D42).
  for (let kiserlet = 1; ; kiserlet++) {
    // ⭐ EGY PILLANATKÉP próbálkozásonként: előbb amit MÁS folyamat írt (43. mérés), és utána
    // ugyanebből jön az adat (a bemondott összeg) ÉS a lánc vége. ⛔ Ha a kettő közé egy
    // frissítés esne, az összeg és a hely két különböző állapotról beszélne.
    await kornyezet.tar.frissit?.();
    const adatMost = typeof adat === 'function' ? await adat() : adat;
    const esemeny = await esemenyAlairasa(kornyezet, tipus, adatMost, beallitas);
    let eredmeny;
    try {
      eredmeny = await esemenyMentese(kornyezet.tar, esemeny, { ujSajat: true });
    } catch (hiba) {
      if (hiba.kod === 'ELAVULT' && kiserlet < ELAVULT_PROBAK) {
        console.log('muveletek.esemenytTeszek - elavult lánc-vég, újra', { kiserlet });
        continue;
      }
      throw hiba;
    }
    if (!eredmeny.mentve) {
      throw new Error('Az esemény nem menthető: ' + eredmeny.ok);
    }
    console.log('muveletek.esemenytTeszek - VÉGE', { azonosito: esemeny.azonosito });
    return esemeny;
  }
}

/**
 * Egy szerző AZONOSSÁG-HORGONYA ebben a koinóban (D56): az alapítóé a `KoinoLetrehozas`, mindenki
 * másé a (legkorábbi) `Belepes` eseménye. ⚠️ A tárban lévő láncából — ha nincs meg, null (D19).
 * @returns {Promise<string|null>}
 */
export async function azonossagHorgonya(tar, koino, szerzo) {
  const lanc = (await sajatLancEsemenyei(tar, szerzo)).filter((e) => e.koino === koino);
  const belepes = lanc.find((e) => e.tipus === 'Belepes');
  if (belepes) return belepes.azonosito;
  return lanc.find((e) => e.tipus === 'KoinoLetrehozas')?.azonosito ?? null;
}

/**
 * ⭐⭐ AZ ELLENTMONDÁS BEJELENTÉSE (D80) — a bizonyíték a VÁDOLT azonosság-szeletébe kerül (mint a
 * meghívás és a tanúsítás a másikéba), mert aki a pontjait számolja, az oda úgyis ránéz.
 *
 * ⚠️ Előbb MAGUNK ellenőrizzük: hamis vádat nem írunk alá (a kapu amúgy is elutasítaná).
 *
 * @param {Object} kornyezet
 * @param {Object} adat - a bizonyíték (`ellentmondas.js`: kit, fajta, vadpont, és a fajta anyaga)
 */
export async function ellentmondasBejelentese(kornyezet, adat) {
  const vad = await ellentmondasEllenorzese(adat, kornyezet.koino);
  if (!vad.rendben) throw new Error('A bizonyíték nem áll meg: ' + vad.ok);
  const horgony = await azonossagHorgonya(kornyezet.tar, kornyezet.koino, adat.kit);
  if (!horgony) {
    throw new Error('A vádoltnak nincs azonosság-szelete ebben a koinóban (se Belepes, se '
      + 'KoinoLetrehozas nálunk) — a bizonyíték nem helyezhető el (D80).');
  }
  return esemenytTeszek(kornyezet, 'Ellentmondas', adat, { entitas: horgony });
}

/**
 * ⭐⭐ AZ ÉSZLELT ELLENTMONDÁSOK BEJELENTÉSE (D82 sorrend ①) — az észlelő (`allapot/eszlelo.js`)
 * leletei, egyenként a vádolt azonosság-szeletébe. ⭐ Nem ismétli magát: ha a szeletben már ott van
 * ugyanez a bizonyíték (ugyanaz a fajta, ugyanaz a vádpont vagy vesztes), kihagyja — így az őrjárat
 * minden körben nyugodtan kereshet. Akinek nincs nálunk horgonya, arról most nem jelentünk (a
 * bizonyíték nem helyezhető el — D80), csak számoljuk.
 *
 * @param {Object} kornyezet
 * @param {Array<Object>} leletek - `Ellentmondas` adatok
 * @returns {Promise<{bejelentve: number, marVolt: number, nincsHorgony: number}>}
 */
export async function ellentmondasokBejelentese(kornyezet, leletek) {
  let bejelentve = 0, marVolt = 0, nincsHorgony = 0;
  for (const adat of leletek) {
    const horgony = await azonossagHorgonya(kornyezet.tar, kornyezet.koino, adat.kit);
    if (!horgony) { nincsHorgony++; continue; }
    const ugyanaz = (x) => x.tipus === 'Ellentmondas' && x.adat?.kit === adat.kit && x.adat?.fajta === adat.fajta
      && (adat.fajta === 'elagazas' ? x.adat?.vesztes === adat.vesztes : x.adat?.vadpont === adat.vadpont);
    if ((await kornyezet.tar.szeletEsemenyei(horgony)).some(ugyanaz)) { marVolt++; continue; }
    await ellentmondasBejelentese(kornyezet, adat);
    bejelentve++;
  }
  return { bejelentve, marVolt, nincsHorgony };
}

// ⭐ Ennyiszer próbálunk újra, ha közben más folyamat írt a láncunkba. ⚠️ Nem várt verseny
// esetén egy-kettő; a korlát csak azért van, hogy semmi ne pörögjön a végtelenségig.
const ELAVULT_PROBAK = 20;

/**
 * A lánc mostani végéről aláír egy saját eseményt (még nem menti).
 * ⚠️ Nem frissít: a pillanatképet a hívó készíti (lásd fent).
 */
async function esemenyAlairasa(kornyezet, tipus, adat, beallitas) {
  const { entitas = null, horgonyozzunk = false } = beallitas;
  const veg = await lancVege(kornyezet.tar, kornyezet.szerzo);

  // A saját szeletét nyitó eseménynél az entitás-sorszám mindig 1 — nincs mihez képest
  // hányadiknak lennie, hiszen a szelet most keletkezik.
  const entitasSorszam = entitas === null
    ? 1
    : await kovetkezoEntitasSorszam(kornyezet.tar, kornyezet.koino, kornyezet.szerzo, entitas);

  // A horgony csak ott ér valamit, ahol van mihez kötni: a saját szeletét nyitó eseménynél
  // a szelet még üres.
  //
  // ⭐⭐ ÉS EGY MÁSODIK HORGONY-CÉL (9/c 4.5): a tanúsításnál NEM a másik szeletébe
  // horgonyzunk, hanem a SAJÁTUNKBA — mert ott van az, amit bizonyítani kell: *meddig
  // láttam a rólam szóló felhatalmazásokat és visszavonásokat.*
  const horgonySzelet = beallitas.horgonySzelet ?? entitas;
  const latott = (horgonyozzunk && horgonySzelet)
    ? await horgonyok(kornyezet.tar, kornyezet.koino, horgonySzelet, kornyezet.szerzo,
                      beallitas.horgonyDarab ?? HORGONY_DARAB)
    : [];

  // ⚠️ AZ IDŐ ÁTADHATÓ, ÉS EGYETLEN OKBÓL (5.7): ha két esemény **egy tett** (a javaslat
  // és a javaslattevő támogatása), akkor egy időbélyeget kell viselniük. ⛔ Különben nulla
  // döntési időnél a szavazat **késői** lenne — a javaslat a születése pillanatában zár,
  // és az egy ezredmásodperccel későbbi szavazat már nem számít bele (mérve).
  //
  // ⭐ Nem óra-hamisítás: a saját láncomban az idő nem lép VISSZA, csak áll egy pillanatra.
  //
  // ⭐⭐ D78, D81: A LÁNC-GYÖKÉR — az új esemény a szerző ESEMÉNY ELŐTTI naplóját (a kettős lánc a
  // szeletek között is lelepleződik, D63) és kiosztását hordozza; a PONT-esemény az entitása régi
  // értékének bizonyítékát is (D81: a bizonyíték az eseménnyel utazik — a bemondott összeg a szerző
  // nélkül is ellenőrizhető, D42). Ha a saját lánc nem ép, null (mint a D78 előtti eseményeké).
  const pontEntitas = tipus === 'TudatpontRendezes' && typeof adat?.entitas === 'string' ? adat.entitas : null;
  // ⭐ D85/2 (T2): a SZAVAZAT a jogának bizonyítékát hozza — részenként az érintettre és a
  // javaslat-entitásra (a `szavazas` adja meg a kulcsokat).
  // ⭐ D85 T3 előfeltétele: a JAVASLAT is — érintettenként a javaslattevő pontjára.
  const szavazatKulcsok = (tipus === 'Szavazat' || tipus === 'Javaslat') && Array.isArray(beallitas.bizonyitekKulcsok)
    && beallitas.bizonyitekKulcsok.length ? beallitas.bizonyitekKulcsok : null;
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(kornyezet.tar, kornyezet.koino, kornyezet.szerzo,
    veg.sorszam, kornyezet.lancTarolo ?? null, pontEntitas ?? szavazatKulcsok);
  const vegsoAdat = (pontEntitas || szavazatKulcsok) && bizonyitek ? { ...adat, bizonyitek } : adat;
  return esemenyLetrehozasa(
    { koino: kornyezet.koino, tipus, adat: vegsoAdat, entitas, entitasSorszam, latott, lancGyoker,
      ...(beallitas.ido !== undefined ? { ido: beallitas.ido } : {}), ...veg },
    kornyezet.kulcspar
  );
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

  const allas = { osszeg: 0, pontok: new Map() };
  // ⭐ A folytonosságot is ugyanúgy követjük, mint a szabály (a saját láncunk rendes esetben
  // hézagtalan — de ha nem, az ítéletnek akkor is egyeznie kell).
  let folytonos = true;
  let vartSorszam = 1;

  for (const e of lanc) {
    if (e.sorszam !== vartSorszam) folytonos = false;
    vartSorszam = e.sorszam + 1;
    if (e.tipus !== 'TudatpontRendezes') continue;

    // ⛔⛔ UGYANAZ AZ ÍTÉLET, NEM A MÁSOLATA (2026-09-26, 43. mérés): a szabály-réteg
    // függvényét hívjuk. Egy korábbi saját másolat az ELVETETT bemondást (pl. egy régi,
    // `kiosztva` nélküli eseményt) beleszámolta — és onnantól minden új pont-eseményünk
    // „ellentmondott a saját láncának".
    const merleg = pontEsemenyMerlege(e, allas, folytonos);
    if (merleg.elvetve) continue;   // ami nem számít, az a régi értéket hagyja érvényben
    allas.pontok.set(merleg.entitas, merleg.pont);
    allas.osszeg = merleg.ujOsszeg;
  }

  return { osszeg: allas.osszeg, regi: allas.pontok.get(entitas) ?? 0 };
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
export function koinoLetrehozasa(kornyezet, nev, leiras, alapitok, beallitas = {}) {
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
    alapitok: Array.isArray(alapitok) ? [...alapitok] : [],
    // ⭐⭐ D89/2 (Csaba, 2026-10-02/03): ZÁRT vagy NYÍLT — a létrehozáskor dől el, és nem változtatható.
    // Alapból ZÁRT (a nyílthoz ki kell mondani). A zárt koinó tartalmát a készülék csak tagnak adja ki —
    // ⚠️ a betartatás az E-vel jön (a tag a kézfogásban bizonyítja magát); addig a mező ott van, de nem tilt.
    zart: beallitas.zart !== false,
    // ⭐ D93/5 (D28/3): a koinó kötelező profil-mezői (pl. ['nev', 'telepules']) — ha nincs, a koinó nem vár profilt.
    ...(Array.isArray(beallitas.profil) && beallitas.profil.length ? { profil: [...beallitas.profil] } : {})
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
function allitokRola(kornyezet, tipus, { kit, horgonya, sajatBelepes, profil, felhatalmazasok }, beallitas = {}) {
  if (typeof kit !== 'string' || typeof horgonya !== 'string') {
    throw new Error('Kell a másik fél kulcsa és a horgonya.');
  }
  if (typeof sajatBelepes !== 'string') {
    throw new Error('Meg kell adni a SAJÁT horgonyodat is — enélkül a másik gép nem tudja '
      + 'ellenőrizni, hogy te magad jogosult vagy-e rá.');
  }
  // ⭐ D93/5: a meghívás megnevezheti a meghívott profiljának lenyomatát (a meghívó ezzel tanúsítja a nevet — D28/2).
  const adat = { kit, sajatBelepes, ...(tipus === 'Meghivas' && typeof profil === 'string' ? { profil } : {}),
    // ⛔ A TANÚSÍTÁS BEMONDÁSA (D47) — 2026-10-04-ig ITT ELVESZETT (a 9/c 4.5 óta csak `{ kit, sajatBelepes }` ment ki), így
    // egy nem alapító tanúsító kézi tanúsítása soha nem számított („nem mondta be, mire támaszkodott”). A D94 próbája találta.
    ...(tipus === 'Tanusitas' && Array.isArray(felhatalmazasok) ? { felhatalmazasok } : {}) };
  return esemenytTeszek(kornyezet, tipus, adat,
    { entitas: horgonya, horgonyozzunk: !!beallitas.horgonySzelet, ...beallitas });
}

/**
 * ⭐⭐ D93/5: A PROFIL (D28 a D88 alakjában) — a darab (a koinó kötelező mezői + egy véletlen só) a fájl-tárba kerül,
 * az esemény (a SAJÁT azonosság-szeletembe) csak a darab lenyomatát hordozza: só nélkül egy név kitalálható volna,
 * így nem. A törlés: a darabot senki nem szolgálja ki tovább (D88/2); az utolsó Profil számít (D28/3).
 * @param {Object} kornyezet - { tar, koino, kulcspar, darabTar }
 * @param {Object} mezok - pl. { nev, telepules }
 * @returns {Promise<Object>} a Profil esemény
 */
export async function profilMegadasa(kornyezet, mezok) {
  const horgony = await azonossagHorgonya(kornyezet.tar, kornyezet.koino, kornyezet.szerzo);
  if (!horgony) throw new Error('Előbb lépj be (belep) — a profil a saját azonosság-szeletedbe kerül.');
  if (!kornyezet.darabTar) throw new Error('A profil külön darab (D88) — ehhez darab-tár kell (darabTar).');
  const tiszta = {};
  for (const [k, v] of Object.entries(mezok ?? {})) if (/^[a-z]{1,32}$/.test(k) && typeof v === 'string') tiszta[k] = v.normalize('NFC');
  const so = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64url');
  const bajtok = kanonikusBajtok({ mezok: tiszta, so });
  const { lenyomat } = await kornyezet.darabTar.ir(bajtok);
  return esemenytTeszek(kornyezet, 'Profil', { lenyomat }, { entitas: horgony });
}

/**
 * ⭐⭐ D93/2: A TAGSÁGI CSOMAG KIADÁSA — ha tag vagyok, a legrövidebb láncom eseményeinek másolata a SAJÁT
 * azonosság-szeletembe (a D85 T3 mintája). Ha már van ugyanilyen (vagy rövidebb) csomagom, nem írok újat.
 * @returns {Promise<{kiadva: boolean, ok: string, melyseg?: number, esemeny?: Object}>}
 */
/** ⭐ D94: a folyamat emléke — melyik tanúsítás-halmazt néztük már végig (koinó + horgony → az azonosítók). */
const LEPCSO_BEMONDAS_EMLEK = new Map();

/**
 * ⭐⭐ D94: A 2. LÉPCSŐ BEMONDÁSA — a 2. lépcsős a SAJÁT azonosság-szeletébe aláírva bemondja, mely tanúsításaira
 * támaszkodik (a D47 mintája: a tanúsító a felhatalmazásait mondja be). A szúrópróba CSAK ezt követi — a szeletbe
 * szórt állításokat nem. ⭐ Csak a TÉNYLEG érvényes tanúsítások kerülnek bele (tanúsítónként egy): a szúrópróba minden
 * bemondott tételt megkövetel. Ha a lista nem változott, nem ad ki újat; az alapítónak nem kell.
 * @returns {Promise<{kiadva: boolean, ok: string, esemeny?: Object}>}
 */
export async function lepcsoBemondasKiadasa(kornyezet) {
  const horgony = await azonossagHorgonya(kornyezet.tar, kornyezet.koino, kornyezet.szerzo);
  if (!horgony) return { kiadva: false, ok: 'nincs horgonyom (belep)' };
  if (await alapitoHorgony(kornyezet.tar, kornyezet.koino, horgony)) {
    return { kiadva: false, ok: 'alapító — a 2. lépcsőm a koinó létrehozásából következik' };
  }
  // ⚠️ Az őrjárat minden körben hív: ha a szeletemben lévő tanúsítások halmaza azóta nem változott, nem számolunk újra
  // (különben egy odaszórt hamis tanúsítás minden körben teljes újraszámolást váltana ki). Folyamatonkénti emlék.
  const sajatTanusitasok = (await entitasEsemenyei(kornyezet.tar, kornyezet.koino, horgony))
    .filter((e) => e.tipus === 'Tanusitas').map((e) => e.azonosito).sort().join(',');
  const emlekKulcs = kornyezet.koino + '|' + horgony;
  if (LEPCSO_BEMONDAS_EMLEK.get(emlekKulcs) === sajatTanusitasok) {
    return { kiadva: false, ok: 'a tanúsításaim nem változtak' };
  }
  const tanusitasok = await ervenyesTanusitasaim(kornyezet.tar, kornyezet.koino, horgony, ujIdentitasNezet());
  LEPCSO_BEMONDAS_EMLEK.set(emlekKulcs, sajatTanusitasok);
  if (!tanusitasok.length) return { kiadva: false, ok: 'még nincs elég érvényes tanúsításom' };
  const regi = (await entitasEsemenyei(kornyezet.tar, kornyezet.koino, horgony))
    .filter((e) => e.tipus === LEPCSO_BEMONDAS && e.szerzo === kornyezet.szerzo)
    .sort((a, b) => b.sorszam - a.sorszam)[0];
  const ugyanaz = regi && regi.adat.tanusitasok.length === tanusitasok.length
    && tanusitasok.every((t) => regi.adat.tanusitasok.includes(t));
  if (ugyanaz) return { kiadva: false, ok: 'már bemondtam (' + tanusitasok.length + ' tanúsítás)' };
  const esemeny = await esemenytTeszek(kornyezet, LEPCSO_BEMONDAS, { tanusitasok }, { entitas: horgony });
  return { kiadva: true, ok: 'bemondva (' + tanusitasok.length + ' tanúsítás)', esemeny };
}

/**
 * ⭐ D95/1: A LEZÁRÁSI ÖSSZEGZÉS KIADÁSA — a nagy szelet TELJES tartója (az önkéntes) adja ki egy lezárt döntésről; a
 * javaslat szeletébe kerül, és az érintetthez bejelentődik (`esemeny.js`). A tartalmát az összegző tartó a mintákkal
 * ellenőrzi — az aláírás csak azt mondja meg, ki adta ki.
 * @param {Object} kornyezet
 * @param {Object} osszegzes - `lezarasiOsszegzesEpitese` összegzése
 */
export function lezarasiOsszegzesKiadasa(kornyezet, osszegzes) {
  return esemenytTeszek(kornyezet, 'LezarasiOsszegzes', osszegzes, { entitas: osszegzes.javaslat });
}

export async function tagsagiCsomagKiadasa(kornyezet) {
  const szerzo = kornyezet.szerzo;
  const horgony = await azonossagHorgonya(kornyezet.tar, kornyezet.koino, szerzo);
  if (!horgony) return { kiadva: false, ok: 'nincs horgonyom (belep)' };
  const esemenyek = await tagsagiEsemenyekGyujtese(kornyezet.tar, kornyezet.koino, horgony);
  const idx = tagsagiIndex(esemenyek, kornyezet.koino);
  const r = horgonyTagsaga(idx, horgony);
  if (!r.igen) return { kiadva: false, ok: r.ok };
  if (r.melyseg === 0) return { kiadva: false, ok: 'alapító — a láncom maga a koinó létrehozása', melyseg: 0 };
  const lanc = tagsagiLanc(idx, horgony);
  // Van-e már legalább ilyen rövid csomagom (a meglévő csomag mélysége a saját láncából számítható)?
  for (const e of esemenyek) {
    if (e.tipus !== TAGSAGI_CSOMAG || e.szerzo !== szerzo || e.entitas !== horgony) continue;
    const m = horgonyTagsaga(tagsagiIndex(e.adat.lanc, kornyezet.koino), horgony);
    if (m.igen && m.melyseg <= r.melyseg) return { kiadva: false, ok: 'már van csomagom (' + m.melyseg + '. szint)', melyseg: m.melyseg };
  }
  const esemeny = await esemenytTeszek(kornyezet, TAGSAGI_CSOMAG, { lanc }, { entitas: horgony });
  return { kiadva: true, ok: 'kiadva (' + r.melyseg + '. szint, ' + lanc.length + ' esemény)', melyseg: r.melyseg, esemeny };
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
export async function tanusitas(kornyezet, adatok) {
  // ⭐⭐ A BEMONDÁS (D42-minta): a tanúsítás magával viszi, MIRE TÁMASZKODOTT — azoknak a
  // felhatalmazásoknak az azonosítóit, amik aláíráskor érvényben voltak.
  //
  // ⚠️ MIÉRT KELL? Mert a **visszavonás** (4.5) csak ELŐRE hat: aki elveszíti a megbízást,
  // az többet nem tanúsíthat, de a **már kiadott tanúsításai érvényben maradnak** (D47).
  // Globális óra nélkül ezt csak úgy lehet ellenőrizni, ha az esemény maga mondja meg, mi
  // volt igaz akkor — és az események soha nem tűnnek el, tehát a bemondás örökre
  // ellenőrizhető. *Enélkül néhány ember összebeszélve becsületes emberek tömegétől venné
  // el a pénztárcát.*
  const felhatalmazasok = adatok.felhatalmazasok
    ?? await sajatFelhatalmazasaim(kornyezet, adatok.sajatBelepes);

  // ⭐⭐ ÉS A HORGONY A SAJÁT SZELETEMBE (9/c 4.5, Csaba kérdése nyomán).
  //
  // A bemondás önmagában nem elég: aki elveszítette a megbízását, a RÉGI felhatalmazásokra
  // hivatkozva tovább tanúsíthatna. Ezért az esemény azt is elköti, **meddig láttam a
  // rólam szóló eseményeket** — és ha egy visszavonás ezen belülre esik, akkor
  // **bizonyíthatóan tudtam róla**, mégis aláírtam.
  //
  // ⚠️ Amit ez NEM zár le: aki szándékosan RÉGI horgonyt választ. ⭐ Azt a **buli** teszi
  // feltűnővé (D61): ha mindenki minden körben horgonyoz, az elavult horgony nem „gyanús",
  // hanem kilóg egy ritmusból, amit mindenki más tart.
  return allitokRola(kornyezet, 'Tanusitas', { ...adatok, felhatalmazasok },
    { horgonySzelet: adatok.sajatBelepes, horgonyDarab: TANUSITAS_HORGONY });
}

/**
 * ⭐⭐ BEMUTATKOZÁS: „találkoztunk" (9/c 4.6, D62).
 *
 * Olcsóbb és sűrűbb állítás, mint a tanúsítás: nem azt mondja, hogy *„létező, külön ember"*,
 * csak azt, hogy **találkoztunk**. Ettől a közösség társas hálója **láthatóvá** válik — és
 * ez az, ami a kontraszt-jelzést élessé teszi.
 *
 * ⭐⭐ MIÉRT KELL KÖLCSÖNÖSNEK LENNIE? Mert **egyoldalúan bárki bármit állíthat**: ha az én
 * puszta bejegyzésem számítana, a támadó **ingyen gyártana sűrűséget** — pont azt, amit a
 * jelzés keres. Ezért egy bemutatkozás csak akkor számít, ha **mindkét fél aláírta**.
 *
 * ⭐ ÉS A KÖLCSÖNÖSSÉG ELLENŐRZÉSÉHEZ NEM KELL ÚJ LEKÉRDEZÉS. Két meglévő kérdés metszete:
 *
 *     „ki állította, hogy találkozott velem?"  → az én SZELETEM (3.2)
 *     „kiről állítottam én ugyanezt?"          → a saját LÁNCOM
 *
 * ⚠️ EZ LÁNC-ESEMÉNY, NEM HELYI LISTA — *Csaba döntése (2026-09-06), a **D50** felülírása.*
 * A korábbi „ne legyen belőle társas térkép" aggály **nem Csabáé volt**, hanem Claude-é; a
 * **D55** (nyíltság) óta a bemutatkozás vállalt dolog. ⭐ És a szeletelés (Szakasz 3) miatt
 * a lépték sem esik el: fejenként pár száz esemény a SAJÁT szeletben, és senki nem tárolja
 * az egészet — csak azt kéred le, akire ránézel.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { kit, horgonya, sajatBelepes }
 */
export function bemutatkozas(kornyezet, adatok) {
  return allitokRola(kornyezet, 'Bemutatkozas', adatok);
}

/**
 * ⭐⭐ „ESZERINT LÁTOK" — a buli-elismerés (D61, Csaba ötlete).
 *
 * A bulikörben mindenki aláírja, **meddig lát** a saját szeletében: a `latott` mezőbe a
 * rólam szóló legfrissebb események kerülnek (felhatalmazások, visszavonások, tanúsítások).
 *
 * ⭐⭐⭐ MIÉRT EZ ZÁRJA BE A RÉST? Mert a **saját láncomban VAN sorrend** (a `sorszam`, amit
 * csak én írhatok). Ha egyszer aláírtam, hogy egy visszavonást láttam, akkor minden KÉSŐBBI
 * saját eseményem — a lánc sorszáma szerint — **bizonyíthatóan azután** keletkezett. Nincs
 * szükség globális órára: elég a saját láncom rendje.
 *
 * ⚠️ ÉS EZ NEM KÜLSŐ IGAZSÁG, HANEM SAJÁT ÁLLÍTÁS. Senki nem kényszerít rám semmit: én
 * mondom meg, meddig látok. Aki offline volt, nem ír alá semmit — rá nem vonatkozik, és nem
 * is büntetjük érte (D19). ⭐ Aki viszont SOHA nem ír alá ilyet, miközben mindenki más
 * minden körben igen, az **kilóg a ritmusból** — és azt a jelzés mutatja meg, nem a szabály.
 *
 * @param {Object} kornyezet
 * @param {string} sajatBelepes - a saját horgonyom
 */
export function lattam(kornyezet, sajatBelepes) {
  if (typeof sajatBelepes !== 'string') {
    throw new Error('Az elismeréshez meg kell adni a saját horgonyodat.');
  }
  return esemenytTeszek(kornyezet, 'Lattam', {}, {
    entitas: sajatBelepes,
    horgonyozzunk: true,
    horgonySzelet: sajatBelepes,
    horgonyDarab: ELISMERES_HORGONY
  });
}

/**
 * ⭐ VISSZAVONOM A FELHATALMAZÁST (9/c 4.5).
 *
 * A felhatalmazás **az enyém**: én adtam, én veszem vissza — egyoldalúan, indoklás nélkül.
 * ⚠️ A tanúsítás NEM ilyen: az állítás a múltról, azt nem lehet visszavonni (D46) — mert
 * ha lehetne, néhány ember összebeszélve bárkit kiléptethetne utólag.
 *
 * ⭐ A számítás „az utolsó nyer" mintát követi (mint a tudatpont): ha a legutóbbi
 * állításom róla visszavonás, akkor nincs érvényben a felhatalmazásom.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { kit, horgonya, sajatBelepes }
 */
export function felhatalmazasVisszavonasa(kornyezet, adatok) {
  return allitokRola(kornyezet, 'FelhatalmazasVisszavonasa', adatok);
}

/**
 * A saját, ÉRVÉNYBEN LÉVŐ felhatalmazásaim azonosítói — a tanúsítás bemondásához.
 *
 * ⚠️ „Az utolsó nyer": akinek a legutóbbi állítása rólam visszavonás, azt kihagyjuk.
 * Ugyanaz a szabály, amit az `identitas.js` alkalmaz az ellenőrzéskor — és azért itt is
 * leírjuk, mert a kettőnek egyeznie kell, különben a saját eseményünk mondana ellent
 * önmagának (a D42 tanulsága).
 */
async function sajatFelhatalmazasaim(kornyezet, sajatBelepes) {
  if (typeof sajatBelepes !== 'string') return [];
  const szelet = await entitasEsemenyei(kornyezet.tar, kornyezet.koino, sajatBelepes);

  const utolso = new Map();   // felhatalmazó → { sorszam, azonosito, vissza }
  for (const e of szelet) {
    if (e.tipus !== 'Felhatalmazas' && e.tipus !== 'FelhatalmazasVisszavonasa') continue;
    if (e.adat?.kit !== kornyezet.szerzo) continue;
    const sorszam = e.entitasSorszam ?? 1;
    const eddigi = utolso.get(e.szerzo);
    if (!eddigi || sorszam >= eddigi.sorszam) {
      utolso.set(e.szerzo, {
        sorszam,
        azonosito: e.azonosito,
        esemeny: e,
        vissza: e.tipus === 'FelhatalmazasVisszavonasa'
      });
    }
  }

  const azonositok = [];
  // ⭐ D94: csak az a felhatalmazás kerül a bemondásba, akinek a felhatalmazója 2. LÉPCSŐS (ellenőrizve) — a szúrópróba
  // minden bemondott tételt megkövetel, és a szeletembe bárki tehet felhatalmazást.
  const nezet = ujIdentitasNezet();
  for (const [, allapot] of utolso) {
    if (allapot.vissza) continue;
    const ado = allapot.esemeny.adat?.sajatBelepes;
    if (typeof ado === 'string' && (await lepcso2E(kornyezet.tar, kornyezet.koino, ado, nezet)).igen) {
      azonositok.push(allapot.azonosito);
    }
  }
  return azonositok;
}

// ===================================
// GONDOLAT LÉTREHOZÁSA
// ===================================

/**
 * Új gondolatot hoz létre.
 *
 * A MÉRET (D26) itt születik meg: a gondolat kanonikus alakjának bájthossza. Ez az az
 * adat, ami a hivatkozásban utazik majd — hogy aki tudatpontot akar rá tenni, előre
 * tudja, mekkora tárolást vállal.
 *
 * ⭐ A szelet-kulcsa `null`: a gondolat MAGA hozza létre a szeletét, és a szelet neve az
 * esemény azonosítója lesz. (A saját azonosítót nem lehetne a mezőbe írni — önmagára
 * hivatkozna —, ezért mondja ki a `szelet()` szabály, hogy a `null` ezt jelenti.)
 *
 * ⭐ BESOROLÁS (5.4): a gondolat megkaphat EGY gondolattípust és LEGFELJEBB HÁROM
 * kategóriát. Mindkettő önálló entitásra mutató azonosító — a korlátot a `szabalyok.js`
 * érvényesíti, nem ez a függvény. *A művelet-réteg kényelmet ad, a szabály-réteg véd.*
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { cim, szoveg, szulo, gondolatTipus, kategoriak }
 */
export async function gondolatLetrehozasa(
  kornyezet, { cim, szoveg, szulo, gondolatTipus, kategoriak }
) {
  const gondolat = {
    tipus: 'Gondolat',
    cim,
    // ⭐ D72: a szöveg KÜLÖN DARAB — az esemény csak a hivatkozást hordozza (szovegDarab.js).
    szoveg: await szovegDarabbaTetele(kornyezet, szoveg || null),
    szulo: szulo || null,
    gondolatTipus: gondolatTipus || null,
    kategoriak: Array.isArray(kategoriak) ? kategoriak : []
  };

  // A méret a gondolat SAJÁT adatára vonatkozik (a burkolat és az aláírás nélkül) — ⭐ D72: a
  // külön darab is beleszámít, mert a tartó azt is tárolja (D26: a tárolási vállalás mértéke).
  gondolat.meret = kanonikusBajtok(gondolat).length + (gondolat.szoveg?.bajt ?? 0);

  return esemenytTeszek(kornyezet, 'GondolatLetrehozas', gondolat);
}

// ===================================
// KATEGÓRIA ÉS GONDOLATTÍPUS (Szakasz 5.4)
// ===================================
//
// ⭐⭐ EZ A KÉT TÍPUS 2026-09-06-IG NEM LÉTEZETT A KOINÓBAN — a végpont-térkép találata
// volt (`docs/szakasz5_terv.md` 7. szakasz, 2. pont): a prototípus tíz végpontja mögött
// nem volt esemény. A domain-fogalom viszont mindig is megvolt: *„a kategóriák és a
// gondolattípusok rendszerezik a gondolatokat."*
//
// ⚠️ MIÉRT NINCS ÚJ ESEMÉNY-FAJTA? Mert a `GondolatLetrehozas` az ÁLTALÁNOS entitás-
// létrehozás, és az `adat.tipus` különbözteti meg a fajtákat — ez a szerkezet a Szakasz 1
// óta így van (`allapotSzamitas.js`: `adat.tipus ?? 'Gondolat'`). Új esemény-név
// bevezetése minden meglévő tárat érvénytelenítene, cserébe semmit nem adna.
//
// ⭐ ÉS MIÉRT ÖNÁLLÓ ENTITÁS, NEM MEZŐ? Mert így ugyanaz jár nekik, mint bármely más
// entitásnak: tudatpont, javaslat, küszöbök, egyezmény. Egy kategória neve is
// **közösségi döntéssel** változik — nem egy mező átírásával.

/**
 * A közös váz: kategória és gondolattípus ugyanaz, csak a `tipus` más.
 *
 * ⚠️ A NÉV a `cim` mezőbe kerül. Ez szándékos: a koinóban MINDEN entitásnak `cim`-e van,
 * és így az állapot-számítás, a rendezés, a keresés és az egyezmény-végrehajtás
 * változtatás nélkül működik rajtuk. A prototípus kártyái `nev`-et olvasnak — azt a
 * felület fordítja (`felulet/js/kartyaAdat.js`).
 */
async function besorolasLetrehozasa(kornyezet, tipus, { nev, leiras, ikon, szulo }) {
  const entitas = {
    tipus,
    cim: nev,
    // ⭐ D72: a leírás is szöveg — külön darab, ahogy a gondolaté.
    szoveg: await szovegDarabbaTetele(kornyezet, leiras || null),
    szulo: szulo || null,
    // ⭐ Az ikon lehet EMOJI vagy URL — az örökölt kártya mindkettőt kezeli (URL-nél képet
    // rak ki, egyébként szöveget). Emojival tehát nem kell hozzá feltöltés, ami a P2P-ben
    // amúgy sincs megoldva (D3).
    ikon: ikon || null
  };

  entitas.meret = kanonikusBajtok(entitas).length + (entitas.szoveg?.bajt ?? 0);
  return esemenytTeszek(kornyezet, 'GondolatLetrehozas', entitas);
}

/**
 * Új kategória.
 * @param {Object} adatok - { nev, leiras, ikon, szulo }
 */
export function kategoriaLetrehozasa(kornyezet, adatok) {
  return besorolasLetrehozasa(kornyezet, 'Kategoria', adatok);
}

/**
 * Új gondolattípus (kérdés, válasz, témakör, ismeret, feladat…).
 * @param {Object} adatok - { nev, leiras, ikon, szulo }
 */
export function gondolatTipusLetrehozasa(kornyezet, adatok) {
  return besorolasLetrehozasa(kornyezet, 'GondolatTipus', adatok);
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
export async function tudatpontRendezese(kornyezet, entitas, pont, szerep = 'aktiv', _marKiosztott,
                                         beallitas = {}) {
  if (!Number.isInteger(pont) || pont < 0) {
    throw new Error('A tudatpont csak egész szám lehet, és nem lehet negatív.');
  }

  // ⭐ D70: az adat FÜGGVÉNY — ha közben más folyamat írt a láncunkba, az `esemenytTeszek` a
  // friss láncból újraszámolja a bemondott összeget, mielőtt újra aláírna.
  const adat = async () => {
    // A tudatpont ÁTRENDEZHETŐ: ami ezen az entitáson már ott van, az nem „új" kiadás.
    const { osszeg, regi } = await sajatKiosztott(kornyezet, entitas);
    const kiosztva = osszeg - regi + pont;

    if (kiosztva > TUDATPONT_KERET) {
      throw new Error(
        'Ennyi tudatpontod nincs. Kereted ' + TUDATPONT_KERET +
        ', ebből máshol ' + (osszeg - regi) + ' van kiosztva.'
      );
    }
    return { entitas, pont, szerep, kiosztva };
  };

  return esemenytTeszek(
    kornyezet,
    'TudatpontRendezes',
    adat,
    // a tudatpont mozgatja a részvételi arányt → a határidőt is. ⭐ D85: a javaslattevő pontja a
    // javaslat időbélyegét viseli (`beallitas.ido`), hogy a támogató szavazata ELŐTT számítson.
    { entitas, horgonyozzunk: true, ...(beallitas.ido !== undefined ? { ido: beallitas.ido } : {}) }
  );
}


// ===================================
// ⭐⭐⭐ ÁLLÁSFOGLALÁS — az ÁLTALÁNOS egyezmény ÉLŐ marad (D27)
// ===================================
//
// *„A TÉNY örök (ez az egyezmény akkor, ott, érvényesen megszületett), a HATÁLY viszont
// él: hányan állnak mögötte MOST."*
//
// ⭐ HÁROM MŰVELET, EGY ALAK — ugyanaz az érv, mint a `meghivas`/`felhatalmazas`/`tanusitas`
// hármasnál: közös váz, más jelentés. Ha az alak változik, egy helyen változik.
//
//   · **csatlakozik** — *„én is egyetértek ezzel"*, akár jóval a döntés után;
//   · **tiltakozik** — *„én már nem"*: a támogatás visszavonása, ellenkezés;
//   · **utkozik**    — *„ez a kettő ellentmond egymásnak"* (ilyenkor kell a `masik`).
//
// ⭐⭐ ÉS „AZ UTOLSÓ NYER", e-emberenként: aki csatlakozott, majd tiltakozik, annál a
// tiltakozás számít. *Ettől lesz a hatály élő — külön visszavonás-mechanizmus nélkül*,
// ugyanúgy, ahogy a tudatpontnál.
//
// ⛔ ÉS SEMMI AUTOMATIKUS NEM KÖVETKEZIK BELŐLE (D27/6): sem a tiltakozók többsége, sem az
// ütközés nem érvénytelenít semmit. A rendszer **bejelent, nem bíráskodik** (D19) — a vita
// helye az egyezmény alatti gyerek-gondolatokban van.
//
// ⚠️ A JOGOSULTSÁGOT a `szabalyok.js` őrzi: állást az foglalhat, akinek tudatpontja van
// azon az entitáson, ami alatt az egyezmény áll — vagy annak bármely leszármazottján
// (D27/4). *A hely határozza meg a hatókört.*

// ⚠️⚠️ ITT KORÁBBAN EGY MÁSODIK DEFINÍCIÓ ÁLLT (javítva 2026-09-10). A komment azt
// állította, hogy „a `szabalyok.js` is innen veszi" — a `szabalyok.js`-ben pedig ugyanez a
// mondat állt fordítva. **Két lista, két komment, egyik sem igaz.** A szabályt a SZÁMÍTÁS
// őrzi, ezért a forrás is ott van; ez a fájl onnan importálja, és tovább is adja, hogy a
// hívóknak (`koino.js`) ne kelljen két helyről szedniük.
export { ALLASOK };

/**
 * Állást foglal egy általános egyezményről.
 *
 * @param {Object} kornyezet
 * @param {string} egyezmeny - az egyezmény (= a javaslat) azonosítója
 * @param {string} allas - 'csatlakozik' | 'tiltakozik' | 'utkozik'
 * @param {Object} [beallitas] - { masik, indoklas }
 */
export async function allasfoglalas(kornyezet, egyezmeny, allas, beallitas = {}) {
  if (!ALLASOK.includes(allas)) {
    throw new Error('Érvénytelen állás: ' + allas + ' (csatlakozik | tiltakozik | utkozik)');
  }
  const { masik = null, indoklas = null } = beallitas;
  if (allas === 'utkozik' && typeof masik !== 'string') {
    throw new Error('Az ütközés-jelöléshez meg kell nevezni a MÁSIK egyezményt.');
  }

  const esemeny = await esemenyLekerese(kornyezet.tar, egyezmeny);
  if (!esemeny) throw new Error('Nem ismerem ezt az egyezményt: ' + egyezmeny);

  // ⭐ A szelet-kulcs maga az egyezmény: az állásfoglalások oda kerülnek, ahol az
  // egyezmény és a döntés többi bemenete van.
  return esemenytTeszek(
    kornyezet, 'Allasfoglalas',
    { egyezmeny, allas, masik: allas === 'utkozik' ? masik : null, indoklas },
    { entitas: egyezmeny, horgonyozzunk: true }
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
 * ⭐ D85/5: a kezdő pont szétosztása a töredékek között — a prototípus
 * `elosztottTudatpontokKiszamitasa`-ja szerint: mindegyik kap 1-et, a maradék körbe jár.
 *
 * @param {number} osszes - a kezdő pont (legalább annyi, ahány töredék)
 * @param {number} darab - a töredékek száma
 * @returns {Array<number>}
 */
export function kezdoPontokElosztasa(osszes, darab) {
  if (osszes < darab) {
    throw new Error('A kezdő pont kevesebb, mint a töredékek száma (' + osszes + ' < ' + darab
      + ') — minden töredékre legalább 1 kell.');
  }
  const elosztas = new Array(darab).fill(1);
  let maradek = osszes - darab;
  for (let i = 0; maradek > 0; i = (i + 1) % darab, maradek--) elosztas[i]++;
  return elosztas;
}

/**
 * Javaslatot tesz. A `fajta` dönti el, mi történik elfogadáskor (D27):
 *   'szerkesztesi' → a koino végrehajtja a változást
 *   'altalanos'    → nem történik semmi automatikusan; az egyezmény MAGA az álláspont
 *
 * A szelet-kulcs az ELSŐ érintett entitás — így a javaslat és a rá adott szavazatok
 * ugyanabban a szeletben lesznek, mint a döntés többi bemenete (tudatpontok, érték
 * javaslatok).
 *
 * ===== ⭐⭐ TÖBB ÉRINTETT, ENTITÁSONKÉNTI MŰVELETTEL (2026-09-07) =====
 *
 * A prototípus `erintettEntitasok`-ja **tömb**, és minden eleme **saját műveletet** hordoz
 * (`javaslat.js`). Ez teszi lehetővé az **egyesítést** (két forrás, egy eredmény) és a
 * `Csomag` javaslatot (vegyes műveletek egy döntésben). A koino ezt most átveszi.
 *
 * ⚠️ A RÉGI HÍVÁSI ALAK IS MŰKÖDIK (`{ erintett, muvelet, valtozas }`) — egy elemű listává
 * alakul. Nem kényelemből: a **régi események** is ilyenek, és azokat nem lehet újraírni
 * (az aláírás a régi bájtokra szól). Ha a hívó alakja eltérne az esemény alakjától, a kettő
 * előbb-utóbb szétcsúszna.
 *
 * ===== ⭐⭐ D85 (Csaba, 2026-10-02): LÉTREHOZÁS → PONT A JAVASLATRA → SZAVAZAT, EGY LÉPÉSBEN =====
 *
 * A javaslat is entitás (D14: pont nélkül nem létezik), és a szavazati jog a javaslaton tett pontot
 * is kívánja (D85/2) — ezért a kezdő pont a művelet része, nem a hívóé (2026-10-02-ig az öt hívó
 * mind külön tette fel, a szavazat UTÁN). Egy érintettnél a javaslatra kerül; többnél a TÖREDÉKEKRE
 * oszlik (D85/5), a prototípus szerint: mindegyikre legalább 1, a maradék körbe.
 *
 * @param {Object} kornyezet
 * @param {Object} adatok - { erintettek: [{entitas, muvelet, valtozas}], indoklas, fajta, pont }
 *        vagy a RÉGI alak: { erintett, muvelet, valtozas, indoklas, fajta, pont }
 *        — a `pont` a kezdő tudatpont (alapból töredékenként 1); több érintettnél ennyi oszlik szét
 */
export async function javaslatLetrehozasa(kornyezet, adatok) {
  const { erintett, muvelet, valtozas, indoklas, fajta } = adatok;
  const kezdoPont = Number.isInteger(adatok.pont) && adatok.pont > 0 ? adatok.pont : null;

  // A régi, egy-érintettes hívás listává alakul — így egyetlen alak megy az eseménybe.
  const lista = Array.isArray(adatok.erintettek)
    ? adatok.erintettek
    : (typeof erintett === 'string'
        ? [{ entitas: erintett, muvelet: muvelet || 'Modositas', valtozas: valtozas || null }]
        : []);

  if (!lista.length) {
    throw new Error('A javaslatnak legalább egy érintett entitást meg kell neveznie.');
  }

  // ⭐ Minden elem TELJES: entitás + művelet + változás. A hiányzó mezőt itt töltjük ki, nem
  // az olvasóknál — így a kanonikus alak sem lesz hol ilyen, hol olyan.
  const erintettek = [];
  for (const r of lista) {
    const valtozas = r.valtozas ?? null;
    erintettek.push({
      entitas: r.entitas,
      muvelet: r.muvelet || 'Modositas',
      // ⭐ D72: a javasolt ÚJ szöveg is külön darab — a javaslat a hivatkozását hordozza.
      valtozas: valtozas && typeof valtozas === 'object' && 'szoveg' in valtozas
        ? { ...valtozas, szoveg: await szovegDarabbaTetele(kornyezet, valtozas.szoveg) }
        : valtozas
    });
  }

  const javaslat = await esemenytTeszek(
    kornyezet,
    'Javaslat',
    {
      fajta: fajta === 'altalanos' ? 'altalanos' : 'szerkesztesi',
      erintettek,
      indoklas: indoklas || null
    },
    // ⭐⭐ D85/1 (Csaba, 2026-10-02): A JAVASLAT A SAJÁT SZELETÉBEN ÉL, mint egy gondolat (az `entitas`
    // üres → a saját azonosítója a szelet). Minden érintettjénél BEJELENTÉSKÉNT jelenik meg
    // (`esemeny.js`: `bejelentesHelyei`) — a gondolat tartói így is mindent tudnak, ami róla dönt.
    // *(2026-10-02-ig az első érintett szeletébe került: „a szeletnek egyetlen gazdája lehet".)*
    // ⭐⭐ D85 T3 előfeltétele (a T2 mintája): a javaslat a jogának bizonyítékát hozza — érintettenként a
    // javaslattevő pontját a saját kiosztás-fájából. A csak-G1-tartó így a G2-es pontot is ellenőrzi.
    { bizonyitekKulcsok: erintettek.map((r) => r.entitas) }
  );

  // ===================================
  // ⭐⭐ D85: A KEZDŐ PONT A JAVASLATRA (vagy a töredékeire) — A SZAVAZAT ELŐTT
  // ===================================
  //
  // ⚠️ Ugyanaz az időbélyeg, mint a javaslaté (mint a szavazatnál lent): az időrendi számítás így
  // a saját lánc sorrendjében veszi — előbb a pont, aztán a szavazat.
  const entitasai = javaslatEntitasai(javaslat);
  const elosztas = kezdoPontokElosztasa(kezdoPont ?? entitasai.length, entitasai.length);
  for (let i = 0; i < entitasai.length; i++) {
    await tudatpontRendezese(kornyezet, entitasai[i].azonosito, elosztas[i], 'aktiv', undefined,
      { ido: javaslat.ido });
  }

  // ===================================
  // ⭐⭐ ÉS A JAVASLATTEVŐ TÁMOGATÓ SZAVAZATA — UGYANEBBEN A LÉPÉSBEN
  // ===================================
  //
  // ⛔⛔ EZ HIÁNYZOTT, ÉS MÉRHETŐ KÁRT OKOZOTT (2026-09-12, Csaba helyreigazítása).
  // A prototípus a javaslat létrehozásakor **automatikusan lead egy támogató szavazatot**
  // (`javaslatService.js:635` — *„Automatikus támogató szavazat"*). A koino ezt nem tette,
  // és emiatt egy **egytulajdonosú** entitás saját szerkesztési javaslata **0 szavazattal,
  // ELVETVE** zárult — pontosan az ellenkezője annak, aminek történnie kell.
  //
  // ⭐ Csaba kimondása: *„a prototípusban is csak javaslat → egyezmény mentén lehet
  // szerkeszteni, csak mivel ő az egyetlen tulajdonosa, ezért 100% támogatottság mellett
  // azonnal megtörténik."* ⚠️ **A 100% nem jön magától** — ezt a szavazat adja.
  //
  // ⭐ MIÉRT ITT, ÉS NEM A HÍVÓBAN? Mert ez nem kényelem, hanem **a javaslattétel
  // jelentésének része**: aki javasol valamit, az támogatja. Ha a hívóra bíznánk, pontosan
  // ez történne újra — az egyik hívó megteszi, a másik elfelejti, és a koino két úton
  // máshogy viselkedne.
  //
  // ⚠️ KÉT ALÁÍRT ESEMÉNY, nem egy — és ez rendben van: a saját készülékem a saját
  // kulcsommal két külön állítást tesz (*„ezt javaslom"* és *„támogatom"*). Precedens: a
  // `javaslat` parancs a tudatpontot is külön eseményként rendeli hozzá.
  await esemenytTeszek(
    kornyezet, 'Szavazat',
    { javaslat: javaslat.azonosito, szavazat: 'Tamogat', kulonvalasIgeny: false },
    // ⛔⛔ UGYANAZ AZ IDŐBÉLYEG, mint a javaslaté — lásd az `esemenytTeszek` `ido` ágát.
    // Nélküle nulla döntési időnél a saját szavazatom **késői** lenne, és a javaslat
    // 0%-kal, ELVETVE zárna — mérve, 2026-09-12.
    // ⭐ D85/2 (T2): a szavazati jog bizonyítéka minden részre (az érintettre és a javaslat-entitásra)
    // — a javaslattevőnek mindegyiken van pontja (a szabály-réteg 3. szabálya és a fenti lépés).
    // ⭐ D85/1: a szavazat a JAVASLAT szeletébe kerül (arról szól); az érintettekhez a bizonyítéka
    // kulcsai szerint jelentődik be.
    { entitas: javaslat.azonosito, horgonyozzunk: true, ido: javaslat.ido,
      bizonyitekKulcsok: entitasai.flatMap((je) => (je.resz ? [je.resz.entitas, je.azonosito] : [])) }
  );

  // ⭐ A JAVASLAT eseményét adjuk vissza, nem a szavazatét — a hívót az érdekli.
  return javaslat;
}

// ===================================
// SZAVAZAT
// ===================================

/**
 * Szavazás egy javaslatra.
 *
 * ⭐⭐ A KÜLÖNVÁLÁSI IGÉNY (2026-09-08, a prototípus `kulonvalasIgeny` mezője).
 *
 * *„Ha a döntés nem a te álláspontodat követi, szeretnél külön ágat?"* — aki ezt kéri, és a
 * vesztes oldalon marad, az a **saját változatával** léphet külön ágra, a tudatpontjával
 * együtt. *„Aki elmegy, viszi a súlyát."*
 *
 * ⛔ TARTÓZKODÁSNÁL A SZÁNDÉK MINDIG HAMIS, és ezt ITT kényszerítjük ki — pontosan úgy,
 * ahogy a prototípus `szavazatService`-e (1/b lépés): *„aki nem foglalt állást, nem válik
 * külön, ő a főágon marad."* ⭐ Egy helyen döntjük el, hogy ne csúszhasson szét kétféle
 * igazságra: a felület kérdése csak kérdés, a szabály itt van.
 *
 * @param {Object} kornyezet
 * @param {string} javaslat - a javaslat azonosítója
 * @param {string} szavazat - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
 * @param {boolean} [kulonvalasIgeny] - kér-e külön ágat, ha a döntés ellene megy
 */
export async function szavazas(kornyezet, javaslat, szavazat, kulonvalasIgeny = false) {
  if (!['Tamogat', 'Ellenez', 'Tartozkodik'].includes(szavazat)) {
    throw new Error('Érvénytelen szavazat: ' + szavazat);
  }

  // ⛔ A tartózkodó SOSEM válik külön (lásd fent).
  const igeny = szavazat === 'Tartozkodik' ? false : !!kulonvalasIgeny;

  // Melyik entitásról szól a javaslat? Ez adja a szelet-kulcsot.
  const javaslatEsemeny = await esemenyLekerese(kornyezet.tar, javaslat);
  if (!javaslatEsemeny) {
    throw new Error('Nem ismerem ezt a javaslatot: ' + javaslat);
  }
  // ⭐ D85/1 (2026-10-02): a szavazat a JAVASLAT szeletébe kerül — arról szól, ahogy a tudatpont-esemény
  // annak a szeletébe, amire vonatkozik. Az érintett gondolatokhoz a bizonyítéka kulcsai szerint
  // jelentődik be (`bejelentesHelyei`). *(Korábban: az első érintett szeletébe.)*
  const entitas = javaslat;

  // ⭐⭐ D85/2 (Csaba, 2026-10-02): A SZAVAZATI JOG A JAVASLATON IS PONTOT KÍVÁN. Ahol a szavazó jogosult
  // (pontja van az érintetten), de a rész javaslat-entitásán (a javaslaton / a töredékén) még nincs, a
  // művelet 1 pontot tesz rá — UGYANAZZAL az időbélyeggel, a szavazat ELŐTT, ahogy a javaslattevőnél is.
  // ⚠️ A szabály a SZÁMÍTÁSBAN van (`javaslatSzamitas.js`); ez itt csak az, hogy a gomb ne legyen
  // némán hatástalan.
  const ido = Date.now();
  const bizonyitekKulcsok = [];
  for (const je of javaslatEntitasai(javaslatEsemeny)) {
    if (!je.resz) continue;
    if ((await sajatKiosztott(kornyezet, je.resz.entitas)).regi <= 0) continue;   // itt nem jogosult
    // ⭐ T2: a jogosult részek mindkét kulcsára bizonyíték megy a szavazattal.
    bizonyitekKulcsok.push(je.resz.entitas, je.azonosito);
    if ((await sajatKiosztott(kornyezet, je.azonosito)).regi > 0) continue;      // már van pontja rajta
    await tudatpontRendezese(kornyezet, je.azonosito, 1, 'aktiv', undefined, { ido });
  }

  return esemenytTeszek(
    kornyezet, 'Szavazat', { javaslat, szavazat, kulonvalasIgeny: igeny },
    { entitas, horgonyozzunk: true, ido, bizonyitekKulcsok }
  );
}

// ===================================
// ⭐⭐ D85 T3: A DÖNTÉSI CSOMAG KIADÁSA
// ===================================

/**
 * A lezárt, több érintettes javaslatok döntési csomagjainak kiadása (D85 T3, a (B) — Csaba, 2026-10-03).
 *
 * Minden lezárt javaslatnál, érintettenként: ami a döntés bemenetéből (`dontesBemenete`) a cél szeletéből
 * hiányzik (`celbolHianyzik`), és amit még egyetlen meglévő csomag sem hozott oda, az aláírt csomag(ok)ba
 * kerül, a cél TÖREDÉKÉNEK szeletébe. ⭐ Ismételhető: ha már minden ott van, nem ír semmit (az őrjárat minden
 * körben hívhatja); ha később több látszik (egy kései szinkron hozott még valamit a lezárás előttről), csak
 * azt pótolja. ⚠️ Bárki kiadhatja, akinél a bemenet megvan — alapból a javaslattevő teszi (minden érintetten
 * van pontja, tehát minden érintett szeletét tartja); a kapu a tartalmat nézi, nem a kiadót.
 *
 * @param {Object} kornyezet
 * @param {Object} [beallitas]
 * @param {string|null} [beallitas.javaslat] - csak ez a javaslat (alapból mind)
 * @param {boolean} [beallitas.csakSajat] - csak a saját javaslataim (az őrjárat így hívja)
 * @param {number} [beallitas.most] - az idő (a lezárás eldöntéséhez)
 * @param {number} [beallitas.korlat] - a darabolás korlátja bájtban (a próbáknak)
 * @returns {Promise<{kiadva: Array<Object>, javaslatok: number}>}
 */
export async function dontesiCsomagokKiadasa(kornyezet, beallitas = {}) {
  const most = beallitas.most ?? Date.now();
  const korlat = beallitas.korlat ?? CSOMAG_BAJT_KORLAT;
  const esemenyek = await koinoEsemenyei(kornyezet.tar, kornyezet.koino);
  const allapot = allapotSzamitasa(esemenyek);

  // A lezárt, több érintettes javaslatok (a számító eseményekből — ami nem számít, annak nincs döntése).
  const jelolt = allapot.szamitok.filter((e) => e.tipus === 'Javaslat'
    && erintettek(e.adat).length > 1
    && (!beallitas.javaslat || e.azonosito === beallitas.javaslat)
    && (!beallitas.csakSajat || e.szerzo === kornyezet.szerzo));
  if (!jelolt.length) return { kiadva: [], javaslatok: 0 };
  const dontesek = javaslatokSzamitasa(allapot.szamitok, allapot, most);

  // Ami a meglévő csomagok egy-egy töredékébe már eljutott.
  const vitt = new Map();   // töredék → Set(azonosító)
  for (const e of esemenyek) {
    if (e.tipus !== CSOMAG_TIPUS || !Array.isArray(e.adat?.esemenyek)) continue;
    if (!vitt.has(e.entitas)) vitt.set(e.entitas, new Set());
    for (const x of e.adat.esemenyek) vitt.get(e.entitas).add(x?.azonosito);
  }

  const kiadva = [];
  let javaslatok = 0;
  for (const j of jelolt) {
    const d = dontesek.get(j.azonosito);
    if (!d || most < d.lezarasIdeje) continue;          // még nyitva: a bemenet még változhat
    javaslatok++;
    const bemenet = dontesBemenete(allapot.szamitok, j, d.lezarasIdeje);
    for (const { entitas: cel } of erintettek(j.adat)) {
      const toredek = toredekAzonosito(j.azonosito, cel);
      const marOtt = vitt.get(toredek) ?? new Set();
      const hianyzik = celbolHianyzik(bemenet, cel)
        .filter((e) => e.azonosito !== j.azonosito && !marOtt.has(e.azonosito));
      for (const darab of csomagokra(hianyzik, korlat - bajt(j))) {
        kiadva.push(await esemenytTeszek(kornyezet, CSOMAG_TIPUS,
          { javaslat: j.azonosito, cel, esemenyek: [j, ...darab] }, { entitas: toredek }));
      }
    }
  }
  return { kiadva, javaslatok };
}
