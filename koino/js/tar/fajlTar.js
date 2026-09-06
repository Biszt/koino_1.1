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

import { szelet } from '../esemeny/esemeny.js';

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
 * ===== ⛔ AZ ILLESZTÉS A 3.2 LÉPÉSBEN ÁTÍRÓDOTT (2026-09-03) =====
 *
 * A régi tároló **két** műveletet adott: `betolt()` és `hozzafuz()`. Ez elegáns volt, de a
 * kilencedik szabály elkapta: **a `betolt()` az ÖSSZES eseményt adja vissza.** Akármilyen
 * okos tárolót teszünk mögé, ha a FELÜLET azt kérdezi, hogy „add ide mindet", akkor minden
 * megvalósítás **kénytelen** mindet visszaadni.
 *
 * ⚠️ **Nem a fájlformátum volt a hiba, hanem az illesztés.** Ezért nem gyorsítótárat tettünk
 * alá (az csak a rossz kérdést gyorsította volna), hanem **kérdezhetővé** tettük:
 *
 *   esemeny(azonosito)          — EGY esemény, azonosító szerint
 *   szerzoLanca(szerzo)         — EGY szerző lánca
 *   szeletEsemenyei(entitas)    — EGY entitás (szelet) eseményei
 *   sorszamSzerint(szerzo, n)   — egy pont a szerző láncán (az elágazás-kereséshez)
 *   hozzafuz(esemeny)           — változatlan
 *   ⚠️ betolt()                 — MEGMARADT, de ez az, ami NEM SKÁLÁZIK (lásd lent)
 *
 * ===== A MEGVALÓSÍTÁS SZÁNDÉKOSAN EGYSZERŰ (9. szabály) =====
 *
 * Mögötte most egy **memóriában tartott mutató** van, amit megnyitáskor egyszer építünk fel,
 * és hozzáfűzéskor karbantartunk. Ez a *szerkezet* szempontjából már milliárdos —
 * a hívók a helyes kérdéseket teszik fel —, a *mélység* pedig később cserélhető
 * (lemezre írt index, részleges betöltés) **anélkül, hogy bárki más változna**.
 *
 * ⭐ ÉS EGY MÉRT MELLÉKHATÁS: ezzel az `esemenyMentese` is olcsó lett. Eddig MINDEN mentés
 * végigolvasta az egész fájlt (mérve: 100 000 eseménynél **495 ms egyetlen mentés**, vagyis
 * N esemény beírása négyzetes volt). A mutatóval a kettősség- és elágazás-keresés O(1).
 *
 * @param {string} koino - a koino azonosítója (ez lesz a mappa neve)
 * @param {string} [hely] - hol legyen az adat (alapból: alapHely())
 * @returns {Promise<Object>} a tároló
 */
