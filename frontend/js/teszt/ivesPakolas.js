// frontend/js/teszt/ivesPakolas.js

// ===== ÍVES PAKOLÁS — a szabad ívek kiszámítása =====
//
// Felelősség: ugyanaz a feladat, mint a koino_1.0 háromszögelésénél (tegyük le az
// új kört a legutóbbi mellé), de MINTAVÉTELEZÉS HELYETT PONTOS SZÁMÍTÁSSAL.
//
// A GONDOLAT
// Ha az új kör (sugara r) érinti a horgonyt (sugara r_H), akkor a KÖZÉPPONTJA egy
// körön van: a horgony körül, r₁ = r_H + r sugárral. Ez végtelen sok lehetséges
// hely — a koino_1.0 ebből négyet mintavételezett, és egyet ellenőrzött.
//
// Ehelyett kiszámoljuk, hogy ezen a körön MELY SZÖGEK TILTOTTAK. Egy már lerakott
// C kör (a horgonytól D távolságra, φ irányban, r_C sugárral) akkor zavar, ha
//
//     |X(θ) − C|² = r₁² + D² − 2·r₁·D·cos(θ − φ)  <  (r + r_C)²
//
// amiből átrendezve
//
//     cos(θ − φ)  >  (r₁² + D² − (r + r_C)²) / (2·r₁·D)  =:  hatar
//
// Vagyis C egy φ KÖRÜLI, SZIMMETRIKUS szög-intervallumot tilt le, félszélessége
// arccos(hatar). (hatar ≥ 1 → C nem zavar; hatar ≤ −1 → az egész kör tiltott.)
//
// A tiltott intervallumokat összefésüljük; ami marad, az a SZABAD ÍVEK halmaza.
//
// AMIÉRT EZ TÖBB, MINT GYORSÍTÁS:
// a szabad ívek VÉGPONTJAI pontosan azok a helyek, ahol az új kör egy MÁSODIK
// kört is érint — vagyis ugyanaz a háromszögelés jön ki, amit a koino_1.0
// keresett, csak hiánytalanul. Ezért nem kell partner-választás, korrekciós ág,
// Σ-távolság heurisztika és véletlen tartalék sem; az ütközés-ellenőrzés pedig
// nem külön lépés, hanem MAGA a tiltott ívek számítása.
//
// SZÁNDÉKOSAN nincs DOM-függése. Csak a homokozó használja.

// ===== ÁLLANDÓK =====

// Relatív tűrés: az érintés (távolság PONTOSAN a sugarak összege) nem ütközés,
// csak a lebegőpontos zaj. Szándékosan RELATÍV, nem abszolút: a nézet korlátlanul
// nagyítható, tehát egy fix érték néhány szinttel lejjebb mindent „döntetlennek"
// mutatna (a koino_1.0 fix 0,0001-es tűrése ebbe futott bele).
const TURES = 1e-9;

// Ennyi szomszédot sorolunk fel a naplóban
const NAPLO_HATAR = 6;

const tavolsag = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Szög [0, 2π) tartományba
const normal = (szog) => {
  const ketPi = Math.PI * 2;
  return ((szog % ketPi) + ketPi) % ketPi;
};

const fok = (szog) => (normal(szog) * 180) / Math.PI;

// ===== EGY KÖR ÁLTAL TILTOTT SZÖG-INTERVALLUM =====
// @returns {Object|null} { tol, ig, kozep, felSzelesseg } vagy null, ha nem zavar.
//   `teljes: true`, ha az egész kör tiltott.
function tiltottIv(horgony, akadaly, r1, r) {
  const dx = akadaly.x - horgony.x;
  const dy = akadaly.y - horgony.y;
  const D = Math.hypot(dx, dy);
  if (D < 1e-12) return { teljes: true };

  const kellene = r + akadaly.sugar;
  const hatar = (r1 * r1 + D * D - kellene * kellene) / (2 * r1 * D);

  if (hatar >= 1 - TURES) return null;              // túl távol: nem zavar
  if (hatar <= -1 + TURES) return { teljes: true };  // mindenhol zavar

  const felSzelesseg = Math.acos(hatar);
  const kozep = Math.atan2(dy, dx);

  return {
    kozep: normal(kozep),
    felSzelesseg,
    tol: normal(kozep - felSzelesseg),
    ig: normal(kozep + felSzelesseg),
    D,
    akadalyId: akadaly.id
  };
}

