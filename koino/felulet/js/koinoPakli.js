// koino/felulet/js/koinoPakli.js

// Felelősség: az örökölt `Pakli.js` a koinóban — és CSAK az, amit a prototípus nem tudhatott (D100, a ház).
//
// ===== ⭐ MIÉRT ALOSZTÁLY =====
//
// A `components/Pakli.js` a prototípusból **bájtra változatlanul** jött át (H3/A), mint a kártyák az 5.3-ban: a
// láncos-testvéres nézet (felmenők, a kiválasztott, a bogár, a testvérek a kacsacsőrökkel), a lapos rendezés, a
// húzás, a görgetés — mind az övé. Az útvonalai a lapon fordulnak a program útvonalaira (`kartyaAdat.js`,
// `apiHelper.js`). Amit a koinó TÖBBET mond, mint a prototípus szervere, az ide kerül, a meglévő metódusok KÖRÉ
// (előtte/utána), nem beléjük:
//
//   1. ⭐ **A BETÖLTÉS (H1/A):** a szigorú (b) alatt a készülék nem tud mindent; amit a pakli nem ismer, azt a program
//      függő kérelemként beírja, és az ŐRJÁRAT hozza el. A lap addig „betöltés…”-t mutat, és csendben újrakérdez
//      (egyre ritkábban); ha a válasz változott, újrarajzol — villogás nélkül, a kiválasztás helyén maradva.
//   2. ⭐ **A FORRÁS (H2/A):** a nem tartott ág össz-pontja jelölve (ellenőrizve · bemondás · részleges · ismeretlen),
//      a nem tartott kártya kerete szaggatott — a kártyák bájtra a prototípuséi, a jelölés a kirajzolás UTÁN kerül rájuk.
//   3. ⭐ **A LAPOS NÉZET LAPOZÁSA (9. szabály):** a program egy oldalnyit ad, nem az egész paklit — a „További
//      kártyák” a kurzorral kéri a következőt, és a lista végére fűzi.
//   4. ⭐ **A FELDERÍTETLEN RÉSZ (D116):** a kártyán a leszármazottak (▾) és a testvérek (↔) ismert száma, és mellettük
//      halványan, ami még nincs meg (a tartója szerint — „+N”); ha a kiválasztottnak van nem ismert testvére, a testvér-jelző
//      mellett „+N testvér” — a számok a programtól (`koinoFelderitetlen.js`).
//
// ⚠️ A lap itt sem számol: minden szám és jel a programtól jön; ez a fájl csak megmutatja és újrakérdez.
//
// Használja: `index.html`.

import Pakli from './components/Pakli.js';
import { apiGet } from './utils/apiHelper.js';
import { eemberMentese, aktivEntitasMentese, aktivEntitasLekerese } from './utils/authHelper.js';
import { oldalAdatta, LAPOS_OLDAL } from './kartyaAdat.js';
import { kartyaSzamokJelolese, testverHianyJelzo, testverHianyEltavolitasa } from './koinoFelderitetlen.js';
import { torzsMeretJelolese } from './koinoTorzs.js';   // ⭐ D120: a törzs mérete a kártyán

// ===================================
// A CSENDES ÚJRAKÉRDEZÉS ÜTEME
// ===================================
//
// Az őrjárat körönként dolgozik (percek), tehát a lapnak nem kell sűrűn kérdeznie: az első néhány másodperc a gyors
// válasznak (ha az őrjárat épp most köröz), utána egyre ritkábban — egy nyitva felejtett lap se terhelje a programot.
const UJRAKERDEZES_KEZDO = 4000;
const UJRAKERDEZES_MAX = 60000;
const UJRAKERDEZES_SZORZO = 1.5;

// A pakli-válaszok feljegyzése (entitásonként) — korlátos, mert a lap sokáig nyitva lehet.
const FELJEGYZES_KORLAT = 64;

// ===================================
// ⭐ H2: AZ ÖSSZ-PONT FORRÁSÁNAK JELE
// ===================================
//
// ⚠️ A hiány látszik, de nem vád (D19): jel és magyarázat, nem piros figyelmeztetés. A „számolt” (a saját tudásomból,
// teljesen) nem kap jelet — az a természetes eset.
const FORRAS_JELE = {
  ellenorzott: { jel: '✓', magyarazat: 'ellenőrizve: a tartója mondta be, és a szúrópróba igazolta' },
  bemondas: { jel: '≈', magyarazat: 'bemondás: a tartója mondta, még nem ellenőriztük' },
  reszleges: { jel: '+?', magyarazat: 'részleges: a részfa egy részének pontjait még nem ismerem' },
  ismeretlen: { jel: '?', magyarazat: 'a pontjai még nem jöttek meg' }
};

