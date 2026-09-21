// koino/meres/kotesProba.js

// Felelősség: a TÁBLA-KULCS és a KÖTÉS-JEGYZÉK önpróbái (2026-09-20).
//
// ⭐ MIT MÉRÜNK: (1) a tábla-kulcs tényleg KÜLÖN azonosság, és a közös titkot mindkét fél
// KÜLDÉS NÉLKÜL ugyanannak számolja ki · (2) a kötés-jegyzék a TÁBLA-KULCSOT tartja
// azonosítónak, nem a címet — ezért túléli a cím-változást és az elévülést.
//
// ⚠️ Hálózat nincs benne: tiszta függvények, tiszta bemenettel (1. szabály).

import { probaGyujtemeny } from './probaFuttato.js';
import {
  ujTablaKulcs, nyilvanosResz, ervenyesTablaKulcs, kozosTitok,
  titkositva, kititkositva, bajtokka
} from '../js/csere/tablaKulcs.js';
import {
  talalkozasFeljegyzese, kotesek, kopogasCeljai, nemaKotesek, jegyzekTakaritasa,
  KOTES_CEL, KOTES_KORLAT
} from '../js/csere/kotesek.js';

const { proba, futtatas } = probaGyujtemeny('A TÁBLA-KULCS ÉS A KÖTÉSEK (2026-09-20)');

// ===================================
// A TÁBLA-KULCS
// ===================================

proba('⭐ A tábla-kulcs KÉT kulcspár: egy aláíró (a rekesz neve) és egy titkosító',
  async () => {
    const k = await ujTablaKulcs();
    const ny = nyilvanosResz(k);
    // A nyers kulcsok 32 bájtosak — base64url-ben 43 karakter.
    return ervenyesTablaKulcs(ny)
      && bajtokka(ny.alairo).length === 32 && bajtokka(ny.titkosito).length === 32
      // ⛔ ÉS A TITKOS RÉSZ NEM SZIVÁROG KI A NYILVÁNOSBA.
      && !JSON.stringify(ny).includes(k.alairoTitkos)
      && !JSON.stringify(ny).includes(k.titkositoTitkos);
  });

proba('⛔⛔ A TÁBLA-KULCS SOHA NEM AZ AZONOSSÁG — két külön kulcs, két külön kérdés',
  async () => {
    // ⚠️ A próba azt méri, ami ellenőrizhető: két egymás után kért tábla-kulcs KÜLÖNBÖZŐ,
    // vagyis nem egy rögzített, származtatott értékről van szó. *Ha valaki egyszer az
    // azonosság-kulcsból akarná levezetni, ez a próba azonnal buktatna.*
    const a = await ujTablaKulcs();
    const b = await ujTablaKulcs();
    return a.alairoNyilvanos !== b.alairoNyilvanos
      && a.titkositoNyilvanos !== b.titkositoNyilvanos;
  });

proba('⭐⭐⭐ A KÖZÖS TITOK KÜLDÉS NÉLKÜL SZÜLETIK — mindkét fél ugyanazt számolja ki',
  async () => {
    const enyem = await ujTablaKulcs();
    const ove = await ujTablaKulcs();

    const titokNalam = await kozosTitok(enyem, nyilvanosResz(ove));
    const titokNala = await kozosTitok(ove, nyilvanosResz(enyem));

    // ⭐ A BIZONYÍTÉK: amit én zárok, azt ő nyitja — pedig a titok SOHA nem utazott.
    const rejtett = await titkositva(titokNalam, '203.0.113.7:41777');
    const nyilt = await kititkositva(titokNala, rejtett);
    return nyilt === '203.0.113.7:41777'
      // ⚠️ És a rejtett alak tényleg REJT: a cím nem olvasható ki belőle.
      && !rejtett.includes('203.0.113.7');
  });

proba('⛔ EGY HARMADIK NEM TUDJA KINYITNI — és a HAMISÍTÁS nem rossz szöveget ad, hanem hibát',
  async () => {
    const enyem = await ujTablaKulcs();
    const ove = await ujTablaKulcs();
    const idegen = await ujTablaKulcs();

    const titok = await kozosTitok(enyem, nyilvanosResz(ove));
    const rejtett = await titkositva(titok, '203.0.113.7:41777');

    // (1) Egy harmadik fél kulcsával nem nyílik.
    const idegenTitok = await kozosTitok(idegen, nyilvanosResz(ove));
    let idegenBukott = false;
    try { await kititkositva(idegenTitok, rejtett); } catch { idegenBukott = true; }

    // (2) Egy megpiszkált bejegyzés sem: az AES-GCM maga ellenőrzi a sértetlenséget.
    // *A hiány és a hamisítás nem ugyanaz (D19) — a hamisítás HIBA, nem üres válasz.*
    const rontott = rejtett.slice(0, -2) + (rejtett.endsWith('A') ? 'BB' : 'AA');
    const titokNala = await kozosTitok(ove, nyilvanosResz(enyem));
    let rontasBukott = false;
    try { await kititkositva(titokNala, rontott); } catch { rontasBukott = true; }

    return idegenBukott && rontasBukott;
  });

