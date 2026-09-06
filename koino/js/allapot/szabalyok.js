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
//   - egy TELJESEN IDEGEN kulcs (0 tudatpont) javaslatot tehetett más gondolatára,
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

// ⭐ Hány kategóriába sorolható EGY gondolat? A prototípus is hármat engedett
// (`Maximum 3 különböző kategória rendelhető egy gondolathoz`), és a korlát ott
// Mongoose-validátorban élt. A P2P koinóban nincs szerver, ami visszautasítsa — ezért a
// korlát a SZÁMÍTÁSBAN van (2. szabály lent), és a felület nem tudja kijátszani.
export const KATEGORIA_KORLAT = 3;

// A koino entitás-típusai. ⚠️ Ezek NEM külön esemény-fajták: mindegyiket ugyanaz a
// `GondolatLetrehozas` esemény hozza létre, és az `adat.tipus` különbözteti meg őket
// (ezért van az `allapotSzamitas.js`-ben `?? 'Gondolat'` alapérték). *Az esemény neve
// történeti; a típust az adat mondja meg.*
export const ENTITAS_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];

// ===================================
// A SZABÁLYOK ÉRVÉNYESÍTÉSE
// ===================================

/**
 * Szétválogatja az eseményeket: melyik SZÁMÍT, és melyik nem (indoklással).
 *
 * @param {Array<Object>} esemenyek - elágazás-mentesített események (lásd allapotSzamitas)
 * @returns {{szamitok: Array<Object>, kivetelek: Array<Object>, nemEllenorizhetok: Array<Object>}}
 */
