// koino/js/fo.js

// Felelősség: a program indulása és a felület összekötése.
//
// A MŰKÖDÉS EGY MONDATBAN: minden művelet egy aláírt eseményt tesz a saját láncod végére,
// majd az EGÉSZ állapotot újraszámoljuk az összes eseményből, és újrarajzoljuk a képet.
// Nincs „részleges frissítés", nincs gyorsítótár-egyeztetés — mert a számítás olcsó
// (mérve: 10 000 esemény ellenőrzése 0,58 mp), és így SOHA nem csúszhat el a kép attól,
// ami valójában igaz.
//
// Használja: index.html

import {
  kulcsparBiztositasa, kulcsparKimentese, kulcsparVisszatoltese,
  nyilvanosKulcsSzovegesen, rovidAzonosito
} from './kulcs/kulcsTar.js';
import { koinoEsemenyei, sajatLancEsemenyei } from './tar/esemenyTar.js';
import { allapotSzamitasa, szetosztottPontok } from './allapot/allapotSzamitas.js';
import { javaslatokSzamitasa, sajatSzavazat } from './allapot/javaslatSzamitas.js';
import {
  koinoLetrehozasa, tartalomLetrehozasa, tudatpontRendezese,
  javaslatLetrehozasa, szavazas, TUDATPONT_KERET
} from './muveletek.js';

// ===== ÁLLANDÓK =====

// A Szakasz 1-ben egyetlen koino van a készüléken. A D25 szerint később több is lehet —
// az adatbázis (és az esemény `koino` mezője) erre már felkészült.
const KOINO = 'sajat';

// Új tartalomnál ennyi tudatpontot rendelünk hozzá automatikusan. Enélkül az entitás
// nem is létezne: amire senki nem tesz pontot, azt a koino elfelejti (D14).
const KEZDO_PONT = 100;

const NAP = 86400 * 1000;

// ===== A PROGRAM ÁLLAPOTA =====

let kulcspar = null;
let szerzo = null;          // a saját nyilvános kulcs szöveges alakja
let idoEltolas = 0;         // az idő-csúszka: hány nappal nézünk előre

// ===================================
// INDULÁS
// ===================================

async function indulas() {
  console.log('fo.indulas - KEZDÉS');
  try {
    const eredmeny = await kulcsparBiztositasa();
    kulcspar = eredmeny.kulcspar;
    szerzo = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

    azonossagKiirasa();
    document.getElementById('mentesDoboz').hidden = false;
    await tarolasAllapota();
    await frissites();
  } catch (hiba) {
    console.error('fo.indulas - HIBA', hiba);
    uzenet('Nem sikerült elindulni: ' + hiba.message, true);
  }
  console.log('fo.indulas - VÉGE');
}

function azonossagKiirasa() {
  const rovid = document.getElementById('azonositoRovid');
  const teljes = document.getElementById('azonositoTeljes');
  rovid.textContent = rovidAzonosito(szerzo);
  teljes.textContent = szerzo;
  rovid.addEventListener('click', () => { teljes.hidden = !teljes.hidden; });
}

async function tarolasAllapota() {
  if (!navigator.storage?.persisted) return;
  const tartos = await navigator.storage.persisted();
  document.getElementById('tartosAllapot').textContent = tartos
    ? 'bekapcsolva — a böngésző nem törli magától'
    : 'NINCS bekapcsolva — a böngésző kiürítheti a tárat';
}

// ===================================
// ⭐ A TELJES ÚJRASZÁMOLÁS ÉS ÚJRARAJZOLÁS
// ===================================

