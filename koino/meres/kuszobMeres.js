// koino/meres/kuszobMeres.js

// Felelősség: megmérni, MENNYIT NYOM az alapérték a küszöb-mediánban — vagyis számít-e a
// **hallgató tulajdonos** (aki tudatpontot tett az entitásra, de érték javaslatot soha nem
// adott be).
//
// ===== ⛔⛔ MIÉRT SZÜLETETT (Csaba, 2026-09-11) =====
//
// Az alkotmány (D64) elhalasztásakor Csaba egy MÁSIK gépezetet vetett fel a „súly"-ra:
//
//   *„A fontosabb ügyek súlyosabbá tételét elegendő az ALAPÉRTÉK meghatározásával elérni.
//   Pl. a pénz esetében alap 2/3-os érték javaslatok, amik módosíthatók, de attól lesz
//   nehéz, hogy a program használatában PASSZÍV e-emberek érték javaslatai teszik nehézzé
//   a döntési keretek módosítását."*
//
// ⚠️ „Passzív" itt NEM a `szerep: 'passziv'` mezőt jelenti, hanem azt a tömeget, aki a
// program használatában passzív: tulajdonos, de sosem nyúl a küszöbökhöz.
//
// ⭐ A modell akkor működik, ha a hallgató tulajdonos **az alapértékkel szavaz** a
// mediánban. Ez a mérés azt dönti el, hogy ma így van-e.
//
// ===== A MEGKÜLÖNBÖZTETŐ ESET =====
//
// N tulajdonos egy gondolaton, közülük EGY ad be érték javaslatot, a többi hallgat.
//
//   · ha a MAI koino szerint megy   → az egyetlen hangos érték nyer (a hallgatók nem
//     szerepelnek a mediánban);
//   · ha CSABA modellje szerint     → a hallgatók alapértéke viszi a mediánt.
//
// ⭐ Két irányban mérünk (a hangos érték az alapérték FÖLÖTT és ALATT is), hogy a próba ne
// legyen vak: ha csak felfelé néznénk, egy „mindig az alapérték" hiba is helyesnek látszana.
//
// Futtatás: node koino/meres/kuszobMeres.js

import './naplo.js';
import { ujEember } from './probaFuttato.js';
import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa, ALAP_KUSZOBOK } from '../js/allapot/javaslatSzamitas.js';

const KEZDET = Date.UTC(2026, 0, 1);
const MOST = KEZDET + 30 * 24 * 3600 * 1000;   // jóval a döntési idő után

const kiir = (szoveg) => process.stdout.write(szoveg + '\n');

/**
 * Egy gondolat N tulajdonossal, ebből EGY ad be érték javaslatot.
 * @returns {Promise<number>} az érvényes elfogadási küszöb
 */
async function meres(hangosKuszob, tulajdonosokSzama) {
  const gazda = await ujEember();
  const esemenyek = [];

  const g = await gazda.tesz('GondolatLetrehozas', { cim: 'A PÉNZ KERETEI', meret: 10 }, KEZDET);
  esemenyek.push(g);
  esemenyek.push(await gazda.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10 }, KEZDET));

  // ⭐ A HANGOS: az egyetlen ember, aki tényleg beadott érték javaslatot.
  esemenyek.push(await gazda.tesz('ErtekJavaslat', {
    entitas: g.azonosito,
    ertekek: { ...ALAP_KUSZOBOK, elfogadasiKuszob: hangosKuszob }
  }, KEZDET));

  // A HALLGATÓK: tulajdonosok (van tudatpontjuk), de érték javaslatot SOHA nem adtak be.
  for (let i = 1; i < tulajdonosokSzama; i++) {
    const ki = await ujEember();
    esemenyek.push(await ki.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 10 }, KEZDET));
  }

  // Egy javaslat, hogy legyen mihez küszöböt számolni.
  const j = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: g.azonosito,
    muvelet: 'Modositas', valtozas: { cim: 'ÁTÍRVA' }, indoklas: null
  }, KEZDET + 1000);
  esemenyek.push(j);
  esemenyek.push(await gazda.tesz('TudatpontRendezes',
    { entitas: j.azonosito, pont: 10 }, KEZDET + 1100));

  const allapot = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(esemenyek, allapot, MOST);
  return javaslatok.get(j.azonosito).kuszobok.elfogadasiKuszob;
}

/** Amit Csaba modellje adna: a hallgatók alapértékkel szerepelnek a mediánban. */
function csabaModellje(hangos, tulaj) {
  const szamok = [hangos, ...Array(tulaj - 1).fill(ALAP_KUSZOBOK.elfogadasiKuszob)]
    .sort((a, b) => a - b);
  return szamok[Math.floor((szamok.length - 1) / 2)];
}

kiir('\nAZ ALAPÉRTÉK SÚLYA — számít-e a hallgató tulajdonos a küszöb-mediánba?');
kiir('Alapérték (ALAP_KUSZOBOK.elfogadasiKuszob): ' + ALAP_KUSZOBOK.elfogadasiKuszob + '\n');
kiir('  tulajdonos   hangos érték   MA érvényes   Csaba modellje szerint');
kiir('  ' + '-'.repeat(66));

for (const [tulaj, hangos] of [[2, 90], [3, 90], [9, 90], [21, 90], [9, 20], [21, 20]]) {
  const ma = await meres(hangos, tulaj);
  kiir('  ' + String(tulaj).padStart(8) + String(hangos).padStart(14)
    + String(ma).padStart(14) + String(csabaModellje(hangos, tulaj)).padStart(24));
}

kiir('\n⛔ Ha a két utolsó oszlop eltér, a hallgató tulajdonos MA NEM SZÁMÍT a mediánba:');
kiir('   a `kuszobokItt` a BEADOTT érték javaslatokon megy végig, nem a tulajdonosokon,');
kiir('   tehát az ALAP_KUSZOBOK nem súly, hanem csak tartalék (ha senki nem szólt).\n');
