// koino/meres/esemenyProba.js — az esemény-réteg önpróbája (Szakasz 1 / 3. lépés)
//
// Azt bizonyítja, hogy egy esemény hamisíthatatlan: bármit írunk át benne, az ellenőrzés
// bukik — és hogy a kettős cselekvés leleplezhető.

import { esemenyLetrehozasa, esemenyEllenorzese, elagazasE } from '../js/esemeny/esemeny.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('Az aláírt esemény próbája');

// Két külön kulcspár: egy „sajátunk" és egy „idegen", a hamisítás próbájához
const kulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const idegenKulcspar = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);

// Egy minta-esemény, amivel a legtöbb próba dolgozik
const alapLeiras = {
  koino: 'proba-koino',
  tipus: 'TartalomLetrehozas',
  adat: { cim: 'Az első tartalom', szoveg: 'Árvíztűrő tükörfúrógép' },
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

proba('A frissen létrehozott esemény ellenőrzése RENDBEN', async () => {
  const e = await esemenyEllenorzese(esemeny);
  return e.rendben === true;
});

// ===== HAMISÍTÁSI KÍSÉRLETEK — mindegyiknek BUKNIA kell =====

proba('A TARTALOM átírása bukik', async () => {
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
  // Ugyanaz a szerző, ugyanaz a sorszám, MÁS tartalom → két aláírás ugyanarról a pontról
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

// ===== TÁJÉKOZTATÓ MÉRÉS =====

proba('Egy esemény mérete ésszerű (< 1 KB)', async () => {
  const meret = new TextEncoder().encode(JSON.stringify(esemeny)).length;
  console.log('    (egy esemény mérete: ' + meret + ' bájt)');
  return meret < 1024;
});

export default futtatas;
