// backend/repositories/meghivoRepository.js

// Felelősség: a Meghivo kollekció adatbázis-műveletei (CRUD).
// Csak technikai adatbázis hívások, NINCS üzleti logika!
// Használja: meghivoService.

// ===== MEGHÍVÓ MODEL IMPORTÁLÁSA =====
const Meghivo = require('../models/meghivo');

// ===== MEGHÍVÓ REPOSITORY OSZTÁLY =====
class MeghivoRepository {

  // ----- ÚJ MEGHÍVÓ LÉTREHOZÁSA -----
  // @param {Object} adatok - { kibocsatoEemberId, kod, tanusitva }
  // @returns {Promise} Létrehozott meghívó dokumentum
  async create(adatok) {
    console.log('MeghivoRepository.create - KEZDÉS', { kibocsatoEemberId: adatok.kibocsatoEemberId });

    const meghivo = new Meghivo(adatok);
    const eredmeny = await meghivo.save();

    console.log('MeghivoRepository.create - VÉGE', { id: eredmeny._id, kod: eredmeny.kod });
    return eredmeny;
  }

  // ----- MEGHÍVÓ KERESÉSE KÓD ALAPJÁN -----
  // Használat: regisztrációkor a kód érvényesítése
  // @param {string} kod - Meghívó kód
  // @returns {Promise} Meghívó dokumentum vagy null
  async findByKod(kod) {
    console.log('MeghivoRepository.findByKod - KEZDÉS', { kod });

    // A modell uppercase-szel tárol, ezért a keresés előtt is nagybetűsítünk
    const eredmeny = await Meghivo.findOne({ kod: kod.toUpperCase().trim() });

    console.log('MeghivoRepository.findByKod - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ----- MEGHÍVÓ KERESÉSE ID ALAPJÁN -----
  // Használat: visszavonásnál a jogosultság-ellenőrzéshez
  // @param {string} id - MongoDB ObjectId
  // @returns {Promise} Meghívó dokumentum vagy null
  async findById(id) {
    console.log('MeghivoRepository.findById - KEZDÉS', { id });

    const eredmeny = await Meghivo.findById(id);

    console.log('MeghivoRepository.findById - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ----- EGY E-EMBER SAJÁT MEGHÍVÓI -----
  // A „Meghívóim" listához: a kibocsátó összes meghívója, újabb elöl.
  // A felhasznaloEemberId-t populate-oljuk, hogy a lista mutathassa, KI
  // regisztrált a kóddal (eemberNev — az e-embernév nyilvános adat).
  // @param {string} kibocsatoEemberId - A kibocsátó e-ember ObjectId-ja
  // @returns {Promise} Meghívó dokumentumok tömbje
  async findByKibocsato(kibocsatoEemberId) {
    console.log('MeghivoRepository.findByKibocsato - KEZDÉS', { kibocsatoEemberId });

    const eredmeny = await Meghivo
      .find({ kibocsatoEemberId })
      .sort({ letrehozva: -1 })
      .populate('felhasznaloEemberId', 'eemberNev');

    console.log('MeghivoRepository.findByKibocsato - VÉGE', { darab: eredmeny.length });
    return eredmeny;
  }

  // ----- MEGHÍVÓ MENTÉSE (státusz-változás után) -----
  // A service a dokumentumon állítja át a mezőket, itt csak mentünk.
  // @param {Object} meghivo - Módosított Mongoose dokumentum
  // @returns {Promise} Mentett dokumentum
  async save(meghivo) {
    console.log('MeghivoRepository.save - KEZDÉS', { id: meghivo._id, statusz: meghivo.statusz });

    const eredmeny = await meghivo.save();

    console.log('MeghivoRepository.save - VÉGE', { id: eredmeny._id });
    return eredmeny;
  }

}

// ===== EXPORTÁLÁS =====
// Repository osztály SINGLETON példány exportálása
module.exports = new MeghivoRepository();
