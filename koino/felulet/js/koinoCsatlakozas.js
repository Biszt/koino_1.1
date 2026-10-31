// koino/felulet/js/koinoCsatlakozas.js

// Felelősség: ⭐⭐ D119 (⑥) — A TÉR KÉT ABLAKA (koinós többlet, a prototípusban nincs ilyen): „🔗 Csatlakozás egy koinóhoz…”
// (a koinó neve — beillesztve, vagy a tér kártyájáról, ha egy koino-verzió kártyáról ismert gyermek —, és egy nem kötelező
// becenév) és „🤝 Társak…” (az induló címek: a felvétel és a levétel). Eddig mindkettő csak parancs volt (`csatlakoz`, `tars`) —
// a kézi próba 2. lelete (Csaba, 2. (A)).
//
// ⭐ A lap csak rajzol (7. szabály): a csatlakozást és a társakat a program végzi (`koino.js` `koinoCsatlakozas`, `tarsFelvetele`,
// `tarsLevetele` — ugyanaz, mint a parancsoké), a lap a kapu útvonalain kérdez (`/api/csatlakozas`, `/api/tarsak`). ⚠️ Ami a
// lapon nem megy, azt kimondjuk: egy koinónak, aminek a családjához nem fut őrjárat, a parancsot kiírjuk (CS5 (A): két külön
// indítás marad), a belépés és a meghívás ma még parancs.
//
// Használja: `index.html` (a tér sávja), `terNezet.js` (a kártyáról ismert gyermek „Csatlakozom…” gombja).

import Modal from './components/modals/Modal.js';
import { apiGet, apiPost } from './utils/apiHelper.js';

const MODAL_KONTENER = 'modal-kontener';
const LENYOMAT = /^[A-Za-z0-9_-]{43}$/;
// ⚠️ D118/3 (4.6): a gyermekben az a tag, aki a szülőben tag volt ÉS beköltözött, vagy akit a gyermekben meghívtak — a csatlakozás
// egyik sem: egy ZÁRT gyermek a tartalmát csak tagnak adja ki.
const ZART_GYERMEK = 'Zárt koinó: a tartalmát csak tagnak adják ki — a csatlakozástól még nem leszel tag benne. Ha a szülőjében tag '
  + 'voltál a születésekor, a „🧳 Költözés…” beköltöztet (akkor tag leszel, a súlyoddal); különben egy tagjának kell meghívnia.';

const html = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rovid = (az) => String(az ?? '').slice(0, 8) + '…';

/**
 * ⭐ Egy parancs a másoló gombjával — a koinó őrjáratát a lap nem indítja (CS5 (A)), de a parancsot nem kell begépelni.
 * @returns {string} HTML
 */
export function parancsHtml(parancs) {
  return '<div class="koino-parancs"><code class="koino-parancs__szoveg">' + html(parancs) + '</code>'
    + '<button type="button" class="koino-parancs__masol" data-masol="' + html(parancs) + '" title="A parancs a vágólapra">Másolás</button></div>';
}

/** A másoló gombok — egy konténerre (a kattintás felbuborékol). */
export function masoloGombok(kontener) {
  kontener.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-masol]');
    if (!gomb) return;
    try {
      await navigator.clipboard.writeText(gomb.dataset.masol);
      gomb.textContent = 'Másolva ✓';
    } catch {
      // ⚠️ A vágólap nem mindenütt érhető el — akkor a szöveg kijelölve marad, kézzel másolható.
      const kod = gomb.parentElement?.querySelector('code');
      if (kod) window.getSelection()?.selectAllChildren(kod);
      gomb.textContent = 'Jelöld ki és másold';
    }
    setTimeout(() => { gomb.textContent = 'Másolás'; }, 2500);
  });
}

