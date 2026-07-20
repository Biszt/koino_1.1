// frontend/js/utils/sikidomElrendezes.js

// ===== SÍKIDOM-ELRENDEZÉS (a Síkidom nézet pakoló-motorja) =====
// Felelősség: a backend csomópont-listájából (entitasId, szuloId, effektivMeret,
// gyokerAlattiSzint...) kiszámolja minden síkidom VILÁG-koordinátáját és -sugarát.
//
// A mechanizmus (a 2026-07-20-i közös terv szerint):
//   - Minden síkidom sugara a √(effektivMeret)-tel arányos. Mivel az effektív méret
//     már tartalmazza a szintenkénti /20 osztást, a sugár szintenként 1/√20-ára
//     csökken → a gyerek MINDIG kisebb a szülőnél (egymásba ágyazható).
//   - A gyerekek a szülőn BELÜL, NAPRAFORGÓ-SPIRÁLBAN (filotaxis) helyezkednek el,
//     PONT SZERINT CSÖKKENŐ sorrendben: a LEGNAGYOBB a középen (index 0, r=0), a
//     kisebbek kifelé tekerednek. Az n-edik pozíciója CSAK n-től függ (szög =
//     n × aranyszög, sugár = a korábbiak területéből) → új csomópont betöltése
//     senkit sem mozdít el (append-stabil), és a kifelé tágulás szabad.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használja: SikidomModal.

// Az aranyszög (≈137,5°) radiánban — a filotaxis-spirál alapja
export const ARANYSZOG = Math.PI * (3 - Math.sqrt(5));

// Sugár-skála: a világ-sugár = √(effektivMeret) × SUGAR_SKALA. Tetszőleges pozitív
// szám (a nézet úgyis a befoglaló méretre igazít); csak kényelmes nagyságrendhez.
const SUGAR_SKALA = 10;

// Minimális világ-sugár, hogy a 0 pontú csomópont se legyen pontszerű a mérésekhez
const MIN_SUGAR = 0.0001;

// ----- VILÁG-SUGÁR -----
// Egy csomópont sugara világ-egységben az effektív méretéből.
// @param {Object} csomopont - {effektivMeret}
// @returns {number}
function vilagSugar(csomopont) {
  const eff = Math.max(csomopont.effektivMeret ?? 0, 0);
  return Math.max(Math.sqrt(eff) * SUGAR_SKALA, MIN_SUGAR);
}

