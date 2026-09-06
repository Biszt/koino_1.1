// backend/services/platformStatisztikaService.js

// ===== IMPORTOK =====
// A platform-statisztika (alsó sáv) az e-emberek számát és MIND AZ 5 entitástípus
// darabszámát megjeleníti — típusonként egy-egy repository countAll-jából.
const eEmberRepository = require('../repositories/eemberRepository');
const GondolatRepository = require('../repositories/gondolatRepository');
const KategoriaRepository = require('../repositories/kategoriaRepository');
const GondolatTipusRepository = require('../repositories/gondolatTipusRepository');
const JavaslatRepository = require('../repositories/javaslatRepository');
const EgyezmenyRepository = require('../repositories/egyezmenyRepository');

// ===== PLATFORM STATISZTIKA SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza a platform szintű statisztikák üzleti logikáját
// Feladata: több repository-ból összegyűjti az adatokat és visszaadja
class PlatformStatisztikaService {

  // ===== PLATFORM STATISZTIKA LEKÉRÉSE =====
  // Az összes platformszintű statisztikai adat lekérése egy hívással
  // Használat: Főoldal alsó statisztika sáv tölti be
  // @returns {Promise<Object>} { eemberekSzama, gondolatokSzama, kategoriakSzama,
  //   gondolatTipusokSzama, javaslatokSzama, egyezmenyekSzama }
  async platformStatisztikaLekereses() {
    console.log('platformStatisztikaService.platformStatisztikaLekereses - KEZDÉS');

    // === 1. LÉPÉS: PÁRHUZAMOS LEKÉRÉS ===
    // Promise.all: minden lekérés egyszerre indul, nem egymás után (gyorsabb).
    const [
      eemberekSzama,
      gondolatokSzama,
      kategoriakSzama,
      gondolatTipusokSzama,
      javaslatokSzama,
      egyezmenyekSzama
    ] = await Promise.all([
      eEmberRepository.countAll(),          // Összes e-ember
      GondolatRepository.countAll(),        // Összes gondolat
      KategoriaRepository.countAll(),       // Összes kategória
      GondolatTipusRepository.countAll(),   // Összes gondolattípus
      JavaslatRepository.countAll(),        // Összes javaslat
      EgyezmenyRepository.countAll()        // Összes egyezmény
    ]);

    // === 2. LÉPÉS: EREDMÉNY ÖSSZEÁLLÍTÁSA ===
    const statisztika = {
      eemberekSzama,          // Platformon regisztrált e-emberek száma
      gondolatokSzama,         // Gondolatok száma
      kategoriakSzama,        // Kategóriák száma
      gondolatTipusokSzama,   // Gondolattípusok száma
      javaslatokSzama,        // Javaslatok száma
      egyezmenyekSzama        // Egyezmények száma
    };

    console.log('platformStatisztikaService.platformStatisztikaLekereses - VÉGE', { statisztika });
    return statisztika;
  }

}

// ===== EXPORTÁLÁS =====
// Service osztály SINGLETON példány exportálása
module.exports = new PlatformStatisztikaService();
