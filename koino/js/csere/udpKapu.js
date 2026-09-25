// koino/js/csere/udpKapu.js

// Felelősség: AZ ÁLLANDÓ UDP-KAPU — egyetlen foglalat a teljes futásra (D69/3, 2026-09-25).
//
// ===== ⛔⛔ MIÉRT KELLETT =====
//
// Az őrjárat eddig MINDEN körben új UDP-foglalatot nyitott (`pajzsfurasTobbfele`), kopogott
// ~6 másodpercig, és a kör végén bezárta. Ebből három mért baj lett:
//
//   · „NYITVA VAN, DE NEM SZOLGÁL KI" (42. mérés, 16:37): a társ új ablakban kopogott, a
//     foglalatunk még élt (az előző munka lezárására várt), visszaszóltunk — de cserét nem
//     kezdtünk, mert őt „már átfúrtnak" tartottuk. Az ő cseréje 10 mp múlva elbukott.
//   · A KOPOGÁSNAK EGY PERCBE KELLETT ESNIE (41. mérés): a foglalat csak a saját ablakunkban
//     élt, tehát két eltérő ütemű készülék soha nem ért össze.
//   · KÖRÖNKÉNT MÁS KÜLSŐ PORT (32., 40. mérés): új foglalat = új leképezés, tehát a táblára
//     kiírt és a cserén terjedő szám hamar elavult.
//
// ⭐ EGY FOGLALAT, EGY LEKÉPEZÉS, EGÉSZ FUTÁSRA. A kopogásra bármikor felelünk, és a
// leképezés, amit egy kopogásunk nyitott, a következő percekben is él — tehát a társ
// kopogása akkor is átjut, ha nem ugyanabban a percben jön.
//
// ===== A PROTOKOLL — a régi üzenetek, egy új =====
//
//   {"uzenet":"KOPOG","tol":"…"}     — „itt vagyok, hallasz?"      (változatlan)
//   {"uzenet":"HALLAK","tol":"…"}    — „hallak"                     (változatlan)
//   {"uzenet":"FOGLALT","tol":"…"}   — „hallak, de épp veled dolgozom" (ÚJ — egy régi társ
//                                       nem ismeri, tehát figyelmen kívül hagyja, és kopog tovább)
//
// ⭐⭐ A MUNKA (csere + fájl-randevú) CSAK KÖLCSÖNÖS MEGERŐSÍTÉSRE INDUL: ha MI kopogtunk
// rá, és ő ERRE felelt. Aki bekopog, arra visszakopogunk — az ő válasza indítja a mi
// munkánkat, a mienk az övét. *Ugyanaz a kézfogás, mint eddig, csak nem egy ablakon belül.*
//
// ⛔⛔ TÁRSANKÉNT EGYSZERRE EGY MUNKA. A UDP-folyamoknak nincs saját azonosítójuk: egy
// foglalaton ugyanazzal a társsal két egyidejű kapcsolat összekeverné a sorszámokat (a
// fájl-randevú is ezért soros). Ezért ha a társ akkor kopog, amikor a munkánk vele már
// ADATOT kapott tőle, `FOGLALT` a válasz, nem `HALLAK` — különben egy második, összeakadó
// cserébe kezdene. Amint a munka véget ér, visszakopogunk rá.
// ⚠️ A kézfogás szakaszában (még nem jött tőle adat) viszont `HALLAK` a válasz: ha az ő
// HALLAK-unk elveszett, ő tovább kopog, és a FOGLALT beragasztaná a két felet.
//
// ⛔ A TÁRS-JEGYZÉK KORLÁTOS — időben (`ELFELEJTES`) ÉS darabra (`JEGYZEK_KORLAT`). A UDP
// feladócíme hamisítható: darab-plafon nélkül egy elárasztó a jegyzéket korlátlanul
// felduzzaszthatná. A plafon felett a legrégebben látott, munka és friss kopogásunk nélküli
// bejegyzés esik ki; ha ilyen nincs, az idegen új feladónak nem felelünk (2026-09-25).
//
// ⚠️ AMIT NEM CSINÁL: nem tud a koinóról, nem cserél, nem ír táblára. A munkát a hívó adja
// (`munka(halo, tars)`), ez a fájl csak azt dönti el, KIVEL és MIKOR indulhat.
//
// Használja: koino.js (az őrjárat).

import { createSocket } from 'node:dgram';
import { stunValaszE, kulsoCimFoglalaton } from './pajzsfuro.js';

// ⭐ Ennyi ezredmásodpercenként kopogunk egy még nem felelt társra — mint eddig a fúróban.
const KOPOGAS_KOZ = 1000;

