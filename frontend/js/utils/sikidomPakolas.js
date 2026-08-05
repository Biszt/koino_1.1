// frontend/js/utils/sikidomPakolas.js

// ===== SÍKIDOM-PAKOLÁS (háromszögeléses kör-pakolás üres maggal) =====
//
// Felelősség: egy szülőn belül elhelyezni a testvéreket úgy, hogy ne fedjék át
// egymást, és a kép tömör legyen.
//
// AZ ALAPGONDOLAT a koino_1.0-ból (`ContentPositioner.positionByTriangulation`):
// a köröket NÖVEKVŐ méret szerint rakjuk le, és mindegyik új kört két már
// lerakott körhöz ÉRINTŐLEGESEN illesztjük. Az érintési helyet két segédkör
// metszéspontja adja (innen a „háromszögelés" név). Így tetszőleges, szabálytalan
// méretekkel is hézagmentes, szerves elrendezés jön ki — ezt a szabályos spirál
// nem tudta.
//
// KÉT DOLOGBAN TÉRÜNK EL a koino_1.0-tól, mindkettő szándékos javítás:
//
// 1. ÜRES MAG. A koino_1.0 az első kört a (0,0)-ba tette, ezért egy KÉSŐBB
//    betöltött, kisebb testvér az egész elrendezést eltolta — ez volt a
//    skálázási buktató. Nálunk a (0,0)-ban egy LÁTHATATLAN üres kör (a „mag")
//    áll, és a pakolás ehhez képest kezdődik kifelé. A később betöltött kisebb
//    testvérek a mag BELSEJÉBE kerülnek, a már lerakottakat nem mozdítják.
//
// 2. DETERMINIZMUS. A koino_1.0 véletlen szöget használt, ha nem talált helyet
//    (`Math.random()`), és az ütközés-ellenőrzése is csak közelítő volt. Ugyanaz
//    az adat így más-más képet adhatott. Nálunk nincs véletlen: minden jelöltet
//    ellenőrzünk az ÖSSZES lerakott körrel szemben, és a szabályos jelöltek közül
//    mindig a középhez legközelebbit választjuk (döntetlennél a kisebb szögűt).
//    Ugyanaz az adat mindig ugyanazt a képet adja.
//
// A visszaadott helyek a SZÜLŐ KÖZÉPPONTJÁHOZ képest, a SZÜLŐ SUGARÁNAK
// egységében értendők — pontosan ezt várja a horgony-modul (relX, relY).
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető.
// Használják: a Síkidom nézet betöltő rétege.

// ===== ÁLLANDÓK =====

// Ennyi KÜLSŐ kört veszünk figyelembe az érintési helyek keresésekor. Az új kör
// mindig kifelé kerül, ezért elég a külső peremet nézni — enélkül a pakolás
// négyzetesen lassulna a testvérek számával.
const FRONT_MERET = 28;

// Relatív tűrés az érintés-ellenőrzéshez: az érintkezés (a távolság PONTOSAN a
// sugarak összege) nem ütközés, csak a lebegőpontos számítás zaja
const TURES = 1e-9;

// Numerikus nullaszint
const EPSZILON = 1e-12;

// ===== KÉT KÖRT KÍVÜLRŐL ÉRINTŐ HELYEK =====
// Hova kerülhet egy `r` sugarú kör úgy, hogy KÍVÜLRŐL érintse `a`-t és `b`-t is?
// A középpontja `a`-tól (a.sugar + r), `b`-től (b.sugar + r) távolságra van —
// vagyis két segédkör metszéspontjait keressük (koszinusztétel + merőleges).
//
// @returns {Array} 0, 1 vagy 2 jelölt pont
function erintoHelyek(a, b, r) {
  const ra = a.sugar + r;
  const rb = b.sugar + r;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);

  if (d < EPSZILON) return [];              // egybeeső középpontok
  if (d > ra + rb) return [];               // túl távol: nincs közös érintő hely
  if (d < Math.abs(ra - rb)) return [];     // egyik segédkör a másik belsejében

  // A metszésvonal helye a két középpontot összekötő egyenesen
  const t = (ra * ra - rb * rb + d * d) / (2 * d);
  const magassagNegyzet = ra * ra - t * t;
  if (magassagNegyzet < 0) return [];

  const h = Math.sqrt(magassagNegyzet);
  const kozepX = a.x + (t * dx) / d;
  const kozepY = a.y + (t * dy) / d;

  // Merőleges irány a középvonalra
  const merolegesX = (-dy / d) * h;
  const merolegesY = (dx / d) * h;

  return [
    { x: kozepX + merolegesX, y: kozepY + merolegesY },
    { x: kozepX - merolegesX, y: kozepY - merolegesY }
  ];
}

// ===== SZABAD-E A HELY? =====
// Ellenőrzés az ÖSSZES lerakott körrel szemben (a magot is beleértve — az új kör
// nem kerülhet a mag belsejébe).
function szabad(pont, r, lerakottak) {
  for (const l of lerakottak) {
    const d = Math.hypot(pont.x - l.x, pont.y - l.y);
    const kellTavolsag = l.sugar + r;
    if (d < kellTavolsag * (1 - TURES)) return false;
  }
  return true;
}

