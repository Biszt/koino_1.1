// backend/services/emailSablonok.js

// =============================================
// E-MAIL SABLONOK — a koinóból kimenő levelek szövege, egy helyen
// =============================================
//
// Felelősség: minden kimenő levél SZÖVEGE itt készül el. A küldést nem ez végzi
// (arra való az emailKuldoService), csak a tartalmat állítja elő két alakban:
//   - `szoveg`: sima szöveg. EZ A FONTOSABB — sok levelezőprogram (és a szűrők) ezt
//               olvassák, és mindig megjelenik, akkor is, ha a HTML nem töltődik be.
//   - `html`:   egyszerű, INLINE stílusozott HTML. A levelezőkliensek nem ismerik a
//               külső stíluslapot és a modern elrendezéseket (flexbox, grid), ezért
//               itt szándékosan nagyon egyszerű felépítés van.
//
// ===== MINDEN LEVÉL MEGMONDJA, MIÉRT JÖTT =====
// A koino sosem küld magától levelet (lásd emailKuldoService). Ezt az e-ember felé is
// kimondjuk: minden levél lábában ott áll, MELYIK saját kérése nyomán kapta, és — ahol
// értelmezhető — hogyan kapcsolhatja ki. A lábat a keret automatikusan hozzáteszi, így
// nem lehet elfelejteni.
//
// Használják (a későbbi lépésekben): eemberService (megerősítés),
// jelszoHelyreallitasService, emailErtesitesService, tools/emailProba.js
// =============================================

// ===== A LÁB SZÖVEGE INDOKONKÉNT =====
// Az emailKuldoService ENGEDELYEZETT_INDOKOK listájának minden eleméhez tartozik egy
// mondat arról, miért kapta az e-ember a levelet.
const LAB_SZOVEGEK = {
  megerosites:
    'Ezt a levelet azért kaptad, mert a koino beállításaiban az e-mail-címed ' +
    'megerősítését kérted. Ha nem te voltál, hagyd figyelmen kívül ezt a levelet — ' +
    'megerősítés nélkül a cím nem kapcsolódik a fiókhoz.',

  jelszoHelyreallitas:
    'Ezt a levelet azért kaptad, mert valaki jelszó-helyreállítást kért ehhez a ' +
    'címhez. Ha nem te voltál, nincs teendőd: a jelszavad változatlan marad, és a ' +
    'lenti hivatkozás magától érvényét veszti.',

  ertesites:
    'Ezt a levelet azért kaptad, mert bekapcsoltad az e-mailes értesítést a koino ' +
    'beállításaiban. Bármikor kikapcsolhatod ugyanott: fő menü → Értesítési beállítások.',

  osszefoglalo:
    'Ezt az összefoglalót azért kaptad, mert bekapcsoltad az e-mailes értesítést a ' +
    'koino beállításaiban. Az összefoglaló gyakoriságát bármikor átállíthatod, vagy ' +
    'az egészet kikapcsolhatod: fő menü → Értesítési beállítások.',

  proba:
    'Ez egy fejlesztői próbalevél a koino levélküldésének ellenőrzésére. ' +
    'E-embereknek szóló tartalmat nem hordoz.',
};

