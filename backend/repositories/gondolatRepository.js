// backend/repositories/gondolatRepository.js

// ===== GONDOLAT MODEL IMPORTÁLÁSA =====
const Gondolat = require('../models/gondolat');

// ===== GONDOLAT REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a gondolat adatok adatbázis műveleteiért
class GondolatRepository {

  // ----- ÚJ GONDOLAT LÉTREHOZÁSA -----
  // Új gondolat mentése az adatbázisba
  // @param {Object} gondolatAdatok - A gondolat adatai
  // @returns {Promise<Object>} A létrehozott gondolat objektum
  async create(gondolatAdatok) {
    // Új gondolat példány létrehozása
    const ujGondolat = new Gondolat(gondolatAdatok);
    
    // Mentés az adatbázisba
    const mentettGondolat = await ujGondolat.save();
    
    return mentettGondolat;
  }


// ----- GONDOLAT KERESÉSE ID ALAPJÁN -----
// Egy gondolat lekérdezése ID alapján
// FONTOS: szándékosan NEM populate-elünk kategoriaIds-t!
// A pakliService maga kéri le a kategória adatokat külön hívással,
// ezért itt sima ObjectId-kre van szüksége, nem teljes objektumokra.
// @param {string} id - A gondolat MongoDB ObjectId-ja
// @returns {Promise} A gondolat objektum vagy null ha nem található
async findById(id) {
  console.log('gondolatRepository.findById - KEZDÉS', { id });

  // kategoriaIds és gondolatTipusId szándékosan NEM populate-elve
  // a pakliService közvetlenül az ID-kkal dolgozik
  const gondolat = await Gondolat.findById(id)
    .populate('szerkesztok.eemberId', 'eemberNev')           // Létrehozó adatok betöltése
    .populate('szuloId', 'cim gondolatTipusId')   // Szülő gondolat adatok betöltése
    .lean();                                       // Sima JS objektum (nem Mongoose doc)

  console.log('gondolatRepository.findById - VÉGE', { id: gondolat?._id });
  return gondolat;
}

  // ----- GONDOLATOK LISTÁZÁSA SZŰRŐKKEL -----
  // Gondolatok lekérdezése különböző szűrési feltételekkel
  // @param {Object} szurok - Szűrési feltételek objektum
  // @param {string} szurok.gondolatTipusId - Szűrés gondolat típus szerint
  // @param {string} szurok.szuloId - Szűrés szülő gondolat szerint
  // @param {string} szurok.kategoriaId - Szűrés kategória szerint (bármelyik a 3-ból)
  // @param {string} szurok.letrehozo - Szűrés létrehozó szerint
  // @returns {Promise<Array>} Gondolatok tömb
  async findAll(szurok = {}) {
    // MongoDB query objektum építése
    const query = {};
    
    // Gondolat típus szerinti szűrés
    if (szurok.gondolatTipusId) {
      query.gondolatTipusId = szurok.gondolatTipusId;
    }
    
    // Szülő gondolat szerinti szűrés
    // Ha null, akkor főgondolatokat keresünk (nincs szülő)
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
      // Ha van megadott kategória ID, akkor keressük azokat a gondolatokat,
      // ahol a kategoriaIds tömb TARTALMAZZA ezt az ID-t
      query.kategoriaIds = szurok.kategoriaId;
    }
    
    // Szerkesztő szerinti szűrés
    // A `letrehozo` szűrő-kulcs nevét megtartjuk (belső API), de a tömbösített
    // szerkesztok mezőre illesztünk: minden olyan gondolat, aminek EZ az e-ember
    // (bármelyik) szerkesztője.
    if (szurok.letrehozo) {
      query['szerkesztok.eemberId'] = szurok.letrehozo;
    }
    
    // Gondolatok lekérése kapcsolódó adatokkal
    const gondolatok = await Gondolat.find(query)
      .sort({ letrehozva: -1 }) // Legújabbak előre rendezés
      .populate('gondolatTipusId', 'name shapeId') // Gondolat típus adatok
      .populate('szerkesztok.eemberId', 'eemberNev') // Létrehozó adatok
      .populate('kategoriaIds', 'nev szin'); // MÓDOSÍTVA: kategoriaIds tömb (többes szám!)
    
