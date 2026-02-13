// backend/services/tartalomTipusService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const TartalomTipusRepository = require('../repositories/tartalomTipusRepository');
const TudatpontService = require('./tudatpontService');

// ===================================
// TARTALOM TÍPUS SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza az üzleti logikát
class TartalomTipusService {

  // =====================================
  // ----- ÚJ TARTALOM TÍPUS LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új tartalom típus létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A tartalom típus adatai
   * @param {string} adatok.nev - A tartalom típus neve (kötelező)
   * @param {string} adatok.leiras - A tartalom típus leírása (opcionális)
   * @param {string} adatok.ikon - Az ikon fájl útvonala (kötelező)
   * @param {string} emberId - A létrehozó ember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise<Object>} A létrehozott tartalom típus
   */
  async tartalomTipusLetrehozasa(adatok, emberId, kezdoTudatpont) {

    console.log("=================================== tartalomTipusLetrehozasa:: ", {
      adatok: adatok,
      emberId: emberId,
      kezdoTudatpont: kezdoTudatpont
    });
    
    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    if (!adatok.nev || !adatok.nev.trim()) {
      throw new Error('A tartalom típus neve kötelező');
    }

    if (!adatok.ikon || !adatok.ikon.trim()) {
      throw new Error('Az ikon megadása kötelező');
    }

    if (!emberId) {
      throw new Error('A létrehozó ember azonosítása szükséges');
    }

    // ===== 2. LÉPÉS - INICIALIS TUDATPONT VALIDÁLÁSA =====
    // Ellenőrizzük, hogy szám-e
    if (typeof kezdoTudatpont !== 'number' || isNaN(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek számnak kell lennie');
    }

    // Ellenőrizzük, hogy legalább 1
    if (kezdoTudatpont < 1) {
      throw new Error('Minimum 1 tudatpont szükséges a tartalom típus létrehozásához');
    }

    // Ellenőrizzük, hogy egész szám-e
    if (!Number.isInteger(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek egész számnak kell lennie');
    }

    // ===== 3. LÉPÉS - NÉV TISZTÍTÁSA (trim) =====
    const tisztitottNev = adatok.nev.trim();

    // ===== 4. LÉPÉS - NÉV EGYEDISÉG ELLENŐRZÉSE =====
    // ÜZLETI SZABÁLY: Egy tartalom típus név csak egyszer használható

    console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TartalomTipusRepository.findByNev", {
      tisztitottNev: tisztitottNev
    });
    
    const letezikE = await TartalomTipusRepository.findByNev(tisztitottNev);
    if (letezikE) {
      throw new Error('Ez a tartalom típus név már létezik');
    }

    // ===== 5. LÉPÉS - LEÍRÁS TISZTÍTÁSA (trim) HA VAN =====
    const tisztitottLeiras = adatok.leiras ? adatok.leiras.trim() : '';

    // ===== 6. LÉPÉS - IKON ÚTVONAL TISZTÍTÁSA =====
    const tisztitottIkon = adatok.ikon.trim();

    // ===== 7. LÉPÉS - TARTALOM TÍPUS OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const tartalomTipusAdatok = {
      nev: tisztitottNev,
      leiras: tisztitottLeiras,
      ikon: tisztitottIkon,
      letrehozo: emberId
    };

    // ===== 8. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====

    console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TartalomTipusRepository.create", {
      tartalomTipusAdatok: tartalomTipusAdatok
    });
    const ujTartalomTipus = await TartalomTipusRepository.create(tartalomTipusAdatok);

    // ===== 9. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A tartalom típus létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese");
      await TudatpontService.tudatpontHozzarendelese(
        emberId,              // Ki adja a tudatpontot
        ujTartalomTipus._id,        // Melyik entitásra (az új tartalom típus ID-ja)
        'TartalomTipus',            // Entitás típusa
        kezdoTudatpont         // Mennyi tudatpontot
      );

    } catch (error) {
      // ===== HIBAKEZELÉS - HA NINCS ELÉG TUDATPONT =====
      // Ha nem sikerült a tudatpont hozzárendelés, töröljük a tartalom típust

      console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>>>>>> TartalomTipusRepository.deleteById", {
        ujTartalomTipus: ujTartalomTipus.id
      });
      
      await TartalomTipusRepository.deleteById(ujTartalomTipus._id);
      
      // Hibát dobunk a megfelelő üzenettel
      throw new Error(`Tartalom típus létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10. LÉPÉS - LÉTREHOZOTT TARTALOM TÍPUS VISSZAADÁSA =====

    console.log("<<<<<<<<<<<<<<< tartalomTipusLetrehozasa====ujTartalomTipus: ", {
      ujTartalomTipus: ujTartalomTipus
    });
    
    return ujTartalomTipus;
  }

  // =====================================
  // ----- TARTALOM TÍPUS LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy tartalom típus lekérése
   * @param {string} id - A tartalom típus ID-ja
   * @returns {Promise<Object>} A tartalom típus objektum
   */
  async tartalomTipusLekerese(id) {

    console.log("=================================== tartalomTipusLekerese:: ", {
      id: id
    });
    
    
    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A tartalom típus ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - tartalom típus lekérése

    console.log("tartalomTipusLekerese >>>>>>>>>>>>>>>>>> TartalomTipusRepository.findById", {
      id: id
    });
    
    const tartalomTipus = await TartalomTipusRepository.findById(id);

    // 3. LÉPÉS - Létezés ellenőrzése
    if (!tartalomTipus) {
      throw new Error('A tartalom típus nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<<<< tartalomTipusLekerese===tartalomTipus: ", {
      tartalomTipus: tartalomTipus
    });
    

    return tartalomTipus;
  }

  // =====================================
  // ----- TARTALOM TÍPUSOK LISTÁZÁSA -----
  // =====================================
  /**
   * Tartalom típusok listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} szurok.letrehozo - Létrehozó ember ID
   * @param {string} szurok.nev - Név szerinti keresés
   * @returns {Promise<Array>} Tartalom típusok tömb
   */
  async tartalomTipusListazasa(szurok = {}) {

    console.log("=================================== tartalomTipusListazasa: ", {
      szurok: szurok
    });
    
    
    // Repository hívás - tartalom típusok lekérése szűrőkkel

    console.log("tartalomTipusListazasa >>>>>>>>>>>>>>>>>> TartalomTipusRepository.findAll", {
      szurok: szurok
    });
    
    const tartalomTipusok = await TartalomTipusRepository.findAll(szurok);

    console.log("<<<<<<<<<<<<<<<<<<<<<tartalomTipusListazasa====tartalomTipusok: ", {
      tartalomTipusok
    });
    
    
    return tartalomTipusok;
  }

  // =====================================
  // ----- TARTALOM TÍPUS ModositasA -----
  // =====================================
  /**
   * Egy tartalom típus módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A tartalom típus ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} emberId - A módosítást végző ember ID-ja
   * @returns {Promise<Object>} A frissített tartalom típus
   */
  async tartalomTipusModositasa(id, frissitesek, emberId) {

    console.log("=================================== tartalomTipusModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      emberId: emberId
    });
    
    
    // 1. LÉPÉS - Tartalom típus létezésének ellenőrzése

    console.log("tartalomTipusModositasa >>>>>>>>>>>>>>>>>>>> this.tartalomTipusLekerese");
    
    const tartalomTipus = await this.tartalomTipusLekerese(id);

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak a létrehozó módosíthatja a saját tartalom típusát
    if (tartalomTipus.letrehozo._id.toString() !== emberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a tartalom típust');
    }

    // 3. LÉPÉS - Engedélyezett mezők szűrése
    // Csak bizonyos mezők módosíthatók
    const megengedettMezok = ['nev', 'leiras', 'ikon'];
    const tisztitottFrissitesek = {};

    for (const mezo of megengedettMezok) {
      if (frissitesek.hasOwnProperty(mezo)) {
        tisztitottFrissitesek[mezo] = frissitesek[mezo];
      }
    }

    // 4. LÉPÉS - Név validálás és egyediség ellenőrzése (ha változik)
    if (tisztitottFrissitesek.nev) {
      const tisztitottNev = tisztitottFrissitesek.nev.trim();
      
      if (!tisztitottNev) {
        throw new Error('A tartalom típus neve nem lehet üres');
      }

      // Ellenőrizzük, hogy a név nem foglalt-e már (kivéve saját magát)
      const letezikE = await TartalomTipusRepository.findByNev(tisztitottNev);
      if (letezikE && letezikE._id.toString() !== id.toString()) {
        throw new Error('Ez a tartalom típus név már létezik');
      }

      tisztitottFrissitesek.nev = tisztitottNev;
    }

    // 5. LÉPÉS - Leírás tisztítása (ha van)
    if (tisztitottFrissitesek.leiras !== undefined) {
      tisztitottFrissitesek.leiras = tisztitottFrissitesek.leiras.trim();
    }

    // 6. LÉPÉS - Ikon útvonal tisztítása (ha változik)
    if (tisztitottFrissitesek.ikon) {
      const tisztitottIkon = tisztitottFrissitesek.ikon.trim();
      
      if (!tisztitottIkon) {
        throw new Error('Az ikon útvonala nem lehet üres');
      }

      tisztitottFrissitesek.ikon = tisztitottIkon;
    }

    // 7. LÉPÉS - Repository hívás - frissítés

    console.log("tartalomTipusModositasa >>>>>>>>>>>>>>>>>>>> TartalomTipusRepository.updateById", {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });
    const frissitettTartalomTipus = await TartalomTipusRepository.updateById(id, tisztitottFrissitesek);

    console.log("<<<<<<<<<<<<<<<<<<<<<<tartalomTipusModositasa===frissitettTartalomTipus: ", {
      frissitettTartalomTipus
    });
    

    return frissitettTartalomTipus;
  }

  // =====================================
  // ----- TARTALOM TÍPUS RÉSZLETES ADATAI TUDATPONTTAL -----
  // =====================================
  /**
   * Tartalom típus részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A tartalom típus ID-ja
   * @param {string} emberId - A lekérést végző ember ID-ja
   * @returns {Promise<Object>} Tartalom típus + tudatpont adatok
   */
  async tartalomTipusReszleteinekLekerese(id, emberId) {

    console.log("=================================== tartalomTipusReszleteinekLekerese:: ", {
      id: id,
      emberId: emberId
    });
    
    
    // 1. LÉPÉS - Tartalom típus alapadatainak lekérése

    console.log("tartalomTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> this.tartalomTipusLekerese");
    
    const tartalomTipus = await this.tartalomTipusLekerese(id);

    // 2. LÉPÉS - Tudatpont allokáció lekérése

    console.log("tartalomTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> TudatpontService.entitasAllokaciLekerese");
    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'TartalomTipus',
      emberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása

    console.log("<<<<<<<<<<<<<<<<< tartalomTipusReszleteinekLekerese====Eredmény:", {
      tartalomTipus: tartalomTipus,
      tudatpont: tudatpontAdatok
    });
    
    return {
      tartalomTipus: tartalomTipus,
      tudatpont: tudatpontAdatok
    };
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A tartalom típusok NEM törölhetők direkt Service metódus híváson keresztül.
  // 
  // Törlés csak automatikusan történik:
  // 
  // 1. AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden ember visszavonja a tudatpontjait
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  //    - Az entitás törlése: tartalomTipusRepository.deleteById()
  //
  // 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
  //    - Törlési javaslat indítása (külön endpoint)
  //    - Közösségi szavazás
  //    - Hatályba lépési idő után automatikus törlés
  //    - Tudatpontok automatikus visszautalása a hozzájárulóknek
  //    - Törlés végrehajtása: tartalomTipusRepository.deleteById()
  //    - (Külön javaslatService.js vagy kozossegService.js fogja kezelni)
  //
  // A tartalomTipusRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!
}

// Service exportálása
module.exports = new TartalomTipusService();
