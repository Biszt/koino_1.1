// koino/js/csere/tarsak.js

// Felelősség: A TÁRS-LISTA — kikkel próbáljunk cserélni, és milyen sorrendben.
//
// ⭐ MIÉRT KELL EZ? (D33, 2026-08-29 — a harmadik fordulat)
// Négy estén át azon dolgoztunk, hogy ez a laptop FOGADNI tudjon kapcsolatot. Mind a három
// szabvány (NAT-PMP, PCP, UPnP) megbukott a routeren. Aztán kiderült, hogy rossz feladatot
// oldottunk meg: a koinóban nem egy konkrét címzetthez kell eljuttatni valamit, hanem
// mindenkinek — és mindegy, kivel sikerül kapcsolódni, az már továbbadja.
//
// A régi kérdés („el tud-e érni A a B-hez?") N² kapcsolatot követelne. Az új
// („összefüggő-e a gráf?") logaritmikusat: 10 főnél 3, 100-nál 5, 1000-nél 7,
// EGYMILLIÓNÁL ~14 kapcsolat fejenként. Ezért működik a BitTorrent és a Bitcoin
// évtizedek óta, NAT ide vagy oda.
//
// Ebből következik ez a fájl: egyetlen cím helyett LISTA, és ha egy társ nem elérhető,
// az nem hiba, hanem a normális működés. Párban mérve a siker ~70% volt; több társnál
// ez 99% fölé megy — nem okosságból, hanem mert 0,3 az ötödiken már 0,002.
//
// ⚠️ NINCS BENNE HÁLÓZAT (1. szabály). A `korbeCsere` a cserét VÉGZŐ FÜGGVÉNYT kapja meg
// kívülről, nem a `vonal.js`-t importálja. Így ez a réteg ugyanúgy önpróbázható két
// folyamat és két gép nélkül, mint a `csere.js` — és ha a szállítás egyszer pendrive vagy
// rádió lesz, ez a fájl változatlan marad.
//
// ⚠️ NINCS BENNE ÓRA-FÜGGÉS SEM, ami számítana. A `utoljara` és a `sikertelen` mező HELYI
// MEGFIGYELÉS: soha nem megy át a hálózaton, soha nem kerül eseménybe, és soha nem dönt el
// semmit a koinóban. Csak a próbálkozás sorrendjét adja. (Ez pontosan az a fajta adat,
// amiről a terv 3. iránya kimondta: a „mikor kaptam meg" sehol nincs rögzítve, tehát
// konszenzusra alkalmatlan — itt viszont épp ezért ártalmatlan.)
//
// Használják: koino.js (`tarsak`, `tars`, `csere` parancsok) és a tarsakProba.js.

// ===================================
// A LISTA KEZELÉSE — tiszta függvények
// ===================================
//
// Mind a három művelet ÚJ listát ad vissza, a régit nem írja át. Nem elegancia: így a
// próbákban látszik, mi lett volna a változás akkor is, ha a mentés elmarad.

/**
 * Egy társ azonossága a cím ÉS a port együtt — ugyanazon a gépen két koino-példány is
 * futhat (a `KOINO_ADAT` épp ezt teszi lehetővé).
 */
function kulcs(hoszt, port) {
  return String(hoszt).toLowerCase() + '|' + port;
}

/**
 * Egy cím összehasonlítható alakja.
 *
 * ⚠️ MIÉRT KELL? Mert UGYANAZ a gép több néven is leírható, és a puszta szöveg-egyezés
 * ezt elszalasztaná:
 *   · kis/nagybetű az IPv6 hexában — `2001:AB` és `2001:ab` ugyanaz;
 *   · a zóna-utótag (`fe80::1%eth0`) helyi körülmény, nem a cím része;
 *   · az IPv4-et IPv6-ba ágyazó alak (`::ffff:192.168.1.5`) ugyanaz a gép,
 *     mint a `192.168.1.5` — és a foglalat hol így, hol úgy adja vissza.
 */
