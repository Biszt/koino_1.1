// koino/meres/udpLekepezesMeres.js

// Felelősség: MEGMÉRNI, MEDDIG ÉRVÉNYES A KÜLSŐ UDP-CÍM, AMIT EGY BULIN BEMONDUNK.
//
// ⛔⛔ MIÉRT EZ A MÉRÉS, ÉS MIÉRT AZ ŐRJÁRAT UDP-RE ÁLLÍTÁSA ELŐTT (2026-09-17)?
//
// Csaba 2026-09-13-án eldöntötte, hogy a UDP a fő út — de az `orjarat` ma is TCP-n fut.
// Az átállításhoz tudni kell, milyen címre kopogjon egy készülék a KÖVETKEZŐ bulin:
//
//   · az őrjárat 5 percenként ébred, közben a foglalat HALLGAT;
//   · a router a hallgató UDP-leképezést egy idő után ELFELEJTI (tipikusan 30 mp – 5 perc);
//   · ha utána új külső portot ad, a bulin bemondott cím a következő bulira **rossz**.
//
// ⭐ A válasz SZERKEZETET dönt el, nem paramétert:
//
//   · ha a külső port **túléli** a buli-közt → elég, ha a cím a cserén utazik, és a
//     következő bulin arra kopogunk;
//   · ha **nem** → minden ablak elején újra át kell adni (ahhoz viszont már kellene egy
//     út), vagy **életjelet** kellene küldeni — ⛔ az pedig az 5. szabály széle (folyamatos
//     forgalom) és akkumulátor-kérdés.
//
// ⭐ ÉS EGY KÉSZÜLÉK ELÉG HOZZÁ — a két port-átíró NAT közötti terepmérés előtt ez megmondja,
// mit tud EGY vonal. A pajzsfúrás elmélete szerint két **célfüggetlen** leképezésű NAT
// között a fúrás átmegy; a `tcpLekepezesMeres.js` ezt TCP-re már mérte, UDP-re kontrollként.
//
// ===== ⭐ A MÉRÉS ALAKJA =====
//
//   1. CÉLFÜGGETLENSÉG — egy foglalatról több tükör: ugyanazt a külső portot látják-e?
//   2. ÉLETTARTAM — több foglalat EGYSZERRE indul, mindegyik megkérdezi a külső portját,
//      aztán **hallgat** (ki-ki a saját ideig), és újra kérdez. Egyezik-e a két szám?
//      ⭐ Párhuzamosan, hogy a leghosszabb várakozás szabja meg a mérés idejét, ne az összeg.
//   3. KONTROLL — egy foglalat, ami ugyanennyi ideig **15 mp-enként** kérdez: ha ennek a
//      portja is változik, a változást nem a csend okozta (hanem pl. a hálózat váltott).
//
// ⛔ AMI SZÁNDÉKOSAN NINCS BENNE: az „újranyitás" (bezárni, ugyanarról a helyi portról újra
// megnyitni). Az első futásban benne volt, és **vak próba** volt: a router nem tudja, hogy a
// program bezárta a foglalatot — neki csak a csend számít. Egy másodperc múlva tehát
// magától értetődően ugyanazt a portot adta. *A kérdést a hallgató foglalatok teszik fel
// helyesen: az őrjárat újraindítása is csak egy csend.*
//
// ⚠️ AMIT A MÉRÉS NEM TUD SZÉTVÁLASZTANI, ÉS KIMONDJUK: ha a port ugyanaz maradt, az
// jelentheti azt, hogy a leképezés **élt**, VAGY hogy lejárt, de a router **ugyanazt a
// számot adta újra** (port-megtartó NAT). ⭐ A koino szempontjából a kettő EGYENÉRTÉKŰ:
// a kérdés az, hogy a bemondott szám a következő bulin is igaz-e — nem az, hogy miért.
//
// ⚠️ A TÜKRÖK PARAMÉTEREK (2. szabály), cserélhetők, és semmilyen bizalom nem jár velük —
// egy portszámot mondanak, nem igazságot (3. szabály). Ez a lap **mérés, nem funkció**.
//
// Futtatás:
//   node koino/meres/udpLekepezesMeres.js [várakozások mp-ben, vesszővel] [helyi kezdőport]
//   pl.  node koino/meres/udpLekepezesMeres.js 20,60,150,330 7380

import { createSocket } from 'node:dgram';

import { kulsoCimFoglalaton } from '../js/csere/pajzsfuro.js';

// ⭐ A 330 mp SZÁNDÉKOSAN több az 5 percnél: az őrjárat alapértelmezett ütemén a bemondott
// címnek **egy teljes buli-közt** kell túlélnie, és egy kis ráhagyással.
const ALAP_VARAKOZASOK = [20, 60, 150, 330];
const ALAP_KEZDOPORT = 7380;          // ⚠️ nem a 7373: ott futhat őrjárat
const KONTROLL_KOZ = 15;              // mp
const IDOKORLAT = 5000;

