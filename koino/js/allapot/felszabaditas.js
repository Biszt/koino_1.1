// koino/js/allapot/felszabaditas.js

// Felelősség: eldönteni, MELYIK elakadt tudatpontot szabad már visszavenni — és hogy
// mikor. A visszavételt magát a `muveletek.js` írja alá, a hálózatot és a fájlt a hívó
// intézi; ez a lap **tiszta logika**, ezért próbázható.
//
// ===== ⛔⛔ MIÉRT VAN EGYÁLTALÁN „ELAKADT" PONT (Csaba kérdése, 2026-09-07) =====
//
// *„Ha nem veszi vissza, akkor az entitás hogyan törlődik, hiszen rajta van a készülékén
// tudatponttal?"*
//
// ⭐ A gondolat **törlődik** — az eltűnés SZÁMÍTÁS az egyezményből, nem a pontok
// nullázódásának következménye, tehát minden készüléken ugyanaz jön ki. A pont viszont a
// gazdája keretében marad: a tudatpont-rendezés ALÁÍRT esemény, és **senki nem írhat alá
// helyettem** (D15).
//
// ⚠️ EZT ELŐSZÖR ÚGY ÍRTAM LE, HOGY „NEM LEHET AUTOMATIZÁLNI" — és ez rossz következtetés
// volt. Más tényleg nem írhat alá helyettem, de a koino **az ÉN készülékemen fut, az ÉN
// kulcsommal**. Amikor a készülékem aláírja, hogy „leveszem a pontomat egy gondolatról, ami
// már nem létezik", az nem helyettem ír alá — az a saját készülékem könyvel. ⭐ És van rá
// precedens: a `javaslat` parancs ma is aláír egy második eseményt magától (a tudatpontot a
// javaslatra).
//
// ===== ⭐⭐ ÉS AMIÉRT MÉGSEM AZONNAL: A MEGÜLEPEDÉS (Csaba döntése) =====
//
// A koino szabálya szerint *„a késve MEGÉRKEZŐ, de a határidőn belüli időbélyegű szavazat
// jogosan módosítja az eredményt"* (`javaslatSzamitas.js`). Vagyis **egy törlés vissza is
// fordulhat**, ha később megérkezik egy addig hiányzó szavazat.
//
// ⛔ Ha a készülék azonnal felszabadítana, a gondolat a pontom NÉLKÜL térne vissza — és ha
// csak az én pontom volt rajta, a felszabadításom **maga törölné el** azt, amit a közösség
// épp nem akart törölni. *A könyvelés nem dönthet el olyat, amit a szavazás nem döntött el.*
//
// ⭐ A várakozás ingyen van: 2026-09-07 óta a kiosztott összeg a saját láncból számít
// (`szetosztottPontok`), tehát a koino az elakadt ponttal is **hibátlanul működik** — csak a
// keretből hiányzik annyi. Nincs miért kapkodni.
//
// ⚠️ A feljegyzés, hogy mikor láttuk először a törlést, **HELYI** — sosem terjed, és semmit
// nem dönt el a koinóban (3. szabály). Ugyanaz a fajta, mint a `tarsak.js` `utoljara`
// mezője vagy a pakli horgonya.
//
// Használják: `koino.js` (őrjárat és az írás-parancsok előtt), és a felület.

import { elakadtPontok, szetosztottPontok } from './allapotSzamitas.js';

// ⭐ MENNYIT VÁRUNK? Egy nap. Nem szent szám: annyi, hogy egy naponta egyszer szinkronizáló
// készülék is beérjen a döntéssel, mielőtt könyvelünk. ⚠️ A saját óránk szerint mérjük, és
// ez rendben van: ez HELYI könyvelési döntés, nem állítás a világról.
export const MEGULEPEDES = 24 * 3600 * 1000;

