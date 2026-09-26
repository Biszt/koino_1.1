// koino/meres/parancssorProba.js

// Felelősség: bizonyítani, hogy A KÉZI ÚT TÉNYLEG MEGVAN — a parancssorból, végig.
//
// ===== ⛔⛔ MIÉRT SZÜLETETT EZ A FÁJL (2026-09-10) =====
//
// Egy kód-átnézés talált egy 4. szabály-hiányt: megépült az **általános egyezmény** élő
// hatálya és az `allast` parancs, de **nem volt mivel létrehozni azt az egyezményt**,
// amiről állást lehetett volna foglalni — a `koino.js` mindkét javaslat-útja beégetve
// `fajta: 'szerkesztesi'`-t küldött. A könyvtár-réteg tudta; a kéz nem érte el.
//
// ⚠️ ÉS EZT EGYETLEN MEGLÉVŐ PRÓBA SEM VETTE ÉSZRE, mert mind a **modulokat** hívja
// közvetlenül. *Amit csak a modul-próba mér, arról nem tudjuk, hogy elérhető-e kézzel.*
// A 4. szabály viszont épp az elérhetőségről szól: *„Legyen mindig kézi út."*
//
// ⭐ Ezért ez a lap MÁSHOGY mér: **külön folyamatban indítja a `koino.js`-t**, egy
// eldobható adat-mappával (`KOINO_ADAT`), és a **kimenetét** olvassa — pontosan úgy, ahogy
// egy ember ülne le elé. Lassabb, mint a többi próba (folyamat-indítás), ezért kevés van
// belőle: csak a **teljes körök**, amiknek kézzel végigjárhatónak kell lenniük.

import { probaGyujtemeny } from './probaFuttato.js';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// ⭐ A néma DHT-gép és a néma tükör próbájához (40. mérés): egy foglalat, ami hall, de nem felel.
import { createSocket } from 'node:dgram';

const { proba, futtatas } = probaGyujtemeny('A KÉZI ÚT — a parancssor végigjárása (4. szabály)');

// A `koino.js` a `meres/` mappához képest egy szinttel feljebb van.
const KOINO_JS = new URL('../koino.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/**
 * Egy `koino.js` parancs lefuttatása külön folyamatban.
 *
 * ⚠️ A KIMENETET adja vissza, nem az állapotot — ez a lényeg: azt mérjük, amit egy ember
 * LÁT, nem azt, amit a modul tud.
 */
function fut(hely, ...ervek) {
  // ⭐ AZ UTOLSÓ ÉRV LEHET KÖRNYEZET is (2026-09-20): a tábla-próbának meg kell mondani,
  // melyik (hamis) DHT-belépőt használja. *Nem új gépezet: egy objektum a lista végén.*
  const kornyezet = (ervek.length && typeof ervek[ervek.length - 1] === 'object')
    ? ervek.pop() : {};
  return new Promise((teljesul, elakad) => {
    execFile(
      process.execPath, [KOINO_JS, ...ervek],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...kornyezet },
        timeout: 30000 },
      (hiba, kimenet, hibaKimenet) => {
        if (hiba && !kimenet) return elakad(new Error(hiba.message + ' | ' + hibaKimenet));
        teljesul(kimenet + hibaKimenet);
      }
    );
  });
}

/** Egy eldobható „készülék": saját kulcs, saját adat-mappa. */
async function ujKeszulek() {
  return mkdtemp(join(tmpdir(), 'koino-parancssor-'));
}

/** A kiírt 8 karakteres azonosító kiszedése egy sorból. */
function azonosito(kimenet, elozmeny) {
  const sor = kimenet.split('\n').find((s) => s.includes(elozmeny));
  const talalat = sor && sor.match(/([A-Za-z0-9_-]{8})/g);
  return talalat ? talalat[talalat.length - 1] : null;
}

const varj = (mp) => new Promise((t) => setTimeout(t, mp));

/** A kiírt TELJES (43 karakteres) azonosító — a horgonyokhoz. */
function teljesAzonosito(kimenet) {
  const talalat = kimenet.match(/[A-Za-z0-9_-]{43}/g);
  return talalat ? talalat[talalat.length - 1] : null;
}

/**
 * EGY CSERE-KÖR két készülék között: `figyel` az egyik oldalon, `csere` a másikon.
 *
 * ⚠️ A figyelőt a kör végén LEÁLLÍTJUK, és várunk is utána — mérve derült ki, hogy amíg a
 * figyelő fut, ugyanarra az adat-mappára indított másik parancs nem feltétlenül látja a
 * frissen érkezett eseményeket. *(Ugyanaz a fajta ütközés, mint két párhuzamos `mind.js`.)*
 */
async function csereKor(gazda, vendeg, port) {
  const figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
    env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' },
    stdio: 'ignore'
  });
  try {
    await varj(2000);
    await fut(vendeg, 'csere', '127.0.0.1', String(port));
    await varj(1000);
  } finally {
    figyelo.kill();
    await varj(1000);
  }
}

// ===================================
// ⭐⭐⭐ AZ ÁLTALÁNOS KÖR: javaslat → egyezmény → állásfoglalás
// ===================================

