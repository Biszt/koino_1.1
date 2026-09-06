// frontend/js/components/Pakli.js

// --- IMPORTOK ---
import { apiGet } from '../utils/apiHelper.js'; // GET kéréshez
import Kartya from './kartya/Kartya.js'; // Alap kártya osztály
import GondolatKartya from './kartya/GondolatKartya.js'; // Gondolat típusú kártya
import KategoriaKartya from './kartya/KategoriaKartya.js'; // Kategória típusú kártya
import GondolatTipusKartya from './kartya/GondolatTipusKartya.js'; // GondolatTípus kártya
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

  // ===== RENDEZÉS-MÓD (15. terv-pont) =====
  // 'hierarchikus' = a fa-szelet nézet (ALAP); 'ido'/'sajatPont' = LAPOS lista.
  // Lapos módban nincs testvér-navigáció (kacsacsőr/wheel) és nincs szülő-gyerek átfedés.
  this.rendezesMod = 'hierarchikus';  // 'hierarchikus' | 'ido' | 'sajatPont'
  this.rendezesIrany = 'csokkeno';    // 'csokkeno' | 'novekvo'
  this.rendezesAgazatId = null;       // null = globális; egyébként az ágazat-gyökér entitasId
  this.lapositottLista = [];          // a lapos módban rendezett elemek (a backend rendezése szerint)

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

  // ===== LAPOS MÓD ÁG (rendezés: idő / saját pont) =====
  // A hierarchikus fa-szelet helyett a /api/pakli/rendezett végpontról jövő lapos,
  // rendezett listát jeleníti meg — testvér/átfedés nélkül. Külön útvonal, mert az
  // adatszerkezet és a renderelés is eltér a hierarchikustól.
  if (this.rendezesMod !== 'hierarchikus') {
    return this._lapositottInit();
  }

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
// @param {boolean} csakCache - Ha true: CSAK a cache-t (paklikEsTestverek) tölti fel,
//   és NEM nyúl a kiválasztási állapothoz (kivalasztottEntitasId / kivalasztottIndex).
//   Ezt a háttér-cache feltöltés használja: a testvér-jelzőkhöz kell a testvérlista,
//   de a megjelenített paklihoz tartozó kiválasztási indexet nem szabad elmozdítania —
//   különben a fejléc és a body szétcsúszik (a szöveg rossz pakliból/indexből jönne).
async pakliLekerese(entitasId, entitasTipus, csakCache = false) {
  console.log('Pakli.pakliLekerese - KEZDÉS', { entitasId, entitasTipus, csakCache });
  if (!csakCache) this.allapot.betoltesFolyamatban = true;
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
    if (!csakCache) {
      this.allapot.kivalasztottEntitasId = null;
      this.allapot.betoltesFolyamatban = false;
    }
    return;
  }

  const kulcs = eredmeny.kivalasztottEntitas.entitasId.toString();
  // A cache-t MINDIG feltöltjük (ez a lényeg a háttér-hívásnál is).
  this.allapot.paklikEsTestverek[kulcs] = {
    pakli: eredmeny.pakli ?? [],
    testverek: eredmeny.testverek ?? []
  };

  // A KIVÁLASZTÁSI ÁLLAPOTOT csak a normál (nem cache-only) hívás állítja.
  if (!csakCache) {
    this.allapot.kivalasztottEntitasId = kulcs;
    this.allapot.betoltesFolyamatban = false;
    const aktivPakli = this.allapot.paklikEsTestverek[kulcs].pakli;
    const talalat = aktivPakli.findIndex(
      (elem) => elem.entitasId.toString() === kulcs
    );
    this.kivalasztottIndex = talalat !== -1 ? talalat : 0;
  }

  console.log('Pakli.pakliLekerese - VÉGE', {
    csakCache,
    kivalasztottEntitasId: this.allapot.kivalasztottEntitasId,
    kivalasztottIndex: this.kivalasztottIndex,
    aktivPakliMeret: this.allapot.paklikEsTestverek[kulcs].pakli.length,
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
  // A szöveget közvetlenül a KIVÁLASZTOTT PAKLI-ELEMRE töltjük. Ezt az init hívja,
  // amikor a kártyák még nincsenek példányosítva, ezért itt a pakli-elem a cél.
  await this._entitasSzovegBetoltese(kivalasztottElem);
  console.log('Pakli.kivalasztottSzovegFrissitese - VÉGE', {
    entitasId: kivalasztottElem.entitasId,
    vanSzoveg: !!kivalasztottElem.adatok?.szovegMezo
  });
}

// ----- EGY ENTITÁS SZÖVEG-MEZŐINEK BETÖLTÉSE -----
// Lekéri a megadott entitás (pakli-elem VAGY kártya.entitas) szöveg/leírás/indoklás
// mezőit, és RÁÍRJA a kapott objektum `adatok` mezőjére (szovegMezo + a fül-gondolatok).
// FONTOS: közvetlenül a KAPOTT objektumon dolgozik, nem a megosztott
// kivalasztottEntitasId-indexből olvas — így a fejléc és a body sosem csúszhat szét
// (a kártya mindig a SAJÁT entitását rendereli). Ezt a szétcsúszást okozta korábban,
// hogy a kiválasztás után a kivalasztottEntitasId a kijelölt kártyára ugrott, de a
// megjelenített pakli nem renderelődött újra.
// @param {Object} entitas - a cél objektum (kap egy `adatok` mezőt, ha nincs)
// @returns {Promise<Array|null>} a betöltött szöveg (szovegMezo), vagy null
async _entitasSzovegBetoltese(entitas) {
  if (!entitas) return null;
  if (!entitas.adatok) entitas.adatok = {};
  console.log('Pakli._entitasSzovegBetoltese - API HIVAS ELOTT', {
    entitasTipus: entitas.entitasTipus,
    entitasId: entitas.entitasId?.toString()
  });
  try {
    const eredmeny = await apiGet(
      `pakli/szoveg/${entitas.entitasTipus}/${entitas.entitasId}`,
      this.token
    );
    entitas.adatok.szovegMezo = eredmeny.szoveg ?? null;
    // Módosítási javaslatnál a javasolt ÚJ gondolat (a „Módosított gondolat"
    // fülhöz); más típusnál / entitásnál a backend null-t küld
    entitas.adatok.modositottGondolat = eredmeny.modositottGondolat ?? null;
    // Módosítási egyezménynél a LECSERÉLT (régi) gondolat (a „Lecserélt
    // gondolat" fülhöz); más típusnál / entitásnál null
    entitas.adatok.lecsereltGondolat = eredmeny.lecsereltGondolat ?? null;
    return entitas.adatok.szovegMezo;
  } catch (hiba) {
    console.error('Pakli._entitasSzovegBetoltese - HIBA', hiba);
    entitas.adatok.szovegMezo = null;
    entitas.adatok.modositottGondolat = null;
    entitas.adatok.lecsereltGondolat = null;
    return null;
  }
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

  // A testvér-navigáció figyelőinek (wheel + egeres húzás + érintéses swipe) ÚJRA-
  // bekötése. MIÉRT KELL ITT (2026-08-03, mobil-hiba oka): a LAPOS (rendezett) nézet
  // renderelése abort()-tal leállítja ezeket a figyelőket, és korábban csak az init()
  // kötötte be őket — így a laposból hierarchikusba visszatérve a nyilak ugyan
  // visszajöttek (azokat ez a render újra kirakja), de a HÚZÁS néma maradt.
  // Az esemenyekBekotese() idempotens (előbb abortálja a régi figyelőket), ezért
  // itt biztonságosan hívható minden hierarchikus rendereléskor.
  this.esemenyekBekotese();

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

// ==========================================================================
// LAPOS MÓD (rendezés: idő / saját pont) — a fenti hierarchikus úttól elkülönítve
// ==========================================================================

// ----- RENDEZÉS BEÁLLÍTÁSA (publikus — a Rendezés-modal hívja) -----
// Beállítja a rendezés-módot/irányt/ágazatot, majd újratölti a paklit.
// Hierarchikusra váltáskor a mentett aktív entitástól indul (fa-szelet);
// lapos módban az entitás irreleváns (globális vagy ágazat-szűrt lista).
// @param {string} mod - 'hierarchikus' | 'ido' | 'sajatPont'
// @param {string} irany - 'csokkeno' | 'novekvo'
// @param {string|null} agazatId - null = globális; egyébként az ágazat-gyökér entitasId
async rendezesBeallitasa(mod = 'hierarchikus', irany = 'csokkeno', agazatId = null) {
  console.log('Pakli.rendezesBeallitasa - KEZDÉS', { mod, irany, agazatId });

  this.rendezesMod = mod;
  this.rendezesIrany = irany;
  this.rendezesAgazatId = agazatId;
  this.kivalasztottIndex = -1; // lapos módban induláskor nincs kibontott kártya

  if (mod === 'hierarchikus') {
    // A fa-szelet nézethez kell a kiindulási entitás – a mentett aktívtól indulunk
    const mentett = aktivEntitasLekerese();
    await this.init(mentett?.entitasId ?? null, mentett?.entitasTipus ?? null);
  } else {
    await this.init();
  }

  // Jelzés a történet-kezelőnek (FoOldal): a pakli NÉZETE változott (rendezés).
  // A lapos mód nem hív aktivEntitasMentese-t, ezért külön eseménnyel jelezzük,
  // hogy a rendezés is bekerülhessen a vissza/előre történetbe.
  document.dispatchEvent(new CustomEvent('koino:rendezesValtozas', {
    detail: { mod, irany, agazatId }
  }));

  console.log('Pakli.rendezesBeallitasa - VÉGE', { mod });
}

// ----- LAPOS INICIALIZÁLÁS -----
// A rendezett listát lekéri és lapos módban rendereli. Az init() delegál ide,
// ha a rendezesMod nem 'hierarchikus'.
// @returns {Promise<boolean>}
async _lapositottInit() {
  console.log('Pakli._lapositottInit - KEZDÉS', {
    mod: this.rendezesMod, irany: this.rendezesIrany, agazatId: this.rendezesAgazatId
  });
  try {
    await this.rendezettLekerese();

    if (this.lapositottLista.length === 0) {
      this.uresAllapotMegjelenites();
      console.log('Pakli._lapositottInit - VÉGE (üres lista)');
      return true;
    }

    await this.lapositottRendel();
    console.log('Pakli._lapositottInit - VÉGE', { elemszam: this.lapositottLista.length });
    return true;
  } catch (hiba) {
    console.error('Pakli._lapositottInit - HIBA', { hiba: hiba.message });
    this.hibaAllapotMegjelenites(hiba.message);
    return false;
  }
}

// ----- RENDEZETT LISTA LEKÉRÉSE -----
// GET /api/pakli/rendezett?mod=&irany=&agazatId= — a választ a lapositottLista-ba menti.
// @returns {Promise}
async rendezettLekerese() {
  console.log('Pakli.rendezettLekerese - KEZDÉS', {
    mod: this.rendezesMod, irany: this.rendezesIrany, agazatId: this.rendezesAgazatId
  });

  let utvonal = `pakli/rendezett?mod=${this.rendezesMod}&irany=${this.rendezesIrany}`;
  if (this.rendezesAgazatId) utvonal += `&agazatId=${this.rendezesAgazatId}`;

  const eredmeny = await apiGet(utvonal, this.token);
  this.lapositottLista = eredmeny.rendezettLista ?? [];

  console.log('Pakli.rendezettLekerese - VÉGE', { elemszam: this.lapositottLista.length });
}

// ----- LAPOS RENDERELÉS -----
// A lapositottLista alapján egyszerű, rendezett kártyalistát rajzol:
// NINCS fordított iterálás, NINCS szülő-gyerek átfedés-osztály, NINCS testvér-jelző,
// NINCS wheel-esemény. A kártyák a backend rendezése szerint fentről lefelé.
// @returns {Promise}
async lapositottRendel() {
  console.log('Pakli.lapositottRendel - KEZDÉS', { elemszam: this.lapositottLista.length });

  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) {
    console.error('Pakli.lapositottRendel - HIBA: konténer nem található');
    return;
  }

  kontener.innerHTML = '';
  this.kartyadomElemek = new Array(this.lapositottLista.length).fill(null);
  this.kartyaPeldanyok = new Array(this.lapositottLista.length).fill(null);

  // A régi wheel-figyelő leállítása (ha hierarchikusból váltottunk) – lapos módban nincs testvérváltás
  if (this.swipeAbortController) {
    this.swipeAbortController.abort();
    this.swipeAbortController = null;
  }
  // Lapos módban nincsenek kacsacsőrök
  this.testverJelzo.eltavolitas();

  const wrapper = document.createElement('div');
  wrapper.className = 'pakli-wrapper pakli-wrapper--lapos';
  wrapper.id = 'pakli-wrapper';

  for (const [index, entitas] of this.lapositottLista.entries()) {
    const kartya = this.kartyaPeldanyositasa(
      entitas,
      false, // induláskor egyik kártya sincs kibontva
      () => this.lapositottKartyaKivalasztasa(index),
      this.modalKontenerAzonosito,
      () => this.init(), // újratöltés a jelenlegi (lapos) móddal
      () => this.lapositottCsakCssValt(index) // hamburger megnyitás – csak CSS
    );

    const kartyaDom = await kartya.init();
    if (kartyaDom) {
      wrapper.appendChild(kartyaDom);
      this.kartyadomElemek[index] = kartyaDom;
      this.kartyaPeldanyok[index] = kartya;
    }
  }

  kontener.appendChild(wrapper);

  // A cím betűméretének pontos hozzáigazítása (mint a hierarchikusnál)
  requestAnimationFrame(() => {
    for (const kartya of this.kartyaPeldanyok) {
      if (kartya && typeof kartya.cimBetumeretHozzaigazitasa === 'function') {
        kartya.cimBetumeretHozzaigazitasa();
      }
    }
  });

  console.log('Pakli.lapositottRendel - VÉGE', { kartyakSzama: this.lapositottLista.length });
}

// ----- LAPOS KÁRTYA KIVÁLASZTÁSA (koppintás → body kibontás) -----
// A hierarchikus kartyaKivalasztasa egyszerűsített párja: testvér-cache és
// localStorage-mentés nélkül. Csak a body-t bontja ki és tölti fel szöveggel.
// @param {number} index - a lapos listán belüli index
async lapositottKartyaKivalasztasa(index) {
  console.log('Pakli.lapositottKartyaKivalasztasa - KEZDÉS', { index, korabbiIndex: this.kivalasztottIndex });

  if (index === this.kivalasztottIndex) {
    console.log('Pakli.lapositottKartyaKivalasztasa - VÉGE: már kiválasztott');
    return;
  }

  // 1. CSS-váltás (régi body elrejtése + új kiemelése)
  this.lapositottCsakCssValt(index);

  // 2. Szöveg lekérése az adott elemre és beírása a body-jába
  const elem = this.lapositottLista[index];
  const kartya = this.kartyaPeldanyok[index];
  try {
    const eredmeny = await apiGet(`pakli/szoveg/${elem.entitasTipus}/${elem.entitasId}`, this.token);
    if (kartya && typeof kartya.bodyFrissitese === 'function') {
      kartya.bodyFrissitese(eredmeny.szoveg ?? null);
    }
  } catch (hiba) {
    console.error('Pakli.lapositottKartyaKivalasztasa - szöveg HIBA', { hiba: hiba.message });
    if (kartya && typeof kartya.bodyFrissitese === 'function') kartya.bodyFrissitese(null);
  }

  // 3. Görgetés a kiválasztott kártyához (közös segéd)
  this._kivalasztottKartyaGorgetese();

  console.log('Pakli.lapositottKartyaKivalasztasa - VÉGE', { index });
}

// ----- LAPOS CSAK CSS VÁLT -----
// A hierarchikus kivalasztottCsakCssValt párja, testvér-jelző nélkül.
// @param {number} ujIndex
lapositottCsakCssValt(ujIndex) {
  console.log('Pakli.lapositottCsakCssValt - KEZDÉS', { ujIndex, korabbiIndex: this.kivalasztottIndex });

  if (ujIndex === this.kivalasztottIndex) return;

  const regiDom = this.kartyadomElemek[this.kivalasztottIndex];
  if (regiDom) {
    regiDom.classList.remove('pakli-kartya--kivalasztott');
    regiDom.setAttribute('aria-selected', 'false');
  }
  const regiKartya = this.kartyaPeldanyok[this.kivalasztottIndex];
  if (regiKartya && typeof regiKartya.bodyElrejtes === 'function') {
    regiKartya.bodyElrejtes();
  }

  const ujDom = this.kartyadomElemek[ujIndex];
  if (ujDom) {
    ujDom.classList.add('pakli-kartya--kivalasztott');
    ujDom.setAttribute('aria-selected', 'true');
  }

  this.kivalasztottIndex = ujIndex;

  console.log('Pakli.lapositottCsakCssValt - VÉGE', { ujIndex });
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
  // Ha a hívó (pl. GondolatKartya.onSiker) nem ad át entitasId-t,
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
    case 'Gondolat':
      kartya = new GondolatKartya(
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
    case 'GondolatTipus':
      kartya = new GondolatTipusKartya(
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

  // 2.+3. LÉPÉS – A szöveget KÖZVETLENÜL a kiválasztott kártya SAJÁT entitására töltjük,
  // és annak body-jába írjuk. Így a fejléc és a body SOSEM csúszhat szét — akkor sem,
  // ha a megosztott kivalasztottEntitasId/kivalasztottIndex időközben elmozdult.
  const kartya = this.kartyaPeldanyok[this.kivalasztottIndex];
  const kivalasztottEntitas = kartya?.entitas ?? null;
  const ujSzoveg = await this._entitasSzovegBetoltese(kivalasztottEntitas);

  // Verseny-védelem: csak akkor rajzoljuk ki a body-t, ha a lekérés végére MÉG MINDIG
  // ez a kártya a kiválasztott (gyors kattintgatásnál a régi lekérés ne írjon felül).
  if (
    kartya &&
    kartya === this.kartyaPeldanyok[this.kivalasztottIndex] &&
    typeof kartya.bodyFrissitese === 'function'
  ) {
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
      // csakCache=true: CSAK a testvérlistát tölti a cache-be, a kiválasztási
      // indexet NEM mozdítja el (különben a megjelenített paklitól elcsúszna).
      this.pakliLekerese(ujKulcs, ujEntitas.entitasTipus, true)
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

// ----- AKTUÁLIS ENTITÁS LEKÉRÉSE -----
// Tiszta, publikus lekérő: az ÉPPEN kiválasztott kártya entitása.
// A FoOldal használja a történet-kezelő (vissza/előre) kezdő állapotának
// beültetéséhez, mert innen tudja meg az aktuális entitás típusát is.
// @returns {{ entitasId: string, entitasTipus: string }|null} - null, ha nincs kártya
aktualisEntitas() {
  const kartya = this.kartyaPeldanyok?.[this.kivalasztottIndex];
  const ent = kartya?.entitas ?? null;
  if (!ent) {
    console.log('Pakli.aktualisEntitas - nincs kiválasztott kártya');
    return null;
  }
  return { entitasId: ent.entitasId.toString(), entitasTipus: ent.entitasTipus };
}

// ----- ESEMÉNYEK BEKÖTÉSE -----
// A vízszintes testvérváltás két egeres/érintős módja:
//   1. wheel (vízszintes deltaX — érintőpad / Shift+görgetés),
//   2. bal gomb + vízszintes HÚZÁS (hagyományos egérre is — carousel/swipe minta).
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

  // ===== VÍZSZINTES HÚZÁS (egér ÉS érintés) → testvérváltás =====
  // A wheel-navigáció párja hagyományos egérre (Csaba kérése, 2026-08-02): egy
  // sima egérgörgő csak függőleges deltaY-t ad, ezért a vízszintes wheel nem megy
  // vele. A nyomva tartott bal gomb + vízszintes húzás viszont igen — ez a
  // carousel/swipe minta párja egérrel, ugyanazzal az iránnyal és küszöbbel.
  //
  // Pointer-események → ugyanez a kód viszi az ÉRINTÉSES swipe-ot is (mobil).
  // FONTOS: ehhez kell a `.pakli-wrapper { touch-action: pan-y }` a pakli.css-ben,
  // különben a böngésző elveszi az oldalirányú mozdulatot görgetésre és
  // 'pointercancel'-lel megszakít minket (2026-08-03-i mobil-hiba oka).
  //
  // A swipeKuszob (60px) védi a sima kattintást: kattintás = kártyaválasztás marad,
  // csak a küszöböt átlépő húzás vált testvért. A húzást lezáró 'click'-et
  // capture-fázisban elnyeljük, hogy ne váltson kártya-kiválasztást is.
  let huzasStartX = null;          // a lenyomás X-e (null = nincs folyamatban lévő húzás)
  let huzasStartY = null;
  let huzasKuszobAtlepve = false;  // valódi húzás történt-e (a kattintás elnyomásához)

  // A húzás állapotának visszaállítása (közös: pointerup és pointercancel után is)
  const huzasVisszaallitas = () => {
    huzasStartX = null;
    huzasStartY = null;
    document.body.classList.remove('testver-huzas-folyamatban');
  };

  kontener.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;                           // többujjas érintés (pl. nagyítás) nem húzás
    // ÉRINTÉST NEM ITT kezelünk: a mobil swipe-ot a lentebbi natív touch-figyelők
    // viszik (azok minden böngészőben mennek és preventDefault-tal el tudják venni
    // a gesztust). Enélkül egy érintés MINDKÉT ágon lefutna → dupla testvérváltás.
    if (e.pointerType === 'touch') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // egérnél csak a BAL gomb
    if (e.target.closest('.testver-jelzo')) return;     // a nyíl-gombon ne induljon húzás
    huzasStartX = e.clientX;
    huzasStartY = e.clientY;
    huzasKuszobAtlepve = false;
  }, { signal });

  // A move/up a window-on figyel, hogy a húzás akkor is végigkövethető legyen,
  // ha a kurzor közben elhagyja a paklit.
  window.addEventListener('pointermove', (e) => {
    if (huzasStartX === null) return;
    const dx = e.clientX - huzasStartX;
    const dy = e.clientY - huzasStartY;
    // Csak akkor húzás, ha a VÍZSZINTES elmozdulás dominál és átlépi a küszöböt.
    if (!huzasKuszobAtlepve &&
        Math.abs(dx) >= this.swipeKuszob &&
        Math.abs(dx) > Math.abs(dy)) {
      huzasKuszobAtlepve = true;
      document.body.classList.add('testver-huzas-folyamatban'); // szövegkijelölés tiltása + fogó-kurzor
    }
  }, { signal });

  // Ha a böngésző elveszi a mozdulatot (pl. mégis függőleges görgetés lett belőle),
  // 'pointercancel' jön 'pointerup' HELYETT — ilyenkor csak takarítunk, nem váltunk.
  window.addEventListener('pointercancel', () => {
    if (huzasStartX === null) return;
    console.log('Pakli.esemenyekBekotese - húzás megszakítva (pointercancel)');
    huzasVisszaallitas();
    huzasKuszobAtlepve = false;
  }, { signal });

  window.addEventListener('pointerup', (e) => {
    if (huzasStartX === null) return;
    const dx = e.clientX - huzasStartX;
    huzasVisszaallitas();

    if (!huzasKuszobAtlepve) return;          // nem volt húzás → marad a normál kattintás
    if (this.testverBetoltesAlatt) return;    // betöltés közben nem indítunk új váltást
    if (swipeFolyamatban) return;

    // Balra húzás (dx<0) → következő testvér; jobbra húzás → előző (carousel-logika).
    const irany = dx < 0 ? 'kovetkezo' : 'elozo';
    console.log('Pakli.esemenyekBekotese - húzás esemény', { irany, dx });

    swipeFolyamatban = true;
    this.testverValtasa(irany).finally(() => {
      swipeFolyamatban = false;
    });
  }, { signal });

  // A húzást lezáró kattintást capture-fázisban elnyeljük (a kártya click-figyelője
  // ELŐTT fut), hogy a húzás ne váltson kártya-kiválasztást is.
  kontener.addEventListener('click', (e) => {
    if (huzasKuszobAtlepve) {
      e.stopPropagation();
      e.preventDefault();
      huzasKuszobAtlepve = false;
    }
  }, { capture: true, signal });

  // ===== ÉRINTÉSES SWIPE (mobil) — natív touch-események =====
  // Miért külön, a pointer-ág mellett (2026-08-03)? Mert mobilon a pointer-alapú
  // húzás nem működött: a böngésző a saját görgetésének foglalta le a mozdulatot,
  // és 'pointercancel'-lel megszakított minket. A natív touch-figyelők MINDEN mobil
  // böngészőben mennek, és — mivel a KONTÉNERRE, `passive: false`-szal kötjük be —
  // a touchmove-ban `preventDefault()`-tal EL TUDJUK VENNI a gesztust a böngészőtől.
  //
  // Az irányt egyszer, az első ~10px elmozdulásnál eldöntjük és RÖGZÍTJÜK:
  //  - függőleges → hozzá se nyúlunk, marad a normál lapgörgetés,
  //  - vízszintes → miénk a gesztus (preventDefault), és a küszöböt átlépve váltunk.
  const IRANY_DONTES_PX = 10;   // ennyi elmozdulás után döntjük el, merre indult az ujj
  let erintesStartX  = null;
  let erintesStartY  = null;
  let erintesVizszintes = false; // a rögzített irány: true = miénk a gesztus
  let erintesDontve  = false;    // eldöntöttük-e már az irányt

  kontener.addEventListener('touchstart', (e) => {
    // Új érintés indul: a kattintás-elnyomó jelzőt MINDIG nullázzuk, különben egy
    // korábbi swipe után beragadna, és a következő koppintás nem választana kártyát.
    huzasKuszobAtlepve = false;

    if (e.touches.length !== 1) return;               // többujjas (nagyítás) nem swipe
    if (e.target.closest('.testver-jelzo')) return;   // a nyíl-gombon ne induljon swipe
    erintesStartX = e.touches[0].clientX;
    erintesStartY = e.touches[0].clientY;
    erintesVizszintes = false;
    erintesDontve = false;
  }, { passive: false, signal });

  kontener.addEventListener('touchmove', (e) => {
    if (erintesStartX === null) return;
    if (e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - erintesStartX;
    const dy = e.touches[0].clientY - erintesStartY;

    // Az irány egyszeri eldöntése (és rögzítése) az első érdemi elmozdulásnál
    if (!erintesDontve && (Math.abs(dx) > IRANY_DONTES_PX || Math.abs(dy) > IRANY_DONTES_PX)) {
      erintesDontve = true;
      erintesVizszintes = Math.abs(dx) > Math.abs(dy);
    }

    // Vízszintes gesztus: a MIÉNK — megakadályozzuk, hogy a böngésző elvegye görgetésre
    if (erintesVizszintes && e.cancelable) {
      e.preventDefault();
    }
  }, { passive: false, signal });

  kontener.addEventListener('touchend', (e) => {
    if (erintesStartX === null) return;

    const veg = e.changedTouches[0];
    const dx  = veg ? veg.clientX - erintesStartX : 0;
    const vizszintesVolt = erintesVizszintes;

    erintesStartX = null;
    erintesStartY = null;
    erintesVizszintes = false;
    erintesDontve = false;

    if (!vizszintesVolt) return;                    // függőleges volt → nem a mi dolgunk
    if (Math.abs(dx) < this.swipeKuszob) return;    // túl rövid swipe → nincs váltás
    if (this.testverBetoltesAlatt) return;
    if (swipeFolyamatban) return;

    // A koppintás utáni kártya-kiválasztást is elnyomjuk (a click a touchend után jön)
    huzasKuszobAtlepve = true;

    // Balra swipe (dx<0) → következő testvér; jobbra → előző (ugyanaz, mint egérrel).
    const irany = dx < 0 ? 'kovetkezo' : 'elozo';
    console.log('Pakli.esemenyekBekotese - érintéses swipe', { irany, dx });

    swipeFolyamatban = true;
    this.testverValtasa(irany).finally(() => {
      swipeFolyamatban = false;
    });
  }, { passive: false, signal });

  kontener.addEventListener('touchcancel', () => {
    erintesStartX = null;
    erintesStartY = null;
    erintesVizszintes = false;
    erintesDontve = false;
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

  // Cél-index a kívánt irány szerint.
  // 'kovetkezo' = lejjebb (index + 1); 'elozo' = feljebb (index - 1);
  // 'legutolso' = a sor VÉGÉRE (utolsó index); 'legelso' = a sor ELEJÉRE (0).
  let celIndex;
  switch (irany) {
    case 'kovetkezo': celIndex = aktivIndex + 1;           break;
    case 'elozo':     celIndex = aktivIndex - 1;           break;
    case 'legutolso': celIndex = teljesSor.length - 1;     break;
    case 'legelso':   celIndex = 0;                        break;
    default:          celIndex = aktivIndex;
  }

  // Ha nincs hova lépni (kilóg a sorból, vagy már ott állunk) → nincs teendő.
  if (celIndex < 0 || celIndex >= teljesSor.length || celIndex === aktivIndex) {
    console.log('Pakli.testverValtasa - VÉGE: nincs hova lépni', { irany, celIndex, aktivIndex });
    return;
  }

  // Az ANIMÁCIÓ iránya csak balra/jobbra lehet: az ugrások is a megfelelő
  // oldalra „húznak" (legelso → mint elozo, legutolso → mint kovetkezo).
  const animIrany = (irany === 'elozo' || irany === 'legelso') ? 'elozo' : 'kovetkezo';

  const celTestver = teljesSor[celIndex];

  const celId = celTestver.entitasId.toString();

  if (this.testverBetoltesAlatt === celId) {
    console.log('Pakli.testverValtasa - VÉGE: már betöltés alatt', { celId });
    return;
  }

  console.log('Pakli.testverValtasa - cél testvér meghatározva', { celId, celTipus: celTestver.entitasTipus });

  // Irány eltárolása az animációhoz (az ugrások is bal/jobb animációt kapnak)
  this.legutobbiIrany = animIrany;

  // Azonnali mentés, hogy részleges betöltés közben is helyes érték legyen.
  // (Ez küldi a koino:aktivEntitasValtozas eseményt is, így a testvér-ugrás
  //  automatikusan bekerül a vissza/előre történetbe – külön jelzés nem kell.)
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
      wrapper.setAttribute('data-irany', animIrany);
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
// jelenik meg hibaüzenet helyett — az első gondolat a fő menüből hozható létre.
uresAllapotMegjelenites() {
  console.log('Pakli.uresAllapotMegjelenites - KEZDÉS');
  const kontener = document.getElementById(this.tartalmKontenerAzonosito);
  if (!kontener) return;
  kontener.innerHTML = `
    <div class="pakli-ures">
      <span class="pakli-ures__ikon" aria-hidden="true">🌱</span>
      <span class="pakli-ures__szoveg">
        Még nincs gondolat a koino-n.<br>
        Hozd létre az elsőt a fő menü <strong>✏️ Új gondolat létrehozása</strong> pontjával!
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
      <span class="pakli-hiba__szoveg">${uzenet} Nem sikerült betölteni a gondolatot.</span>
    </div>
  `;
  console.log('Pakli.hibaAllapotMegjelenites - VÉGE', { uzenet });
}

}

// --- EXPORTÁLÁS ---
export default Pakli;