export class KoinoPakli extends Pakli {

  /**
   * @param {string} kontenerAzon - a pakli konténerének azonosítója
   * @param {string} modalKontenerAzon - a modálok közös konténere
   * @param {Object} [elemek] - { allapotElem, tovabbGomb, azonossagElem }
   */
  constructor(kontenerAzon, modalKontenerAzon, elemek = {}) {
    // ⭐ A kiválasztás-váltást a prototípusban a FoOldal mentette; itt a pakli maga (helyi kényelem, nem esemény).
    super(null, kontenerAzon, modalKontenerAzon, (entitasId, entitasTipus) => aktivEntitasMentese(entitasId, entitasTipus));
    console.log('KoinoPakli.constructor - KEZDÉS');

    this.elemek = elemek;
    this.feljegyzesek = new Map();     // entitás ('' = a gyökér-hívás) → a legutóbbi pakli-válasz jelzése
    this.utolsoLapos = null;           // a lapos nézet legutóbbi oldala (kurzor, összes)
    this.ujrakerdezesIdozito = null;
    this.ujrakerdezesKoz = UJRAKERDEZES_KEZDO;
    this.megjelenitettKulcs = null;    // melyik entitás fa-szelete van kirajzolva
    this.kertEntitas = null;           // amit az utolsó `init` kért (ha a program még nem ismeri, ezt várjuk)
    this.initKulcs = null;             // amire az utolsó `init` megérkezett (ha a néző azóta elmozdult, nem várunk tovább)

    // A `Pakli.js` nem tárolja, amit a fordítás nem fér el (betöltés, hiányzók, kurzor) — az `apiHelper.js` jelzi.
    document.addEventListener('koino:pakliValasz', (e) => this._valaszFeljegyzese(e.detail));

    console.log('KoinoPakli.constructor - VÉGE');
  }

  // ===================================
  // INDULÁS ÉS ÚJRAINDULÁS
  // ===================================

  /** Első betöltés: ki vagyok, aztán a mentett kártya (vagy a legerősebb gyökér) fa-szelete. */
  async indulas() {
    console.log('KoinoPakli.indulas - KEZDÉS');
    try {
      const en = await apiGet('en');
      eemberMentese(en);
      if (this.elemek.azonossagElem) this.elemek.azonossagElem.textContent = en.rovid ?? '';
    } catch (hiba) {
      // ⚠️ Ha ez elhasal, a jelszó a gyanús — mondjuk meg, ne csak üres lapot adjunk.
      this._allapot('Nem érem el a programot: ' + hiba.message + ' — azt a címet nyisd meg, amit a program kiírt.', 'nem');
      return;
    }
    const mentett = aktivEntitasLekerese();
    await this.init(mentett.entitasId, mentett.entitasTipus);
    console.log('KoinoPakli.indulas - VÉGE');
  }

  /**
   * Minden betöltés ide fut be (a `Pakli.js` és a kártyák is ezt hívják) — az újrakérdezés innen indul újra.
   * ⚠️ Ha a mentett kártya nincs meg, és a koinó üres, a `Pakli.js` hamisat ad (a FoOldal dolga volt újrapróbálni
   * a gyökértől): itt tesszük meg.
   */
  async init(entitasId = null, entitasTipus = null) {
    console.log('KoinoPakli.init - KEZDÉS', { entitasId });
    this._ujrakerdezesLeallitasa();
    this.ujrakerdezesKoz = UJRAKERDEZES_KEZDO;
    this.kertEntitas = entitasId ? { entitasId, entitasTipus } : null;

    let rendben = await super.init(entitasId, entitasTipus);
    if (rendben === false && entitasId && this.rendezesMod === 'hierarchikus') {
      rendben = await super.init();
    }
    this.initKulcs = this.allapot.kivalasztottEntitasId;
    this._allapotSor();
    this._tovabbGombFrissitese();
    console.log('KoinoPakli.init - VÉGE', { rendben, kivalasztott: this.initKulcs });
    return rendben;
  }

