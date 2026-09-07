// koino/meres/felszabaditasMeres.js

// Felelősség: MEGMÉRNI, hány „tiszta buli" után biztonságos felszabadítani az elakadt
// tudatpontot — vagyis a `js/allapot/felszabaditas.js` `MEGULEPEDES_BULIK` értékét.
//
// ===== MIÉRT KELL EZ (Csaba, 2026-09-07) =====
//
// *„Ne időhöz kössük, hanem a bulik számához, amin a készüléke részt vett — és mégjobb
// lenne ezt az értéket méréssel meghatározni."*
//
// A számot ma egy óvatos tipp adja (3). ⛔ A projekt visszatérő tanulsága, hogy az ilyet
// nem saccoljuk meg. Ez a mérés nem igen/nem-et ad, hanem **görbét**: K tiszta buli után
// az esetek hány százalékában érkezik MÉG döntést módosító hír.
//
// ===== MIT VÉD A MEGÜLEPEDÉS =====
//
// Egy késve MEGÉRKEZŐ, de a határidőn BELÜLI időbélyegű szavazat jogosan módosítja az
// eredményt (`javaslatSzamitas.js`). Ha a készülékem addigra már felszabadította a pontomat
// egy törölt gondolatról, és a törlés visszafordul, a gondolat **az én pontom nélkül** tér
// vissza — ha pedig csak az enyém volt rajta, a felszabadításom **maga törli el**.
//
// ⭐ A hiba tehát KORAI felszabadítás. A késői nem hiba: addig csak a keretemből hiányzik
// annyi pont, a koino hibátlanul megy (2026-09-07 óta a kiosztott összeg a saját láncból
// számít).
//
// ===== A MODELL, ÉS AMIT SZÁNDÉKOSAN NEM MODELLEZ =====
//
// N készülék, mindegyiknek T társa. Egy körben minden ÉBREN lévő készülék végigpróbálja a
// társait; ha a társ is ébren van, **kölcsönösen kicserélik a teljes tudásukat** — ez a
// koino cseréje (kétirányú, és mindent átad, ami hiányzik).
//
// ⚠️ A csere PROTOKOLLJÁT nem mérjük (azt a `csereProba.js` őrzi), a hálózati hibákat sem.
// Amit mérünk, az a TERJEDÉS: hány kör alatt ér el egy új esemény mindenkihez, és eközben
// mit lát a mi készülékünk „csendnek".
//
// ⭐ A „késő" készülék a lényeg: ő tart egy határidőn belüli szavazatot, és `alvasKorok`
// körig egyáltalán nem ébred fel. Ez a valódi ellenfél — nem a hálózat lassúsága, hanem
// az, aki csak később kapcsolja be a telefonját.
//
// ===== EZ NEM ÖNPRÓBA =====
//
// Számokat ad, nem igen/nem-et — ezért külön belépő, és nincs a `mind.js`-ben.
//
//   node koino/meres/felszabaditasMeres.js                → az alap-készlet
//   node koino/meres/felszabaditasMeres.js 200 4 60       → N, T, ismétlés
//   KOINO_MAG=7 node koino/meres/felszabaditasMeres.js    → más véletlen-mag

import { kiir } from './naplo.js';

// ===================================
// MEGISMÉTELHETŐ VÉLETLEN
// ===================================
//
// ⚠️ Saját generátor, mert a `Math.random()` nem magvetehető — egy mérésnek pedig
// megismételhetőnek kell lennie, különben nem lehet visszatérni hozzá. (Nulla függőség:
// 6. szabály.)
function veletlenGenerator(mag) {
  let allapot = mag >>> 0;
  return () => {
    allapot = (allapot * 1664525 + 1013904223) >>> 0;
    return allapot / 4294967296;
  };
}

// ===================================
// EGY LEJÁTSZÁS
// ===================================

