// backend/services/eemberService.js

// ===== IMPORTOK =====
// Repository: Adatbázis műveletek
const eEmberRepository = require('../repositories/eemberRepository');

// Helper: Jelszó műveletek (hash, összehasonlítás, validáció)
const JelszoHelper = require('../utils/jelszoHelper');

// JWT: JSON Web Token generáláshoz és ellenőrzéshez
const jwt = require('jsonwebtoken');

// Meghívó service: meghívásos regisztráció (MEGHIVAS_KOTELEZO kapcsoló)
const MeghivoService = require('./meghivoService');

// --- FIÓK-TÖRLÉSHEZ (eemberTorlese) ---
// A pont-visszaosztás a tudatpontService bevált, tranzakciós útját használja
// (a 0-ra állítás indítja a „nincs 0-tudatpontos entitás" láncreakciót).
const TudatpontService = require('./tudatpontService');
const TudatpontRepository = require('../repositories/tudatpontRepository');
const SzavazatRepository = require('../repositories/szavazatRepository');
const ErtekJavaslatRepository = require('../repositories/ertekJavaslatRepository');
// Az érték-javaslatok a megmaradó entitások küszöb-hisztogramját is befolyásolják:
// törléskor a mediánból is ki kell vonni őket (hisztogramCsokkentese).
const ErtekSzamitasService = require('./ertekSzamitasService');
const ErtesitesRepository = require('../repositories/ertesitesRepository');
const ErtesitesiBeallitasRepository = require('../repositories/ertesitesiBeallitasRepository');
// A megmaradó (mások által is támogatott) entitásoknál a létrehozó anonimizálásához.
// A modellek közvetlen elérése bevált minta ebben a rétegben (lásd strukturaService).
const Tartalom = require('../models/tartalom');
const Kategoria = require('../models/kategoria');
const TartalomTipus = require('../models/tartalomTipus');
const Javaslat = require('../models/javaslat');
const Egyezmeny = require('../models/egyezmeny');

// ===== EMBER SERVICE OSZTÁLY =====
// Ez a réteg tartalmazza az ÜZLETI LOGIKÁT
// Validációk, több lépéses folyamatok, szabályok végrehajtása
class eEmberService {

