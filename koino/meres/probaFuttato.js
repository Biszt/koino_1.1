// koino/meres/probaFuttato.js

// Felelősség: az önpróbák futtatása és az eredmény kiírása — böngésző nélkül.
//
// A böngészős korszakban minden próbaoldal maga rajzolta ki a saját táblázatát. A D29
// után (a koino önálló program) a próbák a parancssorban futnak, és EZ a közös váz.
// Nincs teszt-könyvtár: egy próba egy név és egy függvény, ami igazat vagy hamisat ad.
//
// Miért nem használunk teszt-keretrendszert? Mert nem kell: a próbák tiszta függvényeket
// mérnek, és a keretrendszer csak egy újabb dolog lenne, amiben meg kell bízni.
//
// Használják: a `koino/meres/*Proba.js` fájlok és a `mind.js`.

// A jelentést KÖZVETLENÜL írjuk a kimenetre, nem `console.log`-gal — mert a futtató
// elnémítja a naplózást (a koino minden metódusa naplóz, ami itt elárasztaná a képernyőt).
// A napló visszakapcsolható: KOINO_NAPLO=1
const kiir = (szoveg) => process.stdout.write(szoveg + '\n');

// ===== SZÍNEK (ha a terminál tudja) =====
const SZIN = process.stdout.isTTY
  ? { jo: '\x1b[32m', nem: '\x1b[31m', halvany: '\x1b[90m', vastag: '\x1b[1m', vege: '\x1b[0m' }
  : { jo: '', nem: '', halvany: '', vastag: '', vege: '' };

/**
 * Létrehoz egy próba-gyűjteményt.
 * @param {string} cim - mit bizonyít ez a lap
 * @returns {{proba: Function, futtatas: Function}}
 */
export function probaGyujtemeny(cim) {
  const probak = [];

  return {
    /**
     * Felvesz egy próbát.
     *
     * ===== ⭐ AZ ISMERT HIBA (2026-09-26) =====
     *
     * „Előbb a mérés, aztán az építés": egy hibát előbb egy próba nevez meg — és az a próba a
     * javításig BUKIK. Ha a sorba pirosként kerülne, a többi 700 próba minden futása pirosat
     * mutatna, és egy ÚJ bukás elveszne mellette (a telefon `tail -3`-ja sem mondaná meg,
     * melyik az). Ezért a próba kaphat egy `ismertHiba` leírást: külön sorban, néven nevezve
     * látszik, de a sort nem pirosítja be.
     * ⛔⛔ SZIGORÚ, mindkét irányban: ha az ismert hiba próbája egyszer ÁTMEGY, az BUKÁS
     * („a hiba eltűnt — vedd le a jelet"), tehát a jel nem maradhat ott a javítás után; és ha
     * a próba KIVÉTELT dob, az is bukás — egy eltört próba nem bújhat az ismert hiba mögé.
     *
     * @param {string} nev
     * @param {Function} futtat - igaz = rendben
     * @param {{ismertHiba?: string}} [beallitas] - mi a hiba ma, és mire vár a javítása
     */
    proba(nev, futtat, beallitas = {}) {
      probak.push({ nev, futtat, ismertHiba: beallitas.ismertHiba ?? null });
    },

    /**
     * Lefuttatja mindet, és kiírja az eredményt.
     * @param {boolean} [csendes] - csak az összegzést írja ki (a mind.js használja)
     * @returns {Promise<{cim: string, osszes: number, sikeres: number, bukottak: Array<string>,
     *                    ismertHibak: Array<string>}>}
     */
    async futtatas(csendes = false) {
      if (!csendes) kiir('\n' + SZIN.vastag + cim + SZIN.vege);

      let sikeres = 0;
      const bukottak = [];
      const ismertHibak = [];

      for (const p of probak) {
        let rendben = false, hibaSzoveg = '';
        try {
          rendben = await p.futtat();
        } catch (hiba) {
          rendben = false;
          hibaSzoveg = ' — váratlan hiba: ' + hiba.message;
        }

        if (p.ismertHiba) {
          if (!rendben && !hibaSzoveg) {
            ismertHibak.push(p.nev + ' — ' + p.ismertHiba);
            if (!csendes) kiir('  ' + SZIN.halvany + 'ISMERT ' + SZIN.vege + '  ' + p.nev
              + SZIN.halvany + ' — ' + p.ismertHiba + SZIN.vege);
            continue;
          }
          // ⛔ Átment (vagy eltört): a jel nem maradhat.
          const miert = rendben
            ? ' — ⚠️ AZ ISMERT HIBA ELTŰNT: ha javítva van, vedd le az `ismertHiba` jelet'
            : hibaSzoveg;
          bukottak.push(p.nev + miert);
          if (!csendes) kiir('  ' + SZIN.nem + 'BUKOTT ' + SZIN.vege + '  ' + p.nev + miert);
          continue;
        }

        if (rendben) {
          sikeres++;
          if (!csendes) kiir('  ' + SZIN.jo + 'RENDBEN' + SZIN.vege + '  ' + p.nev);
        } else {
          bukottak.push(p.nev + hibaSzoveg);
          if (!csendes) kiir('  ' + SZIN.nem + 'BUKOTT ' + SZIN.vege + '  ' + p.nev + hibaSzoveg);
        }
      }

      if (!csendes) {
        const ismert = ismertHibak.length ? ' · ⚠️ ' + ismertHibak.length + ' ismert hiba nyitva' : '';
        kiir('  ' + (!bukottak.length ? SZIN.jo + '✅ Mind a ' + sikeres + ' próba rendben' + ismert
                                 : SZIN.nem + '❌ ' + bukottak.length + ' próba BUKOTT ('
                                   + probak.length + '-ből)' + ismert) + SZIN.vege);
      }

      return { cim, osszes: probak.length, sikeres, bukottak, ismertHibak };
    }
  };
}

