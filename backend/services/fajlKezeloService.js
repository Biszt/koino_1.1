// backend/services/fajlKezeloService.js

// ===================================
// FÁJL-KEZELŐ SZOLGÁLTATÁS
// ===================================
// Felelősség: az uploads/ mappába feltöltött fájlok (ikonok, szöveg-blokk
//   képek és csatolmányok) LEMEZRŐL való biztonságos törlése, hogy egy
//   entitás megszűnésekor (törlés) vagy fájl-cserekor ne maradjanak árva
//   fájlok a lemezen.
// Használják: a törlési lánc (tudatpontService) és a módosítási pontok
//   (kategória/típus ikon-csere, gondolat szöveg-frissítés).
//
// FONTOS: ez a szolgáltatás önmagában csak eszközöket ad. A tényleges
//   bekötés (mikor, honnan hívjuk) a hívó rétegek feladata.

const fs = require('fs');
const path = require('path');

// ===================================
// KONSTANSOK
// ===================================

// Az uploads mappa abszolút gyökere.
// Ez a fájl: backend/services/fajlKezeloService.js → a gyökér: backend/uploads
const UPLOADS_GYOKER = path.resolve(__dirname, '..', 'uploads');

// Minden feltöltött fájl URL-je ezzel kezdődik (lásd feltoltesController).
// Pl. '/uploads/kepek/kep-...png', '/uploads/icons/ikon-...png'
const UPLOADS_URL_PREFIX = '/uploads/';

// ===================================
// FÁJL-KEZELŐ OSZTÁLY
// ===================================
class FajlKezeloService {

  // ===================================
  // ENTITÁSBÓL FÁJL-URL-EK KIGYŰJTÉSE
  // ===================================
  // Egy entitásból összeszedi az összes hozzá tartozó /uploads/... URL-t.
  //  - Kategória / Gondolattípus: az 'ikon' mező.
  //  - Gondolat: a 'szoveg' mező (Mixed) rekurzív bejárása — a szöveg lehet
  //    sík blokk-tömb VAGY oldalakra bontott objektum, ezt a bejárás lefedi.
  // @param {Object} entitas - a (még nem törölt) entitás dokumentum
  // @param {string} entitasTipus - 'Gondolat' | 'Kategoria' | 'GondolatTipus' | ...
  // @returns {string[]} az egyedi /uploads/... URL-ek tömbje
  entitasbolFajlUrlek(entitas, entitasTipus) {
    console.log('fajlKezeloService.entitasbolFajlUrlek - KEZDÉS', { entitasTipus });

    const urlek = new Set();

    if (!entitas) {
      console.log('fajlKezeloService.entitasbolFajlUrlek - VÉGE (nincs entitás)', { db: 0 });
      return [];
    }

    if (entitasTipus === 'Kategoria' || entitasTipus === 'GondolatTipus') {
      // Ezeknek egyetlen fájl-mezőjük van: az ikon
      if (typeof entitas.ikon === 'string' && entitas.ikon.startsWith(UPLOADS_URL_PREFIX)) {
        urlek.add(entitas.ikon);
      }
    } else if (entitasTipus === 'Gondolat') {
      // A szöveg tetszőleges mélységű JSON — rekurzív bejárás gyűjti az URL-eket
      this._urlekGyujtese(entitas.szoveg, urlek);
    }
    // Javaslat / Egyezmény: ezekhez jelenleg nem tartozik feltöltött fájl,
    // ezért nem gyűjtünk belőlük (ha később lesz, itt bővíthető).

    const eredmeny = [...urlek];
    console.log('fajlKezeloService.entitasbolFajlUrlek - VÉGE', { db: eredmeny.length, urlek: eredmeny });
    return eredmeny;
  }