export function szabalyokErvenyesitese(esemenyek) {
  const kivetelek = [];
  const nemEllenorizhetok = [];
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

  /**
   * ⚠️ NEM KIVÉTEL, HANEM JELZÉS: az esemény SZÁMÍT, csak valamit nem tudtunk ellenőrizni.
   *
   * Miért kell ez a harmadik kategória? Mert a szeletelt/hálózati működésben a HIÁNY a
   * normális átmeneti állapot. Ha a nem-ellenőrizhetőt kivételnek vennénk, minden becsületes
   * embert büntetnénk minden lemaradásért — épp azt a hibát követnénk el, amit a D18/5
   * elhalványulás-javaslatánál Csaba már egyszer elutasított.
   */
  const nemEllenorizheto = (esemeny, ok) => {
    nemEllenorizhetok.push({
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

    // ⭐ ISMERJÜK-E A LÁNCOT HÉZAGTALANUL EDDIG A PONTIG?
    // Ez dönti el, hogy egy eltérő bemondás BIZONYÍTOTT ellentmondás-e, vagy csak a mi
    // lemaradásunk. Amint egyszer hézag támad, onnantól a lánc többi részéről sem
    // állíthatunk semmit — ezért nem áll vissza igazra.
    let folytonos = true;
    let vartSorszam = 1;

    for (const e of rendezett) {
      if (e.sorszam !== vartSorszam) folytonos = false;
      vartSorszam = e.sorszam + 1;

      // ===== 1. SZABÁLY: A TUDATPONT-KERET =====
      if (e.tipus === 'TudatpontRendezes') {
        const pont = e.adat?.pont;
        const kiosztva = e.adat?.kiosztva;

        if (!Number.isInteger(pont) || pont < 0) {
          kivetel(e, 'a tudatpont csak nemnegatív egész szám lehet');
          continue;
        }

        // ----- ⭐ A BEMONDOTT ÖSSZEG (D42) -----
        // A pont-esemény magával viszi, mennyi a szerzőnek ÖSSZESEN kiosztva ezután.
        if (!Number.isInteger(kiosztva) || kiosztva < 0) {
          kivetel(e, 'hiányzik vagy hibás a bemondott összeg (adat.kiosztva)');
          continue;
        }

        // ⭐⭐ EZ A D42 LÉNYEGE: EGYETLEN ESEMÉNYBŐL ELDŐL, a lánc többi része nélkül.
        // Szeletelt tárban ez az EGYETLEN mód a keret ellenőrzésére — teljes láncot soha
        // többé nem fogunk látni.
        if (kiosztva > TUDATPONT_KERET) {
          kivetel(e, 'a bemondott összeg túllépi a keretet ('
            + kiosztva + ' / ' + TUDATPONT_KERET + ')');
          continue;
        }

        // A tudatpont ÁTRENDEZHETŐ: ami ezen az entitáson már ott van, az nem „új"
        // kiadás. Ezért a régi értéket kivonjuk, mielőtt az újat hozzáadnánk.
        const regi = pontok.get(e.adat.entitas) ?? 0;
        const ujOsszeg = osszeg - regi + pont;

        // ----- ⭐⭐ A BEMONDÁS ÖSSZEVETÉSE A SAJÁT LÁNCÁVAL -----
        //
        // ITT VÁLIK A HALLGATÁS ÁTADHATÓ BIZONYÍTÉKKÁ. Aki elhallgat egy pont-eseményt,
        // annak a bemondott összege nem stimmel a többi SAJÁT, ALÁÍRT eseményével — és
        // akkor két saját állítása mond ellent egymásnak. Ma a bizonyíték egy HIÁNY
        // (kétértelmű: támadás vagy lemaradás?) és nem átadható; így viszont odaadom a két
        // eseményt, és bárki ellenőrzi.
        //
        // ⚠️ DE CSAK AKKOR BIZONYÍTÉK, HA HÉZAGTALANUL ISMERJÜK A LÁNCOT. Hézag után a
        // MI számításunk a hiányos — nem ő hazudott. Ilyenkor jelzünk, nem büntetünk (D19).
        if (kiosztva !== ujOsszeg) {
          if (folytonos) {
            kivetel(e, 'a bemondott összeg ellentmond a saját láncának (bemondva '
              + kiosztva + ', a láncából ' + ujOsszeg + ')');
            continue;
          }
          nemEllenorizheto(e, 'a bemondott összeg (' + kiosztva
            + ') nem egyezik a számítottal (' + ujOsszeg + '), de a láncában hézag van');
        }

        if (ujOsszeg > TUDATPONT_KERET) {
          kivetel(e, 'túllépné a tudatpont-keretet (' + ujOsszeg + ' / ' + TUDATPONT_KERET + ')');
          continue;   // a régi érték marad érvényben
        }

        pontok.set(e.adat.entitas, pont);
        osszeg = ujOsszeg;
        continue;
      }

      // ===== 2. SZABÁLY: A BESOROLÁS KORLÁTAI (Szakasz 5.4) =====
      //
      // ⭐ MIÉRT ITT, ÉS NEM A FELÜLETEN? Mert *„amit a számítás nem ellenőriz, az nem
      // szabály, csak illemtan"* — a felület a másik gépen nem véd semmitől. A prototípus
      // ezt Mongoose-validátorral tartotta (`Maximum 3 különböző kategória`); a P2P
      // koinóban nincs szerver, ami visszautasítsa, tehát a SZÁMÍTÁSNAK kell kihagynia.
      //
      // ⚠️ A hivatkozott kategória/típus LÉTEZÉSÉT itt NEM nézzük: az a hiány esete
      // (D19) — lehet, hogy csak még nem érkezett meg hozzánk. Ilyenkor a besorolás
      // egyszerűen nem oldódik fel, de az esemény érvényes marad.
      if (e.tipus === 'GondolatLetrehozas') {
        const kategoriak = e.adat?.kategoriak;

        if (kategoriak !== undefined && kategoriak !== null) {
          if (!Array.isArray(kategoriak)) {
            kivetel(e, 'a kategóriák csak listában adhatók meg');
            continue;
          }
          if (kategoriak.length > KATEGORIA_KORLAT) {
            kivetel(e, 'legfeljebb ' + KATEGORIA_KORLAT + ' kategória rendelhető egy '
              + 'gondolathoz (itt ' + kategoriak.length + ')');
            continue;
          }
          if (kategoriak.some((k) => typeof k !== 'string')) {
            kivetel(e, 'a kategória-hivatkozás csak azonosító lehet');
            continue;
          }
          // ⭐ KÜLÖNBÖZŐ kategória — a prototípus is ezt írta elő. Ugyanaz háromszor
          // felsorolva nem három besorolás.
          if (new Set(kategoriak).size !== kategoriak.length) {
            kivetel(e, 'ugyanaz a kategória többször szerepel');
            continue;
          }
        }

        const gondolatTipus = e.adat?.gondolatTipus;
        if (gondolatTipus !== undefined && gondolatTipus !== null
            && typeof gondolatTipus !== 'string') {
          kivetel(e, 'a gondolattípus-hivatkozás csak azonosító lehet');
          continue;
        }
        continue;
      }

      // ===== 3. SZABÁLY: JAVASLATOT CSAK A GAZDA TEHET =====
      // „Csak az tehet javaslatot, aki tudatpontot rendelt a gondolathoz." A kérdés,
      // hogy MIKORI állapot szerint — és a válasz a saját lánc: a javaslat előtti
      // eseményei szerint. Így az sem számít, mi történik később máshol: a jogosultság
      // a javaslat pillanatában eldőlt, és utólag nem írható át.
      if (e.tipus === 'Javaslat') {
        const erintett = e.adat?.erintett;
        const sajatPont = pontok.get(erintett) ?? 0;

        if (sajatPont <= 0) {
          kivetel(e, 'a javaslattevőnek nincs tudatpontja az érintett gondolaton');
        }
        continue;
      }
    }
  }

  const szamitok = esemenyek.filter((e) => !kiesettek.has(e.azonosito));

  console.log('szabalyokErvenyesitese - VÉGE', {
    szamit: szamitok.length,
    kivetel: kivetelek.length,
    nemEllenorizheto: nemEllenorizhetok.length
  });

  return { szamitok, kivetelek, nemEllenorizhetok };
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
// - ⚠️ A SZELEKTÍV MUTOGATÁS (mérve 2026-08-28, a réteg valódi rése). Ha valaki a SAJÁT
//   láncából elrejt egy eseményt egyes gépek elől, azok nem tudják kiszámolni a keretét,
//   és átmegy nekik a túllépés — mert a lenti ciklus csak azt látja, amit ismer. A D17
//   determinizmusa nem sérül (ugyanabból a halmazból mindenki ugyanazt kapja); a két gép
//   MÁS halmazt ismer. A csalás nyoma bennmarad: HÉZAG keletkezik a láncban, és amint a
//   hiányzó esemény megérkezik, a kép helyreáll, a hamis kép pedig bizonyíték lesz.
//   A javasolt irány (döntés a Szakasz 2-ben): ha a szerző láncában hézag van a vizsgált
//   esemény ELŐTT, a keret NEM ELLENŐRIZHETŐ → jelezzük, ne fogadjuk el csendben. Ára:
//   hálózaton a hézag normális átmeneti állapot. Részletek: docs/szakasz1_terv.md, 9. pont.
//
// - AZ ÁLTALÁNOS JAVASLAT TÁGABB HATÓKÖRE. A D27 szerint az általános javaslatnál a
//   jogosultság LEFELÉ terjed: aki az entitásra VAGY BÁRMELY LESZÁRMAZOTTJÁRA tett
//   pontot. Ma mindkét fajtánál a szűkebb szabály fut (az entitáson kell pont legyen).
//   Amikor az általános javaslat felülete elkészül, ez itt bővül — egy helyen.
