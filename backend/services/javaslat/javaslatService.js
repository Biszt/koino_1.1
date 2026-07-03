// backend/services/javaslat/javaslatService.js

// ===================================
// IMPORTOK
// ===================================

// Repository importálása - adatbázis műveletek
const JavaslatRepository = require('../../repositories/javaslatRepository');
const SzavazatRepository = require('../../repositories/szavazatRepository');
const TartalomRepository = require('../../repositories/tartalomRepository'); 
const KategoriaRepository = require('../../repositories/kategoriaRepository'); 
const TartalomTipusRepository = require('../../repositories/tartalomTipusRepository');
const TudatpontRepository = require('../../repositories/tudatpontRepository');

// Segéd szolgáltatások importálása
const JavaslatSzamitasService = require('./javaslatSzamitasService');
const JavaslatIdozitesService = require('./javaslatIdozitesService');
const JavaslatJogosultsagService = require('./javaslatJogosultsagService');
const SzavazatService = require('../szavazatService');

// Tudatpont szolgáltatás importálása
const TudatpontService = require('../tudatpontService');


// ===================================
// JAVASLAT SERVICE OSZTÁLY
// ===================================
// Ez a fő koordinátor osztály a javaslatok kezeléséhez
// Felelősség: CRUD műveletek + orchestration (más service-ek hívása)
class JavaslatService {

 // Tudatpont felosztása töredék javaslatok között
  // Minden töredék legalább 1 pontot kap, a maradékot az elejétől kezdve szétosztjuk
  elosztottTudatpontokKiszamitasa(toredekDarab, osszesKezdoTudatpont) {
    // Log metódus eleje magyar kommenttel
    console.log('elosztottTudatpontokKiszamitasa - KEZDÉS', {
      toredekDarab,
      osszesKezdoTudatpont
    }); // Ide loggoljuk a bemenő értékeket

    // Ellenőrzés: legalább annyi tudatpont kell, ahány töredék van
    if (osszesKezdoTudatpont < toredekDarab) {
      // Ha kevesebb a pont, mint a töredékek száma, az üzleti szabály sérül
      throw new Error('A kezdő tudatpont értéknek legalább a töredékek számával egyenlőnek kell lennie');
    } // Hiba dobása, hogy legyen egyértelmű, mi a gond

    // Alapértelmezett kiosztás: minden töredék kap 1 pontot
    const elosztas = new Array(toredekDarab).fill(1); // Létrehozunk egy tömböt, amiben minden elem 1

    // Maradék pontok kiszámítása
    let maradek = osszesKezdoTudatpont - toredekDarab; // Ennyit kell még szétosztani

    // A maradék pontokat körkörösen elosztjuk az első töredékektől kezdve
    let index = 0; // Kezdő index a tömbben
    while (maradek > 0) {
      elosztas[index] += 1; // Az aktuális töredékhez adunk +1 pontot
      maradek -= 1; // Csökkentjük a maradék pontokat
      index = (index + 1) % toredekDarab; // A következő indexre lépünk, körkörösen
    } // Addig fut, amíg a maradék pontok el nem fogynak

    // Log metódus vége az eredménnyel
    console.log('elosztottTudatpontokKiszamitasa - VÉGE', {
      elosztas
    }); // Ide loggoljuk a kiszámolt felosztást

    // Visszaadjuk a töredékenkénti pont kiosztást
    return elosztas; // A hívó kód tömbként kapja meg az értékeket
  } 