    return gondolatok;
  }

  // ----- GONDOLAT FRISSÍTÉSE -----
  // Egy gondolat módosítása ID alapján
  // @param {string} id - A gondolat MongoDB ObjectId-ja
  // @param {Object} frissitesek - A frissítendő mezők objektum
  // @returns {Promise<Object|null>} A frissített gondolat vagy null
  async updateById(id, frissitesek) {
    // Gondolat frissítése és a frissített verzió visszaadása
    const frissitettGondolat = await Gondolat.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true, // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true // Mongoose validációk futtatása
      }
    )
    .populate('gondolatTipusId', 'name shapeId')
    .populate('szerkesztok.eemberId', 'eemberNev')
    .populate('kategoriaIds', 'nev szin'); // MÓDOSÍTVA: kategoriaIds tömb (többes szám!)
    
    return frissitettGondolat;
  }

  // ----- KÜLÖNVÁLÁS-BEJEGYZÉS HOZZÁADÁSA -----
  // Egy szétválás-esemény felvétele a gondolat `kulonvalasok` tömbjébe.
  // Miért KÜLÖN metódus, és nem az updateById? Mert az updateById `$set`-tel
  // dolgozik, ami FELÜLÍRNÁ a teljes tömböt — itt viszont HOZZÁFŰZNI kell
  // ($push), hogy a korábbi szétválások megmaradjanak (egy gondolat többször is
  // szétválhat, lásd models/kulonvalasResz.js).
  // @param {string} gondolatId - A gondolat MongoDB ObjectId-ja
  // @param {Object} kulonvalasElem - { testverId, testverTipus, agSzerep, forrasJavaslatId, forrasEgyezmenyId }
  // @returns {Promise<Object|null>} A frissített gondolat vagy null
  async kulonvalasHozzaadasa(gondolatId, kulonvalasElem) {
    console.log('gondolatRepository.kulonvalasHozzaadasa - KEZDÉS', {
      gondolatId,
      testverId: kulonvalasElem?.testverId,
      agSzerep: kulonvalasElem?.agSzerep
    });

    const frissitettGondolat = await Gondolat.findByIdAndUpdate(
      gondolatId,
      { $push: { kulonvalasok: kulonvalasElem } },  // HOZZÁFŰZÉS (nem felülírás!)
      {
        new: true,           // A frissített dokumentumot adja vissza
        runValidators: true  // Az al-séma validációi (pl. kötelező agSzerep) fussanak le
      }
    );

    console.log('gondolatRepository.kulonvalasHozzaadasa - VÉGE', {
      gondolatId,
      sikeres: !!frissitettGondolat,
      kulonvalasokSzama: frissitettGondolat?.kulonvalasok?.length ?? 0
    });

    return frissitettGondolat;
  }

  // ----- GONDOLAT TorlesE -----
  // Egy gondolat törlése ID alapján
  // @param {string} id - A gondolat MongoDB ObjectId-ja
  // @returns {Promise<Object|null>} A törölt gondolat vagy null
  async deleteById(id) {
    // Gondolat törlése és a törölt dokumentum visszaadása
    const toroltGondolat = await Gondolat.findByIdAndDelete(id);
    
    return toroltGondolat;
  }

  // ----- GYERMEK GONDOLATOK SZÁMLLÁSA -----
  // Egy gondolat gyermek gondolatainak megszámllása
  // Használat: törlés előtt ellenőrizni, van-e válasz/komment
  // @param {string} szuloId - A szülő gondolat MongoDB ObjectId-ja
  // @returns {Promise<number>} Gyermek gondolatok száma
  async countByParentId(szuloId) {
    // Megszámoljuk hány gondolat hivatkozik erre szülőként
    const gyermekekSzama = await Gondolat.countDocuments({ szuloId: szuloId });
    
    return gyermekekSzama;
  }

  // ----- KATEGÓRIÁT HASZNÁLÓ GONDOLATOK SZÁMLÁLÁSA -----
  // Megszámolja, hány gondolat kategoriaIds tömbje tartalmazza ezt a kategóriát.
  // Használat: a Kategória kártya fejlécén „hány gondolat használja" jelzés.
  // @param {string} kategoriaId - A kategória MongoDB ObjectId-ja
  // @returns {Promise<number>} A kategóriát használó gondolatok száma
  async countByKategoriaId(kategoriaId) {
    console.log('gondolatRepository.countByKategoriaId - KEZDÉS', { kategoriaId });

    // A kategoriaIds tömbre illesztés: a countDocuments a tömböt tartalmazó
    // dokumentumokat is megtalálja, ha a mező egy elemre illeszkedik.
    const szam = await Gondolat.countDocuments({ kategoriaIds: kategoriaId });

    console.log('gondolatRepository.countByKategoriaId - VÉGE', { kategoriaId, szam });
    return szam;
  }

  // ----- GONDOLATTÍPUST HASZNÁLÓ GONDOLATOK SZÁMLÁLÁSA -----
  // Megszámolja, hány gondolatnak ez a gondolatTipusId-ja.
  // Használat: a Gondolattípus kártya fejlécén „hány gondolat használja" jelzés.
  // @param {string} gondolatTipusId - A gondolattípus MongoDB ObjectId-ja
  // @returns {Promise<number>} A gondolattípust használó gondolatok száma
  async countByGondolatTipusId(gondolatTipusId) {
    console.log('gondolatRepository.countByGondolatTipusId - KEZDÉS', { gondolatTipusId });

    const szam = await Gondolat.countDocuments({ gondolatTipusId: gondolatTipusId });

    console.log('gondolatRepository.countByGondolatTipusId - VÉGE', { gondolatTipusId, szam });
    return szam;
  }

  // ----- GYEREKEK LEKÉRÉSE SZÜLŐ ALAPJÁN -----
  // Egy gondolat gyermek gondolatainak lekérése
  // @param {string} szuloId - A szülő gondolat MongoDB ObjectId-ja
  // @returns {Promise<Array>} Gyermek gondolatok tömbje
  async findByParentId(szuloId) {
    // Gondolatok lekérése, ahol a szuloId megegyezik
    const gyerekek = await Gondolat.find({ szuloId: szuloId });
    
    return gyerekek;
  }

  /**
 * ----- GONDOLAT KERESÉSE SZÜLŐ ALAPJÁN -----
 * MÓDOSÍTVA: Opcionális szuloTipus paraméter hozzáadása
 * Egy szülő entitás alatti gondolatok lekérése
 * @param {string} szuloId - Szülő entitás MongoDB ObjectId-ja
 * @param {string|null} szuloTipus - Szülő típusa (opcionális szűrés)
 * @returns {Promise<Array>} Gondolatok tömb
 */
