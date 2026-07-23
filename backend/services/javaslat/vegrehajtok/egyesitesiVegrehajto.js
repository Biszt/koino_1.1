// backend/services/javaslatVegrehajtok/egyesitesiVegrehajto.js

// ===== IMPORTOK =====

// Repository-k importálása
const TartalomRepository = require('../../../repositories/tartalomRepository');
// Kategória repository — kategória-egyesítésnél az új entitás szülője kategória
const KategoriaRepository = require('../../../repositories/kategoriaRepository');
const TartalomTipusRepository = require('../../../repositories/tartalomTipusRepository');
const EgyezmenyRepository = require('../../../repositories/egyezmenyRepository');
const TudatpontRepository = require('../../../repositories/tudatpontRepository');
// Hierarchikus (pakli-fa) allokáció repo — a gyerekek fa-szülőjének átkötéséhez
const HierarchikusTudatpontAllokaciRepository = require('../../../repositories/hierarchikusTudatpontAllokaciRepository');

// Service-k importálása
const TudatpontService = require('../../tudatpontService');
const TartalomService = require('../../tartalomService');
const KategoriaService = require('../../kategoriaService');
const TartalomTipusService = require('../../tartalomTipusService');
// Hierarchikus pont-újraszámítás + osLanc karbantartás a gyerek-átkötés után
const HierarchikusFrissitesService = require('../../hierarchikusFrissitesService');
const OsLancKarbantartoService = require('../../osLancKarbantartoService');

// ===== EGYESÍTÉSI VÉGREHAJTÓ OSZTÁLY =====
// Ez az osztály felelős az egyesítési javaslatok végrehajtásáért
// Felelősség:
// - eEmberek tudatpontjainak összesítése (forrás entitásokról)
// - Forrás entitások kiürítése (pontok visszaosztása)
// - Új entitás létrehozása (Service használatával - kezdő tudatpont kezelés)
// - Többi eember tudatpontjainak hozzárendelése (új entitásra)
// - Gyerekek átállítása (CSAK Tartalom entitásoknál!)
class EgyesitesiVegrehajto {

