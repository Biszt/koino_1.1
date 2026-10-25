// koino/felulet/js/koinoVerzio.js

// Felelősség: ⭐⭐ A KOINO-VERZIÓ A FELÜLETEN (D119 ①b) — koinós többlet, a prototípusban nincs ilyen (Csaba ötlete, CS3):
//   · A KÁRTYA: a lap a gondolat-kártyával rajzolja (a `kartyaAdat.js` fordít), és itt kap a fejlécébe egy „🧬 koino-verzió”
//     jelet, a törzsébe egy „Kód” fület — a teljes program jegyzéke (útvonal, méret), egy fájlra kattintva a tartalma, és hogy
//     ezen a készüléken ez a program fut-e (a lap kimondja, ha más — nem tiltja);
//   · AZ ŰRLAP: a fő menü „🧬 Új koino-verzió (gyermek)…” ablaka — a név, a leírás, a kezdő pont, a nyíltság, a szabályok (a
//     szülőé az alap) —, és a megerősítés után a gyermek születése (a kód a FUTÓ program: aki új verziót javasol, azt telepíti,
//     és onnan hozza létre).
//
// ⭐ A lap csak rajzol (7. szabály): a kód-csomagot, a születést, a kártyát és a pontot a program végzi (`koino.js`
// `koinoVerzioKeszitese` — ugyanaz, mint a `koinoverzio` parancsé); a lap a kapu útvonalain kérdez (`/api/koinoverzio`,
// `/api/kod`, a fájl tartalma a meglévő `/api/fajl/<lenyomat>` úton). A prototípus kártyája bájtra változatlan: a koinós rész
// a metódusai KÖRÉ kerül, a modul betöltésekor (mint a `koinoFelderites.js`-ben).
//
// Használja: `index.html` (egyszer betölti), `foMenu.js` (az űrlap).

import GondolatKartya from './components/kartya/GondolatKartya.js';
import KartyaFulsav from './components/kartya/KartyaFulsav.js';
import Modal from './components/modals/Modal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rovid = (az) => String(az ?? '').slice(0, 12) + '…';
const kb = (bajt) => (bajt / 1024).toLocaleString('hu-HU', { maximumFractionDigits: 1 }) + ' KB';

// A szabályok felirata (a `koinoSzabalyok.js` kulcsai) — a lap csak megnevezi, a határokat a program szabja.
const SZABALY_NEVEK = {
  tudatpontKeret: 'Tudatpont-keret (fejenként)',
  kategoriaKorlat: 'Kategóriák egy gondolaton (legfeljebb)',
  tanusitasKell: 'Tanúsítás a 2. lépcsőhöz',
  felhatalmazasKell: 'Felhatalmazás (az alapérték)',
  elfogadasiKuszob: 'Elfogadási küszöb (%)',
  reszveteliKuszob: 'Részvételi küszöb (%)',
  minimumDontesiIdo: 'Legrövidebb döntési idő (mp)',
  maximumDontesiIdo: 'Leghosszabb döntési idő (mp)'
};

// ===================================
// A KÁRTYA — a fejléc jele és a „Kód” fül (a gondolat-kártya metódusai KÖRÉ)
// ===================================

const eredetiFejlec = GondolatKartya.prototype._fejlecFeltoltese;
GondolatKartya.prototype._fejlecFeltoltese = function (cimSav, masodikSor, ...tobbi) {
  const ertek = eredetiFejlec.call(this, cimSav, masodikSor, ...tobbi);
  if (this.entitas?.koinoVerzio && masodikSor) {
    const jel = document.createElement('span');
    jel.className = 'koino-verzio-jel';
    jel.textContent = '🧬 koino-verzió';
    jel.title = 'Egy gyermek-koinó születése és a programja — a „Kód” fülön a teljes kód ellenőrizhető (D119).';
    masodikSor.insertBefore(jel, masodikSor.firstChild);
  }
  return ertek;
};

