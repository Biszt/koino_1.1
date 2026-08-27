// koino/js/allapot/allapotSzamitas.js

// Felelősség: az aláírt eseményekből KISZÁMOLNI a jelenlegi állapotot — mely entitások
// léteznek, ki hova rendelt tudatpontot, mik az érvényes küszöbök.
//
// EZ A KOINO SZÍVE A FÁZIS 2-BEN. A prototípusban az állapot ÁLLÍTÁS volt: a szerver
// azt mondta, „ez a tartalom így néz ki", és el kellett hinni. Itt az állapot
// SZÁMÍTÁS: ugyanabból az eseményhalmazból mindenki ugyanazt kapja (D17). Nincs mit
// elhinni — utána lehet számolni.
//
// A FÜGGVÉNY TISZTA: bemenet az események tömbje, kimenet az állapot. Nincs benne
// hálózat, nincs benne adatbázis, nincs benne idő-függés (az „idő" is bemenet). Ezért
// bármikor újraszámolható és bárki által ellenőrizhető.
//
// ⭐ MIÉRT NEM KELL GLOBÁLIS SORREND?
// Mert a koino műveletei „e-emberenként az utolsó nyer" típusúak: hogy ki mennyi
// tudatpontot rendelt egy entitáshoz, azt a SAJÁT láncának utolsó ilyen eseménye
// mondja meg. Az „utolsó" pedig a saját láncban egyértelmű (sorszám), függetlenül
// attól, milyen sorrendben érkeztek meg az események. Így nem kell sem globális
// sorrend, sem ütközés-feloldó könyvtár (CRDT).
//
// Használják: fo.js és a felület; a következő lépésben a javaslat/szavazat számítása.

// ===================================
// ELÁGAZÁS-FELOLDÁS
// ===================================

/**
 * Kiválasztja az érvényes eseményeket, feloldva az elágazásokat.
 *
 * ⚠️ TERVEZÉSI DÖNTÉS: ha valaki két különböző eseményt írt alá ugyanarról a pontról
 * (azonos szerző + azonos sorszám), akkor az azonosító szerint KISEBBET vesszük.
 *
 * Miért nem zárjuk ki a csalót? Mert az elágazás nem mindig csalás: ha valakinek két
 * készüléke van, és mindkettő OFFLINE volt, természetes módon keletkezhet elágazás —
 * és a hangja elvesztése aránytalan büntetés lenne egy hétköznapi helyzetért.
 *
 * Miért determinisztikus a választás? Mert így MINDENKI ugyanazt az állapotot számolja,
 * és a csalásnak nincs haszna: nem tud két különböző embernek két különböző eredményt
 * mutatni. Az ellentmondás közben LÁTHATÓ marad (a tár jelzi, lásd esemenyTar.js) —
 * a koino bejelent, nem büntet (D19).
 *
 * @param {Array<Object>} esemenyek
 * @returns {{ervenyesek: Array<Object>, ellentmondasok: Array<Object>}}
 */
export function elagazasokFeloldasa(esemenyek) {
  const kulcsSzerint = new Map();      // "szerzo|sorszam" → események
  for (const e of esemenyek) {
    const kulcs = e.szerzo + '|' + e.sorszam;
    if (!kulcsSzerint.has(kulcs)) kulcsSzerint.set(kulcs, []);
    kulcsSzerint.get(kulcs).push(e);
  }

  const ervenyesek = [];
  const ellentmondasok = [];

  for (const [kulcs, ittLevok] of kulcsSzerint) {
    if (ittLevok.length === 1) {
      ervenyesek.push(ittLevok[0]);
      continue;
    }
    // Elágazás: determinisztikus választás az azonosító szerint
    const rendezett = [...ittLevok].sort((a, b) => (a.azonosito < b.azonosito ? -1 : 1));
    ervenyesek.push(rendezett[0]);
    ellentmondasok.push({
      szerzo: rendezett[0].szerzo,
      sorszam: rendezett[0].sorszam,
      azonositok: rendezett.map((e) => e.azonosito)
    });
  }

  return { ervenyesek, ellentmondasok };
}

