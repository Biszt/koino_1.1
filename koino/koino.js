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
//   node koino/koino.js figyel [port]            — kaput nyit: fogadja a cserét
//   node koino/koino.js csere <cím> [port]       — csere egy másik készülékkel
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

import { esemenyTarNyitasa, kulcsTarolo, alapHely } from './js/tar/fajlTar.js';
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
import { sajatIPv6, pcpKapuKerese } from './js/csere/kapunyitas.js';
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
      const port = parseInt(ervek[0], 10) || ALAP_PORT;
      const figyelo = await figyeloIndulasa(tar, KOINO, port, {
        utana: (eredmeny) => {
          if (eredmeny.hiba) {
            kiir(SZIN.nem + '  ✗ megszakadt (' + eredmeny.honnan + '): ' + eredmeny.hiba + SZIN.vege);
            return;
          }
          kiir(SZIN.jo + '  ✓ csere ' + eredmeny.honnan + SZIN.vege + SZIN.halvany
            + ' — kaptam ' + eredmeny.uj + ' új eseményt, küldtem ' + eredmeny.kuldott
            + ' (' + eredmeny.korok + ' kör)' + SZIN.vege);
        }
      });

      kiir(SZIN.vastag + 'A kapu nyitva: ' + figyelo.port + '-es port' + SZIN.vege);
      kiir(SZIN.halvany + 'Te: ' + rovidAzonosito(szerzo) + ' · adat: ' + alapHely() + SZIN.vege);
      kiir(SZIN.halvany + 'A másik készüléken: node koino/koino.js csere <ez a cím> '
        + figyelo.port + SZIN.vege);
      kiir(SZIN.halvany + 'Kilépés: Ctrl+C' + SZIN.vege);
      // Nem lépünk ki: a nyitott kapu életben tartja a folyamatot.
      break;
    }

    case 'csere': {
      const cim = ervek[0];
      if (!cim) throw new Error('Kihez csatlakozzam? node koino/koino.js csere <cím> [port]');
      const port = parseInt(ervek[1], 10) || ALAP_PORT;

      const kezdet = Date.now();
      const eredmeny = await csereVonalon(tar, KOINO, cim, port);
      kiir(SZIN.jo + 'Csere kész' + SZIN.vege + SZIN.halvany
        + ' — kaptam ' + eredmeny.uj + ' új eseményt, küldtem ' + eredmeny.kuldott
        + ' (' + eredmeny.korok + ' kör, ' + (Date.now() - kezdet) + ' ms)' + SZIN.vege);
      kiir(SZIN.halvany + 'Az állapot: node koino/koino.js' + SZIN.vege);
      break;
    }

    default:
      kiir('Ismeretlen parancs: ' + parancs);
      kiir('Használat: allapot [napok] · kulcs · mentes <fájl> · koino <név> · tartalom <cím> [szöveg]');
      kiir('           pont <azonosító> <pont> [passziv] · javaslat <azonosító> <új cím> [indoklás]');
      kiir('           szavaz <javaslat> tamogat|ellenez|tartozkodik');
      kiir('           figyel [port] · csere <cím> [port] · ujjlenyomat [napok] · cimek · kapu');
      process.exit(2);
  }
} catch (hiba) {
  kiir(SZIN.nem + 'Nem sikerült: ' + hiba.message + SZIN.vege);
  if (process.env.KOINO_NAPLO) naplo(hiba);
  process.exit(1);
}
