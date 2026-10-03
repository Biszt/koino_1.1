// koino/js/allapot/tagsag.js

// Felelősség: A TAGSÁG (1. lépcső) TISZTA SZÁMÍTÁSA (D56, D59, D93) — egy esemény-halmazból, SZINKRON, EGY HELYEN.
// A szabály-réteg (D93/1: a döntésben csak az ellenőrzött tag számít), a tagsági csomag (D93/2) ellenőrzése és az
// `identitas.js` tár-alapú kérdése (`tagE`) mind ezt hívja — egy szabály, egy forrás (a „két másolat” csapdája ellen).
//
// ===== A SZABÁLY =====
//
//   · ALAPÍTÓ (a rekurzió alapesete, mélység 0): a koinó létrehozója (a horgonya maga a `KoinoLetrehozas`), vagy akit a
//     létrehozás az `alapitok` közt megnevez, és a `Belepes`-e erre hivatkozik (`adat.alapitas`);
//   · TAG: a `Belepes`-e szeletében van egy ÉRVÉNYES meghívás egy TAGTÓL — a meghívás neki szól (`kit` = a horgony
//     szerzője), nem önmagáé, a meghívó horgonya (`sajatBelepes`) a meghívás szerzőjéé; ⭐ D93/5: ha a koinó profil-
//     mezőket vár, a meghívás megnevezi a profil lenyomatát, és a tagnak van ilyen `Profil` eseménye;
//   · ⭐ a LEGRÖVIDEBB lánc számít, és legfeljebb `MELYSEG_KORLAT` mély (D59, D93/2 — a „végtelen”: a bizonyíték így
//     felülről korlátos; a mélyen ülő becsületes tag egy közelebbi tag ingyenes meghívásával rövidít — 63. mérés).
//
// ⚠️ A hiány nem vád (D19): ha a lánc egy eseménye hiányzik, „nem ellenőrizhető”, nem „nem tag”. A kör nem szül tagságot.
//
// ===== A TAGSÁGI CSOMAG (D93/2) =====
//
// A tag a SAJÁT azonosság-szeletébe tesz egy aláírt csomagot a legrövidebb lánca eseményeinek másolatával az alapítóig
// (a D85 T3 döntési csomag mintája). A kapu ellenőrzi (`tagsagiCsomagEllenorzese`: minden belső esemény hiteles, egy
// koinóé, és a lánc ezen a szabályon tagságot ad), az index a tartalmát is beolvassa — így a tagság a lánc ősei
// szeleteinek tartása nélkül is számítható.
//
// Használják: a szabály-réteg (`szabalyok.js`), az `identitas.js`, a kapu (`esemenyTar.js`), a művelet-réteg (a
// csomag kiadása), a próbák.

import { esemenyEllenorzese, azonositoAlaku } from '../esemeny/esemeny.js';

/** A meghívási lánc legnagyobb mélysége (D59 biztonsági szelepe, D93/2: 64). */
export const MELYSEG_KORLAT = 64;
export const TAGSAGI_CSOMAG = 'TagsagiCsomag';
export const PROFIL = 'Profil';
/** Egy tagsági csomagban legfeljebb ennyi esemény (lépésenként a belépés, a meghívás, a profil + a gyökér). */
export const CSOMAG_ESEMENY_KORLAT = 3 * (MELYSEG_KORLAT + 1) + 2;

const LANC_TIPUSOK = new Set(['KoinoLetrehozas', 'Belepes', 'Meghivas', PROFIL]);

/**
 * A TAGSÁGI INDEX egy esemény-halmazból (egy koinóé): a horgonyok, a horgonyonkénti meghívások és profilok — a
 * tagsági csomagok TARTALMÁVAL együtt (azokat a kapu már ellenőrizte).
 * @param {Array<Object>} esemenyek
 * @param {string|null} [koino] - ha nincs megadva, az első `KoinoLetrehozas` koinója
 */
