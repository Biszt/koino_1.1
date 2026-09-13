// koino/js/csere/fajlKerelem.js

// Felelősség: A FÁJL-KÉRELEM LOGIKÁJA — mit kérdezek a bulin, mit válaszolok, és mit
// tanulok a válaszból. ⚠️ **Hálózatot nem importál** (1. szabály), tehát mérhető nélküle.
//
// ===== ⭐ CSABA TERVE (2026-09-12), ÉS ITT A KÖZÉPSŐ DARABJA =====
//
// > *„a buli alkalmával, mindenki kiküldi a kérelmeit, ami a böngészés közben született, és
// > megkapja azokat a kéréseket, amik az ő eszközéről kérnek adatot."*
//
// A **felderítés** megvan (`js/allapot/fajlIgeny.js`: mi hiányzik), a **szállítás** még
// nincs (a bájtok). Ez a lap a kettő között áll: a bulin **kiderül, kinél van meg**, amire
// szükségem van — és ettől lesz mit szállítani, és lesz mi alapján sorrendet tartani.
//
// ===== ⛔⛔ MÚLÉKONY ÜZENET, NEM ESEMÉNY (Csaba döntése) =====
//
// A kérelem **nem kerül a láncra**, két okból: ⛔ eseményként **a böngészésem** kerülne fel,
// örökre és mindenki számára láthatóan (*mit néztem meg* — a D6 személyes-adat határa), és
// ⛔ minden kérés ~400 bájttal növelné a tartós adatot, holott a kérés **egyszeri**.
//
// ⭐ Amit a válaszból megtanulunk (*kinél van meg*), az **helyi feljegyzés** (3. szabály):
// sosem terjed, két készüléken mást jelent, és semmit nem dönt el a koinóban — ugyanaz a
// fajta, mint a `tarsak.js` `utoljara` mezője.
//
// ===== ⭐⭐ ÉS A LEGFONTOSABB SZERKEZETI ÉSZREVÉTEL =====
//
// **A fájl-csere MERŐLEGES az esemény-cserére.** Két készülék eseményei egyezhetnek (a
// `LENYOMAT` megegyezik, a kör 334 bájttal kilép), miközben a **fájljaik teljesen
// eltérnek** — hiszen a bájtok sosem utaztak. ⛔ Ezért a fájl-kérdést akkor is fel kell
// tenni, ha nincs mit cserélni eseményből. *A két réteg külön él, ahogy a D3 mondja.*
//
// Használják: `vonal.js` (a párbeszédben) és a `koino.js`.

// ⛔ HÁNY FÁJLT KÉRDEZÜNK EGY KÖRBEN? Nem kényelmi szám: a „nincs újdonság" csere-kör ma
// **334 bájt** (6. szabály, mérve), és egy lenyomat 43 karakter. Ötven kérdés ~2 KB — még
// elfér, de a végtelen már nem. ⭐ És nem is kell több: a legfontosabbakat úgyis előre
// rendezzük, a többi a következő bulin sorra kerül.
export const KERELEM_KORLAT = 50;

// ===================================
// 1. AMIT KÉRDEZEK
// ===================================

/**
 * A kérelem: mely fájlokról kérdezem meg, hogy megvannak-e nála.
 *
 * ⭐ A SORREND A `fajlIgeny` RENDEZÉSÉT KÖVETI (vállaltak előre) — itt csak vágunk.
 *
 * @param {Array<Object>} hianyzok - a `fajlIgenyek` eredménye
 * @param {number} [korlat]
 * @returns {Array<string>} lenyomatok
 */
export function kerelemOsszeallitasa(hianyzok, korlat = KERELEM_KORLAT) {
  const kerek = [];
  for (const h of hianyzok ?? []) {
    if (kerek.length >= korlat) break;
    if (typeof h?.lenyomat === 'string') kerek.push(h.lenyomat);
  }
  return kerek;
}

// ===================================
// 2. AMIT VÁLASZOLOK
// ===================================

/**
 * A válasz: a KÉRDEZETTEK közül melyik van meg nálam.
 *
 * ⛔⛔ CSAK A KÉRDEZETTEKRŐL BESZÉLÜNK, ÉS EZ SZÁNDÉKOS. Két oka van, és mindkettő fontos:
 *
 *   · **méret** — a „mim van" teljes listája a fájljaim számával nőne, és minden körben
 *     utazna (6. szabály);
 *   · ⭐ **magánélet** — a fájl-listám elárulná, **mit néztem meg**, akkor is, ha a kérdező
 *     sosem hallott arról a gondolatról. *Csak arra felelünk, amit kérdeztek.*
 *
 * ⚠️ A „megvan-e?" KÍVÜLRŐL JÖN (1. szabály), tehát ez a függvény tár nélkül mérhető.
 *
 * @param {Array<string>} kertek
 * @param {Function} megvanE - async (lenyomat) → boolean
 * @param {number} [korlat]
 * @returns {Promise<Array<string>>} amik megvannak
 */
