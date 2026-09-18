// koino/meres/buliMeres.js — MENNYIT ÉR AZ ÖSSZEHANGOLT ABLAK? (30. mérés)

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT.
//
// ===== A KÉRDÉS, AMIT A TERV NYITVA HAGYOTT =====
//
// A fázis-2 terv a „buli"-ról (Csaba: *„olyan lenne, mint egy buli: amikor a legforróbb a
// hangulat, akkor a legkönnyebb elérni egymást"*) három darabot ír elő az `orjarat`-hoz:
//
//   1. **igazítsa a kört a percfordulóhoz** — hogy a buli egyszerre kezdődjön;
//   2. a kör elején **kopogjon rá minden társra** (a NAT-rés nyitása);
//   3. **ismételje a kört, amíg van újdonság** — ma egyszer megy végig a listán.
//
// ⛔⛔ A 2. INDOKA MÁR MÉRVE VAN, ÉS TEREPEN: *„NINCS FULL CONE"* (2026-08-30) — 14 146
// kopogás alatt a laptop SEMMIT nem kapott meg attól, akinek ő maga nem küldött. Vagyis az
// előre nyitogatás nem opció, hanem az egyetlen út.
//
// ⚠️⚠️ **AZ 1. ÉS A 3. VISZONT SZÁMÍTVA VAN, NEM MÉRVE** — a terv szó szerint kimondja:
// *„a nemzedék-számítás levezetett, nem mért"*. Ez a lap ezt a két darabot méri meg.
//
// ===== MIÉRT NEM A `felszabaditasMeres.js` MÉRI EZT =====
//
// Ott az ébrenlét **körönkénti érmedobás** (`veletlen() < ebrenlet`) — ⛔ és ez pontosan
// azt rejti el, ami itt a kérdés: hogy az ébrenlét **IDŐBEN HOL VAN**. Két készülék attól
// találkozik, hogy az ablakaik **átfednek**, nem attól, hogy mindkettő „ébren volt aznap".
// *Egy független érmedobás beépíti a válaszba, amit mérni akarunk.*
//
// ===== A MODELL =====
//
// Minden készülék `ebredesKoz` másodpercenként ébred `ablak` másodpercre. A fázisa:
//
//   · **igazítás nélkül** — véletlen (0…ebredesKoz). Ez a MAI állapot: a `setTimeout` az
//     INDÍTÁS pillanatától számol, tehát a fázist az szabja meg, ki mikor kapcsolta be;
//   · **percfordulóhoz igazítva** — mindenkinél 0. Ez a terv 1. darabja.
//
// Két készülék akkor cserél, ha társak ÉS az ablakaik átfednek. A tudás a cserével terjed.
//
// ⭐ ÉS A 3. DARAB KÜLÖNBSÉGE, PONTOSAN: egy átfedés alatt
//   · **egy menet** — a pár kicseréli, amit tud (EGY lépés a láncban);
//   · **ismételt menet** — az egyszerre ébren lévő, összefüggő csoport **kiegyenlítődik**
//     (ez a „nemzedékenkénti" terjedés: amit az 5. társtól kaptam, azt az 1. is megkapja,
//     még ugyanabban az ablakban).
//
// ⚠️ AMIT SZÁNDÉKOSAN NEM MODELLEZ: a csere protokollját (azt a `csereProba.js` őrzi), a
// hálózati hibát, a NAT-rés nyitását (terepmérés), és az adat-árat (azt a terv számolja).
// *Egy műszer, egy kérdés.*
//
//   node koino/meres/buliMeres.js                 → az alap-készlet
//   node koino/meres/buliMeres.js 200 14 30 300   → N, társ, ablak(mp), köz(mp)

const kiir = (sz = '') => process.stdout.write(String(sz) + String.fromCharCode(10));

// ===================================
// MAGVAS VÉLETLEN — hogy a futások összevethetők legyenek
// ===================================

