// koino/js/allapot/allapotSzamitas.js

// Felelősség: az aláírt eseményekből KISZÁMOLNI a jelenlegi állapotot — mely entitások
// léteznek, ki hova rendelt tudatpontot, mik az érvényes küszöbök.
//
// EZ A KOINO SZÍVE A FÁZIS 2-BEN. A prototípusban az állapot ÁLLÍTÁS volt: a szerver
// azt mondta, „ez a gondolat így néz ki", és el kellett hinni. Itt az állapot
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
// ⚠️ DE A FELSOROLÁSOK SORRENDJE MÁS KÉRDÉS (2026-08-28, a Szakasz 2 kézi próbája).
// Az ÉRTÉKEK sorrend-függetlenek voltak — a LISTÁK viszont nem: az entitások, a
// kivételek és az ellentmondások a fájlba érkezés sorrendjében jöttek, tehát a csere
// után a két készülék ugyanazt az öt eseményt ismerte, ugyanazokat az entitásokat
// számolta ki, de MÁS SORRENDBEN sorolta fel őket. Ma ez csak megjelenítés — a
// pakli-nézetben viszont látszani fog, és a D17 ígérete az, hogy mindenki ugyanazt látja.
// Ezért a bemenetet EGY HELYEN, itt rendezzük — lásd `rendezettBemenet`.
//
// Használják: koino.js (a parancssori arc) és a javaslat/szavazat számítása.

import { szabalyokErvenyesitese } from './szabalyok.js';

// ===================================
// A BEMENET RENDEZÉSE — a determinizmus EGYETLEN forrása
// ===================================

/**
 * Determinisztikus sorrendbe rakja az eseményeket, mielőtt bármit számolnánk.
 *
 * ⭐ MIÉRT ITT, ÉS MIÉRT EGY HELYEN? Mert innen lefelé MINDEN felsorolás ezt a sorrendet
 * örökli: az entitás-lista, a hozzájárulók, a kivételek, az ellentmondások, a javaslatok.
 * Ha helyette minden listát külön rendeznénk, előbb-utóbb az egyik lemaradna — és a
 * kettő némán szétcsúszna. (Ugyanaz a hiba-minta, mint amikor két sorrendnek egymás
 * tükörképének kellene lennie, de külön van leírva.)
 *
 * ⚠️ MIÉRT NEM AZ IDŐ SZERINT? Mert az `ido` a szerző órája — tájékoztató adat, sosem
 * bizonyíték. Ha a felsorolás sorrendjét az óra döntené el, egy rossz (vagy hazug) óra
 * átrendezhetné, amit mindenki lát. A `szerzo` + `sorszam` viszont a saját lánc, amit
 * csak a szerző írhat, és amit nem lehet átírni: EZ a koino egyetlen hamisíthatatlan
 * sorrendje. Az `azonosito` a végén csak a döntetlent zárja ki (elágazásnál).
 *
 * ⚠️ EZ NEM A MEGJELENÍTÉS SORRENDJE. Hogy a felületen mi legyen elöl (pl. a legtöbb
 * tudatpontot kapott gondolat), az külön kérdés, és a felület dolga — ez itt csak azt
 * garantálja, hogy KÉT GÉP UGYANAZT A SORRENDET kapja.
 *
 * @param {Array<Object>} esemenyek
 * @returns {Array<Object>} ugyanazok, determinisztikus sorrendben
 */
export function rendezettBemenet(esemenyek) {
  return [...esemenyek].sort((a, b) => {
    if (a.szerzo !== b.szerzo) return a.szerzo < b.szerzo ? -1 : 1;
    if (a.sorszam !== b.sorszam) return a.sorszam - b.sorszam;
    return a.azonosito < b.azonosito ? -1 : a.azonosito > b.azonosito ? 1 : 0;
  });
}

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
// IDŐ-MONOTONITÁS A SAJÁT LÁNCBAN (Csaba jóváhagyása, 2026-08-28)
// ===================================
//
// MIÉRT KELL? A döntések lezárása időrendben történik (javaslatSzamitas.js), az `ido`
// viszont a szerző órája — hazudható. Aki lemaradt egy szavazásról, VISSZADÁTUMOZHATNÁ
// a szavazatát, hogy még beleférjen a határidőbe.
//
// AMIT ELLENŐRIZNI TUDUNK: a saját láncod a tiéd, és sorszámozott. Ha egy NAGYOBB
// sorszámú eseményed KORÁBBI időt visel, mint az előtte lévő, az önellentmondás —
// ugyanúgy, mint az elágazás, és ugyanúgy a saját aláírásoddal bizonyítva.
//
// ⚠️ MENNYIT ÉR? Csak a saját előző eseményedhez képest köt. Aki friss kulccsal jön
// (sorszam: 1), vagy régóta nem tett semmit, az szabadon visszadátumoz. Tehát ez
// DRÁGÍTJA a csalást, nem zárja ki — a teljes válasz a kötegelés (D21, Szakasz 4).
// Ezt így is mondjuk ki, hogy később ne higgyük megoldottnak.
//
// ÉS AMIT NEM TESZÜNK: nem dobjuk el az eseményt. A koino BEJELENT, nem büntet (D19) —
// az ellentmondás láthatóvá válik, a döntést a közösség hozza meg róla.

