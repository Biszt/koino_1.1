// backend/services/emailKuldoService.js

// =============================================
// E-MAIL KÜLDŐ SERVICE — A KOINO EGYETLEN KIMENŐ LEVÉL-KAPUJA
// =============================================
//
// Felelősség: minden koinóból kimenő e-mail EZEN a fájlon megy át. Sehol máshol a
// kódban NEM lehet levelet küldeni — ha valaha mégis kerülne ide másik küldő út, az
// megkerülné az itt kikényszerített szabályokat.
//
// ===== A LEGFONTOSABB SZABÁLY (Csaba, 2026-08-24) =====
// A PROGRAM MAGÁTÓL SOHA NEM KÜLD LEVELET. Minden kimenő levélhez tartozik egy
// azonosítható, e-ember általi KÉRÉS. Ezt itt három őr érvényesíti:
//
//   1. KÖTELEZŐ `indok`: minden hívásnak meg kell neveznie, MIÉRT megy ki a levél.
//      Ismeretlen indok = nincs küldés. Így nem lehet „csak úgy" levelet küldeni.
//   2. MEGERŐSÍTETT CÍM: a `kuldesEemberNek()` csak megerősített e-mail-címre küld.
//      Egyetlen kivétel a 'megerosites' indok — hiszen pont az teszi megerősítetté.
//   3. FAIL-SAFE ALAPÉRTELMEZÉS: ha bármi hiányzik a beállításokból (szolgáltató,
//      API-kulcs, feladó), a kapu NEM küld, hanem naplóz. Hiányos beállítással
//      sosem próbálkozik valódi küldéssel.
//
// ===== ÜZEMMÓDOK =====
//   'naplo'  — NEM küld valódi levelet, csak kiírja a konzolra. Ez az alapértelmezés,
//              és fejlesztés közben (localhost:3000) végig ebben dolgozunk.
//   'resend' — valódi küldés a Resend API-n át
//   'brevo'  — valódi küldés a Brevo API-n át
// A módot az EMAIL_SZOLGALTATO környezeti változó adja (lásd backend/.env).
//
// ===== HIBAKEZELÉS =====
// Ez a service SOHA nem dob hibát a hívó felé. Egy levélküldési hiba (lejárt kulcs,
// hálózati zavar) NEM boríthatja fel a szavazást, a javaslattételt vagy bármely más
// koino-műveletet. Minden hívás egy eredmény-objektummal tér vissza.
//
// Használják (a későbbi lépésekben): emailErtesitesService, jelszoHelyreallitasService,
// eemberService (cím-megerősítés), tools/emailProba.js
// =============================================

// A Node 18 beépített `fetch`-ét használjuk — nem kell hozzá új npm csomag.

// ===== ENGEDÉLYEZETT INDOKOK =====
// Minden kimenő levélnek EZEK EGYIKE kell legyen az indoka. A lista szándékosan zárt:
// új levél-fajtát csak úgy lehet bevezetni, ha ide is bekerül — vagyis tudatos döntéssel.
const ENGEDELYEZETT_INDOKOK = new Set([
  'megerosites',        // Cím-megerősítő levél (az e-ember a gombbal kérte)
  'jelszoHelyreallitas',// Jelszó-helyreállító link (az e-ember az űrlapon kérte)
  'ertesites',          // Egyetlen értesítés azonnali módban (bekapcsolt e-mail értesítés)
  'osszefoglalo',       // Időközönkénti összefoglaló (bekapcsolt e-mail értesítés)
  'proba',              // Fejlesztői próbalevél (tools/emailProba.js) — e-embert nem érint
]);

// ===== BEÁLLÍTÁSOK BEOLVASÁSA =====
// Minden híváskor frissen olvassuk a környezeti változókat, hogy a konténer
// újraindítása nélkül is helyes képet adjon a napló (és a tesztelés egyszerűbb legyen).
// @returns {Object} { mod, apiKulcs, felado, publikusUrl }
function beallitasokBeolvasasa() {
  return {
    mod:         (process.env.EMAIL_SZOLGALTATO ?? 'naplo').trim().toLowerCase(),
    apiKulcs:    (process.env.EMAIL_API_KULCS ?? '').trim(),
    felado:      (process.env.EMAIL_FELADO ?? '').trim(),
    publikusUrl: (process.env.PUBLIKUS_URL ?? '').trim(),
  };
}

