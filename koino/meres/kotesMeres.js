// koino/meres/kotesMeres.js — A KÖTÉS-HÁLÓ: összefüggő marad-e, ha a telefonok hálózatot váltanak? (35. mérés)

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT.
//
// ===== A KÉRDÉS (Csaba ötlete, 2026-09-18) =====
//
// *„minden készülék 2-3 készülékkel tartana fent egy olyan energiatakarékos kapcsolatot, ami
// lehetővé tenné, hogy elcsípjük a címváltást úgy, hogy még a régivel kapcsolatban vagyunk…
// a csoportok nem szigetek lennének, hanem hálózatba rendezve."*
//
// ⭐ A KÖTÉS: két készülék rendszeresen szól egymásnak (életjel), mielőtt a router órája
// lejárna. Így a leképezésük nem évül el, és a szűrőjük is nyitva marad egymás felé — a két
// fél BÁRMIKOR eléri egymást. *A csendből jövő címváltás így meg sem történik.*
//
// ⛔ AMIT A KÖTÉS NEM VÉSZEL ÁT: a HÁLÓZATVÁLTÁST (wifi ↔ mobil, szolgáltatói IP-csere, router
// újraindulása). Ilyenkor a készülék új címet kap, a társai routere pedig eldobja a
// kopogását, mert a rés a RÉGI cím felé volt nyitva (2026-08-30: „nincs full cone").
// **A készülék ilyenkor MINDEN kötését elveszti** — és ez a modell kérdése:
//
//   · ki hozza vissza? — (a) senki · (b) nyitott ajtó (horgony) · (c) HIRDETŐTÁBLA
//     (a leszakadt kifelé kiírja az új címét, a régi társai kifelé kiolvassák);
//   · összefüggő marad-e a háló, vagy szigetekre esik?
//
// ===== A MODELL =====
//
// · Az idő BULI-ABLAKOKBAN lép (alapból 5 perc). Egy nap = 288 ablak.
// · Minden készülék `K` kötést tart (Csaba: 3), legfeljebb `KMAX`-ot fogad el (9. szabály:
//   felülről korlátos — különben a „népszerűek" akkumulátorát szívnánk le).
// · ⭐ AZ ÚJ TÁRS VÉLETLEN SÉTÁVAL jön: a kérés a MEGLÉVŐ kötéseken halad néhány lépést, és
//   ahol megáll, az lesz az új társ. *Ettől lesz a háló véletlen-szerű, globális címjegyzék
//   nélkül* — a séta végpontjának címét a kötéseken át kapjuk meg, és a két fél a következő
//   ablakban egyszerre kopog. Kötés nélkül tehát társat sem lehet keresni.
// · Naponta `VALTAS` hálózatváltás készülékenként (véletlen időpontban) → minden kötés elvész.
// · A MENTÉS a következő ablakban:
//     – HIRDETŐTÁBLA: a régi társak közül akinél van hely, visszaköt;
//     – NYITOTT AJTÓ: egy horgonyon (nem vált hálózatot, a címe mindenkinek megvan) át indul
//       a séta. ⚠️ A horgony terhelését NEM korlátozzuk — ez a modell kedvező feltevése.
//
// ⚠️ AMIT SZÁNDÉKOSAN NEM MODELLEZ: a kikapcsolt / alvó telefont, az otthoni wifit (helyi
// felfedezés), a kézi kurblit, a csere protokollját és az akkumulátort. *Egy műszer, egy kérdés.*
//
//   node koino/meres/kotesMeres.js
//   KOINO_VALTAS=8 node koino/meres/kotesMeres.js     → napi 8 hálózatváltás

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
// A HÁLÓ ALAPMŰVELETEI
// ===================================

function kot(szomszedok, i, j) {
  szomszedok[i].add(j);
  szomszedok[j].add(i);
}

/** Véletlen séta a meglévő kötéseken — ahol megáll, az a jelölt. */
function veletlenSeta(szomszedok, indulo, hossz, veletlen) {
  let i = indulo;
  for (let l = 0; l < hossz; l++) {
    const lista = [...szomszedok[i]];
    if (!lista.length) break;
    i = lista[Math.floor(veletlen() * lista.length)];
  }
  return i;
}

/**
 * Új társakat keres véletlen sétával, amíg el nem éri a K-t.
 * ⚠️ Az `indulo` alapból saját maga — a horgonyos mentésnél a horgony.
 */
