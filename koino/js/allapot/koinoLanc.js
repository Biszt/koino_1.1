// koino/js/allapot/koinoLanc.js

// Felelősség: ⭐⭐ D118 (a költözés ②a, 2026-10-24) — A GYERMEK SZÜLETÉSE ÉS A SZÜLETÉSEK LÁNCA.
//
// Egy új koinó a szülőjére épülhet (D118/1): a születése (`KoinoLetrehozas`) megnevezi a szülőt (`szulo` — a szülő koinó
// neve, vagyis a szülő születésének lenyomata), és hozza a létrehozó TAGSÁGI BIZONYÍTÉKÁT a szülőben (`szuloTagsag` —
// KZ2: gyermeket a szülő vágáskori tagja hozhat létre). A vágás a gyermek születésének ideje.
//
// ⭐ A bizonyíték a szülő születése NÉLKÜL jön — arra a `szulo` mutat. Ha benne volna, az a sajátját is hozná, egymásba
// ágyazva minden ős: egyetlen esemény, ami a koinó történetével nő (9. szabály). Így minden születés a saját létrehozója
// láncával arányos, és a nemzedékek LÁNCA a koinó születés-szeletében utazik, a gyökértől (`vonal.js`, `csere.js`).
//
// A kapu (`esemenyMentese`) a gyermek születését csak a szülő születésével együtt ellenőrizheti — ha az még nincs meg, az
// elutasítás nem végleges: a csere a láncot a gyökértől hozza, a kézi út is.
//
// ⭐⭐ ②b — A KAPU KOINÓ-SZABÁLYA (4.3): egy esemény a koinóba tartozik, ha a koinóé; vagy a lánc egy születése; vagy egy ős
// eseménye a vágása előtt (`koinohozTartozik`). A nem költözőé az ÓRA szerint (`ido` ≤ annak a nemzedéknek a születése,
// amelyik tőle örökölt — a szerzők órája, mint a szülő saját lezárásainál); ⭐ a létrehozóé a LÁNC-PONT szerint (a sorszáma a
// gyermek születéséé alatt) — a születés az ő láncát folytatja, és az óra-csúszás így sem engedheti be a vágás utáni
// szülőbeli eseményét, ami a gyermekbeli folytatással egy sorszámot viselne (elágazásnak látszana). A költözők lánc-pontja
// a beköltözésükben jön (④).
//
// ⚠️ A számítás (a múlt rétege) a ③; itt csak a születés alakja, a bizonyítéka, a lánc követése és a koinó-szabály van.
//
// Hálózatot nem importál. Használják: `tar/esemenyTar.js` (a kapu), `csere/csere.js` (a lánc a beolvasztásban),
// `csere/fajlCsere.js` (a kézi út), `koino.js` (a létrehozás, a születés-szelet).

import { esemenyEllenorzese, esemenyKoinoja, koinoSzuleteseE, azonositoAlaku } from '../esemeny/esemeny.js';
import { tagsagiIndex, horgonyTagsaga, tagsagiLanc, LANC_TIPUSOK, CSOMAG_ESEMENY_KORLAT } from './tagsag.js';

/** A létrehozó tagsági láncának legnagyobb hossza — ugyanaz, mint a tagsági csomagé (D113). */
export const SZULO_TAGSAG_KORLAT = CSOMAG_ESEMENY_KORLAT;

// ===================================
// A GYERMEK SZÜLETÉSE
// ===================================

/** Egy szülőt megnevező (új alakú) koinó-születés-e? */
export function gyermekSzuleteseE(e) {
  return !!e && typeof e === 'object' && e.tipus === 'KoinoLetrehozas' && e.koino === ''
    && typeof e.adat?.szulo === 'string';
}

/** Egy új alakú (lenyomat-nevű) koinó-születés-e — gyermek vagy sem? */
export function ujAlakuSzuletesE(e) {
  return !!e && typeof e === 'object' && e.tipus === 'KoinoLetrehozas' && e.koino === '' && azonositoAlaku(e.azonosito);
}

