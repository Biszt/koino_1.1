// koino/js/allapot/pakli.js

// Felelősség: EGY OLDALNYI KÁRTYÁT adni a pakliból — soha nem az egészet.
//
// ===== ⛔⛔ EZ A SZAKASZ 5 GERINCE (9. szabály) =====
//
// A prototípusban a `GET /api/pakli/` Mongo-lekérdezés volt, szerver-oldali rendezéssel.
// A P2P koinóban az állapot **számítás** az eseményekből — és a mai számítás az ÖSSZES
// eseményt kapja (`koinoEsemenyei`). ⚠️ **Ez az utolsó megmaradt nem-skálázó út a
// programban**, amit a Szakasz 3 szándékosan meghagyott a kis koinónak.
//
// ⭐ **Ha a felület „paklit" kérne, bebetonozná.** Ezért a kérdés alakja itt dől el, és
// ezért kellett az 5.2-nek az 5.3 (a kártyák) ELÉ kerülnie: a kártya alakja attól függ,
// mit tud kérni a lap.
//
// 🔍 A 9. szabály próbája — *„ez mit csinál egymilliárd e-embernél?"*:
//
//   · az ILLESZTÉS milliárdos: a hívó **egy oldalt** kér, kurzorral, korlátos darabszámmal,
//     és a válasz **nem hordozza a szövegeket** (azok külön kérdésre jönnek);
//   · a MEGVALÓSÍTÁS ma egyszerű: kiszámolja az állapotot, rendez, és szeletel. ⭐ Ez a
//     9. szabály szerint rendben van — *a szerkezet az első naptól milliárdos, a
//     megvalósítás mögötte lehet egyszerű* —, mert **kicserélhető anélkül, hogy egyetlen
//     hívó változna**. Pontosan úgy, ahogy a 3.2-ben a tár-illesztő.
//
// ===== ⭐⭐ A HORGONY: MIÉRT NEM CSÚSZIK EL A LAPOZÁS =====
//
// A rendezés kulcsa **változhat két lekérés között** — valaki tudatpontot rendez, és egy
// kártya átugrik a lapok határán: kimarad, vagy kétszer jelenik meg. Ez nem elméleti, a
// tudatpont épp attól él, hogy bármikor átrendezhető.
//
// ⭐ A koinóban van rá egy szép válasz, ami máshol nincs: **a tár hozzáfűzhető, tehát az
// első N esemény halmaza SOHA nem változik.** A lapozás ezért egy **horgonyhoz** kötődik —
// „az állapot, ahogy az első N eseményből látszott" —, és a további oldalak ugyanabból a
// képből jönnek. *Nem az időt fagyasztjuk be, hanem a bemenetet.*
//
// ⚠️ **A horgony HELYI FELJEGYZÉS, nem esemény** (3. szabály): sosem terjed, semmit nem
// dönt el a koinóban, és két készüléken mást jelent — ugyanaz a fajta, mint a `tarsak.js`
// `utoljara` mezője. Csak arra való, hogy EGY lapozás önmagával konzisztens maradjon.
//
// ⭐ És ami közben történt, azt **megmondjuk, nem elhallgatjuk**: az `ujdonsag` mező jelzi,
// hogy a horgony óta érkeztek események. A felület felajánlhatja a frissítést — de nem
// keverjük némán két kép sorait egymás közé.
//
// Használják: a felület kezelője (`koino.js`), és bármely másik kliens.

import { koinoEsemenyei } from '../tar/esemenyTar.js';
import { allapotSzamitasa } from './allapotSzamitas.js';
import { TUDATPONT_KERET } from './szabalyok.js';
import { javaslatokSzamitasa, ALAP_KUSZOBOK } from './javaslatSzamitas.js';
import { egyezmenyekAlkalmazasa } from './egyezmenyVegrehajtas.js';

// ===================================
// A PARAMÉTEREK
// ===================================

// A négy rendezés — ugyanaz a négy, amit a prototípus `RendezesModal`-ja kínál, hogy a
// felület átemelésekor ne kelljen fordítani.
export const RENDEZESEK = ['hierarchikus', 'ido', 'sajatPont', 'agazatiPont'];

export const ALAP_DARAB = 20;

