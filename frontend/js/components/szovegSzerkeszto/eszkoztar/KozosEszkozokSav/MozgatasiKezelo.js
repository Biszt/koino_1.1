// frontend/js/components/szovegSzerkeszto/eszkoztar/KozosEszkozokSav/MozgatasiKezelo.js

// =============================================
// MOZGATÁSI KEZELŐ
// Felelősség:
// - Az aktív blokk sorrendben való mozgatása (fel/le)
// - BlokkLista tömb átrendezése
// - DOM újrarenderelése mozgatás után
// - Snapshot mentés indítása (struktúraváltás)
// =============================================

class MozgatasiKezelo {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {Object} opciak - Függőségek kívülről
  // @param {Function} opciak.getBlokkLista      - Az aktív BlokkLista lekérése
  // @param {Function} opciak.getTerületElem     - A szerkesztő DOM területének lekérése
  // @param {Function} opciak.getTortenetKezelo  - A TortenetKezelo példány lekérése
  // @param {Function} opciak.blokkRenderelese   - Egy blokk DOM-ba rajzolása (SzovegSzerkeszto-ból)
  // @param {Function} opciak.onValtozas         - Callback: változás jelzése a külvilágnak
  // @param {Function} opciak.onAllapotValtozas  - Callback: eszköztár frissítéséhez
  constructor(opciak = {}) {
    console.log('MozgatasiKezelo.constructor - KEZDÉS', { opciak });

    // Getter függvények — a SzovegSzerkeszto konstruktorának sorrendje miatt
    // ezek az objektumok a MozgatasiKezelo példányosításakor még nem feltétlenül léteznek
    this._getBlokkLista     = opciak.getBlokkLista     || (() => null);
    this._getTerületElem    = opciak.getTerületElem    || (() => null);
    this._getTortenetKezelo = opciak.getTortenetKezelo || (() => null);

    // A blokk DOM-ba rajzolását a SzovegSzerkeszto végzi,
    // mert ő ismeri az összes blokktípus-osztályt (SzovegBlokk, KepBlokk stb.)
    this._blokkRenderelese  = opciak.blokkRenderelese  || (() => {});

    // Változás jelzése a mentési logika felé (pl. valtozasKezelo callback)
    this._onValtozas        = opciak.onValtozas        || (() => {});

    // Eszköztár frissítés (gombok aktív/inaktív állapota mozgatás után)
    this._onAllapotValtozas = opciak.onAllapotValtozas || (() => {});

    console.log('MozgatasiKezelo.constructor - VÉGE');
  }

  // =============================================
  // PUBLIKUS - AKTÍV BLOKK MOZGATÁSA
  // =============================================
  // Felcseréli az aktív blokkot a szomszédjával a BlokkLista tömbben,
  // majd újrarendereli az összes blokkot az új sorrendben.
  // @param {string} irany - 'fel' vagy 'le'
  blokkMozgatasa(irany) {
    console.log('MozgatasiKezelo.blokkMozgatasa - KEZDÉS', { irany });

    const blokkLista = this._getBlokkLista();
    const terület    = this._getTerületElem();

    // Ha nincs aktív blokk, nincs mit mozgatni
    const aktivBlokk = blokkLista?.getAktiv();
    if (!aktivBlokk) {
      console.log('MozgatasiKezelo.blokkMozgatasa - VÉGE (nincs aktív blokk)');
      return;
    }

    const index    = blokkLista.getIndex(aktivBlokk.id);
    const blokkok  = blokkLista.blokkok;

    // Határellenőrzés: nem lehet feljebb menni az első blokktól,
    // és nem lehet lejjebb menni az utolsó blokktól
    if (irany === 'fel' && index === 0) {
      console.log('MozgatasiKezelo.blokkMozgatasa - VÉGE (már az első helyen van)');
      return;
    }
    if (irany === 'le' && index === blokkok.length - 1) {
      console.log('MozgatasiKezelo.blokkMozgatasa - VÉGE (már az utolsó helyen van)');
      return;
    }

    // Cél index kiszámítása, majd a két blokk felcserélése a tömbben
    const celIndex = irany === 'fel' ? index - 1 : index + 1;
    [blokkok[index], blokkok[celIndex]] = [blokkok[celIndex], blokkok[index]];

    // A terület teljes újrarenderelése az új sorrend alapján
    // (egyszerűbb és megbízhatóbb, mint a DOM elemeket mozgatni)
    terület.innerHTML = '';
    blokkok.forEach(blokk => this._blokkRenderelese(blokk));

    // Eszköztár frissítése (fel/le gombok aktív állapota változhat)
    this._onAllapotValtozas();

    // Struktúraváltás — azonnali snapshot mentés
    this._getTortenetKezelo()?.mentes();

    // Változás jelzése a külvilág felé (pl. autómentés)
    this._onValtozas();

    console.log('MozgatasiKezelo.blokkMozgatasa - VÉGE', { irany, ujIndex: celIndex });
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default MozgatasiKezelo;