export function tagsagiIndex(esemenyek, koino = null) {
  const idx = { koino: null, koinoAzonosito: koino, horgonyok: new Map(), meghivasok: new Map(), profilok: new Map(),
    szerzoHorgonyai: new Map(), memo: new Map() };
  const lista = Array.isArray(esemenyek) ? esemenyek : [];
  if (!idx.koinoAzonosito) {
    const k = lista.find((e) => e?.tipus === 'KoinoLetrehozas')
      ?? lista.flatMap((e) => (e?.tipus === TAGSAGI_CSOMAG && Array.isArray(e.adat?.lanc) ? e.adat.lanc : []))
        .find((e) => e?.tipus === 'KoinoLetrehozas');
    idx.koinoAzonosito = k?.koino ?? null;
  }
  const felvesz = (e) => {
    if (!e || typeof e !== 'object' || e.koino !== idx.koinoAzonosito) return;
    if (e.tipus === 'KoinoLetrehozas') {
      if (!idx.koino) idx.koino = e;
      idx.horgonyok.set(e.azonosito, e);
      szerzohoz(idx, e.szerzo, e.azonosito);
    } else if (e.tipus === 'Belepes') {
      idx.horgonyok.set(e.azonosito, e);
      szerzohoz(idx, e.szerzo, e.azonosito);
    } else if (e.tipus === 'Meghivas' && typeof e.entitas === 'string') {
      const l = idx.meghivasok.get(e.entitas) ?? new Map();
      l.set(e.azonosito, e);
      idx.meghivasok.set(e.entitas, l);
    } else if (e.tipus === PROFIL && typeof e.entitas === 'string' && typeof e.adat?.lenyomat === 'string') {
      const p = idx.profilok.get(e.entitas) ?? new Map();
      p.set(e.adat.lenyomat, e);
      idx.profilok.set(e.entitas, p);
    }
  };
  for (const e of lista) {
    if (e?.tipus === TAGSAGI_CSOMAG && Array.isArray(e.adat?.lanc)) for (const b of e.adat.lanc.slice(0, CSOMAG_ESEMENY_KORLAT)) felvesz(b);
    else felvesz(e);
  }
  return idx;
}

function szerzohoz(idx, szerzo, az) {
  const l = idx.szerzoHorgonyai.get(szerzo) ?? [];
  if (!l.includes(az)) l.push(az);
  idx.szerzoHorgonyai.set(szerzo, l);
}

/** Vár-e a koinó profil-mezőket (D28/3, D93/5)? */
export function profilKell(idx) {
  const p = idx.koino?.adat?.profil;
  return Array.isArray(p) && p.length > 0;
}

/**
 * ⭐ TAG-E AZ, AKINEK EZ A HORGONYA? — a legrövidebb érvényes lánc (`MELYSEG_KORLAT`-ig).
 * @returns {{igen: boolean, ok: string, ellenorizheto: boolean, melyseg?: number, meghivas?: Object}}
 */
export function horgonyTagsaga(idx, horgony, folyamatban = new Set()) {
  if (idx.memo.has(horgony)) return idx.memo.get(horgony);
  if (folyamatban.has(horgony)) return { igen: false, ok: 'kör a meghívási láncban', ellenorizheto: true, kor: true };
  folyamatban.add(horgony);
  try {
    const e = idx.horgonyok.get(horgony);
    if (!e) return veg(idx, horgony, { igen: false, ok: 'nem ellenőrizhető: hiányzik a horgony-esemény', ellenorizheto: false });
    if (e.tipus === 'KoinoLetrehozas') {
      return veg(idx, horgony, idx.koino && e.azonosito === idx.koino.azonosito
        ? { igen: true, ok: 'a koinó létrehozója', ellenorizheto: true, melyseg: 0 }
        : { igen: false, ok: 'más koinó létrehozása', ellenorizheto: true });
    }
    if (e.tipus !== 'Belepes') return veg(idx, horgony, { igen: false, ok: 'a horgony nem belépés', ellenorizheto: true });
    // Alapító (a létrehozás megnevezte, a belépése erre hivatkozik)?
    if (typeof e.adat?.alapitas === 'string') {
      if (!idx.koino || idx.koino.azonosito !== e.adat.alapitas) {
        if (!idx.koino) return veg(idx, horgony, { igen: false, ok: 'nem ellenőrizhető: hiányzik a koinó létrehozása', ellenorizheto: false });
      } else if (Array.isArray(idx.koino.adat?.alapitok) && idx.koino.adat.alapitok.includes(e.szerzo)) {
        return veg(idx, horgony, { igen: true, ok: 'alapító', ellenorizheto: true, melyseg: 0 });
      }
    }
    // A meghívások — a legrövidebb érvényes lánc.
    let legjobb = null;
    let nemEllenorizheto = false;
    let kor = false;
    const kellProfil = profilKell(idx);
    for (const m of (idx.meghivasok.get(horgony) ?? new Map()).values()) {
      if (m.adat?.kit !== e.szerzo || m.szerzo === e.szerzo) continue;
      if (kellProfil) {
        const l = m.adat?.profil;
        if (typeof l !== 'string') continue;                         // a meghívó nem tanúsította a profilt
        if (!idx.profilok.get(horgony)?.has(l)) { nemEllenorizheto = true; continue; }
      }
      const ah = m.adat?.sajatBelepes;
      if (typeof ah !== 'string') continue;
      const ae = idx.horgonyok.get(ah);
      if (!ae) { nemEllenorizheto = true; continue; }
      if (ae.szerzo !== m.szerzo) continue;
      const r = horgonyTagsaga(idx, ah, folyamatban);
      if (r.kor) kor = true;
      if (!r.ellenorizheto) nemEllenorizheto = true;
      if (!r.igen) continue;
      const melyseg = r.melyseg + 1;
      if (melyseg > MELYSEG_KORLAT) continue;
      if (!legjobb || melyseg < legjobb.melyseg) legjobb = { igen: true, ok: 'tag hívta be (' + melyseg + '. szint)', ellenorizheto: true, melyseg, meghivas: m };
    }
    const ered = legjobb ?? { igen: false, ellenorizheto: !nemEllenorizheto,
      ok: nemEllenorizheto ? 'nem ellenőrizhető: a meghívási lánc egy része hiányzik' : 'nincs érvényes meghívása tagtól' };
    // ⚠️ Ami egy kör közepén született „nem”, az nem végleges (egy másik úton lehet „igen”) — azt nem jegyezzük meg.
    if (kor && !ered.igen) return { ...ered, kor: true };
    return veg(idx, horgony, ered);
  } finally {
    folyamatban.delete(horgony);
  }
}