// ⭐ Ennyi ideig számít egy kopogásunk „frissnek": az erre jött HALLAK indíthat munkát.
// Régebbi kopogásra jött HALLAK kóbor csomag — nem kezdünk tőle cserébe.
const FRISS_KOPOGAS = 15000;

// ⭐ A rég nem látott társak bejegyzése kiesik — a jegyzék nem hízhat korlátlanul (9. szabály).
const ELFELEJTES = 10 * 60 * 1000;

// ⛔ ÉS A JEGYZÉK DARABRA IS KORLÁTOS (2026-09-25, átnézés). Az idő önmagában nem elég: minden
// új feladócímről jövő KOPOG új bejegyzés, és a UDP feladócíme HAMISÍTHATÓ — egy elárasztó a
// 10 perces ablakon belül akármennyit gyárthatna. ⭐ A plafon felett a LEGRÉGEBBEN LÁTOTT,
// KISZORÍTHATÓ bejegyzés esik ki (lásd `kiszorithato`); ha nincs ilyen, az idegen új feladót
// nem vesszük fel. A saját céljaink mindig bekerülnek — azok számát a hívó korlátozza.
// ⚠️ A szám nem a hálózat méretéből jön, hanem a készülékéből: egy bejegyzés ~200 bájt, tehát
// ezer is elhanyagolható — a plafon az elárasztás ellen véd, egy valódi koinóban el sem érjük
// (a kötések és a társlista a tucatnyi nagyságrendben mozognak).
const JEGYZEK_KORLAT = 1000;

/**
 * Megnyitja az állandó UDP-kaput.
 *
 * @param {Object} beallitas
 * @param {number} beallitas.port - a helyi UDP-port (ugyanaz a szám, mint a TCP-kapué)
 * @param {(halo: Object, tars: {cim: string, port: number, bekopogo: boolean}) => Promise<Object>} beallitas.munka
 *   - a résen elvégzendő munka (csere + fájl-randevú); a hívó adja
 * @param {Function} [beallitas.jelez] - események a naplónak (D19)
 * @param {number} [beallitas.bekopogoKorlat] - egyszerre legfeljebb ennyi ismeretlen bekopogóval dolgozunk
 * @param {number} [beallitas.jegyzekKorlat] - a társ-jegyzék legfeljebb ennyi bejegyzést tart
 * @param {number} [beallitas.kopogasKoz]
 * @returns {Promise<Object>} { port, azonosito, kopog, sajatCim, zar, tarsakSzama }
 */
