// backend/repositories/tudatpontRepository.js

// ===== MODELLEK IMPORTÁLÁSA =====
const TudatpontAllokacio = require('../models/tudatpontAllokacio');
const TudatpontHozzarendeles = require('../models/tudatpontHozzarendeles');
const Ember = require('../models/ember');

// ===== TUDATPONT REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a tudatpont adatok adatbázis műveleteiért
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class TudatpontRepository {

  // ============================================================
  // ALLOKÁCIÓ MŰVELETEK
  // ============================================================

  // ----- ALLOKÁCIÓ KERESÉSE ENTITÁS ALAPJÁN -----
  // Egy entitáshoz tartozó allokáció lekérdezése
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object|null>} Az allokáció objektum vagy null
  async findAllokaciByEntitas(entitasId, entitasTipus) {
    // MongoDB findOne művelet - entitás alapján keresés
    const allokacio = await TudatpontAllokacio.findOne({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    return allokacio;
  }

  // ----- ÚJ ALLOKÁCIÓ LÉTREHOZÁSA -----
  // Új tudatpont allokáció mentése az adatbázisba
  // @param {Object} allokaciAdatok - Az allokáció adatai
  // @returns {Promise<Object>} A létrehozott allokáció objektum
  async createAllokacio(allokaciAdatok) {
    // Új allokáció példány létrehozása
    const ujAllokacio = new TudatpontAllokacio(allokaciAdatok);
    
    // Mentés az adatbázisba - MongoDB insert művelet
    const mentettAllokacio = await ujAllokacio.save();
    
    return mentettAllokacio;
  }

  // ----- ALLOKÁCIÓ FRISSÍTÉSE ID ALAPJÁN -----
  // Egy allokáció módosítása MongoDB _id alapján
  // @param {string} allokaciId - Az allokáció MongoDB ObjectId-ja
  // @param {Object} frissitesek - A frissítendő mezők objektum
  // @returns {Promise<Object|null>} A frissített allokáció vagy null
  async updateAllokaciById(allokaciId, frissitesek) {
    // Allokáció frissítése és a frissített verzió visszaadása
    const frissitettAllokacio = await TudatpontAllokacio.findByIdAndUpdate(
      allokaciId,                              // Az allokáció ID-ja
      { $set: frissitesek },                   // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true,                             // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true                    // Mongoose validációk futtatása
      }
    );
    
    return frissitettAllokacio;
  }

  // ----- ALLOKÁCIÓ FRISSÍTÉSE ENTITÁS ALAPJÁN -----
  // Egy allokáció módosítása entitás azonosítók alapján
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @param {Object} frissitesek - A frissítendő mezők objektum
  // @returns {Promise<Object|null>} A frissített allokáció vagy null
  async updateAllokaciByEntitas(entitasId, entitasTipus, frissitesek) {
    // Allokáció frissítése és a frissített verzió visszaadása
    const frissitettAllokacio = await TudatpontAllokacio.findOneAndUpdate(
      { entitasId: entitasId, entitasTipus: entitasTipus },  // Keresési feltétel
      { $set: frissitesek },                                  // $set operátor
      { 
        new: true,                                            // Frissített dokumentumot ad vissza
        runValidators: true                                   // Mongoose validációk futtatása
      }
    );
    
    return frissitettAllokacio;
  }

  // ----- ALLOKÁCIÓ INKREMENTÁLÁSA -----
  // Allokáció mezőinek növelése/csökkentése atomi művelettel
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @param {Object} inkremensek - Növelendő mezők és értékek (pl. {osszesPont: 50})
  // @returns {Promise<Object|null>} A frissített allokáció vagy null
  async incrementAllokacio(entitasId, entitasTipus, inkremensek) {
    // MongoDB $inc operátor - atomi inkrementálás (thread-safe)
    const frissitettAllokacio = await TudatpontAllokacio.findOneAndUpdate(
      { entitasId: entitasId, entitasTipus: entitasTipus },  // Keresési feltétel
      { 
        $inc: inkremensek,                                   // $inc operátor - hozzáad számértéket
        $set: { frissitve: Date.now() }                      // Frissítési dátum beállítása
      },
      { 
        new: true,                                           // Frissített dokumentumot ad vissza
        upsert: true                                         // Ha nem létezik, létrehozza
      }
    );
    
    return frissitettAllokacio;
  }

  // ----- ALLOKÁCIÓ TÖRLÉSE -----
  // Egy allokáció törlése entitás alapján
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object|null>} A törölt allokáció vagy null
  async deleteAllokaciByEntitas(entitasId, entitasTipus) {
    // Allokáció törlése és a törölt dokumentum visszaadása
    const toroltAllokacio = await TudatpontAllokacio.findOneAndDelete({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    return toroltAllokacio;
  }

  // ============================================================
  // HOZZÁRENDELÉS MŰVELETEK
  // ============================================================

  // ----- HOZZÁRENDELÉS KERESÉSE -----
  // Egy ember hozzárendelésének keresése egy entitáson
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object|null>} A hozzárendelés objektum vagy null
  async findHozzarendelesByEmberEsEntitas(emberId, entitasId, entitasTipus) {
    // MongoDB findOne művelet - compound keresés
    const hozzarendeles = await TudatpontHozzarendeles.findOne({
      emberId: emberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    return hozzarendeles;
  }

  // ----- HOZZÁRENDELÉS LÉTREHOZÁSA VAGY FRISSÍTÉSE -----
  // Upsert művelet - ha létezik frissíti, ha nem létrehozza
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @param {number} tudatPontok - A hozzárendelendő tudatpontok száma
  // @returns {Promise<Object>} A létrehozott/frissített hozzárendelés
  async upsertHozzarendeles(emberId, entitasId, entitasTipus, tudatPontok) {
    // MongoDB findOneAndUpdate upsert móddal
    const hozzarendeles = await TudatpontHozzarendeles.findOneAndUpdate(
      { 
        emberId: emberId,
        entitasId: entitasId,
        entitasTipus: entitasTipus
      },
      { 
        $set: { 
          tudatPontok: tudatPontok,                        // Tudatpontok beállítása
          frissitve: Date.now()                            // Frissítési dátum
        }
      },
      { 
        new: true,                                         // Frissített dokumentumot ad vissza
        upsert: true,                                      // Ha nem létezik, létrehozza
        runValidators: true                                // Mongoose validációk futtatása
      }
    );
    
    return hozzarendeles;
  }

  // ----- EMBER HOZZÁRENDELÉSEINEK LEKÉRÉSE -----
  // Egy ember összes hozzárendelésének lekérdezése
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {number} limit - Maximum ennyi hozzárendelés (alapértelmezett: 50)
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @returns {Promise<Array>} Hozzárendelések tömbje
  async findHozzarendelesekByEmber(emberId, limit = 50, skip = 0) {
    // Hozzárendelések lekérése csökkenő időrend szerint (legfrissebb előre)
    const hozzarendelesek = await TudatpontHozzarendeles.find({
      emberId: emberId
    })
    .sort({ frissitve: -1 })                               // Csökkenő időrend
    .limit(limit)                                          // Maximum ennyi rekord
    .skip(skip);                                           // Ennyi rekord kihagyása (lapozás)
    
    return hozzarendelesek;
  }

  // ----- AKTÍV HOZZÁRENDELÉSEK LEKÉRÉSE EMBERHOZ -----
  // Csak azok a hozzárendelések, ahol tudatPontok > 0
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {number} limit - Maximum ennyi hozzárendelés
  // @param {number} skip - Ennyi hozzárendelés kihagyása (lapozás)
  // @returns {Promise<Array>} Aktív hozzárendelések tömbje
  async findAktivHozzarendelesekByEmber(emberId, limit = 50, skip = 0) {
    // Hozzárendelések lekérése szűréssel: csak ahol tudatPontok > 0
    const hozzarendelesek = await TudatpontHozzarendeles.find({
      emberId: emberId,
      tudatPontok: { $gt: 0 }                              // Greater than 0
    })
    .sort({ frissitve: -1 })                               // Csökkenő időrend
    .limit(limit)                                          // Maximum ennyi rekord
    .skip(skip);                                           // Lapozás
    
    return hozzarendelesek;
  }

    // ===== TUDATPONT HOZZÁRENDELÉSEK LEKÉRDEZÉSE =====

  // ----- HOZZÁRENDELÉSEK LEKÉRÉSE ENTITÁSHOZ (POPULATE-TAL) -----
  // Entitáshoz tartozó tudatpont hozzárendelések lekérése
  // ✅ POPULATE-TAL - embernevek betöltése (frontend megjelenítéshez)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa (Tartalom, Kategoria, TartalomTipus, Javaslat)
  // @param {number} limit - Maximum ennyi dokumentumot ad vissza
  // @param {number} skip - Ennyi dokumentumot ugorjon át (lapozáshoz)
  // @returns {Promise<Array>} Hozzárendelések listája (embernevekkel)
  async findHozzarendelesekByEntitas(entitasId, entitasTipus, limit = 100, skip = 0) {
    // Hozzárendelések lekérése tudatpontok szerint csökkenő sorrendben
    const hozzarendelesek = await TudatpontHozzarendeles.find({
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      tudatPontok: { $gt: 0 }                              // Csak aktív hozzárendelések (0-nál több pont)
    })
    .sort({ tudatPontok: -1 })                             // Legtöbb pont először
    .limit(limit)                                          // Maximum ennyi dokumentum
    .skip(skip)                                            // Lapozás (ennyi dokumentumot ugrik át)
    .populate('emberId', 'emberNev');          // ✅ Embernév betöltése (frontend számára)
    
    return hozzarendelesek;
  }

  // ----- HOZZÁRENDELÉSEK LEKÉRÉSE ENTITÁSHOZ (NYERS - POPULATE NÉLKÜL) -----
  // Entitáshoz tartozó tudatpont hozzárendelések lekérése
  // ✅ POPULATE NÉLKÜL - csak tiszta ObjectId-k (backend logikához)
  // Használat: tudatpontokVisszaosztasa, egyesítés, törlés (amikor csak ID kell, név nem)
  // @param {string} entitasId - Az entitás azonosítója
  // @param {string} entitasTipus - Az entitás típusa (Tartalom, Kategoria, TartalomTipus, Javaslat)
  // @param {number} limit - Maximum ennyi dokumentumot ad vissza
  // @param {number} skip - Ennyi dokumentumot ugorjon át (lapozáshoz)
  // @returns {Promise<Array>} Hozzárendelések listája (tiszta ObjectId-kkal)
  async findHozzarendelesekByEntitasNyers(entitasId, entitasTipus, limit = 100, skip = 0) {
    // Hozzárendelések lekérése tudatpontok szerint csökkenő sorrendben
    const hozzarendelesek = await TudatpontHozzarendeles.find({
      entitasId: entitasId,
      entitasTipus: entitasTipus,
      tudatPontok: { $gt: 0 }                              // Csak aktív hozzárendelések (0-nál több pont)
    })
    .sort({ tudatPontok: -1 })                             // Legtöbb pont először
    .limit(limit)                                          // Maximum ennyi dokumentum
    .skip(skip);                                           // Lapozás (ennyi dokumentumot ugrik át)
    // ✅ NINCS .populate() - emberId tiszta ObjectId marad (backend logikához)
    
    return hozzarendelesek;
  }

  // ----- HOZZÁRENDELÉS TÖRLÉSE -----
  // Egy hozzárendelés törlése
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object|null>} A törölt hozzárendelés vagy null
  async deleteHozzarendeles(emberId, entitasId, entitasTipus) {
    // Hozzárendelés törlése
    const toroltHozzarendeles = await TudatpontHozzarendeles.findOneAndDelete({
      emberId: emberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    return toroltHozzarendeles;
  }

  // ----- ENTITÁS ÖSSZES HOZZÁRENDELÉSÉNEK TÖRLÉSE -----
  // Egy entitáshoz tartozó összes hozzárendelés törlése
  // @param {string} entitasId - Az entitás MongoDB ObjectId-ja
  // @param {string} entitasTipus - Az entitás típusa
  // @returns {Promise<Object>} Törlés eredménye (deletedCount)
  async deleteHozzarendelesekByEntitas(entitasId, entitasTipus) {
    // Több hozzárendelés törlése egyszerre
    const torlesEredmeny = await TudatpontHozzarendeles.deleteMany({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    
    return torlesEredmeny;
  }

  // ============================================================
  // EMBER MŰVELETEK
  // ============================================================

  // ----- EMBER KERESÉSE ID ALAPJÁN -----
  // Ember keresése MongoDB ObjectId alapján
  // @param {string} id - MongoDB ObjectId (_id mező)
  // @returns {Promise<Object|null>} Ember dokumentum vagy null
  async findEmberById(id) {
    // MongoDB findById művelet
    return await Ember.findById(id);
  }

  // ----- EMBER TUDATPONT EGYENLEGÉNEK FRISSÍTÉSE -----
  // Ember tudatpont egyenlegének módosítása
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {number} ujEgyenleg - Az új tudatpont egyenleg
  // @returns {Promise<Object|null>} Frissített ember
  async updateEmberTudatpontok(emberId, ujEgyenleg) {
    // Ember frissítése - csak a tudatpontok mező módosítása
    const frissitettEmber = await Ember.findByIdAndUpdate(
      emberId,                                       // A ember ID-ja
      { tudatpontok: ujEgyenleg },                         // Új egyenleg beállítása
      { 
        new: true,                                         // Frissített dokumentumot ad vissza
        runValidators: true                                // Mongoose validációk futtatása
      }
    );
    
    return frissitettEmber;
  }

  // ----- EMBER TUDATPONT EGYENLEGÉNEK INKREMENTÁLÁSA -----
  // Ember tudatpont egyenlegének növelése/csökkentése atomi művelettel
  // @param {string} emberId - A ember MongoDB ObjectId-ja
  // @param {number} mennyiseg - Mennyivel változzon az egyenleg (lehet negatív is)
  // @returns {Promise<Object|null>} Frissített ember
  async incrementEmberTudatpontok(emberId, mennyiseg) {
    // MongoDB $inc operátor - atomi inkrementálás (thread-safe)
    const frissitettEmber = await Ember.findByIdAndUpdate(
      emberId,
      { $inc: { tudatpontok: mennyiseg } },                // Hozzáadás/levonás
      { 
        new: true,                                         // Frissített dokumentumot ad vissza
        runValidators: true                                // Mongoose validációk futtatása
      }
    );
    
    return frissitettEmber;
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
module.exports = new TudatpontRepository();
