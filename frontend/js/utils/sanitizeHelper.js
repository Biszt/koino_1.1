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
// A 'background-color' a szöveg-kiemelés (háttérszín) megjelenítéséhez kell.
const ENGEDELYEZETT_STYLE_TULAJDONSAGOK = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'line-height', 'text-align'
]);

// Engedélyezett style tulajdonságok BEILLESZTÉSKOR.
// Cél: a beillesztett tartalom MEGTARTSA a formázását (méret, vastagság, szín,
// háttérszín) — a „hűen a forráshoz” (B) elv szerint. A méretet a _betumeretPxRe
// valós px-re oldja fel és 144px-re vágja (lásd MAX_BETUMERET_PX); a háttérszínből
// az átlátszót (a forrás alapértéke, nem valódi kiemelés) eldobjuk. A 'line-height'-ot
// szándékosan NEM engedjük át, mert az idegen sortávolság elrontaná a koino ritmusát.
const BEILLESZTES_STYLE_TULAJDONSAGOK = new Set([
  'color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align'
]);

// A beillesztett betűméret felső határa pixelben (a koino saját méret-választójának
// maximuma is ennyi) — efölött a beillesztett méretet erre a plafonra vágjuk.
const MAX_BETUMERET_PX = 144;

// Tagek, amelyeket a TELJES tartalmukkal EGYÜTT eldobunk (nem engedélyezett tagnél
// egyébként a szöveges tartalmat megtartjuk — de a <style>/<script> CSS/JS szövege
// NEM kerülhet be látható szövegként a blokkba; ez Word-beillesztésnél gyakori).
const TELJESEN_ELDOBANDO_TAGEK = new Set([
  'STYLE', 'SCRIPT', 'HEAD', 'META', 'TITLE', 'LINK', 'BASE', 'NOSCRIPT'
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
// SEGÉD - ÁTLÁTSZÓ HÁTTÉRSZÍN FELISMERÉSE
// =============================================
// A forrás gyakran 'transparent'/'rgba(0,0,0,0)' hátteret tesz minden elemre —
// ez nem valódi kiemelés, csak alapérték, ezért NEM tartjuk meg (különben minden
// beillesztett szöveg „üres” háttérstílust kapna, ami zajt visz a tartalomba).
// @param {string} ertek - A background-color érték
// @returns {boolean} true, ha átlátszó/üres (eldobandó)
function _atlatszoHatterE(ertek) {
  const v = (ertek || '').replace(/\s+/g, '').toLowerCase();
  return v === '' || v === 'transparent' || v === 'rgba(0,0,0,0)';
}

// =============================================
// SEGÉD - BETŰMÉRET VALÓS PX-RE OLDÁSA + PLAFON
// =============================================
// A böngésző KISZÁMOLT font-size-át olvassa ki (px-ben), így MINDEN CSS-egységet
// (px, pt, em, rem, %, kulcsszó, calc...) helyesen old fel — kézi átváltó-táblázat
// nélkül. FONTOS: a getComputedStyle csak a DOM-ba KÖTÖTT elemre ad valós értéket,
// ezért köti be a _sanitizal a forrás fát ideiglenesen a body-ba.
// A végén 144px-re (MAX_BETUMERET_PX) vágja, egész px-re kerekítve.
// @param {Element} elem - A forrás elem (aminek saját font-size stílusa van)
// @returns {string|null} A tiszta 'Npx' érték, vagy null ha nem értelmezhető
function _betumeretPxRe(elem) {
  const szamolt = window.getComputedStyle(elem).fontSize; // pl. "72px", "14.6667px"
  const px = parseFloat(szamolt);
  if (!isFinite(px) || px <= 0) return null;

  const vagott = Math.min(px, MAX_BETUMERET_PX);
  return Math.round(vagott) + 'px';
}

// =============================================
// A FA REKURZÍV, SZŰRT MÁSOLÁSA
// =============================================
// @param {Node} forrasElem - A tisztítandó forrás DOM node (rekurzívan bejárva)
// @param {Node} celElem - A tiszta másolatot befogadó szülő node
// @param {Set<string>} engedelyezettStilusok - Az átmásolható style tulajdonságok
// @param {boolean} meretPxRe - true beillesztéskor: a font-size valós px-re oldva + 144px plafon
function _fatMasolasaSzurve(forrasElem, celElem, engedelyezettStilusok, meretPxRe) {
  forrasElem.childNodes.forEach((gyerek) => {
    if (gyerek.nodeType === Node.TEXT_NODE) {
      celElem.appendChild(gyerek.cloneNode(true));
      return;
    }

    if (gyerek.nodeType !== Node.ELEMENT_NODE) {
      // Kommentek és egyéb node típusok kihagyása
      return;
    }

    if (TELJESEN_ELDOBANDO_TAGEK.has(gyerek.tagName)) {
      // pl. <style>, <script>, <head> — a TELJES részfát eldobjuk (a CSS/JS szöveg
      // ne szivárogjon be látható szövegként a blokkba)
      return;
    }

    if (!ENGEDELYEZETT_TAGEK.has(gyerek.tagName)) {
      // Nem engedélyezett tag: a szöveges tartalmát megtartjuk, a taget eldobjuk
      _fatMasolasaSzurve(gyerek, celElem, engedelyezettStilusok, meretPxRe);
      return;
    }

    const tisztaElem = document.createElement(gyerek.tagName);

    // Csak az engedélyezett style tulajdonságokat másoljuk át
    if (gyerek.style && gyerek.style.length > 0) {
      for (const tulajdonsag of gyerek.style) {
        if (!engedelyezettStilusok.has(tulajdonsag)) continue;

        let ertek = gyerek.style.getPropertyValue(tulajdonsag);

        // Háttérszín: az átlátszót (a forrás alapértéke) eldobjuk
        if (tulajdonsag === 'background-color' && _atlatszoHatterE(ertek)) {
          continue;
        }

        // Betűméret beillesztéskor: valós px-re feloldva + 144px plafon
        if (tulajdonsag === 'font-size' && meretPxRe) {
          ertek = _betumeretPxRe(gyerek);
          if (!ertek) continue;
        }

        tisztaElem.style.setProperty(tulajdonsag, ertek);
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

    _fatMasolasaSzurve(gyerek, tisztaElem, engedelyezettStilusok, meretPxRe);
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
  return _sanitizal(html, ENGEDELYEZETT_STYLE_TULAJDONSAGOK, false);
}

// BEILLESZTÉSI sanitizálás — szigorúbb: a külső forrás témát-felülíró méret/
// vastagság stílusait eldobja, csak a szemantikus szerkezetet + a színt tartja meg.
// Ezt hívja a SzovegBlokk paste-kezelője.
// @param {string} html - A vágólapról jövő HTML
// @returns {string} A koino megjelenéséhez igazított, tiszta HTML
export function sanitizePastedRichText(html) {
  return _sanitizal(html, BEILLESZTES_STYLE_TULAJDONSAGOK, true);
}

// Belső közös implementáció — a megadott style-engedélyezőlistával tisztít.
// @param {string} html - A tisztítandó HTML
// @param {Set<string>} engedelyezettStilusok - Az átmásolható style tulajdonságok
// @param {boolean} meretPxRe - true beillesztéskor: a font-size valós px-re oldva + 144px plafon
// @returns {string} A tiszta HTML
function _sanitizal(html, engedelyezettStilusok, meretPxRe) {
  if (!html) return '';

  const forras = document.createElement('div');
  forras.innerHTML = html;

  // A font-size valós px-értékét a getComputedStyle csak a DOM-ba KÖTÖTT elemre
  // adja meg. Beillesztéskor ezért a forrás fát ideiglenesen, képernyőn kívül a
  // body-ba kötjük, 16px alap-betűmérettel (az em/% ehhez, a koino alapjához igazodik).
  let ideiglenesKonteener = null;
  if (meretPxRe) {
    ideiglenesKonteener = document.createElement('div');
    ideiglenesKonteener.style.position   = 'absolute';
    ideiglenesKonteener.style.left       = '-99999px';
    ideiglenesKonteener.style.top        = '0';
    ideiglenesKonteener.style.visibility = 'hidden';
    ideiglenesKonteener.style.fontSize   = '16px';
    ideiglenesKonteener.appendChild(forras);
    document.body.appendChild(ideiglenesKonteener);
  }

  const cel = document.createElement('div');
  _fatMasolasaSzurve(forras, cel, engedelyezettStilusok, meretPxRe);

  // A képernyőn kívüli ideiglenes konténer eltávolítása (ha bekötöttük)
  if (ideiglenesKonteener) {
    document.body.removeChild(ideiglenesKonteener);
  }

  return cel.innerHTML;
}
