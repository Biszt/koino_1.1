// koino/js/esemeny/koinoSzabalyok.js

// Felelősség: ⭐⭐ D118/2 (a költözés ①b, 2026-10-24) — A KOINÓ SZABÁLYAI A SZÜLETÉSÉBEN, nem a programban.
//
// Az állapotot befolyásoló számok (a tudatpont-keret, a kategória-korlát, a tanúsítás-szám, a felhatalmazás
// alapértéke, a küszöbök alapértékei) a koinó születésének (`KoinoLetrehozas`) `szabalyok` mezőjébe kerülnek. Ettől:
//   · egy szabály-változás nem programváltozás, hanem egy új koinó születése ugyanazzal a programmal (D25 1. mód,
//     D13/b paraméter-pluralizmus);
//   · a szülő múltját (a költözés) ugyanaz a kód számolja, a szülő szabályaival;
//   · a 15. mérés néma kettéhasadása (ugyanaz a koinó-név, más állandó a két gépen) szerkezetileg megszűnik — az
//     állandó a koinóhoz kötött, és a koinó neve a születés lenyomata (D118/2, `esemeny.js`).
//
// ⭐ A program az új születésbe MINDEN szabályt kiír (`teljesSzabalyok`) — az új koinó szabályai így teljesen a születésben
// állnak. ⚠️ A mező elhagyható: aminek nincs `szabalyok` mezője (a régi születések), vagy csak egy része van, az a hiányzókat
// a mai értékekkel számolja — ugyanazt, mint eddig (⛔ ezért a mai értékek soha nem változnak — lent). A hiányzó születésnél (még nem érkezett meg) is a mai értékek: a keret felső határa a mai 10 000, tehát a
// kapu a születés nélkül a legengedékenyebb — semmi érvényeset nem dob el (a szabály-réteg később a születés szerint ítél).
//
// ⛔ Ami NEM paraméter (KZ1): a modell része (a tagsághoz kötött események, a műveletek, a döntés képlete), a méret-korlát
// (a tagsági lánc mélysége — D106), és a készülék ellenőrzési mélysége. ⛔ A meghívó-szám (hány tag hívjon meg egy új
// embert) sem: a modell része, rögzítve 1 (Csaba, 2026-10-24: „maradjon 1 egyelőre” — `tagsag.js` egy meghívással és a
// legrövidebb lánccal számol; a 11–12. mérés szerint a nagyobb szám árcédula, nem védelem).
//
// Hálózatot és más modult nem importál — a kapu (`esemeny.js` `alakiHiba`) és a számítás egyaránt ide nyúl.
//
// Használják: `esemeny.js` (a mező alakja), `allapot/szabalyok.js`, `allapot/javaslatSzamitas.js`, `allapot/identitas.js`,
// `allapot/lezarasiOsszegzes.js`, `allapot/vallalas.js`, `allapot/lancGyoker.js`, `allapot/ellentmondas.js`,
// `muveletek.js`, `koino.js`.

// ===================================
// A MAI ÉRTÉKEK — egy helyen
// ===================================

/**
 * A koinó szabályai, ha a születése mást nem mond (a régi koinók és a hiányzó születés).
 *
 * ⛔⛔ EZEK A SZÁMOK SOHA NEM VÁLTOZNAK. A program az új születésbe MINDEN szabályt kiír (`teljesSzabalyok`), tehát egy új
 * koinó nem ezekre támaszkodik — de a régi alakú (mező nélküli) születés igen, és ha egy későbbi program itt mást mondana,
 * ugyanaz a régi koinó két programon két állapotot számolna (a 15. mérés néma kettéhasadása — a megismételt mérés ezt
 * mutatja). Egy új koinó más szabállyal: a születésébe írva, nem ide.
 */
export const ALAP_SZABALYOK = Object.freeze({
  tudatpontKeret: 10000,
  kategoriaKorlat: 3,
  tanusitasKell: 3,
  felhatalmazasKell: 5,
  alapKuszobok: Object.freeze({
    elfogadasiKuszob: 51,        // százalék: a támogatottság ekkora legyen a szavazók közt
    reszveteliKuszob: 0,         // százalék: ekkora részvétel kell (0 = nincs feltétel)
    minimumDontesiIdo: 1,        // másodperc — a reakció-ablak alsó határa (D4)
    maximumDontesiIdo: 604800    // másodperc: 7 nap
  })
});

