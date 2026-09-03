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
// ===== KÉT ÜZEMMÓD, KÉT KÜLÖN KÉRDÉSRE =====
//
// ⭐ `fut` — EGY HÁLÓZATON BELÜL, a KÉSZÜLÉKRŐL szól: engedi-e az operációs rendszer az
//    ébredést, és meddig él a folyamat. Növekvő szünetekkel (1 → 5 → 60 → 240 perc), hogy
//    korán adjon részeredményt.
//
// ⭐ `res` — KÉT HÁLÓZAT KÖZÖTT, a HÁLÓZATRÓL szól: hosszú alvás után újra összeér-e a rés.
//    A fal órájához igazított ablakokban dolgozik, tehát a két készülék **üzenetváltás
//    nélkül** találkozik. Ez a „buli" valódi szerkezete. (Részletek a rés-üzemmódnál.)
//
// ===== HOGYAN FUTTASD =====
//
// EGY HÁLÓZATON — a másik készüléken fusson a kapu:
//   node koino/koino.js figyel
// a mérőn pedig:
//   node koino/meres/ebredesProba.js fut              — 1, 5, 60, 240 perc
//   node koino/meres/ebredesProba.js fut 1 5 15       — saját ütemterv
//
// KÉT HÁLÓZAT KÖZÖTT — MINDKÉT készüléken, a másik külső címével:
//   node koino/meres/ebredesProba.js res 31.46.250.127 60283 7373 5
//
// Bármikor:
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
import { pajzsfuras } from '../js/csere/pajzsfuro.js';
import { csereUdpResen } from '../js/csere/udpVonal.js';

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
// ⭐ A RÉS-ÜZEMMÓD — a buli VALÓDI szerkezete, két hálózat között
// ===================================
//
// ===== MIÉRT KÜLÖN ÜZEMMÓD =====
//
// A `fut` üzemmód egy hálózaton belül mér, és a KÉSZÜLÉKRŐL szól: engedi-e az operációs
// rendszer az ébredést. Ez viszont a HÁLÓZATRÓL: két külön háztartás, NAT mindkét oldalon,
// és a kérdés az, hogy **hosszú alvás után újra összeér-e a rés**.
//
// Mérve (2026-08-29 és 2026-09-02): sima TCP-vel NEM megy — mindhárom port-nyitási
// szabvány megbukott a routeren. Pajzsfúrással viszont igen, 150 ms alatt.
//
// ===== A FAL ÓRÁJÁHOZ IGAZÍTUNK — ÉS EZ A LÉNYEG =====
//
// ⭐ A két készülék NEM üzen egymásnak arról, mikor találkozzanak. Mindkettő ugyanabból a
// szabályból számolja: **az ablak a fal óráján van, kerek időpontokban** (ötperces ablaknál
// :00, :05, :10…). Így akárhány órával azelőtt indították őket, és akárhányszor aludtak
// közben, **ugyanabban a másodpercben ébrednek**.
//
// Ez pontosan a „buli": nincs összehangoló, nincs jelzőpont, nincs üzenet — csak egy közös
// szabály az óráról. *(A D40 ezt már kimondta: „NTP-pontos órák mellett ez ingyen van.")*
//
// ⚠️ EZÉRT NEM NÖVEKVŐ ÜTEMTERVET HASZNÁL, mint a `fut`: ha a két oldal más-más pillanatban
// indul, a növekvő szünetek SOHA nem esnének egybe. Az igazítás az, ami a találkozást
// üzenet nélkül garantálja.
//
// ===== MIT JEGYEZ FEL, AMIT A `fut` NEM =====
//
// ⭐ A SAJÁT KÜLSŐ CÍMÉT minden ablakban. Ha ez alvás után MEGVÁLTOZIK, az önmagában lelet:
// azt jelenti, hogy a másik fél a régi porton kopogtat, és a címet minden ablakban újra
// kell tanulni — vagyis a terjedő címjegyzéknek is ebben az ütemben kell dolgoznia.
// *(2026-09-02-i mérés szerint a NAT MEGŐRIZTE a helyi portot — `…:7373` —, ami sokkal
// könnyebbé teszi a dolgot. De ez nem törvény, csak az adott routeré.)*
//
// ===== HOGYAN FUTTASD =====
//
// MINDKÉT készüléken, egyszerre (a másik külső címével és portjával):
//   node koino/meres/ebredesProba.js res 31.46.250.127 60283 7373 5
//                                        ^cím          ^ő    ^én ^ablak perc
//
// ⚠️ Közben NE fusson `figyel` vagy `orjarat` ugyanezen a porton — a fúrónak kell.

