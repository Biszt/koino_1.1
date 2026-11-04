// koino/js/csere/meghivo.js

// Felelősség: ⭐⭐ D121, D122 — A MEGHÍVÓ SZÖVEGE ÉS A BIZONYÍTÉK (a meghívás a lapon: „egy bemásolás, és a következő csere után
// bent vagy” — docs/meghivas_atvizsgalas.md). Tiszta számítás, hálózat nélkül (1. szabály).
//
// ⭐ A MEGHÍVÓ (D122): egy sor — `koino-meghivo:2:<base64url(JSON)>` —, benne a koinó neve (`k`), a meghívó készülékének
// tábla-aláírója (`t` — a kopogtatáshoz, MH6, és hogy a belépő tudja, KIT keres: D71), a címei (`c`: [[hoszt, port], …]), a meghívó
// AZONOSÍTÓJA (`i`) és TITKA (`s`), a meghívott neve (`m` — amit a meghívó beírt: a belépő profil-űrlapjának előtöltése), a lejárat
// (`l`) és a koinó kötelező profil-mezői (`p`, ha vannak). ⚠️ A titok miatt a meghívó KULCS: aki elsőként használja, az jut be —
// ezért egyszer használható, egy hónapig él, és a meghívó felhasználás előtt visszavonhatja (D122). A szöveg base64url-be
// csomagolt, nem titkosított: a meghívott neve olvasható benne.
//
// ⭐ A BIZONYÍTÉK (D122): a belépő az első cserében (a kapu személy-körében) megmutatja, hogy nála a titok: a meghívó azonosítója
// és egy HMAC a titokkal — a koinóra, a SZEMÉLYES kulcsára és a horgonyára kötve (másra nem másolható át; és a titok maga nem
// utazik). A meghívó készüléke (aki a titkot kiadta) ellenőrzi, és magától aláírja a meghívást. Eseménybe nem kerül.
//
// ⛔ A BEOLVASÁS a kívülről jött szöveget úgy kezeli, mint a kapu az eseményt: alak, hossz, a nevek alakja, a címek határai —
// a hibás meghívóból semmi nem lesz (null és az ok). A beillesztett üzenet körülötte lévő szövege (a telepítő sor is) nem zavar,
// és ha egy csatorna a sort tördelte, a szóközök kihagyásával is megpróbáljuk.
//
// Használják: koino.js (a lap és a parancsok), a próbák.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { azonositoAlaku } from '../esemeny/esemeny.js';

export const MEGHIVO_ELOTAG = 'koino-meghivo:2:';
/** A meghívó szöveg felső határa (jelben) — egy üzenetben, papíron is átvihető. */
export const MEGHIVO_KORLAT = 3072;
/** Legfeljebb ennyi cím egy meghívóban (a helyi címek és a nyilvános). */
export const MEGHIVO_CIM_KORLAT = 8;
/** ⭐ D122: egy meghívó egy hónapig él. */
export const MEGHIVO_ELETTARTAM = 30 * 24 * 3600 * 1000;
/**
 * ⭐ D122: a telepítő sor (a telepítési útmutató „legegyszerűbb útja” — 224.) — a meghívó a végére kerül: egy bemásolás telepít,
 * csatlakozik és belép. ⚠️ A program letöltési helye egy cím (a terjesztés útja — D30: a koino.hu, a GitHub, az F-Droid és az
 * e-emberek egymásnak); a sor a már telepített gépen is jó (a letöltést kihagyja).
 */
export const TELEPITO_SOR = 'yes | pkg upgrade && pkg install -y nodejs git && { [ -d ~/koino_1.1 ] || git clone --depth 1 '
  + 'https://github.com/Biszt/koino_1.1.git ~/koino_1.1; } && sh ~/koino_1.1/koino/termux/telepit.sh';
