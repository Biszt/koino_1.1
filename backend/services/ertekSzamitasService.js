// backend/services/ertekSzamitasService.js

// ===================================
// REPOSITORY IMPORTÁLÁSA
// ===================================
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
const TartalomErtekHisztogramRepository = require('../repositories/tartalomErtekHisztogramRepository');
const TudatpontRepository = require('../repositories/tudatpontRepository');
const JavaslatRepository = require('../repositories/javaslatRepository');

// Küszöbváltozás-értesítés (V2): ha az érték javaslat mentése után az entitás
// érvényes (medián) küszöbei megváltoztak, a tudatpont-tulajdonosok riasztást kapnak
const ertesitesService = require('./ertesitesService');

// Részvételi szerep aktiválása: az ÉRTÉK JAVASLAT adása döntés-alakító tett →
// a beadót PASSZÍV → AKTÍV-ra billenti az entitáson (bekerül a részvételi arány
// nevezőjébe). Best-effort hívás (lásd lent), a mentést nem ronthatja el.
const tudatpontService = require('./tudatpontService');

// ===================================
// ÉRTÉK SZÁMÍTÁS SERVICE OSZTÁLY
// ===================================
// Ez a réteg tartalmazza a MEDIÁN SZÁMÍTÁSI LOGIKÁT
// Felelősség: hisztogram alapú medián számítás, hisztogram frissítés
// Az érték-rendszer entitás-polimorf: minden művelet (entitasId + entitasTipus)
// párral dolgozik, így tartalomra, kategóriára és tartalomtípusra is működik.
class ErtekJavaslatSzamitasService {

  // ===================================
  // MEDIÁN SZÁMÍTÁS HISZTOGRAMBÓL
  // ===================================

  // ----- MEDIÁN SZÁMÍTÁSA -----
  /**
   * Medián érték kiszámítása egy hisztogramból (egyenletes bucket-ek)
   * @param {Map} hisztogram - kulcs: érték (string), érték: darabszám
   * @param {number} osszesErtekJavaslat - összes érték javaslat
   * @param {number} minErtek - minimum érték (pl. 51)
   * @param {number} maxErtek - maximum érték (pl. 100)
   * @returns {number} A medián érték
   */
  szamitMedian(hisztogram, osszesErtekJavaslat, minErtek, maxErtek) {
    console.log("=== szamitMedian:", { osszesErtekJavaslat, minErtek, maxErtek });

    if (osszesErtekJavaslat === 0) {
      return minErtek;
    }

    if (osszesErtekJavaslat === 1) {
      for (let ertek = minErtek; ertek <= maxErtek; ertek++) {
        const darabszam = hisztogram.get(ertek.toString()) || 0;
        if (darabszam === 1) {
          return ertek;
        }
      }
    }

    const kozepso = osszesErtekJavaslat / 2;
    const paros = (osszesErtekJavaslat % 2) === 0;

    let halmozottOsszeg = 0;
    let elsoKozepsoErtek = null;
    let masodikKozepsoErtek = null;

    for (let ertek = minErtek; ertek <= maxErtek; ertek++) {
      const darabszam = hisztogram.get(ertek.toString()) || 0;
      if (darabszam === 0) continue;

      const elozoHalmozottOsszeg = halmozottOsszeg;
      halmozottOsszeg += darabszam;

      if (!paros) {
        if (elozoHalmozottOsszeg < kozepso && halmozottOsszeg >= kozepso) {
          return ertek;
        }
      } else {
        if (elsoKozepsoErtek === null && halmozottOsszeg >= kozepso) {
          elsoKozepsoErtek = ertek;
        }
        if (masodikKozepsoErtek === null && halmozottOsszeg >= (kozepso + 1)) {
          masodikKozepsoErtek = ertek;
        }
        if (elsoKozepsoErtek !== null && masodikKozepsoErtek !== null) {
          return Math.round((elsoKozepsoErtek + masodikKozepsoErtek) / 2);
        }
      }
    }

    console.warn("szamitMedian - medián nem található, minimum visszaadva:", minErtek);
    return minErtek;
  }

