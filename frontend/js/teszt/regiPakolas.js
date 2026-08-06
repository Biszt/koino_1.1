// frontend/js/teszt/regiPakolas.js

// ===== A koino_1.0 HÁROMSZÖGELÉSE — HŰ MÁSOLAT, LÉPÉSENKÉNTI NAPLÓVAL =====
//
// Felelősség: a régi (koino_1.0) kör-pakolás pontos újrajátszása úgy, hogy KÖZBEN
// MINDEN RÉSZSZÁMÍTÁST rögzít — így lépésről lépésre meg lehet nézni, hogyan dől
// el egy síkidom helye.
//
// Forrás: C:/koino_1.0/public/js/ContentPositioner.js
//   - findTwoClosestShapes()      (213. sor)
//   - positionByTriangulation()   (251. sor)
//   - findCircleIntersections()
//
// A LÉNYEGE, ÉS AMIBEN A MOSTANITÓL KÜLÖNBÖZIK:
//   - Az első kör a KÖZÉPPONTBA kerül — NINCS üres mag.
//   - Minden új kört PONTOSAN KÉT körhöz illeszt: az UTOLJÁRA lerakotthoz
//     („horgony"), és a hozzá LEGKÖZELEBBIHEZ („partner").
//   - A két metszéspont közül az elsőt választja, majd EGY korrekciót fut: ha a
//     javasolt helyhez mégis más kör a legközelebbi, azzal újraszámol.
//   - NINCS ütközés-ellenőrzés. Ezért keletkezhetnek átfedések.
//   - Ha nincs metszéspont, VÉLETLEN szöggel tesz le (Math.random).
//
// SZÁNDÉKOSAN nincs DOM-függése. Csak a homokozó használja
// (regiPakolasTesztOldal.js), az éles nézet NEM.

// ===== KÉT KÖR METSZÉSPONTJAI =====
// k1 közepű r1 sugarú és k2 közepű r2 sugarú kör metszéspontjai.
// A részeredményeket is visszaadjuk, hogy a naplóban látszódjon a levezetés.
//
// A számítás: a két középpontot összekötő egyenesen `a` távolságra van a
// metszésvonal, onnan merőlegesen ±h a két metszéspont.
//     a = (r1² − r2² + d²) / (2d)
//     h = √(r1² − a²)
function metszespontok(k1, k2, r1, r2) {
  const dx = k2.x - k1.x;
  const dy = k2.y - k1.y;
  const d = Math.hypot(dx, dy);

  if (d > r1 + r2)           return { pontok: null, ok: 'a két segédkör túl távol van', d };
  if (d < Math.abs(r1 - r2)) return { pontok: null, ok: 'az egyik segédkör a másik belsejében van', d };
  if (d === 0)               return { pontok: null, ok: 'egybeeső középpontok', d };

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const magassagNegyzet = r1 * r1 - a * a;
  if (magassagNegyzet < 0)   return { pontok: null, ok: 'negatív gyök alatti érték', d, a };

  const h = Math.sqrt(magassagNegyzet);
  const kozep = { x: k1.x + (a * dx) / d, y: k1.y + (a * dy) / d };

  return {
    pontok: [
      { x: kozep.x + (h * dy) / d, y: kozep.y - (h * dx) / d },
      { x: kozep.x - (h * dy) / d, y: kozep.y + (h * dx) / d }
    ],
    d, a, h, kozep, ok: null
  };
}

const tavolsag = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ===== A RÁHAGYÁS =====
// A koino_1.0-ban a horgony felőli segédkör sugarához hozzáadódott 0,001:
//     const r1 = shape1.radius + currentRadius + 0.001;
// Csaba szerint ez SZIMMETRIA-TÖRÉS volt: egyenlő értékeknél egy logikai döntés
// bizonytalanná vált, és ez oldotta fel. Nem numerikus biztosíték.
//
// Nálunk a sugarak a SZÜLŐ sugarához vannak normálva (0,002–0,05 körül), tehát
// ugyanaz a 0,001 a sugár ~14%-a lenne: a lerakott kör láthatóan NEM érintené a
// horgonyt. Ezért 0-ra állítottuk — így az új kör MINDKÉT körét érinti.
//
// (A szimmetria-törést a mostani éles pakoló nem eltolással oldja meg, hanem
// szigorú rendezéssel: középtávolság → szög → azonosító.)
const RAHAGYAS = 0;

