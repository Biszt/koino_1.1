// frontend/js/utils/sikidomPakolas.js

// ===== SÍKIDOM-PAKOLÁS (szabad ívek számítása) =====
//
// Felelősség: egy szülőn belül elhelyezni a testvéreket úgy, hogy ne fedjék át
// egymást, és a kép tömör legyen.
//
// A MÓDSZER
// Az új kört a legutóbb lerakott kör („horgony") mellé tesszük. Ha érinti a
// horgonyt, akkor a KÖZÉPPONTJA egy körön van: a horgony körül, r₁ = r_H + r
// sugárral. Ez végtelen sok lehetséges hely — a kérdés csak az, melyik szabad.
//
// Kiszámoljuk, hogy ezen a körön MELY SZÖGEK TILTOTTAK. Egy már lerakott C kör
// (a horgonytól D távolságra, φ irányban, r_C sugárral) akkor zavar, ha
//
//     |X(θ) − C|² = r₁² + D² − 2·r₁·D·cos(θ − φ)  <  (r + r_C)²
//
// amiből
//
//     cos(θ − φ)  >  (r₁² + D² − (r + r_C)²) / (2·r₁·D)  =:  hatar
//
// vagyis C egy φ KÖRÜLI, SZIMMETRIKUS szög-intervallumot tilt le, félszélessége
// arccos(hatar). A tiltott intervallumokat összefésüljük; ami marad, az a SZABAD
// ÍVEK halmaza, és azok VÉGPONTJAI pontosan azok a helyek, ahol az új kör egy
// MÁSODIK kört is érint — vagyis a klasszikus háromszögelés, csak hiánytalanul.
//
// MIÉRT EZ, ÉS NEM A KORÁBBI JELÖLT-GYÁRTÁS
// A koino_1.0 (és az első 1.1-es változat) néhány jelöltet mintavételezett, majd
// ellenőrizte őket. Ha a mintában nem volt szabad hely, átfedés keletkezett —
// mérve: 100 körnél 4 átfedő pár, 300-nál 23, egyenletes méreteknél 300 körnél
// 767. Az ív-számítás nem mintavételez: az ütközés-ellenőrzés nem külön lépés,
// hanem MAGA a tiltott ívek kiszámítása. Mérve 0 átfedés minden próbán, extrém
// méret-ugrásoknál (59 049-szeres szomszéd-arány) is.
//
// AMI KIMARAD, MERT NEM KELL
//   - Nincs szülő-perem korlát. A gyerekek együttes területe a hierarchikus
//     össztudatpont miatt legfeljebb a szülő 1/20-a, tehát hússzoros a tartalék;
//     a mérés szerint a külső perem 0,25–0,37 között marad (a szülő sugara 1).
//     A mérőpróba ezt ELLENŐRZI — ha valaha kilógna, azonnal kiderül.
//   - Nincs véletlen: holtversenynél a középtávolság, majd a szög, végül az
//     azonosító dönt. Ugyanaz az adat mindig ugyanazt a képet adja.
//
// A visszaadott helyek a SZÜLŐ KÖZÉPPONTJÁHOZ képest, a SZÜLŐ SUGARÁNAK
// egységében értendők — pontosan ezt várja a horgony-modul (relX, relY).
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető
// (backend/tools/sikidomPakolasProba.mjs).
// Használja: a Síkidom nézet újrapakoló rétege (SikidomModal._ujrapakolas).

// ===== ÁLLANDÓK =====

// Relatív tűrés. SZÁNDÉKOSAN relatív, nem abszolút: a nézet korlátlanul
// nagyítható, egy fix érték néhány szinttel lejjebb mindent „döntetlennek"
// mutatna. (A koino_1.0 fix 0,0001-es tűrése ebbe futott bele — ráadásul az
// epszilonos összehasonlítás nem is tranzitív, tehát a rendezés motorfüggő.)
const TURES = 1e-9;

// Numerikus nullaszint
const EPSZILON = 1e-12;