/**
 * ⭐ A WINDOWSOS telepítő sor (2026-11-04 — a terepi lelet: a Termux-sor egy Windowsos laptop parancssorában az első szónál, a
 * `yes`-nél megállt; elágazás 232). EGY sor, ami a PowerShellben ÉS a régi parancssorban (cmd) is ugyanígy fut: a `powershell` maga
 * a parancs, a többi egy idézőjeles -Command szöveg. ⛔ Ezért a szövegben nincs `$`, `` ` ``, `%`, `!` és belső `"` — a PowerShell a
 * dupla idézőjelben a `$`-t kibontaná, a cmd a `%`-ot (`windowsSorHibaja` őrzi). ⭐ A meghívó a záró idézőjel UTÁN jön: a Windows
 * PowerShell a -Command utáni szavakat a parancshoz fűzi, így a meghívó a telepítő első argumentuma lesz (mint a Termux-sorban).
 * A program a GitHub zip-jéből jön (`curl.exe` — a Windows része a 10-es 1803 óta — és az `Expand-Archive`; git nem kell; ⛔ nem
 * a `tar`: ahol a Git eszközei a PATH-on vannak, ott a GNU tar jön, és az a zip-et nem ismeri — mérve), a Node-ot a telepítő hozza
 * (`winget`), ha nincs. A sor a már telepített gépen is jó (a letöltést kihagyja).
 */
export const WINDOWS_TELEPITO_SOR = 'powershell -NoProfile -ExecutionPolicy Bypass -Command "cd ~; if (-not (Test-Path koino_1.1)) '
  + '{ curl.exe -fL -o koino_1.1.zip https://github.com/Biszt/koino_1.1/archive/refs/heads/main.zip; Expand-Archive koino_1.1.zip .; '
  + 'Rename-Item koino_1.1-main koino_1.1; Remove-Item koino_1.1.zip }; & .\\koino_1.1\\koino\\windows\\telepit.ps1"';
/** A Windowsos sor a telepítőt itt keresi (a `koino/` mappához képest) — a próba ebből nézi, hogy a fájl ott van. */
export const WINDOWS_TELEPITO_UT = 'windows/telepit.ps1';
const NEV_KORLAT = 64;
const MEZO_MINTA = /^[a-z]{1,32}$/;
const HOSZT_MINTA = /^[A-Za-z0-9.:%_-]{1,64}$/;
const JEL_MINTA = /^[A-Za-z0-9_-]{22,64}$/;
const AZ_MINTA = /^[A-Za-z0-9_-]{16,64}$/;

// ===== A CÍMEK ÉS A NEVEK ALAKJA =====

function cimAlakja(c) {
  const hoszt = Array.isArray(c) ? c[0] : c?.hoszt;
  const port = Number(Array.isArray(c) ? c[1] : c?.port);
  if (typeof hoszt !== 'string' || !HOSZT_MINTA.test(hoszt)) return null;
  if (!Number.isInteger(port) || port <= 0 || port >= 65536) return null;
  return [hoszt, port];
}

function nevAlakja(n) {
  if (typeof n !== 'string') return null;
  const tiszta = [...n.replace(/\p{Cc}/gu, ' ').trim()].slice(0, NEV_KORLAT).join('').trim();
  return tiszta || null;
}

// ===== AZ AZONOSÍTÓ ÉS A TITOK =====

/** Egy új meghívó azonosítója és titka (kriptográfiai véletlen). */
export function ujMeghivoJelei() {
  return { azonosito: randomBytes(12).toString('base64url'), titok: randomBytes(32).toString('base64url') };
}

// ===== A MEGHÍVÓ KÉSZÍTÉSE =====

/**
 * A meghívó szöveg — a koinó nevével, a meghívó készülékének tábla-aláírójával, a címeivel (a rossz alakú és az ismételt
 * kimarad, legfeljebb `MEGHIVO_CIM_KORLAT`), az azonosítóval és a titokkal, a meghívott nevével, a lejárattal és a kötelező
 * profil-mezőkkel.
 * @param {{koino: string, alairo: string, cimek?: Array, azonosito: string, titok: string, meghivottNev: string, lejarat: number,
 *   profilMezok?: Array<string>}} m
 * @returns {string}
 */
export function meghivoKeszitese({ koino, alairo, cimek = [], azonosito, titok, meghivottNev, lejarat, profilMezok = [] }) {
  if (!azonositoAlaku(koino)) throw new Error('A meghívó koinója egy 43 jeles név.');
  if (!azonositoAlaku(alairo)) throw new Error('A meghívó készülékének tábla-aláírója egy 43 jeles kulcs.');
  if (typeof azonosito !== 'string' || !AZ_MINTA.test(azonosito)) throw new Error('A meghívó azonosítója nem ép.');
  if (typeof titok !== 'string' || !JEL_MINTA.test(titok)) throw new Error('A meghívó titka nem ép.');
  const m = nevAlakja(meghivottNev);
  if (!m) throw new Error('A meghívott teljes neve kötelező.');
  if (!Number.isSafeInteger(lejarat) || lejarat <= 0) throw new Error('A meghívó lejárata nem ép.');
  const c = [];
  for (const x of cimek) {
    const a = cimAlakja(x);
    if (a && !c.some((y) => y[0] === a[0] && y[1] === a[1])) c.push(a);
    if (c.length >= MEGHIVO_CIM_KORLAT) break;
  }
  const p = [...new Set((profilMezok ?? []).filter((x) => typeof x === 'string' && MEZO_MINTA.test(x)))].slice(0, 16);
  return MEGHIVO_ELOTAG + Buffer.from(JSON.stringify({ k: koino, t: alairo, c, i: azonosito, s: titok, m, l: lejarat,
    ...(p.length ? { p } : {}) }), 'utf8').toString('base64url');
}

