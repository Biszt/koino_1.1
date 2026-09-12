// koino/felulet/js/components/szovegSzerkeszto/FeltoltesKezelo.js

// ⚠️⚠️ EZ AZ EGYETLEN FÁJL, AMIT A SZERKESZTŐ ÁTEMELÉSEKOR ÁT KELLETT ÍRNI (5.7).
//
// A szerkesztő többi **húsz** fájlja bájtra ugyanaz, mint a `frontend/` alatt — pontosan
// úgy, ahogy az 5.3-ban a kártyák. ⭐ Ezért tartja meg ez a lap a prototípus
// `FeltoltesKezelo`-jének **teljes publikus felületét** (`kepFeltoltesInditas`,
// `fajlFeltoltesInditas`, `fuggoFeltoltese`, `torolFuggo`, `torolMindenFuggo`,
// `_kepFajlFeltoltese`): így a `SzovegSzerkeszto.js` egyetlen sorát sem kellett átírni.
//
// ===== ⛔⛔ MIÉRT NEM TÖLT FEL SEMMIT =====
//
// A prototípusban a kép és a fájl egy **szerver-mappába** került (`backend/uploads`), és a
// blokk egy **URL-t** tárolt. A koinóban nincs szerver — és ez nem pótolható egy másik
// szerverrel sem:
//
//   · ⛔ **2. szabály** — semmi ne múljon egyetlen címen vagy szolgáltatáson. Egy „töltsd
//     fel ide" cím pontosan az a fojtópont, amit a koino elkerül.
//   · ⛔ **6. szabály (KEMÉNY)** — az adat-csomag kicsi marad. Egy esemény ma ~400 bájt;
//     egy fénykép ennek több ezerszerese. Képet eseménybe tenni nem opció.
//   · ⏸️ **D3** — a kép a *tartalmi rétegbe* tartozik (tudatpont-replikált, elveszhet), és
//     ennek a rétegnek a **szállítása még nincs megtervezve**. Ez a Szakasz 5 utolsó
//     eldöntetlen kérdése, és **Csaba döntése** (a `szakasz5_terv.md` 7/6. pontja).
//
// ⭐ **Ezért a fájl HONESTEN ELAKAD, nem csendben.** A szerkesztő minden más része
// működik: szöveg, link, entitás-hivatkozás, oldalak, előzmények, méretezés, mozgatás.
// Aki képet próbál beszúrni, **megtudja, miért nem megy** — nem egy néma, üres blokkot kap.
// *(Ugyanaz a minta, mint az 5.3 tizenhárom modal-helyőrzője: a hiány legyen látható és
// megnevezett, D19.)*
//
// ⏸️ **AMI IDE JÖN, HA A D3 ELDŐL:** a legvalószínűbb alak a koino saját mintája — a fájlt
// a **lenyomata** nevezi meg (mint minden mást a koinóban), az esemény csak ezt a ~100
// bájtos hivatkozást hordozza, a bájtok pedig a tartalmi rétegben utaznak. Akkor ez a fájl
// kap egy valódi megvalósítást, és a szerkesztő **továbbra sem változik**.

const NINCS_MEG_UZENET =
  'A koino még nem tud képet és fájlt tárolni. A szerkesztő többi része működik — '
  + 'szöveg, link és entitás-hivatkozás mehet. (A képek helye a P2P koinóban még '
  + 'eldöntetlen kérdés: D3, tartalmi réteg.)';

class FeltoltesKezelo {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} teruletElem - A szerkesztő blokk területe
  // @param {Object} callbacks - { onKepKesz, onFajlKesz, onHiba, token }
  constructor(teruletElem, callbacks = {}) {
    console.log('FeltoltesKezelo.constructor - KEZDÉS');

    this.teruletElem = teruletElem;
    this.onKepKesz = callbacks.onKepKesz || null;
    this.onFajlKesz = callbacks.onFajlKesz || null;
    this.onHiba = callbacks.onHiba || null;
    this.token = callbacks.token || null;

    // ⚠️ A prototípus itt tartja a HALASZTOTT feltöltéseket (blob-URL → fájl). Nálunk
    // mindig üres marad, de a szerkesztő olvassa, ezért léteznie kell.
    this.fuggoFeltoltesek = new Map();

    console.log('FeltoltesKezelo.constructor - VÉGE');
  }

  // =============================================
  // A KÉT INDÍTÓ — amit az eszköztár gombja hív
  // =============================================

  kepFeltoltesInditas() {
    console.log('FeltoltesKezelo.kepFeltoltesInditas - nincs fájl-réteg (D3)');
    this._megmondjuk();
  }

  fajlFeltoltesInditas() {
    console.log('FeltoltesKezelo.fajlFeltoltesInditas - nincs fájl-réteg (D3)');
    this._megmondjuk();
  }

  // A vágólapról beillesztett képernyőkép útja (a szerkesztő közvetlenül hívja).
  async _kepFajlFeltoltese() {
    console.log('FeltoltesKezelo._kepFajlFeltoltese - nincs fájl-réteg (D3)');
    this._megmondjuk();
    return null;
  }

  async _fajlFeltoltese() {
    console.log('FeltoltesKezelo._fajlFeltoltese - nincs fájl-réteg (D3)');
    this._megmondjuk();
    return null;
  }

  // =============================================
  // A HALASZTOTT FELTÖLTÉS — nálunk nincs mit véglegesíteni
  // =============================================
  //
  // ⚠️ A `SzovegSzerkeszto.fuggoFeltoltesekVeglegesitese` menteskor végigmegy a függő
  // feltöltéseken. Nálunk a lista mindig üres, tehát ez a ciklus sosem fut le — de a
  // metódusnak léteznie kell, különben a mentés hibára futna.

  async fuggoFeltoltese() {
    console.log('FeltoltesKezelo.fuggoFeltoltese - nincs függő feltöltés (D3)');
    return null;
  }

  torolFuggo(objectUrl) {
    this.fuggoFeltoltesek.delete(objectUrl);
  }

  torolMindenFuggo() {
    this.fuggoFeltoltesek.clear();
  }

  // =============================================
  // SEGÉD
  // =============================================

  /** ⭐ A LÉNYEG: megmondjuk, miért nem megy — nem hallgatunk (D19). */
  _megmondjuk() {
    if (this.onHiba) this.onHiba(NINCS_MEG_UZENET);
    else console.warn('FeltoltesKezelo - ' + NINCS_MEG_UZENET);
  }
}

export default FeltoltesKezelo;
