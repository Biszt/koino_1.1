// koino/felulet/js/koinoMeghivas.js

// Felelősség: ⭐⭐ D121, D122 — A MEGHÍVÁS A LAPON (koinós többlet a prototípus „Meghívóim” ablaka KÖRÉ): „egy bemásolás, és a
// következő csere után bent vagy”.
//   · „✉️ Meghívóim” — a prototípus `MeghivoModal`-ja BÁJTRA VÁLTOZATLANUL (a meghívott teljes neve + a nyilatkozat → „Új meghívó
//     létrehozása”; a saját meghívók listája: a 📋 a meghívottnak küldendő EGY sort másolja — a telepítő sort a meghívóval, a
//     Termuxba —, a 💻 ugyanezt Windowsra (a PowerShellbe vagy a parancssorba — elágazás 232), a 🗑️ visszavon). A program a prototípus útvonalain felel (`/api/meghivo/sajat`, `/api/meghivo`, `/api/meghivo/:id/visszavonas`,
//     `/api/meghivo/kotelezo`). A koinós többlet: a nyilatkozat szövege („Kijelentem…” — a koinóban a „tanúsítás” a 2. lépcső
//     neve), egy magyarázó sor, a lejárt meghívó felirata, és a 📋 az egész sort másolja (a listában a rövid kód látszik, mint a
//     prototípusban — a program `kod`-ja a meghívó azonosítójából, a `szoveg` az egész sor).
//   · a PROFIL-ŰRLAP (a regisztrációs űrlap kinézetével): teljes név (a meghívóból előtöltve, átírható), becenév, ország, régió,
//     település — nem kötelező (ha a koinó nem várja); az első megnyitáskor magától, utána a fő menü „eember beállítások” pontja.
//   · a belépő VÁRAKOZÁSA (`varakozasHtml` — a csatlakozás ablaka mutatja): a meghívó gépe a következő cserénél magától meghív.
//   · az ELSŐ MEGNYITÁS (`elsoMegnyitas`): ha a készülék még egy koinót sem ismer, a csatlakozás ablaka („Meghívtak? illeszd be”);
//     ha belépett, de még nincs profilja (és nem hagyta ki), a profil-űrlap.
//
// ⭐ A lap csak rajzol (7. szabály): a meghívót, a meghívást és a profilt a program végzi (`koino.js` `meghivoKiadasa`,
// `kiadottMeghivok`, `meghivoVisszavonasa`, `profilomAllapota`, `profilMegadasa` — ugyanaz, mint a parancsoké).
//
// Használja: `foMenu.js`, `koinoCsatlakozas.js`, `index.html`.

import Modal from './components/modals/Modal.js';
import MeghivoModal from './components/modals/MeghivoModal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';
const KIHAGYVA = 'koino-profil-kihagyva:';

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ===================================
// ✉️ MEGHÍVÓIM — a prototípus ablaka, a koinós többlet köré írva
// ===================================

/** A prototípus-metódus köré ír (a visszatérési értékét is átalakíthatja); kétszeri becsomagolás ellen őrzött. */
function koruleIr(metodus, fn) {
  const eredeti = MeghivoModal.prototype[metodus];
  if (typeof eredeti !== 'function' || eredeti.koinoKorulirva) return;
  const uj = function (...ervek) {
    const ertek = eredeti.apply(this, ervek);
    return ertek && typeof ertek.then === 'function' ? ertek.then((x) => fn.call(this, x, ...ervek)) : fn.call(this, ertek, ...ervek);
  };
  uj.koinoKorulirva = true;
  MeghivoModal.prototype[metodus] = uj;
}

// a nyilatkozat szövege és a magyarázat (a sablon bájtra a prototípusé — a szövegét itt cseréljük)
koruleIr('init', function (ertek) {
  const tanusitas = document.getElementById('meghivo-tanusitas');
  const span = tanusitas?.parentElement?.querySelector('span');
  if (span) {
    span.innerHTML = 'Kijelentem, hogy a meghívott <strong>valódi személy</strong>, és tudomásom szerint <strong>még nem '
      + 'csatlakozott</strong> ehhez a koinóhoz.';
  }
  const letrehozas = document.querySelector('.meghivo-modal__letrehozas');
  if (letrehozas && !letrehozas.querySelector('.koino-meghivo-magyarazat')) {
    const p = document.createElement('p');
    p.className = 'koino-meghivo-magyarazat';
    p.textContent = 'A meghívó egy hónapig érvényes, és egyszer használható. A 📋 és a 💻 egy-egy sort másol (ugyanazzal a '
      + 'meghívóval) — küldd el a meghívottnak azt, amelyik neki kell: a 📋-t a telefonján a Termuxba, a 💻-t a Windowsos gépén a '
      + 'PowerShellbe vagy a parancssorba másolja (mindkettő telepít is); ha nála már fut a koino, a lapon is beillesztheti. A '
      + 'következő csere után magától tag lesz (ehhez a te gépeden is futnia kell a koinónak).';
    letrehozas.appendChild(p);
  }
  return ertek;
});