// ⛔ A FELSŐ KORLÁT NEM UDVARIASSÁG, HANEM A 9. SZABÁLY. Enélkül a hívó `darab=999999999`-cel
// visszakérhetné az egész paklit, és az illesztés máris azt jelentené, hogy „add ide mindet".
export const MAX_DARAB = 100;

// ===================================
// A NÉZET — a horgonyhoz tartozó kép gyorsítótára
// ===================================

/**
 * Új, üres pakli-nézet.
 *
 * ⭐ MIÉRT SZABAD GYORSÍTÓTÁRAZNI? Mert a horgony **befagyasztott bemenetet** jelöl: az
 * első N esemény halmaza soha nem változik, tehát a belőle számolt kép sem. Ugyanaz az
 * érvelés, mint az `identitas.js` gyorsítótáránál (D47).
 *
 * ⚠️ Egyetlen képet tartunk — a legutóbbit. Egy lapozás végigmegy ugyanazon a horgonyon,
 * tehát ennyi elég; és így nem nő korlátlanul.
 */
export function ujPakliNezet() {
  return { horgony: null, kep: null, szamitasok: 0 };
}

// ===================================
// A KÁRTYA — amit a lista visz
// ===================================

/**
 * Egy entitásból kártya-adat.
 *
 * ⛔⛔ A SZÖVEG SZÁNDÉKOSAN NINCS BENNE. Egy lista húsz kártyája húsz teljes gondolat-
 * szöveget jelentene — az a válasz mérete, ami a 6. szabály KEMÉNY felébe ütközik (az
 * adat-csomag utazik, a program nem). A szöveget a `GET /api/pakli/szoveg/:tipus/:id`
 * hozza, kártyánként, amikor tényleg kell.
 */
/**
 * Egy besorolás-hivatkozás feloldása: azonosító → { azonosito, nev, ikon }.
 *
 * ⭐ MIÉRT ITT, ÉS NEM A LAPON? Mert ez **keresés az állapotban**, vagyis számítás — a
 * vékony lap elve szerint a programé. A lap csak rajzol.
 *
 * ⚠️ A HIÁNY NEM HIBA (D19): ha a kategória még nem érkezett meg hozzánk, `null`-t adunk,
 * és a kártya egyszerűen nem mutat besorolást. Nem találunk ki nevet, és nem is jelezzük
 * vádként.
 */
function besorolas(entitasok, azonosito) {
  if (typeof azonosito !== 'string') return null;
  const e = entitasok.get(azonosito);
  if (!e) return null;
  return { azonosito, nev: e.cim ?? null, ikon: e.ikon ?? null };
}

