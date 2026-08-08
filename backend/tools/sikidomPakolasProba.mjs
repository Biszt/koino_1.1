// backend/tools/sikidomPakolasProba.mjs

// ===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====
//
// Felelősség: böngésző nélkül bebizonyítani, hogy a Síkidom nézet befelé növő
// pakolása SOK testvérnél is hiánytalan. Ez váltja ki a korábban tervezett
// „sűrűség-söprést" — a modell ugyanis már nem becsül sűrűséget.
//
// MIÉRT KELL: a régi modell a még be nem töltött testvéreknek fenntartott magot
// a tudatpontból BECSÜLTE, egy feltételezett 0,45-ös pakolási sűrűséggel. A
// becslés csak TERÜLETTEL számolt, ezért túl optimista volt; a pakoló ilyenkor a
// magot felezve „javított", akár nullára, és onnantól minden további adag NÉMÁN
// elveszett. Mérés: 600 gyerekes próbán 60-as adagokkal csak 180 jelent meg.
//
// A MODELL (Csaba, 2026-08-08) — HÁROM állítás, ez a próba mindet méri:
//
//   1. A lerakott síkidomok HELYE SOHA NEM VÁLTOZIK. (Enélkül közelítéskor
//      átrendeződik a kép, és egy szélső síkidomra nem lehet ráközelíteni.)
//   2. A középen fenntartott MAG a HÁTRALÉVŐ TUDATPONTBÓL számolódik — nem a
//      képernyőből. Ez tartja fenn a helyet a később érkezőknek.
//   3. Ebből a kettőből következik a nézet rendje: a legkisebbek a közép körül,
//      a legnagyobbak kívül.
//
// A próba a valódi geometria-modult hívja (frontend/js/utils/sikidomPakolas.js),
// és a SikidomModal._ujrapakolas lépéssorát tükrözi — beleértve a
// KAPACITÁS-VÁGÁST is (ez 2026-08-08-ig hiányzott belőle, és épp ezért nem fogta
// meg a böngészőben látott rossz elrendezést).
//
// Futtatás:  node backend/tools/sikidomPakolasProba.mjs
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 200 24 mag 0.5 20
//            (darab, zoom-szorzó, zoom-lépések, min. képernyő-átmérő,
//             mag-kapcsoló, mag-sűrűség σ, egy körben érkező darab)
//
//            A 7. paraméter (σ) a mag ÓVATOSSÁGA: kisebb érték = nagyobb mag.
//            A 8. (adag) CSÖKKENTVE feszíti meg a modellt: sok körön át kell
//            helyet tartani a még meg sem érkezett testvéreknek. Nagy adaggal
//            két körben minden lekerül, tehát a próba nem bizonyít semmit.
//
//            node backend/tools/sikidomPakolasProba.mjs 600 1.3 90 24 nincsmag
//            → ÜRES MAG NÉLKÜL (összehasonlításhoz).

// --- IMPORTÁLÁSOK ---
import { pakolas } from '../../frontend/js/utils/sikidomPakolas.js';
import { gyerekRelativSugar, SZINT_OSZTO } from '../../frontend/js/utils/sikidomMeret.js';

// ===== A NÉZET ÁLLANDÓI (a SikidomModal-lal egyezően) =====
const MIN_KEP_ATMERO = Number(process.argv[5]) || 24;
const MAG_CEL_ATMERO = 120;

// A 6. paraméter: `nincsmag` → üres mag nélkül futtatunk (a legkisebb testvér a
// középpontba kerül). Ez a `SikidomModal.URES_MAG` kapcsoló tükre.
const URES_MAG = String(process.argv[6] || '').toLowerCase() !== 'nincsmag';

