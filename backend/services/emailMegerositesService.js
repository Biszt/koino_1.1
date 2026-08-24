// backend/services/emailMegerositesService.js

// =============================================
// E-MAIL CÍM MEGERŐSÍTÉSE
// =============================================
//
// Felelősség: annak igazolása, hogy a fiókhoz megadott e-mail cím TÉNYLEG az e-emberé.
// Két művelet:
//   1. megerositoLevelKuldese() — az e-ember kérésére kiküld egy egyszer használatos
//      hivatkozást a címére
//   2. tokenBevaltasa()          — a hivatkozás megnyitásakor megerősítettre állítja
//
// ===== MIÉRT KELL EZ EGYÁLTALÁN =====
// A cím beírása semmit nem bizonyít: el lehet gépelni, és be lehet írni MÁSVALAKI
// címét is. Megerősítés nélkül tehát:
//   - egy elgépelt címre menne az e-ember összes értesítése (idegennek, kéretlenül),
//   - és a jelszó-helyreállító hivatkozás is oda menne → a fiók elveszne.
// Ezért a koino megerősítetlen címre SEMMIT nem küld, kivéve magát a megerősítő
// levelet. Ezt a szabályt nem itt, hanem a levél-kapuban (emailKuldoService.
// kuldesEemberNek) kényszerítjük ki — így akkor sem sérülhet, ha egy későbbi
// funkció elfelejtene ellenőrizni.
//
// Használja: eemberController (email-megerosites-keres / email-megerosites/:token)
// =============================================

// ===== IMPORTOK =====
const eEmberRepository     = require('../repositories/eemberRepository');
const emailTokenRepository = require('../repositories/emailTokenRepository');
const emailKuldoService    = require('./emailKuldoService');
const emailSablonok        = require('./emailSablonok');
const { ujToken, lenyomat, lejaratPercMulva } = require('../utils/emailTokenHelper');

// ===== A MEGERŐSÍTŐ HIVATKOZÁS ÉLETTARTAMA =====
// 24 óra: elég hosszú ahhoz, hogy másnap is ráérjen, de nem marad örökké érvényes egy
// levélben heverő hivatkozás.
const LEJARAT_PERC = 24 * 60;

// ===== AZ URL-PARAMÉTER NEVE =====
// A frontend main.js ezt keresi induláskor (URL-kapu). Egy helyen tartjuk, hogy a
// backend és a frontend ne csúszhasson szét.
const URL_PARAMETER = 'email-megerosites';

// ===== MEGERŐSÍTŐ LEVÉL KÜLDÉSE =====
// Az e-ember a beállításokban a „Cím megerősítése" gombbal kérte.
// @param {string} eemberId - a bejelentkezett e-ember azonosítója
// @returns {Promise<Object>} { kuldve: boolean, uzenet: string }
async function megerositoLevelKuldese(eemberId) {
  console.log('emailMegerositesService.megerositoLevelKuldese - KEZDÉS', { eemberId });

  // ----- 1. LÉPÉS: AZ E-EMBER LEKÉRÉSE -----
  const eember = await eEmberRepository.findById(eemberId);
  if (!eember) {
    throw new Error('eEmber nem található');
  }

  // ----- 2. LÉPÉS: VAN-E EGYÁLTALÁN CÍME -----
  // Az e-mail opcionális: aki nem adott meg, annak nincs mit megerősíteni.
  if (!eember.email) {
    throw new Error('Nincs megadva e-mail cím — előbb add meg a profil-adatoknál.');
  }

  // ----- 3. LÉPÉS: MÁR MEG VAN ERŐSÍTVE? -----
  // Nem hiba, csak fölösleges — ne küldjünk ki még egy levelet.
  if (eember.emailMegerositve === true) {
    console.log('emailMegerositesService.megerositoLevelKuldese - VÉGE: már megerősítve');
    return { kuldve: false, uzenet: 'Ez a cím már meg van erősítve.' };
  }

  // ----- 4. LÉPÉS: A KORÁBBI TOKENEK ÉRVÉNYTELENÍTÉSE -----
  // Egyszerre mindig csak EGY élő hivatkozás legyen: ha valaki többször kéri a levelet,
  // a régi levelekben lévő hivatkozások azonnal használhatatlanná válnak.
  await emailTokenRepository.torolEemberTokenjeit(eemberId, 'megerosites');

  // ----- 5. LÉPÉS: ÚJ TOKEN -----
  // A `token` a NYERS érték (ez megy a levélbe), a `tokenHash` a lenyomata (ez az
  // adatbázisba). A nyerset sehol nem tároljuk és nem naplózzuk.
  const { token, tokenHash } = ujToken();

  await emailTokenRepository.create({
    eemberId,
    tipus:     'megerosites',
    tokenHash,
    email:     eember.email,           // amire kiküldjük — beváltáskor ezt vetjük össze
    lejarat:   lejaratPercMulva(LEJARAT_PERC)
  });

  // ----- 6. LÉPÉS: A HIVATKOZÁS ÖSSZEÁLLÍTÁSA -----
  // A PUBLIKUS_URL a .env-ből jön (élesben https://koino.hu, fejlesztőin localhost).
  const alapUrl = (process.env.PUBLIKUS_URL ?? '').trim().replace(/\/+$/, '');
  const link = `${alapUrl}/?${URL_PARAMETER}=${token}`;

  // ----- 7. LÉPÉS: A LEVÉL KIKÜLDÉSE -----
  // FONTOS: 'megerosites' indokkal megy — ez az EGYETLEN levél, amit a kapu
  // megerősítetlen címre is kienged (hiszen épp ez teszi megerősítetté).
  const level = emailSablonok.megerositoLevel({ eemberNev: eember.eemberNev, link });

  const eredmeny = await emailKuldoService.kuldesEemberNek({
    eember,
    targy:  level.targy,
    szoveg: level.szoveg,
    html:   level.html,
    indok:  'megerosites'
  });

  console.log('emailMegerositesService.megerositoLevelKuldese - VÉGE', {
    eemberId, sikeres: eredmeny.sikeres, mod: eredmeny.mod
  });

  // A napló módot (fejlesztői környezet) is sikernek tekintjük: a folyamat végigment,
  // a hivatkozás a szerver naplójában olvasható.
  return {
    kuldve: eredmeny.sikeres,
    uzenet: eredmeny.sikeres
      ? 'Elküldtük a megerősítő levelet. Nézd meg a postafiókod (és a spam mappát is).'
      : 'A levél kiküldése nem sikerült. Próbáld újra később.'
  };
}