// Ha a horgony körül nincs szabad ív, ennyi másik kört próbálunk ki helyette,
// a LEGKÜLSŐVEL kezdve. Erre valóban szükség van: a látómezőre szűkített
// újrapakolásnál a befagyasztott külső gyűrű bezárja a belső zsebet, és a
// legnagyobb köröknek kifelé kell hely. 12-es kerettel 600-ból 197 a várólistán
// ragadt; 40-nel mind a 600 lekerül.
const POT_HORGONY_HATAR = 40;

const ketPi = Math.PI * 2;
const normal = (szog) => ((szog % ketPi) + ketPi) % ketPi;

// ===== EGY KÖR ÁLTAL TILTOTT SZÖG-INTERVALLUM =====
// A horgony körüli, r₁ sugarú körön mely szögek esnek ki az `akadaly` miatt?
//
// @returns {Object|null} { tol, ig } — vagy null, ha nem zavar.
//   `{ teljes: true }`, ha az egész kör tiltott.
function tiltottIv(horgony, akadaly, r1, r) {
  const dx = akadaly.x - horgony.x;
  const dy = akadaly.y - horgony.y;
  const D = Math.hypot(dx, dy);
  if (D < EPSZILON) return { teljes: true };

  const kellene = r + akadaly.sugar;
  const hatar = (r1 * r1 + D * D - kellene * kellene) / (2 * r1 * D);

  if (hatar >= 1 - TURES) return null;               // túl távol: nem zavar
  if (hatar <= -1 + TURES) return { teljes: true };  // mindenhol zavar

  const felSzelesseg = Math.acos(hatar);
  const kozep = Math.atan2(dy, dx);

  return { tol: normal(kozep - felSzelesseg), ig: normal(kozep + felSzelesseg) };
}