  // ===================================
  // PRIVÁT - REKURZÍV URL-GYŰJTÉS
  // ===================================
  // Bármilyen JSON-értéket bejár (string / tömb / objektum), és minden
  // '/uploads/'-szal kezdődő stringet felvesz a halmazba.
  // Így NEM kell ismernünk a szöveg-blokkok pontos szerkezetét, és a külső
  // (http...) link-URL-eket sem szedjük be véletlenül.
  // @param {*} ertek - a bejárandó érték
  // @param {Set<string>} urlek - a gyűjtő halmaz (helyben bővül)
  _urlekGyujtese(ertek, urlek) {
    if (ertek === null || ertek === undefined) {
      return;
    }
    if (typeof ertek === 'string') {
      if (ertek.startsWith(UPLOADS_URL_PREFIX)) {
        urlek.add(ertek);
      }
      return;
    }
    if (Array.isArray(ertek)) {
      ertek.forEach(elem => this._urlekGyujtese(elem, urlek));
      return;
    }
    if (typeof ertek === 'object') {
      Object.values(ertek).forEach(ertek => this._urlekGyujtese(ertek, urlek));
      return;
    }
    // szám / boolean: nincs benne URL, kihagyjuk
  }

  // ===================================
  // PRIVÁT - URL → BIZTONSÁGOS LEMEZ-ÚTVONAL
  // ===================================
  // Egy /uploads/... URL-t leképez a lemezes abszolút útvonalra.
  // BIZTONSÁG: path traversal ellen ellenőrizzük, hogy a feloldott útvonal
  // tényleg az uploads gyökéren belül van-e — így egy manipulált URL
  // (pl. '/uploads/../server.js') nem törölhet mást.
  // @param {string} url - pl. '/uploads/kepek/kep-...png'
  // @returns {string|null} abszolút lemez-útvonal, vagy null ha érvénytelen
  _urlBolUtvonal(url) {
    if (typeof url !== 'string' || !url.startsWith(UPLOADS_URL_PREFIX)) {
      return null;
    }

    // A prefix levágása után marad pl. 'kepek/kep-...png'
    const relativResz = url.slice(UPLOADS_URL_PREFIX.length);
    const abszolut = path.resolve(UPLOADS_GYOKER, relativResz);

    // Csak az uploads gyökéren belül engedünk törölni
    const gyokeronBelul =
      abszolut === UPLOADS_GYOKER || abszolut.startsWith(UPLOADS_GYOKER + path.sep);

    if (!gyokeronBelul) {
      console.warn('fajlKezeloService._urlBolUtvonal - GYANÚS útvonal, kihagyva', { url, abszolut });
      return null;
    }

    return abszolut;
  }

  // ===================================
  // FÁJLOK TÖRLÉSE URL-LISTA ALAPJÁN
  // ===================================
  // A megadott URL-ekhez tartozó fájlokat törli a lemezről.
  //  - Már hiányzó fájl (ENOENT): csendben átlépjük, nem hiba.
  //  - Egyéb hiba: naplózzuk, de a többi fájl törlését folytatjuk.
  // @param {string[]} urlek - törlendő /uploads/... URL-ek
  // @returns {Promise<{torolt: string[], hianyzo: string[], hiba: Array}>}
  async fajlokTorlese(urlek) {
    console.log('fajlKezeloService.fajlokTorlese - KEZDÉS', { db: Array.isArray(urlek) ? urlek.length : 0 });

    const eredmeny = { torolt: [], hianyzo: [], hiba: [] };

    if (!Array.isArray(urlek) || urlek.length === 0) {
      console.log('fajlKezeloService.fajlokTorlese - VÉGE (nincs törlendő)', eredmeny);
      return eredmeny;
    }

    for (const url of urlek) {
      const utvonal = this._urlBolUtvonal(url);

      if (!utvonal) {
        eredmeny.hiba.push({ url, ok: 'érvénytelen vagy gyanús útvonal' });
        continue;
      }

      try {
        await fs.promises.unlink(utvonal);
        eredmeny.torolt.push(url);
        console.log('fajlKezeloService.fajlokTorlese - fájl törölve', { url });
      } catch (hiba) {
        if (hiba.code === 'ENOENT') {
          // A fájl már nincs meg — ez rendben van (pl. korábban törölték)
          eredmeny.hianyzo.push(url);
          console.log('fajlKezeloService.fajlokTorlese - fájl már hiányzik, átlépve', { url });
        } else {
          eredmeny.hiba.push({ url, ok: hiba.message });
          console.warn('fajlKezeloService.fajlokTorlese - törlési hiba', { url, hiba: hiba.message });
        }
      }
    }

    console.log('fajlKezeloService.fajlokTorlese - VÉGE', {
      torolt: eredmeny.torolt.length,
      hianyzo: eredmeny.hianyzo.length,
      hiba: eredmeny.hiba.length
    });
    return eredmeny;
  }

