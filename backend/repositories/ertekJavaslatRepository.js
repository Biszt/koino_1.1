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

  // ----- ÉRTÉK JAVASLAT KERESÉSE EMBER ÉS TARTALOM ALAPJÁN -----
  /**
   * Egy eember érték javaslatának lekérése egy adott tartalomhoz
   * @param {string} eemberId - eEmber ID
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>}Érték javaslat dokumentum vagy null
   */
  async findByeEmberAndTartalom(eemberId, tartalomId) {
    // MongoDB findOne művelet - compound kulcs alapján
    return await ErtekJavaslat.findOne({
      eemberId: eemberId,
      tartalomId: tartalomId
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

  // ----- ÖSSZES ÉRTÉK JAVASLAT LEKÉRÉSE TARTALOM ALAPJÁN -----
  /**
   * Egy tartalom összes érték javaslatának lekérése
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Array>} érték Javaslatok tömbje
   */
  async findByTartalom(tartalomId) {
    // MongoDB find művelet - tartalom alapján
    return await ErtekJavaslat.find({ tartalomId: tartalomId });
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT LEKÉRÉSE EMBER ALAPJÁN -----
  /**
   * Egy eember összes érték javaslatának lekérése
   * @param {string} eemberId - eEmber ID
   * @returns {Promise<Array>} Érték javaslatok tömbje
   */
  async findByeEmber(eemberId) {
    // MongoDB find művelet - eember alapján
    return await ErtekJavaslat.find({ eemberId: eemberId })
      .populate('tartalomId', 'cim');  // Tartalom címének betöltése (opcionális)
  }

  // ----- ÉRTÉK JAVASLATOK SZÁMÁNAK LEKÉRÉSE TARTALOM ALAPJÁN -----
  /**
   * Hány érték javaslat van egy adott tartalomhoz
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<number>} Érték javaslatok száma
   */
  async countByTartalom(tartalomId) {
    // MongoDB countDocuments művelet
    return await ErtekJavaslat.countDocuments({ tartalomId: tartalomId });
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
   * @param {string} tartalomId - Tartalom ID
   * @param {Object} adatok -Érték javaslat adatai
   * @returns {Promise<Object>} Létrehozott vagy frissített javaslat
   */
  async createOrUpdate(eemberId, tartalomId, adatok) {
    // MongoDB findOneAndUpdate művelet upsert opcióval
    return await ErtekJavaslat.findOneAndUpdate(
      { 
        eemberId: eemberId,      // Keresési feltétel
        tartalomId: tartalomId 
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

  // ----- ÉRTÉK JAVASLAT TÖRLÉSE EMBER ÉS TARTALOM ALAPJÁN -----
  /**
   * Egy eember érték javaslatának törlése egy adott tartalomhoz
   * @param {string} eemberId - eEmber ID
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Törölt érték javaslat vagy null
   */
  async deleteByeEmberAndTartalom(eemberId, tartalomId) {
    // MongoDB findOneAndDelete művelet
    return await ErtekJavaslat.findOneAndDelete({
      eemberId: eemberId,
      tartalomId: tartalomId
    });
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT TÖRLÉSE TARTALOM ALAPJÁN -----
  /**
   * Egy tartalom összes érték javaslatának törlése
   * Használat: amikor a tartalmat törlik
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object>} Törlési eredmény (deletedCount)
   */
  async deleteByTartalom(tartalomId) {
    // MongoDB deleteMany művelet
    return await ErtekJavaslat.deleteMany({ tartalomId: tartalomId });
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new ErtekJavaslatRepository();