function kartya(entitas, agazatiPont, en, entitasok, dontes = null) {
  return {
    azonosito: entitas.azonosito,
    tipus: entitas.tipus,
    cim: entitas.cim,
    szulo: entitas.szulo,

    // ----- A BESOROLÁS, FELOLDVA (5.4) -----
    // A kártya nevet és ikont mutat, nem azonosítót — tehát a feloldás ide tartozik.
    ikon: entitas.ikon ?? null,
    gondolatTipus: besorolas(entitasok, entitas.gondolatTipus),
    kategoriak: (entitas.kategoriak ?? [])
      .map((k) => besorolas(entitasok, k))
      .filter((k) => k !== null),
    szerzo: entitas.szerzo,
    letrehozva: entitas.letrehozva,
    osszesPont: entitas.osszesPont,
    agazatiPont,
    hozzajarulok: entitas.hozzajarulok.size,

    // ⭐ AMIT ÉN TETTEM RÁ. A kártya külön jelzi a saját pontodat — és ehhez tudni kell,
    // ki vagy. ⚠️ A `pakli.js` ezt nem találhatja ki: a hívó adja meg (`beallitas.szerzo`),
    // mert a személyazonosság a kulcs-rétegé, nem az állapoté.
    sajatPont: en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) : 0,

    // ----- ⭐ A DÖNTÉS, HA EZ EGY JAVASLAT -----
    //
    // ⚠️ KÉT RÉTEG, EGY AZONOSÍTÓ. A javaslat **entitás** (tudatpont, küszöbök, gyerekek —
    // ez a fenti rész) ÉS **döntés** (szavazatok, státusz, egyezmény — ez itt). A kettő
    // ugyanarra az azonosítóra vonatkozik, de más réteg számolja: az entitást az
    // `allapotSzamitas.js`, a döntést a `javaslatSzamitas.js`.
    javaslat: dontes ? {
      fajta: dontes.fajta,                  // 'szerkesztesi' | 'altalanos' (D27)
      muvelet: dontes.muvelet,
      erintett: dontes.erintett,
      erintettCim: entitasok.get(dontes.erintett)?.cim ?? null,
      valtozas: dontes.valtozas ?? null,
      indoklas: dontes.indoklas ?? null,
      statusz: dontes.statusz,
      dontesiIdo: dontes.dontesiIdo,
      lezarasIdeje: dontes.lezarasIdeje,

      // ⭐ EZRELÉKBEN, mert a koino egész aritmetikával számol (kerekítés soha ne
      // dönthessen el szavazást). A százalékra váltás a felület dolga.
      tamogatottsagEzrelek: dontes.tamogatottsagEzrelek,
      ellenzoiEzrelek: dontes.ellenzoiEzrelek,
      tartozkodoiEzrelek: dontes.tartozkodoiEzrelek,
      reszveteliEzrelek: dontes.reszveteliEzrelek,
      bizonyossagiMutato: dontes.bizonyossagiMutato,

      tamogatok: dontes.tamogatok,
      ellenzok: dontes.ellenzok,
      tartozkodok: dontes.tartozkodok,
      szavazok: dontes.szavazok,
      nevezo: dontes.nevezo,
      kesoiSzavazatok: dontes.kesoiSzavazatok,

      // ⭐ SZAVAZHATOK-E? A döntés bemenete az ÉRINTETT entitás aktív tulajdonosainak
      // köre — nem a javaslaté. (Aki a gondolatot tartja, az dönt a sorsáról.)
      szavazhatok: (() => {
        if (!en) return false;
        const erintett = entitasok.get(dontes.erintett);
        const sajat = erintett?.hozzajarulok.get(en);
        return (sajat?.pont ?? 0) > 0 && sajat?.szerep !== 'passziv';
      })(),

      egyezmeny: dontes.egyezmeny ? { megszuletett: dontes.egyezmeny.megszuletett } : null
    } : null,

    // ⚠️ Nincs `szoveg` — lásd fent.
    vanSzoveg: entitas.szoveg !== null && entitas.szoveg !== undefined
  };
}

// ===================================
// AZ ÁGAZATI PONT — a fa alulról felfelé
// ===================================

/**
 * Minden entitáshoz: a saját pontja + a leszármazottaié.
 *
 * ⚠️ Az `allapotSzamitas.js` `agMeretSzamitasa` ugyanezt a bejárást csinálja, de a
 * **tárolási vállalásra** (`meret`), nem a pontra. Nem írtam át azt a függvényt, mert a
 * mag viselkedését változtatná; itt a pakli a saját kérdését teszi fel.
 *
 * ⚠️⚠️ ÉS EGY ŐR, AMI NEM DÍSZ: a `szulo`-lánc **körbe mutathat** (a→b→a). Nem szabályos,
 * de egy hibás vagy rosszindulatú esemény előállíthatja, és egy naiv bejárás **végtelen
 * ciklusba** futna. A látogatott halmaz ezt zárja ki.
 */
function agazatiPontok(entitasok) {
  const eredmeny = new Map();
  for (const e of entitasok.values()) eredmeny.set(e.azonosito, e.osszesPont);

  for (const e of entitasok.values()) {
    // Felfelé sétálunk, és mindenkinek hozzáadjuk ennek az entitásnak a pontját.
    const latott = new Set([e.azonosito]);
    let szulo = e.szulo;
    while (szulo && entitasok.has(szulo) && !latott.has(szulo)) {
      latott.add(szulo);
      eredmeny.set(szulo, eredmeny.get(szulo) + e.osszesPont);
      szulo = entitasok.get(szulo).szulo;
    }
  }
  return eredmeny;
}

/**
 * A hierarchikus rendezés kulcsa: a gyökértől idáig vezető út, összefűzve.
 *
 * ⭐ Miért út, és nem mélység? Mert **összehasonlítható**: a szöveges rendezés pontosan a
 * mélységi bejárást adja vissza, tehát a gyerek mindig a szülője után jön, és a testvérek
 * együtt maradnak. És mert **kurzorozható** — a kurzornak összehasonlítható érték kell.
 */
