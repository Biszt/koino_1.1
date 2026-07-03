// frontend/js/components/szovegSzerkeszto/SzovegSzerkeszto.js

import BlokkLista from './BlokkLista.js';
import Eszkoztar from './eszkoztar/Eszkoztar.js';
import FeltoltesKezelo from './FeltoltesKezelo.js';
import SzovegBlokk from './blokkok/SzovegBlokk.js';
import KepBlokk from './blokkok/KepBlokk.js';
import FajlBlokk from './blokkok/FajlBlokk.js';
import LinkBlokk from './blokkok/LinkBlokk.js';
import EntitasHivatkozasBlokk from './blokkok/EntitasHivatkozasBlokk.js';
import { tokenLekerese } from '../../utils/authHelper.js';
import OldalNavigacio from './OldalNavigacio.js';
import TortenetKezelo from './eszkoztar/KozosEszkozokSav/TortenetKezelo.js';
import MeretezesKezelo from './eszkoztar/KozosEszkozokSav/MeretezesKezelo.js';
import MozgatasiKezelo from './eszkoztar/KozosEszkozokSav/MozgatasiKezelo.js';

// =============================================
// SZÖVEGSZERKESZTŐ - FŐ OSZTÁLY
// Felelősség:
// - Az összes modul példányosítása és összekötése
// - Publikus API biztosítása a modálok felé
// - Link és entitás hivatkozás beillesztési dialógok
// =============================================

class SzovegSzerkeszto {

// =============================================
// KONSTRUKTOR
// =============================================
// @param {HTMLElement} kontener - A szerkesztő befogadó eleme
// @param {Object} opciak - Opcionális beállítások
// @param {Array|Object} opciak.kezdoBlokkok - Előre betöltendő blokkok (szerkesztés módban)
// @param {Function} opciak.valtozasKezelo - Callback minden változáskor
// @param {Function} opciak.onEntitasKivalasztas - Entitás hivatkozásra koppintáskor
constructor(kontener, opciak = {}) {
  console.log('SzovegSzerkeszto.constructor - KEZDÉS', { opciak });

  this.kontener = kontener;
  this.valtozasKezelo = opciak.valtozasKezelo || null;
  this.onEntitasKivalasztas = opciak.onEntitasKivalasztas || null;

  // SzovegBlokk példányok nyilvántartása: { blokkId: SzovegBlokk }
  this.szovegBlokkPeldanyok = {};

  // EntitasHivatkozasBlokk példányok nyilvántartása
  this.entitasBlokkPeldanyok = {};

  // FajlBlokk példányok nyilvántartása
  this.fajlBlokkPeldanyok = {};

  // KepBlokk példányok nyilvántartása: { blokkId: KepBlokk }
  this.kepBlokkPeldanyok = {};

  // OldalNavigacio példány — null, ha nincs navigáció
  this.oldalNavigacio = null;

  // Fülenkénti BlokkLista példányok: { fulId: BlokkLista }
  // Ha nincs navigáció, üres objektum marad, és a this.blokkLista az egyetlen
  this.blokkListak = {};

  // Az éppen aktív fül ID-ja — null, ha nincs navigáció
  this.aktivFulId = null;

  // TortenetKezelo példány — null, amíg a DOM fel nem épül
  this.tortenetKezelo = null;

  // MeretezesKezelo példány — null, amíg a DOM fel nem épül
  this.meretezesKezelo = null;

  // MozgatasiKezelo példány — null, amíg a DOM fel nem épül
  this.mozgatasiKezelo = null;

  // --- MODULOK PÉLDÁNYOSÍTÁSA ---

  // 1. BlokkLista - belső adatkezelés
  this.blokkLista = new BlokkLista();

  // 2. Fő DOM struktúra felépítése
  this._domFelépítése();

  // 3. Eszköztár példányosítása
  this.eszkoztar = new Eszkoztar({

    // --- Típus sáv ---
    onTipusValtas: (ujTipus) => {
      console.log('SzovegSzerkeszto - onTipusValtas', { ujTipus });
      this._aktivBlokkTipusValtas(ujTipus);
    },

    // --- Közös sáv ---
    onVisszavon: () => this._visszavon(),
    onIsmet:     () => this._ismet(),
    onUjBlokk:   () => this._ujSzovegesBlokkHozzaadasa(),
    onTorles:    () => this._aktivBlokkTorlese(),
    // delegálás a MozgatasiKezelo-re
    onFel: () => this.mozgatasiKezelo?.mozgatas('fel'),
    onLe:  () => this.mozgatasiKezelo?.mozgatas('le'),
    // delegálás a MeretezesKezelo-re
    onMeretez: () => {
      console.log('SzovegSzerkeszto - onMeretez');
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk) return;
      this.meretezesKezelo?.modBeAllitasa(aktivBlokk.id);
    },

    // --- Típusfüggő sáv: szöveg ---
    onFelkover: () => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') return;
      this.szovegBlokkPeldanyok[aktivBlokk.id]?.alkalmazFelkover();
      const aktualisFormatas = this.szovegBlokkPeldanyok[aktivBlokk.id]?.getAktualisFormatas() ?? null;
      const kozosAllapot = this._kozosAllapotOsszeallitasa();
      this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, aktualisFormatas);
    },
    onDolt: () => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') return;
      this.szovegBlokkPeldanyok[aktivBlokk.id]?.alkalmazDolt();
      const aktualisFormatas = this.szovegBlokkPeldanyok[aktivBlokk.id]?.getAktualisFormatas() ?? null;
      const kozosAllapot = this._kozosAllapotOsszeallitasa();
      this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, aktualisFormatas);
    },
    onAlahuzas: () => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') return;
      this.szovegBlokkPeldanyok[aktivBlokk.id]?.alkalmazAlahuzas();
      const aktualisFormatas = this.szovegBlokkPeldanyok[aktivBlokk.id]?.getAktualisFormatas() ?? null;
      const kozosAllapot = this._kozosAllapotOsszeallitasa();
      this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, aktualisFormatas);
    },
    onMeret: (meret) => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') return;
      this.szovegBlokkPeldanyok[aktivBlokk.id]?.alkalmazMeret(meret);
      requestAnimationFrame(() => {
        const domElem = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
        if (domElem) domElem.focus();
      });
    },
    onIgazitas: (igazitas) => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') return;
      this.szovegBlokkPeldanyok[aktivBlokk.id]?.alkalmazIgazitas(igazitas);
    },
    onSzin: (szin) => this._aktivSzinAlkalmazasa(szin),

    // --- Típusfüggő sáv: kép ---
    onKepFeltoltes:           () => this.feltoltesKezelo.kepFeltoltesInditas(),
    onPrintScreenBeillesztes: () => this._printScreenBeillesztes(),

    // --- Típusfüggő sáv: fájl ---
    onFajlFeltoltes: () => this.feltoltesKezelo.fajlFeltoltesInditas(),

    // --- Típusfüggő sáv: link ---
    onLinkUrlSzerkesztes:     (ujUrl)     => this._aktivLinkUrlValtas(ujUrl),
    onLinkFeliratSzerkesztes: (ujFelirat) => this._aktivLinkFeliratValtas(ujFelirat),

    // --- Típusfüggő sáv: fájl + link + entitásHivatkozas (közös betűméret) ---
    // HOZZÁADVA: a TipusFuggoEszkozokSav mindhárom érintett panelnek ezt a callbacket adja át
    onBetumeretValtozas: (meret) => this._aktivBlokkBetumeretValtozas(meret),

    // --- Típusfüggő sáv: entitás hivatkozás ---
    onEntitasBeallitasa: (entitasId, entitasTipus) => this._aktivEntitasBeallitasa(entitasId, entitasTipus),
  });

  // Eszköztár DOM-ba illesztése a terület elé
  this.szerkesztoElem.insertBefore(
    this.eszkoztar.letrehozas(),
    this.teruletElem
  );

  // 4. OldalNavigacio példányosítása — üres fülek, mindig látható
  this.oldalNavigacio = new OldalNavigacio({
    fulek: [],
    onFulValtas: (fulId) => this._fulValtas(fulId),
    onUjFul:     (fulId, felirat) => this._ujFulBlokkListaLetrehozasa(fulId, felirat),
  });

  // Navigáció DOM-ba illesztése az eszköztár után, a terület elé
  this.szerkesztoElem.insertBefore(
    this.oldalNavigacio.letrehozas(),
    this.teruletElem
  );

  // 5. FeltöltésKezelő - kép és fájl feltöltések
  this.feltoltesKezelo = new FeltoltesKezelo(this.teruletElem, {
    token:      tokenLekerese(),
    onKepKesz:  (url, alt) => this._kepBlokkHozzaadasa(url, alt),
    onFajlKesz: (url, nev) => this._fajlBlokkHozzaadasa(url, nev),
    onHiba:     (uzenet)   => this._hibaJelzese(uzenet)
  });

  // 6. TortenetKezelo példányosítása
  // Az allapotFrissites-t NEM adjuk át — a _visszaallitasUtaniFokusz() kezeli
  this.tortenetKezelo = new TortenetKezelo(
    () => this.getTartalom(),
    (snapshot) => this._tartalomVisszaallitasa(snapshot),
    this.teruletElem,
    {} // allapotFrissites szándékosan üres — lásd _visszaallitasUtaniFokusz()
  );

  // 7. MeretezesKezelo példányosítása
  this.meretezesKezelo = new MeretezesKezelo({
    getTerületElem:    () => this.teruletElem,
    getBlokkLista:     () => this.blokkLista,
    getTortenetKezelo: () => this.tortenetKezelo,
    onAllapotValtozas: () => {
      const aktivBlokk = this.blokkLista.getAktiv();
      if (!aktivBlokk) return;
      const kozosAllapot     = this._kozosAllapotOsszeallitasa();
      const aktualisFormatas = aktivBlokk.tipus === 'szoveg'
        ? this.szovegBlokkPeldanyok[aktivBlokk.id]?.getAktualisFormatas() ?? null
        : null;
      this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, aktualisFormatas);
    },
  });

  // 8. MozgatasiKezelo példányosítása
  this.mozgatasiKezelo = new MozgatasiKezelo({
    teruletElem:       this.teruletElem,
    getBlokkLista:     () => this.blokkLista,
    getTortenetKezelo: () => this.tortenetKezelo,
    getEszkoztar:      () => this.eszkoztar,
    getKozosAllapot:   () => this._kozosAllapotOsszeallitasa(),
    blokkRenderelese:  (blokk) => this._blokkRenderelese(blokk),
    valtozasJelzese:   () => this._valtozasJelzese(),
  });

  // --- KEZDŐ ÁLLAPOT BEÁLLÍTÁSA ---
  if (opciak.kezdoBlokkok) {
    this._blokkokBetoltese(opciak.kezdoBlokkok);
  } else {
    this._ujSzovegesBlokkHozzaadasa();
  }

  // Az első snapshot mentése — ez lesz a visszavonás alapállapota
  requestAnimationFrame(() => {
    this._elsoBlokktFokuszba();
    this.tortenetKezelo.mentes();
  });

  console.log('SzovegSzerkeszto.constructor - VÉGE');
}