export function cimNormalizalasa(cim) {
  let sz = String(cim ?? '').trim().toLowerCase();
  const zona = sz.indexOf('%');
  if (zona !== -1) sz = sz.slice(0, zona);
  if (sz.startsWith('::ffff:') && sz.includes('.')) sz = sz.slice(7);
  return sz;
}

/**
 * MIÉNK-E EZ A CÍM? — hogy a készülék ne vegye fel önmagát társnak.
 *
 * ⚠️ EZ MÉRÉSBŐL SZÜLETETT (2026-08-30). A fejlesztő laptopja **minden körben önmagával
 * cserélt** (707 bájt, 0 esemény), mert a saját IPv6-címe rákerült a társ-listára — és
 * mivel a hívás mindig „sikerült", a rendezés a lista ÉLÉRE tette, a valódi társ elé.
 * Sőt a cserén tovább is terjedt: a telefon is megörökölte.
 *
 * ⭐ A PORTOT SZÁNDÉKOSAN NEM NÉZZÜK. Egy korábbi, szűkebb szűrő csak a cím+port párost
 * hasonlította a tükörhöz — az IPv6-os saját cím átcsúszott rajta, mert a tükör IPv4-et
 * mondott. Ha a cím a miénk, a port nem számít: magunkat semmilyen porton nem hívjuk.
 *
 * ⚠️ AMI NEM VÁLTOZIK: a saját címünket TOVÁBBRA IS HIRDETJÜK másoknak (D39). Két külön
 * dologról van szó — „kit hívjak" és „kiről meséljek". Ez a szűrő csak az elsőre hat.
 *
 * @param {string} hoszt - a vizsgált cím
 * @param {string[]} sajatCimek - a saját címeink (interfészek + amit a tükör mond)
 */
export function sajatCimE(hoszt, sajatCimek = []) {
  const mienk = new Set(sajatCimek.map(cimNormalizalasa).filter(Boolean));
  return mienk.has(cimNormalizalasa(hoszt));
}

/**
 * Kiszűri a kapott címek közül a sajátjainkat.
 *
 * @returns {{cimek: Array, kihagyott: number}}
 */
export function sajatCimekKiszurese(kapott, sajatCimek = []) {
  const cimek = (kapott ?? []).filter((c) => c && !sajatCimE(c.hoszt, sajatCimek));
  return { cimek, kihagyott: (kapott ?? []).length - cimek.length };
}

/**
 * Felvesz egy társat a listára. Ha már rajta van, nem duplikál — a nevet viszont
 * frissíti, mert az emberi címke elromolhat, és javítani kell tudni.
 *
 * @param {Array<Object>} lista
 * @param {{hoszt: string, port: number, nev?: string}} tars
 * @returns {Array<Object>} az új lista
 */
export function tarsHozzaadasa(lista, tars) {
  console.log('tarsHozzaadasa - KEZDÉS', { hoszt: tars.hoszt, port: tars.port });

  if (!tars.hoszt) throw new Error('A társnak kell cím.');
  const port = Number(tars.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('A port 1 és 65535 közötti egész szám legyen: ' + tars.port);
  }

  const azonos = kulcs(tars.hoszt, port);
  let megvolt = false;

  const uj = lista.map((meglevo) => {
    if (kulcs(meglevo.hoszt, meglevo.port) !== azonos) return meglevo;
    megvolt = true;
    return { ...meglevo, nev: tars.nev ?? meglevo.nev };
  });

  if (!megvolt) {
    uj.push({ hoszt: tars.hoszt, port, nev: tars.nev, utoljara: null, sikertelen: 0 });
  }

  console.log('tarsHozzaadasa - VÉGE', { megvolt, meret: uj.length });
  return uj;
}

/**
 * Levesz egy társat a listáról.
 *
 * @returns {{lista: Array<Object>, torolt: number}}
 */