export async function udpKapuNyitasa(beallitas) {
  const {
    port, munka, jelez = () => {}, bekopogoKorlat = 3, jegyzekKorlat = JEGYZEK_KORLAT,
    kopogasKoz = KOPOGAS_KOZ
  } = beallitas;
  console.log('udpKapuNyitasa - KEZDÉS', { port });

  const halo = createSocket({ type: 'udp4' });
  await new Promise((kesz, hiba) => {
    halo.once('error', hiba);
    halo.bind(port, () => { halo.off('error', hiba); kesz(); });
  });
  // ⚠️ Egy hibás csomag vagy egy elérhetetlen cím ne állítsa le a kaput (2. szabály).
  halo.on('error', (hiba) => jelez({ mi: 'KAPU-HIBA', ok: hiba.message }));
  // A próbák 0-s porttal nyitnak — a valódi számot a rendszer adja.
  const valodiPort = halo.address().port;

  // ⭐ SAJÁT AZONOSÍTÓ — a saját visszhangunk kiszűrésére (ugyanaz a lecke, mint a fúróban,
  // 2026-08-29: aki a saját kopogását hallja vissza, az „teljes sikert" jelentene).
  const azonosito = Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Társanként: kulcs ("cím:port", ahogy felel) → állapot.
  const tarsak = new Map();
  // Az épp futó kopogás-kör(ök) — a HALLAK ezekhez is beszámol.
  const korok = new Set();
  let lezarva = false;

  const most = () => Date.now();
  const kuld = (uzenet, cim, cport) => {
    if (lezarva) return;
    halo.send(JSON.stringify({ uzenet, tol: azonosito }), cport, cim, (hiba) => {
      if (hiba) jelez({ mi: 'KULDES-BUKOTT', cim, port: cport, ok: hiba.message });
    });
  };

  // ⛔ KISZORÍTHATÓ az a bejegyzés, amellyel nem fut munka, és amelyre mostanában nem
  // kopogtunk. ⚠️ A friss kopogás védi: arra a HALLAK még megjöhet, és ha a bejegyzés addig
  // kiesne, a válasz kóbor csomagnak látszana — egy elárasztó így a mi köreinket is elbuktatná.
  const kiszorithato = (t) => !t.munka && most() - t.utolsoKopogasunk > FRISS_KOPOGAS;

  // A legrégebben látott kiszorítható bejegyzés kiesik. Egy menet a jegyzéken — a plafon
  // felett, tehát csak elárasztáskor fut, és akkor is korlátos (jegyzekKorlat lépés).
  const helyetCsinal = () => {
    let legregebbi = null;
    for (const t of tarsak.values()) {
      if (kiszorithato(t) && (!legregebbi || t.latva < legregebbi.latva)) legregebbi = t;
    }
    if (!legregebbi) return false;
    tarsak.delete(legregebbi.kulcs);
    return true;
  };

  // ⚠️ A „tele" jelzés sorozatonként EGYSZER megy (D19): elárasztáskor csomagonként egy sor a
  // naplóban maga is elárasztás volna.
  let teleJelezve = false;

  /**
   * A társ bejegyzése — ha nincs, és `letrehoz`, létrehozzuk.
   * @param {boolean} [sajat] - a SAJÁT célunk (mi kopogunk rá): a plafon sem zárja ki
   * @returns {Object|null} null, ha a jegyzék tele, és egy idegen új feladónak nincs hely
   */
  const bejegyzes = (cim, cport, letrehoz = true, sajat = false) => {
    const kulcs = cim + ':' + cport;
    let t = tarsak.get(kulcs);
    if (!t && letrehoz) {
      const plafonAlatt = tarsak.size < jegyzekKorlat;
      if (!plafonAlatt && !helyetCsinal() && !sajat) {
        if (!teleJelezve) {
          teleJelezve = true;
          jelez({ mi: 'JEGYZEK-TELE', korlat: jegyzekKorlat, cim, port: cport });
        }
        return null;
      }
      if (plafonAlatt) teleJelezve = false;
      t = { cim, port: cport, kulcs, munka: null, adatJott: false, ujKopogas: false,
        bekopogo: false, utolsoKopogasunk: 0, latva: most() };
      tarsak.set(kulcs, t);
    }
    if (t) t.latva = most();
    return t;
  };

  const kopogj = (t) => {
    t.utolsoKopogasunk = most();
    // ⭐ Az első kopogásunk ideje — ebből lesz a „rés nyílt (N ms)" a naplóban.
    if (!t.kopogasKezdete) t.kopogasKezdete = t.utolsoKopogasunk;
    kuld('KOPOG', t.cim, t.port);
  };

  // ⚠️ A HELY AZ ELFOGADÁSKOR FOGLALÓDIK, nem a munka indulásakor: a kézfogás alatt a munka
  // még nem fut, és két egyszerre bekopogó közül különben mindkettő átjutna (a próba mutatta
  // meg). A foglalás a munka végével, vagy ha a kézfogás nem ért célba, a frissességgel jár le.
  const futoBekopogok = () => [...tarsak.values()].filter((t) => t.bekopogo
    && (t.munka || most() - t.utolsoKopogasunk <= FRISS_KOPOGAS)).length;

  const inditMunka = (t) => {
    t.adatJott = false;
    t.ujKopogas = false;
    const kezdet = most();
    const eltelt = t.kopogasKezdete ? kezdet - t.kopogasKezdete : null;
    t.kopogasKezdete = 0;
    jelez({ mi: 'ATFURVA', cim: t.cim, port: t.port, bekopogo: t.bekopogo, eltelt });
    const igeret = (async () => {
      try {
        const eredmeny = await munka(halo, { cim: t.cim, port: t.port, bekopogo: t.bekopogo });
        return { ok: true, eredmeny, eltelt: most() - kezdet };
      } catch (hiba) {
        jelez({ mi: 'ATFURT-MUNKA-BUKOTT', cim: t.cim, port: t.port, ok: hiba.message });
        return { ok: false, hiba: hiba.message, eltelt: most() - kezdet };
      }
    })();
    t.munka = igeret;
    igeret.then(() => {
      t.munka = null;
      t.bekopogo = false;
      // ⭐ Aki a munka alatt újra kopogott (és FOGLALT-at kapott), az most vár ránk.
      if (t.ujKopogas && !lezarva) { t.ujKopogas = false; kopogj(t); }
    });
    for (const kor of korok) kor.munkaIndult(t, igeret);
    return igeret;
  };

  halo.on('message', (adat, felado) => {
    if (lezarva || stunValaszE(adat)) return;
    let u;
    try { u = JSON.parse(adat.toString('utf8')); } catch { return; }
    if (!u || typeof u !== 'object') return;

    // ⭐ ADAT (a munka kapcsolatáé): csak megjegyezzük, hogy a beszélgetés már él.
    if (u.uzenet === undefined) {
      const t = tarsak.get(felado.address + ':' + felado.port);
      if (t && t.munka) t.adatJott = true;
      return;
    }
    if (u.tol === azonosito) { jelez({ mi: 'SAJAT-VISSZHANG', honnan: felado.address }); return; }

    if (u.uzenet === 'KOPOG') {
      const t = bejegyzes(felado.address, felado.port);
      // ⛔ Tele a jegyzék, és nincs kiszorítható hely: nem felelünk (se HALLAK, se
      // visszakopogás) — egy hamisított feladónak így nem küldünk semmit.
      if (!t) return;
      if (t.munka && t.adatJott) {
        // ⛔ A munkánk vele már javában folyik — egy második csere összeakadna vele.
        t.ujKopogas = true;
        kuld('FOGLALT', felado.address, felado.port);
        return;
      }
      const ujBekopogo = !t.munka && most() - t.utolsoKopogasunk > FRISS_KOPOGAS;
      if (ujBekopogo && futoBekopogok() >= bekopogoKorlat) {
        // ⚠️ Most nem fogadjuk — de FOGLALT-at mondunk, nem HALLAK-ot: egy HALLAK-ra ő
        // cserébe kezdene, amit nem szolgálnánk ki. Így tovább kopog, és később sorra kerül.
        t.ujKopogas = true;
        kuld('FOGLALT', felado.address, felado.port);
        jelez({ mi: 'BEKOPOGO-ELUTASITVA', cim: t.cim, port: t.port });
        return;
      }
      kuld('HALLAK', felado.address, felado.port);
      if (t.munka) return;
      // ⭐ BEKOPOGÓ: visszakopogunk — az ő HALLAK-ja indítja a mi munkánkat.
      if (ujBekopogo) {
        t.bekopogo = true;
        jelez({ mi: 'BEKOPOGO-CEL', cim: t.cim, port: t.port });
      }
      kopogj(t);
      return;
    }

    if (u.uzenet === 'HALLAK') {
      const t = bejegyzes(felado.address, felado.port);
      if (!t) return;
      for (const kor of korok) kor.hallak(t);
      if (t.munka) return;
      // ⭐ A CÍMRE kopogtunk, és egy MÁSIK portjáról felelt? A mobil NAT portot válthat
      // (32. mérés) — ez is a mi kopogásunkra jött válasz, nem kóbor csomag.
      if (most() - t.utolsoKopogasunk > FRISS_KOPOGAS) {
        for (const m of tarsak.values()) {
          if (m !== t && m.cim === t.cim && most() - m.utolsoKopogasunk <= FRISS_KOPOGAS) {
            t.utolsoKopogasunk = m.utolsoKopogasunk;
            break;
          }
        }
      }
      // ⚠️ Kéretlen HALLAK (nem kopogtunk rá mostanában) — kóbor csomag, nem kezdünk tőle.
      if (most() - t.utolsoKopogasunk > FRISS_KOPOGAS) return;
      inditMunka(t);
      return;
    }

    if (u.uzenet === 'FOGLALT') {
      const t = bejegyzes(felado.address, felado.port);
      if (!t) return;
      for (const kor of korok) kor.foglalt(t);
      jelez({ mi: 'FOGLALT', cim: t.cim, port: t.port });
    }
  });

  // A rég nem látott, munka nélküli társak kitakarítása.
  const takarito = setInterval(() => {
    const hatar = most() - ELFELEJTES;
    for (const [kulcs, t] of tarsak) if (!t.munka && t.latva < hatar) tarsak.delete(kulcs);
  }, 60000);
  takarito.unref?.();

  /**
   * Egy kopogás-kör: a megadott célokra kopogunk `idokorlat` ideig, és megvárjuk a közben
   * indult munkákat.
   *
   * ⭐ Akivel a munka már fut (mert ő kopogott be), arra nem kopogunk — a futó munkáját
   * számoljuk be. ⚠️ Ha a cél a CÍMÉT tartva más portról felel (a mobil NAT portot vált,
   * 32. mérés), azt is őt ismerjük fel — a munka a valódi, felelő porttal megy.
   *
   * @returns {Promise<{celok: number, atfurt: number, sikeres: number, foglalt: number,
   *                    kuldott: number, eredmenyek: Array<Object>}>}
   */
  async function kopog(celok, { idokorlat }) {
    const jok = (celok ?? [])
      .map((c) => ({ cim: String(c.cim), port: Number(c.port) }))
      .filter((c) => c.cim && Number.isInteger(c.port));
    // ⚠️ A kapu IPv4-es foglalat (a tábla és a tükör is IPv4) — az IPv6-os célt kimondjuk (D19).
    for (const c of jok.filter((c) => c.cim.includes(':'))) {
      jelez({ mi: 'CEL-KIHAGYVA', cim: c.cim, port: c.port, ok: 'IPv6-cím az IPv4-es kapun' });
    }
    const allapotok = jok
      .filter((c) => !c.cim.includes(':'))
      .map((c) => ({ ...c, kulcs: c.cim + ':' + c.port, tars: null, igeret: null,
        hallak: false, foglalt: false }));
    let kuldott = 0;

    // ⚠️ A sorrend számít: pontos egyezés → akihez MÁR hozzárendeltük (a HALLAK után a munka
    // indulása ugyanezt a társat keresi) → azonos cím, más port (portváltás).
    const talal = (t) => allapotok.find((a) => a.kulcs === t.kulcs)
      ?? allapotok.find((a) => a.tars === t)
      ?? allapotok.find((a) => !a.hallak && a.cim === t.cim);
    const kor = {
      hallak(t) { const a = talal(t); if (a) { a.hallak = true; a.tars = t; } },
      foglalt(t) { const a = talal(t); if (a) { a.foglalt = true; a.tars = t; } },
      munkaIndult(t, igeret) { const a = talal(t); if (a) { a.hallak = true; a.tars = t; a.igeret = igeret; } }
    };
    korok.add(kor);

    // Akivel már fut a munka, az a körnek eleve „átfúrt".
    for (const a of allapotok) {
      const t = tarsak.get(a.kulcs);
      if (t && t.munka) { a.hallak = true; a.tars = t; a.igeret = t.munka; }
    }

    const kopogas = () => {
      for (const a of allapotok) {
        if (a.hallak) continue;
        const t = bejegyzes(a.cim, a.port, true, true);
        if (t.munka) { a.hallak = true; a.tars = t; a.igeret = t.munka; continue; }
        kopogj(t);
        kuldott++;
      }
    };

    await new Promise((kesz) => {
      if (!allapotok.length || idokorlat <= 0) return kesz();
      kopogas();
      const ora = setInterval(() => {
        if (allapotok.every((a) => a.hallak)) { clearInterval(ora); clearTimeout(vege); kesz(); return; }
        kopogas();
      }, kopogasKoz);
      const vege = setTimeout(() => { clearInterval(ora); kesz(); }, idokorlat);
    });
    korok.delete(kor);

    // ⭐ ELŐBB A MUNKA, CSAK UTÁNA A BESZÁMOLÓ — ugyanaz az elv, mint a fúró lezárásánál.
    const eredmenyek = [];
    for (const a of allapotok) {
      if (!a.igeret) {
        eredmenyek.push({ cim: a.cim, port: a.port, ok: false,
          hiba: a.foglalt ? 'foglalt' : a.hallak ? 'felelt, de nem indult munka' : 'nem felelt' });
        continue;
      }
      const e = await a.igeret;
      eredmenyek.push({ cim: a.tars?.cim ?? a.cim, port: a.tars?.port ?? a.port, ...e });
    }
    return {
      celok: allapotok.length,
      atfurt: allapotok.filter((a) => a.igeret).length,
      sikeres: eredmenyek.filter((e) => e.ok).length,
      foglalt: allapotok.filter((a) => a.foglalt && !a.igeret).length,
      kuldott,
      eredmenyek
    };
  }

  /** A saját külső címünk — EZEN a foglalaton mérve, tehát ez a mondható szám. */
  async function sajatCim(tukor = {}) {
    return kulsoCimFoglalaton(halo, tukor.tukorSzerver, tukor.tukorPort);
  }

  function zar() {
    lezarva = true;
    clearInterval(takarito);
    try { halo.close(); } catch { /* már zárva */ }
  }

  console.log('udpKapuNyitasa - VÉGE', { port: valodiPort, azonosito });
  return {
    port: valodiPort, azonosito, kopog, sajatCim, zar,
    tarsakSzama: () => tarsak.size,
    /** ⚠️ Csak mérésre és próbára: fut-e most munka ezzel a társsal? */
    munkaFut: (cim, cport) => Boolean(tarsak.get(cim + ':' + cport)?.munka)
  };
}
