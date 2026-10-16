// koino/meres/keresoProba.js

// Felelősség: bizonyítani, hogy a KERESŐ-RÉTEG tiszta számításai (D105 — `keresoReteg.js`) azt teszik, amit a döntés mond:
// a cím szavai (NFC, kisbetű, betűk és számjegyek), a kulcsok (K2 (C): az egész szó és az első négy betű), a tőre keresés
// (a „park” a „parkban”-t eléri — a kérdés fiókja a cím kulcsai között van), az osztódás (K7: a darab (B/2, B], a gondolat
// darabja egymásba ágyazott, a darabok más helyre esnek), a régió (`k` jel, a gyökér-darabtól független helyen), a mélység
// becslése és a vakított téma. Hálózat nélkül.
//
// Futtatás: node koino/meres/mind.js kereso   (a „csere” csoport része)

import { probaGyujtemeny } from './probaFuttato.js';
import {
  szavak, szoKulcsai, cimKulcsai, kerdesFiokjai, cimIllik, bejegyzesKulcsai, osztodasMelysege, fiokDarabja, fiokHelye,
  bejegyzesHelye, keresoRegioKulcsa, keresoRegioBol, sajatKeresoRegioi, keresoRegioKulcsai, keszulekKeresoHelye,
  regiobaEsik, keresoMelysegBecslese, keresoRegioTemaja, CIM_KULCS_KORLAT, KERESO_FIOK_CEL
} from '../js/csere/keresoReteg.js';
import {
  gyokerDarabBol, gyokerDarabKulcsa, sajatGyokerDarabjai, gyokerDarabTemaja, DARAB_MAX_MELYSEG
} from '../js/csere/cimjegyzek.js';
import { ervenyesKulcs } from '../js/csere/szeletEgyeztetes.js';

const { proba, futtatas } = probaGyujtemeny('A kereső-réteg tiszta számításai (D105 — a ⑦ ② lépése)');

const mind = (ki, cimke) => {
  const jo = Object.values(ki).every(Boolean);
  if (!jo) console.log('    (' + cimke + ' — ami bukott: ' + Object.keys(ki).filter((k) => !ki[k]).join(', ') + ')');
  return jo;
};

// ===================================
// 1. A SZAVAK ÉS A KULCSOK (K2 (C))
// ===================================

proba('a cím szavai: NFC, kisbetű, betűk és számjegyek — az írásjel elválaszt, az ismétlés egyszer', () => {
  const sz = szavak('Új PARK a Ligetben — park, 2026! Fák-ültetés');
  return sz.join('|') === 'új|park|a|ligetben|2026|fák|ültetés'
    && szavak('Tér').join() === 'tér'                 // a bontott „é” egy jel lesz (NFC)
    && szavak(null).length === 0 && szavak('').length === 0;
});

proba('⭐ K2 (C): a szó kulcsai — 3 jel egészében, 4 jel a szóeleje, hosszabb mindkettő, rövidebb semmi (jelekben mérve)', () =>
  szoKulcsai('az').length === 0
  && szoKulcsai('ház').join() === 'e:ház'
  && szoKulcsai('park').join() === 'p:park'
  && szoKulcsai('parkban').join() === 'e:parkban,p:park'
  && szoKulcsai('őrző').join() === 'p:őrző'                // négy jel (az „ő” egy)
  && szoKulcsai('őrzők').join() === 'e:őrzők,p:őrző');

proba('a cím kulcsai ismétlés nélkül, és legfeljebb 32 — a cím elejéről', () => {
  const k = cimKulcsai('Parkok és parkolók a parkban');
  const hosszu = cimKulcsai(Array.from({ length: 60 }, (_, i) => 'szo' + i + 'xx').join(' '));
  return k.join() === 'e:parkok,p:park,e:parkolók,e:parkban' && hosszu.length === CIM_KULCS_KORLAT
    && hosszu[0] === 'e:szo0xx';
});

// ===================================
// 2. ⭐⭐ A TŐRE KERESÉS — a kérdező odatalál, ahová a cím bejegyzése került
// ===================================
//
// A tulajdonság: ha a cím illik egy (≥ 4 jeles) kérdés-szóra, a szó valamelyik fiókja a cím kulcsai között van. Rontás:
// a szóeleje-kulcs nélkül (csak az egész szó — a K2 (A)) a „park” a „parkban”-t nem éri el → bukik.

