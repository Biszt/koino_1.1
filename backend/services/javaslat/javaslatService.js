// backend/services/javaslat/javaslatService.js

// ===================================
// IMPORTOK
// ===================================

// Repository importálása - adatbázis műveletek
const JavaslatRepository = require('../../repositories/javaslatRepository');
const SzavazatRepository = require('../../repositories/szavazatRepository');
const TartalomRepository = require('../../repositories/tartalomRepository'); 
const KategoriaRepository = require('../../repositories/kategoriaRepository'); 
const TartalomTipusRepository = require('../../repositories/tartalomTipusRepository');
const TudatpontRepository = require('../../repositories/tudatpontRepository');

// Segéd szolgáltatások importálása
const JavaslatSzamitasService = require('./javaslatSzamitasService');
const JavaslatIdozitesService = require('./javaslatIdozitesService');
const JavaslatJogosultsagService = require('./javaslatJogosultsagService');
const SzavazatService = require('../szavazatService');

// Tudatpont szolgáltatás importálása
const TudatpontService = require('../tudatpontService');


// ===================================
// JAVASLAT SERVICE OSZTÁLY
// ===================================
// Ez a fő koordinátor osztály a javaslatok kezeléséhez
// Felelősség: CRUD műveletek + orchestration (más service-ek hívása)
class JavaslatService {

