// koino/js/allapot/lancGyoker.js

// Felelősség: A SZERZŐ LÁNC-GYÖKERE (D63, D78, D81 — az A pillér 2. lépése): minden új saját esemény
// `lancGyoker`-e a szerző ESEMÉNY ELŐTTI két gyökerét hordozza —
//
//   lancGyoker(k) = { naplo: naplo(1..k-1), kiosztas: kiosztas(k-1) }     (két összegzés: { l, d, o })
//
// ⭐ D81: nem a lenyomatuk, hanem MAGUK — a bizonyíték az eseménnyel utazik, így aki az eseményt
// tartja, a szerző nélkül is ellenőrizni tudja. A PONT-esemény ezen felül az adatában hozza az
// entitása régi értékének bizonyítékát (`adat.bizonyitek`, a kiosztás-fából) — a kapu ellenőrzi
// (`pontEsemenyOnbizonyitasa`), és a szabály-réteg ebből a hézagos láncnál is BIZONYÍTOTTAN ítél.
//
//   · a NAPLÓ-FA gyökere: a szerző 1..k-1 sorszámú eseményeinek azonosítói, sorrendben (D63: így a
//     kettős lánc a szeletek között is lelepleződik — két aláírt gyökér ellentmond egymásnak);
//   · a KIOSZTÁS-FA gyökere: a szerző elfogadott tudatpont-állása (entitás → pont) a k-adik esemény
//     ELŐTT; a gyökér összege a kiosztott összeg (D42).
//
// ⭐ MIÉRT AZ ESEMÉNY ELŐTTI ÁLLAPOT (2026-09-27, a megvalósítás döntése — D78 „a pontos algoritmus a
// megvalósítás része"): így egy pont-esemény ÖNMAGÁBAN ellenőrizhető — a benne aláírt korábbi
// állapotból és egyetlen bizonyítékból (az entitás régi értéke) bárki kiszámolja az új összeget
// (`allapotValtozasa`), és összeveti a bemondottal. Nem kell hozzá a szerző előző eseménye.
//
// ⭐ EGY FORRÁS: a kiosztást ugyanaz az ítélet állítja elő (`pontEsemenyMerlege`), amit a
// szabály-réteg és a művelet-réteg (`sajatKiosztott`) is hív — különben a saját gyökerünk ellentmondana
// annak, amit a másik gép számol.
//
// ⚠️ HA A SAJÁT LÁNC NEM ÉP (hézag, elágazás vagy szakadás a saját eseményeink között — pl. egy
// visszatöltött kulcs a régi események nélkül), a lánc-gyökér `null`: nem kötünk el hamis naplót.
// Az ilyen esemény olyan, mint a D78 előtti régi: érvényes, csak nem horgonyoz.
//
// ⭐ A GYORSÍTÓTÁR (a mutató pillanatképének elve, D73): a szerzőnek a folytatáshoz a napló CSÚCSAI és
// a kiosztás kellenek — ezt a memória (folyamaton belül) és egy fájl (`lanc.json`, a folyamatok
// között) tartja. ⛔ Tiszta gyorsítótár: minden használat előtt összevetjük a lánccal — a lefedett
// utolsó sorszámon tényleg az az esemény áll-e. ⭐ Ez elég: az esemény azonosítója az `elozo`-láncon
// át az EGÉSZ addigi láncot elköti, tehát egy illő gyorsítótár pontosan annak a láncnak az állapota.
// A fájl tartalmát ezen felül egy ellenőrző-lenyomat köti (a csendes sérülés ellen); ha bármi nem
// illik, a láncból épül újra.
//
// Használják: muveletek.js (az új események aláírása), tar/esemenyTar.js (a kapu: a pont-esemény
// bizonyítéka), allapot/ellentmondas.js, a próbák.

