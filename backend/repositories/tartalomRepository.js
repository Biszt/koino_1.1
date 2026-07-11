// backend/repositories/tartalomRepository.js

// ===== TARTALOM MODEL IMPORTÁLÁSA =====
const Tartalom = require('../models/tartalom');

// ===== TARTALOM REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a tartalom adatok adatbázis műveleteiért
class TartalomRepository {

  // ----- ÚJ TARTALOM LÉTREHOZÁSA -----
  // Új tartalom mentése az adatbázisba
  // @param {Object} tartalomAdatok - A tartalom adatai
  // @returns {Promise<Object>} A létrehozott tartalom objektum
  async create(tartalomAdatok) {
    // Új tartalom példány létrehozása
    const ujTartalom = new Tartalom(tartalomAdatok);
    
    // Mentés az adatbázisba
    const mentettTartalom = await ujTartalom.save();
    
    return mentettTartalom;
  }


// ----- TARTALOM KERESÉSE ID ALAPJÁN -----
// Egy tartalom lekérdezése ID alapján
// FONTOS: szándékosan NEM populate-elünk kategoriaIds-t!
// A pakliService maga kéri le a kategória adatokat külön hívással,
// ezért itt sima ObjectId-kre van szüksége, nem teljes objektumokra.
// @param {string} id - A tartalom MongoDB ObjectId-ja
// @returns {Promise} A tartalom objektum vagy null ha nem található
async findById(id) {
  console.log('tartalomRepository.findById - KEZDÉS', { id });

  // kategoriaIds és tartalomTipusId szándékosan NEM populate-elve
  // a pakliService közvetlenül az ID-kkal dolgozik
  const tartalom = await Tartalom.findById(id)
    .populate('letrehozo', 'eemberNev')           // Létrehozó adatok betöltése
    .populate('szuloId', 'cim tartalomTipusId')   // Szülő tartalom adatok betöltése
    .lean();                                       // Sima JS objektum (nem Mongoose doc)

  console.log('tartalomRepository.findById - VÉGE', { id: tartalom?._id });
  return tartalom;
}

  // ----- TARTALMAK LISTÁZÁSA SZŰRŐKKEL -----
  // Tartalmak lekérdezése különböző szűrési feltételekkel
  // @param {Object} szurok - Szűrési feltételek objektum
  // @param {string} szurok.tartalomTipusId - Szűrés tartalom típus szerint
  // @param {string} szurok.szuloId - Szűrés szülő tartalom szerint
  // @param {string} szurok.kategoriaId - Szűrés kategória szerint (bármelyik a 3-ból)
  // @param {string} szurok.letrehozo - Szűrés létrehozó szerint
  // @returns {Promise<Array>} Tartalmak tömb
  async findAll(szurok = {}) {
    // MongoDB query objektum építése
    const query = {};
    
    // Tartalom típus szerinti szűrés
    if (szurok.tartalomTipusId) {
      query.tartalomTipusId = szurok.tartalomTipusId;
    }
    
    // Szülő tartalom szerinti szűrés
    // Ha null, akkor főtartalmakat keresünk (nincs szülő)
    if (szurok.szuloId === null) {
      query.szuloId = null;
    } else if (szurok.szuloId) {
      query.szuloId = szurok.szuloId;
    }
    
    // Kategória szerinti szűrés
    // MÓDOSÍTVA: kategoriaIds tömb szűrése - ha a tömb tartalmazza a megadott kategóriát
    if (szurok.kategoriaId === null) {
      // Ha üres tömböt keresünk (nincs kategória)
      query.kategoriaIds = [];
    } else if (szurok.kategoriaId) {
      // Ha van megadott kategória ID, akkor keressük azokat a tartalmakat,
      // ahol a kategoriaIds tömb TARTALMAZZA ezt az ID-t
      query.kategoriaIds = szurok.kategoriaId;
    }
    
    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }
    
    // Tartalmak lekérése kapcsolódó adatokkal
    const tartalmak = await Tartalom.find(query)
      .sort({ letrehozva: -1 }) // Legújabbak előre rendezés
      .populate('tartalomTipusId', 'name shapeId') // Tartalom típus adatok
      .populate('letrehozo', 'eemberNev') // Létrehozó adatok
      .populate('kategoriaIds', 'nev szin'); // MÓDOSÍTVA: kategoriaIds tömb (többes szám!)
    
