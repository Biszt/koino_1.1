// koino/js/csere/rajKor.js

// Felelősség: D97/2 — A RAJ A KÖRBEN (hálózat nélkül; a kör a `koino.js` őrjáratáé). A szigorú (b) alatt egy készülék
// csak a vállalt szeleteiben cserél, és egy véletlen kötés-társsal szinte nincs közös szelete (~n²/S) — a vállalt szeletek
// ezért a kötés-háló mentén nem frissülnének (69. mérés: a változások 0,3%-a ér el minden tartóhoz). Ezért az őrjárat
// körönként `RAJ_KOR_TARSAK` raj-társat is felkeres (a raj-jegyzékből — D91):
//
//   1. ⭐ a VÁLTOZOTT szeleteim tartóit — aki egy szeletben újat tud meg (kapta, vagy maga írta), annak tartóit sorra
//      (változásonként mindegyiket egyszer): egy csere a két fél ÖSSZES közös szeletét szinkronba hozza (D97/1), ezért ez
//      járványszerűen terjed (69. mérés: R = 2-vel medián 1, 99%-ban 9 kör alatt minden tartóhoz, 10 körön belül mindig);
//   2. aztán a FORGATÁS (a háttér-egyeztetés): a vállalt szeleteimen körben, szeletenként a tartók sorban — ami az 1.
//      ponton át elveszett volna, így is körbeér.
//
// ⚠️ Az átfedés szerinti választás („aki a legtöbb szeletemet tartja”) a mérésben rosszabb volt: szeletenként mindig
// ugyanazt adta, a tartók gráfja szétesett (a változások 4%-a soha nem ért körbe). Ezért itt a tartók SORBAN jönnek.
//
// Használja: koino.js (az őrjárat köre). Helyi állapot (memória), nem esemény, nem terjed.

import { szeletCimei } from './tarsak.js';

/** Körönként ennyi raj-társ (69. mérés: 2-vel 99%-ban 9 kör alatt minden tartóhoz). */
export const RAJ_KOR_TARSAK = 2;
/** Legfeljebb ennyi változott szeletet tartunk számon (a legrégebbi esik ki). */
export const VALTOZOTT_KORLAT = 256;

/** Az őrjárat raj-állapota (memória): a változott szeletek (→ hányadik tartónál tart), a forgatás helye, a mutatók. */
export function rajKorAllapot() {
  return { valtozott: new Map(), forgas: 0, mutatok: new Map(), sajatUtolso: null };
}

/**
 * A változott szeletek feljegyzése: aki egy szeletben újat tud meg. Ha a szelet már bent van, elölről indul (új változás:
 * a tartókat újra sorra vesszük); a legrégebbi esik ki a korlátnál.
 * @param {Object} allapot
 * @param {Iterable<string>} szeletek
 */
export function valtozottFeljegyzese(allapot, szeletek) {
  for (const s of szeletek) {
    if (typeof s !== 'string' || !s) continue;
    allapot.valtozott.delete(s);
    allapot.valtozott.set(s, 0);
  }
  while (allapot.valtozott.size > VALTOZOTT_KORLAT) allapot.valtozott.delete(allapot.valtozott.keys().next().value);
}

/**
 * A kör raj-céljai: előbb a változott szeletek tartói (sorban, változásonként egyszer), aztán a forgatás.
 * @param {Object} allapot - `rajKorAllapot`
 * @param {Object} b
 * @param {Iterable<string>} b.szeletek - a részvételem (az egészében tartott, vállalt szeletek)
 * @param {Array<Object>} b.jegyzek - a raj-jegyzék (`szeletcimek.json`)
 * @param {Function} [b.kizart] - (cél) → igaz, ha nem kell (én magam, vagy már a kör céljai közt)
 * @param {number} [b.R]
 * @param {number} [b.most]
 * @returns {Array<{hoszt: string, port: number, alairo: string|null, szelet: string, ok: 'valtozott'|'forgas'}>}
 */
export function rajKorCeljai(allapot, { szeletek, jegyzek, kizart = () => false, R = RAJ_KOR_TARSAK, most = Date.now() }) {
  const ki = [];
  const marVan = new Set();
  const felvesz = (c, s, ok) => {
    const k = c.alairo ?? (c.hoszt + ':' + c.port);
    if (marVan.has(k) || kizart(c)) return false;
    marVan.add(k);
    ki.push({ hoszt: c.hoszt, port: c.port, alairo: c.alairo ?? null, szelet: s, ok });
    return true;
  };
  // 1. A változott szeletek: a tartók sorban (változásonként mindegyik egyszer).
  for (const [s, i] of [...allapot.valtozott]) {
    if (ki.length >= R) break;
    const tartok = szeletCimei(jegyzek, s, most);
    let j = i;
    while (j < tartok.length && ki.length < R) { felvesz(tartok[j], s, 'valtozott'); j++; }
    if (j >= tartok.length) allapot.valtozott.delete(s); else allapot.valtozott.set(s, j);
  }
  // 2. A forgatás: a vállalt szeleteimen körben, szeletenként a tartók sorban.
  const sz = [...szeletek].sort();
  let n = 0;
  for (; n < sz.length && ki.length < R; n++) {
    const s = sz[(allapot.forgas + n) % sz.length];
    const tartok = szeletCimei(jegyzek, s, most);
    if (!tartok.length) continue;
    const m = allapot.mutatok.get(s) ?? 0;
    allapot.mutatok.set(s, m + 1);
    felvesz(tartok[m % tartok.length], s, 'forgas');
  }
  allapot.forgas = sz.length ? (allapot.forgas + n) % sz.length : 0;
  if (allapot.mutatok.size > 4 * VALTOZOTT_KORLAT) allapot.mutatok.clear();
  return ki;
}