export async function esemenyTarNyitasa(koino, hely = alapHely()) {
  console.log('esemenyTarNyitasa - KEZDÉS', { koino, hely });

  const mappa = join(hely, koino);
  await mkdir(mappa, { recursive: true });
  const fajl = join(mappa, 'esemenyek.jsonl');

  // ===== A MUTATÓ =====
  // Négy nézet ugyanarra az eseményhalmazra. A `mind` a fájl sorrendjét őrzi — erre a
  // csere és a próbák támaszkodnak.
  const mind = [];
  const azonositoSzerint = new Map();     // azonosító → esemény
  const szerzoSzerint = new Map();        // szerző → események
  const szeletSzerint = new Map();        // szelet-kulcs → események
  const pontSzerint = new Map();          // szerző|sorszám → események (elágazásnál több)

  /** Egy eseményt bevesz a mutatóba. */
  const bejegyez = (e) => {
    mind.push(e);
    azonositoSzerint.set(e.azonosito, e);

    const szerzoje = szerzoSzerint.get(e.szerzo);
    if (szerzoje) szerzoje.push(e); else szerzoSzerint.set(e.szerzo, [e]);

    // ⭐ A SZELET-KULCS type-független szabálya (`esemeny.js`): vagy meg van mondva, vagy
    // az esemény a saját szeletét nyitja. A tárolónak ennyit kell tudnia a domainről —
    // és pontosan ezért került a mező a burkolatba a 3.1-ben.
    const kulcs = szelet(e);
    const szelete = szeletSzerint.get(kulcs);
    if (szelete) szelete.push(e); else szeletSzerint.set(kulcs, [e]);

    const pont = e.szerzo + '|' + e.sorszam;
    const ottLevok = pontSzerint.get(pont);
    if (ottLevok) ottLevok.push(e); else pontSzerint.set(pont, [e]);
  };

  // ----- A MUTATÓ FELÉPÍTÉSE: egyetlen olvasás megnyitáskor -----
  // ⚠️ Ez még O(fájl), de FUTÁSONKÉNT EGYSZER, nem műveletenként. A következő mélység
  // (lemezre írt index) ezt is eltünteti — a hívók változtatása nélkül.
  try {
    const szoveg = await readFile(fajl, 'utf8');
    let sorszam = 0;
    for (const sor of szoveg.split('\n')) {
      sorszam++;
      if (!sor.trim()) continue;
      try {
        bejegyez(JSON.parse(sor));
      } catch {
        // Egy sérült sor nem teheti olvashatatlanná az egész tárat. Jelezzük, és megyünk
        // tovább — az esemény aláírása úgyis minden sort külön igazol.
        console.warn('esemenyTarNyitasa - sérült sor, kihagyva', { fajl, sorszam });
      }
    }
  } catch (hiba) {
    if (hiba.code !== 'ENOENT') throw hiba;   // még nincs fájl: üres tár
  }

  const tar = {
    fajl,

    /**
     * ⚠️ AZ ÖSSZES ESEMÉNY — EZ AZ, AMI NEM SKÁLÁZIK.
     *
     * Szándékosan megmaradt, mert két helyen jogos: a **próbák** így nézik meg a tár nyers
     * gondolatát, és a **kis koino** állapotszámítása így kapja meg a bemenetét. De a
     * hétköznapi műveletek közül **egyetlen sem hívja** — és ez a 3.2 lényege.
     *
     * ⛔ Új kódban ne ezt használd: kérdezz szeletet, láncot vagy azonosítót.
     */
    async betolt() {
      return [...mind];
    },

    /** EGY esemény, azonosító szerint. O(1). */
    async esemeny(azonosito) {
      return azonositoSzerint.get(azonosito);
    },

    /** EGY szerző eseményei (a fájl sorrendjében). */
    async szerzoLanca(szerzo) {
      return [...(szerzoSzerint.get(szerzo) ?? [])];
    },

    /** EGY szelet (entitás) eseményei. */
    async szeletEsemenyei(entitas) {
      return [...(szeletSzerint.get(entitas) ?? [])];
    },

    /** Egy pont a szerző láncán — rendes esetben egy esemény, elágazásnál több. */
    async sorszamSzerint(szerzo, sorszam) {
      return [...(pontSzerint.get(szerzo + '|' + sorszam) ?? [])];
    },

    /** Egy új esemény a fájl végére — és a mutatóba. */
    async hozzafuz(esemeny) {
      await appendFile(fajl, JSON.stringify(esemeny) + '\n', 'utf8');
      bejegyez(esemeny);
    }
  };

  console.log('esemenyTarNyitasa - VÉGE', { fajl, esemeny: mind.length });
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

// ===================================
// A SZELET-CÍMJEGYZÉK TÁROLÁSA
// ===================================

/**
 * „Kinél van ez az entitás?" — egyetlen JSON-fájl, a társ-listához hasonlóan.
 *
 * ⚠️ MIÉRT KÜLÖN FÁJL A TÁRS-LISTÁTÓL? Mert más a természete és más az élettartama. A
 * társ-lista **készülék-szintű** és tartós („kikkel szoktunk beszélni"); ez **entitás-szintű**
 * és **múlandó** („hol láttam ezt a gondolatot"). Egy fájlba téve a rövid életű bejegyzések
 * kimosnák a tartósakat.
 *
 * ⭐ És ugyanaz igaz rá, mint a társ-listára: **nem esemény, nem terjed igazságként, és
 * semmit nem dönt el a koinóban** (3. szabály). Kézzel is szerkeszthető, tehát a 4. szabály
 * kézi útja itt is megvan.
 *
 * @param {string} [hely]
 * @returns {{olvas: Function, ir: Function, fajl: string}}
 */
export function szeletJegyzekTarolo(hely = alapHely()) {
  const fajl = join(hely, 'szeletcimek.json');

  return {
    fajl,

    /** @returns {Promise<Array<Object>>} a bejegyzések, vagy üres lista */
    async olvas() {
      try {
        const adat = JSON.parse(await readFile(fajl, 'utf8'));
        const lista = Array.isArray(adat) ? adat : adat.szeletek;
        return Array.isArray(lista) ? lista : [];
      } catch (hiba) {
        if (hiba.code === 'ENOENT') return [];
        // Egy elrontott jegyzék NE akadályozza meg a koino futását: ez kényelem, nem
        // előfeltétel (2. szabály). Üresnek vesszük, és újratanuljuk használat közben.
        console.warn('szeletJegyzekTarolo - olvashatatlan jegyzék, üresnek vesszük', { fajl });
        return [];
      }
    },

    /** @param {Array<Object>} lista */
    async ir(lista) {
      await mkdir(hely, { recursive: true });
      await writeFile(fajl, JSON.stringify({ szeletek: lista }, null, 2), 'utf8');
    }
  };
}