function veg(idx, horgony, ered) {
  idx.memo.set(horgony, ered);
  return ered;
}

/**
 * Tag-e a SZERZŐ? — bármelyik horgonya (a koinó létrehozása vagy egy belépése) tagságot ad; a legrövidebb számít.
 * @returns {{igen: boolean, ok: string, ellenorizheto: boolean, horgony?: string, melyseg?: number}}
 */
export function szerzoTagsaga(idx, szerzo) {
  const horgonyok = idx.szerzoHorgonyai.get(szerzo) ?? [];
  let legjobb = null;
  let nemEllenorizheto = horgonyok.length === 0 ? false : false;
  for (const h of horgonyok) {
    const r = horgonyTagsaga(idx, h);
    if (r.igen && (!legjobb || r.melyseg < legjobb.melyseg)) legjobb = { ...r, horgony: h };
    if (!r.ellenorizheto) nemEllenorizheto = true;
  }
  if (legjobb) return legjobb;
  if (!horgonyok.length) return { igen: false, ok: 'nem ellenőrizhető: nincs ismert belépése', ellenorizheto: false };
  return { igen: false, ok: nemEllenorizheto ? 'nem ellenőrizhető: a meghívási lánc egy része hiányzik' : 'nem tag',
    ellenorizheto: !nemEllenorizheto };
}

/**
 * A legrövidebb tagsági lánc eseményei (a csomaghoz): a horgonytól az alapítóig — lépésenként a belépés, a meghívás
 * és (ha kell) a profil; a végén az alapító horgonya és a koinó létrehozása. Ha nem tag, null.
 */
export function tagsagiLanc(idx, horgony) {
  const ki = [];
  let h = horgony;
  for (let lepes = 0; lepes <= MELYSEG_KORLAT + 1; lepes++) {
    const r = horgonyTagsaga(idx, h);
    if (!r.igen) return null;
    const e = idx.horgonyok.get(h);
    ki.push(e);
    if (r.melyseg === 0) {
      if (e.tipus === 'Belepes' && idx.koino) ki.push(idx.koino);
      return [...new Map(ki.map((x) => [x.azonosito, x])).values()];
    }
    ki.push(r.meghivas);
    if (profilKell(idx)) ki.push(idx.profilok.get(h).get(r.meghivas.adat.profil));
    h = r.meghivas.adat.sajatBelepes;
  }
  return null;
}

/**
 * ⭐ A TAGSÁGI CSOMAG ELLENŐRZÉSE (a kapu hívja): a csomag a SZERZŐ saját azonosság-szeletébe szól (`entitas` = az ő
 * horgonya), minden belső esemény hiteles (aláírás), ugyanannak a koinónak a lánc-típusa, és a lánc EZEN a szabályon
 * tagságot ad a horgonynak. Egy hamis belső esemény az egészet elveti.
 * @returns {Promise<{rendben: boolean, ok?: string, melyseg?: number}>}
 */
export async function tagsagiCsomagEllenorzese(esemeny) {
  const lanc = esemeny?.adat?.lanc;
  if (!Array.isArray(lanc) || !lanc.length || lanc.length > CSOMAG_ESEMENY_KORLAT) return { rendben: false, ok: 'hibás tagsági csomag' };
  if (!azonositoAlaku(esemeny.entitas)) return { rendben: false, ok: 'a tagsági csomag a horgonyhoz szól' };
  for (const b of lanc) {
    if (!b || typeof b !== 'object' || !LANC_TIPUSOK.has(b.tipus) || b.koino !== esemeny.koino) {
      return { rendben: false, ok: 'a tagsági csomagban idegen esemény' };
    }
    const al = await esemenyEllenorzese(b);
    if (!al.rendben) return { rendben: false, ok: 'a tagsági csomag egy eseménye nem hiteles: ' + al.ok };
  }
  const idx = tagsagiIndex(lanc, esemeny.koino);
  const h = idx.horgonyok.get(esemeny.entitas);
  if (!h || h.szerzo !== esemeny.szerzo) return { rendben: false, ok: 'a tagsági csomag csak a saját azonosság-szeletbe szólhat' };
  const r = horgonyTagsaga(idx, esemeny.entitas);
  if (!r.igen) return { rendben: false, ok: 'a tagsági csomag nem ad tagságot: ' + r.ok };
  return { rendben: true, melyseg: r.melyseg };
}