// ===== A KÜLSŐ PEREM KIVÁLASZTÁSA =====
// A legkülső körök (a legnagyobb „középtávolság + sugár" értékkel), plusz mindig
// a mag — ő a horgonya a legbelső gyűrűnek.
function frontKivalasztas(lerakottak) {
  if (lerakottak.length <= FRONT_MERET) return lerakottak;

  const rendezett = [...lerakottak].sort((x, y) =>
    (Math.hypot(y.x, y.y) + y.sugar) - (Math.hypot(x.x, x.y) + x.sugar)
  );

  const front = rendezett.slice(0, FRONT_MERET);
  const mag = lerakottak.find(l => l.mag);
  if (mag && !front.includes(mag)) front.push(mag);
  return front;
}

// ===== DETERMINISZTIKUS TARTALÉK-HELY =====
// Ha egyetlen érintési jelölt sem szabad (szélsőséges méret-arányoknál fordulhat
// elő), akkor kifelé tartó gyűrűkben, rögzített szög-lépésekkel keresünk helyet.
// Véletlen NINCS — ugyanaz az adat ugyanazt a helyet adja.
function tartalekHely(r, lerakottak, magSugar) {
  const kezdoTavolsag = magSugar + r;

  for (let gyuru = 0; gyuru < 400; gyuru++) {
    const tavolsag = kezdoTavolsag + gyuru * r * 0.25;
    for (let fok = 0; fok < 360; fok += 3) {
      const szog = (fok * Math.PI) / 180;
      const pont = { x: Math.cos(szog) * tavolsag, y: Math.sin(szog) * tavolsag };
      if (szabad(pont, r, lerakottak)) return pont;
    }
  }

  // Végső eset: a legkülső kör mögé
  let kulso = magSugar;
  for (const l of lerakottak) kulso = Math.max(kulso, Math.hypot(l.x, l.y) + l.sugar);
  return { x: kulso + r, y: 0 };
}

// ===== EGY KÖR ELHELYEZÉSE =====
function elhelyezes(r, lerakottak, magSugar) {
  if (lerakottak.length === 0) return { x: 0, y: 0 };

  // Egyetlen lerakott kör (tipikusan a mag): mellé, rögzített irányba
  if (lerakottak.length === 1) {
    const a = lerakottak[0];
    return { x: a.x + a.sugar + r, y: a.y };
  }

  const front = frontKivalasztas(lerakottak);

  let legjobb = null;
  for (let i = 0; i < front.length; i++) {
    for (let j = i + 1; j < front.length; j++) {
      for (const jelolt of erintoHelyek(front[i], front[j], r)) {
        if (!szabad(jelolt, r, lerakottak)) continue;

        const tavolsag = Math.hypot(jelolt.x, jelolt.y);
        const szog = Math.atan2(jelolt.y, jelolt.x);

        // A középhez legközelebbi nyer (tömör kép); döntetlennél a kisebb szög
        // (determinizmus)
        if (!legjobb ||
            tavolsag < legjobb.tavolsag - EPSZILON ||
            (Math.abs(tavolsag - legjobb.tavolsag) <= EPSZILON && szog < legjobb.szog)) {
          legjobb = { x: jelolt.x, y: jelolt.y, tavolsag, szog };
        }
      }
    }
  }

  if (legjobb) return { x: legjobb.x, y: legjobb.y };
  return tartalekHely(r, lerakottak, magSugar);
}

