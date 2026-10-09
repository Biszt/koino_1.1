// koino/meres/lancEllenorzesProba.js

// Felelősség: bizonyítani, hogy a LÁNC-ELLENŐRZÉS (D98/2–4 — `allapot/lancEllenorzes.js`) működik: a becsületes szerző
// minden kérdésre igazoló választ ad (a fej, a többi esemény, a következetesség), és a következő körben a korábban
// ellenőrzött eseményeket nem kérdezzük újra; a két ágú szerzőtől kapott válaszból a meglévő ELÁGAZÁS-bizonyíték lesz (a
// fejnél és egy régebbi eseménynél is); a hamis lista-válaszból (D79) a NEGATÍV LEVÉL bizonyítéka; a hallgatás és a
// koholt bizonyíték függőben hagy (nem vád); és a szerző oldala a részfa-gyorsítótárral ugyanazt a bizonyítékot adja.
//
// Futtatás: node koino/meres/mind.js lancellenorzes

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { probaGyujtemeny } from './probaFuttato.js';
import { esemenyTarNyitasa, fajlBlobTarolo, lancTarolo } from '../js/tar/fajlTar.js';
import { sajatLancEsemenyei, esemenyMentese } from '../js/tar/esemenyTar.js';
import { koinoLetrehozasa, gondolatLetrehozasa, tudatpontRendezese } from '../js/muveletek.js';
import { lancAllapotaLancbol, lancGyokerKetGyokerbol, lancUjEsemenyhez, KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ } from '../js/allapot/lancGyoker.js';
import { esemenyLetrehozasa } from '../js/esemeny/esemeny.js';
import { allapotLista, ujAllapotFa, allapotBeallitas, allapotGyokere } from '../js/esemeny/osszegzoFa.js';
import {
  lancKerdesek, lancValaszokFeldolgozasa, lancKiszolgalo, memoriaLancTarolo, lancEllenorzesAllasa, lancKerdesAlakja
} from '../js/allapot/lancEllenorzes.js';

const { proba, futtatas } = probaGyujtemeny('A lánc-ellenőrzés a cserében (D98/2–4)');

const KOINO = 'lanc-ellenorzes-proba';
const mappak = [];
const ujMappa = async () => { const m = await mkdtemp(join(tmpdir(), 'koino-lancell-')); mappak.push(m); return m; };

async function ujKulcs() {
  const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const szerzo = Buffer.from(await crypto.subtle.exportKey('raw', kulcspar.publicKey)).toString('base64url');
  return { kulcspar, szerzo };
}

/** Egy „készülék” (tár) és rajta egy e-ember környezete; a kulcs megadható (a második készülék ugyanazzal a kulccsal). */
async function keszulek(kulcs = null) {
  const mappa = await ujMappa();
  const tar = await esemenyTarNyitasa(KOINO, mappa);
  const { kulcspar, szerzo } = kulcs ?? await ujKulcs();
  return { koino: KOINO, kulcspar, szerzo, tar, darabTar: fajlBlobTarolo(KOINO, mappa), lancTarolo: lancTarolo(KOINO, mappa) };
}

/** A szerző becsületes élete: koinó, két gondolat, pontok. */
async function elet(k) {
  await koinoLetrehozasa(k, 'Lánc-ellenőrzés');
  const g1 = await gondolatLetrehozasa(k, { cim: 'Első' });
  const g2 = await gondolatLetrehozasa(k, { cim: 'Második' });
  await tudatpontRendezese(k, g1.azonosito, 30);
  await tudatpontRendezese(k, g2.azonosito, 20);
  return { g1, g2 };
}

/** Néhány esemény átvétele egy másik tárba (ugyanazon a kapun). */
async function atvesz(tar, esemenyek) {
  for (const e of esemenyek) {
    const m = await esemenyMentese(tar, e);
    if (!m.mentve && !m.marMegvolt) throw new Error('nem menthető: ' + m.ok);
  }
}

/** Egy kérdés-válasz kör: H kérdez X-ről, a kiszolgáló (a szerző tára) felel. */
async function kor(H, tarolo, szerzo, kiszolgalo, beallitas = {}) {
  const k = { tar: H.tar, koino: KOINO, tarolo, ...beallitas };
  const kerdesek = await lancKerdesek(k, [szerzo]);
  const valaszok = kiszolgalo ? await kiszolgalo.valasz(JSON.parse(JSON.stringify(kerdesek))) : [];
  const r = await lancValaszokFeldolgozasa(k, kerdesek, JSON.parse(JSON.stringify(valaszok)));
  return { kerdesek, valaszok, ...r };
}

