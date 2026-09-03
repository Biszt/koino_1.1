// koino/meres/ebredesProba.js

// Felelősség: MEGMÉRNI, hogy egy készülék NÖVEKVŐ SZÜNETEK után is fel tud-e ébredni —
// és hogy ébredés után **tud-e még kapcsolódni**. Ez a „buli" (összehangolt ablak)
// legkeményebb pontja.
//
// ===== MIÉRT KÉT DOLGOT MÉR EGYSZERRE (Csaba ötlete, 2026-09-02) =====
//
// Az első változat csak azt naplózta, hogy felébredt-e a folyamat. Csaba kérése az volt,
// hogy legyen **élethűbb**: időzítővel, növekvő szünetekkel, és **a koino program csinálja**
// — vagyis próbáljon meg tényleg csatlakozni.
//
// ⭐ Ez sokkal többet mond, mint egy naplósor, mert **két külön dolog romolhat el:**
//
//   1. AZ ÉBREDÉS — az Android „Doze" módja kötegeli az ébresztéseket, felfüggeszti az
//      alkalmazásokat, és hosszabb idő után meg is ölheti a folyamatot.
//   2. A KAPCSOLÓDÁS — négy óra alvás után a NAT-rés **biztosan** bezárult. Hiába ébredünk
//      fel, ha onnan már nem érünk el senkit. *(Ezt az első változat egyáltalán nem mérte.)*
//
// ===== A NÖVEKVŐ ÜTEMTERV =====
//
// Alapból: 1 perc → 5 perc → 1 óra → 4 óra (mindegyik az ELŐZŐ próbálkozás után).
// ⭐ Ennek az a haszna, hogy **korán ad részeredményt**: hat perc után már tudod, működik-e
// a rövid alvás, és nem kell órákat várni az első információért.
//
// ===== HOGYAN FUTTASD =====
//
// A MÁSIK készüléken (pl. a laptopon, otthon) fusson a kapu:
//   node koino/koino.js figyel
//
// A MÉRŐ készüléken (a telefonon, akár másik hálózaton) legyen felvéve a társ, majd:
//   node koino/meres/ebredesProba.js fut              — 1, 5, 60, 240 perc
//   node koino/meres/ebredesProba.js fut 1 5 15       — saját ütemterv
//   node koino/meres/ebredesProba.js olvas            — összegzés
//
// ⭐ FUTTASD KÉTSZER: először csak úgy, aztán `termux-wake-lock` után. A kettő különbsége
// mondja meg, kell-e ébrentartó, és mit ér.
//
// ⚠️ Közben NE nyisd meg a Termuxot — attól a rendszer „aktívnak" veszi, és a mérés hazudik.
//
// A napló hozzáfűzhető: ha a rendszer megöli a folyamatot és újraindítod, folytatódik.

import { kiir } from './naplo.js';

import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { alapHely, esemenyTarNyitasa, tarsakTarolo } from '../js/tar/fajlTar.js';
import { tarsakSorrendje, korbeCsere } from '../js/csere/tarsak.js';
import { csereVonalon } from '../js/csere/vonal.js';

// ===================================
// ÁLLANDÓK
// ===================================

const KOINO = process.env.KOINO_AZONOSITO ?? 'sajat';
const NAPLO_FAJL = join(alapHely(), 'ebredes-naplo.jsonl');

// Az alapértelmezett ütemterv, percben — mindegyik az előző próbálkozás UTÁN.
const ALAP_UTEMTERV = [1, 5, 60, 240];

// Ébredés után a hálózat lassabb lehet, mint rendes üzemben — adjunk neki időt.
const IDOKORLAT_MS = 15000;

/** Egy sor a naplóba. */
async function feljegyez(bejegyzes) {
  await mkdir(alapHely(), { recursive: true });
  await appendFile(NAPLO_FAJL, JSON.stringify(bejegyzes) + '\n', 'utf8');
}

// ===================================
// EGY LÉPÉS: ébredés + valódi csere
// ===================================

/**
 * Végigpróbálja a társ-listát — ugyanazzal a hívással, amit az `orjarat` is használ.
 *
 * ⚠️ SZÁNDÉKOSAN A VALÓDI UTAT hívjuk, nem egy egyszerűsített kapcsolat-próbát: a kérdés
 * nem az, hogy „nyílik-e egy foglalat", hanem hogy **a koino tud-e dolgozni** ébredés után.
 *
 * @param {Object} tar
 * @param {Object} tarolo - a társ-lista tárolója
 * @returns {Promise<Object>} a kör összegzése
 */
