// frontend/js/components/modals/SikidomKartyaPanel.js

// ===== A SÍKIDOM NÉZET EGYETLEN KÁRTYÁJA =====
//
// Felelősség: a megkoppintott entitás adatlapját megmutatni a nézet fölött, és
// bezárni. Ennyi — a nézet geometriájáról, a tárról és a rajzolásról semmit nem
// tud, tehát a Síkidom nézet többi részétől függetlenül érthető és cserélhető.
//
// MIÉRT NEM VÁLTUNK PAKLI NÉZETRE koppintásra: az alsó sáv úgyis ott marad,
// onnan bármikor át lehet váltani. Csak a megkoppintott entitás kártyáját
// mutatjuk meg, bezárhatóan; a kártya saját hamburger menüjéből lehet az ADOTT
// ÁGRA pakli nézetbe váltani („Pakli nézet" menüpont, lásd `extraMenuOpciok`).
//
// A DOM-ját a `html/components/modals/sikidomModal.html` hozza (a panel és a
// hely eleme); ez az osztály csak tölti és üríti.
//
// Használja: SikidomModal.js (a Síkidom nézet).

// ===== IMPORTOK =====
import { apiGet } from '../../utils/apiHelper.js';
import { kartyaLetrehozasa } from '../kartya/kartyaGyar.js';

// A kártya SAJÁT modáljainak (javaslat, tudatpont, részletek…) konténere. NEM
// lehet ugyanaz, mint a Síkidom nézeté: a Modal felülírja a konténere gondolatát,
// tehát a kártya egy modálja kilőné alóla a nézetet. Ugyanaz a minta, mint a
// HozzajarulokModal / MeghivoModal al-modaljainál.
export const ALMODAL_KONTENER_ID = 'almodal-kontener';

// A panel DOM-elemeinek azonosítói
const PANEL_ID = 'sikidom-kartya-panel';
const HELY_ID  = 'sikidom-kartya-hely';

export class SikidomKartyaPanel {

  // @param {Object} beallitasok
  // @param {string} beallitasok.token             - JWT token
  // @param {Function} beallitasok.onBezaras       - a panel bezárult (a nézet törli a kiválasztást)
  // @param {Function} beallitasok.onPakliraValtas - (entitasId, entitasTipus)
  constructor(beallitasok = {}) {
    this.token = beallitasok.token ?? null;
    this._onBezaras = beallitasok.onBezaras ?? (() => {});
    this._onPakliraValtas = beallitasok.onPakliraValtas ?? (() => {});

    // Kérés-jelölő: ha közben másra koppintanak, a régi válasz ne írja felül az
    // újabbat (ugyanaz a minta, mint a rajzolás kérés-jelölőjénél)
    this._keres = null;
  }

  // ===== EGYETLEN KÁRTYA MEGJELENÍTÉSE =====
  async megjelenites(entitasId, entitasTipus) {
    console.log('SikidomKartyaPanel.megjelenites - KEZDÉS', { entitasId, entitasTipus });

    const panel = document.getElementById(PANEL_ID);
    const hely = document.getElementById(HELY_ID);
    if (!panel || !hely) return;

    hely.innerHTML = '';
    panel.removeAttribute('hidden');

    const keres = Symbol('kartya');
    this._keres = keres;

    try {
      // A kártya teljes adatait a meglévő pakli-végpont adja (a `kivalasztottEntitas`
      // épp az az elem, amit kértünk) — nem kell hozzá új backend-út.
      const valasz = await apiGet(
        `pakli?entitasId=${encodeURIComponent(entitasId)}&entitasTipus=${encodeURIComponent(entitasTipus)}`,
        this.token
      );
      if (this._keres !== keres) return;

      const entitas = valasz?.kivalasztottEntitas;
      if (!entitas?.entitasId) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
        return;
      }

      const kartya = kartyaLetrehozasa({
        entitas,
        kivalasztott: true,
        onKivalasztas: () => {},                 // a síkidomban nincs kártya-váltás
        token: this.token,
        modalKontenerAzon: this._alKontenerBiztositasa(),
        ujratoltesCb: () => this.megjelenites(entitasId, entitasTipus),
        onHamburgerMegnyitas: () => {}
      });

      // A NÉZET-FÜGGŐ menüpont: innen lehet az adott ágra pakli nézetbe váltani.
      // (A pakliban ennek nem volna értelme, ezért nem a kártya alap-menüjében van.)
      kartya.extraMenuOpciok = [{
        ikon:       '🃏',
        felirat:    'Pakli nézet',
        elvalaszto: true,
        akcio:      () => this._pakliraValtas(entitasId, entitasTipus)
      }];

      const kartyaDom = await kartya.init();
      if (this._keres !== keres) return;
      if (kartyaDom) hely.appendChild(kartyaDom);

      // A kártya szövege külön végponton érkezik (mint a pakliban)
      this._szovegBetoltese(kartya, entitas, keres);

      console.log('SikidomKartyaPanel.megjelenites - VÉGE', { entitasId });
    } catch (hiba) {
      console.error('SikidomKartyaPanel.megjelenites - HIBA', { hiba: hiba.message });
      if (this._keres === keres) {
        hely.innerHTML = '<p class="sikidom-modal__betoltes-szoveg">Az adatlap nem tölthető be.</p>';
      }
    }
  }

  // ===== BEZÁRÁS =====
  bezaras() {
    console.log('SikidomKartyaPanel.bezaras');
    this._keres = null;

    const panel = document.getElementById(PANEL_ID);
    const hely = document.getElementById(HELY_ID);
    panel?.setAttribute('hidden', '');
    if (hely) hely.innerHTML = '';

    this._onBezaras();
  }

  // ===== TAKARÍTÁS A NÉZET BEZÁRÁSAKOR =====
  // Az al-modal konténerét is kiürítjük, hogy ne maradjon rejtett modal-DOM a
  // body végén (a HozzajarulokModal mintája).
  takaritas() {
    this._keres = null;
    const alKontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (alKontener) alKontener.innerHTML = '';
  }

  // A kártya szövegtörzse (a pakli külön végponton adja, hogy a lista gyors legyen)
  async _szovegBetoltese(kartya, entitas, keres) {
    try {
      const valasz = await apiGet(
        `pakli/szoveg/${entitas.entitasTipus}/${entitas.entitasId}`, this.token
      );
      if (this._keres !== keres) return;
      if (typeof kartya.bodyFrissitese === 'function') {
        kartya.bodyFrissitese(valasz?.szoveg ?? null);
      }
    } catch (hiba) {
      console.warn('SikidomKartyaPanel._szovegBetoltese - a szöveg nem tölthető be', {
        hiba: hiba.message
      });
      if (typeof kartya.bodyFrissitese === 'function') kartya.bodyFrissitese(null);
    }
  }

  // A „Pakli nézet" menüpont: bezárjuk a kártyát, a nézet-váltásról a hívó dönt.
  _pakliraValtas(entitasId, entitasTipus) {
    console.log('SikidomKartyaPanel._pakliraValtas', { entitasId, entitasTipus });
    this.bezaras();
    this._onPakliraValtas(entitasId, entitasTipus);
  }

  // A kártya saját modáljainak konténere (a body végén, a nézet fölött)
  _alKontenerBiztositasa() {
    let kontener = document.getElementById(ALMODAL_KONTENER_ID);
    if (!kontener) {
      kontener = document.createElement('div');
      kontener.id = ALMODAL_KONTENER_ID;
      document.body.appendChild(kontener);
    }
    return ALMODAL_KONTENER_ID;
  }
}

// ===== EXPORTÁLÁS =====
export default SikidomKartyaPanel;
