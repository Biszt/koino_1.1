// koino/meres/esemenyMeretMeres.js

// Felelősség: AZ ESEMÉNY MÉRETE A LÁNC-GYÖKÉRREL ÉS A BIZONYÍTÉKKAL (53. mérés, D81) — a 6. szabály
// kemény fele (az ADAT-csomag kicsi marad): mennyit ad egy eseményhez, hogy a bizonyíték vele utazik?
//
// Nem önpróba: számokat ad. A szerző kiosztásának mérete (hány entitáson van pontja) szerint:
//   · egy NEM pont-esemény: a lánc-gyökér (két összegzés) null helyett;
//   · egy PONT-esemény: + az entitás régi értékének bizonyítéka (a kiosztás-fából).
//
// Futtatás: node koino/meres/esemenyMeretMeres.js

import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import {
  levelOsszegzes, naploGyokere, ujAllapotFa, allapotBeallitas, allapotGyokere, allapotBizonyitek
} from '../js/esemeny/osszegzoFa.js';
import { lancGyokerKetGyokerbol, NAPLO_FAJTA, KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ } from '../js/allapot/lancGyoker.js';

const kiir = console.log;
console.log = () => {};
console.warn = () => {};

const bajt = (x) => Buffer.byteLength(JSON.stringify(x), 'utf8');
const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const azon = (i, jel = 'E') => String(i).padStart(43, jel);

// Egy 1000 eseményes napló gyökere (a napló mérete a gyökér összegzésén nem változtat: d egy szám).
const naplo = await naploGyokere(NAPLO_FAJTA, await Promise.all(
  Array.from({ length: 1000 }, (_, i) => levelOsszegzes(NAPLO_FAJTA, azon(i, 'A')))));

const alap = { koino: 'meres', entitasSorszam: 3, elozo: azon(1, 'Z'), sorszam: 1001 };
const gondolat = (lancGyoker) => esemenyLetrehozasa({ ...alap, tipus: 'GondolatLetrehozas', entitas: null,
  adat: { tipus: 'Gondolat', cim: 'Egy átlagos cím', szoveg: { lenyomat: azon(7, 'S'), bajt: 420 }, szulo: azon(8, 'P'),
    gondolatTipus: null, kategoriak: [], meret: 180 }, lancGyoker }, kulcspar);
const pont = (lancGyoker, bizonyitek) => esemenyLetrehozasa({ ...alap, tipus: 'TudatpontRendezes', entitas: azon(3),
  adat: { entitas: azon(3), pont: 40, szerep: 'aktiv', kiosztva: 400, ...(bizonyitek ? { bizonyitek } : {}) },
  lancGyoker }, kulcspar);

kiir('\n===== 53. MÉRÉS — AZ ESEMÉNY MÉRETE A LÁNC-GYÖKÉRREL ÉS A BIZONYÍTÉKKAL (D81) =====\n');
kiir('Lánc-gyökér nélkül (null):  gondolat ' + bajt(await gondolat(null)) + ' B · pont-esemény ' + bajt(await pont(null)) + ' B');

for (const n of [10, 100, 1000, 10000]) {
  const fa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (let i = 0; i < n; i++) await allapotBeallitas(fa, azon(i), null, [1 + (i % 50)]);
  const lancGyoker = lancGyokerKetGyokerbol(naplo, await allapotGyokere(fa));
  // Átlag több entitás bizonyítékán (a mélység kulcsonként kicsit más).
  let osszeg = 0, lepes = 0;
  const minta = 20;
  for (let j = 0; j < minta; j++) {
    const b = await allapotBizonyitek(fa, azon((j * 7919) % n));
    osszeg += bajt(await pont(lancGyoker, b));
    lepes += b.testverek.length;
  }
  kiir('Kiosztás ' + String(n).padStart(5) + ' entitáson: gondolat ' + bajt(await gondolat(lancGyoker)) + ' B · pont-esemény átlag '
    + Math.round(osszeg / minta) + ' B (a bizonyíték átlag ' + (lepes / minta).toFixed(1) + ' lépés)');
}
kiir('');