function magvasVeletlen(mag) {
  let a = mag >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================================
// EGY LEJÁTSZÁS
// ===================================

/**
 * @param {boolean} igazitva - a fázis 0 mindenkinél (a terv 1. darabja)
 * @param {boolean} ismetelt - az ablakon belül a csoport kiegyenlítődik (a 3. darab)
 * @returns {{elert: number, ido: number|null}} hányan tudják a végén, és mikor tudta meg az utolsó
 */
function lejatszas({ n, tarsak, ablak, ebredesKoz, hossz, igazitva, ismetelt, sodrodas, veletlen }) {
  // ----- A HÁLÓZAT -----
  // ⚠️ A társ-viszony a koinóban nem kölcsönös, a CSERE viszont igen (aki hív, az is ad) —
  // ezért az élt kölcsönösnek vesszük, ahogy a `felszabaditasMeres.js` is.
  const elek = [];
  const szomszedok = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    while (szomszedok[i].size < Math.min(tarsak, n - 1)) {
      const j = Math.floor(veletlen() * n);
      if (j !== i) szomszedok[i].add(j);
    }
  }
  for (let i = 0; i < n; i++) {
    for (const j of szomszedok[i]) if (i < j || !szomszedok[j].has(i)) elek.push([i, j]);
  }

  // ----- A FÁZISOK ÉS A SODRÓDÁS -----
  // ⛔ EZ A MÉRÉS LELKE. Igazítás nélkül a fázist az szabja meg, ki mikor kapcsolta be a
  // készülékét — vagyis véletlen. Igazítva mindenki ugyanakkor ébred.
  //
  // ⚠️⚠️ ÉS A SODRÓDÁS NÉLKÜL A MÉRÉS FEKETÉBBRE FESTENÉ A MAI ÁLLAPOTOT, MINT AMILYEN.
  // A mai kód `setTimeout(perc * 60 * 1000)`-t hív a kör UTÁN, tehát a csere ideje
  // hozzáadódik: minden készülék köze kicsit más. ⭐ Fix közzel a találkozás
  // **determinisztikus** lenne — vagy mindig, vagy SOHA —, a valóságban viszont a fázisok
  // lassan **egymásba vándorolnak**, és előbb-utóbb minden pár találkozik.
  // *Ezt be kell építeni, különben a mérés azt állítaná, hogy ma semmi nem működik.*
  const fazis = [];
  const kozok = [];
  for (let i = 0; i < n; i++) {
    fazis.push(igazitva ? 0 : veletlen() * ebredesKoz);
    // ⭐ Igazításnál a köz is rögzül (a percfordulóhoz igazítunk, nem a kör végéhez),
    // tehát ott nincs sodródás — épp ez az igazítás lényege.
    kozok.push(igazitva ? ebredesKoz : ebredesKoz + veletlen() * sodrodas);
  }

  // ----- AZ IDŐSZELETEK -----
  // Minden ébredés egy [kezdet, vég] szakasz. A határaikon változik, ki van ébren, tehát
  // elég ezeken a pontokon dolgozni — nem kell másodpercenként lépkedni.
  const hatarok = new Set([0, hossz]);
  for (let i = 0; i < n; i++) {
    for (let t = fazis[i]; t < hossz; t += kozok[i]) {
      hatarok.add(Math.min(t, hossz));
      hatarok.add(Math.min(t + ablak, hossz));
    }
  }
  const pontok = [...hatarok].sort((a, b) => a - b);

  // ----- A TUDÁS -----
  // Egyetlen eseményt követünk: a 0. készüléknél indul. *A kérdés nem az, mennyi adat megy
  // át, hanem hogy MEDDIG TART, amíg egy hír körbeér — és hogy körbeér-e egyáltalán.*
  const ismeri = new Array(n).fill(false);
  ismeri[0] = true;
  let utolsoIdo = null;
  let elert = 1;

  const ebrenE = (i, t) => {
    const eltelt = t - fazis[i];
    if (eltelt < 0) return false;
    return (eltelt % kozok[i]) < ablak;
  };

  for (let sz = 0; sz < pontok.length - 1; sz++) {
    // A szakasz KÖZEPÉN nézzük, ki van ébren — a határon a nyitás/zárás egybeeshet.
    const kozep = (pontok[sz] + pontok[sz + 1]) / 2;
    if (kozep >= hossz) break;

    const ebren = [];
    for (let i = 0; i < n; i++) if (ebrenE(i, kozep)) ebren.push(i);
    if (ebren.length < 2) continue;

    const ebrenE_ = new Array(n).fill(false);
    for (const i of ebren) ebrenE_[i] = true;

    if (ismetelt) {
      // ⭐ ISMÉTELT MENET: az ablakon belül a kör újraindul, amíg van újdonság — tehát az
      // egyszerre ébren lévő, ÖSSZEFÜGGŐ csoport teljesen kiegyenlítődik.
      let valtozott = true;
      while (valtozott) {
        valtozott = false;
        for (const [i, j] of elek) {
          if (!ebrenE_[i] || !ebrenE_[j]) continue;
          if (ismeri[i] !== ismeri[j]) { ismeri[i] = ismeri[j] = true; valtozott = true; }
        }
      }
    } else {
      // EGY MENET: a lista egyszer fut végig, tehát a hír egy lépést tesz.
      // ⚠️ A pillanatképből dolgozunk, különben a lista SORRENDJE adna ingyen terjedést.
      const elotte = ismeri.slice();
      for (const [i, j] of elek) {
        if (!ebrenE_[i] || !ebrenE_[j]) continue;
        if (elotte[i] || elotte[j]) { ismeri[i] = ismeri[j] = true; }
      }
    }

    const most = ismeri.reduce((o, e) => o + (e ? 1 : 0), 0);
    if (most > elert) { elert = most; utolsoIdo = kozep; }
    if (elert === n) break;
  }

  return { elert, ido: elert === n ? utolsoIdo : null };
}

