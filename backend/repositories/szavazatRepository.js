// backend/repositories/szavazatRepository.js

// ===================================
// SZAVAZAT MODEL IMPORTÁLÁSA
// ===================================
const Szavazat = require('../models/szavazat');

// ===================================
// SZAVAZAT REPOSITORY OSZTÁLY
// ===================================
// Ez a réteg felelős a szavazat adatok adatbázis műveleteiért
class SzavazatRepository {

  // ===================================
  // ----- ÚJ SZAVAZAT LÉTREHOZÁSA -----
  // ===================================
  /**
   * Új szavazat mentése az adatbázisba
   * @param {Object} szavazatAdatok - A szavazat adatai
   * @returns {Promise<Object>} A létrehozott szavazat objektum
   */
  async create(szavazatAdatok) {
    // Új szavazat példány létrehozása
    const ujSzavazat = new Szavazat(szavazatAdatok);
    
    // Mentés az adatbázisba
    const mentettSzavazat = await ujSzavazat.save();
    
    return mentettSzavazat;
  }

  // ===================================
  // ----- SZAVAZAT KERESÉSE -----
  // ===================================
  /**
   * Egy szavazat lekérdezése eember és javaslat alapján
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A szavazat objektum vagy null ha nem található
   */
  async findByeEmberAndJavaslat(eemberId, javaslatId) {
    // Keresés: egyedi index alapján (gyors!)
    const szavazat = await Szavazat.findOne({
      eemberId: eemberId,
      javaslatId: javaslatId
    })
    .populate('eemberId', 'eemberNev'); // eEmber adatok
    
    return szavazat;
  }

  // ===================================
  // ----- JAVASLAT ÖSSZES SZAVAZATA -----
  // ===================================
  /**
   * Egy javaslat összes szavazatának lekérése
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Array>} Szavazatok tömb
   */
  async findByJavaslatId(javaslatId) {
    // Keresés: összes szavazat a javaslatra
    const szavazatok = await Szavazat.find({ javaslatId: javaslatId })
      .sort({ letrehozva: -1 }) // Legújabbak előre
      .populate('eemberId', 'eemberNev'); // eEmber adatok
    
    return szavazatok;
  }

  // ===================================
  // ----- EMBER ÖSSZES SZAVAZATA -----
  // ===================================
  /**
   * Egy eember összes szavazatának lekérése
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {number} limit - Maximum ennyi szavazat (opcionális)
   * @returns {Promise<Array>} Szavazatok tömb
   */
  async findByeEmberId(eemberId, limit = null) {
    // Query építése
    let query = Szavazat.find({ eemberId: eemberId })
      .sort({ modositva: -1 }) // Utoljára módosítottak előre
      .populate('javaslatId'); // Javaslat adatok
    
    // Ha van limit, alkalmazzuk
    if (limit) {
      query = query.limit(limit);
    }
    
    const szavazatok = await query;
    
    return szavazatok;
  }

  // ===================================
  // ----- SZAVAZAT LÉTREHOZÁSA VAGY FRISSÍTÉSE -----
  // ===================================
  /**
   * Szavazat létrehozása vagy frissítése (ha már létezik)
   * Használja a model static metódust
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @param {string} szavazatTipus - 'Tamogat' vagy 'Ellenez'
   * @param {boolean} kulonvalasIgeny - Kér-e külön ágat (alap: false)
   * @returns {Promise<Object>} A szavazat objektum
   */
  async createOrUpdate(eemberId, javaslatId, szavazatTipus, kulonvalasIgeny = false) {
    // Model static metódus használata
    const szavazat = await Szavazat.keresVagyLetrehoz(
      eemberId,
      javaslatId,
      szavazatTipus,
      kulonvalasIgeny
    );

    return szavazat;
  }

  // ===================================
  // ----- SZAVAZAT FRISSÍTÉSE -----
  // ===================================
  /**
   * Egy létező szavazat módosítása
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @param {string} ujSzavazatTipus - Az új szavazat típus
   * @returns {Promise<Object|null>} A frissített szavazat vagy null
   */
  async updateSzavazat(eemberId, javaslatId, ujSzavazatTipus) {
    // Szavazat frissítése
    const frissitettSzavazat = await Szavazat.findOneAndUpdate(
      {
        eemberId: eemberId,
        javaslatId: javaslatId
      },
      {
        $set: {
          szavazatTipus: ujSzavazatTipus,
          modositva: Date.now()
        }
      },
      {
        new: true, // Frissített dokumentumot ad vissza
        runValidators: true
      }
    )
    .populate('eemberId', 'eemberNev');
    
    return frissitettSzavazat;
  }

