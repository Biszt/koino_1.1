// koino/js/tar/keresoMegujitas.js

// Felelősség: ⭐⭐ A KERESŐ-BEJEGYZÉS ALÁÍRT MEGÚJÍTÁSA ÉS A LEJÁRAT (D107 L3 (A), K5 — a kereső-réteg ④a; a ⑥ magja):
// tiszta számítás, hálózat nélkül.
//
// ⭐ Miért kell (L3): a bejegyzés puha állapot — 30 nap alatt elhalványul, ha senki nem újítja (K5); a tartók viszont a
// cserében egymásnak adják (③b), és egy aláíratlan „átvettem ekkor” időt egy hazug tartó a végtelenségig frissen tarthatna —
// a „temető” visszajönne. Ezért a lejárat egy ALÁÍRT megújításhoz kötött: a tulajdonos aláírja, és a bejegyzés az utolsó
// megújítása után 30 nappal lejár — BÁRKINÉL, akármelyik tartótól jött is.
//
// ===== AZ ALAK =====
//
// `m = { szerzo, ido, alairas }` — nem esemény (a szerző láncát nem növeli; a tábla-bejegyzés mintája). Az aláírás a koinóra,
// a gondolatra és a csomag eseményeinek azonosítóira szól az idővel — a fiók és az osztódás NÉLKÜL: egy aláírás a gondolat
// minden fiók-bejegyzését megújítja (egy cím ≤ 32 kulcs). Az aláíró a csomag egyik TULAJDONOSA (egy pont-esemény szerzője), a
// SZEMÉLYES kulcsával (`kulcsTar.js` — a kulcs a személyazonosság). ⛔ A tartó elveti: a nem tulajdonos aláírását, a hamisat,
// és a saját órájához képest egy napnál jövőbelit (különben egy előre dátumozott megújítás évekig élne).
//
// ⭐ A SOROS (K5: „néhány soros újít, nem mind”): a csomag tulajdonosainak sorrendje a gondolat és a tulajdonos lenyomatából
// (mindenki ugyanazt számolja); az első a bejegyzés 20. napján újít, a második a 25.-én (ha addig nem látszott megújítás),
// a többi nem — így a megújítás ára gondolatonként ~egy aláírás 30 naponként, és egy kieső soros sem halványítja el.
//
// Használják: keresoTar.js (a megújítás ellenőrzése, a lejárat), koino.js (a felajánló — ④c), a próbák
// (`keresoMegujitasProba.js`).

import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { kanonikusSzoveg, lenyomatSzinkron } from '../esemeny/kanonikusAlak.js';
import { azonositoAlaku } from '../esemeny/esemeny.js';

const NAP = 24 * 3600 * 1000;

/** A bejegyzés az utolsó megújítása (vagy a csomag legfrissebb eseménye) után ennyi ideig él (K5). */
export const MEGUJITAS_ELETTARTAM = 30 * NAP;

/** Ennyivel jövőbeli megújítást még elfogadunk (az órák eltérése). */
export const JOVO_TURES = NAP;

/** A soros tulajdonosok: az első ekkor újít, a második ekkor (a bejegyzés korában). */
export const SOROS_NAPOK = [20 * NAP, 25 * NAP];

/** Az aláírt üzenet — a fiók és az osztódás nélkül (egy aláírás a gondolat minden fiók-bejegyzésére). */
function megujitasUzenete({ koino, g, esemenyek, ido }) {
  const e = [...new Set(esemenyek.map((x) => (typeof x === 'string' ? x : x.azonosito)))].sort();
  return Buffer.from('koino-kereso-megujitas-1|' + kanonikusSzoveg({ koino, g, e, ido }), 'utf8');
}

/** A csomag tulajdonosai: a pozitív pont-események szerzői (rendezve). */
export function csomagTulajdonosai(esemenyek, g) {
  return [...new Set((esemenyek ?? []).filter((e) => e?.tipus === 'TudatpontRendezes' && e.adat?.entitas === g
    && Number.isInteger(e.adat?.pont) && e.adat.pont > 0).map((e) => e.szerzo))].sort();
}

/**
 * ⭐ A megújítás elkészítése (a tulajdonos készülékén).
 * @param {Object} privatJwk - a személyes kulcs titkos fele (`kulcsparLeirasa().privatKulcs`)
 * @param {string} szerzo - a személyes kulcs nyilvános fele (43 jel)
 * @param {{koino: string, g: string, esemenyek: Array<Object|string>, ido?: number}} b
 * @returns {{szerzo: string, ido: number, alairas: string}}
 */
