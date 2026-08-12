// backend/tools/sikidomMelysegProba.mjs

// ===== A MÉLYSÉGI NAGYÍTÁS MÉRŐPRÓBÁJA =====
//
// Felelősség: böngésző nélkül eldönteni, hogy a horgony-keretes technológia
// tényleg KORLÁTLAN nagyítást ad-e — vagy elfogynak a lebegőpontos számok.
//
// MIÉRT KELL (2026-08-11, Csaba böngészős találata):
// az 50 szintű mély láncon a nézet nagyjából a 20. szintnél „szétesett", és a
// nagyítási érték ~1e-21 körül járt. Ez a `double` pontosságának a széle. A kérdés,
// amit ez a próba eldönt: a horgonyváltás MEGVÉD-e ettől, vagy sem.
//
// A MÉRÉS: ugyanaz a lánc, mint az adatbázisban (50 szint, szintenként 1 pont),
// és egy lépésenkénti nagyítás-söprés a legfelső szinttől a legalsóig. Minden
// lépésnél megnézzük:
//   - hol tart a horgony (melyik szinten),
//   - mekkora a `nezet.skala` (ez az, amit Csaba a böngészőben látott),
//   - és hogy a KÉPERNYŐ-KÉP pontos-e — vagyis a horgony-kereten át számolt hely
//     megegyezik-e a független, EGZAKT referenciával.
//
// AZ EGZAKT REFERENCIA. A lánc egyenes: minden szinten pontosan egy gyerek. Egy
// d-edik szintű csomópont képernyő-sugara tehát a szorzatok szorzata. Ezt a
// szorzatot LOGARITMUSBAN is kiszámoljuk (∑ log relR), ahol nincs alulcsordulás —
// ez a mérce, amihez a lebegőpontos utat hasonlítjuk.
//
// Futtatás:  node backend/tools/sikidomMelysegProba.mjs

// --- IMPORTÁLÁSOK ---
import {
  keretbenCsomopont, szuloKeretben, horgonyValtasNezet, kepernyore,
  horgonyValtasSzukseges, LEFELE_KUSZOB, FOLFELE_KUSZOB
} from '../../frontend/js/utils/sikidomHorgony.js';
import { gyerekRelativSugar } from '../../frontend/js/utils/sikidomMeret.js';
// A nagyítás számtana (2026-08-11 óta külön, DOM-független modul) — az utolsó
// szakasz a két nagyítási határt és a gesztus-mérést méri.
import {
  kifeleHatarolas, befeleHatarolas, gesztusAllapot, gorgoSzorzo,
  KIFELE_HATAR, BEFELE_HATAR
} from '../../frontend/js/utils/sikidomNagyitas.js';

const naplo = (...ertekek) => process.stdout.write(ertekek.join(' ') + '\n');

const hibak = [];
let allitasDb = 0;
function allitas(rendben, cimke, reszlet = '') {
  allitasDb++;
  if (!rendben) hibak.push(`${cimke}${reszlet ? ' — ' + reszlet : ''}`);
  naplo(`  ${rendben ? '✔' : '✘'} ${cimke}${reszlet ? '  (' + reszlet + ')' : ''}`);
}

// ===== A LÁNC FELÉPÍTÉSE =====
// Pontosan úgy, ahogy az adatbázisban van: 50 szint, mindenki 1 saját pontot kap,
// tehát a d-edik szint HIERARCHIKUS pontja (MELYSEG − d + 1).
const MELYSEG = 50;
const KEPERNYO = 800;            // a képernyő kisebbik oldala képpontban

// A csomópont-tár: id → { id, szuloId, relX, relY, relR, gyerekIdk }
const tar = new Map();

const GYOKER = 'sz0';
tar.set(GYOKER, { id: GYOKER, szuloId: null, relX: 0, relY: 0, relR: 1, gyerekIdk: [] });