/**
 * A következő ablak kezdete a FAL ÓRÁJÁN.
 * @param {number} ablakMs
 * @returns {number} ezredmásodperc
 */
function kovetkezoAblak(ablakMs) {
  return Math.ceil((Date.now() + 1) / ablakMs) * ablakMs;
}

/**
 * Ablakról ablakra fúr és cserél — vég nélkül, amíg le nem állítod.
 *
 * @param {string} cim - a másik fél külső címe
 * @param {number} tavoliPort - a másik fél külső portja
 * @param {number} helyiPort - a mi portunk (erről fúrunk, ide fogadunk)
 * @param {number} ablakPerc
 */
async function resUzemmod(cim, tavoliPort, helyiPort, ablakPerc) {
  const tar = await esemenyTarNyitasa(KOINO);
  const tarolo = tarsakTarolo();
  const ablakMs = Math.round(ablakPerc * 60 * 1000);

  // Mennyi ideig fúrjunk EGY ablakban? Az ablak töredéke — a többi idő alvás.
  const furasMs = Math.min(20000, Math.round(ablakMs / 3));

  kiir('');
  kiir('ÉBREDÉS-PRÓBA — RÉS-ÜZEMMÓD (a buli szerkezete)');
  kiir('  koino:     ' + KOINO);
  kiir('  cél:       ' + cim + ':' + tavoliPort + '   (a helyi ' + helyiPort + '-esről)');
  kiir('  ablak:     ' + ablakPerc + ' perc, a FAL ÓRÁJÁHOZ igazítva');
  kiir('  fúrás:     legfeljebb ' + Math.round(furasMs / 1000) + ' mp ablakonként');
  kiir('  napló:     ' + NAPLO_FAJL);
  kiir('');
  kiir('⭐ UGYANEZT kell futtatni a másik készüléken is, a TE címeddel.');
  kiir('   Nem kell egyszerre indítani — a fal órája hangolja össze őket.');
  kiir('');

  await feljegyez({
    mi: 'res-indulas', ido: Date.now(), cim, tavoliPort, helyiPort, ablakMs
  });

  for (;;) {
    const ablakKezdet = kovetkezoAblak(ablakMs);
    await new Promise((kesz) => setTimeout(kesz, ablakKezdet - Date.now()));

    const ebredes = Date.now();
    const csuszasMp = Math.round((ebredes - ablakKezdet) / 1000);

    let kulsoCim = null;
    let furas = null, csere = null, hiba = null;

    try {
      furas = await pajzsfuras(helyiPort, cim, tavoliPort, {
        idokorlat: furasMs,
        tartsdNyitva: true,
        utana: (e) => {
          if (e.mi === 'SAJAT-KULSO-CIM') kulsoCim = e.cim + ':' + e.port;
        }
      });

      if (furas.mindketIrany) {
        const hirdetjuk = tarsakSorrendje(await tarolo.olvas())
          .map((t) => ({ hoszt: t.hoszt, port: t.port }));
        csere = await csereUdpResen(furas.halo, cim, tavoliPort, tar, KOINO,
          { hirdetettCimek: hirdetjuk });
      }
    } catch (e) {
      hiba = e.message;
    } finally {
      // ⚠️ A foglalatot MINDIG lezárjuk — különben a következő ablakban ütközne (EADDRINUSE).
      try { furas?.halo?.close(); } catch { /* már zárva */ }
    }

    await feljegyez({
      mi: 'ablak', ablakKezdet, ebredes, csuszasMp, kulsoCim,
      furas: furas && {
        mindketIrany: !!furas.mindketIrany, sikerult: !!furas.sikerult,
        kuldott: furas.kuldott, kapott: furas.kapott, eltelt: furas.eltelt
      },
      csere: csere && {
        uj: csere.uj, kuldott: csere.kuldott, korok: csere.korok,
        bajt: (csere.bajtKuldott ?? 0) + (csere.bajtKapott ?? 0)
      },
      hiba
    });

    const allapot = hiba ? '⚠️ hiba: ' + hiba
      : csere ? '✅ átment — +' + csere.uj + ' esemény, ' + csere.korok + ' kör'
        : furas?.sikerult ? '⚠️ fél siker: az ő kopogása átjött, a miénk nem'
          : '✗ nem ért össze (' + (furas?.kuldott ?? 0) + ' kopogás)';

    kiir('  ' + new Date(ablakKezdet).toLocaleTimeString('hu-HU')
      + '  csúszás ' + csuszasMp + ' mp'
      + (kulsoCim ? '  · kívülről: ' + kulsoCim : '')
      + '  · ' + allapot);
  }
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

  // Futásokra bontás — a napló több futást is tartalmazhat (ha megölték és újraindítottad),
  // és kétféle üzemmódot is (`fut` és `res`).
  const futasok = [];
  for (const sor of sorok) {
    if (sor.mi === 'indulas') futasok.push({ ...sor, mod: 'fut', lepesek: [], befejezte: false });
    else if (sor.mi === 'res-indulas') futasok.push({ ...sor, mod: 'res', lepesek: [], befejezte: false });
    else if (!futasok.length) continue;
    else if (sor.mi === 'vege') futasok[futasok.length - 1].befejezte = true;
    else futasok[futasok.length - 1].lepesek.push(sor);
  }

  kiir('');
  kiir('══════════════════════════════════════════════════════════════');
  kiir('  ÉBREDÉS-PRÓBA — ÖSSZEGZÉS');
  kiir('══════════════════════════════════════════════════════════════');

  for (const [i, f] of futasok.entries()) {
    // ----- A RÉS-ÜZEMMÓD KÜLÖN NÉZETE -----
    if (f.mod === 'res') {
      kiir('');
      kiir('  ' + (i + 1) + '. futás — RÉS-ÜZEMMÓD — ' + new Date(f.ido).toLocaleString('hu-HU'));
      kiir('     cél: ' + f.cim + ':' + f.tavoliPort + ' · a helyi ' + f.helyiPort
        + '-esről · ablak: ' + (f.ablakMs / 60000) + ' perc');
      kiir('');

      if (!f.lepesek.length) {
        kiir('     ⚠️ EGYETLEN ABLAK SEM FUTOTT LE.');
        continue;
      }

      kiir('     ablak    | csúszás | kívülről így látszom   | eredmény');
      kiir('     ---------|---------|------------------------|--------------------------');
      let atment = 0;
      const cimek = new Set();
      for (const l of f.lepesek) {
        if (l.csere) atment++;
        if (l.kulsoCim) cimek.add(l.kulsoCim);
        const eredmeny = l.hiba ? '⚠️ ' + l.hiba
          : l.csere ? '✅ +' + l.csere.uj + ' esemény, ' + l.csere.korok + ' kör'
            : l.furas?.sikerult ? '⚠️ fél siker (csak ő hallott)'
              : '✗ nem ért össze';
        kiir('     ' + new Date(l.ablakKezdet).toLocaleTimeString('hu-HU') + ' | '
          + (l.csuszasMp + ' mp').padStart(7) + ' | '
          + (l.kulsoCim ?? '—').padEnd(22) + ' | ' + eredmeny);
      }

      kiir('');
      kiir('     átment: ' + atment + ' / ' + f.lepesek.length + ' ablak');
      kiir('     a külső címem ' + (cimek.size <= 1
        ? '✅ VÉGIG UGYANAZ volt' + (cimek.size ? ' (' + [...cimek][0] + ')' : '')
        : '⚠️ ' + cimek.size + '-FÉLE volt — a címet minden ablakban újra kell tanulni!'));
      continue;
    }

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
} else if (parancs === 'res') {
  const cim = process.argv[3];
  if (!cim) {
    kiir('\nKihez fúrjak?');
    kiir('  node koino/meres/ebredesProba.js res <cím> <távoli port> [helyi port] [ablak perc]');
    kiir('\nA másik külső címét és portját a `pajzsfuro` vagy a `kulsoport` mondja meg.\n');
    process.exit(1);
  }
  const tavoliPort = parseInt(process.argv[4], 10) || 7373;
  const helyiPort = parseInt(process.argv[5], 10) || 7373;
  const ablakPerc = Number(process.argv[6]) > 0 ? Number(process.argv[6]) : 5;

  resUzemmod(cim, tavoliPort, helyiPort, ablakPerc).catch((hiba) => {
    kiir('\nHIBA: ' + hiba.message + '\n');
    process.exit(1);
  });
} else if (parancs === 'olvas') {
  olvas();
} else {
  kiir('');
  kiir('Használat:');
  kiir('  node koino/meres/ebredesProba.js fut [perc...]');
  kiir('        — EGY hálózaton: engedi-e a rendszer az ébredést (alap: 1 5 60 240 perc)');
  kiir('  node koino/meres/ebredesProba.js res <cím> <távoli port> [helyi port] [ablak perc]');
  kiir('        — KÉT hálózat között: összeér-e a rés, a fal órájához igazított ablakokban');
  kiir('  node koino/meres/ebredesProba.js olvas');
  kiir('        — összegzés (mindkét üzemmódot külön mutatja)');
  kiir('');
}
