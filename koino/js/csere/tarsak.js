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
 * ⭐ A PORTOT ITT SZÁNDÉKOSAN NEM NÉZZÜK. Egy korábbi, szűkebb szűrő csak a cím+port párost
 * hasonlította a tükörhöz — az IPv6-os saját cím átcsúszott rajta, mert a tükör IPv4-et
 * mondott. Ha a cím a saját GÉPÜNK interfészéé, a port nem számít: magunkat semmilyen
 * porton nem hívjuk.
 *
 * ⛔⛔ ÉS EZÉRT VÁLIK SZÉT A KÉT FORRÁS (2026-09-22): ez a függvény csak az **interfész-
 * címekre** való — azokon senki mással nem osztozunk. ⭐ A **tükör-cím** (amit NAT mögül
 * mutatunk kifelé) MÁS természetű: azon egy egész háztartás, CGNAT alatt pedig több ezer
 * idegen előfizető osztozik, és csak a PORT különbözteti meg őket. Azt a
 * `sajatCimekKiszurese` külön, cím+port párként nézi.
 *
 * ⚠️ AMI NEM VÁLTOZIK: a saját címünket TOVÁBBRA IS HIRDETJÜK másoknak (D39). Két külön
 * dologról van szó — „kit hívjak" és „kiről meséljek". Ez a szűrő csak az elsőre hat.
 *
 * @param {string} hoszt - a vizsgált cím
 * @param {string[]} sajatCimek - a saját GÉPÜNK interfész-címei
 */
export function sajatCimE(hoszt, sajatCimek = []) {
  const mienk = new Set(sajatCimek.map(cimNormalizalasa).filter(Boolean));
  return mienk.has(cimNormalizalasa(hoszt));
}

/**
 * Kiszűri a kapott címek közül a sajátjainkat — KÉT KÜLÖN SZABÁLLYAL.
 *
 * ===== ⛔⛔ MIÉRT KETTŐ, ÉS NEM EGY (2026-09-22, Csaba döntése) =====
 *
 * A NAT (cím-fordítás) miatt egy egész háztartás **egyetlen** külső címet mutat kifelé, és
 * a készülékeket csak a PORT különbözteti meg. Mobilon ez kétszer igaz (CGNAT): ott több
 * ezer, egymást nem ismerő előfizető osztozik egy címen.
 *
 * ⛔ Amíg a tükör-címet is puszta cím szerint szűrtük, **minden velünk egy NAT-on lévő
 * társ láthatatlan volt** a cserén tanult címek közül: a családi koino testvér-telefonja
 * (D22) és — a súlyosabb eset — egy CGNAT alatti **vadidegen** társ is, akinek a helyi
 * felfedezés nem tartalék útja, mert nem is egy hálózaton vagyunk.
 *
 * ⭐ A KÉT SZABÁLY, ÉS AZ OK, AMIÉRT NEM EGYFORMÁK:
 *
 *   · **interfész-cím** → a port NEM számít. Ez a mi gépünk saját címe, senki mással nem
 *     osztozunk rajta. *(És a 2026-08-30-i mérés tanulsága is itt lakik: a saját
 *     IPv6-címünket CSAK így lehet elkapni, mert a tükör IPv4-et mond.)*
 *   · **tükör-cím** → a port SZÁMÍT. Csak a pontos cím+port pár vagyunk mi; ugyanaz a cím
 *     más porton már valaki MÁS készüléke.
 *
 * ⚠️ AZ ÁRA KIMONDVA: a velünk egy NAT-on lévő társat ezután megpróbáljuk hívni, és lehet,
 * hogy a hívás nem megy át (a saját routerünkön magunk felé fordulni külön képesség —
 * *hairpinning* —, amit sok router nem tud). ⭐ Akkor a társ „sikertelen"-ként jegyződik,
 * és a kör megy tovább: *ez a `korbeCsere` alapviselkedése, nem hiba.*
 *
 * @param {Array} kapott
 * @param {string[]} sajatCimek - a saját GÉPÜNK interfész-címei (port nélkül szűrnek)
 * @param {{cim: string, port: number}} [sajatPar] - a tükör: CSAK a pontos pár mi vagyunk
 * @returns {{cimek: Array, kihagyott: number}}
 */
