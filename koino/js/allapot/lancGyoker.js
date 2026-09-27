// koino/js/allapot/lancGyoker.js

// Felelősség: A SZERZŐ LÁNC-GYÖKERE (D63, D78 — az A pillér 2. lépése): minden új saját esemény
// `lancGyoker`-e egyetlen lenyomattal elköti a szerző ESEMÉNY ELŐTTI állapotát —
//
//   lancGyoker(k) = lenyomat(['G', naplo(1..k-1).l, kiosztas(k-1).l])
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
// Használják: muveletek.js (az új események aláírása), a próbák; (a ③ lépéstől) az ellenőrzés.

import { lenyomat } from '../esemeny/kanonikusAlak.js';
import {
  levelOsszegzes, ujNaplo, naploHozzafuzes, naploCsucsGyokere, naploGyokere,
  ujAllapotFa, allapotBeallitas, allapotGyokere, osszegzesAlakja
} from '../esemeny/osszegzoFa.js';
import { pontEsemenyMerlege } from './szabalyok.js';

export const NAPLO_FAJTA = 'naplo';
export const KIOSZTAS_FAJTA = 'kiosztas';
export const KIOSZTAS_HOSSZ = 1;

// A gyorsítótár alakjának változata (ha a tartalma változik, nő — a régit eldobjuk).
const TAR_VALTOZAT = 1;

/**
 * A lánc-gyökér a két gyökérből.
 * @param {{l: string}} naploGyoker
 * @param {{l: string}} kiosztasGyoker
 * @returns {Promise<string>} 43 jel
 */
export async function lancGyokerKetGyokerbol(naploGyoker, kiosztasGyoker) {
  return lenyomat(['G', naploGyoker.l, kiosztasGyoker.l]);
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

/** A kiosztás-fa gyökere az állásból. */
async function kiosztasGyokere(pontok) {
  return allapotGyokere(await kiosztasFaja(pontok));
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
    lancGyoker: await lancGyokerKetGyokerbol(naploGyoker, kiosztasGyoker)
  };
}

/**
 * A lánc-gyökér a szerző 1..k-1 sorszámú eseményeiből — a k-adik eseményhez. Gyorsítótár nélkül.
 * @returns {Promise<string|null>} null, ha a lánc nem ép
 */
export async function lancGyokerLancbol(elozmenyek) {
  return (await lancAllapotaLancbol(elozmenyek))?.lancGyoker ?? null;
}

// ===================================
// A GYORSÍTÓTÁRAS ÚT — a szerző minden új eseményénél
// ===================================

// tár → (szerző → állapot): a folyamaton belüli emlékezet.
const memoria = new WeakMap();

const uresAllapot = (szerzo) => ({
  szerzo, sorszam: 0, utolso: null, naplo: ujNaplo(NAPLO_FAJTA),
  osszeg: 0, pontok: new Map(), kiosztasGyoker: null
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
    kiosztasGyoker: adat.kiosztasGyoker };
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
  const kesz = {
    szerzo, sorszam: meddig, utolso, naplo: uj, osszeg: allas.osszeg, pontok,
    kiosztasGyoker: pontValtozott ? await kiosztasGyokere(pontok) : a.kiosztasGyoker
  };

  tarbeli.set(szerzo, kesz);
  if (tarolo && meddig !== indulo) {
    await tarolo.ir(await fajlba(kesz)).catch((hiba) =>
      console.warn('lancGyoker - a gyorsítótár nem írható (nem baj, a lánc pótolja)', { hiba: hiba.message }));
  }
  return kesz;
}

/**
 * ⭐ A LÁNC-GYÖKÉR EGY ÚJ SAJÁT ESEMÉNYHEZ — a `sorszam`-adik eseményhez (az 1..sorszam-1 állapota).
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} szerzo
 * @param {number} sorszam - az új esemény sorszáma (a lánc vége + 1)
 * @param {Object} [tarolo] - a gyorsítótár fájlja (`lancTarolo`); nélküle csak a memória
 * @returns {Promise<string|null>} 43 jel, vagy null, ha a saját lánc nem ép
 */
export async function lancGyokerUjEsemenyhez(tar, koino, szerzo, sorszam, tarolo = null) {
  const a = await allapotIg(tar, koino, szerzo, sorszam - 1, tarolo);
  if (!a) return null;
  return lancGyokerKetGyokerbol(await naploCsucsGyokere(a.naplo), a.kiosztasGyoker);
}
