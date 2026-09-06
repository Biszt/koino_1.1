// koino/js/csere/helyiFelfedezes.js

// Felelősség: AZONOS HÁLÓZATON LÉVŐ KÉSZÜLÉKEK MEGTALÁLJÁK EGYMÁST — cím beírása nélkül.
//
// ⭐ MIÉRT KELL (Szakasz 2 / F. lépés)? Mert ma a legelső kapcsolathoz valakinek KÉZZEL kell
// beírnia egy címet (`tars <hoszt> <port>`). Egy háztartáson belül ez fölösleges: a két
// készülék ugyanazon a wifin van, csak nem tudnak egymásról. Egy kiáltás elég.
//
// ⚠️ EZ KÉNYELEM, NEM ELŐFELTÉTEL (2. és 4. szabály). Ha a hálózat elnyeli a kiáltást
// (sok wifi tiltja a kliensek közti forgalmat), a koino PONTOSAN ugyanúgy működik, mint
// eddig — a `tars` parancs kézi útja megmarad. A felfedezés csak lerövidíti az ismerkedést.
//
// ⚠️ ÉS SEMMILYEN BIZALOM NEM JÁR VELE (3. szabály). Amit itt kapunk, az CÍM, nem igazság:
// pontosan annyit ér, mint egy szóban elmondott cím. Eseményt továbbra is csak az
// `esemenyMentese` kapu enged be, és a felfedezett cím SOSEM lesz esemény — múlandó
// körülmény, ahogy a terjedő címjegyzék címei sem azok (D36–D38).
//
// ===== A MENET =====
//
//   1. Kikiáltunk a helyi hálózatra:  „KOPOGOK — a koino X vagyok, a 7373-on hallgatok"
//   2. Aki hallja és UGYANANNAK a koinónak a tagja, VISSZASZÓL neki közvetlenül:
//      „ITT-VAGYOK — én is, a 7373-on"
//   3. Mindkettő feljegyzi a másikat. Utána a rendes `csere` viszi tovább.
//
// ⭐ MIÉRT KELL A VISSZASZÓLÁS? Mert a kiáltást nem biztos, hogy MINDKÉT irányban átengedi
// a hálózat. Aki hallotta a másikat, az már tudja a pontos címét — a válasz tehát célzott
// (unicast), és így akkor is összejön az ismerkedés, ha a szórás csak egyfelé megy.
//
// ===== AMIT EZ ELÁRUL MAGUNKRÓL — őszintén =====
//
// ⚠️ Aki ugyanazon a wifin van, LÁTJA, hogy koino fut itt, és MELYIK koinóé. Ezt nem lehet
// elrejteni: a felfedezés lényege, hogy idegenek is meghallják, különben nem találnánk meg
// egymást. A helyi hálózat viszont az a hely, ahol amúgy is látszunk (a többi készülék
// forgalmából). Ezért:
//   · a felfedezés KÜLÖN parancs, nem fut magától;
//   · nem mond semmit rólunk azon túl, hogy melyik koinóé vagyunk és hol hallgatunk;
//   · aki ezt sem akarja, annak ott a kézi `tars` út (4. szabály).
//
// Használják: koino.js (`felfedez` parancs) és a csereProba.js.

import { createSocket } from 'node:dgram';
import { randomBytes } from 'node:crypto';

// ===================================
// AMIN KIÁLTUNK
// ===================================

// A felfedezés saját portja — NEM a cseréé. Így a kiáltás nem zavarja a `figyel` kapuját,
// és egy készülék akkor is felfedezhető, ha épp nem tart nyitva cserélő kaput.
export const FELFEDEZO_PORT = 7374;

// ⚠️ ENNYINKÉNT ISMÉTELJÜK A KIÁLTÁST — és ez nem finomhangolás, hanem MÉRÉSBŐL jött.
// Az első változat egyszer kiáltott, induláskor. Két készülékkel kipróbálva az egyik
// meghallotta a másikat, VISSZAFELÉ VISZONT NEM — mert a másik egy másodperccel később
// indult, és addigra az egyetlen kiáltás már elhangzott. Két ember sosem fog ugyanabban
// a másodpercben elindítani egy parancsot, tehát az egyszeri kiáltás a hétköznapi esetben
// bukik. Egy kiáltás ~70 bájt: fél másodpercenként ismételni ingyen van.
export const ISMETLES_KOZ = 500;

