// koino/js/csere/vonal.js

// Felelősség: a CSERE SZÁLLÍTÁSA — ugyanaz a protokoll, most már dróton.
//
// ⭐ MIT CSINÁL, ÉS MIT NEM. Ez a fájl SEMMIT nem tud a koinóról: nem ismer eseményt,
// szabályt, tudatpontot. Csak annyit tesz, hogy a [`csere.js`](csere.js) objektumait
// oda-vissza küldi egy TCP-kapcsolaton. Ha itt hiba van, az szállítási hiba; a protokoll
// helyessége a csere.js önpróbáiban dől el, hálózat nélkül.
//
// ===== A VONAL ALAKJA: soronként egy JSON-üzenet =====
//
// Ugyanaz, mint a tár alakja (`esemenyek.jsonl`): egy sor = egy üzenet. Nincs külön
// hálózati séma, amit külön karban kellene tartani, és a forgalom emberi szemmel is
// olvasható — egy `nc`-vel bele lehet nézni.
//
//   {"uzenet":"LENYOMAT","lenyomat":"…"} — az egész tudásom 43 karakterben
//   {"uzenet":"ALLAS","allas":{…}}      — ezt tudom (részletesen)
//   {"uzenet":"KEREK","kerelem":{…}}    — ebből ez hiányzik nekem
//   {"uzenet":"ESEMENY","esemeny":{…}}  — tessék, egy esemény
//   {"uzenet":"KESZ"}                   — mindent elküldtem, amit kértél
//
// ⭐ A LENYOMAT AZ ELSŐ, ÉS EZ A LÉNYEG (D35, B. lépés). A részletes ÁLLÁS ára 162
// bájt/e-ember — 10 000 fősnél ~1,6 MB, mindkét irányban. A hétköznapi eset viszont az,
// hogy KÉT CSERE KÖZÖTT SEMMI NEM TÖRTÉNT. Ezért a kör a 43 karakteres lenyomattal
// kezdődik: ha a kettő egyezik, azonnal végeztünk, és a részletes állás el sem indul.
// Egy „nincs újdonság" csere így 1,6 MB helyett ~100 bájt.
//
// ===== SZIMMETRIKUS: NINCS KLIENS ÉS SZERVER =====
//
// Mindkét fél UGYANAZT a menetet futtatja: elmondja az állását, kér, ad, beolvaszt. Aki
// „csatlakozik", az csak annyiban más, hogy ő nyitja a kapcsolatot — utána a két oldal
// megkülönböztethetetlen. Ezért van egyetlen `parbeszed` függvény, és nem kettő.
//
// ⚠️ A MÁSIK FÉL IDEGEN. Amit küld, az adat, nem parancs: minden esemény átmegy az
// `esemenyMentese` ellenőrzésén (aláírás + azonosító), az értelmezhetetlen sort kihagyjuk,
// a túl hosszú sort pedig elvágjuk — egy rosszindulatú fél ne tudjon memóriát elfogyasztani.
//
// Használják: koino/koino.js (a `figyel` és a `csere` parancs) és a csereProba.js.

import { createServer, connect } from 'node:net';

import {
  allasOsszeallitasa, allasLenyomata, hianyokSzamitasa, valaszOsszeallitasa, beolvasztas
} from './csere.js';

// Egy sor legfeljebb ekkora lehet. Egy esemény ~400 bájt, egy 10 000 fős ÁLLÁS ~1,6 MB —
// a 8 MB tehát bőven elég, de egy végtelen sor már nem fér bele.
const SOR_KORLAT = 8 * 1024 * 1024;

// Egy kapcsolaton legfeljebb ennyi kört futunk. Nem díszítés: ha valami körbe-körbe
// járna, azt HIBAKÉNT akarjuk látni, nem végtelen ciklusként.
const KOR_KORLAT = 5;

// ===================================
// AZ ÜZENET-SOR — a bejövő sorok kiolvasása
// ===================================

