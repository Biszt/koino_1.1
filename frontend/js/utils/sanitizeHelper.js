// frontend/js/utils/sanitizeHelper.js

// =============================================
// GAZDAG SZÖVEG SANITIZÁLÁSA
// A SzovegSzerkeszto (execCommand alapú) által előállított HTML-t
// egy szűk engedélyezőlistával tisztítja, mielőtt innerHTML-ként
// beillesztésre kerülne — így egy beillesztett <img onerror=...>
// vagy hasonló payload nem futhat le a kártyák megjelenítésekor.

// Engedélyezett tagek — csak a szerkesztő formázási parancsai (bold,
// italic, underline, foreColor, fontSize) által ténylegesen létrehozott elemek
const ENGEDELYEZETT_TAGEK = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'FONT', 'BR', 'DIV', 'P']);

// Engedélyezett style tulajdonságok (kebab-case, ahogy a style attribútumban szerepelnek)
const ENGEDELYEZETT_STYLE_TULAJDONSAGOK = new Set(['color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'line-height']);

// @param {Node} forrasElem - A tisztítandó forrás DOM node (rekurzívan bejárva)
// @param {Node} celElem - A tiszta másolatot befogadó szülő node
function _fatMasolasaSzurve(forrasElem, celElem) {
  forrasElem.childNodes.forEach((gyerek) => {
    if (gyerek.nodeType === Node.TEXT_NODE) {
      celElem.appendChild(gyerek.cloneNode(true));
      return;
    }

    if (gyerek.nodeType !== Node.ELEMENT_NODE) {
      // Kommentek és egyéb node típusok kihagyása
      return;
    }

    if (!ENGEDELYEZETT_TAGEK.has(gyerek.tagName)) {
      // Nem engedélyezett tag: a szöveges tartalmát megtartjuk, a taget eldobjuk
      _fatMasolasaSzurve(gyerek, celElem);
      return;
    }

    const tisztaElem = document.createElement(gyerek.tagName);

    // Csak az engedélyezett style tulajdonságokat másoljuk át
    if (gyerek.style && gyerek.style.length > 0) {
      for (const tulajdonsag of gyerek.style) {
        if (ENGEDELYEZETT_STYLE_TULAJDONSAGOK.has(tulajdonsag)) {
          tisztaElem.style.setProperty(tulajdonsag, gyerek.style.getPropertyValue(tulajdonsag));
        }
      }
    }

    // A <font> tag color attribútuma engedélyezett (execCommand foreColor néha ezt hozza létre)
    if (gyerek.tagName === 'FONT' && gyerek.hasAttribute('color')) {
      tisztaElem.setAttribute('color', gyerek.getAttribute('color'));
    }

    _fatMasolasaSzurve(gyerek, tisztaElem);
    celElem.appendChild(tisztaElem);
  });
}

// @param {string} html - A tisztítandó HTML string
// @returns {string} A csak engedélyezett tageket/attribútumokat tartalmazó HTML
export function sanitizeRichText(html) {
  if (!html) return '';

  const forras = document.createElement('div');
  forras.innerHTML = html;

  const cel = document.createElement('div');
  _fatMasolasaSzurve(forras, cel);

  return cel.innerHTML;
}