// =============================================
// PUBLIKUS API - TARTALOM LEKÉRÉSE
// =============================================
// MÓDOSÍTVA: az aktivFulId is bekerül a snapshotba,
// hogy visszaállításkor tudjuk, melyik fül volt aktív.
// Ha van navigáció, az új { oldalNavigacio, blokkok, aktivFulId } formátumot adja vissza.
// Ha nincs, a régi tömb formátumot (visszafelé kompatibilis).
// @returns {Array|Object} A mentésre kész adatstruktúra
getTartalom() {
  console.log('SzovegSzerkeszto.getTartalom - KEZDÉS');

  // --- NAVIGÁCIÓ NÉLKÜLI eset: még nincs egy fül sem ---
  if (this.oldalNavigacio.getFulek().length === 0) {
    this._szovegesBlokkokSzinkronizalasa();
    const tartalom = this.blokkLista.exportalas();
    console.log('SzovegSzerkeszto.getTartalom - VÉGE (navigáció nélkül)', { tartalom });
    return tartalom;
  }

  // --- NAVIGÁCIÓVAL: van legalább egy fül ---
  // Minden fül szöveges blokkjait szinkronizáljuk a DOM-ból
  Object.values(this.blokkListak).forEach(blokkLista => {
    blokkLista.blokkok.forEach(blokk => {
      if (blokk.tipus !== 'szoveg') return;
      const domElem = this.teruletElem.querySelector(`[data-blokk-id="${blokk.id}"]`);
      if (domElem) blokk.tartalom = domElem.innerHTML;
    });
  });

  const fulek = this.oldalNavigacio.getFulek();

  // Minden fülhöz exportáljuk a blokkokat
  const blokkokFulenkent = {};
  fulek.forEach(ful => {
    blokkokFulenkent[ful.id] = this.blokkListak[ful.id]?.exportalas() || [];
  });

  const eredmeny = {
    oldalNavigacio: { fulek },
    aktivFulId: this.aktivFulId,
    blokkok: blokkokFulenkent
  };

  console.log('SzovegSzerkeszto.getTartalom - VÉGE (navigációval)', { eredmeny });
  return eredmeny;
}

