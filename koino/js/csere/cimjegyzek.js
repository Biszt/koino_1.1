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
export function gyokerMelysege(legfelsoDarab) {
  const n = Number.isFinite(legfelsoDarab) && legfelsoDarab > 0 ? legfelsoDarab : 0;
  if (n <= GYOKER_DARAB_CEL) return 0;
  return Math.min(16, Math.ceil(Math.log2(n / GYOKER_DARAB_CEL)));
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
export function hirdetendoTemak({ koino, alairo, legfelsoDarab, vallaltSzeletek = [], szeletHirdetes = 0 }) {
  const melyseg = gyokerMelysege(legfelsoDarab);
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

