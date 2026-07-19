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
// @param {Function} onLepes - callback: ('elozo'|'kovetkezo') irányú testvérváltás
constructor(onLepes) {
  console.log('TestverJelzo.constructor - KEZDÉS');
  this.onLepes = onLepes;
  this.balGomb = null;  // ‹ N gomb DOM eleme
  this.jobbGomb = null; // N › gomb DOM eleme
  console.log('TestverJelzo.constructor - VÉGE');
}

// ----- MEGJELENÍTÉS -----
// A korábbi gombokat eltávolítja, majd a hordozó kártyára illeszti az újakat.
// Csak abba az irányba tesz gombot, amerre VAN testvér (0-nál nincs gomb).
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

  if (elozoSzam > 0) {
    this.balGomb = this._gombLetrehozasa('elozo', elozoSzam);
    hordozoElem.appendChild(this.balGomb);
  }
  if (kovetkezoSzam > 0) {
    this.jobbGomb = this._gombLetrehozasa('kovetkezo', kovetkezoSzam);
    hordozoElem.appendChild(this.jobbGomb);
  }

  console.log('TestverJelzo.megjelenites - VÉGE', {
    balGombVan: !!this.balGomb,
    jobbGombVan: !!this.jobbGomb
  });
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
// Mindkét gombot leszedi a DOM-ról (ha épp rajta vannak) és elengedi a referenciákat.
eltavolitas() {
  if (this.balGomb) {
    this.balGomb.remove();
    this.balGomb = null;
  }
  if (this.jobbGomb) {
    this.jobbGomb.remove();
    this.jobbGomb = null;
  }
}

}

// --- EXPORTÁLÁS ---
export default TestverJelzo;