// ===== A BECSLÉS-ALAPÚ MAG (Csaba modellje, 2026-08-08) =====
// A mag NEM a képernyőhöz igazodik, hanem a HÁTRALÉVŐ TUDATPONTHOZ: annyi helyet
// tartunk fenn középen, amennyi a még le nem rakott testvéreknek kell.
//
//   a hátralévők együttes területe:  A = π · T_hátra / (20 · P_szülő)
//   ezt a mag σ sűrűséggel nyeli el: π · c² · σ = A
//                               →    c = √( T_hátra / (20 · P_szülő · σ) )
//
// MIÉRT KELL EGYÁLTALÁN FENNTARTANI: mert a lerakott síkidomok mostantól FIXEK.
// Ha újrapakolnánk, menet közben lehetne igazítani — így viszont előre kell tudni,
// mennyi hely kell a később érkezőknek.
//
// A σ SZÁNDÉKOSAN ÓVATOS. Utánaszámolva egy teljes GYŰRŰ a felszabaduló hely
// π/4 ≈ 78,5%-át tölti ki, a vegyes méretekre MÉRT pakolási sűrűség pedig
// 0,41–0,53. A 0,5-tel tehát ~1,57-szer akkora magot tartunk fenn, mint a
// szigorúan szükséges — Csaba kérése szerint „inkább maradjon üres belső rész,
// mint hogy elfogyjon a belső tér".
const MAG_SURUSEG = Number(process.argv[7]) || 0.5;

// ===== A PRÓBA PARAMÉTEREI =====
const GYEREK_DARAB   = Number(process.argv[2]) || 600;
const ZOOM_SZORZO    = Number(process.argv[3]) || 1.3;
const KEZDO_KEPSUGAR = 400;      // a szülő képernyő-sugara az induláskor
const MAX_ZOOM_LEPES = Number(process.argv[4]) || 60;
const SZULO_PONT     = 1_000_000;

// ===== A KÉPERNYŐ ÉS A KAPACITÁS (a SikidomModal-lal egyezően) =====
// Ez eddig HIÁNYZOTT a próbából — és épp ezért nem fogta meg a 2026-08-08-i
// hibát: a nézetben a kapacitás-vágás ledobja a legnagyobbakat, azok visszakerülnek
// a várólistára, majd ÚJKÉNT térnek vissza — és a mag peremére, a kicsik közé
// kerültek. A próba enélkül tiszta szerkezetet mutatott, a böngésző nem.
const KEPERNYO_SZELESSEG = 1280;
const KEPERNYO_MAGASSAG  = 800;
const LATOMEZO_TARTALEK  = 0.5;
const PAKOLASI_SURUSEG   = 0.7;

const KEPERNYO_KAPACITAS =
  KEPERNYO_SZELESSEG * (1 + 2 * LATOMEZO_TARTALEK) *
  KEPERNYO_MAGASSAG  * (1 + 2 * LATOMEZO_TARTALEK) * PAKOLASI_SURUSEG;

// A VALÓSÁGHŰ BETÖLTÉS: a nézet kérésenként legfeljebb ennyi testvért tölt le
// (SikidomModal.KERES_PLAFON), és egyszerre 3 kérés futhat. A várólistára tehát
// adagokban érkeznek az elemek, nem egyszerre több ezer. A próba ezt utánozza —
// enélkül irreálisan nagy pakolásokat mérnénk.
const KERES_PLAFON       = 150;
const EGYIDEJU_BETOLTES  = 3;

// Egy körben ennyi testvér érkezhet. A 8. paraméterrel CSÖKKENTHETŐ — így a
// becslés-alapú mag valóban MEGFESZÜL: sok körön át kell helyet tartania a még
// meg sem érkezett testvéreknek. Nagy adaggal a modell meg sem izzad (két körben
// minden lekerül), tehát nem is bizonyít semmit.
const ADAG = Number(process.argv[8]) || KERES_PLAFON * EGYIDEJU_BETOLTES;

// A naplót elnyomjuk: a pakoló képkockánként logol, itt több ezerszer futna
console.log = () => {};
const naplo = (...ertekek) => process.stdout.write(ertekek.join(' ') + '\n');

// ===== TESZT-ADAT =====
// Zipf-eloszlás: néhány erős testvér, majd hosszú farok — ez a valósághű eset, és
// ez feszíti meg a modellt (a farok csak mély nagyításnál válik láthatóvá).
function tesztGyerekek(darab) {
  const sulyok = [];
  let osszSuly = 0;
  for (let i = 1; i <= darab; i++) {
    const s = 1 / Math.pow(i, 1.2);
    sulyok.push(s);
    osszSuly += s;
  }

  // A gyerekek együttes pontja a szülőének 90%-a (a szülőnek is van saját pontja)
  const oszthato = SZULO_PONT * 0.9;
  return sulyok.map((s, i) => ({
    id: `e${String(i + 1).padStart(4, '0')}`,
    pont: (s / osszSuly) * oszthato
  }));
}

