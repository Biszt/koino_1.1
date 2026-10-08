// koino/js/csere/cimjegyzek.js

// Felelősség: A CÍMJEGYZÉK (G — D84/2, D90, D91): „mi kinél van" — a hash-elhelyezés tiszta számításai.
// Hálózatot NEM nyit (1. szabály): a téma és a gyökér-darab számítása; hogy mi viszi a DHT-ra, az a hívóé.
//
// ===== A DÖNTÉS (D91, Csaba, 2026-10-03) =====
//
// ⭐ A „mi kinél van" FŐ ÚTJA a FA és a RAJ (a skálázási terv 4.2): a tartók a szelet cseréjekor egymás
// készülék-azonosítóját adják át, a szülő tartói a gyerekekét is — a böngészés a fa bejárása, a titkosított
// cserén belül. ⭐ A HASH-ELHELYEZÉS CSAK KÉT HELYEN: a GYÖKÉR DARABJAI (D90 — a legfelső szintnek nincs
// szülője) és a KÖZVETLEN KERESÉS azonosító alapján (gyorsító, elhagyható). A közege most a BitTorrent-DHT
// (BEP 5) VAKÍTOTT témával: a téma a koinó azonosítójával sózott lenyomat — aki nem ismeri a koinót, nem tudja
// kiszámolni, hol keresse (a Hyperswarm mintája; D89/2: a zárt koinó címjegyzéke nem olvasható ki).
//
// ⚠️ A cím NÉV NÉLKÜL (SK2, D6), bizalom nem jár vele (3. szabály — a hamis cím elérhetetlenséget okoz,
// nem hamisítást), és CSAK a vállalt szeletet hirdetjük, a megnézettet soha (D75/3).
//
// Használják: koino.js (a hirdetés és a keresés), a mérések, a próbák.

import { createHash } from 'node:crypto';

/** A téma fajtái: egy szelet közvetlen keresése, vagy a gyökér egy darabja. */
export const TEMA_FAJTAK = ['szelet', 'gyoker', 'kopogtato'];

/**
 * A VAKÍTOTT TÉMA — 20 bájt (a BEP 5 `info_hash` mérete): `H("koino-cimjegyzek-1" ‖ koinó ‖ fajta ‖ kulcs)`.
 * ⭐ A koinó azonosítója a só: kívülálló nem tudja kiszámolni (a zárt koinó a titkosított csere óta nem adja
 * ki), a DHT-gépek csak egy értelmezhetetlen lenyomatot látnak.
 *
 * @param {string} koino
 * @param {'szelet'|'gyoker'} fajta
 * @param {string|number} kulcs - a szelet azonosítója, vagy a gyökér-darab sorszáma
 * @returns {Buffer} 20 bájt
 */
export function cimjegyzekTema(koino, fajta, kulcs) {
  if (!TEMA_FAJTAK.includes(fajta)) throw new Error('ismeretlen téma-fajta: ' + fajta);
  return createHash('sha256').update('koino-cimjegyzek-1').update('|').update(String(koino)).update('|')
    .update(fajta).update('|').update(String(kulcs)).digest().subarray(0, 20);
}

/**
 * A GYÖKÉR-DARAB (D90): egy legfelső szintű gondolat melyik darabba esik — az azonosítója lenyomatának első
 * `bitek` bitje. Mindenki ugyanígy számolja (bárki tudja, ki tudhatja — D84/2).
 *
 * @param {string} azonosito
 * @param {number} bitek - 0..16 (2^bitek darab)
 * @returns {number}
 */
export function gyokerDarabja(azonosito, bitek) {
  if (!Number.isInteger(bitek) || bitek < 0 || bitek > 16) throw new Error('a darab-bitek 0 és 16 között');
  if (bitek === 0) return 0;
  const h = createHash('sha256').update('koino-gyoker-darab-1').update(String(azonosito)).digest();
  return h.readUInt16BE(0) >> (16 - bitek);
}

/**
 * Egy készülék melyik gyökér-darabokért felel — a tábla-aláírójából, `darab` egymást követő darab (a
 * példányszám így a készülékek számából jön: N készülék, 2^bitek darab → darabonként N·darab / 2^bitek).
 *
 * @param {string} alairo - a tábla-kulcs aláírója (a készülék neve, nem az azonosság — D6)
 * @param {number} bitek
 * @param {number} [darab]
 * @returns {Array<number>}
 */
