// frontend/js/components/Pakli.js

// --- IMPORTOK ---
import { apiGet } from '../utils/apiHelper.js'; // GET kéréshez
import Kartya from './kartya/Kartya.js'; // Alap kártya osztály
import TartalomKartya from './kartya/TartalomKartya.js'; // Tartalom típusú kártya
import KategoriaKartya from './kartya/KategoriaKartya.js'; // Kategória típusú kártya
import TartalomTipusKartya from './kartya/TartalomTipusKartya.js'; // TartalomTípus kártya
import JavaslatKartya from './kartya/JavaslatKartya.js'; // Javaslat típusú kártya
import EgyezmenyKartya from './kartya/EgyezmenyKartya.js'; // Egyezmény típusú kártya
import TestverJelzo from './TestverJelzo.js'; // ‹ N / N › kacsacsőrök a kiválasztott kártyán
// A testvér-sor KÖZÖS rendezése + irányonkénti számok — a lépegetés és a
// kacsacsőr-számok UGYANEBBŐL dolgoznak, így sosem térhetnek el egymástól
import { testverSzamok } from '../utils/testverRendezes.js';
// authHelper-ből az entitás mentő/lekérő függvények importálása
import {
  aktivEntitasMentese,
  aktivEntitasLekerese   // ← foOldal.js-ből is használjuk, de Pakli-ban csak a mentés kell
} from '../utils/authHelper.js';

