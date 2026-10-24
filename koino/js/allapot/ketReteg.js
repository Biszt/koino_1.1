// koino/js/allapot/ketReteg.js

// Felelősség: ⭐⭐ D118 (a költözés ③, 2026-10-24) — A KOINÓ KÉPE KÉT RÉTEGBEN: a múlt az ős szabályaival, a jelen a
// koinóéval.
//
// A számítás három fázis (`allapotSzamitasa` → `javaslatokSzamitasa` → `szerkesztesiEgyezmenyekAlkalmazasa`). Egy
// szülőre épülő koinónál a bemenet (a koinó-szabály szerint — `koinoLanc.js`, ②b) az ősök vágás előtti eseményeit is
// hordozza; ez a modul két rétegre bontja:
//
//   · A MÚLT (a talaj): nemzedékenként, a gyökértől lefelé — az ős eseményei az ŐS szabályaival (a születéséből), a vágás
//     pillanatára számolva, és az ős saját múltjával (rekurzívan). Ebből a gyermekbe a LEZÁRT döntések kerülnek át,
//     rögzítve (D118/3: mindenki szavazatával, a szülő küszöbeivel — nem fordulhatnak meg).
//   · A JELEN: a koinó saját eseményei, és az ősökéből a szerkezet (mindenkié) és a súly (csak a költözőké, a
//     lánc-pontjukig — `jelenbenSzamit`), a koinó szabályaival; a D14 itt ítél.
//   · A VÉGREHAJTÁS: a múlt rögzített és a jelen elfogadott egyezményei egy sorban (a lejárat szerint, ugyanazzal a kóddal) —
//     az entitások a vágáskori alakjukat kapják, és a jelen változásai arra épülnek.
//
// ⭐ Szülő nélküli koinónál (és a régi alaknál) a kép UGYANAZ, mint eddig: a bemenet egyetlen réteg.
//
// ⚠️ A múlt nem változik, csak bővül (a csere hozza a késve érkezőt) — a múlt képe gyorsítótárban, a bemenete szerint.
//
// Hálózatot és tárat nem érint — a bemenet egy esemény-lista. Használják: `koino.js` (`kepetKeszit`), `allapot/pakli.js`.

import { allapotSzamitasa } from './allapotSzamitas.js';
import { javaslatokSzamitasa } from './javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from './szerkesztesiVegrehajtas.js';
import { lancKoltozoi, jelenbenSzamit, lancbanVan } from './koinoLanc.js';
import { esemenyKoinoja, azonositoAlaku, koinoSzuleteseE } from '../esemeny/esemeny.js';
import { lenyomatSzinkron } from '../esemeny/kanonikusAlak.js';

// ===================================
// A SZÜLETÉSEK LÁNCA A BEMENETBŐL
// ===================================

/**
 * A koinó születéseinek lánca a bemenetből (a gyermektől a gyökér felé) — a bemenet a koinó-szabály szerint a lánc
 * születéseit is hordozza (②b). Ahol egy születés hiányzik, ott véget ér.
 * @param {Array<Object>} esemenyek
 * @param {string} koino
 * @returns {Array<Object>}
 */
export function lancBemenetbol(esemenyek, koino) {
  const szuletesek = new Map();
  for (const e of esemenyek) {
    if (e?.tipus === 'KoinoLetrehozas' && e.koino === '' && azonositoAlaku(e.azonosito)) szuletesek.set(e.azonosito, e);
  }
  const lanc = [];
  const lattuk = new Set();
  let nev = koino;
  while (azonositoAlaku(nev) && !lattuk.has(nev)) {
    lattuk.add(nev);
    const e = szuletesek.get(nev);
    if (!e || !koinoSzuleteseE(e, nev)) break;
    lanc.push(e);
    nev = typeof e.adat?.szulo === 'string' ? e.adat.szulo : null;
  }
  return lanc;
}

// ===================================
// A KÉP
// ===================================

/**
 * ⭐⭐ A KOINÓ KÉPE — a három fázis, szülőre épülő koinónál két rétegben.
 * @param {Array<Object>} esemenyek - a koinó bemenete (a koinó-szabály szerint — `koinoBemenete`)
 * @param {Object} beallitas
 * @param {string} [beallitas.koino] - a koinó neve (ha nincs, egy réteg)
 * @param {number} [beallitas.most]
 * @param {Map} [beallitas.osszegzesek] - a jelen réteg ellenőrzött lezárási összegzései (D95/1)
 * @param {Set<string>} [beallitas.csakAtmeneti] - a D14 kivétele (B/2)
 * @param {Function} [beallitas.nemTartott] - a D14 kivétele (D97)
 * @param {Map<string, number>} [beallitas.koltozok] - a legfelső költözés további költözői (a ③ próbáinak; a ④-ig)
 * @returns {Promise<{allapot: Object, javaslatok: Map, mult: Object|null}>} a `mult`: a szülő vágáskori képe (ha van)
 */