  /** A „Frissítés” gomb: elfelejtjük a fa-szeleteket, és a mostani kártyától újra. */
  async frissites() {
    this.allapot.paklikEsTestverek = {};
    const most = this.aktualisEntitas() ?? aktivEntitasLekerese();
    if (this.rendezesMod === 'hierarchikus') await this.init(most?.entitasId ?? null, most?.entitasTipus ?? null);
    else await this.init();
  }

  /**
   * Koinó-váltás (a tér): a fa-szeletek és a mentett kártya a RÉGI koinóé — egy idegen azonosítóra a program
   * kérelmet írna be. Tiszta lappal, a legerősebb gyökértől.
   */
  async ujKoino() {
    console.log('KoinoPakli.ujKoino - KEZDÉS');
    this.allapot.paklikEsTestverek = {};
    this.feljegyzesek.clear();
    aktivEntitasMentese(null, null);
    await this.init();
    console.log('KoinoPakli.ujKoino - VÉGE');
  }

  /**
   * ⭐ AZ ALSÓ SÁV (Csaba, 2026-10-15): egy csere új eseményt hozott — csendben újra, a kiválasztás helyén (mint a H1
   * újrakérdezése: villogás nélkül, csak ha a fa-szelet tényleg változott). A többi fa-szelet gyorsítótára elavult: azt
   * elfelejtjük (a következő lépés frissen kéri). Ha a kiválasztott eltűnt (pl. egy egyezményről mindenki levette a
   * pontját — D14), a szülőjére lépünk, ha az sincs, a legerősebb gyökérre.
   * ⚠️ Betöltés és testvérváltás közben nem nyúlunk hozzá (a hívó később újra próbálja).
   * @returns {Promise<boolean>} megtörtént-e (false: most nem lehetett)
   */
  async kulsoValtozas() {
    console.log('KoinoPakli.kulsoValtozas - KEZDÉS', { mod: this.rendezesMod });
    if (this.testverBetoltesAlatt || this.allapot.betoltesFolyamatban) return false;
    if (this.rendezesMod !== 'hierarchikus') {
      await this._laposUjrakerdezes();
      return true;
    }
    const kulcs = this.allapot.kivalasztottEntitasId ?? null;
    if (!kulcs) {
      await this.init();
      return true;
    }
    const kartya = this.kartyaPeldanyok[this.kivalasztottIndex]?.entitas;
    const tipus = kartya?.entitasId?.toString() === kulcs ? kartya.entitasTipus : null;
    const szulo = kartya?.entitasId?.toString() === kulcs ? kartya.szuloId ?? null : null;
    const elotte = this._szeletLenyomata(kulcs);
    const megtartott = this.allapot.paklikEsTestverek[kulcs];
    this.allapot.paklikEsTestverek = megtartott ? { [kulcs]: megtartott } : {};
    await this.pakliLekerese(kulcs, tipus, true);
    if (this.feljegyzesek.get(kulcs)?.nemTalalt) {
      // Eltűnt: a szülője (ha a program azt sem ismeri, az `init` a gyökértől indul). A `Pakli.js` csak típussal együtt
      // kérdez entitásra — a szülő a kirajzolt láncban áll (a felmenők közt), onnan a típusa.
      const szuloTipus = (megtartott?.pakli ?? []).find((e) => e.entitasId === szulo)?.entitasTipus ?? 'Gondolat';
      if (szulo) aktivEntitasMentese(szulo, szuloTipus);
      else aktivEntitasMentese(null, null);
      const rendben = szulo ? await this.init(szulo, szuloTipus) : await this.init();
      console.log('KoinoPakli.kulsoValtozas - VÉGE (a kiválasztott eltűnt)', { szulo, rendben });
      return true;
    }
    if (this._szeletLenyomata(kulcs) === elotte) {
      this.testverJelzoFrissitese();
      this._allapotSor();
      console.log('KoinoPakli.kulsoValtozas - VÉGE (nem változott)');
      return true;
    }
    // Változott: újra, a kiválasztás helyén. Ha a néző a kirajzolt láncon belül egy másik kártyát nyitott ki, annak a
    // láncát rajzoljuk (mint egy újratöltés ugyanott).
    const pakli = this.allapot.paklikEsTestverek[kulcs]?.pakli ?? [];
    const hol = pakli.findIndex((e) => e.entitasId === kulcs);
    this.kivalasztottIndex = hol >= 0 ? hol : 0;
    await this.kivalasztottSzovegFrissitese();
    await this.paklitRendel();
    console.log('KoinoPakli.kulsoValtozas - VÉGE (újrarajzolva)');
    return true;
  }

