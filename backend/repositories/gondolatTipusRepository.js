// backend/repositories/gondolatTipusRepository.js

// ===== GONDOLAT TÍPUS MODEL IMPORTÁLÁSA =====
const GondolatTipus = require('../models/gondolatTipus');

// ===== GONDOLAT TÍPUS REPOSITORY OSZTÁLY =====
// Ez a réteg felelős a gondolat típus adatok adatbázis műveleteiért
class GondolatTipusRepository {
  
  // ----- ÚJ GONDOLAT TÍPUS LÉTREHOZÁSA -----
  /**
   * Új gondolat típus mentése az adatbázisba
   * @param {Object} gondolatTipusAdatok - A gondolat típus adatai
   * @returns {Promise<Object>} A létrehozott gondolat típus objektum
   */
  async create(gondolatTipusAdatok) {
    // Új gondolat típus példány létrehozása
    const ujGondolatTipus = new GondolatTipus(gondolatTipusAdatok);
    
    // Mentés az adatbázisba
    const mentettGondolatTipus = await ujGondolatTipus.save();
    
    return mentettGondolatTipus;
  }
  
  // ----- GONDOLAT TÍPUS KERESÉSE ID ALAPJÁN -----
  /**
   * Egy gondolat típus lekérdezése ID alapján
   * @param {string} id - A gondolat típus MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A gondolat típus objektum vagy null ha nem található
   */
  async findById(id) {
    // Gondolat típus lekérése kapcsolódó adatokkal (populate)
    const gondolatTipus = await GondolatTipus.findById(id)
      .populate('szerkesztok.eemberId', 'eemberNev'); // Létrehozó adatok betöltése
    
    return gondolatTipus;
  }
  
  // ----- GONDOLAT TÍPUSOK LISTÁZÁSA SZŰRŐKKEL -----
  /**
   * Gondolat típusok lekérdezése különböző szűrési feltételekkel
   * @param {Object} szurok - Szűrési feltételek objektum
   * @param {string} szurok.letrehozo - Szűrés létrehozó szerint
   * @param {string} szurok.nev - Szűrés név szerint (részleges egyezés)
   * @returns {Promise<Array>} Gondolat típusok tömb
   */
  async findAll(szurok = {}) {
    // MongoDB query objektum építése
    const query = {};
    
    // Létrehozó szerinti szűrés
    if (szurok.letrehozo) {
      // Szerkesztő szerinti szűrés a tömbösített mezőn (a `letrehozo` kulcsnevet megtartjuk)
      query['szerkesztok.eemberId'] = szurok.letrehozo;
    }
    
    // Név szerinti szűrés (részleges egyezés, kis/nagybetű érzéketlen)
    if (szurok.nev) {
      query.nev = { 
        $regex: szurok.nev,      // Reguláris kifejezés keresés
        $options: 'i'             // Case-insensitive (kis/nagybetű független)
      };
    }
    
    // Gondolat típusok lekérése kapcsolódó adatokkal
    const gondolatTipusok = await GondolatTipus.find(query)
      .sort({ letrehozva: -1 })                 // Legújabbak előre rendezés
      .populate('szerkesztok.eemberId', 'eemberNev'); // Létrehozó adatok
    
    return gondolatTipusok;
  }
  
  // ----- GONDOLAT TÍPUS KERESÉSE NÉV ALAPJÁN -----
  /**
   * Egy gondolat típus keresése név alapján (egyedi név ellenőrzéshez)
   * @param {string} nev - A gondolat típus neve
   * @returns {Promise<Object|null>} A gondolat típus objektum vagy null
   */
  async findByNev(nev) {
    // Gondolat típus keresése név alapján (kis/nagybetű független)
    const gondolatTipus = await GondolatTipus.findOne({ 
      nev: { 
        $regex: `^${nev}$`,  // Pontos egyezés
        $options: 'i'         // Case-insensitive
      } 
    });
    
    return gondolatTipus;
  }
  