async function frissites() {
  console.log('fo.frissites - KEZDÉS', { idoEltolas });

  const esemenyek = await koinoEsemenyei(KOINO);
  const sajatLanc = await sajatLancEsemenyei(szerzo);
  const most = Date.now() + idoEltolas * NAP;

  const allapot = allapotSzamitasa(esemenyek);

  // A döntéshozatal az ELÁGAZÁS-MENTESÍTETT eseményekkel dolgozik (nem a nyersekkel):
  // ha valaki két különböző szavazatot írt alá ugyanarról a pontról, az állapot-réteg
  // már eldöntötte determinisztikusan, melyik érvényes. Nyers eseményekkel a számlálás
  // a beérkezés sorrendjétől függne — vagyis két gép mást számolna.
  const javaslatok = javaslatokSzamitasa(allapot.szamitok, allapot, most);

  // ----- VAN-E MÁR KOINO? -----
  const vanKoino = allapot.koino.nev !== null;
  document.getElementById('koinoDoboz').hidden = vanKoino;
  document.getElementById('koinoElete').hidden = !vanKoino;
  if (!vanKoino) { console.log('fo.frissites - VÉGE (még nincs koino)'); return; }

  // ----- ÁLLAPOTSÁV -----
  document.getElementById('koinoNeve').textContent = allapot.koino.nev;
  document.getElementById('kiosztottPont').textContent = szetosztottPontok(allapot, szerzo);
  document.getElementById('keret').textContent = TUDATPONT_KERET;
  document.getElementById('esemenyDarab').textContent = sajatLanc.length;
  document.getElementById('idoCimke').textContent =
    idoEltolas === 0 ? 'most' : idoEltolas + ' nap múlva';

  ellentmondasokKiirasa(allapot);
  tartalmakRajzolasa(allapot);
  szuloValasztoFeltoltese(allapot);
  javaslatokRajzolasa(javaslatok, allapot, allapot.szamitok);
  egyezmenyekRajzolasa(javaslatok, allapot);

  console.log('fo.frissites - VÉGE', {
    entitas: allapot.entitasok.size,
    javaslat: javaslatok.size
  });
}

// ===================================
// ELLENTMONDÁSOK — A KOINO BEJELENT, NEM BÜNTET (D19)
// ===================================

/**
 * Kiírja, ha valaki két eseményt írt alá ugyanarról a pontról (elágazás), vagy
 * visszafelé lépett a saját láncának idejében (visszadátumozás).
 *
 * Egyik esetben sem dobunk el semmit: az esemény a tárban marad, az állapot pedig
 * determinisztikus. Csak LÁTHATÓVÁ tesszük — a döntés a közösségé.
 *
 * @param {Object} allapot
 */
function ellentmondasokKiirasa(allapot) {
  const sav = document.getElementById('ellentmondasSav');
  const darabok = [];

  if (allapot.ellentmondasok.length) {
    darabok.push('⚠️ ' + allapot.ellentmondasok.length
      + ' elágazás: valaki két különböző eseményt írt alá ugyanarról a pontról.');
  }
  if (allapot.idoEllentmondasok.length) {
    darabok.push('⚠️ ' + allapot.idoEllentmondasok.length
      + ' visszafelé lépő idő: egy későbbi esemény korábbi időt visel, mint az előtte lévő.');
  }
  if (allapot.kivetelek.length) {
    // Az okokat összevonjuk, hogy tíz azonos eset ne írjon tele egy sávot
    const okok = [...new Set(allapot.kivetelek.map((k) => k.ok))];
    darabok.push('⚠️ ' + allapot.kivetelek.length
      + ' esemény nem számít bele (' + okok.join('; ') + ').');
  }

  sav.textContent = darabok.join(' ');
  sav.hidden = darabok.length === 0;
}

// ===================================
// TARTALMAK
// ===================================

