// backend/services/javaslat/vegrehajtok/modositasiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Repository-k importálása - entitások módosításához
const TartalomRepository = require('../../../repositories/tartalomRepository');
const KategoriaRepository = require('../../../repositories/kategoriaRepository');
const TartalomTipusRepository = require('../../../repositories/tartalomTipusRepository');

// Szerkesztő szerviz - az elfogadott módosítás után frissíti az entitás szerkesztő-listáját
const SzerkesztoService = require('../../szerkesztoService');

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
      // A LECSERÉLT (régi) tartalom pillanatképe — a felülírás ELŐTT olvassuk ki,
      // hogy az egyezmény meg tudja őrizni (a kártya „Lecserélt tartalom" fülének).
      // Mezőnév-eltérés: Tartalom → cim/szoveg, Kategoria/TartalomTipus → nev/leiras.
      let regiAdatok = null;

      try {

        if (entitas.entitasTipus === 'Tartalom') {
          // A régi tartalom kiolvasása a felülírás előtt
          const regiTartalom = await TartalomRepository.findById(entitas.entitasId);
          regiAdatok = {
            cim:    regiTartalom?.cim ?? null,
            szoveg: regiTartalom?.szoveg ?? null
          };

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
          // A régi kategória kiolvasása a felülírás előtt
          const regiKategoria = await KategoriaRepository.findById(entitas.entitasId);
          regiAdatok = {
            nev:    regiKategoria?.nev ?? null,
            leiras: regiKategoria?.leiras ?? null
          };

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
          // A régi tartalomtípus kiolvasása a felülírás előtt
          const regiTartalomTipus = await TartalomTipusRepository.findById(entitas.entitasId);
          regiAdatok = {
            nev:    regiTartalomTipus?.nev ?? null,
            leiras: regiTartalomTipus?.leiras ?? null
          };

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

      // === 4.5. LÉPÉS: SZERKESZTŐ-LISTA FRISSÍTÉSE ===
      // Ha a módosítás sikeres volt, a javaslattevő SZERKESZTŐVÉ válik (a lista élére kerül),
      // és a meglévő szerkesztők állapota (a nevük színe) újraszámolódik a mostani szavazatok
      // alapján. Külön try/catch: ha ez a lépés elhasalna, a MÁR végrehajtott módosítás
      // akkor is érvényes marad — csak a szerkesztő-lista nem frissül.
      if (modositva) {
        try {
          await SzerkesztoService.szerkesztoketFrissit(
            entitas.entitasTipus,
            entitas.entitasId,
            javaslat
          );
        } catch (szerkHiba) {
          console.error('modositasiVegrehajto.vegrehajtas - a szerkesztő-lista frissítése sikertelen', {
            entitasId: entitas.entitasId,
            hiba: szerkHiba.message
          });
        }
      }

      // === 5. LÉPÉS: EREDMÉNY RÖGZÍTÉSE ===
      modositasiEredmenyek.push({
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        modositva: modositva,
        modositasAdatok: entitas.modositasAdatok,
        regiAdatok: regiAdatok,   // A lecserélt (régi) tartalom pillanatképe
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