// ⚠️ KÉT CÉLT HASZNÁLUNK, NEM EGYET (2. szabály). Nem azért, mert szép, hanem mert a
// hálózatok különbözőek: van, ahol a multicast megy át és a broadcast nem, és van, ahol
// fordítva. Egyik sem „szolgáltatás" — nincs gazdájuk, nem lehet őket elvenni.
//
//   · 239.255.42.73 — helyileg kiosztható multicast-csoport (a 239.0.0.0/8 erre való)
//   · 255.255.255.255 — a hálózati szórás, amit a legtöbb otthoni wifi ismer
export const ALAP_CELOK = ['239.255.42.73', '255.255.255.255'];

// ⚠️ UGYANANNAK A KIÁLTÓNAK LEGFELJEBB ENNYINKÉNT FELELÜNK — és ez is MÉRÉSBŐL jött.
// A telefonon egyetlen laptop **18 sort** írt a képernyőre: a kereső fél másodpercenként
// ismétel, a válaszoló minden egyes kopogásra felelt, a válasz pedig több úton is
// megérkezett (célzott + csoport). Szorzat, nem összeg.
//
// ⭐ A FÉKEZÉS NEM RONTJA EL A MŰKÖDÉST: egy 2 másodperces keresés így is 2-3 választ kap,
// tehát az elveszett csomag ellen megmarad a tartalék — csak a fölösleg tűnik el.
// ⚠️ Nem képernyő-kozmetika: minden fölös csomag egy mobilos e-ember számláján is
// megjelenik (D35). Ami mérhető, azt olcsóvá is kell tenni.
export const VALASZ_KOZ = 1000;

// ===================================
// A TISZTA RÉSZ — hálózat nélkül is mérhető
// ===================================

/**
 * Az üzenet, amit kikiáltunk vagy visszaszólunk.
 *
 * ⚠️ Szándékosan APRÓ és unalmas: egy koino-azonosító, egy port, és egy véletlen jel.
 * Minden további mező olyasmi lenne, amit egy idegen a wifin ingyen megtudhat rólunk.
 *
 * @param {'KOPOGOK'|'ITT-VAGYOK'} mi
 * @param {string} koino - melyik koinóé vagyunk
 * @param {number} port - hol hallgatunk cserére
 * @param {string} jel - a FUTÁS véletlen jele (ettől ismerjük fel a saját visszhangunkat)
 */
export function felfedezoUzenet(mi, koino, port, jel) {
  return JSON.stringify({ mi, koino, port, jel });
}

/**
 * Feldolgoz egy beérkezett kiáltást — és megmondja, MIÉRT nem fogadtuk el, ha nem.
 *
 * ⭐ A „miért" nem díszítés: a felfedezés jellemző hibája az, hogy NEM TÖRTÉNIK SEMMI, és
 * abból nem derül ki, hogy senki nincs ott, vagy hogy a hálózat nyelte el, vagy hogy a
 * másik egy másik koinóé. A néma nem-esemény a legrosszabb hibafajta.
 *
 * @param {Buffer|string} nyers - a csomag gondolata
 * @param {Object} felado - { address, port } — akitől jött
 * @param {string} sajatKoino
 * @param {string} sajatJel - a saját futásunk jele
 * @returns {{rendben: boolean, ok?: string, mi?: string, tars?: {hoszt: string, port: number}, valaszCim?: {hoszt: string, port: number}}}
 */
export function kialtasFeldolgozasa(nyers, felado, sajatKoino, sajatJel) {
  let uzenet;
  try {
    uzenet = JSON.parse(String(nyers));
  } catch {
    return { rendben: false, ok: 'ertelmezhetetlen' };
  }

  if (uzenet.mi !== 'KOPOGOK' && uzenet.mi !== 'ITT-VAGYOK') {
    return { rendben: false, ok: 'ismeretlen-uzenet' };
  }

  // A saját visszhangunk: a szórást mi magunk is megkapjuk. Ez nem hiba, csak kihagyjuk.
  if (uzenet.jel === sajatJel) return { rendben: false, ok: 'sajat-visszhang' };

  // ⚠️ MÁS KOINO — teljesen rendes dolog egy közös wifin (egy lakásban két koino is futhat).
  // Nem hiba, nem gyanús: egyszerűen nincs miről beszélnünk.
  if (uzenet.koino !== sajatKoino) return { rendben: false, ok: 'mas-koino' };

  const port = Number(uzenet.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { rendben: false, ok: 'rossz-port' };
  }
  if (!felado?.address) return { rendben: false, ok: 'nincs-cim' };

  return {
    rendben: true,
    mi: uzenet.mi,
    // ⭐ A CÍM A FOGLALATBÓL JÖN, NEM AZ ÜZENETBŐL. Amit a másik magáról állít, azt
    // hazudhatja; amit a csomag hordoz, azt nem — onnan tényleg megérkezett valami.
    // A PORT viszont az üzenetből kell: a kiáltást a felfedező portról küldte, cserélni
    // pedig máshol hallgat.
    tars: { hoszt: felado.address, port },
    valaszCim: { hoszt: felado.address, port: felado.port }
  };
}

