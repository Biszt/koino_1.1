// koino/felulet/js/kartyaAdat.js

// Felelősség: a koino adat-alakjából a KÁRTYÁK által várt alakot előállítani.
//
// ===== ⭐ MIÉRT ITT, ÉS MIÉRT EGY HELYEN =====
//
// A prototípus kártyái ezt az alakot olvassák:
//
//     { entitasId, entitasTipus, olvasatlanErtesitesek, adatok: { cim, szoveg, … } }
//
// A koino `/api/pakli`-ja viszont a SAJÁT szótárában beszél: `{ azonosito, tipus, cim, … }`.
// A kettő között valakinek fordítania kell. Három hely jöhetett szóba, és kettő rossz:
//
//   ⛔ **a kártyákban** — akkor minden kártya-fájlt át kellene írni, és elveszne az, ami az
//      átemelést olcsóvá tette: hogy a kártyák **változatlanul** jönnek;
//   ⛔ **az `/api/pakli`-ban** — akkor az API a prototípus szótárát beszélné, és a
//      terminál- vagy natív kliens is ezt az idegen alakot kapná;
//   ✅ **itt, a lapon, EGY fájlban** — a felület fordít, a program marad önmaga.
//
// ⚠️ ÉS EZ NEM SÉRTI A „VÉKONY LAP" ELVET. Az arról szól, hogy a lap **ne SZÁMOLJON** —
// ne dolgozza fel az eseményeket, ne érvényesítsen szabályt, ne döntsön el semmit. A
// **mező-átnevezés nem számítás.** Itt egyetlen érték sem születik: minden mező vagy
// átkerül, vagy hiányzik.
//
// Használják: `koinoPakli.js` (a lapos lapozás), és az `apiHelper.js` (a prototípus pakli-útvonalai — lent, D100).

// ===================================
// AMI HIÁNYZIK — és ez tudatos
// ===================================
//
// A kártyák olyan mezőket is olvasnak, amiknek a koinóban **nincs megfelelője**. Ezeket
// nem találjuk ki, hanem üresen hagyjuk — a kártya elbírja (a prototípusban is lehet üres),
// és így a hiány LÁTSZIK, nem tűnik el egy kitalált érték mögött:
//
//   · `gondolatTipus`, `kategoriak` → a két entitástípus nem létezik (végpont-térkép 2.)
//   · `olvasatlanErtesitesek`       → az értesítés-réteg még nem jött át (5.5)
//   · `kulonvalasok`                → a prototípus különválás-fogalma
//   · `modositva`, `szuloModositva` → a prototípus szerkesztés-követése; a koinóban az
//                                     egyezmény MAGA a nyoma a változásnak
//   · `szovegMezo`                  → a blokk-alapú szöveg (5.7); a koino ma sima szöveget
//                                     tárol — ⭐ és a `SzovegMezoMegjelenito` ezt **kezeli**
//                                     („3. sima string"), ezért nem kell átalakítani

// A javaslat státuszának szavai. ⚠️ A koino a saját szótárát használja
// (`javaslatSzamitas.js`), a prototípus kártyái a magukét — és a `JavaslatKartya` a
// **szavazás-fület** kifejezetten az `'Aktiv'` értékhez köti.
const STATUSZ_KIFELE = {
  folyamatban: 'Aktiv',
  elfogadva: 'Elfogadva',
  elvetve: 'Elvetve'
};

/**
 * Egy `/api/pakli` kártya → a prototípus kártya-alakja.
 *
 * @param {Object} k - a koino kártya-adata
 * @returns {Object} a kártyák által várt entitás-objektum
 */
