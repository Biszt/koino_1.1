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
      
      const ertekek = await ErtekSzamitasService.aktulisErtekekLekerese(tartalom.entitasId);
      
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

    // 2. LÉPÉS - ENTITÁSOK TUDATPONT TULAJDONOSAINAK SZÁMA
    // Egyesített halmaz az összes érintett entitás tudatpont tulajdonosaiból
     console.log("szamitottErtekekFrissitese >>>>>>>>>>>>>>>>>>> TudatpontService.tobbEntitasEgyesitettHozzajaruloinakLekerese", {
      erintettEntitasok: javaslat.erintettEntitasok
     });
    const entitasTudatpontTulajdonosokEmberek = await TudatpontService.tobbEntitasEgyesitettHozzajaruloinakLekerese(
      javaslat.erintettEntitasok
    );
    const entitasokTudatpontTulajdonosokSzama = entitasTudatpontTulajdonosokEmberek.length;

    console.log("entitasokTudatpontTulajdonosokSzama:::::::::::::::::::::", entitasokTudatpontTulajdonosokSzama);
    

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
    // RA = (résztvevőTudatpontTulajdonosok / entitásokTudatpontTulajdonosok) * 100
    const reszveteliArany = (resztvevoTudatpontTulajdonosokSzama / entitasokTudatpontTulajdonosokSzama) * 100;

    // 7. LÉPÉS - TÁMOGATOTTSÁGI ÉS ELLENZŐI ARÁNY SZÁMÍTÁSA
    const tamogatotsagiArany = ((javaslatotTamogatok + (tartozkodok / 2)) / szavazok) * 100;
    const ellenzoiArany = ((javaslatotEllenzok + (tartozkodok / 2)) / szavazok) * 100;

    // 8. LÉPÉS - BIZONYOSSÁGI MUTATÓ SZÁMÍTÁSA
    const maxArany = Math.max(tamogatotsagiArany, ellenzoiArany);    
    const bizonyossagiMutato = (((maxArany - 50) * 2) + reszveteliArany) / 2;

    console.log("bizonyossagiMutato::::::::::::::::::::::::", bizonyossagiMutato);
    
    

    // 9. LÉPÉS - DÖNTÉSI IDEJE SZÁMÍTÁSA (ÚJ KÉPLET - DINAMIKUS HATÁROKKAL)
    // Érintett tartalmak átlag értékeinek lekérése
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
