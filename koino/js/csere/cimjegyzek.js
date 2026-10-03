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
export const TEMA_FAJTAK = ['szelet', 'gyoker'];

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