// ===== A KÉT „LEGKÖZELEBBI" ALAKZAT =====
// A koino_1.0 findTwoClosestShapes-e. Figyelem: NEM a két egymáshoz legközelebbit
// adja, hanem az UTOLJÁRA LERAKOTTAT („horgony") és a hozzá legközelebbit
// („partner").
//
// @returns {Object} { horgony, partner, rangsor } — a rangsor a naplóhoz kell
function ketLegkozelebbi(lerakottak) {
  if (lerakottak.length < 2) return { horgony: lerakottak[0], partner: null, rangsor: [] };

  const horgony = lerakottak[lerakottak.length - 1];

  const rangsor = lerakottak.slice(0, -1).map((kor, index) => ({
    kor,
    tav: tavolsag(kor.hely, horgony.hely),
    index
  }));

  // Döntetlennél a korábbi sorszám nyer (a koino_1.0 így csinálta)
  rangsor.sort((a, b) =>
    Math.abs(a.tav - b.tav) > 0.0001 ? a.tav - b.tav : a.index - b.index
  );

  return { horgony, partner: rangsor[0].kor, rangsor };
}

// A lerakott kör „pillanatképe" a naplóhoz
const pillanatkep = (k) => k
  ? { id: k.id, sugar: k.sugar, x: k.hely.x, y: k.hely.y }
  : null;

