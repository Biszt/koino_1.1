// backend/services/hierarchikusFrissitesService.js

// ===== REPOSITORY IMPORTÁLÁSA =====

// HierarchikusTudatpontAllokaciRepository: Hierarchikus adatok kezelése
// ÚJ: Ez a repository tartalmazza a szuloId mezőt is, így egy helyen minden
const HierarchikusTudatpontAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');

// TudatpontRepository: Saját allokációk és hozzárendelések kezelése
const TudatpontRepository = require('../repositories/tudatpontRepository');

// ===== HIERARCHIKUS FRISSÍTÉS SERVICE OSZTÁLY =====
// Ez az osztály felelős a hierarchikus tudatpont adatok újraszámításáért
// CRON job hívja meg percenként, batch feldolgozással (alulról felfelé)
class HierarchikusFrissitesService {

  // ============================================================================
  // ===== ELAVULT HIERARCHIKUS ADATOK FRISSÍTÉSE (BATCH) =====
  // ============================================================================

  /**
   * Elavult hierarchikus adatok frissítése szintenként (alulról felfelé)
   * @param {number} maxHierarchiaSzint - Maximum hierarchia szint (alapértelmezett: 100)
   * @param {number} batchMeret - Egy futásban max ennyi entitás/szint (alapértelmezett: 100)
   * @returns {Promise<Object>} Frissítési statisztika (összesen, sikeres, hibák)
   */
  async frissitElavultHierarchikusAdatok(maxHierarchiaSzint = 100, batchMeret = 100) {
    console.log('frissitElavultHierarchikusAdatok - KEZDÉS', { maxHierarchiaSzint, batchMeret });

    // Frissítési statisztika inicializálása
    const frissitesiStatisztika = {
      osszesen: 0,
      sikeres: 0,
      hibak: []
    };

    // Alulról felfelé haladás a hierarchiában (0. szint = levelek)
    for (let szint = 0; szint <= maxHierarchiaSzint; szint++) {
      console.log(`\n=== HIERARCHIA SZINT ${szint} FELDOLGOZÁSA ===`);

      // 1. LÉPÉS - Elavult entitások lekérdezése ezen a szinten
      console.log('frissitElavultHierarchikusAdatok >>> HierarchikusTudatpontAllokaciRepository.findElavultHierarchikusAllokaciok', {
        szint, batchMeret
      });

      // VÁLTOZÁS: Korábban TudatpontRepository-t használtunk, most HierarchikusTudatpontAllokaciRepository-t
      // Indok: a hierarchikus adatok (szuloId, elavultság) itt vannak tárolva
      const elavultAllokaciok = await HierarchikusTudatpontAllokaciRepository.findElavultHierarchikusAllokaciok(
        szint,
        batchMeret
      );

      // 2. LÉPÉS - Ha nincs elavult entitás ezen a szinten, ugrás a következőre
      if (elavultAllokaciok.length === 0) {
        console.log(`Nincs elavult entitás a ${szint}. szinten, továbblépés...`);
        continue;
      }

      console.log(`${elavultAllokaciok.length} elavult entitás a ${szint}. szinten`);
      frissitesiStatisztika.osszesen += elavultAllokaciok.length;

      // 3. LÉPÉS - Entitások feldolgozása egyenként
      for (const allokacio of elavultAllokaciok) {
        try {
          console.log(`\n>>> Entitás frissítése: ${allokacio.entitasId} (${allokacio.entitasTipus})`);

          await this.frissitEgyHierarchikusAllokacio(
            allokacio.entitasId,
            allokacio.entitasTipus
          );

          frissitesiStatisztika.sikeres++;
          console.log(`Entitás frissítve: ${allokacio.entitasId}`);

        } catch (error) {
          console.error('Hiba a hierarchikus frissítés során', {
            entitasId: allokacio.entitasId,
            entitasTipus: allokacio.entitasTipus,
            hiba: error.message
          });

          frissitesiStatisztika.hibak.push({
            entitasId: allokacio.entitasId,
            entitasTipus: allokacio.entitasTipus,
            hiba: error.message
          });
        }
      }

      // 4. LÉPÉS - Batch ellenőrzés
      if (elavultAllokaciok.length < batchMeret) {
        console.log(`Szint ${szint} feldolgozva (utolsó batch)`);
      } else {
        console.log(`Szint ${szint} batch feldolgozva (${elavultAllokaciok.length}/${batchMeret})`);
        console.log(`További entitások lehetnek a ${szint}. szinten, következő futáskor folytatódik...`);
      }
    }

    // 5. LÉPÉS - Eredmény visszaadása
    console.log('frissitElavultHierarchikusAdatok - VÉGE', frissitesiStatisztika);
    return frissitesiStatisztika;
  }