  // ===== VÉGREHAJTÁS =====
  // Egyesítési javaslat végrehajtása
  // ✅ HELYES SORREND:
  // 1. Összesítés (ki mennyi pontot AD az új entitásra) - CSAK LEKÉRDEZÉS!
  // 2. Forrás entitások kiürítése (eemberek visszakapják a pontjaikat)
  // 3. Új entitás létrehozása (létrehozó pontjaival)
  // 4. Többi eember pontjainak hozzárendelése (most már van nekik pont!)
  // 5. Gyerekek átállítása (ha Tartalom)
  // @param {Object} javaslat - A javaslat objektum
  // @returns {Promise<Object>} Végrehajtás eredménye
  async vegrehajtas(javaslat) {
    console.log('=================================== vegrehajtas: ', javaslat);

    // ----- 1. LÉPÉS - VALIDÁLÁS -----
    if (!javaslat || !javaslat.egyesitesAdatok) {
      throw new Error('Egyesítési adatok hiányoznak');
    }

    const egyesitesAdatok = javaslat.egyesitesAdatok;

    if (!egyesitesAdatok.ujEntitasAdatok) {
      throw new Error('Az új entitás adatai hiányoznak');
    }

    // ----- 1.A LÉPÉS - ÚJ ENTITÁS SZÜLŐJÉNEK ÚJRA-ELLENŐRZÉSE -----
    // A javaslat beküldésekor ez már ellenőrzésre került, de a szavazási
    // idő alatt a hierarchia megváltozhatott. Itt, MIELŐTT bármi
    // visszafordíthatatlan (forrás törlés) történne, újra ellenőrizzük:
    // az új entitás szülője létezik, nem érintett entitás, és nem is
    // annak leszármazottja. Hiba esetén a végrehajtás tisztán meghiúsul.
    if (egyesitesAdatok.ujEntitasAdatok.szuloId) {
      const ujSzuloId = egyesitesAdatok.ujEntitasAdatok.szuloId;

      const erintettIdk = new Set(
        javaslat.erintettEntitasok.map(e => e.entitasId.toString())
      );

      if (erintettIdk.has(ujSzuloId.toString())) {
        throw new Error('Az új entitás szülője nem lehet egyesítésben érintett entitás, mert az a végrehajtáskor törlődik');
      }

      // A szülő kollekciója az eredmény-típushoz igazodik (kategória-egyesítésnél kategória)
      const szuloRepo = egyesitesAdatok.ujEntitasTipus === 'Kategoria'
        ? KategoriaRepository
        : TartalomRepository;

      const ujSzulo = await szuloRepo.findById(ujSzuloId);
      if (!ujSzulo) {
        throw new Error('Az új entitás szülője nem található (időközben törölhették)');
      }

      // Felmenő-lánc bejárása: érintett entitás nem szerepelhet benne
      let vizsgaltSzuloId = ujSzulo.szuloId ? ujSzulo.szuloId.toString() : null;
      let lepesVedelem = 0; // Végtelen ciklus elleni védelem
      while (vizsgaltSzuloId && lepesVedelem < 100) {
        lepesVedelem++;
        if (erintettIdk.has(vizsgaltSzuloId)) {
          throw new Error('Az új entitás szülője nem lehet egyesítésben érintett entitás leszármazottja');
        }
        const vizsgalt = await szuloRepo.findById(vizsgaltSzuloId);
        vizsgaltSzuloId = vizsgalt?.szuloId ? vizsgalt.szuloId.toString() : null;
      }

      console.log('vegrehajtas - Új entitás szülő validálva (végrehajtáskori újra-ellenőrzés)', {
        ujSzuloId
      });
    }

    // ----- 2. LÉPÉS - EMBEREK TUDATPONTJAINAK ÖSSZESÍTÉSE -----
    // ✅ ELŐSZÖR összesítjük, ki mennyi pontot fog kapni az új entitáson
 
    console.log(' TUDATPONTOK ÖSSZESÍTÉSE ');
    
    // Map struktúra: (eemberId -> összesített pontok)
    const osszesitettHozzajarulasok = new Map();

    // Minden forrás entitásról gyűjtjük a hozzárendeléseket
    for (const entitas of javaslat.erintettEntitasok) {
      // Hozzárendelések lekérése az entitásról
      // Ez az összes eembert visszaadja, aki tudatpontot adott erre az entitásra
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesekByEntitasNyers: ", {
        entutaId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus
      });
      
      const hozzarendelesek = await TudatpontRepository.findHozzarendelesekByEntitasNyers(
        entitas.entitasId,
        entitas.entitasTipus,
        999999,  // Nagy limit - összes hozzájáruló
        0        // Skip 0 - elejétől
      );