async function csereKor(tar, tarolo) {
  const lista = await tarolo.olvas();
  if (!lista.length) return { tarsak: 0, sikeres: 0, uj: 0, kuldott: 0, bajt: 0 };

  const hirdetjuk = tarsakSorrendje(lista).map((t) => ({ hoszt: t.hoszt, port: t.port }));

  const kor = await korbeCsere(lista,
    (t) => csereVonalon(tar, KOINO, t.hoszt, t.port, IDOKORLAT_MS, hirdetjuk));

  // A társ-lista frissül (utoljara / sikertelen) — ez helyi megfigyelés, sosem terjed.
  await tarolo.ir(kor.lista);

  let sikeres = 0, uj = 0, kuldott = 0, bajt = 0;
  const hibak = [];
  for (const e of kor.eredmenyek) {
    if (e.sikerult) {
      sikeres++;
      uj += e.uj ?? 0;
      kuldott += e.kuldott ?? 0;
      bajt += (e.bajtKuldott ?? 0) + (e.bajtKapott ?? 0);
    } else if (hibak.length < 3) {
      hibak.push(e.hiba);
    }
  }

  return { tarsak: kor.eredmenyek.length, sikeres, uj, kuldott, bajt, hibak };
}

// ===================================
// A MÉRÉS
// ===================================

/**
 * Végigmegy az ütemterven: alszik, ébred, cserél, feljegyez.
 *
 * ⚠️ MIÉRT ABSZOLÚT IDŐPONTHOZ MÉRÜNK? Mert ha a rendszer felfüggeszti a folyamatot, az
 * ébredés KÉSVE következik be — és a késés maga a mérési eredmény. Ha a szünetet a
 * tényleges ébredéstől számolnánk, a csúszás elmosódna.
 *
 * @param {Array<number>} utemterv - szünetek percben
 */
async function fut(utemterv) {
  const tar = await esemenyTarNyitasa(KOINO);
  const tarolo = tarsakTarolo();
  const tarsakSzama = (await tarolo.olvas()).length;

  const indulas = Date.now();

  kiir('');
  kiir('ÉBREDÉS-PRÓBA — a „buli" ablakának mérése, valódi cserével');
  kiir('  koino:     ' + KOINO);
  kiir('  társak:    ' + tarsakSzama + (tarsakSzama ? '' : '   ⚠️ NINCS TÁRS — csak az ébredést méri!'));
  kiir('  ütemterv:  ' + utemterv.join(' → ') + ' perc');
  kiir('  napló:     ' + NAPLO_FAJL);
  kiir('');
  kiir('⭐ Most kapcsold ki a képernyőt, és tedd le a telefont. NE nyisd meg a Termuxot.');
  kiir('   Bármikor megnézheted:  node koino/meres/ebredesProba.js olvas');
  kiir('');

  await feljegyez({ mi: 'indulas', ido: indulas, utemterv, tarsak: tarsakSzama });

  let tervezett = indulas;

  for (const [i, szunetPerc] of utemterv.entries()) {
    tervezett += Math.round(szunetPerc * 60 * 1000);

    const varakozas = tervezett - Date.now();
    if (varakozas > 0) {
      await new Promise((kesz) => setTimeout(kesz, varakozas));
    }

    const ebredes = Date.now();
    const csuszasMp = Math.round((ebredes - tervezett) / 1000);

    // ----- A VALÓDI MUNKA -----
    const kezdet = Date.now();
    let csere = null, hiba = null;
    try {
      csere = await csereKor(tar, tarolo);
    } catch (e) {
      hiba = e.message;
    }
    const csereMs = Date.now() - kezdet;

    await feljegyez({
      mi: 'lepes', lepes: i + 1, szunetPerc,
      tervezett, ebredes, csuszasMp, csereMs, csere, hiba
    });

    kiir('  ' + (i + 1) + '. lépés (' + szunetPerc + ' perc szünet) — '
      + new Date(ebredes).toLocaleTimeString('hu-HU'));
    kiir('     ébredés csúszása: ' + csuszasMp + ' mp'
      + (csuszasMp > szunetPerc * 6 ? '   ⚠️ SOKAT KÉSETT' : ''));
    if (hiba) {
      kiir('     csere: ⚠️ HIBA — ' + hiba);
    } else if (!csere.tarsak) {
      kiir('     csere: nincs társ a listán');
    } else {
      kiir('     csere: ' + csere.sikeres + '/' + csere.tarsak + ' társ'
        + (csere.sikeres
          ? '   +' + csere.uj + ' esemény, ' + Math.round(csere.bajt / 1024 * 10) / 10 + ' KB, '
            + csereMs + ' ms'
          : '   ⚠️ EGYIK SEM SIKERÜLT'));
    }
    kiir('');
  }

  await feljegyez({ mi: 'vege', ido: Date.now() });
  kiir('✅ Az ütemterv végigfutott. Összegzés: node koino/meres/ebredesProba.js olvas');
  kiir('');
}

