// koino/felulet/js/koinoMeghivas.js

// Felelősség: ⭐⭐ D121 (⑤) — A MEGHÍVÁS A LAPON (koinós többlet — a prototípus „Meghívóim” pontja helyén): „két ember, két
// gomb, egy összevetett kód”. Két ablak a fő menüben:
//   · „✉️ Meghívás…” — a meghívó SZÖVEGE ehhez a koinóhoz (a másoló gombbal, egy nem kötelező megnevezéssel); a figyelmeztetések
//     (még nem vagyok tag — a meghívásom nem ad tagságot; nem fut az őrjárat — a belépő nem ér el). Ha még nem vagyok tag, az
//     ablak a várakozást mutatja: az ellenőrző kódomat, amit a meghívómnak bemondok, és hogy tag lettem-e (`varakozasHtml`).
//   · „👋 Belépők” — akik jelentkeztek és még nem tagok, a kódjukkal (MH3) és a profiljukkal; a „Meghívom” egy megerősítés után
//     (csak ha a belépő ugyanezt a kódot mondta be).
//
// ⭐ A lap csak rajzol (7. szabály): a meghívó szövegét, a jegyzéket és a meghívást a program adja (`koino.js` `meghivoSzovege`,
// `belepokJegyzeke`, `meghivasVegrehajtasa`, `tagsagAllapotom` — ugyanaz, mint a `meghivo`, `belepok`, `meghiv` parancsé), a lap
// a kapu útvonalain kérdez (`GET /api/meghivo`, `/api/belepok`, `/api/tagsagom`, `POST /api/meghivas`).
//
// Használja: `foMenu.js`, `koinoCsatlakozas.js` (a meghívó elfogadása után a várakozás).

import Modal from './components/modals/Modal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';
const FRISSITES_MS = 5000;

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rovid = (az) => String(az ?? '').slice(0, 8) + '…';
const ido = (t) => (Number.isFinite(t) ? new Date(t).toLocaleString('hu-HU') : '');

/** A vágólapra másolás (ha a vágólap nem érhető el, a szöveg kijelölve marad — kézzel másolható). */
async function masolas(gomb, szovegElem) {
  try {
    await navigator.clipboard.writeText(szovegElem.textContent);
    gomb.textContent = 'Másolva ✓';
  } catch {
    window.getSelection()?.selectAllChildren(szovegElem);
    gomb.textContent = 'Jelöld ki és másold';
  }
  setTimeout(() => { gomb.textContent = 'Másolás'; }, 2500);
}

/**
 * ⭐ A belépő várakozása (MH3, MH4): az ellenőrző kódom, és hogy tag lettem-e. A `koinoCsatlakozas.js` is ezt rajzolja a meghívó
 * elfogadása után. @returns {string} HTML
 */
export function varakozasHtml(t, meghivoNeve = null) {
  if (!t?.horgony) return '<p class="koino-meghivas__leiras">Még nincs belépésed ebben a koinóban.</p>';
  if (t.tag) {
    return '<p class="koino-meghivas__tag">✅ Tag vagy ebben a koinóban — a meghívásod megérkezett.</p>';
  }
  return '<p class="koino-meghivas__leiras">⏳ Várakozás a meghívásra' + (meghivoNeve ? ' — a meghívód: <strong>' + html(meghivoNeve)
    + '</strong>' : '') + '. Mondd be neki ezt a kódot (élőben vagy telefonon) — ő ugyanezt látja a belépők között, és ha egyezik, '
    + 'meghív:</p><p class="koino-meghivas__kod">' + html(t.kod) + '</p>'
    + '<p class="koino-meghivas__leiras">Ehhez a két készüléknek cserélnie kell (az őrjáratok — a telefonon a <code>koino</code> '
    + 'parancs indítja). Ez az ablak magától frissül.</p>';
}

// ===================================
// ✉️ MEGHÍVÁS
// ===================================

