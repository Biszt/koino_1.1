// koino/js/csere/meghivo.js

// Felelősség: ⭐⭐ D121 — A MEGHÍVÓ SZÖVEGE ÉS AZ ELLENŐRZŐ KÓD (a meghívás a lapon: „két ember, két gomb, egy összevetett
// kód” — docs/meghivas_atvizsgalas.md). Tiszta számítás, hálózat nélkül (1. szabály).
//
// ⭐ A MEGHÍVÓ (MH1, MH2 (A)): egy sor — `koino-meghivo:1:<base64url(JSON)>` —, benne a koinó neve (`k`), a meghívó
// készülékének tábla-aláírója (`t` — a kopogtatáshoz, MH6, és hogy a belépő tudja, KIT keres: D71), a címei (`c`: [[hoszt,
// port], …] — a helyi hálózaton, és a nyilvános, ha a készülék tudja) és egy megnevezés (`n` — kényelem, nem ellenőrzött).
// Titok nincs benne: a koinó neve nem jogosít semmire (a zárt koinó tartalmát a tagság védi), a címek a cserében úgyis
// utaznak. Bármilyen csatornán — üzenetben, papíron is — átvihető (4. szabály: a kézi út maga a szöveg).
//
// ⛔ A BEOLVASÁS a kívülről jött szöveget úgy kezeli, mint a kapu az eseményt: alak, hossz, a nevek alakja, a címek határai —
// a hibás meghívóból semmi nem lesz (null és az ok). A beillesztett üzenet körülötte lévő szövege nem zavar (az előtagtól
// olvasunk), és ha egy csatorna a sort tördelte, a szóközök kihagyásával is megpróbáljuk.
//
// ⭐ AZ ELLENŐRZŐ KÓD (MH3 (A)): a belépés horgonyának lenyomatából 6 jel a Crockford-féle 32 jeles ábécéből (nincs benne I,
// L, O, U — kimondva nem téveszthető), két hármas csoportban („4F7-KQ2”). Mindkét lap ugyanazt számolja; a meghívó csak azt
// hívja meg, akinek a kódját a belépő élőben bemondta — a meghívó szöveg idegenhez jutva sem ad tagságot (az idegen kódja más,
// és a valódiét előre nem tudhatja). A védelem itt is az ember, nem a kapu (D56: az 1. lépcső olcsó).
//
// Használják: koino.js (a lap és a parancsok), a próbák.

import { createHash } from 'node:crypto';
import { azonositoAlaku } from '../esemeny/esemeny.js';

export const MEGHIVO_ELOTAG = 'koino-meghivo:1:';
/** A meghívó szöveg felső határa (jelben) — egy üzenetben, papíron is átvihető. */
export const MEGHIVO_KORLAT = 2048;
/** Legfeljebb ennyi cím egy meghívóban (a helyi címek és a nyilvános). */
export const MEGHIVO_CIM_KORLAT = 8;
const NEV_KORLAT = 64;
const HOSZT_MINTA = /^[A-Za-z0-9.:%_-]{1,64}$/;
const KOD_ABECE = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// ===== A CÍMEK ÉS A MEGNEVEZÉS ALAKJA =====

function cimAlakja(c) {
  const hoszt = Array.isArray(c) ? c[0] : c?.hoszt;
  const port = Number(Array.isArray(c) ? c[1] : c?.port);
  if (typeof hoszt !== 'string' || !HOSZT_MINTA.test(hoszt)) return null;
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
  return [hoszt, port];
}

function nevAlakja(n) {
  if (typeof n !== 'string') return null;
  const tiszta = [...n.replace(/\p{Cc}/gu, ' ').trim()].slice(0, NEV_KORLAT).join('').trim();
  return tiszta || null;
}

// ===== A MEGHÍVÓ KÉSZÍTÉSE =====

/**
 * A meghívó szöveg — a koinó nevével, a meghívó készülékének tábla-aláírójával, a címeivel (a rossz alakú és az ismételt
 * kimarad, legfeljebb `MEGHIVO_CIM_KORLAT`) és egy megnevezéssel.
 * @param {{koino: string, alairo: string, cimek?: Array<{hoszt: string, port: number}|[string, number]>, nev?: string}} m
 * @returns {string}
 */
export function meghivoKeszitese({ koino, alairo, cimek = [], nev = null }) {
  if (!azonositoAlaku(koino)) throw new Error('A meghívó koinója egy 43 jeles név.');
  if (!azonositoAlaku(alairo)) throw new Error('A meghívó készülékének tábla-aláírója egy 43 jeles kulcs.');
  const c = [];
  for (const x of cimek) {
    const a = cimAlakja(x);
    if (a && !c.some((y) => y[0] === a[0] && y[1] === a[1])) c.push(a);
    if (c.length >= MEGHIVO_CIM_KORLAT) break;
  }
  const n = nevAlakja(nev);
  return MEGHIVO_ELOTAG + Buffer.from(JSON.stringify({ k: koino, t: alairo, c, ...(n ? { n } : {}) }), 'utf8').toString('base64url');
}