export function tarsTorlese(lista, hoszt, port) {
  console.log('tarsTorlese - KEZDÉS', { hoszt, port });

  const azonos = kulcs(hoszt, port);
  const maradt = lista.filter((t) => kulcs(t.hoszt, t.port) !== azonos);

  console.log('tarsTorlese - VÉGE', { torolt: lista.length - maradt.length });
  return { lista: maradt, torolt: lista.length - maradt.length };
}

/**
 * A próbálkozás sorrendje. Nem „optimalizálás": az a cél, hogy a valószínűleg élő
 * társakkal essünk át hamar, mert egy halott címre várni 10 másodperc.
 *
 * A sorrend:
 *   1. akivel sikerült már, a LEGFRISSEBB elöl,
 *   2. akit még sose próbáltunk (nem tudunk róla rosszat),
 *   3. akinél sokszor nem sikerült, a legtöbbször bukott leghátul.
 *
 * ⚠️ Aki sokszor bukott, NEM esik ki. A hálózat változik: egy társ hetekig elérhetetlen
 * lehet, aztán visszajön. A koino nem felejt el senkit magától — törölni csak kézzel
 * lehet (4. szabály: legyen mindig kézi út).
 */
export function tarsakSorrendje(lista) {
  return [...lista].sort((a, b) => {
    const aVolt = a.utoljara != null;
    const bVolt = b.utoljara != null;
    if (aVolt && bVolt) return b.utoljara - a.utoljara;          // frissebb siker elöl
    if (aVolt !== bVolt) return aVolt ? -1 : 1;                   // volt siker > nem volt
    return (a.sikertelen ?? 0) - (b.sikertelen ?? 0);             // kevesebb bukás elöl
  });
}

// ===================================
// A KÖR — végigmenni a listán
// ===================================

/**
 * Végigpróbálja a társakat, és mindegyikkel megkísérli a cserét.
 *
 * ⭐ AMI ITT A LÉNYEG: EGY TÁRS BUKÁSA NEM HIBA. A régi `csere <cím>` parancsnál a
 * sikertelen kapcsolat az egész műveletet elbuktatta — ezért függött minden egyetlen
 * címen (a 2. szabály megsértése). Itt minden hiba elkapódik, feljegyződik, és megyünk
 * a következőre. A kör akkor is „sikeres", ha csak egyetlen társ vette fel.
 *
 * ⚠️ NEM állunk meg az első sikernél. A D33 szerint a cél az ÖSSZEFÜGGŐSÉG: minél több
 * társsal cseréltünk, annál nehezebb kettészakadni. A `legfeljebb` viszont korlátoz, mert
 * a csere ára befogadási kérdés (D35) — egy mobilos e-embernek nem mindegy.
 *
 * @param {Array<Object>} lista - a társak
 * @param {(tars: Object) => Promise<{uj: number, kuldott: number, korok: number}>} csereVegzo
 * @param {{legfeljebb?: number, utana?: Function, most?: number}} [beallitas]
 * @returns {Promise<{lista: Array<Object>, eredmenyek: Array<Object>, sikeres: number, uj: number, kuldott: number}>}
 */