// ===== A TÉNYLEGES ÜZEMMÓD ELDÖNTÉSE =====
// A beállított mód csak akkor érvényesül, ha MINDEN hozzá tartozó adat megvan.
// Bármi hiányzik → visszaesünk 'naplo' módba (fail-safe: sosem küldünk félkész
// beállítással, mert abból hibás feladó vagy elutasított levél lenne).
// @param {Object} beallitasok - a beallitasokBeolvasasa eredménye
// @returns {Object} { mod, ok } — az `ok` mondja meg, miért esett vissza (ha visszaesett)
function tenylegesMod(beallitasok) {
  const { mod, apiKulcs, felado } = beallitasok;

  if (mod === 'naplo') return { mod: 'naplo', ok: 'beállítás szerint napló-mód' };

  if (mod !== 'resend' && mod !== 'brevo') {
    return { mod: 'naplo', ok: `ismeretlen szolgáltató: "${mod}"` };
  }
  if (!apiKulcs) return { mod: 'naplo', ok: 'hiányzó EMAIL_API_KULCS' };
  if (!felado)   return { mod: 'naplo', ok: 'hiányzó EMAIL_FELADO' };

  return { mod, ok: 'minden beállítás megvan' };
}

// ===== SEGÉD: E-MAIL CÍM TAKARÁSA A NAPLÓBAN =====
// A napló a szerver-gépen marad, de a személyes adatot ott sem írjuk ki teljesen.
// Példa: "csaba.teszt@gmail.com" → "cs***@gmail.com"
// @param {string} cim - a takarandó e-mail cím
// @returns {string} a takart cím
function cimTakarasa(cim) {
  if (typeof cim !== 'string' || !cim.includes('@')) return '(érvénytelen cím)';
  const [nev, domain] = cim.split('@');
  const eleje = nev.slice(0, 2);
  return `${eleje}***@${domain}`;
}

// ===== SEGÉD: EGYSZERŰ E-MAIL CÍM ELLENŐRZÉS =====
// Nem teljes RFC-validáció (az gyakorlatilag lehetetlen) — csak a nyilvánvalóan
// hibás címeket fogja ki, mielőtt a szolgáltatóhoz fordulnánk.
// @param {string} cim - az ellenőrzendő cím
// @returns {boolean} true, ha nagy valószínűséggel valódi cím
function cimErvenyesE(cim) {
  if (typeof cim !== 'string') return false;
  const tisztitott = cim.trim();
  if (tisztitott.length < 5 || tisztitott.length > 254) return false;
  // Pontosan egy @, előtte és utána van szöveg, a domainben van legalább egy pont
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tisztitott);
}

// ===== KÜLDÉS: RESEND =====
// A Resend API egyetlen POST hívása. https://api.resend.com/emails
// @returns {Promise<Object>} { sikeres, hiba }
async function kuldesResend({ cimzett, targy, szoveg, html, apiKulcs, felado }) {
  const valasz = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKulcs}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    felado,
      to:      [cimzett],
      subject: targy,
      text:    szoveg,
      html:    html,
    }),
  });

  if (!valasz.ok) {
    const hibaSzoveg = await valasz.text().catch(() => '(a hibaválasz nem olvasható)');
    return { sikeres: false, hiba: `Resend ${valasz.status}: ${hibaSzoveg}` };
  }
  return { sikeres: true, hiba: null };
}

// ===== KÜLDÉS: BREVO =====
// A Brevo API egyetlen POST hívása. https://api.brevo.com/v3/smtp/email
// A feladót itt objektumként kell megadni, ezért a "Név <cim@domain>" alakot
// szétbontjuk névre és címre.
// @returns {Promise<Object>} { sikeres, hiba }
async function kuldesBrevo({ cimzett, targy, szoveg, html, apiKulcs, felado }) {
  // A "koino <ertesites@koino.hu>" alak szétbontása; ha nincs név, a cím önmagában áll
  const egyezes = felado.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const feladoNev  = egyezes ? egyezes[1] : 'koino';
  const feladoCim  = egyezes ? egyezes[2] : felado;

  const valasz = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key':      apiKulcs,
      'Content-Type': 'application/json',
      'Accept':       'application/json',
    },
    body: JSON.stringify({
      sender:      { name: feladoNev, email: feladoCim },
      to:          [{ email: cimzett }],
      subject:     targy,
      textContent: szoveg,
      htmlContent: html,
    }),
  });

  if (!valasz.ok) {
    const hibaSzoveg = await valasz.text().catch(() => '(a hibaválasz nem olvasható)');
    return { sikeres: false, hiba: `Brevo ${valasz.status}: ${hibaSzoveg}` };
  }
  return { sikeres: true, hiba: null };
}

