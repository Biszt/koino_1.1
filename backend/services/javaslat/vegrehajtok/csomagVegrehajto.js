// backend/services/javaslatVegrehajtok/csomagVegrehajto.js

// ===== IMPORTOK =====

// Végrehajtó osztályok importálása - ÚJ!
const TorlesiVegrehajto = require('./torlesiVegrehajto');
const ModositasiVegrehajto = require('./modositasiVegrehajto');
const AthelyezesiVegrehajto = require('./athelyezesiVegrehajto');

/**
 * CSOMAG VÉGREHAJTÓ OSZTÁLY
 * Ez az osztály felelős a csomag javaslatok végrehajtásáért
 * Felelősség: Több művelet végrehajtása egyszerre a meglévő végrehajtók újrafelhasználásával
 */
class CsomagVegrehajto {
  /**
   * VÉGREHAJTÁS
   * Csomag javaslat végrehajtása
   * Több művelet végrehajtása egyszerre - Törlés, Módosítás, Áthelyezés
   * Minden művelethez a megfelelő végrehajtót használja
   * 
   * @param {Object} javaslat - A javaslat objektum
   * @returns {Promise<Object>} Végrehajtás eredménye
   */
  async vegrehajtas(javaslat) {
    // Log metódus kezdete értékekkel
    console.log('csomagVegrehajto.vegrehajtas - KEZDÉS', {
      javaslatId: javaslat.id,
      erintettEntitasokSzama: javaslat.erintettEntitasok?.length || 0
    });

    // 1. LÉPÉS - VALIDÁLÁS
    // Javaslat objektum és érintett entitások ellenőrzése
    if (!javaslat || !javaslat.erintettEntitasok) {
      throw new Error('Érvénytelen javaslat objektum');
    }

    // Csomag eredmények tömb inicializálása - minden művelet eredménye ide kerül
    const csomagEredmenyek = [];
    
    // Statisztikai számlálók inicializálása
    let torlesDb = 0;          // Sikeresen törölt entitások száma
    let modositasDb = 0;       // Sikeresen módosított entitások száma
    let athelyezesDb = 0;      // Sikeresen áthelyezett entitások száma

    // 2. LÉPÉS - MINDEN ÉRINTETT ENTITÁS MŰVELETÉNEK VÉGREHAJTÁSA
    // Végigmegyünk az összes művelet-en és a megfelelő végrehajtót hívjuk
    for (const entitas of javaslat.erintettEntitasok) {
      
      // Log aktuális entitás feldolgozásának kezdete
      console.log('csomagVegrehajto.vegrehajtas - Entitás feldolgozása', {
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        muvelet: entitas.muvelet
      });

      // 3. LÉPÉS - MŰVELET TÍPUS ALAPJÁN ELÁGAZÁS
      
      // ----- TÖRLÉS MŰVELET -----
      if (entitas.muvelet === 'Torles') {
        // Mini javaslat objektum létrehozása a TorlesiVegrehajto számára
        // Csak ezt az egy entitást tartalmazza
        const miniJavaslat = {
          erintettEntitasok: [entitas]
        };
        
        // Log TorlesiVegrehajto hívása előtt
        console.log('csomagVegrehajto.vegrehajtas - TorlesiVegrehajto.vegrehajtas hívása', {
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus
        });
        
        // TorlesiVegrehajto meghívása - teljes törlési logikával
        const torlesiEredmeny = await TorlesiVegrehajto.vegrehajtas(miniJavaslat);
        
        // Eredmény feldolgozása - toroltEntitasok tömb iterálása
        for (const toroltEntitas of torlesiEredmeny.toroltEntitasok) {
          // Eredmény hozzáadása a csomag eredményekhez
          csomagEredmenyek.push({
            entitasId: toroltEntitas.entitasId,
            entitasTipus: toroltEntitas.entitasTipus,
            muvelet: 'Torles',
            torolve: toroltEntitas.torolve,
            visszaosztottPontok: toroltEntitas.visszaosztottPontok,
            emberekSzama: toroltEntitas.emberekSzama
          });
          
          // Statisztika frissítése - ha sikeresen törölve lett
          if (toroltEntitas.torolve) {
            torlesDb++;
          }
        }
        
        // Log törlés művelet befejezése
        console.log('csomagVegrehajto.vegrehajtas - Törlés művelet befejezve', {
          entitasId: entitas.entitasId,
          torolve: torlesiEredmeny.toroltEntitasokSzama > 0
        });
      }
      
      // ----- MÓDOSÍTÁS MŰVELET -----
      else if (entitas.muvelet === 'Modositas') {
        // Mini javaslat objektum létrehozása a ModositasiVegrehajto számára
        const miniJavaslat = {
          erintettEntitasok: [entitas]
        };
        
        // Log ModositasiVegrehajto hívása előtt
        console.log('csomagVegrehajto.vegrehajtas - ModositasiVegrehajto.vegrehajtas hívása', {
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          modositasAdatok: entitas.modositasAdatok
        });
        
        // ModositasiVegrehajto meghívása - teljes módosítási logikával
        const modositasiEredmeny = await ModositasiVegrehajto.vegrehajtas(miniJavaslat);
        
        // Eredmény feldolgozása - modositottEntitasok tömb iterálása
        for (const modositottEntitas of modositasiEredmeny.modositottEntitasok) {
          // Eredmény hozzáadása a csomag eredményekhez
          csomagEredmenyek.push({
            entitasId: modositottEntitas.entitasId,
            entitasTipus: modositottEntitas.entitasTipus,
            muvelet: 'Modositas',
            modositva: modositottEntitas.modositva,
            modositasAdatok: modositottEntitas.modositasAdatok,
            hiba: modositottEntitas.hiba || null
          });
          
          // Statisztika frissítése - ha sikeresen módosítva lett
          if (modositottEntitas.modositva) {
            modositasDb++;
          }
        }
        
        // Log módosítás művelet befejezése
        console.log('csomagVegrehajto.vegrehajtas - Módosítás művelet befejezve', {
          entitasId: entitas.entitasId,
          modositva: modositasiEredmeny.modositottEntitasokSzama > 0
        });
      }
      
      // ----- ÁTHELYEZÉS MŰVELET -----
      else if (entitas.muvelet === 'Athelyezes') {
        // Mini javaslat objektum létrehozása a AthelyezesiVegrehajto számára
        const miniJavaslat = {
          erintettEntitasok: [entitas]
        };
        
        // Log AthelyezesiVegrehajto hívása előtt
        console.log('csomagVegrehajto.vegrehajtas - AthelyezesiVegrehajto.vegrehajtas hívása', {
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          ujSzuloId: entitas.modositasAdatok?.ujSzuloId
        });
        
        // AthelyezesiVegrehajto meghívása - TELJES áthelyezési logikával
        // Ez már tartalmazza a szülő-gyerek kapcsolatok konzisztens kezelését
        const athelyezesiEredmeny = await AthelyezesiVegrehajto.vegrehajtas(miniJavaslat);
        
        // Eredmény feldolgozása - athelyezettEntitasok tömb iterálása
        for (const athelyezettEntitas of athelyezesiEredmeny.athelyezettEntitasok) {
          // Eredmény hozzáadása a csomag eredményekhez
          csomagEredmenyek.push({
            entitasId: athelyezettEntitas.entitasId,
            entitasTipus: athelyezettEntitas.entitasTipus,
            muvelet: 'Athelyezes',
            athelyezve: athelyezettEntitas.athelyezve,
            ujSzuloId: athelyezettEntitas.ujSzuloId,
            hiba: athelyezettEntitas.hiba || null
          });
          
          // Statisztika frissítése - ha sikeresen áthelyezve lett
          if (athelyezettEntitas.athelyezve) {
            athelyezesDb++;
          }
        }
        
        // Log áthelyezés művelet befejezése
        console.log('csomagVegrehajto.vegrehajtas - Áthelyezés művelet befejezve', {
          entitasId: entitas.entitasId,
          athelyezve: athelyezesiEredmeny.athelyezettEntitasokSzama > 0
        });
      }
      
      // ----- ISMERETLEN MŰVELET -----
      else {
        // Ismeretlen művelet típus - hiba rögzítése
        console.warn('csomagVegrehajto.vegrehajtas - Ismeretlen művelet típus', {
          entitasId: entitas.entitasId,
          muvelet: entitas.muvelet
        });
        
        // Eredmény hozzáadása hibaüzenettel
        csomagEredmenyek.push({
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          muvelet: entitas.muvelet,
          hiba: `Ismeretlen művelet: ${entitas.muvelet}`
        });
      }
    }

    // 4. LÉPÉS - STATISZTIKÁK SZÁMÍTÁSA
    // Összes sikeres művelet számítása
    const sikeres = torlesDb + modositasDb + athelyezesDb;

    // 5. LÉPÉS - EREDMÉNY VISSZAADÁSA
    // Összesített eredmény objektum létrehozása
    const eredmeny = {
      tipus: 'Csomag',
      muveletekSzama: csomagEredmenyek.length,
      sikeresDb: sikeres,
      toroltDb: torlesDb,
      modositottDb: modositasDb,
      athelyezettDb: athelyezesDb,
      csomagEredmenyek: csomagEredmenyek
    };

    // Log metódus vége értékekkel
    console.log('csomagVegrehajto.vegrehajtas - VÉGE', {
      tipus: eredmeny.tipus,
      muveletekSzama: eredmeny.muveletekSzama,
      sikeresDb: eredmeny.sikeresDb,
      toroltDb: eredmeny.toroltDb,
      modositottDb: eredmeny.modositottDb,
      athelyezettDb: eredmeny.athelyezettDb
    });

    // Eredmény objektum visszaadása
    return eredmeny;
  }
}

// EXPORTÁLÁS
// Osztály singleton példány exportálása
module.exports = new CsomagVegrehajto();
