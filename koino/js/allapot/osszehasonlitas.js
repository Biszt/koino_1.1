// koino/js/allapot/osszehasonlitas.js

// Felelősség: eldönteni, hogy KÉT KÉSZÜLÉK UGYANAZT SZÁMOLJA-E — egyetlen rövid
// szöveg összehasonlításával.
//
// ⭐ MIÉRT KELL EZ? A D17 ígérete: „ugyanabból az eseményhalmazból mindenki ugyanazt
// kapja". Az ígéret akkor ér valamit, ha MEG IS TUDJUK NÉZNI. Enélkül két készülék
// állapotát csak szemmel lehetne összevetni — és épp a kicsi, néma eltérés maradna rejtve
// (egy hiányzó szavazat, egy másképp számolt küszöb, egy más sorrend).
//
// Ez a Szakasz 2 VIZSGÁJA, futtatható alakban: cserélj, aztán hasonlítsd össze a két
// ujjlenyomatot. Ha egyeznek, a két gép ugyanazt a koinót látja.
//
// ⚠️ AZ IDŐ BEMENET, NEM ÁLLAPOT. A javaslatok státusza az idő múlásával változik (egy
// döntés lezárul). Két készülék ujjlenyomata tehát csak AZONOS IDŐPONTRA számolva
// hasonlítható össze — ezért a `javaslatok` itt bemenet, nem itt számoljuk ki.
//
// Használják: koino.js (az `ujjlenyomat` parancs) és a vizsgaProba.js.

import { lenyomat, kanonikusSzoveg } from '../esemeny/kanonikusAlak.js';

// ===================================
// AZ ÖSSZEFOGLALÓ
// ===================================

/**
 * Az állapotot egyszerű, RENDEZETT adattá alakítja — olyanná, amit a kanonikus alak
 * meg tud fogni (Map és Set nélkül, mindenütt rendezett listákkal).
 *
 * ⚠️ AMIT SZÁNDÉKOSAN BELEVESZÜNK: mindent, ami DÖNTÉS. Az entitások és pontjaik, a
 * küszöbök, a javaslatok szavazat-számai és státusza, az egyezmények — és a három
 * jelzés-lista is (ellentmondás, idő-ellentmondás, kivétel), mert ha két gép másképp
 * jelez, az ugyanolyan eltérés, mint ha másképp számolna.
 *
 * ⚠️ AMIT NEM: a nyers eseményeket. Azok azonossága a csere dolga (az `ALLAS`
 * ujjlenyomata) — ez itt azt méri, hogy ugyanabból UGYANAZ következik-e.
 *
 * @param {Object} allapot - allapotSzamitasa eredménye
 * @param {Map} [javaslatok] - javaslatokSzamitasa eredménye (azonos időpontra!)
 * @returns {Object} rendezett, egyszerű adat
 */