// ===================================
// 1. A BECSÜLETES SZERZŐ
// ===================================

proba('⭐⭐ a becsületes szerző mindent igazol (a fej és a többi esemény) — a következő körben csak az ÚJAT kérdezzük, a régit a következetesség viszi', async () => {
  const X = await keszulek();
  const { g1 } = await elet(X);
  const H = await keszulek();
  let lanc = await sajatLancEsemenyei(X.tar, X.szerzo);
  await atvesz(H.tar, [lanc[1], lanc[3], lanc[4]]);
  const tarolo = memoriaLancTarolo();
  const kiszolgalo = lancKiszolgalo({ tar: X.tar, koino: KOINO });
  const elso = await kor(H, tarolo, X.szerzo, kiszolgalo, { veletlen: () => 1 });
  // a szerző dolgozik tovább; H megkapja az új fejet és egy köztes eseményt
  await tudatpontRendezese(X, g1.azonosito, 40);
  await gondolatLetrehozasa(X, { cim: 'Harmadik' });
  await gondolatLetrehozasa(X, { cim: 'Negyedik' });
  lanc = await sajatLancEsemenyei(X.tar, X.szerzo);
  await atvesz(H.tar, [lanc[5], lanc[7]]);
  const masodik = await kor(H, tarolo, X.szerzo, kiszolgalo, { veletlen: () => 1 });
  const harmadik = await kor(H, tarolo, X.szerzo, kiszolgalo, { veletlen: () => 1 });
  const allas = await lancEllenorzesAllasa(tarolo);
  return elso.igazolt === 3 && elso.leletek.length === 0 && elso.fuggo === 0
    && masodik.kerdesek[0].r === lanc[4].sorszam - 1 && masodik.kerdesek[0].i.length === 2   // a régi fej + a köztes (6.)
    && masodik.igazolt === 3 && masodik.fuggo === 0
    && harmadik.kerdesek.length === 0                                                         // nincs mit kérdezni
    && allas.length === 1 && allas[0].ellenorzott === lanc[7].sorszam - 1 && allas[0].fuggoOta === null;
});

proba('⭐ a szerző oldala a részfa-gyorsítótárral ugyanazt adja, mint nélküle — és a saját magunkról nem kérdezünk', async () => {
  const X = await keszulek();
  await elet(X);
  for (let i = 0; i < 70; i++) await gondolatLetrehozasa(X, { cim: 'G' + i });
  const lanc = await sajatLancEsemenyei(X.tar, X.szerzo);
  const H = await keszulek();
  await atvesz(H.tar, [lanc[2], lanc[40], lanc[68], lanc[lanc.length - 1]]);
  const kiszolgalo = lancKiszolgalo({ tar: X.tar, koino: KOINO });
  const tarolo = memoriaLancTarolo();
  const kerdesek = await lancKerdesek({ tar: H.tar, koino: KOINO, tarolo }, [X.szerzo]);
  const egyszer = JSON.stringify(await kiszolgalo.valasz(kerdesek));
  const ujra = JSON.stringify(await kiszolgalo.valasz(kerdesek));                 // a gyorsítótárból
  const friss = JSON.stringify(await lancKiszolgalo({ tar: X.tar, koino: KOINO }).valasz(kerdesek));
  const r = await lancValaszokFeldolgozasa({ tar: H.tar, koino: KOINO, tarolo }, kerdesek, JSON.parse(ujra));
  const sajat = await lancKerdesek({ tar: H.tar, koino: KOINO, tarolo: memoriaLancTarolo(), sajat: X.szerzo }, [X.szerzo]);
  return egyszer === ujra && ujra === friss && r.igazolt === 4 && r.fuggo === 0 && sajat.length === 0;
});

// ===================================
// 2. A KÉT ÁGÚ SZERZŐ — az elágazás bizonyítéka
// ===================================

