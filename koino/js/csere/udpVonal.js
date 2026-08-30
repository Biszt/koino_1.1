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
// ===== A KÉT ŐR, AMI ELŐSZÖR HIÁNYZOTT (2026-08-30) =====
//
// A TCP-től nem három dolgot kapunk ingyen, hanem ötöt — a maradék kettő először kimaradt
// innen, és a 30%-os csomagvesztéses önpróba ettől 6-ból 5-ször VÉGTELENÜL VÁRT:
//
//   · KIÜRÍTÉS a lezáráskor — a TCP `end()` előbb kiírja a puffert, és csak utána küld
//     FIN-t. A régi `end()` itt ELDOBTA a még nyugtázatlan darabot. Márpedig a
//     `parbeszed` a saját utolsó üzenetét elküldi, és nem vár rá nyugtát: ha közben a
//     másik válasza megjön, azonnal kilép. Ha épp az a csomagunk veszett el, a másik
//     örökre várta. → `kiurites()`
//   · TÉTLENSÉGI ÓRA — hogy a néma társ ne ragaszthasson be. → `setTimeout()`
//
// ⚠️ A TANULSÁG: a „megbízható folyam" nem attól megbízható, hogy újraküld, hanem attól,
// hogy MINDEN kimenetele véges. A néma nem-esemény a legrosszabb hibafajta.
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