// ===== ALACSONY SZINTŰ KÜLDÉS (CÍMRE) =====
// EZT CSAK AKKOR HÍVD KÖZVETLENÜL, ha a címzett NEM egy e-ember (pl. fejlesztői
// próbalevél). E-embernek szóló levélhez MINDIG a `kuldesEemberNek()` a helyes út,
// mert az ellenőrzi a cím megerősítettségét is.
//
// @param {Object} adatok
// @param {string} adatok.cimzett - a címzett e-mail címe
// @param {string} adatok.targy   - a levél tárgya
// @param {string} adatok.szoveg  - a levél sima szöveges változata (kötelező)
// @param {string} adatok.html    - a levél HTML változata (opcionális)
// @param {string} adatok.indok   - MIÉRT megy ki (ENGEDELYEZETT_INDOKOK egyike)
// @returns {Promise<Object>} { sikeres, mod, ok, hiba }
async function kuldes({ cimzett, targy, szoveg, html = null, indok }) {
  console.log('emailKuldoService.kuldes - KEZDÉS', {
    cimzett: cimTakarasa(cimzett),
    targy,
    indok,
  });

  // ----- 1. ŐR: AZ INDOK -----
  // Ismeretlen vagy hiányzó indok = a levél nem egy azonosítható kéréshez tartozik.
  if (!ENGEDELYEZETT_INDOKOK.has(indok)) {
    console.error('emailKuldoService.kuldes - VÉGE: ELUTASÍTVA (ismeretlen indok)', { indok });
    return { sikeres: false, mod: 'nincs', ok: 'ismeretlen indok', hiba: `Ismeretlen indok: ${indok}` };
  }

  // ----- 2. ŐR: A KÖTELEZŐ TARTALOM -----
  if (!cimErvenyesE(cimzett)) {
    console.error('emailKuldoService.kuldes - VÉGE: ELUTASÍTVA (érvénytelen cím)');
    return { sikeres: false, mod: 'nincs', ok: 'érvénytelen cím', hiba: 'Érvénytelen e-mail cím' };
  }
  if (!targy || !szoveg) {
    console.error('emailKuldoService.kuldes - VÉGE: ELUTASÍTVA (hiányzó tárgy vagy szöveg)');
    return { sikeres: false, mod: 'nincs', ok: 'hiányzó tartalom', hiba: 'Hiányzó tárgy vagy szöveg' };
  }

  // ----- 3. ŐR: A BEÁLLÍTÁSOK -----
  const beallitasok = beallitasokBeolvasasa();
  const { mod, ok } = tenylegesMod(beallitasok);

  // ----- NAPLÓ MÓD: nincs valódi küldés -----
  // Fejlesztés közben ez fut. A teljes folyamat (token, sablon, címzett-feloldás)
  // végigmegy és ellenőrizhető, csak a levél nem hagyja el a gépet.
  if (mod === 'naplo') {
    console.log('emailKuldoService.kuldes - NAPLÓ MÓD (nincs valódi küldés)', { ok });
    console.log('--------- KIMENŐ LEVÉL (napló) ---------');
    console.log('  Címzett:', cimTakarasa(cimzett));
    console.log('  Tárgy:  ', targy);
    console.log('  Indok:  ', indok);
    console.log('  Szöveg: ');
    console.log(szoveg);
    console.log('----------------------------------------');
    console.log('emailKuldoService.kuldes - VÉGE', { sikeres: true, mod: 'naplo' });
    return { sikeres: true, mod: 'naplo', ok, hiba: null };
  }

  // ----- VALÓDI KÜLDÉS -----
  try {
    const parameterek = {
      cimzett, targy, szoveg,
      html:     html ?? szoveg,
      apiKulcs: beallitasok.apiKulcs,
      felado:   beallitasok.felado,
    };

    const eredmeny = (mod === 'resend')
      ? await kuldesResend(parameterek)
      : await kuldesBrevo(parameterek);

    if (!eredmeny.sikeres) {
      // A hibát NAPLÓZZUK, de nem dobjuk tovább — a hívó műveletnek futnia kell.
      console.error('emailKuldoService.kuldes - VÉGE: a szolgáltató elutasította', {
        mod, hiba: eredmeny.hiba,
      });
      return { sikeres: false, mod, ok, hiba: eredmeny.hiba };
    }

    console.log('emailKuldoService.kuldes - VÉGE', { sikeres: true, mod });
    return { sikeres: true, mod, ok, hiba: null };

  } catch (hiba) {
    // Hálózati zavar, DNS-hiba, időtúllépés — szintén csak naplózzuk
    console.error('emailKuldoService.kuldes - VÉGE: kivétel a küldés során', {
      mod, hiba: hiba.message,
    });
    return { sikeres: false, mod, ok, hiba: hiba.message };
  }
}

