// backend/utils/kuszobErtekParser.js

// ===================================
// KÜSZÖBÉRTÉK PARSER
// ===================================
// Felelősség: egy létrehozási kérés adataiból (adatok) kiolvassa a négy
//   küszöbértéket, és egész számmá alakítja őket. Ha egy érték hiányzik vagy
//   nem szám, az alapértéket használja. A kategória/tartalomtípus létrehozás
//   multipart (ikon-feltöltés) kérés, ezért az értékek stringként érkeznek –
//   itt egységesen parseInt-eljük őket.
// Használják: kategoriaService, tartalomTipusService.

// Alapértelmezett küszöbértékek (azonosak a tartalomService alapértékeivel)
const KUSZOB_ALAPERTEKEK = {
  javaslatElfogadasiKuszob: 51,        // támogatottsági küszöb (%)
  reszveteliAranyKuszob:    51,        // részvételi arány küszöb (%)
  minimumDontesiIdo:        0,         // mp
  maximumDontesiIdo:        31536000   // 1 év (mp)
};

// ----- EGY ÉRTÉK BIZTONSÁGOS EGÉSSZÉ ALAKÍTÁSA -----
// Ha az érték nem értelmezhető számként, az alapértéket adja vissza.
function egeszVagyAlap(ertek, alap) {
  if (ertek === undefined || ertek === null || ertek === '') return alap;
  const szam = parseInt(ertek, 10);
  return Number.isInteger(szam) ? szam : alap;
}

// ----- A NÉGY KÜSZÖBÉRTÉK KIOLVASÁSA -----
/**
 * @param {Object} adatok - a létrehozási kérés body-ja
 * @returns {Object} { javaslatElfogadasiKuszob, reszveteliAranyKuszob, minimumDontesiIdo, maximumDontesiIdo }
 */
function kuszobertekekParse(adatok = {}) {
  return {
    javaslatElfogadasiKuszob: egeszVagyAlap(adatok.javaslatElfogadasiKuszob, KUSZOB_ALAPERTEKEK.javaslatElfogadasiKuszob),
    reszveteliAranyKuszob:    egeszVagyAlap(adatok.reszveteliAranyKuszob,    KUSZOB_ALAPERTEKEK.reszveteliAranyKuszob),
    minimumDontesiIdo:        egeszVagyAlap(adatok.minimumDontesiIdo,        KUSZOB_ALAPERTEKEK.minimumDontesiIdo),
    maximumDontesiIdo:        egeszVagyAlap(adatok.maximumDontesiIdo,        KUSZOB_ALAPERTEKEK.maximumDontesiIdo)
  };
}

module.exports = { kuszobertekekParse, KUSZOB_ALAPERTEKEK };
