// koino/koino.js

// Felelősség: a koino parancssori arca — ezzel lehet KÉZZEL végigjátszani a teljes kört
// egyetlen készüléken, böngésző nélkül.
//
// ⭐ MIÉRT NEM BÖNGÉSZŐ? (D29, Csaba döntése 2026-08-28) Mert a böngésző korlátai nem a
// koino korlátai: egy lap nem tud portot nyitni, nem fogad kapcsolatot, elrejti a saját
// címeit, és bezáráskor eltűnik. A koino önálló program; a böngésző legfeljebb egy kliens
// lehet később.
//
// ⚠️ EZ NEM A KOINO FELÜLETE. Ez fejlesztői eszköz, ugyanúgy, ahogy a korábbi böngészős
// nézet is az volt: a modell kipróbálására való. A valódi felület a prototípus
// pakli-nézetéből öröklődik (D22, docs/felulet_terv.md), amikor a modell megállapodott.
//
// Használat:
//   node koino/koino.js                          — mi az állapot
//   node koino/koino.js kulcs                    — ki vagyok, hol a kulcsom
//   node koino/koino.js koino "A koino neve"     — koino létrehozása
//   node koino/koino.js tartalom "Cím" "szöveg"  — új tartalom (+100 tudatpont)
//   node koino/koino.js pont <azonosító> <pont> [passziv]
//   node koino/koino.js javaslat <azonosító> "Új cím" ["indoklás"]
//   node koino/koino.js szavaz <javaslat> tamogat|ellenez|tartozkodik
//   node koino/koino.js mentes <fájl>            — a kulcs kimentése
//   node koino/koino.js orjarat [perc] [port]    — ⭐ a készülék MAGÁTÓL dolgozik
//   node koino/koino.js figyel [port]            — kaput nyit: fogadja a cserét
//   node koino/koino.js csere                    — csere MINDEN társsal (a lista szerint)
//   node koino/koino.js csere <cím> [port]       — csere egy megadott készülékkel
//   node koino/koino.js tarsak                   — kik a társaim, és mikor sikerült
//   node koino/koino.js tars <cím> [port] [név]  — társ felvétele
//   node koino/koino.js tars torol <cím> [port]  — társ levétele
//   node koino/koino.js ujjlenyomat [napok]      — „ugyanazt látjuk-e?" két készüléken
//   node koino/koino.js cimek                    — a saját címeim (a csere-hez)
//   node koino/koino.js kapu [port] [fe80::…]    — megkéri a routert, nyisson kaput
//
// Bárhol, ahol azonosítót kér, elég a RÖVIDÍTÉSE is (mint a gitben).
//
// ===== KÉT KÉSZÜLÉK EGY GÉPEN (Szakasz 2 / 1. lépés) =====
//
// A `KOINO_ADAT` változóval két külön „készülék" játszható el ugyanazon a gépen:
//
//   1. ablak:  KOINO_ADAT=./adat-A node koino/koino.js figyel 7373
//   2. ablak:  KOINO_ADAT=./adat-B node koino/koino.js csere 127.0.0.1 7373
//
// A két mappának saját kulcsa van, tehát valóban két e-ember — nem ugyanaz kétszer.

import { writeFile } from 'node:fs/promises';

import { esemenyTarNyitasa, kulcsTarolo, tarsakTarolo, alapHely } from './js/tar/fajlTar.js';
import {
  kulcsparBiztositasa, nyilvanosKulcsSzovegesen, rovidAzonosito, kulcsparKimentese
} from './js/kulcs/kulcsTar.js';
import { koinoEsemenyei, sajatLancEsemenyei } from './js/tar/esemenyTar.js';
import { allapotSzamitasa, szetosztottPontok } from './js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa, sajatSzavazat } from './js/allapot/javaslatSzamitas.js';
import {
  koinoLetrehozasa, tartalomLetrehozasa, tudatpontRendezese,
  javaslatLetrehozasa, szavazas, TUDATPONT_KERET
} from './js/muveletek.js';
import { figyeloIndulasa, csereVonalon } from './js/csere/vonal.js';
import { allasOsszeallitasa } from './js/csere/csere.js';
import { tarsHozzaadasa, tarsTorlese, tarsakSorrendje, korbeCsere } from './js/csere/tarsak.js';
import { pajzsfuras } from './js/csere/pajzsfuro.js';
import { sajatIPv6, pcpKapuKerese, upnpKorkerdes } from './js/csere/kapunyitas.js';
import { allapotUjjlenyomata } from './js/allapot/osszehasonlitas.js';
import { lenyomat } from './js/esemeny/kanonikusAlak.js';

// ===== ÁLLANDÓK =====

const KOINO = process.env.KOINO_AZONOSITO ?? 'sajat';
const KEZDO_PONT = 100;
const NAP = 86400 * 1000;
const ALAP_PORT = 7373;

// A napló alapból néma (a koino minden metódusa naplóz) — KOINO_NAPLO=1 bekapcsolja
const naplo = console.log;
if (!process.env.KOINO_NAPLO) { console.log = () => {}; console.warn = () => {}; }
const kiir = (szoveg = '') => process.stdout.write(szoveg + '\n');

const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', halvany: '\x1b[90m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', halvany: '', vastag: '', vege: '' };

// ===================================
// INDULÁS: kulcs + tár
// ===================================

const tarolo = kulcsTarolo();
const { kulcspar, ujE } = await kulcsparBiztositasa(tarolo);
const szerzo = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);
const tar = await esemenyTarNyitasa(KOINO);

const kornyezet = { koino: KOINO, kulcspar, szerzo, tar };

if (ujE) {
  kiir(SZIN.vastag + 'Új kulcs készült — ez mostantól a személyazonosságod.' + SZIN.vege);
  kiir('  ' + rovidAzonosito(szerzo));
  kiir(SZIN.halvany + '  A kulcs helye: ' + tarolo.fajl + SZIN.vege);
  kiir(SZIN.halvany + '  Mentsd el: node koino/koino.js mentes <fájl>' + SZIN.vege);
  kiir();
}