function tartalmakRajzolasa(allapot) {
  const lista = document.getElementById('tartalomLista');
  lista.textContent = '';

  if (allapot.entitasok.size === 0) {
    lista.append(uresUzenet('Még nincs tartalom. Hozz létre egyet lent.'));
    return;
  }

  for (const entitas of allapot.entitasok.values()) {
    const elem = document.createElement('article');
    elem.className = 'kartya';

    // ----- FEJLÉC: cím + méret -----
    const fejlec = document.createElement('div');
    fejlec.className = 'kartya__fejlec';
    fejlec.append(
      cimke('h3', 'kartya__cim', entitas.cim),
      cimke('span', 'kartya__meret', entitas.meret + ' bájt'
        + (entitas.agMeret !== entitas.meret ? ' (ág: ' + entitas.agMeret + ')' : ''))
    );
    elem.append(fejlec);

    if (entitas.szoveg) elem.append(cimke('p', 'kartya__szoveg', entitas.szoveg));

    // ----- ADATOK -----
    const sajatPont = entitas.hozzajarulok.get(szerzo)?.pont ?? 0;
    const adatok = document.createElement('p');
    adatok.className = 'kartya__adatok';
    adatok.textContent =
      'összes tudatpont: ' + entitas.osszesPont +
      ' · a tiéd: ' + sajatPont +
      ' · hozzájárulók: ' + entitas.hozzajarulok.size +
      (entitas.kuszobok
        ? ' · küszöb: ' + entitas.kuszobok.elfogadasiKuszob + '%'
        : ' · küszöb: alapértelmezett');
    elem.append(adatok);

    // ----- MŰVELETEK -----
    const gombsor = document.createElement('div');
    gombsor.className = 'gombsor gombsor--kicsi';

    // Tudatpont állítása
    const pontMezo = document.createElement('input');
    pontMezo.type = 'number';
    pontMezo.className = 'mezo mezo--szuk';
    pontMezo.value = sajatPont;
    pontMezo.min = 0;
    pontMezo.step = 10;
    pontMezo.title = 'A tudatpontod ezen a tartalmon';

    const pontGomb = gomb('Tudatpont', async () => {
      const uj = parseInt(pontMezo.value, 10);
      const marKiosztott = szetosztottPontokMasholt(allapot, entitas.azonosito);
      await tudatpontRendezese(kornyezet(), entitas.azonosito, uj, 'aktiv', marKiosztott);
      uzenet(uj === 0
        ? 'Elvetted a tudatpontodat. Ha senki másnak nincs rajta, a tartalom eltűnik.'
        : 'Tudatpont beállítva: ' + uj);
      await frissites();
    });

    // Szerkesztési javaslat: a kártyán belül nyíló űrlap
    const urlap = javaslatUrlapElem(entitas);
    const javaslatGomb = gomb('Szerkesztési javaslat', () => {
      urlap.hidden = !urlap.hidden;
      if (!urlap.hidden) urlap.querySelector('input').focus();
    });

    gombsor.append(pontMezo, pontGomb, javaslatGomb);
    elem.append(gombsor, urlap);
    lista.append(elem);
  }
}

/** Mennyi pontom van MÁS entitásokon (a keret ellenőrzéséhez). */
function szetosztottPontokMasholt(allapot, kivetelAzonosito) {
  let osszeg = 0;
  for (const entitas of allapot.entitasok.values()) {
    if (entitas.azonosito === kivetelAzonosito) continue;
    osszeg += entitas.hozzajarulok.get(szerzo)?.pont ?? 0;
  }
  return osszeg;
}

function szuloValasztoFeltoltese(allapot) {
  const valaszto = document.getElementById('ujSzulo');
  const elozoErtek = valaszto.value;
  valaszto.textContent = '';

  const gyoker = document.createElement('option');
  gyoker.value = '';
  gyoker.textContent = '(nincs szülő — önálló tartalom)';
  valaszto.append(gyoker);

  for (const entitas of allapot.entitasok.values()) {
    const opcio = document.createElement('option');
    opcio.value = entitas.azonosito;
    opcio.textContent = 'a(z) „' + entitas.cim + '" alá';
    valaszto.append(opcio);
  }
  valaszto.value = elozoErtek;
}

// ===================================
// JAVASLATOK
// ===================================

/**
 * A kártyán belül nyíló javaslat-űrlap.
 *
 * A Szakasz 1-ben egyetlen művelet van: a CÍM módosítása. Ez elég ahhoz, hogy a teljes
 * kör (javaslat → szavazat → egyezmény) végigjárható legyen; a többi művelet
 * (áthelyezés, törlés, egyesítés) ugyanezen a gépezeten fog futni.
 *
 * @param {Object} entitas
 * @returns {HTMLElement} a rejtett űrlap
 */
