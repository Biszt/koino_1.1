// backend/services/kategoriaService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TudatpontService = require('./tudatpontService');

// ===================================
// KATEGÓRIA SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza az üzleti logikát
class KategoriaService {

  // =====================================
  // ----- ÚJ KATEGÓRIA LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új kategória létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A kategória adatai
   * @param {string} adatok.nev - A kategória neve (kötelező)
   * @param {string} adatok.leiras - A kategória leírása (opcionális)
   * @param {string} adatok.szin - A kategória színe (opcionális, alapértelmezett: #4a7c59)
   * @param {string} emberId - A létrehozó ember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise<Object>} A létrehozott kategória
   */
  async kategoriaLetrehozasa(adatok, emberId, kezdoTudatpont) {

    console.log("=================================== kategoriaLetrehozasa: ", {
      adatok: adatok,
      emberId: emberId,
      kezdoTudatpont: kezdoTudatpont
    });
    
    
    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    if (!adatok.nev || !adatok.nev.trim()) {
      throw new Error('A kategória neve kötelező');
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
      throw new Error('Minimum 1 tudatpont szükséges a kategória létrehozásához');
    }

    // Ellenőrizzük, hogy egész szám-e
    if (!Number.isInteger(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek egész számnak kell lennie');
    }

    // ===== 3. LÉPÉS - NÉV TISZTÍTÁSA (trim) =====
    const tisztitottNev = adatok.nev.trim();

    // ===== 4. LÉPÉS - NÉV EGYEDISÉG ELLENŐRZÉSE =====
    // ÜZLETI SZABÁLY: Egy kategória név csak egyszer használható

    console.log("kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> KategoriaRepository.findByNev", {
      tisztitottNev: tisztitottNev
    });
    
    const letezikE = await KategoriaRepository.findByNev(tisztitottNev);
    if (letezikE) {
      throw new Error('Ez a kategória név már létezik');
    }

    // ===== 5. LÉPÉS - LEÍRÁS TISZTÍTÁSA (trim) HA VAN =====
    const tisztitottLeiras = adatok.leiras ? adatok.leiras.trim() : '';

    // ===== 6. LÉPÉS - SZÍN VALIDÁLÁS =====
    let szin = adatok.szin || '#4a7c59'; // Alapértelmezett: erdőzöld
    
    // Szín formátum ellenőrzése (hexadecimális színkód)
    const szinRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!szinRegex.test(szin)) {
      throw new Error('Érvénytelen színkód formátum. Használj hexadecimális formátumot (#RRGGBB)');
    }

    // ===== 7. LÉPÉS - KATEGÓRIA OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const kategoriaAdatok = {
      nev: tisztitottNev,
      leiras: tisztitottLeiras,
      szin: szin,
      letrehozo: emberId
    };

    // ===== 8. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====

    console.log("kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> KategoriaRepository.create", {
      kategoriaAdatok: kategoriaAdatok
    });
    const ujKategoria = await KategoriaRepository.create(kategoriaAdatok);

