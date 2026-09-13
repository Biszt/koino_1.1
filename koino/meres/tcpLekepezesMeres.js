// koino/meres/tcpLekepezesMeres.js

// Felelősség: MEGMÉRNI, HOGY A ROUTER TCP-LEKÉPEZÉSE CÉLFÜGGETLEN-E.
//
// ⛔⛔ MIÉRT EZ A MÉRÉS, ÉS MIÉRT ELŐBB, MINT BÁRMI ÉPÍTÉS (Csaba, 2026-09-13)?
//
// A 17. mérés (terepmérés, két valódi hálózat) megmutatta, hogy a **UDP**-pajzsfúrás
// átmegy — a **TCP**-é viszont nem ment, és tudjuk, min akadt el: a fejlesztő routere az
// IPv4-portot minden foglalatnál **más számra** írja át (25787 → 6119 → 33905 → 54013).
// A UDP-fúró ezt **megméri a saját fúró-foglalatáról**, ezért talál célba; a TCP-fúrónak
// nincs ilyen mérése.
//
// ⭐ Kézenfekvő lenne megépíteni a TCP külső-port felderítést. ⛔ **De lehet, hogy egy
// elvi falnak építenénk.** Ez a lap azt a falat keresi meg:
//
//   · **célfüggetlen** (endpoint-independent) leképezés → ugyanaz a helyi port MINDEN
//     célpont felé UGYANAZT a külső portot kapja. Ekkor a tükör válasza **érvényes egy
//     harmadik félre is**, tehát a bemondott port használható, és a TCP-fúrásnak van értelme.
//
//   · **cél-függő** leképezés → minden célponthoz ÚJ külső port jár. Ekkor a tükörtől
//     kapott szám **csak a tükörre igaz**, a társra nem — vagyis a külső portot elvi okból
//     nem lehet előre megtudni, és a TCP-pajzsfúrás ezen a vonalon **lehetetlen, semmilyen
//     programmal**. *Ilyenkor nem építeni kell, hanem a UDP-vonal ablakát megcsinálni.*
//
// ===== ⭐ A MÉRÉS ALAKJA: UGYANAZ A KÉRDÉS KÉTSZER =====
//
// Ugyanarról a **helyi portról** kérdezzük meg KÉT KÜLÖNBÖZŐ tükröt, hogy milyen külső
// porton látnak. Ha a két válasz egyezik → célfüggetlen. Ha eltér → cél-függő.
//
// ⭐ És **UDP-n is lefuttatjuk, kontrollként**: arról tudjuk (2026-08-29, két tükörrel),
// hogy célfüggetlen. Ha a kontroll ma is azt adja, akkor a TCP-eredmény **különbség**,
// nem mérési hiba.
//
// ⚠️ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL (2. szabály): a tükrök **paraméterek**, cserélhetők, és
// semmilyen bizalom nem jár velük — egy portszámot mondanak, nem igazságot (3. szabály).
// Ez a lap **mérés, nem funkció**: a koino működéséhez semmi köze, csak megtudja, mi
// történik a vonalon.
//
// Futtatás:
//   node koino/meres/tcpLekepezesMeres.js [helyi port]

import { createSocket } from 'node:dgram';
import { connect } from 'node:net';

const SUTI = 0x2112A442;
const ALAP_HELYI_PORT = 7373;
const IDOKORLAT = 6000;

// ⚠️ A TÜKRÖK PARAMÉTEREK (2. szabály). Több van belőlük, mert nem mind felel TCP-n —
// és pont ez az egyik dolog, amit meg akarunk tudni.
const TUKROK = [
  { nev: 'google-1',   hoszt: 'stun.l.google.com',    port: 19302 },
  { nev: 'google-2',   hoszt: 'stun1.l.google.com',   port: 19302 },
  { nev: 'cloudflare', hoszt: 'stun.cloudflare.com',  port: 3478 },
  { nev: 'sipgate',    hoszt: 'stun.sipgate.net',     port: 3478 },
  { nev: 'nextcloud',  hoszt: 'stun.nextcloud.com',   port: 443 },
  // ⚠️ A TCP-t kevés nyilvános tükör szolgálja ki — ezért ennyi. A mérés első nekifutásán
  // ötből EGY felelt, és egy tükörből nem lehet célfüggetlenséget megállapítani.
  { nev: 'linphone',   hoszt: 'stun.linphone.org',    port: 3478 },
  { nev: 'antisip',    hoszt: 'stun.antisip.com',     port: 3478 },
  { nev: 'sipnet',     hoszt: 'stun.sipnet.net',      port: 3478 },
  { nev: 'dus',        hoszt: 'stun.dus.net',         port: 3478 },
  { nev: 'schlund',    hoszt: 'stun.schlund.de',      port: 3478 },
  { nev: 'voipbuster', hoszt: 'stun.voipbuster.com',  port: 3478 },
  { nev: 'voipstunt',  hoszt: 'stun.voipstunt.com',   port: 3478 },
  { nev: '12connect',  hoszt: 'stun.12connect.com',   port: 3478 },
  { nev: 'callwithus', hoszt: 'stun.callwithus.com',  port: 3478 },
  { nev: 'counterpath', hoszt: 'stun.counterpath.com', port: 3478 },
  { nev: 'zoiper',     hoszt: 'stun.zoiper.com',      port: 3478 },
  { nev: 'bergophor',  hoszt: 'stun.bergophor.de',    port: 3478 }
];

