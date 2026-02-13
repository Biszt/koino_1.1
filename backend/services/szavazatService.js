// backend/services/szavazatService.js

// ===================================
// REPOSITORY ÉS SERVICE IMPORTÁLÁSA
// ===================================
const SzavazatRepository = require('../repositories/szavazatRepository');
const JavaslatRepository = require('../repositories/javaslatRepository');

// ⭐ ÚJ IMPORT - Refaktorált service-ek
const JavaslatJogosultsagService = require('./javaslat/javaslatJogosultsagService');

// ===================================
// SZAVAZAT SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza a szavazat üzleti logikát
class SzavazatService {

  // ===================================
  // SZAVAZAT LEADÁSA
  // ===================================
  /**
   * Szavazat leadása vagy módosítása egy javaslatra
   * @param {string} emberId - A szavazó ember ID-ja
   * @param {string} javaslatId - A javaslat ID-ja
   * @param {string} szavazatTipus - 'Tamogat' vagy 'Ellenez' vagy 'Tartozkodik'
   * @returns {Promise} A szavazat és frissített javaslat adatok
   */
  async szavazatLeadasa(emberId, javaslatId, szavazatTipus) {

    console.log("===================================szavazatLeadasa:: ", {
      emberId: emberId,
      javaslatId: javaslatId,
      szavazatTipus: szavazatTipus
    });
    
    // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA
    if (!emberId) {
      throw new Error('A ember azonosítója kötelező');
    }

    if (!javaslatId) {
      throw new Error('A javaslat azonosítója kötelező');
    }

    if (!szavazatTipus) {
      throw new Error('A szavazat típusa kötelező');
    }

    // Szavazat típus validálása
    const megengedettTipusok = ['Tamogat', 'Ellenez', 'Tartozkodik'];
    if (!megengedettTipusok.includes(szavazatTipus)) {
      throw new Error(`Érvénytelen szavazat típus. Megengedett értékek: ${megengedettTipusok.join(', ')}`);
    }

    // 2. LÉPÉS - JAVASLAT LÉTEZÉSÉNEK ÉS STÁTUSZÁNAK ELLENŐRZÉSE
    const javaslat = await JavaslatRepository.findById(javaslatId);
    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    // Csak Aktiv javaslatokra lehet szavazni
    if (javaslat.statusz !== 'Aktiv') {
      throw new Error('Csak Aktiv státuszú javaslatokra lehet szavazni');
    }

    // 3. LÉPÉS - SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE
    // ⭐ ÚJ SERVICE HASZNÁLATA
    const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
      emberId,
      javaslat.erintettEntitasok
    );

    if (!jogosultsag.jogosult) {
      throw new Error(`Nincs szavazási jogosultságod. Hiányzó tudatpont ezen entitáson: ${jogosultsag.hianyzoEntitas}`);
    }

      // A szavazatLeadasa metódusban:

   // === 4. LÉPÉS: SZAVAZAT MENTÉSE VAGY FRISSÍTÉSE ===
    // Ha már létezik szavazat, frissíti; ha nem, létrehozza
    const szavazat = await SzavazatRepository.createOrUpdate(
      emberId,
      javaslatId,
      szavazatTipus  
    );

    console.log('Szavazat mentve:', szavazat);

    // === 5. LÉPÉS: JAVASLAT MEGJELÖLÉSE ELAVULTKÉNT ===
    // A javaslat értékei megváltoztak (új szavazat), ezért elavulttá válik
    // A cron job fogja frissíteni percenként
    await JavaslatRepository.updateById(javaslatId, { ertekekElavultak: true });
    console.log('Javaslat megjelölve elavultként:', javaslatId);

    // === 6. LÉPÉS: EREDMÉNY VISSZAADÁSA ===
    const eredmeny = {
      siker: true,
      szavazat: szavazat,
      uzenet: 'Szavazat sikeresen leadva. Az értékek frissítése 1 percen belül megtörténik.'
    };

    console.log('szavazatLeadasa=============Eredmény: ', eredmeny);
    return eredmeny;
  }


  // ===================================
// SZAVAZAT TÖRLÉSE
// ===================================
/**
 * Szavazat visszavonása egy javaslatról
 * @param {string} emberId - A ember ID-ja
 * @param {string} javaslatId - A javaslat ID-ja
 * @returns {Promise} A művelet eredménye
 */