// ===== TILTOTT INTERVALLUMOK ÖSSZEFÉSÜLÉSE (körön) =====
// A [0, 2π) körön dolgozunk, ezért a 0-t átlépő intervallumokat kettévágjuk.
// @returns {Array} rendezett, nem átfedő [tol, ig] párok
function osszefesules(ivek) {
  const daraboltak = [];
  for (const iv of ivek) {
    if (iv.tol <= iv.ig) {
      daraboltak.push([iv.tol, iv.ig]);
    } else {
      daraboltak.push([iv.tol, Math.PI * 2]);
      daraboltak.push([0, iv.ig]);
    }
  }

  daraboltak.sort((a, b) => a[0] - b[0]);

  const eredmeny = [];
  for (const [tol, ig] of daraboltak) {
    const utolso = eredmeny[eredmeny.length - 1];
    if (utolso && tol <= utolso[1] + TURES) {
      utolso[1] = Math.max(utolso[1], ig);
    } else {
      eredmeny.push([tol, ig]);
    }
  }
  return eredmeny;
}

// ===== A SZABAD ÍVEK =====
// A tiltott intervallumok komplementere a [0, 2π) körön.
function szabadIvek(tiltottak) {
  if (tiltottak.length === 0) return [[0, Math.PI * 2]];

  const szabadok = [];
  let hol = 0;

  for (const [tol, ig] of tiltottak) {
    if (tol > hol + TURES) szabadok.push([hol, tol]);
    hol = Math.max(hol, ig);
  }
  if (hol < Math.PI * 2 - TURES) szabadok.push([hol, Math.PI * 2]);

  // A 0-nál összeérő két végdarab valójában EGY ív — de jelöltként úgyis a
  // végpontok számítanak, ezért nem fésüljük össze őket.
  return szabadok;
}

// ===== EGY KÖR LERAKÁSA EGY HORGONY MELLÉ =====
// @returns {Object|null} a napló-részlet a döntéssel, vagy null, ha nincs szabad ív
function horgonyMelle(horgony, r, lerakottak) {
  const r1 = horgony.sugar + r;

  // 1. Kik tilthatnak egyáltalán? Csak akik elég közel vannak.
  const tiltoIvek = [];
  let mindenTiltott = false;

  for (const l of lerakottak) {
    if (l === horgony) continue;
    const iv = tiltottIv(horgony, l, r1, r);
    if (!iv) continue;
    if (iv.teljes) { mindenTiltott = true; break; }
    tiltoIvek.push(iv);
  }

  if (mindenTiltott) return { r1, tiltoIvek, tiltottak: [], szabadok: [], jeloltek: [], valasztott: null };

  const tiltottak = osszefesules(tiltoIvek);
  const szabadok = szabadIvek(tiltottak);

  // 2. A jelöltek a szabad ívek VÉGPONTJAI — ott érint az új kör egy második kört is.
  //    (Ha az egész kör szabad, a középpont felé mutató irányt vesszük: így marad
  //    tömör a kép.)
  const jeloltek = [];
  const teljesenSzabad = tiltottak.length === 0;

  if (teljesenSzabad) {
    const befele = Math.atan2(-horgony.y, -horgony.x);
    jeloltek.push({ szog: normal(befele), honnan: 'szabad kör, befelé' });
  } else {
    for (const [tol, ig] of szabadok) {
      jeloltek.push({ szog: tol, honnan: 'ív kezdete' });
      jeloltek.push({ szog: ig, honnan: 'ív vége' });
    }
  }

  // 3. A KÖZÉPPONTHOZ LEGKÖZELEBBI nyer (tömör kép); döntetlennél a kisebb szög.
  let valasztott = null;
  for (const j of jeloltek) {
    const x = horgony.x + Math.cos(j.szog) * r1;
    const y = horgony.y + Math.sin(j.szog) * r1;
    const kozeptavolsag = Math.hypot(x, y);

    if (!valasztott ||
        kozeptavolsag < valasztott.kozeptavolsag - 1e-12 ||
        (Math.abs(kozeptavolsag - valasztott.kozeptavolsag) <= 1e-12 && j.szog < valasztott.szog)) {
      valasztott = { ...j, x, y, kozeptavolsag };
    }
  }

  return { r1, tiltoIvek, tiltottak, szabadok, jeloltek, valasztott };
}

