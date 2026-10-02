// koino/js/csere/szeletEgyeztetes.js

// Felelősség: MIT EGYEZTETÜNK SZELETENKÉNT (a C 7–8. pontja — a szeletelési terv 4.5) — hálózat
// nélkül. A párbeszéd (`vonal.js`) ezt kérdezi; a tartomány-egyeztetés (`tartomany.js`) ezeken a
// halmazokon fut.
//
// ===== AZ EGYEZTETETT HALMAZ =====
//
// Egy szelet halmaza = a szelet ALAKILAG ÉRVÉNYES eseményei (a 40. mérés tanulsága: amit a kapu
// nem enged be, azt nem hirdetjük — különben a társ minden körben elkérné és eldobná) + ⭐ a
// KÖZVETLEN GYEREKEI SZÜLETÉSE (a C 7. pontja, a gyerek-bejelentés): így a szülő köre megtudja,
// hogy új gondolat született — a szövege nélkül (D72). A legfelső szintű gondolatok születése a
// GYÖKÉRBEN hangzik el (a tárban a '' szülő; a vonalon a `GYOKER_KULCS`).
//
// ===== AZ ELSŐ SZINT: „szelet:lenyomat" PÁROK =====
//
// ⭐ A pár a szelet kulcsa ÉS a halmazának lenyomata. Aki egy tartomány listáját feldolgozza,
// a párokból MINDKÉT fél eltérő szeleteit megtudja (a kulcs benne van) — nem csak a sajátjait.
// ⚠️ A pár a kulcs szerint rendeződik (a kulcsok különböznek), tehát egy szelet két fél-beli párja
// mindig ugyanabba a tartományba esik: a feldolgozó mindkettőt látja.
//
// ⭐ A párokat gyorsítótárban tartjuk, a tár olcsó változat-jele szerint (`szeletValtozata`): egy
// szelet halmaza csak akkor számolódik újra, ha a szelet vagy a gyerekei születése bővült.
//
// Használja: csere/vonal.js (a párbeszéd), a próbák.

import { alakiHiba, szelet, bejelentesHelyei, azonositoAlaku } from '../esemeny/esemeny.js';
import { rendezettHalmaz, halmazLenyomata } from '../esemeny/halmaz.js';

/**
 * A gyökér kulcsa a vonalon (a tárban: ''). ⭐ Egy érvényes alakú, 43 jeles szöveg, amit egyetlen
 * esemény azonosítója sem vehet fel (az azonosító egy lenyomat).
 */
export const GYOKER_KULCS = '0'.repeat(43);

/** A vonal kulcsa → a tár kulcsa. */
export const tarKulcsa = (kulcs) => (kulcs === GYOKER_KULCS ? '' : kulcs);
/** A tár kulcsa → a vonal kulcsa. */
export const vonalKulcsa = (s) => (s === '' ? GYOKER_KULCS : s);

/**
 * Érvényes szelet-kulcs-e (a vonalról jött listák ellenőrzéséhez)? ⭐ D77: ugyanaz a minta, mint a
 * kapué (`azonositoAlaku`) — így ami a kapun átjut, annak a kulcsa a vonalon is kimondható.
 */
export const ervenyesKulcs = azonositoAlaku;

/**
 * Egy szelet egyeztetett halmazának ESEMÉNYEI: a szelet érvényes eseményei + a hozzá bejelentettek (a
 * gyerekei születése, a javaslatai, a rá szóló szavazatok — D85/1, D85/3, `bejelentesHelyei`).
 * @param {Object} tar
 * @param {string} koino
 * @param {string} kulcs - a vonal kulcsa (a gyökéré: `GYOKER_KULCS`)
 * @returns {Promise<Array<Object>>}
 */
export async function egyeztetettEsemenyek(tar, koino, kulcs) {
  const s = tarKulcsa(kulcs);
  const sajat = s === '' ? [] : await tar.szeletEsemenyei(s);
  const bejelentettek = await tar.bejelentesek(s);
  const lattuk = new Set();
  const ki = [];
  for (const e of [...sajat, ...bejelentettek]) {
    if (lattuk.has(e.azonosito) || e.koino !== koino || alakiHiba(e) !== null) continue;
    lattuk.add(e.azonosito);
    ki.push(e);
  }
  return ki;
}

/**
 * Egy szelet egyeztetett halmaza: a rendezett azonosítók.
 * @returns {Promise<Array<string>>}
 */
