// koino/js/fo.js

// Felelősség: a program indulása — a kulcs biztosítása és a felület összekötése.
// Jelenlegi állapot: Szakasz 1, 1. lépés (kulcs-réteg). Itt még nincs esemény, nincs
// aláírás és nincs tartalom — csak az azonosság megszületése és megőrzése.
//
// Használja: index.html

import {
  kulcsparBiztositasa,
  kulcsparKimentese,
  kulcsparVisszatoltese,
  nyilvanosKulcsSzovegesen,
  rovidAzonosito
} from './kulcs/kulcsTar.js';

// A program futás közbeni állapota (egyelőre csak a kulcspár)
let kulcspar = null;

// ===================================
// INDULÁS
// ===================================

async function indulas() {
  console.log('fo.indulas - KEZDÉS');

  try {
    // ----- A KULCS BIZTOSÍTÁSA -----
    // Első indításkor létrejön, később betöltődik. Nincs regisztráció és nincs
    // bejelentkezés: a kulcs megléte MAGA az azonosság (D15).
    const eredmeny = await kulcsparBiztositasa();
    kulcspar = eredmeny.kulcspar;

    await azonossagMegjelenitese(eredmeny.ujE);
  } catch (hiba) {
    console.error('fo.indulas - HIBA', hiba);
    const betoltes = document.getElementById('azonossagBetoltes');
    betoltes.textContent = 'Nem sikerült létrehozni az azonosságot: ' + hiba.message;
    betoltes.classList.add('hibaSzoveg');
  }

  console.log('fo.indulas - VÉGE');
}

// ===================================
// AZ AZONOSSÁG MEGJELENÍTÉSE
// ===================================

/**
 * Kiírja a nyilvános kulcsot és a tárolás állapotát.
 * @param {boolean} ujE - most készült-e a kulcs (ilyenkor előtérbe hozzuk a mentést)
 */
async function azonossagMegjelenitese(ujE) {
  console.log('fo.azonossagMegjelenitese - KEZDÉS', { ujE });

  const azonosito = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

  document.getElementById('azonossagBetoltes').hidden = true;
  document.getElementById('azonossagAdatok').hidden = false;

  // ----- A KULCS RÖVID ÉS TELJES ALAKJA -----
  // Az emberi szem a rövid alakot ismeri fel; a teljes egy kattintással kinyílik.
  const rovidElem = document.getElementById('azonositoRovid');
  const teljesElem = document.getElementById('azonositoTeljes');
  rovidElem.textContent = rovidAzonosito(azonosito);
  teljesElem.textContent = azonosito;
  rovidElem.addEventListener('click', () => {
    teljesElem.hidden = !teljesElem.hidden;
  });

  // ----- A TÁROLÁS ÁLLAPOTA -----
  // Őszintén kiírjuk, mert ettől függ, elveszhet-e a kulcs.
  if (navigator.storage) {
    const tartos = navigator.storage.persisted ? await navigator.storage.persisted() : false;
    document.getElementById('tartosAllapot').textContent = tartos
      ? 'bekapcsolva — a böngésző nem törli magától'
      : 'NINCS bekapcsolva — a böngésző kiürítheti a tárat';

    if (navigator.storage.estimate) {
      const b = await navigator.storage.estimate();
      const gb = (b.quota / 1024 / 1024 / 1024).toFixed(2);
      document.getElementById('helyAllapot').textContent = gb + ' GB áll rendelkezésre';
    }
  }

  // ----- A MENTÉS FELKÍNÁLÁSA -----
  // Új kulcsnál ez a legfontosabb teendő, ezért mindig látszik.
  document.getElementById('mentesDoboz').hidden = false;

  console.log('fo.azonossagMegjelenitese - VÉGE', { azonosito });
}

// ===================================
// KULCS MENTÉSE FÁJLBA
// ===================================

async function kulcsMentese() {
  console.log('fo.kulcsMentese - KEZDÉS');

  const tartalom = await kulcsparKimentese(kulcspar);
  const azonosito = await nyilvanosKulcsSzovegesen(kulcspar.publicKey);

  // A fájl nevébe az azonosító eleje kerül, hogy több kulcs is megkülönböztethető legyen
  const fajlNev = 'koino-kulcs-' + azonosito.slice(0, 8) + '.json';

  const blob = new Blob([tartalom], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const hivatkozas = document.createElement('a');
  hivatkozas.href = url;
  hivatkozas.download = fajlNev;
  hivatkozas.click();
  URL.revokeObjectURL(url);

  uzenet('Elmentve: ' + fajlNev + ' — tedd biztos helyre.');
  console.log('fo.kulcsMentese - VÉGE', { fajlNev });
}

// ===================================
// KULCS VISSZATÖLTÉSE
// ===================================

async function kulcsVisszatoltese(fajl) {
  console.log('fo.kulcsVisszatoltese - KEZDÉS', { fajlNev: fajl.name });

  try {
    const tartalom = await fajl.text();
    kulcspar = await kulcsparVisszatoltese(tartalom);

    // Újrarajzoljuk az azonosságot az új kulccsal
    document.getElementById('azonossagAdatok').hidden = true;
    document.getElementById('azonossagBetoltes').hidden = false;
    document.getElementById('azonossagBetoltes').textContent = 'Betöltés…';
    await azonossagMegjelenitese(false);

    uzenet('A kulcs visszatöltve — mostantól ez az azonosságod ezen a készüléken.');
  } catch (hiba) {
    console.error('fo.kulcsVisszatoltese - HIBA', hiba);
    uzenet('Nem sikerült: ' + hiba.message, true);
  }

  console.log('fo.kulcsVisszatoltese - VÉGE');
}

// ===================================
// SEGÉD: ÜZENET A FELÜLETEN
// ===================================

function uzenet(szoveg, hibaE = false) {
  const elem = document.getElementById('mentesUzenet');
  elem.textContent = szoveg;
  elem.hidden = false;
  elem.classList.toggle('hibaSzoveg', hibaE);
}

// ===================================
// ESEMÉNYKEZELŐK BEKÖTÉSE
// ===================================

document.getElementById('mentesGomb').addEventListener('click', kulcsMentese);

document.getElementById('visszatoltesGomb').addEventListener('click', () => {
  document.getElementById('visszatoltesMezo').click();
});

document.getElementById('visszatoltesMezo').addEventListener('change', (esemeny) => {
  const fajl = esemeny.target.files[0];
  if (fajl) kulcsVisszatoltese(fajl);
});

// ===== A PROGRAM INDÍTÁSA =====
indulas();
