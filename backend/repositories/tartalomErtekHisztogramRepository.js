// backend/repositories/tartalomErtekHisztogramRepository.js

// ===== MODEL IMPORTÁLÁSA =====
// A TartalomErtekHisztogram Mongoose model
const TartalomErtekHisztogram = require('../models/tartalomErtekHisztogram');

// ===== TARTALOM ÉRTÉK HISZTOGRAM REPOSITORY OSZTÁLY =====
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class TartalomErtekHisztogramRepository {

  // ===== LÉTREHOZÁS =====
  
  // ----- ÚJ HISZTOGRAM LÉTREHOZÁSA -----
  /**
   * Új hisztogram mentése az adatbázisba
   * @param {Object} adatok - Hisztogram adatai
   * @returns {Promise<Object>} Létrehozott hisztogram dokumentum
   */
  async create(adatok) {
    // Új Mongoose dokumentum példány létrehozása
    const hisztogram = new TartalomErtekHisztogram(adatok);
    
    // Mentés az adatbázisba (MongoDB insert művelet)
    return await hisztogram.save();
  }

  // ===== KERESÉS =====

  // ----- HISZTOGRAM KERESÉSE TARTALOM ALAPJÁN -----
  /**
   * Hisztogram lekérése tartalom ID alapján
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Hisztogram dokumentum vagy null
   */
  async findByTartalom(tartalomId) {
    // MongoDB findOne művelet - egy tartalomhoz csak egy hisztogram van
    return await TartalomErtekHisztogram.findOne({ tartalomId: tartalomId });
  }

  // ----- HISZTOGRAM KERESÉSE ID ALAPJÁN -----
  /**
   * Hisztogram keresése MongoDB ObjectId alapján
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>} Hisztogram dokumentum vagy null
   */
  async findById(id) {
    // MongoDB findById művelet
    return await TartalomErtekHisztogram.findById(id);
  }

  // ----- LÉTEZIK-E HISZTOGRAM EGY TARTALOMHOZ -----
  /**
   * Ellenőrzi, hogy létezik-e hisztogram egy tartalomhoz
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<boolean>} true ha létezik, false ha nem
   */
  async existsByTartalom(tartalomId) {
    // MongoDB exists művelet - csak létezést ellenőriz, nem tölti be a dokumentumot
    const result = await TartalomErtekHisztogram.exists({ tartalomId: tartalomId });
    return result !== null;  // Ha null, akkor nem létezik
  }

  // ===== MÓDOSÍTÁS =====

  // ----- HISZTOGRAM FRISSÍTÉSE ID ALAPJÁN -----
  /**
   * Meglévő hisztogram frissítése
   * @param {string} id - Hisztogram ID
   * @param {Object} frissitesek - Frissítendő mezők
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async updateById(id, frissitesek) {
    // Automatikus frissítés dátum hozzáadása
    frissitesek.utolsoFrissites = new Date();
    
    // MongoDB findByIdAndUpdate művelet
    return await TartalomErtekHisztogram.findByIdAndUpdate(
      id,                                  // Keresési feltétel: ID
      frissitesek,                         // Frissítendő mezők
      { 
        new: true,                         // Frissített dokumentum visszaadása
        runValidators: true                // Validációk futtatása
      }
    );
  }

  // ----- HISZTOGRAM FRISSÍTÉSE TARTALOM ALAPJÁN -----
  /**
   * Hisztogram frissítése tartalom ID alapján
   * @param {string} tartalomId - Tartalom ID
   * @param {Object} frissitesek - Frissítendő mezők
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async updateByTartalom(tartalomId, frissitesek) {
    // Automatikus frissítés dátum hozzáadása
    frissitesek.utolsoFrissites = new Date();
    
    // MongoDB findOneAndUpdate művelet
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },          // Keresési feltétel
      frissitesek,                         // Frissítendő mezők
      { 
        new: true,                         // Frissített dokumentum visszaadása
        runValidators: true                // Validációk futtatása
      }
    );
  }

  // ----- HISZTOGRAM LÉTREHOZÁSA VAGY FRISSÍTÉSE -----
  /**
   * Hisztogram frissítése, ha létezik, különben létrehozás
   * @param {string} tartalomId - Tartalom ID
   * @param {Object} adatok - Hisztogram adatai
   * @returns {Promise<Object>} Létrehozott vagy frissített hisztogram
   */
  async createOrUpdate(tartalomId, adatok) {
    // Automatikus frissítés dátum hozzáadása
    adatok.utolsoFrissites = new Date();
    
    // MongoDB findOneAndUpdate művelet upsert opcióval
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },          // Keresési feltétel
      adatok,                              // Frissítendő/létrehozandó adatok
      { 
        new: true,                         // Frissített/létrehozott dokumentum visszaadása
        upsert: true,                      // Ha nem létezik, hozza létre
        runValidators: true,               // Validációk futtatása
        setDefaultsOnInsert: true          // Alapértelmezett értékek beállítása új dokumentumnál
      }
    );
  }

  // ----- BUCKET NÖVELÉSE -----
  /**
   * Egy bucket értékének növelése (+1)
   * @param {string} tartalomId - Tartalom ID
   * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram'
   * @param {number} ertek - A százalék érték (pl. 75)
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async incrementBucket(tartalomId, hisztogramNev, ertek) {
    // MongoDB $inc operátor használata - atomi művelet
    const updateField = `${hisztogramNev}.${ertek}`;  // Pl: 'javaslatElfogadasiKuszobHisztogram.75'
    
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },
      { 
        $inc: { [updateField]: 1 },        // +1 növelés
        $set: { utolsoFrissites: new Date() }
      },
      { new: true }
    );
  }

  // ----- BUCKET CSÖKKENTÉSE -----
  /**
   * Egy bucket értékének csökkentése (-1)
   * @param {string} tartalomId - Tartalom ID
   * @param {string} hisztogramNev - 'javaslatElfogadasiKuszobHisztogram' vagy 'reszveteliAranyKuszobHisztogram'
   * @param {number} ertek - A százalék érték (pl. 75)
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async decrementBucket(tartalomId, hisztogramNev, ertek) {
    // MongoDB $inc operátor használata - atomi művelet
    const updateField = `${hisztogramNev}.${ertek}`;  // Pl: 'javaslatElfogadasiKuszobHisztogram.75'
    
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },
      { 
        $inc: { [updateField]: -1 },       // -1 csökkentés
        $set: { utolsoFrissites: new Date() }
      },
      { new: true }
    );
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT SZÁMÁNAK NÖVELÉSE -----
  /**
   * Az osszes ErtekJavaslat mező növelése (+1)
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async incrementOsszesErtekJavaslat(tartalomId) {
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },
      { 
        $inc: { osszesErtekJavaslat: 1 },       // +1 növelés
        $set: { utolsoFrissites: new Date() }
      },
      { new: true }
    );
  }

  // ----- ÖSSZES ÉRTÉK JAVASLAT SZÁMÁNAK CSÖKKENTÉSE -----
  /**
   * Az osszes érték Javaslat mező csökkentése (-1)
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async decrementOsszesJavaslat(tartalomId) {
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { tartalomId: tartalomId },
      { 
        $inc: { osszesErtekJavaslat: -1 },      // -1 csökkentés
        $set: { utolsoFrissites: new Date() }
      },
      { new: true }
    );
  }

  // ===== TÖRLÉS =====

  // ----- HISZTOGRAM TÖRLÉSE ID ALAPJÁN -----
  /**
   * Hisztogram törlése ID alapján
   * @param {string} id - Hisztogram ID
   * @returns {Promise<Object|null>} Törölt hisztogram vagy null
   */
  async deleteById(id) {
    // MongoDB findByIdAndDelete művelet
    return await TartalomErtekHisztogram.findByIdAndDelete(id);
  }

  // ----- HISZTOGRAM TÖRLÉSE TARTALOM ALAPJÁN -----
  /**
   * Hisztogram törlése tartalom ID alapján
   * Használat: amikor a tartalmat törlik
   * @param {string} tartalomId - Tartalom ID
   * @returns {Promise<Object|null>} Törölt hisztogram vagy null
   */
  async deleteByTartalom(tartalomId) {
    // MongoDB findOneAndDelete művelet
    return await TartalomErtekHisztogram.findOneAndDelete({ tartalomId: tartalomId });
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new TartalomErtekHisztogramRepository();
