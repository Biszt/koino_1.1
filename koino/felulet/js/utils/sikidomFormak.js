// frontend/js/utils/sikidomFormak.js

// ===== SÍKIDOM-FORMÁK (entitástípus → forma) =====
// Felelősség: melyik entitástípus melyik síkidomként jelenjen meg a Síkidom
// nézetben, milyen színnel. Csaba döntése (2026-07-20):
//   Gondolat = kör, Kategória = háromszög (3), Gondolattípus = négyzet (4),
//   Javaslat = ötszög (5), Egyezmény = hatszög (6).
// A modul TISZTA (nincs DOM-függése): leírókat és pont-listát ad; az SVG-elemet
// a SikidomModal építi ezekből.

// Entitástípus → forma-leíró.
//   forma: 'kor' | 'sokszog'
//   oldalak: sokszögnél az oldalak száma
//   kezdoSzogFok: az első csúcs szöge fokban (a forma „állását" adja)
//   szin: kitöltés/keret alapszíne
//   nev: emberi név (tooltiphez)
const TIPUS_FORMA = {
  Gondolat:      { forma: 'kor',     oldalak: 0, kezdoSzogFok: 0,   szin: '#2d5a27', nev: 'Gondolat' },
  Kategoria:     { forma: 'sokszog', oldalak: 3, kezdoSzogFok: -90, szin: '#7d5ba6', nev: 'Kategória' },
  GondolatTipus: { forma: 'sokszog', oldalak: 4, kezdoSzogFok: -45, szin: '#b07d2a', nev: 'Gondolattípus' },
  Javaslat:      { forma: 'sokszog', oldalak: 5, kezdoSzogFok: -90, szin: '#1f6e8c', nev: 'Javaslat' },
  Egyezmeny:     { forma: 'sokszog', oldalak: 6, kezdoSzogFok: -90, szin: '#6d6a62', nev: 'Egyezmény' },
};

// Ismeretlen típus tartaléka
const ALAP_FORMA = { forma: 'kor', oldalak: 0, kezdoSzogFok: 0, szin: '#2b2318', nev: 'Ismeretlen' };

// ----- FORMA-LEÍRÓ LEKÉRÉSE -----
// @param {string} entitasTipus
// @returns {Object} a forma-leíró (a fentiek egyike)
export function sikidomLeiro(entitasTipus) {
  return TIPUS_FORMA[entitasTipus] ?? ALAP_FORMA;
}

// ----- SZABÁLYOS SOKSZÖG PONTJAI -----
// A középpont köré rajzolt szabályos sokszög csúcsainak SVG points-stringje.
// @param {number} kozepX
// @param {number} kozepY
// @param {number} sugar
// @param {number} oldalak - csúcsok/oldalak száma (≥3)
// @param {number} kezdoSzogFok - az első csúcs szöge fokban
// @returns {string} "x1,y1 x2,y2 ..." (SVG polygon points)
export function sokszogPontok(kozepX, kozepY, sugar, oldalak, kezdoSzogFok = -90) {
  const pontok = [];
  const kezdoRad = (kezdoSzogFok * Math.PI) / 180;
  for (let i = 0; i < oldalak; i++) {
    const szog = kezdoRad + (i * 2 * Math.PI) / oldalak;
    const x = kozepX + sugar * Math.cos(szog);
    const y = kozepY + sugar * Math.sin(szog);
    pontok.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }
  return pontok.join(' ');
}

export { TIPUS_FORMA };