  // ===================================
  // A KIRAJZOLÁS UTÁN: jelölés, állapot-sor, újrakérdezés
  // ===================================

  async paklitRendel() {
    await super.paklitRendel();
    this.megjelenitettKulcs = this.allapot.kivalasztottEntitasId;
    this._forrasJelolese();
    this._allapotSor();
    this._ujrakerdezesUtemezese();
  }

  uresAllapotMegjelenites() {
    super.uresAllapotMegjelenites();
    testverHianyEltavolitasa();
    this.megjelenitettKulcs = null;
    this._allapotSor();
    // ⭐ Az üres koinó is lehet „még nem jött meg” (egy friss tag a szigorú (b) alatt) — várjunk rá.
    this._ujrakerdezesUtemezese();
  }

  async lapositottRendel() {
    this._ujrakerdezesLeallitasa();
    testverHianyEltavolitasa();
    await super.lapositottRendel();
    this.megjelenitettKulcs = null;
    this._allapotSor();
    this._tovabbGombFrissitese();
    this._laposUjrakerdezesUtemezese();
  }

  // ===================================
  // ⭐ D102: A LAPOS NÉZET CSENDES ÚJRAKÉRDEZÉSE — amíg a bejáró kérései úton vannak
  // ===================================
  //
  // Az ágazati pont szerint csökkenő sor biztos előtagját a bejáró kéri ki (a tartó maga jár be — J1); amíg van mit várni
  // (`betoltes`), a lap csendben újrakérdez (ugyanazzal az ütemmel, mint a fa-szeletnél), és csak akkor rajzol újra, ha az
  // első oldal változott — a „További kártyák”-kal hozzáfűzött oldalak addig maradnak.

  _laposUjrakerdezesUtemezese() {
    clearTimeout(this.laposIdozito);
    if (this.rendezesMod === 'hierarchikus' || !this.utolsoLapos?.betoltes) { this.laposVarakozas = UJRAKERDEZES_KEZDO; return; }
    const varj = this.laposVarakozas ?? UJRAKERDEZES_KEZDO;
    this.laposVarakozas = Math.min(UJRAKERDEZES_MAX, Math.round(varj * UJRAKERDEZES_SZORZO));
    this.laposIdozito = setTimeout(() => this._laposUjrakerdezes(), varj);
  }

  async _laposUjrakerdezes() {
    if (this.rendezesMod === 'hierarchikus') return;
    const lenyomat = (l) => JSON.stringify((l ?? []).map((e) => [e.entitasId, e.hierarchikusOsszesPont]));
    const elotte = lenyomat(this.lapositottLista.slice(0, LAPOS_OLDAL));
    const biztosElotte = this.utolsoLapos?.biztos ?? null;
    try {
      await this.rendezettLekerese();
      if (lenyomat(this.lapositottLista) !== elotte || (this.utolsoLapos?.biztos ?? null) !== biztosElotte) {
        await this.lapositottRendel();
        return;
      }
    } catch (hiba) {
      console.warn('KoinoPakli._laposUjrakerdezes - nem sikerült', { hiba: hiba.message });
    }
    this._allapotSor();
    this._laposUjrakerdezesUtemezese();
  }

  // ===================================
  // ⭐ A LAPOS NÉZET LAPOZÁSA (9. szabály)
  // ===================================

