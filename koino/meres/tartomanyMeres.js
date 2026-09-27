// koino/meres/tartomanyMeres.js

// Felelősség: AZ 50. MÉRÉS — mennyibe kerül egy eltérés a TARTOMÁNY-EGYEZTETÉSSEL (S4, D74)?
//
// A szeletelési terv 5./C 6. pontja ugyanazt kéri, mint a 48. mérés: *„1 eltérés 100 000 esemény
// közt → hány bájt"* — ott a mai csere 160,2 KB-ot forgalmazott érte. Itt ugyanazon a generátoron
// (`skalaMeres.js`, magvas) a tartomány-egyeztetést mérjük, hálózat nélkül (a két fél üzeneteit
// egymásnak adogatva, a bájt az üzenetek JSON-hossza):
//
//   1. egyetlen halmazként — mind a 100 000 esemény-azonosító (a szeletelés nélküli eset);
//   2. ⭐ KÉT SZINTEN — előbb a szeletek (szeletenként egy jel: a szelet kulcsa + lenyomata), és
//      csak az eltérő szeleten belül az események. Ez a szeletelt csere váza (a 8. pont dönti el
//      a pontos üzeneteit, és a társankénti emlékezet még ezt az első szintet is megspórolhatja);
//   3. amikor NINCS eltérés;
//   4. egyetlen szelet (a medián és a legnagyobb) egy eltéréssel.
//
// ⚠️ EZ NEM ÖNPRÓBA (számokat ad), és nem kerül a `mind.js`-be.
//   node koino/meres/tartomanyMeres.js [darab]    → alapból 100 000

import { kiir } from './naplo.js';

import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { tarGyartasa } from './skalaMeres.js';
import { szelet } from '../js/esemeny/esemeny.js';
import { rendezettHalmaz, halmazLenyomata } from '../js/esemeny/halmaz.js';
import { egyeztetesNyitasa, egyeztetesLepese } from '../js/csere/tartomany.js';

/** Egy teljes egyeztetés (A nyit): üzenetek, bájtok, és amit a két fél megtudott. */
async function egyeztetes(a, b) {
  const halmazok = { A: rendezettHalmaz(a), B: rendezettHalmaz(b) };
  const tudja = { A: { kellNekem: [], kellNeki: [] }, B: { kellNekem: [], kellNeki: [] } };
  let uzenet = await egyeztetesNyitasa(halmazok.A);
  let uzenetek = 1;
  let bajt = JSON.stringify(uzenet).length;
  let soros = 'B';
  while (uzenet) {
    const { valasz, kellNekem, kellNeki } = await egyeztetesLepese(halmazok[soros], uzenet);
    tudja[soros].kellNekem.push(...kellNekem);
    tudja[soros].kellNeki.push(...kellNeki);
    uzenet = valasz;
    if (uzenet) { uzenetek++; bajt += JSON.stringify(uzenet).length; }
    soros = soros === 'A' ? 'B' : 'A';
  }
  return { uzenetek, bajt, tudja };
}