// ===== A PAKOLÁS =====
/**
* Testvérek elhelyezése a szülőn belül.
*
* @param {Array} elemek - [{ id, sugar }] — a sugarak a SZÜLŐ sugarához viszonyítva
* @param {Object} opciok
* @param {number} opciok.magSugar - az üres mag sugara. A hívó a tudatpontból
*   számolja: `sikidomMeret.magSugarBecsles(maradekPont, szuloPont)`. Ha nincs
*   megadva, nem hagyunk magot (0) — ilyenkor a későbbi lapok nem férnének be,
*   ezért éles használatban MINDIG add meg.
* @param {number} opciok.maxKulsoSugar - ennél messzebbre nem nyúlhat a csoport
*   (alapból 1 = a szülő pereme; a mag-lapoknál a szülő magjának sugara)
* @returns {Object} { helyek: [{ id, sugar, x, y }], kulsoSugar, magSugar }
*   kulsoSugar = a legkülső pont távolsága (a beágyazás ellenőrzéséhez)
*/
export function pakolas(elemek, opciok = {}) {
  console.log('sikidomPakolas.pakolas - KEZDÉS', { elemDarab: elemek?.length ?? 0 });

  if (!elemek || elemek.length === 0) {
    console.log('sikidomPakolas.pakolas - VÉGE (nincs elem)');
    return { helyek: [], kulsoSugar: 0, magSugar: 0 };
  }

  // A felső korlát háromféle lehet, és ÉLESEN meg kell különböztetni őket:
  //   - hiányzik / Infinity / NaN → NINCS korlát (pl. a virtuális gyökér-szint,
  //     aminek nincs „pereme"); ilyenkor a vészfék nem szólhat bele;
  //   - pozitív szám → eddig terjedhet a csoport;
  //   - NULLA vagy negatív → NINCS HELY. Ezt korábban tévesen „nincs korlát"-nak
  //     vettük, és a csoport teljes méretben, a már kirajzoltakra pakolódott
  //     (a mérés szerint több ezer átfedés). Most üres eredményt adunk, és a
  //     hívó ebből tudja, hogy nem fér el több.
  const nyersKorlat = opciok.maxKulsoSugar;
  const nincsKorlat = nyersKorlat == null || !Number.isFinite(nyersKorlat);
  const maxKulsoSugar = nincsKorlat ? Infinity : nyersKorlat;

  if (!nincsKorlat && maxKulsoSugar <= 0) {
    console.warn('sikidomPakolas.pakolas - VÉGE (nincs hely: a felső korlát 0)');
    return { helyek: [], kulsoSugar: 0, magSugar: 0, zsugoritva: 1, nincsHely: true };
  }

  // NÖVEKVŐ sugár szerint: a legkisebbek kerülnek beljebb, a nagyobbak kifelé.
  // Döntetlennél az azonosító dönt — így a sorrend (és a kép) determinisztikus.
  const rendezett = [...elemek].sort((a, b) =>
    (a.sugar - b.sugar) || String(a.id).localeCompare(String(b.id))
  );

  // Egy adott mag-mérettel végigpakol
  const egyProbalkozas = (magSugar) => {
    // A mag virtuális: ütközés-ellenőrzésben részt vesz, de sosem rajzoljuk ki
    const lerakottak = [];
    if (magSugar > 0) lerakottak.push({ x: 0, y: 0, sugar: magSugar, mag: true });

    const helyek = [];
    for (const elem of rendezett) {
      const hely = elhelyezes(elem.sugar, lerakottak, magSugar);
      helyek.push({ id: elem.id, sugar: elem.sugar, x: hely.x, y: hely.y });
      lerakottak.push({ x: hely.x, y: hely.y, sugar: elem.sugar });
    }

    let kulsoSugar = 0;
    for (const h of helyek) {
      kulsoSugar = Math.max(kulsoSugar, Math.hypot(h.x, h.y) + h.sugar);
    }
    return { helyek, kulsoSugar, magSugar };
  };

  // Az ÜRES MAG a még be nem töltött testvérek helye — de nem nyomhatja ki a
  // testvéreket a szülőből. Ha a csoport túlnyúlna a megengedett peremen, a magot
  // felezve újrapróbáljuk. Kevés, de NAGY gyereknél ez életbe is lép: ilyenkor
  // úgysincs sok be nem töltött testvér, tehát a kisebb mag nem veszteség.
  let mag = opciok.magSugar ?? 0;
  let eredmeny = egyProbalkozas(mag);

  let probalkozas = 0;
  while (eredmeny.kulsoSugar > maxKulsoSugar && mag > 0 && probalkozas++ < 16) {
    mag = mag / 2;
    if (mag < 1e-6) mag = 0;
    eredmeny = egyProbalkozas(mag);
  }

  // VÉGSŐ GARANCIA: ha mag nélkül SEM fér el (szélsőséges méret-arányoknál),
  // arányosan összehúzzuk az egész csoportot. Ilyenkor a méret már nem pontosan
  // terület-arányos, DE a csoporton belüli arányok megmaradnak, és — ami itt a
  // fontosabb — soha nem lóg ki és soha nincs átfedés. A `zsugoritva` jelzőből
  // a hívó tudja, hogy ez történt.
  let zsugoritva = 1;
  if (eredmeny.kulsoSugar > maxKulsoSugar && eredmeny.kulsoSugar > 0) {
    zsugoritva = maxKulsoSugar / eredmeny.kulsoSugar;
    eredmeny = {
      helyek: eredmeny.helyek.map(h => ({
        id: h.id,
        sugar: h.sugar * zsugoritva,
        x: h.x * zsugoritva,
        y: h.y * zsugoritva
      })),
      kulsoSugar: eredmeny.kulsoSugar * zsugoritva,
      magSugar: eredmeny.magSugar * zsugoritva
    };
  }

  console.log('sikidomPakolas.pakolas - VÉGE', {
    lerakott: eredmeny.helyek.length,
    magSugar: eredmeny.magSugar.toFixed(4),
    kulsoSugar: eredmeny.kulsoSugar.toFixed(4),
    magFelezes: probalkozas,
    zsugoritva: zsugoritva !== 1 ? zsugoritva.toFixed(4) : 'nem'
  });

  return { ...eredmeny, zsugoritva };
}

export default { pakolas };
