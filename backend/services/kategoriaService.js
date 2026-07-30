// backend/services/kategoriaService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TudatpontService = require('./tudatpontService');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const ErtekSzamitasService = require('./ertekSzamitasService');
const { kuszobertekekParse } = require('../utils/kuszobErtekParser');
const { leirasParse } = require('../utils/leirasParser');
const FajlKezeloService = require('./fajlKezeloService'); // Ikon-cserekor a régi ikon-fájl törlése

// ===================================
// KATEGÓRIA SERVICE OSZTÁLY
// ===================================
class KategoriaService {

  // =====================================
  // ----- SZÜLŐ-KATEGÓRIA ELLENŐRZÉSE (DOMAIN-SZABÁLY) -----
  // =====================================
  /**
   * Kikényszeríti a domain-szabályt: egy kategória szülője CSAK MÁSIK,
   * LÉTEZŐ kategória lehet. Csak akkor hívjuk, ha van szülő (szuloId).
   * A modell enumja is szűkítve van (Kategoria/null) — ez a service-szintű,
   * érthető hibaüzenetet adó, defenzív ellenőrzés.
   * @param {string} szuloId    - A megadott szülő azonosítója
   * @param {string} szuloTipus - A megadott szülő típusa
   */
  async _szuloKategoriaEllenorzese(szuloId, szuloTipus) {
    console.log('KategoriaService._szuloKategoriaEllenorzese - KEZDÉS', { szuloId, szuloTipus });

    // 1. Típus: csak Kategoria lehet a szülő
    if (szuloTipus !== 'Kategoria') {
      throw new Error('Egy kategória szülője csak másik kategória lehet');
    }

    // 2. Létezés: a megadott szülő kategóriának léteznie kell
    const szuloKategoria = await KategoriaRepository.findById(szuloId);
    if (!szuloKategoria) {
      throw new Error('A megadott szülő kategória nem található');
    }

    console.log('KategoriaService._szuloKategoriaEllenorzese - VÉGE (OK)');
  }

