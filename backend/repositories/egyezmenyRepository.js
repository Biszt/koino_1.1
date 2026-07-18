// backend/repositories/egyezmenyRepository.js

// =====================================================
// EGYEZMÉNY MODEL IMPORTÁLÁSA
// =====================================================
const Egyezmeny = require('../models/egyezmeny');

// =====================================================
// EGYEZMÉNY REPOSITORY OSZTÁLY
// =====================================================
// Ez a réteg felelős az egyezmény adatok adatbázis műveleteiért
class EgyezmenyRepository {

  // ----- ÚJ EGYEZMÉNY LÉTREHOZÁSA -----
  /**
   * Új egyezmény mentése az adatbázisba
   * @param {Object} egyezmenyAdatok - Az egyezmény adatai
   * @returns {Promise<Object>} A létrehozott egyezmény objektum
   */
  async create(egyezmenyAdatok) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.create() - KEZDÉS', { egyezmenyAdatok });

    // Új egyezmény példány létrehozása
    const ujEgyezmeny = new Egyezmeny(egyezmenyAdatok);

    // Mentés az adatbázisba
    const mentettEgyezmeny = await ujEgyezmeny.save();

    // Log: metódus vége
    console.log('egyezmenyRepository.create() - VÉGE', { mentettEgyezmeny });

    return mentettEgyezmeny;
  }

  // ----- EGYEZMÉNY KERESÉSE ID ALAPJÁN -----
  /**
   * Egy egyezmény lekérdezése ID alapján
   * @param {string} id - Az egyezmény MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} Az egyezmény objektum vagy null, ha nem található
   */
  async findById(id) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.findById() - KEZDÉS', { id });

    // Egyezmény lekérése kapcsolódó adatokkal (populate)
    const egyezmeny = await Egyezmeny.findById(id)
      .populate('letrehozo', 'eemberNev') // Létrehozó adatok betöltése
      .populate('javaslatId'); // Javaslat adatok betöltése (ha még létezik)

    // Log: metódus vége
    console.log('egyezmenyRepository.findById() - VÉGE', { egyezmeny });

    return egyezmeny;
  }

  // ----- EGYEZMÉNYEK LISTÁZÁSA SZŰRŐKKEL -----
  /**
   * Egyezmények lekérdezése különböző szűrési feltételekkel
   * @param {Object} szurok - Szűrési feltételek objektum
   * @param {string} szurok.javaslatTipus - Szűrés javaslat típus szerint
   * @param {string} szurok.letrehozo - Szűrés létrehozó szerint
   * @param {string} szurok.javaslatId - Szűrés javaslat ID szerint
   * @param {number} limit - Maximum ennyi egyezmény (alapértelmezett: 20)
   * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
   * @returns {Promise<Array>} Egyezmények tömb
   */
  async findAll(szurok = {}, limit = 20, skip = 0) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.findAll() - KEZDÉS', { szurok, limit, skip });

    // MongoDB query objektum építése
    const query = {};

    // Javaslat típus szerinti szűrés
    if (szurok.javaslatTipus) {
      query.javaslatTipus = szurok.javaslatTipus;
    }

    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }

    // Javaslat ID szerinti szűrés
    if (szurok.javaslatId) {
      query.javaslatId = szurok.javaslatId;
    }

    // Egyezmények lekérése kapcsolódó adatokkal
    const egyezmenyek = await Egyezmeny.find(query)
      .sort({ vegrehajtva: -1 }) // Legújabbak előre rendezés
      .limit(limit) // Limit alkalmazása
      .skip(skip) // Skip alkalmazása (lapozás)
      .populate('letrehozo', 'eemberNev') // Létrehozó adatok
      .populate('javaslatId'); // Javaslat adatok (ha még létezik)

    // Log: metódus vége
    console.log('egyezmenyRepository.findAll() - VÉGE', { egyezmenyek: egyezmenyek.length });

    return egyezmenyek;
  }

  // ----- EGYEZMÉNY FRISSÍTÉSE -----
  /**
   * Egy egyezmény módosítása ID alapján
   * @param {string} id - Az egyezmény MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített egyezmény vagy null
   */
  async updateById(id, frissitesek) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.updateById() - KEZDÉS', { id, frissitesek });

    // Egyezmény frissítése és a frissített verzió visszaadása
    const frissitettEgyezmeny = await Egyezmeny.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      {
        new: true, // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true // Mongoose validációk futtatása
      }
    )
    .populate('letrehozo', 'eemberNev')
    .populate('javaslatId');

    // Log: metódus vége
    console.log('egyezmenyRepository.updateById() - VÉGE', { frissitettEgyezmeny });

    return frissitettEgyezmeny;
  }

  // ----- EGYEZMÉNY TÖRLÉSE -----
  /**
   * Egy egyezmény törlése ID alapján
   * @param {string} id - Az egyezmény MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt egyezmény vagy null
   */
  async deleteById(id) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.deleteById() - KEZDÉS', { id });

    // Egyezmény törlése és a törölt dokumentum visszaadása
    const toroltEgyezmeny = await Egyezmeny.findByIdAndDelete(id);

    // Log: metódus vége
    console.log('egyezmenyRepository.deleteById() - VÉGE', { toroltEgyezmeny });

    return toroltEgyezmeny;
  }

  // ----- EGYEZMÉNYEK SZÁMÁNAK LEKÉRDEZÉSE -----
  /**
   * Egyezmények megszámlálása opcionális szűrőkkel
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Egyezmények száma
   */
  async count(szurok = {}) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.count() - KEZDÉS', { szurok });

    // MongoDB query objektum építése (ugyanaz, mint a findAll-nál)
    const query = {};

    if (szurok.javaslatTipus) {
      query.javaslatTipus = szurok.javaslatTipus;
    }

    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }

    if (szurok.javaslatId) {
      query.javaslatId = szurok.javaslatId;
    }

    // Egyezmények megszámlálása
    const darab = await Egyezmeny.countDocuments(query);

    // Log: metódus vége
    console.log('egyezmenyRepository.count() - VÉGE', { darab });

    return darab;
  }

  // ----- JAVASLAT EGYEZMÉNYE -----
  /**
   * Egy javaslathoz tartozó egyezmény keresése
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} Az egyezmény objektum vagy null
   */
  async findByJavaslatId(javaslatId) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.findByJavaslatId() - KEZDÉS', { javaslatId });

    // Egyezmény keresése javaslat ID alapján
    const egyezmeny = await Egyezmeny.findOne({ javaslatId: javaslatId })
      .populate('letrehozo', 'eemberNev')
      .populate('javaslatId');

    // Log: metódus vége
    console.log('egyezmenyRepository.findByJavaslatId() - VÉGE', { egyezmeny });

    return egyezmeny;
  }

  // ----- EMBER EGYEZMÉNYEI -----
  /**
   * Egy eember által létrehozott egyezmények lekérése
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {number} limit - Maximum ennyi egyezmény (opcionális)
   * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
   * @returns {Promise<Array>} Egyezmények tömb
   */
  async findByLetrehozo(eemberId, limit = 20, skip = 0) {
    // Log: metódus kezdete
    console.log('egyezmenyRepository.findByLetrehozo() - KEZDÉS', { eemberId, limit, skip });

    // Query
    const egyezmenyek = await Egyezmeny.find({ letrehozo: eemberId })
      .sort({ vegrehajtva: -1 }) // Legújabbak előre
      .limit(limit)
      .skip(skip)
      .populate('letrehozo', 'eemberNev')
      .populate('javaslatId');

    // Log: metódus vége
    console.log('egyezmenyRepository.findByLetrehozo() - VÉGE', { egyezmenyek: egyezmenyek.length });

    return egyezmenyek;
  }


