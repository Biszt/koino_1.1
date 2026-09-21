// koino/js/csere/tabla.js

// Felelősség: A HIRDETŐTÁBLA — „leszakadtam, itt az új címem" — társanként, titkosítva.
//
// ⛔⛔ MIÉRT KELL EGYÁLTALÁN (35. és 36/d. mérés): a kötés-háló a hálózatváltást NEM éli
// túl (mentés nélkül egy nap alatt szétesik), és mobilneten **idegent a NAT nem enged be**,
// tehát a leszakadt készüléket senki nem tudja „felhívni". ⭐ A tábla az egyetlen út: aki
// leszakadt, KIFELÉ kiírja az új címét, a társai pedig KIFELÉ kiolvassák. *Automatizált
// kurbli — a kézi „mondd be a címed" helyett.*
//
// ===== A SZERKEZET, AMI A DÖNTÉSEKBŐL KÖVETKEZIK (Csaba, 2026-09-20) =====
//
//   · a rekesz NEVE a TÁBLA-KULCSUNK (nem az azonosságunk — D6);
//   · TÁRSANKÉNT külön rekesz: a „só" a két NYILVÁNOS titkosító-kulcsból számítódik, tehát
//     ⭐ **csak az a társ tudja kiszámolni, akinek szól** — más még megtalálni sem tudja;
//   · a TARTALOM titkosítva, a KÖZÖS TITOKKAL (ami soha nem utazik).
//
// ⭐⭐ EBBŐL EGY SZÉP TULAJDONSÁG KÖVETKEZIK: a DHT-t figyelő idegen nem tud rekeszt
// keresni, mert a cél kiszámolásához a só kell — ahhoz pedig MINDKÉT fél kulcsa.
// *Nem azért nem olvassa el, mert megtiltjuk, hanem mert nem találja meg.*
//
// ⚠️ EZ A RÉTEG NEM NYIT HÁLÓZATOT (1. szabály): bejegyzéseket KÉSZÍT és OLVAS. Hogy a
// bejegyzés hogyan jut a táblára, az a hívó dolga — ma a `dht.js`, holnap lehet más
// (2. szabály: a tábla cserélhető és elhagyható).
//
// Használják: koino.js (az őrjárat tábla-ága és a `tabla` parancs) és a tablaProba.js.

import { bejegyzesKeszitese, bencodeKodol } from './dht.js';
import { kozosTitok, titkositva, kititkositva, bajtokka, szovegge } from './tablaKulcs.js';

// ⭐ A SÓ HOSSZA: 20 bájt bőven elég (a BEP 44 legfeljebb 64-et enged), és ennyi már
// kitalálhatatlan. *Nem titkosítás, hanem cím: aki nem tudja, az nem találja meg a rekeszt.*
const SO_HOSSZ = 20;

// ⚠️⚠️ A `mikor` MEZŐ: a bejegyzés a címünkön kívül a kiírás idejét is hordozza — abszolút
// időbélyeg, a SAJÁT óránk szerint. ⛔ 2026-09-21-ig itt az állt, hogy „a korát, másodperc-
// ben, és a fogadó a saját órájához köti" — **egyik sem volt igaz**, és a mező fogyasztó
// nélkül állt.
//
// ⭐ ÉS AMI FONTOSABB: a fogadó SZÁNDÉKOSAN frissként jegyzi be a táblán talált címet, és
// ez helyes — a tábla nem pletyka-jegyzék. A névtelen UDP-jegyzékben a kor azt jelenti,
// hogy „a leképezés azóta elhalhatott"; a táblán viszont a társ **mostani** címe áll (csak
// változáskor ír), tehát egy hat órás bejegyzés ugyanúgy érvényes. *Ha a korához kötnénk
// az elévülést, a tábla pont arra válna használhatatlanná, amiért van: a régóta leszakadt
// társ megtalálására.* Melyik a frissebb, azt a BEP 44 `seq` dönti el, nem ez a mező.
//
// ⭐ A `mikor` tehát TÁJÉKOZTATÁS: az e-ember lássa, mikor írta ki a társ (az őrjárat ki is
// írja) — idegen óra, ezért nem dönt semmiről. *Egy mező, ami nem dönt, nem is hazudhat.*
const ALAK = 'koino-cim-1';

/**
 * A TÁRSANKÉNTI rekesz „sója" — a két NYILVÁNOS titkosító-kulcsból, fix sorrendben.
 *
 * ⚠️ MIÉRT NEM A KÖZÖS TITOKBÓL: a só a vonalon UTAZIK (a bejegyzés része, az aláírás rá
 * is szól). Ha a titokból származna, egy kiolvasott só magáról a titokról árulkodna —
 * márpedig a tartalom védelme épp azon áll. ⭐ A nyilvános kulcsokból viszont **mindkét
 * fél** ki tudja számolni, egy kívülálló pedig csak akkor, ha MINDKETTŐT ismeri.
 *
 * ⛔ ÉS AMIT EZ VÉD, AZ A MEGTALÁLÁS, NEM A TARTALOM: a DHT-ben a cél a kulcs és a só
 * lenyomata, tehát só nélkül a rekeszt **megkeresni sem lehet**. *A tartalmat a
 * titkosítás védi — két külön őr, két külön kérdésre.*
 *
 * @param {{titkosito: string}} egyik
 * @param {{titkosito: string}} masik
 * @returns {Promise<Buffer>}
 */