// Ennyi ideig tűrjük, hogy a másik fél NE SZÓLJON SEMMIT. Ugyanaz a 10 másodperc, amit a
// `csereVonalon` használ TCP-n — a hívó felülírhatja (`beallitas.varakozasiIdo`).
const TETLENSEG_ALAP = 10000;

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

  // ----- A TÉTLENSÉGI ÓRA -----
  //
  // ⚠️ ITT KORÁBBAN EGY ÜRES `setTimeout` ÁLLT, ezzel az indoklással: „az újraküldés-korlát
  // betölti ezt a szerepet". NEM tölti be. Az újraküldés-korlát csak akkor véd, ha van
  // csomagunk ÚTON — amikor VÁRUNK a másikra, nincs se csomag, se időzítő, se határidő.
  // TCP-n ezt a `kapcsolat.setTimeout(varakozasiIdo, …)` fogta meg; itt kézzel kell.
  //
  // ⭐ A MÉRCE: MIT SZÁMÍT ÉLETJELNEK? Csak azt, amit TŐLE KAPUNK. A saját újraküldésünk
  // nem életjel — ha az nullázná az órát, egy halott társ mellett örökre pörögnénk.
  let tetlensegHatar = 0;
  let tetlensegOra = null;
  let tetlensegVisszahivas = null;

  const oratUjraindit = () => {
    if (!tetlensegHatar || lezarva) return;
    if (tetlensegOra) clearTimeout(tetlensegOra);
    tetlensegOra = setTimeout(() => {
      tetlensegOra = null;
      if (tetlensegVisszahivas) tetlensegVisszahivas();
    }, tetlensegHatar);
  };

  const oratMegallit = () => {
    if (tetlensegOra) { clearTimeout(tetlensegOra); tetlensegOra = null; }
  };

  // ----- A KIÜRÍTÉS -----
  //
  // Aki a `kiurites()`-re vár, ezt a függvényt kapja vissza. Két helyen sül el: amikor az
  // utolsó darab is nyugtázva lett (siker), és amikor feladtuk (kudarc) — harmadik eset
  // nincs, ezért nem tud beragadni.
  let uritesreVar = null;

  const uritestJelez = (sikerult) => {
    if (!uritesreVar) return;
    const jelzo = uritesreVar;
    uritesreVar = null;
    jelzo(sikerult);
  };

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
        uritestJelez(false);            // aki a kiürítésre vár, itt is kapjon választ
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

    oratUjraindit();                   // ÉLETJEL: tőle jött valami, tehát él
    bajtKapott += bajtok.length;
    let uzenet;
    try { uzenet = JSON.parse(bajtok.toString('utf8')); } catch { return; }

    // Nyugta érkezett: mehet a következő darab.
    if (Number.isInteger(uzenet.ny)) {
      if (uton && uzenet.ny === uton.sorszam) {
        if (idozito) { clearInterval(idozito); idozito = null; }
        uton = null;
        kovetkezotKuld();
        // Ha se úton, se sorban nincs több — mindent kiírtunk, a lezárás mehet.
        if (!uton && !sor.length) uritestJelez(true);
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

    /**
     * Tétlenségi határidő: ha ennyi ideig SEMMI nem jön a másiktól, szólunk.
     * Úgy viselkedik, mint a `net.Socket.setTimeout` — a `csereUdpResen` ugyanúgy
     * használja, mint a `csereVonalon` a TCP-set.
     */
    setTimeout(ezredmasodperc, visszahivas) {
      tetlensegHatar = ezredmasodperc;
      tetlensegVisszahivas = visszahivas;
      oratUjraindit();
      return this;
    },

    /**
     * Megvárja, amíg minden elküldött darabot NYUGTÁZTAK.
     *
     * ⭐ Ez a TCP `end()`-jének kiírás-része, kézzel. A lezárás előtt ezt meg kell várni,
     * különben az utolsó üzenetünk némán elveszhet — és a másik fél örökre várja.
     *
     * @returns {Promise<boolean>} igaz, ha minden kiment; hamis, ha feladtuk
     */
    kiurites() {
      if (lezarva || (!uton && !sor.length)) return Promise.resolve(true);
      return new Promise((teljesites) => { uritesreVar = teljesites; });
    },

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

    // ⚠️ A LEZÁRÁS ELDOBJA, AMI MÉG ÚTON VAN — ezért kell ELŐTTE `kiurites()`.
    end() {
      lezarva = true;
      if (idozito) { clearInterval(idozito); idozito = null; }
      oratMegallit();
      uritestJelez(false);             // ha valaki mégis a kiürítésre várna, ne ragadjon be
    },

    /** Mint a `net.Socket.destroy(hiba)`: előbb hiba, aztán close — a `parbeszed` így várja. */
    destroy(hiba) {
      this.end();
      if (hiba) jelez('error', hiba);
      jelez('close');
    }
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
 * @param {Object} [beallitas] - amit a `parbeszed` kap (pl. hirdetettCimek), és
 *   `varakozasiIdo`: ennyi néma ezredmásodperc után feladjuk (alap: 10 000)
 */
export async function csereUdpResen(halo, tarsCim, tarsPort, tar, koino, beallitas = {}) {
  const varakozasiIdo = beallitas.varakozasiIdo ?? TETLENSEG_ALAP;
  console.log('csereUdpResen - KEZDÉS', { tarsCim, tarsPort, koino, varakozasiIdo });

  const kapcsolat = udpKapcsolat(halo, tarsCim, tarsPort);

  // ⚠️ A NÉMA TÁRS NEM RAGASZTHAT BE. Ha a másik elhallgat (elment, lefagyott, vagy csak
  // elveszett a válasza), ez a határidő zárja le a párbeszédet — HIBÁVAL, nem csenddel.
  // E nélkül a `koino.js` őrjárata is megállhatna örökre egyetlen csendes társon.
  kapcsolat.setTimeout(varakozasiIdo, () => {
    kapcsolat.destroy(new Error('A másik fél nem válaszol (' + varakozasiIdo + ' ms)'));
  });

  try {
    const eredmeny = await parbeszed(kapcsolat, tar, koino, beallitas);

    // ⭐ ELŐBB KIÜRÍTÉS, CSAK UTÁNA ZÁRÁS. A párbeszéd akkor is véget érhet, amikor a MI
    // utolsó üzenetünk még úton van (a `parbeszed` az utolsó LENYOMAT-ra már nem vár
    // nyugtát). Ha itt azonnal zárnánk, azt a darabot eldobnánk — és a másik fél örökre
    // várná. ⚠️ Pontosan ez volt a holtpont, amit a 30%-os önpróba 6-ból 5-ször elkapott.
    const kiment = await kapcsolat.kiurites();
    if (!kiment) {
      console.warn('csereUdpResen - az utolsó darab nem lett nyugtázva', { tarsCim, tarsPort });
    }

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