// a 📋 a meghívottnak küldendő EGÉSZ sort másolja (a listában a rövid kód látszik, mint a prototípusban), mellette a 💻 a windowsosat
// (a prototípus másolója a gomb szövegét visszaállítja, így egy második gomb ugyanazzal az osztállyal is jól jár), és a lejárt
// meghívó felirata (a prototípusban nincs lejárat)
koruleIr('_elemHtml', function (h, meghivo) {
  if (typeof h !== 'string') return h;
  let ki = h;
  if (meghivo?.szoveg) {
    ki = ki.replace('class="meghivo-modal__masol" data-kod="' + meghivo.kod + '" title="Kód másolása">📋</button>',
      'class="meghivo-modal__masol" data-kod="' + html(meghivo.szoveg) + '" title="A meghívó másolása telefonra — a Termuxba (egy sor: '
      + 'küldd el a meghívottnak)">📋</button>'
      + (meghivo.windowsSzoveg ? '<button type="button" class="meghivo-modal__masol" data-kod="' + html(meghivo.windowsSzoveg)
        + '" title="A meghívó másolása Windowsra — a PowerShellbe vagy a parancssorba (egy sor: küldd el a meghívottnak)">💻</button>'
        : ''));
  }
  if (meghivo?.statusz === 'Lejart') {
    ki = ki.replace('meghivo-modal__statusz--aktiv">Lejart', 'meghivo-modal__statusz--visszavont">Lejárt');
  }
  return ki;
});

/** A „Meghívóim” ablak — a prototípusé. */
export async function meghivoimMegnyitasa() {
  console.log('meghivoimMegnyitasa - KEZDÉS');
  const modal = new MeghivoModal(MODAL_KONTENER);
  await modal.init();
  await modal.megnyitas();
  console.log('meghivoimMegnyitasa - VÉGE');
  return modal;
}

// ===================================
// 📝 A PROFIL-ŰRLAP (a regisztrációs űrlap kinézetével)
// ===================================

const PROFIL_MEZOK = [
  { kulcs: 'nev', cimke: 'Teljes név', autocomplete: 'name' },
  { kulcs: 'becenev', cimke: 'Becenév', autocomplete: 'nickname' },
  { kulcs: 'orszag', cimke: 'Ország', autocomplete: 'country-name' },
  { kulcs: 'regio', cimke: 'Régió / Megye', autocomplete: 'address-level1' },
  { kulcs: 'telepules', cimke: 'Település', autocomplete: 'address-level2' }
];

/**
 * A profil-űrlap: a meglévő profilom (ha van), különben az előtöltés (a meghívó által beírt név); a koinó kötelező mezői
 * csillaggal. Az első megnyitáskor „Most kihagyom” is (a lap ezt koinónként megjegyzi).
 * @param {{elso?: boolean, koino?: string|null}} [b]
 */
