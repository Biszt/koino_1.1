// koino/meres/resSebessegMeres.js — MENNYIRE LASSÚ A FÁJL AZ ÁTFÚRT RÉSEN? (16. mérés)

// ⚠️ EZ NEM ÖNPRÓBA: nem igen/nem-et ad, hanem SZÁMOKAT. Azért készült, mert a randevú
// (5.7 / C) megépítésekor egy szerkezeti tulajdonság látszott, amit **meg kell mérni,
// nem megbecsülni**:
//
// ⛔⛔ AKKOR A UDP-VONAL EGYSZERRE EGY DARABOT TARTOTT ÚTON (stop-and-wait), és egy darab
// 1000 bájt. Egy 64 KB-os szelet tehát ~87 oda-vissza — ⭐ **és a szelet mérete ezen NEM
// segít**: 87 darab az 87 oda-vissza, akár egy szeletben van, akár nyolcban.
//
// ⭐ A kérdés tehát nem az volt, hogy „mekkora legyen a szelet", hanem hogy **kell-e a
// vonalnak ABLAK** (több darab úton egyszerre). ✅ **A válasz megjött, és az ablak megépült**
// (D67, 20–22. mérés): 16 darab úton, gyors újraküldés, mért újraküldési idő, AIMD.
//
// ⚠️⚠️ EZÉRT EZ A LAP MA MÁR **AZ ABLAKOS VONALAT MÉRI** — a szövege 2026-09-14-ig jelen
// időben állította az ellenkezőjét, vagyis *hamis magyarázatot adott a saját számaihoz*.
// A régi számok (az alapvonal) a `meres/eredmenyek.md` 16. mérésében maradtak meg.
//
// Futtatás:  node koino/meres/resSebessegMeres.js

import { mkdtemp } from 'node:fs/promises';

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSocket } from 'node:dgram';

import { fajlBlobTarolo } from '../js/tar/fajlTar.js';
import { esemenyTarNyitasa } from '../js/tar/fajlTar.js';
import { parbeszed, fajlHozatala, tcpNyito, figyeloIndulasa } from '../js/csere/vonal.js';
import { udpKapcsolat, fajlUdpResen } from '../js/csere/udpVonal.js';

// ⚠️ A koino minden metódusa naplóz — a mérés számai csak így olvashatók.
console.log = () => {};
console.warn = () => {};
const kiir = (sz = '') => process.stdout.write(String(sz) + String.fromCharCode(10));

const KOINO = 'meres';

/**
 * ⭐⭐ MAGVAS VÉLETLEN — hogy a mérés ÖSSZEHASONLÍTHATÓ legyen (2026-09-14).
 *
 * ⛔ Enélkül a veszteség-mérés minden futáson mást adna, és az „ablak előtt / ablak után"
 * összevetés **nem mérés lenne, hanem szerencse**. Ugyanaz a mag → ugyanaz a veszteség-minta.
 *
 * ⚠️ A HATÁRA KIMONDVA: a mag a *mintát* rögzíti, az *időzítést* nem — az újraküldések
 * sorrendje futásonként kicsit így is eltér. A szórást csökkenti, nem szünteti meg.
 */
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

