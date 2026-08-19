// frontend/js/components/kartya/KartyaFulsav.js

// =============================================
// KÁRTYA FÜLSÁV (KÜLSŐ FÜL-RÉTEG)
// =============================================
// Felelősség:
// - A Javaslat- és Egyezmény-kártya body-jának KÜLSŐ fülsávja: több, előre
//   megépített tartalom-elem közti váltás (pl. „Indoklás" / „Módosított tartalom"
//   / „Szavazás").
// - Ez a KÜLSŐ réteg — tőle FÜGGETLEN a belső fülsáv, amit a
//   SzovegMezoMegjelenito rajzol egy-egy tartalom saját oldalaihoz. Egy külső fül
//   tartalma tehát maga is tartalmazhat belső fülsávot (két réteg fül).
//
// Használat:
//   new KartyaFulsav(kontener, {
//     fulek: [
//       { id: 'indoklas', felirat: 'Indoklás',           tartalomElem: <div> },
//       { id: 'modositas', felirat: 'Módosított tartalom', tartalomElem: <div> }
//     ],
//     aktivFulId: 'indoklas'   // opcionális; alapból az első fül
//   });
//
// FONTOS: a tartalom-elemeket a HÍVÓ (a kártya) építi és birtokolja — ez a
// komponens csak MEGJELENÍTI és VÁLTOGATJA őket (mutat/rejt), nem hoz létre és nem
// semmisít meg SzovegMezoMegjelenito példányt. A váltás így nem épít újra semmit,
// tehát nincs szivárgás; a tartalom-elemek életciklusát (destroy) a kártya intézi.
// =============================================

class KartyaFulsav {

  // ----- KONSTRUKTOR -----
  // @param {HTMLElement} kontener - A befogadó DOM elem (a kártya body-ban)
  // @param {Object} beallitasok
  // @param {Array}  beallitasok.fulek - [{ id, felirat, tartalomElem }]
  // @param {string} [beallitasok.aktivFulId] - Kezdő aktív fül ID-ja (alap: első)
  constructor(kontener, beallitasok = {}) {
    console.log('KartyaFulsav.constructor - KEZDÉS', {
      fulekSzama: beallitasok.fulek?.length ?? 0
    });

    // Befogadó elem + azonosító osztály
    this.kontener = kontener;
    this.kontener.classList.add('kartya-fulsav');

    // A fülek definíciója (üres tömb, ha nincs)
    this.fulek = Array.isArray(beallitasok.fulek) ? beallitasok.fulek : [];

    // Az aktív fül ID-ja: a megadott, vagy az első fül
    this.aktivFulId = beallitasok.aktivFulId ?? this.fulek[0]?.id ?? null;

    // Opcionális visszahívás fülváltáskor (fulId) — a kártya ebből méri újra a
    // „..." túlnyúlás-gombot az új aktív fülre (lásd Kartya._kibovitesUjraertekeles).
    this.onFulValtas = beallitasok.onFulValtas ?? null;

    // A fülgombok DOM-referenciái { fulId: gombElem } — az aktív jelöléshez
    this.fulGombok = {};

    // Renderelés azonnal
    this._render();

    console.log('KartyaFulsav.constructor - VÉGE', {
      aktivFulId: this.aktivFulId
    });
  }