/**
 * Egyetlen forgatókönyv lejátszása.
 *
 * @param {Object} b - beállítások
 * @returns {{felszabaditasKor: number|null, hirKor: number|null, tisztaBulik: number}}
 *          `felszabaditasKor`: hányadik körben szabadítottunk volna fel K bulinál;
 *          `hirKor`: hányadik körben ért el hozzánk a késői hír (null = sosem);
 *          vagyis KORAI a felszabadítás, ha `hirKor > felszabaditasKor`.
 */
function lejatszas({ n, tarsak, kellBuli, alvasKorok, ebrenlet, korok, veletlen }) {
  // ----- A HÁLÓZAT -----
  // Mindenkinek T véletlen társa. ⚠️ A társ-viszony a koinóban NEM kölcsönös (én felveszem
  // a te címedet, te nem feltétlenül az enyémet) — de a csere igen: ha én hívlak, mindketten
  // megkapjuk a másik újdonságait. Ezért a kapcsolatot kölcsönösként kezeljük a cserénél.
  const szomszedok = [];
  for (let i = 0; i < n; i++) {
    const halmaz = new Set();
    while (halmaz.size < Math.min(tarsak, n - 1)) {
      const j = Math.floor(veletlen() * n);
      if (j !== i) halmaz.add(j);
    }
    szomszedok.push([...halmaz]);
  }

  // ----- A TUDÁS -----
  // Csak EGY eseményt követünk: a késői szavazatot. Aki ismeri, annál `true`.
  // ⭐ Ennyi elég: a mérés kérdése nem az, hogy mennyi adat megy át, hanem hogy MEDDIG TART,
  // amíg egy hír körbeér.
  const ismeri = new Array(n).fill(false);

  // 0 = MI vagyunk (a készülék, ami a pontját fel akarja szabadítani)
  // 1 = a KÉSŐ (nála van a hír, és `alvasKorok`-ig nem ébred)
  const MI = 0;
  const KESO = 1;
  ismeri[KESO] = true;

  let tisztaBulik = 0;
  let felszabaditasKor = null;
  let hirKor = null;

  for (let kor = 1; kor <= korok; kor++) {
    // ----- KI VAN ÉBREN? -----
    const ebren = new Array(n);
    for (let i = 0; i < n; i++) ebren[i] = veletlen() < ebrenlet;
    ebren[KESO] = kor > alvasKorok && veletlen() < ebrenlet;   // ⭐ ő alszik, amíg alszik
    ebren[MI] = true;                                          // mi minden körben próbálunk

    // ----- A KÖR: mindenki végigpróbálja a társait -----
    // ⚠️ A tudás-terjedést a kör KÖZBEN engedjük (nem pillanatképből), mert a valóságban is
    // így van: aki délelőtt hallotta, délután továbbadja.
    let mibenkFelelt = 0;
    for (let i = 0; i < n; i++) {
      if (!ebren[i]) continue;
      for (const j of szomszedok[i]) {
        if (!ebren[j]) continue;
        if (i === MI || j === MI) mibenkFelelt++;
        // KÖLCSÖNÖS csere: mindkettő megkapja, amit a másik tud
        const egyutt = ismeri[i] || ismeri[j];
        ismeri[i] = egyutt;
        ismeri[j] = egyutt;
      }
    }

    // ----- A MI KÖNYVELÉSÜNK -----
    if (ismeri[MI] && hirKor === null) {
      hirKor = kor;
      tisztaBulik = 0;              // ⭐ a döntés jele változott → a számláló nulláról indul
    } else if (mibenkFelelt > 0) {
      tisztaBulik++;                // ⛔ a néma kör nem buli
    }

    if (felszabaditasKor === null && tisztaBulik >= kellBuli) felszabaditasKor = kor;
  }

  return { felszabaditasKor, hirKor, tisztaBulik };
}

// ===================================
// A MÉRÉS
// ===================================

