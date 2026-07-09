// backend/services/tartalomTipusService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const TartalomTipusRepository = require('../repositories/tartalomTipusRepository');
const TudatpontService = require('./tudatpontService');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const ErtekSzamitasService = require('./ertekSzamitasService');
const { kuszobertekekParse } = require('../utils/kuszobErtekParser');

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
   * @param {string} adatok.szuloId - A szülő entitás ID-ja (opcionális)
   * @param {string} adatok.szuloTipus - A szülő entitás típusa (opcionális)
   * @param {string} eemberId - A létrehozó eember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise<Object>} A létrehozott tartalom típus
   */
  async tartalomTipusLetrehozasa(adatok, eemberId, kezdoTudatpont) {

    console.log("=================================== tartalomTipusLetrehozasa:: ", {
      adatok: adatok,
      eemberId: eemberId,
      kezdoTudatpont: kezdoTudatpont
    });

    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    // Név ellenőrzése - kötelező mező
    if (!adatok.nev || !adatok.nev.trim()) {
      throw new Error('A tartalom típus neve kötelező');
    }

    // Ikon ellenőrzése - kötelező mező
    if (!adatok.ikon || !adatok.ikon.trim()) {
      throw new Error('Az ikon megadása kötelező');
    }

    // Létrehozó eember ellenőrzése
    if (!eemberId) {
      throw new Error('A létrehozó eember azonosítása szükséges');
    }

    // ===== 2. LÉPÉS - INICIALIS TUDATPONT VALIDÁLÁSA =====
    // Szám típus ellenőrzése
    if (typeof kezdoTudatpont !== 'number' || isNaN(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek számnak kell lennie');
    }

    // Minimum 1 tudatpont ellenőrzése
    if (kezdoTudatpont < 1) {
      throw new Error('Minimum 1 tudatpont szükséges a tartalom típus létrehozásához');
    }

    // Egész szám ellenőrzése
    if (!Number.isInteger(kezdoTudatpont)) {
      throw new Error('Az kezdoTudatpont értéknek egész számnak kell lennie');
    }

    // ===== 3. LÉPÉS - SZÜLŐ VALIDÁLÁSA (HA MEG VAN ADVA) =====
    // Ha szuloId érkezik, szuloTipus is kötelező - és fordítva
    if (adatok.szuloId && !adatok.szuloTipus) {
      throw new Error('Ha szuloId meg van adva, a szuloTipus megadása is kötelező');
    }

    if (adatok.szuloTipus && !adatok.szuloId) {
      throw new Error('Ha szuloTipus meg van adva, a szuloId megadása is kötelező');
    }

    // ===== 4. LÉPÉS - NÉV TISZTÍTÁSA (trim) =====
    const tisztitottNev = adatok.nev.trim();

    // ===== 5. LÉPÉS - NÉV EGYEDISÉG ELLENŐRZÉSE =====
    // ÜZLETI SZABÁLY: Egy tartalom típus név csak egyszer használható
    console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TartalomTipusRepository.findByNev", {
      tisztitottNev: tisztitottNev
    });

    const letezikE = await TartalomTipusRepository.findByNev(tisztitottNev);
    if (letezikE) {
      throw new Error('Ez a tartalom típus név már létezik');
    }

    // ===== 6. LÉPÉS - LEÍRÁS KEZELÉSE HA VAN =====
    // MÓDOSÍTVA: Mixed típus - nem hívunk trim()-et, JSON tömböt fogad a szövegszerkesztőtől
    // Ha nincs megadva, null marad (üres string helyett)
    const tisztitottLeiras = adatok.leiras !== undefined ? adatok.leiras : null;

    // ===== 7. LÉPÉS - IKON ÚTVONAL TISZTÍTÁSA =====
    const tisztitottIkon = adatok.ikon.trim();

    // ===== 8. LÉPÉS - TARTALOM TÍPUS OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const tartalomTipusAdatok = {
      nev:        tisztitottNev,
      leiras:     tisztitottLeiras,          // null vagy JSON tömb a szövegszerkesztőtől
      ikon:       tisztitottIkon,
      szuloId:    adatok.szuloId    || null,
      szuloTipus: adatok.szuloTipus || null,
      letrehozo:  eemberId
    };

    // ===== 9. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====
    console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TartalomTipusRepository.create", {
      tartalomTipusAdatok: tartalomTipusAdatok
    });

    const ujTartalomTipus = await TartalomTipusRepository.create(tartalomTipusAdatok);

    // ===== 10. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A tartalom típus létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese");
      await TudatpontService.tudatpontHozzarendelese(
        eemberId,            // Ki adja a tudatpontot
        ujTartalomTipus._id, // Melyik entitásra (az új tartalom típus ID-ja)
        'TartalomTipus',     // Entitás típusa
        kezdoTudatpont       // Mennyi tudatpontot
      );

    } catch (error) {
      // Ha a tudatpont hozzárendelés sikertelen, töröljük a tartalom típust is
      console.log("tartalomTipusLetrehozasa >>>>>>>>>>>>>>>>>>>> TartalomTipusRepository.deleteById", {
        ujTartalomTipus: ujTartalomTipus.id
      });

      await TartalomTipusRepository.deleteById(ujTartalomTipus._id);
      throw new Error(`Tartalom típus létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10.5 LÉPÉS - KÜSZÖBÉRTÉKEK INICIALIZÁLÁSA =====
    // A létrehozó automatikusan érték javaslatot ad az általa megadott (vagy
    // alapértelmezett) küszöbértékekre, és létrejön a kezdeti hisztogram.
    const kuszobErtekek = kuszobertekekParse(adatok);
    try {
      await ErtekJavaslatRepository.create({
        entitasId:    ujTartalomTipus._id,
        entitasTipus: 'TartalomTipus',
        eemberId:     eemberId,
        ...kuszobErtekek
      });
      await ErtekSzamitasService.hisztogramLetrehozasa(
        ujTartalomTipus._id,
        'TartalomTipus',
        kuszobErtekek.javaslatElfogadasiKuszob,
        kuszobErtekek.reszveteliAranyKuszob,
        kuszobErtekek.minimumDontesiIdo,
        kuszobErtekek.maximumDontesiIdo
      );
      console.log('Tartalomtípus küszöbérték-hisztogram inicializálva');
    } catch (error) {
      // Nem kritikus: logoljuk, de nem döntjük meg a tartalomtípust
      console.error('Tartalomtípus küszöbérték inicializálási hiba:', error.message);
    }

    // ===== 11. LÉPÉS - LÉTREHOZOTT TARTALOM TÍPUS VISSZAADÁSA =====
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

    console.log("=================================== tartalomTipusLekerese:: ", { id: id });

    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A tartalom típus ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - tartalom típus lekérése
    console.log("tartalomTipusLekerese >>>>>>>>>>>>>>>>>> TartalomTipusRepository.findById", { id: id });

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
   * @param {string} szurok.letrehozo - Létrehozó eember ID
   * @param {string} szurok.nev - Név szerinti keresés
   * @param {string} szurok.szuloId - Szülő ID szerinti szűrés (opcionális)
   * @param {string} szurok.szuloTipus - Szülő típus szerinti szűrés (opcionális)
   * @returns {Promise<Array>} Tartalom típusok tömb
   */
  async tartalomTipusListazasa(szurok = {}) {

    console.log("=================================== tartalomTipusListazasa: ", { szurok: szurok });

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
  // ----- TARTALOM TÍPUS MÓDOSÍTÁSA -----
  // =====================================
  /**
   * Egy tartalom típus módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A tartalom típus ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} eemberId - A módosítást végző eember ID-ja
   * @returns {Promise<Object>} A frissített tartalom típus
   */
  async tartalomTipusModositasa(id, frissitesek, eemberId) {

    console.log("=================================== tartalomTipusModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Tartalom típus létezésének ellenőrzése
    console.log("tartalomTipusModositasa >>>>>>>>>>>>>>>>>>>> this.tartalomTipusLekerese");

    const tartalomTipus = await this.tartalomTipusLekerese(id);

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak a létrehozó módosíthatja a saját tartalom típusát
    if (tartalomTipus.letrehozo._id.toString() !== eemberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a tartalom típust');
    }

    // 3. LÉPÉS - ENGEDÉLYEZETT MEZŐK SZŰRÉSE
    // VÁLTOZÁS: szuloId és szuloTipus is módosítható mezők lettek
    const megengedettMezok = ['nev', 'leiras', 'ikon', 'szuloId', 'szuloTipus'];
    const tisztitottFrissitesek = {};

    for (const mezo of megengedettMezok) {
      if (frissitesek.hasOwnProperty(mezo)) {
        tisztitottFrissitesek[mezo] = frissitesek[mezo];
      }
    }

    // 4. LÉPÉS - SZÜLŐ KONZISZTENCIA ELLENŐRZÉSE (HA VÁLTOZIK)
    // Ha az egyik megvan a kérésben, a másiknak is meg kell lennie
    const szuloIdValtozik = tisztitottFrissitesek.hasOwnProperty('szuloId');
    const szuloTipusValtozik = tisztitottFrissitesek.hasOwnProperty('szuloTipus');

    if (szuloIdValtozik && !szuloTipusValtozik) {
      throw new Error('Ha szuloId módosítása történik, a szuloTipus megadása is kötelező');
    }

    if (szuloTipusValtozik && !szuloIdValtozik) {
      throw new Error('Ha szuloTipus módosítása történik, a szuloId megadása is kötelező');
    }

    // Ha mindkettő null-ra van állítva, az rendben van (gyökér elemre visszaállítás)
    if (szuloIdValtozik && szuloTipusValtozik) {
      const szuloIdNull = !tisztitottFrissitesek.szuloId;
      const szuloTipusNull = !tisztitottFrissitesek.szuloTipus;

      // Ha az egyik null és a másik nem - inkonzisztens állapot
      if (szuloIdNull !== szuloTipusNull) {
        throw new Error('A szuloId és szuloTipus egyszerre kell null legyen, vagy egyszerre kell értéket tartalmazzon');
      }
    }

    // 5. LÉPÉS - Név validálás és egyediség ellenőrzése (ha változik)
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

    // 6. LÉPÉS - LEÍRÁS KEZELÉSE (ha változik)
    if (tisztitottFrissitesek.leiras !== undefined) {
    }

    // 7. LÉPÉS - Ikon útvonal tisztítása (ha változik)
    if (tisztitottFrissitesek.ikon) {
      const tisztitottIkon = tisztitottFrissitesek.ikon.trim();

      if (!tisztitottIkon) {
        throw new Error('Az ikon útvonala nem lehet üres');
      }

      tisztitottFrissitesek.ikon = tisztitottIkon;
    }

    // 8. LÉPÉS - Repository hívás - frissítés
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
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise<Object>} Tartalom típus + tudatpont adatok
   */
  async tartalomTipusReszleteinekLekerese(id, eemberId) {

    console.log("=================================== tartalomTipusReszleteinekLekerese:: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Tartalom típus alapadatainak lekérése
    console.log("tartalomTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> this.tartalomTipusLekerese");

    const tartalomTipus = await this.tartalomTipusLekerese(id);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    console.log("tartalomTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> TudatpontService.entitasAllokaciLekerese");

    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'TartalomTipus',
      eemberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása
    console.log("<<<<<<<<<<<<<<<<< tartalomTipusReszleteinekLekerese====Eredmény:", {
      tartalomTipus: tartalomTipus,
      tudatpont:     tudatpontAdatok
    });

    return {
      tartalomTipus: tartalomTipus,
      tudatpont:     tudatpontAdatok
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
  //    - Ha minden eember visszavonja a tudatpontjait
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