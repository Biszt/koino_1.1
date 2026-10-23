// koino/felulet/js/koinoFelderitetlen.js

// Felelősség: ⭐⭐ D116 (Csaba, 2026-10-22: „(B) Gyerekszám + össz-darab”) — a FELDERÍTETLEN RÉSZ JELE: ha egy csomópont
// alatt van még entitás, amit ez a készülék nem ismer, a jel megmondja, mennyi (a tartója szerint) — a ház kártyáin, a
// testvér-jelző mellett, a Struktúra csomópontjain és a Síkidom alakzatain ugyanazzal a szöveggel (egy helyen, hogy a négy
// nézet ne mondjon mást).
//
// A számok a programtól jönnek (`pakli.js` `felderitetlenTudas` — a kártya és a sor `hiany`-ja):
//   · `gyerek` — hány közvetlen gyereke nem ismert (null: nem tudom — a tartója nem mondta meg);
//   · `alatta` — hány entitás nem ismert alatta összesen (ha `legalabb`, legalább ennyi);
//   · `osszesGyerek`, `osszesAlatta` — a tartója szerint; `ismertGyerek`, `ismertAlatta` — amit ez a készülék ismer.
//
// ⚠️ A hiány látszik, de nem vád (D19): halvány jel és magyarázat, nem figyelmeztetés. A lap itt sem számol — csak a kapott
// számokat mondja ki (a kivonás is a programé: `gyerek`, `alatta`).
//
// ⭐ (Csaba, 2026-10-23): a ház kártyáján nem csak a hiány, hanem MINDIG a leszármazottak és a testvérek ismert száma is
// (`kartyaSzamokJelolese`), a hiány halványan mellettük.
//
// Használja: `koinoPakli.js` (a ház), `koinoModalok.js` (a Struktúra, a Síkidom).

const szam = (n) => Number(n).toLocaleString('hu-HU');

/**
 * A jel rövid alakja és a magyarázata.
 * @param {Object|null} h - a program `hiany`-ja
 * @returns {{jel: string, felirat: string}|null} null, ha nincs mit jelezni
 */
export function hianyJele(h) {
  if (!h || typeof h !== 'object') return null;
  const alatta = Number.isSafeInteger(h.alatta) ? h.alatta : 0;
  const gyerek = Number.isSafeInteger(h.gyerek) ? h.gyerek : null;
  if (alatta === 0 && gyerek === 0 && !h.legalabb) return null;

  // A rövid alak: hány entitás hiányzik alatta (ha nem tudjuk pontosan: „+?”, vagy „legalább N” → „+N…”).
  let jel;
  if (alatta > 0) jel = '+' + szam(alatta) + (h.legalabb ? '…' : '');
  else if (gyerek > 0) jel = '+' + szam(gyerek);
  else jel = '+?';

  const reszek = [];
  if (alatta > 0 || gyerek > 0) {
    const mi = [];
    if (gyerek > 0) mi.push(szam(gyerek) + ' gyereke');
    if (alatta > 0) mi.push((gyerek > 0 ? 'alatta összesen ' : '') + (h.legalabb ? 'legalább ' : '') + szam(alatta) + ' entitás');
    reszek.push('Még nem ismert ezen a készüléken: ' + mi.join(', ') + '.');
  } else {
    reszek.push('Nem tudom, ismerem-e mindazt, ami alatta van — a tartója még nem mondta meg.');
  }
  const tarto = [];
  if (Number.isSafeInteger(h.osszesGyerek)) tarto.push(szam(h.osszesGyerek) + ' gyereke');
  if (Number.isSafeInteger(h.osszesAlatta)) tarto.push((h.legalabb ? 'legalább ' : '') + szam(h.osszesAlatta) + ' entitás alatta');
  if (tarto.length) {
    reszek.push('A tartója szerint ' + tarto.join(' és ') + ' van; ebből ' + szam(h.ismertGyerek ?? 0) + ' gyereket és '
      + szam(h.ismertAlatta ?? 0) + ' entitást ismerek.');
  }
  reszek.push('Böngészéssel vagy felderítéssel hozható el.');
  return { jel, felirat: reszek.join(' ') };
}