function tarsKereses(szomszedok, i, { K, KMAX, setaHossz, veletlen, indulo = i }) {
  let proba = 0;
  while (szomszedok[i].size < K && proba < 4 * K) {
    proba++;
    const j = veletlenSeta(szomszedok, indulo, setaHossz, veletlen);
    if (j === i || szomszedok[i].has(j) || szomszedok[j].size >= KMAX) continue;
    kot(szomszedok, i, j);
  }
}

/** A legnagyobb összefüggő darab mérete (szélességi bejárás). */
function oriasKomponens(szomszedok) {
  const n = szomszedok.length;
  const latott = new Uint8Array(n);
  let legnagyobb = 0;
  for (let s = 0; s < n; s++) {
    if (latott[s]) continue;
    let meret = 0;
    const sor = [s];
    latott[s] = 1;
    while (sor.length) {
      const i = sor.pop();
      meret++;
      for (const j of szomszedok[i]) if (!latott[j]) { latott[j] = 1; sor.push(j); }
    }
    if (meret > legnagyobb) legnagyobb = meret;
  }
  return legnagyobb;
}

// ===================================
// EGY LEJÁTSZÁS — napok, hálózatváltással
// ===================================

function lejatszas({ n, K, KMAX, napok, valtasNaponta, mentes, veletlen }) {
  const ABLAK_NAPONTA = 288;                       // 5 perces buli-ablakok
  const setaHossz = Math.ceil(Math.log2(n)) + 2;
  const beallitas = { K, KMAX, setaHossz, veletlen };

  // ----- KIINDULÁS: véletlen háló, mindenkinek K kötés -----
  const szomszedok = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    let proba = 0;
    while (szomszedok[i].size < Math.min(K, n - 1) && proba < 50) {
      proba++;
      const j = Math.floor(veletlen() * n);
      if (j !== i && !szomszedok[i].has(j) && szomszedok[j].size < KMAX) kot(szomszedok, i, j);
    }
  }

  // ----- A HORGONYOK (nyitott ajtó): nem váltanak hálózatot, a címük ismert -----
  const horgonyok = [];
  for (let i = 0; i < n; i++) if (veletlen() < (mentes.horgony ?? 0)) horgonyok.push(i);
  const horgonyE = new Uint8Array(n);
  for (const h of horgonyok) horgonyE[h] = 1;

  const regiTarsak = Array.from({ length: n }, () => new Set());
  const leszakadtMikor = new Array(n).fill(null);
  const visszaallasok = [];                        // hány ablak alatt kapott újra kötést
  const naponkent = [];                            // { izolalt, orias } minden nap végén
  let mintaIzolalt = 0, mintaOrias = 0, mintak = 0;

  const valtasEsely = valtasNaponta / ABLAK_NAPONTA;
  const osszAblak = napok * ABLAK_NAPONTA;

  for (let t = 0; t < osszAblak; t++) {
    // ----- 1. HÁLÓZATVÁLTÁS: minden kötés elvész -----
    for (let i = 0; i < n; i++) {
      if (horgonyE[i] || veletlen() >= valtasEsely) continue;
      // ⚠️ A régi társakat megjegyezzük — a hirdetőtáblán őket keressük majd.
      // Ha épp leszakadva vált újra, a korábbi listája marad (nincs újabb).
      if (szomszedok[i].size) regiTarsak[i] = new Set(szomszedok[i]);
      // ⚠️ ÉS A TÁRSAI IS MEGJEGYZIK ŐT: ha mindenki elhagyja őket, ők is leszakadnak —
      // akkor is, ha a SAJÁT címük nem változott. A táblán ők is kiolvassák a társuk új
      // címét. *Ez hiányzott az első változatból: aki a társai miatt maradt magára, azt
      // semmilyen mentés nem hozta vissza — a modell rosszabbnak mutatta a mentéseket.*
      for (const j of szomszedok[i]) { szomszedok[j].delete(i); regiTarsak[j].add(i); }
      szomszedok[i].clear();
      if (leszakadtMikor[i] === null) leszakadtMikor[i] = t;
    }

    // ----- 2. MENTÉS: a leszakadtak a következő ablakban -----
    // ⚠️ MINDEN kötés nélküli készülék, nem csak aki maga váltott (lásd fent).
    for (let i = 0; i < n; i++) {
      if (szomszedok[i].size || leszakadtMikor[i] === t) continue;

      if (mentes.tabla && veletlen() < mentes.tabla) {
        // ⭐ HIRDETŐTÁBLA: a régi társak kiolvassák az új címet, és egyszerre kopognak.
        for (const j of regiTarsak[i]) {
          if (j !== i && szomszedok[j].size < KMAX) kot(szomszedok, i, j);
        }
      }
      if (!szomszedok[i].size && horgonyok.length) {
        // ⭐ NYITOTT AJTÓ: a horgony kéretlenül is fogad — onnan indul a séta.
        const h = horgonyok[Math.floor(veletlen() * horgonyok.length)];
        if (h !== i) tarsKereses(szomszedok, i, { ...beallitas, indulo: h });
      }
    }

    // ----- 3. KARBANTARTÁS: aki K alá esett, de van kötése, sétával pótol -----
    for (let i = 0; i < n; i++) {
      if (szomszedok[i].size && szomszedok[i].size < K) tarsKereses(szomszedok, i, beallitas);
    }

    // ----- 4. A VISSZAÁLLÁS FELJEGYZÉSE -----
    for (let i = 0; i < n; i++) {
      if (!szomszedok[i].size) continue;
      if (leszakadtMikor[i] !== null) {
        visszaallasok.push(t - leszakadtMikor[i]);
        leszakadtMikor[i] = null;
      }
      // A régi társak listája csak a leszakadás idejére kell — különben korlátlanul hízna.
      regiTarsak[i].clear();
    }

    // ----- 5. MINTA óránként, és a nap végén -----
    if (t % 12 === 11) {
      let izolalt = 0;
      for (let i = 0; i < n; i++) if (!szomszedok[i].size) izolalt++;
      const orias = oriasKomponens(szomszedok);
      mintaIzolalt += izolalt / n;
      mintaOrias += orias / n;
      mintak++;
      if (t % ABLAK_NAPONTA === ABLAK_NAPONTA - 1) naponkent.push({ izolalt: izolalt / n, orias: orias / n });
    }
  }

  // Aki a végén is leszakadva van, az a „soha" — külön számoljuk.
  let soha = 0;
  for (let i = 0; i < n; i++) if (leszakadtMikor[i] !== null) soha++;

  return {
    izolalt: mintaIzolalt / mintak,
    orias: mintaOrias / mintak,
    naponkent,
    visszaallasok,
    soha
  };
}

