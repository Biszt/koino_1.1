// koino/felulet/js/pakliNezet.js

// Felelősség: az örökölt KÁRTYÁKAT kirakni a lapra, a koino `/api/pakli`-jából.
//
// ===== ⚠️ EZ NEM A PROTOTÍPUS `Pakli.js`-E =====
//
// A prototípus `Pakli.js`-e **57 KB**, és sokkal többet tud, mint amire ma szükség van:
// síkidom- és struktúra-nézet, kereső, testvér-rendezés, hierarchikus navigáció, a
// modálokkal való összjáték. Azok a részek a **modal-parkra** épülnek, ami az 5.5-ben jön.
//
// ⭐ AMI VISZONT NEM RÖGTÖNZÉS: a **kártyák** változatlanul a prototípusból jönnek, és a
// lap ugyanazt a `kartyaGyar`-at használja, ugyanazzal a hívási renddel
// (`new Kartya(...)` → `init()` → a DOM-ba). Ez a fájl csak **a lista váza** köréjük — és
// amikor a `Pakli.js` is átjön, ez a fájl **eltűnik**, nem kell átépíteni miatta semmit.
//
// ===== ⭐ ÉS AMI A 9. SZABÁLY MIATT FONTOS =====
//
// A lap **soha nem kér paklit**, csak egy oldalnyi kártyát — kurzorral. A „Továbbiak" gomb
// a `kovetkezoKurzor`-t adja vissza, semmi mást. *A lapozás állapota a kurzorban van, nem a
// lapon számolt eltolásban.*

import { apiGet, lapHorgonyaBeallitasa } from './utils/apiHelper.js';
import { eemberMentese } from './utils/authHelper.js';
import { kartyaLetrehozasa } from './components/kartya/kartyaGyar.js';
import { oldalAdatta } from './kartyaAdat.js';

// Egy oldalon ennyi kártya. ⚠️ A program úgyis korlátoz (`MAX_DARAB`), ez csak a kérés.
const OLDAL_MERET = 10;

export class PakliNezet {

  /**
   * @param {HTMLElement} kontener - ide kerülnek a kártyák
   * @param {Object} elemek - { allapotElem, tovabbGomb, rendezesValaszto, iranyValaszto }
   */
  constructor(kontener, elemek = {}) {
    console.log('PakliNezet.constructor - KEZDÉS');

    this.kontener = kontener;
    this.elemek = elemek;

    this.kurzor = null;          // hol tartunk a lapozásban
    this.kivalasztott = null;    // melyik kártya van kinyitva
    this.kartyak = [];           // a példányok, hogy a kiválasztást váltani tudjuk
    this.rendezes = 'sajatPont';
    this.irany = 'csokkeno';

    console.log('PakliNezet.constructor - VÉGE');
  }

  /** Első betöltés: ki vagyok, aztán az első oldal. */
  async init() {
    console.log('PakliNezet.init - KEZDÉS');

    try {
      const en = await apiGet('en');
      eemberMentese(en);
      if (this.elemek.azonossagElem) {
        this.elemek.azonossagElem.textContent = en.rovid ?? '';
      }
    } catch (hiba) {
      // ⚠️ Ha ez elhasal, a jelszó a gyanús — mondjuk meg, ne csak üres lapot adjunk.
      this._allapot('Nem érem el a programot: ' + hiba.message
        + ' — azt a címet nyisd meg, amit a program kiírt.', 'nem');
      return;
    }

    await this.ujratoltes();
    console.log('PakliNezet.init - VÉGE');
  }

  /** Elölről kezdi a lapozást (rendezés-váltásnál és frissítésnél). */
  async ujratoltes() {
    console.log('PakliNezet.ujratoltes - KEZDÉS', { rendezes: this.rendezes });

    this.kurzor = null;
    this.kivalasztott = null;
    this.kartyak = [];
    this.kontener.replaceChildren();

    // ⭐ ÚJ LAPOZÁS = ÚJ HORGONY. Töröljük a régit, hogy a következő kérés FRISS képet
    // verjen — különben a „frissítés" ugyanazt a befagyasztott bemenetet hozná vissza.
    lapHorgonyaBeallitasa(null);

    await this.kovetkezoOldal();
    console.log('PakliNezet.ujratoltes - VÉGE');
  }

  /** Egy oldalnyi kártya — a kurzortól. */
  async kovetkezoOldal() {
    console.log('PakliNezet.kovetkezoOldal - KEZDÉS', { kurzor: this.kurzor !== null });

    const kereses = new URLSearchParams({
      rendezes: this.rendezes,
      irany: this.irany,
      darab: String(OLDAL_MERET)
    });
    if (this.kurzor) kereses.set('kurzor', this.kurzor);

    let oldal;
    try {
      oldal = await apiGet('pakli?' + kereses.toString());
    } catch (hiba) {
      this._allapot('Nem sikerült lekérni a paklit: ' + hiba.message, 'nem');
      return;
    }

    // ⭐⭐ A HORGONY MEGJEGYZÉSE — és MÉG A KÁRTYÁK KIRAKÁSA ELŐTT. Innentől minden
    // kártya-kérés (szöveg, tudatpont, részletek, küszöbök) ezt viszi magával, tehát
    // ugyanabból a képből felel, amiből ez a lista készült.
    lapHorgonyaBeallitasa({ horgony: oldal.horgony, most: oldal.most });

    for (const entitas of oldalAdatta(oldal.kartyak)) {
      await this._kartyaKirakasa(entitas);
    }

    this.kurzor = oldal.kovetkezoKurzor;

    // ----- A „Továbbiak" gomb -----
    if (this.elemek.tovabbGomb) {
      this.elemek.tovabbGomb.hidden = !this.kurzor;
    }

    // ----- Az állapot-sor -----
    const eddig = this.kartyak.length;
    let szoveg = eddig + ' / ' + oldal.osszes + ' kártya';
    if (oldal.ujdonsag) {
      // ⭐ MEGMONDJUK, hogy közben érkezett valami — de nem keverjük bele a listába.
      szoveg += ' · ⚠️ ' + oldal.ujEsemenyek + ' új esemény érkezett a lapozás kezdete óta';
    }
    this._allapot(szoveg);

    console.log('PakliNezet.kovetkezoOldal - VÉGE', { kartyak: eddig });
  }