// ===================================
// AZ ÖSSZEGZÉS
// ===================================

async function olvas() {
  let szoveg;
  try {
    szoveg = await readFile(NAPLO_FAJL, 'utf8');
  } catch {
    kiir('\nMég nincs napló. Előbb: node koino/meres/ebredesProba.js fut\n');
    return;
  }

  const sorok = szoveg.split('\n').filter((s) => s.trim()).map((s) => JSON.parse(s));

  // Futásokra bontás — a napló több futást is tartalmazhat (ha megölték és újraindítottad).
  const futasok = [];
  for (const sor of sorok) {
    if (sor.mi === 'indulas') futasok.push({ ...sor, lepesek: [], befejezte: false });
    else if (!futasok.length) continue;
    else if (sor.mi === 'vege') futasok[futasok.length - 1].befejezte = true;
    else futasok[futasok.length - 1].lepesek.push(sor);
  }

  kiir('');
  kiir('══════════════════════════════════════════════════════════════');
  kiir('  ÉBREDÉS-PRÓBA — ÖSSZEGZÉS');
  kiir('══════════════════════════════════════════════════════════════');

  for (const [i, f] of futasok.entries()) {
    kiir('');
    kiir('  ' + (i + 1) + '. futás — ' + new Date(f.ido).toLocaleString('hu-HU')
      + '   (ütemterv: ' + (f.utemterv ?? []).join(' → ') + ' perc · társ: ' + (f.tarsak ?? 0) + ')');
    kiir('');

    if (!f.lepesek.length) {
      kiir('     ⚠️ EGYETLEN LÉPÉS SEM FUTOTT LE — a folyamat az első szünetet sem élte túl.');
      continue;
    }

    kiir('     szünet  | ébredés csúszása | csere');
    kiir('     --------|------------------|----------------------------------');
    for (const l of f.lepesek) {
      const csereSzoveg = l.hiba ? '⚠️ hiba: ' + l.hiba
        : !l.csere?.tarsak ? 'nincs társ'
          : l.csere.sikeres
            ? '✅ ' + l.csere.sikeres + '/' + l.csere.tarsak + '  +' + l.csere.uj + ' esemény, '
              + l.csereMs + ' ms'
            : '⚠️ 0/' + l.csere.tarsak + ' — nem sikerült';
      kiir('     ' + (l.szunetPerc + ' p').padStart(7) + ' | '
        + (l.csuszasMp + ' mp').padStart(16) + ' | ' + csereSzoveg);
    }

    const hiany = (f.utemterv ?? []).length - f.lepesek.length;
    kiir('');
    if (!f.befejezte) {
      kiir('     ⚠️ A FUTÁS NEM ÉRT VÉGET' + (hiany > 0 ? ' — ' + hiany + ' lépés elmaradt.' : '.')
        + ' A folyamatot vagy megölték, vagy még fut.');
    } else {
      kiir('     ✅ Az ütemterv végigfutott.');
    }
  }

  kiir('');
  kiir('  MIT KELL EBBŐL KIOLVASNI:');
  kiir('   · CSÚSZÁS pár másodperc → az ablak tartható, a rendszer nem kötegel bele;');
  kiir('     ha a csúszás perces nagyságrendű, a Doze átütemez, és az „egyszerre');
  kiir('     ébredünk" ígéret magától nem áll.');
  kiir('   · A CSERE oszlop külön kérdés: ha az ébredés sikerül, de a csere nem, akkor');
  kiir('     nem az operációs rendszer a baj, hanem a NAT-rés zárult be alvás alatt.');
  kiir('   · Ha egy lépés hiányzik és a futás nem ért véget → a folyamatot MEGÖLTÉK;');
  kiir('     az utolsó sikeres szünet mondja meg, meddig bírja ébrentartó nélkül.');
  kiir('');
}

// ===================================
// BELÉPŐ
// ===================================

const parancs = process.argv[2] ?? 'olvas';

if (parancs === 'fut') {
  const megadott = process.argv.slice(3).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  fut(megadott.length ? megadott : ALAP_UTEMTERV).catch((hiba) => {
    kiir('\nHIBA: ' + hiba.message + '\n');
    process.exit(1);
  });
} else if (parancs === 'olvas') {
  olvas();
} else {
  kiir('');
  kiir('Használat:');
  kiir('  node koino/meres/ebredesProba.js fut [perc...]  — mérés (alap: 1 5 60 240)');
  kiir('  node koino/meres/ebredesProba.js olvas          — összegzés');
  kiir('');
}
