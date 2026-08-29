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
// Használják: koino.js (`talalkozo` parancs) és a csereProba.js.

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

const SUTI = 0x2112A442;

/**
 * Megkérdezi egy STUN-kiszolgálótól, milyen CÍMEN ÉS PORTON látszunk kívülről.
 *
 * @param {number} helyiPort - erről a portról kérdezünk (a mérés csak erre érvényes!)
 * @param {string} [szerver]
 * @param {number} [szerverPort]
 * @returns {Promise<{cim: string, port: number}>}
 */
export async function kulsoCim(helyiPort, szerver = 'stun.l.google.com', szerverPort = 19302) {
  console.log('kulsoCim - KEZDÉS', { helyiPort, szerver });

  const halo = createSocket({ type: 'udp4', reuseAddr: true });
  const keres = Buffer.alloc(20);
  keres.writeUInt16BE(0x0001, 0);
  keres.writeUInt16BE(0, 2);
  keres.writeUInt32BE(SUTI, 4);
  for (let i = 8; i < 20; i++) keres[i] = Math.floor(Math.random() * 256);

  return new Promise((teljesites, elutasitas) => {
    const hatarido = setTimeout(() => {
      halo.close();
      elutasitas(new Error('a STUN-kiszolgáló nem válaszolt 5 mp alatt'));
    }, 5000);

    halo.on('message', (v) => {
      let p = 20;
      while (p + 4 <= v.length) {
        const tipus = v.readUInt16BE(p), hossz = v.readUInt16BE(p + 2);
        if (tipus === 0x0020) {              // XOR-MAPPED-ADDRESS
          const port = v.readUInt16BE(p + 6) ^ 0x2112;
          const cim = [0, 1, 2, 3]
            .map((i) => v[p + 8 + i] ^ ((SUTI >> (24 - 8 * i)) & 0xff)).join('.');
          clearTimeout(hatarido); halo.close();
          console.log('kulsoCim - VÉGE', { cim, port });
          teljesites({ cim, port });
          return;
        }
        p += 4 + hossz + ((4 - (hossz % 4)) % 4);
      }
      clearTimeout(hatarido); halo.close();
      elutasitas(new Error('a válasz nem tartalmazott címet'));
    });

    halo.on('error', (h) => { clearTimeout(hatarido); elutasitas(h); });
    halo.bind(helyiPort, () => halo.send(keres, szerverPort, szerver));
  });
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

  const idokorlat = beallitas.idokorlat ?? IDOKORLAT;
  const koz = beallitas.koz ?? KOPOGAS_KOZ;
  const jelez = beallitas.utana ?? (() => {});

  // Az `udp6` a globális IPv6-hoz kell. A `reuseAddr` azért, hogy egy félbehagyott
  // próbálkozás után azonnal újra lehessen indítani ugyanazon a porton.
  // ⭐ IPv4 VAGY IPv6? A cím maga megmondja: ha van benne kettőspont, IPv6.
  // Ez azért lett fontos, mert két hétköznapi háztartás közül az egyikben NINCS működő
  // IPv6 — a közös nevező az IPv4. A fúrónak tehát mindkettőt tudnia kell.
  const ipv6E = String(tarsCim).includes(':');
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
  let kuldott = 0, kapott = 0, honnan = null, mindketIrany = false;
  let sajatVisszhang = 0, bukott = 0;

  return new Promise((teljesites) => {
    let idozito = null, hatarido = null;

    const befejez = (sikerult) => {
      if (idozito) clearInterval(idozito);
      if (hatarido) clearTimeout(hatarido);
      halo.close();
      const eredmeny = {
        sikerult, mindketIrany, kuldott, kapott, honnan, sajatVisszhang, bukott,
        eltelt: Date.now() - kezdet
      };
      console.log('talalkozo - VÉGE', eredmeny);
      teljesites(eredmeny);
    };

    halo.on('message', (adat, felado) => {
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

      if (uzenet.uzenet === 'KOPOG') {
        // Az ő csomagja átjutott hozzánk. Visszaszólunk — ettől ő is megtudja, hogy a
        // MÁSIK irány is él.
        jelez({ mi: 'KOPOG-ERKEZETT', honnan: felado.address, port: felado.port });
        halo.send(JSON.stringify({ uzenet: 'HALLAK', tol: sajatAzonosito }),
          felado.port, felado.address);
        // Nem állunk meg: megvárjuk a HALLAK-ot is, hogy mindkét irányról tudjunk.
        return;
      }

      if (uzenet.uzenet === 'HALLAK') {
        // ⭐ EZ A TELJES SIKER: a mi csomagunk is átment, és a válasza is visszaért.
        mindketIrany = true;
        jelez({ mi: 'HALLAK-ERKEZETT', honnan: felado.address, port: felado.port });
        befejez(true);
      }
    });

    halo.on('error', (hiba) => {
      jelez({ mi: 'HIBA', ok: hiba.message });
      befejez(false);
    });

    halo.bind(sajatPort, () => {
      jelez({ mi: 'INDUL', port: sajatPort });

      const kopog = () => {
        halo.send(JSON.stringify({ uzenet: 'KOPOG', tol: sajatAzonosito }),
          tarsPort, tarsCim, (hiba) => {
          if (hiba) {
            // Egy sikertelen küldés önmagában nem végzetes (a hálózat változik), de ha
            // MINDEN küldés bukik, akkor a csomagjaink el sem indulnak — és ezt látni kell.
            bukott++;
            jelez({ mi: 'KULDES-BUKOTT', ok: hiba.message, hanyadik: bukott });
            return;
          }
          kuldott++;
          jelez({ mi: 'KOPOGTAM', hanyadik: kuldott });
        });
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
          befejez(kapott > 0);
        }, idokorlat);
      }
    });
  });
}
