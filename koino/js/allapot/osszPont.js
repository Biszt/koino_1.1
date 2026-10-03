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
// Használják: a kérelmezés (a fejléc-válasz és az ellenőrzése), a pakli, a próbák.

import { randomInt } from 'node:crypto';
import {
  ujAllapotFa, allapotBeallitas, allapotTorles, allapotGyokere, allapotSulyozottKeresese,
  allapotSulyozottEllenorzese
} from '../esemeny/osszegzoFa.js';
import { esemenyEllenorzese } from '../esemeny/esemeny.js';

/** A részfa-fa típusa (a lenyomatokban — más fa-típussal nem keverhető). */
export const OSSZPONT_FA = 'osszpont';

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

/**
 * ⭐ AZ ÖSSZ-PONT minden ismert entitásra, felfelé összegezve.
 *
 * Egy entitás SAJÁT pontja akkor ismert, ha a szeletét tartjuk (nincs `pontokIsmeretlenek` jelzése); ha nem, a
 * bemondott össz-pontját vesszük (és a gyerekeit nem járjuk be — azok benne vannak a bemondásban); ha az sincs, a saját
 * pontja 0, de az ISMERT gyerekei számítanak (`bizonytalan` +1).
 * ⚠️ A `szulo`-lánc körbe mutathat (hibás vagy rosszindulatú esemény): a körbe eső entitás csak egyszer számít.
 *
 * @param {Map<string, Object>} entitasok - az állapot entitásai
 * @param {Map<string, {osszPont: number}>} [bemondasok] - a nem tartott entitások bemondott össz-pontja
 * @returns {Map<string, {osszPont: number, sajat: number|null, forras: 'szamolt'|'bemondott'|'ismeretlen',
 *   bizonytalan: number}>} — `bizonytalan`: a részfában hány entitás pontja nem ismert és nincs bemondva
 */
export function osszPontokSzamitasa(entitasok, bemondasok = new Map()) {
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
      const ismeretlen = !!e.pontokIsmeretlenek;
      if (!kesz) {
        if (folyamatban.has(az)) continue;          // kör: ez az ág már a veremben van
        folyamatban.add(az);
        verem.push([az, true]);
        // A bemondott (nem tartott) entitás gyerekeit nem járjuk be — a bemondás az egész részfát fedi.
        const bemondott = ismeretlen && bemondasErvenyes(bemondasok.get(az));
        if (!bemondott) for (const g of gyerekek.get(az) ?? []) if (!ki.has(g) && !folyamatban.has(g)) verem.push([g, false]);
        continue;
      }
      folyamatban.delete(az);
      if (ismeretlen && bemondasErvenyes(bemondasok.get(az))) {
        ki.set(az, { osszPont: bemondasok.get(az).osszPont, sajat: null, forras: 'bemondott', bizonytalan: 0 });
        continue;
      }
      let osszPont = ismeretlen ? 0 : e.osszesPont;
      let bizonytalan = ismeretlen ? 1 : 0;
      for (const g of gyerekek.get(az) ?? []) {
        const gy = ki.get(g);
        if (!gy) continue;                             // körbe eső gyerek: egyszer már számított
        osszPont += gy.osszPont;
        bizonytalan += gy.bizonytalan;
      }
      ki.set(az, ismeretlen ? { osszPont, sajat: null, forras: 'ismeretlen', bizonytalan }
        : { osszPont, sajat: e.osszesPont, forras: 'szamolt', bizonytalan });
    }
  }
  return ki;
}

// ===================================
// A RÉSZFA-FA
// ===================================

/**
 * X részfájának levelei: a szerzők saját pontja (az aláírt pont-esemény azonosítójával, vagy `atvitt` jelzéssel, ha
 * a pontot egyezmény vitte át — annak nincs saját eseménye) és a gyerekek össz-pontja. A 0 összegű levél kimarad.
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
    ki.push({ kulcs: 'p:' + szerzo, ertek: esemeny ? { e: esemeny } : { atvitt: true }, osszegek: [h.pont] });
  }
  for (const g of gyerekek.get(azonosito) ?? []) {
    const o = osszPontok.get(g)?.osszPont ?? 0;
    if (o > 0) ki.push({ kulcs: 'g:' + g, ertek: null, osszegek: [o] });
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
      else b = { fa: ujAllapotFa(OSSZPONT_FA, 1), levelek: new Map() };
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
 * A TARTÓ válasza a minta-helyekre: a levelek és a bizonyítékuk (`MINTA_KORLAT` felett nem válaszol többre).
 * @returns {Promise<Array<{r: number, kulcs: string, bizonyitek: Object}>>}
 */
export async function fejlecMintai(fa, helyek) {
  const ki = [];
  for (const r of (Array.isArray(helyek) ? helyek : []).slice(0, MINTA_KORLAT)) {
    const m = await allapotSulyozottKeresese(fa, r);
    if (m) ki.push({ r, kulcs: m.kulcs, bizonyitek: m.bizonyitek });
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
 * @param {Map<string, Object>} b.esemenyek - a kapott (vagy már meglévő) pont-események azonosító szerint
 * @returns {Promise<{rendben: boolean, ok?: string, ellenorzott: number, atvitt: number, gyerek: number,
 *   hianyzoEsemeny: number}>}
 */
export async function fejlecEllenorzese({ azonosito, gyoker, helyek, mintak, esemenyek = new Map() }) {
  const ered = { rendben: true, ellenorzott: 0, atvitt: 0, gyerek: 0, hianyzoEsemeny: 0 };
  const hiba = (ok) => ({ ...ered, rendben: false, ok });
  if (!Array.isArray(helyek) || !Array.isArray(mintak) || mintak.length !== helyek.length) return hiba('nem minden helyre jött minta');
  for (let i = 0; i < helyek.length; i++) {
    const m = mintak[i];
    if (!m || m.r !== helyek[i] || typeof m.kulcs !== 'string') return hiba('a minta nem a kért helyre szól');
    const e = await allapotSulyozottEllenorzese(OSSZPONT_FA, 1, gyoker, m.kulcs, m.bizonyitek, m.r);
    if (!e.rendben) return hiba('hamis minta: ' + e.ok);
    if (m.kulcs.startsWith('g:')) { ered.gyerek++; continue; }
    if (!m.kulcs.startsWith('p:')) return hiba('ismeretlen levél-fajta');
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