// =============================================
// PUBLIKUS API - TARTALOM BEÁLLÍTÁSA
// =============================================
// Külső tartalom betöltésére szolgál (pl. szerkesztés módban megnyitáskor).
// NEM a visszaállítás hívja — arra a _tartalomVisszaallitasa() van.
// @param {Array|Object} blokkok - A betöltendő adatok
setTartalom(blokkok) {
  console.log('SzovegSzerkeszto.setTartalom - KEZDÉS', { blokkok });

  // Korábbi állapot teljes törlése
  this.blokkLista.urites();
  this.blokkListak = {};
  this.aktivFulId = null;

  // Az OldalNavigacio DOM elemét újra létrehozzuk (fülek törlése)
  if (this.oldalNavigacio && this.oldalNavigacio.elem) {
    const regiElem = this.oldalNavigacio.elem;

    this.oldalNavigacio = new OldalNavigacio({
      fulek: [],
      onFulValtas: (fulId) => this._fulValtas(fulId),
      onUjFul:     (fulId, felirat) => this._ujFulBlokkListaLetrehozasa(fulId, felirat),
    });

    regiElem.replaceWith(this.oldalNavigacio.letrehozas());
  }

  this.teruletElem.innerHTML = '';

  if (blokkok) {
    this._blokkokBetoltese(blokkok);
  } else {
    this._ujSzovegesBlokkHozzaadasa();
  }

  requestAnimationFrame(() => {
    this._elsoBlokktFokuszba();
  });

  console.log('SzovegSzerkeszto.setTartalom - VÉGE');
}

// =============================================
// PUBLIKUS API - SZERKESZTŐ MEGSEMMISÍTÉSE
// =============================================
destroy() {
  console.log('SzovegSzerkeszto.destroy - KEZDÉS');

  // TortenetKezelo takarítása — billentyűfigyelő leállítása, timerek törlése
  if (this.tortenetKezelo) {
    this.tortenetKezelo.destroy();
    this.tortenetKezelo = null;
  }

  // MeretezesKezelo takarítása — eseményfigyelők leállítása
  if (this.meretezesKezelo) {
    this.meretezesKezelo.destroy();
    this.meretezesKezelo = null;
  }

  // MozgatasiKezelo nem tart eseményfigyelőt, de null-ra állítjuk
  this.mozgatasiKezelo = null;

  this.blokkLista.urites();
  this.kontener.innerHTML = '';

  console.log('SzovegSzerkeszto.destroy - VÉGE');
}

// =============================================
// PRIVÁT - DOM FELÉPÍTÉSE
// =============================================
_domFelépítése() {
  this.szerkesztoElem = document.createElement('div');
  this.szerkesztoElem.className = 'szoveg-szerkeszto';
  this.teruletElem = document.createElement('div');
  this.teruletElem.className = 'szoveg-szerkeszto__terület';
  this.szerkesztoElem.appendChild(this.teruletElem);
  this.kontener.appendChild(this.szerkesztoElem);
}

// =============================================
// PRIVÁT - BLOKKOK BETÖLTÉSE
// =============================================
// Felismeri az új navigációs formátumot és a régi tömb formátumot is.
// @param {Array|Object} adatok - A betöltendő adatok
_blokkokBetoltese(adatok) {
  console.log('SzovegSzerkeszto._blokkokBetoltese - KEZDÉS', { adatok });

  // --- ÚJ FORMÁTUM felismerése: van oldalNavigacio kulcs ---
  if (adatok && adatok.oldalNavigacio) {
    const fulek = adatok.oldalNavigacio.fulek;

    // Minden fülhöz BlokkLista létrehozása és feltöltése
    fulek.forEach(ful => {
      this.blokkListak[ful.id] = new BlokkLista();
      const fulBlokkjai = adatok.blokkok?.[ful.id] || [];
      fulBlokkjai.forEach(blokkAdat => {
        this.blokkListak[ful.id].hozzaadas(blokkAdat.tipus, blokkAdat);
      });
    });

    // Ha a snapshot tartalmaz aktivFulId-t, azt aktiváljuk,
    // különben az első fül lesz aktív (visszafelé kompatibilis)
    const celFulId = adatok.aktivFulId && this.blokkListak[adatok.aktivFulId]
      ? adatok.aktivFulId
      : fulek[0].id;

    this.aktivFulId = celFulId;
    this.blokkLista = this.blokkListak[celFulId];

    // Az OldalNavigacio-t újra felépítjük a betöltött fülekkel
    const regiElem = this.oldalNavigacio.elem;
    this.oldalNavigacio = new OldalNavigacio({
      fulek,
      onFulValtas: (fulId) => this._fulValtas(fulId),
      onUjFul:     (fulId, felirat) => this._ujFulBlokkListaLetrehozasa(fulId, felirat),
    });
    regiElem.replaceWith(this.oldalNavigacio.letrehozas());

    // Az aktív fület beállítjuk az OldalNavigacio-ban is
    this.oldalNavigacio.setAktivFul(celFulId);

    // Az aktív fül blokkjainak renderelése
    this.blokkLista.getOsszes().forEach(blokk => this._blokkRenderelese(blokk));

    // Ha az aktív fülnek sincs blokkja, üres szöveges blokkot hozunk létre
    if (this.blokkLista.getSzam() === 0) {
      this._ujSzovegesBlokkHozzaadasa();
    }

    console.log('SzovegSzerkeszto._blokkokBetoltese - VÉGE (navigációval)', { fulek, celFulId });
    return;
  }

  // --- RÉGI FORMÁTUM: egyszerű tömb (változatlan logika) ---
  if (Array.isArray(adatok) && adatok.length > 0) {
    adatok.forEach(blokkAdat => {
      this.blokkLista.hozzaadas(blokkAdat.tipus, blokkAdat);
    });
    this.blokkLista.getOsszes().forEach(blokk => this._blokkRenderelese(blokk));
  } else {
    this._ujSzovegesBlokkHozzaadasa();
  }

  console.log('SzovegSzerkeszto._blokkokBetoltese - VÉGE (navigáció nélkül)');
}