proba('⭐⭐ a tőre keresés: ha a cím illik, a kérdés fiókja a cím kulcsai között van — a „park” eléri a „parkban”-t', () => {
  const ki = {};
  ki.illik = cimIllik('Fák ültetése a parkban', 'park') && cimIllik('Új parkoló a város szélén', 'park város')
    && cimIllik('Buszmegálló a Fő utcán', 'BUSZ') && !cimIllik('A park', 'parkban') && !cimIllik('Új parkoló', 'park iskola')
    && !cimIllik('Terek és utcák', 'tér')                     // a tőváltozás kimarad (nincs nyelvtani értelmezés)
    && !cimIllik('bármi', 'a az');                            // a rövid szó nem kérdezhető
  const cimek = ['Fák ültetése a parkban', 'Új parkoló a város szélén', 'Buszmegálló a Fő utcán', 'Parkok és terek',
    'Az iskolák felújítása', 'Kerékpárút a Duna mentén', 'Közösségi kert a lakótelepen'];
  const kerdesek = ['park', 'parkoló', 'busz', 'kerék', 'kerékpárút', 'közös', 'iskolák', 'duna', 'lakó'];
  let par = 0;
  ki.tulajdonsag = cimek.every((c) => kerdesek.every((q) => {
    if (!cimIllik(c, q)) return true;
    par++;
    const kk = new Set(cimKulcsai(c));
    return kerdesFiokjai(q).every((x) => x.kulcsok.some((k) => kk.has(k)));
  })) && par >= 8;
  // A háromjeles kérdés-szó csak a pontos alakot éri el (kimondott határ — K2 (C)).
  ki.harom = kerdesFiokjai('ház')[0].kulcsok.join() === 'e:ház' && !cimKulcsai('Házak a domboldalon').includes('e:ház')
    && cimKulcsai('Egy ház a domboldalon').includes('e:ház');
  return mind(ki, 'tőre keresés');
});

proba('a bejegyzés: csak a címet viselő születés (gondolat, kategória, gondolattípus) — a kulcsai a címéből', () =>
  bejegyzesKulcsai({ tipus: 'GondolatLetrehozas', adat: { cim: 'Új park' } }).join() === 'p:park'
  && bejegyzesKulcsai({ tipus: 'GondolatLetrehozas', adat: { cim: 'Környezet', tipus: 'Kategoria' } }).join()
    === 'e:környezet,p:körn'
  && bejegyzesKulcsai({ tipus: 'GondolatLetrehozas', adat: { cim: 'Kérdés', tipus: 'GondolatTipus' } }).length === 2
  && bejegyzesKulcsai({ tipus: 'Javaslat', adat: { cim: 'Új park' } }).length === 0
  && bejegyzesKulcsai({ tipus: 'GondolatLetrehozas', adat: { cim: 'Új park', tipus: 'Valami' } }).length === 0
  && bejegyzesKulcsai({ tipus: 'GondolatLetrehozas', adat: {} }).length === 0 && bejegyzesKulcsai(null).length === 0);

// ===================================
// 3. ⭐⭐ K7 — A FIÓK OSZTÓDÁSA
// ===================================
//
// Rontás: osztódás nélkül (a mélység mindig 0) a gyakori szó fiókja egy helyen marad → bukik.

proba('⭐⭐ K7: a fiók osztódása — a darab (B/2, B], a gondolat darabja egymásba ágyazott, a darabok más helyre esnek, egyenletesen', () => {
  const ki = {};
  ki.melyseg = osztodasMelysege(0) === 0 && osztodasMelysege(256) === 0 && osztodasMelysege(257) === 1
    && osztodasMelysege(512) === 1 && osztodasMelysege(513) === 2 && osztodasMelysege(1e60) === DARAB_MAX_MELYSEG
    && osztodasMelysege(NaN) === 0;
  ki.meret = [300, 1000, 5000, 52148, 1e6].every((n) => {
    const s = osztodasMelysege(n);
    return n / 2 ** s <= KERESO_FIOK_CEL && n / 2 ** s > KERESO_FIOK_CEL / 2;
  });
  ki.beagyazott = Array.from({ length: 50 }, (_, i) => 'g' + i).every((az) => {
    for (let s = 1; s <= 24; s++) if (fiokDarabja(az, s) >> 1n !== fiokDarabja(az, s - 1)) return false;
    return true;
  });
  const helyek = new Set([fiokHelye('e:nem'), fiokHelye('e:nem', 1, 0), fiokHelye('e:nem', 1, 1), fiokHelye('e:nem', 2, 0),
    fiokHelye('p:nemz')]);
  ki.helyek = helyek.size === 5 && bejegyzesHelye('e:nem', 'g7', 3) === fiokHelye('e:nem', 3, fiokDarabja('g7', 3))
    && bejegyzesHelye('e:nem', 'g7') === fiokHelye('e:nem');
  // Egy gyakori fiók 10 000 bejegyzése 2^6 darabra oszlik, és a darabok egyenletesen telnek (a gondolat lenyomata szerint).
  const s = osztodasMelysege(10000);
  const db = new Map();
  for (let i = 0; i < 10000; i++) { const d = fiokDarabja('gondolat' + i, s); db.set(d, (db.get(d) ?? 0) + 1); }
  ki.egyenletes = s === 6 && db.size === 64 && [...db.values()].every((n) => n > 100 && n < 220);
  return mind(ki, 'K7');
});

