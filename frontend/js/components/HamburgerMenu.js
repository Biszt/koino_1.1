// frontend/js/components/HamburgerMenu.js

// ===== HAMBURGER MENÜ OSZTÁLY =====
// Egységes menü komponens – a gombot, az overlayt és a panelt is ő kezeli.
// A statikus váz a hamburgerMenu.html-ből töltődik be fetch()-csel.
// A dinamikus menüpontok JS-ben épülnek fel az opciok tömb alapján.
//
// Használat (ID-val, pl. FoOldal):
//   const menu = new HamburgerMenu('hamburger-menu-kontener', opciok);
//   await menu.init();
//
// Használat (DOM elemmel, pl. Kartya – amikor az elem még nincs a valódi DOM-ban):
//   const menu = new HamburgerMenu(kontenerDomElem, opciok);
//   await menu.init();
class HamburgerMenu {

  // ===== KONSTRUKTOR =====
  // @param {string|HTMLElement} kontener – a konténer div ID-ja VAGY maga a DOM elem
  // @param {Array}  opciok               – a megjelenítendő menüpontok listája
  constructor(kontener, opciok) {
    console.log('HamburgerMenu.constructor - KEZDÉS', {
      // Logban mindkét esetben azonosítható legyen
      kontenerAzonosito: typeof kontener === 'string' ? kontener : kontener?.id ?? '(DOM elem)',
      opciokSzama: opciok?.length
    });

    // Ha string → ID-t tároljuk, DOM elemet init()-ben keresünk document.getElementById-dal
    // Ha DOM elem → közvetlenül tároljuk, document.getElementById nem kell
    if (typeof kontener === 'string') {
      this.kontenerAzonosito = kontener; // ID eltárolása
      this.kontenerElem = null;          // init()-ben töltjük ki
    } else {
      this.kontenerAzonosito = kontener?.id ?? null; // Lehet, hogy nincs ID – nem baj
      this.kontenerElem = kontener;                  // DOM elem közvetlen tárolása
    }

    // Menüpontok listája – kívülről kapjuk, JS építi fel belőlük a DOM-ot
    this.opciok = opciok || [];

    // DOM elemek – init() tölti fel a template betöltése után
    this.gomb    = null; // A hamburger gomb (3 csík / X)
    this.overlay = null; // Félig átlátszó háttér
    this.panel   = null; // A menü doboz

    // Nyitott állapot követése
    this.nyitottE = false;

    // Opcionális callback: a menü megnyitásakor fut. A Kartya köti be, hogy a
    // tudatpont-függő menüpontokat frissítse. Megbízhatóbb, mint a gomb saját
    // click-figyelője, mert az esemény-sorrendtől független (a megnyitas() hívja).
    this.onMegnyitas = null;

    console.log('HamburgerMenu.constructor - VÉGE');
  }

  // ===== INICIALIZÁLÁS =====
  // HTML template betöltése, menüpontok felépítése, eseményfigyelők bekötése.
  // @returns {Promise<void>}
  async init() {
    console.log('HamburgerMenu.init - KEZDÉS');

    // VÁLTOZÁS: ha konstruktorban DOM elemet kaptunk → azt használjuk
    // ha ID-t kaptunk → document.getElementById-dal keressük a valódi DOM-ban
    const kontener = this.kontenerElem ?? document.getElementById(this.kontenerAzonosito);

    if (!kontener) {
      console.error('HamburgerMenu.init - HIBA: konténer nem található', {
        kontenerAzonosito: this.kontenerAzonosito
      });
      return;
    }

    // Statikus váz betöltése a html/components/ mappából
    const sikerult = await this._templateBetoltese(kontener);
    if (!sikerult) return;

    // DOM elemek eltárolása – a konténeren belül keresünk
    this.gomb    = kontener.querySelector('.hamburger-gomb');
    this.overlay = kontener.querySelector('.hamburger-menu-overlay');
    this.panel   = kontener.querySelector('.hamburger-menu-panel');

    // Dinamikus menüpontok felépítése createElement()-tel a panelbe
    this._pontokEpitese();

    // Gomb koppintásra váltja a menüt (nyit / zár)
    this.gomb.addEventListener('click', (e) => {
      this.valtas();
    });

    // Overlay koppintásra bezárja a menüt
    this.overlay.addEventListener('click', () => this.bezaras());

    // Menüpontok eseményfigyelőinek bekötése
    this._pontokEsemenyeiRakotese(kontener);

    console.log('HamburgerMenu.init - VÉGE');
  }