export function kartyaAdatta(k) {
  return {
    entitasId: k.azonosito,
    entitasTipus: k.tipus,

    // ⏸️ Nincs értesítés-réteg — a kártya 0-t fog mutatni, ami igaz is.
    olvasatlanErtesitesek: 0,

    // ⭐⭐ A TUDATPONT-SOR MEZŐI — és ezek a kártya LEGFELSŐ szintjén vannak, nem az
    // `adatok`-ban. ⚠️ *Ez mérésből derült ki, nem olvasásból:* elsőre mindent az
    // `adatok`-ba tettem, és a kártya három nullát mutatott. A `Kartya.js`
    // `_kozosTudatpontSorFeltoltese`-e pontosan ezt a négy nevet olvassa.
    hozzajarulokSzama: k.hozzajarulok ?? 0,
    eemberSajatTudatpontEntitason: k.sajatPont ?? 0,
    entitasSajatTudatpont: k.osszesPont ?? 0,
    hierarchikusOsszesPont: k.agazatiPont ?? 0,

    // A kategória/gondolattípus kártya a szülőt a legfelső szinten olvassa.
    szuloId: k.szulo ?? null,

    // ⭐ A HÁZ (D100): a `Pakli.js` a testvérek sorrendjéhez (`testverRendezes.js`) a LEGFELSŐ szinten olvassa a
    // létrehozás idejét, és a hierarchikus pakli a mélységet.
    letrehozva: k.letrehozva ?? null,
    melysegiSzint: k.melysegiSzint ?? null,

    // ⭐ H2: az össz-pont forrása és hogy tartom-e — a kártya nem olvassa (bájtra a prototípusé), a jelölést a
    // `koinoPakli.js` teszi rá a kirajzolás után. Csak a hierarchikus paklinál van.
    koinoForras: k.osszPontForras
      ? { tartom: k.tartom === true, osszPontForras: k.osszPontForras, pontokIsmeretlenek: k.pontokIsmeretlenek === true }
      : null,

    adatok: {
      cim: k.cim ?? '',

      // ⭐⭐ A BESOROLÁS-KÁRTYÁK `nev`-et olvasnak, nem `cim`-et (5.4).
      //
      // ⚠️ A koinóban MINDEN entitásnak `cim`-e van — a kategóriának is az a neve. Ez
      // szándékos: így az állapot-számítás, a rendezés és az egyezmény-végrehajtás
      // változtatás nélkül működik rajtuk, nincs párhuzamos `nev` mező. A prototípus
      // kártyái más szót használnak, tehát **itt fordítunk** — ez a fájl dolga.
      nev: k.cim ?? '',
      ikon: k.ikon ?? null,

      // ⭐ FELOLDVA érkezik a programtól ({ azonosito, nev, ikon }), nem azonosítóként —
      // a feloldás keresés az állapotban, tehát számítás, tehát a programé.
      gondolatTipus: k.gondolatTipus ?? null,
      kategoriak: k.kategoriak ?? [],

      // ----- ⭐ A JAVASLAT MEZŐI (5.5) -----
      //
      // ⚠️ AZ ARÁNYOK EZRELÉKBEN ÉRKEZNEK, és ez nem szeszély: a koino **egész
      // aritmetikával** számol, hogy kerekítés soha ne dönthessen el szavazást. A kártya
      // százalékot ír ki — a váltás tehát itt, a felületen történik, ahol már csak
      // megjelenítés. *A programban egyetlen tört szám sem születik.*
      ...(k.javaslat ? {
        // ⭐ A D27 SZERINT A NEVE: SZERKESZTÉSI javaslat. A "fajta" mező mondja meg, melyikről
        // van szó — az általános javaslat majd más feliratot kap.
        javaslatTipus: k.javaslat.muvelet,
        javaslatFajta: k.javaslat.fajta === 'altalanos' ? 'Általános' : 'Szerkesztési',

        // ⚠️⚠️ A STÁTUSZ SZAVAI ELTÉRNEK — és ez nem kozmetika: a `JavaslatKartya` a
        // **szavazás-fület** csak `'Aktiv'` státusznál rajzolja ki. A koino
        // `'folyamatban'`-t mond, tehát fordítás nélkül **a szavazás soha nem jelenne meg**.
        // ⭐ Ezt is a böngésző mondta meg, nem a kód olvasása.
        statusz: STATUSZ_KIFELE[k.javaslat.statusz] ?? k.javaslat.statusz,
        szavazhat: k.javaslat.szavazhatok,
        dontesiIdo: k.javaslat.dontesiIdo,
        // ⭐ D85/4: az `EgyezmenyKartya` a döntés dátumát írja ki — ez a lezárás pillanata.
        ...(k.javaslat.statusz === 'elfogadva' ? { dontesDatum: k.javaslat.lezarasIdeje } : {}),
        // ⚠️ A prototípus kártyája EGY nevet ír ki („módosított gondolat"), a koino
        // viszont **több entitást** is érinthet (2026-09-07). Az elsőt adjuk neki, a
        // teljes listát külön — így a kártya változatlan maradhat, és a részletek-nézet
        // mégis meg tudja mutatni, mi minden van a javaslatban.
        modositottGondolat: k.javaslat.erintettCim,
        erintettek: k.javaslat.erintettek ?? [],
        // ⭐⭐ A RÉSZ-DÖNTÉSEK: a szerkesztési javaslat érintettenként külön dől el
        // (töredék-modell), és **minden résznek teljesítenie kell a sajátját**. A kártya
        // az elsőt mutatja; a részletek-nézet megmutathatja, melyik rész buktatja el.
        reszek: k.javaslat.reszek ?? [],
        indoklas: k.javaslat.indoklas,

        tamogatotsagiArany: (k.javaslat.tamogatottsagEzrelek ?? 0) / 10,
        ellenzoiArany: (k.javaslat.ellenzoiEzrelek ?? 0) / 10,
        tartozkodoiArany: (k.javaslat.tartozkodoiEzrelek ?? 0) / 10,
        reszveteliArany: (k.javaslat.reszveteliEzrelek ?? 0) / 10,

        // ⭐ A koino saját mezői, hogy a részletek-nézet is hozzájuk férjen.
        szavazok: k.javaslat.szavazok,
        nevezo: k.javaslat.nevezo,
        bizonyossagiMutato: k.javaslat.bizonyossagiMutato,
        kesoiSzavazatok: k.javaslat.kesoiSzavazatok,
        fajta: k.javaslat.fajta,
        egyezmeny: k.javaslat.egyezmeny
      } : {}),

      // ⏸️ „Hány gondolat használja ezt a kategóriát?" — a besorolás-kártyák mutatnák.
      // Ma nincs meg: ez visszafelé mutató kérdés (ki hivatkozik rám?), amihez a
      // szeletelt tárban külön mutató kellene. ⚠️ Nem találunk ki számot: a hiány
      // látszódjon. *(A kereső-réteg kérdése — Szakasz 6.)*
      hasznaloGondolatokSzama: null,

      // ⭐ A koino sima szöveget tárol; a megjelenítő ezt az alakot ismeri.
      // ⚠️ A LISTA NEM HOZZA a szöveget (9. szabály — lásd `js/allapot/pakli.js`), ezért
      // itt csak az van, amit külön elkértünk. A `vanSzoveg` megmondja, érdemes-e kérni.
      szoveg: k.szoveg ?? null,
      szovegMezo: k.szoveg ?? null,
      vanSzoveg: k.vanSzoveg === true,

      // A koino saját mezői — a kártya nem olvassa mindet, de a részletek-nézetnek kellenek,
      // és így egy helyen látszik, mit tudunk valójában.
      szulo: k.szulo ?? null,
      szerzo: k.szerzo ?? null,
      letrehozva: k.letrehozva ?? null,
      osszesPont: k.osszesPont ?? 0,
      agazatiPont: k.agazatiPont ?? 0,
      hozzajarulok: k.hozzajarulok ?? 0
    }
  };
}