    return tartalmak;
  }

  // ----- TARTALOM FRISSÍTÉSE -----
  // Egy tartalom módosítása ID alapján
  // @param {string} id - A tartalom MongoDB ObjectId-ja
  // @param {Object} frissitesek - A frissítendő mezők objektum
  // @returns {Promise<Object|null>} A frissített tartalom vagy null
  async updateById(id, frissitesek) {
    // Tartalom frissítése és a frissített verzió visszaadása
    const frissitettTartalom = await Tartalom.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true, // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true // Mongoose validációk futtatása
      }
    )
    .populate('tartalomTipusId', 'name shapeId')
    .populate('letrehozo', 'eemberNev')
    .populate('kategoriaIds', 'nev szin'); // MÓDOSÍTVA: kategoriaIds tömb (többes szám!)
    
    return frissitettTartalom;
  }

  // ----- TARTALOM TorlesE -----
  // Egy tartalom törlése ID alapján
  // @param {string} id - A tartalom MongoDB ObjectId-ja
  // @returns {Promise<Object|null>} A törölt tartalom vagy null
  async deleteById(id) {
    // Tartalom törlése és a törölt dokumentum visszaadása
    const toroltTartalom = await Tartalom.findByIdAndDelete(id);
    
    return toroltTartalom;
  }

  // ----- GYERMEK TARTALMAK SZÁMLLÁSA -----
  // Egy tartalom gyermek tartalmainak megszámllása
  // Használat: törlés előtt ellenőrizni, van-e válasz/komment
  // @param {string} szuloId - A szülő tartalom MongoDB ObjectId-ja
  // @returns {Promise<number>} Gyermek tartalmak száma
  async countByParentId(szuloId) {
    // Megszámoljuk hány tartalom hivatkozik erre szülőként
    const gyermekekSzama = await Tartalom.countDocuments({ szuloId: szuloId });
    
    return gyermekekSzama;
  }

  // ----- KATEGÓRIÁT HASZNÁLÓ TARTALMAK SZÁMLÁLÁSA -----
  // Megszámolja, hány tartalom kategoriaIds tömbje tartalmazza ezt a kategóriát.
  // Használat: a Kategória kártya fejlécén „hány tartalom használja" jelzés.
  // @param {string} kategoriaId - A kategória MongoDB ObjectId-ja
  // @returns {Promise<number>} A kategóriát használó tartalmak száma
  async countByKategoriaId(kategoriaId) {
    console.log('tartalomRepository.countByKategoriaId - KEZDÉS', { kategoriaId });

    // A kategoriaIds tömbre illesztés: a countDocuments a tömböt tartalmazó
    // dokumentumokat is megtalálja, ha a mező egy elemre illeszkedik.
    const szam = await Tartalom.countDocuments({ kategoriaIds: kategoriaId });

    console.log('tartalomRepository.countByKategoriaId - VÉGE', { kategoriaId, szam });
    return szam;
  }

  // ----- TARTALOMTÍPUST HASZNÁLÓ TARTALMAK SZÁMLÁLÁSA -----
  // Megszámolja, hány tartalomnak ez a tartalomTipusId-ja.
  // Használat: a Tartalomtípus kártya fejlécén „hány tartalom használja" jelzés.
  // @param {string} tartalomTipusId - A tartalomtípus MongoDB ObjectId-ja
  // @returns {Promise<number>} A tartalomtípust használó tartalmak száma
  async countByTartalomTipusId(tartalomTipusId) {
    console.log('tartalomRepository.countByTartalomTipusId - KEZDÉS', { tartalomTipusId });

    const szam = await Tartalom.countDocuments({ tartalomTipusId: tartalomTipusId });

    console.log('tartalomRepository.countByTartalomTipusId - VÉGE', { tartalomTipusId, szam });
    return szam;
  }

  // ----- GYEREKEK LEKÉRÉSE SZÜLŐ ALAPJÁN -----
  // Egy tartalom gyermek tartalmainak lekérése
  // @param {string} szuloId - A szülő tartalom MongoDB ObjectId-ja
  // @returns {Promise<Array>} Gyermek tartalmak tömbje
  async findByParentId(szuloId) {
    // Tartalmak lekérése, ahol a szuloId megegyezik
    const gyerekek = await Tartalom.find({ szuloId: szuloId });
    
    return gyerekek;
  }

  /**
 * ----- TARTALOM KERESÉSE SZÜLŐ ALAPJÁN -----
 * MÓDOSÍTVA: Opcionális szuloTipus paraméter hozzáadása
 * Egy szülő entitás alatti tartalmak lekérése
 * @param {string} szuloId - Szülő entitás MongoDB ObjectId-ja
 * @param {string|null} szuloTipus - Szülő típusa (opcionális szűrés)
 * @returns {Promise<Array>} Tartalmak tömb
 */
async findBySzuloId(szuloId, szuloTipus = null) {
  // Log metódus kezdete
  console.log('tartalomRepository.findBySzuloId - KEZDÉS', {
    szuloId,
    szuloTipus
  });
  
  // MongoDB query objektum építése
  const query = { szuloId: szuloId };
  
  // Ha megadták a szuloTipus-t, szűrünk rá
  if (szuloTipus) {
    query.szuloTipus = szuloTipus;
  }
  
  // Tartalmak lekérése kapcsolt adatokkal
  const tartalmak = await Tartalom.find(query)
    .populate('letrehozo', 'eemberNev email')     // Létrehozó adatok
    .populate('tartalomTipusId')                       // Tartalom típus adatok
    .populate('kategoriaIds')                          // Kategóriák adatai
    .sort({ letrehozva: -1 });                        // Legújabbak előre
  
  // Log metódus vége
  console.log('tartalomRepository.findBySzuloId - VÉGE', { 
    tartalmak: tartalmak.length 
  });
  
  return tartalmak;
}