// --- PAKLI OSZTÁLY ---
// Felelőssége:
// 1. A backend /api/pakli végpontról lekéri a paklit
// 2. Típus alapján példányosítja a megfelelő Kartya leszármazottat
// 3. Rendereli a kártyákat a #fooldal-tartalom elembe
// 4. Kezeli a kiválasztott kártyaváltást koppintásra
// 5. Kezeli a jobbra/balra wheel eseményt (testvér váltás)
// 6. Görgetéssel a kiválasztott kártya body-ját az alsó sáv tetejéhez igazítja
// A kártyák belső felépítéséért (fejléc, body, hamburger) a Kartya osztályok felelnek.
class Pakli {

// ----- KONSTRUKTOR -----
// @param {string} token - JWT token az API híváshoz
// @param {string} tartalmKontenerAzonosito - a #fooldal-tartalom elem ID-ja
// @param {string} modalKontenerAzonosito - a modal konténer ID-ja (pl. 'modal-kontener')
// @param {Function|null} onKivalasztasValtas - callback, ha kiválasztott entitás változik
constructor(token, tartalmKontenerAzonosito, modalKontenerAzonosito = 'modal-kontener', onKivalasztasValtas = null) {
  console.log('Pakli.constructor - KEZDÉS', {
    tokenAtadvaE: !!token,
    tartalmKontenerAzonosito,
    modalKontenerAzonosito,
    vanKivalasztasValtasCallback: !!onKivalasztasValtas
  });

  this.token = token;
  this.tartalmKontenerAzonosito = tartalmKontenerAzonosito;
  this.modalKontenerAzonosito = modalKontenerAzonosito;

  // Callback – FoOldal adja át, ő kezeli a localStorage mentést
  // A Pakli csak jelzi, hogy változott a kiválasztott entitás
  this.onKivalasztasValtas = onKivalasztasValtas;

  // kivalasztottEntitasId: az éppen aktív entitás azonosítója (string)
  // betoltesFolyamatban: igaz, ha éppen API hívás zajlik
  // paklikEsTestverek: cache objektum – kulcs: entitasId string
  //   minden kulcs alatt:
  //     pakli: az adott entitáshoz tartozó pakli elemek tömbje
  //     testverek: az adott entitás összes testvérének alap adatai
  this.allapot = {
    kivalasztottEntitasId: null,
    betoltesFolyamatban: false,
    paklikEsTestverek: {}
  };

  this.kivalasztottIndex = 0;       // aktív kártya indexe az aktív paklin belül
  this.swipeKuszob = 60;            // ennyi px alatt nem számít swipe-nak
  this.swipeAbortController = null; // wheel eseményfigyelő leállítója
  this.kartyadomElemek = [];        // DOM elemek referenciái index szerint
  this.kartyaPeldanyok = [];        // Kartya példányok referenciái index szerint
  // dupla API hívás védelem – eltárolja a folyamatban lévő testvér ID-ját
  this.testverBetoltesAlatt = null;
  // Testvér-jelző kacsacsőrök (‹ N / N ›) a kiválasztott kártya két szélén;
  // kattintásra testvérváltást indítanak
  this.testverJelzo = new TestverJelzo((irany) => this.testverValtasa(irany));

  console.log('Pakli.constructor - VÉGE', {
    tartalmKontenerAzonosito: this.tartalmKontenerAzonosito,
    vanKivalasztasValtasCallback: !!this.onKivalasztasValtas
  });
}

// ----- INICIALIZÁLÁS -----
// Lekéri a paklit az API-tól, majd rendereli.
// @param {string|null} entitasId - opcionális: melyik entitástól induljon
// @param {string|null} entitasTipus - opcionális: az entitás típusa
// @returns {Promise}
async init(entitasId = null, entitasTipus = null) {
  console.log('Pakli.init - KEZDÉS', { entitasId, entitasTipus });

  // VÁLTOZÁS: window.aktivPakli itt kerül beállításra, hogy
  // a kártyák renderelése közben már elérhető legyen
  window.aktivPakli = this;

  this.betoltesAllapotMegjelenites();
  try {
    await this.pakliLekerese(entitasId, entitasTipus);

    // ÜRES PAKLI ÁG (2026-07-18): ha a backend nem adott kiválasztott entitást:
    //  - MENTETT entitással hívtak (entitasId van) → false-t adunk, hogy a hívó
    //    (FoOldal._pakliInditasa) törölje a mentett adatot és gyökérről próbáljon;
    //  - gyökér-hívásnál (nincs entitasId) → tényleg üres az adatbázis:
    //    barátságos üres állapotot mutatunk (nem hibát!), és true-t adunk.
    if (!this.allapot.kivalasztottEntitasId) {
      if (entitasId) {
        console.warn('Pakli.init - VÉGE (mentett entitás nem található, újrapróbálás kell)');
        return false;
      }
      this.uresAllapotMegjelenites();
      console.log('Pakli.init - VÉGE (üres pakli)');
      return true;
    }

    await this.kivalasztottSzovegFrissitese();
    await this.paklitRendel();
    this.esemenyekBekotese();
    const aktivPakliMeret = this.allapot.kivalasztottEntitasId
      ? (this.allapot.paklikEsTestverek[this.allapot.kivalasztottEntitasId]?.pakli?.length ?? 0)
      : 0;
    console.log('Pakli.init - VÉGE', { aktivPakliMeret });
    return true;
  } catch (hiba) {
    console.error('Pakli.init - HIBA', { hiba: hiba.message });
    this.hibaAllapotMegjelenites(hiba.message);
    console.log('Pakli.init - VÉGE', { aktivPakliMeret: 0 });
    return false;
  }
}

// ----- PAKLI LEKÉRÉSE -----
// GET /api/pakli hívás, opcionális query paraméterekkel.
// A backend válaszát az allapot.paklikEsTestverek objektumba menti,
// a paklit és a testvéreket együtt, az entitasId kulcs alatt.
// @param {string|null} entitasId
// @param {string|null} entitasTipus
// @returns {Promise}
async pakliLekerese(entitasId, entitasTipus) {
  console.log('Pakli.pakliLekerese - KEZDÉS', { entitasId, entitasTipus });
  this.allapot.betoltesFolyamatban = true;
  let utvonal = 'pakli';
  if (entitasId && entitasTipus) {
    utvonal += `?entitasId=${entitasId}&entitasTipus=${entitasTipus}`;
  }
  const eredmeny = await apiGet(utvonal, this.token);
  console.log('Pakli.pakliLekerese - API válasz struktúra:', eredmeny);

  // ÜRES PAKLI VÉDELEM (2026-07-18): friss/üres adatbázisnál a backend
  // kivalasztottEntitas: null-t ad — ilyenkor nincs mit betölteni. A null-t
  // jelezzük az állapotban, a kezelést (üres állapot VAGY újrapróbálás) az
  // init() dönti el. Korábban itt null-hiba dőlt el, és a főoldal nem töltött be.
  if (!eredmeny?.kivalasztottEntitas?.entitasId) {
    console.warn('Pakli.pakliLekerese - VÉGE (üres pakli: nincs kiválasztott entitás)');
    this.allapot.kivalasztottEntitasId = null;
    this.allapot.betoltesFolyamatban = false;
    return;
  }

  const kulcs = eredmeny.kivalasztottEntitas.entitasId.toString();
  this.allapot.kivalasztottEntitasId = kulcs;
  this.allapot.paklikEsTestverek[kulcs] = {
    pakli: eredmeny.pakli ?? [],
    testverek: eredmeny.testverek ?? []
  };
  this.allapot.betoltesFolyamatban = false;
  const aktivPakli = this.allapot.paklikEsTestverek[kulcs].pakli;
  const talalat = aktivPakli.findIndex(
    (elem) => elem.entitasId.toString() === kulcs
  );
  this.kivalasztottIndex = talalat !== -1 ? talalat : 0;
  console.log('Pakli.pakliLekerese - VÉGE', {
    kivalasztottEntitasId: this.allapot.kivalasztottEntitasId,
    kivalasztottIndex: this.kivalasztottIndex,
    aktivPakliMeret: aktivPakli.length,
    testverekSzama: this.allapot.paklikEsTestverek[kulcs].testverek.length,
    elmentettPaklikSzama: Object.keys(this.allapot.paklikEsTestverek).length
  });
}

// ----- KIVÁLASZTOTT SZÖVEG FRISSÍTÉSE -----
// Lekéri a kiválasztott kártya szöveg/leírás/indoklás mezőjét,
// és eltárolja az allapot.paklikEsTestverek-ben az adott elemnél (adatok.szovegMezo).
// @returns {Promise}
async kivalasztottSzovegFrissitese() {
  console.log('Pakli.kivalasztottSzovegFrissitese - KEZDÉS', {
    kivalasztottIndex: this.kivalasztottIndex
  });
  const kulcs = this.allapot.kivalasztottEntitasId;
  const aktivPakli = kulcs ? this.allapot.paklikEsTestverek[kulcs]?.pakli : null;
  const kivalasztottElem = aktivPakli?.[this.kivalasztottIndex];
  if (!kivalasztottElem) {
    console.warn('Pakli.kivalasztottSzovegFrissitese - nincs kiválasztott elem');
    return;
  }
  console.log('Pakli.kivalasztottSzovegFrissitese - API HIVAS ELOTT', {
    entitasTipus: kivalasztottElem.entitasTipus,
    entitasId: kivalasztottElem.entitasId?.toString()
  });
  try {
    const eredmeny = await apiGet(
      `pakli/szoveg/${kivalasztottElem.entitasTipus}/${kivalasztottElem.entitasId}`,
      this.token
    );
    console.log('Pakli.kivalasztottSzovegFrissitese - API VALASZ', { eredmeny });
    const celElem = aktivPakli.find(
      (elem) => elem.entitasId.toString() === kivalasztottElem.entitasId.toString()
    );
    if (celElem) {
      if (!celElem.adatok) celElem.adatok = {};
      celElem.adatok.szovegMezo = eredmeny.szoveg ?? null;
    }
  } catch (hiba) {
    console.error('Pakli.kivalasztottSzovegFrissitese - HIBA', hiba);
    const celElemHiba = aktivPakli?.find(
      (elem) => elem.entitasId.toString() === kivalasztottElem.entitasId.toString()
    );
    if (celElemHiba) {
      if (!celElemHiba.adatok) celElemHiba.adatok = {};
      celElemHiba.adatok.szovegMezo = null;
    }
  }
  console.log('Pakli.kivalasztottSzovegFrissitese - VÉGE', {
    entitasId: kivalasztottElem.entitasId,
    vanSzoveg: !!aktivPakli?.[this.kivalasztottIndex]?.adatok?.szovegMezo
  });
}

// ----- PAKLI RENDERELÉSE -----
// Az allapot.paklikEsTestverek[kulcs].pakli tömb alapján példányosítja
// a kártya osztályokat és DOM-ba illeszti.
// A gyökér (pakli[0]) legalul, a levél legfelül jelenik meg.
// Szülő-kapcsolat vizsgálat minden szomszéd-párnál:
// - a gyerek kártya kapja a 'pakli-kartya--szulo-alatta' osztályt (szögletes alsó sarok, nincs alsó border)
// - a szülő kártya kapja a 'pakli-kartya--gyerek-felette' osztályt (::before pszeudo-elem a "becsúsztatott lap" hatáshoz)
// @returns {Promise}
async paklitRendel() {
  const kulcs = this.allapot.kivalasztottEntitasId;
  const aktivPakli = kulcs ? (this.allapot.paklikEsTestverek[kulcs]?.pakli ?? []) : [];
  console.log('Pakli.paklitRendel - KEZDÉS', { pakliMeret: aktivPakli.length, kivalasztottIndex: this.kivalasztottIndex });

  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) {
    console.error('Pakli.paklitRendel - HIBA: konténer nem található', { id: this.tartalmKontenerAzonosito });
    return;
  }

