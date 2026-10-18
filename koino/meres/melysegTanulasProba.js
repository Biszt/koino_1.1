// koino/meres/melysegTanulasProba.js — A TANULT MÉLYSÉG önpróbája (D110 — a K10 (A2))

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a társaktól tanult mélység a D110 szabálya szerint jár:
//   · a friss társak mélységének ALSÓ mediánja − 1, legalább két KÜLÖNBÖZŐ társtól (egy társ szava nem tanulás);
//   · a hazug KISEBBSÉG nem tol el (öt becsületes a 10-en, két hazug a 30-on → 9);
//   · csak MÉLYEBBRE (a saját becslés nagyobbja marad);
//   · egy nap után elévül; a jegyzék korlátos, és a hibás tételt eldobja;
//   · ⭐ az offline készülék esete: a saját (régi, „teli”) becslése 3, a társak 10-en → 9 (a K10 (A) eredeti feltétele itt
//     beragasztott volna).

import {
  tarsMelysegeFeljegyzese, tanultMelyseg, ervenyesMelyseg, uresMelysegJegyzek, melysegJegyzekAlakja,
  TANULT_ELETTARTAM, TANULT_TARS_MIN, TANULT_TARS_KORLAT
} from '../js/csere/melysegTanulas.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A TANULT MÉLYSÉG (D110 — a K10 (A2))');

const T0 = Date.UTC(2026, 9, 18, 12, 0, 0);

const jegyzekBol = (fajta, lista, most = T0) => {
  let j = uresMelysegJegyzek();
  lista.forEach((m, i) => { j = tarsMelysegeFeljegyzese(j, { fajta, tars: 't' + i, melyseg: m, most }); });
  return j;
};

// Rontás: a felső medián vagy a legnagyobb → a 9 helyett más → bukik; a „− 1” nélkül 10 → bukik.
proba('⭐ a friss társak mélységének ALSÓ mediánja − 1 (két társnál a kisebbik − 1)', () =>
  tanultMelyseg(jegyzekBol('k', [10, 10, 11]), { fajta: 'k', most: T0 })?.melyseg === 9
  && tanultMelyseg(jegyzekBol('k', [8, 12]), { fajta: 'k', most: T0 })?.melyseg === 7
  && tanultMelyseg(jegyzekBol('g', [0, 0]), { fajta: 'g', most: T0 })?.melyseg === 0);

// Rontás: egy társ is elég → tanul → bukik.
proba('⛔ egy társ szava nem tanulás — legalább két KÜLÖNBÖZŐ társ kell (ugyanaz a társ kétszer egynek számít)', () => {
  let j = uresMelysegJegyzek();
  j = tarsMelysegeFeljegyzese(j, { fajta: 'k', tars: 'egy', melyseg: 12, most: T0 });
  j = tarsMelysegeFeljegyzese(j, { fajta: 'k', tars: 'egy', melyseg: 12, most: T0 + 1 });
  return TANULT_TARS_MIN === 2 && tanultMelyseg(j, { fajta: 'k', most: T0 + 2 }) === null;
});

// ⭐ A medián lényege. Rontás: a legnagyobb két társ szerint (a K10 (A) eredeti „legnagyobb”-ja) → 29 → bukik.
proba('⭐⭐ a hazug KISEBBSÉG nem tol el: öt becsületes a 10-en, két hazug a 30-on → 9', () =>
  tanultMelyseg(jegyzekBol('k', [10, 10, 10, 11, 10, 30, 30]), { fajta: 'k', most: T0 })?.melyseg === 9);

// Rontás: a saját becslés helyett a tanult akkor is, ha sekélyebb → bukik.
proba('⭐ csak MÉLYEBBRE: a saját becslés nagyobbja marad — a tanult nem húz feljebb', () =>
  ervenyesMelyseg(7, { melyseg: 3 }) === 7 && ervenyesMelyseg(3, { melyseg: 9 }) === 9 && ervenyesMelyseg(4, null) === 4);

// ⭐ A K10 (A) eredeti feltételét kiváltó eset. Rontás: „csak ha a saját darab kevés” feltétel → 3 marad → bukik.
proba('⭐⭐ az offline készülék felzárkózik: a régi becslése 3 (a darabja „teli”), a friss társak 10-en → 9', () =>
  ervenyesMelyseg(3, tanultMelyseg(jegyzekBol('g', [10, 10, 10]), { fajta: 'g', most: T0 })) === 9);

// Rontás: az elévülés nem számít → a régi bemondás tanít → bukik.
proba('⭐ egy nap után elévül — ha senki nem erősíti meg, a saját becslés marad', () => {
  const j = jegyzekBol('k', [10, 10], T0);
  return tanultMelyseg(j, { fajta: 'k', most: T0 + TANULT_ELETTARTAM - 1 })?.melyseg === 9
    && tanultMelyseg(j, { fajta: 'k', most: T0 + TANULT_ELETTARTAM + 1 }) === null;
});

// A fajták külön számolnak (a gyökér-darab és a kereső-régió mélysége más).
proba('A két fajta (gyökér-darab, kereső-régió) külön jegyzéken — az egyik nem tanítja a másikat', () => {
  const j = jegyzekBol('g', [6, 6]);
  return tanultMelyseg(j, { fajta: 'g', most: T0 })?.melyseg === 5 && tanultMelyseg(j, { fajta: 'k', most: T0 }) === null;
});

// Rontás: nincs korlát → a jegyzék nő → bukik; a hibás tétel nem dobódik el → bukik.
proba('⭐ a jegyzék korlátos (a legrégebbi esik ki), és a hibás tételt (fájlból) eldobja', () => {
  let j = uresMelysegJegyzek();
  for (let i = 0; i < TANULT_TARS_KORLAT + 10; i++) j = tarsMelysegeFeljegyzese(j, { fajta: 'k', tars: 't' + i, melyseg: 5, most: T0 + i });
  const hibas = melysegJegyzekAlakja({ k: { jo: { m: 4, ido: T0 }, rossz: { m: -1, ido: T0 }, tul: { m: 999, ido: T0 }, nem: 'x' } });
  return Object.keys(j.k).length === TANULT_TARS_KORLAT && !('t0' in j.k) && ('t' + (TANULT_TARS_KORLAT + 9)) in j.k
    && Object.keys(hibas.k).join() === 'jo';
});

export default futtatas;