// ===================================
// SEGÉD: E-EMBER (saját lánccal)
// ===================================
//
// Minden próba-fájlnak kell egy „valaki", aki aláír. Egy helyen van, hogy a próbák ne
// másolják — és mert ha a lánc-építés szabálya változik, itt egy helyen kövessük.

import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { TUDATPONT_KERET, javaslatEntitasai } from '../js/allapot/szabalyok.js';

/**
 * A SZELET-KULCS kitalálása a típusból — ugyanaz a szabály, amit a `muveletek.js` követ.
 *
 * ⚠️ EGY KÖZELÍTÉSSEL: a `Szavazat` szelete valójában a javaslat ÉRINTETT entitása, de azt
 * csak a tárból lehetne kikeresni, ami a próba-segédnek nincs. Itt a javaslat azonosítóját
 * használjuk. A próbák egyike sem vizsgálja a szeletet (a fogyasztója még nincs megépítve),
 * tehát ez ma ártalmatlan — de ha egyszer szelet-próba születik, ITT kell rendbe tenni.
 */
function szeletKulcs(tipus, adat) {
  if (tipus === 'TudatpontRendezes' || tipus === 'ErtekJavaslat') return adat?.entitas ?? null;
  // ⭐ D85/1 (2026-10-03): a javaslat a SAJÁT szeletében él (mint a `muveletek.js`-ben), akármelyik alakú.
  if (tipus === 'Javaslat') return null;
  if (tipus === 'Szavazat') return adat?.javaslat ?? null;
  // ⭐ A MEGHÍVÁS a MEGHÍVOTT szeletébe kerül (D56) — a hívó `beallitas.entitas`-szal adja
  // meg, mert a horgony azonosítója nem vezethető le az adatból.
  return null;   // KoinoLetrehozas, GondolatLetrehozas, Belepes: a saját szeletüket nyitják
}

