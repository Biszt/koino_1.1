// koino/meres/esemenyProba.js — az esemény-réteg önpróbája (Szakasz 1 / 3. lépés)
//
// Azt bizonyítja, hogy egy esemény hamisíthatatlan: bármit írunk át benne, az ellenőrzés
// bukik — és hogy a kettős cselekvés leleplezhető.

import { esemenyLetrehozasa, esemenyEllenorzese, elagazasE, bejelentesHelyei } from '../js/esemeny/esemeny.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('Az aláírt esemény próbája');

// Két külön kulcspár: egy „sajátunk" és egy „idegen", a hamisítás próbájához
const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const idegenKulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);

// Egy minta-esemény, amivel a legtöbb próba dolgozik
const alapLeiras = {
  koino: 'proba-koino',
  tipus: 'GondolatLetrehozas',
  adat: { cim: 'Az első gondolat', szoveg: 'Árvíztűrő tükörfúrógép' },
  elozo: null,
  sorszam: 1
};
const esemeny = await esemenyLetrehozasa(alapLeiras, kulcspar);

/** Segéd: egy nyilvános kulcs szöveges alakja. */
async function szerzoje(kp) {
  const nyers = await crypto.subtle.exportKey('raw', kp.publicKey);
  let sz = ''; for (const b of new Uint8Array(nyers)) sz += String.fromCharCode(b);
  return btoa(sz).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ===== A HELYES ESET =====

// ⭐⭐ D85/1, D85/3 (2026-10-02): HOVA JELENTJÜK BE AZ ESEMÉNYT a saját szeletén kívül — a születést a
// szülőnél, a javaslatot MINDEN érintettjénél, a szavazatot a jogának bizonyítéka szerint (és csak a
// lánc-gyökeres szavazatét: azt ellenőrzi a kapu). Csak azonosító alakú kulcs, és a saját szelet nem.
proba('⭐⭐ D85: a BEJELENTÉS HELYEI — születés a szülőnél, javaslat minden érintettnél, szavazat a bizonyítékánál',
  async () => {
    const [A, B, J, T, S] = ['A', 'B', 'J', 'T', 'S'].map((b) => b.repeat(43));
    const egyenlo = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const gyoker = bejelentesHelyei({ tipus: 'GondolatLetrehozas', azonosito: A, entitas: null, adat: { cim: 'x' } });
    const gyerek = bejelentesHelyei({ tipus: 'GondolatLetrehozas', azonosito: B, entitas: null, adat: { szulo: A } });
    const javaslat = bejelentesHelyei({ tipus: 'Javaslat', azonosito: J, entitas: null,
      adat: { erintettek: [{ entitas: B }, { entitas: A }, { entitas: A }, { entitas: 'nem-azonosito' }] } });
    const regiJavaslat = bejelentesHelyei({ tipus: 'Javaslat', azonosito: J, entitas: null, adat: { erintett: A } });
    const bizonyitek = { [A]: {}, [J]: {}, [T]: {}, rossz: {} };
    const szavazat = bejelentesHelyei({ tipus: 'Szavazat', azonosito: S, entitas: J, lancGyoker: { naplo: {}, kiosztas: {} },
      adat: { javaslat: J, bizonyitek } });
    const gyokerNelkul = bejelentesHelyei({ tipus: 'Szavazat', azonosito: S, entitas: J, lancGyoker: null,
      adat: { javaslat: J, bizonyitek } });
    const pont = bejelentesHelyei({ tipus: 'TudatpontRendezes', azonosito: S, entitas: A, adat: { entitas: A } });
    return egyenlo(gyoker, ['']) && egyenlo(gyerek, [A])
      && egyenlo(javaslat, [A, B].sort())            // ismétlés és nem-azonosító nélkül
      && egyenlo(regiJavaslat, [A])                  // a régi (egy-érintettes) alak is
      && egyenlo(szavazat, [A, T].sort())            // a saját szelete (J) és a „rossz" kulcs nélkül
      && gyokerNelkul.length === 0                   // ⛔ gyökér nélkül a bizonyíték nem jelent be
      && pont.length === 0;
  });

proba('A frissen létrehozott esemény ellenőrzése RENDBEN', async () => {
  const e = await esemenyEllenorzese(esemeny);
  return e.rendben === true;
});

// ===== HAMISÍTÁSI KÍSÉRLETEK — mindegyiknek BUKNIA kell =====

proba('A GONDOLAT átírása bukik', async () => {
  const hamis = { ...esemeny, adat: { ...esemeny.adat, cim: 'Átírt cím' } };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('A SZERZŐ átírása bukik (más nevében nem lehet aláírni)', async () => {
  const hamis = { ...esemeny, szerzo: await szerzoje(idegenKulcspar) };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('Az IDŐ átírása bukik', async () => {
  const hamis = { ...esemeny, ido: esemeny.ido + 1 };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('A SORSZÁM átírása bukik', async () => {
  const hamis = { ...esemeny, sorszam: 99 };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('Az AZONOSÍTÓ meghamisítása bukik', async () => {
  const hamis = { ...esemeny, azonosito: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('Az ALÁÍRÁS egyetlen karakterének átírása bukik', async () => {
  const elso = esemeny.alairas[0] === 'A' ? 'B' : 'A';
  const hamis = { ...esemeny, alairas: elso + esemeny.alairas.slice(1) };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

proba('IDEGEN kulccsal aláírt, de a mi nevünkre írt esemény bukik', async () => {
  // A támadó a saját kulcsával ír alá, de a `szerzo` mezőbe a MI kulcsunkat teszi
  const idegenEsemeny = await esemenyLetrehozasa(alapLeiras, idegenKulcspar);
  const hamis = { ...idegenEsemeny, szerzo: await szerzoje(kulcspar) };
  return (await esemenyEllenorzese(hamis)).rendben === false;
});

// ===== A SAJÁT LÁNC =====

proba('A lánc FOLYTATÁSA nem ellentmondás (a szavazat módosítható)', async () => {
  const masodik = await esemenyLetrehozasa(
    { ...alapLeiras, sorszam: 2, elozo: esemeny.azonosito, adat: { cim: 'Második' } },
    kulcspar
  );
  return elagazasE(esemeny, masodik) === false;
});

proba('A lánc ELÁGAZÁSA ellentmondás (kettős cselekvés lelepleződik)', async () => {
  // Ugyanaz a szerző, ugyanaz a sorszám, MÁS gondolat → két aláírás ugyanarról a pontról
  const masik = await esemenyLetrehozasa(
    { ...alapLeiras, adat: { cim: 'Titokban másik' } },
    kulcspar
  );
  const mindketto = (await esemenyEllenorzese(esemeny)).rendben
                 && (await esemenyEllenorzese(masik)).rendben;
  // A LÉNYEG: mindkettő ÉRVÉNYES aláírás — épp ezért bizonyítják együtt a csalást
  return mindketto && elagazasE(esemeny, masik) === true;
});

proba('Két KÜLÖNBÖZŐ ember azonos sorszáma nem elágazás', async () => {
  const masikEmbere = await esemenyLetrehozasa(alapLeiras, idegenKulcspar);
  return elagazasE(esemeny, masikEmbere) === false;
});

// ===== A SZIGORÍTÁS ÉRVÉNYESÜL =====

proba('TÖRT szám az adatban már a létrehozáskor hibát dob', async () => {
  try {
    await esemenyLetrehozasa({ ...alapLeiras, adat: { arany: 66.7 } }, kulcspar);
    return false;
  } catch (h) { return h.message.includes('EGÉSZ'); }
});

// ⛔⛔ D77 (2026-09-27, Csaba — az átnézés mérése nyomán): az `entitas` és a születés `szulo`-ja
// SZELET-KULCS, amit a csere a vonalon kimond — ezért csak azonosító alakú (43 base64url jel) vagy
// null lehet. Előtte bármilyen szöveg átjutott, és egyetlen ilyen esemény a társsal folytatott
// minden cserét megakasztotta (a csere próbája: `csereProba.js`, „KI NEM MONDHATÓ”).
// ⚠️ Mindkét próba a HELYES alakot is beengedi — különben egy mindent elutasító kapu is átmenne.

proba('⛔⛔ D77: a nem azonosító alakú ENTITAS-t a kapu elutasítja — az azonosító alakút beengedi', async () => {
  const rossz = ['x', '', 'a'.repeat(42), 'a'.repeat(44), 'a'.repeat(42) + '/', 'a'.repeat(42) + '='];
  for (const entitas of rossz) {
    const e = await esemenyLetrehozasa(
      { ...alapLeiras, tipus: 'TudatpontRendezes', adat: { pont: 1 }, entitas }, kulcspar);
    const ered = await esemenyEllenorzese(e);
    if (ered.rendben || !ered.ok.includes('entitas')) return false;
  }
  const jo = await esemenyLetrehozasa(
    { ...alapLeiras, tipus: 'TudatpontRendezes', adat: { pont: 1 }, entitas: esemeny.azonosito }, kulcspar);
  return (await esemenyEllenorzese(jo)).rendben === true;
});

proba('⛔⛔ D77: a gondolat nem azonosító alakú SZULO-ját a kapu elutasítja — a null és az azonosító mehet', async () => {
  for (const szulo of ['x', '', 5, 'a'.repeat(44)]) {
    const e = await esemenyLetrehozasa({ ...alapLeiras, adat: { ...alapLeiras.adat, szulo } }, kulcspar);
    const ered = await esemenyEllenorzese(e);
    if (ered.rendben || !ered.ok.includes('szulo')) return false;
  }
  for (const szulo of [null, esemeny.azonosito]) {
    const e = await esemenyLetrehozasa({ ...alapLeiras, adat: { ...alapLeiras.adat, szulo } }, kulcspar);
    if (!(await esemenyEllenorzese(e)).rendben) return false;
  }
  // ⭐ Csak a SZÜLETÉSRE vonatkozik: más típus `szulo`-ja (pl. a kategória-fa) nem szelet-kulcs.
  const kategoria = await esemenyLetrehozasa(
    { ...alapLeiras, tipus: 'KategoriaLetrehozas', adat: { nev: 'K', szulo: 'x' } }, kulcspar);
  return (await esemenyEllenorzese(kategoria)).rendben === true;
});

// ===== TÁJÉKOZTATÓ MÉRÉS =====

proba('Egy esemény mérete ésszerű (< 1 KB)', async () => {
  const meret = new TextEncoder().encode(JSON.stringify(esemeny)).length;
  console.log('    (egy esemény mérete: ' + meret + ' bájt)');
  return meret < 1024;
});

export default futtatas;