/**
 * A kapcsolatra érkező sorokat üzenetekké alakítja, és `kovetkezo()`-vel adagolja.
 *
 * Miért kell külön ilyen? Mert a TCP nem üzeneteket szállít, hanem bájt-folyamot: egy
 * `data` esemény tartalmazhat fél üzenetet vagy hármat is. A sorokra bontás a mi dolgunk.
 *
 * @param {import('node:net').Socket} kapcsolat
 * @returns {{kovetkezo: () => Promise<Object>}}
 */
function uzenetSor(kapcsolat) {
  const beerkezett = [];
  const varakozok = [];
  let puffer = '';
  let hiba = null;
  let lezarult = false;

  const kiszolgal = () => {
    while (varakozok.length && (beerkezett.length || lezarult || hiba)) {
      const { teljesites, elutasitas } = varakozok.shift();
      if (beerkezett.length) teljesites(beerkezett.shift());
      else if (hiba) elutasitas(hiba);
      else elutasitas(new Error('A vonal lezárult, mielőtt a válasz megjött volna'));
    }
  };

  kapcsolat.setEncoding('utf8');

  kapcsolat.on('data', (darab) => {
    puffer += darab;

    let vege;
    while ((vege = puffer.indexOf('\n')) !== -1) {
      const sor = puffer.slice(0, vege);
      puffer = puffer.slice(vege + 1);
      if (!sor.trim()) continue;
      try {
        beerkezett.push(JSON.parse(sor));
      } catch {
        // Egy értelmetlen sor nem szakíthatja meg a cserét — ahogy a tárban sem.
        console.warn('uzenetSor - értelmezhetetlen sor, kihagyva', { hossz: sor.length });
      }
    }

    if (puffer.length > SOR_KORLAT) {
      hiba = new Error('Túl hosszú sor érkezett — a vonalat elvágjuk');
      kapcsolat.destroy();
    }
    kiszolgal();
  });

  kapcsolat.on('error', (h) => { hiba = h; kiszolgal(); });
  kapcsolat.on('end', () => { lezarult = true; kiszolgal(); });
  kapcsolat.on('close', () => { lezarult = true; kiszolgal(); });

  return {
    kovetkezo() {
      return new Promise((teljesites, elutasitas) => {
        varakozok.push({ teljesites, elutasitas });
        kiszolgal();
      });
    }
  };
}

// ===================================
// A PÁRBESZÉD — egy kapcsolat teljes menete
// ===================================

/**
 * Lefuttatja a cserét egy már felépült kapcsolaton — mindkét oldalon ugyanígy.
 *
 * ⭐ MIKOR ÁLLUNK MEG? Ha egy körben SE NEM ADTUNK, SE NEM KAPTUNK semmit. Ezt a
 * feltételt mindkét fél ugyanúgy számolja ki (amit én küldtem, azt ő kapta), tehát
 * egyszerre lépnek ki — nem kell hozzá külön „vége" üzenet és nem kell megegyezni róla.
 *
 * Több kör azért kell, mert egy elrejtett elágazás felderítése két-három körbe telhet
 * (lásd a csere.js kérés-szabályát).
 *
 * @param {import('node:net').Socket} kapcsolat
 * @param {Object} tar
 * @param {string} koino
 * @param {number} [korlat]
 * @returns {Promise<{korok: number, uj: number, kuldott: number}>}
 */
