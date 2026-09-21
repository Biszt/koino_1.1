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
// Használják: koino.js (az `ujjlenyomat` parancs — a lenyomat, a `kiment` és az `osszevet`
// ága) és a vizsgaProba.js.

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
    // ⭐⭐ MINDEN ÉRINTETT, sorrendhelyesen (2026-09-07). ⚠️ Nem elég az elsőt bevenni:
    // egy csomag-javaslat második entitásán eltérhetne a két gép, és az ujjlenyomat
    // **hallgatna róla** — pedig épp az az egy kérdése, hogy „ugyanazt látjuk-e?".
    // ⭐ És a RÉSZ-DÖNTÉSEK is bejönnek: a döntés érintettenként dől el, tehát két gép
    // ott is elcsúszhat, miközben az összefoglaló szám még egyezne.
    reszek: (j.reszek ?? []).map((r) => ({
      entitas: r.entitas,
      muvelet: r.muvelet ?? null,
      tamogatok: r.tamogatok, ellenzok: r.ellenzok, tartozkodok: r.tartozkodok,
      szavazok: r.szavazok, nevezo: r.nevezo,
      kuszobTeljesul: r.kuszobTeljesul,
      lezarasIdeje: r.lezarasIdeje
    })),
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

// ===================================
// ⭐⭐⭐ A KÉZI ÚT: AZ ÖSSZEFOGLALÓ EGY LAPON (2026-09-21)
// ===================================
//
// ⛔⛔ MIÉRT KELL, ÉS MIÉRT EDDIG NEM VOLT: az `elteresek` 2026-09-21-ig **egyetlen éles
// hívó nélkül** állt — csak a saját próbája hívta. Vagyis a parancs, ami azért létezik,
// hogy két készülék összevethesse magát, a saját kérdésének a FELÉT válaszolta meg: két
// ember felolvasta egymásnak a 43 karaktert, megállapították, hogy nem egyezik — és itt
// véget is ért. *Pedig a függvény, ami megmondja, MIBEN, végig ott volt.*
//
// ⭐ A HIÁNYZÓ DARAB NEM A SZÁMÍTÁS VOLT, HANEM AZ ÁTVITEL: az összevetéshez a MÁSIK gép
// összefoglalója kell. ⛔ A vonalra nem tesszük rá (6. szabály: új üzenet lenne MINDEN
// körben, egy ritka hibáért) — ⭐ a 4. szabály útja viszont ingyen van: **egy fájl**.
//
// ⚠️ EZ A RÉTEG NEM ÍR LEMEZRE (1. szabály): szöveget készít és szöveget olvas. Hogy a
// szöveg hogyan kerül fájlba, az a `koino.js` dolga.
//
// ⚠️⚠️ ÉS AMIT KIMONDUNK: ez **fejlesztői műszer**, nem koino-funkció. Az `allapotOsszefoglaloja`
// MINDEN entitást belevesz — ez a `betolt()` alakja, az utolsó nem-skálázó út (9. szabály).
// A lap tehát a koino MAI méretéig használható; egymilliárd e-embernél nem ez a válasz.
// *A fájlba írás ezt nem rontja el, csak LÁTHATÓVÁ teszi: eddig egy hash rejtette el,
// mostantól a fájl mérete kiírja.*

const LAP_ALAK = 'koino-ujjlenyomat-1';

/**
 * Az összefoglaló egy hordozható lapon — ezt viszi át az e-ember a másik készülékre.
 *
 * ⭐ A LAP HORDOZZA A PILLANATOT IS, és ez nem kényelem: az állapot ujjlenyomata
 * IDŐFÜGGŐ (a döntések lezárulnak). Két, percekkel eltérő időpontra számolt lap
 * **jogosan** térhet el — ha a pillanat nincs rajta, ezt nem lehetne megkülönböztetni
 * egy valódi eltéréstől. *A műszer mondja meg, mennyire bízhatunk benne, ne a használója
 * találgassa.*
 *
 * @returns {Promise<string>} a lap szövege (kanonikus, tehát bájtra azonos egyezésnél)
 */
export async function ujjlenyomatLap(allapot, javaslatok, beallitas = {}) {
  const { koino = null, szerzo = null, pillanat = Date.now(), napokMulva = 0 } = beallitas;
  const osszefoglalo = allapotOsszefoglaloja(allapot, javaslatok);

  return kanonikusSzoveg({
    alak: LAP_ALAK,
    koino,
    szerzo,
    pillanat,
    napokMulva,
    // ⭐ A LAP KIMONDJA A SAJÁT UJJLENYOMATÁT — így az olvasó ELLENŐRIZHETI, hogy a lapot
    // nem írták át és nem sérült meg útközben. *Ugyanaz az elv, mint a fájl-tárnál: olvasáskor
    // újra lenyomatolunk. A csatornát nem kell megbízhatóvá tenni (3. szabály).*
    ujjlenyomat: await lenyomat(osszefoglalo),
    osszefoglalo
  });
}