export async function profilUrlapMegnyitasa({ elso = false, koino = null } = {}) {
  console.log('profilUrlapMegnyitasa - KEZDÉS', { elso });
  let allapot;
  try { allapot = await apiGet('profil'); } catch { allapot = null; }
  if (!allapot?.belepve) return null;
  const ertekek = { ...(allapot.mezok ?? {}) };
  if (!ertekek.nev && allapot.elotoltes?.nev) ertekek.nev = allapot.elotoltes.nev;
  const kotelezo = new Set(allapot.kotelezo ?? []);

  const tartalom = document.createElement('div');
  tartalom.innerHTML = '<p class="koino-profil__leiras">' + (elso
    ? 'Üdv a koinóban! Ha szeretnéd, add meg az adataidat — a többiek ezekből ismernek fel. Nem kötelező, és később a fő menü '
      + '„eember beállítások” pontjában is megadhatod.'
    : 'Az adataid ebben a koinóban — a többiek ezekből ismernek fel.'
      + (!allapot.tag && allapot.meghivoval ? ' A meghívód a meghíváskor ezt tanúsítja.' : '')) + '</p>'
    + '<div class="regisztracio-form__altalanos-hiba" role="alert"></div>'
    + '<form class="regisztracio-form koino-profil" novalidate>'
    + PROFIL_MEZOK.map((m) => '<div class="form-mezo"><input class="form-mezo__bemenet" type="text" name="' + m.kulcs + '" '
      + 'placeholder="' + html(m.cimke + (kotelezo.has(m.kulcs) ? ' *' : '')) + '" aria-label="' + html(m.cimke) + '" autocomplete="'
      + m.autocomplete + '" maxlength="120" value="' + html(ertekek[m.kulcs] ?? '') + '"></div>').join('')
    + (kotelezo.size ? '<p class="koino-profil__leiras">* a koinó ezeket kéri — a meghívásod ezek nélkül nem írható alá.</p>' : '')
    + '<button type="submit" class="btn-regisztracio">Mentés</button></form>';

  const modal = new Modal(MODAL_KONTENER, {
    cim: elso ? '📝 Az adataid' : '⚙️ eember beállítások — az adataid',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: elso ? 'Most kihagyom' : 'Bezárás', tipus: 'masodlagos', akcio: () => {
      if (elso && koino) { try { localStorage.setItem(KIHAGYVA + koino, '1'); } catch { /* a tároló nem elérhető */ } }
      modal.bezaras();
    } }]
  });
  const hiba = tartalom.querySelector('.regisztracio-form__altalanos-hiba');
  tartalom.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const mezok = {};
    for (const m of PROFIL_MEZOK) mezok[m.kulcs] = tartalom.querySelector('input[name="' + m.kulcs + '"]')?.value.trim() ?? '';
    const gomb = tartalom.querySelector('button[type="submit"]');
    gomb.disabled = true;
    hiba.textContent = '';
    try {
      await apiPost('profil', { mezok });
      // az alsó sáv a becenevet mutatja — a mentés után azonnal frissüljön (`alsoSav.js`)
      document.dispatchEvent(new CustomEvent('koino:profilValtozas'));
      modal.bezaras();
    } catch (h) {
      hiba.textContent = h.message ?? 'A mentés nem sikerült.';
      gomb.disabled = false;
    }
  });
  await modal.init();
  modal.megnyitas();
  console.log('profilUrlapMegnyitasa - VÉGE');
  return modal;
}

// ===================================
// ⏳ A BELÉPŐ VÁRAKOZÁSA és AZ ELSŐ MEGNYITÁS
// ===================================

/** ⭐ D122: a belépő várakozása — a meghívó gépe a következő cserénél magától meghív. @returns {string} HTML */
export function varakozasHtml(t) {
  if (!t?.horgony) return '<p class="koino-meghivas__leiras">Még nincs belépésed ebben a koinóban.</p>';
  if (t.tag) return '<p class="koino-meghivas__tag">✅ Tag vagy ebben a koinóban — a meghívásod megérkezett.</p>';
  return '<p class="koino-meghivas__leiras">⏳ A meghívód gépe a következő cserénél magától meghív — ehhez az ő gépén is futnia '
    + 'kell a koinónak. Ez az ablak magától frissül.</p>';
}

/**
 * ⭐⭐ D122: AZ ELSŐ MEGNYITÁS — ha a készülék még egy koinót sem ismer: a csatlakozás ablaka („Meghívtak? illeszd be”); ha a
 * mostani koinóba beléptem, de még nincs profilom, és nem hagytam ki: a profil-űrlap.
 * @param {{csatlakozas: Function}} b - a csatlakozás ablakának megnyitója (a `koinoCsatlakozas.js`-ből — körkörös import nélkül)
 */
export async function elsoMegnyitas({ csatlakozas }) {
  try {
    const ter = await apiGet('ter');
    if (!(ter?.kartyak ?? []).length) { await csatlakozas(); return; }
    const en = await apiGet('en');
    const allapot = await apiGet('profil');
    let kihagyva = false;
    try { kihagyva = localStorage.getItem(KIHAGYVA + en?.koino) === '1'; } catch { /* a tároló nem elérhető */ }
    if (allapot?.belepve && allapot.mezok === null && !kihagyva) await profilUrlapMegnyitasa({ elso: true, koino: en?.koino });
  } catch (hiba) {
    console.warn('elsoMegnyitas - nem sikerült', { ok: hiba.message });
  }
}
