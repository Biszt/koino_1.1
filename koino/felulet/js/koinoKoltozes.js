// koino/felulet/js/koinoKoltozes.js

// Felelősség: ⭐⭐ A KÖLTÖZÉS A FELÜLETEN (D118 ⑥) — koinós többlet, a prototípusban nincs ilyen: a fő menü „🧳 Költözés…”
// pontja ezt az ablakot nyitja. A mostani koinó ismert gyermekei (ezen a készüléken), mindegyiknél: költözhetek-e (ha nem,
// miért — a program mondja ki), a gyermek kerete, a hozott pontjaim; ha nem férnek a kerethez (KZ3), az elhagyandók
// kiválasztása; és a megerősítés után a költözés (a kiköltözés itt, a beköltözés a gyermekben).
//
// ⭐ A lap csak rajzol (7. szabály): az előkészítést és a költözést a program végzi (`koino.js` `koltozesElonezete`,
// `koltozesVegrehajtasa` — ugyanaz, mint a `koltozes` parancsé), a lap a kapu útvonalán kérdez (`GET` / `POST /api/koltozes`).
// ⚠️ A hatókör kimondva: csak a készüléken ismert gyermekek látszanak (a gyermek születését a csere vagy egy fájl hozza).
//
// Használja: `foMenu.js`.

import Modal from './components/modals/Modal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rovid = (az) => String(az ?? '').slice(0, 8) + '…';

/**
 * A költözés ablaka.
 * @param {{terMegnyitasa?: Function|null}} [b] - a sikeres költözés után a tér nyitható (ott a családfa)
 */
