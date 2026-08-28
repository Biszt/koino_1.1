// koino/js/csere/kapunyitas.js

// Felelősség: MEGKÉRNI A ROUTERT, hogy engedje be a kapcsolatot — kézi beállítás nélkül.
//
// ⭐ MIÉRT KELL EZ?
// A koino csak akkor tud kaput nyitni a világ felé, ha a router átengedi a bejövő
// kapcsolatot. Ezt kézzel is be lehet állítani a router felületén — de az e-emberek
// többsége soha nem fogja megtalálni azt a menüt, és minden routernél máshol van.
//
// Szerencsére van rá szabvány: a program MEGKÉRHETI a routert. Ezt csinálják a játékok és
// a letöltőprogramok is. Két protokoll létezik, ugyanazon az UDP-porton (5351):
//
//   NAT-PMP (RFC 6886)  — a régebbi, EGYSZERŰ, de CSAK IPv4
//   PCP     (RFC 6887)  — az utódja, és EZ TUD IPv6 tűzfal-rést nyitni
//
// A koinónak a PCP kell: a szolgáltatói NAT (CGNAT) miatt az IPv4 amúgy is használhatatlan
// befelé, tehát minden az IPv6-on múlik.
//
// ⚠️ EZ SEGÉDESZKÖZ, NEM ELŐFELTÉTEL (a platform-függetlenség 2. szabálya). Ha a router
// nem válaszol, vagy nemet mond, a koino ugyanúgy működik tovább — csak nem tud kaput
// nyitni, tehát ő kezdeményez majd kifelé. Semmi nem múlhat ezen.
//
// Használják: koino.js (`kapu` parancs).

import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';

const PORT = 5351;                 // a NAT-PMP és a PCP közös portja
const VARAKOZAS = 3000;            // ennyi ideig várunk válaszra

// A PCP válasz-kódjai — ezek mondják meg, MIÉRT nem sikerült (RFC 6887, 7.4)
const PCP_VALASZOK = {
  0: 'SIKER',
  1: 'a router nem ismeri ezt a PCP-verziót',
  2: 'nincs jogosultság — a routeren KI VAN KAPCSOLVA a portnyitás',
  3: 'hibás kérés',
  4: 'a router nem ismeri ezt a műveletet',
  5: 'a router nem ismeri ezt a beállítást',
  6: 'kötelező beállítás, amit nem ismer',
  7: 'ezt a protokollt nem támogatja',
  8: 'túl sok kérés ettől a géptől',
  9: 'a router nem enged saját portválasztást',
  10: 'elfogytak a router erőforrásai',
  11: 'a router nincs beállítva erre',
  12: 'a cím nem egyezik a kérés küldőjével',
  13: 'túl sok szál',
  14: 'nem támogatott'
};

// ===================================
// SEGÉD: A SAJÁT CÍM ÉS A HÁLÓZATI SZAKASZ
// ===================================

/**
 * Megkeresi a saját globális IPv6-címünket és a hozzá tartozó „szakasz-azonosítót".
 *
 * ⚠️ MI AZ A SZAKASZ-AZONOSÍTÓ (scopeid)? A router helyi címe `fe80:`-nal kezdődik, és az
 * ilyen cím CSAK EGY HÁLÓZATI KÁRTYÁN belül értelmes — több kártya esetén ugyanaz a cím
 * két különböző gépet jelenthet. Ezért kell mellé megadni, melyik kártyán keressük.
 *
 * @returns {{cim: string, szakasz: number, kartya: string}|null}
 */