/**
 * ⭐ A GYERMEK SZÜLETÉSÉNEK BIZONYÍTÉKA (a kapu kérdezi): a szülő születése megvan és az, amit a `szulo` mond; a zárt szülő
 * gyermeke zárt (D118/5); és a létrehozó tagsági lánca — minden eseménye hiteles, a szülőé, a lánc-típusú — a szülő
 * születésével együtt tagságot ad a létrehozó horgonyának (KZ2).
 *
 * ⚠️ A lánc eseményeire nincs időfeltétel: a születésben vannak, tehát a születés előtt léteztek (oksági bizonyíték, óra
 * nélkül).
 * @param {Object} szuletes - a gyermek születése (`gyermekSzuleteseE`)
 * @param {Object|null} szuloSzuletes - a tárból (`tar.esemeny(szulo)`)
 * @returns {Promise<{rendben: boolean, ok?: string, hianyzik?: boolean, melyseg?: number}>}
 */
export async function gyermekSzuletesEllenorzese(szuletes, szuloSzuletes) {
  const szulo = szuletes?.adat?.szulo;
  if (!azonositoAlaku(szulo)) return { rendben: false, ok: 'a szülő neve egy koinó-név (a születése lenyomata)' };
  if (!szuloSzuletes || !koinoSzuleteseE(szuloSzuletes, szulo)) {
    return { rendben: false, hianyzik: true, ok: 'a szülő születése még nincs meg (a lánc a gyökértől jön)' };
  }
  // ⛔ D118/5: a zártság öröklődik — zárt szülőnek csak zárt gyermeke lehet.
  if (szuloSzuletes.adat?.zart !== false && szuletes.adat?.zart === false) {
    return { rendben: false, ok: 'zárt szülőnek csak zárt gyermeke lehet (D118/5)' };
  }
  const b = szuletes.adat.szuloTagsag;
  if (!b || typeof b !== 'object' || !azonositoAlaku(b.horgony) || !Array.isArray(b.lanc)
      || b.lanc.length > SZULO_TAGSAG_KORLAT) {
    return { rendben: false, ok: 'a gyermek születése a létrehozó tagsági bizonyítékát hozza (KZ2)' };
  }
  for (const x of b.lanc) {
    // ⚠️ A szülő születése nem lehet benne (arra a `szulo` mutat) — és más koinó-születés sem.
    if (!x || typeof x !== 'object' || !LANC_TIPUSOK.has(x.tipus) || x.tipus === 'KoinoLetrehozas'
        || esemenyKoinoja(x) !== szulo) {
      return { rendben: false, ok: 'a tagsági bizonyítékban idegen esemény' };
    }
    const al = await esemenyEllenorzese(x);
    if (!al.rendben) return { rendben: false, ok: 'a tagsági bizonyíték egy eseménye nem hiteles: ' + al.ok };
  }
  const idx = tagsagiIndex([szuloSzuletes, ...b.lanc], szulo);
  const h = idx.horgonyok.get(b.horgony);
  if (!h || h.szerzo !== szuletes.szerzo) return { rendben: false, ok: 'a tagsági bizonyíték horgonya nem a létrehozóé' };
  const r = horgonyTagsaga(idx, b.horgony);
  if (!r.igen) return { rendben: false, ok: 'a létrehozó nem tagja a szülőnek (KZ2): ' + r.ok };
  return { rendben: true, melyseg: r.melyseg };
}

/**
 * A létrehozó tagsági bizonyítéka a szülőben — a szülő eseményeiből (a legrövidebb lánc, a szülő születése nélkül).
 * @param {Array<Object>} szuloEsemenyek - a szülő eseményei (a születésével)
 * @param {string} szulo - a szülő koinó neve
 * @param {string} horgony - a létrehozó horgonya a szülőben (az alapítóé maga a szülő születése)
 * @returns {{horgony: string, lanc: Array<Object>}|null} null, ha a létrehozó nem (bizonyíthatóan) tag
 */
export function szuloTagsagaEpitese(szuloEsemenyek, szulo, horgony) {
  const lanc = tagsagiLanc(tagsagiIndex(szuloEsemenyek, szulo), horgony);
  if (!lanc) return null;
  return { horgony, lanc: lanc.filter((e) => e.tipus !== 'KoinoLetrehozas') };
}

// ===================================
// A SZÜLETÉSEK LÁNCA
// ===================================

