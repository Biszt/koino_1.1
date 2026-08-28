// koino/js/allapot/javaslatSzamitas.js

// Felelősség: a javaslatok állapotának KISZÁMÍTÁSA az aláírt eseményekből — és ezzel
// az EGYEZMÉNY megszületése.
//
// ===== KÉT FAJTA JAVASLAT, EGY GÉPEZET (D27) =====
//
//   SZERKESZTÉSI javaslat → egy entitás megváltoztatása (módosítás, áthelyezés,
//     törlés, egyesítés). Elfogadáskor a koino VÉGREHAJTJA.
//   ÁLTALÁNOS javaslat → a közösség álláspontja („fogadjuk el ezt az elvet"). Elfogadáskor
//     NEM történik semmi automatikusan: az egyezmény MAGA az álláspont, a teljesítése
//     emberi (D8). Az ilyen egyezmény ÉLŐ: később csatlakozni, tiltakozni, ütközést
//     jelölni lehet hozzá.
//
// A SZAVAZÁS GÉPEZETE MINDKETTŐNÉL UGYANAZ — küszöbök, medián, részvételi arány,
// bizonyossági mutató, döntési idő —, ezért egy `Javaslat` esemény van, `fajta` mezővel.
// Csak a KÖVETKEZMÉNYE más. (Ezért nem két párhuzamos változatot tartunk karban.)
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
// Használják: koino.js (a parancssori arc) és az önpróbák.

import { median } from './allapotSzamitas.js';

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

// A küszöbök nevei — ezekre számolunk mediánt az érték javaslatokból (D4)
const KUSZOB_NEVEK = Object.keys(ALAP_KUSZOBOK);

// ===================================
// SEGÉD: SZAVAZATOK BEGYŰJTÉSE
// ===================================

/**
 * Javaslatonként ÖSSZEGYŰJTI a szavazat-eseményeket (szűrés és összevonás nélkül).
 *
 * Miért nem vonjuk itt össze e-emberenként? Mert a lezárás IDŐRENDBEN történik (lásd
 * lentebb), és ott lépésenként kell tudni, ki mit szavazott ADDIG a pillanatig. Egy
 * előre összevont „utolsó szavazat" épp azt az információt dobná el.
 *
 * @param {Array<Object>} esemenyek
 * @returns {Map<string, Array<Object>>} javaslat azonosító → szavazat-események
 */
function szavazatokGyujtese(esemenyek) {
  const javaslatonkent = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'Szavazat') continue;

    const javaslatAzonosito = e.adat.javaslat;
    if (!javaslatonkent.has(javaslatAzonosito)) javaslatonkent.set(javaslatAzonosito, []);
    javaslatonkent.get(javaslatAzonosito).push(e);
  }

  return javaslatonkent;
}

/**
 * Entitásonként összegyűjti az ÉRTÉK JAVASLATOKAT (a küszöbökre tett javaslatokat).
 *
 * MIÉRT KELL EZ A DÖNTÉSHEZ? Mert az érvényes küszöb a tulajdonosok érték javaslatainak
 * mediánja (D4) — és a küszöbök közt ott van a MINIMUM és MAXIMUM DÖNTÉSI IDŐ is.
 * Vagyis egy érték javaslat közvetlenül átírja a határidőt. Ha nem kötnénk időhöz, egy
 * utólagos érték javaslat visszamenőleg megváltoztatná egy már lezárt döntés szabályát.
 * *(Csaba vette észre, 2026-08-28.)*
 *
 * @param {Array<Object>} esemenyek
 * @returns {Map<string, Array<Object>>} entitás azonosító → érték javaslat események
 */
function ertekJavaslatokGyujtese(esemenyek) {
  const entitasonkent = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'ErtekJavaslat') continue;

    const entitas = e.adat.entitas;
    if (!entitasonkent.has(entitas)) entitasonkent.set(entitas, []);
    entitasonkent.get(entitas).push(e);
  }

  return entitasonkent;
}

/**
 * Entitásonként összegyűjti a TUDATPONT-RENDEZÉSEKET.
 *
 * MIÉRT KELL EZ A DÖNTÉSHEZ? Mert a részvételi arány NEVEZŐJE az aktív tulajdonosokból
 * jön — vagyis a tudatpont-rendezés ugyanúgy befolyásolja a bizonyossági mutatót és
 * ezen keresztül a határidőt, mint egy szavazat. Ha csak a szavazatokat kötnénk időhöz,
 * a lezárt döntés egy utólagos tudatpont-rendezéstől újranyílna. (Mérve, 2026-08-28:
 * pontosan ez történt — az önpróba buktatta le.)
 *
 * @param {Array<Object>} esemenyek
 * @returns {Map<string, Array<Object>>} entitás azonosító → tudatpont-események
 */