export async function parbeszed(kapcsolat, tar, koino, korlat = KOR_KORLAT) {
  console.log('parbeszed - KEZDÉS', { koino });

  const sor = uzenetSor(kapcsolat);
  const kuld = (uzenet) => kapcsolat.write(JSON.stringify(uzenet) + '\n');

  /** A következő üzenet — és ellenőrizzük, hogy azt kaptuk-e, amit vártunk. */
  const varj = async (tipus) => {
    const uzenet = await sor.kovetkezo();
    if (uzenet.uzenet !== tipus) {
      throw new Error('Várt üzenet: ' + tipus + ', érkezett: ' + uzenet.uzenet);
    }
    return uzenet;
  };

  let korok = 0, uj = 0, kuldott = 0, reszletesAllasok = 0;

  for (let kor = 1; kor <= korlat; kor++) {
    korok = kor;

    // ----- 0. AZ OLCSÓ KÉRDÉS: „ugyanazt tudjuk?" (43 karakter, D35) -----
    //
    // ⭐ EZ A LÉPÉS SPÓROL. A részletes állás ára a létszámmal nő; ez a lenyomat nem.
    // Ha egyezik, a kör azonnal véget ér — és a hétköznapi eset épp ez.
    const sajatAllas = await allasOsszeallitasa(tar, koino);
    const sajatLenyomat = await allasLenyomata(sajatAllas);
    kuld({ uzenet: 'LENYOMAT', lenyomat: sajatLenyomat });
    const oveLenyomat = await varj('LENYOMAT');

    if (oveLenyomat.lenyomat === sajatLenyomat) {
      // Ugyanazt tudjuk. Nincs mit kérni és nincs mit adni — a részletes állást el sem
      // küldjük. Mindkét fél ugyanezt számolja ki, tehát egyszerre lépnek ki.
      console.log('parbeszed - egyező lenyomat, nincs mit cserélni', { kor });
      break;
    }

    // ----- 1. MINDKETTŐ ELMONDJA, MIT TUD (részletesen) -----
    reszletesAllasok++;
    kuld({ uzenet: 'ALLAS', allas: sajatAllas });
    const ove = await varj('ALLAS');

    // ----- 2. MINDKETTŐ KÉR -----
    kuld({ uzenet: 'KEREK', kerelem: hianyokSzamitasa(sajatAllas, ove.allas) });
    const kerese = await varj('KEREK');

    // ----- 3. MINDKETTŐ AD -----
    const kuldendok = await valaszOsszeallitasa(tar, kerese.kerelem);
    for (const esemeny of kuldendok) kuld({ uzenet: 'ESEMENY', esemeny });
    kuld({ uzenet: 'KESZ' });
    kuldott += kuldendok.length;

    // ----- 4. AMIT Ő KÜLDÖTT -----
    const erkezett = [];
    for (;;) {
      const uzenet = await sor.kovetkezo();
      if (uzenet.uzenet === 'KESZ') break;
      if (uzenet.uzenet !== 'ESEMENY') {
        throw new Error('Váratlan üzenet a csere közben: ' + uzenet.uzenet);
      }
      erkezett.push(uzenet.esemeny);
    }

    // ----- 5. BEOLVASZTÁS: ugyanaz a kapu, mint a saját műveleteinknél -----
    const eredmeny = await beolvasztas(tar, erkezett);
    uj += eredmeny.uj;

    // ----- 6. CSENDES KÖR? -----
    //
    // ⚠️ EZ MEGMARAD A LENYOMAT MELLETT IS, ÉS NEM FÖLÖSLEGES. A lenyomat akkor állít
    // meg, ha a két fél EGYETÉRT. Ez a feltétel akkor is megáll, ha nem: ha a másik fél
    // hibás vagy rosszindulatú, és nem adja meg, amit kérünk, a lenyomat sosem egyezne —
    // a csendes kör viszont kilép. A kettő együtt zárja ki a végtelen ciklust.
    if (kuldendok.length === 0 && erkezett.length === 0) break;
  }

  console.log('parbeszed - VÉGE', { korok, uj, kuldott, reszletesAllasok });
  return { korok, uj, kuldott, reszletesAllasok };
}

// ===================================
// FIGYELÉS — a koino fogad kapcsolatot
// ===================================

