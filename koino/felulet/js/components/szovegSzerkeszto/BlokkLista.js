// frontend/js/components/szovegSzerkeszto/BlokkLista.js

// =============================================
// BLOKKLISTA - Blokkok tömbének kezelése
// Felelősség:
// - Blokkok tárolása (belső tömb)
// - Hozzáadás, törlés, lekérés
// - Egyedi ID generálás
// - Aktív blokk nyilvántartása
// =============================================

class BlokkLista {

  // =============================================
  // KONSTRUKTOR
  // =============================================
  constructor() {
    console.log('BlokkLista.constructor - KEZDÉS');

    // A blokkok belső tömbje
    this.blokkok = [];

    // Az éppen fókuszban lévő blokk ID-ja
    this.aktivBlokkId = null;

    console.log('BlokkLista.constructor - VÉGE');
  }

  // =============================================
  // BLOKK HOZZÁADÁSA
  // =============================================
  // Új blokkot ad a listához
  // @param {string} tipus - A blokk típusa: 'szoveg' | 'kep' | 'fajl' | 'link' | 'entitasHivatkozas'
  // @param {Object} adatok - Típusfüggő adatok (url, nev, stb.)
  // @returns {Object} Az új blokk objektum
  hozzaadas(tipus, adatok = {}) {
    console.log('BlokkLista.hozzaadas - KEZDÉS', { tipus, adatok });

    // Egyedi ID generálása
    const id = this._idGeneralas();

    // Blokk objektum összeállítása
    const ujBlokk = {
      id,
      tipus,
      tartalom: adatok.tartalom || '',
      ...adatok // Típusfüggő extra mezők (url, nev, alt, stb.)
    };

    this.blokkok.push(ujBlokk);

    console.log('BlokkLista.hozzaadas - VÉGE', { ujBlokk });
    return ujBlokk;
  }

  // =============================================
  // BLOKK TÖRLÉSE
  // =============================================
  // Eltávolít egy blokkot a listából ID alapján
  // @param {string} blokkId - A törlendő blokk ID-ja
  // @returns {boolean} Sikeres volt-e a törlés
  torles(blokkId) {
    console.log('BlokkLista.torles - KEZDÉS', { blokkId });

    const előtteMeret = this.blokkok.length;
    this.blokkok = this.blokkok.filter(b => b.id !== blokkId);
    const sikeres = this.blokkok.length < előtteMeret;

    // Ha az aktív blokkot töröltük, töröljük az aktív ID-t is
    if (this.aktivBlokkId === blokkId) {
      this.aktivBlokkId = null;
    }

    console.log('BlokkLista.torles - VÉGE', { sikeres, maradtBlokkok: this.blokkok.length });
    return sikeres;
  }

  // =============================================
  // BLOKK LEKÉRÉSE ID ALAPJÁN
  // =============================================
  // @param {string} blokkId - A keresett blokk ID-ja
  // @returns {Object|null} A blokk objektum, vagy null ha nem található
  getById(blokkId) {
    return this.blokkok.find(b => b.id === blokkId) || null;
  }

  // =============================================
  // BLOKK INDEXÉNEK LEKÉRÉSE
  // =============================================
  // @param {string} blokkId - A keresett blokk ID-ja
  // @returns {number} A blokk indexe, vagy -1 ha nem található
  getIndex(blokkId) {
    return this.blokkok.findIndex(b => b.id === blokkId);
  }

  // =============================================
  // ELŐZŐ BLOKK LEKÉRÉSE
  // =============================================
  // Visszaadja a megadott blokk előtt lévő blokkot
  // @param {string} blokkId - A referencia blokk ID-ja
  // @returns {Object|null} Az előző blokk, vagy null ha nincs
  getElőző(blokkId) {
    const index = this.getIndex(blokkId);
    if (index <= 0) return null;
    return this.blokkok[index - 1];
  }

  // =============================================
  // BLOKK FRISSÍTÉSE
  // =============================================
  // Egy meglévő blokk adatait frissíti
  // @param {string} blokkId - A frissítendő blokk ID-ja
  // @param {Object} ujAdatok - A frissítendő mezők
  // @returns {Object|null} A frissített blokk, vagy null ha nem található
  frissites(blokkId, ujAdatok) {
    console.log('BlokkLista.frissites - KEZDÉS', { blokkId, ujAdatok });

    const blokk = this.getById(blokkId);
    if (!blokk) {
      console.warn('BlokkLista.frissites - Blokk nem található:', blokkId);
      return null;
    }

    Object.assign(blokk, ujAdatok);

    console.log('BlokkLista.frissites - VÉGE', { blokk });
    return blokk;
  }

  // =============================================
  // ÖSSZES BLOKK LEKÉRÉSE
  // =============================================
  // @returns {Array} A blokkok tömbje
  getOsszes() {
    return this.blokkok;
  }

  // =============================================
  // BLOKKOK SZÁMA
  // =============================================
  // @returns {number} A blokkok száma
  getSzam() {
    return this.blokkok.length;
  }

  // =============================================
  // LISTA ÜRÍTÉSE
  // =============================================
  // Törli az összes blokkot
  urites() {
    console.log('BlokkLista.urites - KEZDÉS');
    this.blokkok = [];
    this.aktivBlokkId = null;
    console.log('BlokkLista.urites - VÉGE');
  }

  // =============================================
  // AKTÍV BLOKK BEÁLLÍTÁSA
  // =============================================
  // @param {string|null} blokkId - Az aktívvá teendő blokk ID-ja
  setAktiv(blokkId) {
    this.aktivBlokkId = blokkId;
  }

  // =============================================
  // AKTÍV BLOKK LEKÉRÉSE
  // =============================================
  // @returns {Object|null} Az aktív blokk objektum, vagy null
  getAktiv() {
    if (!this.aktivBlokkId) return null;
    return this.getById(this.aktivBlokkId);
  }

  // =============================================
  // GONDOLAT EXPORTÁLÁSA MENTÉSHEZ
  // =============================================
  // Visszaadja a blokkok szűrt, mentésre kész tömbjét
  // Az üres szöveges blokkokat kiszűri
  // @returns {Array} A mentésre kész blokkok tömbje
  exportalas() {
    console.log('BlokkLista.exportalas - KEZDÉS');

    const szurtBlokkok = this.blokkok.filter(blokk => {
      if (blokk.tipus === 'szoveg') {
        // Üres szöveges blokkokat kiszűrjük
        const tisztaSzoveg = blokk.tartalom.replace(/<[^>]*>/g, '').trim();
        return tisztaSzoveg.length > 0;
      }
      // Nem szöveges blokkokat mindig megtartjuk
      return true;
    });

    console.log('BlokkLista.exportalas - VÉGE', { blokkok: szurtBlokkok });
    return szurtBlokkok;
  }

  // =============================================
  // PRIVÁT - ID GENERÁLÁS
  // =============================================
  // Egyedi blokk ID-t generál
  // @returns {string} Egyedi ID string
  _idGeneralas() {
    return 'blokk-' + Date.now() + '-' + Math.round(Math.random() * 10000);
  }

}

// =============================================
// EXPORTÁLÁS
// =============================================
// Globálisan elérhetővé tesszük
export default BlokkLista;