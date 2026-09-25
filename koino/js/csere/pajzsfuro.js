// koino/js/csere/pajzsfuro.js

// Felelősség: PAJZSFÚRÁS — két készülék úgy ér össze, hogy EGYIK ROUTERÉN SEM kell
// beállítani semmit.
//
// ⭐ A NÉV CSABÁTÓL VAN (2026-08-29): a szakirodalom „lyukfúrásnak" hívja, de ez félrevezet,
// mert kívülről semmit nem törünk át. **BELÜLRŐL fúrunk**, mint a pajzsfúró gép: mindkét
// oldal a saját routerén nyit rést, kifelé indulva — és a két rés találkozik a közepén.
// Ezért a koinóban ez PAJZSFÚRÁS.
//
// ⭐ MIÉRT KELL? (mérve 2026-08-29, Csaba laptopja + telefonja két hálózaton)
// Mindkét router zárja a BEFELÉ jövő kapcsolatot — a laptopé a port-továbbítási szabály
// ellenére is, a szomszédé eleve. Kifelé viszont mindkettő enged (a laptop 8 ms alatt eléri
// a nyilvános IPv6-internetet). Vagyis nem az elérhetőség hiányzik, hanem a KEZDEMÉNYEZÉS
// joga — és épp ezt lehet megkerülni.
//
// ===== HOGYAN NYÍLIK A LYUK =====
//
// Amikor a géped kiküld egy csomagot B-nek, a routered feljegyzi: „ez a gép beszélt
// B-vel", és ettől kezdve BEENGEDI B válaszát — egy ideig. De CÉLZOTTAN: csak B-től, és
// csak arra a portra, amiről kiment.
//
// Ezért nem elég, ha az egyik fél figyel: a figyelés NEM küld semmit, tehát a routernek
// nincs mire emlékeznie. Mindkét félnek KI KELL SZÓLNIA a másiknak — akkor mindkét
// routeren nyílik egy rés, és a két rés egymásra illeszkedik.
//
// ⚠️ EZÉRT KELL RÖGZÍTETT HELYI PORT. Ha a kimenő csomag véletlen portról indul, a rés a
// `mi:52341 ↔ ő:7373` párra nyílik — a másik viszont a `mi:7373`-ra kopogna, ami MÁS pár,
// tehát nem fér be. Mindkét félnek UGYANARRÓL a portról UGYANARRA a portra kell szólnia.
//
// ⭐ MIÉRT UDP, ÉS NEM TCP? Mert egyetlen UDP-foglalat egyszerre tud küldeni és fogadni
// ugyanazon a porton. A TCP-nél a „figyelés" és a „hívás" két külön dolog, és ugyanazt a
// portot nem lehet egyszerre mindkettőre használni — épp ezért használ minden pajzsfúró
// rendszer UDP-t. A koino cseréje ettől még TCP marad: ez a fájl csak a TALÁLKOZÁST méri.
//
// ⭐ ÉS AMI IPv6-ON EGYSZERŰBB: a NAT-os IPv4-nél a router a portot is ÁTÍRJA, ezért kell
// STUN meg jelzőpont, hogy megtudd, milyen porton látszol kívülről. IPv6-on nincs átírás:
// a címed és a portod az, ami. Ehhez a találkozáshoz tehát SEMMILYEN szolgáltatás nem kell
// — csak a másik címe, és azt már tudjuk (2. szabály).
//
// ⚠️ EZ A FÁJL SEMMIT NEM TUD A KOINÓRÓL. Nem ismer eseményt, tárat, szabályt — csak
// csomagokat küld és fogad. A `vonal.js` MELLÉ került, nem bele (1. szabály).
//
// Használják: koino.js (a `pajzsfuro` és a `kulsoport` parancs) és a csereProba.js.
// ⚠️ EZ A SOR IS HAZUDOTT 2026-09-14-ig: `talalkozo` parancsot említett, ilyen viszont
// sosem volt. *Ugyanaz a csapda, amit az `Allaspont`-nál kimondtunk: ahol egy felirat mást
// mond, mint ami a kód, ott előbb-utóbb valaki a feliratot hiszi el.*

import { createSocket } from 'node:dgram';
import { connect } from 'node:net';

// ===================================
// A KÜLSŐ PORT MEGMÉRÉSE (STUN)
// ===================================
//
// ⭐ MIÉRT KELL? IPv4-en a NAT ÁTÍRJA a kimenő port számát. Mérve a fejlesztő vonalán:
// a helyi 7373 kívülről a 51967-esen látszik. Ha a másik a 7373-ra kopog, ott NINCS
// semmi — ezért nem ért célba egyetlen csomag sem.
//
// ⚠️ EZ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL (2. szabály, D38). A szerver PARAMÉTER, tehát
// cserélhető; ha nem válaszol, a koino ugyanúgy működik, csak a fúrás nem célozható.
// És semmilyen bizalom nem jár vele (3. szabály): egy portszámot mond, nem igazságot.
//
// ⭐ HOSSZÚ TÁVON EZT A SAJÁT TÜKRÜNK VÁLTJA KI: aki fogad, az amúgy is látja, honnan
// jövünk (lásd `vonal.js`, `latlak`). Ez itt a BEMUTATKOZÁSHOZ kell, amíg nincs kihez
// szólni — pontosan az az eset, amit a D37 „első bemutatkozás"-nak nevez.
//
// ⛔⛔ A GOOGLE/CLOUDFLARE TÜKÖR NEM A VÉGLEGES TÜKÖR (Csaba, 2026-09-17). Addig marad,
// amíg kevés készülék van a hálózatban. *Egymilliárd készülék nem függhet egy cég STUN-
// szerverétől (2. és 9. szabály).* A végleges út: a külső címet a TÁRSAK mondják meg a
// cserén (`latlak` → `kivulrolIgyLatszom`) — ez annál jobban működik, minél több készülék
// van, és pontosabb is, mert arról a résről szól, amin a társsal beszélünk.

