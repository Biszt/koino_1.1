// frontend/js/components/szovegSzerkeszto/FeltoltesKezelo.js

import { kepFeltoltes, fajlFeltoltes } from '../../utils/apiHelper.js';

// =============================================
// FELTÖLTÉS KEZELŐ
// Felelősség:
// - Képfeltöltés fájlválasztóval
// - Képfeltöltés vágólapról (paste)
// - Fájlfeltöltés fájlválasztóval
// - Folyamatjelző megjelenítése/eltávolítása
// - Mobilos paste fallback kezelése
// =============================================

class FeltoltesKezelo {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  // @param {HTMLElement} teruletElem - A szerkesztő blokk területe
  //                                    (a folyamatjelző ide kerül)
  // @param {Object} callbacks - Esemény visszahívók
  // @param {Function} callbacks.onKepKesz  - Kép feltöltve (url, alt)
  // @param {Function} callbacks.onFajlKesz - Fájl feltöltve (url, nev)
  // @param {Function} callbacks.onHiba     - Feltöltési hiba esetén (uzenet)
  constructor(teruletElem, callbacks = {}) {
  console.log('FeltoltesKezelo.constructor - KEZDÉS');

  this.teruletElem = teruletElem;
  this.onKepKesz  = callbacks.onKepKesz  || null;
  this.onFajlKesz = callbacks.onFajlKesz || null;
  this.onHiba     = callbacks.onHiba     || null;

  // Token eltárolása – az API hívásokhoz szükséges azonosítás
  this.token = callbacks.token || null;

  // HALASZTOTT FELTÖLTÉS tárolója.
  // Kulcs: a helyi előnézeti 'blob:'-URL; érték: { fajl, tipus }.
  // A képet/fájlt NEM töltjük fel azonnal a szerverre – csak a gondolat
  // MENTÉSEKOR (lásd SzovegSzerkeszto.fuggoFeltoltesekVeglegesitese).
  this.fuggoFeltoltesek = new Map();

  this._pasteEsemenyBekotese();

  console.log('FeltoltesKezelo.constructor - VÉGE');
}

