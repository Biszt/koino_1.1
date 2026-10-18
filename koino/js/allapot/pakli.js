// koino/js/allapot/pakli.js

// Felelősség: EGY OLDALNYI KÁRTYÁT adni a pakliból — soha nem az egészet.
//
// ===== ⛔⛔ EZ A SZAKASZ 5 GERINCE (9. szabály) =====
//
// A prototípusban a `GET /api/pakli/` Mongo-lekérdezés volt, szerver-oldali rendezéssel.
// A P2P koinóban az állapot **számítás** az eseményekből — és a mai számítás az ÖSSZES
// eseményt kapja (`koinoEsemenyei`). ⚠️ **Ez az utolsó megmaradt nem-skálázó út a
// programban**, amit a Szakasz 3 szándékosan meghagyott a kis koinónak.
//
// ⭐ **Ha a felület „paklit" kérne, bebetonozná.** Ezért a kérdés alakja itt dől el, és
// ezért kellett az 5.2-nek az 5.3 (a kártyák) ELÉ kerülnie: a kártya alakja attól függ,
// mit tud kérni a lap.
//
// 🔍 A 9. szabály próbája — *„ez mit csinál egymilliárd e-embernél?"*:
//
//   · az ILLESZTÉS milliárdos: a hívó **egy oldalt** kér, kurzorral, korlátos darabszámmal,
//     és a válasz **nem hordozza a szövegeket** (azok külön kérdésre jönnek);
//   · a MEGVALÓSÍTÁS ma egyszerű: kiszámolja az állapotot, rendez, és szeletel. ⭐ Ez a
//     9. szabály szerint rendben van — *a szerkezet az első naptól milliárdos, a
//     megvalósítás mögötte lehet egyszerű* —, mert **kicserélhető anélkül, hogy egyetlen
//     hívó változna**. Pontosan úgy, ahogy a 3.2-ben a tár-illesztő.
//
// ===== ⭐⭐ A HORGONY: MIÉRT NEM CSÚSZIK EL A LAPOZÁS =====
//
// A rendezés kulcsa **változhat két lekérés között** — valaki tudatpontot rendez, és egy
// kártya átugrik a lapok határán: kimarad, vagy kétszer jelenik meg. Ez nem elméleti, a
// tudatpont épp attól él, hogy bármikor átrendezhető.
//
// ⭐ A koinóban van rá egy szép válasz, ami máshol nincs: **a tár hozzáfűzhető, tehát az
// első N esemény halmaza SOHA nem változik.** A lapozás ezért egy **horgonyhoz** kötődik —
// „az állapot, ahogy az első N eseményből látszott" —, és a további oldalak ugyanabból a
// képből jönnek. *Nem az időt fagyasztjuk be, hanem a bemenetet.*
//
// ⚠️ **A horgony HELYI FELJEGYZÉS, nem esemény** (3. szabály): sosem terjed, semmit nem
// dönt el a koinóban, és két készüléken mást jelent — ugyanaz a fajta, mint a `tarsak.js`
// `utoljara` mezője. Csak arra való, hogy EGY lapozás önmagával konzisztens maradjon.
//
// ⭐ És ami közben történt, azt **megmondjuk, nem elhallgatjuk**: az `ujdonsag` mező jelzi,
// hogy a horgony óta érkeztek események. A felület felajánlhatja a frissítést — de nem
// keverjük némán két kép sorait egymás közé.
//
// Használják: a felület kezelője (`koino.js`), és bármely másik kliens.

import { koinoEsemenyei } from '../tar/esemenyTar.js';
import { allapotSzamitasa, szetosztottPontok } from './allapotSzamitas.js';
import { TUDATPONT_KERET } from './szabalyok.js';
import { javaslatokSzamitasa, ALAP_KUSZOBOK } from './javaslatSzamitas.js';
import { szerkesztesiEgyezmenyekAlkalmazasa } from './szerkesztesiVegrehajtas.js';
import { szovegFeloldasa, szovegHivatkozasE } from '../esemeny/szovegDarab.js';
import { osszPontokSzamitasa, gyerekJegyzek } from './osszPont.js';
// ⭐ D102: a gyökér kulcsa a fejléc-tudásban (a kérelem válasza ez alatt jegyzi a gyökér gyerekszámát és levágását) — egy
// forrásból, a csere rétegéből (csak az állandó; hálózatot nem hoz).
import { GYOKER_KULCS as GYOKER_TUDAS_KULCS } from '../csere/szeletEgyeztetes.js';
import { pillanatkep } from './ertesites.js';

/**
 * ⭐ D72 (2026-09-26): a javaslatok változásaiban a SZÖVEG-HIVATKOZÁS feloldása — a felület
 * szöveget vár, nem lenyomatot. ⚠️ Laponként korlátos munka (egy lapon korlátos számú kártya),
 * és a lista maga továbbra sem hordoz gondolat-szöveget (5.2). Ami még nincs meg, azt kimondjuk
 * (`szovegHianyzik`), nem hallgatjuk el (D19).
 */
async function valtozasFeloldasa(valtozas, darabOlvas) {
  if (!valtozas || typeof valtozas !== 'object' || !szovegHivatkozasE(valtozas.szoveg)) return valtozas;
  const f = await szovegFeloldasa(valtozas.szoveg, darabOlvas);
  return { ...valtozas, szoveg: f.szoveg, ...(f.hianyzik ? { szovegHianyzik: true, szovegLenyomat: f.lenyomat } : {}) };
}

// ===================================
// A PARAMÉTEREK
// ===================================

// A négy rendezés — ugyanaz a négy, amit a prototípus `RendezesModal`-ja kínál, hogy a
// felület átemelésekor ne kelljen fordítani.
export const RENDEZESEK = ['hierarchikus', 'ido', 'sajatPont', 'agazatiPont'];

export const ALAP_DARAB = 20;

// ⛔ A FELSŐ KORLÁT NEM UDVARIASSÁG, HANEM A 9. SZABÁLY. Enélkül a hívó `darab=999999999`-cel
// visszakérhetné az egész paklit, és az illesztés máris azt jelentené, hogy „add ide mindet".
export const MAX_DARAB = 100;

// ===================================
// A NÉZET — a horgonyhoz tartozó kép gyorsítótára
// ===================================

/**
 * Új, üres pakli-nézet.
 *
 * ⭐ MIÉRT SZABAD GYORSÍTÓTÁRAZNI? Mert a horgony **befagyasztott bemenetet** jelöl: az
 * első N esemény halmaza soha nem változik, tehát a belőle számolt kép sem. Ugyanaz az
 * érvelés, mint az `identitas.js` gyorsítótáránál (D47).
 *
 * ⚠️ Egyetlen képet tartunk — a legutóbbit. Egy lapozás végigmegy ugyanazon a horgonyon,
 * tehát ennyi elég; és így nem nő korlátlanul.
 *
 * ⭐ D95/1: az `osszegzesek` (ha van) az ellenőrzött lezárási összegzéseket adja a döntés-számításnak — a nagy szeletű
 * részek döntése az összegző tartónál ebből jön, ugyanúgy, mint a parancssorban (`koino.js` `kepetKeszit`).
 * @param {Object} [beallitas]
 * @param {Function|null} [beallitas.osszegzesek] - async () → Map('javaslat|entitás' → { osszegzes, allas })
 * @param {Function|null} [beallitas.tartott] - async () → Set (a vállalt szeleteim) vagy null („mindent”) — a szigorú (b)
 *   alatt a D14 csak a tartott szeletre ítél (72. mérés: a csak születéséből ismert gondolat különben eltűnne a lapról is)
 */
export function ujPakliNezet({ osszegzesek = null, tartott = null } = {}) {
  return { horgony: null, kep: null, szamitasok: 0, osszegzesek, tartott };
}

// ===================================
// A KÁRTYA — amit a lista visz
// ===================================

/**
 * Egy entitásból kártya-adat.
 *
 * ⛔⛔ A SZÖVEG SZÁNDÉKOSAN NINCS BENNE. Egy lista húsz kártyája húsz teljes gondolat-
 * szöveget jelentene — az a válasz mérete, ami a 6. szabály KEMÉNY felébe ütközik (az
 * adat-csomag utazik, a program nem). A szöveget a `GET /api/pakli/szoveg/:tipus/:id`
 * hozza, kártyánként, amikor tényleg kell.
 */
/**
 * Egy besorolás-hivatkozás feloldása: azonosító → { azonosito, nev, ikon }.
 *
 * ⭐ MIÉRT ITT, ÉS NEM A LAPON? Mert ez **keresés az állapotban**, vagyis számítás — a
 * vékony lap elve szerint a programé. A lap csak rajzol.
 *
 * ⚠️ A HIÁNY NEM HIBA (D19): ha a kategória még nem érkezett meg hozzánk, `null`-t adunk,
 * és a kártya egyszerűen nem mutat besorolást. Nem találunk ki nevet, és nem is jelezzük
 * vádként.
 */
function besorolas(entitasok, azonosito) {
  if (typeof azonosito !== 'string') return null;
  const e = entitasok.get(azonosito);
  if (!e) return null;
  return { azonosito, nev: e.cim ?? null, ikon: e.ikon ?? null };
}

/**
 * ⭐⭐ D85/4 (Csaba, 2026-10-02): AZ EGYEZMÉNY UGYANAZ AZ ENTITÁS, MINT A JAVASLAT — ÚJ FÁZISBAN.
 *
 * Ugyanaz az azonosító, ugyanazok a pontok, ugyanaz a hely a fában — csak a döntés lezárult.
 * *(A szabály-réteg már 2026-09-07 óta így kezeli: `szabalyok.js`, `TILTOTT_MUVELETEK`.)* Eddig a
 * kártya mégis `Javaslat` típust mondott, ezért a felület `EgyezmenyKartya`-ja soha nem jelent
 * meg. ⚠️ A típust a DÖNTÉS adja (`javaslatSzamitas.js`), nem az entitás: az entitás a
 * létrehozásakori típusát viszi (`Javaslat`), mert a fázis időfüggő (`most`), az állapot nem.
 *
 * @param {Object} entitas
 * @param {Object|null} dontes - a `javaslatokSzamitasa` eredményének eleme
 * @returns {string}
 */
function kartyaTipusa(entitas, dontes) {
  return entitas.tipus === 'Javaslat' && dontes?.statusz === 'elfogadva' ? 'Egyezmeny' : entitas.tipus;
}

/**
 * ⭐ D85/5: egy javaslat-entitás DÖNTÉSE. Egy érintettnél a javaslaté (ugyanaz az azonosító); a
 * töredéknél a CSOPORTÉ — a döntés a csoport azonosítója alatt van (`javaslatSzamitas.js`), a töredék
 * csak a saját RÉSZÉT mutatja belőle.
 */
function entitasDontese(entitas, javaslatok) {
  return javaslatok?.get(entitas?.toredek?.csoport ?? entitas?.azonosito) ?? null;
}