// ===================================
// A MÉRÉS
// ===================================

function meres({ n, tarsak, ablak, ebredesKoz, hossz, igazitva, ismetelt, sodrodas, ismetles, mag }) {
  let osszElert = 0;
  let teljes = 0;
  const idok = [];

  for (let k = 0; k < ismetles; k++) {
    const e = lejatszas({
      n, tarsak, ablak, ebredesKoz, hossz, igazitva, ismetelt, sodrodas,
      veletlen: magvasVeletlen(mag + k)
    });
    osszElert += e.elert;
    if (e.ido !== null) { teljes++; idok.push(e.ido); }
  }

  idok.sort((a, b) => a - b);
  return {
    atlagElert: osszElert / ismetles / n,
    mindenkihez: teljes / ismetles,
    medianIdo: idok.length ? idok[Math.floor(idok.length / 2)] : null
  };
}

const ervek = process.argv.slice(2);
const N = parseInt(ervek[0], 10) || 100;
const TARSAK = parseInt(ervek[1], 10) || 14;
const ABLAK = parseInt(ervek[2], 10) || 30;
const KOZ = parseInt(ervek[3], 10) || 300;
const ISMETLES = parseInt(ervek[4], 10) || 200;
const MAG = parseInt(process.env.KOINO_MAG ?? '', 10) || 20260915;

// Két óra: ennyi idő alatt egy 5 perces ütemben 24 ablak fér el.
// ⭐ A SODRÓDÁS: mennyivel hosszabb egy kör a névlegesnél (a csere ideje). A mai kód a
// kör UTÁN vár, tehát ez hozzáadódik — 14 társ × ~200 ms ≈ 3 mp.
const SODRODAS = parseFloat(process.env.KOINO_SODRODAS ?? '') || 3;
const HOSSZ = parseFloat(process.env.KOINO_ORA ?? '') * 3600 || 2 * 3600;