function javaslatUrlapElem(entitas) {
  const urlap = document.createElement('div');
  urlap.className = 'urlap urlap--fuggoleges javaslatUrlap';
  urlap.hidden = true;

  const cimMezo = document.createElement('input');
  cimMezo.type = 'text';
  cimMezo.className = 'mezo';
  cimMezo.placeholder = 'Az új cím';
  cimMezo.value = entitas.cim;
  cimMezo.maxLength = 120;

  const indoklasMezo = document.createElement('input');
  indoklasMezo.type = 'text';
  indoklasMezo.className = 'mezo';
  indoklasMezo.placeholder = 'Indoklás (nem kötelező)';
  indoklasMezo.maxLength = 200;

  const kuldes = gomb('Javaslat beadása', async () => {
    const ujCim = cimMezo.value.trim();
    if (!ujCim) return uzenet('Adj meg egy új címet.', true);
    if (ujCim === entitas.cim) return uzenet('Ez ugyanaz a cím, mint a mostani.', true);

    await javaslatLetrehozasa(kornyezet(), {
      fajta: 'szerkesztesi',
      erintett: entitas.azonosito,
      muvelet: 'Modositas',
      valtozas: { cim: ujCim },
      indoklas: indoklasMezo.value.trim() || null
    });
    uzenet('Szerkesztési javaslat beadva. Most szavazhatsz rá.');
    await frissites();
  });
  kuldes.classList.add('gomb--elsodleges');

  urlap.append(cimMezo, indoklasMezo, kuldes);
  return urlap;
}

function javaslatokRajzolasa(javaslatok, allapot, esemenyek) {
  const lista = document.getElementById('javaslatLista');
  lista.textContent = '';

  const folyamatban = [...javaslatok.values()];
  if (folyamatban.length === 0) {
    lista.append(uresUzenet('Még nincs javaslat. Egy tartalomnál indíthatsz egyet.'));
    return;
  }

  for (const j of folyamatban) {
    const erintett = allapot.entitasok.get(j.erintett);
    const elem = document.createElement('article');
    elem.className = 'kartya kartya--' + j.statusz;

    // ----- FEJLÉC -----
    const fejlec = document.createElement('div');
    fejlec.className = 'kartya__fejlec';
    fejlec.append(
      cimke('h3', 'kartya__cim',
        j.muvelet + ': „' + (j.valtozas?.cim ?? '—') + '"'),
      cimke('span', 'kartya__allapot allapot--' + j.statusz, statuszSzoveg(j.statusz))
    );
    elem.append(fejlec);

    elem.append(cimke('p', 'kartya__adatok',
      'érintett: ' + (erintett ? '„' + erintett.cim + '"' : 'ismeretlen')
      + (j.indoklas ? ' · indoklás: ' + j.indoklas : '')));

    // ----- A SZAVAZÁS ÁLLÁSA -----
    const allas = document.createElement('p');
    allas.className = 'kartya__adatok';
    allas.textContent =
      '👍 ' + j.tamogatok + ' · 👎 ' + j.ellenzok + ' · 🤷 ' + j.tartozkodok +
      ' — szavazott ' + j.szavazok + ' / ' + j.nevezo +
      ' · támogatottság ' + szazalek(j.tamogatottsagEzrelek) +
      ' · részvétel ' + szazalek(j.reszveteliEzrelek) +
      ' · bizonyosság ' + szazalek(j.bizonyossagiMutato);
    elem.append(allas);

    // ----- A DÖNTÉS IDEJE -----
    const ido = document.createElement('p');
    ido.className = 'kartya__adatok kartya__adatok--halvany';
    ido.textContent = j.statusz === 'folyamatban'
      ? 'a döntés ' + new Date(j.lezarasIdeje).toLocaleString('hu-HU') + '-kor zárul'
        + ' (döntési idő: ' + Math.round(j.dontesiIdo / 3600) + ' óra)'
      : 'lezárult ' + new Date(j.lezarasIdeje).toLocaleString('hu-HU') + '-kor';
    elem.append(ido);

    // ----- A LEZÁRÁS UTÁN ÉRKEZETT SZAVAZATOK -----
    // Nem számítanak bele (a lezárás időrendben történik), de nem is titkoljuk el:
    // aki lemaradt, lássa, hogy leadta — csak későn.
    if (j.kesoiSzavazatok > 0) {
      elem.append(cimke('p', 'megjegyzes',
        j.kesoiSzavazatok + ' szavazat a lezárás UTÁN érkezett — nem számít bele, '
        + 'mert különben a határidő utáni szavazat mozdítaná el a határidőt.'));
    }

    // ----- SZAVAZÁS -----
    if (j.statusz === 'folyamatban') {
      const enyem = sajatSzavazat(esemenyek, j.azonosito, szerzo);
      const gombsor = document.createElement('div');
      gombsor.className = 'gombsor gombsor--kicsi';

      for (const [ertek, felirat] of [
        ['Tamogat', 'Támogatom'],
        ['Ellenez', 'Ellenzem'],
        ['Tartozkodik', 'Tartózkodom']
      ]) {
        const g = gomb(felirat, async () => {
          await szavazas(kornyezet(), j.azonosito, ertek);
          uzenet('Szavazat leadva: ' + felirat.toLowerCase()
            + (enyem ? ' (a korábbit felülírta)' : ''));
          await frissites();
        });
        if (enyem === ertek) g.classList.add('gomb--kivalasztott');
        gombsor.append(g);
      }
      elem.append(gombsor);

      if (enyem) {
        elem.append(cimke('p', 'megjegyzes',
          'A szavazatod: ' + enyem + ' — bármikor megváltoztathatod, az utolsó számít.'));
      }
    }

    lista.append(elem);
  }
}