  /** A következő oldal a kurzorral — a lista végére fűzve, a `Pakli.js` saját kártya-példányosításával. */
  async tovabbiKartyak() {
    console.log('KoinoPakli.tovabbiKartyak - KEZDÉS');
    const kurzor = this.utolsoLapos?.kovetkezoKurzor;
    if (!kurzor || this.rendezesMod === 'hierarchikus') return;

    let oldal;
    try {
      const kereses = new URLSearchParams({ rendezes: this.rendezesMod, irany: this.rendezesIrany,
        darab: String(LAPOS_OLDAL), kurzor });
      // ⭐ D101: az ág-szűrt rendezés (a kártya menüjéből) a további oldalakon is az ágon marad.
      if (this.rendezesAgazatId) kereses.set('agazat', this.rendezesAgazatId);
      oldal = await apiGet('pakli?' + kereses.toString());
    } catch (hiba) {
      this._allapot('Nem sikerült lekérni a további kártyákat: ' + hiba.message, 'nem');
      return;
    }
    this.utolsoLapos = { ...this.utolsoLapos, kovetkezoKurzor: oldal.kovetkezoKurzor ?? null,
      osszes: oldal.osszes ?? this.utolsoLapos.osszes, ujdonsag: oldal.ujdonsag === true, ujEsemenyek: oldal.ujEsemenyek ?? 0,
      koinoMegjegyzes: oldal.koinoMegjegyzes ?? this.utolsoLapos.koinoMegjegyzes ?? null };

    const csomagolo = document.getElementById('pakli-wrapper');
    for (const entitas of oldalAdatta(oldal.kartyak)) {
      const index = this.lapositottLista.length;
      this.lapositottLista.push(entitas);
      // Ugyanaz a hívási rend és ugyanazok a visszahívások, mint a `Pakli.lapositottRendel`-ben.
      const kartya = this.kartyaPeldanyositasa(entitas, false, () => this.lapositottKartyaKivalasztasa(index),
        this.modalKontenerAzonosito, () => this.init(), () => this.lapositottCsakCssValt(index));
      const dom = await kartya.init();
      this.kartyaPeldanyok[index] = kartya;
      this.kartyadomElemek[index] = dom ?? null;
      if (dom && csomagolo) {
        csomagolo.appendChild(dom);
        if (typeof kartya.cimBetumeretHozzaigazitasa === 'function') kartya.cimBetumeretHozzaigazitasa();
      }
    }
    this._allapotSor();
    this._tovabbGombFrissitese();
    console.log('KoinoPakli.tovabbiKartyak - VÉGE', { kartyak: this.lapositottLista.length });
  }

  // ===================================
  // ⭐ H1: A CSENDES ÚJRAKÉRDEZÉS
  // ===================================

  /** Az `apiHelper.js` jelzése egy pakli-válaszról. */
  _valaszFeljegyzese(jel) {
    if (!jel) return;
    if (jel.fajta === 'lapos') {
      this.utolsoLapos = jel;
      return;
    }
    if (jel.fajta !== 'hierarchia') return;
    const tegyuk = (kulcs, ertek) => {
      this.feljegyzesek.delete(kulcs);
      this.feljegyzesek.set(kulcs, ertek);
      while (this.feljegyzesek.size > FELJEGYZES_KORLAT) this.feljegyzesek.delete(this.feljegyzesek.keys().next().value);
    };
    tegyuk(jel.kivalasztott ?? '', jel);
    // A kért entitás, ha a program (még) nem ismeri: a legerősebb gyökeret kaptuk helyette — ezt is megjegyezzük.
    if (jel.kert && jel.kert !== jel.kivalasztott) tegyuk(jel.kert, { ...jel, nemTalalt: true });
    // ⭐ A láncon belül kinyitott kártya fa-szelete a háttérben jön (a `Pakli.kartyaKivalasztasa`): ha annak hiányzik
    // valamije (a szövege, a gyerekei), és az újrakérdezés már leállt, újraindul.
    // (A rendes betöltés — `init`, testvérváltás — alatt nem: ott a kirajzolás ütemez.)
    if (jel.betoltes && !this.ujrakerdezesIdozito && this.rendezesMod === 'hierarchikus' && !this.allapot.betoltesFolyamatban
      && (jel.kivalasztott ?? '') === (this.allapot.kivalasztottEntitasId ?? '')) {
      this.ujrakerdezesKoz = UJRAKERDEZES_KEZDO;
      this._ujrakerdezesUtemezese();
    }
  }

  /** Mire várunk most: a kért, de még nem ismert entitásra (ha a néző azóta nem mozdult), vagy a kiválasztottra. */
  _varakozas() {
    const kert = this.kertEntitas?.entitasId ?? null;
    const kivalasztott = this.allapot.kivalasztottEntitasId ?? null;
    if (kert && kert !== kivalasztott && kivalasztott === this.initKulcs && this.feljegyzesek.get(kert)?.nemTalalt) {
      return { fajta: 'kert', kulcs: kert, feljegyzes: this.feljegyzesek.get(kert) };
    }
    return { fajta: 'kivalasztott', kulcs: kivalasztott, feljegyzes: this.feljegyzesek.get(kivalasztott ?? '') };
  }

