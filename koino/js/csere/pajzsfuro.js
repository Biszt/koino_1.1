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

const KOPOGAS_KOZ = 1000;      // ennyi ezredmásodpercenként kopogunk
const IDOKORLAT = 60000;       // eddig próbálkozunk (0 = vég nélkül, amíg le nem állítják)

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
  const halo = createSocket({ type: 'udp6', reuseAddr: true });

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