/**
 * Frissíti a helyi feljegyzést, és megmondja, MI SZABADÍTHATÓ FEL MÁR.
 *
 * A feljegyzés alakja: `{ [entitás]: mikor láttuk ELŐSZÖR töröltnek }`.
 *
 * ⭐ HÁROM DOLGOT TESZ, ÉS MIND A HÁROM FONTOS:
 *
 *   1. az ÚJ törléseket felveszi a feljegyzésbe (megkezdi az órát);
 *   2. amit a feljegyzés ismer, de **már nem törölt** — mert a döntés visszafordult, vagy
 *      a gazda magától visszavette a pontját —, azt **kiveszi**: az óra újraindul, ha
 *      megint törlik. *A megülepedés nem gyűlik, hanem a MOSTANI törlésre vonatkozik.*
 *   3. és felsorolja, aminek az órája letelt.
 *
 * @param {Object} allapot - a HÁROM FÁZIS után (a `torlesek` lista onnan jön)
 * @param {string} szerzo - én
 * @param {Object} jegyzet - a helyi feljegyzés (helyben módosul)
 * @param {number} [most]
 * @param {number} [varakozas]
 * @returns {{jegyzet: Object, feloldhato: Array<{entitas: string, pont: number}>,
 *            varakozok: Array<{entitas: string, pont: number, meddig: number}>}}
 */
export function felszabaditasiTerv(allapot, szerzo, jegyzet = {}, most = Date.now(),
                                   varakozas = MEGULEPEDES) {
  const elakadt = elakadtPontok(allapot, szerzo);
  const elakadtAzonositok = new Set(elakadt.map((e) => e.entitas));

  // ----- 2. AMI MÁR NEM ELAKADT: kivesszük (az óra újraindul) -----
  const ujJegyzet = {};
  for (const [entitas, mikor] of Object.entries(jegyzet)) {
    if (elakadtAzonositok.has(entitas)) ujJegyzet[entitas] = mikor;
  }

  const feloldhato = [];
  const varakozok = [];

  for (const tetel of elakadt) {
    // ----- 1. ÚJ TÖRLÉS: itt indul az óra -----
    if (ujJegyzet[tetel.entitas] === undefined) ujJegyzet[tetel.entitas] = most;

    // ----- 3. LETELT-E? -----
    const meddig = ujJegyzet[tetel.entitas] + varakozas;
    if (most >= meddig) feloldhato.push(tetel);
    else varakozok.push({ ...tetel, meddig });
  }

  return { jegyzet: ujJegyzet, feloldhato, varakozok };
}

/**
 * A felszabadító események ADATAI — aláírás nélkül.
 *
 * ⭐ MIÉRT KÜLÖN? Mert az aláírás a `muveletek.js` dolga, és mert így a **bemondott összeg**
 * (D42) számítása mérhető: minden lépés után csökken a kiosztott összeg, tehát a
 * sorozatnak önmagával konzisztensnek kell lennie. ⚠️ Ez nem részletkérdés: ha a bemondás
 * elcsúszik, a saját eseményem bukik el *„a bemondott összeg ellentmond a saját láncának"*
 * indoklással — pontosan az a hiba, amit Csaba kérdése kihozott.
 *
 * @param {Array<{entitas: string, pont: number}>} feloldhato
 * @param {number} kiindulasiOsszeg - a MOSTANI kiosztott összegem (`szetosztottPontok`)
 * @returns {Array<{entitas: string, pont: number, kiosztva: number}>}
 */
export function felszabaditoLepesek(feloldhato, kiindulasiOsszeg) {
  let osszeg = kiindulasiOsszeg;
  return feloldhato.map((tetel) => {
    osszeg -= tetel.pont;                       // ennyivel kevesebb lesz kiosztva
    return { entitas: tetel.entitas, pont: 0, kiosztva: osszeg };
  });
}

/**
 * Kényelmi burkoló: terv + lépések egy hívásban.
 *
 * @param {Object} allapot
 * @param {string} szerzo
 * @param {Object} jegyzet
 * @param {number} [most]
 * @param {number} [varakozas]
 */
export function felszabaditas(allapot, szerzo, jegyzet = {}, most = Date.now(),
                              varakozas = MEGULEPEDES) {
  const terv = felszabaditasiTerv(allapot, szerzo, jegyzet, most, varakozas);
  return {
    ...terv,
    lepesek: felszabaditoLepesek(terv.feloldhato, szetosztottPontok(allapot, szerzo))
  };
}