/**
 * Egy egész oldalnyi kártya.
 * @param {Array<Object>} kartyak
 * @returns {Array<Object>}
 */
export function oldalAdatta(kartyak) {
  return (kartyak ?? []).map(kartyaAdatta);
}

// ===================================
// ⭐⭐ A HÁZ (D100, H3): A PROTOTÍPUS PAKLI-ÚTVONALAI
// ===================================
//
// Az örökölt `Pakli.js` bájtra változatlanul jött át, tehát a PROTOTÍPUS útvonalait kérdezi, a prototípus alakjában
// várja a választ:
//
//   · `pakli` / `pakli?entitasId=…&entitasTipus=…` → `{ kivalasztottEntitas, pakli, testverek }` (a fa-szelet)
//   · `pakli/rendezett?mod=…&irany=…[&agazatId=…]`  → `{ rendezettLista }` (a lapos nézet)
//
// A program a saját szótárát beszéli (`/api/pakli/hierarchikus?entitas=…`, `/api/pakli?rendezes=…`). ⭐ Ugyanaz az
// érv, mint a kártyáknál: a fordítás a lapon, EGY fájlban — itt. Az `apiHelper.js` (a prototípus teljes
// szerver-kapcsolata ezen az egy fájlon megy át) csak megkérdezi: „ez prototípus-útvonal? hova menjen, és mit kapjon
// vissza?”.
//
// ⚠️ Ami a fordításban NEM fér el, mert a `Pakli.js` nem tárolja (a `betoltes`, a `hianyzik`, a lapos lapozás
// kurzora), azt a válasz mellett egy jelzés viszi (`jel` → a `koino:pakliValasz` esemény), és a `koinoPakli.js` veszi
// át. Itt sem születik érték: minden mező átkerül vagy hiányzik.

