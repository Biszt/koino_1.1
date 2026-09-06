// backend/services/gondolatTipusService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const GondolatTipusRepository = require('../repositories/gondolatTipusRepository');
const TudatpontService = require('./tudatpontService');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const ErtekSzamitasService = require('./ertekSzamitasService');
const { kuszobertekekParse } = require('../utils/kuszobErtekParser');
const { leirasParse } = require('../utils/leirasParser');
const FajlKezeloService = require('./fajlKezeloService'); // Ikon-cserekor a régi ikon-fájl törlése

// ===================================
// GONDOLAT TÍPUS SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza az üzleti logikát
class GondolatTipusService {

  // =====================================
  // ----- ÚJ GONDOLAT TÍPUS LÉTREHOZÁSA -----
  // =====================================
  /**
   * Új gondolat típus létrehozása validációval ÉS tudatpont hozzárendeléssel
   * @param {Object} adatok - A gondolat típus adatai
   * @param {string} adatok.nev - A gondolat típus neve (kötelező)
   * @param {string} adatok.leiras - A gondolat típus leírása (opcionális)
   * @param {string} adatok.ikon - Az ikon fájl útvonala (kötelező)
   * @param {string} adatok.szuloId - A szülő entitás ID-ja (opcionális)
   * @param {string} adatok.szuloTipus - A szülő entitás típusa (opcionális)
   * @param {string} eemberId - A létrehozó eember ID-ja
   * @param {number} kezdoTudatpont - Kezdő tudatpont mennyiség (minimum 1)
   * @returns {Promise<Object>} A létrehozott gondolat típus
   */
  async gondolatTipusLetrehozasa(adatok, eemberId, kezdoTudatpont) {

    console.log("=================================== gondolatTipusLetrehozasa:: ", {
      adatok: adatok,
      eemberId: eemberId,
      kezdoTudatpont: kezdoTudatpont
    });

    // ===== 1. LÉPÉS - KÖTELEZŐ MEZŐK VALIDÁLÁSA =====
    // Név ellenőrzése - kötelező mező
    if (!adatok.nev || !adatok.nev.trim()) {
      throw new Error('A gondolat típus neve kötelező');
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
      throw new Error('Minimum 1 tudatpont szükséges a gondolat típus létrehozásához');
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
    // ÜZLETI SZABÁLY: Egy gondolat típus név csak egyszer használható
    console.log("gondolatTipusLetrehozasa >>>>>>>>>>>>>>>> GondolatTipusRepository.findByNev", {
      tisztitottNev: tisztitottNev
    });

    const letezikE = await GondolatTipusRepository.findByNev(tisztitottNev);
    if (letezikE) {
      throw new Error('Ez a gondolat típus név már létezik');
    }

    // ===== 6. LÉPÉS - LEÍRÁS KEZELÉSE HA VAN =====
    // MÓDOSÍTVA: Mixed típus - nem hívunk trim()-et, JSON tömböt fogad a szövegszerkesztőtől
    // Ha nincs megadva, null marad (üres string helyett)
    // A leiras a FormData-ból JSON-stringként érkezik (blokk-tömb) → tömbbé parse-oljuk,
    // hogy a Mixed mezőben tömbként tárolódjon (mint a Gondolat szoveg-e).
    const tisztitottLeiras = leirasParse(adatok.leiras);

    // ===== 7. LÉPÉS - IKON ÚTVONAL TISZTÍTÁSA =====
    const tisztitottIkon = adatok.ikon.trim();

    // ===== 8. LÉPÉS - GONDOLAT TÍPUS OBJEKTUM ÖSSZEÁLLÍTÁSA =====
    const gondolatTipusAdatok = {
      nev:        tisztitottNev,
      leiras:     tisztitottLeiras,          // null vagy JSON tömb a szövegszerkesztőtől
      ikon:       tisztitottIkon,
      szuloId:    adatok.szuloId    || null,
      szuloTipus: adatok.szuloTipus || null,
      // A létrehozó lesz az ELSŐ (és egyben eredeti) szerkesztő.
      szerkesztok: [
        { eemberId: eemberId, allapot: 'Tamogatja', eredeti: true }
      ]
    };

    // ===== 9. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA =====
    console.log("gondolatTipusLetrehozasa >>>>>>>>>>>>>>>> GondolatTipusRepository.create", {
      gondolatTipusAdatok: gondolatTipusAdatok
    });

    const ujGondolatTipus = await GondolatTipusRepository.create(gondolatTipusAdatok);

    // ===== 10. LÉPÉS - TUDATPONT HOZZÁRENDELÉSE =====
    // A gondolat típus létrejött, most hozzárendeljük a kezdő tudatpontot
    try {

      console.log("gondolatTipusLetrehozasa >>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese");
      await TudatpontService.tudatpontHozzarendelese(
        eemberId,            // Ki adja a tudatpontot
        ujGondolatTipus._id, // Melyik entitásra (az új gondolat típus ID-ja)
        'GondolatTipus',     // Entitás típusa
        kezdoTudatpont       // Mennyi tudatpontot
      );

    } catch (error) {
      // Ha a tudatpont hozzárendelés sikertelen, töröljük a gondolat típust is
      console.log("gondolatTipusLetrehozasa >>>>>>>>>>>>>>>>>>>> GondolatTipusRepository.deleteById", {
        ujGondolatTipus: ujGondolatTipus.id
      });

      await GondolatTipusRepository.deleteById(ujGondolatTipus._id);
      throw new Error(`Gondolat típus létrehozása sikertelen: ${error.message}`);
    }

    // ===== 10.5 LÉPÉS - KÜSZÖBÉRTÉKEK INICIALIZÁLÁSA =====
    // A létrehozó automatikusan érték javaslatot ad az általa megadott (vagy
    // alapértelmezett) küszöbértékekre, és létrejön a kezdeti hisztogram.
    const kuszobErtekek = kuszobertekekParse(adatok);
    try {
      await ErtekJavaslatRepository.create({
        entitasId:    ujGondolatTipus._id,
        entitasTipus: 'GondolatTipus',
        eemberId:     eemberId,
        ...kuszobErtekek
      });
      await ErtekSzamitasService.hisztogramLetrehozasa(
        ujGondolatTipus._id,
        'GondolatTipus',
        kuszobErtekek.javaslatElfogadasiKuszob,
        kuszobErtekek.reszveteliAranyKuszob,
        kuszobErtekek.minimumDontesiIdo,
        kuszobErtekek.maximumDontesiIdo
      );
      console.log('Gondolattípus küszöbérték-hisztogram inicializálva');

      // A LÉTREHOZÓ AKTÍVVÁ TÉTELE: kezdő értékjavaslatot adott → döntés-alakító tett,
      // ezért AKTÍV szerepet kap az új gondolattípuson (bekerül a részvételi arány nevezőjébe).
      try {
        await TudatpontService.szerepAktivalasa(eemberId, ujGondolatTipus._id, 'GondolatTipus');
      } catch (szerepHiba) {
        console.error('A létrehozó aktívvá tétele sikertelen (nem blokkoló):', szerepHiba.message);
      }
    } catch (error) {
      // Nem kritikus: logoljuk, de nem döntjük meg a gondolattípust
      console.error('Gondolattípus küszöbérték inicializálási hiba:', error.message);
    }

    // ===== 11. LÉPÉS - LÉTREHOZOTT GONDOLAT TÍPUS VISSZAADÁSA =====
    console.log("<<<<<<<<<<<<<<< gondolatTipusLetrehozasa====ujGondolatTipus: ", {
      ujGondolatTipus: ujGondolatTipus
    });

    return ujGondolatTipus;
  }

  // =====================================
  // ----- GONDOLAT TÍPUS LEKÉRÉSE ID ALAPJÁN -----
  // =====================================
  /**
   * Egy gondolat típus lekérése
   * @param {string} id - A gondolat típus ID-ja
   * @returns {Promise<Object>} A gondolat típus objektum
   */
  async gondolatTipusLekerese(id) {

    console.log("=================================== gondolatTipusLekerese:: ", { id: id });

    // 1. LÉPÉS - ID validálás
    if (!id) {
      throw new Error('A gondolat típus ID megadása kötelező');
    }

    // 2. LÉPÉS - Repository hívás - gondolat típus lekérése
    console.log("gondolatTipusLekerese >>>>>>>>>>>>>>>>>> GondolatTipusRepository.findById", { id: id });

    const gondolatTipus = await GondolatTipusRepository.findById(id);

    // 3. LÉPÉS - Létezés ellenőrzése
    if (!gondolatTipus) {
      throw new Error('A gondolat típus nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<<<< gondolatTipusLekerese===gondolatTipus: ", {
      gondolatTipus: gondolatTipus
    });

    return gondolatTipus;
  }

  // =====================================
  // ----- GONDOLAT TÍPUSOK LISTÁZÁSA -----
  // =====================================
  /**
   * Gondolat típusok listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek
   * @param {string} szurok.letrehozo - Létrehozó eember ID
   * @param {string} szurok.nev - Név szerinti keresés
   * @param {string} szurok.szuloId - Szülő ID szerinti szűrés (opcionális)
   * @param {string} szurok.szuloTipus - Szülő típus szerinti szűrés (opcionális)
   * @returns {Promise<Array>} Gondolat típusok tömb
   */
  async gondolatTipusListazasa(szurok = {}) {

    console.log("=================================== gondolatTipusListazasa: ", { szurok: szurok });

    // Repository hívás - gondolat típusok lekérése szűrőkkel
    console.log("gondolatTipusListazasa >>>>>>>>>>>>>>>>>> GondolatTipusRepository.findAll", {
      szurok: szurok
    });

    const gondolatTipusok = await GondolatTipusRepository.findAll(szurok);

    console.log("<<<<<<<<<<<<<<<<<<<<<gondolatTipusListazasa====gondolatTipusok: ", {
      gondolatTipusok
    });

    return gondolatTipusok;
  }

  // =====================================
  // ----- GONDOLAT TÍPUS MÓDOSÍTÁSA -----
  // =====================================
  /**
   * Egy gondolat típus módosítása validációval és jogosultság ellenőrzéssel
   * @param {string} id - A gondolat típus ID-ja
   * @param {Object} frissitesek - A frissítendő mezők
   * @param {string} eemberId - A módosítást végző eember ID-ja
   * @returns {Promise<Object>} A frissített gondolat típus
   */
  async gondolatTipusModositasa(id, frissitesek, eemberId) {

    console.log("=================================== gondolatTipusModositasa:: ", {
      id: id,
      frissitesek: frissitesek,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Gondolat típus létezésének ellenőrzése
    console.log("gondolatTipusModositasa >>>>>>>>>>>>>>>>>>>> this.gondolatTipusLekerese");

    const gondolatTipus = await this.gondolatTipusLekerese(id);

    // 2. LÉPÉS - Jogosultság ellenőrzése
    // Csak az EREDETI létrehozó szerkesztheti közvetlenül a saját gondolat típusát.
    const eredetiSzerkeszto = (gondolatTipus.szerkesztok || []).find(sz => sz.eredeti);
    const eredetiId = eredetiSzerkeszto?.eemberId?._id ?? eredetiSzerkeszto?.eemberId;
    if (!eredetiId || eredetiId.toString() !== eemberId.toString()) {
      throw new Error('Nincs jogosultságod módosítani ezt a gondolat típust');
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
        throw new Error('A gondolat típus neve nem lehet üres');
      }

      // Ellenőrizzük, hogy a név nem foglalt-e már (kivéve saját magát)
      const letezikE = await GondolatTipusRepository.findByNev(tisztitottNev);
      if (letezikE && letezikE._id.toString() !== id.toString()) {
        throw new Error('Ez a gondolat típus név már létezik');
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
    console.log("gondolatTipusModositasa >>>>>>>>>>>>>>>>>>>> GondolatTipusRepository.updateById", {
      id: id,
      tisztitottFrissitesek: tisztitottFrissitesek
    });

    const frissitettGondolatTipus = await GondolatTipusRepository.updateById(id, tisztitottFrissitesek);

    console.log("<<<<<<<<<<<<<<<<<<<<<<gondolatTipusModositasa===frissitettGondolatTipus: ", {
      frissitettGondolatTipus
    });

    // 9. LÉPÉS - RÉGI IKON TÖRLÉSE (ha az ikont lecserélték)
    // Ha a módosítás új ikont hozott, a régi ikon-fájl árván maradna az
    // uploads/icons/ mappában. Összevetjük a régi és az új ikon-URL-t: ha
    // eltérnek, a régit töröljük. Ha az ikon nem változott, a diff üres.
    if (tisztitottFrissitesek.ikon) {
      try {
        const regiUrlek = FajlKezeloService.entitasbolFajlUrlek(gondolatTipus, 'GondolatTipus');
        const ujUrlek = FajlKezeloService.entitasbolFajlUrlek(frissitettGondolatTipus, 'GondolatTipus');
        await FajlKezeloService.elavultFajlokTorlese(regiUrlek, ujUrlek);
      } catch (hiba) {
        console.warn('gondolatTipusModositasa - Régi ikon törlése sikertelen', { id, hiba: hiba.message });
      }
    }

    return frissitettGondolatTipus;
  }

  // =====================================
  // ----- GONDOLAT TÍPUS RÉSZLETES ADATAI TUDATPONTTAL -----
  // =====================================
  /**
   * Gondolat típus részletes adatainak lekérése tudatpont allokációval együtt
   * @param {string} id - A gondolat típus ID-ja
   * @param {string} eemberId - A lekérést végző eember ID-ja
   * @returns {Promise<Object>} Gondolat típus + tudatpont adatok
   */
  async gondolatTipusReszleteinekLekerese(id, eemberId) {

    console.log("=================================== gondolatTipusReszleteinekLekerese:: ", {
      id: id,
      eemberId: eemberId
    });

    // 1. LÉPÉS - Gondolat típus alapadatainak lekérése
    console.log("gondolatTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> this.gondolatTipusLekerese");

    const gondolatTipus = await this.gondolatTipusLekerese(id);

    // 2. LÉPÉS - Tudatpont allokáció lekérése
    console.log("gondolatTipusReszleteinekLekerese >>>>>>>>>>>>>>>>>>>>> TudatpontService.entitasAllokaciLekerese");

    const tudatpontAdatok = await TudatpontService.entitasAllokaciLekerese(
      id,
      'GondolatTipus',
      eemberId
    );

    // 3. LÉPÉS - Összesített objektum visszaadása
    console.log("<<<<<<<<<<<<<<<<< gondolatTipusReszleteinekLekerese====Eredmény:", {
      gondolatTipus: gondolatTipus,
      tudatpont:     tudatpontAdatok
    });

    return {
      gondolatTipus: gondolatTipus,
      tudatpont:     tudatpontAdatok
    };
  }

  // =====================================
  // ===== Torles METÓDUS NINCS! =====
  // =====================================
  //
  // A gondolat típusok NEM törölhetők direkt Service metódus híváson keresztül.
  //
  // Törlés csak automatikusan történik:
  //
  // 1. AUTOMATIKUS Torles - Tudatpont nullázás
  //    - Ha minden eember visszavonja a tudatpontjait
  //    - És az osszesPont 0-ra csökken
  //    - Automatikusan meghívódik: tudatpontService.js → entitasTorlese0PontNal()
  //    - Az entitás törlése: gondolatTipusRepository.deleteById()
  //
  // 2. KÖZÖSSÉGI Torles - Javaslat alapján (jövőbeli funkció)
  //    - Törlési javaslat indítása (külön endpoint)
  //    - Közösségi szavazás
  //    - Hatályba lépési idő után automatikus törlés
  //    - Tudatpontok automatikus visszautalása a hozzájárulóknek
  //    - Törlés végrehajtása: gondolatTipusRepository.deleteById()
  //    - (Külön javaslatService.js vagy kozossegService.js fogja kezelni)
  //
  // A gondolatTipusRepository.deleteById() metódus MARAD,
  // mert azt használják a fenti automatikus törlési mechanizmusok!
}

// Service exportálása
module.exports = new GondolatTipusService();