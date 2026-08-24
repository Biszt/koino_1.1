// backend/middlewares/keresKorlatMiddleware.js

// =============================================
// KÉRÉS-KORLÁT (rate limit) — egyszerű, memóriában tartott számláló
// =============================================
//
// Felelősség: megakadályozni, hogy egy végpontot rövid idő alatt sokszor hívjanak
// ugyanarról a helyről. Két végpontnál kell:
//   - jelszó-helyreállítás kérése: enélkül bárki levél-özönt zúdíthatna egy e-emberre
//     (a mi nevünkben!), és a szolgáltatói keretünket is elhasználná
//   - megerősítő levél kérése: ugyanez
//
// ===== MIÉRT SAJÁT, MIÉRT NEM KÖNYVTÁR =====
// Az `express-rate-limit` bevett és jó csomag, de ez a néhány sor pontosan annyit tud,
// amennyi kell — és a koino eddig is minimális függőséggel dolgozik (a levél-kapu is a
// Node beépített fetch-ét használja). Egy csomaggal kevesebb, amit karban kell tartani.
//
// ===== A KORLÁTAI (fontos tudni!) =====
//  - MEMÓRIÁBAN tart: a szerver újraindulásakor nullázódik. Elfogadható, mert a védelem
//    célja a gyors ismétlés kifárasztása, nem a hosszú távú könyvelés.
//  - EGY példányra jó: ha valaha több backend-példány futna, mindegyik külön számolna.
//    Akkorra ez cserélendő közös tárra (pl. Redis).
//  - IP alapján számol. Egy megosztott hálózatról érkezők közösen fogyasztják a keretet
//    — a választott korlátok ezért nagyvonalúak.
// =============================================

// ===== A SZÁMLÁLÓK TÁROLÓJA =====
// kulcs: 'útvonal|ip' → { darab, ablakVege }
const szamlalok = new Map();

// ===== TAKARÍTÁS =====
// A lejárt bejegyzéseket időnként eldobjuk, hogy a Map ne nőjön korlátlanul.
// (Egy hosszan futó szerveren enélkül minden valaha látott IP bent maradna.)
const TAKARITAS_PERC = 10;
setInterval(() => {
  const most = Date.now();
  let torolt = 0;
  for (const [kulcs, ertek] of szamlalok.entries()) {
    if (ertek.ablakVege < most) {
      szamlalok.delete(kulcs);
      torolt++;
    }
  }
  if (torolt > 0) console.log('keresKorlat - takarítás', { torolt, maradt: szamlalok.size });
}, TAKARITAS_PERC * 60 * 1000).unref(); // unref: ne tartsa életben a folyamatot

// ===== A MIDDLEWARE ELŐÁLLÍTÁSA =====
// @param {Object} beallitasok
// @param {number} beallitasok.percek - az időablak hossza percben
// @param {number} beallitasok.max    - ennyi kérés engedélyezett az ablakban
// @param {string} beallitasok.uzenet - mit lásson, aki túllépte
// @returns {Function} Express middleware
function keresKorlat({ percek, max, uzenet }) {
  const ablakMs = percek * 60 * 1000;

  return (req, res, next) => {
    // Az IP kiolvasása. A koino Cloudflare Tunnel mögött fut, ezért a valódi kliens-IP
    // a 'cf-connecting-ip' fejlécben jön; e nélkül az express saját req.ip-je marad.
    // (A fejléc hamisítható, ha valaki közvetlenül a 8080-at éri el — ezért ez a védelem
    // kifárasztás ellen való, nem elszánt támadó ellen.)
    const ip = req.headers['cf-connecting-ip'] || req.ip || 'ismeretlen';
    const kulcs = `${req.baseUrl}${req.path}|${ip}`;
    const most = Date.now();

    let bejegyzes = szamlalok.get(kulcs);

    // Nincs még, vagy lejárt az ablaka → új ablak indul
    if (!bejegyzes || bejegyzes.ablakVege < most) {
      bejegyzes = { darab: 0, ablakVege: most + ablakMs };
    }

    bejegyzes.darab++;
    szamlalok.set(kulcs, bejegyzes);

    if (bejegyzes.darab > max) {
      const maradekMp = Math.ceil((bejegyzes.ablakVege - most) / 1000);
      console.log('keresKorlat - TÚLLÉPÉS', { utvonal: kulcs, darab: bejegyzes.darab, max });

      return res.status(429).json({
        success: false,
        message: uzenet ?? `Túl sok kérés. Próbáld újra ${maradekMp} másodperc múlva.`
      });
    }

    next();
  };
}

// ===== EXPORTÁLÁS =====
module.exports = { keresKorlat };