// =============================================
// PRIVÁT - TARTALOM VISSZAÁLLÍTÁSA SNAPSHOTBÓL
// =============================================
// A TortenetKezelo hívja visszavon() és ujra() esetén.
// @param {Array|Object} snapshot - A TortenetKezelo által átadott deep copy
_tartalomVisszaallitasa(snapshot) {
  console.log('SzovegSzerkeszto._tartalomVisszaallitasa - KEZDÉS', { snapshot });

  // --- RÉGI FORMÁTUM: egyszerű tömb ---
  if (Array.isArray(snapshot)) {
    this.teruletElem.innerHTML = '';
    this.szovegBlokkPeldanyok  = {};
    this.kepBlokkPeldanyok     = {};
    this.fajlBlokkPeldanyok    = {};
    this.entitasBlokkPeldanyok = {};

    this.blokkLista.urites();
    snapshot.forEach(blokkAdat => {
      this.blokkLista.hozzaadas(blokkAdat.tipus, blokkAdat);
    });

    this.blokkLista.getOsszes().forEach(blokk => this._blokkRenderelese(blokk));

    if (this.blokkLista.getSzam() === 0) {
      this._ujSzovegesBlokkHozzaadasa();
    }

    this._visszaallitasUtaniFokusz();

    console.log('SzovegSzerkeszto._tartalomVisszaallitasa - VÉGE (navigáció nélkül)');
    return;
  }

  // --- ÚJ FORMÁTUM: van oldalNavigacio kulcs ---
  if (snapshot && snapshot.oldalNavigacio) {
    const fulek = snapshot.oldalNavigacio.fulek;

    const celFulId = snapshot.aktivFulId && fulek.find(f => f.id === snapshot.aktivFulId)
      ? snapshot.aktivFulId
      : fulek[0]?.id;

    const jelenlegiFulek = this.oldalNavigacio.getFulek();
    const fulekMegvaltoztak =
      fulek.length !== jelenlegiFulek.length ||
      fulek.some((f, i) => f.id !== jelenlegiFulek[i]?.id || f.felirat !== jelenlegiFulek[i]?.felirat);

    if (fulekMegvaltoztak) {
      const regiElem = this.oldalNavigacio.elem;
      this.oldalNavigacio = new OldalNavigacio({
        fulek,
        onFulValtas: (fulId) => this._fulValtas(fulId),
        onUjFul:     (fulId, felirat) => this._ujFulBlokkListaLetrehozasa(fulId, felirat),
      });
      regiElem.replaceWith(this.oldalNavigacio.letrehozas());

      this.blokkListak = {};
      fulek.forEach(ful => {
        this.blokkListak[ful.id] = new BlokkLista();
        const fulBlokkjai = snapshot.blokkok?.[ful.id] || [];
        fulBlokkjai.forEach(blokkAdat => {
          this.blokkListak[ful.id].hozzaadas(blokkAdat.tipus, blokkAdat);
        });
      });
    } else {
      fulek.forEach(ful => {
        if (!this.blokkListak[ful.id]) {
          this.blokkListak[ful.id] = new BlokkLista();
        } else {
          this.blokkListak[ful.id].urites();
        }
        const fulBlokkjai = snapshot.blokkok?.[ful.id] || [];
        fulBlokkjai.forEach(blokkAdat => {
          this.blokkListak[ful.id].hozzaadas(blokkAdat.tipus, blokkAdat);
        });
      });
    }

    this.aktivFulId = celFulId;
    this.blokkLista = this.blokkListak[celFulId];
    this.oldalNavigacio.setAktivFul(celFulId);

    this.teruletElem.innerHTML = '';
    this.szovegBlokkPeldanyok  = {};
    this.kepBlokkPeldanyok     = {};
    this.fajlBlokkPeldanyok    = {};
    this.entitasBlokkPeldanyok = {};

    this.blokkLista.getOsszes().forEach(blokk => this._blokkRenderelese(blokk));

    if (this.blokkLista.getSzam() === 0) {
      this._ujSzovegesBlokkHozzaadasa();
    }

    this._visszaallitasUtaniFokusz();

    console.log('SzovegSzerkeszto._tartalomVisszaallitasa - VÉGE (navigációval)', { celFulId, fulekMegvaltoztak });
    return;
  }

  console.warn('SzovegSzerkeszto._tartalomVisszaallitasa - ismeretlen snapshot formátum', { snapshot });
}

// =============================================
// PRIVÁT - VISSZAÁLLÍTÁS UTÁNI FÓKUSZ + ESZKÖZTÁR FRISSÍTÉS
// =============================================
// A _tartalomVisszaallitasa() hívja minden visszaállítás után.
// Feladatai sorrendben:
// 1. Megkeresi az aktív blokkot (vagy az elsőt, ha nincs aktív)
// 2. Fókuszt ad a blokk DOM elemének
// 3. Szöveges blokknál a kurzort a szöveg végére helyezi
// 4. Frissíti az Eszköztárt
_visszaallitasUtaniFokusz() {
  console.log('SzovegSzerkeszto._visszaallitasUtaniFokusz - KEZDÉS');

  requestAnimationFrame(() => {
    let aktivBlokk = this.blokkLista.getAktiv();

    if (!aktivBlokk) {
      const elsoBlokk = this.blokkLista.blokkok[0];
      if (!elsoBlokk) {
        console.log('SzovegSzerkeszto._visszaallitasUtaniFokusz - nincs blokk, kilépés');
        return;
      }
      this.blokkLista.setAktiv(elsoBlokk.id);
      aktivBlokk = elsoBlokk;
    }

    const domElem = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
    if (domElem) {
      domElem.focus();

      if (aktivBlokk.tipus === 'szoveg' && domElem.childNodes.length > 0) {
        try {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(domElem);
          range.collapse(false); // false = kurzor a tartalom végére
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          console.warn('SzovegSzerkeszto._visszaallitasUtaniFokusz - kurzor beállítás sikertelen', e);
        }
      }
    }

    // Eszköztár frissítése — a fókuszadás UTÁN
    const kozosAllapot = this._kozosAllapotOsszeallitasa();
    const aktualisFormatas = aktivBlokk.tipus === 'szoveg'
      ? this.szovegBlokkPeldanyok[aktivBlokk.id]?.getAktualisFormatas() ?? null
      : null;
    this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, aktualisFormatas);

    console.log('SzovegSzerkeszto._visszaallitasUtaniFokusz - VÉGE', { aktivBlokkId: aktivBlokk.id });
  });
}

// =============================================
// PRIVÁT - ÚJ FÜL BLOKKLISTA LÉTREHOZÁSA
// =============================================
_ujFulBlokkListaLetrehozasa(fulId, felirat) {
  console.log('SzovegSzerkeszto._ujFulBlokkListaLetrehozasa - KEZDÉS', { fulId, felirat });

  const elsoFul = Object.keys(this.blokkListak).length === 0;

  if (elsoFul) {
    this.blokkListak[fulId] = this.blokkLista;
  } else {
    this.blokkListak[fulId] = new BlokkLista();
  }

  this._fulValtas(fulId);
  this.oldalNavigacio.setAktivFul(fulId);

  // Fül hozzáadása struktúraváltás — snapshot mentése
  this.tortenetKezelo.mentes();

  console.log('SzovegSzerkeszto._ujFulBlokkListaLetrehozasa - VÉGE', { fulId, elsoFul });
}

