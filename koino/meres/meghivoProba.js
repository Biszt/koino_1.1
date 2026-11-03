// koino/meres/meghivoProba.js — A MEGHÍVÓ SZÖVEGE ÉS A BIZONYÍTÉK önpróbája (D121, D122 — a meghívás a lapon)

// Mit bizonyít ez a lap?
//
// ⭐ Hogy a meghívó szöveg (D122) és a bizonyíték a döntés szerint jár:
//   · a meghívó visszaolvasva ugyanazt adja (a koinó, a készülék tábla-aláírója, a címek, az azonosító és a titok, a meghívott
//     neve, a lejárat, a kötelező profil-mezők), és egy üzenetben elfér;
//   · a beillesztett üzenet körülötte lévő szövege — a TELEPÍTŐ SOR is — nem zavar, és a tördelt sor is olvasható;
//   · ⛔ a hibás meghívóból semmi nem lesz (előtag, jelek, tartalom, a nevek, a címek, a titok, a név, a lejárat, a hossz) —
//     kimondott okkal; a régi alakú (D121, titok nélküli) meghívó a „kérj újat” okkal;
//   · a készítés a rossz címet és az ismétlést kihagyja, korlátosan; a meghívott neve kötelező;
//   · ⭐ a bizonyíték: a helyes titokkal készült elfogadható, és a koinóra, a SZEMÉLYRE és a HORGONYRA kötött — bármelyik más,
//     vagy más a titok: elutasítva (másra nem másolható át).

import { randomBytes } from 'node:crypto';
import {
  meghivoKeszitese, meghivoOlvasasa, meghivoE, telepitoSorMeghivoval, meghivoBizonyitek, bizonyitekEllenorzese, ujMeghivoJelei,
  MEGHIVO_ELOTAG, MEGHIVO_CIM_KORLAT, MEGHIVO_KORLAT, MEGHIVO_ELETTARTAM, TELEPITO_SOR
} from '../js/csere/meghivo.js';
import { probaGyujtemeny } from './probaFuttato.js';

const { proba, futtatas } = probaGyujtemeny('A MEGHÍVÓ SZÖVEGE ÉS A BIZONYÍTÉK (D121, D122)');

const K = '9FaeeJv2BY7MpvGA48dw2HPeE8IvHapGvU7NzXaCrTQ';
const T = '6YJn2U02Y3f6TiAoF9JBdCZyhK7BqP4Ye6bEIZDHLjU';
const CIMEK = [{ hoszt: '192.168.1.134', port: 7373 }, { hoszt: '31.46.248.159', port: 65205 }];
const azonosito = () => randomBytes(32).toString('base64url');
const LEJAR = Date.UTC(2026, 11, 2);
const jelek = ujMeghivoJelei();
const alap = () => ({ koino: K, alairo: T, cimek: CIMEK, azonosito: jelek.azonosito, titok: jelek.titok,
  meghivottNev: 'Kovács Anna', lejarat: LEJAR });
const nyersMeghivo = (j) => MEGHIVO_ELOTAG + Buffer.from(JSON.stringify(j), 'utf8').toString('base64url');
const jo = () => ({ k: K, t: T, c: [['192.168.1.134', 7373]], i: jelek.azonosito, s: jelek.titok, m: 'Kovács Anna', l: LEJAR });

// Rontás: a titok, a név, a lejárat vagy a profil-mezők kimaradnak a szövegből → bukik.
proba('⭐ a meghívó visszaolvasva ugyanazt adja — a koinó, a kulcs, a címek, az azonosító és a titok, a meghívott neve, a lejárat, a profil-mezők', () => {
  const sz = meghivoKeszitese({ ...alap(), profilMezok: ['nev', 'telepules'] });
  const r = meghivoOlvasasa(sz);
  return sz.startsWith(MEGHIVO_ELOTAG) && sz.length < 600 && /^[A-Za-z0-9_:-]+$/.test(sz) && meghivoE(sz)
    && r.meghivo?.koino === K && r.meghivo.alairo === T && r.meghivo.azonosito === jelek.azonosito
    && r.meghivo.titok === jelek.titok && r.meghivo.meghivottNev === 'Kovács Anna' && r.meghivo.lejarat === LEJAR
    && r.meghivo.profilMezok.join() === 'nev,telepules' && JSON.stringify(r.meghivo.cimek) === JSON.stringify(CIMEK)
    && MEGHIVO_ELETTARTAM === 30 * 24 * 3600 * 1000;
});

// Rontás: az olvasás csak a szöveg elejéről → a telepítő sorral és a körülvett üzenettel bukik; a szóköz-kihagyó második próba
// nélkül a tördelt bukik.
proba('⭐ a TELEPÍTŐ SOR a meghívóval egy szöveg, és a lap ebből is kiolvassa — a körülvett és a tördelt meghívó is olvasható', () => {
  const sz = meghivoKeszitese(alap());
  const sor = telepitoSorMeghivoval(sz);
  const torzs = sz.slice(MEGHIVO_ELOTAG.length);
  const tordelt = meghivoOlvasasa(MEGHIVO_ELOTAG + torzs.slice(0, 40) + '\n' + torzs.slice(40, 90) + '\r\n ' + torzs.slice(90));
  return sor.startsWith(TELEPITO_SOR + ' ') && sor.endsWith(sz)
    && meghivoOlvasasa(sor).meghivo?.titok === jelek.titok
    && meghivoOlvasasa('Szia! Ez a meghívóm: ' + sz + ' — köszi!\n').meghivo?.koino === K
    && meghivoOlvasasa(sz + '. Holnap találkozunk.').meghivo?.alairo === T
    && tordelt.meghivo?.koino === K && tordelt.meghivo.cimek.length === 2;
});