// A gyerek helye a szülő sugarának egységében. A VALÓDI láncban ez 0: ha minden
// testvér le van töltve, a pakoló a legkisebbet — itt az egyetlent — a KÖZÉPPONTBA
// teszi. Az eltolt esetet is mérni akarjuk, ezért paraméter:
//   node backend/tools/sikidomMelysegProba.mjs 0.35
const ELTOLAS = Number.isFinite(Number(process.argv[2])) ? Number(process.argv[2]) : 0;

for (let d = 1; d <= MELYSEG; d++) {
  const szuloId = d === 1 ? GYOKER : `sz${d - 1}`;
  const id = `sz${d}`;

  // A hierarchikus pontok: a szülőé eggyel több, mint a gyereké
  const gyerekPont = MELYSEG - d + 1;
  const szuloPont = MELYSEG - d + 2;

  const relR = gyerekRelativSugar(gyerekPont, szuloPont);

  tar.set(id, { id, szuloId, relX: ELTOLAS, relY: 0, relR, gyerekIdk: [] });
  tar.get(szuloId).gyerekIdk.push(id);
}

// ===== EGZAKT REFERENCIA LOGARITMUSBAN =====
// A d-edik szint sugara a GYÖKÉR keretében: ∏ relR. Logaritmusban összeadás,
// tehát sem alul-, sem túlcsordulás nincs.
const logSugar = [0];
for (let d = 1; d <= MELYSEG; d++) {
  logSugar[d] = logSugar[d - 1] + Math.log(tar.get(`sz${d}`).relR);
}

// ===== A HORGONYVÁLTÁS (a SikidomModal._horgonyEllenorzes mása) =====
// Szándékosan ugyanaz a szerkezet, hogy amit itt mérünk, az a valódi viselkedés.
function horgonyEllenorzes(allapot) {
  for (let lepes = 0; lepes < 8; lepes++) {
    const cs = tar.get(allapot.horgony);
    if (!cs) break;

    const gyerekKeretek = cs.gyerekIdk
      .map(gid => tar.get(gid))
      .filter(Boolean)
      .map(gy => ({ id: gy.id, keret: { x: gy.relX, y: gy.relY, r: gy.relR } }));

    const vanSzulo = !!(cs.szuloId && tar.has(cs.szuloId));

    // A képernyő közepe — a lefelé váltás POZÍCIÓ-feltételéhez (Csaba, 2026-08-11,
    // a koino_1.0 szabálya nyomán): csak abba a gyerekbe lépünk, amelyiken a
    // képernyő közepe rajta van.
    const kepKozep = { x: KEPERNYO / 2, y: KEPERNYO / 2 };

    const dontes = horgonyValtasSzukseges(allapot.nezet, KEPERNYO, gyerekKeretek, vanSzulo, kepKozep);
    if (!dontes) break;

    if (dontes.irany === 'le') {
      const gy = tar.get(dontes.gyerekId);
      allapot.nezet = horgonyValtasNezet(allapot.nezet, { x: gy.relX, y: gy.relY, r: gy.relR });
      allapot.horgony = gy.id;
    } else {
      const szKeret = szuloKeretben(tar, allapot.horgony);
      if (!szKeret) break;
      allapot.nezet = horgonyValtasNezet(allapot.nezet, szKeret);
      allapot.horgony = cs.szuloId;
    }
  }
}

function szint(id) { return id === GYOKER ? 0 : Number(id.slice(2)); }

// ===== 1. PRÓBA: NAGYÍTÁS-SÖPRÉS A LEGALSÓ SZINTIG =====
naplo('');
naplo('===== 1. PRÓBA: nagyítás-söprés a 0. szinttől az 50.-ig =====');
naplo(`  lánc: ${MELYSEG} szint · képernyő: ${KEPERNYO} px · eltolás: ${ELTOLAS}`);
naplo('');

// Kiindulás: a gyökér kitölti a képernyőt
let allapot = {
  horgony: GYOKER,
  nezet: { skala: KEPERNYO / 2, eltolasX: KEPERNYO / 2, eltolasY: KEPERNYO / 2 }
};

