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
// precedens: a `javaslat` parancs ma is aláír egy második eseményt magától.
//
// ===== ⭐⭐⭐ ÉS AMIÉRT MÉGSEM AZONNAL: A MEGÜLEPEDÉS BULIKBAN MÉRVE =====
//
// A koino szabálya szerint *„a késve MEGÉRKEZŐ, de a határidőn belüli időbélyegű szavazat
// jogosan módosítja az eredményt"* (`javaslatSzamitas.js`). Vagyis **egy törlés vissza is
// fordulhat**. ⛔ Ha a készülék azonnal felszabadítana, a gondolat a pontom NÉLKÜL térne
// vissza — és ha csak az én pontom volt rajta, a felszabadításom **maga törölné el** azt,
// amit a közösség épp nem akart törölni. *A könyvelés nem dönthet el olyat, amit a szavazás
// nem döntött el.*
//
// ⛔⛔ **ÉS AZ ÓRA NEM JÓ MÉRCE ERRE (Csaba, 2026-09-07).** Először naphoz kötöttem, de az
// idő múlása **semmit nem bizonyít**: egy hétvégén kikapcsolt készülék mellett három nap
// alatt sem érkezik semmi, egy sűrűn cserélő mellett viszont öt perc alatt körbeér minden.
// ⭐ Amit mérni akarunk, az nem idő, hanem **egyeztetés**: hányszor beszéltem azóta
// másokkal úgy, hogy nem hoztak semmi újat erről a döntésről.
//
// ⭐⭐ EZÉRT A MÉRCE A **BULI**: egy csere-kör, amiben **legalább egy társ tényleg felelt**.
// A néma kör nem bizonyít semmit — attól, hogy senki nem vette fel, még nem ért körbe.
//
// ⭐⭐ ÉS A MÁSIK FELE, AMI NÉLKÜL A SZÁMLÁLÁS CSALÓKA LENNE: a döntés **jele**. Minden
// tételhez eltesszük, MELYIK egyezmény, és MIKORRA született (`javaslat|megszuletett`). Ha
// ez megváltozik — mert egy késve érkező szavazat átírta a lezárás idejét —, a számláló
// **nulláról indul**. *Nem a bulik gyűlnek, hanem a MOSTANI döntés melletti bulik.*
//
// ⚠️ És ez SEM bizonyíték, csak ár: egy hónapja offline készülék bármikor felbukkanhat. De
// a buli-szám **azt méri, ami történik** (egyeztetés), nem azt, ami csak telik (idő) — és a
// várakozás ingyen van: 2026-09-07 óta a kiosztott összeg a saját láncból számít, tehát a
// koino az elakadt ponttal is hibátlanul működik.
//
// ⚠️ A feljegyzés **HELYI** — sosem terjed, és semmit nem dönt el a koinóban (3. szabály).
// Ugyanaz a fajta, mint a `tarsak.js` `utoljara` mezője vagy a pakli horgonya.
//
// Használják: `koino.js` (őrjárat és a kézi parancs), és a felület.

import { elakadtPontok, szetosztottPontok } from './allapotSzamitas.js';

// ⚠️⚠️ EZ A SZÁM MÉG NINCS MEGMÉRVE. Csaba kérése: *„mégjobb lenne ezt az értéket méréssel
// meghatározni."* A `meres/felszabaditasMeres.js` adja hozzá a görbét — addig ez egy
// óvatos alapérték, nem állítás. ⭐ A mérés nem „igen/nem"-et fog adni, hanem azt, hogy K
// tiszta buli után az esetek hány százalékában nem érkezik már döntést módosító esemény.
export const MEGULEPEDES_BULIK = 3;

/**
 * Üres feljegyzés — a buli-számlálóval együtt.
 *
 * ⭐ A számláló KÉSZÜLÉK-SZINTŰ (hány bulin voltam összesen), a tételek pedig azt jegyzik,
 * MELYIK buli-számnál láttuk először ezt a törlést. A kettő különbsége a „tiszta bulik".
 */
export function ujJegyzet() {
  return { bulik: 0, tetelek: {} };
}

