// backend/services/javaslat/vegrehajtok/modositasiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Repository-k importálása - entitások módosításához
const TartalomRepository = require('../../../repositories/tartalomRepository');
const KategoriaRepository = require('../../../repositories/kategoriaRepository');
const TartalomTipusRepository = require('../../../repositories/tartalomTipusRepository');

// ===================================
// MÓDOSÍTÁSI VÉGREHAJTÓ OSZTÁLY
// ===================================
// Ez az osztály felelős a módosítási javaslatok végrehajtásáért
// Felelősség: Entitások mezőinek módosítása, tudatpontok MEGMARADNAK
class ModositasiVegrehajto {

  // ===================================
  // VÉGREHAJTÁS
  // ===================================
  /**
   * Módosítási javaslat végrehajtása
   * Módosítja az entitás mezőit a modositasAdatok alapján
   * A tudatpontok MEGMARADNAK az entitáson (nem osztódnak vissza)
   * 
   * @param {Object} javaslat - A javaslat objektum
   * @returns {Promise<Object>} Végrehajtás eredménye
   */
  async vegrehajtas(javaslat) {
    console.log("=================================== vegrehajtas:: ", {
      javaslat: javaslat
    });
    

    // === 1. LÉPÉS: VALIDÁLÁS ===
    if (!javaslat || !javaslat.erintettEntitasok) {
      throw new Error('Érvénytelen javaslat objektum');
    }

    const modositasiEredmenyek = [];

    // === 2. LÉPÉS: MINDEN ÉRINTETT ENTITÁS FELDOLGOZÁSA ===
    for (const entitas of javaslat.erintettEntitasok) {

      // === 3. LÉPÉS: MÓDOSÍTÁSI ADATOK ELLENŐRZÉSE ===
      if (!entitas.modositasAdatok || Object.keys(entitas.modositasAdatok).length === 0) {
        // Ha nincs módosítási adat, kihagyjuk
        modositasiEredmenyek.push({
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          modositva: false,
          hiba: 'Nincs módosítási adat'
        });
        continue;
      }

      // === 4. LÉPÉS: ENTITÁS MÓDOSÍTÁSA TÍPUS ALAPJÁN ===
      let modositva = false;
      let hibaUzenet = null;

      try {

        if (entitas.entitasTipus === 'Tartalom') {
          // Tartalom módosítása
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> TartalomRepository.updateById: ", {
           entitasId: entitas.entitasId,
           modositasAdatok: entitas.modositasAdatok
          });
          
          const frissitettTartalom = await TartalomRepository.updateById(
            entitas.entitasId,
            entitas.modositasAdatok
          );
          modositva = !!frissitettTartalom;

        } else if (entitas.entitasTipus === 'Kategoria') {
          // Kategória módosítása
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> KategoriaRepository.updateById: ", {
           entitasId: entitas.entitasId,
           modositasAdatok: entitas.modositasAdatok
          });

          const frissitettKategoria = await KategoriaRepository.updateById(
            entitas.entitasId,
            entitas.modositasAdatok
          );
          modositva = !!frissitettKategoria;

        } else if (entitas.entitasTipus === 'TartalomTipus') {
          // Tartalom típus módosítása
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> TartalomTipusRepository.updateById: ", {
           entitasId: entitas.entitasId,
           modositasAdatok: entitas.modositasAdatok
          });

          const frissitettTartalomTipus = await TartalomTipusRepository.updateById(
            entitas.entitasId,
            entitas.modositasAdatok
          );
          modositva = !!frissitettTartalomTipus;

        } else {
          // Ismeretlen entitás típus
          hibaUzenet = `Ismeretlen entitás típus: ${entitas.entitasTipus}`;
        }

      } catch (error) {
        // Hiba esetén rögzítjük, de folytatjuk
        hibaUzenet = error.message;
      }

      // === 5. LÉPÉS: EREDMÉNY RÖGZÍTÉSE ===
      modositasiEredmenyek.push({
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        modositva: modositva,
        modositasAdatok: entitas.modositasAdatok,
        hiba: hibaUzenet
      });
    }

    // === 6. LÉPÉS: STATISZTIKÁK SZÁMÍTÁSA ===
    const modositvaDb = modositasiEredmenyek.filter(e => e.modositva).length;
    const hibasDb = modositasiEredmenyek.filter(e => e.hiba).length;

    // === 7. LÉPÉS: EREDMÉNY VISSZAADÁSA ===

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< vegrehajtas: ', {
      tipus: 'Modositas',
      modositottEntitasok: modositasiEredmenyek,
      modositottEntitasokSzama: modositvaDb,
      hibasEntitasokSzama: hibasDb
     });

    return {
      tipus: 'Modositas',
      modositottEntitasok: modositasiEredmenyek,
      modositottEntitasokSzama: modositvaDb,
      hibasEntitasokSzama: hibasDb
    };
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Osztály singleton példány exportálása
module.exports = new ModositasiVegrehajto();