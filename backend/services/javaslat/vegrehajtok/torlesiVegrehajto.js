// backend/services/javaslat/vegrehajtok/torlesiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Tudatpont szolgáltatás importálása
const TudatpontService = require('../../tudatpontService');

// ===================================
// TÖRLÉSI VÉGREHAJTÓ OSZTÁLY
// ===================================
// Ez az osztály felelős a törlési javaslatok végrehajtásáért
// Felelősség: Tudatpontok visszaosztása, entitások automatikus törlése
class TorlesiVegrehajto {

  // ===================================
  // VÉGREHAJTÁS
  // ===================================
  /**
   * Törlési javaslat végrehajtása
   * Visszaosztja a tudatpontokat az érintett entitásokról
   * Az entitások AUTOMATIKUSAN törlődnek, ha 0 tudatpont van rajtuk
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

    const torlesiEredmenyek = [];

    // === 2. LÉPÉS: MINDEN ÉRINTETT ENTITÁS FELDOLGOZÁSA ===
    for (const entitas of javaslat.erintettEntitasok) {

      // === 3. LÉPÉS: TUDATPONTOK VISSZAOSZTÁSA ===
      // A TudatpontService automatikusan törli az entitást, ha 0 pont marad rajta
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontokVisszaosztasa");
      
      const visszaosztasEredmeny = await TudatpontService.tudatpontokVisszaosztasa(
        entitas.entitasId,
        entitas.entitasTipus
      );

      // === 4. LÉPÉS: EREDMÉNY RÖGZÍTÉSE ===
      torlesiEredmenyek.push({
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        torolve: visszaosztasEredmeny.entitasTorolve,
        visszaosztottPontok: visszaosztasEredmeny.visszaosztottPontok,
        eemberekSzama: visszaosztasEredmeny.eemberekSzama
      });
    }

    // === 5. LÉPÉS: STATISZTIKÁK SZÁMÍTÁSA ===
    const toroltDb = torlesiEredmenyek.filter(e => e.torolve).length;
    const visszaosztottOsszesen = torlesiEredmenyek.reduce((sum, e) => sum + e.visszaosztottPontok, 0);

    // === 6. LÉPÉS: EREDMÉNY VISSZAADÁSA ===

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<< vegrehajtas: ', {
      tipus: 'Torles',
      toroltEntitasok: torlesiEredmenyek,
      toroltEntitasokSzama: toroltDb,
      visszaosztottPontokOsszesen: visszaosztottOsszesen
     });

    return {
      tipus: 'Torles',
      toroltEntitasok: torlesiEredmenyek,
      toroltEntitasokSzama: toroltDb,
      visszaosztottPontokOsszesen: visszaosztottOsszesen
    };
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Osztály singleton példány exportálása
module.exports = new TorlesiVegrehajto();