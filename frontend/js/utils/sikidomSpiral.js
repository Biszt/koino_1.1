// frontend/js/utils/sikidomSpiral.js

// ===== ÖNHASONLÓ SPIRÁL-PAKOLÁS (a Síkidom nézet ÚJ motorja) =====
//
// Felelősség: kiszámolni, hogy a spirálban a k-adik síkidom HOL van és MEKKORA.
//
// A MODELL (Csaba ötlete, 2026-08-03):
//   - A kép közepén ÜRES KÖR van. Ide kerülnek a még be nem töltött, KISEBB
//     entitások. Az üres kör a KÉPERNYŐHÖZ igazodik: ahogy az e-ember közelít
//     a közép felé, az üres kör peremén sorra megjelennek az újabbak.
//   - Befelé csökkennek, kifelé nőnek a síkidomok. Így az e-ember MINDIG tudja,
//     hol keresse: a legkisebbeket a közép körül, a legnagyobbakat a szélen.
//
// A KÉPLETEK (index i egész szám; a NÖVEKVŐ i BEFELÉ, a kisebbek felé mutat):
//   tavolsag(i) = alapTavolsag * meretArany^(-i)   – a középponttól mért távolság
//   sugar(i)    = sugarArany * tavolsag(i)         – a síkidom saját sugara
//   szog(i)     = i * szogLepes                    – a spirál elfordulása
//
// MIÉRT EZ AZ EGÉSZ LÉNYEGE:
// mivel a sugár ARÁNYOS a távolsággal, a kép minden nagyítási szinten ugyanúgy
// néz ki (ÖNHASONLÓ): egy meretArany-szoros nagyítás + egy szogLepes-nyi
// forgatás pontosan önmagába viszi az ábrát. Ebből három dolog következik:
//   1. Egy síkidom helye CSAK a saját sorszámából jön → nem kell előre tudni
//      több milliárd síkidom helyét (ez volt a régi terv buktatója).
//   2. Az üres kör MAGÁTÓL keletkezik: egy adott nagyításnál a beljebb lévők
//      egyszerűen kisebbek egy képpontnál — nem kell külön kitalálni a méretét.
//   3. A nagyítás VÉGTELEN: befelé és kifelé is folytatható, mindig ugyanolyan
//      sűrűn (lásd a teszt-oldal „mélység" kijelzőjét).
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használja: sikidomTesztOldal.js (később a Síkidom nézet modal).

// ===== ÁLLANDÓK =====

// Az aranyszög fokban (≈137,5°) — a napraforgó-mag elrendezés szöglépése
export const ARANYSZOG_FOK = 180 * (3 - Math.sqrt(5));

// Az átfedés-keresésnél ennyi szomszédot vizsgálunk a spirálban mindkét irányba.
// (Önhasonlóság miatt elég EGYETLEN síkidomot összevetni a szomszédaival: ami
// rá igaz, az a többire is.)
const VIZSGALT_SZOMSZEDOK = 250;

// ===== ALAPBEÁLLÍTÁSOK =====
// @returns {Object} a spirál hangolható paraméterei
export function alapBeallitasok() {
  return {
    // A 0. sorszámú síkidom távolsága a középponttól (világ-egység).
    // Szabadon választható: a nézet úgyis ráigazít.
    alapTavolsag: 1,

    // Méret-arány (λ): ennyiszer kisebb minden következő (befelé haladva).
    // 1-hez közel = sok, egymáshoz hasonló síkidom; nagyobb = kevesebb, ugrásszerű.
    // Az 1.05 mérés szerint ~52 síkidomot mutat egy képernyőn.
    meretArany: 1.05,

    // Szöglépés fokban: mennyit fordul a spirál egy síkidomonként.
    // A 150° a mérés szerint a legtömörebb kitöltést adja (86,8%); az aranyszög
    // (ARANYSZOG_FOK ≈ 137,5°) a klasszikus napraforgó-elrendezés.
    szogLepesFok: 150,

    // Kitöltés: a lehetséges LEGNAGYOBB sugár-aránynak hányad részét használjuk.
    // 1.0 = a síkidomok éppen érintik egymást; kisebb érték = levegősebb kép.
    kitoltes: 0.94,

    // Ha meg van adva, ez FELÜLÍRJA a kitöltésből számolt sugár-arányt
    // (a síkidom sugara / a középponttól mért távolsága). Általában null.
    sugarArany: null
  };
}