/** A meghívás ablaka: a meghívó szövege (ha tag vagyok), vagy a várakozás a saját meghívásomra (ha még nem). */
export async function meghivasMegnyitasa() {
  console.log('meghivasMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-meghivas';
  let ora = null;
  const modal = new Modal(MODAL_KONTENER, {
    cim: '✉️ Meghívás ebbe a koinóba',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => { clearInterval(ora); modal.bezaras(); } }]
  });

  let tagsag = null;
  let meghivo = null;
  let hiba = null;
  let nev = '';

  const rajzol = () => {
    if (hiba) {
      tartalom.innerHTML = '<p class="koino-meghivas__hiba">' + html(hiba) + '</p>';
      return;
    }
    if (!tagsag) { tartalom.innerHTML = '<p class="koino-meghivas__leiras">Betöltés…</p>'; return; }
    if (!tagsag.tag) {
      tartalom.innerHTML = varakozasHtml(tagsag) + '<p class="koino-meghivas__leiras">Meghívni csak tag tud — amíg nem vagy tag, '
        + 'a meghívód nem ad tagságot.</p>';
      return;
    }
    const figyel = [];
    if (meghivo && !meghivo.orjarat?.fut) {
      figyel.push('⚠ Nem fut az őrjáratod — a belépő csak akkor ér el, ha fut (a telefonon a <code>koino</code> parancs indítja).');
    }
    tartalom.innerHTML = '<p class="koino-meghivas__leiras">Küldd el ezt a szöveget annak, akit meghívsz (üzenetben, e-mailben, '
      + 'akár papíron). Ő a lapján, a „🔗 Csatlakozás egy koinóhoz…” ablakban beilleszti — a többi magától megy. Utána a '
      + '„👋 Belépők” között látod, a kódjával.</p>'
      + '<label class="koino-meghivas__mezo">Hogyan mutatkozz be benne? (nem kötelező)'
      + '<input type="text" name="nev" maxlength="64" autocomplete="off" value="' + html(nev) + '" placeholder="pl. Csaba laptopja">'
      + '</label>'
      + (meghivo ? '<div class="koino-meghivas__szoveg"><code>' + html(meghivo.szoveg) + '</code>'
        + '<button type="button" class="koino-meghivas__gomb" data-muvelet="masol">Másolás</button></div>' : '')
      + (meghivo ? '<p class="koino-meghivas__leiras">A címeid benne: ' + html((meghivo.cimek ?? []).map((c) => c.hoszt + ':' + c.port)
        .join(', ') || '—') + '.</p>' : '')
      + figyel.map((s) => '<p class="koino-meghivas__figyel">' + s + '</p>').join('');
  };

  const betolt = async () => {
    try {
      tagsag = await apiGet('tagsagom');
      if (tagsag.tag) meghivo = await apiGet('meghivo' + (nev ? '?nev=' + encodeURIComponent(nev) : ''));
      hiba = null;
    } catch (h) {
      hiba = h.message ?? 'A meghívó most nem készíthető.';
    }
    rajzol();
  };

  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (gomb?.dataset.muvelet === 'masol') await masolas(gomb, tartalom.querySelector('.koino-meghivas__szoveg code'));
  });
  tartalom.addEventListener('change', async (e) => {
    if (e.target.name !== 'nev') return;
    nev = e.target.value.trim();
    await betolt();
  });

  await modal.init();
  rajzol();
  modal.megnyitas();
  await betolt();
  // ⭐ Ha még nem vagyok tag, a várakozás magától frissül (a meghívás a cserével jön).
  ora = setInterval(async () => {
    if (!document.body.contains(tartalom)) { clearInterval(ora); return; }
    if (tagsag && !tagsag.tag) await betolt();
  }, FRISSITES_MS);
  console.log('meghivasMegnyitasa - VÉGE');
  return modal;
}

// ===================================
// 👋 BELÉPŐK
// ===================================