// ===== A PAKOLÁS, LÉPÉSENKÉNTI NAPLÓVAL =====
/**
* @param {Array} elemek - [{ id, sugar }]
* @returns {Object} { helyek, lepesek, veletlenDarab }
*   helyek:  [{ id, sugar, x, y }] — a végállapot
*   lepesek: minden lerakás teljes levezetése (lásd alább a mezőket)
*/
export function regiPakolasLepesekkel(elemek) {
  console.log('regiPakolasLepesekkel - KEZDÉS', { elemDarab: elemek?.length ?? 0 });

  if (!elemek || elemek.length === 0) {
    console.log('regiPakolasLepesekkel - VÉGE (nincs elem)');
    return { helyek: [], lepesek: [], veletlenDarab: 0 };
  }

  // A koino_1.0 NÖVEKVŐ sugár szerint rendez — a legkisebb megy középre
  const rendezett = [...elemek].sort((a, b) => a.sugar - b.sugar);

  const lerakottak = [];
  const lepesek = [];
  let veletlenDarab = 0;

  // Egy lépés lezárása: rögzítjük a végleges helyet és az ütközéseket
  const lepesLezarasa = (lepes, elem, hely) => {
    // Kivel ütközik ez a kör a lerakás pillanatában?
    lepes.utkozesek = [];
    for (const l of lerakottak) {
      const d = tavolsag(hely, l.hely);
      const kellene = l.sugar + elem.sugar;
      if (kellene - d > 1e-9) {
        const kisebbAtmero = 2 * Math.min(l.sugar, elem.sugar);
        lepes.utkozesek.push({
          id: l.id,
          hiany: kellene - d,
          melyseg: (kellene - d) / kisebbAtmero
        });
      }
    }
    lepes.utkozesek.sort((a, b) => b.melyseg - a.melyseg);
    lepes.hely = { x: hely.x, y: hely.y };

    lerakottak.push({ id: elem.id, sugar: elem.sugar, hely });
    lepesek.push(lepes);
  };

  for (let i = 0; i < rendezett.length; i++) {
    const elem = rendezett[i];
    const lepes = {
      sorszam: i + 1,
      id: elem.id,
      sugar: elem.sugar,
      tipus: null,
      utkozesek: []
    };

    // ----- 1. KÖR: a középpontba, mag nélkül -----
    if (i === 0) {
      lepes.tipus = 'kozeppont';
      lepes.magyarazat = 'Az első (legkisebb) kör a középpontba kerül. A koino_1.0 nem hagy üres magot.';
      lepesLezarasa(lepes, elem, { x: 0, y: 0 });
      continue;
    }

    // ----- 2. KÖR: az elsőtől jobbra, érintőlegesen -----
    if (i === 1) {
      const elso = lerakottak[0];
      lepes.tipus = 'masodik';
      lepes.horgony = pillanatkep(elso);
      lepes.tavolsagKeplet = {
        sugar1: elso.sugar,
        sugar2: elem.sugar,
        rahagyas: RAHAGYAS,
        eredmeny: elso.sugar + elem.sugar + RAHAGYAS
      };
      lepes.magyarazat = 'A második kör pontosan az első mellé, jobbra. A távolság a két sugár összege.';
      lepesLezarasa(lepes, elem, { x: elso.sugar + elem.sugar + RAHAGYAS, y: 0 });
      continue;
    }

    // ----- 3. KÖRTŐL: HÁROMSZÖGELÉS -----
    const { horgony, partner, rangsor } = ketLegkozelebbi(lerakottak);

    lepes.horgony = pillanatkep(horgony);
    lepes.partner = pillanatkep(partner);
    lepes.rangsor = rangsor.slice(0, 4).map(r => ({ id: r.kor.id, tav: r.tav }));

    if (!partner) {
      const szog = Math.random() * Math.PI * 2;
      const tav = horgony.sugar + elem.sugar;
      lepes.tipus = 'veletlen';
      lepes.magyarazat = 'Nincs partner-kör — a koino_1.0 ilyenkor VÉLETLEN szöget sorsol.';
      lepes.veletlenSzog = szog;
      veletlenDarab++;
      lepesLezarasa(lepes, elem, {
        x: horgony.hely.x + Math.cos(szog) * tav,
        y: horgony.hely.y + Math.sin(szog) * tav
      });
      continue;
    }

    // A két segédkör sugara. RÁHAGYÁS NÉLKÜL: az új kör mindkettőt érinti.
    const r1 = horgony.sugar + elem.sugar + RAHAGYAS;
    const r2 = partner.sugar + elem.sugar;
    lepes.segedkorok = { r1, r2, rahagyas: RAHAGYAS };

    const metszes = metszespontok(horgony.hely, partner.hely, r1, r2);
    lepes.metszes = {
      d: metszes.d,
      a: metszes.a ?? null,
      h: metszes.h ?? null,
      kozep: metszes.kozep ?? null,
      pontok: metszes.pontok,
      ok: metszes.ok
    };

    if (!metszes.pontok) {
      const szog = Math.random() * Math.PI * 2;
      const tav = horgony.sugar + elem.sugar;
      lepes.tipus = 'veletlen';
      lepes.magyarazat = `Nincs metszéspont (${metszes.ok}) — VÉLETLEN szög következik.`;
      lepes.veletlenSzog = szog;
      veletlenDarab++;
      lepesLezarasa(lepes, elem, {
        x: horgony.hely.x + Math.cos(szog) * tav,
        y: horgony.hely.y + Math.sin(szog) * tav
      });
      continue;
    }

    // A koino_1.0 MINDIG az első metszéspontot javasolja
    const javasolt = metszes.pontok[0];
    lepes.javasolt = javasolt;

    // KORREKCIÓ: tényleg a partner a legközelebbi a javasolt helyhez?
    let legkozelebbi = null;
    let legkisebb = Infinity;
    for (const l of lerakottak) {
      const d = tavolsag(javasolt, l.hely);
      if (d < legkisebb) { legkisebb = d; legkozelebbi = l; }
    }
    lepes.ellenorzes = { legkozelebbiId: legkozelebbi.id, tav: legkisebb };

    if (legkozelebbi === partner) {
      lepes.tipus = 'haromszogeles';
      lepes.magyarazat = 'A javasolt helyhez tényleg a partner a legközelebbi — nincs korrekció.';
      lepesLezarasa(lepes, elem, javasolt);
      continue;
    }

    // Újraszámolás azzal a körrel, ami valójában a legközelebbi
    const ujR2 = legkozelebbi.sugar + elem.sugar;
    const ujMetszes = metszespontok(horgony.hely, legkozelebbi.hely, r1, ujR2);

    lepes.korrekcio = {
      ujPartner: pillanatkep(legkozelebbi),
      ujR2,
      d: ujMetszes.d,
      a: ujMetszes.a ?? null,
      h: ujMetszes.h ?? null,
      pontok: ujMetszes.pontok,
      ok: ujMetszes.ok
    };

    if (!ujMetszes.pontok) {
      const szog = Math.random() * Math.PI * 2;
      const tav = horgony.sugar + elem.sugar;
      lepes.tipus = 'veletlen';
      lepes.magyarazat = `A korrekció sem adott metszéspontot (${ujMetszes.ok}) — VÉLETLEN szög.`;
      lepes.veletlenSzog = szog;
      veletlenDarab++;
      lepesLezarasa(lepes, elem, {
        x: horgony.hely.x + Math.cos(szog) * tav,
        y: horgony.hely.y + Math.sin(szog) * tav
      });
      continue;
    }

    // A két új metszéspont közül az, amelyik ÖSSZESSÉGÉBEN messzebb van a
    // többiektől (a koino_1.0 így „lökte kifelé" a kört)
    let osszeg1 = 0;
    let osszeg2 = 0;
    for (const l of lerakottak) {
      if (l === horgony || l === legkozelebbi) continue;
      osszeg1 += tavolsag(l.hely, ujMetszes.pontok[0]);
      osszeg2 += tavolsag(l.hely, ujMetszes.pontok[1]);
    }
    const masodikatValaszt = lerakottak.length > 2 && osszeg2 > osszeg1;

    lepes.korrekcio.osszeg1 = osszeg1;
    lepes.korrekcio.osszeg2 = osszeg2;
    lepes.korrekcio.valasztott = masodikatValaszt ? 2 : 1;
    lepes.tipus = 'korrekcio';
    lepes.magyarazat =
      `A javasolt helyhez nem a partner, hanem ${legkozelebbi.id} a legközelebbi — ` +
      'újraszámolás vele, majd a két metszéspont közül a többiektől ÖSSZESSÉGÉBEN távolabbi nyer.';

    lepesLezarasa(lepes, elem, masodikatValaszt ? ujMetszes.pontok[1] : ujMetszes.pontok[0]);
  }

  const helyek = lerakottak.map(l => ({ id: l.id, sugar: l.sugar, x: l.hely.x, y: l.hely.y }));

  console.log('regiPakolasLepesekkel - VÉGE', { lerakott: helyek.length, veletlenDarab });
  return { helyek, lepesek, veletlenDarab };
}