// ===================================
// A HATÁROK — amit a kapu enged
// ===================================
//
// ⚠️ A tudatpont-keret felső határa a MAI érték: a D106 kivétele (a kanonikus alak „biztonságos egész” határa — egy ág
// össz-pontja ≤ e-ember × 10 000) erre a keretre van levezetve; nagyobb kerethez a kivételt újra kell számolni. És ettől
// a hiányzó születésnél a mai érték a legengedékenyebb.
const HATAROK = {
  tudatpontKeret: [1, 10000],
  kategoriaKorlat: [0, 16],
  tanusitasKell: [1, 16],
  felhatalmazasKell: [1, 1000]
};
const KUSZOB_HATAROK = {
  elfogadasiKuszob: [0, 100],
  reszveteliKuszob: [0, 100],
  minimumDontesiIdo: [0, 315360000],   // legfeljebb 10 év
  maximumDontesiIdo: [0, 315360000]
};

const egeszKozte = (x, [also, felso]) => Number.isSafeInteger(x) && x >= also && x <= felso;

/**
 * A születés `szabalyok` mezőjének alakja — a kapu kérdezi. Csak ismert kulcsok, egész számok a határokon belül; a
 * küszöböknél a legkisebb döntési idő nem nagyobb a legnagyobbnál.
 * @returns {string|null} a hiba szövege, vagy null
 */
export function szabalyokAlakiHibaja(sz) {
  if (sz === undefined) return null;
  if (!sz || typeof sz !== 'object' || Array.isArray(sz)) return 'a koinó szabályai egy objektum';
  for (const [k, v] of Object.entries(sz)) {
    if (k === 'alapKuszobok') {
      if (!v || typeof v !== 'object' || Array.isArray(v)) return 'a küszöbök alapértékei egy objektum';
      for (const [kk, vv] of Object.entries(v)) {
        if (!KUSZOB_HATAROK[kk]) return 'ismeretlen küszöb a koinó szabályaiban: ' + kk;
        if (!egeszKozte(vv, KUSZOB_HATAROK[kk])) return 'a(z) ' + kk + ' küszöb a határon kívül';
      }
      const k2 = { ...ALAP_SZABALYOK.alapKuszobok, ...v };
      if (k2.minimumDontesiIdo > k2.maximumDontesiIdo) return 'a legkisebb döntési idő nagyobb a legnagyobbnál';
      continue;
    }
    if (!HATAROK[k]) return 'ismeretlen szabály a koinó születésében: ' + k;
    if (!egeszKozte(v, HATAROK[k])) return 'a(z) ' + k + ' szabály a határon kívül (' + HATAROK[k].join('–') + ')';
  }
  return null;
}

/**
 * Az új születésbe írandó szabályok: MIND, a megadottak a mai értékek helyén. ⭐ Így az új koinó szabályai teljesen a
 * születésében állnak, és egy későbbi program alapértéke nem írhatja át őket (fent). +206 bájt, egyszer koinónként.
 * @param {Object} [megadott] - az eltérő szabályok (`{ tudatpontKeret: 500, alapKuszobok: { elfogadasiKuszob: 66 } }`)
 * @returns {Object} sima (nem fagyasztott) objektum — az esemény adata
 */
export function teljesSzabalyok(megadott = {}) {
  const { alapKuszobok, ...tobbi } = megadott ?? {};
  const { alapKuszobok: alapK, ...alap } = ALAP_SZABALYOK;
  return { ...alap, ...tobbi, alapKuszobok: { ...alapK, ...(alapKuszobok ?? {}) } };
}

/**
 * A koinó szabályai a születéséből — a mai értékekkel kiegészítve (ami nincs megadva, az a mai). A hiányzó vagy régi
 * születés: a mai értékek.
 * @param {Object|null} szuletes - a koinó `KoinoLetrehozas` eseménye
 * @returns {{tudatpontKeret: number, kategoriaKorlat: number, tanusitasKell: number, felhatalmazasKell: number,
 *   alapKuszobok: Object}}
 */
export function koinoSzabalyai(szuletes) {
  const sz = szuletes?.tipus === 'KoinoLetrehozas' ? szuletes.adat?.szabalyok : undefined;
  if (!sz || szabalyokAlakiHibaja(sz)) return ALAP_SZABALYOK;
  return Object.freeze({
    ...ALAP_SZABALYOK,
    ...Object.fromEntries(Object.entries(sz).filter(([k]) => k !== 'alapKuszobok')),
    alapKuszobok: Object.freeze({ ...ALAP_SZABALYOK.alapKuszobok, ...(sz.alapKuszobok ?? {}) })
  });
}
