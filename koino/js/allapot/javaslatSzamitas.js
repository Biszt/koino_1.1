// koino/js/allapot/javaslatSzamitas.js

// Felelősség: a javaslatok állapotának KISZÁMÍTÁSA az aláírt eseményekből — és ezzel
// az EGYEZMÉNY megszületése.
//
// ⭐ A LEGFONTOSABB ÁLLÍTÁS: az egyezmény nem esemény, hanem SZÁMÍTÁS EREDMÉNYE.
// Senki nem „hozza létre", senki nem „mondja ki". Az elfogadott javaslatból következik,
// és ugyanabból az eseményhalmazból mindenki ugyanarra jut (D17). Nincs kiváltságos
// szereplő, aki eldönthetné, mi lett a döntés — ez az egész Fázis 2 értelme.
//
// A képletek a prototípusból származnak (javaslatSzamitasService), változatlan
// jelentéssel — a D22 szerint a domain-logika ÖRÖKSÉG, nem újratervezendő.
//
// ⚠️ EGY DOLGOT VÁLTOZTATTUNK: az összehasonlítások EGÉSZ ARITMETIKÁVAL mennek
// (kereszt-szorzással), nem századokra kerekített százalékkal. Így kerekítési kérdés
// SOHA nem dönthet el egy szavazást. A megjelenítéshez számolt arányok kerekítettek —
// azok viszont nem döntenek semmiről.
//
// Használják: fo.js és a felület; a próbaoldal.

import { aktivTulajdonosok } from './allapotSzamitas.js';

// ===================================
// ALAPÉRTELMEZETT KÜSZÖBÖK
// ===================================
//
// Akkor érvényesek, ha egy entitáshoz még senki nem adott érték javaslatot. Ezek a
// D13/c szerint később koino-szintű PARAMÉTEREK lesznek (entitások, amikre tudatpontot
// és érték javaslatot lehet tenni) — most állandók.
export const ALAP_KUSZOBOK = {
  elfogadasiKuszob: 51,        // százalék: a támogatottság ekkora legyen a szavazók közt
  reszveteliKuszob: 0,         // százalék: ekkora részvétel kell (0 = nincs feltétel)
  minimumDontesiIdo: 86400,    // másodperc: 1 nap — a reakció-ablak (D4)
  maximumDontesiIdo: 604800    // másodperc: 7 nap
};

// ===================================
// SEGÉD: SZAVAZATOK BEGYŰJTÉSE
// ===================================

/**
 * Javaslatonként és e-emberenként az UTOLSÓ szavazatot adja vissza.
 * (A szavazat módosítható: az számít, amit a saját láncod utoljára mond.)
 * @param {Array<Object>} esemenyek
 * @returns {Map<string, Map<string, {tipus: string, esemeny: Object}>>} javaslat → (szerző → szavazat)
 */
function szavazatokGyujtese(esemenyek) {
  const javaslatonkent = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'Szavazat') continue;

    const javaslatAzonosito = e.adat.javaslat;
    if (!javaslatonkent.has(javaslatAzonosito)) javaslatonkent.set(javaslatAzonosito, new Map());
    const emberenkent = javaslatonkent.get(javaslatAzonosito);

    const meglevo = emberenkent.get(e.szerzo);
    if (!meglevo || e.sorszam > meglevo.esemeny.sorszam) {
      emberenkent.set(e.szerzo, { tipus: e.adat.szavazat, esemeny: e });
    }
  }

  return javaslatonkent;
}

// ===================================
// A JAVASLATOK KISZÁMÍTÁSA
// ===================================

/**
 * Kiszámolja minden javaslat állapotát — és az elfogadottakból az egyezményt.
 *
 * @param {Array<Object>} esemenyek - a koino ismert eseményei (érvényesek)
 * @param {Object} allapot - az allapotSzamitasa eredménye (entitások, küszöbök)
 * @param {number} most - az „aktuális" idő ezredmásodpercben (BEMENET, nem beépített
 *        óra — így a számítás tiszta függvény marad, és bármely időpontra elvégezhető)
 * @returns {Map<string, Object>} javaslat azonosító → állapot
 */