// =============================================
// PRIVÁT - FÜL VÁLTÁS
// =============================================
// Az OldalNavigacio onFulValtas callbackje hívja.
// Fülváltás NEM ment snapshotot — csak nézetváltás, nem tartalomváltozás.
// @param {string} fulId - Az új aktív fül ID-ja
_fulValtas(fulId) {
  console.log('SzovegSzerkeszto._fulValtas - KEZDÉS', { fulId });

  this._szovegesBlokkokSzinkronizalasa();

  this.aktivFulId = fulId;
  this.blokkLista = this.blokkListak[fulId];

  this.teruletElem.innerHTML = '';

  this.szovegBlokkPeldanyok  = {};
  this.kepBlokkPeldanyok     = {};
  this.fajlBlokkPeldanyok    = {};
  this.entitasBlokkPeldanyok = {};

  this.blokkLista.getOsszes().forEach(blokk => {
    this._blokkRenderelese(blokk);
  });

  if (this.blokkLista.getSzam() === 0) {
    this._ujSzovegesBlokkHozzaadasa();
  }

  console.log('SzovegSzerkeszto._fulValtas - VÉGE', { fulId, blokkokSzama: this.blokkLista.getSzam() });
}

// =============================================
// PRIVÁT - BLOKK RENDERELÉSE
// =============================================
_blokkRenderelese(blokk) {
  console.log('SzovegSzerkeszto._blokkRenderelese - KEZDÉS', { blokkId: blokk.id, tipus: blokk.tipus });

  let domElem = null;

  switch (blokk.tipus) {

    case 'szoveg': {
      const szovegBlokk = new SzovegBlokk(blokk, {
        onFokusz:   (id) => this._blokkFokuszba(id),
        onUjBlokk:  (id) => this._ujSzovegesBlokkHozzaadasa(id),
        onTorles:   (id) => this._blokkTorlese(id),
        onValtozas: (id, tartalom) => {
          this.blokkLista.frissites(id, { tartalom });
          // Gépelés közbeni debounce snapshot mentés
          this.tortenetKezelo.mentesDebounce();
          this._valtozasJelzese();
        }
      });
      domElem = szovegBlokk.letrehozas();
      this.szovegBlokkPeldanyok[blokk.id] = szovegBlokk;
      break;
    }

    case 'kep': {
      const kepBlokk = new KepBlokk(blokk, {
        onFokusz: (id) => this._blokkFokuszba(id),
        onTorles: (id) => this._blokkTorlese(id),
      });
      domElem = kepBlokk.letrehozas();
      this.kepBlokkPeldanyok[blokk.id] = kepBlokk;
      break;
    }

    case 'fajl': {
      const fajlBlokk = new FajlBlokk(blokk, {
        onFokusz: (id) => this._blokkFokuszba(id),
        onTorles: (id) => this._blokkTorlese(id),
      });
      domElem = fajlBlokk.letrehozas();
      this.fajlBlokkPeldanyok[blokk.id] = fajlBlokk;
      break;
    }

    case 'link': {
      const linkBlokk = new LinkBlokk(blokk, {
        onFokusz: (id) => this._blokkFokuszba(id),
        onTorles: (id) => this._blokkTorlese(id),
      });
      domElem = linkBlokk.letrehozas();
      break;
    }

    case 'entitasHivatkozas': {
      const entitasBlokk = new EntitasHivatkozasBlokk(blokk, {
        onFokusz:    (id) => this._blokkFokuszba(id),
        onTorles:    (id) => this._blokkTorlese(id),
        onKoppintas: (entitasId, entitasTipus) => {
          if (this.onEntitasKivalasztas) {
            this.onEntitasKivalasztas(entitasId, entitasTipus);
          }
        }
      });
      domElem = entitasBlokk.letrehozas();
      this.entitasBlokkPeldanyok[blokk.id] = entitasBlokk;
      break;
    }

    default:
      console.warn('SzovegSzerkeszto._blokkRenderelese - Ismeretlen blokk típus:', blokk.tipus);
  }

  if (domElem) {
    this.teruletElem.appendChild(domElem);
  }

  console.log('SzovegSzerkeszto._blokkRenderelese - VÉGE', { blokkId: blokk.id });
}

// =============================================
// PRIVÁT - ÚJ SZÖVEGES BLOKK HOZZÁADÁSA
// =============================================
_ujSzovegesBlokkHozzaadasa(utanBlokkId = null) {
  console.log('SzovegSzerkeszto._ujSzovegesBlokkHozzaadasa - KEZDÉS', { utanBlokkId });

  const aktivBlokk = this.blokkLista.getAktiv();
  const oroklottFormatas = aktivBlokk?.formatas
    ? { ...aktivBlokk.formatas }
    : { felkover: false, dolt: false, alahuzas: false, meret: 16 };

  const ujBlokk = this.blokkLista.hozzaadas('szoveg', { formatas: oroklottFormatas });
  this._blokkRenderelese(ujBlokk);

  const domElem = this.teruletElem.querySelector(`[data-blokk-id="${ujBlokk.id}"]`);
  if (domElem) {
    domElem.contentEditable = 'true';
    requestAnimationFrame(() => {
      const rejtvE = domElem.closest('[aria-hidden="true"]');
      if (!rejtvE) domElem.focus();
    });
  }

  // Új blokk hozzáadása struktúraváltás — azonnali snapshot mentés
  if (this.tortenetKezelo) {
    this.tortenetKezelo.mentes();
  }

  console.log('SzovegSzerkeszto._ujSzovegesBlokkHozzaadasa - VÉGE', { ujBlokkId: ujBlokk.id });
}

// =============================================
// PRIVÁT - ELSŐ BLOKK FÓKUSZBA HELYEZÉSE
// =============================================
_elsoBlokktFokuszba() {
  console.log('SzovegSzerkeszto._elsoBlokktFokuszba - KEZDÉS');

  const elsoBlokk = this.blokkLista.blokkok[0];
  if (!elsoBlokk) return;

  this.blokkLista.setAktiv(elsoBlokk.id);

  const aktualisFormatas = elsoBlokk.tipus === 'szoveg'
    ? this.szovegBlokkPeldanyok[elsoBlokk.id]?.getAktualisFormatas() ?? null
    : null;

  const kozosAllapot = this._kozosAllapotOsszeallitasa();
  this.eszkoztar.allapotFrissites(elsoBlokk, kozosAllapot, aktualisFormatas);

  if (elsoBlokk.tipus === 'szoveg') {
    const domElem = this.teruletElem.querySelector(`[data-blokk-id="${elsoBlokk.id}"]`);
    if (domElem) {
      const rejtvE = domElem.closest('[aria-hidden="true"]');
      if (!rejtvE) domElem.focus();
    }
  }

  console.log('SzovegSzerkeszto._elsoBlokktFokuszba - VÉGE', { elsoBlokk: elsoBlokk.id });
}

