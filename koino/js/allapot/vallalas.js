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
// ⭐⭐ D104 (Csaba, 2026-10-15): A KIFUTÁS — de nem azonnal. A pont levétele után még `KIFUTAS` (24 óra) ideig tartom
// a szeletet, így a többiek KÉSŐBBI változásait is megkapom. Mérte a kézi próba (telefon + laptop): a telefon levette a
// pontját egy egyezményről, a laptop egy perccel később; a telefon a levétele pillanatában elengedte a szeletet, ezért a
// laptop levételéről soha nem értesült — a régi pontot látta, és az egyezmény nála életben maradt (a laptopon helyesen
// eltűnt). ⭐ Az egyszeri utólagos lekérés (B) épp ezt nem javította volna (a lekérés pillanatában a laptop pontja még
// állt); a kifutás bármelyik későbbi változást elhozza, amíg tart. Az idő a SAJÁT órám (a saját eseményem `ido`-ja) —
// a vállalás helyi, semmit nem dönt el a koinóban; a terhe a saját tevékenységemmel arányos (egy nap levételei).
//
// Használják: koino.js (a `vallalas` parancs, a `hozd`, a jelzés), a próbák.

import { pontEsemenyMerlege } from './szabalyok.js';
import { esemenyKoinoja } from '../esemeny/esemeny.js';   // ⭐ D118 (⑤a)

/** ⭐ D104: a pont levétele után ennyi ideig tartom még a szeletet (a többiek későbbi változásaiért). */
export const KIFUTAS = 24 * 3600 * 1000;

/**
 * A vállalás a saját láncomból.
 *
 * @param {Array<Object>} sajatEsemenyek - a saját eseményeim EBBEN a koinóban (bármilyen sorrendben)
 * @param {Object} [beallitas]
 * @param {string|null} [beallitas.koinoSzuletes] - a koinó `KoinoLetrehozas` eseményének azonosítója
 * @param {number} [beallitas.most] - a mostani idő (a kifutáshoz; alapból `Date.now()`)
 * @param {number} [beallitas.kifutas] - a kifutás hossza ms-ban (alapból `KIFUTAS`; 0: nincs kifutás)
 * @param {number} [beallitas.tudatpontKeret] - ⭐ D118/2: a koinó kerete (a születéséből; alapból a mai érték)
 * @param {string} [beallitas.koino] - ⭐ D118 (⑤a): a koinó neve — a más koinóé (az ős láncomból hozott) pont-esemény a
 *        számított összeggel számít (`pontEsemenyMerlege` `hozott` — mint a szabály-rétegben)
 * @returns {{szeletek: Set<string>, pontok: Map<string, number>, azonossag: Array<string>,
 *            koinoSzuletes: string|null, kifuto: Map<string, number>}} a `kifuto`: a pont nélkül, de még kifutásban
 *            tartott szeletek → mikor jár le a kifutásuk
 */
export function vallalasSzamitasa(sajatEsemenyek, beallitas = {}) {
  const lanc = [...sajatEsemenyek].sort((a, b) => a.sorszam - b.sorszam);
  const allas = { osszeg: 0, pontok: new Map() };
  const azonossag = [];
  // ⭐ D104: szeletenként mikor vettem le az utolsó pontomat (pozitívról 0-ra) — ha azóta újra tettem rá, kiesik.
  const levetel = new Map();
  // ⭐ A folytonosságot ugyanúgy követjük, mint a szabály-réteg (a saját láncunk rendes esetben ép — de
  // ha nem, az ítéletnek akkor is egyeznie kell).
  let folytonos = true;
  let vart = 1;
  for (const e of lanc) {
    if (e.sorszam !== vart) folytonos = false;
    vart = e.sorszam + 1;
    if (e.tipus === 'Belepes' || e.tipus === 'KoinoLetrehozas' || e.tipus === 'Bekoltozes') azonossag.push(e.azonosito);   // ⭐ D118 (④a)
    if (e.tipus !== 'TudatpontRendezes') continue;
    const m = pontEsemenyMerlege(e, allas, folytonos, beallitas.tudatpontKeret,
      typeof beallitas.koino === 'string' && esemenyKoinoja(e) !== beallitas.koino);
    if (m.elvetve) continue;                     // ami nem számít, az a régi értéket hagyja érvényben
    const elozo = allas.pontok.get(m.entitas) ?? 0;
    allas.pontok.set(m.entitas, m.pont);
    allas.osszeg = m.ujOsszeg;
    if (m.pont > 0) levetel.delete(m.entitas);
    else if (elozo > 0) levetel.set(m.entitas, Number.isFinite(e.ido) ? e.ido : 0);
  }

  const szeletek = new Set();
  for (const [kulcs, pont] of allas.pontok) if (pont > 0) szeletek.add(kulcs);
  for (const a of azonossag) szeletek.add(a);
  const koinoSzuletes = typeof beallitas.koinoSzuletes === 'string' ? beallitas.koinoSzuletes : null;
  if (koinoSzuletes) szeletek.add(koinoSzuletes);
  // ⭐ D104: a kifutó szeletek — a pont levétele után még `kifutas` ideig.
  const most = Number.isFinite(beallitas.most) ? beallitas.most : Date.now();
  const kifutas = Number.isFinite(beallitas.kifutas) && beallitas.kifutas >= 0 ? beallitas.kifutas : KIFUTAS;
  const kifuto = new Map();
  for (const [kulcs, ido] of levetel) {
    if (szeletek.has(kulcs) || most - ido >= kifutas) continue;
    szeletek.add(kulcs);
    kifuto.set(kulcs, ido + kifutas);
  }
  return { szeletek, pontok: allas.pontok, azonossag, koinoSzuletes, kifuto };
}
