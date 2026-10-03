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
// pontja van, tehát minden érintett szeletét tartja) kiadja a döntés bemenetének aláírt MÁSOLATAIT, és a
// benne lévő eseményeket a kapu egyenként ellenőrzi (3. szabály). ⛔ Összegzés (a (b)) NEM lehet: a
// teljességéért — hogy egy tulajdonos sem maradt ki — senki nem kezeskedhet. Ha egy csomagból hiányzik
// valami, egy másik teljesebb pótolja: a számítás az UNIÓN fut, ezért a csomag darabolható is.
//
// ===== HOVA KERÜL — a (B) (Csaba, 2026-10-03: „legyen a (B)”) =====
//
// ⛔ NEM a gondolat szeletébe: az erősítés lett volna (55. mérés — a kis gondolat tartóira a nagy teljes
// bemenete, egy pont árán, ismételhetően). Hanem a rész TÖREDÉKÉNEK szeletébe (`entitas` = a töredék
// azonosítója): a rész szavazói (pontjuk van a töredéken, D85/2) a cserével magától kapják, a gondolat nem
// szavazó tartója pedig csak akkor kéri el, ha a gondolata SAJÁT része valamikor igent mondott (különben az
// ÉS miatt a gondolat nem változhatott — ezt a saját adatából tudja). ⭐ És CÉLZOTTAN: a G1 töredékébe menő
// csomag csak azt hozza, ami a G1 szeletéből hiányzik (`celbolHianyzik`) — a nagy gondolat tartói nem kapják
// vissza a saját adatukat.
//
// ===== A CSOMAG ALAKJA =====
//
//   { tipus: 'DontesiCsomag', entitas: toredekAzonosito(J, cel),
//     adat: { javaslat: J, cel, esemenyek: [a javaslat maga, …a hiányzó bemenet] } }
//
// A javaslat MINDEN csomagban benne van: a kapu ebből tudja, mi tartozhat bele (az érintettek), és melyik
// töredékbe kerülhet. A számítás a csomagot NEM bontja ki a tárba (akkor a G1-tartó a G2 szeletének egy
// darabját hirdetné, és a csere az egész G2-t áthozná), hanem a számítás bemenetébe (`csomagokKibontasa`).
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
// Használják: a kapu (`esemenyTar.js`: `dontesiCsomagEllenorzese`), az állapot-számítás
// (`csomagokKibontasa`), a művelet-réteg (a csomag kiadása), a 55. mérés, a próbák.

import { erintettek, toredekAzonosito } from './szabalyok.js';
import { esemenyEllenorzese, szelet, bejelentesHelyei, azonositoAlaku } from '../esemeny/esemeny.js';
import { pontEsemenyOnbizonyitasa, hozottBizonyitekokOnbizonyitasa } from './lancGyoker.js';

/** Az esemény típusa. */
export const CSOMAG_TIPUS = 'DontesiCsomag';

// ⛔ Egy csomag-esemény a vonalon EGY sor, és a sor legfeljebb 8 MB (`vonal.js`, `SOR_KORLAT`). A
// tartalom ennek a felét kapja — a burok (aláírás, lánc-gyökér) és a JSON így biztosan elfér.
export const CSOMAG_BAJT_KORLAT = 4 * 1024 * 1024;

/** A javaslat maga is minden csomagban utazik — ennyi helyet hagyunk neki a korláton felül. */
export const CSOMAG_JAVASLAT_TARTALEK = 256 * 1024;

/** Ami a döntés bemenete lehet (és semmi más — beágyazott csomag vagy vád sem). */
const BELSO_TIPUSOK = new Set(['Javaslat', 'Szavazat', 'GondolatLetrehozas', 'TudatpontRendezes', 'ErtekJavaslat']);

export const bajt = (e) => Buffer.byteLength(JSON.stringify(e), 'utf8');

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

// ===================================
// ⭐ A CÉLZÁS — mi hiányzik a cél szeletéből
// ===================================

/** Benne van-e az esemény a cél szeletének egyeztetett halmazában (a saját szelete vagy bejelentés)? */
export function celSzeletebenVan(e, cel) {
  return szelet(e) === cel || bejelentesHelyei(e).includes(cel);
}

/**
 * A bemenetből az, ami a cél szeletéből HIÁNYZIK — ezt viszi a cél töredékébe menő csomag (a (B) 3. pontja).
 * @param {Array<Object>} bemenet - `dontesBemenete`
 * @param {string} cel - az érintett, akinek a töredékébe a csomag kerül
 */
export function celbolHianyzik(bemenet, cel) {
  return bemenet.filter((e) => !celSzeletebenVan(e, cel));
}

// ===================================
// ⛔ A KAPU — a csomag tartalma is itt megy át (3. szabály)
// ===================================