export async function korbeCsere(lista, csereVegzo, beallitas = {}) {
  console.log('korbeCsere - KEZDÉS', { tarsak: lista.length });

  const legfeljebb = beallitas.legfeljebb ?? Infinity;
  const most = beallitas.most ?? Date.now();

  const sorrend = tarsakSorrendje(lista).slice(0, legfeljebb);
  const eredmenyek = [];
  const frissitve = new Map();

  for (const tars of sorrend) {
    let eredmeny;
    try {
      const valasz = await csereVegzo(tars);
      eredmeny = { tars, sikerult: true, ...valasz };
      frissitve.set(kulcs(tars.hoszt, tars.port), { ...tars, utoljara: most, sikertelen: 0 });
    } catch (hiba) {
      // ⭐ Itt NEM dobunk tovább. Egy elérhetetlen társ a normális működés, nem hiba.
      eredmeny = { tars, sikerult: false, hiba: hiba.message };
      frissitve.set(kulcs(tars.hoszt, tars.port), {
        ...tars, sikertelen: (tars.sikertelen ?? 0) + 1
      });
    }

    eredmenyek.push(eredmeny);
    if (beallitas.utana) beallitas.utana(eredmeny);
  }

  // A ki nem próbáltak (a `legfeljebb` miatt kimaradtak) változatlanul maradnak.
  const ujLista = lista.map((t) => frissitve.get(kulcs(t.hoszt, t.port)) ?? t);

  const osszegzes = {
    lista: ujLista,
    eredmenyek,
    sikeres: eredmenyek.filter((e) => e.sikerult).length,
    uj: eredmenyek.reduce((ossz, e) => ossz + (e.uj ?? 0), 0),
    kuldott: eredmenyek.reduce((ossz, e) => ossz + (e.kuldott ?? 0), 0),
    // ⭐ A kör TELJES adatforgalma (D35): ez az a szám, ami a mobilos e-ember számláján
    // megjelenik — és ami miatt a kör `legfeljebb` korlátot kapott.
    bajt: eredmenyek.reduce((ossz, e) => ossz + (e.bajtKuldott ?? 0) + (e.bajtKapott ?? 0), 0)
  };

  console.log('korbeCsere - VÉGE', {
    sikeres: osszegzes.sikeres, probalt: eredmenyek.length, uj: osszegzes.uj
  });
  return osszegzes;
}

// ===================================
// ⭐ A SZELET-CÍMJEGYZÉK — „kinél van ez az entitás?"
// ===================================
//
// ===== MIÉRT KELL, ÉS MIÉRT KÜLÖN A TÁRS-LISTÁTÓL =====
//
// Csaba észrevétele indította el az egészet: *„böngészés közben az összes entitásnak
// elérhetőnek kell lennie, vagy pontosan tudnunk kell, hogy az entitások hol vannak."*
// A társ-lista erre nem elég: az azt mondja meg, **kikkel szoktunk beszélni**, nem azt,
// hogy **kinél van egy adott tartalom**.
//
// ⭐ ÉS A JAVASLAT IS CSABÁÉ: *„mi lenne, ha az entitások tárolnák a tudatpont-tulajdonosaik
// címét, amit frissítünk?"* — Ez nem új gépezet: a `vonal.js` `CIMEK` üzenete ma
// KOINO-szinten kulcsolt címjegyzék; ez ugyanaz **entitás-szinten**.
//
// ===== HÁROM SZABÁLY, AMI NÉLKÜL ELROMLIK =====
//
// 1. ⭐ **NÉV NÉLKÜL.** Nem `tulajdonos → cím` párokat tartunk, hanem PUSZTA CÍMEKET. A
//    döntéshez soha nem kell egy KONKRÉT embert elérni, csak *valakit, akinél megvan* — a
//    név viszont **profil** lenne: elárulná, ki mi iránt érdeklődik és hol van (D6).
//    *(Csaba döntése, 2026-09-02.)*
//
// 2. ⭐ **A HASZNÁLAT TARTJA KARBAN.** Nincs külön frissítő protokoll: amikor egy entitás
//    miatt cserélünk valakivel, a címét a FOGLALATBÓL tudjuk meg — ugyanúgy, ahogy a
//    `latlak` mező is teszi. Nulla plusz forgalom.
//
// 3. ⚠️ **BIZALOM NEM JÁR VELE** (3. szabály). A cím nem esemény, nem megy az
//    `esemenyMentese` kapun, és SEMMIT nem dönt el. Ezért nem is kell aláírni: aki hamis
//    címet ad, elérhetetlenséget okoz, nem hamisítást — a megkapott események ugyanúgy
//    aláírtak, és az ujjlenyomat ugyanúgy összevethető.
//
// ⚠️ NINCS BENNE HÁLÓZAT (1. szabály): tiszta függvények egy sima listán, tehát ugyanúgy
// önpróbázható, mint a társ-lista.