import { lenyomat } from '../esemeny/kanonikusAlak.js';
import {
  levelOsszegzes, ujNaplo, naploHozzafuzes, naploCsucsGyokere, naploGyokere,
  ujAllapotFa, allapotBeallitas, allapotGyokere, osszegzesAlakja,
  allapotBizonyitek, allapotBizonyitekEllenorzese
} from '../esemeny/osszegzoFa.js';
import { pontEsemenyMerlege } from './szabalyok.js';
import { AZONOSITO_MINTA } from '../esemeny/esemeny.js';

export const NAPLO_FAJTA = 'naplo';
export const KIOSZTAS_FAJTA = 'kiosztas';
export const KIOSZTAS_HOSSZ = 1;

// A gyorsítótár alakjának változata (ha a tartalma változik, nő — a régit eldobjuk).
const TAR_VALTOZAT = 1;

/**
 * A lánc-gyökér a két gyökérből (D81: maguk az összegzések — csak a `l`, `d`, `o` mezőjük).
 * @param {{l: string, d: number, o: Array<number>}} naploGyoker
 * @param {{l: string, d: number, o: Array<number>}} kiosztasGyoker
 * @returns {{naplo: Object, kiosztas: Object}}
 */
export function lancGyokerKetGyokerbol(naploGyoker, kiosztasGyoker) {
  const tiszta = (x) => ({ l: x.l, d: x.d, o: [...x.o] });
  return { naplo: tiszta(naploGyoker), kiosztas: tiszta(kiosztasGyoker) };
}

/** Két lánc-gyökér ugyanaz-e (mindkettő null, vagy ugyanaz a két gyökér)? */
export function azonosLancGyoker(a, b) {
  if (a === null || b === null) return a === b;
  const egy = (x, y) => x.l === y.l && x.d === y.d && x.o.length === y.o.length && x.o.every((v, i) => v === y.o[i]);
  return egy(a.naplo, b.naplo) && egy(a.kiosztas, b.kiosztas);
}

/**
 * ⭐⭐ A PONT-ESEMÉNY ÖNBIZONYÍTÁSA (D81) — a kapu hívja: ha a pont-esemény a lánc-gyökerét hordozza,
 * az adatában lennie kell az entitása régi értékének bizonyítékának, és illenie kell a saját aláírt
 * kiosztás-gyökeréhez. Ettől a szabály-réteg a bizonyíték számait (az összeget és a régi értéket)
 * hézag nélkül elhiheti — ahogy az aláírást is. ⚠️ Nem ítél a bemondásról: azt a szabály teszi.
 * @returns {Promise<{rendben: boolean, ok?: string}>}
 */
export async function pontEsemenyOnbizonyitasa(e) {
  if (e?.tipus !== 'TudatpontRendezes' || e.lancGyoker === null || e.lancGyoker === undefined) return { rendben: true };
  const entitas = e.adat?.entitas;
  if (typeof entitas !== 'string') return { rendben: false, ok: 'a pont-esemény entitása hiányzik' };
  const b = await allapotBizonyitekEllenorzese(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, e.lancGyoker.kiosztas, entitas, e.adat.bizonyitek);
  return b.rendben ? { rendben: true }
    : { rendben: false, ok: 'a pont-esemény bizonyítéka hiányzik vagy nem illik a saját lánc-gyökeréhez (D81): ' + b.ok };
}

/**
 * ⛔ Egy szavazat vagy javaslat legfeljebb ennyi bizonyítékot hordozhat (a szavazat részenként kettőt:
 * az érintettét és a javaslat-entitásáét; a javaslat érintettenként egyet). Felső korlát, hogy egy
 * kézzel írt esemény ne fújhassa fel magát.
 */
export const SZAVAZAT_BIZONYITEK_KORLAT = 64;

/** Mely események hozhatnak kulcsonkénti bizonyítékot a saját kiosztásukból (D85/2 T2, D85 T3). */
const KULCSOS_BIZONYITEK_TIPUSOK = new Set(['Szavazat', 'Javaslat']);

