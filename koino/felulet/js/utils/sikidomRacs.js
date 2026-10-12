// frontend/js/utils/sikidomRacs.js

// ===== TÉRBELI RÁCS A KÖR-PAKOLÁSHOZ =====
//
// Felelősség: megmondani, hogy egy pont körül MELY körök lehetnek egyáltalán
// érdekesek — anélkül, hogy az összeset végigolvasnánk.
//
// MIÉRT KELL
// A pakoló minden egyes lerakásnál kiszámolja, mely szögek tiltottak a horgony
// körül (lásd `sikidomPakolas.js`). Ehhez a szomszédokat kell ismerni — de eddig
// az ÖSSZES már lerakott kört végigolvasta, tehát n kör lerakása n² munkát adott.
// Pedig egy kör csak akkor tilthat, ha elég KÖZEL van; a távoliakra a `tiltottIv`
// úgyis null-t ad, csak épp előbb kiszámolja hozzá a gyököt és az arkusz-koszinuszt.
//
// A RÁCS ÖTLETE
// Osszuk fel a síkot egyforma cellákra. Minden kör bekerül abba a néhány cellába,
// amit lefed. Ha egy pont körül r sugarú környezetre vagyunk kíváncsiak, elég
// azokat a cellákat megnézni, amiket ez a környezet érint — a többiben lévő
// körökről MATEMATIKAILAG biztos, hogy túl messze vannak.
//
// A NEHÉZSÉG: A MÉRETEK NAGYON KÜLÖNBÖZŐK
// Egy rács akkor jó, ha a cella nagyjából akkora, mint a benne lévő körök. Nálunk
// viszont a méret a tudatponttal arányos, és a szomszédok között mért 59 049-szeres
// ugrás is előfordul. Egyetlen cellamérettel vagy a nagy körök lógnának ki száz
// cellába, vagy a kicsikből zsúfolódna ezer egyetlen cellába — mindkettő elrontaná
// a nyereséget.
//
// A MEGOLDÁS: MÉRET-OSZTÁLYONKÉNT KÜLÖN RÁCS. A kör a sugara alapján kap egy
// SZINTET (`k = ⌊log₂ sugár⌋`), és minden szintnek SAJÁT cellamérete van:
// `2^(k+2)`. Mivel ezen a szinten a sugár `2^k` és `2^(k+1)` közé esik, az ÁTMÉRŐ
// legfeljebb `2^(k+2)` — vagyis pontosan egy cella —, tehát egy kör legfeljebb
// 2×2 = 4 cellát érint. A szintek száma a méret-szórástól függ, de logaritmikus:
// az említett 59 049-szeres területugrás is mindössze 8 szint.
//
// BIZTONSÁGI FÉK. Ha egy szinten a bejárandó cellák száma nagyobb lenne, mint
// ahány kör egyáltalán van azon a szinten, akkor a rács csak üres cellákat
// olvasgatna. Ilyenkor egyszerűen végigmegyünk a szint listáján. Ettől a lekérdezés
// SOHA nem lehet lassabb a régi, mindent végigolvasó megoldásnál.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető
// (backend/tools/sikidomPakolasProba.mjs, backend/tools/sikidomRacsProba.mjs).
// Használja: `sikidomPakolas.js`.

// ===== ÁLLANDÓK =====

// A legkisebb kezelhető sugár. Nulla vagy negatív sugárnál a logaritmus nem
// értelmezhető, ezért ilyenkor a legalsó szintre tesszük a kört. (Nulla sugarú kör
// elvben előfordulhat — egy pont is tilthat szöget —, ezért nem dobjuk el.)
const LEGKISEBB_SUGAR = 1e-12;

// ===== EGY KÖR SZINTJE ÉS CELLA-MÉRETE =====
// A szint a sugár kettes alapú logaritmusa lefelé kerekítve; a cellaméret ennek
// négyszerese, hogy a legnagyobb ide tartozó ÁTMÉRŐ is beleférjen.
function szintSzama(sugar) {
  const biztos = Number.isFinite(sugar) && sugar > LEGKISEBB_SUGAR ? sugar : LEGKISEBB_SUGAR;
  return Math.floor(Math.log2(biztos));
}

function cellaKulcs(i, j) {
  return i + ',' + j;
}

