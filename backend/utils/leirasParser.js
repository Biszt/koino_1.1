// backend/utils/leirasParser.js

// Felelősség: a multipart FormData-ból érkező `leiras` mező NORMALIZÁLÁSA.
//
// Miért kell? A blokk-alapú SzovegSzerkeszto egy blokk-TÖMBöt ad. A Gondolat
// modálja ezt JSON-body-ként küldi, így a tömb tömbként érkezik és tömbként
// tárolódik. A Kategoria és a GondolatTipus modálja viszont MULTIPART FormData-t
// küld (mert ikon-fájlt is tölt fel), és a FormData csak STRINGET tud → ott a
// leírás `JSON.stringify`-olt stringként érkezik. Ha ezt stringként mentenénk,
// a kártya megjelenítője „legacy sima szövegként" kezelné, és a NYERS JSON-t
// mutatná. Ezért itt visszaparse-oljuk tömbbé, hogy a Mixed mezőben ugyanúgy
// TÖMBként tárolódjon, mint a Gondolat `szoveg`-e.
//
// Használják: kategoriaService, gondolatTipusService (létrehozás + módosítás).

/**
 * A nyers `leiras` értéket normalizálja tárolható formára.
 * @param {*} nyers - A leiras mező nyers értéke (string JSON, tömb, objektum vagy null)
 * @returns {*} tömb/objektum (ha JSON volt), null (ha üres), vagy az eredeti string
 */
function leirasParse(nyers) {
  // Nincs érték → null (nem string, hanem hiányzó)
  if (nyers === undefined || nyers === null) return null;

  // Ha már nem string (pl. JSON-body-ból jött tömb/objektum), változatlanul adjuk vissza
  if (typeof nyers !== 'string') return nyers;

  // Üres string → null (nincs leírás)
  const trimmelt = nyers.trim();
  if (trimmelt === '') return null;

  // JSON-string → visszaparse-oljuk tömbbé/objektummá
  try {
    return JSON.parse(trimmelt);
  } catch (hiba) {
    // Nem JSON (pl. régi, sima szöveges leírás) → hagyjuk stringként
    console.warn('leirasParser.leirasParse - nem JSON leiras, stringként hagyva', {
      hiba: hiba.message
    });
    return nyers;
  }
}

module.exports = { leirasParse };