function kartya(entitas, agazatiPont, en, entitasok, dontes = null) {
  // ⭐ D85/5: a töredék kártyája a SAJÁT részét mutatja (művelet, érintett, számok) — a státusz, a
  // határidő és az egyezmény a csoporté (a csoport egyben dől el, ÉS-sel).
  const resz = entitas.toredek ? (dontes?.reszek?.[entitas.toredek.sorszam - 1] ?? null) : null;
  const o = resz ?? dontes;
  return {
    azonosito: entitas.azonosito,
    tipus: kartyaTipusa(entitas, dontes),
    cim: entitas.cim,
    szulo: entitas.szulo,

    // ----- A BESOROLÁS, FELOLDVA (5.4) -----
    // A kártya nevet és ikont mutat, nem azonosítót — tehát a feloldás ide tartozik.
    ikon: entitas.ikon ?? null,
    gondolatTipus: besorolas(entitasok, entitas.gondolatTipus),
    kategoriak: (entitas.kategoriak ?? [])
      .map((k) => besorolas(entitasok, k))
      .filter((k) => k !== null),
    szerzo: entitas.szerzo,
    letrehozva: entitas.letrehozva,
    osszesPont: entitas.osszesPont,
    agazatiPont,
    hozzajarulok: entitas.hozzajarulok.size,

    // ⭐ AMIT ÉN TETTEM RÁ. A kártya külön jelzi a saját pontodat — és ehhez tudni kell,
    // ki vagy. ⚠️ A `pakli.js` ezt nem találhatja ki: a hívó adja meg (`beallitas.szerzo`),
    // mert a személyazonosság a kulcs-rétegé, nem az állapoté.
    sajatPont: en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) : 0,

    // ----- ⭐ A DÖNTÉS, HA EZ EGY JAVASLAT -----
    //
    // ⚠️ KÉT RÉTEG, EGY AZONOSÍTÓ. A javaslat **entitás** (tudatpont, küszöbök, gyerekek —
    // ez a fenti rész) ÉS **döntés** (szavazatok, státusz, egyezmény — ez itt). A kettő
    // ugyanarra az azonosítóra vonatkozik, de más réteg számolja: az entitást az
    // `allapotSzamitas.js`, a döntést a `javaslatSzamitas.js`.
    javaslat: dontes ? {
      fajta: dontes.fajta,                  // 'szerkesztesi' | 'altalanos' (D27)
      muvelet: o.muvelet,
      erintett: resz ? resz.entitas : dontes.erintett,
      erintettCim: entitasok.get(resz ? resz.entitas : dontes.erintett)?.cim ?? null,
      // ⭐ D85/5: a töredék helye a csoportban (a prototípus „1/6”-ja); egy érintettnél null.
      toredek: entitas.toredek ?? null,
      // ⭐⭐ MINDEN ÉRINTETT (2026-09-07) — a fenti kettő az ELSŐ érintett összefoglalója,
      // hogy a régi kártya-kód ne törjön; a teljes igazság ez a lista. ⚠️ A művelet
      // entitásonkénti: egy csomagban az egyik módosul, a másik áthelyeződik.
      erintettek: (dontes.erintettek ?? []).map((r) => ({
        entitas: r.entitas,
        muvelet: r.muvelet,
        cim: entitasok.get(r.entitas)?.cim ?? null,
        valtozas: r.valtozas ?? null
      })),
      valtozas: o.valtozas ?? null,
      indoklas: dontes.indoklas ?? null,
      statusz: dontes.statusz,
      dontesiIdo: dontes.dontesiIdo,
      lezarasIdeje: dontes.lezarasIdeje,

      // ⭐ EZRELÉKBEN, mert a koino egész aritmetikával számol (kerekítés soha ne
      // dönthessen el szavazást). A százalékra váltás a felület dolga.
      tamogatottsagEzrelek: o.tamogatottsagEzrelek,
      ellenzoiEzrelek: o.ellenzoiEzrelek,
      tartozkodoiEzrelek: o.tartozkodoiEzrelek,
      reszveteliEzrelek: o.reszveteliEzrelek,
      bizonyossagiMutato: o.bizonyossagiMutato,

      tamogatok: o.tamogatok,
      ellenzok: o.ellenzok,
      tartozkodok: o.tartozkodok,
      szavazok: o.szavazok,
      nevezo: o.nevezo,
      kesoiSzavazatok: dontes.kesoiSzavazatok,

      // ⭐ SZAVAZHATOK-E? A döntés bemenete az ÉRINTETT entitás tulajdonosainak köre —
      // nem a javaslaté. (Aki a gondolatot tartja, az dönt a sorsáról.)
      //
      // ⛔⛔ TÖBB ÉRINTETTNÉL: ELÉG AZ EGYIKEN BENT LENNI. A döntés ugyanis
      // érintettenként külön dől el (töredék-modell), és a prototípus `szavazatService`-e
      // is így csinálja: végigmegy a töredékeken, a jogosultakra leadja a szavazatot, a
      // többit **átugorja** — hibát csak akkor dob, ha egyikre sem jogosult.
      // ⚠️ A SZEREP nem számít: a prototípus jogosultság-ellenőrzése csak pontot néz, és
      // a szavazás maga billenti aktívvá a szavazót. A passzív figyelő tehát szavazhat.
      // ⚠️ Ez CSAK a felület előzetes jelzése; a valódi szabály a számításban van
      // (`javaslatSzamitas.js`) — a felület a másik gépen nem véd semmitől.
      szavazhatok: (() => {
        if (!en) return false;
        if (resz) return (entitasok.get(resz.entitas)?.hozzajarulok.get(en)?.pont ?? 0) > 0;
        const kik = (dontes.erintettek ?? []).map((r) => r.entitas);
        const lista = kik.length ? kik : [dontes.erintett];
        return lista.some((az) => (entitasok.get(az)?.hozzajarulok.get(en)?.pont ?? 0) > 0);
      })(),

      // ⭐⭐ A RÉSZEK — érintettenként egy döntés, saját küszöbökkel és szavazói körrel.
      // A kártya a fenti összefoglaló számokat mutatja (az ELSŐ részé), a részletek-nézet
      // viszont meg tudja mutatni, hol hogyan áll — és melyik rész buktatja el az egészet.
      reszek: (dontes.reszek ?? []).map((r) => ({
        entitas: r.entitas,
        muvelet: r.muvelet,
        cim: entitasok.get(r.entitas)?.cim ?? null,
        tamogatok: r.tamogatok,
        ellenzok: r.ellenzok,
        tartozkodok: r.tartozkodok,
        szavazok: r.szavazok,
        nevezo: r.nevezo,
        tamogatottsagEzrelek: r.tamogatottsagEzrelek,
        reszveteliEzrelek: r.reszveteliEzrelek,
        kuszobTeljesul: r.kuszobTeljesul,
        lezarasIdeje: r.lezarasIdeje,
        // ⭐ Szavazhatok-e EBBEN a részben? (A felület megmutathatja, mi az, amiben nem.)
        szavazhatok: en ? (entitasok.get(r.entitas)?.hozzajarulok.get(en)?.pont ?? 0) > 0 : false
      })),

      egyezmeny: dontes.egyezmeny ? { megszuletett: dontes.egyezmeny.megszuletett } : null
    } : null,

    // ⚠️ Nincs `szoveg` — lásd fent.
    vanSzoveg: entitas.szoveg !== null && entitas.szoveg !== undefined
  };
}

// ===================================
// AZ ÁGAZATI PONT — a fa alulról felfelé
// ===================================

/**
 * Minden entitáshoz: a saját pontja + a leszármazottaié.
 *
 * ⚠️ Az `allapotSzamitas.js` `agMeretSzamitasa` ugyanezt a bejárást csinálja, de a
 * **tárolási vállalásra** (`meret`), nem a pontra. Nem írtam át azt a függvényt, mert a
 * mag viselkedését változtatná; itt a pakli a saját kérdését teszi fel.
 *
 * ⚠️⚠️ ÉS EGY ŐR, AMI NEM DÍSZ: a `szulo`-lánc **körbe mutathat** (a→b→a). Nem szabályos,
 * de egy hibás vagy rosszindulatú esemény előállíthatja, és egy naiv bejárás **végtelen
 * ciklusba** futna. A látogatott halmaz ezt zárja ki.
 */
function agazatiPontok(entitasok, bemondasok = new Map(), tartott = null) {
  // ⭐⭐ D92/5 (2026-10-03): EGY FORRÁS — az össz-pont (`osszPont.js`). Eddig a pakli a saját bejárásával számolta;
  // most ugyanaz a számítás adja, amit a kérelem fejlécei is mondanak (különben a nézet és a kérelem más össz-pontot
  // mutatna). A nem tartott entitásnál a bemondott össz-pont számít (ha a hívó adja) — ⛔ D101 ④: a `tartott`-tal akkor
  // is, ha a saját pontjait ismerjük.
  return new Map([...osszPontokSzamitasa(entitasok, bemondasok, tartott)].map(([az, o]) => [az, o.osszPont]));
}

/** ⛔ D101 ④: a nézet tartott szeleteinek kérdése (null: „mindent” mód — mindent tartok, a bemondás nem kell). */
async function tartottKerdes(nezet) {
  const t = typeof nezet?.tartott === 'function' ? await nezet.tartott() : null;
  return t ? (az) => t.has(az) : null;
}

/**
 * A hierarchikus rendezés kulcsa: a gyökértől idáig vezető út, összefűzve.
 *
 * ⭐ Miért út, és nem mélység? Mert **összehasonlítható**: a szöveges rendezés pontosan a
 * mélységi bejárást adja vissza, tehát a gyerek mindig a szülője után jön, és a testvérek
 * együtt maradnak. És mert **kurzorozható** — a kurzornak összehasonlítható érték kell.
 */
function utvonalak(entitasok) {
  const eredmeny = new Map();
  for (const e of entitasok.values()) {
    const ut = [e.azonosito];
    const latott = new Set([e.azonosito]);
    let szulo = e.szulo;
    while (szulo && entitasok.has(szulo) && !latott.has(szulo)) {
      latott.add(szulo);
      ut.unshift(szulo);
      szulo = entitasok.get(szulo).szulo;
    }
    eredmeny.set(e.azonosito, ut.join('/'));
  }
  return eredmeny;
}

// ===================================
// A SORREND
// ===================================

/**
 * Két elem sorrendje. Negatív, ha `a` előbb jön.
 *
 * ⭐ A HOLTVERSENYT MINDIG az azonosító dönti el, **növekvő irányban, a rendezés irányától
 * függetlenül**. Ez nem részletkérdés: enélkül a sorrend nem szigorú (két azonos pontú
 * kártya sorrendje esetleges lenne), és a kurzor vagy kihagyna, vagy ismételne.
 *
 * ⚠️ És csak EGÉSZ SZÁMOT vagy SZÖVEGET hasonlítunk — tört sosem kerül ide (a kanonikus
 * alak amúgy sem engedné az eseményekbe).
 */
function sorrendben(a, b, irany) {
  if (a.ertek !== b.ertek) {
    const kisebb = a.ertek < b.ertek ? -1 : 1;
    return irany === 'novekvo' ? kisebb : -kisebb;
  }
  if (a.azonosito === b.azonosito) return 0;
  return a.azonosito < b.azonosito ? -1 : 1;
}

// ===================================
// A KURZOR
// ===================================
//
// ⭐ ÁTLÁTSZATLAN SZÖVEG, SZÁNDÉKOSAN. A hívó nem gyárt kurzort, csak visszaadja, amit
// kapott — így a belső alakja később változhat (pl. lemezre írt index pozíciója), anélkül
// hogy a felület változna.

function kurzorKodolas({ horgony, most, ertek, azonosito }) {
  return Buffer.from(JSON.stringify({ h: horgony, t: most, v: ertek, e: azonosito }), 'utf8')
    .toString('base64url');
}