/**
 * Összefésüli a felfedezett társakat — ugyanaz a cím kétszer ne szerepeljen.
 *
 * (A kiáltásra és a válaszra is felfigyelünk, tehát ugyanaz a társ könnyen kétszer jön.)
 */
export function felfedezettekOsszefesulese(eddigiek, uj) {
  const kulcs = (t) => String(t.hoszt).toLowerCase() + '|' + t.port;
  const megvan = new Set(eddigiek.map(kulcs));
  const lista = [...eddigiek];
  for (const t of uj) {
    if (megvan.has(kulcs(t))) continue;
    megvan.add(kulcs(t));
    lista.push(t);
  }
  return lista;
}

// ===================================
// A HÁLÓZATI RÉSZ — vékony réteg a tiszta rész körül
// ===================================

/**
 * Kikiált a helyi hálózatra, és összegyűjti, ki válaszol.
 *
 * ⚠️ MINDIG VÉGET ÉR. Az `idokorlat` letelte után lezárul, akkor is, ha senki nem szólt —
 * „nem találtam senkit" ÉRVÉNYES eredmény, nem hiba. (A `pajzsfuro.js` ugyanígy csinálja.)
 *
 * @param {Object} beallitas
 * @param {string} beallitas.koino - melyik koinóé vagyunk
 * @param {number} beallitas.sajatPort - hol hallgatunk cserére (ezt hirdetjük)
 * @param {number} [beallitas.figyeloPort] - hol figyeljük a kiáltásokat
 * @param {string[]} [beallitas.celok] - hova kiáltunk (több cím, lásd ALAP_CELOK)
 * @param {number} [beallitas.celPort] - a másik felfedező portja
 * @param {number} [beallitas.idokorlat] - meddig hallgatózunk (ms)
 * @param {Function} [beallitas.esemenyre] - minden lépésnél meghívjuk (műszer, nem napló)
 * @returns {Promise<{tarsak: Array, kialtasok: number, valaszok: number, kapottUzenetek: number, eltelt: number}>}
 */