export function allapotOsszefoglaloja(allapot, javaslatok = new Map()) {
  const rendez = (lista, kulcs) =>
    [...lista].sort((a, b) => (kulcs(a) < kulcs(b) ? -1 : kulcs(a) > kulcs(b) ? 1 : 0));

  // ----- ENTITÁSOK -----
  const entitasok = rendez([...allapot.entitasok.values()], (e) => e.azonosito).map((e) => ({
    azonosito: e.azonosito,
    cim: e.cim ?? null,
    szoveg: e.szoveg ?? null,
    szulo: e.szulo ?? null,
    meret: e.meret ?? 0,
    agMeret: e.agMeret ?? 0,
    szerzo: e.szerzo,
    osszesPont: e.osszesPont,
    kuszobok: e.kuszobok ?? null,
    // A hozzájárulók nevek szerint rendezve — Map-ből lista, hogy megfogható legyen
    hozzajarulok: rendez([...e.hozzajarulok.entries()], ([szerzo]) => szerzo)
      .map(([szerzo, adat]) => ({ szerzo, pont: adat.pont, szerep: adat.szerep }))
  }));

  // ----- JAVASLATOK ÉS EGYEZMÉNYEK -----
  const javaslatLista = rendez([...javaslatok.values()], (j) => j.azonosito).map((j) => ({
    azonosito: j.azonosito,
    erintett: j.erintett ?? null,
    muvelet: j.muvelet ?? null,
    statusz: j.statusz,
    tamogatok: j.tamogatok,
    ellenzok: j.ellenzok,
    tartozkodok: j.tartozkodok,
    szavazok: j.szavazok,
    nevezo: j.nevezo,
    tamogatottsagEzrelek: j.tamogatottsagEzrelek,
    bizonyossagiMutato: j.bizonyossagiMutato,
    lezarasIdeje: j.lezarasIdeje,
    // Az egyezmény a döntés eredménye — hogy megszületett-e, az a legfontosabb egyezés
    egyezmeny: j.egyezmeny
      ? {
          megszuletett: j.egyezmeny.megszuletett,
          tamogatok: j.egyezmeny.pillanatkep.tamogatok,
          szavazok: j.egyezmeny.pillanatkep.szavazok,
          tamogatottsagEzrelek: j.egyezmeny.pillanatkep.tamogatottsagEzrelek,
          reszveteliEzrelek: j.egyezmeny.pillanatkep.reszveteliEzrelek
        }
      : null
  }));

  // ----- A JELZÉSEK (D19: bejelent, nem büntet) -----
  return {
    koino: {
      nev: allapot.koino.nev ?? null,
      leiras: allapot.koino.leiras ?? null,
      letrehozo: allapot.koino.letrehozo ?? null
    },
    entitasok,
    javaslatok: javaslatLista,
    ellentmondasok: rendez(allapot.ellentmondasok, (e) => e.szerzo + '|' + e.sorszam)
      .map((e) => ({ szerzo: e.szerzo, sorszam: e.sorszam, azonositok: [...e.azonositok].sort() })),
    idoEllentmondasok: rendez(allapot.idoEllentmondasok, (e) => e.azonosito)
      .map((e) => ({ azonosito: e.azonosito, szerzo: e.szerzo, sorszam: e.sorszam })),
    kivetelek: rendez(allapot.kivetelek, (k) => k.azonosito)
      .map((k) => ({ azonosito: k.azonosito, tipus: k.tipus, ok: k.ok })),
    elfelejtettek: [...allapot.elfelejtettek].sort()
  };
}

// ===================================
// AZ UJJLENYOMAT
// ===================================

/**
 * Az állapot ujjlenyomata: egyetlen 43 karakteres szöveg.
 *
 * Két készülék akkor és csak akkor számolja ugyanazt, ha ez a szöveg megegyezik.
 * Szemmel is összehasonlítható — ez a Szakasz 2 / 4. lépéséhez (két készülék, két
 * hálózat) kell majd, ahol nincs közös program, ami összevesse őket.
 *
 * @param {Object} allapot
 * @param {Map} [javaslatok]
 * @returns {Promise<string>}
 */
export async function allapotUjjlenyomata(allapot, javaslatok) {
  return lenyomat(allapotOsszefoglaloja(allapot, javaslatok));
}

/**
 * Ha két állapot eltér, MEGMONDJA, HOL — nem csak azt, hogy eltér.
 *
 * Egy „nem egyezik" önmagában használhatatlan hiba-üzenet: a Szakasz 2 egész értelme az,
 * hogy ha kiderül egy eltérés, meg is találjuk. Ezért szakaszonként hasonlítunk.
 *
 * @param {Object} egyikOsszefoglalo - allapotOsszefoglaloja eredménye
 * @param {Object} masikOsszefoglalo
 * @returns {Array<string>} az eltérő szakaszok nevei (üres = egyeznek)
 */
export function elteresek(egyikOsszefoglalo, masikOsszefoglalo) {
  const eltero = [];
  for (const szakasz of Object.keys(egyikOsszefoglalo)) {
    if (kanonikusSzoveg(egyikOsszefoglalo[szakasz]) !== kanonikusSzoveg(masikOsszefoglalo[szakasz])) {
      eltero.push(szakasz);
    }
  }
  return eltero;
}