// ===== A MEGHÍVÓ BEOLVASÁSA =====

/** Van-e a szövegben meghívó (az előtagja)? — a lap ebből tudja, hogy nem egy puszta koinó-nevet illesztettek be. */
export function meghivoE(szoveg) {
  return typeof szoveg === 'string' && szoveg.includes(MEGHIVO_ELOTAG);
}

function torzsOlvasasa(torzs) {
  if (!torzs || !/^[A-Za-z0-9_-]+$/.test(torzs)) return { hiba: 'a meghívó nem ép (a jelei)' };
  let j;
  try { j = JSON.parse(Buffer.from(torzs, 'base64url').toString('utf8')); } catch { return { hiba: 'a meghívó nem ép (a tartalma)' }; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { hiba: 'a meghívó nem ép (a tartalma)' };
  if (!azonositoAlaku(j.k)) return { hiba: 'a meghívó koinója nem egy 43 jeles név' };
  if (!azonositoAlaku(j.t)) return { hiba: 'a meghívó készülékének kulcsa nem ép' };
  if (!Array.isArray(j.c) || j.c.length > MEGHIVO_CIM_KORLAT) return { hiba: 'a meghívó címei nem épek' };
  const cimek = [];
  for (const x of j.c) {
    const a = Array.isArray(x) && x.length === 2 ? cimAlakja(x) : null;
    if (!a) return { hiba: 'a meghívó egyik címe nem ép' };
    cimek.push({ hoszt: a[0], port: a[1] });
  }
  if (j.n !== undefined && typeof j.n !== 'string') return { hiba: 'a meghívó megnevezése nem ép' };
  return { meghivo: { koino: j.k, alairo: j.t, cimek, nev: nevAlakja(j.n) } };
}

/**
 * A meghívó beolvasása egy beillesztett szövegből (a körülötte lévő szöveg nem zavar).
 * @returns {{meghivo: {koino: string, alairo: string, cimek: Array<{hoszt: string, port: number}>, nev: string|null}}|{hiba: string}}
 */
export function meghivoOlvasasa(szoveg) {
  if (typeof szoveg !== 'string') return { hiba: 'nincs meghívó' };
  const i = szoveg.indexOf(MEGHIVO_ELOTAG);
  if (i < 0) return { hiba: 'ez nem koino-meghívó (a „' + MEGHIVO_ELOTAG + '” előtag hiányzik)' };
  const maradek = szoveg.slice(i + MEGHIVO_ELOTAG.length, i + MEGHIVO_ELOTAG.length + MEGHIVO_KORLAT + 256);
  // Előbb a megszakítás nélküli rész; ha az nem ép, a szóközök (egy tördelő csatorna sortörései) kihagyásával.
  const egyben = maradek.match(/^[A-Za-z0-9_-]*/)[0];
  if (egyben.length + MEGHIVO_ELOTAG.length > MEGHIVO_KORLAT) return { hiba: 'a meghívó túl hosszú' };
  const elso = torzsOlvasasa(egyben);
  if (elso.meghivo) return elso;
  const tordelt = maradek.match(/^[A-Za-z0-9_\s-]*/)[0].replace(/\s+/g, '');
  if (tordelt !== egyben && tordelt.length + MEGHIVO_ELOTAG.length <= MEGHIVO_KORLAT) {
    const masodik = torzsOlvasasa(tordelt);
    if (masodik.meghivo) return masodik;
  }
  return elso;
}

// ===== AZ ELLENŐRZŐ KÓD =====

/**
 * A belépés horgonyának ellenőrző kódja — 6 jel, két hármas csoportban (pl. „4F7-KQ2”); null, ha a horgony nem azonosító alakú.
 * @param {string} horgony - a belépés (`Belepes`) azonosítója
 * @returns {string|null}
 */
export function ellenorzoKod(horgony) {
  if (!azonositoAlaku(horgony)) return null;
  const h = createHash('sha256').update('koino-ellenorzo-kod-1|').update(horgony).digest();
  // az első 30 bit, 5 bitenként
  let bitek = 0n;
  for (let i = 0; i < 4; i++) bitek = (bitek << 8n) | BigInt(h[i]);
  bitek >>= 2n;
  let kod = '';
  for (let i = 5; i >= 0; i--) kod += KOD_ABECE[Number((bitek >> BigInt(i * 5)) & 31n)];
  return kod.slice(0, 3) + '-' + kod.slice(3);
}
