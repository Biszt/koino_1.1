// backend/repositories/ertekJavaslatRepository.js

// ===== MODEL IMPORTÁLÁSA =====
// Az ErtekJavaslat Mongoose model
const ErtekJavaslat = require('../models/ertekJavaslat');

// ===== ÉRTÉK JAVASLAT REPOSITORY OSZTÁLY =====
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class ErtekJavaslatRepository {

  // ===== LÉTREHOZÁS =====
  
  // ----- ÚJ ÉRTÉK JAVASLAT LÉTREHOZÁSA -----
  /**
   * Új érték javaslat mentése az adatbázisba
   * @param {Object} adatok -Érték javaslat adatai
   * @returns {Promise<Object>} Létrehozott érték javaslat dokumentum
   */
  async create(adatok) {
    // Új Mongoose dokumentum példány létrehozása
    const ertekJavaslat = new ErtekJavaslat(adatok);
    
    // Mentés az adatbázisba (MongoDB insert művelet)
    return await ertekJavaslat.save();
  }

  // ===== KERESÉS =====

  // ----- ÉRTÉK JAVASLAT KERESÉSE EMBER ÉS ENTITÁS ALAPJÁN -----
  /**
   * Egy eember érték javaslatának lekérése egy adott entitáshoz
   * @param {string} eemberId - eEmber ID
   * @param {string} entitasId - Entitás ID (tartalom/kategória/tartalomtípus)
   * @param {string} entitasTipus - Entitás típusa ('Tartalom' | 'Kategoria' | 'TartalomTipus')
   * @returns {Promise<Object|null>}Érték javaslat dokumentum vagy null
   */
  async findByeEmberAndEntitas(eemberId, entitasId, entitasTipus) {
    // MongoDB findOne művelet - compound kulcs alapján
    return await ErtekJavaslat.findOne({
      eemberId: eemberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
  }

  // ----- ÉRTÉK JAVASLAT KERESÉSE ID ALAPJÁN -----
  /**
   *Érték javaslat keresése MongoDB ObjectId alapján
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>}Érték javaslat dokumentum vagy null
   */
  async findById(id) {
    // MongoDB findById művelet
    return await ErtekJavaslat.findById(id);
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT LEKÉRÉSE ENTITÁS ALAPJÁN -----
  /**
   * Egy entitás összes érték javaslatának lekérése
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Array>} érték Javaslatok tömbje
   */
  async findByEntitas(entitasId, entitasTipus) {
    // MongoDB find művelet - entitás alapján
    return await ErtekJavaslat.find({ entitasId: entitasId, entitasTipus: entitasTipus });
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT LEKÉRÉSE EMBER ALAPJÁN -----
  /**
   * Egy eember összes érték javaslatának lekérése
   * @param {string} eemberId - eEmber ID
   * @returns {Promise<Array>} Érték javaslatok tömbje
   */
  async findByeEmber(eemberId) {
    // MongoDB find művelet - eember alapján (polimorf entitás, populate nélkül)
    return await ErtekJavaslat.find({ eemberId: eemberId });
  }

  // ----- ÉRTÉK JAVASLATOK SZÁMÁNAK LEKÉRÉSE ENTITÁS ALAPJÁN -----
  /**
   * Hány érték javaslat van egy adott entitáshoz
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<number>} Érték javaslatok száma
   */
  async countByEntitas(entitasId, entitasTipus) {
    // MongoDB countDocuments művelet
    return await ErtekJavaslat.countDocuments({ entitasId: entitasId, entitasTipus: entitasTipus });
  }

  // ===== MÓDOSÍTÁS =====

  // ----- ÉRTÉK JAVASLAT FRISSÍTÉSE ID ALAPJÁN -----
  /**
   * Meglévő érték javaslat frissítése
   * @param {string} id -Érték javaslat ID
   * @param {Object} frissitesek - Frissítendő mezők
   * @returns {Promise<Object|null>} Frissített érték javaslat vagy null
   */
  async updateById(id, frissitesek) {
    // MongoDB findByIdAndUpdate művelet
    return await ErtekJavaslat.findByIdAndUpdate(
      id,                                  // Keresési feltétel: ID
      frissitesek,                         // Frissítendő mezők
      { 
        new: true,                         // Frissített dokumentum visszaadása
        runValidators: true                // Validációk futtatása
      }
    );
  }

  // ----- ÉRTÉK JAVASLAT FRISSÍTÉSE VAGY LÉTREHOZÁSA -----
  /**
   *Érték javaslat frissítése, ha létezik, különben létrehozás
   * @param {string} eemberId - eEmber ID
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {Object} adatok -Érték javaslat adatai
   * @returns {Promise<Object>} Létrehozott vagy frissített javaslat
   */
  async createOrUpdate(eemberId, entitasId, entitasTipus, adatok) {
    // MongoDB findOneAndUpdate művelet upsert opcióval
    return await ErtekJavaslat.findOneAndUpdate(
      {
        eemberId: eemberId,      // Keresési feltétel
        entitasId: entitasId,
        entitasTipus: entitasTipus
      },
      {
        ...adatok,                         // Frissítendő/létrehozandó adatok
        modositva: new Date()              // Módosítás dátumának beállítása
      },
      { 
        new: true,                         // Frissített/létrehozott dokumentum visszaadása
        upsert: true,                      // Ha nem létezik, hozza létre
        runValidators: true,               // Validációk futtatása
        setDefaultsOnInsert: true          // Alapértelmezett értékek beállítása új dokumentumnál
      }
    );
  }

  // ===== TÖRLÉS =====

  // ----- ÉRTÉK JAVASLAT TÖRLÉSE ID ALAPJÁN -----
  /**
   *Érték javaslat törlése ID alapján
   * @param {string} id -Érték javaslat ID
   * @returns {Promise<Object|null>} Törölt érték javaslat vagy null
   */
  async deleteById(id) {
    // MongoDB findByIdAndDelete művelet
    return await ErtekJavaslat.findByIdAndDelete(id);
  }

  // ----- ÉRTÉK JAVASLAT TÖRLÉSE EMBER ÉS ENTITÁS ALAPJÁN -----
  /**
   * Egy eember érték javaslatának törlése egy adott entitáshoz
   * @param {string} eemberId - eEmber ID
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object|null>} Törölt érték javaslat vagy null
   */
  async deleteByeEmberAndEntitas(eemberId, entitasId, entitasTipus) {
    // MongoDB findOneAndDelete művelet
    return await ErtekJavaslat.findOneAndDelete({
      eemberId: eemberId,
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT TÖRLÉSE ENTITÁS ALAPJÁN -----
  /**
   * Egy entitás összes érték javaslatának törlése
   * Használat: amikor az entitást törlik
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object>} Törlési eredmény (deletedCount)
   */
  async deleteByEntitas(entitasId, entitasTipus) {
    // MongoDB deleteMany művelet
    return await ErtekJavaslat.deleteMany({ entitasId: entitasId, entitasTipus: entitasTipus });
  }

  // ----- EGY EEMBER ÖSSZES ÉRTÉK-JAVASLATÁNAK TÖRLÉSE -----
  // Fiók-törléskor: az e-ember minden küszöb-érték-javaslatának törlése.
  // @param {string} eemberId - Az e-ember MongoDB ObjectId-ja
  // @returns {Promise<Object>} Törlés eredménye (deletedCount)
  async deleteByeEmber(eemberId) {
    console.log('ertekJavaslatRepository.deleteByeEmber - KEZDÉS', { eemberId });

    const eredmeny = await ErtekJavaslat.deleteMany({ eemberId: eemberId });

    console.log('ertekJavaslatRepository.deleteByeEmber - VÉGE', { torolt: eredmeny.deletedCount });
    return eredmeny;
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new ErtekJavaslatRepository();
