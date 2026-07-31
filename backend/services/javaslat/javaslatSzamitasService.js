// backend/services/javaslat/javaslatSzamitasService.js

// ===================================
// IMPORTOK
// ===================================
// Repository importálása
const JavaslatRepository = require('../../repositories/javaslatRepository');
const SzavazatRepository = require('../../repositories/szavazatRepository');

// Tudatpont szolgáltatás importálása
const TudatpontService = require('../tudatpontService');

// Érték számítás szolgáltatás importálása
const ErtekSzamitasService = require('../ertekSzamitasService');

// ===================================
// JAVASLAT SZÁMÍTÁS SERVICE OSZTÁLY
// ===================================
// Ez az osztály felelős a javaslatok számított értékeinek kiszámításáért
class JavaslatSzamitasService {

  // ===================================
  // SEGÉDFÜGGVÉNYEK
  // ===================================

  // ----- ÉRINTETT TARTALMAK ÁTLAG ÉRTÉKEINEK LEKÉRÉSE -----
  /**
   * Érintett tartalmak döntési idő paramétereinek átlagolása
   * Csak Tartalom típusú entitásokat vesz figyelembe
   * Ha nincs tartalom az érintettek között, alapértelmezett értékeket ad vissza
   * @param {Array} erintettEntitasok - Érintett entitások tömbje
   * @returns {Promise<Object>} Átlagolt értékek
   */
  async erintettTartalmakAtlagErtekeinekLekerese(erintettEntitasok) {
    console.log("=================================== erintettTartalmakAtlagErtekeinekLekerese::", {
      erintettEntitasok: erintettEntitasok
    });

    // 1. LÉPÉS - Csak tartalom típusú entitásokat szűrjük ki
    const tartalmak = erintettEntitasok.filter(e => e.entitasTipus === 'Tartalom');
    
    console.log("Szűrt tartalmak száma:", tartalmak.length);

    // Ha nincs tartalom az érintettek között, alapértelmezett értékeket adunk vissza
    if (tartalmak.length === 0) {
      console.log("Nincs tartalom az érintettek között, alapértelmezett értékek visszaadása");
      return {
        aktualMinimumDontesiIdo: 0,
        aktualMaximumDontesiIdo: 31536000
      };
    }

    // 2. LÉPÉS - Minden tartalom értékeinek lekérése
    let osszegMinimum = 0;
    let osszegMaximum = 0;

    for (const tartalom of tartalmak) {

      console.log("erintettTartalmakAtlagErtekeinekLekerese >>>>>>>>>>>>>>>>>>>>>>>> ErtekSzamitasService.aktulisErtekekLekerese");
      
      const ertekek = await ErtekSzamitasService.aktulisErtekekLekerese(tartalom.entitasId, tartalom.entitasTipus);

      console.log("Tartalom értékei:", {
        tartalomId: tartalom.entitasId,
        minimumDontesiIdo: ertekek.aktualMinimumDontesiIdo,
        maximumDontesiIdo: ertekek.aktualMaximumDontesiIdo
      });

      osszegMinimum += ertekek.aktualMinimumDontesiIdo;
      osszegMaximum += ertekek.aktualMaximumDontesiIdo;
    }

    // 3. LÉPÉS - Átlagolás és kerekítés
    const atlagMinimum = Math.round(osszegMinimum / tartalmak.length);
    const atlagMaximum = Math.round(osszegMaximum / tartalmak.length);

    console.log("<<<<<<<<<<<<<<<<<<<<<<<< erintettTartalmakAtlagErtekeinekLekerese====Átlagolt értékek:", {
      aktualMinimumDontesiIdo: atlagMinimum,
      aktualMaximumDontesiIdo: atlagMaximum
    });

    return {
      aktualMinimumDontesiIdo: atlagMinimum,
      aktualMaximumDontesiIdo: atlagMaximum
    };
  }

  // ===================================
  // SZÁMÍTOTT ÉRTÉKEK FRISSÍTÉSE
  // ===================================