  // ===================================
  // EGY KÁRTYA
  // ===================================

  /**
   * ⭐ Itt a lényeg: az ÖRÖKÖLT kártya-gyár, az örökölt hívási renddel.
   */
  async _kartyaKirakasa(entitas) {
    // A kártya saját modal-konténere — a prototípusban is így kap egyet.
    const modalKontenerAzon = 'modal-' + entitas.entitasId.slice(0, 12);
    const modalKontener = document.createElement('div');
    modalKontener.id = modalKontenerAzon;

    const kartya = kartyaLetrehozasa({
      entitas,
      kivalasztott: false,
      onKivalasztas: () => this._kivalasztas(entitas.entitasId),
      token: null,                      // a koinóban nincs token (D15)
      modalKontenerAzon,
      ujratoltesCb: () => this.ujratoltes(),
      onHamburgerMegnyitas: () => {}
    });

    const elem = await kartya.init();
    if (!elem) {
      console.warn('PakliNezet._kartyaKirakasa - a kártya nem épült fel', { entitas });
      return;
    }

    this.kontener.append(elem, modalKontener);
    this.kartyak.push({ azonosito: entitas.entitasId, kartya, entitas });

    // A cím betűméretét a prototípus a DOM-ba illesztés UTÁN igazítja — mi is.
    if (typeof kartya.cimBetumeretHozzaigazitasa === 'function') {
      kartya.cimBetumeretHozzaigazitasa();
    }
  }

  /**
   * Kiválasztás: egyszerre egy kártya van nyitva — ahogy a prototípus paklijában.
   *
   * ⭐ ÉS ITT KÉRJÜK EL A SZÖVEGET: a lista nem hozza (9. szabály), tehát akkor kérdezzük
   * meg, amikor tényleg kell — kártyánként, kinyitáskor.
   */
  async _kivalasztas(azonosito) {
    console.log('PakliNezet._kivalasztas - KEZDÉS', { azonosito });

    for (const k of this.kartyak) {
      const most = k.azonosito === azonosito && this.kivalasztott !== azonosito;

      // ⚠️ A `_kivalasztottAllapotBeallitasa` aláhúzással kezdődik, mégis kívülről hívjuk —
      // és ez tudatos. A prototípus `Pakli.js`-e a kártyát ilyenkor ÚJRAÉPÍTI a
      // `kivalasztott` jelzővel; az sokkal drágább, és a DOM-ot is elveszítené. Amíg a
      // `Pakli.js` át nem jön (5.5), ez a rövidebb út — a kártya viselkedése ugyanaz.
      k.kartya.kivalasztott = most;
      if (typeof k.kartya._kivalasztottAllapotBeallitasa === 'function') {
        k.kartya._kivalasztottAllapotBeallitasa();
      }

      // ⚠️⚠️ A BODY-T MINDIG A `bodyFrissitese()` TÖLTI FEL — és ez nem részletkérdés.
      //
      // ⛔ Az 5.3-ban ezt csak akkor hívtuk, ha volt szöveg elkérve. A gondolat-kártyáknál
      // ez működött, de az 5.5-ben kiderült, hogy **a javaslat-kártya body-ja üresen
      // maradt**: nincs szövege, tehát a hívás elmaradt — és vele a fülsáv és a SZAVAZÁS-FÜL
      // is. *A szöveg csak EGY dolog a body-ban; a feltöltést nem szabad hozzá kötni.*
      if (most) {
        await this._szovegPotlasa(k);
        if (typeof k.kartya.bodyFrissitese === 'function') {
          k.kartya.bodyFrissitese(k.entitas.adatok.szoveg ?? null);
        }
      }
    }

    this.kivalasztott = this.kivalasztott === azonosito ? null : azonosito;
    console.log('PakliNezet._kivalasztas - VÉGE', { nyitott: this.kivalasztott });
  }

  /** A szöveg utólagos elkérése — egyszer kártyánként. */
  async _szovegPotlasa(k) {
    if (k.szovegMegvan || !k.entitas.adatok.vanSzoveg) return;

    try {
      const valasz = await apiGet(
        'pakli/szoveg/' + encodeURIComponent(k.entitas.entitasTipus)
        + '/' + encodeURIComponent(k.azonosito));
      k.entitas.adatok.szoveg = valasz.szoveg;
      k.entitas.adatok.szovegMezo = valasz.szoveg;
      k.szovegMegvan = true;
      // ⚠️ A `bodyFrissitese`-t a hívó (`_kivalasztas`) hívja meg — MINDEN kártyára,
      // nem csak azokra, amiknek van szövege. Lásd az ottani megjegyzést.
    } catch (hiba) {
      console.warn('PakliNezet._szovegPotlasa - nem sikerült', { hiba: hiba.message });
    }
  }

  // ===================================
  // SEGÉD
  // ===================================

  _allapot(szoveg, osztaly = '') {
    if (!this.elemek.allapotElem) return;
    this.elemek.allapotElem.textContent = szoveg;
    this.elemek.allapotElem.className = 'allapot ' + osztaly;
  }
}

export default PakliNezet;