  // ===================================
  // ----- SZAVAZAT TorlesE -----
  // ===================================
  /**
   * Egy szavazat törlése
   * @param {string} eemberId - A eember MongoDB ObjectId-ja
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object|null>} A törölt szavazat vagy null
   */
  async deleteSzavazat(eemberId, javaslatId) {
    // Szavazat törlése
    const toroltSzavazat = await Szavazat.findOneAndDelete({
      eemberId: eemberId,
      javaslatId: javaslatId
    });
    
    return toroltSzavazat;
  }

  // ===================================
  // ----- TamogatÓK SZÁMLÁLÁSA -----
  // ===================================
  /**
   * Egy javaslat támogatóinak száma
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<number>} Támogatók száma
   */
  async countTamogatok(javaslatId) {
    // Model static metódus használata
    const szam = await Szavazat.tamogatokSzama(javaslatId);
    
    return szam;
  }

  // ===================================
  // ----- ELLENZŐK SZÁMLÁLÁSA -----
  // ===================================
  /**
   * Egy javaslat ellenzőinek száma
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<number>} Ellenzők száma
   */
  async countEllenzok(javaslatId) {
    // Model static metódus használata
    const szam = await Szavazat.ellenzokSzama(javaslatId);
    
    return szam;
  }

// ===================================
// ----- TARTÓZKODÓK SZÁMLÁLÁSA -----
// ===================================
/**
 * Egy javaslat tartózkodóinak száma
 * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
 * @returns {Promise<number>} Tartózkodók száma
 */
async countTartozkodok(javaslatId) {
  // Model static metódus használata
  const szam = await Szavazat.tartozkodokSzama(javaslatId);
  return szam;
}

  // ===================================
  // ----- ÖSSZES SZAVAZÓ SZÁMLÁLÁSA -----
  // ===================================
  /**
   * Egy javaslat összes szavazójának száma
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<number>} Összes szavazó száma
   */
  async countOsszesSzavazo(javaslatId) {
    // Model static metódus használata
    const szam = await Szavazat.osszesSzavazoSzama(javaslatId);
    
    return szam;
  }

  // ===================================
  // ----- SZAVAZÓK LISTÁJA -----
  // ===================================
  /**
   * Egy javaslat szavazóinak listája (eember ID-k)
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Array>} eEmber ID-k tömbje
   */
  async getSzavazokListaja(javaslatId) {
    // Model static metódus használata
    const eemberIds = await Szavazat.szavazokListaja(javaslatId);
    
    return eemberIds;
  }

  // ===================================
  // ----- JAVASLAT SZAVAZATAINAK TorlesE -----
  // ===================================
  /**
   * Egy javaslat összes szavazatának törlése
   * Használat: javaslat törlésekor
   * @param {string} javaslatId - A javaslat MongoDB ObjectId-ja
   * @returns {Promise<Object>} Törlési művelet eredménye
   */
  async deleteByJavaslatId(javaslatId) {
    // Összes szavazat törlése a javaslatra
    const eredmeny = await Szavazat.deleteMany({
      javaslatId: javaslatId
    });

    return eredmeny;
  }

  // ----- EGY EEMBER ÖSSZES SZAVAZATÁNAK TÖRLÉSE -----
  // Fiók-törléskor: az e-ember minden leadott szavazatának törlése.
  // @param {string} eemberId - Az e-ember MongoDB ObjectId-ja
  // @returns {Promise<Object>} Törlés eredménye (deletedCount)
  async deleteByeEmberId(eemberId) {
    console.log('szavazatRepository.deleteByeEmberId - KEZDÉS', { eemberId });

    const eredmeny = await Szavazat.deleteMany({ eemberId: eemberId });

    console.log('szavazatRepository.deleteByeEmberId - VÉGE', { torolt: eredmeny.deletedCount });
    return eredmeny;
  }
}

// ===================================
// REPOSITORY EXPORTÁLÁSA
// ===================================
// Repository exportálása
module.exports = new SzavazatRepository();
