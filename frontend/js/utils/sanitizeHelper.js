// frontend/js/utils/sanitizeHelper.js

// =============================================
// GAZDAG SZÖVEG SANITIZÁLÁSA
// A SzovegSzerkeszto (execCommand alapú) által előállított ÉS a vágólapról
// beillesztett, előre megformázott HTML-t egy engedélyezőlistával tisztítja,
// mielőtt innerHTML-ként beillesztésre kerülne — így egy beillesztett
// <img onerror=...> vagy <a href="javascript:..."> payload nem futhat le.
//
// A szerkesztő (SzovegBlokk), a kártya-megjelenítő (SzovegMezoMegjelenito) és a
// visszavonás/újra történet MIND ezen az egy függvényen mennek át, ezért az itt
// engedélyezett elemek MINDHÁROM helyen egyformán megjelennek.
// =============================================

// Engedélyezett tagek:
//  - Inline formázás: a szerkesztő parancsai (bold, italic, underline, szín, méret)
//  - Strukturális elemek: beillesztett dokumentumok címsorai, listái, kódja, idézete, linkjei
const ENGEDELYEZETT_TAGEK = new Set([
  // Inline formázás
  'B', 'STRONG', 'I', 'EM', 'U', 'SPAN', 'FONT', 'BR',
  // Blokk-szintű és strukturális (előre megformázott dokumentumokhoz)
  'DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'A'
]);

// Engedélyezett style tulajdonságok RENDERELÉSKOR (a szerkesztőben gépelt saját
// formázáshoz — pl. a betűméret-választó <span style="font-size">-ei — kellenek).
const ENGEDELYEZETT_STYLE_TULAJDONSAGOK = new Set([
  'color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'line-height', 'text-align'
]);

// Engedélyezett style tulajdonságok BEILLESZTÉSKOR (szigorúbb!). Külső forrás
// (pl. claude.ai chat) minden szintre ráerőltet egy 'font-size'/'font-weight'/
// 'line-height' stílust, ami elnyomná a koino saját megjelenését — ezért ezeket
// beillesztéskor ELDOBJUK, és a szemantikus tagekre (strong, ol/li, pre/code...)
// + a koino CSS-ére bízzuk a formázást. A színt (syntax highlight) megtartjuk.
const BEILLESZTES_STYLE_TULAJDONSAGOK = new Set([
  'color', 'font-style', 'text-decoration', 'text-align'
]);

// =============================================
// BIZTONSÁGOS LINK (href) ELLENŐRZÉSE
// =============================================
// Csak a http(s), a mailto és a séma nélküli (relatív) linkeket engedjük át.
// A 'javascript:', 'data:' és egyéb sémák KISZŰRVE (XSS védelem).
// @param {string} href - A vizsgálandó href érték
// @returns {string|null} A biztonságos href, vagy null ha tiltott
function _biztonsagosHref(href) {
  if (!href) return null;
  const tiszta = href.trim();

  // Kifejezett, engedélyezett sémák
  if (/^(https?:|mailto:)/i.test(tiszta)) return tiszta;

  // Bármely EGYÉB séma (pl. javascript:, data:, vbscript:) tiltott
  if (/^[a-z][a-z0-9+.\-]*:/i.test(tiszta)) return null;

  // Séma nélküli (relatív útvonal vagy horgony) — rendben
  return tiszta;
}

// =============================================
// A FA REKURZÍV, SZŰRT MÁSOLÁSA
// =============================================
// @param {Node} forrasElem - A tisztítandó forrás DOM node (rekurzívan bejárva)
// @param {Node} celElem - A tiszta másolatot befogadó szülő node
// @param {Set<string>} engedelyezettStilusok - Az átmásolható style tulajdonságok
function _fatMasolasaSzurve(forrasElem, celElem, engedelyezettStilusok) {
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
      _fatMasolasaSzurve(gyerek, celElem, engedelyezettStilusok);
      return;
    }

    const tisztaElem = document.createElement(gyerek.tagName);

    // Csak az engedélyezett style tulajdonságokat másoljuk át
    if (gyerek.style && gyerek.style.length > 0) {
      for (const tulajdonsag of gyerek.style) {
        if (engedelyezettStilusok.has(tulajdonsag)) {
          tisztaElem.style.setProperty(tulajdonsag, gyerek.style.getPropertyValue(tulajdonsag));
        }
      }
    }

    // A <font> tag color attribútuma engedélyezett (execCommand foreColor néha ezt hozza létre)
    if (gyerek.tagName === 'FONT' && gyerek.hasAttribute('color')) {
      tisztaElem.setAttribute('color', gyerek.getAttribute('color'));
    }

    // A <a> tag href-je: csak biztonságos séma esetén, és mindig új lapon,
    // rel="noopener noreferrer" biztonsági beállítással
    if (gyerek.tagName === 'A') {
      const biztonsagosHref = _biztonsagosHref(gyerek.getAttribute('href'));
      if (biztonsagosHref) {
        tisztaElem.setAttribute('href', biztonsagosHref);
        tisztaElem.setAttribute('target', '_blank');
        tisztaElem.setAttribute('rel', 'noopener noreferrer');
      }
    }

    _fatMasolasaSzurve(gyerek, tisztaElem, engedelyezettStilusok);
    celElem.appendChild(tisztaElem);
  });
}

// =============================================
// PUBLIKUS BELÉPÉSI PONT
// =============================================
// RENDERELÉSI sanitizálás — a szerkesztő saját formázását teljesen megőrzi
// (betűméret, vastagság stb.). Ezt hívja a SzovegBlokk.letrehozas() és így a
// kártya-megjelenítő + a történet is.
// @param {string} html - A tisztítandó HTML string
// @returns {string} A csak engedélyezett tageket/attribútumokat tartalmazó HTML
export function sanitizeRichText(html) {
  return _sanitizal(html, ENGEDELYEZETT_STYLE_TULAJDONSAGOK);
}

// BEILLESZTÉSI sanitizálás — szigorúbb: a külső forrás témát-felülíró méret/
// vastagság stílusait eldobja, csak a szemantikus szerkezetet + a színt tartja meg.
// Ezt hívja a SzovegBlokk paste-kezelője.
// @param {string} html - A vágólapról jövő HTML
// @returns {string} A koino megjelenéséhez igazított, tiszta HTML
export function sanitizePastedRichText(html) {
  return _sanitizal(html, BEILLESZTES_STYLE_TULAJDONSAGOK);
}

// Belső közös implementáció — a megadott style-engedélyezőlistával tisztít.
// @param {string} html - A tisztítandó HTML
// @param {Set<string>} engedelyezettStilusok - Az átmásolható style tulajdonságok
// @returns {string} A tiszta HTML
function _sanitizal(html, engedelyezettStilusok) {
  if (!html) return '';

  const forras = document.createElement('div');
  forras.innerHTML = html;

  const cel = document.createElement('div');
  _fatMasolasaSzurve(forras, cel, engedelyezettStilusok);

  return cel.innerHTML;
}
