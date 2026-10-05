// koino/js/allapot/tagsagKisero.js

// Felelősség: D95/2 — A TAGSÁGI CSOMAG A CSERÉBEN, KÍSÉRŐKÉNT. A döntésben csak az ellenőrzött tag számít (D93/1), tehát
// a vállalt szeleteim SZERZŐINEK tagsága is kell — a szigorú (b) alatt viszont az ő azonosság-szeletüket nem tartom. Ezért:
// a szelet cseréje után akinek a tagságát nem tudom, annak a tagsági csomagját a társtól kérem, és a csomag a vállalt
// szeletek KÍSÉRŐJEKÉNT kerül a tárba (a csere-részvételt nem bővíti). Szerzőnként egyszer: ha egyszer tudom, nem kérem újra.
//
//   · a KÉRDEZŐ (`tagsagKerdo`): az újonnan kapott döntési események szerzői közül azok, akiknek a tagsága a táramból
//     nem bizonyítható, és a korábbról függők (helyi jegyzék — `fajlTar.js` `tagsagFuggoTarolo`, korlátos, lejár);
//   · a VÁLASZOLÓ (`tagsagiKiserok`): a kért szerzők legutóbbi tagsági csomagja — vagy ha nincs, a tagsági lánc
//     eseményei, amennyit én bizonyítani tudok (a csomag tartalma ugyanez; így az alapító és a csomag nélküli tag is);
//   · a FOGADÁS: csak a kért szerzők csomagja és a lánc-típusú események — ugyanazon a kapun (3. szabály).
//
// ⭐ A tagság forrása a tár (a szerző saját eseményei a mutatóból — a horgonya és a csomagja —, és a láncának bejárása):
// a terhe a szerző láncának mélységével arányos (logaritmikus — 63. mérés), nem a koinó méretével.
// ⚠️ A hiány nem vád (D19): akinek a tagsága nem derül ki, az „függőben” marad, és a következő cserén újra kérdezzük.
//
// Használják: koino.js (a csere beállításai, a kézi út kísérői, a B1 mintáinak tagsága), a próbák.

import { sajatLancEsemenyei } from '../tar/esemenyTar.js';
import { tagsagiIndex, szerzoTagsaga, tagsagiLanc, TAGSAGI_CSOMAG, LANC_TIPUSOK } from './tagsag.js';
import { tagsagiEsemenyekGyujtese } from './identitas.js';
import { TAGSAG_KELL } from './szabalyok.js';
import { AZONOSITO_MINTA } from '../esemeny/esemeny.js';

/** Egy cserében legfeljebb ennyi szerző tagságát kérdezzük. */
export const TAGSAG_KERDES_KORLAT = 32;
/** Egy válaszban legfeljebb ennyi esemény (a többi a következő cserén). */
export const TAGSAG_VALASZ_KORLAT = 512;
/** A függő szerzők jegyzéke: legfeljebb ennyi, ennyi ideig, ennyi kérdezésig. */
export const FUGGO_KORLAT = 256;
export const FUGGO_ELETTARTAM = 6 * 3600 * 1000;
export const FUGGO_PROBA = 30;
/** Egy hívásban legfeljebb ennyi jelölt tagságát ellenőrizzük (a többi a jegyzékbe kerül, és később). */
const ELLENORZES_KORLAT = 256;
/** Egy szerzőnek legfeljebb ennyi horgonyát járjuk be. */
const HORGONY_KORLAT = 8;

const szerzoAlaku = (x) => typeof x === 'string' && AZONOSITO_MINTA.test(x);

// ===================================
// A TAGSÁG A TÁRBÓL
// ===================================

/**
 * Egy SZERZŐ tagsága a táramból: a horgonyai (a belépése, a koinó létrehozása, a csomagja szelete) a saját eseményeiből,
 * a láncuk bejárása (`tagsagiEsemenyekGyujtese`), a csomagja — és a koinó születése (a kívülről kapott, nem a csomagé).
 * @param {Object} tar
 * @param {string} koino
 * @param {string} szerzo
 * @param {Object|null} [koinoSzuletes] - a `KoinoLetrehozas` (ha ismert)
 * @returns {Promise<{r: Object, idx: Object}>} `r` = `szerzoTagsaga`
 */