// ===================================
// SEGÉD: „AZ UTOLSÓ NYER" NYILVÁNTARTÁS
// ===================================

/**
 * Egy olyan tárolót ad, ami kulcsonként MINDIG a szerző láncában legkésőbbi értéket
 * őrzi meg — függetlenül attól, milyen sorrendben kapja őket.
 * @returns {{rogzit: Function, ertekek: Map}}
 */
function utolsoNyer() {
  const ertekek = new Map();   // kulcs → { sorszam, ertek, esemeny }

  return {
    /**
     * @param {string} kulcs
     * @param {Object} esemeny - ebből a `sorszam` dönt
     * @param {*} ertek
     */
    rogzit(kulcs, esemeny, ertek) {
      const meglevo = ertekek.get(kulcs);
      if (!meglevo || esemeny.sorszam > meglevo.sorszam) {
        ertekek.set(kulcs, { sorszam: esemeny.sorszam, ertek, esemeny });
      }
    },
    ertekek
  };
}

// ===================================
// MEDIÁN — a küszöbök számítása (D4)
// ===================================

/**
 * Egy számsor mediánja. Páros elemszámnál a KISEBBET vesszük — nem átlagolunk, mert
 * az törtszámot adna, és az eseményekben csak egész szám lehet (a kanonikus alak
 * szabálya). A medián „matematikailag is szavazás": csak létszámmal billenthető,
 * szélsőértékkel nem (D4).
 * @param {Array<number>} szamok
 * @returns {number|null}
 */
export function median(szamok) {
  if (!szamok.length) return null;
  const rendezett = [...szamok].sort((a, b) => a - b);
  const kozep = Math.floor((rendezett.length - 1) / 2);
  return rendezett[kozep];
}

// ===================================
// AZ ÁLLAPOT KISZÁMÍTÁSA
// ===================================

/**
 * Kiszámolja a koino jelenlegi állapotát az eseményekből.
 *
 * @param {Array<Object>} esemenyek - egy koino összes ismert eseménye
 * @returns {Object} az állapot
 */