function kurzorDekodolas(kurzor) {
  let adat;
  try {
    adat = JSON.parse(Buffer.from(kurzor, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Értelmezhetetlen kurzor. Kezdd elölről a lapozást.');
  }
  if (!Number.isInteger(adat?.h) || !Number.isInteger(adat?.t) || typeof adat?.e !== 'string'
      || (typeof adat?.v !== 'number' && typeof adat?.v !== 'string')) {
    throw new Error('Hiányos kurzor. Kezdd elölről a lapozást.');
  }
  return { horgony: adat.h, most: adat.t, ertek: adat.v, azonosito: adat.e };
}

// ===================================
// EGY OLDAL
// ===================================

/**
 * Egy oldalnyi kártya a pakliból.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas]
 * @param {string} [beallitas.rendezes] - `RENDEZESEK` egyike
 * @param {string} [beallitas.irany] - 'csokkeno' (alap) | 'novekvo'
 * @param {string} [beallitas.kurzor] - egy korábbi válasz `kovetkezoKurzor`-a
 * @param {number} [beallitas.darab]
 * @param {Object} [beallitas.nezet] - `ujPakliNezet()`, a kép megtartásához
 * @param {string} [beallitas.agazat] - ⭐ D101: csak ennek az ágnak az entitásai (a kártya menüjének Rendezése)
 * @param {Map} [beallitas.fejlecTudas] - ⭐ D102: a fejléc-tudás (a gyerekszám és a levágás határa — `koino.js`)
 * @returns {Promise<Object>} { kartyak, kovetkezoKurzor, horgony, ujdonsag, osszes, agazat, nemEldontheto, hianyzik, biztos }
 */
export async function pakliOldal(tar, koino, beallitas = {}) {
  const rendezes = beallitas.rendezes ?? 'sajatPont';
  const irany = beallitas.irany === 'novekvo' ? 'novekvo' : 'csokkeno';
  const nezet = beallitas.nezet ?? ujPakliNezet();

  console.log('pakli.pakliOldal - KEZDÉS', { rendezes, irany, darab: beallitas.darab });

  // ⛔ ISMERETLEN RENDEZÉS: HIBA, NEM CSENDES ALAPÉRTELMEZÉS. Ha elgépelem, tudni akarom —
  // különben a lap más sorrendet mutatna, mint amit kért, és senki nem venné észre.
  if (!RENDEZESEK.includes(rendezes)) {
    throw new Error('Ismeretlen rendezés: ' + rendezes
      + ' — választható: ' + RENDEZESEK.join(', '));
  }

  // A darabszám mindig korlátos (lásd MAX_DARAB).
  const kertDarab = Number.isInteger(beallitas.darab) ? beallitas.darab : ALAP_DARAB;
  const darab = Math.max(1, Math.min(kertDarab, MAX_DARAB));

  const honnan = beallitas.kurzor ? kurzorDekodolas(beallitas.kurzor) : null;

  // ----- A KÉP: a horgonyhoz tartozó állapot -----
  const esemenyek = await koinoEsemenyei(tar, koino);
  const teljes = esemenyek.length;

  // Az első lekérés horgonyt VER; a továbbiak a kurzorból hozzák. ⚠️ A `min` azért kell,
  // mert egy régi kurzor nagyobb horgonyt hozhat, mint amennyi eseményünk most van (pl.
  // más adat-mappából indítva) — akkor a mostani a mérvadó.
  const horgony = Math.min(honnan?.horgony ?? teljes, teljes);

  // ⭐⭐ AZ IDŐ IS A HORGONY RÉSZE — és ez a 2026-09-06-i egyezmény-végrehajtás miatt lett
  // szükséges. Az entitás mai alakja nem csak az eseményektől függ, hanem attól is, **mikor
  // kérdezzük**: egy javaslat a lapozás közben járhat le, és az egyezménye átírhatja egy
  // kártya címét — vagyis a rendezési értékét is. ⚠️ Az „első N esemény" önmagában tehát már
  // nem elég befagyasztott bemenet; a pillanat is kell hozzá.
  const most = honnan?.most ?? beallitas.most ?? Date.now();
  const kep = await kepetKerni(nezet, koino, horgony, most, esemenyek, tar.csakAtmeneti?.() ?? null);

  // ----- A RENDEZÉSI ÉRTÉK -----
  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, await tartottKerdes(nezet));
  const utak = rendezes === 'hierarchikus' ? utvonalak(kep.entitasok) : null;

  const ertekhez = (e) => {
    if (rendezes === 'ido') return e.letrehozva ?? 0;
    if (rendezes === 'sajatPont') return e.osszesPont;
    if (rendezes === 'agazatiPont') return agazati.get(e.azonosito) ?? 0;
    return utak.get(e.azonosito) ?? e.azonosito;      // hierarchikus
  };

  // ⭐ D101 (a Rendezés modál): ÁG-SZŰRVE csak az ág alattiak (a közös `agHelyzete` — a felmenő-láncon). ⚠️ Ami nem
  // eldönthető (egy felmenője nincs meg), az kimarad, megszámoljuk, és a hiányzó felmenőt kérendőnek mondjuk (D19). A
  // lista a helyben ismert entitásokból áll (D101/M2 — végleges alak: ami nem monoton, az csak helyből rendezhető).
  const agazat = typeof beallitas.agazat === 'string' && beallitas.agazat ? beallitas.agazat : null;
  let nemEldontheto = 0;
  const hianyzik = [];
  const mind = [];
  for (const e of kep.entitasok.values()) {
    if (agazat) {
      const h = agHelyzete(kep.entitasok, e.azonosito, agazat);
      if (h.alatta === null) {
        nemEldontheto++;
        if (h.hianyzo && hianyzik.length < MAX_DARAB && !hianyzik.some((x) => x.kulcs === h.hianyzo)) {
          hianyzik.push({ fajta: 'szelet', kulcs: h.hianyzo, ok: 'egy felmenőt nem ismerek (az ág-szűréshez)' });
        }
        continue;
      }
      if (!h.alatta) continue;
    }
    mind.push({ azonosito: e.azonosito, ertek: ertekhez(e), entitas: e });
  }

  // ⭐⭐ A JAVASLATOK MÁR NINCSENEK KÜLÖN (2026-09-06): mióta a javaslat is ENTITÁS
  // (llapotSzamitas.js), a fenti ciklus **magától** hozza őket — saját tudatponttal,
  // saját rendezési értékkel, és a szülőjük az érintett entitás.
  //
  // ⚠️ Ez egy KÉNYSZER-MEGOLDÁST szüntetett meg: előtte a javaslat rendezési értékét
  // kézzel az érintettétől kölcsönöztük, mert magának nem volt. Most nem kell — a
  // szerkezet megoldotta. *A javaslat a gondolata GYEREKE, tehát a hierarchikus rendezés
  // amúgy is mellé teszi.*
  mind.sort((a, b) => sorrendben(a, b, irany));

  // ⭐⭐ D102: A BEJÁRÓ — az „ágazati pont szerint csökkenő” sor BIZTOS ELŐTAGJA. Az össz-pont lefelé nem nő, tehát ez a
  // sor a legjobb-először bejárás sorrendje: ameddig a következő elem nagyobb annál, amekkora egy még nem ismert csomópont
  // legfeljebb lehet, a helyi rendezés a VÉGLEGES sorrend; utána hiányozhat valami — azt a bejáró elkéri (a tartó maga jár
  // be — J1). A többi rendezés nem monoton: az a helyben ismert részből megy, kimondva (D101/M2).
  let biztos = null;
  if (rendezes === 'agazatiPont' && irany === 'csokkeno') {
    const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
    const b = biztosElotag(mind.map((x) => x.azonosito), kep.entitasok, agazati, {
      tartott: tartottak ? (az) => tartottak.has(az) : () => true,
      gyokerTeljes: !tartottak,
      tudas: beallitas.fejlecTudas ?? new Map(),
      agazat
    });
    biztos = b.biztos;
    for (const h of b.kerendo) if (hianyzik.length < MAX_DARAB && !hianyzik.some((x) => x.fajta === h.fajta && x.kulcs === h.kulcs)) hianyzik.push(h);
  }

  // ----- A KURZOR UTÁNI RÉSZ -----
  //
  // ⭐ KULCS-ALAPÚ (nem sorszám-alapú) lapozás: „add azt, ami a legutóbbi elem UTÁN jön".
  // Ezért marad az illesztés milliárdos: egy későbbi, indexelt megvalósítás **oda tud
  // ugrani**, míg egy `skip=1000000` mindig végigolvasná az elejét.
  const kezdet = honnan
    ? mind.findIndex((elem) => sorrendben(honnan, elem, irany) < 0)
    : 0;
  const innen = kezdet < 0 ? mind.length : kezdet;

  const oldal = mind.slice(innen, innen + darab);
  const utolso = oldal[oldal.length - 1];

  const kartyak = oldal.map((elem) => kartya(
    elem.entitas, agazati.get(elem.azonosito) ?? 0, beallitas.szerzo, kep.entitasok,
    entitasDontese(elem.entitas, kep.javaslatok)));
  // ⭐ D72: a javaslat-kártyák változásaiban a szöveg-hivatkozás szöveggé.
  for (const k of kartyak) {
    if (!k.javaslat) continue;
    k.javaslat.valtozas = await valtozasFeloldasa(k.javaslat.valtozas, beallitas.darabOlvas);
    for (const r of k.javaslat.erintettek) r.valtozas = await valtozasFeloldasa(r.valtozas, beallitas.darabOlvas);
  }

  const eredmeny = {
    kartyak,
    // Csak akkor van következő oldal, ha maradt még valami.
    kovetkezoKurzor: (utolso && innen + darab < mind.length)
      ? kurzorKodolas({ horgony, most, ertek: utolso.ertek, azonosito: utolso.azonosito })
      : null,
    horgony,
    most,
    // ⭐ Amit a horgony óta kaptunk, azt MEGMONDJUK — nem keverjük bele némán.
    ujdonsag: teljes > horgony,
    ujEsemenyek: teljes - horgony,
    osszes: mind.length,
    rendezes,
    irany,
    // ⭐ D101: az ág-szűrés (null: az egész koinó), és ami benne nem volt eldönthető
    agazat,
    nemEldontheto,
    hianyzik,
    // ⭐ D102: az ágazati pont szerint csökkenő sorban hány elem biztos (null: a többi rendezésnél nem értelmezett)
    biztos
  };

  console.log('pakli.pakliOldal - VÉGE',
    { kartyak: eredmeny.kartyak.length, osszes: eredmeny.osszes, ujdonsag: eredmeny.ujdonsag });
  return eredmeny;
}

// ===================================
// ⭐⭐ A KÁRTYA-VÉGPONTOK KÖZÖS ELŐSZAVA
// ===================================
//
// Mind az öt kártya-végpont ugyanazzal kezdi: elkéri azt a KÉPET, amiből a lap listája is
// készült. ⭐ **A lap horgonyát kapja meg**, nem verünk neki újat.
//
// ⛔⛔ MIÉRT EZ A HELYES — ÉS MI VOLT A BAJ A MÁSIKKAL. Eddig minden kártya-végpont a
// **mostani** eseményszámmal számolt (`esemenyek.length`), vagyis **átlépte a lap
// horgonyát**. Két következménye volt, mindkettő mérve (2026-09-12):
//
//   1. ⚠️ **A kártya mást mondhatott, mint a lista, amiből megnyitották.** A lista
//      megjelenik, közben egy csere hoz egy tudatpont-eseményt (5 → 9), és a kártya már
//      9-et mutat. Pontosan az, amit a horgony hivatott megakadályozni — *a közben
//      érkezettet az `ujdonsag` MEGMONDJA, nem keverjük bele némán.*
//   2. ⚠️ **A gyorsítótár élesben soha nem talált.** A kulcs harmadik tagja a `most`, és
//      minden kérés friss `Date.now()`-t hozott, tehát minden kattintás újraszámolta az
//      EGÉSZ koinót. Mérve: 80 kérés → 80 számítás (100% tévesztés), és egy kérés ára
//      10 000 entitásnál 39,1 ms — lineárisan növekvő. *A 9. szabály kérdésére nem volt
//      válasz.*
//
// ⭐ A javítás nem új gépezet: a lap válasza **eddig is hordozta** a `horgony`-t és a
// `most`-ot (`pakliOldal` eredménye), csak senki nem adta vissza. Most visszaadja, és
// ettől a kép ingyen van — a lap már kiszámolta.
//
// ⚠️ HORGONY NÉLKÜL a mostani állapot a válasz. Ez a helyes tartalék annak, aki nem
// lapozásból kérdez (parancssor, másik kliens) — és a próbák **mindkét ágat** mérik, hogy
// ne lehessen észrevétlenül visszacsúszni a régibe.

/**
 * A kártya-végpontok képe: a LAP horgonyához tartozó állapot.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} beallitas
 * @param {number} [beallitas.horgony] - a lap horgonya (`pakliOldal` válaszából)
 * @param {number} [beallitas.most] - a lap pillanata (`pakliOldal` válaszából)
 * @param {Object} [beallitas.nezet] - `ujPakliNezet()`, a kép megtartásához
 */
// ===================================
// ⭐⭐ A HÁZ (D100, 2026-10-10): A HIERARCHIKUS PAKLI — „láncos-testvéres”, a helyi tudásból
// ===================================
//
// A prototípus pakli-nézete (`pakliService.js`) egy KIVÁLASZTOTT entitás köré épül: fölötte a FELMENŐI a gyökérig, alatta
// a „BOGÁRLOGIKA” (mindig a legerősebb gyerek, lefelé), oldalra a TESTVÉREI. Itt ugyanez a helyi tudásból — a két tár
// állapotából és a bemondott össz-pontokból (D92/5). ⭐ A szigorú (b) alatt a tudás hiányos: ami nem tartott, annak a
// gyerekeit nem ismerjük (a kérelem — `fejlecek` — hozza), a megnyitott kártya szövege hiányozhat (`torzs`). Ezt a
// lekérdezés nem hallgatja el: a `hianyzik` lista megmondja, mit kellene elkérni (H1: az őrjárat függő kérelemként hozza),
// és minden kártya megmondja, honnan tudjuk, amit mutat (H2).
//
// ⛔ 9. szabály: a testvérek korlátosak (`TESTVER_KORLAT` — a kérelem fejléc-korlátja), a bogár is (`BOGAR_KORLAT`), a
// felmenők is (`FELMENO_KORLAT`); a lista nem hordoz szöveget (az a `/api/pakli/szoveg`-en jön).

export const TESTVER_KORLAT = 50;
export const BOGAR_KORLAT = 50;
export const FELMENO_KORLAT = 64;
/** ⭐ D102: a bejáró legfeljebb ennyi kérést javasol egy lekérdezésre (a lap kérés-korlátjával egyezik). */
export const ELORE_KERES = 16;
const GYOKER = '';                                     // a bejáró jelölése a gyökérre (a lap ''-ként kéri — `kerendo`)

/**
 * Egy kártya forrás-jelölése (H2): a szeletet tartom-e, és az össz-pont honnan jön.
 * @returns {{tartom: boolean, osszPontForras: 'szamolt'|'reszleges'|'ellenorzott'|'bemondas'|'ismeretlen'}}
 */
function forrasJelolese(e, o, bemondasok, tartott) {
  const tartom = !!tartott(e.azonosito) && !e.pontokIsmeretlenek;
  // ⭐ Ha a saját pontjait sem láttuk (csak a születését), a kártya saját száma és a hozzájárulók száma is „nem tudom”, nem 0.
  const pontokIsmeretlenek = e.pontokIsmeretlenek === true;
  let osszPontForras = 'szamolt';
  if (o?.forras === 'bemondott') osszPontForras = bemondasok.get(e.azonosito)?.ellenorzott ? 'ellenorzott' : 'bemondas';
  else if (o?.forras === 'osszegzett') osszPontForras = 'ellenorzott';
  else if (o?.forras === 'ismeretlen' && !(o?.osszPont > 0)) osszPontForras = 'ismeretlen';
  else if ((o?.bizonytalan ?? 0) > 0) osszPontForras = 'reszleges';
  return { tartom, osszPontForras, pontokIsmeretlenek };
}

/**
 * ⭐⭐ A HIERARCHIKUS PAKLI egy kiválasztott entitás köré: felmenők + a kiválasztott + a bogár (a `pakli` lista, a
 * gyökértől lefelé, `melysegiSzint`-tel), és a kiválasztott testvérei — a prototípus alakjában, koinós kártyákkal.
 *
 * @param {Object} tar - a két tár nézete (a felületé: `ketTarNezet`)
 * @param {string} koino
 * @param {Object} [beallitas]
 * @param {string|null} [beallitas.entitas] - a kiválasztott (ha nincs, vagy nem ismert: a legerősebb gyökér)
 * @param {string} [beallitas.szerzo] - a néző (a saját pontjához)
 * @param {Map} [beallitas.bemondasok] - a bemondott össz-pontok (D92/5)
 * @param {Function} [beallitas.tartott] - az → tartom-e a szeletét (a vállalás; „mindent” módban mindig igaz)
 * @param {boolean} [beallitas.gyokerTeljes] - a gyökér összes gyerekét ismerem-e („mindent” mód) — ha nem, a gyökér
 *   szintje is kérendő
 * @param {Function} [beallitas.darabOlvas] - a szöveg-darab olvasása (a hiányzó törzs felismeréséhez)
 * @returns {Promise<{kivalasztott: string|null, pakli: Array<Object>, testverek: Array<Object>,
 *   hianyzik: Array<{fajta: string, kulcs: string, ok: string}>, horgony: number, most: number}>}
 */
export async function pakliHierarchia(tar, koino, beallitas = {}) {
  console.log('pakli.pakliHierarchia - KEZDÉS', { entitas: beallitas.entitas ?? null });
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const bemondasok = beallitas.bemondasok ?? new Map();
  // ⭐ A tartott szeletek: a hívóé, vagy a nézeté (ugyanaz, amivel a kép a D14-et számolja) — „mindent” módban minden.
  const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
  const tartott = typeof beallitas.tartott === 'function' ? beallitas.tartott
    : (tartottak ? (az) => tartottak.has(az) : () => true);
  const gyokerTeljes = typeof beallitas.gyokerTeljes === 'boolean' ? beallitas.gyokerTeljes : !tartottak;

  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = beallitas.most ?? Date.now();
  const kep = await kepetKerni(nezet, koino, esemenyek.length, most, esemenyek, tar.csakAtmeneti?.() ?? null);
  const entitasok = kep.entitasok;
  const osszPontok = osszPontokSzamitasa(entitasok, bemondasok, tartott);
  const pontja = (az) => osszPontok.get(az)?.osszPont ?? 0;
  const gyerekek = gyerekJegyzek(entitasok);
  // ⭐ Az erősebb előbb, holtversenyben az azonosító (mint a kérelem fejléceinél — egy sorrend).
  const erosseg = (a, b) => (pontja(b) - pontja(a)) || (a < b ? -1 : a > b ? 1 : 0);
  const gyokerek = [...entitasok.values()].filter((e) => !e.szulo).map((e) => e.azonosito).sort(erosseg);
  const hianyzik = [];
  const kerendo = (fajta, kulcs, ok, extra = {}) => {
    if (!hianyzik.some((h) => h.fajta === fajta && h.kulcs === kulcs)) hianyzik.push({ fajta, kulcs, ok, ...extra });
  };
  // A nem tartott entitás gyerekeit nem ismerjük biztosan (a kérelem hozza); a gyökérét csak „mindent” módban.
  const gyerekeiKerendok = (az) => (az === null ? !gyokerTeljes : !tartott(az));

  // ----- A KIVÁLASZTOTT -----
  const kert = beallitas.entitas ?? null;
  const kivalasztott = kert && entitasok.has(kert) ? kert : (gyokerek[0] ?? null);
  if (kert && !entitasok.has(kert)) kerendo('szelet', kert, 'a kért entitást nem ismerem');
  if (gyerekeiKerendok(null)) kerendo('fejlecek', '', 'a gyökér szintjét csak részben ismerem');
  if (!kivalasztott) {
    console.log('pakli.pakliHierarchia - VÉGE (üres)', { hianyzik: hianyzik.length });
    return { kivalasztott: null, pakli: [], testverek: [], hianyzik, horgony: esemenyek.length, most };
  }

  // ----- A FELMENŐK (a szülő-láncon, körbiztosan, korlátosan) -----
  const felmenok = [];
  {
    const latott = new Set([kivalasztott]);
    let sz = entitasok.get(kivalasztott).szulo;
    while (sz && felmenok.length < FELMENO_KORLAT) {
      if (latott.has(sz)) break;
      if (!entitasok.has(sz)) { kerendo('szelet', sz, 'egy felmenőt nem ismerek'); break; }
      latott.add(sz);
      felmenok.unshift(sz);
      sz = entitasok.get(sz).szulo;
    }
  }

  // ----- A BOGÁR: lefelé mindig a legerősebb ismert gyerek -----
  const bogar = [];
  {
    const latott = new Set([...felmenok, kivalasztott]);
    let az = kivalasztott;
    let kerve = false;
    while (bogar.length < BOGAR_KORLAT) {
      // ⭐ Az ELSŐ bizonytalan pontnál egy MÉLY fejléc-kérés (D102: a tartó maga jár be legjobb-először — a bogár, a
      // legerősebb gyerekek lánca, a válasz elején áll): a bogár többi szintjét ugyanaz a válasz fedi.
      if (!kerve && gyerekeiKerendok(az)) {
        kerendo('fejlecek', az, 'a gyerekeit nem ismerem biztosan', { m: true });
        kerve = true;
      }
      const legjobb = (gyerekek.get(az) ?? []).filter((g) => !latott.has(g)).sort(erosseg)[0];
      if (!legjobb) break;
      latott.add(legjobb);
      bogar.push(legjobb);
      az = legjobb;
    }
  }

  // ----- A TESTVÉREK (a kiválasztott szülőjének többi gyereke; a gyökérnél a többi gyökér) -----
  const szulo = entitasok.get(kivalasztott).szulo ?? null;
  if (szulo && gyerekeiKerendok(szulo)) kerendo('fejlecek', szulo, 'a testvéreit nem ismerem biztosan');
  const testverAz = (szulo ? (gyerekek.get(szulo) ?? []) : gyokerek).filter((x) => x !== kivalasztott).sort(erosseg)
    .slice(0, TESTVER_KORLAT);

  // ----- A KÁRTYÁK -----
  const kartyaja = (az, melysegiSzint) => {
    const e = entitasok.get(az);
    const k = kartya(e, pontja(az), beallitas.szerzo, entitasok, entitasDontese(e, kep.javaslatok));
    return { ...k, melysegiSzint, ...forrasJelolese(e, osszPontok.get(az), bemondasok, tartott) };
  };
  const lanc = [...felmenok, kivalasztott, ...bogar];
  const pakli = lanc.map((az, i) => kartyaja(az, i + 1));
  const testverek = testverAz.map((az) => kartyaja(az, felmenok.length + 1));
  // ⭐ D72: a javaslat-kártyák változásaiban a szöveg-hivatkozás szöveggé (mint a lapozó paklinál).
  for (const k of [...pakli, ...testverek]) {
    if (!k.javaslat) continue;
    k.javaslat.valtozas = await valtozasFeloldasa(k.javaslat.valtozas, beallitas.darabOlvas);
    for (const r of k.javaslat.erintettek) r.valtozas = await valtozasFeloldasa(r.valtozas, beallitas.darabOlvas);
  }

  // ----- A MEGNYITOTT KÁRTYA SZÖVEGE: ha hiányzik, kérendő (a vállalótól — D84/1) -----
  const kivEntitas = entitasok.get(kivalasztott);
  if (szovegHivatkozasE(kivEntitas.szoveg) && typeof beallitas.darabOlvas === 'function') {
    const f = await szovegFeloldasa(kivEntitas.szoveg, beallitas.darabOlvas);
    if (f.hianyzik) kerendo('torzs', kivalasztott, 'a szövege még nincs meg');
  }

  console.log('pakli.pakliHierarchia - VÉGE', { pakli: pakli.length, testverek: testverek.length, hianyzik: hianyzik.length });
  return { kivalasztott, pakli, testverek, hianyzik, horgony: esemenyek.length, most };
}

async function lapKepe(tar, koino, beallitas) {
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const teljes = esemenyek.length;

  // ⚠️ Ugyanaz a `min`, mint a `pakliOldal`-ban: egy régi horgony nagyobb lehet, mint
  // amennyi eseményünk MOST van (pl. másik adat-mappából indítva) — olyankor a mostani a
  // mérvadó. A `max(0, …)` a szemetet fogja meg: negatív horgony nincs.
  const kert = Number.isInteger(beallitas.horgony) ? beallitas.horgony : teljes;
  const horgony = Math.max(0, Math.min(kert, teljes));

  const most = Number.isInteger(beallitas.most) ? beallitas.most : Date.now();
  return kepetKerni(nezet, koino, horgony, most, esemenyek, tar.csakAtmeneti?.() ?? null);
}

// ===================================
// EGY ENTITÁS SZÖVEGE
// ===================================

/**
 * Egy entitás szövege — külön kérdésre, mert a lista szándékosan nem hozza.
 *
 * ⭐ AZ ILLESZTÉS ITT IS A LÉNYEG: a lap **EGY entitás** szövegét kéri, nem az összesét.
 * Ettől marad a válasz mérete korlátos, akárhány kártya van a pakliban.
 *
 * ⚠️ MIÉRT A KÉPBŐL, ÉS NEM A NYERS LÉTREHOZÓ ESEMÉNYBŐL? Mert egy elfogadott
 * **egyezmény átírhatta** (`szerkesztesiVegrehajtas.js`). A szeletből olvasva a régi szöveget
 * kapnánk — pontosan az a hiba, amit 2026-09-06-án mértünk a címnél.
 *
 * ⏸️ A megvalósítás a pakli képét használja újra (`lapKepe`) — a lap horgonyával kérve
 * **ingyen van**; ha egyszer kevés lesz, **a hívó változtatása nélkül** cserélhető
 * — 9. szabály.
 *
 * @param {Object} [beallitas] - `horgony` és `most` a lap válaszából; lásd `lapKepe`
 * @returns {Promise<Object|null>} { azonosito, tipus, cim, szoveg } vagy null
 */
export async function entitasSzovege(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasSzovege - KEZDÉS', { azonosito });

  const kep = await lapKepe(tar, koino, beallitas);

  const entitas = kep.entitasok.get(azonosito);
  if (!entitas) {
    console.log('pakli.entitasSzovege - VÉGE (nincs ilyen entitás)');
    return null;
  }

  // ⭐ D72: ha a szöveg külön darab, a darab-tárból oldjuk fel (`beallitas.darabOlvas`); ha
  // még nem érkezett meg, azt kimondjuk — nem hiba, hanem hiány (D19).
  const f = await szovegFeloldasa(entitas.szoveg ?? null, beallitas.darabOlvas);
  const eredmeny = {
    azonosito: entitas.azonosito,
    tipus: kartyaTipusa(entitas, entitasDontese(entitas, kep.javaslatok)),
    cim: entitas.cim,
    szoveg: f.szoveg,
    ...(f.hianyzik ? { szovegHianyzik: true, szovegLenyomat: f.lenyomat } : {})
  };
  console.log('pakli.entitasSzovege - VÉGE', { van: eredmeny.szoveg !== null });
  return eredmeny;
}

/**
 * Egy entitás tudatpont-képe — szintén külön kérdésre.
 *
 * ⚠️ A VÁLASZ ALAKJA `{ data: … }`, és ez SZÁNDÉKOS ELTÉRÉS a többi végponttól. A prototípus
 * `GET /api/tudatpont/entitas/:tipus/:id`-je így válaszolt, és az örökölt `Kartya.js` így
 * olvassa (`valasz?.data?.eemberHozzajarulas`). ⭐ Két rossz és egy jó út volt: átírni a
 * kártyát (elveszne, hogy változatlanul jött), a felületen fordítani (egy mezőért új réteg),
 * vagy **itt megtartani a prototípus alakját** ezen az egy végponton. *A hívó a régi; a
 * válasz alkalmazkodik hozzá, nem fordítva.*
 *
 * @returns {Promise<Object|null>}
 */
export async function entitasTudatpontja(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasTudatpontja - KEZDÉS', { azonosito });

  const kep = await lapKepe(tar, koino, beallitas);

  const entitas = kep.entitasok.get(azonosito);
  if (!entitas) {
    console.log('pakli.entitasTudatpontja - VÉGE (nincs ilyen entitás)');
    return null;
  }

  const en = beallitas.szerzo;
  const eredmeny = {
    data: {
      // ⭐ A MENÜ EZEN MÚLIK: aki nem tett pontot az entitásra, az nem tehet rá javaslatot
      // sem (domain-szabály) — a kártya ebből tiltja le a tudatpont-függő menüpontokat.
      eemberHozzajarulas: en ? (entitas.hozzajarulok.get(en)?.pont ?? 0) : 0,
      osszesPont: entitas.osszesPont,
      hozzajarulokSzama: entitas.hozzajarulok.size
    }
  };
  console.log('pakli.entitasTudatpontja - VÉGE', eredmeny.data);
  return eredmeny;
}

// ===================================
// A RÉSZLETEK (Szakasz 5.5)
// ===================================

// ⚠️ A KÜSZÖB-NEVEK ELTÉRNEK. A koino a `javaslatSzamitas.js` neveit használja
// (`elfogadasiKuszob`, `reszveteliKuszob`, `minimumDontesiIdo`, `maximumDontesiIdo`), a
// prototípus kártyái és modáljai viszont a régieket olvassák. ⭐ A fordítás ITT történik,
// egy helyen — nem a lapon szétszórva, és nem úgy, hogy a koino átveszi az idegen neveket.
//
// ⛔⛔ D101 (2026-10-11, a Kategória-modál bekötésekor mérve): A PROTOTÍPUSBAN A KÜSZÖBNEK KÉT ALAKJA VAN, és eddig
// csak az egyiket ismertük. A MEDIÁN (az aktuális küszöb, `aktualisErtekek`) az időket `aktualMinimumDontesiIdo` néven
// mondja; egy e-ember SAJÁT javaslata viszont — amit a modálok KÜLDENEK (`kuszobMezokOsszegyujtese`: a `GondolatModal`,
// a `KategoriaModal`, az `ErtekJavaslatModal`), és amit a saját javaslatként VISSZAOLVASNAK (`eemberJavaslat`) —
// `minimumDontesiIdo` néven (a prototípus `ertekJavaslatController`-e is így fogadta és adta). Egy táblával, a medián
// nevein, a lapról jött küszöb soha nem fordult le: a gondolat létrehozásakor némán elveszett, a saját javaslat
// idő-mezői üresen jöttek vissza (az `/api/ertekJavaslat` pedig fordítás nélkül írt — lásd ott). ⭐ Ezért egy tábla,
// KÉT oszloppal: a két alak itt áll egymás mellett, és a kettő különbsége látszik.
const KUSZOB_NEVEK_KINT = {
  //                   a medián (aktuális)          egy e-ember javaslata (be és ki)
  elfogadasiKuszob:  { median: 'javaslatElfogadasiKuszob', javaslat: 'javaslatElfogadasiKuszob' },
  reszveteliKuszob:  { median: 'reszveteliAranyKuszob',    javaslat: 'reszveteliAranyKuszob' },
  minimumDontesiIdo: { median: 'aktualMinimumDontesiIdo',  javaslat: 'minimumDontesiIdo' },
  maximumDontesiIdo: { median: 'aktualMaximumDontesiIdo',  javaslat: 'maximumDontesiIdo' }
};

/**
 * Küszöb-négyes a prototípus neveivel.
 * @param {Object} kuszobok - a koino nevein
 * @param {'median'|'javaslat'} [alak] - a medián (aktuális) vagy egy e-ember javaslata
 */
function kuszobokKifele(kuszobok, alak = 'median') {
  const ki = {};
  for (const [belso, nevek] of Object.entries(KUSZOB_NEVEK_KINT)) ki[nevek[alak]] = kuszobok?.[belso];
  return ki;
}

/**
 * ⭐ A MÁSIK IRÁNY (5.7): a prototípus nevei → a koino nevei — egy e-ember JAVASLATÁNAK alakjában, mert a lap azt küldi.
 *
 * ⛔ SZÁNDÉKOSAN UGYANABBÓL AZ EGY TÁBLÁZATBÓL vezetjük le, nem külön listából. Két
 * egymás mellé írt fordítás előbb-utóbb szétcsúszik — és pont az a fajta néma hiba lenne
 * belőle, ami egy küszöböt az ellenkezőjére állít. *(Ugyanaz a tanulság, mint az `ALLASOK`
 * kettős definíciójánál: két lista, két komment, egyik sem igaz.)*
 *
 * @param {Object} kulso - a lap küldte mezők
 * @returns {Object|null} a koino küszöb-négyese, vagy null, ha nincs mind a négy
 */
export function kuszobokBefele(kulso) {
  const be = {};
  for (const [belso, nevek] of Object.entries(KUSZOB_NEVEK_KINT)) {
    const ertek = kulso?.[nevek.javaslat];
    // ⚠️ CSAK EGÉSZ SZÁM. A kanonikus alak nem tűr törtet (`kanonikusAlak.js`), és egy
    // fél százalék úgysem jelent semmit — ha bármelyik hiányzik, nem adunk be javaslatot.
    if (!Number.isInteger(ertek)) return null;
    be[belso] = ertek;
  }
  return be;
}

/**
 * Egy entitás részletei — a `ReszletekModal` ezt kéri.
 *
 * ⚠️ A VÁLASZ `{ data: … }` alakú, mint a tudatpont-képnél: az örökölt modal így olvassa.
 * *A hívó a régi; a válasz alkalmazkodik hozzá.*
 */
export async function entitasReszletei(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasReszletei - KEZDÉS', { azonosito });

  const kep = await lapKepe(tar, koino, beallitas);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, await tartottKerdes(beallitas.nezet));
  const en = beallitas.szerzo;
  // ⭐ D72: a szöveg feloldása (lásd `entitasSzovege`).
  const reszletSzoveg = await szovegFeloldasa(e.szoveg ?? null, beallitas.darabOlvas);

  console.log('pakli.entitasReszletei - VÉGE');
  return {
    data: {
      entitasId: e.azonosito,
      entitasTipus: e.tipus,
      // ⭐ A koinóban a `cim` a név MINDEN típusnál — a modal `nev`-et is olvashat.
      cim: e.cim,
      nev: e.cim,
      szoveg: reszletSzoveg.szoveg,
      ...(reszletSzoveg.hianyzik ? { szovegHianyzik: true, szovegLenyomat: reszletSzoveg.lenyomat } : {}),
      ikon: e.ikon ?? null,
      szuloId: e.szulo ?? null,
      letrehozva: e.letrehozva,
      szerzo: e.szerzo,
      meret: e.meret,
      gondolatTipus: besorolas(kep.entitasok, e.gondolatTipus),
      kategoriak: (e.kategoriak ?? [])
        .map((k) => besorolas(kep.entitasok, k)).filter((k) => k !== null),
      osszesPont: e.osszesPont,
      agazatiPont: agazati.get(e.azonosito) ?? 0,
      hozzajarulokSzama: e.hozzajarulok.size,
      eemberHozzajarulas: en ? (e.hozzajarulok.get(en)?.pont ?? 0) : 0,
      // ⭐ Ki adott rá pontot — a `HozzajarulokModal` ezt mutatja. ⚠️ Nevet nem tudunk
      // mondani (D6: személyes adat nem megy a láncra), csak kulcs-azonosítót.
      hozzajarulok: [...e.hozzajarulok.entries()]
        .map(([ki, ertek]) => ({ szerzo: ki, pont: ertek.pont, szerep: ertek.szerep }))
        .sort((a, b) => (b.pont - a.pont) || (a.szerzo < b.szerzo ? -1 : 1))
    }
  };
}