/** ⭐ D122: a meghívottnak küldendő EGY szöveg — a telepítő sor, a végén a meghívóval. */
export function telepitoSorMeghivoval(meghivo) {
  return TELEPITO_SOR + ' ' + meghivo;
}

/** ⭐ Ugyanez Windowsra (a PowerShellbe vagy a parancssorba) — a `WINDOWS_TELEPITO_SOR`, a végén a meghívóval. */
export function windowsTelepitoSorMeghivoval(meghivo) {
  return WINDOWS_TELEPITO_SOR + ' ' + meghivo;
}

/**
 * A puszta meghívó egy szövegből (a tárolt telepítő sorból — a Windowsos sor ebből készül a régi feljegyzéseknél is); ha nincs
 * benne, null.
 */
export function meghivoSzovegbol(szoveg) {
  if (typeof szoveg !== 'string') return null;
  const i = szoveg.indexOf(MEGHIVO_ELOTAG);
  if (i < 0) return null;
  const torzs = szoveg.slice(i + MEGHIVO_ELOTAG.length).match(/^[A-Za-z0-9_-]*/)[0];
  return torzs ? MEGHIVO_ELOTAG + torzs : null;
}

/**
 * ⛔ A Windowsos sor őre: a -Command szövegében (a két idézőjel között) nincs olyan jel, amit a hívó héj kibontana — a PowerShell
 * a `$`-t és a `` ` ``-t, a cmd a `%`-ot és a `!`-t —, belső idézőjel sincs, és a sor `powershell`-lel kezdődik. A meghívó
 * (a záró idézőjel után) csak a saját jeleit hordozhatja. @returns {string|null} a hiba, vagy null
 */
export function windowsSorHibaja(sor) {
  if (typeof sor !== 'string' || !sor.startsWith('powershell ')) return 'nem a powershell-lel kezdődik';
  const idezojelek = [...sor].filter((c) => c === '"').length;
  if (idezojelek !== 2) return 'nem pontosan két idézőjel van benne (' + idezojelek + ')';
  const parancs = sor.slice(sor.indexOf('"') + 1, sor.lastIndexOf('"'));
  const rossz = [...new Set([...parancs].filter((c) => '$`%!'.includes(c)))];
  if (rossz.length) return 'a héj kibontaná: ' + rossz.join(' ');
  const utana = sor.slice(sor.lastIndexOf('"') + 1).trim();
  if (utana && !/^[A-Za-z0-9_:-]+$/.test(utana)) return 'a záró idézőjel után nem csak a meghívó jelei állnak';
  return null;
}

// ===== A MEGHÍVÓ BEOLVASÁSA =====

/** Van-e a szövegben meghívó (az előtagja)? — a lap ebből tudja, hogy nem egy puszta koinó-nevet illesztettek be. */
export function meghivoE(szoveg) {
  return typeof szoveg === 'string' && szoveg.includes(MEGHIVO_ELOTAG);
}

