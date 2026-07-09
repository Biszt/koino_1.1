// frontend/js/components/modals/kuszobErtekMezok.js

// ===== IMPORTOK =====
import { IDO_EGYSEGEK, legjobbIdoEgyseg, atvaltMasodpercre } from '../../utils/idoFormazo.js';

// ===== KÜSZÖBÉRTÉK-MEZŐK SEGÉDMODUL =====
// Felelősség: a négy küszöbérték szerkeszthető űrlapmezőjét EGY helyen
//   definiálja (HTML felépítés + kitöltés + visszaolvasás + validálás), hogy
//   ugyanaz a kód szolgálja ki a Küszöb érték javaslat modált és a Tartalom
//   létrehozó modált is.
// A négy küszöb:
//   - javaslatElfogadasiKuszob  – támogatottsági küszöb (51–100 %)
//   - reszveteliAranyKuszob     – részvételi arány küszöb (0–100 %)
//   - minimumDontesiIdo         – minimum döntési idő (mp)
//   - maximumDontesiIdo         – maximum döntési idő (mp)
// Az időket az e-embernek szám + egység párként mutatjuk, a backendnek
// másodpercben küldjük (lásd idoFormazo.js).
// Használják: ErtekJavaslatModal, TartalomModal.

// ----- ALAPÉRTELMEZETT KÜSZÖBÉRTÉKEK -----
// Ugyanazok, mint a backend tartalomService alapértékei, hogy a felület és a
// szerver ugyanazt az alaphelyzetet mutassa.
export const KUSZOB_ALAPERTEKEK = {
  javaslatElfogadasiKuszob: 51,          // egyszerű többség (51 %)
  reszveteliAranyKuszob:    51,          // részvételi arány (51 %)
  minimumDontesiIdo:        0,           // 0 mp – azonnali végrehajtás lehet
  maximumDontesiIdo:        31536000     // 1 év
};

// ===== SEGÉD: IDŐ-EGYSÉG OPCIÓK HTML =====
// A <select> opcióit adja vissza; a megadott kulcs lesz kiválasztva.
function _idoEgysegOpciok(kivalasztottKulcs) {
  return IDO_EGYSEGEK
    .map(e => {
      const kivalasztva = e.kulcs === kivalasztottKulcs ? ' selected' : '';
      return `<option value="${e.kulcs}"${kivalasztva}>${e.felirat}</option>`;
    })
    .join('');
}