/**
 * Új e-ember, aki eseményeket tud a saját lánca végére fűzni.
 *
 * ===== A HÁROM ÚJ MEZŐ (2026-08-31, a 3.1 lépés) =====
 *
 * A segéd ugyanazokat a mezőket tölti ki, amiket a `muveletek.js` — `entitas`,
 * `entitasSorszam`, és a tudatpont-rendezésnél az `adat.kiosztva` (D42). Így a próbák nem
 * másolják a szabályt, és ha az változik, EGY helyen kell követni.
 *
 * ⭐ DE A RONTÁS-PRÓBÁK FELÜLÍRHATJÁK. Ha a hívó maga ad `adat.kiosztva`-t, azt tiszteletben
 * tartjuk — különben nem lehetne olyan eseményt gyártani, ami HAZUDIK a bemondott összegről,
 * és épp az a D42 lényege, hogy azt le lehessen leplezni.
 *
 * @param {string} [koino]
 * @returns {Promise<{szerzo: string, kulcspar: CryptoKeyPair, tesz: Function, elagaztat: Function}>}
 */
export async function ujEember(koino = 'proba') {
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const nyers = await crypto.subtle.exportKey('raw', kulcspar.publicKey);
  let s = ''; for (const b of new Uint8Array(nyers)) s += String.fromCharCode(b);
  const szerzo = btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  let sorszam = 0, elozo = null;
  let utolsoSorszam = 0, utolsoElozo = null;   // az utolsó esemény helye (az elágazáshoz)

  const entitasSorszamok = new Map();   // szelet → hányadik eseményem rajta
  const pontok = new Map();             // entitás → a rá tett pontom
  let kiosztottOsszeg = 0;              // mennyit osztottam ki eddig
  // ⭐ D85/2: MINDEN pont-eseményem (a kézzel bemondott összegűek is) — a `szavaz` ebből tudja, hol
  // vagyok jogosult, és mennyi lesz a javaslatra tett pont bemondott összege.
  const ismertPontok = new Map();

  /** A közös rész: a burkolat három mezőjének kitöltése. */
  function burkolat(tipus, adat, beallitas) {
    const entitas = beallitas?.entitas !== undefined
      ? beallitas.entitas
      : szeletKulcs(tipus, adat);

    // Az entitás-sorszám csak akkor számol, ha van szelet; a saját szeletét nyitó
    // eseménynél mindig 1.
    let entitasSorszam = 1;
    if (entitas !== null) {
      entitasSorszam = (entitasSorszamok.get(entitas) ?? 0) + 1;
      entitasSorszamok.set(entitas, entitasSorszam);
    }

    // ----- A D42 BEMONDOTT ÖSSZEGE -----
    if (tipus === 'TudatpontRendezes' && Number.isInteger(adat?.pont)) ismertPontok.set(adat.entitas, adat.pont);

    let vegsoAdat = adat;
    if (tipus === 'TudatpontRendezes' && adat?.kiosztva === undefined
        && Number.isInteger(adat?.pont)) {
      const regi = pontok.get(adat.entitas) ?? 0;
      const ujOsszeg = kiosztottOsszeg - regi + adat.pont;
      // Ugyanaz a szabály, mint a szabalyok.js-ben: a keretet túllépő esemény nem számít,
      // tehát a nyilvántartásunk sem mozdul tőle — de a bemondás akkor is a valós összeg.
      if (ujOsszeg <= TUDATPONT_KERET) {
        pontok.set(adat.entitas, adat.pont);
        kiosztottOsszeg = ujOsszeg;
      }
      vegsoAdat = { ...adat, kiosztva: ujOsszeg };
    } else if (tipus === 'TudatpontRendezes' && Number.isInteger(adat?.pont)
               && Number.isInteger(adat?.kiosztva)) {
      // ⭐ A kézzel bemondott összeg is az új kiindulás — különben a következő, magától kitöltött
      // pont-esemény egy régi összegre építene (D85/2: a `szavaz` így adja le a javaslat pontját).
      pontok.set(adat.entitas, adat.pont);
      kiosztottOsszeg = adat.kiosztva;
    }

    return { entitas, entitasSorszam, adat: vegsoAdat };
  }

  const ember = {
    szerzo,
    kulcspar,

    /**
     * Új esemény a lánc végére. Az `ido` elhagyható (alapból: most).
     * @param {Object} [beallitas] - `{ entitas }` a szelet-kulcs felülírásához
     */
    async tesz(tipus, adat, ido, beallitas) {
      utolsoElozo = elozo;
      utolsoSorszam = ++sorszam;
      const { entitas, entitasSorszam, adat: vegsoAdat } = burkolat(tipus, adat, beallitas);
      const e = await esemenyLetrehozasa(
        {
          koino, tipus, adat: vegsoAdat, elozo, sorszam, ido, entitas, entitasSorszam,
          // ⭐ A horgony a hívótól jöhet — a 9/c 4.5 rontás-próbáihoz kell, hogy le lehessen
          // írni azt az esetet is, amikor a tanúsító BIZONYÍTHATÓAN látta a visszavonást.
          latott: beallitas?.latott ?? []
        },
        kulcspar
      );
      elozo = e.azonosito;
      return e;
    },

    /**
     * ⭐ D85/2: SZAVAZAT ÚGY, AHOGY A MŰVELET ADJA LE (`muveletek.js`, `szavazas`). A szavazati jog a
     * javaslaton (több érintettnél a rész töredékén) is pontot kíván — ahol a szavazó jogosult (pontja
     * van az érintetten), de ott még nincs pontja, előbb 1 pontot tesz rá, UGYANAZZAL az időbélyeggel.
     * ⚠️ A szabály ágait NEM ez méri (az kézzel írt eseményekkel megy, `javaslatProba.js`); ez a
     * többi próba kényelme, hogy a szavazóik úgy szavazzanak, ahogy a program.
     * @returns {Promise<Array<Object>>} az események sorban — az utolsó a szavazat
     */
    async szavaz(javaslatEsemeny, adat, ido, beallitas) {
      const esemenyek = [];
      for (const je of javaslatEntitasai(javaslatEsemeny)) {
        if (!je.resz) continue;
        if ((ismertPontok.get(je.resz.entitas) ?? 0) <= 0) continue;   // itt nem jogosult
        if ((ismertPontok.get(je.azonosito) ?? 0) > 0) continue;        // már van pontja rajta
        // A bemondott összeg az ÖSSZES ismert pontomból (a kézzel bemondottakéból is) + 1.
        const kiosztva = [...ismertPontok.values()].reduce((a, b) => a + b, 0) + 1;
        esemenyek.push(await this.tesz('TudatpontRendezes',
          { entitas: je.azonosito, pont: 1, kiosztva }, ido));
      }
      esemenyek.push(await this.tesz('Szavazat', { javaslat: javaslatEsemeny.azonosito, ...adat },
        ido, beallitas));
      return esemenyek;
    },

    /**
     * Egy MÁSODIK eseményt ír alá ugyanarról a pontról (azonos sorszám és `elozo`) —
     * vagyis kettéágaztatja a saját láncát. Ez a kettős cselekvés: nem akadályozzuk
     * meg, hanem LELEPLEZZÜK (D17/D19). A lánc végét nem mozdítja el.
     */
    async elagaztat(tipus, adat, ido, beallitas) {
      const { entitas, entitasSorszam, adat: vegsoAdat } = burkolat(tipus, adat, beallitas);
      return esemenyLetrehozasa(
        {
          koino, tipus, adat: vegsoAdat, elozo: utolsoElozo, sorszam: utolsoSorszam, ido,
          entitas, entitasSorszam, latott: []
        },
        kulcspar
      );
    }
  };
  // ⭐ D93: a próba-segéd nyilvántartja az e-embereit (a `tagokkal` ezekkel írja alá a belépést).
  EMBEREK.set(szerzo, ember);
  return ember;
}