/**
 * ----- EGYEZMÉNYEK KERESÉSE ÉRINTETT ENTITÁS ALAPJÁN -----
 * Egy adott entitásra vonatkozó egyezmények keresése
 * @param {string} entitasId - Az entitás MongoDB ObjectId-ja
 * @param {string} entitasTipus - Az entitás típusa (Tartalom, Kategoria, stb.)
 * @param {number} limit - Maximum ennyi egyezmény (opcionális)
 * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
 * @returns {Promise<Array>} Egyezmények tömb
 */
async findByErintettEntitas(entitasId, entitasTipus, limit = 20, skip = 0) {
  // Log metódus kezdete
  console.log('egyezmenyRepository.findByErintettEntitas - KEZDÉS', {
    entitasId,
    entitasTipus,
    limit,
    skip
  });

  // Keresés: erintettEntitasok tömb tartalmazza az entitást
  const egyezmenyek = await Egyezmeny.find({
    'erintettEntitasok.entitasId': entitasId,      // Entitás ID egyezés
    'erintettEntitasok.entitasTipus': entitasTipus // Entitás típus egyezés
  })
    .sort({ vegrehajtva: -1 })        // Legújabbak előre
    .limit(limit)                      // Limit alkalmazása
    .skip(skip)                        // Skip alkalmazása (lapozás)
    .populate('letrehozo', 'eemberNev') // Létrehozó adatok
    .populate('javaslatId');           // Javaslat adatok (ha még létezik)

  // Log metódus vége
  console.log('egyezmenyRepository.findByErintettEntitas - VÉGE', {
    egyezmenyek: egyezmenyek.length
  });

  return egyezmenyek;
}

