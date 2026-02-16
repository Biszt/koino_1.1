// backend/repositories/hierarchikusTudatpontAllokaciRepository.js

// MODEL IMPORTÁLÁSA
// A HierarchikusTudatpontAllokacio Mongoose model
const HierarchikusTudatpontAllokacio = require('../models/hierarchikusTudatpontAllokacio');

// HIERARCHIKUS TUDATPONT ALLOKÁCIÓ REPOSITORY OSZTÁLY
// Ez a réteg felelős az adatbázis műveletekért (CRUD)
// Csak technikai adatbázis hívások, NINCS üzleti logika!
class HierarchikusTudatpontAllokaciRepository {

  // ----- KERESÉS ENTITÁS ALAPJÁN -----
  /**
   * Hierarchikus allokáció lekérése entitás ID és típus alapján
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<Object|null>} Hierarchikus allokáció vagy null
   */
  async findByEntitas(entitasId, entitasTipus) {
    // MongoDB findOne művelet - egy rekord keresése
    return await HierarchikusTudatpontAllokacio.findOne({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
  }

  // ----- KERESÉS ID ALAPJÁN -----
  /**
   * Hierarchikus allokáció keresése MongoDB ObjectId alapján
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>} Hierarchikus allokáció vagy null
   */
  async findById(id) {
    // MongoDB findById művelet
    return await HierarchikusTudatpontAllokacio.findById(id);
  }

  // ----- LÉTREHOZÁS VAGY FRISSÍTÉS (UPSERT) -----
  /**
   * Hierarchikus allokáció létrehozása vagy frissítése
   * Ha létezik, frissíti; ha nem, létrehozza
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} hierarchikusOsszesPont - Az új hierarchikus pontérték
   * @returns {Promise<Object>} Létrehozott vagy frissített dokumentum
   */
  async createOrUpdate(entitasId, entitasTipus, hierarchikusOsszesPont) {
    // MongoDB findOneAndUpdate művelet upsert opcióval
    return await HierarchikusTudatpontAllokacio.findOneAndUpdate(
      // Keresési feltétel
      { 
        entitasId: entitasId, 
        entitasTipus: entitasTipus 
      },
      // Frissítendő/létrehozandó adatok
      {
        hierarchikusOsszesPont: hierarchikusOsszesPont,
        frissitve: new Date() // Frissítés dátuma
      },
      {
        new: true, // Frissített dokumentum visszaadása
        upsert: true, // Ha nem létezik, hozza létre
        runValidators: true, // Validációk futtatása
        setDefaultsOnInsert: true // Alapértelmezett értékek beállítása új dokumentumnál
      }
    );
  }

  // ----- HIERARCHIKUS PONT NÖVELÉSE/CSÖKKENTÉSE (ATOMI MŰVELET) -----
  /**
   * Hierarchikus pont inkrementálása (növelés vagy csökkentés)
   * Atomi művelet - transaction-safe
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} kulonbseg - A különbség (+50 vagy -50, stb.)
   * @returns {Promise<Object|null>} Frissített dokumentum vagy null
   */
  async incrementHierarchikusPont(entitasId, entitasTipus, kulonbseg) {
    // MongoDB $inc operátor használata - atomi művelet
    return await HierarchikusTudatpontAllokacio.findOneAndUpdate(
      // Keresési feltétel
      {
        entitasId: entitasId,
        entitasTipus: entitasTipus
      },
      // Művelet
      {
        $inc: { hierarchikusOsszesPont: kulonbseg }, // Inkrementálás a különbséggel
        $set: { frissitve: new Date() } // Frissítés dátuma
      },
      {
        new: true, // Frissített dokumentum visszaadása
        upsert: true, // Ha nem létezik, létrehozza 0-val + különbség
        runValidators: true // Validációk futtatása
      }
    );
  }

  // ----- TÖRLÉS ENTITÁS ALAPJÁN -----
  /**
   * Hierarchikus allokáció törlése entitás ID és típus alapján
   * Használat: amikor az entitás törlődik
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<Object|null>} Törölt dokumentum vagy null
   */
  async deleteByEntitas(entitasId, entitasTipus) {
    // MongoDB findOneAndDelete művelet
    return await HierarchikusTudatpontAllokacio.findOneAndDelete({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
  }

  // ----- TÖRLÉS ID ALAPJÁN -----
  /**
   * Hierarchikus allokáció törlése MongoDB ObjectId alapján
   * @param {string} id - MongoDB ObjectId
   * @returns {Promise<Object|null>} Törölt dokumentum vagy null
   */
  async deleteById(id) {
    // MongoDB findByIdAndDelete művelet
    return await HierarchikusTudatpontAllokacio.findByIdAndDelete(id);
  }

  // ----- LÉTEZIK-E ENTITÁSHOZ ALLOKÁCIÓ -----
  /**
   * Ellenőrzi, hogy létezik-e hierarchikus allokáció egy entitáshoz
   * @param {string} entitasId - Az entitás azonosítója
   * @param {string} entitasTipus - Az entitás típusa
   * @returns {Promise<boolean>} true ha létezik, false ha nem
   */
  async existsByEntitas(entitasId, entitasTipus) {
    // MongoDB exists művelet - csak létezést ellenőriz
    const result = await HierarchikusTudatpontAllokacio.exists({
      entitasId: entitasId,
      entitasTipus: entitasTipus
    });
    // Ha null, akkor nem létezik
    return result !== null;
  }

  // ----- LISTA LEKÉRÉSE TÍPUS SZERINT -----
  /**
   * Entitások hierarchikus allokációinak listázása típus szerint
   * Rendezve hierarchikusOsszesPont szerint csökkenő sorrendben
   * @param {string} entitasTipus - Az entitás típusa
   * @param {number} limit - Maximum ennyi rekord
   * @param {number} skip - Ennyi rekord kihagyása (lapozás)
   * @returns {Promise<Array>} Hierarchikus allokációk listája
   */
  async listByTipus(entitasTipus, limit = 100, skip = 0) {
    // MongoDB find művelet rendezéssel és lapozással
    return await HierarchikusTudatpontAllokacio.find({
      entitasTipus: entitasTipus
    })
      .sort({ hierarchikusOsszesPont: -1 }) // Csökkenő sorrend - legnagyobb előre
      .limit(limit) // Maximum ennyi rekord
      .skip(skip) // Ennyi rekord kihagyása
      .lean(); // Plain JavaScript objektum - gyorsabb
  }
}

// EXPORTÁLÁS
// Repository osztály SINGLETON példány exportálása
// Így az egész alkalmazásban ugyanazt a példányt használjuk
module.exports = new HierarchikusTudatpontAllokaciRepository();