export function sajatIPv6() {
  for (const [kartya, cimek] of Object.entries(networkInterfaces())) {
    const globalis = (cimek ?? []).find((c) =>
      c.family === 'IPv6' && !c.internal && ['2', '3'].includes(c.address.slice(0, 1)));
    if (!globalis) continue;

    // ⚠️ A szakasz-azonosító a GLOBÁLIS címen 0 (nincs is rá szüksége) — de a routert a
    // helyi `fe80:` címén szólítjuk meg, ahol viszont KÖTELEZŐ. Ezért ugyanannak a
    // kártyának a helyi címéről vesszük át.
    const helyi = (cimek ?? []).find((c) =>
      c.family === 'IPv6' && c.address.toLowerCase().startsWith('fe80'));

    return { cim: globalis.address, szakasz: helyi?.scopeid ?? 0, kartya };
  }
  return null;
}

// ===================================
// ÜZENET-VÁLTÁS A ROUTERREL
// ===================================

/**
 * Elküld egy UDP-üzenetet a routernek, és megvárja a választ.
 *
 * @param {Buffer} uzenet
 * @param {string} cim - a router címe (link-local IPv6 esetén `%szakasz` végződéssel)
 * @param {boolean} hatosIPv6
 * @returns {Promise<Buffer|null>} a válasz, vagy null ha nem jött
 */
function kerdez(uzenet, cim, hatosIPv6) {
  return new Promise((teljesites) => {
    const halo = createSocket(hatosIPv6 ? 'udp6' : 'udp4');
    let lezarult = false;

    const vege = (valasz) => {
      if (lezarult) return;
      lezarult = true;
      try { halo.close(); } catch { /* már zárva */ }
      teljesites(valasz);
    };

    halo.on('message', (adat) => vege(adat));
    halo.on('error', () => vege(null));
    setTimeout(() => vege(null), VARAKOZAS);

    halo.send(uzenet, PORT, cim, (hiba) => { if (hiba) vege(null); });
  });
}

// ===================================
// NAT-PMP — „élsz egyáltalán?"
// ===================================

/**
 * A legegyszerűbb kérdés: „mi a külső címem?" (NAT-PMP, 0. művelet).
 *
 * Ez csak azt méri, hogy a router **válaszol-e egyáltalán** az 5351-es porton. A választ
 * magát nem tudjuk használni (IPv4, és a CGNAT miatt úgyis értéktelen) — de ha VAN válasz,
 * akkor a portnyitás-szolgáltatás fut.
 *
 * @param {string} atjaro - az IPv4 átjáró (pl. 192.168.1.1)
 * @returns {Promise<{valaszol: boolean, kulsoCim?: string}>}
 */
export async function natpmpEletjel(atjaro) {
  console.log('natpmpEletjel - KEZDÉS', { atjaro });

  const keres = Buffer.from([0, 0]);          // verzió 0, művelet 0
  const valasz = await kerdez(keres, atjaro, false);

  if (!valasz || valasz.length < 12) {
    console.log('natpmpEletjel - VÉGE (nincs válasz)');
    return { valaszol: false };
  }

  const kulsoCim = [valasz[8], valasz[9], valasz[10], valasz[11]].join('.');
  console.log('natpmpEletjel - VÉGE', { kulsoCim });
  return { valaszol: true, kulsoCim };
}

// ===================================
// PCP — a tűzfal-rés kérése IPv6-ra
// ===================================

/**
 * Megkéri a routert, hogy engedje be a bejövő TCP-kapcsolatot egy portra.
 *
 * ⚠️ IPv6-on ez NEM cím-fordítás, hanem TŰZFAL-RÉS („pinhole"). Nincs mit lefordítani: a
 * címünk valódi, csak a tűzfal nem enged be rá. Ezért a „külső port" és a „belső port"
 * ugyanaz — mi is ezt kérjük.
 *
 * @param {Object} leiras
 * @param {string} leiras.atjaro - a router link-local címe (fe80:…)
 * @param {number} leiras.szakasz - a hálózati kártya azonosítója (lásd sajatIPv6)
 * @param {string} leiras.sajatCim - a SAJÁT globális IPv6-címünk
 * @param {number} leiras.port - melyik portot nyissa
 * @param {number} [leiras.elettartam] - hány másodpercre (0 = a rés BEZÁRÁSA)
 * @returns {Promise<{sikeres: boolean, ok: string, kod?: number, port?: number, elettartam?: number}>}
 */