// ===================================
// 4. A RÉGIÓK — a gyökér-darab mintája, `k` jellel, független helyen
// ===================================

proba('a kereső-régió kulcsa: `k` jellel, 144 mélységig oda-vissza, érvényes vonal-kulcs — és nem gyökér-darab (fordítva sem)', () => {
  const ki = {};
  ki.odaVissza = [0, 1, 7, 16, 17, 60, 144].every((m) => {
    const d = sajatKeresoRegioi('a1', m)[0];
    const k = keresoRegioKulcsa(m, d);
    const v = keresoRegioBol(k);
    return k.length === 43 && ervenyesKulcs(k) && v?.melyseg === m && v?.darab === d && gyokerDarabBol(k) === null;
  });
  const gy = gyokerDarabKulcsa(5, 3n);
  ki.forditva = keresoRegioBol(gy) === null && keresoRegioKulcsa(5, 3n) !== gy
    && keresoRegioKulcsa(5, 3n).replace('k', 'g') === gy;                 // ugyanaz az alak, más jel
  ki.szintek = keresoRegioKulcsai('a1', 10).length === 3 && keresoRegioKulcsai('a1', 0).length === 2
    && keresoRegioKulcsai('a1', DARAB_MAX_MELYSEG).length === 2 && keresoRegioKulcsai('a1', 10).every((k) => keresoRegioBol(k));
  return mind(ki, 'régió-kulcs');
});

proba('a készülék kereső-régiója a gyökér-darabjától FÜGGETLEN helyen (más só) — és determinisztikus', () => {
  let elter = 0;
  for (let i = 0; i < 64; i++) {
    const al = 'alairo-' + i;
    if (sajatKeresoRegioi(al, 6)[0] !== sajatGyokerDarabjai(al, 6)[0]) elter++;
  }
  return elter > 48 && sajatKeresoRegioi('x', 9)[0] === sajatKeresoRegioi('x', 9)[0]
    && regiobaEsik(keszulekKeresoHelye('x'), 9, sajatKeresoRegioi('x', 9)[0]);
});

proba('⭐ a régió mélységének becslése a saját régióból ugyanaz, mint a teljes tudásból (cél 512 bejegyzés)', () => {
  const helyek = [];
  for (let i = 0; i < 20000; i++) helyek.push(bejegyzesHelye('e:szo' + (i % 5000), 'g' + i));
  const sajat = keszulekKeresoHelye('x');
  const teljes = keresoMelysegBecslese(helyek, sajat);
  const resz = [4, 5].map((s) => keresoMelysegBecslese(
    helyek.filter((h) => regiobaEsik(h, s, sajat >> BigInt(DARAB_MAX_MELYSEG - s))), sajat));
  return teljes.melyseg === 6 && resz.every((r) => Math.abs(r.melyseg - teljes.melyseg) <= 1)
    && keresoMelysegBecslese(helyek.slice(0, 100), sajat).melyseg === 0;
});

proba('a régió témája vakított (a koinó a só), és nem azonos a gyökér-darab témájával', () =>
  keresoRegioTemaja('k1', 3, 5n).length === 20 && !keresoRegioTemaja('k1', 3, 5n).equals(keresoRegioTemaja('k2', 3, 5n))
  && !keresoRegioTemaja('k1', 3, 5n).equals(gyokerDarabTemaja('k1', 3, 5n))
  && keresoRegioTemaja('k1', 3, 5n).equals(keresoRegioTemaja('k1', 3, 5)));

export default futtatas;
