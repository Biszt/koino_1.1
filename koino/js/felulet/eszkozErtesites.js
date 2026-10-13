// koino/js/felulet/eszkozErtesites.js

// Felelősség: ⭐ D103 — a KÉSZÜLÉK SAJÁT ÉRTESÍTÉSE: egy felugró értesítés az operációs rendszer felé, npm-csomag nélkül.
//
// A prototípus a postafiók tételeit kérésre levélben is kézbesítette — egy szerver küldte. P2P-n nincs szerver (2. szabály:
// semmi ne múljon egyetlen szolgáltatáson), ezért a levél helyett a készülék szól, a platform SAJÁT eszközével:
//   · Windows: a PowerShell felugró értesítése (WinRT toast — a PowerShell alkalmazás-azonosítójával);
//   · Mac: `osascript` (`display notification`);
//   · telefon (Termux): `termux-notification` (a Termux:API alkalmazás kell hozzá);
//   · Linux: `notify-send`.
// ⭐ CSERÉLHETŐ (2. szabály): a `KOINO_ERTESITO` környezeti változó egy parancsot vagy szkriptet ad meg, ami a címet és a
// szöveget két érvként kapja — így bármi lehet a kézbesítő (egy saját szkript, egy másik eszköz), és a próbák is ezzel mérik.
// ⛔ A szöveg SOHA nem héjon át megy: érvként (`spawn` tömbbel), Windowson környezeti változóban — egy gondolat címe nem
// lehet parancs. Ha az eszköz nincs meg vagy elbukik, a hiba visszajön (a program kimondja — D19); a postafiók attól él.
//
// Hálózatot nem importál. Használja: `koino.js` (a postafiók frissítése után).

import { spawn } from 'node:child_process';

/** Egy értesítés legfeljebb ennyi ideig futhat (utána leállítjuk — a kézbesítés nem akaszthatja meg a kört). */
const IDOKORLAT = 10 * 1000;
/** A cím és a szöveg felső határa (egy felugró értesítésbe ennél több úgysem fér). */
const CIM_KORLAT = 80;
const SZOVEG_KORLAT = 240;

// ⭐ A Windows felugró értesítése: a szöveg a környezetből jön ($env:…), a szkript maga állandó.
const WINDOWS_SZKRIPT = [
  "$ErrorActionPreference = 'Stop'",
  '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
  '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
  '$x = New-Object Windows.Data.Xml.Dom.XmlDocument',
  "$x.LoadXml('<toast><visual><binding template=\"ToastGeneric\"><text></text><text></text></binding></visual></toast>')",
  "$t = $x.GetElementsByTagName('text')",
  '$t.Item(0).AppendChild($x.CreateTextNode($env:KOINO_ERTESITES_CIM)) | Out-Null',
  '$t.Item(1).AppendChild($x.CreateTextNode($env:KOINO_ERTESITES_SZOVEG)) | Out-Null',
  "$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe'",
  '[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($x))'
].join('; ');

const vagas = (x, n) => {
  const s = String(x ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

/**
 * ⭐ A platform értesítő parancsa — tiszta számítás (a próbák is ezt nézik): `{ nev, parancs, ervek, kornyezet }`, vagy null,
 * ha a platformon nincs ismert eszköz.
 * @param {string} cim
 * @param {string} szoveg
 * @param {Object} [b] - { platform, env, node } (a próbákhoz)
 */
export function ertesitoParancsa(cim, szoveg, { platform = process.platform, env = process.env, node = process.execPath } = {}) {
  const c = vagas(cim, CIM_KORLAT);
  const sz = vagas(szoveg, SZOVEG_KORLAT);
  const sajat = typeof env.KOINO_ERTESITO === 'string' && env.KOINO_ERTESITO.trim() ? env.KOINO_ERTESITO.trim() : null;
  if (sajat) {
    // egy .js / .mjs szkriptet a node futtat (a koino ugyanazzal a node-dal fut — nem kell más)
    return /\.(m?js|cjs)$/i.test(sajat)
      ? { nev: 'saját', parancs: node, ervek: [sajat, c, sz], kornyezet: {} }
      : { nev: 'saját', parancs: sajat, ervek: [c, sz], kornyezet: {} };
  }
  if (platform === 'win32') {
    return { nev: 'Windows', parancs: 'powershell.exe',
      ervek: ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', WINDOWS_SZKRIPT],
      kornyezet: { KOINO_ERTESITES_CIM: c, KOINO_ERTESITES_SZOVEG: sz } };
  }
  if (platform === 'darwin') {
    return { nev: 'Mac', parancs: 'osascript',
      ervek: ['-e', 'on run argv', '-e', 'display notification (item 2 of argv) with title (item 1 of argv)', '-e', 'end run', c, sz],
      kornyezet: {} };
  }
  if (platform === 'android' || String(env.PREFIX ?? '').includes('com.termux')) {
    return { nev: 'Termux', parancs: 'termux-notification', ervek: ['--title', c, '--content', sz], kornyezet: {} };
  }
  if (platform === 'linux' || platform === 'freebsd' || platform === 'openbsd') {
    return { nev: 'Linux', parancs: 'notify-send', ervek: [c, sz], kornyezet: {} };
  }
  return null;
}

/** Egy parancs futtatása időkorláttal — a kilépési kód alapján. */
function futtat({ parancs, ervek, kornyezet }) {
  return new Promise((teljesul) => {
    let kesz = false;
    const vege = (hiba) => { if (!kesz) { kesz = true; teljesul(hiba); } };
    let gyerek;
    try {
      gyerek = spawn(parancs, ervek, { env: { ...process.env, ...kornyezet }, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    } catch (hiba) {
      vege(hiba.message);
      return;
    }
    let hibaSzoveg = '';
    gyerek.stderr?.on('data', (d) => { if (hibaSzoveg.length < 300) hibaSzoveg += d; });
    const ora = setTimeout(() => { gyerek.kill(); vege('időtúllépés'); }, IDOKORLAT);
    gyerek.on('error', (hiba) => { clearTimeout(ora); vege(hiba.code === 'ENOENT' ? 'nincs ilyen eszköz: ' + parancs : hiba.message); });
    gyerek.on('close', (kod) => { clearTimeout(ora); vege(kod === 0 ? null : (hibaSzoveg.trim().slice(0, 200) || 'kilépési kód ' + kod)); });
  });
}

/**
 * ⭐ Az értesítések kiküldése sorban (egyenként, időkorláttal). A hiba nem dob: visszajön (a hívó feljegyzi és kimondja).
 * @param {Array<{cim: string, szoveg: string}>} uzenetek
 * @param {Object} [b] - { platform, env } (a próbákhoz)
 * @returns {Promise<{kuldve: number, hiba: string|null, eszkoz: string|null}>}
 */
export async function keszulekErtesitese(uzenetek, b = {}) {
  let kuldve = 0;
  let utolsoHiba = null;
  let eszkoz = null;
  for (const u of uzenetek ?? []) {
    const p = ertesitoParancsa(u.cim, u.szoveg, b);
    if (!p) return { kuldve, hiba: 'ezen a platformon nincs ismert értesítő (' + (b.platform ?? process.platform) + ')', eszkoz: null };
    eszkoz = p.nev;
    const hiba = await futtat(p);
    if (hiba) utolsoHiba = hiba;
    else kuldve++;
  }
  return { kuldve, hiba: utolsoHiba, eszkoz };
}
