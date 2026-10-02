// koino/js/allapot/dontesiCsomag.js

// Felelősség: A DÖNTÉSI CSOMAG TARTALMA (D85 T3, (a2) — Csaba, 2026-10-03) — hálózat és tár nélkül.
//
// ===== MIRE VALÓ =====
//
// Egy több érintettes javaslat (egyesítés, csomag) a prototípus szerint csak akkor fogadható el, ha
// MINDEN része teljesíti a saját küszöbét (ÉS), és a lezárás közös. A G1 sorsához tehát a G2-es rész
// minden bemenete kell — a G2 tulajdonosai, küszöbei és a szavazatok a lezárásig —, és nem csak a
// javaslat tartóinak, hanem a G1 NEM SZAVAZÓ tartóinak is (D17: mindenki maga számol). A szigorú (b)
// mellett ezek a G2 szeletében vannak, a csak-G1-tartónál nem.
//
// ⭐ A válasz (T3): a VALÓDI adat jut el, egy csomagban — a lezárás után a javaslattevő (minden érintetten
// pontja van, tehát minden érintett szeletét tartja) kiadja a döntés bemenetének aláírt MÁSOLATAIT. A
// csomag minden érintett szeletébe bejelentődik, a benne lévő események ugyanazon a kapun mennek be
// (3. szabály). ⛔ Összegzés (a (b)) NEM lehet: a teljességéért — hogy egy tulajdonos sem maradt ki —
// senki nem kezeskedhet. Ha egy csomagból hiányzik valami, egy másik teljesebb pótolja: a számítás az
// UNIÓN fut, ezért a csomag darabolható is.
//
// ===== MI KERÜL BELE — és mi nem =====
//
// A döntés-számítás (`javaslatSzamitas.js`, `reszekSzamitasa`) időrendben játssza le a szavazatokat és
// az érintettek pont- és küszöb-eseményeit a lezárásig; szerzőnként a NAGYOBB sorszámú nyer. Ezért:
//   · a javaslat maga és a szavazatai a lezárásig — mind;
//   · az érintettek LÉTREHOZÓ eseménye — a végrehajtásnak kell (egyesítésnél az elnyelő a beolvadó
//     tulajdonosait is átveszi, ehhez a beolvadónak léteznie kell a csak-G1-tartónál is);
//   · minden érintett pont- (`TudatpontRendezes`) és küszöb-eseménye (`ErtekJavaslat`):
//       – a javaslat születése ELŐTTIEKBŐL szerzőnként csak a legnagyobb sorszámú (a többit felülírta —
//         a lejátszás állapota a születés pillanatában ugyanaz nélkülük is),
//       – a születés és a lezárás KÖZÖTTIEK mind (ezek mozgatják a nevezőt és a határidőt).
// A lezárás utáni esemény nem számít, ezért nem kerül bele. ⚠️ A régi (lánc-gyökér nélküli) szavazatok
// jogát a javaslat-entitás pont-eseményei döntenék el — azokat nem visszük: a D85/2 óta a szavazat a
// saját bizonyítékát hozza.
//
// Használják: a művelet-réteg (a csomag kiadása), a 55. mérés, a próbák.

import { erintettek } from './szabalyok.js';

// ⛔ Egy csomag-esemény a vonalon EGY sor, és a sor legfeljebb 8 MB (`vonal.js`, `SOR_KORLAT`). A
// tartalom ennek a felét kapja — a burok (aláírás, lánc-gyökér) és a JSON így biztosan elfér.
export const CSOMAG_BAJT_KORLAT = 4 * 1024 * 1024;

const bajt = (e) => Buffer.byteLength(JSON.stringify(e), 'utf8');

/**
 * Egy több érintettes javaslat döntésének BEMENETE a lezárásig.
 *
 * @param {Array<Object>} esemenyek - a számító események (`allapot.szamitok`)
 * @param {Object} javaslatEsemeny - a `Javaslat` esemény
 * @param {number} lezarasIdeje - a közös lezárás (`javaslatokSzamitasa` → `lezarasIdeje`)
 * @returns {Array<Object>} a bemenet eseményei, azonosító szerint rendezve (determinisztikus)
 */
export function dontesBemenete(esemenyek, javaslatEsemeny, lezarasIdeje) {
  const javaslat = javaslatEsemeny.azonosito;
  const szuletes = javaslatEsemeny.ido;
  const erintettHalmaz = new Set(erintettek(javaslatEsemeny.adat).map((r) => r.entitas));

  const ki = new Map([[javaslat, javaslatEsemeny]]);
  // (szerző | entitás | típus) → a születés előtti legnagyobb sorszámú
  const elozmeny = new Map();

  for (const e of esemenyek) {
    if (erintettHalmaz.has(e.azonosito)) { ki.set(e.azonosito, e); continue; }   // az érintett létrehozása
    if (e.ido > lezarasIdeje) continue;                         // a lezárás után már nem számít
    if (e.tipus === 'Szavazat') {
      if (e.adat?.javaslat === javaslat) ki.set(e.azonosito, e);
      continue;
    }
    if (e.tipus !== 'TudatpontRendezes' && e.tipus !== 'ErtekJavaslat') continue;
    const entitas = e.adat?.entitas;
    if (!erintettHalmaz.has(entitas)) continue;
    if (e.ido >= szuletes) { ki.set(e.azonosito, e); continue; }   // az ablak: mind
    const kulcs = e.szerzo + '|' + entitas + '|' + e.tipus;
    const eddigi = elozmeny.get(kulcs);
    if (!eddigi || e.sorszam > eddigi.sorszam) elozmeny.set(kulcs, e);
  }
  for (const e of elozmeny.values()) ki.set(e.azonosito, e);

  return [...ki.values()].sort((a, b) => (a.azonosito < b.azonosito ? -1 : a.azonosito > b.azonosito ? 1 : 0));
}

/**
 * A bemenet DARABOLÁSA csomagokra, bájt-korláttal — a csomagok uniója a teljes bemenet.
 *
 * @param {Array<Object>} esemenyek - rendezve (`dontesBemenete`)
 * @param {number} [korlat]
 * @returns {Array<Array<Object>>}
 */
export function csomagokra(esemenyek, korlat = CSOMAG_BAJT_KORLAT) {
  const csomagok = [];
  let aktualis = [];
  let meret = 0;
  for (const e of esemenyek) {
    const b = bajt(e);
    if (aktualis.length && meret + b > korlat) {
      csomagok.push(aktualis);
      aktualis = [];
      meret = 0;
    }
    aktualis.push(e);
    meret += b;
  }
  if (aktualis.length) csomagok.push(aktualis);
  return csomagok;
}