/** Meddig hiszünk el egy szelet-címet? Utána elévül — a cím múlandó körülmény, nem igazság. */
export const SZELET_CIM_ELEVULES = 24 * 60 * 60 * 1000;   // egy nap

/** Legfeljebb ennyi címet tartunk EGY szeletre — a legfrissebbeket. */
export const SZELET_CIM_KORLAT = 20;

/**
 * Megjegyzi, hogy ezen a címen megvan az entitás.
 *
 * @param {Array<Object>} jegyzek - a mai jegyzék (nem írjuk át)
 * @param {string} entitas
 * @param {string} hoszt
 * @param {number} port
 * @param {number} [most]
 * @returns {Array<Object>} az ÚJ jegyzék
 */
export function szeletCimMegjegyzese(jegyzek, entitas, hoszt, port, most = Date.now()) {
  const normalt = cimNormalizalasa(hoszt);
  if (!normalt || !Number.isInteger(port) || port <= 0 || port >= 65536) return jegyzek;

  // Ugyanaz a cím ugyanarra a szeletre csak egyszer szerepel — a friss idő felülírja.
  const nelkule = jegyzek.filter(
    (b) => !(b.entitas === entitas && cimNormalizalasa(b.hoszt) === normalt && b.port === port)
  );

  return [...nelkule, { entitas, hoszt, port, mikor: most }];
}

/**
 * Kinél van ez az entitás? A legfrissebbek elöl.
 *
 * ⚠️ Az elévülteket KIHAGYJUK, de nem töröljük — a takarítás külön művelet (`szeletJegyzekTakaritasa`),
 * hogy a lekérdezés tiszta függvény maradjon.
 *
 * @param {Array<Object>} jegyzek
 * @param {string} entitas
 * @param {number} [most]
 * @param {number} [elevules]
 * @returns {Array<{hoszt: string, port: number, mikor: number}>}
 */
export function szeletCimei(jegyzek, entitas, most = Date.now(), elevules = SZELET_CIM_ELEVULES) {
  return jegyzek
    .filter((b) => b.entitas === entitas && most - b.mikor <= elevules)
    .sort((a, b) => b.mikor - a.mikor)
    .slice(0, SZELET_CIM_KORLAT)
    .map((b) => ({ hoszt: b.hoszt, port: b.port, mikor: b.mikor }));
}

/**
 * Kidobja az elévült bejegyzéseket, és szeletenként a korlát fölöttieket.
 *
 * ⭐ MIÉRT KELL EGYÁLTALÁN TAKARÍTANI? Mert a jegyzék különben korlátlanul hízik — és a
 * cím **múlandó**: egy fél éve látott IP-cím már másé. Az elévülés nem óvatosság, hanem a
 * cím természete.
 *
 * @param {Array<Object>} jegyzek
 * @param {number} [most]
 * @param {number} [elevules]
 * @returns {Array<Object>}
 */
export function szeletJegyzekTakaritasa(jegyzek, most = Date.now(), elevules = SZELET_CIM_ELEVULES) {
  const szeletenkent = new Map();
  for (const b of jegyzek) {
    if (most - b.mikor > elevules) continue;
    const lista = szeletenkent.get(b.entitas);
    if (lista) lista.push(b); else szeletenkent.set(b.entitas, [b]);
  }

  const eredmeny = [];
  for (const lista of szeletenkent.values()) {
    lista.sort((a, b) => b.mikor - a.mikor);
    eredmeny.push(...lista.slice(0, SZELET_CIM_KORLAT));
  }
  return eredmeny;
}
