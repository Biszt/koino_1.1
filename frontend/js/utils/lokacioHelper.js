// frontend/js/utils/lokacioHelper.js

// ── IMPORTOK ──
import { apiGet } from './apiHelper.js'; // API GET kérésekhez

// ── LOKÁCIÓ AUTOCOMPLETE HELPER ──
// Felelőssége:
//   1. Gépelés közben lekéri a backend javaslatait
//   2. Megjelenít egy legördülő listát az input alatt
//   3. Kiválasztáskor beírja az értéket az inputba és bezárja a listát

// ── DEBOUNCE SEGÉDFÜGGVÉNY ──
// Megvárja, amíg a eember abbahagyja a gépelést (késleltetés ms)
// mielőtt ténylegesen API kérést küldene — így nem bombázzuk a szervert
// param Function fn       - A késleltetendő függvény
// param number kesleletes - Várakozási idő milliszekundumban
// returns Function
function debounce(fn, kesleletes = 300) {
  let idozito;
  return function (...argumentumok) {
    // Előző időzítő törlése — csak az utolsó gépelés után küldünk kérést
    clearTimeout(idozito);
    idozito = setTimeout(() => fn.apply(this, argumentumok), kesleletes);
  };
}

// ── JAVASLAT LISTA MEGJELENÍTÉSE ──
// Az input mező alá rajzol egy legördülő listát
// param HTMLElement inputElem    - Az input mező
// param string[] javaslatok      - A megjelenítendő értékek tömbje
// param Function kivalasztasKb   - Kattintáskor hívódik meg a kiválasztott értékkel
function javaslatListaMegjelenites(inputElem, javaslatok, kivalasztasKb) {
  // Előző lista eltávolítása
  javaslatListaBezaras();

  // Ha nincs javaslat, nem csinálunk semmit
  if (!javaslatok || javaslatok.length === 0) return;

  // Lista konténer létrehozása
  const lista = document.createElement('ul');
  lista.className = 'lokacio-javaslat-lista';
  lista.id = 'lokacio-javaslat-lista';
  lista.setAttribute('role', 'listbox'); // akadálymentesség

  // Minden javaslathoz egy listaelem
  javaslatok.forEach((ertek) => {
    const elem = document.createElement('li');
    elem.className = 'lokacio-javaslat-elem';
    elem.textContent = ertek;
    elem.setAttribute('role', 'option');

    // Kattintásra beírjuk az értéket és bezárjuk a listát
    elem.addEventListener('mousedown', (e) => {
      // mousedown helyett mousedown: megelőzi az input blur eseményt
      e.preventDefault();
      kivalasztasKb(ertek);
      javaslatListaBezaras();
    });

    lista.appendChild(elem);
  });

  // Az input mező után helyezzük el a listát
  inputElem.parentNode.appendChild(lista);
}

// ── JAVASLAT LISTA BEZÁRÁSA ──
// Eltávolítja a legördülő listát a DOM-ból
function javaslatListaBezaras() {
  const regi = document.getElementById('lokacio-javaslat-lista');
  if (regi) regi.remove();
}

// ── AUTOCOMPLETE RÁKÖTÉSE EGY INPUT MEZŐRE ──
// Ez az egyetlen publikus függvény — ezt hívja a RegisztracioForm
// param string inputId     - Az input mező ID-ja (pl. 'orszag')
// param string apiUtvonal  - A backend végpont (pl. 'lokacio/orszag')
export function autocompleteRakotese(inputId, apiUtvonal) {
  // Metódus kezdő log
  console.log('lokacioHelper.autocompleteRakotese - KEZDÉS', { inputId, apiUtvonal });

  const input = document.getElementById(inputId);
  if (!input) {
    console.log('lokacioHelper.autocompleteRakotese - VÉGE (input nem található)', { inputId });
    return;
  }

  // ── GÉPELÉS ESEMÉNY — debounce-szal ──
  // Csak akkor hív API-t, ha legalább 2 karakter van beírva
  const javaslatKeres = debounce(async (keresesiSzoveg) => {
    // Metódus kezdő log
    console.log('lokacioHelper.javaslatKeres - KEZDÉS', { inputId, keresesiSzoveg });

    // Minimum 2 karakter kell — alatta nem kérünk semmit
    if (keresesiSzoveg.length < 2) {
      javaslatListaBezaras();
      return;
    }

    try {
      // API GET kérés a backend felé
      const javaslatok = await apiGet(`${apiUtvonal}?kereses=${encodeURIComponent(keresesiSzoveg)}`);

      // Lista megjelenítése — kiválasztáskor beírja az értéket az inputba
      javaslatListaMegjelenites(input, javaslatok, (kivalasztottErtek) => {
        input.value = kivalasztottErtek;
        // Metódus vég log — kiválasztás
        console.log('lokacioHelper.javaslatKeres - kiválasztva', { inputId, kivalasztottErtek });
      });

    } catch (hiba) {
      // Hiba esetén csendben elnyeljük — nem zavar juk a eembert
      console.log('lokacioHelper.javaslatKeres - VÉGE (API hiba)', { hiba: hiba.message });
      javaslatListaBezaras();
    }

    // Metódus vég log
    console.log('lokacioHelper.javaslatKeres - VÉGE', { inputId });
  }, 300);

  // Gépelés esemény rákötése
  input.addEventListener('input', (e) => javaslatKeres(e.target.value.trim()));

  // Fókusz elvesztésekor bezárjuk a listát
  input.addEventListener('blur', () => {
    // Kis késleltetés: a mousedown eseménynek legyen ideje lefutni előbb
    setTimeout(javaslatListaBezaras, 150);
  });

  // Metódus vég log
  console.log('lokacioHelper.autocompleteRakotese - VÉGE', { inputId });
}