function utvonalak(entitasok) {
  const eredmeny = new Map();
  for (const e of entitasok.values()) {
    const ut = [e.azonosito];
    const latott = new Set([e.azonosito]);
    let szulo = e.szulo;
    while (szulo && entitasok.has(szulo) && !latott.has(szulo)) {
      latott.add(szulo);
      ut.unshift(szulo);
      szulo = entitasok.get(szulo).szulo;
    }
    eredmeny.set(e.azonosito, ut.join('/'));
  }
  return eredmeny;
}

// ===================================
// A SORREND
// ===================================

/**
 * Két elem sorrendje. Negatív, ha `a` előbb jön.
 *
 * ⭐ A HOLTVERSENYT MINDIG az azonosító dönti el, **növekvő irányban, a rendezés irányától
 * függetlenül**. Ez nem részletkérdés: enélkül a sorrend nem szigorú (két azonos pontú
 * kártya sorrendje esetleges lenne), és a kurzor vagy kihagyna, vagy ismételne.
 *
 * ⚠️ És csak EGÉSZ SZÁMOT vagy SZÖVEGET hasonlítunk — tört sosem kerül ide (a kanonikus
 * alak amúgy sem engedné az eseményekbe).
 */
function sorrendben(a, b, irany) {
  if (a.ertek !== b.ertek) {
    const kisebb = a.ertek < b.ertek ? -1 : 1;
    return irany === 'novekvo' ? kisebb : -kisebb;
  }
  if (a.azonosito === b.azonosito) return 0;
  return a.azonosito < b.azonosito ? -1 : 1;
}

// ===================================
// A KURZOR
// ===================================
//
// ⭐ ÁTLÁTSZATLAN SZÖVEG, SZÁNDÉKOSAN. A hívó nem gyárt kurzort, csak visszaadja, amit
// kapott — így a belső alakja később változhat (pl. lemezre írt index pozíciója), anélkül
// hogy a felület változna.

function kurzorKodolas({ horgony, most, ertek, azonosito }) {
  return Buffer.from(JSON.stringify({ h: horgony, t: most, v: ertek, e: azonosito }), 'utf8')
    .toString('base64url');
}