export async function szerzoTagsagaTarbol(tar, koino, szerzo, koinoSzuletes = null) {
  const sajat = (await sajatLancEsemenyei(tar, szerzo)).filter((e) => e.koino === koino);
  const horgonyok = new Set();
  for (const e of sajat) {
    if (e.tipus === 'Belepes' || e.tipus === 'KoinoLetrehozas') horgonyok.add(e.azonosito);
    if (e.tipus === TAGSAGI_CSOMAG && typeof e.entitas === 'string') horgonyok.add(e.entitas);
  }
  // ⛔ A koinó születése (a MIÉNK) az első: egy hamis koinó-létrehozás egy csomagban így nem ad tagságot (mint a kapunál).
  const lista = koinoSzuletes ? [koinoSzuletes] : [];
  for (const h of [...horgonyok].slice(0, HORGONY_KORLAT)) lista.push(...await tagsagiEsemenyekGyujtese(tar, koino, h));
  lista.push(...sajat.filter((e) => e.tipus === TAGSAGI_CSOMAG));
  const idx = tagsagiIndex(lista, koino);
  return { r: szerzoTagsaga(idx, szerzo), idx };
}

// ===================================
// A VÁLASZOLÓ (és a kézi út kísérői)
// ===================================

/**
 * A kért szerzők tagsági kísérői: szerzőnként a legutóbbi tagsági csomagja, vagy ha nincs, a tagsági lánca (amennyit a
 * táramból bizonyítani tudok). Egy eseményt egyszer adunk (a láncok közös ősei), és legfeljebb `korlat`-ot.
 * @param {Object} tar
 * @param {string} koino
 * @param {Array<string>} szerzok
 * @param {Object} [b]
 * @param {Object|null} [b.koinoSzuletes]
 * @param {number} [b.szerzoKorlat]
 * @param {number} [b.korlat]
 * @returns {Promise<Array<Object>>}
 */
export async function tagsagiKiserok(tar, koino, szerzok, { koinoSzuletes = null, szerzoKorlat = TAGSAG_KERDES_KORLAT,
  korlat = TAGSAG_VALASZ_KORLAT } = {}) {
  const ki = new Map();
  for (const sz of (Array.isArray(szerzok) ? szerzok : []).filter(szerzoAlaku).slice(0, szerzoKorlat)) {
    if (ki.size >= korlat) break;
    const csomag = (await sajatLancEsemenyei(tar, sz))
      .filter((e) => e.koino === koino && e.tipus === TAGSAGI_CSOMAG)
      .sort((a, b) => b.sorszam - a.sorszam)[0];
    if (csomag) { ki.set(csomag.azonosito, csomag); continue; }
    const { r, idx } = await szerzoTagsagaTarbol(tar, koino, sz, koinoSzuletes);
    if (!r.igen || !r.horgony) continue;
    for (const e of tagsagiLanc(idx, r.horgony) ?? []) if (e) ki.set(e.azonosito, e);
  }
  return [...ki.values()].slice(0, korlat);
}

// ===================================
// A KÉRDEZŐ
// ===================================

/**
 * @param {Object} b
 * @param {Object} b.tar
 * @param {string} b.koino
 * @param {{olvas: Function, ir: Function}} b.tarolo - `tagsagFuggoTarolo` ({ szerzok: { [szerző]: { ido, probak } } })
 * @param {Function} [b.koinoSzuletes] - async () → a `KoinoLetrehozas` (vagy null)
 * @param {Function} b.mentes - async (események) → { uj, ujAzonositok } — a kapu (`beolvasztas`)
 * @param {Map} [b.ismert] - szerző → igaz: akiről már tudjuk, hogy tag (a folyamat életében — megosztható a kapuval)
 * @param {Function} [b.most]
 */
