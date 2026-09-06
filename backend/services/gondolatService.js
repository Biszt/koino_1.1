// backend/services/gondolatService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================

const GondolatRepository = require('../repositories/gondolatRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TudatpontService = require('./tudatpontService');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const ErtekSzamitasService = require('./ertekSzamitasService');
const ErtesitesService = require('./ertesitesService'); // Új gyerek-gondolatkor értesítjük a szülő figyelőit
const FajlKezeloService = require('./fajlKezeloService'); // Szöveg-módosításkor a kieső (lecserélt/törölt) fájlok törlése

// ===================================
// GONDOLAT SERVICE OSZTÁLY
// ===================================

// Ez a réteg tartalmazza az üzleti logikát
class GondolatService {

  // =====================================
  // ----- ÚJ GONDOLAT LÉTREHOZÁSA -----
  // =====================================

  /**
   * Új gondolat létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A gondolat adatai
   * @param {string} adatok.cim - A gondolat címe (kötelező)
   * @param {string} adatok.szoveg - A gondolat szövege (opcionális)
   * @param {string} adatok.gondolatTipusId - Gondolat típus ID (kötelező)
   * @param {Array} adatok.kategoriaIds - Kategória ID-k tömbje (opcionális, maximum 3)
   * @param {string} adatok.szuloId - Szülő gondolat ID (opcionális)
   * @param {number} adatok.javaslatElfogadasiKuszob - Érték javaslat elfogadási küszöb (51-100)
   * @param {number} adatok.reszveteliAranyKuszob - Részvételi arány küszöb (0-100)
   * @param {number} adatok.minimumDontesiIdo - Minimum döntési idő másodpercben (0-31536000)
   * @param {number} adatok.maximumDontesiIdo - Maximum döntési idő másodpercben (0-315360000)
   * @param {string} eemberId - A létrehozó eember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise} A létrehozott gondolat
   */
  async gondolatLetrehozasa(adatok, eemberId, kezdoTudatpont) {
    console.log("=================================== gondolatLetrehozasa: ", {
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
      throw new Error('Minimum 1 tudatpont szükséges a gondolat létrehozásához');
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

    // ===== 5. LÉPÉS - KATEGÓRIA ID-K VALIDÁLÁSA =====
    let validaltKategoriaIds = [];
    
    if (adatok.kategoriaIds && Array.isArray(adatok.kategoriaIds) && adatok.kategoriaIds.length > 0) {
      // 6.1 - Ellenőrizzük, hogy maximum 3 kategória van-e
      console.log("adatok.kategoriaIds: ", adatok.kategoriaIds);
      
      if (adatok.kategoriaIds.length > 3) {
        throw new Error('Maximum 3 kategória rendelhető egy gondolathoz');
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

        console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> KategoriaRepository.findById", {
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

    // ===== 7. LÉPÉS - GONDOLAT OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const gondolatAdatok = {
      cim: tisztitottCim,
      szoveg: tisztitottSzoveg,           // null vagy JSON tömb a szövegszerkesztőtől
      gondolatTipusId: adatok.gondolatTipusId || null,
      kategoriaIds: validaltKategoriaIds,
      szuloId: adatok.szuloId || null,
      szuloTipus: adatok.szuloTipus || null,
      // A létrehozó lesz az ELSŐ (és egyben eredeti) szerkesztő.
      // eredeti: true → övé a közvetlen szerkesztési jog; allapot: 'Tamogatja' → zöld név.
      szerkesztok: [
        { eemberId: eemberId, allapot: 'Tamogatja', eredeti: true }
      ],
    };


    // ===== 8. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====

    console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> GondolatRepository.create", {
          gondolatAdatok: gondolatAdatok
        });
    const ujGondolat = await GondolatRepository.create(gondolatAdatok);

    // ===== 9. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A gondolat létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese",);
      await TudatpontService.tudatpontHozzarendelese(
        eemberId,           // Ki adja a tudatpontot
        ujGondolat._id,          // Melyik entitásra (az új gondolat ID-ja)
        'Gondolat',              // Entitás típusa
        kezdoTudatpont           // Mennyi tudatpontot
      );
    } catch (error) {
      // ===== HIBAKEZELÉS - HA NINCS ELÉG TUDATPONT =====
      // Ha nem sikerült a tudatpont hozzárendelés, töröljük a gondolatot

      console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> GondolatRepository.deleteById", {
        ujGondolat: ujGondolat.id
      });
      await GondolatRepository.deleteById(ujGondolat._id);
      
      // Hibát dobunk a megfelelő üzenettel
      throw new Error(`Gondolat létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10. LÉPÉS - ÉRTÉK JAVASLAT LÉTREHOZÁSA =====
    // A létrehozó automatikusan érték javaslatot ad az általa megadott értékekre
    try {

      console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> ErtekJavaslatRepository.create", {
        gondolatId: ujGondolat._id,
        eemberId: eemberId,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      await ErtekJavaslatRepository.create({
        entitasId: ujGondolat._id,
        entitasTipus: 'Gondolat',
        eemberId: eemberId,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      
      console.log('Érték javaslat létrehozva létrehozónak');
    } catch (error) {
      // Ha nem sikerült, logoljuk de nem döntjük meg a gondolatot
      console.error('Érték javaslat létrehozási hiba:', error.message);
    }

    // ===== 11. LÉPÉS - HISZTOGRAM INICIALIZÁLÁSA =====
    // Létrehozzuk a kezdeti hisztogramot a létrehozó értékeivel
    try {

      console.log("gondolatLetrehozasa >>>>>>>>>>>>>>>>> ErtekSzamitasService.hisztogramLetrehozasa", {
        ujGondolat: ujGondolat._id,
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      });
      await ErtekSzamitasService.hisztogramLetrehozasa(
        ujGondolat._id,
        'Gondolat',
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo
      );
      
      console.log('Hisztogram inicializálva');
    } catch (error) {
      // Ha nem sikerült, logoljuk de nem döntjük meg a gondolatot
      console.error('Hisztogram inicializálási hiba:', error.message);
    }

    // ===== 11/b. LÉPÉS - A LÉTREHOZÓ AKTÍVVÁ TÉTELE =====
    // A létrehozó kezdő értékjavaslatot adott (a küszöbök beállítása) → döntés-alakító
    // tett, ezért AKTÍV szerepet kap az új gondolaton (bekerül a részvételi arány
    // nevezőjébe). Best-effort: a hibája nem döntheti meg a létrehozást.
    try {
      await TudatpontService.szerepAktivalasa(eemberId, ujGondolat._id, 'Gondolat');
    } catch (error) {
      console.error('A létrehozó aktívvá tétele sikertelen (nem blokkoló):', error.message);
    }

    // ===== 11.C - ÉRTESÍTÉS: ÚJ GYEREK ENTITÁS a szülőnek =====
    // Ha az új gondolat SZÜLŐ alá jött létre, a szülő FIGYELŐit értesítjük (a létrehozót
    // kihagyva). BEST-EFFORT: a küldés hibája nem érinti a létrehozást.
    if (ujGondolat.szuloId && ujGondolat.szuloTipus) {
      try {
        await ErtesitesService.ertesitesKuldes(
          ujGondolat.szuloId,
          ujGondolat.szuloTipus,
          'ujGyerekEntitas',
          { gyerekId: ujGondolat._id, gyerekTipus: 'Gondolat' },
          eemberId // a létrehozót NEM értesítjük magát
        );
      } catch (ertesitesHiba) {
        console.error('gondolatLetrehozasa - ujGyerekEntitas ertesites HIBA (nem blokkolo)', {
          hiba: ertesitesHiba.message
        });
      }
    }

    // ===== 12. LÉPÉS - LÉTREHOZOTT GONDOLAT VISSZAADÁSA =====
    console.log("<<<<<<<<<<<<<<<<<<<<<< gondolatLetrehozasa====ujGondolat: ", {
      ujGondolat: ujGondolat
    });
    return ujGondolat;
  }

  // =====================================
  // ----- GONDOLAT LEKÉRÉSE ID ALAPJÁN -----
  // =====================================

  /**
   * Egy gondolat lekérése jogosultság ellenőrzéssel
   * @param {string} id - A gondolat ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} A gondolat objektum
   */
  async gondolatLekerese(id, eemberId) {
    console.log("=================================== gondolatLekerese:: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A gondolat ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - gondolat lekérése

    console.log("gondolatLekerese >>>>>>>>>>>>>>>>>> GondolatRepository.findById", {
      id: id
    });
    
    const gondolat = await GondolatRepository.findById(id);

    // 3. LÉPÉS - Létezés ellenőrzése
    if (!gondolat) {
      throw new Error('A gondolat nem található');
    }

    console.log("<<<<<<<<<<<<<<<<< gondolatLekerese=====gondolat: ", {
      gondolat: gondolat
    });
    return gondolat;
  }

  // =====================================
  // ----- GONDOLATOK LISTÁZÁSA -----
  // =====================================

  /**
   * Gondolatok listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} Gondolatok tömb
   */
  async gondolatListazasa(szurok = {}, eemberId) {
    console.log("===================================  gondolatListazasa:: ", {
      szurok: szurok,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Repository hívás - gondolatok lekérése

    console.log("gondolatListazasa >>>>>>>>>>>>>>>>> GondolatRepository.findAll", { 
      szurok: szurok
    });
    
    const gondolatok = await GondolatRepository.findAll(szurok);

    // 2. LÉPÉS - Visszaadás (nincs láthatóság-szűrés – minden gondolat látható)
    console.log("<<<<<<<<<<<<<<<<<<<<< gondolatListazasa === gondolatok", {
      gondolatokSzama: gondolatok.length
    });
    return gondolatok;
  }

  // =====================================
  // ----- GONDOLAT ModositasA -----
  // =====================================

  /**
   * Egy gondolat módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A gondolat ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} eemberId - A módosítást végző eember ID-ja
   * @returns {Promise} A frissített gondolat
   */
  async gondolatModositasa(id, frissitesek, eemberId) {
    console.log("=================================== gondolatModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Gondolat létezésének ellenőrzése

    console.log("gondolatModositasa >>>>>>>>>>>>>>>>>>>>> GondolatRepository.findById", {
      id: id
    });
    
    const gondolat = await GondolatRepository.findById(id);
    
    if (!gondolat) {
      throw new Error('A gondolat nem található');
    }

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak az EREDETI létrehozó szerkesztheti közvetlenül a saját gondolatát.
    // (A szerkesztok tömbben ő az `eredeti: true` jelölésű elem; az eemberId
    //  populate-olva jön, ezért az ._id-t hasonlítjuk.)
    const eredetiSzerkeszto = (gondolat.szerkesztok || []).find(sz => sz.eredeti);
    const eredetiId = eredetiSzerkeszto?.eemberId?._id ?? eredetiSzerkeszto?.eemberId;
    if (!eredetiId || eredetiId.toString() !== eemberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a gondolatot');
    }

    // 3. LÉPÉS - Engedélyezett mezők szűrése
    // Csak bizonyos mezők módosíthatók
    const megengedettMezok = ['cim', 'szoveg', 'kategoriaIds'];
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

    // 6. LÉPÉS - KATEGÓRIA ID-K VALIDÁLÁSA (ha változik) - ÚJ!
    if (tisztitottFrissitesek.kategoriaIds !== undefined) {
      let validaltKategoriaIds = [];
      
      if (Array.isArray(tisztitottFrissitesek.kategoriaIds) && tisztitottFrissitesek.kategoriaIds.length > 0) {
        // 7.1 - Ellenőrizzük, hogy maximum 3 kategória van-e
        if (tisztitottFrissitesek.kategoriaIds.length > 3) {
          throw new Error('Maximum 3 kategória rendelhető egy gondolathoz');
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

    console.log("gondolatModositasa >>>>>>>>>>>>>>>>>>> GondolatRepository.updateById", {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });
    
    const frissitettGondolat = await GondolatRepository.updateById(id, tisztitottFrissitesek);

    console.log("<<<<<<<<<<<<<<<<<<<< gondolatModositasa====frissitettGondolat: ", {
      frissitettGondolat: frissitettGondolat
    });

    // 9. LÉPÉS - ELAVULT FÁJLOK TÖRLÉSE (ha a szöveg változott)
    // Ha a szerkesztésnél kép/csatolmány blokkot lecseréltek vagy töröltek,
    // a régi fájl árván maradna az uploads/ mappában. Összevetjük a RÉGI és
    // az ÚJ szöveg fájl-URL-jeit, és a kieső (már nem hivatkozott) fájlokat
    // töröljük a lemezről. Best-effort: hibát csak naplózunk, nem dobunk.
    if (tisztitottFrissitesek.szoveg !== undefined) {
      try {
        const regiUrlek = FajlKezeloService.entitasbolFajlUrlek(gondolat, 'Gondolat');
        const ujUrlek = FajlKezeloService.entitasbolFajlUrlek(frissitettGondolat, 'Gondolat');
        await FajlKezeloService.elavultFajlokTorlese(regiUrlek, ujUrlek);
      } catch (hiba) {
        console.warn('gondolatModositasa - Elavult fájlok törlése sikertelen', { id, hiba: hiba.message });
      }
    }

    return frissitettGondolat;
  }

  // =====================================
  // ----- GONDOLAT RÉSZLETES ADATAI TUDATPONTTAL -----
  // =====================================

  /**
   * Gondolat részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A gondolat ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} Gondolat + tudatpont adatok
   */
  async gondolatReszleteinekLekerese(id, eemberId) {
    console.log("=================================== gondolatReszleteinekLekerese: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Gondolat alapadatainak lekérése (jogosultság ellenőrzéssel)

    console.log("gondolatReszleteinekLekerese >>>>>>>>>>>>>>>>>>> this.gondolatLekerese");
    
    const gondolat = await this.gondolatLekerese(id, eemberId);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'Gondolat',
      eemberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása
    console.log("<<<<<<<<<<<<<<<<< gondolatReszleteinekLekerese====Eredmény:", {
      gondolat: gondolat,
      tudatpont: tudatpontAdatok
    });
    
    return {
      gondolat: gondolat,
      tudatpont: tudatpontAdatok
    };
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  //
  // A gondolatok NEM törölhetők direkt Service metódus híváson keresztül.
  //
  // Törlés csak automatikusan történik:
  //
  // AUTOMATIKUS Torles - Tudatpont nullázás
  // - Ha minden eember, vagy egy egyezmény visszavonja a tudatpontjait
  // - És az osszesPont 0-ra csökken
  // - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  // - Az entitás törlése: gondolatRepository.deleteById()
  //
  // A gondolatRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!

}

// Service exportálása
module.exports = new GondolatService();
