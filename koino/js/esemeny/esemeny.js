// koino/js/esemeny/esemeny.js

// Felelősség: egy ESEMÉNY létrehozása (aláírással) és ellenőrzése.
//
// A koino adata nem állapot, hanem esemény: „én, ekkor, ezt tettem" — aláírva. Az
// állapot (mely gondolatok léteznek, ki hova rendelt tudatpontot, mi a szavazás állása)
// ebből SZÁMÍTÓDIK (D17), nem a szerver állítja.
//
// EGY ESEMÉNY KÉT RÉSZBŐL ÁLL:
//   1. a GONDOLAT (koino, tipus, szerzo, elozo, sorszam, ido, adat) — ezt írjuk alá,
//   2. a BURKOLAT (azonosito, alairas) — ez a gondolatból SZÁRMAZIK.
// Az azonosító a gondolat lenyomata, tehát nem külön adat, hanem a gondolat neve. Ezért
// nem szerepelhet a lenyomatolt részben (önmagára hivatkozna).
//
// MIT ÍRUNK ALÁ? Az azonosítót — vagyis a gondolat lenyomatát. Így az aláírás
// ellenőrzéséhez elég az azonosító, az azonosító pedig igazolja a teljes gondolatot.
// (Ugyanaz a szerkezet, amit a git használ: a commit neve a gondolata lenyomata, az
// aláírás pedig arra a névre megy.)
//
// Használják: a tár-réteg és minden művelet (gondolat, tudatpont, javaslat, szavazat).

import { lenyomat, base64UrlBajtok, bajtokBase64Url } from './kanonikusAlak.js';

const ALGORITMUS = 'Ed25519';

// A gondolat mezői — EZEK és csakis ezek kerülnek a lenyomatba, ebben a sorrendben
// (a sorrend valójában mindegy, mert a kanonikus alak úgyis rendez — de a lista
// rögzítése azért fontos, hogy ne csússzon be véletlenül új mező a lenyomatba).
//
// ===== A BURKOLAT BŐVÜLT (2026-08-31, a Szakasz 3 / 3.1 lépése) =====
//
// Három mező került be, és MINDHÁROM ugyanazt a hiányt pótolja: ha a tárolást
// szeleteljük (entitásonként), a készülék már NEM látja egy szerző teljes láncát — tehát
// amit eddig a lánc végigjárásából tudtunk meg, azt ezentúl AZ ESEMÉNYNEK KELL HOZNIA.
//
//   entitas        — ⭐ A SZELET-KULCS. Melyik entitáshoz tartozik ez az esemény?
//   entitasSorszam — hányadik eseményem EZEN AZ ENTITÁSON (a `sorszam` entitás-szintű párja)
//   latott         — pár IDEGEN esemény azonosítója, amit már ismertem (horgony az időhöz)
//   lancGyoker     — ⏸️ LEFOGLALT HELY, egyelőre MINDIG `null` (lásd lentebb)
//
// ⚠️ MIÉRT A BURKOLATBAN, ÉS NEM AZ `adat`-BAN? Mert a tár-illesztőnek szeletelnie kell,
// és ehhez NEM SZABAD értenie a domaint. Ma az entitás típusonként más néven lapul az
// adatban (`adat.entitas`, `adat.erintett`, a szavazatnál pedig csak közvetve, a javaslaton
// keresztül). Egyetlen, típus-független szabály kell helyette:
//
//   ⭐ szelet(e) = e.entitas ?? e.azonosito
//
// A `null` jelentése tehát: „ez az esemény a SAJÁT szeletét nyitja" — így a gondolat-
// létrehozás (ami maga hozza létre az entitást) és a koino-létrehozás is befér a szabályba,
// külön eset nélkül. *(A saját azonosítót nem lehetne a mezőbe írni: önmagára hivatkozna.)*
//
// ⚠️ MIÉRT MOST? Mert a kanonikus alak bővítése KÉSŐBB NEM INGYENES: a régi eseményeket
// nem lehet újra aláírni (az aláírás a régi bájtokra szól), tehát kétféle eseményalak
// maradna örökre — és átállás közben két gép ugyanarra a tudásra MÁS ujjlenyomatot
// számolna, NÉMÁN. A tárban 2026-08-31-én 9 valódi esemény volt.
//
// ⚠️ MINDIG JELEN VANNAK (`null`, illetve `[]`), soha nem hiányoznak. A kanonikus alak a
// hiányzó mezőt kihagyja — ha hol lenne, hol nem, két majdnem-azonos esemény lenyomata
// magyarázhatatlanul eltérne. Ugyanaz a megfontolás, mint az `elozo: null`-nál.
//
// ===== ⏸️ A NEGYEDIK MEZŐ: LEFOGLALT HELY (Csaba döntése, 2026-09-02) =====
//
// A `lancGyoker` a szerző EGÉSZ addigi láncára kötne el egyetlen lenyomattal — nagyjából
// úgy, ahogy az `elozo` az előző eseményre mutat. ⭐ Ettől a kettős lánc bizonyítéka
// TÚLÉLNÉ az összenyomást: aki elágazik, két különböző gyökeret kötelez el magára, és a
// két aláírt állítása mond ellent egymásnak.
//
// ⚠️ DE MOST MÉG NINCS FOGYASZTÓJA. Ehhez az összegző Merkle-fa kell, ami a Szakasz 4
// munkája — és egy mező, aminek nincs fogyasztója, ROSSZ DEFINÍCIÓT kap. A kanonikus
// alakban pedig épp ez a drága hiba.
//
// ⭐ EZÉRT: a mező MOST bekerül, de MINDIG `null`. Amit később nem lehet olcsón megtenni,
// az egy mező HOZZÁADÁSA vagy ELVÉTELE — mert attól kétféle eseményalak lenne, és átállás
// közben két gép ugyanarra a tudásra MÁS ujjlenyomatot számolna, némán. Egy `null`-t
// értelmes értékre cserélni NEM ilyen: az csak egy másik érték, mint bármelyik másikban.
const TARTALOM_MEZOK = [
  'koino', 'tipus', 'szerzo', 'elozo', 'sorszam', 'ido',
  'entitas', 'entitasSorszam', 'latott', 'lancGyoker',
  'adat'
];

