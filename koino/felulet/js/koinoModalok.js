// koino/felulet/js/koinoModalok.js

// Felelősség: a maradék modálok (5.8, D101) koinós TÖBBLETE — és CSAK az, amit a prototípus nem tudhatott.
//
// ===== ⭐ MIÉRT ÍGY, ÉS NEM ALOSZTÁLLYAL =====
//
// A modálok a prototípusból **bájtra változatlanul** jönnek át (D101, M5/A — a ház H3/A-ja szerint). A pakli koinós
// többlete alosztály lett (`koinoPakli.js`), mert a pakliT a lap maga példányosítja. Ezeket a modálokat viszont az
// ÖRÖKÖLT kártyák példányosítják (`Kartya.js`: `new TudatpontokModal(…)`), tehát alosztályt nem tudunk a helyükbe
// tenni anélkül, hogy a kártyához nyúlnánk. ⭐ Ezért a többlet a prototípus-osztály egy meglévő metódusa KÖRÉ kerül
// (`koruleIr`: az eredeti lefut, UTÁNA jön a koinós rész) — ugyanaz a „körülötte, nem benne” elv, mint a
// `koinoPakli.js`-é, csak a metódus becsomagolásával.
//
// ===== ⭐ A TUDÁS HATÁRA (D19, D101/M2) =====
//
// A szigorú (b) alatt a készülék nem tud mindent: egy ág-szűrésnél egy felmenő hiányozhat, egy lista csak a helyben
// ismert entitásokból áll. Ezt a PROGRAM mondja ki (a válasz `koinoMegjegyzes` mezője — a számítás és a megfogalmazás
// a programé), az `apiHelper.js` a `koino:megjegyzes` eseménnyel adja tovább, és ez a fájl a modál listája alá írja.
// ⚠️ A lap itt sem számol: csak megmutatja, amit a program mondott.
//
// Használja: `index.html` (egyszer betölti — a becsomagolás a modulok betöltésekor történik).

import TudatpontokModal from './components/modals/TudatpontokModal.js';

// ===================================
// A PROGRAM MEGJEGYZÉSEI — útvonalanként a legutóbbi
// ===================================

const utolsoMegjegyzes = new Map();

document.addEventListener('koino:megjegyzes', (e) => {
  const { utvonal, szoveg } = e.detail ?? {};
  if (typeof utvonal !== 'string') return;
  // ⭐ Az útvonal a kérdőjel előtti rész — a modál ugyanazt az útvonalat kérdezi más paraméterekkel is.
  utolsoMegjegyzes.set(utvonal.split('?')[0], typeof szoveg === 'string' && szoveg ? szoveg : null);
});

/**
 * A program legutóbbi megjegyzése egy útvonalra (null, ha nem volt mit mondania).
 * @param {string} utvonal - a kérdőjel előtti rész, pl. `tudatpont/aktiv-hozzarendelesek`
 */
export function megjegyzes(utvonal) {
  return utolsoMegjegyzes.get(utvonal) ?? null;
}

/**
 * A megjegyzés kirajzolása egy elem UTÁN (a szülőjében) — egy helyen, ugyanazzal az osztállyal minden modálnál.
 * Ha nincs mit mondani, a korábbi megjegyzés eltűnik (egy újratöltés után ne maradjon ott a régi).
 * @param {HTMLElement|null} elem - amelyik után jön (jellemzően a modál listája)
 * @param {string|null} szoveg
 */
export function megjegyzesKirajzolasa(elem, szoveg) {
  if (!elem?.parentElement) return;
  let p = elem.parentElement.querySelector(':scope > .koino-megjegyzes');
  if (!szoveg) { p?.remove(); return; }
  if (!p) {
    p = document.createElement('p');
    p.className = 'koino-megjegyzes';
    elem.insertAdjacentElement('afterend', p);
  }
  p.textContent = szoveg;
}

/**
 * Egy prototípus-osztály metódusa KÖRÉ ír: az eredeti lefut (ugyanazokkal az érvekkel, ugyanazzal a visszatérési
 * értékkel), utána a koinós rész. Kétszeri becsomagolás ellen őrzött (a modul kétszeri betöltése se duplázzon).
 */
function koruleIr(Osztaly, metodus, utana) {
  const eredeti = Osztaly.prototype[metodus];
  if (typeof eredeti !== 'function' || eredeti.koinoKorulirva) return;
  const uj = function (...ervek) {
    const ertek = eredeti.apply(this, ervek);
    utana.call(this, ...ervek);
    return ertek;
  };
  uj.koinoKorulirva = true;
  Osztaly.prototype[metodus] = uj;
}

// ===================================
// ⭐ A TUDATPONTOK (D101, az I. csoport)
// ===================================
//
// Ág-szűrve egy hozzárendelésről nem mindig dönthető el, hogy az ág alatt van-e (egy felmenője nincs meg ezen a
// készüléken): a program kimondja, hánynál nem, és hogy elkérte-e a felmenőt. A lista üres-felirata
// („Ebben az ágazatban nincs tudatpontod.”) a prototípusé — a megjegyzés alatta mondja meg, ha ez nem a teljes igazság.
koruleIr(TudatpontokModal, '_listaRenderelese', function () {
  megjegyzesKirajzolasa(document.getElementById('tudatpontok-lista'), megjegyzes('tudatpont/aktiv-hozzarendelesek'));
});
