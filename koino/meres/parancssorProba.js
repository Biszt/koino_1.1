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
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// ⭐ A néma DHT-gép és a néma tükör próbájához (40. mérés): egy foglalat, ami hall, de nem felel.
import { createSocket } from 'node:dgram';
// ⭐ D78: a lánc-gyökér újraszámolása a láncból (a mérce — a kézi út eseményeit ezzel vetjük össze).
import { lancGyokerLancbol, azonosLancGyoker } from '../js/allapot/lancGyoker.js';
// ⭐ D80: a bizonyíték a kézi úton — a csaló láncát és a vádat a próba MAGA rakja össze.
import { esemenyTarNyitasa, fajlBlobTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese } from '../js/tar/esemenyTar.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese } from '../js/muveletek.js';
import { lancUjEsemenyhez } from '../js/allapot/lancGyoker.js';
// ⭐ D85 T3: a töredék azonosítója (a csomag szeletének kulcsa) — a próba maga számolja.
import { toredekAzonosito } from '../js/allapot/szabalyok.js';

const { proba, futtatas } = probaGyujtemeny('A KÉZI ÚT — a parancssor végigjárása (4. szabály)');

// ⛔ A PRÓBÁK NEM HÍVJÁK A VALÓDI DHT-T (2026-10-03, D91/3): az őrjárat az első körében hirdeti a címjegyzéket —
// belépő nélkül ez a valódi BitTorrent-DHT-ra menne, és a próba a hálózat hangulatát mérné, nem a kódot (a tábla-
// próba elve). Alapból tehát „nincs” belépő; a DHT-t mérő próbák a sajátjukat (a hamis hálót) kifejezetten megadják.
process.env.KOINO_DHT_BELEPOK ??= 'nincs';
// ⭐ D97 (a bekapcsolás): a próbák alapból a „mindent” (a mai, mindent egyeztető) módban futnak — a szigorú (b) eseteit
// külön próbák mérik, kifejezetten „alap”-pal (`KOINO_KISZOLGALAS` — a készülék saját beállítása felülírja).
process.env.KOINO_KISZOLGALAS ??= 'mindent';

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

/**
 * ⭐ D93/1: a vendég készüléket TAGGÁ teszi a parancssorból — belép, a belépése (az azonosság-szelete) a gazdához jut,
 * a gazda meghívja, és a meghívással együtt az azonosság-szelet visszamegy. Csak azt a szeletet viszi (a próbák
 * szándéka, hogy ki mit tart, így nem sérül). ⚠️ A vendégnek már ismernie kell a koinót, ha a gazda nem alapító.
 * @returns {Promise<string>} a vendég horgonya
 */