proba('⛔ A TÁRSTÓL KAPOTT kulcs alakját ELLENŐRIZZÜK — rossz mező nem kerül a jegyzékbe',
  async () => {
    const jo = nyilvanosResz(await ujTablaKulcs());
    const rosszak = [
      null, {}, { alairo: 'rovid', titkosito: jo.titkosito },
      { alairo: jo.alairo, titkosito: 'A'.repeat(43) + 'X' },     // nem base64url-alak
      { alairo: jo.alairo, titkosito: 'A'.repeat(42) },           // rossz hosszú
      { alairo: 5, titkosito: jo.titkosito }
    ];
    return ervenyesTablaKulcs(jo) && rosszak.every((r) => !ervenyesTablaKulcs(r));
  });

// ===================================
// A KÖTÉS-JEGYZÉK
// ===================================

const kulcs = (nev) => ({ alairo: nev.padEnd(43, 'a'), titkosito: nev.padEnd(43, 't') });

proba('⭐⭐ A KÖTÉST A TÁBLA-KULCS AZONOSÍTJA — a cím változhat, a kötés marad', () => {
  let j = [];
  j = talalkozasFeljegyzese(j, kulcs('anna'), { hoszt: '203.0.113.7', port: 41777 }, 1000);
  // Ugyanaz a társ, MÁSIK hálózatról (wifi → mobil): NEM új kötés, hanem új cím.
  j = talalkozasFeljegyzese(j, kulcs('anna'), { hoszt: '130.43.210.126', port: 61389 }, 2000);

  return j.length === 1 && j[0].talalkozasok === 2
    && j[0].hoszt === '130.43.210.126' && j[0].port === 61389
    // ⭐ És megjegyzi, mióta ismerjük — a rendszeresség ebből látszik.
    && j[0].eloszor === 1000 && j[0].utoljara === 2000;
});

proba('⭐ A KÖTÉSEK a legrendszeresebbek — és a szám FELÜLRŐL KORLÁTOS (9. szabály)', () => {
  let j = [];
  // Hat társ, különböző számú találkozással.
  for (const [nev, hanyszor] of [['a', 5], ['b', 4], ['c', 3], ['d', 2], ['e', 1], ['f', 1]]) {
    for (let i = 0; i < hanyszor; i++) {
      j = talalkozasFeljegyzese(j, kulcs(nev), { hoszt: '10.0.0.1', port: 7373 }, 1000 + i);
    }
  }
  const harom = kotesek(j, KOTES_CEL);
  const takaritott = jegyzekTakaritasa(j, KOTES_KORLAT);

  return harom.length === KOTES_CEL
    && harom[0].alairo === kulcs('a').alairo
    && harom[2].alairo === kulcs('c').alairo
    // ⛔ A jegyzék sem hízhat korlátlanul — de a takarítás MÁS mérce szerint vág, mint a
    // kopogás sorrendje: ott a rendszeresség, itt az `utoljara` (lásd a következő próbát).
    && takaritott.length === KOTES_KORLAT
    && !takaritott.some((k) => k.alairo === kulcs('f').alairo);
});