async findBySzuloId(szuloId, szuloTipus = null) {
  // Log metódus kezdete
  console.log('gondolatRepository.findBySzuloId - KEZDÉS', {
    szuloId,
    szuloTipus
  });
  
  // MongoDB query objektum építése
  const query = { szuloId: szuloId };
  
  // Ha megadták a szuloTipus-t, szűrünk rá
  if (szuloTipus) {
    query.szuloTipus = szuloTipus;
  }
  
  // Gondolatok lekérése kapcsolt adatokkal
  const gondolatok = await Gondolat.find(query)
    .populate('szerkesztok.eemberId', 'eemberNev')     // Létrehozó adatok
    .populate('gondolatTipusId')                       // Gondolat típus adatok
    .populate('kategoriaIds')                          // Kategóriák adatai
    .sort({ letrehozva: -1 });                        // Legújabbak előre
  
  // Log metódus vége
  console.log('gondolatRepository.findBySzuloId - VÉGE', { 
    gondolatok: gondolatok.length 
  });
  
  return gondolatok;
}

/**
 * ----- GONDOLAT SZÜLŐJÉNEK FRISSÍTÉSE -----
 * ÚJ FÜGGVÉNY: Törlési kaszkádhoz szükséges
 * Egy gondolat szülőjének módosítása
 * @param {string} gondolatId - Gondolat MongoDB ObjectId-ja
 * @param {string|null} ujSzuloId - Új szülő ObjectId-ja (lehet null)
 * @param {string|null} ujSzuloTipus - Új szülő típusa (lehet null)
 * @returns {Promise<Object|null>} Frissített gondolat vagy null
 */
async updateSzuloId(gondolatId, ujSzuloId, ujSzuloTipus) {
  // Log metódus kezdete
  console.log('gondolatRepository.updateSzuloId - KEZDÉS', { 
    gondolatId, 
    ujSzuloId, 
    ujSzuloTipus 
  });
  
  // Gondolat szülőjének frissítése
  const frissitettGondolat = await Gondolat.findByIdAndUpdate(
    gondolatId,                                        // Keresési feltétel: ID
    { 
      $set: { 
        szuloId: ujSzuloId,                           // Új szülő ID
        szuloTipus: ujSzuloTipus                      // Új szülő típus
      } 
    },
    { new: true }                                     // Frissített dokumentumot ad vissza
  );
  
  // Log metódus vége
  console.log('gondolatRepository.updateSzuloId - VÉGE', { 
    frissitettGondolat: !!frissitettGondolat 
  });
  
  return frissitettGondolat;
}

