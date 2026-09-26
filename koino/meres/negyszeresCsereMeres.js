// koino/meres/negyszeresCsereMeres.js

// Felelősség: MEGMÉRNI, HÁNY CSERE MEGY LE KÉT KÉSZÜLÉK KÖZÖTT EGY ABLAKBAN, ha egymást KÉT
// címen érik el, és mindkettő a saját körében is kopog — az (a) döntés folytatásának 2. lépése.
//
// ===== ⛔ MIÉRT (43. mérés, 2026-09-26) =====
//
// Otthon a telefon és a laptop percenként NÉGYSZER cserélt: két címen érték el egymást (helyi +
// nyilvános, a router hairpinningel), és mindkettő a saját körében is kopogott. Egy „nincs
// újdonság" csere ~1,4 KB — egyperces körrel társanként ~8 MB/nap.
//
// ⭐ A négy KÉT TÉNYEZŐ szorzata — a CÍMEK száma × az IRÁNYOK száma —, és a mérés a kettőt
// külön kapcsolja:
//
//   · CÍMEK: `ketto` (hurok-cím + helyi cím — ugyanaz a társ két címen, mint a hairpinningnél)
//     vagy `egy` (csak a hurok-cím);
//   · IRÁNYOK: a B órája eltolható (`csúszás`). Két valódi készülék körei soha nem esnek
//     pontosan egybe (óra-eltérés, késés), egy gépen viszont igen — ezért a csúszást kívülről
//     adjuk. ⚠️ Az eltolás a B folyamatában a `Date.now`-t tolja el (`--import`), a koinóhoz nem
//     nyúl: az ablak a fal órájához igazodik, és a B „fala" így máshol áll.
//
// ⭐ HOGY KÉT SOR UGYANAZ A CSERE-E: minden csere mindkét oldalon fut (a `parbeszed`
// szimmetrikus), tehát az A és a B naplójában is egy-egy sort hagy. A cserék száma az A sorainak
// száma — ha a B-é eltér, azt kimondjuk (D19).
//
// ⭐ MIT SZÁMOLUNK: a mérés a fal órájához igazított ablakokat nézi (az A órája a valódi óra).
// A BEMELEGÍTÉS az első találkozás (ott megy át az A eseménye) — amíg mindkét gép le nem zárta
// az első körét; ezt külön írjuk ki. Utána `ablakok` darab ablak az ÁLLANDÓSULT állapot: ebben
// minden kör „nincs újdonság" csere, tehát ez a D35 ára.
// ⭐ A 46. mérés óta (D71 (ii)) a bemelegítés után a gép már TUDJA, hogy a két cím ugyanaz a
// társ (a kötés megjegyezte) — ezért két címen is 1 csere/ablak; a bemelegítés még kettő.
//
// ⚠️ A mérés semmit nem küld ki a gépből: a DHT belépő nélkül fut (`KOINO_DHT_BELEPOK=nincs`), a
// tükör egy néma helyi port (`KOINO_TUKOR=127.0.0.1:9`). A két adat-mappa eldobható, a portok
// (7611, 7612) nem a 7373 — ott futhat egy valódi őrjárat.
//
// Futtatás:
//   node koino/meres/negyszeresCsereMeres.js [csúszás mp] [ketto|egy] [ablak percben] [ablakok]
//   pl.  node koino/meres/negyszeresCsereMeres.js 15 ketto 0.5 5