// ----- ELRENDEZÉS KISZÁMÍTÁSA -----
// @param {Array} csomopontok - a backend csomópont-listája (lásd fent)
// @param {string|null} gyokerId - a nézet gyökere; ha null, a gyokerAlattiSzint===0
//   (vagy szuloId===null) csomópontot keressük gyökérnek
// @returns {Object} { csomopontok, gyokerId, befoglalo } — a csomópontok
//   kiegészítve vilagX / vilagY / vilagSugar mezőkkel; befoglalo = {minX,maxX,minY,maxY}
export function sikidomElrendezes(csomopontok, gyokerId = null) {
  console.log('sikidomElrendezes - KEZDÉS', { csomopontokSzama: csomopontok.length, gyokerId });

  // Csomópont-térkép (kulcs: entitasId string) + a mezők másolása, hogy a
  // bemenetet ne módosítsuk
  const nodeMap = new Map();
  for (const csp of csomopontok) {
    const kulcs = csp.entitasId.toString();
    nodeMap.set(kulcs, {
      ...csp,
      kulcs,
      vilagX: 0,
      vilagY: 0,
      vilagSugar: vilagSugar(csp)
    });
  }

  // Gyerek-térkép: szülő-kulcs → gyerekek, PONT SZERINT CSÖKKENŐ sorrendben
  // (döntetlennél entitasId a determinisztikus döntő). Így a legnagyobb az 1.
  const gyerekMap = new Map();
  for (const node of nodeMap.values()) {
    if (!node.szuloId) continue;
    const szuloKulcs = node.szuloId.toString();
    if (!nodeMap.has(szuloKulcs)) continue; // a szülő nincs a halmazban → gyökérként kezeljük lentebb
    if (!gyerekMap.has(szuloKulcs)) gyerekMap.set(szuloKulcs, []);
    gyerekMap.get(szuloKulcs).push(node);
  }
  for (const gyerekek of gyerekMap.values()) {
    gyerekek.sort((a, b) => {
      const kulonbseg = (b.hierarchikusOsszesPont ?? 0) - (a.hierarchikusOsszesPont ?? 0);
      if (kulonbseg !== 0) return kulonbseg;
      return a.kulcs.localeCompare(b.kulcs);
    });
  }

  // ----- NAPRAFORGÓ-SPIRÁL EGY KÖZÉPPONT KÖRÉ -----
  // A (kozepX, kozepY) köré pakolja a megadott, PONT SZERINT CSÖKKENŐ sorrendű
  // csomópontokat: index 0 = legnagyobb → középre (r=0), a többi kifelé.
  // A sugár a NÁLA NAGYOBBAK EGYÜTTES TERÜLETÉBŐL jön: r_i = √(korábbiak területe/π).
  // KULCS: mivel a korábbiak (nagyobbak) stabilak, egy KISEBB (hátrébb betöltött)
  // csomópont az i pozícióját és a korábbiak sugarát sem változtatja → APPEND-STABIL
  // (a spirál kifelé szabadon tágul). Ugyanez a logika kezeli a szülőn belüli
  // gyerekeket ÉS a több gyökeret (a globális nézetben a gyökerek egymás mellé).
  // Containment (gyerekeknél): a gyerekek együttes területe ≤ a szülő területének
  // 1/20-a, így a fürt sugara ≤ szülő sugara / √20 → a szülőn belül marad.
  const spiralKore = (kozepX, kozepY, csomopontLista) => {
    let kumulativTerulet = 0;
    const kihelyezett = [];
    for (let i = 0; i < csomopontLista.length; i++) {
      const node = csomopontLista[i];
      if (feldolgozva.has(node.kulcs)) continue; // ciklus-védelem
      feldolgozva.add(node.kulcs);

      const r = Math.sqrt(kumulativTerulet / Math.PI);
      const szog = i * ARANYSZOG;
      node.vilagX = kozepX + Math.cos(szog) * r;
      node.vilagY = kozepY + Math.sin(szog) * r;

      // A saját területét a KÖVETKEZŐK sugarához adjuk hozzá (a sajátjához nem)
      kumulativTerulet += Math.PI * node.vilagSugar * node.vilagSugar;
      kihelyezett.push(node);
    }
    return kihelyezett;
  };

  // ----- A LEGFELSŐ SZINT (a nézet gyökere/gyökerei) -----
  // Ha adott a gyokerId → egyetlen gyökér (ág-szűrt / drill nézet).
  // Egyébként (globális nézet) MINDEN legfelső csomópont (szülőtlen VAGY a szülője
  // nincs a halmazban), egymás mellé pakolva — így az első nézet az ÖSSZES gyökeret
  // mutatja, nem csak a legerősebbet (ami lehet levél is).
  let legfelso;
  if (gyokerId && nodeMap.has(gyokerId.toString())) {
    legfelso = [nodeMap.get(gyokerId.toString())];
  } else {
    legfelso = [...nodeMap.values()].filter(
      node => !node.szuloId || !nodeMap.has(node.szuloId.toString())
    );
  }

  // Tartalék: ha egyetlen csomópont sem „legfelső" (pl. hibás, körkörös adat,
  // ahol nincs gyökér), a legerősebb csomópontot vesszük gyökérnek, hogy a nézet
  // ne maradjon üresen. A ciklus-védelem a bejárásban megvéd a végtelen huroktól.
  if (legfelso.length === 0 && nodeMap.size > 0) {
    let legerosebb = null;
    for (const node of nodeMap.values()) {
      if (!legerosebb || (node.hierarchikusOsszesPont ?? 0) > (legerosebb.hierarchikusOsszesPont ?? 0)) {
        legerosebb = node;
      }
    }
    legfelso = [legerosebb];
  }

  // Pont szerint csökkenő (legnagyobb középre), döntetlennél kulcs a döntő
  legfelso.sort((a, b) => {
    const kulonbseg = (b.hierarchikusOsszesPont ?? 0) - (a.hierarchikusOsszesPont ?? 0);
    if (kulonbseg !== 0) return kulonbseg;
    return a.kulcs.localeCompare(b.kulcs);
  });

  if (legfelso.length === 0) {
    console.log('sikidomElrendezes - VÉGE (nincs csomópont)');
    return { csomopontok: [], gyokerId: null, befoglalo: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
  }

  // Ciklus-védelem: minden csomópontot csak egyszer helyezünk el
  const feldolgozva = new Set();

  // A legfelső szint a világ közepe (0,0) köré
  const gyokerek = spiralKore(0, 0, legfelso);
  const elhelyezett = [...gyokerek];
  const sor = [...gyokerek];

  // Szélességi bejárás: a szülő pozíciója kész, a gyerekeit köré pakoljuk
  while (sor.length > 0) {
    const szulo = sor.shift();
    const gyerekek = gyerekMap.get(szulo.kulcs) ?? [];
    const kihelyezett = spiralKore(szulo.vilagX, szulo.vilagY, gyerekek);
    for (const gy of kihelyezett) {
      sor.push(gy);
      elhelyezett.push(gy);
    }
  }

  // Befoglaló doboz (a kezdő nézet-igazításhoz)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of elhelyezett) {
    minX = Math.min(minX, node.vilagX - node.vilagSugar);
    maxX = Math.max(maxX, node.vilagX + node.vilagSugar);
    minY = Math.min(minY, node.vilagY - node.vilagSugar);
    maxY = Math.max(maxY, node.vilagY + node.vilagSugar);
  }

  // A nézet „gyökere": egyetlen legfelső csomópontnál az, egyébként (több gyökér)
  // az elrendezés közepén álló legerősebb (a legfelső lista első eleme).
  const gyokerKulcs = legfelso[0]?.kulcs ?? null;

  console.log('sikidomElrendezes - VÉGE', {
    elhelyezett: elhelyezett.length,
    legfelsoSzam: legfelso.length,
    gyokerKulcs
  });

  return {
    csomopontok: elhelyezett,
    gyokerId: gyokerKulcs,
    befoglalo: { minX, maxX, minY, maxY }
  };
}

export default sikidomElrendezes;
