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
import StrukturaModal from './components/modals/StrukturaModal.js';
import SikidomModal from './components/modals/SikidomModal.js';

// ===================================
// A PROGRAM MEGJEGYZÉSEI — útvonalanként a legutóbbi
// ===================================

const utolsoMegjegyzes = new Map();
// ⭐ D101 ④: a Síkidom gyerek-kéréseinek `betoltes` jele, szülőnként (a gyökér szintje: 'vilag' — a modál jele).
const SIKIDOM_VILAG = 'vilag';
const sikidomBetoltes = new Map();

document.addEventListener('koino:megjegyzes', (e) => {
  const { utvonal, szoveg, betoltes } = e.detail ?? {};
  if (typeof utvonal !== 'string') return;
  const [ut, kerdes = ''] = utvonal.split('?');
  // ⭐ Az útvonal a kérdőjel előtti rész — a modál ugyanazt az útvonalat kérdezi más paraméterekkel is.
  utolsoMegjegyzes.set(ut, typeof szoveg === 'string' && szoveg ? szoveg : null);
  if (ut === 'sikidom/gyerekek') {
    sikidomBetoltes.set(new URLSearchParams(kerdes).get('szulo') || SIKIDOM_VILAG, betoltes === true);
  }
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
 * ⚠️ Ha az eredeti aszinkron (ígéretet ad), a koinós rész az ígéret TELJESÜLÉSE után fut — különben a válasz előtt
 * írna (D101 ③: a Struktúra darabszám-lekérése).
 */
function koruleIr(Osztaly, metodus, utana) {
  const eredeti = Osztaly.prototype[metodus];
  if (typeof eredeti !== 'function' || eredeti.koinoKorulirva) return;
  const uj = function (...ervek) {
    const ertek = eredeti.apply(this, ervek);
    if (ertek && typeof ertek.then === 'function') {
      return ertek.then((x) => { utana.call(this, ...ervek); return x; });
    }
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

// ===================================
// ⭐ A STRUKTÚRA (D101 ③)
// ===================================
//
// A prototípusban a fa a TELJES koinó volt; itt a készüléken ismert rész, a legerősebb ágaktól kifelé, egy keretig. A
// program kimondja, mire épül a fa, meddig biztos a sorrend, és mit kért el (`koinoMegjegyzes`) — a lap a folyamatjelző
// (építés közben) és a súgó-sor (a kész fán) alá írja.
koruleIr(StrukturaModal, '_darabszamLekerese', function () {
  const szoveg = megjegyzes('struktura/darabszam');
  megjegyzesKirajzolasa(document.getElementById('struktura-folyamat'), szoveg);
  megjegyzesKirajzolasa(document.querySelector('#struktura-nezet .struktura-modal__sugo'), szoveg);
});

// ===================================
// ⭐ A SÍKIDOM (D101 ④)
// ===================================
//
// A prototípus egy síkidom gyerekeit képernyő-vezérelten kéri (`_gyerekekBetoltese`), és „kész”-nek jegyzi, ha a válasz
// szerint nincs több (`mindenLetoltve`, `betoltottKuszob`, a kurzor). A szigorú (b) alatt egy nem tartott síkidom gyerekei
// a kérelem útján jönnek — később. ⭐ Ezért ha a program azt mondja, hogy egy síkidom hiányzó gyerekeit elkérte
// (`betoltes`), a lap csendben újrakérdez (4 → 60 mp, mint a pakli): a síkidom „kész” jegyét és a kurzorát visszaállítja, és
// a prototípus a SZOKÁSOS útján kéri újra — ha a síkidom épp látszik; ha nem, akkor, amikor látszani fog. A már meglévőket
// a modál saját szűrője kihagyja (`_varolistaraFuzes`). A megjegyzés a vászon tetejére kerül.
const SIKIDOM_UJRA_ELSO = 4000;
const SIKIDOM_UJRA_LEGFELJEBB = 60000;

function sikidomMegjegyzesKirajzolasa(modal) {
  const szoveg = [megjegyzes('sikidom/gyerekek'), modal._koinoLancMegjegyzes].filter(Boolean).join(' ') || null;
  // a kész nézetben a vászon tetején; amíg a nézet tölt (vagy még semmit nem ismer), a töltő felirat alatt
  megjegyzesKirajzolasa(document.querySelector('#sikidom-nezet .sikidom-modal__sugo'), szoveg);
  megjegyzesKirajzolasa(document.getElementById('sikidom-betoltes-szoveg'), szoveg);
}

function sikidomUjrakerdezesUtemezese(modal) {
  if (modal._koinoUjraOra) return;
  const koz = modal._koinoUjraKoz ?? SIKIDOM_UJRA_ELSO;
  modal._koinoUjraKoz = Math.min(koz * 2, SIKIDOM_UJRA_LEGFELJEBB);
  modal._koinoUjraOra = setTimeout(() => {
    modal._koinoUjraOra = null;
    if (!modal.modal?.nyitottE || !modal._koinoFuggok?.size) return;
    // ⚠️ Az üres világ (még semmit nem ismertem — „Még nincs megjeleníthető entitás.”): a prototípus a megnyitáskor dönt
    // erről, a vászon ilyenkor méretezetlen — ugyanazt az utat futtatjuk újra.
    const vilag = modal._tar.get(SIKIDOM_VILAG);
    if (!vilag?.gyerekIdk.length && !vilag?.varolista.length) {
      modal._koinoFuggok.clear();
      modal.megnyitas();
      return;
    }
    for (const id of modal._koinoFuggok) {
      const cs = modal._tar.get(id);
      if (!cs) continue;
      // A „kész” jegy és a kurzor vissza: a következő kérés elölről jön (az új, nagyobb gyerek is a sorba kerülhet), az
      // összes pontot is újra elkérjük.
      cs.kurzorPont = null;
      cs.kurzorId = null;
      cs.betoltottKuszob = Infinity;
      cs.mindenLetoltve = false;
      cs.osszesGyerekPont = 0;
    }
    modal._koinoFuggok.clear();
    modal._tennivalokFeldolgozasa();
  }, koz);
}

koruleIr(SikidomModal, '_gyerekekBetoltese', function (szuloId) {
  sikidomMegjegyzesKirajzolasa(this);
  if (sikidomBetoltes.get(szuloId) === true) {
    (this._koinoFuggok ??= new Set()).add(szuloId);
    sikidomUjrakerdezesUtemezese(this);
  }
});

koruleIr(SikidomModal, '_osLancFelfuzese', function () {
  this._koinoLancMegjegyzes = megjegyzes('sikidom/oslanc');
  sikidomMegjegyzesKirajzolasa(this);
});

koruleIr(SikidomModal, '_takaritasBezaraskor', function () {
  clearTimeout(this._koinoUjraOra);
  this._koinoUjraOra = null;
  this._koinoFuggok?.clear();
  this._koinoUjraKoz = null;
});