  kontener.innerHTML = '';
  this.kartyadomElemek = new Array(aktivPakli.length).fill(null);
  this.kartyaPeldanyok = new Array(aktivPakli.length).fill(null);

  const pakliWrapper = document.createElement('div');
  pakliWrapper.className = 'pakli-wrapper';
  pakliWrapper.id = 'pakli-wrapper';

  // FORDÍTVA iterálunk: levél kerül legfelülre, gyökér legalsóra a DOM-ban
  const forditottPakli = [...aktivPakli].reverse();
  for (const [forditottIndex, entitas] of forditottPakli.entries()) {
    const eredetiIndex = aktivPakli.length - 1 - forditottIndex;
    const kivalasztottE = eredetiIndex === this.kivalasztottIndex;

    const kartya = this.kartyaPeldanyositasa(
      entitas,
      kivalasztottE,
      () => this.kartyaKivalasztasa(eredetiIndex),
      this.modalKontenerAzonosito,
      () => this.init(),
      () => this.kivalasztottCsakCssValt(eredetiIndex)
    );

    const kartyaDom = await kartya.init();
    if (kartyaDom) {
      // Szülő-kapcsolat vizsgálat: az i. kártya szülője az i-1. kártya?
      // aktivPakli[eredetiIndex].szuloId === aktivPakli[eredetiIndex - 1]?.entitasId
      const alattaLevo = aktivPakli[eredetiIndex - 1];
      const szuloKapcsolatVanAlatta =
        alattaLevo &&
        entitas.szuloId != null &&
        entitas.szuloId.toString() === alattaLevo.entitasId.toString();

      if (szuloKapcsolatVanAlatta) {
        // A gyerek kártya alsó sarka szögletes lesz, alsó border eltűnik
        kartyaDom.classList.add('pakli-kartya--szulo-alatta');
        // A szülő kártya DOM elemére is szükség van – az eredetiIndex - 1 indexen van
        // de azt még nem rendereltük (fordítva iterálunk, tehát az i-1. elem később kerül sorra)
        // ezért a szülő DOM elemét a kartyaDomElemek tömbből NEM tudjuk kiolvasni még.
        // Helyette: a szülő kártyát majd akkor jelöljük meg, amikor az sorra kerül.
        // Ehhez egy jelzőt teszünk az aktivPakli elemre.
        alattaLevo._gyerekFelette = true;
      }

      // Ha ez az elem korábban jelölést kapott (gyerek van felette), rárakjuk az osztályt
      if (entitas._gyerekFelette) {
        // ::before pszeudo-elem a "becsúsztatott lap" hatáshoz – CSS kezeli
        kartyaDom.classList.add('pakli-kartya--gyerek-felette');
        // Jelző törlése – ne szennyezze az adatobjektumot renderelés után
        delete entitas._gyerekFelette;
      }

      pakliWrapper.appendChild(kartyaDom);
      this.kartyadomElemek[eredetiIndex] = kartyaDom;
      this.kartyaPeldanyok[eredetiIndex] = kartya;
    }
  }