function tudatpontokGyujtese(esemenyek) {
  const entitasonkent = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'TudatpontRendezes') continue;

    const entitas = e.adat.entitas;
    if (!entitasonkent.has(entitas)) entitasonkent.set(entitas, []);
    entitasonkent.get(entitas).push(e);
  }

  return entitasonkent;
}

/**
 * Események IDŐRENDBE rendezése.
 *
 * ⚠️ Az azonos idő HOLTVERSENY-DÖNTŐJE az azonosító. Enélkül a sorrend a tömb
 * sorrendjétől függne — és a lezárás ugyanúgy gépenként mást adna, mint amit az
 * elágazásnál már egyszer megjavítottunk.
 *
 * @param {Array<Object>} szavazatok
 * @returns {Array<Object>}
 */
function idorendbe(szavazatok) {
  return [...szavazatok].sort((a, b) =>
    a.ido !== b.ido ? a.ido - b.ido : (a.azonosito < b.azonosito ? -1 : 1)
  );
}

// ===================================
// EGY JAVASLAT ÁLLÁSA — adott szavazat-halmazból
// ===================================

/**
 * Kiszámolja a javaslat állását EGY szavazat-halmazból: a számokat, a küszöbök
 * teljesülését, a bizonyossági mutatót, a döntési időt és a határidőt.
 *
 * Tiszta függvény, és SZÁNDÉKOSAN nem tud a „mostról": ugyanezt használja a lezárás
 * lépésenkénti számítása és a végeredmény is. Egy forrás — így a kettő nem csúszhat el.
 *
 * @param {Object} javaslatEsemeny
 * @param {Map<string, string>} emberenkent - szerző → 'Tamogat' | 'Ellenez' | 'Tartozkodik'
 * @param {Set<string>} aktivHalmaz - az érintett entitás aktív tulajdonosai
 * @param {Object} kuszobok
 * @returns {Object}
 */
function allasSzamitasa(javaslatEsemeny, emberenkent, aktivHalmaz, kuszobok) {
  // ----- 1. SZAVAZATOK MEGSZÁMOLÁSA -----
  let tamogatok = 0, ellenzok = 0, tartozkodok = 0;
  for (const tipus of emberenkent.values()) {
    if (tipus === 'Tamogat') tamogatok++;
    else if (tipus === 'Ellenez') ellenzok++;
    else if (tipus === 'Tartozkodik') tartozkodok++;
  }
  const szavazok = tamogatok + ellenzok + tartozkodok;

  // ----- 2. A RÉSZVÉTELI ARÁNY NEVEZŐJE: AKTÍV TULAJDONOSOK ∪ SZAVAZÓK -----
  // A passzív figyelők kimaradnak (nem korlátozzák a döntést), de aki szavazott, az
  // résztvevő — ezért az unió. Így a számláló mindig ⊆ a nevező.
  const nevezoHalmaz = new Set(aktivHalmaz);
  for (const szerzo of emberenkent.keys()) nevezoHalmaz.add(szerzo);
  const nevezo = nevezoHalmaz.size;

  // ----- 3. AZ ELFOGADÁS FELTÉTELE — EGÉSZ ARITMETIKÁVAL -----
  // Ahelyett, hogy százalékot számolnánk és kerekítenénk, kereszt-szorzunk:
  //   tamogatok / szavazok >= kuszob / 100   ⟺   tamogatok * 100 >= kuszob * szavazok
  // Így a döntést SOHA nem befolyásolja kerekítés.
  const tamogatottsagTeljesul = szavazok > 0
    && tamogatok * 100 >= kuszobok.elfogadasiKuszob * szavazok;
  const reszvetelTeljesul = nevezo > 0
    ? szavazok * 100 >= kuszobok.reszveteliKuszob * nevezo
    : false;
  const kuszobTeljesul = tamogatottsagTeljesul && reszvetelTeljesul;

  // ----- 4. ARÁNYOK A MEGJELENÍTÉSHEZ (ezrelékben, kerekítve) -----
  // Ezek NEM döntenek semmiről — csak mutatják az állását.
  const ezrelek = (szamlalo, nevezoErtek) =>
    nevezoErtek > 0 ? Math.round((szamlalo * 1000) / nevezoErtek) : 0;

  const tamogatottsagEzrelek = ezrelek(tamogatok, szavazok);
  const ellenzoiEzrelek = ezrelek(ellenzok, szavazok);
  const tartozkodoiEzrelek = ezrelek(tartozkodok, szavazok);
  const reszveteliEzrelek = ezrelek(szavazok, nevezo);

  // ----- 5. BIZONYOSSÁGI MUTATÓ -----
  // Egyértelműség = a támogatottság és az ellenzés KÜLÖNBSÉGE (0 = döntetlen,
  // 1000 = egyöntetű). A tartózkodás önálló szelet: nem olvad bele egyikbe sem,
  // tehát a passzivitás csökkenti az egyértelműséget.
  const egyertelmusegEzrelek = Math.abs(tamogatottsagEzrelek - ellenzoiEzrelek);
  const bizonyossagiMutato = Math.round((egyertelmusegEzrelek + reszveteliEzrelek) / 2);

  // ----- 6. DÖNTÉSI IDŐ -----
  // Minél egyértelműbb az eredmény és minél magasabb a részvétel, annál hamarabb
  // zárul a döntés — a minimum és a maximum között (D4 bizonyossági mutatója).
  const tartomany = Math.max(0, kuszobok.maximumDontesiIdo - kuszobok.minimumDontesiIdo);
  const dontesiIdo = kuszobok.minimumDontesiIdo
    + Math.floor((tartomany * (1000 - bizonyossagiMutato)) / 1000);

  const lezarasIdeje = javaslatEsemeny.ido + dontesiIdo * 1000;

  return {
    tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
    tamogatottsagEzrelek, ellenzoiEzrelek, tartozkodoiEzrelek, reszveteliEzrelek,
    bizonyossagiMutato,
    tamogatottsagTeljesul, reszvetelTeljesul, kuszobTeljesul,
    dontesiIdo, lezarasIdeje
  };
}