/**
 * „Hány felmenőre kell még tudatpont?" — a `TudatpontModal` ezt kéri megnyitáskor.
 *
 * ⭐ MIT JELENT: ha egy gyerekre teszel pontot, a felmenőire is illik — különben az ág
 * összesítése (`agazatiPont`) félrevezető lenne, és a gyerek „lebegne" a fában. A
 * prototípus ugyanezt kérdezte; a modal ebből ajánlja fel, hogy kitöltse őket.
 *
 * ⚠️ EZ NEM SZABÁLY, HANEM SEGÍTSÉG. A koino nem tiltja, hogy csak a gyerekre tegyél
 * pontot — a `szabalyok.js` nem is tud róla. *A program bejelent, nem bíráskodik (D19).*
 *
 * ⚠️⚠️ És a kör-őr itt is kell: a `szulo`-lánc körbe mutathat.
 */
export async function hianyzoFelmenok(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.hianyzoFelmenok - KEZDÉS', { azonosito });

  const kep = await lapKepe(tar, koino, beallitas);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  const en = beallitas.szerzo;
  const hianyzok = [];
  const latott = new Set([azonosito]);

  let szulo = e.szulo;
  while (szulo && kep.entitasok.has(szulo) && !latott.has(szulo)) {
    latott.add(szulo);
    const felmeno = kep.entitasok.get(szulo);
    const sajat = en ? (felmeno.hozzajarulok.get(en)?.pont ?? 0) : 0;
    if (sajat <= 0) {
      hianyzok.push({
        entitasId: felmeno.azonosito,
        entitasTipus: felmeno.tipus,
        nev: felmeno.cim
      });
    }
    szulo = felmeno.szulo;
  }

  // Mennyi tudatpontom maradt még kiosztatlanul? (A keretből, ami már ki van osztva.)
  // ⚠️ A SAJÁT LÁNCBÓL, nem az élő entitásokból — ugyanaz a szám, amit a szabály-réteg
  // a D42 bemondott összegéhez számol. Ha itt az élő entitásokat összegeznénk, a felület
  // TÖBB szabad pontot mutatna, mint amennyi van (egy törölt gondolatra tett pont ott
  // marad a keretben), és a lap olyan műveletet ajánlana fel, amit a számítás elutasít.
  const kiosztva = en ? szetosztottPontok(kep, en) : 0;

  console.log('pakli.hianyzoFelmenok - VÉGE', { hianyzo: hianyzok.length });
  return {
    data: {
      hianyzoFelmenok: hianyzok,
      hianyzoDb: hianyzok.length,
      eemberEgyenleg: TUDATPONT_KERET - kiosztva
    }
  };
}

