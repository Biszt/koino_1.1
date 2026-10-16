// koino/js/csere/keresoReteg.js

// Felelősség: ⭐⭐ A KERESŐ-RÉTEG TISZTA SZÁMÍTÁSAI (D105 — a D101 ⑦ ② lépése, 2026-10-16): a cím szavai, a fiók-kulcsok
// (K2 (C)), a fiók osztódása (K7), a fiókok helye és a készülék régiója (a gyökér-darab mintája — `cimjegyzek.js`, D106:
// 144 bit). Hálózatot NEM nyit (1. szabály): hogy mi viszi a DHT-ra és ki tartja, a ③–⑤ dolga.
//
// ===== A DÖNTÉSEK (D105, Csaba, 2026-10-15; a 75. mérés, 2026-10-16) =====
//
// ⭐ A keresés CÍM szerinti (skálázási terv 5.1): a bejegyzés SZÁMÍTOTT, nem kimondott — aki ismeri a gondolatot, ugyanazt
// a kulcsot számolja, és a tartó maga ellenőrzi, hogy a cím tényleg tartalmazza a szót (hamisítani nem lehet, csak
// elhallgatni — azt a több tartó egyesítése fogja meg).
//
// ⭐ K2 (C): minden szó KÉT kulcs alatt — az egész szó (`e:`) és az első négy betűje (`p:`) —, mert a magyar toldalékol: a
// „park” így találja a „parkban”-t (a 75. mérés: a „legalább 10 találat” 47–72% helyett 91–96%). A négyjeles szó csak a
// szóeleje alatt (a szűrővel ugyanazt adja), a háromjeles csak egészében, a rövidebb sehol (a „a”, „az”, „és”). Szótár és
// nyelvtani értelmezés NINCS (5.1): a szó a betűk és számjegyek egybefüggő sora, NFC-normalizálva, kisbetűsítve —
// ékezet-összevonás sincs (az „á” nem „a”; a helyi keresés sem vonja össze). A hosszt jelekben (kódpontokban) mérjük.
//
// ⭐ K7: a túl nagy fiók (> `KERESO_FIOK_CEL` = 256 bejegyzés) a gondolat SAJÁT lenyomata szerint 2^s darabra oszlik, és a
// darabok más-más helyre esnek (a 75. mérés: osztódás nélkül a „nem” fiókja egymillió gondolatnál ~31 MB egy készüléken,
// vele ~1,4 MB a legtöbbet tartónál). A gondolat darabja egymásba ágyazott: ha a fiók mélyebbre oszlik, a gondolat a régi
// darabja egyik felébe kerül. A gyakori szóra a kérdés mintát kap, a ritkára teljeset.
//
// ⭐ A régiók: egy fiók (vagy a darabja) helye a lenyomat-térben; egy készülék a saját régióját tartja (a tábla-aláírójából,
// a gyökér-darabjától FÜGGETLEN helyen — más só), m mélységen ~`KERESO_REGIO_CEL` = 512 bejegyzéssel, a ±1 szinten. A régió
// kulcsa a gyökér-darab kulcsának alakja `k` jellel; a DHT-témája vakított (a koinó a só — D91).
//
// ⚠️ Egy cím legfeljebb `CIM_KULCS_KORLAT` kulcsot ad (az elejéről): egy felajánlás ára így korlátos (9. szabály), és egy
// hosszú, „mindent bele” cím sem írhat sok fiókba.
//
// Használják: (a ③–⑤-től) koino.js és a vonal; a próbák (`keresoProba.js`).

import {
  darabLenyomata, lenyomatDarabja, darabKulcsa, darabKulcsBol, darabbaEsik, melysegBecslese, keszulekDarabjai,
  keszulekDarabKulcsai, cimjegyzekTema, DARAB_MAX_MELYSEG
} from './cimjegyzek.js';

// ===================================
// AZ ÁLLANDÓK
// ===================================

/** A legrövidebb indexelt szó (jelben) — a rövidebb („a”, „az”, „és”) nem kerül indexbe. */
export const SZO_MIN = 3;

/** ⭐ K2 (C): a szóeleje-kulcs hossza (jelben). */
export const SZOELEJE = 4;

/** Egy cím legfeljebb ennyi kulcsot ad (az elejéről) — a felajánlás ára korlátos. */
export const CIM_KULCS_KORLAT = 32;

/** ⭐ K7: a fiók e fölött osztódik (B — a 75. mérés: kisebbel a teher simább, de a teljesség romlik). */
export const KERESO_FIOK_CEL = 256;

/** Egy régióba (m mélységen) nagyjából ennyi bejegyzés essen (T — a készülék a ±1 legszélesebbjét, ~2T-t tartja). */
export const KERESO_REGIO_CEL = 512;

/** A kereső-réteg régió-kulcsának jele (a gyökér-darabé `g`). */
export const KERESO_JEL = 'k';

/** A kereshető entitások: a címet viselő születések (`GondolatLetrehozas` — a gondolat, a kategória, a gondolattípus). */
export const KERESHETO_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];