  _ujrakerdezesUtemezese() {
    this._ujrakerdezesLeallitasa();
    if (this.rendezesMod !== 'hierarchikus') return;
    const v = this._varakozas();
    if (!v.feljegyzes?.betoltes) return;
    this.ujrakerdezesIdozito = setTimeout(() => { this._ujrakerdezes(); }, this.ujrakerdezesKoz);
    console.log('KoinoPakli._ujrakerdezesUtemezese', { mire: v.fajta, kulcs: v.kulcs, mp: this.ujrakerdezesKoz / 1000 });
    this.ujrakerdezesKoz = Math.min(UJRAKERDEZES_MAX, Math.round(this.ujrakerdezesKoz * UJRAKERDEZES_SZORZO));
  }

  _ujrakerdezesLeallitasa() {
    if (this.ujrakerdezesIdozito) clearTimeout(this.ujrakerdezesIdozito);
    this.ujrakerdezesIdozito = null;
  }

  /**
   * Egy csendes újrakérdezés: a fa-szelet a gyorsítótárba (a kiválasztáshoz nem nyúl — `csakCache`), és ha más lett,
   * újrarajzolunk; a szöveget, ha hiányzott, újra elkérjük.
   */
  async _ujrakerdezes() {
    this.ujrakerdezesIdozito = null;
    if (this.rendezesMod !== 'hierarchikus') return;
    if (this.testverBetoltesAlatt) { this._ujrakerdezesUtemezese(); return; }
    const v = this._varakozas();
    console.log('KoinoPakli._ujrakerdezes - KEZDÉS', { mire: v.fajta, kulcs: v.kulcs });

    try {
      // ----- A kért entitás: ha már megvan, betöltjük (ez a néző kérése volt) -----
      if (v.fajta === 'kert') {
        await this.pakliLekerese(v.kulcs, this.kertEntitas.entitasTipus, true);
        if (this.feljegyzesek.get(v.kulcs)?.kivalasztott === v.kulcs || !this.feljegyzesek.get(v.kulcs)?.nemTalalt) {
          await this.init(v.kulcs, this.kertEntitas.entitasTipus);
          return;
        }
        this._allapotSor();
        this._ujrakerdezesUtemezese();
        return;
      }

      // ----- Az üres koinó: ha közben megjött valami, a gyökértől -----
      if (!v.kulcs) {
        await this.pakliLekerese(null, null, true);
        if (this.feljegyzesek.get('')?.kivalasztott) { await this.init(); return; }
        this._allapotSor();
        this._ujrakerdezesUtemezese();
        return;
      }

      // ----- A kiválasztott fa-szelete -----
      const szovegHianyzott = (v.feljegyzes?.hianyzik ?? []).some((h) => h.fajta === 'torzs' && h.kulcs === v.kulcs);
      const elotte = this._szeletLenyomata(v.kulcs);
      const tipus = this.kartyaPeldanyok[this.kivalasztottIndex]?.entitas?.entitasTipus ?? null;
      await this.pakliLekerese(v.kulcs, tipus, true);
      const valtozott = this._szeletLenyomata(v.kulcs) !== elotte;

      if (valtozott && v.kulcs === this.megjelenitettKulcs && this.allapot.kivalasztottEntitasId === v.kulcs) {
        // A kirajzolt fa-szelet változott: újra, a kiválasztás helyén (a `paklitRendel` újra ütemez).
        const pakli = this.allapot.paklikEsTestverek[v.kulcs]?.pakli ?? [];
        const hol = pakli.findIndex((e) => e.entitasId === v.kulcs);
        this.kivalasztottIndex = hol >= 0 ? hol : 0;
        await this.kivalasztottSzovegFrissitese();
        await this.paklitRendel();
        console.log('KoinoPakli._ujrakerdezes - VÉGE (újrarajzolva)');
        return;
      }

      // A néző a kirajzolt láncon belül egy másik kártyát nyitott ki: annak csak a szövegét és a jelzőjét frissítjük.
      if (szovegHianyzott) {
        const kartya = this.kartyaPeldanyok[this.kivalasztottIndex];
        if (kartya?.entitas?.entitasId === v.kulcs) {
          const szoveg = await this._entitasSzovegBetoltese(kartya.entitas);
          if (szoveg && kartya === this.kartyaPeldanyok[this.kivalasztottIndex]) kartya.bodyFrissitese(szoveg);
        }
      }
      this.testverJelzoFrissitese();
      this._allapotSor();
      this._ujrakerdezesUtemezese();
      console.log('KoinoPakli._ujrakerdezes - VÉGE', { valtozott });
    } catch (hiba) {
      console.warn('KoinoPakli._ujrakerdezes - nem sikerült', { hiba: hiba.message });
      this._ujrakerdezesUtemezese();
    }
  }