  // ----- IDŐ MEDIÁN SZÁMÍTÁSA -----
  /**
   * Medián érték kiszámítása egy időhisztogramból (nem egyenletes bucket-ek)
   * @param {Map} hisztogram - kulcs: bucket kulcs (string), érték: darabszám
   * @param {number} osszesErtekJavaslat - összes érték javaslat
   * @param {number} defaultErtek - alapérték ha nincs érték javaslat
   * @returns {number} A medián érték másodpercben
   */
  szamitIdoMedian(hisztogram, osszesErtekJavaslat, defaultErtek) {
    console.log("=== szamitIdoMedian:", { osszesErtekJavaslat, defaultErtek });

    if (osszesErtekJavaslat === 0) {
      return defaultErtek;
    }

    const bucketKulcsok = Array.from(hisztogram.keys())
      .map(k => parseInt(k))
      .filter(k => !isNaN(k) && hisztogram.get(k.toString()) > 0)
      .sort((a, b) => a - b);

    if (osszesErtekJavaslat === 1) {
      for (const bucketKulcs of bucketKulcsok) {
        const darabszam = hisztogram.get(bucketKulcs.toString()) || 0;
        if (darabszam === 1) {
          return bucketKulcs;
        }
      }
    }

    const kozepso = osszesErtekJavaslat / 2;
    const paros = (osszesErtekJavaslat % 2) === 0;

    let halmozottOsszeg = 0;
    let elsoKozepsoErtek = null;
    let masodikKozepsoErtek = null;

    for (const bucketKulcs of bucketKulcsok) {
      const darabszam = hisztogram.get(bucketKulcs.toString()) || 0;
      if (darabszam === 0) continue;

      const elozoHalmozottOsszeg = halmozottOsszeg;
      halmozottOsszeg += darabszam;

      if (!paros) {
        if (elozoHalmozottOsszeg < kozepso && halmozottOsszeg >= kozepso) {
          return bucketKulcs;
        }
      } else {
        if (elsoKozepsoErtek === null && halmozottOsszeg >= kozepso) {
          elsoKozepsoErtek = bucketKulcs;
        }
        if (masodikKozepsoErtek === null && halmozottOsszeg >= (kozepso + 1)) {
          masodikKozepsoErtek = bucketKulcs;
        }
        if (elsoKozepsoErtek !== null && masodikKozepsoErtek !== null) {
          return Math.round((elsoKozepsoErtek + masodikKozepsoErtek) / 2);
        }
      }
    }

    console.warn("szamitIdoMedian - medián nem található, alapérték visszaadva:", defaultErtek);
    return defaultErtek;
  }

  // ===================================
  // SEGÉDFÜGGVÉNYEK
  // ===================================

  // ----- IDŐ ÉS BUCKET KULCS KONVERZIÓJA -----
  /**
   * Meghatározza, melyik bucket kulcshoz tartozik egy időérték.
   * @param {number} masodperc - Idő másodpercben (0-315360000)
   * @returns {string} Bucket kulcs
   */
  idoHezBucketKulcs(masodperc) {
    if (masodperc < 0) {
      console.warn("Negatív időérték, 0-ra állítva:", masodperc);
      masodperc = 0;
    }
    if (masodperc <= 60)       return Math.floor(masodperc).toString();
    if (masodperc <= 3600)     return (Math.floor(masodperc / 60) * 60).toString();
    if (masodperc <= 86400)    return (Math.floor(masodperc / 3600) * 3600).toString();
    if (masodperc <= 31536000) return (Math.floor(masodperc / 86400) * 86400).toString();
    if (masodperc <= 315360000) return (Math.floor(masodperc / 31536000) * 31536000).toString();
    console.warn("Túl nagy időérték, 10 évre korlátozva");
    return "315360000";
  }

  // ===================================
  // HISZTOGRAM INICIALIZÁLÁS
  // ===================================