proba('⛔⛔⛔ A JEGYZÉK MEGÚJUL: a halott kötés kiürül, az ÚJ társ bekerül', () => {
  // ⛔⛔ MIT MÉR, ÉS MIÉRT NEM A KORLÁTOT: a fenti próba azt nézi, hogy a jegyzék nem hízik.
  // ⭐ Ez azt, hogy CSERÉLŐDIK — és pontosan ez hiányzott 2026-09-21-ig. Akkor a takarítás
  // a `talalkozasok` szerint vágott, tehát egy új társ (1 találkozás) azonnal kiesett a
  // húszszor látott régiek mögül, és legközelebb megint 1-ről indult: a jegyzék
  // **befagyott az először megismert ötön**, akkor is, ha azok hónapja eltűntek.
  //
  // ⚠️ A FORGATÓKÖNYV A VALÓDI ESET: öt társ, akikkel sokat találkoztunk, aztán MIND
  // eltűnik (hálózatot váltottak, eladták a telefont) — és közben négy ÚJ társsal érünk
  // össze, újra és újra.
  const NAP = 24 * 60 * 60 * 1000;
  let j = [];
  let t = 0;
  for (let kor = 0; kor < 20; kor++) {
    for (const nev of ['r1', 'r2', 'r3', 'r4', 'r5']) {
      t += 60000;
      j = jegyzekTakaritasa(talalkozasFeljegyzese(j, kulcs(nev), { hoszt: '10.0.0.1', port: 7373 }, t));
    }
  }
  // ⭐ A régiek tényleg bent vannak, és tényleg rendszeresek — különben a próba nem is
  // arról szólna, amiről gondoljuk (a „nem vak" fele).
  const regiekBent = jegyzekTakaritasa(j).length === KOTES_KORLAT
    && jegyzekTakaritasa(j).every((k) => k.alairo.startsWith('r'));

  // Eltelik egy hónap. Négy ÚJ társ, tíz körön át.
  let most = t + 30 * NAP;
  for (let kor = 0; kor < 10; kor++) {
    for (const nev of ['u1', 'u2', 'u3', 'u4']) {
      most += 60000;
      j = jegyzekTakaritasa(talalkozasFeljegyzese(j, kulcs(nev), { hoszt: '10.0.0.2', port: 7373 }, most));
    }
  }

  const ujak = j.filter((k) => k.alairo.startsWith('u'));
  const regiek = j.filter((k) => k.alairo.startsWith('r'));

  return regiekBent
    // ⭐ MIND A NÉGY ÚJ TÁRS BENT VAN — a régi kódban EGY sem volt.
    && ujak.length === 4
    // ⛔ ÉS A HALOTTAK KIÜRÜLTEK: legfeljebb egy régi maradhat (az ötödik hely).
    && regiek.length <= 1
    // ⛔⛔ A GYAKORLATI TÉT: a tábláról már nem halottakat keresünk (körönként ~23 mp
    // fejenként), és a kopogás kerete sem megy el rájuk.
    && nemaKotesek(j, 5 * 60 * 1000, most).every((k) => !k.alairo.startsWith('u'))
    && kopogasCeljai(j, []).some((c) => c.cim === '10.0.0.2');
});

proba('⭐⭐⭐ A KÖTÉS ŐRZI A CÍMET, AMIT A NÉVTELEN JEGYZÉK MÁR ELFELEJTETT', () => {
  // ⛔ EZ A LÉNYEG: a friss UDP-címek jegyzéke percek alatt elévül (31. mérés), és a
  // tegnapi társ egyszerűen eltűnne belőle. ⭐ A kötés viszont megőrzi az utolsó ismert
  // címet — egy kopogás ~60 bájt, sokkal olcsóbb megpróbálni, mint elfelejteni valakit.
  let j = [];
  j = talalkozasFeljegyzese(j, kulcs('anna'), { hoszt: '203.0.113.7', port: 41777 }, 1000);

  // A névtelen jegyzék ÜRES (minden elévült), mégis van kire kopogni.
  const celok = kopogasCeljai(j, []);
  return celok.length === 1 && celok[0].cim === '203.0.113.7' && celok[0].port === 41777;
});

proba('⭐ A KOPOGÁS CÉLJAI: a kötések ELÖL, a friss címek utánuk — duplikátum nélkül', () => {
  let j = [];
  j = talalkozasFeljegyzese(j, kulcs('anna'), { hoszt: '203.0.113.7', port: 41777 }, 1000);
  j = talalkozasFeljegyzese(j, kulcs('bela'), { hoszt: '203.0.113.8', port: 41888 }, 1000);

  const celok = kopogasCeljai(j, [
    { hoszt: '203.0.113.7', port: 41777 },      // ugyanaz, mint a kötés — nem duplázódik
    { hoszt: '198.51.100.9', port: 7373 }       // egy idegen, akivel még nem értünk össze
  ]);

  return celok.length === 3
    && celok[0].cim === '203.0.113.7'
    && celok.some((c) => c.cim === '198.51.100.9');
});

proba('⭐ A NÉMA KÖTÉS megnevezhető — erről kell majd a TÁBLÁRÓL érdeklődni (D19)', () => {
  let j = [];
  j = talalkozasFeljegyzese(j, kulcs('anna'), { hoszt: '10.0.0.1', port: 1 }, 1000);
  j = talalkozasFeljegyzese(j, kulcs('bela'), { hoszt: '10.0.0.2', port: 2 }, 9000);

  // 5 mp-es ablakkal: Anna (1000) néma, Béla (9000) nem.
  const nemak = nemaKotesek(j, 5000, 10000);
  return nemak.length === 1 && nemak[0].alairo === kulcs('anna').alairo;
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/kotesProba.js
if (process.argv[1] && process.argv[1].endsWith('kotesProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
