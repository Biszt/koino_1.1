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
  return new Promise((teljesul, elakad) => {
    execFile(
      process.execPath, [KOINO_JS, ...ervek],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '' }, timeout: 30000 },
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

export default futtatas;

// Önállóan is futtatható: node koino/meres/parancssorProba.js
if (process.argv[1] && process.argv[1].endsWith('parancssorProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