const TUKROK = [
  { nev: 'google-1',   hoszt: 'stun.l.google.com',   port: 19302 },
  { nev: 'google-2',   hoszt: 'stun1.l.google.com',  port: 19302 },
  { nev: 'cloudflare', hoszt: 'stun.cloudflare.com', port: 3478 }
];

// ⚠️ Az élettartamot EGY tükörrel mérjük, mindig ugyanazzal: a kérdés az, hogy a foglalat
// leképezése megmaradt-e — ha közben más tükröt kérdeznénk, a célfüggetlenséget mérnénk újra.
const ELETTARTAM_TUKOR = TUKROK[0];

const varj = (ms) => new Promise((kesz) => setTimeout(kesz, ms));
function kiir(sor = '') { console.log(sor); }

// ===================================
// SEGÉDEK
// ===================================

/** Megnyit egy `udp4` foglalatot a megadott helyi porton. */
async function foglalat(helyiPort) {
  const halo = createSocket({ type: 'udp4', reuseAddr: true });
  await new Promise((kesz, hiba) => {
    halo.once('error', hiba);
    halo.bind(helyiPort, kesz);
  });
  // ⚠️ Egy késve érkező, már lejárt STUN-válasz ne döntse el a folyamatot.
  halo.on('error', () => {});
  return halo;
}

/**
 * Megkérdez egy tükröt EZEN a foglalaton. Hiba helyett `null`-t ad — a néma tükör itt
 * hiány, nem eredmény (D19), és a kiírás megmondja.
 */
async function kerdez(halo, tukor) {
  try {
    const cim = await kulsoCimFoglalaton(halo, tukor.hoszt, tukor.port, IDOKORLAT);
    return cim.csalad === 6 ? null : cim;      // IPv6-on nincs NAT — a kérdésre nem felel
  } catch {
    return null;
  }
}

const cimSzoveg = (c) => (c ? c.cim + ':' + c.port : '—');

// ===================================
// 1. CÉLFÜGGETLENSÉG
// ===================================

async function celfuggetlenseg(helyiPort) {
  const halo = await foglalat(helyiPort);
  const valaszok = [];
  // ⚠️ SORBAN, nem egyszerre: a `kulsoCimFoglalaton` nem köti a választ a kérdéshez, tehát
  // két egyidejű kérdés egymás válaszát vehetné el.
  for (const tukor of TUKROK) valaszok.push({ tukor, cim: await kerdez(halo, tukor) });
  halo.close();

  const portok = [...new Set(valaszok.filter((v) => v.cim).map((v) => v.cim.port))];
  const felelt = valaszok.filter((v) => v.cim).length;
  return {
    valaszok,
    // ⛔ Két tükör kell az ítélethez — egy válasz csak annyit mond, hogy a tükör él.
    eldolt: felelt >= 2,
    celfuggetlen: felelt >= 2 && portok.length === 1,
    portok
  };
}

// ===================================
// 2–3. ÉLETTARTAM + KONTROLL (párhuzamosan)
// ===================================

/** Kérdez, hallgat `mp` másodpercig, újra kérdez. */
async function hallgatoFoglalat(helyiPort, mp) {
  const halo = await foglalat(helyiPort);
  const elotte = await kerdez(halo, ELETTARTAM_TUKOR);
  await varj(mp * 1000);
  const utana = await kerdez(halo, ELETTARTAM_TUKOR);
  halo.close();
  return { helyiPort, mp, elotte, utana };
}

/** Ugyanannyi ideig, de `KONTROLL_KOZ` másodpercenként kérdez — ő nem hallgat. */
async function beszedesFoglalat(helyiPort, mp) {
  const halo = await foglalat(helyiPort);
  const portok = [];
  const vege = Date.now() + mp * 1000;
  for (;;) {
    const c = await kerdez(halo, ELETTARTAM_TUKOR);
    portok.push(c ? c.port : null);
    if (Date.now() >= vege) break;
    await varj(Math.min(KONTROLL_KOZ * 1000, Math.max(0, vege - Date.now())));
  }
  halo.close();
  return { helyiPort, mp, portok };
}

// ===================================
// A MÉRÉS
// ===================================