function kurzorDekodolas(kurzor) {
  let adat;
  try {
    adat = JSON.parse(Buffer.from(kurzor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Értelmezhetetlen kurzor. Kezdd elölről a lapozást.');
  }
  if (!Number.isInteger(adat?.h) || !Number.isInteger(adat?.t) || typeof adat?.e !== 'string'
      || (typeof adat?.v !== 'number' && typeof adat?.v !== 'string')) {
    throw new Error('Hiányos kurzor. Kezdd elölről a lapozást.');
  }
  return { horgony: adat.h, most: adat.t, ertek: adat.v, azonosito: adat.e };
}

// ===================================
// EGY OLDAL
// ===================================

/**
 * Egy oldalnyi kártya a pakliból.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas]
 * @param {string} [beallitas.rendezes] - `RENDEZESEK` egyike
 * @param {string} [beallitas.irany] - 'csokkeno' (alap) | 'novekvo'
 * @param {string} [beallitas.kurzor] - egy korábbi válasz `kovetkezoKurzor`-a
 * @param {number} [beallitas.darab]
 * @param {Object} [beallitas.nezet] - `ujPakliNezet()`, a kép megtartásához
 * @returns {Promise<Object>} { kartyak, kovetkezoKurzor, horgony, ujdonsag, osszes }
 */
export async function pakliOldal(tar, koino, beallitas = {}) {
  const rendezes = beallitas.rendezes ?? 'sajatPont';
  const irany = beallitas.irany === 'novekvo' ? 'novekvo' : 'csokkeno';
  const nezet = beallitas.nezet ?? ujPakliNezet();

  console.log('pakli.pakliOldal - KEZDÉS', { rendezes, irany, darab: beallitas.darab });

  // ⛔ ISMERETLEN RENDEZÉS: HIBA, NEM CSENDES ALAPÉRTELMEZÉS. Ha elgépelem, tudni akarom —
  // különben a lap más sorrendet mutatna, mint amit kért, és senki nem venné észre.
  if (!RENDEZESEK.includes(rendezes)) {
    throw new Error('Ismeretlen rendezés: ' + rendezes
      + ' — választható: ' + RENDEZESEK.join(', '));
  }

  // A darabszám mindig korlátos (lásd MAX_DARAB).
  const kertDarab = Number.isInteger(beallitas.darab) ? beallitas.darab : ALAP_DARAB;
  const darab = Math.max(1, Math.min(kertDarab, MAX_DARAB));

  const honnan = beallitas.kurzor ? kurzorDekodolas(beallitas.kurzor) : null;

  // ----- A KÉP: a horgonyhoz tartozó állapot -----
  const esemenyek = await koinoEsemenyei(tar, koino);
  const teljes = esemenyek.length;

  // Az első lekérés horgonyt VER; a továbbiak a kurzorból hozzák. ⚠️ A `min` azért kell,
  // mert egy régi kurzor nagyobb horgonyt hozhat, mint amennyi eseményünk most van (pl.
  // más adat-mappából indítva) — akkor a mostani a mérvadó.
  const horgony = Math.min(honnan?.horgony ?? teljes, teljes);

  // ⭐⭐ AZ IDŐ IS A HORGONY RÉSZE — és ez a 2026-09-06-i egyezmény-végrehajtás miatt lett
  // szükséges. Az entitás mai alakja nem csak az eseményektől függ, hanem attól is, **mikor
  // kérdezzük**: egy javaslat a lapozás közben járhat le, és az egyezménye átírhatja egy
  // kártya címét — vagyis a rendezési értékét is. ⚠️ Az „első N esemény" önmagában tehát már
  // nem elég befagyasztott bemenet; a pillanat is kell hozzá.
  const most = honnan?.most ?? beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, horgony, most, esemenyek);

  // ----- A RENDEZÉSI ÉRTÉK -----
  const agazati = agazatiPontok(kep.entitasok);
  const utak = rendezes === 'hierarchikus' ? utvonalak(kep.entitasok) : null;

  const ertekhez = (e) => {
    if (rendezes === 'ido') return e.letrehozva ?? 0;
    if (rendezes === 'sajatPont') return e.osszesPont;
    if (rendezes === 'agazatiPont') return agazati.get(e.azonosito) ?? 0;
    return utak.get(e.azonosito) ?? e.azonosito;      // hierarchikus
  };

  const mind = [];
  for (const e of kep.entitasok.values()) {
    mind.push({ azonosito: e.azonosito, ertek: ertekhez(e), entitas: e });
  }

  // ⭐⭐ A JAVASLATOK MÁR NINCSENEK KÜLÖN (2026-09-06): mióta a javaslat is ENTITÁS
  // (llapotSzamitas.js), a fenti ciklus **magától** hozza őket — saját tudatponttal,
  // saját rendezési értékkel, és a szülőjük az érintett entitás.
  //
  // ⚠️ Ez egy KÉNYSZER-MEGOLDÁST szüntetett meg: előtte a javaslat rendezési értékét
  // kézzel az érintettétől kölcsönöztük, mert magának nem volt. Most nem kell — a
  // szerkezet megoldotta. *A javaslat a gondolata GYEREKE, tehát a hierarchikus rendezés
  // amúgy is mellé teszi.*
  mind.sort((a, b) => sorrendben(a, b, irany));

  // ----- A KURZOR UTÁNI RÉSZ -----
  //
  // ⭐ KULCS-ALAPÚ (nem sorszám-alapú) lapozás: „add azt, ami a legutóbbi elem UTÁN jön".
  // Ezért marad az illesztés milliárdos: egy későbbi, indexelt megvalósítás **oda tud
  // ugrani**, míg egy `skip=1000000` mindig végigolvasná az elejét.
  const kezdet = honnan
    ? mind.findIndex((elem) => sorrendben(honnan, elem, irany) < 0)
    : 0;
  const innen = kezdet < 0 ? mind.length : kezdet;

  const oldal = mind.slice(innen, innen + darab);
  const utolso = oldal[oldal.length - 1];

  const eredmeny = {
    kartyak: oldal.map((elem) => kartya(
      elem.entitas, agazati.get(elem.azonosito) ?? 0, beallitas.szerzo, kep.entitasok,
      kep.javaslatok?.get(elem.azonosito) ?? null)),
    // Csak akkor van következő oldal, ha maradt még valami.
    kovetkezoKurzor: (utolso && innen + darab < mind.length)
      ? kurzorKodolas({ horgony, most, ertek: utolso.ertek, azonosito: utolso.azonosito })
      : null,
    horgony,
    most,
    // ⭐ Amit a horgony óta kaptunk, azt MEGMONDJUK — nem keverjük bele némán.
    ujdonsag: teljes > horgony,
    ujEsemenyek: teljes - horgony,
    osszes: mind.length,
    rendezes,
    irany
  };

  console.log('pakli.pakliOldal - VÉGE',
    { kartyak: eredmeny.kartyak.length, osszes: eredmeny.osszes, ujdonsag: eredmeny.ujdonsag });
  return eredmeny;
}

// ===================================
// EGY ENTITÁS SZÖVEGE
// ===================================

/**
 * Egy entitás szövege — külön kérdésre, mert a lista szándékosan nem hozza.
 *
 * ⭐ AZ ILLESZTÉS ITT IS A LÉNYEG: a lap **EGY entitás** szövegét kéri, nem az összesét.
 * Ettől marad a válasz mérete korlátos, akárhány kártya van a pakliban.
 *
 * ⚠️ MIÉRT A KÉPBŐL, ÉS NEM A NYERS LÉTREHOZÓ ESEMÉNYBŐL? Mert egy elfogadott
 * **egyezmény átírhatta** (`egyezmenyVegrehajtas.js`). A szeletből olvasva a régi szöveget
 * kapnánk — pontosan az a hiba, amit 2026-09-06-án mértünk a címnél.
 *
 * ⏸️ A megvalósítás ma a pakli képét használja újra (tehát meleg gyorsítótárnál ingyen van);
 * ha egyszer kevés lesz, **a hívó változtatása nélkül** cserélhető — 9. szabály.
 *
 * @returns {Promise<Object|null>} { azonosito, tipus, cim, szoveg } vagy null
 */
export async function entitasSzovege(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasSzovege - KEZDÉS', { azonosito });

  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, esemenyek.length, most, esemenyek);

  const entitas = kep.entitasok.get(azonosito);
  if (!entitas) {
    console.log('pakli.entitasSzovege - VÉGE (nincs ilyen entitás)');
    return null;
  }

  const eredmeny = {
    azonosito: entitas.azonosito,
    tipus: entitas.tipus,
    cim: entitas.cim,
    szoveg: entitas.szoveg ?? null
  };
  console.log('pakli.entitasSzovege - VÉGE', { van: eredmeny.szoveg !== null });
  return eredmeny;
}