// ===================================
// SEGÉD: AZONOSÍTÓ-RÖVIDÍTÉS FELOLDÁSA
// ===================================

/**
 * Egy rövidített azonosítót teljesre egészít ki (mint a git).
 * @param {string} toredek
 * @param {Iterable<string>} lehetosegek
 * @returns {string}
 */
function feloldas(toredek, lehetosegek) {
  const talalatok = [...lehetosegek].filter((a) => a.startsWith(toredek));
  if (talalatok.length === 1) return talalatok[0];
  if (talalatok.length === 0) throw new Error('Nincs ilyen azonosító: ' + toredek);
  throw new Error('Több azonosító is illik ide (' + talalatok.length + ') — írj többet belőle.');
}

/** A jelenlegi állapot és a javaslatok, adott időpontra. */
async function kepetKeszit(napokMulva = 0) {
  const esemenyek = await koinoEsemenyei(tar, KOINO);
  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, Date.now() + napokMulva * NAP);
  return { esemenyek, allapot, javaslatok };
}

// ===================================
// A PARANCSOK
// ===================================

const [parancs, ...ervek] = process.argv.slice(2);

/** Ezrelék → olvasható százalék. */
const szazalek = (ezrelek) => (ezrelek / 10).toFixed(1).replace('.0', '') + '%';

// ⭐ MENNYI ADAT MENT EL? (D35) A csere ára befogadási kérdés: egy mobilos e-embernek a
// számláján jelenik meg. Ezért minden csere kiírja — ami nem látszik, azt nem lehet
// olcsóvá tenni.
// Az őrjárat sorai elé — hogy utólag látszódjon, mikor mi történt.
const ora = () => new Date().toLocaleTimeString('hu-HU');

const adatMennyiseg = (eredmeny) => {
  const bajt = (eredmeny.bajtKuldott ?? 0) + (eredmeny.bajtKapott ?? 0);
  return bajt < 1024 ? bajt + ' bájt' : (bajt / 1024).toFixed(1) + ' KB';
};

async function allapotKiirasa(napokMulva) {
  const { allapot, javaslatok, esemenyek } = await kepetKeszit(napokMulva);

  if (!allapot.koino.nev) {
    kiir('Még nincs koinód. Hozd létre:');
    kiir('  node koino/koino.js koino "A koino neve"');
    return;
  }

  kiir(SZIN.vastag + allapot.koino.nev + SZIN.vege
    + SZIN.halvany + '   (te: ' + rovidAzonosito(szerzo) + ')' + SZIN.vege);
  kiir(SZIN.halvany + 'tudatpontjaid: ' + szetosztottPontok(allapot, szerzo) + ' / ' + TUDATPONT_KERET
    + ' · eseményeid: ' + (await sajatLancEsemenyei(tar, szerzo)).length
    + ' · esemény összesen: ' + esemenyek.length
    + (napokMulva ? ' · NÉZET: ' + napokMulva + ' nap múlva' : '') + SZIN.vege);

  // ----- ELLENTMONDÁSOK (D19: bejelent, nem büntet) -----
  if (allapot.ellentmondasok.length || allapot.idoEllentmondasok.length || allapot.kivetelek.length) {
    kiir();
    if (allapot.ellentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.ellentmondasok.length + ' elágazás (két aláírás ugyanarról a pontról)' + SZIN.vege);
    }
    if (allapot.idoEllentmondasok.length) {
      kiir(SZIN.nem + '⚠ ' + allapot.idoEllentmondasok.length + ' visszafelé lépő idő a saját láncban' + SZIN.vege);
    }
    for (const k of allapot.kivetelek) {
      kiir(SZIN.nem + '⚠ nem számít: ' + k.tipus + ' — ' + k.ok + SZIN.vege);
    }
  }

  // ----- TARTALMAK -----
  kiir();
  kiir(SZIN.vastag + 'TARTALMAK' + SZIN.vege);
  if (allapot.entitasok.size === 0) {
    kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  }
  // A MEGJELENÍTÉS sorrendje: a legtöbb tudatpontot kapott elöl (holtversenynél az
  // azonosító dönt, hogy két gép ugyanazt lássa). ⚠️ Ez a felület döntése, nem a
  // számításé — az állapot maga determinisztikus sorrendben áll elő (allapotSzamitas.js).
  const rangsor = [...allapot.entitasok.values()].sort((a, b) =>
    b.osszesPont - a.osszesPont || (a.azonosito < b.azonosito ? -1 : 1));

  for (const e of rangsor) {
    const sajat = e.hozzajarulok.get(szerzo)?.pont ?? 0;
    kiir('  ' + SZIN.halvany + e.azonosito.slice(0, 8) + SZIN.vege + '  ' + e.cim);
    kiir('      ' + SZIN.halvany + e.meret + ' bájt · összes pont: ' + e.osszesPont
      + ' · a tiéd: ' + sajat + ' · hozzájárulók: ' + e.hozzajarulok.size + SZIN.vege);
    if (e.szoveg) kiir('      ' + SZIN.halvany + e.szoveg + SZIN.vege);
  }

  // ----- JAVASLATOK -----
  const folyamatban = [...javaslatok.values()];
  kiir();
  kiir(SZIN.vastag + 'JAVASLATOK' + SZIN.vege);
  if (!folyamatban.length) kiir(SZIN.halvany + '  (még nincs)' + SZIN.vege);
  for (const j of folyamatban) {
    const erintett = allapot.entitasok.get(j.erintett);
    const szin = j.statusz === 'elfogadva' ? SZIN.jo : j.statusz === 'elvetve' ? SZIN.nem : '';
    kiir('  ' + SZIN.halvany + j.azonosito.slice(0, 8) + SZIN.vege
      + '  ' + szin + j.statusz.toUpperCase() + SZIN.vege
      + '  ' + j.muvelet + ': „' + (j.valtozas?.cim ?? '—') + '"');
    kiir('      ' + SZIN.halvany + 'érintett: ' + (erintett ? '„' + erintett.cim + '"' : 'ismeretlen')
      + ' · 👍 ' + j.tamogatok + ' 👎 ' + j.ellenzok + ' 🤷 ' + j.tartozkodok
      + ' (' + j.szavazok + '/' + j.nevezo + ')'
      + ' · támogatottság ' + szazalek(j.tamogatottsagEzrelek)
      + ' · bizonyosság ' + szazalek(j.bizonyossagiMutato) + SZIN.vege);
    kiir('      ' + SZIN.halvany + (j.statusz === 'folyamatban' ? 'zárul: ' : 'lezárult: ')
      + new Date(j.lezarasIdeje).toLocaleString('hu-HU')
      + ' (döntési idő ' + Math.round(j.dontesiIdo / 3600) + ' óra)'
      + (j.kesoiSzavazatok ? ' · ' + j.kesoiSzavazatok + ' késői szavazat nem számít' : '')
      + SZIN.vege);
    const enyem = sajatSzavazat(allapot.szamitok, j.azonosito, szerzo);
    if (enyem) kiir('      ' + SZIN.halvany + 'a szavazatod: ' + enyem + SZIN.vege);
  }

  // ----- EGYEZMÉNYEK -----
  const egyezmenyek = folyamatban.filter((j) => j.egyezmeny);
  kiir();
  kiir(SZIN.vastag + 'EGYEZMÉNYEK' + SZIN.vege);
  if (!egyezmenyek.length) {
    kiir(SZIN.halvany + '  (még nincs — akkor születik, ha egy javaslatot elfogadnak)' + SZIN.vege);
  }
  for (const j of egyezmenyek) {
    const e = j.egyezmeny;
    const p = e.pillanatkep;
    kiir('  ' + SZIN.jo + '📜 ' + e.muvelet + ': „' + (e.valtozas?.cim ?? '—') + '"' + SZIN.vege);
    kiir('      ' + SZIN.halvany + 'megszületett: ' + new Date(e.megszuletett).toLocaleString('hu-HU')
      + ' · ' + p.tamogatok + '/' + p.szavazok + ' támogató (' + szazalek(p.tamogatottsagEzrelek) + ')'
      + ' · részvétel ' + szazalek(p.reszveteliEzrelek) + SZIN.vege);
  }
}

