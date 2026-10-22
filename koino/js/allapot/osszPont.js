// koino/js/allapot/osszPont.js

// Felelősség: AZ ÖSSZ-PONT A SZELETELT VILÁGBAN (D76/2, D92/5) — a felfelé összegzés, a részfa-fa, a súlyozott
// szúrópróba és a kérdező oldali ellenőrzése. Hálózat nélkül (1. szabály): számol, mintát ad, ellenőriz; hogy a
// kérdés és a válasz min utazik, az a kérelmezés dolga.
//
// ===== MI AZ ÖSSZ-PONT =====
//
//   össz-pont(X) = Σ a szerzők pontja X-en  +  Σ a gyerekek össz-pontja
//
// ⭐ A pakli ez szerint rendez (D76/2). A szeletelt világban a leszármazottak pontjait a leszármazottak szeleteiben
// tartják — senki nem látja egyben (a „végtelen” szerint nem is láthatja). Ezért FELFELÉ ÖSSZEGZŐDIK (D92/5): X
// tartója a saját pontokból és a gyerekek össz-pontjából számol — amelyik gyereket tartja, azét maga számolja,
// amelyiket nem, annak a BEMONDOTT össz-pontját veszi (egy korábbi fejléc-válaszból, a kérelmezés gyorsítótárából).
// ⛔ Ami se nem ismert, se nem bemondott, az 0 — és ezt kimondjuk (`bizonytalan`, D19), nem hallgatjuk el.
//
// ===== AZ ELLENŐRZÉS (D78: az össz-pont a NÉZETÉ, nem a döntésé) =====
//
// X tartója egy állapot-fát épít X részfájáról: levelenként egy szerző saját pontja ('p:' + szerző → az aláírt
// pont-esemény azonosítója) és egy gyerek össz-pontja ('g:' + gyerek); a gyökér összege az össz-pont. A kérdező a
// gyökér bemondása UTÁN k véletlen egységet választ (`mintaHelyek`), a tartó a levelek bizonyítékát adja
// (`fejlecMintai`), a kérdező ellenőrzi (`fejlecEllenorzese`): a levél tartománya fedi a mintát, és egy szerzői
// levélhez az aláírt pont-esemény ugyanazt mondja. A felfújt rész hamis levelekben van, és k mintából 1 − (1 − f)^k
// eséllyel lebukik (62. mérés). ⚠️ A határai, kimondva: (1) egy gyerek-levél bemondás — akkor ellenőrizhető, amikor
// a nézet oda lép (a gyerek tartóinál); (2) az egyezmény által ÁTVITT pontnak (egyesítés, különválás) nincs saját
// eseménye — az ilyen minta „nem ellenőrizhető”, nem csalás; (3) a frissesség törekvés: egy régi pont-esemény
// is hiteles aláírás (a tartó a későbbit elhallgathatja) — ezért a „legnagyobb ellenőrzött válasz” számít.
//
// ===== A TARTÓ TERHE (62. mérés) =====
//
// A fa egy változása logaritmikus (< 1 ms), a nulláról építés 10 000 szerzőnél ~7 s — ezért a karbantartó
// (`reszfaKarbantarto`) a fát nem építi újra, hanem a levelek KÜLÖNBSÉGÉT vezeti rá.
//
// ===== ⭐⭐ D116: AZ ÖSSZ-DARAB ÉS A GYEREKSZÁM (2026-10-22, Csaba: „(B) Gyerekszám + össz-darab”) =====
//
// Ugyanaz a felfelé összegzés a DARABRA: alatta(X) = Σ a gyerekek (1 + alatta) — hány entitás van X alatt összesen. A
// részfa-fa ezért három összeget visz levelenként: [pont, darab, gyerek] — a szerzői levél [pont, 0, 0], a gyerek-levél
// [össz-pont, 1 + alatta, 1]; a gyökérben így az össz-pont, az alatta és a gyerekszám áll, és mind a hármat ugyanaz a fa köti.
// ⭐ Ebből tudja a készülék, hogy egy csomópont alatt mennyi van, amit még nem ismer (a cím nélkül — a 9. szabály szerint a
// koinó teljes szerkezetét senki nem tarthatja, a darabszámát irányonként igen). ⛔ A szúrópróba a darabra is kell: a DARAB
// szerinti minta (a nagy ágra nagyobb eséllyel esik) a darabot hordozó szerzői levelet és a kitalált gyereket fogja meg, a
// GYEREK szerinti (egyenletes a gyerekek közt) a gyerekszámot felfújó levelet — és az eltalált gyerek aláírt születése (a
// szülője X) a válaszban jön. ⚠️ A határ ugyanaz, mint az össz-pontnál: egy valódi gyerek felfújt darabja bemondás — ott
// ellenőrizhető, ahová a nézet lép.
//
// Használják: a kérelmezés (a fejléc-válasz és az ellenőrzése), a pakli, a próbák.

