// koino/felulet/js/koinoFelderites.js

// Felelősség: ⭐⭐ A FELDERÍTÉS A FELÜLETEN (D108/1, D112 ⑤ — F5 (A)) — koinós többlet, a prototípusban nincs ilyen:
//   · a kártya menüjében egy „📷 Felderítés…” pont (a kártya bővítési pontján — `extraMenuOpciok` —, a prototípus kártyája
//     bájtra változatlan), ami a beállító ablakot nyitja: hány csomópont (K), milyen mélyen, a törzzsel-e, hány MB-ig;
//   · a fő menüben a „📷 Felderítések” ablak: a felderítések állása (fut / kész / megállt / elakadt), újrafelderítés, törlés —
//     amíg nyitva van, öt másodpercenként frissül.
//
// ⭐ A lap csak rajzol (7. szabály): a felderítést a program végzi (az őrjárat — `koino.js` `felderitesKor`), a beállítások
// határait is a program szabja (`felderites.js`); a lap a kapu útvonalain kérdez (`/api/felderitesek`, `/api/felderites`,
// `/api/felderites/torol`). ⚠️ A pillanatkép nem frissül és értesítést nem ad — ezt az ablak ki is mondja: a követés eszköze
// a tudatpont.
//
// Használja: `index.html` (egyszer betölti — a kártya bővítése a modul betöltésekor történik), `foMenu.js`.

import Kartya from './components/kartya/Kartya.js';
import Modal from './components/modals/Modal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';
const ALLAPOT_NEVE = { fut: 'fut', kesz: 'kész', keret: 'megállt (elérte a méretét)', elakadt: 'elakadt', megallitva: 'megállítva' };

// A méret: 1 MB alatt KB-ban (különben egy kis pillanatkép „0 MB”-nak látszana — a böngészős próba mutatta).
const meretSzoveg = (bajt) => (bajt < 1024 * 1024
  ? (bajt / 1024).toLocaleString('hu-HU', { maximumFractionDigits: 1 }) + ' KB'
  : (bajt / (1024 * 1024)).toLocaleString('hu-HU', { maximumFractionDigits: 1 }) + ' MB');
const napja = (ido) => {
  const nap = Math.floor((Date.now() - ido) / (24 * 3600 * 1000));
  return nap <= 0 ? 'ma' : nap + ' napja';
};
const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ===================================
// A KÁRTYA MENÜJE — „📷 Felderítés…” (a kártya bővítési pontján)
// ===================================
//
// A prototípus kártyája az `init()`-ben olvassa az `extraMenuOpciok`-at (a nézetek így adnak pontot a menühöz — a Síkidom is
// így teszi); itt minden kártya kapja, amelyiknek van modál-konténere (az ismeretlen alap-kártyának nincs).
const eredetiInit = Kartya.prototype.init;
Kartya.prototype.init = function (...ervek) {
  const az = this.entitas?.entitasId ?? this.entitas?._id ?? null;
  if (this.modalKontenerAzon && typeof az === 'string' && /^[A-Za-z0-9_-]{43}$/.test(az)
    && !(this.extraMenuOpciok ?? []).some((o) => o?.koinoFelderites)) {
    this.extraMenuOpciok = [...(this.extraMenuOpciok ?? []), {
      ikon: '📷',
      felirat: 'Felderítés…',
      koinoFelderites: true,
      akcio: () => felderitesInditasa({ ag: az, cim: this.entitas?.adatok?.cim ?? this.entitas?.adatok?.nev ?? '' })
    }];
  }
  return eredetiInit.apply(this, ervek);
};

// ===================================
// A BEÁLLÍTÓ ABLAK — egy ág felderítésének indítása
// ===================================

/**
 * A felderítés beállítása és indítása egy ágra (a kártya menüjéből; `ag: 'gyoker'` az egész koinó).
 * @param {{ag: string, cim?: string}} b
 */