// ===== EGY TELJES BEJÁRÁS (a SikidomModal._ujrapakolas tükre) =====
function bejaras(gyerekek) {
  const meg = [...gyerekek];              // amit a backend még nem küldött el
  const varolista = [];                   // amit már letöltöttünk, de nem raktunk le
  let lerakottak = [];                    // { id, x, y, sugar, kor, pont }
  let magSugarRel = Infinity;

  // A gyerekek EGYÜTTES pontja — ezt a nézetben a backend adja (`osszesGyerekPont`,
  // ami a szülő ágazati összpontja mínusz a saját pontja). A mag ebből számol.
  const osszesGyerekPont = gyerekek.reduce((s, g) => s + g.pont, 0);
  const pontTerkep = new Map(gyerekek.map(g => [g.id, g.pont]));
  const pontJa = (id) => pontTerkep.get(id) ?? 0;
  let kepSugar = KEZDO_KEPSUGAR;
  let ujrapakolasok = 0;
  let legdragabb = 0;

  const lepesek = [];

  // STABILITÁS-NAPLÓ: minden síkidom helye a LERAKÁS pillanatában. A futás végén
  // ehhez hasonlítunk — ha bármelyik elmozdult volna, az a nézet fő hibája
  // (Csaba tünete 2026-08-08: „nehéz ráközelíteni egy szélső síkidomra, mert
  // mindig elugrál, kb. kergetni kell").
  const elsoHelyek = new Map();

  // Akinek MÁR VAN helye (akkor is, ha a kapacitás épp levette a képernyőről).
  // A mag csak azoknak tart fenn helyet, akiknek MÉG NINCS.
  let helyezettPont = 0;

  for (let kor = 1; kor <= MAX_ZOOM_LEPES; kor++) {
    // Egy zoom-lépésre ennyi érkezhet a backendtől (csökkenő pont szerint)
    varolista.push(...meg.splice(0, ADAG));

    let lepesMs = 0;

    // (a) A KAPACITÁS CSAK A RAJZOLÁST KORLÁTOZZA — a lerakást NEM (Csaba, 2026-08-09).
    //     Korábban itt egy vágás állt: ami nem fért a képernyőre, azt levettük a
    //     tárból. Ez ördögi kört csinált — közelítéskor egyre több esett ki, azok
    //     nem kaptak helyet, tehát bent maradtak a HÁTRALÉVŐK között, amitől a mag
    //     tovább nőtt. Így a közelítés NÖVELTE az üres közepet ahelyett, hogy
    //     fogyasztotta volna. A hely kiosztása néhány szám — nem kerül rajzolási
    //     időbe —, ezért mindenki azonnal helyet kap, aki letöltődött.
    //     Mérőszám: hány síkidom FÉRNE a képre (csak tájékoztatásul).
    let rajzolhato = 0;
    let osszKepTerulet = 0;
    for (const l of [...lerakottak].sort((a, b) => a.sugar - b.sugar)) {
      const kepsugar = kepSugar * l.sugar;
      const terulet = Math.PI * kepsugar * kepsugar;
      if (rajzolhato > 0 && osszKepTerulet + terulet > KEPERNYO_KAPACITAS) break;
      osszKepTerulet += terulet;
      rajzolhato++;
    }

    // (b) A MAG A HÁTRALÉVŐ TUDATPONTBÓL. A `T_hátra` azokat számolja, akiknek
    //     MÉG NINCS HELYÜK — a le sem töltötteket is.
    //
    //     FONTOS: akit a kapacitás vágott ki, annak VAN helye (megjegyeztük), csak
    //     épp nem látszik. Őt tehát NEM szabad a hátralévők közé számolni. Enélkül
    //     a mag nem zsugorodik, és minden új síkidom a nagy mag peremére, KIFELÉ
    //     kerül — mérve pontosan ez történt: a legkisebbek kerültek legkívülre
    //     (tized-átlagok 0,3042 … 0,2241, vagyis fordítva).
    //     A MOST lerakandó adagot LEVONJUK: ők épp helyet kapnak, tehát nem nekik
    //     kell fenntartani. Enélkül egy nagy adag (a nézetben a megnyitáskori 150
    //     gyökér) ötször akkora mag köré kerül, mint kellene — és ott is ragad,
    //     mert semmi nem mozdul. Kis adagnál a hiba elenyésző: ezért nem tűnt fel.
    const mostLerakandoPont = varolista.reduce((s, v) => s + v.pont, 0);
    const hatraPont = Math.max(0,
      osszesGyerekPont - helyezettPont - mostLerakandoPont);
    const magSugar = URES_MAG
      ? Math.sqrt(hatraPont / (SZINT_OSZTO * SZULO_PONT * MAG_SURUSEG))
      : 0;

    // (d) LERAKÁS. A láthatóság NEM kapu többé — az csak a RAJZOLÁST vezérli.
    //     Amit letöltöttünk, azt lerakjuk; a helyet a mag tartja fenn a többinek.
    const ujak = varolista.map(v => ({
      id: v.id, sugar: gyerekRelativSugar(v.pont, SZULO_PONT)
    }));

    if (ujak.length > 0) {
      const t0 = process.hrtime.bigint();
      const e = pakolas(ujak, {
        magSugar,
        kornyezet: lerakottak.map(l => ({ id: l.id, x: l.x, y: l.y, sugar: l.sugar }))
      });
      lepesMs = Number(process.hrtime.bigint() - t0) / 1e6;
      legdragabb = Math.max(legdragabb, lepesMs);
      ujrapakolasok++;

      const lerakottIdk = new Set();
      for (const h of e.helyek) {
        lerakottIdk.add(h.id);
        lerakottak.push({ ...h, kor, pont: pontJa(h.id) });
        if (!elsoHelyek.has(h.id)) {
          elsoHelyek.set(h.id, { x: h.x, y: h.y });
          helyezettPont += pontJa(h.id);      // MOST kapott először helyet
        }
      }

      for (let i = varolista.length - 1; i >= 0; i--) {
        if (lerakottIdk.has(varolista[i].id)) varolista.splice(i, 1);
      }
      magSugarRel = meretek(lerakottak).magSugarRel;
    }

    lepesek.push({
      kor,
      ms: lepesMs,
      kepSugar: Math.round(kepSugar),
      lerakott: lerakottak.length,
      varolistan: varolista.length,
      lyukKepAtmero: Number.isFinite(magSugarRel)
        ? Math.round(magSugarRel * kepSugar * 2)
        : Infinity
    });

    if (varolista.length === 0 && meg.length === 0) break;
    kepSugar *= ZOOM_SZORZO;
  }

  return { lerakottak, varolista: [...varolista, ...meg], lepesek, ujrapakolasok, legdragabb, elsoHelyek };
}