/**
 * ⭐⭐ A SZAVAZAT ÖNBIZONYÍTÁSA (D85/2, T2 — Csaba, 2026-10-02) — a kapu hívja. A szavazati jog a
 * leadás pillanatában pontot kíván az érintett gondolaton ÉS a javaslaton (a töredékén); a szavazat
 * ezt MAGA bizonyítja a saját aláírt kiosztás-gyökeréből (a D81 mintája). Így a jog akkor is
 * eldönthető, ha a javaslat pont-eseményei nincsenek meg (a szigorú (b) alatt a gondolat nem szavazó
 * tartóinál). ⚠️ Nem ítél a jogról — azt a számítás teszi (`javaslatSzamitas.js`); itt csak az, hogy
 * minden hozott bizonyíték a saját gyökeréhez illik. A HIÁNYZÓ bizonyíték nem hiba: ott a szavazat
 * egyszerűen nem számít.
 *
 * ⭐⭐ A JAVASLAT IS (D85 T3 előfeltétele, 2026-10-03 — a T2 mintája): a javaslattevő jogosultsága (minden
 * érintetten pontja van, a javaslat ELŐTTI állása szerint) ugyanígy a saját kiosztás-fájából bizonyított —
 * különben a csak-G1-tartó a javaslattevő hézagos láncából ítélne, és a G2-es pontot „nincs”-nek látná.
 * @returns {Promise<{rendben: boolean, ok?: string}>}
 */
export async function hozottBizonyitekokOnbizonyitasa(e) {
  if (!KULCSOS_BIZONYITEK_TIPUSOK.has(e?.tipus) || e.lancGyoker === null || e.lancGyoker === undefined) {
    return { rendben: true };
  }
  const mi = e.tipus === 'Javaslat' ? 'a javaslat' : 'a szavazat';
  const b = e.adat?.bizonyitek;
  if (b === undefined || b === null) return { rendben: true };
  if (typeof b !== 'object' || Array.isArray(b)) return { rendben: false, ok: mi + ' bizonyítéka nem objektum' };
  const kulcsok = Object.keys(b);
  if (kulcsok.length > SZAVAZAT_BIZONYITEK_KORLAT) {
    return { rendben: false, ok: mi + ' túl sok bizonyítékot hoz (' + kulcsok.length + ')' };
  }
  for (const kulcs of kulcsok) {
    if (!AZONOSITO_MINTA.test(kulcs)) return { rendben: false, ok: mi + ' bizonyítékának kulcsa nem azonosító' };
    const v = await allapotBizonyitekEllenorzese(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ, e.lancGyoker.kiosztas, kulcs, b[kulcs]);
    if (!v.rendben) {
      return { rendben: false, ok: mi + ' bizonyítéka nem illik a saját lánc-gyökeréhez (D85/2, T2): ' + v.ok };
    }
  }
  return { rendben: true };
}

/** Egy saját esemény hatása az állásra — a szabály ítéletével (a `szabalyok.js` ugyanígy lép). */
function allasLepese(allas, e) {
  if (e.tipus !== 'TudatpontRendezes') return false;
  // ⚠️ A saját láncot itt mindig hézagtalanul ismerjük (különben a lánc-gyökér null), tehát folytonos.
  const merleg = pontEsemenyMerlege(e, allas, true);
  if (merleg.elvetve) return false;           // ami nem számít, az a régi értéket hagyja érvényben
  allas.pontok.set(merleg.entitas, merleg.pont);
  allas.osszeg = merleg.ujOsszeg;
  return true;
}

/** A kiosztás-FA az állásból (csak a pozitív pontok levelek — a 0 nem tulajdon, D14). */
async function kiosztasFaja(pontok) {
  const fa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (const [kulcs, pont] of pontok) if (pont > 0) await allapotBeallitas(fa, kulcs, null, [pont]);
  return fa;
}