/**
 * ⭐ A SZELET-KULCS — melyik entitáshoz tartozik az esemény.
 *
 * Ez az egyetlen szabály, amit a tár-illesztőnek ismernie kell a szeleteléshez. Domain-
 * tudást nem igényel: vagy meg van mondva, vagy az esemény a saját szeletét nyitja.
 *
 * @param {Object} esemeny
 * @returns {string} az entitás azonosítója
 */
export function szelet(esemeny) {
  return esemeny.entitas ?? esemeny.azonosito;
}

// ===================================
// SEGÉD: A LENYOMATOLANDÓ RÉSZ KIEMELÉSE
// ===================================

/**
 * Kiveszi az eseményből azt a részt, amit a lenyomat fed.
 * @param {Object} esemeny
 * @returns {Object}
 */
function tartalomResz(esemeny) {
  const resz = {};
  for (const mezo of TARTALOM_MEZOK) {
    if (esemeny[mezo] !== undefined) resz[mezo] = esemeny[mezo];
  }
  return resz;
}

// ===================================
// ESEMÉNY LÉTREHOZÁSA
// ===================================

/**
 * Létrehoz egy aláírt eseményt.
 *
 * @param {Object} leiras
 * @param {string} leiras.koino - melyik koinóhoz tartozik (D25: több koino egy készüléken)
 * @param {string} leiras.tipus - pl. 'GondolatLetrehozas'
 * @param {Object} leiras.adat - a művelet gondolata (típusfüggő)
 * @param {string|null} leiras.elozo - az előző SAJÁT eseményem azonosítója (az első: null)
 * @param {number} leiras.sorszam - hányadik a saját láncomban (az első: 1)
 * @param {number} [leiras.ido] - a szerző órája szerint (alapból: most)
 * @param {string|null} [leiras.entitas] - a SZELET-KULCS; null = az esemény a saját szeletét nyitja
 * @param {number} [leiras.entitasSorszam] - hányadik eseményem ezen az entitáson (alap: 1)
 * @param {Array<string>} [leiras.latott] - idegen események, amiket már ismertem (horgony)
 * @param {CryptoKeyPair} kulcspar - a saját kulcspár
 * @returns {Promise<Object>} az aláírt esemény
 */