// =============================================
// PRIVÁT - BLOKK TÖRLÉSE
// =============================================
_blokkTorlese(blokkId) {
  console.log('SzovegSzerkeszto._blokkTorlese - KEZDÉS', { blokkId });

  const előzőBlokk = this.blokkLista.getElőző(blokkId);
  this.blokkLista.torles(blokkId);

  delete this.szovegBlokkPeldanyok[blokkId];
  delete this.kepBlokkPeldanyok[blokkId];
  delete this.fajlBlokkPeldanyok[blokkId];
  delete this.entitasBlokkPeldanyok[blokkId];

  const domElem = this.teruletElem.querySelector(`[data-blokk-id="${blokkId}"]`);
  if (domElem) {
    const wrapper = domElem.closest('.blokk-wrapper') || domElem;
    wrapper.remove();
  }

  if (this.blokkLista.getSzam() === 0) {
    this._ujSzovegesBlokkHozzaadasa();
    return;
  }

  if (előzőBlokk) {
    const előzőElem = this.teruletElem.querySelector(`[data-blokk-id="${előzőBlokk.id}"]`);
    if (előzőElem) előzőElem.focus();
  }

  // Törlés struktúraváltás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._blokkTorlese - VÉGE');
}

// =============================================
// PRIVÁT - AKTÍV BLOKK TÖRLÉSE
// =============================================
_aktivBlokkTorlese() {
  console.log('SzovegSzerkeszto._aktivBlokkTorlese - KEZDÉS');
  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk) return;
  this._blokkTorlese(aktivBlokk.id);
  console.log('SzovegSzerkeszto._aktivBlokkTorlese - VÉGE');
}

// =============================================
// PRIVÁT - AKTÍV BLOKK TÍPUSVÁLTÁSA
// =============================================
_aktivBlokkTipusValtas(ujTipus) {
  console.log('SzovegSzerkeszto._aktivBlokkTipusValtas - KEZDÉS', { ujTipus });

  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk) {
    console.warn('SzovegSzerkeszto._aktivBlokkTipusValtas - nincs aktív blokk');
    return;
  }
  if (aktivBlokk.tipus === ujTipus) {
    console.log('SzovegSzerkeszto._aktivBlokkTipusValtas - már ilyen típusú, nincs teendő');
    return;
  }

  const regiDomElem = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
  const regiWrapper = regiDomElem?.closest('.blokk-wrapper') || regiDomElem;

  this.blokkLista.frissites(aktivBlokk.id, {
    tipus:    ujTipus,
    tartalom: '',
    url:      '',
    alt:      '',
    nev:      '',
    felirat:  '',
    meret:    ujTipus === 'kep' ? 'kozepes' : undefined,
    formatas: ujTipus === 'szoveg'
      ? { felkover: false, dolt: false, meret: 'kozepes' }
      : undefined,
  });

  const frissitettBlokk = this.blokkLista.getById(aktivBlokk.id);
  if (regiWrapper) regiWrapper.remove();

  this._blokkRenderelese(frissitettBlokk);

  const ujDomElem = this.teruletElem.querySelector(`[data-blokk-id="${frissitettBlokk.id}"]`);
  if (ujDomElem) {
    requestAnimationFrame(() => {
      const rejtvE = ujDomElem.closest('[aria-hidden="true"]');
      if (!rejtvE) ujDomElem.focus();
    });
  }

  const kozosAllapot = this._kozosAllapotOsszeallitasa();
  this.eszkoztar.allapotFrissites(frissitettBlokk, kozosAllapot);

  // Típusváltás struktúraváltás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._aktivBlokkTipusValtas - VÉGE', { ujTipus });
}

// =============================================
// PRIVÁT - BLOKK FÓKUSZBA KERÜLÉSE
// =============================================
// Ha másik blokkra vált a fókusz, a méretezési mód automatikusan törlődik —
// ezt a MeretezesKezelo kezeli a modTorlese() meghívásakor
_blokkFokuszba(blokkId) {
  console.log('SzovegSzerkeszto._blokkFokuszba - KEZDÉS', { blokkId });

  // Ha aktív méretezési mód van, és másik blokkra vált — delegálás a MeretezesKezelo-re
  if (this.meretezesKezelo?.getAktivBlokkId() &&
      this.meretezesKezelo.getAktivBlokkId() !== blokkId) {
    this.meretezesKezelo.modTorlese();
  }

  // Aktív CSS osztály frissítése minden blokkon
  this.teruletElem.querySelectorAll('.blokk-wrapper').forEach(el => {
    el.classList.remove('blokk--aktiv');
  });

  const aktvElem = this.teruletElem.querySelector(`[data-blokk-id="${blokkId}"]`);
  if (aktvElem) aktvElem.classList.add('blokk--aktiv');

  this.blokkLista.setAktiv(blokkId);

  const blokk = this.blokkLista.getById(blokkId);
  if (blokk) {
    const aktualisFormatas = blokk.tipus === 'szoveg'
      ? this.szovegBlokkPeldanyok[blokk.id]?.getAktualisFormatas() ?? null
      : null;
    const kozosAllapot = this._kozosAllapotOsszeallitasa();
    this.eszkoztar.allapotFrissites(blokk, kozosAllapot, aktualisFormatas);
  }

  console.log('SzovegSzerkeszto._blokkFokuszba - VÉGE', { blokkId });
}

// =============================================
// PRIVÁT - KÉP BLOKK HOZZÁADÁSA (feltöltés után)
// =============================================
_kepBlokkHozzaadasa(url, alt) {
  console.log('SzovegSzerkeszto._kepBlokkHozzaadasa - KEZDÉS', { url, alt });

  const aktivBlokk = this.blokkLista.getAktiv();

  if (aktivBlokk && aktivBlokk.tipus === 'kep') {
    this.blokkLista.frissites(aktivBlokk.id, { url, alt });
    const blokkPeldany = this.kepBlokkPeldanyok[aktivBlokk.id];
    if (blokkPeldany) {
      blokkPeldany.kepBeallitasa(url, alt);
    } else {
      console.warn('SzovegSzerkeszto._kepBlokkHozzaadasa - nem található KepBlokk példány:', aktivBlokk.id);
    }
  } else {
    const ujBlokk = this.blokkLista.hozzaadas('kep', { url, alt });
    this._blokkRenderelese(ujBlokk);
  }

  // Kép feltöltés/hozzáadás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._kepBlokkHozzaadasa - VÉGE', { url, alt });
}