async function taggaTesziKeszulek(gazda, vendeg, nev = 'tag') {
  const horgony = teljesAzonosito(await fut(vendeg, 'belep'));
  const be = join(vendeg, nev + '-belepes.jsonl');
  const vissza = join(gazda, nev + '-meghivas.jsonl');
  await fut(vendeg, 'kivisz', be, horgony);
  await fut(gazda, 'behoz', be);
  await fut(gazda, 'meghiv', horgony);
  await fut(gazda, 'kivisz', vissza, horgony);
  await fut(vendeg, 'behoz', vissza);
  return horgony;
}

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
async function csereKor(gazda, vendeg, port, kornyezet = {}) {
  const figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
    env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '', ...kornyezet },
    stdio: 'ignore'
  });
  try {
    await varj(2000);
    await fut(vendeg, 'csere', '127.0.0.1', String(port), kornyezet);
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

// ⭐⭐ D85/2 (Csaba, 2026-10-02): a szavazati jog a javaslaton is pontot kíván — és a `szavaz`
// parancs ezt MAGÁTÓL teljesíti (1 pont a javaslatra, a szavazat előtt). ⚠️ Ez a próba a MÁSIK
// készülék szavazatát méri: a javaslattevőét a javaslat-művelet pontozza, tehát az nem mondana
// semmit. Hálózat nincs, a kézi úton (kivisz → behoz) mennek az események; a döntést a jövőből
// kérdezzük (`allapot 1`), hogy ne az óra ütemén múljon.
proba('⭐⭐ D85/2: a MÁSIK készülék parancssori szavazata SZÁMÍT — a `szavaz` a javaslatra is pontot tesz',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    const oda = join(egyik, 'oda.jsonl');
    const vissza = join(masik, 'vissza.jsonl');
    try {
      await fut(egyik, 'koino', 'Próba koinó');
      const gondolat = azonosito(await fut(egyik, 'gondolat', 'EREDETI CÍM'), 'Létrejött:');
      await fut(egyik, 'ertek', gondolat, '51', '0', '3600', '3600');
      const javaslat = azonosito(await fut(egyik, 'javaslat', gondolat, 'ÚJ CÍM'), 'Szerkesztési javaslat beadva');
      if (!javaslat) return false;

      await fut(egyik, 'kivisz', oda);
      await fut(masik, 'behoz', oda);
      await taggaTesziKeszulek(egyik, masik);               // D93/1: a másik TAG (különben a szavazata nem számít)
      await fut(masik, 'pont', gondolat, '10');            // a másik is tulajdonos lesz
      await fut(masik, 'szavaz', javaslat, 'ellenez');
      await fut(masik, 'kivisz', vissza);
      await fut(egyik, 'behoz', vissza);

      // 1 támogató (a javaslattevő) és 1 ellenző: 50% < 51% → ELVETVE. Ha a másik szavazata nem
      // számítana (nincs pontja a javaslaton), 1/1 támogatással ELFOGADVA lenne.
      const kep = await fut(egyik, 'allapot', '1');
      return kep.includes('ELVETVE') && /👍 1 👎 1/.test(kep);
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ⭐ D89/2: a `koino` parancs alapból ZÁRT koinót hoz létre, a `nyilt` szóval nyíltat — és az állapot
// fejléce kimondja. *(A betartatás az E-vel jön; itt a parancs és a mező.)*
proba('⭐ D89/2: a `koino` parancs alapból ZÁRT, `nyilt` szóval NYÍLT koinót hoz létre — a fejléc kimondja',
  async () => {
    const zart = await ujKeszulek();
    const nyilt = await ujKeszulek();
    try {
      await fut(zart, 'koino', 'Zárt koinó', 'a leírása');
      await fut(nyilt, 'koino', 'Nyílt koinó', 'nyilt');
      const kepZart = await fut(zart, 'allapot');
      const kepNyilt = await fut(nyilt, 'allapot');
      return /\(zárt ·/.test(kepZart) && /\(nyílt ·/.test(kepNyilt);
    } finally {
      await rm(zart, { recursive: true, force: true });
      await rm(nyilt, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ B/1–B/2: A `hozd` AZ ÁTMENETI TÁRBA — és a pontom után a tartósba lép elő (2026-10-03)
// ===================================
//
// A gazda `figyel`-lel kiszolgál; a vendég (csak a koinó születését kapta meg) elkér egy gondolatot. ⭐ Mivel
// nem vállalja, az ÁTMENETI tárba kerül (eldobható) — a tartós tár (`esemenyek.jsonl`) nem tartalmazza, az
// állapot „nem tartod”-ot mond, a `vallalas` egy átmeneti szeletet mutat. Ha pontot tesz rá, a következő
// parancs indulásakor ELŐLÉP: a teste a tartós tárba kerül, az átmenetiből elmegy. Viselkedést mérünk (a
// lemezt és az állapotot), nem feliratot.
proba('⭐⭐ B/1–B/2: a `hozd` a nem vállalt gondolatot az ÁTMENETI tárba hozza — a pontom után a tartósba lép elő',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7641;
    let figyelo = null;
    try {
      await fut(gazda, 'koino', 'Hozd-próba');
      const g = azonosito(await fut(gazda, 'gondolat', 'MESSZI'), 'Létrejött:');
      if (!g) return false;
      await fut(gazda, 'kivisz', join(gazda, 'mind.jsonl'));
      const esemenyek = (await readFile(join(gazda, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean)
        .map((x) => JSON.parse(x));
      const gTeljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(gazda, 'kivisz', join(gazda, 'k.jsonl'), koinoTeljes);
      await fut(vendeg, 'behoz', join(gazda, 'k.jsonl'));      // a vendég csak a koinó születését ismeri
      await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);
      const hozva = await fut(vendeg, 'hozd', gTeljes, '127.0.0.1', String(port));
      figyelo.kill();
      figyelo = null;
      await varj(800);

      // A koinó mappája a vendégnél (az egyetlen, amiben tár van).
      const koinoMappa = join(vendeg, (await readdir(vendeg, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name !== 'fajlok').map((d) => d.name)
        .find(Boolean));
      const tartosban = async () => (await readFile(join(koinoMappa, 'esemenyek.jsonl'), 'utf8')).includes(gTeljes);
      const atmenetiben = async () => (await readdir(join(koinoMappa, 'atmeneti'))).includes(gTeljes + '.jsonl');

      const elotte = { tartos: await tartosban(), atmeneti: await atmenetiben() };
      const kep = await fut(vendeg, 'allapot');
      const vallalas1 = await fut(vendeg, 'vallalas');
      await fut(vendeg, 'pont', g, '10');
      const vallalas2 = await fut(vendeg, 'vallalas');     // az indulásakor lép elő
      const utana = { tartos: await tartosban(), atmeneti: await atmenetiben() };

      const ki = {
        hozva: /átmeneti tárba/.test(hozva),
        elotte: !elotte.tartos && elotte.atmeneti,
        kep: kep.includes('MESSZI') && /nem tartod/.test(kep),
        vallalas1: /ÁTMENETI TÁR \(csak láttam — eldobható\): 1 szelet/.test(vallalas1),
        vallalas2: /1 tudatpontos/.test(vallalas2) && /ÁTMENETI TÁR \(csak láttam — eldobható\): 0 szelet/.test(vallalas2),
        utana: utana.tartos && !utana.atmeneti
      };
      if (!Object.values(ki).every(Boolean)) process.stdout.write('  hozd — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
      return Object.values(ki).every(Boolean);
    } finally {
      if (figyelo) figyelo.kill();
      await varj(500);
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D95/1, D95/3: A KÉT FOKÚ VÁLLALÁS A VALÓDI CSERÉBEN (2026-10-05)
// ===================================
//
// Kicsinyített küszöbbel (4 esemény) három készülék: A a koinó alapítója és „mindent” tart (a teljes tartó, az önkéntes),
// B és C tag és tulajdonos egy gondolaton (G), amire A javaslatot tesz. A és B szavaz, C nem — de C tulajdonos, tehát a
// részvétel nevezőjében benne van: 2 / 3 < 70% → a javaslat ELVETVE (ez a teljes tudás). B-hez C pontja nem jut el (G nála
// NAGY, összegezve tartja), tehát a saját eseményeiből 2 / 2-t látna → ELFOGADVA. ⭐ A lezárás után A kiadja a lezárási
// összegzést, és egy valódi csere (`figyel` / `csere`, első találkozás, zárt koinó) után B a mintákkal ellenőrzött
// összegzésből ugyanazt dönti, mint A — miközben G többi eseménye nem jön át hozzá (nem egyezteti halmazként), a SAJÁT új
// eseménye viszont a csak küldő úton eljut A-hoz. Viselkedést mérünk: a két lemezt és a döntést.
proba('⭐⭐ D95/1, D95/3: a NAGY szeletet B összegezve tartja — a lezárási összegzésből A-val egyezően dönt, G többi eseménye nem jön át, a sajátja eljut',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    const c = await ujKeszulek();
    const port = 7654;
    // ⚠️ B a szigorú (b) szerint („alap”); A a `kiszolgalas mindent` beállítással (a fájl felülírja a környezetet).
    const kf = { KOINO_KETFOK_KUSZOB: '4', KOINO_KETFOK_VISSZA: '3', KOINO_KISZOLGALAS: 'alap' };
    const DONTESI_IDO = 14;
    const lemez = async (hely) => {
      await fut(hely, 'kivisz', join(hely, 'lemez.jsonl'));
      return (await readFile(join(hely, 'lemez.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
    };
    const vitel = async (honnan, hova, ...hatokor) => {
      const f = join(honnan, 'vitel-' + Math.random().toString(36).slice(2) + '.jsonl');
      await fut(honnan, 'kivisz', f, ...hatokor);
      await fut(hova, 'behoz', f);
    };
    try {
      await fut(a, 'koino', 'Két fok');
      const g = azonosito(await fut(a, 'gondolat', 'NAGY'), 'Létrejött:');
      if (!g) return false;
      await fut(a, 'ertek', g, '51', '70', String(DONTESI_IDO), String(DONTESI_IDO));
      await vitel(a, b);
      await vitel(a, c);
      await taggaTesziKeszulek(a, b, 'b');
      await taggaTesziKeszulek(a, c, 'c');
      await fut(b, 'pont', g, '5');
      await vitel(b, a, 'sajat');

      const jKezdet = Date.now();
      const javaslat = azonosito(await fut(a, 'javaslat', g, 'NAGY2'), 'Szerkesztési javaslat beadva');
      if (!javaslat) return false;
      await vitel(a, b);
      await fut(b, 'szavaz', javaslat, 'tamogat');
      await vitel(b, a, 'sajat');
      await fut(c, 'pont', g, '4');          // C tulajdonos (a nevezőben), de nem szavaz — B ezt nem látja
      await vitel(c, a, 'sajat');
      await fut(a, 'kiszolgalas', 'mindent');

      // A lezárás után: A kiadja az összegzést; A új pontja (8) és B új pontja (6) — a cserében B-hez nem jöhet A-é.
      await varj(Math.max(0, jKezdet + (DONTESI_IDO + 2) * 1000 - Date.now()));
      const kiadas = await fut(a, 'osszegzes', kf);
      await fut(a, 'pont', g, '8');
      await fut(b, 'pont', g, '6');
      const bElotte = await fut(b, 'allapot');
      await csereKor(a, b, port, kf);

      const aEsemenyek = await lemez(a);
      const bEsemenyek = await lemez(b);
      const pontEsemeny = (lista, pont) => lista.some((e) => e.tipus === 'TudatpontRendezes' && e.adat?.pont === pont
        && e.entitas?.startsWith(g));
      const koinoMappa = join(b, (await readdir(b, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name !== 'fajlok').map((d) => d.name).find(Boolean));
      const t = JSON.parse(await readFile(join(koinoMappa, 'osszegzesek.json'), 'utf8'));
      const gTeljes = Object.keys(t.szeletek).find((k) => k.startsWith(g));
      const aKep = await fut(a, 'allapot');
      const bKep = await fut(b, 'allapot');
      const vallalas = await fut(b, 'vallalas', kf);
      const ki = {
        kiadva: /^1 új lezárási összegzés/m.test(kiadas.replace(/\x1b\[[0-9;]*m/g, '')),
        osszegzo: t.szeletek[gTeljes]?.fok === 'osszegzo' && t.szeletek[gTeljes]?.osszPont > 0,
        lezaras: Object.keys(t.lezarasok).some((k) => k.endsWith('|' + gTeljes)),
        aElvetve: aKep.includes('ELVETVE'),
        bElotteElfogadva: bElotte.includes('ELFOGADVA'),
        bElvetve: bKep.includes('ELVETVE') && !bKep.includes('ELFOGADVA'),
        cPontjaNemJott: !pontEsemeny(bEsemenyek, 4),
        aPontjaNemJott: !pontEsemeny(bEsemenyek, 8),
        bPontjaEljutott: pontEsemeny(aEsemenyek, 6),
        vallalas: /összegezve \(ellenőrzött gyökér/.test(vallalas)
      };
      // A bukás megnevezi magát (a `console.log` a próbák alatt néma).
      if (!Object.values(ki).every(Boolean)) {
        process.stdout.write('  két fok — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
      }
      return Object.values(ki).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
      await rm(c, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D95/2: A TAGSÁGI KÍSÉRŐK A KÉZI ÚTON (2026-10-05)
// ===================================
//
// A gondolatot (G) az alapító (A) hozza létre, C tag (A hívta meg), és pontot tesz G-re. A kiviszi G-t (`kivisz <fájl> <G>`),
// egy friss készülék (D) behozza — semmi mást. ⭐ A kivitel a döntési események szerzőinek tagsági kísérőit is viszi (C
// tagsági lánca, A-nál nincs csomagja), tehát D-nél C pontja SZÁMÍT: nincs „⏳ … nem számít” sor, és G össz-pontja ugyanaz,
// mint A-nál. Viselkedést mérünk (D állapotát), nem feliratot.
proba('⭐⭐ D95/2: az entitás kivitele a szerzők tagsági kísérőit is viszi — a friss készüléken C pontja számít',
  async () => {
    const a = await ujKeszulek();
    const c = await ujKeszulek();
    const d = await ujKeszulek();
    const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
    try {
      await fut(a, 'koino', 'Kísérő');
      const g = azonosito(await fut(a, 'gondolat', 'KÍSÉRT'), 'Létrejött:');
      if (!g) return false;
      await fut(a, 'kivisz', join(a, 'mind.jsonl'));
      await fut(c, 'behoz', join(a, 'mind.jsonl'));
      await taggaTesziKeszulek(a, c, 'c');
      await fut(c, 'pont', g, '7');
      await fut(c, 'kivisz', join(c, 'sajat.jsonl'), 'sajat');
      await fut(a, 'behoz', join(c, 'sajat.jsonl'));
      const esemenyekA = (await readFile(join(a, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
      const gTeljes = esemenyekA.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const koinoTeljes = esemenyekA.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      // D a koinó születését ismeri (enélkül nem volna mihez mérnie a tagságot), aztán G-t kapja.
      await fut(a, 'kivisz', join(a, 'k.jsonl'), koinoTeljes);
      await fut(d, 'behoz', join(a, 'k.jsonl'));
      const ki = tiszta(await fut(a, 'kivisz', join(a, 'g.jsonl'), gTeljes));
      await fut(d, 'behoz', join(a, 'g.jsonl'));
      const pontja = (kep) => Number((tiszta(kep).match(/összes pont: (\d+)/) ?? [])[1] ?? NaN);
      const aKep = await fut(a, 'allapot');
      const dKep = await fut(d, 'allapot');
      const eredmeny = {
        kiserok: /tagsági kísérő/.test(ki),
        nincsFuggo: !/nem számít, amíg a szerzője tagsága/.test(tiszta(dKep)),
        ugyanannyi: pontja(dKep) === pontja(aKep) && pontja(aKep) > 7
      };
      if (!Object.values(eredmeny).every(Boolean)) {
        process.stdout.write('  kísérő — ami bukott: ' + Object.keys(eredmeny).filter((k) => !eredmeny[k]).join(', ') + '\n');
      }
      return Object.values(eredmeny).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(c, { recursive: true, force: true });
      await rm(d, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D95/3: A CSAK KÜLDŐ ÚT A VALÓDI CSERÉBEN (2026-10-05)
// ===================================
//
// A (az alapító) meghívja B-t: a meghívás B azonosság-szeletébe kerül, amit A nem vállal. Az első cserén (zárt koinó, első
// találkozás — a kapu még nem döntött) A a csak küldő úton felajánlja, B átveszi, és A feljegyzi, hogy kézbesült
// (`kezbesites.json`) — a következő cserén már nem ajánlja fel. ⚠️ Mai módban a meghívás a szelet-cserével is átmenne,
// ezért a megkülönböztető viselkedés a KÉZBESÍTÉS feljegyzése A lemezén (és hogy a második cserén a `vallalas` már nem
// mutat kézbesítésre várót).
proba('⭐⭐ D95/3: a meghívás a csak küldő úton megy — A feljegyzi a kézbesítést, és többé nem ajánlja fel',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    const port = 7655;
    const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
    try {
      await fut(a, 'koino', 'Küldő');
      const horgony = teljesAzonosito(await fut(b, 'belep'));
      await fut(b, 'kivisz', join(b, 'be.jsonl'), horgony);
      await fut(a, 'behoz', join(b, 'be.jsonl'));
      await fut(a, 'meghiv', horgony);
      const varoElotte = tiszta(await fut(a, 'vallalas'));
      await fut(a, 'kivisz', join(a, 'mind.jsonl'));
      const meghivas = (await readFile(join(a, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x))
        .find((e) => e.tipus === 'Meghivas').azonosito;
      await csereKor(a, b, port);
      const koinoMappa = join(a, (await readdir(a, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && d.name !== 'fajlok').map((d) => d.name).find(Boolean));
      let kezbesites = {};
      try { kezbesites = JSON.parse(await readFile(join(koinoMappa, 'kezbesites.json'), 'utf8')).kezbesitve ?? {}; } catch { /* nincs */ }
      await fut(b, 'kivisz', join(b, 'mind.jsonl'));
      const bNal = (await readFile(join(b, 'mind.jsonl'), 'utf8')).includes(meghivas);
      const varoUtana = tiszta(await fut(a, 'vallalas'));
      const eredmeny = {
        vartElotte: /saját eseményem vár kézbesítésre/.test(varoElotte),
        bNal,
        feljegyezve: !!kezbesites[meghivas],
        nemVarUtana: !/saját eseményem vár kézbesítésre/.test(varoUtana)
      };
      if (!Object.values(eredmeny).every(Boolean)) {
        process.stdout.write('  csak küldő — ami bukott: ' + Object.keys(eredmeny).filter((k) => !eredmeny[k]).join(', ') + '\n');
      }
      return Object.values(eredmeny).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ A BEKAPCSOLÁS (D97): A SZIGORÚ (b) A VALÓDI CSERÉBEN (2026-10-08)
// ===================================
//
// „Alap” beállítással egy készülék csak abban vesz részt, amit vállal (a pozitív pontú szeleteiben). A két gondolatot (G,
// H) A hozza létre; B csak G-re tesz pontot. A csere után B megkapja A új G-beli eseményét, H-ét NEM (H-ból csak a
// születés jut el hozzá, a gyökér darabján). ⭐ Viselkedést mérünk: B lemezét. Rontás: „mindent” módban H is átjön.
const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
const lemezen = async (hely) => {
  await fut(hely, 'kivisz', join(hely, 'lemez.jsonl'));
  return (await readFile(join(hely, 'lemez.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
};

proba('⭐⭐ D97: az „alap” készülék csak a VÁLLALT gondolat eseményeit kapja meg — a másikét nem („mindent” módban igen)',
  async () => {
    const futas = async (mod, port) => {
      const a = await ujKeszulek();
      const b = await ujKeszulek();
      const kornyezet = { KOINO_KISZOLGALAS: mod };
      try {
        await fut(a, 'koino', 'Szigorú', 'próba', 'nyilt');
        const g = azonosito(await fut(a, 'gondolat', 'GE'), 'Létrejött:');
        const h = azonosito(await fut(a, 'gondolat', 'HA'), 'Létrejött:');
        const elso = await lemezen(a);
        const gT = elso.find((e) => e.tipus === 'GondolatLetrehozas' && e.azonosito.startsWith(g)).azonosito;
        const kT = elso.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
        await fut(a, 'kivisz', join(a, 'k.jsonl'), kT);
        await fut(b, 'behoz', join(a, 'k.jsonl'));
        await fut(a, 'kivisz', join(a, 'g.jsonl'), gT);
        await fut(b, 'behoz', join(a, 'g.jsonl'));
        await fut(b, 'pont', g, '5');                       // B csak G-t vállalja
        await fut(a, 'pont', g, '7');
        await fut(a, 'pont', h, '7');
        const ujak = (await lemezen(a)).filter((e) => e.tipus === 'TudatpontRendezes' && e.adat?.pont === 7);
        const ujG = ujak.find((e) => e.entitas?.startsWith(g)).azonosito;
        const ujH = ujak.find((e) => e.entitas?.startsWith(h)).azonosito;
        await csereKor(a, b, port, kornyezet);
        const bNal = new Set((await lemezen(b)).map((e) => e.azonosito));
        return { g: bNal.has(ujG), h: bNal.has(ujH) };
      } finally {
        await rm(a, { recursive: true, force: true });
        await rm(b, { recursive: true, force: true });
      }
    };
    const alap = await futas('alap', 7656);
    const mindent = await futas('mindent', 7657);
    const ki = { alapG: alap.g, alapNemH: !alap.h, mindentH: mindent.h };
    if (!Object.values(ki).every(Boolean)) process.stdout.write('  szigorú — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
    return Object.values(ki).every(Boolean);
  });

// A B2 a valódi cserében: C tag, és pontot tesz G-re; B (alap) csak G-t vállalja — C azonosság-szeletében nem vesz részt.
// A csere G-ből C pontját hozza, a tagsági kör pedig C tagságát (A-nál C-nek nincs csomagja: a láncát adja). ⭐ B
// állapotában C pontja SZÁMÍT (nincs „nem számít, amíg a szerzője tagsága…” sor). Rontás: lásd a próba utáni sort.
proba('⭐⭐ D95/2 a cserében: az „alap” B-nél C pontja számít — a tagsági kör hozza C tagságát (az azonosság-szeletét nem egyezteti)',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    const c = await ujKeszulek();
    const port = 7658;
    const kornyezet = { KOINO_KISZOLGALAS: 'alap' };
    try {
      await fut(a, 'koino', 'Kísérő-csere', 'próba', 'nyilt');
      const g = azonosito(await fut(a, 'gondolat', 'GE'), 'Létrejött:');
      const elso = await lemezen(a);
      const gT = elso.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const kT = elso.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      for (const x of [b, c]) {
        await fut(a, 'kivisz', join(a, 'k.jsonl'), kT);
        await fut(x, 'behoz', join(a, 'k.jsonl'));
        await fut(a, 'kivisz', join(a, 'g.jsonl'), gT);
        await fut(x, 'behoz', join(a, 'g.jsonl'));
      }
      await taggaTesziKeszulek(a, b, 'b');
      await taggaTesziKeszulek(a, c, 'c');
      await fut(b, 'pont', g, '3');
      await fut(c, 'pont', g, '4');
      await fut(c, 'kivisz', join(c, 'sajat.jsonl'), 'sajat');
      await fut(a, 'behoz', join(c, 'sajat.jsonl'));
      await csereKor(a, b, port, kornyezet);
      const bKep = tiszta(await fut(b, 'allapot'));
      const aKep = tiszta(await fut(a, 'allapot'));
      const pontja = (kep) => Number((kep.match(/összes pont: (\d+)/) ?? [])[1] ?? NaN);
      const ki = { nincsFuggo: !/nem számít, amíg a szerzője tagsága/.test(bKep), ugyanannyi: pontja(bKep) === pontja(aKep) };
      if (!Object.values(ki).every(Boolean)) process.stdout.write('  kísérő a cserében — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
      return Object.values(ki).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
      await rm(c, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D97/2: A RAJ A KÖRBEN — az őrjárat a vállalt szeletem tartóját is felkeresi (2026-10-09)
// ===================================
//
// A és B (mindkettő „alap”) vállalja G-t. Egy csere után A a raj-jegyzékében B-t G tartójaként tartja számon; aztán A
// elfelejti a kötéseit és a friss címeit — B-t CSAK a raj-jegyzékből ismeri. A új pontot tesz G-re, és elindítja az
// őrjáratot: a kör raj-céljai közt ott B, tehát a változás eljut hozzá. ⭐ Viselkedést mérünk: B lemezén A új eseménye.
// Rontás: raj-célok nélkül A-nak nincs kire kopognia.
proba('⭐⭐ D97/2: az őrjárat a vállalt szeletem TARTÓJÁT is felkeresi (a raj-jegyzékből) — a változás eljut hozzá',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    const PA = 7660, PB = 7659;
    const kornyezet = { KOINO_KISZOLGALAS: 'alap' };
    let figyelo = null, orjarat = null;
    try {
      await fut(a, 'koino', 'Raj-kör', 'próba', 'nyilt');
      const g = azonosito(await fut(a, 'gondolat', 'GE'), 'Létrejött:');
      const elso = await lemezen(a);
      const gT = elso.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const kT = elso.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(a, 'kivisz', join(a, 'k.jsonl'), kT);
      await fut(b, 'behoz', join(a, 'k.jsonl'));
      await fut(a, 'kivisz', join(a, 'g.jsonl'), gT);
      await fut(b, 'behoz', join(a, 'g.jsonl'));
      await fut(b, 'pont', g, '5');
      await csereKor(b, a, PB, kornyezet);              // A hívja B-t (B figyel): A megtanulja B-t G tartójaként
      const raj = JSON.parse(await readFile(join(a, 'szeletcimek.json'), 'utf8')).szeletek ?? [];
      const tanulta = raj.some((x) => x.entitas === gT && x.port === PB);
      for (const f of ['kotesek.json', 'udpcimek.json', 'indulocimek.json']) await rm(join(a, f), { force: true });
      await fut(a, 'pont', g, '9');
      const uj = (await lemezen(a)).find((e) => e.tipus === 'TudatpontRendezes' && e.adat?.pont === 9).azonosito;
      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(PB)], {
        env: { ...process.env, KOINO_ADAT: b, KOINO_NAPLO: '', ...kornyezet }, stdio: 'ignore' });
      await varj(1500);
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', String(PA)], {
        env: { ...process.env, KOINO_ADAT: a, KOINO_NAPLO: '', ...kornyezet }, stdio: 'ignore' });
      let megjott = false;
      for (let i = 0; i < 40 && !megjott; i++) {
        await varj(500);
        megjott = (await readFile(join(b, 'sajat', 'esemenyek.jsonl'), 'utf8').catch(() => '')).includes(uj);
      }
      const ki = { tanulta, megjott };
      if (!Object.values(ki).every(Boolean)) process.stdout.write('  raj a körben — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
      return Object.values(ki).every(Boolean);
    } finally {
      for (const f of [orjarat, figyelo]) if (f) f.kill();
      await varj(800);
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D98/1 (F): A TÁRSANKÉNTI EMLÉKEZET A VALÓDI CSERÉBEN (2026-10-09)
// ===================================
//
// Két készülék kétszer cserél (`figyel` + `csere`), aztán A új gondolatot ír, és harmadszor is cserélnek. ⭐ Viselkedést
// mérünk: a két készülék lemezén ott a társ alatti feljegyzés (`emlekezet.json` — a tár állása a csere végén: annyi, ahány
// esemény a saját tárában van), és a harmadik csere után B-nél ott A új gondolata, a feljegyzés pedig előrébb lépett.
// Rontás: a `koino.js` nem adja át a tárolót → nincs `emlekezet.json`.
proba('⭐⭐ D98/1: a csere végén a társ alatt feljegyződik a tár állása — és a következő cserén a változás átjön, a feljegyzés előrelép',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    try {
      await fut(a, 'koino', 'Emlékezet', 'próba', 'nyilt');
      await fut(a, 'kivisz', join(a, 'mind.jsonl'));
      await fut(b, 'behoz', join(a, 'mind.jsonl'));
      await csereKor(a, b, 7961);
      await csereKor(a, b, 7961);
      const feljegyzes = async (h) => {
        try { return Object.values(JSON.parse(await readFile(join(h, 'sajat', 'emlekezet.json'), 'utf8')).tarsak ?? {}); }
        catch { return []; }
      };
      const sorok = async (h) => (await readFile(join(h, 'sajat', 'esemenyek.jsonl'), 'utf8')).split('\n').filter(Boolean).length;
      const aElotte = await feljegyzes(a), bElotte = await feljegyzes(b);
      const g = azonosito(await fut(a, 'gondolat', 'Az emlékezet után'), 'Létrejött:');
      await csereKor(a, b, 7961);
      const aUtana = await feljegyzes(a), bUtana = await feljegyzes(b);
      const bTar = await readFile(join(b, 'sajat', 'esemenyek.jsonl'), 'utf8');
      const ki = {
        elotteFeljegyezve: aElotte.length === 1 && bElotte.length === 1 && bElotte[0].n === (await sorok(b)) - 2,
        megjott: !!g && bTar.includes(g),
        elorelepett: aUtana.length === 1 && bUtana.length === 1 && bUtana[0].n === await sorok(b) && aUtana[0].n === await sorok(a)
          && bUtana[0].n > bElotte[0].n
      };
      if (!Object.values(ki).every(Boolean)) {
        process.stdout.write('  emlékezet — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ')
          + ' · ' + JSON.stringify({ aElotte, bElotte, aUtana, bUtana, sorokA: await sorok(a), sorokB: await sorok(b) }) + '\n');
      }
      return Object.values(ki).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D98/2–4: A LÁNC-KÖR A VALÓDI CSERÉBEN — a két ágú szerző (2026-10-09)
// ===================================
//
// X (az alapító) két készüléken ugyanazzal a kulccsal ír (A1, A2): a közös előtag után A1 a G-re tesz pontot (a 6.
// esemény), A2 a G2-re (az ő 6.-a) és a G-re (a 7.). H („alap” módban) csak a G-t vállalja: A1-től megkapja X 6. eseményét,
// A2-től a 7.-et — a két ág eseményei KÜLÖNBÖZŐ sorszámon találkoznak nála (az észlelő ezt nem látja). ⭐ A lánc-kör A2-t
// kérdezi: a 7. esemény láncán a 6. helyen MÁS áll, mint ami H-nál van — A2 kiadja a sajátját, és H bejelenti az
// elágazást X azonosság-szeletébe. Viselkedést mérünk: H lemezén ott az `Ellentmondas` (elágazás, X ellen), és a
// lánc-ellenőrzés feljegyzése. Rontás: a `koino.js` nem köti be a lánc-kört → nincs bizonyíték.
proba('⭐⭐ D98/2–4: a két ágú szerző eseményei egy harmadik készüléken különböző sorszámon találkoznak — a lánc-kör bizonyítja az elágazást',
  async () => {
    const a1 = await ujKeszulek();
    const a2 = await ujKeszulek();
    const h = await ujKeszulek();
    const alap = { KOINO_KISZOLGALAS: 'alap' };
    try {
      await fut(a1, 'koino', 'Lánc', 'próba', 'nyilt');
      const g = azonosito(await fut(a1, 'gondolat', 'G'), 'Létrejött:');
      const g2 = azonosito(await fut(a1, 'gondolat', 'G2'), 'Létrejött:');
      await fut(a1, 'pont', g, '5');
      await fut(a1, 'pont', g2, '5');
      await fut(a1, 'kivisz', join(a1, 'mind.jsonl'));
      await fut(a1, 'mentes', join(a1, 'kulcs-mentes.json'));
      await fut(a2, 'visszatolt', join(a1, 'kulcs-mentes.json'), 'felulir');
      await fut(a2, 'behoz', join(a1, 'mind.jsonl'));
      await fut(h, 'behoz', join(a1, 'mind.jsonl'));
      await fut(h, 'pont', g, '3');                          // H a G-t vállalja (a G2-t nem)
      await fut(a1, 'pont', g, '7');                         // az A ág: X 6. eseménye
      await fut(a2, 'pont', g2, '6');                        // a B ág: X 6. eseménye (más)
      await fut(a2, 'pont', g, '9');                         // a B ág: X 7. eseménye
      await csereKor(a1, h, 7962, alap);
      await csereKor(a2, h, 7963, alap);
      const olvas = async (m) => (await readFile(join(m, 'sajat', 'esemenyek.jsonl'), 'utf8')).split('\n').filter(Boolean)
        .map((x) => JSON.parse(x));
      const esemenyek = await olvas(h);
      const x = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas')?.szerzo;
      const utolso = (lista) => lista.filter((e) => e.szerzo === x).sort((p, q) => q.sorszam - p.sorszam)[0];
      const aAg = utolso(await olvas(a1));                     // az A ág utolsója (k)
      const a2Esemenyei = await olvas(a2);
      const bFej = utolso(a2Esemenyei.filter((e) => e.koino === aAg.koino && e.szerzo === x && e.adat?.entitas !== undefined
        && a2Esemenyei.some((f) => f.azonosito === e.elozo && f.sorszam === aAg.sorszam)));        // a B ág k+1.-e
      const bAg = a2Esemenyei.find((e) => e.szerzo === x && e.sorszam === aAg.sorszam && e.azonosito !== aAg.azonosito);
      const vad = esemenyek.find((e) => e.tipus === 'Ellentmondas' && e.adat?.fajta === 'elagazas' && e.adat?.kit === x);
      let feljegyzes = null;
      try { feljegyzes = JSON.parse(await readFile(join(h, 'sajat', 'lancellenorzes.json'), 'utf8')); } catch { feljegyzes = null; }
      const ki = {
        // H-nál X két ágának eseményei KÜLÖNBÖZŐ sorszámon: az A ág k.-a (A1-től) és a B ág k+1.-e (A2-től)
        kulonSorszamon: !!aAg && !!bFej && !!bAg && bFej.sorszam === aAg.sorszam + 1
          && esemenyek.some((e) => e.azonosito === aAg.azonosito) && esemenyek.some((e) => e.azonosito === bFej.azonosito),
        // a bizonyíték a két k. esemény (az A ágé és a B ágé) — a B ág k.-a csak a lánc-körből jöhetett
        bizonyitek: !!vad && [vad.adat.esemeny?.azonosito, vad.adat.masik?.azonosito].sort().join()
          === [aAg.azonosito, bAg.azonosito].sort().join(),
        feljegyezve: !!feljegyzes?.szerzok?.[x]
      };
      if (!Object.values(ki).every(Boolean)) {
        process.stdout.write('  lánc-kör — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ')
          + ' · ' + JSON.stringify({ aAg: aAg?.sorszam, bFej: bFej?.sorszam, bAg: !!bAg }) + '\n');
      }
      return Object.values(ki).every(Boolean);
    } finally {
      for (const m of [a1, a2, h]) await rm(m, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D75/1, D73 (a bekapcsolás): A VISSZAVETT VÁLLALÁS ÉS A TÁR TÖMÖRÍTÉSE (2026-10-09)
// ===================================
//
// B („alap”) vállalja G-t (megkapja az eseményeit, pontot tesz rá), aztán visszavonja a pontját. A `tomorit` után a
// tartós tárban NINCS ott A G-re tett pontja (az átmeneti tárba került), de ott marad B saját minden eseménye, a koinó
// születése és G születése (a gyökér-darabja). ⭐ Viselkedést mérünk: a két tár fájlját. Rontás: a `tomorit proba` nem ír.
proba('⭐⭐ D75/1: a visszavett vállalás a TÖMÖRÍTÉSSEL az átmeneti tárba kerül — a saját eseményeim és a koinó születése maradnak',
  async () => {
    const a = await ujKeszulek();
    const b = await ujKeszulek();
    const kornyezet = { KOINO_KISZOLGALAS: 'alap' };
    try {
      await fut(a, 'koino', 'Tömörítés', 'próba', 'nyilt');
      const g = azonosito(await fut(a, 'gondolat', 'GE'), 'Létrejött:');
      await fut(a, 'kivisz', join(a, 'mind.jsonl'));
      await fut(b, 'behoz', join(a, 'mind.jsonl'));
      const aEsemenyei = (await readFile(join(a, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
      const aPont = aEsemenyei.find((e) => e.tipus === 'TudatpontRendezes').azonosito;
      const szul = aEsemenyei.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      const gT = aEsemenyei.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      await fut(b, 'pont', g, '5');
      await fut(b, 'pont', g, '0');                         // a vállalás visszavéve
      const proba = tiszta(await fut(b, 'tomorit', 'proba', kornyezet));
      const elotte = await readFile(join(b, 'sajat', 'esemenyek.jsonl'), 'utf8');
      const kesz = tiszta(await fut(b, 'tomorit', kornyezet));
      const tartos = await readFile(join(b, 'sajat', 'esemenyek.jsonl'), 'utf8');
      const atmeneti = (await readdir(join(b, 'sajat', 'atmeneti')).catch(() => []));
      let atmenetiTartalom = '';
      // ⚠️ Fájlonként sortöréssel: a `megnezett.json` végén nincs, és a következő fájl első sora különben hozzáragadna.
      for (const f of atmeneti) atmenetiTartalom += (await readFile(join(b, 'sajat', 'atmeneti', f), 'utf8')) + '\n';
      // ⚠️ Azonosító szerint nézzük, nem szövegként: B saját pont-eseményei a `latott` mezőben hivatkoznak A eseményére.
      const azonositok = (szoveg) => new Set(szoveg.split('\n').filter((x) => x.trim().startsWith('{"'))
        .map((x) => { try { return JSON.parse(x).azonosito; } catch { return null; } }));
      const tartosAz = azonositok(tartos);
      const aSzerzo = aEsemenyei.find((e) => e.azonosito === aPont).szerzo;
      const sajatPontok = tartos.split('\n').filter(Boolean).map((x) => JSON.parse(x)).filter((e) => e.tipus === 'TudatpontRendezes'
        && e.entitas === gT && e.szerzo !== aSzerzo).length;
      const ki = {
        probaNemIrt: /kerülne az átmenetibe/.test(proba) && azonositok(elotte).has(aPont),
        kiirta: /Tömörítve/.test(kesz),
        tartosbolKiment: !tartosAz.has(aPont),
        atmenetibeKerult: azonositok(atmenetiTartalom).has(aPont),
        maradt: tartosAz.has(szul) && tartosAz.has(gT) && sajatPontok === 2
      };
      if (!Object.values(ki).every(Boolean)) process.stdout.write('  tömörítés — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
      return Object.values(ki).every(Boolean);
    } finally {
      await rm(a, { recursive: true, force: true });
      await rm(b, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D91: A RAJ A VALÓDI CSERÉBEN — a két tartó egymást jegyzi meg (2026-10-03)
// ===================================
//
// Mindkét készülék vállalja ugyanazt a gondolatot (pontja van rajta), és mindkettőnél van egy eseménye, ami
// a másiknál nincs — tehát a szelet eltér. ⭐ A csere után mindkettő a MÁSIKAT jegyzi tartónak a
// `szeletcimek.json`-ban, a hitelesített készülék-azonosítójával (tábla-aláíró, név nélkül). Viselkedést mérünk:
// a lemezt.
proba('⭐⭐ D91: a csere után a két tartó egymást jegyzi a raj-jegyzékben — készülék-azonosítóval, név nélkül',
  async () => {
    const egyik = await ujKeszulek();
    const masik = await ujKeszulek();
    try {
      await fut(egyik, 'koino', 'Raj-próba');
      const g = azonosito(await fut(egyik, 'gondolat', 'KOZOS'), 'Létrejött:');
      if (!g) return false;
      await fut(egyik, 'kivisz', join(egyik, 'mind.jsonl'));
      await fut(masik, 'behoz', join(egyik, 'mind.jsonl'));
      await taggaTesziKeszulek(egyik, masik);   // ⭐ D93/3: zárt koinó — a masik TAG (különben csak a születést kapná)
      const gTeljes = (await readFile(join(egyik, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean)
        .map((x) => JSON.parse(x)).find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      await fut(egyik, 'pont', g, '20');          // mindkettő vállalja, és a pont-eseményük a másiknál nincs meg
      await fut(masik, 'pont', g, '10');
      await csereKor(egyik, masik, 7651);
      const jegyzek = async (hely) => {
        try { return JSON.parse(await readFile(join(hely, 'szeletcimek.json'), 'utf8')).szeletek ?? []; }
        catch { return []; }
      };
      const jo = (lista) => lista.some((b) => b.entitas === gTeljes && /^[A-Za-z0-9_-]{43}$/.test(b.alairo ?? '')
        && !('szerzo' in b) && !('nev' in b));
      return jo(await jegyzek(egyik)) && jo(await jegyzek(masik));
    } finally {
      await rm(egyik, { recursive: true, force: true });
      await rm(masik, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D92: A KÉRELEM A PARANCSSORBÓL — a fejlécek mintákkal, és a törzs (2026-10-03)
// ===================================
//
// A gazda (`figyel`) egy gondolatot tart, szöveggel; a vendég csak a koinó születését ismeri. ⭐ A `kerelem fejlecek
// gyoker` után a gondolat létrehozó eseménye a vendég ÁTMENETI tárában van (a lemezén — nem a tartósban), és a
// mintákkal ellenőrizve; a `kerelem torzs` után a szöveg-darab a vendég FÁJL-TÁRÁBAN van, és az állapot kiírja a
// szöveget. Viselkedést mérünk: a vendég lemezét.
proba('⭐⭐ D92: a `kerelem fejlecek` az átmeneti tárba hozza a fejlécet (mintákkal ellenőrizve), a `kerelem torzs` a szöveget',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const port = 7672;
    let figyelo = null;
    try {
      await fut(gazda, 'koino', 'Kérelem-próba');
      const g = azonosito(await fut(gazda, 'gondolat', 'TAVOLI', 'A TÁVOLI GONDOLAT SZÖVEGE'), 'Létrejött:');
      if (!g) return false;
      await fut(gazda, 'kivisz', join(gazda, 'mind.jsonl'));
      const esemenyek = (await readFile(join(gazda, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean)
        .map((x) => JSON.parse(x));
      const gTeljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const szovegLenyomat = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').adat.szoveg?.lenyomat;
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(gazda, 'kivisz', join(gazda, 'k.jsonl'), koinoTeljes);
      await fut(vendeg, 'behoz', join(gazda, 'k.jsonl'));
      await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '' }, stdio: 'ignore'
      });
      await varj(2000);
      const fejlecek = await fut(vendeg, 'kerelem', 'fejlecek', 'gyoker', '127.0.0.1', String(port));
      const tartosEsemenyek = await readFile(join(vendeg, 'sajat', 'esemenyek.jsonl'), 'utf8').catch(() => '');
      const atmenetiben = (await readdir(join(vendeg, 'sajat', 'atmeneti')).catch(() => [])).includes(gTeljes + '.jsonl');
      const torzs = await fut(vendeg, 'kerelem', 'torzs', gTeljes, '127.0.0.1', String(port));
      figyelo.kill();
      figyelo = null;
      await varj(800);
      const blob = fajlBlobTarolo('sajat', vendeg);
      const szovegMegvan = !!szovegLenyomat && await blob.van(szovegLenyomat);
      const kep = await fut(vendeg, 'allapot');

      const jo = {
        fejlec: /TAVOLI/.test(fejlecek) && /✓ ellenőrizve \(\d+ minta\)/.test(fejlecek),
        atmeneti: atmenetiben && !tartosEsemenyek.includes(gTeljes),
        torzs: /1\/1 fájl megvan/.test(torzs) && szovegMegvan,
        allapot: kep.includes('A TÁVOLI GONDOLAT SZÖVEGE') && /nem tartod/.test(kep)
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (kérelem-próba: ' + JSON.stringify(jo) + ')\n');
        return false;
      }
      return true;
    } finally {
      if (figyelo) figyelo.kill();
      await varj(500);
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D92/1: A KOPOGTATÁS — a cím nélküli kérés, végig (2026-10-03)
// ===================================
//
// HAMIS DHT-n. A kérő (R) NEM tudja a tartó (H) címét: a `kerelem fejlecek gyoker` csak FÜGGŐ kérelmet vesz fel, és a
// gyökér-darab kopogtató témáján bejelenti a futó kapuja címét. ⭐ A tartó őrjárata a címjegyzék-körében ránéz a
// hirdetett darabja párjára, meglátja R-t, és a következő körben FELÉ kopog; R munkája (ismeretlen bekopogó, miközben
// kopogtatunk) a csere helyett a kérelmet futtatja. Viselkedést mérünk: R lemezén (az átmeneti tárban) ott a H
// gondolatának létrehozó eseménye, és a függő kérelem kész lett. ⚠️ A hurok-címen nincs NAT — azt, hogy a kopogtatás
// nélkül ez NEM menne, itt az mutatja meg, hogy R egyáltalán nem ismeri H címét (nincs kire kopognia).
proba('⭐⭐ D92/1: a KOPOGTATÁS végig — a cím nélküli kérés függő lesz, a tartó a kopogtató témán meglátja és felé kopog, a fejléc megjön',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const H = await ujKeszulek();
    const R = await ujKeszulek();
    const halo = await hamisHalozat(12);
    const PH = 7674, PR = 7673;
    const dht = { KOINO_DHT_BELEPOK: halo.belepo(0), KOINO_TUKOR: '127.0.0.1:9' };
    const orjarat = (hely, port) => spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...dht }, stdio: ['ignore', 'pipe', 'pipe'] });
    let h = null, r = null;
    try {
      await fut(H, 'koino', 'Kopogtatás-próba');
      const g = azonosito(await fut(H, 'gondolat', 'KOPOGTATOTT'), 'Létrejött:');
      if (!g) return false;
      await fut(H, 'kivisz', join(H, 'mind.jsonl'));
      const esemenyek = (await readFile(join(H, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
      const gTeljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(H, 'kivisz', join(H, 'k.jsonl'), koinoTeljes);
      await fut(R, 'behoz', join(H, 'k.jsonl'));
      await taggaTesziKeszulek(H, R);   // ⭐ D93/3: zárt koinó — a R TAG (különben csak a születést kapná)

      // 1. R kapuja fut (az őrjárat felírja a portját), és R felveszi a cím nélküli kérelmet.
      let rKimenet = '';
      r = orjarat(R, PR);
      r.stdout.on('data', (d) => { rKimenet += d; });
      for (let i = 0; i < 20 && !/ŐRJÁRAT/.test(rKimenet); i++) await varj(250);
      const felvetel = await fut(R, 'kerelem', 'fejlecek', 'gyoker', dht);

      // 2. H őrjárata: az első címjegyzék-körében ránéz a kopogtató témáira.
      let hKimenet = '';
      h = orjarat(H, PH);
      h.stdout.on('data', (d) => { hKimenet += d; });
      let megjott = false;
      for (let i = 0; i < 60 && !megjott; i++) {
        await varj(500);
        megjott = (await readdir(join(R, 'sajat', 'atmeneti')).catch(() => [])).includes(gTeljes + '.jsonl');
      }
      await varj(1000);
      const allas = await fut(R, 'kerelem', dht);
      const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
      const jo = {
        fuggo: /FÜGGŐ KÉRELEM: fejlecek a gyökér/.test(felvetel) && /[1-9]\d* kopogtató téma/.test(felvetel),
        tartoLatta: /kopogtatás: 1 kérő vár rám/.test(tiszta(hKimenet)),
        megjott,
        kesz: /megjött: [1-9]\d* fejléc/.test(tiszta(allas)) && /FÜGGŐ KÉRELMEK: 0/.test(tiszta(allas))
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (kopogtatás-próba: ' + JSON.stringify(jo) + ')\n'
          + '    (H: ' + tiszta(hKimenet).replace(/\s+/g, ' ').slice(-500) + ')\n'
          + '    (R: ' + tiszta(rKimenet).replace(/\s+/g, ' ').slice(-500) + ')\n');
        return false;
      }
      return true;
    } finally {
      for (const f of [h, r]) if (f) f.kill();
      halo.bezar();
      await varj(500);
      await rm(H, { recursive: true, force: true });
      await rm(R, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D92/1 (c), D87: A TOVÁBBADÁS — R → P → H, és a válasz lépésenként vissza (2026-10-03)
// ===================================
//
// Három őrjárat. R csak P-t ismeri (induló cím), P ismeri H-t, a szeletet egyedül H tartja. R a `kerelem szelet`-tel
// (cím nélkül) függő kérelmet vesz fel; P nem tartja, ÁTVESZI (`ATVESZEM`), a saját körében H-tól elkéri, és a választ
// R-nek viszi vissza (`VALASZ`). ⭐ Viselkedést mérünk: R lemezén (az átmeneti tárban) ott a szelet, a függő kérelem
// „megjött továbbadva”, P átvette és visszavitte — és ⛔ D87: a kérelem, amit H kiszolgál, P-től jön, R címéről soha
// (a tartó nem tudja meg, ki kérdez). ⚠️ Azt NEM állítjuk, hogy H soha nem hallja R címét: a terjedő címjegyzék (a friss
// UDP-címek, D36–D39) P-n át továbbadja — mérve (a rontás-próbánál); de az nem árulja el, hogy R kért valamit. ⚠️ Hogy P a továbbadott választ NEM teszi a tárába (K2), azt itt nem lehet mérni: a szigorú
// (b) (B/3) előtt a P–H csere úgyis mindent átvisz (mérve: P a saját cseréjében megkapta a szeletet). A K2 építőköveit
// (a tár nélküli szelet-kérés, a memóriabeli fájl-tár) a `kerelemProba.js` méri.
proba('⭐⭐ D92/1 (c): a TOVÁBBADÁS — R → P → H, a válasz lépésenként vissza; H nem tudja, ki kérdez',
  async () => {
    const H = await ujKeszulek();
    const P = await ujKeszulek();
    const R = await ujKeszulek();
    const PH = 7675, PP = 7676, PR = 7677;
    const helyben = { KOINO_DHT_BELEPOK: 'nincs', KOINO_TUKOR: '127.0.0.1:9' };
    const orjarat = (hely, port) => spawn(process.execPath, [KOINO_JS, 'orjarat', '0.1', String(port)],
      { env: { ...process.env, KOINO_ADAT: hely, KOINO_NAPLO: '', ...helyben }, stdio: ['ignore', 'pipe', 'pipe'] });
    const futok = [];
    try {
      await fut(H, 'koino', 'Továbbadás-próba');
      const g = azonosito(await fut(H, 'gondolat', 'MESSZE'), 'Létrejött:');
      if (!g) return false;
      await fut(H, 'kivisz', join(H, 'mind.jsonl'));
      const esemenyek = (await readFile(join(H, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
      const gTeljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(H, 'kivisz', join(H, 'k.jsonl'), koinoTeljes);
      await fut(P, 'behoz', join(H, 'k.jsonl'));
      await fut(R, 'behoz', join(H, 'k.jsonl'));
      await taggaTesziKeszulek(H, P);   // ⭐ D93/3: zárt koinó — a P TAG (különben csak a születést kapná)
      await taggaTesziKeszulek(H, R);   // ⭐ D93/3: zárt koinó — a R TAG (különben csak a születést kapná)
      await fut(P, 'tars', '127.0.0.1', String(PH), 'H');
      await fut(R, 'tars', '127.0.0.1', String(PP), 'P');
      await fut(R, 'kerelem', 'szelet', gTeljes, helyben);

      const naplo = { H: '', P: '', R: '' };
      for (const [nev, hely, port] of [['H', H, PH], ['P', P, PP], ['R', R, PR]]) {
        const f = orjarat(hely, port);
        f.stdout.on('data', (d) => { naplo[nev] += d; });
        futok.push(f);
      }
      let megjott = false;
      for (let i = 0; i < 90 && !megjott; i++) {
        await varj(500);
        megjott = (await readdir(join(R, 'sajat', 'atmeneti')).catch(() => [])).includes(gTeljes + '.jsonl');
      }
      await varj(1000);
      const allas = await fut(R, 'kerelem', helyben);
      const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
      const jo = {
        megjott,
        tovabbadva: /megjött továbbadva: [1-9]\d* esemény/.test(tiszta(allas)),
        atvette: /kérelmet vettem át továbbadásra/.test(tiszta(naplo.P)) && /válaszát visszavittem/.test(tiszta(naplo.P)),
        hNemLattaR: tiszta(naplo.H).includes('127.0.0.1:' + PP + ' egy szeletet kért tőlem')
          && !tiszta(naplo.H).includes('127.0.0.1:' + PR + ' egy szeletet kért tőlem')
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (továbbadás-próba: ' + JSON.stringify(jo) + ')\n'
          + '    (P: ' + tiszta(naplo.P).replace(/\s+/g, ' ').slice(-600) + ')\n'
          + '    (R: ' + tiszta(naplo.R).replace(/\s+/g, ' ').slice(-400) + ')\n');
        return false;
      }
      return true;
    } finally {
      for (const f of futok) f.kill();
      await varj(500);
      for (const h of [H, P, R]) await rm(h, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D93: A TAGSÁG A PARANCSSORBÓL — a nem tag szavazata nem számít, a meghívás után igen (2026-10-04)
// ===================================
//
// A gazda profilt váró koinót hoz létre (`profil=nev`), javasol; a vendég (még nem tag) pontot tesz és ELLENEZ. ⭐ Amíg
// nem tag: a parancs kimondja, hogy az eseménye nem számít, és a gazda állapota ELFOGADVA-t mutat (egyedül ő számít),
// és kimondja a várakozó eseményeket. A meghívás profil nélkül NEM megy (a parancs megnevezi, mit kérj); a profil
// után igen. ⭐ A meghívás után UGYANAZ a korábbi szavazat számít (D19: függőben volt, nem elveszett) → ELVETVE (1:1).
// A vendég a tagsági csomagját kiadja. Viselkedést mérünk: a gazda állapotát.
proba('⭐⭐ D93: a NEM TAG szavazata nem számít (és ezt kimondja) — a profilos meghívás után ugyanaz a szavazat számít',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const f = (nev) => join(gazda, nev);
    try {
      await fut(gazda, 'koino', 'Tagság-próba', 'profil=nev');
      const g = azonosito(await fut(gazda, 'gondolat', 'EREDETI'), 'Létrejött:');
      await fut(gazda, 'ertek', g, '51', '0', '3600', '3600');
      const j = azonosito(await fut(gazda, 'javaslat', g, 'UJ CIM'), 'Szerkesztési javaslat beadva');
      if (!g || !j) return false;
      await fut(gazda, 'kivisz', f('oda.jsonl'));
      await fut(vendeg, 'behoz', f('oda.jsonl'));
      const pontKi = await fut(vendeg, 'pont', g, '10');
      const szavazKi = await fut(vendeg, 'szavaz', j, 'ellenez');
      const horgony = teljesAzonosito(await fut(vendeg, 'belep'));
      await fut(vendeg, 'kivisz', join(vendeg, 'v1.jsonl'), 'sajat');
      await fut(gazda, 'behoz', join(vendeg, 'v1.jsonl'));
      const elotte = await fut(gazda, 'allapot', '1');

      // A meghívás profil nélkül nem megy — a parancs megnevezi, mit kérj.
      const profilNelkul = await fut(gazda, 'meghiv', horgony).catch((h) => String(h.message ?? h));
      await fut(vendeg, 'profil', 'nev=Vendég Vera');
      await fut(vendeg, 'kivisz', join(vendeg, 'v2.jsonl'), horgony);
      await fut(gazda, 'behoz', join(vendeg, 'v2.jsonl'));
      await fut(gazda, 'meghiv', horgony);
      const utana = await fut(gazda, 'allapot', '1');
      await fut(gazda, 'kivisz', f('meghivas.jsonl'), horgony);
      await fut(vendeg, 'behoz', f('meghivas.jsonl'));
      const tagsag = await fut(vendeg, 'tagsag');

      const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
      const jo = {
        figyelmeztet: /Nem vagy \(ellenőrzött\) tag/.test(tiszta(pontKi)) && /Nem vagy \(ellenőrzött\) tag/.test(tiszta(szavazKi)),
        elotteElfogadva: /ELFOGADVA/.test(elotte) && /nem számít, amíg a szerzője tagsága/.test(tiszta(elotte)),
        profilKell: /profilt vár/.test(profilNelkul),
        utanaElvetve: /ELVETVE/.test(utana) && /👍 1 👎 1/.test(utana),
        tagsag: /✔ tag/.test(tiszta(tagsag)) && /kiadva \(1\. szint/.test(tiszta(tagsag))
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (D93-próba: ' + JSON.stringify(jo) + ')\n');
        return false;
      }
      return true;
    } finally {
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D93/3: A ZÁRT KOINÓ A KÉZFOGÁSBAN — a nem tag csak a születést és az azonosság-szeleteket kapja (2026-10-04)
// ===================================
//
// A gazda zárt koinót hoz létre (az alapérték) és egy gondolatot; a vendég belép, és egy csere-kört fut vele. ⭐ Amíg nem
// tag: a koinó születését megkapja, a gondolatot NEM — a gazda viszont megkapja a vendég belépését (az ő azonosság-
// szelete jár neki), tehát meghívhatja. A meghívás utáni csere-körben a vendég mindent megkap (a gazda a tábla-kulcsáról
// már ismeri: a személyét az első körben a kézfogásban bizonyította). A gazda ismert címeit is csak tagként kapja meg.
// ⭐ Ellenpróba: NYÍLT koinóban a belépés nélküli
// vendég is azonnal mindent megkap — tehát a zártság az, ami visszatart. Viselkedést mérünk: a vendég lemezét.
proba('⭐⭐ D93/3: ZÁRT KOINÓ — a nem tag csak a születést kapja, a gazda az ő belépését; a meghívás után mindent (nyílt koinóban azonnal)',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const nyGazda = await ujKeszulek();
    const nyVendeg = await ujKeszulek();
    const lemezen = async (hely, szoveg) => (await readFile(join(hely, 'sajat', 'esemenyek.jsonl'), 'utf8').catch(() => ''))
      .includes(szoveg);
    try {
      await fut(gazda, 'koino', 'Zárt próba');
      await fut(gazda, 'gondolat', 'TITKOS GONDOLAT');
      // A gazda ismer egy friss címet (mintha az imént fúrt volna) — a koinó hálózata is a koinó tartalma.
      const idegenCim = () => writeFile(join(gazda, 'udpcimek.json'), JSON.stringify({
        cimek: [{ hoszt: '203.0.113.55', port: 41555, mikor: Date.now() }] }), 'utf8');
      const cimetKapott = async () => (await readFile(join(vendeg, 'udpcimek.json'), 'utf8').catch(() => ''))
        .includes('203.0.113.55');
      await idegenCim();
      const horgony = teljesAzonosito(await fut(vendeg, 'belep'));
      await csereKor(gazda, vendeg, 7691);
      const elotte = {
        szuletes: await lemezen(vendeg, 'Zárt próba'),
        gondolat: await lemezen(vendeg, 'TITKOS GONDOLAT'),
        belepesAGazdanal: await lemezen(gazda, horgony),
        cimElotte: await cimetKapott()
      };
      const meghivas = await fut(gazda, 'meghiv', horgony);
      await idegenCim();
      await csereKor(gazda, vendeg, 7691);
      const utana = await lemezen(vendeg, 'TITKOS GONDOLAT');
      const cimUtana = await cimetKapott();

      // Ellenpróba: nyílt koinó, belépés nélküli vendég.
      await fut(nyGazda, 'koino', 'Nyílt próba', 'nyilt');
      await fut(nyGazda, 'gondolat', 'NYILT GONDOLAT');
      await csereKor(nyGazda, nyVendeg, 7692);
      const nyilt = await lemezen(nyVendeg, 'NYILT GONDOLAT');

      const jo = { ...elotte, meghivva: !/Hiba|hiba/.test(meghivas), utana, cimUtana, nyilt };
      const elvart = jo.szuletes && !jo.gondolat && jo.belepesAGazdanal && !jo.cimElotte && jo.meghivva && jo.utana
        && jo.cimUtana && jo.nyilt;
      if (!elvart) process.stdout.write('    (zárt koinó: ' + JSON.stringify(jo) + ')\n');
      return elvart;
    } finally {
      for (const h of [gazda, vendeg, nyGazda, nyVendeg]) await rm(h, { recursive: true, force: true });
    }
  });

// ⭐ A TAGSÁGI CSOMAG A KÉZFOGÁSBAN: két tag, akik egymás láncát NEM tartják (mindkettőjüket az alapító hívta be, a kézi úton,
// csak a saját szeletükkel) — az első csere-körben a tagsági csomagjukkal bizonyítanak, és B gondolata D-hez ér. ⛔ Rontás:
// csomag nélkül D nem tudná ellenőrizni B-t (és fordítva), és a gondolat nem érne át.
proba('⭐⭐ D93/3: A TAGSÁGI CSOMAG A KÉZFOGÁSBAN — két tag, aki a másik láncát nem tartja, az első körben bizonyít, és a gondolat átér',
  async () => {
    const A = await ujKeszulek();
    const B = await ujKeszulek();
    const D = await ujKeszulek();
    const lemezen = async (hely, szoveg) => (await readFile(join(hely, 'sajat', 'esemenyek.jsonl'), 'utf8').catch(() => ''))
      .includes(szoveg);
    try {
      await fut(A, 'koino', 'Csomag-próba');
      await fut(A, 'kivisz', join(A, 'szuletes.jsonl'));          // csak a születés (még semmi más nincs)
      await fut(B, 'behoz', join(A, 'szuletes.jsonl'));
      await fut(D, 'behoz', join(A, 'szuletes.jsonl'));
      await taggaTesziKeszulek(A, B, 'b');
      await taggaTesziKeszulek(A, D, 'd');
      const tagsagB = await fut(B, 'tagsag');                       // kiadja a csomagját
      await fut(D, 'tagsag');
      await fut(B, 'gondolat', 'B GONDOLATA');
      await csereKor(B, D, 7693);
      const atert = await lemezen(D, 'B GONDOLATA');
      const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
      const jo = { csomag: /kiadva \(1\. szint/.test(tiszta(tagsagB)), atert };
      if (!(jo.csomag && jo.atert)) process.stdout.write('    (csomag-próba: ' + JSON.stringify(jo) + ')\n');
      return jo.csomag && jo.atert;
    } finally {
      for (const h of [A, B, D]) await rm(h, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D93/6: A KONTRASZT-JELZÉS KÉRÉSRE — egy harmadik készülék, aki CSAK a tanúsító szeletét kapta meg (2026-10-04)
// ===================================
//
// Az alapító behív és tanúsít egy embert, akinek nincs önálló élete. ⭐ Egy harmadik készülék csak az alapító
// azonosság-szeletét kapja meg (`kivisz <horgony>` — a szelet egyeztetett halmaza, a hozzá bejelentett állításokkal):
// a `jelzes <horgony>` mégis tudja, kit tanúsított (a bejelentésből), és megnevezi, kinek a szelete hiányzik (a `hozd`
// parancsával). Az alapító a sajátjáról teljes számot lát. Viselkedést mérünk: a parancs kimenetét a két készüléken.
proba('⭐⭐ D93/6: a `jelzes` a tanúsító szeletéből tudja, kit tanúsított — és megnevezi a hiányzó szeletet',
  async () => {
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const harmadik = await ujKeszulek();
    const tiszta = (x) => x.replace(/\x1b\[[0-9;]*m/g, '');
    try {
      await fut(gazda, 'koino', 'Jelzés-próba');
      const gazdaHorgony = teljesAzonosito(await fut(gazda, 'belep'));     // az alapítónál a koinó létrehozása
      const vHorgony = await taggaTesziKeszulek(gazda, vendeg);
      await fut(gazda, 'tanusit', vHorgony);
      const sajat = tiszta(await fut(gazda, 'jelzes'));
      await fut(gazda, 'kivisz', join(gazda, 'szelet.jsonl'), gazdaHorgony);
      await fut(harmadik, 'behoz', join(gazda, 'szelet.jsonl'));
      const masik = tiszta(await fut(harmadik, 'jelzes', gazdaHorgony));
      const jo = {
        sajat: /akiket tanúsított: 1 · ebből önálló élet nélkül: 1/.test(sajat),
        masikTudja: /akiket tanúsított: 1 · ebből önálló élet nélkül: 0/.test(masik) && /1 szelete hiányzik/.test(masik),
        hozd: masik.includes('hozd ' + vHorgony),
        nemItelet: /SZÁM, nem ítélet/.test(masik)
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (jelzés-próba: ' + JSON.stringify(jo) + ')\n    (gazda: '
          + sajat.replace(/\s+/g, ' ').slice(0, 400) + ')\n    (harmadik: '
          + masik.replace(/\s+/g, ' ').slice(0, 400) + ')\n');
        return false;
      }
      return true;
    } finally {
      for (const h of [gazda, vendeg, harmadik]) await rm(h, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D91/3: A CÍMJEGYZÉK A DHT-N — a hirdetés, a vakítás, és a `hozd` cím nélkül (2026-10-03)
// ===================================
//
// HAMIS DHT-n (a tábla-próba mintája: a valódi hálózat hangulatát nem mérjük). A gazda vállal egy gondolatot
// (pontja van rajta), és hirdet. ⭐ Négy ág, hogy a próba ne legyen vak: (1) a beállítás NÉLKÜL a szelet nem
// megy ki (a vendég nem találja), csak a gyökér-darab; (2) a `cimjegyzek hirdetes 1` után a szelet is kint van;
// (3) más koinó azonosítójával a vendég SEMMIT nem talál (a vakítás); (4) a `hozd` CÍM ÉS TÁRS NÉLKÜL a DHT-ról
// tudja meg, kit kérdezzen, és a gondolat TÉNYLEG megérkezik (a vendég lemezén, az átmeneti tárban).
proba('⭐⭐ D91/3: a címjegyzék a DHT-n — csak a beállítással hirdet szeletet, vakít, és a `hozd` cím nélkül is elhoz',
  async () => {
    const { hamisHalozat } = await import('./dhtProba.js');
    const gazda = await ujKeszulek();
    const vendeg = await ujKeszulek();
    const halo = await hamisHalozat(12);
    const port = 7653;
    const dht = { KOINO_DHT_BELEPOK: halo.belepo(0) };
    let figyelo = null;
    try {
      await fut(gazda, 'koino', 'Címjegyzék-próba');
      const g = azonosito(await fut(gazda, 'gondolat', 'TAVOLI'), 'Létrejött:');
      if (!g) return false;
      await fut(gazda, 'kivisz', join(gazda, 'mind.jsonl'));
      const esemenyek = (await readFile(join(gazda, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean)
        .map((x) => JSON.parse(x));
      const gTeljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas').azonosito;
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(gazda, 'kivisz', join(gazda, 'k.jsonl'), koinoTeljes);
      await fut(vendeg, 'behoz', join(gazda, 'k.jsonl'));      // a vendég csak a koinó születését ismeri
      await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

      // (1) Alapból csak a gyökér-darab megy ki.
      const hirdetes1 = await fut(gazda, 'cimjegyzek', 'hirdet', String(port), dht);
      const keres1 = await fut(vendeg, 'cimjegyzek', 'keres', gTeljes, dht);
      const gyoker1 = await fut(vendeg, 'cimjegyzek', 'gyoker', dht);
      // (2) A beállítás után a vállalt szelet is.
      await fut(gazda, 'cimjegyzek', 'hirdetes', '1');
      const hirdetes2 = await fut(gazda, 'cimjegyzek', 'hirdet', String(port), dht);
      const keres2 = await fut(vendeg, 'cimjegyzek', 'keres', gTeljes, dht);
      // (3) Más koinó azonosítójával ugyanaz a szelet más téma — nem található.
      const keresMas = await fut(vendeg, 'cimjegyzek', 'keres', gTeljes, { ...dht, KOINO_AZONOSITO: 'masik-koino' });

      // (4) A `hozd` cím és társ nélkül: a DHT mondja meg, kit kérdezzen.
      figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
        env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' }, stdio: 'ignore'
      });
      await varj(2000);
      const hozva = await fut(vendeg, 'hozd', gTeljes, dht);
      figyelo.kill();
      figyelo = null;
      await varj(800);
      // ⚠️ NÉV SZERINT (az alapértelmezett koinó, `sajat`): a (3) ág a vendégnél egy `masik-koino` mappát is nyitott.
      const koinoMappa = join(vendeg, 'sajat');
      const megjott = (await readdir(join(koinoMappa, 'atmeneti')).catch(() => [])).includes(gTeljes + '.jsonl');

      const cim = new RegExp('127\\.0\\.0\\.1 ' + port);
      const jo = {
        egy: /✓ gyoker 0:0/.test(hirdetes1) && !/szelet/.test(hirdetes1.split('HIRDETÉS')[1] ?? '')
          && !cim.test(keres1) && cim.test(gyoker1),
        ketto: /✓ szelet/.test(hirdetes2) && cim.test(keres2),
        harom: !cim.test(keresMas),
        negy: /a DHT-n 1 hirdető/.test(hozva) && megjott
      };
      if (!Object.values(jo).every(Boolean)) {
        process.stdout.write('    (címjegyzék-próba: ' + JSON.stringify(jo) + ')\n'
          + (jo.negy ? '' : '    (a `hozd` kimenete: ' + hozva.replace(/\x1b\[[0-9;]*m/g, '').trim().slice(0, 600) + ')\n'));
        return false;
      }
      return true;
    } finally {
      if (figyelo) figyelo.kill();
      halo.bezar();
      await varj(500);
      await rm(gazda, { recursive: true, force: true });
      await rm(vendeg, { recursive: true, force: true });
    }
  });

// ===================================
// ⭐⭐ D85 T3, a (B): A DÖNTÉSI CSOMAG A KÉZI ÚTON (2026-10-03)
// ===================================
//
// A egyesítést javasol (G1 + G2), B — a G2 másik tulajdonosa — ellenzi: a G2-es rész elbukik, a javaslat
// ELVETVE. A `csomag` parancs a lezárás után kiadja a csomagokat a töredékekbe. ⭐ Egy harmadik készülék, C,
// csak a G1 szeletét és a G1-es töredékét kapja (ahogy egy G1-es szavazó tartja a szigorú (b) alatt): a
// csomaggal ő is ELVETVE-t lát. ⭐ A csomagot A ŐRJÁRATA adja ki magától (a bekötés próbája), a `csomag`
// parancs utána már nem talál pótolnivalót. ⛔ Egy negyedik, D, csak a G1 szeletét kapja — ő a G2-es részből csak A
// szavazatát látja, ezért NEM jut ugyanarra — „NEM ISMERT”-et mond, és nem hajt végre semmit (ez az, amiért a
// csomag kell, és amiért a döntés ismerete). Viselkedést mérünk: a
// kivitt töredék-szeletben ott a csomag, és a másik készülék ÁLLAPOTA mondja ki a döntést.
proba('⭐⭐ D85 T3 (B): a `csomag` a töredékbe ír, és a csak-G1-tartó a csomaggal ugyanazt a döntést látja',
  async () => {
    const A = await ujKeszulek();
    const B = await ujKeszulek();
    const C = await ujKeszulek();
    const D = await ujKeszulek();
    const f = (nev) => join(A, nev);
    let orjarat = null;
    try {
      await fut(A, 'koino', 'Csomag-próba');
      // ⭐ D93/1: B TAG — a javaslat ELŐTT (a döntés 1–2 mp alatt lezárul); a csomag a tagsági láncát is viszi C-nek.
      await fut(A, 'kivisz', f('szuletes.jsonl'));
      await fut(B, 'behoz', f('szuletes.jsonl'));
      await taggaTesziKeszulek(A, B);
      const g1 = azonosito(await fut(A, 'gondolat', 'ELSO'), 'Létrejött:');
      const g2 = azonosito(await fut(A, 'gondolat', 'MASIK'), 'Létrejött:');
      if (!g1 || !g2) return false;
      for (const g of [g1, g2]) {
        await fut(A, 'pont', g, '10');
        await fut(A, 'ertek', g, '51', '0', '1', '2');     // a döntés 1–2 mp alatt lezárul
      }
      const j = azonosito(await fut(A, 'egyesit', g1 + ',' + g2, 'EGYESITETT'), 'Szerkesztési javaslat beadva');
      if (!j) return false;

      await fut(A, 'kivisz', f('oda.jsonl'));
      await fut(B, 'behoz', f('oda.jsonl'));
      await fut(B, 'pont', g2, '10');
      await fut(B, 'szavaz', j, 'ellenez');
      await fut(B, 'kivisz', f('vissza.jsonl'));
      await fut(A, 'behoz', f('vissza.jsonl'));
      await varj(3000);                                   // a lezárás után

      // ⭐ A ŐRJÁRATA egy kört fut (társ nélkül is lefut a háztartás) — és kiadja a csomagot.
      // ⚠️ A DHT-belépő nélkül (mint a többi őrjárat-próba): a valódi DHT-ra kopogás a teljes sor terhelése
      // alatt kitolta az első kört a várakozásból (szeszélyes bukás volt, 2026-10-03).
      orjarat = spawn(process.execPath, [KOINO_JS, 'orjarat', '0.05', '7611'], {
        env: { ...process.env, KOINO_ADAT: A, KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs' }
      });
      let orKimenet = '';
      orjarat.stdout.on('data', (d) => { orKimenet += d; });
      const orKezdet = Date.now();
      for (let i = 0; i < 80 && !/döntési csomag a töredékekbe/.test(orKimenet); i++) await varj(250);
      // ⭐ A bukás megnevezi magát: ha az őrjárat nem adta ki a csomagot, kimondjuk, mennyi ideig vártunk.
      if (!/döntési csomag a töredékekbe/.test(orKimenet)) {
        process.stdout.write('    (az őrjárat ' + Math.round((Date.now() - orKezdet) / 1000)
          + ' mp alatt nem adta ki a csomagot; utolsó kimenete: '
          + orKimenet.replace(/\x1b\[[0-9;]*m/g, '').slice(-300) + ')' + String.fromCharCode(10));
      }
      orjarat.kill();
      orjarat = null;
      await varj(500);
      const kiadas = await fut(A, 'csomag');
      // A teljes azonosítók a kivitt fájlból (a töredék kulcsához kellenek).
      await fut(A, 'kivisz', f('mind.jsonl'));
      const esemenyek = (await readFile(f('mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x));
      const g1Teljes = esemenyek.find((e) => e.tipus === 'GondolatLetrehozas' && e.azonosito.startsWith(g1)).azonosito;
      const jTeljes = esemenyek.find((e) => e.tipus === 'Javaslat' && e.azonosito.startsWith(j)).azonosito;
      // A koinó születése is (azt minden tag ismeri — a saját szeletében él, nem a G1-ében).
      const koinoTeljes = esemenyek.find((e) => e.tipus === 'KoinoLetrehozas').azonosito;
      await fut(A, 'kivisz', f('k.jsonl'), koinoTeljes);
      await fut(A, 'kivisz', f('g1.jsonl'), g1Teljes);
      await fut(A, 'kivisz', f('t1.jsonl'), toredekAzonosito(jTeljes, g1Teljes));
      const toredekben = (await readFile(f('t1.jsonl'), 'utf8')).includes('"DontesiCsomag"');
      const csomagok = esemenyek.filter((e) => e.tipus === 'DontesiCsomag').length;

      for (const hely of [C, D]) await fut(hely, 'behoz', f('k.jsonl'));
      await fut(C, 'behoz', f('g1.jsonl'));
      await fut(C, 'behoz', f('t1.jsonl'));
      await fut(D, 'behoz', f('g1.jsonl'));
      const kepA = await fut(A, 'allapot');
      const kepC = await fut(C, 'allapot');
      const kepD = await fut(D, 'allapot');
      // Az őrjárat kiadta mindkét csomagot (a tárban), a parancs már nem talál pótolnivalót.
      return csomagok === 2 && /1 lezárt döntés · 0 új csomag/.test(kiadas) && toredekben
        && kepA.includes('ELVETVE') && kepC.includes('ELVETVE')
        // ⭐ D85 T3: D a G2-es részt nem ismeri — „NEM ISMERT”, és a G1-e nem olvadt be (a régi címe áll)
        && kepD.includes('NEM ISMERT') && !kepD.includes('ELVETVE') && kepD.includes('„ELSO"');
    } finally {
      if (orjarat) orjarat.kill();
      await varj(300);
      for (const hely of [A, B, C, D]) await rm(hely, { recursive: true, force: true });
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
// ⭐⭐ D73 (2026-09-27): A MUTATÓ PILLANATKÉPE AZ ÉLES ÚTON
// ===================================
//
// A modul-próbák (tarProba) mérik a mutatót; ez azt, hogy a PROGRAM is így nyitja a tárat:
// ezer esemény fölött a megnyitás megírja a pillanatképet, a következő abból nyit, a kép utáni
// eseményeket is látja, és egy elrontott kép helyett a fájlból számol — és mindezt úgy, hogy a
// kiírt TUDÁS és ÁLLAPOT ugyanaz, mint egy pillanatkép nélkül számoló másik készüléken.

/** Egy eseményfájl a kézi út alakjában (soronként egy esemény). */
async function esemenyFajl(fajl, esemenyek) {
  await writeFile(fajl, esemenyek.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

/** A kiírt két ujjlenyomat (TUDÁS, ÁLLAPOT) — ezek a 43 jelű szavak a kimenetben. */
const ujjlenyomatai = (kimenet) => (kimenet.match(/[A-Za-z0-9_-]{43}/g) ?? []).join(' ');

proba('⭐⭐ A PROGRAM A PILLANATKÉPPEL NYIT — és ugyanazt számolja, mint nélküle (D73)', async () => {
  const { ujEember } = await import('./probaFuttato.js');
  const egyik = await ujKeszulek();
  const masik = await ujKeszulek();
  try {
    // ----- EZER FÖLÖTTI ESEMÉNY (a pillanatkép küszöbe) — egy koino, 40 e-ember -----
    const alapito = await ujEember('sajat');
    const nagy = [await alapito.tesz('KoinoLetrehozas', { nev: 'Mutató-próba', leiras: null, alapitok: [] })];
    for (let i = 0; i < 40; i++) {
      const ember = await ujEember('sajat');
      for (let j = 0; j < 13; j++) {
        const g = await ember.tesz('GondolatLetrehozas', { cim: 'G' + i + '-' + j, meret: 10 });
        nagy.push(g, await ember.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 1 }));
      }
    }
    const kesobbi = [];
    const utolso = await ujEember('sajat');
    for (let j = 0; j < 2; j++) {
      const g = await utolso.tesz('GondolatLetrehozas', { cim: 'Később ' + j, meret: 10 });
      kesobbi.push(g, await utolso.tesz('TudatpontRendezes', { entitas: g.azonosito, pont: 2 }));
    }
    const nagyFajl = join(egyik, 'nagy.jsonl');
    const kesobbiFajl = join(egyik, 'kesobbi.jsonl');
    await esemenyFajl(nagyFajl, nagy);
    await esemenyFajl(kesobbiFajl, kesobbi);
    const kep = join(egyik, 'sajat', 'mutato.json');
    const vanKep = () => readFile(kep, 'utf8').then(() => true, () => false);

    await fut(egyik, 'behoz', nagyFajl);
    const elso = ujjlenyomatai(await fut(egyik, 'ujjlenyomat'));    // a fájlból → megírja a képet
    const kepMegvan = await vanKep();
    const fedett = async () => JSON.parse(await readFile(kep, 'utf8')).fedett;
    const elsoFedett = kepMegvan ? await fedett() : -1;
    const masodik = ujjlenyomatai(await fut(egyik, 'ujjlenyomat')); // a képből
    await fut(egyik, 'behoz', kesobbiFajl);                          // a kép UTÁN írt események
    const harmadik = ujjlenyomatai(await fut(egyik, 'ujjlenyomat'));
    // ⭐ A HASZNÁLAT BIZONYÍTÉKA A LEMEZEN: a képből nyitó program csak a rövid véget olvasta, tehát
    // nem írt új képet. ⛔ Ha a teljes fájlt olvasná (ezer fölött), újraírná — és a `fedett` nőne.
    const kepNemIrodottUjra = (await fedett()) === elsoFedett;
    // ⛔ Egy elrontott kép: a program a fájlból számol, és új, ép képet ír a helyére.
    await writeFile(kep, '{ez nem pillanatkép');
    const negyedik = ujjlenyomatai(await fut(egyik, 'ujjlenyomat'));
    // ⚠️ Nem egy rögzített változat-számot nézünk (a kép alakja 2026-09-27-én már egyszer
    // változott, a C 7. pontjával — és ez a próba ezen bukott el), hanem hogy ÉP, teljes kép lett.
    const ujKep = JSON.parse(await readFile(kep, 'utf8'));
    const ujraIrva = Number.isInteger(ujKep.v) && Array.isArray(ujKep.e) && ujKep.e.length > 1000;

    // ⭐ A MÉRCE: egy másik készülék, ugyanazokkal az eseményekkel, pillanatkép nélkül számolva.
    // ⚠️ A második `behoz` megnyitása ott is képet írna — a mérce előtt eldobjuk.
    await fut(masik, 'behoz', nagyFajl);
    await fut(masik, 'behoz', kesobbiFajl);
    await rm(join(masik, 'sajat', 'mutato.json'), { force: true });
    const masikLatja = ujjlenyomatai(await fut(masik, 'ujjlenyomat'));

    // ⭐ A BUKÁS MEGNEVEZI MAGÁT: melyik feltétel nem teljesült (egyszer a teljes sorban bukott,
    // külön futtatva nem — ezért kell tudni, melyik).
    const feltetelek = {
      kepMegvan, ketUjjlenyomat: elso.length === 87, masodikUgyanaz: elso === masodik,
      aKepUtaniLatszik: harmadik !== masodik, rontottKepUgyanaz: harmadik === negyedik,
      masikGepUgyanaz: harmadik === masikLatja, kepNemIrodottUjra, ujraIrva
    };
    const nemTeljesult = Object.entries(feltetelek).filter(([, v]) => !v).map(([k]) => k);
    if (nemTeljesult.length) {
      throw new Error('nem teljesült: ' + nemTeljesult.join(', ') + ' · első: ' + elso.slice(0, 20)
        + '… második: ' + masodik.slice(0, 20) + '… harmadik: ' + harmadik.slice(0, 20)
        + '… negyedik: ' + negyedik.slice(0, 20) + '… másik: ' + masikLatja.slice(0, 20) + '…');
    }
    return true;
  } finally {
    await rm(egyik, { recursive: true, force: true });
    await rm(masik, { recursive: true, force: true });
  }
});

// ===================================
// ⭐ A BELÉPŐ TÉR KÉZI ÚTJA (5.6)
// ===================================

// ===================================
// ⭐⭐ D78: A LÁNC-GYÖKÉR AZ ÉLES ÚTON (2026-09-27 este)
// ===================================
//
// A modul-próba (`lancGyokerProba.js`) a művelet-réteget hívja; ez azt méri, hogy a PROGRAM is így
// ír: külön folyamatokban futó kézi parancsok eseményei a láncból újraszámolt gyökeret viselik —
// ⭐ és minden parancs ÚJ folyamat, tehát a második-harmadik a FÁJL-gyorsítótárból (`lanc.json`)
// folytat. Viselkedést mérünk: a lemezen álló eseményeket, nem feliratot.
proba('⭐⭐ A LÁNC-GYÖKÉR AZ ÉLES ÚTON — a kézi parancsok eseményei a láncból újraszámolt gyökeret viselik (D78)', async () => {
  const hely = await ujKeszulek();
  try {
    await fut(hely, 'koino', 'Lanc proba');
    const elso = await fut(hely, 'gondolat', 'Elso');
    await fut(hely, 'pont', azonosito(elso, 'Létrejött:'), '30');
    await fut(hely, 'gondolat', 'Masodik');
    await fut(hely, 'pont', azonosito(elso, 'Létrejött:'), '12');
    const sorok = (await readFile(join(hely, 'sajat', 'esemenyek.jsonl'), 'utf8'))
      .split('\n').filter((s) => s.trim()).map((s) => JSON.parse(s)).sort((a, b) => a.sorszam - b.sorszam);
    const gyorsitotar = JSON.parse(await readFile(join(hely, 'sajat', 'lanc.json'), 'utf8'));
    for (let i = 0; i < sorok.length; i++) {
      if (!sorok[i].lancGyoker || !azonosLancGyoker(sorok[i].lancGyoker, await lancGyokerLancbol(sorok.slice(0, i)))) {
        console.log('    (hibás gyökér a(z) ' + sorok[i].sorszam + '. eseményben)');
        return false;
      }
    }
    // ⭐ A gyorsítótár a folyamatok között él: az utolsó esemény ELŐTTI állapotot fedi le.
    return sorok.length >= 5 && sorok.filter((e) => e.tipus === 'TudatpontRendezes').length >= 2
      && gyorsitotar.sorszam === sorok.length - 1;
  } finally {
    await rm(hely, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ D80: AZ ELLENTMONDÁS BIZONYÍTÉKA A KÉZI ÚTON (2026-09-27 este)
// ===================================
//
// A modul-próba (`ellentmondasProba.js`) a kaput közvetlenül hívja; ez azt méri, hogy a PROGRAM kézi
// útja (`behoz`) is ugyanazon a kapun engedi át — az ép vádat a lemezre, a hamisat nem. Viselkedést
// mérünk: a másik készülék lemezét.
proba('⭐⭐ AZ ELLENTMONDÁS A KÉZI ÚTON — az ép vád a másik készülék lemezére kerül, a hamis nem (D80)', async () => {
  const csalo = await ujKeszulek();
  const vevo = await ujKeszulek();
  try {
    // ----- A csaló: egy kis élet, és egy hazug bemondás (helyes gyökérrel, rossz összeggel) -----
    const tar = await esemenyTarNyitasa('sajat', csalo);
    const kulcs = async () => {
      const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
      return { kulcspar, szerzo: Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url') };
    };
    const k = { koino: 'sajat', tar, darabTar: fajlBlobTarolo('sajat', csalo), ...await kulcs() };
    await koinoLetrehozasa(k, 'Csalo koino');
    const g = await gondolatLetrehozasa(k, { cim: 'Egy gondolat' });
    await tudatpontRendezese(k, g.azonosito, 30);
    let lanc = await sajatLancEsemenyei(tar, k.szerzo);
    const utolso = lanc[lanc.length - 1];
    // ⭐ D81: a helyes lánc-gyökérrel és bizonyítékkal — csak a bemondás hazug (a kapu így beengedi).
    const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, 'sajat', k.szerzo, utolso.sorszam + 1, null, g.azonosito);
    const hazug = await esemenyLetrehozasa({ koino: 'sajat', tipus: 'TudatpontRendezes', entitas: g.azonosito,
      entitasSorszam: 9, adat: { entitas: g.azonosito, pont: 80, szerep: 'aktiv', kiosztva: 5, bizonyitek },
      elozo: utolso.azonosito, sorszam: utolso.sorszam + 1, lancGyoker }, k.kulcspar);
    await esemenyMentese(tar, hazug);
    lanc = await sajatLancEsemenyei(tar, k.szerzo);

    // ----- A vád: ép és hamis (a hamis egy becsületes pont-eseményt vádol) — D81: az esemény elég -----
    const bejelento = await kulcs();
    const vadEsemeny = async (adat) => esemenyLetrehozasa({ koino: 'sajat', tipus: 'Ellentmondas',
      entitas: lanc[0].azonosito, entitasSorszam: 1, adat, elozo: null, sorszam: 1 }, bejelento.kulcspar);
    const ep = await vadEsemeny({ kit: k.szerzo, fajta: 'bemondas', vadpont: hazug.sorszam, esemeny: hazug });
    const becsuletes = lanc.find((e) => e.tipus === 'TudatpontRendezes');
    const hamis = await vadEsemeny({ kit: k.szerzo, fajta: 'bemondas', vadpont: becsuletes.sorszam, esemeny: becsuletes });

    // ----- A kézi út: a csaló lánca + a vádak EGY fájlban, a valódi `behoz`-zal -----
    const fajl = join(vevo, 'bizonyitek.jsonl');
    await writeFile(fajl, [...lanc, ep, hamis].map((e) => JSON.stringify(e)).join('\n') + '\n');
    const kimenet = await fut(vevo, 'behoz', fajl);
    const lemezen = new Set((await readFile(join(vevo, 'sajat', 'esemenyek.jsonl'), 'utf8'))
      .split('\n').filter((x) => x.trim()).map((x) => JSON.parse(x).azonosito));
    return lemezen.has(hazug.azonosito) && lemezen.has(ep.azonosito) && !lemezen.has(hamis.azonosito)
      && kimenet.includes('Behozva');
  } finally {
    await rm(csalo, { recursive: true, force: true });
    await rm(vevo, { recursive: true, force: true });
  }
});

// ===================================
// ⭐⭐ D82: AZ ÉSZLELŐ AZ ÉLES ÚTON — a kézi út és a csere után MAGÁTÓL jelent (2026-09-27 este)
// ===================================
//
// A modul-próba (`eszleloProba.js`) az észlelőt közvetlenül hívja; ez azt méri, hogy a PROGRAM is
// meghívja: a `behoz` és a csere után a készülék magától bejelenti a nála bizonyítható ellentmondást
// (a vádolt azonosság-szeletébe), és az `ellenoriz` nem ismétli. Viselkedés: a lemez.

/** Egy csaló koinója a lemezen: alapítás, egy gondolat, egy pont — és egy hazug bemondás (D81). */
async function csaloKoino(hely, beallitas = {}) {
  const tar = await esemenyTarNyitasa('sajat', hely);
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const k = { koino: 'sajat', tar, darabTar: fajlBlobTarolo('sajat', hely), kulcspar,
    szerzo: Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url') };
  await koinoLetrehozasa(k, 'Csalo koino', undefined, undefined, beallitas);
  const g = await gondolatLetrehozasa(k, { cim: 'Egy gondolat' });
  await tudatpontRendezese(k, g.azonosito, 30);
  const lanc = await sajatLancEsemenyei(tar, k.szerzo);
  const utolso = lanc[lanc.length - 1];
  const { lancGyoker, bizonyitek } = await lancUjEsemenyhez(tar, 'sajat', k.szerzo, utolso.sorszam + 1, null, g.azonosito);
  const hazug = await esemenyLetrehozasa({ koino: 'sajat', tipus: 'TudatpontRendezes', entitas: g.azonosito,
    entitasSorszam: 9, adat: { entitas: g.azonosito, pont: 80, szerep: 'aktiv', kiosztva: 5, bizonyitek },
    elozo: utolso.azonosito, sorszam: utolso.sorszam + 1, lancGyoker }, kulcspar);
  await esemenyMentese(tar, hazug);
  return { lanc: [...lanc, hazug], hazug };
}

/** A lemezen álló `Ellentmondas` események. */
async function ellentmondasokALemezen(hely) {
  return (await readFile(join(hely, 'sajat', 'esemenyek.jsonl'), 'utf8')).split('\n').filter((x) => x.trim())
    .map((x) => JSON.parse(x)).filter((e) => e.tipus === 'Ellentmondas');
}

proba('⭐⭐ AZ ÉSZLELŐ A KÉZI ÚTON — a `behoz` után magától bejelenti, az `ellenoriz` nem ismétli (D82)', async () => {
  const csalo = await ujKeszulek();
  const vevo = await ujKeszulek();
  try {
    const { lanc, hazug } = await csaloKoino(csalo);
    const fajl = join(vevo, 'csalo.jsonl');
    await writeFile(fajl, lanc.map((e) => JSON.stringify(e)).join('\n') + '\n');
    await fut(vevo, 'behoz', fajl);
    const utana = await ellentmondasokALemezen(vevo);
    const ellenoriz = await fut(vevo, 'ellenoriz');
    const vegul = await ellentmondasokALemezen(vevo);
    return utana.length === 1 && utana[0].adat.kit === hazug.szerzo && utana[0].adat.fajta === 'bemondas'
      && utana[0].entitas === lanc[0].azonosito                       // a csaló azonosság-szeletébe (alapító)
      && vegul.length === 1 && ellenoriz.includes('0 új bejelentés');
  } finally {
    await rm(csalo, { recursive: true, force: true });
    await rm(vevo, { recursive: true, force: true });
  }
});

proba('⭐⭐ AZ ÉSZLELŐ A CSERE UTÁN — egy valódi `figyel` + `csere` kör után a fogadó magától jelent (D82)', async () => {
  const csalo = await ujKeszulek();
  const vevo = await ujKeszulek();
  try {
    // ⭐ D93/3: NYÍLT koinó — az észlelő a tárgy, nem a zárt koinó kapuja (a vevő nem tag).
    await csaloKoino(csalo, { zart: false });
    await csereKor(csalo, vevo, 7981);
    const nala = await ellentmondasokALemezen(vevo);
    return nala.length === 1 && nala[0].adat.fajta === 'bemondas';
  } finally {
    await rm(csalo, { recursive: true, force: true });
    await rm(vevo, { recursive: true, force: true });
  }
});

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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)
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
      await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
// ⭐⭐ D84/1 (a bekapcsolás): A TÖRZS KORLÁTJA — a fájlt csak a vállaló szolgálja ki (2026-10-09)
// ===================================
//
// A gazda képes gondolatot ír (G), a vendég megkapja az eseményeit, és pontot tesz rá (vállalja — kéri a törzsét). Aztán a
// gazda leveszi a pontját: G-t már nem vállalja. ⭐ „Alap” módban a gazda a törzset (a szöveg-darabot és a képet) NEM adja
// ki — az a vállalóé; „mindent” módban (D83/2) kiadja. Viselkedést mérünk: a vendég lemezén van-e a kép.
proba('⭐⭐ D84/1: a TÖRZSET csak a vállaló szolgálja ki — a pontját levevő gazda „alap” módban nem adja, „mindent” módban igen',
  async () => {
    const futas = async (mod, port, fport) => {
      const gazda = await ujKeszulek();
      const vendeg = await ujKeszulek();
      let figyelo = null, felulet = null;
      try {
        await fut(gazda, 'koino', 'Törzs', 'próba', 'nyilt');
        felulet = await feluletet(gazda, fport);
        const fej = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
        const kep = Buffer.concat([fej, Buffer.alloc(4 * 1024, 7), Buffer.from('0000000049454e44ae426082', 'hex')]);
        const fel = await felulet.hiv('/api/feltoltes/kep', { method: 'POST', body: JSON.stringify({ adat: kep.toString('base64') }) });
        await felulet.hiv('/api/gondolat', { method: 'POST', body: JSON.stringify({ cim: 'KÉPES', kezdoTudatpont: 50,
          szoveg: [{ id: 'b1', tipus: 'kep', url: fel.adat.url }] }) });
        felulet.folyamat.kill(); felulet = null; await varj(500);
        await fut(gazda, 'kivisz', join(gazda, 'mind.jsonl'));
        await fut(vendeg, 'behoz', join(gazda, 'mind.jsonl'));
        const g = (await readFile(join(gazda, 'mind.jsonl'), 'utf8')).split('\n').filter(Boolean).map((x) => JSON.parse(x))
          .find((e) => e.tipus === 'GondolatLetrehozas').azonosito.slice(0, 8);
        await fut(vendeg, 'pont', g, '5');                    // a vendég vállalja — kéri a törzsét
        await fut(gazda, 'pont', g, '0');                     // a gazda már nem vállalja
        figyelo = spawn(process.execPath, [KOINO_JS, 'figyel', String(port)], {
          env: { ...process.env, KOINO_ADAT: gazda, KOINO_NAPLO: '', KOINO_KISZOLGALAS: mod }, stdio: 'ignore' });
        await varj(1500);
        await fut(vendeg, 'csere', '127.0.0.1', String(port), { KOINO_KISZOLGALAS: 'alap' });
        await fut(vendeg, 'csere', '127.0.0.1', String(port), { KOINO_KISZOLGALAS: 'alap' });
        return !!(await readFile(join(vendeg, 'sajat', 'fajlok', fel.adat.lenyomat)).catch(() => null));
      } finally {
        if (felulet) felulet.folyamat.kill();
        if (figyelo) { figyelo.kill(); await varj(800); }
        await rm(gazda, { recursive: true, force: true });
        await rm(vendeg, { recursive: true, force: true });
      }
    };
    const alap = await futas('alap', 7680, 7682);
    const mindent = await futas('mindent', 7681, 7683);
    const ki = { alapNemAdja: !alap, mindentAdja: mindent };
    if (!Object.values(ki).every(Boolean)) process.stdout.write('  törzs — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + '\n');
    return Object.values(ki).every(Boolean);
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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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

    // A kör-sorok időbélyege: „· HH:MM:SS nincs kire kopognom…" (nincs cél, ez elég). ⚠️ CSAK a kör-sorok: a
    // címjegyzék hirdetése (D91/3) a háttérben fut, és a saját sorát a saját idejével írja — az nincs a rácson.
    const masodpercek = [...kimenet.matchAll(/(\d{1,2}):(\d{2}):(\d{2}) nincs kire kopognom/g)]
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
      // ⭐ D93/3: NYÍLT koinó — a hír továbbadása a tárgy (három készülék), nem a zárt koinó kapuja.
      await fut(forrasHely, 'koino', 'Ismételt menet', 'nyilt');
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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)
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
  await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
  await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
      await taggaTesziKeszulek(egyik, masik);   // ⭐ D93/3: zárt koinó — a masik TAG (különben csak a születést kapná)

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
      await taggaTesziKeszulek(egyik, masik);   // ⭐ D93/3: zárt koinó — a masik TAG (különben csak a születést kapná)
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
      await taggaTesziKeszulek(egyik, masik);   // ⭐ D93/3: zárt koinó — a masik TAG (különben csak a születést kapná)
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

      // ⭐ D89/1 óta a csere kézfogással kezdődik — a hamis társ (kopogásra felel, cserélni nem hajlandó) már
      // ott elakad, és a napló ezt pontosabban mondja ki: „nem fogott kezet”.
      return /rés nyílt \(127\.0\.0\.1:\d+\), de a csere a résen elbukott: A társ nem fogott kezet/.test(kimenet)
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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
    await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)

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
    await taggaTesziKeszulek(vendeg, gazda);   // ⭐ D93/3: zárt koinó — a gazda TAG (különben csak a születést kapná)
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
      // ⭐ D93: EGY koinó (két külön alapítás két gyökér volna) — a másik a születését kapja meg, és tag lesz.
      await fut(egyik, 'kivisz', join(egyik, 'szuletes.jsonl'));
      await fut(masik, 'behoz', join(egyik, 'szuletes.jsonl'));
      await taggaTesziKeszulek(egyik, masik);

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
      await taggaTesziKeszulek(gazda, vendeg);   // ⭐ D93/3: zárt koinó — a vendeg TAG (különben csak a születést kapná)
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