// ===== MEZŐK HTML FELÉPÍTÉSE =====
// A négy küszöbmező HTML-jét adja vissza szövegként. A `prefix` teszi egyedivé
// az elem-azonosítókat, hogy két modál mezői ne ütközzenek (pl. 'ej', 'uj').
// @param {string} prefix - az id-k előtagja
// @returns {string} HTML
export function kuszobMezokHtml(prefix) {
  console.log('kuszobErtekMezok.kuszobMezokHtml - KEZDÉS', { prefix });

  // Alap idő-egységek a max mezőhöz (1 év) és a min mezőhöz (mp)
  return `
    <div class="kuszob-mezok" data-prefix="${prefix}">

      <!-- ── TÁMOGATOTTSÁGI KÜSZÖB (%) ── -->
      <div class="kuszob-mezo">
        <label class="kuszob-mezo__cimke" for="${prefix}-tamogatottsag">
          Támogatottsági küszöb (%)
        </label>
        <input
          type="number"
          id="${prefix}-tamogatottsag"
          class="kuszob-mezo__input"
          min="51" max="100" step="1"
          aria-label="Támogatottsági küszöb százalékban (51–100)"
        />
        <span class="kuszob-mezo__sugo">Mekkora támogatottság kell az elfogadáshoz (51–100%).</span>
      </div>

      <!-- ── RÉSZVÉTELI ARÁNY KÜSZÖB (%) ── -->
      <div class="kuszob-mezo">
        <label class="kuszob-mezo__cimke" for="${prefix}-reszvetel">
          Részvételi arány küszöb (%)
        </label>
        <input
          type="number"
          id="${prefix}-reszvetel"
          class="kuszob-mezo__input"
          min="0" max="100" step="1"
          aria-label="Részvételi arány küszöb százalékban (0–100)"
        />
        <span class="kuszob-mezo__sugo">Mekkora részvétel kell a döntéshez (0–100%).</span>
      </div>

      <!-- ── MINIMUM DÖNTÉSI IDŐ ── -->
      <div class="kuszob-mezo">
        <label class="kuszob-mezo__cimke" for="${prefix}-min-ido-ertek">
          Minimum döntési idő
        </label>
        <div class="kuszob-mezo__ido">
          <input
            type="number"
            id="${prefix}-min-ido-ertek"
            class="kuszob-mezo__input kuszob-mezo__input--ido"
            min="0" step="1"
            aria-label="Minimum döntési idő értéke"
          />
          <select
            id="${prefix}-min-ido-egyseg"
            class="kuszob-mezo__select"
            aria-label="Minimum döntési idő egysége"
          >${_idoEgysegOpciok('mp')}</select>
        </div>
        <span class="kuszob-mezo__sugo">Ennyi ideig biztosan nyitva marad a döntés.</span>
      </div>

      <!-- ── MAXIMUM DÖNTÉSI IDŐ ── -->
      <div class="kuszob-mezo">
        <label class="kuszob-mezo__cimke" for="${prefix}-max-ido-ertek">
          Maximum döntési idő
        </label>
        <div class="kuszob-mezo__ido">
          <input
            type="number"
            id="${prefix}-max-ido-ertek"
            class="kuszob-mezo__input kuszob-mezo__input--ido"
            min="0" step="1"
            aria-label="Maximum döntési idő értéke"
          />
          <select
            id="${prefix}-max-ido-egyseg"
            class="kuszob-mezo__select"
            aria-label="Maximum döntési idő egysége"
          >${_idoEgysegOpciok('ev')}</select>
        </div>
        <span class="kuszob-mezo__sugo">Eddig biztosan lezárul a döntés.</span>
      </div>

    </div>
  `;
}

// ===== MEZŐK KITÖLTÉSE =====
// A négy mezőt feltölti a megadott értékekkel. Az időket a legjobban illeszkedő
// egységre bontja (pl. 31536000 mp → 1 év).
// @param {string} prefix   - az id-k előtagja
// @param {Object} ertekek  - { javaslatElfogadasiKuszob, reszveteliAranyKuszob, minimumDontesiIdo, maximumDontesiIdo }
export function kuszobMezokKitoltese(prefix, ertekek = {}) {
  console.log('kuszobErtekMezok.kuszobMezokKitoltese - KEZDÉS', { prefix, ertekek });

  // A hiányzó mezőket az alapértékekkel egészítjük ki
  const teljes = { ...KUSZOB_ALAPERTEKEK, ...ertekek };

  // Százalékos mezők
  const tamogatottsagInput = document.getElementById(`${prefix}-tamogatottsag`);
  if (tamogatottsagInput) tamogatottsagInput.value = teljes.javaslatElfogadasiKuszob;

  const reszvetelInput = document.getElementById(`${prefix}-reszvetel`);
  if (reszvetelInput) reszvetelInput.value = teljes.reszveteliAranyKuszob;

  // Minimum döntési idő – bontás legjobb egységre
  const minBontas = legjobbIdoEgyseg(teljes.minimumDontesiIdo);
  const minErtekInput  = document.getElementById(`${prefix}-min-ido-ertek`);
  const minEgysegSelect = document.getElementById(`${prefix}-min-ido-egyseg`);
  if (minErtekInput)   minErtekInput.value  = minBontas.ertek;
  if (minEgysegSelect) minEgysegSelect.value = minBontas.egyseg;

  // Maximum döntési idő – bontás legjobb egységre
  const maxBontas = legjobbIdoEgyseg(teljes.maximumDontesiIdo);
  const maxErtekInput  = document.getElementById(`${prefix}-max-ido-ertek`);
  const maxEgysegSelect = document.getElementById(`${prefix}-max-ido-egyseg`);
  if (maxErtekInput)   maxErtekInput.value  = maxBontas.ertek;
  if (maxEgysegSelect) maxEgysegSelect.value = maxBontas.egyseg;

  console.log('kuszobErtekMezok.kuszobMezokKitoltese - VÉGE');
}