const eredetiTorzs = GondolatKartya.prototype._bodyFeltoltese;
GondolatKartya.prototype._bodyFeltoltese = function (body, ...tobbi) {
  const ertek = eredetiTorzs.call(this, body, ...tobbi);
  const kv = this.entitas?.koinoVerzio;
  if (!kv || !body) return ertek;
  console.log('koinoVerzio - a „Kód” fül', { entitasId: this.entitas?.entitasId });
  // ⭐ A meglévő fülek (a leírás, a másik ágak) megmaradnak — a fülsáv újraépül a „Kód” füllel (a gondolat-elemek a kártyáéi,
  // a fülsáv csak mutat/rejt — lásd `KartyaFulsav`).
  let fulek = [];
  let kontener = null;
  if (this.kartyaFulsav) {
    fulek = [...this.kartyaFulsav.fulek];
    kontener = this.kartyaFulsav.kontener;
    this.kartyaFulsav.destroy();
  }
  if (!kontener) {
    kontener = document.createElement('div');
    body.appendChild(kontener);
  }
  // A kártya szövege itt a koino-verzió LEÍRÁSA (a gondolat-kártya „Gondolat”-nak hívná).
  fulek = fulek.map((f) => (f.id === 'gondolat' ? { ...f, felirat: 'Leírás' } : f));
  if (!fulek.length) {
    const ures = document.createElement('p');
    ures.className = 'koino-kod__leiras';
    ures.textContent = 'Ehhez a koino-verzióhoz nem írtak leírást.';
    fulek.push({ id: 'gondolat', felirat: 'Leírás', tartalomElem: ures });
  }
  const kod = document.createElement('div');
  kod.className = 'koino-kod';
  kod.innerHTML = '<p class="koino-kod__leiras">A kód a „Kód” fülre kattintva töltődik be.</p>';
  fulek.push({ id: 'kod', felirat: '🧬 Kód', tartalomElem: kod });
  let betoltve = false;
  this.kartyaFulsav = new KartyaFulsav(kontener, {
    fulek,
    onFulValtas: (id) => {
      if (id === 'kod' && !betoltve) { betoltve = true; kodFulBetoltese(kod, this.entitas.entitasId); }
      this._kibovitesUjraertekeles?.();
    }
  });
  return ertek;
};