function meres(be, ismetles, mag) {
  let izolalt = 0, orias = 0, soha = 0, osszValtas = 0;
  const utolsoNap = { izolalt: 0, orias: 0 };
  const osszes = [];
  for (let k = 0; k < ismetles; k++) {
    const e = lejatszas({ ...be, veletlen: magvasVeletlen(mag + k) });
    izolalt += e.izolalt;
    orias += e.orias;
    soha += e.soha;
    osszValtas += e.visszaallasok.length + e.soha;
    const u = e.naponkent[e.naponkent.length - 1];
    utolsoNap.izolalt += u.izolalt;
    utolsoNap.orias += u.orias;
    osszes.push(...e.visszaallasok);
  }
  osszes.sort((a, b) => a - b);
  return {
    izolalt: izolalt / ismetles,
    orias: orias / ismetles,
    utolsoIzolalt: utolsoNap.izolalt / ismetles,
    utolsoOrias: utolsoNap.orias / ismetles,
    visszaallMedian: osszes.length ? osszes[Math.floor(osszes.length / 2)] : null,
    visszaallP95: osszes.length ? osszes[Math.floor(osszes.length * 0.95)] : null,
    sohaArany: osszValtas ? soha / osszValtas : 0
  };
}

// ===================================
// 1. RÉSZ — A MENTÉS: ki hozza vissza a leszakadtat?
// ===================================

const MAG = parseInt(process.env.KOINO_MAG ?? '', 10) || 20260918;
const VALTAS = parseFloat(process.env.KOINO_VALTAS ?? '') || 4;
const NAPOK = parseFloat(process.env.KOINO_NAPOK ?? '') || 3;

const MENTESEK = [
  { nev: '(a) nincs mentés', mentes: {} },
  { nev: '(b) nyitott ajtó, 5%', mentes: { horgony: 0.05 } },
  { nev: '(c) nyitott ajtó, 20%', mentes: { horgony: 0.2 } },
  { nev: '(d) hirdetőtábla', mentes: { tabla: 1 } },
  { nev: '(e) hirdetőtábla, minden 2. olvasás bukik', mentes: { tabla: 0.5 } }
];

