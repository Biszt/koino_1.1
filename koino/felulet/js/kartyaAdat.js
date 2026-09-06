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
// Használják: `pakliNezet.js`.

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

    adatok: {
      cim: k.cim ?? '',

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