  /**
   /**
 * ----- JAVASLAT LÉTREHOZÁSA -----
 * MÓDOSÍTVA: Szülő tartalom kötelező validáció + minden régi validáció visszatéve
 * Új javaslat létrehozása a rendszerben
 * @param {Object} javaslatAdatok - A javaslat adatai
 * @param {string} emberId - A létrehozó ember ID-ja
 * @param {number} kezdoTudatpont - Kezdeti tudatpont befektetés (legalább 1)
 * @returns {Promise<Object>} A létrehozott javaslat
 * @throws {Error} Ha validációs hiba van
 */
async javaslatLetrehozasa(javaslatAdatok, emberId, kezdoTudatpont) {
  // Log metódus kezdete
  console.log('javaslatLetrehozasa - KEZDÉS', { 
    javaslatAdatok, 
    emberId,
    kezdoTudatpont
  });
  
  // ===== 1. LÉPÉS - KÖTELEZŐ ALAPPARAMÉTEREK VALIDÁLÁSA =====
  
  // 1.1 - Javaslat típus
  if (!javaslatAdatok.javaslatTipus || !javaslatAdatok.javaslatTipus.trim()) {
    throw new Error('A javaslat típusa kötelező');
  }
  
  // 1.2 - Indoklás
  if (!javaslatAdatok.indoklas || !javaslatAdatok.indoklas.trim()) {
    throw new Error('Az indoklás megadása kötelező');
  }
  
  // 1.3 - Érintett entitások
  if (!javaslatAdatok.erintettEntitasok || javaslatAdatok.erintettEntitasok.length === 0) {
    throw new Error('Legalább egy érintett entitás megadása kötelező');
  }
  
  // 1.4 - Ember ID
  if (!emberId) {
    throw new Error('A létrehozó ember azonosítója szükséges');
  }
  
  // 1.5 - Kezdő tudatpont (ÚJ - VISSZATÉVE!)
  if (!kezdoTudatpont || kezdoTudatpont < 1) {
    throw new Error('Az inicializációs tudatpont legalább 1 kell legyen');
  }
  
  if (typeof kezdoTudatpont !== 'number' || isNaN(kezdoTudatpont)) {
    throw new Error('A kezdő tudatpont értéknek számnak kell lennie');
  }
  
  if (!Number.isInteger(kezdoTudatpont)) {
    throw new Error('A kezdő tudatpont értéknek egész számnak kell lennie');
  }
  
  // 2. LÉPÉS - SZÜLŐ VALIDÁLÁSA 
  // A javaslat létrehozáshoz kötelező egy szülő tartalom megadása
  if (!javaslatAdatok.szuloId) {
    throw new Error('A javaslat létrehozáshoz szülő tartalom megadása kötelező');
  }

  // Szülő tartalom létezésének ellenőrzése
  console.log('javaslatLetrehozasa - TartalomRepository.findById', {
    szuloId: javaslatAdatok.szuloId
  });
  const szuloTartalom = await TartalomRepository.findById(javaslatAdatok.szuloId);
  
  if (!szuloTartalom) {
    throw new Error('A megadott szülő tartalom nem található');
  }
  
  console.log('javaslatLetrehozasa - Szülő tartalom validálva', {
    szuloId: szuloTartalom.id,
    szuloCim: szuloTartalom.cim
  });

  // 2.A LÉPÉS - EGYEZMÉNY TÁRHELY VALIDÁLÁSA
  // MÓDOSÍTVA: Speciális "eeeeeeeeeeeeeeeeeeee0001" érték támogatása egyesítésnél
  if (javaslatAdatok.egyezmenyTarhelyId) {
    // Speciális érték: az új entitás lesz az egyezmény tárhelye
    if (javaslatAdatok.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001') {
      // Ellenőrizzük, hogy csak Egyesites típusnál használható
      if (javaslatAdatok.javaslatTipus !== 'Egyesites') {
        throw new Error('Az "eeeeeeeeeeeeeeeeeeee0001" egyezmény tárhely csak Egyesites típusú javaslat esetén használható');
      }
      console.log('javaslatLetrehozasa - Egyezmény tárhely: eeeeeeeeeeeeeeeeeeee0001 - az új entitás lesz az egyezmény tárhelye');
    } else {
      // Normál validáció - létező Tartalom keresése
      console.log('javaslatLetrehozasa - TartalomRepository.findById', {
        egyezmenyTarhelyId: javaslatAdatok.egyezmenyTarhelyId
      });
      const egyezmenyTarhely = await TartalomRepository.findById(javaslatAdatok.egyezmenyTarhelyId);
      if (!egyezmenyTarhely) {
        throw new Error('A megadott egyezmény tárhely tartalom nem található');
      }
      console.log('javaslatLetrehozasa - Egyezmény tárhely validálva', {
        egyezmenyTarhelyId: egyezmenyTarhely.id,
        egyezmenyTarhelyCim: egyezmenyTarhely.cim
      });
    }
  } else {
    console.log('javaslatLetrehozasa - Nincs egyezmény tárhely megadva - null lesz az egyezmény szuloId-je');
  }


  
  // ===== 3. LÉPÉS - EMBER VALIDÁLÁSA =====
  // Ember létezésének ellenőrzése
  console.log('javaslatLetrehozasa - TudatpontRepository.findEmberById', { 
    emberId 
  });
  
  const ember = await TudatpontRepository.findEmberById(emberId);
  if (!ember) {
    throw new Error('Ember nem található');
  }
  
  // ===== 4. LÉPÉS - ÉRINTETT ENTITÁSOK VALIDÁLÁSA =====
  // Érintett entitások létezésének ellenőrzése
  console.log('javaslatLetrehozasa - Érintett entitások validálása', { 
    count: javaslatAdatok.erintettEntitasok.length 
  });
  
  for (const entitas of javaslatAdatok.erintettEntitasok) {
    let entitasLetezik = false;
    
    if (entitas.entitasTipus === 'Tartalom') {
      const tartalom = await TartalomRepository.findById(entitas.entitasId);
      entitasLetezik = !!tartalom;
    } else if (entitas.entitasTipus === 'Kategoria') {
      const kategoria = await KategoriaRepository.findById(entitas.entitasId);
      entitasLetezik = !!kategoria;
    } else if (entitas.entitasTipus === 'TartalomTipus') {
      const tartalomTipus = await TartalomTipusRepository.findById(entitas.entitasId);
      entitasLetezik = !!tartalomTipus;
    }
    
    if (!entitasLetezik) {
      throw new Error(`Érintett entitás (${entitas.entitasTipus}) nem található: ${entitas.entitasId}`);
    }
  }
  
  // ===== 5. LÉPÉS - SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE =====
  console.log('javaslatLetrehozasa - JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese');
  
  const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
    emberId,
    javaslatAdatok.erintettEntitasok
  );
  
