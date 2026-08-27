// koino/js/allapot/szabalyok.js

// Felelősség: EGY HELYEN eldönteni, mely események SZÁMÍTANAK — és melyek nem.
//
// ⭐ MIÉRT VAN EZ A RÉTEG (2026-08-28, Csaba jóváhagyásával)?
//
//   „Amit a számítás nem ellenőriz, az nem szabály, csak illemtan."
//
// A prototípusban a szerver volt a kapuőr: ő döntötte el, ki mit tehet. Itt NINCS kapuőr.
// A felület ellenőrzései a saját készülékünkön futnak — a másik gép felülete viszont
// semmitől nem véd meg. Mérve (2026-08-28), kézzel aláírt eseményekkel:
//
//   - egy TELJESEN IDEGEN kulcs (0 tudatpont) javaslatot tehetett más tartalmára,
//     megszavazhatta magának, és az EGYEZMÉNY megszületett (1/1 = 100%);
//   - kézzel aláírva 999 999 tudatpont is átment, holott a keret 10 000.
//
// Ez nem két hiba volt, hanem egy HIÁNYZÓ RÉTEG. Ez a fájl az.
//
// ===== KÉT ALAPELV =====
//
// 1. NEM TÖRLÜNK ÉS NEM BÜNTETÜNK. A szabálysértő esemény a tárban marad, és a kivételek
//    listájában LÁTHATÓ lesz. A koino BEJELENT, nem bíráskodik (D19). Ez nem engedékenység:
//    az esemény a szerző aláírásával van ellátva, tehát maga a BIZONYÍTÉK — eldobni épp
//    azt jelentené, hogy elveszítjük.
//
// 2. A DÖNTÉS DETERMINISZTIKUS, ÉS NEM FÜGG AZ IDŐTŐL. Mindkét szabály a SAJÁT LÁNCBAN
//    dől el (sorszám szerint), amit csak a szerző írhat — így nem hamisítható, és nem is
//    változik meg később attól, hogy mi történik máshol. Ugyanabból az eseményhalmazból
//    mindenki ugyanazokat a kivételeket kapja (D17).
//
// Használják: allapotSzamitas.js (és rajta keresztül minden számítás).

// ===================================
// A TUDATPONT-KERET
// ===================================
//
// Mindenkinek UGYANANNYI tudatpontja van: nem elkölthető, csak szétosztható és bármikor
// átrendezhető. Ez itt lakik, EGY példányban — a művelet-réteg és a felület is innen
// veszi, hogy ne csúszhasson szét kétféle igazságra.
export const TUDATPONT_KERET = 10000;

// ===================================
// A SZABÁLYOK ÉRVÉNYESÍTÉSE
// ===================================

/**
 * Szétválogatja az eseményeket: melyik SZÁMÍT, és melyik nem (indoklással).
 *
 * @param {Array<Object>} esemenyek - elágazás-mentesített események (lásd allapotSzamitas)
 * @returns {{szamitok: Array<Object>, kivetelek: Array<{azonosito: string, szerzo: string, tipus: string, ok: string}>}}
 */