// ===== TILTOTT INTERVALLUMOK ÖSSZEFÉSÜLÉSE =====
// A [0, 2π) körön dolgozunk, ezért a 0-t átlépő intervallumokat kettévágjuk.
function osszefesules(ivek) {
  const daraboltak = [];
  for (const iv of ivek) {
    if (iv.tol <= iv.ig) {
      daraboltak.push([iv.tol, iv.ig]);
    } else {
      daraboltak.push([iv.tol, ketPi]);
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
  if (tiltottak.length === 0) return [[0, ketPi]];

  const szabadok = [];
  let hol = 0;

  for (const [tol, ig] of tiltottak) {
    if (tol > hol + TURES) szabadok.push([hol, tol]);
    hol = Math.max(hol, ig);
  }
  if (hol < ketPi - TURES) szabadok.push([hol, ketPi]);

  return szabadok;
}

// ===== EGY KÖR LERAKÁSA EGY HORGONY MELLÉ =====
// @returns {Object|null} { x, y } — vagy null, ha e körül nincs szabad hely
function horgonyMelle(horgony, r, akadalyok) {
  const r1 = horgony.sugar + r;

  // 1. A tiltott ívek összegyűjtése.
  //    A `tiltottIv` magától eldobja azokat, akik túl messze vannak — csak a
  //    horgony szűk környezete tilthat. (Itt van a helye egy térbeli rácsnak, ha
  //    a lineáris skálázódás kell: akkor nem kell végigolvasni az összes kört.)
  const ivek = [];
  for (const a of akadalyok) {
    if (a === horgony) continue;
    const iv = tiltottIv(horgony, a, r1, r);
    if (!iv) continue;
    if (iv.teljes) return null;
    ivek.push(iv);
  }

  const tiltottak = osszefesules(ivek);
  const szabadok = szabadIvek(tiltottak);
  if (szabadok.length === 0) return null;

  // 2. A jelöltek a szabad ívek VÉGPONTJAI — ott érint az új kör egy második
  //    kört is, tehát ott a legtömörebb a kép. Ha az egész kör szabad, a
  //    középpont felé mutató irányt vesszük.
  const jeloltek = [];
  if (tiltottak.length === 0) {
    jeloltek.push(normal(Math.atan2(-horgony.y, -horgony.x)));
  } else {
    for (const [tol, ig] of szabadok) { jeloltek.push(tol); jeloltek.push(ig); }
  }

  // 3. A KÖZÉPPONTHOZ LEGKÖZELEBBI nyer (tömör kép); döntetlennél a kisebb szög.
  let legjobb = null;
  for (const szog of jeloltek) {
    const x = horgony.x + Math.cos(szog) * r1;
    const y = horgony.y + Math.sin(szog) * r1;
    const tavolsag = Math.hypot(x, y);

    if (!legjobb ||
        tavolsag < legjobb.tavolsag - EPSZILON ||
        (Math.abs(tavolsag - legjobb.tavolsag) <= EPSZILON && szog < legjobb.szog)) {
      legjobb = { x, y, szog, tavolsag };
    }
  }

  return legjobb ? { x: legjobb.x, y: legjobb.y } : null;
}

// ===== A MÉRT MAG =====
// A középső üresség sugara: a legbelső kör belső széle. NEM becslés — a lerakott
// körökből MÉRJÜK.
function magMerese(korok) {
  let mag = Infinity;
  for (const k of korok) mag = Math.min(mag, Math.hypot(k.x, k.y) - k.sugar);
  return Number.isFinite(mag) ? Math.max(0, mag) : Infinity;
}

// ===== A PAKOLÁS =====
/**
* Testvérek elhelyezése a szülőn belül, növekvő méret szerint kifelé.
*
* @param {Array} elemek - [{ id, sugar }] — a sugarak a SZÜLŐ sugarához
*   viszonyítva. A rendezést a modul végzi (növekvő, holtversenynél azonosító).
* @param {Object} opciok
* @param {number} [opciok.magSugar=0] - az ÜRES MAG sugara. Akkor adjuk meg, ha
*   van még meg nem jelenített testvér: ide egyetlen kör sem léphet be, és a
*   peremén sorra előbukkannak az újak, ahogy az e-ember nagyít. Ha 0, akkor
*   nincs mag, és a legkisebb kör a KÖZÉPPONTBA kerül.
* @param {Array} [opciok.kornyezet=[]] - már lerakott, HELYBEN MARADÓ körök
*   [{ id, x, y, sugar }]; akadályként vesznek részt.
* @returns {Object} { helyek, lerakatlanIdk, magSugar, kulsoSugar }
*   helyek: [{ id, sugar, x, y }] — csak amit tényleg le tudtunk rakni
*   lerakatlanIdk: amire nem volt hely (rendes esetben üres)
*   magSugar: a MÉRT középső üresség a pakolás után
*   kulsoSugar: a legkülső pont távolsága (a beágyazás ellenőrzéséhez)
*/
export function pakolas(elemek, opciok = {}) {
  const kornyezet = opciok.kornyezet ?? [];
  const magSugar = Math.max(0, opciok.magSugar ?? 0);

  console.log('sikidomPakolas.pakolas - KEZDÉS', {
    elemDarab: elemek?.length ?? 0, kornyezet: kornyezet.length, magSugar
  });

  if (!elemek || elemek.length === 0) {
    console.log('sikidomPakolas.pakolas - VÉGE (nincs elem)');
    return { helyek: [], lerakatlanIdk: [], magSugar: magMerese(kornyezet), kulsoSugar: 0 };
  }

  // NÖVEKVŐ sugár szerint: a legkisebbek középre, a nagyobbak kifelé.
  // Holtversenynél az azonosító dönt — szigorú rendezés, epszilon nélkül.
  const rendezett = [...elemek].sort((a, b) =>
    (a.sugar - b.sugar) || String(a.id).localeCompare(String(b.id))
  );

  // Az akadály-halmaz: a mag (ha van) + a helyben maradó környezet + a lerakottak.
  // A mag virtuális kör az origóban: nem rajzoljuk ki, de a tiltott ívek
  // számításában ugyanúgy részt vesz, mint bármely másik kör.
  const akadalyok = [];
  if (magSugar > 0) akadalyok.push({ id: '__mag', x: 0, y: 0, sugar: magSugar, mag: true });
  for (const k of kornyezet) akadalyok.push({ id: k.id, x: k.x, y: k.y, sugar: k.sugar });

  const helyek = [];
  const lerakatlanIdk = [];

  // A mag peremére addig pakolunk, amíg elfér rajta — utána nincs értelme
  // próbálkozni vele (a kör körbeért).
  const mag = magSugar > 0 ? akadalyok[0] : null;
  let magTelt = false;

  // Üres lapról, mag nélkül a legkisebb kör a KÖZÉPPONTBA kerül
  const uresLap = !mag && kornyezet.length === 0;

  for (const elem of rendezett) {
    let hely = null;

    if (uresLap && helyek.length === 0) {
      hely = { x: 0, y: 0 };
    } else {
      // A horgony-jelöltek sorrendje:
      //
      //  1. A MAG PEREME. A magra ugyanúgy lehet horgonyozni, mint bármely körre,
      //     és mivel növekvő méretben pakolunk, a legkisebbek ide valók. Enélkül
      //     — amikor van befagyasztott környezet — senki nem kerülne a mag mellé,
      //     és a középső üresség a célérték TÍZSZERESÉRE nőtt (mérve 3000
      //     testvérnél). Ha a mag pereme körbeért, többé nem próbálkozunk vele.
      //
      //  2. A LEGUTÓBB LERAKOTT kör: ott van a „munkafront", onnan marad tömör
      //     a kép.
      //
      //  3. PÓT-HORGONYOK a LEGKÜLSŐVEL kezdve. Miért kifelé? Mert a horgony
      //     akkor fullad be, ha körbe van véve — a szabad hely a peremen van.
      //     (Befelé rendezve a legnagyobb körök nem találtak helyet: 600-ból 197
      //     a várólistán ragadt.)
      const horgonyok = [];
      if (mag && !magTelt) horgonyok.push(mag);
      if (helyek.length > 0) horgonyok.push(akadalyok[akadalyok.length - 1]);

      const peremSorrend = akadalyok
        .filter(a => !a.mag && !horgonyok.includes(a))
        .sort((x, y) => (Math.hypot(y.x, y.y) + y.sugar) - (Math.hypot(x.x, x.y) + x.sugar));

      for (const a of peremSorrend) {
        if (horgonyok.length >= POT_HORGONY_HATAR) break;
        horgonyok.push(a);
      }

      for (const h of horgonyok) {
        hely = horgonyMelle(h, elem.sugar, akadalyok);
        if (hely) break;
        if (h === mag) magTelt = true;
      }
    }

    if (!hely) {
      console.warn('sikidomPakolas.pakolas - nincs szabad hely', { id: elem.id });
      lerakatlanIdk.push(elem.id);
      continue;
    }

    helyek.push({ id: elem.id, sugar: elem.sugar, x: hely.x, y: hely.y });
    akadalyok.push({ id: elem.id, x: hely.x, y: hely.y, sugar: elem.sugar });
  }

  let kulsoSugar = 0;
  for (const h of helyek) kulsoSugar = Math.max(kulsoSugar, Math.hypot(h.x, h.y) + h.sugar);

  const mertMag = magMerese([...kornyezet, ...helyek]);

  console.log('sikidomPakolas.pakolas - VÉGE', {
    lerakott: helyek.length,
    lerakatlan: lerakatlanIdk.length,
    mertMag: Number.isFinite(mertMag) ? mertMag.toFixed(4) : '∞',
    kulsoSugar: kulsoSugar.toFixed(4)
  });

  return { helyek, lerakatlanIdk, magSugar: mertMag, kulsoSugar };
}

export default { pakolas };
