// backend/services/egyezmenyService.js

// =====================================================
// IMPORTOK
// =====================================================
// Repository importálása - adatbázis műveletek
const EgyezmenyRepository = require('../repositories/egyezmenyRepository');
const SzavazatRepository = require('../repositories/szavazatRepository');

// Tudatpont szolgáltatás importálása
const TudatpontService = require('./tudatpontService');

// =====================================================
// EGYEZMÉNY SERVICE OSZTÁLY
// =====================================================
// Ez az osztály felelős az egyezmények kezeléséért
// Felelősség: egyezmény létrehozása, tudatpontok átrendezése javaslat→egyezmény
class EgyezmenyService {

/**
 * ----- EGYEZMÉNY LÉTREHOZÁSA -----
 * MÓDOSÍTVA: Egyezmény szülő a javaslat egyezmenyTarhelyId mezőjéből származik
 * Ha nincs megadva egyezmenyTarhelyId, akkor null lesz a szuloId
 * 
 * @param {Object} javaslat - A javaslat objektum
 * @param {Object} vegrehajatasEredmeny - A végrehajtás eredménye
 * @returns {Promise<Object>} Az új egyezmény objektum
 * @throws {Error} Ha validációs hiba van
 */
async egyezmenyLetrehozasa(javaslat, vegrehajatasEredmeny) {
  // Log metódus kezdete értékekkel
  console.log('egyezmenyLetrehozasa - KEZDÉS', {
    javaslatId: javaslat.id,
    egyezmenyTarhelyId: javaslat.egyezmenyTarhelyId,
    vegrehajatasEredmeny
  });

  // 1. LÉPÉS - VALIDÁLÁS
  // Javaslat objektum ellenőrzése
  if (!javaslat) {
    throw new Error('A javaslat objektum megadása kötelező');
  }
  
  // Végrehajtás eredményének ellenőrzése
  if (!vegrehajatasEredmeny) {
    throw new Error('A végrehajtás eredménye kötelező');
  }

  // 2. LÉPÉS - SZAVAZÁSI ADATOK LEKÉRÉSE
  // Támogatók számának lekérése
  console.log('egyezmenyLetrehozasa - SzavazatRepository.countTamogatok', {
    javaslatId: javaslat.id
  });
  const tamogatokSzama = await SzavazatRepository.countTamogatok(javaslat.id);
  
  // Ellenzők számának lekérése
  console.log('egyezmenyLetrehozasa - SzavazatRepository.countEllenzok', {
    javaslatId: javaslat.id
  });
  const ellenzokSzama = await SzavazatRepository.countEllenzok(javaslat.id);
  
  // Tartózkodók számának lekérése
  console.log('egyezmenyLetrehozasa - SzavazatRepository.countTartozkodok', {
    javaslatId: javaslat.id
  });
  const tartozkodokSzama = await SzavazatRepository.countTartozkodok(javaslat.id);
  
  // Szavazási adatok naplózása
  console.log('Szavazási adatok', {
    tamogatokSzama,
    ellenzokSzama,
    tartozkodokSzama
  });

  // 3. LÉPÉS - EGYEZMÉNY SZÜLŐ ID MEGHATÁROZÁSA
// Az egyezmény szülője a javaslat egyezmenyTarhelyId mezőjéből származik
// MÓDOSÍTVA: "eeeeeeeeeeeeeeeeeeee0001" speciális érték kezelése egyesítésnél
let egyezmenySzuloId = javaslat.egyezmenyTarhelyId || null;
let egyezmenySzuloTipus = egyezmenySzuloId ? 'Tartalom' : null;

// Speciális eset: "eeeeeeeeeeeeeeeeeeee0001" - az egyesítés során létrejött új entitás lesz az egyezmény tárhelye
if (javaslat.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001') {
  // Csak Egyesites típusnál lehetséges
  if (javaslat.javaslatTipus === 'Egyesites' && vegrehajatasEredmeny.ujEntitas) {
    // Új entitás ID-jának kinyerése a végrehajtási eredményből
    // Biztonságos ID kiolvasás - mindkét formátum támogatása
    const ujEntitasId = vegrehajatasEredmeny.ujEntitas?.id || vegrehajatasEredmeny.ujEntitas?._id || null;
    
    // Log új entitás ID kiolvasása
    console.log('Új entitás ID kiolvasása (eeeeeeeeeeeeeeeeeeee0001)', {
      'ujEntitas.id': vegrehajatasEredmeny.ujEntitas?.id,
      'ujEntitas._id': vegrehajatasEredmeny.ujEntitas?._id,
      'final': ujEntitasId
    });
    
    // Validáció: ID kötelező
    if (!ujEntitasId) {
      console.error('HIBA: Új entitás ID hiányzik', { vegrehajatasEredmeny });
      throw new Error('Az új entitás ID-ja nem található a végrehajtási eredményben (eeeeeeeeeeeeeeeeeeee0001)');
    }
    
    // Új entitás típusának meghatározása
    const ujEntitasTipus = vegrehajatasEredmeny.ujEntitas.tipus || 'Tartalom';
    
    // Egyezmény szülő beállítása az új entitásra
    egyezmenySzuloId = ujEntitasId;
    egyezmenySzuloTipus = ujEntitasTipus;
    
    console.log('Egyezmény szülő: ÚJ ENTITÁS', {
      egyezmenySzuloId: ujEntitasId,
      egyezmenySzuloTipus: ujEntitasTipus,
      forras: 'eeeeeeeeeeeeeeeeeeee0001 speciális érték'
    });
  } else {
    // Ha nem Egyesites típus, vagy nincs új entitás a végrehajtási eredményben
    throw new Error('Az "eeeeeeeeeeeeeeeeeeee0001" egyezmény tárhely csak Egyesites típusú javaslat esetén használható, és az új entitásnak létre kell jönnie');
  }
}

// Egyezmény szülő naplózása
console.log('Egyezmény szülő meghatározva', {
  egyezmenySzuloId: egyezmenySzuloId,
  egyezmenySzuloTipus: egyezmenySzuloTipus,
  forras: javaslat.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001' 
    ? 'eeeeeeeeeeeeeeeeeeee0001 speciális érték' 
    : 'javaslat.egyezmenyTarhelyId'
});



  // 4. LÉPÉS - EGYEZMÉNY OBJEKTUM ÖSSZEÁLLÍTÁSA
  const egyezmenyAdatok = {
    // Javaslat referencia
    javaslatId: javaslat.id,
    javaslatTipus: javaslat.javaslatTipus,
    
    // MÓDOSÍTOTT MEZŐK - Egyezmény tárhely a javaslat egyezmenyTarhelyId mezőjéből
    szuloId: egyezmenySzuloId,
    szuloTipus: egyezmenySzuloTipus,
    
    // Érintett entitások snapshot
    erintettEntitasok: javaslat.erintettEntitasok,
    
    // Indoklás snapshot
    indoklas: javaslat.indoklas,
    
    // Létrehozó
    letrehozo: javaslat.letrehozo._id || javaslat.letrehozo,
    
    // Végrehajtás időpontja
    vegrehajtva: new Date(),
    
    // Végrehajtási eredmény
    vegrehajatasEredmeny: vegrehajatasEredmeny,
    
    // Szavazási snapshot adatok
    tamogatokSzama: tamogatokSzama,
    ellenzokSzama: ellenzokSzama,
    tartozkodokSzama: tartozkodokSzama,
    reszveteliArany: javaslat.reszveteliArany || 0,
    tamogatotsagiArany: javaslat.tamogatotsagiArany || 0,
    bizonyossagiMutato: javaslat.bizonyossagiMutato || 0
  };

  // Egyesítés esetén az egyesítési adatok is kellenek
  if (javaslat.javaslatTipus === 'Egyesites' && javaslat.egyesitesAdatok) {
    // JAVÍTVA: Biztonságos ID kiolvasás - mindkét formátum támogatása
    const ujEntitasId = vegrehajatasEredmeny.ujEntitas?.id || 
                        vegrehajatasEredmeny.ujEntitas?._id || 
                        null;
    
    // Log új entitás ID kiolvasása
    console.log('Új entitás ID kiolvasása', {
      ujEntitasid: vegrehajatasEredmeny.ujEntitas?.id,
      ujEntitasidtype: typeof vegrehajatasEredmeny.ujEntitas?.id,
      ujEntitasidfinal: ujEntitasId
    });
    
    // Validáció: ID kötelező
    if (!ujEntitasId) {
      console.error('HIBA: ujEntitas struktúra', vegrehajatasEredmeny.ujEntitas);
      throw new Error('Az új entitás ID-ja nem található a végrehajtási eredményben');
    }
    
    // Egyesítési adatok hozzáadása
    egyezmenyAdatok.egyesitesAdatok = {
      ujEntitasTipus: javaslat.egyesitesAdatok.ujEntitasTipus,
      ujEntitasId: ujEntitasId,
      ujEntitasAdatok: javaslat.egyesitesAdatok.ujEntitasAdatok,
      forrasEntitasok: javaslat.erintettEntitasok.map(e => e.entitasId)
    };
  }

  // Módosítás esetén a módosítási adatok
  if (javaslat.javaslatTipus === 'Modositas') {
    // Módosítási adatok összegyűjtése entitásonként
    egyezmenyAdatok.modositasAdatok = javaslat.erintettEntitasok.reduce((acc, entitas) => {
      if (entitas.modositasAdatok) {
        acc[entitas.entitasId.toString()] = entitas.modositasAdatok;
      }
      return acc;
    }, {});
  }

  // Egyezmény adatok naplózása
  console.log('Egyezmény adatok összeállítva', {
    javaslatId: egyezmenyAdatok.javaslatId,
    szuloId: egyezmenyAdatok.szuloId,
    szuloTipus: egyezmenyAdatok.szuloTipus,
    egyesitesAdatok: egyezmenyAdatok.egyesitesAdatok
  });

  // 5. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA
  // Új egyezmény létrehozása az adatbázisban
  console.log('egyezmenyLetrehozasa - EgyezmenyRepository.create');
  const ujEgyezmeny = await EgyezmenyRepository.create(egyezmenyAdatok);

  // Log metódus vége értékekkel
  console.log('egyezmenyLetrehozasa - VÉGE', {
    ujEgyezmenyId: ujEgyezmeny.id,
    szuloId: ujEgyezmeny.szuloId
  });

  // Új egyezmény visszaadása
  return ujEgyezmeny;
}