/**
 * Portot nyit, és mindenkivel cserél, aki csatlakozik.
 *
 * ⭐ EZ AZ, AMIT A BÖNGÉSZŐ NEM TUD (D29). Egy lap nem tud fogadni kapcsolatot — ezért
 * kell neki jelzőpont, STUN és továbbító. Egy önálló program viszont egyszerűen kinyit
 * egy portot. A Szakasz 2 nagy kérdése (két készülék, két hálózat, szolgáltató nélkül)
 * ettől a néhány sortól válik egyáltalán mérhetővé.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {number} [port] - 0 = a rendszer válasszon (a próbák így kérnek szabad portot)
 * @param {Object} [beallitas]
 * @param {string} [beallitas.hoszt] - alapból `::` (IPv6 és — ahol a rendszer engedi — IPv4 is)
 * @param {Function} [beallitas.utana] - minden lezajlott csere után meghívjuk
 * @returns {Promise<{port: number, bezar: Function}>}
 */
export async function figyeloIndulasa(tar, koino, port = 0, beallitas = {}) {
  const { hoszt = '::', utana } = beallitas;
  console.log('figyeloIndulasa - KEZDÉS', { koino, port, hoszt });

  const kiszolgalo = createServer((kapcsolat) => {
    const honnan = kapcsolat.remoteAddress;
    parbeszed(kapcsolat, tar, koino)
      .then((eredmeny) => utana?.({
        ...eredmeny, honnan,
        bajtKuldott: kapcsolat.bytesWritten, bajtKapott: kapcsolat.bytesRead
      }))
      .catch((hiba) => {
        console.warn('figyeloIndulasa - a csere megszakadt', { honnan, ok: hiba.message });
        utana?.({ honnan, hiba: hiba.message });
      })
      .finally(() => kapcsolat.end());
  });

  await new Promise((teljesites, elutasitas) => {
    kiszolgalo.once('error', elutasitas);
    kiszolgalo.listen(port, hoszt, teljesites);
  });

  const valodiPort = kiszolgalo.address().port;
  console.log('figyeloIndulasa - VÉGE', { port: valodiPort });

  return {
    port: valodiPort,
    bezar: () => new Promise((teljesites) => kiszolgalo.close(teljesites))
  };
}

// ===================================
// CSATLAKOZÁS — a koino megkeresi a másikat
// ===================================

/**
 * Csatlakozik egy másik koinóhoz, és lefuttatja a cserét.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} cim - IP-cím vagy név (IPv6-cím is: `2001:…`)
 * @param {number} port
 * @param {number} [varakozasiIdo] - ennyi ezredmásodperc után feladjuk
 * @returns {Promise<{korok: number, uj: number, kuldott: number}>}
 */
export async function csereVonalon(tar, koino, cim, port, varakozasiIdo = 10000) {
  console.log('csereVonalon - KEZDÉS', { cim, port });

  // family: 0 → a rendszer maga válasszon IPv4 és IPv6 között. A Szakasz 2 mérése miatt
  // fontos, hogy az IPv6 ne legyen kizárva.
  const kapcsolat = connect({ host: cim, port, family: 0 });
  kapcsolat.setTimeout(varakozasiIdo, () => {
    kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
  });

  await new Promise((teljesites, elutasitas) => {
    kapcsolat.once('connect', teljesites);
    kapcsolat.once('error', elutasitas);
  });

  try {
    const eredmeny = await parbeszed(kapcsolat, tar, koino);

    // ⭐ MENNYI ADAT MENT EL? (D35) Ez nem kíváncsiság: a csere ára befogadási kérdés —
    // egy mobilos e-embernek a számláján jelenik meg. Ami nem mérhető, azt nem lehet
    // olcsóvá tenni, ezért a szám mostantól minden cserénél kijön.
    const teljes = {
      ...eredmeny,
      bajtKuldott: kapcsolat.bytesWritten,
      bajtKapott: kapcsolat.bytesRead
    };

    console.log('csereVonalon - VÉGE', teljes);
    return teljes;
  } finally {
    kapcsolat.end();
  }
}
