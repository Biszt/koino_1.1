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

  // SZAVAZAT LEADÁSA

// Szavazat leadása vagy módosítása egy javaslatra.
// Ha a javaslat töredékjavaslat, akkor az összes olyan töredékre is leadja a szavazatot,
// ahol az eembernek van tudatpontja az érintett entitáson.
// param: string eemberId    - A szavazó eember ID-ja
// param: string javaslatId  - A javaslat ID-ja
// param: string szavazatTipus - 'Tamogat' | 'Ellenez' | 'Tartozkodik'
// returns: Promise<Object> - Szavazat és eredmény adatok
async szavazatLeadasa(eemberId, javaslatId, szavazatTipus) {
  // Log a metódus elejére az értékekkel
  console.log('szavazatLeadasa - KEZDÉS', { eemberId, javaslatId, szavazatTipus });

  // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA
  if (!eemberId) throw new Error('A eember azonosítója kötelező');
  if (!javaslatId) throw new Error('A javaslat azonosítója kötelező');
  if (!szavazatTipus) throw new Error('A szavazat típusa kötelező');

  // Szavazat típus validálása - csak engedélyezett értékek fogadhatók
  const megengedettTipusok = ['Tamogat', 'Ellenez', 'Tartozkodik'];
  if (!megengedettTipusok.includes(szavazatTipus)) {
    throw new Error(`Érvénytelen szavazat típus. Megengedett értékek: ${megengedettTipusok.join(', ')}`);
  }

  // 2. LÉPÉS - JAVASLAT LÉTEZÉSÉNEK ÉS STÁTUSZÁNAK ELLENŐRZÉSE
  console.log('szavazatLeadasa - JavaslatRepository.findById', { javaslatId });
  const javaslat = await JavaslatRepository.findById(javaslatId);

  // Ha nincs ilyen javaslat, hibát dobunk
  if (!javaslat) throw new Error('A javaslat nem található');

  // Csak Aktiv státuszú javaslatokra lehet szavazni
  if (javaslat.statusz !== 'Aktiv') {
    throw new Error('Csak Aktiv státuszú javaslatokra lehet szavazni');
  }

  // 3. LÉPÉS - TÖREDÉKJAVASLAT VIZSGÁLATA
  // Ha a javaslaton van toredekCsoportId, töredékjavaslat → speciális logika kell
  const isToredek = !!javaslat.toredekCsoportId;
  console.log('szavazatLeadasa - Töredék vizsgálat', {
    javaslatId,
    isToredek,
    toredekCsoportId: javaslat.toredekCsoportId ?? null, // null ha nem töredék
  });

  // -----------------------------------------------------------------------
  // NEM TÖREDÉK ÁG - az eredeti, változatlan logika fut le
  // -----------------------------------------------------------------------
  if (!isToredek) {

    // 3a. SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE
    const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
      eemberId,
      javaslat.erintettEntitasok // Az érintett entitások tömbje
    );

    // Ha nincs jogosultság, hibaüzenettel jelezzük, melyik entitáson hiányzik a pont
    if (!jogosultsag.jogosult) {
      throw new Error(
        `Nincs szavazási jogosultságod. Hiányzó tudatpont ezen entitáson: ${jogosultsag.hianyzoEntitas}`
      );
    }

    // 3b. SZAVAZAT MENTÉSE VAGY FRISSÍTÉSE
    // Ha már létezik szavazat, frissíti; ha nem, létrehozza
    const szavazat = await SzavazatRepository.createOrUpdate(
      eemberId,
      javaslatId,
      szavazatTipus
    );
    console.log('szavazatLeadasa - Szavazat mentve (nem töredék)', { szavazat });

    // 3c. JAVASLAT MEGJELÖLÉSE ELAVULTKÉNT
    // A cron job fogja frissíteni a számított értékeket
    await JavaslatRepository.updateById(javaslatId, { ertekekElavultak: true });
    console.log('szavazatLeadasa - Javaslat megjelölve elavultként (nem töredék)', { javaslatId });

    // 3d. EREDMÉNY VISSZAADÁSA
    const eredmeny = {
      siker: true,
      szavazat: szavazat,
      uzenet: 'Szavazat sikeresen leadva. Az értékek frissítése 1 percen belül megtörténik.',
      isToredek: false, // Jelezzük, hogy nem töredékes szavazás volt
    };
    console.log('szavazatLeadasa - VÉGE (nem töredék)', { eredmeny });
    return eredmeny;
  }

  // -----------------------------------------------------------------------
  // TÖREDÉK ÁG - az összes jogosult töredékre leadja a szavazatot
  // -----------------------------------------------------------------------

  // 4. LÉPÉS - CSOPORT ÖSSZES AKTÍV TÖREDÉKÉNEK LEKÉRÉSE
  console.log('szavazatLeadasa - JavaslatRepository.findByToredekCsoportId', {
    toredekCsoportId: javaslat.toredekCsoportId,
  });
  const osszesTöredek = await JavaslatRepository.findByToredekCsoportId(
    javaslat.toredekCsoportId
  );
  console.log('szavazatLeadasa - Összes töredék szám', { db: osszesTöredek.length });

  // 5. LÉPÉS - JOGOSULT TÖREDÉKEK KISZŰRÉSE
  // Csak azokra a töredékekre szavazunk, ahol az eembernek van tudatpontja az érintett entitáson
  const jogosultToredekek = []; // Ide gyűjtjük az elfogadottakat
  const atugrottToredekek = []; // Ide gyűjtjük az átugrott (nem jogosult) töredékeket

  for (const toredek of osszesTöredek) {
    // Minden töredéknél ellenőrizzük a jogosultságot
    console.log('szavazatLeadasa - Jogosultság ellenőrzés töredékre', {
      toredekId: toredek._id,
      toredekSorszam: toredek.toredekSorszam,
    });

    const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
      eemberId,
      toredek.erintettEntitasok // Az adott töredék érintett entitása
    );

    if (jogosultsag.jogosult) {
      // Van tudatpontja ezen a töredéken → szavazásra jogosult
      jogosultToredekek.push(toredek);
      console.log('szavazatLeadasa - Töredék JOGOSULT', { toredekId: toredek._id });
    } else {
      // Nincs tudatpontja → kihagyjuk, de rögzítjük
      atugrottToredekek.push({
        javaslatId: toredek._id,
        toredekSorszam: toredek.toredekSorszam,
        ok: `Nincs tudatpont ezen entitáson: ${jogosultsag.hianyzoEntitas}`,
      });
      console.log('szavazatLeadasa - Töredék ÁTUGORVA (nincs tudatpont)', {
        toredekId: toredek._id,
        hianyzoEntitas: jogosultsag.hianyzoEntitas,
      });
    }
  }

  // 6. LÉPÉS - ELLENŐRZÉS: VAN-E EGYÁLTALÁN JOGOSULT TÖREDÉK?
  // Ha egyetlen töredékre sem jogosult, hibát dobunk
  if (jogosultToredekek.length === 0) {
    throw new Error(
      'Nincs szavazási jogosultságod egyetlen töredékre sem ebből a töredékcsoportból.'
    );
  }

  // 7. LÉPÉS - SZAVAZAT LEADÁSA MINDEN JOGOSULT TÖREDÉKRE (egységesen ugyanolyan típussal)
  const toredekSzavazatok = []; // Az eredményeket ide gyűjtjük

  for (const toredek of jogosultToredekek) {
    console.log('szavazatLeadasa - Szavazat leadása töredékre', {
      toredekId: toredek._id,
      szavazatTipus,
    });

    // Szavazat mentése vagy felülírása (ha korábban más típusú szavazatot adott le, az felülíródik)
    const szavazat = await SzavazatRepository.createOrUpdate(
      eemberId,
      toredek._id.toString(), // A töredékjavaslat ID-ja
      szavazatTipus           // Egységesen ugyanolyan szavazat minden töredékre
    );

    // Töredékjavaslat megjelölése elavultként, hogy a cron job frissítse
    await JavaslatRepository.updateById(toredek._id.toString(), { ertekekElavultak: true });

    // Eredmény rögzítése
    toredekSzavazatok.push({
      javaslatId: toredek._id,
      toredekSorszam: toredek.toredekSorszam, // Töredék sorszáma (tájékoztatáshoz)
      szavazatTipus: szavazatTipus,
      siker: true,
    });

    console.log('szavazatLeadasa - Töredék szavazat elmentve', { toredekId: toredek._id });
  }

  // 8. LÉPÉS - EREDMÉNY VISSZAADÁSA
  const eredmeny = {
    siker: true,
    uzenet: `Szavazat sikeresen leadva ${jogosultToredekek.length} töredékre. Az értékek frissítése 1 percen belül megtörténik.`,
    isToredek: true,                        // Jelezzük, hogy töredékes szavazás volt
    toredekSzavazatok: toredekSzavazatok,   // Melyek töredékekre sikerült szavazni
    atugrottToredekek: atugrottToredekek,   // Melyek lettek kihagyva (nem volt jogosultság)
  };

  console.log('szavazatLeadasa - VÉGE (töredék)', {
    jogosultDb: jogosultToredekek.length,
    atugrottDb: atugrottToredekek.length,
  });

  return eredmeny;
}


  // SZAVAZAT TÖRLÉSE
  