  kontener.appendChild(pakliWrapper);

  // A kártyák most már a DOM-ban vannak → itt van értelme a mérésen alapuló
  // munkának. requestAnimationFrame: megvárjuk a következő festési kört, amikor a
  // böngésző már kiszámolta a tényleges méreteket.
  requestAnimationFrame(() => {
    // 1. A cím betűméretének PONTOS hozzáigazítása a tényleges szélességhez
    //    (az init()-beli karakterszám-becslést váltja fel). Lásd
    //    Kartya.cimBetumeretHozzaigazitasa.
    for (const kartya of this.kartyaPeldanyok) {
      if (kartya && typeof kartya.cimBetumeretHozzaigazitasa === 'function') {
        kartya.cimBetumeretHozzaigazitasa();
      }
    }
    // 2. Görgetés: a kiválasztott kártya az alsó sáv tetejéhez igazodik.
    this._kivalasztottKartyaGorgetese();
    // 3. Testvér-jelző kacsacsőrök a kiválasztott kártya két szélére.
    this.testverJelzoFrissitese();
  });

  console.log('Pakli.paklitRendel - VÉGE', { kartyakSzama: aktivPakli.length });
}

// ----- KIVÁLASZTOTT CSAK CSS VÁLT -----
// Hamburger megnyitásakor hívódik.
// Nem tölt be szöveget, nem renderel újra – csak CSS osztályt vált az érintett kártyákon.
// @param {number} ujIndex - a hamburger gombbal megnyitott kártya indexe
kivalasztottCsakCssValt(ujIndex) {
  console.log('Pakli.kivalasztottCsakCssValt - KEZDÉS', {
    ujIndex,
    korabbiIndex: this.kivalasztottIndex
  });

  if (ujIndex === this.kivalasztottIndex) {
    console.log('Pakli.kivalasztottCsakCssValt - VÉGE: már kiválasztott');
    return;
  }

  const regiDomElem = this.kartyadomElemek[this.kivalasztottIndex];
  if (regiDomElem) {
    regiDomElem.classList.remove('pakli-kartya--kivalasztott');
    regiDomElem.setAttribute('aria-selected', 'false');
  }

  const regiKartya = this.kartyaPeldanyok[this.kivalasztottIndex];
  if (regiKartya && typeof regiKartya.bodyElrejtes === 'function') {
    regiKartya.bodyElrejtes();
  }

  const ujDomElem = this.kartyadomElemek[ujIndex];
  if (ujDomElem) {
    ujDomElem.classList.add('pakli-kartya--kivalasztott');
    ujDomElem.setAttribute('aria-selected', 'true');
  }

  this.kivalasztottIndex = ujIndex;

  // A kacsacsőrök frissítése: ha az új kártya entitása nem egyezik az állapotban
  // tárolt kiválasztott entitással (pl. hamburger-megnyitás másik kártyán, ahol
  // a teljes kiválasztás-váltás nem fut le), a jelző magától elrejtőzik.
  this.testverJelzoFrissitese();

  console.log('Pakli.kivalasztottCsakCssValt - VÉGE', { ujIndex });
}

// ----- TESTVÉR-JELZŐ FRISSÍTÉSE -----
// A kiválasztott kártyára helyezi (vagy onnan leszedi) a ‹ N / N › kacsacsőröket.
// A számok a KÖZÖS testverRendezes.js segédből jönnek — ugyanabból a rendezett
// sorból, amiből a testverValtasa lépeget, így a szám és a lépés sosem tér el.
// Önvédő: ha nincs adat, nincs kártya, vagy a kártya entitása nem egyezik az
// állapotban tárolt kiválasztott entitással, a jelzőket eltávolítja.
testverJelzoFrissitese() {
  const kulcs = this.allapot.kivalasztottEntitasId;
  const adat = kulcs ? this.allapot.paklikEsTestverek[kulcs] : null;
  const kartyaDom = this.kartyadomElemek[this.kivalasztottIndex];
  const kartyaEntitas = this.kartyaPeldanyok[this.kivalasztottIndex]?.entitas;

  if (
    !adat ||
    !kartyaDom ||
    !kartyaEntitas ||
    kartyaEntitas.entitasId.toString() !== kulcs
  ) {
    console.log('Pakli.testverJelzoFrissitese - jelzők elrejtve (nincs adat vagy eltérő kártya)', {
      kulcs,
      vanAdat: !!adat,
      vanKartyaDom: !!kartyaDom
    });
    this.testverJelzo.eltavolitas();
    return;
  }

  // Az aktív elem a saját paklijából jön (ott biztosan megvannak a rendezéshez
  // szükséges mezők: hierarchikusOsszesPont, letrehozva); fallback a kártya entitása
  const aktivElem =
    adat.pakli?.find((elem) => elem.entitasId.toString() === kulcs) ?? kartyaEntitas;
  const { elozoSzam, kovetkezoSzam } = testverSzamok(aktivElem, adat.testverek ?? []);

  this.testverJelzo.megjelenites(kartyaDom, elozoSzam, kovetkezoSzam);

  console.log('Pakli.testverJelzoFrissitese - VÉGE', { kulcs, elozoSzam, kovetkezoSzam });
}