/**
 * Két UDP-foglalat, egymásnak címezve — ez az „átfúrt rés" a mérésben.
 *
 * ⭐⭐ A VONAL HÁROM TULAJDONSÁGA ÁLLÍTHATÓ, és mindhárom a valóság egy-egy darabja:
 *
 *   · `kesleltetes` — az alap oda-út (az ablak ELŐTT ez MINDEN darabra rárakódott),
 *   · `ingadozas`   — ⭐ ehhez hozzáadódó szórás; ettől a csomagok **sorrendet is
 *                     cserélhetnek**, ami valódi hálózaton mindennapos,
 *   · `vesztes`     — ⛔ a csomagok ekkora hányada **elvész**.
 *
 * ⛔⛔ MIÉRT KELLETT A VESZTESÉG (Csaba, 2026-09-14): a vonalnak **veszteségre reagáló
 * ablakot** kell kapnia, és *veszteség-választ nem lehet becsületesen megépíteni olyan
 * műszerrel, ami soha nem veszít csomagot*. Az ugyanaz a csapda lenne, mint a vak próba:
 * zöld, és semmit nem bizonyít.
 *
 * ===== ⭐⭐⭐ ÉS A NEGYEDIK TULAJDONSÁG: A SZŰK KERESZTMETSZET (2026-09-14) =====
 *
 * ⛔⛔ A FENTI HÁROM EGYIKE SEM TUD TORLÓDÁST CSINÁLNI. A késleltetés **állandó** volt: nem
 * számított, hány darab van úton. ⚠️ Márpedig a torlódás épp az, hogy **a vonal nem bír el
 * annyit, amennyit küldünk** — és ilyenkor a késleltetés **NŐ** (gyűlik a sor), majd a
 * csomagok **el is vesznek** (megtelik a sor).
 *
 * ⭐ Enélkül a következő lépés (késleltetés-alapú torlódás-jel) **csak a hízelgő felét**
 * tudná megmérni: a véletlen vesztést, ahol nem szabad visszafogni. Hogy torlódásnál
 * helyesen viselkedik-e, arra **vakok maradnánk**. *Ugyanaz a rend, mint eddig: előbb a
 * mérce, aztán az építés.*
 *
 * ⭐ A MODELL A LEGEGYSZERŰBB HŰ ALAK: egy kiszolgáló, egy sor. Minden csomag **kivárja**,
 * amíg a vonal felszabadul (`szabadEttol`), és csak utána indul. Ha a sor hossza eléri a
 * `sorMeret`-et, a csomag **eldobódik** — *ez a torlódásos vesztés, és a küldő önmagának
 * okozta.*
 *
 * ===== ⭐⭐⭐ ÉS AZ ÖTÖDIK: A VERSENGŐ FOLYAM (D68 / 1. lépés, 2026-09-14) =====
 *
 * ⛔⛔ A NÉGY FENTI EGYIKE SEM TUD MEGMÉRNI KÉT DOLGOT, amit a D68 épp eldöntene:
 *
 *   · **ártunk-e MÁSNAK?** — a 23. mérés szerint teletömjük a sort (`sor: 13–14`), és aki
 *     ugyanazon a vonalon telefonál, **a mi sorunk mögé áll be**. Ez a kár eddig csak
 *     *következtetés* volt: a sor mélységéből olvastuk ki, nem mértük meg **rajta**.
 *   · **kiéheztetnek-e MINKET?** — a késleltetés-alapú jel ismert gyengéje, hogy egy
 *     veszteség-alapú szomszéd (bárki TCP-je) teletömi a sort, mi meg folyton visszahúzódunk.
 *     *Ha ezt nem mérjük, a D68 megépítése után sem tudnánk, mit fizettünk érte.*
 *
 * ⭐ EZÉRT KAP A VONAL EGY MÁSODIK, „IDEGEN" TERHELÉST, ami **ugyanazt a sort tölti**.
 * Kétféle, mert a két kérdés kétféle szomszédot kíván:
 *
 *   · `egyenletes` — állandó ütemű (mint egy hívás vagy videó). ⭐ Ő a **sértett fél**:
 *     a késleltetése megmondja, mekkora kárt okozunk neki.
 *   · `moho` — ablakot tart, és csak **vesztésre** fog vissza (mint egy TCP-letöltés).
 *     ⭐ Ő a **versenytárs**: mellette a MI átbocsátásunk mondja meg, kiéheztetnek-e.
 *
 * ⚠️ AZ IDEGEN NEM KÜLD VALÓDI CSOMAGOT — csak **foglalja a szűk keresztmetszetet**. Ez elég
 * és hű: a sor nem tudja, ki tette bele a csomagot. *A műszer így nem lesz bonyolultabb
 * annál, amit mérni akar.*
 *
 * @param {number} [beallitas.savszelesseg] - darab/másodperc (0 = korlátlan, mint eddig)
 * @param {number} [beallitas.sorMeret] - ennyi darab várhat; efölött eldobás
 * @param {Object} [beallitas.idegen] - { fajta: 'egyenletes'|'moho', uteme }
 */
