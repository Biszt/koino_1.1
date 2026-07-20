// backend/services/sikidomService.js

// ===== SÍKIDOM SERVICE =====
// Felelősség: a Síkidom nézet (fraktál kör-pakolás, teljes képernyős) backend-adatai.
// A nézet egy AKTÍV GYÖKÉRTŐL indul (globálisan a legerősebb gyökér), és a
// leszármazottak közül csak azokat adja vissza, amelyek elég „nagyok" ahhoz, hogy
// megjelenjenek. A méret-mérték az EFFEKTÍV MÉRET:
//   effektivMeret = hierarchikusOsszesPont / 20^(gyökér alatti szint)
// Ez azért helyes, mert minden hierarchia-szinttel a síkidom területe 1/20-ára
// csökken (a sugár 1/√20-ára). A mennyiség LEFELÉ MONOTON csökken (a gyerek pontja
// ≤ a szülőé, plusz egy extra ×20 osztó), ezért ha egy csomópont túl kicsi, a
// leszármazottai is azok → a részfa ott levágható.
//
// A bejárás LEGJOBB-ELŐSZÖR (best-first) az effektív méret szerint: mindig a
// legnagyobb effektív méretű még ki nem bontott csomópontot bontjuk ki, amíg
// el nem érjük a darab-plafont VAGY a küszöböt. Így pontosan „a legnagyobbnak
// látszó" leszármazottakat kapjuk — azokat, amelyek elsőként érik el a minimum
// átmérőt. A darab-plafon csak biztonsági korlát; az elsődleges szűrő a küszöb.
//
// Skálázhatóság: csomópontonként csak a TOP-N legerősebb gyereket kérjük le
// (findBySzuloId limit), így egyetlen sok-milliós gyerekű csomópont sem robbant.
// Használja: sikidomController.

// --- IMPORTÁLÁSOK ---
const hierarchikusAllokaciRepository = require('../repositories/hierarchikusTudatpontAllokaciRepository');
const { entitasCimekFeltoltese } = require('./ertesitesService');

// A √20-as zsugorodás alapja: minden szinttel a terület 1/20-ára csökken
const SZINT_OSZTO = 20;

// Csomópontonként ennyi legerősebb gyereket kérünk le (egy csomópont sok-milliós
// gyereke esetén sem tölthetjük be mindet; a gyengék úgysem érnék el a küszöböt)
const GYEREK_LIMIT = 100;

// Biztonsági darab-plafon (az elsődleges szűrő a küszöb; ez csak véd a túltöltéstől)
const ALAP_MAX_CSOMOPONT = 500;

// Globális nézetnél ennyi legerősebb GYÖKERET seedelünk (mind a szint 0-n, egymás
// mellé pakolva). A gyenge gyökereket a küszöb/plafon úgyis levágja.
const GYOKER_LIMIT = 200;

// ===== MINIMÁLIS MAX-HALOM (priority queue) =====
// A best-first bejáráshoz: mindig a legnagyobb effektív méretű elemet adja vissza.
class MaxHalom {
  constructor() { this._elemek = []; }
  get meret() { return this._elemek.length; }

  betesz(elem) {
    const e = this._elemek;
    e.push(elem);
    let i = e.length - 1;
    while (i > 0) {
      const szulo = (i - 1) >> 1;
      if (e[szulo].eff >= e[i].eff) break;
      [e[szulo], e[i]] = [e[i], e[szulo]];
      i = szulo;
    }
  }

  kivesz() {
    const e = this._elemek;
    if (e.length === 0) return null;
    const teto = e[0];
    const utolso = e.pop();
    if (e.length > 0) {
      e[0] = utolso;
      let i = 0;
      const n = e.length;
      while (true) {
        const bal = 2 * i + 1;
        const jobb = 2 * i + 2;
        let legnagyobb = i;
        if (bal < n && e[bal].eff > e[legnagyobb].eff) legnagyobb = bal;
        if (jobb < n && e[jobb].eff > e[legnagyobb].eff) legnagyobb = jobb;
        if (legnagyobb === i) break;
        [e[legnagyobb], e[i]] = [e[i], e[legnagyobb]];
        i = legnagyobb;
      }
    }
    return teto;
  }
}