/**
 * ⭐ (Csaba, 2026-10-23): a ház kártyáján MINDIG a leszármazottak (▾) és a testvérek (↔) ismert száma — a tudatpont-sor
 * számainak stílusában (`pakli-kartya__ikon-elem`, mint az ágazati pont) —, és mellettük halványan, ami még nincs meg („+N”,
 * vagy „+?”, ha nem tudjuk). Az ágazati pont mellé kerül (a kártya bájtra a prototípusé, ez a kirajzolás után). Ismételhető:
 * a régi jeleket lecseréli.
 * @param {HTMLElement} dom - a kártya DOM-ja
 * @param {Object|null} sz - a kártya `koinoSzamok`-ja (`pakli.js` `kartyaSzamai`)
 */
export function kartyaSzamokJelolese(dom, sz) {
  if (!dom) return;
  dom.querySelectorAll('.pakli-kartya__koino-szam').forEach((e) => e.remove());
  if (!sz || typeof sz !== 'object') return;
  const sor = dom.querySelector('.pakli-kartya__ikon-sor--tudatpont');
  if (!sor) return;
  const elemek = [];
  // ----- a leszármazottak -----
  if (Number.isSafeInteger(sz.leszarmazott)) {
    const hiany = sz.leszarmazottHiany > 0 ? '+' + szam(sz.leszarmazottHiany) + (sz.leszarmazottLegalabb ? '…' : '')
      : sz.leszarmazottLegalabb ? '+?' : null;
    const felirat = 'Leszármazottak (az ága alatt): ' + szam(sz.leszarmazott) + ' ismert ezen a készüléken'
      + (sz.leszarmazottHiany > 0
        ? '; a tartója szerint ' + (sz.leszarmazottLegalabb ? 'legalább ' : '') + szam(sz.leszarmazottOsszes)
          + ' van — még nem ismert: ' + (sz.leszarmazottLegalabb ? 'legalább ' : '') + szam(sz.leszarmazottHiany)
          + '. Böngészéssel vagy felderítéssel hozható el.'
        : sz.leszarmazottLegalabb ? '; hogy van-e még, nem tudom — a tartója nem mondta meg.' : ' — mind megvan.');
    elemek.push(szamElem('▾', sz.leszarmazott, hiany, felirat));
  }
  // ----- a testvérek -----
  if (Number.isSafeInteger(sz.testver)) {
    const hiany = sz.testverHiany > 0 ? '+' + szam(sz.testverHiany) : sz.testverHiany === null ? '+?' : null;
    const felirat = 'Testvérek: ' + szam(sz.testver) + ' ismert ezen a készüléken'
      + (sz.testverHiany > 0
        ? '; a tartó szerint a szülőnek ' + szam(sz.testverOsszes) + ' gyereke van — még nem ismert testvér: '
          + szam(sz.testverHiany) + '. Böngészéssel vagy felderítéssel hozható el.'
        : sz.testverHiany === null ? '; hogy van-e még, nem tudom — a szülő tartója nem mondta meg.' : ' — mind megvan.');
    elemek.push(szamElem('↔', sz.testver, hiany, felirat));
  }
  let elotte = sor.querySelector('.pakli-kartya__ikon-elem[aria-label^="Ágazati"]');
  for (const elem of elemek) {
    if (elotte) { elotte.insertAdjacentElement('afterend', elem); elotte = elem; } else sor.appendChild(elem);
  }
}

/** Egy szám a tudatpont-sor stílusában (mint az ágazati pont), a hiány halványan mellette. */
function szamElem(jel, ismert, hiany, felirat) {
  const elem = document.createElement('span');
  elem.className = 'pakli-kartya__ikon-elem pakli-kartya__koino-szam';
  elem.textContent = jel + ' ' + szam(ismert);
  if (hiany) {
    const h = document.createElement('span');
    h.className = 'pakli-kartya__felderitetlen';
    h.textContent = hiany;
    elem.appendChild(h);
  }
  elem.title = felirat;
  elem.setAttribute('aria-label', felirat);
  return elem;
}

