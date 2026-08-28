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
     * @param {string} nev
     * @param {Function} futtat - igaz = rendben
     */
    proba(nev, futtat) {
      probak.push({ nev, futtat });
    },

    /**
     * Lefuttatja mindet, és kiírja az eredményt.
     * @param {boolean} [csendes] - csak az összegzést írja ki (a mind.js használja)
     * @returns {Promise<{cim: string, osszes: number, sikeres: number, bukottak: Array<string>}>}
     */
    async futtatas(csendes = false) {
      if (!csendes) kiir('\n' + SZIN.vastag + cim + SZIN.vege);

      let sikeres = 0;
      const bukottak = [];

      for (const p of probak) {
        let rendben = false, hibaSzoveg = '';
        try {
          rendben = await p.futtat();
        } catch (hiba) {
          rendben = false;
          hibaSzoveg = ' — váratlan hiba: ' + hiba.message;
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
        const mind = sikeres === probak.length;
        kiir('  ' + (mind ? SZIN.jo + '✅ Mind a ' + probak.length + ' próba rendben'
                                 : SZIN.nem + '❌ ' + bukottak.length + ' próba BUKOTT ('
                                   + probak.length + '-ből)') + SZIN.vege);
      }

      return { cim, osszes: probak.length, sikeres, bukottak };
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

/**
 * Új e-ember, aki eseményeket tud a saját lánca végére fűzni.
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

  return {
    szerzo,
    kulcspar,

    /** Új esemény a lánc végére. Az `ido` elhagyható (alapból: most). */
    async tesz(tipus, adat, ido) {
      utolsoElozo = elozo;
      utolsoSorszam = ++sorszam;
      const e = await esemenyLetrehozasa({ koino, tipus, adat, elozo, sorszam, ido }, kulcspar);
      elozo = e.azonosito;
      return e;
    },

    /**
     * Egy MÁSODIK eseményt ír alá ugyanarról a pontról (azonos sorszám és `elozo`) —
     * vagyis kettéágaztatja a saját láncát. Ez a kettős cselekvés: nem akadályozzuk
     * meg, hanem LELEPLEZZÜK (D17/D19). A lánc végét nem mozdítja el.
     */
    async elagaztat(tipus, adat, ido) {
      return esemenyLetrehozasa(
        { koino, tipus, adat, elozo: utolsoElozo, sorszam: utolsoSorszam, ido },
        kulcspar
      );
    }
  };
}