/**
 * ----- EGYEZMÉNY KERESÉSE SZÜLŐ ALAPJÁN -----
 * ÚJ FÜGGVÉNY: Egy tartalom alatti egyezmények lekérése
 * @param {string} szuloId - Szülő tartalom MongoDB ObjectId-ja
 * @param {number} limit - Maximum ennyi egyezmény (alapértelmezett: 20)
 * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
 * @returns {Promise<Array>} Egyezmények tömb
 */
async findBySzuloId(szuloId, limit = 20, skip = 0) {
  // Log metódus kezdete
  console.log('egyezmenyRepository.findBySzuloId - KEZDÉS', { 
    szuloId, 
    limit, 
    skip 
  });
  
  // Egyezmények lekérése kapcsolt adatokkal
  const egyezmenyek = await Egyezmeny.find({ szuloId: szuloId })
    .sort({ vegrehajtva: -1 })                       // Legújabbak előre rendezés
    .limit(limit)                                     // Limit alkalmazása
    .skip(skip)                                       // Skip alkalmazása (lapozás)
    .populate('letrehozo', 'eemberNev')   // Létrehozó adatok
    .populate('javaslatId');                         // Javaslat adatok (ha még létezik)
  
  // Log metódus vége
  console.log('egyezmenyRepository.findBySzuloId - VÉGE', { 
    egyezmenyek: egyezmenyek.length 
  });
  
  return egyezmenyek;
}

/**
 * ----- EGYEZMÉNYEK KERESÉSE ÉRINTETT ENTITÁS ALAPJÁN -----
 * ÚJ FÜGGVÉNY: Egy adott entitásra vonatkozó egyezmények keresése
 * @param {string} entitasId - Az entitás MongoDB ObjectId-ja
 * @param {string} entitasTipus - Az entitás típusa (Tartalom, Kategoria, stb.)
 * @param {number} limit - Maximum ennyi egyezmény (opcionális)
 * @param {number} skip - Ennyi egyezmény kihagyása (lapozás)
 * @returns {Promise<Array>} Egyezmények tömb
 */
async findByErintettEntitas(entitasId, entitasTipus, limit = 20, skip = 0) {
  // Log metódus kezdete
  console.log('egyezmenyRepository.findByErintettEntitas - KEZDÉS', {
    entitasId,
    entitasTipus,
    limit,
    skip
  });

  // Keresés: erintettEntitasok tömb tartalmazza az entitást
  const egyezmenyek = await Egyezmeny.find({
    'erintettEntitasok.entitasId': entitasId,        // Entitás ID egyezés
    'erintettEntitasok.entitasTipus': entitasTipus   // Entitás típus egyezés
  })
    .sort({ vegrehajtva: -1 })                       // Legújabbak előre
    .limit(limit)                                     // Limit alkalmazása
    .skip(skip)                                       // Skip alkalmazása (lapozás)
    .populate('letrehozo', 'eemberNev')   // Létrehozó adatok
    .populate('javaslatId');                         // Javaslat adatok (ha még létezik)

  // Log metódus vége
  console.log('egyezmenyRepository.findByErintettEntitas - VÉGE', {
    egyezmenyek: egyezmenyek.length
  });

  return egyezmenyek;
}

/**
 * ----- EGYEZMÉNY SZÜLŐJÉNEK FRISSÍTÉSE -----
 * ÚJ FÜGGVÉNY: Törlési kaszkádhoz szükséges
 * Egy egyezmény szülőjének módosítása
 * @param {string} egyezmenyId - Egyezmény MongoDB ObjectId-ja
 * @param {string|null} ujSzuloId - Új szülő ObjectId-ja (lehet null)
 * @param {string|null} ujSzuloTipus - Új szülő típusa (lehet null)
 * @returns {Promise<Object|null>} Frissített egyezmény vagy null
 */
async updateSzuloId(egyezmenyId, ujSzuloId, ujSzuloTipus) {
  // Log metódus kezdete
  console.log('egyezmenyRepository.updateSzuloId - KEZDÉS', { 
    egyezmenyId, 
    ujSzuloId, 
    ujSzuloTipus 
  });
  
  // Egyezmény szülőjének frissítése
  const frissitettEgyezmeny = await Egyezmeny.findByIdAndUpdate(
    egyezmenyId,                                     // Keresési feltétel: ID
    { 
      $set: { 
        szuloId: ujSzuloId,                         // Új szülő ID
        szuloTipus: ujSzuloTipus                    // Új szülő típus
      } 
    },
    { new: true }                                   // Frissített dokumentumot ad vissza
  );
  
  // Log metódus vége
  console.log('egyezmenyRepository.updateSzuloId - VÉGE', { 
    frissitettEgyezmeny: !!frissitettEgyezmeny 
  });
  
  return frissitettEgyezmeny;
}


}

// =====================================================
// REPOSITORY EXPORTÁLÁSA
// =====================================================
// Repository exportálása
module.exports = new EgyezmenyRepository();