// ===================================
// A TELJES ÚJRASZÁMOLÁS — a láncból (a próbák mércéje, és a ③-tól a teljes láncot tartó ellenőrzőé)
// ===================================

/**
 * ⭐ A szerző TELJES állapota a k-adik esemény előtt — a láncból, gyorsítótár nélkül: a napló
 * levelei és gyökere, a kiosztás FÁJA és gyökere, és a lánc-gyökér. ⭐ Ebből állítja elő a szerző a
 * bizonyítékot (a ③ lépés: a kiosztás egy entitásának bizonyítéka, a napló egy eseményéé).
 *
 * @param {Array<Object>} elozmenyek - a szerző eseményei, sorszám szerint 1-től, hézag nélkül
 * @returns {Promise<Object|null>} null, ha a lánc nem ép
 */
export async function lancAllapotaLancbol(elozmenyek) {
  const allas = { osszeg: 0, pontok: new Map() };
  const naploLevelek = [];
  let elozo = null;
  for (let i = 0; i < elozmenyek.length; i++) {
    const e = elozmenyek[i];
    if (e.sorszam !== i + 1 || (e.elozo ?? null) !== elozo) return null;
    naploLevelek.push(await levelOsszegzes(NAPLO_FAJTA, e.azonosito));
    allasLepese(allas, e);
    elozo = e.azonosito;
  }
  const naploGyoker = await naploGyokere(NAPLO_FAJTA, naploLevelek);
  const kiosztasFa = await kiosztasFaja(allas.pontok);
  const kiosztasGyoker = await allapotGyokere(kiosztasFa);
  return {
    naploLevelek, naploGyoker, kiosztasFa, kiosztasGyoker, osszeg: allas.osszeg,
    lancGyoker: lancGyokerKetGyokerbol(naploGyoker, kiosztasGyoker)
  };
}

/**
 * A lánc-gyökér a szerző 1..k-1 sorszámú eseményeiből — a k-adik eseményhez. Gyorsítótár nélkül.
 * @returns {Promise<Object|null>} null, ha a lánc nem ép
 */
export async function lancGyokerLancbol(elozmenyek) {
  return (await lancAllapotaLancbol(elozmenyek))?.lancGyoker ?? null;
}

// ===================================
// A GYORSÍTÓTÁRAS ÚT — a szerző minden új eseményénél
// ===================================

// tár → (szerző → állapot): a folyamaton belüli emlékezet.
const memoria = new WeakMap();

// ⚠️ A `kiosztasFa` (a kiosztás FÁJA) csak a memóriában él — a fájl a pontokat tartja, a fa a
// bizonyítékhoz kérésre épül belőlük (egy pont-eseménynél).
const uresAllapot = (szerzo) => ({
  szerzo, sorszam: 0, utolso: null, naplo: ujNaplo(NAPLO_FAJTA),
  osszeg: 0, pontok: new Map(), kiosztasGyoker: null, kiosztasFa: null
});

/** A gyorsítótár tartalmának ellenőrző-lenyomata (a csendes sérülés ellen). */
const ellenorzoje = (adat) => lenyomat(['lanc-gyorsitotar', adat.v, adat.szerzo, adat.sorszam, adat.utolso,
  adat.csucsok, adat.osszeg, adat.pontok, adat.kiosztasGyoker]);

/**
 * A fájlból olvasott gyorsítótár — ha ép. ⛔ Egy gyorsítótárban sem bízunk vakon: ha rossz kiosztás-
 * gyökeret adna, a szerző egy HAMIS gyökeret írna alá, és egy szúrópróba (D79) csalásnak látná. Ezért
 * a tartalmát egy ellenőrző-lenyomat köti, és a belső számai is egyezzenek.
 */