export async function egyeztetesiHalmaz(tar, koino, kulcs) {
  return rendezettHalmaz((await egyeztetettEsemenyek(tar, koino, kulcs)).map((e) => e.azonosito));
}

// tár → (kulcs → { valtozat, par })
const gyorsitotar = new WeakMap();

/**
 * Egy szelet párja: `kulcs:lenyomat` — vagy null, ha a halmaza üres (azt nem hirdetjük).
 * @returns {Promise<string|null>}
 */
export async function szeletPar(tar, koino, kulcs) {
  let tarbeli = gyorsitotar.get(tar);
  if (!tarbeli) { tarbeli = new Map(); gyorsitotar.set(tar, tarbeli); }
  const valtozat = koino + '|' + tar.szeletValtozata(tarKulcsa(kulcs));
  const kesz = tarbeli.get(kulcs);
  if (kesz && kesz.valtozat === valtozat) return kesz.par;
  const halmaz = await egyeztetesiHalmaz(tar, koino, kulcs);
  const par = halmaz.length ? kulcs + ':' + await halmazLenyomata(halmaz) : null;
  tarbeli.set(kulcs, { valtozat, par });
  return par;
}

/**
 * Az első szint halmaza: a résztvevő szeletek párjai, rendezve.
 * @param {Object} tar
 * @param {string} koino
 * @param {Function} [reszvesz] - (vonal-kulcs) → részt veszek-e ebben a szeletben. ⭐ (a): mind;
 *        a 9. ponttól (b): a saját érdeklődés.
 * @returns {Promise<Array<string>>}
 */
export async function szeletParok(tar, koino, reszvesz = () => true) {
  const parok = [];
  for (const { szelet: s } of await tar.szeletek()) {
    const kulcs = vonalKulcsa(s);
    // ⛔⛔ A KI NEM MONDHATÓ SZELET (2026-09-27, átnézés — mérve): egy kapun átjutott, nem 43 jeles
    // `entitas` vagy születés-`szulo` a társsal folytatott MINDEN cserét megakasztotta
    // (HIBAS-EGYEZTETES / „Hibás ELTERO”). ⭐ A szabály a KAPUBAN él (D77, `alakiHiba`), és innen
    // a 40. mérés elve tartja távol: egy régebbi programmal tárolt ilyen esemény alakilag hibás,
    // tehát a halmazába nem kerül be (`egyeztetettEsemenyek`) — az üres halmazú szeletet pedig nem
    // hirdetjük. *Egy szabály, egy helyen — egy második őr itt egy nap némán elcsúszna tőle.*
    if (!reszvesz(kulcs)) continue;
    const par = await szeletPar(tar, koino, kulcs);
    if (par) parok.push(par);
  }
  return rendezettHalmaz(parok);
}

/**
 * ⭐ A lista-feldolgozó lelete szeletekre fordítva: melyik szelet tér el MINDKÉT félnél (ott a
 * második szint dönt), melyik van CSAK NÁLAM, és melyik CSAK NÁLA (ott az egész szelet megy).
 *
 * @param {Array<string>} kellNekem - az ő párjai, amik nálam nincsenek
 * @param {Array<string>} kellNeki - az én párjaim, amik nála nincsenek
 * @returns {{mindketten: Array<string>, nalam: Array<string>, nalad: Array<string>}}
 */
export function elteresekSzeletei(kellNekem, kellNeki) {
  const nala = new Set(kellNekem.map((p) => p.slice(0, 43)));
  const nalam = new Set(kellNeki.map((p) => p.slice(0, 43)));
  return {
    mindketten: [...nalam].filter((k) => nala.has(k)).sort(),
    nalam: [...nalam].filter((k) => !nala.has(k)).sort(),
    nalad: [...nala].filter((k) => !nalam.has(k)).sort()
  };
}

/**
 * Egy beérkezett esemény a megengedett szeletek egyikébe tartozik-e — a saját szelete, vagy egy olyan
 * szelet szerint, ahová be van jelentve (születés, javaslat, szavazat — D85)? ⛔ Amit nem kértünk és nem
 * is közös szeletből jön, azt nem vesszük át (a (b)-ben ez tartja távol a mások érdeklődését a tárunktól).
 * @param {Object} e
 * @param {Set<string>} kulcsok - vonal-kulcsok
 */
export function szeletbeTartozik(e, kulcsok) {
  if (kulcsok.has(vonalKulcsa(szelet(e)))) return true;
  return bejelentesHelyei(e).some((k) => kulcsok.has(vonalKulcsa(k)));
}