try {
  switch (parancs) {

    case undefined:
    case 'allapot': {
      // Előre nézés: `allapot 3` = mi lesz 3 nap múlva (a döntési idő napokban mérhető)
      await allapotKiirasa(parseInt(ervek[0], 10) || 0);
      break;
    }

    case 'kulcs': {
      kiir('Az azonosságod (a nyilvános kulcsod):');
      kiir('  ' + szerzo);
      kiir(SZIN.halvany + 'A kulcs fájlja: ' + tarolo.fajl + SZIN.vege);
      kiir(SZIN.halvany + 'Az adat helye:  ' + alapHely() + SZIN.vege);
      break;
    }

    case 'mentes': {
      const hova = ervek[0];
      if (!hova) throw new Error('Hova mentsem? node koino/koino.js mentes <fájl>');
      await writeFile(hova, await kulcsparKimentese(kulcspar), 'utf8');
      kiir('Elmentve: ' + hova);
      kiir(SZIN.nem + 'Aki ezt a fájlt megszerzi, a nevedben tud aláírni. Őrizd biztos helyen.' + SZIN.vege);
      break;
    }

    case 'koino': {
      const nev = ervek[0];
      if (!nev) throw new Error('Mi legyen a koino neve?');
      await koinoLetrehozasa(kornyezet, nev, ervek[1]);
      kiir('A koino létrejött: ' + nev);
      break;
    }

    case 'tartalom': {
      const [cim, szoveg] = ervek;
      if (!cim) throw new Error('Mi legyen a tartalom címe?');

      const esemeny = await tartalomLetrehozasa(kornyezet, { cim, szoveg });
      // Rögtön tudatpontot is rendelünk hozzá — enélkül nem is létezne (D14)
      const { allapot } = await kepetKeszit();
      await tudatpontRendezese(kornyezet, esemeny.azonosito, KEZDO_PONT, 'aktiv',
        szetosztottPontok(allapot, szerzo));

      kiir('Létrejött: ' + esemeny.azonosito.slice(0, 8) + '  „' + cim + '"');
      kiir(SZIN.halvany + 'Kapott ' + KEZDO_PONT + ' tudatpontot tőled — enélkül a koino elfelejtené.' + SZIN.vege);
      break;
    }

    case 'pont': {
      const { allapot } = await kepetKeszit();
      const azonosito = feloldas(ervek[0] ?? '', allapot.entitasok.keys());
      const pont = parseInt(ervek[1], 10);
      if (!Number.isInteger(pont)) throw new Error('Hány tudatpontot rendelsz hozzá?');
      const szerep = ervek[2] === 'passziv' ? 'passziv' : 'aktiv';

      let masholt = 0;
      for (const e of allapot.entitasok.values()) {
        if (e.azonosito !== azonosito) masholt += e.hozzajarulok.get(szerzo)?.pont ?? 0;
      }
      await tudatpontRendezese(kornyezet, azonosito, pont, szerep, masholt);
      kiir(pont === 0
        ? 'Elvetted a tudatpontodat. Ha senki másnak nincs rajta, a tartalom eltűnik.'
        : 'Tudatpont beállítva: ' + pont + ' (' + szerep + ')');
      break;
    }

    case 'javaslat': {
      const { allapot } = await kepetKeszit();
      const erintett = feloldas(ervek[0] ?? '', allapot.entitasok.keys());
      const ujCim = ervek[1];
      if (!ujCim) throw new Error('Mi legyen az új cím?');

      const e = await javaslatLetrehozasa(kornyezet, {
        fajta: 'szerkesztesi', erintett, muvelet: 'Modositas',
        valtozas: { cim: ujCim }, indoklas: ervek[2] ?? null
      });
      kiir('Szerkesztési javaslat beadva: ' + e.azonosito.slice(0, 8));
      kiir(SZIN.halvany + 'Most szavazhatsz rá: node koino/koino.js szavaz '
        + e.azonosito.slice(0, 8) + ' tamogat' + SZIN.vege);
      break;
    }

    case 'szavaz': {
      const { javaslatok } = await kepetKeszit();
      const javaslat = feloldas(ervek[0] ?? '', javaslatok.keys());
      const valasztas = { tamogat: 'Tamogat', ellenez: 'Ellenez', tartozkodik: 'Tartozkodik' }[
        (ervek[1] ?? '').toLowerCase()];
      if (!valasztas) throw new Error('Hogyan szavazol? tamogat | ellenez | tartozkodik');

      await szavazas(kornyezet, javaslat, valasztas);
      kiir('Szavazat leadva: ' + valasztas + SZIN.halvany
        + ' (bármikor megváltoztathatod, az utolsó számít)' + SZIN.vege);
      break;
    }

    case 'kapu': {
      // ⭐ Megkérdezi a routert, hajlandó-e MAGÁTÓL beengedni a kapcsolatot. Ha igen, nem
      // kell kézzel szabályt írni a router felületén — ami a legtöbb e-embernek úgyis
      // leküzdhetetlen akadály lenne.
      // ⚠️ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL: ha a router nemet mond, a koino ugyanúgy működik.
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      const atjaro = ervek[1];
      const en = sajatIPv6();

      if (!en) {
        kiir(SZIN.nem + 'Nincs globális IPv6-címed — így nincs mit kinyittatni.' + SZIN.vege);
        break;
      }
      kiir(SZIN.halvany + 'A saját címed: ' + en.cim + '  (' + en.kartya + ')' + SZIN.vege);

      if (!atjaro) {
        kiir();
        kiir('Add meg a router helyi IPv6-címét is:');
        kiir('  node koino/koino.js kapu ' + port + ' fe80::…');
        kiir(SZIN.halvany + 'Windowson így kérdezhető le:' + SZIN.vege);
        kiir(SZIN.halvany + '  Get-NetRoute -DestinationPrefix ::/0 | Select NextHop' + SZIN.vege);
        break;
      }

      // ----- MI VAN A HÁLÓZATON? Mindhárom szabványt megkérdezzük -----
      const upnp = await upnpKorkerdes();
      kiir();
      kiir(SZIN.vastag + 'UPnP' + SZIN.vege);
      if (!upnp.talalt) {
        kiir('  ✗ nincs UPnP-átjáró a hálózaton');
      } else {
        kiir('  ✓ van átjáró' + SZIN.halvany + ' — ' + (upnp.szolgaltatasok?.length ?? 0)
          + ' szolgáltatás' + SZIN.vege);
        kiir(upnp.ipv6Tuzfal
          ? SZIN.jo + '  ✓ TUD IPv6 tűzfal-rést nyitni' + SZIN.vege
          : SZIN.nem + '  ✗ nincs IPv6 tűzfal-vezérlés (WANIPv6FirewallControl)' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.vastag + 'PCP' + SZIN.vege);
      const eredmeny = await pcpKapuKerese({
        atjaro, szakasz: en.szakasz, sajatCim: en.cim, port
      });

      if (eredmeny.sikeres) {
        kiir(SZIN.jo + '✓ A router kinyitotta a ' + (eredmeny.port ?? port) + '-es kaput'
          + SZIN.vege + SZIN.halvany + ' — ' + eredmeny.elettartam + ' másodpercre' + SZIN.vege);
        kiir(SZIN.halvany + 'Most már fogadhatsz kapcsolatot: node koino/koino.js figyel '
          + port + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem sikerült: ' + eredmeny.ok + SZIN.vege);
        kiir();
        kiir(SZIN.halvany + 'Ez nem baj — a koino enélkül is működik, csak nem tud kaput' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitni. Ilyenkor TE kezdeményezel kifelé (csere), vagy kézzel' + SZIN.vege);
        kiir(SZIN.halvany + 'nyitsz portot a routeren.' + SZIN.vege);
      }
      break;
    }

    case 'cimek': {
      // ⭐ MIÉRT KELL EZ? A Szakasz 2 / 4. lépéséhez (két készülék, két hálózat) tudni
      // kell a saját GLOBÁLIS IPv6-címünket — a másik ezen ér el. Androidon a szokásos
      // rendszer-parancsok (`ip addr`) nem mindig adnak választ, mert a rendszer korlátozza
      // őket; a program viszont a SAJÁT címeit mindig ismeri.
      //
      // ⚠️ Ez NEM a nyilvános cím felderítése. IPv6-nál nincs is rá szükség (nincs NAT):
      // a globális cím maga a nyilvános cím. Épp ezt a mérést akarjuk elvégezni.
      const halozat = (await import('node:os')).networkInterfaces();
      const csoportok = { globalis: [], helyi: [], negyes: [] };

      for (const [nev, cimek] of Object.entries(halozat)) {
        for (const cim of cimek ?? []) {
          if (cim.internal) continue;
          if (cim.family === 'IPv6') {
            const eleje = cim.address.slice(0, 2).toLowerCase();
            const globalisE = eleje.startsWith('2') || eleje.startsWith('3');
            (globalisE ? csoportok.globalis : csoportok.helyi).push({ nev, cim: cim.address });
          } else {
            csoportok.negyes.push({ nev, cim: cim.address });
          }
        }
      }

      kiir(SZIN.vastag + 'GLOBÁLIS IPv6' + SZIN.vege + SZIN.halvany
        + '   ← EZT add meg a másik készüléknek' + SZIN.vege);
      if (!csoportok.globalis.length) {
        kiir(SZIN.nem + '  (nincs) — így a közvetlen kapcsolat két hálózat között nem megy'
          + SZIN.vege);
      }
      for (const { nev, cim } of csoportok.globalis) {
        kiir('  ' + cim + SZIN.halvany + '   (' + nev + ')' + SZIN.vege);
      }

      kiir();
      kiir(SZIN.halvany + 'Helyi hálózat (IPv4): '
        + (csoportok.negyes.map((c) => c.cim).join(', ') || '—') + SZIN.vege);
      kiir(SZIN.halvany + 'Csak-link IPv6 (fe80…, nem használható kívülről): '
        + csoportok.helyi.length + ' db' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken:  node koino/koino.js csere <a fenti cím> 7373'
        + SZIN.vege);
      break;
    }

    case 'ujjlenyomat': {
      // ⭐ „Ugyanazt látjuk-e?" — két készülék EGYETLEN SZÖVEG összehasonlításával.
      // Ez kell majd a Szakasz 2 / 4. lépéséhez, ahol nincs közös program, ami összevesse
      // a két gépet: a két ujjlenyomatot szemmel is össze lehet olvasni.
      const napokMulva = parseInt(ervek[0], 10) || 0;
      const { allapot, javaslatok } = await kepetKeszit(napokMulva);
      const allas = await allasOsszeallitasa(tar, KOINO);

      kiir(SZIN.vastag + 'TUDÁS' + SZIN.vege + SZIN.halvany
        + '     (mely eseményeket ismerem — ezt egyenlíti ki a csere)' + SZIN.vege);
      kiir('  ' + await lenyomat(allas.szerzok));
      kiir(SZIN.halvany + '  ' + allas.szerzok.length + ' e-ember · '
        + (await koinoEsemenyei(tar, KOINO)).length + ' esemény' + SZIN.vege);

      kiir();
      kiir(SZIN.vastag + 'ÁLLAPOT' + SZIN.vege + SZIN.halvany
        + '   (ami ebből következik — ennek is egyeznie kell)' + SZIN.vege);
      kiir('  ' + await allapotUjjlenyomata(allapot, javaslatok));
      kiir(SZIN.halvany + '  ' + allapot.entitasok.size + ' entitás · '
        + javaslatok.size + ' javaslat' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + '⚠ Az ÁLLAPOT ujjlenyomata IDŐFÜGGŐ (a döntések lezárulnak),'
        + ' ezért csak azonos pillanatra hasonlítható össze.' + SZIN.vege);
      break;
    }

    // ===== A CSERE: két készülék között (Szakasz 2) =====

    case 'figyel': {
      // ===== A POSTALÁDA-SZEREP (D34) =====
      //
      // ⭐ AKI FOGADNI TUD, AZ POSTALÁDA. Nem élő továbbító: nem kell egyszerre online
      // tartania két felet (ez a TURN drágasága, és a koino épp ezt úszhatja meg). Elég,
      // ha ÁTVESZI, ELTÁROLJA, és a következő beszélgetésnél TOVÁBBADJA.
      //
      // Anna és Béla egyike sem tud fogadni; mindketten ide szólnak ki — és teljesen
      // kicserélik az eseményeiket, pedig soha nem beszéltek egymással. Mérve: a
      // vizsgaProba.js „A POSTALÁDA" próbája.
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      let beszelgetesek = 0, atvett = 0, tovabbadott = 0, forgalom = 0;

      const figyelo = await figyeloIndulasa(tar, KOINO, port, {
        utana: (eredmeny) => {
          if (eredmeny.hiba) {
            kiir(SZIN.nem + '  ✗ megszakadt (' + eredmeny.honnan + '): ' + eredmeny.hiba + SZIN.vege);
            return;
          }
          if (eredmeny.masKoino) {
            // Egy nyitott hálózaton ez rendes dolog: bekopogott valaki, aki más koinóé.
            kiir(SZIN.halvany + '  · ' + eredmeny.honnan + ' — MÁSIK koinóé ('
              + eredmeny.masKoino + '), nem cseréltünk' + SZIN.vege);
            return;
          }
          beszelgetesek++;
          atvett += eredmeny.uj;
          tovabbadott += eredmeny.kuldott;
          forgalom += (eredmeny.bajtKuldott ?? 0) + (eredmeny.bajtKapott ?? 0);

          kiir(SZIN.jo + '  ✓ csere ' + eredmeny.honnan + SZIN.vege + SZIN.halvany
            + ' — átvettem ' + eredmeny.uj + ', továbbadtam ' + eredmeny.kuldott
            + ' (' + eredmeny.korok + ' kör, ' + adatMennyiseg(eredmeny) + ')' + SZIN.vege);
          kiir(SZIN.halvany + '    összesen: ' + beszelgetesek + ' beszélgetés · '
            + atvett + ' átvett · ' + tovabbadott + ' továbbadott · '
            + adatMennyiseg({ bajtKuldott: forgalom }) + SZIN.vege);
        }
      });

      kiir(SZIN.vastag + 'POSTALÁDA' + SZIN.vege + SZIN.halvany
        + '   (a kapu nyitva a ' + figyelo.port + '-es porton)' + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · adat: ' + alapHely() + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'Amit ez a készülék csinál: átveszi mások eseményeit, eltárolja,'
        + SZIN.vege);
      kiir(SZIN.halvany + 'és a következő beszélgetésnél továbbadja — így két olyan e-ember'
        + SZIN.vege);
      kiir(SZIN.halvany + 'is elér egymáshoz, aki egyikük sem tud kaput nyitni.' + SZIN.vege);
      kiir();
      kiir(SZIN.halvany + 'A másik készüléken: node koino/koino.js csere <ez a cím> '
        + figyelo.port + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      // Nem lépünk ki: a nyitott kapu életben tartja a folyamatot.
      break;
    }

    case 'tarsak': {
      // ⭐ D33: nem az a kérdés, hogy egy adott gépet elérünk-e, hanem hogy a hálózat
      // összefüggő marad-e. Ez a lista az, amiből az összefüggőség lesz.
      const tarolo = tarsakTarolo();
      const lista = tarsakSorrendje(await tarolo.olvas());

      kiir(SZIN.vastag + 'TÁRSAK' + SZIN.vege + SZIN.halvany
        + '   (ebben a sorrendben próbálja a `csere`)' + SZIN.vege);
      if (!lista.length) {
        kiir(SZIN.halvany + '  (üres) — vegyél fel egyet: node koino/koino.js tars <cím> [port] [név]'
          + SZIN.vege);
      }
      for (const t of lista) {
        const allapotSzoveg = t.utoljara
          ? SZIN.jo + 'sikerült ' + new Date(t.utoljara).toLocaleString('hu-HU') + SZIN.vege
          : (t.sikertelen
            ? SZIN.nem + t.sikertelen + '× nem sikerült' + SZIN.vege
            : SZIN.halvany + 'még nem próbáltuk' + SZIN.vege);
        kiir('  ' + t.hoszt + ' ' + t.port
          + (t.nev ? SZIN.halvany + '  „' + t.nev + '"' + SZIN.vege : '')
          + '  ' + allapotSzoveg);
      }
      kiir();
      kiir(SZIN.halvany + 'A fájl kézzel is szerkeszthető: ' + tarolo.fajl + SZIN.vege);
      break;
    }

    case 'tars': {
      const tarolo = tarsakTarolo();
      const lista = await tarolo.olvas();

      if (ervek[0] === 'torol') {
        const cim = ervek[1];
        if (!cim) throw new Error('Kit vegyek le? node koino/koino.js tars torol <cím> [port]');
        const port = parseInt(ervek[2], 10) || ALAP_PORT;
        const { lista: maradt, torolt } = tarsTorlese(lista, cim, port);
        await tarolo.ir(maradt);
        kiir(torolt
          ? SZIN.jo + 'Levéve: ' + cim + ' ' + port + SZIN.vege
          : SZIN.nem + 'Nem volt a listán: ' + cim + ' ' + port + SZIN.vege);
        break;
      }

      const cim = ervek[0];
      if (!cim) throw new Error('Kit vegyek fel? node koino/koino.js tars <cím> [port] [név]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      await tarolo.ir(tarsHozzaadasa(lista, { hoszt: cim, port, nev: ervek[2] }));
      kiir(SZIN.jo + 'Felvéve: ' + cim + ' ' + port + (ervek[2] ? ' („' + ervek[2] + '")' : '')
        + SZIN.vege);
      kiir(SZIN.halvany + 'Csere mindenkivel: node koino/koino.js csere' + SZIN.vege);
      break;
    }

    case 'orjarat': {
      // ===== A KÉSZÜLÉK MAGÁTÓL DOLGOZIK =====
      //
      // ⭐ MIÉRT KELL? Csaba vette észre: eddig MINDEN csere kézi indítású volt — pedig a
      // D33 egész terve arra épül, hogy a készülékek maguktól, időnként végigpróbálják a
      // társaikat. Egy koino-készüléknek nem szabad arra várnia, hogy valaki parancsot
      // gépeljen be.
      //
      // Két dolgot csinál egyszerre, mert egy valódi készülék is ezt teszi:
      //   1. NYITVA TARTJA A KAPUT (postaláda, D34) — aki tud, az bekopoghat,
      //   2. IDŐNKÉNT KISZÓL mindenkinek a társ-listáról (D33).
      //
      // ⚠️ EZ NEM „folyamatos kapcsolat" (5. szabály). A készülék a kör végén elenged
      // mindent, és alszik a következőig. Épp ez a különbség a postaláda és az élő
      // továbbító között.
      //
      // ⭐ ÉS EZÉRT KELLETT ELŐBB A B. LÉPÉS: egy „nincs újdonság" kör ~190 bájt, tehát
      // sűrűn is mehet anélkül, hogy egy mobilos e-ember számláját megterhelné (D35).
      const perc = parseFloat(ervek[0]) || 5;
      const port = parseInt(ervek[1], 10) || ALAP_PORT;
      const tarolo = tarsakTarolo();

      const figyelo = await figyeloIndulasa(tar, KOINO, port, {
        utana: (e) => {
          if (e.hiba) return;
          if (e.masKoino) return;
          kiir(SZIN.jo + '  ← ' + ora() + ' bejött valaki (' + e.honnan + ')' + SZIN.vege
            + SZIN.halvany + ' — átvettem ' + e.uj + ', továbbadtam ' + e.kuldott
            + ' (' + adatMennyiseg(e) + ')' + SZIN.vege);
        }
      });

      kiir(SZIN.vastag + 'ŐRJÁRAT' + SZIN.vege + SZIN.halvany
        + '   (kapu nyitva a ' + figyelo.port + '-en · kör ' + perc + ' percenként)' + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · koino: ' + KOINO + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      kiir();

      // Vég nélküli kör. A társ-listát MINDEN körben újraolvassuk, hogy egy közben
      // felvett társ azonnal beleférjen (a `tars` parancs egy másik ablakban futhat).
      for (;;) {
        const lista = await tarolo.olvas();

        if (!lista.length) {
          kiir(SZIN.halvany + '  ' + ora() + ' nincs társ a listán — csak a kaput tartom nyitva'
            + SZIN.vege);
        } else {
          const kor = await korbeCsere(lista, (t) => csereVonalon(tar, KOINO, t.hoszt, t.port));
          await tarolo.ir(kor.lista);

          const jel = kor.sikeres ? SZIN.jo + '  ✓ ' : SZIN.halvany + '  · ';
          kiir(jel + ora() + ' ' + kor.sikeres + '/' + kor.eredmenyek.length + ' társ'
            + SZIN.vege + SZIN.halvany + ' — ' + kor.uj + ' új esemény, '
            + adatMennyiseg({ bajtKuldott: kor.bajt }) + SZIN.vege);
        }

        await new Promise((teljesites) => setTimeout(teljesites, perc * 60 * 1000));
      }
      // ide nem jutunk el; a figyelőt a folyamat vége zárja
    }

    case 'pajzsfuro': {
      // ===== PAJZSFÚRÁS (E. lépés) =====
      //
      // ⭐ A NÉV CSABÁTÓL: nem kívülről törünk át semmit, hanem MINDKÉT OLDAL BELÜLRŐL
      // fúr — a saját routerén nyit rést, kifelé indulva —, és a két rés a közepén
      // találkozik. Ezért pajzsfúró, nem „lyukfúró".
      //
      // ⚠️ VÉG NÉLKÜL FÚR (2026-08-29, Csaba észrevétele nyomán). Az első változat 60
      // másodperc után feladta — de a két oldal nem indul egyszerre, és eddig SOHA nem
      // futott mindkettőn egyszerre. Ha viszont mindkettő folyamatosan fúr, az átfedés
      // előbb-utóbb garantált, közös óra nélkül is. Leállítani Ctrl+C-vel lehet.
      const cim = ervek[0];
      if (!cim) throw new Error('Kihez kopogjak? node koino/koino.js pajzsfuro <cím> [port]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      kiir(SZIN.vastag + 'PAJZSFÚRÓ' + SZIN.vege + SZIN.halvany
        + '   (a ' + port + '-es portról a ' + port + '-esre, másodpercenként)' + SZIN.vege);
      kiir(SZIN.halvany + 'A másik készüléken UGYANEZT kell futtatni, a te címedre.'
        + SZIN.vege);
      kiir(SZIN.halvany + 'Vég nélkül fúr, amíg össze nem ér. Kilépés: Ctrl+C' + SZIN.vege);
      kiir();

      const eredmeny = await pajzsfuras(port, cim, port, {
        idokorlat: 0,                 // 0 = vég nélkül
        utana: (e) => {
          // ⚠️ MŰSZER A NÉMA NEM-ESEMÉNYRE. Az első változat CSAK a sikeres kopogást írta
          // ki — ezért amikor a telefonon a küldés elbukott, a képernyő egyszerűen ÜRES
          // maradt, és órákig azt hihettük volna, hogy „fúr". Ami nem történik meg, azt
          // is ki kell írni, különben nem mérés, csak remény.
          if (e.mi === 'INDUL') {
            kiir(SZIN.halvany + '  ' + ora() + ' a fúró elindult (' + e.port + '-es port)'
              + SZIN.vege);
          }
          if (e.mi === 'KULDES-BUKOTT' && e.hanyadik % 15 === 1) {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ a KÜLDÉS bukott (' + e.hanyadik + '.): '
              + e.ok + SZIN.vege);
            kiir(SZIN.halvany + '    A csomag el sem indult — ez NEM a másik fél hibája.'
              + SZIN.vege);
          }
          if (e.mi === 'HIBA') {
            kiir(SZIN.nem + '  ' + ora() + ' ✗ hiba: ' + e.ok + SZIN.vege);
          }
          // 15 másodpercenként egy sor — hogy látszódjon, hogy él, de ne árassza el.
          if (e.mi === 'KOPOGTAM' && e.hanyadik % 15 === 1) {
            kiir(SZIN.halvany + '  ' + ora() + ' … fúrok (' + e.hanyadik + '. kopogás)'
              + SZIN.vege);
          }
          if (e.mi === 'KOPOG-ERKEZETT') {
            kiir(SZIN.jo + '  ← MEGJÖTT AZ Ő KOPOGÁSA (' + e.honnan + ')' + SZIN.vege);
          }
          if (e.mi === 'HALLAK-ERKEZETT') {
            kiir(SZIN.jo + '  ✓ ŐK IS HALLANAK MINKET (' + e.honnan + ')' + SZIN.vege);
          }
        }
      });

      kiir();
      if (eredmeny.mindketIrany) {
        kiir(SZIN.jo + '⭐ A PAJZS ÁTFÚRVA — mindkét irány működik.' + SZIN.vege);
        kiir(SZIN.halvany + '  ' + eredmeny.kuldott + ' kopogás, ' + eredmeny.kapott
          + ' válasz, ' + eredmeny.eltelt + ' ms alatt' + SZIN.vege);
        kiir(SZIN.halvany + '  Most már a csere is átmehetne ezen az úton.' + SZIN.vege);
      } else if (eredmeny.sikerult) {
        // ⚠️ FÉL SIKER: az ő csomagjai átjönnek, a mieink nem. Ez is mérés, nem hiba.
        kiir(SZIN.nem + '⚠ FÉL SIKER: az ő kopogása átjött, a miénk nem.' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagyis a MI routerünk enged befelé, az övék nem.' + SZIN.vege);
      } else {
        kiir(SZIN.nem + '✗ Nem jött át semmi (' + eredmeny.kuldott + ' kopogás, '
          + eredmeny.eltelt + ' ms).' + SZIN.vege);
        kiir(SZIN.halvany + '  Vagy nem futott a másik oldalon, vagy mindkét router zár.'
          + SZIN.vege);
      }
      break;
    }

    case 'csere': {
      const tarolo = tarsakTarolo();
      const kezdet = Date.now();

      // ===== EGY MEGADOTT CÍM =====
      // Marad, mert kell: az első társat valahonnan meg kell adni (kézzel átvitt címmel),
      // és a mérésekhez is ez a legrövidebb út.
      if (ervek[0]) {
        const cim = ervek[0];
        const port = parseInt(ervek[1], 10) || ALAP_PORT;
        const eredmeny = await csereVonalon(tar, KOINO, cim, port);

        // ⚠️ MÁSIK KOINO: ez NEM hiba, csak nincs miről beszélni. Ki kell mondani, mert
        // különben a „kaptam 0, küldtem 0" úgy néz ki, mintha minden rendben lenne.
        if (eredmeny.masKoino) {
          kiir(SZIN.nem + 'Ez a készülék egy MÁSIK koinóé: ' + eredmeny.masKoino + SZIN.vege);
          kiir(SZIN.halvany + 'A tiéd: ' + KOINO + ' — nem cseréltünk semmit, és ez így helyes.'
            + SZIN.vege);
          kiir(SZIN.halvany + 'Ha ugyanabban a koinóban akartok lenni, a KOINO_AZONOSITO'
            + ' változónak kell egyeznie.' + SZIN.vege);
          break;
        }

        kiir(SZIN.jo + 'Csere kész' + SZIN.vege + SZIN.halvany
          + ' — kaptam ' + eredmeny.uj + ' új eseményt, küldtem ' + eredmeny.kuldott
          + ' (' + eredmeny.korok + ' kör, ' + (Date.now() - kezdet) + ' ms, '
          + adatMennyiseg(eredmeny) + ')' + SZIN.vege);

        // Akivel egyszer sikerült, azt megjegyezzük — különben minden cserénél újra kézzel
        // kellene beírni a címet, és pont az nem épülne fel, ami a D33-hoz kell: a lista.
        const lista = await tarolo.olvas();
        const volt = lista.some((t) => t.hoszt.toLowerCase() === cim.toLowerCase() && t.port === port);
        await tarolo.ir(tarsHozzaadasa(lista, { hoszt: cim, port }).map((t) =>
          (t.hoszt.toLowerCase() === cim.toLowerCase() && t.port === port)
            ? { ...t, utoljara: Date.now(), sikertelen: 0 } : t));
        if (!volt) kiir(SZIN.halvany + 'Felvettem a társak közé (levenni: tars torol '
          + cim + ' ' + port + ')' + SZIN.vege);

        kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
        break;
      }

      // ===== MINDENKI A LISTÁRÓL =====
      const lista = await tarolo.olvas();
      if (!lista.length) {
        throw new Error('Nincs egyetlen társ sem. Vegyél fel egyet:'
          + '\n  node koino/koino.js tars <cím> [port] [név]'
          + '\nvagy adj meg most egy címet:  node koino/koino.js csere <cím> [port]');
      }

      kiir(SZIN.vastag + 'CSERE ' + lista.length + ' társsal' + SZIN.vege);

      const kor = await korbeCsere(lista, (t) => csereVonalon(tar, KOINO, t.hoszt, t.port), {
        utana: (e) => {
          const cimke = e.tars.nev ? e.tars.nev : e.tars.hoszt + ' ' + e.tars.port;
          if (e.sikerult && e.masKoino) {
            kiir(SZIN.halvany + '  · ' + cimke + ' — egy MÁSIK koinóé (' + e.masKoino
              + '), nincs mit cserélni' + SZIN.vege);
            return;
          }
          kiir(e.sikerult
            ? SZIN.jo + '  ✓ ' + cimke + SZIN.vege + SZIN.halvany
              + ' — kaptam ' + e.uj + ', küldtem ' + e.kuldott
              + ' (' + e.korok + ' kör, ' + adatMennyiseg(e) + ')' + SZIN.vege
            : SZIN.halvany + '  · ' + cimke + ' — nem érhető el: ' + e.hiba + SZIN.vege);
        }
      });
      await tarolo.ir(kor.lista);

      kiir();
      // ⚠️ A NULLA SIKER SEM HIBA: a koino ettől még működik, csak most nem terjedt.
      // Ezért nem `throw`, és ezért nem 1-es kilépési kód (2. szabály).
      kiir((kor.sikeres ? SZIN.jo : SZIN.nem) + kor.sikeres + '/' + kor.eredmenyek.length
        + ' társ vette fel' + SZIN.vege + SZIN.halvany
        + ' — összesen ' + kor.uj + ' új esemény, ' + kor.kuldott + ' küldött'
        + ' (' + (Date.now() - kezdet) + ' ms, ' + adatMennyiseg({ bajtKuldott: kor.bajt })
        + ')' + SZIN.vege);
      if (!kor.sikeres) {
        kiir(SZIN.halvany + 'Egy társ sem válaszolt. Ez nem hiba — később újra megy;'
          + ' addig is minden művelet mehet tovább helyben.' + SZIN.vege);
      }
      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    default:
      kiir('Ismeretlen parancs: ' + parancs);
      kiir('Használat: allapot [napok] · kulcs · mentes <fájl> · koino <név> · tartalom <cím> [szöveg]');
      kiir('           pont <azonosító> <pont> [passziv] · javaslat <azonosító> <új cím> [indoklás]');
      kiir('           szavaz <javaslat> tamogat|ellenez|tartozkodik');
      kiir('           orjarat [perc] [port] · figyel [port] · csere [cím] [port]');
      kiir('           pajzsfuro <cím> [port] · ujjlenyomat [napok] · cimek · kapu');
      kiir('           tarsak · tars <cím> [port] [név] · tars torol <cím> [port]');
      process.exit(2);
  }
} catch (hiba) {
  kiir(SZIN.nem + 'Nem sikerült: ' + hiba.message + SZIN.vege);
  if (process.env.KOINO_NAPLO) naplo(hiba);
  process.exit(1);
}