import { randomInt } from 'node:crypto';
import {
  ujAllapotFa, allapotBeallitas, allapotTorles, allapotGyokere, allapotSulyozottKeresese,
  allapotSulyozottEllenorzese
} from '../esemeny/osszegzoFa.js';
import { esemenyEllenorzese } from '../esemeny/esemeny.js';

/** A részfa-fa típusa (a lenyomatokban — más fa-típussal nem keverhető). */
export const OSSZPONT_FA = 'osszpont';

/** ⭐ D116: a részfa-fa összegei levelenként — [pont, darab, gyerek] (a hossz a lenyomatban is benne van). */
export const RESZFA_HOSSZ = 3;
export const RESZFA_PONT = 0;
export const RESZFA_DARAB = 1;
export const RESZFA_GYEREK = 2;

/** Hány részfa-fát tart a karbantartó a memóriában (a legrégebben használt megy). */
export const RESZFA_FA_KORLAT = 256;

/** Egy fejléc-válaszban legfeljebb ennyi minta (a kérdező kérése felülről korlátos). */
export const MINTA_KORLAT = 32;

// ===================================
// A FELFELÉ ÖSSZEGZÉS
// ===================================

/** A gyerekek jegyzéke (szülő → gyerekek), a meglévő entitásokból. */
export function gyerekJegyzek(entitasok) {
  const ki = new Map();
  for (const e of entitasok.values()) {
    if (!e.szulo || !entitasok.has(e.szulo)) continue;
    if (!ki.has(e.szulo)) ki.set(e.szulo, []);
    ki.get(e.szulo).push(e.azonosito);
  }
  for (const lista of ki.values()) lista.sort();
  return ki;
}

const bemondasErvenyes = (b) => !!b && Number.isSafeInteger(b.osszPont) && b.osszPont >= 0;
/** ⭐ D116: a bemondás hozza-e az alatta lévők számát (a régi — D116 előtti — bemondás nem). */
const alattaErvenyes = (b) => Number.isSafeInteger(b?.alatta) && b.alatta >= 0;
/** A bemondott alatta: a szám, és ha a tartó maga sem tudta pontosan, a „bizonytalan” (nem ismert hozzá: 1). */
const bemondottAlatta = (b) => (alattaErvenyes(b)
  ? { alatta: b.alatta, alattaBizonytalan: Number.isSafeInteger(b.alattaBizonytalan) && b.alattaBizonytalan > 0 ? b.alattaBizonytalan : 0 }
  : { alatta: 0, alattaBizonytalan: 1 });