// ===== A PAKOLÁS, LÉPÉSENKÉNTI NAPLÓVAL =====
/**
* @param {Array} elemek - [{ id, sugar }]
* @returns {Object} { helyek, lepesek, potHorgonyok }
*   potHorgonyok: hányszor kellett a horgony helyett másik körhöz illeszteni
*/
export function ivesPakolasLepesekkel(elemek) {
  console.log('ivesPakolasLepesekkel - KEZDÉS', { elemDarab: elemek?.length ?? 0 });

  if (!elemek || elemek.length === 0) {
    console.log('ivesPakolasLepesekkel - VÉGE (nincs elem)');
    return { helyek: [], lepesek: [], potHorgonyok: 0 };
  }

  // NÖVEKVŐ sugár szerint, holtversenynél az AZONOSÍTÓ dönt.
  // Nincs epszilon: az abszolút tűrés nem tranzitív (a≈b, b≈c, de a<c), és a
  // rendezés attól motorfüggővé válhat.
  const rendezett = [...elemek].sort((a, b) =>
    (a.sugar - b.sugar) || String(a.id).localeCompare(String(b.id))
  );

  const lerakottak = [];
  const lepesek = [];
  let potHorgonyok = 0;

  for (let i = 0; i < rendezett.length; i++) {
    const elem = rendezett[i];
    const lepes = {
      modszer: 'ives',
      sorszam: i + 1,
      id: elem.id,
      sugar: elem.sugar,
      utkozesek: []
    };

    // ----- 1. KÖR: a középpontba -----
    if (i === 0) {
      lepes.tipus = 'kozeppont';
      lepes.magyarazat = 'Az első (legkisebb) kör a középpontba kerül.';
      lepes.hely = { x: 0, y: 0 };
      lerakottak.push({ id: elem.id, sugar: elem.sugar, x: 0, y: 0 });
      lepesek.push(lepes);
      continue;
    }

    // ----- 2. KÖRTŐL: SZABAD ÍVEK -----
    // Elsőként az utoljára lerakott kör a horgony (ez a koino_1.0 gondolata).
    // Ha körülötte nincs szabad ív, sorra vesszük a többit — a középponthoz
    // legközelebbivel kezdve, hogy tömör maradjon a kép.
    const horgonySorrend = [lerakottak[lerakottak.length - 1]];
    for (const l of [...lerakottak].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))) {
      if (l !== horgonySorrend[0]) horgonySorrend.push(l);
    }

    let eredmeny = null;
    let horgony = null;
    let hanyadikHorgony = 0;

    for (const jelolt of horgonySorrend) {
      hanyadikHorgony++;
      const proba = horgonyMelle(jelolt, elem.sugar, lerakottak);
      if (proba.valasztott) { eredmeny = proba; horgony = jelolt; break; }
    }

    if (!eredmeny) {
      // Elvileg nem fordulhat elő: a legkülső körnek mindig van szabad oldala.
      lepes.tipus = 'nincsHely';
      lepes.magyarazat = 'Egyetlen kör körül sincs szabad ív — ilyet nem várunk.';
      lepes.hely = null;
      lepesek.push(lepes);
      continue;
    }

    if (hanyadikHorgony > 1) potHorgonyok++;

    lepes.tipus = hanyadikHorgony === 1 ? 'ives' : 'potHorgony';
    lepes.hanyadikHorgony = hanyadikHorgony;
    lepes.horgony = { id: horgony.id, x: horgony.x, y: horgony.y, sugar: horgony.sugar };
    lepes.r1 = eredmeny.r1;

    // A naplóhoz: a legszélesebb tiltó ívek
    lepes.tiltoIvek = [...eredmeny.tiltoIvek]
      .sort((a, b) => b.felSzelesseg - a.felSzelesseg)
      .slice(0, NAPLO_HATAR)
      .map(iv => ({
        id: iv.akadalyId,
        D: iv.D,
        kozepFok: fok(iv.kozep),
        felSzelessegFok: (iv.felSzelesseg * 180) / Math.PI,
        tolFok: fok(iv.tol),
        igFok: fok(iv.ig)
      }));
    lepes.tiltoDarab = eredmeny.tiltoIvek.length;
    lepes.osszefesultDarab = eredmeny.tiltottak.length;

    lepes.szabadIvek = eredmeny.szabadok.map(([t, i2]) => ({
      tolFok: fok(t),
      igFok: fok(i2),
      szelessegFok: ((i2 - t) * 180) / Math.PI
    }));

    lepes.jeloltek = eredmeny.jeloltek.map(j => {
      const x = horgony.x + Math.cos(j.szog) * eredmeny.r1;
      const y = horgony.y + Math.sin(j.szog) * eredmeny.r1;
      return { szogFok: fok(j.szog), honnan: j.honnan, x, y, kozeptavolsag: Math.hypot(x, y) };
    }).sort((a, b) => a.kozeptavolsag - b.kozeptavolsag);

    lepes.valasztott = {
      szogFok: fok(eredmeny.valasztott.szog),
      honnan: eredmeny.valasztott.honnan,
      kozeptavolsag: eredmeny.valasztott.kozeptavolsag
    };

    lepes.magyarazat = hanyadikHorgony === 1
      ? 'A horgony körüli körön kiszámoltuk a tiltott szög-tartományokat; a szabad ívek végpontjai közül a középponthoz legközelebbi nyert.'
      : `A horgony körül nem maradt szabad ív, ezért a ${hanyadikHorgony}. jelölt körhöz illesztettünk.`;

    const hely = { x: eredmeny.valasztott.x, y: eredmeny.valasztott.y };
    lepes.hely = hely;

    // Ellenőrzés: ütközik-e bárkivel? (Ha a számítás helyes, sosem.)
    for (const l of lerakottak) {
      const d = tavolsag(hely, l);
      const kellene = l.sugar + elem.sugar;
      if (kellene - d > 1e-9) {
        const kisebbAtmero = 2 * Math.min(l.sugar, elem.sugar);
        lepes.utkozesek.push({ id: l.id, hiany: kellene - d, melyseg: (kellene - d) / kisebbAtmero });
      }
    }
    lepes.utkozesek.sort((a, b) => b.melyseg - a.melyseg);

    lerakottak.push({ id: elem.id, sugar: elem.sugar, x: hely.x, y: hely.y });
    lepesek.push(lepes);
  }

  const helyek = lerakottak.map(l => ({ id: l.id, sugar: l.sugar, x: l.x, y: l.y }));

  console.log('ivesPakolasLepesekkel - VÉGE', { lerakott: helyek.length, potHorgonyok });
  return { helyek, lepesek, potHorgonyok };
}

export default { ivesPakolasLepesekkel };