// A nagyítás középpontja: a képernyő közepe. Lépésenként 1,05-szörös nagyítás —
// ez elég apró ahhoz, hogy egyetlen horgony-küszöböt se ugorjunk át.
const LEPES_FAKTOR = 1.05;
const LEPESEK = 1600;

let legnagyobbSkala = 0;
let legkisebbSkala = Infinity;
let elertSzint = 0;
let legnagyobbHiba = 0;
let elsoHibasSzint = null;

// A nagyítást a LEGMÉLYEBB csomópont képernyő-helyére célozzuk (oda „megyünk be")
for (let i = 0; i < LEPESEK; i++) {
  // --- nagyítás a legmélyebb LÁTHATÓ csomópontra, KÖZÉPEN tartva ---
  // A célt szándékosan a képernyő közepén tartjuk: a lefelé váltás pozíció-feltétele
  // épp ezt kívánja meg, és ez felel meg annak, amikor az e-ember belenagyít valamibe.
  const cel = keretbenCsomopont(tar, allapot.horgony, `sz${Math.min(elertSzint + 2, MELYSEG)}`)
           ?? { x: 0, y: 0, r: 1 };

  const ujSkala = allapot.nezet.skala * LEPES_FAKTOR;
  allapot.nezet = {
    skala: ujSkala,
    eltolasX: KEPERNYO / 2 - ujSkala * cel.x,
    eltolasY: KEPERNYO / 2 - ujSkala * cel.y
  };

  horgonyEllenorzes(allapot);

  const h = szint(allapot.horgony);
  if (h > elertSzint) elertSzint = h;

  legnagyobbSkala = Math.max(legnagyobbSkala, allapot.nezet.skala);
  legkisebbSkala = Math.min(legkisebbSkala, allapot.nezet.skala);

  // --- PONTOSSÁG: a horgony képernyő-sugara az EGZAKT referenciához képest ---
  // A horgony sugara a saját keretében 1, tehát a képernyő-sugara maga a skála.
  // Az egzakt érték: a kiinduló skála × ∏relR × (a nagyítások szorzata).
  // A nagyítások szorzatát a NÉZET hordozza, ezért közvetlenül nem hasonlítható —
  // helyette azt mérjük, ami a képet ELRONTJA: a horgony és egy nála 5 szinttel
  // MÉLYEBB csomópont sugár-arányát, aminek egzakt értéke ismert.
  const melyebb = Math.min(h + 5, MELYSEG);
  if (melyebb > h) {
    const keret = keretbenCsomopont(tar, allapot.horgony, `sz${melyebb}`);
    if (keret) {
      const varhato = Math.exp(logSugar[melyebb] - logSugar[h]);
      const hiba = Math.abs(keret.r - varhato) / varhato;
      if (hiba > legnagyobbHiba) legnagyobbHiba = hiba;
      if (hiba > 1e-9 && elsoHibasSzint === null) elsoHibasSzint = h;
    }
  }

  if (elertSzint >= MELYSEG) break;
}

naplo(`  elért horgony-szint:      ${elertSzint} / ${MELYSEG}`);
naplo(`  skála tartománya:         ${legkisebbSkala.toExponential(3)} … ${legnagyobbSkala.toExponential(3)}`);
naplo(`  legnagyobb relatív hiba:  ${legnagyobbHiba.toExponential(3)}`);
naplo('');

allitas(elertSzint === MELYSEG, 'a horgony leér a legalsó szintig',
  `elért: ${elertSzint}`);
allitas(legkisebbSkala > 1 && legnagyobbSkala < 1e6,
  'a skála végig 1 körüli nagyságrendben marad (nem fogy el a double)',
  `${legkisebbSkala.toExponential(2)} … ${legnagyobbSkala.toExponential(2)}`);
allitas(legnagyobbHiba < 1e-9, 'a horgony-kereten át számolt sugár egzakt marad',
  `legnagyobb hiba: ${legnagyobbHiba.toExponential(2)}`);