// ===== SEGÉD: HTML-BE KERÜLŐ SZÖVEG BIZTONSÁGOSSÁ TÉTELE =====
// A levelekbe e-ember által írt szöveg is kerülhet (pl. egy entitás címe az
// összefoglalóban). Ezt nem szabad nyersen HTML-be tenni, mert elronthatná a levél
// szerkezetét. Az öt HTML-jelentésű karaktert entitásra cseréljük.
// @param {string} szoveg - a beillesztendő nyers szöveg
// @returns {string} a HTML-be biztonságosan beilleszthető szöveg
function htmlBiztonsagos(szoveg) {
  return String(szoveg ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== A KÖZÖS LEVÉL-KERET =====
// Minden koino-levél ezen a kereten át készül, hogy egységes legyen a megjelenés és
// hogy a „miért kaptad" láb sose maradjon le.
//
// @param {Object} adatok
// @param {string} adatok.cim         - a levél nagy címsora (a tárgy nem ez, azt külön adjuk)
// @param {string[]} adatok.bekezdesek- a törzs bekezdései (nyers szöveg, nem HTML)
// @param {Object} adatok.gomb        - opcionális { szoveg, link } — a fő cselekvés
// @param {string} adatok.indok       - melyik LAB_SZOVEGEK kerüljön a lábba
// @returns {Object} { szoveg, html }
function keret({ cim, bekezdesek = [], gomb = null, indok }) {
  const labSzoveg = LAB_SZOVEGEK[indok] ?? '';

  // ----- SIMA SZÖVEGES VÁLTOZAT -----
  // A gomb itt egyszerűen a nyers hivatkozás — hogy másolható legyen akkor is, ha a
  // levelezőprogram nem tesz rá kattintható linket.
  const szovegReszek = [cim, '', ...bekezdesek];

  if (gomb) {
    szovegReszek.push('', `${gomb.szoveg}:`, gomb.link);
  }

  szovegReszek.push(
    '',
    '—',
    labSzoveg,
    '',
    'koino — Kollektív Intelligencia Online',
    'https://koino.hu'
  );

  const szoveg = szovegReszek.join('\n');

  // ----- HTML VÁLTOZAT -----
  // Inline stílusok, a koino erdő-témájának színeivel (lásd frontend variables.css).
  const bekezdesekHtml = bekezdesek
    .map((b) => `<p style="margin:0 0 16px 0;">${htmlBiztonsagos(b)}</p>`)
    .join('\n      ');

  const gombHtml = gomb
    ? `<p style="margin:24px 0;">
        <a href="${htmlBiztonsagos(gomb.link)}"
           style="display:inline-block;padding:12px 24px;background:#2d5a27;color:#f7f3ec;
                  text-decoration:none;border-radius:8px;font-weight:bold;">
          ${htmlBiztonsagos(gomb.szoveg)}
        </a>
      </p>
      <p style="margin:0 0 16px 0;font-size:13px;color:#5f5747;">
        Ha a gomb nem működik, másold be ezt a címet a böngésződbe:<br>
        <span style="word-break:break-all;">${htmlBiztonsagos(gomb.link)}</span>
      </p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="hu">
<head><meta charset="utf-8"><title>${htmlBiztonsagos(cim)}</title></head>
<body style="margin:0;padding:24px;background:#ede7de;
             font-family:Helvetica,Arial,sans-serif;color:#2b2318;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;background:#f7f3ec;
              border-radius:12px;padding:32px;">

    <h1 style="margin:0 0 24px 0;font-size:20px;color:#2d5a27;">
      ${htmlBiztonsagos(cim)}
    </h1>

      ${bekezdesekHtml}
      ${gombHtml}

    <hr style="border:none;border-top:1px solid #d4cdc3;margin:32px 0 16px 0;">

    <p style="margin:0 0 8px 0;font-size:13px;color:#5f5747;">
      ${htmlBiztonsagos(labSzoveg)}
    </p>
    <p style="margin:0;font-size:13px;color:#5f5747;">
      <strong>koino</strong> — Kollektív Intelligencia Online ·
      <a href="https://koino.hu" style="color:#2d5a27;">koino.hu</a>
    </p>

  </div>
</body>
</html>`;

  return { szoveg, html };
}

// ===== SABLON: E-MAIL CÍM MEGERŐSÍTÉSE =====
// Az e-ember a beállításokban a „Cím megerősítése" gombbal kérte ezt a levelet.
// A hivatkozás egyszer használatos és 24 óra után lejár.
// @param {Object} adatok
// @param {string} adatok.eemberNev - a címzett e-embernév (megszólításhoz)
// @param {string} adatok.link      - a megerősítő hivatkozás
// @returns {Object} { targy, szoveg, html }
function megerositoLevel({ eemberNev, link }) {
  const { szoveg, html } = keret({
    cim: 'Erősítsd meg az e-mail-címed',
    bekezdesek: [
      `Szia ${eemberNev}!`,
      'A koino beállításaiban azt kérted, hogy megerősítsd ezt az e-mail-címet. ' +
      'Ehhez csak nyisd meg az alábbi hivatkozást.',
      'A megerősítés után két dolgot tudsz majd használni, ha szeretnéd: kérheted, ' +
      'hogy az értesítéseidet e-mailben is megkapd, és elfelejtett jelszó esetén ' +
      'tudunk segíteni a belépésben.',
      'A hivatkozás 24 óráig érvényes, és csak egyszer használható.',
    ],
    gomb: { szoveg: 'E-mail-cím megerősítése', link },
    indok: 'megerosites',
  });

  return { targy: 'koino — erősítsd meg az e-mail-címed', szoveg, html };
}

// ===== SABLON: JELSZÓ-HELYREÁLLÍTÁS =====
// Az e-ember a bejelentkezési képernyőn kérte („Elfelejtetted a jelszavad?").
// A hivatkozás egyszer használatos és 1 óra után lejár.
//
// A szöveg SZÁNDÉKOSAN megnyugtató arra az esetre, ha nem az e-ember kérte: ilyenkor
// nincs teendője, a jelszava érintetlen marad. Ez fontos, mert ezt a levelet bárki
// kiválthatja bárkinek a címére — a fiók viszont csak a levél BIRTOKÁBAN vehető át.
// @param {Object} adatok
// @param {string} adatok.eemberNev - a címzett e-embernév
// @param {string} adatok.link      - a helyreállító hivatkozás
// @returns {Object} { targy, szoveg, html }
function jelszoHelyreallitoLevel({ eemberNev, link }) {
  const { szoveg, html } = keret({
    cim: 'Új jelszó beállítása',
    bekezdesek: [
      `Szia ${eemberNev}!`,
      'A koinóban jelszó-helyreállítást kértél. Az alábbi hivatkozáson új jelszót ' +
      'adhatsz meg, és utána azzal léphetsz be.',
      'A hivatkozás 1 óráig érvényes, és csak egyszer használható.',
      'Ha nem te kérted: nincs teendőd. A jelszavad változatlan marad, és a hivatkozás ' +
      'magától érvényét veszti — amíg meg nem nyitja valaki, a fiókoddal nem történik semmi.',
      'Amikor beállítod az új jelszót, a korábbi bejelentkezéseid MINDEN eszközön ' +
      'megszűnnek. Így ha valaki illetéktelenül fért hozzá a fiókodhoz, azzal ki is zárod.',
    ],
    gomb: { szoveg: 'Új jelszó beállítása', link },
    indok: 'jelszoHelyreallitas',
  });

  return { targy: 'koino — új jelszó beállítása', szoveg, html };
}

// ===== ESEMÉNYTÍPUS → EMBERI SZÖVEG =====
// SZÁNDÉKOSAN UGYANAZOK a megnevezések, mint a felületi értesítés-listában
// (frontend ErtesitesekModal.js TIPUS_SZOVEG). Ha a kettő szétcsúszna, ugyanarról az
// eseményről más nevet olvasna az e-ember a levélben, mint a koinóban — ezért ha ott
// változik egy felirat, ITT is át kell vezetni.
const ERTESITES_TIPUS_SZOVEG = {
  ujJavaslat:        'Új javaslat',
  javaslatElfogadas: 'Javaslat elfogadva',
  javaslatElvetve:   'Javaslat elvetve',
  szavazatErkezett:  'Szavazat érkezett',
  szavazasiHatarido: 'Szavazási határidő közeleg',
  tudatpontValtozas: 'Tudatpont-változás',
  ujGyerekEntitas:   'Új tartalom jött létre',
  kuszobValtozas:    'Küszöbváltozás',
};

// ===== SEGÉD: EGY ÉRTESÍTÉS EMBERI SORA =====
// „Új javaslat — A közösségi költségvetésről" alakban. Ha az entitásnak nincs címe
// (Javaslat/Egyezmény), csak az eseménytípus marad.
// @param {Object} ertesites - { tipus, entitasCim }
// @returns {string} az emberi sor
function ertesitesSor(ertesites) {
  const tipusSzoveg = ERTESITES_TIPUS_SZOVEG[ertesites?.tipus] ?? 'Értesítés';
  const cim = ertesites?.entitasCim;
  return cim ? `${tipusSzoveg} — ${cim}` : tipusSzoveg;
}

// ===== SABLON: EGYETLEN ÉRTESÍTÉS (AZONNALI MÓD) =====
// Akkor megy ki, ha az e-ember bekapcsolta az e-mailes értesítést, és minden eseményt
// azonnal kér. A levél SZÁNDÉKOSAN rövid: a részletek a koinóban vannak, ide csak
// annyi kell, hogy tudja, érdemes-e most megnézni.
// @param {Object} adatok
// @param {string} adatok.eemberNev - a címzett
// @param {Object} adatok.ertesites - { tipus, entitasCim }
// @param {string} adatok.link      - a koino címe
// @returns {Object} { targy, szoveg, html }
function ertesitesLevel({ eemberNev, ertesites, link }) {
  const sor = ertesitesSor(ertesites);

  const { szoveg, html } = keret({
    cim: sor,
    bekezdesek: [
      `Szia ${eemberNev}!`,
      `Történt valami a koinóban, amire feliratkoztál: ${sor}`,
    ],
    gomb: { szoveg: 'Megnézem a koinóban', link },
    indok: 'ertesites',
  });

  return { targy: `koino — ${sor}`, szoveg, html };
}

// ===== SABLON: ÖSSZEFOGLALÓ (IDŐKÖZÖNKÉNTI MÓD) =====
// Egy levél, benne az időszak összes értesítése. A lista SZÁNDÉKOSAN tömör: nem a
// levélben akarjuk elolvastatni a koinót, csak megmutatni, mi történt, hogy eldönthesse,
// érdemes-e most benézni.
//
// A HTML-változatban a sorok listaelemek; a szöveges változatban „• " jelöléssel — mert
// ott nincs formázás, viszont a tagolás így is látszik.
// @param {Object} adatok
// @param {string} adatok.eemberNev  - a címzett
// @param {Array}  adatok.ertesitesek- [{ tipus, entitasCim }, …] időrendben
// @param {string} adatok.link       - a koino címe
// @returns {Object} { targy, szoveg, html }
function osszefoglaloLevel({ eemberNev, ertesitesek, link }) {
  const darab = ertesitesek.length;

  // A tárgy megmondja a lényeget a megnyitás előtt is
  const targy = (darab === 1)
    ? 'koino — 1 új értesítésed van'
    : `koino — ${darab} új értesítésed van`;

  // A sorokat a keret sima szövegként kapja; a felsorolás-jelet itt tesszük ki.
  const sorok = ertesitesek.map((e) => `• ${ertesitesSor(e)}`);

  const { szoveg, html } = keret({
    cim: targy.replace('koino — ', ''),
    bekezdesek: [
      `Szia ${eemberNev}!`,
      'A legutóbbi összefoglaló óta ez történt a koinóban, azokon a helyeken, ' +
      'amiket figyelsz:',
      ...sorok,
    ],
    gomb: { szoveg: 'Megnézem a koinóban', link },
    indok: 'osszefoglalo',
  });

  return { targy, szoveg, html };
}

// ===== SABLON: PRÓBALEVÉL =====
// A tools/emailProba.js használja. Nem e-embernek szól: azt ellenőrzi, hogy a
// beállított szolgáltató valóban kézbesít-e (és hogy a feladó-domain rendben van-e).
// @param {string} idopontSzoveg - a küldés időpontja emberi alakban
// @returns {Object} { targy, szoveg, html }
function probaLevel(idopontSzoveg) {
  const { szoveg, html } = keret({
    cim: 'koino — próbalevél',
    bekezdesek: [
      'Ez a levél azt igazolja, hogy a koino levélküldése működik.',
      `A küldés időpontja: ${idopontSzoveg}`,
      'Ha ezt a levelet a Beérkezettek között látod (nem a spam mappában), akkor a ' +
      'feladó-domain hitelesítése (SPF/DKIM/DMARC) is rendben van.',
    ],
    indok: 'proba',
  });

  return { targy: 'koino — próbalevél', szoveg, html };
}

// ===== EXPORTÁLÁS =====
module.exports = {
  keret,                   // A közös keret — minden további sablon ezen át készül
  megerositoLevel,         // 2. lépés: az e-mail cím igazolása
  jelszoHelyreallitoLevel, // 3. lépés: elfelejtett jelszó
  ertesitesLevel,          // 4. lépés: egyetlen értesítés (azonnali mód)
  osszefoglaloLevel,       // 5. lépés: időközönkénti összefoglaló
  ertesitesSor,            // Segéd — az 5. lépés összefoglalója is ezt használja majd
  ERTESITES_TIPUS_SZOVEG,
  probaLevel,       // 1. lépés: a levélküldés ellenőrzése
  htmlBiztonsagos,  // Segéd a további sablonokhoz (entitás-címek beillesztéséhez)
  LAB_SZOVEGEK,
};
