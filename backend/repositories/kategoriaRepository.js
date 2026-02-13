// backend/repositories/kategoriaRepository.js

// ===== KATEGÓRIA MODEL IMPORTÁLÁSA =====
const Kategoria = require('../models/kategoria');

// ===== KATEGÓRIA REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a kategória adatok adatbázis műveleteiért
class KategoriaRepository {
  
  // ----- ÚJ KATEGÓRIA LÉTREHOZÁSA -----
  /**
   * Új kategória mentése az adatbázisba
   * @param {Object} kategoriaAdatok - A kategória adatai
   * @returns {Promise<Object>} A létrehozott kategória objektum
   */
  async create(kategoriaAdatok) {
    // Új kategória példány létrehozása
    const ujKategoria = new Kategoria(kategoriaAdatok);
    
    // Mentés az adatbázisba
    const mentettKategoria = await ujKategoria.save();
    
    return mentettKategoria;
  }
  
  // ----- KATEGÓRIA KERESÉSE ID ALAPJÁN -----
  /**
   * Egy kategória lekérdezése ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A kategória objektum vagy null ha nem található
   */
  async findById(id) {
    // Kategória lekérése kapcsolódó adatokkal (populate)
    const kategoria = await Kategoria.findById(id)
      .populate('letrehozo', 'emberNev'); // Létrehozó adatok betöltése
    
    return kategoria;
  }
  
  // ----- KATEGÓRIÁK LISTÁZÁSA SZŰRŐKKEL -----
  /**
   * Kategóriák lekérdezése különböző szűrési feltételekkel
   * @param {Object} szurok - Szűrési feltételek objektum
   * @param {string} szurok.letrehozo - Szűrés létrehozó szerint
   * @param {string} szurok.nev - Szűrés név szerint (részleges egyezés)
   * @returns {Promise<Array>} Kategóriák tömb
   */
  async findAll(szurok = {}) {
    // MongoDB query objektum építése
    const query = {};
    
    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }
    
    // Név szerinti szűrés (részleges egyezés, kis/nagybetű érzéketlen)
    if (szurok.nev) {
      query.nev = { 
        $regex: szurok.nev,      // Reguláris kifejezés keresés
        $options: 'i'             // Case-insensitive (kis/nagybetű független)
      };
    }
    
    // Kategóriák lekérése kapcsolódó adatokkal
    const kategoriak = await Kategoria.find(query)
      .sort({ letrehozva: -1 })                 // Legújabbak előre rendezés
      .populate('letrehozo', 'emberNev'); // Létrehozó adatok
    
    return kategoriak;
  }
  
  // ----- KATEGÓRIA KERESÉSE NÉV ALAPJÁN -----
  /**
   * Egy kategória keresése név alapján (egyedi név ellenőrzéshez)
   * @param {string} nev - A kategória neve
   * @returns {Promise<Object|null>} A kategória objektum vagy null
   */
  async findByNev(nev) {
    // Kategória keresése név alapján (kis/nagybetű független)
    const kategoria = await Kategoria.findOne({ 
      nev: { 
        $regex: `^${nev}$`,  // Pontos egyezés
        $options: 'i'         // Case-insensitive
      } 
    });
    
    return kategoria;
  }
  
  // ----- KATEGÓRIA FRISSÍTÉSE -----
  /**
   * Egy kategória módosítása ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített kategória vagy null
   */
  async updateById(id, frissitesek) {
    // Kategória frissítése és a frissített verzió visszaadása
    const frissitettKategoria = await Kategoria.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true,            // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true   // Mongoose validációk futtatása
      }
    )
    .populate('letrehozo', 'emberNev');
    
    return frissitettKategoria;
  }
  
  // ----- KATEGÓRIA TorlesE -----
  /**
   * Egy kategória törlése ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt kategória vagy null
   */
  async deleteById(id) {
    // Kategória törlése és a törölt dokumentum visszaadása
    const toroltKategoria = await Kategoria.findByIdAndDelete(id);
    
    return toroltKategoria;
  }
  
  // ----- KATEGÓRIÁK SZÁMLÁLÁSA -----
  /**
   * Összes kategória megszámlálása (opcionális szűrőkkel)
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Kategóriák száma
   */
  async count(szurok = {}) {
    // MongoDB query objektum építése (ugyanaz, mint a findAll-nál)
    const query = {};
    
    if (szurok.letrehozo) {
      query.letrehozo = szurok.letrehozo;
    }
    
    if (szurok.nev) {
      query.nev = { 
        $regex: szurok.nev, 
        $options: 'i' 
      };
    }
    
    // Kategóriák megszámlálása
    const darab = await Kategoria.countDocuments(query);
    
    return darab;
  }
}

// Repository exportálása
module.exports = new KategoriaRepository();
