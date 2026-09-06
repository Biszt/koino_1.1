// backend/services/javaslat/vegrehajtok/athelyezesiVegrehajto.js

// ===================================
// IMPORTOK
// ===================================

// Gondolat repository importálása
const GondolatRepository = require('../../../repositories/gondolatRepository');

// Egyezmény repository — az egyezmény ÁTHELYEZÉSE (a domain szerint egyezményre
// kizárólag áthelyezés indítható) a saját kollekcióját frissíti.
const EgyezmenyRepository = require('../../../repositories/egyezmenyRepository');

// Hierarchikus allokáció repository - a pakli hierarchia fa frissítéséhez
const HierarchikusTudatpontAllokaciRepository = require('../../../repositories/hierarchikusTudatpontAllokaciRepository');

// Hierarchikus frissítés szolgáltatás - az összesített pontok újraszámításához
const HierarchikusFrissitesService = require('../../hierarchikusFrissitesService');

// Ős-lánc karbantartó - áthelyezés után a mozgatott entitás részfájának osLanc-ját újraépíti (3b)
const OsLancKarbantartoService = require('../../osLancKarbantartoService');

// ===================================
// ÁTHELYEZÉSI VÉGREHAJTÓ OSZTÁLY
// ===================================
// Ez az osztály felelős az áthelyezési javaslatok végrehajtásáért
// Felelősség: Gondolat szülőjének megváltoztatása, tudatpontok MEGMARADNAK
class AthelyezesiVegrehajto {