  // ===== REGISZTRÁCIÓ =====
  // Új eember regisztrációja
  // Lépések: (meghívó kód, ha kötelező), email/eembernév foglaltság,
  // jelszó erősség, hash, mentés, meghívó felhasználtra állítása
  // @param {Object} adatok - { eemberNev, email, jelszo, nev, lokacio, meghivoKod }
  // @returns {Promise} Létrehozott eember (jelszó nélkül)
  async regisztracio(adatok) {
    console.log('eEmberService.regisztracio - KEZDÉS', { eemberNev: adatok.eemberNev, email: adatok.email });

    // === 0. LÉPÉS: MEGHÍVÓ KÓD ELLENŐRZÉSE (ha a kapcsoló be van kapcsolva) ===
    // MEGHIVAS_KOTELEZO=true esetén érvényes, Aktiv meghívó kód kell a
    // regisztrációhoz. A kódot itt csak ÉRVÉNYESÍTJÜK — felhasználtra majd a
    // sikeres mentés UTÁN állítjuk (6.b lépés), hogy hibás regisztráció ne
    // költse el a meghívót.
    // A követelmény EFFEKTÍV: az env-kapcsolón felül azt is nézi, van-e már
    // e-ember — 0 e-embernél az ELSŐ (alapító) regisztráció kód nélkül is mehet.
    let meghivo = null;
    if (await MeghivoService.meghivasSzuksegesE()) {
      meghivo = await MeghivoService.kodErvenyesitese(adatok.meghivoKod);
    }

    // === 1. LÉPÉS: EMAIL (OPCIONÁLIS) NORMALIZÁLÁSA + FOGLALTSÁG ELLENŐRZÉSE ===
    // Az e-mail megadása NEM kötelező (adatvédelmi döntés). Ha üresen hagyták,
    // egyáltalán nem tárolunk e-mailt (a mező hiányzik). Ha megadták, kisbetűsítjük,
    // levágjuk, és ellenőrizzük, hogy még szabad-e (egy e-mail = egy fiók).
    const email = adatok.email?.trim()?.toLowerCase() || undefined;
    if (email) {
      const emailLetezik = await eEmberRepository.findByEmail(email);
      if (emailLetezik) {
        throw new Error('Ez az email cím már használatban van');
      }
    }

    // === 2. LÉPÉS: EMBERNÉV FOGLALTSÁG ELLENŐRZÉSE ===
    // ÜZLETI SZABÁLY: Egy eembernév csak egyszer használható
    const nevFoglalt = await eEmberRepository.findByeEmberNev(adatok.eemberNev);
    if (nevFoglalt) {
      throw new Error('Ez a eembernév már foglalt');
    }

    // === 3. LÉPÉS: JELSZÓ ERŐSSÉG VALIDÁLÁSA ===
    // ÜZLETI SZABÁLY: Jelszónak erősnek kell lennie
    const jelszoErosseg = JelszoHelper.validalJelszoErosseg(adatok.jelszo);
    if (!jelszoErosseg.ervényes) {
      throw new Error(`Gyenge jelszó: ${jelszoErosseg.hibak.join(', ')}`);
    }

    // === 4. LÉPÉS: JELSZÓ HASH-ELÉSE ===
    // Biztonsági okokból a jelszót hash-elve tároljuk (bcrypt)
    const hashedJelszo = await JelszoHelper.hashJelszo(adatok.jelszo);

    // === 5. LÉPÉS: EMBER LÉTREHOZÁSA ADATBÁZISBAN ===
    // Repository hívás: csak technikai mentés, nincs validáció
    const ujeEmber = await eEmberRepository.create({
      eemberNev: adatok.eemberNev,
      // Az e-mailt CSAK akkor tesszük be, ha ténylegesen megadták — így e-mail nélkül
      // a mező hiányzik (nem üres/null), és a részleges egyedi index sem érinti.
      ...(email ? { email } : {}),
      jelszo:    hashedJelszo, // ← Hash-elt jelszó!
      nev:       adatok.nev,
      lokacio:   adatok.lokacio,
      // A bizalmi gráf első éle: ki hívta meg (null, ha nyílt a regisztráció)
      meghivoEemberId: meghivo ? meghivo.kibocsatoEemberId : null
    });

    // === 5.b LÉPÉS: MEGHÍVÓ FELHASZNÁLTRA ÁLLÍTÁSA ===
    // Csak sikeres mentés után — a kód innentől nem használható újra
    if (meghivo) {
      await MeghivoService.kodFelhasznalasa(meghivo, ujeEmber._id);
    }

    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    // BIZTONSÁGI SZABÁLY: Jelszó (még hash-elve is) nem mehet ki a válaszban
    const valasz = ujeEmber.toObject(); // Mongoose dokumentum -> plain objektum
    delete valasz.jelszo;               // Jelszó mező törlése

    // === 7. LÉPÉS: JWT TOKEN GENERÁLÁSA ===
    // A bejelentkezéssel megegyező payload, hogy regisztráció után rögtön be legyen jelentkezve
    // Adatminimum: az e-mail NEM kerül a tokenbe (sehol nem használjuk belőle,
    // és a token kliensoldalon olvasható — felesleges személyes adat lenne benne).
    const payload = {
      id:        valasz._id,
      eemberNev: valasz.eemberNev
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    console.log('eEmberService.regisztracio - VÉGE', { id: valasz._id });
    return { eember: valasz, token };
  }

  // ===== BEJELENTKEZÉS =====
  // eEmber bejelentkezése email CÍM vagy eemberNev alapján
  // @param {string} azonosito - Email cím VAGY eemberNev
  // @param {string} jelszo - Egyszerű szöveges jelszó
  // @returns {Promise} { eember, token }
  async bejelentkezes(azonosito, jelszo) {
    console.log('eEmberService.bejelentkezes - KEZDÉS', { azonosito });

    // === 1. LÉPÉS: AZONOSÍTÓ TÍPUSÁNAK MEGHATÁROZÁSA ===
    // Ha tartalmaz '@' karaktert, email cím – különben eemberNev
    const emailE = azonosito.includes('@');

    // === 2. LÉPÉS: EEMBER KERESÉSE ===
    // Email esetén findByEmail, eemberNev esetén findByeEmberNev
    let eember;
    if (emailE) {
      eember = await eEmberRepository.findByEmail(azonosito);
    } else {
      eember = await eEmberRepository.findByeEmberNev(azonosito);
    }

    if (!eember) {
      // BIZTONSÁGI SZABÁLY: ne áruljuk el, melyik mező hibás
      throw new Error('Hibás azonosító vagy jelszó');
    }

    // === 3. LÉPÉS: JELSZÓ ELLENŐRZÉSE ===
    const jelszoHelyes = await JelszoHelper.osszehasonlitJelszo(jelszo, eember.jelszo);
    if (!jelszoHelyes) {
      throw new Error('Hibás azonosító vagy jelszó');
    }

    // === 4. LÉPÉS: UTOLSÓ BEJELENTKEZÉS FRISSÍTÉSE ===
    await eEmberRepository.updateUtolsoBejelentkezes(eember._id);

    // === 5. LÉPÉS: JWT TOKEN GENERÁLÁSA ===
    // A token payload-ba CSAK az ID és az eemberNev kerül — az e-mailt szándékosan
    // NEM tesszük bele (adatminimum; a token kliensoldalon olvasható).
    const payload = {
      id:        eember._id,
      eemberNev: eember.eemberNev
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // === 6. LÉPÉS: JELSZÓ ELTÁVOLÍTÁSA A VÁLASZBÓL ===
    const valasz = eember.toObject();
    delete valasz.jelszo;

    console.log('eEmberService.bejelentkezes - VÉGE', { eemberNev: valasz.eemberNev });
    return { eember: valasz, token };
  }

  // ===== SAJÁT ADATOK LEKÉRÉSE =====
  // A bejelentkezett eember aktuális adatainak lekérése
  // Használat: Főoldal statisztika sáv - eemberNev, tudatpontok
  // @param {string} eemberId - JWT-ből kiolvasott MongoDB ObjectId
  // @returns {Promise} { eemberNev, nev, tudatpontok }
  async sajatAdatokLekereses(eemberId) {
    console.log('eEmberService.sajatAdatokLekereses - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: EEMBER KERESÉSE AZ ADATBÁZISBAN ===
    // Az ID alapján lekérjük a friss adatokat (tudatpont változhatott!)
    const eember = await eEmberRepository.findById(eemberId);

    // === 2. LÉPÉS: LÉTEZÉS ELLENŐRZÉSE ===
    if (!eember) {
      throw new Error('eEmber nem található');
    }

    // === 3. LÉPÉS: CSAK A SZÜKSÉGES MEZŐK VISSZAADÁSA ===
    // Jelszót NEM adunk vissza. Az e-mail és a lokáció a SAJÁT adat (a végpont
    // auth-os, csak a bejelentkezett e-ember kapja) — az eember beállítások
    // modal (terv 8. pont) tölti ki belőlük az űrlapot.
    const valasz = {
      eemberNev:   eember.eemberNev,   // Megjelenítendő felhasználónév
      nev:         eember.nev,          // Valódi név
      email:       eember.email,        // Saját e-mail (más felé SOHA nem megy ki)
      lokacio:     eember.lokacio,      // Ország / régió / település
      tudatpontok: eember.tudatpontok   // Aktuális tudatpont egyenleg
    };

    console.log('eEmberService.sajatAdatokLekereses - VÉGE', { eemberNev: valasz.eemberNev, tudatpontok: valasz.tudatpontok });
    return valasz;
  }

  // ===== PROFIL-ADATOK MÓDOSÍTÁSA =====
  // Az eember beállítások (terv 8. pont): a valódi név, a lokáció és az OPCIONÁLIS
  // e-mail módosítható (utóbbi megadható / módosítható / törölhető). Az eemberNev
  // NEM módosítható (elsődleges azonosító).
  // @param {string} eemberId - A bejelentkezett e-ember azonosítója
  // @param {Object} adatok - { nev, lokacio: { orszag, regio, telepules }, email? }
  // @returns {Promise} Frissített adatok (jelszó nélkül)
  async profilModositasa(eemberId, adatok) {
    console.log('eEmberService.profilModositasa - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: VALIDÁLÁS ===
    const nev = adatok?.nev?.trim();
    const lokacio = adatok?.lokacio ?? {};
    if (!nev) {
      throw new Error('A valódi név megadása kötelező');
    }
    if (!lokacio.orszag?.trim() || !lokacio.regio?.trim() || !lokacio.telepules?.trim()) {
      throw new Error('Az ország, régió és település megadása kötelező');
    }

    // === 1.b LÉPÉS: E-MAIL (OPCIONÁLIS) KEZELÉSE ===
    // Az e-mailnek HÁROM szándéka lehet (a repository ez alapján dönt):
    //   - a kulcs HIÁNYZIK a kérésből (undefined) → nem nyúlunk hozzá (nincs felesleges törlés)
    //   - üres string ('') → null-t adunk tovább = TÖRLÉS
    //   - kitöltött string → beállítás/módosítás (formátum + egyediség önmagát kihagyva)
    let email; // undefined = nincs változás
    if (adatok?.email !== undefined) {
      const tisztitott = adatok.email.trim().toLowerCase();
      if (!tisztitott) {
        email = null; // üresen küldve → törlés
      } else {
        const emailMinta = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailMinta.test(tisztitott)) {
          throw new Error('Érvénytelen email cím');
        }
        const foglalt = await eEmberRepository.findByEmail(tisztitott);
        if (foglalt && foglalt._id.toString() !== eemberId.toString()) {
          throw new Error('Ez az email cím már használatban van');
        }
        email = tisztitott;
      }
    }

    // === 2. LÉPÉS: MENTÉS ===
    // Az `email`: undefined (nincs változás) | null (törlés) | string (beállítás) —
    // a repository ez alapján dönt: nem nyúl hozzá / $unset / $set.
    const frissitett = await eEmberRepository.updateProfil(eemberId, {
      nev,
      lokacio: {
        orszag:    lokacio.orszag.trim(),
        regio:     lokacio.regio.trim(),
        telepules: lokacio.telepules.trim()
      },
      email
    });
    if (!frissitett) {
      throw new Error('eEmber nem található');
    }

    // === 3. LÉPÉS: JELSZÓ NÉLKÜLI VÁLASZ ===
    const valasz = frissitett.toObject();
    delete valasz.jelszo;

    console.log('eEmberService.profilModositasa - VÉGE', { eemberId });
    return valasz;
  }

  // ===== JELSZÓVÁLTÁS =====
  // Csak a RÉGI jelszó helyes megadásával — az új jelszóra ugyanaz az
  // erősség-szabály érvényes, mint regisztrációkor.
  // @param {string} eemberId - A bejelentkezett e-ember azonosítója
  // @param {string} regiJelszo - A jelenlegi jelszó
  // @param {string} ujJelszo - Az új jelszó
  // @returns {Promise<boolean>} true, ha sikeres
  async jelszoValtas(eemberId, regiJelszo, ujJelszo) {
    console.log('eEmberService.jelszoValtas - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: PARAMÉTEREK ===
    if (!regiJelszo || !ujJelszo) {
      throw new Error('A jelenlegi és az új jelszó megadása is kötelező');
    }

    // === 2. LÉPÉS: EEMBER + RÉGI JELSZÓ ELLENŐRZÉSE ===
    const eember = await eEmberRepository.findById(eemberId);
    if (!eember) {
      throw new Error('eEmber nem található');
    }
    const regiHelyes = await JelszoHelper.osszehasonlitJelszo(regiJelszo, eember.jelszo);
    if (!regiHelyes) {
      throw new Error('A jelenlegi jelszó nem megfelelő');
    }

    // === 3. LÉPÉS: ÚJ JELSZÓ ERŐSSÉGE ===
    const jelszoErosseg = JelszoHelper.validalJelszoErosseg(ujJelszo);
    if (!jelszoErosseg.ervényes) {
      throw new Error(`Gyenge jelszó: ${jelszoErosseg.hibak.join(', ')}`);
    }

    // === 4. LÉPÉS: HASH + MENTÉS ===
    const hashedJelszo = await JelszoHelper.hashJelszo(ujJelszo);
    await eEmberRepository.updateJelszo(eemberId, hashedJelszo);

    console.log('eEmberService.jelszoValtas - VÉGE', { eemberId });
    return true;
  }

  // ===== FIÓK-TÖRLÉS (ÖNKÉNTES) =====
  // A bejelentkezett e-ember saját fiókjának végleges törlése — a jelszavával
  // igazolva (visszafordíthatatlan). A lépések SORRENDJE fontos:
  //   1. A tudatpontok VISSZAOSZTÁSA: minden aktív hozzárendelést 0-ra állítunk.
  //      Ez a tudatpontService bevált, tranzakciós útja — a 0-ra esett entitásokat
  //      a „nincs 0-tudatpontos entitás" láncreakció automatikusan törli (a gyerekek
  //      átszülőzésével). Amit MÁSOK is támogatnak, megmarad (a tartalom közösségi).
  //   2. A kapcsolódó „árva" adatok törlése: 0 értékű hozzárendelés-rekordok,
  //      szavazatok, érték-javaslatok, értesítések, értesítési beállítások.
  //   3. A megmaradó entitásoknál a létrehozó anonimizálása (null = „törölt e-ember").
  //   4. Végül maga az e-ember rekord (személyes adat: e-mail, név, jelszó, lokáció).
  // A bizalmi gráf élét (akiket meghívott: mások meghivoEemberId-je) SZÁNDÉKOSAN
  // ÉRINTETLENÜL hagyjuk — a Fázis 2 több-tanúsítós rendszere épül rá.
  // MEGJEGYZÉS: a pont-visszaosztás lépései saját tranzakciókban futnak, ezért az
  // egész törlés nem egyetlen atomi művelet; a sorrend úgy van megválasztva, hogy
  // félbeszakadás esetén a fiók még létezzen és a művelet megismételhető legyen.
  // @param {string} eemberId - A bejelentkezett e-ember azonosítója
  // @param {string} jelszo - A jelszava (megerősítés)
  // @returns {Promise<Object>} { siker: true }
  async eemberTorlese(eemberId, jelszo) {
    console.log('eEmberService.eemberTorlese - KEZDÉS', { eemberId });

    // === 1. LÉPÉS: JELSZÓ-MEGERŐSÍTÉS ===
    if (!jelszo) {
      throw new Error('A törléshez a jelszavad megadása kötelező');
    }
    const eember = await eEmberRepository.findById(eemberId);
    if (!eember) {
      throw new Error('eEmber nem található');
    }
    const jelszoHelyes = await JelszoHelper.osszehasonlitJelszo(jelszo, eember.jelszo);
    if (!jelszoHelyes) {
      throw new Error('A jelszó nem megfelelő');
    }

    // === 2. LÉPÉS: TUDATPONTOK VISSZAOSZTÁSA (0-RA ÁLLÍTÁS, LÁNCREAKCIÓVAL) ===
    // Előbb ÖSSZEGYŰJTJÜK az összes aktív hozzárendelést (lapozva), majd egyesével
    // 0-ra állítjuk. A gyűjtés-előre azért kell, mert a 0-ra állítás közben a
    // hozzárendelés kikerül az „aktív" halmazból (és entitások törlődhetnek).
    const aktivak = [];
    let skip = 0;
    const oldalMeret = 50;
    while (true) {
      const oldal = await TudatpontRepository.findAktivHozzarendelesekByeEmber(eemberId, oldalMeret, skip);
      if (!oldal.length) break;
      for (const h of oldal) {
        aktivak.push({ entitasId: h.entitasId, entitasTipus: h.entitasTipus });
      }
      if (oldal.length < oldalMeret) break;
      skip += oldalMeret;
    }
    console.log('eEmberService.eemberTorlese - aktív hozzárendelések visszaosztása', { darab: aktivak.length });

    for (const a of aktivak) {
      try {
        // 0-ra állítás → az entitás összpontja csökken; 0-nál a láncreakció törli.
        await TudatpontService.tudatpontHozzarendelese(eemberId, a.entitasId, a.entitasTipus, 0);
      } catch (hiba) {
        // Best-effort: ha egy entitás időközben már törlődött (pl. szülője láncreakcióban),
        // az adott visszaosztás elbukhat — a maradék 0-rekordokat a 3. lépés kitakarítja.
        console.warn('eEmberService.eemberTorlese - egy visszaosztás kihagyva', {
          entitasId: a.entitasId, entitasTipus: a.entitasTipus, hiba: hiba.message
        });
      }
    }

    // === 3. LÉPÉS: KAPCSOLÓDÓ ADATOK TÖRLÉSE ===
    await TudatpontRepository.deleteHozzarendelesekByeEmber(eemberId); // maradék 0-rekordok
    await SzavazatRepository.deleteByeEmberId(eemberId);               // szavazatai

    // Érték-javaslatok: előbb KIVONJUK őket a MEGMARADÓ entitások küszöb-hisztogramjából
    // (medián-frissítés), csak utána töröljük a dokumentumokat. A pont-visszaosztás
    // láncreakciójában törölt entitásoknál már nincs hisztogram → a csökkentés kihagyja.
    const ertekJavaslatok = await ErtekJavaslatRepository.findByeEmber(eemberId);
    for (const ej of ertekJavaslatok) {
      try {
        await ErtekSzamitasService.hisztogramCsokkentese(ej.entitasId, ej.entitasTipus, ej);
      } catch (hiba) {
        console.warn('eEmberService.eemberTorlese - hisztogram-csökkentés kihagyva', {
          entitasId: ej.entitasId, hiba: hiba.message
        });
      }
    }
    await ErtekJavaslatRepository.deleteByeEmber(eemberId);            // érték-javaslatai

    await ErtesitesRepository.torolE_EmberOsszes(eemberId);            // értesítései
    await ErtesitesiBeallitasRepository.torolE_EmberOsszes(eemberId); // értesítési beállításai

    // === 4. LÉPÉS: LÉTREHOZÓ/SZERKESZTŐ ANONIMIZÁLÁSA A MEGMARADÓ ENTITÁSOKON ===
    // A még létező (mások által is támogatott) entitásoknál a személyes kötést
    // null-ra állítjuk → a felület „törölt e-embert" mutat.
    // - Tartalom / Kategória / Tartalomtípus: a SZERKESZTŐK tömbösödtek, ezért
    //   minden olyan szerkesztő-elem eemberId-ját nullázzuk, ami erre az e-emberre
    //   mutat (arrayFilters). A bejegyzés MEGMARAD (allapot/eredeti sértetlen),
    //   csak a név válik „törölt e-emberré".
    // - Javaslat / Egyezmény: itt egyszeres `letrehozo` maradt, azt nullázzuk.
    // updateMany: nem fut rá a séma-validáció, de a mezők megengedik a null-t.
    await Promise.all([
      Tartalom.updateMany(
        { 'szerkesztok.eemberId': eemberId },
        { $set: { 'szerkesztok.$[elem].eemberId': null } },
        { arrayFilters: [{ 'elem.eemberId': eemberId }] }
      ),
      Kategoria.updateMany(
        { 'szerkesztok.eemberId': eemberId },
        { $set: { 'szerkesztok.$[elem].eemberId': null } },
        { arrayFilters: [{ 'elem.eemberId': eemberId }] }
      ),
      TartalomTipus.updateMany(
        { 'szerkesztok.eemberId': eemberId },
        { $set: { 'szerkesztok.$[elem].eemberId': null } },
        { arrayFilters: [{ 'elem.eemberId': eemberId }] }
      ),
      Javaslat.updateMany({ letrehozo: eemberId }, { $set: { letrehozo: null } }),
      Egyezmeny.updateMany({ letrehozo: eemberId }, { $set: { letrehozo: null } })
    ]);

    // === 5. LÉPÉS: MAGA AZ E-EMBER REKORD ===
    await eEmberRepository.deleteById(eemberId);

    console.log('eEmberService.eemberTorlese - VÉGE', { eemberId, visszaosztott: aktivak.length });
    return { siker: true };
  }

  // ===== TOKEN ELLENŐRZÉSE =====
  // JWT token validálása és eember lekérése
  // Használat: Védett route-oknál middleware-ben
  // @param {string} token - JWT token
  // @returns {Promise} eEmber objektum
  async ellenorizToken(token) {
    console.log('eEmberService.ellenorizToken - KEZDÉS');

    try {
      // Token dekódolása és validálása
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // eEmber lekérése a token-ben lévő ID alapján
      const eember = await eEmberRepository.findById(decoded.id);

      if (!eember) {
        throw new Error('eEmber nem található');
      }

      // Jelszó eltávolítása
      const valasz = eember.toObject();
      delete valasz.jelszo;

      console.log('eEmberService.ellenorizToken - VÉGE', { eemberNev: valasz.eemberNev });
      return valasz;

    } catch (error) {
      // JWT hibák: TokenExpiredError, JsonWebTokenError
      if (error.name === 'TokenExpiredError') {
        throw new Error('A token lejárt');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Érvénytelen token');
      } else {
        throw error;
      }
    }
  }

}

// ===== EXPORTÁLÁS =====
// Service osztály SINGLETON példány exportálása
module.exports = new eEmberService();