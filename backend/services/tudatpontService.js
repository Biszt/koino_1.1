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
const ErtesitesService = require('./ertesitesService'); // Tudatpont-változáskor értesítjük a figyelőket
const ErtesitesiBeallitasService = require('./ertesitesiBeallitasService'); // szuloKereses az ág-szűréshez (Tudatpontok nézet)
const ErtesitesRepository = require('../repositories/ertesitesRepository'); // Árva értesítések takarítása entitás-törléskor


// ===== TUDATPONT SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az üzleti logikát
class TudatpontService {

  // ----- TUDATPONTOK HOZZÁRENDELÉSE -----
  /**
   * Tudatpontok hozzárendelése egy entitáshoz (tartalom/kategória/típus/javaslat/egyezmény)
   * Transaction használatával biztosítja a konzisztenciát
   * MÓDOSÍTVA: Hierarchikus tudatpont frissítés hozzáadva
   * @param {string} eemberId - A eember azonosítója
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} ujPontok - Az új tudatpont érték (nem különbség!)
   * @returns {Promise<Object>} A művelet eredménye
   */
  async tudatpontHozzarendelese(eemberId, entitasId, entitasTipus, ujPontok) {
    console.log('tudatpontHozzarendelese', {
      eemberId: eemberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      ujPontok: ujPontok
    });

    // 1. LÉPÉS - PARAMÉTEREK VALIDÁLÁSA (MINDEN ELLENŐRZÉS EGY HELYEN)
    
    // 1.A - Null/undefined ellenőrzés
    if (!eemberId || !entitasId || !entitasTipus) {
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
      console.log('tudatpontHozzarendelese - TudatpontRepository.findeEmberById', { eemberId: eemberId });
      const eember = await TudatpontRepository.findeEmberById(eemberId);

      if (!eember) {
        throw new Error('eEmber nem található');
      }

      // 4. LÉPÉS - RÉGI HOZZÁRENDELÉS LEKÉRÉSE (HA VAN)
      console.log('tudatpontHozzarendelese - TudatpontRepository.findHozzarendelesByeEmberEsEntitas', {
        eemberId: eemberId
      });
      const regiHozzarendeles = await TudatpontRepository.findHozzarendelesByeEmberEsEntitas(
        eemberId,
        entitasId,
        entitasTipus
      );

      // Régi pontok meghatározása (ha nincs hozzárendelés, akkor 0)
      const regiPontok = regiHozzarendeles ? regiHozzarendeles.tudatPontok : 0;

      // 5. LÉPÉS - KÜLÖNBSÉG KISZÁMÍTÁSA
      // Különbség = új érték - régi érték
      // Pozitív → növelés (eember több pontot ad)
      // Negatív → csökkentés (eember visszavon pontokat)
      // Nulla → nincs változás
      const kulonbseg = ujPontok - regiPontok;

      // 6. LÉPÉS - ELLENŐRZÉS: VAN-E ELÉG TUDATPONT?
      // Csak akkor kell ellenőrizni, ha növelés történik (kulonbseg > 0)
      if (kulonbseg > 0 && eember.tudatpontok < kulonbseg) {
        throw new Error('Nincs elég tudatpont a művelet végrehajtásához');
      }

      // 7. LÉPÉS - EMBER EGYENLEGÉNEK MÓDOSÍTÁSA
      // Ha kulonbseg > 0: levonás (eember ad pontot)
      // Ha kulonbseg < 0: visszaadás (eember visszavon pontot)
      // Ha kulonbseg = 0: nincs változás
      if (kulonbseg !== 0) {
        const ujEgyenleg = eember.tudatpontok - kulonbseg;
        console.log('tudatpontHozzarendelese - TudatpontRepository.updateeEmberTudatpontok', {
          eemberId: eemberId,
          ujEgyenleg: ujEgyenleg
        });
        await TudatpontRepository.updateeEmberTudatpontok(eemberId, ujEgyenleg);
      }

      // 8. LÉPÉS - HOZZÁRENDELÉS FRISSÍTÉSE/LÉTREHOZÁSA
      // Upsert: ha létezik frissíti, ha nem létrehozza
      console.log('tudatpontHozzarendelese - TudatpontRepository.upsertHozzarendeles', {
        eemberId: eemberId,
        entitasId: entitasId,
        entitasTipus: entitasTipus,
        ujPontok: ujPontok
      });
      await TudatpontRepository.upsertHozzarendeles(eemberId, entitasId, entitasTipus, ujPontok);

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
          await this.hierarchikusFrissitesVegrehajtas(eemberId, entitasId, entitasTipus, kulonbseg);
          
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
          await this.hierarchikusFrissitesVegrehajtas(eemberId, entitasId, entitasTipus, kulonbseg);
          
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
          await this.hierarchikusFrissitesVegrehajtas(eemberId, entitasId, entitasTipus, kulonbseg);
        }


      // 10. LÉPÉS - TRANSACTION COMMIT
      // Ha idáig eljutottunk, minden művelet sikeres volt
      await session.commitTransaction();

      // 10.B - ÉRTESÍTÉS: tudatpont-változás az entitáson (a mozgatót kihagyva).
      // Csak ha VOLT változás. A transaction MÁR commitolt → best-effort, a küldés
      // hibája nem érinti a művelet eredményét (a helper elnyeli a hibát).
      if (kulonbseg !== 0) {
        await this._tudatpontValtozasErtesites(eemberId, entitasId, entitasTipus, kulonbseg);
      }

      // 11. LÉPÉS - EREDMÉNY VISSZAADÁSA
      console.log('tudatpontHozzarendelese - EREDMÉNY', {
        siker: true,
        ujeEmberEgyenleg: eember.tudatpontok - kulonbseg,
        ujPontok: ujPontok,
        regiPontok: regiPontok,
        kulonbseg: kulonbseg
      });

      return {
        siker: true,
        ujeEmberEgyenleg: eember.tudatpontok - kulonbseg,
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


  // ----- ÉRTESÍTÉS: TUDATPONT-VÁLTOZÁS -----
  // Egy entitáson bekövetkezett pont-változásról értesíti a FIGYELŐket (a mozgatót
  // kihagyva). BEST-EFFORT: a küldés hibája nem terjed tovább (a hívó után commitolt).
  // Az `adatok` a küszöb-kiértékeléshez (tudatpontKuszobok, "VAGY" logika):
  //   sajatValtozas / osszValtozas – a változás mértéke (közvetlen allokációnál mindkettő = kulonbseg),
  //   sajatOssz    – az entitás ÚJ saját (közvetlen) összpontja,
  //   osszOssz     – az entitás ÚJ hierarchikus összpontja (leszármazottakkal).
  // @param {string} eemberId - a pontot mozgató e-ember (cselekvő)
  // @param {string} entitasId, entitasTipus - az entitás, ahol a pont változott
  // @param {number} kulonbseg - a változás előjeles mértéke
  async _tudatpontValtozasErtesites(eemberId, entitasId, entitasTipus, kulonbseg) {
    try {
      const allok = await this.entitasAllokaciLekerese(entitasId, entitasTipus);
      const hier = await HierarchikusTudatpontAllokaciRepository.findByEntitas(entitasId, entitasTipus);

      await ErtesitesService.ertesitesKuldes(
        entitasId,
        entitasTipus,
        'tudatpontValtozas',
        {
          sajatValtozas: kulonbseg,
          osszValtozas: kulonbseg,
          sajatOssz: allok?.osszesPont ?? 0,
          osszOssz: hier?.hierarchikusOsszesPont ?? 0
        },
        eemberId // a pont mozgatóját NEM értesítjük magát
      );
    } catch (ertesitesHiba) {
      console.error('_tudatpontValtozasErtesites - HIBA (nem blokkolo)', { hiba: ertesitesHiba.message });
    }
  }


  /**
   * ----- HIERARCHIKUS FRISSÍTÉS VÉGREHAJTÁSA -----
   * Segédfüggvény a hierarchikus tudatpont frissítéshez
   * A különbség propagálása felfelé a szülő láncon
   * @param {string} eemberId - Az eember azonosítója
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} kulonbseg - A tudatpont különbség
   * @returns {Promise<void>}
   */
  async hierarchikusFrissitesVegrehajtas(eemberId, entitasId, entitasTipus, kulonbseg) {
    console.log('hierarchikusFrissitesVegrehajtas - KEZDÉS', { entitasId, entitasTipus, kulonbseg });

    // Csak akkor frissítünk, ha van változás
    if (kulonbseg === 0) {
      console.log('hierarchikusFrissitesVegrehajtas - Nincs változás (kulonbseg=0), SKIP');
      return;
    }

    // 1. LÉPÉS - Saját entitás szülő adatainak lekérése
    // VÁLTOZÁS: szükség van a szuloId/szuloTipus-ra, hogy az upsert esetén
    // az új HierarchikusTudatpontAllokacio rekordba bekerüljön a szülő adat
    console.log('hierarchikusFrissitesVegrehajtas - this.getSzuloEntitas (saját)', {
      entitasId, entitasTipus
    });

    const sajatSzulo = await this.getSzuloEntitas(entitasId, entitasTipus);
    const sajatSzuloId = sajatSzulo?.szuloId || null;
    const sajatSzuloTipus = sajatSzulo?.szuloTipus || null;

    // 2. LÉPÉS - Saját entitás hierarchikus rekordjának létrehozása vagy frissítése
    // VÁLTOZÁS: incrementHierarchikusPont helyett kétlépéses logika:
    //   - Ha már létezik a rekord → csak incrementálunk (gyorsabb, atomi)
    //   - Ha még nem létezik → createOrUpdate()-tel hozzuk létre szuloId-val együtt
    console.log('hierarchikusFrissitesVegrehajtas - HierarchikusTudatpontAllokaciRepository.existsByEntitas', {
      entitasId, entitasTipus
    });

    const letezik = await HierarchikusTudatpontAllokaciRepository.existsByEntitas(
      entitasId,
      entitasTipus
    );

    if (letezik) {
      // Már létezik → egyszerű increment (szuloId már benne van a rekordban)
      console.log('hierarchikusFrissitesVegrehajtas - HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont (saját, létező)', {
        entitasId, entitasTipus, kulonbseg
      });

      await HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont(
        entitasId,
        entitasTipus,
        kulonbseg
      );
    } else {
      // Még nem létezik → createOrUpdate szuloId-val együtt (upsert)
      // FONTOS: az első pont értéke maga a kulonbseg (nincs előző érték)
      console.log('hierarchikusFrissitesVegrehajtas - HierarchikusTudatpontAllokaciRepository.createOrUpdate (saját, ÚJ)', {
        entitasId, entitasTipus, kulonbseg, sajatSzuloId, sajatSzuloTipus
      });

      await HierarchikusTudatpontAllokaciRepository.createOrUpdate(
        entitasId,
        entitasTipus,
        kulonbseg,       // Első érték = maga a különbség
        sajatSzuloId,    // Szülő ID mentése az új rekordba
        sajatSzuloTipus  // Szülő típus mentése az új rekordba
      );
    }

    // 3. LÉPÉS - Felfelé lépdelés a szülő láncon
    // Minden ősnek növeljük/csökkentjük a hierarchikus pontját
    let aktualisEntitas = { entitasId, entitasTipus };

    // VÉDELEM: körkörös szülő-hivatkozás (adathiba) esetén a lánc sosem
    // érne véget — a bejárt entitásokat nyilvántartjuk, és korlátozzuk
    // a lépések számát is
    const bejartEntitasok = new Set([entitasId.toString()]);
    let lepesVedelem = 0;

    while (lepesVedelem < 100) {
      lepesVedelem++;

      // Szülő lekérése az aktuális entitáshoz
      console.log('hierarchikusFrissitesVegrehajtas - this.getSzuloEntitas', {
        entitasId: aktualisEntitas.entitasId,
        entitasTipus: aktualisEntitas.entitasTipus
      });

      const szulo = await this.getSzuloEntitas(
        aktualisEntitas.entitasId,
        aktualisEntitas.entitasTipus
      );

      // Ha nincs szülő, elértük a gyökeret, megállunk
      if (!szulo || !szulo.szuloId) {
        console.log('hierarchikusFrissitesVegrehajtas - Elértük a gyökeret, STOP');
        break;
      }

      // VÉDELEM: ha a szülő már szerepelt a láncban (önmaga szülője,
      // vagy hosszabb kör), az adat sérült — megállunk és hibát logolunk
      if (bejartEntitasok.has(szulo.szuloId.toString())) {
        console.error('hierarchikusFrissitesVegrehajtas - KÖRKÖRÖS SZÜLŐ-HIVATKOZÁS ÉSZLELVE, lánc megszakítva!', {
          entitasId: aktualisEntitas.entitasId,
          korkorosSzuloId: szulo.szuloId
        });
        break;
      }
      bejartEntitasok.add(szulo.szuloId.toString());

      // Szülő hierarchikus pontjának frissítése
      // A szülőnél már biztosan létezik a rekord (ő is kapott pontot korábban),
      // ezért itt elég az increment
      console.log('hierarchikusFrissitesVegrehajtas - HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont (szülő)', {
        szuloId: szulo.szuloId, szuloTipus: szulo.szuloTipus, kulonbseg
      });

      await HierarchikusTudatpontAllokaciRepository.incrementHierarchikusPont(
        szulo.szuloId,
        szulo.szuloTipus,
        kulonbseg
      );

      // Lépés a következő szintre (szülő → nagyszülő)
      aktualisEntitas = { entitasId: szulo.szuloId, entitasTipus: szulo.szuloTipus };
    }

    console.log('hierarchikusFrissitesVegrehajtas - VÉGE', { entitasId, entitasTipus });
  }


    // ============================================================================
  // MÓDOSÍTOTT: entitasTorleseEllenorzese
  // ÚJ: Gyerekek HierarchikusTudatpontAllokacio rekordjában is frissítjük a szuloId-t
  // ============================================================================
  async entitasTorleseEllenorzese(entitasId, entitasTipus, session) {
    console.log('entitasTorleseEllenorzese - KEZDÉS', { entitasId, entitasTipus });

    // 1. LÉPÉS - Allokáció lekérése
    console.log('entitasTorleseEllenorzese - TudatpontRepository.findAllokaciByEntitas', {
      entitasId, entitasTipus
    });

    const allokacio = await TudatpontRepository.findAllokaciByEntitas(entitasId, entitasTipus);

    // 2. LÉPÉS - Ellenőrzés: 0 pont van-e rajta?
    if (!allokacio || allokacio.osszesPont > 0) {
      console.log('entitasTorleseEllenorzese - Entitás NEM törlendő', {
        allokacio: allokacio?.osszesPont || 0
      });
      return;
    }

    console.log('entitasTorleseEllenorzese - Entitás törlendő (0 tudatpont)', { entitasId, entitasTipus });

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
      toroltEntitasSzuloId, toroltEntitasSzuloTipus
    });

    // 4. LÉPÉS - Gyerekek lekérése és frissítése (KASZKÁD)
    // MINDEN GYEREKNÉL: frissítjük az entitás szuloId-ját ÉS a hierarchikus allokáció szuloId-ját

    // 4.A - Tartalom gyerekek
    console.log('entitasTorleseEllenorzese - TartalomRepository.findBySzuloId', { szuloId: entitasId });
    const tartalomGyerekek = await TartalomRepository.findBySzuloId(entitasId);
    console.log('entitasTorleseEllenorzese - Tartalom gyerekek', { count: tartalomGyerekek.length });

    for (const gyerek of tartalomGyerekek) {
      // Entitás szuloId frissítése
      console.log('entitasTorleseEllenorzese - TartalomRepository.updateSzuloId', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await TartalomRepository.updateSzuloId(
        gyerek._id,
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      // VÁLTOZÁS: Hierarchikus allokáció szuloId frissítése is!
      // Indok: a hierarchikusFrissitesService.js a HierarchikusTudatpontAllokacio.szuloId
      // alapján navigál felfelé, tehát ennek is aktuálisnak kell lennie
      console.log('entitasTorleseEllenorzese - HierarchikusTudatpontAllokaciRepository.updateSzuloId (Tartalom gyerek)', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await HierarchikusTudatpontAllokaciRepository.updateSzuloId(
        gyerek._id,
        'Tartalom',
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      console.log('entitasTorleseEllenorzese - Tartalom gyerek frissítve', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId
      });
    }

    // 4.B - Javaslat gyerekek
    console.log('entitasTorleseEllenorzese - JavaslatRepository.findBySzuloId', { szuloId: entitasId });
    const javaslatGyerekek = await JavaslatRepository.findBySzuloId(entitasId);
    console.log('entitasTorleseEllenorzese - Javaslat gyerekek', { count: javaslatGyerekek.length });

    for (const gyerek of javaslatGyerekek) {
      console.log('entitasTorleseEllenorzese - JavaslatRepository.updateSzuloId', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await JavaslatRepository.updateSzuloId(
        gyerek._id,
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      // VÁLTOZÁS: Hierarchikus allokáció szuloId frissítése
      console.log('entitasTorleseEllenorzese - HierarchikusTudatpontAllokaciRepository.updateSzuloId (Javaslat gyerek)', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await HierarchikusTudatpontAllokaciRepository.updateSzuloId(
        gyerek._id,
        'Javaslat',
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      console.log('entitasTorleseEllenorzese - Javaslat gyerek frissítve', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId
      });
    }

    // 4.C - Egyezmény gyerekek
    console.log('entitasTorleseEllenorzese - EgyezmenyRepository.findBySzuloId', { szuloId: entitasId });
    const egyezmenyGyerekek = await EgyezmenyRepository.findBySzuloId(entitasId);
    console.log('entitasTorleseEllenorzese - Egyezmény gyerekek', { count: egyezmenyGyerekek.length });

    for (const gyerek of egyezmenyGyerekek) {
      console.log('entitasTorleseEllenorzese - EgyezmenyRepository.updateSzuloId', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await EgyezmenyRepository.updateSzuloId(
        gyerek._id,
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      // VÁLTOZÁS: Hierarchikus allokáció szuloId frissítése
      console.log('entitasTorleseEllenorzese - HierarchikusTudatpontAllokaciRepository.updateSzuloId (Egyezmeny gyerek)', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId, ujSzuloTipus: toroltEntitasSzuloTipus
      });
      await HierarchikusTudatpontAllokaciRepository.updateSzuloId(
        gyerek._id,
        'Egyezmeny',
        toroltEntitasSzuloId,
        toroltEntitasSzuloTipus
      );

      console.log('entitasTorleseEllenorzese - Egyezmeny gyerek frissítve', {
        gyerekId: gyerek._id, ujSzuloId: toroltEntitasSzuloId
      });
    }

    // 5. LÉPÉS - SPECIÁLIS ESET: Kategória törlése
    if (entitasTipus === 'Kategoria') {
      console.log('entitasTorleseEllenorzese - Kategória törlése - Tartalmak tisztítása', {
        kategoriaId: entitasId
      });
      console.log('entitasTorleseEllenorzese - TartalomRepository.removeCategoriaFromAll');
      await TartalomRepository.removeCategoriaFromAll(entitasId);
      console.log('entitasTorleseEllenorzese - Kategória eltávolítva minden tartalom kategoriaIds tömbjéből');
    }

    // 6. LÉPÉS - SPECIÁLIS ESET: TartalomTípus törlése
    if (entitasTipus === 'TartalomTipus') {
      console.log('entitasTorleseEllenorzese - TartalomTípus törlése - Tartalmak tisztítása', {
        tartalomTipusId: entitasId
      });
      console.log('entitasTorleseEllenorzese - TartalomRepository.removeTartalomTipusFromAll');
      await TartalomRepository.removeTartalomTipusFromAll(entitasId);
      console.log('entitasTorleseEllenorzese - TartalomTípus eltávolítva minden tartalomból');
    }

    // 7. LÉPÉS - Entitás törlése típus szerint
    if (entitasTipus === 'Tartalom') {
      console.log('entitasTorleseEllenorzese - TartalomRepository.deleteById', { entitasId });
      await TartalomRepository.deleteById(entitasId);
      console.log('entitasTorleseEllenorzese - Tartalom törölve', { entitasId });

    } else if (entitasTipus === 'Kategoria') {
      console.log('entitasTorleseEllenorzese - KategoriaRepository.deleteById', { entitasId });
      await KategoriaRepository.deleteById(entitasId);
      console.log('entitasTorleseEllenorzese - Kategória törölve', { entitasId });

    } else if (entitasTipus === 'TartalomTipus') {
      console.log('entitasTorleseEllenorzese - TartalomTipusRepository.deleteById', { entitasId });
      await TartalomTipusRepository.deleteById(entitasId);
      console.log('entitasTorleseEllenorzese - TartalomTípus törölve', { entitasId });

    } else if (entitasTipus === 'Javaslat') {
      console.log('entitasTorleseEllenorzese - JavaslatRepository.deleteById', { entitasId });
      await JavaslatRepository.deleteById(entitasId);
      console.log('entitasTorleseEllenorzese - Javaslat törölve', { entitasId });

    } else if (entitasTipus === 'Egyezmeny') {
      console.log('entitasTorleseEllenorzese - EgyezmenyRepository.deleteById', { entitasId });
      await EgyezmenyRepository.deleteById(entitasId);
      console.log('entitasTorleseEllenorzese - Egyezmény törölve', { entitasId });

    } else {
      console.warn('entitasTorleseEllenorzese - Ismeretlen entitás típus', { entitasTipus });
      return;
    }

    // 8. LÉPÉS - Allokáció törlése
    if (allokacio) {
      console.log('entitasTorleseEllenorzese - TudatpontRepository.deleteAllokaciByEntitas', {
        entitasId, entitasTipus
      });
      await TudatpontRepository.deleteAllokaciByEntitas(entitasId, entitasTipus);
      console.log('entitasTorleseEllenorzese - Allokáció törölve', { entitasTipus, entitasId });
    }

    // 9. LÉPÉS - Hierarchikus allokáció törlése
    console.log('entitasTorleseEllenorzese - HierarchikusTudatpontAllokaciRepository.deleteByEntitas', {
      entitasId, entitasTipus
    });
    await HierarchikusTudatpontAllokaciRepository.deleteByEntitas(entitasId, entitasTipus);
    console.log('entitasTorleseEllenorzese - Hierarchikus allokáció törölve', {
      entitasTipus, entitasId
    });

    console.log('entitasTorleseEllenorzese - VÉGE', { entitasId, entitasTipus });
  }



  // ============================================================
  // ALLOKÁCIÓ LEKÉRDEZÉS
  // ============================================================

  // ----- ENTITÁS ALLOKÁCIÓJÁNAK LEKÉRÉSE -----
  // Entitáshoz tartozó tudatpont adatok lekérése
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @param {string|null} eemberId - A eember azonosítója (opcionális)
  // @returns {Promise<Object>} A tudatpont adatok
  async entitasAllokaciLekerese(entitasId, entitasTipus, eemberId = null) {

    console.log("=================================== entitasAllokaciLekerese:: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      eemberId: eemberId,
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
        eemberHozzajarulas: 0
      };
    }

    // 3. LÉPÉS - eEmber hozzájárulásának meghatározása (ha kérték)
    let eemberHozzajarulas = 0;
    
    if (eemberId) {

      console.log("entitasAllokaciLekerese >>>>>>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesByeEmberEsEntitas", {
        eemberId: eemberId,
        entitasId: entitasId,
        entitasTipus: entitasTipus
      });
      const hozzarendeles = await TudatpontRepository.findHozzarendelesByeEmberEsEntitas(
        eemberId,
        entitasId,
        entitasTipus
      );
      
      if (hozzarendeles) {
        eemberHozzajarulas = hozzarendeles.tudatPontok;
      }
    }

    // 4. LÉPÉS - Adatok visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<<< entitasAllokaciLekerese====Eredmény: ", {
      osszesPont: allokacio.osszesPont,
      hozzajarulokSzama: allokacio.hozzajarulokSzama,
      eemberHozzajarulas: eemberHozzajarulas,
      letrehozva: allokacio.letrehozva,
      frissitve: allokacio.frissitve
    });
    
    return {
      osszesPont: allokacio.osszesPont,
      hozzajarulokSzama: allokacio.hozzajarulokSzama,
      eemberHozzajarulas: eemberHozzajarulas,
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
  // FELMENŐ-SZABÁLY (a tudatpont hozzárendeléshez)
  // ============================================================
  // Szabály: aki tudatpontot tesz egy entitásra, annak a teljes szülőláncán
  // (a gyökérig, bármilyen típusú szülővel) legalább 1 tudatpontja kell legyen.
  // Ha nincs, engedély után minden hiányzó felmenőre automatikusan 1-1 pont kerül.

  // ----- ENTITÁS MEGJELENÍTŐ NEVÉNEK LEKÉRÉSE -----
  /**
   * Egy entitás emberi olvasható neve (Tartalom → cim, Kategória/TartalomTípus → nev).
   * A felmérés ezzel tudja megnevezni a hiányzó felmenőket a felhasználónak.
   * @param {string} entitasId
   * @param {string} entitasTipus
   * @returns {Promise<string>}
   */
  async getEntitasNev(entitasId, entitasTipus) {
    console.log('getEntitasNev - KEZDÉS', { entitasId, entitasTipus });

    let entitas = null;
    if (entitasTipus === 'Tartalom') {
      entitas = await TartalomRepository.findById(entitasId);
    } else if (entitasTipus === 'Kategoria') {
      entitas = await KategoriaRepository.findById(entitasId);
    } else if (entitasTipus === 'TartalomTipus') {
      entitas = await TartalomTipusRepository.findById(entitasId);
    } else if (entitasTipus === 'Javaslat') {
      entitas = await JavaslatRepository.findById(entitasId);
    } else if (entitasTipus === 'Egyezmeny') {
      entitas = await EgyezmenyRepository.findById(entitasId);
    }

    // Tartalomnál cim, Kategória/TartalomTípusnál nev; ha egyik sincs, semleges felirat
    const nev = entitas?.cim ?? entitas?.nev ?? '(névtelen)';
    console.log('getEntitasNev - VÉGE', { nev });
    return nev;
  }

  // ----- HIÁNYZÓ FELMENŐK FELMÉRÉSE -----
  /**
   * Végigjárja egy entitás szülőláncát a gyökérig, és összegyűjti azokat a
   * felmenőket, amelyeken a eembernek NINCS tudatpontja. A tudatpont módosítás
   * megnyitásakor hívjuk, hogy előre lássuk, hány felmenőre kellene pont.
   * @param {string} eemberId
   * @param {string} entitasId
   * @param {string} entitasTipus
   * @returns {Promise<Object>} { felmenokSzama, hianyzoDb, hianyzoFelmenok, eemberEgyenleg, elegEgyenlegAFelmenokre }
   */
  async hianyzoFelmenokFelmerese(eemberId, entitasId, entitasTipus) {
    console.log('hianyzoFelmenokFelmerese - KEZDÉS', { eemberId, entitasId, entitasTipus });

    // 1. LÉPÉS - Paraméterek validálása
    if (!eemberId || !entitasId || !entitasTipus) {
      throw new Error('Hiányzó kötelező paraméterek');
    }

    // 2. LÉPÉS - Szülőlánc bejárása felfelé a gyökérig
    const felmenok = [];         // a teljes lánc (tájékoztatáshoz)
    const hianyzoFelmenok = [];  // csak amelyeken nincs a eembernek pontja

    let aktualis = { entitasId, entitasTipus };

    // VÉDELEM: körkörös szülő-hivatkozás (adathiba) esetén a lánc sosem érne
    // véget — a bejárt entitásokat nyilvántartjuk, és a lépéseket is korlátozzuk
    const bejart = new Set([entitasId.toString()]);
    let vedelem = 0;

    while (vedelem < 100) {
      vedelem++;

      const szulo = await this.getSzuloEntitas(aktualis.entitasId, aktualis.entitasTipus);

      // Nincs szülő → elértük a gyökeret
      if (!szulo || !szulo.szuloId) {
        console.log('hianyzoFelmenokFelmerese - Elértük a gyökeret, STOP');
        break;
      }

      // Körkörös hivatkozás → megszakítjuk
      if (bejart.has(szulo.szuloId.toString())) {
        console.error('hianyzoFelmenokFelmerese - KÖRKÖRÖS SZÜLŐ-HIVATKOZÁS, lánc megszakítva', {
          korkorosSzuloId: szulo.szuloId
        });
        break;
      }
      bejart.add(szulo.szuloId.toString());

      felmenok.push({ entitasId: szulo.szuloId.toString(), entitasTipus: szulo.szuloTipus });

      // Van-e a eembernek pontja ezen a felmenőn?
      const hozzajarulas = await this.eemberHozzajarulasaEntitason(
        eemberId,
        szulo.szuloId,
        szulo.szuloTipus
      );

      if (!hozzajarulas.vanHozzajarulas) {
        // Nincs pontja → hiányzó felmenő, névvel együtt gyűjtjük
        const nev = await this.getEntitasNev(szulo.szuloId, szulo.szuloTipus);
        hianyzoFelmenok.push({
          entitasId: szulo.szuloId.toString(),
          entitasTipus: szulo.szuloTipus,
          nev
        });
      }

      // Lépés a következő szintre (szülő → nagyszülő)
      aktualis = { entitasId: szulo.szuloId, entitasTipus: szulo.szuloTipus };
    }

    // 3. LÉPÉS - eEmber egyenlegének lekérése (elég-e a hiányzó felmenőkre)
    const eember = await TudatpontRepository.findeEmberById(eemberId);
    const eemberEgyenleg = eember?.tudatpontok ?? 0;

    const eredmeny = {
      felmenokSzama: felmenok.length,
      hianyzoDb: hianyzoFelmenok.length,
      hianyzoFelmenok,
      eemberEgyenleg,
      // Minden hiányzó felmenőre 1 pont kell — van-e ennyi egyenleg
      elegEgyenlegAFelmenokre: eemberEgyenleg >= hianyzoFelmenok.length
    };

    console.log('hianyzoFelmenokFelmerese - VÉGE', {
      felmenokSzama: eredmeny.felmenokSzama,
      hianyzoDb: eredmeny.hianyzoDb,
      eemberEgyenleg: eredmeny.eemberEgyenleg
    });
    return eredmeny;
  }

  // ----- FELHASZNÁLÓI TUDATPONT HOZZÁRENDELÉS (FELMENŐ-ELLENŐRZÉSSEL) -----
  /**
   * A felhasználó által indított tudatpont hozzárendelés belépési pontja.
   * Kikényszeríti a felmenő-szabályt, mielőtt a nyers hozzárendelést elvégzi.
   * A belső/rendszer hívások (javaslat-végrehajtók, visszaosztás) továbbra is
   * közvetlenül a tudatpontHozzarendelese-t használják, ellenőrzés nélkül.
   * @param {string} eemberId
   * @param {string} entitasId
   * @param {string} entitasTipus
   * @param {number} ujPontok - Az új abszolút tudatpont érték (nem különbség)
   * @param {boolean} felmenoketAutomatikusan - Ha true, a hiányzó felmenőkre 1-1 pontot tesz
   * @returns {Promise<Object>} A nyers hozzárendelés eredménye
   */
  async felhasznaloTudatpontHozzarendelese(eemberId, entitasId, entitasTipus, ujPontok, felmenoketAutomatikusan = false) {
    console.log('felhasznaloTudatpontHozzarendelese - KEZDÉS', {
      eemberId, entitasId, entitasTipus, ujPontok, felmenoketAutomatikusan
    });

    // 1. LÉPÉS - Alap validáció (a részletes ellenőrzést a nyers metódus is elvégzi)
    if (!eemberId || !entitasId || !entitasTipus) {
      throw new Error('Hiányzó kötelező paraméterek');
    }
    if (typeof ujPontok !== 'number' || isNaN(ujPontok)) {
      throw new Error('A pontok értéknek számnak kell lennie');
    }
    if (ujPontok < 0) {
      throw new Error('A tudatpontok nem lehetnek negatívak');
    }

    // 2. LÉPÉS - Felmenő-szabály (csak ha pontot TESZÜNK az entitásra)
    // 0-ra állításnál (visszavonás) nincs felmenő-követelmény.
    if (ujPontok > 0) {
      const felmeres = await this.hianyzoFelmenokFelmerese(eemberId, entitasId, entitasTipus);

      if (felmeres.hianyzoDb > 0) {
        // 2.A - Ha a hívó nem kérte a felmenők automatikus kitöltését, elutasítjuk,
        // és a hiányzó felmenők listáját visszaadjuk (a frontend ebből ajánlja fel a kitöltést)
        if (!felmenoketAutomatikusan) {
          const err = new Error('A tudatpont-hozzárendeléshez minden felmenőn legalább 1 tudatpont szükséges');
          err.kod = 'HIANYZO_FELMENOK';
          err.hianyzoFelmenok = felmeres.hianyzoFelmenok;
          throw err;
        }

        // 2.B - Egyenleg-előellenőrzés: a hiányzó felmenőkre 1-1 pont + erre az
        // entitásra a növekmény. Így nem fordulhat elő, hogy pár felmenő megkapja
        // a pontot, de a fő művelet egyenleg híján elbukik (részleges állapot).
        const regiPontok = (await this.eemberHozzajarulasaEntitason(eemberId, entitasId, entitasTipus)).pontok;
        const foKoltseg = Math.max(0, ujPontok - regiPontok);
        const felmenoKoltseg = felmeres.hianyzoDb; // 1 pont / hiányzó felmenő

        if (felmeres.eemberEgyenleg < foKoltseg + felmenoKoltseg) {
          throw new Error(
            `Nincs elég tudatpontod: a felmenőkre ${felmenoKoltseg}, erre az entitásra ${foKoltseg} pont kellene, de csak ${felmeres.eemberEgyenleg} tudatpontod van.`
          );
        }

        // 2.C - Hiányzó felmenők kitöltése: mindegyikre 1 pont
        for (const felmeno of felmeres.hianyzoFelmenok) {
          console.log('felhasznaloTudatpontHozzarendelese - Felmenő automatikus kitöltése', felmeno);
          await this.tudatpontHozzarendelese(eemberId, felmeno.entitasId, felmeno.entitasTipus, 1);
        }
      }
    }

    // 3. LÉPÉS - Fő művelet: a kért entitásra a kért pont beállítása
    const eredmeny = await this.tudatpontHozzarendelese(eemberId, entitasId, entitasTipus, ujPontok);

    console.log('felhasznaloTudatpontHozzarendelese - VÉGE', {
      ujeEmberEgyenleg: eredmeny?.ujeEmberEgyenleg
    });
    return eredmeny;
  }


  // ============================================================
  // EMBER HOZZÁRENDELÉSEINEK LEKÉRDEZÉSE
  // ============================================================

  // ----- EMBER ÖSSZES HOZZÁRENDELÉSÉNEK LEKÉRÉSE -----
  // eEmber tudatpont hozzárendeléseinek lekérdezése (lapozással)
  // @param {string} eemberId - A eember azonosítója
  // @param {number} limit - Maximum ennyi hozzárendelés (alapértelmezett: 20)
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @returns {Promise<Array>} A hozzárendelések listája
  async eemberHozzarendeleseinekLekerese(eemberId, limit = 20, skip = 0) {

    console.log("=================================== eemberHozzarendeleseinekLekerese:: ", {
      eemberId: eemberId,
      limit: limit,
      skip: skip,
    });
    
    // 1. LÉPÉS - Paraméter validálás
    if (!eemberId) {
      throw new Error('A eember azonosítója kötelező');
    }

    // 2. LÉPÉS - Hozzárendelések lekérdezése

    console.log("eemberHozzarendeleseinekLekerese >>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByeEmber", {
      eemberId: eemberId,
      limit: limit,
      skip: skip
    });
    
    const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByeEmber(
      eemberId,
      limit,
      skip
    );

    // 3. LÉPÉS - Hozzárendelések visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< eemberHozzarendeleseinekLekerese====hozzarendelesek", {
      hozzarendelesek: hozzarendelesek
    });
    
    return hozzarendelesek;
  }

  // ----- EMBER AKTÍV HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
  // Csak azok a hozzárendelések, ahol tudatPontok > 0.
  // A Tudatpontok nézethez (terv 7. pont) BŐVÍTVE (2026-07-18):
  //   - minden elemhez feltöltjük az entitás címét/nevét (`entitasCim`),
  //   - opcionális ÁG-SZŰRÉS (agEntitasId): csak azok a hozzárendelések, amelyek
  //     entitása az adott entitás ÁGA alatt van (maga az entitás vagy leszármazott)
  //     — a kártya-menük „Tudatpontok" pontja használja. A szűréshez az entitás
  //     ős-láncát járjuk be (szuloKereses), entitásonként cache-elve.
  // @param {string} eemberId - A eember azonosítója
  // @param {number} limit - Maximum ennyi hozzárendelés
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @param {string|null} agEntitasId - opcionális ág-szűrő entitás azonosító
  // @returns {Promise<Array>} Az aktív hozzárendelések listája (entitasCim-mel)
  async eemberAktivHozzarendeleseinekLekerese(eemberId, limit = 20, skip = 0, agEntitasId = null) {

    console.log("=================================== eemberAktivHozzarendeleseinekLekerese:: ", {
      eemberId: eemberId,
      limit: limit,
      skip: skip,
      agEntitasId: agEntitasId,
    });

    // 1. LÉPÉS - Paraméter validálás
    if (!eemberId) {
      throw new Error('A eember azonosítója kötelező');
    }

    // 2. LÉPÉS - Aktív hozzárendelések lekérdezése
    // Ág-szűrésnél NEM lapozunk az adatbázisban (a szűrés utólag dönti el, mi
    // marad), hanem az összes aktív hozzárendelést lekérjük, és a végén
    // alkalmazzuk a skip/limit-et. Egy e-ember aktív hozzárendelése a véges
    // tudatpont-keret miatt korlátos mennyiség.
    const dbLimit = agEntitasId ? 1000 : limit;
    const dbSkip = agEntitasId ? 0 : skip;

    let hozzarendelesek = await TudatpontRepository.findAktivHozzarendelesekByeEmber(
      eemberId,
      dbLimit,
      dbSkip
    );

    // 3. LÉPÉS - ÁG-SZŰRÉS (ha kérték)
    if (agEntitasId) {
      const agKulcs = agEntitasId.toString();
      // Entitásonként egyszer döntjük el, az ág alatt van-e (cache)
      const agAlattCache = new Map(); // '<tipus>:<id>' -> boolean

      const agAlattE = async (entitasId, entitasTipus) => {
        const kulcs = `${entitasTipus}:${entitasId}`;
        if (agAlattCache.has(kulcs)) return agAlattCache.get(kulcs);

        // Az ős-lánc bejárása: maga az entitás, majd a szülők a gyökérig
        let benneVan = false;
        let aktId = entitasId;
        let aktTipus = entitasTipus;
        while (aktId && aktTipus) {
          if (aktId.toString() === agKulcs) { benneVan = true; break; }
          const szulo = await ErtesitesiBeallitasService.szuloKereses(aktId, aktTipus);
          if (!szulo) break;
          aktId = szulo.szuloId;
          aktTipus = szulo.szuloTipus;
        }

        agAlattCache.set(kulcs, benneVan);
        return benneVan;
      };

      const szurt = [];
      for (const h of hozzarendelesek) {
        if (await agAlattE(h.entitasId, h.entitasTipus)) szurt.push(h);
      }
      // Lapozás a szűrt listán
      hozzarendelesek = szurt.slice(skip, skip + limit);
    }

    // 4. LÉPÉS - ENTITÁS-CÍMEK FELTÖLTÉSE
    // Közös segéd az ertesitesService-ből: Tartalom → cim, Kategoria/TartalomTipus
    // → nev, Javaslat/Egyezmeny → null (`entitasCim` mező kerül minden elemre).
    const cimmelEllatva = await ErtesitesService.entitasCimekFeltoltese(hozzarendelesek);

    console.log("<<<<<<<<<<<<<<<<<<<< eemberAktivHozzarendeleseinekLekerese====darab: ", {
      darab: cimmelEllatva.length
    });

    return cimmelEllatva;
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
  // @returns {Promise<Object>} { siker, visszaosztottPontok, eemberekSzama }
  async tudatpontokVisszaosztasa(entitasId, entitasTipus) {

    console.log("=================================== tudatpontokVisszaosztasa: ", {
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    // 1. LÉPÉS - Entitás összes hozzárendelésének lekérése
    // ✅ JAVÍTVA: Nyers metódus használata (populate NÉLKÜL)
    // Így a eemberId tiszta ObjectId lesz, nem populated objektum

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
        eemberekSzama: 0,
        entitasTorolve: false
      });

      return {
        siker: true,
        visszaosztottPontok: 0,
        eemberekSzama: 0,
        entitasTorolve: false // Nem történt visszaosztás, az entitás nem törlődött
      };
    }

    // 3. LÉPÉS - Minden hozzájárulónak visszaadjuk a tudatpontjait
    // ✅ JAVÍTVA: A tudatpontHozzarendelese függvényt használjuk (ujPontok: 0)
    // Ez automatikusan:
    // - Visszaadja a eember egyenlegébe a pontokat (kulonbseg = 0 - regiPontok)
    // - Frissíti/törli a hozzárendelést (0 pontra állítja)
    // - Frissíti/törli az allokációt (osszesPont csökkentése, hozzajarulokSzama csökkentése)
    let visszaosztottPontok = 0;
    let eemberekSzama = 0;

    for (const hozzarendeles of hozzarendelesek) {
      // Tudatpont hozzárendelés 0 pontra állítása
      // ✅ Most már a eemberId tiszta ObjectId (nem populated objektum)

      console.log("tudatpontokVisszaosztasa >>>>>>>>>>>>>>>>>>>> this.tudatpontHozzarendelese",);
      await this.tudatpontHozzarendelese(
        hozzarendeles.eemberId.toString(),  // ✅ Tiszta ObjectId toString()-je
        entitasId,
        entitasTipus,
        0 // ✅ 0 pont = visszavonás (pontok visszaadása a eembernak)
      );

      // Statisztika frissítése
      visszaosztottPontok += hozzarendeles.tudatPontok;
      eemberekSzama++;
    }

    // 4. LÉPÉS - ENTITÁS TÖRLÉS TÉNYÉNEK MEGÁLLAPÍTÁSA
    // A tudatpontHozzarendelese (entitasTorleseEllenorzese) automatikusan
    // törli az entitást, ha 0 tudatpont maradt rajta. Itt ellenőrizzük,
    // hogy ez megtörtént-e — a hívók (pl. torlesiVegrehajto) az
    // entitasTorolve mezőből tudják meg, és erre épül az egyezmény
    // tárhely-átirányítása is törölt tárhely esetén.
    let entitasTorolve = false;
    try {
      let entitas = null;
      if (entitasTipus === 'Tartalom') {
        entitas = await TartalomRepository.findById(entitasId);
      } else if (entitasTipus === 'Kategoria') {
        entitas = await KategoriaRepository.findById(entitasId);
      } else if (entitasTipus === 'TartalomTipus') {
        entitas = await TartalomTipusRepository.findById(entitasId);
      } else if (entitasTipus === 'Javaslat') {
        entitas = await JavaslatRepository.findById(entitasId);
      } else if (entitasTipus === 'Egyezmeny') {
        entitas = await EgyezmenyRepository.findById(entitasId);
      }
      entitasTorolve = !entitas; // Ha már nem található, törölve lett
    } catch (hiba) {
      // A lekérés hibája tipikusan a nem létező entitást jelzi
      console.log("tudatpontokVisszaosztasa - entitás lekérés hiba (töröltnek tekintjük)", {
        entitasId,
        hiba: hiba.message
      });
      entitasTorolve = true;
    }

    // 4.b LÉPÉS - ÁRVA ÉRTESÍTÉSEK TAKARÍTÁSA (2026-07-18)
    // Ha az entitás törlődött, a KÖZVETLENÜL rá vonatkozó értesítések árvák
    // lettek (kattintva sehova sem navigálnának) — töröljük őket. BEST-EFFORT:
    // a takarítás hibája nem akaszthatja meg a visszaosztási folyamatot.
    if (entitasTorolve) {
      try {
        await ErtesitesRepository.torolEntitasOsszes(entitasId, entitasTipus);
      } catch (takaritasHiba) {
        console.error("tudatpontokVisszaosztasa - árva értesítés takarítás HIBA (nem blokkoló)", {
          entitasId,
          hiba: takaritasHiba.message
        });
      }
    }

    // 5. LÉPÉS - Eredmény visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<<<<< tudatpontokVisszaosztasa===Eredmény: ", {
      siker: true,
      visszaosztottPontok: visszaosztottPontok,
      eemberekSzama: eemberekSzama,
      entitasTorolve: entitasTorolve
    });

    return {
      siker: true,
      visszaosztottPontok: visszaosztottPontok,
      eemberekSzama: eemberekSzama,
      entitasTorolve: entitasTorolve
    };
  }

  // ============================================================
  // JAVASLAT RENDSZERHEZ SZÜKSÉGES MŰVELETEK
  // ============================================================

  // ----- ENTITÁS TUDATPONT TULAJDONOSAINAK LEKÉRÉSE -----
  // Egy entitás tudatpont tulajdonosainak eember ID-i
  // Használat: SZTTSZ és JTTTSZ számításhoz (javaslat rendszer)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Array>} eEmber ID-k tömbje
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

    // 2. LÉPÉS - eEmber ID-k kinyerése
    const eemberIds = hozzarendelesek.map(h => h.eemberId.toString());

    // 3. LÉPÉS - eEmber ID-k visszaadása

    console.log("<<<<<<<<<<<<<<<<<<<< entitasTudatpontTulajdonosainakLekerese===eemberIds: ", {
      eemberIds: eemberIds
    });
    
    return eemberIds;
  }

  // ----- TÖBB ENTITÁS EGYESÍTETT TUDATPONT TULAJDONOSAINAK LEKÉRÉSE -----
  // Több entitás tudatpont tulajdonosainak egyesített halmaza (egyedi eemberek)
  // Használat: entitasokTudatpontTulajdonosokSzama (SZTTSZ) számításhoz
  // @param {Array} entitasok - Entitások tömbje [{entitasId, entitasTipus}, ...]
  // @returns {Promise<Array>} Egyedi eember ID-k tömbje
  async tobbEntitasEgyesitettHozzajaruloinakLekerese(entitasok) {

    console.log("=================================== tobbEntitasEgyesitettTudatpontTulajdonosainakLekerese:: ", {
      entitasok: entitasok
    });
    
    // 1. LÉPÉS - Egyedi eemberek halmazának létrehozása
    // Set adatstruktúra → automatikusan egyedi elemek (duplikációk kiszűrése)
    const egyediEemberIds = new Set();

    // 2. LÉPÉS - Minden entitás tudatpont tulajdonosainak lekérése
    for (const entitas of entitasok) {

      console.log("tobbEntitasEgyesitettTudatpontTulajdonosainakLekerese >>>>>>>>>>>>>>>> this.entitasTudatpontTulajdonosainakLekerese");
      
      const tulajdonosok = await this.entitasTudatpontTulajdonosainakLekerese(
        entitas.entitasId,
        entitas.entitasTipus
      );

      // Hozzáadás a halmazhoz (duplikációk automatikusan kiszűrődnek)
      tulajdonosok.forEach(eemberId => egyediEemberIds.add(eemberId));
    }

    console.log("<<<<<<<<<<<<<<<<<<<<< tobbEntitasEgyesitettHozzajaruloinakLekerese=====egyediEemberIds: ", {
      egyediEemberIds: egyediEemberIds
    });
    

    // 3. LÉPÉS - Set → Array konverzió és visszaadás
    return Array.from(egyediEemberIds);
  }

  // ----- EMBER HOZZÁJÁRULÁSA ENTITÁSON (JOGOSULTSÁG ELLENŐRZÉS) -----
  // Ellenőrzi, hogy egy eember rendelkezik-e tudatponttal egy entitáson
  // Használat: szavazási jogosultság ellenőrzéshez (javaslat rendszer)
  // @param {string} eemberId - A eember azonosítója
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object>} {vanHozzajarulas: boolean, pontok: number}
  async eemberHozzajarulasaEntitason(eemberId, entitasId, entitasTipus) {

    console.log("=================================== eemberHozzajarulasaEntitason:: ", {
      eemberId: eemberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    // 1. LÉPÉS - Hozzárendelés lekérése

    console.log("eemberHozzajarulasaEntitason >>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesByeEmberEsEntitas", {
      eemberId: eemberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    const hozzarendeles = await TudatpontRepository.findHozzarendelesByeEmberEsEntitas(
      eemberId,
      entitasId,
      entitasTipus
    );

    // 2. LÉPÉS - Eredmény visszaadása
    if (hozzarendeles && hozzarendeles.tudatPontok > 0) {
      // Van hozzájárulás ÉS aktív (nem 0 pont)

      console.log('<<<<<<<<<<<<<<< eemberHozzajarulasaEntitason ==== Eredmény: ', {
        vanHozzajarulas: true,
        pontok: hozzarendeles.tudatPontok
      });
      
      return {
        vanHozzajarulas: true,
        pontok: hozzarendeles.tudatPontok
      };
    } else {
      // Nincs hozzájárulás VAGY 0 pont

      console.log('<<<<<<<<<<<<<<< eemberHozzajarulasaEntitason ==== Eredmény: ', {
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