export function megujitasKeszitese(privatJwk, szerzo, { koino, g, esemenyek, ido = Date.now() }) {
  const kulcs = createPrivateKey({ key: privatJwk, format: 'jwk' });
  const alairas = sign(null, megujitasUzenete({ koino, g, esemenyek, ido }), kulcs).toString('base64url');
  return { szerzo, ido, alairas };
}

/**
 * ⭐ A megújítás ellenőrzése (a tartónál): alak, az aláíró a csomag tulajdonosa, nem jövőbeli, és az aláírás az övé erre a
 * gondolatra és erre a csomagra.
 * @param {*} m
 * @param {{koino: string, g: string, esemenyek: Array<Object>, most?: number}} b
 * @returns {{rendben: boolean, ok?: string}}
 */
export function megujitasEllenorzese(m, { koino, g, esemenyek, most = Date.now() }) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return { rendben: false, ok: 'nem megújítás alakú' };
  if (!azonositoAlaku(m.szerzo) || !Number.isInteger(m.ido) || m.ido <= 0 || typeof m.alairas !== 'string'
    || m.alairas.length > 200 || Object.keys(m).length !== 3) {
    return { rendben: false, ok: 'nem megújítás alakú' };
  }
  if (!csomagTulajdonosai(esemenyek, g).includes(m.szerzo)) return { rendben: false, ok: 'a megújító nem a csomag tulajdonosa' };
  if (m.ido > most + JOVO_TURES) return { rendben: false, ok: 'a megújítás a jövőbe dátumozott' };
  try {
    const kulcs = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: m.szerzo }, format: 'jwk' });
    if (!verify(null, megujitasUzenete({ koino, g, esemenyek, ido: m.ido }), kulcs, Buffer.from(m.alairas, 'base64url'))) {
      return { rendben: false, ok: 'a megújítás aláírása nem az övé (vagy más csomagra szól)' };
    }
  } catch {
    return { rendben: false, ok: 'a megújítás aláírása nem ellenőrizhető' };
  }
  return { rendben: true };
}

/** A bejegyzés „ideje”: a megújítása, vagy ha nincs, a csomag legfrissebb eseménye. */
export function bejegyzesIdeje(b) {
  if (Number.isInteger(b?.m?.ido)) return b.m.ido;
  return Math.max(0, ...(b?.esemenyek ?? []).map((e) => (Number.isInteger(e?.ido) ? e.ido : 0)));
}

/** ⭐ A lejárat — bárkinél ugyanaz (a bejegyzésből számolva). */
export function bejegyzesLejarata(b) {
  return bejegyzesIdeje(b) + MEGUJITAS_ELETTARTAM;
}

/** Lejárt-e a bejegyzés (`most`-kor). */
export function lejartE(b, most = Date.now()) {
  return bejegyzesLejarata(b) <= most;
}

/**
 * ⭐ A SOROS: a csomag tulajdonosainak sorrendje a gondolat és a tulajdonos lenyomatából — mindenki ugyanazt számolja.
 * @returns {Array<string>}
 */
export function sorosRend(g, tulajdonosok) {
  return [...tulajdonosok].sort((a, b) => {
    const la = lenyomatSzinkron({ fajta: 'koino-kereso-soros-1', g, t: a });
    const lb = lenyomatSzinkron({ fajta: 'koino-kereso-soros-1', g, t: b });
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
}

/**
 * ⭐ Kell-e MOST megújítanom (én: `szerzo`) a gondolat bejegyzését? Ha a soros-rendben az i-edik vagyok, és a bejegyzés
 * (az utolsó ismert megújítása) legalább `SOROS_NAPOK[i]` idős; a soros-renden kívüli tulajdonos nem újít.
 * @param {{g: string, tulajdonosok: Array<string>, szerzo: string, utolso: number, most?: number}} b
 */
export function megujitaniKell({ g, tulajdonosok, szerzo, utolso, most = Date.now() }) {
  const i = sorosRend(g, tulajdonosok).indexOf(szerzo);
  if (i < 0 || i >= SOROS_NAPOK.length) return false;
  return most - (Number.isFinite(utolso) ? utolso : 0) >= SOROS_NAPOK[i];
}