/** A belépők ablaka: a várakozók a kódjukkal; a „Meghívom” a megerősítés után. */
export async function belepokMegnyitasa() {
  console.log('belepokMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-meghivas';
  let ora = null;
  const modal = new Modal(MODAL_KONTENER, {
    cim: '👋 Belépők — akik meghívásra várnak',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => { clearInterval(ora); modal.bezaras(); } }]
  });

  let lista = null;
  let megerosites = null;       // a horgony, akinél a megerősítés látszik
  let uzenet = null;
  let folyamatban = false;

  const profilHtml = (p) => {
    if (!p) return '';
    if (p.mezok) return '<span class="koino-belepo__profil">' + Object.entries(p.mezok).map(([k, v]) => html(k) + ': ' + html(v)).join(' · ') + '</span>';
    return '<span class="koino-belepo__profil">' + (p.van ? 'a profilja még nem jött meg' : '⚠ nincs profilja (a koinó ezt várja: '
      + html(p.kell.join(', ')) + ')') + '</span>';
  };

  const rajzol = () => {
    if (!lista) { tartalom.innerHTML = '<p class="koino-meghivas__leiras">Betöltés…</p>'; return; }
    const elo = '<p class="koino-meghivas__leiras">Hívd meg azt, akinek a kódját <strong>tőle hallottad</strong> (élőben vagy '
      + 'telefonon) — a meghívó szöveget más is továbbküldhette, de a kódját előre senki nem tudhatja.</p>'
      + (uzenet ? '<p class="koino-meghivas__uzenet">' + uzenet + '</p>' : '');
    if (!lista.length) {
      tartalom.innerHTML = elo + '<p class="koino-meghivas__leiras">Most senki nem vár. Aki a meghívódat elfogadta, az első cserével '
        + 'ide érkezik (az ablak magától frissül).</p>';
      return;
    }
    tartalom.innerHTML = elo + '<ul class="koino-belepok">' + lista.map((b) => '<li class="koino-belepo">'
      + '<span class="koino-belepo__kod">' + html(b.kod) + '</span>'
      + '<span class="koino-belepo__adat">' + html(rovid(b.horgony)) + ' · belépett: ' + html(ido(b.belepett)) + profilHtml(b.profil) + '</span>'
      + (megerosites === b.horgony
        ? '<span class="koino-belepo__megerosites">A belépő ezt a kódot mondta: <strong>' + html(b.kod) + '</strong>? '
          + '<button type="button" class="koino-meghivas__gomb koino-meghivas__gomb--fo" data-muvelet="meghiv" data-horgony="'
          + html(b.horgony) + '"' + (folyamatban ? ' disabled' : '') + '>Igen, meghívom</button>'
          + '<button type="button" class="koino-meghivas__gomb" data-muvelet="megse">Mégse</button></span>'
        : '<button type="button" class="koino-meghivas__gomb" data-muvelet="kerdez" data-horgony="' + html(b.horgony)
          + '"' + (b.profil && !b.profil.van ? ' disabled title="A koinó profilt vár — előbb a belépő adja meg"' : '') + '>Meghívom…</button>')
      + '</li>').join('') + '</ul>';
  };

  const betolt = async () => {
    try {
      lista = (await apiGet('belepok')).belepok ?? [];
    } catch (h) {
      lista = [];
      uzenet = html(h.message ?? 'A belépők most nem olvashatók.');
    }
    rajzol();
  };

  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (!gomb || gomb.disabled) return;
    if (gomb.dataset.muvelet === 'kerdez') { megerosites = gomb.dataset.horgony; uzenet = null; rajzol(); return; }
    if (gomb.dataset.muvelet === 'megse') { megerosites = null; rajzol(); return; }
    if (gomb.dataset.muvelet !== 'meghiv') return;
    folyamatban = true;
    rajzol();
    try {
      const r = await apiPost('meghivas', { horgony: gomb.dataset.horgony });
      uzenet = '✅ Meghívtad (' + html(r.kod) + ') — a következő csere viszi el hozzá, és tag lesz.';
    } catch (h) {
      uzenet = '⚠ ' + html(h.message ?? 'A meghívás nem sikerült.');
    }
    folyamatban = false;
    megerosites = null;
    await betolt();
  });

  await modal.init();
  rajzol();
  modal.megnyitas();
  await betolt();
  ora = setInterval(async () => {
    if (!document.body.contains(tartalom)) { clearInterval(ora); return; }
    if (!megerosites && !folyamatban) await betolt();
  }, FRISSITES_MS);
  console.log('belepokMegnyitasa - VÉGE');
  return modal;
}