// ===================================
// 1. A STUN-ÜZENET (ugyanaz, mint a `pajzsfuro.js`-ben)
// ===================================

/** Egy STUN-kérdés bájtjai (véletlen tranzakció-azonosítóval). */
function stunKeres() {
  const keres = Buffer.alloc(20);
  keres.writeUInt16BE(0x0001, 0);
  keres.writeUInt16BE(0, 2);
  keres.writeUInt32BE(SUTI, 4);
  for (let i = 8; i < 20; i++) keres[i] = Math.floor(Math.random() * 256);
  return keres;
}

/**
 * Kiolvassa a leképezett címet egy STUN-válaszból (null, ha nincs benne).
 *
 * ⚠️⚠️ A CSALÁD-BÁJTOT MEG KELL NÉZNI — ezt az első mérés tanította meg (2026-09-13).
 * A `pajzsfuro.js` változata vakon négy bájtot olvas IPv4-ként; amikor a tükör **IPv6-on**
 * felelt, ebből `32.1.76.77` lett — ami valójában a saját `2001:4c4d…` címem első négy
 * bájtja. *A mérés nem hazudott volna nagyobbat, ha kitalálja a számot.*
 *
 * ⛔ És ez nem szépséghiba: egy IPv6-válasz **semmit nem mond a NAT-ról**, mert ott nincs
 * port-átírás. Az ilyet külön kell jelölni, nem beleszámolni.
 */
function stunbolCim(v) {
  let p = 20;
  while (p + 4 <= v.length) {
    const tipus = v.readUInt16BE(p), hossz = v.readUInt16BE(p + 2);
    if (tipus === 0x0020) {                  // XOR-MAPPED-ADDRESS
      const csalad = v[p + 5];               // 0x01 = IPv4, 0x02 = IPv6
      const port = v.readUInt16BE(p + 6) ^ 0x2112;

      if (csalad === 0x02) {
        const b = [];
        for (let i = 0; i < 16; i++) {
          // Az IPv6 az első 4 bájton a sütivel, utána a tranzakció-azonosítóval van XOR-olva.
          b.push(v[p + 8 + i] ^ (i < 4 ? ((SUTI >> (24 - 8 * i)) & 0xff) : v[8 + (i - 4)]));
        }
        const cim = Array.from({ length: 8 }, (_, i) =>
          ((b[i * 2] << 8) | b[i * 2 + 1]).toString(16)).join(':');
        return { cim, port, csalad: 6 };
      }

      const cim = [0, 1, 2, 3]
        .map((i) => v[p + 8 + i] ^ ((SUTI >> (24 - 8 * i)) & 0xff)).join('.');
      return { cim, port, csalad: 4 };
    }
    p += 4 + hossz + ((4 - (hossz % 4)) % 4);
  }
  return null;
}

// ===================================
// 2. A KÉRDÉS UDP-N — a kontroll
// ===================================

/**
 * ⭐ FONTOS: EGY foglalattal kérdezünk MINDEN tükröt.
 *
 * A NAT-leképezés a **foglalathoz** tartozik, nem a portszámhoz — ha minden kérdéshez új
 * foglalatot nyitnánk, a különböző válaszok semmit nem bizonyítanának (a 2026-08-30-i
 * tanulság).
 */
