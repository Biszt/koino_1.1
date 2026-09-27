// koino/meres/tartomanyProba.js

// Felelősség: A TARTOMÁNY-EGYEZTETÉS próbája (S4, D74 — `js/csere/tartomany.js`).
//
// Két halmazt egyeztetünk hálózat nélkül, a két fél üzeneteit egymásnak adogatva, és azt mérjük,
// amit a módszer ígér: (1) mindkét fél PONTOSAN megtudja, mi hiányzik neki és a másiknak; (2) ha
// nincs eltérés, egy lenyomat elég; (3) a forgalom az eltérésekkel nő, nem a halmaz méretével;
// (4) a teljes tartomány lenyomata UGYANAZ, mint a tár szelet-lenyomata (egy forrásból); (5) a
// hibás üzenetet megnevezett hibával elutasítjuk.
//
// ⚠️ A csere ma még nem hívja (a C lépés 8. pontja köti be) — ez a réteg próbája, nem a bekötésé.

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';
import {
  egyeztetesNyitasa, egyeztetesLepese, VODROK, LISTA_KUSZOB, TARTOMANY_KORLAT, AZONOSITO_KORLAT
} from '../js/csere/tartomany.js';
import { rendezettHalmaz } from '../js/esemeny/halmaz.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { esemenyMentese } from '../js/tar/esemenyTar.js';

const { proba, futtatas } = probaGyujtemeny('A tartomány-egyeztetés próbája (S4, D74)');

const KOINO = 'proba';

/** Egy véletlen, érvényes alakú azonosító (32 bájt, base64url — 43 jel). */
const ujAzonosito = () => randomBytes(32).toString('base64url');
const azonositok = (db) => Array.from({ length: db }, ujAzonosito);

/**
 * Egy teljes egyeztetés két fél között: A nyit, B felel, felváltva — amíg valaki nem mondja,
 * hogy minden rendben (`valasz: null`).
 * @returns {Promise<{aKell: Set, bKell: Set, uzenetek: number, bajt: number}>}
 */
async function egyeztetes(a, b) {
  const halmazok = { A: rendezettHalmaz(a), B: rendezettHalmaz(b) };
  const kell = { A: new Set(), B: new Set() };
  let uzenet = await egyeztetesNyitasa(halmazok.A);
  let uzenetek = 1;
  let bajt = JSON.stringify(uzenet).length;
  let soros = 'B';
  while (uzenet) {
    const masik = soros === 'A' ? 'B' : 'A';
    const { valasz, kellNekem, kellNeki } = await egyeztetesLepese(halmazok[soros], uzenet);
    for (const x of kellNekem) kell[soros].add(x);
    for (const x of kellNeki) kell[masik].add(x);
    uzenet = valasz;
    if (uzenet) {
      uzenetek++;
      bajt += JSON.stringify(uzenet).length;
      if (uzenetek > 200) throw new Error('az egyeztetés nem ér véget');
    }
    soros = masik;
  }
  return { aKell: kell.A, bKell: kell.B, uzenetek, bajt };
}

/** Pontosan a várt különbséget tudta-e meg a két fél? */
function pontos(eredmeny, a, b) {
  const aHalmaz = new Set(a);
  const bHalmaz = new Set(b);
  const aHianya = b.filter((x) => !aHalmaz.has(x));
  const bHianya = a.filter((x) => !bHalmaz.has(x));
  return eredmeny.aKell.size === aHianya.length && aHianya.every((x) => eredmeny.aKell.has(x))
    && eredmeny.bKell.size === bHianya.length && bHianya.every((x) => eredmeny.bKell.has(x));
}

proba('⭐ AZONOS HALMAZOKNÁL egyetlen lenyomat elég — a válasz „minden rendben"', async () => {
  const kozos = azonositok(5000);
  const e = await egyeztetes(kozos, [...kozos].reverse());
  return e.uzenetek === 1 && e.bajt < 80 && e.aKell.size === 0 && e.bKell.size === 0;
});

proba('⭐⭐ EGY ELTÉRÉS 10 000 KÖZÖTT: pontosan az az egy derül ki — és néhány üzenetből', async () => {
  const kozos = azonositok(10000);
  const plusz = ujAzonosito();
  const e = await egyeztetes([...kozos, plusz], kozos);
  // ⭐ log16(10 000) ≈ 3,3 felosztás, oda-vissza — néhány üzenet, nem ezer.
  return pontos(e, [...kozos, plusz], kozos) && e.bKell.has(plusz) && e.uzenetek <= 8;
});