/**
 * ⭐ AZ ÖSSZ-PONT minden ismert entitásra, felfelé összegezve.
 *
 * Egy entitás SAJÁT pontja akkor ismert, ha a szeletét tartjuk (nincs `pontokIsmeretlenek` jelzése); ha nem, a
 * bemondott össz-pontját vesszük (és a gyerekeit nem járjuk be — azok benne vannak a bemondásban); ha az sincs, a saját
 * pontja 0, de az ISMERT gyerekei számítanak (`bizonytalan` +1).
 * ⛔ D101 ④ (a Síkidom bekötés-próbája mérte): a NEM TARTOTT entitásnál akkor is a bemondás számít, ha a saját pontjait
 * véletlenül ismerjük (pl. a gyökér-darabbal jöttek) — a gyerekeit ilyenkor sem ismerjük mind, és a „saját + az ismert
 * gyerekek” alulszámol (egy ág a fele értékén állt, és a bejáró biztos előtagja ettől hibásan bővült). Ehhez kell a
 * `tartott`; nélküle (vagy ha mindent tartok) csak a `pontokIsmeretlenek` jelzés dönt, mint eddig.
 * ⚠️ A `szulo`-lánc körbe mutathat (hibás vagy rosszindulatú esemény): a körbe eső entitás csak egyszer számít.
 * ⭐ D116: ugyanebben a bejárásban az ALATTA (hány entitás van alatta): a bemondott a bemondásból (a régi bemondásban nincs —
 * akkor „nem tudom”), a többi a gyerekekből; az `alattaBizonytalan` megmondja, hány csomópont gyerekeit nem ismerjük
 * biztosan a részfában (a nem tartott, és a bemondás nélküli) — 0, ha az alatta pontos, különben alsó korlát.
 *
 * @param {Map<string, Object>} entitasok - az állapot entitásai
 * @param {Map<string, {osszPont: number, alatta?: number, alattaBizonytalan?: number}>} [bemondasok] - a nem tartott
 *   entitások bemondott össz-pontja (és D116 óta az alatta lévők száma)
 * @param {Function|null} [tartott] - az → tartom-e a szeletét (null: nem tudom — a régi viselkedés)
 * @returns {Map<string, {osszPont: number, sajat: number|null, forras: 'szamolt'|'bemondott'|'ismeretlen',
 *   bizonytalan: number, alatta: number, alattaBizonytalan: number}>} — `bizonytalan`: a részfában hány entitás pontja
 *   nem ismert és nincs bemondva
 */
