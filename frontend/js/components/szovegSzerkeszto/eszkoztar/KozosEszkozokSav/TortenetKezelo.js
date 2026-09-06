// frontend/js/components/szovegSzerkeszto/eszkoztar/KozosEszkozokSav/TortenetKezelo.js

// --- TÖRTÉNET KEZELŐ OSZTÁLY ---
// Felelősség:
// - Undo/Redo stack kezelése (visszavonás, újra)
// - Snapshot mentés a BlokkLista aktuális állapotáról
// - Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z billentyű figyelés
// - Maximum 50 lépés tárolása (memória védelem)
// Megjegyzés:
// - A snapshot a BlokkLista blokkok tömbjének deep copy-ja
// - A gépelés közbeni mentés debounce-olva van (800ms szünet után)
// - A billentyű figyelő az AbortController-rel tisztítható
// - A visszaallitasFolyamatban flag megakadályozza, hogy visszaállítás
//   közben a belső mentes() hívások felülírják a redoStack-et
class TortenetKezelo {

  // --- KONSTRUKTOR ---
  // @param {Function} snapshotKeszito - SzovegSzerkeszto.getGondolat
  // @param {Function} allapotVisszaall - SzovegSzerkeszto._gondolatVisszaallitasa
  // @param {HTMLElement} teruletElem - A szerkesztő területe, itt figyelünk Ctrl+Z/Y-ra
  // @param {Object} opciak - Opcionális beállítások
  // @param {Function} opciak.allapotFrissites - Visszavonás/újra után hívódik, frissíti az Eszköztár gombjait
  constructor(snapshotKeszito, allapotVisszaall, teruletElem, opciak = {}) {
    console.log('TortenetKezelo.constructor - KEZDÉS', { opciak });

    this.snapshotKeszito = snapshotKeszito;
    this.allapotVisszaall = allapotVisszaall;
    this.teruletElem = teruletElem;

    // Visszavonás/újra után hívódik — frissíti az Eszköztár vissza/előre gombjait
    this.allapotFrissites = opciak.allapotFrissites ?? null;

    this.maxLepesek = opciak.maxLepesek ?? 50;
    this.debounceMs = opciak.debounceMs ?? 800;

    // Undo stack — a legutóbbi állapot van a végén, minden elem deep copy
    this.undoStack = [];

    // Redo stack — visszavont lépések; újabb változtatáskor ürül
    this.redoStack = [];

    // Debounce timer referencia gépelés közbeni mentéshez
    this.debounceTimer = null;

    // AbortController a billentyűfigyelő tisztításához (destroy híváskor)
    this.abortController = null;

    // Visszaállítás folyamatban jelző — megakadályozza, hogy visszaállítás
    // közben a belső mentes() hívások felülírják a redoStack-et
    this.visszaallitasFolyamatban = false;

    // Billentyűfigyelő bekötése
    this.billentyuFigyeloBekotese();

    console.log('TortenetKezelo.constructor - VÉGE');
  }

  // --- PUBLIKUS AZONNALI MENTÉS ---
  // Azonnal ment egy snapshot-ot — blokk típus váltás, törlés, hozzáadás,
  // drag-drop, beillesztés esetén hívja a SzovegSzerkeszto.
  // Ha visszaállítás folyamatban van, nem mentünk — a visszaállítás
  // belső blokk-létrehozásai ne töröljék a redoStack-et.
  mentes() {
    console.log('TortenetKezelo.mentes - KEZDÉS', { undoMeret: this.undoStack.length });

    // Visszaállítás közben érkező mentes() hívást figyelmen kívül hagyjuk
    if (this.visszaallitasFolyamatban) {
      console.log('TortenetKezelo.mentes - KIHAGYVA (visszaállítás folyamatban)');
      return;
    }

    // Debounce timer törlése — ha gépelés közben explicit mentés jön,
    // a késleltetett mentés már nem kell
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this._snapshotMentes();
    console.log('TortenetKezelo.mentes - VÉGE', { undoMeret: this.undoStack.length });
  }

