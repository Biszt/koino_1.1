// backend/services/javaslat/vegrehajtok/modositasiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Repository-k importálása - entitások módosításához
const GondolatRepository = require('../../../repositories/gondolatRepository');
const KategoriaRepository = require('../../../repositories/kategoriaRepository');
const GondolatTipusRepository = require('../../../repositories/gondolatTipusRepository');

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

    // A módosítás időpontja — EGY közös bélyeg az egész végrehajtásra, hogy a
    // javaslatban érintett összes entitás `modositva`-ja pontosan egyezzen. Ezt írjuk
    // az entitások `modositva` mezőjébe (a kártya innen tudja, elavulhat-e a gyerek).
    const modositasIdo = new Date();

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
      // A LECSERÉLT (régi) gondolat pillanatképe — a felülírás ELŐTT olvassuk ki,
      // hogy az egyezmény meg tudja őrizni (a kártya „Lecserélt gondolat" fülének).
      // Mezőnév-eltérés: Gondolat → cim/szoveg, Kategoria/GondolatTipus → nev/leiras.
      let regiAdatok = null;

      try {

        if (entitas.entitasTipus === 'Gondolat') {
          // A régi gondolat kiolvasása a felülírás előtt
          const regiGondolat = await GondolatRepository.findById(entitas.entitasId);
          regiAdatok = {
            cim:    regiGondolat?.cim ?? null,
            szoveg: regiGondolat?.szoveg ?? null
          };

          // Gondolat módosítása
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> GondolatRepository.updateById: ", {
           entitasId: entitas.entitasId,
           modositasAdatok: entitas.modositasAdatok
          });

          const frissitettGondolat = await GondolatRepository.updateById(
            entitas.entitasId,
            { ...entitas.modositasAdatok, modositva: modositasIdo }  // tartalmi módosítás → modositva frissül
          );
          modositva = !!frissitettGondolat;

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
            { ...entitas.modositasAdatok, modositva: modositasIdo }  // tartalmi módosítás → modositva frissül
          );
          modositva = !!frissitettKategoria;

        } else if (entitas.entitasTipus === 'GondolatTipus') {
          // A régi gondolattípus kiolvasása a felülírás előtt
          const regiGondolatTipus = await GondolatTipusRepository.findById(entitas.entitasId);
          regiAdatok = {
            nev:    regiGondolatTipus?.nev ?? null,
            leiras: regiGondolatTipus?.leiras ?? null
          };

          // Gondolat típus módosítása
          console.log(">>>>>>>>>>>>>>>>>>>>>>>>>> GondolatTipusRepository.updateById: ", {
           entitasId: entitas.entitasId,
           modositasAdatok: entitas.modositasAdatok
          });

          const frissitettGondolatTipus = await GondolatTipusRepository.updateById(
            entitas.entitasId,
            { ...entitas.modositasAdatok, modositva: modositasIdo }  // tartalmi módosítás → modositva frissül
          );
          modositva = !!frissitettGondolatTipus;

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
        regiAdatok: regiAdatok,   // A lecserélt (régi) gondolat pillanatképe
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