// ===== A HIVATKOZÁS BEVÁLTÁSA =====
// Az e-ember megnyitotta a levélben lévő hivatkozást.
// FONTOS: ez a végpont NYILVÁNOS (nincs bejelentkezés) — hiszen a levelet más gépen,
// más böngészőben is megnyithatja. A biztonságot a token kitalálhatatlansága adja.
// @param {string} token - a nyers token az URL-ből
// @returns {Promise<Object>} { sikeres: boolean, uzenet: string, eemberNev?: string }
async function tokenBevaltasa(token) {
  console.log('emailMegerositesService.tokenBevaltasa - KEZDÉS');

  // ----- 1. LÉPÉS: ALAPELLENŐRZÉS -----
  if (!token || typeof token !== 'string') {
    return { sikeres: false, uzenet: 'Hiányzó vagy hibás megerősítő hivatkozás.' };
  }

  // ----- 2. LÉPÉS: KERESÉS A LENYOMAT ALAPJÁN -----
  // A nyers tokent lenyomatoljuk, és a lenyomattal keresünk — az adatbázisban
  // sosem szerepel a nyers érték.
  const tokenDok = await emailTokenRepository.findByHash(lenyomat(token), 'megerosites');

  if (!tokenDok) {
    // Lehet elgépelt, kitalált, vagy már lejárt és a TTL takarította el.
    console.log('emailMegerositesService.tokenBevaltasa - VÉGE: ismeretlen token');
    return { sikeres: false, uzenet: 'Ez a megerősítő hivatkozás érvénytelen vagy már lejárt.' };
  }

  // ----- 3. LÉPÉS: MÁR FELHASZNÁLT? -----
  if (tokenDok.felhasznalva) {
    console.log('emailMegerositesService.tokenBevaltasa - VÉGE: már felhasznált token');
    return { sikeres: false, uzenet: 'Ezt a hivatkozást már felhasználtad. A címed valószínűleg meg van erősítve.' };
  }

  // ----- 4. LÉPÉS: LEJÁRT? -----
  // A TTL-index csak percenként takarít, ezért a lejáratot MINDIG a kód ellenőrzi.
  if (tokenDok.lejarat.getTime() < Date.now()) {
    console.log('emailMegerositesService.tokenBevaltasa - VÉGE: lejárt token');
    return { sikeres: false, uzenet: 'Ez a megerősítő hivatkozás lejárt. Kérj újat a beállításokban.' };
  }

  // ----- 5. LÉPÉS: AZ E-EMBER LEKÉRÉSE -----
  const eember = await eEmberRepository.findById(tokenDok.eemberId);
  if (!eember) {
    return { sikeres: false, uzenet: 'A hivatkozáshoz tartozó fiók már nem létezik.' };
  }

  // ----- 6. LÉPÉS: A CÍM MÉG MINDIG UGYANAZ? -----
  // KRITIKUS: az e-ember a levél kiküldése UTÁN is átírhatta a címét. Ha a RÉGI címre
  // küldött hivatkozás igazolná az ÚJAT, azzal bárki „megerősíthetne" egy olyan címet,
  // amihez nem fér hozzá — pontosan az ellenkezőjét érnénk el, mint amiért az egész van.
  if (!eember.email || eember.email !== tokenDok.email) {
    console.log('emailMegerositesService.tokenBevaltasa - VÉGE: időközben megváltozott a cím');
    return {
      sikeres: false,
      uzenet: 'A fiókhoz tartozó e-mail cím időközben megváltozott. Kérj új megerősítő levelet a beállításokban.'
    };
  }

  // ----- 7. LÉPÉS: MEGERŐSÍTÉS -----
  await eEmberRepository.updateEmailMegerositve(eember._id, true);
  await emailTokenRepository.megjelolFelhasznaltnak(tokenDok._id);

  console.log('emailMegerositesService.tokenBevaltasa - VÉGE: sikeres', {
    eemberNev: eember.eemberNev
  });

  return {
    sikeres:   true,
    uzenet:    'Köszönjük, az e-mail-címed megerősítve!',
    eemberNev: eember.eemberNev
  };
}

// ===== EXPORTÁLÁS =====
module.exports = {
  megerositoLevelKuldese,
  tokenBevaltasa,
  URL_PARAMETER
};
