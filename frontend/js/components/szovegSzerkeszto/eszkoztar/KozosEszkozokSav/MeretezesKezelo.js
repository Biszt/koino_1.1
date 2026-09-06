// frontend/js/components/szovegSzerkeszto/eszkoztar/KozosEszkozokSav/MeretezesKezelo.js

// =============================================
// MÉRETEZÉS KEZELŐ
// Felelősség:
// - Méretezési mód be/ki kapcsolása egy blokkon
// - Szöveges blokk: szabad x+y méretezés, minimum a gondolat természetes mérete
// - Képblokk: kötelezően arányos méretezés
// - Fájl, link, entitás: szabad x+y méretezés, gondolat font-size-a is skálázódik
// - Egéreseményfigyelők kezelése (szivárgásmentes)
// =============================================

class MeretezesKezelo {

  // =============================================
  // KONSTRUKTOR
  // @param {Object}   opciak                   - Függőségek kívülről
  // @param {Function} opciak.getBlokkLista      - Az aktív BlokkLista lekérése
  // @param {Function} opciak.getTerületElem     - A szerkesztő DOM területének lekérése
  // @param {Function} opciak.getTortenetKezelo  - A TortenetKezelo példány lekérése
  // @param {Function} opciak.onAllapotValtozas  - Callback: méretezési mód váltásakor
  // =============================================
  constructor(opciak) {
    console.log('MeretezesKezelo.constructor - KEZDÉS', opciak);

    this.getBlokkLista     = opciak.getBlokkLista     ?? null;
    this.getTerületElem    = opciak.getTerületElem    ?? null;
    this.getTortenetKezelo = opciak.getTortenetKezelo ?? null;
    this.onAllapotValtozas = opciak.onAllapotValtozas ?? null;

    // Az éppen aktív méretezési módban lévő blokk ID-ja — null: nincs aktív
    this.aktivBlokkId = null;

    // Eseményfigyelők referenciái a szivárgásmentes leállításhoz
    this.mouseDownKezelo = null;
    this.mouseMoveKezelo = null;
    this.mouseUpKezelo   = null;
    this.domElem         = null;

    console.log('MeretezesKezelo.constructor - VÉGE');
  }

  // =============================================
  // PUBLIKUS - MÉRETEZÉSI MÓD BE/KI ÁLLÍTÁSA
  // Toggle: ha ugyanarra a blokkra hívják, kikapcsolja.
  // Ha másik blokkra, az előzőt kikapcsolja, az újat bekapcsolja.
  // @param {string} blokkId - Az érintett blokk ID-ja
  // =============================================
  modBeAllitasa(blokkId) {
    console.log('MeretezesKezelo.modBeAllitasa - KEZDÉS', blokkId);

    // Ha ugyanaz a blokk: kikapcsolás (toggle)
    if (this.aktivBlokkId === blokkId) {
      this.modTorlese();
      console.log('MeretezesKezelo.modBeAllitasa - VÉGE kikapcsolás');
      return;
    }

    // Ha másik blokkon volt aktív, azt előbb töröljük
    if (this.aktivBlokkId) {
      this.modTorlese();
    }

    this.aktivBlokkId = blokkId;

    // CSS osztály rárakása — vizuális jelzés
    const terület = this.getTerületElem();
    const domElem = terület?.querySelector(`[data-blokk-id="${blokkId}"]`);
    if (domElem) {
      domElem.classList.add('blokk--meretezesi-mod');
    }

    // Blokk típusa alapján más-más méretezési logika
    const blokkLista = this.getBlokkLista();
    const blokk      = blokkLista?.getById(blokkId);

    if (!blokk) {
      console.log('MeretezesKezelo.modBeAllitasa - VÉGE blokk nem található');
      return;
    }

    if (blokk.tipus === 'szoveg') {
      // Szöveges blokk: szabad x+y, minimum a gondolat természetes mérete
      this.szovegMeretezesInditas(blokkId, domElem);
    } else {
      // Kép: arányos — fájl/link/entitás: szabad x+y, font-size skálázással
      this.aranyosMeretezesInditas(blokkId, domElem, blokk.tipus);
    }

    this.onAllapotValtozas?.();

    console.log('MeretezesKezelo.modBeAllitasa - VÉGE bekapcsolás', blokkId);
  }