kiir('');
kiir('⭐ MENNYIT ÉR AZ ÖSSZEHANGOLT ABLAK? — a „buli" (30. mérés)');
kiir('');
kiir('  ' + N + ' készülék · ' + TARSAK + ' társ · ablak ' + ABLAK + ' mp · ütem '
  + (KOZ / 60) + ' perc · ' + (HOSSZ / 3600) + ' óra · ' + ISMETLES + ' futás');
kiir('');
kiir('  ' + 'változat'.padEnd(34) + 'elér'.padStart(8) + 'mindenkihez'.padStart(13)
  + 'medián idő'.padStart(12));
kiir('  ' + '─'.repeat(70));

function sor(cimke, be) {
  const e = meres({ n: N, tarsak: TARSAK, ablak: ABLAK, ebredesKoz: KOZ,
    hossz: HOSSZ, ismetles: ISMETLES, mag: MAG, sodrodas: SODRODAS, ...be });
  kiir('  ' + cimke.padEnd(34)
    + (e.atlagElert * 100).toFixed(0).padStart(7) + '%'
    + (e.mindenkihez * 100).toFixed(0).padStart(12) + '%'
    + (e.medianIdo === null ? '—' : (e.medianIdo / 60).toFixed(1) + ' perc').padStart(12));
}

sor('(a) MA: nincs igazítás, egy menet', { igazitva: false, ismetelt: false });
sor('(b) igazítva, egy menet', { igazitva: true, ismetelt: false });
sor('(c) igazítva + ismételt menet', { igazitva: true, ismetelt: true });
kiir('');
sor('(d) nincs igazítás + ismételt menet', { igazitva: false, ismetelt: true });

kiir('');
kiir('  ⭐ Az „elér" az ÁTLAGOS hányad, amihez a hír eljut; a „mindenkihez" az a hányad,');
kiir('     ahol MINDENKI megtudta. A medián idő csak a teljes futásokra vonatkozik.');
kiir('');

// ===================================
// ⛔⛔ ÉS A 9. SZABÁLY PRÓBÁJA: HÁNY MENET KELL EGY ABLAKBAN?
// ===================================
//
// ⚠️⚠️ A FENTI TÁBLÁZAT AZT MUTATJA, HOGY AZ IDŐ NEM NŐ A MÉRETTEL — de ez csak akkor
// igaz, ha a menetek **beleférnek** az ablakba. A kódban `MENET_KORLAT = 5` áll, és ez
// **egy általam beírt szám**: ha a hír menetenként ~T-szeresére terjed, öt menet ≈ T⁵
// készülékig elég. ⛔ **Egymilliárdnál ez kevés lehet — és akkor a darab a 9. szabály
// szerint NINCS KÉSZ.**
//
// ⭐ Ez a szakasz **csak a meneteket** számolja (a teljes időtengely nélkül), ezért
// nagy hálózatokon is fut. A modell a legjobb eset: **mindenki ébren, egy ablakban** —
// vagyis a kapott szám **alsó korlát**, a valóságban több kell.

kiir('  ⛔ HÁNY MENET KELL EGY ABLAKBAN? — a 9. szabály próbája (MENET_KORLAT = 5)');
kiir('  ' + '─'.repeat(70));
kiir('  ' + 'készülék'.padStart(12) + 'társ'.padStart(7) + 'menet (átlag)'.padStart(16)
  + 'legrosszabb'.padStart(14) + 'elég az 5?'.padStart(12));