/**
 * Megkeresi azokat az eseményeket, amelyek visszafelé lépnek a saját láncuk idejében.
 *
 * @param {Array<Object>} ervenyesek - elágazás-mentesített események
 * @returns {Array<Object>} { szerzo, sorszam, ido, elozoIdo, azonosito }
 */
export function idoEllentmondasokKeresese(ervenyesek) {
  const szerzonkent = new Map();
  for (const e of ervenyesek) {
    if (!szerzonkent.has(e.szerzo)) szerzonkent.set(e.szerzo, []);
    szerzonkent.get(e.szerzo).push(e);
  }

  const talalatok = [];
  for (const lanc of szerzonkent.values()) {
    // A lánc sorszám szerint; a hézag (hiányzó sorszám) itt NEM hiba — hálózaton
    // természetes, hogy nem ismerjük valakinek minden eseményét.
    const rendezett = [...lanc].sort((a, b) => a.sorszam - b.sorszam);
    for (let i = 1; i < rendezett.length; i++) {
      const elozo = rendezett[i - 1];
      const mostani = rendezett[i];
      if (mostani.ido < elozo.ido) {
        talalatok.push({
          szerzo: mostani.szerzo,
          sorszam: mostani.sorszam,
          ido: mostani.ido,
          elozoIdo: elozo.ido,
          azonosito: mostani.azonosito
        });
      }
    }
  }
  return talalatok;
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

  // ----- KÉT SZŰRŐ, EGYMÁS UTÁN -----
  // 1. ELÁGAZÁS: ha valaki két eseményt írt alá ugyanarról a pontról, determinisztikusan
  //    választunk (a kisebb azonosító).
  // 2. SZABÁLYOK: a tudatpont-keret és a javaslat-jogosultság — mert amit a SZÁMÍTÁS nem
  //    ellenőriz, az nem szabály, csak illemtan (szabalyok.js).
  // Egyik szűrő sem töröl semmit: a kiesett esemény a tárban marad, és a listákban
  // látható. A koino bejelent, nem büntet (D19).
  // 0. RENDEZÉS: innen lefelé minden felsorolás ezt a sorrendet örökli, tehát két gép
  //    ugyanabból a halmazból ugyanazt a LISTÁT is kapja, nem csak ugyanazokat az értékeket.
  const rendezettek = rendezettBemenet(esemenyek);

  const { ervenyesek, ellentmondasok } = elagazasokFeloldasa(rendezettek);
  const { szamitok, kivetelek } = szabalyokErvenyesitese(ervenyesek);

  // ----- NYERSANYAG-GYŰJTÉS -----
  const koinoAdatok = { nev: null, leiras: null };
  const letrehozasok = new Map();        // entitás azonosító → a létrehozó esemény
  const pontok = utolsoNyer();           // "szerzo|entitas" → pontszám
  const ertekJavaslatok = utolsoNyer();  // "szerzo|entitas" → küszöb-négyes

  for (const e of szamitok) {
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
      // gondolatából származik, nem egy kiosztott sorszám.
      case 'GondolatLetrehozas':
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
      tipus: letrehozoEsemeny.adat.tipus ?? 'Gondolat',
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
  agMeretekSzamitasa(entitasok);

  const allapot = {
    koino: koinoAdatok,
    entitasok,
    // ⚠️ A KÉT SZŰRŐ EREDMÉNYE — EGYETLEN FORRÁSBÓL.
    // A döntéshozatal (javaslatSzamitas.js) EZT kapja, nem a nyers eseményeket. Ha ott
    // külön oldanánk fel az elágazást vagy külön ellenőriznénk a szabályokat, a két
    // változat előbb-utóbb szétcsúszna, és két gép ugyanabból a halmazból MÁS döntésre
    // jutna — épp az, amiért az egész épül.
    szamitok,
    ellentmondasok,
    // Visszafelé lépő idő a saját láncban (lásd fentebb) — jelzés, nem büntetés
    idoEllentmondasok: idoEllentmondasokKeresese(ervenyesek),
    // Szabályt sértő események (keret, jogosultság) — szintén jelzés, nem büntetés (D19)
    kivetelek,
    elfelejtettek,
    esemenyDarab: esemenyek.length,
    szamitoDarab: szamitok.length
  };

  console.log('allapotSzamitasa - VÉGE', {
    entitas: entitasok.size,
    elfelejtett: elfelejtettek.length,
    ellentmondas: ellentmondasok.length,
    idoEllentmondas: allapot.idoEllentmondasok.length,
    kivetel: kivetelek.length
  });
  return allapot;
}

// ===================================
// SEGÉD: AZ ÁG MÉRETE
// ===================================

/**
 * MINDEN entitás ág-méretét kiszámolja: az entitás és összes leszármazottja együtt
 * (D26 — tájékoztató adat).
 *
 * ===== ⚠️ MIÉRT ÍRTUK ÁT (2026-09-03, mérésből) =====
 *
 * A régi változat entitásonként végigment az ÖSSZES entitáson, rekurzívan — vagyis
 * négyzetes volt. **Mérve: 7 767 entitásnál ~60 millió lépés, 4,6 másodperc.** Ez tette
 * lassúvá az egész állapotszámítást, és semmi köze nem volt a skálázási szerkezethez:
 * közönséges hiba volt egy közönséges függvényben.
 *
 * ⭐ AZ ÚJ VÁLTOZAT EGY MENETBEN, LEVELEKTŐL FELFELÉ dolgozik: minden entitás **egyszer**
 * adja hozzá a saját ág-méretét a szülőjéhez, és a szülő akkor lép tovább, ha már minden
 * gyereke beszámolt. Egy bejárás, rekurzió nélkül.
 *
 * ⭐⭐ ÉS EZZEL EGY REJTETT VESZÉLY IS ELTŰNT: a régi, rekurzív változatot egy KÖRBE
 * mutató szülő-lánc (A szülője B, B szülője A — áthelyezési egyezmények után nem
 * elképzelhetetlen) **végtelen rekurzióba** vitte volna. Itt a körben lévő entitások
 * egyszerűen sosem érik el a „minden gyerekem beszámolt" állapotot, tehát kimaradnak —
 * nincs se összeomlás, se végtelen ciklus.
 *
 * @param {Map} entitasok - azonosító → entitás (helyben kap `agMeret` mezőt)
 */
function agMeretekSzamitasa(entitasok) {
  // ----- 1. SZÜLŐ → HÁNY GYEREKE VAN (egyetlen menet) -----
  const hatralevoGyerek = new Map();
  for (const e of entitasok.values()) {
    e.agMeret = e.meret;                       // mindenki a sajátjával indul
    hatralevoGyerek.set(e.azonosito, 0);
  }
  for (const e of entitasok.values()) {
    if (e.szulo && hatralevoGyerek.has(e.szulo)) {
      hatralevoGyerek.set(e.szulo, hatralevoGyerek.get(e.szulo) + 1);
    }
  }

  // ----- 2. A LEVELEKTŐL FELFELÉ -----
  const sor = [];
  for (const e of entitasok.values()) {
    if (hatralevoGyerek.get(e.azonosito) === 0) sor.push(e);
  }

  while (sor.length) {
    const e = sor.pop();
    if (!e.szulo) continue;

    const szulo = entitasok.get(e.szulo);
    if (!szulo) continue;                      // a szülő nem létezik (elfelejtették)

    szulo.agMeret += e.agMeret;

    const maradt = hatralevoGyerek.get(szulo.azonosito) - 1;
    hatralevoGyerek.set(szulo.azonosito, maradt);
    if (maradt === 0) sor.push(szulo);
  }
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
 * Egy entitás AKTÍV tudatpont-tulajdonosai — a MOSTANI állapot szerint.
 *
 * A passzív figyelők kimaradnak: aki nem akar részt venni a döntésben, ne is
 * korlátozza azt.
 *
 * ⚠️ A DÖNTÉSHOZATAL NEM EZT HASZNÁLJA (2026-08-28 óta). Ott a nevezőt a LEZÁRÁS
 * PILLANATÁIG feldolgozott tudatpont-eseményekből számoljuk (javaslatSzamitas.js) —
 * különben egy utólagos tudatpont-rendezés visszamenőleg megmozdítaná egy már lezárt
 * döntés határidejét. Ez a függvény a felületnek való: „kik a mai aktív tulajdonosok".
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