  // ===== TEMPLATE BETÖLTÉSE =====
  // Fetch()-csel lekéri a hamburgerMenu.html fájlt és beilleszti a konténerbe.
  // @param {HTMLElement} kontener – a konténer DOM elem
  // @returns {Promise<boolean>}   – true: sikeres | false: hiba
  async _templateBetoltese(kontener) {
    console.log('HamburgerMenu._templateBetoltese - KEZDÉS');

    try {
      const valasz = await fetch('./html/components/hamburgerMenu.html');

      if (!valasz.ok) {
        console.error('HamburgerMenu._templateBetoltese - HIBA: template nem található', {
          statusz: valasz.status
        });
        return false;
      }

      const htmlSzoveg = await valasz.text();
      kontener.innerHTML = htmlSzoveg;

      console.log('HamburgerMenu._templateBetoltese - VÉGE: sikeres betöltés');
      return true;

    } catch (hiba) {
      console.error('HamburgerMenu._templateBetoltese - VÉGE: kivétel', hiba.message);
      return false;
    }
  }

  // ===== MENÜPONTOK FELÉPÍTÉSE =====
  _pontokEpitese() {
    console.log('HamburgerMenu._pontokEpitese - KEZDÉS', {
      opciokSzama: this.opciok.length
    });

    if (!this.panel) return;

    this.opciok.forEach((opcio, index) => {
      if (opcio.elvalaszto) {
        const elvalaszto = document.createElement('hr');
        elvalaszto.className = 'hamburger-menu-elvalaszto';
        elvalaszto.setAttribute('aria-hidden', 'true');
        this.panel.appendChild(elvalaszto);
      }

      const pont = document.createElement('button');
      pont.className     = 'hamburger-menu-pont';
      pont.type          = 'button';
      pont.dataset.index = index;

      // Tudatpont-jogosultság: a tiltott pont halványan, „nem kattintható"
      // állapotban jelenik meg. A tiltvaIndok tipp (title) magyarázza, miért.
      // Nem a `disabled` attribútumot használjuk, hogy a title tipp működjön,
      // és a kattintást mi magunk hagyjuk figyelmen kívül (lásd eseménykötés).
      if (opcio.tiltva) {
        pont.classList.add('hamburger-menu-pont--tiltva');
        pont.setAttribute('aria-disabled', 'true');
        if (opcio.tiltvaIndok) pont.title = opcio.tiltvaIndok;
      }

      const ikonSpan = document.createElement('span');
      ikonSpan.className   = 'hamburger-menu-pont__ikon';
      ikonSpan.textContent = opcio.ikon;
      ikonSpan.setAttribute('aria-hidden', 'true');

      const feliratSpan = document.createElement('span');
      feliratSpan.className   = 'hamburger-menu-pont__felirat';
      feliratSpan.textContent = opcio.felirat;

      pont.appendChild(ikonSpan);
      pont.appendChild(feliratSpan);

      // Badge-es menüpont (opcio.badge: true, pl. Értesítések): a sor jobb szélén
      // egy rejtett piros számláló, amit a badgeFrissitese() tölt fel/rejt el.
      if (opcio.badge) {
        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'hamburger-menu-pont__badge';
        badgeSpan.hidden    = true; // Kezdetben rejtve – csak 0-nál nagyobb számnál látszik
        pont.appendChild(badgeSpan);
      }

      this.panel.appendChild(pont);
    });

    console.log('HamburgerMenu._pontokEpitese - VÉGE', {
      opciokSzama: this.opciok.length
    });
  }

