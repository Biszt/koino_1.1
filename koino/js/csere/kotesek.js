// koino/js/csere/kotesek.js

// Felelősség: A KÖTÉS-HÁLÓ könyvelése — kivel tartok rendszeres kapcsolatot, és mikor
// hallottam róluk utoljára.
//
// ⭐ CSABA ÖTLETE (2026-09-18): *„minden készülék 2-3 készülékkel tartana fent egy olyan
// energiatakarékos kapcsolatot, ami lehetővé tenné, hogy elcsípjük a címváltást úgy, hogy
// még a régivel kapcsolatban vagyunk… a csoportok nem szigetek lennének, hanem hálózatba
// rendezve."*
//
// ===== MIÉRT NEM A CÍM AZONOSÍTJA A KÖTÉST =====
//
// ⛔ Mert épp a cím az, ami elromlik. A friss UDP-címek jegyzéke (`tarsak.js`) SZÁNDÉKOSAN
// névtelen, és percek alatt elévül — az jó arra, hogy „kire kopogjak MOST", de arra nem,
// hogy „kivel tartok kapcsolatot". ⭐ A kötést ezért a TÁBLA-KULCS azonosítja
// (`tablaKulcs.js`): a cím változik, az nem — és a hirdetőtáblán is ez lesz a rekesz neve.
//
// ⭐⭐ ÉS EZ VÉDI A CÍMET IS: a kötés megőrzi a társ utolsó ismert címét AKKOR IS, ha az
// elévült a névtelen jegyzékből. Egy kopogás ~60 bájt — *sokkal olcsóbb megpróbálni, mint
// elfelejteni valakit, akivel tegnap még beszéltünk.*
//
// ⚠️ HELYI MEGFIGYELÉS, NEM ESEMÉNY (3. szabály): a kötés-jegyzék sosem terjed, és semmit
// nem dönt el a koinóban — csak azt, hogy kire kopogunk a bulin. Ha elveszik, a következő
// bulikon újraépül.
//
// ⚠️ EZ A FÁJL NEM IMPORTÁL HÁLÓZATOT ÉS TÁRAT (1. szabály): tiszta függvények, a jegyzéket
// paraméterként kapja — ezért próbázható hálózat nélkül.
//
// Használják: koino.js (az őrjárat) és a kötésProba.js.

// ⭐ HÁNY KÖTÉS? Csaba választása: 3 (legfeljebb 5). A 35. mérés ezzel a K=3-mal futott, és
// a 9. szabály is ezt kéri: **felülről korlátos** szám, ami a mérettel nem nő. *Egymilliárd
// készüléknél is három kötést tart egy telefon — a hálót nem a fokszám tartja össze, hanem
// hogy a kötések VÉLETLENEK (35. mérés: ~14 lépés bárhonnan bárhová).*
export const KOTES_CEL = 3;
export const KOTES_KORLAT = 5;

// ⭐ HÁNY CÍMET JEGYEZ MEG EGY KÖTÉS? (D71 (ii), 2026-09-26) — egy készüléknek jellemzően egy
// helyi (wifis) és egy nyilvános címe van, és egy harmadik, ha hálózatot vált (otthon · a
// szomszédban · mobilon). A szám felülről korlátos (9. szabály): a legrégebben használt esik ki.
export const KOTES_CIM_KORLAT = 3;

/**
 * Helyi cím-e? — a helyi hálón (vagy a gépen belül) elérhető IPv4-cím.
 *
 * ⭐ MIÉRT KELL (D71 (ii)): ha egy kötést KÉT úton is elérünk (otthon a helyi címén és a
 * routeren átforduló nyilvánoson — 43., 45. mérés), a helyit hívjuk előbb: gyorsabb, nem
 * terheli a routert, és ha felel, a másikat nem is kell hívni. ⚠️ A 100.64/10 (a szolgáltatói
 * NAT) NEM helyi: a mi hálónkról nem érhető el.
 */
