// koino/meres/kanonikusProba.js — a kanonikus alak önpróbája (Szakasz 1 / 2. lépés)
//
// Azt bizonyítja, hogy ugyanaz a logikai adat mindig ugyanazt a lenyomatot adja — és hogy
// a különböző adatok lenyomata tényleg különbözik. Ha ez valaha pirosat mutat, a koino két
// gépe nem fog egyetérteni.

import { kanonikusSzoveg, lenyomat } from '../js/esemeny/kanonikusAlak.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A kanonikus alak próbája');

// ===== AZONOSSÁG: ugyanaz az adat, másképp összerakva =====

proba('A mezők sorrendje NEM számít', async () => {
  const a = { alma: 1, banan: 2, cseresznye: 3 };
  const b = { cseresznye: 3, alma: 1, banan: 2 };
  return await lenyomat(a) === await lenyomat(b);
});

proba('A beágyazott mezők sorrendje sem számít', async () => {
  const a = { kulso: { egy: 1, ketto: 2 }, masik: [ { x: 1, y: 2 } ] };
  const b = { masik: [ { y: 2, x: 1 } ], kulso: { ketto: 2, egy: 1 } };
  return await lenyomat(a) === await lenyomat(b);
});

proba('Az „é" kétféle Unicode-alakja azonos', async () => {
  // ⚠️ SZÁNDÉKOSAN KÓDDAL írjuk le a két alakot, nem beírt betűvel: ha valaki
  // újragépelné a fájlt, a szerkesztő némán azonossá tehetné a kettőt, és a próba
  // MINDIG átmenne — vagyis semmit nem bizonyítana.
  const egyKarakter = { nev: 'kék' };     // é = U+00E9 (előre összerakott)
  const ketKarakter = { nev: 'kék' };    // e + kombináló ékezet (U+0301)
  if (egyKarakter.nev === ketKarakter.nev) throw new Error('a két alak azonos — a próba vak');
  return await lenyomat(egyKarakter) === await lenyomat(ketKarakter);
});

proba('A hiányzó (undefined) mező nem számít', async () => {
  const a = { alma: 1, korte: undefined };
  const b = { alma: 1 };
  return await lenyomat(a) === await lenyomat(b);
});

// ===== KÜLÖNBÖZŐSÉG: más adat, más lenyomat =====

proba('Egyetlen karakter változása MÁS lenyomatot ad', async () => {
  const a = { uzenet: 'tamogatom' };
  const b = { uzenet: 'tamogatoM' };
  return await lenyomat(a) !== await lenyomat(b);
});

proba('A TÖMB sorrendje SZÁMÍT (ott jelentés van)', async () => {
  return await lenyomat([1, 2, 3]) !== await lenyomat([3, 2, 1]);
});

proba('A null NEM ugyanaz, mint a hiányzó mező', async () => {
  return await lenyomat({ a: null }) !== await lenyomat({});
});

proba('A szám és a szöveg nem keverhető össze', async () => {
  return await lenyomat({ pont: 100 }) !== await lenyomat({ pont: '100' });
});

// ===== SZIGORÍTÁS: amit VISSZA KELL UTASÍTANI =====

proba('A TÖRT szám hibát dob (csak egész lehet)', async () => {
  try { await lenyomat({ arany: 66.7 }); return false; }
  catch (h) { return h.message.includes('EGÉSZ'); }
});

proba('A NaN és a végtelen hibát dob', async () => {
  try { await lenyomat({ x: NaN }); return false; } catch { /* jó */ }
  try { await lenyomat({ x: Infinity }); return false; } catch { return true; }
});

proba('A túl nagy szám hibát dob (pontosságvesztés)', async () => {
  try { await lenyomat({ x: 9007199254740993 }); return false; } catch { return true; }
});

proba('A függvény nem szerepelhet eseményben', async () => {
  try { await lenyomat({ f: () => 1 }); return false; } catch { return true; }
});

// ===== A KANONIKUS SZÖVEG ALAKJA =====

proba('A kanonikus szöveg rendezett és tömör', async () => {
  const szoveg = kanonikusSzoveg({ b: 2, a: 1, c: [3, { z: 1, y: 2 }] });
  return szoveg === '{"a":1,"b":2,"c":[3,{"y":2,"z":1}]}';
});

// ===== REGRESSZIÓ: a szabály ne változzon NÉMÁN =====
//
// Egy rögzített bemenet rögzített lenyomata. Ha valaki később megváltoztatja a
// kanonikus alak szabályait, ez a próba AZONNAL bukik — ami épp a lényeg: a szabály
// megváltoztatása minden korábbi esemény azonosítóját érvénytelenítené.

// ⚠️⚠️ EZ A BEMENET SZÁNDÉKOSAN BEFAGYASZTOTT SZÖVEG — NE „javítsd ki".
//
// A „tartalom" → „gondolat" átnevezéskor (2026-09-06) ez a próba elbukott, mert az
// átnevező a horgony BEMENETÉT is átírta. ⭐ És épp ez bizonyítja, hogy a horgony működik:
// a lenyomat minden bájtra érzékeny. *(Másodszor is megtörtént, egy fölösleges újrafuttatás
// miatt — ezért került a fájl az átnevező kihagyandó-listájára.)*
//
// A horgony dolga a KANONIKUS ALAK SZABÁLYAIT őrizni (mezőrendezés, egész számok, NFC),
// nem a szóhasználatunkat. Ezért itt a régi szavak maradnak: így a lenyomat 2026-08-27 óta
// összehasonlítható marad. Ha a szavakat is átírnánk, a horgony minden átnevezéskor
// „elszakadna", és a végén már senki nem tudná, mit is őriz.
const HORGONY_ADAT = {
  koino: 'proba',
  tipus: 'TartalomLetrehozas',                        // ⚠️ befagyasztott szöveg (lásd fent)
  szerzo: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  elozo: null,
  sorszam: 1,
  ido: 1756252800000,
  adat: { cim: 'Első tartalom', szoveg: 'Árvíztűrő tükörfúrógép' }   // ⚠️ ugyanígy
};
const HORGONY_LENYOMAT = 'lmeSv52X_ekE-RGg-0hGaCVtPl80E4awmXtNSnZ8xIY';  // mérve: 2026-08-27

proba('REGRESSZIÓ: a rögzített lenyomat változatlan', async () => {
  const most = await lenyomat(HORGONY_ADAT);
  if (most !== HORGONY_LENYOMAT) {
    console.warn('A horgony-lenyomat megváltozott! Mostani érték:', most);
  }
  return most === HORGONY_LENYOMAT;
});

export default futtatas;