export function tagsagKerdo({ tar, koino, tarolo, koinoSzuletes = async () => null, mentes, ismert = new Map(),
  most = () => Date.now() }) {
  const takaritas = (t) => {
    const n = most();
    for (const [sz, x] of Object.entries(t.szerzok)) {
      if (!szerzoAlaku(sz) || !x || n - (x.ido ?? 0) > FUGGO_ELETTARTAM || (x.probak ?? 0) >= FUGGO_PROBA) delete t.szerzok[sz];
    }
    const lista = Object.entries(t.szerzok).sort((a, b) => (b[1].ido ?? 0) - (a[1].ido ?? 0)).slice(0, FUGGO_KORLAT);
    t.szerzok = Object.fromEntries(lista);
    return t;
  };
  const tagE = async (sz) => {
    if (ismert.has(sz)) return true;
    const { r } = await szerzoTagsagaTarbol(tar, koino, sz, await koinoSzuletes());
    if (r.igen) ismert.set(sz, true);
    return r.igen;
  };
  const felvesz = (t, szerzok) => {
    for (const sz of szerzok) if (szerzoAlaku(sz) && !t.szerzok[sz]) t.szerzok[sz] = { ido: most(), probak: 0 };
  };

  return {
    /** Hány szerző tagsága függ (a NYITÁS jelzéséhez: akkor is van mit kérdeznünk, ha a szeletek egyeznek). */
    async fuggoDarab() {
      return Object.keys(takaritas(await tarolo.olvas()).szerzok).length;
    },

    /** A szerző tagsága a táramból — ha nem derül ki, a függők közé kerül (a B1 mintáinak szerzői is ide jönnek). */
    async tagE(sz) {
      if (await tagE(sz)) return true;
      const t = takaritas(await tarolo.olvas());
      felvesz(t, [sz]);
      await tarolo.ir(t);
      return null;
    },

    /**
     * A kérdés: az új döntési események szerzői és a függők közül akiknek a tagsága nem derül ki (legfeljebb
     * `TAGSAG_KERDES_KORLAT`, a régebben kérdezettek előbb). Ami nem fér bele, a jegyzékben marad.
     * @param {Array<string>} ujAzonositok - a cserében most beolvasztott események
     */
    async kerdesek(ujAzonositok = []) {
      const t = takaritas(await tarolo.olvas());
      const jeloltek = new Set();
      for (const az of (Array.isArray(ujAzonositok) ? ujAzonositok : []).slice(0, 4096)) {
        const e = await tar.esemeny(az);
        if (e && e.koino === koino && TAGSAG_KELL.has(e.tipus) && szerzoAlaku(e.szerzo) && !ismert.has(e.szerzo)) jeloltek.add(e.szerzo);
      }
      // A függők közül a legrégebben kérdezettek előbb (a probak szerint), aztán az újak.
      const fuggok = Object.entries(t.szerzok).sort((a, b) => (a[1].probak ?? 0) - (b[1].probak ?? 0)).map(([sz]) => sz);
      const sorrend = [...new Set([...fuggok, ...jeloltek])];
      const ki = [];
      let ellenorzott = 0;
      for (const sz of sorrend) {
        if (ellenorzott >= ELLENORZES_KORLAT) { felvesz(t, [sz]); continue; }
        ellenorzott++;
        if (await tagE(sz)) { delete t.szerzok[sz]; continue; }
        felvesz(t, [sz]);
        if (ki.length < TAGSAG_KERDES_KORLAT) ki.push(sz);
      }
      await tarolo.ir(takaritas(t));
      return ki;
    },

    /**
     * A társ válaszának átvétele: csak a KÉRT szerzők csomagja és a lánc-típusú események (a koinóé), ugyanazon a kapun.
     * Utána a kértek közül akinek a tagsága kiderült, kikerül a függők közül; a többi kérdezése számlálódik.
     * @returns {Promise<{uj: number, ujAzonositok: Array<string>, megtudott: number, fuggo: number}>}
     */
    async fogadas(esemenyek, kert) {
      const kertek = new Set((Array.isArray(kert) ? kert : []).filter(szerzoAlaku));
      const szurt = (Array.isArray(esemenyek) ? esemenyek : []).filter((e) => e && typeof e === 'object' && e.koino === koino
        && ((e.tipus === TAGSAGI_CSOMAG && kertek.has(e.szerzo)) || LANC_TIPUSOK.has(e.tipus))).slice(0, TAGSAG_VALASZ_KORLAT);
      const b = szurt.length ? await mentes(szurt) : { uj: 0, ujAzonositok: [] };
      const t = takaritas(await tarolo.olvas());
      let megtudott = 0;
      for (const sz of kertek) {
        if (await tagE(sz)) { delete t.szerzok[sz]; megtudott++; continue; }
        felvesz(t, [sz]);
        t.szerzok[sz].probak = (t.szerzok[sz].probak ?? 0) + 1;
      }
      await tarolo.ir(takaritas(t));
      return { uj: b.uj ?? 0, ujAzonositok: b.ujAzonositok ?? [], megtudott, fuggo: Object.keys(t.szerzok).length };
    }
  };
}
