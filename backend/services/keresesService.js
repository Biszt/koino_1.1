// backend/services/keresesService.js

// ===================================
// IMPORTOK
// ===================================
// A három cím-viselő entitástípus repository-ja. A kereső CSAK ezekre terjed ki
// (Gondolat címe = `cim`, Kategória/Gondolattípus címe = `nev`).
const GondolatRepository = require('../repositories/gondolatRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const GondolatTipusRepository = require('../repositories/gondolatTipusRepository');

// Az ág-szűréshez (agEntitasId): az ős-lánc bejárása a szuloKereses-sel — ugyanaz
// a minta, mint a Tudatpontok nézet ág-szűrésénél (tudatpontService).
const ErtesitesiBeallitasService = require('./ertesitesiBeallitasService');

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
  static TAMOGATOTT_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];

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
  // @param {string|null} agEntitasId - opcionális ÁG-SZŰRŐ: csak az adott entitás
  //   ága alatti találatok (maga az entitás vagy leszármazott) — a kártya-menük
  //   „Keresés" pontja használja (2026-07-18)
  // @returns {Promise<Array>} [{ entitasId, entitasTipus, cim }]
  async entitasKereses(kifejezes, tipusok = null, limit = 10, agEntitasId = null) {
    console.log('KeresesService.entitasKereses - KEZDÉS', { kifejezes, tipusok, limit, agEntitasId });

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

    // Ág-szűrésnél TÖBB jelöltet kérünk le típusonként (a szűrés sokat kidobhat),
    // és a szűrés UTÁN vágunk vissza a kért limitre
    const jeloltLimit = agEntitasId ? Math.min(limit * 5, 50) : limit;

    // Típusonkénti keresés PÁRHUZAMOSAN, majd egységes alakra hozva
    const reszEredmenyek = await Promise.all(
      kertTipusok.map(async (tipus) => {
        if (tipus === 'Gondolat') {
          const talalatok = await GondolatRepository.searchByCim(biztonsagosKifejezes, jeloltLimit);
          return talalatok.map(t => ({
            entitasId:    t._id.toString(),
            entitasTipus: 'Gondolat',
            cim:          t.cim ?? '(cím nélkül)'
          }));
        }
        if (tipus === 'Kategoria') {
          const talalatok = await KategoriaRepository.searchByNev(biztonsagosKifejezes, jeloltLimit);
          return talalatok.map(k => ({
            entitasId:    k._id.toString(),
            entitasTipus: 'Kategoria',
            cim:          k.nev ?? '(név nélkül)'
          }));
        }
        if (tipus === 'GondolatTipus') {
          const talalatok = await GondolatTipusRepository.searchByNev(biztonsagosKifejezes, jeloltLimit);
          return talalatok.map(tt => ({
            entitasId:    tt._id.toString(),
            entitasTipus: 'GondolatTipus',
            cim:          tt.nev ?? '(név nélkül)'
          }));
        }
        return [];
      })
    );

    // === ÁG-SZŰRÉS (ha kérték) ===
    // Egy találat akkor marad benn, ha az ős-láncában szerepel az agEntitasId
    // (vagyis maga az ág-entitás, vagy annak leszármazottja). A láncot
    // entitásonként csak egyszer járjuk be (cache).
    let szurtReszEredmenyek = reszEredmenyek;
    if (agEntitasId) {
      const agKulcs = agEntitasId.toString();
      const agAlattCache = new Map(); // '<tipus>:<id>' -> boolean

      const agAlattE = async (entitasId, entitasTipus) => {
        const kulcs = `${entitasTipus}:${entitasId}`;
        if (agAlattCache.has(kulcs)) return agAlattCache.get(kulcs);

        let benneVan = false;
        let aktId = entitasId;
        let aktTipus = entitasTipus;
        while (aktId && aktTipus) {
          if (aktId.toString() === agKulcs) { benneVan = true; break; }
          const szulo = await ErtesitesiBeallitasService.szuloKereses(aktId, aktTipus);
          if (!szulo) break;
          aktId = szulo.szuloId;
          aktTipus = szulo.szuloTipus;
        }

        agAlattCache.set(kulcs, benneVan);
        return benneVan;
      };

      szurtReszEredmenyek = [];
      for (const tipusTalalatok of reszEredmenyek) {
        const szurt = [];
        for (const talalat of tipusTalalatok) {
          if (await agAlattE(talalat.entitasId, talalat.entitasTipus)) szurt.push(talalat);
        }
        // A szűrés után visszavágunk a kért típusonkénti limitre
        szurtReszEredmenyek.push(szurt.slice(0, limit));
      }
    }

    // A típusonkénti tömböket egyetlen listába lapítjuk
    const eredmeny = szurtReszEredmenyek.flat();

    console.log('KeresesService.entitasKereses - VÉGE', { talalatok: eredmeny.length });
    return eredmeny;
  }
}

// ===================================
// EXPORTÁLÁS
// ===================================
// Singleton példány
module.exports = new KeresesService();