async szavazatTorlese(emberId, javaslatId) {

  console.log("=================================== szavazatTorlese:: ", {
    emberId: emberId,
    javaslatId: javaslatId
  });
  
  // === 1. LÉPÉS: PARAMÉTEREK VALIDÁLÁSA ===
  if (!emberId) {
    throw new Error('A ember azonosítója kötelező');
  }

  if (!javaslatId) {
    throw new Error('A javaslat azonosítója kötelező');
  }

  // === 2. LÉPÉS: JAVASLAT STÁTUSZÁNAK ELLENŐRZÉSE ===

  console.log("szavazatTorlese >>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById", {
    javaslatId: javaslatId
  });
  const javaslat = await JavaslatRepository.findById(javaslatId);
  if (!javaslat) {
    throw new Error('A javaslat nem található');
  }

  // Csak Aktiv javaslatról lehet visszavonni szavazatot
  if (javaslat.statusz !== 'Aktiv') {
    throw new Error('Csak Aktiv státuszú javaslatról vonható vissza a szavazat');
  }

  // === 3. LÉPÉS: SZAVAZAT LÉTEZÉSÉNEK ELLENŐRZÉSE ===

  console.log("szavazatTorlese >>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByEmberAndJavaslat", {
    emberId: emberId,
    javaslatId: javaslatId
  });
  const szavazat = await SzavazatRepository.findByEmberAndJavaslat(
    emberId,
    javaslatId
  );

  if (!szavazat) {
    throw new Error('Nem található szavazat ezen a javaslaton');
  }

  // === 4. LÉPÉS: SZAVAZAT TÖRLÉSE ===

  console.log("szavazatTorlese >>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.deleteSzavazat", {
    emberId: emberId,
    javaslatId: javaslatId
  });
  await SzavazatRepository.deleteSzavazat(emberId, javaslatId);

  // === 5. LÉPÉS: ELAVULT JELZŐ BEÁLLÍTÁSA ===
  // A javaslat értékei elavultak lettek → cron job frissíti majd

  console.log("szavazatTorlese >>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateElavult", {
    javaslatId: javaslatId
  });
  await JavaslatRepository.updateElavult(javaslatId, true);

  console.log("<<<<<<<<<<<<<<<<<<<<<< szavazatTorlese=====Eredmény", {
    siker: true,
    uzenet: 'Szavazat sikeresen visszavonva'
  });    
  
  return {
    siker: true,
    uzenet: 'Szavazat sikeresen visszavonva'
  };
}


  // ===================================
  // EMBER SZAVAZATÁNAK LEKÉRÉSE
  // ===================================
  /**
   * Egy ember szavazatának lekérése egy javaslaton
   * @param {string} emberId - A ember ID-ja
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise} A szavazat vagy null
   */
  async emberSzavazatanakLekerese(emberId, javaslatId) {

    console.log("=================================== emberSzavazatanakLekerese:: ", {
      emberId: emberId,
      javaslatId: javaslatId
    });
    
    // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA
    if (!emberId) {
      throw new Error('A ember azonosítója kötelező');
    }

    if (!javaslatId) {
      throw new Error('A javaslat azonosítója kötelező');
    }

    // 2. LÉPÉS - SZAVAZAT LEKÉRÉSE

    console.log("emberSzavazatanakLekerese >>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByEmberAndJavaslat", {
      emberId: emberId,
      javaslatId: javaslatId
    });
    
    const szavazat = await SzavazatRepository.findByEmberAndJavaslat(
      emberId,
      javaslatId
    );

    console.log("<<<<<<<<<<<<<<<<<<<<<< emberSzavazatanakLekerese====szavazat: ", {
      szavazat: szavazat
    });    

    return szavazat;
  }

  // ===================================
  // JAVASLAT ÖSSZES SZAVAZATÁNAK LEKÉRÉSE
  // ===================================
  /**
   * Egy javaslat összes szavazatának lekérése
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise} Szavazatok tömb
   */
  async javaslatSzavazatainakLekerese(javaslatId) {

    console.log("=================================== javaslatSzavazatainakLekerese:: ", {
      javaslatId: javaslatId
    });
    
    // 1. LÉPÉS - PARAMÉTER VALIDÁLÁSA
    if (!javaslatId) {
      throw new Error('A javaslat azonosítója kötelező');
    }

    // 2. LÉPÉS - JAVASLAT LÉTEZÉSÉNEK ELLENŐRZÉSE

    console.log("javaslatSzavazatainakLekerese >>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById", {
      javaslatId: javaslatId
    });
    
    const javaslat = await JavaslatRepository.findById(javaslatId);
    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    // 3. LÉPÉS - SZAVAZATOK LEKÉRÉSE
    console.log("javaslatSzavazatainakLekerese >>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByJavaslatId", {
      javaslatId: javaslatId
    });
    const szavazatok = await SzavazatRepository.findByJavaslatId(javaslatId);

    console.log("<<<<<<<<<<<<<<<<<<<<< javaslatSzavazatainakLekerese===szavazatok: ", {
      szavazatok: szavazatok
    });
    
    return szavazatok;
  }

  // ===================================
  // EMBER ÖSSZES SZAVAZATÁNAK LEKÉRÉSE
  // ===================================
  /**
   * Egy ember összes szavazatának lekérése
   * @param {string} emberId - A ember ID-ja
   * @param {number} limit - Maximum ennyi szavazat (opcionális)
   * @returns {Promise} Szavazatok tömb
   */
  async emberSzavazatainakLekerese(emberId, limit = null) {

    console.log("=================================== emberSzavazatainakLekerese:: ", {
      emberId: emberId,
      limit: limit
    });
    
    // 1. LÉPÉS - PARAMÉTER VALIDÁLÁSA
    if (!emberId) {
      throw new Error('A ember azonosítója kötelező');
    }

    // 2. LÉPÉS - SZAVAZATOK LEKÉRÉSE

    console.log("emberSzavazatainakLekerese >>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByEmberId", {
      emberId: emberId,
      limit: limit
    });
    
    const szavazatok = await SzavazatRepository.findByEmberId(
      emberId,
      limit
    );

    console.log("<<<<<<<<<<<<<<<<<< emberSzavazatainakLekerese====szavazatok", {
      szavazatok: szavazatok
    });    

    return szavazatok;
  }

  // ===================================
  // SZAVAZATOK STATISZTIKÁJA
  // ===================================
  /**
   * Egy javaslat szavazatainak statisztikája
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise} Statisztika objektum
   */
  async szavazatokStatisztikaja(javaslatId) {

    console.log("=================================== szavazatokStatisztikaja:: ", {
      javaslatId: javaslatId
    });
    
    // 1. LÉPÉS - PARAMÉTER VALIDÁLÁSA
    if (!javaslatId) {
      throw new Error('A javaslat azonosítója kötelező');
    }

    // 2. LÉPÉS - JAVASLAT LÉTEZÉSÉNEK ELLENŐRZÉSE
    const javaslat = await JavaslatRepository.findById(javaslatId);
    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    // 3. LÉPÉS - SZÁMOLÓK LEKÉRÉSE

    console.log("szavazatokStatisztikaja >>>>>>>>>>>>>>>> SzavazatRepository.countTamogatok", {
      javaslatId: javaslatId
    });    
    const tamogatokSzama = await SzavazatRepository.countTamogatok(javaslatId);
    console.log("szavazatokStatisztikaja >>>>>>>>>>>>>>>> SzavazatRepository.countEllenzok", {
      javaslatId: javaslatId
    });    
    const ellenzokSzama = await SzavazatRepository.countEllenzok(javaslatId);
    console.log("szavazatokStatisztikaja >>>>>>>>>>>>>>>> SzavazatRepository.countTartozkodok", {
      javaslatId: javaslatId
    });    
    const tartózkodokSzama = await SzavazatRepository.countTartozkodok(javaslatId);
    console.log("szavazatokStatisztikaja >>>>>>>>>>>>>>>> SzavazatRepository.countOsszesSzavazo", {
      javaslatId: javaslatId
    });    
    const osszesSzavazoSzama = await SzavazatRepository.countOsszesSzavazo(javaslatId);

    // 4. LÉPÉS - STATISZTIKA OBJEKTUM ÖSSZEÁLLÍTÁSA

    console.log("<<<<<<<<<<<<<<<<<<<<< szavazatokStatisztikaja====Eredmény:", {
      javaslatId: javaslatId,
      tamogatokSzama: tamogatokSzama,
      ellenzokSzama: ellenzokSzama,
      tartozkodokSzama: tartózkodokSzama,
      osszesSzavazoSzama: osszesSzavazoSzama,
      tamogatotsagiArany: javaslat.tamogatotsagiArany,
      ellenzoiArany: javaslat.ellenzoiArany,
      reszveteliArany: javaslat.reszveteliArany,
      bizonyossagiMutato: javaslat.bizonyossagiMutato
    });
    
    return {
      javaslatId: javaslatId,
      tamogatokSzama: tamogatokSzama,
      ellenzokSzama: ellenzokSzama,
      tartozkodokSzama: tartózkodokSzama,
      osszesSzavazoSzama: osszesSzavazoSzama,
      tamogatotsagiArany: javaslat.tamogatotsagiArany,
      ellenzoiArany: javaslat.ellenzoiArany,
      reszveteliArany: javaslat.reszveteliArany,
      bizonyossagiMutato: javaslat.bizonyossagiMutato
    };
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service exportálása
module.exports = new SzavazatService();
