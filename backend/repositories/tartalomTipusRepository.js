// backend/repositories/tartalomTipusRepository.js

// ===== TARTALOM TÍPUS MODEL IMPORTÁLÁSA =====
const TartalomTipus = require('../models/tartalomTipus');

// ===== TARTALOM TÍPUS REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a tartalom típus adatok adatbázis műveleteiért
class TartalomTipusRepository {
  
  // ----- ÚJ TARTALOM TÍPUS LÉTREHOZÁSA -----
  /**
   * Új tartalom típus mentése az adatbázisba
   * @param {Object} tartalomTipusAdatok - A tartalom típus adatai
   * @returns {Promise<Object>} A létrehozott tartalom típus objektum
   */
  async create(tartalomTipusAdatok) {
    // Új tartalom típus példány létrehozása
    const ujTartalomTipus = new TartalomTipus(tartalomTipusAdatok);
    
    // Mentés az adatbázisba
    const mentettTartalomTipus = await ujTartalomTipus.save();
    
    return mentettTartalomTipus;
  }
  
  // ----- TARTALOM TÍPUS KERESÉSE ID ALAPJÁN -----
  /**
   * Egy tartalom típus lekérdezése ID alapján
   * @param {string} id - A tartalom típus MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A tartalom típus objektum vagy null ha nem található
   */
  async findById(id) {
    // Tartalom típus lekérése kapcsolódó adatokkal (populate)
    const tartalomTipus = await TartalomTipus.findById(id)
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok betöltése
    
    return tartalomTipus;
  }
  
  // ----- TARTALOM TÍPUSOK LISTÁZÁSA SZŰRŐKKEL -----
  /**
   * Tartalom típusok lekérdezése különböző szűrési feltételekkel
   * @param {Object} szurok - Szűrési feltételek objektum
   * @param {string} szurok.letrehozo - Szűrés létrehozó szerint
   * @param {string} szurok.nev - Szűrés név szerint (részleges egyezés)
   * @returns {Promise<Array>} Tartalom típusok tömb
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
    
    // Tartalom típusok lekérése kapcsolódó adatokkal
    const tartalomTipusok = await TartalomTipus.find(query)
      .sort({ letrehozva: -1 })                 // Legújabbak előre rendezés
      .populate('letrehozo', 'eemberNev'); // Létrehozó adatok
    
    return tartalomTipusok;
  }
  
  // ----- TARTALOM TÍPUS KERESÉSE NÉV ALAPJÁN -----
  /**
   * Egy tartalom típus keresése név alapján (egyedi név ellenőrzéshez)
   * @param {string} nev - A tartalom típus neve
   * @returns {Promise<Object|null>} A tartalom típus objektum vagy null
   */
  async findByNev(nev) {
    // Tartalom típus keresése név alapján (kis/nagybetű független)
    const tartalomTipus = await TartalomTipus.findOne({ 
      nev: { 
        $regex: `^${nev}$`,  // Pontos egyezés
        $options: 'i'         // Case-insensitive
      } 
    });
    
    return tartalomTipus;
  }
  
  // ----- TARTALOM TÍPUS FRISSÍTÉSE -----
  /**
   * Egy tartalom típus módosítása ID alapján
   * @param {string} id - A tartalom típus MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített tartalom típus vagy null
   */
  async updateById(id, frissitesek) {
    // Tartalom típus frissítése és a frissített verzió visszaadása
    const frissitettTartalomTipus = await TartalomTipus.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true,            // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true   // Mongoose validációk futtatása
      }
    )
    .populate('letrehozo', 'eemberNev');
    
    return frissitettTartalomTipus;
  }
  
  // ----- TARTALOM TÍPUS TorlesE -----
  /**
   * Egy tartalom típus törlése ID alapján
   * @param {string} id - A tartalom típus MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt tartalom típus vagy null
   */
  async deleteById(id) {
    // Tartalom típus törlése és a törölt dokumentum visszaadása
    const toroltTartalomTipus = await TartalomTipus.findByIdAndDelete(id);
    
    return toroltTartalomTipus;
  }
  
  // ----- TARTALOM TÍPUSOK KERESÉSE NÉV ALAPJÁN (RÉSZLEGES) -----
  /**
   * A cím-alapú entitás-kereső backendje (GET /api/kereses).
   * Kis/nagybetű független, RÉSZLEGES egyezés a `nev` mezőn (nem pontos, mint a findByNev).
   * Csak a keresőnek szükséges könnyű mezőket adja vissza (nincs populate).
   * @param {string} kifejezes - A keresett név-részlet (regex-biztos, előre escape-elve)
   * @param {number} limit - Maximum ennyi találat
   * @returns {Promise<Array>} [{ _id, nev }]
   */
  async searchByNev(kifejezes, limit = 10) {
    console.log('tartalomTipusRepository.searchByNev - KEZDÉS', { kifejezes, limit });

    const talalatok = await TartalomTipus.find(
      { nev: { $regex: kifejezes, $options: 'i' } }, // Név-részlet, kis/nagybetű függetlenül
      { nev: 1 }                                     // Csak a név (és az _id) kell
    )
      .sort({ letrehozva: -1 }) // Legújabbak előre
      .limit(limit)
      .lean();                  // Sima JS objektum

    console.log('tartalomTipusRepository.searchByNev - VÉGE', { talalatok: talalatok.length });
    return talalatok;
  }

  // ----- TARTALOM TÍPUSOK SZÁMLÁLÁSA -----
  /**
   * Összes tartalom típus megszámlálása (opcionális szűrőkkel)
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Tartalom típusok száma
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
    
    // Tartalom típusok megszámlálása
    const darab = await TartalomTipus.countDocuments(query);

    return darab;
  }

  // ----- ÖSSZES TARTALOMTÍPUS SZÁMA -----
  // A platform-statisztika (alsó sáv) használja. Szűrés nélkül minden típust számol.
  // @returns {Promise<number>}
  async countAll() {
    console.log('tartalomTipusRepository.countAll - KEZDÉS');
    const szam = await TartalomTipus.countDocuments();
    console.log('tartalomTipusRepository.countAll - VÉGE', { szam });
    return szam;
  }
}

// Repository exportálása
module.exports = new TartalomTipusRepository();