export async function felderitesInditasa({ ag, cim = '' }) {
  console.log('felderitesInditasa - KEZDÉS', { ag });
  let beall = { alap: { k: 200, mb: 20 }, hatar: { k: 2000, melyseg: 64, mb: 500 } };
  try { beall = await apiGet('felderitesek') ?? beall; } catch { /* az alapértékekkel */ }
  const alap = beall.alap ?? { k: 200, mb: 20 };
  const hatar = beall.hatar ?? { k: 2000, melyseg: 64, mb: 500 };
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-felderites';
  tartalom.innerHTML = `
    <p class="koino-felderites__cim">📷 ${ag === 'gyoker' ? 'Az egész koinó' : html(cim || 'Ez az ág')}</p>
    <p class="koino-felderites__leiras">Egyszeri pillanatkép: az ág legfontosabb csomópontjai a háttérben érkeznek (az
      őrjárat hozza), és a készülékeden maradnak. Nem frissül és értesítést nem ad — amit követni akarsz, arra tegyél
      tudatpontot.</p>
    <label class="koino-felderites__mezo">Hány csomópont (a legfontosabbak)
      <input type="number" id="koino-felderites-k" min="1" max="${hatar.k}" value="${alap.k}"></label>
    <label class="koino-felderites__mezo">Legfeljebb hány szint mélyen
      <input type="number" id="koino-felderites-melyseg" min="0" max="${hatar.melyseg}" placeholder="nincs korlát"></label>
    <label class="koino-felderites__mezo koino-felderites__mezo--jelolo">
      <input type="checkbox" id="koino-felderites-torzs"> a szöveg és a fájlok is (a törzs — több adat, lassabb)</label>
    <label class="koino-felderites__mezo">Legfeljebb ennyi MB
      <input type="number" id="koino-felderites-mb" min="1" max="${hatar.mb}" value="${alap.mb}"></label>`;
  const modal = new Modal(MODAL_KONTENER, {
    cim: 'Felderítés',
    meret: 'szuk',
    tartalom,
    gombok: [
      { felirat: 'Mégse', tipus: 'masodlagos', akcio: () => modal.bezaras() },
      {
        felirat: 'Felderítés indítása',
        tipus: 'elsodleges',
        azonosito: 'koino-felderites-indit',
        akcio: async () => {
          const szam = (id) => { const v = parseInt(document.getElementById(id)?.value, 10); return Number.isInteger(v) ? v : undefined; };
          modal.hibaTisztitasa();
          modal.betoltesBeallitasa(true);
          try {
            await apiPost('felderites', { ag, k: szam('koino-felderites-k'), melyseg: szam('koino-felderites-melyseg'),
              torzs: document.getElementById('koino-felderites-torzs')?.checked === true, mb: szam('koino-felderites-mb') });
            modal.betoltesBeallitasa(false);
            modal.bezaras();
            await felderitesekMegnyitasa();
          } catch (hiba) {
            modal.betoltesBeallitasa(false);
            modal.hibaBeallitasa(hiba.message ?? 'A felderítés nem indult el.');
          }
        }
      }
    ]
  });
  await modal.init();
  modal.megnyitas();
  console.log('felderitesInditasa - VÉGE');
  return modal;
}

// ===================================
// A FELDERÍTÉSEK ABLAKA — az állás, újra, törlés (a fő menüből)
// ===================================

function felderitesSora(f) {
  const cim = f.ag === 'gyoker' ? 'Az egész koinó' : (f.agCim ? html(f.agCim) : html(f.ag.slice(0, 12)) + '…');
  const fazis = f.allapot === 'fut' && f.torzs ? (f.fazis === 'torzs'
    ? ' — a törzs: ' + (f.torzsHianyzik ?? '?') + ' csomópontnak hiányzik' : ' — a fejlécek') : '';
  return `
    <div class="koino-felderites-sor koino-felderites-sor--${html(f.allapot)}" data-az="${html(f.az)}">
      <div class="koino-felderites-sor__cim">📷 ${cim}</div>
      <div class="koino-felderites-sor__allas">${html(ALLAPOT_NEVE[f.allapot] ?? f.allapot)}${html(fazis)} ·
        ${f.latszik}/${f.k} csomópont · ${meretSzoveg(f.bajt)} / ${f.mb} MB · ${f.kerelmek} kérés · ${napja(f.kezdet)}
        ${f.ok ? '<br><span class="koino-felderites-sor__ok">' + html(f.ok) + '</span>' : ''}</div>
      <div class="koino-felderites-sor__gombok">
        <button type="button" class="koino-felderites-sor__gomb" data-muvelet="ujra">Újra</button>
        <button type="button" class="koino-felderites-sor__gomb koino-felderites-sor__gomb--torol" data-muvelet="torol">Törlés</button>
      </div>
    </div>`;
}

/** A felderítések ablaka — amíg nyitva van, öt másodpercenként frissül. */
export async function felderitesekMegnyitasa() {
  console.log('felderitesekMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-felderitesek';
  let ora = null;
  const modal = new Modal(MODAL_KONTENER, {
    cim: '📷 Felderítések',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => modal.bezaras() }],
    onBezaras: () => { clearTimeout(ora); }
  });
  let lista = [];
  const rajzol = async () => {
    try {
      const v = await apiGet('felderitesek');
      lista = v?.felderitesek ?? [];
      tartalom.innerHTML = lista.length
        ? lista.map(felderitesSora).join('')
          + '<p class="koino-megjegyzes">Pillanatképek: nem frissülnek és értesítést nem adnak — a követés eszköze a tudatpont. '
          + 'A felderítést az őrjárat végzi; ha nem fut, nem halad.</p>'
        : '<p class="koino-megjegyzes">Még nincs felderítés. Egy kártya menüjéből („📷 Felderítés…”) indíthatsz egyet.</p>';
    } catch (hiba) {
      tartalom.innerHTML = '<p class="koino-megjegyzes">A felderítések most nem kérdezhetők le: ' + html(hiba.message) + '</p>';
    }
    if (modal.nyitottE) ora = setTimeout(rajzol, 5000);
  };
  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    const sor = e.target.closest('[data-az]');
    if (!gomb || !sor) return;
    const f = lista.find((x) => x.az === sor.dataset.az);
    if (!f) return;
    try {
      if (gomb.dataset.muvelet === 'torol') await apiPost('felderites/torol', { az: f.az });
      else await apiPost('felderites', { ag: f.ag, k: f.k, melyseg: f.melyseg ?? undefined, torzs: f.torzs, mb: f.mb });
      clearTimeout(ora);
      await rajzol();
    } catch (hiba) { modal.hibaBeallitasa(hiba.message ?? 'Nem sikerült.'); }
  });
  await modal.init();
  modal.megnyitas();
  await rajzol();
  console.log('felderitesekMegnyitasa - VÉGE');
  return modal;
}