export async function helyiFelfedezes(beallitas) {
  const {
    koino,
    sajatPort,
    figyeloPort = FELFEDEZO_PORT,
    celok = ALAP_CELOK,
    celPort = FELFEDEZO_PORT,
    idokorlat = 2000,
    ismetlesKoz = ISMETLES_KOZ,
    esemenyre
  } = beallitas;

  console.log('helyiFelfedezes - KEZDÉS', { koino, sajatPort, figyeloPort, celPort });

  const jel = randomBytes(6).toString('hex');
  const kezdet = Date.now();
  let tarsak = [];
  let kialtasok = 0, valaszok = 0, kapottUzenetek = 0;

  const halo = createSocket({ type: 'udp4', reuseAddr: true });

  return new Promise((teljesites) => {
    let lezarva = false;
    let ismetlo = null;

    const befejez = () => {
      if (lezarva) return;
      lezarva = true;
      clearTimeout(hatarido);
      if (ismetlo) clearInterval(ismetlo);
      try { halo.close(); } catch { /* már zárva */ }
      const eredmeny = {
        tarsak, kialtasok, valaszok, kapottUzenetek, eltelt: Date.now() - kezdet
      };
      console.log('helyiFelfedezes - VÉGE', {
        talalt: tarsak.length, kialtasok, valaszok, kapottUzenetek, eltelt: eredmeny.eltelt
      });
      teljesites(eredmeny);
    };

    const hatarido = setTimeout(befejez, idokorlat);

    halo.on('error', (hiba) => {
      // ⚠️ NEM DOBUNK. Egy tiltott szórás vagy egy foglalt port nem hiba, hanem válasz:
      // „ezen a hálózaton nem megy" — és a koino ettől még működik (2. szabály).
      console.warn('helyiFelfedezes - a foglalat hibázott', { ok: hiba.message });
      esemenyre?.({ mi: 'HIBA', ok: hiba.message });
      befejez();
    });

    halo.on('message', (nyers, felado) => {
      const eredmeny = kialtasFeldolgozasa(nyers, felado, koino, jel);
      if (!eredmeny.rendben) {
        esemenyre?.({ mi: 'ELDOBVA', ok: eredmeny.ok, honnan: felado.address });
        return;
      }

      kapottUzenetek++;

      // ⭐ ÚJ-E? Enélkül a felület ugyanazt a készüléket hússzor írná ki: a kiáltást
      // ismételjük, a válaszoló felel, és a válasz több úton is megérkezik. Mérve
      // (2026-08-30, telefon): EGY készülék 18 sort írt a képernyőre.
      const elotte = tarsak.length;
      tarsak = felfedezettekOsszefesulese(tarsak, [eredmeny.tars]);
      esemenyre?.({
        mi: eredmeny.mi + '-ERKEZETT', honnan: felado.address, tars: eredmeny.tars,
        uj: tarsak.length > elotte
      });

      // ⭐ A KIÁLTÁSRA VISSZASZÓLUNK — CÉLZOTTAN. Így akkor is összejön az ismerkedés, ha a
      // szórás csak az egyik irányba megy át. A válaszra nem válaszolunk (nem gyűrűzik).
      if (eredmeny.mi === 'KOPOGOK') {
        const valasz = Buffer.from(felfedezoUzenet('ITT-VAGYOK', koino, sajatPort, jel));
        halo.send(valasz, eredmeny.valaszCim.port, eredmeny.valaszCim.hoszt, (hiba) => {
          if (hiba) console.warn('helyiFelfedezes - a válasz nem ment el', { ok: hiba.message });
          else valaszok++;
        });
      }
    });

    halo.bind(figyeloPort, () => {
      // A szórás külön engedély; a multicast-csoport pedig külön belépés. Mindkettő
      // elbukhat (jogosultság, hálózat) — egyik sem végzetes, ezért csak feljegyezzük.
      try { halo.setBroadcast(true); } catch (h) {
        console.warn('helyiFelfedezes - a szórás nem engedélyezhető', { ok: h.message });
      }
      for (const cel of celok) {
        if (!cel.startsWith('239.') && !cel.startsWith('224.')) continue;
        try { halo.addMembership(cel); } catch (h) {
          console.warn('helyiFelfedezes - a csoportba belépés nem ment', { cel, ok: h.message });
        }
      }

      const kialtas = Buffer.from(felfedezoUzenet('KOPOGOK', koino, sajatPort, jel));

      // ⭐ ISMÉTELVE KIÁLTUNK, NEM EGYSZER. Lásd az `ISMETLES_KOZ` indoklását: aki később
      // indul, az egyszeri kiáltást már nem hallja meg — és így a felfedezés attól függne,
      // hogy a két ember egyszerre nyom-e entert.
      const kiKialt = (elso) => {
        if (lezarva) return;
        for (const cel of celok) {
          halo.send(kialtas, celPort, cel, (hiba) => {
            if (hiba) {
              // ⚠️ Csak az ELSŐ kudarcot jelentjük, különben az ismétlés elárasztaná a
              // képernyőt ugyanazzal a hibával. A tény nem változik az ötödik ismétlésre.
              if (elso) {
                console.warn('helyiFelfedezes - a kiáltás nem ment el', { cel, ok: hiba.message });
                esemenyre?.({ mi: 'KIALTAS-BUKOTT', cel, ok: hiba.message });
              }
            } else {
              kialtasok++;
              if (elso) esemenyre?.({ mi: 'KIALTOTTAM', cel });
            }
          });
        }
      };

      kiKialt(true);
      ismetlo = setInterval(() => kiKialt(false), ismetlesKoz);
    });
  });
}

/**
 * A VÁLASZOLÓ: egy dolgozó készülék meghallja a kiáltásokat, és felel rájuk.
 *
 * ⭐ MIÉRT KELL KÜLÖN? Mert a `helyiFelfedezes` mindkét felet KIÁLTÓNAK feltételezi — vagyis
 * csak akkor működne, ha a két ember EGYSZERRE indítja a `felfedez` parancsot. Mérve
 * (2026-08-30): egy `figyel`-t futtató készülék a kiáltást meg sem hallotta, pedig épp őt
 * kellett volna megtalálni. Ez a néhány sor teszi a felfedezést használhatóvá:
 *
 *   · aki DOLGOZIK (`orjarat`, `figyel`), az **felel** — nem kiált, csak válaszol;
 *   · aki KERES (`felfedez`), az **kiált** — és megkapja a válaszokat.
 *
 * ⚠️ NEM KIÁLT MAGÁTÓL. Egy magától kiabáló készülék folyamatosan hirdetné magát a helyi
 * hálózaton; a válaszolás viszont csak akkor szólal meg, ha valaki már kiáltott. Ez a
 * kevesebb, amivel a funkció még működik.
 *
 * ⚠️ És ez sem előfeltétel: ha a foglalat nem nyílik meg (foglalt port, tiltott szórás),
 * feljegyezzük és MEGYÜNK TOVÁBB — az őrjárat ettől még dolgozik (2. szabály).
 *
 * @returns {Promise<{bezar: Function, port: number|null, mukodik: boolean}>}
 */