  // ===================================
  // ENTITÁS FÁJLJAINAK TÖRLÉSE (KÉNYELMI)
  // ===================================
  // Egy lépésben: kigyűjti az entitás fájljait, majd letörli őket.
  // @param {Object} entitas - a (még kiolvasott) entitás dokumentum
  // @param {string} entitasTipus - az entitás típusa
  // @returns {Promise<{torolt, hianyzo, hiba}>}
  async entitasFajljainakTorlese(entitas, entitasTipus) {
    console.log('fajlKezeloService.entitasFajljainakTorlese - KEZDÉS', { entitasTipus });

    const urlek = this.entitasbolFajlUrlek(entitas, entitasTipus);
    const eredmeny = await this.fajlokTorlese(urlek);

    console.log('fajlKezeloService.entitasFajljainakTorlese - VÉGE', {
      torolt: eredmeny.torolt.length,
      hianyzo: eredmeny.hianyzo.length,
      hiba: eredmeny.hiba.length
    });
    return eredmeny;
  }

  // ===================================
  // ELAVULT (KIESŐ) URL-EK KISZÁMÍTÁSA
  // ===================================
  // Két URL-halmaz különbsége: azok a RÉGI URL-ek, amelyek az ÚJ listában
  // már NEM szerepelnek. Ezek a módosítás során „elárvult" fájlok (pl. egy
  // lecserélt ikon vagy egy törölt kép-blokk fájlja).
  // @param {string[]} regiUrlek - a módosítás ELŐTTI URL-ek
  // @param {string[]} ujUrlek - a módosítás UTÁNI URL-ek
  // @returns {string[]} a kieső (törlendő) URL-ek
  elavultUrlek(regiUrlek, ujUrlek) {
    const ujHalmaz = new Set(ujUrlek || []);
    const kiesok = (regiUrlek || []).filter(url => !ujHalmaz.has(url));
    console.log('fajlKezeloService.elavultUrlek', {
      regi: (regiUrlek || []).length,
      uj: (ujUrlek || []).length,
      kieso: kiesok.length
    });
    return kiesok;
  }

  // ===================================
  // ELAVULT FÁJLOK TÖRLÉSE (KÉNYELMI)
  // ===================================
  // Egy lépésben: kiszámítja a kieső URL-eket, majd letörli a hozzájuk
  // tartozó fájlokat. Módosítási pontokon (ikon-csere, szöveg-frissítés)
  // hívjuk, a régi és az új URL-halmaz alapján.
  // @param {string[]} regiUrlek - a módosítás ELŐTTI URL-ek
  // @param {string[]} ujUrlek - a módosítás UTÁNI URL-ek
  // @returns {Promise<{torolt, hianyzo, hiba}>}
  async elavultFajlokTorlese(regiUrlek, ujUrlek) {
    console.log('fajlKezeloService.elavultFajlokTorlese - KEZDÉS');
    const torlendo = this.elavultUrlek(regiUrlek, ujUrlek);
    const eredmeny = await this.fajlokTorlese(torlendo);
    console.log('fajlKezeloService.elavultFajlokTorlese - VÉGE', {
      torolt: eredmeny.torolt.length,
      hianyzo: eredmeny.hianyzo.length,
      hiba: eredmeny.hiba.length
    });
    return eredmeny;
  }

}

// ===================================
// EXPORTÁLÁS
// ===================================
// Singleton példány (a többi service-hez igazodva)
module.exports = new FajlKezeloService();
