// backend/controllers/ertekJavaslatController.js

// ===================================
// SERVICE IMPORTÁLÁSA
// ===================================
const ertekSzamitasService = require('../services/ertekSzamitasService');
const ErtekJavaslat = require('../models/ertekJavaslat');

// A támogatott entitástípusok (a modellből)
const ENTITAS_TIPUSOK = ErtekJavaslat.ENTITAS_TIPUSOK;

// ----- SEGÉD: ENTITÁSTÍPUS VALIDÁLÁSA -----
// Modul-szintű függvény (NEM osztálymetódus), mert az Express a controller
// metódusait kötés nélkül hívja – a `this` ilyenkor nem elérhető.
function ervenyesEntitasTipus(entitasTipus) {
  return ENTITAS_TIPUSOK.includes(entitasTipus);
}

// ===================================
// ÉRTÉK JAVASLAT CONTROLLER OSZTÁLY
// ===================================
// Felelősség: request/response kezelés, validáció, hibakezelés.
// Az érték-rendszer entitás-polimorf: minden végpont (entitasId + entitasTipus)
// párral azonosít (tartalom / kategória / tartalomtípus).
class ErtekJavaslatController {

  // ===================================
  // ÉRTÉK JAVASLAT LÉTREHOZÁSA VAGY MÓDOSÍTÁSA
  // ===================================
  /**
   * POST /api/ertekJavaslat
   * Body: { entitasId, entitasTipus, javaslatElfogadasiKuszob, reszveteliAranyKuszob,
   *         minimumDontesiIdo, maximumDontesiIdo }
   */
  async ertekJavaslatLetrehozasaVagyModositasa(req, res) {
    try {
      console.log('ertekJavaslatLetrehozasaVagyModositasa endpoint hívás');

      // 1. EMBER AZONOSÍTÁSA
      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({ message: 'Authentikáció szükséges' });
      }

      // 2. KÉRÉS ADATAI
      const {
        entitasId,
        entitasTipus,
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo
      } = req.body;

      console.log('Kérés adatai:', { entitasId, entitasTipus });

      // 3. KÖTELEZŐ MEZŐK
      if (!entitasId) {
        return res.status(400).json({ message: 'Az entitás ID megadása kötelező' });
      }
      if (!ervenyesEntitasTipus(entitasTipus)) {
        return res.status(400).json({
          message: `Érvénytelen entitástípus. Megengedett: ${ENTITAS_TIPUSOK.join(', ')}`
        });
      }
      if (javaslatElfogadasiKuszob === undefined || javaslatElfogadasiKuszob === null) {
        return res.status(400).json({ message: 'A érték javaslat elfogadási küszöb megadása kötelező' });
      }
      if (reszveteliAranyKuszob === undefined || reszveteliAranyKuszob === null) {
        return res.status(400).json({ message: 'A részvételi arány küszöb megadása kötelező' });
      }
      if (minimumDontesiIdo === undefined || minimumDontesiIdo === null) {
        return res.status(400).json({ message: 'A minimum döntési idő megadása kötelező' });
      }
      if (maximumDontesiIdo === undefined || maximumDontesiIdo === null) {
        return res.status(400).json({ message: 'A maximum döntési idő megadása kötelező' });
      }

      // 4. TÍPUS VALIDÁLÁS
      if (typeof javaslatElfogadasiKuszob !== 'number' || isNaN(javaslatElfogadasiKuszob)) {
        return res.status(400).json({ message: 'A érték javaslat elfogadási küszöbnek számnak kell lennie' });
      }
      if (typeof reszveteliAranyKuszob !== 'number' || isNaN(reszveteliAranyKuszob)) {
        return res.status(400).json({ message: 'A részvételi arány küszöbnek számnak kell lennie' });
      }
      if (typeof minimumDontesiIdo !== 'number' || isNaN(minimumDontesiIdo)) {
        return res.status(400).json({ message: 'A minimum döntési időnek számnak kell lennie' });
      }
      if (typeof maximumDontesiIdo !== 'number' || isNaN(maximumDontesiIdo)) {
        return res.status(400).json({ message: 'A maximum döntési időnek számnak kell lennie' });
      }

      // 5. SERVICE HÍVÁS
      const eredmeny = await ertekSzamitasService.ertekJavaslatLetrehozasaVagyModositasa(
        eemberId,
        entitasId,
        entitasTipus,
        javaslatElfogadasiKuszob,
        reszveteliAranyKuszob,
        minimumDontesiIdo,
        maximumDontesiIdo
      );

      // 6. SIKERES VÁLASZ
      res.status(200).json({
        message: 'Érték javaslat sikeresen mentve',
        ertekJavaslat: {
          javaslatElfogadasiKuszob: eredmeny.ertekJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: eredmeny.ertekJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: eredmeny.ertekJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: eredmeny.ertekJavaslat.maximumDontesiIdo,
          letrehozva: eredmeny.ertekJavaslat.letrehozva,
          modositva: eredmeny.ertekJavaslat.modositva
        },
        aktualisErtekek: eredmeny.hisztogram
      });

    } catch (error) {
      console.error('Érték javaslat létrehozási/módosítási hiba:', error.message);

      if (error.message.includes('tudatpont')) {
        return res.status(403).json({ message: error.message });
      } else if (error.message.includes('küszöb') ||
                 error.message.includes('egész szám') ||
                 error.message.includes('döntési idő')) {
        return res.status(400).json({ message: error.message });
      } else if (error.message.includes('nem található')) {
        return res.status(404).json({ message: error.message });
      } else {
        return res.status(500).json({
          message: 'Szerverhiba a érték javaslat mentésekor',
          hiba: error.message
        });
      }
    }
  }

  // ===================================
  // AKTUÁLIS ÉRTÉKEK LEKÉRÉSE
  // ===================================
  /**
   * GET /api/ertekJavaslat/aktualis/:entitasTipus/:entitasId
   */
  async aktualisErtekekLekerese(req, res) {
    try {
      console.log('aktualisErtekekLekerese endpoint hívás');

      const { entitasTipus, entitasId } = req.params;

      if (!entitasId) {
        return res.status(400).json({ message: 'Az entitás ID megadása kötelező' });
      }
      if (!ervenyesEntitasTipus(entitasTipus)) {
        return res.status(400).json({ message: 'Érvénytelen entitástípus' });
      }

      const aktualisErtekek = await ertekSzamitasService.aktulisErtekekLekerese(entitasId, entitasTipus);

      res.status(200).json({
        entitasId: entitasId,
        entitasTipus: entitasTipus,
        javaslatElfogadasiKuszob: aktualisErtekek.javaslatElfogadasiKuszob,
        reszveteliAranyKuszob: aktualisErtekek.reszveteliAranyKuszob,
        aktualMinimumDontesiIdo: aktualisErtekek.aktualMinimumDontesiIdo,
        aktualMaximumDontesiIdo: aktualisErtekek.aktualMaximumDontesiIdo,
        osszesJavaslat: aktualisErtekek.osszesErtekJavaslat,
        utolsoFrissites: aktualisErtekek.utolsoFrissites
      });

    } catch (error) {
      console.error('Aktuális értékek lekérési hiba:', error.message);
      if (error.message.includes('nem található')) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({
        message: 'Szerverhiba az aktuális értékek lekérésekor',
        hiba: error.message
      });
    }
  }

  // ===================================
  // EMBER SAJÁT ÉRTÉK JAVASLATA
  // ===================================
  /**
   * GET /api/ertekJavaslat/sajat/:entitasTipus/:entitasId
   */
  async sajatErtekJavaslatLekerese(req, res) {
    try {
      console.log('sajatErtekJavaslatLekerese endpoint hívás');

      const eemberId = req.user?.id;
      if (!eemberId) {
        return res.status(401).json({ message: 'Authentikáció szükséges' });
      }

      const { entitasTipus, entitasId } = req.params;
      if (!entitasId) {
        return res.status(400).json({ message: 'Az entitás ID megadása kötelező' });
      }
      if (!ervenyesEntitasTipus(entitasTipus)) {
        return res.status(400).json({ message: 'Érvénytelen entitástípus' });
      }

      const ertekJavaslat = await ertekSzamitasService.eemberErtekJavaslatanakLekerese(
        eemberId,
        entitasId,
        entitasTipus
      );

      if (!ertekJavaslat) {
        return res.status(404).json({
          message: 'Nincs javaslatod ehhez az entitáshoz',
          vanJavaslat: false
        });
      }

      res.status(200).json({
        vanJavaslat: true,
        ertekJavaslat: {
          javaslatElfogadasiKuszob: ertekJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: ertekJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: ertekJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: ertekJavaslat.maximumDontesiIdo,
          letrehozva: ertekJavaslat.letrehozva,
          modositva: ertekJavaslat.modositva
        }
      });

    } catch (error) {
      console.error('Saját érték javaslat lekérési hiba:', error.message);
      return res.status(500).json({
        message: 'Szerverhiba a érték javaslat lekérésekor',
        hiba: error.message
      });
    }
  }

  // ===================================
  // ENTITÁS RÉSZLETES ADATAI ÉRTÉKEKKEL
  // ===================================
  /**
   * GET /api/ertekJavaslat/reszletek/:entitasTipus/:entitasId
   * Aktuális (medián) értékek + a eember saját javaslata (ha be van jelentkezve).
   */
  async tartalomErtekReszletei(req, res) {
    try {
      console.log('tartalomErtekReszletei endpoint hívás');

      const eemberId = req.user?.id || null;
      const { entitasTipus, entitasId } = req.params;

      if (!entitasId) {
        return res.status(400).json({ message: 'Az entitás ID megadása kötelező' });
      }
      if (!ervenyesEntitasTipus(entitasTipus)) {
        return res.status(400).json({ message: 'Érvénytelen entitástípus' });
      }

      const aktualisErtekek = await ertekSzamitasService.aktulisErtekekLekerese(entitasId, entitasTipus);

      let eemberJavaslat = null;
      if (eemberId) {
        eemberJavaslat = await ertekSzamitasService.eemberErtekJavaslatanakLekerese(
          eemberId,
          entitasId,
          entitasTipus
        );
      }

      res.status(200).json({
        entitasId: entitasId,
        entitasTipus: entitasTipus,
        aktualisErtekek: {
          javaslatElfogadasiKuszob: aktualisErtekek.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: aktualisErtekek.reszveteliAranyKuszob,
          aktualMinimumDontesiIdo: aktualisErtekek.aktualMinimumDontesiIdo,
          aktualMaximumDontesiIdo: aktualisErtekek.aktualMaximumDontesiIdo,
          osszesJavaslat: aktualisErtekek.osszesErtekJavaslat,
          utolsoFrissites: aktualisErtekek.utolsoFrissites
        },
        eemberJavaslat: eemberJavaslat ? {
          javaslatElfogadasiKuszob: eemberJavaslat.javaslatElfogadasiKuszob,
          reszveteliAranyKuszob: eemberJavaslat.reszveteliAranyKuszob,
          minimumDontesiIdo: eemberJavaslat.minimumDontesiIdo,
          maximumDontesiIdo: eemberJavaslat.maximumDontesiIdo,
          letrehozva: eemberJavaslat.letrehozva,
          modositva: eemberJavaslat.modositva
        } : null
      });

    } catch (error) {
      console.error('Entitás érték részletek lekérési hiba:', error.message);
      if (error.message.includes('nem található')) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({
        message: 'Szerverhiba a részletek lekérésekor',
        hiba: error.message
      });
    }
  }

  // ===================================
  // ÉRTÉK JAVASLATOK ELOSZLÁSA
  // ===================================
  /**
   * GET /api/ertekJavaslat/eloszlas/:entitasTipus/:entitasId
   */
  async ertekEloszlasLekerese(req, res) {
    try {
      console.log('ertekEloszlasLekerese endpoint hívás');

      const { entitasTipus, entitasId } = req.params;
      if (!entitasId) {
        return res.status(400).json({ message: 'Az entitás ID megadása kötelező' });
      }
      if (!ervenyesEntitasTipus(entitasTipus)) {
        return res.status(400).json({ message: 'Érvénytelen entitástípus' });
      }

      const eloszlas = await ertekSzamitasService.ertekEloszlasLekerese(entitasId, entitasTipus);
      return res.status(200).json(eloszlas);

    } catch (error) {
      console.error('Érték-eloszlás lekérési hiba:', error.message);
      if (error.message.includes('nem található')) {
        return res.status(404).json({ message: error.message });
      }
      return res.status(500).json({
        message: 'Szerverhiba az érték-eloszlás lekérésekor',
        hiba: error.message
      });
    }
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
module.exports = new ErtekJavaslatController();