import { spawn, execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';

const KOINO_JS = new URL('../koino.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PORT_A = 7611;
const PORT_B = 7612;
const KORNYEZET = { KOINO_NAPLO: '', KOINO_DHT_BELEPOK: 'nincs', KOINO_TUKOR: '127.0.0.1:9' };

function kiir(sor = '') { process.stdout.write(sor + '\n'); }
const varj = (ms) => new Promise((kesz) => setTimeout(kesz, ms));

/** Egy `koino.js` parancs egy eldobható készüléken. */
function fut(hely, ...ervek) {
  return new Promise((kesz, hiba) => execFile(process.execPath, [KOINO_JS, ...ervek],
    { env: { ...process.env, ...KORNYEZET, KOINO_ADAT: hely }, timeout: 30000 },
    (h, ki, hk) => (h && !ki ? hiba(h) : kesz(ki + hk))));
}

/** A gép első nem-hurok IPv4-címe — ez a „helyi cím" (a hairpinning utánzata). */
function helyiCim() {
  for (const lista of Object.values(networkInterfaces())) {
    for (const c of lista ?? []) if (c.family === 'IPv4' && !c.internal) return c.address;
  }
  return null;
}

// ===== A NAPLÓ OLVASÁSA =====

// „✓ 18:37:24 csere a résen 127.0.0.1:7612 — 0 új esemény, küldtem 0 (1 kör, 1.1 KB)"
const CSERE_SOR = /csere a résen (\S+) — (\d+) új esemény, küldtem (\d+) \((\d+) kör, ([\d.]+) (bájt|KB)\)/;
const BEKOPOGO_SOR = /ismeretlen kopogott be \((\S+)\)/;

/**
 * Egy őrjárat indítása; a sorokat a MI óránk szerint bélyegezzük (a napló `ora()`-ja a B-nél
 * az eltolatlan órát mutatná, és másodpercre kerekít).
 */
function orjarat(hely, port, perc, csuszasMs) {
  const elotag = csuszasMs
    ? ['--import', 'data:text/javascript,const d=Date.now;Date.now=()=>d()+' + csuszasMs + ';']
    : [];
  const folyamat = spawn(process.execPath, [...elotag, KOINO_JS, 'orjarat', String(perc), String(port)],
    { env: { ...process.env, ...KORNYEZET, KOINO_ADAT: hely }, stdio: ['ignore', 'pipe', 'pipe'] });
  const sorok = [];
  let maradek = '';
  const olvas = (darab) => {
    const most = Date.now();
    const reszek = (maradek + darab).split('\n');
    maradek = reszek.pop();
    for (const s of reszek) sorok.push({ ido: most, szoveg: s.replace(/\x1b\[[0-9;]*m/g, '') });
  };
  folyamat.stdout.on('data', olvas);
  folyamat.stderr.on('data', olvas);
  return { folyamat, sorok };
}

/** A csere-sorok egy időszakban: cím, új esemény, bájt. */
function cserek(sorok, tol, ig) {
  const lista = [];
  for (const s of sorok) {
    if (s.ido < tol || s.ido >= ig) continue;
    const m = s.szoveg.match(CSERE_SOR);
    if (!m) continue;
    lista.push({ ido: s.ido, cim: m[1], uj: Number(m[2]), kuldott: Number(m[3]),
      bajt: m[6] === 'KB' ? Math.round(Number(m[5]) * 1024) : Number(m[5]) });
  }
  return lista;
}

const bekopogasok = (sorok, tol, ig) =>
  sorok.filter((s) => s.ido >= tol && s.ido < ig && BEKOPOGO_SOR.test(s.szoveg)).length;

const kb = (bajt) => (bajt / 1024).toFixed(1).replace('.', ',') + ' KB';
const mb = (bajt) => (bajt / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';

// ===== A MÉRÉS =====

async function meres() {
  const csuszasMp = Number(process.argv[2] ?? 0);
  const cimek = process.argv[3] ?? 'ketto';
  const perc = Number(process.argv[4] ?? 0.5);
  const ablakok = Math.max(1, parseInt(process.argv[5] ?? '5', 10));
  const ablakMs = Math.round(perc * 60 * 1000);
  const csuszasMs = Math.round(csuszasMp * 1000) % ablakMs;
  const helyi = helyiCim();
  if (cimek === 'ketto' && !helyi) {
    kiir('⚠ Nincs helyi (nem hurok) IPv4-cím — a két cím nem mérhető ezen a gépen.');
    process.exit(2);
  }

  kiir('NÉGYSZERES CSERE — hány csere megy egy ablakban két készülék között?');
  kiir('  csúszás: ' + csuszasMs / 1000 + ' mp (a B órája) · címek: '
    + (cimek === 'ketto' ? 'kettő (127.0.0.1 + ' + helyi + ')' : 'egy (127.0.0.1)')
    + ' · ablak: ' + perc + ' perc · ' + ablakok + ' ablak');

  const A = await mkdtemp(join(tmpdir(), 'koino-negyszeres-A-'));
  const B = await mkdtemp(join(tmpdir(), 'koino-negyszeres-B-'));
  let a = null, b = null;
  try {
    // Az A-nak van mit átadnia (a koino és egy gondolat) — a bemelegítés ezt viszi át.
    await fut(A, 'koino', 'Negyszeres meres');
    await fut(A, 'gondolat', 'Az A gondolata');
    for (const [hely, port] of [[A, PORT_B], [B, PORT_A]]) {
      await fut(hely, 'tars', '127.0.0.1', String(port), 'hurok');
      if (cimek === 'ketto') await fut(hely, 'tars', helyi, String(port), 'helyi');
    }

    a = orjarat(A, PORT_A, perc, 0);
    b = orjarat(B, PORT_B, perc, csuszasMs);

    // ⛔ A BEMELEGÍTÉS VÉGE NEM AZ ELSŐ ABLAK-HATÁR (mérve, 2026-09-26): ha a két gép néhány
    // másodperccel egy határ előtt indult, az első kör (két menettel) átnyúlik rajta, és a program
    // a KÖVETKEZŐ ablakig vár — egy ablak kör nélkül marad, amit a mérés „0 csere"-nek számolt
    // (0 · 1 · 1 · 1 · 1). ⭐ Ezért a számolás csak azután kezdődik, hogy MINDKÉT gép lezárta az
    // első körét, a rákövetkező ablak-határon.
    const korVege = /\d+\/\d+ társ|címre kopogtam|nincs kire kopognom/;
    const lezarta = (o) => o.sorok.some((s) => korVege.test(s.szoveg));
    for (let i = 0; i < 240 && !(lezarta(a) && lezarta(b)); i++) await varj(250);
    const elsoHatar = Math.ceil((Date.now() + 1) / ablakMs) * ablakMs;
    const vege = elsoHatar + ablakok * ablakMs;
    await varj(vege - Date.now() + 3000);
    a.folyamat.kill(); b.folyamat.kill();
    a.folyamat = null; b.folyamat = null;
    await varj(1000);

    // ===== BEMELEGÍTÉS: az első találkozás =====
    const elsoA = cserek(a.sorok, 0, elsoHatar);
    const elsoB = cserek(b.sorok, 0, elsoHatar);
    const bUj = elsoB.reduce((s, c) => s + c.uj, 0);
    const tarB = (await readFile(join(B, 'sajat', 'esemenyek.jsonl'), 'utf8').catch(() => ''))
      .split('\n').filter(Boolean).map((s) => JSON.parse(s).azonosito);
    kiir();
    kiir('BEMELEGÍTÉS (az első találkozás — amíg mindkét gép le nem zárta az első körét):');
    kiir('  ' + elsoA.length + ' csere (a B naplója: ' + elsoB.length + ') · a B '
      + bUj + ' „új esemény"-t jelentett — a tárában ' + tarB.length + ' sor, '
      + new Set(tarB).size + ' különböző esemény');
    kiir('  bájt a B oldalán: ' + elsoB.map((c) => kb(c.bajt)).join(' + '));

    // ===== ÁLLANDÓSULT ÁLLAPOT =====
    const allandoA = cserek(a.sorok, elsoHatar, vege);
    const allandoB = cserek(b.sorok, elsoHatar, vege);
    const ablakonkent = [];
    for (let i = 0; i < ablakok; i++) {
      const tol = elsoHatar + i * ablakMs;
      ablakonkent.push(allandoA.filter((c) => c.ido >= tol && c.ido < tol + ablakMs).length);
    }
    const bajtok = allandoA.map((c) => c.bajt).sort((x, y) => x - y);
    const osszBajt = bajtok.reduce((s, x) => s + x, 0);
    const ablakBajt = osszBajt / ablakok;
    kiir();
    kiir('ÁLLANDÓSULT (' + ablakok + ' ablak):');
    kiir('  ' + allandoA.length + ' csere → ' + (allandoA.length / ablakok).toFixed(1).replace('.', ',')
      + ' / ablak (ablakonként: ' + ablakonkent.join(' · ') + ') · a B naplója: ' + allandoB.length
      + (allandoB.length !== allandoA.length ? ' ⚠ ELTÉR' : ''));
    kiir('  címenként: ' + [...new Set(allandoA.map((c) => c.cim))]
      .map((cim) => cim + ' ' + allandoA.filter((c) => c.cim === cim).length).join(' · '));
    kiir('  bekopogásra indult (a naplók „ismeretlen kopogott be" sorai): A ' + bekopogasok(a.sorok, elsoHatar, vege)
      + ' · B ' + bekopogasok(b.sorok, elsoHatar, vege));
    if (bajtok.length) {
      kiir('  egy csere: ' + bajtok[0] + '–' + bajtok[bajtok.length - 1] + ' bájt (medián '
        + bajtok[Math.floor(bajtok.length / 2)] + ')');
      kiir('  ablakonként ' + kb(ablakBajt) + ' → egy készüléknek EGY társsal: egyperces körrel '
        + mb(ablakBajt * 1440) + '/nap, ötperccel ' + mb(ablakBajt * 288) + '/nap');
    }
    return 0;
  } finally {
    if (a?.folyamat) a.folyamat.kill();
    if (b?.folyamat) b.folyamat.kill();
    await varj(500);
    await rm(A, { recursive: true, force: true });
    await rm(B, { recursive: true, force: true });
  }
}

meres().then((kod) => process.exit(kod));