async function udpKerdesek(helyiPort, tukrok) {
  const halo = createSocket({ type: 'udp4', reuseAddr: true });
  await new Promise((kesz, hiba) => {
    halo.once('error', hiba);
    halo.bind(helyiPort, kesz);
  });

  const valaszok = [];
  for (const tukor of tukrok) {
    const keres = stunKeres();
    const valasz = await new Promise((teljesites) => {
      const ora = setTimeout(() => { halo.removeListener('message', figyelo); teljesites(null); },
        IDOKORLAT);
      const figyelo = (adat) => {
        if (adat.length < 20 || adat.readUInt32BE(4) !== SUTI) return;
        clearTimeout(ora);
        halo.removeListener('message', figyelo);
        teljesites(stunbolCim(adat));
      };
      halo.on('message', figyelo);
      halo.send(keres, tukor.port, tukor.hoszt, (h) => {
        if (!h) return;
        clearTimeout(ora); halo.removeListener('message', figyelo); teljesites(null);
      });
    });
    valaszok.push({ tukor, cim: valasz });
  }

  halo.close();
  return valaszok;
}

// ===================================
// 3. A KÉRDÉS TCP-N — ez a mérés tárgya
// ===================================

/**
 * Egy TCP-kérdés EGY tükörhöz, MEGADOTT helyi portról.
 *
 * ⚠️ A kapcsolatot `resetAndDestroy()`-jal zárjuk, nem `end()`-del: különben a helyi port
 * `TIME_WAIT`-be kerül, és a KÖVETKEZŐ kérdés nem tudna ugyanarról a portról indulni —
 * épp az, amit mérni akarunk.
 */
function tcpKerdes(helyiPort, tukor) {                    // helyiPort = 0 → röpke port
  return new Promise((teljesites) => {
    let bejovo = Buffer.alloc(0);
    let kesz = false;

    const vege = (eredmeny) => {
      if (kesz) return;
      kesz = true;
      clearTimeout(ora);
      try { kapcsolat.resetAndDestroy(); } catch { /* már zárva */ }
      teljesites(eredmeny);
    };

    let kapcsolat;
    try {
      // ⛔ `family: 4` — MERT A NAT-OT AKARJUK MÉRNI. Az első mérésnél a tükör IPv6-on
      // felelt, ahol nincs port-átírás; az a válasz szép volt, és semmit nem ért.
      kapcsolat = connect(helyiPort
        ? { host: tukor.hoszt, port: tukor.port, localPort: helyiPort, family: 4 }
        : { host: tukor.hoszt, port: tukor.port, family: 4 });
    } catch (hiba) {
      return teljesites({ ok: hiba.message });
    }

    const ora = setTimeout(() => vege({ ok: 'nem válaszolt ' + IDOKORLAT + ' ms alatt' }),
      IDOKORLAT);

    kapcsolat.on('connect', () => kapcsolat.write(stunKeres()));

    kapcsolat.on('data', (darab) => {
      bejovo = Buffer.concat([bejovo, darab]);
      if (bejovo.length < 20) return;
      if (bejovo.readUInt32BE(4) !== SUTI) return vege({ ok: 'nem STUN-válasz jött' });
      const hossz = bejovo.readUInt16BE(2);
      if (bejovo.length < 20 + hossz) return;            // még nem teljes
      const cim = stunbolCim(bejovo.subarray(0, 20 + hossz));
      vege(cim ? { cim } : { ok: 'a válaszban nincs leképezett cím' });
    });

    kapcsolat.on('error', (hiba) => vege({ ok: hiba.code ?? hiba.message }));
    kapcsolat.on('close', () => vege({ ok: 'a vonal lezárult válasz nélkül' }));
  });
}

const varj = (ms) => new Promise((kesz) => setTimeout(kesz, ms));

/**
 * Minden tükör, SORBAN, UGYANARRÓL a helyi portról.
 *
 * ⚠️ AZ `EADDRINUSE`-T ÚJRAPRÓBÁLJUK — mérésből (2026-09-13): az előző kísérlet foglalata
 * még foghatja a portot, amikor a következő indulna. ⛔ Ez **nem** a leképezésről szól,
 * hanem a mi sorrendünkről — ha nem próbálnánk újra, egy saját hibánk látszana a router
 * tulajdonságának.
 */
async function tcpKerdesek(helyiPort, tukrok) {
  const valaszok = [];
  for (const tukor of tukrok) {
    let eredmeny = await tcpKerdes(helyiPort, tukor);
    for (let ujra = 0; ujra < 5 && eredmeny.ok === 'EADDRINUSE'; ujra++) {
      await varj(1500);
      eredmeny = await tcpKerdes(helyiPort, tukor);
    }
    valaszok.push({ tukor, ...eredmeny });
    await varj(500);                       // hagyjuk elengedni a portot a következő előtt
  }
  return valaszok;
}

