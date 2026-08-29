// koino/js/csere/udpVonal.js

// Felelősség: A CSERE SZÁLLÍTÁSA UDP-N — a pajzsfúrással megnyitott résen.
//
// ⭐ MIÉRT KELL, HA MÁR VAN TCP-VONAL? Mert a pajzsfúrás UDP-vel nyitja a rést (csak egy
// UDP-foglalat tud egyszerre küldeni és fogadni ugyanazon a porton), a router pedig a
// TCP-t és az UDP-t KÜLÖN tartja számon. Vagyis az átfúrt lyukon **csak UDP fér át** —
// és a koino cseréje eddig csak TCP-n ment. Ez a fájl köti össze a kettőt.
//
// ⭐ A TRÜKK: NEM ÍRJUK ÁT A PROTOKOLLT. Ez a fájl egy olyan objektumot ad, ami ugyanúgy
// viselkedik, mint egy TCP-foglalat (`write`, `on('data')`, `remoteAddress`…), csak alatta
// UDP van. Így a `vonal.js` `parbeszed` függvénye — a teljes csere-menet — VÁLTOZATLANUL
// fut rajta. Ez az 1. szabály gyakorlati haszna: a szállítás cserélhető, mert a logika
// sosem tudta, min utazik.
//
// ===== AMIT A UDP NEM AD MEG, ÉS ITT PÓTOLNI KELL =====
//
// A TCP-től három dolgot kapunk ingyen, az UDP-től egyiket sem:
//   · MEGÉRKEZÉS — az UDP-csomag elveszhet, és senki nem szól érte
//   · SORREND    — a csomagok előzhetik egymást
//   · DARABOLÁS  — egy nagy üzenet nem fér egy csomagba
//
// Ezért van itt egy pici, de valódi „megbízható folyam": minden darab kap SORSZÁMOT, a
// másik NYUGTÁZZA, és amíg nem nyugtázta, ÚJRAKÜLDJÜK.
//
// ⚠️ SZÁNDÉKOSAN EGYSZERŰ: egyszerre EGY darab van úton („küldd — várd meg a nyugtát —
// küldd a következőt"). Ez lassabb, mint amit a TCP tud, de a koino cseréje apró és
// kérdés-válasz jellegű (egy „nincs újdonság" kör 334 bájt), ezért bőven elég — és
// cserébe ÁTLÁTHATÓ. Ha egyszer kevés lesz, itt kell javítani, a protokollhoz nem kell
// hozzányúlni.
//
// A vonal alakja itt is emberi szemmel olvasható marad:
//   {"sz":1,"a":"…szövegdarab…"}   — adat, sorszámmal
//   {"ny":1}                        — nyugta: „az 1-est megkaptam"
//
// Használják: koino.js (a pajzsfúrás után) és a csereProba.js.

import { parbeszed } from './vonal.js';

// Egy UDP-csomagba ennyi szöveget teszünk. Az 1200 bájt alatti csomag a legtöbb
// hálózaton darabolás nélkül átmegy — a nagyobb csomag könnyen elvész.
const DARAB_MERET = 1000;

// Ennyi időnként küldjük újra a nyugtázatlan darabot…
const UJRAKULDES_KOZ = 300;
// …és ennyi eredménytelen próbálkozás után feladjuk.
const UJRAKULDES_KORLAT = 20;

/**
 * TCP-foglalatnak látszó objektum, ami alatta UDP-t használ.
 *
 * @param {import('node:dgram').Socket} halo - a MÁR MEGNYITOTT (átfúrt) foglalat
 * @param {string} tarsCim - a másik KÜLSŐ címe
 * @param {number} tarsPort - a másik KÜLSŐ portja
 * @returns {Object} foglalat-szerű objektum a `parbeszed` számára
 */