  // ----- RENDERELÉS -----
  // Felépíti a fülsávot (gombok) és a tartalom-területet (az összes
  // tartalom-elem egymás alatt; a nem-aktívak elrejtve).
  _render() {
    console.log('KartyaFulsav._render - KEZDÉS', {
      fulekSzama: this.fulek.length
    });

    // Konténer ürítése (újra-render esetére)
    this.kontener.innerHTML = '';
    this.fulGombok = {};

    // Egyetlen fülnél nincs értelme fülsávnak — csak a tartalmat mutatjuk
    if (this.fulek.length <= 1) {
      const egyetlen = this.fulek[0]?.tartalomElem;
      if (egyetlen) this.kontener.appendChild(egyetlen);
      console.log('KartyaFulsav._render - VÉGE (egyetlen fül, nincs fülsáv)');
      return;
    }

    // === FÜLSÁV (gombok) ===
    const fulsav = document.createElement('div');
    fulsav.className = 'kartya-fulsav__sav';

    this.fulek.forEach((ful) => {
      const gomb = document.createElement('button');
      gomb.type = 'button';
      gomb.className = 'kartya-fulsav__ful';
      gomb.textContent = ful.felirat;
      gomb.dataset.fulId = ful.id;

      if (ful.id === this.aktivFulId) {
        gomb.classList.add('kartya-fulsav__ful--aktiv');
      }

      // Fülváltás — a stopPropagation kell, hogy a kattintás NE a kártyát
      // válassza ki (a kártya a body-koppintást is figyeli)
      gomb.addEventListener('click', (e) => {
        e.stopPropagation();
        this._fulValtas(ful.id);
      });

      this.fulGombok[ful.id] = gomb;
      fulsav.appendChild(gomb);
    });

    this.kontener.appendChild(fulsav);

    // === TARTALOM-TERÜLET (minden elem; a nem-aktívak elrejtve) ===
    const tartalomTerulet = document.createElement('div');
    tartalomTerulet.className = 'kartya-fulsav__tartalom';

    this.fulek.forEach((ful) => {
      if (!ful.tartalomElem) return;
      // A rejtést CSS-osztály adja (display:none), így a váltás csak
      // mutat/rejt — nem épít újra, nem szivárog
      if (ful.id !== this.aktivFulId) {
        ful.tartalomElem.classList.add('kartya-fulsav__panel--rejtett');
      }
      tartalomTerulet.appendChild(ful.tartalomElem);
    });

    this.kontener.appendChild(tartalomTerulet);

    console.log('KartyaFulsav._render - VÉGE', { aktivFulId: this.aktivFulId });
  }

  // ----- FÜLVÁLTÁS -----
  // Az aktív fül átállítása: a gombok jelölése + a panelok mutatása/rejtése.
  // @param {string} fulId - Az új aktív fül ID-ja
  _fulValtas(fulId) {
    console.log('KartyaFulsav._fulValtas - KEZDÉS', { fulId });

    if (fulId === this.aktivFulId) {
      console.log('KartyaFulsav._fulValtas - VÉGE (már ez az aktív)');
      return;
    }

    // Gombok jelölése
    const regiGomb = this.fulGombok[this.aktivFulId];
    const ujGomb   = this.fulGombok[fulId];
    if (regiGomb) regiGomb.classList.remove('kartya-fulsav__ful--aktiv');
    if (ujGomb)   ujGomb.classList.add('kartya-fulsav__ful--aktiv');

    // Panelok mutatása/rejtése
    const regiFul = this.fulek.find((f) => f.id === this.aktivFulId);
    const ujFul   = this.fulek.find((f) => f.id === fulId);
    if (regiFul?.tartalomElem) regiFul.tartalomElem.classList.add('kartya-fulsav__panel--rejtett');
    if (ujFul?.tartalomElem)   ujFul.tartalomElem.classList.remove('kartya-fulsav__panel--rejtett');

    this.aktivFulId = fulId;

    // A kártya értesítése: mérje újra a túlnyúlást az új aktív fül tartalmára.
    if (typeof this.onFulValtas === 'function') {
      this.onFulValtas(fulId);
    }

    console.log('KartyaFulsav._fulValtas - VÉGE', { fulId });
  }

  // ----- MEGSEMMISÍTÉS -----
  // Üríti a konténert és elvágja a referenciákat. FONTOS: a tartalom-elemekben
  // lévő SzovegMezoMegjelenito példányokat NEM semmisíti meg — azokat a kártya
  // birtokolja, a kártya destroy()-ja takarítja.
  destroy() {
    console.log('KartyaFulsav.destroy - KEZDÉS');

    if (this.kontener) this.kontener.innerHTML = '';
    this.fulek      = [];
    this.fulGombok  = {};
    this.aktivFulId = null;
    this.kontener   = null;

    console.log('KartyaFulsav.destroy - VÉGE');
  }
}

// --- EXPORTÁLÁS ---
export default KartyaFulsav;