/**
 * ⭐⭐ ELŐSZŰRÉS: MELYIK TÜKÖR FELEL EGYÁLTALÁN TCP-N? — **röpke** helyi portról.
 *
 * ⛔⛔ MIÉRT KELL, ÉS EZT A MÉRÉS TANÍTOTTA MEG (2026-09-13): egy válasz nélkül elakadt
 * kapcsolat `SYN_SENT`-ben **fogva tartja a rögzített helyi portot**, és a következő
 * kísérlet `EADDRINUSE`-szal bukik. Első nekifutásra emiatt **mind az öt tükör elbukott** —
 * és az a kép a routerről szólt volna, pedig a MI sorrendünk volt rossz.
 *
 * ⭐ Röpke portról ez nem fordulhat elő: minden kísérlet más portot kap, tehát a néma
 * tükrök nem akasztják meg egymást. Így kiderül, KIVEL érdemes egyáltalán mérni — és a
 * rögzített portot csak azokra használjuk el.
 *
 * ⚠️ Ez az előszűrés a leképezésről SEMMIT nem mond (más-más port), csak elérhetőséget mér.
 */
async function tcpElokeresek(tukrok) {
  const eredmenyek = await Promise.all(
    tukrok.map(async (tukor) => ({ tukor, ...(await tcpKerdes(0, tukor)) }))
  );
  return eredmenyek;
}

// ===================================
// 4. AZ ÍTÉLET
// ===================================

/**
 * ⛔ AZ ÍTÉLET CSAK AKKOR MONDHATÓ KI, HA LEGALÁBB KÉT KÜLÖNBÖZŐ tükör felelt.
 *
 * ⚠️ Egy válaszból semmi nem következik — az csak annyit mond, hogy a tükör él. *A
 * célfüggetlenség két célpont ÖSSZEHASONLÍTÁSA; egy méréssel nem eldönthető.* (D19: a
 * hiány nem eredmény.)
 */
function itelet(valaszok) {
  // ⛔ CSAK IPv4 SZÁMÍT: IPv6-on nincs NAT, tehát egy IPv6-válasz a kérdésre nem felel.
  const sikeresek = valaszok.filter((v) => v.cim && v.cim.csalad === 4);
  const ipv6 = valaszok.filter((v) => v.cim && v.cim.csalad === 6).length;
  if (sikeresek.length < 2) {
    return {
      eldolt: false,
      ok: 'kevesebb mint két tükör felelt IPv4-en (' + sikeresek.length + ')'
        + (ipv6 ? ' — ' + ipv6 + " felelt IPv6-on, az viszont a NAT-ról nem mond semmit" : '')
    };
  }
  const portok = [...new Set(sikeresek.map((v) => v.cim.port))];
  return {
    eldolt: true,
    celfuggetlen: portok.length === 1,
    portok,
    tukrok: sikeresek.length
  };
}

function kiir(sor = '') { console.log(sor); }

function valaszokKiirasa(cim, valaszok) {
  kiir(cim);
  for (const v of valaszok) {
    const jobb = v.cim
      ? (v.cim.csalad === 6 ? '⚠ IPv6 ' : '✓ ') + v.cim.cim + ':' + v.cim.port
        + (v.cim.csalad === 6 ? '   (nincs NAT — a kérdésre nem felel)' : '')
      : '✗ ' + (v.ok ?? 'nem felelt');
    kiir('  ' + v.tukor.nev.padEnd(12) + jobb);
  }
  kiir();
}

// ===================================
// 5. A MÉRÉS
// ===================================