// ===================================
// ⭐ A LEZÁRÁS — IDŐRENDBEN (Csaba jóváhagyása, 2026-08-28)
// ===================================
//
// A PROBLÉMA, AMIT MEGOLD. A döntési idő a bizonyossági mutatóból számítódik, a
// bizonyosság a szavazatokból — a szavazatok viszont a határidő UTÁN is megérkezhetnek.
// Emiatt a határidő visszamenőleg mozgott: mérve (2026-08-28) egy elvetett javaslat egy
// utólagos szavazattól ELFOGADVA lett, majd egy továbbitól újra elvetve. Az egyezmény
// megszületett, majd megszűnt létezni.
//
// A SZABÁLY. A szavazatokat idő szerint (azonos időnél azonosító szerint) sorba
// rendezzük, és lépésenként újraszámoljuk a határidőt az addigi állásból. Az első
// szavazat, aminek az ideje TÚL VAN az akkor érvényes határidőn, már nem számít bele —
// és a lezárás ideje az a határidő. Így a határidő utáni szavazat nem mozdíthatja a
// határidőt, és a lezárt döntés nem fordul vissza.
//
// ⚠️ MIT NEM OLD MEG. Az `ido` a szerző órája, tehát hazudható: valaki visszadátumozhat
// egy szavazatot, hogy még beleférjen. Ez ellen a saját lánc idő-monotonitása véd
// (allapotSzamitas.js) — de csak részben: friss kulccsal vagy hosszú inaktivitás után
// szabadon visszadátumozható. A teljes válasz a kötegelés (D21, Szakasz 4). Addig ez
// drágítja a csalást, nem zárja — és ezt így is mondjuk ki.
//
// ⚠️ ÉS AMI NEM HIBA. Egy késve MEGÉRKEZŐ, de a határidőn belüli időbélyegű szavazat
// jogosan módosítja az eredményt. A követelmény nem az, hogy az eredmény soha ne
// változzon, hanem hogy UGYANABBÓL AZ ESEMÉNYHALMAZBÓL mindenki ugyanazt kapja (D17).

/**
 * Végigmegy a javaslatot érintő eseményeken IDŐRENDBEN a lezárásig, és visszaadja a
 * végállást.
 *
 * HÁROM ESEMÉNY-FAJTA SZÁMÍT, és mind ugyanazon a szabályon megy át:
 *   - a SZAVAZAT (a részvétel számlálója),
 *   - a TUDATPONT-RENDEZÉS az érintett entitáson (a nevezője: ki aktív tulajdonos —
 *     és ide tartozik az aktív ↔ passzív váltás is, mert azt is ez az esemény hordozza),
 *   - az ÉRTÉK JAVASLAT az érintett entitáson (a küszöbök, köztük a MIN/MAX DÖNTÉSI IDŐ).
 * Mindhárom mozdítja a határidőt, ezért a lezárás után érkezőt mindháromnál figyelmen
 * kívül kell hagyni — különben a döntés újranyílik.
 *
 * @param {Object} javaslatEsemeny
 * @param {Array<Object>} szavazatok - a javaslat szavazat-eseményei (szűretlenül)
 * @param {Array<Object>} tudatpontok - az érintett entitás tudatpont-eseményei
 * @param {Array<Object>} ertekJavaslatEsemenyek - az érintett entitás érték javaslatai
 * @returns {{allas: Object, kuszobok: Object, kesoiSzavazatok: number}}
 */
