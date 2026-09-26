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

/**
 * Egy sikeres találkozás feljegyzése.
 *
 * ⭐ A KÖTÉS NEM KÉRÉS, HANEM TÉNY: nem megállapodunk róla, hanem abból lesz, hogy
 * rendszeresen összeérünk. *Ugyanaz az elv, mint a tudatpontnál: nem engedélyt kérünk,
 * hanem teszünk valamit, és az látszik.*
 *
 * @param {Array<Object>} jegyzek
 * @param {{alairo: string, titkosito: string}} tablaKulcs - a társ tábla-kulcsa (azonosító)
 * @param {{hoszt: string, port: number}} cim - ahol MOST elértük
 * @returns {Array<Object>} az ÚJ jegyzék
 */
export function talalkozasFeljegyzese(jegyzek, tablaKulcs, cim, most = Date.now()) {
  if (!tablaKulcs?.alairo) return jegyzek;

  const regi = (jegyzek ?? []).find((k) => k.alairo === tablaKulcs.alairo);
  const uj = {
    alairo: tablaKulcs.alairo,
    titkosito: tablaKulcs.titkosito ?? regi?.titkosito ?? null,
    hoszt: cim?.hoszt ?? regi?.hoszt ?? null,
    port: Number.isInteger(cim?.port) ? cim.port : (regi?.port ?? null),
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
  // ⭐⭐ A KÖTÉS CÉLJA A VÁRT TÁRSAT IS HORDOZZA (D71, 2026-09-26): a tábla-aláíróját. Ebből
  // tudja a kopogás-kör a munka végén, hogy tényleg ŐT érte-e el (44. mérés: egy azonos IP-ről
  // bekopogó idegen különben a néma kötést tette sikeressé). A friss cím névtelen: `alairo: null`.
  const felvesz = (hoszt, port, alairo = null) => {
    if (!hoszt || !Number.isInteger(port)) return;
    const kulcs = hoszt + ':' + port;
    if (volt.has(kulcs)) return;
    volt.add(kulcs);
    celok.push({ cim: hoszt, port, alairo });
  };

  for (const k of kotesek(jegyzek, KOTES_KORLAT)) felvesz(k.hoszt, k.port, k.alairo ?? null);
  for (const c of frissCimek ?? []) felvesz(c.hoszt, c.port);

  return celok.slice(0, korlat);
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