   // ----- JAVASLAT LÉTREHOZÁSA -----
  // Töredék javaslatok létrehozása egy logikai javaslatból
  // Minden érintett tartalomhoz külön töredék javaslat jön létre
  async javaslatLetrehozas(javaslatAdatok, eEmberId, kezdoTudatpont) { // Aszinkron metódus a javaslatok létrehozására

    // Log metódus kezdete
    console.log('javaslatLetrehozas - KEZDÉS', { // Kiírjuk a metódus indulását
      javaslatAdatok, // Logoljuk a bemenő javaslat adatokat
      eEmberId,        // Logoljuk az eEmber azonosítót
      kezdoTudatpont  // Logoljuk a kezdő tudatpont értéket
    }); // Log üzenet vége

    // 1. LÉPÉS - KÖTELEZŐ ALAPPARAMÉTEREK VALIDÁLÁSA
    // 1.1 - Javaslat típus ellenőrzése
    if (!javaslatAdatok.javaslatTipus || !javaslatAdatok.javaslatTipus.trim) { // Ha nincs javaslatTipus vagy nincs trim függvény
      // Ha nincs javaslat típus, hiba
      throw new Error('A javaslat típusa kötelezõ'); // Hiba dobása egyértelmű üzenettel
    } // Típus megléte rendben

    // 1.2 - Indoklás ellenőrzése
    // Az indoklás a SzovegSzerkeszto komponensből érkező JSON blokk-tömb, nem sima string
    if (!Array.isArray(javaslatAdatok.indoklas) || javaslatAdatok.indoklas.length === 0) { // Ha nincs tömb vagy üres
      // Ha nincs indoklás megadva, hiba
      throw new Error('Az indoklás megadása kötelező'); // Hiba dobása
    } // Indoklás megléte rendben

    // 1.3 - Érintett entitások ellenőrzése
    if (!javaslatAdatok.erintettEntitasok || javaslatAdatok.erintettEntitasok.length === 0) { // Ha nincs tömb vagy a hossza 0
      // Ha nincs egyetlen érintett entitás sem, hiba
      throw new Error('Legalább egy érintett entitás megadása kötelező'); // Hiba dobása
    } // Van legalább 1 érintett entitás

    // 1.4 - E_Ember ID ellenőrzése
    if (!eEmberId) { // Ha nincs eEmberId megadva
      // Ha nincs eEmber azonosító, hiba
      throw new Error('A létrehozó eEmber azonosítója szükséges'); // Hiba dobása
    } // eeEmber ID rendben

    // 1.5 - Kezdő tudatpont ellenőrzése
    if (!kezdoTudatpont || kezdoTudatpont < 1) { // Ha nincs vagy kisebb, mint 1
      // Ha nincs vagy kisebb mint 1, hiba
      throw new Error('Az inicializációs tudatpont legalább 1 kell legyen'); // Hiba dobása
    } // Kezdő tudatpont alap szinten rendben

    if (typeof kezdoTudatpont !== 'number' || isNaN(kezdoTudatpont)) { // Ha nem szám típusú vagy NaN
      // Ha nem szám típus, hiba
      throw new Error('A kezdő tudatpont értéknek számnak kell lennie'); // Hiba dobása
    } // Típus szám

    if (!Number.isInteger(kezdoTudatpont)) { // Ha nem egész szám
      // Ha nem egész szám, hiba
      throw new Error('A kezdő tudatpont értéknek egész számnak kell lennie'); // Hiba dobása
    } // Egész szám rendben

    // 2. LÉPÉS - "SZÜLŐ" TARTALOM VALIDÁLÁSA
    // A jelenlegi logika szerint legalább egy szülő tartalom kell a javaslathoz
    if (!javaslatAdatok.szuloId) { // Ha nincs szuloId megadva
      // Ha nincs szülő tartalom ID, hiba
      throw new Error('A javaslat létrehozásához szülő tartalom megadása kötelező'); // Hiba dobása
    } // Szülő ID megadva

    // Szülő tartalom létezésének ellenőrzése
    console.log('javaslatLetrehozas - TartalomRepository.findById (szülő)', { // Logoljuk a szülő tartalom lekérését
      szuloId: javaslatAdatok.szuloId // Megadjuk a szülő azonosítót
    }); // Log üzenet vége

    const szuloTartalom = await TartalomRepository.findById(javaslatAdatok.szuloId); // Lekérjük a szülő tartalmat az adatbázisból

    if (!szuloTartalom) { // Ha nincs ilyen tartalom
      // Ha nincs ilyen tartalom, hiba
      throw new Error('A megadott szülő tartalom nem található'); // Hiba dobása
    } // Szülő tartalom létezik

    console.log('javaslatLetrehozas - Szülő tartalom validálva', { // Logoljuk, hogy a szülő rendben van
      szuloId: szuloTartalom.id,   // A megtalált szülő azonosítója
      szuloCim: szuloTartalom.cim  // A megtalált szülő címe
    }); // Log üzenet vége

    // 2.A LÉPÉS - EGYEZMÉNY TÁRHELY VALIDÁLÁSA
    if (javaslatAdatok.egyezmenyTarhelyId) { // Ha van egyezmény tárhely ID megadva
      // Ha van egyezmény tárhely ID megadva, vizsgáljuk meg
      if (javaslatAdatok.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001') { // Ha speciális placeholder érték
        // Speciális érték: az új entitás lesz az egyezmény tárhelye
        if (javaslatAdatok.javaslatTipus !== 'Egyesites') { // Ha nem Egyesites típus
          // Ha nem Egyesítés típus, hiba
          throw new Error('Az eeeeeeeeeeeeeeeeeeee0001 egyezmény tárhely csak Egyesítés típusú javaslat esetén használható'); // Hiba dobása
        } // Egyesítés típus rendben a placeholderhez

        console.log('javaslatLetrehozas - Egyezmény tárhely eeeee...0001 - új entitás lesz az egyezmény tárhelye'); // Log üzenet a speciális esetről
      } else { // Ha nem speciális érték
        // Normál egyezmény tárhely validálása
        console.log('javaslatLetrehozas - TartalomRepository.findById (egyezmény tárhely)', { // Logoljuk a lekérést
          egyezmenyTarhelyId: javaslatAdatok.egyezmenyTarhelyId // Megadjuk az egyezmény tárhely azonosítót
        }); // Log üzenet vége

        const egyezmenyTarhely = await TartalomRepository.findById(javaslatAdatok.egyezmenyTarhelyId); // Lekérjük az egyezmény tárhely tartalmat

        if (!egyezmenyTarhely) { // Ha nem található
          // Ha nincs ilyen tartalom, hiba
          throw new Error('A megadott egyezmény tárhely tartalom nem található'); // Hiba dobása
        } // Egyezmény tárhely létezik

        console.log('javaslatLetrehozas - Egyezmény tárhely validálva', { // Logoljuk az érvényes egyezmény tárhelyet
          egyezmenyTarhelyId: egyezmenyTarhely.id,   // Egyezmény tárhely azonosítója
          egyezmenyTarhelyCim: egyezmenyTarhely.cim  // Egyezmény tárhely címe
        }); // Log üzenet vége
      } // Normál egyezmény tárhely ág vége
    } else { // Ha nincs egyezmény tárhely megadva
      // Nincs egyezmény tárhely megadva, null lesz
      console.log('javaslatLetrehozas - Nincs egyezmény tárhely megadva - null lesz az egyezmény szuloId-je'); // Log üzenet
    } // Egyezmény tárhely kezelése vége

    // 3. LÉPÉS - eEmber VALIDÁLÁSA
    console.log('javaslatLetrehozas - TudatpontRepository.findeEmberById', { // Logoljuk az eEmber lekérését
      eEmberId // Átadjuk az eEmber azonosítót
    }); // Log üzenet vége

    const eEmber = await TudatpontRepository.findeEmberById(eEmberId); // Lekérjük az eEmbert a tudatpont repository-ból

    if (!eEmber) { // Ha nincs ilyen eEmber
      // Ha nincs ilyen eEmber, hiba
      throw new Error('eeEmber nem található'); // Hiba dobása
    } // eeEmber létezik

    // 4. LÉPÉS - ÉRINTETT ENTITÁSOK VALIDÁLÁSA
    console.log('javaslatLetrehozas - Érintett entitások validálása', { // Logoljuk az érintett entitások számát
      count: javaslatAdatok.erintettEntitasok.length // Megadjuk a darabszámot
    }); // Log üzenet vége

    for (const entitas of javaslatAdatok.erintettEntitasok) { // Végigmegyünk minden érintett entitáson
      let entitasLetezik = false; // Kezdetben úgy vesszük, hogy nem létezik

      if (entitas.entitasTipus === 'Tartalom') { // Ha az entitás típusa Tartalom
        // Ha az entitás típusa Tartalom, tartalom repository-t használunk
        const tartalom = await TartalomRepository.findById(entitas.entitasId); // Lekérjük a tartalmat
        entitasLetezik = !!tartalom; // Boolean értékké alakítjuk
      } else if (entitas.entitasTipus === 'Kategoria') { // Ha Kategoria típus
        // Ha kategória, kategória repository-t használunk
        const kategoria = await KategoriaRepository.findById(entitas.entitasId); // Lekérjük a kategóriát
        entitasLetezik = !!kategoria; // Boolean értékké alakítjuk
      } else if (entitas.entitasTipus === 'TartalomTipus') { // Ha TartalomTipus típus
        // Ha tartalom típus, tartalom típus repository-t használunk
        const tartalomTipus = await TartalomTipusRepository.findById(entitas.entitasId); // Lekérjük a tartalom típust
        entitasLetezik = !!tartalomTipus; // Boolean értékké alakítjuk
      } // Más típusokra most nem számítunk

      if (!entitasLetezik) { // Ha az entitás nem létezik
        // Ha az entitás nem létezik, hiba
        throw new Error(`Érintett entitás ${entitas.entitasTipus} nem található: ${entitas.entitasId}`); // Hiba dobása részletes üzenettel
      } // Entitás létezik
    } // Minden érintett entitást validáltunk

    // 5. LÉPÉS - TÖREDÉK LOGIKA ELŐKÉSZÍTÉSE
    const toredekDarab = javaslatAdatok.erintettEntitasok.length; // Ennyi töredék jön létre
    console.log('javaslatLetrehozas - Töredék darab', { // Logoljuk a töredékek számát
      toredekDarab // Átadjuk a darabszámot
    }); // Log üzenet vége

    // Tudatpont felosztása a töredékek között
    const elosztottTudatpontok = this.elosztottTudatpontokKiszamitasa( // Meghívjuk a segédfüggvényt
      toredekDarab,         // Ennyi töredékre osztjuk
      kezdoTudatpont        // Ezt a kezdő pont mennyiséget
    ); // Kiszámoljuk töredékenként a pontokat

    // Közös töredék csoport azonosító generálása
    const toredekCsoportId = new (require('mongoose')).Types.ObjectId(); // Új ObjectId generálása a csoportra

    console.log('javaslatLetrehozas - Töredék csoport azonosító', { // Logoljuk a csoport azonosítót
      toredekCsoportId // Átadjuk az ID-t
    }); // Log üzenet vége

    // 6. LÉPÉS - SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE A TELJES LOGIKAI JAVASLATRA
    console.log('javaslatLetrehozas - JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese', { // Logoljuk a jogosultság ellenőrzését
      eEmberId,                                      // eeEmber azonosító
      erintettEntitasok: javaslatAdatok.erintettEntitasok // Az összes érintett entitás
    }); // Log üzenet vége

    const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese( // Meghívjuk a jogosultság szolgáltatást
      eEmberId,                          // eeEmber azonosító
      javaslatAdatok.erintettEntitasok  // Összes érintett entitás
    ); // Hívás vége

    if (!jogosultsag.jogosult) { // Ha nincs jogosultság
      // Ha nincs jogosultság, hiba
      throw new Error( // Hibát dobunk részletes üzenettel
        `Nincs szavazási jogosultságod. Hiányzó tudatpont ezen entitáson: ${jogosultsag.hianyzoEntitas}` // Üzenet a hiányzó entitásról
      ); // Hiba dobása vége
    } // Jogosultság rendben

    console.log('javaslatLetrehozas - Szavazási jogosultság OK'); // Log üzenet, hogy jogosultság rendben

    // 7. LÉPÉS - TÖREDÉK JAVASLATOK LÉTREHOZÁSA
    const letrehozottJavaslatok = []; // Itt gyűjtjük a létrehozott javaslatokat

    // Végigmegyünk az érintett entitásokon, és mindenhez külön töredék javaslatot hozunk létre
    for (let index = 0; index < javaslatAdatok.erintettEntitasok.length; index++) { // For ciklus az entitásokhoz
      // Aktuális töredék indexe
      const entitas = javaslatAdatok.erintettEntitasok[index]; // Aktuális érintett entitás
      const toredekSorszam = index + 1; // 1-alapú sorszám

      // Szülő ID az adott tartalom lesz, ha entitás típusa Tartalom
      // További egyszerűsítés: csak Tartalomra engedünk javaslatot tenni
      if (entitas.entitasTipus !== 'Tartalom') { // Ha az entitás típusa nem Tartalom
        // Ha nem tartalom, hibát dobunk, mert az új logikában csak tartalom lehet
        throw new Error('A töredék javaslatok jelenleg csak Tartalom típusú entitásra engedélyezettek'); // Hiba dobása
      } // Csak tartalom típus engedett

      const szuloIdToredek = entitas.entitasId; // A töredék szülője az érintett tartalom

      // Egyezmény tárhely érték meghatározása
      const egyezmenyTarhelyIdErtek = javaslatAdatok.egyezmenyTarhelyId || null; // Ha nincs megadva, null

      // Aktuális töredék javaslat típusa az adott entitás művelete alapján
      const toredekJavaslatTipus = entitas.muvelet; // A töredék tényleges típusa az adott művelet

      // Log a töredék típus meghatározásának elején
      console.log('javaslatLetrehozas - Töredék javaslat típus meghatározása - KEZDÉS', { // Kezdő log
        entitas,             // Logoljuk az entitást
        toredekJavaslatTipus // Logoljuk a kiszámolt töredék típust
      }); // Log üzenet vége

      // Biztonsági validáció: a műveletnek léteznie kell
      if (!toredekJavaslatTipus) { // Ha nincs művelet megadva
        // Ha nincs művelet, hiba
        throw new Error('A töredék javaslat típusának meghatározásához az entitas.muvelet kötelező'); // Hibát dobunk
      } // A művelet megléte rendben

      // Log a töredék típus meghatározásának végén
      console.log('javaslatLetrehozas - Töredék javaslat típus meghatározása - VÉGE', { // Záró log
        toredekJavaslatTipus // Logoljuk a végleges típust
      }); // Log üzenet vége

      // Új töredék javaslat adatainak összeállítása
      const ujJavaslatAdatok = {
        javaslatTipus: toredekJavaslatTipus,
        erintettEntitasok: [entitas],
        letrehozo: eEmberId,
        indoklas: javaslatAdatok.indoklas,
        szuloId: szuloIdToredek,
        szuloTipus: 'Tartalom',
        egyezmenyTarhelyId: egyezmenyTarhelyIdErtek,
        statusz: 'Aktiv',
        letrehozva: new Date(),
        toredekCsoportId,
        toredekSorszam,
        toredekDarab
      };

      // Ha a töredék típusa Egyesites, akkor át kell másolni az egyesítés adatait
      if (toredekJavaslatTipus === 'Egyesites') { // Csak Egyesites típusú töredéknél fut le
        // Ha Egyesítés típus, ellenőrizzük, hogy vannak-e egyesítés adatok
        if (!javaslatAdatok.egyesitesAdatok) { // Ha hiányoznak az egyesítés adatok
          // Ha hiányoznak, hiba
          throw new Error('Egyesites típusú töredéknél az egyesitesAdatok megadása kötelező'); // Hiba dobása
        } // Egyesítés adatok megvannak

        ujJavaslatAdatok.egyesitesAdatok = javaslatAdatok.egyesitesAdatok; // Átmásoljuk az adatokat az új töredékbe
      } // Egyesítés specifikus ág vége

      // Log a töredék objektum összeállításának végén
      console.log('javaslatLetrehozas - Töredék javaslat adatok összeállítása - VÉGE', { // Logoljuk az elkészült töredék adatokat
        ujJavaslatAdatok // Átadjuk az objektumot
      }); // Log üzenet vége

      // 7.1 - JAVASLAT MENTÉSE
      console.log('javaslatLetrehozas - JavaslatRepository.create (töredék)', { // Logoljuk a mentés előtti állapotot
        ujJavaslatAdatok // Létrehozandó töredék adatai
      }); // Log üzenet vége

      const ujJavaslat = await JavaslatRepository.create(ujJavaslatAdatok); // Létrehozzuk az új töredék javaslatot az adatbázisban

      // 7.2 - TUDATPONT HOZZÁRENDELÉS (töredék szintű pont)
      const toredekKezdoPont = elosztottTudatpontok[index]; // A töredékhez tartozó kezdő pont

      console.log('javaslatLetrehozas - TudatpontService.tudatpontHozzarendelese (töredék)', { // Logoljuk a tudatpont hozzárendelést
        eEmberId,             // eeEmber azonosító
        javaslatId: ujJavaslat.id, // Frissen létrehozott javaslat azonosítója
        toredekKezdoPont     // A töredékhez kiosztott pont
      }); // Log üzenet vége

      await TudatpontService.tudatpontHozzarendelese( // Meghívjuk a tudatpont szolgáltatást
        eEmberId,          // eeEmber azonosító
        ujJavaslat.id,    // Javaslat azonosító
        'Javaslat',       // Entitás típus: Javaslat
        toredekKezdoPont  // Hozzárendelt pont
      ); // Tudatpont hozzárendelése a töredék javaslathoz

      // 7.3 - AUTOMATIKUS TÁMOGATÓ SZAVAZAT (a létrehozótól)
      console.log('javaslatLetrehozas - SzavazatService.szavazatLeadasa (töredék)', { // Logoljuk a szavazat leadását
        eEmberId,           // eeEmber azonosító
        javaslatId: ujJavaslat.id // Javaslat azonosító
      }); // Log üzenet vége

      await SzavazatService.szavazatLeadasa( // Automatikus szavazat leadása
        eEmberId,          // eeEmber azonosító
        ujJavaslat.id,    // Javaslat azonosító
        'Tamogat'         // Szavazat típusa: Tamogat
      ); // Automatikus támogató szavazat

      // 7.4 - SZÁMÍTOTT ÉRTÉKEK FRISSÍTÉSE
      console.log('javaslatLetrehozas - JavaslatSzamitasService.szamitottErtekekFrissitese (töredék)', { // Logoljuk a számítás hívását
        javaslatId: ujJavaslat.id // Javaslat azonosító
      }); // Log üzenet vége

      await JavaslatSzamitasService.szamitottErtekekFrissitese(ujJavaslat.id); // Számított értékek frissítése

      // 7.5 - HATÁLYBA LÉPÉSI IDŐ BEÁLLÍTÁSA
      console.log('javaslatLetrehozas - JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa (töredék)', { // Logoljuk az időzítés beállítását
        javaslatId: ujJavaslat.id // Javaslat azonosító
      }); // Log üzenet vége

      await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(ujJavaslat.id); // HI beállítása

      // 7.6 - FRISSÍTETT TÖREDÉK LEKÉRÉSE ÉS GYŰJTÉSE
      console.log('javaslatLetrehozas - JavaslatRepository.findById (töredék)', { // Logoljuk a lekérést
        javaslatId: ujJavaslat.id // Az új javaslat azonosítója
      }); // Log üzenet vége

      const frissitettToredek = await JavaslatRepository.findById(ujJavaslat.id); // Lekérjük a frissített javaslatot

      letrehozottJavaslatok.push(frissitettToredek); // Hozzáadjuk a listához
    } // Töredékek létrehozásának ciklusa vége

    // 8. LÉPÉS - EREDMÉNY VISSZAADÁSA
    console.log('javaslatLetrehozas - VÉGE', { // Logoljuk az összegzést
      toredekCsoportId,                                      // Közös csoport azonosító
      letrehozottJavaslatokSzama: letrehozottJavaslatok.length // Létrehozott töredékek száma
    }); // Log üzenet vége

    // Visszaadjuk a létrehozott töredék javaslatok listáját
    return { // Összetett eredmény visszaadása
      toredekCsoportId,            // Közös csoport azonosító
      javaslatok: letrehozottJavaslatok // Tömb a töredék javaslatokkal
    }; // A controller majd eldönti, mit mutat a frontendnek
  } // javaslatLetrehozas metódus vége