export function sajatGyokerDarabjai(alairo, bitek, darab = 1) {
  const kezdo = gyokerDarabja('keszulek|' + alairo, bitek);
  const osszes = 2 ** bitek;
  const ki = [];
  for (let i = 0; i < Math.min(darab, osszes); i++) ki.push((kezdo + i) % osszes);
  return ki;
}

// ===================================
// ⭐⭐ D95/4: A GYÖKÉR DARABJAI A CSERÉBEN
// ===================================
//
// A gyökér (a legfelső szintű gondolatok születése) nem egészében cserélődik, hanem darabonként: egy darab „szeletként”
// megy a vonalon. A KULCSA egy felismerhető, 43 jeles (a vonal kulcs-mintájának megfelelő) szöveg — 34 nulla, egy `g`,
// a mélység (2 hex), a darab (4 hex) és két nulla —, amit egyetlen esemény azonosítója sem vehet fel (egy lenyomat nem
// kezdődik 34 nullával), és amiből bárki visszafejti, mit jelent: a halmazát bárki kiszámolja a saját tárából (a gyökérhez
// bejelentett születések közül a darabba esők). ⭐ A készülék a saját darabjában a mélysége ±1 szintjén vesz részt — a
// mélységet ki-ki a maga tudásából becsli, és a szomszédos becslésűek így is találkoznak (a darabok egymásba ágyazottak:
// a mélyebb darab a sekélyebb fele).

const DARAB_ELOTAG = '0'.repeat(34) + 'g';
const DARAB_MINTA = /^0{34}g([0-9a-f]{2})([0-9a-f]{4})00$/;

/** Egy gyökér-darab kulcsa a vonalon. */
export function gyokerDarabKulcsa(melyseg, darab) {
  if (!Number.isInteger(melyseg) || melyseg < 0 || melyseg > 16) throw new Error('a mélység 0 és 16 között');
  if (!Number.isInteger(darab) || darab < 0 || darab >= 2 ** melyseg) throw new Error('a darab 0 és 2^mélység között');
  return DARAB_ELOTAG + melyseg.toString(16).padStart(2, '0') + darab.toString(16).padStart(4, '0') + '00';
}

/** A kulcsból a mélység és a darab — vagy null, ha nem gyökér-darab kulcs (vagy érvénytelen). */
export function gyokerDarabBol(kulcs) {
  const t = typeof kulcs === 'string' ? DARAB_MINTA.exec(kulcs) : null;
  if (!t) return null;
  const melyseg = parseInt(t[1], 16);
  const darab = parseInt(t[2], 16);
  if (melyseg > 16 || darab >= 2 ** melyseg) return null;
  return { melyseg, darab };
}

/** Beleesik-e egy azonosító egy darabba (a 16 bites darab-számából — egy lenyomat, minden mélységre). */
export function darabbaEsik(azonosito16, melyseg, darab) {
  return (azonosito16 >> (16 - melyseg)) === darab;
}

/**
 * ⭐ A GYÖKÉR MÉLYSÉGÉNEK BECSLÉSE a szeletelt világban: a szigorú (b) alatt senki nem látja az egész gyökeret, csak a
 * darabjait. Minden s mélységen a becslés: a SAJÁT s-mélységű darabomban ismert születések × 2^s — ahol a darabot egészében
 * ismerem, ez a teljes szám becslése; sekélyebben (ahol csak a darabomat ismerem) kisebb. Ezért a MAXIMUM, azokon a
 * mélységeken, ahol legalább fél darabnyi adat van (különben a zaj vinné el); ha egyiken sincs, az ismert születések
 * száma. Ha mindent tud (a mai csere), a becslés ~ maga a születések száma. ⚠️ Két gép becslése eltérhet — a részvétel
 * ezért ±1 mélységű.
 *
 * @param {Array<number>} szuletesek16 - az ismert gyökér-születések 16 bites darab-száma (`gyokerDarabja(az, 16)`)
 * @param {number} sajat16 - a készülék 16 bites darab-száma (`gyokerDarabja('keszulek|' + aláíró, 16)`)
 * @param {number} [cel]
 * @returns {{melyseg: number, becsles: number}}
 */