  if (!jogosultsag.jogosult) {
    throw new Error(`Nincs szavazási jogosultságod. Hiányzó tudatpont ezen entitáson: ${jogosultsag.hianyzoEntitas}`);
  }
  
  console.log('javaslatLetrehozasa - Szavazási jogosultság OK');
  
  // ===== 6. LÉPÉS - JAVASLAT OBJEKTUM ÖSSZEÁLLÍTÁSA =====

  // Egyezmény tárhely érték meghatározása
  let egyezmenyTarhelyIdErtek = javaslatAdatok.egyezmenyTarhelyId || null;

  const ujJavaslatAdatok = {
    javaslatTipus: javaslatAdatok.javaslatTipus.trim(),
    erintettEntitasok: javaslatAdatok.erintettEntitasok,
    letrehozo: emberId,
    indoklas: javaslatAdatok.indoklas.trim(),
    szuloId: javaslatAdatok.szuloId,
    szuloTipus: 'Tartalom',
    egyezmenyTarhelyId: egyezmenyTarhelyIdErtek, 
    statusz: 'Aktiv',
    letrehozva: new Date()
  };

  // Egyesítés specifikus adatok hozzáadása (ha Egyesites típus)
  if (javaslatAdatok.javaslatTipus === 'Egyesites') {
    if (!javaslatAdatok.egyesitesAdatok) {
      throw new Error('Egyesítés típusnál az egyesitesAdatok megadása kötelező');
    }
    ujJavaslatAdatok.egyesitesAdatok = javaslatAdatok.egyesitesAdatok;
  }

  
  // ===== 7. LÉPÉS - JAVASLAT MENTÉSE =====
  console.log('javaslatLetrehozasa - JavaslatRepository.create');
  
  const ujJavaslat = await JavaslatRepository.create(ujJavaslatAdatok);
  
  // ===== 8. LÉPÉS - TUDATPONT HOZZÁRENDELÉS ===== (VISSZATÉVE!)
  console.log('javaslatLetrehozasa - TudatpontService.tudatpontHozzarendelese', {
    emberId,
    javaslatId: ujJavaslat._id,
    kezdoTudatpont
  });
  
  await TudatpontService.tudatpontHozzarendelese(
    emberId,
    ujJavaslat._id,
    'Javaslat',
    kezdoTudatpont
  );
  
  // ===== 9. LÉPÉS - AUTOMATIKUS TÁMOGATÓ SZAVAZAT ===== (VISSZATÉVE!)
  console.log('javaslatLetrehozasa - SzavazatService.szavazatLeadasa', {
    emberId,
    javaslatId: ujJavaslat._id,
    szavazatTipus: 'Tamogat'
  });
  
  await SzavazatService.szavazatLeadasa(
    emberId,
    ujJavaslat._id,
    'Tamogat'
  );
  
  // ===== 10. LÉPÉS - SZÁMÍTÁSOK FRISSÍTÉSE =====
  console.log('javaslatLetrehozasa - JavaslatSzamitasService.szamitottErtekekFrissitese');
  
  await JavaslatSzamitasService.szamitottErtekekFrissitese(ujJavaslat._id);
  
  // ===== 11. LÉPÉS - HATÁLYBA LÉPÉSI IDŐ BEÁLLÍTÁSA ===== (VISSZATÉVE!)
  console.log('javaslatLetrehozasa - JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa');
  
  await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(ujJavaslat._id);
  
  // ===== 12. LÉPÉS - FRISSÍTETT JAVASLAT LEKÉRÉSE =====
  console.log('javaslatLetrehozasa - JavaslatRepository.findById');
  
  const frissitettJavaslat = await JavaslatRepository.findById(ujJavaslat._id);
  
  // Log metódus vége
  console.log('javaslatLetrehozasa - VÉGE', { 
    javaslatId: frissitettJavaslat._id 
  });
  
