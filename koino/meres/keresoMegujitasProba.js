// koino/meres/keresoMegujitasProba.js — A KERESŐ-BEJEGYZÉS MEGÚJÍTÁSÁNAK önpróbája (D107 L3, K5 — a kereső-réteg ④a)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a megújítás azt köti, amit kell:
//   · a tulajdonos aláírása érvényes, és a gondolat minden fiók-bejegyzésére szól (a fiók nincs benne);
//   · ⛔ a nem tulajdonosé, a jövőbe dátumozott (egy napnál több), és a más csomagra vagy más időre szóló nem érvényes;
//   · a lejárat a bejegyzésből számolódik (a megújítás ideje, vagy ha nincs, a csomag legfrissebb eseménye + 30 nap);
//   · a soros-rend mindenkinél ugyanaz, az első a 20., a második a 25. napon újít, a többi nem.

import {
  megujitasKeszitese, megujitasEllenorzese, bejegyzesIdeje, bejegyzesLejarata, lejartE, sorosRend, megujitaniKell,
  csomagTulajdonosai, MEGUJITAS_ELETTARTAM, JOVO_TURES, SOROS_NAPOK
} from '../js/tar/keresoMegujitas.js';
import { bejegyzesekEpitese } from '../js/tar/keresoTar.js';
import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A KERESŐ-BEJEGYZÉS MEGÚJÍTÁSA (D107 L3, K5 — a kereső-réteg ④a)');

const KOINO = 'kereso-megujitas-proba';
const NAP = 24 * 3600 * 1000;

const jwk = async (ember) => crypto.subtle.exportKey('jwk', ember.kulcspar.privateKey);

async function csomag(pontok = [30, 20]) {
  const emberek = [];
  for (let i = 0; i < pontok.length; i++) emberek.push(await ujEember(KOINO));
  const szuletes = await emberek[0].tesz('GondolatLetrehozas', { cim: 'Közös park a faluban', meret: 10 });
  const pontEsemenyek = [];
  for (let i = 0; i < pontok.length; i++) pontEsemenyek.push(await emberek[i].tesz('TudatpontRendezes', { entitas: szuletes.azonosito, pont: pontok[i] }));
  const bejegyzesek = bejegyzesekEpitese({ szuletes, pontEsemenyek });
  return { emberek, szuletes, pontEsemenyek, g: szuletes.azonosito, esemenyek: bejegyzesek[0].esemenyek, bejegyzesek };
}

// Rontás: az aláírás ellenőrzése kihagyva → a hamis is átmegy (lent) → bukik; itt: a jó bukik, ha az üzenet nem stabil.
proba('⭐ a tulajdonos megújítása érvényes — és a gondolat MINDEN fiók-bejegyzésére szól (egy aláírás)', async () => {
  const c = await csomag();
  const m = megujitasKeszitese(await jwk(c.emberek[1]), c.emberek[1].szerzo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek });
  return c.bejegyzesek.length > 1
    && c.bejegyzesek.every((b) => megujitasEllenorzese(m, { koino: KOINO, g: b.g, esemenyek: b.esemenyek }).rendben);
});

// Rontás: a tulajdonos-ellenőrzés kikapcsolva → az idegen is újíthat → bukik.
proba('⛔ a NEM tulajdonos megújítása nem érvényes (az idegen nem tarthatja életben)', async () => {
  const c = await csomag();
  const idegen = await ujEember(KOINO);
  const m = megujitasKeszitese(await jwk(idegen), idegen.szerzo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek });
  const r = megujitasEllenorzese(m, { koino: KOINO, g: c.g, esemenyek: c.esemenyek });
  return !r.rendben && /nem a csomag tulajdonosa/.test(r.ok);
});

// Rontás: a jövő-tűrés nincs → az évekre előre dátumozott is átmegy → bukik.
proba('⛔ a jövőbe dátumozott (egy napnál több) nem érvényes — a fél napos óra-eltérés igen', async () => {
  const c = await csomag();
  const k = await jwk(c.emberek[0]);
  const most = Date.now();
  const jovo = megujitasKeszitese(k, c.emberek[0].szerzo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek, ido: most + 2 * NAP });
  const kicsit = megujitasKeszitese(k, c.emberek[0].szerzo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek, ido: most + NAP / 2 });
  return JOVO_TURES === NAP && !megujitasEllenorzese(jovo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek, most }).rendben
    && megujitasEllenorzese(kicsit, { koino: KOINO, g: c.g, esemenyek: c.esemenyek, most }).rendben;
});