export function helyiCimE(hoszt) {
  return cimRangja(hoszt) < 3;
}

/**
 * A cím RANGJA a hívás sorrendjéhez: 0 = a gépen belül (127/8) · 1 = helyi háló (10/8,
 * 172.16/12, 192.168/16) · 2 = link-local (169.254/16) · 3 = minden más (nyilvános).
 *
 * ⛔ MIÉRT RANG, ÉS NEM CSAK „HELYI-E": a két félnek UGYANAZT az utat kell választania. Ha mindkét
 * cím helyi (egy gépen a hurok- és a wifis cím; egy készülék két hálózati kártyával), a „legutóbb
 * használt" a két oldalon eltérhet — az A a hurkon hívná a B-t, a B a wifin az A-t, és megint két
 * csere lenne. *A rang mindkét oldalon ugyanúgy dől el: nem a saját emlékezetünkből, hanem a
 * címből.*
 */
export function cimRangja(hoszt) {
  const m = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(String(hoszt ?? '').replace(/^::ffff:/, ''));
  if (!m) return 3;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 127) return 0;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 1;
  if (a === 169 && b === 254) return 2;
  return 3;
}

/**
 * Egy kötés ismert címei — a legutóbb használt elöl.
 * ⚠️ A régi (egy címes) bejegyzésből is ad listát: a jegyzék a lemezen él, és a D71 előtt írták.
 */
export function kotesCimei(k) {
  const lista = Array.isArray(k?.cimek) && k.cimek.length ? k.cimek
    : (k?.hoszt && Number.isInteger(k?.port) ? [{ hoszt: k.hoszt, port: k.port, utoljara: k.utoljara ?? 0 }] : []);
  return lista.filter((c) => c && c.hoszt && Number.isInteger(c.port));
}

/**
 * Egy sikeres találkozás feljegyzése.
 *
 * ⭐ A KÖTÉS NEM KÉRÉS, HANEM TÉNY: nem megállapodunk róla, hanem abból lesz, hogy
 * rendszeresen összeérünk. *Ugyanaz az elv, mint a tudatpontnál: nem engedélyt kérünk,
 * hanem teszünk valamit, és az látszik.*
 *
 * ⭐⭐ ÉS MEGJEGYZI, HOL ÉRTÜK EL (D71 (ii), 2026-09-26): a `cimek` a társ legutóbbi
 * `KOTES_CIM_KORLAT` címe. *Így tudja a következő kör, hogy a helyi és a nyilvános cím UGYANAZ a
 * társ — és nem cserél vele kétszer (45. mérés).* A `hoszt`/`port` a legutóbbi (a régi alak).
 *
 * @param {Array<Object>} jegyzek
 * @param {{alairo: string, titkosito: string}} tablaKulcs - a társ tábla-kulcsa (azonosító)
 * @param {{hoszt: string, port: number}} cim - ahol MOST elértük
 * @returns {Array<Object>} az ÚJ jegyzék
 */
export function talalkozasFeljegyzese(jegyzek, tablaKulcs, cim, most = Date.now()) {
  if (!tablaKulcs?.alairo) return jegyzek;

  const regi = (jegyzek ?? []).find((k) => k.alairo === tablaKulcs.alairo);
  const vanCim = cim?.hoszt && Number.isInteger(cim?.port);
  const cimek = [
    ...(vanCim ? [{ hoszt: cim.hoszt, port: cim.port, utoljara: most }] : []),
    ...kotesCimei(regi).filter((c) => !vanCim || c.hoszt !== cim.hoszt || c.port !== cim.port)
  ].sort((a, b) => (b.utoljara ?? 0) - (a.utoljara ?? 0)).slice(0, KOTES_CIM_KORLAT);
  const uj = {
    alairo: tablaKulcs.alairo,
    titkosito: tablaKulcs.titkosito ?? regi?.titkosito ?? null,
    hoszt: cim?.hoszt ?? regi?.hoszt ?? null,
    port: Number.isInteger(cim?.port) ? cim.port : (regi?.port ?? null),
    cimek,
    utoljara: most,
    // ⭐ HÁNYSZOR ÉRTÜNK ÖSSZE: ebből lesz a kötés. *Egy véletlen találkozás még nem
    // kapcsolat; a rendszeresség az.*
    talalkozasok: (regi?.talalkozasok ?? 0) + 1,
    eloszor: regi?.eloszor ?? most
  };

  return [...(jegyzek ?? []).filter((k) => k.alairo !== tablaKulcs.alairo), uj];
}