  // =============================================
  // KÉPFELTÖLTÉS - FÁJLVÁLASZTÓVAL
  // =============================================
  // Megnyit egy fájlválasztó dialógot, majd feltölti a képet
  // Mobilon a natív fájlválasztó megnyílik (galériából is választható)
  kepFeltoltesInditas() {
    console.log('FeltoltesKezelo.kepFeltoltesInditas - KEZDÉS');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';         // Csak képfájlok
    input.capture = 'environment';    // Mobilon kamera is felajánlható
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const fajl = e.target.files[0];
      document.body.removeChild(input); // Azonnal eltávolítjuk
      if (!fajl) return;

      await this._kepFajlFeltoltese(fajl);
    });

    // Fájlválasztó megnyitása
    input.click();

    console.log('FeltoltesKezelo.kepFeltoltesInditas - VÉGE');
  }

  // =============================================
  // FÁJLFELTÖLTÉS - FÁJLVÁLASZTÓVAL
  // =============================================
  // Megnyit egy fájlválasztó dialógot, majd feltölti a fájlt
  // Mobilon a natív fájlválasztó megnyílik
  fajlFeltoltesInditas() {
    console.log('FeltoltesKezelo.fajlFeltoltesInditas - KEZDÉS');

    const input = document.createElement('input');
    input.type = 'file';
    // Minden fájltípus engedélyezett
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const fajl = e.target.files[0];
      document.body.removeChild(input);
      if (!fajl) return;

      await this._fajlFeltoltese(fajl);
    });

    input.click();

    console.log('FeltoltesKezelo.fajlFeltoltesInditas - VÉGE');
  }

  // =============================================
  // PRIVÁT - PASTE ESEMÉNY BEKÖTÉSE
  // =============================================
  // Figyeli a vágólapról való beillesztést a területen
  // Asztali gépen: Ctrl+V / Cmd+V
  // Mobilon: hosszú koppintás → Beillesztés (iOS/Android)
  _pasteEsemenyBekotese() {
    console.log('FeltoltesKezelo._pasteEsemenyBekotese - KEZDÉS');

    this.teruletElem.addEventListener('paste', async (e) => {
      // Vágólap elemek vizsgálata
      const elemek = Array.from(e.clipboardData?.items || []);
      const kepElem = elemek.find(item => item.type.startsWith('image/'));

      if (!kepElem) {
        // Nincs kép a vágólapon - normál szöveg beillesztés folytatódik
        return;
      }

      // Van kép: megakadályozzuk az alapértelmezett beillesztést
      e.preventDefault();

      const fajl = kepElem.getAsFile();
      if (!fajl) return;

      await this._kepFajlFeltoltese(fajl, 'beillesztett-kep');
    });

    // =============================================
    // MOBILOS FALLBACK
    // =============================================
    // iOS Safari és régebbi Android böngészők nem támogatják
    // a képek vágólapról való beillesztését paste eseménnyel.
    // Ezért ha mobilon vagyunk, a kép gomb mindig fájlválasztóval
    // dolgozik (kepFeltoltesInditas) - ez a biztonságos megoldás.
    // A paste esemény megmarad asztali gépeken, ahol működik.
    const isMobil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobil) {
      console.log('FeltoltesKezelo - Mobil eszköz: paste fallback aktív, fájlválasztó használandó');
    }

    console.log('FeltoltesKezelo._pasteEsemenyBekotese - VÉGE');
  }

  // =============================================
  // PRIVÁT - KÉP FÁJL FELTÖLTÉSE
  // =============================================
  // A tényleges feltöltési logika (fájlválasztó és paste is ide fut)
  // @param {File} fajl - A feltöltendő fájl objektum
  // @param {string} alt - Alternatív szöveg (opcionális)
  async _kepFajlFeltoltese(fajl, alt = '') {
    console.log('FeltoltesKezelo._kepFajlFeltoltese - KEZDÉS', {
      nev: fajl.name,
      meret: fajl.size,
      tipus: fajl.type
    });

    // Méretellenőrzés (max 10MB)
    const maxMeret = 10 * 1024 * 1024; // 10MB byte-ban
    if (fajl.size > maxMeret) {
      const uzenet = 'A kép mérete nem lehet nagyobb 10MB-nál.';
      if (this.onHiba) this.onHiba(uzenet);
      console.warn('FeltoltesKezelo._kepFajlFeltoltese - Túl nagy fájl:', fajl.size);
      return;
    }

    // HALASZTOTT FELTÖLTÉS:
    // NEM töltjük fel most a szerverre. A fájlt helyben tartjuk, és egy
    // 'blob:' object URL-t adunk a blokknak, amivel a böngésző azonnal meg
    // tudja jeleníteni az előnézetet. A tényleges feltöltés csak a gondolat
    // mentésekor történik (SzovegSzerkeszto.fuggoFeltoltesekVeglegesitese).
    const objectUrl = URL.createObjectURL(fajl);
    this.fuggoFeltoltesek.set(objectUrl, { fajl, tipus: 'kep' });

    // Callback hívása a szülő felé – a blokk ezt a 'blob:'-URL-t tárolja
    if (this.onKepKesz) {
      this.onKepKesz(objectUrl, alt || fajl.name);
    }

    console.log('FeltoltesKezelo._kepFajlFeltoltese - VÉGE', { objectUrl });
  }

  // =============================================
  // PRIVÁT - FÁJL FELTÖLTÉSE
  // =============================================
  // @param {File} fajl - A feltöltendő fájl objektum
  async _fajlFeltoltese(fajl) {
    console.log('FeltoltesKezelo._fajlFeltoltese - KEZDÉS', {
      nev: fajl.name,
      meret: fajl.size,
      tipus: fajl.type
    });

    // Méretellenőrzés (max 50MB)
    const maxMeret = 50 * 1024 * 1024; // 50MB byte-ban
    if (fajl.size > maxMeret) {
      const uzenet = 'A fájl mérete nem lehet nagyobb 50MB-nál.';
      if (this.onHiba) this.onHiba(uzenet);
      console.warn('FeltoltesKezelo._fajlFeltoltese - Túl nagy fájl:', fajl.size);
      return;
    }

    // HALASZTOTT FELTÖLTÉS (mint a képnél): a fájlt helyben tartjuk, és egy
    // 'blob:' object URL-t adunk a blokknak. A tényleges feltöltés csak a
    // gondolat mentésekor történik.
    const objectUrl = URL.createObjectURL(fajl);
    this.fuggoFeltoltesek.set(objectUrl, { fajl, tipus: 'fajl' });

    // Callback hívása – a blokk a 'blob:'-URL-t és a fájlnevet tárolja
    if (this.onFajlKesz) {
      this.onFajlKesz(objectUrl, fajl.name);
    }

    console.log('FeltoltesKezelo._fajlFeltoltese - VÉGE', { objectUrl });
  }

  // =============================================
  // FÜGGŐ FELTÖLTÉS VÉGLEGESÍTÉSE (EGY DARAB)
  // =============================================
  // A megadott 'blob:'-URL-hez tartozó, helyben tárolt fájlt MOST tölti fel
  // a szerverre (a megfelelő végpontra a típus szerint), és visszaadja a
  // szerver válaszát ({ url, nev? }). Ha nincs ilyen függő feltöltés, null.
  // Hívja: SzovegSzerkeszto.fuggoFeltoltesekVeglegesitese (mentéskor).
  // @param {string} objectUrl - a helyi 'blob:'-URL
  // @param {string} token - JWT az API-feltöltéshez
  // @returns {Promise<{url: string, nev?: string}|null>}
  async fuggoFeltoltese(objectUrl, token) {
    console.log('FeltoltesKezelo.fuggoFeltoltese - KEZDÉS', { objectUrl });

    const bejegyzes = this.fuggoFeltoltesek.get(objectUrl);
    if (!bejegyzes) {
      console.warn('FeltoltesKezelo.fuggoFeltoltese - nincs ilyen függő feltöltés', { objectUrl });
      return null;
    }

    const eredmeny = bejegyzes.tipus === 'kep'
      ? await kepFeltoltes(bejegyzes.fajl, token)
      : await fajlFeltoltes(bejegyzes.fajl, token);

    console.log('FeltoltesKezelo.fuggoFeltoltese - VÉGE', { url: eredmeny?.url });
    return eredmeny;
  }

  // =============================================
  // EGY FÜGGŐ BLOB ELDOBÁSA
  // =============================================
  // Felszabadítja a 'blob:'-URL-t (memória) és kiveszi a nyilvántartásból.
  // Sikeres feltöltés után hívjuk, amikor már a valódi URL-t használjuk.
  // @param {string} objectUrl - a felszabadítandó 'blob:'-URL
  torolFuggo(objectUrl) {
    if (this.fuggoFeltoltesek.has(objectUrl)) {
      URL.revokeObjectURL(objectUrl);
      this.fuggoFeltoltesek.delete(objectUrl);
      console.log('FeltoltesKezelo.torolFuggo - felszabadítva', { objectUrl });
    }
  }

  // =============================================
  // MINDEN FÜGGŐ BLOB ELDOBÁSA
  // =============================================
  // A szerkesztő bezárásakor (destroy) hívjuk: felszabadítja az összes még
  // fel nem töltött blobot, hogy ne szivárogjon a böngésző memóriája, ha az
  // e-ember mentés nélkül zárja be a szerkesztőt.
  torolMindenFuggo() {
    console.log('FeltoltesKezelo.torolMindenFuggo - KEZDÉS', { db: this.fuggoFeltoltesek.size });
    for (const objectUrl of this.fuggoFeltoltesek.keys()) {
      URL.revokeObjectURL(objectUrl);
    }
    this.fuggoFeltoltesek.clear();
    console.log('FeltoltesKezelo.torolMindenFuggo - VÉGE');
  }

  // =============================================
  // PRIVÁT - FOLYAMATJELZŐ LÉTREHOZÁSA
  // =============================================
  // Megjelenít egy feltöltési animációt a területen
  // @param {string} uzenet - A megjelenítendő szöveg
  // @returns {string} Az ideiglenes elem azonosítója
  _folyamatJelzoLetrehozasa(uzenet) {
    const id = 'folyamat-' + Date.now();

    const elem = document.createElement('div');
    elem.className = 'feltoltes-folyamat';
    elem.dataset.folyamatId = id;

    const szovegElem = document.createElement('span');
    szovegElem.className = 'feltoltes-folyamat__szoveg';
    szovegElem.textContent = uzenet;

    const spinner = document.createElement('div');
    spinner.className = 'feltoltes-folyamat__spinner';

    elem.appendChild(szovegElem);
    elem.appendChild(spinner);
    this.teruletElem.appendChild(elem);

    return id;
  }

  // =============================================
  // PRIVÁT - FOLYAMATJELZŐ TÖRLÉSE
  // =============================================
  // @param {string} id - A _folyamatJelzoLetrehozasa által visszaadott ID
  _folyamatJelzoTorlese(id) {
    const elem = this.teruletElem.querySelector(`[data-folyamat-id="${id}"]`);
    if (elem) elem.remove();
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default FeltoltesKezelo;