proba('⭐⭐⭐ AZ ÁLTALÁNOS JAVASLAT KÉZI ÚTJA: altalanos → szavaz → allast', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');

    const g = await fut(hely, 'gondolat', 'A TÉMA');
    const gondolat = azonosito(g, 'Létrejött:');
    if (!gondolat) return false;

    // ⭐ RÖGZÍTETT DÖNTÉSI IDŐ: a min és a max ugyanaz, tehát a lezárás pillanata nem függ
    // a bizonyossági mutatótól. *A próba ne a véletlenen múljon.*
    await fut(hely, 'ertek', gondolat, '51', '0', '3', '3');

    const a = await fut(hely, 'altalanos', 'FOGADJUK EL EZT AZ ELVET', gondolat, 'mert így jó');
    const javaslat = azonosito(a, 'Általános javaslat beadva:');
    if (!javaslat) return false;

    await fut(hely, 'szavaz', javaslat, 'tamogat');

    // Megvárjuk a lezárást (döntési idő 3 mp), hogy megszülethessen az egyezmény.
    await varj(3500);

    await fut(hely, 'allast', javaslat, 'csatlakozik');
    const kep = await fut(hely, 'allapot');

    return kep.includes('ÁLTALÁNOS JAVASLATOK')
      && kep.includes('ÁLTALÁNOS EGYEZMÉNYEK')
      && kep.includes('FOGADJUK EL EZT AZ ELVET')
      && /hatály MOST/.test(kep)
      && /🤝 1/.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ Az ÁLTALÁNOS javaslat nem kerül a SZERKESZTÉSI fejléc alá (D27 névszabály)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const gondolat = azonosito(await fut(hely, 'gondolat', 'A TÉMA'), 'Létrejött:');
    await fut(hely, 'altalanos', 'AZ ÁLLÁSPONT', gondolat);
    const kep = await fut(hely, 'allapot');

    // ⚠️ AZ ÁLLÁSPONT CÍME HÁROMSZOR IS ELŐFORDUL a képen: a GONDOLATOK szakaszban is
    // (a javaslat entitás, D27/5), és a saját fejléce alatt. Ezért nem az ELSŐ
    // előfordulást nézzük, hanem azt, hogy a **két fejléc közé** ne essen egy sem.
    const sorok = kep.split('\n');
    const szerkesztesi = sorok.findIndex((s) => s.includes('SZERKESZTÉSI JAVASLATOK'));
    const altalanos = sorok.findIndex((s) => s.includes('ÁLTALÁNOS JAVASLATOK'));
    if (szerkesztesi < 0 || altalanos <= szerkesztesi) return false;

    const szerkesztesiSzakasz = sorok.slice(szerkesztesi, altalanos);
    const altalanosSzakasz = sorok.slice(altalanos);
    return !szerkesztesiSzakasz.some((s) => s.includes('AZ ÁLLÁSPONT'))
      && altalanosSzakasz.some((s) => s.includes('AZ ÁLLÁSPONT'));
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ A hely KÖTELEZŐ — nélküle nincs kör, aki dönt róla (D27/4)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kimenet = await fut(hely, 'altalanos', 'AZ ÁLLÁSPONT');
    return /Hol álljon/.test(kimenet);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐ ÉS A SZERKESZTÉSI KÖR IS — hogy a fenti ne legyen egyedi
// ===================================

proba('⭐ A SZERKESZTÉSI kör kézi útja: javaslat → szavaz → az új cím látszik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const gondolat = azonosito(await fut(hely, 'gondolat', 'EREDETI CÍM'), 'Létrejött:');
    await fut(hely, 'ertek', gondolat, '51', '0', '3', '3');

    const javaslat = azonosito(
      await fut(hely, 'javaslat', gondolat, 'ÚJ CÍM'),
      'Szerkesztési javaslat beadva'
    );
    if (!javaslat) return false;

    await fut(hely, 'szavaz', javaslat, 'tamogat');
    await varj(3500);

    const kep = await fut(hely, 'allapot');
    // ⭐ A HARMADIK FÁZIS bizonyítéka a parancssorból: az entitás címe tényleg átíródott.
    return kep.includes('ÚJ CÍM') && kep.includes('SZERKESZTÉSI EGYEZMÉNYEK');
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A SZAKASZ 4 KÉZI ÚTJA — az identitás (2026-09-12)
// ===================================
//
// ⛔⛔ MIÉRT SZÜLETETT: a két lépcsős beléptető (D54–D63) **52 önpróbával** megépült, zöld
// volt — és **senki nem érte el**. A `koino.js` a `muveletek.js` tizenhat műveletéből
// kilencet importált; az `identitas.js` és a `jelzesek.js` egyetlen importálója a **saját
// próbája** volt. *Modul-próbával ezt nem lehet elkapni: azok épp a modult hívják.*

proba('⭐⭐⭐ A TELJES IDENTITÁS-KÖR KÉZZEL: belep → csere → meghiv → csere → TAG', async () => {
  const alapito = await ujKeszulek();
  const ujonc = await ujKeszulek();
  try {
    await fut(alapito, 'koino', 'Próba koinó');

    // ⭐ Az újonc MEGNYITJA a saját azonosság-szeletét. Ez még NEM tagság.
    const horgony = teljesAzonosito(await fut(ujonc, 'belep'));
    if (!horgony) return false;

    // Az alapítónak meg kell ismernie az újonc horgonyát — ez a csere dolga.
    // ⚠️ És az újonc is csak ezután ismeri a koinót: addig az állapot a fejlécnél
    // visszafordul, tehát a „még nem tag" képet CSAK a csere után lehet felvenni.
    await csereKor(alapito, ujonc, 7931);

    const elotte = await fut(ujonc, 'allapot');
    if (!/✘ tag/.test(elotte)) return false;      // a kiindulás: ismeri a koinót, de nem tag

    await fut(alapito, 'meghiv', horgony);
    await csereKor(alapito, ujonc, 7932);

    const utana = await fut(ujonc, 'allapot');
    // ⭐ A BIZONYÍTÉK: ugyanaz a készülék, ugyanaz a parancs — más válasz.
    return /✔ tag/.test(utana) && /tag hívta be/.test(utana);
  } finally {
    await rm(alapito, { recursive: true, force: true });
    await rm(ujonc, { recursive: true, force: true });
  }
});

proba('⭐ AZ AZONOSSÁG LÁTSZIK az állapotban — és a „nem" INDOKOLT (D19)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kep = await fut(hely, 'allapot');
    // ⭐ Az alapító mindhárom kérdésre igen — ő a rekurzió alapesete (D56).
    return kep.includes('AZONOSSÁG')
      && /✔ tag/.test(kep) && /✔ tanúsíthat/.test(kep) && /✔ 2\. lépcsős/.test(kep)
      && /bízták rád a tanúsítást/.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ HORGONY NÉLKÜL nem lehet állítani másról — a művelet megnevezi, mi hiányzik', async () => {
  const hely = await ujKeszulek();
  try {
    // ⚠️ Szándékosan NINCS `koino` és NINCS `belep`: nincs saját horgony.
    const kimenet = await fut(hely, 'meghiv', 'akarmi');
    return /Nincs ilyen azonosító|horgony/i.test(kimenet);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A „MEGBÍZÁS, NEM PONTSZÁM" (D60) a kiírásban is így jelenik meg', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Próba koinó');
    const kep = await fut(hely, 'allapot');
    // ⛔ Soha nem „becsületesség: N" — a jellem-szám hírnév-rendszerré romlana (D18/1, D49/b).
    return /bízták rád a tanúsítást/.test(kep) && !/becsületesség/i.test(kep);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⛔⛔ A KÉZI ÚT HÁLÓZAT NÉLKÜL: kivisz → behoz (4. szabály)
// ===================================
//
// ⭐ EZ A PRÓBA A SZABÁLY MAGA. A 4. szabály azt mondja, minden automatikus cseréhez
// tartozzon fájlba mentés / fájlból olvasás — *„ha egy funkció csak online tud működni,
// az fojtópont"*. A modul-próba (`fajlCsereProba.js`) azt méri, hogy a **könyvtár** tudja;
// ez azt, hogy a **kéz is eléri**. A kettő nem ugyanaz: 2026-09-10-én és 09-12-én is
// pontosan ez a különbség rejtett el egy egész megépült réteget.
//
// ⚠️ Itt SEMMILYEN hálózat nincs: nincs `figyel`, nincs `csere`, nincs port. Két külön
// adat-mappa, és egy fájl közöttük — ennyi.

proba('⭐⭐⭐ A KÉZI ÚT HÁLÓZAT NÉLKÜL: kivisz → behoz, és a másik gép LÁTJA a gondolatot', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  const fajl = join(egyik, 'atvitel.jsonl');
  try {
    await fut(egyik, 'koino', 'Próba koinó');
    await fut(egyik, 'gondolat', 'KÖZÖS KÚT');

    const ki = await fut(egyik, 'kivisz', fajl);
    if (!/Kivíve/.test(ki)) return false;

    // ⛔ A MÁSIK KÉSZÜLÉK SOHA NEM BESZÉLT AZ ELSŐVEL. Csak ezt az egy fájlt kapta meg.
    const be = await fut(masik, 'behoz', fajl);
    if (!/új esemény/.test(be)) return false;

    // ⭐ És a bizonyíték nem a „behozva" szó, hanem hogy az ÁLLAPOTÁBAN ott a gondolat.
    const kep = await fut(masik, 'allapot');
    return /KÖZÖS KÚT/.test(kep);
  } finally {
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

proba('⛔⛔ A FÁJLBAN ÁTÍRT gondolat nem jut be — a parancs KIMONDJA, hogy elutasította', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  const fajl = join(egyik, 'atvitel.jsonl');
  const hamis = join(egyik, 'hamis.jsonl');
  try {
    await fut(egyik, 'koino', 'Próba koinó');
    await fut(egyik, 'gondolat', 'KÖZÖS KÚT');
    await fut(egyik, 'kivisz', fajl);

    // ⚠️ Amit egy szövegszerkesztővel bárki megtehet, mielőtt továbbadja a pendrive-ot.
    const szoveg = await readFile(fajl, 'utf8');
    await writeFile(hamis, szoveg.replace('KÖZÖS KÚT', 'AZ ÉN KUTAM'), 'utf8');

    const be = await fut(masik, 'behoz', hamis);
    const kep = await fut(masik, 'allapot');

    // A kimenet megnevezi az elutasítást (D19), és a hamis cím sehol nem jelenik meg.
    return /ELUTASÍTVA/.test(be) && !/AZ ÉN KUTAM/.test(kep);
  } finally {
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

// ===================================
// ⭐ A BELÉPŐ TÉR KÉZI ÚTJA (5.6)
// ===================================

proba('⭐⭐ A BELÉPŐ TÉR KÉZZEL: két koino egy készüléken, mindkettő megjelenik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    // ⚠️ A második koino MÁS azonosítóval — ettől lesz két mappa egy készüléken.
    await new Promise((teljesul, elakad) => {
      execFile(process.execPath, [KOINO_JS, 'koino', 'Kozossegi kert'],
        { env: { ...process.env, KOINO_ADAT: hely, KOINO_AZONOSITO: 'kert', KOINO_NAPLO: '' },
          timeout: 30000 },
        (hiba, ki, hibaKi) => (hiba && !ki) ? elakad(new Error(hiba.message)) : teljesul(ki + hibaKi));
    });

    const ter = await fut(hely, 'ter');

    // ⛔ A HATÁR KIMONDVA (D19) — enélkül a lap némán teljességet ígérne.
    return /Falukozosseg/.test(ter) && /Kozossegi kert/.test(ter)
      && /2 koino/.test(ter) && /EZ A KÉSZÜLÉK ismer/.test(ter);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A tér HÁROM SZÁMOT mutat, nem egyet — a létszám súlya látszik', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    const ter = await fut(hely, 'ter');
    // ⛔ Sosem puszta „létszám: N" — a tag/belépő kettőse az, amitől a szám ér valamit.
    return /tag/.test(ter) && /belépő/.test(ter);
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A TÉR A FELÜLETEN (5.6) — és a KOINO-VÁLTÁS
// ===================================
//
// ⛔⛔ EZ A SZAKASZ 5.6 SZERKEZETI ÁLLÍTÁSA, ezért méri próba. A parancssor egy koinóra
// szól (a `KOINO_AZONOSITO` indításkor eldől), a felület viszont a koinók FÖLÖTT áll: a
// lap belép az egyikbe, majd egy másikba, **újraindítás nélkül**.
//
// ⚠️ Modul-próba ezt nem tudja megfogni: a végpontok a `koino.js` egy záródásában élnek,
// nem exportált függvényben. Ezért indul itt valódi kiszolgáló, és megy rá valódi kérés.

/** Elindít egy `felulet` kiszolgálót, és visszaadja a címét + a jelszavát. */
async function feluletet(hely, port) {
  const folyamat = spawn(process.execPath, [KOINO_JS, 'felulet', String(port)], {
    env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // A jelszót a kiírt címből olvassuk ki — ugyanúgy, ahogy egy ember tenné.
  let kimenet = '';
  const kulcs = await new Promise((teljesul, elakad) => {
    const ido = setTimeout(() => elakad(new Error('a felület nem indult el: ' + kimenet)), 15000);
    folyamat.stdout.on('data', (d) => {
      kimenet += d;
      const talalat = kimenet.match(/kulcs=([A-Za-z0-9_-]+)/);
      if (talalat) { clearTimeout(ido); teljesul(talalat[1]); }
    });
  });

  const hiv = async (utvonal, beallitas = {}) => {
    const valasz = await fetch('http://127.0.0.1:' + port + utvonal, {
      ...beallitas,
      headers: { 'Content-Type': 'application/json', 'X-Koino-Kulcs': kulcs, ...beallitas.headers }
    });
    return { allapot: valasz.status, adat: await valasz.json() };
  };

  return { folyamat, hiv };
}

proba('⭐⭐⭐ A FELÜLET KOINÓT VÁLT: a tér egy MÁSIK koino pakliját hozza', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    // Két koino egy készüléken, mindkettőben egy-egy gondolattal.
    await fut(hely, 'koino', 'Falukozosseg');
    await fut(hely, 'gondolat', 'KOZOS KUT');
    const masik = { ...process.env, KOINO_ADAT: hely, KOINO_AZONOSITO: 'kert', KOINO_NAPLO: '' };
    for (const ervek of [['koino', 'Kozossegi kert'], ['gondolat', 'PALANTA TERV']]) {
      await new Promise((teljesul, elakad) => {
        execFile(process.execPath, [KOINO_JS, ...ervek], { env: masik, timeout: 30000 },
          (hiba, ki, hibaKi) => (hiba && !ki) ? elakad(new Error(hiba.message)) : teljesul(ki + hibaKi));
      });
    }

    kiszolgalo = await feluletet(hely, 7481);
    const { hiv } = kiszolgalo;

    // ----- A TÉR LÁTJA MINDKETTŐT, és KIMONDJA a határát -----
    const ter = await hiv('/api/ter');
    if (ter.adat.koinok !== 2 || ter.adat.csakAmitIsmerunk !== true) return false;
    if (ter.adat.aktiv !== 'sajat') return false;

    // ----- AZ INDULÓ KOINO PAKLIJA -----
    const elso = await hiv('/api/pakli?darab=5');
    if (!elso.adat.kartyak.some((k) => k.cim === 'KOZOS KUT')) return false;

    // ----- ⭐ VÁLTÁS — és a pakli MÁSIK koinóé lesz -----
    const valt = await hiv('/api/ter/valt',
      { method: 'POST', body: JSON.stringify({ koino: 'kert' }) });
    if (valt.adat?.data?.aktiv !== 'kert') return false;

    const masodik = await hiv('/api/pakli?darab=5');
    // ⛔ EZ A LÉNYEG: más koino, más pakli — ugyanabban a folyamatban.
    return masodik.adat.kartyak.some((k) => k.cim === 'PALANTA TERV')
      && !masodik.adat.kartyak.some((k) => k.cim === 'KOZOS KUT');
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ NEM LÉTEZŐ koinóra nem lehet váltani — és az állapot nem mozdul', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Falukozosseg');
    await fut(hely, 'gondolat', 'KOZOS KUT');

    kiszolgalo = await feluletet(hely, 7482);
    const { hiv } = kiszolgalo;

    // ⛔ Az `esemenyTarNyitasa` LÉTREHOZNÁ a mappát — egy elgépelt név némán új, üres
    // koinót csinálna a téren. Ezért őr van előtte.
    const rossz = await hiv('/api/ter/valt',
      { method: 'POST', body: JSON.stringify({ koino: 'nincs-ilyen' }) });
    if (rossz.allapot !== 404) return false;

    // A tér továbbra is EGY koinót ismer, és a pakli a régi.
    const ter = await hiv('/api/ter');
    const pakli = await hiv('/api/pakli?darab=5');
    return ter.adat.koinok === 1 && ter.adat.aktiv === 'sajat'
      && pakli.adat.kartyak.some((k) => k.cim === 'KOZOS KUT');
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ GONDOLAT LÉTREHOZÁSA A LAPRÓL (5.7)
// ===================================
//
// ⛔ EDDIG EZ A LAPRÓL NEM MENT: a `GondolatModal` a szövegszerkesztőre várt, az pedig az
// 5.7-re. A parancssor tudta, a lap nem — *a 4. szabály fordítottja.*
//
// ⚠️ A szerkesztő BLOKKOK tömbjét adja, nem szöveget. Ez ugyanaz a mező, két alakban
// (a prototípusban is: `szoveg[].tartalom`), és a próba MINDKETTŐT méri — mert az első
// körben pont ez bukott meg: a parancssor `[object Object]`-et írt ki a lapról jött
// gondolatra.

proba('⭐⭐⭐ A LAP LÉTREHOZ EGY GONDOLATOT — BLOKKOS szöveggel, és a kéz is OLVASSA', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7483);
    const { hiv } = kiszolgalo;

    const valasz = await hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'A FALU KUTJA',
        // Pontosan az az alak, amit a `SzovegSzerkeszto.getTartalom()` ad.
        szoveg: [{ id: 'blokk-1', tipus: 'szoveg', tartalom: 'Közös ügy.' }],
        kezdoTudatpont: 40
      })
    });
    if (valasz.allapot !== 200 || !valasz.adat?.data?._id) return false;

    // ----- A LAPON LÁTSZIK -----
    const pakli = await hiv('/api/pakli?darab=5');
    const kartya = pakli.adat.kartyak.find((k) => k.cim === 'A FALU KUTJA');
    if (!kartya || kartya.osszesPont !== 40) return false;

    // ----- ⭐ ÉS A KÉZ IS OLVASSA (nem `[object Object]`) -----
    const kep = await fut(hely, 'allapot');
    return /A FALU KUTJA/.test(kep) && /Közös ügy\./.test(kep) && !/object Object/.test(kep);
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ⭐⭐⭐ CSABA HELYREIGAZÍTÁSA (2026-09-12) — és ez a próba őrzi.
//
// ⚠️ Elsőre azt hittem, a prototípusban a szerző KÖZVETLENÜL átírhatta a gondolatát, és
// ezért a `PATCH`-et őszinte 400-zal zártam le. ⛔ **Tévedés:** a prototípusban is
// javaslat → egyezmény mentén megy a szerkesztés — csak ha a szerző az EGYETLEN
// tudatpont-tulajdonos, akkor **100% támogatottság mellett azonnal megtörténik**.
//
// ⭐ A 100% viszont NEM jön magától: a prototípus a javaslat létrehozásakor
// **automatikusan lead egy támogató szavazatot** (`javaslatService.js:635`). A koino ezt
// nem tette — és emiatt a saját szerkesztésem **0 szavazattal, ELVETVE** zárult. *Ez a
// próba pontosan azt a kört méri, ami eddig az ellenkezőjét adta.*

proba('⭐⭐⭐ A SAJÁT SZERKESZTÉSEM AZONNAL HATÁLYBA LÉP — egyetlen tulajdonosként, 100%-kal',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      kiszolgalo = await feluletet(hely, 7484);
      const { hiv } = kiszolgalo;

      // ⚠️ NULLA döntési idővel, hogy tényleg AZONNAL dőljön el — a koino alapértéke 1 nap.
      const uj = await hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'EREDETI CÍM',
          javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
          aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
        })
      });
      const id = uj.adat.data._id;

      // ⭐ A szerkesztés JAVASLATOT ír — nem utasítjuk vissza, és nem is írjuk át közvetlenül.
      const patch = await hiv('/api/gondolat/' + id,
        { method: 'PATCH', body: JSON.stringify({ cim: 'ÁTÍRT CÍM' }) });
      if (patch.allapot !== 200 || patch.adat?.data?.javaslat !== true) return false;

      // ⛔⛔ ÉS A LÉNYEG: mivel egyedül vagyok tulajdonos, az egyezmény AZONNAL megszületik,
      // és a gondolat címe MÁR AZ ÚJ.
      const kep = await fut(hely, 'allapot');
      return /ÁTÍRT CÍM/.test(kep) && /ELFOGADVA/.test(kep);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐ A besorolás-lenyílók a koino NEVEIT adják (a `cim` → `nev` fordítás egy helyen van)',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      await fut(hely, 'gondolattipus', 'Kérdés', '❓');
      await fut(hely, 'kategoria', 'Környezet', '🌿');

      kiszolgalo = await feluletet(hely, 7485);
      const { hiv } = kiszolgalo;

      const tipusok = await hiv('/api/gondolatTipus');
      const kategoriak = await hiv('/api/kategoria');

      // ⚠️ A koinóban a név a `cim` mezőben van (5.4); az örökölt modal `nev`-et olvas.
      return tipusok.adat.gondolatTipusok.some((t) => t.nev === 'Kérdés' && t._id)
        && kategoriak.adat.kategoriak.some((k) => k.nev === 'Környezet' && k._id);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐⭐ SZERKESZTÉSI JAVASLAT A LAPRÓL (5.8)
// ===================================
//
// ⛔ EDDIG A LAPRÓL CSAK SZAVAZNI LEHETETT, javasolni nem — a gépezet teljes volt, a
// felület hiányzott. *Ugyanaz a fajta rés, mint az „Új gondolat".*
//
// ⚠️ ÉS EGY VALÓDI HIBÁT IS TALÁLT EZ A MUNKA: a végrehajtás a `szoveg`-et **csak
// szövegként** fogadta el, a szerkesztő viszont **blokk-tömböt** ad — a módosítás lefutott,
// a cím átíródott, a szöveg pedig **némán a régi maradt**. Ez a próba mindkettőt méri.

proba('⭐⭐⭐ MÓDOSÍTÁSI JAVASLAT A LAPRÓL: a cím ÉS a blokkos szöveg is hatályba lép',
  async () => {
    const hely = await ujKeszulek();
    let kiszolgalo = null;
    try {
      await fut(hely, 'koino', 'Próba koinó');
      kiszolgalo = await feluletet(hely, 7486);
      const { hiv } = kiszolgalo;

      // Nulla döntési idővel, hogy egytulajdonosként azonnal eldőljön.
      const uj = await hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'EREDETI CÍM',
          javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
          aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
        })
      });
      const id = uj.adat.data._id;

      const javaslat = await hiv('/api/javaslat', {
        method: 'POST',
        body: JSON.stringify({
          javaslatTipus: 'Modositas',
          erintettEntitasok: [{
            entitasId: id, entitasTipus: 'Gondolat', muvelet: 'Modositas',
            modositasAdatok: {
              cim: 'ÁTÍRT CÍM',
              // ⭐ Pontosan az az alak, amit a `SzovegSzerkeszto.getTartalom()` ad.
              szoveg: [{ id: 'b1', tipus: 'szoveg', tartalom: 'ÚJ BLOKKOS SZÖVEG' }]
            }
          }],
          indoklas: [{ id: 'i1', tipus: 'szoveg', tartalom: 'Pontosítás.' }],
          kezdoTudatpont: 30
        })
      });
      if (javaslat.allapot !== 200 || !javaslat.adat?.javaslat?._id) return false;

      const kep = await fut(hely, 'allapot');
      // ⛔ MINDKETTŐ kell: a cím ÉS a szöveg. A szöveg volt az, ami némán kiesett.
      return /ELFOGADVA/.test(kep) && /ÁTÍRT CÍM/.test(kep) && /ÚJ BLOKKOS SZÖVEG/.test(kep);
    } finally {
      if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐ ÁTHELYEZÉSI javaslat a lapról — és a gyökérre helyezés is (`null` szülő)', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7487);
    const { hiv } = kiszolgalo;

    const gyors = {
      javaslatElfogadasiKuszob: 51, reszveteliAranyKuszob: 0,
      aktualMinimumDontesiIdo: 0, aktualMaximumDontesiIdo: 0
    };
    const szulo = await hiv('/api/gondolat',
      { method: 'POST', body: JSON.stringify({ cim: 'A SZÜLŐ', ...gyors }) });
    const gyerek = await hiv('/api/gondolat',
      { method: 'POST', body: JSON.stringify({ cim: 'A GYEREK', ...gyors }) });

    const javaslat = await hiv('/api/javaslat', {
      method: 'POST',
      body: JSON.stringify({
        javaslatTipus: 'Athelyezes',
        erintettEntitasok: [{
          entitasId: gyerek.adat.data._id, entitasTipus: 'Gondolat', muvelet: 'Athelyezes',
          modositasAdatok: { ujSzuloId: szulo.adat.data._id }
        }],
        indoklas: [{ id: 'i1', tipus: 'szoveg', tartalom: 'Oda tartozik.' }]
      })
    });
    if (javaslat.allapot !== 200) return false;

    // ⭐ A hierarchikus rendezésben a gyerek a szülője alá kerül.
    const oldal = await hiv('/api/pakli?darab=10&rendezes=hierarchikus');
    const k = oldal.adat.kartyak.find((x) => x.cim === 'A GYEREK');
    return k?.szulo === szulo.adat.data._id;
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ A KERESÉS megtalálja az entitást — és a találat-szám FELÜLRŐL KORLÁTOS', async () => {
  const hely = await ujKeszulek();
  let kiszolgalo = null;
  try {
    await fut(hely, 'koino', 'Próba koinó');
    kiszolgalo = await feluletet(hely, 7488);
    const { hiv } = kiszolgalo;

    // ⚠️ Több entitás, mint a korlát — különben a próba VAK lenne (ugyanaz a tanulság,
    // mint a pakli `MAX_DARAB`-jánál: a korlátot csak fölötte lehet mérni).
    for (let i = 0; i < 25; i++) {
      await hiv('/api/gondolat',
        { method: 'POST', body: JSON.stringify({ cim: 'KERESHETŐ ' + i, kezdoTudatpont: 10 }) });
    }

    const talalt = await hiv('/api/kereses?q=' + encodeURIComponent('KERESHETŐ'));
    const semmi = await hiv('/api/kereses?q=' + encodeURIComponent('nincs-ilyen-sehol'));
    const ures = await hiv('/api/kereses?q=');

    return talalt.adat.talalatok.length === 20        // KERESES_KORLAT
      && talalt.adat.talalatok.every((t) => t.entitasId && t.entitasTipus && t.cim)
      && semmi.adat.talalatok.length === 0
      && ures.adat.talalatok.length === 0;
  } finally {
    if (kiszolgalo) { kiszolgalo.folyamat.kill(); await varj(500); }
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A FÁJL-KÉRELEM EGY VALÓDI BULIN (5.7 / a szállítás)
// ===================================
//
// ⛔⛔ EZ A PRÓBA EGY VALÓDI PROTOKOLL-HIBÁT FOGOTT MEG, amit modul-próba nem talált
// volna meg. Elsőre a fájl-kör feltétele a **saját** kérelem meglétéhez kötődött — a
// figyelő (akinek nincs kérelme) tehát **küldött, de nem olvasott**, és az üzenet bent
// maradt a sorban. ⚠️ A hiba NEM a fájl-rétegnél jelentkezett, hanem később:
// *„Várt üzenet: CIMEK, érkezett: FAJLOK"*.
//
// ⭐ **Egy protokoll-lépés feltétele csak olyan dolog lehet, amit MINDKÉT fél ugyanúgy
// lát** — itt a két képesség-jelzés együtt.
//
// ⚠️ ÉS EGY TULAJDONSÁG, AMI A MÉRÉSBŐL DERÜLT KI: a fájl-felderítés **egy bulival
// később** jár, mint az esemény-csere — hiszen nem lehet olyan fájlról kérdezni, amiről
// még nem tudom, hogy létezik. *Ez nem hiba, hanem a sorrend következménye.*

proba('⭐⭐⭐ A BULIN KIDERÜL, KINÉL VAN MEG a hiányzó fájl', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7521;
  let figyelo = null;
  let felulet = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');

    // ----- A gazda feltölt egy képet, és készít hozzá egy gondolatot -----
    felulet = await feluletet(gazda, 7522);
    const png = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
      + '0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex');
    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: png.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'KÉPES GONDOLAT', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    // ----- A vendég kétszer cserél -----
    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⚠️ AZ ELSŐ KÖRBEN a vendég még nem tud a képről (az események most érkeznek).
    const elso = await fut(vendeg, 'csere', '127.0.0.1', String(port));
    if (!/kaptam \d+ új eseményt/.test(elso)) return false;

    // ⭐ A MÁSODIK KÖRBEN már kérdez — és megtudja, hogy a gazdánál megvan.
    //
    // ⚠️ EZ A PRÓBA A FELDERÍTÉST méri, nem az átvitelt: azt, hogy a **bulin kiderül**,
    // kinél van meg. *(Korábban azt is állította, hogy a fájl hiányzó MARAD — és amikor az
    // átvitel megépült, ez helyesen bukott. A próba a tárgyához igazodott, nem fordítva.)*
    const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));
    return /fájlról tudom meg, hogy nála megvan/.test(masodik);
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

proba('⛔ A fájl-kör NEM akasztja meg a rendes cserét (a két réteg külön él — D3)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7523;
  let figyelo = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');
    await fut(gazda, 'gondolat', 'KÉP NÉLKÜLI GONDOLAT');

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⚠️ Fájl SEHOL nincs — a csere-körnek ettől ugyanúgy végig kell mennie, és a
    // MÁSODIK körnek is (ahol a fájl-kérdés elhangzana, ha lenne mit kérdezni).
    await fut(vendeg, 'csere', '127.0.0.1', String(port));
    const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));

    const kep = await fut(vendeg, 'allapot');
    return /Csere kész/.test(masodik) && /KÉP NÉLKÜLI GONDOLAT/.test(kep);
  } finally {
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A BÁJTOK MEGÉRKEZNEK (5.7 / B) — a teljes kör két készüléken
// ===================================
//
// ⭐ EZ A SZÁLLÍTÁS VÉGE: felderítés a bulin → kérelem → a bájtok. A fájl **több
// szeletben** jön (64 KB-onként), és a lezárás **újra lenyomatol** — csak akkor kerül a
// végleges nevére, ha a bájtok azt adják ki.
//
// ⚠️ EGY MÉRÉSI CSAPDA, AMI ENGEM IS BECSAPOTT: a birtoklás-jegyzet a társat
// `hoszt:port` alakban jegyzi meg. Ha a próba minden körben MÁS porton indítja a
// figyelőt, a jegyzet a **régi** portot őrzi, és az átvitel egy halott címre megy.
// *Ezért fut ez a próba végig EGYETLEN porton.*

proba('⭐⭐⭐ A KÉP MEGÉRKEZIK A MÁSIK KÉSZÜLÉKRE — több szeletben, bájtra azonosan',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7541;
    let figyelo = null;
    let felulet = null;
    try {
      await fut(gazda, 'koino', 'Próba koinó');

      // ----- Egy TÖBB SZELETNYI kép (150 KB ≈ 3 szelet) -----
      felulet = await feluletet(gazda, 7542);
      const fej = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
      const kep = Buffer.concat([fej, Buffer.alloc(150 * 1024, 7),
        Buffer.from('0000000049454e44ae426082', 'hex')]);

      const fel = await felulet.hiv('/api/feltoltes/kep',
        { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
      await felulet.hiv('/api/gondolat', {
        method: 'POST',
        body: JSON.stringify({
          cim: 'NAGY KÉPES GONDOLAT', kezdoTudatpont: 50,
          szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
        })
      });
      felulet.folyamat.kill(); felulet = null; await varj(500);

      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);

      // 1. kör: az események · 2. kör: a kérdés, majd A BÁJTOK — ugyanazon a résen (D69/2:
      // a fájl a randevún jön, nem egy kör utáni TCP-hívással).
      // ⭐ D72 (2026-09-26): a gondolat SZÖVEGE is külön darab — a 2. körben előbb a szöveg jön,
      // és ⭐ UGYANABBAN A RANDEVÚBAN a benne hivatkozott kép is (`ujKerhetok`): tehát 2 fájl.
      // *Ha a kép egy körrel később jönne, itt 1 állna — a próba épp ezt a késést fogja meg.*
      await fut(vendeg, 'csere', '127.0.0.1', String(port));
      const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));
      if (!/fájlok a résen: 2 megjött/.test(masodik)) {
        throw new Error('a 2. csere nem hozta a szöveget ÉS a képet: '
          + masodik.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(-400));
      }

      // ⭐ ÉS A LÉNYEG: a vendégnél megvan, és BÁJTRA ugyanaz.
      const fajlok = await fut(vendeg, 'fajlok');
      const nala = await readFile(
        join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat));

      return /2 \/ 2 megvan/.test(fajlok)
        && Buffer.from(nala).equals(kep);
    } finally {
      if (felulet) felulet.folyamat.kill();
      if (figyelo) { figyelo.kill(); await varj(1000); }
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ …ÉS AZ ŐRJÁRAT IS ELHOZZA — KÉZ NÉLKÜL (2026-09-14)
// ===================================
//
// ⛔ EZ A PRÓBA EGY VALÓDI HIÁNY MIATT SZÜLETETT, amit egy átnézés talált: a fenti próba
// **kézzel gépelt `csere` parancsot** használ — és mérve, az őrjárat (a CLAUDE.md szerint
// „a valódi üzemmód") a `csereVonalon` **hetedik paraméterét nem adta át**, a kör után
// pedig nem hozta el a bájtokat. *Vagyis a fájl-szállítás teljes lánca csak akkor futott,
// ha valaki odaült a géphez.*
//
// ⚠️ ÉS A LÉNYEG: EZT EGYETLEN MEGLÉVŐ PRÓBA SEM VETTE ÉSZRE — a fenti kép-próba is zöld
// volt végig, mert kézzel cserélt. *Amit csak kézi paranccsal mérünk, arról nem tudjuk,
// hogy magától is megtörténik-e.*
//
// ⚠️ KÉT KÖR KELL: a fájl-felderítés **egy bulival később jár**, mint az esemény-csere —
// nem lehet olyan fájlról kérdezni, amiről még nem tudom, hogy létezik. Ezért fut az
// őrjárat rövid (3 mp-es) körökkel, és ezért várunk többet egy körnél.

proba('⭐⭐⭐ AZ ŐRJÁRAT MAGÁTÓL ELHOZZA A KÉPET — kézi parancs nélkül', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7546;
  let figyelo = null, felulet = null, orjarat = null;
  try {
    await fut(gazda, 'koino', 'Próba koinó');

    // Egy egyszeletnyi kép — a több szeletet a fenti próba méri.
    felulet = await feluletet(gazda, 7547);
    const fej = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
    const kep = Buffer.concat([fej, Buffer.alloc(20 * 1024, 11),
      Buffer.from('0000000049454e44ae426082', 'hex')]);

    const fel = await felulet.hiv('/api/feltoltes/kep',
      { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
    await felulet.hiv('/api/gondolat', {
      method: 'POST',
      body: JSON.stringify({
        cim: 'ŐRJÁRATOS KÉPES GONDOLAT', kezdoTudatpont: 50,
        szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }]
      })
    });
    felulet.folyamat.kill(); felulet = null; await varj(500);

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // A vendég egyetlen kézi tette: felveszi a társat. ⭐ Innentől kéz nem érinti.
    await fut(vendeg, 'tars', '127.0.0.1', String(port));

    let kimenet = '';
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7548'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    orjarat.stdout.on('data', (d) => { kimenet += d; });
    orjarat.stderr.on('data', (d) => { kimenet += d; });

    await varj(14000);                       // ~4 kör: az elsőn az események, utána a fájl
    orjarat.kill(); orjarat = null;
    await varj(1000);

    // ⚠️ HA BUKIK, MEGNEVEZI MAGÁT (D19): az őrjárat naplója mondja meg, a rés nem nyílt-e
    // meg, vagy megnyílt, de a fájl nem jött át.
    // ⭐ D72: a szöveg-darab és a kép UGYANABBAN a randevúban jön — 2 fájl.
    if (!/fájlok a résen: 2 megjött/.test(kimenet)) {
      throw new Error('a szöveg és a kép nem jött meg együtt — az őrjárat naplója: '
        + kimenet.replace(/\s+/g, ' ').trim().slice(-900));
    }

    // ⭐ ÉS A LÉNYEG: a vendégnél megvan, BÁJTRA ugyanaz — magától.
    const nala = await readFile(join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat));
    return Buffer.from(nala).equals(kep);
  } finally {
    if (felulet) felulet.folyamat.kill();
    if (orjarat) orjarat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⚠️ ITT ÁLLT 2026-09-26-IG „A TÜRELEM ELJUT A VONALIG” (D68): hat forrás a birtoklás-jegyzetben,
// és a kör UTÁNI TCP-s elhozás 5 mp alatt feladta. ⛔ A D69/2 óta nincs TCP a készülékek
// között, és a több forrásból egy fájl az éles úton nem fut (Csaba vállalta az árát) — a
// próba tárgya megszűnt. A türelem-számítást a `fajlAtvitelProba.js` továbbra is méri.

// ===================================
// ⛔⛔ A KULCS KÉZI ÚTJA — ODA ÉS VISSZA (2026-09-15)
// ===================================
//
// Egy átnézés talált egy 4. szabály-hiányt, ugyanabból a fajtából, mint 2026-09-10-én: a
// `kulcsparVisszatoltese` MEGÉPÜLT és működött, de **egyetlen hívója sem volt** — se éles
// út, se próba. A program az első indításkor azt mondta: *„Mentsd el"* — és a mentett
// fájlt nem lehetett visszahozni vele.
//
// ⛔ És a mérés rosszabbat mutatott a puszta hiánynál: a `kulcsparBiztositasa` MINDEN
// parancs előtt lefut, tehát aki a mentett kulcsával próbálkozott, előbb kapott egy
// vadonatúj azonosságot — és ezt olvasta: *„Új kulcs készült — ez mostantól a
// személyazonosságod."* Igaz mondat a lehető legrosszabb pillanatban.

proba('⭐⭐⭐ A MENTETT KULCS VISSZAHOZHATÓ — és közben NEM születik új azonosság', async () => {
  const regi = await ujKeszulek();
  const uj = await ujKeszulek();
  const mentesFajl = join(regi, 'kulcsom.json');

  try {
    // 1. Az „elveszett" készülék azonossága, és a mentés.
    const eredeti = teljesAzonosito(await fut(regi, 'kulcs'));
    await fut(regi, 'mentes', mentesFajl);

    // 2. Az ÚJ készülék — mint egy frissen vett telefon.
    const vissza = await fut(uj, 'visszatolt', mentesFajl);

    // ⛔ EZ A SOR BUKTATJA A KORAI ÁG KIVÉTELÉT: ha a visszatöltés a kulcs-biztosítás
    // UTÁN futna, itt ott állna az „Új kulcs készült" — és a mentés hiába jött volna.
    if (vissza.includes('Új kulcs készült')) return false;
    if (!vissza.includes('visszatöltve')) return false;

    // 3. ⭐ A BIZONYÍTÉK: a készülék MOSTANTÓL ugyanaz az e-ember.
    const mostani = teljesAzonosito(await fut(uj, 'kulcs'));
    return eredeti !== null && mostani === eredeti;
  } finally {
    await rm(regi, { recursive: true, force: true });
    await rm(uj, { recursive: true, force: true });
  }
});

proba('⛔ MEGLÉVŐ azonosságot csak KIMONDOTT engedéllyel ír felül — és megmondja, mit dob el',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const mentesFajl = join(egyik, 'kulcsom.json');

    try {
      const hozott = teljesAzonosito(await fut(egyik, 'kulcs'));
      await fut(egyik, 'mentes', mentesFajl);

      // A másik készüléknek MÁR VAN azonossága — ez a veszélyes eset.
      const sajat = teljesAzonosito(await fut(masik, 'kulcs'));

      // a) Engedély nélkül: megtagadja, és a régi marad.
      const tiltas = await fut(masik, 'visszatolt', mentesFajl);
      if (!tiltas.includes('MÁR VAN kulcs')) return false;
      if (teljesAzonosito(await fut(masik, 'kulcs')) !== sajat) return false;

      // b) Kimondott engedéllyel: megtörténik, ÉS kimondja, mi veszett el (D19).
      const csere = await fut(masik, 'visszatolt', mentesFajl, 'felulir');
      if (!csere.includes('ELVESZETT')) return false;

      return teljesAzonosito(await fut(masik, 'kulcs')) === hozott && hozott !== sajat;
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⏸️ TÖBB FORRÁSBÓL EGY FÁJL (D68 / 6.) — 2026-09-26 óta NEM fut élesben (D69/2)
// ===================================

// ⚠️ ITT ÁLLT 2026-09-26-IG KÉT PRÓBA A TÖBB FORRÁSRÓL (D68 / 6.): „KÉT FORRÁSBÓL JÖN EGY KÉP”
// és „HAMIS BÁJT UTÁN MÁS FORRÁSSAL PRÓBÁLJUK”. ⛔ Mindkettő a kör utáni TCP-s elhozást
// mérte, ami a D69/2-vel kikerült. A tervező függvények (munkamegosztás, rossz szelet
// feljegyzése és felejtése) a `fajlAtvitelProba.js`-ben próbával maradtak — a UDP-s több
// forrás ezekre épül majd, és akkor ide is visszakerül a viselkedés próbája.

// ===================================
// ⭐⭐⭐ A BULI: AZ ÖSSZEHANGOLT ABLAK ÉS AZ ISMÉTELT MENET (30. mérés, 2026-09-15)
// ===================================

proba('⭐⭐ AZ ŐRJÁRAT A FAL ÓRÁJÁHOZ IGAZODIK — nem az indítás pillanatához', async () => {
  // ⛔ MIT MÉR: a `setTimeout(perc * 60 * 1000)` korábban a kör UTÁN indult, tehát az
  // ébredés fázisát az szabta meg, ki mikor kapcsolta be a készülékét. ⭐ Két készülék így
  // csak véletlenül találkozott — a 30. mérés szerint ritka gráfon a futások 97%-ában SOHA.
  //
  // ⭐⭐ ÉS EZ VISELKEDÉS, NEM FELIRAT: 6 másodperces ütemnél az igazított körök az epoch
  // szerinti 6 mp-es rácson kezdődnek, tehát a kiírt másodperc **osztható hattal**.
  // *Igazítás nélkül a fázist az indítás adná — egyenletesen szórna a hat érték között.*
  const hely = await ujKeszulek();
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Buli koinó');

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7591'], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' }
    });

    let kimenet = '';
    orjarat.stdout.on('data', (d) => { kimenet += d; });

    // ⚠️ Az indítást SZÁNDÉKOSAN nem igazítjuk: a próba épp azt méri, hogy a program
    // igazít, akkor is, ha a rács közepén indult.
    await varj(26000);

    // A kör-sorok időbélyege: „· HH:MM:SS nincs kire kopognom…" (nincs cél, ez elég).
    const masodpercek = [...kimenet.matchAll(/(\d{1,2}):(\d{2}):(\d{2})/g)]
      .map((m) => parseInt(m[3], 10));

    // Az ELSŐ kör az indításkor fut (még nem igazítva) — azt kihagyjuk.
    const kesobbiek = masodpercek.slice(1);
    if (kesobbiek.length < 2) return false;

    // ⭐ A DÖNTŐ ÁLLÍTÁS: a későbbi körök a 6 mp-es rácson vannak.
    // ⚠️ Egy másodperc türelemmel, mert a kiírás a kör VÉGÉN történik.
    const raconVan = kesobbiek.filter((mp) => mp % 6 <= 1).length;
    return raconVan === kesobbiek.length;
  } finally {
    if (orjarat) orjarat.kill();
    await varj(500);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐⭐⭐ A KÖR ISMÉTLŐDIK, AMÍG VAN ÚJDONSÁG — a hír EGY ablakon belül tovább ér',
  async () => {
    // ⛔ MIT MÉR: egy menet alatt a hír egy lépést tesz a láncban. ⭐ A társ-listán a
    // SORREND dönt: ha a hír forrása a lista VÉGÉN van, egy menetnél a lista elején álló
    // társ **csak a következő ablakban** tudná meg. Ismételt menetnél ugyanabban.
    //
    // ⭐⭐ A forgatókönyv: az őrjárat listáján előbb a NÉMA (aki majd megkapja), utána a
    // FORRÁS. Egy menet: néma (semmi) → forrás (megkapjuk). Két menet: néma (ÁTADJUK!).
    const orjaratHely = await ujKeszulek();
    const forrasHely = await ujKeszulek();
    const celHely = await ujKeszulek();
    let forras = null, cel = null, orjarat = null;

    try {
      // Közös koino: az eseményeket hálózat nélkül visszük át (4. szabály).
      await fut(forrasHely, 'koino', 'Ismételt menet');
      const vitt = join(forrasHely, 'alap.jsonl');
      await fut(forrasHely, 'kivisz', vitt, 'mind');
      await fut(orjaratHely, 'behoz', vitt);
      await fut(celHely, 'behoz', vitt);

      // ⭐ AZ ÚJDONSÁG: csak a forrásnál van meg.
      await fut(forrasHely, 'gondolat', 'AZ ISMÉTELT MENET HÍRE');

      forras = spawn(process.execPath, [KOINO_JS, 'figyel', '7593'], {
        env: { ...process.env, KOINO_ADAT: forrasHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      cel = spawn(process.execPath, [KOINO_JS, 'figyel', '7594'], {
        env: { ...process.env, KOINO_ADAT: celHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(1500);

      // ⛔ A SORREND A LÉNYEG: előbb a CÉL (neki nincs mit adnia), utána a FORRÁS.
      await fut(orjaratHely, 'tars', '127.0.0.1', '7594');
      await fut(orjaratHely, 'tars', '127.0.0.1', '7593');

      // ⛔⛔ EZ A VÁRAKOZÁS EGY VAK PRÓBÁT JAVÍT KI (2026-09-15). Az első változat rögtön
      // indította az őrjáratot, és a rontás-próba **nem buktatta** — mert az őrjárat azóta
      // a **percfordulóhoz igazít**, tehát a második ablak akár 2 másodperc múlva is
      // jöhetett. ⚠️ Két kör futott a 12 másodpercben, és a hír a MÁSODIK körben jutott át:
      // *a próba az igazítást mérte, nem az ismétlést.*
      //
      // ⭐ A javítás: a percforduló UTÁN indítunk, tehát a következő ablak ~60 mp-re van —
      // a próba idejébe biztosan EGY kör fér. *Amit mérni akarunk, azt egyedül kell hagyni.*
      const percHatra = 60000 - (Date.now() % 60000);
      await varj(percHatra + 500);

      // ⚠️ EGY PERCES ütem: ha csak egy menet futna, a cél a következő körig — vagyis a
      // próba ideje alatt SOHA — nem tudná meg. *Ez teszi a mérést élessé.*
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '1', '7592'], {
        env: { ...process.env, KOINO_ADAT: orjaratHely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(12000);
      orjarat.kill(); orjarat = null;
      await varj(500);

      // ⭐ A BIZONYÍTÉK: a CÉL készülék állapotában ott a hír — egyetlen ablakból.
      const allapot = await fut(celHely, 'allapot');
      return /AZ ISMÉTELT MENET HÍRE/.test(allapot);
    } finally {
      if (orjarat) orjarat.kill();
      if (forras) forras.kill();
      if (cel) cel.kill();
      await varj(800);
      for (const m of [orjaratHely, forrasHely, celHely]) {
        await rm(m, { recursive: true, force: true });
      }
    }
  });

// ===================================
// ⛔⛔ A FUTÓ KAPU LÁTJA, AMIT KÖZBEN MÁSIK FOLYAMAT ÍRT (2026-09-26, 43. mérés)
// ===================================
//
// Terepen mérve: a laptopon futott az őrjárat, a második ablakban született egy gondolat — és
// az őrjárat négy körön át „küldtem 0"-t mondott, csak újraindítás után adta tovább. A tár
// mutatója megnyitáskor épült, és csak a SAJÁT hozzáfűzéseit látta. ⚠️ Egyetlen próba sem
// futtatott addig két folyamatot ugyanazon a táron — a `csereKor` épp le is állítja a
// figyelőt, mielőtt a másik parancs olvasna.
//
// ⭐ A mérés alakja a terepé: a gazda postaládája MÁR FUT, amikor egy MÁSIK folyamat gondolatot
// ír a tárába; a vendég utána cserél, és a gondolatnak a VENDÉG lemezén kell lennie.
// ⚠️ Rontás-próba: a `frissit()` nélkül bukik (kipróbálva).

proba('⛔⛔ A FUTÓ POSTALÁDA TOVÁBBADJA, AMIT KÖZBEN MÁSIK FOLYAMAT ÍRT A TÁRÁBA', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7971;
  let figyelo = null;
  try {
    await fut(gazda, 'koino', 'Masik folyamat proba');
    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);

    // ⭐ A postaláda már fut — a gondolat egy MÁSIK folyamatban születik.
    await fut(gazda, 'gondolat', 'KOZBEN IRTAM MASIK ABLAKBAN');
    await fut(vendeg, 'csere', '127.0.0.1', String(port));

    const kep = await fut(vendeg, 'allapot');
    return kep.includes('KOZBEN IRTAM MASIK ABLAKBAN');
  } finally {
    if (figyelo) figyelo.kill();
    await varj(1000);
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⛔⛔ AZ ÍRÓ A FOLYAMATOK KÖZÖTT (D70, 2026-09-26): a postaláda fut, és ő az író — öt kézi parancs
// EGYSZERRE ír, és mind az öt csak ÁTADÁSSAL juthat a tárba (a csatornát a postaláda tartja, a
// parancsok nem lehetnek írók). ⭐ A lemezen kell látszania: mind az öt gondolat megvan, és a
// saját láncban egyetlen elágazás sincs. ⚠️ Rontás-próba: ha az író nem ment (a csatornán mindent
// visszautasít), a parancsok elbuknak, és a próba is (kipróbálva). *A verseny DETERMINISZTIKUS
// mérése az `iroProba.js`-ben van; ez a bekötést méri: a valódi folyamatok tényleg átadnak.*
proba('⛔⛔ A FUTÓ POSTALÁDA AZ ÍRÓ — öt egyszerre futó kézi parancs átad, elágazás nélkül (D70)',
  async () => {
    const hely = await ujKeszulek();
    const port = 7972;
    let figyelo = null;
    try {
      await fut(hely, 'koino', 'Iro proba');
      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);

      const kimenetek = await Promise.all([1, 2, 3, 4, 5].map((i) =>
        fut(hely, 'gondolat', 'EGYSZERRE ' + i)));

      const sorok = (await readFile(join(hely, 'sajat', 'esemenyek.jsonl'), 'utf8'))
        .split('\n').filter((s) => s.trim()).map((s) => JSON.parse(s));
      const cimek = new Set(sorok.filter((e) => e.tipus === 'GondolatLetrehozas')
        .map((e) => e.adat?.cim));
      const pontok = new Map();
      for (const e of sorok) pontok.set(e.szerzo + '|' + e.sorszam, (pontok.get(e.szerzo + '|' + e.sorszam) ?? 0) + 1);

      return kimenetek.every((k) => k.includes('Létrejött:'))
        && [1, 2, 3, 4, 5].every((i) => cimek.has('EGYSZERRE ' + i))
        && [...pontok.values()].every((n) => n === 1);            // ⛔ egyetlen elágazás sem
    } finally {
      if (figyelo) figyelo.kill();
      await varj(1000);
      await rm(hely, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ A FRISS UDP-CÍM BEKÖTÉSE — VISELKEDÉST MÉRÜNK (2026-09-18)
// ===================================
//
// ⛔⛔ MIÉRT KELLETT EZ A PRÓBA, ÉS HOGYAN DERÜLT KI? Egy kód-átnézés (másik session,
// 2026-09-18) kivágta MIND A NÉGY éles bekötési pontot — az őrjárat cseréjét, a postaláda
// hirdetését, a kézi cserét és a saját cím feljegyzését —, és **mind a négyszer 624/624
// maradt zöld**. Megismételve: a rontás után is zöld. ⭐ *A `tarsak.js` függvényeit őrizte
// próba; azt, hogy a PROGRAM használja őket, semmi.*
//
// ⚠️ Ugyanaz az alak, amit a napló nyolcszor felsorol — és pontosan az, amit a 28. mérés
// tanulsága kimond: **a próba viselkedést mérjen, ne kiírt számot.**
//
// A mérés alakja: két készülék, két folyamat, valódi `figyel` + `csere`. Az egyikbe
// **kézzel** beírunk egy friss UDP-címet (ez a 4. szabály kézi útja — a jegyzék sima JSON),
// a másiknak pedig ott kell lennie a cserénél. *Nem kiírás, hanem a másik gép lemeze.*

proba('⭐⭐ A FRISS UDP-CÍM ÁTKERÜL A MÁSIK KÉSZÜLÉKRE (a bekötés próbája)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7451;

  await fut(gazda, 'koino', 'Cim proba');

  // A gazda jegyzékébe kézzel írunk egy FRISS címet — mintha az imént fúrt volna.
  await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
    cimek: [{ hoszt: '203.0.113.77', port: 41777, mikor: Date.now() }]
  }), 'utf8');

  await csereKor(gazda, vendeg, port);

  // ⭐ A BIZONYÍTÉK A VENDÉG LEMEZÉN VAN: a cím átkerült-e a saját jegyzékébe?
  let jegyzek = [];
  try {
    jegyzek = JSON.parse(await readFile(join(vendeg, 'udpcimek.json'), 'utf8')).cimek ?? [];
  } catch { return false; }

  return jegyzek.some((c) => c.hoszt === '203.0.113.77' && c.port === 41777
    // ⚠️ És a KORÁT a saját óránkhoz kötötte: a bejegyzés ideje a MI időnk, nem az övé.
    && Number.isInteger(c.mikor) && Math.abs(Date.now() - c.mikor) < 60000);
});

// ⚠️ ÉS AZ ELÉVÜLT CÍM NEM TERJED. *Enélkül a jegyzék halott címeket hordana szét, és a
// következő buli azokra kopogna — ez a 31. mérés leletének gyakorlati fele.*
proba('⛔ Az ELÉVÜLT cím NEM kerül át (a jegyzék nem terjeszt halott címet)', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7452;

  await fut(gazda, 'koino', 'Cim proba 2');

  // Két cím: az egyik friss, a másik RÉG elévült (két órája).
  await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
    cimek: [
      { hoszt: '203.0.113.88', port: 41888, mikor: Date.now() },
      { hoszt: '203.0.113.99', port: 41999, mikor: Date.now() - 2 * 3600 * 1000 }
    ]
  }), 'utf8');

  await csereKor(gazda, vendeg, port);

  let jegyzek = [];
  try {
    jegyzek = JSON.parse(await readFile(join(vendeg, 'udpcimek.json'), 'utf8')).cimek ?? [];
  } catch { return false; }

  return jegyzek.some((c) => c.hoszt === '203.0.113.88')
    && !jegyzek.some((c) => c.hoszt === '203.0.113.99');
});

// ===================================
// ⭐⭐⭐ AZ ŐRJÁRAT UDP-ÁGA (2026-09-20) — A KOPOGÁSSAL TALÁLKOZÁS
// ===================================
//
// ⛔⛔ MIT MÉR, ÉS MIÉRT EZ A LEGFONTOSABB PRÓBA ITT: a 36/d. terepmérés szerint **idegent
// a mobil NAT nem enged be** — rést csak a KÖLCSÖNÖS kopogás nyit. Vagyis egy csak-mobilos
// közösségben a kapu nyitva tartása (postaláda) senkinek nem elég.
//
// ⭐ A próba ezért SZÁNDÉKOSAN NEM AD TÁRS-LISTÁT egyik készüléknek sem: a társ-listás
// (TCP) út el sem indulhat. Az egyetlen út a friss UDP-cím + a kopogás.
// ⭐⭐ És VISELKEDÉST mér, nem feliratot: a hírnek a MÁSIK KÉSZÜLÉK ÁLLAPOTÁBAN kell
// megjelennie.

proba('⭐⭐⭐ AZ ŐRJÁRAT KOPOGÁSSAL TALÁL ÖSSZE — társ-lista NÉLKÜL, friss UDP-címből',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7461, B = 7462;
    let egyikOr = null, masikOr = null;

    try {
      // Közös koino, hálózat nélkül (4. szabály).
      await fut(egyik, 'koino', 'Kopogos buli');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);

      // ⭐ AZ ÚJDONSÁG CSAK AZ EGYIKNÉL VAN.
      await fut(egyik, 'gondolat', 'A KOPOGÁSSAL ÉRKEZETT HÍR');

      // ⭐ EGYMÁS FRISS UDP-CÍME — és SEMMI MÁS. Nincs `tars`, nincs társ-lista.
      const jegyzek = (hova, mihez) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt: '127.0.0.1', port: mihez, mikor: Date.now() }] }),
        'utf8');
      await jegyzek(egyik, B);
      await jegyzek(masik, A);

      // ⚠️ EGYSZERRE indítjuk — mert épp ez a lényeg: a rés a KÖLCSÖNÖS kopogásra nyílik.
      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });

      await varj(20000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      // ⭐ A BIZONYÍTÉK A MÁSIK KÉSZÜLÉK LEMEZÉN: megvan-e a hír, kézi parancs nélkül?
      const allapot = await fut(masik, 'allapot');
      return /A KOPOGÁSSAL ÉRKEZETT HÍR/.test(allapot);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ AZ EGYOLDALÚ RÉS (2026-09-25 — a 40. mérés hibája, itthon reprodukálva)
// ===================================
//
// ⛔ A TEREPI HELYZET: az egyik telefon ismerte a másik címét és kopogott rá; a másik a
// bekopogóval csak TCP-n találkozott, ezért a kötésében az első címe PORT NÉLKÜL állt, és
// arra sosem kopogott vissza. A rés megnyílt (a másik visszaszólt), de nála csere nem
// indult — az első fél cseréje 10 mp múlva elbukott, és a napló ezt elhallgatta.
// ⚠️ A régi próba (fent) ezt nem látta: ott MINDKÉT fél ismerte a másikat.
//
// ⚠️ A „MÁSIK" célja itt SZÁNDÉKOSAN nem a hurok-cím: a fúró az azonos CÍMRŐL, más portról
// érkező kopogót a már ismert célnak veszi (a mobil portváltása miatt) — ha minden cím
// 127.0.0.1 volna, a hiba el sem jönne elő. Ezért egy nem routolható cím (10.255.255.9),
// és egy néma helyi tükör, hogy a mérés ne a valódi hálózatot hívja.

proba('⛔⛔⛔ AZ EGYOLDALÚ RÉS IS CSERÉT HOZ — aki bekopog, azzal a másik is cserél',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7621, B = 7622;
    const tukor = await nemaFoglalat();
    let egyikOr = null, masikOr = null;

    try {
      await fut(egyik, 'koino', 'Egyoldalu res');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);
      await fut(egyik, 'gondolat', 'AZ EGYOLDALU RESEN ATJOTT HIR');

      // ⭐ CSAK AZ EGYIK ISMERI A MÁSIKAT. A másiknak egy MÁS című (halott) célja van,
      // hogy a kopogási ablaka egyáltalán megnyíljon — mint a 40. mérésen.
      const jegyzek = (hova, hoszt, port) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt, port, mikor: Date.now() }] }), 'utf8');
      await jegyzek(egyik, '127.0.0.1', B);
      await jegyzek(masik, '10.255.255.9', 7373);

      const kornyezet = { ...process.env, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs',
        KOINO_TUKOR: '127.0.0.1:' + tukor.address().port };
      let masikKimenet = '';
      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...kornyezet, KOINO_ADAT: egyik }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...kornyezet, KOINO_ADAT: masik }, stdio: ['ignore', 'pipe', 'pipe']
      });
      masikOr.stdout.on('data', (d) => { masikKimenet += d; });

      await varj(26000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      const allapot = await fut(masik, 'allapot');
      let kotesek = [];
      try { kotesek = JSON.parse(await readFile(join(masik, 'kotesek.json'), 'utf8')).kotesek; } catch { /* nincs */ }

      return /AZ EGYOLDALU RESEN ATJOTT HIR/.test(allapot)
        // ⭐ …és a napló MEGNEVEZI, hogy ismeretlen kopogott be (terepen ebből látszik, honnan indult)
        && /ismeretlen kopogott be \(127\.0\.0\.1:7621\)/.test(masikKimenet)
        // ⭐ …és a kötés mostantól PORTOT is tud: a következő körtől magától kopog vissza.
        && kotesek.some((k) => k.port === A);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      tukor.close();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ A 42. MÉRÉS HÁROM JAVÍTÁSA (2026-09-25)
// ===================================

/** Egy STUN-válasz (XOR-MAPPED-ADDRESS, IPv4) — a hamis tükörnek. */
function stunValasz(cim, port) {
  const suti = [0x21, 0x12, 0xA4, 0x42];
  const ertek = Buffer.alloc(8);
  ertek[1] = 0x01;
  ertek.writeUInt16BE(port ^ 0x2112, 2);
  cim.split('.').map(Number).forEach((b, i) => { ertek[4 + i] = b ^ suti[i]; });
  const fej = Buffer.alloc(20);
  fej.writeUInt16BE(0x0101, 0);
  fej.writeUInt16BE(4 + ertek.length, 2);
  fej.writeUInt32BE(0x2112A442, 4);
  const attr = Buffer.alloc(4);
  attr.writeUInt16BE(0x0020, 0);
  attr.writeUInt16BE(ertek.length, 2);
  return Buffer.concat([fej, attr, ertek]);
}

proba('⛔⛔ A 0 TÁROLÓS KIÍRÁS NEM „KIÍRT" — a következő kör újra próbálja, és kimondja',
  async () => {
    // ⛔ A TEREPI HELYZET (42. mérés): a telefon új címét 0 tároló vette át, a program ezt
    // kiírtnak vette, és 2 és fél órán át nem próbálta újra — a társ a RÉGI címét olvasta.
    // ⭐ Itt a tükör hamis, de VALÓDI STUN-választ ad (tehát megvan a saját külső cím), a
    // DHT viszont néma: a kiírás soha nem ér célba. Minden körben újra kell próbálni.
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');
    const hely = await ujKeszulek();
    const tukor = await nemaFoglalat();
    tukor.on('message', (adat, felado) => {
      if (adat.length >= 20 && adat.readUInt16BE(0) === 0x0001) {
        tukor.send(stunValasz('203.0.113.9', 40000), felado.port, felado.address);
      }
    });
    const dht = await nemaFoglalat();
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Ujra kiiras');
      // Egy kötés, amelynek a rekeszébe írni kell — egy dokumentációs címmel, hogy a fúró
      // mérje a külső címet (csak nem-helyi célnál teszi).
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(await ujTablaKulcs()), hoszt: '192.0.2.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7631'], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '',
          KOINO_TUKOR: '127.0.0.1:' + tukor.address().port,
          KOINO_DHT_BELEPOK: '127.0.0.1:' + dht.address().port },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });
      await varj(32000);

      const probak = (kimenet.match(/az új címem kiírása nem ért célba/g) ?? []).length;
      return probak >= 2 && !/az új címemet kiírtam a táblára/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      tukor.close();
      dht.close();
      await varj(700);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⛔ A SAJÁT MAGUNKKAL KÖTÖTT RÉGI KÖTÉS INDULÁSKOR KIESIK', async () => {
  const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');
  const hely = await ujKeszulek();
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Sajat kotes');
    const sajat = await ujTablaKulcs();
    await writeFile(join(hely, 'tabla-kulcs.json'), JSON.stringify(sajat), 'utf8');
    // A terepi állapot: a jegyzékben SAJÁT magunk (és egy valódi társ, akit meg kell tartani).
    const tars = nyilvanosResz(await ujTablaKulcs());
    await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
      kotesek: [
        { ...nyilvanosResz(sajat), hoszt: '127.0.0.1', port: 7635, utoljara: Date.now(), talalkozasok: 2, eloszor: Date.now() },
        { ...tars, hoszt: '127.0.0.1', port: 7699, utoljara: Date.now(), talalkozasok: 2, eloszor: Date.now() }
      ]
    }), 'utf8');

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7635'], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
      stdio: 'ignore'
    });
    await varj(4000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    const kotesek = JSON.parse(await readFile(join(hely, 'kotesek.json'), 'utf8')).kotesek;
    return !kotesek.some((k) => k.alairo === sajat.alairoNyilvanos)
      && kotesek.some((k) => k.alairo === tars.alairo);
  } finally {
    if (orjarat) orjarat.kill();
    await varj(300);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⛔ A TÁRSLISTÁN ÁLLÓ SAJÁT CÍMÜNKET NEM HÍVJUK — és kötés sem lesz belőle', async () => {
  // ⛔ A TEREPI HELYZET (42. mérés): a telefon a saját wifis címét is felhívta; a napló
  // „bejött valaki"-t írt önmagától, és a jegyzékbe önmaga került.
  const hely = await ujKeszulek();
  const port = 7633;
  let orjarat = null;
  try {
    await fut(hely, 'koino', 'Sajat cim');
    await fut(hely, 'tars', '127.0.0.1', String(port));

    let kimenet = '';
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)], {
      env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    orjarat.stdout.on('data', (d) => { kimenet += d; });
    await varj(9000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    let kotesek = [];
    try { kotesek = JSON.parse(await readFile(join(hely, 'kotesek.json'), 'utf8')).kotesek; } catch { /* nincs */ }
    const sajat = JSON.parse(await readFile(join(hely, 'tabla-kulcs.json'), 'utf8'));
    return /nincs kire kopognom/.test(kimenet)
      && !/ismeretlen kopogott be|csere a résen/.test(kimenet)
      && !kotesek.some((k) => k.alairo === sajat.alairoNyilvanos);
  } finally {
    if (orjarat) orjarat.kill();
    await varj(300);
    await rm(hely, { recursive: true, force: true });
  }
});