/** Az őrjárat állása egy szövegben (a csatlakozás eredményéhez és a tér kártyájához). @returns {string} HTML */
export function orjaratHtml(o) {
  if (!o) return '';
  if (o.fut && o.csaladbol) {
    return '<p class="koino-orjarat koino-orjarat--fut">↻ A családja őrjárata fut (' + html(o.port) + '-es port) — a következő körében '
      + 'felveszi, és onnan magától cserél.</p>';
  }
  if (o.fut) return '<p class="koino-orjarat koino-orjarat--fut">↻ Az őrjárata fut (' + html(o.port) + '-es port) — magától cserél.</p>';
  return '<p class="koino-orjarat koino-orjarat--nem">⚠ Ennek a koinónak nem fut őrjárata ezen a készüléken — magától nem cserél. '
    + 'Egy külön ablakban (terminálban) indítsd el:</p>' + (o.parancs ? parancsHtml(o.parancs) : '');
}

// ===================================
// 🔗 CSATLAKOZÁS EGY KOINÓHOZ
// ===================================

/**
 * A csatlakozás ablaka.
 * @param {{koino?: string, nev?: string|null, zart?: boolean|null, utana?: Function|null}} [b] - a `koino` előre
 *   kitöltve (a tér kártyájáról ismert gyermek); az `utana` a sikeres csatlakozás után (a tér frissítése)
 */
export async function csatlakozasMegnyitasa({ koino = '', nev = null, zart = null, utana = null } = {}) {
  console.log('csatlakozasMegnyitasa - KEZDÉS', { koino: rovid(koino) });
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-csatlakozas';
  const modal = new Modal(MODAL_KONTENER, {
    cim: '🔗 Csatlakozás egy koinóhoz',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => modal.bezaras() }]
  });

  let elonezet = { sajatBecenev: 'sajat', szabad: false };
  let siker = null;
  let folyamatban = false;
  const kartyarol = LENYOMAT.test(koino);

  const rajzol = () => {
    if (siker) {
      const kovetkezo = [];
      if (siker.ujraindit) {
        kovetkezo.push('A felület és az őrjárat a „' + html(siker.becenev) + '” becenévvel indul: <strong>indítsd újra mindkettőt</strong>, '
          + 'és ezután ez lesz a saját koinód ezen a készüléken (a böngészés, a felderítés és a költözés csak a sajátban dolgozik).');
      }
      if (!siker.ismert) {
        kovetkezo.push('A születése még nincs a készüléken: egy társ hozza, akinél megvan — vedd fel a meghívód címét a '
          + '<button type="button" class="koino-csatlakozas__link" data-muvelet="tarsak">🤝 Társak…</button> ablakban.');
      }
      if (siker.kartyarol && siker.zart) kovetkezo.push(ZART_GYERMEK);
      if (!siker.kartyarol) {
        // a kártyáról ismert gyermekben a tagság a szülőből öröklődik (D118/3) — ott nincs mit tenni
        kovetkezo.push('Ha még nem vagy tag: a belépés ma még parancs (<code>node koino/koino.js belep</code>) — a kiírt horgonyodat '
          + 'add meg annak, aki meghív.');
      }
      tartalom.innerHTML = '<p class="koino-csatlakozas__siker">✅ Csatlakoztál: <strong>' + html(siker.nev ?? rovid(siker.koino))
        + '</strong>' + (siker.becenev ? ' (becenév ezen a készüléken: ' + html(siker.becenev) + ')' : '') + '.</p>'
        + (siker.kartyarol ? '<p class="koino-csatlakozas__leiras">A születése a koino-verzió kártyájáról megvan.</p>' : '')
        + orjaratHtml(siker.orjarat)
        + '<ul class="koino-csatlakozas__lepesek">' + kovetkezo.map((s) => '<li>' + s + '</li>').join('') + '</ul>';
      return;
    }
    tartalom.innerHTML = '<p class="koino-csatlakozas__leiras">Egy koinó neve a születésének lenyomata (43 jel) — másold be annak '
      + 'a lapjáról vagy üzenetéből, aki meghív. A csatlakozás nem ír eseményt: a koinó ettől ismert ezen a készüléken, a '
      + 'születését és a többit a csere hozza.</p>'
      + '<label class="koino-csatlakozas__mezo">A koinó neve'
      + '<input type="text" name="koino" spellcheck="false" autocomplete="off" maxlength="60" value="' + html(koino) + '"'
      + (kartyarol ? ' readonly' : '') + ' placeholder="43 jel, pl. 2MYbgWU2cxmW1eFrZ1yRSEJOLv3ng7GRG0GGObQAHt4"></label>'
      + (kartyarol && nev ? '<p class="koino-csatlakozas__leiras">A koino-verzió kártyájáról: <strong>' + html(nev) + '</strong> — a '
        + 'családod őrjárata felveszi (nem költözöl vele: a súlyod a szülőben marad; költözni a fő menü „🧳 Költözés…” pontjával).'
        + (zart ? ' ' + ZART_GYERMEK : '') + '</p>' : '')
      + '<label class="koino-csatlakozas__mezo">Becenév ezen a készüléken (nem kötelező)'
      + '<input type="text" name="becenev" spellcheck="false" autocomplete="off" maxlength="32" value="'
      + html(!kartyarol && elonezet.szabad ? elonezet.sajatBecenev : '') + '" placeholder="pl. kert"></label>'
      + '<p class="koino-csatlakozas__leiras">A becenévvel indítható a koinó őrjárata (a 43 jeles név helyett).'
      + (elonezet.szabad ? ' A „' + html(elonezet.sajatBecenev) + '” a felület saját beceneve, és még szabad: ha ezt adod, az '
        + 'újraindított felület és a sima <code>node koino/koino.js orjarat</code> is ezt a koinót nyitja.' : '') + '</p>'
      + '<div class="koino-csatlakozas__gombok"><button type="button" class="koino-csatlakozas__gomb koino-csatlakozas__gomb--fo" '
      + 'data-muvelet="csatlakozom"' + (folyamatban ? ' disabled' : '') + '>' + (folyamatban ? 'Csatlakozom…' : 'Csatlakozom') + '</button></div>';
  };

  masoloGombok(tartalom);
  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (!gomb || gomb.disabled) return;
    if (gomb.dataset.muvelet === 'tarsak') {
      modal.bezaras();
      await tarsakMegnyitasa({ utana });
      return;
    }
    if (gomb.dataset.muvelet !== 'csatlakozom') return;
    const k = tartalom.querySelector('input[name="koino"]')?.value.trim() ?? '';
    const becenev = tartalom.querySelector('input[name="becenev"]')?.value.trim() || null;
    if (!LENYOMAT.test(k)) {
      modal.hibaBeallitasa('A koinó neve pontosan 43 jel (betűk, számok, - és _) — ellenőrizd a beillesztést.');
      return;
    }
    folyamatban = true;
    rajzol();
    try {
      siker = await apiPost('csatlakozas', { koino: k, becenev });
    } catch (hiba) {
      folyamatban = false;
      rajzol();
      modal.hibaBeallitasa(hiba.message ?? 'A csatlakozás nem sikerült.');
      return;
    }
    folyamatban = false;
    rajzol();
    await utana?.();
  });

  await modal.init();
  rajzol();
  modal.megnyitas();
  try { elonezet = await apiGet('csatlakozas'); } catch { /* az alap marad */ }
  if (!siker && !folyamatban) rajzol();
  console.log('csatlakozasMegnyitasa - VÉGE');
  return modal;
}