function menetSzamMeres(n, tarsak, ismetles, mag) {
  let ossz = 0;
  let legrosszabb = 0;
  for (let k = 0; k < ismetles; k++) {
    const veletlen = magvasVeletlen(mag + k);
    const szomszedok = Array.from({ length: n }, () => new Set());
    for (let i = 0; i < n; i++) {
      while (szomszedok[i].size < Math.min(tarsak, n - 1)) {
        const j = Math.floor(veletlen() * n);
        if (j !== i) { szomszedok[i].add(j); szomszedok[j].add(i); }
      }
    }

    // ⭐ Egy MENET: mindenki, aki tudja, továbbadja a társainak (egy körbejárás).
    let ismeri = new Uint8Array(n);
    ismeri[0] = 1;
    let elert = 1;
    let menet = 0;
    while (elert < n && menet < 40) {
      menet++;
      const elotte = ismeri;
      ismeri = elotte.slice();
      for (let i = 0; i < n; i++) {
        if (!elotte[i]) continue;
        for (const j of szomszedok[i]) ismeri[j] = 1;
      }
      elert = 0;
      for (let i = 0; i < n; i++) elert += ismeri[i];
    }
    ossz += menet;
    if (menet > legrosszabb) legrosszabb = menet;
  }
  return { atlag: ossz / ismetles, legrosszabb };
}

for (const [n, t] of [[100, 14], [1000, 14], [10000, 14], [100000, 14], [1000000, 14],
  [1000, 3], [100000, 3]]) {
  const e = menetSzamMeres(n, t, n >= 100000 ? 3 : 20, MAG);
  kiir('  ' + String(n).padStart(12) + String(t).padStart(7)
    + e.atlag.toFixed(1).padStart(16) + String(e.legrosszabb).padStart(14)
    + (e.legrosszabb <= 5 ? '✔' : '⛔ NEM').padStart(12));
}

kiir('');
kiir('  ⚠️ A modell a LEGJOBB eset: mindenki ébren, egy ablakban. A kapott szám tehát');
kiir('     ALSÓ korlát — a valóságban ennél több menet kell.');
kiir('');


// ===================================
// ⭐⭐ HÁNY FRISS CÍM KELL? (2026-09-18, a 33. mérés kérdése)
// ===================================
//
// ⛔ A KÉRDÉS: a friss UDP-címek terjesztése MÉRHETŐEN DRÁGA — egy cím ~96 bájt körönként,
// tíz címmel a „nincs újdonság" kör 386 → 1346 bájt (33. mérés). Tehát nem mindegy, hány
// cím utazik. *A korlát ma 10, de azt a `CIM_KORLAT` örökölte — nem mérés.*
//
// ===== A MODELL, ÉS AMI BENNE A LÉNYEG =====
//
// ⭐ EGY ABLAKOT nézünk, a legrosszabb esettel: **mindenki külső címe megváltozott** a
// buli-köz alatt (a leképezés elévült — 31. mérés). Aki nem változott, az a **HORGONY**:
// nyitott kaput tart (postaláda, D34), vagy a címe túlélte a csendet.
//
// ⭐⭐ ÉS A KOPOGÁSHOZ ELÉG AZ EGYIK OLDAL TUDÁSA: ha én tudom a te mostani címedet, a
// kopogásomból te is megtudod az enyémet (a `latlak` mindig megmondja). *Ezért a terjedés
// nem kölcsönös tudást kíván, hanem EGY ismert címet valahol a környéken.*
//
// A menet: aki ismer egy friss címet, oda kopog; a találkozáskor **K friss címet** cserélnek
// (ez a mérendő korlát), és a hír is átmegy. Az ablakban a menet ismétlődik.
//
// Futtatás: a `buliMeres.js` végén, magától.