// ===================================
// EGYEZMÉNYEK
// ===================================

function egyezmenyekRajzolasa(javaslatok, allapot) {
  const lista = document.getElementById('egyezmenyLista');
  lista.textContent = '';

  const egyezmenyek = [...javaslatok.values()].filter((j) => j.egyezmeny);
  if (egyezmenyek.length === 0) {
    lista.append(uresUzenet('Még nincs egyezmény. Akkor születik, ha egy javaslatot elfogadnak.'));
    return;
  }

  for (const j of egyezmenyek) {
    const e = j.egyezmeny;
    const erintett = allapot.entitasok.get(e.erintett);
    const elem = document.createElement('article');
    elem.className = 'kartya kartya--egyezmeny';

    elem.append(cimke('h3', 'kartya__cim',
      '📜 ' + e.muvelet + ': „' + (e.valtozas?.cim ?? '—') + '"'));

    elem.append(cimke('p', 'kartya__adatok',
      'érintett: ' + (erintett ? '„' + erintett.cim + '"' : 'ismeretlen')
      + ' · fajta: ' + (e.fajta === 'altalanos' ? 'általános' : 'szerkesztési')));

    const p = e.pillanatkep;
    elem.append(cimke('p', 'kartya__adatok',
      'megszületett: ' + new Date(e.megszuletett).toLocaleString('hu-HU')
      + ' · ' + p.tamogatok + ' támogató / ' + p.szavazok + ' szavazó'
      + ' (' + szazalek(p.tamogatottsagEzrelek) + ')'
      + ' · részvétel ' + szazalek(p.reszveteliEzrelek)));

    elem.append(cimke('p', 'megjegyzes',
      'Ezek a számok a születés PILLANATKÉPE — akkor is megmaradnak, ha a szavazatok '
      + 'később elfelejtődnek (D8: a tény örök, a hatály él).'));

    lista.append(elem);
  }
}

// ===================================
// SEGÉDEK
// ===================================

function kornyezet() {
  return { koino: KOINO, kulcspar, szerzo };
}

function cimke(tag, osztaly, szoveg) {
  const elem = document.createElement(tag);
  elem.className = osztaly;
  elem.textContent = szoveg;
  return elem;
}

function gomb(felirat, kezelo) {
  const g = document.createElement('button');
  g.type = 'button';
  g.className = 'gomb';
  g.textContent = felirat;
  g.addEventListener('click', async () => {
    try { await kezelo(); }
    catch (hiba) { console.error(hiba); uzenet('Nem sikerült: ' + hiba.message, true); }
  });
  return g;
}