    // ===== 9. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A kategória létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese",);
      await TudatpontService.tudatpontHozzarendelese(
        emberId,           // Ki adja a tudatpontot
        ujKategoria._id,         // Melyik entitásra (az új kategória ID-ja)
        'Kategoria',             // Entitás típusa
        kezdoTudatpont      // Mennyi tudatpontot
      );

    } catch (error) {
      // ===== HIBAKEZELÉS - HA NINCS ELÉG TUDATPONT =====
      // Ha nem sikerült a tudatpont hozzárendelés, töröljük a kategóriát
      await KategoriaRepository.deleteById(ujKategoria._id);
      
      // Hibát dobunk a megfelelő üzenettel
      throw new Error(`Kategória létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10. LÉPÉS - LÉTREHOZOTT KATEGÓRIA VISSZAADÁSA =====

    console.log("<<<<<<<<<<<<<<<<<<<<<<<< kategoriaLetrehozasa===ujKategoria: ", {
      ujKategoria: ujKategoria
    });
    
    return ujKategoria;
  }

  // =====================================
  // ----- KATEGÓRIA LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy kategória lekérése
   * @param {string} id - A kategória ID-ja
   * @returns {Promise<Object>} A kategória objektum
   */
  async kategoriaLekerese(id) {

    console.log("=================================== kategoriaLekerese:: ", {
      id: id
    });
    
    
    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A kategória ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - kategória lekérése

    console.log("kategoriaLekerese >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.findById", {
      id: id
    });
    const kategoria = await KategoriaRepository.findById(id);

    // 3. LÉPÉS - Létezés ellenőrzése
    if (!kategoria) {
      throw new Error('A kategória nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<< kategoriaLekerese====kategoria: ", {
      kategoria: kategoria
    });
    

    return kategoria;
  }

  // =====================================
  // ----- KATEGÓRIÁK LISTÁZÁSA -----
  // =====================================
  /**
   * Kategóriák listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} szurok.letrehozo - Létrehozó ember ID
   * @param {string} szurok.nev - Név szerinti keresés
   * @returns {Promise<Array>} Kategóriák tömb
   */
  async kategoriaListazasa(szurok = {}) {

    console.log("=================================== kategoriaListazasa:: ",{
      szurok: szurok
    } );
    
    
    // Repository hívás - kategóriák lekérése szűrőkkel

    console.log("kategoriaListazasa >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.findAll", {
      szurok: szurok
    });
    const kategoriak = await KategoriaRepository.findAll(szurok);

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< kategoriaListazasa===kategoriak: ", {
      kategoriak: kategoriak
    });
    
    
    return kategoriak;
  }

  // =====================================
  // ----- KATEGÓRIA ModositasA -----
  // =====================================
  /**
   * Egy kategória módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A kategória ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} emberId - A módosítást végző ember ID-ja
   * @returns {Promise<Object>} A frissített kategória
   */
  async kategoriaModositasa(id, frissitesek, emberId) {

    console.log("=================================== kategoriaModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      emberId: emberId
    });
    
    
    // 1. LÉPÉS - Kategória létezésének ellenőrzése
    
    console.log("kategoriaModositasa >>>>>>>>>>>>>>>>>>>>>>> this.kategoriaLekerese",);
    const kategoria = await this.kategoriaLekerese(id);

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak a létrehozó módosíthatja a saját kategóriáját
    if (kategoria.letrehozo._id.toString() !== emberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a kategóriát');
    }

    // 3. LÉPÉS - Engedélyezett mezők szűrése
    // Csak bizonyos mezők módosíthatók
    const megengedettMezok = ['nev', 'leiras', 'szin'];
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
        throw new Error('A kategória neve nem lehet üres');
      }

      // Ellenőrizzük, hogy a név nem foglalt-e már (kivéve saját magát)
      const letezikE = await KategoriaRepository.findByNev(tisztitottNev);
      if (letezikE && letezikE._id.toString() !== id.toString()) {
        throw new Error('Ez a kategória név már létezik');
      }

      tisztitottFrissitesek.nev = tisztitottNev;
    }

    // 5. LÉPÉS - Leírás tisztítása (ha van)
    if (tisztitottFrissitesek.leiras) {
      tisztitottFrissitesek.leiras = tisztitottFrissitesek.leiras.trim();
    }

    // 6. LÉPÉS - Szín validálás (ha változik)
    if (tisztitottFrissitesek.szin) {
      const szinRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!szinRegex.test(tisztitottFrissitesek.szin)) {
        throw new Error('Érvénytelen színkód formátum. Használj hexadecimális formátumot (#RRGGBB)');
      }
    }

    // 7. LÉPÉS - Repository hívás - frissítés
    console.log("kategoriaModositasa >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.updateById", {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });
    const frissitettKategoria = await KategoriaRepository.updateById(id, tisztitottFrissitesek);

    console.log("<<<<<<<<<<<<<<<<<<<<< kategoriaModositasa====frissitettKategoria: ", {
      frissitettKategoria: frissitettKategoria
    });
    

    return frissitettKategoria;
  }

  // =====================================
  // ----- KATEGÓRIA RÉSZLETES ADATAI TUDATPONTTAL -----
  // =====================================
  /**
   * Kategória részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A kategória ID-ja
   * @param {string} emberId - A lekérést végző ember ID-ja
   * @returns {Promise<Object>} Kategória + tudatpont adatok
   */
  async kategoriaReszleteinekLekerese(id, emberId) {

    console.log("=================================== kategoriaReszleteinekLekerese:: ", {
      id: id,
      emberId: emberId
    });
    
    
    // 1. LÉPÉS - Kategória alapadatainak lekérése

    console.log("kategoriaReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>>>> this.kategoriaLekereseKategoriaRepository.updateById",);
    const kategoria = await this.kategoriaLekerese(id);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'Kategoria',
      emberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<< kategoriaReszleteinekLekerese====Eredmény:", {
      kategoria: kategoria,
      tudatpont: tudatpontAdatok
    });
    
    return {
      kategoria: kategoria,
      tudatpont: tudatpontAdatok
    };
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  // 
  // A kategóriák NEM törölhetők direkt Service metódus híváson keresztül.
  // 
  // Törlés csak automatikusan történik:
  // 
  // 1. AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden ember visszavonja a tudatpontjait
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  //    - Az entitás törlése: kategoriaRepository.deleteById()
  //
  // 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
  //    - Törlési javaslat indítása (külön endpoint)
  //    - Közösségi szavazás
  //    - Hatályba lépési idő után automatikus törlés
  //    - Tudatpontok automatikus visszautalása a hozzájárulóknek
  //    - Törlés végrehajtása: kategoriaRepository.deleteById()
  //    - (Külön javaslatService.js vagy kozossegService.js fogja kezelni)
  //
  // A kategoriaRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!
}

// Service exportálása
module.exports = new KategoriaService();