export async function felfedezoValaszolo(beallitas) {
  const {
    koino, sajatPort, figyeloPort = FELFEDEZO_PORT, celok = ALAP_CELOK,
    valaszKoz = VALASZ_KOZ, esemenyre
  } = beallitas;

  // ⚠️ KI MIKOR KAPOTT MÁR VÁLASZT — a fékezéshez. Kulcs: a kiáltó futás-jele.
  const utoljaraValaszoltam = new Map();

  console.log('felfedezoValaszolo - KEZDÉS', { koino, sajatPort, figyeloPort });

  const jel = randomBytes(6).toString('hex');
  const halo = createSocket({ type: 'udp4', reuseAddr: true });

  return new Promise((teljesites) => {
    let eldolt = false;
    const eldont = (mukodik) => {
      if (eldolt) return;
      eldolt = true;
      console.log('felfedezoValaszolo - VÉGE', { mukodik });
      teljesites({
        mukodik,
        port: mukodik ? figyeloPort : null,
        bezar: () => { try { halo.close(); } catch { /* már zárva */ } }
      });
    };

    halo.on('error', (hiba) => {
      console.warn('felfedezoValaszolo - nem tudok válaszolni', { ok: hiba.message });
      esemenyre?.({ mi: 'NEM-MEGY', ok: hiba.message });
      eldont(false);
    });

    halo.on('message', (nyers, felado) => {
      const e = kialtasFeldolgozasa(nyers, felado, koino, jel);
      // ⚠️ CSAK A KIÁLTÁSRA felelünk. A válaszra válaszolni gyűrűzést csinálna.
      if (!e.rendben || e.mi !== 'KOPOGOK') return;

      // ⭐ FÉKEZÉS: ugyanannak a kiáltónak nem felelünk minden kopogására. Lásd a
      // `VALASZ_KOZ` indoklását — mérve 18 válasz ment egyetlen keresőnek.
      const most = Date.now();
      const kie = String(JSON.parse(String(nyers)).jel);
      if (most - (utoljaraValaszoltam.get(kie) ?? 0) < valaszKoz) return;
      utoljaraValaszoltam.set(kie, most);

      const valasz = Buffer.from(felfedezoUzenet('ITT-VAGYOK', koino, sajatPort, jel));

      // ⭐ KÉTFELÉ VÁLASZOLUNK, ÉS EZ MÉRÉSBŐL JÖTT (2026-08-30). A célzott válasz önmagában
      // kevés: a felfedező port RÖGZÍTETT, tehát egy gépen több koino-példány ugyanazon a
      // porton ül, és a célzott csomag közülük a „rossz" foglalatra érkezhet. Mérve: a
      // postaláda felelt, a kereső mégsem hallotta meg. A csoportnak küldött válasz ezt
      // megkerüli — és a válaszra senki nem válaszol, tehát nem gyűrűzik.
      //
      // ⚠️ Ez nem pazarlás: egy válasz ~70 bájt, és csak akkor hangzik el, ha valaki
      // TÉNYLEG kiáltott. Magától a válaszoló soha nem szólal meg.
      const cimzettek = [e.valaszCim, ...celok.map((c) => ({ hoszt: c, port: figyeloPort }))];
      for (const cimzett of cimzettek) {
        halo.send(valasz, cimzett.port, cimzett.hoszt, (hiba) => {
          if (hiba) {
            console.warn('felfedezoValaszolo - a válasz nem ment el',
              { hova: cimzett.hoszt, ok: hiba.message });
          } else if (cimzett === e.valaszCim) {
            esemenyre?.({ mi: 'VALASZOLTAM', kinek: e.tars });
          }
        });
      }
    });

    halo.bind(figyeloPort, () => {
      // A szórásos válaszhoz ez is kell — és ez sem végzetes, ha nem megy.
      try { halo.setBroadcast(true); } catch (h) {
        console.warn('felfedezoValaszolo - a szórás nem engedélyezhető', { ok: h.message });
      }
      for (const cel of celok) {
        if (!cel.startsWith('239.') && !cel.startsWith('224.')) continue;
        try { halo.addMembership(cel); } catch (h) {
          console.warn('felfedezoValaszolo - a csoportba belépés nem ment', { cel, ok: h.message });
        }
      }
      // ⭐ A folyamatot NE tartsa életben ez a foglalat: a felfedezés kényelem, nem munka.
      halo.unref?.();
      eldont(true);
    });
  });
}