// ===================================
// ⭐⭐ D102: A BEJÁRÓ — a biztos előtag és az előre kérés
// ===================================
//
// A legjobb-először bejárás a KÉRŐ oldalán nem külön gépezet: a helyi tudás össz-pont szerint rendezett listája maga a
// bejárás sorrendje — csak azt kell tudni, MEDDIG végleges. Egy csomópont gyerekeit akkor ismerem mind, ha tartom a
// szeletét (a születések oda vannak bejelentve), vagy a fejléc-válasz bemondta a gyerekszámát (J2), és ennyit ismerek is.
// Ha nem, egy még nem ismert gyereke legfeljebb ekkora lehet: az össz-pontja − a saját pontja (legalább 1 — D14) − az
// ismert gyerekei össz-pontja; és ha egy válasz levágta, a levágás határánál sem nagyobb. A lista addig biztos, amíg a
// következő elem e határok legnagyobbjánál NAGYOBB.
//
// ⭐ Az előre kérés: a blokkoló (kiadott, de nem teljes) csomópontok, aztán a biztos rész utáni következők — MÉLY
// fejléc-kéréssel (a tartó maga jár be — J1), és ha egy korábbi válasz levágta, a FOLYTATÁSSAL (`utan`). ⛔ 9. szabály:
// legfeljebb `ELORE_KERES` kérés egy lekérdezésre — a terhe az oldallal arányos, nem a koinóval.

/**
 * @param {Array<string>} lista - az azonosítók az ágazati pont szerint csökkenő sorrendben (az ág-szűrés után)
 * @param {Map} entitasok
 * @param {Map<string, number>} agazati - az ágazati (össz-)pontok
 * @param {Object} b
 * @param {Function} b.tartott - az → tartom-e a szeletét
 * @param {boolean} [b.gyokerTeljes] - a gyökér minden gyerekét ismerem-e („mindent” mód)
 * @param {Map} [b.tudas] - a fejléc-tudás: az (vagy `GYOKER_KULCS`) → { gy?, levag?: 'teljes' | { p, az } }
 * @param {string|null} [b.agazat] - az ág gyökere (null: az egész koinó)
 * @returns {{biztos: number, kerendo: Array<Object>}}
 */
/**
 * ⭐ D102, D101 ④: amit egy csomópont gyerekeiről tudok — EGY helyen (a bejáró és a Síkidom közös segédje; két másolat
 * csendben szétcsúszna). A gyökér jele a `GYOKER` ('').
 *
 *   · `teljes(az)` — ismerem-e mind: tartom a szeletét (a gyökérnél: „mindent” mód), vagy a tartó bemondott gyerekszámnyit
 *     ismerek (`fejlectudas.json` — `gy`);
 *   · `maradek(az)` — a még nem ismert gyerekek össz-pontjának ÖSSZEGE legfeljebb: az össz-pont − a saját pont (≥ 1, ha
 *     nem láttam — D14) − az ismert gyerekek össz-pontja (a gyökérnél és ismeretlen össz-pontnál végtelen);
 *   · `hatar(az)` — EGY még nem ismert gyerek legfeljebb: a maradék, és a tartó levágásánál sem nagyobb;
 *   · `keres(az, ok)` — a kérés a gyerekeiért: mély (a tartó maga jár be — D102), és ha a levágás határa ismert, folytatással.
 */
function gyerekTudas(entitasok, agazati, { tartott, gyokerTeljes = false, tudas = new Map() } = {}) {
  const gyerekek = gyerekJegyzek(entitasok);
  const gyokerek = [...entitasok.values()].filter((e) => !e.szulo).map((e) => e.azonosito);
  const ertek = (az) => agazati.get(az) ?? 0;
  const ismertek = (az) => (az === GYOKER ? gyokerek : (gyerekek.get(az) ?? []));
  const tudasa = (az) => tudas.get(az === GYOKER ? GYOKER_TUDAS_KULCS : az);
  const teljes = (az) => {
    if (az === GYOKER ? gyokerTeljes : tartott(az)) return true;
    const t = tudasa(az);
    return Number.isSafeInteger(t?.gy) && ismertek(az).length >= t.gy;
  };
  const maradek = (az) => {
    if (az === GYOKER || !(ertek(az) > 0)) return Infinity;
    const e = entitasok.get(az);
    const sajat = e && !e.pontokIsmeretlenek ? Math.max(1, e.osszesPont) : 1;
    return Math.max(0, ertek(az) - sajat - ismertek(az).reduce((s, g) => s + ertek(g), 0));
  };
  // Egy még nem ismert gyerek legfeljebb ekkora lehet.
  const hatar = (az) => {
    const t = tudasa(az);
    // a gyökérnél a tartó teljes tudása a legjobb, amit tudhatunk (D19)
    let h = az === GYOKER && t?.levag === 'teljes' ? 0 : maradek(az);
    if (t?.levag && typeof t.levag === 'object' && Number.isSafeInteger(t.levag.p)) h = Math.min(h, t.levag.p);
    return h;
  };
  const keres = (az, ok) => {
    const lev = tudasa(az)?.levag;
    return { fajta: 'fejlecek', kulcs: az, ok, m: true,
      ...(lev && typeof lev === 'object' && ismertek(az).length > 0 ? { utan: { p: lev.p, az: lev.az } } : {}) };
  };
  return { ertek, ismertek, tudasa, teljes, maradek, hatar, keres };
}