export async function koinoKepe(esemenyek, beallitas = {}) {
  const koino = beallitas.koino ?? null;
  const most = beallitas.most ?? Date.now();
  const lanc = koino ? lancBemenetbol(esemenyek, koino) : [];
  if (lanc.length < 2) return { ...(await haromFazis(esemenyek, koino, most, beallitas, null)), mult: null };
  // ⭐ A költözők nemzedékenként: a létrehozó (a születésével) és a beköltözők (a bemenet beköltözéseiből — ④a).
  const koltozok = lancKoltozoi(lanc, beallitas.koltozok instanceof Map ? beallitas.koltozok : null, esemenyek);
  return nemzedekKepe(esemenyek, lanc, koltozok, 0, most, beallitas);
}

/** A `lanc[i]` koinó képe `most`-kor: a múltja (ha van) a vágásakor, rögzítve; a jelene. */
async function nemzedekKepe(esemenyek, lanc, koltozok, i, most, beallitas) {
  let mult = null;
  let rogzitettek = null;
  if (i + 1 < lanc.length) {
    mult = await multKepe(esemenyek, lanc, koltozok, i + 1, lanc[i].ido, beallitas);
    // ⭐ A vágáskor LEZÁRT döntések (elfogadva, elvetve, nem ismert) — a folyamatban lévők a jelenben folytatódnak, ha a
    // javaslattevő költözött (KZ6 (A): a nem költözőé nem — a javaslata nincs a jelen bemenetében).
    rogzitettek = new Map([...mult.javaslatok].filter(([, j]) => j.statusz !== 'folyamatban'));
  }
  const bemenet = esemenyek.filter((e) => jelenbenSzamit(e, lanc, i, koltozok));
  // ⭐⭐ D118 (⑤b): a szerzők LÁNCA ebben a nemzedékben (`lancbanVan`) — a láncon kívüli ős-esemény (a nem költöző múltja) külön
  // ág: nem elágazás és nem idő-visszalépés a gyermekbeli láncához képest; és a láncon lévő, de a jelenből kizárt esemény (a
  // tagsági csomag, az ős születése, az elhagyott pont) ismert sorszám, nem hézag — különben a költöző hazug bemondása csak
  // jelzés volna (mérve).
  const lancAga = (e) => (lancbanVan(e, lanc, i, koltozok) ? e.szerzo : e.szerzo + '|' + esemenyKoinoja(e));
  const ismertSorszamok = new Map();
  for (const e of esemenyek) {
    if (!lancbanVan(e, lanc, i, koltozok) || jelenbenSzamit(e, lanc, i, koltozok)) continue;
    if (!ismertSorszamok.has(e.szerzo)) ismertSorszamok.set(e.szerzo, new Set());
    ismertSorszamok.get(e.szerzo).add(e.sorszam);
  }
  const kep = await haromFazis(bemenet, lanc[i].azonosito, most, { ...beallitas, lancAga, ismertSorszamok }, rogzitettek);
  return { ...kep, mult };
}

// A múlt képei: kulcs → kép (a bemenet lenyomata szerint — a múlt csak bővül, és akkor új a kulcs).
const multGyorsitotar = new Map();
const MULT_EMLEK = 8;

/** Egy ős (`lanc[i]`) képe a vágáskor (`vagas`) — gyorsítótárból, ha a múlt bemenete azóta nem változott. */
async function multKepe(esemenyek, lanc, koltozok, i, vagas, beallitas) {
  const nevek = new Set(lanc.slice(i).map((sz) => sz.azonosito));
  const azonositok = esemenyek.filter((e) => nevek.has(esemenyKoinoja(e))).map((e) => e.azonosito).sort();
  const kulcs = lanc[i].azonosito + '|' + vagas + '|' + lenyomatSzinkron(azonositok);
  const kesz = multGyorsitotar.get(kulcs);
  if (kesz) return kesz;
  const kep = await nemzedekKepe(esemenyek, lanc, koltozok, i, vagas, { csakAtmeneti: beallitas.csakAtmeneti,
    nemTartott: beallitas.nemTartott });
  if (multGyorsitotar.size >= MULT_EMLEK) multGyorsitotar.delete(multGyorsitotar.keys().next().value);
  multGyorsitotar.set(kulcs, kep);
  return kep;
}

/** A három fázis egy rétegen. */
async function haromFazis(bemenet, koino, most, beallitas, rogzitettek) {
  const allapot = allapotSzamitasa(bemenet, {
    ...(koino ? { koino } : {}),
    ...(beallitas.csakAtmeneti ? { csakAtmeneti: beallitas.csakAtmeneti } : {}),
    ...(beallitas.nemTartott ? { nemTartott: beallitas.nemTartott } : {}),
    ...(beallitas.lancAga ? { lancAga: beallitas.lancAga, ismertSorszamok: beallitas.ismertSorszamok } : {})
  });
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most, {
    ...(beallitas.osszegzesek ? { osszegzesek: beallitas.osszegzesek } : {}),
    ...(rogzitettek ? { rogzitettek } : {})
  });
  await szerkesztesiEgyezmenyekAlkalmazasa(allapot, javaslatok);
  return { allapot, javaslatok };
}
