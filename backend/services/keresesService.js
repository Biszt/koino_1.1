// backend/services/keresesService.js

// ===================================
// IMPORTOK
// ===================================
// A három cím-viselő entitástípus repository-ja. A kereső CSAK ezekre terjed ki
// (Tartalom címe = `cim`, Kategória/Tartalomtípus címe = `nev`).
const TartalomRepository = require('../repositories/tartalomRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const TartalomTipusRepository = require('../repositories/tartalomTipusRepository');

// ===================================
// KERESÉS SERVICE OSZTÁLY
// ===================================
// Felelősség: cím/név alapú entitás-keresés a frontend közös keresőjéhez.
// Egységes találat-alakot ad vissza: { entitasId, entitasTipus, cim }.
// Használják: keresesController → GET /api/kereses; a frontend EntitasKeresoMezo
// és a szövegszerkesztő EntitasHivatkozasPanel.
class KeresesService {

  // A kereső által támogatott entitástípusok (cím-viselők).
  // Ha a hívó nem ad meg típust, mind a hármon keresünk.
  static TAMOGATOTT_TIPUSOK = ['Tartalom', 'Kategoria', 'TartalomTipus'];

  // ===================================
  // REGEX-BIZTOS KIFEJEZÉS
  // ===================================
  // A felhasználói szöveget escape-eljük, hogy a regex-metakarakterek
  // (pl. '.', '*', '(') ne törjék el a keresést, és ne dobjon a MongoDB hibát.
  // @param {string} szoveg - A nyers keresőszöveg
  // @returns {string} Regex-be biztonságosan illeszthető szöveg
  _regexEscape(szoveg) {
    return szoveg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===================================
  // ENTITÁS KERESÉSE CÍM/NÉV ALAPJÁN
  // ===================================
  // @param {string} kifejezes - A keresett cím/név-részlet
  // @param {Array<string>} tipusok - Melyik típusokon keressen (alap: mind a három)
  // @param {number} limit - Típusonkénti maximum találat
  // @returns {Promise<Array>} [{ entitasId, entitasTipus, cim }]
  async entitasKereses(kifejezes, tipusok = null, limit = 10) {
    console.log('KeresesService.entitasKereses - KEZDÉS', { kifejezes, tipusok, limit });

    // Üres vagy túl rövid keresés: nincs értelme lekérdezni
    const tisztitott = (kifejezes ?? '').trim();
    if (!tisztitott) {
      console.log('KeresesService.entitasKereses - VÉGE (üres kifejezés)');
      return [];
    }

    // Csak a támogatott típusokat tartjuk meg; ha nincs megadva, mind a három
    const kertTipusok = (Array.isArray(tipusok) && tipusok.length > 0)
      ? tipusok.filter(t => KeresesService.TAMOGATOTT_TIPUSOK.includes(t))
      : KeresesService.TAMOGATOTT_TIPUSOK;

    // Regex-biztos kifejezés a repository-knak
    const biztonsagosKifejezes = this._regexEscape(tisztitott);

    // Típusonkénti keresés PÁRHUZAMOSAN, majd egységes alakra hozva
    const reszEredmenyek = await Promise.all(
      kertTipusok.map(async (tipus) => {
        if (tipus === 'Tartalom') {
          const talalatok = await TartalomRepository.searchByCim(biztonsagosKifejezes, limit);
          return talalatok.map(t => ({
            entitasId:    t._id.toString(),
            entitasTipus: 'Tartalom',
            cim:          t.cim ?? '(cím nélkül)'
          }));
        }
        if (tipus === 'Kategoria') {
          const talalatok = await KategoriaRepository.searchByNev(biztonsagosKifejezes, limit);
          return talalatok.map(k => ({
            entitasId:    k._id.toString(),
            entitasTipus: 'Kategoria',
            cim:          k.nev ?? '(név nélkül)'
          }));
        }
        if (tipus === 'TartalomTipus') {
          const talalatok = await TartalomTipusRepository.searchByNev(biztonsagosKifejezes, limit);
          return talalatok.map(tt => ({
            entitasId:    tt._id.toString(),
            entitasTipus: 'TartalomTipus',
            cim:          tt.nev ?? '(név nélkül)'
          }));
        }
        return [];
      })
    );

    // A típusonkénti tömböket egyetlen listába lapítjuk
    const eredmeny = reszEredmenyek.flat();

    console.log('KeresesService.entitasKereses - VÉGE', { talalatok: eredmeny.length });
    return eredmeny;
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Singleton példány
module.exports = new KeresesService();
