// koino/meres/meghivoProba.js — A MEGHÍVÓ SZÖVEGE ÉS AZ ELLENŐRZŐ KÓD önpróbája (D121 — a meghívás a lapon)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a meghívó szöveg (MH1, MH2 (A)) és az ellenőrző kód (MH3 (A)) a D121 szerint jár:
//   · a meghívó visszaolvasva ugyanazt adja (a koinó, a készülék tábla-aláírója, a címek, a megnevezés), és rövid marad;
//   · a beillesztett üzenet körülötte lévő szövege nem zavar, és a tördelt sor is olvasható;
//   · ⛔ a hibás meghívóból semmi nem lesz (előtag, jelek, tartalom, a nevek és a címek alakja, a hossz) — kimondott okkal;
//   · a készítés a rossz címet és az ismétlést kihagyja, korlátosan; a megnevezés vezérlőjelek nélkül, korlátosan;
//   · az ellenőrző kód: ugyanarra a horgonyra ugyanaz, alakja „XXX-XXX” a kimondható ábécéből, és a különböző horgonyoké
//     gyakorlatilag mind különböző.

import { randomBytes } from 'node:crypto';
import {
  meghivoKeszitese, meghivoOlvasasa, meghivoE, ellenorzoKod, MEGHIVO_ELOTAG, MEGHIVO_CIM_KORLAT, MEGHIVO_KORLAT
} from '../js/csere/meghivo.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A MEGHÍVÓ SZÖVEGE ÉS AZ ELLENŐRZŐ KÓD (D121)');

const K = '9FaeeJv2BY7MpvGA48dw2HPeE8IvHapGvU7NzXaCrTQ';
const T = '6YJn2U02Y3f6TiAoF9JBdCZyhK7BqP4Ye6bEIZDHLjU';
const CIMEK = [{ hoszt: '192.168.1.134', port: 7373 }, { hoszt: '31.46.248.159', port: 65205 }];
const azonosito = () => randomBytes(32).toString('base64url');
const nyersMeghivo = (j) => MEGHIVO_ELOTAG + Buffer.from(JSON.stringify(j), 'utf8').toString('base64url');

// Rontás: a megnevezés vagy a címek kimaradnak a szövegből → bukik.
proba('⭐ a meghívó visszaolvasva ugyanazt adja — a koinó, a készülék tábla-aláírója, a címek, a megnevezés — és rövid marad', () => {
  const sz = meghivoKeszitese({ koino: K, alairo: T, cimek: CIMEK, nev: 'Csaba laptopja' });
  const r = meghivoOlvasasa(sz);
  return sz.startsWith(MEGHIVO_ELOTAG) && sz.length < 400 && /^[A-Za-z0-9_:-]+$/.test(sz) && meghivoE(sz)
    && r.meghivo?.koino === K && r.meghivo.alairo === T && r.meghivo.nev === 'Csaba laptopja'
    && JSON.stringify(r.meghivo.cimek) === JSON.stringify(CIMEK);
});

// Rontás: az olvasás csak a szöveg elejéről (előtag-egyezéssel) → a körülvett bukik; a szóköz-kihagyó második próba nélkül a
// tördelt bukik.
proba('⭐ a beillesztett üzenet körülötte lévő szövege nem zavar, és a sorokra tördelt meghívó is olvasható', () => {
  const sz = meghivoKeszitese({ koino: K, alairo: T, cimek: CIMEK, nev: 'Anna' });
  const korulotte = meghivoOlvasasa('Szia! Ez a meghívóm: ' + sz + ' — köszi, várlak!\n');
  const veggel = meghivoOlvasasa(sz + '. Holnap találkozunk.');
  const torzs = sz.slice(MEGHIVO_ELOTAG.length);
  const tordelt = meghivoOlvasasa(MEGHIVO_ELOTAG + torzs.slice(0, 40) + '\n' + torzs.slice(40, 90) + '\r\n ' + torzs.slice(90));
  return korulotte.meghivo?.koino === K && korulotte.meghivo.nev === 'Anna'
    && veggel.meghivo?.alairo === T
    && tordelt.meghivo?.koino === K && tordelt.meghivo.cimek.length === 2;
});

