// frontend/js/components/szovegSzerkeszto/blokkok/SzovegBlokk.js

class SzovegBlokk {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} blokk - A blokk adatobjektum (BlokkListából)
  // @param {Object} callbacks - Esemény visszahívók
  // @param {Function} callbacks.onFokusz - Fókuszba kerüléskor hívódik (blokkId)
  // @param {Function} callbacks.onUjBlokk - Enter leütésekor hívódik (blokkId)
  // @param {Function} callbacks.onTorles - Backspace üres blokkon hívódik (blokkId)
  // @param {Function} callbacks.onValtozas - Gépeléskor hívódik (blokkId, tartalom)
  constructor(blokk, callbacks = {}) {
    console.log('SzovegBlokk.constructor - KEZDÉS', { blokk });

    // Blokk adatok eltárolása
    this.blokk = blokk;

    // Visszahívók eltárolása
    this.onFokusz   = callbacks.onFokusz   || null;
    this.onUjBlokk  = callbacks.onUjBlokk  || null;
    this.onTorles   = callbacks.onTorles   || null;
    this.onValtozas = callbacks.onValtozas || null;

    // DOM elem referencia (létrehozás után lesz feltöltve)
    this.elem = null;

    // Az utoljára mentett kijelölés — a color picker megnyitása előtt
    // a fókusz elvész, ezért ide mentjük el a range-t
    this.mentettKijeloles = null;

    // Függőben lévő betűméret — ha nincs kijelölés, az ezután gépelt
    // karakterekre alkalmazzuk. null = nincs függőben lévő méret.
    this._fuggoBetumeret = null;

    // Az utoljára alkalmazott/választott betűméret — a méretválasztó
    // select doboz megjelenítéséhez. null = még nem választott méretet.
    this._utolsoMeret = null;

    console.log('SzovegBlokk.constructor - VÉGE');
  }

  // =============================================
  // DOM ELEM LÉTREHOZÁSA
  // =============================================
  // Létrehozza és visszaadja a szöveges blokk DOM elemét
  // @returns {HTMLElement} A contenteditable div
  letrehozas() {
    console.log('SzovegBlokk.letrehozas - KEZDÉS', { blokkId: this.blokk.id });

    const elem = document.createElement('div');
    elem.className = 'szoveg-blokk';
    elem.contentEditable = 'true';
    elem.dataset.blokkId = this.blokk.id;
    elem.dataset.tipus = 'szoveg';
    elem.setAttribute('data-placeholder', 'Írj valamit...');

    // Előre betöltött tartalom beállítása (szerkesztés módban)
    if (this.blokk.tartalom) {
      elem.innerHTML = this.blokk.tartalom;
    }

    // Igazítás alkalmazása a tárolt blokk adatból —
    // alapértelmezett: 'bal', ami a böngésző természetes viselkedése (left)
    if (this.blokk.formatas?.igazitas) {
      this._igazitasCssBeallitasa(this.blokk.formatas.igazitas);
    }

    // Eseményfigyelők bekötése
    this._esemenyekBekotese(elem);

    // Referencia eltárolása
    this.elem = elem;

    console.log('SzovegBlokk.letrehozas - VÉGE', { blokkId: this.blokk.id });
    return elem;
  }

  // =============================================
  // FÓKUSZ ADÁSA
  // =============================================
  // Fókuszt ad az elemnek és a kurzort a végére helyezi
  fokuszAdas() {
    if (!this.elem) return;

    this.elem.focus();

    // Kurzor a tartalom végére helyezése
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(this.elem);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // =============================================
  // AKTUÁLIS TARTALOM LEKÉRÉSE
  // =============================================
  // @returns {string} A blokk aktuális HTML tartalma
  getTartalom() {
    if (!this.elem) return '';
    return this.elem.innerHTML;
  }

  // =============================================
  // FÉLKÖVÉR ALKALMAZÁSA
  // =============================================
  // Félkövér formázást kapcsol a kijelölt szövegrészre
  alkalmazFelkover() {
    console.log('SzovegBlokk.alkalmazFelkover - KEZDÉS');

    this.elem.focus();
    document.execCommand('bold', false, null);

    console.log('SzovegBlokk.alkalmazFelkover - VÉGE');
  }

  // =============================================
  // DŐLT ALKALMAZÁSA
  // =============================================
  // Dőlt formázást kapcsol a kijelölt szövegrészre
  alkalmazDolt() {
    console.log('SzovegBlokk.alkalmazDolt - KEZDÉS');

    this.elem.focus();
    document.execCommand('italic', false, null);

    console.log('SzovegBlokk.alkalmazDolt - VÉGE');
  }

  // =============================================
// ALÁHÚZÁS ALKALMAZÁSA
// =============================================
// Aláhúzás formázást kapcsol a kijelölt szövegrészre
alkalmazAlahuzas() {
    console.log('SzovegBlokk.alkalmazAlahuzas - KEZDÉS');

    this.elem.focus();
    document.execCommand('underline', false, null);

    console.log('SzovegBlokk.alkalmazAlahuzas - VÉGE');
}



  // =============================================
  // BETŰMÉRET ALKALMAZÁSA
  // =============================================
  // Ha van kijelölt szöveg: azonnal alkalmazza a méretet a kijelölésre.
  // Ha nincs kijelölés (csak kurzor): eltárolja függőben lévő méretként,
  // amit a keydown esemény alkalmaz az első leütött karakter ELŐTT.
  // Minden esetben elmenti az utoljára választott méretet (_utolsoMeret),
  // hogy a méretválasztó select doboz mindig a helyes értéket mutassa.
  // @param {number} px - A betűméret pixelben (pl. 24)
  alkalmazMeret(px) {
    console.log('SzovegBlokk.alkalmazMeret - KEZDÉS', { px });

    // Utolsó méret mentése ELŐBB — mielőtt a focus() triggereli
    // a focusin eseményt és az eszköztár frissítését
    this._utolsoMeret = px;

    this.elem.focus();

    const selection = window.getSelection();
    const vanKijeloles = selection && selection.rangeCount > 0
      && !selection.getRangeAt(0).collapsed;

    if (vanKijeloles) {
      // Van kijelölés — azonnal alkalmazzuk csak a kijelölt részre
      this._meretAlkalmazasaKijelolesre(px);
    } else {
      // Nincs kijelölés — eltároljuk, a keydown alkalmazza az első karakter előtt
      console.log('SzovegBlokk.alkalmazMeret - nincs kijelölés, függő méret beállítva:', px);
      this._fuggoBetumeret = px;
    }

    console.log('SzovegBlokk.alkalmazMeret - VÉGE', { px });
  }

  // =============================================
  // SZÍN ALKALMAZÁSA
  // =============================================
  // Szövegszínt állít a kijelölt szövegrészre.
  // FONTOS: a mousedown + e.preventDefault() kombináció a SzovegPanel-ben
  // megőrzi a kijelölést és a fókuszt, ezért az elem.focus() itt elegendő.
  // @param {string} szin - CSS szín érték (pl. '#e03131')
  alkalmazSzin(szin) {
    console.log('SzovegBlokk.alkalmazSzin - KEZDÉS', { szin });

    this.elem.focus();
    document.execCommand('foreColor', false, szin);

    console.log('SzovegBlokk.alkalmazSzin - VÉGE', { szin });
  }

  // =============================================
  // IGAZÍTÁS ALKALMAZÁSA
  // =============================================
  // Szöveg igazítást állít az egész blokk elemre (nem csak a kijelölésre).
  // Az igazítás a div.szoveg-blokk CSS text-align tulajdonságaként jelenik meg.
  // Lehetséges értékek: 'bal', 'kozep', 'jobb'
  // @param {string} igazitas - Az igazítás iránya
  alkalmazIgazitas(igazitas) {
    console.log('SzovegBlokk.alkalmazIgazitas - KEZDÉS', { igazitas });

    // CSS értékre fordítás
    this._igazitasCssBeallitasa(igazitas);

    // Tárolt blokk adat frissítése — hogy fókuszváltás után is visszaolvasható legyen
    if (this.blokk.formatas) {
      this.blokk.formatas.igazitas = igazitas;
    }

    console.log('SzovegBlokk.alkalmazIgazitas - VÉGE', { igazitas });
  }

  // =============================================
// AKTUÁLIS FORMÁZÁS LEKÉRÉSE
// =============================================
// Visszaadja a kurzor pozíciójánál érvényes formázási állapotot.
// Az eszköztár ezt használja a gombok aktív állapotának megjelenítéséhez.
// @returns {Object} { felkover, dolt, alahuzas, meret, szin, igazitas }
getAktualisFormatas() {
    console.log('SzovegBlokk.getAktualisFormatas - KEZDÉS');

    const felkover  = document.queryCommandState('bold');
    const dolt      = document.queryCommandState('italic');
    const alahuzas  = document.queryCommandState('underline');

    // Az utoljára alkalmazott/választott betűméret — a queryCommandValue
    // nem ismeri fel a <span style="font-size"> tageket, ezért saját
    // változóból olvassuk vissza. null = még nem választott méretet.
    const meret = this._utolsoMeret;

    // queryCommandValue('foreColor'): 'rgb(r, g, b)' formátumban adja vissza a színt,
    // vagy üres stringet ha nincs szín beállítva.
    // Minden szín egyenlő — a fekete (#000) is valódi választás, nem "alapszín".
    // Csak az üres string jelent "nincs beállítva" állapotot.
    const szinErtek = document.queryCommandValue('foreColor');
    const szin = szinErtek ? szinErtek : null;

    // Igazítást a tárolt blokk adatból olvassuk vissza —
    // a text-align CSS getComputedStyle helyett ez a megbízhatóbb forrás,
    // mert a BlokkLista is ezt tárolja el mentéskor.
    // Alapértelmezett: 'bal'
    const igazitas = this.blokk.formatas?.igazitas || 'bal';

    const formatas = { felkover, dolt, alahuzas, meret, szin, igazitas };

    console.log('SzovegBlokk.getAktualisFormatas - VÉGE', { formatas });
    return formatas;
}

  // =============================================
  // PRIVÁT - MÉRET ALKALMAZÁSA KIJELÖLÉSRE
  // =============================================
  // Belső segéd: a kijelölt szövegrészre alkalmazza a betűméretet.
  // Az execCommand('fontSize') csak 1-7 szinteket ismer, ezért
  // ideiglenes markert szúrunk be, majd <span style="font-size; line-height">
  // tagre cseréljük. A line-height: 1 biztosítja, hogy a nagy méretű span
  // ne terjesszen extra sortávolságot az alatta lévő sorra.
  // @param {number} px - A betűméret pixelben
  _meretAlkalmazasaKijelolesre(px) {
    console.log('SzovegBlokk._meretAlkalmazasaKijelolesre - KEZDÉS', { px });

    // 1. Ideiglenes marker beillesztése a 7-es méretszinttel
    document.execCommand('fontSize', false, '7');

    // 2. A böngésző által beillesztett <font size="7"> elemek
    // megkeresése és <span style="font-size; line-height"> elemekre cserélése.
    // A line-height: 1 megakadályozza, hogy a nagy betűméret extra teret
    // nyisson az alatta húzódó sor felett.
    const fontElemek = this.elem.querySelectorAll('font[size="7"]');
    fontElemek.forEach(fontElem => {
      const span = document.createElement('span');
      span.style.fontSize   = px + 'px';
      span.style.lineHeight = '1';
      span.innerHTML = fontElem.innerHTML;
      fontElem.parentNode.replaceChild(span, fontElem);
    });

    console.log('SzovegBlokk._meretAlkalmazasaKijelolesre - VÉGE', { px });
  }

  // =============================================
  // PRIVÁT - IGAZÍTÁS CSS BEÁLLÍTÁSA
  // =============================================
  // Belső segéd: 'bal'/'kozep'/'jobb' értékeket CSS text-align értékre fordít
  // és alkalmazza az elem style-jára.
  // @param {string} igazitas - 'bal' | 'kozep' | 'jobb'
  _igazitasCssBeallitasa(igazitas) {
    // Magyar kulcsszó → CSS érték leképezés
    const cssErtekek = {
      bal:   'left',
      kozep: 'center',
      jobb:  'right',
    };

    // Csak ismert értéket alkalmazunk, ismeretlennél figyelmeztetés
    const cssErtek = cssErtekek[igazitas];
    if (!cssErtek) {
      console.warn('SzovegBlokk._igazitasCssBeallitasa - Ismeretlen igazítás:', igazitas);
      return;
    }

    if (this.elem) {
      this.elem.style.textAlign = cssErtek;
    }
  }

  // =============================================
  // PRIVÁT - KIJELÖLÉS MENTÉSE
  // =============================================
  // Minden egér/billentyű felengedésekor elmenti az aktuális kijelölést,
  // hogy a color picker megnyitása után visszaállítható legyen.
  _kijelolesElmentese() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // Klónozzuk a range-t, mert az eredeti a fókuszvesztéskor törlődik
      this.mentettKijeloles = selection.getRangeAt(0).cloneRange();
    }
  }

  // =============================================
  // PRIVÁT - SORTÖRÉS BEILLESZTÉSE (Shift+Enter)
  // =============================================
  // A Shift+Enter alapértelmezett viselkedése egy <br> beillesztése,
  // ami az előző sor BFC-jén belül marad — így a nagy betűméretű span
  // sortávolsága az összes következő sorra is kihat.
  //
  // Ez a metódus ehelyett egy új <div>-et illeszt be, ami önálló
  // blokk-formázási kontextust alkot — a nagy méret hatása
  // kizárólag a saját <div>-jére korlátozódik.
  //
  // Működés:
  // 1. Az aktuális range törlése (ha volt kijelölés)
  // 2. Új üres <div> létrehozása a kurzor pozíciójára
  // 3. A <div>-be egy Zero Width No-Break Space (\uFEFF) kerül,
  //    hogy a böngésző valóban üres sorként kezelje
  // 4. A kurzor az új <div> belsejébe kerül
  _sortoresBeillesztese() {
    console.log('SzovegBlokk._sortoresBeillesztese - KEZDÉS');

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Ha volt kijelölés, először töröljük a kijelölt tartalmat
    range.deleteContents();

    // Új <div> sor létrehozása — ez önálló BFC, a nagy méret nem terjed át rá
    const ujSor = document.createElement('div');

    // Zero Width No-Break Space: a böngésző csak így kezeli valódi üres sorként,
    // és csak így helyezi a kurzort megbízhatóan a <div> belsejébe
    ujSor.innerHTML = '\uFEFF';

    // Az új <div> beillesztése a kurzor aktuális pozíciójára
    range.insertNode(ujSor);

    // A kurzor az új <div> elejére kerül, a \uFEFF karakter után
    // — így a következő gépelés már az új, izolált BFC-ben indul
    const ujRange = document.createRange();
    ujRange.setStart(ujSor.firstChild, 1); // 1: a \uFEFF után
    ujRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(ujRange);

    console.log('SzovegBlokk._sortoresBeillesztese - VÉGE');
  }

  // =============================================
  // PRIVÁT - FÜGGŐ BETŰMÉRET ALKALMAZÁSA
  // =============================================
  // A kurzor aktuális pozíciójára beilleszt egy üres <span>-t a függő mérettel,
  // majd a kurzort a span belsejébe helyezi — így a következő karakter
  // már a helyes méretű span-ba kerül.
  // A line-height: 1 megakadályozza, hogy a nagy betűméretű span extra teret
  // nyisson az alatta húzódó sor felett.
  // Ezt keydown-ban hívjuk, a karakter beírása ELŐTT.
  // @param {number} px - A betűméret pixelben
  _fuggoBetumeretAlkalmazasa(px) {
    console.log('SzovegBlokk._fuggoBetumeretAlkalmazasa - KEZDÉS', { px });

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Span létrehozása a függő mérettel és line-height: 1 beállítással.
    // A Zero Width No-Break Space (U+FEFF) karaktert használjuk, hogy a span
    // ne legyen valóban üres — az üres span-ba a böngésző nem helyezi
    // a kurzort megbízhatóan.
    const span = document.createElement('span');
    span.style.fontSize   = px + 'px';
    span.style.lineHeight = '1';
    span.innerHTML = '\uFEFF'; // zero-width karakter, hogy a kurzor belépjen

    // Beillesztés a kurzor pozíciójára
    range.insertNode(span);

    // Kurzor a span végére helyezése — így a böngésző ide írja a következő karaktert
    range.setStartAfter(span.firstChild);
    range.setEndAfter(span.firstChild);
    selection.removeAllRanges();
    selection.addRange(range);

    console.log('SzovegBlokk._fuggoBetumeretAlkalmazasa - VÉGE', { px });
  }

  // =============================================
  // PRIVÁT - KARAKTER BILLENTYŰ ELLENŐRZÉSE
  // =============================================
  // Megvizsgálja, hogy a billentyűesemény látható karaktert ír-e be.
  // Kizárja a vezérlő billentyűket (nyilak, Ctrl, Alt, F-gombok stb.)
  // @param {KeyboardEvent} e - A billentyűesemény
  // @returns {boolean} Igaz, ha a billentyű egy látható karaktert ír be
  _karakterBillentyu(e) {
    // e.key.length === 1: egyetlen karakter (betű, szám, írásjel)
    // kizárjuk a Ctrl/Meta/Alt kombinációkat (pl. Ctrl+B = félkövér)
    return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  }

  // =============================================
  // PRIVÁT - ESEMÉNYEK BEKÖTÉSE
  // =============================================
  // @param {HTMLElement} elem - A DOM elem
  _esemenyekBekotese(elem) {
    console.log('SzovegBlokk._esemenyekBekotese - KEZDÉS', { blokkId: this.blokk.id });

    // Fókusz esemény — jelezzük a szülőnek, melyik blokk aktív
    elem.addEventListener('focusin', () => {
      if (this.onFokusz) this.onFokusz(this.blokk.id);
    });

    // Billentyű esemény — Enter, Backspace kezelése,
// valamint a függő betűméret alkalmazása az első karakter ELŐTT
elem.addEventListener('keydown', (e) => {

  if (e.key === 'Enter') {
    // Enter: sortörés <div>-vel a jelenlegi blokkon belül.
    // Új blokk létrehozása az eszköztár "Új blokk" gombjával lehetséges.
    e.preventDefault();
    this._sortoresBeillesztese();
    // Változás jelzése a szülőnek, hogy a tartalom frissüljön
    if (this.onValtozas) this.onValtozas(this.blokk.id, elem.innerHTML);
  }

  if (e.key === 'Backspace') {
    // Backspace üres blokkon: blokk törlése és fókusz az előzőre
    const tisztaSzoveg = elem.textContent.trim();
    if (tisztaSzoveg === '') {
      e.preventDefault();
      if (this.onTorles) this.onTorles(this.blokk.id);
    }
  }

  // Ha van függő betűméret ÉS valódi karaktert ír a felhasználó,
  // alkalmazzuk MIELŐTT a böngésző beírná a karaktert —
  // így az első karakter is már a helyes méretű span-ba kerül
  if (this._fuggoBetumeret !== null && this._karakterBillentyu(e)) {
    const px = this._fuggoBetumeret;
    // Törlés ELŐBB, hogy a span beillesztése ne triggereljen újabb alkalmazást
    this._fuggoBetumeret = null;
    this._fuggoBetumeretAlkalmazasa(px);
  }

});

    // Input esemény — tartalom változásakor jelezzük a szülőnek
    elem.addEventListener('input', () => {
      if (this.onValtozas) this.onValtozas(this.blokk.id, elem.innerHTML);
    });

    // Kijelölés mentése egér felengedésekor —
    // a color picker előtt szükséges a visszaállításhoz
    elem.addEventListener('mouseup', () => this._kijelolesElmentese());

    // Kijelölés mentése billentyű felengedésekor —
    // nyilakkal és Shift+nyíllal való kijelölésnél is működjön
    elem.addEventListener('keyup', () => this._kijelolesElmentese());

    console.log('SzovegBlokk._esemenyekBekotese - VÉGE');
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default SzovegBlokk;