// ===================================
// ⭐⭐ D93/1: A TAGSÁG A PRÓBÁKBAN — a szerzők VALÓDI tagsága
// ===================================
//
// A szabály-réteg óta (D93/1) a döntésben csak az ellenőrzött tag számít. A próbák szerzői ezért tagok kell legyenek —
// valódi, aláírt eseményekkel, nem kivétellel: a `tagokkal(esemenyek)` hozzáteszi a koinó létrehozását (ha nincs benne;
// akkor egy próba-alapító hozza létre), és minden szerzőhöz a SAJÁT aláírású `Belepes`-ét és az alapító `Meghivas`-át
// (gyorsítótárral: ugyanahhoz a szerzőhöz ugyanazokat). ⚠️ A belépés a szerző láncának VÉGÉRE kerül (a következő
// sorszám) — a lánc-sorszámot mérő próbákban ezért a láncépítés UTÁN hívandó. A tagságot magát mérő próbák (az
// `identitasProba`, a `tagsagProba`) a saját eseményeiket építik.

const EMBEREK = new Map();        // szerző → e-ember
const VILAGOK = new Map();        // koinó + létrehozás → { alapito, letrehozas, tagok: Map(szerző → [események]) }

/**
 * Az eseménylista a szerzők tagsági eseményeivel (elöl). Ismeretlen kulcs (nem a segéddel készült) nem lesz tag.
 * @param {Array<Object>} esemenyek
 * @returns {Promise<Array<Object>>}
 */