async function meres() {
  const helyiPort = parseInt(process.argv[2], 10) || ALAP_HELYI_PORT;

  kiir('A TCP-LEKÉPEZÉS MÉRÉSE — célfüggetlen-e a router?');
  kiir('  a helyi ' + helyiPort + '-es portról kérdezünk, több tükröt');
  kiir('  ⚠ Közben NE fusson `orjarat`, `figyel` vagy `pajzsfuro` ezen a porton.');
  kiir();

  // ----- 1. KONTROLL: UDP -----
  //
  // ⭐ Erről TUDJUK a választ (2026-08-29: célfüggetlen). Ha ma is az jön ki, akkor a
  // TCP-eredmény KÜLÖNBSÉG, nem mérési hiba.
  let udp = [];
  try {
    udp = await udpKerdesek(helyiPort, TUKROK);
  } catch (hiba) {
    kiir('⚠ A UDP-kontroll nem indult el: ' + hiba.message);
  }
  valaszokKiirasa('1. KONTROLL — UDP (erről tudjuk: célfüggetlen)', udp);
  const udpItelet = itelet(udp);

  // ----- 2. ELŐSZŰRÉS: KI FELEL EGYÁLTALÁN TCP-N? -----
  const eloszures = await tcpElokeresek(TUKROK);
  valaszokKiirasa('2. ELŐSZŰRÉS — TCP, röpke portról (csak elérhetőség)', eloszures);

  const beszedesek = eloszures.filter((v) => v.cim && v.cim.csalad === 4).map((v) => v.tukor);
  kiir('  → IPv4-en TCP-n felel: '
    + (beszedesek.length ? beszedesek.map((t) => t.nev).join(', ') : '(egy sem)'));
  kiir();

  // ----- 3. A MÉRÉS TÁRGYA: TCP, A RÖGZÍTETT PORTRÓL -----
  //
  // ⭐ Csak azokkal, akik felelnek — a néma tükrök különben elfogyasztanák a portot.
  let tcp = [];
  if (beszedesek.length >= 2) {
    tcp = await tcpKerdesek(helyiPort, beszedesek);
    valaszokKiirasa('3. A MÉRÉS — TCP, mindig a ' + helyiPort + '-es helyi portról', tcp);
  } else {
    kiir('3. A MÉRÉS — kihagyva: két beszédes tükör kellene hozzá.');
    kiir();
  }
  const tcpItelet = itelet(tcp);

  // ----- AZ EREDMÉNY -----
  kiir('AZ EREDMÉNY');
  kiir('  UDP: ' + (udpItelet.eldolt
    ? (udpItelet.celfuggetlen ? '⭐ CÉLFÜGGETLEN' : '⛔ CÉL-FÜGGŐ')
      + '  (' + udpItelet.tukrok + ' tükör, portok: ' + udpItelet.portok.join(', ') + ')'
    : '— nem dőlt el: ' + udpItelet.ok));
  kiir('  TCP: ' + (tcpItelet.eldolt
    ? (tcpItelet.celfuggetlen ? '⭐ CÉLFÜGGETLEN' : '⛔ CÉL-FÜGGŐ')
      + '  (' + tcpItelet.tukrok + ' tükör, portok: ' + tcpItelet.portok.join(', ') + ')'
    : '— nem dőlt el: ' + tcpItelet.ok));
  kiir();

  // ----- ÉS AMIT EBBŐL KÖVETKEZTETNI SZABAD -----
  if (!tcpItelet.eldolt) {
    kiir('⚠ A TCP-kérdés nem dőlt el: ' + tcpItelet.ok + '.');
    kiir('  ⛔ Ez NEM azt jelenti, hogy a leképezés rossz — azt, hogy a tükrök nem');
    kiir('     feleltek TCP-n. Kell két olyan tükör, ami TCP-t is kiszolgál.');
    kiir('  ⭐ A koino saját tükre (`tukor` parancs, `vonal.js` → `latlak`) TCP-n megy —');
    kiir('     két elérhető koino-társ ugyanezt a mérést elvégzi, idegen szolgáltatás nélkül.');
    return;
  }

  if (tcpItelet.celfuggetlen) {
    kiir('⭐⭐ A TCP-LEKÉPEZÉS CÉLFÜGGETLEN — a TCP-pajzsfúrásnak VAN értelme.');
    kiir('  A tükörtől kapott külső port egy HARMADIK félre is érvényes, tehát');
    kiir('  bemondható. ⏸️ A következő lépés: a TCP-fúró tanulja meg megkérdezni.');
  } else {
    kiir('⛔⛔ A TCP-LEKÉPEZÉS CÉL-FÜGGŐ — a TCP-pajzsfúrás ezen a vonalon LEHETETLEN.');
    kiir('  Minden célponthoz új külső port jár, tehát a tükör válasza CSAK A TÜKÖRRE igaz.');
    kiir('  A társnak bemondott szám már a kimondás pillanatában rossz — és ezen');
    kiir('  semmilyen program nem segít. ⭐ A UDP-vonal ABLAKA az út, nem a TCP.');
  }

  if (udpItelet.eldolt && tcpItelet.eldolt && udpItelet.celfuggetlen !== tcpItelet.celfuggetlen) {
    kiir();
    kiir('⭐ ÉS A KONTROLL MEGERŐSÍTI: a két szállítás MÁSHOGY viselkedik ugyanazon a');
    kiir('  routeren. A különbség tehát valódi, nem mérési hiba.');
  }
}

meres().catch((hiba) => {
  console.error('A mérés elakadt:', hiba.message);
  process.exit(1);
});