  // =====================================
  // ----- ÚJ KATEGÓRIA LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új kategória létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A kategória adatai
   * @param {string} adatok.nev - A kategória neve (kötelező)
   * @param {string} adatok.leiras - A kategória leírása (opcionális)
   * @param {string} adatok.ikon - Az ikon fájl útvonala (kötelező)
   * @param {string} adatok.szuloId - A szülő entitás ID-ja (opcionális)
   * @param {string} adatok.szuloTipus - A szülő entitás típusa (opcionális)
   * @param {string} eemberId - A létrehozó eember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise} A létrehozott kategória
   */
  async kategoriaLetrehozasa(adatok, eemberId, kezdoTudatpont) {

    console.log('=================================== kategoriaLetrehozasa: ', {
      adatok: adatok,
      eemberId: eemberId,
      kezdoTudatpont: kezdoTudatpont
    });

    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    // Név ellenőrzése - kötelező mező
    if (!adatok.nev || !adatok.nev.trim()) {
      throw new Error('A kategória neve kötelező');
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
      throw new Error('Minimum 1 tudatpont szükséges a kategória létrehozásához');
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

    // DOMAIN-SZABÁLY: ha van szülő, az csak egy létező Kategoria lehet.
    if (adatok.szuloId) {
      await this._szuloKategoriaEllenorzese(adatok.szuloId, adatok.szuloTipus);
    }

    // ===== 4. LÉPÉS - NÉV TISZTÍTÁSA (trim) =====
    const tisztitottNev = adatok.nev.trim();

    // ===== 5. LÉPÉS - NÉV EGYEDISÉG ELLENŐRZÉSE =====
    console.log('kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> KategoriaRepository.findByNev', {
      tisztitottNev: tisztitottNev
    });

    const letezikE = await KategoriaRepository.findByNev(tisztitottNev);
    if (letezikE) {
      throw new Error('Ez a kategória név már létezik');
    }

    // ===== 6. LÉPÉS - LEÍRÁS KEZELÉSE HA VAN =====
    // A leiras a FormData-ból JSON-stringként érkezik (blokk-tömb) → tömbbé parse-oljuk,
    // hogy a Mixed mezőben tömbként tárolódjon (mint a Tartalom szoveg-e).
    const tisztitottLeiras = leirasParse(adatok.leiras);

    // ===== 7. LÉPÉS - IKON ÚTVONAL TISZTÍTÁSA =====
    const tisztitottIkon = adatok.ikon.trim();

    // ===== 8. LÉPÉS - KATEGÓRIA OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const kategoriaAdatok = {
      nev:        tisztitottNev,
      leiras:     tisztitottLeiras,          // null vagy JSON tömb a szövegszerkesztőtől
      ikon:       tisztitottIkon,
      szuloId:    adatok.szuloId   || null,
      szuloTipus: adatok.szuloTipus || null,
      letrehozo:  eemberId
    };

    // ===== 9. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====
    console.log('kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> KategoriaRepository.create', {
      kategoriaAdatok: kategoriaAdatok
    });

    const ujKategoria = await KategoriaRepository.create(kategoriaAdatok);

    // ===== 10. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    try {

      console.log('kategoriaLetrehozasa >>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese');
      await TudatpontService.tudatpontHozzarendelese(
        eemberId,        // Ki adja a tudatpontot
        ujKategoria._id, // Melyik entitásra (az új kategória ID-ja)
        'Kategoria',     // Entitás típusa
        kezdoTudatpont   // Mennyi tudatpontot
      );

    } catch (error) {
      // Ha a tudatpont hozzárendelés sikertelen, töröljük a kategóriát is
      await KategoriaRepository.deleteById(ujKategoria._id);
      throw new Error(`Kategória létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10.5 LÉPÉS - KÜSZÖBÉRTÉKEK INICIALIZÁLÁSA =====
    // A létrehozó automatikusan érték javaslatot ad az általa megadott (vagy
    // alapértelmezett) küszöbértékekre, és létrejön a kezdeti hisztogram.
    // Az értékek multipart mezőkből érkeznek (string), ezért parseInt kell.
    const kuszobErtekek = kuszobertekekParse(adatok);
    try {
      await ErtekJavaslatRepository.create({
        entitasId:    ujKategoria._id,
        entitasTipus: 'Kategoria',
        eemberId:     eemberId,
        ...kuszobErtekek
      });
      await ErtekSzamitasService.hisztogramLetrehozasa(
        ujKategoria._id,
        'Kategoria',
        kuszobErtekek.javaslatElfogadasiKuszob,
        kuszobErtekek.reszveteliAranyKuszob,
        kuszobErtekek.minimumDontesiIdo,
        kuszobErtekek.maximumDontesiIdo
      );
      console.log('Kategória küszöbérték-hisztogram inicializálva');
    } catch (error) {
      // Nem kritikus: logoljuk, de nem döntjük meg a kategóriát
      console.error('Kategória küszöbérték inicializálási hiba:', error.message);
    }

    // ===== 11. LÉPÉS - LÉTREHOZOTT KATEGÓRIA VISSZAADÁSA =====
    console.log('<<<<<<<<<<<<<<<<<<<<<<<< kategoriaLetrehozasa===ujKategoria: ', {
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
   * @returns {Promise} A kategória objektum
   */
  async kategoriaLekerese(id) {

    console.log('=================================== kategoriaLekerese:: ', { id: id });

    if (!id) {
      throw new Error('A kategória ID megadása kötelező');
    }

    console.log('kategoriaLekerese >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.findById', { id: id });
    const kategoria = await KategoriaRepository.findById(id);

    if (!kategoria) {
      throw new Error('A kategória nem található');
    }

    console.log('<<<<<<<<<<<<<<<<<<<< kategoriaLekerese====kategoria: ', { kategoria: kategoria });

    return kategoria;
  }

  // =====================================
  // ----- KATEGÓRIÁK LISTÁZÁSA -----
  // =====================================
  /**
   * Kategóriák listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} szurok.letrehozo - Létrehozó eember ID
   * @param {string} szurok.nev - Név szerinti keresés
   * @param {string} szurok.szuloId - Szülő ID szerinti szűrés (opcionális)
   * @param {string} szurok.szuloTipus - Szülő típus szerinti szűrés (opcionális)
   * @returns {Promise} Kategóriák tömb
   */
  async kategoriaListazasa(szurok = {}) {

    console.log('=================================== kategoriaListazasa:: ', { szurok: szurok });

    console.log('kategoriaListazasa >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.findAll', { szurok: szurok });
    const kategoriak = await KategoriaRepository.findAll(szurok);

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<< kategoriaListazasa===kategoriak: ', { kategoriak: kategoriak });

    return kategoriak;
  }

  // =====================================
  // ----- KATEGÓRIA MÓDOSÍTÁSA -----
  // =====================================
  /**
   * Egy kategória módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A kategória ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} eemberId - A módosítást végző eember ID-ja
   * @returns {Promise} A frissített kategória
   */
  async kategoriaModositasa(id, frissitesek, eemberId) {

    console.log('=================================== kategoriaModositasa:: ', {
      id: id,
      frissitesek: frissitesek,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Kategória létezésének ellenőrzése
    console.log('kategoriaModositasa >>>>>>>>>>>>>>>>>>>>>>> this.kategoriaLekerese');
    const kategoria = await this.kategoriaLekerese(id);

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak a létrehozó módosíthatja a saját kategóriáját
    if (kategoria.letrehozo._id.toString() !== eemberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a kategóriát');
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

      // DOMAIN-SZABÁLY: ha NEM null-ra állítjuk (tehát valódi szülőt adunk),
      // az csak egy létező Kategoria lehet.
      if (!szuloIdNull) {
        await this._szuloKategoriaEllenorzese(
          tisztitottFrissitesek.szuloId,
          tisztitottFrissitesek.szuloTipus
        );
      }
    }

    // 5. LÉPÉS - Név validálás és egyediség ellenőrzése (ha változik)
    if (tisztitottFrissitesek.nev) {
      const tisztitottNev = tisztitottFrissitesek.nev.trim();

      if (!tisztitottNev) {
        throw new Error('A kategória neve nem lehet üres');
      }

      const letezikE = await KategoriaRepository.findByNev(tisztitottNev);
      if (letezikE && letezikE._id.toString() !== id.toString()) {
        throw new Error('Ez a kategória név már létezik');
      }

      tisztitottFrissitesek.nev = tisztitottNev;
    }

    // 6. LÉPÉS - LEÍRÁS KEZELÉSE (ha változik)
    // A FormData-ból JSON-stringként érkező leírást tömbbé parse-oljuk (mint létrehozáskor).
    if (tisztitottFrissitesek.leiras !== undefined) {
      tisztitottFrissitesek.leiras = leirasParse(tisztitottFrissitesek.leiras);
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
    console.log('kategoriaModositasa >>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.updateById', {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });

    const frissitettKategoria = await KategoriaRepository.updateById(id, tisztitottFrissitesek);

    console.log('<<<<<<<<<<<<<<<<<<<<< kategoriaModositasa====frissitettKategoria: ', {
      frissitettKategoria: frissitettKategoria
    });

    // 9. LÉPÉS - RÉGI IKON TÖRLÉSE (ha az ikont lecserélték)
    // Ha a módosítás új ikont hozott, a régi ikon-fájl árván maradna az
    // uploads/icons/ mappában. Összevetjük a régi és az új ikon-URL-t: ha
    // eltérnek, a régit töröljük. Ha az ikon nem változott, a diff üres.
    if (tisztitottFrissitesek.ikon) {
      try {
        const regiUrlek = FajlKezeloService.entitasbolFajlUrlek(kategoria, 'Kategoria');
        const ujUrlek = FajlKezeloService.entitasbolFajlUrlek(frissitettKategoria, 'Kategoria');
        await FajlKezeloService.elavultFajlokTorlese(regiUrlek, ujUrlek);
      } catch (hiba) {
        console.warn('kategoriaModositasa - Régi ikon törlése sikertelen', { id, hiba: hiba.message });
      }
    }

    return frissitettKategoria;
  }

  // =====================================
  // ----- KATEGÓRIA RÉSZLETES ADATAI -----
  // =====================================
  /**
   * Kategória részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A kategória ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise} Kategória + tudatpont adatok
   */
  async kategoriaReszleteinekLekerese(id, eemberId) {

    console.log('=================================== kategoriaReszleteinekLekerese:: ', {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Kategória alapadatainak lekérése
    console.log('kategoriaReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>>>> this.kategoriaLekerese');
    const kategoria = await this.kategoriaLekerese(id);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'Kategoria',
      eemberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása
    console.log('<<<<<<<<<<<<<<<<<<<< kategoriaReszleteinekLekerese====Eredmény:', {
      kategoria:    kategoria,
      tudatpont: tudatpontAdatok
    });

    return {
      kategoria:    kategoria,
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
  //    - Ha minden eember visszavonja a tudatpontjait
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  //    - Az entitás törlése: kategoriaRepository.deleteById()
  //
  // 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
  //    - (Külön javaslatService.js fogja kezelni)
  //
  // A kategoriaRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!
}

// Service exportálása
module.exports = new KategoriaService();