  // =============================================
  // PUBLIKUS - MÉRETEZÉSI MÓD TÖRLÉSE
  // =============================================
  modTorlese() {
    console.log('MeretezesKezelo.modTorlese - KEZDÉS', this.aktivBlokkId);

    if (!this.aktivBlokkId) return;

    const terület = this.getTerületElem();
    const domElem = terület?.querySelector(`[data-blokk-id="${this.aktivBlokkId}"]`);
    if (domElem) {
      domElem.classList.remove('blokk--meretezesi-mod');
      domElem.classList.remove('blokk--meretezesi-huzas');
    }

    this.esemenyekLeallitasa();
    this.aktivBlokkId = null;
    this.onAllapotValtozas?.();

    console.log('MeretezesKezelo.modTorlese - VÉGE');
  }

  // =============================================
  // PUBLIKUS - AKTÍV BLOKK ID LEKÉRÉSE
  // @returns {string|null}
  // =============================================
  getAktivBlokkId() {
    return this.aktivBlokkId;
  }

  // =============================================
  // PUBLIKUS - MEGSEMMISÍTÉS
  // A SzovegSzerkeszto.destroy() hívja a szerkesztő bezárásakor.
  // Mint a modTorlese(), de az onAllapotValtozas callback NÉLKÜL —
  // destroy közben a többi modul (pl. TortenetKezelo) már nem él,
  // ezért az eszköztár-frissítést nem szabad meghívni.
  // =============================================
  destroy() {
    console.log('MeretezesKezelo.destroy - KEZDÉS', this.aktivBlokkId);

    if (this.aktivBlokkId) {
      const terület = this.getTerületElem?.();
      const domElem = terület?.querySelector(`[data-blokk-id="${this.aktivBlokkId}"]`);
      if (domElem) {
        domElem.classList.remove('blokk--meretezesi-mod');
        domElem.classList.remove('blokk--meretezesi-huzas');
      }
    }

    this.esemenyekLeallitasa();
    this.aktivBlokkId = null;

    console.log('MeretezesKezelo.destroy - VÉGE');
  }

  // =============================================
  // PRIVÁT - SZÖVEG BLOKK MÉRETEZÉS INDÍTÁSA
  // Szabad x+y méretezés, minimum a gondolat természetes mérete:
  // - scrollWidth: a leghosszabb szó szélessége
  // - scrollHeight: a gondolat magassága az aktuális szélességen
  // Mindkét értéket mousedown-ban olvassuk le EGYSZER — nincs layout thrashing.
  // @param {string}      blokkId - A méretezendő blokk ID-ja
  // @param {HTMLElement} domElem - A blokk DOM eleme
  // =============================================
  szovegMeretezesInditas(blokkId, domElem) {
    console.log('MeretezesKezelo.szovegMeretezesInditas - KEZDÉS', blokkId);

    // Kiindulási értékek — az egérgomb lenyomásakor rögzítjük
    let induloPontX      = 0;
    let induloPontY      = 0;
    let induloSzelesseg  = 0;
    let induloMagassag   = 0;

    // Méretezés kezdete
    const mouseDownKezelo = (e) => {
      console.log('MeretezesKezelo.szovegMeretezesInditas mousedown - KEZDÉS');
      e.preventDefault(); // szövegkijelölés megakadályozása

      induloPontX     = e.clientX;
      induloPontY     = e.clientY;
      induloSzelesseg = domElem.offsetWidth;
      induloMagassag  = domElem.offsetHeight;

      // Húzás közbeni vizuális jelzés
      domElem.classList.add('blokk--meretezesi-huzas');

      // document-re kerülnek, hogy a blokkon kívül is kövesse az egeret
      document.addEventListener('mousemove', mouseMoveKezelo);
      document.addEventListener('mouseup',   mouseUpKezelo);

      console.log('MeretezesKezelo.szovegMeretezesInditas mousedown - VÉGE', induloSzelesseg, induloMagassag);
    };

    // Méretezés közbeni frissítés
    const mouseMoveKezelo = (e) => {
      const deltaX = e.clientX - induloPontX;
      const deltaY = e.clientY - induloPontY;

      // MÓDOSÍTÁS: a minimális szélesség dinamikus —
      // a scrollWidth megadja a gondolat természetes szélességét
      // (azaz a leghosszabb szó szélességét padding nélkül).
      // Ha az új szélesség kisebb lenne, megállítjuk a kicsinyítést,
      // így a blokk soha nem lesz szűkebb a leghosszabb szónál.
      const gondolatMinSzelesseg = domElem.scrollWidth;
      const ujSzelesseg = Math.max(gondolatMinSzelesseg, induloSzelesseg + deltaX);


      const gondolatMinMagassag = domElem.scrollHeight;
      const ujMagassag = Math.max(gondolatMinMagassag, induloMagassag + deltaY);

      domElem.style.width  = ujSzelesseg + 'px';
      domElem.style.height = ujMagassag  + 'px';
    };

    // Méretezés vége — snapshot mentés
    const mouseUpKezelo = () => {
      console.log('MeretezesKezelo.szovegMeretezesInditas mouseup - KEZDÉS');

      domElem.classList.remove('blokk--meretezesi-huzas');
      document.removeEventListener('mousemove', mouseMoveKezelo);
      document.removeEventListener('mouseup',   mouseUpKezelo);

      // Az új méretet eltároljuk a blokk adatobjektumban snapshot-hoz
      const blokkLista = this.getBlokkLista();
      const blokk      = blokkLista?.getById(blokkId);
      if (blokk) {
        blokkLista.frissites(blokkId, {
          meretSzelesseg: domElem.offsetWidth,
          meretMagassag:  domElem.offsetHeight,
        });
        // Struktúraváltozás — azonnali snapshot mentés
        this.getTortenetKezelo?.().mentes();
      }

      console.log('MeretezesKezelo.szovegMeretezesInditas mouseup - VÉGE');
    };

    // Eseményfigyelő regisztrálása a blokk elemre
    domElem.addEventListener('mousedown', mouseDownKezelo);

    // Referenciák eltárolása a szivárgásmentes leállításhoz
    this.mouseDownKezelo = mouseDownKezelo;
    this.mouseMoveKezelo = mouseMoveKezelo;
    this.mouseUpKezelo   = mouseUpKezelo;
    this.domElem         = domElem;

    console.log('MeretezesKezelo.szovegMeretezesInditas - VÉGE', blokkId);
  }