// ----- KÁRTYA PÉLDÁNYOSÍTÁSA -----
// Az entitásTípus alapján kiválasztja a megfelelő Kartya leszármazott osztályt.
// Központosított újratöltő callback: ha a hívó nem ad át entitasId-t,
// az authHelper-ből olvassa ki a mentett aktív entitást.
// @param {Object} entitas - A pakli elem a backend válaszából
// @param {boolean} kivalasztottE - Igaz, ha ez a kiválasztott kártya
// @param {Function} onKivalasztas - Koppintás callback
// @param {string} modalKontenerAzon - Modal konténer ID
// @param {Function} onUjratoltes - Pakli újratöltő callback (opcionális, felülírja az alapértelmezést)
// @param {Function} onHamburgerMegnyitas - Hamburger megnyitás callback – csak CSS váltás
// @returns {Kartya} A megfelelő típusú kártya példány
kartyaPeldanyositasa(entitas, kivalasztottE, onKivalasztas, modalKontenerAzon, onUjratoltes, onHamburgerMegnyitas) {
  console.log('Pakli.kartyaPeldanyositasa - KEZDÉS', { entitasTipus: entitas?.entitasTipus, kivalasztottE });

  // Központosított újratöltő callback – minden kártyatípus ezt kapja.
  // Ha a hívó (pl. TartalomKartya.onSiker) nem ad át entitasId-t,
  // az authHelper mentett értékéből dolgozunk, nem null-lal indulunk újra.
  const ujratoltesCb = (entitasId, entitasTipus) => {
    if (entitasId && entitasTipus) {
      // A hívó explicit értéket adott át – azt használjuk
      this.init(entitasId, entitasTipus);
    } else {
      // Nincs explicit érték – a mentett aktív entitást olvassuk ki
      const mentett = aktivEntitasLekerese();
      this.init(mentett?.entitasId ?? null, mentett?.entitasTipus ?? null);
    }
  };

  let kartya;
  switch (entitas.entitasTipus) {
    case 'Tartalom':
      kartya = new TartalomKartya(
        entitas,
        kivalasztottE,
        onKivalasztas,
        this.token,
        modalKontenerAzon,
        ujratoltesCb,           // ← központosított callback
        onHamburgerMegnyitas
      );
      break;
    case 'Kategoria':
      kartya = new KategoriaKartya(
        entitas,
        kivalasztottE,
        onKivalasztas,
        this.token,             // ← javaslat modal API hívásaihoz
        modalKontenerAzon,      // ← javaslat modal konténere
        ujratoltesCb,           // ← központosított callback
        onHamburgerMegnyitas
      );
      break;
    case 'TartalomTipus':
      kartya = new TartalomTipusKartya(
        entitas,
        kivalasztottE,
        onKivalasztas,
        this.token,             // ← javaslat modal API hívásaihoz
        modalKontenerAzon,      // ← javaslat modal konténere
        ujratoltesCb,           // ← központosított callback
        onHamburgerMegnyitas
      );
      break;
    case 'Javaslat':
      kartya = new JavaslatKartya(
        entitas,
        kivalasztottE,
        onKivalasztas,
        this.token,             // ← szavazat modal API hívásaihoz
        modalKontenerAzon,      // ← szavazat modal konténere
        ujratoltesCb,           // ← központosított callback
        onHamburgerMegnyitas
      );
      break;
    case 'Egyezmeny':
      kartya = new EgyezmenyKartya(
        entitas,
        kivalasztottE,
        onKivalasztas,
        this.token,             // ← tudatpont modal API hívásaihoz
        modalKontenerAzon,      // ← tudatpont modal konténere
        ujratoltesCb,           // ← központosított callback
        onHamburgerMegnyitas
      );
      break;
    default:
      console.warn('Pakli.kartyaPeldanyositasa - ismeretlen entitásTípus, alap Kartya használata', { entitasTipus: entitas?.entitasTipus });
      kartya = new Kartya(entitas, kivalasztottE, onKivalasztas, null, onHamburgerMegnyitas);
  }

  console.log('Pakli.kartyaPeldanyositasa - VÉGE', { entitasTipus: entitas?.entitasTipus });
  return kartya;
}

