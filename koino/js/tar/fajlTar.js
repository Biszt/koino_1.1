// koino/js/tar/fajlTar.js

// Felelősség: a koino adatának tárolása FÁJLBAN — böngésző nélkül.
//
// ⭐ MIÉRT NEM BÖNGÉSZŐBEN? (D29, Csaba döntése 2026-08-28)
// Mert a böngésző korlátai nem a koino korlátai. Egy lap nem tud portot nyitni, nem tud
// fogadni kapcsolatot, elrejti a saját címeit, és bezáráskor eltűnik. Az egész
// infrastruktúra, amit a P2P-hez emlegetni szoktak (jelzőpont, STUN, továbbító), jórészt
// EBBŐL következik, nem magából a P2P-ből. Ezért a koino önálló program: a böngésző
// legfeljebb egy kliens lehet később, de nem ő szabja meg, mire képes a koino.
//
// ===== A TÁR ALAKJA =====
//
// Egyetlen HOZZÁFŰZHETŐ fájl koinónként (`esemenyek.jsonl`), soronként egy esemény.
// Ez pontosan az, amit a modell megkövetel: az eseményt SOHA nem módosítjuk és nem
// töröljük — csak új sor keletkezik. A fájl emberi szemmel is olvasható, bármikor
// megnézhető, és egy szövegszerkesztővel is menthető.
//
// Nincs adatbázis-motor, nincs séma-migráció, nincs zárolás. A mérés szerint 10 000
// esemény ellenőrzése 0,58 mp — ezen a méreten a „töltsd be az egészet a memóriába"
// nem kompromisszum, hanem a legegyszerűbb helyes megoldás. Ha egyszer kevés lesz, a
// tár-illesztő mögött kicserélhető, a fölötte lévő rétegek érintése nélkül.
//
// Használják: esemenyTar.js és kulcsTar.js (rajtuk keresztül minden más).

import { mkdir, readFile, appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ===================================
// HOL LAKIK AZ ADAT
// ===================================

/**
 * Az adat helye. Alapból a futtatás helyén egy `koino-adat` mappa — de átadható más is
 * (a próbák így kapnak külön, eldobható mappát, hogy ne írjanak az éles adatra).
 */
export function alapHely() {
  return process.env.KOINO_ADAT ?? join(process.cwd(), 'koino-adat');
}

// ===================================
// AZ ESEMÉNY-TÁR
// ===================================

/**
 * Megnyit (és ha kell, létrehoz) egy koino esemény-tárát.
 *
 * A visszaadott tárnak KÉT művelete van, szándékosan:
 *   - `betolt()`  — az összes esemény,
 *   - `hozzafuz()` — egy új esemény a végére.
 * Nincs „módosít" és nincs „töröl". Ami hiányzik belőle, az nem lustaság: a modell
 * szerint nem is létezhet.
 *
 * @param {string} koino - a koino azonosítója (ez lesz a mappa neve)
 * @param {string} [hely] - hol legyen az adat (alapból: alapHely())
 * @returns {Promise<{betolt: Function, hozzafuz: Function, fajl: string}>}
 */
export async function esemenyTarNyitasa(koino, hely = alapHely()) {
  console.log('esemenyTarNyitasa - KEZDÉS', { koino, hely });

  const mappa = join(hely, koino);
  await mkdir(mappa, { recursive: true });
  const fajl = join(mappa, 'esemenyek.jsonl');

  const tar = {
    fajl,

    /** Az összes esemény, a fájlban lévő sorrendben. */
    async betolt() {
      let szoveg;
      try {
        szoveg = await readFile(fajl, 'utf8');
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];   // még nincs fájl: üres tár
        throw hiba;
      }

      const esemenyek = [];
      let sorszam = 0;
      for (const sor of szoveg.split('\n')) {
        sorszam++;
        if (!sor.trim()) continue;
        try {
          esemenyek.push(JSON.parse(sor));
        } catch {
          // Egy sérült sor nem teheti olvashatatlanná az egész tárat. Jelezzük, és
          // megyünk tovább — az esemény aláírása úgyis minden sort külön igazol.
          console.warn('esemenyTarNyitasa - sérült sor, kihagyva', { fajl, sorszam });
        }
      }
      return esemenyek;
    },

    /** Egy új esemény a fájl végére. */
    async hozzafuz(esemeny) {
      await appendFile(fajl, JSON.stringify(esemeny) + '\n', 'utf8');
    }
  };

  console.log('esemenyTarNyitasa - VÉGE', { fajl });
  return tar;
}