export function allapotSzamitasa(esemenyek) {
  console.log('allapotSzamitasa - KEZDÉS', { esemenyDarab: esemenyek.length });

  const { ervenyesek, ellentmondasok } = elagazasokFeloldasa(esemenyek);

  // ----- NYERSANYAG-GYŰJTÉS -----
  const koinoAdatok = { nev: null, leiras: null };
  const letrehozasok = new Map();        // entitás azonosító → a létrehozó esemény
  const pontok = utolsoNyer();           // "szerzo|entitas" → pontszám
  const ertekJavaslatok = utolsoNyer();  // "szerzo|entitas" → küszöb-négyes

  for (const e of ervenyesek) {
    switch (e.tipus) {

      // ----- A KOINO MAGA -----
      case 'KoinoLetrehozas':
        koinoAdatok.nev = e.adat.nev;
        koinoAdatok.leiras = e.adat.leiras ?? null;
        koinoAdatok.letrehozo = e.szerzo;
        koinoAdatok.letrehozva = e.ido;
        break;

      // ----- ENTITÁS LÉTREHOZÁSA -----
      // Az entitás AZONOSÍTÓJA a létrehozó esemény azonosítója: az entitás neve is a
      // tartalmából származik, nem egy kiosztott sorszám.
      case 'TartalomLetrehozas':
        letrehozasok.set(e.azonosito, e);
        break;

      // ----- TUDATPONT-RENDEZÉS -----
      // „Az utolsó nyer" (e-ember + entitás párra). A tudatpont nem elköltött, hanem
      // ODARENDELT: bármikor átrendezhető, és az átrendezés csak egy újabb esemény.
      //
      // A SZEREP (aktív / passzív) itt dől el, és a döntéshozatalban lesz fontos: a
      // részvételi arány nevezőjébe csak az AKTÍV tulajdonosok számítanak bele. Aki
      // passzív figyelő, az nem korlátozza a döntést — ez a modell lényege.
      case 'TudatpontRendezes':
        pontok.rogzit(e.szerzo + '|' + e.adat.entitas, e, {
          pont: e.adat.pont,
          szerep: e.adat.szerep === 'passziv' ? 'passziv' : 'aktiv'
        });
        break;

      // ----- ÉRTÉK JAVASLAT (küszöbök) -----
      case 'ErtekJavaslat':
        ertekJavaslatok.rogzit(e.szerzo + '|' + e.adat.entitas, e, e.adat.ertekek);
        break;

      default:
        // Ismeretlen típus: NEM hiba. Egy régebbi program így fut tovább akkor is, ha
        // egy újabb változat már ismer olyan eseményt, amit ő nem — csak nem érti.
        console.log('allapotSzamitasa - ismeretlen esemény-típus, kihagyva:', e.tipus);
    }
  }

  // ----- ÖSSZESÍTÉS ENTITÁSONKÉNT -----
  const entitasok = new Map();

  for (const [entitasAzonosito, letrehozoEsemeny] of letrehozasok) {
    entitasok.set(entitasAzonosito, {
      azonosito: entitasAzonosito,
      tipus: letrehozoEsemeny.adat.tipus ?? 'Tartalom',
      cim: letrehozoEsemeny.adat.cim,
      szoveg: letrehozoEsemeny.adat.szoveg ?? null,
      szulo: letrehozoEsemeny.adat.szulo ?? null,
      meret: letrehozoEsemeny.adat.meret ?? 0,       // D26: a tárolási vállalás mértéke
      szerzo: letrehozoEsemeny.szerzo,
      letrehozva: letrehozoEsemeny.ido,
      osszesPont: 0,
      hozzajarulok: new Map(),                        // szerző → pont
      kuszobok: null
    });
  }

  // ----- TUDATPONTOK BEÍRÁSA -----
  for (const [kulcs, bejegyzes] of pontok.ertekek) {
    const [szerzo, entitasAzonosito] = kulcs.split('|');
    const entitas = entitasok.get(entitasAzonosito);
    if (!entitas) continue;                           // olyan entitásra mutat, amit nem ismerünk
    if (bejegyzes.ertek.pont <= 0) continue;          // a 0 pont = elvette a pontját

    entitas.hozzajarulok.set(szerzo, {
      pont: bejegyzes.ertek.pont,
      szerep: bejegyzes.ertek.szerep
    });
    entitas.osszesPont += bejegyzes.ertek.pont;
  }

  // ----- KÜSZÖBÖK: A TULAJDONOSOK MEDIÁNJA (D4) -----
  // Csak azoknak az érték javaslata számít, akiknek VAN tudatpontja az entitáson —
  // a küszöböt azok szabják meg, akik felelnek érte.
  const kuszobNevek = ['elfogadasiKuszob', 'reszveteliKuszob', 'minimumDontesiIdo', 'maximumDontesiIdo'];

  for (const [kulcs, bejegyzes] of ertekJavaslatok.ertekek) {
    const [szerzo, entitasAzonosito] = kulcs.split('|');
    const entitas = entitasok.get(entitasAzonosito);
    if (!entitas || !entitas.hozzajarulok.has(szerzo)) continue;

    if (!entitas._ertekek) entitas._ertekek = [];
    entitas._ertekek.push(bejegyzes.ertek);
  }

  for (const entitas of entitasok.values()) {
    if (entitas._ertekek && entitas._ertekek.length) {
      entitas.kuszobok = {};
      for (const nev of kuszobNevek) {
        entitas.kuszobok[nev] = median(
          entitas._ertekek.map((ertek) => ertek[nev]).filter((sz) => typeof sz === 'number')
        );
      }
      entitas.kuszobErtekelokSzama = entitas._ertekek.length;
    }
    delete entitas._ertekek;
  }

  // ----- KÖZÖSSÉGI FELEJTÉS: NINCS 0 PONTOS ENTITÁS -----
  // Domain-invariáns, ami a prototípusban is él: aminek nincs gazdája, az nem létezik.
  // A D14 szerint ez nem takarítás, hanem ALAPÁLLAPOT: „ami fontos a közösségnek, arra
  // rakjanak tudatpontot" — amire senki nem rak, azt a koino elfelejti.
  const elfelejtettek = [];
  for (const [azonosito, entitas] of entitasok) {
    if (entitas.osszesPont <= 0) {
      elfelejtettek.push(azonosito);
      entitasok.delete(azonosito);
    }
  }

  // ----- AZ ÁG TELJES MÉRETE (D26) -----
  // Tájékoztató adat: mekkora az egész ág, ha valaki az egészet akarná. A VÁLLALÁS
  // ettől függetlenül csak arra az egy entitásra szól, amire pontot tettél.
  for (const entitas of entitasok.values()) {
    entitas.agMeret = agMeretSzamitasa(entitas.azonosito, entitasok);
  }

  const allapot = {
    koino: koinoAdatok,
    entitasok,
    ellentmondasok,
    elfelejtettek,
    esemenyDarab: esemenyek.length,
    ervenyesDarab: ervenyesek.length
  };

  console.log('allapotSzamitasa - VÉGE', {
    entitas: entitasok.size,
    elfelejtett: elfelejtettek.length,
    ellentmondas: ellentmondasok.length
  });
  return allapot;
}

