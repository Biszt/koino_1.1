// koino/felulet/js/koinoTorzs.js

// Felelősség: ⭐⭐ D120 (Csaba ötlete és döntése, 2026-10-29) — A TÖRZS-HATÁR A LAPON. A nem vállalt entitás törzséből
// böngészés közben elemenként csak a határ alatti jön magától (a program dönti el — `fajlIgeny.js`); ami fölötte van, azt a
// lap a saját helyén kérhetőként mutatja, és egy kattintással kéri — a következő csere hozza el.
//   · a kártya tudatpont-sorában a TÖRZS MÉRETE (`koinoTorzsMeret` — a hivatkozásból: a szöveg és a fájljai, a kártyánál a
//     kód is): „📦 6,6 MB”;
//   · a nagy KÉP helyén (a betöltése elbukik — a fájl nincs meg), ha a program kérhetőnek mondja (`GET /api/torzs`): a mérete
//     és „kattints — a következő csere elhozza” (`POST /api/torzs`);
//   · a koino-verzió kártya „Kód” fülén ugyanez a kód-csomagra (`koinoVerzio.js` hívja: `kodKereseGomb`).
//
// ⚠️ A lap itt sem dönt és nem számol: a határ, a méret és a kérhetőség a programtól jön. A prototípus fájljai változatlanok.
//
// Használja: `koinoPakli.js` (a méret), `koinoVerzio.js` (a kód kérése), és a betöltéskor (a kép-figyelő) — `index.html`.

import { apiGet, apiPost } from './utils/apiHelper.js';

const meretSzoveg = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? (b / 1024).toFixed(1) + ' KB' : b + ' B')
  .replace('.', ',');
const KEP_UT = /\/api\/fajl\/([A-Za-z0-9_-]{43})$/;

/**
 * A kártya tudatpont-sorában a törzs mérete (ha a hivatkozás mondja).
 * @param {HTMLElement} dom - a kártya
 * @param {number|null} meret
 */
export function torzsMeretJelolese(dom, meret) {
  if (!dom) return;
  dom.querySelectorAll('.pakli-kartya__koino-torzs').forEach((e) => e.remove());
  if (!Number.isSafeInteger(meret) || meret <= 0) return;
  const sor = dom.querySelector('.pakli-kartya__ikon-sor--tudatpont');
  if (!sor) return;
  const elem = document.createElement('span');
  elem.className = 'pakli-kartya__ikon-elem pakli-kartya__koino-torzs';
  elem.textContent = '📦 ' + meretSzoveg(meret);
  const felirat = 'A törzs mérete (a szöveg és a fájljai' + ' — a szerző bemondása): ' + meretSzoveg(meret)
    + '. A határ fölötti elemet a készülék csak kérésre hozza el (amire pontot tettél, azt mindig teljesen).';
  elem.title = felirat;
  elem.setAttribute('aria-label', felirat);
  sor.appendChild(elem);
}

/** Egy kérés (a „kattintás”): a program a kért elemek közé teszi, és a következő csere elhozza. */
async function keres(test, gomb, kesz) {
  gomb.disabled = true;
  gomb.textContent = '⏳ kérem…';
  try {
    await apiPost('torzs', test);
    gomb.textContent = kesz;
    gomb.classList.add('koino-torzs-kerheto--kerve');
  } catch (hiba) {
    gomb.disabled = false;
    gomb.textContent = '⚠ ' + hiba.message + ' — próbáld újra';
  }
}

/**
 * ⭐ A NAGY KÉP HELYE: ha egy `/api/fajl/<lenyomat>` kép betöltése elbukik, megkérdezzük a programot, kérhető-e (a határ
 * fölött van); ha igen, a kép helyén a mérete és a kérés gombja áll. A kért kép a következő cserével jön — a lap a csere után
 * magától frissül (az alsó sáv), és a kép akkor betölt.
 */
async function kepHibaKezelese(kep) {
  const talalat = String(kep.getAttribute('src') ?? '').match(KEP_UT);
  if (!talalat || kep.dataset.koinoTorzs) return;
  kep.dataset.koinoTorzs = 'nezem';
  let t;
  try { t = await apiGet('torzs?lenyomat=' + encodeURIComponent(talalat[1])); } catch { return; }
  const elem = (t?.kerhetok ?? []).find((k) => k.elem === talalat[1]);
  const kert = (t?.kertek ?? []).includes(talalat[1]);
  if (!elem && !kert) return;   // nem a határ miatt hiányzik (még nem jött meg — a következő csere hozza)
  const gomb = document.createElement('button');
  gomb.type = 'button';
  gomb.className = 'koino-torzs-kerheto';
  const meret = Number.isSafeInteger(elem?.meret) ? meretSzoveg(elem.meret) : 'nagy';
  gomb.title = 'A kép a törzs-határ (' + meretSzoveg(t.hatar ?? 0) + ') fölött van — böngészés közben nem jön magától.';
  if (kert) {
    gomb.textContent = '⏳ 🖼 kép (' + meret + ') — kérve, a következő csere hozza el';
    gomb.disabled = true;
    gomb.classList.add('koino-torzs-kerheto--kerve');
  } else {
    gomb.textContent = '🖼 kép · ' + meret + ' — kattints, és a következő csere elhozza';
    gomb.addEventListener('click', (e) => {
      e.stopPropagation();   // a kártya a koppintást is figyeli (kiválasztás)
      keres({ elem: talalat[1] }, gomb, '⏳ 🖼 kép (' + meret + ') — kérve, a következő csere hozza el');
    });
  }
  kep.replaceWith(gomb);
}

/**
 * ⭐ A kártya kód-csomagjának kérése (a „Kód” fülön): ha a program kérhetőnek mondja, egy gomb a méretével.
 * @param {string} kartya - a koino-verzió kártya azonosítója
 * @returns {Promise<HTMLElement|null>}
 */
export async function kodKereseGomb(kartya) {
  let t;
  try { t = await apiGet('torzs?entitas=' + encodeURIComponent(kartya)); } catch { return null; }
  const elem = (t?.kerhetok ?? []).find((k) => k.kod);
  const kert = (t?.kertek ?? []).includes('kod:' + kartya);
  if (!elem && !kert) return null;
  const gomb = document.createElement('button');
  gomb.type = 'button';
  gomb.className = 'koino-torzs-kerheto';
  const meret = Number.isSafeInteger(elem?.meret) ? meretSzoveg(elem.meret) : '';
  if (kert) {
    gomb.textContent = '⏳ a kód kérve — a következő csere hozza el';
    gomb.disabled = true;
    gomb.classList.add('koino-torzs-kerheto--kerve');
  } else {
    gomb.textContent = '📦 A kód elhozása' + (meret ? ' (' + meret + ')' : '') + ' — a következő csere hozza el';
    gomb.title = 'A kód a törzs-határ fölött van: aki nem vállalja a kártyát, csak kérésre hozza el (a költözés magától).';
    gomb.addEventListener('click', (e) => {
      e.stopPropagation();
      keres({ entitas: kartya, elem: 'kod' }, gomb, '⏳ a kód kérve — a következő csere hozza el');
    });
  }
  return gomb;
}

// ===== A BETÖLTÉSKOR: a kép-figyelő (az `error` nem buborékol — elkapó fázisban figyelünk) =====
if (typeof document !== 'undefined') {
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG') kepHibaKezelese(t);
  }, true);
}