export function udpKapcsolat(halo, tarsCim, tarsPort) {
  console.log('udpKapcsolat - KEZDÉS', { tarsCim, tarsPort });

  const figyelok = { data: [], error: [], end: [], close: [] };
  const jelez = (nev, ertek) => { for (const f of figyelok[nev] ?? []) f(ertek); };

  // ----- KÜLDÉS: egyszerre egy darab, nyugtára várva -----
  const sor = [];                 // a még el nem küldött darabok
  let kovetkezoSorszam = 1;
  let uton = null;                // { sorszam, szoveg, ismetles }
  let idozito = null;
  let lezarva = false;

  let bajtKuldott = 0, bajtKapott = 0;

  const csomagot = (targy) => {
    const bajtok = Buffer.from(JSON.stringify(targy), 'utf8');
    bajtKuldott += bajtok.length;
    halo.send(bajtok, tarsPort, tarsCim, (hiba) => {
      if (hiba) console.warn('udpKapcsolat - küldés bukott', { ok: hiba.message });
    });
  };

  const kovetkezotKuld = () => {
    if (uton || !sor.length || lezarva) return;
    uton = { sorszam: kovetkezoSorszam++, szoveg: sor.shift(), ismetles: 0 };
    csomagot({ sz: uton.sorszam, a: uton.szoveg });

    idozito = setInterval(() => {
      if (!uton) return;
      uton.ismetles++;
      if (uton.ismetles > UJRAKULDES_KORLAT) {
        // ⚠️ Feladjuk — de HIBAKÉNT, nem csendben. A néma nem-esemény a legrosszabb.
        clearInterval(idozito); idozito = null;
        jelez('error', new Error('a másik fél nem nyugtázta a ' + uton.sorszam
          + '. darabot (' + UJRAKULDES_KORLAT + ' próbálkozás után)'));
        return;
      }
      csomagot({ sz: uton.sorszam, a: uton.szoveg });
    }, UJRAKULDES_KOZ);
  };

  // ----- FOGADÁS: sorrendbe rakva, ismétlést elnyelve -----
  let vartSorszam = 1;
  const varakozo = new Map();     // sorszám → szöveg (ami előbb ért ide, mint kellett)

  const uzenetErkezett = (bajtok, felado) => {
    // ⚠️ Csak attól fogadunk el, akivel beszélünk. Ez NEM bizalom (3. szabály) — az
    // eseményeket úgyis az `esemenyMentese` ellenőrzi —, csak azért, hogy egy téves
    // csomag ne zavarja össze a sorszámozást.
    if (felado.address !== tarsCim || felado.port !== tarsPort) return;

    bajtKapott += bajtok.length;
    let uzenet;
    try { uzenet = JSON.parse(bajtok.toString('utf8')); } catch { return; }

    // Nyugta érkezett: mehet a következő darab.
    if (Number.isInteger(uzenet.ny)) {
      if (uton && uzenet.ny === uton.sorszam) {
        if (idozito) { clearInterval(idozito); idozito = null; }
        uton = null;
        kovetkezotKuld();
      }
      return;
    }

    if (!Number.isInteger(uzenet.sz) || typeof uzenet.a !== 'string') return;

    // Mindig nyugtázunk — akkor is, ha ez már megvolt: a nyugta is elveszhetett.
    csomagot({ ny: uzenet.sz });

    if (uzenet.sz < vartSorszam) return;          // ismétlés: elnyeljük
    varakozo.set(uzenet.sz, uzenet.a);

    // Ami sorrendben megvan, azt továbbadjuk a párbeszédnek.
    while (varakozo.has(vartSorszam)) {
      const szoveg = varakozo.get(vartSorszam);
      varakozo.delete(vartSorszam);
      vartSorszam++;
      jelez('data', szoveg);
    }
  };

  halo.on('message', uzenetErkezett);

  return {
    remoteAddress: tarsCim,
    remotePort: tarsPort,
    get bytesWritten() { return bajtKuldott; },
    get bytesRead() { return bajtKapott; },

    setEncoding() { /* mi mindig szöveget adunk tovább */ },
    setTimeout() { /* az újraküldés-korlát tölti be ezt a szerepet */ },

    on(nev, figyelo) {
      if (figyelok[nev]) figyelok[nev].push(figyelo);
      return this;
    },
    once(nev, figyelo) { return this.on(nev, figyelo); },
    removeAllListeners(nev) { if (figyelok[nev]) figyelok[nev] = []; return this; },

    /** A párbeszéd ezzel küld — soronként egy JSON-üzenet, pont mint a TCP-n. */
    write(szoveg) {
      for (let i = 0; i < szoveg.length; i += DARAB_MERET) {
        sor.push(szoveg.slice(i, i + DARAB_MERET));
      }
      kovetkezotKuld();
      return true;
    },

    end() { lezarva = true; if (idozito) { clearInterval(idozito); idozito = null; } },
    destroy() { this.end(); jelez('close'); }
  };
}

/**
 * Lefuttatja a TELJES cserét egy már átfúrt UDP-résen.
 *
 * ⭐ Ez a pajzsfúrás jutalma: a megnyílt lyukon azonnal mehetnek az események, anélkül
 * hogy bármelyik routeren bármit beállítottunk volna.
 *
 * @param {import('node:dgram').Socket} halo - az átfúráshoz használt, NYITVA TARTOTT foglalat
 * @param {string} tarsCim
 * @param {number} tarsPort
 * @param {Object} tar
 * @param {string} koino
 * @param {Object} [beallitas] - amit a `parbeszed` kap (pl. hirdetettCimek)
 */
export async function csereUdpResen(halo, tarsCim, tarsPort, tar, koino, beallitas = {}) {
  console.log('csereUdpResen - KEZDÉS', { tarsCim, tarsPort, koino });

  const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort);
  try {
    const eredmeny = await parbeszed(kapcsolat, tar, koino, beallitas);
    const teljes = {
      ...eredmeny,
      bajtKuldott: kapcsolat.bytesWritten,
      bajtKapott: kapcsolat.bytesRead
    };
    console.log('csereUdpResen - VÉGE', teljes);
    return teljes;
  } finally {
    kapcsolat.end();
  }
}