// ===== 2. PRÓBA: MI TÖRTÉNNE HORGONY NÉLKÜL? =====
// Ugyanaz a lánc, de EGYETLEN, közös koordináta-rendszerben (a gyökérhez képest).
// Ez a koino_1.0 útja — és ez mutatja meg, honnan jön az 1e-21.
naplo('');
naplo('===== 2. PRÓBA: ugyanez horgony NÉLKÜL (a koino_1.0 útja) =====');

let abszolutSugar = 1;
let elveszettSzint = null;

for (let d = 1; d <= MELYSEG; d++) {
  abszolutSugar *= tar.get(`sz${d}`).relR;

  // Hány értékes tizedesjegy maradt? A double ~2.2e-16 relatív felbontású; ha a
  // sugárhoz képest az 1-es nagyságrendű koordináták felbontása durvább, mint a
  // sugár maga, a csomópont helye értelmezhetetlenné válik.
  const felbontas = Number.EPSILON;             // 1 körüli számok lépésköze
  if (elveszettSzint === null && abszolutSugar < felbontas) elveszettSzint = d;

  if (d % 10 === 0 || d === elveszettSzint) {
    naplo(`  ${String(d).padStart(2)}. szint: abszolút sugár = ${abszolutSugar.toExponential(3)}` +
      (d === elveszettSzint ? '   ← itt fogy el a double' : ''));
  }
}

naplo('');
naplo(`  a közös koordináta-rendszer a ${elveszettSzint}. szinten fogy el`);
naplo(`  (a Csaba által látott ~1e-21 a ${Math.round(Math.log(1.2e-21) / Math.log(0.2236))}. szint környéke)`);

// ===== 3. PRÓBA: A ROSSZ TESTVÉR (Csaba böngészős találata, 2026-08-11) =====
// A hiba, ami miatt a horgony nem oda ment, ahova az e-ember nagyított: a döntés
// CSAK a méretet nézte, ezért a legnagyobb testvért választotta akkor is, ha az
// már rég kicsúszott a képből. Böngészőben mérve: a képernyőn a lánc látszott, a
// horgony mégis a mező legerősebb gyerekére állt.
//
// A koino_1.0 szabálya ezt eleve kizárta: `distanceFromCenter <= content.radius`,
// vagyis a képernyő közepének a síkidomon BELÜL kell lennie.
naplo('');
naplo('===== 3. PRÓBA: a rossz testvér — méret ÉS pozíció =====');

{
  const kepernyo = 800;
  const skala = 4000;
  const nezet = { skala, eltolasX: kepernyo / 2, eltolasY: kepernyo / 2 };
  const kepKozep = { x: kepernyo / 2, y: kepernyo / 2 };

  // NAGY testvér, de FÉLRE: átmérője 1 760 px (a küszöb 1 600), viszont a
  // középpontja 2 800 px-re van a képernyő közepétől, a sugara csak 880.
  // KICSI testvér, de KÖZÉPEN: átmérője pont 1 600 px, a közepén ül.
  const gyerekek = [
    { id: 'NAGY_FELRE',  keret: { x: 0.7, y: 0, r: 0.22 } },
    { id: 'KISEBB_KOZEPEN', keret: { x: 0,   y: 0, r: 0.20 } }
  ];

  const dontes = horgonyValtasSzukseges(nezet, kepernyo, gyerekek, true, kepKozep);

  for (const gy of gyerekek) {
    const kep = kepernyore(nezet, gy.keret);
    const tav = Math.hypot(kep.kepX - kepKozep.x, kep.kepY - kepKozep.y);
    naplo(`  ${gy.id.padEnd(15)} átmérő=${Math.round(2 * kep.kepSugar)} px ` +
      `(küszöb ${kepernyo * LEFELE_KUSZOB}) · közép-távolság=${Math.round(tav)} px ` +
      `(sugár ${Math.round(kep.kepSugar)}) → ${tav <= kep.kepSugar ? 'RAJTA' : 'nincs rajta'}`);
  }
  naplo(`  döntés: ${dontes ? dontes.irany + ' → ' + dontes.gyerekId : 'nincs váltás'}`);
  naplo('');

  allitas(dontes && dontes.gyerekId === 'KISEBB_KOZEPEN',
    'a horgony ARRA vált, amin a képernyő közepe van (nem a legnagyobbra)',
    dontes ? dontes.gyerekId : 'nincs váltás');

  // És ha a képernyő közepén SENKI nincs, akkor nem szabad váltani
  const felreDontes = horgonyValtasSzukseges(
    nezet, kepernyo, [{ id: 'NAGY_FELRE', keret: { x: 0.7, y: 0, r: 0.22 } }], true, kepKozep);
  allitas(felreDontes === null,
    'ha a képernyő közepén nincs elég nagy gyerek, NINCS lefelé váltás',
    felreDontes ? felreDontes.irany + ' → ' + felreDontes.gyerekId : 'nincs váltás');
}