/** Két készülék ugyanazzal a kulccsal: a közös előtag után mindkettő a maga ágán ír. */
async function ketAg() {
  const A = await keszulek();
  const { g1, g2 } = await elet(A);
  const B = await keszulek({ kulcspar: A.kulcspar, szerzo: A.szerzo });
  await atvesz(B.tar, await sajatLancEsemenyei(A.tar, A.szerzo));
  await tudatpontRendezese(A, g1.azonosito, 50);         // az A ág: 6. esemény
  await gondolatLetrehozasa(A, { cim: 'A ág' });          // 7.
  await tudatpontRendezese(B, g2.azonosito, 50);         // a B ág: 6. esemény (más)
  await gondolatLetrehozasa(B, { cim: 'B ág' });          // 7.
  return { A, B, la: await sajatLancEsemenyei(A.tar, A.szerzo), lb: await sajatLancEsemenyei(B.tar, B.szerzo) };
}

proba('⭐⭐ a két ág egy tartónál: a FEJ nem a szerzőé (a másik ágról) — a válaszból elágazás-bizonyíték lesz', async () => {
  const { A, B, la, lb } = await ketAg();
  const H = await keszulek();
  await atvesz(H.tar, [la[3], lb[6]]);                   // a fej a B ág 7. eseménye
  const r = await kor(H, memoriaLancTarolo(), A.szerzo, lancKiszolgalo({ tar: A.tar, koino: KOINO }));
  const l = r.leletek[0];
  return r.leletek.length === 1 && l.fajta === 'elagazas' && l.esemeny.azonosito === lb[6].azonosito
    && l.masik.azonosito === la[6].azonosito && r.fuggo === 1;
});

proba('⭐⭐ a két ág egy tartónál: egy RÉGEBBI esemény a másik ágról — a szerző az ott álló sajátját adja, és az is bizonyíték', async () => {
  const { A, la, lb } = await ketAg();
  const H = await keszulek();
  await atvesz(H.tar, [lb[5], la[6]]);                   // a fej az A ág 7.-e; a B ág 6.-a régebbi
  const r = await kor(H, memoriaLancTarolo(), A.szerzo, lancKiszolgalo({ tar: A.tar, koino: KOINO }));
  const l = r.leletek[0];
  return r.leletek.length === 1 && l.fajta === 'elagazas' && l.esemeny.azonosito === lb[5].azonosito
    && l.masik.azonosito === la[5].azonosito;
});

proba('⛔ a két ágú szerző: a régi (a MÁSIK ágon ellenőrzött) fej az új fejnél újra kérdés — és a válaszból azonnal bizonyíték', async () => {
  const { A, B, la, lb } = await ketAg();
  const H = await keszulek();
  const tarolo = memoriaLancTarolo();
  // H először a B ágról tud (a B készülék felel), aztán az A ág fejét kapja meg, és az A készülék felel
  await atvesz(H.tar, [lb[6]]);
  await kor(H, tarolo, A.szerzo, lancKiszolgalo({ tar: B.tar, koino: KOINO }));
  await gondolatLetrehozasa(A, { cim: 'A ág tovább' });
  const la2 = await sajatLancEsemenyei(A.tar, A.szerzo);
  await atvesz(H.tar, [la2[7]]);
  const r = await kor(H, tarolo, A.szerzo, lancKiszolgalo({ tar: A.tar, koino: KOINO }));
  // a B ág 7.-e (a régi fej) a kérdések elején van, és ellentmond
  return r.kerdesek[0].r === lb[6].sorszam - 1 && r.leletek.length === 1 && r.leletek[0].masik.azonosito === la[6].azonosito;
});

// ===================================
// 3. A HALLGATÁS, A KOHOLT VÁLASZ, ÉS A D79 LISTA
// ===================================