// Szavazat visszavonása egy javaslatról.
// Ha a javaslat töredékjavaslat, akkor az összes töredékről visszavonja a szavazatot,
// ahol az eembernek van leadott szavazata.
// param: string eemberId   - A eember ID-ja
// param: string javaslatId - A javaslat ID-ja
// returns: Promise<Object> - A művelet eredménye
async szavazatTorlese(eemberId, javaslatId) {
  // Log a metódus elejére az értékekkel
  console.log('szavazatTorlese - KEZDÉS', { eemberId, javaslatId });

  // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA
  if (!eemberId) throw new Error('A eember azonosítója kötelező');
  if (!javaslatId) throw new Error('A javaslat azonosítója kötelező');

  // 2. LÉPÉS - JAVASLAT STÁTUSZÁNAK ELLENŐRZÉSE
  console.log('szavazatTorlese - JavaslatRepository.findById', { javaslatId });
  const javaslat = await JavaslatRepository.findById(javaslatId);

  // Ha nincs ilyen javaslat, hibát dobunk
  if (!javaslat) throw new Error('A javaslat nem található');

  // Csak Aktiv státuszú javaslatról lehet visszavonni szavazatot
  if (javaslat.statusz !== 'Aktiv') {
    throw new Error('Csak Aktiv státuszú javaslatról vonható vissza a szavazat');
  }

  // 3. LÉPÉS - TÖREDÉKJAVASLAT VIZSGÁLATA
  const isToredek = !!javaslat.toredekCsoportId;
  console.log('szavazatTorlese - Töredék vizsgálat', {
    javaslatId,
    isToredek,
    toredekCsoportId: javaslat.toredekCsoportId ?? null,
  });

  // -----------------------------------------------------------------------
  // NEM TÖREDÉK ÁG - az eredeti, változatlan logika fut le
  // -----------------------------------------------------------------------
  if (!isToredek) {

    // 3a. SZAVAZAT LÉTEZÉSÉNEK ELLENŐRZÉSE
    console.log('szavazatTorlese - SzavazatRepository.findByeemberAndJavaslat', {
      eemberId,
      javaslatId,
    });
    const szavazat = await SzavazatRepository.findByeemberAndJavaslat(eemberId, javaslatId);

    // Ha nincs szavazat, nincs mit visszavonni
    if (!szavazat) throw new Error('Nem található szavazat ezen a javaslaton');

    // 3b. SZAVAZAT TÖRLÉSE
    console.log('szavazatTorlese - SzavazatRepository.deleteSzavazat', { eemberId, javaslatId });
    await SzavazatRepository.deleteSzavazat(eemberId, javaslatId);

    // 3c. ELAVULT JELZŐ BEÁLLÍTÁSA - cron job frissíti majd
    await JavaslatRepository.updateById(javaslatId, { ertekekElavultak: true });
    console.log('szavazatTorlese - Javaslat megjelölve elavultként (nem töredék)', { javaslatId });

    // 3d. EREDMÉNY VISSZAADÁSA
    const eredmeny = {
      siker: true,
      uzenet: 'Szavazat sikeresen visszavonva.',
      isToredek: false,
    };
    console.log('szavazatTorlese - VÉGE (nem töredék)', { eredmeny });
    return eredmeny;
  }

  // -----------------------------------------------------------------------
  // TÖREDÉK ÁG - visszavonja a szavazatot minden töredékről, ahol van
  // -----------------------------------------------------------------------

  // 4. LÉPÉS - CSOPORT ÖSSZES AKTÍV TÖREDÉKÉNEK LEKÉRÉSE
  console.log('szavazatTorlese - JavaslatRepository.findByToredekCsoportId', {
    toredekCsoportId: javaslat.toredekCsoportId,
  });
  const osszesTöredek = await JavaslatRepository.findByToredekCsoportId(
    javaslat.toredekCsoportId
  );
  console.log('szavazatTorlese - Összes töredék szám', { db: osszesTöredek.length });

  // 5. LÉPÉS - SZAVAZAT TÖRLÉSE MINDEN TÖREDÉKRŐL, AHOL VAN LEADOTT SZAVAZAT
  const toroltSzavazatok = [];   // Ide gyűjtjük a sikeresen törölteket
  const kihagyttToredekek = [];  // Ide gyűjtjük, ahol nem volt szavazat

  for (const toredek of osszesTöredek) {
    // Megnézzük, van-e az eembernek szavazata ezen a töredéken
    console.log('szavazatTorlese - Szavazat keresése töredéken', { toredekId: toredek._id });

    const szavazat = await SzavazatRepository.findByeemberAndJavaslat(
      eemberId,
      toredek._id.toString() // A töredékjavaslat ID-ja
    );

    if (szavazat) {
      // Van szavazata → töröljük
      await SzavazatRepository.deleteSzavazat(
        eemberId,
        toredek._id.toString()
      );

      // Töredék megjelölése elavultként, hogy a cron job frissítse
      await JavaslatRepository.updateById(
        toredek._id.toString(),
        { ertekekElavultak: true }
      );

      // Törölt szavazat rögzítése
      toroltSzavazatok.push({
        javaslatId: toredek._id,
        toredekSorszam: toredek.toredekSorszam,
      });

      console.log('szavazatTorlese - Töredék szavazat törölve', { toredekId: toredek._id });
    } else {
      // Nincs szavazat ezen a töredéken → kihagyjuk (nem hiba, csak jelezzük)
      kihagyttToredekek.push({
        javaslatId: toredek._id,
        toredekSorszam: toredek.toredekSorszam,
        ok: 'Ezen a töredéken nem volt leadott szavazat',
      });

      console.log('szavazatTorlese - Töredéken nincs szavazat, kihagyva', {
        toredekId: toredek._id,
      });
    }
  }

  // 6. LÉPÉS - ELLENŐRZÉS: TÖRÖLTÜNK-E EGYÁLTALÁN VALAMIT?
  // Ha egyetlen töredéken sem volt szavazat, azt jelezzük
  if (toroltSzavazatok.length === 0) {
    throw new Error(
      'Nem található visszavonható szavazat egyetlen töredéken sem ebből a töredékcsoportból.'
    );
  }

  // 7. LÉPÉS - EREDMÉNY VISSZAADÁSA
  const eredmeny = {
    siker: true,
    uzenet: `Szavazat sikeresen visszavonva ${toroltSzavazatok.length} töredékről.`,
    isToredek: true,                       // Töredékes visszavonás volt
    toroltSzavazatok: toroltSzavazatok,    // Melyek töredékekről sikerült visszavonni
    kihagyttToredekek: kihagyttToredekek,  // Melyek lettek kihagyva (nem volt szavazat)
  };

  console.log('szavazatTorlese - VÉGE (töredék)', {
    toroltDb: toroltSzavazatok.length,
    kihagyttDb: kihagyttToredekek.length,
  });

  return eredmeny;
}


  // ===================================
  // EMBER SZAVAZATÁNAK LEKÉRÉSE
  // ===================================
  /**
   * Egy eember szavazatának lekérése egy javaslaton
   * @param {string} eemberId - A eember ID-ja
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise} A szavazat vagy null
   */
  async eemberSzavazatanakLekerese(eemberId, javaslatId) {

    console.log("=================================== eemberSzavazatanakLekerese:: ", {
      eemberId: eemberId,
      javaslatId: javaslatId
    });
    
    // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA
    if (!eemberId) {
      throw new Error('A eember azonosítója kötelező');
    }

    if (!javaslatId) {
      throw new Error('A javaslat azonosítója kötelező');
    }

    // 2. LÉPÉS - SZAVAZAT LEKÉRÉSE

    console.log("eemberSzavazatanakLekerese >>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByeEmberAndJavaslat", {
      eemberId: eemberId,
      javaslatId: javaslatId
    });
    
    const szavazat = await SzavazatRepository.findByeEmberAndJavaslat(
      eemberId,
      javaslatId
    );

    console.log("<<<<<<<<<<<<<<<<<<<<<< eemberSzavazatanakLekerese====szavazat: ", {
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
   * Egy eember összes szavazatának lekérése
   * @param {string} eemberId - A eember ID-ja
   * @param {number} limit - Maximum ennyi szavazat (opcionális)
   * @returns {Promise} Szavazatok tömb
   */
  async eemberSzavazatainakLekerese(eemberId, limit = null) {

    console.log("=================================== eemberSzavazatainakLekerese:: ", {
      eemberId: eemberId,
      limit: limit
    });
    
    // 1. LÉPÉS - PARAMÉTER VALIDÁLÁSA
    if (!eemberId) {
      throw new Error('A eember azonosítója kötelező');
    }

    // 2. LÉPÉS - SZAVAZATOK LEKÉRÉSE

    console.log("eemberSzavazatainakLekerese >>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByeEmberId", {
      eemberId: eemberId,
      limit: limit
    });
    
    const szavazatok = await SzavazatRepository.findByeEmberId(
      eemberId,
      limit
    );

    console.log("<<<<<<<<<<<<<<<<<< eemberSzavazatainakLekerese====szavazatok", {
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
