// backend/services/tudatpontService.js

// ===== REPOSITORY IMPORTÁLÁSA =====
const mongoose = require('mongoose');
const TudatpontRepository = require('../repositories/tudatpontRepository');
const TartalomRepository = require('../repositories/tartalomRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TartalomTipusRepository = require('../repositories/tartalomTipusRepository');
const JavaslatRepository = require('../repositories/javaslatRepository');
const EgyezmenyRepository = require('../repositories/egyezmenyRepository'); 
const HierarchikusTudatpontAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');


// ===== TUDATPONT SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az üzleti logikát
class TudatpontService {

  // ----- TUDATPONTOK HOZZÁRENDELÉSE -----
  /**
   * Tudatpontok hozzárendelése egy entitáshoz (tartalom/kategória/típus/javaslat/egyezmény)
   * Transaction használatával biztosítja a konzisztenciát
   * MÓDOSÍTVA: Hierarchikus tudatpont frissítés hozzáadva
   * @param {string} emberId - A ember azonosítója
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} ujPontok - Az új tudatpont érték (nem különbség!)
   * @returns {Promise<Object>} A művelet eredménye
   */
  async tudatpontHozzarendelese(emberId, entitasId, entitasTipus, ujPontok) {
    console.log('tudatpontHozzarendelese', {
      emberId: emberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      ujPontok: ujPontok
    });

    // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA (MINDEN ELLENŐRZÉS EGY HELYEN)
    
    // 1.A - Null/undefined ellenőrzés
    if (!emberId || !entitasId || !entitasTipus) {
      throw new Error('Hiányzó kötelező paraméterek');
    }

    // 1.B - Tudatpontok típus validálása
    if (typeof ujPontok !== 'number' || isNaN(ujPontok)) {
      throw new Error('A pontok értéknek számnak kell lennie');
    }

    // 1.C - Negatív pontok tiltása
    if (ujPontok < 0) {
      throw new Error('A tudatpontok nem lehetnek negatívak');
    }

    // 1.D - Entitás típus validálása
    const megengedettTipusok = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'];
    if (!megengedettTipusok.includes(entitasTipus)) {
      throw new Error(`Érvénytelen entitás típus. Megengedett értékek: ${megengedettTipusok.join(', ')}`);
    }

    // 1.E - ENTITÁS LÉTEZÉSÉNEK ELLENŐRZÉSE (ÚJ!) - TRANSACTION ELŐTT!
    console.log('tudatpontHozzarendelese - Entitás létezésének ellenőrzése', {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });

    let entitasLetezik = false;

    if (entitasTipus === 'Tartalom') {
      console.log('tudatpontHozzarendelese - TartalomRepository.findById', { entitasId: entitasId });
      const tartalom = await TartalomRepository.findById(entitasId);
      entitasLetezik = !!tartalom;
    } else if (entitasTipus === 'Kategoria') {
      console.log('tudatpontHozzarendelese - KategoriaRepository.findById', { entitasId: entitasId });
      const kategoria = await KategoriaRepository.findById(entitasId);
      entitasLetezik = !!kategoria;
    } else if (entitasTipus === 'TartalomTipus') {
      console.log('tudatpontHozzarendelese - TartalomTipusRepository.findById', { entitasId: entitasId });
      const tartalomTipus = await TartalomTipusRepository.findById(entitasId);
      entitasLetezik = !!tartalomTipus;
    } else if (entitasTipus === 'Javaslat') {
      console.log('tudatpontHozzarendelese - JavaslatRepository.findById', { entitasId: entitasId });
      const javaslat = await JavaslatRepository.findById(entitasId);
      entitasLetezik = !!javaslat;
    } else if (entitasTipus === 'Egyezmeny') {
      console.log('tudatpontHozzarendelese - EgyezmenyRepository.findById', { entitasId: entitasId });
      const egyezmeny = await EgyezmenyRepository.findById(entitasId);
      entitasLetezik = !!egyezmeny;
    }

    // Ha az entitás nem létezik, hiba dobása TRANSACTION ELŐTT!
    if (!entitasLetezik) {
      throw new Error(`Az entitás (${entitasTipus}) nem található: ${entitasId}`);
    }

    console.log('tudatpontHozzarendelese - Entitás létezik, validáció sikeres', {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });

    // 2. LÉPÉS - MONGODB TRANSACTION INDÍTÁSA
    // Most már biztosak vagyunk benne, hogy minden paraméter érvényes
    // Így csak akkor indítunk transaction-t, ha tényleg szükséges
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. LÉPÉS - EMBER LEKÉRÉSE ÉS VALIDÁLÁSA
      console.log('tudatpontHozzarendelese - TudatpontRepository.findEmberById', { emberId: emberId });
      const ember = await TudatpontRepository.findEmberById(emberId);

      if (!ember) {
        throw new Error('Ember nem található');
      }

      // 4. LÉPÉS - RÉGI HOZZÁRENDELÉS LEKÉRÉSE (HA VAN)
      console.log('tudatpontHozzarendelese - TudatpontRepository.findHozzarendelesByEmberEsEntitas', {
        emberId: emberId
      });
      const regiHozzarendeles = await TudatpontRepository.findHozzarendelesByEmberEsEntitas(
        emberId,
        entitasId,
        entitasTipus
      );

      // Régi pontok meghatározása (ha nincs hozzárendelés, akkor 0)
      const regiPontok = regiHozzarendeles ? regiHozzarendeles.tudatPontok : 0;

      // 5. LÉPÉS - KÜLÖNBSÉG KISZÁMÍTÁSA
      // Különbség = új érték - régi érték
      // Pozitív → növelés (ember több pontot ad)
      // Negatív → csökkentés (ember visszavon pontokat)
      // Nulla → nincs változás
      const kulonbseg = ujPontok - regiPontok;

      // 6. LÉPÉS - ELLENŐRZÉS: VAN-E ELÉG TUDATPONT?
      // Csak akkor kell ellenőrizni, ha növelés történik (kulonbseg > 0)
      if (kulonbseg > 0 && ember.tudatpontok < kulonbseg) {
        throw new Error('Nincs elég tudatpont a művelet végrehajtásához');
      }

      // 7. LÉPÉS - EMBER EGYENLEGÉNEK MÓDOSÍTÁSA
      // Ha kulonbseg > 0: levonás (ember ad pontot)
      // Ha kulonbseg < 0: visszaadás (ember visszavon pontot)
      // Ha kulonbseg = 0: nincs változás
      if (kulonbseg !== 0) {
        const ujEgyenleg = ember.tudatpontok - kulonbseg;
        console.log('tudatpontHozzarendelese - TudatpontRepository.updateEmberTudatpontok', {
          emberId: emberId,
          ujEgyenleg: ujEgyenleg
        });
        await TudatpontRepository.updateEmberTudatpontok(emberId, ujEgyenleg);
      }

      // 8. LÉPÉS - HOZZÁRENDELÉS FRISSÍTÉSE/LÉTREHOZÁSA
      // Upsert: ha létezik frissíti, ha nem létrehozza
      console.log('tudatpontHozzarendelese - TudatpontRepository.upsertHozzarendeles', {
        emberId: emberId,
        entitasId: entitasId,
        entitasTipus: entitasTipus,
        ujPontok: ujPontok
      });
      await TudatpontRepository.upsertHozzarendeles(emberId, entitasId, entitasTipus, ujPontok);

          // 9. LÉPÉS - ALLOKÁCIÓ FRISSÍTÉSE
        // Az allokáció mezőit frissíteni kell a különbség alapján
        
        // 9.A - Határozzuk meg, mi változott
        const ujHozzajarulo = (regiPontok === 0 && ujPontok > 0); // Új hozzájáruló: 0 -> valami
        const visszavont = (regiPontok > 0 && ujPontok === 0);    // Visszavonás: valami -> 0
        const modositas = (regiPontok > 0 && ujPontok > 0);       // Módosítás: valami -> valami más
        
        // 9.B - Allokáció frissítése a megfelelő logikával
        if (ujHozzajarulo) {
          // ÚJ HOZZÁJÁRULÓ: osszesPont és hozzajarulokSzama is nő
          console.log('tudatpontHozzarendelese - TudatpontRepository.incrementAllokacio', 
            { entitasId, entitasTipus });
          await TudatpontRepository.incrementAllokacio(
            entitasId,
            entitasTipus,
            {
              osszesPont: ujPontok,        // Növeljük az új pontokkal
              hozzajarulokSzama: 1         // Új hozzájáruló (+1)
            }
          );
          
          // ✅ HIERARCHIKUS FRISSÍTÉS (előbb!)
          await this.hierarchikusFrissitesVegrehajtas(emberId, entitasId, entitasTipus, kulonbseg);
          
        } else if (visszavont) {
          // VISSZAVONÁS: osszesPont csökken, hozzajarulokSzama is csökken
          console.log('tudatpontHozzarendelese - TudatpontRepository.incrementAllokacio', 
            { entitasId, entitasTipus });
          await TudatpontRepository.incrementAllokacio(
            entitasId,
            entitasTipus,
            {
              osszesPont: -regiPontok,     // Csökkentjük a régi pontokkal
              hozzajarulokSzama: -1        // Hozzájáruló eltávolítása (-1)
            }
          );
          
          // ✅ HIERARCHIKUS FRISSÍTÉS (előbb!)
          await this.hierarchikusFrissitesVegrehajtas(emberId, entitasId, entitasTipus, kulonbseg);
          
          // ✅ TÖRLÉS ELLENŐRZÉS (utána!)
          // Entitás törlésének ellenőrzése transaction-ön belül!
          // Ha az allokáció 0 pontra csökkent, töröljük az entitást
          console.log('tudatpontHozzarendelese - this.entitasTorlesesEllenorzese');
          await this.entitasTorleseEllenorzese(entitasId, entitasTipus, session);
          
        } else if (modositas) {
          // MÓDOSÍTÁS: csak az osszesPont változik különbséggel
          console.log('tudatpontHozzarendelese - TudatpontRepository.incrementAllokacio', 
            { entitasId, entitasTipus, osszesPont: kulonbseg });
          await TudatpontRepository.incrementAllokacio(
            entitasId,
            entitasTipus,
            {
              osszesPont: kulonbseg        // Növelés vagy csökkentés a különbséggel
            }
          );
          
          // ✅ HIERARCHIKUS FRISSÍTÉS (előbb!)
          await this.hierarchikusFrissitesVegrehajtas(emberId, entitasId, entitasTipus, kulonbseg);
        }


      // 10. LÉPÉS - TRANSACTION COMMIT
      // Ha idáig eljutottunk, minden művelet sikeres volt
      await session.commitTransaction();

      // 11. LÉPÉS - EREDMÉNY VISSZAADÁSA
      console.log('tudatpontHozzarendelese - EREDMÉNY', {
        siker: true,
        ujEmberEgyenleg: ember.tudatpontok - kulonbseg,
        ujPontok: ujPontok,
        regiPontok: regiPontok,
        kulonbseg: kulonbseg
      });

      return {
        siker: true,
        ujEmberEgyenleg: ember.tudatpontok - kulonbseg,
        ujPontok: ujPontok,
        regiPontok: regiPontok,
        kulonbseg: kulonbseg
      };

    } catch (error) {
      // HIBA ESETÉN - TRANSACTION ROLLBACK
      // Minden változás visszavonódik (mintha mi sem történt volna)
      await session.abortTransaction();
      // Hiba továbbdobása (controller fogja elkapni)
      throw error;
    } finally {
      // SESSION LEZÁRÁSA
      // Mindenképpen lefut, hibával vagy anélkül
      session.endSession();
    }
  }

    /**
   * ----- HIERARCHIKUS FRISSÍTÉS VÉGREHAJTÁSA -----
   * Segédfüggvény a hierarchikus tudatpont frissítéshez
   * A különbség propagálása felfelé a szülő láncon
   * 
   * @param {string} emberId - Az ember azonosítója
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} kulonbseg - A tudatpont különbség
   * @returns {Promise<void>}
   */
  async hierarchikusFrissitesVegrehajtas(emberId, entitasId, entitasTipus, kulonbseg) {
    // Log metódus kezdete
    console.log('tudatpontHozzarendelese - HIERARCHIKUS FRISSÍTÉS KEZDÉS', { kulonbseg });
    
    // Csak akkor frissítünk, ha van változás
    if (kulonbseg !== 0) {
      // 1. LÉPÉS - Aktuális entitás hierarchikus pontjának frissítése
      console.log('tudatpontHozzarendelese - HierarchikusRepository.incrementHierarchikusPont (saját)', 
        { entitasId, entitasTipus, kulonbseg });
      await HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont(
        entitasId,
        entitasTipus,
        kulonbseg
      );
      
      // 2. LÉPÉS - Felfelé lépdelés a szülő láncon
      let aktualisEntitas = { entitasId, entitasTipus };
      
      while (true) {
        // Szülő lekérése
        console.log('tudatpontHozzarendelese - this.getSzuloEntitas', 
          { entitasId: aktualisEntitas.entitasId, entitasTipus: aktualisEntitas.entitasTipus });
        const szulo = await this.getSzuloEntitas(
          aktualisEntitas.entitasId,
          aktualisEntitas.entitasTipus
        );
        
        // Ha nincs szülő, elértük a gyökeret, megállunk
        if (!szulo || !szulo.szuloId) {
          console.log('tudatpontHozzarendelese - Elértük a gyökeret, STOP');
          break;
        }
        
        // Szülő hierarchikus pontjának frissítése
        console.log('tudatpontHozzarendelese - HierarchikusRepository.incrementHierarchikusPont (szülő)', 
          { szuloId: szulo.szuloId, szuloTipus: szulo.szuloTipus, kulonbseg });
        await HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont(
          szulo.szuloId,
          szulo.szuloTipus,
          kulonbseg
        );
        
        // Lépés a következő szintre (szülő -> nagyszülő)
        aktualisEntitas = { entitasId: szulo.szuloId, entitasTipus: szulo.szuloTipus };
      }
    }
    
    // Log metódus vége
    console.log('tudatpontHozzarendelese - HIERARCHIKUS FRISSÍTÉS VÉGE');
  }


  /**
 * ----- ENTITÁS TÖRLÉSÉNEK ELLENŐRZÉSE -----
 * MÓDOSÍTVA: Törlési kaszkád logika - gyerekek "feljebb lépnek"
 * Ellenőrzi az allokációt, és ha 0 pont van rajta, törli az entitást
 * Törlés előtt a gyermek entitások megkapják a törölt entitás szülőjét
 * Használat: tudatpontHozzarendelése visszavonás esetén (transaction-ön belül)
 * @param {string} entitasId - Az entitás azonosítója
 * @param {string} entitasTipus - Az entitás típusa
 * @param {Object} session - MongoDB session (transaction-höz)
 * @returns {Promise<void>}
 */
async entitasTorleseEllenorzese(entitasId, entitasTipus, session) {
  // Log metódus kezdete
  console.log('entitasTorleseEllenorzese - KEZDÉS', { 
    entitasId, 
    entitasTipus 
  });
  
  // 1. LÉPÉS - Allokáció lekérése
  console.log('entitasTorleseEllenorzese - TudatpontRepository.findAllokaciByEntitas', { 
    entitasId, 
    entitasTipus 
  });
  
  const allokacio = await TudatpontRepository.findAllokaciByEntitas(
    entitasId, 
    entitasTipus
  );
  
  // 2. LÉPÉS - Ellenőrzés: Van-e allokáció ÉS 0 pont van-e rajta?
  // Ha nincs allokáció VAGY 0 pont van rajta → TÖRLÉS
  if (!allokacio || allokacio.osszesPont > 0) {
    console.log('entitasTorleseEllenorzese - Entitás NEM törlendő', { 
      allokacio: allokacio?.osszesPont || 0 
    });
    return; // Nincs törlés
  }
  
  console.log('entitasTorleseEllenorzese - Entitás törlendő (0 tudatpont)', { 
    entitasId, 
    entitasTipus 
  });
  
  // 3. LÉPÉS - Törölt entitás szülőjének lekérése (kaszkádhoz)
  let toroltEntitasSzuloId = null;
  let toroltEntitasSzuloTipus = null;
  
  if (entitasTipus === 'Tartalom') {
    const tartalom = await TartalomRepository.findById(entitasId);
    toroltEntitasSzuloId = tartalom?.szuloId || null;
    toroltEntitasSzuloTipus = tartalom?.szuloTipus || null;
  } else if (entitasTipus === 'Javaslat') {
    const javaslat = await JavaslatRepository.findById(entitasId);
    toroltEntitasSzuloId = javaslat?.szuloId || null;
    toroltEntitasSzuloTipus = javaslat?.szuloTipus || null;
  } else if (entitasTipus === 'Egyezmeny') {
    const egyezmeny = await EgyezmenyRepository.findById(entitasId);
    toroltEntitasSzuloId = egyezmeny?.szuloId || null;
    toroltEntitasSzuloTipus = egyezmeny?.szuloTipus || null;
  }
  
  console.log('entitasTorleseEllenorzese - Törölt entitás szülője', { 
    toroltEntitasSzuloId, 
    toroltEntitasSzuloTipus 
  });
  
  // 4. LÉPÉS - Gyerekek lekérése és frissítése (KASZKÁD)
  
  // 4.A - Tartalom gyerekek
  console.log('entitasTorleseEllenorzese - TartalomRepository.findBySzuloId', { 
    szuloId: entitasId 
  });
  
  const tartalomGyerekek = await TartalomRepository.findBySzuloId(entitasId);
  console.log('entitasTorleseEllenorzese - Tartalom gyerekek', { 
    count: tartalomGyerekek.length 
  });
  
  for (const gyerek of tartalomGyerekek) {
    console.log('entitasTorleseEllenorzese - TartalomRepository.updateSzuloId', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId,
      ujSzuloTipus: toroltEntitasSzuloTipus
    });
    
    await TartalomRepository.updateSzuloId(
      gyerek._id, 
      toroltEntitasSzuloId, 
      toroltEntitasSzuloTipus
    );
    
    console.log('entitasTorleseEllenorzese - Tartalom gyerek frissítve', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId 
    });
  }
  
  // 4.B - Javaslat gyerekek
  console.log('entitasTorleseEllenorzese - JavaslatRepository.findBySzuloId', { 
    szuloId: entitasId 
  });
  
  const javaslatGyerekek = await JavaslatRepository.findBySzuloId(entitasId);
  console.log('entitasTorleseEllenorzese - Javaslat gyerekek', { 
    count: javaslatGyerekek.length 
  });
  
  for (const gyerek of javaslatGyerekek) {
    console.log('entitasTorleseEllenorzese - JavaslatRepository.updateSzuloId', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId,
      ujSzuloTipus: toroltEntitasSzuloTipus
    });
    
    await JavaslatRepository.updateSzuloId(
      gyerek._id, 
      toroltEntitasSzuloId, 
      toroltEntitasSzuloTipus
    );
    
    console.log('entitasTorleseEllenorzese - Javaslat gyerek frissítve', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId 
    });
  }
  
  // 4.C - Egyezmény gyerekek
  console.log('entitasTorleseEllenorzese - EgyezmenyRepository.findBySzuloId', { 
    szuloId: entitasId 
  });
  
  const egyezmenyGyerekek = await EgyezmenyRepository.findBySzuloId(entitasId);
  console.log('entitasTorleseEllenorzese - Egyezmény gyerekek', { 
    count: egyezmenyGyerekek.length 
  });
  
  for (const gyerek of egyezmenyGyerekek) {
    console.log('entitasTorleseEllenorzese - EgyezmenyRepository.updateSzuloId', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId,
      ujSzuloTipus: toroltEntitasSzuloTipus
    });
    
    await EgyezmenyRepository.updateSzuloId(
      gyerek._id, 
      toroltEntitasSzuloId, 
      toroltEntitasSzuloTipus
    );
    
    console.log('entitasTorleseEllenorzese - Egyezmény gyerek frissítve', { 
      gyerekId: gyerek._id, 
      ujSzuloId: toroltEntitasSzuloId 
    });
  }
  
  // 5. LÉPÉS - SPECIÁLIS ESET: Kategória törlése
  if (entitasTipus === 'Kategoria') {
    // Tartalmak kategoriaIds tömbjéből eltávolítjuk a törölt kategóriát
    console.log('entitasTorleseEllenorzese - Kategória törlése - Tartalmak tisztítása', { 
      kategoriaId: entitasId 
    });
    
    console.log('entitasTorleseEllenorzese - TartalomRepository.removeCategoriaFromAll');
    
    await TartalomRepository.removeCategoriaFromAll(entitasId);
    
    console.log('entitasTorleseEllenorzese - Kategória eltávolítva minden tartalom kategoriaIds tömbjéből');
  }
  
  // 6. LÉPÉS - SPECIÁLIS ESET: TartalomTípus törlése
  if (entitasTipus === 'TartalomTipus') {
    // Tartalmak tartalomTipusId mezőjét null-ra állítjuk
    console.log('entitasTorleseEllenorzese - TartalomTípus törlése - Tartalmak tisztítása', { 
      tartalomTipusId: entitasId 
    });
    
    console.log('entitasTorleseEllenorzese - TartalomRepository.removeTartalomTipusFromAll');
    
    await TartalomRepository.removeTartalomTipusFromAll(entitasId);
    
    console.log('entitasTorleseEllenorzese - TartalomTípus eltávolítva minden tartalomból');
  }
  
  // 7. LÉPÉS - Entitás törlése típus szerint
  if (entitasTipus === 'Tartalom') {
    console.log('entitasTorleseEllenorzese - TartalomRepository.deleteById', { 
      entitasId 
    });
    
    await TartalomRepository.deleteById(entitasId);
    console.log('entitasTorleseEllenorzese - Tartalom törölve', { entitasId });
    
  } else if (entitasTipus === 'Kategoria') {
    console.log('entitasTorleseEllenorzese - KategoriaRepository.deleteById', { 
      entitasId 
    });
    
    await KategoriaRepository.deleteById(entitasId);
    console.log('entitasTorleseEllenorzese - Kategória törölve', { entitasId });
    
  } else if (entitasTipus === 'TartalomTipus') {
    console.log('entitasTorleseEllenorzese - TartalomTipusRepository.deleteById', { 
      entitasId 
    });
    
    await TartalomTipusRepository.deleteById(entitasId);
    console.log('entitasTorleseEllenorzese - TartalomTípus törölve', { entitasId });
    
  } else if (entitasTipus === 'Javaslat') {
    console.log('entitasTorleseEllenorzese - JavaslatRepository.deleteById', { 
      entitasId 
    });
    
    await JavaslatRepository.deleteById(entitasId);
    console.log('entitasTorleseEllenorzese - Javaslat törölve', { entitasId });
    
  } else if (entitasTipus === 'Egyezmeny') {
    console.log('entitasTorleseEllenorzese - EgyezmenyRepository.deleteById', { 
      entitasId 
    });
    
    await EgyezmenyRepository.deleteById(entitasId);
    console.log('entitasTorleseEllenorzese - Egyezmény törölve', { entitasId });
    
  } else {
    console.warn('entitasTorleseEllenorzese - Ismeretlen entitás típus', { 
      entitasTipus 
    });
    return;
  }
  
  // 8. LÉPÉS - Allokáció törlése (ha van)
  if (allokacio) {
    console.log('entitasTorleseEllenorzese - TudatpontRepository.deleteAllokaciByEntitas', { 
      entitasId, 
      entitasTipus 
    });
    
    await TudatpontRepository.deleteAllokaciByEntitas(entitasId, entitasTipus);
    console.log('entitasTorleseEllenorzese - Allokáció törölve', { 
      entitasTipus, 
      entitasId 
    });
  }
  
  // 9. LÉPÉS - Hierarchikus allokáció törlése
  console.log('entitasTorleseEllenorzese - HierarchikusTudatpontAllokaciRepository.deleteByEntitas', {
    entitasId,
    entitasTipus
  });
  
  await HierarchikusTudatpontAllokaciRepository.deleteByEntitas(entitasId, entitasTipus);
  
  console.log('entitasTorleseEllenorzese - Hierarchikus allokáció törölve', {
    entitasTipus,
    entitasId
  });
  
  // Log metódus vége
  console.log('entitasTorleseEllenorzese - VÉGE', { 
    entitasId, 
    entitasTipus 
  });
}



  // ============================================================
  // ALLOKÁCIÓ LEKÉRDEZÉS
  // ============================================================

  // ----- ENTITÁS ALLOKÁCIÓJÁNAK LEKÉRÉSE -----
  // Entitáshoz tartozó tudatpont adatok lekérése
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @param {string|null} emberId - A ember azonosítója (opcionális)
  // @returns {Promise<Object>} A tudatpont adatok
  async entitasAllokaciLekerese(entitasId, entitasTipus, emberId = null) {

    console.log("=================================== entitasAllokaciLekerese:: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      emberId: emberId,
    });

    // 1. LÉPÉS - Allokáció lekérése

    console.log("entitasAllokaciLekerese >>>>>>>>>>>>>>>>>>>>>>>> TudatpontRepository.findAllokaciByEntitas", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    const allokacio = await TudatpontRepository.findAllokaciByEntitas(entitasId, entitasTipus);

    // 2. LÉPÉS - Ha nincs allokáció, üres adatok visszaadása
    if (!allokacio) {
      return {
        osszesPont: 0,
        hozzajarulokSzama: 0,
        felhasznaloHozzajarulas: 0
      };
    }

    // 3. LÉPÉS - Ember hozzájárulásának meghatározása (ha kérték)
    let felhasznaloHozzajarulas = 0;
    
    if (emberId) {

      console.log("entitasAllokaciLekerese >>>>>>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesByEmberEsEntitas", {
        emberId: emberId,
        entitasId: entitasId,
        entitasTipus: entitasTipus
      });
      const hozzarendeles = await TudatpontRepository.findHozzarendelesByEmberEsEntitas(
        emberId,
        entitasId,
        entitasTipus
      );
      
      if (hozzarendeles) {
        felhasznaloHozzajarulas = hozzarendeles.tudatPontok;
      }
    }

    // 4. LÉPÉS - Adatok visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<<< entitasAllokaciLekerese====Eredmény: ", {
      osszesPont: allokacio.osszesPont,
      hozzajarulokSzama: allokacio.hozzajarulokSzama,
      felhasznaloHozzajarulas: felhasznaloHozzajarulas,
      letrehozva: allokacio.letrehozva,
      frissitve: allokacio.frissitve
    });
    
    return {
      osszesPont: allokacio.osszesPont,
      hozzajarulokSzama: allokacio.hozzajarulokSzama,
      felhasznaloHozzajarulas: felhasznaloHozzajarulas,
      letrehozva: allokacio.letrehozva,
      frissitve: allokacio.frissitve
    };
  }

  // ----- SZÜLŐ ENTITÁS LEKÉRÉSE -----
  /**
   * Egy entitás szülőjének lekérése (szuloId, szuloTipus)
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<Object|null>} { szuloId, szuloTipus } vagy null ha nincs szülő
   */
  async getSzuloEntitas(entitasId, entitasTipus) {
    // Log metódus kezdete
    console.log('getSzuloEntitas - KEZDÉS', { entitasId, entitasTipus });

    // 1. LÉPÉS - Entitás lekérése típus szerint
    let entitas = null;

    if (entitasTipus === 'Tartalom') {
      // Tartalom szülője lehet Tartalom, Javaslat vagy Egyezmeny
      console.log('getSzuloEntitas - TartalomRepository.findById');
      entitas = await TartalomRepository.findById(entitasId);
    } else if (entitasTipus === 'Kategoria') {
      // Kategóriának NINCS szülője
      console.log('getSzuloEntitas - Kategoria - nincs szülő');
      return null;
    } else if (entitasTipus === 'TartalomTipus') {
      // TartalomTípusnak NINCS szülője
      console.log('getSzuloEntitas - TartalomTipus - nincs szülő');
      return null;
    } else if (entitasTipus === 'Javaslat') {
      // Javaslat szülője mindig Tartalom
      console.log('getSzuloEntitas - JavaslatRepository.findById');
      entitas = await JavaslatRepository.findById(entitasId);
    } else if (entitasTipus === 'Egyezmeny') {
      // Egyezmény szülője lehet Tartalom vagy null
      console.log('getSzuloEntitas - EgyezmenyRepository.findById');
      entitas = await EgyezmenyRepository.findById(entitasId);
    } else {
      // Ismeretlen típus
      console.warn('getSzuloEntitas - Ismeretlen entitás típus', entitasTipus);
      return null;
    }

    // 2. LÉPÉS - Ellenőrzés: létezik-e az entitás
    if (!entitas) {
      console.log('getSzuloEntitas - Entitás nem található');
      return null;
    }

    // 3. LÉPÉS - Szülő adatainak kinyerése
    const szuloId = entitas.szuloId || null;
    const szuloTipus = entitas.szuloTipus || null;

    // 4. LÉPÉS - Ellenőrzés: van-e szülő
    if (!szuloId || !szuloTipus) {
      console.log('getSzuloEntitas - Nincs szülő', { szuloId, szuloTipus });
      return null;
    }

    // Log metódus vége
    console.log('getSzuloEntitas - VÉGE', { szuloId, szuloTipus });

    // 5. LÉPÉS - Szülő adatainak visszaadása
    return {
      szuloId: szuloId,
      szuloTipus: szuloTipus
    };
  }


  // ============================================================
  // EMBER HOZZÁRENDELÉSEINEK LEKÉRDEZÉSE
  // ============================================================

  // ----- EMBER ÖSSZES HOZZÁRENDELÉSÉNEK LEKÉRÉSE -----
  // Ember tudatpont hozzárendeléseinek lekérdezése (lapozással)
  // @param {string} emberId - A ember azonosítója
  // @param {number} limit - Maximum ennyi hozzárendelés (alapértelmezett: 20)
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @returns {Promise<Array>} A hozzárendelések listája
  async emberHozzarendeleseinekLekerese(emberId, limit = 20, skip = 0) {

    console.log("=================================== emberHozzarendeleseinekLekerese:: ", {
      emberId: emberId,
      limit: limit,
      skip: skip,
    });
    
    // 1. LÉPÉS - Paraméter validálás
    if (!emberId) {
      throw new Error('A ember azonosítója kötelező');
    }

    // 2. LÉPÉS - Hozzárendelések lekérdezése

    console.log("emberHozzarendeleseinekLekerese >>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByEmber", {
      emberId: emberId,
      limit: limit,
      skip: skip
    });
    
    const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByEmber(
      emberId,
      limit,
      skip
    );

    // 3. LÉPÉS - Hozzárendelések visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< emberHozzarendeleseinekLekerese====hozzarendelesek", {
      hozzarendelesek: hozzarendelesek
    });
    
    return hozzarendelesek;
  }

  // ----- EMBER AKTÍV HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
  // Csak azok a hozzárendelések, ahol tudatPontok > 0
  // @param {string} emberId - A ember azonosítója
  // @param {number} limit - Maximum ennyi hozzárendelés
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @returns {Promise<Array>} Az aktív hozzárendelések listája
  async emberAktivHozzarendeleseinekLekerese(emberId, limit = 20, skip = 0) {

    console.log("=================================== emberHozzarendeleseinekLekerese:: ", {
      emberId: emberId,
      limit: limit,
      skip: skip,
    });
    
    
    // 1. LÉPÉS - Paraméter validálás
    if (!emberId) {
      throw new Error('A ember azonosítója kötelező');
    }

    // 2. LÉPÉS - Aktív hozzárendelések lekérdezése

    console.log("emberHozzarendeleseinekLekerese >>>>>>>>>>>>>>>>>> TudatpontRepository.findAktivHozzarendelesekByEmber ", {
      emberId: emberId,
      limit: limit,
      skip: skip,
    });
    
    const hozzarendelesek = await TudatpontRepository.findAktivHozzarendelesekByEmber(
      emberId,
      limit,
      skip
    );

    // 3. LÉPÉS - Hozzárendelések visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<< emberAktivHozzarendeleseinekLekerese====hozzarendelesek: ", {
      hozzarendelesek: hozzarendelesek
    });
    
    return hozzarendelesek;
  }

  // ============================================================
  // ENTITÁS HOZZÁJÁRULÓINAK LEKÉRDEZÉSE
  // ============================================================

  // ----- ENTITÁS HOZZÁJÁRULÓINAK LEKÉRÉSE -----
  // Egy entitás tudatpont hozzájárulóinak lekérése (lapozással)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @param {number} limit - Maximum ennyi hozzájáruló
  // @param {number} skip - Ennyi hozzájáruló kihagyása (lapozás)
  // @returns {Promise<Array>} A hozzájárulók listája (pontok szerint csökkenő sorrendben)
  async entitasHozzajaruloinakLekerese(entitasId, entitasTipus, limit = 100, skip = 0) {

    console.log("=================================== entitasHozzajaruloinakLekerese:: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      limit: limit,
      skip: skip,
    });
    
    
    // 1. LÉPÉS - Hozzájárulók lekérdezése
    // Pontok szerint csökkenő sorrendben (legnagyobb hozzájáruló először)

    console.log("entitasHozzajaruloinakLekerese >>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByEntitas", {
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      limit: limit,
      skip: skip,
    });
    
    const hozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitas(
      entitasId,
      entitasTipus,
      limit,
      skip
    );

    // 2. LÉPÉS - Hozzájárulók visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<< entitasHozzajaruloinakLekerese====hozzajarulok: ", {
      hozzajarulok: hozzajarulok
    });
    
    return hozzajarulok;
  }

  // ===== TUDATPONTOK VISSZAOSZTÁSA ENTITÁS TÖRLÉSKOR =====
  
  // ----- TUDATPONTOK VISSZAOSZTÁSA -----
  // Egy entitás összes tudatpontjának visszaosztása a hozzájárulóknak
  // Használat: entitás törléskor, javaslat végrehajtásakor (egyesítés, törlés)
  //  A tudatpontHozzarendelese függvényt használja (0 pont)
  //  Nyers metódust használ (populate nélkül - csak ObjectId-k)
  // Ez biztosítja:
  // - Event sourcing konzisztencia (minden művelet tudatpontHozzarendelese-n keresztül)
  // - Automatikus allokáció frissítés/törlés
  // - Tranzakció kezelés
  // - Tiszta ObjectId használat (nem populated objektum)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object>} { siker, visszaosztottPontok, emberekSzama }
  async tudatpontokVisszaosztasa(entitasId, entitasTipus) {

    console.log("=================================== tudatpontokVisszaosztasa: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    // 1. LÉPÉS - Entitás összes hozzárendelésének lekérése
    // ✅ JAVÍTVA: Nyers metódus használata (populate NÉLKÜL)
    // Így a emberId tiszta ObjectId lesz, nem populated objektum

    console.log("tudatpontokVisszaosztasa >>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByEntitasNyers", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
      entitasId,
      entitasTipus,
      999999, // Nagy limit - összes hozzárendelés (TODO: limit nélküli metódus készítése)
      0       // Skip 0 - az elejétől
    );

    // 2. LÉPÉS - Ha nincs hozzárendelés, nincs mit visszaosztani
    if (!hozzarendelesek || hozzarendelesek.length === 0) {

      console.log("<<<<<<<<<<<<<<<<<<<<<<< tudatpontokVisszaosztasa", {
        siker: true,
        visszaosztottPontok: 0,
        emberekSzama: 0
      });
      
      return {
        siker: true,
        visszaosztottPontok: 0,
        emberekSzama: 0
      };
    }

    // 3. LÉPÉS - Minden hozzájárulónak visszaadjuk a tudatpontjait
    // ✅ JAVÍTVA: A tudatpontHozzarendelese függvényt használjuk (ujPontok: 0)
    // Ez automatikusan:
    // - Visszaadja a ember egyenlegébe a pontokat (kulonbseg = 0 - regiPontok)
    // - Frissíti/törli a hozzárendelést (0 pontra állítja)
    // - Frissíti/törli az allokációt (osszesPont csökkentése, hozzajarulokSzama csökkentése)
    let visszaosztottPontok = 0;
    let emberekSzama = 0;

    for (const hozzarendeles of hozzarendelesek) {
      // Tudatpont hozzárendelés 0 pontra állítása
      // ✅ Most már a emberId tiszta ObjectId (nem populated objektum)

      console.log("tudatpontokVisszaosztasa >>>>>>>>>>>>>>>>>>>> this.tudatpontHozzarendelese",);
      await this.tudatpontHozzarendelese(
        hozzarendeles.emberId.toString(),  // ✅ Tiszta ObjectId toString()-je
        entitasId,
        entitasTipus,
        0 // ✅ 0 pont = visszavonás (pontok visszaadása a embernak)
      );

      // Statisztika frissítése
      visszaosztottPontok += hozzarendeles.tudatPontok;
      emberekSzama++;
    }

    // 4. LÉPÉS - Eredmény visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<< tudatpontokVisszaosztasa===Eredmény: ", {
      siker: true,
      visszaosztottPontok: visszaosztottPontok,
      emberekSzama: emberekSzama
    });
    
    return {
      siker: true,
      visszaosztottPontok: visszaosztottPontok,
      emberekSzama: emberekSzama
    };
  }

  // ============================================================
  // JAVASLAT RENDSZERHEZ SZÜKSÉGES MŰVELETEK
  // ============================================================

  // ----- ENTITÁS TUDATPONT TULAJDONOSAINAK LEKÉRÉSE -----
  // Egy entitás tudatpont tulajdonosainak ember ID-i
  // Használat: SZTTSZ és JTTTSZ számításhoz (javaslat rendszer)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Array>} Ember ID-k tömbje
  async entitasTudatpontTulajdonosainakLekerese(entitasId, entitasTipus) {

    console.log("=================================== entitasTudatpontTulajdonosainakLekerese:: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    // 1. LÉPÉS - Entitás hozzárendeléseinek lekérése

    console.log("entitasTudatpontTulajdonosainakLekerese >>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByEntitas", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByEntitas(
      entitasId,
      entitasTipus,
      999999,  // Nagy limit → összes hozzájáruló
      0
    );

    // 2. LÉPÉS - Ember ID-k kinyerése
    const emberIds = hozzarendelesek.map(h => h.emberId.toString());

    // 3. LÉPÉS - Ember ID-k visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<< entitasTudatpontTulajdonosainakLekerese===emberIds: ", {
      emberIds: emberIds
    });
    
    return emberIds;
  }

  // ----- TÖBB ENTITÁS EGYESÍTETT TUDATPONT TULAJDONOSAINAK LEKÉRÉSE -----
  // Több entitás tudatpont tulajdonosainak egyesített halmaza (egyedi emberek)
  // Használat: entitasokTudatpontTulajdonosokSzama (SZTTSZ) számításhoz
  // @param {Array} entitasok - Entitások tömbje [{entitasId, entitasTipus}, ...]
  // @returns {Promise<Array>} Egyedi ember ID-k tömbje
  async tobbEntitasEgyesitettHozzajaruloinakLekerese(entitasok) {

    console.log("=================================== tobbEntitasEgyesitettTudatpontTulajdonosainakLekerese:: ", {
      entitasok: entitasok
    });
    
    // 1. LÉPÉS - Egyedi emberek halmazának létrehozása
    // Set adatstruktúra → automatikusan egyedi elemek (duplikációk kiszűrése)
    const egyediFelhasznaloIds = new Set();

    // 2. LÉPÉS - Minden entitás tudatpont tulajdonosainak lekérése
    for (const entitas of entitasok) {

      console.log("tobbEntitasEgyesitettTudatpontTulajdonosainakLekerese >>>>>>>>>>>>>>>> this.entitasTudatpontTulajdonosainakLekerese");
      
      const tulajdonosok = await this.entitasTudatpontTulajdonosainakLekerese(
        entitas.entitasId,
        entitas.entitasTipus
      );

      // Hozzáadás a halmazhoz (duplikációk automatikusan kiszűrődnek)
      tulajdonosok.forEach(emberId => egyediFelhasznaloIds.add(emberId));
    }

    console.log("<<<<<<<<<<<<<<<<<<<<< tobbEntitasEgyesitettHozzajaruloinakLekerese=====egyediFelhasznaloIds: ", {
      egyediFelhasznaloIds: egyediFelhasznaloIds
    });
    

    // 3. LÉPÉS - Set → Array konverzió és visszaadás
    return Array.from(egyediFelhasznaloIds);
  }

  // ----- EMBER HOZZÁJÁRULÁSA ENTITÁSON (JOGOSULTSÁG ELLENŐRZÉS) -----
  // Ellenőrzi, hogy egy ember rendelkezik-e tudatponttal egy entitáson
  // Használat: szavazási jogosultság ellenőrzéshez (javaslat rendszer)
  // @param {string} emberId - A ember azonosítója
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object>} {vanHozzajarulas: boolean, pontok: number}
  async emberHozzajarulasaEntitason(emberId, entitasId, entitasTipus) {

    console.log("=================================== emberHozzajarulasaEntitason:: ", {
      emberId: emberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    // 1. LÉPÉS - Hozzárendelés lekérése

    console.log("emberHozzajarulasaEntitason >>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesByEmberEsEntitas", {
      emberId: emberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    const hozzarendeles = await TudatpontRepository.findHozzarendelesByEmberEsEntitas(
      emberId,
      entitasId,
      entitasTipus
    );

    // 2. LÉPÉS - Eredmény visszaadása
    if (hozzarendeles && hozzarendeles.tudatPontok > 0) {
      // Van hozzájárulás ÉS aktív (nem 0 pont)

      console.log('<<<<<<<<<<<<<<< emberHozzajarulasaEntitason ==== Eredmény: ', {
        vanHozzajarulas: true,
        pontok: hozzarendeles.tudatPontok
      });
      
      return {
        vanHozzajarulas: true,
        pontok: hozzarendeles.tudatPontok
      };
    } else {
      // Nincs hozzájárulás VAGY 0 pont

      console.log('<<<<<<<<<<<<<<< emberHozzajarulasaEntitason ==== Eredmény: ', {
        vanHozzajarulas: false,
        pontok: 0
      });

      return {
        vanHozzajarulas: false,
        pontok: 0
      };
    }
  }

}

// ===== EXPORTÁLÁS =====
// Service exportálása
module.exports = new TudatpontService();