// ⛔ Rontás: az aláírt üzenet nem fedi a csomagot (vagy az időt) → a másik csomagra / más időre átvitt megújítás is jó → bukik.
proba('⛔ a megújítás nem vihető át: más csomagra, más gondolatra, más koinóra vagy más időre nem érvényes', async () => {
  const c = await csomag();
  const masik = await csomag();
  const m = megujitasKeszitese(await jwk(c.emberek[0]), c.emberek[0].szerzo, { koino: KOINO, g: c.g, esemenyek: c.esemenyek });
  const harmadik = await ujEember(KOINO);
  const bovebb = [...c.esemenyek, await harmadik.tesz('TudatpontRendezes', { entitas: c.g, pont: 5 })];
  return !megujitasEllenorzese(m, { koino: KOINO, g: c.g, esemenyek: bovebb }).rendben
    && !megujitasEllenorzese(m, { koino: KOINO, g: masik.g, esemenyek: masik.esemenyek }).rendben
    && !megujitasEllenorzese(m, { koino: 'masik-koino', g: c.g, esemenyek: c.esemenyek }).rendben
    && !megujitasEllenorzese({ ...m, ido: m.ido - 1000 }, { koino: KOINO, g: c.g, esemenyek: c.esemenyek }).rendben
    && !megujitasEllenorzese({ ...m, tobb: 1 }, { koino: KOINO, g: c.g, esemenyek: c.esemenyek }).rendben;
});

// Rontás: a lejárat a fogadás idejéből (nem a bejegyzésből) → a két tartó másképp lát → bukik; itt az értékek.
proba('⭐ a lejárat a bejegyzésből: a megújítás ideje (vagy a csomag legfrissebb eseménye) + 30 nap — bárkinél ugyanaz', async () => {
  const c = await csomag();
  const b = c.bejegyzesek[0];
  const legfrissebb = Math.max(...b.esemenyek.map((e) => e.ido));
  const megujitott = { ...b, m: { szerzo: c.emberek[0].szerzo, ido: legfrissebb + 10 * NAP, alairas: 'x' } };
  return MEGUJITAS_ELETTARTAM === 30 * NAP && bejegyzesIdeje(b) === legfrissebb
    && bejegyzesLejarata(b) === legfrissebb + 30 * NAP && bejegyzesLejarata(megujitott) === legfrissebb + 40 * NAP
    && !lejartE(b, legfrissebb + 30 * NAP - 1) && lejartE(b, legfrissebb + 30 * NAP) && !lejartE(megujitott, legfrissebb + 35 * NAP);
});

// ⭐ K5. Rontás: mindenki újít (a soros-rendtől függetlenül) → a harmadik is → bukik; a rend tulajdononként más → bukik.
proba('⭐⭐ a soros-rend mindenkinél ugyanaz — az első a 20., a második a 25. napon újít, a többi nem', async () => {
  const c = await csomag([30, 20, 10]);
  // ⚠️ Az építő csak a két legtöbb pontú tulajdonost veszi a csomagba — itt mindhárom pont-esemény kell.
  const t = csomagTulajdonosai([c.szuletes, ...c.pontEsemenyek], c.g);
  const rend = sorosRend(c.g, t);
  const rend2 = sorosRend(c.g, [...t].reverse());
  const ut = 1_000_000_000_000;
  const kell = (sz, nap) => megujitaniKell({ g: c.g, tulajdonosok: t, szerzo: sz, utolso: ut, most: ut + nap * NAP });
  return t.length === 3 && rend.join() === rend2.join() && SOROS_NAPOK[0] === 20 * NAP && SOROS_NAPOK[1] === 25 * NAP
    && !kell(rend[0], 19) && kell(rend[0], 20) && !kell(rend[1], 24) && kell(rend[1], 25) && !kell(rend[2], 29)
    && !kell('idegen', 29);
});

export default futtatas;
