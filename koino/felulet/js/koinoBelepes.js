// koino/felulet/js/koinoBelepes.js

// Felelősség: ⭐⭐ M7 — A BELÉPŐ SÁVJA (a belépő megtalálása, Csaba, 2026-11-04: *„a meghívott felületén értesítse a
// meghívottat, hogy a készüléke, éppen próbálja fel venni az első kapcsolatot, és jelezhetné a probálkozásokat is.”*).
//
// A 2026-11-04-i terepen a mobilneten lévő belépő fél órán át csak annyit látott, hogy „a tartóit még keresem” — nem tudhatta,
// történik-e valami. Ez a sáv a lap tetején, amíg nem tag, kimondja, hol tart az első kapcsolat:
//   1. ✔ a meghívót elfogadta,
//   2. 📡 bejelentkezett a hálózaton (mikor, hány gép tárolta, mikor legközelebb),
//   3. 🚪 kopog a meghívó készülékére (hány próbálkozás, mikor az utolsó),
//   4. 🤝 megvan a kapcsolat (a meghívó készüléke most fogad be),
//   5. ✅ bent van (néhány percig látszik, aztán eltűnik).
// Fél óra kapcsolat nélkül egy segítő mondat (mi kell hozzá), és ha az őrjárat nem fut, azt is kimondja (enélkül nincs keresés).
//
// ⭐ A lap csak rajzol (7. szabály): a lépéseket a program jegyzi (`csereAllapot.js` — a csere-állapot `belepes` része; az őrjárat,
// a munka, a meghívó elfogadása), és a szöveg a laptól függetlenül igaz. Az adat az alsó sáv kérdéséből jön (`alsoSav.js` — 10
// mp-enként, a `koino:csereAllapot` jelzéssel), külön kérdés nincs.
//
// Használja: `index.html`.