/**
 * ----- KATEGÓRIA ELTÁVOLÍTÁSA MINDEN GONDOLATBÓL -----
 * ÚJ FÜGGVÉNY: Kategória törléshez szükséges
 * Egy kategóriát eltávolít minden gondolat kategoriaIds tömbjéből
 * @param {string} kategoriaId - Kategória MongoDB ObjectId-ja
 * @returns {Promise<Object>} Törlési eredmény (modifiedCount)
 */
async removeCategoriaFromAll(kategoriaId) {
  // Log metódus kezdete
  console.log('gondolatRepository.removeCategoriaFromAll - KEZDÉS', { 
    kategoriaId 
  });
  
  // Minden gondolatból eltávolítjuk ezt a kategóriát a kategoriaIds tömbből
  const result = await Gondolat.updateMany(
    { kategoriaIds: kategoriaId },                    // Keresési feltétel: tartalmazza a kategóriát
    { $pull: { kategoriaIds: kategoriaId } }          // Pull operátor: eltávolítás tömbből
  );
  
  // Log metódus vége
  console.log('gondolatRepository.removeCategoriaFromAll - VÉGE', { 
    modifiedCount: result.modifiedCount 
  });
  
  return result;
}

/**
 * ----- GONDOLAT TÍPUS ELTÁVOLÍTÁSA MINDEN GONDOLATBÓL -----
 * ÚJ FÜGGVÉNY: GondolatTípus törléshez szükséges
 * Egy gondolat típust null-ra állít minden gondolatnál
 * @param {string} gondolatTipusId - GondolatTípus MongoDB ObjectId-ja
 * @returns {Promise<Object>} Törlési eredmény (modifiedCount)
 */
async removeGondolatTipusFromAll(gondolatTipusId) {
  // Log metódus kezdete
  console.log('gondolatRepository.removeGondolatTipusFromAll - KEZDÉS', { 
    gondolatTipusId 
  });
  
  // Minden gondolatból null-ra állítjuk a gondolatTipusId mezőt
  const result = await Gondolat.updateMany(
    { gondolatTipusId: gondolatTipusId },             // Keresési feltétel
    { $set: { gondolatTipusId: null } }               // Null-ra állítás
  );
  
  // Log metódus vége
  console.log('gondolatRepository.removeGondolatTipusFromAll - VÉGE', { 
    modifiedCount: result.modifiedCount 
  });
  
  return result;
}

  // ----- GONDOLATOK KERESÉSE CÍM ALAPJÁN -----
  // A cím-alapú entitás-kereső backendje (GET /api/kereses).
  // Kis/nagybetű független, részleges egyezés a `cim` mezőn.
  // Csak a keresőnek szükséges könnyű mezőket adja vissza (nincs populate).
  // @param {string} kifejezes - A keresett cím-részlet (regex-biztos, előre escape-elve)
  // @param {number} limit - Maximum ennyi találat
  // @returns {Promise<Array>} [{ _id, cim }]
  async searchByCim(kifejezes, limit = 10) {
    console.log('gondolatRepository.searchByCim - KEZDÉS', { kifejezes, limit });

    const talalatok = await Gondolat.find(
      { cim: { $regex: kifejezes, $options: 'i' } }, // Cím-részlet, kis/nagybetű függetlenül
      { cim: 1 }                                     // Csak a cím (és az _id) kell
    )
      .sort({ letrehozva: -1 }) // Legújabbak előre
      .limit(limit)
      .lean();                  // Sima JS objektum

    console.log('gondolatRepository.searchByCim - VÉGE', { talalatok: talalatok.length });
    return talalatok;
  }

  // ----- ÖSSZES GONDOLAT SZÁMLÁLÁSA -----
  // A platformon lévő összes gondolat számának lekérése
  // Használat: Főoldal statisztika sávhoz
  // @returns {Promise<number>} gondolatok száma
  async countAll() {
    console.log('gondolatRepository.countAll - KEZDÉS');

    // MongoDB countDocuments – szűrés nélkül minden dokumentumot megszámlál
    const szam = await Gondolat.countDocuments();

    console.log('gondolatRepository.countAll - VÉGE', { szam });
    return szam;
  }

}

// Repository exportálása
module.exports = new GondolatRepository();
