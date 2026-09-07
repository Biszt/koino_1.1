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
import { erintettek } from './szabalyok.js';

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
  return [...szavazatok].sort((a, b) => {
    if (a.ido !== b.ido) return a.ido - b.ido;
    // ⭐⭐ AZONOS IDŐ → SZERZŐ, majd A SAJÁT LÁNC SORRENDJE (2026-09-07).
    //
    // ⚠️ Ez nem szépészet, hanem KÉT hiba javítása, amit ugyanaz a próba buktatott le:
    //
    // 1. Aki egyszerre teszi rá a tudatpontját ÉS szavaz (ugyanaz az ezredmásodperc — a
    //    felületen ez a normális eset), annál a puszta azonosító-döntő **fordítva is
    //    sorolhatta**: előbb a szavazat, aztán a pont. Mivel a szavazat jogosultsága a
    //    LEADÁS pillanatában dől el, a szavazata némán kiesett volna. A saját láncban
    //    viszont VAN sorrend, és azt csak a szerző írhatja: a `sorszam`.
    //
    // 2. ⛔⛔ ÉS A CSAPDA, AMI EBBŐL LETT: ha csak AZONOS SZERZŐNÉL néznénk a sorszámot,
    //    egyébként az azonosítót, a rendezés **nem lenne tranzitív** — X < Y (sorszám),
    //    Y < Z és Z < X (azonosító) egyszerre igaz lehet. Egy ilyen körnél a `sort`
    //    eredménye tetszőleges, vagyis **két gép más sorrendet kapna ugyanabból a
    //    halmazból**. Mérve: ugyanaz a próba hol átment, hol elbukott, a kulcsoktól
    //    függően. ⭐ Ezért a szerző az ELSŐ döntő: így minden szerző eseményei egyben
    //    maradnak, a láncsorrend érvényesül, és a reláció totális.
    if (a.szerzo !== b.szerzo) return a.szerzo < b.szerzo ? -1 : 1;
    if (a.sorszam !== b.sorszam) return a.sorszam - b.sorszam;
    return a.azonosito < b.azonosito ? -1 : 1;
  });
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
  //
  // ⭐ Ide MÁR CSAK JOGOSULT szavazat érkezik: a hívó (`reszekSzamitasa`) a LEADÁS
  // pillanatában dönti el, beleszámít-e — pontosan úgy, ahogy a prototípus a
  // `szavazatService`-ben a leadáskor ellenőriz, és a tárolt szavazatot később már nem
  // kérdőjelezi meg. ⛔ Ez fontos: ha a lezáráskori állapot döntene, akkor a tudatpontom
  // elvételével **visszavonhatnám a szavazatomat** — pedig a szabály az, hogy
  // *„megváltoztatható, de nem vonható vissza"*.
  let tamogatok = 0, ellenzok = 0, tartozkodok = 0;
  for (const tipus of emberenkent.values()) {
    if (tipus === 'Tamogat') tamogatok++;
    else if (tipus === 'Ellenez') ellenzok++;
    else if (tipus === 'Tartozkodik') tartozkodok++;
  }
  const szavazok = tamogatok + ellenzok + tartozkodok;

  // ----- 2. A RÉSZVÉTELI ARÁNY NEVEZŐJE: AKTÍV TULAJDONOSOK ∪ SZAVAZÓK -----
  // A passzív figyelők kimaradnak (nem korlátozzák a döntést), de aki szavazott, az
  // résztvevő — ezért az unió; így a számláló mindig ⊆ a nevező. ⭐ A prototípus ezt
  // kétszeresen biztosítja: a szavazás maga **aktívvá billenti** a szavazót minden
  // érintett entitáson (`szerepAktivalasa`: *„minden döntés-alakító tett"*), az unió
  // pedig azt is elkapja, aki a szavazása UTÁN vált passzívra. A halmazt a hívó adja.
  const nevezo = aktivHalmaz.size;

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

