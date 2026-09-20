// koino/meres/tablaProba.js

// Felelősség: A HIRDETŐTÁBLA rétegének önpróbái (2026-09-20).
//
// ⭐ MIT BIZONYÍT EZ A LAP:
//   (1) amit az egyik fél kiír, azt a TÁRSA kibontja — a titok küldése nélkül;
//   (2) egy HARMADIK nem tudja kibontani, sőt **a rekeszt sem találja meg** (a só a két
//       nyilvános kulcsból jön);
//   (3) a rekesz mindkét oldalon UGYANAZ — különben elbeszélnénk egymás mellett;
//   (4) ami nem a mi alakunk, az nem cím (D19: a hiány és a szemét nem ugyanaz).
//
// ⚠️ Hálózat nincs benne (1. szabály): a bejegyzést elkészítjük és kibontjuk — hogy a
// DHT-hez hogyan jut el, az a hívó dolga.

import { probaGyujtemeny } from './probaFuttato.js';
import { ujTablaKulcs, nyilvanosResz } from '../js/csere/tablaKulcs.js';
import {
  cimBejegyzes, cimBejegyzesbol, tarsRekesze, rekeszSoKulcsokbol
} from '../js/csere/tabla.js';
import { bejegyzesEllenorzese, valtozoCel } from '../js/csere/dht.js';

const { proba, futtatas } = probaGyujtemeny('A HIRDETŐTÁBLA (2026-09-20)');

/** Két készülék tábla-kulcsa — mindenhol ugyanaz a felállás. */
async function ketKeszulek() {
  const anna = await ujTablaKulcs();
  const bela = await ujTablaKulcs();
  return { anna, bela, annaNy: nyilvanosResz(anna), belaNy: nyilvanosResz(bela) };
}

proba('⭐⭐⭐ AMIT KIÍROK, AZT A TÁRSAM KIBONTJA — a titok küldése nélkül', async () => {
  const { anna, bela, annaNy, belaNy } = await ketKeszulek();

  // Anna hálózatot váltott, és kiírja az új címét Bélának.
  const bejegyzes = await cimBejegyzes(anna, belaNy,
    { hoszt: '130.43.210.126', port: 61389 }, 1_700_000_000_000);

  // Béla a táblán megtalálja, és kibontja.
  const cim = await cimBejegyzesbol(bela, annaNy, bejegyzes.ertek);

  return cim?.hoszt === '130.43.210.126' && cim.port === 61389
    // ⭐ ÉS AZ ALÁÍRÁS IS STIMMEL: a DHT szerint tényleg Anna kulcsa írta alá.
    && await bejegyzesEllenorzese(bejegyzes);
});

proba('⛔⛔ A TÁROLÓ GÉPEK NEM LÁTJÁK A CÍMET — a bejegyzésben nincs benne nyíltan',
  async () => {
    // ⛔ EZ A LÉNYEG (36. mérés): a bejegyzést 7–8 VÉLETLEN internetes gép tárolja. Ha a
    // cím nyíltan benne lenne, ők hónapokon át összefűzhetnék: mikor hol voltál.
    const { anna, belaNy } = await ketKeszulek();
    const bejegyzes = await cimBejegyzes(anna, belaNy,
      { hoszt: '130.43.210.126', port: 61389 });

    const latszik = JSON.stringify({
      ertek: bejegyzes.ertek, k: Buffer.from(bejegyzes.k).toString('base64url'),
      salt: Buffer.from(bejegyzes.salt).toString('base64url')
    });
    return !latszik.includes('130.43.210.126') && !latszik.includes('61389');
  });

proba('⭐⭐ A REKESZ MINDKÉT OLDALON UGYANAZ — különben elbeszélnénk egymás mellett',
  async () => {
    const { anna, bela, annaNy, belaNy } = await ketKeszulek();

    // Anna oda ír, ahol Béla keresni fogja: a kulcs Annáé, a só közös.
    const bejegyzes = await cimBejegyzes(anna, belaNy, { hoszt: '10.0.0.1', port: 7373 });
    const holKeresi = await tarsRekesze(bela, annaNy);

    const hova = await valtozoCel(bejegyzes.k, bejegyzes.salt);
    const honnan = await valtozoCel(holKeresi.kulcs, holKeresi.so);
    return Buffer.compare(hova, honnan) === 0;
  });