const SUTI = 0x2112A442;

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
 * STUN-válasz-e ez a csomag, vagy koino-üzenet?
 *
 * ⚠️ AZÉRT KELL, mert a fúró mostantól a SAJÁT foglalatán kérdez — és a STUN válasza
 * ugyanoda érkezik, ahol a kopogásokat várjuk. E nélkül a mérés a STUN-választ
 * „beérkezett kopogásnak" számolná, és a számok hazudnának.
 */
export function stunValaszE(adat) {
  return adat.length >= 20 && adat.readUInt32BE(4) === SUTI;
}

/**
 * Kiolvassa a leképezett címet egy STUN-válaszból (null, ha nincs benne).
 *
 * ⛔⛔ A CSALÁD-BÁJTOT MEG KELL NÉZNI — és ezt a 18. mérés tanította meg (2026-09-13).
 *
 * Ez a függvény korábban **vakon négy bájtot olvasott IPv4-ként**. Amikor a tükör
 * **IPv6-on** felelt, ebből `32.1.76.77` lett — ami valójában a saját `2001:4c4d…` címem
 * **első négy bájtja**. *A mérés nem hazudott volna nagyobbat, ha kitalálja a számot.*
 *
 * ⚠️ A `kulsoCim` ma `udp4`-en kérdez, tehát ott a hiba nem jött elő — de a TCP-tükör már
 * IPv6-on is felelhet, és egy kitalált cím rosszabb, mint a hiány (D19).
 *
 * ⚠️ **Kifelé adva a próba kedvéért** — ez a hiba érveléssel nem volt megfogható, csak
 * bájtokkal; a próba tehát kézzel összerakott STUN-válaszokat olvastat vele.
 *
 * @returns {{cim: string, port: number, csalad: 4|6}|null}
 */