// --- SÍKIDOM SERVICE OSZTÁLY ---
class SikidomService {

// ----- EFFEKTÍV MÉRET -----
// A csomópont „mekkorának látszik" mértéke: össztudatpont / 20^szint.
// @param {number} hierarchikusOsszesPont
// @param {number} gyokerAlattiSzint - 0 = a nézet gyökere
// @returns {number}
_effektivMeret(hierarchikusOsszesPont, gyokerAlattiSzint) {
  return (hierarchikusOsszesPont ?? 0) / Math.pow(SZINT_OSZTO, gyokerAlattiSzint);
}

// ----- RÉSZFA LEKÉRÉSE (best-first) -----
/**
* A Síkidom nézet csomópont-halmaza: a gyökér + a legnagyobb effektív méretű
* leszármazottak, a küszöb és a darab-plafon szerint.
* @param {string|null} gyokerId - a nézet gyökere; null → a legerősebb gyökér
* @param {number|null} kuszob - minimum effektív méret (opcionális); ez alatt vág
* @param {number} maxCsomopont - biztonsági darab-plafon
* @returns {Promise<Object>} { gyoker, csomopontok }
*/
async reszfaLekerese(gyokerId = null, kuszob = null, maxCsomopont = ALAP_MAX_CSOMOPONT) {
  console.log('SikidomService.reszfaLekerese - KEZDÉS', { gyokerId, kuszob, maxCsomopont });

  // 1. LÉPÉS – A nézet KIINDULÓ csomópontjai (mind szint 0)
  //  - ha van gyoker: az az egyetlen kiinduló (ág-szűrt / drill nézet);
  //  - ha nincs (globális nézet): az ÖSSZES gyökér (a legerősebb GYOKER_LIMIT),
  //    egymás mellé pakolva — így az első nézet minden gyökeret mutat, nem csak
  //    a legerősebbet (ami lehet levél is).
  let kiindulok;
  if (gyokerId) {
    const egy = await hierarchikusAllokaciRepository.findByEntitasId(gyokerId);
    kiindulok = egy ? [egy] : [];
  } else {
    kiindulok = await hierarchikusAllokaciRepository.findGyokerek(GYOKER_LIMIT);
  }

  if (kiindulok.length === 0) {
    console.log('SikidomService.reszfaLekerese - VÉGE (nincs kiinduló csomópont)');
    return { gyoker: null, csomopontok: [] };
  }

  const limit = Math.max(1, Math.min(maxCsomopont, 5000)); // felső plafon a plafonra is

  // 2. LÉPÉS – Best-first bejárás effektív méret szerint
  // A halomban {allokacio, szint, eff, szuloId}. A kiinduló csomópontok szintje 0,
  // szülőjük a nézeten belül nincs (szuloId: null).
  const halom = new MaxHalom();
  for (const ki of kiindulok) {
    halom.betesz({
      allokacio: ki,
      szint: 0,
      eff: this._effektivMeret(ki.hierarchikusOsszesPont, 0),
      szuloId: null
    });
  }

  const eredmeny = [];               // a felvett csomópontok (belső alak)
  const felvettGyerekSzamlalo = {};  // szuloId-string → hány gyereke került be

  while (halom.meret > 0 && eredmeny.length < limit) {
    const aktualis = halom.kivesz();

    // Küszöb-vágás: mivel a halom a legnagyobbat adja, ha ez a küszöb alatt van,
    // az összes hátralévő is az → befejezhetjük.
    if (kuszob != null && aktualis.eff < kuszob) {
      console.log('SikidomService.reszfaLekerese - küszöb alá értünk, bejárás vége');
      break;
    }

    const a = aktualis.allokacio;
    eredmeny.push({
      entitasId: a.entitasId,
      entitasTipus: a.entitasTipus,
      szuloId: aktualis.szuloId,
      hierarchikusOsszesPont: a.hierarchikusOsszesPont ?? 0,
      gyokerAlattiSzint: aktualis.szint,
      effektivMeret: aktualis.eff
    });

    // A felvett csomópont legerősebb gyerekeinek betöltése és halomba tétele
    const gyerekek = await hierarchikusAllokaciRepository.findBySzuloId(a.entitasId, GYEREK_LIMIT);

    const gyerekSzint = aktualis.szint + 1;
    for (const gy of gyerekek) {
      halom.betesz({
        allokacio: gy,
        szint: gyerekSzint,
        eff: this._effektivMeret(gy.hierarchikusOsszesPont, gyerekSzint),
        szuloId: a.entitasId
      });
    }

    // Elmentjük a szülőnkénti DB-gyerekszámot (a vanTovabbGyerek-hez)
    // (az aktuális csomópont a saját szülőjének egy gyereke)
    if (aktualis.szuloId) {
      const kulcs = aktualis.szuloId.toString();
      felvettGyerekSzamlalo[kulcs] = (felvettGyerekSzamlalo[kulcs] ?? 0) + 1;
    }
    // A saját DB-gyerekszámot az elemre írjuk (a jelzőhöz)
    eredmeny[eredmeny.length - 1]._gyerekSzamDb = gyerekek.length;
  }

  // 3. LÉPÉS – „van még be nem töltött gyerek?" jelző csomópontonként
  // Igaz, ha a csomópontnak a DB-ben több (top-N) gyereke volt, mint amennyi
  // ténylegesen bekerült az eredménybe (a plafon vagy a küszöb miatt kimaradt).
  for (const csp of eredmeny) {
    const bekerult = felvettGyerekSzamlalo[csp.entitasId.toString()] ?? 0;
    csp.vanTovabbGyerek = (csp._gyerekSzamDb ?? 0) > bekerult;
    delete csp._gyerekSzamDb;
  }

  // 4. LÉPÉS – Címek feltöltése (típusonként EGY csoportos lekérdezéssel)
  const cimmel = await entitasCimekFeltoltese(eredmeny);
  const csomopontok = cimmel.map(csp => ({
    entitasId: csp.entitasId,
    entitasTipus: csp.entitasTipus,
    szuloId: csp.szuloId ?? null,
    hierarchikusOsszesPont: csp.hierarchikusOsszesPont,
    gyokerAlattiSzint: csp.gyokerAlattiSzint,
    effektivMeret: csp.effektivMeret,
    cim: csp.entitasCim ?? null,
    vanTovabbGyerek: csp.vanTovabbGyerek
  }));

  // Egyetlen kiinduló (ág-szűrt/drill) → visszaadjuk a gyökeret; globális
  // (több gyökér) nézetnél nincs egyetlen gyökér → null.
  const gyoker = (gyokerId && kiindulok.length === 1)
    ? {
        entitasId: kiindulok[0].entitasId,
        entitasTipus: kiindulok[0].entitasTipus,
        hierarchikusOsszesPont: kiindulok[0].hierarchikusOsszesPont ?? 0
      }
    : null;

  console.log('SikidomService.reszfaLekerese - VÉGE', {
    gyokerVan: !!gyoker,
    kiindulokSzama: kiindulok.length,
    csomopontokSzama: csomopontok.length
  });

  return { gyoker, csomopontok };
}

}

// --- EXPORTÁLÁS - SINGLETON példány ---
module.exports = new SikidomService();