/**
 * Kik a KÖTÉSEIM? — a legrendszeresebbek, legfeljebb `korlat`.
 *
 * ⭐ A SORREND: akivel többször értünk össze, az előrébb; azonos számnál a frissebb.
 * *Nem rangsor és nem érdem (D18/2): ez a saját készülékem feljegyzése arról, kivel
 * szoktam találkozni — sosem terjed, és senkiről nem mond ítéletet.*
 */
export function kotesek(jegyzek, korlat = KOTES_CEL) {
  return [...(jegyzek ?? [])]
    .filter((k) => k && typeof k.alairo === 'string')
    .sort((a, b) => (b.talalkozasok ?? 0) - (a.talalkozasok ?? 0)
      || (b.utoljara ?? 0) - (a.utoljara ?? 0)
      || String(a.alairo).localeCompare(String(b.alairo)))
    .slice(0, Math.max(0, korlat));
}

/**
 * Kire kopogjunk ebben az ablakban?
 *
 * ⭐⭐ A KÖTÉSEK ELŐL, és az ő UTOLSÓ ISMERT címükkel — akkor is, ha az a névtelen
 * jegyzékből már elévült. ⚠️ Emellett megy a friss jegyzék is: a kötésen kívüli
 * találkozás az, amitől a háló nem esik szigetekre (34. mérés: a találkozás maga a
 * terjesztés).
 *
 * @param {Array<Object>} jegyzek - a kötés-jegyzék
 * @param {Array<{hoszt: string, port: number}>} frissCimek - a névtelen, friss jegyzék
 * @param {number} [korlat] - összesen ennyi célra kopogunk (a kopogás adat-ára, D35)
 */
export function kopogasCeljai(jegyzek, frissCimek = [], korlat = KOTES_KORLAT + KOTES_CEL) {
  const celok = [];
  const volt = new Set();
  // ⭐ A korlát TÁRSAKAT számol, nem címeket: egy kötés címeire a kapu egymás után kopog (D71
  // (ii)), tehát egy kötés egy kopogás ára — a friss cím egyenként.
  let egysegek = 0;
  // ⭐⭐ A KÖTÉS CÉLJA A VÁRT TÁRSAT IS HORDOZZA (D71, 2026-09-26): a tábla-aláíróját. Ebből
  // tudja a kopogás-kör a munka végén, hogy tényleg ŐT érte-e el (44. mérés: egy azonos IP-ről
  // bekopogó idegen különben a néma kötést tette sikeressé). A friss cím névtelen: `alairo: null`.
  const felvesz = (hoszt, port, alairo = null) => {
    if (!hoszt || !Number.isInteger(port)) return false;
    const kulcs = hoszt + ':' + port;
    if (volt.has(kulcs)) return false;
    volt.add(kulcs);
    celok.push({ cim: hoszt, port, alairo });
    return true;
  };

  // ⭐⭐ (ii) EGY KÖTÉS ÖSSZES ISMERT CÍME, EGY CSOPORTBAN (ugyanaz az `alairo`) — a HELYI ELÖL,
  // aztán a legutóbb használt. A kapu a csoportot sorban hívja: a következő címet csak akkor, ha
  // az előzők egy kopogás-köz alatt nem feleltek, és amint a társat az egyiken elérte, a többit
  // kihagyja. *Így az otthoni két út (helyi + hairpinning) egy csere, nem kettő (45. mérés).*
  for (const k of kotesek(jegyzek, KOTES_KORLAT)) {
    if (egysegek >= korlat) break;
    const cimek = kotesCimei(k).sort((a, b) => (cimRangja(a.hoszt) - cimRangja(b.hoszt))
      || (b.utoljara ?? 0) - (a.utoljara ?? 0));
    let volt1 = false;
    for (const c of cimek) volt1 = felvesz(c.hoszt, c.port, k.alairo ?? null) || volt1;
    if (volt1) egysegek++;
  }
  for (const c of frissCimek ?? []) {
    if (egysegek >= korlat) break;
    if (felvesz(c.hoszt, c.port)) egysegek++;
  }

  return celok;
}

