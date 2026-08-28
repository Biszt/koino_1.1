// koino/meres/szabalyProba.js — a szabály-réteg önpróbája
//
// Azt bizonyítja, hogy a domain-szabályokat a SZÁMÍTÁS őrzi, nem a felület — mert a másik
// gép felülete semmitől nem véd meg. A próbák KÉZZEL ALÁÍRT eseményekkel dolgoznak,
// vagyis pontosan úgy, ahogy egy rosszindulatú másik gép tenné.

import { allapotSzamitasa } from '../js/allapot/allapotSzamitas.js';
import { javaslatokSzamitasa } from '../js/allapot/javaslatSzamitas.js';
import { szabalyokErvenyesitese, TUDATPONT_KERET } from '../js/allapot/szabalyok.js';

import { probaGyujtemeny, ujEember } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A szabály-réteg próbája');

const KOINO = 'proba';
const NAP = 86400 * 1000;

// ===== 1. SZABÁLY: A TUDATPONT-KERET =====

proba('A kereten BELÜLI tudatpont rendben van', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: TUDATPONT_KERET });

  const a = allapotSzamitasa([t, p]);
  return a.kivetelek.length === 0
      && a.entitasok.get(t.azonosito).osszesPont === TUDATPONT_KERET;
});

proba('⭐ A keretet TÚLLÉPŐ tudatpont nem számít (a felület megkerülésével sem)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const p = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 999999 });

  const a = allapotSzamitasa([t, p]);
  // Nincs érvényes pont rajta → az entitás nem is létezik (D14: a közösségi felejtés)
  return a.kivetelek.length === 1
      && a.kivetelek[0].tipus === 'TudatpontRendezes'
      && a.entitasok.has(t.azonosito) === false;
});

proba('A keret a KIOSZTOTT ÖSSZEGRE vonatkozik, nem egy entitásra', async () => {
  const anna = await ujEember();
  const egyik = await anna.tesz('TartalomLetrehozas', { cim: 'Egyik', meret: 10 });
  const masik = await anna.tesz('TartalomLetrehozas', { cim: 'Másik', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 6000 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: masik.azonosito, pont: 6000 });

  const a = allapotSzamitasa([egyik, masik, p1, p2]);
  // 6000 + 6000 = 12 000 > 10 000 → a MÁSODIK esik ki, az első áll
  return a.kivetelek.length === 1
      && a.entitasok.get(egyik.azonosito).osszesPont === 6000
      && a.entitasok.has(masik.azonosito) === false;
});

proba('⭐ Az ÁTRENDEZÉS nem ütközik a keretbe (a régi érték felszabadul)', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const teljes = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10000 });
  // Ugyanarra az entitásra tesz újra 10 000-et: ez nem 20 000, hanem ugyanaz
  const ujra = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 10000 });

  const a = allapotSzamitasa([t, teljes, ujra]);
  return a.kivetelek.length === 0
      && a.entitasok.get(t.azonosito).osszesPont === 10000;
});

proba('A NEGATÍV és a tört tudatpont sem számít', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const jo = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 });
  const rossz = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: -50 });

  const a = allapotSzamitasa([t, jo, rossz]);
  return a.kivetelek.length === 1 && a.entitasok.get(t.azonosito).osszesPont === 100;
});

// ===== 2. SZABÁLY: JAVASLATOT CSAK A GAZDA TEHET =====

proba('⭐ AZ IDEGEN KULCS javaslata nem számít — és így nem születik egyezmény sem', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const idegen = await ujEember();

  const t = await gazda.tesz('TartalomLetrehozas', { cim: 'A más tartalma', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  // Az idegennek NINCS tudatpontja rajta — mégis javaslatot tesz és megszavazza magának
  const j = await idegen.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Az én címem' }
  }, kezdet);
  const sz = await idegen.tesz('Szavazat', { javaslat: j.azonosito, szavazat: 'Tamogat' }, kezdet);

  const esemenyek = [t, p, j, sz];
  const a = allapotSzamitasa(esemenyek);
  const javaslatok = javaslatokSzamitasa(a.szamitok, a, kezdet + 10 * NAP);

  return javaslatok.size === 0                       // a javaslat nem számít
      && a.kivetelek.some((k) => k.tipus === 'Javaslat')
      && a.entitasok.get(t.azonosito).cim === 'A más tartalma';
});

