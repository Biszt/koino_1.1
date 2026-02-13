// backend/services/javaslat/javaslatJogosultsagService.js

// ===================================
// IMPORTOK
// ===================================

// Tudatpont szolgáltatás importálása
const TudatpontService = require('../tudatpontService');

// ===================================
// JAVASLAT JOGOSULTSÁG SERVICE OSZTÁLY
// ===================================
// Ez az osztály felelős a javaslatok jogosultság ellenőrzéséért
// Felelősség: Szavazási jogosultság, tudatpont alapú ellenőrzések
class JavaslatJogosultsagService {

  // ===================================
  // SZAVAZÁSI JOGOSULTSÁG ELLENŐRZÉSE
  // ===================================
  /**
   * Ellenőrzi, hogy a ember rendelkezik-e tudatponttal minden érintett entitáson
   * Ha mindenhol van tudatpontja, jogosult szavazni/javaslatot létrehozni
   * 
   * @param {string} emberId - A ember ID-ja
   * @param {Array} erintettEntitasok - Érintett entitások tömbje
   * @returns {Promise<Object>} { jogosult: boolean, hianyzoEntitas: string|null }
   */
  async szavazasiJogosultsagEllenorzese(emberId, erintettEntitasok) {

    console.log("=================================== szavazasiJogosultsagEllenorzese:: ",{
      emberId: emberId,
      erintettEntitasok: erintettEntitasok
    });
    
    // === 1. LÉPÉS: VALIDÁLÁS ===
    if (!emberId) {
      throw new Error('A ember ID megadása kötelező');
    }

    if (!erintettEntitasok || erintettEntitasok.length === 0) {
      throw new Error('Legalább egy érintett entitás megadása kötelező');
    }

    // === 2. LÉPÉS: MINDEN ÉRINTETT ENTITÁSON ELLENŐRZÉS ===
    // Végigmegyünk az összes érintett entitáson
    for (const entitas of erintettEntitasok) {

      // Tudatpont hozzájárulás lekérése az entitáson
      console.log(">>>>>>>>>>>>>>>>>>>>>> TudatpontService.emberHozzajarulasaEntitason: ", {
        emberId: emberId,
        entitasId: entitas.entitasId,
        entitasTipus: entitas.entitasTipus
      });
      
      const hozzajarulas = await TudatpontService.emberHozzajarulasaEntitason(
        emberId,
        entitas.entitasId,
        entitas.entitasTipus
      );

      // Ha nincs tudatpontja, nincs jogosultsága
      if (!hozzajarulas.vanHozzajarulas) {
        return {
          jogosult: false,
          hianyzoEntitas: `${entitas.entitasTipus}: ${entitas.entitasId}`
        };
      }
    }

    // === 3. LÉPÉS: MINDEN ENTITÁSON VAN TUDATPONT ===
    // Jogosult szavazni/javaslatot létrehozni

    console.log("<<<<<<<<<<<<<<<<<<<<<<<<< szavazasiJogosultsagEllenorzese=====Eredmény", {
      jogosult: true,
      hianyzoEntitas: null
    });
    
    return {
      jogosult: true,
      hianyzoEntitas: null
    };
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Service osztály singleton példány exportálása
module.exports = new JavaslatJogosultsagService();