// Rontás: az alak-ellenőrzések bármelyike nélkül a megfelelő hibás meghívó „ép” lesz → bukik.
proba('⛔ a hibás meghívóból semmi nem lesz — előtag, jelek, tartalom, a koinó és a kulcs alakja, a címek, a hossz — kimondott okkal', () => {
  const jo = { k: K, t: T, c: [['192.168.1.134', 7373]] };
  const esetek = [
    'koino-meghivo:2:' + Buffer.from(JSON.stringify(jo)).toString('base64url'),       // más változat
    K,                                                                                  // puszta név
    MEGHIVO_ELOTAG + '!!!!',                                                            // rossz jelek
    MEGHIVO_ELOTAG + Buffer.from('nem json').toString('base64url'),                     // nem JSON
    nyersMeghivo([1, 2, 3]),                                                            // nem objektum
    nyersMeghivo({ ...jo, k: 'rovid' }),                                                // a koinó nem 43 jeles
    nyersMeghivo({ ...jo, t: 'x'.repeat(42) }),                                         // a kulcs nem ép
    nyersMeghivo({ ...jo, c: [['192.168.1.134', 70000]] }),                             // rossz port
    nyersMeghivo({ ...jo, c: [['rossz cím', 7373]] }),                                  // rossz hoszt
    nyersMeghivo({ ...jo, c: 'x' }),                                                    // a címek nem lista
    nyersMeghivo({ ...jo, c: Array.from({ length: MEGHIVO_CIM_KORLAT + 1 }, (_, i) => ['10.0.0.' + i, 7373]) }), // túl sok
    nyersMeghivo({ ...jo, n: 42 }),                                                     // a megnevezés nem szöveg
    nyersMeghivo({ ...jo, n: 'x'.repeat(MEGHIVO_KORLAT) })                              // túl hosszú
  ];
  const eredmenyek = esetek.map((e) => meghivoOlvasasa(e));
  const rossz = eredmenyek.filter((r) => r.meghivo || typeof r.hiba !== 'string' || !r.hiba);
  if (rossz.length) process.stderr.write('    (hibás meghívó elfogadva: ' + JSON.stringify(eredmenyek) + ')\n');
  return rossz.length === 0 && meghivoOlvasasa(nyersMeghivo(jo)).meghivo?.koino === K
    && meghivoOlvasasa(null).hiba && !meghivoE(K);
});

// Rontás: a készítés nem szűr → a rossz cím vagy az ismétlés a szövegbe kerül, és a beolvasás az egészet elveti → bukik.
proba('a készítés a rossz címet és az ismétlést kihagyja (legfeljebb 8); a megnevezés vezérlőjelek nélkül, 64 jelig; a rossz koinó hiba', () => {
  const cimek = [...CIMEK, CIMEK[0], { hoszt: 'rossz cím', port: 1 }, { hoszt: '10.0.0.1', port: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ hoszt: '10.1.1.' + i, port: 7373 }))];
  const r = meghivoOlvasasa(meghivoKeszitese({ koino: K, alairo: T, cimek, nev: '  Anna\u0007 telefonja\n' + 'é'.repeat(100) }));
  let dobott = 0;
  try { meghivoKeszitese({ koino: 'rossz', alairo: T }); } catch { dobott++; }
  try { meghivoKeszitese({ koino: K, alairo: '' }); } catch { dobott++; }
  return r.meghivo?.cimek.length === MEGHIVO_CIM_KORLAT && r.meghivo.cimek[0].hoszt === '192.168.1.134'
    && !r.meghivo.cimek.some((c) => c.hoszt === 'rossz cím' || c.port === 0)
    && !/\p{Cc}/u.test(r.meghivo.nev) && [...r.meghivo.nev].length <= 64 && r.meghivo.nev.startsWith('Anna')
    && meghivoOlvasasa(meghivoKeszitese({ koino: K, alairo: T })).meghivo?.cimek.length === 0 && dobott === 2;
});

// Rontás: a kód nem a horgonyból (pl. véletlen) → nem determinisztikus → bukik; kevesebb bit → sok ütközés → bukik.
proba('⭐ az ellenőrző kód: ugyanarra a horgonyra ugyanaz, „XXX-XXX” a kimondható ábécéből, és 2000 horgonyé gyakorlatilag mind különböző', () => {
  const h = azonosito();
  const minta = /^[0-9A-HJKMNP-TV-Z]{3}-[0-9A-HJKMNP-TV-Z]{3}$/;
  const kodok = new Set();
  let jo = true;
  for (let i = 0; i < 2000; i++) {
    const k = ellenorzoKod(azonosito());
    if (!minta.test(k)) jo = false;
    kodok.add(k);
  }
  // 2000 kód 2^30 lehetőségből: az ütközés esélye ~0,2% — legfeljebb egyet engedünk.
  return jo && ellenorzoKod(h) === ellenorzoKod(h) && minta.test(ellenorzoKod(h)) && kodok.size >= 1999
    && ellenorzoKod('rossz') === null && ellenorzoKod(null) === null;
});

export default futtatas;