proba('A GAZDA javaslata viszont számít', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const t = await gazda.tesz('TartalomLetrehozas', { cim: 'A saját tartalmam', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);
  const j = await gazda.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, muvelet: 'Modositas',
    valtozas: { cim: 'Jobb cím' }
  }, kezdet);

  const a = allapotSzamitasa([t, p, j]);
  const javaslatok = javaslatokSzamitasa(a.szamitok, a, kezdet + 10 * NAP);
  return javaslatok.size === 1 && a.kivetelek.length === 0;
});

proba('⭐ A jogosultság a SAJÁT LÁNCBAN dől el — az utólagos tudatpont nem menti meg', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const kesolekedo = await ujEember();

  const t = await gazda.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  // Előbb a javaslat, UTÁNA a tudatpont — a saját láncában ebben a sorrendben
  const j = await kesolekedo.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, valtozas: { cim: 'Más' }
  }, kezdet);
  const kesoiPont = await kesolekedo.tesz('TudatpontRendezes',
    { entitas: t.azonosito, pont: 50 }, kezdet);

  const a = allapotSzamitasa([t, p, j, kesoiPont]);
  // A javaslat kiesett, a tudatpontja viszont ÉRVÉNYES (nem büntetjük, csak nem számít)
  return a.kivetelek.length === 1
      && a.kivetelek[0].tipus === 'Javaslat'
      && a.entitasok.get(t.azonosito).osszesPont === 150;
});

proba('A pontját ELVEVŐ (0 pontos) sem tehet javaslatot', async () => {
  const kezdet = Date.UTC(2026, 0, 1);
  const gazda = await ujEember();
  const volt = await ujEember();

  const t = await gazda.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 }, kezdet);
  const p = await gazda.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 100 }, kezdet);

  const beszall = await volt.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 20 }, kezdet);
  const kiszall = await volt.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 0 }, kezdet);
  const j = await volt.tesz('Javaslat', {
    fajta: 'szerkesztesi', erintett: t.azonosito, valtozas: { cim: 'Más' }
  }, kezdet);

  const a = allapotSzamitasa([t, p, beszall, kiszall, j]);
  return a.kivetelek.length === 1 && a.kivetelek[0].tipus === 'Javaslat';
});

// ===== D19: BEJELENT, NEM BÜNTET =====

proba('⭐ A szabálysértő esemény NEM tűnik el — a kivételek felsorolják, indoklással', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const tul = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 999999 });

  const a = allapotSzamitasa([t, tul]);
  const k = a.kivetelek[0];
  return k.azonosito === tul.azonosito
      && k.szerzo === anna.szerzo
      && typeof k.ok === 'string' && k.ok.length > 0
      && a.esemenyDarab === 2 && a.szamitoDarab === 1;   // a bemenetből semmi nem veszett el
});

proba('A szabálysértés nem viszi magával a szerző TÖBBI eseményét', async () => {
  const anna = await ujEember();
  const egyik = await anna.tesz('TartalomLetrehozas', { cim: 'Egyik', meret: 10 });
  const tul = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 999999 });
  const jo = await anna.tesz('TudatpontRendezes', { entitas: egyik.azonosito, pont: 100 });

  const a = allapotSzamitasa([egyik, tul, jo]);
  return a.kivetelek.length === 1 && a.entitasok.get(egyik.azonosito).osszesPont === 100;
});

// ===== DETERMINIZMUS =====

proba('⭐ A SORREND NEM SZÁMÍT: kevert események, ugyanazok a kivételek', async () => {
  const anna = await ujEember();
  const t = await anna.tesz('TartalomLetrehozas', { cim: 'Alap', meret: 10 });
  const p1 = await anna.tesz('TudatpontRendezes', { entitas: t.azonosito, pont: 9000 });
  const t2 = await anna.tesz('TartalomLetrehozas', { cim: 'Másik', meret: 10 });
  const p2 = await anna.tesz('TudatpontRendezes', { entitas: t2.azonosito, pont: 9000 });

  const egyenes = szabalyokErvenyesitese([t, p1, t2, p2]);
  const forditva = szabalyokErvenyesitese([p2, t2, p1, t]);

  return JSON.stringify(egyenes.kivetelek) === JSON.stringify(forditva.kivetelek)
      && egyenes.kivetelek.length === 1;
});

export default futtatas;
