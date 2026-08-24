// backend/repositories/emailTokenRepository.js

// ===== MODEL IMPORTÁLÁSA =====
const EmailToken = require('../models/emailToken');

// ===== E-MAIL TOKEN REPOSITORY =====
// Felelősség: az emailToken kollekció adatbázis-műveletei. Csak technikai hívások,
// NINCS üzleti logika (az a service-ben lakik).
// Használják: emailMegerositesService (2. lépés), jelszoHelyreallitasService (3. lépés)
class EmailTokenRepository {

  // ----- ÚJ TOKEN LÉTREHOZÁSA -----
  // @param {Object} adatok - { eemberId, tipus, tokenHash, email, lejarat }
  // @returns {Promise} A létrehozott token-dokumentum
  async create(adatok) {
    console.log('emailTokenRepository.create - KEZDÉS', {
      eemberId: adatok.eemberId, tipus: adatok.tipus
    });

    const token = new EmailToken(adatok);
    const eredmeny = await token.save();

    console.log('emailTokenRepository.create - VÉGE', { id: eredmeny._id });
    return eredmeny;
  }

  // ----- KERESÉS LENYOMAT ALAPJÁN -----
  // A beváltáskor a beérkező nyers token lenyomatával keresünk.
  // FIGYELEM: a lejáratot és a felhasználtságot NEM itt szűrjük — a service dönti el,
  // mi számít érvényesnek (így pontos hibaüzenetet tud adni: „lejárt" vs „már felhasznált").
  // @param {string} tokenHash - a token SHA-256 lenyomata
  // @param {string} tipus - 'megerosites' | 'jelszoHelyreallitas'
  // @returns {Promise} A token-dokumentum vagy null
  async findByHash(tokenHash, tipus) {
    console.log('emailTokenRepository.findByHash - KEZDÉS', { tipus });

    const eredmeny = await EmailToken.findOne({ tokenHash, tipus });

    console.log('emailTokenRepository.findByHash - VÉGE', { talalt: !!eredmeny });
    return eredmeny;
  }

  // ----- TOKEN FELHASZNÁLTNAK JELÖLÉSE -----
  // A sikeres beváltás után. Innentől a hivatkozás nem működik többé.
  // @param {string} id - a token dokumentum azonosítója
  // @returns {Promise} A frissített dokumentum
  async megjelolFelhasznaltnak(id) {
    console.log('emailTokenRepository.megjelolFelhasznaltnak - KEZDÉS', { id });

    const eredmeny = await EmailToken.findByIdAndUpdate(
      id,
      { felhasznalva: true },
      { new: true }
    );

    console.log('emailTokenRepository.megjelolFelhasznaltnak - VÉGE', { id: eredmeny?._id });
    return eredmeny;
  }

  // ----- EGY E-EMBER ADOTT TÍPUSÚ TOKENJEINEK TÖRLÉSE -----
  // MIÉRT: új token kiadásakor a korábbiakat érvénytelenítjük, hogy egyszerre mindig
  // csak EGY élő hivatkozás létezzen. Így ha valaki többször kéri a levelet, a régi
  // levelekben lévő hivatkozások azonnal használhatatlanná válnak.
  // @param {string} eemberId - az e-ember azonosítója
  // @param {string} tipus - 'megerosites' | 'jelszoHelyreallitas'
  // @returns {Promise<number>} A törölt tokenek száma
  async torolEemberTokenjeit(eemberId, tipus) {
    console.log('emailTokenRepository.torolEemberTokenjeit - KEZDÉS', { eemberId, tipus });

    const eredmeny = await EmailToken.deleteMany({ eemberId, tipus });

    console.log('emailTokenRepository.torolEemberTokenjeit - VÉGE', {
      torolt: eredmeny.deletedCount
    });
    return eredmeny.deletedCount;
  }

  // ----- EGY E-EMBER ÖSSZES TOKENJÉNEK TÖRLÉSE -----
  // Használat: fiók-törléskor (ne maradjon lógó token a megszűnt e-emberhez).
  // @param {string} eemberId - az e-ember azonosítója
  // @returns {Promise<number>} A törölt tokenek száma
  async torolEemberOsszesTokenjet(eemberId) {
    console.log('emailTokenRepository.torolEemberOsszesTokenjet - KEZDÉS', { eemberId });

    const eredmeny = await EmailToken.deleteMany({ eemberId });

    console.log('emailTokenRepository.torolEemberOsszesTokenjet - VÉGE', {
      torolt: eredmeny.deletedCount
    });
    return eredmeny.deletedCount;
  }

}

// ===== EXPORTÁLÁS (SINGLETON) =====
module.exports = new EmailTokenRepository();
