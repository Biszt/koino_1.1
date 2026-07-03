// backend/services/tartalomService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================

const TartalomRepository = require('../repositories/tartalomRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TudatpontService = require('./tudatpontService');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const ErtekSzamitasService = require('./ertekSzamitasService');

// ===================================
// TARTALOM SERVICE OSZTÁLY
// ===================================

// Ez a réteg tartalmazza az üzleti logikát
class TartalomService {

  // =====================================
  // ----- ÚJ TARTALOM LÉTREHOZÁSA -----
  // =====================================

  /**
   * Új tartalom létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A tartalom adatai
   * @param {string} adatok.cim - A tartalom címe (kötelező)
   * @param {string} adatok.szoveg - A tartalom szövege (opcionális)
   * @param {string} adatok.tartalomTipusId - Tartalom típus ID (kötelező)
   * @param {Array} adatok.kategoriaIds - Kategória ID-k tömbje (opcionális, maximum 3)
   * @param {string} adatok.szuloId - Szülő tartalom ID (opcionális)
   * @param {string} adatok.statusz - Státusz (opcionális, alapértelmezett: 'Lathato')
   * @param {number} adatok.javaslatElfogadasiKuszob - Érték javaslat elfogadási küszöb (51-100)
   * @param {number} adatok.reszveteliAranyKuszob - Részvételi arány küszöb (0-100)
   * @param {number} adatok.minimumDontesiIdo - Minimum döntési idő másodpercben (0-31536000)
   * @param {number} adatok.maximumDontesiIdo - Maximum döntési idő másodpercben (0-315360000)
   * @param {string} eemberId - A létrehozó eember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise} A létrehozott tartalom
   */
  async tartalomLetrehozasa(adatok, eemberId, kezdoTudatpont) {
    console.log("=================================== tartalomLetrehozasa: ", {
      adatok: adatok,
      eemberId: eemberId,
      kezdoTudatpont: kezdoTudatpont
    });
    console.log("adatok.kategoriaIds: ", adatok.kategoriaIds);

    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    if (!adatok.cim || !adatok.cim.trim()) {
      throw new Error('A cím megadása kötelező');
    }
    
    if (!eemberId) {
      throw new Error('A létrehozó eember azonosítása szükséges');
    }

    // ===== 2. LÉPÉS - INICIALIS TUDATPONT VALIDÁLÁSA =====
    // Ellenőrizzük, hogy szám-e
    if (typeof kezdoTudatpont !== 'number' || isNaN(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek számnak kell lennie');
    }
    
    // Ellenőrizzük, hogy legalább 1
    if (kezdoTudatpont < 1) {
      throw new Error('Minimum 1 tudatpont szükséges a tartalom létrehozásához');
    }
    
    // Ellenőrizzük, hogy egész szám-e
    if (!Number.isInteger(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek egész számnak kell lennie');
    }

    // ===== 2.1 LÉPÉS -ÉRTÉK JAVASLAT ELFOGADÁSI KÜSZÖB VALIDÁLÁSA =====
    const javaslatElfogadasiKuszob = adatok.javaslatElfogadasiKuszob || 51;  // Alapértelmezett: 67%
    
    if (javaslatElfogadasiKuszob < 51 || javaslatElfogadasiKuszob > 100) {
      throw new Error('A érték javaslat elfogadási küszöb 51 és 100 között kell legyen');
    }
    
    if (!Number.isInteger(javaslatElfogadasiKuszob)) {
      throw new Error('A érték javaslat elfogadási küszöbnek egész számnak kell lennie');
    }

    // ===== 2.2 LÉPÉS - RÉSZVÉTELI ARÁNY KÜSZÖB VALIDÁLÁSA =====
    const reszveteliAranyKuszob = adatok.reszveteliAranyKuszob || 51;  // Alapértelmezett: 30%
    
    if (reszveteliAranyKuszob < 0 || reszveteliAranyKuszob > 100) {
      throw new Error('A részvételi arány küszöb 0 és 100 között kell legyen');
    }
    
    if (!Number.isInteger(reszveteliAranyKuszob)) {
      throw new Error('A részvételi arány küszöbnek egész számnak kell lennie');
    }

    // ===== 2.3 LÉPÉS - MINIMUM DÖNTÉSI IDŐ VALIDÁLÁSA =====
    const minimumDontesiIdo = adatok.minimumDontesiIdo !== undefined 
      ? adatok.minimumDontesiIdo 
      : 0;  // Alapértelmezett: 0 mp (azonnali végrehajtás lehetséges)
    
    if (typeof minimumDontesiIdo !== 'number' || isNaN(minimumDontesiIdo)) {
      throw new Error('A minimum döntési időnek számnak kell lennie');
    }
    
    if (minimumDontesiIdo < 0) {
      throw new Error('A minimum döntési idő nem lehet negatív');
    }
    
    if (!Number.isInteger(minimumDontesiIdo)) {
      throw new Error('A minimum döntési időnek egész számnak kell lennie');
    }

    // ===== 2.4 LÉPÉS - MAXIMUM DÖNTÉSI IDŐ VALIDÁLÁSA =====
    const maximumDontesiIdo = adatok.maximumDontesiIdo !== undefined 
      ? adatok.maximumDontesiIdo 
      : 31536000;  // Alapértelmezett: 31536000 mp (1 év)
    
    if (typeof maximumDontesiIdo !== 'number' || isNaN(maximumDontesiIdo)) {
      throw new Error('A maximum döntési időnek számnak kell lennie');
    }
    
    if (maximumDontesiIdo < 0 || maximumDontesiIdo > 315360000) {
      throw new Error('A maximum döntési idő 0 és 315360000 mp között kell legyen');
    }
    
    if (!Number.isInteger(maximumDontesiIdo)) {
      throw new Error('A maximum döntési időnek egész számnak kell lennie');
    }

    // Logikai ellenőrzés: minimum nem lehet nagyobb mint maximum
    if (minimumDontesiIdo > maximumDontesiIdo) {
      throw new Error('A minimum döntési idő nem lehet nagyobb mint a maximum');
    }

    // ===== 3. LÉPÉS - CÍM TISZTÍTÁSA (trim) =====
    const tisztitottCim = adatok.cim.trim();

    // ===== 4. LÉPÉS - SZÖVEG KEZELÉSE HA VAN =====
   const tisztitottSzoveg = adatok.szoveg !== undefined ? adatok.szoveg : null;

    // ===== 5. LÉPÉS - STÁTUSZ VALIDÁLÁS =====
    const megengedettStatuszok = ['Lathato', 'Lathatatlan', 'Takart'];
    const statusz = adatok.statusz; // Alapértelmezett: látható
    
    if (!megengedettStatuszok.includes(statusz)) {
      throw new Error('Érvénytelen státusz. Megengedett értékek: Lathato, Lathatatlan, Takart');
    }

    // ===== 6. LÉPÉS - KATEGÓRIA ID-K VALIDÁLÁSA =====
    let validaltKategoriaIds = [];
    
    if (adatok.kategoriaIds && Array.isArray(adatok.kategoriaIds) && adatok.kategoriaIds.length > 0) {
      // 6.1 - Ellenőrizzük, hogy maximum 3 kategória van-e
      console.log("adatok.kategoriaIds: ", adatok.kategoriaIds);
      
      if (adatok.kategoriaIds.length > 3) {
        throw new Error('Maximum 3 kategória rendelhető egy tartalomhoz');
      }

      // 6.2 - Üres stringek és null értékek kiszűrése
      const szurtKategoriaIds = adatok.kategoriaIds.filter(id => id && id.trim() !== '');

      // 6.3 - Duplikációk ellenőrzése (ugyanaz a kategória többször)
      const egyediKategoriaIds = new Set(szurtKategoriaIds);
      if (egyediKategoriaIds.size !== szurtKategoriaIds.length) {
        throw new Error('Ugyanaz a kategória nem adható hozzá többször');
      }

      // 6.4 - Ellenőrizzük, hogy minden kategória létezik-e az adatbázisban
      for (const kategoriaId of szurtKategoriaIds) {

        console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> KategoriaRepository.findById", {
          kategoriaId: kategoriaId
        });
        
        const kategoria = await KategoriaRepository.findById(kategoriaId);
        if (!kategoria) {
          throw new Error(`A kategória nem található: ${kategoriaId}`);
        }
        
        // Ha létezik, hozzáadjuk a validált listához
        validaltKategoriaIds.push(kategoriaId);
      }
    }

    // ===== 7. LÉPÉS - TARTALOM OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const tartalomAdatok = {
      cim: tisztitottCim,
      szoveg: tisztitottSzoveg,           // null vagy JSON tömb a szövegszerkesztőtől
      tartalomTipusId: adatok.tartalomTipusId || null,
      kategoriaIds: validaltKategoriaIds,
      szuloId: adatok.szuloId || null,
      szuloTipus: adatok.szuloTipus || null,
      letrehozo: eemberId,
      statusz: statusz,
    };


    // ===== 8. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====

    console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> TartalomRepository.create", {
          tartalomAdatok: tartalomAdatok
        });
    const ujTartalom = await TartalomRepository.create(tartalomAdatok);

    // ===== 9. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A tartalom létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese",);
      await TudatpontService.tudatpontHozzarendelese(
        eemberId,           // Ki adja a tudatpontot
        ujTartalom._id,          // Melyik entitásra (az új tartalom ID-ja)
        'Tartalom',              // Entitás típusa
        kezdoTudatpont           // Mennyi tudatpontot
      );
    } catch (error) {
      // ===== HIBAKEZELÉS - HA NINCS ELÉG TUDATPONT =====
      // Ha nem sikerült a tudatpont hozzárendelés, töröljük a tartalmat

      console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> TartalomRepository.deleteById", {
        ujTartalom: ujTartalom.id
      });
      await TartalomRepository.deleteById(ujTartalom._id);
      
      // Hibát dobunk a megfelelő üzenettel
      throw new Error(`Tartalom létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10. LÉPÉS - ÉRTÉK JAVASLAT LÉTREHOZÁSA =====
    // A létrehozó automatikusan érték javaslatot ad az általa megadott értékekre
    try {

      console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> ErtekJavaslatRepository.create", {
        tartalomId: ujTartalom._id,
        eemberId: eemberId,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      await ErtekJavaslatRepository.create({
        tartalomId: ujTartalom._id,
        eemberId: eemberId,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      
      console.log('Érték javaslat létrehozva létrehozónak');
    } catch (error) {
      // Ha nem sikerült, logoljuk de nem döntjük meg a tartalmat
      console.error('Érték javaslat létrehozási hiba:', error.message);
    }

    // ===== 11. LÉPÉS - HISZTOGRAM INICIALIZÁLÁSA =====
    // Létrehozzuk a kezdeti hisztogramot a létrehozó értékeivel
    try {

      console.log("tartalomLetrehozasa >>>>>>>>>>>>>>>>> ErtekSzamitasService.hisztogramLetrehozasa", {
        ujTartalom: ujTartalom._id,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      await ErtekSzamitasService.hisztogramLetrehozasa(
        ujTartalom._id,
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo
      );
      
      console.log('Hisztogram inicializálva');
    } catch (error) {
      // Ha nem sikerült, logoljuk de nem döntjük meg a tartalmat
      console.error('Hisztogram inicializálási hiba:', error.message);
    }

    // ===== 12. LÉPÉS - LÉTREHOZOTT TARTALOM VISSZAADÁSA =====
    console.log("<<<<<<<<<<<<<<<<<<<<<< tartalomLetrehozasa====ujTartalom: ", {
      ujTartalom: ujTartalom
    });
    return ujTartalom;
  }

  // =====================================
  // ----- TARTALOM LEKÉRÉSE ID ALAPJÁN -----
  // =====================================

  /**
   * Egy tartalom lekérése jogosultság ellenőrzéssel
   * @param {string} id - A tartalom ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} A tartalom objektum
   */
  async tartalomLekerese(id, eemberId) {
    console.log("=================================== tartalomLekerese:: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A tartalom ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - tartalom lekérése

    console.log("tartalomLekerese >>>>>>>>>>>>>>>>>> TartalomRepository.findById", {
      id: id
    });
    
    const tartalom = await TartalomRepository.findById(id);

    // 3. LÉPÉS - Létezés ellenőrzése
    if (!tartalom) {
      throw new Error('A tartalom nem található');
    }

    // 4. LÉPÉS - Jogosultság ellenőrzése státusz alapján
    // Ha nem "Lathato", csak a saját tartalmát láthatja
    if (tartalom.statusz !== 'Lathato') {
      // Ellenőrizzük, hogy a eember a tartalom létrehozója-e
      if (!eemberId || tartalom.letrehozo._id.toString() !== eemberId.toString()) {
        throw new Error('Nincs jogosultságod megtekinteni ezt a tartalmat');
      }
    }

    console.log("<<<<<<<<<<<<<<<<< tartalomLekerese=====tartalom: ", {
      tartalom: tartalom
    });
    return tartalom;
  }

  // =====================================
  // ----- TARTALMAK LISTÁZÁSA -----
  // =====================================

  /**
   * Tartalmak listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} Tartalmak tömb
   */
  async tartalomListazasa(szurok = {}, eemberId) {
    console.log("===================================  tartalomListazasa:: ", {
      szurok: szurok,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Státusz kezelés
    // Ha nincs megadva státusz szűrő, alapértelmezetten csak a látható tartalmakat
    if (!szurok.statusz) {
      szurok.statusz = 'Lathato';
    }

    // 2. LÉPÉS - Repository hívás - tartalmak lekérése

    console.log("tartalomListazasa >>>>>>>>>>>>>>>>> TartalomRepository.findAll", { 
      szurok: szurok
    });
    
    const tartalmak = await TartalomRepository.findAll(szurok);

    // 3. LÉPÉS - Jogosultság szűrés (csak látható vagy saját tartalmak)
    const szurtTartalmak = tartalmak.filter(tartalom => {
      // Ha látható, mindenki láthatja
      if (tartalom.statusz === 'Lathato') {

        console.log("<<<<<<<<<<<<<<<<<< tartalomListazasa", "true");
        
        return true;
      }
      
      // Ha nem látható, csak a saját tartalmát
      if (eemberId && tartalom.letrehozo._id.toString() === eemberId.toString()) {

        console.log("<<<<<<<<<<<<<<<<<< tartalomListazasa", "true");
        return true;
      }

      console.log("<<<<<<<<<<<<<<<<<< tartalomListazasa", "false");      
      return false;
    });

    console.log("<<<<<<<<<<<<<<<<<<<<<tartalomListazasa===szurtTartalmak: ", {
      szurtTartalmak
    });
    return szurtTartalmak;
  }

  // =====================================
  // ----- TARTALOM ModositasA -----
  // =====================================

  /**
   * Egy tartalom módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A tartalom ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} eemberId - A módosítást végző eember ID-ja
   * @returns {Promise} A frissített tartalom
   */
  async tartalomModositasa(id, frissitesek, eemberId) {
    console.log("=================================== tartalomModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Tartalom létezésének ellenőrzése

    console.log("tartalomModositasa >>>>>>>>>>>>>>>>>>>>> TartalomRepository.findById", {
      id: id
    });
    
    const tartalom = await TartalomRepository.findById(id);
    
    if (!tartalom) {
      throw new Error('A tartalom nem található');
    }

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak a létrehozó módosíthatja a saját tartalmát
    if (tartalom.letrehozo._id.toString() !== eemberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a tartalmat');
    }

    // 3. LÉPÉS - Engedélyezett mezők szűrése
    // Csak bizonyos mezők módosíthatók
    const megengedettMezok = ['cim', 'szoveg', 'statusz', 'kategoriaIds']; // MÓDOSÍTVA: + kategoriaIds
    const tisztitottFrissitesek = {};
    
    for (const mezo of megengedettMezok) {
      if (frissitesek.hasOwnProperty(mezo)) {
        tisztitottFrissitesek[mezo] = frissitesek[mezo];
      }
    }

    // 4. LÉPÉS - Cím validálás (ha változik)
    if (tisztitottFrissitesek.cim !== undefined) {
      const tisztitottCim = tisztitottFrissitesek.cim.trim();
      
      if (!tisztitottCim) {
        throw new Error('A cím nem lehet üres');
      }
      
      tisztitottFrissitesek.cim = tisztitottCim;
    }

    // 5. LÉPÉS - SZÖVEG KEZELÉSE (ha változik)
    if (tisztitottFrissitesek.szoveg !== undefined) {
    }

    // 6. LÉPÉS - Státusz validálás (ha változik)
    if (tisztitottFrissitesek.statusz) {
      const megengedettStatuszok = ['Lathato', 'Lathatatlan', 'Takart'];
      
      if (!megengedettStatuszok.includes(tisztitottFrissitesek.statusz)) {
        throw new Error('Érvénytelen státusz. Megengedett értékek: Lathato, Lathatatlan, Takart');
      }
    }

    // 7. LÉPÉS - KATEGÓRIA ID-K VALIDÁLÁSA (ha változik) - ÚJ!
    if (tisztitottFrissitesek.kategoriaIds !== undefined) {
      let validaltKategoriaIds = [];
      
      if (Array.isArray(tisztitottFrissitesek.kategoriaIds) && tisztitottFrissitesek.kategoriaIds.length > 0) {
        // 7.1 - Ellenőrizzük, hogy maximum 3 kategória van-e
        if (tisztitottFrissitesek.kategoriaIds.length > 3) {
          throw new Error('Maximum 3 kategória rendelhető egy tartalomhoz');
        }

        // 7.2 - Üres stringek és null értékek kiszűrése
        const szurtKategoriaIds = tisztitottFrissitesek.kategoriaIds.filter(id => id && id.trim() !== '');

        // 7.3 - Duplikációk ellenőrzése
        const egyediKategoriaIds = new Set(szurtKategoriaIds);
        if (egyediKategoriaIds.size !== szurtKategoriaIds.length) {
          throw new Error('Ugyanaz a kategória nem adható hozzá többször');
        }

        // 7.4 - Ellenőrizzük, hogy minden kategória létezik-e
        for (const kategoriaId of szurtKategoriaIds) {
          const kategoria = await KategoriaRepository.findById(kategoriaId);
          if (!kategoria) {
            throw new Error(`A kategória nem található: ${kategoriaId}`);
          }
          validaltKategoriaIds.push(kategoriaId);
        }
      }
      
      // Frissítjük a validált kategória ID-kkal
      tisztitottFrissitesek.kategoriaIds = validaltKategoriaIds;
    }

    // 8. LÉPÉS - Repository hívás - frissítés

    console.log("tartalomModositasa >>>>>>>>>>>>>>>>>>> TartalomRepository.updateById", {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });
    
    const frissitettTartalom = await TartalomRepository.updateById(id, tisztitottFrissitesek);

    console.log("<<<<<<<<<<<<<<<<<<<< tartalomModositasa====frissitettTartalom: ", {
      frissitettTartalom: frissitettTartalom
    });
    return frissitettTartalom;
  }

  // =====================================
  // ----- TARTALOM RÉSZLETES ADATAI TUDATPONTTAL -----
  // =====================================

  /**
   * Tartalom részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A tartalom ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} Tartalom + tudatpont adatok
   */
  async tartalomReszleteinekLekerese(id, eemberId) {
    console.log("=================================== tartalomReszleteinekLekerese: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Tartalom alapadatainak lekérése (jogosultság ellenőrzéssel)

    console.log("tartalomReszleteinekLekerese >>>>>>>>>>>>>>>>>>> this.tartalomLekerese");
    
    const tartalom = await this.tartalomLekerese(id, eemberId);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'Tartalom',
      eemberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása
    console.log("<<<<<<<<<<<<<<<<< tartalomReszleteinekLekerese====Eredmény:", {
      tartalom: tartalom,
      tudatpont: tudatpontAdatok
    });
    
    return {
      tartalom: tartalom,
      tudatpont: tudatpontAdatok
    };
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  //
  // A tartalmak NEM törölhetők direkt Service metódus híváson keresztül.
  //
  // Törlés csak automatikusan történik:
  //
  // AUTOMATIKUS Torles - Tudatpont nullázás
  // - Ha minden eember, vagy egy egyezmény visszavonja a tudatpontjait
  // - És az osszesPont 0-ra csökken
  // - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  // - Az entitás törlése: tartalomRepository.deleteById()
  //
  // A tartalomRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!

}

// Service exportálása
module.exports = new TartalomService();