/** A „Kód” fül tartalma: a jegyzék, az állás (megvan / egyezik), egy fájlra kattintva a tartalma. */
async function kodFulBetoltese(elem, kartya) {
  console.log('kodFulBetoltese - KEZDÉS', { kartya });
  elem.innerHTML = '<p class="koino-kod__leiras">A kód jegyzékét kérem a programtól…</p>';
  let a;
  try {
    a = await apiGet('kod?kartya=' + encodeURIComponent(kartya));
  } catch (hiba) {
    elem.innerHTML = '<p class="koino-megjegyzes">A kód most nem kérdezhető le: ' + html(hiba.message) + '</p>';
    return;
  }
  const fajlok = a.jegyzek ?? [];
  const osszes = fajlok.reduce((s, f) => s + f[2], 0);
  let fej = '<p class="koino-kod__allas">A kód neve: <code title="' + html(a.kod?.lenyomat) + '">' + html(rovid(a.kod?.lenyomat))
    + '</code>';
  if (a.jegyzek) fej += ' · ' + fajlok.length + ' fájl, ' + kb(osszes) + ' · ezen a készüléken megvan: ' + a.megvan + '/' + fajlok.length;
  fej += '</p>' + (a.egyezik
    ? '<p class="koino-kod__egyezik">✓ Ezen a készüléken is ez a program fut.</p>'
    : '<p class="koino-kod__mas">⚠ Ezen a készüléken MÁS program fut (a tiéd: <code title="' + html(a.sajat?.lenyomat) + '">'
      + html(rovid(a.sajat?.lenyomat)) + '</code>) — ennek a gyermeknek a kódja a lenti. Nem tiltjuk: ha a két verzió szabálya '
      + 'eltér, a számítás is eltérhet.</p>');
  if (!a.jegyzek) {
    elem.innerHTML = fej + '<p class="koino-megjegyzes">A kód jegyzéke még nem jött meg erre a készülékre. A kód a kártya '
      + 'vállalóitól jön (D84/1): ha pontot teszel a kártyára, a csere elhozza.</p>';
    return;
  }
  elem.innerHTML = fej + '<ul class="koino-kod__lista">' + fajlok.map((f) => '<li><button type="button" class="koino-kod__fajl"'
    + ' data-lenyomat="' + html(f[1]) + '" data-ut="' + html(f[0]) + '">' + html(f[0]) + '</button> <span class="koino-kod__meret">'
    + kb(f[2]) + '</span></li>').join('') + '</ul><div class="koino-kod__tartalom" hidden></div>';
  const tartalom = elem.querySelector('.koino-kod__tartalom');
  elem.querySelector('.koino-kod__lista').addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-lenyomat]');
    if (!gomb) return;
    e.stopPropagation();   // a kártya a koppintást is figyeli (kiválasztás)
    tartalom.hidden = false;
    tartalom.innerHTML = '<p class="koino-kod__leiras">' + html(gomb.dataset.ut) + ' — betöltés…</p>';
    try {
      const valasz = await fetch('/api/fajl/' + encodeURIComponent(gomb.dataset.lenyomat));
      if (!valasz.ok) throw new Error('ez a fájl még nincs meg ezen a készüléken');
      const szoveg = await valasz.text();
      tartalom.innerHTML = '<p class="koino-kod__ut">' + html(gomb.dataset.ut) + '</p><pre class="koino-kod__szoveg"></pre>';
      tartalom.querySelector('pre').textContent = szoveg;
    } catch (hiba) {
      tartalom.innerHTML = '<p class="koino-megjegyzes">' + html(gomb.dataset.ut) + ': ' + html(hiba.message) + '</p>';
    }
  });
  console.log('kodFulBetoltese - VÉGE', { fajlok: fajlok.length, megvan: a.megvan, egyezik: a.egyezik });
}

// ===================================
// AZ ŰRLAP — „🧬 Új koino-verzió (gyermek)…”
// ===================================

/**
 * Az új koino-verzió ablaka.
 * @param {{terMegnyitasa?: Function|null}} [b] - a sikeres létrehozás után a tér nyitható (ott a családfa)
 */
