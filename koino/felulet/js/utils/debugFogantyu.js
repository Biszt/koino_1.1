// frontend/js/utils/debugFogantyu.js

// ===== FEJLESZTŐI (KONZOLOS) MÉRŐ-FOGANTYÚK — CSAK DEV-BEN =====
// Felelősség: a nézet belsejét kivezetni a böngésző-konzolra (mérésekhez,
// hibakereséshez) — DE KIZÁRÓLAG a fejlesztői környezetben.
//
// MIÉRT: éles oldalon (koino.hu) a `window._debug_*` fogantyúk fölöslegesen
// kivezetik a nézet belső állapotát és metódusait. Nem biztonsági rés (ugyanaz a
// böngésző-munkamenet, csak olvasás/kísérletezés), de fejlesztői állványzat, ami
// nem publikus felületre való.
//
// HOGYAN: a dev környezet a `localhost` (localhost:3000). A koino.hu ettől eltérő
// hostname-en fut, ezért ott a fogantyúk NEM jönnek létre. (Ha valaki a szerver
// gépén localhost:8080-on nézi az éleset, ott is látszik — de a PUBLIKUS koino.hu
// látogatói nem.)
//
// Használják: foOldal.js, SikidomModal.js.

const FEJLESZTOI = typeof location !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(location.hostname);

// @param {string} nev   - a globális név (pl. '_debug_sikidom')
// @param {*}      ertek - amit kivezetünk (általában a komponens `this`-e)
export function debugFogantyu(nev, ertek) {
  if (!FEJLESZTOI) return;
  window[nev] = ertek;
}
