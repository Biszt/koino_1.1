// frontend/js/components/IdEllenorzoMezo.js

// ===== IMPORTOK =====
import { apiGet } from '../utils/apiHelper.js';

// =============================================
// ID ELLENŐRZŐ MEZŐ
// Felelősség:
// - Entitás azonosító bekérése szöveges mezőben
// - Beírás után az entitás létezésének ellenőrzése a backend felé
// - Találat esetén az entitás címének/nevének megjelenítése
// - A hívó bármikor lekérheti az ellenőrzött, érvényes azonosítót
//
// Használják: JavaslatModal (új szülő, forrás entitások, egyezmény tárhely),
// később az EntitasHivatkozasPanel is erre épülhet.
// =============================================

// Entitás típus → API útvonal és válaszmező megfeleltetés
const TIPUS_KONFIGURACIO = {
  Tartalom:      { utvonal: 'tartalom',      valaszMezo: 'tartalom',      cimMezo: 'cim' },
  Kategoria:     { utvonal: 'kategoria',     valaszMezo: 'kategoria',     cimMezo: 'nev' },
  TartalomTipus: { utvonal: 'tartalomTipus', valaszMezo: 'tartalomTipus', cimMezo: 'nev' },
};

class IdEllenorzoMezo {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} kontener - A befogadó DOM elem
  // @param {Object} beallitasok
  // @param {string} beallitasok.cimke        - A mező felirata
  // @param {string} beallitasok.placeholder  - Az input placeholder szövege
  // @param {Array}  beallitasok.tipusok      - Engedélyezett entitás típusok
  //                                            (pl. ['Tartalom'] vagy mindhárom);
  //                                            több típusnál sorban próbálja őket
  // @param {string} beallitasok.token        - JWT token az API hívásokhoz
  // @param {Function} beallitasok.onValtozas - Ellenőrzés után hívódik (entitas|null)
  constructor(kontener, beallitasok = {}) {
    console.log('IdEllenorzoMezo.constructor - KEZDÉS', {
      cimke:   beallitasok.cimke,
      tipusok: beallitasok.tipusok
    });

    this.kontener    = kontener;
    this.cimke       = beallitasok.cimke       ?? 'Entitás azonosító';
    this.placeholder = beallitasok.placeholder ?? 'Írd be az entitás ID-ját';
    this.tipusok     = beallitasok.tipusok     ?? ['Tartalom', 'Kategoria', 'TartalomTipus'];
    this.token       = beallitasok.token       ?? null;
    this.onValtozas  = beallitasok.onValtozas  ?? null;

    // Az utoljára sikeresen ellenőrzött entitás: { entitasId, entitasTipus, cim }
    this.ervenyesEntitas = null;

    // Debounce időzítő az input eseményhez
    this._idozito = null;

    // Futó ellenőrzés sorszáma — a megkésett válaszok eldobásához
    this._ellenorzesSorszam = 0;

    this._render();

    console.log('IdEllenorzoMezo.constructor - VÉGE');
  }

  // =============================================
  // PUBLIKUS - ÉRVÉNYES ID LEKÉRÉSE
  // =============================================
  // @returns {string|null} Az ellenőrzött, létező entitás ID-ja, vagy null
  getId() {
    return this.ervenyesEntitas?.entitasId ?? null;
  }

  // =============================================
  // PUBLIKUS - ÉRVÉNYES ENTITÁS LEKÉRÉSE
  // =============================================
  // @returns {Object|null} { entitasId, entitasTipus, cim } vagy null
  getEntitas() {
    return this.ervenyesEntitas;
  }

  // =============================================
  // PUBLIKUS - ÜRES-E A MEZŐ
  // =============================================
  // @returns {boolean} true, ha a felhasználó semmit nem írt be
  isUres() {
    return !this.inputElem?.value.trim();
  }

  // =============================================
  // PUBLIKUS - ÉRTÉK BEÁLLÍTÁSA KÍVÜLRŐL
  // =============================================
  // Előtöltéshez (pl. a kártya saját entitása) — beírja az ID-t
  // és azonnal elindítja az ellenőrzést
  // @param {string} id - A beállítandó entitás ID
  setErtek(id) {
    console.log('IdEllenorzoMezo.setErtek - KEZDÉS', { id });
    if (!this.inputElem) return;
    this.inputElem.value = id ?? '';
    this.ervenyesEntitas = null;
    clearTimeout(this._idozito);
    this._ellenorzes();
    console.log('IdEllenorzoMezo.setErtek - VÉGE');
  }

  // =============================================
  // PUBLIKUS - MEGSEMMISÍTÉS
  // =============================================
  destroy() {
    console.log('IdEllenorzoMezo.destroy - KEZDÉS');
    clearTimeout(this._idozito);
    this.kontener.innerHTML = '';
    this.ervenyesEntitas = null;
    this.onValtozas      = null;
    this.kontener        = null;
    this.inputElem       = null;
    this.statuszElem     = null;
    console.log('IdEllenorzoMezo.destroy - VÉGE');
  }

  // =============================================
  // PRIVÁT - RENDERELÉS
  // =============================================
  _render() {
    console.log('IdEllenorzoMezo._render - KEZDÉS');

    const csoport = document.createElement('div');
    csoport.className = 'id-ellenorzo-mezo';

    const cimkeElem = document.createElement('label');
    cimkeElem.className   = 'id-ellenorzo-mezo__cimke';
    cimkeElem.textContent = this.cimke;

    this.inputElem = document.createElement('input');
    this.inputElem.type        = 'text';
    this.inputElem.className   = 'id-ellenorzo-mezo__input';
    this.inputElem.placeholder = this.placeholder;
    this.inputElem.spellcheck  = false;

    // Állapot sor: ellenőrzés folyamatban / találat / hiba
    this.statuszElem = document.createElement('div');
    this.statuszElem.className = 'id-ellenorzo-mezo__statusz';

    // Beírás után fél másodperc szünetet várunk, csak utána ellenőrzünk —
    // így nem indul API hívás minden egyes karakterre
    this.inputElem.addEventListener('input', () => {
      clearTimeout(this._idozito);
      this.ervenyesEntitas = null;
      this._statuszBeallitasa('', '');
      this._idozito = setTimeout(() => this._ellenorzes(), 500);
    });

    csoport.appendChild(cimkeElem);
    csoport.appendChild(this.inputElem);
    csoport.appendChild(this.statuszElem);
    this.kontener.appendChild(csoport);

    console.log('IdEllenorzoMezo._render - VÉGE');
  }

  // =============================================
  // PRIVÁT - ELLENŐRZÉS
  // =============================================
  // A beírt ID-t sorban megpróbálja az engedélyezett típusok
  // végpontjain — az első találat nyer.
  async _ellenorzes() {
    const id = this.inputElem.value.trim();
    console.log('IdEllenorzoMezo._ellenorzes - KEZDÉS', { id });

    // Üres mező: nincs mit ellenőrizni (a mező opcionális használatához)
    if (!id) {
      this._ertesites(null);
      return;
    }

    // MongoDB ObjectId formátum: pontosan 24 hexadecimális karakter
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      this._statuszBeallitasa('hiba', 'Érvénytelen azonosító formátum (24 hexadecimális karakter szükséges).');
      this._ertesites(null);
      return;
    }

    this._statuszBeallitasa('folyamatban', 'Ellenőrzés...');

    // Sorszám a megkésett válaszok kiszűréséhez: ha közben új ellenőrzés
    // indult, a régebbi válasz eredményét eldobjuk
    const sorszam = ++this._ellenorzesSorszam;

    for (const tipus of this.tipusok) {
      const konfiguracio = TIPUS_KONFIGURACIO[tipus];
      if (!konfiguracio) continue;

      try {
        const valasz = await apiGet(`${konfiguracio.utvonal}/${id}`, this.token);

        // Ha közben új ellenőrzés indult, ezt az eredményt eldobjuk
        if (sorszam !== this._ellenorzesSorszam) return;

        const entitasAdat = valasz?.[konfiguracio.valaszMezo];
        if (entitasAdat) {
          const cim = entitasAdat[konfiguracio.cimMezo]
            ?? entitasAdat.cim
            ?? entitasAdat.nev
            ?? '(cím nélkül)';

          this.ervenyesEntitas = { entitasId: id, entitasTipus: tipus, cim };
          this._statuszBeallitasa('talalat', `✓ ${tipus}: „${cim}"`);
          this._ertesites(this.ervenyesEntitas);

          console.log('IdEllenorzoMezo._ellenorzes - VÉGE (találat)', {
            entitasTipus: tipus,
            cim
          });
          return;
        }
      } catch (hiba) {
        // 404 vagy más hiba ennél a típusnál — próbáljuk a következőt
        console.log('IdEllenorzoMezo._ellenorzes - nincs találat ennél a típusnál', {
          tipus,
          hiba: hiba.message
        });
      }
    }

    // Ha közben új ellenőrzés indult, nem írunk ki semmit
    if (sorszam !== this._ellenorzesSorszam) return;

    this._statuszBeallitasa('hiba', '✗ Nem található entitás ezzel az azonosítóval.');
    this._ertesites(null);

    console.log('IdEllenorzoMezo._ellenorzes - VÉGE (nincs találat)', { id });
  }

  // =============================================
  // PRIVÁT - STÁTUSZ SOR BEÁLLÍTÁSA
  // =============================================
  // @param {string} allapot - '', 'folyamatban', 'talalat', 'hiba'
  // @param {string} szoveg  - A megjelenítendő szöveg
  _statuszBeallitasa(allapot, szoveg) {
    if (!this.statuszElem) return;
    this.statuszElem.textContent = szoveg;
    this.statuszElem.className = 'id-ellenorzo-mezo__statusz'
      + (allapot ? ` id-ellenorzo-mezo__statusz--${allapot}` : '');
  }

  // =============================================
  // PRIVÁT - VÁLTOZÁS JELZÉSE A HÍVÓNAK
  // =============================================
  // @param {Object|null} entitas - Az érvényes entitás vagy null
  _ertesites(entitas) {
    if (typeof this.onValtozas === 'function') {
      this.onValtozas(entitas);
    }
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default IdEllenorzoMezo;