async function fajlbolAllapot(adat, szerzo) {
  if (!adat || adat.v !== TAR_VALTOZAT || adat.szerzo !== szerzo) return null;
  try {
    if (adat.ell !== await ellenorzoje(adat)) return null;
  } catch {
    return null;                         // kanonikus alakra sem hozható: sérült
  }
  if (!Number.isSafeInteger(adat.sorszam) || adat.sorszam < 0) return null;
  if (!Array.isArray(adat.csucsok) || !adat.csucsok.every((cs) => cs && Number.isSafeInteger(cs.meret)
      && cs.meret > 0 && osszegzesAlakja(cs.osszegzes, 0))) return null;
  if (!Array.isArray(adat.pontok) || !adat.pontok.every((p) => Array.isArray(p) && typeof p[0] === 'string'
      && Number.isSafeInteger(p[1]) && p[1] >= 0)) return null;
  if (!Number.isSafeInteger(adat.osszeg) || !osszegzesAlakja(adat.kiosztasGyoker, KIOSZTAS_HOSSZ)) return null;
  // ⚠️ Belső szám-egyezést (a napló mérete, a kiosztás összege) nem nézünk külön: a tartalmat az
  // ellenőrző-lenyomat köti, a láncra pedig az utolsó azonosító (rontás-próba: a kettő mellett nem
  // mérhető — egy őr, ami semmit nem fog meg, csak azt hiteti el, hogy véd).
  const naplo = { ...ujNaplo(NAPLO_FAJTA), csucsok: adat.csucsok };
  const pontok = new Map(adat.pontok);
  return { szerzo, sorszam: adat.sorszam, utolso: adat.utolso ?? null, naplo, osszeg: adat.osszeg, pontok,
    kiosztasGyoker: adat.kiosztasGyoker, kiosztasFa: null };
}

async function fajlba(a) {
  const adat = {
    v: TAR_VALTOZAT, szerzo: a.szerzo, sorszam: a.sorszam, utolso: a.utolso, csucsok: a.naplo.csucsok,
    osszeg: a.osszeg, pontok: [...a.pontok], kiosztasGyoker: a.kiosztasGyoker
  };
  return { ...adat, ell: await ellenorzoje(adat) };
}

/** Illik-e az állapot a lánchoz: a lefedett utolsó sorszámon tényleg az az (egyetlen) esemény áll? */
async function illikALanchoz(tar, koino, a) {
  if (a.sorszam === 0) return true;
  const ott = (await tar.sorszamSzerint(a.szerzo, a.sorszam)).filter((e) => e.koino === koino);
  return ott.length === 1 && ott[0].azonosito === a.utolso;
}

/**
 * A szerző állapota az 1..meddig sorszámú eseményei után — a gyorsítótárból, a hiányzó végét a
 * láncból pótolva.
 * @returns {Promise<Object|null>} null, ha a saját lánc nem ép (hézag, elágazás, szakadás)
 */