kiir('');
kiir('⭐ A KÖTÉS-HÁLÓ — összefüggő marad-e, ha a telefonok hálózatot váltanak? (35. mérés)');
kiir('');
kiir('  ' + NAPOK + ' nap · 5 perces ablakok · napi ' + VALTAS + ' hálózatváltás készülékenként'
  + ' · K = 3 kötés (legfeljebb 5)');
kiir('  ⛔ Hálózatváltáskor a készülék MINDEN kötését elveszti (a rés a régi cím felé volt nyitva).');

for (const [n, ismetles] of [[10, 200], [1000, 10]]) {
  kiir('');
  kiir('  ' + (n === 10 ? 'KIS KOINO (család, D22)' : 'NAGYOBB KOINO') + ' — ' + n + ' készülék, '
    + ismetles + ' futás');
  kiir('  ' + '─'.repeat(98));
  kiir('  ' + 'mentés'.padEnd(44) + 'leszakadt'.padStart(11) + 'egy darabban'.padStart(14)
    + 'visszaáll'.padStart(12) + '95%-ban'.padStart(10) + 'soha'.padStart(7));
  kiir('  ' + ''.padEnd(44) + '(átlag)'.padStart(11) + '(átlag)'.padStart(14)
    + '(medián)'.padStart(12) + ''.padStart(10) + ''.padStart(7));
  for (const m of MENTESEK) {
    const e = meres({ n, K: 3, KMAX: 5, napok: NAPOK, valtasNaponta: VALTAS, mentes: m.mentes },
      ismetles, MAG);
    const ido = (a) => a === null ? '—' : (a * 5) + ' perc';
    kiir('  ' + m.nev.padEnd(44)
      + ((e.izolalt * 100).toFixed(0) + '%').padStart(11)
      + ((e.orias * 100).toFixed(0) + '%').padStart(14)
      + ido(e.visszaallMedian).padStart(12)
      + ido(e.visszaallP95).padStart(10)
      + ((e.sohaArany * 100).toFixed(0) + '%').padStart(7));
    kiir('  ' + ''.padEnd(44) + ('3. nap végén: ' + (e.utolsoIzolalt * 100).toFixed(0)
      + '% leszakadva, ' + (e.utolsoOrias * 100).toFixed(0) + '% egy darabban').padStart(54));
  }
}

kiir('');
kiir('  ⭐ „leszakadt": hány készüléknek nincs EGY kötése sem. „egy darabban": a háló legnagyobb');
kiir('     összefüggő része. „visszaáll": a hálózatváltás után hány perc múlva van újra kötése.');
kiir('     „soha": a váltások hányadából NEM állt vissza a mérés végéig.');

// ===================================
// 2. RÉSZ — A MÉHSEJT ÉS A VÉLETLEN: hány lépés bárhonnan bárhová?
// ===================================
//
// ⭐ Csaba első képe a MÉHSEJT volt: rendezett hatszögek, mindenki 3 társsal. A kérdés: hány
// lépés alatt ér el a hír bárhonnan bárhová — mert a buli nemzedékenként terjeszt, és egy
// lépés egy nemzedék. *Nem érvelünk róla, megmérjük.*
//
// Három háló, mindegyikben kb. 3 kötés/készülék:
//   · MÉHSEJT — „téglafal" alakban (minden sorban vízszintes szomszédok, és felváltva fel/le);
//   · MÉHSEJT + 1 VÉLETLEN — a méhsejt, és mindenkinek egy távoli társ is;
//   · VÉLETLEN SÉTÁVAL NÖVESZTETT — ahogy a valódi háló nőne: az új tag egy ismerősnél
//     csatlakozik (kurbli), és onnan sétával keres 3 társat.

function mehsejt(n, egyVeletlen, veletlen) {
  const sz = Math.max(2, Math.round(Math.sqrt(n)));
  const m = Math.ceil(n / sz);
  const valodi = sz * m;
  const szomszedok = Array.from({ length: valodi }, () => new Set());
  const az = (x, y) => y * sz + x;
  for (let y = 0; y < m; y++) {
    for (let x = 0; x < sz; x++) {
      if (x + 1 < sz) kot(szomszedok, az(x, y), az(x + 1, y));
      // A téglafal: minden második mező felfelé köt — így mindenkinek 3 szomszédja van.
      if ((x + y) % 2 === 0 && y + 1 < m) kot(szomszedok, az(x, y), az(x, y + 1));
    }
  }
  if (egyVeletlen) {
    for (let i = 0; i < valodi; i++) {
      const j = Math.floor(veletlen() * valodi);
      if (j !== i) kot(szomszedok, i, j);
    }
  }
  return szomszedok;
}