  // ----- GONDOLAT TÍPUS FRISSÍTÉSE -----
  /**
   * Egy gondolat típus módosítása ID alapján
   * @param {string} id - A gondolat típus MongoDB ObjectId-ja
   * @param {Object} frissitesek - A frissítendő mezők objektum
   * @returns {Promise<Object|null>} A frissített gondolat típus vagy null
   */
  async updateById(id, frissitesek) {
    // Gondolat típus frissítése és a frissített verzió visszaadása
    const frissitettGondolatTipus = await GondolatTipus.findByIdAndUpdate(
      id,
      { $set: frissitesek }, // $set operátor - csak a megadott mezőket frissíti
      { 
        new: true,            // Frissített dokumentumot ad vissza (nem a régit)
        runValidators: true   // Mongoose validációk futtatása
      }
    )
    .populate('szerkesztok.eemberId', 'eemberNev');
    
    return frissitettGondolatTipus;
  }
  
  // ----- GONDOLAT TÍPUS TorlesE -----
  /**
   * Egy gondolat típus törlése ID alapján
   * @param {string} id - A gondolat típus MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt gondolat típus vagy null
   */
  async deleteById(id) {
    // Gondolat típus törlése és a törölt dokumentum visszaadása
    const toroltGondolatTipus = await GondolatTipus.findByIdAndDelete(id);
    
    return toroltGondolatTipus;
  }
  
  // ----- GONDOLAT TÍPUSOK KERESÉSE NÉV ALAPJÁN (RÉSZLEGES) -----
  /**
   * A cím-alapú entitás-kereső backendje (GET /api/kereses).
   * Kis/nagybetű független, RÉSZLEGES egyezés a `nev` mezőn (nem pontos, mint a findByNev).
   * Csak a keresőnek szükséges könnyű mezőket adja vissza (nincs populate).
   * @param {string} kifejezes - A keresett név-részlet (regex-biztos, előre escape-elve)
   * @param {number} limit - Maximum ennyi találat
   * @returns {Promise<Array>} [{ _id, nev }]
   */
  async searchByNev(kifejezes, limit = 10) {
    console.log('gondolatTipusRepository.searchByNev - KEZDÉS', { kifejezes, limit });

    const talalatok = await GondolatTipus.find(
      { nev: { $regex: kifejezes, $options: 'i' } }, // Név-részlet, kis/nagybetű függetlenül
      { nev: 1 }                                     // Csak a név (és az _id) kell
    )
      .sort({ letrehozva: -1 }) // Legújabbak előre
      .limit(limit)
      .lean();                  // Sima JS objektum

    console.log('gondolatTipusRepository.searchByNev - VÉGE', { talalatok: talalatok.length });
    return talalatok;
  }

  // ----- GONDOLAT TÍPUSOK SZÁMLÁLÁSA -----
  /**
   * Összes gondolat típus megszámlálása (opcionális szűrőkkel)
   * @param {Object} szurok - Szűrési feltételek (opcionális)
   * @returns {Promise<number>} Gondolat típusok száma
   */
  async count(szurok = {}) {
    // MongoDB query objektum építése (ugyanaz, mint a findAll-nál)
    const query = {};
    
    if (szurok.letrehozo) {
      // Szerkesztő szerinti szűrés a tömbösített mezőn (a `letrehozo` kulcsnevet megtartjuk)
      query['szerkesztok.eemberId'] = szurok.letrehozo;
    }
    
    if (szurok.nev) {
      query.nev = { 
        $regex: szurok.nev, 
        $options: 'i' 
      };
    }
    
    // Gondolat típusok megszámlálása
    const darab = await GondolatTipus.countDocuments(query);

    return darab;
  }

  // ----- ÖSSZES GONDOLATTÍPUS SZÁMA -----
  // A platform-statisztika (alsó sáv) használja. Szűrés nélkül minden típust számol.
  // @returns {Promise<number>}
  async countAll() {
    console.log('gondolatTipusRepository.countAll - KEZDÉS');
    const szam = await GondolatTipus.countDocuments();
    console.log('gondolatTipusRepository.countAll - VÉGE', { szam });
    return szam;
  }
}

// Repository exportálása
module.exports = new GondolatTipusRepository();