// Rontás: az alak-ellenőrzések bármelyike nélkül a megfelelő hibás meghívó „ép” lesz → bukik.
proba('⛔ a hibás meghívóból semmi nem lesz — előtag, jelek, tartalom, a nevek, a címek, a titok, a név, a lejárat, a hossz; a régi alakú: „kérj újat”', () => {
  const esetek = [
    K,                                                                                  // puszta név
    MEGHIVO_ELOTAG + '!!!!',                                                            // rossz jelek
    MEGHIVO_ELOTAG + Buffer.from('nem json').toString('base64url'),                     // nem JSON
    nyersMeghivo([1, 2, 3]),                                                            // nem objektum
    nyersMeghivo({ ...jo(), k: 'rovid' }),                                              // a koinó nem 43 jeles
    nyersMeghivo({ ...jo(), t: 'x'.repeat(42) }),                                       // a kulcs nem ép
    nyersMeghivo({ ...jo(), c: [['192.168.1.134', 70000]] }),                           // rossz port
    nyersMeghivo({ ...jo(), c: Array.from({ length: MEGHIVO_CIM_KORLAT + 1 }, (_, i) => ['10.0.0.' + i, 7373]) }), // túl sok
    nyersMeghivo({ ...jo(), i: 'rövid' }),                                              // rossz azonosító
    nyersMeghivo({ ...jo(), s: 'tul-rovid' }),                                          // rossz titok
    nyersMeghivo({ ...jo(), m: '   ' }),                                                // nincs név
    nyersMeghivo({ ...jo(), l: -5 }),                                                   // rossz lejárat
    nyersMeghivo({ ...jo(), p: ['Nev!'] }),                                             // rossz profil-mező
    nyersMeghivo({ ...jo(), m: 'x'.repeat(MEGHIVO_KORLAT) })                            // túl hosszú
  ];
  const eredmenyek = esetek.map((e) => meghivoOlvasasa(e));
  const rossz = eredmenyek.filter((r) => r.meghivo || typeof r.hiba !== 'string' || !r.hiba);
  const regi = meghivoOlvasasa('koino-meghivo:1:' + Buffer.from(JSON.stringify({ k: K, t: T, c: [] })).toString('base64url'));
  if (rossz.length) process.stderr.write('    (hibás meghívó elfogadva: ' + JSON.stringify(eredmenyek) + ')\n');
  return rossz.length === 0 && meghivoOlvasasa(nyersMeghivo(jo())).meghivo?.koino === K
    && /régi alakú/.test(regi.hiba ?? '') && meghivoOlvasasa(null).hiba && !meghivoE(K);
});

// Rontás: a készítés nem szűr → a rossz cím vagy az ismétlés a szövegbe kerül, és a beolvasás az egészet elveti → bukik.
proba('a készítés a rossz címet és az ismétlést kihagyja (legfeljebb 8); a meghívott neve kötelező; a rossz koinó és titok hiba', () => {
  const cimek = [...CIMEK, CIMEK[0], { hoszt: 'rossz cím', port: 1 }, { hoszt: '10.0.0.1', port: 0 },
    ...Array.from({ length: 12 }, (_, i) => ({ hoszt: '10.1.1.' + i, port: 7373 }))];
  const r = meghivoOlvasasa(meghivoKeszitese({ ...alap(), cimek }));
  let dobott = 0;
  for (const rossz of [{ koino: 'rossz' }, { alairo: '' }, { meghivottNev: '  ' }, { titok: 'x' }, { lejarat: 0 }]) {
    try { meghivoKeszitese({ ...alap(), ...rossz }); } catch { dobott++; }
  }
  return r.meghivo?.cimek.length === MEGHIVO_CIM_KORLAT && r.meghivo.cimek[0].hoszt === '192.168.1.134'
    && !r.meghivo.cimek.some((c) => c.hoszt === 'rossz cím' || c.port === 0) && dobott === 5;
});

// Rontás: a bizonyíték nem köti a személyt (vagy a horgonyt, a koinót) → egy másik belépőé is elfogadható → bukik; a titok nem
// számít → a rossz titokkal készült is elfogadható → bukik.
proba('⭐⭐ a bizonyíték: a helyes titokkal elfogadható; a koinóra, a SZEMÉLYRE és a HORGONYRA kötött — más, vagy más titok: elutasítva', () => {
  const kotes = { koino: K, szemely: azonosito(), horgony: azonosito() };
  const b = meghivoBizonyitek(jelek.titok, kotes);
  const masTitok = ujMeghivoJelei().titok;
  return bizonyitekEllenorzese(jelek.titok, b, kotes)
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, szemely: azonosito() })
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, horgony: azonosito() })
    && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, koino: T })
    && !bizonyitekEllenorzese(masTitok, b, kotes)
    && !bizonyitekEllenorzese(jelek.titok, meghivoBizonyitek(masTitok, kotes), kotes)
    && !bizonyitekEllenorzese(jelek.titok, 'rossz', kotes) && !bizonyitekEllenorzese(jelek.titok, b, { ...kotes, horgony: 'x' })
    && /^[A-Za-z0-9_-]{43}$/.test(b) && ujMeghivoJelei().azonosito !== jelek.azonosito;
});

export default futtatas;