// ----- KÁRTYA KIVÁLASZTÁSA -----
// Koppintásra váltja a kiválasztott entitást a paklin belül.
async kartyaKivalasztasa(index) {
  console.log('Pakli.kartyaKivalasztasa - KEZDÉS', { index, korabbiIndex: this.kivalasztottIndex });

  if (index === this.kivalasztottIndex) {
    console.log('Pakli.kartyaKivalasztasa - VÉGE: már kiválasztott');
    return;
  }

  // 1. LÉPÉS – Azonnali CSS osztálycsere
  this.kivalasztottCsakCssValt(index);

  // 2. LÉPÉS – Szöveg lekérése az API-tól
  await this.kivalasztottSzovegFrissitese();

  // 3. LÉPÉS – A letöltött szöveg beírása célzottan az adott kártya body-jába
  const kulcs = this.allapot.kivalasztottEntitasId;
  const kartya = this.kartyaPeldanyok[this.kivalasztottIndex];
  const ujSzoveg = this.allapot.paklikEsTestverek[kulcs]
    ?.pakli?.[this.kivalasztottIndex]
    ?.adatok?.szovegMezo ?? null;

  if (kartya && typeof kartya.bodyFrissitese === 'function') {
    kartya.bodyFrissitese(ujSzoveg);
  }

  // 4. LÉPÉS – allapot.kivalasztottEntitasId frissítése + testvérlista cache feltöltése
  const ujKartya  = this.kartyaPeldanyok[this.kivalasztottIndex];
  const ujEntitas = ujKartya?.entitas ?? null;

  if (ujEntitas) {
    const ujKulcs = ujEntitas.entitasId.toString();
    this.allapot.kivalasztottEntitasId = ujKulcs;

    // VÁLTOZÁS: aktivEntitasMentese() helyett callback hívás
    // A FoOldal felelős a localStorage mentésért, a Pakli csak jelez
    if (typeof this.onKivalasztasValtas === 'function') {
      this.onKivalasztasValtas(ujKulcs, ujEntitas.entitasTipus);
    }

    if (!this.allapot.paklikEsTestverek[ujKulcs]) {
      console.log('Pakli.kartyaKivalasztasa - háttér cache feltöltés indul', { ujKulcs });
      this.pakliLekerese(ujKulcs, ujEntitas.entitasTipus)
        .then(() => {
          // A testvérlista megérkezett – ha közben nem váltottak tovább,
          // most már kirakhatók a kacsacsőrök az új kiválasztott kártyára
          this.testverJelzoFrissitese();
        })
        .catch(hiba => {
          console.error('Pakli.kartyaKivalasztasa - háttér cache hiba', { hiba: hiba.message });
        });
    } else {
      // A testvérlista már cache-ben van – a kacsacsőrök azonnal frissíthetők
      this.testverJelzoFrissitese();
    }
  }

  // 5. LÉPÉS – Görgetés
  this._kivalasztottKartyaGorgetese();

  console.log('Pakli.kartyaKivalasztasa - VÉGE', {
    ujIndex:     this.kivalasztottIndex,
    ujEntitasId: this.allapot.kivalasztottEntitasId,
    vanSzoveg:   !!ujSzoveg
  });
}

// ----- ENTITÁS KIVÁLASZTÁSA ID ALAPJÁN -----
// EntitasHivatkozasBlokk hívja, amikor egy hivatkozott entitásra koppintanak.
// Ugyanazt a folyamatot indítja el, mint oldalfrissítéskor –
// teljes pakli újratöltés az adott entitástól.
// @param {string} entitasId - a célentitás azonosítója
// @param {string} entitasTipus - a célentitás típusa
async entitasKivalasztasa(entitasId, entitasTipus) {
  console.log('Pakli.entitasKivalasztasa - KEZDÉS', { entitasId, entitasTipus });

  // Callback hívás – FoOldal menti localStorage-ba,
  // hogy utána oldalfrissítés esetén is ide térjen vissza
  if (typeof this.onKivalasztasValtas === 'function') {
    this.onKivalasztasValtas(entitasId.toString(), entitasTipus);
  }

  // Teljes újratöltés – pontosan ugyanaz, mint oldalfrissítéskor
  await this.init(entitasId.toString(), entitasTipus);

  console.log('Pakli.entitasKivalasztasa - VÉGE', { entitasId, entitasTipus });
}

// ----- ESEMÉNYEK BEKÖTÉSE -----
// Wheel eseményt figyelünk a vízszintes testvérváltáshoz.
// Debounce + instance-szintű jelző védi a többszörös gyors tüzelés ellen.
esemenyekBekotese() {
  console.log('Pakli.esemenyekBekotese - KEZDÉS');

  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;

  // Régi figyelő leállítása, hogy ne halmozódjanak
  if (this.swipeAbortController) {
    this.swipeAbortController.abort();
    console.log('Pakli.esemenyekBekotese - régi wheel figyelők leállítva');
  }

  this.swipeAbortController = new AbortController();
  const { signal } = this.swipeAbortController;

  // Closure-szintű debounce jelző – csak az aktuális figyelőre vonatkozik
  let swipeFolyamatban = false;

  kontener.addEventListener('wheel', (e) => {
    // Ha függőleges a domináns irány, kihagyjuk
    if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) return;
    // Küszöb: túl kis vízszintes elmozdulást kihagyjuk
    if (Math.abs(e.deltaX) < this.swipeKuszob) return;
    // Closure-szintű debounce
    if (swipeFolyamatban) return;
    // VÁLTOZÁS: instance-szintű védelem – betöltés közben nem indítunk új váltást
    if (this.testverBetoltesAlatt) return;

    swipeFolyamatban = true;

    const irany = e.deltaX > 0 ? 'kovetkezo' : 'elozo';
    console.log('Pakli.esemenyekBekotese - wheel esemény', { irany });

    this.testverValtasa(irany).finally(() => {
      swipeFolyamatban = false;
    });
  }, { signal });

  console.log('Pakli.esemenyekBekotese - VÉGE');
}