/**
 * ----- TARTALOM SZÜLŐJÉNEK FRISSÍTÉSE -----
 * ÚJ FÜGGVÉNY: Törlési kaszkádhoz szükséges
 * Egy tartalom szülőjének módosítása
 * @param {string} tartalomId - Tartalom MongoDB ObjectId-ja
 * @param {string|null} ujSzuloId - Új szülő ObjectId-ja (lehet null)
 * @param {string|null} ujSzuloTipus - Új szülő típusa (lehet null)
 * @returns {Promise<Object|null>} Frissített tartalom vagy null
 */
async updateSzuloId(tartalomId, ujSzuloId, ujSzuloTipus) {
  // Log metódus kezdete
  console.log('tartalomRepository.updateSzuloId - KEZDÉS', { 
    tartalomId, 
    ujSzuloId, 
    ujSzuloTipus 
  });
  
  // Tartalom szülőjének frissítése
  const frissitettTartalom = await Tartalom.findByIdAndUpdate(
    tartalomId,                                        // Keresési feltétel: ID
    { 
      $set: { 
        szuloId: ujSzuloId,                           // Új szülő ID
        szuloTipus: ujSzuloTipus                      // Új szülő típus
      } 
    },
    { new: true }                                     // Frissített dokumentumot ad vissza
  );
  
  // Log metódus vége
  console.log('tartalomRepository.updateSzuloId - VÉGE', { 
    frissitettTartalom: !!frissitettTartalom 
  });
  
  return frissitettTartalom;
}

/**
 * ----- KATEGÓRIA ELTÁVOLÍTÁSA MINDEN TARTALOMBÓL -----
 * ÚJ FÜGGVÉNY: Kategória törléshez szükséges
 * Egy kategóriát eltávolít minden tartalom kategoriaIds tömbjéből
 * @param {string} kategoriaId - Kategória MongoDB ObjectId-ja
 * @returns {Promise<Object>} Törlési eredmény (modifiedCount)
 */
async removeCategoriaFromAll(kategoriaId) {
  // Log metódus kezdete
  console.log('tartalomRepository.removeCategoriaFromAll - KEZDÉS', { 
    kategoriaId 
  });
  
  // Minden tartalomból eltávolítjuk ezt a kategóriát a kategoriaIds tömbből
  const result = await Tartalom.updateMany(
    { kategoriaIds: kategoriaId },                    // Keresési feltétel: tartalmazza a kategóriát
    { $pull: { kategoriaIds: kategoriaId } }          // Pull operátor: eltávolítás tömbből
  );
  
  // Log metódus vége
  console.log('tartalomRepository.removeCategoriaFromAll - VÉGE', { 
    modifiedCount: result.modifiedCount 
  });
  
  return result;
}

/**
 * ----- TARTALOM TÍPUS ELTÁVOLÍTÁSA MINDEN TARTALOMBÓL -----
 * ÚJ FÜGGVÉNY: TartalomTípus törléshez szükséges
 * Egy tartalom típust null-ra állít minden tartalomnál
 * @param {string} tartalomTipusId - TartalomTípus MongoDB ObjectId-ja
 * @returns {Promise<Object>} Törlési eredmény (modifiedCount)
 */
async removeTartalomTipusFromAll(tartalomTipusId) {
  // Log metódus kezdete
  console.log('tartalomRepository.removeTartalomTipusFromAll - KEZDÉS', { 
    tartalomTipusId 
  });
  
  // Minden tartalomból null-ra állítjuk a tartalomTipusId mezőt
  const result = await Tartalom.updateMany(
    { tartalomTipusId: tartalomTipusId },             // Keresési feltétel
    { $set: { tartalomTipusId: null } }               // Null-ra állítás
  );
  
  // Log metódus vége
  console.log('tartalomRepository.removeTartalomTipusFromAll - VÉGE', { 
    modifiedCount: result.modifiedCount 
  });
  
  return result;
}

  // ----- ÖSSZES TARTALOM SZÁMLÁLÁSA -----
  // A platformon lévő összes tartalom számának lekérése
  // Használat: Főoldal statisztika sávhoz
  // @returns {Promise<number>} tartalmak száma
  async countAll() {
    console.log('tartalomRepository.countAll - KEZDÉS');

    // MongoDB countDocuments – szűrés nélkül minden dokumentumot megszámlál
    const szam = await Tartalom.countDocuments();

    console.log('tartalomRepository.countAll - VÉGE', { szam });
    return szam;
  }

}

// Repository exportálása
module.exports = new TartalomRepository();