// ===== A LEGNAGYOBB ÁTFEDÉSMENTES SUGÁR-ARÁNY =====
// Megkeresi azt a legnagyobb c értéket, amivel MÉG NEM fedik át egymást a
// síkidomok, ha sugar(i) = c * tavolsag(i).
//
// A matek: a 0. síkidom (távolság 1, sugár c) és a k-adik (távolság μ = λ^(-k),
// sugár c·μ) akkor nem fed át, ha a középpont-távolságuk ≥ c·(1 + μ).
// A középpont-távolság a koszinusztételből: √(1 + μ² − 2μ·cos(k·Δszög)).
// Ebből c ≤ √(1 + μ² − 2μ·cos(k·Δszög)) / (1 + μ) — ennek a minimuma a válasz.
// (Az alapTavolsag kiesik, ezért a válasz csak λ-tól és Δszögtől függ.)
//
// @param {number} meretArany - λ (> 1)
// @param {number} szogLepesRad - a szöglépés radiánban
// @param {number} vizsgaltSzomszedok - hány szomszédot nézzünk mindkét irányba
// @returns {number} a legnagyobb átfedésmentes sugár-arány
export function legnagyobbSugarArany(meretArany, szogLepesRad, vizsgaltSzomszedok = VIZSGALT_SZOMSZEDOK) {
  let legkisebb = Infinity;

  for (let k = 1; k <= vizsgaltSzomszedok; k++) {
    // Mindkét irányba megnézzük: befelé (+k) és kifelé (−k) is
    for (const irany of [1, -1]) {
      const i = irany * k;
      const mu = Math.pow(meretArany, -i);              // a k-adik relatív távolsága
      const kozeppontTavolsag = Math.sqrt(
        1 + mu * mu - 2 * mu * Math.cos(i * szogLepesRad)
      );
      const arany = kozeppontTavolsag / (1 + mu);
      if (arany < legkisebb) legkisebb = arany;
    }
  }

  return legkisebb;
}

// ===== ELŐKÉSZÍTÉS =====
// A hangolható beállításokból kiszámolja a származtatott állandókat, hogy a
// rajzolás közben (képkockánként!) már ne kelljen újraszámolni semmit.
//
// @param {Object} beallitasok - az alapBeallitasok() felülírandó mezői
// @returns {Object} a rajzoláshoz kész spirál-leíró
export function spiralElokeszites(beallitasok = {}) {
  const b = { ...alapBeallitasok(), ...beallitasok };

  const szogLepes = (b.szogLepesFok * Math.PI) / 180;
  const legnagyobbArany = legnagyobbSugarArany(b.meretArany, szogLepes);
  const sugarArany = b.sugarArany ?? legnagyobbArany * b.kitoltes;

  console.log('spiralElokeszites', {
    meretArany: b.meretArany,
    szogLepesFok: b.szogLepesFok.toFixed(2),
    legnagyobbArany: legnagyobbArany.toFixed(4),
    sugarArany: sugarArany.toFixed(4)
  });

  return {
    ...b,
    szogLepes,          // radiánban
    sugarArany,         // sugár / távolság
    legnagyobbArany,    // az átfedésmentes felső határ (tájékoztatásul)
    lnMeretArany: Math.log(b.meretArany)
  };
}