  return frissitettJavaslat;
}



  // ===================================
  // JAVASLAT LEKÉRÉSE
  // ===================================
  /**
   * Egy javaslat lekérése ID alapján
   * 
   * @param {string} id - A javaslat ID-ja
   * @returns {Promise<Object>} A javaslat objektum
   * @throws {Error} Ha a javaslat nem található
   */
  async javaslatLekerese(id) {

    console.log("=================================== javaslatLekerese:: ", {
      id: id
    });
    

    // === 1. LÉPÉS: ID VALIDÁLÁS ===
    if (!id) {
      throw new Error('A javaslat ID megadása kötelező');
    }

    // === 2. LÉPÉS: REPOSITORY HÍVÁS - JAVASLAT LEKÉRÉSE ===
    console.log("javaslatLekerese >>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById: ", {
      id: id
    });
    
    const javaslat = await JavaslatRepository.findById(id);

    // === 3. LÉPÉS: LÉTEZÉS ELLENŐRZÉSE ===
    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<< javaslatLekerese====javaslat: ", {
      javaslat: javaslat
    });
    

    return javaslat;
  }

  // ===================================
  // JAVASLATOK LISTÁZÁSA
  // ===================================
  /**
   * Javaslatok listázása szűrőkkel
   * 
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async javaslatokListazasa(szurok = {}) {

    console.log("=================================== javaslatokListazasa:: ", {
      szurok: szurok
    });
    

    // Repository hívás - javaslatok lekérése szűrőkkel
    console.log("javaslatLekerese >>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findAll: ", {
      szurok: szurok
    });

    const javaslatok = await JavaslatRepository.findAll(szurok);

    console.log("<<<<<<<<<<<<<<<<<<<<<< javaslatokListazasa===javaslatok: ", {
      javaslatok: javaslatok
    });    

    return javaslatok;
  }

  // ===================================
  // JAVASLAT RÉSZLETES ADATAINAK LEKÉRÉSE
  // ===================================

  /**
   * Javaslat részletes adatainak lekérése a ember szavazatával együtt
   * ÚJ: Ha az értékek elavultak, frissíti őket
   * @param {string} id - A javaslat ID-ja
   * @param {string} emberId - A ember ID-ja
   * @returns {Promise<Object>} { javaslat, emberSzavazat, szavazasiJogosultsag }
   */
  async javaslatReszleteinekLekerese(id, emberId) {
    console.log('=================================== javaslatReszleteinekLekerese: ', { 
      id: id, 
      emberId: emberId 
    });

    // === 1. LÉPÉS: JAVASLAT ALAPADATAINAK LEKÉRÉSE ===
    console.log("javaslatReszleteinekLekerese  >>>>>>>>>>>>>>>>>>> this.javaslatLekerese");
    
    let javaslat = await this.javaslatLekerese(id);

    // === ÚJ LÉPÉS: ELAVULT ÉRTÉKEK FRISSÍTÉSE ===
    // Ha a javaslat értékei elavultak, frissítjük őket
    if (javaslat.ertekekElavultak === true) {
      console.log('⚠️ Javaslat értékei elavultak, frissítés indítása:', id);
      
      // Számított értékek frissítése
      await JavaslatSzamitasService.szamitottErtekekFrissitese(id);
      
      // Hatályba lépési idő újraszámítása
      await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(id);
      
      // Elavult jelző törlése
      await JavaslatRepository.updateById(id, { ertekekElavultak: false });
      
      // Frissített javaslat újra lekérése
      javaslat = await JavaslatRepository.findById(id);
      
      console.log('✅ Javaslat értékei frissítve');
    }

    // === 2. LÉPÉS: EMBER SZAVAZATÁNAK LEKÉRÉSE (HA VAN) ===
    let emberSzavazat = null;
    if (emberId) {
      emberSzavazat = await SzavazatRepository.findByEmberAndJavaslat(
        emberId,
        id
      );
    }

    // === 3. LÉPÉS: SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE ===
    let szavazasiJogosultsag = false;
    if (emberId) {
      const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
        emberId,
        javaslat.erintettEntitasok
      );
      szavazasiJogosultsag = jogosultsag.jogosult;
    }

    // === 4. LÉPÉS: ÖSSZESÍTETT OBJEKTUM VISSZAADÁSA ===
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatReszleteinekLekerese=====Eredmény:', {
      javaslat: javaslat,
      emberSzavazat: emberSzavazat,
      szavazasiJogosultsag: szavazasiJogosultsag
    });

    return {
      javaslat: javaslat,
      emberSzavazat: emberSzavazat,
      szavazasiJogosultsag: szavazasiJogosultsag
    };
  }

  // ----- ELAVULT JAVASLATOK FRISSÍTÉSE -----
  /**
   * Az összes elavult Aktiv javaslat értékeinek frissítése
   * Cron job használja percenként
   * @returns {Promise<Object>} { osszesen, sikeresen, hibak }
   */
  async elavultJavaslatokFrissitese() {
    console.log('=================================== elavultJavaslatokFrissitese::');

    // === 1. LÉPÉS: ELAVULT JAVASLATOK LEKÉRÉSE ===
    console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findElavultJavaslatok: ", 'Aktiv');
    
    const elavultJavaslatIds = await JavaslatRepository.findElavultJavaslatok('Aktiv');
    
    console.log('Elavult javaslatok száma:', elavultJavaslatIds.length);

    // Ha nincs elavult javaslat, visszatérünk
    if (elavultJavaslatIds.length === 0) {
      console.log('Nincs elavult javaslat');
      return { osszesen: 0, sikeresen: 0, hibak: [] };
    }

    // === 2. LÉPÉS: MINDEN ELAVULT JAVASLAT FRISSÍTÉSE ===
    const eredmeny = {
      osszesen: elavultJavaslatIds.length,
      sikeresen: 0,
      hibak: []
    };

    for (const javaslatId of elavultJavaslatIds) {
      try {
        console.log('Javaslat frissítése:', javaslatId);

        // Számított értékek frissítése
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatSzamitasService.szamitottErtekekFrissitese");

        await JavaslatSzamitasService.szamitottErtekekFrissitese(javaslatId);
        
        // Hatályba lépési idő újraszámítása
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa");

        await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(javaslatId);
        
        // Elavult jelző törlése
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateById: ", {
          javaslatId: javaslatId,
          ertekekElavultak: 'false'
        });

        await JavaslatRepository.updateById(javaslatId, { ertekekElavultak: false });

        eredmeny.sikeresen++;
        console.log('✅ Javaslat sikeresen frissítve:', javaslatId);

      } catch (error) {
        // Hiba esetén rögzítjük, de folytatjuk a többi javaslattal
        console.error('❌ Javaslat frissítési hiba:', javaslatId, error.message);
        eredmeny.hibak.push({
          javaslatId: javaslatId,
          hiba: error.message
        });
      }
    }

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< elavultJavaslatokFrissitese=====Eredmény:', eredmeny);
    return eredmeny;
  }



  // ===================================
  // STÁTUSZ FRISSÍTÉSE
  // ===================================
  /**
   * Egy javaslat státuszának módosítása
   * 
   * @param {string} id - A javaslat ID-ja
   * @param {string} ujStatusz - Az új státusz
   * @returns {Promise<Object>} A frissített javaslat
   * @throws {Error} Ha érvénytelen státusz
   */
  async statuszFrissitese(id, ujStatusz) {

    console.log("=================================== statuszFrissitese:: ", {
      id: id,
      ujStatusz: ujStatusz
    });

    // === 2. LÉPÉS: STÁTUSZ VALIDÁLÁSA ===
    const megengedettStatuszok = ['Aktiv', 'Elfogadva', 'Elvetve', 'Hiba'];

    if (!megengedettStatuszok.includes(ujStatusz)) {
      throw new Error(`Érvénytelen státusz. Megengedett értékek: ${megengedettStatuszok.join(', ')}`);
    }

    // === 3. LÉPÉS: REPOSITORY HÍVÁS - STÁTUSZ FRISSÍTÉSE ===
    console.log("statuszFrissitese >>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz");
    
    const frissitettJavaslat = await JavaslatRepository.updateStatusz(id, ujStatusz);

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<< statuszFrissitese=====frissitettJavaslat: ", {
      frissitettJavaslat: frissitettJavaslat
    });
    

    return frissitettJavaslat;
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatService();