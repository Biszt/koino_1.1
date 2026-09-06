// backend/services/egyezmenyService.js


// =====================================================
// IMPORTOK
// =====================================================
// Repository importálása - adatbázis műveletek
const EgyezmenyRepository = require('../repositories/egyezmenyRepository');
const SzavazatRepository = require('../repositories/szavazatRepository');


// Tudatpont szolgáltatás importálása
const TudatpontService = require('./tudatpontService');


// =====================================================
// EGYEZMÉNY SERVICE OSZTÁLY
// =====================================================
// Ez az osztály felelős az egyezmények kezeléséért
// Felelősség: egyezmény létrehozása, tudatpontok átrendezése javaslat→egyezmény
class EgyezmenyService {


  /**
   * ----- EGYEZMÉNY LÉTREHOZÁSA -----
   * MÓDOSÍTVA: Egyezmény szülő a javaslat egyezmenyTarhelyId mezőjéből származik
   * Ha nincs megadva egyezmenyTarhelyId, akkor null lesz a szuloId
   *
   * @param {Object} javaslat - A javaslat objektum
   * @param {Object} vegrehajatasEredmeny - A végrehajtás eredménye
   * @returns {Promise<Object>} Az új egyezmény objektum
   * @throws {Error} Ha validációs hiba van
   */
  async egyezmenyLetrehozasa(javaslat, vegrehajatasEredmeny) { // Egyezmény létrehozása egyedi vagy töredékcsoportos javaslatból
    // Log metódus kezdete értékekkel
    console.log('egyezmenyLetrehozasa - KEZDÉS', { // Kezdő log
      javaslatId: javaslat?._id || javaslat?.id, // Logoljuk a javaslat technikai azonosítóját
      egyezmenyTarhelyId: javaslat?.egyezmenyTarhelyId, // Logoljuk az egyezmény tárhely azonosítóját
      vegrehajatasEredmeny // Logoljuk a végrehajtás eredményét
    }); // Kezdő log vége


    // 1. LÉPÉS - VALIDÁLÁS
    if (!javaslat) { // Ellenőrizzük, hogy kaptunk-e javaslat objektumot
      throw new Error('A javaslat objektum megadása kötelező'); // Ha nincs, hibát dobunk
    } // Javaslat objektum ellenőrzés vége


    if (!vegrehajatasEredmeny) { // Ellenőrizzük, hogy kaptunk-e végrehajtási eredményt
      throw new Error('A végrehajtás eredménye kötelező'); // Ha nincs, hibát dobunk
    } // Végrehajtási eredmény ellenőrzés vége


    // 2. LÉPÉS - FORRÁS JAVASLAT ID-K NORMALIZÁLÁSA
    const forrasJavaslatIdk = Array.isArray(javaslat.eredetiToredekJavaslatok) && javaslat.eredetiToredekJavaslatok.length > 0 // Megnézzük, hogy töredékcsoportból összevont javaslatról van-e szó
      ? javaslat.eredetiToredekJavaslatok.map((toredek) => toredek._id || toredek.id).filter(Boolean) // Ha igen, az összes eredeti töredék javaslat azonosítóját összegyűjtjük
      : [javaslat._id || javaslat.id].filter(Boolean); // Ha nem, akkor egyedi javaslat esetén csak a saját azonosítót használjuk


    if (forrasJavaslatIdk.length === 0) { // Ellenőrizzük, hogy van-e legalább egy forrás javaslat ID
      throw new Error('Az egyezmény létrehozásához nem található forrás javaslat azonosító'); // Ha nincs, hibát dobunk
    } // Forrás javaslat ID-k ellenőrzése vége


    console.log('egyezmenyLetrehozasa - Forrás javaslat ID-k normalizálva', { // Logoljuk a normalizált forrás javaslat listát
      forrasJavaslatIdk // Kiírjuk az összes forrás javaslat azonosítót
    }); // Forrás javaslat ID-k log vége


    // 3. LÉPÉS - SZAVAZÁSI ADATOK LEKÉRÉSE CSOPORTSZINTEN
    const osszesSzavazat = []; // Ebben a tömbben gyűjtjük össze az összes forrás javaslat összes szavazatát


    for (const forrasJavaslatId of forrasJavaslatIdk) { // Végigmegyünk az összes forrás javaslat azonosítón
      console.log('egyezmenyLetrehozasa - SzavazatRepository.findByJavaslatId', { // Logoljuk a szavazat lekérést
        forrasJavaslatId // Logoljuk az aktuális forrás javaslat azonosítót
      }); // Szavazat lekérési log vége


      const javaslatSzavazatai = await SzavazatRepository.findByJavaslatId(forrasJavaslatId); // Lekérjük az aktuális forrás javaslat összes szavazatát


      for (const szavazat of javaslatSzavazatai) { // Végigmegyünk az aktuális javaslat összes szavazatán
        osszesSzavazat.push(szavazat); // Hozzáadjuk az összesített szavazat listához
      } // Az aktuális javaslat szavazatain végigmentünk
    } // Az összes forrás javaslat szavazatát összegyűjtöttük


    // =====================================================
    // DEDUPLIKÁCIÓ: EGYEDI FELHASZNÁLÓK SZÁMLÁLÁSA
    // =====================================================
    // Töredékes javaslat esetén ugyanaz a felhasználó több töredéket is
    // támogathatott → az osszesSzavazat tömbben ugyanaz az eemberId
    // többször is szerepelhet. A Set automatikusan kiszűri az ismétléseket,
    // így minden felhasználó csak egyszer kerül beleszámlálásra.
    const egyediTamogatoIdkSet = new Set(); // Egyedi támogató felhasználó azonosítók halmaza
    const egyediEllenzoIdkSet = new Set(); // Egyedi ellenző felhasználó azonosítók halmaza
    const egyediTartozkodoIdkSet = new Set(); // Egyedi tartózkodó felhasználó azonosítók halmaza


    for (const szavazat of osszesSzavazat) { // Végigmegyünk az összes összegyűjtött szavazaton
      const eemberIdStr = (szavazat.eemberId?._id || szavazat.eemberId).toString(); // Biztonságosan kiolvassuk és stringgé alakítjuk az eember azonosítót


      if (szavazat.szavazatTipus === 'Tamogat') { // Ha támogató szavazatról van szó
        egyediTamogatoIdkSet.add(eemberIdStr); // Hozzáadjuk az egyedi támogató halmazhoz (duplikátum automatikusan kizárva)
      } else if (szavazat.szavazatTipus === 'Ellenez') { // Ha ellenző szavazatról van szó
        egyediEllenzoIdkSet.add(eemberIdStr); // Hozzáadjuk az egyedi ellenző halmazhoz (duplikátum automatikusan kizárva)
      } else if (szavazat.szavazatTipus === 'Tartozkodik') { // Ha tartózkodó szavazatról van szó
        egyediTartozkodoIdkSet.add(eemberIdStr); // Hozzáadjuk az egyedi tartózkodó halmazhoz (duplikátum automatikusan kizárva)
      } // Szavazat típus elágazás vége
    } // Az összes szavazat feldolgozva


    // A Set.size pontosan az egyedi felhasználók számát adja vissza
    const tamogatokSzama = egyediTamogatoIdkSet.size; // Egyedi támogatók száma (deduplikálva)
    const ellenzokSzama = egyediEllenzoIdkSet.size; // Egyedi ellenzők száma (deduplikálva)
    const tartozkodokSzama = egyediTartozkodoIdkSet.size; // Egyedi tartózkodók száma (deduplikálva)


    console.log('egyezmenyLetrehozasa - Szavazási adatok csoportszinten (deduplikálva)', { // Logoljuk az összesített deduplikált szavazási adatokat
      forrasJavaslatDb: forrasJavaslatIdk.length, // Logoljuk, hány forrás javaslatból számoltunk
      osszSzavazatDb: osszesSzavazat.length, // Logoljuk az összes szavazat darabszámát (duplikátumokkal)
      tamogatokSzama, // Logoljuk az egyedi támogatók számát
      ellenzokSzama, // Logoljuk az egyedi ellenzők számát
      tartozkodokSzama // Logoljuk az egyedi tartózkodók számát
    }); // Szavazási adatok log vége


    // 4. LÉPÉS - EGYEZMÉNY SZÜLŐ ID MEGHATÁROZÁSA
    let egyezmenySzuloId = javaslat.egyezmenyTarhelyId || null; // Alapértelmezetten a javaslat egyezmény tárhelye lesz az egyezmény szülője
    // A szülő típusa a javaslat egyezmenyTarhelyTipus mezőjéből jön (polimorf:
    // Gondolat/Kategoria/GondolatTipus); régi javaslatoknál a default 'Gondolat'.
    let egyezmenySzuloTipus = egyezmenySzuloId ? (javaslat.egyezmenyTarhelyTipus || 'Gondolat') : null;


    if (javaslat.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001') { // Speciális placeholder eset kezelése
      if (javaslat.javaslatTipus === 'Egyesites' && vegrehajatasEredmeny.ujEntitas) { // Csak Egyesites típusnál és létrejött új entitásnál engedjük
        const ujEntitasId = vegrehajatasEredmeny.ujEntitas?.id || vegrehajatasEredmeny.ujEntitas?._id || null; // Biztonságosan kinyerjük az új entitás azonosítóját


        console.log('egyezmenyLetrehozasa - Új entitás ID kiolvasása (eeeeeeeeeeeeeeeeeeee0001)', { // Logoljuk az új entitás ID kiolvasását
          'ujEntitas.id': vegrehajatasEredmeny.ujEntitas?.id, // Az id mező értéke
          'ujEntitas._id': vegrehajatasEredmeny.ujEntitas?._id, // Az _id mező értéke
          final: ujEntitasId // A végül használt azonosító
        }); // Új entitás ID log vége


        if (!ujEntitasId) { // Ha nem sikerült új entitás ID-t találni
          console.error('HIBA: Új entitás ID hiányzik', { vegrehajatasEredmeny }); // Részletes hibalog
          throw new Error('Az új entitás ID-ja nem található a végrehajtási eredményben (eeeeeeeeeeeeeeeeeeee0001)'); // Hibát dobunk
        } // Új entitás ID ellenőrzés vége


        const ujEntitasTipus = vegrehajatasEredmeny.ujEntitas.tipus || 'Gondolat'; // Meghatározzuk az új entitás típusát


        egyezmenySzuloId = ujEntitasId; // Az egyezmény szülője az új entitás lesz
        egyezmenySzuloTipus = ujEntitasTipus; // Az egyezmény szülő típusa az új entitás típusa lesz


        console.log('egyezmenyLetrehozasa - Egyezmény szülő: ÚJ ENTITÁS', { // Logoljuk az új egyezmény szülőt
          egyezmenySzuloId: ujEntitasId, // Az új szülő ID
          egyezmenySzuloTipus: ujEntitasTipus, // Az új szülő típus
          forras: 'eeeeeeeeeeeeeeeeeeee0001 speciális érték' // Megjelöljük a forrást
        }); // Egyezmény szülő log vége
      } else { // Ha nem Egyesites típus vagy nincs új entitás
        throw new Error('Az "eeeeeeeeeeeeeeeeeeee0001" egyezmény tárhely csak Egyesites típusú javaslat esetén használható, és az új entitásnak létre kell jönnie'); // Hibát dobunk
      } // Speciális placeholder kezelés vége
    } // eeeee...0001 ág vége


    // 4.A LÉPÉS - TÖRÖLT TÁRHELY KEZELÉSE
    // Ha az egyezmény tárhelye éppen a most végrehajtott javaslat által
    // TÖRÖLT entitás (tipikus Törlés eset: az egyezmény a törölt gondolat
    // alatt jött volna létre), az egyezmény a törölt entitás EREDETI
    // szülője alá kerül — átveszi a törölt entitás helyét a hierarchiában.
    if (egyezmenySzuloId) { // Csak akkor vizsgáljuk, ha van kijelölt tárhely
      // A törölt entitások összegyűjtése a végrehajtási eredményből:
      // Torles típusnál a toroltEntitasok tömb, Csomagnál a csomagEredmenyek
      const toroltEntitasok = [
        ...(vegrehajatasEredmeny.toroltEntitasok || []),
        ...((vegrehajatasEredmeny.csomagEredmenyek || []).filter(e => e.muvelet === 'Torles'))
      ].filter(e => e.torolve); // Csak a ténylegesen törölt entitások

      // LÁNCOLT ÁTIRÁNYÍTÁS: ha az eredeti szülő MAGA IS törölt entitás
      // (pl. csomag javaslat több, egymásra épülő törléssel), addig lépünk
      // felfelé az eredeti szülők láncán, amíg nem törölt szülőt találunk,
      // vagy el nem fogy a lánc (ekkor az egyezmény gyökér lesz)
      let lepesVedelem = 0; // Végtelen ciklus elleni védelem
      while (egyezmenySzuloId && lepesVedelem < 100) {
        lepesVedelem++;

        const toroltTarhely = toroltEntitasok.find( // Törölve lett-e az aktuális tárhely-jelölt?
          e => e.entitasId?.toString() === egyezmenySzuloId.toString()
        );

        if (!toroltTarhely) break; // Nem törölt entitás — ez lesz az egyezmény szülője

        console.log('egyezmenyLetrehozasa - A tárhely entitás törölve lett, átirányítás az eredeti szülőre', {
          toroltTarhelyId: egyezmenySzuloId, // A törölt tárhely azonosítója
          eredetiSzuloId: toroltTarhely.eredetiSzuloId ?? null, // A törölt entitás eredeti szülője
          eredetiSzuloTipus: toroltTarhely.eredetiSzuloTipus ?? null // Az eredeti szülő típusa
        });

        egyezmenySzuloId = toroltTarhely.eredetiSzuloId ?? null; // Továbblépés az eredeti szülőre
        // Gyökér entitás törlésekor nincs szülő — az egyezmény lesz az új gyökér (szuloId: null)
        egyezmenySzuloTipus = egyezmenySzuloId ? (toroltTarhely.eredetiSzuloTipus ?? 'Gondolat') : null;
      }
    }

    console.log('egyezmenyLetrehozasa - Egyezmény szülő meghatározva', { // Logoljuk a végleges egyezmény szülőt
      egyezmenySzuloId: egyezmenySzuloId, // A végleges szülő azonosítója
      egyezmenySzuloTipus: egyezmenySzuloTipus, // A végleges szülő típusa
      forras: javaslat.egyezmenyTarhelyId === 'eeeeeeeeeeeeeeeeeeee0001' ? 'eeeeeeeeeeeeeeeeeeee0001 speciális érték' : 'javaslat.egyezmenyTarhelyId' // A forrás mező értéke
    }); // Egyezmény szülő log vége


    // 5. LÉPÉS - EGYEZMÉNY OBJEKTUM ÖSSZEÁLLÍTÁSA
    const egyezmenyAdatok = { // Létrehozzuk a mentendő egyezmény adat objektumot
      javaslatId: forrasJavaslatIdk[0], // Kompatibilitási okból az első forrás javaslat azonosítóját mentjük a javaslatId mezőbe
      javaslatTipus: javaslat.javaslatTipus, // A javaslat típusát snapshotként elmentjük
      szuloId: egyezmenySzuloId, // Beállítjuk az egyezmény szülőjét
      szuloTipus: egyezmenySzuloTipus, // Beállítjuk az egyezmény szülő típusát
      erintettEntitasok: javaslat.erintettEntitasok, // Elmentjük az érintett entitások snapshotját
      indoklas: javaslat.indoklas, // Elmentjük az indoklás snapshotját
      letrehozo: javaslat.letrehozo._id || javaslat.letrehozo, // Elmentjük a létrehozó azonosítóját
      vegrehajtva: new Date(), // Elmentjük a végrehajtás időpontját
      vegrehajatasEredmeny: vegrehajatasEredmeny, // Elmentjük a végrehajtás eredményét
      tamogatokSzama: tamogatokSzama, // Egyedi támogatók száma (deduplikálva)
      ellenzokSzama: ellenzokSzama, // Egyedi ellenzők száma (deduplikálva)
      tartozkodokSzama: tartozkodokSzama, // Egyedi tartózkodók száma (deduplikálva)
      reszveteliArany: javaslat.reszveteliArany || 0, // Elmentjük a részvételi arány snapshotját
      tamogatotsagiArany: javaslat.tamogatotsagiArany || 0, // Elmentjük a támogatottsági arány snapshotját
      ellenzoiArany: javaslat.ellenzoiArany || 0, // MODELL A – ellenzői arány snapshotja
      tartozkodoiArany: javaslat.tartozkodoiArany || 0, // MODELL A – tartózkodói arány snapshotja
      bizonyossagiMutato: javaslat.bizonyossagiMutato || 0 // Elmentjük a bizonyossági mutató snapshotját
    }; // Az egyezmény adatok alapobjektumának vége


    if (javaslat.javaslatTipus === 'Egyesites' && javaslat.egyesitesAdatok) { // Ha Egyesites típusú javaslatról van szó
      const ujEntitasId = vegrehajatasEredmeny.ujEntitas?.id || vegrehajatasEredmeny.ujEntitas?._id || null; // Biztonságosan kiolvassuk az új entitás azonosítóját


      console.log('egyezmenyLetrehozasa - Új entitás ID kiolvasása', { // Logoljuk az új entitás kiolvasását
        ujEntitasid: vegrehajatasEredmeny.ujEntitas?.id, // Az id mező értéke
        ujEntitasidtype: typeof vegrehajatasEredmeny.ujEntitas?.id, // Az id mező típusa
        ujEntitasidfinal: ujEntitasId // A végleges új entitás azonosító
      }); // Új entitás ID log vége


      if (!ujEntitasId) { // Ha az új entitás azonosítója hiányzik
        console.error('HIBA: ujEntitas struktúra', vegrehajatasEredmeny.ujEntitas); // Részletes hibalog
        throw new Error('Az új entitás ID-ja nem található a végrehajtási eredményben'); // Hibát dobunk
      } // Új entitás ID ellenőrzés vége


      egyezmenyAdatok.egyesitesAdatok = { // Hozzáadjuk az egyesítési adatokat az egyezményhez
        ujEntitasTipus: javaslat.egyesitesAdatok.ujEntitasTipus, // Az új entitás típusa
        ujEntitasId: ujEntitasId, // Az új entitás azonosítója
        ujEntitasAdatok: javaslat.egyesitesAdatok.ujEntitasAdatok, // Az új entitás adatai
        forrasEntitasok: javaslat.erintettEntitasok.map((e) => e.entitasId) // A forrás entitások listája
      }; // Egyesítési adatok vége
    } // Egyesites ág vége


    if (javaslat.javaslatTipus === 'Modositas') { // Ha Modositas típusú javaslatról van szó
      egyezmenyAdatok.modositasAdatok = javaslat.erintettEntitasok.reduce((acc, entitas) => { // Entitásonként összegyűjtjük a módosítási adatokat
        if (entitas.modositasAdatok) { // Csak akkor írjuk be, ha van módosítási adat
          acc[entitas.entitasId.toString()] = entitas.modositasAdatok; // Az entitás azonosítója alá berakjuk a módosítási adatokat
        } // Módosítási adat ellenőrzés vége
        return acc; // Visszaadjuk az akkumulátort a reduce következő köréhez
      }, {}); // A reduce kezdőértéke egy üres objektum
    } // Modositas ág vége


    console.log('egyezmenyLetrehozasa - Egyezmény adatok összeállítva', { // Logoljuk az elkészült mentési adatokat
      javaslatId: egyezmenyAdatok.javaslatId, // A mentendő javaslat azonosító
      szuloId: egyezmenyAdatok.szuloId, // A mentendő szülő azonosító
      szuloTipus: egyezmenyAdatok.szuloTipus, // A mentendő szülő típus
      egyesitesAdatok: egyezmenyAdatok.egyesitesAdatok || null // Az esetleges egyesítési adatok
    }); // Egyezmény adatok log vége


    // 6. LÉPÉS - REPOSITORY HÍVÁS - MENTÉS ADATBÁZISBA
    console.log('egyezmenyLetrehozasa - EgyezmenyRepository.create'); // Logoljuk a repository create hívást
    const ujEgyezmeny = await EgyezmenyRepository.create(egyezmenyAdatok); // Elmentjük az új egyezményt az adatbázisba


    console.log('egyezmenyLetrehozasa - VÉGE', { // Záró log
      ujEgyezmenyId: ujEgyezmeny.id, // Az új egyezmény azonosítója
      szuloId: ujEgyezmeny.szuloId // Az új egyezmény szülő azonosítója
    }); // Záró log vége


    return ujEgyezmeny; // Visszaadjuk a létrehozott egyezményt
  } // egyezmenyLetrehozasa metódus vége


  // ----- TUDATPONTOK ÁTRENDEZÉSE JAVASLAT→EGYEZMÉNY -----
  /**
   * Tudatpontok átrendezése a javaslatról az egyezményre
   * TÁMOGATÓK: javaslatról → egyezményre
   * ELLENZŐK & TARTÓZKODÓK: javaslatról → vissza a eembernek
   * @param {string|Array} javaslatIdVagyJavaslatIdLista - Egy vagy több javaslat MongoDB ObjectId-ja
   * @param {string} egyezmenyId - Az egyezmény MongoDB ObjectId-ja
   * @returns {Promise<Object>} Átrendezés eredménye
   * @throws {Error} Ha hiba történik
   */
  async tudatpontokAtrendezeseJavaslatrolEgyezmenyre(javaslatIdVagyJavaslatIdLista, egyezmenyId) { // Tudatpontok átrendezése egy vagy több javaslatról az egyezményre
    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - KEZDÉS', { // Kezdő log a bemeneti értékekkel
      javaslatIdVagyJavaslatIdLista: javaslatIdVagyJavaslatIdLista, // Logoljuk a forrás javaslat azonosítót vagy azonosító listát
      egyezmenyId: egyezmenyId // Logoljuk a cél egyezmény azonosítót
    }); // Kezdő log vége


    // 1. LÉPÉS - BEMENET NORMALIZÁLÁSA
    const javaslatIdLista = Array.isArray(javaslatIdVagyJavaslatIdLista) // Ellenőrizzük, hogy tömb vagy egyedi érték érkezett-e
      ? javaslatIdVagyJavaslatIdLista.filter(Boolean) // Ha tömb, akkor kiszűrjük az üres elemeket
      : [javaslatIdVagyJavaslatIdLista].filter(Boolean); // Ha nem tömb, akkor egy elemű tömbbé alakítjuk


    if (javaslatIdLista.length === 0) { // Ellenőrizzük, hogy maradt-e legalább egy érvényes javaslat azonosító
      throw new Error('A tudatpontok átrendezéséhez legalább egy forrás javaslat azonosító szükséges'); // Ha nincs, hibát dobunk
    } // Javaslat azonosító lista ellenőrzés vége


    if (!egyezmenyId) { // Ellenőrizzük, hogy meg van-e adva az egyezmény azonosító
      throw new Error('A tudatpontok átrendezéséhez az egyezmény azonosító megadása kötelező'); // Ha nincs, hibát dobunk
    } // Egyezmény azonosító ellenőrzés vége


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Javaslat ID lista normalizálva', { // Logoljuk a normalizált javaslat azonosító listát
      javaslatIdLista: javaslatIdLista, // Logoljuk az összes forrás javaslat azonosítót
      javaslatDb: javaslatIdLista.length, // Logoljuk a forrás javaslatok darabszámát
      egyezmenyId: egyezmenyId // Logoljuk az egyezmény azonosítót
    }); // Normalizálási log vége


    // 2. LÉPÉS - SZAVAZATOK ÖSSZEGYŰJTÉSE AZ ÖSSZES FORRÁS JAVASLATRÓL
    const osszesSzavazat = []; // Ebben a tömbben gyűjtjük az összes forrás javaslat összes szavazatát


    for (const javaslatId of javaslatIdLista) { // Végigmegyünk az összes forrás javaslat azonosítón
      console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> SzavazatRepository.findByJavaslatId', { // Logoljuk a szavazat lekérési hívást
        javaslatId: javaslatId // Logoljuk az aktuális forrás javaslat azonosítót
      }); // Szavazat lekérési log vége


      const javaslatSzavazatai = await SzavazatRepository.findByJavaslatId(javaslatId); // Lekérjük az aktuális forrás javaslat összes szavazatát


      for (const szavazat of javaslatSzavazatai) { // Végigmegyünk az aktuális javaslat összes szavazatán
        osszesSzavazat.push({ // Hozzáadjuk az összesített szavazat listához a forrás javaslat azonosítóval együtt
          forrasJavaslatId: javaslatId, // Elmentjük, hogy melyik javaslatról származik a szavazat
          szavazat: szavazat // Elmentjük magát a szavazat objektumot
        }); // A csomagolt szavazat hozzáadása vége
      } // Az aktuális javaslat szavazatain végigmentünk
    } // Az összes forrás javaslat szavazatait összegyűjtöttük


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Összes szavazat összegyűjtve', { // Logoljuk az összesített szavazat adatokat
      osszSzavazatDb: osszesSzavazat.length, // Logoljuk az összes szavazat darabszámát
      javaslatDb: javaslatIdLista.length // Logoljuk a forrás javaslatok számát
    }); // Összes szavazat log vége


    // 3. LÉPÉS - SZAVAZATOK BONTÁSA TÍPUS SZERINT
    const tamogatoSzavazatok = osszesSzavazat.filter((elem) => elem.szavazat.szavazatTipus === 'Tamogat'); // Kiszűrjük a támogató szavazatokat
    const ellenzoSzavazatok = osszesSzavazat.filter((elem) => elem.szavazat.szavazatTipus === 'Ellenez'); // Kiszűrjük az ellenző szavazatokat
    const tartozkodoSzavazatok = osszesSzavazat.filter((elem) => elem.szavazat.szavazatTipus === 'Tartozkodik'); // Kiszűrjük a tartózkodó szavazatokat


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Típusok szerinti bontás', { // Logoljuk a típusok szerinti bontást
      tamogatok: tamogatoSzavazatok.length, // Logoljuk a támogató szavazatok darabszámát
      ellenzok: ellenzoSzavazatok.length, // Logoljuk az ellenző szavazatok darabszámát
      tartozkodok: tartozkodoSzavazatok.length // Logoljuk a tartózkodó szavazatok darabszámát
    }); // Típus bontási log vége


    // 4. LÉPÉS - TÁMOGATÓK TUDATPONTJAINAK ÁTKÖLTÖZTETÉSE
    let atkoltoztetettPontok = 0; // Ebben gyűjtjük az összes átköltöztetett pontot
    let atkoltoztetetteEmberek = 0; // Ebben számoljuk, hány eember kapott pontot az egyezményen
    const tamogatoHibak = []; // Ebben gyűjtjük a támogató oldal hibáit
    const tamogatoPontokeEmberenkent = new Map(); // Ebben eemberenként összesítjük az egyezményre átviendő pontokat


    for (const elem of tamogatoSzavazatok) { // Végigmegyünk az összes támogató szavazaton
      try { // Megpróbáljuk feldolgozni az aktuális támogató szavazatot
        const szavazat = elem.szavazat; // Kivesszük a csomagolt szavazat objektumot
        const forrasJavaslatId = elem.forrasJavaslatId; // Kivesszük a forrás javaslat azonosítót
        const eemberId = szavazat.eemberId._id || szavazat.eemberId; // Biztonságosan kiolvassuk az eember azonosítót
        const eemberIdString = eemberId.toString(); // Stringgé alakítjuk az eember azonosítót


        console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.eemberHozzajarulasaEntitason', { // Logoljuk a hozzájárulás lekérési hívást
          eemberId: eemberIdString, // Logoljuk az eember azonosítót
          forrasJavaslatId: forrasJavaslatId.toString(), // Logoljuk a forrás javaslat azonosítót
          entitasTipus: 'Javaslat' // Logoljuk az entitás típust
        }); // Hozzájárulás lekérési log vége


        const hozzarendeles = await TudatpontService.eemberHozzajarulasaEntitason( // Lekérjük az eember pontjait az adott forrás javaslaton
          eemberIdString, // Átadjuk az eember azonosítót
          forrasJavaslatId.toString(), // Átadjuk a forrás javaslat azonosítót
          'Javaslat' // Megadjuk az entitás típust
        ); // Hozzájárulás lekérés vége


        if (hozzarendeles.vanHozzajarulas && hozzarendeles.pontok > 0) { // Csak akkor dolgozunk tovább, ha ténylegesen van pont
          const pontok = hozzarendeles.pontok; // Elmentjük az aktuális pont mennyiséget


          console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese - FORRÁS NULLÁZÁS', { // Logoljuk a forrás javaslat pont nullázását
            eemberId: eemberIdString, // Logoljuk az eember azonosítót
            forrasJavaslatId: forrasJavaslatId.toString(), // Logoljuk a forrás javaslat azonosítót
            pontok: 0 // Logoljuk, hogy nullázás történik
          }); // Forrás nullázási log vége


          await TudatpontService.tudatpontHozzarendelese( // Nullázzuk az eember pontjait a forrás javaslaton
            eemberIdString, // Átadjuk az eember azonosítót
            forrasJavaslatId.toString(), // Átadjuk a forrás javaslat azonosítót
            'Javaslat', // Megadjuk az entitás típust
            0 // 0 pont = visszavonás a forrás javaslatról
          ); // Forrás nullázás vége


          const eddigiPont = tamogatoPontokeEmberenkent.get(eemberIdString) || 0; // Kiolvassuk az eember eddig összegyűjtött pontjait
          tamogatoPontokeEmberenkent.set(eemberIdString, eddigiPont + pontok); // Hozzáadjuk az aktuális pontokat az összesített eemberi pontokhoz
          atkoltoztetettPontok += pontok; // Növeljük az összes átköltöztetett pont számlálót


          console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Támogató pont összesítve', { // Logoljuk az összesítés eredményét
            eemberId: eemberIdString, // Logoljuk az eember azonosítót
            aktualisPontok: pontok, // Logoljuk az aktuálisan átvett pontokat
            osszesitettPontok: tamogatoPontokeEmberenkent.get(eemberIdString) // Logoljuk az eember összesített pontjait
          }); // Támogató összesítési log vége
        } // Hozzájárulás ellenőrzés vége
      } catch (error) { // Ha hiba történik az aktuális támogató feldolgozásakor
        console.error('Hiba támogató tudatpont átköltöztetésénél:', error.message); // Hibát logolunk
        tamogatoHibak.push({ // Elmentjük a hiba részleteit
          eemberId: (elem.szavazat.eemberId?._id || elem.szavazat.eemberId || '').toString(), // Elmentjük az eember azonosítót
          forrasJavaslatId: elem.forrasJavaslatId.toString(), // Elmentjük a forrás javaslat azonosítót
          hiba: error.message // Elmentjük a hibaüzenetet
        }); // Hiba objektum vége
      } // Try-catch vége
    } // Az összes támogató szavazaton végigmentünk


    for (const [eemberIdString, osszesitettPont] of tamogatoPontokeEmberenkent.entries()) { // eEmberenként egyszer írjuk fel az összesített pontot az egyezményre
      console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese - EGYEZMÉNY HOZZÁRENDELÉS', { // Logoljuk az egyezményre írást
        eemberId: eemberIdString, // Logoljuk az eember azonosítót
        egyezmenyId: egyezmenyId.toString(), // Logoljuk az egyezmény azonosítót
        osszesitettPont: osszesitettPont // Logoljuk az összesített pontokat
      }); // Egyezmény hozzárendelési log vége


      await TudatpontService.tudatpontHozzarendelese( // Hozzárendeljük az összesített pontot az egyezményhez
        eemberIdString, // Átadjuk az eember azonosítót
        egyezmenyId.toString(), // Átadjuk az egyezmény azonosítót
        'Egyezmeny', // Megadjuk az entitás típust
        osszesitettPont // Átadjuk az összesített pont értéket
      ); // Egyezmény hozzárendelés vége


      atkoltoztetetteEmberek += 1; // Növeljük az egyezményre ténylegesen átmozgatott eemberek számát
    } // Az összes támogató egyezményre írása vége


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Támogatók feldolgozva', { // Logoljuk a támogatók feldolgozásának eredményét
      atkoltoztetettPontok: atkoltoztetettPontok, // Logoljuk az átköltöztetett pontok számát
      atkoltoztetetteEmberek: atkoltoztetetteEmberek, // Logoljuk az érintett eemberek számát
      hibakDb: tamogatoHibak.length // Logoljuk a hibák számát
    }); // Támogatók összegző log vége


    // 5. LÉPÉS - ELLENZŐK ÉS TARTÓZKODÓK PONTJAINAK VISSZAOSZTÁSA
    let visszaosztottPontok = 0; // Ebben gyűjtjük az összes visszaosztott pontot
    let visszaosztotteEmberek = 0; // Ebben számoljuk az érintett eembereket
    const visszaosztasHibak = []; // Ebben gyűjtjük a visszaosztási hibákat
    const visszaosztotteEmberKulcsok = new Set(); // Ebben a halmazban az egyedi eembereket tároljuk


    const visszaosztandoSzavazatok = [...ellenzoSzavazatok, ...tartozkodoSzavazatok]; // Összefűzzük az ellenző és tartózkodó szavazatokat


    for (const elem of visszaosztandoSzavazatok) { // Végigmegyünk az összes visszaosztandó szavazaton
      try { // Megpróbáljuk feldolgozni az aktuális szavazatot
        const szavazat = elem.szavazat; // Kivesszük a csomagolt szavazat objektumot
        const forrasJavaslatId = elem.forrasJavaslatId; // Kivesszük a forrás javaslat azonosítót
        const eemberId = szavazat.eemberId._id || szavazat.eemberId; // Biztonságosan kiolvassuk az eember azonosítót
        const eemberIdString = eemberId.toString(); // Stringgé alakítjuk az eember azonosítót


        console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.eemberHozzajarulasaEntitason', { // Logoljuk a hozzájárulás lekérési hívást
          eemberId: eemberIdString, // Logoljuk az eember azonosítót
          forrasJavaslatId: forrasJavaslatId.toString(), // Logoljuk a forrás javaslat azonosítót
          szavazatTipus: szavazat.szavazatTipus, // Logoljuk a szavazat típusát
          entitasTipus: 'Javaslat' // Logoljuk az entitás típust
        }); // Hozzájárulás lekérési log vége


        const hozzarendeles = await TudatpontService.eemberHozzajarulasaEntitason( // Lekérjük az eember pontjait az aktuális forrás javaslaton
          eemberIdString, // Átadjuk az eember azonosítót
          forrasJavaslatId.toString(), // Átadjuk a forrás javaslat azonosítót
          'Javaslat' // Megadjuk az entitás típust
        ); // Hozzájárulás lekérés vége


        if (hozzarendeles.vanHozzajarulas && hozzarendeles.pontok > 0) { // Csak akkor dolgozunk tovább, ha ténylegesen van pont
          const pontok = hozzarendeles.pontok; // Elmentjük a pontok számát


          console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre >>>>>>>>>>>>>>>>>>>>>>>> TudatpontService.tudatpontHozzarendelese - VISSZAOSZTÁS', { // Logoljuk a visszaosztási nullázást
            eemberId: eemberIdString, // Logoljuk az eember azonosítót
            forrasJavaslatId: forrasJavaslatId.toString(), // Logoljuk a forrás javaslat azonosítót
            szavazatTipus: szavazat.szavazatTipus, // Logoljuk a szavazat típusát
            pontok: 0 // Logoljuk, hogy nullázás történik
          }); // Visszaosztási log vége


          await TudatpontService.tudatpontHozzarendelese( // Nullázzuk az eember pontjait a forrás javaslaton
            eemberIdString, // Átadjuk az eember azonosítót
            forrasJavaslatId.toString(), // Átadjuk a forrás javaslat azonosítót
            'Javaslat', // Megadjuk az entitás típust
            0 // 0 pont = visszavonás, így a pont visszakerül az eemberhez
          ); // Visszaosztó nullázás vége


          visszaosztottPontok += pontok; // Növeljük az összes visszaosztott pont számlálót
          visszaosztotteEmberKulcsok.add(eemberIdString); // Elmentjük az eembert az egyedi érintettek közé


          console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Ellenző vagy tartózkodó pont visszaosztva', { // Logoljuk a visszaosztás eredményét
            eemberId: eemberIdString, // Logoljuk az eember azonosítót
            forrasJavaslatId: forrasJavaslatId.toString(), // Logoljuk a forrás javaslat azonosítót
            szavazatTipus: szavazat.szavazatTipus, // Logoljuk a szavazat típusát
            pontok: pontok // Logoljuk a visszaosztott pontok számát
          }); // Visszaosztás eredmény log vége
        } // Hozzájárulás ellenőrzés vége
      } catch (error) { // Ha hiba történik az aktuális ellenző vagy tartózkodó feldolgozásakor
        console.error('Hiba ellenző vagy tartózkodó tudatpont visszaosztásánál:', error.message); // Hibát logolunk
        visszaosztasHibak.push({ // Elmentjük a hiba részleteit
          eemberId: (elem.szavazat.eemberId?._id || elem.szavazat.eemberId || '').toString(), // Elmentjük az eember azonosítót
          forrasJavaslatId: elem.forrasJavaslatId.toString(), // Elmentjük a forrás javaslat azonosítót
          szavazatTipus: elem.szavazat.szavazatTipus, // Elmentjük a szavazat típusát
          hiba: error.message // Elmentjük a hibaüzenetet
        }); // Hiba objektum vége
      } // Try-catch vége
    } // Az összes visszaosztandó szavazaton végigmentünk


    visszaosztotteEmberek = visszaosztotteEmberKulcsok.size; // Beállítjuk az egyedi érintett eemberek számát


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - Ellenzők és tartózkodók feldolgozva', { // Logoljuk a visszaosztás összesített eredményét
      visszaosztottPontok: visszaosztottPontok, // Logoljuk a visszaosztott pontok számát
      visszaosztotteEmberek: visszaosztotteEmberek, // Logoljuk az érintett eemberek számát
      hibakDb: visszaosztasHibak.length // Logoljuk a hibák számát
    }); // Visszaosztás összegző log vége


    // 6. LÉPÉS - EREDMÉNY ÖSSZESÍTÉSE
    const eredmeny = { // Összeállítjuk a visszaadandó eredmény objektumot
      siker: true, // Jelezzük, hogy a művelet sikeresen lefutott
      forrasJavaslatDb: javaslatIdLista.length, // Visszaadjuk, hány forrás javaslatot dolgoztunk fel
      tamogatok: { // A támogatók eredmény blokkja
        atkoltoztetettPontok: atkoltoztetettPontok, // Visszaadjuk az átköltöztetett pontok számát
        atkoltoztetetteEmberek: atkoltoztetetteEmberek, // Visszaadjuk az átköltöztetett eemberek számát
        hibak: tamogatoHibak // Visszaadjuk a támogató oldali hibákat
      }, // Támogatói eredmény blokk vége
      ellenzokEsTartozkodok: { // Az ellenzők és tartózkodók eredmény blokkja
        visszaosztottPontok: visszaosztottPontok, // Visszaadjuk a visszaosztott pontok számát
        visszaosztotteEmberek: visszaosztotteEmberek, // Visszaadjuk az érintett eemberek számát
        hibak: visszaosztasHibak // Visszaadjuk a visszaosztási hibákat
      } // Ellenző és tartózkodó blokk vége
    }; // Eredmény objektum vége


    console.log('tudatpontokAtrendezeseJavaslatrolEgyezmenyre - VÉGE', { // Záró log a teljes eredménnyel
      javaslatIdLista: javaslatIdLista, // Logoljuk a feldolgozott forrás javaslat listát
      egyezmenyId: egyezmenyId, // Logoljuk a cél egyezmény azonosítót
      eredmeny: eredmeny // Logoljuk a teljes visszaadandó eredmény objektumot
    }); // Záró log vége


    return eredmeny; // Visszaadjuk az összesített eredményt
  } // A tudatpontokAtrendezeseJavaslatrolEgyezmenyre metódus vége


  // ----- EGYEZMÉNY LEKÉRÉSE -----
  /**
   * Egy egyezmény lekérése ID alapján
   * @param {string} id - Az egyezmény ID-ja
   * @returns {Promise<Object>} Az egyezmény objektum
   * @throws {Error} Ha az egyezmény nem található
   */
  async egyezmenyLekerese(id) {
    // Log: metódus kezdete
    console.log('=========================== egyezmenyLekerese', {
      id: id
    });

    // 1. LÉPÉS - ID VALIDÁLÁS
    if (!id) {
      throw new Error('Az egyezmény ID megadása kötelező');
    }

    // 2. LÉPÉS - REPOSITORY HÍVÁS - EGYEZMÉNY LEKÉRÉSE
    console.log('egyezmenyLekerese >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findById', {
      id: id
    });

    const egyezmeny = await EgyezmenyRepository.findById(id);

    // 3. LÉPÉS - LÉTEZÉS ELLENŐRZÉSE
    if (!egyezmeny) {
      throw new Error('Az egyezmény nem található');
    }

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<<<< egyezmenyLekerese', {
      egyezmeny: egyezmeny
    });

    return egyezmeny;
  }


  // ----- EGYEZMÉNYEK LISTÁZÁSA -----
  /**
   * Egyezmények listázása szűrőkkel
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @param {number} limit - Maximum ennyi egyezmény
   * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
   * @returns {Promise<Array>} Egyezmények tömb
   */
  async egyezmenyekListazasa(szurok = {}, limit = 20, skip = 0) {
    // Log: metódus kezdete
    console.log('============================ egyezmenyekListazasa', {
      szurok: szurok,
      limit: limit,
      skip: skip
    });

    // Repository hívás - egyezmények lekérése szűrőkkel
    console.log('egyezmenyekListazasa >>>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findAll', {
      szurok: szurok,
      limit: limit,
      skip: skip
    });

    const egyezmenyek = await EgyezmenyRepository.findAll(szurok, limit, skip);

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<< egyezmenyekListazasa', {
      egyezmenyek: egyezmenyek
    });

    return egyezmenyek;
  }


  // ----- JAVASLAT EGYEZMÉNYE -----
  /**
   * Egy javaslathoz tartozó egyezmény lekérése
   * @param {string} javaslatId - A javaslat ID-ja
   * @returns {Promise<Object|null>} Az egyezmény objektum vagy null
   */
  async javaslatEgyezmenye(javaslatId) {
    // Log: metódus kezdete
    console.log('========================= javaslatEgyezmenye', {
      javaslatId: javaslatId
    });

    // 1. LÉPÉS - VALIDÁLÁS
    if (!javaslatId) {
      throw new Error('A javaslat ID megadása kötelező');
    }

    // 2. LÉPÉS - REPOSITORY HÍVÁS
    console.log('javaslatEgyezmenye >>>>>>>>>>>>>>>>>>>>>>>>>> EgyezmenyRepository.findByJavaslatId', {
      javaslatId: javaslatId
    });

    const egyezmeny = await EgyezmenyRepository.findByJavaslatId(javaslatId);

    // Log: metódus vége
    console.log('<<<<<<<<<<<<<<<<<<<<<<<<<< javaslatEgyezmenye', {
      egyezmeny: egyezmeny
    });

    return egyezmeny;
  }

}


// =====================================================
// EXPORTÁLÁS
// =====================================================
// Service osztály singleton példány exportálása
module.exports = new EgyezmenyService();