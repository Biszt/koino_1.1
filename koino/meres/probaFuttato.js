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
import { TUDATPONT_KERET } from '../js/allapot/szabalyok.js';

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
  if (tipus === 'Javaslat') return adat?.erintett ?? null;
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
    }

    return { entitas, entitasSorszam, adat: vegsoAdat };
  }

  return {
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
}
