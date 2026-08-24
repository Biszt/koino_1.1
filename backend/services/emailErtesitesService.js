// backend/services/emailErtesitesService.js

// =============================================
// ÉRTESÍTÉSEK KÉZBESÍTÉSE E-MAILBEN
// =============================================
//
// Felelősség: a MÁR LÉTREJÖTT felületi értesítéseket levélben is kikézbesíteni annak,
// aki ezt kérte. Fontos, hogy ez csak KÉZBESÍTÉSI MÓD: nem dönti el, KI kap értesítést
// (azt az ertesitesService cimzettekFeloldasa végzi), csak azt, hogy a már eldöntött
// értesítés kimegy-e levélben is.
//
// ===== HÁROM FELTÉTEL, MIND KELL =====
// Egy értesítésről CSAK akkor megy levél, ha:
//   1. az e-ember BEKAPCSOLTA az e-mailes értesítést
//      (ertesitesiAlapbeallitas.emailErtesites === true),
//   2. van MEGERŐSÍTETT e-mail címe (ezt a levél-kapu külön is ellenőrzi),
//   3. az értesítés még nem ment ki levélben (emailKikuldve === false).
//
// ===== MIÉRT NEM VÁRJUK MEG (nem await) =====
// Ezt a szolgáltatást az ertesitesService hívja, ami a szavazás / javaslattétel /
// tudatpont-mozgatás közben fut. Ha a levélküldést megvárnánk, a felhasználó kérése
// annyival lassulna, ahány levelet ki kell küldeni — egy külső szolgáltató válaszidejétől
// függően. Ezért a hívó NEM várja meg: a küldés a háttérben fut, és a hibáit naplózza.
// Ez azért biztonságos, mert a levél-kapu SOHA nem dob hibát (lásd emailKuldoService).
//
// Használja: ertesitesService.ertesitesKuldes (a tömeges mentés után)
// =============================================

// ===== IMPORTOK =====
const eEmber            = require('../models/eember');
const Ertesites         = require('../models/ertesites');
const emailKuldoService = require('./emailKuldoService');
const emailSablonok     = require('./emailSablonok');

// ===== AZONNALI KÉZBESÍTÉS =====
// A frissen létrehozott értesítésekhez kiküldi a leveleket azoknak, akik azonnali
// e-mailes értesítést kértek.
//
// @param {Array} ertesitesek - a most létrehozott értesítés-dokumentumok
// @returns {Promise<Object>} { kuldott, kihagyott } — főleg a naplózáshoz és a teszthez
async function azonnaliKezbesites(ertesitesek) {
  console.log('emailErtesitesService.azonnaliKezbesites - KEZDÉS', {
    ertesitesekSzama: ertesitesek?.length ?? 0
  });

  if (!Array.isArray(ertesitesek) || ertesitesek.length === 0) {
    console.log('emailErtesitesService.azonnaliKezbesites - VÉGE: nincs mit kézbesíteni');
    return { kuldott: 0, kihagyott: 0 };
  }

  // ----- 1. LÉPÉS: A CÍMZETTEK EGYSZERI LEKÉRÉSE -----
  // Az értesítések több e-embernek szólhatnak. EGY lekérdezéssel behozzuk mindannyiukat,
  // nem értesítésenként (nincs N+1).
  const eemberIdk = [...new Set(ertesitesek.map((e) => String(e.eEmberId)))];

  const eemberek = await eEmber
    .find({ _id: { $in: eemberIdk } })
    .select('eemberNev email emailMegerositve ertesitesiAlapbeallitas.emailErtesites');

  // Gyors kereséshez: id → e-ember
  const eemberTerkep = new Map(eemberek.map((e) => [String(e._id), e]));

  // ----- 2. LÉPÉS: AZ ENTITÁS-CÍMEK FELTÖLTÉSE -----
  // A levélben az entitás címe is szerepel („Új javaslat — A költségvetésről"), ezért
  // ugyanazt a cím-feltöltő segédet használjuk, mint a felületi postafiók. Így a levél
  // és a koino ugyanazt a nevet mutatja. (Késleltetett import: az ertesitesService
  // hívja EZT a modult, tehát a fájl tetején kölcsönös hivatkozás lenne.)
  const { entitasCimekFeltoltese } = require('./ertesitesService');
  const cimmel = await entitasCimekFeltoltese(ertesitesek);

  // ----- 3. LÉPÉS: KÉZBESÍTÉS EGYESÉVEL -----
  const alapUrl = (process.env.PUBLIKUS_URL ?? '').trim().replace(/\/+$/, '');
  let kuldott = 0;
  let kihagyott = 0;

  for (const ertesites of cimmel) {
    const eember = eemberTerkep.get(String(ertesites.eEmberId));

    // FELTÉTEL 1: kérte-e egyáltalán?
    if (!eember || eember.ertesitesiAlapbeallitas?.emailErtesites !== true) {
      kihagyott++;
      continue;
    }

    // FELTÉTEL 3: ment-e már ki? (a 2. feltételt — a megerősítést — a kapu ellenőrzi)
    if (ertesites.emailKikuldve === true) {
      kihagyott++;
      continue;
    }

    const level = emailSablonok.ertesitesLevel({
      eemberNev: eember.eemberNev,
      ertesites: { tipus: ertesites.tipus, entitasCim: ertesites.entitasCim },
      link:      alapUrl || 'https://koino.hu'
    });

    const eredmeny = await emailKuldoService.kuldesEemberNek({
      eember,
      targy:  level.targy,
      szoveg: level.szoveg,
      html:   level.html,
      indok:  'ertesites'
    });

    if (eredmeny.sikeres) {
      // Megjelöljük, hogy kiment — így nem megy ki még egyszer, és az összefoglalóba
      // (5. lépés) sem kerül bele.
      await Ertesites.updateOne({ _id: ertesites._id }, { $set: { emailKikuldve: true } });
      kuldott++;
    } else {
      // Nem küldtük ki (nincs megerősítve a cím, hiba a szolgáltatónál stb.).
      // A jelölést SZÁNDÉKOSAN nem tesszük ki: így egy későbbi összefoglalóba még
      // bekerülhet, ha az e-ember időközben megerősíti a címét.
      kihagyott++;
    }
  }

  console.log('emailErtesitesService.azonnaliKezbesites - VÉGE', { kuldott, kihagyott });
  return { kuldott, kihagyott };
}

// ===== EXPORTÁLÁS =====
module.exports = { azonnaliKezbesites };