export function biztosElotag(lista, entitasok, agazati, { tartott, gyokerTeljes = false, tudas = new Map(), agazat = null,
  elore = ELORE_KERES } = {}) {
  const { ertek, teljes, hatar, keres } = gyerekTudas(entitasok, agazati, { tartott, gyokerTeljes, tudas });
  const kerendo = [];
  const kerj = (az, ok) => {
    if (kerendo.length >= elore || kerendo.some((x) => x.kulcs === az)) return;
    kerendo.push(keres(az, ok));
  };

  // A kiindulás: az egész koinóban a gyökér (a még nem ismert legfelső szintűek), egy ágban maga az ág.
  let korlat = 0;
  if (!agazat) {
    if (!teljes(GYOKER)) { korlat = hatar(GYOKER); kerj(GYOKER, 'a gyökér szintjét csak részben ismerem'); }
  } else if (!entitasok.has(agazat)) {
    korlat = Infinity;
    kerj(agazat, 'az ágat még nem ismerem');
  }
  let biztos = 0;
  for (const az of lista) {
    if (!(ertek(az) > korlat)) break;
    biztos++;
    if (!teljes(az)) {
      korlat = Math.max(korlat, hatar(az));
      kerj(az, 'a gyerekeit nem ismerem mind (a sorrend innen bizonytalan)');
    }
  }
  // Előre: a biztos rész utáni következők, amiknek a gyerekei hiányoznak (a sorban ők jönnek legközelebb).
  for (let i = biztos; i < lista.length && kerendo.length < elore; i++) {
    if (ertek(lista[i]) > 0 && !teljes(lista[i])) kerj(lista[i], 'előre: a sorban a következők közt');
  }
  return { biztos, kerendo };
}

// ===================================
// ⭐⭐ D101 ③: A STRUKTÚRA — a fa a legerősebb ágaktól kifelé, egy keretig
// ===================================
//
// A prototípus Struktúra nézete a TELJES fát töltötte le (`/api/struktura`, 2000 soros lapokban) — a szigorú (b) és a
// 9. szabály alatt a teljes fa sehol nincs meg, és nem is lehet. ⭐ Itt a fa a bejáró sorrendjéből jön (az ágazati pont
// szerint csökkenően — a legerősebb ágaktól kifelé): mivel egy szülő mindig nagyobb a gyerekénél (a saját pontja
// legalább 1 — D14), a sorrend minden előtagja ZÁRT FA (minden csomópont szülője előtte áll — ha ismerjük). A keret
// (`STRUKTURA_KERET`) a megjelenítést korlátozza; a darabszám helyén „ismert N (keret: B)” áll (D101/M2), és a bejáró a
// hiányzót elkéri (M1). Az örökölt `StrukturaModal` sorai (`sorok`) a prototípus alakjában jönnek (`faElrendezes.js`).

/** ⭐ A Struktúra legfeljebb ennyi csomópontot mutat (a legerősebbeket) — a megjelenítés kerete. */
export const STRUKTURA_KERET = 5000;
/** Egy lap legfeljebb ennyi sor (a prototípus `MAX_LAP_MERET`-je). */
export const STRUKTURA_LAP = 2000;

/** A Struktúra sorrendje a horgonyhoz tartozó képből — az ág (ha van) szerint szűrve, a kerettel. */
async function strukturaSorrend(tar, koino, beallitas = {}) {
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const horgony = Number.isInteger(beallitas.horgony) ? Math.min(beallitas.horgony, esemenyek.length) : esemenyek.length;
  const most = Number.isInteger(beallitas.most) ? beallitas.most : Date.now();
  const kep = await kepetKerni(nezet, koino, horgony, most, esemenyek, tar.csakAtmeneti?.() ?? null);
  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, await tartottKerdes(nezet));
  const agazat = typeof beallitas.agazat === 'string' && beallitas.agazat ? beallitas.agazat : null;
  // ⭐ D112 ③ (F1): a felderítés mélység-korlátja — legfeljebb ennyi szinttel az ág (vagy a gyökér) alatt.
  const maxMelyseg = Number.isInteger(beallitas.maxMelyseg) && beallitas.maxMelyseg >= 0 ? beallitas.maxMelyseg : null;
  const gyokerMelysege = (az) => {
    let x = kep.entitasok.get(az);
    for (let m = 0; m <= FELMENO_KORLAT; m++) { if (!x?.szulo) return m; x = kep.entitasok.get(x.szulo); if (!x) return m + 1; }
    return FELMENO_KORLAT + 1;
  };
  let nemEldontheto = 0;
  const hianyzik = [];
  const lista = [];
  for (const e of kep.entitasok.values()) {
    if (agazat) {
      const h = agHelyzete(kep.entitasok, e.azonosito, agazat);
      if (h.alatta === null) {
        nemEldontheto++;
        if (h.hianyzo && hianyzik.length < MAX_DARAB && !hianyzik.some((x) => x.kulcs === h.hianyzo)) {
          hianyzik.push({ fajta: 'szelet', kulcs: h.hianyzo, ok: 'egy felmenőt nem ismerek (az ág-szűréshez)' });
        }
        continue;
      }
      if (!h.alatta) continue;
      if (maxMelyseg !== null && h.melyseg > maxMelyseg) continue;
    } else if (maxMelyseg !== null && gyokerMelysege(e.azonosito) > maxMelyseg) continue;
    lista.push(e.azonosito);
  }
  const ertek = (az) => agazati.get(az) ?? 0;
  lista.sort((a, b) => ertek(b) - ertek(a) || (a < b ? -1 : a > b ? 1 : 0));
  const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
  const b = biztosElotag(lista, kep.entitasok, agazati, {
    tartott: tartottak ? (az) => tartottak.has(az) : () => true,
    gyokerTeljes: !tartottak,
    tudas: beallitas.fejlecTudas ?? new Map(),
    agazat
  });
  for (const h of b.kerendo) if (hianyzik.length < MAX_DARAB && !hianyzik.some((x) => x.kulcs === h.kulcs)) hianyzik.push(h);
  const keret = Math.max(1, Math.min(Number.isInteger(beallitas.keret) ? beallitas.keret : STRUKTURA_KERET, STRUKTURA_KERET));
  return { kep, agazati, lista, latszik: lista.slice(0, keret), keret, biztos: b.biztos, hianyzik, nemEldontheto,
    horgony, most, agazat };
}

/**
 * ⭐⭐ D112 ③: A FELDERÍTÉS ÁLLÁSA — a Struktúra sorrendje az ágban (a kerettel és a mélységgel): a látható csomópontok
 * (az ág legjobb K-ja, legjobb-először — mindig összefüggő részfa), meddig biztos a sorrend, és mit kell még elkérni.
 * @param {Object} [beallitas] - { agazat, keret, maxMelyseg, nezet, bemondasok, fejlecTudas }
 * @returns {Promise<{latszik: string[], ismert: number, biztos: number, hianyzik: Array<Object>, agIsmert: boolean}>}
 */
export async function felderitesAllasa(tar, koino, beallitas = {}) {
  const s = await strukturaSorrend(tar, koino, beallitas);
  return { latszik: s.latszik, ismert: s.lista.length, biztos: Math.min(s.biztos, s.latszik.length), hianyzik: s.hianyzik,
    agIsmert: !s.agazat || s.kep.entitasok.has(s.agazat),
    // ⭐ D112 ④: a látható csomópontok maguk (a törzs-fázisnak — a szöveg-darabjuk és a fájljaik).
    entitasok: new Map(s.latszik.map((az) => [az, s.kep.entitasok.get(az)]).filter(([, e]) => e)) };
}

/**
 * ⭐ A Struktúra darabszáma — a prototípus alakjában (`{ osszesDarab, agDarab }`: a modál ennyit vár a folyamatjelzőhöz),
 * és a koinós többlet: hány entitást ismerek az ágban (`ismert`), mennyi látszik (`keret`), meddig biztos a sorrend.
 * @returns {Promise<Object>}
 */
export async function strukturaDarabszam(tar, koino, beallitas = {}) {
  const s = await strukturaSorrend(tar, koino, beallitas);
  return {
    osszesDarab: s.agazat ? s.kep.entitasok.size : s.latszik.length,
    agDarab: s.agazat ? s.latszik.length : null,
    ismert: s.lista.length,
    latszik: s.latszik.length,
    keret: s.keret,
    biztos: Math.min(s.biztos, s.latszik.length),
    nemEldontheto: s.nemEldontheto,
    hianyzik: s.hianyzik,
    horgony: s.horgony,
    most: s.most
  };
}

/** Egy entitás Struktúra-sora (a prototípus `strukturaService` alakja — a `faElrendezes.js` ezt olvassa). */
function strukturaSora(e, agazati, entitasok, javaslatok) {
  const dontes = entitasDontese(e, javaslatok);
  const ikonja = (b) => (b ? { nev: b.nev, ikon: b.ikon } : null);
  // A Javaslat/Egyezmény művelet-típusa (a prototípus `javaslatTipus` enumja): több érintettnél „Csomag”.
  const resz = e.toredek ? (dontes?.reszek?.[e.toredek.sorszam - 1] ?? null) : null;
  const muvelet = resz?.muvelet ?? ((dontes?.erintettek?.length ?? 0) > 1 ? 'Csomag' : dontes?.muvelet ?? null);
  return {
    entitasId: e.azonosito,
    entitasTipus: kartyaTipusa(e, dontes),
    szuloId: e.szulo ?? null,
    hierarchikusOsszesPont: agazati.get(e.azonosito) ?? 0,
    letrehozva: e.letrehozva ?? null,
    cim: e.cim ?? null,
    kategoriaIkonok: (e.kategoriak ?? []).map((k) => ikonja(besorolas(entitasok, k))).filter(Boolean),
    tipusIkon: ikonja(besorolas(entitasok, e.gondolatTipus)),
    javaslatTipus: e.tipus === 'Javaslat' ? muvelet : null
  };
}

/**
 * ⭐ A Struktúra egy lapja — a prototípus alakjában (`{ sorok, kovetkezoKurzor }`), a sorrend szerint, a kereten belül. A
 * kurzor a horgonyt is viszi: a lapok ugyanabból a képből jönnek (mint a paklinál).
 * @param {Object} [beallitas] - { agazat, kurzor, lapMeret, nezet, bemondasok, fejlecTudas, keret }
 * @returns {Promise<{sorok: Array<Object>, kovetkezoKurzor: string|null}>}
 */
export async function strukturaLap(tar, koino, beallitas = {}) {
  const honnan = beallitas.kurzor ? kurzorDekodolas(beallitas.kurzor) : null;
  const s = await strukturaSorrend(tar, koino, { ...beallitas,
    ...(honnan ? { horgony: honnan.horgony, most: honnan.most } : {}) });
  const tol = honnan && Number.isInteger(honnan.ertek) ? Math.max(0, honnan.ertek) : 0;
  const meret = Math.max(1, Math.min(Number.isInteger(beallitas.lapMeret) ? beallitas.lapMeret : STRUKTURA_LAP, STRUKTURA_LAP));
  const darab = s.latszik.slice(tol, tol + meret);
  const sorok = darab.map((az) => strukturaSora(s.kep.entitasok.get(az), s.agazati, s.kep.entitasok, s.kep.javaslatok));
  const kov = tol + darab.length;
  return {
    sorok,
    kovetkezoKurzor: kov < s.latszik.length ? kurzorKodolas({ horgony: s.horgony, most: s.most, ertek: kov, azonosito: '' }) : null
  };
}

// ===================================
// ⭐⭐ D101 ④: A SÍKIDOM — egy szülő gyerekei egy küszöb fölött, és az ős-lánc
// ===================================
//
// A prototípus Síkidom nézete képernyő-vezérelten tölt: egy síkidom gyerekeit akkor kéri, amikor elég nagyra nőtt, és csak
// azokat, amelyek elérik a küszöböt (`sikidom/gyerekek` — pont szerint csökkenően, kurzorral); a kártya-menüből indítva az
// ős-láncot is (`sikidom/oslanc`). ⭐ Ez a bejáró sorrendjének EGY szintje: egy csomópont ismert gyerekei az ágazati pont
// szerint (holtversenyben az azonosító — mint a fejléc-kérdésnél, `elobbJon`). A szigorú (b) alatt egy nem tartott
// csomópont gyerekeit nem mind ismerem: a válasz ilyenkor a helyben ismerteket adja (D19 — kimondva), a hiányzót a ház
// útján elkéri (mélyen — a tartó maga jár be, D102), és az `osszesGyerekPont` a még nem ismert gyerekek helyét is
// tartalmazza (a prototípus ebből foglal helyet a később érkezőknek — a pakolási mag). A `vanGyereke` igaz, ha ismerek
// gyereket, ha a tartó gyerekszámot mondott, vagy ha az össz-pontból hely marad egy még nem ismertnek.

/** Egy kérésre legfeljebb ennyi gyerek (a prototípus síkidom-szolgáltatásának `MAX_DARAB`-ja). */
export const SIKIDOM_DARAB = 300;

/** A Síkidom közös alapja: a friss kép (mindig a tár mai vége — a nézet újrakérdez), az ágazati pontok, a gyerek-tudás. */
async function sikidomAlap(tar, koino, beallitas = {}) {
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const kep = await kepetKerni(nezet, koino, esemenyek.length, Date.now(), esemenyek, tar.csakAtmeneti?.() ?? null);
  const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, tartottak ? (az) => tartottak.has(az) : null);
  const t = gyerekTudas(kep.entitasok, agazati, {
    tartott: tartottak ? (az) => tartottak.has(az) : () => true,
    gyokerTeljes: !tartottak,
    tudas: beallitas.fejlecTudas ?? new Map()
  });
  return { kep, agazati, t, mindentTart: !tartottak };
}