export async function esemenyLetrehozasa(leiras, kulcspar) {
  console.log('esemenyLetrehozasa - KEZDÉS', { tipus: leiras.tipus, sorszam: leiras.sorszam });

  // ----- A SZERZŐ: a nyilvános kulcs -----
  // Nem név, nem fiók: a személyazonosság maga a kulcs (D15).
  const nyersKulcs = await crypto.subtle.exportKey('raw', kulcspar.publicKey);
  const szerzo = bajtokBase64Url(new Uint8Array(nyersKulcs));

  const gondolat = {
    koino: leiras.koino,
    tipus: leiras.tipus,
    szerzo,
    elozo: leiras.elozo ?? null,
    sorszam: leiras.sorszam,
    // Az idő a SZERZŐ órája — tájékoztató adat, soha nem bizonyíték. A sorrendet a
    // saját láncban a `sorszam` adja, nem ez.
    ido: leiras.ido ?? Date.now(),

    // ----- A HÁROM ÚJ MEZŐ (lásd a TARTALOM_MEZOK melletti magyarázatot) -----
    // Mindhárom MINDIG jelen van, hogy a lenyomat kiszámítható maradjon.
    entitas: leiras.entitas ?? null,
    entitasSorszam: leiras.entitasSorszam ?? 1,
    // A horgony: idegen események, amiket a szerző a sajátja előtt már ismert. Üres tömb
    // is érvényes — akkor egyszerűen nincs mihez kötni az eseményt (D19: ez jelzés, nem vád).
    latott: Array.isArray(leiras.latott) ? [...leiras.latott] : [],
    // ⏸️ LEFOGLALT HELY — a jelentése a Szakasz 4-ben dől el (lásd fent). Addig `null`.
    lancGyoker: leiras.lancGyoker ?? null,

    adat: leiras.adat
  };

  // ----- AZ AZONOSÍTÓ: a gondolat lenyomata -----
  // Ha a gondolatban tört szám vagy más tiltott érték van, ez itt HIBÁT DOB — jobb
  // most kiderülnie, mint akkor, amikor két gép már nem ért egyet.
  const azonosito = await lenyomat(gondolat);

  // ----- AZ ALÁÍRÁS: az azonosítóra -----
  const alairasBajtok = await crypto.subtle.sign(
    { name: ALGORITMUS },
    kulcspar.privateKey,
    new TextEncoder().encode(azonosito)
  );

  const esemeny = {
    ...gondolat,
    azonosito,
    alairas: bajtokBase64Url(new Uint8Array(alairasBajtok))
  };

  console.log('esemenyLetrehozasa - VÉGE', { azonosito });
  return esemeny;
}

// ===================================
// ESEMÉNY ELLENŐRZÉSE
// ===================================

/**
 * Ellenőriz egy eseményt: valóban az állítólagos szerzőtől való-e, és változatlan-e.
 *
 * KÉT DOLGOT NÉZ MEG:
 *   1. az azonosító tényleg a gondolat lenyomata-e (nem babráltak a gondolatba),
 *   2. az aláírás a szerző kulcsával készült-e (tényleg ő írta alá).
 * A kettő együtt: a gondolat egyetlen bájtja sem változhatott a szerző óta.
 *
 * FONTOS, MIT NEM NÉZ: hogy a szerző jogosult-e a műveletre, hogy a lánc folytonos-e,
 * és hogy az idő igaz-e. Azok külön kérdések (tár-réteg, állapot-réteg).
 *
 * @param {Object} esemeny
 * @returns {Promise<{rendben: boolean, ok?: string}>}
 */