/** ⭐ Ha a kapcsolat után ennyi idővel sincs tagság, a sáv megmondja, mit nézzen meg a meghívó. */
const KAPCSOLAT_UTAN_SEGITSEG = 10 * 60 * 1000;

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Óra:perc a lap órája szerint (ugyanaz a gép, mint a programé). */
function ora(ms) {
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

/**
 * A meghívó lejárata: „december 4.” (ha nem az idei évben, az évvel). Toldalék elé a záró pont nélkül: „december 4-ig”.
 * @param {number} ms
 * @param {boolean} [toldalek]
 */
function nap(ms, toldalek = false) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  const opciok = d.getFullYear() === new Date().getFullYear() ? { month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric' };
  const szoveg = d.toLocaleDateString('hu-HU', opciok);
  return toldalek ? szoveg.replace(/\.$/, '') : szoveg;
}

/**
 * ⭐ A sáv szövege a belépés képéből (`csereAllapot.js` `belepesKepe`) — tiszta függvény (a próba is hívhatja).
 * @param {Object|null} b - a kép (`adatok.belepes`)
 * @param {{orjaratFut?: boolean, most?: number}} [k] - `most`: a lap órája (a program ugyanezen a gépen fut)
 * @returns {string|null} a sáv HTML-je, vagy null (nincs mit mutatni)
 */
export function belepesSavHtml(b, { orjaratFut = true, most = Date.now() } = {}) {
  if (!b) return null;
  if (b.allapot === 'tag') {
    return '<p class="koino-belepes__cim">✅ Bent vagy a koinóban (' + html(ora(b.tag)) + ') — jönnek a gondolatok.</p>'
      + '<button type="button" class="koino-belepes__bezar" aria-label="Bezárás" title="Bezárás">×</button>';
  }
  if (b.allapot === 'lejart') {
    return '<p class="koino-belepes__cim">⌛ A meghívód lejárt (' + html(nap(b.lejar)) + '), mielőtt a meghívód készüléke befogadott'
      + ' volna — kérj tőle újat.</p>';
  }
  const sorok = [];
  sorok.push('<li class="koino-belepes__kesz">✔ A meghívót elfogadtad (' + html(ora(b.elfogadva)) + ').</li>');
  const j = b.jelentkezes;
  if (j) {
    sorok.push('<li' + (b.kapcsolat ? ' class="koino-belepes__kesz"' : '') + '>📡 '
      + (j.gepek > 0
        ? 'Bejelentkeztem a hálózaton, hogy a meghívód készüléke rám találjon — utoljára ' + html(ora(j.ido)) + '-kor ('
          + j.gepek + ' gép tárolta)'
        : 'A hálózaton most nem sikerült bejelentkeznem (' + html(ora(j.ido)) + ' — egyetlen gép sem tárolta)')
      + (!b.kapcsolat && j.kovetkezo ? ', legközelebb ' + html(ora(j.kovetkezo)) + ' körül' : '') + '.</li>');
  } else if (!b.kapcsolat) {
    sorok.push('<li class="koino-belepes__var">📡 A hálózaton még nem jelentkeztem (az őrjárat első köre után).</li>');
  }
  const k = b.kopogas ?? { szam: 0, utolso: null };
  if (k.szam > 0) {
    sorok.push('<li' + (b.kapcsolat ? ' class="koino-belepes__kesz"' : '') + '>🚪 '
      + (b.kapcsolat
        ? 'Kopogtam a meghívód készülékére: ' + k.szam + ' próbálkozás.'
        : (orjaratFut ? 'Kopogok' : 'Kopogtam') + ' a meghívód készülékére: ' + k.szam + ' próbálkozás, az utolsó '
          + html(ora(k.utolso)) + '-kor — ' + (orjaratFut ? 'még ' : '') + 'nem válaszolt.')
      + '</li>');
  } else if (!b.kapcsolat) {
    sorok.push('<li class="koino-belepes__var">🚪 Még nem kopogtam a meghívód készülékére.</li>');
  }
  if (b.kapcsolat) {
    sorok.push('<li>🤝 Megvan a kapcsolat (' + html(ora(b.kapcsolat)) + ') — a meghívód készüléke most fogad be…</li>');
  }
  const cim = b.kapcsolat ? '⏳ Mindjárt bent vagy.'
    : orjaratFut ? '🔎 Keresem a meghívód készülékét — az első kapcsolatot.'
    : '⏸ A meghívód készülékét még nem keresem.';
  let tobb = '';
  if (!orjaratFut) {
    tobb += '<p class="koino-belepes__figyelem">⏸ Most nem keresem: a készülékeden nem fut a koinó őrjárata (az alsó sáv mutatja,'
      + ' hogyan indíthatod el).</p>';
  }
  if (b.segitseg) {
    tobb += '<p class="koino-belepes__segitseg">💡 Akkor tud rád találni, ha a meghívód készülékén is fut a koinó. Ha ugyanazon a'
      + ' wifin vagytok, azonnal megy; két hálózat között néhány percbe telhet.'
      + (b.lejar ? ' A meghívód ' + html(nap(b.lejar, true)) + '-ig érvényes.' : '') + '</p>';
  }
  if (b.kapcsolat && most - b.kapcsolat >= KAPCSOLAT_UTAN_SEGITSEG) {
    tobb += '<p class="koino-belepes__segitseg">💡 Ha sokáig itt áll: a meghívód nézze meg a „Meghívóim” ablakát — lehet, hogy a'
      + ' meghívót visszavonta, vagy valaki más már felhasználta.</p>';
  }
  return '<p class="koino-belepes__cim">' + cim + '</p><ul class="koino-belepes__lepesek">' + sorok.join('') + '</ul>' + tobb;
}

/**
 * ⭐ A sáv a lapon: a `koino:csereAllapot` jelzésre (az alsó sáv kérdése) újrarajzol. A „bent vagy” bezárható (a következő
 * belépésig — egy másik meghívó új elfogadási idővel jön).
 * @param {HTMLElement} elem
 */
export function belepesSavInditasa(elem) {
  console.log('belepesSavInditasa - KEZDÉS');
  if (!elem) return;
  let bezarva = null;   // a bezárt „bent vagy” tagság-ideje
  const rajzol = (a) => {
    const b = a?.belepes ?? null;
    const kod = b && !(b.allapot === 'tag' && bezarva === b.tag)
      ? belepesSavHtml(b, { orjaratFut: a?.orjarat?.fut !== false, most: Number.isFinite(a?.most) ? a.most : Date.now() }) : null;
    if (!kod) {
      elem.hidden = true;
      elem.innerHTML = '';
      return;
    }
    elem.hidden = false;
    elem.dataset.allapot = b.allapot;
    if (elem.innerHTML !== kod) elem.innerHTML = kod;
    elem.querySelector('.koino-belepes__bezar')?.addEventListener('click', () => {
      bezarva = b.tag;
      elem.hidden = true;
    }, { once: true });
  };
  document.addEventListener('koino:csereAllapot', (e) => rajzol(e.detail));
  console.log('belepesSavInditasa - VÉGE');
}