// ===== KÜLDÉS E-EMBERNEK (EZ A NORMÁL ÚT) =====
// Minden e-embernek szóló levél EZEN megy át. Az alacsony szintű `kuldes()`-hez képest
// egyetlen dolgot tesz hozzá — de az a legfontosabb: MEGERŐSÍTETT CÍM NÉLKÜL NEM KÜLD.
//
// Miért: az e-mail cím megadása önmagában nem bizonyítja, hogy a cím az e-emberé
// (elgépelhette, vagy szándékosan másét írhatta be). Megerősítetlen címre küldeni
// egyszerre lenne kéretlen levél egy idegennek, és fiók-átvételi kockázat
// (a jelszó-helyreállító link idegenhez jutna).
//
// KIVÉTEL: a 'megerosites' indok — az a levél teszi éppen megerősítetté a címet,
// tehát azt szükségszerűen megerősítetlen címre küldjük.
//
// @param {Object} adatok
// @param {Object} adatok.eember - a címzett e-ember dokumentuma (email, emailMegerositve)
// @param {string} adatok.targy  - a levél tárgya
// @param {string} adatok.szoveg - sima szöveges változat
// @param {string} adatok.html   - HTML változat (opcionális)
// @param {string} adatok.indok  - MIÉRT megy ki (ENGEDELYEZETT_INDOKOK egyike)
// @returns {Promise<Object>} { sikeres, mod, ok, hiba }
async function kuldesEemberNek({ eember, targy, szoveg, html = null, indok }) {
  console.log('emailKuldoService.kuldesEemberNek - KEZDÉS', {
    eemberNev: eember?.eemberNev,
    indok,
  });

  // ----- Van-e egyáltalán címe? -----
  // Az e-mail opcionális: sok e-ember egyáltalán nem adott meg címet.
  if (!eember?.email) {
    console.log('emailKuldoService.kuldesEemberNek - VÉGE: nincs e-mail cím');
    return { sikeres: false, mod: 'nincs', ok: 'nincs e-mail cím', hiba: null };
  }

  // ----- MEGERŐSÍTETT-E A CÍM? -----
  // A 'megerosites' indok az egyetlen kivétel (lásd a metódus leírását).
  if (indok !== 'megerosites' && eember.emailMegerositve !== true) {
    console.log('emailKuldoService.kuldesEemberNek - VÉGE: a cím NINCS megerősítve, nem küldünk', {
      eemberNev: eember.eemberNev, indok,
    });
    return { sikeres: false, mod: 'nincs', ok: 'a cím nincs megerősítve', hiba: null };
  }

  const eredmeny = await kuldes({ cimzett: eember.email, targy, szoveg, html, indok });

  console.log('emailKuldoService.kuldesEemberNek - VÉGE', {
    eemberNev: eember.eemberNev, sikeres: eredmeny.sikeres, mod: eredmeny.mod,
  });
  return eredmeny;
}

// ===== ÜZEMMÓD LEKÉRDEZÉSE (diagnosztika) =====
// A tools/emailProba.js és a későbbi hibakeresés használja: megmondja, valódi
// küldésre van-e beállítva a rendszer, és ha nem, miért nem.
// @returns {Object} { mod, ok, feladoBeallitva, publikusUrl }
function uzemmodLekerdezese() {
  const beallitasok = beallitasokBeolvasasa();
  const { mod, ok } = tenylegesMod(beallitasok);
  return {
    mod,
    ok,
    feladoBeallitva: !!beallitasok.felado,
    publikusUrl:     beallitasok.publikusUrl || '(nincs beállítva)',
  };
}

// ===== EXPORTÁLÁS =====
module.exports = {
  kuldes,             // Alacsony szintű: konkrét CÍMRE (csak nem-e-ember címzetthez)
  kuldesEemberNek,    // A normál út: e-embernek, megerősítés-ellenőrzéssel
  uzemmodLekerdezese, // Diagnosztika
  ENGEDELYEZETT_INDOKOK,
};
