// frontend/js/components/TestverJelzo.js

// ===== TESTVÉR-JELZŐ KACSACSŐRÖK =====
// Felelősség: a kiválasztott kártya két szélén lebegő ‹ N és N › jelzők
// megjelenítése — N = hány testvér entitás van az adott irányban.
// A gombok KATTINTHATÓK: koppintásra testvérváltás történik (így a
// testvérváltás mobilon is elérhető, nem csak vízszintes görgetéssel).
// Használja: Pakli.js (testverJelzoFrissitese) — a számokat a Pakli adja át,
// a közös testverRendezes.js segédből számolva.
class TestverJelzo {

// ----- KONSTRUKTOR -----
// @param {Function} onLepes - callback a testvérváltáshoz. Irányok:
//   'elozo' / 'kovetkezo' (egy lépés), 'legelso' / 'legutolso' (a sor széléig ugrás)
constructor(onLepes) {
  console.log('TestverJelzo.constructor - KEZDÉS');
  this.onLepes = onLepes;
  // Minden kihelyezett gomb egy tömbben — az eltávolítás egyszerű és teljes.
  this.gombok = [];
  console.log('TestverJelzo.constructor - VÉGE');
}

// ----- MEGJELENÍTÉS -----
// A korábbi gombokat eltávolítja, majd a hordozó kártyára illeszti az újakat.
// Oldalanként két gomb: egy LÉPÉS-gomb (‹ N / N ›) és egy UGRÁS-gomb (|‹ / ›|,
// a sor legelejére / legvégére). Csak abba az irányba teszünk gombot, amerre
// VAN testvér (0-nál egyik sem jelenik meg).
// @param {HTMLElement} hordozoElem - a kiválasztott kártya külső DOM eleme
//   (position: relative — a gombok ehhez képest pozicionálódnak)
// @param {number} elozoSzam - testvérek száma az 'elozo' irányban (bal)
// @param {number} kovetkezoSzam - testvérek száma a 'kovetkezo' irányban (jobb)
megjelenites(hordozoElem, elozoSzam, kovetkezoSzam) {
  console.log('TestverJelzo.megjelenites - KEZDÉS', { elozoSzam, kovetkezoSzam });

  this.eltavolitas();
  if (!hordozoElem) {
    console.warn('TestverJelzo.megjelenites - VÉGE: nincs hordozó elem');
    return;
  }

  // BAL oldal: lépés az előző testvérre + ugrás a legelső testvérre
  if (elozoSzam > 0) {
    this._gombKihelyezese(this._gombLetrehozasa('elozo', elozoSzam));
    this._gombKihelyezese(this._ugrasGombLetrehozasa('legelso'));
  }
  // JOBB oldal: lépés a következő testvérre + ugrás a legutolsó testvérre
  if (kovetkezoSzam > 0) {
    this._gombKihelyezese(this._gombLetrehozasa('kovetkezo', kovetkezoSzam));
    this._gombKihelyezese(this._ugrasGombLetrehozasa('legutolso'));
  }

  console.log('TestverJelzo.megjelenites - VÉGE', { gombok: this.gombok.length });
}

// ----- EGY GOMB KIHELYEZÉSE -----
// A gombok FIXen a KÉPERNYŐHÖZ (monitorhoz) igazodnak: függőlegesen a képernyő
// közepén, vízszintesen a képernyő bal/jobb szélénél — mindezt a CSS adja
// (position: fixed). Ezért a body-ra tesszük őket, így egy transzformált szülő
// (pl. a kártya-váltás animációja) NEM mozdítja el őket — testvérváltáskor is
// pontosan egy helyben maradnak (Csaba kérése, 2026-08-03).
_gombKihelyezese(gomb) {
  document.body.appendChild(gomb);
  this.gombok.push(gomb);
}

// ----- UGRÁS-GOMB LÉTREHOZÁSA -----
// A sor szélére ugró gomb (nincs rajta szám, csak a jel). Ugyanaz az áttetsző
// stílus, mint a lépés-gomboké (a --ugras módosító csak a függőleges pozíciót adja).
// @param {string} irany - 'legelso' (bal, |‹) vagy 'legutolso' (jobb, ›|)
// @returns {HTMLElement} a kész gomb
_ugrasGombLetrehozasa(irany) {
  const legelso = irany === 'legelso';

  const gomb = document.createElement('button');
  gomb.type = 'button';
  gomb.className = `testver-jelzo testver-jelzo--ugras testver-jelzo--${legelso ? 'bal' : 'jobb'}`;
  gomb.setAttribute('aria-label', legelso ? 'Ugrás a legelső testvérre' : 'Ugrás a legutolsó testvérre');

  const jel = document.createElement('span');
  jel.className = 'testver-jelzo__nyil';
  jel.setAttribute('aria-hidden', 'true');
  jel.textContent = legelso ? '|‹' : '›|';
  gomb.appendChild(jel);

  gomb.addEventListener('click', (esemeny) => {
    esemeny.stopPropagation(); // ne váltson kártya-kiválasztást
    console.log('TestverJelzo - ugrás gomb kattintás', { irany });
    if (typeof this.onLepes === 'function') this.onLepes(irany);
  });

  return gomb;
}

// ----- GOMB LÉTREHOZÁSA -----
// Egyetlen kacsacsőr-gomb DOM elemét építi fel.
// @param {string} irany - 'elozo' (bal) vagy 'kovetkezo' (jobb)
// @param {number} szam - a testvérek száma az adott irányban
// @returns {HTMLElement} a kész gomb
_gombLetrehozasa(irany, szam) {
  const balE = irany === 'elozo';

  const gomb = document.createElement('button');
  gomb.type = 'button';
  gomb.className = `testver-jelzo testver-jelzo--${balE ? 'bal' : 'jobb'}`;
  gomb.setAttribute(
    'aria-label',
    balE ? `Előző testvér (${szam} van ebben az irányban)`
         : `Következő testvér (${szam} van ebben az irányban)`
  );

  const nyil = document.createElement('span');
  nyil.className = 'testver-jelzo__nyil';
  nyil.setAttribute('aria-hidden', 'true');
  nyil.textContent = balE ? '‹' : '›';

  const szamElem = document.createElement('span');
  szamElem.className = 'testver-jelzo__szam';
  szamElem.textContent = szam;

  // Bal: ‹ szám — Jobb: szám ›
  if (balE) {
    gomb.appendChild(nyil);
    gomb.appendChild(szamElem);
  } else {
    gomb.appendChild(szamElem);
    gomb.appendChild(nyil);
  }

  // stopPropagation: a kattintás NE jusson el a kártyáig (az kártya-kiválasztást
  // indítana) — a gomb kizárólag testvérváltást végez.
  gomb.addEventListener('click', (esemeny) => {
    esemeny.stopPropagation();
    console.log('TestverJelzo - gomb kattintás', { irany });
    if (typeof this.onLepes === 'function') {
      this.onLepes(irany);
    }
  });

  return gomb;
}

// ----- ELTÁVOLÍTÁS -----
// Az összes kihelyezett gombot leszedi a DOM-ról és üríti a nyilvántartást.
eltavolitas() {
  this.gombok.forEach(gomb => gomb.remove());
  this.gombok = [];
}

}

// --- EXPORTÁLÁS ---
export default TestverJelzo;