async function udpParos({ kesleltetes = 0, ingadozas = 0, vesztes = 0, mag = 1,
  savszelesseg = 0, sorMeret = 32, idegen = null } = {}) {
  const nyit = () => new Promise((kesz) => {
    const h = createSocket('udp4');
    h.bind(0, '127.0.0.1', () => kesz(h));
  });
  const egyik = await nyit();
  const masik = await nyit();

  const veletlen = magvasVeletlen(mag);
  const szamlalo = { kuldott: 0, eldobott: 0, torlodas: 0, maxSor: 0 };

  // ⭐ A SZŰK KERESZTMETSZET ÁLLAPOTA, IRÁNYONKÉNT KÜLÖN — egy vonalnak két iránya van,
  // és a sor mindkettőben külön gyűlik. *A `Map` a foglalathoz köti.*
  const vonalAllapot = new Map();
  const szolgalatiIdo = savszelesseg > 0 ? 1000 / savszelesseg : 0;   // ms / darab

  // ⚠️⚠️ EZT A MÉRÉS TALÁLTA MEG A SAJÁT MŰSZERÉBEN (2026-09-14): 400 ms-os késleltetésnél
  // a függőben lévő küldések **TÚLÉLIK a foglalat bezárását**, és zárt foglalatra ütnek
  // (`ERR_SOCKET_DGRAM_NOT_RUNNING`) — a mérés összeomlott a leglassabb sornál.
  // *A műszert is meg kell mérni; a hiba nem a vonalé volt, hanem az enyém.*
  let zarva = false;
  const orak = new Set();

  /**
   * ⭐⭐ A SORBANÁLLÁS — EGY HELYEN, MERT MOSTANTÓL KÉT FORGALOM HASZNÁLJA (2026-09-14).
   *
   * ⚠️ Korábban ez a `h.send` belsejében élt. Az idegen folyamnak **ugyanazon a soron** kell
   * átmennie, különben nem versengés lenne, hanem két külön vonal — *és pont az a kérdés,
   * hogy egy sort hogyan osztunk meg.* Egy sor, egy kód: két igazság itt sem lehet.
   *
   * @returns {{eldobva: boolean, sorIdo: number, varakozok: number}}
   */
  const sorbaAll = (h, most) => {
    if (szolgalatiIdo <= 0) return { eldobva: false, sorIdo: 0, varakozok: 0 };

    const allapot = vonalAllapot.get(h) ?? { szabadEttol: 0 };
    vonalAllapot.set(h, allapot);

    // Hány darab vár még előtte? (a hátralévő idő / egy darab ideje)
    const varakozok = Math.max(0, Math.round((allapot.szabadEttol - most) / szolgalatiIdo));
    if (varakozok > szamlalo.maxSor) szamlalo.maxSor = varakozok;

    // ⛔ MEGTELT A SOR — a csomag eldobódik. *Ez a TORLÓDÁSOS vesztés: nem a vonal
    // hibája, hanem azé, aki többet küldött, mint amennyi elfér.*
    if (varakozok >= sorMeret) return { eldobva: true, sorIdo: 0, varakozok };

    const indul = Math.max(most, allapot.szabadEttol);
    allapot.szabadEttol = indul + szolgalatiIdo;
    return { eldobva: false, sorIdo: allapot.szabadEttol - most, varakozok };
  };

  // ⚠️ MINDIG beépítjük a számlálót — a késleltetés nélküli sor adja a VISZONYÍTÁST.
  // *Enélkül a „hányszor ment ki" oszlopnak nincs alapvonala, és az első olvasásra
  // újraküldésnek látszott az, ami valójában base64 + nyugta volt.*
  {
    for (const h of [egyik, masik]) {
      const eredeti = h.send.bind(h);
      h.send = (...ervek) => {
        if (zarva) return;
        szamlalo.kuldott++;

        // ⛔ A VESZTESÉG: a csomag elindul, és SOHA nem érkezik meg. ⚠️ A visszahívást
        // (callback) azért hívjuk meg sikerként, mert a küldő oldalon a UDP is ezt teszi:
        // a `send` sikere csak annyit jelent, hogy KIMENT — nem azt, hogy megérkezett.
        // *Ha itt hibát jeleznénk, a vonal olyat tudna meg, amit a valóságban nem tudhat.*
        if (vesztes > 0 && veletlen() < vesztes) {
          szamlalo.eldobott++;
          const visszahivas = ervek[ervek.length - 1];
          if (typeof visszahivas === 'function') visszahivas(null);
          return;
        }

        // ===== ⭐ A SOR: a csomag KIVÁRJA, amíg a vonal felszabadul =====
        const { eldobva, sorIdo } = sorbaAll(h, Date.now());
        if (eldobva) {
          szamlalo.eldobott++;
          szamlalo.torlodas++;
          const v = ervek[ervek.length - 1];
          if (typeof v === 'function') v(null);
          return;
        }

        const ido = sorIdo + kesleltetes + (ingadozas > 0 ? veletlen() * ingadozas : 0);
        if (ido <= 0) return eredeti(...ervek);

        const ora = setTimeout(() => {
          orak.delete(ora);
          if (zarva) return;                 // ⛔ a foglalat közben bezárt
          eredeti(...ervek);
        }, ido);
        orak.add(ora);
      };
    }
  }

  // ===================================
  // ⭐⭐⭐ AZ IDEGEN FOLYAM — a versengés (D68 / 1. lépés)
  // ===================================
  //
  // ⚠️ AZ IRÁNY A `egyik`-é, mert a fájl **szeleteit** ő küldi (a `resenMeres`-ben ő a
  // kiszolgáló). *A szűk keresztmetszet a feltöltési irány — otthon is ez a szűk.*
  const idegenSzam = { kuldott: 0, eldobott: 0, atment: 0, osszVaras: 0, maxVaras: 0 };
  let idegenOra = null;

  if (idegen && szolgalatiIdo > 0) {
    const halo = egyik;
    const jegyez = (sorIdo) => {
      idegenSzam.atment++;
      idegenSzam.osszVaras += sorIdo;
      if (sorIdo > idegenSzam.maxVaras) idegenSzam.maxVaras = sorIdo;
    };

    if (idegen.fajta === 'moho') {
      // ⭐ A VERSENYTÁRS: ablakot tart, és CSAK vesztésre fog vissza — pontosan az a
      // viselkedés, ami a puffert teletömi (és amivel a késleltetés-alapú jelnek együtt
      // kell élnie). *AIMD, ugyanaz a szabály, mint a mi vonalunkban.*
      let ablak = 4, uton = 0;
      const loket = () => {
        while (!zarva && uton < Math.floor(ablak)) {
          idegenSzam.kuldott++;
          uton++;
          const { eldobva, sorIdo } = sorbaAll(halo, Date.now());

          if (eldobva) {
            // ⛔ Vesztés: felezés. ⚠️ És KILÉPÜNK a löketből — különben (ablak = 1 mellett)
            // szinkron végtelen ciklus lenne. *A műszert is meg kell mérni.*
            idegenSzam.eldobott++;
            uton--;
            ablak = Math.max(1, ablak / 2);
            const varo = setTimeout(() => {
              orak.delete(varo);
              if (!zarva) loket();
            }, Math.max(10, 2 * kesleltetes));
            orak.add(varo);
            return;
          }

          // A „nyugta" a sorbanállás + oda-vissza idő múlva ér vissza.
          const ora = setTimeout(() => {
            orak.delete(ora);
            if (zarva) return;
            uton--;
            jegyez(sorIdo);
            ablak = Math.min(64, ablak + 1 / ablak);       // siker: óvatosan nő
            loket();
          }, sorIdo + 2 * kesleltetes);
          orak.add(ora);
        }
      };
      loket();
    } else {
      // ⭐ A SÉRTETT FÉL: állandó ütem, mint egy hívás. ⛔ Ő NEM fog vissza — nem is tud:
      // egy beszélgetésnek annyi csomagja van, amennyi. *Amit elszenved, az a MI kárunk.*
      const koz = Math.max(1, Math.round(1000 / (idegen.uteme ?? 50)));
      idegenOra = setInterval(() => {
        if (zarva) return;
        idegenSzam.kuldott++;
        const { eldobva, sorIdo } = sorbaAll(halo, Date.now());
        if (eldobva) { idegenSzam.eldobott++; return; }
        jegyez(sorIdo);
      }, koz);
    }
  }

  return {
    egyik, masik, szamlalo,
    idegen: idegen ? idegenSzam : null,
    egyikPort: egyik.address().port,
    masikPort: masik.address().port,
    bezar: () => {
      zarva = true;
      if (idegenOra) clearInterval(idegenOra);
      for (const ora of orak) clearTimeout(ora);
      orak.clear();
      egyik.close(); masik.close();
    }
  };
}