// ===================================
// 🤝 A TÁRSAK
// ===================================

/**
 * A társak ablaka: az induló címek (a sikerük helyi megfigyelésével), a felvétel és a levétel.
 * @param {{utana?: Function|null}} [b]
 */
export async function tarsakMegnyitasa({ utana = null } = {}) {
  console.log('tarsakMegnyitasa - KEZDÉS');
  const tartalom = document.createElement('div');
  tartalom.className = 'koino-csatlakozas';
  const modal = new Modal(MODAL_KONTENER, {
    cim: '🤝 Társak — kikkel cserél ez a készülék',
    meret: 'alap',
    tartalom,
    gombok: [{ felirat: 'Bezárás', tipus: 'masodlagos', akcio: () => modal.bezaras() }]
  });

  let adat = { tarsak: [], alapPort: 7373 };
  let uzenet = null;

  const tarsSora = (t) => '<li class="koino-tars"><span class="koino-tars__cim">' + html(t.hoszt) + ' ' + html(t.port)
    + (t.nev ? ' <em>„' + html(t.nev) + '”</em>' : '') + '</span><span class="koino-tars__allas">'
    + (t.utoljara ? 'utoljára felelt: ' + html(new Date(t.utoljara).toLocaleString('hu-HU')) : 'még nem felelt')
    + (t.sikertelen ? ' · ' + html(t.sikertelen) + '× nem felelt' : '') + '</span>'
    + '<button type="button" class="koino-csatlakozas__gomb" data-muvelet="levesz" data-hoszt="' + html(t.hoszt) + '" data-port="'
    + html(t.port) + '">Levétel</button></li>';

  const rajzol = () => {
    tartalom.innerHTML = '<p class="koino-csatlakozas__leiras">Az induló címek: ezeket hívja az őrjárat minden körében (minden '
      + 'koinódnak). A rendszeres társaidat (a kötéseket) a csere magától jegyzi — ide csak az első találkozáshoz kell cím '
      + '(pl. a meghívód gépe a helyi hálón vagy a nyilvános címén).</p>'
      + (uzenet ? '<p class="koino-csatlakozas__uzenet">' + uzenet + '</p>' : '')
      + (adat.tarsak.length ? '<ul class="koino-tarsak">' + adat.tarsak.map(tarsSora).join('') + '</ul>'
        : '<p class="koino-megjegyzes">Még nincs induló cím.</p>')
      + '<div class="koino-csatlakozas__sor">'
      + '<label class="koino-csatlakozas__mezo koino-csatlakozas__mezo--szeles">Cím<input type="text" name="hoszt" spellcheck="false" '
      + 'autocomplete="off" maxlength="255" placeholder="pl. 192.168.1.124"></label>'
      + '<label class="koino-csatlakozas__mezo koino-csatlakozas__mezo--port">Port<input type="number" name="port" min="1" max="65535" '
      + 'value="' + html(adat.alapPort) + '"></label>'
      + '<label class="koino-csatlakozas__mezo">Név (nem kötelező)<input type="text" name="nev" maxlength="64" placeholder="pl. Anna '
      + 'telefonja"></label></div>'
      + '<div class="koino-csatlakozas__gombok"><button type="button" class="koino-csatlakozas__gomb koino-csatlakozas__gomb--fo" '
      + 'data-muvelet="felvesz">Felveszem</button></div>';
  };

  const betolt = async () => { adat = await apiGet('tarsak'); rajzol(); };

  tartalom.addEventListener('click', async (e) => {
    const gomb = e.target.closest('button[data-muvelet]');
    if (!gomb || gomb.disabled) return;
    try {
      if (gomb.dataset.muvelet === 'levesz') {
        await apiPost('tarsak/torol', { hoszt: gomb.dataset.hoszt, port: Number(gomb.dataset.port) });
        uzenet = 'Levéve: ' + html(gomb.dataset.hoszt) + ' ' + html(gomb.dataset.port) + '.';
      } else if (gomb.dataset.muvelet === 'felvesz') {
        const hoszt = tartalom.querySelector('input[name="hoszt"]')?.value.trim() ?? '';
        const port = tartalom.querySelector('input[name="port"]')?.value.trim() ?? '';
        const nev = tartalom.querySelector('input[name="nev"]')?.value.trim() || null;
        const v = await apiPost('tarsak', { hoszt, port: port === '' ? null : Number(port), nev });
        uzenet = 'Felvéve: ' + html(v.felveve.hoszt) + ' ' + html(v.felveve.port) + ' — a futó őrjárat a következő körében már hívja.'
          + (v.sajat ? ' <strong>⚠ Ez a saját címed</strong>: a készülék így önmagát hívogatja (ha két példány fut egy gépen külön '
            + 'adat-mappával, ez rendben van — akkor a port különbözteti meg őket).' : '');
      } else return;
    } catch (hiba) {
      modal.hibaBeallitasa(hiba.message ?? 'Nem sikerült.');
      return;
    }
    await betolt().catch(() => rajzol());
    await utana?.();
  });

  await modal.init();
  modal.megnyitas();
  try {
    await betolt();
  } catch (hiba) {
    tartalom.innerHTML = '<p class="koino-megjegyzes">A társak most nem kérdezhetők le: ' + html(hiba.message) + '</p>';
  }
  console.log('tarsakMegnyitasa - VÉGE', { tarsak: adat.tarsak.length });
  return modal;
}
