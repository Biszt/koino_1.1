// backend/repositories/tartalomErtekHisztogramRepository.js

// ===== MODEL IMPORTÁLÁSA =====
// A TartalomErtekHisztogram Mongoose model (mostantól bármely entitástípusra)
const TartalomErtekHisztogram = require('../models/tartalomErtekHisztogram');

// ===== ENTITÁS ÉRTÉK HISZTOGRAM REPOSITORY OSZTÁLY =====
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
// Az érték-rendszer entitás-polimorf: entitasId + entitasTipus azonosít.
class TartalomErtekHisztogramRepository {

  // ===== LÉTREHOZÁS =====

  // ----- ÚJ HISZTOGRAM LÉTREHOZÁSA -----
  /**
   * Új hisztogram mentése az adatbázisba
   * @param {Object} adatok - Hisztogram adatai (entitasId, entitasTipus, ...)
   * @returns {Promise<Object>} Létrehozott hisztogram dokumentum
   */
  async create(adatok) {
    const hisztogram = new TartalomErtekHisztogram(adatok);
    return await hisztogram.save();
  }

  // ===== KERESÉS =====

  // ----- HISZTOGRAM KERESÉSE ENTITÁS ALAPJÁN -----
  /**
   * Hisztogram lekérése entitás alapján
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object|null>} Hisztogram dokumentum vagy null
   */
  async findByEntitas(entitasId, entitasTipus) {
    // Egy entitáshoz csak egy hisztogram van
    return await TartalomErtekHisztogram.findOne({ entitasId: entitasId, entitasTipus: entitasTipus });
  }

  // ----- HISZTOGRAM KERESÉSE ID ALAPJÁN -----
  /**
   * Hisztogram keresése MongoDB ObjectId alapján
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>} Hisztogram dokumentum vagy null
   */
  async findById(id) {
    return await TartalomErtekHisztogram.findById(id);
  }

  // ----- LÉTEZIK-E HISZTOGRAM EGY ENTITÁSHOZ -----
  /**
   * Ellenőrzi, hogy létezik-e hisztogram egy entitáshoz
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<boolean>} true ha létezik, false ha nem
   */
  async existsByEntitas(entitasId, entitasTipus) {
    const result = await TartalomErtekHisztogram.exists({ entitasId: entitasId, entitasTipus: entitasTipus });
    return result !== null;
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
    frissitesek.utolsoFrissites = new Date();
    return await TartalomErtekHisztogram.findByIdAndUpdate(
      id,
      frissitesek,
      { new: true, runValidators: true }
    );
  }

  // ----- HISZTOGRAM FRISSÍTÉSE ENTITÁS ALAPJÁN -----
  /**
   * Hisztogram frissítése entitás alapján
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {Object} frissitesek - Frissítendő mezők
   * @returns {Promise<Object|null>} Frissített hisztogram vagy null
   */
  async updateByEntitas(entitasId, entitasTipus, frissitesek) {
    frissitesek.utolsoFrissites = new Date();
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { entitasId: entitasId, entitasTipus: entitasTipus },
      frissitesek,
      { new: true, runValidators: true }
    );
  }

  // ----- HISZTOGRAM LÉTREHOZÁSA VAGY FRISSÍTÉSE -----
  /**
   * Hisztogram frissítése, ha létezik, különben létrehozás
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @param {Object} adatok - Hisztogram adatai
   * @returns {Promise<Object>} Létrehozott vagy frissített hisztogram
   */
  async createOrUpdate(entitasId, entitasTipus, adatok) {
    adatok.utolsoFrissites = new Date();
    return await TartalomErtekHisztogram.findOneAndUpdate(
      { entitasId: entitasId, entitasTipus: entitasTipus },
      adatok,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
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
    return await TartalomErtekHisztogram.findByIdAndDelete(id);
  }

  // ----- HISZTOGRAM TÖRLÉSE ENTITÁS ALAPJÁN -----
  /**
   * Hisztogram törlése entitás alapján
   * Használat: amikor az entitást törlik
   * @param {string} entitasId - Entitás ID
   * @param {string} entitasTipus - Entitás típusa
   * @returns {Promise<Object|null>} Törölt hisztogram vagy null
   */
  async deleteByEntitas(entitasId, entitasTipus) {
    return await TartalomErtekHisztogram.findOneAndDelete({ entitasId: entitasId, entitasTipus: entitasTipus });
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
module.exports = new TartalomErtekHisztogramRepository();