// ----- TESTVÉR VÁLTÁSA -----
// Wheel esemény hatására váltja az aktív paklit a következő vagy előző testvérre.
async testverValtasa(irany) {
  console.log('Pakli.testverValtasa - KEZDÉS', { irany });

  const kulcs = this.allapot.kivalasztottEntitasId;
  const testverek = this.allapot.paklikEsTestverek[kulcs]?.testverek ?? [];

  if (testverek.length === 0) {
    console.log('Pakli.testverValtasa - VÉGE: nincs testvér');
    return;
  }

  const aktivPakli = this.allapot.paklikEsTestverek[kulcs]?.pakli ?? [];
  const aktivElem = aktivPakli.find(e => e.entitasId.toString() === kulcs);
  if (!aktivElem) {
    console.log('Pakli.testverValtasa - VÉGE: az aktív elem nem található a pakliban');
    return;
  }

  // A teljes testvér-sorrend előállítása – az AKTÍV elemmel EGYÜTT –, hogy
  // pozíció szerint (index ± 1) tudjunk lépni. A rendezés a KÖZÖS
  // testverRendezes.js segédben él (a kacsacsőr-számok is onnan számolódnak,
  // így a kijelzett szám és a tényleges lépés sosem térhet el egymástól).
  const { teljesSor, aktivIndex } = testverSzamok(aktivElem, testverek);

  // Lépés a kívánt irányba.
  // 'kovetkezo' = lejjebb, alacsonyabb pont felé (index + 1);
  // 'elozo'     = feljebb, magasabb pont felé (index - 1).
  const celIndex = irany === 'kovetkezo' ? aktivIndex + 1 : aktivIndex - 1;

  if (celIndex < 0 || celIndex >= teljesSor.length) {
    console.log('Pakli.testverValtasa - VÉGE: elértük a sor végét', { irany });
    return;
  }

  const celTestver = teljesSor[celIndex];

  const celId = celTestver.entitasId.toString();

  if (this.testverBetoltesAlatt === celId) {
    console.log('Pakli.testverValtasa - VÉGE: már betöltés alatt', { celId });
    return;
  }

  console.log('Pakli.testverValtasa - cél testvér meghatározva', { celId, celTipus: celTestver.entitasTipus });

  // Irány eltárolása az animációhoz
  this.legutobbiIrany = irany;

  // Azonnali mentés, hogy részleges betöltés közben is helyes érték legyen
  aktivEntitasMentese(celId, celTestver.entitasTipus);

  // VÁLTOZÁS: nincs csonka fázis – közvetlenül a teljes betöltés indul
  // A betoltesAllapotMegjelenites ad vizuális visszajelzést betöltés közben
  this.betoltesAllapotMegjelenites();

  this.testverBetoltesAlatt = celId;
  try {
    this.allapot.kivalasztottEntitasId = celId;
    this.kivalasztottIndex = 0;

    await this.pakliLekerese(celId, celTestver.entitasTipus);
    await this.kivalasztottSzovegFrissitese();
    await this.paklitRendel();

    // Irány attribútum beállítása az animációhoz
    const wrapper = document.getElementById('pakli-wrapper');
    if (wrapper) {
      wrapper.setAttribute('data-irany', irany);
    }
  } catch (hiba) {
    console.error('Pakli.testverValtasa - API hiba', { hiba: hiba.message });
    this.hibaAllapotMegjelenites(hiba.message);
  } finally {
    this.testverBetoltesAlatt = null;
  }

  console.log('Pakli.testverValtasa - VÉGE', { celId });
}

// ----- CSONKA PAKLI MEGJELENÍTÉSE -----
// A testvér alap adataiból azonnal renderel egyetlen kártyát fejléccel,
// a body helyén töltő animációval. API hívás nélkül fut.
// @param {Object} testverElem - a testvér alap adatai (entitasId, entitasTipus, adatok, stb.)
// @returns {Promise}
async csonkaPakliMegjelenites(testverElem) {
  console.log('Pakli.csonkaPakliMegjelenites - KEZDÉS', {
    entitasId: testverElem.entitasId,
    entitasTipus: testverElem.entitasTipus
  });

  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;

  kontener.innerHTML = '';
  this.kartyadomElemek = [];
  this.kartyaPeldanyok = [];

  const pakliWrapper = document.createElement('div');
  pakliWrapper.className = 'pakli-wrapper';
  pakliWrapper.id = 'pakli-wrapper';

  // A testvér egyetlen kártyaként jelenik meg, kiválasztott állapotban
  const kartya = this.kartyaPeldanyositasa(
    testverElem,
    true, // kiválasztott: igen
    () => {}, // koppintás: üres, hamarosan felváltja a teljes render
    this.modalKontenerAzonosito,
    () => this.init(),
    () => {} // hamburger: üres, hamarosan felváltja
  );

  const kartyaDom = await kartya.init();
  if (kartyaDom) {
    // Töltő animáció jelzése a kártyán – a pakli.css kezeli a megjelenést
    kartyaDom.setAttribute('data-tolt', 'igen');
    pakliWrapper.appendChild(kartyaDom);
    this.kartyadomElemek[0] = kartyaDom;
    this.kartyaPeldanyok[0] = kartya;
  }

  kontener.appendChild(pakliWrapper);

  console.log('Pakli.csonkaPakliMegjelenites - VÉGE', { entitasId: testverElem.entitasId });
}