// ===== A RÁCS =====
export class SikidomRacs {
  constructor() {
    // szint száma → { cellaMeret, cellak: Map<kulcs, rekord[]>, rekordok: rekord[], maxSugar }
    // A rekord: { kor, belyeg } — a `kor` az EREDETI objektum (nem másolat), hogy
    // a hívó az azonosság-vizsgálatot (`a === horgony`) továbbra is használhassa.
    this._szintek = new Map();

    // Bejárás-bélyeg: egy lekérdezésen belül ezzel jelöljük a már összeszedett
    // köröket, így a több cellába belógó kör csak EGYSZER kerül a találatok közé.
    // (Így nem kell minden lekérdezéshez új halmazt létrehozni.)
    this._belyeg = 0;

    this._darab = 0;

    // Mérőszámok — a rács munkájának ellenőrzéséhez. Szándékosan csak olcsó,
    // lekérdezésenkénti/szintenkénti számlálók (a cellák belsejében nem mérünk,
    // az magát a mérendő ciklust lassítaná).
    this.statisztika = { lekerdezes: 0, talalat: 0, fek: 0 };
  }

  // Hány kör van a rácsban?
  get darab() {
    return this._darab;
  }

  // ===== EGY KÖR FELVÉTELE =====
  // A kör bekerül a saját méret-szintjének minden olyan cellájába, amit a
  // befoglaló négyzete érint (legfeljebb 4).
  hozzaad(kor) {
    const k = szintSzama(kor.sugar);

    let szint = this._szintek.get(k);
    if (!szint) {
      szint = { cellaMeret: Math.pow(2, k + 2), cellak: new Map(), rekordok: [], maxSugar: 0 };
      this._szintek.set(k, szint);
    }

    const rekord = { kor, belyeg: 0 };
    szint.rekordok.push(rekord);
    szint.maxSugar = Math.max(szint.maxSugar, kor.sugar);

    const c = szint.cellaMeret;
    const i0 = Math.floor((kor.x - kor.sugar) / c);
    const i1 = Math.floor((kor.x + kor.sugar) / c);
    const j0 = Math.floor((kor.y - kor.sugar) / c);
    const j1 = Math.floor((kor.y + kor.sugar) / c);

    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const kulcs = cellaKulcs(i, j);
        const lista = szint.cellak.get(kulcs);
        if (lista) lista.push(rekord);
        else szint.cellak.set(kulcs, [rekord]);
      }
    }

    this._darab++;
  }

  // ===== A KÖZELI KÖRÖK =====
  /**
  * Minden olyan kör, ami ELÉG KÖZEL van az (x, y) ponthoz ahhoz, hogy számítson.
  *
  * A feltétel: `távolság < hatoTav + a kör saját sugara`. Ezért a keresési sugár
  * szintenként más — a szinten előforduló LEGNAGYOBB sugárral bővítjük.
  *
  * A találatok közt lehet olyan is, ami a pontos számítás szerint mégsem zavar —
  * a rács csak a biztosan távoliakat zárja ki, a végső szót a hívó mondja ki
  * (`tiltottIv`). Ez így helyes: a rács SOSEM hagy ki olyan kört, ami számítana.
  *
  * @param {number} x
  * @param {number} y
  * @param {number} hatoTav - a hatótávolság a körök SAJÁT sugara NÉLKÜL
  * @returns {Array} a közeli körök (az eredeti objektumok)
  */
  kozeliek(x, y, hatoTav) {
    this._belyeg++;
    const belyeg = this._belyeg;
    const talalatok = [];
    this.statisztika.lekerdezes++;

    for (const szint of this._szintek.values()) {
      // A keresési sugár: a hatótáv + a szint legnagyobb sugara
      const S = hatoTav + szint.maxSugar;
      const c = szint.cellaMeret;

      const i0 = Math.floor((x - S) / c);
      const i1 = Math.floor((x + S) / c);
      const j0 = Math.floor((y - S) / c);
      const j1 = Math.floor((y + S) / c);

      // BIZTONSÁGI FÉK: ha több cellát néznénk végig, mint ahány kör van a
      // szinten, akkor a rács nem segít — menjünk végig a listán.
      const cellaDarab = (i1 - i0 + 1) * (j1 - j0 + 1);
      if (!Number.isFinite(cellaDarab) || cellaDarab >= szint.rekordok.length) {
        this.statisztika.fek++;
        for (const rekord of szint.rekordok) {
          rekord.belyeg = belyeg;
          talalatok.push(rekord.kor);
        }
        continue;
      }

      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const lista = szint.cellak.get(cellaKulcs(i, j));
          if (!lista) continue;
          for (const rekord of lista) {
            if (rekord.belyeg === belyeg) continue;   // másik cellájában már megvolt
            rekord.belyeg = belyeg;
            talalatok.push(rekord.kor);
          }
        }
      }
    }

    this.statisztika.talalat += talalatok.length;
    return talalatok;
  }
}

export default { SikidomRacs };