  // =============================================
  // PRIVÁT - ARÁNYOS / SZABAD MÉRETEZÉS INDÍTÁSA
  //
  // KÉP (blokkTipus === 'kep'):
  //   Kötelezően arányos — a nagyobb delta vezérel,
  //   a magasság az eredeti arányból következik.
  //
  // FÁJL / LINK / ENTITÁS (többi típus):
  //   Szabad x+y méretezés — szélesség és magasság
  //   egymástól függetlenül változik, mint a szöveg blokknál.
  //   A belső elem font-size-a a szélességi delta arányában skálázódik,
  //   így a gondolat valóban kitölti a blokkot.
  //
  // @param {string}      blokkId    - A méretezendő blokk ID-ja
  // @param {HTMLElement} domElem    - A wrapper DOM eleme
  // @param {string}      blokkTipus - kep | fajl | link | entitasHivatkozas
  // =============================================
  aranyosMeretezesInditas(blokkId, domElem, blokkTipus) {
    console.log('MeretezesKezelo.aranyosMeretezesInditas - KEZDÉS', blokkId, blokkTipus);

    let induloPontX     = 0;
    let induloPontY     = 0;
    let induloSzelesseg = 0;
    let induloMagassag  = 0;
    let arany           = 1; // csak képnél használjuk
    let induloFontSize  = 0; // belső elem induló font-size-a px-ben
    let belsoElem       = null; // a belső gondolat DOM eleme

    // Blokktípusonként más CSS szelektorral érjük el a belső elemet
    const belsoElemSzelektor = {
      fajl:              '.fajl-blokk',
      link:              '.link-blokk',
      entitasHivatkozas: '.entitas-hivatkozas-blokk',
    };

    const mouseDownKezelo = (e) => {
      console.log('MeretezesKezelo.aranyosMeretezesInditas mousedown - KEZDÉS');
      e.preventDefault();

      induloPontX     = e.clientX;
      induloPontY     = e.clientY;
      induloSzelesseg = domElem.offsetWidth;
      induloMagassag  = domElem.offsetHeight;

      // Képnél arány rögzítése
      arany = induloMagassag > 0 ? induloSzelesseg / induloMagassag : 1;

      // Belső elem és induló font-size — egyszer olvassuk le mousedown-ban
      const szelektor = belsoElemSzelektor[blokkTipus];
      if (szelektor) {
        belsoElem = domElem.querySelector(szelektor);
        if (belsoElem) {
          induloFontSize = parseFloat(getComputedStyle(belsoElem).fontSize) || 14;
        }
      }

      domElem.classList.add('blokk--meretezesi-huzas');
      document.addEventListener('mousemove', mouseMoveKezelo);
      document.addEventListener('mouseup',   mouseUpKezelo);

      console.log('MeretezesKezelo.aranyosMeretezesInditas mousedown - VÉGE',
        induloSzelesseg, induloMagassag, arany, induloFontSize);
    };

    const mouseMoveKezelo = (e) => {
      const deltaX = e.clientX - induloPontX;
      const deltaY = e.clientY - induloPontY;

      const terület      = this.getTerületElem();
      const maxSzelesseg = terület?.offsetWidth ?? Infinity;

      let ujSzelesseg, ujMagassag;

      if (blokkTipus === 'kep') {
        // KÉP: kötelezően arányos — a nagyobb delta vezérel
        const dominansDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
        ujSzelesseg = Math.min(Math.max(40, induloSzelesseg + dominansDelta), maxSzelesseg);
        ujMagassag  = arany > 0 ? ujSzelesseg / arany : ujSzelesseg;
      } else {
        // FÁJL / LINK / ENTITÁS: szabad x+y, egymástól független
        ujSzelesseg = Math.min(Math.max(40, induloSzelesseg + deltaX), maxSzelesseg);
        ujMagassag  = Math.max(40, induloMagassag + deltaY);
      }

      domElem.style.width  = ujSzelesseg + 'px';
      domElem.style.height = ujMagassag  + 'px';

      // Font-size skálázás a szélességi arány alapján —
      // a magasság változása nem befolyásolja a betűméretet
      if (belsoElem && induloSzelesseg > 0) {
        const skala      = ujSzelesseg / induloSzelesseg;
        const ujFontSize = induloFontSize * skala;
        belsoElem.style.fontSize = ujFontSize + 'px';
      }
    };

    const mouseUpKezelo = () => {
      console.log('MeretezesKezelo.aranyosMeretezesInditas mouseup - KEZDÉS');

      domElem.classList.remove('blokk--meretezesi-huzas');
      document.removeEventListener('mousemove', mouseMoveKezelo);
      document.removeEventListener('mouseup',   mouseUpKezelo);

      // Méretek és font-size mentése a blokk adatobjektumba
      const blokkLista = this.getBlokkLista();
      const blokk      = blokkLista?.getById(blokkId);
      if (blokk) {
        blokkLista.frissites(blokkId, {
          meretSzelesseg: domElem.offsetWidth,
          meretMagassag:  domElem.offsetHeight,
          meretFontSize:  belsoElem
            ? parseFloat(belsoElem.style.fontSize) || induloFontSize
            : null,
        });
        this.getTortenetKezelo?.().mentes();
      }

      console.log('MeretezesKezelo.aranyosMeretezesInditas mouseup - VÉGE');
    };

    domElem.addEventListener('mousedown', mouseDownKezelo);

    this.mouseDownKezelo = mouseDownKezelo;
    this.mouseMoveKezelo = mouseMoveKezelo;
    this.mouseUpKezelo   = mouseUpKezelo;
    this.domElem         = domElem;

    console.log('MeretezesKezelo.aranyosMeretezesInditas - VÉGE', blokkId);
  }

  // =============================================
  // PRIVÁT - ESEMÉNYFIGYELŐK LEÁLLÍTÁSA
  // Szivárgásmentes takarítás.
  // =============================================
  esemenyekLeallitasa() {
    console.log('MeretezesKezelo.esemenyekLeallitasa - KEZDÉS');

    if (this.domElem && this.mouseDownKezelo) {
      this.domElem.removeEventListener('mousedown', this.mouseDownKezelo);
    }
    if (this.mouseMoveKezelo) {
      document.removeEventListener('mousemove', this.mouseMoveKezelo);
    }
    if (this.mouseUpKezelo) {
      document.removeEventListener('mouseup', this.mouseUpKezelo);
    }

    this.mouseDownKezelo = null;
    this.mouseMoveKezelo = null;
    this.mouseUpKezelo   = null;
    this.domElem         = null;

    console.log('MeretezesKezelo.esemenyekLeallitasa - VÉGE');
  }
}

// EXPORTÁLÁS
export default MeretezesKezelo;