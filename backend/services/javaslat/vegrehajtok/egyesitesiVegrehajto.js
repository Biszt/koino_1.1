// backend/services/javaslatVegrehajtok/egyesitesiVegrehajto.js

// ===== IMPORTOK =====

// Repository-k importálása
const TartalomRepository = require('../../../repositories/tartalomRepository');
const TudatpontRepository = require('../../../repositories/tudatpontRepository');

// Service-k importálása
const TudatpontService = require('../../tudatpontService');
const TartalomService = require('../../tartalomService');
const KategoriaService = require('../../kategoriaService');
const TartalomTipusService = require('../../tartalomTipusService');

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

    // ----- 7. LÉPÉS - GYEREKEK ÁTÁLLÍTÁSA (CSAK TARTALOM ENTITÁSOKNÁL!) -----
    // ✅ JAVÍTVA: Csak akkor állítjuk át a gyerekeket, ha TARTALOM-okat egyesítünk
    // TartalomTipus-nak vagy Kategória-nak NEM lehetnek gyerek Tartalom entitásai!
    console.log('=== GYEREKEK ÁTÁLLÍTÁSA ===');
    
    let atallitottGyerekek = 0;

    if (egyesitesAdatok.ujEntitasTipus === 'Tartalom') {
      for (const entitas of javaslat.erintettEntitasok) {
        // Csak Tartalom típusú entitásoknak lehetnek gyerekei
        if (entitas.entitasTipus === 'Tartalom') {
          // Gyerekek lekérése (szuloId === entitas.entitasId)
          const gyerekek = await TartalomRepository.findByParentId(entitas.entitasId);

          // Minden gyerek szülőjének átállítása az új entitásra
          for (const gyerek of gyerekek) {
            await TartalomRepository.updateById(gyerek._id, { szuloId: ujEntitas._id });
            atallitottGyerekek++;
          }
        }
      }

      if (atallitottGyerekek > 0) {
        console.log(`${atallitottGyerekek} gyerek tartalom átállítva az új szülőre`);
      } else {
        console.log('Nincs átállítandó gyerek tartalom');
      }
    } else {
      console.log('Nem Tartalom típus - gyerek átállítás kihagyva');
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
}

// ===== EXPORTÁLÁS =====
// Osztály singleton példány exportálása
module.exports = new EgyesitesiVegrehajto();