/**
 * Egy lap beolvasása — és az ellenőrzése.
 *
 * ⛔ HÁROM DOLGOT NÉZ MEG, mindhármat kimondva (D19): az ALAKOT (ami nem a mi formánk, az
 * nem lap), a szerkezetet, és hogy a lap a SAJÁT ujjlenyomatát adja-e ki. *Egy átírt lap
 * nem „kicsit más állapot", hanem hazugság — és a kettőt nem szabad összekeverni.*
 */
export async function ujjlenyomatLapBol(szoveg) {
  let lap;
  try {
    lap = JSON.parse(szoveg);
  } catch {
    throw new Error('Ez a fájl nem ujjlenyomat-lap: nem is olvasható JSON.');
  }

  if (lap?.alak !== LAP_ALAK) {
    throw new Error('Ez a fájl nem ujjlenyomat-lap (az alakja: ' + (lap?.alak ?? 'hiányzik') + ').');
  }
  if (!lap.osszefoglalo || typeof lap.osszefoglalo !== 'object') {
    throw new Error('A lapról hiányzik az összefoglaló.');
  }

  const ujra = await lenyomat(lap.osszefoglalo);
  if (ujra !== lap.ujjlenyomat) {
    throw new Error('A lap NEM a saját ujjlenyomatát adja ki — átírták vagy megsérült.'
      + ' (bemondott: ' + lap.ujjlenyomat + ', számított: ' + ujra + ')');
  }
  return lap;
}

/**
 * Ha két állapot eltér, MEGMONDJA, HOL — nem csak azt, hogy eltér.
 *
 * Egy „nem egyezik" önmagában használhatatlan hiba-üzenet: a Szakasz 2 egész értelme az,
 * hogy ha kiderül egy eltérés, meg is találjuk. Ezért szakaszonként hasonlítunk.
 *
 * ⛔⛔ KÉTOLDALÚ — ÉS 2026-09-21-IG NEM VOLT AZ. A bejárás csak az EGYIK összefoglaló
 * kulcsain ment végig, és ennek két külön rossz vége volt:
 *   · ami csak a MÁSIKNÁL van meg, arról **némán hallgatott**;
 *   · ami csak NÁLUNK van meg, ott `kanonikusSzoveg(undefined)`-ot hívott, ami **hibát dob**
 *     („ez a típus nem szerepelhet eseményben: undefined") — tehát összeomlott ahelyett,
 *     hogy megnevezte volna az eltérést.
 *
 * ⭐ MIKOR FORDUL EZ ELŐ: ha a két készülék **más program-változatot** futtat, és az egyik
 * összefoglalójában van egy szakasz, ami a másikéban nincs. *Épp az a helyzet, amire a D66
 * szerint a legnagyobb szükség van egy összevetőre — és pont ott hallgatott vagy omlott
 * össze.* A hiányzó szakasz mostantól **eltérés** (D19: a hiány is tény, nem semmi).
 *
 * @param {Object} egyikOsszefoglalo - allapotOsszefoglaloja eredménye
 * @param {Object} masikOsszefoglalo
 * @returns {Array<string>} az eltérő szakaszok nevei, ábécésorrendben (üres = egyeznek)
 */
export function elteresek(egyikOsszefoglalo, masikOsszefoglalo) {
  const egyik = egyikOsszefoglalo ?? {};
  const masik = masikOsszefoglalo ?? {};

  // ⭐ A KÉT KULCSHALMAZ UNIÓJA, rendezve — hogy a válasz se függjön attól, melyiket
  // adták be elsőnek. *Ugyanaz az elv, mint a rekesz sójánál: a sorrend a szövegből jöjjön,
  // ne a hívótól.*
  const szakaszok = [...new Set([...Object.keys(egyik), ...Object.keys(masik)])].sort();

  const eltero = [];
  for (const szakasz of szakaszok) {
    const vanItt = egyik[szakasz] !== undefined;
    const vanOtt = masik[szakasz] !== undefined;
    if (!vanItt || !vanOtt) { eltero.push(szakasz); continue; }
    if (kanonikusSzoveg(egyik[szakasz]) !== kanonikusSzoveg(masik[szakasz])) {
      eltero.push(szakasz);
    }
  }
  return eltero;
}