// Napló nélküli változat (méréshez, ha csak a végeredmény kell)
export function regiPakolas(elemek) {
  const { helyek, veletlenDarab } = regiPakolasLepesekkel(elemek);
  return { helyek, veletlenDarab };
}

// ===== ÁTFEDÉSEK MEGKERESÉSE =====
// A homokozó ezzel színezi pirosra, ami egymásba lóg.
//
// A „mélységet" a KISEBBIK KÖR ÁTMÉRŐJÉHEZ mérjük: 100% azt jelenti, hogy a
// kisebbik kör teljesen eltűnt a nagyobbikban.
export function atfedesek(helyek) {
  const parok = [];
  const erintettIdk = new Set();

  for (let i = 0; i < helyek.length; i++) {
    for (let j = i + 1; j < helyek.length; j++) {
      const a = helyek[i];
      const b = helyek[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const kellene = a.sugar + b.sugar;
      const belelogas = kellene - d;

      if (belelogas > 1e-9) {
        const kisebbAtmero = 2 * Math.min(a.sugar, b.sugar);
        parok.push({ a: a.id, b: b.id, melyseg: belelogas / kisebbAtmero });
        erintettIdk.add(a.id);
        erintettIdk.add(b.id);
      }
    }
  }

  parok.sort((x, y) => y.melyseg - x.melyseg);
  return { parok, erintettIdk };
}

export default { regiPakolasLepesekkel, regiPakolas, atfedesek };
