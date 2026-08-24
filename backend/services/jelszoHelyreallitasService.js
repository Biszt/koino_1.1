// backend/services/jelszoHelyreallitasService.js

// =============================================
// ELFELEJTETT JELSZÓ — HELYREÁLLÍTÁS
// =============================================
//
// Felelősség: ha egy e-ember elfelejtette a jelszavát, a MEGERŐSÍTETT e-mail-címére
// küldött, egyszer használatos hivatkozással új jelszót adhat meg.
// Két művelet:
//   1. helyreallitasKerese()  — a bejelentkezési képernyőről kért levél
//   2. ujJelszoBeallitasa()   — a hivatkozásról érkező új jelszó
//
// ===== HÁROM BIZTONSÁGI SZABÁLY, AMI ITT DŐL EL =====
//
// 1. A VÁLASZ MINDIG UGYANAZ. Akár létezik a megadott azonosító, akár nem, a kérés
//    ugyanazt a semleges üzenetet kapja. Különben ez a végpont egy KERESŐVÉ válna:
//    bárki kipróbálhatna e-mail-címeket, és megtudhatná, ki tagja a koinónak. A koino
//    tagsága nem nyilvános adat, ezért ezt nem szabad kiszivárogtatni.
//
// 2. CSAK MEGERŐSÍTETT CÍMRE. Ha egy igazolatlan címre küldenénk helyreállító
//    hivatkozást, egy elgépelt (vagy szándékosan idegen) cím birtokosa venné át a
//    fiókot. A szűrést a levél-kapu is elvégzi, de itt is ellenőrizzük.
//
// 3. A HELYREÁLLÍTÁS KILÖKI A BETOLAKODÓT. Az új jelszó beállítása lépteti a
//    `tokenVerzio`-t, amitől MINDEN korábbi bejelentkezés érvénytelen lesz. Enélkül
//    a helyreállítás félkarú lenne: az e-ember visszaszerzi a jelszavát, de aki
//    közben bejutott, a régi tokenjével bent maradna (a tokenek nem járnak le).
//
// Használja: eemberController (jelszo-helyreallitas-keres / jelszo-helyreallitas)
// =============================================

// ===== IMPORTOK =====
const eEmberRepository     = require('../repositories/eemberRepository');
const emailTokenRepository = require('../repositories/emailTokenRepository');
const emailKuldoService    = require('./emailKuldoService');
const emailSablonok        = require('./emailSablonok');
const JelszoHelper         = require('../utils/jelszoHelper');
const { ujToken, lenyomat, lejaratPercMulva } = require('../utils/emailTokenHelper');

// ===== A HIVATKOZÁS ÉLETTARTAMA =====
// 1 óra — szándékosan RÖVIDEBB, mint a cím-megerősítésé (24 óra). Ez a hivatkozás
// fiók-hozzáférést ad, ezért minél kevesebb ideig heverjen érvényesen egy postafiókban.
const LEJARAT_PERC = 60;

// ===== AZ URL-PARAMÉTER NEVE =====
// A frontend main.js URL-kapuja ezt keresi induláskor.
const URL_PARAMETER = 'jelszo-helyreallitas';

// ===== A SEMLEGES VÁLASZ =====
// MINDIG ez megy vissza a kérésre — akkor is, ha nincs ilyen e-ember, ha nincs
// e-mail-címe, ha nincs megerősítve, és akkor is, ha minden rendben volt.
// Így a végpontból semmilyen információ nem szivárog ki arról, ki tagja a koinónak.
const SEMLEGES_VALASZ =
  'Ha tartozik ehhez az azonosítóhoz megerősített e-mail cím, elküldtük rá a ' +
  'helyreállító hivatkozást. Nézd meg a postafiókod (és a spam mappát is).';