// =============================================
// PRIVÁT - FÁJL BLOKK HOZZÁADÁSA (feltöltés után)
// =============================================
_fajlBlokkHozzaadasa(url, nev) {
  console.log('SzovegSzerkeszto._fajlBlokkHozzaadasa - KEZDÉS', { url, nev });

  const aktivBlokk = this.blokkLista.getAktiv();

  if (!aktivBlokk || aktivBlokk.tipus !== 'fajl') {
    console.warn('SzovegSzerkeszto._fajlBlokkHozzaadasa - nincs aktív fájl blokk');
    return;
  }

  this.blokkLista.frissites(aktivBlokk.id, { url, nev });

  const blokkPeldany = this.fajlBlokkPeldanyok[aktivBlokk.id];
  if (blokkPeldany) {
    blokkPeldany.fajlBeallitasa(url, nev);
  } else {
    console.warn('SzovegSzerkeszto._fajlBlokkHozzaadasa - nem található FajlBlokk példány:', aktivBlokk.id);
  }

  // Fájl feltöltés — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._fajlBlokkHozzaadasa - VÉGE', { url, nev });
}

// =============================================
// PRIVÁT - PRINT SCREEN BEILLESZTÉSE
// =============================================
_printScreenBeillesztes() {
  console.log('SzovegSzerkeszto._printScreenBeillesztes - KEZDÉS');

  const cel = document.createElement('div');
  cel.contentEditable = 'true';
  cel.style.cssText = 'position:fixed; top:-9999px; left:-9999px; opacity:0;';
  document.body.appendChild(cel);

  cel.addEventListener('paste', async (e) => {
    e.preventDefault();
    document.body.removeChild(cel);

    const elemek  = Array.from(e.clipboardData?.items || []);
    const kepElem = elemek.find(item => item.type.startsWith('image/'));

    if (!kepElem) {
      console.log('SzovegSzerkeszto._printScreenBeillesztes - nincs kép a vágólapon');
      return;
    }

    const fajl = kepElem.getAsFile();
    if (!fajl) return;

    await this.feltoltesKezelo._kepFajlFeltoltese(fajl, 'printscreen');
  });

  cel.focus();
  document.execCommand('paste');

  console.log('SzovegSzerkeszto._printScreenBeillesztes - VÉGE');
}

// =============================================
// PRIVÁT - LINK URL VÁLTÁS
// =============================================
_aktivLinkUrlValtas(ujUrl) {
  console.log('SzovegSzerkeszto._aktivLinkUrlValtas - KEZDÉS', { ujUrl });

  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk || aktivBlokk.tipus !== 'link') return;

  this.blokkLista.frissites(aktivBlokk.id, { url: ujUrl });

  const domElem = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
  if (domElem) {
    domElem.innerHTML = '';

    const linkElem = document.createElement('a');
    linkElem.className = 'link-blokk';
    linkElem.href      = ujUrl;
    linkElem.target    = '_blank';
    linkElem.rel       = 'noopener noreferrer';
    linkElem.addEventListener('click', (e) => e.preventDefault());

    const ikonElem = document.createElement('span');
    ikonElem.className   = 'link-blokk__ikon';
    ikonElem.textContent = '🔗';
    ikonElem.setAttribute('aria-hidden', 'true');

    const feliratElem = document.createElement('span');
    feliratElem.className   = 'link-blokk__felirat';
    feliratElem.textContent = ujUrl;

    linkElem.appendChild(ikonElem);
    linkElem.appendChild(feliratElem);
    domElem.appendChild(linkElem);
  }

  // Link url változás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._aktivLinkUrlValtas - VÉGE', { ujUrl });
}

// =============================================
// PRIVÁT - LINK FELIRAT VÁLTÁS
// =============================================
_aktivLinkFeliratValtas(ujFelirat) {
  console.log('SzovegSzerkeszto._aktivLinkFeliratValtas - KEZDÉS', { ujFelirat });

  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk || aktivBlokk.tipus !== 'link') return;

  this.blokkLista.frissites(aktivBlokk.id, { felirat: ujFelirat });

  const domElem = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
  if (domElem) {
    const linkElem = domElem.querySelector('a') || domElem;
    if (linkElem) linkElem.textContent = ujFelirat || aktivBlokk.url;
  }

  // Link felirat változás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._aktivLinkFeliratValtas - VÉGE', { ujFelirat });
}

// =============================================
// PRIVÁT - ENTITÁS BEÁLLÍTÁSA
// =============================================
_aktivEntitasBeallitasa(entitasId, entitasTipus) {
  console.log('SzovegSzerkeszto._aktivEntitasBeallitasa - KEZDÉS', { entitasId, entitasTipus });

  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk || aktivBlokk.tipus !== 'entitasHivatkozas') return;

  this.blokkLista.frissites(aktivBlokk.id, { entitasId, entitasTipus });

  const blokkPeldany = this.entitasBlokkPeldanyok[aktivBlokk.id];
  if (blokkPeldany) {
    blokkPeldany.entitasBeallitasa(entitasId, entitasTipus);
  }

  // Entitás beállítás — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._aktivEntitasBeallitasa - VÉGE', { entitasId, entitasTipus });
}

// =============================================
// PRIVÁT - VISSZAVONÁS
// =============================================
_visszavon() {
  console.log('SzovegSzerkeszto._visszavon - KEZDÉS');
  this.tortenetKezelo?.visszavon();
  console.log('SzovegSzerkeszto._visszavon - VÉGE');
}

// =============================================
// PRIVÁT - ISMÉT
// =============================================
_ismet() {
  console.log('SzovegSzerkeszto._ismet - KEZDÉS');
  this.tortenetKezelo?.ujra();
  console.log('SzovegSzerkeszto._ismet - VÉGE');
}