  // ===================================
  // VÉGREHAJTÁS
  // ===================================
  /**
   * Áthelyezési javaslat végrehajtása
   * Megváltoztatja a gondolat szülőjét (szuloId mező)
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

    // === 2. LÉPÉS: MINDEN ÉRINTETT GONDOLAT FELDOLGOZÁSA ===
    for (const entitas of javaslat.erintettEntitasok) {

      // === 3. LÉPÉS: TÍPUS ELLENŐRZÉSE ===
      // Áthelyezés Gondolat VAGY Egyezmény típusra támogatott. (Kategóriát és
      // Gondolattípust a javaslatService már a beküldéskor kizárja az áthelyezésből.)
      if (entitas.entitasTipus !== 'Gondolat' && entitas.entitasTipus !== 'Egyezmeny') {
        athelyezesiEredmenyek.push({
          entitasId: entitas.entitasId,
          entitasTipus: entitas.entitasTipus,
          athelyezve: false,
          hiba: 'Áthelyezés csak Gondolat vagy Egyezmény típusra támogatott'
        });
        continue;
      }

      // A mozgatott entitás saját kollekciója típus szerint (a szülő-lánc
      // bejárás/kör-ellenőrzés továbbra is a Gondolat-fán megy, mert az áthelyezés
      // célja mindig Gondolat).
      const mozgatottRepo = entitas.entitasTipus === 'Egyezmeny'
        ? EgyezmenyRepository
        : GondolatRepository;

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
      const ujSzuloTipus = entitas.modositasAdatok.ujSzuloTipus || 'Gondolat';

      // 5. LÉPÉS - ÁTHELYEZÉSI TRANZAKCIÓ
      let athelyezve = false;
      let hibaUzenet = null;

      try {
        const mozgatottId = entitas.entitasId.toString();

        // 5.A - ÖNMAGA ALÁ HELYEZÉS TILTÁSA
        if (ujSzuloId && ujSzuloId.toString() === mozgatottId) {
          throw new Error('Az entitás nem helyezhető saját maga alá');
        }

        // 5.B - A MOZGATOTT ENTITÁS EREDETI SZÜLŐJÉNEK FELJEGYZÉSE
        // A kör-feloldáshoz és a hierarchia újraszámításhoz is kell
        const mozgatottGondolat = await mozgatottRepo.findById(entitas.entitasId);
        if (!mozgatottGondolat) {
          throw new Error('Az áthelyezendő entitás nem található');
        }
        const eredetiSzuloId = mozgatottGondolat.szuloId ?? null;
        const eredetiSzuloTipus = mozgatottGondolat.szuloTipus ?? null;

        // 5.C - KÖR-HIERARCHIA ELLENŐRZÉSE (ELUTASÍTÁS)
        // Áthelyezéskor az entitás a teljes leszármazott-ágával együtt mozog,
        // ezért a saját leszármazottja alá helyezés logikailag lehetetlen
        // (kört hozna létre). Az ilyen kérést hibával elutasítjuk —
        // NEM próbáljuk automatikusan "feloldani".
        let vizsgaltId = ujSzuloId ? ujSzuloId.toString() : null;
        let lepesVedelem = 0; // Végtelen ciklus elleni védelem

        while (vizsgaltId && lepesVedelem < 100) {
          lepesVedelem++;

          if (vizsgaltId === mozgatottId) {
            throw new Error(
              'Az entitás nem helyezhető a saját leszármazottja alá, mert áthelyezéskor a leszármazottak együtt mozognak vele'
            );
          }

          const vizsgaltGondolat = await GondolatRepository.findById(vizsgaltId);
          if (!vizsgaltGondolat) break;

          vizsgaltId = vizsgaltGondolat.szuloId ? vizsgaltGondolat.szuloId.toString() : null;
        }

        // 5.D - A MOZGATOTT ENTITÁS ÁTHELYEZÉSE (szuloId ÉS szuloTipus)
        console.log('vegrehajtas >>> GondolatRepository.updateById (szuloId + szuloTipus)', {
          entitasId: entitas.entitasId,
          ujSzuloId: ujSzuloId,
          ujSzuloTipus: ujSzuloTipus
        });

        const frissitettGondolat = await mozgatottRepo.updateById(
          entitas.entitasId,
          {
            szuloId: ujSzuloId,
            szuloTipus: ujSzuloTipus
          }
        );

        // A hierarchia fában (pakli) is átállítjuk a mozgatott entitás szülőjét
        await HierarchikusTudatpontAllokaciRepository.updateSzuloId(
          entitas.entitasId,
          entitas.entitasTipus,
          ujSzuloId,
          ujSzuloTipus
        );

        // 5.E - HIERARCHIKUS ÖSSZESÍTETT PONTOK ÚJRASZÁMÍTÁSA
        // Alulról felfelé: előbb a mozgatott entitás, majd az új és a régi
        // szülő-lánc — így a szülők már a friss gyerek-értékeket összesítik
        await this._hierarchiaLancUjraszamitasa(entitas.entitasId, entitas.entitasTipus);
        if (ujSzuloId) {
          await this._hierarchiaLancUjraszamitasa(ujSzuloId, 'Gondolat');
        }
        if (eredetiSzuloId && eredetiSzuloId.toString() !== (ujSzuloId ?? '').toString()) {
          await this._hierarchiaLancUjraszamitasa(eredetiSzuloId, eredetiSzuloTipus || 'Gondolat');
        }

        // ŐS-LÁNC (3b): az áthelyezett entitás ÉS teljes részfája osLanc-jának újraépítése.
        // A szuloId-k ekkor már frissek (fent átálltak), így a szuloId-láncból épített lánc helyes.
        // Best-effort: ne akassza meg az áthelyezést — a migrációs tool pótolhatja.
        try {
          await OsLancKarbantartoService.reszfaOsLancUjraepitese(entitas.entitasId, entitas.entitasTipus);
        } catch (osLancHiba) {
          console.error('athelyezes - osLanc újraépítés HIBA (nem blokkoló)', {
            entitasId: entitas.entitasId, hiba: osLancHiba.message
          });
        }

        athelyezve = !!frissitettGondolat;
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
        ujSzuloTipus: ujSzuloTipus,
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

  // ===================================
  // PRIVÁT - HIERARCHIA LÁNC ÚJRASZÁMÍTÁSA
  // ===================================
  /**
   * Az adott entitástól felfelé haladva újraszámítja a hierarchikus
   * összesített pontokat a gyökérig. Alulról felfelé halad, így minden
   * szülő már a friss gyerek-értékeket összesíti.
   *
   * @param {string} entitasId - A kiinduló entitás azonosítója
   * @param {string} entitasTipus - A kiinduló entitás típusa
   */
  async _hierarchiaLancUjraszamitasa(entitasId, entitasTipus) {
    console.log('_hierarchiaLancUjraszamitasa - KEZDÉS', { entitasId, entitasTipus });

    let aktualisId = entitasId;
    let aktualisTipus = entitasTipus;
    let lepesVedelem = 0; // Végtelen ciklus elleni védelem

    while (aktualisId && lepesVedelem < 100) {
      lepesVedelem++;

      // Az aktuális csomópont hierarchikus pontjainak újraszámítása
      // a közvetlen gyerekei alapján
      try {
        await HierarchikusFrissitesService.frissitEgyHierarchikusAllokacio(
          aktualisId,
          aktualisTipus
        );
      } catch (hiba) {
        console.warn('_hierarchiaLancUjraszamitasa - újraszámítási hiba, lánc megszakítva', {
          entitasId: aktualisId,
          hiba: hiba.message
        });
        break;
      }

      // Továbblépés a szülőre a hierarchia fa alapján
      const allokacio = await HierarchikusTudatpontAllokaciRepository.findByEntitas(
        aktualisId,
        aktualisTipus
      );

      if (!allokacio || !allokacio.szuloId) break; // Elértük a gyökeret

      aktualisId = allokacio.szuloId;
      aktualisTipus = allokacio.szuloTipus || 'Gondolat';
    }

    console.log('_hierarchiaLancUjraszamitasa - VÉGE', { lepesek: lepesVedelem });
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Osztály singleton példány exportálása
module.exports = new AthelyezesiVegrehajto();