function uresUzenet(szoveg) {
  return cimke('p', 'megjegyzes', szoveg);
}

function statuszSzoveg(statusz) {
  return { folyamatban: 'folyamatban', elfogadva: 'ELFOGADVA', elvetve: 'elvetve' }[statusz];
}

/** Ezrelék → olvasható százalék (a megjelenítés kerekíthet: nem dönt semmiről). */
function szazalek(ezrelek) {
  return (ezrelek / 10).toFixed(1).replace('.0', '') + '%';
}

let uzenetIdozito = null;
function uzenet(szoveg, hibaE = false) {
  const sav = document.getElementById('uzenetSav');
  sav.textContent = szoveg;
  sav.className = 'uzenetSav' + (hibaE ? ' uzenetSav--hiba' : '');
  sav.hidden = false;
  clearTimeout(uzenetIdozito);
  uzenetIdozito = setTimeout(() => { sav.hidden = true; }, 6000);
}

// ===================================
// ESEMÉNYKEZELŐK
// ===================================

document.getElementById('koinoGomb').addEventListener('click', async () => {
  const nev = document.getElementById('koinoNev').value.trim();
  if (!nev) return uzenet('Adj nevet a koinódnak.', true);
  try {
    await koinoLetrehozasa(kornyezet(), nev);
    uzenet('A koino létrejött: ' + nev);
    await frissites();
  } catch (hiba) { uzenet('Nem sikerült: ' + hiba.message, true); }
});

document.getElementById('ujTartalomGomb').addEventListener('click', async () => {
  const cim = document.getElementById('ujCim').value.trim();
  if (!cim) return uzenet('A címet töltsd ki.', true);
  const szoveg = document.getElementById('ujSzoveg').value.trim();
  const szulo = document.getElementById('ujSzulo').value || null;

  try {
    // 1. a tartalom, 2. rögtön a tudatpont — enélkül nem is létezne (D14)
    const esemeny = await tartalomLetrehozasa(kornyezet(), { cim, szoveg, szulo });

    const esemenyek = await koinoEsemenyei(KOINO);
    const allapot = allapotSzamitasa(esemenyek);
    await tudatpontRendezese(kornyezet(), esemeny.azonosito, KEZDO_PONT, 'aktiv',
      szetosztottPontok(allapot, szerzo));

    document.getElementById('ujCim').value = '';
    document.getElementById('ujSzoveg').value = '';
    uzenet('Tartalom létrehozva, és kapott ' + KEZDO_PONT + ' tudatpontot tőled.');
    await frissites();
  } catch (hiba) { uzenet('Nem sikerült: ' + hiba.message, true); }
});

document.getElementById('idoCsuszka').addEventListener('input', async (esemeny) => {
  idoEltolas = parseInt(esemeny.target.value, 10);
  await frissites();
});

document.getElementById('mentesGomb').addEventListener('click', async () => {
  const tartalom = await kulcsparKimentese(kulcspar);
  const fajlNev = 'koino-kulcs-' + szerzo.slice(0, 8) + '.json';
  const blob = new Blob([tartalom], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const hivatkozas = document.createElement('a');
  hivatkozas.href = url;
  hivatkozas.download = fajlNev;
  hivatkozas.click();
  URL.revokeObjectURL(url);
  uzenet('Elmentve: ' + fajlNev + ' — tedd biztos helyre.');
});

document.getElementById('visszatoltesGomb').addEventListener('click', () => {
  document.getElementById('visszatoltesMezo').click();
});

document.getElementById('visszatoltesMezo').addEventListener('change', async (esemeny) => {
  const fajl = esemeny.target.files[0];
  if (!fajl) return;
  try {
    kulcspar = await kulcsparVisszatoltese(await fajl.text());
    szerzo = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);
    azonossagKiirasa();
    uzenet('A kulcs visszatöltve — mostantól ez az azonosságod.');
    await frissites();
  } catch (hiba) { uzenet('Nem sikerült: ' + hiba.message, true); }
});

// ===== INDÍTÁS =====
indulas();