export async function tagokkal(esemenyek) {
  const lista = esemenyek.filter(Boolean);
  const koino = lista.find((e) => e.koino)?.koino ?? 'proba';
  let letrehozas = lista.find((e) => e.tipus === 'KoinoLetrehozas' && e.koino === koino) ?? null;
  const kulcs = koino + '|' + (letrehozas?.azonosito ?? '-');
  let vilag = VILAGOK.get(kulcs);
  if (!vilag) {
    let alapito;
    if (letrehozas) {
      alapito = EMBEREK.get(letrehozas.szerzo);
      if (!alapito) throw new Error('tagokkal: a koinó létrehozója nem a próba-segéddel készült');
    } else {
      alapito = await ujEember(koino);
      letrehozas = await alapito.tesz('KoinoLetrehozas', { nev: 'Próba-koinó', leiras: null, alapitok: [], zart: true });
    }
    vilag = { alapito, letrehozas, tagok: new Map() };
    VILAGOK.set(kulcs, vilag);
  }
  const elol = [];
  if (!lista.some((e) => e.azonosito === vilag.letrehozas.azonosito)) elol.push(vilag.letrehozas);
  const szerzok = new Set(lista.map((e) => e.szerzo));
  for (const sz of szerzok) {
    if (sz === vilag.letrehozas.szerzo) continue;
    // Aki a listában már belépett, annak a tagságát a próba maga építi.
    if (lista.some((e) => e.tipus === 'Belepes' && e.szerzo === sz)) continue;
    let tagsag = vilag.tagok.get(sz);
    if (!tagsag) {
      const ember = EMBEREK.get(sz);
      if (!ember) continue;
      const belepes = await ember.tesz('Belepes', {});
      const meghivas = await vilag.alapito.tesz('Meghivas', { kit: sz, sajatBelepes: vilag.letrehozas.azonosito }, undefined,
        { entitas: belepes.azonosito });
      tagsag = [belepes, meghivas];
      vilag.tagok.set(sz, tagsag);
    }
    elol.push(...tagsag);
  }
  return [...elol, ...lista];
}

/**
 * Ugyanez egy TÁRRA: a koinó eseményei szerzőinek tagsági eseményei a tárba mentve (ugyanazon a kapun).
 * @returns {Promise<number>} hány új esemény került a tárba
 */
export async function tagokTarba(tar, koino) {
  const { koinoEsemenyei, esemenyMentese } = await import('../js/tar/esemenyTar.js');
  const meglevo = await koinoEsemenyei(tar, koino);
  const teljes = await tagokkal(meglevo);
  const azonositok = new Set(meglevo.map((e) => e.azonosito));
  let uj = 0;
  for (const e of teljes) {
    if (azonositok.has(e.azonosito)) continue;
    const m = await esemenyMentese(tar, e);
    if (m.mentve && !m.marMegvolt) uj++;
  }
  return uj;
}