export async function esemenyEllenorzese(esemeny) {
  // ----- ALAKI ELLENŐRZÉS -----
  if (!esemeny || typeof esemeny !== 'object') {
    return { rendben: false, ok: 'nem objektum' };
  }
  // ⚠️ A HÁROM ÚJ MEZŐ IS KÖTELEZŐ (2026-08-31). Ez szándékos szigor: a kanonikus alak a
  // hiányzó mezőt kihagyja, tehát egy régi alakú esemény ÖNMAGÁBAN érvényesnek látszana —
  // és akkor KÉTFÉLE eseményalak élne egymás mellett. Ki lehetne hagyni a mezőket, hogy a
  // szabály-réteg ne tudjon rájuk támaszkodni. Egy alak van, nem kettő.
  // (A `null` érvényes érték: az `entitas: null` azt jelenti, „a saját szeletét nyitja".)
  for (const mezo of [
    'koino', 'tipus', 'szerzo', 'sorszam', 'ido',
    'entitas', 'entitasSorszam', 'latott', 'lancGyoker',
    'azonosito', 'alairas'
  ]) {
    if (esemeny[mezo] === undefined) {
      return { rendben: false, ok: 'hiányzó mező: ' + mezo };
    }
  }

  // ----- A HÁROM ÚJ MEZŐ ALAKJA -----
  if (esemeny.entitas !== null && typeof esemeny.entitas !== 'string') {
    return { rendben: false, ok: 'az entitas csak azonosító vagy null lehet' };
  }
  if (!Number.isInteger(esemeny.entitasSorszam) || esemeny.entitasSorszam < 1) {
    return { rendben: false, ok: 'az entitasSorszam csak 1-nél nem kisebb egész lehet' };
  }
  if (!Array.isArray(esemeny.latott) || esemeny.latott.some((a) => typeof a !== 'string')) {
    return { rendben: false, ok: 'a latott csak azonosítók tömbje lehet' };
  }
  // ⏸️ A lánc-gyökér egyelőre MINDIG null (lefoglalt hely). Szövegként is átengedjük, hogy
  // a Szakasz 4 bekapcsolása ne kívánjon itt újabb változtatást.
  if (esemeny.lancGyoker !== null && typeof esemeny.lancGyoker !== 'string') {
    return { rendben: false, ok: 'a lancGyoker csak lenyomat vagy null lehet' };
  }

  // ----- 1. AZ AZONOSÍTÓ A GONDOLAT LENYOMATA-E? -----
  let ujraszamolt;
  try {
    ujraszamolt = await lenyomat(tartalomResz(esemeny));
  } catch (hiba) {
    return { rendben: false, ok: 'a gondolat nem hozható kanonikus alakra: ' + hiba.message };
  }
  if (ujraszamolt !== esemeny.azonosito) {
    return { rendben: false, ok: 'az azonosító nem a gondolat lenyomata (a gondolat megváltozott)' };
  }

  // ----- 2. AZ ALÁÍRÁS A SZERZŐ KULCSÁVAL KÉSZÜLT-E? -----
  try {
    const nyilvanosKulcs = await crypto.subtle.importKey(
      'raw', base64UrlBajtok(esemeny.szerzo), { name: ALGORITMUS }, false, ['verify']
    );
    const rendben = await crypto.subtle.verify(
      { name: ALGORITMUS },
      nyilvanosKulcs,
      base64UrlBajtok(esemeny.alairas),
      new TextEncoder().encode(esemeny.azonosito)
    );
    if (!rendben) return { rendben: false, ok: 'az aláírás nem a szerzőé' };
  } catch (hiba) {
    return { rendben: false, ok: 'az aláírás nem ellenőrizhető: ' + hiba.message };
  }

  return { rendben: true };
}

// ===================================
// KÉT ESEMÉNY ÜTKÖZÉSE — A SAJÁT LÁNC ELÁGAZÁSA
// ===================================

/**
 * Megnézi, hogy két esemény ELLENTMOND-e egymásnak.
 *
 * A koino nem MEGAKADÁLYOZZA a kettős cselekvést, hanem LELEPLEZI (D17/D19). Ha valaki
 * két különböző eseményt ír alá ugyanarról a pontról a saját láncán — azonos szerző,
 * azonos sorszám, de más azonosító —, akkor a két aláírás ÖNMAGÁBAN bizonyíték. Nem
 * kell hozzá bíró: mindkettőt ő írta alá.
 *
 * (Ha viszont csak FOLYTATJA a láncát egy újabb sorszámmal, az nem ellentmondás — a
 * szavazatot például szabad módosítani, ahogy ma is.)
 *
 * @param {Object} egyik
 * @param {Object} masik
 * @returns {boolean} igaz, ha a kettő elágazás (ellentmondás)
 */
export function elagazasE(egyik, masik) {
  return egyik.szerzo === masik.szerzo
    && egyik.koino === masik.koino
    && egyik.sorszam === masik.sorszam
    && egyik.azonosito !== masik.azonosito;
}
