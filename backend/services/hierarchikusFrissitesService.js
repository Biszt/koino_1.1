// backend/services/hierarchikusFrissitesService.js


// ===== REPOSITORY IMPORTÁLÁSA =====

// TudatpontRepository: Tudatpont allokációk és hozzárendelések kezelése
const TudatpontRepository = require('../repositories/tudatpontRepository');

// Entitás repository-k: Szülő-gyerek kapcsolatok lekérdezéséhez
const TartalomRepository = require('../repositories/tartalomRepository');
const JavaslatRepository = require('../repositories/javaslatRepository');
const EgyezmenyRepository = require('../repositories/egyezmenyRepository');


// ===== HIERARCHIKUS FRISSÍTÉS SERVICE OSZTÁLY =====

// Ez az osztály felelős a hierarchikus tudatpont adatok újraszámításáért
// CRON job hívja meg percenként, batch feldolgozással (alulról felfelé)
class HierarchikusFrissitesService {


  // ============================================================================
  // ===== ELAVULT HIERARCHIKUS ADATOK FRISSÍTÉSE (BATCH) =====
  // ============================================================================

  /**
   * ----- ELAVULT HIERARCHIKUS ADATOK FRISSÍTÉSE SZINTENKÉNT (ALULRÓL FELFELÉ) -----
   * 
   * Elavult hierarchikus adatok frissítése batch feldolgozással
   * Egy futásban szintenként dolgozza fel az entitásokat (0 → 1 → 2 → ...)
   * 
   * MŰKÖDÉSI LOGIKA:
   * - 0. szint = levél entitások (nincs gyerekük) → először ezeket számítja
   * - 1. szint = egy szinttel feljebb (0. szint gyerekei) → ezután ezeket
   * - 2. szint = két szinttel feljebb (1. szint gyerekei) → stb.
   * - Folytatódik amíg van feldolgozható szint
   * 
   * BATCH FELDOLGOZÁS:
   * - Egy futásban maximum `batchMeret` entitást dolgoz fel szintenként
   * - Ha egy szinten több entitás van, a következő futáskor folytatja
   * - Ez biztosítja, hogy a CRON job ne terhelje túl a rendszert
   * 
   * HASZNÁLAT:
   * - CRON job hívja percenként
   * - Csak az elavult entitásokat dolgozza fel (hierarchikusAdatokElavultak = true)
   * 
   * @param {number} maxHierarchiaSzint - Maximum hierarchia szint (alapértelmezett: 100)
   * @param {number} batchMeret - Egy futásban max ennyi entitás/szint (alapértelmezett: 100)
   * @returns {Promise<Object>} Frissítési statisztika (összesen, sikeres, hibák)
   */
  async frissitElavultHierarchikusAdatok(maxHierarchiaSzint = 100, batchMeret = 100) {
    console.log('frissitElavultHierarchikusAdatok - KEZDÉS', { maxHierarchiaSzint, batchMeret });
    
    // ===== Frissítési statisztika inicializálása =====
    
    const frissitesiStatisztika = {
      osszesen: 0,        // Összes feldolgozott entitás
      sikeres: 0,         // Sikeresen frissített entitások
      hibak: []           // Hibás entitások listája
    };
    
    // ===== Alulról felfelé haladás a hierarchiában =====
    
    // 0 szint = legmélyebb gyerekek (nincs alattuk senki)
    // Felfelé haladunk, amíg van feldolgozható szint
    for (let szint = 0; szint <= maxHierarchiaSzint; szint++) {
      console.log(`\n=== HIERARCHIA SZINT ${szint} FELDOLGOZÁSA ===`);
      
      // ===== 1. LÉPÉS - Elavult entitások lekérdezése ezen a szinten =====
      
      console.log(`frissitElavultHierarchikusAdatok >>> TudatpontRepository.findElavultHierarchikusAllokaciok`, {
        szint: szint,
        batchMeret: batchMeret
      });
      
      const elavultAllokaciok = await TudatpontRepository.findElavultHierarchikusAllokaciok(
        szint,       // Hierarchia szint
        batchMeret   // Maximum ennyi entitást kérünk le
      );
      
      // ===== 2. LÉPÉS - Ellenőrzés: Van-e feldolgozható entitás ezen a szinten? =====
      
      if (elavultAllokaciok.length === 0) {
        console.log(`Nincs elavult entitás a ${szint}. szinten, továbblépés...`);
        continue; // Ugrás a következő szintre
      }
      
      console.log(`${elavultAllokaciok.length} elavult entitás a ${szint}. szinten`);
      frissitesiStatisztika.osszesen += elavultAllokaciok.length;
      
      // ===== 3. LÉPÉS - Entitások feldolgozása egyenként =====
      
      for (const allokacio of elavultAllokaciok) {
        try {
          console.log(`\n>>> Entitás frissítése: ${allokacio.entitasId} (${allokacio.entitasTipus})`);
          
          // Egy entitás hierarchikus adatainak újraszámítása
          await this.frissitEgyHierarchikusAllokacio(
            allokacio.entitasId,
            allokacio.entitasTipus
          );
          
          frissitesiStatisztika.sikeres++;
          console.log(`✅ Entitás frissítve: ${allokacio.entitasId}`);
          
        } catch (error) {
          // Hiba esetén logoljuk, de folytatjuk a többi entitással
          console.error(`❌ Hiba a hierarchikus frissítés során`, {
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
      
      // ===== 4. LÉPÉS - Batch ellenőrzés =====
      
      // Ha egy batch kevesebb, mint a limit, akkor ezen a szinten nincs több elavult entitás
      if (elavultAllokaciok.length < batchMeret) {
        console.log(`Szint ${szint} feldolgozva (utolsó batch)`);
      } else {
        console.log(`Szint ${szint} batch feldolgozva (${elavultAllokaciok.length}/${batchMeret})`);
        console.log(`További entitások lehetnek a ${szint}. szinten, következő futáskor folytatódik...`);
      }
    }
    
    // ===== 5. LÉPÉS - Eredmény visszaadása =====
    
    console.log('frissitElavultHierarchikusAdatok - VÉGE', frissitesiStatisztika);
    return frissitesiStatisztika;
  }


  // ============================================================================
  // ===== EGY ENTITÁS HIERARCHIKUS ADATAINAK FRISSÍTÉSE =====
  // ============================================================================

  /**
   * ----- EGY ENTITÁS HIERARCHIKUS ADATAINAK ÚJRASZÁMÍTÁSA -----
   * 
   * Egy entitás hierarchikus tudatpontjainak újraszámítása
   * 
   * SZÁMÍTÁSI LOGIKA:
   * - hierarchikusOsszesPont = sajátOsszesPont + ÖSSZES gyerek hierarchikusOsszesPont
   * - hierarchikusHozzajarulokSzama = egyedi emberek száma (saját + összes gyerek)
   * 
   * PÉLDA:
   * - Tartalom A (saját: 45 pont, 2 hozzájáruló)
   *   ├─ Tartalom B (hierarchikus: 30 pont, 1 hozzájáruló)
   *   └─ Tartalom C (hierarchikus: 50 pont, 3 hozzájáruló)
   * → Tartalom A hierarchikus pontja: 45 + 30 + 50 = 125 pont
   * → Tartalom A hierarchikus hozzájárulók: 4 egyedi ember (ha nincs átfedés)
   * 
   * HASZNÁLAT:
   * - frissitElavultHierarchikusAdatok() hívja minden elavult entitásra
   * 
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<void>}
   */
  async frissitEgyHierarchikusAllokacio(entitasId, entitasTipus) {
    console.log('frissitEgyHierarchikusAllokacio - KEZDÉS', { entitasId, entitasTipus });
    
    // ===== 1. LÉPÉS - Saját tudatpontok lekérése =====
    
    console.log('frissitEgyHierarchikusAllokacio >>> TudatpontRepository.findAllokaciByEntitas', {
      entitasId,
      entitasTipus
    });
    
    const sajatAllokacio = await TudatpontRepository.findAllokaciByEntitas(entitasId, entitasTipus);
    
    // Ha nincs allokáció (0 pont, automatikusan törölve), átugrás
    if (!sajatAllokacio) {
      console.warn('Nincs allokáció, átugrás', { entitasId, entitasTipus });
      return;
    }
    
    const sajatOsszesPont = sajatAllokacio.osszesPont || 0;
    const sajatHozzajarulokSzama = sajatAllokacio.hozzajarulokSzama || 0;
    
    console.log('Saját tudatpontok', {
      sajatOsszesPont,
      sajatHozzajarulokSzama
    });
    
    // ===== 2. LÉPÉS - Gyerekek hierarchikus pontjainak összesítése =====
    
    let gyerekekHierarchikusPontja = 0;
    const egyediHozzajarulok = new Set(); // Set automatikusan kiszűri a duplikátumokat
    
    // ===== 2.1 - Tartalom gyerekek feldolgozása =====
    
    if (entitasTipus === 'Tartalom' || entitasTipus === 'Kategoria' || entitasTipus === 'TartalomTipus') {
      console.log('frissitEgyHierarchikusAllokacio >>> TartalomRepository.findBySzuloId', { 
        szuloId: entitasId 
      });
      
      const tartalomGyerekek = await TartalomRepository.findBySzuloId(entitasId, 999999, 0);
      console.log(`Tartalom gyerekek száma: ${tartalomGyerekek.length}`);
      
      for (const gyerek of tartalomGyerekek) {
        // Gyerek allokációjának lekérése
        const gyerekAllokacio = await TudatpontRepository.findAllokaciByEntitas(
          gyerek._id,
          'Tartalom'
        );
        
        if (gyerekAllokacio) {
          // ✅ FONTOS: A gyerek HIERARCHIKUS pontját vesszük, nem a sajátját!
          // Ez biztosítja, hogy a teljes alattuk lévő hierarchia benne legyen
          gyerekekHierarchikusPontja += gyerekAllokacio.hierarchikusOsszesPont || 0;
          
          console.log(`Gyerek (Tartalom ${gyerek._id}) hierarchikus pontjai: ${gyerekAllokacio.hierarchikusOsszesPont || 0}`);
          
          // Egyedi hozzájárulók gyűjtése
          const gyerekHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
            gyerek._id,
            'Tartalom',
            999999,
            0
          );
          
          gyerekHozzajarulok.forEach(h => egyediHozzajarulok.add(h.emberId.toString()));
        }
      }
    }
    
    // ===== 2.2 - Javaslat gyerekek feldolgozása =====
    
    console.log('frissitEgyHierarchikusAllokacio >>> JavaslatRepository.findBySzuloId', { 
      szuloId: entitasId 
    });
    
    const javaslatGyerekek = await JavaslatRepository.findBySzuloId(entitasId, 999999, 0);
    console.log(`Javaslat gyerekek száma: ${javaslatGyerekek.length}`);
    
    for (const gyerek of javaslatGyerekek) {
      const gyerekAllokacio = await TudatpontRepository.findAllokaciByEntitas(
        gyerek._id,
        'Javaslat'
      );
      
      if (gyerekAllokacio) {
        gyerekekHierarchikusPontja += gyerekAllokacio.hierarchikusOsszesPont || 0;
        
        console.log(`Gyerek (Javaslat ${gyerek._id}) hierarchikus pontjai: ${gyerekAllokacio.hierarchikusOsszesPont || 0}`);
        
        const gyerekHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
          gyerek._id,
          'Javaslat',
          999999,
          0
        );
        
        gyerekHozzajarulok.forEach(h => egyediHozzajarulok.add(h.emberId.toString()));
      }
    }
    
    // ===== 2.3 - Egyezmény gyerekek feldolgozása =====
    
    console.log('frissitEgyHierarchikusAllokacio >>> EgyezmenyRepository.findBySzuloId', { 
      szuloId: entitasId 
    });
    
    const egyezmenyGyerekek = await EgyezmenyRepository.findBySzuloId(entitasId, 999999, 0);
    console.log(`Egyezmény gyerekek száma: ${egyezmenyGyerekek.length}`);
    
    for (const gyerek of egyezmenyGyerekek) {
      const gyerekAllokacio = await TudatpontRepository.findAllokaciByEntitas(
        gyerek._id,
        'Egyezmeny'
      );
      
      if (gyerekAllokacio) {
        gyerekekHierarchikusPontja += gyerekAllokacio.hierarchikusOsszesPont || 0;
        
        console.log(`Gyerek (Egyezmeny ${gyerek._id}) hierarchikus pontjai: ${gyerekAllokacio.hierarchikusOsszesPont || 0}`);
        
        const gyerekHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
          gyerek._id,
          'Egyezmeny',
          999999,
          0
        );
        
        gyerekHozzajarulok.forEach(h => egyediHozzajarulok.add(h.emberId.toString()));
      }
    }
    
    // ===== 3. LÉPÉS - Saját hozzájárulók hozzáadása =====
    
    console.log('frissitEgyHierarchikusAllokacio >>> TudatpontRepository.findHozzarendelesekByEntitasNyers', {
      entitasId,
      entitasTipus
    });
    
    const sajatHozzajarulok = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
      entitasId,
      entitasTipus,
      999999,
      0
    );
    
    // Saját hozzájárulók hozzáadása a Set-hez (duplikátumok automatikusan kiszűrődnek)
    sajatHozzajarulok.forEach(h => egyediHozzajarulok.add(h.emberId.toString()));
    
    // ===== 4. LÉPÉS - Hierarchikus értékek kiszámítása =====
    
    // Hierarchikus összes pont = saját pont + összes gyerek hierarchikus pontja
    const hierarchikusOsszesPont = sajatOsszesPont + gyerekekHierarchikusPontja;
    
    // Hierarchikus hozzájárulók száma = egyedi emberek száma (Set automatikusan egyedi)
    const hierarchikusHozzajarulokSzama = egyediHozzajarulok.size;
    
    console.log('Hierarchikus értékek kiszámítva', {
      entitasId,
      sajatOsszesPont,
      gyerekekHierarchikusPontja,
      hierarchikusOsszesPont,
      hierarchikusHozzajarulokSzama
    });
    
    // ===== 5. LÉPÉS - Frissítés az adatbázisban =====
    
    console.log('frissitEgyHierarchikusAllokacio >>> TudatpontRepository.updateAllokaciByEntitas', {
      entitasId,
      entitasTipus,
      hierarchikusOsszesPont,
      hierarchikusHozzajarulokSzama
    });
    
    await TudatpontRepository.updateAllokaciByEntitas(
      entitasId,
      entitasTipus,
      {
        hierarchikusOsszesPont: hierarchikusOsszesPont,
        hierarchikusHozzajarulokSzama: hierarchikusHozzajarulokSzama,
        hierarchikusAdatokElavultak: false,                    // ✅ Már nem elavult
        hierarchikusAdatokUtolsoFrissites: new Date()          // Frissítés időpontja
      }
    );
    
    console.log('frissitEgyHierarchikusAllokacio - VÉGE', { 
      entitasId, 
      entitasTipus,
      hierarchikusOsszesPont,
      hierarchikusHozzajarulokSzama
    });
  }


  // ============================================================================
  // ===== HIERARCHIA SZINTEK KISZÁMÍTÁSA (OPCIONÁLIS) =====
  // ============================================================================

  /**
   * ----- HIERARCHIA SZINTEK KISZÁMÍTÁSA ÉS MENTÉSE -----
   * 
   * Az összes entitás hierarchia szintjének kiszámítása és mentése
   * 
   * MŰKÖDÉSI LOGIKA:
   * - Levél entitások (nincs gyerekük) = 0 szint
   * - Szülők szintje = max(gyerek szintek) + 1
   * - Rekurzívan számítja alulról felfelé
   * 
   * HASZNÁLAT:
   * - Egyszer kell futtatni az alkalmazás indításakor
   * - Vagy amikor új entitás jön létre (automatikusan)
   * 
   * TODO: Implementálás - BFS vagy DFS algoritmus
   * 
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


// ===== EXPORTÁLÁS =====

// Service osztály SINGLETON példány exportálása
module.exports = new HierarchikusFrissitesService();