export function szabalyokErvenyesitese(esemenyek) {
  const kivetelek = [];
  const kiesettek = new Set();   // az azonosítók, amik nem számítanak

  /** Egy eseményt kivételnek jelöl — de nem dob el semmit (D19). */
  const kivetel = (esemeny, ok) => {
    kiesettek.add(esemeny.azonosito);
    kivetelek.push({
      azonosito: esemeny.azonosito,
      szerzo: esemeny.szerzo,
      tipus: esemeny.tipus,
      sorszam: esemeny.sorszam,
      ok
    });
  };

  // ----- SZERZŐNKÉNT, A SAJÁT LÁNC SORRENDJÉBEN -----
  // A saját láncot csak a szerző írhatja, és a sorszám egyértelmű sorrendet ad. Ezért
  // minden szabály itt dől el — nem az események beérkezési sorrendjében, és nem az
  // órán, amit hazudni lehet.
  const szerzonkent = new Map();
  for (const e of esemenyek) {
    if (!szerzonkent.has(e.szerzo)) szerzonkent.set(e.szerzo, []);
    szerzonkent.get(e.szerzo).push(e);
  }

  for (const lanc of szerzonkent.values()) {
    const rendezett = [...lanc].sort((a, b) => a.sorszam - b.sorszam);
    const pontok = new Map();            // entitás → a szerző jelenlegi pontja rajta
    let osszeg = 0;                      // mennyit osztott ki eddig összesen

    for (const e of rendezett) {

      // ===== 1. SZABÁLY: A TUDATPONT-KERET =====
      if (e.tipus === 'TudatpontRendezes') {
        const pont = e.adat?.pont;

        if (!Number.isInteger(pont) || pont < 0) {
          kivetel(e, 'a tudatpont csak nemnegatív egész szám lehet');
          continue;
        }

        // A tudatpont ÁTRENDEZHETŐ: ami ezen az entitáson már ott van, az nem „új"
        // kiadás. Ezért a régi értéket kivonjuk, mielőtt az újat hozzáadnánk.
        const regi = pontok.get(e.adat.entitas) ?? 0;
        const ujOsszeg = osszeg - regi + pont;

        if (ujOsszeg > TUDATPONT_KERET) {
          kivetel(e, 'túllépné a tudatpont-keretet (' + ujOsszeg + ' / ' + TUDATPONT_KERET + ')');
          continue;   // a régi érték marad érvényben
        }

        pontok.set(e.adat.entitas, pont);
        osszeg = ujOsszeg;
        continue;
      }

      // ===== 2. SZABÁLY: JAVASLATOT CSAK A GAZDA TEHET =====
      // „Csak az tehet javaslatot, aki tudatpontot rendelt a tartalomhoz." A kérdés,
      // hogy MIKORI állapot szerint — és a válasz a saját lánc: a javaslat előtti
      // eseményei szerint. Így az sem számít, mi történik később máshol: a jogosultság
      // a javaslat pillanatában eldőlt, és utólag nem írható át.
      if (e.tipus === 'Javaslat') {
        const erintett = e.adat?.erintett;
        const sajatPont = pontok.get(erintett) ?? 0;

        if (sajatPont <= 0) {
          kivetel(e, 'a javaslattevőnek nincs tudatpontja az érintett tartalmon');
        }
        continue;
      }
    }
  }

  const szamitok = esemenyek.filter((e) => !kiesettek.has(e.azonosito));

  console.log('szabalyokErvenyesitese - VÉGE', {
    szamit: szamitok.length,
    kivetel: kivetelek.length
  });

  return { szamitok, kivetelek };
}

// ===================================
// AMI SZÁNDÉKOSAN NINCS ITT
// ===================================
//
// - A SZAVAZATI JOGOSULTSÁG. Ma bárki szavazhat, akinek van kulcsa — és ezt a Szakasz 1
//   nem is tudja jobban: hogy egy kulcs mögött VALÓDI, EGYETLEN ember áll, azt a bizalmi
//   háló mondja majd meg (D1/D18, Szakasz 3). Addig egy kulcs-özön ugyanúgy elárasztaná a
//   szavazást, akárhány szabályt írnánk ide. Ez tehát nem feledékenység, hanem a réteg
//   határa — és felírva a Szakasz 3-hoz.
//
// - AZ ÁLTALÁNOS JAVASLAT TÁGABB HATÓKÖRE. A D27 szerint az általános javaslatnál a
//   jogosultság LEFELÉ terjed: aki az entitásra VAGY BÁRMELY LESZÁRMAZOTTJÁRA tett
//   pontot. Ma mindkét fajtánál a szűkebb szabály fut (az entitáson kell pont legyen).
//   Amikor az általános javaslat felülete elkészül, ez itt bővül — egy helyen.