export function gyokerMelysegBecslese(szuletesek16, sajat16, cel = GYOKER_DARAB_CEL) {
  const lista = Array.isArray(szuletesek16) ? szuletesek16 : [];
  const c = Number.isFinite(cel) && cel > 0 ? cel : GYOKER_DARAB_CEL;
  let becsles = lista.length;
  for (let s = 1; s <= 16; s++) {
    const darabban = lista.filter((x) => darabbaEsik(x, s, sajat16 >> (16 - s))).length;
    if (darabban < c / 2) break;                 // mélyebben már csak kevesebb lesz
    becsles = Math.max(becsles, darabban * 2 ** s);
  }
  return { melyseg: gyokerMelysege(becsles, c), becsles };
}

/**
 * A készülék gyökér-darabjainak kulcsai: a saját darabja a mélysége −1, 0, +1 szintjén (0 és 16 között).
 * @param {string} alairo - a tábla-kulcs aláírója
 * @param {number} melyseg
 * @returns {Array<string>}
 */
export function gyokerDarabKulcsai(alairo, melyseg) {
  const ki = [];
  for (let m = Math.max(melyseg - 1, 0); m <= Math.min(melyseg + 1, 16); m++) {
    ki.push(gyokerDarabKulcsa(m, sajatGyokerDarabjai(alairo, m, 1)[0]));
  }
  return ki;
}

// ===================================
// ⭐⭐ D91/3 (Csaba, 2026-10-03, az 58. mérés után): MIT HIRDET EGY KÉSZÜLÉK
// ===================================
//
// Az 58. mérés: a BitTorrent-DHT a hirdetést 30–60 perc alatt elfelejti — egy téma ~20 percenként ismételve
// ~0,65 MB/nap. Ezért: (1) MINDEN készülék a saját GYÖKÉR-DARABJÁT hirdeti (egy téma — a csere forgalmának
// töredéke); (2) a SZELETENKÉNTI hirdetés csak KÉSZÜLÉKENKÉNTI beállítással (alapból 0 — egy PC, amelyiknek nem
// számít a forgalom, néhányat hirdethet; egy telefonon 100 szelet ~65 MB/nap volna); (3) keresni bárki kereshet,
// igény szerint (~3 KB).

/** A hirdetés ismétlésének üteme — a háló 30–60 perc alatt felejt (58. mérés). */
export const HIRDETES_KOZ = 20 * 60 * 1000;

/** Egy gyökér-darabba nagyjából ennyi legfelső szintű gondolat essen. */
export const GYOKER_DARAB_CEL = 256;

/**
 * ⭐ A GYÖKÉR-DARAB MÉLYSÉGE a legfelső szintű gondolatok számából: annyi bit, hogy egy darabba ~`GYOKER_DARAB_CEL`
 * jusson. Kis koinóban 0 („az egész gyökér egy darab”), és logaritmikusan nő (a „végtelen”: egy darab mérete nem
 * nő a koinóval). ⚠️ A kereső ugyanabból az adatból ugyanazt számolja; ha nem talál, a szomszédos mélységet
 * próbálja (a becslés két gépen eltérhet).
 * @param {number} legfelsoDarab
 * @returns {number} 0..16
 */
export function gyokerMelysege(legfelsoDarab, cel = GYOKER_DARAB_CEL) {
  const n = Number.isFinite(legfelsoDarab) && legfelsoDarab > 0 ? legfelsoDarab : 0;
  const c = Number.isFinite(cel) && cel > 0 ? cel : GYOKER_DARAB_CEL;
  if (n <= c) return 0;
  return Math.min(16, Math.ceil(Math.log2(n / c)));
}

/** Egy gyökér-darab témája (a mélység is benne van — más mélység, más téma). */
export function gyokerDarabTemaja(koino, melyseg, darab) {
  return cimjegyzekTema(koino, 'gyoker', melyseg + ':' + darab);
}

/**
 * ⭐ A HIRDETENDŐ TÉMÁK: a saját gyökér-darabom (mindig), és a vállalt szeleteim közül legfeljebb
 * `szeletHirdetes` darab (a hívó sorrendjében — elöl a legfontosabb). ⛔ Csak vállalt szelet (a megnézett soha).
 *
 * @param {Object} b
 * @param {string} b.koino
 * @param {string} b.alairo - a tábla-kulcs aláírója (a készülék neve, nem az azonosság — D6)
 * @param {number} b.legfelsoDarab - a legfelső szintű gondolatok száma (a mélységhez)
 * @param {Array<string>} [b.vallaltSzeletek] - a vállalt szeletek, fontossági sorrendben
 * @param {number} [b.szeletHirdetes] - készülékenkénti beállítás (alapból 0)
 * @returns {Array<{fajta: string, kulcs: string, tema: Buffer}>}
 */