proba('⛔⛔⛔ EGY HARMADIK MEG SEM TALÁLJA A REKESZT — és ki sem tudja bontani', async () => {
  const { anna, belaNy, annaNy } = await ketKeszulek();
  const idegen = await ujTablaKulcs();
  const idegenNy = nyilvanosResz(idegen);

  const bejegyzes = await cimBejegyzes(anna, belaNy, { hoszt: '10.0.0.1', port: 7373 });

  // (1) Az idegen sója MÁS — vagyis a DHT-ben más célt számolna, ott pedig nincs semmi.
  const idegenSo = await rekeszSoKulcsokbol({ titkosito: idegen.titkositoNyilvanos }, annaNy);
  const masHely = Buffer.compare(idegenSo, Buffer.from(bejegyzes.salt)) !== 0;

  // (2) És ha valahogy mégis a kezébe kerülne a bejegyzés, nem tudja kibontani.
  const semmi = await cimBejegyzesbol(idegen, annaNy, bejegyzes.ertek);

  // (3) ⚠️ A saját kulcsával aláírva sem tud MÁS nevében írni: az aláírás a kulcsához
  // köti a bejegyzést, és a társ a KÖTÉSBEN rögzített kulcsra kérdez rá.
  const hamis = await cimBejegyzes(idegen, annaNy, { hoszt: '6.6.6.6', port: 6666 });
  const masKulcs = Buffer.compare(Buffer.from(hamis.k), Buffer.from(bejegyzes.k)) !== 0;

  return masHely && semmi === null && masKulcs && !!idegenNy;
});

proba('⛔ AMI NEM A MI ALAKUNK, AZ NEM CÍM — és a rontott bejegyzés sem az (D19)',
  async () => {
    const { anna, bela, annaNy, belaNy } = await ketKeszulek();

    // (1) Helyes titkosítás, de idegen tartalom: ne fogadjuk el címnek.
    const { kozosTitok, titkositva } = await import('../js/csere/tablaKulcs.js');
    const titok = await kozosTitok(anna, belaNy);
    const masfele = await titkositva(titok, JSON.stringify({ alak: 'valami-mas', hoszt: 'x' }));
    const nemCim = await cimBejegyzesbol(bela, annaNy, masfele);

    // (2) Rontott bejegyzés: az AES-GCM elbuktatja, és mi NULL-t adunk, nem szemetet.
    const jo = await cimBejegyzes(anna, belaNy, { hoszt: '10.0.0.1', port: 7373 });
    const rontott = jo.ertek.slice(0, -2) + (jo.ertek.endsWith('A') ? 'BB' : 'AA');
    const semmi = await cimBejegyzesbol(bela, annaNy, rontott);

    // (3) És a porton is van őr: a 0 vagy a 70000 nem port.
    const rosszPort = await titkositva(titok,
      JSON.stringify({ alak: 'koino-cim-1', hoszt: '10.0.0.1', port: 70000 }));
    const nemPort = await cimBejegyzesbol(bela, annaNy, rosszPort);

    return nemCim === null && semmi === null && nemPort === null;
  });

proba('⭐ A FRISSEBB CÍM LEGYŐZI A RÉGIT — a sorszám nő (BEP 44)', async () => {
  const { anna, belaNy } = await ketKeszulek();
  const regi = await cimBejegyzes(anna, belaNy, { hoszt: '10.0.0.1', port: 1 },
    1_700_000_000_000);
  const uj = await cimBejegyzes(anna, belaNy, { hoszt: '10.0.0.2', port: 2 },
    1_700_000_060_000);
  // ⚠️ Ugyanabba a rekeszbe megy (azonos kulcs és só), de nagyobb sorszámmal.
  return uj.seq > regi.seq
    && Buffer.compare(Buffer.from(uj.salt), Buffer.from(regi.salt)) === 0;
});

export default futtatas;

// Önállóan is futtatható: node koino/meres/tablaProba.js
if (process.argv[1] && process.argv[1].endsWith('tablaProba.js')) {
  futtatas().then((eredmeny) => process.exit(eredmeny.bukottak.length ? 1 : 0));
}