// ===== HELYREÁLLÍTÁS KÉRÉSE =====
// A bejelentkezési képernyő „Elfelejtetted a jelszavad?" űrlapjáról érkezik.
// @param {string} azonosito - e-mail cím VAGY e-embernév
// @returns {Promise<Object>} { uzenet } — MINDIG a semleges válasz
async function helyreallitasKerese(azonosito) {
  console.log('jelszoHelyreallitasService.helyreallitasKerese - KEZDÉS');

  // A hibákat is elnyeljük: a hívó SOHA nem kap más választ, mint a semlegeset.
  // (A naplóba viszont mindent kiírunk — a szerver-oldali hibakereséshez.)
  try {
    const tisztitott = String(azonosito ?? '').trim();
    if (!tisztitott) {
      console.log('jelszoHelyreallitasService.helyreallitasKerese - VÉGE: üres azonosító');
      return { uzenet: SEMLEGES_VALASZ };
    }

    // ----- 1. LÉPÉS: AZ E-EMBER MEGKERESÉSE -----
    // Ugyanaz a logika, mint a bejelentkezésnél: @ jel → e-mail, különben e-embernév.
    const eember = tisztitott.includes('@')
      ? await eEmberRepository.findByEmail(tisztitott)
      : await eEmberRepository.findByeEmberNev(tisztitott);

    // ----- 2. LÉPÉS: A HÁROM „CSENDES" KIZÁRÓ OK -----
    // Egyikről sem adunk visszajelzést — mind a semleges választ kapja.
    if (!eember) {
      console.log('jelszoHelyreallitasService.helyreallitasKerese - VÉGE: nincs ilyen e-ember (semleges válasz)');
      return { uzenet: SEMLEGES_VALASZ };
    }
    if (!eember.email) {
      console.log('jelszoHelyreallitasService.helyreallitasKerese - VÉGE: nincs e-mail címe (semleges válasz)');
      return { uzenet: SEMLEGES_VALASZ };
    }
    if (eember.emailMegerositve !== true) {
      console.log('jelszoHelyreallitasService.helyreallitasKerese - VÉGE: a cím nincs megerősítve (semleges válasz)');
      return { uzenet: SEMLEGES_VALASZ };
    }

    // ----- 3. LÉPÉS: A KORÁBBI HIVATKOZÁSOK ÉRVÉNYTELENÍTÉSE -----
    await emailTokenRepository.torolEemberTokenjeit(eember._id, 'jelszoHelyreallitas');

    // ----- 4. LÉPÉS: ÚJ TOKEN -----
    const { token, tokenHash } = ujToken();
    await emailTokenRepository.create({
      eemberId: eember._id,
      tipus:    'jelszoHelyreallitas',
      tokenHash,
      email:    eember.email,
      lejarat:  lejaratPercMulva(LEJARAT_PERC)
    });

    // ----- 5. LÉPÉS: A LEVÉL KIKÜLDÉSE -----
    const alapUrl = (process.env.PUBLIKUS_URL ?? '').trim().replace(/\/+$/, '');
    const link = `${alapUrl}/?${URL_PARAMETER}=${token}`;

    const level = emailSablonok.jelszoHelyreallitoLevel({
      eemberNev: eember.eemberNev,
      link
    });

    await emailKuldoService.kuldesEemberNek({
      eember,
      targy:  level.targy,
      szoveg: level.szoveg,
      html:   level.html,
      indok:  'jelszoHelyreallitas'
    });

    console.log('jelszoHelyreallitasService.helyreallitasKerese - VÉGE: levél kiküldve', {
      eemberNev: eember.eemberNev
    });

  } catch (hiba) {
    // Még hiba esetén is a semleges válasz megy vissza — a hibából sem szabad
    // következtetni arra, létezik-e a fiók.
    console.error('jelszoHelyreallitasService.helyreallitasKerese - HIBA', hiba.message);
  }

  return { uzenet: SEMLEGES_VALASZ };
}

// ===== A TOKEN ELLENŐRZÉSE (az űrlap megnyitása előtt) =====
// A frontend ezzel kérdezi meg: érdemes-e egyáltalán megmutatni az új-jelszó űrlapot?
// Így az e-ember nem tölt ki egy űrlapot fölöslegesen, ha a hivatkozás már lejárt.
// @param {string} token - a nyers token az URL-ből
// @returns {Promise<Object>} { ervenyes, uzenet, eemberNev? }
async function tokenEllenorzese(token) {
  console.log('jelszoHelyreallitasService.tokenEllenorzese - KEZDÉS');

  const tokenDok = await _ervenyesTokenKeresese(token);
  if (!tokenDok.ervenyes) {
    console.log('jelszoHelyreallitasService.tokenEllenorzese - VÉGE: érvénytelen', { ok: tokenDok.uzenet });
    return { ervenyes: false, uzenet: tokenDok.uzenet };
  }

  const eember = await eEmberRepository.findById(tokenDok.dokumentum.eemberId);
  if (!eember) {
    return { ervenyes: false, uzenet: 'A hivatkozáshoz tartozó fiók már nem létezik.' };
  }

  console.log('jelszoHelyreallitasService.tokenEllenorzese - VÉGE: érvényes');
  return { ervenyes: true, uzenet: 'A hivatkozás érvényes.', eemberNev: eember.eemberNev };
}