  // ===== MENÜPONTOK ESEMÉNYEINEK RÁKÖTÉSE =====
  _pontokEsemenyeiRakotese(kontener) {
    console.log('HamburgerMenu._pontokEsemenyeiRakotese - KEZDÉS');

    const pontok = kontener.querySelectorAll('.hamburger-menu-pont');

    pontok.forEach((pont) => {
      pont.addEventListener('click', () => {
        const index = parseInt(pont.dataset.index, 10);
        const opcio = this.opciok[index];

        // Tiltott (jogosultság hiánya miatt inaktív) pont: nem hívjuk az akciót,
        // és a menü nyitva marad, hogy a felhasználó lássa a magyarázó tippet.
        if (opcio?.tiltva) {
          console.log('HamburgerMenu - tiltott menüpont kattintás (figyelmen kívül hagyva)', {
            index,
            felirat: opcio?.felirat
          });
          return;
        }

        console.log('HamburgerMenu - menüpont kattintás', {
          index,
          felirat: opcio?.felirat
        });

        this.bezaras();

        if (typeof opcio?.akcio === 'function') {
          opcio.akcio();
        }
      });
    });

    console.log('HamburgerMenu._pontokEsemenyeiRakotese - VÉGE', {
      pontokSzama: pontok.length
    });
  }

  // ===== MEGNYITÁS =====
  megnyitas() {
    console.log('HamburgerMenu.megnyitas - KEZDÉS');

    if (!this.gomb || !this.overlay || !this.panel) {
      console.error('HamburgerMenu.megnyitas - HIBA: DOM elemek hiányoznak');
      return;
    }

    this.gomb.classList.add('nyitott');
    this.gomb.setAttribute('aria-expanded', 'true');
    this.gomb.setAttribute('aria-label', 'Menü bezárása');

    this.overlay.classList.add('latható');
    this.panel.classList.add('latható');

    this.nyitottE = true;

    this.panel.setAttribute('aria-hidden', 'false');
    this.panel.focus();

    // Megnyitás callback – pl. a tudatpont-függő menüpontok frissítése (jogosultság).
    // A menü megjelenése után hívjuk, hogy a DOM már biztosan kész legyen.
    if (typeof this.onMegnyitas === 'function') {
      this.onMegnyitas();
    }

    console.log('HamburgerMenu.megnyitas - VÉGE');
  }

  // ===== BEZÁRÁS =====
    bezaras() {
    console.log('HamburgerMenu.bezaras - KEZDÉS');

    if (!this.gomb || !this.overlay || !this.panel) {
      console.error('HamburgerMenu.bezaras - HIBA: DOM elemek hiányoznak');
      return;
    }

    // Fókuszt ELŐSZÖR visszük a hamburger gombra,
    // mielőtt a panel aria-hidden="true" lenne
    this.gomb.focus();

    this.gomb.classList.remove('nyitott');
    this.gomb.setAttribute('aria-expanded', 'false');
    this.gomb.setAttribute('aria-label', 'Menü megnyitása');

    this.overlay.classList.remove('latható');
    this.panel.classList.remove('latható');

    this.nyitottE = false;

    // aria-hidden CSAK a fókusz visszavitele UTÁN kerül be
    this.panel.setAttribute('aria-hidden', 'true');

    console.log('HamburgerMenu.bezaras - VÉGE');
  }

  // ===== VÁLTÁS =====
  valtas() {
    console.log('HamburgerMenu.valtas - KEZDÉS', { nyitottE: this.nyitottE });

    if (this.nyitottE) {
      this.bezaras();
    } else {
      this.megnyitas();
    }

    console.log('HamburgerMenu.valtas - VÉGE', { nyitottE: this.nyitottE });
  }

  // ===== VAN-E TUDATPONT-FÜGGŐ MENÜPONT =====
  // Igaz, ha legalább egy opció tudatpontFuggo. A Kartya alaposztály ez alapján
  // dönti el, kell-e egyáltalán jogosultság-ellenőrzést futtatni a menü megnyitásakor.
  // @returns {boolean}
  vanTudatpontFuggoPont() {
    return this.opciok.some((opcio) => opcio?.tudatpontFuggo);
  }