function cimTerjedes({ n, tarsak, k, horgonyArany, menetek, veletlen }) {
  const szomszedok = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    while (szomszedok[i].size < Math.min(tarsak, n - 1)) {
      const j = Math.floor(veletlen() * n);
      if (j !== i) szomszedok[i].add(j);
    }
  }
  for (let i = 0; i < n; i++) for (const j of szomszedok[i]) szomszedok[j].add(i);

  // ⭐ A HORGONYOK: az ő címük a buli-köz után is érvényes (nyitott kapu vagy túlélő leképezés).
  const horgony = new Array(n).fill(false);
  for (let i = 0; i < n; i++) if (veletlen() < horgonyArany) horgony[i] = true;

  // Ki melyik MOSTANI címet ismeri? Induláskor: a szomszédai közül a horgonyokét.
  // ⚠️ A jegyzék SORRENDES: a legfrissebbet küldjük először (a valódi kód is így tesz).
  const ismert = Array.from({ length: n }, () => new Set());
  const jegyzek = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (const j of szomszedok[i]) if (horgony[j]) { ismert[i].add(j); jegyzek[i].push(j); }
  }

  const ismeri = new Array(n).fill(false);
  ismeri[0] = true;

  let hasznaltElek = 0;
  for (let menet = 0; menet < menetek; menet++) {
    const talalkozok = [];
    for (let i = 0; i < n; i++) {
      for (const j of szomszedok[i]) {
        if (i < j && (ismert[i].has(j) || ismert[j].has(i))) talalkozok.push([i, j]);
      }
    }
    if (!talalkozok.length) break;
    hasznaltElek = talalkozok.length;

    for (const [i, j] of talalkozok) {
      // ⭐ A találkozás MAGA is címcsere: mindketten látják a másik mostani címét.
      if (!ismert[i].has(j)) { ismert[i].add(j); jegyzek[i].push(j); }
      if (!ismert[j].has(i)) { ismert[j].add(i); jegyzek[j].push(i); }

      // ⭐⭐ ÉS K DARAB FRISS CÍM A JEGYZÉKBŐL — a legfrissebbek (a lista vége).
      const kuld = (a, b) => {
        for (const c of jegyzek[a].slice(-k)) {
          if (c === b || ismert[b].has(c)) continue;
          ismert[b].add(c); jegyzek[b].push(c);
        }
      };
      if (k > 0) { kuld(i, j); kuld(j, i); }

      if (ismeri[i] || ismeri[j]) { ismeri[i] = true; ismeri[j] = true; }
    }
  }

  const elert = ismeri.reduce((o, e) => o + (e ? 1 : 0), 0);
  const elerheto = ismert.reduce((o, h) => o + h.size, 0) / n;
  return { elert, elerheto, hasznaltElek };
}

function cimMeres(n, tarsak, k, horgonyArany, ismetles, mag) {
  const veletlen = magvasVeletlen(mag);
  let osszElert = 0, osszElerheto = 0, teljes = 0;
  for (let i = 0; i < ismetles; i++) {
    const e = cimTerjedes({ n, tarsak, k, horgonyArany, menetek: 10, veletlen });
    osszElert += e.elert;
    osszElerheto += e.elerheto;
    if (e.elert === n) teljes++;
  }
  return {
    elert: (100 * osszElert) / (ismetles * n),
    elerheto: osszElerheto / ismetles,
    teljes: (100 * teljes) / ismetles
  };
}

kiir();
kiir('=========================================================');
kiir(' HÁNY FRISS CÍM KELL? — a terjesztés ára és haszna');
kiir('=========================================================');
kiir(' ' + N + ' készülék · ' + TARSAK + ' társ · egy ablak, legfeljebb 10 menet');
kiir(' A legrosszabb eset: MINDENKI címe megváltozott, kivéve a horgonyokat.');
kiir();
kiir(' horgony |  K=0   |  K=1   |  K=3   |  K=5   |  K=10   (a hír hány %-át éri el)');
kiir(' --------+--------+--------+--------+--------+--------');
for (const arany of [0, 0.02, 0.05, 0.2, 0.5]) {
  const sorok = [0, 1, 3, 5, 10].map((k) => {
    const e = cimMeres(N, TARSAK, k, arany, 60, MAG + k);
    return e.elert.toFixed(0).padStart(5) + '%';
  });
  kiir(' ' + (100 * arany).toFixed(0).padStart(6) + '% | ' + sorok.join(' | '));
}
kiir();
kiir(' ⭐ A „horgony" az, akinek a címe a buli-köz után is érvényes: nyitott kaput tart');
kiir('    (postaláda), vagy a leképezése túlélte a csendet.');

process.exit(0);