/** A lapos nézet egy oldala (a program úgyis korlátoz — `MAX_DARAB`; a többit a „További kártyák” hozza). */
export const LAPOS_OLDAL = 50;

/**
 * A `/api/pakli/hierarchikus` válasza → a `Pakli.pakliLekerese` alakja.
 * @param {Object} h - a koino válasza (`pakliHierarchia` + `betoltes`)
 * @returns {{kivalasztottEntitas: Object|null, pakli: Array<Object>, testverek: Array<Object>}}
 */
export function hierarchiaAdatta(h) {
  const pakli = oldalAdatta(h?.pakli);
  const kivalasztott = h?.kivalasztott ?? null;
  const elem = kivalasztott ? pakli.find((p) => p.entitasId === kivalasztott) : null;
  return {
    kivalasztottEntitas: elem ? { entitasId: elem.entitasId, entitasTipus: elem.entitasTipus } : null,
    pakli,
    testverek: oldalAdatta(h?.testverek)
  };
}

/**
 * A `/api/pakli` (lapos, rendezett oldal) válasza → a `Pakli.rendezettLekerese` alakja.
 * @param {Object} oldal
 * @returns {{rendezettLista: Array<Object>}}
 */
export function rendezettAdatta(oldal) {
  return { rendezettLista: oldalAdatta(oldal?.kartyak) };
}

/**
 * ⭐ Prototípus-útvonal-e — és ha igen, hova menjen, és mit kapjon vissza a hívó.
 *
 * @param {string} utvonal - ahogy a `Pakli.js` kéri (az `/api/` nélkül)
 * @returns {{utvonal: string, fordit: Function, jel: Function, horgonyt: boolean}|null} null: nem az (megy változatlanul)
 */
export function prototipusUtvonala(utvonal) {
  const [ut, kerdes = ''] = String(utvonal).split('?');
  const k = new URLSearchParams(kerdes);

  // ----- A fa-szelet: `pakli` (a legerősebb gyökértől) vagy `pakli?entitasId=…` -----
  // ⚠️ A program saját lapos útja (`pakli?rendezes=…`) NEM ez — azt a `koinoPakli.js` lapozása hívja.
  if (ut === 'pakli' && !k.has('rendezes')) {
    const kert = k.get('entitasId') || null;
    return {
      utvonal: 'pakli/hierarchikus' + (kert ? '?entitas=' + encodeURIComponent(kert) : ''),
      fordit: hierarchiaAdatta,
      // A `betoltes` és a `hianyzik` a lapé (újrakérdez, kiírja) — a `Pakli.js` nem tárolná.
      jel: (v) => ({ fajta: 'hierarchia', kert, kivalasztott: v?.kivalasztott ?? null, betoltes: v?.betoltes === true,
        kitolKerni: v?.kitolKerni ?? 0, hianyzik: v?.hianyzik ?? [], pakli: (v?.pakli ?? []).length, testverek: (v?.testverek ?? []).length }),
      horgonyt: true
    };
  }

  // ----- A lapos nézet: `pakli/rendezett?mod=…&irany=…` → a program első oldala -----
  // ⏸️ Az `agazatId` (a kártya menüjének „ág-szűrt rendezése”) a programban még nincs: a `RendezesModal` helyőrző
  // (5.8), tehát ma nem is érkezik. Ha egyszer jön, a `pakliOldal`-nak kell részfa-szűrő — itt nem találunk ki listát.
  if (ut === 'pakli/rendezett') {
    const q = new URLSearchParams({
      rendezes: k.get('mod') || 'ido',
      irany: k.get('irany') || 'csokkeno',
      darab: String(LAPOS_OLDAL)
    });
    return {
      utvonal: 'pakli?' + q.toString(),
      fordit: rendezettAdatta,
      jel: (v) => ({ fajta: 'lapos', kovetkezoKurzor: v?.kovetkezoKurzor ?? null, osszes: v?.osszes ?? 0,
        darab: (v?.kartyak ?? []).length, rendezes: v?.rendezes, irany: v?.irany,
        ujdonsag: v?.ujdonsag === true, ujEsemenyek: v?.ujEsemenyek ?? 0 }),
      horgonyt: true
    };
  }
  return null;
}