function setaNovesztett(n, veletlen) {
  const K = 3, KMAX = 5;
  const szomszedok = Array.from({ length: n }, () => new Set());
  // Az első négy: teljes kis mag.
  for (let i = 0; i < Math.min(4, n); i++) for (let j = 0; j < i; j++) kot(szomszedok, i, j);
  for (let i = 4; i < n; i++) {
    const setaHossz = Math.ceil(Math.log2(i)) + 2;
    const ismeros = Math.floor(veletlen() * i);          // a kurbli: egy ismerős
    kot(szomszedok, i, ismeros);
    tarsKereses(szomszedok, i, { K, KMAX, setaHossz, veletlen });
  }
  return szomszedok;
}

function atlagosTavolsag(szomszedok, forrasok, veletlen) {
  const n = szomszedok.length;
  let ossz = 0, db = 0, legnagyobb = 0;
  for (let f = 0; f < forrasok; f++) {
    const s = Math.floor(veletlen() * n);
    const tav = new Int32Array(n).fill(-1);
    tav[s] = 0;
    const sor = [s];
    for (let fej = 0; fej < sor.length; fej++) {
      const i = sor[fej];
      for (const j of szomszedok[i]) {
        if (tav[j] === -1) { tav[j] = tav[i] + 1; sor.push(j); }
      }
    }
    for (let i = 0; i < n; i++) {
      if (tav[i] > 0) { ossz += tav[i]; db++; if (tav[i] > legnagyobb) legnagyobb = tav[i]; }
    }
  }
  return { atlag: ossz / db, legnagyobb };
}

kiir('');
kiir('  ⭐ A MÉHSEJT ÉS A VÉLETLEN — hány lépés bárhonnan bárhová? (átlag / legtávolabbi)');
kiir('  ' + '─'.repeat(78));
kiir('  ' + 'készülék'.padStart(10) + 'méhsejt'.padStart(20) + 'méhsejt + 1 véletlen'.padStart(24)
  + 'sétával növesztett'.padStart(22));

const tavolsagok = [];
for (const n of [100, 1000, 10000, 100000]) {
  const v = magvasVeletlen(MAG + n);
  const forrasok = n >= 100000 ? 3 : 8;
  const a = atlagosTavolsag(mehsejt(n, false, v), forrasok, v);
  const b = atlagosTavolsag(mehsejt(n, true, v), forrasok, v);
  const c = atlagosTavolsag(setaNovesztett(n, v), forrasok, v);
  tavolsagok.push({ n, a, b, c });
  const f = (e) => (e.atlag.toFixed(1) + ' / ' + e.legnagyobb);
  kiir('  ' + String(n).padStart(10) + f(a).padStart(20) + f(b).padStart(24) + f(c).padStart(22));
}

// ⚠️ A KIVETÍTÉS BECSLÉS, NEM MÉRÉS — és ezt ki is írjuk.
// A méhsejt a méret GYÖKÉVEL nő (síkbeli rács), a véletlen a LOGARITMUSÁVAL.
const u = tavolsagok[tavolsagok.length - 1];
const e = tavolsagok[tavolsagok.length - 2];
const szorzo = 1e9 / u.n;
const mehsejtMilliard = u.a.atlag * Math.sqrt(szorzo);
const lepesDuplazasonkent = (u.c.atlag - e.c.atlag) / Math.log2(u.n / e.n);
const veletlenMilliard = u.c.atlag + lepesDuplazasonkent * Math.log2(szorzo);

kiir('');
kiir('  ⚠️ KIVETÍTÉS egymilliárdra (becslés, nem mérés): méhsejt ~'
  + Math.round(mehsejtMilliard).toLocaleString('hu-HU') + ' lépés · sétával növesztett ~'
  + Math.round(veletlenMilliard) + ' lépés');
kiir('     (a méhsejt a méret gyökével nő, a véletlen a logaritmusával)');
kiir('');

process.exit(0);