function torzsOlvasasa(torzs) {
  if (!torzs || !/^[A-Za-z0-9_-]+$/.test(torzs)) return { hiba: 'a meghívó nem ép (a jelei)' };
  let j;
  try { j = JSON.parse(Buffer.from(torzs, 'base64url').toString('utf8')); } catch { return { hiba: 'a meghívó nem ép (a tartalma)' }; }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { hiba: 'a meghívó nem ép (a tartalma)' };
  if (!azonositoAlaku(j.k)) return { hiba: 'a meghívó koinója nem egy 43 jeles név' };
  if (!azonositoAlaku(j.t)) return { hiba: 'a meghívó készülékének kulcsa nem ép' };
  if (!Array.isArray(j.c) || j.c.length > MEGHIVO_CIM_KORLAT) return { hiba: 'a meghívó címei nem épek' };
  const cimek = [];
  for (const x of j.c) {
    const a = Array.isArray(x) && x.length === 2 ? cimAlakja(x) : null;
    if (!a) return { hiba: 'a meghívó egyik címe nem ép' };
    cimek.push({ hoszt: a[0], port: a[1] });
  }
  if (typeof j.i !== 'string' || !AZ_MINTA.test(j.i)) return { hiba: 'a meghívó azonosítója nem ép' };
  if (typeof j.s !== 'string' || !JEL_MINTA.test(j.s)) return { hiba: 'a meghívó titka nem ép' };
  const m = nevAlakja(j.m);
  if (!m) return { hiba: 'a meghívóból hiányzik a meghívott neve' };
  if (!Number.isSafeInteger(j.l) || j.l <= 0) return { hiba: 'a meghívó lejárata nem ép' };
  if (j.p !== undefined && (!Array.isArray(j.p) || j.p.length > 16 || !j.p.every((x) => typeof x === 'string' && MEZO_MINTA.test(x)))) {
    return { hiba: 'a meghívó profil-mezői nem épek' };
  }
  return { meghivo: { koino: j.k, alairo: j.t, cimek, azonosito: j.i, titok: j.s, meghivottNev: m, lejarat: j.l,
    profilMezok: j.p ?? [] } };
}

/**
 * A meghívó beolvasása egy beillesztett szövegből (a körülötte lévő szöveg — a telepítő sor is — nem zavar).
 * @returns {{meghivo: Object}|{hiba: string}}
 */
export function meghivoOlvasasa(szoveg) {
  if (typeof szoveg !== 'string') return { hiba: 'nincs meghívó' };
  const i = szoveg.indexOf(MEGHIVO_ELOTAG);
  if (i < 0) {
    return { hiba: szoveg.includes('koino-meghivo:') ? 'ez egy régi alakú meghívó — kérj újat a meghívódtól'
      : 'ez nem koino-meghívó (a „' + MEGHIVO_ELOTAG + '” előtag hiányzik)' };
  }
  const maradek = szoveg.slice(i + MEGHIVO_ELOTAG.length, i + MEGHIVO_ELOTAG.length + MEGHIVO_KORLAT + 256);
  // Előbb a megszakítás nélküli rész; ha az nem ép, a szóközök (egy tördelő csatorna sortörései) kihagyásával.
  const egyben = maradek.match(/^[A-Za-z0-9_-]*/)[0];
  if (egyben.length + MEGHIVO_ELOTAG.length > MEGHIVO_KORLAT) return { hiba: 'a meghívó túl hosszú' };
  const elso = torzsOlvasasa(egyben);
  if (elso.meghivo) return elso;
  const tordelt = maradek.match(/^[A-Za-z0-9_\s-]*/)[0].replace(/\s+/g, '');
  if (tordelt !== egyben && tordelt.length + MEGHIVO_ELOTAG.length <= MEGHIVO_KORLAT) {
    const masodik = torzsOlvasasa(tordelt);
    if (masodik.meghivo) return masodik;
  }
  return elso;
}

// ===== A BIZONYÍTÉK =====

function bizonyitekBajtjai(titok, { koino, szemely, horgony }) {
  return createHmac('sha256', Buffer.from(String(titok), 'base64url'))
    .update('koino-meghivo-bizonyitek-1|' + koino + '|' + szemely + '|' + horgony).digest();
}

/**
 * ⭐ D122: a belépő bizonyítéka — a titokkal készült HMAC a koinóra, a személyes kulcsra és a horgonyra kötve (másra nem
 * másolható át). @returns {string} base64url
 */
export function meghivoBizonyitek(titok, kotes) {
  return bizonyitekBajtjai(titok, kotes).toString('base64url');
}

/**
 * ⭐ D122: a bizonyíték ellenőrzése a meghívó készülékén (aki a titkot kiadta) — időben állandó összevetéssel.
 * @returns {boolean}
 */
export function bizonyitekEllenorzese(titok, bizonyitek, kotes) {
  if (typeof bizonyitek !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(bizonyitek)) return false;
  if (!azonositoAlaku(kotes?.koino) || !azonositoAlaku(kotes?.szemely) || !azonositoAlaku(kotes?.horgony)) return false;
  const vart = bizonyitekBajtjai(titok, kotes);
  const kapott = Buffer.from(bizonyitek, 'base64url');
  return kapott.length === vart.length && timingSafeEqual(kapott, vart);
}