/**
 * ⭐ D93/1: a MŰVELETI RÉTEGGEL dolgozó próbák szereplőjét taggá teszi — a valódi `belepes` / `meghivas` művelettel
 * (az alapító hívja be). Ha a kettőnek külön tára van, mindkét esemény mindkét tárba kerül (ugyanazon a kapun).
 * @param {Object} alapito - az alapító környezete (`{ tar, koino, szerzo, kulcspar, ... }`)
 * @param {Object} k - a szereplő környezete
 * @returns {Promise<{belepes: Object, meghivas: Object}>}
 */
export async function taggaTesz(alapito, k) {
  const { belepes, meghivas, azonossagHorgonya } = await import('../js/muveletek.js');
  const { esemenyMentese } = await import('../js/tar/esemenyTar.js');
  const b = await belepes(k);
  if (alapito.tar !== k.tar) await esemenyMentese(alapito.tar, b);
  const sajat = await azonossagHorgonya(alapito.tar, alapito.koino, alapito.szerzo);
  const m = await meghivas(alapito, { kit: k.szerzo, horgonya: b.azonosito, sajatBelepes: sajat });
  if (alapito.tar !== k.tar) await esemenyMentese(k.tar, m);
  return { belepes: b, meghivas: m };
}

/**
 * ⭐ D93/1: egy e-ember, aki RÖGTÖN TAG — a belépése a lánca ELEJÉN (1. sorszám, a megadott időben), az alapító
 * meghívásával; a `tagokkal` ugyanezeket az eseményeket teszi a listába. Az időrendre és a lánc-sorszámra érzékeny
 * próbák ezt használják (a valóságban is így van: előbb belép, aztán cselekszik).
 * @param {string} [koino]
 * @param {number} [ido] - a belépés ideje (alapból: most)
 */
export async function ujTag(koino = 'proba', ido) {
  const ember = await ujEember(koino);
  const kulcs = koino + '|-';
  let vilag = VILAGOK.get(kulcs);
  if (!vilag) {
    const alapito = await ujEember(koino);
    const letrehozas = await alapito.tesz('KoinoLetrehozas', { nev: 'Próba-koinó', leiras: null, alapitok: [], zart: true }, 1);
    vilag = { alapito, letrehozas, tagok: new Map() };
    VILAGOK.set(kulcs, vilag);
  }
  const belepes = await ember.tesz('Belepes', {}, ido);
  const meghivas = await vilag.alapito.tesz('Meghivas', { kit: ember.szerzo, sajatBelepes: vilag.letrehozas.azonosito }, ido,
    { entitas: belepes.azonosito });
  vilag.tagok.set(ember.szerzo, [belepes, meghivas]);
  return ember;
}

/**
 * ⭐ D93/1: egy próba-segéd e-embert tesz taggá egy MŰVELETI alapító koinójában — a belépését ő írja alá, a meghívást
 * az alapító (a `meghivas` művelettel); mindkettő az alapító tárába kerül (ugyanazon a kapun).
 * @returns {Promise<{belepes: Object, meghivas: Object}>}
 */
export async function emberTaggaTarban(alapito, ember) {
  const { meghivas, azonossagHorgonya } = await import('../js/muveletek.js');
  const { esemenyMentese } = await import('../js/tar/esemenyTar.js');
  const belepes = await ember.tesz('Belepes', {});
  await esemenyMentese(alapito.tar, belepes);
  const sajat = await azonossagHorgonya(alapito.tar, alapito.koino, alapito.szerzo);
  const m = await meghivas(alapito, { kit: ember.szerzo, horgonya: belepes.azonosito, sajatBelepes: sajat });
  return { belepes, meghivas: m };
}

/**
 * Egy (az `ujTag`-gel vagy a `tagokkal`-lal taggá tett) e-ember tagsági eseményei: a koinó létrehozása, a belépése és
 * a meghívása — egy tárba mentéshez. Ha nem tag, üres lista.
 */
export function tagsagiEsemenyei(ember) {
  for (const vilag of VILAGOK.values()) {
    const t = vilag.tagok.get(ember.szerzo);
    if (t) return [vilag.letrehozas, ...t];
  }
  return [];
}