export async function rekeszSoKulcsokbol(egyik, masik) {
  // ⭐ A SORREND NEM A HÍVÓTÓL FÜGG, hanem a kulcsok szövegétől: ugyanaz a két szöveg van
  // meg mindkét gépen, csak fordítva. *Ugyanaz a trükk, mint a fájl-randevú szerepénél.*
  const kettő = [String(egyik.titkosito), String(masik.titkosito)].sort();
  const bajtok = new TextEncoder().encode('koino-tabla-so|' + kettő.join('|'));
  const darat = await crypto.subtle.digest('SHA-256', bajtok);
  return Buffer.from(darat).subarray(0, SO_HOSSZ);
}

/**
 * „Itt az új címem" — EGY társnak szóló, aláírt és titkosított bejegyzés.
 *
 * @param {Object} sajatTablaKulcs - a teljes leírás (titkos résszel)
 * @param {{alairo: string, titkosito: string}} tarsNyilvanos
 * @param {{hoszt: string, port: number}} cim - a friss külső UDP-címünk
 * @param {number} [most]
 * @returns {Promise<Object>} a `dht.js` `kozzetesz`-ének átadható bejegyzés
 */
export async function cimBejegyzes(sajatTablaKulcs, tarsNyilvanos, cim, most = Date.now()) {
  console.log('cimBejegyzes - KEZDÉS', { tars: tarsNyilvanos?.alairo?.slice(0, 8) });

  const titok = await kozosTitok(sajatTablaKulcs, tarsNyilvanos);
  const so = await rekeszSoKulcsokbol(
    { titkosito: sajatTablaKulcs.titkositoNyilvanos }, tarsNyilvanos);

  // A titkosított rakomány: alak + cím + a kiírás ideje (a fogadó a saját órájához köti).
  const rejtett = await titkositva(titok,
    JSON.stringify({ alak: ALAK, hoszt: cim.hoszt, port: cim.port, mikor: most }));

  // ⭐ A SORSZÁM MÁSODPERCBEN: a BEP 44 szerint a nagyobb sorszám írja felül a kisebbet,
  // tehát a frissebb cím legyőzi a régit. *Az óra pontossága itt nem igazság-kérdés:
  // csak az számít, hogy nőjön.*
  const kulcspar = await kulcsparVisszaallitasa(sajatTablaKulcs);
  const bejegyzes = await bejegyzesKeszitese({
    kulcspar, salt: so, seq: Math.floor(most / 1000), ertek: rejtett
  });

  console.log('cimBejegyzes - VÉGE', { bajt: bencodeKodol(rejtett).length, seq: bejegyzes.seq });
  return bejegyzes;
}

/** A tábla-kulcs aláíró fele CryptoKey-ként — a `dht.js` ezt várja. */
async function kulcsparVisszaallitasa(leiras) {
  const privateKey = await crypto.subtle.importKey('pkcs8', bajtokka(leiras.alairoTitkos),
    { name: 'Ed25519' }, false, ['sign']);
  const publicKey = await crypto.subtle.importKey('raw', bajtokka(leiras.alairoNyilvanos),
    { name: 'Ed25519' }, true, ['verify']);
  return { privateKey, publicKey };
}

/**
 * Hol keressük a TÁRS rekeszét? — a kulcsa és a közös só.
 *
 * @returns {Promise<{kulcs: Buffer, so: Buffer}>}
 */
export async function tarsRekesze(sajatTablaKulcs, tarsNyilvanos) {
  return {
    kulcs: bajtokka(tarsNyilvanos.alairo),
    so: await rekeszSoKulcsokbol(
      { titkosito: sajatTablaKulcs.titkositoNyilvanos }, tarsNyilvanos)
  };
}

/**
 * A táblán talált bejegyzés kibontása — „hol van most a társam?"
 *
 * ⛔ HÁROM DOLGOT ELLENŐRIZ, és MINDHÁROM kimondott (D19):
 *   · az aláírást maga a DHT-réteg nézi meg (`bejegyzesEllenorzese`) — az a kulcs írta-e,
 *     akire kérdeztünk;
 *   · a titkosítás sértetlenségét az AES-GCM (ha bárki hozzányúlt, HIBÁT dob);
 *   · az ALAKOT itt nézzük: ami nem a mi formánk, az nem cím.
 *
 * @returns {Promise<{hoszt: string, port: number, mikor: number}|null>}
 */
export async function cimBejegyzesbol(sajatTablaKulcs, tarsNyilvanos, ertek) {
  try {
    const titok = await kozosTitok(sajatTablaKulcs, tarsNyilvanos);
    const nyers = typeof ertek === 'string' ? ertek : Buffer.from(ertek).toString('utf8');
    const nyilt = JSON.parse(await kititkositva(titok, nyers));
    if (nyilt?.alak !== ALAK) return null;
    if (typeof nyilt.hoszt !== 'string' || !Number.isInteger(nyilt.port)) return null;
    if (nyilt.port <= 0 || nyilt.port >= 65536) return null;
    return { hoszt: nyilt.hoszt, port: nyilt.port, mikor: Number(nyilt.mikor) || 0 };
  } catch (hiba) {
    // ⚠️ Nem dobunk tovább: egy olvashatatlan rekesz nem a koino baja (2. szabály —
    // a tábla elhagyható). *De nem is hallgatjuk el.*
    console.warn('cimBejegyzesbol - olvashatatlan bejegyzés', { ok: hiba.message });
    return null;
  }
}

export { szovegge };