// A mag és a külső perem a lerakottakból
function meretek(lerakottak) {
  let mag = Infinity, kulso = 0;
  for (const l of lerakottak) {
    const t = Math.hypot(l.x, l.y);
    mag = Math.min(mag, t - l.sugar);
    kulso = Math.max(kulso, t + l.sugar);
  }
  return {
    magSugarRel: Number.isFinite(mag) ? Math.max(0, mag) : Infinity,
    kulsoSugar: kulso
  };
}

// ===== ELLENŐRZÉSEK =====
const hibak = [];
function allitas(rendben, cimke, reszlet = '') {
  naplo(`${rendben ? '  OK  ' : ' HIBA '} ${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  if (!rendben) hibak.push(cimke);
}

// 1. NULLA ÁTFEDÉS
function atfedesEllenorzes(lerakottak) {
  let legrosszabb = 0;
  let parosDarab = 0;

  for (let i = 0; i < lerakottak.length; i++) {
    for (let j = i + 1; j < lerakottak.length; j++) {
      const a = lerakottak[i], b = lerakottak[j];
      const tavolsag = Math.hypot(a.x - b.x, a.y - b.y);
      const kellene = a.sugar + b.sugar;
      const atfedes = kellene - tavolsag;
      if (atfedes > 1e-9) {
        parosDarab++;
        legrosszabb = Math.max(legrosszabb, atfedes / kellene);
      }
    }
  }

  allitas(parosDarab === 0, 'Nulla átfedés',
    parosDarab === 0
      ? `${lerakottak.length} síkidom, ${(lerakottak.length * (lerakottak.length - 1) / 2).toLocaleString('hu')} pár ellenőrizve`
      : `${parosDarab} átfedő pár, a legrosszabb ${(legrosszabb * 100).toFixed(2)}%`);
}

// 2. EGYETLEN ENTITÁS SEM VÉSZ EL
function hianyEllenorzes(gyerekek, lerakottak, varolista) {
  const lerakottIdk = new Set(lerakottak.map(l => l.id));
  const varoIdk = new Set(varolista.map(v => v.id));
  const hianyzo = gyerekek.filter(g => !lerakottIdk.has(g.id) && !varoIdk.has(g.id));
  const duplikalt = lerakottak.length !== lerakottIdk.size;

  allitas(hianyzo.length === 0 && !duplikalt, 'Egyetlen entitás sem vész el',
    `${lerakottak.length} lerakva + ${varolista.length} várólistán = ${gyerekek.length}`);
}

// 3. BEÁGYAZÁS: minden a szülőn BELÜL
function beagyazasEllenorzes(lerakottak) {
  let legnagyobb = 0;
  for (const l of lerakottak) legnagyobb = Math.max(legnagyobb, Math.hypot(l.x, l.y) + l.sugar);
  allitas(legnagyobb <= 1 + 1e-9, 'Minden síkidom a szülőn belül',
    `a legkülső perem ${legnagyobb.toFixed(4)} (a szülő sugara 1)`);
}

// 4. AZ INVARIÁNS: későbbi (beljebbi) kör nem lehet nagyobb egy korábbinál
function monotoniaEllenorzes(lerakottak) {
  const korMax = new Map();
  const korMin = new Map();
  for (const l of lerakottak) {
    korMax.set(l.kor, Math.max(korMax.get(l.kor) ?? 0, l.sugar));
    korMin.set(l.kor, Math.min(korMin.get(l.kor) ?? Infinity, l.sugar));
  }

  const korok = [...korMax.keys()].sort((a, b) => a - b);
  let sertes = null;
  for (let i = 1; i < korok.length; i++) {
    const elozoMin = korMin.get(korok[i - 1]);
    const mostMax = korMax.get(korok[i]);
    if (mostMax > elozoMin + 1e-12) sertes = `${korok[i]}. kör`;
  }

  allitas(!sertes, 'Középtől kifelé monoton nő a méret',
    sertes ? `megsérül a ${sertes}-ben` : `${korok.length} egymásba fűzött gyűrű`);
}

// 5. A LYUK KÉPPONTBAN ÁLLANDÓ, AMÍG VAN VÁRAKOZÓ
function lyukEllenorzes(lepesek) {
  const relevans = lepesek.filter(l => l.varolistan > 0 && Number.isFinite(l.lyukKepAtmero));
  if (relevans.length === 0) { allitas(true, 'A lyuk képpontban állandó', 'nincs mérhető lépés'); return; }

  // MAG NÉLKÜL az elvárás a fordítottja: NE legyen lyuk — a legkisebb testvér a
  // középpontban ül, tehát a mért lyuk 0 (a legbelső kör belső széle a
  // középpontban van vagy azon túl).
  if (!URES_MAG) {
    const legnagyobbLyuk = Math.max(...relevans.map(l => l.lyukKepAtmero));
    allitas(legnagyobbLyuk === 0, 'Nincs középső lyuk (a legkisebb a középpontban ül)',
      `a legnagyobb mért lyuk ${legnagyobbLyuk} px`);
    return;
  }

  const ertekek = relevans.map(l => l.lyukKepAtmero);
  const min = Math.min(...ertekek), max = Math.max(...ertekek);
  const also = MAG_CEL_ATMERO * 0.8, felso = MAG_CEL_ATMERO * 1.2;

  allitas(min >= also && max <= felso, 'A lyuk képpontban állandó (cél ±20%)',
    `${min}–${max} px (cél ${MAG_CEL_ATMERO} px, tűrés ${Math.round(also)}–${Math.round(felso)})`);
}

// 6. DETERMINIZMUS
function determinizmusEllenorzes(gyerekek) {
  const ujjlenyomat = (lerakottak) => lerakottak
    .map(l => `${l.id}:${l.x.toFixed(12)}:${l.y.toFixed(12)}:${l.sugar.toFixed(12)}`)
    .join('|');

  const a = bejaras(gyerekek);
  const b = bejaras(gyerekek);
  allitas(ujjlenyomat(a.lerakottak) === ujjlenyomat(b.lerakottak),
    'Determinizmus (kétszer futtatva bitre azonos)');
}

// 7. STABILITÁS: EGY LERAKOTT SÍKIDOM SOHA NEM MOZDUL
// Ez a 2026-08-08-i modell fő ígérete. Ha megsérül, a nézetben az történik, amit
// Csaba jelzett: közelítéskor átrendeződik a kép, és egy szélső síkidomra
// gyakorlatilag lehetetlen ráközelíteni, mert elugrál.
function stabilitasEllenorzes(lerakottak, elsoHelyek) {
  let mozdult = 0;
  let legnagyobb = 0;

  for (const l of lerakottak) {
    const elso = elsoHelyek.get(l.id);
    if (!elso) continue;
    const eltolodas = Math.hypot(l.x - elso.x, l.y - elso.y);
    if (eltolodas > 0) { mozdult++; legnagyobb = Math.max(legnagyobb, eltolodas); }
  }

  allitas(mozdult === 0, 'Lerakás után egyetlen síkidom sem mozdul',
    mozdult === 0
      ? `${lerakottak.length} síkidom helye végig változatlan`
      : `${mozdult} elmozdult, a legnagyobb ${legnagyobb.toExponential(2)}`);
}

// 8. A FENNTARTOTT MAG ELÉG NAGY VOLT-E
// A becslés-alapú modell EGYETLEN lényegi állítása: a középen fenntartott hely
// elegendő a később érkezőknek. Ha nem az, a később jövők nem férnek befelé, és
// KIFELÉ szorulnak — ez borítja fel a rendet („a legkisebbek középen").
//
// A mérés MÉRET-TIZEDENKÉNT: a síkidomokat méret szerint tíz csoportra osztjuk, és
// megnézzük az átlagos középpont-távolságukat. Ha a mag elég nagy volt, ez a tíz
// átlag KIFELÉ NŐ — a legkisebbek a közép körül, a legnagyobbak a szélen.
//
// SZÁNDÉKOSAN NEM azt követeljük, hogy a körök tökéletesen egymásba ágyazódjanak:
// a valódi kör-pakolás a korábbi gyűrűk RÉSEIBE is tesz, tehát a szigorú
// „minden új kör beljebb" feltétel akkor is megsérülne, ha a modell hibátlan.
function magElegEllenorzes(lerakottak) {
  const rendezett = [...lerakottak].sort((a, b) => a.sugar - b.sugar);
  const tizedMeret = Math.max(1, Math.floor(rendezett.length / 10));

  const atlagok = [];
  for (let i = 0; i + tizedMeret <= rendezett.length && atlagok.length < 10; i += tizedMeret) {
    const csoport = rendezett.slice(i, i + tizedMeret);
    const osszeg = csoport.reduce((s, l) => s + Math.hypot(l.x, l.y), 0);
    atlagok.push(osszeg / csoport.length);
  }

  let sertes = 0;
  for (let i = 1; i < atlagok.length; i++) {
    if (atlagok[i] < atlagok[i - 1] - 1e-12) sertes++;
  }

  const elso = atlagok[0]?.toFixed(4) ?? '–';
  const utolso = atlagok[atlagok.length - 1]?.toFixed(4) ?? '–';

  naplo('       méret-tizedek átlagos középtávolsága (legkisebbtől a legnagyobbig):');
  naplo('       ' + atlagok.map(a => a.toFixed(4)).join('  '));

  allitas(sertes === 0, 'A fenntartott mag elég — a méret kifelé nő (tizedenként)',
    sertes === 0
      ? `a legkisebb tized átlagosan ${elso}, a legnagyobb ${utolso} távolságra (σ = ${MAG_SURUSEG})`
      : `${sertes} tizednél megfordul a sorrend — a mag kicsi (σ = ${MAG_SURUSEG})`);
}

// 9. A LYUK NEM NAGYOBB AZ INDOKOLTNÁL
// A 8. állítás a SORRENDET méri (kicsik belül), ez viszont a MÉRETET: mekkora a
// tényleges középső üresség ahhoz képest, amennyit a hátralévők indokolnak.
//
// Ezt az állítást azért kellett megírni, mert a 8. NEM fogta meg a 2026-08-09-i
// hibát: a nézet a megnyitáskor egyszerre kapott 150 gyökeret, és őket egy olyan
// mag köré pakolta, ami MINDEN 405 testvérre volt méretezve (T_hátra a lerakandó
// adagot is tartalmazta). A sorrend közben végig helyes maradt — csak a lyuk lett
// 5,4-szer akkora a kelleténél, és mivel semmi nem mozdul, ott is ragadt.
//
// A várt lyuk: a MÉG HELY NÉLKÜLIEK (a futás végén: senki) területéből. Ha a
// futás végére mindenki lekerült, a lyuknak gyakorlatilag el kell tűnnie — a
// tűrés a legkisebb síkidom átmérője, mert a legbelső kör körül mindig marad egy
// kis rés.
function lyukMeretEllenorzes(lerakottak, varolista) {
  const { magSugarRel } = meretek(lerakottak);
  const legkisebbSugar = Math.min(...lerakottak.map(l => l.sugar));

  // Ami még hely nélkül maradt, annak a területéből adódó indokolt lyuk
  const hatraPont = varolista.reduce((s, v) => s + v.pont, 0);
  const indokolt = Math.sqrt(hatraPont / (SZINT_OSZTO * SZULO_PONT * MAG_SURUSEG));

  // Tűrés: az indokolt lyuk + két legkisebb sugár (a legbelső kör körüli rés)
  const felsoHatar = indokolt + 2 * legkisebbSugar;
  const rendben = magSugarRel <= felsoHatar + 1e-9;

  allitas(rendben, 'A lyuk nem nagyobb az indokoltnál',
    `mért ${magSugarRel.toFixed(4)} · indokolt ${indokolt.toFixed(4)} · ` +
    `felső határ ${felsoHatar.toFixed(4)}`);
}

// ===== FUTTATÁS =====
naplo('');
naplo('===== SÍKIDOM-PAKOLÁS MÉRŐPRÓBA =====');
naplo(`Gyerekek: ${GYEREK_DARAB} · zoom-lépés: ×${ZOOM_SZORZO} · kezdő képernyő-sugár: ${KEZDO_KEPSUGAR} px`);
naplo(`Láthatósági küszöb: ${MIN_KEP_ATMERO} px átmérő · lyuk cél-átmérője: ${MAG_CEL_ATMERO} px`);
naplo('');

const gyerekek = tesztGyerekek(GYEREK_DARAB);
const kezdet = Date.now();
const { lerakottak, varolista, lepesek, ujrapakolasok, legdragabb, elsoHelyek } = bejaras(gyerekek);
const idotartam = Date.now() - kezdet;

naplo('--- NAGYÍTÁS-LÉPÉSEK ---');
naplo('  kör   képsugár   lerakva   várólistán   lyuk(px)   idő(ms)');
for (const l of lepesek) {
  naplo(`  ${String(l.kor).padStart(3)}   ${String(l.kepSugar).padStart(8)}   ${String(l.lerakott).padStart(7)}   ${String(l.varolistan).padStart(10)}   ${String(l.lyukKepAtmero).padStart(8)}   ${l.ms.toFixed(0).padStart(7)}`);
}
naplo('');

naplo('--- ELLENŐRZÉSEK ---');
atfedesEllenorzes(lerakottak);
hianyEllenorzes(gyerekek, lerakottak, varolista);
beagyazasEllenorzes(lerakottak);
monotoniaEllenorzes(lerakottak);
lyukEllenorzes(lepesek);
stabilitasEllenorzes(lerakottak, elsoHelyek);
magElegEllenorzes(lerakottak);
lyukMeretEllenorzes(lerakottak, varolista);
determinizmusEllenorzes(gyerekek);
naplo('');

naplo(`Újrapakolás: ${ujrapakolasok}× · a legdrágább lépés: ${legdragabb.toFixed(0)} ms`);
naplo(`Futásidő (3 teljes bejárás): ${idotartam} ms + a determinizmus-próba`);
naplo(hibak.length === 0
  ? '===== MINDEN ELLENŐRZÉS RENDBEN ====='
  : `===== ${hibak.length} ELLENŐRZÉS MEGBUKOTT =====`);
naplo('');

process.exit(hibak.length === 0 ? 0 : 1);