/**
 * Melyik kötésem HALLGAT? — ezekről kell majd a hirdetőtábláról érdeklődni.
 *
 * ⭐ „Hallgat" = a megadott ablaknál régebben hallottunk róla. ⚠️ Ez NEM vád és nem
 * hiba: lehet, hogy csak alszik a telefonja. *A tábla-olvasás ennek a következménye,
 * nem büntetés.*
 */
export function nemaKotesek(jegyzek, ablak, most = Date.now()) {
  return kotesek(jegyzek, KOTES_KORLAT)
    .filter((k) => most - (k.utoljara ?? 0) > ablak);
}

/**
 * A jegyzék karbantartása: a kötés-korláton felüli, LEGRÉGEBBEN HALLOTT tételek kiesnek.
 *
 * ⛔ MIÉRT KELL: e nélkül a jegyzék minden valaha látott készüléket megőrizne — pontosan
 * az a „globális lista", amit a 9. szabály tilt.
 *
 * ⛔⛔⛔ ÉS MIÉRT AZ `utoljara` DÖNT, NEM A `talalkozasok` (2026-09-21, átnézésből —
 * mérve, nem érvelve): korábban ez a függvény a `kotesek()`-et hívta, vagyis a
 * RENDSZERESSÉG szerint vágott. Mivel a `talalkozasok` monoton nő és soha nem felejt, egy
 * ÚJ társ (1 találkozás) azonnal kiesett a húszszor látott régiek mögül — és a következő
 * találkozáskor megint 1-ről indult. ⛔ A jegyzék tehát **befagyott az először megismert
 * ötön**, és egy végleg eltűnt társ **örökre** foglalta a helyét: körönként rá kopogtunk,
 * a tábláról őt kerestük (~23 mp), és az új címünket az ő rekeszébe írtuk.
 * *Mérve: öt régi társ 20 találkozással, majd négy új társ tízszer — egyetlen új sem
 * jutott be.*
 *
 * ⭐ A JAVÍTÁS (Csaba döntése): **a kiesés az `utoljara` szerint dől el** — aki a
 * legrégebben szólalt meg, az esik ki —, a KOPOGÁS sorrendje viszont marad a
 * rendszeresség szerint (`kotesek()`). *Így a halott kötés kiürül, az élő új társ pedig
 * marad, amíg él.*
 *
 * ⚠️ Az ára kimondva: egy nyüzsgő koinóban, ahol ötnél több társsal érünk össze, a helyek
 * cserélődnek, és a `talalkozasok` nem tud felgyűlni. *Ez tudatos csere: egy friss,
 * elérhető cím többet ér, mint egy régi ismeretség halott címe.*
 */
export function jegyzekTakaritasa(jegyzek, korlat = KOTES_KORLAT) {
  return [...(jegyzek ?? [])]
    .filter((k) => k && typeof k.alairo === 'string')
    .sort((a, b) => (b.utoljara ?? 0) - (a.utoljara ?? 0)
      || String(a.alairo).localeCompare(String(b.alairo)))
    .slice(0, Math.max(0, korlat));
}