async function allapotIg(tar, koino, szerzo, meddig, tarolo) {
  let tarbeli = memoria.get(tar);
  if (!tarbeli) { tarbeli = new Map(); memoria.set(tar, tarbeli); }

  // ----- Honnan indulunk: memória → fájl → üres -----
  let a = null;
  // ⚠️ A fájl hibája nem hiba: a gyorsítótár elhagyható, a lánc pótolja.
  const fajlbol = tarolo ? await fajlbolAllapot(await tarolo.olvas().catch(() => null), szerzo) : null;
  for (const jelolt of [tarbeli.get(szerzo), fajlbol]) {
    if (jelolt && jelolt.sorszam <= meddig && await illikALanchoz(tar, koino, jelolt)) { a = jelolt; break; }
  }
  if (!a) a = uresAllapot(szerzo);
  const indulo = a.sorszam;

  // ----- A hiányzó vég a láncból -----
  let pontValtozott = a.kiosztasGyoker === null;
  const naplo = a.naplo;
  const pontok = new Map(a.pontok);
  const allas = { osszeg: a.osszeg, pontok };
  let utolso = a.utolso;
  let uj = naplo;
  for (let s = a.sorszam + 1; s <= meddig; s++) {
    const ott = (await tar.sorszamSzerint(szerzo, s)).filter((e) => e.koino === koino);
    if (ott.length !== 1 || (ott[0].elozo ?? null) !== utolso) {
      console.warn('lancGyoker - a saját lánc nem ép (hézag, elágazás vagy szakadás) — nem horgonyzunk',
        { sorszam: s, talalat: ott.length });
      return null;
    }
    uj = await naploHozzafuzes(uj, await levelOsszegzes(NAPLO_FAJTA, ott[0].azonosito));
    if (allasLepese(allas, ott[0])) pontValtozott = true;
    utolso = ott[0].azonosito;
  }
  const kiosztasFa = pontValtozott ? await kiosztasFaja(pontok) : a.kiosztasFa;
  const kesz = {
    szerzo, sorszam: meddig, utolso, naplo: uj, osszeg: allas.osszeg, pontok, kiosztasFa,
    kiosztasGyoker: pontValtozott ? await allapotGyokere(kiosztasFa) : a.kiosztasGyoker
  };

  tarbeli.set(szerzo, kesz);
  if (tarolo && meddig !== indulo) {
    await tarolo.ir(await fajlba(kesz)).catch((hiba) =>
      console.warn('lancGyoker - a gyorsítótár nem írható (nem baj, a lánc pótolja)', { hiba: hiba.message }));
  }
  return kesz;
}

/**
 * ⭐ A LÁNC-GYÖKÉR (és a pont-esemény bizonyítéka) EGY ÚJ SAJÁT ESEMÉNYHEZ — a `sorszam`-adik
 * eseményhez, az 1..sorszam-1 állapotából.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} szerzo
 * @param {number} sorszam - az új esemény sorszáma (a lánc vége + 1)
 * @param {Object} [tarolo] - a gyorsítótár fájlja (`lancTarolo`); nélküle csak a memória
 * @param {string|Array<string>|null} [entitas] - pont-eseménynél az entitás (a régi értékének
 *        bizonyítéka); szavazatnál a kulcsok listája (D85/2) — kulcsonként egy bizonyíték
 * @returns {Promise<{lancGyoker: Object|null, bizonyitek: Object|null}>} null-ok, ha a saját lánc nem ép
 */
export async function lancUjEsemenyhez(tar, koino, szerzo, sorszam, tarolo = null, entitas = null) {
  const a = await allapotIg(tar, koino, szerzo, sorszam - 1, tarolo);
  if (!a) return { lancGyoker: null, bizonyitek: null };
  const lancGyoker = lancGyokerKetGyokerbol(await naploCsucsGyokere(a.naplo), a.kiosztasGyoker);
  let bizonyitek = null;
  if (typeof entitas === 'string') {
    // A fa a pontokból épül (a fájlból jött állapotnak csak a pontjai vannak meg) — egyszer.
    if (!a.kiosztasFa) a.kiosztasFa = await kiosztasFaja(a.pontok);
    bizonyitek = await allapotBizonyitek(a.kiosztasFa, entitas);
  } else if (Array.isArray(entitas) && entitas.length) {
    // ⭐ D85/2: a SZAVAZAT több entitásra hoz bizonyítékot (részenként az érintettére és a
    // javaslat-entitásáéra) — kulcsonként egyet.
    if (!a.kiosztasFa) a.kiosztasFa = await kiosztasFaja(a.pontok);
    bizonyitek = {};
    for (const kulcs of entitas) bizonyitek[kulcs] = await allapotBizonyitek(a.kiosztasFa, kulcs);
  }
  return { lancGyoker, bizonyitek };
}

/** A lánc-gyökér egy új saját eseményhez (a bizonyíték nélkül). */
export async function lancGyokerUjEsemenyhez(tar, koino, szerzo, sorszam, tarolo = null) {
  return (await lancUjEsemenyhez(tar, koino, szerzo, sorszam, tarolo)).lancGyoker;
}