export function javaslatokSzamitasa(esemenyek, allapot, most = Date.now()) {
  console.log('javaslatokSzamitasa - KEZDÉS', { esemenyDarab: esemenyek.length });

  const szavazatok = szavazatokGyujtese(esemenyek);
  const javaslatok = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'JavaslatLetrehozas') continue;

    const erintettAzonosito = e.adat.erintett;
    const erintett = allapot.entitasok.get(erintettAzonosito);

    // ----- 1. SZAVAZATOK MEGSZÁMOLÁSA -----
    const emberenkent = szavazatok.get(e.azonosito) ?? new Map();
    let tamogatok = 0, ellenzok = 0, tartozkodok = 0;
    for (const { tipus } of emberenkent.values()) {
      if (tipus === 'Tamogat') tamogatok++;
      else if (tipus === 'Ellenez') ellenzok++;
      else if (tipus === 'Tartozkodik') tartozkodok++;
    }
    const szavazok = tamogatok + ellenzok + tartozkodok;

    // ----- 2. A RÉSZVÉTELI ARÁNY NEVEZŐJE: AKTÍV TULAJDONOSOK ∪ SZAVAZÓK -----
    // A passzív figyelők kimaradnak (nem korlátozzák a döntést), de aki szavazott, az
    // résztvevő — ezért az unió. Így a számláló mindig ⊆ a nevező.
    const nevezoHalmaz = aktivTulajdonosok(erintett);
    for (const szerzo of emberenkent.keys()) nevezoHalmaz.add(szerzo);
    const nevezo = nevezoHalmaz.size;

    // ----- 3. KÜSZÖBÖK -----
    const kuszobok = { ...ALAP_KUSZOBOK, ...(erintett?.kuszobok ?? {}) };

    // ----- 4. AZ ELFOGADÁS FELTÉTELE — EGÉSZ ARITMETIKÁVAL -----
    // Ahelyett, hogy százalékot számolnánk és kerekítenénk, kereszt-szorzunk:
    //   tamogatok / szavazok >= kuszob / 100   ⟺   tamogatok * 100 >= kuszob * szavazok
    // Így a döntést SOHA nem befolyásolja kerekítés.
    const tamogatottsagTeljesul = szavazok > 0
      && tamogatok * 100 >= kuszobok.elfogadasiKuszob * szavazok;
    const reszvetelTeljesul = nevezo > 0
      ? szavazok * 100 >= kuszobok.reszveteliKuszob * nevezo
      : false;
    const kuszobTeljesul = tamogatottsagTeljesul && reszvetelTeljesul;

    // ----- 5. ARÁNYOK A MEGJELENÍTÉSHEZ (ezrelékben, kerekítve) -----
    // Ezek NEM döntenek semmiről — csak mutatják az állását.
    const ezrelek = (szamlalo, nevezoErtek) =>
      nevezoErtek > 0 ? Math.round((szamlalo * 1000) / nevezoErtek) : 0;

    const tamogatottsagEzrelek = ezrelek(tamogatok, szavazok);
    const ellenzoiEzrelek = ezrelek(ellenzok, szavazok);
    const tartozkodoiEzrelek = ezrelek(tartozkodok, szavazok);
    const reszveteliEzrelek = ezrelek(szavazok, nevezo);

    // ----- 6. BIZONYOSSÁGI MUTATÓ -----
    // Egyértelműség = a támogatottság és az ellenzés KÜLÖNBSÉGE (0 = döntetlen,
    // 1000 = egyöntetű). A tartózkodás önálló szelet: nem olvad bele egyikbe sem,
    // tehát a passzivitás csökkenti az egyértelműséget.
    const egyertelmusegEzrelek = Math.abs(tamogatottsagEzrelek - ellenzoiEzrelek);
    const bizonyossagiMutato = Math.round((egyertelmusegEzrelek + reszveteliEzrelek) / 2);

    // ----- 7. DÖNTÉSI IDŐ -----
    // Minél egyértelműbb az eredmény és minél magasabb a részvétel, annál hamarabb
    // zárul a döntés — a minimum és a maximum között (D4 bizonyossági mutatója).
    const tartomany = Math.max(0, kuszobok.maximumDontesiIdo - kuszobok.minimumDontesiIdo);
    const dontesiIdo = kuszobok.minimumDontesiIdo
      + Math.floor((tartomany * (1000 - bizonyossagiMutato)) / 1000);

    const lezarasIdeje = e.ido + dontesiIdo * 1000;

    // ----- 8. STÁTUSZ -----
    let statusz;
    if (most < lezarasIdeje) statusz = 'folyamatban';
    else statusz = kuszobTeljesul ? 'elfogadva' : 'elvetve';

    // ----- 9. AZ EGYEZMÉNY -----
    // Nem külön esemény: az elfogadott javaslatból SZÁMÍTÁSSAL keletkezik. A születés
    // körülményei (a szavazás állása) vele maradnak — a D8 „tény ↔ hatály" szerint ez
    // a TÉNY része, és az adat-osztályozás szerint PILLANATKÉP (nem újraszámolható,
    // mert a szavazatok később elfelejtődhetnek alóla).
    const egyezmeny = statusz !== 'elfogadva' ? null : {
      javaslat: e.azonosito,
      erintett: erintettAzonosito,
      muvelet: e.adat.muvelet,
      valtozas: e.adat.valtozas ?? null,
      letrehozo: e.szerzo,
      megszuletett: lezarasIdeje,
      pillanatkep: {
        tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
        tamogatottsagEzrelek, reszveteliEzrelek, bizonyossagiMutato
      }
    };

    javaslatok.set(e.azonosito, {
      azonosito: e.azonosito,
      erintett: erintettAzonosito,
      muvelet: e.adat.muvelet,
      valtozas: e.adat.valtozas ?? null,
      indoklas: e.adat.indoklas ?? null,
      letrehozo: e.szerzo,
      letrehozva: e.ido,

      tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
      tamogatottsagEzrelek, ellenzoiEzrelek, tartozkodoiEzrelek, reszveteliEzrelek,
      bizonyossagiMutato,

      kuszobok,
      tamogatottsagTeljesul,
      reszvetelTeljesul,
      kuszobTeljesul,

      dontesiIdo,
      lezarasIdeje,
      statusz,
      egyezmeny
    });
  }

  console.log('javaslatokSzamitasa - VÉGE', { javaslat: javaslatok.size });
  return javaslatok;
}

// ===================================
// SEGÉD: EGY E-EMBER SZAVAZATA
// ===================================

/**
 * Megmondja, hogyan szavazott egy e-ember egy javaslatra (a felülethez).
 * @param {Array<Object>} esemenyek
 * @param {string} javaslatAzonosito
 * @param {string} szerzo
 * @returns {string|null} 'Tamogat' | 'Ellenez' | 'Tartozkodik' | null
 */
export function sajatSzavazat(esemenyek, javaslatAzonosito, szerzo) {
  const javaslatonkent = szavazatokGyujtese(esemenyek);
  return javaslatonkent.get(javaslatAzonosito)?.get(szerzo)?.tipus ?? null;
}
