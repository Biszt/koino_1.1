// backend/services/javaslat/vegrehajtok/athelyezesiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Tartalom repository importálása
const TartalomRepository = require('../../../repositories/tartalomRepository');

// ===================================
// ÁTHELYEZÉSI VÉGREHAJTÓ OSZTÁLY
// ===================================
// Ez az osztály felelős az áthelyezési javaslatok végrehajtásáért
// Felelősség: Tartalom szülőjének megváltoztatása, tudatpontok MEGMARADNAK
class AthelyezesiVegrehajto {

  // ===================================
  // VÉGREHAJTÁS
  // ===================================
  /**
   * Áthelyezési javaslat végrehajtása
   * Megváltoztatja a tartalom szülőjét (szuloId mező)
   * A tudatpontok MEGMARADNAK az entitáson (nem osztódnak vissza)
   * 
   * @param {Object} javaslat - A javaslat objektum
   * @returns {Promise<Object>} Végrehajtás eredménye
   */
  async vegrehajtas(javaslat) {

    console.log('=================================== vegrehajtas: ',
      'javaslat: ', javaslat
    );
    

    // === 1. LÉPÉS: VALIDÁLÁS ===
    if (!javaslat || !javaslat.erintettEntitasok) {
      throw new Error('Érvénytelen javaslat objektum');
    }

    const athelyezesiEredmenyek = [];

    // === 2. LÉPÉS: MINDEN ÉRINTETT TARTALOM FELDOLGOZÁSA ===
    for (const entitas of javaslat.erintettEntitasok) {

      // === 3. LÉPÉS: TÍPUS ELLENŐRZÉSE ===
      // Áthelyezés csak Tartalom típusra támogatott
      if (entitas.entitasTipus !== 'Tartalom') {
        athelyezesiEredmenyek.push({
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          athelyezve: false,
          hiba: 'Áthelyezés csak Tartalom típusra támogatott'
        });
        continue;
      }

      // === 4. LÉPÉS: ÚJ SZÜLŐ ID ELLENŐRZÉSE ===
      if (!entitas.modositasAdatok || !entitas.modositasAdatok.hasOwnProperty('ujSzuloId')) {
        athelyezesiEredmenyek.push({
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          athelyezve: false,
          hiba: 'Hiányzó ujSzuloId'
        });
        continue;
      }

      const ujSzuloId = entitas.modositasAdatok.ujSzuloId;

      // 5. LÉPÉS - ÁTHELYEZÉSI TRANZAKCIÓ
      let athelyezve = false;
      let hibaUzenet = null;

      try {
        // Egyszerűen csak frissítjük a tartalom szuloId mezőjét!
        console.log('vegrehajtas >>> TartalomRepository.updateById (szuloId)', {
          entitasId: entitas.entitasId,
          ujSzuloId: ujSzuloId
        });
        
        const frissitettTartalom = await TartalomRepository.updateById(
          entitas.entitasId,
          { szuloId: ujSzuloId }  // ✅ Ennyi az egész!
        );
        
        athelyezve = !!frissitettTartalom;
        console.log('✅ ÁTHELYEZÉS SIKERES');
        
      } catch (error) {
        hibaUzenet = error.message;
        console.error('❌ Áthelyezési hiba:', error.message);
      }



      // === 6. LÉPÉS: EREDMÉNY RÖGZÍTÉSE ===
      athelyezesiEredmenyek.push({
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        ujSzuloId: ujSzuloId,
        athelyezve: athelyezve,
        hiba: hibaUzenet
      });
    }

    // === 7. LÉPÉS: STATISZTIKÁK SZÁMÍTÁSA ===
    const athelyezveDb = athelyezesiEredmenyek.filter(e => e.athelyezve).length;
    const hibasDb = athelyezesiEredmenyek.filter(e => e.hiba).length;

    // === 8. LÉPÉS: EREDMÉNY VISSZAADÁSA ===

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<< vegrehajtas ', {
      tipus: 'Athelyezes',
      athelyezettEntitasok: athelyezesiEredmenyek,
      athelyezettEntitasokSzama: athelyezveDb,
      hibasEntitasokSzama: hibasDb
     });

    return {
      tipus: 'Athelyezes',
      athelyezettEntitasok: athelyezesiEredmenyek,
      athelyezettEntitasokSzama: athelyezveDb,
      hibasEntitasokSzama: hibasDb
    };
    
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Osztály singleton példány exportálása
module.exports = new AthelyezesiVegrehajto();