  // --- PUBLIKUS DEBOUNCE MENTÉS ---
  // Késleltetve ment — gépelés közben hívja a SzovegSzerkeszto.
  // Minden hívásnál újraindítja a timert; 800ms szünet után ment.
  // Visszaállítás közben ezt is figyelmen kívül hagyjuk.
  mentesDebounce() {
    // Visszaállítás közben érkező hívást kihagyjuk
    if (this.visszaallitasFolyamatban) return;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this._snapshotMentes();
      console.log('TortenetKezelo.mentesDebounce - snapshot elmentve gépelés után');
    }, this.debounceMs);
  }

  // --- PUBLIKUS VISSZAVONÁS (UNDO) ---
  // Leveszi a legfelső állapotot az undoStack-ről, a redoStack-re tolja,
  // és visszaállítja az előző állapotot.
  // Ha az undoStack üres (kezdeti állapot), nem csinál semmit.
  visszavon() {
    console.log('TortenetKezelo.visszavon - KEZDÉS', {
      undoMeret: this.undoStack.length,
      redoMeret: this.redoStack.length
    });

    // Legalább 2 elem kell: a jelenlegi + az előző állapot
    if (this.undoStack.length < 2) {
      console.log('TortenetKezelo.visszavon - nincs visszavonható lépés');
      return;
    }

    // Jelenlegi állapot redo stack-re
    const jelenlegiAllapot = this.undoStack.pop();
    this.redoStack.push(jelenlegiAllapot);

    // Flag bekapcsolása — blokkolja a visszaállítás közben keletkező mentes() hívásokat
    this.visszaallitasFolyamatban = true;
    const elozoAllapot = this.undoStack[this.undoStack.length - 1];
    this.allapotVisszaall(this._deepCopy(elozoAllapot));
    // Flag kikapcsolása — visszaállítás befejeződött
    this.visszaallitasFolyamatban = false;

    // Eszköztár vissza/előre gombjait frissítjük
    if (this.allapotFrissites) this.allapotFrissites();

    console.log('TortenetKezelo.visszavon - VÉGE', {
      undoMeret: this.undoStack.length,
      redoMeret: this.redoStack.length
    });
  }

  // --- PUBLIKUS ÚJRA (REDO) ---
  // Visszahozza a redoStack tetejét, és visszaállítja azt az állapotot.
  ujra() {
    console.log('TortenetKezelo.ujra - KEZDÉS', {
      undoMeret: this.undoStack.length,
      redoMeret: this.redoStack.length
    });

    if (this.redoStack.length === 0) {
      console.log('TortenetKezelo.ujra - nincs újra végrehajtható lépés');
      return;
    }

    // Redo stack teteje undo stack-re, visszaállítás
    const kovetkezoAllapot = this.redoStack.pop();
    this.undoStack.push(kovetkezoAllapot);

    // Flag bekapcsolása
    this.visszaallitasFolyamatban = true;
    this.allapotVisszaall(this._deepCopy(kovetkezoAllapot));
    // Flag kikapcsolása
    this.visszaallitasFolyamatban = false;

    // Eszköztár vissza/előre gombjait frissítjük
    if (this.allapotFrissites) this.allapotFrissites();

    console.log('TortenetKezelo.ujra - VÉGE', {
      undoMeret: this.undoStack.length,
      redoMeret: this.redoStack.length
    });
  }

  // --- PUBLIKUS ÁLLAPOT LEKÉRÉSE ---
  // ÚJ METÓDUS: a SzovegSzerkeszto.kozosAllapotOsszeallitasa() hívja,
  // hogy a vissza/előre gombok engedélyezett/tiltott állapotát
  // a valódi stack-méretek alapján tudja beállítani.
  // @returns {Object} - { visszavonLehetseges: boolean, ismetLehetseges: boolean }
  allapotLekeres() {
    console.log('TortenetKezelo.allapotLekeres - KEZDÉS');

    // Visszavonás lehetséges, ha legalább 2 elem van az undoStack-ben
    // (az első elem a kezdeti állapot, azt nem lehet visszavonni)
    const visszavonLehetseges = this.undoStack.length >= 2;

    // Ismét lehetséges, ha van elem a redoStack-ben
    const ismetLehetseges = this.redoStack.length > 0;

    console.log('TortenetKezelo.allapotLekeres - VÉGE', { visszavonLehetseges, ismetLehetseges });
    return { visszavonLehetseges, ismetLehetseges };
  }

  // --- PUBLIKUS MEGSEMMISÍTÉS ---
  // Billentyű figyelő leállítása, timerek törlése.
  // A SzovegSzerkeszto.destroy() hívja.
  destroy() {
    console.log('TortenetKezelo.destroy - KEZDÉS');

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.undoStack = [];
    this.redoStack = [];

    console.log('TortenetKezelo.destroy - VÉGE');
  }

  // --- PRIVÁT SNAPSHOT MENTÉS ---
  // Közös logika az azonnali és debounce mentéshez.
  // Deep copy-t ment, hogy a stack elemei ne mutassanak ugyanarra az objektumra.
  _snapshotMentes() {
    const snapshot = this._deepCopy(this.snapshotKeszito());

    // Redo stack ürítése — új változtatás megszakítja az újra láncot
    this.redoStack = [];

    this.undoStack.push(snapshot);

    // Stack méret korlát — legrégebb elem eltávolítása, ha túl sok van
    if (this.undoStack.length > this.maxLepesek) {
      this.undoStack.shift(); // Legrégebbi (első) elem törlése
    }
  }

  // --- PRIVÁT BILLENTYŰFIGYELŐ BEKÖTÉSE ---
  // A teruletElem-en figyelünk capture: true opcióval, hogy a saját handlerünk
  // hamarabb fusson le, mint a böngésző beépített contenteditable undo/redo kezelője.
  billentyuFigyeloBekotese() {
    console.log('TortenetKezelo.billentyuFigyeloBekotese - KEZDÉS');

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // capture: true — a mi handlerünk fut le elsőként, megelőzve a böngészőt
    this.teruletElem.addEventListener('keydown', (e) => {

      // Csak Ctrl (Windows/Linux) vagy Meta (Mac) kombinációra figyelünk
      const vezerloGomb = e.ctrlKey || e.metaKey;
      if (!vezerloGomb) return;

      if (e.key === 'z' && !e.shiftKey) {
        // Ctrl+Z → visszavonás
        e.preventDefault();
        this.visszavon();

      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        // Ctrl+Y vagy Ctrl+Shift+Z → újra
        e.preventDefault();
        this.ujra();
      }

    }, { signal, capture: true });

    console.log('TortenetKezelo.billentyuFigyeloBekotese - VÉGE');
  }

  // --- PRIVÁT DEEP COPY ---
  // JSON alapú mély másolás — a blokkok egyszerű adatobjektumok,
  // nincsenek bennük körkörös referenciák vagy függvények,
  // ezért a JSON módszer elegendő és gyors.
  // @param {*} eredeti - A másolandó adat
  // @returns {*} - Független másolat
  _deepCopy(eredeti) {
    return JSON.parse(JSON.stringify(eredeti));
  }

}

// --- EXPORTÁLÁS ---
export default TortenetKezelo;