export function osszPontokSzamitasa(entitasok, bemondasok = new Map(), tartott = null) {
  const gyerekek = gyerekJegyzek(entitasok);
  const ki = new Map();
  const folyamatban = new Set();

  // Iteratív utólagos bejárás (mély fánál sincs veremtúlcsordulás).
  for (const kezdo of entitasok.keys()) {
    if (ki.has(kezdo)) continue;
    const verem = [[kezdo, false]];
    while (verem.length) {
      const [az, kesz] = verem.pop();
      if (ki.has(az)) continue;
      const e = entitasok.get(az);
      // ⭐ „Ismeretlen” (a bemondás dönt): ha a pontjait nem láttuk, VAGY ha a szeletét nem tartjuk és van bemondás.
      const ismeretlen = !!e.pontokIsmeretlenek
        || (typeof tartott === 'function' && !tartott(az) && bemondasErvenyes(bemondasok.get(az)));
      // ⭐ D95/1: a NAGY szeletet összegezve tartom — a saját pontjaim megvannak, a többi pont-tartóé nem; az össz-pontot a
      // teljes tartótól kapott, mintákkal ellenőrzött gyökér adja (`osszegzett` jelű bemondás — az egész részfát fedi).
      const osszegzett = !ismeretlen && bemondasok.get(az)?.osszegzett === true && bemondasErvenyes(bemondasok.get(az));
      if (!kesz) {
        if (folyamatban.has(az)) continue;          // kör: ez az ág már a veremben van
        folyamatban.add(az);
        verem.push([az, true]);
        // A bemondott (nem tartott) entitás gyerekeit nem járjuk be — a bemondás az egész részfát fedi.
        const bemondott = (ismeretlen && bemondasErvenyes(bemondasok.get(az))) || osszegzett;
        if (!bemondott) for (const g of gyerekek.get(az) ?? []) if (!ki.has(g) && !folyamatban.has(g)) verem.push([g, false]);
        continue;
      }
      folyamatban.delete(az);
      if (ismeretlen && bemondasErvenyes(bemondasok.get(az))) {
        ki.set(az, { osszPont: bemondasok.get(az).osszPont, sajat: null, forras: 'bemondott', bizonytalan: 0,
          ...bemondottAlatta(bemondasok.get(az)) });
        continue;
      }
      if (osszegzett) {
        ki.set(az, { osszPont: bemondasok.get(az).osszPont, sajat: e.osszesPont, forras: 'osszegzett', bizonytalan: 0,
          ...bemondottAlatta(bemondasok.get(az)) });
        continue;
      }
      let osszPont = ismeretlen ? 0 : e.osszesPont;
      let bizonytalan = ismeretlen ? 1 : 0;
      // ⭐ D116: a nem tartott (és nem bemondott) csomópont gyerekeit nem ismerjük biztosan — az alatta alsó korlát.
      let alatta = 0;
      let alattaBizonytalan = ismeretlen || (typeof tartott === 'function' && !tartott(az)) ? 1 : 0;
      for (const g of gyerekek.get(az) ?? []) {
        const gy = ki.get(g);
        if (!gy) continue;                             // körbe eső gyerek: egyszer már számított
        osszPont += gy.osszPont;
        bizonytalan += gy.bizonytalan;
        alatta += 1 + gy.alatta;
        alattaBizonytalan += gy.alattaBizonytalan;
      }
      ki.set(az, ismeretlen ? { osszPont, sajat: null, forras: 'ismeretlen', bizonytalan, alatta, alattaBizonytalan }
        : { osszPont, sajat: e.osszesPont, forras: 'szamolt', bizonytalan, alatta, alattaBizonytalan });
    }
  }
  return ki;
}

/**
 * ⭐ D116: hány entitást ISMEREK egy csomópont alatt (a helyben meglévő leszármazottak) — a bemondott alatta párja: a kettő
 * különbsége az, amit ebben az irányban még nem derítettem fel. Iteratív, körbiztos (a körbe eső csak egyszer számít).
 * @param {Map<string, Object>} entitasok
 * @param {Map<string, Array<string>>} [gyerekek] - `gyerekJegyzek` (ha a hívónál már megvan)
 * @returns {Map<string, number>}
 */
export function ismertAlattaSzamitasa(entitasok, gyerekek = gyerekJegyzek(entitasok)) {
  const ki = new Map();
  const folyamatban = new Set();
  for (const kezdo of entitasok.keys()) {
    if (ki.has(kezdo)) continue;
    const verem = [[kezdo, false]];
    while (verem.length) {
      const [az, kesz] = verem.pop();
      if (ki.has(az)) continue;
      if (!kesz) {
        if (folyamatban.has(az)) continue;
        folyamatban.add(az);
        verem.push([az, true]);
        for (const g of gyerekek.get(az) ?? []) if (!ki.has(g) && !folyamatban.has(g)) verem.push([g, false]);
        continue;
      }
      folyamatban.delete(az);
      let n = 0;
      for (const g of gyerekek.get(az) ?? []) if (ki.has(g)) n += 1 + ki.get(g);
      ki.set(az, n);
    }
  }
  return ki;
}

// ===================================
// A RÉSZFA-FA
// ===================================