  // ============================================================================
  // ===== EGY ENTITÁS HIERARCHIKUS ADATAINAK FRISSÍTÉSE =====
  // ============================================================================

  /**
   * Egy entitás hierarchikus tudatpontjainak újraszámítása
   * SZÁMÍTÁSI LOGIKA:
   * - hierarchikusOsszesPont = sajátOsszesPont + ÖSSZES gyerek hierarchikusOsszesPont
   * - hierarchikusHozzajarulokSzama = egyedi eemberek száma (saját + összes gyerek)
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<void>}
   */
  async frissitEgyHierarchikusAllokacio(entitasId, entitasTipus) {
    console.log('frissitEgyHierarchikusAllokacio - KEZDÉS', { entitasId, entitasTipus });

    // 1. LÉPÉS - Saját tudatpontok lekérése
    console.log('frissitEgyHierarchikusAllokacio >>> TudatpontRepository.findAllokaciByEntitas', {
      entitasId, entitasTipus
    });

    const sajatAllokacio = await TudatpontRepository.findAllokaciByEntitas(entitasId, entitasTipus);

    // Ha nincs allokáció (0 pont), átugrás
    if (!sajatAllokacio) {
      console.warn('Nincs allokáció, átugrás', { entitasId, entitasTipus });
      return;
    }

    const sajatOsszesPont = sajatAllokacio.osszesPont || 0;
    const sajatHozzajarulokSzama = sajatAllokacio.hozzajarulokSzama || 0;

    console.log('Saját tudatpontok', { sajatOsszesPont, sajatHozzajarulokSzama });

    // 2. LÉPÉS - Gyerekek hierarchikus pontjainak összesítése
    // VÁLTOZÁS: Korábban típusonként külön repository-t hívtunk (Tartalom, Javaslat, Egyezmény)
    // MOST: Egyetlen HierarchikusTudatpontAllokaciRepository.findBySzuloId() hívás elég,
    // mert a szuloId mező már minden entitástípus allokációjában benne van
    let gyerekekHierarchikusPontja = 0;
    const egyediHozzajarulok = new Set(); // Set automatikusan kiszűri a duplikátumokat

    console.log('frissitEgyHierarchikusAllokacio >>> HierarchikusTudatpontAllokaciRepository.findBySzuloId', {
      szuloId: entitasId
    });

    // Összes közvetlen gyerek lekérése egy hívással, típustól függetlenül
    const gyerekAllokaciok = await HierarchikusTudatpontAllokaciRepository.findBySzuloId(
      entitasId,
      999999, // Nagy limit - összes gyerek
      0
    );

    console.log(`Gyerekek száma összesen: ${gyerekAllokaciok.length}`);

    // Minden gyerek hierarchikus pontjának összesítése
    for (const gyerekAllokacio of gyerekAllokaciok) {
      // FONTOS: A gyerek HIERARCHIKUS pontját vesszük, nem a sajátját!
      // Ez biztosítja, hogy a teljes alattuk lévő hierarchia benne legyen
      gyerekekHierarchikusPontja += gyerekAllokacio.hierarchikusOsszesPont || 0;

      console.log(`Gyerek (${gyerekAllokacio.entitasTipus} ${gyerekAllokacio.entitasId}) hierarchikus pontjai: ${gyerekAllokacio.hierarchikusOsszesPont || 0}`);

      // Egyedi hozzájárulók gyűjtése a gyerek saját hozzárendeléseiből
      const gyerekHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
        gyerekAllokacio.entitasId,
        gyerekAllokacio.entitasTipus,
        999999,
        0
      );

      gyerekHozzajarulok.forEach(h => egyediHozzajarulok.add(h.eemberId.toString()));
    }

