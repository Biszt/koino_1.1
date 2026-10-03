// koino/js/allapot/vallalas.js

// Felelősség: B/1 — A VÁLLALÁS (D75, D86, D90): mely szeleteket tartom TARTÓSAN.
//
// ⭐ A vállalás SZÁMÍTOTT, nem kimondott: a saját láncomból jön, tehát a terhe a saját tevékenységemmel nő,
// nem a koinó méretével (a „végtelen” próbája):
//   · a TUDATPONTOS szeleteim — ahol a kiosztásomban (a saját pont-eseményeim szerint, ugyanazzal az
//     ítélettel, amit a szabály-réteg használ: `pontEsemenyMerlege`) pozitív pont áll; D85 óta a javaslat
//     és a töredék is ilyen, ha pontom van rajta;
//   · a saját AZONOSSÁG-szeletem (D86) — a `Belepes` horgonyom (az alapítónál a `KoinoLetrehozas`);
//   · a KOINÓ SZÜLETÉSE (D90/2) — egyetlen esemény, nélküle a program el sem indul a koinóval.
// ⛔ A GYÖKÉR (a legfelső szintű születések listája) NEM vállalás (D90/1): azt a G osztja szét.
//
// Erre épül: a két tár (B/2 — ami nem vállalt, az átmenetibe kerül), a „nem tartod” jelzés, később a
// címjegyzék (G — ezt hirdeti) és a szigorú (b) részvétele (B/3).
//
// ⚠️ Ha a pontomat visszaveszem, a szelet kiesik a vállalásból (D75/1) — a számítás a lánc végén áll.
//
// Használják: koino.js (a `vallalas` parancs, a `hozd`, a jelzés), a próbák.

import { pontEsemenyMerlege } from './szabalyok.js';

/**
 * A vállalás a saját láncomból.
 *
 * @param {Array<Object>} sajatEsemenyek - a saját eseményeim EBBEN a koinóban (bármilyen sorrendben)
 * @param {Object} [beallitas]
 * @param {string|null} [beallitas.koinoSzuletes] - a koinó `KoinoLetrehozas` eseményének azonosítója
 * @returns {{szeletek: Set<string>, pontok: Map<string, number>, azonossag: Array<string>,
 *            koinoSzuletes: string|null}}
 */
export function vallalasSzamitasa(sajatEsemenyek, beallitas = {}) {
  const lanc = [...sajatEsemenyek].sort((a, b) => a.sorszam - b.sorszam);
  const allas = { osszeg: 0, pontok: new Map() };
  const azonossag = [];
  // ⭐ A folytonosságot ugyanúgy követjük, mint a szabály-réteg (a saját láncunk rendes esetben ép — de
  // ha nem, az ítéletnek akkor is egyeznie kell).
  let folytonos = true;
  let vart = 1;
  for (const e of lanc) {
    if (e.sorszam !== vart) folytonos = false;
    vart = e.sorszam + 1;
    if (e.tipus === 'Belepes' || e.tipus === 'KoinoLetrehozas') azonossag.push(e.azonosito);
    if (e.tipus !== 'TudatpontRendezes') continue;
    const m = pontEsemenyMerlege(e, allas, folytonos);
    if (m.elvetve) continue;                     // ami nem számít, az a régi értéket hagyja érvényben
    allas.pontok.set(m.entitas, m.pont);
    allas.osszeg = m.ujOsszeg;
  }

  const szeletek = new Set();
  for (const [kulcs, pont] of allas.pontok) if (pont > 0) szeletek.add(kulcs);
  for (const a of azonossag) szeletek.add(a);
  const koinoSzuletes = typeof beallitas.koinoSzuletes === 'string' ? beallitas.koinoSzuletes : null;
  if (koinoSzuletes) szeletek.add(koinoSzuletes);
  return { szeletek, pontok: allas.pontok, azonossag, koinoSzuletes };
}