// ----- KIVÁLASZTOTT KÁRTYA GÖRGETÉSE -----
// A kiválasztott kártya body-jának alját az alsó sáv tetejéhez igazítja,
// smooth görgetéssel. Kártyaváltáskor, testvérváltáskor és renderelés után hívódik.
_kivalasztottKartyaGorgetese() {
  console.log('Pakli._kivalasztottKartyaGorgetese - KEZDÉS', {
    kivalasztottIndex: this.kivalasztottIndex
  });

  const kartyaDomElem = this.kartyadomElemek[this.kivalasztottIndex];
  if (!kartyaDomElem) {
    console.warn('Pakli._kivalasztottKartyaGorgetese - VÉGE: nincs kártya DOM elem');
    return;
  }

  // Az alsó sáv lekérdezése – position: fixed, getBoundingClientRect() adja a viewport pozícióját
  const alsoSav = document.querySelector('.also-sav');
  const alsoSavTeteje = alsoSav
    ? alsoSav.getBoundingClientRect().top  // px-ben, viewport tetejétől mérve
    : window.innerHeight;                  // ha nincs alsó sáv, a viewport aljáig számítunk

  // A kártya aktuális alsó széle a viewporthoz képest
  const kartyaAlseja = kartyaDomElem.getBoundingClientRect().bottom;

  // Mennyit kell görgetni: a kártya alja pontosan az alsó sáv tetejéhez kerüljön.
  // Pozitív érték: le kell görgetni, negatív: fel kell görgetni.
  const gorgetesiTavolsag = kartyaAlseja - alsoSavTeteje;

  console.log('Pakli._kivalasztottKartyaGorgetese - számítás', {
    kartyaAlseja,
    alsoSavTeteje,
    gorgetesiTavolsag
  });

  // Ha a különbség elhanyagolható (±2px), nem görgetünk – elkerüli a felesleges mikro-ugrást
  if (Math.abs(gorgetesiTavolsag) <= 2) {
    console.log('Pakli._kivalasztottKartyaGorgetese - VÉGE: nincs szükség görgetésre');
    return;
  }

  // Smooth görgetés a számított távolsággal
  window.scrollBy({
    top: gorgetesiTavolsag,
    behavior: 'smooth'
  });

  console.log('Pakli._kivalasztottKartyaGorgetese - VÉGE', { gorgetesiTavolsag });
}

// ----- BETÖLTÉSI ÁLLAPOT MEGJELENÍTÉSE -----
betoltesAllapotMegjelenites() {
  console.log('Pakli.betoltesAllapotMegjelenites - KEZDÉS');
  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;
  kontener.innerHTML = `
    <div class="pakli-betoltes">
      <span class="pakli-betoltes__jelzo"></span>
    </div>
  `;
  console.log('Pakli.betoltesAllapotMegjelenites - VÉGE');
}

// ----- ÜRES ÁLLAPOT MEGJELENÍTÉSE -----
// Friss/üres adatbázisnál (nincs egyetlen entitás sem) barátságos útmutató
// jelenik meg hibaüzenet helyett — az első tartalom a fő menüből hozható létre.
uresAllapotMegjelenites() {
  console.log('Pakli.uresAllapotMegjelenites - KEZDÉS');
  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;
  kontener.innerHTML = `
    <div class="pakli-ures">
      <span class="pakli-ures__ikon" aria-hidden="true">🌱</span>
      <span class="pakli-ures__szoveg">
        Még nincs tartalom a koino-n.<br>
        Hozd létre az elsőt a fő menü <strong>✏️ Új tartalom létrehozása</strong> pontjával!
      </span>
    </div>
  `;
  console.log('Pakli.uresAllapotMegjelenites - VÉGE');
}

// ----- HIBA ÁLLAPOT MEGJELENÍTÉSE -----
// @param {string} uzenet - a megjelenítendő hibaüzenet
hibaAllapotMegjelenites(uzenet) {
  console.log('Pakli.hibaAllapotMegjelenites - KEZDÉS', { uzenet });
  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;
  kontener.innerHTML = `
    <div class="pakli-hiba">
      <span class="pakli-hiba__szoveg">${uzenet} Nem sikerült betölteni a tartalmat.</span>
    </div>
  `;
  console.log('Pakli.hibaAllapotMegjelenites - VÉGE', { uzenet });
}

}

// --- EXPORTÁLÁS ---
export default Pakli;