  // ===================================
  // JAVASLAT LEKÉRÉSE
  // ===================================
  /**
   * Egy javaslat lekérése ID alapján
   * 
   * @param {string} id - A javaslat ID-ja
   * @returns {Promise<Object>} A javaslat objektum
   * @throws {Error} Ha a javaslat nem található
   */
  async javaslatLekerese(id) {

    console.log("=================================== javaslatLekerese:: ", {
      id: id
    });
    

    // === 1. LÉPÉS: ID VALIDÁLÁS ===
    if (!id) {
      throw new Error('A javaslat ID megadása kötelező');
    }

    // === 2. LÉPÉS: REPOSITORY HÍVÁS - JAVASLAT LEKÉRÉSE ===
    console.log("javaslatLekerese >>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findById: ", {
      id: id
    });
    
    const javaslat = await JavaslatRepository.findById(id);

    // === 3. LÉPÉS: LÉTEZÉS ELLENŐRZÉSE ===
    if (!javaslat) {
      throw new Error('A javaslat nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<< javaslatLekerese====javaslat: ", {
      javaslat: javaslat
    });
    

    return javaslat;
  }

  // ===================================
  // JAVASLATOK LISTÁZÁSA
  // ===================================
  /**
   * Javaslatok listázása szűrőkkel
   * 
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<Array>} Javaslatok tömb
   */
  async javaslatokListazasa(szurok = {}) {

    console.log("=================================== javaslatokListazasa:: ", {
      szurok: szurok
    });
    

    // Repository hívás - javaslatok lekérése szűrőkkel
    console.log("javaslatLekerese >>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findAll: ", {
      szurok: szurok
    });

    const javaslatok = await JavaslatRepository.findAll(szurok);

    console.log("<<<<<<<<<<<<<<<<<<<<<< javaslatokListazasa===javaslatok: ", {
      javaslatok: javaslatok
    });    

    return javaslatok;
  }