const SO_FIOK = 'koino-kereso-fiok-1';
const SO_GONDOLAT = 'koino-kereso-gondolat-1';
const SO_KESZULEK = 'koino-kereso-regio-1';

// ===================================
// A SZAVAK ÉS A KULCSOK (K2 (C))
// ===================================

/**
 * A szöveg (cím vagy kérdés) szavai: NFC, kisbetű, a betűk, a hozzájuk tartozó jelek és a számjegyek egybefüggő sorai —
 * ismétlés nélkül, a sorrendjükben.
 * @param {string} szoveg
 * @returns {Array<string>}
 */
export function szavak(szoveg) {
  if (typeof szoveg !== 'string') return [];
  const ki = [];
  const lattuk = new Set();
  for (const m of szoveg.normalize('NFC').toLowerCase().normalize('NFC').matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
    if (lattuk.has(m[0])) continue;
    lattuk.add(m[0]);
    ki.push(m[0]);
  }
  return ki;
}

/** Egy szó hossza jelekben (kódpontokban — az „ő” egy jel). */
const jelek = (szo) => [...szo];

/**
 * ⭐ K2 (C): egy szó kulcsai — a háromjeles egészében (`e:`), a négyjeles a szóeleje alatt (`p:`), a hosszabb mindkettő
 * alatt; a rövidebb sehol.
 * @param {string} szo - egy szó (`szavak` kimenete)
 * @returns {Array<string>}
 */
export function szoKulcsai(szo) {
  const j = jelek(szo);
  if (j.length < SZO_MIN) return [];
  if (j.length < SZOELEJE) return ['e:' + szo];
  const eleje = 'p:' + j.slice(0, SZOELEJE).join('');
  return j.length === SZOELEJE ? [eleje] : ['e:' + szo, eleje];
}

/**
 * Egy cím kulcsai: a szavai kulcsai ismétlés nélkül, legfeljebb `CIM_KULCS_KORLAT` (a cím elejéről).
 * @param {string} cim
 * @returns {Array<string>}
 */
export function cimKulcsai(cim) {
  const ki = [];
  const lattuk = new Set();
  for (const sz of szavak(cim)) {
    for (const k of szoKulcsai(sz)) {
      if (lattuk.has(k)) continue;
      if (ki.length >= CIM_KULCS_KORLAT) return ki;
      lattuk.add(k);
      ki.push(k);
    }
  }
  return ki;
}

/**
 * Egy KÉRDÉS fiókjai, szavanként: a ≥ 4 jeles szónál a szóeleje-fiók (a tartó a címekben a kérdezett szóelejére szűr), a
 * ≥ 5 jelesnél a pontos alak fiókja is; a háromjelesnél csak a pontos alak. A rövidebb szó nem kérdezhető (kimarad).
 * @param {string} kerdes
 * @returns {Array<{szo: string, kulcsok: Array<string>}>}
 */
export function kerdesFiokjai(kerdes) {
  return szavak(kerdes).map((szo) => ({ szo, kulcsok: szoKulcsai(szo) })).filter((x) => x.kulcsok.length);
}

/**
 * ⭐ A SZŰRŐ — a tartó helyben, a kérdező a találaton: illik-e a cím a kérdésre? Minden (kérdezhető) kérdés-szó a cím egy
 * szavának ELEJE: a „park” a „parkban”-ra illik, a „parkban” a „park”-ra nem; több szónál mindnek illenie kell.
 * @param {string} cim
 * @param {string} kerdes
 * @returns {boolean}
 */
export function cimIllik(cim, kerdes) {
  const k = kerdesFiokjai(kerdes).map((x) => x.szo);
  if (!k.length) return false;
  const c = szavak(cim);
  return k.every((q) => c.some((w) => w.startsWith(q)));
}

// ===================================
// A BEJEGYZÉS
// ===================================

/**
 * ⭐ Egy esemény bejegyzés-kulcsai: a címet viselő születés (`GondolatLetrehozas` — gondolat, kategória, gondolattípus)
 * címének kulcsai; minden másé üres. A tartó ezzel ellenőrzi, hogy egy felajánlott bejegyzés tényleg abba a fiókba
 * tartozik-e (a cím az aláírt eseményben van — a kulcsot ő maga számolja). ⚠️ A módosított cím (egy elfogadott
 * szerkesztési egyezmény) nem a születésben áll — hogy az hogyan jut a keresőbe, a ④ (a felajánlás) kérdése.
 * @param {Object} e
 * @returns {Array<string>}
 */
export function bejegyzesKulcsai(e) {
  if (e?.tipus !== 'GondolatLetrehozas' || typeof e.adat?.cim !== 'string') return [];
  if (!KERESHETO_TIPUSOK.includes(e.adat.tipus ?? 'Gondolat')) return [];
  return cimKulcsai(e.adat.cim);
}

// ===================================
// ⭐ K7: A FIÓK OSZTÓDÁSA
// ===================================

/**
 * Hány bitre oszlik egy `meret` bejegyzésű fiók (0: nem oszlik) — a darabok így várhatóan (B/2, B] méretűek.
 * @param {number} meret
 * @param {number} [cel]
 * @returns {number} 0..`DARAB_MAX_MELYSEG`
 */
