// backend/services/platformStatisztikaService.js

// ===== IMPORTOK =====
// eEmber Repository: az eemberek számának lekéréséhez
const eEmberRepository = require('../repositories/eemberRepository');

// Tartalom Repository: a tartalmak számának lekéréséhez
const TartalomRepository = require('../repositories/tartalomRepository');

// ===== PLATFORM STATISZTIKA SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza a platform szintű statisztikák üzleti logikáját
// Feladata: több repository-ból összegyűjti az adatokat és visszaadja
class PlatformStatisztikaService {

  // ===== PLATFORM STATISZTIKA LEKÉRÉSE =====
  // Az összes platformszintű statisztikai adat lekérése egy hívással
  // Használat: Főoldal alsó statisztika sáv tölti be
  // @returns {Promise<Object>} { eemberekSzama, tartalmakSzama }
  async platformStatisztikaLekereses() {
    console.log('platformStatisztikaService.platformStatisztikaLekereses - KEZDÉS');

    // === 1. LÉPÉS: PÁRHUZAMOS LEKÉRÉS ===
    // Promise.all: mindkét lekérés egyszerre indul el, nem egymás után
    // Ez gyorsabb, mint egymás után várni rájuk
    const [eemberekSzama, tartalmakSzama] = await Promise.all([
      eEmberRepository.countAll(),     // Összes eember száma
      TartalomRepository.countAll()    // Összes tartalom száma
    ]);

    // === 2. LÉPÉS: EREDMÉNY ÖSSZEÁLLÍTÁSA ===
    const statisztika = {
      eemberekSzama,   // Platformon regisztrált eemberek száma
      tartalmakSzama   // Platformon lévő tartalmak száma
    };

    console.log('platformStatisztikaService.platformStatisztikaLekereses - VÉGE', { statisztika });
    return statisztika;
  }

}

// ===== EXPORTÁLÁS =====
// Service osztály SINGLETON példány exportálása
module.exports = new PlatformStatisztikaService();