// ===== MEZŐK VISSZAOLVASÁSA =====
// A négy mezőből összeállítja a backendnek küldendő objektumot (időket mp-re).
// @param {string} prefix - az id-k előtagja
// @returns {Object} { javaslatElfogadasiKuszob, reszveteliAranyKuszob, minimumDontesiIdo, maximumDontesiIdo }
export function kuszobMezokOsszegyujtese(prefix) {
  console.log('kuszobErtekMezok.kuszobMezokOsszegyujtese - KEZDÉS', { prefix });

  const javaslatElfogadasiKuszob = parseInt(
    document.getElementById(`${prefix}-tamogatottsag`)?.value, 10
  );
  const reszveteliAranyKuszob = parseInt(
    document.getElementById(`${prefix}-reszvetel`)?.value, 10
  );

  const minErtek  = document.getElementById(`${prefix}-min-ido-ertek`)?.value;
  const minEgyseg = document.getElementById(`${prefix}-min-ido-egyseg`)?.value;
  const minimumDontesiIdo = atvaltMasodpercre(minErtek, minEgyseg);

  const maxErtek  = document.getElementById(`${prefix}-max-ido-ertek`)?.value;
  const maxEgyseg = document.getElementById(`${prefix}-max-ido-egyseg`)?.value;
  const maximumDontesiIdo = atvaltMasodpercre(maxErtek, maxEgyseg);

  const eredmeny = {
    javaslatElfogadasiKuszob,
    reszveteliAranyKuszob,
    minimumDontesiIdo,
    maximumDontesiIdo
  };

  console.log('kuszobErtekMezok.kuszobMezokOsszegyujtese - VÉGE', eredmeny);
  return eredmeny;
}

// ===== MEZŐK VALIDÁLÁSA =====
// Ellenőrzi a backend szabályaival azonos feltételeket, hogy hiba esetén
// azonnal (kérés nélkül) tudjunk visszajelezni.
// @param {Object} ertekek - a kuszobMezokOsszegyujtese() eredménye
// @returns {string|null} hibaüzenet, vagy null ha minden rendben
export function kuszobMezokValidalasa(ertekek) {
  console.log('kuszobErtekMezok.kuszobMezokValidalasa - KEZDÉS', ertekek);

  const { javaslatElfogadasiKuszob, reszveteliAranyKuszob, minimumDontesiIdo, maximumDontesiIdo } = ertekek;

  if (!Number.isInteger(javaslatElfogadasiKuszob) || javaslatElfogadasiKuszob < 51 || javaslatElfogadasiKuszob > 100) {
    return 'A támogatottsági küszöb 51 és 100 között kell legyen.';
  }
  if (!Number.isInteger(reszveteliAranyKuszob) || reszveteliAranyKuszob < 0 || reszveteliAranyKuszob > 100) {
    return 'A részvételi arány küszöb 0 és 100 között kell legyen.';
  }
  if (!Number.isInteger(minimumDontesiIdo) || minimumDontesiIdo < 0) {
    return 'A minimum döntési idő nem lehet negatív.';
  }
  if (!Number.isInteger(maximumDontesiIdo) || maximumDontesiIdo < 0 || maximumDontesiIdo > 315360000) {
    return 'A maximum döntési idő 0 és 10 év között kell legyen.';
  }
  if (minimumDontesiIdo > maximumDontesiIdo) {
    return 'A minimum döntési idő nem lehet nagyobb a maximumnál.';
  }

  console.log('kuszobErtekMezok.kuszobMezokValidalasa - VÉGE (rendben)');
  return null;
}