  // ----- TUDATPONTOK ÁTRENDEZÉSE JAVASLAT→EGYEZMÉNY -----
  /**
   * Tudatpontok átrendezése a javaslatról az egyezményre
   * TÁMOGATÓK: javaslatról → egyezményre
   * ELLENZŐK & TARTÓZKODÓK: javaslatról → vissza a embernak
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @param {string} egyezmenyId - Az egyezmény MongoDB ObjectId-ja
   * @returns {Promise<Object>} Átrendezés eredménye
   * @throws {Error} Ha hiba történik
   */
  async tudatpontokAtrendezeseJavaslatrolEgyezmenyre(javaslatId, egyezmenyId) {
    // Log: metódus kezdete
    console.log("========================= tudatpontokAtrendezeseJavaslatrolEgyezmenyre", {
        javaslatId: javaslatId,
        egyezmenyId: egyezmenyId
    });

    // 1. LÉPÉS - SZAVAZATOK LEKÉRÉSE TÍPUS SZERINT
    console.log('1. LÉPÉS - Szavazatok lekérése...');
    
    // Összes szavazat lekérése a javaslatra
    console.log("tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByJavaslatId", {
       javaslatId: javaslatId 
    });
    
    const osszesszavazat = await SzavazatRepository.findByJavaslatId(javaslatId);
    
    console.log('Összes szavazat száma:', osszesszavazat.length);

    // Szavazatok szétválasztása típus szerint
    const tamogatoSzavazatok = osszesszavazat.filter(sz => sz.szavazatTipus === 'Tamogat');
    const ellenzoSzavazatok = osszesszavazat.filter(sz => sz.szavazatTipus === 'Ellenez');
    const tartozkodoSzavazatok = osszesszavazat.filter(sz => sz.szavazatTipus === 'Tartozkodik');

    console.log('Típusok szerinti bontás:', {
      tamogatok: tamogatoSzavazatok.length,
      ellenzok: ellenzoSzavazatok.length,
      tartozkodok: tartozkodoSzavazatok.length
    });

    // 2. LÉPÉS - TÁMOGATÓK TUDATPONTJAINAK ÁTKÖLTÖZTETÉSE
    console.log('2. LÉPÉS - Támogatók tudatpontjainak átköltöztetése...');
    
    let atkoltoztetettPontok = 0;
    let atkoltoztetettEmberek = 0;
    const tamogatoHibak = [];

    for (const szavazat of tamogatoSzavazatok) {
      try {
        const emberId = szavazat.emberId._id || szavazat.emberId;
        
        // A) Ember tudatpontjainak lekérése a javaslatról
        console.log("tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.emberHozzajarulasaEntitason",);
        const hozzarendeles = await TudatpontService.emberHozzajarulasaEntitason(
          emberId.toString(),
          javaslatId,
          'Javaslat'
        );

        if (hozzarendeles.vanHozzajarulas && hozzarendeles.pontok > 0) {
          const pontok = hozzarendeles.pontok;
          
          // B) Pontok visszaosztása a javaslatról (vissza a embernak)
          await TudatpontService.tudatpontHozzarendelese(
            emberId.toString(),
            javaslatId,
            'Javaslat',
            0 // 0 pont = visszavonás
          );

          // C) Pontok hozzárendelése az egyezményhez
          await TudatpontService.tudatpontHozzarendelese(
            emberId.toString(),
            egyezmenyId,
            'Egyezmeny',
            pontok // Ugyanannyi pont, mint a javaslaton volt
          );

          atkoltoztetettPontok += pontok;
          atkoltoztetettEmberek++;

          console.log(`Támogató: ${pontok} pont átköltöztetve - ${emberId}`);
        }

      } catch (error) {
        // Ha egy embernál hiba van, folytatjuk a többiekkel
        console.error('Hiba támogató tudatpont átköltöztetésénél:', error.message);
        tamogatoHibak.push({
          emberId: szavazat.emberId.toString(),
          hiba: error.message
        });
      }
    }

    console.log(`Támogatók: ${atkoltoztetettPontok} pont, ${atkoltoztetettEmberek} ember`);

    // 3. LÉPÉS - ELLENZŐK ÉS TARTÓZKODÓK PONTJAINAK VISSZAOSZTÁSA
    console.log('3. LÉPÉS - Ellenzők és tartózkodók pontjainak visszaosztása...');
    
    let visszaosztottPontok = 0;
    let visszaosztottEmberek = 0;
    const visszaosztasHibak = [];

    // Ellenzők és tartózkodók egyesített listája
    const visszaosztandoSzavazatok = [...ellenzoSzavazatok, ...tartozkodoSzavazatok];

    for (const szavazat of visszaosztandoSzavazatok) {
      try {
        const emberId = szavazat.emberId._id || szavazat.emberId;
        
        // Ember tudatpontjainak lekérése a javaslatról

        console.log("tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.emberHozzajarulasaEntitason",);
        const hozzarendeles = await TudatpontService.emberHozzajarulasaEntitason(
          emberId.toString(),
          javaslatId,
          'Javaslat'
        );

        if (hozzarendeles.vanHozzajarulas && hozzarendeles.pontok > 0) {
          const pontok = hozzarendeles.pontok;
          
          // Pontok visszaosztása a javaslatról (vissza a embernak)
          console.log("tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese",);
          await TudatpontService.tudatpontHozzarendelese(
            emberId.toString(),
            javaslatId,
            'Javaslat',
            0 // 0 pont = visszavonás → ember egyenlegére kerül
          );

          visszaosztottPontok += pontok;
          visszaosztottEmberek++;

          console.log(`${szavazat.szavazatTipus}: ${pontok} pont visszaosztva - ${emberId}`);
        }

      } catch (error) {
        // Ha egy embernál hiba van, folytatjuk a többiekkel
        console.error('Hiba ellenzó/tartozkodo tudatpont visszaosztásánál:', error.message);
        visszaosztasHibak.push({
          emberId: szavazat.emberId.toString(),
          hiba: error.message
        });
      }
    }

    console.log(`Ellenzők & Tartózkodók: ${visszaosztottPontok} pont, ${visszaosztottEmberek} ember`);

    // 4. LÉPÉS - EREDMÉNY ÖSSZESÍTÉSE
    const eredmeny = {
      siker: true,
      tamogatok: {
        atkoltoztetettPontok: atkoltoztetettPontok,
        atkoltoztetettEmberek: atkoltoztetettEmberek,
        hibak: tamogatoHibak
      },
      ellenzokEsTartozkodok: {
        visszaosztottPontok: visszaosztottPontok,
        visszaosztottEmberek: visszaosztottEmberek,
        hibak: visszaosztasHibak
      }
    };

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< tudatpontokAtrendezeseJavaslatrolEgyezmenyre', {
        eredmeny: eredmeny
    });

    return eredmeny;
  }

  // ----- EGYEZMÉNY LEKÉRÉSE -----
  /**
   * Egy egyezmény lekérése ID alapján
   * @param {string} id - Az egyezmény ID-ja
   * @returns {Promise<Object>} Az egyezmény objektum
   * @throws {Error} Ha az egyezmény nem található
   */
  async egyezmenyLekerese(id) {
    // Log: metódus kezdete
    console.log('=========================== egyezmenyLekerese', { 
        id: id
    });

    // 1. LÉPÉS - ID VALIDÁLÁS
    if (!id) {
      throw new Error('Az egyezmény ID megadása kötelező');
    }

    // 2. LÉPÉS - REPOSITORY HÍVÁS - EGYEZMÉNY LEKÉRÉSE
    console.log("egyezmenyLekerese >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findById", {
        id: id
    });
    
    const egyezmeny = await EgyezmenyRepository.findById(id);

    // 3. LÉPÉS - LÉTEZÉS ELLENŐRZÉSE
    if (!egyezmeny) {
      throw new Error('Az egyezmény nem található');
    }

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<< egyezmenyLekerese', { 
        egyezmeny: egyezmeny
     });

    return egyezmeny;
  }

  // ----- EGYEZMÉNYEK LISTÁZÁSA -----
  /**
   * Egyezmények listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @param {number} limit - Maximum ennyi egyezmény
   * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
   * @returns {Promise<Array>} Egyezmények tömb
   */
  async egyezmenyekListazasa(szurok = {}, limit = 20, skip = 0) {
    // Log: metódus kezdete
    console.log('============================ egyezmenyekListazasa', { 
        szurok: szurok, 
        limit: limit, 
        skip: skip 
    });

    // Repository hívás - egyezmények lekérése szűrőkkel
    console.log("egyezmenyekListazasa >>>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findAll", {
        szurok: szurok,
        limit: limit,
        skip: skip
    });
    
    const egyezmenyek = await EgyezmenyRepository.findAll(szurok, limit, skip);

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<< egyezmenyekListazasa', { 
        egyezmenyek: egyezmenyek
    });

    return egyezmenyek;
  }

  // ----- JAVASLAT EGYEZMÉNYE -----
  /**
   * Egy javaslathoz tartozó egyezmény lekérése
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise<Object|null>} Az egyezmény objektum vagy null
   */
  async javaslatEgyezmenye(javaslatId) {
    // Log: metódus kezdete
    console.log('========================= javaslatEgyezmenye', { 
        javaslatId: javaslatId
     });

    // 1. LÉPÉS - VALIDÁLÁS
    if (!javaslatId) {
      throw new Error('A javaslat ID megadása kötelező');
    }

    // 2. LÉPÉS - REPOSITORY HÍVÁS
    console.log("javaslatEgyezmenye >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findByJavaslatId", {
       javaslatId: javaslatId 
    });
    
    const egyezmeny = await EgyezmenyRepository.findByJavaslatId(javaslatId);

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatEgyezmenye', { 
        egyezmeny: egyezmeny
     });

    return egyezmeny;
  }

}

// =====================================================
// EXPORTÁLÁS
// =====================================================
// Service osztály singleton példány exportálása
module.exports = new EgyezmenyService();