/**
 * X részfájának levelei: a szerzők saját pontja (az aláírt pont-esemény azonosítójával, vagy `atvitt` jelzéssel, ha
 * a pontot egyezmény vitte át — annak nincs saját eseménye) és a gyerekek össz-pontja. A 0 pontú szerzői levél kimarad.
 * ⭐ D116: minden levél három összeget visz ([pont, darab, gyerek] — `RESZFA_HOSSZ`): a szerzői [pont, 0, 0], a gyerek
 * [össz-pont, 1 + alatta, 1] — ezért a gyerek-levél akkor is a fában van, ha az össz-pontja 0 (a darabja nem az).
 *
 * @param {string} azonosito
 * @param {Object} allapot - az állapot (`entitasok`, `pontEsemenyek`)
 * @param {Map} osszPontok - `osszPontokSzamitasa`
 * @param {Map} [gyerekek] - `gyerekJegyzek` (ha a hívónál már megvan)
 * @returns {Array<{kulcs: string, ertek: *, osszegek: Array<number>}>}
 */
export function reszfaLevelei(azonosito, allapot, osszPontok, gyerekek = gyerekJegyzek(allapot.entitasok)) {
  const e = allapot.entitasok.get(azonosito);
  if (!e || e.pontokIsmeretlenek) return [];
  const ki = [];
  for (const [szerzo, h] of e.hozzajarulok) {
    if (!(h.pont > 0)) continue;
    const esemeny = allapot.pontEsemenyek?.get(szerzo + '|' + azonosito);
    ki.push({ kulcs: 'p:' + szerzo, ertek: esemeny ? { e: esemeny } : { atvitt: true }, osszegek: [h.pont, 0, 0] });
  }
  for (const g of gyerekek.get(azonosito) ?? []) {
    const o = osszPontok.get(g);
    if (o) ki.push({ kulcs: 'g:' + g, ertek: null, osszegek: [o.osszPont, 1 + (o.alatta ?? 0), 1] });
  }
  return ki;
}

const levelKulcsa = (l) => JSON.stringify([l.ertek, l.osszegek]);

/**
 * ⭐ A RÉSZFA-FÁK KARBANTARTÓJA: entitásonként egy állapot-fa, amire a levelek KÜLÖNBSÉGÉT vezeti rá (a fa egy
 * változása logaritmikus — a nulláról építés nagy részfánál másodpercek, 62. mérés). Korlátos: a legrégebben
 * használt fa kiesik (`RESZFA_FA_KORLAT`).
 */
export function reszfaKarbantarto(korlat = RESZFA_FA_KORLAT) {
  const fak = new Map();          // azonosító → { fa, levelek: Map(kulcs → levelKulcsa) }
  return {
    /** A friss fa a megadott levelekhez (a különbséget vezeti rá). */
    async fa(azonosito, levelek) {
      let b = fak.get(azonosito);
      if (b) fak.delete(azonosito);
      else b = { fa: ujAllapotFa(OSSZPONT_FA, RESZFA_HOSSZ), levelek: new Map() };
      fak.set(azonosito, b);                          // a legutóbb használt a végére
      const uj = new Map(levelek.map((l) => [l.kulcs, l]));
      for (const kulcs of [...b.levelek.keys()]) {
        if (!uj.has(kulcs)) { await allapotTorles(b.fa, kulcs); b.levelek.delete(kulcs); }
      }
      for (const [kulcs, l] of uj) {
        const lk = levelKulcsa(l);
        if (b.levelek.get(kulcs) === lk) continue;
        await allapotBeallitas(b.fa, kulcs, l.ertek, l.osszegek);
        b.levelek.set(kulcs, lk);
      }
      while (fak.size > korlat) fak.delete(fak.keys().next().value);
      return b.fa;
    },
    meret: () => fak.size
  };
}

// ===================================
// A SZÚRÓPRÓBA
// ===================================

/**
 * A KÉRDEZŐ választja a minta-helyeket — a gyökér bemondása UTÁN (különben a tartó addig próbálkozna, amíg a minták
 * el nem kerülik a hamis leveleket). Kriptográfiai véletlen.
 * @param {number} osszeg - a bemondott össz-pont
 * @param {number} k
 * @returns {Array<number>}
 */