export async function koltozesMegnyitasa({ terMegnyitasa = null } = {}) {
  console.log('koltozesMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-koltozes';
  const modal = new Modal(MODAL_KONTENER, {
    cim: '🧳 Költözés egy gyermek-koinóba',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => modal.bezaras() }]
  });

  let elonezet = null;
  let megerosites = null;          // a gyermek, akinél a megerősítés látszik
  let folyamatban = false;
  let siker = null;                // a sikeres költözés válasza
  const elhagyott = new Map();     // gyermek → Set(entitás) — amit a gyermekbe NEM hozok (KZ3)

  const elhagyottja = (g) => elhagyott.get(g.azonosito) ?? new Set();
  const osszeg = (g) => g.pontok.filter((p) => !elhagyottja(g).has(p.azonosito)).reduce((s, p) => s + p.pont, 0);

  // ----- EGY GYERMEK SORA -----
  const gyermekSora = (g) => {
    const nev = g.nev ? html(g.nev) : '<em>nem ismert a neve</em>';
    let resz = '<div class="koino-koltozes-sor' + (g.lehet ? '' : ' koino-koltozes-sor--nem') + '" data-gyermek="'
      + html(g.azonosito) + '">'
      + '<div class="koino-koltozes-sor__cim">' + nev + ' <span class="koino-koltozes-sor__az">' + html(rovid(g.azonosito)) + '</span></div>';
    if (!g.lehet) {
      // ⚠️ Az ok a programé (az előkészítés kimondott oka) — a lap nem talál ki semmit.
      return resz + '<div class="koino-koltozes-sor__allas">Nem költözhetsz ide: ' + html(g.ok ?? '?') + '</div></div>';
    }
    const ossz = osszeg(g);
    const nemFer = ossz > g.keret;
    resz += '<div class="koino-koltozes-sor__allas">A kerete: <strong>' + g.keret + '</strong> tudatpont · a hozott pontjaid: <strong>'
      + ossz + '</strong>' + (nemFer ? ' — <span class="koino-koltozes-sor__hiba">nem fér: hagyj el legalább ' + (ossz - g.keret)
      + ' pontnyit</span>' : '') + ' · a lánc-pontod: a ' + g.lancPont + '. eseményed (a gyermek születése előtti utolsó)</div>';
    if (g.pontok.length) {
      resz += '<ul class="koino-koltozes-sor__pontok">' + g.pontok.map((p) => '<li><label>'
        + '<input type="checkbox" data-gyermek="' + html(g.azonosito) + '" data-az="' + html(p.azonosito) + '"'
        + (elhagyottja(g).has(p.azonosito) ? ' checked' : '') + (folyamatban ? ' disabled' : '') + '> elhagyom · '
        + (p.cim ? html(p.cim) : '<em>' + html(rovid(p.azonosito)) + '</em>') + ' — ' + p.pont + ' pont</label></li>').join('')
        + '</ul>';
    } else {
      resz += '<p class="koino-megjegyzes">A gyermek születése előtt nem volt pontod — súlyt nem hozol, a tagságodat igen.</p>';
    }
    if (megerosites === g.azonosito) {
      resz += '<p class="koino-koltozes-sor__figyelem">Biztos? A kiköltözés itt és a beköltözés a gyermekben aláírt esemény — '
        + 'nem vonható vissza. A gyermekbe a születése előtti pontjaid jönnek (az elhagyottak nélkül) és a vágáskori tagságod; '
        + 'a születése utáni tevékenységed itt marad. Ebben a koinóban a pontjaid megmaradnak — a két koinóban külön kereted van.</p>'
        + '<div class="koino-koltozes-sor__gombok">'
        + '<button type="button" class="koino-koltozes-sor__gomb" data-muvelet="megse"' + (folyamatban ? ' disabled' : '') + '>Mégse</button>'
        + '<button type="button" class="koino-koltozes-sor__gomb koino-koltozes-sor__gomb--fo" data-muvelet="koltozom"'
        + (folyamatban || nemFer ? ' disabled' : '') + '>' + (folyamatban ? 'Költözöm…' : 'Igen, költözöm') + '</button></div>';
    } else {
      resz += '<div class="koino-koltozes-sor__gombok"><button type="button" class="koino-koltozes-sor__gomb koino-koltozes-sor__gomb--fo"'
        + ' data-muvelet="megerosites"' + (nemFer || folyamatban ? ' disabled' : '') + '>Költözöm ide…</button></div>';
    }
    return resz + '</div>';
  };

  // ----- AZ ABLAK TARTALMA -----
  const rajzol = () => {
    if (siker) {
      tartalom.innerHTML = '<p class="koino-koltozes__siker">✅ Beköltöztél: <strong>' + html(siker.nev ?? rovid(siker.gyermek))
        + '</strong>.</p><p class="koino-koltozes__leiras">A lánc-pontod: a ' + siker.lancPont + '. eseményed · a hozott pontjaid: '
        + siker.hozottOsszeg + ' (' + siker.hozott + ' entitáson' + (siker.elhagyva ? ', elhagyva ' + siker.elhagyva : '')
        + ') · a gyermekbe vitt múlt: ' + siker.vitt + ' új esemény. A többi készülék a következő cserén tudja meg.</p>'
        + (terMegnyitasa ? '<div class="koino-koltozes-sor__gombok"><button type="button" class="koino-koltozes-sor__gomb '
          + 'koino-koltozes-sor__gomb--fo" data-muvelet="ter">A tér megnyitása</button></div>' : '');
      return;
    }
    const gyermekek = elonezet?.gyermekek ?? [];
    tartalom.innerHTML = '<p class="koino-koltozes__leiras">A költözés ebből a koinóból egy gyermekébe visz: a gyermek a '
      + 'szülőre épül (a múlt közös), a súlyt a költöző hozza (D118). Csak a készüléken ismert gyermekek látszanak.</p>'
      + (elonezet?.megjegyzes ? '<p class="koino-megjegyzes">' + html(elonezet.megjegyzes) + '</p>' : '')
      + (gyermekek.length ? gyermekek.map(gyermekSora).join('')
        : '<p class="koino-megjegyzes">Ennek a koinónak nincs ismert gyermeke ezen a készüléken. Gyermeket a '
          + '<code>koino "&lt;név&gt;" szulo=…</code> paranccsal lehet létrehozni, vagy a csere (egy fájl) hozza el a születését.</p>');
  };

  const betolt = async () => {
    elonezet = await apiGet('koltozes');
    rajzol();
  };

  // ----- AZ ELHAGYÁS (KZ3) -----
  tartalom.addEventListener('change', (e) => {
    const jelolo = e.target.closest('input[type="checkbox"][data-az]');
    if (!jelolo) return;
    const g = jelolo.dataset.gyermek;
    if (!elhagyott.has(g)) elhagyott.set(g, new Set());
    if (jelolo.checked) elhagyott.get(g).add(jelolo.dataset.az);
    else elhagyott.get(g).delete(jelolo.dataset.az);
    rajzol();
  });

  // ----- A GOMBOK -----
  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (!gomb || gomb.disabled) return;
    const muvelet = gomb.dataset.muvelet;
    if (muvelet === 'ter') {
      modal.bezaras();
      await terMegnyitasa?.();
      return;
    }
    const sor = gomb.closest('[data-gyermek]');
    if (!sor) return;
    const g = (elonezet?.gyermekek ?? []).find((x) => x.azonosito === sor.dataset.gyermek);
    if (!g) return;
    if (muvelet === 'megerosites') { megerosites = g.azonosito; rajzol(); return; }
    if (muvelet === 'megse') { megerosites = null; rajzol(); return; }
    if (muvelet === 'koltozom') {
      folyamatban = true;
      rajzol();
      try {
        siker = await apiPost('koltozes', { gyermek: g.azonosito, elhagy: [...elhagyottja(g)] });
      } catch (hiba) {
        modal.hibaBeallitasa(hiba.message ?? 'A költözés nem sikerült.');
        folyamatban = false;
        megerosites = null;
        await betolt().catch(() => rajzol());
        return;
      }
      folyamatban = false;
      rajzol();
    }
  });

  await modal.init();
  modal.megnyitas();
  try {
    await betolt();
  } catch (hiba) {
    tartalom.innerHTML = '<p class="koino-megjegyzes">A költözés előnézete most nem kérdezhető le: ' + html(hiba.message) + '</p>';
  }
  console.log('koltozesMegnyitasa - VÉGE', { gyermekek: elonezet?.gyermekek?.length ?? 0 });
  return modal;
}