// =============================================
// PRIVÁT - AKTÍV BLOKK BETŰMÉRETÉNEK VÁLTOZTATÁSA
// =============================================
// A TipusFuggoEszkozokSav FajlPanel, LinkPanel és EntitasHivatkozasPanel
// paneljeinek onBetumeretValtozas callbackje hívja.
// JAVÍTÁS: nem a wrapper <a> elemre rakjuk a font-size-t (azt felülírná
// a CSS osztály), hanem közvetlenül a belső tartalmi elemekre.
// @param {number} meret - Az új betűméret px-ben (pl. 12, 14, 16, 20, 24)
_aktivBlokkBetumeretValtozas(meret) {
  console.log('SzovegSzerkeszto._aktivBlokkBetumeretValtozas - KEZDÉS', { meret });

  // Aktív blokk lekérése
  const aktivBlokk = this.teruletElem?.closest('.szoveg-szerkeszto')
    ? this.blokkLista.getAktiv()
    : this.blokkLista.getAktiv();
  
  if (!aktivBlokk) {
    console.warn('SzovegSzerkeszto._aktivBlokkBetumeretValtozas - nincs aktív blokk');
    return;
  }

  // Csak a három érintett típusnál engedélyezett
  const kezeltTipusok = ['fajl', 'link', 'entitasHivatkozas'];
  if (!kezeltTipusok.includes(aktivBlokk.tipus)) {
    console.warn('SzovegSzerkeszto._aktivBlokkBetumeretValtozas - nem kezelt típus:', aktivBlokk.tipus);
    return;
  }

  // Wrapper DOM elem megkeresése
  const blokkWrapper = this.teruletElem.querySelector(`[data-blokk-id="${aktivBlokk.id}"]`);
  if (!blokkWrapper) {
    console.warn('SzovegSzerkeszto._aktivBlokkBetumeretValtozas - DOM elem nem található:', aktivBlokk.id);
    return;
  }

  // JAVÍTÁS: típusonként a megfelelő belső elemekre rakjuk a font-size-t,
  // mert a CSS osztályok felülírják az örökített értéket a wrapper-ről
  if (aktivBlokk.tipus === 'fajl') {
    // Fájl blokknál a fájlnév és az ikon kap méretet
    const nevElem  = blokkWrapper.querySelector('.fajl-blokk__nev');
    const ikonElem = blokkWrapper.querySelector('.fajl-blokk__ikon');
    if (nevElem)  nevElem.style.fontSize  = `${meret}px`;
    if (ikonElem) ikonElem.style.fontSize = `${meret}px`;

  } else if (aktivBlokk.tipus === 'link') {
    // Link blokknál a felirat és az ikon kap méretet
    const feliratElem = blokkWrapper.querySelector('.link-blokk__felirat');
    const ikonElem    = blokkWrapper.querySelector('.link-blokk__ikon');
    if (feliratElem) feliratElem.style.fontSize = `${meret}px`;
    if (ikonElem)    ikonElem.style.fontSize    = `${meret}px`;

  } else if (aktivBlokk.tipus === 'entitasHivatkozas') {
    // Entitás hivatkozásnál a felirat és az ikon kap méretet
    const feliratElem = blokkWrapper.querySelector('.entitas-hivatkozas-blokk__felirat');
    const ikonElem    = blokkWrapper.querySelector('.entitas-hivatkozas-blokk__ikon');
    if (feliratElem) feliratElem.style.fontSize = `${meret}px`;
    if (ikonElem)    ikonElem.style.fontSize    = `${meret}px`;
  }

  // BlokkLista frissítése — meretFontSize eltárolása a snapshothoz
  this.blokkLista.frissites(aktivBlokk.id, { meretFontSize: meret });

  // Eszköztár frissítése — az aktív betűméret gomb kiemelése
  const kozosAllapot = this._kozosAllapotOsszeallitasa();
  this.eszkoztar.allapotFrissites(aktivBlokk, kozosAllapot, null);

  // Betűméret változás tartalom-változásnak minősül — azonnali snapshot mentés
  this.tortenetKezelo.mentes();
  this._valtozasJelzese();

  console.log('SzovegSzerkeszto._aktivBlokkBetumeretValtozas - VÉGE', { blokkId: aktivBlokk.id, meret });
}

// =============================================
// PRIVÁT - KÖZÖS ÁLLAPOT ÖSSZEÁLLÍTÁSA
// =============================================
// meretezesiModAktiv: a MeretezesKezelo-től kérjük le
_kozosAllapotOsszeallitasa() {
  const aktivBlokk      = this.blokkLista.getAktiv();
  const index           = aktivBlokk ? this.blokkLista.getIndex(aktivBlokk.id) : -1;
  const osszesBlokkSzam = this.blokkLista.getSzam();

  // TortenetKezelo-től kérjük le a valódi visszavon/ismét állapotot
  const tortenetAllapot = this.tortenetKezelo?.allapotLekeres()
    ?? { visszavonLehetseges: false, ismetLehetseges: false };

  return {
    visszavonLehetseges: tortenetAllapot.visszavonLehetseges,
    ismetLehetseges:     tortenetAllapot.ismetLehetseges,
    torlesLehetseges:    !!aktivBlokk,
    felLehetseges:       index > 0,
    leLehetseges:        index >= 0 && index < osszesBlokkSzam - 1,
    // MÓDOSÍTVA: a MeretezesKezelo-től kérjük le az aktív állapotot
    meretezesiModAktiv: !!(aktivBlokk && this.meretezesKezelo?.getAktivBlokkId() === aktivBlokk.id),
  };
}

// =============================================
// PRIVÁT - SZÖVEGES BLOKKOK SZINKRONIZÁLÁSA
// =============================================
_szovegesBlokkokSzinkronizalasa() {
  this.blokkLista.blokkok.forEach(blokk => {
    if (blokk.tipus !== 'szoveg') return;
    const domElem = this.teruletElem.querySelector(`[data-blokk-id="${blokk.id}"]`);
    if (domElem) blokk.tartalom = domElem.innerHTML;
  });
}

// =============================================
// PRIVÁT - HIBA JELZÉSE
// =============================================
_hibaJelzese(uzenet) {
  console.error('SzovegSzerkeszto._hibaJelzese:', uzenet);
  alert(uzenet);
}

// =============================================
// PRIVÁT - VÁLTOZÁS JELZÉSE
// =============================================
_valtozasJelzese() {
  if (this.valtozasKezelo) {
    this.valtozasKezelo(this.getTartalom());
  }
}

// =============================================
// PRIVÁT - SZÍN ALKALMAZÁSA (ESZKÖZTÁRBÓL)
// =============================================
// @param {string} szin - A kiválasztott szín hex értéke (pl. '#0000ff')
_aktivSzinAlkalmazasa(szin) {
  console.log('SzovegSzerkeszto._aktivSzinAlkalmazasa - KEZDÉS', { szin });

  const aktivBlokk = this.blokkLista.getAktiv();
  if (!aktivBlokk || aktivBlokk.tipus !== 'szoveg') {
    console.log('SzovegSzerkeszto._aktivSzinAlkalmazasa - VÉGE (nincs aktív szöveg blokk)');
    return;
  }

  const blokkPeldany = this.szovegBlokkPeldanyok[aktivBlokk.id];
  if (!blokkPeldany || !blokkPeldany.elem) {
    console.log('SzovegSzerkeszto._aktivSzinAlkalmazasa - VÉGE (nincs blokk példány)');
    return;
  }

  blokkPeldany.alkalmazSzin(szin);

  console.log('SzovegSzerkeszto._aktivSzinAlkalmazasa - VÉGE', { szin });
}

}

// =============================================
// EXPORTÁLÁS
// =============================================
export default SzovegSzerkeszto;