export async function pcpKapuKerese({ atjaro, szakasz, sajatCim, port, elettartam = 3600 }) {
  console.log('pcpKapuKerese - KEZDÉS', { atjaro, port, elettartam });

  // ----- A KÉRÉS FEJLÉCE (24 bájt) -----
  const fejlec = Buffer.alloc(24);
  fejlec[0] = 2;                              // PCP verzió
  fejlec[1] = 1;                              // kérés (nem válasz) + MAP művelet
  fejlec.writeUInt32BE(elettartam, 4);        // meddig éljen a rés
  cimBajtok(sajatCim).copy(fejlec, 8);        // a saját címünk (16 bájt)

  // ----- A MAP MŰVELET ADATAI (36 bájt) -----
  const adat = Buffer.alloc(36);
  // A „nonce" egy véletlen szám: ezzel ismeri fel a router, hogy UGYANAZ a kérés
  // ismétlődik-e, vagy valaki más kér ugyanarra a portra.
  for (let i = 0; i < 12; i++) adat[i] = Math.floor(Math.random() * 256);
  adat[12] = 6;                               // 6 = TCP
  adat.writeUInt16BE(port, 16);               // belső port
  adat.writeUInt16BE(port, 18);               // ugyanezt kérjük kívülre is
  cimBajtok(sajatCim).copy(adat, 20);         // a kért külső cím = a sajátunk

  const valasz = await kerdez(
    Buffer.concat([fejlec, adat]),
    atjaro + '%' + szakasz,
    true
  );

  // ----- A VÁLASZ ÉRTELMEZÉSE -----
  if (!valasz) {
    console.log('pcpKapuKerese - VÉGE (nincs válasz)');
    return { sikeres: false, ok: 'a router nem válaszolt (nem ismeri a PCP-t, vagy ki van kapcsolva)' };
  }
  if (valasz.length < 24) {
    return { sikeres: false, ok: 'túl rövid válasz (' + valasz.length + ' bájt)' };
  }

  const kod = valasz[3];
  const eredmeny = {
    sikeres: kod === 0,
    kod,
    ok: PCP_VALASZOK[kod] ?? ('ismeretlen válaszkód: ' + kod)
  };

  if (kod === 0 && valasz.length >= 60) {
    eredmeny.elettartam = valasz.readUInt32BE(4);
    eredmeny.port = valasz.readUInt16BE(42);   // a ténylegesen kapott külső port
  }

  console.log('pcpKapuKerese - VÉGE', eredmeny);
  return eredmeny;
}

/**
 * Egy IPv6-cím 16 bájtja. (Az IPv4-et is IPv6-alakban kell megadni a PCP-ben.)
 * @param {string} cim
 * @returns {Buffer}
 */
function cimBajtok(cim) {
  const bajtok = Buffer.alloc(16);
  const tiszta = cim.split('%')[0];            // a szakasz-azonosító nem tartozik a címhez

  // A „::" rövidítés feloldása: elöl és hátul lévő csoportok, közte nullák
  const [elol, hatul] = tiszta.split('::');
  const elolCsoportok = elol ? elol.split(':').filter(Boolean) : [];
  const hatulCsoportok = hatul ? hatul.split(':').filter(Boolean) : [];
  const hianyzo = 8 - elolCsoportok.length - hatulCsoportok.length;

  const csoportok = [
    ...elolCsoportok,
    ...Array(tiszta.includes('::') ? hianyzo : 0).fill('0'),
    ...hatulCsoportok
  ];

  for (let i = 0; i < 8; i++) {
    bajtok.writeUInt16BE(parseInt(csoportok[i] ?? '0', 16), i * 2);
  }
  return bajtok;
}