proba('⛔ a hallgatás és a koholt bizonyíték nem igazol — függőben marad (nem vád), és a következő körben újra kérdezzük', async () => {
  const X = await keszulek();
  await elet(X);
  const lanc = await sajatLancEsemenyei(X.tar, X.szerzo);
  const H = await keszulek();
  await atvesz(H.tar, [lanc[1], lanc[4]]);
  const tarolo = memoriaLancTarolo();
  const hallgat = await kor(H, tarolo, X.szerzo, null);
  const kerdesek = await lancKerdesek({ tar: H.tar, koino: KOINO, tarolo }, [X.szerzo]);
  const valasz = await lancKiszolgalo({ tar: X.tar, koino: KOINO }).valasz(kerdesek);
  valasz[0].i[0].ut = valasz[0].i[0].ut.map((p) => ({ ...p, l: p.l.slice(0, 42) + (p.l[42] === 'A' ? 'B' : 'A') }));
  valasz[0].f = 0;                                        // a fej sincs megerősítve
  const koholt = await lancValaszokFeldolgozasa({ tar: H.tar, koino: KOINO, tarolo }, kerdesek, valasz);
  const allas = await lancEllenorzesAllasa(tarolo);
  return hallgat.fuggo === 1 && hallgat.igazolt === 0 && koholt.igazolt === 0 && koholt.leletek.length === 0
    && koholt.fuggo === 1 && allas[0].ellenorzott === null && allas[0].fuggoOta !== null && allas[0].kerdezve === 2;
});

proba('⭐⭐ D79: a teljes kiosztás-lista — a hazug fa listájából a NEGATÍV LEVÉL bizonyítéka; a becsületes listából semmi', async () => {
  const X = await keszulek();
  await elet(X);
  const lanc = await sajatLancEsemenyei(X.tar, X.szerzo);
  const igaz = await lancAllapotaLancbol(lanc);
  // a csaló a következő eseményben egy −500-as levelet is elköt
  const csaloFa = ujAllapotFa(KIOSZTAS_FAJTA, KIOSZTAS_HOSSZ);
  for (const l of allapotLista(igaz.kiosztasFa)) await allapotBeallitas(csaloFa, l.kulcs, null, l.osszegek);
  const rejtett = 'R'.repeat(43);
  await allapotBeallitas(csaloFa, rejtett, null, [-500]);
  const utolso = lanc[lanc.length - 1];
  const e = await esemenyLetrehozasa({ koino: KOINO, tipus: 'GondolatLetrehozas', adat: { cim: 'Csaló' }, entitas: null,
    entitasSorszam: 1, elozo: utolso.azonosito, sorszam: utolso.sorszam + 1,
    lancGyoker: lancGyokerKetGyokerbol(igaz.naploGyoker, await allapotGyokere(csaloFa)) }, X.kulcspar);
  await atvesz(X.tar, [e]);
  const H = await keszulek();
  await atvesz(H.tar, [e]);
  const tarolo = memoriaLancTarolo();
  const kerdesek = await lancKerdesek({ tar: H.tar, koino: KOINO, tarolo, veletlen: () => 0 }, [X.szerzo]);
  // a becsületes kiszolgáló a láncból számol: a lista nem adja a csaló gyökerét → nincs bizonyíték
  const becsuletes = await lancKiszolgalo({ tar: X.tar, koino: KOINO }).valasz(kerdesek);
  const r1 = await lancValaszokFeldolgozasa({ tar: H.tar, koino: KOINO, tarolo: memoriaLancTarolo() }, kerdesek, becsuletes);
  // a csaló a saját (hamis) fájának listáját adja
  const hazug = JSON.parse(JSON.stringify(becsuletes));
  hazug[0].k = allapotLista(csaloFa).map((t) => [t.kulcs, t.osszegek[0]]);
  const r2 = await lancValaszokFeldolgozasa({ tar: H.tar, koino: KOINO, tarolo: memoriaLancTarolo() }, kerdesek, hazug);
  return kerdesek[0].k === 1 && Array.isArray(becsuletes[0].k) && r1.leletek.length === 0
    && r2.leletek.length === 1 && r2.leletek[0].fajta === 'negativ' && r2.leletek[0].kulcs === rejtett
    && r2.leletek[0].vadpont === e.sorszam;
});

proba('⛔ a társ kérdésének alakja: a hibás tételek kimaradnak (rossz kulcs, a fán kívüli sorszám, hibás következetesség)', () => {
  const k = 'k'.repeat(43);
  const q = lancKerdesAlakja({ sz: k, d: 5, f: k, i: [[1, k], [6, k], [0, k], [2, 'rossz']], r: 9, k: 2 });
  return q && q.i.length === 1 && q.r === undefined && q.k === undefined
    && lancKerdesAlakja({ sz: 'rossz', d: 5, f: k }) === null && lancKerdesAlakja({ sz: k, d: -1, f: k }) === null;
});

export default async function () {
  const eredmeny = await futtatas();
  for (const m of mappak) await rm(m, { recursive: true, force: true });
  return eredmeny;
}