/** Egy entitás Síkidom-sora (a prototípus `sikidomService` alakja): a Struktúra sora + van-e gyereke. */
function sikidomSora(e, s) {
  const { szuloId, ...sor } = strukturaSora(e, s.agazati, s.kep.entitasok, s.kep.javaslatok);
  const az = e.azonosito;
  const gy = s.t.tudasa(az)?.gy;
  return { ...sor, vanGyereke: s.t.ismertek(az).length > 0 || (Number.isSafeInteger(gy) && gy > 0)
    || (!s.t.teljes(az) && s.t.hatar(az) > 0) };
}

/**
 * ⭐ Egy szülő gyerekei a küszöb fölött — a prototípus alakjában (`{ gyerekek, osszesGyerekPont, kurzor, vanTovabb }`),
 * és a koinós többlet: ismerem-e mind (`teljes`), hányat ismerek, és mit kell elkérni (`hianyzik`).
 * @param {Object} [beallitas] - { szulo (null: a gyökér szintje), minPont, kurzor: {pont, id}, darab, osszesKell, nezet,
 *   bemondasok, fejlecTudas }
 * @returns {Promise<Object>}
 */
export async function sikidomGyerekek(tar, koino, beallitas = {}) {
  const s = await sikidomAlap(tar, koino, beallitas);
  const { t } = s;
  const szulo = typeof beallitas.szulo === 'string' && beallitas.szulo ? beallitas.szulo : null;
  const kulcs = szulo ?? GYOKER;
  const hianyzik = [];
  if (szulo && !s.kep.entitasok.has(szulo)) {
    hianyzik.push({ fajta: 'szelet', kulcs: szulo, ok: 'a síkidomot még nem ismerem' });
    return { gyerekek: [], osszesGyerekPont: beallitas.osszesKell === false ? null : 0, kurzor: null, vanTovabb: false,
      teljes: false, ismert: 0, hianyzik, mindentTart: s.mindentTart };
  }
  const rendezett = [...t.ismertek(kulcs)].sort((a, b) => t.ertek(b) - t.ertek(a) || (a < b ? -1 : a > b ? 1 : 0));
  const k = beallitas.kurzor;
  const utana = k && Number.isFinite(k.pont) && typeof k.id === 'string'
    ? rendezett.filter((az) => t.ertek(az) < k.pont || (t.ertek(az) === k.pont && az > k.id)) : rendezett;
  const minPont = Number.isFinite(beallitas.minPont) && beallitas.minPont > 0 ? beallitas.minPont : 0;
  const kuszobFolott = [];
  for (const az of utana) { if (t.ertek(az) < minPont) break; kuszobFolott.push(az); }
  const darab = Math.max(1, Math.min(Number.isInteger(beallitas.darab) ? beallitas.darab : SIKIDOM_DARAB, SIKIDOM_DARAB));
  const adag = kuszobFolott.slice(0, darab);
  const teljes = t.teljes(kulcs);
  if (!teljes) hianyzik.push(t.keres(kulcs, szulo ? 'a gyerekeit nem ismerem mind' : 'a gyökér szintjét csak részben ismerem'));
  // ⭐ Az összes gyerek pontja: az ismertek, és ha nem ismerem mind, a még nem ismertek helye (az össz-pontból — a gyökérnél
  // nincs ilyen szám, ott az ismertek).
  const ismertOsszeg = rendezett.reduce((x, az) => x + t.ertek(az), 0);
  const maradek = teljes ? 0 : t.maradek(kulcs);
  const utolso = adag[adag.length - 1];
  return {
    gyerekek: adag.map((az) => sikidomSora(s.kep.entitasok.get(az), s)),
    osszesGyerekPont: beallitas.osszesKell === false ? null : ismertOsszeg + (Number.isFinite(maradek) ? maradek : 0),
    kurzor: utolso ? { pont: t.ertek(utolso), id: utolso } : null,
    vanTovabb: kuszobFolott.length > adag.length,
    teljes,
    ismert: rendezett.length,
    hianyzik,
    mindentTart: s.mindentTart
  };
}

/**
 * ⭐ Egy entitás ős-lánca (elöl maga, a végén a legfelső ismert felmenő) — a prototípus alakjában
 * (`{ oslanc, legerosebbGyokerPont }`). Ha egy felmenő nincs meg, a lánc ott véget ér (`teljesLanc: false`), és a hiányzót
 * elkéri; a legerősebb gyökér pontja ilyenkor a legfelső ismert felmenőét is figyelembe veszi (a nézet a VILÁG alá fűzi).
 * @param {Object} [beallitas] - { entitas, nezet, bemondasok, fejlecTudas }
 * @returns {Promise<Object>}
 */
export async function sikidomOslanc(tar, koino, beallitas = {}) {
  const s = await sikidomAlap(tar, koino, beallitas);
  const { t } = s;
  const lanc = [];
  const hianyzik = [];
  const latott = new Set();
  let az = typeof beallitas.entitas === 'string' && beallitas.entitas ? beallitas.entitas : null;
  let teljesLanc = false;
  while (az && lanc.length < FELMENO_KORLAT && !latott.has(az)) {
    const e = s.kep.entitasok.get(az);
    if (!e) {
      hianyzik.push({ fajta: 'szelet', kulcs: az, ok: lanc.length ? 'egy felmenőjét nem ismerem' : 'még nem ismerem' });
      break;
    }
    latott.add(az);
    lanc.push(e);
    az = e.szulo ?? null;
    if (!az) teljesLanc = true;
  }
  let legerosebb = 0;
  for (const g of t.ismertek(GYOKER)) legerosebb = Math.max(legerosebb, t.ertek(g));
  if (lanc.length) legerosebb = Math.max(legerosebb, t.ertek(lanc[lanc.length - 1].azonosito));
  return {
    oslanc: lanc.map((e) => sikidomSora(e, s)),
    legerosebbGyokerPont: legerosebb,
    teljesLanc,
    hianyzik,
    mindentTart: s.mindentTart
  };
}

// ===================================
// ⭐⭐ D101 ⑤: A KERESÉS — a helyi alja (M4): a készüléken ismert entitások címében, ág-szűrve
// ===================================
//
// A prototípus keresője (`keresesService`) a TELJES adatbázisban keresett, típusonként `limit` találattal (alapból 10,
// legfeljebb 50), és ág-szűrve csak az ág alattiakat adta. ⭐ Itt a helyi alja (D101/M4): a készüléken ismert entitások
// címében (a két tárból), ugyanazokkal a szabályokkal — a hálózati MEGTALÁLÁS a kereső-réteg (⑦, skálázási terv II.), ami még
// nincs, és a válasz ezt kimondja (D19, M2). Egy készülék terhe itt a saját szeletein múlik (amit tart és látott), nem a koinó
// méretén. A sorrend típusonként az ágazati pont szerint csökkenő (holtversenyben az azonosító — a bejáró sorrendje): a
// prototípusé az adatbázisé volt, a koinóban a legerősebb elöl.

/** A kereső típusai (a cím-viselők — a prototípus `TAMOGATOTT_TIPUSOK`-ja). */
export const KERESES_TIPUSOK = ['Gondolat', 'Kategoria', 'GondolatTipus'];
/** Típusonként alapból ennyi találat, és legfeljebb ennyi (a prototípus `keresesController`-e). */
export const KERESES_ALAP = 10;
export const KERESES_MAX = 50;

/**
 * ⭐ A helyi keresés — a prototípus alakjában (`{ talalatok: [{ entitasId, entitasTipus, cim }] }`), és a koinós többlet:
 * hány entitás közt kerestem (`ismert`), és ág-szűrésnél hányról nem tudom eldönteni, hogy az ágban van-e.
 * @param {Object} [beallitas] - { q, tipusok, limit, agazat, nezet, bemondasok }
 * @returns {Promise<Object>}
 */
export async function keresesHelyben(tar, koino, beallitas = {}) {
  const q = String(beallitas.q ?? '').trim().normalize('NFC').toLowerCase();
  const kertTipusok = Array.isArray(beallitas.tipusok) && beallitas.tipusok.length
    ? beallitas.tipusok.filter((t) => KERESES_TIPUSOK.includes(t)) : KERESES_TIPUSOK;
  const limit = Number.isInteger(beallitas.limit) && beallitas.limit >= 1 ? Math.min(beallitas.limit, KERESES_MAX) : KERESES_ALAP;
  const agazat = typeof beallitas.agazat === 'string' && beallitas.agazat ? beallitas.agazat : null;
  if (!q) return { talalatok: [], ismert: 0, nemEldontheto: 0, hianyzik: [], agazat };
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const kep = await kepetKerni(nezet, koino, esemenyek.length, Date.now(), esemenyek, tar.csakAtmeneti?.() ?? null);
  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, await tartottKerdes(nezet));
  const ertek = (az) => agazati.get(az) ?? 0;
  const tipusonkent = new Map(kertTipusok.map((t) => [t, []]));
  const hianyzik = [];
  let nemEldontheto = 0;
  for (const e of kep.entitasok.values()) {
    const lista = tipusonkent.get(e.tipus);
    if (!lista) continue;
    if (!String(e.cim ?? '').normalize('NFC').toLowerCase().includes(q)) continue;
    if (agazat) {
      const h = agHelyzete(kep.entitasok, e.azonosito, agazat);
      if (h.alatta === null) {
        nemEldontheto++;
        if (h.hianyzo && hianyzik.length < MAX_DARAB && !hianyzik.some((x) => x.kulcs === h.hianyzo)) {
          hianyzik.push({ fajta: 'szelet', kulcs: h.hianyzo, ok: 'egy felmenőt nem ismerek (az ág-szűréshez)' });
        }
        continue;
      }
      if (!h.alatta) continue;
    }
    lista.push(e);
  }
  const talalatok = [];
  for (const [tipus, lista] of tipusonkent) {
    lista.sort((a, b) => ertek(b.azonosito) - ertek(a.azonosito) || (a.azonosito < b.azonosito ? -1 : a.azonosito > b.azonosito ? 1 : 0));
    for (const e of lista.slice(0, limit)) {
      talalatok.push({ entitasId: e.azonosito, entitasTipus: tipus,
        cim: e.cim ?? (tipus === 'Gondolat' ? '(cím nélkül)' : '(név nélkül)') });
    }
  }
  return { talalatok, ismert: kep.entitasok.size, nemEldontheto, hianyzik, agazat };
}

// ===================================
// ⭐⭐ D101 ⑥: AZ ÉRTESÍTÉSEK KÉPE — a pillanatkép a postafiókhoz (`ertesites.js`)
// ===================================

/**
 * ⭐ A postafiók pillanatképe a tár mai végéből — a tartott entitások és a javaslataik (`ertesites.js` `pillanatkep`), a
 * kép-gyorsítótárral (ugyanaz a kép, mint a lapé). A küszöbök a modál neveivel (`kuszobokKifele` — a javaslat alakja).
 * @param {Object} [beallitas] - { szerzo, nezet, bemondasok, most }
 * @returns {Promise<{kep: Object, entitasok: Map}>}
 */
export async function ertesitesiKep(tar, koino, beallitas = {}) {
  const nezet = beallitas.nezet ?? ujPakliNezet();
  const esemenyek = await koinoEsemenyei(tar, koino);
  const most = Number.isFinite(beallitas.most) ? beallitas.most : Date.now();
  const kep = await kepetKerni(nezet, koino, esemenyek.length, most, esemenyek, tar.csakAtmeneti?.() ?? null);
  const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
  const tartott = tartottak ? (az) => tartottak.has(az) : () => true;
  const agazati = agazatiPontok(kep.entitasok, beallitas.bemondasok, tartottak ? tartott : null);
  const szavazatok = new Map();
  for (const e of kep.szamitok ?? []) {
    if (e.tipus !== 'Szavazat' || typeof e.adat?.javaslat !== 'string') continue;
    if (!szavazatok.has(e.adat.javaslat)) szavazatok.set(e.adat.javaslat, new Set());
    szavazatok.get(e.adat.javaslat).add(e.szerzo);
  }
  return {
    kep: pillanatkep({ entitasok: kep.entitasok, javaslatok: kep.javaslatok, agazati, tartott, en: beallitas.szerzo ?? null,
      szavazatok, kuszobKi: (k) => kuszobokKifele(k, 'javaslat'), most }),
    entitasok: kep.entitasok
  };
}

// ===================================
// ⭐ AZ ALSÓ SÁV SZÁMAI (Csaba, 2026-10-15) — a KÉSZÜLÉKEN ismert rész
// ===================================
//
// A prototípus alsó sávja a platform számait mutatta (`platform/statisztika`: hány e-ember, gondolat, kategória,
// gondolattípus, javaslat, egyezmény). ⛔ A koinó egészét senki nem számolja meg (9. szabály) — ez a lap képe: a kártyák
// száma típusonként (ugyanazzal a típussal, amit a kártya mutat — az elfogadott javaslat egyezmény, D85/4), és az
// e-emberek, akiknek eseménye a két táramban van. A kép ugyanaz, mint a lapé (a horgony gyorsítótárából).

/**
 * ⭐ A lap horgonyával (`horgony`, `most`) ugyanaz a kép, mint a paklié — a számok azt mondják, amit a kártyák mutatnak,
 * és a kép-gyorsítótár sem cserélődik a kettő között.
 * @param {Object} [beallitas] - { nezet, horgony, most }
 * @returns {Promise<{eemberekSzama: number, gondolatokSzama: number, kategoriakSzama: number, gondolatTipusokSzama: number,
 *   javaslatokSzama: number, egyezmenyekSzama: number}>}
 */