proba('⭐⭐ SOK ELTÉRÉS MINDKÉT IRÁNYBAN: mindkét fél pontosan a saját hiányát tudja meg', async () => {
  const kozos = azonositok(3000);
  const csakA = azonositok(250);
  const csakB = azonositok(400);
  const a = [...kozos, ...csakA];
  const b = [...kozos, ...csakB];
  return pontos(await egyeztetes(a, b), a, b) && pontos(await egyeztetes(b, a), b, a);
});

proba('⭐ SZÉLSŐ ESETEK: üres, egyik üres, közös nélküli, és a lista-küszöb körül', async () => {
  const esetek = [
    [[], []],
    [azonositok(1), []],
    [[], azonositok(1000)],
    [azonositok(700), azonositok(900)],                        // semmi közös
    [azonositok(LISTA_KUSZOB), azonositok(LISTA_KUSZOB + 1)],
    [azonositok(VODROK), []]
  ];
  for (const [a, b] of esetek) {
    if (!pontos(await egyeztetes(a, b), a, b)) return false;
  }
  return true;
});

proba('⭐⭐ A FORGALOM AZ ELTÉRÉSEKKEL NŐ, NEM A MÉRETTEL — egy eltérés 1 000 és 100 000 közt', async () => {
  const bajtjai = async (db) => {
    const kozos = azonositok(db);
    const e = await egyeztetes([...kozos, ujAzonosito()], kozos);
    return e.bajt;
  };
  const kicsi = await bajtjai(1000);
  const nagy = await bajtjai(100000);
  // ⭐ 100× nagyobb halmaz → a forgalom csak a felosztások számával nő (log16), nem 100×-osan.
  return nagy < 3 * kicsi && nagy < 8000;
});

proba('⭐ A TELJES TARTOMÁNY LENYOMATA = A TÁR SZELET-LENYOMATA (egy forrásból, D73–D74)', async () => {
  const tar = await esemenyTarNyitasa(KOINO, await mkdtemp(join(tmpdir(), 'koino-tartomany-')));
  const anna = await ujEember(KOINO);
  const g = await anna.tesz('GondolatLetrehozas', { cim: 'Egy szelet', meret: 10 });
  await esemenyMentese(tar, g);
  for (let i = 0; i < 5; i++) {
    await esemenyMentese(tar, await anna.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: i + 1 }));
  }
  const szelete = (await tar.szeletEsemenyei(g.azonosito)).map((e) => e.azonosito);
  const [[, , nyito]] = await egyeztetesNyitasa(rendezettHalmaz(szelete));
  return szelete.length === 6 && nyito === await tar.szeletLenyomata(g.azonosito);
});

proba('⛔⛔ A HIBÁS ÜZENETET MEGNEVEZETT HIBÁVAL ELUTASÍTJA — alak, sorrend, lefedés, méret', async () => {
  const halmaz = rendezettHalmaz(azonositok(50));
  const jo = ujAzonosito();
  const hibasak = [
    'nem lista',
    [],
    [[null, 'X']],                                   // ismeretlen mód
    [['B', 'S'], ['A', 'S'], [null, 'S']],           // a határok nem növekvők
    [['B', 'S']],                                    // nem fedi le a végtelenig
    [[null, 'L', 'rövid']],                          // érvénytelen lenyomat
    [['M', 'S'], [null, 'I', ['A' + jo.slice(1)]]],  // tartományon kívüli azonosító (M alatt)
    [[null, 'I', ['nem azonosító']]],
    Array.from({ length: TARTOMANY_KORLAT + 1 }, (_, i) =>
      [i === TARTOMANY_KORLAT ? null : 'A' + String(i).padStart(5, '0'), 'S']),
    [[null, 'I', azonositok(AZONOSITO_KORLAT + 1)]]
  ];
  for (const uzenet of hibasak) {
    try {
      await egyeztetesLepese(halmaz, uzenet);
      return false;
    } catch (hiba) {
      if (hiba.kod !== 'HIBAS-EGYEZTETES') return false;
    }
  }
  // …és a jó alakú, tartományon belüli lista átmegy.
  const rendben = await egyeztetesLepese(halmaz, [[null, 'I', [jo]]]);
  return rendben.kellNekem.length === 1 && rendben.kellNeki.length === 50;
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/tartomanyProba.js
if (process.argv[1] && process.argv[1].endsWith('tartomanyProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