/**
 * A koinó születéseinek lánca a gyermektől a gyökérig, a `szulo` mutatókon — a tárból és (a beolvasztásnál) a most kapott
 * születésekből. ⭐ Nincs nemzedék-korlát (D106: a koinó története nem korlátozható egy rögzített számmal); a kör
 * lehetetlen (minden név a születés lenyomata), az őr mégis megvan.
 * @param {Object} tar - `esemeny(azonosito)`
 * @param {string} koino - a koinó neve
 * @param {Map<string, Object>} [kapottak] - a most kapott (még nem tárolt) születések azonosító szerint
 * @returns {Promise<{lanc: Array<Object>, teljes: boolean, hianyzik?: string}>} a `lanc` a gyermektől a gyökér felé
 */
export async function szuletesLanc(tar, koino, kapottak = null) {
  const lanc = [];
  const lattuk = new Set();
  let nev = koino;
  while (azonositoAlaku(nev) && !lattuk.has(nev)) {
    lattuk.add(nev);
    const e = kapottak?.get(nev) ?? await tar?.esemeny?.(nev) ?? null;
    if (!e || !koinoSzuleteseE(e, nev)) return { lanc, teljes: false, hianyzik: nev };
    lanc.push(e);
    nev = typeof e.adat?.szulo === 'string' ? e.adat.szulo : null;
  }
  return { lanc, teljes: true };
}

// ===================================
// ②b — A KOINÓ-SZABÁLY
// ===================================

// koinó neve → a teljes (a tárból — tehát a kapun át — ismert) lánc nézete. ⭐ A lánc a névből következik (minden név a
// születés lenyomata, és a születés a szülő nevét mondja): ha egyszer teljes, nem változik.
const teljesNezetek = new Map();
const NEZET_EMLEK = 64;

/**
 * Melyik eseményt fogadja a koinó tára — a koinó születéseinek láncából. A teljes lánc nézete megmarad (nem változhat); a
 * hiányos minden kérdésnél újra (a hiányzó születés közben megérkezhet).
 * @param {Object} tar - `esemeny(azonosito)`
 * @param {string} koino
 * @param {Map<string, Object>} [kapottak] - a most kapott (még nem tárolt) születések — ⚠️ ezekkel a nézet nem marad meg
 * @returns {Promise<{koino: string, teljes: boolean, szuletesek: Set<string>, tartozik: function(Object): boolean}>}
 */
export async function koinoNezete(tar, koino, kapottak = null) {
  const kesz = !kapottak && teljesNezetek.get(koino);
  if (kesz) return kesz;
  const { lanc, teljes } = await szuletesLanc(tar, koino, kapottak);
  const szuletesek = new Set(lanc.map((e) => e.azonosito));
  // ős neve → a vágása: az óra (a tőle örökölt nemzedék születése) és a lánc-pont (annak a születésnek a szerzője és sorszáma)
  const osok = new Map();
  for (let i = 1; i < lanc.length; i++) {
    osok.set(lanc[i].azonosito, { vagas: lanc[i - 1].ido, szerzo: lanc[i - 1].szerzo, sorszam: lanc[i - 1].sorszam });
  }
  const nezet = { koino, teljes, szuletesek, tartozik: (e) => koinohozTartozik(e, koino, szuletesek, osok) };
  if (teljes && !kapottak && lanc.length) {
    if (teljesNezetek.size >= NEZET_EMLEK) teljesNezetek.delete(teljesNezetek.keys().next().value);
    teljesNezetek.set(koino, nezet);
  }
  return nezet;
}

/**
 * ⭐⭐ A KOINÓ-SZABÁLY: a koinó eseménye; a lánc egy születése; vagy egy ős eseménye a vágása előtt.
 * @param {Object} e
 * @param {string} koino
 * @param {Set<string>} szuletesek - a lánc születései
 * @param {Map<string, {vagas: number, szerzo: string, sorszam: number}>} osok
 */
export function koinohozTartozik(e, koino, szuletesek, osok) {
  if (!e || typeof e !== 'object') return false;
  const k = esemenyKoinoja(e);
  if (k === koino) return true;
  if (szuletesek.has(e.azonosito)) return true;
  const o = osok.get(k);
  if (!o) return false;
  // ⭐ A létrehozó a lánc-pontja szerint (a sorszám), mindenki más az óra szerint.
  if (e.szerzo === o.szerzo) return Number.isSafeInteger(e.sorszam) && e.sorszam < o.sorszam;
  return Number.isSafeInteger(e.ido) && e.ido <= o.vagas;
}