export function sajatCimekKiszurese(kapott, sajatCimek = [], sajatPar = null) {
  const parCim = sajatPar?.cim ? cimNormalizalasa(sajatPar.cim) : null;
  const parPort = Number(sajatPar?.port);

  const cimek = (kapott ?? []).filter((c) => {
    if (!c) return false;
    if (sajatCimE(c.hoszt, sajatCimek)) return false;
    // ⭐ A tükör-cím CSAK a saját portunkkal együtt mi vagyunk.
    if (parCim && Number.isInteger(parPort)
      && cimNormalizalasa(c.hoszt) === parCim && Number(c.port) === parPort) return false;
    return true;
  });
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
 * ⚠️⚠️ A VISSZAADOTT `lista` A KÖR ELEJI KÉP — ne írd ki vakon (2026-09-22). Amíg a kör
 * fut, a postaláda-ág ÚJ társat vehetett fel; a kör eleji képet kiírva az elveszne.
 * ⭐ Ezért ad vissza `megfigyelesek`-et is: azt kell **rávezetni** a friss listára
 * (`megfigyelesekRavezetese`), és a kettő együtt az igazság.
 *
 * @returns {Promise<{lista: Array<Object>, megfigyelesek: Array<Object>, eredmenyek: Array<Object>, sikeres: number, uj: number, kuldott: number}>}
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
    // ⭐ AMIT A KÖR MEGFIGYELT — és CSAK az: kivel sikerült, kivel nem. *A friss listára
    // ezt kell rávezetni, nem a kör eleji képet ráírni.*
    megfigyelesek: [...frissitve.values()],
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

/**
 * ⛔⛔⛔ A KÖR MEGFIGYELÉSEI A FRISS LISTÁRA — az elveszett írás ellen (2026-09-22).
 *
 * ===== A HIBA, AHOGY ELŐKERÜLT =====
 *
 * Az őrjárat a kör ELEJÉN olvasta a társ-listát, a kör VÉGÉN pedig a `korbeCsere`
 * visszaadta (kör eleji) képet írta ki egészben. ⛔ Közben a postaláda-ág egy bekopogótól
 * ÚJ címet tanult — a kör végi írás **csendben elsöpörte**. ⭐ Mérve: a napló kiírta,
 * hogy *„+1 cím"*, a `tarsak.json`-ból a kör után mégis hiányzott.
 *
 * ⭐ A MEGOLDÁS ALAKJA: nem a régi képet írjuk rá az újra, hanem a kör **megfigyeléseit**
 * (kivel sikerült, kivel nem) vezetjük rá arra, ami ÉPP a lemezen van. Amit a kör nem
 * figyelt meg, ahhoz nem nyúlunk; amit közben tanultunk, az megmarad.
 *
 * ⚠️ ÉS AMI KÖZBEN ELTŰNT, AZ ELTŰNVE MARAD: ha a `tars torol` a kör alatt levett valakit,
 * a megfigyelése **nem hozza vissza** — a törlés kimondott emberi tett, a megfigyelés
 * csak mellékterméke a körnek. *Nem szabad, hogy egy kör feltámassza, amit a kéz levett.*
 *
 * @param {Array<Object>} friss - ami ÉPP a lemezen van
 * @param {Array<Object>} megfigyelesek - a `korbeCsere` `megfigyelesek` mezője
 * @returns {Array<Object>} a frissített lista
 */
export function megfigyelesekRavezetese(friss, megfigyelesek) {
  if (!megfigyelesek?.length) return friss;

  const szerint = new Map(megfigyelesek.map((m) => [kulcs(m.hoszt, m.port), m]));
  return friss.map((t) => {
    const megfigyeles = szerint.get(kulcs(t.hoszt, t.port));
    if (!megfigyeles) return t;
    // ⭐ CSAK A MEGFIGYELÉS-MEZŐK jönnek át. A nevet, és bármit, amit a kéz közben írt,
    // a friss sor viszi tovább — a kör nem tud róla, tehát nem is írhatja felül.
    // ⚠️ Az `utoljara` a KETTŐ KÖZÜL A FRISSEBB. Egy `undefined` ráírása TÖRÖLNÉ a
    // frissben álló sikert — ⛔ és egy RÉGI érték ráírása is (2026-09-23): a sikertelen
    // kör megfigyelése a kör ELEJI `utoljara`-t viszi tovább (`...tars`), ami régebbi
    // lehet annál, amit közben egy másik ág a lemezre tett.
    const idok = [t.utoljara, megfigyeles.utoljara].filter((ido) => ido != null);
    return {
      ...t,
      ...(idok.length ? { utoljara: Math.max(...idok) } : {}),
      sikertelen: megfigyeles.sikertelen ?? 0
    };
  });
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
// hogy **kinél van egy adott gondolat**.
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

// ===================================
// ⭐⭐ A FRISS UDP-CÍMEK JEGYZÉKE (2026-09-18, a cím-elévülés válasza)
// ===================================
//
// ⛔⛔ MIÉRT KELL KÜLÖN JEGYZÉK, ÉS MIÉRT NEM A TÁRS-LISTÁBA? Mert a kétféle cím
// ELLENTÉTES szabályt kíván:
//
//   · a TÁRS-LISTA címe TARTÓS (nyitott kapu, helyi cím) — ott a szabály az, hogy „a koino
//     nem felejt el senkit magától", a bukott társ is a listán marad (4. szabály);
//   · ⛔ egy UDP-rés külső címe MÚLÉKONY: a leképezés csendben ELÉVÜL — mérve 150 mp-et
//     túlélt, 330-at nem (31. mérés, telefon), és a szám vonalanként más.
//
// *Egy listában a kettő nem fér meg: ami az egyiknél hűség, az a másiknál halott cím.*
//
// ⭐⭐ A FRISSESSÉG KOR, NEM IDŐBÉLYEG. A vonalon `kor` utazik (hány MÁSODPERCE mértük), és
// a fogadó a SAJÁT órájához köti. *Így nem kell megbízni az idegen órájában* — ugyanaz az
// elv, amiért az állapot sem az `ido` mező szerint rendez.
//
// ⭐ ÉS A HATÁRT A HÍVÓ ADJA MEG, NEM EGY VARÁZSSZÁM (9. szabály): az őrjárat a SAJÁT
// ablakát adja át elévülésnek — ha az e-ember 2 perces bulit kér, a cím 2 percig érdekes.
// Az alábbi állandó csak tartalék, és pontosan az őrjárat alapértelmezett ablaka.
//
// ⚠️ BIZALOM NEM JÁR VELE (3. szabály): a cím nem esemény, nem dönt el semmit. Aki hamis
// címet terjeszt, elérhetetlenséget okoz, nem hamisítást.

/** Tartalék elévülés: az őrjárat alapértelmezett ablaka (5 perc). A hívó felülírhatja. */
export const UDP_CIM_ELEVULES = 5 * 60 * 1000;

/** Legfeljebb ennyi friss UDP-cím utazik egy üzenetben (6. szabály: a bájtok számítanak). */
export const UDP_CIM_KORLAT = 10;

/**
 * Megjegyzi, hogy EBBEN a pillanatban ezen a külső UDP-címen volt elérhető valaki.
 *
 * ⚠️ A cím NÉVTELEN: nem mondjuk meg, kié. ⭐ Nem is kell: a buli elején mindenkire
 * kopogunk, aki a jegyzékben van, és aki felel, az felel. *Egy azonosító–cím kötés a
 * hálózatot feltérképezhetővé tenné (D6) — ez a névtelenség tehát védelem, nem hiányosság.*
 *
 * @returns {Array<Object>} az ÚJ jegyzék
 */
export function udpCimMegjegyzese(jegyzek, hoszt, port, most = Date.now()) {
  const normalt = cimNormalizalasa(hoszt);
  if (!normalt || !Number.isInteger(port) || port <= 0 || port >= 65536) return jegyzek;

  const nelkule = jegyzek.filter(
    (b) => !(cimNormalizalasa(b.hoszt) === normalt && b.port === port)
  );
  return [...nelkule, { hoszt, port, mikor: most }];
}

/**
 * A friss UDP-címek — a legfrissebbek elöl, a vonalra kész alakban (`kor` másodpercben).
 *
 * @returns {Array<{hoszt: string, port: number, kor: number}>}
 */
export function udpCimek(jegyzek, most = Date.now(), elevules = UDP_CIM_ELEVULES) {
  return jegyzek
    .filter((b) => most - b.mikor <= elevules && most >= b.mikor)
    .sort((a, b) => b.mikor - a.mikor)
    .slice(0, UDP_CIM_KORLAT)
    .map((b) => ({ hoszt: b.hoszt, port: b.port, kor: Math.round((most - b.mikor) / 1000) }));
}

/**
 * A cserén kapott friss címek beolvasztása — a kort a SAJÁT óránkhoz kötve.
 *
 * ⛔ Az elévülésnél RÉGEBBIT be sem vesszük: az már halott cím, csak a helyet foglalná.
 */
export function udpCimekBeolvasztasa(jegyzek, kapott, most = Date.now(),
                                     elevules = UDP_CIM_ELEVULES) {
  let uj = jegyzek;
  for (const c of Array.isArray(kapott) ? kapott : []) {
    if (!c || typeof c.hoszt !== 'string' || !Number.isInteger(c.port)) continue;
    const kor = Number.isInteger(c.kor) && c.kor >= 0 ? c.kor * 1000 : null;
    if (kor === null || kor > elevules) continue;
    uj = udpCimMegjegyzese(uj, c.hoszt, c.port, most - kor);
  }
  return uj;
}

/** Kidobja az elévülteket és a korlát fölöttieket — a jegyzék különben korlátlanul hízna. */
export function udpJegyzekTakaritasa(jegyzek, most = Date.now(), elevules = UDP_CIM_ELEVULES) {
  return jegyzek
    .filter((b) => most - b.mikor <= elevules && most >= b.mikor)
    .sort((a, b) => b.mikor - a.mikor)
    .slice(0, UDP_CIM_KORLAT);
}