export function mintaHelyek(osszeg, k) {
  if (!Number.isSafeInteger(osszeg) || osszeg <= 0) return [];
  const db = Math.max(0, Math.min(MINTA_KORLAT, Number.isInteger(k) ? k : 0));
  return Array.from({ length: db }, () => (osszeg <= 0xffffffffffff ? randomInt(osszeg) : Math.floor(Math.random() * osszeg)));
}

/**
 * ⭐ D116: minta-helyek egy MÁSIK összeg szerint (a darab — `RESZFA_DARAB` —, vagy a gyerek — `RESZFA_GYEREK`): a hely
 * egy pár, [összeg, r] — a puszta szám továbbra is a pont szerinti hely (a régi alak).
 * @returns {Array<[number, number]>}
 */
export function mintaHelyekOsszegre(i, osszeg, k) {
  return mintaHelyek(osszeg, k).map((r) => [i, r]);
}

/** Egy minta-hely alakja: { i, r } — a puszta szám a pont szerinti; a pár [i, r] a többi összeg szerinti. */
function helyAlakja(h) {
  if (Number.isSafeInteger(h) && h >= 0) return { i: RESZFA_PONT, r: h };
  if (Array.isArray(h) && h.length === 2 && (h[0] === RESZFA_DARAB || h[0] === RESZFA_GYEREK)
      && Number.isSafeInteger(h[1]) && h[1] >= 0) return { i: h[0], r: h[1] };
  return null;
}

/**
 * A TARTÓ válasza a minta-helyekre: a levelek és a bizonyítékuk (`MINTA_KORLAT` felett nem válaszol többre).
 * @returns {Promise<Array<{r: number, i?: number, kulcs: string, bizonyitek: Object}>>}
 */
export async function fejlecMintai(fa, helyek) {
  const ki = [];
  for (const h of (Array.isArray(helyek) ? helyek : []).slice(0, MINTA_KORLAT)) {
    const hely = helyAlakja(h);
    if (!hely) continue;
    const m = await allapotSulyozottKeresese(fa, hely.r, hely.i);
    if (m) ki.push({ r: hely.r, ...(hely.i ? { i: hely.i } : {}), kulcs: m.kulcs, bizonyitek: m.bizonyitek });
  }
  return ki;
}

/**
 * ⭐ A KÉRDEZŐ ELLENŐRZÉSE: minden kért helyre jött-e minta, a bizonyíték a bemondott gyökérhez tartozik-e és a
 * levél tartománya fedi-e a helyet; egy szerzői levélnél az aláírt pont-esemény ugyanazt mondja-e (a szerző, az
 * entitás, a pont). ⛔ Egyetlen hamis minta az egész fejlécet elveti (a tartó hazudott); az átvitt pont és a
 * gyerek-levél nem hiba, hanem kimondott korlát.
 *
 * @param {Object} b
 * @param {string} b.azonosito - X
 * @param {Object} b.gyoker - a bemondott gyökér összegzése ({l, d, o})
 * @param {Array<number>} b.helyek - amiket a kérdező kért
 * @param {Array} b.mintak - a tartó válasza (`fejlecMintai`)
 * ⭐ D116: a darab és a gyerek szerinti mintánál (a hely egy pár — `mintaHelyekOsszegre`) a levél alakja is kötött (a
 * szerzői [x, 0, 0], a gyerek [x, ≥ 1, 1]), és az eltalált gyerek SZÜLETÉSE kell: hiteles, az övé, és a szülője X (ha nem
 * X, az egyezmény helyezte át — `athelyezett`, kimondott korlát, nem csalás). ⛔ A hiányzó születés itt hiba: e nélkül egy
 * kitalált gyerek levele átmenne (a pont-mintánál a hiányzó esemény csak kimondott, mert a levél az azonosítóját köti).
 *
 * @param {Map<string, Object>} b.esemenyek - a kapott (vagy már meglévő) pont-események azonosító szerint
 * @param {Map<string, Object>} [b.szuletesek] - D116: a gyerekek létrehozó eseményei (gyerek → esemény)
 * @param {Function} [b.szuloje] - D116: (létrehozó esemény, gyerek) → a szülője (null: legfelső szintű), undefined: nem az övé
 * @returns {Promise<{rendben: boolean, ok?: string, ellenorzott: number, atvitt: number, gyerek: number,
 *   hianyzoEsemeny: number, darabEllenorzott: number, athelyezett: number}>}
 */