export function osztodasMelysege(meret, cel = KERESO_FIOK_CEL) {
  if (!Number.isFinite(meret) || !Number.isFinite(cel) || cel <= 0 || meret <= cel) return 0;
  return Math.min(DARAB_MAX_MELYSEG, Math.ceil(Math.log2(meret / cel)));
}

/**
 * Egy gondolat melyik darabba esik egy `s` bitre osztódott fiókban — a SAJÁT lenyomata szerint (a fióktól független,
 * egymásba ágyazott: az s + 1 bites darabja az s bites felének egyike).
 * @param {string} azonosito
 * @param {number} s
 * @returns {bigint}
 */
export function fiokDarabja(azonosito, s) {
  return lenyomatDarabja(darabLenyomata(SO_GONDOLAT, azonosito), s);
}

/**
 * Egy fiók (vagy a darabja) neve — a helye ebből számolódik.
 * @param {string} kulcs - `e:…` vagy `p:…`
 * @param {number} [s] - az osztódás mélysége (0: maga a fiók)
 * @param {bigint|number} [darab]
 * @returns {string}
 */
export function fiokNeve(kulcs, s = 0, darab = 0n) {
  return s === 0 ? kulcs : kulcs + '#' + s + ':' + BigInt(darab).toString(16);
}

/**
 * ⭐ Egy fiók (vagy a darabja) HELYE a lenyomat-térben — a darabok egymástól független helyre esnek.
 * @param {string} kulcs
 * @param {number} [s]
 * @param {bigint|number} [darab]
 * @returns {bigint}
 */
export function fiokHelye(kulcs, s = 0, darab = 0n) {
  return darabLenyomata(SO_FIOK, fiokNeve(kulcs, s, darab));
}

/**
 * Egy gondolat bejegyzésének helye egy fiókban, ha a fiók `s` bitre osztódott.
 * @param {string} kulcs
 * @param {string} azonosito - a gondolat azonosítója
 * @param {number} [s]
 * @returns {bigint}
 */
export function bejegyzesHelye(kulcs, azonosito, s = 0) {
  return s === 0 ? fiokHelye(kulcs) : fiokHelye(kulcs, s, fiokDarabja(azonosito, s));
}

// ===================================
// A RÉGIÓK (a gyökér-darab mintája — D95/4, D106)
// ===================================

/**
 * A kereső-régió kulcsa a vonalon (a gyökér-darab kulcsának alakja, `k` jellel).
 * @param {number} melyseg
 * @param {bigint|number} darab
 * @returns {string}
 */
export function keresoRegioKulcsa(melyseg, darab) {
  return darabKulcsa(KERESO_JEL, melyseg, darab);
}

/**
 * A kulcsból a régió — vagy null, ha nem kereső-régió kulcs (a gyökér-darabé sem az).
 * @returns {{melyseg: number, darab: bigint}|null}
 */
export function keresoRegioBol(kulcs) {
  const d = darabKulcsBol(kulcs);
  return d && d.jel === KERESO_JEL ? { melyseg: d.melyseg, darab: d.darab } : null;
}

/** A készülék helye a kereső-réteg terében (a tábla-aláírójából; a gyökér-darabjától független). */
export function keszulekKeresoHelye(alairo) {
  return darabLenyomata(SO_KESZULEK, 'keszulek|' + alairo);
}

/** A készülék régiója `melyseg` mélységen (és ha kell, a következő `db − 1`). */
export function sajatKeresoRegioi(alairo, melyseg, db = 1) {
  return keszulekDarabjai(SO_KESZULEK, alairo, melyseg, db);
}

/** A készülék régióinak kulcsai a mélysége ±1 szintjén. */
export function keresoRegioKulcsai(alairo, melyseg) {
  return keszulekDarabKulcsai(SO_KESZULEK, KERESO_JEL, alairo, melyseg);
}

/** Beleesik-e egy hely (egy fiók vagy egy bejegyzés helye) egy régióba. */
export function regiobaEsik(hely, melyseg, darab) {
  return darabbaEsik(hely, melyseg, darab);
}

/**
 * A régió mélységének becslése a SAJÁT régióból (a nálam lévő bejegyzések helyéből — mint a gyökér-darabé).
 * @param {Array<bigint>} helyek - a nálam lévő bejegyzések helye (`bejegyzesHelye`)
 * @param {bigint} sajat - a készülék helye (`keszulekKeresoHelye`)
 * @param {number} [cel]
 * @returns {{melyseg: number, becsles: number}}
 */
export function keresoMelysegBecslese(helyek, sajat, cel = KERESO_REGIO_CEL) {
  return melysegBecslese(helyek, sajat, cel);
}

/** Egy kereső-régió témája a DHT-n — vakított: a koinó azonosítója a só (D91). */
export function keresoRegioTemaja(koino, melyseg, darab) {
  return cimjegyzekTema(koino, 'kereso', melyseg + ':' + darab);
}