  // ===== TUDATPONT-FÜGGŐ PONTOK TILTÁSÁNAK BEÁLLÍTÁSA =====
  // A menü megnyitásakor hívja a Kartya alaposztály, miután lekérdezte, van-e
  // az eembernek tudatpontja az entitáson. A tudatpontFuggo pontokat ez alapján
  // teszi inaktívvá vagy aktívvá (halvány + nem kattintható + magyarázó tipp).
  // @param {boolean} tiltva - true: nincs tudatpont → inaktív | false: aktív
  tudatpontFuggoTiltasBeallitasa(tiltva) {
    console.log('HamburgerMenu.tudatpontFuggoTiltasBeallitasa - KEZDÉS', { tiltva });

    const kontener = this.kontenerElem ?? document.getElementById(this.kontenerAzonosito);
    const pontElemek = kontener?.querySelectorAll('.hamburger-menu-pont');

    pontElemek?.forEach((pontElem) => {
      const index = parseInt(pontElem.dataset.index, 10);
      const opcio = this.opciok[index];
      if (!opcio?.tudatpontFuggo) return;

      // Az opció tiltva mezőjét is állítjuk: a kattintás-kezelő ezt nézi
      opcio.tiltva = tiltva;

      pontElem.classList.toggle('hamburger-menu-pont--tiltva', tiltva);
      pontElem.setAttribute('aria-disabled', tiltva ? 'true' : 'false');

      if (tiltva && opcio.tiltvaIndok) {
        pontElem.title = opcio.tiltvaIndok;
      } else {
        pontElem.removeAttribute('title');
      }
    });

    console.log('HamburgerMenu.tudatpontFuggoTiltasBeallitasa - VÉGE', { tiltva });
  }

  // ===== ÉRTESÍTÉS-BADGE FRISSÍTÉSE =====
  // Az olvasatlan értesítések számát írja ki két helyre:
  //   1. a hamburger gomb sarkán lévő badge-re (app-ikon szint),
  //   2. minden badge-es (opcio.badge: true) menüpont számlálójára.
  // 0 (vagy érvénytelen) számnál mindkét badge-et elrejti.
  // Hívja: FoOldal._ertesitesBadgeFrissitese() – betöltéskor és olvasás után.
  // @param {number} szam - az olvasatlan értesítések száma
  badgeFrissitese(szam) {
    console.log('HamburgerMenu.badgeFrissitese - KEZDÉS', { szam });

    // Érvénytelen érték (undefined, NaN, negatív) → 0-ként kezeljük
    const ervenyesSzam = Number.isFinite(szam) && szam > 0 ? szam : 0;

    // 99 felett „99+" – a badge ne nőjön a gombnál szélesebbre
    const kiirtSzoveg = ervenyesSzam > 99 ? '99+' : String(ervenyesSzam);

    const kontener = this.kontenerElem ?? document.getElementById(this.kontenerAzonosito);
    if (!kontener) {
      console.error('HamburgerMenu.badgeFrissitese - HIBA: konténer nem található');
      return;
    }

    // 1. A gomb sarkán lévő badge (a template statikus része)
    const gombBadge = kontener.querySelector('.hamburger-gomb__badge');
    if (gombBadge) {
      gombBadge.textContent = kiirtSzoveg;
      gombBadge.hidden      = ervenyesSzam === 0;
    }

    // 2. A badge-es menüpontok számlálói (a _pontokEpitese hozta létre őket)
    const pontBadgek = kontener.querySelectorAll('.hamburger-menu-pont__badge');
    pontBadgek.forEach((badge) => {
      badge.textContent = kiirtSzoveg;
      badge.hidden      = ervenyesSzam === 0;
    });

    console.log('HamburgerMenu.badgeFrissitese - VÉGE', { ervenyesSzam, kiirtSzoveg });
  }
}

// ===== EXPORTÁLÁS =====
export default HamburgerMenu;