  // ----- HISZTOGRAM LÉTREHOZÁSA ENTITÁSHOZ -----
  /**
   * Új hisztogram létrehozása egy entitáshoz a létrehozó érték javaslatával.
   * Akkor hívódik, amikor egy új entitás (tartalom/kategória/tartalomtípus) jön létre.
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {number} javaslatElfogadasiKuszob - 51-100
   * @param {number} reszveteliAranyKuszob - 0-100
   * @param {number} minimumDontesiIdo - mp (0-31536000)
   * @param {number} maximumDontesiIdo - mp (0-315360000)
   * @returns {Promise<Object>} Létrehozott hisztogram
   */
  async hisztogramLetrehozasa(
    entitasId,
    entitasTipus,
    javaslatElfogadasiKuszob,
    reszveteliAranyKuszob,
    minimumDontesiIdo,
    maximumDontesiIdo
  ) {
    console.log("=== hisztogramLetrehozasa:", { entitasId, entitasTipus });

    // 1. LÉPÉS - Üres hisztogram Map-ek
    const ertekJavaslatElfogadasiMap = new Map();
    const reszveteliAranyMap = new Map();
    const minimumDontesiIdoMap = new Map();
    const maximumDontesiIdoMap = new Map();

    for (let i = 51; i <= 100; i++) ertekJavaslatElfogadasiMap.set(i.toString(), 0);
    for (let i = 0;  i <= 100; i++) reszveteliAranyMap.set(i.toString(), 0);

    // 2. LÉPÉS - Létrehozó érték javaslata (1 eember)
    ertekJavaslatElfogadasiMap.set(javaslatElfogadasiKuszob.toString(), 1);
    reszveteliAranyMap.set(reszveteliAranyKuszob.toString(), 1);
    minimumDontesiIdoMap.set(this.idoHezBucketKulcs(minimumDontesiIdo), 1);
    maximumDontesiIdoMap.set(this.idoHezBucketKulcs(maximumDontesiIdo), 1);

    // 3. LÉPÉS - Mentés
    const hisztogram = await TartalomErtekHisztogramRepository.create({
      entitasId: entitasId,
      entitasTipus: entitasTipus,
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

    console.log("<<< hisztogramLetrehozasa - kész");
    return hisztogram;
  }

  // ===================================
  // HISZTOGRAM FRISSÍTÉS
  // ===================================

  // ----- HISZTOGRAM FRISSÍTÉSE ÉRTÉK JAVASLAT ALAPJÁN -----
  /**
   * Hisztogram frissítése, amikor egy eember érték javaslatot ad vagy módosít.
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {Object|null} regiErtekJavaslat - a eember korábbi javaslata (ha van)
   * @param {Object} ujErtekJavaslat - az új érték javaslat értékei
   * @returns {Promise<Object>} Frissített hisztogram
   */
  async hisztogramFrissitese(entitasId, entitasTipus, regiErtekJavaslat, ujErtekJavaslat) {
    console.log("=== hisztogramFrissitese:", { entitasId, entitasTipus });

    // 1. LÉPÉS - Hisztogram lekérése
    const hisztogram = await TartalomErtekHisztogramRepository.findByEntitas(entitasId, entitasTipus);
    if (!hisztogram) {
      throw new Error('Az entitás hisztogramja nem található');
    }

    // 2. LÉPÉS - Map-ek
    const ertekJavaslatElfogadasiMap = hisztogram.javaslatElfogadasiKuszobHisztogram;
    const reszveteliAranyMap = hisztogram.reszveteliAranyKuszobHisztogram;
    const minimumDontesiIdoMap = hisztogram.minimumDontesiIdoHisztogram;
    const maximumDontesiIdoMap = hisztogram.maximumDontesiIdoHisztogram;

    // 3. LÉPÉS - Régi érték javaslat csökkentése (ha van)
    if (regiErtekJavaslat) {
      const regiElf = ertekJavaslatElfogadasiMap.get(regiErtekJavaslat.javaslatElfogadasiKuszob.toString()) || 0;
      ertekJavaslatElfogadasiMap.set(regiErtekJavaslat.javaslatElfogadasiKuszob.toString(), Math.max(0, regiElf - 1));

      const regiResz = reszveteliAranyMap.get(regiErtekJavaslat.reszveteliAranyKuszob.toString()) || 0;
      reszveteliAranyMap.set(regiErtekJavaslat.reszveteliAranyKuszob.toString(), Math.max(0, regiResz - 1));

      const regiMinB = this.idoHezBucketKulcs(regiErtekJavaslat.minimumDontesiIdo);
      minimumDontesiIdoMap.set(regiMinB, Math.max(0, (minimumDontesiIdoMap.get(regiMinB) || 0) - 1));

      const regiMaxB = this.idoHezBucketKulcs(regiErtekJavaslat.maximumDontesiIdo);
      maximumDontesiIdoMap.set(regiMaxB, Math.max(0, (maximumDontesiIdoMap.get(regiMaxB) || 0) - 1));
    }

    // 4. LÉPÉS - Új érték javaslat növelése
    const ujElf = ertekJavaslatElfogadasiMap.get(ujErtekJavaslat.javaslatElfogadasiKuszob.toString()) || 0;
    ertekJavaslatElfogadasiMap.set(ujErtekJavaslat.javaslatElfogadasiKuszob.toString(), ujElf + 1);

    const ujResz = reszveteliAranyMap.get(ujErtekJavaslat.reszveteliAranyKuszob.toString()) || 0;
    reszveteliAranyMap.set(ujErtekJavaslat.reszveteliAranyKuszob.toString(), ujResz + 1);

    const ujMinB = this.idoHezBucketKulcs(ujErtekJavaslat.minimumDontesiIdo);
    minimumDontesiIdoMap.set(ujMinB, (minimumDontesiIdoMap.get(ujMinB) || 0) + 1);

    const ujMaxB = this.idoHezBucketKulcs(ujErtekJavaslat.maximumDontesiIdo);
    maximumDontesiIdoMap.set(ujMaxB, (maximumDontesiIdoMap.get(ujMaxB) || 0) + 1);

    // 5. LÉPÉS - Összes érték javaslat száma
    let ujOsszesErtekJavaslat = hisztogram.osszesErtekJavaslat;
    if (!regiErtekJavaslat) ujOsszesErtekJavaslat += 1;

    // 6. LÉPÉS - Mediánok újraszámolása
    const ujElfMedian  = this.szamitMedian(ertekJavaslatElfogadasiMap, ujOsszesErtekJavaslat, 51, 100);
    const ujReszMedian = this.szamitMedian(reszveteliAranyMap, ujOsszesErtekJavaslat, 0, 100);
    const ujMinMedian  = this.szamitIdoMedian(minimumDontesiIdoMap, ujOsszesErtekJavaslat, 0);
    const ujMaxMedian  = this.szamitIdoMedian(maximumDontesiIdoMap, ujOsszesErtekJavaslat, 31536000);

    // 7. LÉPÉS - Mentés
    const frissitettHisztogram = await TartalomErtekHisztogramRepository.updateByEntitas(
      entitasId,
      entitasTipus,
      {
        javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
        reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
        minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
        maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
        aktualJavaslatElfogadasiKuszob: ujElfMedian,
        aktualReszveteliAranyKuszob: ujReszMedian,
        aktualMinimumDontesiIdo: ujMinMedian,
        aktualMaximumDontesiIdo: ujMaxMedian,
        osszesErtekJavaslat: ujOsszesErtekJavaslat,
        utolsoFrissites: new Date()
      }
    );

    // 8. LÉPÉS - ÉRINTETT JAVASLATOK MEGJELÖLÉSE ELAVULTKÉNT
    // Az adott entitást érintő aktív javaslatok küszöbértékei elavultak lettek.
    const erintettJavaslatIds = await JavaslatRepository.findByErintettEntitas(
      entitasId,
      entitasTipus,
      'Aktiv'
    );

    if (erintettJavaslatIds.length > 0) {
      await JavaslatRepository.bulkSetErtekekElavultak(erintettJavaslatIds, true);
      console.log('Javaslatok elavultként megjelölve:', erintettJavaslatIds.length);
    }

    console.log("<<< hisztogramFrissitese - kész");
    return frissitettHisztogram;
  }

  // ----- HISZTOGRAM CSÖKKENTÉSE (ÉRTÉK JAVASLAT ELTÁVOLÍTÁSA) -----
  /**
   * Egy érték javaslat KIVONÁSA az entitás hisztogramjából — fiók-törléskor, amikor
   * a törölt e-ember érték-javaslatait eltávolítjuk a MEGMARADÓ entitásokról. Ez a
   * hisztogramFrissitese fordítottja: csak csökkent (nincs új érték), az összes
   * érték-javaslat számát 1-gyel apasztja, újraszámolja a 4 mediánt, és az érintett
   * aktív javaslatokat elavultként jelöli (a küszöbük újraszámítására). Ha az
   * entitásnak már nincs hisztogramja (pl. a pont-visszaosztás láncreakciójában
   * időközben törlődött), csendben kilép — ott már nincs mit frissíteni.
   * @param {string} entitasId
   * @param {string} entitasTipus
   * @param {Object} ertekJavaslat - a kivonandó érték javaslat (a 4 küszöb-mezővel)
   * @returns {Promise<Object|null>} a frissített hisztogram, vagy null ha nincs
   */
  async hisztogramCsokkentese(entitasId, entitasTipus, ertekJavaslat) {
    console.log("=== hisztogramCsokkentese:", { entitasId, entitasTipus });

    const hisztogram = await TartalomErtekHisztogramRepository.findByEntitas(entitasId, entitasTipus);
    if (!hisztogram) {
      console.log("hisztogramCsokkentese - nincs hisztogram (entitás törölve?), kihagyva");
      return null;
    }

    const ertekJavaslatElfogadasiMap = hisztogram.javaslatElfogadasiKuszobHisztogram;
    const reszveteliAranyMap = hisztogram.reszveteliAranyKuszobHisztogram;
    const minimumDontesiIdoMap = hisztogram.minimumDontesiIdoHisztogram;
    const maximumDontesiIdoMap = hisztogram.maximumDontesiIdoHisztogram;

    // Az adott érték javaslat bucket-jeinek csökkentése (0 alá nem megy)
    const elf = ertekJavaslatElfogadasiMap.get(ertekJavaslat.javaslatElfogadasiKuszob.toString()) || 0;
    ertekJavaslatElfogadasiMap.set(ertekJavaslat.javaslatElfogadasiKuszob.toString(), Math.max(0, elf - 1));

    const resz = reszveteliAranyMap.get(ertekJavaslat.reszveteliAranyKuszob.toString()) || 0;
    reszveteliAranyMap.set(ertekJavaslat.reszveteliAranyKuszob.toString(), Math.max(0, resz - 1));

    const minB = this.idoHezBucketKulcs(ertekJavaslat.minimumDontesiIdo);
    minimumDontesiIdoMap.set(minB, Math.max(0, (minimumDontesiIdoMap.get(minB) || 0) - 1));

    const maxB = this.idoHezBucketKulcs(ertekJavaslat.maximumDontesiIdo);
    maximumDontesiIdoMap.set(maxB, Math.max(0, (maximumDontesiIdoMap.get(maxB) || 0) - 1));

    // Összes érték javaslat száma eggyel kevesebb (0 alá nem megy)
    const ujOsszesErtekJavaslat = Math.max(0, hisztogram.osszesErtekJavaslat - 1);

    // Mediánok újraszámolása — ugyanazokkal az alap-/határértékekkel, mint a növelésnél
    const ujElfMedian  = this.szamitMedian(ertekJavaslatElfogadasiMap, ujOsszesErtekJavaslat, 51, 100);
    const ujReszMedian = this.szamitMedian(reszveteliAranyMap, ujOsszesErtekJavaslat, 0, 100);
    const ujMinMedian  = this.szamitIdoMedian(minimumDontesiIdoMap, ujOsszesErtekJavaslat, 0);
    const ujMaxMedian  = this.szamitIdoMedian(maximumDontesiIdoMap, ujOsszesErtekJavaslat, 31536000);

    const frissitettHisztogram = await TartalomErtekHisztogramRepository.updateByEntitas(
      entitasId,
      entitasTipus,
      {
        javaslatElfogadasiKuszobHisztogram: ertekJavaslatElfogadasiMap,
        reszveteliAranyKuszobHisztogram: reszveteliAranyMap,
        minimumDontesiIdoHisztogram: minimumDontesiIdoMap,
        maximumDontesiIdoHisztogram: maximumDontesiIdoMap,
        aktualJavaslatElfogadasiKuszob: ujElfMedian,
        aktualReszveteliAranyKuszob: ujReszMedian,
        aktualMinimumDontesiIdo: ujMinMedian,
        aktualMaximumDontesiIdo: ujMaxMedian,
        osszesErtekJavaslat: ujOsszesErtekJavaslat,
        utolsoFrissites: new Date()
      }
    );

    // Az entitást érintő aktív javaslatok küszöbei elavultak → újraszámításra jelöljük
    const erintettJavaslatIds = await JavaslatRepository.findByErintettEntitas(entitasId, entitasTipus, 'Aktiv');
    if (erintettJavaslatIds.length > 0) {
      await JavaslatRepository.bulkSetErtekekElavultak(erintettJavaslatIds, true);
      console.log('hisztogramCsokkentese - javaslatok elavultként megjelölve:', erintettJavaslatIds.length);
    }

    console.log("<<< hisztogramCsokkentese - kész");
    return frissitettHisztogram;
  }

  // ===================================
  // ÉRTÉK JAVASLAT LÉTREHOZÁS/MÓDOSÍTÁS
  // ===================================

  // ----- EMBERI ÉRTÉK JAVASLAT KEZELÉSE -----
  /**
   * eEmber érték javaslatának létrehozása vagy módosítása.
   * Ellenőrzi, hogy a eembernek van-e legalább 1 tudatpontja az entitáson.
   * @param {string} eemberId - eEmber ID
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {number} javaslatElfogadasiKuszob - 51-100
   * @param {number} reszveteliAranyKuszob - 0-100
   * @param {number} minimumDontesiIdo - mp (0-31536000)
   * @param {number} maximumDontesiIdo - mp (0-315360000)
   * @returns {Promise<Object>} { ertekJavaslat, hisztogram }
   */
  async ertekJavaslatLetrehozasaVagyModositasa(
    eemberId,
    entitasId,
    entitasTipus,
    javaslatElfogadasiKuszob,
    reszveteliAranyKuszob,
    minimumDontesiIdo,
    maximumDontesiIdo
  ) {
    console.log("=== ertekJavaslatLetrehozasaVagyModositasa:", { eemberId, entitasId, entitasTipus });

    // 1. LÉPÉS - TUDATPONT ELLENŐRZÉS (az adott entitáson)
    const hozzarendeles = await TudatpontRepository.findHozzarendelesByeEmberEsEntitas(
      eemberId,
      entitasId,
      entitasTipus
    );

    if (!hozzarendeles || hozzarendeles.tudatPontok < 1) {
      throw new Error('Csak akkor javasolhatsz értékeket, ha legalább 1 tudatpontod van ezen az entitáson');
    }

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
    const regiErtekJavaslat = await ErtekJavaslatRepository.findByeEmberAndEntitas(
      eemberId,
      entitasId,
      entitasTipus
    );

    // 4. LÉPÉS - VAN-E MÁR HISZTOGRAM? + A RÉGI ÉRVÉNYES ÉRTÉKEK RÖGZÍTÉSE
    // Régebbi entitásoknak lehet, hogy még nincs (pl. a rendszer bővítése előtt
    // jöttek létre) – ilyenkor az első érték javaslat HOZZA LÉTRE a hisztogramot.
    // A küszöbváltozás-értesítéshez (V2) ELMENTJÜK a mentés ELŐTTI érvényes
    // értékeket: ha van hisztogram, annak aktuális mediánjait; ha nincs, akkor
    // az alapértelmezett küszöböket (mert eddig azok voltak érvényben — lásd
    // aktulisErtekekLekerese fallback).
    const meglevoHisztogram = await TartalomErtekHisztogramRepository.findByEntitas(entitasId, entitasTipus);
    const hisztogramLetezik = !!meglevoHisztogram;
    const regiErvenyesErtekek = hisztogramLetezik
      ? {
          javaslatElfogadasiKuszob: meglevoHisztogram.aktualJavaslatElfogadasiKuszob,
          reszveteliAranyKuszob:    meglevoHisztogram.aktualReszveteliAranyKuszob,
          minimumDontesiIdo:        meglevoHisztogram.aktualMinimumDontesiIdo,
          maximumDontesiIdo:        meglevoHisztogram.aktualMaximumDontesiIdo,
        }
      : {
          javaslatElfogadasiKuszob: 51,
          reszveteliAranyKuszob:    51,
          minimumDontesiIdo:        0,
          maximumDontesiIdo:        31536000,
        };

    // 5. LÉPÉS - ÉRTÉK JAVASLAT MENTÉSE (eemberenkénti rekord)
    const ertekJavaslat = await ErtekJavaslatRepository.createOrUpdate(
      eemberId,
      entitasId,
      entitasTipus,
      {
        javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: reszveteliAranyKuszob,
        minimumDontesiIdo: minimumDontesiIdo,
        maximumDontesiIdo: maximumDontesiIdo,
        entitasId: entitasId,
        entitasTipus: entitasTipus,
        eemberId: eemberId
      }
    );

    // 5/b. LÉPÉS - RÉSZVÉTELI SZEREP AKTÍVVÁ BILLENTÉSE
    // Az érték javaslat beadása döntés-alakító tett → a beadó aktívvá válik az
    // entitáson (a küszöböt alakítja, tehát a döntésben is részt vesz). A tudatpont
    // meglétét az 1. lépés már ellenőrizte. Best-effort: a szerep-billentés hibája
    // NEM ronthatja el az érték javaslat mentését.
    try {
      await tudatpontService.szerepAktivalasa(eemberId, entitasId, entitasTipus);
    } catch (szerepHiba) {
      console.error('ertekJavaslatLetrehozasaVagyModositasa - szerep-aktiválás HIBA (nem blokkoló):', szerepHiba.message);
    }

    // 6. LÉPÉS - HISZTOGRAM FRISSÍTÉSE VAGY LÉTREHOZÁSA
    let frissitettHisztogram;
    if (hisztogramLetezik) {
      // Van hisztogram → a szokásos frissítés (régi érték kivétele, új beírása, medián újraszámolás)
      frissitettHisztogram = await this.hisztogramFrissitese(
        entitasId,
        entitasTipus,
        regiErtekJavaslat,
        {
          javaslatElfogadasiKuszob: javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: reszveteliAranyKuszob,
          minimumDontesiIdo: minimumDontesiIdo,
          maximumDontesiIdo: maximumDontesiIdo
        }
      );
    } else {
      // Még nincs hisztogram → ez az első érték javaslat, létrehozzuk
      frissitettHisztogram = await this.hisztogramLetrehozasa(
        entitasId,
        entitasTipus,
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo
      );
    }

    // 7. LÉPÉS - KÜSZÖBVÁLTOZÁS-ÉRTESÍTÉS (V2, D4 kötelező elem)
    // A mentés ELŐTTI és UTÁNI érvényes (medián) értékek összevetése — ami
    // változott, arról értesítés megy a NORMÁL értesítés-küldőn keresztül
    // (beállítás-cascade dönti el a címzetteket, mint minden más típusnál —
    // a tulajdonos döntése [2026-07-18]: nincs különleges bánásmód, a típus
    // ugyanúgy beállítható). A beadó (cselekvő) nem kap értesítést.
    // „Jelentős változás" v1-ben: BÁRMILYEN elmozdulás (az értékek egészek,
    // tehát a legkisebb változás is legalább 1 egység); finomítható később.
    // Hiba esetén a mentés NEM bukhat el (try/catch).
    const ujErvenyesErtekek = {
      javaslatElfogadasiKuszob: frissitettHisztogram.aktualJavaslatElfogadasiKuszob,
      reszveteliAranyKuszob:    frissitettHisztogram.aktualReszveteliAranyKuszob,
      minimumDontesiIdo:        frissitettHisztogram.aktualMinimumDontesiIdo,
      maximumDontesiIdo:        frissitettHisztogram.aktualMaximumDontesiIdo,
    };

    const valtozasok = [];
    for (const mezo of Object.keys(ujErvenyesErtekek)) {
      if (regiErvenyesErtekek[mezo] !== ujErvenyesErtekek[mezo]) {
        valtozasok.push({ mezo, regi: regiErvenyesErtekek[mezo], uj: ujErvenyesErtekek[mezo] });
      }
    }

    if (valtozasok.length > 0) {
      try {
        await ertesitesService.ertesitesKuldes(entitasId, entitasTipus, 'kuszobValtozas', { valtozasok }, eemberId);
      } catch (hiba) {
        // Az értesítés best-effort — a hibája nem ronthatja el az érték javaslat mentését
        console.error('ertekJavaslatLetrehozasaVagyModositasa - küszöbváltozás-értesítés HIBA:', hiba.message);
      }
    }

    console.log("<<< ertekJavaslatLetrehozasaVagyModositasa - kész");
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

  // ----- ENTITÁS AKTUÁLIS ÉRTÉKEINEK LEKÉRÉSE -----
  /**
   * Egy entitás aktuális (medián alapú) küszöbértékeinek lekérése
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object>} Aktuális értékek
   */
  async aktulisErtekekLekerese(entitasId, entitasTipus) {
    console.log("=== aktulisErtekekLekerese:", { entitasId, entitasTipus });

    const hisztogram = await TartalomErtekHisztogramRepository.findByEntitas(entitasId, entitasTipus);
    if (!hisztogram) {
      // Nincs még hisztogram az entitáshoz (pl. a rendszer bővítése előtt jött
      // létre, vagy még senki nem javasolt értéket) → az ALAPÉRTELMEZETT
      // küszöbértékeket adjuk vissza, hogy a döntéshozatal (javaslat-időzítés)
      // ne akadjon el. Ugyanezek az értékek, mint egy friss entitásnál.
      console.warn("aktulisErtekekLekerese - nincs hisztogram, alapértékek visszaadva:", { entitasId, entitasTipus });
      return {
        javaslatElfogadasiKuszob: 51,      // támogatottsági küszöb (%)
        reszveteliAranyKuszob:    51,      // részvételi arány küszöb (%)
        aktualMinimumDontesiIdo:  0,       // mp
        aktualMaximumDontesiIdo:  31536000, // 1 év (mp)
        osszesErtekJavaslat:      0,
        utolsoFrissites:          null
      };
    }

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
   * Egy eember érték javaslatának lekérése egy entitáshoz
   * @param {string} eemberId - eEmber ID
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object|null>} Érték javaslat vagy null
   */
  async eemberErtekJavaslatanakLekerese(eemberId, entitasId, entitasTipus) {
    console.log("=== eemberErtekJavaslatanakLekerese:", { eemberId, entitasId, entitasTipus });
    return await ErtekJavaslatRepository.findByeEmberAndEntitas(eemberId, entitasId, entitasTipus);
  }

  // ----- ÉRTÉK JAVASLATOK ELOSZLÁSA -----
  /**
   * Egy entitás érték javaslatainak eloszlása mind a négy küszöbre (nyers értékekből).
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object>} { entitasId, entitasTipus, osszesJavaslat, eloszlasok }
   */
  async ertekEloszlasLekerese(entitasId, entitasTipus) {
    console.log("=== ertekEloszlasLekerese:", { entitasId, entitasTipus });

    const javaslatok = await ErtekJavaslatRepository.findByEntitas(entitasId, entitasTipus);

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
      eloszlasok[mezo] = Array.from(szamlalo.entries())
        .map(([ertek, darab]) => ({ ertek, darab }))
        .sort((a, b) => a.ertek - b.ertek);
    }

    return {
      entitasId,
      entitasTipus,
      osszesJavaslat: javaslatok.length,
      eloszlasok
    };
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new ErtekJavaslatSzamitasService();