  /** Egy fa-szelet lenyomata (azonosítók, számok, jelek) — ebből látszik, hogy az újrakérdezés hozott-e valamit. */
  _szeletLenyomata(kulcs) {
    const adat = this.allapot.paklikEsTestverek[kulcs];
    if (!adat) return '';
    const elem = (e) => [e.entitasId, e.adatok?.cim, e.hierarchikusOsszesPont, e.entitasSajatTudatpont,
      e.koinoForras?.osszPontForras, e.koinoForras?.tartom, JSON.stringify(e.koinoSzamok ?? null)];
    return JSON.stringify([(adat.pakli ?? []).map(elem), (adat.testverek ?? []).map(elem)]);
  }

  // ===================================
  // ⭐ H2: A FORRÁS JELÖLÉSE A KÁRTYÁN
  // ===================================

  /**
   * ⭐ D116: a testvér-jelző mellé a nem ismert testvérek száma (a kiválasztott fa-szeletének válaszából — `testverHiany`).
   * A `TestverJelzo` bájtra a prototípusé; a többlet a frissítése UTÁN jön.
   */
  testverJelzoFrissitese() {
    super.testverJelzoFrissitese();
    const kulcs = this.allapot.kivalasztottEntitasId ?? null;
    const kartya = this.kartyaPeldanyok[this.kivalasztottIndex]?.entitas;
    if (this.rendezesMod !== 'hierarchikus' || !kulcs || kartya?.entitasId?.toString() !== kulcs) {
      testverHianyEltavolitasa();
      return;
    }
    testverHianyJelzo(this.feljegyzesek.get(kulcs)?.testverHiany ?? null);
  }

  /** A kirajzolt kártyák ágazati pontja mellé a forrás jele; a nem tartott kártya kerete szaggatott. */
  _forrasJelolese() {
    this.kartyaPeldanyok.forEach((kartya, i) => {
      const dom = this.kartyadomElemek[i];
      // ⭐ D116: a leszármazottak és a testvérek száma, és ami még nincs meg (a forrás-jeltől függetlenül — a tartott kártya
      // alatt is lehet még nem ismert)
      if (dom) kartyaSzamokJelolese(dom, kartya?.entitas?.koinoSzamok ?? null);
      if (dom) torzsMeretJelolese(dom, kartya?.entitas?.koinoTorzsMeret ?? null);   // ⭐ D120
      const forras = kartya?.entitas?.koinoForras;
      if (!dom || !forras) return;
      dom.classList.toggle('pakli-kartya--nem-tartott', !forras.tartom);
      // A saját pont és a hozzájárulók: ha a pontjait sem láttuk (csak a születését), a 0 „nem tudom” — jel áll helyette.
      if (forras.pontokIsmeretlenek) {
        for (const cimke of ['Hozzájárulók száma', 'Entitás saját tudatpontja']) {
          const e = dom.querySelector('.pakli-kartya__ikon-sor--tudatpont .pakli-kartya__ikon-elem[aria-label="' + cimke + '"]');
          if (!e) continue;
          // Csak a SZÁMOT cseréljük (az ikon — a levél-rajz is — marad): az utolsó szöveg-csomópont a szám.
          const szam = [...e.childNodes].reverse().find((n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.textContent));
          if (szam) szam.textContent = szam.textContent.replace(/[\d\s.,]+$/, ' ');
          const jelElem = document.createElement('span');
          jelElem.className = 'pakli-kartya__forras pakli-kartya__forras--ismeretlen';
          jelElem.textContent = FORRAS_JELE.ismeretlen.jel;
          e.appendChild(jelElem);
          const felirat = cimke + ' — ' + FORRAS_JELE.ismeretlen.magyarazat;
          e.setAttribute('aria-label', felirat);
          e.title = felirat;
        }
      }
      const jel = FORRAS_JELE[forras.osszPontForras];
      // A prototípus kártyája az ágazati pontot a tudatpont-sorban, ezzel a felirattal írja ki (`Kartya.js`).
      const elem = dom.querySelector('.pakli-kartya__ikon-sor--tudatpont .pakli-kartya__ikon-elem[aria-label^="Ágazati"]');
      // ⭐ D112 ⑤: a felderítés pillanatképe — „📷 pillanatkép, N napja” (nem frissül; a követés eszköze a tudatpont).
      // ⚠️ Külön osztály (nem `pakli-kartya__forras`): a lenti forrás-jel épp azt keresi, hogy van-e már jel.
      if (forras.rogzitve && elem && !elem.querySelector('.pakli-kartya__rogzitett')) {
        const nap = Math.floor((Date.now() - forras.rogzitve) / (24 * 3600 * 1000));
        const kep = document.createElement('span');
        kep.className = 'pakli-kartya__rogzitett';
        kep.textContent = '📷';
        kep.title = 'Pillanatkép (felderítés), ' + (nap <= 0 ? 'ma' : nap + ' napja')
          + ' — nem frissül; amit követni akarsz, arra tegyél tudatpontot';
        elem.appendChild(kep);
      }
      if (!jel || !elem || elem.querySelector('.pakli-kartya__forras')) return;
      // Az „ismeretlen” 0-ja nem nulla, hanem „nem tudom” — a szám helyett a jel áll.
      if (forras.osszPontForras === 'ismeretlen') elem.textContent = '🌿🌟 ';
      else elem.append(' ');
      const jelElem = document.createElement('span');
      jelElem.className = 'pakli-kartya__forras pakli-kartya__forras--' + forras.osszPontForras;
      jelElem.textContent = jel.jel;
      elem.appendChild(jelElem);
      const felirat = elem.getAttribute('aria-label') + ' — ' + jel.magyarazat;
      elem.setAttribute('aria-label', felirat);
      elem.title = felirat;
    });
  }