async function meres() {
  const varakozasok = process.argv[2]
    ? process.argv[2].split(',').map((s) => parseInt(s, 10)).filter((n) => n > 0)
    : ALAP_VARAKOZASOK;
  const kezdoport = parseInt(process.argv[3], 10) || ALAP_KEZDOPORT;
  const leghosszabb = Math.max(...varakozasok);

  kiir('A UDP-LEKÉPEZÉS ÉLETTARTAMA — túléli-e a bemondott cím a buli-közt?');
  kiir('  helyi portok: ' + kezdoport + '–' + (kezdoport + varakozasok.length + 1)
    + ' · várakozások: ' + varakozasok.join(', ') + ' mp · kb. '
    + Math.ceil((leghosszabb + 20) / 60) + ' perc');
  kiir('  ⚠ Közben ne váltson hálózatot a készülék (wifi ↔ mobil) — az a mérést rontaná el.');
  kiir();

  // ----- 1. CÉLFÜGGETLENSÉG -----
  const cel = await celfuggetlenseg(kezdoport);
  kiir('1. CÉLFÜGGETLENSÉG — egy foglalatról (' + kezdoport + '), több tükör');
  for (const v of cel.valaszok) {
    kiir('  ' + v.tukor.nev.padEnd(12) + (v.cim ? '✓ ' + cimSzoveg(v.cim) : '✗ nem felelt'));
  }
  kiir('  → ' + (!cel.eldolt ? 'nem dőlt el (kevesebb mint két tükör felelt)'
    : cel.celfuggetlen ? '⭐ CÉLFÜGGETLEN — a bemondott port egy harmadik félre is igaz'
      : '⛔ CÉL-FÜGGŐ (portok: ' + cel.portok.join(', ') + ') — a pajzsfúrás itt elvi okból nem megy'));
  kiir();

  // ⛔ HA EGYIK TÜKÖR SEM FELELT, NINCS MIT VÁRNI — ezt a telefonos futás mutatta meg
  // (2026-09-17): hálózat nélkül a mérés némán 330 mp-et várt egy eredményre, ami nem jöhet.
  // *A hiányt ki kell mondani, nem kivárni* (D19).
  if (!cel.valaszok.some((v) => v.cim)) {
    kiir('⛔ Egyik tükör sem felelt — nincs hálózat, vagy a vonal nem enged ki UDP-t.');
    kiir('  Az élettartam így nem mérhető; a mérés itt véget ér.');
    return;
  }

  // ----- 2–3. ÉLETTARTAM + KONTROLL, egyszerre -----
  kiir('2. ÉLETTARTAM — ' + varakozasok.length + ' hallgató foglalat + 1 beszédes kontroll, egyszerre');
  kiir('  (várunk ' + leghosszabb + ' mp-et…)');
  const [hallgatok, kontroll] = await Promise.all([
    Promise.all(varakozasok.map((mp, i) => hallgatoFoglalat(kezdoport + 1 + i, mp))),
    beszedesFoglalat(kezdoport + 1 + varakozasok.length, leghosszabb)
  ]);

  let elsoValtozas = null;
  let utolsoTuleles = null;
  for (const h of hallgatok) {
    let jel;
    if (!h.elotte || !h.utana) {
      jel = '— nem dőlt el (a tükör nem felelt)';
    } else if (h.elotte.port === h.utana.port) {
      jel = '✓ ugyanaz';
      if (utolsoTuleles === null || h.mp > utolsoTuleles) utolsoTuleles = h.mp;
    } else {
      jel = '⛔ MÁS';
      if (elsoValtozas === null || h.mp < elsoValtozas) elsoValtozas = h.mp;
    }
    kiir('  ' + String(h.mp).padStart(4) + ' mp csend  (' + h.helyiPort + ')  '
      + cimSzoveg(h.elotte) + ' → ' + cimSzoveg(h.utana) + '   ' + jel);
  }

  const kontrollPortok = kontroll.portok.filter((p) => p !== null);
  const kontrollStabil = kontrollPortok.length >= 2 && new Set(kontrollPortok).size === 1;
  kiir('  kontroll (' + kontroll.helyiPort + ', ' + KONTROLL_KOZ + ' mp-enként kérdez): '
    + (kontrollPortok.length < 2 ? 'nem dőlt el'
      : kontrollStabil ? '✓ végig ' + kontrollPortok[0]
        : '⚠ VÁLTOZOTT (' + [...new Set(kontrollPortok)].join(' → ') + ')'));
  kiir();

  // ----- AZ EREDMÉNY -----
  kiir('AZ EREDMÉNY');
  if (!kontrollStabil) {
    // ⛔ Ha a beszédes foglalat portja is mozdult, a hallgatókéból semmi nem következik.
    kiir('  ⚠ A kontroll portja is változott (vagy nem felelt) — a mérés alatt a vonal maga');
    kiir('    változhatott. A hallgató foglalatok eredményéből NEM szabad következtetni.');
    return;
  }
  if (elsoValtozas === null && utolsoTuleles !== null) {
    kiir('  ⭐⭐ A KÜLSŐ PORT ' + utolsoTuleles + ' MP CSENDET IS TÚLÉLT.');
    kiir('  Ezen a vonalon egy bulin bemondott UDP-cím legalább ennyi buli-közt kibír,');
    kiir('  életjel nélkül. ⚠ Hosszabb közre ez NEM mond semmit — azt külön kell mérni.');
  } else if (elsoValtozas !== null) {
    kiir('  ⛔⛔ A KÜLSŐ PORT MEGVÁLTOZOTT ' + elsoValtozas + ' MP CSEND UTÁN'
      + (utolsoTuleles !== null ? ' (' + utolsoTuleles + ' mp-et még túlélt)' : '') + '.');
    kiir('  Ezen a vonalon a bulin bemondott UDP-cím ennél hosszabb buli-közre NEM érvényes —');
    kiir('  a címet minden ablak elején újra át kell adni, vagy életjel kell.');
  } else {
    kiir('  — nem dőlt el: a tükör a hallgató foglalatoknál nem felelt.');
  }
}

meres().catch((hiba) => {
  console.error('A mérés elakadt:', hiba.message);
  process.exit(1);
});