// ===== A NAGYÍTÁS KÉT HATÁRA (2026-08-11) =====
// A nagyítás számtana külön, DOM-független modulba került
// (`frontend/js/utils/sikidomNagyitas.js`), tehát innentől mérhető. Ez a szakasz
// a KÉT HATÁRT igazolja — azt, ami nélkül a kép „a 19-20. szint után szétesett".
naplo('===== A NAGYÍTÁS KÉT HATÁRA (sikidomNagyitas.js) =====');
{
  const kepernyoMeret = 800;

  // --- KIFELÉ: a VILÁG szintnél megáll ---
  const alapSkala = 100;
  allitas(kifeleHatarolas({ szorzo: 1.2, vilagSzinten: true, alapSkala, skala: 50 }) === 1.2,
    'befelé a KIFELÉ-korlát sosem szól bele');
  allitas(kifeleHatarolas({ szorzo: 0.8, vilagSzinten: false, alapSkala, skala: 10 }) === 0.8,
    'mélyebb horgonynál nincs kifelé-korlát (van hova fölfelé lépni)');
  allitas(kifeleHatarolas({ szorzo: 0.8, vilagSzinten: true, alapSkala: null, skala: 50 }) === 0.8,
    'illesztés előtt nincs korlát');
  allitas(kifeleHatarolas({ szorzo: 0.8, vilagSzinten: true, alapSkala, skala: 25 }) === 1,
    'a határon (az illesztési skála negyede) MEGÁLL',
    `alapSkala ${alapSkala} × ${KIFELE_HATAR} = ${alapSkala * KIFELE_HATAR}`);
  {
    // a határ FÖLÖTT: pont a határig enged, nem tovább
    const szorzo = kifeleHatarolas({ szorzo: 0.5, vilagSzinten: true, alapSkala, skala: 30 });
    const ujSkala = 30 * szorzo;
    allitas(Math.abs(ujSkala - alapSkala * KIFELE_HATAR) < 1e-9,
      'a kifelé nagyítás PONTOSAN a határig enged',
      `30 → ${ujSkala.toFixed(4)}`);
  }

  // --- BEFELÉ: csak ha nincs hova lelépni ---
  const felsoHatar = (kepernyoMeret * BEFELE_HATAR) / 2;
  allitas(befeleHatarolas({ szorzo: 0.8, vanHovaLelepni: false, kepernyoMeret, skala: 1e9 }) === 0.8,
    'kifelé a BEFELÉ-korlát sosem szól bele');
  allitas(befeleHatarolas({ szorzo: 5, vanHovaLelepni: true, kepernyoMeret, skala: 1e9 }) === 5,
    'ha VAN betöltött gyerek, nincs korlát (a horgonyváltás megfogja)');
  allitas(befeleHatarolas({ szorzo: 5, vanHovaLelepni: false, kepernyoMeret, skala: felsoHatar }) === 1,
    'gyerek nélkül a felső határon MEGÁLL',
    `felsőHatár = ${Math.round(felsoHatar)} px`);
  {
    const skala = felsoHatar / 2;
    const szorzo = befeleHatarolas({ szorzo: 100, vanHovaLelepni: false, kepernyoMeret, skala });
    allitas(Math.abs(skala * szorzo - felsoHatar) < 1e-9,
      'a befelé nagyítás PONTOSAN a határig enged',
      `${skala.toFixed(1)} → ${(skala * szorzo).toFixed(1)}`);
  }

  // --- A LÉNYEG: a két határ EGYÜTT nem engedi elszaladni a skálát ---
  // Ez volt a 2026-08-11-i tünet oka: gyerek nélküli horgonyon a skála
  // 1,18·10³-ról 1,81·10¹⁴-re szaladt, és a `double` 16 jegye elfogyott.
  {
    let skala = 1000;
    for (let i = 0; i < 500; i++) {
      const szorzo = befeleHatarolas({
        szorzo: kifeleHatarolas({ szorzo: 1.2, vilagSzinten: false, alapSkala, skala }),
        vanHovaLelepni: false, kepernyoMeret, skala
      });
      skala *= szorzo;
    }
    allitas(skala <= felsoHatar + 1e-6,
      '500 befelé nagyítás UTÁN sem szalad el a skála (ez volt a „szétesik" oka)',
      `skála = ${skala.toFixed(1)} ≤ ${felsoHatar.toFixed(1)}`);
  }

  // --- A GESZTUS-MÉRÉS ---
  allitas(gesztusAllapot([]) === null, 'ujj nélkül nincs gesztus-állapot');
  {
    const egy = gesztusAllapot([{ x: 10, y: 20 }]);
    allitas(egy.kozepX === 10 && egy.kozepY === 20 && egy.tavolsag === 0,
      'egy ujjnál a „középpont" maga az ujj, a távolság 0 (nincs nagyítás, csak mozgatás)');
  }
  {
    const ketto = gesztusAllapot([{ x: 0, y: 0 }, { x: 6, y: 8 }]);
    allitas(ketto.kozepX === 3 && ketto.kozepY === 4 && ketto.tavolsag === 10,
      'két ujjnál a középpont és a távolság a csippentéshez');
    const harom = gesztusAllapot([{ x: 0, y: 0 }, { x: 6, y: 8 }, { x: 99, y: 99 }]);
    allitas(harom.tavolsag === 10, 'három ujjnál sem esik szét (az első kettő számít)');
  }

  // --- A GÖRGŐ EGYSÉGEI ---
  // Egy egérgörgő-kattanás MINDEN böngészőben ugyanakkorát nagyítson: a
  // képpontos deltaY = 100 és a soros deltaY = 3 ugyanoda vezet.
  {
    const keppontos = gorgoSzorzo({ deltaY: -100, deltaMode: 0, ctrlKey: false });
    const soros     = gorgoSzorzo({ deltaY: -3,   deltaMode: 1, ctrlKey: false });
    allitas(Math.abs(keppontos - soros) < 1e-12,
      'egy egérgörgő-kattanás a Firefoxban (sor) és máshol (képpont) UGYANANNYI',
      `${keppontos.toFixed(6)} vs ${soros.toFixed(6)}`);
    allitas(keppontos > 1, 'a fölfelé görgetés BEFELÉ nagyít', keppontos.toFixed(4));
    const csippentes = gorgoSzorzo({ deltaY: -3, deltaMode: 0, ctrlKey: true });
    allitas(csippentes > gorgoSzorzo({ deltaY: -3, deltaMode: 0, ctrlKey: false }),
      'az érintőpad-csippentés érzékenyebb, mint az azonos deltájú görgetés');
  }
  naplo('');
}

// ===== ÖSSZEGZÉS =====
naplo('');
naplo('=================== EREDMÉNY ===================');
if (hibak.length === 0) {
  naplo(`Mind a ${allitasDb} állítás áll — a horgony-keretes nagyítás ${MELYSEG} szinten át ` +
    `pontos, a horgony arra vált, amire nézel,`);
  naplo('és a nagyítás két határa nem engedi elszaladni a skálát.');
} else {
  naplo(`${hibak.length} ÁLLÍTÁS BUKOTT:`);
  for (const h of hibak) naplo(`  ✘ ${h}`);
}
naplo('');

process.exit(hibak.length ? 1 : 0);
