// frontend/js/components/FoOldalTortenetKezelo.js

// ===== FŐOLDAL TÖRTÉNET-KEZELŐ =====
// Felelősség:
//   - A főoldali navigáció "vissza / előre" történetének kezelése két veremmel.
//   - Egy "állapot" az, hogy MIT nézünk éppen: egy entitás a pakliban, vagy
//     egy nézet-modál (Struktúra nézet / Világtérkép / Síkidom / Rendezés) nyitva fölötte.
//   - Az osztály TISZTA adatstruktúra-logika: NEM nyúl a DOM-hoz és NEM navigál
//     maga. A vissza()/elore() csak VISSZAADJA, melyik állapotra kell ugrani —
//     a tényleges ugrást (pakli-navigálás, modál nyitás/zárás) a FoOldal végzi.
//
// Használják:
//   - FoOldal.js — ide rögzíti a navigációs lépéseket, és innen kéri le a
//     vissza/előre célállapotot, majd ő maga hajtja végre az ugrást.
//
// Minta:
//   - A szerkesztő TortenetKezelo.js-ének két-veremes (undo/redo) modellje,
//     de itt az elemek nem szöveg-állapotok, hanem meglátogatott "nézet-állapotok".
//
// Megjegyzés az "állapot" objektumról:
//   - Az osztály számára ez ÁTLÁTSZÓ (nem tudja, mi van benne). A FoOldal ilyet ad:
//       entitás:     { entitasId, entitasTipus, nezetModal: null }
//       nézet-modál: { entitasId, entitasTipus, nezetModal: 'struktura' }
//   - Az egyezés-vizsgálat (ismétlődő lépés kiszűrése) alapból JSON-összehasonlítás;
//     az opciok.egyezik függvénnyel felülírható.
class FoOldalTortenetKezelo {

  // ===== KONSTRUKTOR =====
  // @param {Object} opciok - Opcionális beállítások
  // @param {Function} opciok.onValtozas - Bármely változás után hívódik (rögzítés,
  //        vissza, előre); a FoOldal ebben frissíti a ◀ / ▶ gombok tiltott állapotát.
  // @param {Function} opciok.egyezik - (a, b) => boolean; két állapot azonos-e.
  //        Alapból JSON-összehasonlítás.
  // @param {number} opciok.maxLepesek - Maximum tárolt lépés vermenként (memória-védelem).
  constructor(opciok = {}) {
    console.log('FoOldalTortenetKezelo.constructor - KEZDÉS', { opciok });

    // Változás-értesítő a UI (gombok) frissítéséhez — opcionális
    this.onValtozas = opciok.onValtozas ?? null;

    // Egyezés-vizsgáló két állapot között — az ismétlődő lépés kiszűréséhez
    this.egyezik = opciok.egyezik ?? this._alapEgyezik;

    // Verem-méret korlát (mindkét veremre külön értendő)
    this.maxLepesek = opciok.maxLepesek ?? 100;

    // Az ÉPPEN aktuális állapot (ahol most vagyunk). Kezdetben null.
    this.jelenlegi = null;

    // Vissza-verem: a korábbi állapotok, a legutóbbi van a tetején (a tömb végén)
    this.visszaVerem = [];

    // Előre-verem: a visszalépéssel elhagyott állapotok; új rögzítéskor kiürül
    this.eloreVerem = [];

    console.log('FoOldalTortenetKezelo.constructor - VÉGE');
  }


  // ===== ÚJ LÉPÉS RÖGZÍTÉSE =====
  // A FoOldal hívja, amikor a felhasználó ÚJ helyre navigál (nem a vissza/előre
  // gombbal). A jelenlegi állapot a vissza-verembe kerül, az előre-verem kiürül.
  // FONTOS: a vissza()/elore() által kiváltott navigációnál a FoOldal a "nyers"
  //   (nem rögzítő) útvonalat használja, ezért oda NEM hívja meg ezt — így nincs
  //   dupla rögzítés.
  // @param {Object} ujAllapot - Az új nézet-állapot (átlátszó objektum)
  rogzit(ujAllapot) {
    console.log('FoOldalTortenetKezelo.rogzit - KEZDÉS', {
      ujAllapot,
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });

    // Ismétlődés kiszűrése: ha ugyanoda "navigálnánk", ahol már vagyunk, ne
    // keletkezzen fölösleges lépés (pl. ugyanarra a kártyára koppintás).
    if (this.jelenlegi !== null && this.egyezik(this.jelenlegi, ujAllapot)) {
      console.log('FoOldalTortenetKezelo.rogzit - KIHAGYVA (azonos a jelenlegivel)');
      return;
    }

    // A mostani állapot a vissza-verem tetejére kerül — de csak ha van már
    // jelenlegi (a legelső rögzítés csak "beültet", nem képez vissza-lépést).
    if (this.jelenlegi !== null) {
      this.visszaVerem.push(this.jelenlegi);

      // Verem-méret korlát: a legrégebbi (tömb eleji) elem eldobása, ha túl sok van
      if (this.visszaVerem.length > this.maxLepesek) {
        this.visszaVerem.shift();
      }
    }

    // Az új állapot lesz a jelenlegi, és az előre-lánc megszakad
    this.jelenlegi = ujAllapot;
    this.eloreVerem = [];

    this._ertesitsValtozas();

    console.log('FoOldalTortenetKezelo.rogzit - VÉGE', {
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });
  }