export async function fejlecEllenorzese({ azonosito, gyoker, helyek, mintak, esemenyek = new Map(), szuletesek = new Map(),
  szuloje = null }) {
  const ered = { rendben: true, ellenorzott: 0, atvitt: 0, gyerek: 0, hianyzoEsemeny: 0, darabEllenorzott: 0, athelyezett: 0 };
  const hiba = (ok) => ({ ...ered, rendben: false, ok });
  if (!Array.isArray(helyek) || !Array.isArray(mintak) || mintak.length !== helyek.length) return hiba('nem minden helyre jött minta');
  for (let i = 0; i < helyek.length; i++) {
    const m = mintak[i];
    const hely = helyAlakja(helyek[i]);
    if (!m || !hely || m.r !== hely.r || (m.i ?? RESZFA_PONT) !== hely.i || typeof m.kulcs !== 'string') {
      return hiba('a minta nem a kért helyre szól');
    }
    const e = await allapotSulyozottEllenorzese(OSSZPONT_FA, RESZFA_HOSSZ, gyoker, m.kulcs, m.bizonyitek, m.r, hely.i);
    if (!e.rendben) return hiba('hamis minta: ' + e.ok);
    // ⭐ D116: a levél alakja — a szerzői nem hordoz darabot, a gyerek-levél egy gyerek, legalább önmaga.
    const [, darab, gyerek] = e.osszegek;
    if (m.kulcs.startsWith('p:') && (darab !== 0 || gyerek !== 0)) return hiba('a szerzői levél darabot hordoz');
    if (m.kulcs.startsWith('g:') && (gyerek !== 1 || !(darab >= 1))) return hiba('hibás gyerek-levél');
    if (m.kulcs.startsWith('g:') && hely.i !== RESZFA_PONT) {
      const gy = m.kulcs.slice(2);
      const sz = szuletesek.get(gy);
      if (!sz || typeof szuloje !== 'function') return hiba('a minta gyerekének születése nem jött meg');
      const szulo = szuloje(sz, gy);
      if (szulo === undefined) return hiba('a születés nem a minta gyereké');
      const al = await esemenyEllenorzese(sz);
      if (!al.rendben) return hiba('a minta gyerekének születése nem hiteles: ' + al.ok);
      if (szulo === azonosito) ered.darabEllenorzott++;
      else ered.athelyezett++;
      continue;
    }
    if (m.kulcs.startsWith('g:')) { ered.gyerek++; continue; }
    if (!m.kulcs.startsWith('p:')) return hiba('ismeretlen levél-fajta');
    if (hely.i !== RESZFA_PONT) return hiba('a szerzői levélre darab-minta esett');
    if (e.ertek?.atvitt === true) { ered.atvitt++; continue; }
    const esemeny = esemenyek.get(e.ertek?.e);
    if (!esemeny) { ered.hianyzoEsemeny++; continue; }
    const szerzo = m.kulcs.slice(2);
    if (esemeny.tipus !== 'TudatpontRendezes' || esemeny.szerzo !== szerzo || esemeny.adat?.entitas !== azonosito
        || esemeny.adat?.pont !== e.osszegek[0]) return hiba('a pont-esemény mást mond, mint a levél');
    const al = await esemenyEllenorzese(esemeny);
    if (!al.rendben) return hiba('a pont-esemény nem hiteles: ' + al.ok);
    ered.ellenorzott++;
  }
  return ered;
}

/** A részfa-fa gyökere (a fejléc bemondása). */
export async function reszfaGyokere(fa) {
  return allapotGyokere(fa);
}