/**
 * ⛔ A DÖNTÉSI CSOMAG ELLENŐRZÉSE — a kapu (`esemenyMentese`) hívja. A csomag maga aláírt esemény (azt a
 * kapu már ellenőrizte); itt a TARTALMA: az alak, a hely (a cél töredékének szelete), és minden belső
 * esemény — hogy a döntés bemenete-e (csak a javaslat, a szavazatai, a többi érintett létrehozása, pont- és
 * küszöb-eseményei), és hogy ugyanúgy megáll-e, mintha egyenként jött volna (lenyomat, aláírás, a pont-
 * esemény és a hozott bizonyítékok önbizonyítása). ⛔ Egyetlen hamis vagy idegen belső esemény az egész
 * csomagot elveti — a számítás a tárban lévő csomagot hiszi el, mint az aláírást.
 * ⚠️ Amit NEM néz: hogy a csomag TELJES-e (azért senki nem kezeskedhet — egy teljesebb pótolja), és az
 * időbeli válogatást (a lezárás utáni esemény ártalmatlan: a számítás úgyis kihagyja).
 *
 * @param {Object} e - a `DontesiCsomag` esemény
 * @returns {Promise<{rendben: boolean, ok?: string}>}
 */
export async function dontesiCsomagEllenorzese(e) {
  if (e?.tipus !== CSOMAG_TIPUS) return { rendben: true };
  const hiba = (ok) => ({ rendben: false, ok: 'a döntési csomag ' + ok });
  const a = e.adat;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return hiba('adata nem objektum');
  if (Object.keys(a).sort().join(',') !== 'cel,esemenyek,javaslat') return hiba('mezői nem a várt hármas');
  if (!azonositoAlaku(a.javaslat) || !azonositoAlaku(a.cel)) return hiba('javaslata vagy célja nem azonosító');
  if (!Array.isArray(a.esemenyek) || a.esemenyek.length < 2) return hiba('üres (a javaslaton kívül semmit nem hoz)');
  if (bajt(a) > CSOMAG_BAJT_KORLAT + CSOMAG_JAVASLAT_TARTALEK) return hiba('túl nagy');

  const javaslat = a.esemenyek.find((x) => x?.azonosito === a.javaslat);
  if (!javaslat || javaslat.tipus !== 'Javaslat') return hiba('nem hozza magát a javaslatot');
  const kik = erintettek(javaslat.adat).map((r) => r.entitas);
  if (kik.length < 2) return hiba('egy érintettes javaslathoz tartozna (ott nem kell csomag)');
  if (!kik.includes(a.cel)) return hiba('célja nem érintettje a javaslatnak');
  if (e.entitas !== toredekAzonosito(a.javaslat, a.cel)) return hiba('nem a cél töredékének szeletében van');

  const masok = new Set(kik.filter((k) => k !== a.cel));
  const latott = new Set();
  for (const x of a.esemenyek) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return hiba('egy belső eleme nem esemény');
    if (latott.has(x.azonosito)) return hiba('egy eseményt kétszer hoz');
    latott.add(x.azonosito);
    if (x.koino !== e.koino) return hiba('más koinó eseményét hozza');
    if (!BELSO_TIPUSOK.has(x.tipus)) return hiba('nem a döntés bemenetét hozza (' + x.tipus + ')');
    const ide = x.tipus === 'Javaslat' ? x.azonosito === a.javaslat
      : x.tipus === 'Szavazat' ? x.adat?.javaslat === a.javaslat
        : x.tipus === 'GondolatLetrehozas' ? masok.has(x.azonosito)
          : masok.has(x.adat?.entitas);   // pont- és küszöb-esemény: a TÖBBI érintetten
    if (!ide) return hiba('olyan eseményt hoz, ami nem ennek a döntésnek a bemenete (vagy a cél szeletében van)');
    for (const proba of [esemenyEllenorzese, pontEsemenyOnbizonyitasa, hozottBizonyitekokOnbizonyitasa]) {
      const v = await proba(x);
      if (!v.rendben) return hiba('egy belső eseménye nem áll meg: ' + v.ok);
    }
  }
  return { rendben: true };
}

// ===================================
// A SZÁMÍTÁS BEMENETE — a csomagok tartalma, a tárba bontás nélkül
// ===================================

/**
 * A számítás bemenete a csomagok belső eseményeivel bővítve (azonosító szerint egyszer). ⭐ Nem a tárba
 * bontjuk ki: akkor a G1-tartó a G2 szeletének egy darabját tartaná és hirdetné, és a csere az egész G2-t
 * áthozná. A belső eseményeket a kapu ellenőrizte, amikor a csomag bejött.
 *
 * @param {Array<Object>} esemenyek
 * @returns {Array<Object>} ugyanaz a tömb, ha nincs benne csomag
 */
export function csomagokKibontasa(esemenyek) {
  if (!esemenyek.some((e) => e?.tipus === CSOMAG_TIPUS)) return esemenyek;
  const ismert = new Set(esemenyek.map((e) => e.azonosito));
  const ki = [...esemenyek];
  for (const e of esemenyek) {
    if (e.tipus !== CSOMAG_TIPUS || !Array.isArray(e.adat?.esemenyek)) continue;
    for (const x of e.adat.esemenyek) {
      if (x && typeof x.azonosito === 'string' && !ismert.has(x.azonosito)) {
        ismert.add(x.azonosito);
        ki.push(x);
      }
    }
  }
  return ki;
}