/**
 * A testvér-jelző mellett: hány testvér nem ismert (a jobb szélen, a kacsacsőrök alatt — nem gomb: oda nem lehet lépni,
 * amíg meg nem jött). A `TestverJelzo` bájtra a prototípusé; ez külön elem a body-n, ugyanúgy a képernyőhöz rögzítve.
 * @param {Object|null} h - a kiválasztott szülőjének `hiany`-ja (`testverHiany`)
 */
export function testverHianyJelzo(h) {
  document.querySelector('.koino-testver-hiany')?.remove();
  if (!h || !(h.gyerek > 0 || (h.gyerek === null && h.legalabb))) return;
  const elem = document.createElement('div');
  elem.className = 'koino-testver-hiany';
  if (h.gyerek > 0) {
    elem.textContent = '+' + szam(h.gyerek) + ' testvér';
    elem.title = szam(h.gyerek) + ' testvére még nem ismert ezen a készüléken (a tartója szerint ' + szam(h.osszesGyerek)
      + ' gyereke van a szülőnek, ebből ' + szam(h.ismertGyerek) + ' ismert). Böngészéssel vagy felderítéssel hozható el.';
  } else {
    elem.textContent = '+? testvér';
    elem.title = 'Nem tudom, ismerem-e minden testvérét — a tartója még nem mondta meg, hány gyereke van a szülőnek.';
  }
  elem.setAttribute('aria-label', elem.title);
  document.body.appendChild(elem);
}

/** A testvér-jelző eltávolítása (pl. lapos nézetben). */
export function testverHianyEltavolitasa() {
  document.querySelector('.koino-testver-hiany')?.remove();
}

/**
 * A Struktúra egy csomópontján: a jel a kör alá-jobbra (SVG — a csomópont saját koordinátáiban, tehát vele nagyítódik).
 * @param {SVGGElement} g - a csomópont csoportja (`struktura-modal__csomopont`)
 * @param {Object|null} h
 */
export function strukturaHianyJelolese(g, h) {
  const j = hianyJele(h);
  if (!g || !j || g.querySelector('.koino-struktura-hiany')) return;
  const r = Number(g.querySelector('circle')?.getAttribute('r')) || 16;
  const NS = 'http://www.w3.org/2000/svg';
  const szoveg = document.createElementNS(NS, 'text');
  szoveg.setAttribute('class', 'koino-struktura-hiany');
  szoveg.setAttribute('x', String(r * 0.8));
  szoveg.setAttribute('y', String(r * 1.05));
  szoveg.textContent = j.jel;
  const cim = document.createElementNS(NS, 'title');
  cim.textContent = j.felirat;
  szoveg.appendChild(cim);
  g.appendChild(szoveg);
}

/**
 * A Síkidom egy alakzatán: a jel a vászonra, a síkidom alsó szélére (a prototípus menetei UTÁN — ami később kerül fel, az
 * van fölül). Csak ha az alakzat elég nagy, és a halványulása szerint (mint a prototípus feliratai).
 * @param {CanvasRenderingContext2D} c
 * @param {{kepX: number, kepY: number, kepSugar: number}} kep
 * @param {Object|null} h
 * @param {number} lathatosag - 0–1 (a prototípus `halvanyodas`-a)
 */
export function sikidomHianyRajzolasa(c, kep, h, lathatosag = 1) {
  const j = hianyJele(h);
  if (!c || !j || !(kep?.kepSugar * 2 >= 60) || lathatosag <= 0.05) return;
  const betu = Math.max(10, Math.min(16, kep.kepSugar * 0.18));
  const szoveg = '▾' + j.jel;
  c.save();
  c.globalAlpha = lathatosag * 0.9;
  c.font = `600 ${betu.toFixed(0)}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const sz = c.measureText(szoveg).width + betu * 0.9;
  const m = betu * 1.5;
  const x = kep.kepX;
  const y = kep.kepY + kep.kepSugar * 0.78;
  c.fillStyle = 'rgba(247, 243, 236, 0.85)';
  c.beginPath();
  c.rect(x - sz / 2, y - m / 2, sz, m);
  c.fill();
  c.fillStyle = '#6b5f52';
  c.fillText(szoveg, x, y);
  c.restore();
}