// ===================================
// ⭐⭐⭐ A TÖREDÉK-MODELL: ÉRINTETTENKÉNT KÜLÖN ÁLLÁS (2026-09-07)
// ===================================
//
// ⛔⛔ EZ A PROTOTÍPUS LEGFONTOSABB LOGIKAI KAPCSOLATA, amit elsőre elrontottam.
//
// Egy több entitást érintő javaslat a prototípusban **nem egy szavazás**. A
// `javaslatService.js` minden érintetthez KÜLÖN TÖREDÉK-JAVASLATOT hoz létre, és onnantól:
//
//   - a töredék típusa **az adott entitás művelete**, a szülője **az adott entitás**;
//   - **szavazni töredékenként lehet**, és a jogosultság ott már csak arra az EGY
//     entitásra kérdez rá (`szavazatService.js`: végigmegy a csoport töredékein, a
//     jogosultakra leadja, a többit **átugorja** — hibát csak akkor dob, ha egyikre sem);
//   - a **küszöb és a részvételi arány is töredékenként** számítódik, az adott entitás
//     saját tulajdonosaival és saját érték javaslataival;
//   - a **lezárás ideje közös**: a leghosszabb döntési idő (`kozosDontesiIdo` = MAX);
//   - és a csoport **akkor és csak akkor elfogadott, ha MINDEN töredék teljesíti a SAJÁT
//     küszöbeit** (`javaslatIdozitesService.js`).
//
// ⭐ A METSZET tehát CSAK A JAVASLAT BEADÁSÁRA vonatkozik (`szabalyok.js`) — a döntés
// entitásonként külön dől el, és **ÉS**-sel áll össze. *Aki a gondolatot tartja, az dönt a
// sorsáról — akkor is, ha a javaslat egy másik gondolatot is érint.*
//
// ⚠️ AMIT ÁT KELLETT ALAKÍTANI: a koinóban NINCS N darab tárolt töredék, mert egy aláírt
// `Javaslat` esemény van. A töredék a Mongo tárolási kényszere volt; a **logikai kapcsolat**
// viszont átjön: N tárolt rekord helyett N SZÁMÍTOTT RÉSZ. Ugyanaz a minta, mint a D17-nél
// — ami ott adatbázis-sor, az itt számítás. És a szavazat is egy esemény: a prototípus
// „minden jogosult töredékre leadja" lépése itt annyi, hogy a szavazat **abban a részben**
// számít, ahol a szavazónak van pontja.

/**
 * Végigmegy a javaslatot érintő eseményeken IDŐRENDBEN a közös lezárásig, és
 * érintettenként külön állást ad vissza.
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
 * @param {Array<{entitas: string, muvelet: string, valtozas: Object|null}>} kik - az érintettek
 * @param {Array<Object>} szavazatok - a javaslat szavazat-eseményei (szűretlenül)
 * @param {Array<Object>} tudatpontok - az érintett entitások tudatpont-eseményei
 * @param {Array<Object>} ertekJavaslatEsemenyek - az érintett entitások érték javaslatai
 * @returns {{reszek: Array<Object>, lezarasIdeje: number, dontesiIdo: number,
 *            kuszobTeljesul: boolean, kesoiSzavazatok: number}}
 */