function lezarasigSzamitas(javaslatEsemeny, szavazatok, tudatpontok, ertekJavaslatEsemenyek) {
  const sor = idorendbe([...szavazatok, ...tudatpontok, ...ertekJavaslatEsemenyek]);

  const emberenkent = new Map();      // szerző → a szavazata (a lezárás pillanatáig)
  const szavazatSorszam = new Map();  // szerző → az eddig figyelembe vett szavazat-sorszám
  const tulajdonosok = new Map();     // szerző → { pont, szerep, sorszam }
  const ertekJavaslatok = new Map();  // szerző → { ertekek, sorszam }

  /** Az AKTÍV tulajdonosok az eddig feldolgozott tudatpont-eseményekből. */
  const aktivHalmaz = () => {
    const halmaz = new Set();
    for (const [szerzo, adat] of tulajdonosok) {
      // Ugyanaz a szabály, mint az állapot-rétegben: 0 pont = nincs ott, a passzív
      // figyelő pedig nem korlátozza a döntést.
      if (adat.pont > 0 && adat.szerep === 'aktiv') halmaz.add(szerzo);
    }
    return halmaz;
  };

  /**
   * Az érvényes küszöbök: a TULAJDONOSOK érték javaslatainak mediánja (D4).
   *
   * Az érték javaslatokat akkor is megjegyezzük, ha a szerzőjüknek épp nincs pontja —
   * csak a SZÁMOLÁSKOR szűrünk. Így mindegy, hogy egy azonos időpontú tudatpont és
   * érték javaslat közül melyik kerül előre a sorban.
   */
  const kuszobokMost = () => {
    const ervenyesek = [];
    for (const [szerzo, bejegyzes] of ertekJavaslatok) {
      const tulajdonos = tulajdonosok.get(szerzo);
      if (tulajdonos && tulajdonos.pont > 0) ervenyesek.push(bejegyzes.ertekek);
    }

    const eredmeny = { ...ALAP_KUSZOBOK };
    for (const nev of KUSZOB_NEVEK) {
      const szamok = ervenyesek
        .map((ertekek) => ertekek?.[nev])
        .filter((szam) => typeof szam === 'number');
      // Hiányzó mezőnél marad az alapérték — a `null` nem írhatja felül (különben a
      // kereszt-szorzás NaN-t adna, és a döntés némán elromlana).
      if (szamok.length) eredmeny[nev] = median(szamok);
    }
    return eredmeny;
  };

  let kuszobok = kuszobokMost();
  let allas = allasSzamitasa(javaslatEsemeny, emberenkent, aktivHalmaz(), kuszobok);
  let index = 0;
  let kesoiSzavazatok = 0;

  for (; index < sor.length; index++) {
    const esemeny = sor[index];

    // A HATÁRIDŐ UTÁN érkezett esemény nem számít — és mivel időrendben megyünk,
    // innentől MINDEGYIK késői. Itt zárul a döntés.
    if (esemeny.ido > allas.lezarasIdeje) break;

    // A saját láncban az utolsó számít: egy kisebb sorszámú esemény nem írhatja felül
    // a nagyobbat (a meggondolás joga előre él, nem visszafelé).
    if (esemeny.tipus === 'Szavazat') {
      const eddigi = szavazatSorszam.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi) continue;
      szavazatSorszam.set(esemeny.szerzo, esemeny.sorszam);
      emberenkent.set(esemeny.szerzo, esemeny.adat.szavazat);

    } else if (esemeny.tipus === 'TudatpontRendezes') {
      const eddigi = tulajdonosok.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi.sorszam) continue;
      tulajdonosok.set(esemeny.szerzo, {
        pont: esemeny.adat.pont,
        szerep: esemeny.adat.szerep === 'passziv' ? 'passziv' : 'aktiv',
        sorszam: esemeny.sorszam
      });

    } else {
      const eddigi = ertekJavaslatok.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi.sorszam) continue;
      ertekJavaslatok.set(esemeny.szerzo, {
        ertekek: esemeny.adat.ertekek,
        sorszam: esemeny.sorszam
      });
    }

    kuszobok = kuszobokMost();
    allas = allasSzamitasa(javaslatEsemeny, emberenkent, aktivHalmaz(), kuszobok);
  }

  // Hány SZAVAZAT maradt a lezáráson kívül (a késői tudatpont-rendezés nem „szavazat")
  for (let i = index; i < sor.length; i++) {
    if (sor[i].tipus === 'Szavazat') kesoiSzavazatok++;
  }

  return { allas, kuszobok, kesoiSzavazatok };
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
  const tudatpontok = tudatpontokGyujtese(esemenyek);
  const ertekJavaslatok = ertekJavaslatokGyujtese(esemenyek);
  const javaslatok = new Map();

  for (const e of esemenyek) {
    if (e.tipus !== 'Javaslat') continue;

    // A fajta dönti el, mi történik ELFOGADÁSKOR (D27). Ha hiányzik, szerkesztésinek
    // vesszük — ez a mai koino összes javaslata.
    const fajta = e.adat.fajta === 'altalanos' ? 'altalanos' : 'szerkesztesi';
    const erintettAzonosito = e.adat.erintett;
    const erintett = allapot.entitasok.get(erintettAzonosito);

    // ----- 1. ⭐ A LEZÁRÁSIG SZÁMOLT ÁLLÁS -----
    // Az események időrendben mennek, és a határidő utániak kimaradnak (lásd fentebb).
    // A KÜSZÖBÖK is innen jönnek: azok érvényesek, amik a LEZÁRÁS PILLANATÁIG
    // kialakultak — nem az entitás mai mediánja (az az `erintett.kuszobok`, a
    // felületnek). Különben egy utólagos érték javaslat átírná a lezárt döntés
    // szabályát, akár visszamenőleg a döntési idejét is.
    const { allas, kuszobok, kesoiSzavazatok } = lezarasigSzamitas(
      e,
      szavazatok.get(e.azonosito) ?? [],
      tudatpontok.get(erintettAzonosito) ?? [],
      ertekJavaslatok.get(erintettAzonosito) ?? []
    );
    const {
      tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
      tamogatottsagEzrelek, ellenzoiEzrelek, tartozkodoiEzrelek, reszveteliEzrelek,
      bizonyossagiMutato, tamogatottsagTeljesul, reszvetelTeljesul, kuszobTeljesul,
      dontesiIdo, lezarasIdeje
    } = allas;

    // ----- 2. STÁTUSZ -----
    let statusz;
    if (most < lezarasIdeje) statusz = 'folyamatban';
    else statusz = kuszobTeljesul ? 'elfogadva' : 'elvetve';

    // ----- 3. AZ EGYEZMÉNY -----
    // Nem külön esemény: az elfogadott javaslatból SZÁMÍTÁSSAL keletkezik. A születés
    // körülményei (a szavazás állása) vele maradnak — a D8 „tény ↔ hatály" szerint ez
    // a TÉNY része, és az adat-osztályozás szerint PILLANATKÉP (nem újraszámolható,
    // mert a szavazatok később elfelejtődhetnek alóla).
    const egyezmeny = statusz !== 'elfogadva' ? null : {
      javaslat: e.azonosito,
      fajta,                                   // szerkesztési vagy általános (D27)
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
      fajta,                                   // 'szerkesztesi' | 'altalanos' (D27)
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
      // Hány szavazat érkezett a lezárás UTÁN (nem számít bele). Nem büntetés és nem
      // vád: a koino bejelent, nem bíráskodik (D19) — a felület megmutathatja.
      kesoiSzavazatok,
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
 *
 * A SAJÁT LÁNCÁBAN AZ UTOLSÓT adja vissza — akkor is, ha az már a lezárás után
 * született. Ez szándékos: azt mutatjuk meg, amit az illető LEADOTT. Hogy a szavazat
 * bele SZÁMÍT-e, azt a javaslat állása mondja meg (`kesoiSzavazatok`).
 *
 * @param {Array<Object>} esemenyek
 * @param {string} javaslatAzonosito
 * @param {string} szerzo
 * @returns {string|null} 'Tamogat' | 'Ellenez' | 'Tartozkodik' | null
 */
export function sajatSzavazat(esemenyek, javaslatAzonosito, szerzo) {
  const sajatok = (szavazatokGyujtese(esemenyek).get(javaslatAzonosito) ?? [])
    .filter((e) => e.szerzo === szerzo);
  if (!sajatok.length) return null;

  const utolso = sajatok.reduce((eddigi, e) => (e.sorszam > eddigi.sorszam ? e : eddigi));
  return utolso.adat.szavazat;
}