// ===== EGY SÍKIDOM HELYE =====
// @param {number} index - a sorszám (egész; nagyobb = beljebb és kisebb)
// @param {Object} spiral - a spiralElokeszites() eredménye
// @returns {{index:number, tavolsag:number, szog:number, x:number, y:number, sugar:number}}
export function pozicio(index, spiral) {
  const tavolsag = spiral.alapTavolsag * Math.pow(spiral.meretArany, -index);
  const szog = index * spiral.szogLepes;

  return {
    index,
    tavolsag,
    szog,
    x: Math.cos(szog) * tavolsag,
    y: Math.sin(szog) * tavolsag,
    sugar: tavolsag * spiral.sugarArany
  };
}

// ===== A LEGBELSŐ MÉG LÁTHATÓ SORSZÁM =====
// Melyik a legnagyobb (= legbeljebb eső) sorszám, aminek a KÉPERNYŐN mért
// sugara még eléri a megadott képpont-határt? Ez adja az ÜRES KÖR peremét.
//
// A levezetés: sugar(i)·skala ≥ minKeppont, ahol sugar(i) = alap·λ^(-i)·c
//   → λ^(-i) ≥ minKeppont / (alap·c·skala)
//   → i ≤ ln(alap·c·skala / minKeppont) / ln(λ)
//
// @param {Object} spiral
// @param {number} skala - világ → képernyő nagyítás
// @param {number} minKeppont - ekkora látszó sugár alatt már nem rajzolunk
// @returns {number} a legbelső még látható sorszám
export function legbelsoLathatoIndex(spiral, skala, minKeppont) {
  const hanyados = (spiral.alapTavolsag * spiral.sugarArany * skala) / minKeppont;
  if (!(hanyados > 0)) return 0;
  return Math.floor(Math.log(hanyados) / spiral.lnMeretArany);
}

// ===== A LÁTHATÓ SÍKIDOMOK ÖSSZEGYŰJTÉSE =====
// A legbelső látható sorszámtól KIFELÉ haladva összegyűjti azokat a
// síkidomokat, amelyek a képernyőt metszik. Kifelé addig megyünk, amíg a
// síkidom akkora nem lesz, hogy már biztosan túlnő a képernyőn.
//
// A nézet-transzformáció (a teszt-oldal ezt használja):
//   kepX = eltolasX + skala * (cos φ * x − sin φ * y)
//   kepY = eltolasY + skala * (sin φ * x + cos φ * y)
// A φ forgatás azért kell, mert a végtelen nagyításnál a sorszámokat időnként
// „nullázzuk" (lásd a teszt-oldal újranormálását), és a nullázás forgat egyet.
//
// @param {Object} spiral
// @param {Object} nezet - {skala, eltolasX, eltolasY, forgatas}
// @param {number} szelesseg - a rajzfelület szélessége képpontban
// @param {number} magassag - a rajzfelület magassága képpontban
// @param {Object} opciok - {minKeppont, maxDarab, kulsoTartalek, legkisebbIndex}
//   legkisebbIndex: ennél kifelé nem megyünk tovább. Az AL-ENTITÁSOKNÁL 0 —
//   a 0. sorszám a legnagyobb al-entitás, ami éppen érinti a szülő peremét;
//   a negatív sorszámok már NAGYOBBAK lennének a szülőnél, azok nem léteznek.
// @returns {Array} a látható síkidomok: {index, x, y, sugar, kepX, kepY, kepSugar}
export function lathatoSikidomok(spiral, nezet, szelesseg, magassag, opciok = {}) {
  const minKeppont     = opciok.minKeppont ?? 2;
  const maxDarab       = opciok.maxDarab ?? 3000;
  const kulsoTartalek  = opciok.kulsoTartalek ?? 20;
  const legkisebbIndex = opciok.legkisebbIndex ?? -Infinity;

  const { skala, eltolasX, eltolasY } = nezet;
  const forgatas = nezet.forgatas ?? 0;
  const cosF = Math.cos(forgatas);
  const sinF = Math.sin(forgatas);

  // A képernyő átlója — efölé nőtt síkidomnál már nincs értelme tovább menni
  const atlo = Math.hypot(szelesseg, magassag);
  const felsoKepSugar = atlo * kulsoTartalek;

  const legbelso = legbelsoLathatoIndex(spiral, skala, minKeppont);
  const talalatok = [];

  // A legbelsőtől KIFELÉ (csökkenő sorszám = növekvő méret)
  for (let index = legbelso; talalatok.length < maxDarab && index >= legkisebbIndex; index--) {
    const p = pozicio(index, spiral);

    const kepX = eltolasX + skala * (cosF * p.x - sinF * p.y);
    const kepY = eltolasY + skala * (sinF * p.x + cosF * p.y);
    const kepSugar = skala * p.sugar;

    // Metszi-e a képernyő téglalapját? (kör ↔ téglalap közelítés)
    const legkozelebbiX = Math.max(0, Math.min(szelesseg, kepX));
    const legkozelebbiY = Math.max(0, Math.min(magassag, kepY));
    const tavolsag = Math.hypot(kepX - legkozelebbiX, kepY - legkozelebbiY);

    if (tavolsag <= kepSugar) {
      talalatok.push({ ...p, kepX, kepY, kepSugar });
    }

    // Kifelé haladva a síkidom egyre nagyobb; ha már sokszorosan túlnőtte a
    // képernyőt, a további (még nagyobb) példányok sem hoznak semmit
    if (kepSugar > felsoKepSugar) break;
  }

  return talalatok;
}