  // ----- SZÁMÍTOTT ÉRTÉKEK FRISSÍTÉSE -----
  /**
   * Egy javaslat összes számított értékének újraszámítása
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise<Object>} A frissített javaslat
   * @throws {Error} Ha a javaslat nem található
   */
  async szamitottErtekekFrissitese(javaslatId) {
    console.log("=================================== szamitottErtekekFrissitese::", { javaslatId: javaslatId });

    // 1. LÉPÉS - JAVASLAT LEKÉRÉSE
    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>> JavaslatRepository.findById: ", {
      javaslatId: javaslatId
    });
    
    const javaslat = await JavaslatRepository.findById(javaslatId);
    console.log("javaslat:", javaslat);

    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    // 2. LÉPÉS - A RÉSZVÉTELI ARÁNY NEVEZŐJE: AKTÍV TULAJDONOSOK ∪ SZAVAZÓK
    // (a) Az érintett entitások AKTÍV szerepű tudatpont-tulajdonosai. A passzív
    //     FIGYELŐK szándékosan kimaradnak → nem korlátozzák a döntést (a modell lényege).
    // (b) UNIÓ a javaslat SZAVAZÓIVAL: aki szavazott, az résztvevő, ezért a nevezőben
    //     is benne kell legyen. Így a számláló ⊆ nevező (a részvételi arány ≤ 100%)
    //     akkor is áll, ha valaki a szavazása UTÁN a menüből passzívra vált. (A
    //     szavazás egyébként automatikusan aktívvá tesz — lásd szavazatService.)
    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>> TudatpontService.tobbEntitasEgyesitettAktivHozzajaruloinakLekerese", {
      erintettEntitasok: javaslat.erintettEntitasok
    });
    const aktivTulajdonosok = await TudatpontService.tobbEntitasEgyesitettAktivHozzajaruloinakLekerese(
      javaslat.erintettEntitasok
    );
    const szavazoIds = await SzavazatRepository.getSzavazokListaja(javaslatId);

    // Egyedi halmaz: aktív tulajdonosok + szavazók (duplikációk kiesnek)
    const nevezoEmberIds = new Set(aktivTulajdonosok.map(id => id.toString()));
    szavazoIds.forEach(id => nevezoEmberIds.add(id.toString()));

    const entitasokTudatpontTulajdonosokSzama = nevezoEmberIds.size;

    console.log("entitasokTudatpontTulajdonosokSzama (aktív ∪ szavazók):", entitasokTudatpontTulajdonosokSzama);
    

    // 3. LÉPÉS - SZAVAZATOK SZÁMOLÁSA (TÁMOGATÓK, ELLENZŐK, TARTÓZKODÓK)

    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.countTamogatok", {
      javaslatId: javaslatId
    });
    const javaslatotTamogatok = await SzavazatRepository.countTamogatok(javaslatId);
    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.countEllenzok", {
      javaslatId: javaslatId
    });
    const javaslatotEllenzok = await SzavazatRepository.countEllenzok(javaslatId);
    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.countTartozkodok", {
      javaslatId: javaslatId
    });
    const tartozkodok = await SzavazatRepository.countTartozkodok(javaslatId);

    // 4. LÉPÉS - RÉSZTVEVŐ TUDATPONT TULAJDONOSOK SZÁMA
    // Akik szavaztak (támogató + ellenző + tartózkodók)
    const resztvevoTudatpontTulajdonosokSzama = javaslatotTamogatok + javaslatotEllenzok + tartozkodok;

    console.log("resztvevoTudatpontTulajdonosokSzama:::::::::::::::::::::", resztvevoTudatpontTulajdonosokSzama);
    

    // 5. LÉPÉS - SZAVAZÓK SZÁMA
    // Összes szavazó (támogató + ellenző + tartozkodok)
    const szavazok = javaslatotTamogatok + javaslatotEllenzok + tartozkodok;

    // 6. LÉPÉS - RÉSZVÉTELI ARÁNY SZÁMÍTÁSA (RA)
    // RA = (résztvevőTudatpontTulajdonosok / nevező) * 100, ahol a nevező az aktív
    // tulajdonosok ∪ szavazók halmaza (2. lépés). Osztás-védelem: ha a nevező 0
    // (nincs se aktív tulajdonos, se szavazó), a részvételi arány 0.
    const reszveteliArany = entitasokTudatpontTulajdonosokSzama > 0
      ? (resztvevoTudatpontTulajdonosokSzama / entitasokTudatpontTulajdonosokSzama) * 100
      : 0;

    // 7. LÉPÉS - TÁMOGATOTTSÁGI / ELLENZŐI / TARTÓZKODÓI ARÁNY (MODELL A – TISZTA SZELETEK)
    // A három arány a szavazók (T + E + tk) között oszlik el, és együtt MINDIG 100%-ot ad ki.
    // A tartózkodás önálló szelet: NEM olvad bele a támogatottságba/ellenzésbe (a korábbi
    // „fél-szétosztás” megszűnt), így a passzivitás csökkenti a támogatottságot.
    const tamogatotsagiArany = szavazok > 0 ? (javaslatotTamogatok / szavazok) * 100 : 0;
    const ellenzoiArany      = szavazok > 0 ? (javaslatotEllenzok  / szavazok) * 100 : 0;
    const tartozkodoiArany   = szavazok > 0 ? (tartozkodok         / szavazok) * 100 : 0;

    // 8. LÉPÉS - BIZONYOSSÁGI MUTATÓ SZÁMÍTÁSA
    // Egyértelműség = a támogatottság és az ellenzés KÜLÖNBSÉGE (0 = döntetlen, 100 = egyöntetű).
    // Ez a korábbi ((max(TA,EA) − 50) × 2) képlet pontos általánosítása – azonos értéket ad,
    // mert a kivonásnál a tartózkodók fele-fele része kiesik. A BM ennek és a részvételi
    // aránynak az átlaga (a képlet szerkezete változatlan).
    const egyertelmuseg = Math.abs(tamogatotsagiArany - ellenzoiArany);
    const bizonyossagiMutato = (egyertelmuseg + reszveteliArany) / 2;

    console.log("bizonyossagiMutato::::::::::::::::::::::::", bizonyossagiMutato);
    
    

    // 9. LÉPÉS - DÖNTÉSI IDő SZÁMÍTÁSA 
    // Érintett tartalmak átlag értékeinek lekérése 
    // (Az átag számítás lehet hogy nem jó, mivel megsértheti a tartalmak köszöb értékit.
    //  Jobb lenne, ha csak az időt átlagólnánk, de a javaslat elfogadási küszöb és a részvételi arány küszöbnek tartalmakra lebontva is teljesűlniük kellene)
    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> erintettTartalmakAtlagErtekeinekLekerese", {
      erintettEntitasok: javaslat.erintettEntitasok
    });
    
    const tartalmakErtekei = await this.erintettTartalmakAtlagErtekeinekLekerese(javaslat.erintettEntitasok);
    
    // Tartomány kiszámítása
    const tartomany = tartalmakErtekei.aktualMaximumDontesiIdo - tartalmakErtekei.aktualMinimumDontesiIdo;

    console.log("tartomany:::::::::::::::::::::::", tartomany);

    console.log("tartalmakErtekei.aktualMinimumDontesiIdo::::::::::::::::::", tartalmakErtekei.aktualMinimumDontesiIdo);
    
    
    
    // Döntési idő képlet (LINEÁRIS): minimum + (tartomány * (1 - BM/100))
    const dontesiIdo = tartalmakErtekei.aktualMinimumDontesiIdo + 
                      (tartomany * (1 - bizonyossagiMutato / 100));

    console.log("dontesiIdo::::::::::::::::::::::::", dontesiIdo);
    

    // 10. LÉPÉS - SZÁMÍTOTT ÉRTÉKEK OBJEKTUM
    const szamitottErtekek = {
      entitasokTudatpontTulajdonosokSzama: entitasokTudatpontTulajdonosokSzama,
      resztvevoTudatpontTulajdonosokSzama: resztvevoTudatpontTulajdonosokSzama,
      javaslatTamogatoinakSzama: javaslatotTamogatok,
      javaslatEllenzoinekSzama: javaslatotEllenzok,
      javaslatTartozkodoinakSzama: tartozkodok,
      reszveteliArany: reszveteliArany,
      tamogatotsagiArany: tamogatotsagiArany,
      ellenzoiArany: ellenzoiArany,
      tartozkodoiArany: tartozkodoiArany, // ÚJ – Modell A tiszta tartózkodói szelet (T+E+tk = 100%)
      bizonyossagiMutato: bizonyossagiMutato,
      dontesiIdo: dontesiIdo
    };

    // 11. LÉPÉS - REPOSITORY HÍVÁS - FRISSÍTÉS

    console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateSzamitottErtekek", {
      javaslatId: javaslatId,
      szamitottErtekek: szamitottErtekek
    });
    const frissitettJavaslat = await JavaslatRepository.updateSzamitottErtekek(
      javaslatId,
      szamitottErtekek
    );

    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> szamitottErtekekFrissitese====Eredmény:", {
      szamitottErtekek: szamitottErtekek,
      frissitettJavaslat: frissitettJavaslat
    });

    return frissitettJavaslat;
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatSzamitasService();