/**
 * Egy entitás tudatpont-képe — szintén külön kérdésre.
 *
 * ⚠️ A VÁLASZ ALAKJA `{ data: … }`, és ez SZÁNDÉKOS ELTÉRÉS a többi végponttól. A prototípus
 * `GET /api/tudatpont/entitas/:tipus/:id`-je így válaszolt, és az örökölt `Kartya.js` így
 * olvassa (`valasz?.data?.eemberHozzajarulas`). ⭐ Két rossz és egy jó út volt: átírni a
 * kártyát (elveszne, hogy változatlanul jött), a felületen fordítani (egy mezőért új réteg),
 * vagy **itt megtartani a prototípus alakját** ezen az egy végponton. *A hívó a régi; a
 * válasz alkalmazkodik hozzá, nem fordítva.*
 *
 * @returns {Promise<Object|null>}
 */
export async function entitasTudatpontja(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasTudatpontja - KEZDÉS', { azonosito });

  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, esemenyek.length, most, esemenyek);

  const entitas = kep.entitasok.get(azonosito);
  if (!entitas) {
    console.log('pakli.entitasTudatpontja - VÉGE (nincs ilyen entitás)');
    return null;
  }

  const en = beallitas.szerzo;
  const eredmeny = {
    data: {
      // ⭐ A MENÜ EZEN MÚLIK: aki nem tett pontot az entitásra, az nem tehet rá javaslatot
      // sem (domain-szabály) — a kártya ebből tiltja le a tudatpont-függő menüpontokat.
      eemberHozzajarulas: en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) : 0,
      osszesPont: entitas.osszesPont,
      hozzajarulokSzama: entitas.hozzajarulok.size
    }
  };
  console.log('pakli.entitasTudatpontja - VÉGE', eredmeny.data);
  return eredmeny;
}

// ===================================
// A RÉSZLETEK (Szakasz 5.5)
// ===================================

