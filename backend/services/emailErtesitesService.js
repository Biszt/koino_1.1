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
    .select('eemberNev email emailMegerositve ertesitesiAlapbeallitas.emailErtesites ertesitesiAlapbeallitas.emailMod');

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

    // FELTÉTEL 1/b: AZONNALI módot kért-e?
    // Aki összefoglalót kér, annak ez az értesítés nem most megy ki, hanem a következő
    // összefoglalóba kerül (az `emailKikuldve: false` jelöléssel várakozik rá).
    if ((eember.ertesitesiAlapbeallitas?.emailMod ?? 'osszefoglalo') !== 'azonnal') {
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

// =============================================
// ÖSSZEFOGLALÓ KÉZBESÍTÉS (5. lépés)
// =============================================
//
// Egy levél, benne az időszak összes értesítése. A `jobs/emailOsszefoglaloCronJob`
// hívja rendszeresen.
//
// ===== HOGYAN DÖNTJÜK EL, KINEK ESEDÉKES =====
// Nem külön ütemezünk mindenkinek (az e-emberenként más-más órát jelentene). Helyette
// a cron sűrűn fut, és MINDEN futáskor megnézi, kinél telt le a saját időköze:
//
//   esedékes, ha:  most - (utolsó összefoglaló ideje)  >=  a beállított időköz
//
// Ha még sosem ment összefoglaló (`emailOsszefoglaloUtoljara` null), akkor a
// LEGRÉGEBBI kiküldetlen értesítés kora dönt. Így a bekapcsolás után nem csap be
// azonnal egy levél, és nem kell külön „első alkalom" logika.
//
// Aki mindkét feltételnek megfelel, de nincs kiküldetlen értesítése, az kimarad —
// ÜRES összefoglalót sosem küldünk.

// ===== ESEDÉKES ÖSSZEFOGLALÓK KÜLDÉSE =====
// @returns {Promise<Object>} { vizsgalt, kuldott, ertesitesek } — a naplóhoz/teszthez
async function osszefoglalokKuldese() {
  console.log('emailErtesitesService.osszefoglalokKuldese - KEZDÉS');

  // ----- 1. LÉPÉS: A SZÓBA JÖHETŐ E-EMBEREK -----
  // Csak akik e-mailes értesítést kérnek ÉS összefoglaló módban vannak. A megerősítést
  // itt nem szűrjük — azt a levél-kapu úgyis elvégzi, és így egy helyen marad a szabály.
  const jeloltek = await eEmber.find({
    'ertesitesiAlapbeallitas.emailErtesites': true,
    'ertesitesiAlapbeallitas.emailMod': 'osszefoglalo'
  }).select('eemberNev email emailMegerositve emailOsszefoglaloUtoljara ertesitesiAlapbeallitas.emailOrakoz');

  console.log('emailErtesitesService.osszefoglalokKuldese - jelöltek', { darab: jeloltek.length });

  const alapUrl = (process.env.PUBLIKUS_URL ?? '').trim().replace(/\/+$/, '');
  const most = Date.now();
  let kuldott = 0;
  let osszesErtesites = 0;

  // A cím-feltöltő segéd (késleltetett import — kölcsönös hivatkozás elkerülése)
  const { entitasCimekFeltoltese } = require('./ertesitesService');

  for (const eember of jeloltek) {
    const orakoz = eember.ertesitesiAlapbeallitas?.emailOrakoz ?? 24;
    const idokozMs = orakoz * 60 * 60 * 1000;

    // ----- 2. LÉPÉS: A KIKÜLDETLEN ÉRTESÍTÉSEI (időrendben) -----
    const varakozok = await Ertesites
      .find({ eEmberId: eember._id, emailKikuldve: false })
      .sort({ createdAt: 1 });

    // ÜRES összefoglalót sosem küldünk
    if (varakozok.length === 0) continue;

    // ----- 3. LÉPÉS: ESEDÉKES-E? -----
    // Ha már ment összefoglaló, az utolsó időpontjától mérünk. Ha még sosem,
    // a legrégebbi várakozó értesítés korától.
    const kiindulas = eember.emailOsszefoglaloUtoljara
      ? eember.emailOsszefoglaloUtoljara.getTime()
      : new Date(varakozok[0].createdAt).getTime();

    if ((most - kiindulas) < idokozMs) continue; // még nem telt le az időköze

    // ----- 4. LÉPÉS: A LEVÉL ÖSSZEÁLLÍTÁSA -----
    const cimmel = await entitasCimekFeltoltese(varakozok);

    const level = emailSablonok.osszefoglaloLevel({
      eemberNev:   eember.eemberNev,
      ertesitesek: cimmel.map((e) => ({ tipus: e.tipus, entitasCim: e.entitasCim })),
      link:        alapUrl || 'https://koino.hu'
    });

    const eredmeny = await emailKuldoService.kuldesEemberNek({
      eember,
      targy:  level.targy,
      szoveg: level.szoveg,
      html:   level.html,
      indok:  'osszefoglalo'
    });

    if (eredmeny.sikeres) {
      // Az összes belefoglalt értesítés kiküldöttre vált — így a következő
      // összefoglalóba már nem kerülnek bele.
      await Ertesites.updateMany(
        { _id: { $in: varakozok.map((e) => e._id) } },
        { $set: { emailKikuldve: true } }
      );
      // És innen számoljuk a következő időközt
      await eEmber.updateOne(
        { _id: eember._id },
        { $set: { emailOsszefoglaloUtoljara: new Date() } }
      );

      kuldott++;
      osszesErtesites += varakozok.length;

      console.log('emailErtesitesService.osszefoglalokKuldese - kiküldve', {
        eemberNev: eember.eemberNev, ertesitesekSzama: varakozok.length, orakoz
      });
    }
    // Ha nem sikerült (pl. nincs megerősítve a cím), SEMMIT nem jelölünk meg:
    // az értesítések várakoznak tovább, és egy későbbi futásban még kimehetnek.
  }

  console.log('emailErtesitesService.osszefoglalokKuldese - VÉGE', {
    vizsgalt: jeloltek.length, kuldott, ertesitesek: osszesErtesites
  });
  return { vizsgalt: jeloltek.length, kuldott, ertesitesek: osszesErtesites };
}

// ===== EXPORTÁLÁS =====
module.exports = { azonnaliKezbesites, osszefoglalokKuldese };