export function hirdetendoTemak({ koino, alairo, legfelsoDarab, vallaltSzeletek = [], szeletHirdetes = 0, melyseg: adott = null }) {
  // ⭐ D95/4: ha a hívó a mélységet a csere becsléséből adja (`gyokerMelysegBecslese`), azt használjuk — egy forrás.
  const melyseg = Number.isInteger(adott) ? adott : gyokerMelysege(legfelsoDarab);
  const [darab] = sajatGyokerDarabjai(alairo, melyseg, 1);
  const ki = [{ fajta: 'gyoker', kulcs: melyseg + ':' + darab, tema: gyokerDarabTemaja(koino, melyseg, darab) }];
  const db = Number.isInteger(szeletHirdetes) && szeletHirdetes > 0 ? szeletHirdetes : 0;
  for (const k of vallaltSzeletek.filter((x) => typeof x === 'string' && x !== '').slice(0, db)) {
    ki.push({ fajta: 'szelet', kulcs: k, tema: cimjegyzekTema(koino, 'szelet', k) });
  }
  return ki;
}

// ===================================
// ⭐⭐ D92/1 (b): A KOPOGTATÓ TÉMÁK — a randevú a DHT-n
// ===================================
//
// NAT mögött egy idegen kopogása nem jut át (36/d); ha viszont a tartó TUDJA, hogy valaki kér tőle, a következő
// buliban ő is kopog, és a rés megnyílik (60. mérés: T = 3 tartónál 20% → 76%). A „kérnek tőled” hír a DHT-n jut el:
// a kérő a BEP 5-tel bejelenti a CÍMÉT egy kopogtató témán, a tartó időnként ránéz. Két fajta téma:
//   · a KÉSZÜLÉKÉ — `kopogtato | keszulek:<tábla-aláíró>`: ha a kérő ismeri a tartót (a raj-jegyzékből);
//   · egy HIRDETETT TÉMA PÁRJA — `kopogtato | <fajta>:<kulcs>`: ha csak annyit tud, hogy a gyökér egy darabját (vagy
//     egy szeletet) valaki hirdeti — a DHT puszta címet ad, azonosítót nem. ⭐ Így egy új készülék is elér egy
//     gyökér-darab tartót, anélkül hogy tudná, ki az.
// A tartó a saját készülék-témáján és minden hirdetett témájának párján néz körül (~3 KB témánként, a hirdetés
// ütemében). ⚠️ A cím név nélküli, bizalom nem jár vele (3. szabály); aki ismeri a koinót és a témát, az látja, hány
// cím kopogtat (azt nem, mit kér — D92/1).

/** Egy készülék kopogtató témája (a tábla-aláírójából — a készülék neve, nem az azonosság, D6). */
export function keszulekKopogtatoTemaja(koino, alairo) {
  return cimjegyzekTema(koino, 'kopogtato', 'keszulek:' + alairo);
}

/** Egy hirdetett téma párja: ahol a hirdetőit kérni lehet (`fajta` 'gyoker' vagy 'szelet'). */
export function temaKopogtatoja(koino, fajta, kulcs) {
  if (fajta !== 'gyoker' && fajta !== 'szelet') throw new Error('ismeretlen hirdetett téma: ' + fajta);
  return cimjegyzekTema(koino, 'kopogtato', fajta + ':' + kulcs);
}

/**
 * Amit egy készülék figyel: a saját kopogtató témája és minden hirdetett témájának párja.
 * @param {Object} b
 * @param {string} b.koino
 * @param {string} b.alairo
 * @param {Array<{fajta: string, kulcs: string}>} b.hirdetett - `hirdetendoTemak` eredménye
 * @returns {Array<{fajta: string, kulcs: string, tema: Buffer}>}
 */
export function figyelendoKopogtatok({ koino, alairo, hirdetett = [] }) {
  const ki = [{ fajta: 'keszulek', kulcs: alairo, tema: keszulekKopogtatoTemaja(koino, alairo) }];
  for (const t of hirdetett) {
    if (t.fajta === 'gyoker' || t.fajta === 'szelet') ki.push({ fajta: t.fajta, kulcs: t.kulcs, tema: temaKopogtatoja(koino, t.fajta, t.kulcs) });
  }
  return ki;
}