    // 3. LÉPÉS - Saját hozzájárulók hozzáadása
    console.log('frissitEgyHierarchikusAllokacio >>> TudatpontRepository.findHozzarendelesekByEntitasNyers', {
      entitasId, entitasTipus
    });

    const sajatHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
      entitasId,
      entitasTipus,
      999999,
      0
    );

    // Saját hozzájárulók hozzáadása (duplikátumok automatikusan kiszűrődnek)
    sajatHozzajarulok.forEach(h => egyediHozzajarulok.add(h.eemberId.toString()));

    // 4. LÉPÉS - Hierarchikus értékek kiszámítása
    const hierarchikusOsszesPont = sajatOsszesPont + gyerekekHierarchikusPontja;
    const hierarchikusHozzajarulokSzama = egyediHozzajarulok.size;

    console.log('Hierarchikus értékek kiszámítva', {
      entitasId,
      sajatOsszesPont,
      gyerekekHierarchikusPontja,
      hierarchikusOsszesPont,
      hierarchikusHozzajarulokSzama
    });

    // 5. LÉPÉS - Frissítés az adatbázisban
    // VÁLTOZÁS: Korábban TudatpontRepository.updateAllokaciByEntitas()-t hívtunk
    // MOST: HierarchikusTudatpontAllokaciRepository.updateAllokaciByEntitas()-t hívjuk
    // Indok: a hierarchikus adatok itt vannak tárolva, nem a tudatpont allokációban
    console.log('frissitEgyHierarchikusAllokacio >>> HierarchikusTudatpontAllokaciRepository.updateAllokaciByEntitas', {
      entitasId, entitasTipus, hierarchikusOsszesPont, hierarchikusHozzajarulokSzama
    });

    await HierarchikusTudatpontAllokaciRepository.updateAllokaciByEntitas(
      entitasId,
      entitasTipus,
      {
        hierarchikusOsszesPont: hierarchikusOsszesPont,
        hierarchikusHozzajarulokSzama: hierarchikusHozzajarulokSzama,
        hierarchikusAdatokElavultak: false,             // Már nem elavult
        hierarchikusAdatokUtolsoFrissites: new Date()   // Frissítés időpontja
      }
    );

    console.log('frissitEgyHierarchikusAllokacio - VÉGE', {
      entitasId, entitasTipus, hierarchikusOsszesPont, hierarchikusHozzajarulokSzama
    });
  }

  // ============================================================================
  // ===== HIERARCHIA SZINTEK KISZÁMÍTÁSA (OPCIONÁLIS) =====
  // ============================================================================

  /**
   * Az összes entitás hierarchia szintjének kiszámítása és mentése
   * TODO: Implementálás - BFS vagy DFS algoritmus
   * @returns {Promise<void>}
   */
  async szamitHierarchiaSzinteket() {
    console.log('szamitHierarchiaSzinteket - KEZDÉS');

    // TODO: Implementálás
    // 1. Összes entitás lekérdezése
    // 2. BFS/DFS algoritmus a hierarchia bejárásához
    // 3. Levél entitások = 0 szint
    // 4. Szülők = max(gyerek szintek) + 1
    // 5. Mentés az adatbázisba

    console.warn('szamitHierarchiaSzinteket - NEM IMPLEMENTÁLT (TODO)');
    console.log('szamitHierarchiaSzinteket - VÉGE');
  }
}

// ===== EXPORTÁLÁS - SINGLETON példány =====
module.exports = new HierarchikusFrissitesService();