// ===== ÜRES KÖR SUGARA (képpontban) =====
// A közepén lévő üres kör látszó sugara: a legbelső még kirajzolt síkidom
// távolsága a középponttól, képpontban. Ez az a terület, ahová a még be nem
// töltött, kisebb entitások kerülnek majd.
//
// @param {Object} spiral
// @param {number} skala
// @param {number} minKeppont
// @returns {number} az üres kör sugara képpontban
export function uresKorSugar(spiral, skala, minKeppont) {
  const legbelso = legbelsoLathatoIndex(spiral, skala, minKeppont);
  return pozicio(legbelso, spiral).tavolsag * skala;
}

// ===== AL-ENTITÁSOK NÉZETE (spirál egy síkidomon BELÜL) =====
// Egy síkidom belsejében UGYANAZ a spirál ismétlődik: az al-entitások pontosan
// úgy rendeződnek a szülőjükön belül, ahogy a legfelső szint a képernyőn. Ezért
// az egész ábra fraktál: befelé a spirál mentén ÉS lefelé a szintek mentén is
// vég nélkül folytatható.
//
// A méretezés: a legnagyobb al-entitás éppen érintse BELÜLRŐL a szülő peremét.
// Ha a legnagyobb al-entitás d távolságra van a szülő közepétől, a sugara c·d
// (c = sugarArany), tehát d + c·d = szülő sugara → d = szülőSugár / (1 + c).
// A gyerek-nézet nagyítása ebből: skala = d / alapTavolsag.
//
// MELLÉKES, DE SZÉP: az így adódó szint-arány (szülő sugara / legnagyobb gyerek
// sugara) az alapbeállítással ≈ 4,7 — vagyis a terület ≈ 22-ed részére csökken
// szintenként. A koino hierarchia ×20-as terület-osztója szinte pontosan ez.
//
// @param {Object} spiral - a spiralElokeszites() eredménye
// @param {Object} nezet - a SZÜLŐ nézete (a forgatás öröklődik)
// @param {Object} szulo - egy lathatoSikidomok()-elem: {kepX, kepY, kepSugar}
// @returns {Object} a gyerekekhez való nézet {skala, eltolasX, eltolasY, forgatas}
export function gyerekNezet(spiral, nezet, szulo) {
  const legkulsoTavolsag = szulo.kepSugar / (1 + spiral.sugarArany);

  return {
    skala: legkulsoTavolsag / spiral.alapTavolsag,
    eltolasX: szulo.kepX,
    eltolasY: szulo.kepY,
    forgatas: nezet.forgatas ?? 0
  };
}

export default {
  spiralElokeszites, pozicio, lathatoSikidomok, uresKorSugar, gyerekNezet
};
