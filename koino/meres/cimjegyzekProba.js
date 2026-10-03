// koino/meres/cimjegyzekProba.js

// Felelősség: A CÍMJEGYZÉK (G — D91) tiszta számításainak önpróbája: a vakított téma, a gyökér-darab, a
// mélység és az, hogy egy készülék mit hirdet (D91/3). Hálózat nélkül — a hirdetés és a keresés bekötését a
// `parancssorProba.js` méri (hamis DHT-n, két készülékkel).
//
// Használat: node koino/meres/mind.js cimjegyzek   (a „csere" csoport része)

import { probaGyujtemeny } from './probaFuttato.js';
import {
  cimjegyzekTema, gyokerDarabja, sajatGyokerDarabjai, gyokerMelysege, gyokerDarabTemaja, hirdetendoTemak,
  GYOKER_DARAB_CEL, HIRDETES_KOZ
} from '../js/csere/cimjegyzek.js';

const { proba, futtatas } = probaGyujtemeny('A CÍMJEGYZÉK — a vakított téma és a hirdetés (G, D91)');

const AZ = (i) => String(i).padStart(43, 'A');   // azonosító alakú kulcs

// ===== A VAKÍTOTT TÉMA =====

proba('a téma 20 bájt (a BEP 5 info_hash-e), és ugyanabból ugyanaz', () => {
  const a = cimjegyzekTema('k1', 'szelet', AZ(1));
  const b = cimjegyzekTema('k1', 'szelet', AZ(1));
  return Buffer.isBuffer(a) && a.length === 20 && a.equals(b);
});

proba('⭐ a koinó a só: más koinóban ugyanaz a szelet MÁS téma (kívülálló nem számolja ki)', () =>
  !cimjegyzekTema('k1', 'szelet', AZ(1)).equals(cimjegyzekTema('k2', 'szelet', AZ(1))));

proba('a fajta és a kulcs is benne van; ismeretlen fajtát nem fogad el', () => {
  const gy = cimjegyzekTema('k1', 'gyoker', '0:0');
  const sz = cimjegyzekTema('k1', 'szelet', '0:0');
  let dobott = false;
  try { cimjegyzekTema('k1', 'barmi', AZ(1)); } catch { dobott = true; }
  return !gy.equals(sz) && !cimjegyzekTema('k1', 'szelet', AZ(2)).equals(cimjegyzekTema('k1', 'szelet', AZ(1)))
    && dobott;
});

// ===== A GYÖKÉR-DARAB =====

proba('a gyökér-darab a tartományban van, determinisztikus, 0 bitnél 0; a határon kívül hibát dob', () => {
  for (let i = 0; i < 200; i++) {
    const d = gyokerDarabja(AZ(i), 4);
    if (!(d >= 0 && d < 16) || d !== gyokerDarabja(AZ(i), 4)) return false;
  }
  let dobott = 0;
  try { gyokerDarabja(AZ(1), 17); } catch { dobott++; }
  try { gyokerDarabja(AZ(1), -1); } catch { dobott++; }
  return gyokerDarabja(AZ(1), 0) === 0 && dobott === 2;
});

proba('a gyökér-darabok egyenletesen telnek (1600 gondolat, 16 darab → mind 60 és 140 között)', () => {
  const db = new Array(16).fill(0);
  for (let i = 0; i < 1600; i++) db[gyokerDarabja('g' + i, 4)]++;
  return db.every((n) => n >= 60 && n <= 140);
});

proba('egy készülék darabjai: a kért szám, körbeérve, a darab-számnál nem több', () => {
  const ket = sajatGyokerDarabjai('alairo-x', 3, 2);
  const mind = sajatGyokerDarabjai('alairo-x', 1, 5);
  return ket.length === 2 && ket[1] === (ket[0] + 1) % 8 && mind.length === 2
    && sajatGyokerDarabjai('alairo-x', 0, 3).join() === '0';
});