export async function koinoVerzioMegnyitasa({ terMegnyitasa = null } = {}) {
  console.log('koinoVerzioMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-verzio-urlap';
  const modal = new Modal(MODAL_KONTENER, {
    cim: '🧬 Új koino-verzió (gyermek-koinó)',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => modal.bezaras() }]
  });

  let elo = null;
  let megerosites = false;
  let folyamatban = false;
  let siker = null;
  const ertekek = { nev: '', leiras: '', pont: null, nyilt: false, szabalyok: {} };

  // A szabályok mai értékei (a szülőé), laposan: a küszöbök is egy szinten.
  const szuloSzabalyai = () => {
    const { alapKuszobok = {}, ...tobbi } = elo?.szabalyok ?? {};
    return { ...tobbi, ...alapKuszobok };
  };
  const kuszobE = (k) => k in (elo?.szabalyok?.alapKuszobok ?? {});

  const rajzol = () => {
    if (siker) {
      tartalom.innerHTML = '<p class="koino-verzio-urlap__siker">✅ Megszületett: <strong>' + html(siker.nev) + '</strong> ('
        + html(rovid(siker.gyermek)) + ').</p><p class="koino-verzio-urlap__leiras">A kártyája a pakliban van (' + siker.pont
        + ' tudatpontod rajta); a kódja ' + siker.fajlok + ' fájl, ' + kb(siker.bajt) + '. A születéseddel beköltöztél (a hozott '
        + 'pontjaid: ' + siker.hozottOsszeg + '). A többi készülék a szülő cseréjével kapja a kártyát — onnan költözhetnek '
        + '(„🧳 Költözés…”).</p>'
        + (terMegnyitasa ? '<div class="koino-verzio-urlap__gombok"><button type="button" class="koino-verzio-urlap__gomb '
          + 'koino-verzio-urlap__gomb--fo" data-muvelet="ter">A tér megnyitása</button></div>' : '');
      return;
    }
    if (!elo) return;
    if (!elo.lehet) {
      tartalom.innerHTML = '<p class="koino-megjegyzes">Most nem hozhatsz létre koino-verziót: ' + html(elo.ok ?? '?') + '</p>';
      return;
    }
    const sz = szuloSzabalyai();
    const ki = (x) => (folyamatban || megerosites ? ' disabled' : '') + x;
    tartalom.innerHTML = '<p class="koino-verzio-urlap__leiras">A koino-verzió egy gyermek-koinó: a „' + html(elo.nev ?? '?')
      + '” koinóra épül (a múlt közös, a súlyt a költöző hozza — D118), a saját szabályaival, és a kódja a te FUTÓ programod — a '
      + 'kártyája „Kód” fülén bárki ellenőrizheti (D119).</p>'
      + '<label class="koino-verzio-urlap__mezo">A gyermek neve <input type="text" data-mezo="nev" maxlength="200" value="'
      + html(ertekek.nev) + '"' + ki('') + '></label>'
      + '<label class="koino-verzio-urlap__mezo">Leírás (miért kell ez a verzió?) <textarea data-mezo="leiras" rows="3"'
      + ki('') + '>' + html(ertekek.leiras) + '</textarea></label>'
      + '<label class="koino-verzio-urlap__mezo">Tudatpont a kártyára (szabad: ' + elo.szabadPont + ') <input type="number"'
      + ' data-mezo="pont" min="1" max="' + elo.szabadPont + '" value="' + (ertekek.pont ?? Math.min(elo.kezdoPont, elo.szabadPont))
      + '"' + ki('') + '></label>'
      + '<label class="koino-verzio-urlap__jelolo"><input type="checkbox" data-mezo="nyilt"' + (ertekek.nyilt ? ' checked' : '')
      + (elo.zart ? ' disabled' : ki('')) + '> nyílt (bárki olvashatja, aki eljut egy tagjához)' + (elo.zart
        ? ' — <em>zárt szülőnek csak zárt gyermeke lehet (D118/5)</em>' : '') + '</label>'
      + '<fieldset class="koino-verzio-urlap__szabalyok"><legend>A szabályai (a szülőé az alap — amit átírsz, az lesz más)</legend>'
      + Object.keys(SZABALY_NEVEK).filter((k) => k in sz).map((k) => '<label class="koino-verzio-urlap__szabaly">'
        + html(SZABALY_NEVEK[k]) + ' <input type="number" data-szabaly="' + k + '" value="' + (ertekek.szabalyok[k] ?? sz[k]) + '"'
        + ki('') + '></label>').join('') + '</fieldset>'
      + '<p class="koino-verzio-urlap__program">A kód: a futó programod — ' + elo.program.fajlok + ' fájl, ' + kb(elo.program.osszBajt)
      + ' (<code title="' + html(elo.program.lenyomat) + '">' + html(rovid(elo.program.lenyomat)) + '</code>).</p>'
      + (megerosites
        ? '<p class="koino-verzio-urlap__figyelem">Biztos? A gyermek születése és a kártya aláírt esemény — nem vonható vissza. A '
          + 'születéseddel beköltözöl a gyermekbe (a pontjaid a gyermek keretébe jönnek; a koino-verzió kártyákra tett pontjaid a '
          + 'szülőben maradnak).</p><div class="koino-verzio-urlap__gombok"><button type="button" class="koino-verzio-urlap__gomb"'
          + ' data-muvelet="megse"' + (folyamatban ? ' disabled' : '') + '>Mégse</button><button type="button" class="'
          + 'koino-verzio-urlap__gomb koino-verzio-urlap__gomb--fo" data-muvelet="letrehozom"' + (folyamatban ? ' disabled' : '')
          + '>' + (folyamatban ? 'Létrehozom…' : 'Igen, létrehozom') + '</button></div>'
        : '<div class="koino-verzio-urlap__gombok"><button type="button" class="koino-verzio-urlap__gomb '
          + 'koino-verzio-urlap__gomb--fo" data-muvelet="megerosites"' + (ertekek.nev.trim() ? '' : ' disabled')
          + '>Létrehozom…</button></div>');
  };

  // ----- A MEZŐK -----
  tartalom.addEventListener('input', (e) => {
    const m = e.target.dataset?.mezo;
    const sz = e.target.dataset?.szabaly;
    if (m === 'nev') {
      ertekek.nev = e.target.value;
      const gomb = tartalom.querySelector('button[data-muvelet="megerosites"]');
      if (gomb) gomb.disabled = !ertekek.nev.trim();
    } else if (m === 'leiras') ertekek.leiras = e.target.value;
    else if (m === 'pont') ertekek.pont = Number.parseInt(e.target.value, 10);
    else if (sz) ertekek.szabalyok[sz] = Number.parseInt(e.target.value, 10);
  });
  tartalom.addEventListener('change', (e) => {
    if (e.target.dataset?.mezo === 'nyilt') ertekek.nyilt = e.target.checked;
  });

  // ----- A GOMBOK -----
  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (!gomb || gomb.disabled) return;
    const muvelet = gomb.dataset.muvelet;
    if (muvelet === 'ter') { modal.bezaras(); await terMegnyitasa?.(); return; }
    if (muvelet === 'megerosites') { megerosites = true; rajzol(); return; }
    if (muvelet === 'megse') { megerosites = false; rajzol(); return; }
    if (muvelet !== 'letrehozom') return;
    // ⭐ Csak a MEGVÁLTOZTATOTT szabály megy: a többit a gyermek a szülőtől örökli (a program dönt — `koinoSzabalyok.js`).
    const szulo = szuloSzabalyai();
    const szabalyok = {};
    for (const [k, v] of Object.entries(ertekek.szabalyok)) {
      if (!Number.isInteger(v) || v === szulo[k]) continue;
      if (kuszobE(k)) (szabalyok.alapKuszobok ??= {})[k] = v;
      else szabalyok[k] = v;
    }
    folyamatban = true;
    rajzol();
    try {
      siker = await apiPost('koinoverzio', { nev: ertekek.nev.trim(), leiras: ertekek.leiras.trim() || null,
        pont: Number.isInteger(ertekek.pont) ? ertekek.pont : Math.min(elo.kezdoPont, elo.szabadPont), nyilt: ertekek.nyilt,
        szabalyok });
    } catch (hiba) {
      modal.hibaBeallitasa(hiba.message ?? 'A koino-verzió nem jött létre.');
      folyamatban = false;
      megerosites = false;
      rajzol();
      return;
    }
    folyamatban = false;
    rajzol();
    // ⭐ Az új kártya a pakliban: a lap a kiválasztás helyén, csendben frissül (mint egy csere után).
    window.aktivPakli?.kulsoValtozas?.();
  });

  await modal.init();
  modal.megnyitas();
  try {
    elo = await apiGet('koinoverzio');
    rajzol();
  } catch (hiba) {
    tartalom.innerHTML = '<p class="koino-megjegyzes">Az űrlap kiindulása most nem kérdezhető le: ' + html(hiba.message) + '</p>';
  }
  console.log('koinoVerzioMegnyitasa - VÉGE', { lehet: elo?.lehet ?? null });
  return modal;
}
