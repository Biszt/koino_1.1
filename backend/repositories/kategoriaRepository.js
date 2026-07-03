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
    // Log metódus kezdete
    console.log('kategoriaRepository.create - KEZDÉS', kategoriaAdatok);
    // Új kategória példány létrehozása
    const ujKategoria = new Kategoria(kategoriaAdatok);
    // Mentés az adatbázisba
    const mentettKategoria = await ujKategoria.save();
    // Log metódus vége
    console.log('kategoriaRepository.create - VÉGE', mentettKategoria);
    return mentettKategoria;
  }

  // ----- KATEGÓRIA KERESÉSE ID ALAPJÁN -----
  /**
   * Egy kategória lekérdezése ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A kategória objektum vagy null ha nem található
   */
  async findById(id) {
    // Log metódus kezdete
    console.log('kategoriaRepository.findById - KEZDÉS', id);
    // Kategória lekérése kapcsolódó adatokkal (populate)
    const kategoria = await Kategoria.findById(id)
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok betöltése
    // Log metódus vége
    console.log('kategoriaRepository.findById - VÉGE', kategoria);
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
    // Log metódus kezdete
    console.log('kategoriaRepository.findAll - KEZDÉS', szurok);
    // MongoDB query objektum építése
    const query = {};
    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) query.letrehozo = szurok.letrehozo;
    // Név szerinti szűrés (részleges egyezés, kis/nagybetű érzéketlen)
    if (szurok.nev) query.nev = { $regex: szurok.nev, $options: 'i' };
    // Kategóriák lekérése kapcsolódó adatokkal
    const kategoriak = await Kategoria.find(query)
      .sort({ letrehozva: -1 })
      .populate('letrehozo', 'eemberNev');
    // Log metódus vége
    console.log('kategoriaRepository.findAll - VÉGE', kategoriak.length);
    return kategoriak;
  }

  // ----- KATEGÓRIA KERESÉSE NÉV ALAPJÁN -----
  /**
   * Egy kategória keresése név alapján (egyedi név ellenőrzéshez)
   * @param {string} nev - A kategória neve
   * @returns {Promise<Object|null>} A kategória objektum vagy null
   */
  async findByNev(nev) {
    // Log metódus kezdete
    console.log('kategoriaRepository.findByNev - KEZDÉS', nev);
    // Kategória keresése név alapján (kis/nagybetű független)
    const kategoria = await Kategoria.findOne({
      nev: { $regex: `^${nev}$`, $options: 'i' }
    });
    // Log metódus vége
    console.log('kategoriaRepository.findByNev - VÉGE', kategoria);
    return kategoria;
  }

  // ----- KATEGÓRIÁK KERESÉSE SZÜLŐ ALAPJÁN -----
  /**
   * Egy szülő entitáshoz tartozó közvetlen gyerek kategóriák lekérdezése
   * A kártyastóc bogár logikájához szükséges - gyerekek megtalálásához
   * @param {string} szuloId - A szülő entitás MongoDB ObjectId-ja
   * @param {number} limit - Maximum ennyi kategória (alapértelmezett: 999999)
   * @param {number} skip - Ennyi kategória kihagyása lapozáshoz
   * @returns {Promise<Array>} Gyerek kategóriák tömb
   */
  async findBySzuloId(szuloId, limit = 999999, skip = 0) {
    // Log metódus kezdete
    console.log('kategoriaRepository.findBySzuloId - KEZDÉS', { szuloId, limit, skip });
    // Közvetlen gyerek kategóriák lekérése szülő ID alapján
    const kategoriak = await Kategoria.find({ szuloId: szuloId })
      .sort({ letrehozva: -1 }) // Legújabbak előre
      .limit(limit)
      .skip(skip)
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok betöltése
    // Log metódus vége
    console.log('kategoriaRepository.findBySzuloId - VÉGE', kategoriak.length);
    return kategoriak;
  }

  // ----- KATEGÓRIA SZÜLŐJÉNEK FRISSÍTÉSE -----
  /**
   * Egy kategória szülőjének módosítása
   * A törlési kaszkádhoz szükséges - ha egy szülő törlődik,
   * a gyerekek megkapják a törölt szülő saját szülőjét
   * @param {string} kategoriaId - A kategória MongoDB ObjectId-ja
   * @param {string|null} ujSzuloId - Új szülő ObjectId-ja (lehet null)
   * @param {string|null} ujSzuloTipus - Új szülő típusa (lehet null)
   * @returns {Promise<Object|null>} Frissített kategória vagy null
   */
  async updateSzuloId(kategoriaId, ujSzuloId, ujSzuloTipus) {
    // Log metódus kezdete
    console.log('kategoriaRepository.updateSzuloId - KEZDÉS', { kategoriaId, ujSzuloId, ujSzuloTipus });
    // Kategória szülőjének frissítése
    const frissitettKategoria = await Kategoria.findByIdAndUpdate(
      kategoriaId, // Keresési feltétel: ID
      {
        $set: {
          szuloId: ujSzuloId,       // Új szülő ID
          szuloTipus: ujSzuloTipus  // Új szülő típus
        }
      },
      { new: true } // Frissített dokumentumot ad vissza
    );
    // Log metódus vége
    console.log('kategoriaRepository.updateSzuloId - VÉGE', frissitettKategoria);
    return frissitettKategoria;
  }

  // ----- KATEGÓRIA FRISSÍTÉSE -----
  /**
   * Egy kategória módosítása ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített kategória vagy null
   */
  async updateById(id, frissitesek) {
    // Log metódus kezdete
    console.log('kategoriaRepository.updateById - KEZDÉS', { id, frissitesek });
    // Kategória frissítése és a frissített verzió visszaadása
    const frissitettKategoria = await Kategoria.findByIdAndUpdate(
      id,
      { $set: frissitesek },
      { new: true, runValidators: true }
    ).populate('letrehozo', 'eemberNev');
    // Log metódus vége
    console.log('kategoriaRepository.updateById - VÉGE', frissitettKategoria);
    return frissitettKategoria;
  }

  // ----- KATEGÓRIA TÖRLÉSE -----
  /**
   * Egy kategória törlése ID alapján
   * @param {string} id - A kategória MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt kategória vagy null
   */
  async deleteById(id) {
    // Log metódus kezdete
    console.log('kategoriaRepository.deleteById - KEZDÉS', id);
    // Kategória törlése és a törölt dokumentum visszaadása
    const toroltKategoria = await Kategoria.findByIdAndDelete(id);
    // Log metódus vége
    console.log('kategoriaRepository.deleteById - VÉGE', toroltKategoria);
    return toroltKategoria;
  }

  // ----- KATEGÓRIÁK SZÁMLÁLÁSA -----
  /**
   * Összes kategória megszámlálása (opcionális szűrőkkel)
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Kategóriák száma
   */
  async count(szurok = {}) {
    // Log metódus kezdete
    console.log('kategoriaRepository.count - KEZDÉS', szurok);
    // MongoDB query objektum építése
    const query = {};
    if (szurok.letrehozo) query.letrehozo = szurok.letrehozo;
    if (szurok.nev) query.nev = { $regex: szurok.nev, $options: 'i' };
    // Kategóriák megszámlálása
    const darab = await Kategoria.countDocuments(query);
    // Log metódus vége
    console.log('kategoriaRepository.count - VÉGE', darab);
    return darab;
  }
}

// Repository exportálása
module.exports = new KategoriaRepository();