function reszekSzamitasa(javaslatEsemeny, kik, szavazatok, tudatpontok, ertekJavaslatEsemenyek) {
  const entitasok = kik.map((r) => r.entitas);
  const sor = idorendbe([...szavazatok, ...tudatpontok, ...ertekJavaslatEsemenyek]);

  // ----- ENTITÁSONKÉNT KÜLÖN KÖNYVELÉS -----
  // ⭐ Külön térkép entitásonként (nem összetett kulcs): így a „ki tulajdonos ITT?"
  // kérdés egy lépés, és a rész-állások egymástól függetlenül olvashatók.
  const uresen = () => new Map(entitasok.map((az) => [az, new Map()]));
  const tulajdonosok = uresen();      // entitás → (szerző → { pont, szerep, sorszam })
  const ertekJavaslatok = uresen();   // entitás → (szerző → { ertekek, sorszam })
  const reszSzavazatok = uresen();    // entitás → (szerző → 'Tamogat' | …)
  const kulonAgot = uresen();         // entitás → (szerző → kért-e külön ágat)
  const szavazatSorszam = new Map();  // szerző → az eddig figyelembe vett szavazat-sorszám

  /**
   * ⭐ A NEVEZŐ EGY RÉSZBEN: az entitás aktív tulajdonosai ∪ az itt számító szavazók.
   * A passzív figyelő kimarad (nem korlátozza a döntést), de a szavazás **aktívvá tesz**
   * — a prototípusban ez tényleges szerep-billentés (`szerepAktivalasa`), itt az unió.
   */
  const aktivHalmazItt = (entitas) => {
    const halmaz = new Set();
    for (const [szerzo, adat] of tulajdonosok.get(entitas)) {
      if (adat.pont > 0 && adat.szerep === 'aktiv') halmaz.add(szerzo);
    }
    for (const szerzo of reszSzavazatok.get(entitas).keys()) halmaz.add(szerzo);
    return halmaz;
  };

  /**
   * Az érvényes küszöbök EGY RÉSZBEN: az entitás TULAJDONOSAINAK érték javaslat-mediánja
   * (D4) — pontosan az, amit a prototípus az adott entitás hisztogramjából olvas ki.
   *
   * Az érték javaslatokat akkor is megjegyezzük, ha a szerzőjüknek épp nincs pontja —
   * csak a SZÁMOLÁSKOR szűrünk. Így mindegy, hogy egy azonos időpontú tudatpont és
   * érték javaslat közül melyik kerül előre a sorban. ⭐ A szerep itt nem számít: a
   * passzív figyelőnek is van véleménye a küszöbről.
   */
  const kuszobokItt = (entitas) => {
    const ervenyesek = [];
    for (const [szerzo, bejegyzes] of ertekJavaslatok.get(entitas)) {
      if ((tulajdonosok.get(entitas).get(szerzo)?.pont ?? 0) > 0) ervenyesek.push(bejegyzes.ertekek);
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

  /** A pillanatnyi rész-állások — entitásonként egy. */
  const allasokMost = () => kik.map((r) => {
    const kuszobok = kuszobokItt(r.entitas);
    return {
      entitas: r.entitas,
      muvelet: r.muvelet,
      valtozas: r.valtozas ?? null,
      kuszobok,
      // ⭐⭐ A KÜLÖNVÁLÓK — akik ELLENEZTÉK és kértek külön ágat.
      //
      // ⛔ A TARTÓZKODÓ SOHA — akkor sem, ha az esemény azt mondja. A `muveletek.js` már
      // hamisra állítja, de egy kézzel írt esemény hazudhat: *amit a számítás nem
      // ellenőriz, az nem szabály, csak illemtan.*
      //
      // ⚠️ A prototípus szimmetriája: elfogadott javaslatnál az ELLENZŐK viszik a RÉGI
      // állapotot; elvetettnél a TÁMOGATÓK a módosítottat. ⏸️ Ma az elsőt építjük.
      //
      // ⭐ SORBA RENDEZETT lista (nem `Map`), mert ez az egyezménybe kerül: minden gépen
      // ugyanúgy kell kinéznie, és sorosíthatónak kell lennie.
      kulonvalok: [...reszSzavazatok.get(r.entitas)]
        .filter(([szerzo, sz]) => sz === 'Ellenez' && kulonAgot.get(r.entitas).get(szerzo))
        .map(([szerzo]) => szerzo)
        .sort(),
      allas: allasSzamitasa(javaslatEsemeny, reszSzavazatok.get(r.entitas),
        aktivHalmazItt(r.entitas), kuszobok)
    };
  });

  // ⭐⭐ A KÖZÖS LEZÁRÁS: a LEGHOSSZABB rész-döntési idő (a prototípus `kozosDontesiIdo`
  // MAX-a). Amíg a leglassabb rész nyitva van, addig a többire is lehet szavazni — a
  // csoport egyben dől el.
  const kozosLezaras = (reszek) => Math.max(...reszek.map((r) => r.allas.lezarasIdeje));

  let reszek = allasokMost();
  let lezarasIdeje = kozosLezaras(reszek);
  let index = 0;
  let kesoiSzavazatok = 0;

  for (; index < sor.length; index++) {
    const esemeny = sor[index];

    // A HATÁRIDŐ UTÁN érkezett esemény nem számít — és mivel időrendben megyünk,
    // innentől MINDEGYIK késői. Itt zárul a döntés.
    if (esemeny.ido > lezarasIdeje) break;

    // A saját láncban az utolsó számít: egy kisebb sorszámú esemény nem írhatja felül
    // a nagyobbat (a meggondolás joga előre él, nem visszafelé).
    if (esemeny.tipus === 'Szavazat') {
      const eddigi = szavazatSorszam.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi) continue;
      szavazatSorszam.set(esemeny.szerzo, esemeny.sorszam);

      // ⭐⭐ EGY SZAVAZÁS → MINDEN JOGOSULT RÉSZRE, a többi ÁTUGORVA. Szó szerint a
      // prototípus `szavazatService`-e: „jogosultToredekek" / „atugrottToredekek".
      // ⛔ A jogosultság a LEADÁS pillanatában dől el, és utólag nem íródik felül —
      // különben a tudatpontom elvétele a szavazatom visszavonása lenne.
      // ⚠️ A szerep itt NEM számít: a prototípus jogosultság-ellenőrzése csak pontot néz
      // (`eemberHozzajarulasaEntitason`), a passzív figyelő szavazhat — sőt a szavazással
      // épp aktívvá válik.
      for (const entitas of entitasok) {
        if ((tulajdonosok.get(entitas).get(esemeny.szerzo)?.pont ?? 0) <= 0) continue;
        reszSzavazatok.get(entitas).set(esemeny.szerzo, esemeny.adat.szavazat);
        // ⭐⭐ A KÜLÖNVÁLÁSI IGÉNY IS ELTEVŐDIK (2026-09-08) — a különválás ebből tudja
        // meg, ki lép külön ágra, ha a döntés ellene megy. ⛔ Tartózkodásnál a művelet
        // már hamisra állította (`muveletek.js`), de a SZÁMÍTÁS is ellenőrzi lentebb:
        // egy kézzel írt esemény hazudhat.
        kulonAgot.get(entitas).set(esemeny.szerzo, esemeny.adat.kulonvalasIgeny === true);
      }

    } else if (esemeny.tipus === 'TudatpontRendezes') {
      const terkep = tulajdonosok.get(esemeny.adat.entitas);
      if (!terkep) continue;                       // nem a mi érintettünkről szól
      const eddigi = terkep.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi.sorszam) continue;
      terkep.set(esemeny.szerzo, {
        pont: esemeny.adat.pont,
        szerep: esemeny.adat.szerep === 'passziv' ? 'passziv' : 'aktiv',
        sorszam: esemeny.sorszam
      });

    } else {
      const terkep = ertekJavaslatok.get(esemeny.adat.entitas);
      if (!terkep) continue;                       // nem a mi érintettünkről szól
      const eddigi = terkep.get(esemeny.szerzo);
      if (eddigi !== undefined && esemeny.sorszam <= eddigi.sorszam) continue;
      terkep.set(esemeny.szerzo, {
        ertekek: esemeny.adat.ertekek,
        sorszam: esemeny.sorszam
      });
    }

    reszek = allasokMost();
    lezarasIdeje = kozosLezaras(reszek);
  }

  // Hány SZAVAZAT maradt a lezáráson kívül (a késői tudatpont-rendezés nem „szavazat")
  for (let i = index; i < sor.length; i++) {
    if (sor[i].tipus === 'Szavazat') kesoiSzavazatok++;
  }

  return {
    reszek,
    lezarasIdeje,
    dontesiIdo: Math.max(...reszek.map((r) => r.allas.dontesiIdo)),
    // ⛔⛔ ÉS ITT AZ „ÉS": a csoport csak akkor elfogadott, ha MINDEN rész teljesíti a
    // SAJÁT küszöbeit. Egyetlen elbukó rész az egész javaslatot elveti.
    kuszobTeljesul: reszek.every((r) => r.allas.kuszobTeljesul),
    kesoiSzavazatok
  };
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
    // ⭐⭐ TÖBB ÉRINTETT (2026-09-07). Az ELSŐ az elsődleges — a szelet gazdája és a
    // javaslat szülője (`szabalyok.js`: `elsoErintett`) —, de a döntés bemenete MINDEGYIK.
    const kik = erintettek(e.adat);
    const erintettAzonositok = kik.map((r) => r.entitas);
    const erintettAzonosito = erintettAzonositok[0] ?? null;

    // ----- 1. ⭐⭐ ÉRINTETTENKÉNT KÜLÖN ÁLLÁS, KÖZÖS LEZÁRÁSSAL -----
    // Az események időrendben mennek, és a határidő utániak kimaradnak (lásd fentebb).
    // A KÜSZÖBÖK is innen jönnek: azok érvényesek, amik a LEZÁRÁS PILLANATÁIG
    // kialakultak — nem az entitás mai mediánja (az az entitás `kuszobok` mezője, a
    // felületnek). Különben egy utólagos érték javaslat átírná a lezárt döntés
    // szabályát, akár visszamenőleg a döntési idejét is.
    const csoport = reszekSzamitasa(
      e,
      kik,
      szavazatok.get(e.azonosito) ?? [],
      erintettAzonositok.flatMap((az) => tudatpontok.get(az) ?? []),
      erintettAzonositok.flatMap((az) => ertekJavaslatok.get(az) ?? [])
    );
    const { reszek, lezarasIdeje, dontesiIdo, kuszobTeljesul, kesoiSzavazatok } = csoport;

    // ⚠️ A FELÜLETNEK ÉS A PARANCSSORNAK EGY SZÁM KELL, a döntésnek viszont N.
    // Az összefoglaló számok az ELSŐ részé — ugyanúgy, ahogy az `erintett` és a
    // `muvelet` is az első érintetté. Egyetlen érintettnél ez pontosan a régi
    // viselkedés; többnél a teljes igazság a `reszek` tömbben van, és a döntést
    // (`kuszobTeljesul`) mindig az ÉS adja, nem ez az összefoglaló.
    const { kuszobok } = reszek[0] ?? { kuszobok: { ...ALAP_KUSZOBOK } };
    const {
      tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
      tamogatottsagEzrelek, ellenzoiEzrelek, tartozkodoiEzrelek, reszveteliEzrelek,
      bizonyossagiMutato, tamogatottsagTeljesul, reszvetelTeljesul
    } = reszek[0]?.allas ?? {};

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
      erintettek: kik,
      // ⭐⭐ ÉS KI VÁLIK KÜLÖN, ÉRINTETTENKÉNT (2026-09-08). A végrehajtás ebből tudja
      // meg, kinek kell külön ágat nyitni a régi változattal.
      kulonvalok: Object.fromEntries(reszek.map((r) => [r.entitas, r.kulonvalok ?? []])),
      // ⚠️ A `muvelet`/`valtozas` az ELSŐ érintetté — összefoglaló, nem az igazság.
      // A végrehajtás az `erintettek` tömböt járja, mert a művelet ENTITÁSONKÉNTI.
      muvelet: kik[0]?.muvelet ?? null,
      valtozas: kik[0]?.valtozas ?? null,
      letrehozo: e.szerzo,
      megszuletett: lezarasIdeje,
      pillanatkep: {
        tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
        tamogatottsagEzrelek, reszveteliEzrelek, bizonyossagiMutato,
        // ⭐ ÉS RÉSZENKÉNT IS — mert a döntés részenként dőlt el. *Ki mit fogadott el, és
        // hol.* Az összefoglaló fenti számok az elsőé; ez a teljes kép.
        reszek: reszek.map((r) => ({
          entitas: r.entitas, muvelet: r.muvelet,
          tamogatok: r.allas.tamogatok, szavazok: r.allas.szavazok, nevezo: r.allas.nevezo,
          tamogatottsagEzrelek: r.allas.tamogatottsagEzrelek,
          reszveteliEzrelek: r.allas.reszveteliEzrelek
        }))
      }
    };

    javaslatok.set(e.azonosito, {
      azonosito: e.azonosito,
      fajta,                                   // 'szerkesztesi' | 'altalanos' (D27)
      erintett: erintettAzonosito,
      erintettek: kik,
      muvelet: kik[0]?.muvelet ?? null,        // összefoglaló (lásd az egyezménynél)
      valtozas: kik[0]?.valtozas ?? null,
      indoklas: e.adat.indoklas ?? null,
      letrehozo: e.szerzo,
      letrehozva: e.ido,

      tamogatok, ellenzok, tartozkodok, szavazok, nevezo,
      tamogatottsagEzrelek, ellenzoiEzrelek, tartozkodoiEzrelek, reszveteliEzrelek,
      bizonyossagiMutato,

      kuszobok,
      tamogatottsagTeljesul,
      reszvetelTeljesul,
      // ⛔⛔ A CSOPORT DÖNTÉSE: minden résznek teljesítenie kell a SAJÁT küszöbeit.
      kuszobTeljesul,

      // ⭐⭐ A RÉSZEK — érintettenként egy: saját szavazói kör, saját küszöbök, saját
      // döntési idő. Ez a teljes igazság; a fenti összefoglaló számok az ELSŐ részé.
      reszek: reszek.map((r) => ({
        entitas: r.entitas,
        muvelet: r.muvelet,
        valtozas: r.valtozas,
        kuszobok: r.kuszobok,
        kulonvalok: r.kulonvalok ?? [],
        ...r.allas
      })),

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