      // Minden hozzárendelést összegzünk eembernként
      for (const hozzarendeles of hozzarendelesek) {
        // ✅ Most már tiszta ObjectId (nem populated objektum)
        const eemberIdStr = hozzarendeles.eemberId.toString();
        const jelenlegi = osszesitettHozzajarulasok.get(eemberIdStr) || 0;
        osszesitettHozzajarulasok.set(eemberIdStr, jelenlegi + hozzarendeles.tudatPontok);
        // ✅ Csak ÖSSZEADJUK, még nem módosítunk semmit!
      }
    }

    console.log(`Összesített tudatpontok ${osszesitettHozzajarulasok.size} eembertól`);

    // ----- 3. LÉPÉS - LÉTREHOZÓ TUDATPONTJAINAK MEGHATÁROZÁSA -----
    const letrehozoId = javaslat.letrehozo._id.toString();
    const letrehozoPontjai = osszesitettHozzajarulasok.get(letrehozoId) || 0;

    // Létrehozót eltávolítjuk a Map-ből (később külön kezeljük)
    osszesitettHozzajarulasok.delete(letrehozoId);

    console.log(`Létrehozó (${letrehozoId}) pontjai: ${letrehozoPontjai}`);
    console.log(`Többi eember: ${osszesitettHozzajarulasok.size} fő`);

    // ----- 3.5 LÉPÉS - A FORRÁSOK GYEREKEINEK ÖSSZEGYŰJTÉSE (A TÖRLÉS ELŐTT!) -----
    // FONTOS SORREND: a 4. lépés a forrásokat 0 pontra állítja → auto-törlés, ami a
    // gyerekeket a NAGYSZÜLŐHÖZ kötné át. Ezért MÉG a törlés előtt összegyűjtjük a
    // forrás-entitások közvetlen gyerekeit, hogy a 7. lépésben az ÚJ egyesített entitás
    // alá köthessük őket (Csaba döntése, 2026-07-22). A hierarchikus (pakli-fa)
    // kollekcióból kérdezünk, így BÁRMELY gyerek-típus (Tartalom/Kategória/…) bekerül.
    // A magukat is egyesítendő entitásokat kihagyjuk (azok törlődnek).
    const forrasIdHalmaz = new Set(javaslat.erintettEntitasok.map(e => e.entitasId.toString()));
    const atkotendoGyerekek = [];
    for (const entitas of javaslat.erintettEntitasok) {
      const gyerekek = await HierarchikusTudatpontAllokaciRepository.findBySzuloId(entitas.entitasId);
      for (const gy of gyerekek) {
        if (forrasIdHalmaz.has(gy.entitasId.toString())) continue; // maga is forrás → kihagyjuk
        atkotendoGyerekek.push({ entitasId: gy.entitasId, entitasTipus: gy.entitasTipus });
      }
    }
    console.log(`3.5 - ${atkotendoGyerekek.length} átkötendő gyerek összegyűjtve (a törlés előtt)`);

    // ----- 4. LÉPÉS - FORRÁS ENTITÁSOK KIÜRÍTÉSE (PONTOK VISSZAOSZTÁSA) -----
    // ✅ Most már tudjuk az összesítést, kiüríthetjük a forrásokat
    // A eemberek visszakapják a pontjaikat → aztán hozzá tudják rendelni az új entitásra
    console.log('=== FORRÁS ENTITÁSOK KIÜRÍTÉSE ===');
    
    const visszaosztasiEredmenyek = [];

    for (const entitas of javaslat.erintettEntitasok) {
      // Tudatpontok visszaosztása eembereknak (0 pontra állítás)
      // Ez a tudatpontHozzarendelese(..., 0) függvényt használja minden eembernál
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontokVisszaosztasa:");
      
      const visszaosztasEredmeny = await TudatpontService.tudatpontokVisszaosztasa(
        entitas.entitasId,
        entitas.entitasTipus
      );

      visszaosztasiEredmenyek.push({
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus,
        visszaosztottPontok: visszaosztasEredmeny.visszaosztottPontok,
        eemberekSzama: visszaosztasEredmeny.eemberekSzama
      });

      console.log(`Visszaosztva: ${visszaosztasEredmeny.visszaosztottPontok} pont ${visszaosztasEredmeny.eemberekSzama} eembertól (${entitas.entitasTipus})`);
    }

    // ----- 5. LÉPÉS - ÚJ ENTITÁS LÉTREHOZÁSA SERVICE-SZEL -----
    // Service automatikusan kezeli a kezdő tudatpontot!
    // A létrehozó pontjait a 2. lépésben összesítettük
    console.log('=== ÚJ ENTITÁS LÉTREHOZÁSA ===');

    const ujEntitasAdatok = {
      ...egyesitesAdatok.ujEntitasAdatok,
      kezdoTudatpont: letrehozoPontjai  // Létrehozó pontjai (összesítve a forrás entitásokról)
    };

    let ujEntitas = null;

    if (egyesitesAdatok.ujEntitasTipus === 'Tartalom') {
      // Tartalom létrehozása Service-szel
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>>>>> TartalomService.tartalomLetrehozasa");
      
      ujEntitas = await TartalomService.tartalomLetrehozasa(
        ujEntitasAdatok,
        letrehozoId,
        letrehozoPontjai
      );
    } else if (egyesitesAdatok.ujEntitasTipus === 'Kategoria') {
      // Kategória létrehozása Service-szel
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>>>>> KategoriaService.kategoriaLetrehozasa");

      ujEntitas = await KategoriaService.kategoriaLetrehozasa(
        ujEntitasAdatok,
        letrehozoId,
        letrehozoPontjai
      );
    } else if (egyesitesAdatok.ujEntitasTipus === 'TartalomTipus') {
      // Tartalom típus létrehozása Service-szel
      console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>>>>> TartalomTipusService.tartalomTipusLetrehozasa");

      ujEntitas = await TartalomTipusService.tartalomTipusLetrehozasa(
        ujEntitasAdatok,
        letrehozoId,
        letrehozoPontjai
      );
    } else {
      throw new Error(`Ismeretlen entitás típus: ${egyesitesAdatok.ujEntitasTipus}`);
    }

    if (!ujEntitas) {
      throw new Error('Új entitás létrehozása sikertelen');
    }

    console.log(`Új entitás létrehozva: ${ujEntitas._id} (${egyesitesAdatok.ujEntitasTipus})`);
    console.log(`Létrehozó ${letrehozoPontjai} pontja automatikusan hozzárendelve`);

    // 🆕 ÚJ BLOKK - Javaslat egyezmenyTarhelyId frissítése, ha placeholder volt
    if (javaslat.egyezmenyTarhelyId) {
      const egyezmenyTarhelyIdStr = javaslat.egyezmenyTarhelyId.toString();
      
      // Ellenőrizzük, hogy placeholder-e az egyezmenyTarhelyId
      if (egyezmenyTarhelyIdStr === 'eeeeeeeeeeeeeeeeeeee0001') {
        console.log('vegrehajtas >>> Placeholder egyezmenyTarhelyId észlelve, frissítés az új entitás ID-jára');
        console.log('vegrehajtas >>> JavaslatRepository.updateById', {
          javaslatId: javaslat.id,
          egyezmenyTarhelyId: ujEntitas._id
        });
        
        // Frissítjük a javaslat egyezmenyTarhelyId mezőjét az új entitás ID-jára
        const JavaslatRepository = require('../../../repositories/javaslatRepository');
        await JavaslatRepository.updateById(javaslat.id, {
          egyezmenyTarhelyId: ujEntitas._id
        });
        
        // Frissítjük a memóriában lévő objektumot is, hogy a későbbi lépések az új ID-t használják
        javaslat.egyezmenyTarhelyId = ujEntitas._id;
        
        console.log(`✅ Javaslat egyezmenyTarhelyId frissítve: ${ujEntitas._id}`);
      } else {
        console.log('vegrehajtas >>> egyezmenyTarhelyId nem placeholder, nincs frissítés:', egyezmenyTarhelyIdStr);
      }
    }


    // ----- 6. LÉPÉS - TÖBBI EMBER TUDATPONTJAINAK HOZZÁRENDELÉSE -----
    // Most már van nekik pont (visszakapták a forrás entitásokról a 4. lépésben)!
    // Az összesített pontokat a 2. lépésben kiszámítottuk
    console.log(' TÖBBI EMBER PONTJAINAK HOZZÁRENDELÉSE ');
    
    let hozzarendeltOsszesPont = letrehozoPontjai;  // Létrehozó pontjai már hozzá vannak rendelve
    let sikereseEmberekSzama = 1;  // Létrehozó már sikeres
    const hozzarendelesiHibak = [];

    for (const [eemberIdStr, pontok] of osszesitettHozzajarulasok) {
      try {
        // Tudatpont hozzárendelése a többi eembertól az új entitásra
        // Annyi pontot rendelünk hozzá, amennyit a forrás entitásokon összesen volt (2. lépés)
        console.log("vegrehajtas >>>>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese");

        await TudatpontService.tudatpontHozzarendelese(
          eemberIdStr,                    // Ki adja a tudatpontot
          ujEntitas._id,                       // Melyik entitásra (új egyesített entitás)
          egyesitesAdatok.ujEntitasTipus,      // Entitás típusa
          pontok                               // Mennyi tudatpontot (összesített érték)
        );

        hozzarendeltOsszesPont += pontok;
        sikereseEmberekSzama++;

        console.log(`${pontok} pont hozzárendelve eembertól: ${eemberIdStr}`);

      } catch (error) {
        // Ha egy eembernál hiba van
        // (pl. közben elköltötte a pontjait - bár nem kellene megtörténnie)
        // Folytatjuk a többiekkel, de logoljuk
        console.error(`Hiba a tudatpont hozzárendelésnél (${eemberIdStr}):`, error.message);
        hozzarendelesiHibak.push({
          eemberId: eemberIdStr,
          pontok: pontok,
          hiba: error.message
        });
      }
    }

    console.log(`Tudatpontok hozzárendelve: ${hozzarendeltOsszesPont} pont ${sikereseEmberekSzama} eembertól`);

    if (hozzarendelesiHibak.length > 0) {
      console.warn(`${hozzarendelesiHibak.length} eembernál nem sikerült a hozzárendelés`);
    }

    // ----- 7. LÉPÉS - GYEREKEK ÁTÁLLÍTÁSA AZ ÚJ EGYESÍTETT ENTITÁS ALÁ -----
    // A 3.5-ben (a törlés ELŐTT) összegyűjtött gyerekeket most az ÚJ entitás alá kötjük.
    // (A 4. lépés törlésekor átmenetileg a nagyszülőhöz kerültek — itt felülírjuk.)
    // Minden gyerekhez: (1) az entitás-doc szülője, (2) a hierarchikus pakli-fa szülője,
    // (3) az osLanc-részfa újraépítése. Végül a hierarchikus pontokat az új entitástól
    // a gyökérig újraszámoljuk, hogy a gyerekek súlya bekerüljön.
    console.log('=== GYEREKEK ÁTÁLLÍTÁSA AZ ÚJ ENTITÁS ALÁ ===');

    let atallitottGyerekek = 0;
    const ujTipus = egyesitesAdatok.ujEntitasTipus;
    const gyerekRepoTipusSzerint = {
      Tartalom:      TartalomRepository,
      Kategoria:     KategoriaRepository,
      TartalomTipus: TartalomTipusRepository,
      Egyezmeny:     EgyezmenyRepository
    };

    for (const gy of atkotendoGyerekek) {
      const repo = gyerekRepoTipusSzerint[gy.entitasTipus];
      if (!repo) {
        console.warn('7. - ismeretlen gyerek-típus, kihagyva', { gyerek: gy });
        continue;
      }
      try {
        // (1) az entitás saját dokumentumának szülője
        await repo.updateById(gy.entitasId, { szuloId: ujEntitas._id, szuloTipus: ujTipus });
        // (2) a hierarchikus (pakli-fa) szülője
        await HierarchikusTudatpontAllokaciRepository.updateSzuloId(gy.entitasId, gy.entitasTipus, ujEntitas._id, ujTipus);
        // (3) osLanc-részfa újraépítése (best-effort, nem blokkoló)
        try {
          await OsLancKarbantartoService.reszfaOsLancUjraepitese(gy.entitasId, gy.entitasTipus);
        } catch (osLancHiba) {
          console.error('7. - osLanc hiba (nem blokkoló)', { entitasId: gy.entitasId, hiba: osLancHiba.message });
        }
        atallitottGyerekek++;
      } catch (gyerekHiba) {
        // Pl. típus-inkompatibilis szülő (enum) — nem állítjuk át, de a merge nem hiúsul meg
        console.error('7. - gyerek átállítás kihagyva (hiba)', { gyerek: gy, hiba: gyerekHiba.message });
      }
    }

    // Hierarchikus pontok újraszámítása az új entitástól a gyökérig (a gyerekek súlya bekerül)
    if (atallitottGyerekek > 0) {
      await this._hierarchiaPontokFelfele(ujEntitas._id, ujTipus);
      console.log(`${atallitottGyerekek} gyerek átállítva az új ${ujTipus} alá (+ hierarchikus pont-újraszámítás)`);
    } else {
      console.log('Nincs átállítandó gyerek');
    }

    // ----- 8. LÉPÉS - EREDMÉNY VISSZAADÁSA -----
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< vegrehajtas: ', {
      tipus: 'Egyesites',
      ujEntitas: {
        id: ujEntitas._id,
        tipus: egyesitesAdatok.ujEntitasTipus
      },
      osszesitettTudatpontok: hozzarendeltOsszesPont,
      sikereseEmberekSzama: sikereseEmberekSzama,
      hozzarendelesiHibakSzama: hozzarendelesiHibak.length,
      atallitottGyerekek: atallitottGyerekek
    });

    return {
      tipus: 'Egyesites',
      ujEntitas: {
        id: ujEntitas._id,
        tipus: egyesitesAdatok.ujEntitasTipus
      },
      osszesitettTudatpontok: hozzarendeltOsszesPont,
      eemberekSzama: sikereseEmberekSzama,
      hozzarendelesiHibak: hozzarendelesiHibak,
      atallitottGyerekek: atallitottGyerekek,
      visszaosztasiEredmenyek: visszaosztasiEredmenyek
    };
  }

  // ===================================
  // PRIVÁT - HIERARCHIKUS PONTOK ÚJRASZÁMÍTÁSA FELFELÉ
  // ===================================
  // Az adott entitástól a gyökérig újraszámítja a hierarchikus összesített pontokat,
  // hogy az újonnan alá kötött gyerekek súlya bekerüljön a szülő-láncba.
  // (Az athelyezesiVegrehajto _hierarchiaLancUjraszamitasa mintájára.)
  // @param {string} entitasId - kiinduló entitás
  // @param {string} entitasTipus - kiinduló entitás típusa
  async _hierarchiaPontokFelfele(entitasId, entitasTipus) {
    console.log('_hierarchiaPontokFelfele - KEZDÉS', { entitasId, entitasTipus });

    let aktId = entitasId;
    let aktTipus = entitasTipus;
    let lepesVedelem = 0;

    while (aktId && lepesVedelem < 100) {
      lepesVedelem++;
      try {
        await HierarchikusFrissitesService.frissitEgyHierarchikusAllokacio(aktId, aktTipus);
      } catch (hiba) {
        console.warn('_hierarchiaPontokFelfele - újraszámítási hiba, lánc megszakítva', { aktId, hiba: hiba.message });
        break;
      }
      const allokacio = await HierarchikusTudatpontAllokaciRepository.findByEntitas(aktId, aktTipus);
      if (!allokacio || !allokacio.szuloId) break; // gyökér
      aktId = allokacio.szuloId;
      aktTipus = allokacio.szuloTipus || 'Tartalom';
    }

    console.log('_hierarchiaPontokFelfele - VÉGE', { lepesek: lepesVedelem });
  }
}

// ===== EXPORTÁLÁS =====
// Osztály singleton példány exportálása
module.exports = new EgyesitesiVegrehajto();