proba('⭐ TERMUXBAN AZ ŐRJÁRAT MAGA KÉRI AZ ÉBREN TARTÁST — és kimondja, ha nem sikerül', async () => {
  // ⛔ A TEREPI HELYZET (42. mérés): a telefon körei a zsebben 15–20 percesek lettek. ⭐ Itt a
  // Termuxot a környezet jelzi, a `termux-wake-lock` parancs viszont NINCS a keresési úton —
  // tehát a kérésnek el kell buknia, és ezt ki kell mondania. Termuxon kívül meg sem próbálja.
  const hely = await ujKeszulek();
  const ures = await ujKeszulek();
  const futtat = async (env, port) => {
    let kimenet = '';
    const p = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)], {
      env, stdio: ['ignore', 'pipe', 'pipe']
    });
    p.stdout.on('data', (d) => { kimenet += d; });
    await varj(3000);
    p.kill();
    await varj(400);
    return kimenet;
  };
  try {
    await fut(hely, 'koino', 'Ebren');
    const alap = { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' };
    delete alap.TERMUX_VERSION;
    const termuxban = await futtat({ ...alap, TERMUX_VERSION: 'proba', PATH: ures, Path: ures }, 7637);
    const kivul = await futtat({ ...alap, PREFIX: '' }, 7638);
    return /Az ébren tartás nem sikerült/.test(termuxban)
      && !/ébren tartás/i.test(kivul);
  } finally {
    await rm(hely, { recursive: true, force: true });
    await rm(ures, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ AZ ÁLLANDÓ UDP-KAPU (D69/3, 2026-09-25)
// ===================================
//
// ⛔ A RÉGI SZERKEZET: a UDP-foglalat csak a SAJÁT kopogási ablakunkban élt — akinek nem volt
// kire kopognia, annak egyáltalán nem volt UDP-foglalata. Egy ilyen készüléket UDP-n senki
// nem ért el (csak TCP-n, ha kaput tartott).
// ⭐ A próba ezt a helyzetet építi fel: a MÁSIKNAK nincs egyetlen UDP-célja, tehát magától
// soha nem kopog. Az egyik mégis rá kopog — és a hírnek át kell mennie.

proba('⭐⭐⭐ AZ ÁLLANDÓ KAPU AKKOR IS FELEL, HA A MÁSIKNAK NINCS KIRE KOPOGNIA — a hír átmegy',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7641, B = 7642;
    let egyikOr = null, masikOr = null;

    try {
      await fut(egyik, 'koino', 'Allando kapu');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);
      await fut(egyik, 'gondolat', 'AZ ALLANDO KAPUN ATJOTT HIR');

      // ⭐ CSAK AZ EGYIKNEK van célja; a másiknak semmi (se társ, se friss cím, se kötés).
      await writeFile(join(egyik, 'udpcimek.json'), JSON.stringify({
        cimek: [{ hoszt: '127.0.0.1', port: B, mikor: Date.now() }]
      }), 'utf8');

      const kornyezet = { ...process.env, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' };
      let masikKimenet = '';
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '1', String(B)], {
        env: { ...kornyezet, KOINO_ADAT: masik }, stdio: ['ignore', 'pipe', 'pipe']
      });
      masikOr.stdout.on('data', (d) => { masikKimenet += d; });
      await varj(1500);
      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...kornyezet, KOINO_ADAT: egyik }, stdio: 'ignore'
      });

      await varj(15000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      const allapot = await fut(masik, 'allapot');
      return /AZ ALLANDO KAPUN ATJOTT HIR/.test(allapot)
        && /ismeretlen kopogott be \(127\.0\.0\.1:7641\)/.test(masikKimenet)
        && /csere a résen 127\.0\.0\.1:7641/.test(masikKimenet);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

proba('⛔⛔ HA A RÉS MEGNYÍLIK, DE A CSERE RAJTA ELBUKIK, A NAPLÓ KIMONDJA — nem „rés sem nyílt"',
  async () => {
    // ⛔ MIT MÉR: a 40. mérésen a napló a megnyílt rés után azt írta, hogy „egyik rés sem
    // nyílt meg" — az összegző sor a sikeres CSERÉKET számolta, és a résen futó csere
    // hibáját az őrjárat eldobta. ⭐ Itt egy HAMIS társ a kopogásra visszaszól, de cserélni
    // nem hajlandó (mint egy régebbi változat, vagy akinek közben bezárult az ablaka).
    const hely = await ujKeszulek();
    const A = 7623;
    const hamis = createSocket('udp4');
    await new Promise((kesz) => hamis.bind(0, '127.0.0.1', kesz));
    hamis.on('message', (adat, felado) => {
      let u = {};
      try { u = JSON.parse(adat.toString('utf8')); } catch { return; }
      if (u.uzenet === 'KOPOG') {
        hamis.send(JSON.stringify({ uzenet: 'HALLAK', tol: 'hamis-tars' }), felado.port, felado.address);
      }
    });
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Buko res');
      await writeFile(join(hely, 'udpcimek.json'), JSON.stringify({
        cimek: [{ hoszt: '127.0.0.1', port: hamis.address().port, mikor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });

      // ⚠️ A résen a csere 10 mp várakozás után adja fel — ennyi kell, és egy kis ráhagyás.
      await varj(17000);

      return /rés nyílt \(127\.0\.0\.1:\d+\), de a csere a résen elbukott: A másik fél nem válaszol/.test(kimenet)
        && /1 rés nyílt meg, de a csere egyiken sem ment végig/.test(kimenet)
        && !/egyik rés sem nyílt meg/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      hamis.close();
      await varj(700);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐⭐ A KÖTÉS MEGSZÜLETIK A BULIN — a társ TÁBLA-KULCSA alatt, nem a címe alatt',
  async () => {
    // ⛔ MIT MÉR: a kötés-jegyzék a valódi üzemmódban épül-e. ⭐ És hogy a társat a
    // TÁBLA-KULCSA azonosítja — mert a cím az, ami holnap elromlik.
    // ⚠️ A bizonyíték a MÁSIK készülék lemezén van: az ő tábla-kulcsa szerepel-e nálunk.
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const A = 7463, B = 7464;
    let egyikOr = null, masikOr = null;

    try {
      await fut(egyik, 'koino', 'Kotes proba');
      const vitt = join(egyik, 'alap.jsonl');
      await fut(egyik, 'kivisz', vitt, 'mind');
      await fut(masik, 'behoz', vitt);

      const jegyzek = (hova, mihez) => writeFile(join(hova, 'udpcimek.json'),
        JSON.stringify({ cimek: [{ hoszt: '127.0.0.1', port: mihez, mikor: Date.now() }] }),
        'utf8');
      await jegyzek(egyik, B);
      await jegyzek(masik, A);

      egyikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(A)], {
        env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      masikOr = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.2', String(B)], {
        env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(14000);
      egyikOr.kill(); egyikOr = null;
      masikOr.kill(); masikOr = null;
      await varj(700);

      const olvas = async (hely, mit) => {
        try { return JSON.parse(await readFile(join(hely, mit), 'utf8')); } catch { return null; }
      };
      const egyikKulcs = await olvas(egyik, 'tabla-kulcs.json');
      const masikKulcs = await olvas(masik, 'tabla-kulcs.json');
      const egyikKotes = (await olvas(egyik, 'kotesek.json'))?.kotesek ?? [];
      const masikKotes = (await olvas(masik, 'kotesek.json'))?.kotesek ?? [];

      return !!egyikKulcs && !!masikKulcs
        // ⭐ MINDKETTŐ A MÁSIK TÁBLA-KULCSÁT JEGYEZTE FEL.
        && egyikKotes.some((k) => k.alairo === masikKulcs.alairoNyilvanos)
        && masikKotes.some((k) => k.alairo === egyikKulcs.alairoNyilvanos)
        // ⛔⛔ ÉS A TÁBLA-KULCS NEM AZ AZONOSSÁG: a mentett kulcs-fájlban semmi köze
        // a `kulcs.json`-hoz. *Ha valaki egyszer összevonná a kettőt, ez buktat.*
        && egyikKulcs.alairoNyilvanos
          !== (await olvas(egyik, 'kulcs.json'))?.nyilvanos
        // ⭐ És a cím is ott van, amire kopogni lehet.
        && egyikKotes.some((k) => k.hoszt === '127.0.0.1' && k.port === B);
    } finally {
      if (egyikOr) egyikOr.kill();
      if (masikOr) masikOr.kill();
      await varj(800);
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐⭐ A HIRDETŐTÁBLA BEKÖTÉSE (2026-09-20)
// ===================================
//
// ⛔⛔ MIT MÉR: hogy a `tabla` PARANCS tényleg kiír és kiolvas — vagyis hogy a réteg nem
// csak megépült, hanem a kéz el is éri (4. szabály). ⭐ És hogy a lánc VÉGIG megy: kulcs →
// közös titok → titkosítás → aláírás → DHT → vissza.
//
// ⚠️ HAMIS DHT-N, NEM AZ IGAZIN: egy próba, ami a valódi hálózatot hívná, a hálózat
// hangulatát mérné, nem a kódot. *Az igazi DHT-n külön terepmérés fut (37.).*

proba('⭐⭐⭐ A TÁBLA PARANCSA KIÍR ÉS KIOLVAS — a lánc végigmegy (hamis DHT-n)',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const halo = await hamisHalozat(12);

    try {
      // Két tábla-kulcs, és mindkét oldal ismeri a másikat — ez a KÖTÉS (kézi úton
      // felírva: a jegyzék sima JSON, 4. szabály).
      const egyikK = await ujTablaKulcs();
      const masikK = await ujTablaKulcs();
      await writeFile(join(egyik, 'tabla-kulcs.json'), JSON.stringify(egyikK), 'utf8');
      await writeFile(join(masik, 'tabla-kulcs.json'), JSON.stringify(masikK), 'utf8');

      const kotes = (mienk, ove) => JSON.stringify({
        kotesek: [{ ...nyilvanosResz(ove), hoszt: '10.0.0.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      });
      await writeFile(join(egyik, 'kotesek.json'), kotes(egyikK, masikK), 'utf8');
      await writeFile(join(masik, 'kotesek.json'), kotes(masikK, egyikK), 'utf8');

      const belepo = halo.belepo(0);
      const kornyezet = { KOINO_DHT_BELEPOK: belepo };

      // (1) Az egyik KIÍRJA az új címét a másik rekeszébe.
      const kiiras = await fut(egyik, 'tabla', 'kiir', '203.0.113.7', '41777', kornyezet);
      // (2) A másik KIOLVASSA — és a címnek meg kell jelennie.
      const olvasas = await fut(masik, 'tabla', 'olvas', kornyezet);

      return /1 rekeszbe kiírva/.test(kiiras)
        && /203\.0\.113\.7:41777/.test(olvasas);
    } finally {
      halo.bezar();
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ A „NINCS A TÁBLÁN" ÉS A „NEM ÉRTEM EL A TÁBLÁT" KÉT KÜLÖN DOLOG (40. mérés, 2026-09-24)
// ===================================
//
// ⛔ MIÉRT SZÜLETETT: terepen egy telefon mobilnet NÉLKÜL azt írta, hogy *„egy néma társ nincs
// a táblán"* — pedig egyetlen DHT-gép sem felelt neki. A társ közben kint volt (a másik
// telefon mindvégig megtalálta). *A felirat a hálózat hírét a társ hírének adta ki.*
//
// ⭐ A PRÓBA KÉT ÁGA, hogy ne legyen vak: egy NÉMA DHT-gép mellett a tábla „nem érhető el",
// egy ÉLŐ (hamis) DHT-n viszont, ahova senki nem írt, a társ tényleg „nincs a táblán".

async function nemaFoglalat() {
  // Hall, de soha nem felel — mint egy mobilnet nélküli telefonnak az egész internet.
  const halo = createSocket('udp4');
  await new Promise((kesz) => halo.bind(0, '127.0.0.1', kesz));
  return halo;
}

proba('⛔⛔ HA EGYETLEN DHT-GÉP SEM FELEL, A TÁBLA „NEM ÉRHETŐ EL" — nem „nincs rajta"',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const hely = await ujKeszulek();
    const nema = await nemaFoglalat();
    const halo = await hamisHalozat(12);

    try {
      const sajat = await ujTablaKulcs();
      const tars = await ujTablaKulcs();
      await writeFile(join(hely, 'tabla-kulcs.json'), JSON.stringify(sajat), 'utf8');
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(tars), hoszt: '10.0.0.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      // (1) NÉMA háló: a kérdések kimennek, válasz nem jön.
      const nemaBan = await fut(hely, 'tabla', 'olvas',
        { KOINO_DHT_BELEPOK: '127.0.0.1:' + nema.address().port });
      // (2) ÉLŐ háló, üres rekesszel: itt a „nincs a táblán" az igazság.
      const eloben = await fut(hely, 'tabla', 'olvas', { KOINO_DHT_BELEPOK: halo.belepo(0) });

      return /NEM ÉRHETŐ EL/.test(nemaBan) && !/nincs a táblán/.test(nemaBan)
        && /nincs a táblán/.test(eloben) && !/NEM ÉRHETŐ EL/.test(eloben);
    } finally {
      nema.close();
      halo.bezar();
      await rm(hely, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔ AZ ŐRJÁRAT SZÓL, HA NEM TUDJA MEGMÉRNI A SAJÁT KÜLSŐ CÍMÉT (40. mérés, 2026-09-24)
// ===================================
//
// ⛔ MIÉRT SZÜLETETT: a mobilnet nélküli telefon nem tudta megmérni a külső címét, ezért nem
// írt ki új címet a táblára — a társ csak a RÉGIT találta meg. ⛔ És a napló erről egy szót
// sem szólt: a jelzés (`SAJAT-CIM-NEM-MEGY`) a fúróból kijött, az őrjárat eldobta.
//
// ⭐ A TÜKÖR ITT EGY NÉMA HELYI FOGLALAT (`KOINO_TUKOR`), tehát a próba nem a valódi hálózat
// hangulatát méri. ⚠️ A kopogás célja egy dokumentációs cím (192.0.2.1, RFC 5737): csak
// nem-helyi célnál mér a fúró külső címet — ez a feltétele, hogy a mérés egyáltalán
// elinduljon. A DHT kikapcsolva, a kötés FRISS (nem néma), így táblaolvasás sem indul.

proba('⛔⛔ AZ ŐRJÁRAT MEGNEVEZI, HA NEM TUDJA MEGMÉRNI A KÜLSŐ CÍMÉT — és csak egyszer',
  async () => {
    const { ujTablaKulcs, nyilvanosResz } = await import('../js/csere/tablaKulcs.js');

    const hely = await ujKeszulek();
    const tukor = await nemaFoglalat();
    let orjarat = null;

    try {
      await fut(hely, 'koino', 'Tukor proba');
      const tars = await ujTablaKulcs();
      await writeFile(join(hely, 'kotesek.json'), JSON.stringify({
        kotesek: [{ ...nyilvanosResz(tars), hoszt: '192.0.2.1', port: 7373,
          utoljara: Date.now(), talalkozasok: 3, eloszor: Date.now() }]
      }), 'utf8');

      let kimenet = '';
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', '7597'], {
        env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '',
          KOINO_TUKOR: '127.0.0.1:' + tukor.address().port, KOINO_DHT_BELEPOK: 'nincs' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      orjarat.stdout.on('data', (d) => { kimenet += d; });

      // ⚠️ A tükör 5 mp-ig vár a válaszra, egy kör 6 mp — két-három kör elég, hogy kiderüljön,
      // hogy a sor MEGJELENIK, és hogy NEM ismétlődik körönként.
      await varj(20000);

      const sorok = kimenet.match(/nem tudom megmérni a saját külső címemet/g) ?? [];
      return sorok.length === 1 && /STUN-kiszolgáló nem válaszolt/.test(kimenet);
    } finally {
      if (orjarat) orjarat.kill();
      tukor.close();
      await varj(500);
      await rm(hely, { recursive: true, force: true });
    }
  });

proba('⭐⭐ A MEGISMERT DHT-GÉPEK ÁTKERÜLNEK A TÁRSHOZ (a belépő csak kurbli)',
  async () => {
    // ⛔ MIT MÉR: Csaba (c) döntését — a csere adjon át néhány DHT-gépet, hogy egy friss
    // telepítés az első buli után NE függjön a közismert belépőktől (36. mérés: ők
    // korlátoznak). ⭐ A bizonyíték a MÁSIK készülék lemezén van.
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7465;

    await fut(gazda, 'koino', 'Dht gep proba');

    // A gazda jegyzékébe kézzel írunk két gépet (a jegyzék sima JSON — 4. szabály).
    await writeFile(join(gazda, 'dht-csomopontok.json'), JSON.stringify([
      { cim: '203.0.113.50', port: 6881, id: 'aabb' },
      { cim: '203.0.113.51', port: 6882, id: 'ccdd' }
    ]), 'utf8');

    await csereKor(gazda, vendeg, port);

    let jegyzek = [];
    try {
      jegyzek = JSON.parse(await readFile(join(vendeg, 'dht-csomopontok.json'), 'utf8'));
    } catch { return false; }

    return jegyzek.some((g) => g.cim === '203.0.113.51' && g.port === 6882)
      // ⚠️ És a BEMONDOTT gépnek nincs `id`-je: az csak a saját megfigyelésünkből lehet.
      && jegyzek.every((g) => g.cim !== '203.0.113.51' || g.id === null);
  });

// ⛔⛔ ÉS A HARMADIK PRÓBA AZ ŐRJÁRATÉ — mert a fenti kettő NEM fedi le.
//
// *Ezt a saját rontás-próbám mutatta meg (2026-09-18): kivágtam az őrjárat hirdetését, és a
// fenti két próba ZÖLD maradt — mert azok a `figyel` parancsot használják, az pedig másik
// ág.* ⭐ Az őrjárat a „valódi üzemmód": ha ott nem terjed a cím, akkor élesben nem terjed.
//
// Ez a próba MINDKÉT irányt méri egy menetben: a vendég őrjárata megtanulja a gazda friss
// címét (a kör-ág beolvasztása), ÉS a gazda megtanulja a vendégét (a kör-ág hirdetése).
proba('⭐⭐⭐ AZ ŐRJÁRAT is terjeszti a friss címet — MINDKÉT irányban', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  const port = 7453;
  let figyelo = null, orjarat = null;

  try {
    await fut(gazda, 'koino', 'Orjarat cim proba');

    // Mindkét készülék jegyzékébe egy-egy friss cím (a kézi út: sima JSON).
    await writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.11', port: 41011, mikor: Date.now() }]
    }), 'utf8');
    await writeFile(join(vendeg, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.22', port: 41022, mikor: Date.now() }]
    }), 'utf8');

    // A vendég ismerje a gazdát — az őrjárat a társ-listát járja körbe.
    await fut(vendeg, 'tars', '127.0.0.1', String(port), 'A gazda');

    figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(1500);

    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7454'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(8000);                      // néhány kör: a 0,05 perc = 3 másodperces ütem
    orjarat.kill(); orjarat = null;
    figyelo.kill(); figyelo = null;
    await varj(1000);

    const jegyzek = async (hely) => {
      try {
        return JSON.parse(await readFile(join(hely, 'udpcimek.json'), 'utf8')).cimek ?? [];
      } catch { return []; }
    };
    const vendegE = await jegyzek(vendeg);
    const gazdaE = await jegyzek(gazda);

    // ⭐ A BIZONYÍTÉK: mindkét lemezen ott a MÁSIK címe. *Nem kiírás, hanem fájl.*
    return vendegE.some((c) => c.hoszt === '198.51.100.11')
      && gazdaE.some((c) => c.hoszt === '198.51.100.22');
  } finally {
    if (orjarat) orjarat.kill();
    if (figyelo) { figyelo.kill(); await varj(1000); }
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⚠️ ÉS EGY NEGYEDIK, mert a harmadik SEM fedte le az őrjárat POSTALÁDA-ágát.
//
// *A rontás-próba megint pontosabb volt nálam: kivágtam az őrjárat postaláda-hirdetését, és
// a fenti három próba zöld maradt — mert ott az őrjárat a HÍVÓ, nem a fogadó.* ⭐ Itt tehát
// az őrjáratnak **nincs egyetlen társa sem** (a kör-ág el sem indul), és a másik készülék
// kopog be hozzá: így csak a postaláda-ág maradhat.
proba('⭐⭐ Az őrjárat POSTALÁDA-ága is hirdeti a friss címet', async () => {
  const gazda = await ujKeszulek();
  const vendeg = await ujKeszulek();
  let orjarat = null;

  try {
    await fut(vendeg, 'koino', 'Postalada cim proba');
    await writeFile(join(vendeg, 'udpcimek.json'), JSON.stringify({
      cimek: [{ hoszt: '198.51.100.33', port: 41033, mikor: Date.now() }]
    }), 'utf8');

    // ⚠️ A vendégnek NINCS társa — tehát a kör-ág nem futhat, csak a kapu.
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7455'], {
      env: { ...process.env, KOINO_ADAT: vendeg, KOINO_NAPLO: '' }, stdio: 'ignore'
    });
    await varj(2000);
    await fut(gazda, 'csere', '127.0.0.1', '7455');
    await varj(1000);
    orjarat.kill(); orjarat = null;
    await varj(500);

    let jegyzek = [];
    try {
      jegyzek = JSON.parse(await readFile(join(gazda, 'udpcimek.json'), 'utf8')).cimek ?? [];
    } catch { return false; }
    return jegyzek.some((c) => c.hoszt === '198.51.100.33' && c.port === 41033);
  } finally {
    if (orjarat) orjarat.kill();
    await rm(gazda, { recursive: true, force: true });
    await rm(vendeg, { recursive: true, force: true });
  }
});

// ⭐⭐⭐ ÉS AZ ÖTÖDIK: A SAJÁT FRISS CÍMÜNK FELJEGYZÉSE — a rés két oldalán.
//
// ⛔ MIÉRT KELL KÜLÖN? Mert ez a jegyzék EGYETLEN valódi forrása: a többi bejegyzést
// másoktól kapjuk, ezt viszont MAGUNKRÓL tudjuk meg — és e nélkül a társ soha nem tudná
// meg, hova kopogjon nekünk. *A rontás-próba szerint eddig ezt sem mérte semmi.*
//
// ⚠️ A rés itt a hurok-címen nyílik (két folyamat, két helyi port) — NAT nélkül, tehát a
// „külső" cím a 127.0.0.1 lesz. A mérés tárgya nem a NAT, hanem hogy a `latlak`-ból tanult
// cím **a lemezre kerül-e**.
proba('⭐⭐⭐ A SAJÁT friss címünket a rés után feljegyezzük', async () => {
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  let a = null, b = null;

  // ⚠️⚠️ A FÚRÓK KIMENETÉT ELTESSZÜK (2026-09-21) — korábban `stdio: 'ignore'` volt, tehát
  // ha a próba bukott, **semmit nem tudtunk arról, mi történt a résen**. ⛔ És ez a próba
  // SZESZÉLYES: ugyanazon a kódon hol zöld, hol piros. *Egy néma bukás nem lelet, hanem
  // találgatásra hívás* — a 25. mérés tanulsága: a legrosszabb hiba a nem-esemény.
  const naplok = { a: '', b: '' };
  const figyel = (folyamat, kulcs) => {
    folyamat.stdout.on('data', (d) => { naplok[kulcs] += d; });
    folyamat.stderr.on('data', (d) => { naplok[kulcs] += d; });
  };

  try {
    await fut(egyik, 'koino', 'Res cim proba');

    a = spawn(process.execPath, [KOINO_JS, 'pajzsfuro', '127.0.0.1', '7457', '7456'], {
      env: { ...process.env, KOINO_ADAT: egyik, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    figyel(a, 'a');
    b = spawn(process.execPath, [KOINO_JS, 'pajzsfuro', '127.0.0.1', '7456', '7457'], {
      env: { ...process.env, KOINO_ADAT: masik, KOINO_NAPLO: '' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    figyel(b, 'b');
    await varj(9000);                       // fúrás + csere + a fájl-randevú vége
    a.kill(); a = null; b.kill(); b = null;
    await varj(500);

    const jegyzek = async (hely) => {
      try {
        return JSON.parse(await readFile(join(hely, 'udpcimek.json'), 'utf8')).cimek ?? [];
      } catch { return []; }
    };
    // ⭐ Mindkét oldalnak fel kell jegyeznie, amit a MÁSIK látott belőle.
    const egyikE = await jegyzek(egyik);
    const masikE = await jegyzek(masik);
    const rendben = egyikE.some((c) => c.port === 7456) && masikE.some((c) => c.port === 7457);

    // ⚠️ ÉS HA BUKIK, MEGNEVEZI MAGÁT (D19): mi került a két jegyzékbe, és mit mondott a
    // két fúró. *Ebből derül ki, hogy a RÉS nem nyílt-e meg, vagy megnyílt, de a cím nem
    // jutott a lemezre — a kettő teljesen más hiba.*
    if (!rendben) {
      const rovid = (sz) => sz.replace(/\s+/g, ' ').trim().slice(-400);
      throw new Error('a saját friss cím nem került a lemezre — '
        + 'egyik jegyzéke: ' + JSON.stringify(egyikE) + ' · '
        + 'másik jegyzéke: ' + JSON.stringify(masikE)
        + ' ||| A fúró (egyik): ' + rovid(naplok.a)
        + ' ||| A fúró (másik): ' + rovid(naplok.b));
    }
    return true;
  } finally {
    if (a) a.kill();
    if (b) b.kill();
    await varj(500);
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐⭐ A KÉZI ÚT AZ ÖSSZEVETÉSHEZ (2026-09-21)
// ===================================
//
// ⛔⛔ MIT MÉR, ÉS MIÉRT ÉPP PARANCSSORBÓL: az `elteresek` (osszehasonlitas.js) megépült,
// próba őrizte — és **egyetlen éles hívója sem volt**. Vagyis a parancs, ami azért van,
// hogy két készülék összevethesse magát, csak annyit mondott, hogy „nem egyezik"; azt
// nem, hogy MIBEN. *Ugyanaz az alak, mint a Szakasz 4-nél és a fájl-szállításnál: a
// réteg tudta, a kéz nem érte el.* ⭐ Ezért ez a próba NEM a függvényt hívja, hanem a
// PARANCSOT — külön folyamatban, két készülékkel, ahogy egy ember használná.

proba('⭐⭐⭐ ujjlenyomat kiment → osszevet: MEGNEVEZI az eltérést, csere után pedig egyezést mond',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const lap = join(egyik, 'lap.json');
    try {
      await fut(egyik, 'koino', 'Vizsga koinó');
      await fut(masik, 'koino', 'Vizsga koinó');

      // ⭐ Két KÜLÖNBÖZŐ gondolat a két gépen — tehát az `entitasok` szakasznak el KELL térnie.
      await fut(egyik, 'gondolat', 'CSAK AZ EGYIKEN');
      await fut(masik, 'gondolat', 'CSAK A MÁSIKON');

      await fut(egyik, 'ujjlenyomat', 'kiment', lap);
      const elteres = await fut(masik, 'ujjlenyomat', 'osszevet', lap);

      // ⛔ A LÉNYEG: nem elég, hogy nemet mond — meg kell NEVEZNIE a szakaszt.
      const megnevezte = elteres.includes('ELTÉRÜNK') && elteres.includes('entitasok');

      // ----- ÉS A MÁSIK IRÁNY: csere után UGYANAZT látjuk -----
      // ⚠️ Egy műszer, ami mindig eltérést kiált, ugyanolyan használhatatlan, mint
      // amelyik mindig egyezést. *A próba mindkét választ megköveteli.*
      await csereKor(egyik, masik, 7941);
      await fut(egyik, 'ujjlenyomat', 'kiment', lap);
      const egyezes = await fut(masik, 'ujjlenyomat', 'osszevet', lap);

      // ⛔ ÉS AZ ÁTÍRT LAP: a másik gépen sem „kicsit más állapot", hanem hiba.
      const atirt = join(egyik, 'lap-atirt.json');
      await writeFile(atirt,
        (await readFile(lap, 'utf8')).replace('CSAK AZ EGYIKEN', 'ÁTÍRT CÍM'), 'utf8');
      const hamis = await fut(masik, 'ujjlenyomat', 'osszevet', atirt);

      return megnevezte
        && egyezes.includes('UGYANAZT LÁTJUK')
        && hamis.includes('NEM a saját ujjlenyomatát');
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⛔⛔⛔ AZ ELVESZETT ÍRÁS A TÁRS-LISTÁN (2026-09-22)
// ===================================

proba('⛔⛔ A KÖR ALATT FELVETT TÁRS TÚLÉLI A KÖR VÉGI KÖNYVELÉST — nincs elveszett írás', async () => {
  // ⛔ MIT MÉR (2026-09-22, és a D69/2 óta az induló címeken): az őrjárat a listát a kör
  // ELEJÉN olvassa, és a kör VÉGÉN könyvel (ki felelt, ki nem). Ha a könyvelés a kör eleji
  // képet írná ki egészben, a közben kézzel felvett társ **csendben elveszne**. ⭐ A két ág
  // csak az ÉLES őrjáratban fut egyszerre; modul-próbával ez elvileg sem fogható meg.
  //
  // ⭐⭐ ÉS VISELKEDÉST MÉR, NEM FELIRATOT: a bizonyíték a **lemez** — a kör után ott van-e
  // a közben felvett cím, ÉS a halott cím könyvelése megtörtént-e (különben a kör nem is
  // írt, és a próba vakon zöld volna).
  //
  // ⚠️ A KÖRT SZÁNDÉKOSAN HOSSZÚRA NYÚJTJUK: egy nem válaszoló induló címre a kör a teljes
  // kopogási időt (6 mp) kivárja — és a percforduló UTÁN indítunk, hogy az ablak ne vágja le.
  const gazda = await ujKeszulek();
  let orjarat = null;
  const lista = async () => {
    try {
      const adat = JSON.parse(await readFile(join(gazda, 'indulocimek.json'), 'utf8'));
      return Array.isArray(adat) ? adat : (adat.tarsak ?? []);
    } catch { return []; }
  };
  try {
    await fut(gazda, 'koino', 'Elveszett írás');
    await fut(gazda, 'tars', '10.255.255.1', '7999', 'nema');   // ettől tart a kör

    // ⭐ Egy 30 mp-es ablak ELEJÉN indulunk: így az első kör a teljes 6 mp-et kopog.
    const hatra = 30000 - (Date.now() % 30000);
    await varj(hatra + 300);
    orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.5', '7952'], {
      env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' },
      stdio: 'ignore'
    });
    await varj(2500);                                        // a kör már kopog a némára
    await fut(gazda, 'tars', '10.9.9.9', '9999', 'kozben');   // ⭐ KÖZBEN veszünk fel valakit

    // ⚠️ ELŐBB A VAKSÁG-PRÓBA: ha a felvétel el sem jutott a lemezre, nem ezt mértük.
    if (!(await lista()).some((t) => t.hoszt === '10.9.9.9')) return false;

    await varj(7000);                                        // a kör LEZÁRUL, és könyvel
    const vegul = await lista();
    const nema = vegul.find((t) => t.hoszt === '10.255.255.1');
    // ⭐ A bizonyíték: a közben felvett cím MEGVAN, és a kör tényleg könyvelt (a néma bukott).
    return vegul.some((t) => t.hoszt === '10.9.9.9') && (nema?.sikertelen ?? 0) >= 1;
  } finally {
    if (orjarat) orjarat.kill();
    await varj(500);
    await rm(gazda, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ A BEMUTATKOZÁS KÖLCSÖNÖSSÉGE LÁTSZIK (D62, bekötve 2026-09-22)
// ===================================

proba('⭐⭐ A BEMUTATKOZÁS ÁLLÁSA LÁTSZIK: előbb FÜGGŐBEN, a válasz után KÖLCSÖNÖS',
  async () => {
    // ⛔ MIT MÉR: a `bemutatkozasok()` számítás **hét önpróbával** megépült, és a
    // `koino.js` nem importálta. A `bemutatkoz` parancs kiírta, hogy *„csak KÖLCSÖNÖSEN
    // számít"* — de hogy teljesült-e, azt semmi nem mondta meg.
    //
    // ⭐ A BIZONYÍTÉK KÉT KÉP KÜLÖNBSÉGE: ugyanaz a parancs, ugyanaz a készülék, és a
    // másik fél válasza után MÁS a válasz. *Egy szám, ami sosem változik, nem jelzés.*
    const anna = await ujKeszulek();
    const bela = await ujKeszulek();
    try {
      await fut(anna, 'koino', 'Bemutatkozás koinó');
      const annaHorgony = teljesAzonosito(await fut(anna, 'belep', 'alapitas'));
      const belaHorgony = teljesAzonosito(await fut(bela, 'belep'));
      if (!annaHorgony || !belaHorgony) return false;

      await csereKor(anna, bela, 7953);
      await fut(anna, 'meghiv', belaHorgony);
      await csereKor(anna, bela, 7954);

      // ----- 1. EGYOLDALÚ: Anna bemutatkozik, Béla még nem -----
      await fut(anna, 'bemutatkoz', belaHorgony);
      const egyoldaluan = await fut(anna, 'allapot');
      if (!/FÜGGŐBEN/.test(egyoldaluan)) return false;
      if (!/0 kölcsönös bemutatkozásod van/.test(egyoldaluan)) return false;
      // ⭐⭐ A KÉT IRÁNY KÜLÖN (2026-09-23): Annának nincs teendője, ő Bélára vár…
      if (!/1 FÜGGŐBEN, a másik félre vár/.test(egyoldaluan)) return false;
      if (/rád vár|viszonozd/.test(egyoldaluan)) return false;

      // …Bélánál viszont ugyanez RÁ vár, és a program megmondja, mit futtasson.
      await csereKor(anna, bela, 7956);
      const belanal = await fut(bela, 'allapot');
      if (!/1 FÜGGŐBEN, rád vár/.test(belanal)) return false;
      if (!belanal.includes('viszonozd: node koino/koino.js bemutatkoz ' + annaHorgony.slice(0, 8))) {
        return false;
      }

      // ----- 2. KÖLCSÖNÖS: Béla viszonozza — ⭐ épp a javasolt RÖVID horgonnyal -----
      await fut(bela, 'bemutatkoz', annaHorgony.slice(0, 8));
      await csereKor(bela, anna, 7955);

      const kolcsonosen = await fut(anna, 'allapot');
      // ⭐ A DÖNTŐ SOR: 1 kölcsönös, és a „függőben" eltűnt.
      return /1 kölcsönös bemutatkozásod van/.test(kolcsonosen)
        && !/FÜGGŐBEN/.test(kolcsonosen);
    } finally {
      await rm(anna, { recursive: true, force: true });
      await rm(bela, { recursive: true, force: true });
    }
  });

proba('⛔⛔ D71 AZ ŐRJÁRATBAN: egy azonos IP-jű IDEGEN nem teszi elértté a néma kötést — a portváltó kötést viszont a tábla-kulcs ugyanabban a körben megerősíti',
  async () => {
    // ⛔ A 44. mérés a VALÓDI programban, három őrjárattal (a bekötés próbája — 4. szabály):
    //   0. a B az A-hoz kopog, cserélnek — az A-nak kötése lesz a B-vel (127.0.0.1:PB1). A B leáll.
    //   1. az A a néma B-re kopog; közben a C — egy IDEGEN ugyanarról az IP-ről — bekopog, és
    //      cserélnek. A D71 előtt az A a C-t a B-nek könyvelte („1/1 társ"); most kimondja, hogy
    //      más jelentkezett, és a B-t hívja tovább.
    //   2. a B visszajön ÚJ porton (mint a mobil NAT portváltása). Az A körében ez feltevés, és a
    //      munka végén a B tábla-kulcsa ugyanabban a körben megerősíti.
    // ⭐ A két szakasz a bekötés két darabját méri: az 1. a kötés célját (`kopogasCeljai` →
    //   `alairo`), a 2. a munka eredményét (`resMunkaKeszito` → `alairo`). Bármelyik hiányzik, bukik.
    // ⚠️ Minden készülék saját, kijelölt porton fut: a kézi parancs a 7373-at venné fel, ha szabad,
    //   és ott egy VALÓDI őrjárat is állhat — a próba adata nem juthat hozzá.
    // ⚠️ Az időzítés: 6 mp-es ablakban az A a teljes ablakban kopog; a C és a B az ablak eleje után
    //   0,3 mp-cel indul, így a kopogásuk az A körébe esik.
    const A = await ujKeszulek();
    const B = await ujKeszulek();
    const C = await ujKeszulek();
    const PA = 7661, PB1 = 7662, PB2 = 7663, PC = 7664;
    const helyben = { KOINO_DHT_BELEPOK: 'nincs', KOINO_TUKOR: '127.0.0.1:9' };
    const orjarat = (hely, port) => spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...helyben },
        stdio: ['ignore', 'pipe', 'pipe'] });
    const ablakElejere = () => {
      const most = Date.now();
      return varj(Math.ceil((most + 1) / 6000) * 6000 - most + 300);
    };
    let a = null, b = null, c = null;
    try {
      await fut(A, 'koino', 'Kotes proba');
      await fut(B, 'tars', '127.0.0.1', String(PA), 'A');
      await fut(C, 'tars', '127.0.0.1', String(PA), 'A');

      let kimenet = '';
      a = orjarat(A, PA);
      a.stdout.on('data', (d) => { kimenet += d; });
      a.stderr.on('data', (d) => { kimenet += d; });

      // 0. A KÖTÉS — a B bekopog, cserélnek; utána a B elhallgat.
      b = orjarat(B, PB1);
      let bKimenet = '';
      b.stdout.on('data', (d) => { bKimenet += d; });
      for (let i = 0; i < 40 && !/csere a résen/.test(bKimenet); i++) await varj(500);
      b.kill(); b = null;
      // ⚠️ Megvárjuk, hogy az A egy kört a NÉMA B-vel is lezárjon: a 0. szakasz „1/1 társ" sora
      // különben néha a határ után íródik ki, és átcsúszna az 1. szakasz naplójába (mérve).
      const nemaKor = async () => {
        const tol = kimenet.length;
        for (let i = 0; i < 40 && !/egyik rés sem nyílt meg/.test(kimenet.slice(tol)); i++) await varj(500);
      };
      await nemaKor();

      // 1. AZ IDEGEN — ugyanarról az IP-ről, az A körébe időzítve.
      await ablakElejere();
      const h0 = kimenet.length;
      c = orjarat(C, PC);
      await varj(3500);
      c.kill(); c = null;                     // a következő körben már ne legyen kit elérni
      await nemaKor();                        // az idegen körének összegzője is az 1. szakaszé
      const elso = kimenet.slice(h0);

      // 2. A B ÚJ PORTON — az A körébe időzítve.
      await ablakElejere();
      const h1 = kimenet.length;
      b = orjarat(B, PB2);
      await varj(9000);
      const masodik = kimenet.slice(h1);

      // ⚠️ HA BUKIK, MEGNEVEZI MAGÁT (D19): melyik szakasz, és az A naplója abból a szakaszból.
      const tiszta = (s) => s.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim();
      // ⚠️ Az óra EGY jegyű is lehet (`toLocaleTimeString('hu-HU')` → „0:00:36") — a próba az
      // első változatban két jegyet várt, és éjfél után 10-ig MINDIG bukott (2026-09-27, mérve).
      const elertVkit = /✓ \d{1,2}:\d\d:\d\d [1-9]\d*\/\d+ társ/;
      if (!elso.includes('nem az a kötésem, akit a 127.0.0.1:' + PB1 + ' címen vártam')
        || elertVkit.test(elso)) {
        throw new Error('1. szakasz (az idegen) — az A naplója: ' + tiszta(elso).slice(0, 900));
      }
      if (!masodik.includes('egy kötésem új porton jelentkezett (127.0.0.1:' + PB2
        + ', eddig 127.0.0.1:' + PB1 + ')') || !elertVkit.test(masodik)) {
        throw new Error('2. szakasz (a B új porton) — az A naplója: ' + tiszta(masodik).slice(0, 900));
      }
      return true;
    } finally {
      for (const f of [a, b, c]) if (f) f.kill();
      await varj(700);
      for (const h of [A, B, C]) await rm(h, { recursive: true, force: true });
    }
  });

proba('⭐⭐⭐ D72: A SZÖVEG KÜLÖN DARAB — az esemény nem hordozza, a másik gép a résen kapja, a kézi úton is átmegy, és az állapot végig ugyanaz',
  async () => {
    // ⭐ A D72 ígérete a VALÓDI programban: (1) a gazda tárában az esemény NEM hordozza a
    // szöveget; (2) a vendég az első csere után a gondolatot már látja, a szövegéről kimondja,
    // hogy még nem érkezett meg — és az állapotunk MÁR EKKOR ugyanaz; (3) a második csere
    // randevúja hozza a darabot, és a vendég a szöveget mutatja; (4) a kézi út (kivisz/behoz)
    // egy harmadik gépre hálózat nélkül viszi a szöveget is.
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const harmadik = await ujKeszulek();
    const port = 7671;
    let figyelo = null;
    try {
      await fut(gazda, 'koino', 'Szöveg-darab koinó');
      await fut(gazda, 'gondolat', 'A CÍM', 'EZ A SZÖVEG KÜLÖN DARAB');

      // (1) Az esemény-fájlban NINCS a szöveg — csak a hivatkozás.
      const esemenyFajl = await readFile(join(gazda, 'sajat', 'esemenyek.jsonl'), 'utf8');
      if (esemenyFajl.includes('EZ A SZÖVEG KÜLÖN DARAB')) throw new Error('a szöveg az eseményben maradt');
      if (!(await fut(gazda)).includes('EZ A SZÖVEG KÜLÖN DARAB')) throw new Error('a gazda nem mutatja a saját szövegét');

      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);

      // (2) Az első csere: az esemény átjön, a darab még nem.
      await fut(vendeg, 'csere', '127.0.0.1', String(port));
      const elotte = await fut(vendeg);
      const lap = join(gazda, 'lap.json');
      await fut(gazda, 'ujjlenyomat', 'kiment', lap);
      const egyezesElotte = await fut(vendeg, 'ujjlenyomat', 'osszevet', lap);
      if (!elotte.includes('A CÍM') || !elotte.includes('a szöveg még nem érkezett meg')
        || !egyezesElotte.includes('UGYANAZT LÁTJUK')) {
        throw new Error('az első csere után: ' + elotte.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(0, 500)
          + ' | összevetés: ' + egyezesElotte.replace(/\s+/g, ' ').slice(0, 200));
      }

      // (3) A második csere randevúja hozza a darabot.
      const masodik = await fut(vendeg, 'csere', '127.0.0.1', String(port));
      const utana = await fut(vendeg);
      const egyezesUtana = await fut(vendeg, 'ujjlenyomat', 'osszevet', lap);
      if (!/fájlok a résen: 1 megjött/.test(masodik) || !utana.includes('EZ A SZÖVEG KÜLÖN DARAB')
        || !egyezesUtana.includes('UGYANAZT LÁTJUK')) {
        throw new Error('a második csere után: ' + masodik.replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(-300));
      }

      // (4) A kézi út: kivisz a gazdáról, behoz a harmadikra — hálózat nélkül.
      const fajl = join(gazda, 'kivitel.jsonl');
      const ki = await fut(gazda, 'kivisz', fajl);
      const be = await fut(harmadik, 'behoz', fajl);
      const harmadikLatja = await fut(harmadik);
      return ki.includes('1 szöveg-darab') && be.includes('1 szöveg-darab')
        && harmadikLatja.includes('EZ A SZÖVEG KÜLÖN DARAB');
    } finally {
      if (figyelo) { figyelo.kill(); await varj(1000); }
      for (const h of [gazda, vendeg, harmadik]) await rm(h, { recursive: true, force: true });
    }
  });

export default futtatas;

// Önállóan is futtatható: node koino/meres/parancssorProba.js
if (process.argv[1] && process.argv[1].endsWith('parancssorProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