  // ===== VISSZALÉPÉS =====
  // A jelenlegi állapot az előre-verembe kerül, a vissza-verem tetejét vesszük
  // elő új jelenlegiként, és VISSZAADJUK — a FoOldal ezt fogja végrehajtani.
  // @returns {Object|null} - A célállapot, vagy null ha nincs hova visszalépni.
  vissza() {
    console.log('FoOldalTortenetKezelo.vissza - KEZDÉS', {
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });

    if (this.visszaVerem.length === 0) {
      console.log('FoOldalTortenetKezelo.vissza - VÉGE: nincs hova visszalépni');
      return null;
    }

    // A mostani állapotot félretesszük az előre-verembe (hogy Előre-vel visszajöhessen)
    this.eloreVerem.push(this.jelenlegi);

    // A vissza-verem tetejéről vesszük az új jelenlegit
    this.jelenlegi = this.visszaVerem.pop();

    this._ertesitsValtozas();

    console.log('FoOldalTortenetKezelo.vissza - VÉGE', {
      celAllapot: this.jelenlegi,
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });
    return this.jelenlegi;
  }


  // ===== ELŐRELÉPÉS =====
  // A vissza() tükörképe: a jelenlegit a vissza-verembe tesszük, az előre-verem
  // tetejét vesszük elő új jelenlegiként, és VISSZAADJUK.
  // @returns {Object|null} - A célállapot, vagy null ha nincs hova előrelépni.
  elore() {
    console.log('FoOldalTortenetKezelo.elore - KEZDÉS', {
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });

    if (this.eloreVerem.length === 0) {
      console.log('FoOldalTortenetKezelo.elore - VÉGE: nincs hova előrelépni');
      return null;
    }

    // A mostani állapot a vissza-verembe kerül (hogy Vissza-val visszajöhessen)
    this.visszaVerem.push(this.jelenlegi);

    // Az előre-verem tetejéről vesszük az új jelenlegit
    this.jelenlegi = this.eloreVerem.pop();

    this._ertesitsValtozas();

    console.log('FoOldalTortenetKezelo.elore - VÉGE', {
      celAllapot: this.jelenlegi,
      visszaMeret: this.visszaVerem.length,
      eloreMeret: this.eloreVerem.length
    });
    return this.jelenlegi;
  }


  // ===== ÁLLAPOT LEKÉRÉSE (GOMBOKHOZ) =====
  // A FoOldal ebből tudja beállítani a ◀ / ▶ gombok engedélyezett/tiltott állapotát.
  // @returns {{ visszaLehetseges: boolean, eloreLehetseges: boolean }}
  allapotLekeres() {
    const allapot = {
      visszaLehetseges: this.visszaVerem.length > 0,
      eloreLehetseges: this.eloreVerem.length > 0
    };
    console.log('FoOldalTortenetKezelo.allapotLekeres', allapot);
    return allapot;
  }


  // ===== JELENLEGI ÁLLAPOT LEKÉRÉSE =====
  // Csak olvasásra — a FoOldal így ellenőrizheti, hol vagyunk éppen.
  // @returns {Object|null}
  jelenlegiAllapot() {
    return this.jelenlegi;
  }


  // ===== TÖRTÉNET ÜRÍTÉSE =====
  // Teljes alaphelyzet (pl. kijelentkezéskor). A jelenlegi is törlődik.
  urites() {
    console.log('FoOldalTortenetKezelo.urites - KEZDÉS');
    this.jelenlegi = null;
    this.visszaVerem = [];
    this.eloreVerem = [];
    this._ertesitsValtozas();
    console.log('FoOldalTortenetKezelo.urites - VÉGE');
  }


  // ===== PRIVÁT: VÁLTOZÁS-ÉRTESÍTÉS =====
  // A UI (gombok) frissítéséhez hívja a beregisztrált callbacket, ha van.
  _ertesitsValtozas() {
    if (typeof this.onValtozas === 'function') {
      this.onValtozas(this.allapotLekeres());
    }
  }


  // ===== PRIVÁT: ALAP EGYEZÉS-VIZSGÁLAT =====
  // Két állapot akkor egyezik, ha JSON-alakjuk azonos. A nézet-állapotok
  // egyszerű adatobjektumok (nincs függvény, nincs körkörös hivatkozás),
  // ezért a JSON-módszer elegendő.
  // @param {*} a
  // @param {*} b
  // @returns {boolean}
  _alapEgyezik(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

}


// ===== EXPORTÁLÁS =====
export default FoOldalTortenetKezelo;
