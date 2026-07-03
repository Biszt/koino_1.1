// backend/controllers/pakliController.js

// --- IMPORTÁLÁSOK ---
const pakliService = require('../services/pakliService');

// --- PAKLI CONTROLLER OSZTÁLY ---
class PakliController {

    // ----- PAKLI LEKÉRÉSE -----
    // GET /api/pakli
    // A kiválasztott entitás függvényében összeállítja és visszaküldi a paklit.
    // Ha nincs megadva entitás, a legerősebb gyökértől indul.
    // @param {Object} req - Express request objektum
    // @param {Object} res - Express response objektum
    async pakliLekerese(req, res) {
        console.log('pakliLekerese endpoint hívás - KEZDÉS', req.query);

        try {
            // 1. LÉPÉS - QUERY PARAMÉTEREK KIOLVASÁSA
            // Mindkét paraméter opcionális - ha nincs megadva, a legerősebb gyökértől indul
            const { entitasId, entitasTipus } = req.query;

            // 2. LÉPÉS - RÉSZLEGES PARAMÉTER ELLENŐRZÉS
            // Ha az egyik meg van adva, a másiknak is kötelezőnek kell lennie
            if (entitasId && !entitasTipus) {
                return res.status(400).json({
                    message: 'Ha entitasId meg van adva, az entitasTipus megadása is kötelező'
                });
            }
            if (!entitasId && entitasTipus) {
                return res.status(400).json({
                    message: 'Ha entitasTipus meg van adva, az entitasId megadása is kötelező'
                });
            }

            // 3. LÉPÉS - ENTITÁSTÍPUS VALIDÁLÁSA (ha meg van adva)
            const megengedettTipusok = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'];
            if (entitasTipus && !megengedettTipusok.includes(entitasTipus)) {
                return res.status(400).json({
                    message: `Érvénytelen entitástípus. Megengedett értékek: ${megengedettTipusok.join(', ')}`
                });
            }

            // 4. LÉPÉS - SERVICE HÍVÁS
            const eredmeny = await pakliService.pakliotOsszeallitasa(
                entitasId ?? null,
                entitasTipus ?? null
            );

            // 5. LÉPÉS - SIKERES VÁLASZ
            console.log('pakliLekerese endpoint hívás - VÉGE', {
                kivalasztottEntitas: eredmeny.kivalasztottEntitas,
                paklimeret: eredmeny.pakli?.length ?? 0,       // ← ?. operátor
                testverekSzama: eredmeny.testverek?.length ?? 0 // ← ?. operátor
            });

            return res.status(200).json({
                success: true,
                kivalasztottEntitas: eredmeny.kivalasztottEntitas,
                pakli: eredmeny.pakli,
                testverek: eredmeny.testverek ?? []  // ← üres tömb fallback
            });

        } catch (error) {
            // HIBAKEZLÉS
            console.error('pakliLekerese hiba', error.message);

            // Nem található hiba - 404
            if (error.message.includes('nem található')) {
                return res.status(404).json({
                    message: error.message
                });
            }

            // Általános szerverhiba - 500
            return res.status(500).json({
                message: 'Szerverhiba a pakli összeállítása során'
            });
        }
    }
    // ----- ENTITÁS SZÖVEG LEKÉRÉSE -----
// GET /api/pakli/szoveg/:entitasTipus/:entitasId
// Egyetlen entitás szöveg/leírás/indoklás mezőjét adja vissza.
// @param {Object} req - Express request objektum
// @param {Object} res - Express response objektum
async entitasSzovegLekerese(req, res) {
  console.log('entitasSzovegLekerese endpoint hívás - KEZDÉS', req.params);

  try {
    // 1. LÉPÉS - URL PARAMÉTEREK KIOLVASÁSA
    const { entitasId, entitasTipus } = req.params;

    // 2. LÉPÉS - ENTITÁSTÍPUS VALIDÁLÁSA
    const megengedettTipusok = ['Tartalom', 'Kategoria', 'TartalomTipus', 'Javaslat', 'Egyezmeny'];
    if (!megengedettTipusok.includes(entitasTipus)) {
      return res.status(400).json({
        message: `Érvénytelen entitástípus. Megengedett értékek: ${megengedettTipusok.join(', ')}`
      });
    }

    // 3. LÉPÉS - SERVICE HÍVÁS
    const szoveg = await pakliService.entitasSzovegLekerese(entitasId, entitasTipus);

    // 4. LÉPÉS - SIKERES VÁLASZ
    console.log('entitasSzovegLekerese endpoint hívás - VÉGE', { entitasId, entitasTipus });

    return res.status(200).json({
      success: true,
      entitasId,
      entitasTipus,
      szoveg
    });

  } catch (error) {
    // HIBAKEZELÉS
    console.error('entitasSzovegLekerese hiba', error.message);

    return res.status(500).json({
      message: 'Szerverhiba a szöveg lekérése során'
    });
  }
}
}


// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new PakliController();