const kb = (b) => (b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB');

async function fut() {
  const darab = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 100000;
  const hely = join(tmpdir(), 'koino-tartomanymeres-' + darab + '-' + Date.now());
  kiir('');
  kiir('TARTOMÁNY-EGYEZTETÉS (50.) — ' + darab.toLocaleString('hu-HU') + ' esemény · Node '
    + process.version);
  try {
    const { fajl } = await tarGyartasa(darab, hely);
    const esemenyek = (await readFile(fajl, 'utf8')).split('\n').filter(Boolean).map((s) => JSON.parse(s));

    // ⭐ Az eltérés: B-ből hiányzik EGY esemény (magvasan választva, középről).
    const hianyzo = esemenyek[Math.floor(esemenyek.length / 2)];
    const a = esemenyek;
    const b = esemenyek.filter((e) => e !== hianyzo);

    // ----- 1. EGYETLEN HALMAZ -----
    const egy = await egyeztetes(a.map((e) => e.azonosito), b.map((e) => e.azonosito));
    // B hiánya = amit B „kellNekem"-ként, vagy A „kellNeki"-ként tudott meg — pontosan az az egy.
    const bHianya = new Set([...egy.tudja.B.kellNekem, ...egy.tudja.A.kellNeki]);
    const egyRendben = bHianya.size === 1 && bHianya.has(hianyzo.azonosito)
      && egy.tudja.A.kellNekem.length + egy.tudja.B.kellNeki.length === 0;

    // ----- 2. KÉT SZINTEN: a szeletek, aztán az eltérő szelet -----
    const szeletei = (lista) => {
      const t = new Map();
      for (const e of lista) {
        const s = szelet(e);
        if (!t.has(s)) t.set(s, []);
        t.get(s).push(e.azonosito);
      }
      return t;
    };
    const jelek = async (szeletek) => {
      const jel = new Map();                       // jel → a szelet kulcsa
      for (const [s, ids] of szeletek) {
        jel.set(await halmazLenyomata([s, await halmazLenyomata(rendezettHalmaz(ids))]), s);
      }
      return jel;
    };
    const aSzeletek = szeletei(a);
    const bSzeletek = szeletei(b);
    const aJelek = await jelek(aSzeletek);
    const bJelek = await jelek(bSzeletek);
    const elso = await egyeztetes([...aJelek.keys()], [...bJelek.keys()]);
    // Az eltérő szeletet mindkét fél a SAJÁT jeléből ismeri fel (a másikét nem tudja visszafejteni).
    const eltero = new Set();
    for (const f of ['A', 'B']) {
      const sajat = f === 'A' ? aJelek : bJelek;
      for (const j of [...elso.tudja[f].kellNekem, ...elso.tudja[f].kellNeki]) {
        if (sajat.has(j)) eltero.add(sajat.get(j));
      }
    }
    let masodikBajt = 0, masodikUzenet = 0;
    for (const s of eltero) {
      const m = await egyeztetes(aSzeletek.get(s) ?? [], bSzeletek.get(s) ?? []);
      masodikBajt += m.bajt;
      masodikUzenet += m.uzenetek;
    }
    // + a szelet megnevezése (a kulcsa, ~50 B) — ezt a 8. pont üzenete viszi.
    const ketSzint = elso.bajt + masodikBajt + 50 * eltero.size;

    // ----- 3. NINCS ELTÉRÉS -----
    const semmi = await egyeztetes(a.map((e) => e.azonosito), a.map((e) => e.azonosito));

    // ----- 4. EGY SZELET, EGY ELTÉRÉSSEL -----
    const meretek = [...aSzeletek.values()].sort((x, y) => x.length - y.length);
    const median = meretek[Math.floor(meretek.length / 2)];
    const legnagyobb = meretek[meretek.length - 1];
    const szeletben = async (ids) => (await egyeztetes(ids, ids.slice(1))).bajt;

    kiir('');
    kiir('  (a 48. mérés, a mai csere: 1 eltérés 100 000 közt = 160,2 KB · „nincs újdonság" = 334 B)');
    kiir('');
    kiir('  1. egyetlen halmaz (' + a.length + ' azonosító):   ' + kb(egy.bajt) + ' · '
      + egy.uzenetek + ' üzenet · az eltérés megtalálva: ' + egyRendben);
    kiir('  2. ⭐ két szinten:                      ' + kb(ketSzint) + ' ('
      + aSzeletek.size + ' szelet-jel: ' + kb(elso.bajt) + ', ' + elso.uzenetek + ' üzenet; az eltérő '
      + eltero.size + ' szelet: ' + kb(masodikBajt) + ', ' + masodikUzenet + ' üzenet)'
      + ' · a hiányzó szelete megtalálva: ' + eltero.has(szelet(hianyzo)));
    kiir('  3. nincs eltérés:                       ' + kb(semmi.bajt) + ' · ' + semmi.uzenetek + ' üzenet');
    kiir('  4. egy szelet, egy eltérés:             medián (' + median.length + ' esemény) '
      + kb(await szeletben(median)) + ' · a legnagyobb (' + legnagyobb.length + ') '
      + kb(await szeletben(legnagyobb)));
    kiir('');
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
}

fut().catch((hiba) => {
  kiir('HIBA: ' + hiba.message);
  kiir(hiba.stack);
  process.exit(1);
});