export async function helyiStatisztika(tar, koino, beallitas = {}) {
  const esemenyek = await koinoEsemenyei(tar, koino);
  const kep = await lapKepe(tar, koino, beallitas);
  const db = { Gondolat: 0, Kategoria: 0, GondolatTipus: 0, Javaslat: 0, Egyezmeny: 0 };
  for (const e of kep.entitasok.values()) {
    const tipus = kartyaTipusa(e, entitasDontese(e, kep.javaslatok));
    if (tipus in db) db[tipus]++;
  }
  // Az e-emberek ugyanabból a bemenetből, amiből a kép (az első `horgony` esemény — `lapKepe`).
  const horgony = Number.isInteger(beallitas.horgony) ? Math.max(0, Math.min(beallitas.horgony, esemenyek.length)) : esemenyek.length;
  const szerzok = new Set();
  for (let i = 0; i < horgony; i++) szerzok.add(esemenyek[i].szerzo);
  return {
    eemberekSzama: szerzok.size,
    gondolatokSzama: db.Gondolat,
    kategoriakSzama: db.Kategoria,
    gondolatTipusokSzama: db.GondolatTipus,
    javaslatokSzama: db.Javaslat,
    egyezmenyekSzama: db.Egyezmeny
  };
}

// ===================================
// ⭐ D101: „X ÁGA ALATT VAN-E?” — EGY HELYEN
// ===================================
//
// A Tudatpontok, a Keresés, a Rendezés helyi módjai és az értesítések részfa-szűrése mind ezt kérdezi (D101). A
// felmenő-láncon dől el — a szülő-mutatókon, körbiztosan, legfeljebb `FELMENO_KORLAT` lépés (mint a ház felmenői); az
// entitás maga is az ágához tartozik (a prototípus ág-szűrése is így számolt).
//
// ⚠️ A HIÁNY NEM TÉNY (D19): ha a lánc egy ismeretlen felmenőnél megszakad, a válasz „nem eldönthető” (`null`), és a
// hiányzó felmenő megnevezve — a hívó elkérheti (a ház útján, `szelet`). Ha a lánc a korlát után is folytatódna,
// ugyanígy nem eldönthető (a 64 mélységet a tagsági lánc is korlátnak veszi — D59).

/**
 * Az `az` entitás az `ag` ága alatt van-e.
 * @param {Map} entitasok - a kép entitásai
 * @param {string} az - a vizsgált entitás
 * @param {string} ag - az ág gyökere
 * @returns {{alatta: boolean|null, hianyzo: string|null}} `alatta`: igen · nem · null = nem eldönthető
 */
export function agHelyzete(entitasok, az, ag) {
  const latott = new Set();
  let x = az;
  for (let lepes = 0; lepes <= FELMENO_KORLAT; lepes++) {
    if (!x) return { alatta: false, hianyzo: null };               // a gyökérig értünk, az ág nem jött
    if (x === ag) return { alatta: true, hianyzo: null, melyseg: lepes };   // ⭐ D112 ③: hány szinttel az ág alatt
    // ⚠️ Kör a szülő-láncon: minden felmenő a körön van, és az ág nem volt köztük — tehát nem alatta.
    if (latott.has(x)) return { alatta: false, hianyzo: null };
    latott.add(x);
    const e = entitasok.get(x);
    if (!e) return { alatta: null, hianyzo: x };
    x = e.szulo ?? null;
  }
  return { alatta: null, hianyzo: null };
}

// ===================================
// ⭐ D101 (az I. csoport): A SAJÁT AKTÍV PONT-HOZZÁRENDELÉSEIM — a Tudatpontok modál listája
// ===================================

/** Egy lista legfeljebb ennyi tételt ad (a prototípus `LISTA_LIMIT`-je és a vezérlője is 100-at enged). */
export const HOZZARENDELES_KORLAT = 100;

/**
 * A saját aktív pont-hozzárendeléseim — a prototípus `GET /api/tudatpont/aktiv-hozzarendelesek` alakjában
 * (`{ entitasId, entitasTipus, entitasCim, tudatPontok }`, a `szerep` többletként).
 *
 * ⭐ A FORRÁS A SAJÁT LÁNCOM: a kép kiosztási főkönyve (ugyanaz, amiből a szabad pont jön — `szetosztottPontok`), nem az
 * élő entitások. A pont akkor is az enyém, ha az entitást nem látom (a cím helyén ilyenkor null, a típus „ismeretlen” —
 * D19); a szigorú (b) alatt amúgy minden pozitív pontú szeletemet tartom (B/1). 🔍 *Egymilliárdnál?* A lista a saját
 * tevékenységemmel nő (legfeljebb a keret), nem a koinóval.
 *
 * A sorrend a prototípusé (a legutóbb rendezett elöl) — de a SAJÁT láncom sorszáma szerint, nem az óra szerint. Ág-szűrve
 * (`ag`): csak ami az ág alatt van (`agHelyzete`); ami nem eldönthető, azt kihagyjuk, megszámoljuk (`nemEldontheto`), és
 * a hiányzó felmenőt kérendőnek mondjuk (`hianyzik` — a ház útja hozza el).
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas] - { szerzo, ag, limit, nezet, horgony, most }
 * @returns {Promise<{data: Array<Object>, count: number, osszes: number, nemEldontheto: number, szabad: number,
 *   hianyzik: Array<{fajta: string, kulcs: string, ok: string}>}>}
 */
export async function sajatHozzarendelesek(tar, koino, beallitas = {}) {
  console.log('pakli.sajatHozzarendelesek - KEZDÉS', { ag: beallitas.ag ?? null });
  const en = beallitas.szerzo ?? null;
  const ag = typeof beallitas.ag === 'string' && beallitas.ag ? beallitas.ag : null;
  const kertLimit = Number.isInteger(beallitas.limit) ? beallitas.limit : HOZZARENDELES_KORLAT;
  const limit = Math.max(1, Math.min(kertLimit, HOZZARENDELES_KORLAT));

  const esemenyek = await koinoEsemenyei(tar, koino);
  const kep = await lapKepe(tar, koino, beallitas);
  if (!en) return { data: [], count: 0, osszes: 0, nemEldontheto: 0, szabad: TUDATPONT_KERET, hianyzik: [] };

  // A nyertes pont-esemény sorszáma (a saját láncomban) — ez a „legutóbb rendezett” mércéje.
  const sajatSorszam = new Map();
  for (const e of esemenyek) if (e.szerzo === en) sajatSorszam.set(e.azonosito, e.sorszam);

  const tetelek = [];
  let nemEldontheto = 0;
  const hianyzik = [];
  for (const [kulcs, pont] of kep.kiosztasok ?? []) {
    const hatar = kulcs.lastIndexOf('|');
    if (kulcs.slice(0, hatar) !== en || !(pont > 0)) continue;
    const az = kulcs.slice(hatar + 1);
    if (ag) {
      const h = agHelyzete(kep.entitasok, az, ag);
      if (h.alatta === null) {
        nemEldontheto++;
        if (h.hianyzo && !hianyzik.some((x) => x.kulcs === h.hianyzo)) {
          hianyzik.push({ fajta: 'szelet', kulcs: h.hianyzo, ok: 'egy felmenőt nem ismerek (az ág-szűréshez)' });
        }
        continue;
      }
      if (!h.alatta) continue;
    }
    const e = kep.entitasok.get(az);
    const dontes = e ? entitasDontese(e, kep.javaslatok) : null;
    tetelek.push({
      entitasId: az,
      entitasTipus: e ? kartyaTipusa(e, dontes) : 'ismeretlen',
      entitasCim: e?.cim ?? null,
      tudatPontok: pont,
      szerep: e?.hozzajarulok.get(en)?.szerep ?? null,
      sorszam: sajatSorszam.get(kep.pontEsemenyek?.get(kulcs)) ?? -1
    });
  }
  tetelek.sort((a, b) => (b.sorszam - a.sorszam) || (a.entitasId < b.entitasId ? -1 : a.entitasId > b.entitasId ? 1 : 0));
  const data = tetelek.slice(0, limit).map(({ sorszam, ...t }) => t);

  console.log('pakli.sajatHozzarendelesek - VÉGE', { darab: data.length, osszes: tetelek.length, nemEldontheto });
  return {
    data,
    count: data.length,               // a prototípusé: a visszaadott tételek száma
    osszes: tetelek.length,           // ⭐ és hány van összesen (a lista felülről korlátos)
    nemEldontheto,
    szabad: TUDATPONT_KERET - szetosztottPontok(kep, en),
    hianyzik: hianyzik.slice(0, HOZZARENDELES_KORLAT)
  };
}

/**
 * Egy entitás küszöbei — az `ErtekJavaslatModal` és a `ReszletekModal` kéri.
 *
 * ⭐ A küszöb a tulajdonosok érték javaslatainak MEDIÁNJA (D4) — ez számítás, tehát a
 * programé. A saját javaslatomat külön adjuk vissza, hogy a modal ki tudja tölteni a mezőket.
 */
export async function entitasKuszobei(tar, koino, azonosito, beallitas = {}) {
  console.log('pakli.entitasKuszobei - KEZDÉS', { azonosito });

  const kep = await lapKepe(tar, koino, beallitas);

  const e = kep.entitasok.get(azonosito);
  if (!e) return null;

  // A saját érték javaslatom — a szabály-réteg által elfogadott események közül az utolsó.
  let sajat = null;
  if (beallitas.szerzo) {
    for (const esemeny of kep.szamitok ?? []) {
      if (esemeny.tipus !== 'ErtekJavaslat') continue;
      if (esemeny.szerzo !== beallitas.szerzo) continue;
      if (esemeny.adat?.entitas !== azonosito) continue;
      sajat = esemeny.adat.ertekek;      // az utolsó nyer
    }
  }

  console.log('pakli.entitasKuszobei - VÉGE', { vanSajat: sajat !== null });
  return {
    aktualisErtekek: kuszobokKifele(e.kuszobok ?? ALAP_KUSZOBOK),
    // ⭐ D101: a saját javaslat a JAVASLAT alakjában (az `ErtekJavaslatModal` ezekkel a nevekkel tölti ki a mezőit).
    eemberJavaslat: sajat ? kuszobokKifele(sajat, 'javaslat') : null
  };
}

/**
 * A horgonyhoz tartozó kép — gyorsítótárból, vagy kiszámolva.
 *
 * ⚠️ ITT ÜL MA A NEM-SKÁLÁZÓ RÉSZ, és tudatosan: az `allapotSzamitasa` az első `horgony`
 * darab eseményt kapja.
 *
 * ⭐ **Egy lapozás alatt EGYSZER fut le** — a további oldalak ÉS a hozzájuk tartozó
 * kártya-kérések (szöveg, tudatpont, részletek, küszöbök, felmenők) mind ugyanabból a
 * képből jönnek, mert mind ugyanazt a `horgony`-t és `most`-ot hozzák.
 *
 * ⚠️⚠️ **A `most` a kulcs harmadik tagja, és ez érzékeny hely.** Aki friss `Date.now()`-val
 * hívja, az minden kéréssel ÚJRASZÁMOLTATJA az egész koinót — 2026-09-12-ig pontosan ez
 * történt az öt kártya-végponton. Ezért megy mind az öt a `lapKepe`-n keresztül; ha új
 * kártya-végpont születik, **azt is oda kösd**, ne ide közvetlenül.
 */
async function kepetKerni(nezet, koino, horgony, most, esemenyek, csakAtmeneti = null) {
  // ⭐ A szigorú (b) alatt: amit nem tartok, annak a pontjai ismeretlenek — a D14 nem tüntetheti el (`koino.js`
  // `kepetKeszit` párja; 72. mérés).
  const tartottak = typeof nezet.tartott === 'function' ? await nezet.tartott() : null;
  const kulcs = koino + '|' + horgony + '|' + most + '|' + (csakAtmeneti?.size ?? 0) + '|' + (tartottak ? tartottak.size : 'm');
  if (nezet.horgony === kulcs && nezet.kep) return nezet.kep;

  // ⭐ „Az első N esemény" — és ez azért stabil halmaz, mert a tár HOZZÁFŰZHETŐ: ami egyszer
  // beírt, az ott marad, azon a helyen.
  const bemenet = horgony >= esemenyek.length ? esemenyek : esemenyek.slice(0, horgony);
  // ⭐ B/2: ha a tár a két tár nézete (`atmenetiTar.js`), a D14 kivételéhez megmondja, mi van csak az átmenetiben.
  const kep = allapotSzamitasa(bemenet, { csakAtmeneti,
    ...(tartottak ? { nemTartott: (az) => !tartottak.has(az) } : {}) });

  // ⭐⭐ ÉS A HÁROM FÁZIS HARMADIKA: az elfogadott szerkesztési egyezmények rávezetése.
  // ⚠️ Enélkül a pakli **elfogadott egyezmény után is a régi címet mutatná** — pontosan az
  // a hiba, amit a Szakasz 5.3 első órájában mértünk.
  const osszegzesek = typeof nezet.osszegzesek === 'function' ? await nezet.osszegzesek() : new Map();
  const javaslatok = javaslatokSzamitasa(kep.szamitok, kep, most, { osszegzesek });
  await szerkesztesiEgyezmenyekAlkalmazasa(kep, javaslatok);

  // ⭐ A javaslatok is kártyák (5.5) — a képpel együtt tartjuk, hogy ne kelljen kétszer
  // kiszámolni őket.
  kep.javaslatok = javaslatok;

  nezet.horgony = kulcs;
  nezet.kep = kep;
  nezet.szamitasok++;
  return kep;
}