// ===== A MÉLYSÉG („végtelen": egy darab mérete nem nő a koinóval) =====

proba('⭐ a mélység: kis koinóban 0, és KETTŐZÉSENKÉNT +1 (logaritmikus), legfeljebb 16', () =>
  gyokerMelysege(0) === 0 && gyokerMelysege(GYOKER_DARAB_CEL) === 0
  && gyokerMelysege(GYOKER_DARAB_CEL + 1) === 1 && gyokerMelysege(2 * GYOKER_DARAB_CEL) === 1
  && gyokerMelysege(2 * GYOKER_DARAB_CEL + 1) === 2 && gyokerMelysege(4 * GYOKER_DARAB_CEL + 1) === 3
  && gyokerMelysege(1e12) === 16 && gyokerMelysege(-5) === 0 && gyokerMelysege(NaN) === 0);

proba('egy darabban sosem több, mint ~2 × a cél (a mélység a darab-méretet korlátozza)', () => {
  for (const n of [300, 1000, 5000, 100000, 3000000]) {
    if (n / 2 ** gyokerMelysege(n) > 2 * GYOKER_DARAB_CEL) return false;
  }
  return true;
});

proba('a gyökér-darab témájában a mélység is benne van (más mélység, más téma)', () =>
  !gyokerDarabTemaja('k1', 1, 0).equals(gyokerDarabTemaja('k1', 2, 0))
  && gyokerDarabTemaja('k1', 1, 1).equals(cimjegyzekTema('k1', 'gyoker', '1:1')));

// ===== MIT HIRDET EGY KÉSZÜLÉK (D91/3) =====

proba('⭐ alapból CSAK a gyökér-darab (egy téma) — a vállalt szeletek a beállítás nélkül nem mennek ki', () => {
  const t = hirdetendoTemak({ koino: 'k1', alairo: 'a1', legfelsoDarab: 10, vallaltSzeletek: [AZ(1), AZ(2)] });
  return t.length === 1 && t[0].fajta === 'gyoker' && t[0].kulcs === '0:0'
    && t[0].tema.equals(gyokerDarabTemaja('k1', 0, 0));
});

proba('⭐ a beállítással a vállalt szeletek is — legfeljebb annyi, a megadott sorrendben, az üreset kihagyva', () => {
  const t = hirdetendoTemak({ koino: 'k1', alairo: 'a1', legfelsoDarab: 10,
    vallaltSzeletek: ['', AZ(3), null, AZ(1), AZ(2)], szeletHirdetes: 2 });
  return t.length === 3 && t[1].kulcs === AZ(3) && t[2].kulcs === AZ(1)
    && t[1].tema.equals(cimjegyzekTema('k1', 'szelet', AZ(3)));
});

proba('a hibás beállítás (negatív, tört, szöveg) 0-nak számít', () =>
  [-1, 1.5, '3', null].every((b) => hirdetendoTemak({ koino: 'k1', alairo: 'a1', legfelsoDarab: 1,
    vallaltSzeletek: [AZ(1)], szeletHirdetes: b }).length === 1));

proba('a gyökér-darab a koinó méretével mélyül (300 legfelső gondolat → 1 bit), és a készülék szerint oszlik', () => {
  const t = hirdetendoTemak({ koino: 'k1', alairo: 'a1', legfelsoDarab: 300 });
  const [m, d] = t[0].kulcs.split(':').map(Number);
  const darabok = new Set();
  for (let i = 0; i < 40; i++) {
    darabok.add(hirdetendoTemak({ koino: 'k1', alairo: 'a' + i, legfelsoDarab: 5000 })[0].kulcs);
  }
  return m === 1 && d === sajatGyokerDarabjai('a1', 1)[0] && darabok.size > 1;
});

proba('a hirdetés üteme a felejtésnél (30–60 perc, 58. mérés) gyorsabb', () =>
  HIRDETES_KOZ > 0 && HIRDETES_KOZ < 30 * 60 * 1000);

export default futtatas;