export async function valaszOsszeallitasa(kertek, megvanE, korlat = KERELEM_KORLAT) {
  const van = [];
  // ⛔ A KÉRDÉST IS KORLÁTOZZUK, nem csak a sajátunkat: egy rosszindulatú fél százezer
  // lenyomatot küldhetne, és a válasz összeállítása ugyanannyi lemez-kérdés lenne.
  for (const lenyomat of (kertek ?? []).slice(0, korlat)) {
    if (typeof lenyomat !== 'string') continue;
    if (await megvanE(lenyomat)) van.push(lenyomat);
  }
  return van;
}

// ===================================
// 3. AMIT TANULOK — a birtoklás-jegyzet
// ===================================

/**
 * Beolvasztja a választ a helyi jegyzetbe: „ennél a társnál megvan ez a fájl".
 *
 * ⚠️ **HELYI FELJEGYZÉS, NEM ESEMÉNY** (3. szabály): sosem terjed, és semmit nem dönt el a
 * koinóban — csak azt, hogy **kitől érdemes kérni**. Ha elveszik, a következő buli
 * újratanulja.
 *
 * ⭐ AZ IDŐVEL EGYÜTT JEGYEZZÜK, mert egy régi hír **nem hazugság, hanem elavult**: a társ
 * azóta törölhette (D3: a tartalmi réteg elveszhet). A szállítás majd eldönti, meddig hisz
 * neki; itt nem bíráskodunk.
 *
 * @param {Object} jegyzet - lenyomat → { tarsak: { cimke: idopont } }
 * @param {string} tars - a társ CÍMKÉJE (hoszt:port) — ⚠️ helyi név, nem azonosság
 * @param {Array<string>} van
 * @param {number} [most]
 * @returns {Object} az ÚJ jegyzet (a régit nem írjuk át helyben)
 */
export function birtoklasBeolvasztasa(jegyzet, tars, van, most = Date.now()) {
  const uj = { ...(jegyzet ?? {}) };

  for (const lenyomat of van ?? []) {
    if (typeof lenyomat !== 'string') continue;
    const eddig = uj[lenyomat]?.tarsak ?? {};
    uj[lenyomat] = { tarsak: { ...eddig, [tars]: most } };
  }

  return uj;
}

// ===================================
// 4. ⭐ A RITKÁBBAT ELŐBB (Csaba döntése, 2026-09-13)
// ===================================

/**
 * A hiányzók sorrendje: **a ritkábbat előbb**.
 *
 * ⭐ MIÉRT: ha egy fájl sok készüléken megvan, ráér; ha kevésen, az a **veszélyeztetett**
 * (D3: a tartalmi réteg elveszhet). *És a jelzés ehhez már a bulin megvan — nem kell külön
 * nyilvántartás.*
 *
 * ⛔⛔ ÉS AMI SZÁNDÉKOSAN NINCS: „ki mennyit adott / kapott" mérleg. Az **rangsor** lenne,
 * amit a koino már kétszer elvetett (D18/2, D48) — *aki sokat ad, azt a szerkezet úgyis
 * megtalálja, nem kell pontozni érte.*
 *
 * A sorrend három lépcsőben dől el, és **determinisztikus**:
 *   1. amit **vállaltam** (tudatpontot tettem rá — D3), az előbb;
 *   2. azon belül **a ritkább** (kevesebb ismert birtokos);
 *   3. holtversenynél a **lenyomat** — hogy a sorrend sose legyen esetleges.
 *
 * @param {Array<Object>} hianyzok
 * @param {Object} jegyzet
 * @returns {Array<Object>} ugyanazok az elemek, `birtokosok` mezővel kiegészítve
 */
export function ritkasagSzerint(hianyzok, jegyzet) {
  const birtokosokSzama = (lenyomat) =>
    Object.keys(jegyzet?.[lenyomat]?.tarsak ?? {}).length;

  return (hianyzok ?? [])
    .map((h) => ({ ...h, birtokosok: birtokosokSzama(h.lenyomat) }))
    .sort((a, b) => {
      if (a.vallaltam !== b.vallaltam) return a.vallaltam ? -1 : 1;
      if (a.birtokosok !== b.birtokosok) return a.birtokosok - b.birtokosok;
      return a.lenyomat < b.lenyomat ? -1 : 1;
    });
}