  // ===================================
  // AZ ÁLLAPOT-SOR ÉS A „TOVÁBBI KÁRTYÁK”
  // ===================================

  _allapotSor() {
    if (this.rendezesMod !== 'hierarchikus') {
      if (!this.utolsoLapos) return;
      let szoveg = this.lapositottLista.length + ' / ' + this.utolsoLapos.osszes + ' kártya';
      // ⭐ Amit a lapozás kezdete óta kaptunk, azt megmondjuk — nem keverjük bele némán.
      if (this.utolsoLapos.ujdonsag) szoveg += ' · ⚠️ ' + this.utolsoLapos.ujEsemenyek + ' új esemény érkezett a lapozás kezdete óta';
      // ⭐ D101: a lista határa (M2) és az ág-szűrés tudás-határa — a program mondja ki, a lap csak kiírja.
      if (this.utolsoLapos.koinoMegjegyzes) szoveg += ' · ' + this.utolsoLapos.koinoMegjegyzes;
      this._allapot(szoveg);
      return;
    }
    const v = this._varakozas();
    const f = this.feljegyzesek.get(this.megjelenitettKulcs ?? '') ?? v.feljegyzes;
    let szoveg = this.megjelenitettKulcs && f
      ? f.pakli + ' kártya a láncban · ' + f.testverek + ' testvér'
      : 'Ebben a koinóban még nem ismerek gondolatot';
    if (v.fajta === 'kert') szoveg += ' · a keresett gondolat még nincs meg nálam';
    // ⭐ Ha van kitől kérni, az őrjárat elhozza; ha nincs (se társ, se ismert tartó), a kérelem csak a címjegyzékben
    // kopogtat — ezt mondjuk ki, nem egy soha meg nem érkező „betöltést”.
    if (v.feljegyzes?.betoltes) {
      szoveg += v.feljegyzes.kitolKerni > 0 ? ' · ⏳ betöltés: a hiányzó részeket az őrjárat hozza el'
        : ' · 🔎 a hiányzó részek tartóit még keresem (nincs ismert társ, aki tartaná őket)';
    }
    this._allapot(szoveg, v.feljegyzes?.betoltes ? 'betoltes' : '');
  }

  _tovabbGombFrissitese() {
    if (!this.elemek.tovabbGomb) return;
    this.elemek.tovabbGomb.hidden = !(this.rendezesMod !== 'hierarchikus' && this.utolsoLapos?.kovetkezoKurzor);
  }

  _allapot(szoveg, osztaly = '') {
    if (!this.elemek.allapotElem) return;
    this.elemek.allapotElem.textContent = szoveg;
    this.elemek.allapotElem.className = 'allapot ' + osztaly;
  }
}

export default KoinoPakli;