export function stunbolCim(v) {
  let p = 20;
  while (p + 4 <= v.length) {
    const tipus = v.readUInt16BE(p), hossz = v.readUInt16BE(p + 2);
    if (tipus === 0x0020) {                  // XOR-MAPPED-ADDRESS
      const csalad = v[p + 5];               // 0x01 = IPv4, 0x02 = IPv6
      const port = v.readUInt16BE(p + 6) ^ 0x2112;

      if (csalad === 0x02) {
        // ⚠️ Az IPv6 első 4 bájtja a sütivel, a maradék 12 a TRANZAKCIÓ-AZONOSÍTÓVAL
        // van XOR-olva (RFC 5389) — az a válasz 8..19. bájtján áll.
        const b = [];
        for (let i = 0; i < 16; i++) {
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

/**
 * Megkérdezi a külső címünket egy MÁR MEGNYITOTT foglalaton.
 *
 * ⭐ MIÉRT KELL EZ KÜLÖN (2026-08-30, mérésből)? Mert a NAT-leképezés a FOGLALATHOZ
 * tartozik, nem a portszámhoz. Eddig a `kulsoport` parancs saját foglalatot nyitott, mért,
 * és bezárta — a fúró viszont ÚJ foglalatot nyit, ami **más külső portot kaphat**. A
 * mobilhálózatos mérésnél ez csak a NAT jóindulatán múlt, hogy egyezett (26359).
 * Ráadásul fúrás közben külön mérni sem lehet: a STUN-válasz a FÚRÓ foglalatára megy.
 *
 * ⚠️ Segédeszköz marad (2. szabály): ha nem válaszol, a fúrás ugyanúgy megy tovább,
 * csak nem tudjuk kiírni, mit mondjunk be a másiknak.
 */
export function kulsoCimFoglalaton(halo, szerver = 'stun.l.google.com',
  szerverPort = 19302, idokorlat = 5000) {
  const keres = stunKeres();

  return new Promise((teljesites, elutasitas) => {
    let kesz = false;

    const figyelo = (v) => {
      if (kesz || !stunValaszE(v)) return;    // a koino-kopogás nem nekünk szól
      const cim = stunbolCim(v);
      if (!cim) return;
      kesz = true;
      clearTimeout(hatarido);
      halo.removeListener('message', figyelo);
      teljesites(cim);
    };

    const hatarido = setTimeout(() => {
      if (kesz) return;
      kesz = true;
      halo.removeListener('message', figyelo);
      elutasitas(new Error('a STUN-kiszolgáló nem válaszolt '
        + (idokorlat / 1000) + ' mp alatt'));
    }, idokorlat);

    halo.on('message', figyelo);
    halo.send(keres, szerverPort, szerver, (hiba) => {
      if (!hiba || kesz) return;
      kesz = true;
      clearTimeout(hatarido);
      halo.removeListener('message', figyelo);
      elutasitas(hiba);
    });
  });
}

/**
 * Megkérdezi egy STUN-kiszolgálótól, milyen CÍMEN ÉS PORTON látszunk kívülről.
 *
 * ⚠️ EZ SAJÁT FOGLALATOT NYIT, MÉR, ÉS BEZÁRJA. A mérés tehát ANNAK a foglalatnak szól,
 * nem annak, amivel utána fúrni fogsz — a NAT-leképezés ugyanis a foglalathoz tartozik.
 * Ha a fúró portját akarod tudni, azt a `pajzsfuras` mostantól magától kiírja.
 *
 * @param {number} helyiPort - erről a portról kérdezünk (a mérés csak erre érvényes!)
 * @param {string} [szerver]
 * @param {number} [szerverPort]
 * @returns {Promise<{cim: string, port: number}>}
 */
export async function kulsoCim(helyiPort, szerver = 'stun.l.google.com', szerverPort = 19302) {
  console.log('kulsoCim - KEZDÉS', { helyiPort, szerver });

  const halo = createSocket({ type: 'udp4', reuseAddr: true });

  return new Promise((teljesites, elutasitas) => {
    halo.on('error', (h) => { try { halo.close(); } catch { /* már zárva */ } elutasitas(h); });
    halo.bind(helyiPort, () => {
      kulsoCimFoglalaton(halo, szerver, szerverPort)
        .then((cim) => {
          halo.close();
          console.log('kulsoCim - VÉGE', cim);
          teljesites(cim);
        })
        .catch((hiba) => { try { halo.close(); } catch { /* már zárva */ } elutasitas(hiba); });
    });
  });
}

// ===================================
// ⭐⭐ A KÜLSŐ CÍM **TCP-N** — a 18. mérés következménye (2026-09-13)
// ===================================
//
// ⛔⛔ MIÉRT KELLETT EZ, ÉS MIÉRT NEM VOLT MEG EDDIG? A 17. mérés (terepmérés, két valódi
// hálózat) a TCP-fúrással kezdődött, és **négy órán át nem ment**. Az ok: a fejlesztő
// routere az IPv4-portot **átírja** (7373 → 63539), a másik fél viszont a `7373`-ra
// kopogott, ahol nincs rés. ⭐ A UDP-fúró ezt **megméri a saját fúró-foglalatáról** — a
// TCP-fúrónak nem volt ilyen mérése, mert a tükör `udp4`-re van drótozva.
//
// ⭐⭐ ÉS A 18. MÉRÉS KIMONDTA, HOGY ENNEK VAN ÉRTELME: a TCP-leképezés **célfüggetlen**
// (három különböző cég, három különböző IP → ugyanaz a külső port). Vagyis amit a tükör
// mond, az **egy harmadik félre is érvényes** — tehát bemondható. *Ha cél-függő lett volna,
// ez a függvény hazug számot adna, és meg sem lett volna szabad írni.*
//
// ⚠️ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL (2. szabály): a tükrök **paraméterek**, több van belőlük,
// és ha egyik sem felel, a fúrás **ugyanúgy elindul** — csak nem tudjuk bemondani a portot.
// Bizalom nem jár velük (3. szabály): egy portszámot mondanak, nem igazságot.

/**
 * ⚠️ TCP-N KEVÉS NYILVÁNOS TÜKÖR FELEL. A 18. mérés tizenhétből **hármat** talált —
 * ezek azok. Sorrendben próbáljuk, az első beszédes nyer.
 */
export const TCP_TUKROK = [
  { nev: 'nextcloud', hoszt: 'stun.nextcloud.com', port: 443 },
  { nev: 'antisip',   hoszt: 'stun.antisip.com',   port: 3478 },
  { nev: 'dus',       hoszt: 'stun.dus.net',       port: 3478 }
];

/**
 * Megkérdezi EGY tükörtől TCP-n, milyen külső címen és porton látszunk.
 *
 * ⛔⛔ A KAPCSOLATOT `resetAndDestroy()`-JAL ZÁRJUK, NEM `end()`-DEL — és ez nem stílus.
 * A 18. mérésnél egy szabályosan lezárt (vagy válasz nélkül elakadt) kapcsolat
 * **fogva tartotta a rögzített helyi portot**, és a következő kísérlet `EADDRINUSE`-szal
 * bukott. *Itt ez végzetes lenne: a fúrásnak KELL a 7373-as.*
 */
function tukorKerdesTcp(helyiPort, tukor, idokorlat) {
  return new Promise((teljesites) => {
    let bejovo = Buffer.alloc(0);
    let kesz = false;
    let kapcsolat;

    const vege = (eredmeny) => {
      if (kesz) return;
      kesz = true;
      clearTimeout(ora);
      try { kapcsolat.resetAndDestroy(); } catch { /* már zárva */ }
      teljesites(eredmeny);
    };

    try {
      // ⛔ `family: 4` — a NAT-ot akarjuk megkérdezni. IPv6-on nincs port-átírás, tehát
      // egy IPv6-válasz szép lenne és semmit nem érne (18. mérés).
      kapcsolat = connect({ host: tukor.hoszt, port: tukor.port, localPort: helyiPort,
        family: 4 });
    } catch (hiba) {
      return teljesites(null);
    }

    const ora = setTimeout(() => vege(null), idokorlat);

    kapcsolat.on('connect', () => kapcsolat.write(stunKeres()));
    kapcsolat.on('data', (darab) => {
      bejovo = Buffer.concat([bejovo, darab]);
      if (bejovo.length < 20 || bejovo.readUInt32BE(4) !== SUTI) return;
      const hossz = bejovo.readUInt16BE(2);
      if (bejovo.length < 20 + hossz) return;          // még nem teljes
      const cim = stunbolCim(bejovo.subarray(0, 20 + hossz));
      vege(cim && cim.csalad === 4 ? { ...cim, tukor: tukor.nev } : null);
    });
    kapcsolat.on('error', () => vege(null));
    kapcsolat.on('close', () => vege(null));
  });
}

/**
 * „Milyen külső TCP-porton látszom?" — a MEGADOTT helyi portról.
 *
 * ⚠️ A tükröket SORBAN kérdezzük, nem párhuzamosan: mindegyik ugyanazt a rögzített helyi
 * portot használná, és ütköznének (`EADDRINUSE`).
 *
 * @param {number} helyiPort - erről a portról kérdezünk (a válasz csak erre érvényes)
 * @param {Array} [tukrok]
 * @param {number} [idokorlat]
 * @returns {Promise<{cim: string, port: number, csalad: 4, tukor: string}|null>}
 */
export async function kulsoCimTcp(helyiPort, tukrok = TCP_TUKROK, idokorlat = 5000) {
  console.log('kulsoCimTcp - KEZDÉS', { helyiPort });

  for (const tukor of tukrok) {
    const valasz = await tukorKerdesTcp(helyiPort, tukor, idokorlat);
    if (valasz) {
      console.log('kulsoCimTcp - VÉGE', valasz);
      return valasz;
    }
    // ⚠️ Hagyjuk elengedni a portot, mielőtt a következő tükröt kérdezzük.
    await new Promise((kesz) => setTimeout(kesz, 300));
  }

  console.log('kulsoCimTcp - VÉGE (egyik tükör sem felelt)');
  return null;
}

const KOPOGAS_KOZ = 1000;      // ennyi ezredmásodpercenként kopogunk
const IDOKORLAT = 60000;       // eddig próbálkozunk (0 = vég nélkül, amíg le nem állítják)

// ===================================
// TCP-PAJZSFÚRÁS — ugyanaz az elv, de a csere protokolljával
// ===================================
//
// ⭐ MIÉRT KELL EZ AZ UDP MELLÉ? Mert az UDP-fúró csak MEGMÉRI, hogy a rés megnyílik-e —
// a koino cseréje viszont TCP-n megy, és egy UDP-lyuk NEM nyit utat a TCP-nek (a router
// külön tartja számon a kettőt). Ha viszont magával a TCP-vel fúrunk, akkor a megnyílt
// kapcsolaton AZONNAL mehet a csere.
//
// ⭐ HOGYAN MŰKÖDIK (TCP „egyidejű nyitás"): mindkét fél a SAJÁT 7373-asáról hív a másik
// 7373-asára. Így a két kapcsolat-kísérlet ugyanarra a négyesre (cím+port ↔ cím+port)
// vonatkozik — a routerek ugyanazt a rést nyitják, és amikor a másik SYN-je megérkezik,
// az operációs rendszer FELISMERI, hogy ez a mi kimenő kísérletünk párja, és összeköti
// őket. Figyelő foglalat nem is kell hozzá.
//
// ⚠️ EZÉRT NEM MŰKÖDÖTT AZ ŐRJÁRAT ERRE: a `csere` véletlen helyi portról indul, tehát a
// négyes nem egyezik, és a két rés elbeszél egymás mellett.
//
// ⚠️ MINDEN PRÓBÁLKOZÁST KIÍR (Csaba kérése). Nem csak a sikert: a néma nem-esemény
// pontosan az, amiben ma este elvéreztünk.

/**
 * TCP-vel fúr: ismételten hív a rögzített helyi portról a másik ugyanolyan portjára.
 *
 * @param {number} sajatPort - a RÖGZÍTETT helyi port
 * @param {string} tarsCim
 * @param {number} tarsPort
 * @param {{koz?: number, probaIdo?: number, utana?: Function}} [beallitas]
 * @returns {Promise<{sikerult: boolean, kapcsolat: import('node:net').Socket|null, probak: number}>}
 */
export async function tcpPajzsfuras(sajatPort, tarsCim, tarsPort, beallitas = {}) {
  console.log('tcpPajzsfuras - KEZDÉS', { sajatPort, tarsCim, tarsPort });

  const koz = beallitas.koz ?? 15000;          // ennyi időnként új próbálkozás
  const probaIdo = beallitas.probaIdo ?? Math.max(2000, koz - 2000);
  const maxProba = beallitas.maxProba ?? Infinity;   // a próbák miatt: ne fusson örökké
  const jelez = beallitas.utana ?? (() => {});

  // ===== ⭐⭐ ELŐSZÖR MEGKÉRDEZZÜK A SAJÁT KÜLSŐ PORTUNKAT (18. mérés) =====
  //
  // ⛔⛔ ÉS EZ A KOPOGÁS ELŐTT VAN, NEM KÖZBEN — mérésből: a rögzített helyi portot
  // egyszerre csak egy kapcsolat foghatja. Ha fúrás közben kérdeznénk, a tükör-kapcsolat
  // `EADDRINUSE`-szal bukna, vagy ami rosszabb, elvenné a portot a fúrás elől.
  //
  // ⚠️ IPv6-nál KIHAGYJUK: ott nincs NAT, tehát a port nem íródik át — a kérdésnek nincs
  // értelme, és csak időt venne el. *(A `tarsCim`-ben lévő kettőspont árulja el.)*
  //
  // ⚠️ HA NEM FELEL SENKI, A FÚRÁS UGYANÚGY ELINDUL (2. szabály) — csak nem tudjuk
  // bemondani a portot, és ezt ki is mondjuk (D19: a hiány nem hallgatás).
  const ipv6Cel = typeof tarsCim === 'string' && tarsCim.includes(':');
  if (!ipv6Cel && beallitas.kulsoCimKell !== false) {
    const enyem = await kulsoCimTcp(sajatPort, beallitas.tukrok ?? TCP_TUKROK);
    if (enyem) {
      jelez({ mi: 'SAJAT-KULSO-CIM', cim: enyem.cim, port: enyem.port, tukor: enyem.tukor,
        helyiPort: sajatPort });
    } else {
      jelez({ mi: 'SAJAT-KULSO-CIM-NINCS' });
    }
    // ⚠️ Hagyjuk teljesen elengedni a portot, mielőtt fúrni kezdünk.
    await new Promise((kesz) => setTimeout(kesz, 300));
  }

  let probak = 0;

  while (probak < maxProba) {
    probak++;
    const kezdet = Date.now();
    jelez({ mi: 'PROBALOK', hanyadik: probak });

    const eredmeny = await new Promise((teljesites) => {
      // family: 0 → a rendszer válasszon IPv4/IPv6 között (a Szakasz 2 miatt fontos).
      // localPort: EZ A LÉNYEG — enélkül véletlen portról indulnánk, és nem illeszkedne
      // a másik oldal résével.
      let kapcsolat;
      try {
        kapcsolat = connect({ host: tarsCim, port: tarsPort, localPort: sajatPort, family: 0 });
      } catch (hiba) {
        teljesites({ kesz: false, ok: hiba.message });
        return;
      }

      const vege = (siker, ok) => {
        kapcsolat.removeAllListeners('connect');
        kapcsolat.removeAllListeners('error');
        kapcsolat.setTimeout(0);
        if (!siker) kapcsolat.destroy();
        teljesites(siker ? { kesz: true, kapcsolat } : { kesz: false, ok });
      };

      kapcsolat.setTimeout(probaIdo, () => vege(false, 'nem válaszolt ' + probaIdo + ' ms alatt'));
      kapcsolat.once('connect', () => vege(true));
      kapcsolat.once('error', (hiba) => vege(false, hiba.code ?? hiba.message));
    });

    const eltelt = Date.now() - kezdet;

    if (eredmeny.kesz) {
      jelez({ mi: 'ATFURVA', hanyadik: probak, eltelt });
      console.log('tcpPajzsfuras - VÉGE (átfúrva)', { probak });
      return { sikerult: true, kapcsolat: eredmeny.kapcsolat, probak };
    }

    // ⭐ AZ ELTELT IDŐ ÖNMAGÁBAN NYOM. Az AZONNALI bukás azt jelenti, hogy valaki
    // VÁLASZOLT (elutasítással) — tehát a csomagunk ODAÉRT. A hosszú csend viszont azt,
    // hogy némán eldobták. A kettő teljesen más következő lépést kíván.
    jelez({ mi: 'PROBA-BUKOTT', hanyadik: probak, ok: eredmeny.ok, eltelt });

    // A maradék időt kivárjuk, hogy tényleg `koz` legyen két próbálkozás KEZDETE között.
    const maradek = koz - (Date.now() - kezdet);
    if (maradek > 0) await new Promise((t) => setTimeout(t, maradek));
  }

  console.log('tcpPajzsfuras - VÉGE (feladtuk)', { probak });
  return { sikerult: false, kapcsolat: null, probak };
}

// ===================================
// A KÉT ÜZENET
// ===================================
//
// Szándékosan pici és buta: ez NEM protokoll, hanem kopogás. Az igazi csere ezután jön,
// a saját, aláírt eseményeivel — ide semmilyen bizalom nem épül (3. szabály).
//
//   KOPOG  — „itt vagyok, hallasz?"
//   HALLAK — „igen, és megjött a te csomagod is"
//
// A kettő megkülönböztetése azért fontos, mert MÁST bizonyít:
//   · KOPOG érkezett  → az Ő csomagja átjutott HOZZÁNK (az egyik irány megvan)
//   · HALLAK érkezett → a MI csomagunk is átjutott HOZZÁ (mindkét irány megvan)

/**
 * Kopogtat a másik félnek, amíg meg nem hallják egymást.
 *
 * Mindkét készüléken UGYANEZT kell futtatni, egymás címére. Nem baj, ha nem pontosan
 * egyszerre indulnak: a kopogás ismétlődik, tehát előbb-utóbb egybeesnek. ⚠️ Épp ezért
 * NEM kell hozzá közös óra — csak ütem. (Ez a különbség az „átfedés" és a „randevú"
 * között; a pajzsfúrásnak az előbbi is elég, ha elég sűrűn próbálkozunk.)
 *
 * @param {number} sajatPort - a RÖGZÍTETT helyi port (ugyanaz, amire a másik kopog)
 * @param {string} tarsCim - a másik globális IPv6-címe
 * @param {number} tarsPort
 * @param {Object} [beallitas]
 * @param {number} [beallitas.idokorlat] - eddig próbálkozunk (ms)
 * @param {number} [beallitas.koz] - kopogások között (ms)
 * @param {Function} [beallitas.utana] - minden eseménynél meghívjuk (kiíráshoz)
 * @returns {Promise<{sikerult: boolean, mindketIrany: boolean, kuldott: number, kapott: number, honnan: string|null, eltelt: number}>}
 */
export async function pajzsfuras(sajatPort, tarsCim, tarsPort, beallitas = {}) {
  console.log('talalkozo - KEZDÉS', { sajatPort, tarsCim, tarsPort });

  // ⭐⭐ EGY LOGIKA, KÉT HÍVÓ (2026-09-20). A fúrás motorja a TÖBBCÉLÚ változat; ez itt
  // annak a különleges esete, EGY céllal. *Ha két külön kód fúrna, az egyik előbb-utóbb
  // elfelejtene egy őrt — pontosan úgy, ahogy a `parbeszed`/`fajlKiszolgalas` párosnál
  // kimondtuk: aki kiszolgál, az ne beszéljen elsőként, de ugyanabból a kódból.*
  const soklovas = await pajzsfurasTobbfele(sajatPort, [{ cim: tarsCim, port: tarsPort }],
    beallitas);

  const cel = soklovas.celok[0] ?? {};
  const eredmeny = {
    halo: soklovas.halo,
    // ⚠️ A RÉGI JELENTÉS VÁLTOZATLAN: „sikerült" az is, ha csak az Ő csomagja jött át
    // (fél siker) — mert az is mérés. A teljes sikert a `mindketIrany` mondja meg.
    sikerult: soklovas.sikerult,
    mindketIrany: cel.mindketIrany ?? false,
    kuldott: soklovas.kuldott,
    kapott: soklovas.kapott,
    honnan: cel.honnan ?? soklovas.honnan,
    sajatVisszhang: soklovas.sajatVisszhang,
    bukott: soklovas.bukott,
    sajatKulso: soklovas.sajatKulso,
    eltelt: soklovas.eltelt
  };
  console.log('talalkozo - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * ⭐⭐⭐ TÖBBCÉLÚ PAJZSFÚRÁS: EGY FOGLALAT, TÖBB TÁRS (2026-09-20).
 *
 * ⛔ MIÉRT NEM ELÉG A TÁRSANKÉNTI FÚRÁS: **a NAT-leképezés a FOGLALATHOZ tartozik**, nem a
 * készülékhez (17., 18., 31/b. mérés). Ha minden társhoz külön foglalatot nyitnánk, minden
 * társ MÁS külső portot látna belőlünk — és akkor nincs egyetlen olyan címünk, amit a
 * bulin bemondhatnánk, és amit a hirdetőtáblára kiírhatnánk. *Egy foglalat = egy cím =
 * egy mondható szám.*
 *
 * ⭐ ÉS EZ A BULI ALAKJA: az ablakban egyszerre kopogunk MINDENKIRE, mert a 36/d. mérés
 * szerint **idegent a mobil NAT nem enged be** — rést csak a KÖLCSÖNÖS kopogás nyit.
 *
 * @param {number} sajatPort - a rögzített helyi port (ezen fogadunk, ezt hirdetjük)
 * @param {Array<{cim: string, port: number}>} celok
 * @param {Object} [beallitas] - mint a `pajzsfuras`-nál (idokorlat · koz · utana · tartsdNyitva)
 * @returns {Promise<Object>} - `celok`: társanként az eredmény; `halo`: a nyitva hagyott rés
 */
export async function pajzsfurasTobbfele(sajatPort, celok, beallitas = {}) {
  console.log('pajzsfurasTobbfele - KEZDÉS', { sajatPort, celok: celok?.length ?? 0 });

  const idokorlat = beallitas.idokorlat ?? IDOKORLAT;
  const koz = beallitas.koz ?? KOPOGAS_KOZ;
  const jelez = beallitas.utana ?? (() => {});
  // ⭐ Hány ISMERETLEN bekopogót veszünk fel célnak ebben az ablakban (2026-09-25, lent a
  // KOPOG-ágnál). Alapból 0: a régi viselkedés, amíg a hívó ki nem mondja, hogy kéri.
  let bekopogoHely = Math.max(0, beallitas.bekopogoFogadas ?? 0);

  // ⚠️ EGY FOGLALAT — EGY CSALÁD. Az `udp4` foglalat nem tud IPv6-címre küldeni, és
  // fordítva. A többségi családot visszük, a kimaradókat pedig **kimondjuk** (D19),
  // nem hallgatjuk el: aki kimaradt, arra ebben az ablakban nem fúrunk.
  const lista = (celok ?? []).map((c) => ({ cim: String(c.cim), port: Number(c.port) }))
    .filter((c) => c.cim && Number.isFinite(c.port));
  const ipv6E = lista.length > 0 && lista.every((c) => c.cim.includes(':'));
  const mehet = lista.filter((c) => c.cim.includes(':') === ipv6E);
  for (const kimaradt of lista.filter((c) => c.cim.includes(':') !== ipv6E)) {
    jelez({ mi: 'CEL-KIHAGYVA', cim: kimaradt.cim, port: kimaradt.port,
      ok: ipv6E ? 'IPv4-cím IPv6-os körben' : 'IPv6-cím IPv4-es körben' });
  }

  const halo = createSocket({ type: ipv6E ? 'udp6' : 'udp4', reuseAddr: true });

  // ⚠️ SAJÁT AZONOSÍTÓ — EZ NÉLKÜL A MÉRÉS VAK VOLT (mérve 2026-08-29).
  // Ha valaki a SAJÁT címére kopog (vagy a hálózat visszaveri a csomagot), akkor a saját
  // kopogását kapja vissza, válaszol rá, és „teljes sikert" jelent — pedig senkivel nem
  // beszélt. Az első változat pontosan ezt csinálta. Ezért minden csomag viszi ezt a
  // véletlen azonosítót, és a sajátunkat eldobjuk.
  //
  // *(A koino módszertana: egy próba, ami mindig átmegy, nem próba.)*
  const sajatAzonosito = Math.random().toString(36).slice(2) + Date.now().toString(36);

  const kezdet = Date.now();
  let kuldott = 0, kapott = 0, honnan = null;
  let sajatVisszhang = 0, bukott = 0;
  let sajatKulso = null;          // amit a tükör mond RÓLUNK, EZEN a foglalaton

  // Társanként külön könyvelés — a kör akkor is hasznos, ha csak az egyik fél ért össze.
  const allapotok = new Map();
  for (const c of mehet) {
    allapotok.set(c.cim + ':' + c.port,
      { cim: c.cim, port: c.port, kuldott: 0, kapott: 0, mindketIrany: false,
        honnan: null, eltelt: null });
  }

  // A hívó által a megnyílt résen indított munkák (csere, fájl-randevú) — a foglalatot
  // csak ezek után szabad lezárni.
  const munkak = [];

  return new Promise((teljesites) => {
    let idozito = null, hatarido = null;

    // ⭐ MELYIK TÁRS SZÓLT? Elsőre pontos egyezés (cím ÉS port). ⚠️ Ha a port nem egyezik,
    // de a CÍM igen, akkor is őt ismerjük fel: a mobil NAT a leképezést a foglalathoz
    // adja, és az ő oldalán ez újraindításkor más szám lehet (32. mérés) — *a szám csak
    // addig él, amíg az a foglalat*. Ilyenkor feljegyezzük a friss portot is.
    const kiSzolt = (felado) => {
      const pontos = allapotok.get(felado.address + ':' + felado.port);
      if (pontos) return pontos;
      for (const a of allapotok.values()) {
        if (a.cim === felado.address) {
          a.masPort = felado.port;
          return a;
        }
      }
      return null;
    };

    let vege = false;

    const befejez = async (sikerult) => {
      if (vege) return;                 // ⚠️ hiba + időkorlát egyszerre is beeshet
      vege = true;
      if (idozito) clearInterval(idozito);
      if (hatarido) clearTimeout(hatarido);

      // ⭐⭐ ELŐBB A MUNKA, CSAK UTÁNA A ZÁRÁS. Ha a hívó a megnyílt résen cserét indított,
      // azt MEG KELL VÁRNI — különben a foglalat a csere alól csúszna ki, és a másik fél
      // a tétlenségi órájáig várna. *Ugyanaz az elv, mint a `kiurites()`-nél: a lezárás
      // nem esemény, hanem következmény.*
      if (munkak.length) await Promise.allSettled(munkak);

      // ⭐ SIKER UTÁN NYITVA HAGYHATÓ a foglalat — mert épp az a rés, amit átfúrtunk.
      // Ha most becsuknánk, a következő megnyitás ÚJ külső portot kaphatna, és kezdhetnénk
      // elölről. A csere ezen a foglalaton megy tovább (udpVonal.js).
      if (!(sikerult && beallitas.tartsdNyitva)) halo.close();
      const celEredmenyek = [...allapotok.values()];
      const eredmeny = {
        halo: sikerult && beallitas.tartsdNyitva ? halo : null,
        sikerult,
        celok: celEredmenyek,
        // ⭐ A HÍVÓNAK EZ A KÉT LISTA KELL: kivel lehet most cserélni, és kivel nem.
        atfurtak: celEredmenyek.filter((c) => c.mindketIrany),
        nemSikerultek: celEredmenyek.filter((c) => !c.mindketIrany),
        kuldott, kapott, honnan, sajatVisszhang, bukott, sajatKulso,
        eltelt: Date.now() - kezdet
      };
      console.log('pajzsfurasTobbfele - VÉGE', {
        atfurt: eredmeny.atfurtak.length, cel: celEredmenyek.length, kuldott, kapott });
      teljesites(eredmeny);
    };

    halo.on('message', (adat, felado) => {
      // ⚠️ A SAJÁT KÜLSŐ CÍMÜNK MÉRÉSE UGYANEZEN A FOGLALATON megy (lásd lentebb), tehát
      // a STUN válasza IDE érkezik. Ha ezt kopogásnak számolnánk, a mérés hazudna:
      // „kaptam 1 csomagot" — pedig csak a saját kérdésünkre jött felelet.
      if (stunValaszE(adat)) return;

      let uzenet;
      try { uzenet = JSON.parse(adat.toString('utf8')); } catch { uzenet = {}; }

      // ----- A SAJÁT VISSZHANGUNK NEM SIKER -----
      if (uzenet.tol === sajatAzonosito) {
        sajatVisszhang++;
        jelez({ mi: 'SAJAT-VISSZHANG', honnan: felado.address });
        return;
      }

      kapott++;
      honnan = felado.address;
      const allapot = kiSzolt(felado);
      if (allapot) {
        allapot.kapott++;
        allapot.honnan = felado.address;
      }

      if (uzenet.uzenet === 'KOPOG') {
        // Az ő csomagja átjutott hozzánk. Visszaszólunk — ettől ő is megtudja, hogy a
        // MÁSIK irány is él. ⚠️ Akkor is felelünk, ha nem ismerjük fel: lehet, hogy egy
        // társ hív, akinek a címe azóta megváltozott. *A felelet nem bizalom* (3. szabály):
        // a csere utána ugyanúgy ellenőriz mindent.
        jelez({ mi: 'KOPOG-ERKEZETT', honnan: felado.address, port: felado.port,
          ismert: Boolean(allapot) });
        halo.send(JSON.stringify({ uzenet: 'HALLAK', tol: sajatAzonosito }),
          felado.port, felado.address);

        // ⛔⛔ A BEKOPOGÓT CÉLNAK IS FELVESSZÜK (2026-09-25, a 40. mérés hibája).
        //
        // ⛔ A HIBA: a rés EGYOLDALÚAN nyílt meg. Az egyik fél ismerte a másik címét és
        // kopogott, a másik csak visszaszólt (HALLAK) — de mivel őt NEM ismerte célként,
        // nála nem indult csere. Az első fél cseréje így 10 mp múlva elbukott („a másik
        // fél nem válaszol"). ⭐ Terepen ez a hétköznapi eset: a bekopogóval (TCP-n)
        // kötött kötés PORT NÉLKÜL áll, tehát arra a fél sosem kopog vissza.
        // ⭐ A JAVÍTÁS: aki az ablakunkban ismeretlenként kopog, azt felvesszük, és azonnal
        // visszakopogunk rá — a válaszára (HALLAK) ugyanúgy „átfúrt" lesz, mint egy
        // ismert cél, és a csere mindkét oldalon elindul. *Ez az UDP-postaláda első
        // darabja: ugyanaz, amit a TCP-kapu tesz, csak a kopogási ablakon belül.*
        // ⚠️ KORLÁTOSAN (`bekopogoHely`) és csak a befejezés előtt: egy idegen ne tudja
        // a foglalatot végtelen munkával lekötni, és a lezáráskor induló munka ne
        // csússzon ki a foglalat alól (a `befejez` csak az addig indultakat várja meg).
        if (!allapot && !vege && bekopogoHely > 0) {
          bekopogoHely--;
          const uj = { cim: felado.address, port: felado.port, kuldott: 0, kapott: 1,
            mindketIrany: false, honnan: felado.address, eltelt: null, bekopogo: true };
          allapotok.set(felado.address + ':' + felado.port, uj);
          jelez({ mi: 'BEKOPOGO-CEL', cim: felado.address, port: felado.port });
          halo.send(JSON.stringify({ uzenet: 'KOPOG', tol: sajatAzonosito }),
            felado.port, felado.address);
        }
        return;
      }

      if (uzenet.uzenet === 'HALLAK') {
        // ⭐ EZ A TELJES SIKER: a mi csomagunk is átment, és a válasza is visszaért.
        jelez({ mi: 'HALLAK-ERKEZETT', honnan: felado.address, port: felado.port,
          ismert: Boolean(allapot) });
        if (allapot && !allapot.mindketIrany) {
          allapot.mindketIrany = true;
          allapot.eltelt = Date.now() - kezdet;

          // ⭐⭐ AKI ÁTÉRT, AZZAL AZONNAL LEHET DOLGOZNI — nem a kör végén (2026-09-20).
          // ⛔ MIÉRT: a rés nem vár ránk. Ha megvárnánk a többieket, az elsőként megnyílt
          // rés a NAT órája szerint közben elévülhetne — és akkor a fúrás eredménye egy
          // olyan cím, amin már nincs ajtó. *A megnyílt rést azonnal használni kell.*
          // ⚠️ A hívó által indított munkát MEGVÁRJUK a lezárás előtt (lásd `befejez`),
          // különben a foglalat kicsúszna a cserénk alól.
          if (typeof beallitas.atfurt === 'function') {
            const munka = (async () => beallitas.atfurt(allapot, halo))()
              .catch((hiba) => jelez({ mi: 'ATFURT-MUNKA-BUKOTT', cim: allapot.cim,
                port: allapot.port, ok: hiba.message }));
            munkak.push(munka);
          }
        }
        // ⛔ NEM ÁLLUNK MEG AZ ELSŐ SIKERNÉL, ha több társra fúrunk: a többiek rése még
        // nincs nyitva. *Csak akkor van vége, ha MINDENKI átért* — vagy lejár az ablak.
        if ([...allapotok.values()].every((a) => a.mindketIrany)) befejez(true);
      }
    });

    halo.on('error', (hiba) => {
      jelez({ mi: 'HIBA', ok: hiba.message });
      befejez(false);
    });

    halo.bind(sajatPort, () => {
      jelez({ mi: 'INDUL', port: sajatPort });

      // ⭐ MEGMÉRJÜK A SAJÁT KÜLSŐ CÍMÜNKET — ERRŐL A FOGLALATRÓL (2026-08-30).
      //
      // ⚠️ MIÉRT ITT, ÉS NEM KÜLÖN PARANCSBÓL? Mert a NAT-leképezés a FOGLALATHOZ tartozik.
      // A `kulsoport` parancs saját foglalatot nyitott, mért, bezárta — a fúró viszont ezt
      // az ÚJ foglalatot használja, ami más külső portot kaphat. A mobilhálózatos mérésnél
      // (2026-08-30) csak a NAT jóindulatán múlt, hogy a bemondott szám stimmelt.
      // Innentől a szám, amit bemondasz, ANNAK A FOGLALATNAK a portja, ami tényleg fúr.
      //
      // ⚠️ IPv6-on kimarad: ott nincs port-átírás, a saját cím maga a külső cím.
      // És ha nem megy, csak feljegyezzük — a fúrás ettől még megy (2. szabály).
      if (!ipv6E && beallitas.sajatCimMerese !== false) {
        kulsoCimFoglalaton(halo, beallitas.tukorSzerver, beallitas.tukorPort)
          .then((cim) => {
            sajatKulso = cim;
            jelez({ mi: 'SAJAT-KULSO-CIM', cim: cim.cim, port: cim.port });
          })
          .catch((hiba) => jelez({ mi: 'SAJAT-CIM-NEM-MEGY', ok: hiba.message }));
      }

      const kopog = () => {
        for (const allapot of allapotok.values()) {
          // ⭐ AKI ÁTÉRT, ARRA NEM KOPOGUNK TOVÁBB — a rés már nyitva van, a további
          // csomag csak adat (6. szabály) és akkumulátor.
          if (allapot.mindketIrany) continue;
          // ⭐ Ha közben MÁS portról szólt hozzánk, oda is kopogunk: a leképezése
          // megváltozhatott azóta, hogy a címét megkaptuk.
          const celPort = allapot.masPort ?? allapot.port;
          halo.send(JSON.stringify({ uzenet: 'KOPOG', tol: sajatAzonosito }),
            celPort, allapot.cim, (hiba) => {
            if (hiba) {
              // Egy sikertelen küldés önmagában nem végzetes (a hálózat változik), de ha
              // MINDEN küldés bukik, akkor a csomagjaink el sem indulnak — és ezt látni kell.
              bukott++;
              jelez({ mi: 'KULDES-BUKOTT', ok: hiba.message, hanyadik: bukott,
                cim: allapot.cim, port: celPort });
              return;
            }
            kuldott++;
            allapot.kuldott++;
            jelez({ mi: 'KOPOGTAM', hanyadik: kuldott, cim: allapot.cim, port: celPort });
          });
        }
      };

      kopog();
      idozito = setInterval(kopog, koz);

      // ⭐ IDŐKORLÁT 0 = VÉG NÉLKÜL FÚRUNK.
      // Csaba észrevétele nyomán: a két oldal nem biztos, hogy egyszerre indul, és a
      // rések néhány perc alatt bezáródnak. Ha viszont mindkettő FOLYAMATOSAN fúr, akkor
      // az átfedés előbb-utóbb garantált — közös óra nélkül is. (Ez a különbség az
      // „átfedés" és a „randevú" között: elég ütem, nem kell megbeszélt időpont.)
      if (idokorlat > 0) {
        hatarido = setTimeout(() => {
          // ⚠️ Ha kaptunk KOPOG-ot, de HALLAK-ot nem, az FÉL siker: az ő csomagjai
          // átjönnek, a mieink nem. Ez is értékes mérés, ezért külön jelezzük.
          // ⭐ Több célnál a „sikerült" azt jelenti: van LEGALÁBB EGY átfúrt társ —
          // *egy buli nem attól ér valamit, hogy mindenki eljött.*
          befejez([...allapotok.values()].some((a) => a.mindketIrany) || kapott > 0);
        }, idokorlat);
      }
    });
  });
}