// ⚠️ A KÜSZÖB-NEVEK ELTÉRNEK. A koino a `javaslatSzamitas.js` neveit használja
// (`elfogadasiKuszob`, `reszveteliKuszob`, `minimumDontesiIdo`, `maximumDontesiIdo`), a
// prototípus kártyái és modáljai viszont a régieket olvassák. ⭐ A fordítás ITT történik,
// egy helyen — nem a lapon szétszórva, és nem úgy, hogy a koino átveszi az idegen neveket.
const KUSZOB_KIFELE = {
  elfogadasiKuszob: 'javaslatElfogadasiKuszob',
  reszveteliKuszob: 'reszveteliAranyKuszob',
  minimumDontesiIdo: 'aktualMinimumDontesiIdo',
  maximumDontesiIdo: 'aktualMaximumDontesiIdo'
};

/** Küszöb-négyes a prototípus neveivel. */
function kuszobokKifele(kuszobok) {
  const ki = {};
  for (const [belso, kulso] of Object.entries(KUSZOB_KIFELE)) ki[kulso] = kuszobok?.[belso];
  return ki;
}

/**
 * Egy entitás részletei — a `ReszletekModal` ezt kéri.
 *
 * ⚠️ A VÁLASZ `{ data: … }` alakú, mint a tudatpont-képnél: az örökölt modal így olvassa.
 * *A hívó a régi; a válasz alkalmazkodik hozzá.*
 */
export async function entitasReszletei(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasReszletei - KEZDÉS', { azonosito });

  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, esemenyek.length, most, esemenyek);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  const agazati = agazatiPontok(kep.entitasok);
  const en = beallitas.szerzo;

  console.log('pakli.entitasReszletei - VÉGE');
  return {
    data: {
      entitasId: e.azonosito,
      entitasTipus: e.tipus,
      // ⭐ A koinóban a `cim` a név MINDEN típusnál — a modal `nev`-et is olvashat.
      cim: e.cim,
      nev: e.cim,
      szoveg: e.szoveg ?? null,
      ikon: e.ikon ?? null,
      szuloId: e.szulo ?? null,
      letrehozva: e.letrehozva,
      szerzo: e.szerzo,
      meret: e.meret,
      gondolatTipus: besorolas(kep.entitasok, e.gondolatTipus),
      kategoriak: (e.kategoriak ?? [])
        .map((k) => besorolas(kep.entitasok, k)).filter((k) => k !== null),
      osszesPont: e.osszesPont,
      agazatiPont: agazati.get(e.azonosito) ?? 0,
      hozzajarulokSzama: e.hozzajarulok.size,
      eemberHozzajarulas: en ? (e.hozzajarulok.get(en)?.pont ?? 0) : 0,
      // ⭐ Ki adott rá pontot — a `HozzajarulokModal` ezt mutatja. ⚠️ Nevet nem tudunk
      // mondani (D6: személyes adat nem megy a láncra), csak kulcs-azonosítót.
      hozzajarulok: [...e.hozzajarulok.entries()]
        .map(([ki, ertek]) => ({ szerzo: ki, pont: ertek.pont, szerep: ertek.szerep }))
        .sort((a, b) => (b.pont - a.pont) || (a.szerzo < b.szerzo ? -1 : 1))
    }
  };
}

/**
 * „Hány felmenőre kell még tudatpont?" — a `TudatpontModal` ezt kéri megnyitáskor.
 *
 * ⭐ MIT JELENT: ha egy gyerekre teszel pontot, a felmenőire is illik — különben az ág
 * összesítése (`agazatiPont`) félrevezető lenne, és a gyerek „lebegne" a fában. A
 * prototípus ugyanezt kérdezte; a modal ebből ajánlja fel, hogy kitöltse őket.
 *
 * ⚠️ EZ NEM SZABÁLY, HANEM SEGÍTSÉG. A koino nem tiltja, hogy csak a gyerekre tegyél
 * pontot — a `szabalyok.js` nem is tud róla. *A program bejelent, nem bíráskodik (D19).*
 *
 * ⚠️⚠️ És a kör-őr itt is kell: a `szulo`-lánc körbe mutathat.
 */