  // ===================================
  // JAVASLAT RÉSZLETES ADATAINAK LEKÉRÉSE
  // ===================================

  /**
   * Javaslat részletes adatainak lekérése a eEmber szavazatával együtt
   * ÚJ: Ha az értékek elavultak, frissíti őket
   * @param {string} id - A javaslat ID-ja
   * @param {string} eEmberId - A eEmber ID-ja
   * @returns {Promise<Object>} { javaslat, eeEmberSzavazat, szavazasiJogosultsag }
   */
  async javaslatReszleteinekLekerese(id, eEmberId) {
    console.log('=================================== javaslatReszleteinekLekerese: ', { 
      id: id, 
      eEmber: eEmberId 
    });

    // === 1. LÉPÉS: JAVASLAT ALAPADATAINAK LEKÉRÉSE ===
    console.log("javaslatReszleteinekLekerese  >>>>>>>>>>>>>>>>>>> this.javaslatLekerese");
    
    let javaslat = await this.javaslatLekerese(id);

    // === ÚJ LÉPÉS: ELAVULT ÉRTÉKEK FRISSÍTÉSE ===
    // Ha a javaslat értékei elavultak, frissítjük őket
    if (javaslat.ertekekElavultak === true) {
      console.log('⚠️ Javaslat értékei elavultak, frissítés indítása:', id);
      
      // Számított értékek frissítése
      await JavaslatSzamitasService.szamitottErtekekFrissitese(id);
      
      // Hatályba lépési idő újraszámítása
      await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(id);
      
      // Elavult jelző törlése
      await JavaslatRepository.updateById(id, { ertekekElavultak: false });
      
      // Frissített javaslat újra lekérése
      javaslat = await JavaslatRepository.findById(id);
      
      console.log('✅ Javaslat értékei frissítve');
    }

    // === 2. LÉPÉS: eEmber SZAVAZATÁNAK LEKÉRÉSE (HA VAN) ===
    let eeEmberSzavazat = null;
    if (eEmberId) {
      eeEmberSzavazat = await SzavazatRepository.findByeEmberAndJavaslat(
        eEmberId,
        id
      );
    }

    // === 3. LÉPÉS: SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE ===
    let szavazasiJogosultsag = false;
    if (eEmberId) {
      const jogosultsag = await JavaslatJogosultsagService.szavazasiJogosultsagEllenorzese(
        eEmberId,
        javaslat.erintettEntitasok
      );
      szavazasiJogosultsag = jogosultsag.jogosult;
    }

    // === 4. LÉPÉS: ÖSSZESÍTETT OBJEKTUM VISSZAADÁSA ===
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatReszleteinekLekerese=====Eredmény:', {
      javaslat: javaslat,
      eeEmberSzavazat: eeEmberSzavazat,
      szavazasiJogosultsag: szavazasiJogosultsag
    });

    return {
      javaslat: javaslat,
      eeEmberSzavazat: eeEmberSzavazat,
      szavazasiJogosultsag: szavazasiJogosultsag
    };
  }

  // ----- ELAVULT JAVASLATOK FRISSÍTÉSE -----
  /**
   * Az összes elavult Aktiv javaslat értékeinek frissítése
   * Cron job használja percenként
   * @returns {Promise<Object>} { osszesen, sikeresen, hibak }
   */
  async elavultJavaslatokFrissitese() {
    console.log('=================================== elavultJavaslatokFrissitese::');

    // === 1. LÉPÉS: ELAVULT JAVASLATOK LEKÉRÉSE ===
    console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findElavultJavaslatok: ", 'Aktiv');
    
    const elavultJavaslatIds = await JavaslatRepository.findElavultJavaslatok('Aktiv');
    
    console.log('Elavult javaslatok száma:', elavultJavaslatIds.length);

    // Ha nincs elavult javaslat, visszatérünk
    if (elavultJavaslatIds.length === 0) {
      console.log('Nincs elavult javaslat');
      return { osszesen: 0, sikeresen: 0, hibak: [] };
    }

    // === 2. LÉPÉS: MINDEN ELAVULT JAVASLAT FRISSÍTÉSE ===
    const eredmeny = {
      osszesen: elavultJavaslatIds.length,
      sikeresen: 0,
      hibak: []
    };

    for (const javaslatId of elavultJavaslatIds) {
      try {
        console.log('Javaslat frissítése:', javaslatId);

        // Számított értékek frissítése
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatSzamitasService.szamitottErtekekFrissitese");

        await JavaslatSzamitasService.szamitottErtekekFrissitese(javaslatId);
        
        // Hatályba lépési idő újraszámítása
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa");

        await JavaslatIdozitesService.hatalybaLepesiIdoBeallitasa(javaslatId);
        
        // Elavult jelző törlése
        console.log("elavultJavaslatokFrissitese >>>>>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateById: ", {
          javaslatId: javaslatId,
          ertekekElavultak: 'false'
        });

        await JavaslatRepository.updateById(javaslatId, { ertekekElavultak: false });

        eredmeny.sikeresen++;
        console.log('✅ Javaslat sikeresen frissítve:', javaslatId);

      } catch (error) {
        // Hiba esetén rögzítjük, de folytatjuk a többi javaslattal
        console.error('❌ Javaslat frissítési hiba:', javaslatId, error.message);
        eredmeny.hibak.push({
          javaslatId: javaslatId,
          hiba: error.message
        });
      }
    }

    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< elavultJavaslatokFrissitese=====Eredmény:', eredmeny);
    return eredmeny;
  }



  // ===================================
  // STÁTUSZ FRISSÍTÉSE
  // ===================================
  /**
   * Egy javaslat státuszának módosítása
   * 
   * @param {string} id - A javaslat ID-ja
   * @param {string} ujStatusz - Az új státusz
   * @returns {Promise<Object>} A frissített javaslat
   * @throws {Error} Ha érvénytelen státusz
   */
  async statuszFrissitese(id, ujStatusz) {

    console.log("=================================== statuszFrissitese:: ", {
      id: id,
      ujStatusz: ujStatusz
    });

    // === 2. LÉPÉS: STÁTUSZ VALIDÁLÁSA ===
    const megengedettStatuszok = ['Aktiv', 'Elfogadva', 'Elvetve', 'Hiba'];

    if (!megengedettStatuszok.includes(ujStatusz)) {
      throw new Error(`Érvénytelen státusz. Megengedett értékek: ${megengedettStatuszok.join(', ')}`);
    }

    // === 3. LÉPÉS: REPOSITORY HÍVÁS - STÁTUSZ FRISSÍTÉSE ===
    console.log("statuszFrissitese >>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.updateStatusz");
    
    const frissitettJavaslat = await JavaslatRepository.updateStatusz(id, ujStatusz);

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<< statuszFrissitese=====frissitettJavaslat: ", {
      frissitettJavaslat: frissitettJavaslat
    });
    

    return frissitettJavaslat;
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatService();