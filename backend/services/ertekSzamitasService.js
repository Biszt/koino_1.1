// backend/services/ertekSzamitasService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const TartalomErtekHisztogramRepository = require('../repositories/tartalomErtekHisztogramRepository');
const TudatpontRepository = require('../repositories/tudatpontRepository');
const JavaslatRepository = require('../repositories/javaslatRepository'); 

// ===================================
// ÉRTÉK SZÁMÍTÁS SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza a MEDIÁN SZÁMÍTÁSI LOGIKÁT
// Felelősség: hisztogram alapú medián számítás, hisztogram frissítés
class ErtekJavaslatSzamitasService {

  // ===================================
  // MEDIÁN SZÁMÍTÁS HISZTOGRAMBÓL
  // ===================================

  // ----- MEDIÁN SZÁMÍTÁSA -----
  /**
   * Medián érték kiszámítása egy hisztogramból
   * A medián a középső érték egy sorba rendezett listában
   * Algoritmus:
   * 1. Bucket-eken végighaladva összegezzük a eemberek számát
   * 2. Amikor elérjük a középső pozíciót (osszesErtekJavaslat / 2), az a medián
   * 3. Ha páros az elemszám, a két középső elem átlaga
   * @param {Map} hisztogram - A hisztogram Map objektum (kulcs: érték, érték: darabszám)
   * @param {number} osszesErtekJavaslat - Összesen hány érték javaslat van
   * @param {number} minErtek - Minimum érték (pl. 51)
   * @param {number} maxErtek - Maximum érték (pl. 100)
   * @returns {number} A medián érték
   */
  szamitMedian(hisztogram, osszesErtekJavaslat, minErtek, maxErtek) {
    console.log("=================================== szamitMedian:", { 
      hisztogram: hisztogram,
      osszesErtekJavaslat: osszesErtekJavaslat, 
      minErtek: minErtek, 
      maxErtek: maxErtek 
    });

    // Ha nincs érték javaslat, visszaadjuk a minimum értéket
    if (osszesErtekJavaslat === 0) {
      console.log("Nincs érték javaslat, visszaadjuk a minimum értéket:", minErtek);
      console.log("<<<<<<<<<<<<<<<<<<<<<<<< szamitMedian", {
        minErtek: minErtek
      });
      
      return minErtek;
    }

    // Ha csak 1 érték érték javaslat van, megkeressük és visszaadjuk
    if (osszesErtekJavaslat === 1) {
      for (let ertek = minErtek; ertek <= maxErtek; ertek++) {
        const darabszam = hisztogram.get(ertek.toString()) || 0;
        if (darabszam === 1) {
          console.log("1 érték javaslat, érték:", ertek);
          console.log("<<<<<<<<<<<<<<<<<<< szamitMedian", {
            ertek: ertek
          });
          
          return ertek;
        }
      }
    }

    // Középső pozíció meghatározása (Pl: 100 éték javaslat → 50. pozíció)
    const kozepso = osszesErtekJavaslat / 2;
    
    // Páros vagy páratlan elemszám
    const paros = (osszesErtekJavaslat % 2) === 0;
    console.log("Középső pozíció:", kozepso, "Páros:", paros);

    // Halmozott összeg (cumulative sum)
    let halmozottOsszeg = 0;
    let elsoKozepsoErtek = null;  // Első középső érték páros esetén
    let masodikKozepsoErtek = null;  // Második középső érték páros esetén

    // Végigmegyünk a bucket-eken (sorba rendezett értékek)
    for (let ertek = minErtek; ertek <= maxErtek; ertek++) {
      const darabszam = hisztogram.get(ertek.toString()) || 0;
      
      // Ha ez a bucket üres, ugorjuk át
      if (darabszam === 0) continue;

      // Az előző halmozott összeg
      const elozoHalmozottOsszeg = halmozottOsszeg;
      
      // Hozzáadjuk az aktuális bucket elemeit
      halmozottOsszeg += darabszam;

      console.log("Érték:", ertek, "Darabszám:", darabszam, "Halmozott:", halmozottOsszeg);

      // PÁRATLAN ELEMSZÁM ESETÉN
      if (!paros) {
        // Ha átléptük a középső pozíciót, ez a medián
        if (elozoHalmozottOsszeg < kozepso && halmozottOsszeg >= kozepso) {
          console.log("Medián (páratlan):", ertek);
          console.log("<<<<<<<<<<<<<<<<<<<<<< szamitMedian", {
            ertek: ertek
          });
          return ertek;
        }
      }
      // PÁROS ELEMSZÁM ESETÉN
      else {
        // Első középső érték megtalálása
        if (elsoKozepsoErtek === null && halmozottOsszeg >= kozepso) {
          elsoKozepsoErtek = ertek;
          console.log("Első középső érték:", elsoKozepsoErtek);
        }
        
        // Második középső érték megtalálása (kozepso + 0.5 pozíció)
        if (masodikKozepsoErtek === null && halmozottOsszeg >= (kozepso + 1)) {
          masodikKozepsoErtek = ertek;
          console.log("Második középső érték:", masodikKozepsoErtek);
        }

        // Ha mindkét középső értéket megtaláltuk, számítsuk az átlagot
        if (elsoKozepsoErtek !== null && masodikKozepsoErtek !== null) {
          const median = (elsoKozepsoErtek + masodikKozepsoErtek) / 2;
          console.log("Medián (páros):", median);
          console.log("<<<<<<<<<<<<<<<<<<<<<< szamitMedian", {
            median: Math.round(median)
          });
          
          return Math.round(median);  // Egész számra kerekítve
        }
      }
    }

    // Ha valami miatt nem találtuk meg a mediánt, visszaadjuk a minimum értéket
    console.warn("<<<<<<<<<<<<<<<<<<<<<<<<<< szamitMedian ====Medián nem található, visszaadjuk a minimum értéket:", minErtek);
    return minErtek;
  }

  // ----- IDŐ MEDIÁN SZÁMÍTÁSA -----
  /**
   * Medián érték kiszámítása egy időhisztogramból (nem egyenletes bucket-ek)
   * A bucket kulcsok az idoHezBucketKulcs() szerint vannak generálva
   * @param {Map} hisztogram - Az időhisztogram Map objektum (kulcs: bucket kulcs string, érték: darabszám)
   * @param {number} osszesErtekJavaslat - Összesen hány érték javaslat van
   * @param {number} defaultErtek - Alapértelmezett érték ha nincs érték javaslat
   * @returns {number} A medián érték másodpercben
   */
  szamitIdoMedian(hisztogram, osszesErtekJavaslat, defaultErtek) {
    console.log("=================================== szamitIdoMedian", { osszesErtekJavaslat, defaultErtek });

    // Ha nincs érték javaslat, visszaadjuk az alapértelmezett értéket
    if (osszesErtekJavaslat === 0) {
      console.log("Nincs értél javaslat, visszaadjuk az alapértelmezett értéket:", defaultErtek);
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< szamitIdoMedian", {
        defaultErtek: defaultErtek
      });
      
      return defaultErtek;
    }

    // Bucket kulcsokat rendezzük számként (növekvő sorrend)
    const bucketKulcsok = Array.from(hisztogram.keys())
      .map(k => parseInt(k))
      .filter(k => !isNaN(k) && hisztogram.get(k.toString()) > 0)
      .sort((a, b) => a - b);

    console.log("Bucket kulcsok (rendezett):", bucketKulcsok);

    // Ha csak 1 érték javaslat van, megkeressük és visszaadjuk
    if (osszesErtekJavaslat === 1) {
      for (const bucketKulcs of bucketKulcsok) {
        const darabszam = hisztogram.get(bucketKulcs.toString()) || 0;
        if (darabszam === 1) {
          console.log("1 érték javaslat, bucket kulcs:", bucketKulcs);
          console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< szamitIdoMedian", {
            bucketKulcs: bucketKulcs
          });
          return bucketKulcs;
        }
      }
    }

    // Középső pozíció meghatározása
    const kozepso = osszesErtekJavaslat / 2;
    const paros = (osszesErtekJavaslat % 2) === 0;

    // Halmozott összeg
    let halmozottOsszeg = 0;
    let elsoKozepsoErtek = null;
    let masodikKozepsoErtek = null;

    // Végigmegyünk a rendezett bucket kulcsokon
    for (const bucketKulcs of bucketKulcsok) {
      const darabszam = hisztogram.get(bucketKulcs.toString()) || 0;
      
      if (darabszam === 0) continue;

      const elozoHalmozottOsszeg = halmozottOsszeg;
      halmozottOsszeg += darabszam;

      console.log("Bucket:", bucketKulcs, "Darabszám:", darabszam, "Halmozott:", halmozottOsszeg);

      // PÁRATLAN ELEMSZÁM ESETÉN
      if (!paros) {
        if (elozoHalmozottOsszeg < kozepso && halmozottOsszeg >= kozepso) {
          console.log("Idő medián (páratlan):", bucketKulcs);
          console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< szamitIdoMedian", {
            bucketKulcs: bucketKulcs
          });
          return bucketKulcs;
        }
      }
      // PÁROS ELEMSZÁM ESETÉN
      else {
        if (elsoKozepsoErtek === null && halmozottOsszeg >= kozepso) {
          elsoKozepsoErtek = bucketKulcs;
          console.log("Első középső időérték:", elsoKozepsoErtek);
        }
        
        if (masodikKozepsoErtek === null && halmozottOsszeg >= (kozepso + 1)) {
          masodikKozepsoErtek = bucketKulcs;
          console.log("Második középső időérték:", masodikKozepsoErtek);
        }

        if (elsoKozepsoErtek !== null && masodikKozepsoErtek !== null) {
          const median = (elsoKozepsoErtek + masodikKozepsoErtek) / 2;
          console.log("Idő medián (páros):", median);
          console.log("<<<<<<<<<<<<<<<<<<<<<<<<<< szamitIdoMedian", {
            median: Math.round(median)
          });
          return Math.round(median);
        }
      }
    }

    // Ha valami miatt nem találtuk meg a mediánt, visszaadjuk az alapértelmezett értéket
    console.warn("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< szamitIdoMedian===Idő medián nem található, visszaadjuk az alapértelmezett értéket:", {
      defaultErtek: defaultErtek
    });
    return defaultErtek;
  }

  // ===================================
  // SEGÉDFÜGGVÉNYEK
  // ===================================

  // ----- IDŐ ÉS BUCKET KULCS KONVERZIÓJA -----
  /**
   * Meghatározza, melyik bucket kulcshoz tartozik egy időérték
   * Bucket rendszer: 515 bucket (0-315360000 mp)
   * - 0-60 mp: 1 mp lépésköz (60 bucket)
   * - 60-3600 mp: 60 mp lépésköz (59 bucket)
   * - 3600-86400 mp: 3600 mp lépésköz (23 bucket)
   * - 86400-31536000 mp: 86400 mp lépésköz (364 bucket)
   * - 31536000-315360000 mp: 31536000 mp lépésköz (9 bucket)
   * @param {number} masodperc - Idő másodpercben (0-315360000)
   * @returns {string} Bucket kulcs
   */
  idoHezBucketKulcs(masodperc) {

    console.log("=================================== idoHezBucketKulcs: ", {
      masodperc: masodperc
    });
    
    // Negatív értékek kezelése
    if (masodperc < 0) {
      console.warn("Negatív időérték érkezett, 0-ra állítva:", masodperc);
      masodperc = 0;
    }

    // 1. TARTOMÁNY: 0-60 mp → 1 mp lépésköz
    if (masodperc <= 60) {
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs", "<= 60");
      
      return Math.floor(masodperc).toString();
    }

    // 2. TARTOMÁNY: 60-3600 mp (1 óra) → 60 mp lépésköz
    if (masodperc <= 3600) {
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs", "60 < ",masodperc," <= 3600");
      return (Math.floor(masodperc / 60) * 60).toString();
    }

    // 3. TARTOMÁNY: 3600-86400 mp (1 nap) → 3600 mp lépésköz
    if (masodperc <= 86400) {
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs", "3600 < ",masodperc,"<= 86400");
      return (Math.floor(masodperc / 3600) * 3600).toString();
    }

    // 4. TARTOMÁNY: 86400-31536000 mp (1 év) → 86400 mp lépésköz
    if (masodperc <= 31536000) {
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs", "86400 < ",masodperc,"<= 31536000");
      return (Math.floor(masodperc / 86400) * 86400).toString();
    }

    // 5. TARTOMÁNY: 31536000-315360000 mp (10 év) → 31536000 mp lépésköz
    if (masodperc <= 315360000) {
      console.log("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs", "31536000 < ",masodperc,"<= 315360000");
      return (Math.floor(masodperc / 31536000) * 31536000).toString();
    }

    // Maximum korlát: 315360000 mp (10 év)
    console.warn("<<<<<<<<<<<<<<<<<<<<<<<<< idoHezBucketKulcs Túl nagy időérték, maximum 10 évre korlátozva:", "315360000");
    return "315360000";
  }

  // ===================================
  // HISZTOGRAM INICIALIZÁLÁS
  // ===================================

  // ----- HISZTOGRAM LÉTREHOZÁSA TARTALOMHOZ -----
  /**
   * Új hisztogram létrehozása egy tartalomhoz a létrehozó érték javaslatával
   * Ez akkor hívódik meg, amikor egy új tartalom jön létre
   * @param {string} tartalomId - Tartalom ID
   * @param {number} javaslatElfogadasiKuszob - Létrehozó által megadott érték (51-100)
   * @param {number} reszveteliAranyKuszob - Létrehozó által megadott érték (0-100)
   * @param {number} minimumDontesiIdo - Létrehozó által megadott érték másodpercben (0-31536000)
   * @param {number} maximumDontesiIdo - Létrehozó által megadott érték másodpercben (0-315360000)
   * @returns {Promise<Object>} Létrehozott hisztogram
   */
  async hisztogramLetrehozasa(
    tartalomId, 
    javaslatElfogadasiKuszob, 
    reszveteliAranyKuszob,
    minimumDontesiIdo,
    maximumDontesiIdo
  ) {
    console.log("=================================== hisztogramLetrehozasa:", { 
      tartalomId, 
      javaslatElfogadasiKuszob, 
      reszveteliAranyKuszob,
      minimumDontesiIdo,
      maximumDontesiIdo
    });

    // 1. LÉPÉS - Üres hisztogram Map-ek létrehozása
    const ertekJavaslatElfogadasiMap = new Map();
    const reszveteliAranyMap = new Map();
    const minimumDontesiIdoMap = new Map();
    const maximumDontesiIdoMap = new Map();

    // Inicializálás 0-val (51-100)
    for (let i = 51; i <= 100; i++) {
      ertekJavaslatElfogadasiMap.set(i.toString(), 0);
    }

    // Inicializálás 0-val (0-100)
    for (let i = 0; i <= 100; i++) {
      reszveteliAranyMap.set(i.toString(), 0);
    }

    // Időhisztogramok üresek maradnak (dinamikus bucket-ek)

    // 2. LÉPÉS - Létrehozó érték javaslatának beállítása (1 eember)
    ertekJavaslatElfogadasiMap.set(javaslatElfogadasiKuszob.toString(), 1);
    reszveteliAranyMap.set(reszveteliAranyKuszob.toString(), 1);
    
    // Időértékek bucket kulcsának meghatározása
    const minIdoBucket = this.idoHezBucketKulcs(minimumDontesiIdo);
    const maxIdoBucket = this.idoHezBucketKulcs(maximumDontesiIdo);
    
    minimumDontesiIdoMap.set(minIdoBucket, 1);
    maximumDontesiIdoMap.set(maxIdoBucket, 1);

    // 3. LÉPÉS - Hisztogram létrehozása az adatbázisban

    console.log("hisztogramLetrehozasa >>>>>>>>>>>>>>>>>>>>>>>>> TartalomErtekHisztogramRepository.create", {
      tartalomId: tartalomId,
      javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
      reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
      minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
      maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
      aktualJavaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
      aktualReszveteliAranyKuszob: reszveteliAranyKuszob,
      aktualMinimumDontesiIdo: minimumDontesiIdo,
      aktualMaximumDontesiIdo: maximumDontesiIdo,
      osszesErtekJavaslat: 1,
      utolsoFrissites: new Date()
    });
    
    const hisztogram = await TartalomErtekHisztogramRepository.create({
      tartalomId: tartalomId,
      javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
      reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
      minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
      maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
      aktualJavaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
      aktualReszveteliAranyKuszob: reszveteliAranyKuszob,
      aktualMinimumDontesiIdo: minimumDontesiIdo,
      aktualMaximumDontesiIdo: maximumDontesiIdo,
      osszesErtekJavaslat: 1,
      utolsoFrissites: new Date()
    });

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<< hisztogramLetrehozasa =====Hisztogram létrehozva:", {
      hisztogram: hisztogram
    });
    return hisztogram;
  }

  // ===================================
  // HISZTOGRAM FRISSÍTÉS
  // ===================================

  // ----- HISZTOGRAM FRISSÍTÉSE ÉRTÉK JAVASLAT ALAPJÁN -----
  /**
   * Hisztogram frissítése amikor egy eember érték javaslatot ad vagy módosít
   * Folyamat:
   * 1. Ha van régi érték javaslat, csökkentjük a régi bucket-eket
   * 2. Növeljük az új bucket-eket
   * 3. Újraszámoljuk a mediánokat
   * 4. Frissítjük a hisztogramot
   * @param {string} tartalomId - Tartalom ID
   * @param {Object|null} regiErtekJavaslat - A eember korábbi érték javaslata (ha van)
   * @param {Object} ujErtekJavaslat - Az új érték javaslat értékei
   * @returns {Promise<Object>} Frissített hisztogram
   */
  async hisztogramFrissitese(tartalomId, regiErtekJavaslat, ujErtekJavaslat) {
    console.log("=================================== hisztogramFrissitese:", { 
      tartalomId, 
      regiErtekJavaslat, 
      ujErtekJavaslat 
    });

    // 1. LÉPÉS - Hisztogram lekérése
    
    console.log("hisztogramFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> TartalomErtekHisztogramRepository.findByTartalom", {
      tartalomId: tartalomId
    });
    const hisztogram = await TartalomErtekHisztogramRepository.findByTartalom(tartalomId);
    if (!hisztogram) {
      throw new Error('A tartalom hisztogramja nem található');
    }

    // 2. LÉPÉS - Map objektumok lekérése
    const ertekJavaslatElfogadasiMap = hisztogram.javaslatElfogadasiKuszobHisztogram;
    const reszveteliAranyMap = hisztogram.reszveteliAranyKuszobHisztogram;
    const minimumDontesiIdoMap = hisztogram.minimumDontesiIdoHisztogram;
    const maximumDontesiIdoMap = hisztogram.maximumDontesiIdoHisztogram;

    // 3. LÉPÉS - Régi érték javaslat csökkentése (ha van)
    if (regiErtekJavaslat) {
      console.log("Régi érték javaslat csökkentése:", regiErtekJavaslat);

      // Javaslat elfogadási küszöb bucket csökkentése
      const regiErtekJavaslatElfogadas = ertekJavaslatElfogadasiMap.get(regiErtekJavaslat.javaslatElfogadasiKuszob.toString()) || 0;
      ertekJavaslatElfogadasiMap.set(
        regiErtekJavaslat.javaslatElfogadasiKuszob.toString(),
        Math.max(0, regiErtekJavaslatElfogadas - 1)
      );

      // Részvételi arány küszöb bucket csökkentése
      const regiReszveteliArany = reszveteliAranyMap.get(regiErtekJavaslat.reszveteliAranyKuszob.toString()) || 0;
      reszveteliAranyMap.set(
        regiErtekJavaslat.reszveteliAranyKuszob.toString(),
        Math.max(0, regiReszveteliArany - 1)
      );

      // Minimum döntési idő bucket csökkentése
      const regiMinIdoBucket = this.idoHezBucketKulcs(regiErtekJavaslat.minimumDontesiIdo);
      const regiMinIdo = minimumDontesiIdoMap.get(regiMinIdoBucket) || 0;
      minimumDontesiIdoMap.set(regiMinIdoBucket, Math.max(0, regiMinIdo - 1));

      // Maximum döntési idő bucket csökkentése
      const regiMaxIdoBucket = this.idoHezBucketKulcs(regiErtekJavaslat.maximumDontesiIdo);
      const regiMaxIdo = maximumDontesiIdoMap.get(regiMaxIdoBucket) || 0;
      maximumDontesiIdoMap.set(regiMaxIdoBucket, Math.max(0, regiMaxIdo - 1));

    }

    // 4. LÉPÉS - Új érték javaslat növelése
    console.log("Új érték javaslat növelése:", ujErtekJavaslat);

    // Érték javaslat elfogadási küszöb bucket növelése
    const ujErtekJavaslatElfogadas = ertekJavaslatElfogadasiMap.get(ujErtekJavaslat.javaslatElfogadasiKuszob.toString()) || 0;
    ertekJavaslatElfogadasiMap.set(
      ujErtekJavaslat.javaslatElfogadasiKuszob.toString(),
      ujErtekJavaslatElfogadas + 1
    );

    // Részvételi arány küszöb bucket növelése
    const ujReszveteliArany = reszveteliAranyMap.get(ujErtekJavaslat.reszveteliAranyKuszob.toString()) || 0;
    reszveteliAranyMap.set(
      ujErtekJavaslat.reszveteliAranyKuszob.toString(),
      ujReszveteliArany + 1
    );

    // Minimum döntési idő bucket növelése
    const ujMinIdoBucket = this.idoHezBucketKulcs(ujErtekJavaslat.minimumDontesiIdo);
    const ujMinIdo = minimumDontesiIdoMap.get(ujMinIdoBucket) || 0;
    minimumDontesiIdoMap.set(ujMinIdoBucket, ujMinIdo + 1);

    // Maximum döntési idő bucket növelése
    const ujMaxIdoBucket = this.idoHezBucketKulcs(ujErtekJavaslat.maximumDontesiIdo);
    const ujMaxIdo = maximumDontesiIdoMap.get(ujMaxIdoBucket) || 0;
    maximumDontesiIdoMap.set(ujMaxIdoBucket, ujMaxIdo + 1);


    // 5. LÉPÉS - Összes érték javaslat számának frissítése
    let ujOsszesErtekJavaslat = hisztogram.osszesErtekJavaslat;
    if (!regiErtekJavaslat) {
      ujOsszesErtekJavaslat += 1;
    }

    // 6. LÉPÉS - Medián újraszámolása
    console.log("Medián újraszámolása...");
    
    const ujErtekJavaslatElfogadasiMedian = this.szamitMedian(
      ertekJavaslatElfogadasiMap,
      ujOsszesErtekJavaslat,
      51,
      100
    );

    const ujReszveteliAranyMedian = this.szamitMedian(
      reszveteliAranyMap,
      ujOsszesErtekJavaslat,
      0,
      100
    );

    const ujMinimumDontesiIdoMedian = this.szamitIdoMedian(
      minimumDontesiIdoMap,
      ujOsszesErtekJavaslat,
      0
    );

    const ujMaximumDontesiIdoMedian = this.szamitIdoMedian(
      maximumDontesiIdoMap,
      ujOsszesErtekJavaslat,
      31536000
    );

    console.log("Új mediánok:", { 
      javaslatElfogadasiKuszob: ujErtekJavaslatElfogadasiMedian, 
      reszveteliAranyKuszob: ujReszveteliAranyMedian,
      minimumDontesiIdo: ujMinimumDontesiIdoMedian,
      maximumDontesiIdo: ujMaximumDontesiIdoMedian
    });

    // 7. LÉPÉS - Hisztogram mentése
    console.log("hisztogramFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> TartalomErtekHisztogramRepository.updateByTartalom", {
      tartalomId: tartalomId,
      javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
        reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
        minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
        maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
        aktualJavaslatElfogadasiKuszob: ujErtekJavaslatElfogadasiMedian,
        aktualReszveteliAranyKuszob: ujReszveteliAranyMedian,
        aktualMinimumDontesiIdo: ujMinimumDontesiIdoMedian,
        aktualMaximumDontesiIdo: ujMaximumDontesiIdoMedian,
        osszesErtekJavaslat: ujOsszesErtekJavaslat,
        utolsoFrissites: new Date()
    });
    const frissitettHisztogram = await TartalomErtekHisztogramRepository.updateByTartalom(
      tartalomId,
      {
        javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
        reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
        minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
        maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
        aktualJavaslatElfogadasiKuszob: ujErtekJavaslatElfogadasiMedian,
        aktualReszveteliAranyKuszob: ujReszveteliAranyMedian,
        aktualMinimumDontesiIdo: ujMinimumDontesiIdoMedian,
        aktualMaximumDontesiIdo: ujMaximumDontesiIdoMedian,
        osszesErtekJavaslat: ujOsszesErtekJavaslat,
        utolsoFrissites: new Date()
      }
    );

    // === 8. LÉPÉS: ÉRINTETT JAVASLATOK MEGJELÖLÉSE ELAVULTKÉNT ===
    // Megkeressük azokat az Aktiv javaslatokat, amelyek ezt a tartalmat tartalmazzák
    console.log('Érintett javaslatok keresése a tartalomhoz:', tartalomId);
    
    console.log("hisztogramFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.findByErintettEntitas", {
      tartalomId: tartalomId,
      Tartalom: 'Tartalom',
      Aktiv: 'Aktiv'
    });
    
    const erintettJavaslatIds = await JavaslatRepository.findByErintettEntitas(
      tartalomId,
      'Tartalom',
      'Aktiv'
    );

    console.log('Érintett javaslatok száma:', erintettJavaslatIds.length);

    // Ha vannak érintett javaslatok, megjelöljük őket elavultként
    if (erintettJavaslatIds.length > 0) {

      console.log("hisztogramFrissitese >>>>>>>>>>>>>>>>>>>>>>>>> JavaslatRepository.bulkSetErtekekElavultak", {
        erintettJavaslatIds: erintettJavaslatIds,
      },
        'true'
    );
      await JavaslatRepository.bulkSetErtekekElavultak(erintettJavaslatIds, true);
      console.log('Javaslatok megjelölve elavultként:', erintettJavaslatIds);
    }
    
    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< hisztogramFrissitese===Hisztogram frissítve:", {
      frissitettHisztogram: frissitettHisztogram
    });
    return frissitettHisztogram;
  }

  // ===================================
  // ÉRTÉK JAVASLAT LÉTREHOZÁS/MÓDOSÍTÁS
  // ===================================

  // ----- EMBERI ÉRTÉK JAVASLAT KEZELÉSE -----
  /**
   * eEmber érték javaslatának létrehozása vagy módosítása
   * Ellenőrzi, hogy a eembernak van-e legalább 1 tudatpontja a tartalmon
   * @param {string} eemberId - eEmber ID
   * @param {string} tartalomId - Tartalom ID
   * @param {number} javaslatElfogadasiKuszob - Javasolt érték (51-100)
   * @param {number} reszveteliAranyKuszob - Javasolt érték (0-100)
   * @param {number} minimumDontesiIdo - Javasolt alsó határ másodpercben (0-31536000)
   * @param {number} maximumDontesiIdo - Javasolt felső határ másodpercben (0-315360000)
   * @returns {Promise<Object>} { érték javaslat, hisztogram }
   */
  async ertekJavaslatLetrehozasaVagyModositasa(
    eemberId, 
    tartalomId, 
    javaslatElfogadasiKuszob, 
    reszveteliAranyKuszob,
    minimumDontesiIdo,
    maximumDontesiIdo
  ) {
    console.log("=================================== ertekJavaslatLetrehozasaVagyModositasa:", { 
      eemberId, 
      tartalomId, 
      javaslatElfogadasiKuszob, 
      reszveteliAranyKuszob,
      minimumDontesiIdo,
      maximumDontesiIdo
    });

    // 1. LÉPÉS - TUDATPONT ELLENŐRZÉS

    console.log("ertekJavaslatLetrehozasaVagyModositasa >>>>>>>>>>>>>>>>>>>>>>> TudatpontRepository.findHozzarendelesByeEmberEsEntitas", {
      eemberId: eemberId,
      tartalomId: tartalomId,
      tipus: 'Tartalom'
    });
    
    const hozzarendeles = await TudatpontRepository.findHozzarendelesByeEmberEsEntitas(
      eemberId,
      tartalomId,
      'Tartalom'
    );

    if (!hozzarendeles || hozzarendeles.tudatPontok < 1) {
      throw new Error('Csak akkor javasolhatsz értékeket, ha legalább 1 tudatpontod van ezen a tartalmon');
    }

    console.log("Tudatpont ellenőrzés OK:", hozzarendeles.tudatPontok, "tudatpont");

    // 2. LÉPÉS - VALIDÁCIÓ
    if (javaslatElfogadasiKuszob < 51 || javaslatElfogadasiKuszob > 100) {
      throw new Error('A érték javaslat elfogadási küszöb 51 és 100 között kell legyen');
    }

    if (reszveteliAranyKuszob < 0 || reszveteliAranyKuszob > 100) {
      throw new Error('A részvételi arány küszöb 0 és 100 között kell legyen');
    }

    if (minimumDontesiIdo < 0) {
      throw new Error('A minimum döntési idő nem lehet negatív');
    }

    if (maximumDontesiIdo < 0 || maximumDontesiIdo > 315360000) {
      throw new Error('A maximum döntési idő 0 és 315360000 között kell legyen');
    }


    if (!Number.isInteger(javaslatElfogadasiKuszob) || !Number.isInteger(reszveteliAranyKuszob) ||
        !Number.isInteger(minimumDontesiIdo) || !Number.isInteger(maximumDontesiIdo)) {
      throw new Error('Az értékeknek egész számoknak kell lenniük');
    }

    // 3. LÉPÉS - RÉGI ÉRTÉK JAVASLAT KERESÉSE

    console.log("ertekJavaslatLetrehozasaVagyModositasa >>>>>>>>>>>>>>>>>>>>>>> ErtekJavaslatRepository.findByeEmberAndTartalom", {
      eemberId: eemberId,
      tartalomId: tartalomId
    });
    const regiErtekJavaslat = await ErtekJavaslatRepository.findByeEmberAndTartalom(
      eemberId,
      tartalomId
    );
    console.log("Régi érték javaslat:", regiErtekJavaslat ? "van" : "nincs");

    // 4. LÉPÉS - ÉRTÉK JAVASLAT MENTÉSE

    console.log("ertekJavaslatLetrehozasaVagyModositasa >>>>>>>>>>>>>>>>>>>>>>> ErtekJavaslatRepository.createOrUpdate", {
      eemberId: eemberId,
      tartalomId: tartalomId
    });
    const ertekJavaslat = await ErtekJavaslatRepository.createOrUpdate(
      eemberId,
      tartalomId,
      {
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo,
        tartalomId: tartalomId,
        eemberId: eemberId
      }
    );
    console.log("Érték javaslat mentve:", ertekJavaslat.id);

    // 5. LÉPÉS - HISZTOGRAM FRISSÍTÉSE

    console.log("ertekJavaslatLetrehozasaVagyModositasa >>>>>>>>>>>>>>>>>>>>>>> this.hisztogramFrissitese",);
    const frissitettHisztogram = await this.hisztogramFrissitese(
      tartalomId,
      regiErtekJavaslat,
      {
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo
      }
    );

    // 6. LÉPÉS - EREDMÉNY VISSZAADÁSA

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< ertekJavaslatLetrehozasaVagyModositasa===Erededmény: ", {
      ertekJavaslat: ertekJavaslat,
      hisztogram: {
        aktualJavaslatElfogadasiKuszob: frissitettHisztogram.aktualJavaslatElfogadasiKuszob,
        aktualReszveteliAranyKuszob: frissitettHisztogram.aktualReszveteliAranyKuszob,
        aktualMinimumDontesiIdo: frissitettHisztogram.aktualMinimumDontesiIdo,
        aktualMaximumDontesiIdo: frissitettHisztogram.aktualMaximumDontesiIdo,
        osszesErtekJavaslat: frissitettHisztogram.osszesErtekJavaslat
      }
    });
    
    return {
      ertekJavaslat: ertekJavaslat,
      hisztogram: {
        aktualJavaslatElfogadasiKuszob: frissitettHisztogram.aktualJavaslatElfogadasiKuszob,
        aktualReszveteliAranyKuszob: frissitettHisztogram.aktualReszveteliAranyKuszob,
        aktualMinimumDontesiIdo: frissitettHisztogram.aktualMinimumDontesiIdo,
        aktualMaximumDontesiIdo: frissitettHisztogram.aktualMaximumDontesiIdo,
        osszesErtekJavaslat: frissitettHisztogram.osszesErtekJavaslat
      }
    };
  }

  // ===================================
  // LEKÉRDEZÉSEK
  // ===================================

  // ----- TARTALOM AKTUÁLIS ÉRTÉKEINEK LEKÉRÉSE -----
  /**
   * Egy tartalom aktuális (medián alapú) küszöbértékeinek lekérése
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object>} Aktuális értékek
   */
  async aktulisErtekekLekerese(tartalomId) {
    console.log("=================================== aktulisErtekekLekerese:", {
      tartalomId: tartalomId
    });
    

    console.log("aktulisErtekekLekerese >>>>>>>>>>>>>>>>>>>>>>>>>> TartalomErtekHisztogramRepository.findByTartalom", {
      tartalomId: tartalomId
    });
    
    const hisztogram = await TartalomErtekHisztogramRepository.findByTartalom(tartalomId);
    if (!hisztogram) {
      throw new Error('A tartalom hisztogramja nem található');
    }

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< aktulisErtekekLekerese===Eredmény: ", {
      javaslatElfogadasiKuszob: hisztogram.aktualJavaslatElfogadasiKuszob,
      reszveteliAranyKuszob: hisztogram.aktualReszveteliAranyKuszob,
      aktualMinimumDontesiIdo: hisztogram.aktualMinimumDontesiIdo,
      aktualMaximumDontesiIdo: hisztogram.aktualMaximumDontesiIdo,
      osszesErtekJavaslat: hisztogram.osszesErtekJavaslat,
      utolsoFrissites: hisztogram.utolsoFrissites
    });
    

    return {
      javaslatElfogadasiKuszob: hisztogram.aktualJavaslatElfogadasiKuszob,
      reszveteliAranyKuszob: hisztogram.aktualReszveteliAranyKuszob,
      aktualMinimumDontesiIdo: hisztogram.aktualMinimumDontesiIdo,
      aktualMaximumDontesiIdo: hisztogram.aktualMaximumDontesiIdo,
      osszesErtekJavaslat: hisztogram.osszesErtekJavaslat,
      utolsoFrissites: hisztogram.utolsoFrissites
    };
  }

  // ----- EMBER ÉRTÉK JAVASLATÁNAK LEKÉRÉSE -----
  /**
   * Egy eember érték javaslatának lekérése egy tartalomhoz
   * @param {string} eemberId - eEmber ID
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Érték javaslat vagy null
   */
  async eemberErtekJavaslatanakLekerese(eemberId, tartalomId) {
    console.log("=================================== eemberErtekJavaslatanakLekerese:", { eemberId, tartalomId });
    
    console.log("eemberErtekJavaslatanakLekerese >>>>>>>>>>>>>>>>>>>>>>> ErtekJavaslatRepository.findByeEmberAndTartalom", {
      eemberId: eemberId,
      tartalomId: tartalomId
    });
    
    const ertekJavaslat = await ErtekJavaslatRepository.findByeEmberAndTartalom(
      eemberId,
      tartalomId
    );

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< eemberErtekJavaslatanakLekerese====Erdmény:", {
      ertekJavaslat: ertekJavaslat
    });
    

    return ertekJavaslat;
  }

  // ----- ÉRTÉK JAVASLATOK ELOSZLÁSA -----
  /**
   * Egy tartalom érték javaslatainak eloszlása mind a négy küszöbre.
   * A NYERS javaslatokból számol (egzakt értékek), nem a bucketelt hisztogramból,
   * így a döntési idők is pontos másodperc-értékként jelennek meg.
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object>} { tartalomId, osszesJavaslat, eloszlasok: { mezo: [{ertek, darab}] } }
   */
  async ertekEloszlasLekerese(tartalomId) {
    console.log("=================================== ertekEloszlasLekerese:", { tartalomId });

    // 1. LÉPÉS - Az összes érték javaslat lekérése a tartalomhoz
    const javaslatok = await ErtekJavaslatRepository.findByTartalom(tartalomId);

    // 2. LÉPÉS - Eloszlás számolása mind a négy mezőre (érték → darabszám)
    const mezok = [
      'javaslatElfogadasiKuszob',
      'reszveteliAranyKuszob',
      'minimumDontesiIdo',
      'maximumDontesiIdo'
    ];

    const eloszlasok = {};
    for (const mezo of mezok) {
      const szamlalo = new Map();
      for (const javaslat of javaslatok) {
        const ertek = javaslat[mezo];
        if (ertek === undefined || ertek === null) continue;
        szamlalo.set(ertek, (szamlalo.get(ertek) ?? 0) + 1);
      }
      // Érték szerint növekvő sorrendbe rendezett tömb
      eloszlasok[mezo] = Array.from(szamlalo.entries())
        .map(([ertek, darab]) => ({ ertek, darab }))
        .sort((a, b) => a.ertek - b.ertek);
    }

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< ertekEloszlasLekerese", {
      osszesJavaslat: javaslatok.length
    });

    return {
      tartalomId,
      osszesJavaslat: javaslatok.length,
      eloszlasok
    };
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály SINGLETON példány exportálása
module.exports = new ErtekJavaslatSzamitasService();