// ===================================
// SEGÉD: AZ ÁG MÉRETE
// ===================================

/**
 * Egy entitás és minden leszármazottjának összesített mérete (D26 — tájékoztató adat).
 * @param {string} azonosito
 * @param {Map} entitasok
 * @returns {number} bájt
 */
function agMeretSzamitasa(azonosito, entitasok) {
  const entitas = entitasok.get(azonosito);
  if (!entitas) return 0;

  let osszeg = entitas.meret;
  for (const masik of entitasok.values()) {
    if (masik.szulo === azonosito) {
      osszeg += agMeretSzamitasa(masik.azonosito, entitasok);
    }
  }
  return osszeg;
}

// ===================================
// SEGÉD: EGY E-EMBER SZÉTOSZTOTT PONTJAI
// ===================================

/**
 * Megmondja, egy e-ember mennyi tudatpontot osztott ki összesen.
 *
 * MIÉRT KELL? Mert mindenkinek UGYANANNYI tudatpontja van (nem elkölthető, csak
 * szétosztható), és ezt ellenőrizni kell: aki többet oszt ki, mint amennyije van,
 * az szabálysértő eseményt írt alá — és ez, mint minden más, BIZONYÍTHATÓ.
 *
 * @param {Object} allapot
 * @param {string} szerzo
 * @returns {number}
 */
export function szetosztottPontok(allapot, szerzo) {
  let osszeg = 0;
  for (const entitas of allapot.entitasok.values()) {
    osszeg += entitas.hozzajarulok.get(szerzo)?.pont ?? 0;
  }
  return osszeg;
}

/**
 * Egy entitás AKTÍV tudatpont-tulajdonosai.
 *
 * Csak ők számítanak a részvételi arány nevezőjébe: a passzív figyelők szándékosan
 * kimaradnak, hogy ne korlátozzák a döntést azok, akik nem akarnak részt venni benne.
 *
 * @param {Object} entitas
 * @returns {Set<string>} a szerzők halmaza
 */
export function aktivTulajdonosok(entitas) {
  const halmaz = new Set();
  if (!entitas) return halmaz;
  for (const [szerzo, adat] of entitas.hozzajarulok) {
    if (adat.szerep === 'aktiv') halmaz.add(szerzo);
  }
  return halmaz;
}