async function ujBlob(nev) {
  return fajlBlobTarolo(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-' + nev + '-')));
}

async function ujTar() {
  return esemenyTarNyitasa(KOINO, await mkdtemp(join(tmpdir(), 'koino-seb-tar-')));
}

/**
 * Egy fájl átvitele az átfúrt résen — mennyi idő alatt?
 *
 * ⚠️⚠️ A BUKÁS IS EREDMÉNY, NEM HIBA (D19). Veszteség mellett a mai vonal **fel is adhatja**
 * (`UJRAKULDES_KORLAT = 20`), és ezt **ki kell írni**, nem elszállni rajta — *épp ez az egyik
 * dolog, amit meg akarunk tudni a mai vonalról.*
 */
async function resenMeres(meret, beallitas = {}) {
  const gazda = await ujBlob('a');
  const vendeg = await ujBlob('b');

  const tartalom = new Uint8Array(meret);
  for (let i = 0; i < meret; i++) tartalom[i] = i % 251;
  const { lenyomat } = await gazda.ir(tartalom);

  const p = await udpParos(beallitas);
  const gazdaTar = await ujTar();

  const kezd = Date.now();
  try {
    // ⭐ A TORLÓDÁS-JEL A KÜLDŐ OLDALÁN SZÁMÍT (D68 / 2. lépés): a fájl szeleteit a GAZDA
    // küldi, tehát ő tölti a sort. *A kérő oldala keveset küld — rajta a jel alig látszana.*
    const [, eredmeny] = await Promise.all([
      parbeszed(udpKapcsolat(p.egyik, '127.0.0.1', p.masikPort,
        { torlodasJel: beallitas.torlodasJel }), gazdaTar, KOINO,
        { fajlOlvas: (l) => gazda.olvas(l) }),
      fajlUdpResen(p.masik, '127.0.0.1', p.egyikPort, vendeg, KOINO, lenyomat,
        { varakozasiIdo: 120000, torlodasJel: beallitas.torlodasJel })
    ]);
    return {
      kesz: eredmeny.kesz, ido: Date.now() - kezd, szeletek: eredmeny.szeletek,
      csomag: p.szamlalo, idegen: p.idegen
    };
  } catch (hiba) {
    // ⛔ A vonal feladta. Ez SZÁM, nem összeomlás — a mérés kiírja, és megy tovább.
    return { kesz: false, ido: Date.now() - kezd, ok: hiba.message,
             csomag: p.szamlalo, idegen: p.idegen };
  } finally {
    p.bezar();
  }
}

/** Ugyanaz TCP-n — hogy legyen mihez hasonlítani. */
async function tcpMeres(meret) {
  const gazda = await ujBlob('ta');
  const vendeg = await ujBlob('tb');

  const tartalom = new Uint8Array(meret);
  for (let i = 0; i < meret; i++) tartalom[i] = i % 251;
  const { lenyomat } = await gazda.ir(tartalom);

  const figyelo = await figyeloIndulasa(await ujTar(), KOINO, 0,
    { fajlOlvas: (l) => gazda.olvas(l) });

  const kezd = Date.now();
  try {
    const e = await fajlHozatala(vendeg, KOINO, lenyomat,
      tcpNyito('127.0.0.1', figyelo.port));
    return { kesz: e.kesz, ido: Date.now() - kezd, szeletek: e.szeletek };
  } finally {
    await figyelo.bezar();
  }
}

// ===================================
// A MÉRÉS
// ===================================

/** Méret → hány csomagba kerül ez a fájl TÖKÉLETES vonalon. Ez a viszonyítás. */
const alapvonal = new Map();

const sor = (cimke, meret, e) => {
  const kbs = e.ido > 0 ? (meret / 1024) / (e.ido / 1000) : Infinity;
  // ⭐ A TÉNYLEGES veszteséget írjuk ki, nem a kértet — a kettő kis mintán eltér, és a
  // mérésnek azt kell mondania, ami TÖRTÉNT (D19).
  const cs = e.csomag;
  // ⭐⭐ A CSOMAGSZÁM TESZI LÁTHATÓVÁ A PAZARLÁST — de csak VISZONYÍTVA.
  //
  // ⚠️ Az első kiírásom itt hazudott: a „×1,4" újraküldésnek látszott, pedig a **base64
  // (+33%) és a nyugták** adták. Ezért a viszonyítás a MÉRT alapvonal (a helyi sor
  // ugyanekkora fájlra), nem egy számolt ideál. *Ami e fölött van, az a pazarlás.*
  const alap = alapvonal.get(meret);
  const extra = cs && cs.kuldott
    ? '  ' + String(cs.kuldott).padStart(5) + ' csomag'
      + (alap && alap !== cs.kuldott ? '  ×' + (cs.kuldott / alap).toFixed(1) : '')
      + (cs.eldobott ? '  ' + (100 * cs.eldobott / cs.kuldott).toFixed(1) + '% veszett' : '')
      // ⭐⭐ A SOR MÉLYSÉGE A LEGBESZÉDESEBB SZÁM A TORLÓDÁSNÁL: megmondja, mennyire tömtük
      // tele a szűk keresztmetszetet. *Egy jól nevelt küldő SEKÉLYEN tartja — a mély sor
      // mindenki másnak is késleltetést okoz, nem csak nekünk.*
      + (cs.maxSor ? '  sor:' + String(cs.maxSor).padStart(3) : '')
      + (cs.torlodas ? '  ' + cs.torlodas + ' torlódásos' : '')
    : '';
  kiir(
    '  ' + cimke.padEnd(30)
    + String(Math.round(meret / 1024)).padStart(5) + ' KB  '
    + String(e.ido).padStart(7) + ' ms  '
    + (e.kesz && Number.isFinite(kbs) ? kbs.toFixed(0).padStart(6) + ' KB/s' : '       —')
    + (e.kesz ? extra : '   ⛔ FELADTA' + extra)
  );

  // ⭐⭐⭐ ÉS AMIT A SZOMSZÉD ELSZENVEDETT (D68 / 1. lépés) — ez az ÚJ szám.
  //
  // ⚠️ A `sor:` oszlop eddig csak azt mondta meg, mennyire tömtük tele a sort; hogy ez
  // MEKKORA KÁR MÁSNAK, az következtetés volt. Ez a sor **megméri rajta**: mennyit várt a
  // szomszéd csomagja, és mennyi veszett el belőle.
  if (e.idegen && e.idegen.kuldott) {
    const i = e.idegen;
    const atlag = i.atment ? i.osszVaras / i.atment : 0;
    kiir(
      '      ↳ idegen folyam:'.padEnd(32)
      + String(i.kuldott).padStart(5) + ' csomag  '
      + ('átlag ' + atlag.toFixed(1) + ' ms').padStart(16)
      + ('  csúcs ' + i.maxVaras.toFixed(0) + ' ms').padStart(15)
      + (i.eldobott ? '  ⛔ ' + (100 * i.eldobott / i.kuldott).toFixed(1) + '% eldobva' : '')
    );
  }
};

kiir('\n⭐ A FÁJL-ÁTVITEL SEBESSÉGE — TCP vs. az átfúrt rés\n');
kiir('  ' + 'mérés'.padEnd(30) + 'méret'.padStart(8) + '        idő      sebesség');
kiir('  ' + '─'.repeat(72));

for (const meret of [64 * 1024, 256 * 1024]) {
  sor('TCP (helyben)', meret, await tcpMeres(meret));
  const helyi = await resenMeres(meret);
  alapvonal.set(meret, helyi.csomag.kuldott);      // ⭐ EZ lesz a viszonyítás
  sor('UDP-rés (helyben)', meret, helyi);
}

// ⚠️ A lassú sorok 8 KB-tal mérnek — ahhoz is kell alapvonal, különben a `×` oszlopnak
// nincs mihez képest. Ezt csendben vesszük fel (nem tábla-sor, csak viszonyítás).
alapvonal.set(8 * 1024, (await resenMeres(8 * 1024)).csomag.kuldott);

// ⭐ MIT JELENT A KÉSLELTETÉS EGY VALÓDI HÁLÓZATON? (Az ablak ELŐTT ez volt a szűk
// keresztmetszet: ~1000 bájtonként egy oda-vissza — lásd a 16. mérést.)
kiir('');
for (const kesleltetes of [1, 5]) {
  sor('UDP-rés (+' + kesleltetes + ' ms)', 64 * 1024, await resenMeres(64 * 1024, { kesleltetes }));
}

// ⭐⭐ ÉS AMI 2026-09-14-TŐL VAN: INGADOZÁS ÉS VESZTESÉG.
//
// ⛔ A D67 szerint a vonalnak **veszteségre reagáló ablakot** kell kapnia. Ez a szakasz
// adta hozzá az ALAPVONALAT: mit tudott az AKKORI (stop-and-wait, fix 300 ms-os) vonal, ha
// a hálózat nem tökéletes. ✅ *Amit itt láttunk, azt javította meg a 20–22. mérés.*
kiir('');
for (const ingadozas of [5, 20]) {
  sor('UDP-rés (1 ms ± ' + ingadozas + ' ms szórás)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, ingadozas }));
}

kiir('');
for (const vesztes of [0.01, 0.05, 0.15]) {
  sor('UDP-rés (1 ms, ' + (vesztes * 100) + '% vesztés)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, vesztes }));
}

// ⛔⛔ ÉS A LEGÉLESEBB PRÓBA A FIX ÚJRAKÜLDÉSI IDŐRE: egy LASSÚ vonal.
//
// A `UJRAKULDES_KOZ` **300 ms**. Ha az oda-vissza ennél hosszabb, a vonal **minden darabot
// újraküld, MIELŐTT a nyugta megérkezne** — vagyis dupla forgalom, önhibából. ⚠️ Ez nem
// elképzelt eset: műholdas, mobil- és zsúfolt vonalakon a 400–600 ms hétköznapi.
//
// ⭐ Kisebb fájllal mérjük, mert itt minden darab drága — a KÉP a fontos, nem a KB/s.
kiir('');
for (const kesleltetes of [200, 400]) {
  sor('UDP-rés (' + kesleltetes + ' ms → ' + (2 * kesleltetes) + ' ms oda-vissza)', 8 * 1024,
    await resenMeres(8 * 1024, { kesleltetes }));
}

// ===================================
// ⛔⛔ A TORLÓDÁS — a negyedik tulajdonság (2026-09-14)
// ===================================
//
// ⭐ ITT A KÉSLELTETÉS **AZ ÚTON LÉVŐ DARABOK SZÁMÁTÓL FÜGG**: a szűk keresztmetszet
// másodpercenként `savszelesseg` darabot visz át, a többi **sorban áll**, és ha a sor
// megtelik (32), a csomag **elveszik**. *Ez a torlódás, és a küldő maga okozza.*
//
// ⚠️ EZ A SZAKASZ NEM A SEBESSÉGRŐL SZÓL, hanem a `sor:` oszlopról: mennyire tömjük tele a
// vonalat. *A következő lépés (késleltetés-alapú torlódás-jel) ezt akarja sekélyen tartani;
// a sebesség itt csak kísérő adat.*
kiir('');
for (const savszelesseg of [2000, 500]) {
  sor('UDP-rés (' + savszelesseg + ' darab/mp, 5 ms)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 5, savszelesseg }));
}

// ⚠️ ÉS EGY KIS PUFFERREL IS, hogy a torlódásos ELDOBÁS ága se maradjon méretlen: ha a sor
// csak 8 darabot bír, a 16-os ablak **túlcsordítja** — és a vesztés már nem a vonal zaja,
// hanem a **mi túlküldésünk**. *Egy méretlen ág olyan, mint egy vak próba.*
sor('UDP-rés (500 darab/mp, 8-as sor)', 64 * 1024,
  await resenMeres(64 * 1024, { kesleltetes: 5, savszelesseg: 500, sorMeret: 8 }));

// ===================================
// ⭐⭐⭐ A VERSENGÉS — A D68 ALAPVONALA (1. lépés, 2026-09-14)
// ===================================
//
// ⛔ EZ A SZAKASZ AZT A KÉT KÉRDÉST MÉRI, AMIRE EDDIG VAKOK VOLTUNK:
//
//   1. **ÁRTUNK-E MÁSNAK?** — egy állandó ütemű szomszéd (50 csomag/mp, mint egy hívás)
//      ugyanazon a soron. ⭐ Az `átlag` és a `csúcs` az Ő várakozása: *ennyivel késik a
//      beszélgetése, amíg mi fájlt viszünk.* A D68 célja ezt a számot levinni.
//   2. **KIÉHEZTETNEK-E MINKET?** — egy mohó, veszteség-alapú szomszéd (mint bárki TCP-je).
//      ⭐ Itt a MI `KB/s`-ünk a lelet: ennyi marad nekünk, amíg ő tolja. *Amikor a
//      késleltetés-alapú jel megépül, ennek a számnak ROMLANIA fog — és pont ezért kell
//      MOST megmérni, amíg a mai (veszteség-alapú) vonal az összehasonlítási alap.*
//
// ⚠️ ELŐBB A MÉRCE, AZTÁN AZ ÉPÍTÉS — ugyanaz a rend, mint eddig. *Ha a jelet előbb
// építenénk meg, nem lenne mihez mérni, hogy jobb lett-e.*
//
// ⚠️ ÉS 256 KB-TAL, NEM 64-GYEL — mérésből: egy 64 KB-os átvitel 260 ms, amibe a szomszédnak
// mindössze **9 csomagja** fér bele. *Kilenc mintából nem szabad átlagot mondani.* A 256 KB
// ~1 másodperc, tehát ~50 minta — és a viszonyítás is ugyanennyi ideig fut.
kiir('');
sor('UDP-rés + HÍVÁS a vonalon', 256 * 1024, await resenMeres(256 * 1024,
  { kesleltetes: 5, savszelesseg: 500, idegen: { fajta: 'egyenletes', uteme: 50 } }));

// ⚠️ ÉS UGYANAZ A HÍVÁS, AMIKOR MI NEM VAGYUNK A VONALON — ez a viszonyítás. *Enélkül a
// fenti szám önmagában semmit nem mond: nem tudnánk, mennyi belőle a vonal sajátja.*
{
  const p = await udpParos({ kesleltetes: 5, savszelesseg: 500,
    idegen: { fajta: 'egyenletes', uteme: 50 } });
  await new Promise((kesz) => setTimeout(kesz, 1000));
  const i = p.idegen;
  p.bezar();
  const atlag = i.atment ? i.osszVaras / i.atment : 0;
  kiir('      ↳ ugyanez ÜRES vonalon:'.padEnd(32) + String(i.kuldott).padStart(5)
    + ' csomag  ' + ('átlag ' + atlag.toFixed(1) + ' ms').padStart(16)
    + ('  csúcs ' + i.maxVaras.toFixed(0) + ' ms').padStart(15));
}

sor('UDP-rés + MOHÓ szomszéd', 256 * 1024, await resenMeres(256 * 1024,
  { kesleltetes: 5, savszelesseg: 500, idegen: { fajta: 'moho' } }));

// ⭐ ÉS A VISZONYÍTÁS EHHEZ IS: ugyanaz a 256 KB, szomszéd NÉLKÜL. *Enélkül nem tudnánk,
// mennyit vett el tőlünk a mohó — csak azt, hogy lassúak vagyunk.*
sor('UDP-rés (ugyanez, EGYEDÜL)', 256 * 1024, await resenMeres(256 * 1024,
  { kesleltetes: 5, savszelesseg: 500 }));

// ===================================
// ⭐⭐⭐ A JEL ALAKJA — A JELÖLTEK ÖSSZEHASONLÍTÁSA (D68 / 2. lépés, 2026-09-15)
// ===================================
//
// ⛔ A DÖNTÉST A MÉRÉS HOZZA, NEM AZ ÉRVELÉS (Csaba 1. válasza). Két jelölt fut ugyanazon a
// műszeren, ugyanazokon a helyzeteken:
//
//   · **Vegas** — a sorban álló darabok BECSÜLT SZÁMA a jel (α=2, β=4 darab). ⭐ A küszöb
//     **darabszám**, tehát skálafüggetlen — a 9. szabály szerint ez a legfontosabb
//     tulajdonsága: egy 1 ms-os és egy 400 ms-os vonalon **ugyanazt jelenti**.
//   · **LEDBAT** — a sorbanállási késleltetést tartja egy cél alatt. ⚠️ A klasszikus 100
//     ms-os cél varázsszám lenne, ezért nálunk a cél a `minRtt`-hez viszonyul.
//
// ⭐ A MÉRCE HÁROM OSZLOPBAN olvasható: **`sor:`** (mennyire tömjük tele a vonalat) · a
// **hívás késleltetése** (mennyit ártunk másnak) · és a **KB/s** (mit fizetünk érte).
kiir('');
kiir('  ⭐⭐⭐ A JEL ALAKJA — jelöltek egymás mellett (D68 / 2. lépés)');
kiir('  ' + '─'.repeat(72));

for (const jel of ['nincs', 'vegas', 'ledbat']) {
  // 1. A FŐ HELYZET: szűk keresztmetszet + egy hívás ugyanazon a vonalon.
  sor('[' + jel + '] szűk vonal + HÍVÁS', 256 * 1024, await resenMeres(256 * 1024,
    { kesleltetes: 5, savszelesseg: 500, torlodasJel: jel,
      idegen: { fajta: 'egyenletes', uteme: 50 } }));
}

kiir('');
for (const jel of ['nincs', 'vegas', 'ledbat']) {
  // 2. ⛔ A VÉLETLENÜL VESZTŐ VONAL: itt NINCS torlódás, tehát NEM szabad visszafogni.
  // *Ha egy jelölt itt romlik, az azt jelenti, hogy a zajt torlódásnak olvassa.*
  sor('[' + jel + '] 5% vesztés (nincs torlódás)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, vesztes: 0.05, torlodasJel: jel }));
}

kiir('');
for (const jel of ['nincs', 'vegas', 'ledbat']) {
  // 3. ⚠️ A MOHÓ SZOMSZÉD: itt derül ki, mennyit fizetünk az udvariasságért.
  sor('[' + jel + '] MOHÓ szomszéd mellett', 256 * 1024, await resenMeres(256 * 1024,
    { kesleltetes: 5, savszelesseg: 500, torlodasJel: jel, idegen: { fajta: 'moho' } }));
}

kiir('');
for (const jel of ['nincs', 'vegas', 'ledbat']) {
  // 4. ⭐ ÉS EGY GYORS, ÜRES VONAL: a jel NE lassítson ott, ahol nincs mit kímélni.
  //
  // ⛔⛔ ITT `kesleltetes: 0` VAN, ÉS ENNEK OKA VAN — a műszer korlátja (2026-09-15).
  // A késleltetés-utánzat `setTimeout`-tal működik, aminek Windowson a felbontása
  // **~15,6 ms**. Mérve: egy „+1 ms-os" vonalon a `minRtt` 1,8 ms, a friss minták minimuma
  // viszont **15–31 ms** — vagyis a vonal nem 1 ms-os, hanem **ingadozó, 15 ms-os**.
  // ⚠️ A késleltetés-alapú jel ezt **helyesen** olvassa sorbanállásnak, és visszafog:
  // 591 → 131 KB/s. *Ez nem a jel hibája, hanem a műszeré.* ⭐ Nulla késleltetésnél nincs
  // időzítő (`if (ido <= 0) return eredeti(...)`), tehát ez a sor **hű**.
  //
  // ⭐⭐ ÉS EGY VÁRATLAN HASZON: a timer-kvantálás **véletlenül pont azt modellezte**, amitől
  // a D68 tart (a mobilvonal sorbanállástól független ingadozása) — a következménye tehát
  // mérve van: *ingadozó vonalon a késleltetés-jel fölöslegesen visszafog.*
  sor('[' + jel + '] gyors vonal, egyedül', 256 * 1024,
    await resenMeres(256 * 1024, { kesleltetes: 0, torlodasJel: jel }));
}

kiir('');
for (const jel of ['nincs', 'vegas', 'ledbat']) {
  // 5. ⚠️ ÉS A MOBIL-KOCKÁZAT, immár szándékosan: ingadozó késleltetés, torlódás NÉLKÜL.
  // *Itt nincs mit kímélni — aki visszafog, az téved.*
  sor('[' + jel + '] ingadozó vonal (±20 ms)', 64 * 1024,
    await resenMeres(64 * 1024, { kesleltetes: 1, ingadozas: 20, torlodasJel: jel }));
}

kiir('\n⚠️ A `+N ms` a valódi hálózat közelítése. Az ABLAK ELŐTT a késleltetés MINDEN');
kiir('   darabra rárakódott (~1000 bájtonként egy oda-vissza) — ez volt a 16. mérés');
kiir('   lelete. ✅ Az ablak (D67) azóta megépült: ez a lap MA MÁR AZT méri.');
kiir('');
kiir('⛔⛔ A VESZTESÉG- ÉS LASSÚ-SOROK A D67 ALAPVONALA.');
kiir('');
kiir('⚠️ ÉS AMIT A MÉRÉS CÁFOLT: azt vártam, hogy a vonal FELADJA (20 próbálkozás után).');
kiir('   Nem adta fel — sem 15% veszteségnél, sem 800 ms oda-visszánál. A `×` oszlop');
kiir('   mutatja a valódi kárt: hányszor megy ki egy darab ÁTLAGOSAN. ⭐ Ha ez 1,0');
kiir('   fölé megy lassú vonalon, az ÖNHIBÁNK: a fix 300 ms rövidebb, mint az');
kiir('   oda-vissza, tehát újraküldünk olyat, ami éppen ÚTON van.');
kiir('   ⛔ Ezért kell MÉRT újraküldési idő (RTT), nem beégetett szám.');
kiir('');
kiir('⚠️ A veszteség MAGVAS véletlenből jön (ugyanaz a mag → ugyanaz a minta), hogy az');
kiir('   „ablak előtt / ablak után" összevetés mérés legyen, ne szerencse. A mag a');
kiir('   mintát rögzíti, az időzítést nem — kis szórás marad.\n');

process.exit(0);