// ===== ÚJ JELSZÓ BEÁLLÍTÁSA =====
// A hivatkozásról érkező űrlap küldi.
// @param {string} token - a nyers token
// @param {string} ujJelszo - az új jelszó
// @returns {Promise<Object>} { sikeres, uzenet }
async function ujJelszoBeallitasa(token, ujJelszo) {
  console.log('jelszoHelyreallitasService.ujJelszoBeallitasa - KEZDÉS');

  // ----- 1. LÉPÉS: A TOKEN ÚJRAELLENŐRZÉSE -----
  // Nem támaszkodunk arra, hogy a frontend már ellenőrizte: a végpont önmagában is
  // teljes értékű őr kell legyen (a kérés érkezhet a felület megkerülésével is).
  const tokenDok = await _ervenyesTokenKeresese(token);
  if (!tokenDok.ervenyes) {
    console.log('jelszoHelyreallitasService.ujJelszoBeallitasa - VÉGE: érvénytelen token');
    return { sikeres: false, uzenet: tokenDok.uzenet };
  }

  // ----- 2. LÉPÉS: AZ ÚJ JELSZÓ ERŐSSÉGE -----
  // Ugyanaz a szabály, mint a regisztrációnál és a jelszóváltásnál — egyetlen helyen
  // definiálva (jelszoHelper), hogy ne csúszhasson szét.
  const erosseg = JelszoHelper.validalJelszoErosseg(ujJelszo);
  if (!erosseg.ervényes) {
    return { sikeres: false, uzenet: `Gyenge jelszó: ${erosseg.hibak.join(', ')}` };
  }

  // ----- 3. LÉPÉS: AZ E-EMBER -----
  const eember = await eEmberRepository.findById(tokenDok.dokumentum.eemberId);
  if (!eember) {
    return { sikeres: false, uzenet: 'A hivatkozáshoz tartozó fiók már nem létezik.' };
  }

  // ----- 4. LÉPÉS: AZ ÚJ JELSZÓ MENTÉSE -----
  const hashedJelszo = await JelszoHelper.hashJelszo(ujJelszo);
  await eEmberRepository.updateJelszo(eember._id, hashedJelszo);

  // ----- 5. LÉPÉS: MINDEN KORÁBBI BEJELENTKEZÉS ÉRVÉNYTELENÍTÉSE -----
  // EZ A LÉPÉS TESZI A HELYREÁLLÍTÁST VALÓDI VÉDELEMMÉ. Ha valaki illetéktelenül
  // jutott be a fiókba, a tokenje eddig ELÉLNE a jelszócsere után is (a koino tokenjei
  // nem járnak le). A verzió léptetésével azonnal kirepül.
  await eEmberRepository.incrementTokenVerzio(eember._id);

  // ----- 6. LÉPÉS: A HIVATKOZÁS ELHASZNÁLÁSA -----
  await emailTokenRepository.megjelolFelhasznaltnak(tokenDok.dokumentum._id);

  // A többi élő helyreállító hivatkozást is eldobjuk (ha többször kérte volna)
  await emailTokenRepository.torolEemberTokenjeit(eember._id, 'jelszoHelyreallitas');

  console.log('jelszoHelyreallitasService.ujJelszoBeallitasa - VÉGE: sikeres', {
    eemberNev: eember.eemberNev
  });

  return {
    sikeres: true,
    uzenet: 'Az új jelszavad elmentve. Jelentkezz be vele. '
          + 'A korábbi bejelentkezéseid minden eszközön megszűntek.'
  };
}

// ===== BELSŐ SEGÉD: ÉRVÉNYES TOKEN KERESÉSE =====
// A `tokenEllenorzese` és az `ujJelszoBeallitasa` KÖZÖS ellenőrzése — hogy a két úton
// ne csúszhasson szét a szabály.
// @param {string} token - a nyers token
// @returns {Promise<Object>} { ervenyes, uzenet, dokumentum? }
async function _ervenyesTokenKeresese(token) {
  if (!token || typeof token !== 'string') {
    return { ervenyes: false, uzenet: 'Hiányzó vagy hibás hivatkozás.' };
  }

  const tokenDok = await emailTokenRepository.findByHash(lenyomat(token), 'jelszoHelyreallitas');

  if (!tokenDok) {
    return { ervenyes: false, uzenet: 'Ez a hivatkozás érvénytelen vagy már lejárt. Kérj újat a bejelentkezésnél.' };
  }
  if (tokenDok.felhasznalva) {
    return { ervenyes: false, uzenet: 'Ezt a hivatkozást már felhasználtad. Ha újra kell, kérj újat a bejelentkezésnél.' };
  }
  if (tokenDok.lejarat.getTime() < Date.now()) {
    return { ervenyes: false, uzenet: 'Ez a hivatkozás lejárt (1 óráig érvényes). Kérj újat a bejelentkezésnél.' };
  }

  return { ervenyes: true, uzenet: 'Érvényes.', dokumentum: tokenDok };
}

// ===== EXPORTÁLÁS =====
module.exports = {
  helyreallitasKerese,
  tokenEllenorzese,
  ujJelszoBeallitasa,
  URL_PARAMETER
};