/** Egy régi (vagy sérült) feljegyzés egységes alakra hozása. */
function jegyzetNormalizalas(jegyzet) {
  if (!jegyzet || typeof jegyzet !== 'object') return ujJegyzet();
  return {
    bulik: Number.isInteger(jegyzet.bulik) ? jegyzet.bulik : 0,
    tetelek: (jegyzet.tetelek && typeof jegyzet.tetelek === 'object') ? { ...jegyzet.tetelek } : {}
  };
}

/**
 * Egy BULI: a készülék egy csere-körön volt, ahol legalább egy társ felelt.
 *
 * ⚠️ Miért nem a sikeres társak SZÁMA? Mert egy kör során ugyanaz a hír jár körbe: öt
 * társtól hallani ugyanazt a „nincs újdonság"-ot nem öt bizonyíték. A körök viszont
 * időben elválnak — közben új esemény születhetett és terjedhetett.
 *
 * @param {Object} jegyzet
 * @param {number} sikeresTarsak - hány társsal sikerült a csere ebben a körben
 * @returns {Object} az új jegyzet
 */
export function buliVolt(jegyzet, sikeresTarsak) {
  const j = jegyzetNormalizalas(jegyzet);
  if (sikeresTarsak > 0) j.bulik += 1;
  return j;
}

/**
 * Frissíti a helyi feljegyzést, és megmondja, MI SZABADÍTHATÓ FEL MÁR.
 *
 * ⭐ HÁROM DOLGOT TESZ, ÉS MIND A HÁROM FONTOS:
 *
 *   1. az ÚJ törléseket felveszi (a számláló ettől a buli-számtól indul);
 *   2. amit a jegyzet ismer, de **már nem elakadt** — mert a döntés visszafordult, vagy a
 *      gazda magától visszavette a pontját —, azt **kiveszi**; és amelyiknél a döntés
 *      **jele megváltozott** (más lezárási idő), ott **nulláról indítja** a számlálót;
 *   3. felsorolja, aminek megvan a kellő számú tiszta bulija.
 *
 * @param {Object} allapot - a HÁROM FÁZIS után (a `torlesek` lista onnan jön)
 * @param {string} szerzo - én
 * @param {Object} jegyzet - a helyi feljegyzés
 * @param {number} [kellBuli]
 * @returns {{jegyzet: Object, feloldhato: Array, varakozok: Array}}
 */
export function felszabaditasiTerv(allapot, szerzo, jegyzet = ujJegyzet(),
                                   kellBuli = MEGULEPEDES_BULIK) {
  const j = jegyzetNormalizalas(jegyzet);
  const elakadt = elakadtPontok(allapot, szerzo);

  const ujTetelek = {};
  const feloldhato = [];
  const varakozok = [];

  for (const tetel of elakadt) {
    const regi = j.tetelek[tetel.entitas];

    // ⭐ UGYANARRÓL A DÖNTÉSRŐL VAN SZÓ? Ha nem (más lezárási idő), a számláló újraindul.
    const folytatas = regi && regi.allas === tetel.allas;
    const ota = folytatas ? regi.ota : j.bulik;
    ujTetelek[tetel.entitas] = { ota, allas: tetel.allas };

    const tisztaBulik = j.bulik - ota;
    if (tisztaBulik >= kellBuli) feloldhato.push({ ...tetel, tisztaBulik });
    else varakozok.push({ ...tetel, tisztaBulik, kell: kellBuli });
  }

  // ⚠️ Ami kikerült az elakadtak közül, az a jegyzetből is kikerül (2. pont) — a `ujTetelek`
  // csak a MOSTANI elakadtakat tartalmazza.
  return { jegyzet: { bulik: j.bulik, tetelek: ujTetelek }, feloldhato, varakozok };
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
 */
export function felszabaditas(allapot, szerzo, jegyzet = ujJegyzet(),
                              kellBuli = MEGULEPEDES_BULIK) {
  const terv = felszabaditasiTerv(allapot, szerzo, jegyzet, kellBuli);
  return {
    ...terv,
    lepesek: felszabaditoLepesek(terv.feloldhato, szetosztottPontok(allapot, szerzo))
  };
}