export async function hianyzoFelmenok(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.hianyzoFelmenok - KEZDÉS', { azonosito });

  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, esemenyek.length, most, esemenyek);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  const en = beallitas.szerzo;
  const hianyzok = [];
  const latott = new Set([azonosito]);

  let szulo = e.szulo;
  while (szulo && kep.entitasok.has(szulo) && !latott.has(szulo)) {
    latott.add(szulo);
    const felmeno = kep.entitasok.get(szulo);
    const sajat = en ? (felmeno.hozzajarulok.get(en)?.pont ?? 0) : 0;
    if (sajat <= 0) {
      hianyzok.push({
        entitasId: felmeno.azonosito,
        entitasTipus: felmeno.tipus,
        nev: felmeno.cim
      });
    }
    szulo = felmeno.szulo;
  }

  // Mennyi tudatpontom maradt még kiosztatlanul? (A keretből, ami már ki van osztva.)
  let kiosztva = 0;
  for (const entitas of kep.entitasok.values()) {
    kiosztva += en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) : 0;
  }

  console.log('pakli.hianyzoFelmenok - VÉGE', { hianyzo: hianyzok.length });
  return {
    data: {
      hianyzoFelmenok: hianyzok,
      hianyzoDb: hianyzok.length,
      eemberEgyenleg: TUDATPONT_KERET - kiosztva
    }
  };
}

/**
 * Egy entitás küszöbei — az `ErtekJavaslatModal` és a `ReszletekModal` kéri.
 *
 * ⭐ A küszöb a tulajdonosok érték javaslatainak MEDIÁNJA (D4) — ez számítás, tehát a
 * programé. A saját javaslatomat külön adjuk vissza, hogy a modal ki tudja tölteni a mezőket.
 */
export async function entitasKuszobei(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasKuszobei - KEZDÉS', { azonosito });

  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = kepetKerni(nezet, koino, esemenyek.length, most, esemenyek);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  // A saját érték javaslatom — a szabály-réteg által elfogadott események közül az utolsó.
  let sajat = null;
  if (beallitas.szerzo) {
    for (const esemeny of kep.szamitok ?? []) {
      if (esemeny.tipus !== 'ErtekJavaslat') continue;
      if (esemeny.szerzo !== beallitas.szerzo) continue;
      if (esemeny.adat?.entitas !== azonosito) continue;
      sajat = esemeny.adat.ertekek;      // az utolsó nyer
    }
  }

  console.log('pakli.entitasKuszobei - VÉGE', { vanSajat: sajat !== null });
  return {
    aktualisErtekek: kuszobokKifele(e.kuszobok ?? ALAP_KUSZOBOK),
    eemberJavaslat: sajat ? kuszobokKifele(sajat) : null
  };
}

/**
 * A horgonyhoz tartozó kép — gyorsítótárból, vagy kiszámolva.
 *
 * ⚠️ ITT ÜL MA A NEM-SKÁLÁZÓ RÉSZ, és tudatosan: az `allapotSzamitasa` az első `horgony`
 * darab eseményt kapja. **Egy lapozás alatt EGYSZER fut le**, nem oldalanként — a további
 * oldalak a gyorsítótárból jönnek.
 */
function kepetKerni(nezet, koino, horgony, most, esemenyek) {
  const kulcs = koino + '|' + horgony + '|' + most;
  if (nezet.horgony === kulcs && nezet.kep) return nezet.kep;

  // ⭐ „Az első N esemény" — és ez azért stabil halmaz, mert a tár HOZZÁFŰZHETŐ: ami egyszer
  // beírt, az ott marad, azon a helyen.
  const bemenet = horgony >= esemenyek.length ? esemenyek : esemenyek.slice(0, horgony);
  const kep = allapotSzamitasa(bemenet);

  // ⭐⭐ ÉS A HÁROM FÁZIS HARMADIKA: az elfogadott szerkesztési egyezmények rávezetése.
  // ⚠️ Enélkül a pakli **elfogadott egyezmény után is a régi címet mutatná** — pontosan az
  // a hiba, amit a Szakasz 5.3 első órájában mértünk.
  const javaslatok = javaslatokSzamitasa(kep.szamitok, kep, most);
  egyezmenyekAlkalmazasa(kep, javaslatok);

  // ⭐ A javaslatok is kártyák (5.5) — a képpel együtt tartjuk, hogy ne kelljen kétszer
  // kiszámolni őket.
  kep.javaslatok = javaslatok;

  nezet.horgony = kulcs;
  nezet.kep = kep;
  nezet.szamitasok++;
  return kep;
}