function meres({ n, tarsak, ismetles, ebrenlet, alvasKorok, korok, mag }) {
  const veletlen = veletlenGenerator(mag);

  // Először: MENNYI IDŐ ALATT ÉR KÖRBE EGY HÍR? (ez a K alsó korlátja)
  const terjedes = [];
  for (let i = 0; i < ismetles; i++) {
    const e = lejatszas({ n, tarsak, kellBuli: 9999, alvasKorok, ebrenlet, korok, veletlen });
    if (e.hirKor !== null) terjedes.push(e.hirKor - alvasKorok);   // az ébredés ÓTA hány kör
  }

  // Aztán: K-ra hány százalék a KORAI felszabadítás
  const sorok = [];
  for (let kellBuli = 1; kellBuli <= 8; kellBuli++) {
    let korai = 0, kesoi = 0, sosem = 0;
    for (let i = 0; i < ismetles; i++) {
      const e = lejatszas({ n, tarsak, kellBuli, alvasKorok, ebrenlet, korok, veletlen });
      if (e.hirKor === null) { sosem++; continue; }
      if (e.felszabaditasKor !== null && e.felszabaditasKor < e.hirKor) korai++;
      else kesoi++;
    }
    sorok.push({ kellBuli, korai, kesoi, sosem, arany: Math.round((korai * 1000) / ismetles) / 10 });
  }

  return { terjedes, sorok };
}

// ===================================
// A KIÍRÁS
// ===================================

const ervek = process.argv.slice(2);
const N = parseInt(ervek[0], 10) || 50;
const TARSAK = parseInt(ervek[1], 10) || 3;
const ISMETLES = parseInt(ervek[2], 10) || 200;
const MAG = parseInt(process.env.KOINO_MAG ?? '', 10) || 20260908;

kiir('');
kiir('A FELSZABADÍTÁS MEGÜLEPEDÉSE — hány tiszta buli kell?');
kiir('====================================================');
kiir('');
kiir('  hálózat: ' + N + ' készülék, egyenként ' + TARSAK + ' társsal · '
  + ISMETLES + ' ismétlés · mag: ' + MAG);
kiir('');
kiir('  A HIBA: KORAI felszabadítás — a hír a felszabadítás UTÁN érkezett.');
kiir('  A késői nem hiba: addig csak a keretből hiányzik a pont.');
kiir('');

const kozep = (t) => (t.length ? t.slice().sort((a, b) => a - b)[Math.floor(t.length / 2)] : 0);
const csucs = (t, p) => (t.length ? t.slice().sort((a, b) => a - b)[Math.min(t.length - 1, Math.floor(t.length * p))] : 0);

for (const ebrenlet of [1, 0.6, 0.3]) {
  for (const alvasKorok of [0, 5, 20]) {
    const { terjedes, sorok } = meres({
      n: N, tarsak: TARSAK, ismetles: ISMETLES, ebrenlet, alvasKorok, korok: 120, mag: MAG
    });

    kiir('  ── ébrenlét ' + Math.round(ebrenlet * 100) + '% · a késő ' + alvasKorok
      + ' körig alszik ' + '─'.repeat(Math.max(0, 22 - String(alvasKorok).length)));
    kiir('     a hír terjedése az ébredés óta: medián ' + kozep(terjedes)
      + ' kör · 90% ' + csucs(terjedes, 0.9) + ' kör');
    kiir('     buli:   ' + sorok.map((s) => String(s.kellBuli).padStart(5)).join(''));
    kiir('     korai:  ' + sorok.map((s) => (s.arany + '%').padStart(5)).join(''));
    kiir('');
  }
}

kiir('  ⭐ OLVASAT: a „korai" oszlop akkor esik nullára, ha a kellő buli-szám nagyobb, mint');
kiir('     amennyi idő alatt a hír körbeér. ⚠️ Az alvó készülék ellen NINCS véges szám —');
kiir('     ott a buli-szám nem véd, csak drágít. A kérdés, hogy hol éri meg megállni.');
kiir('');