// ===================================
// A KULCS TÁROLÁSA
// ===================================

/**
 * A kulcs tárolója: egyetlen JSON-fájl.
 *
 * ⚠️ A privát kulcs TITKOSÍTATLANUL van benne. Ez tudatos, és ugyanaz a döntés, mint a
 * böngészős változatban volt (Csaba, 2026-08-26): a kulcs elvesztése hétköznapi
 * kockázat, a mentés viszont egy lépés. Aki hozzáfér a fájlhoz, a nevedben tud aláírni —
 * ezért a fájl a te gépeden, a te mappádban van, és a program meg is mondja, hol.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function kulcsTarolo(hely = alapHely()) {
  const fajl = join(hely, 'kulcs.json');

  return {
    fajl,

    /** @returns {Promise<Object|null>} a mentett kulcs-leírás, vagy null */
    async olvas() {
      try {
        return JSON.parse(await readFile(fajl, 'utf8'));
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return null;
        throw hiba;
      }
    },

    /** @param {Object} leiras */
    async ir(leiras) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify(leiras, null, 2), 'utf8');
    }
  };
}

// ===================================
// A TÁRS-LISTA TÁROLÁSA
// ===================================

/**
 * A társak listája: egyetlen JSON-fájl, KÉZZEL IS SZERKESZTHETŐ.
 *
 * ⭐ MIÉRT NEM ESEMÉNY? Mert a cím nem igazság, hanem múlandó körülmény. Egy aláírt
 * esemény örökre megmarad — egy IP-cím két hét múlva már másé. A társ-lista ezért HELYI
 * FELJEGYZÉS: nem terjed, nem kell rá egyetértés, és bárki átírhatja a saját gépén.
 * *(A terjedő címjegyzék külön kérdés lesz — D. lépés, aláírt, de MULANDÓ üzenetekkel.)*
 *
 * ⭐ A 4. SZABÁLY ITT LÁTSZIK: mivel sima JSON-fájl egy ismert helyen, a társ-lista
 * kézzel is összeállítható — egy szövegszerkesztővel, hálózat nélkül. Nincs olyan
 * pont, ahol egy szolgáltatás kellene ahhoz, hogy a koino tudja, kikkel beszéljen.
 *
 * ⚠️ Készülék-szintű, nem koino-szintű (mint a kulcs): ugyanaz a társ jellemzően minden
 * közös koinóban ugyanaz a társ, és a cím a készülékhez tartozik, nem a témához.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function tarsakTarolo(hely = alapHely()) {
  const fajl = join(hely, 'tarsak.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} a társak, vagy üres lista */
    async olvas() {
      let szoveg;
      try {
        szoveg = await readFile(fajl, 'utf8');
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];   // még nincs fájl: nincs társ
        throw hiba;
      }

      try {
        const adat = JSON.parse(szoveg);
        // Kézzel írt fájlnál a puszta tömb is elfogadható — ne bosszantsuk azt, aki
        // gyorsan beírt két címet.
        const lista = Array.isArray(adat) ? adat : adat.tarsak;
        return Array.isArray(lista) ? lista : [];
      } catch {
        // Egy elrontott társ-lista NE akadályozza meg a koino futását: a társ kényelem,
        // nem előfeltétel (2. szabály).
        console.warn('tarsakTarolo - olvashatatlan társ-lista, üresnek vesszük', { fajl });
        return [];
      }
    },

    /** @param {Array<Object>} lista */
    async ir(lista) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ tarsak: lista }, null, 2), 'utf8');
    }
  };
}
