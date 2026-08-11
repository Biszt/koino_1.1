// frontend/js/utils/sikidomTar.js

// ===== A CSOMÓPONT-TÁR KARBANTARTÁSA =====
//
// Felelősség: a Síkidom nézet memóriája KORLÁTOS maradjon — anélkül, hogy a kép
// megváltozna. Ez a modul mondja meg, mit engedünk el a tárból, mit teszünk félre
// és mit adunk vissza; azt NEM, hogy mi hol látszik (az az `_ujrapakolas` és a
// `_lathatoLista` dolga a modálban).
//
// A TÁR maga egy egyszerű `Map` (id → csomópont), amit a modal birtokol; ez a
// modul csak megkapja. Így a nézet többi része változatlanul `this._tar.get(id)`-t
// használ, itt viszont a karbantartás egy helyen, önállóan olvasható.
//
// ===== A KÉT TENGELY (Csaba, 2026-08-11) =====
// Két, egymást NEM helyettesítő szabály tartja korlátosan a tárat:
//
//   MÉRET  (`visszaszedes`) — egy szinten BELÜL hány testvér marad. A kanonikus
//          sorrend VÉGÉRŐL, összefüggő farokként engedünk el.
//   MÉLYSÉG (`osSopres`)    — mely SZINTEK maradnak egyáltalán. A folyosón kívül
//          minden megy, mérettől függetlenül.
//
// ===== MIÉRT NEM VÁLTOZIK A KÉP =====
// A pakoló NÖVEKVŐ méret szerint halad, és minden elem helye kizárólag a nála
// KISEBBEKTŐL függ (ELŐTAG-STABILITÁS). Ezért a sorrend végéről ingyen
// elengedhetünk: visszanagyításkor a pakoló BITRE ugyanazokat a helyeket adja.
// Ez a modul mindenhol ezt a szabályt őrzi — a `pakolasiSorrend`-et használja,
// nem egy külön leírt rendezést.
//
// ⚠️ EGY KIVÉTELLEL: az ős-söprés a sorrend KÖZEPÉBŐL is elenged. Ez ott szabad,
// mert az a szint NEM látszik, és amíg `parkolt`, nem is pakoljuk újra; visszafelé
// jövet pedig a szintet EGYBEN adjuk vissza (`kiparkolas`). Ezt az őrszemet a
// `visszahozatal` első sora tartja: parkolt szintből adagolva TILOS visszaadni.
//
// SZÁNDÉKOSAN nincs DOM-függése: Node-ból egység-tesztelhető — a mérőpróbája a
// `backend/tools/sikidomParkolasProba.mjs` (16 állítás).
// Használja: SikidomModal.js (a Síkidom nézet).

// ===== IMPORTOK =====
import { pakolasiSorrend } from './sikidomPakolas.js';
import { szuloKeretben } from './sikidomHorgony.js';

// ===== MÉRET SZERINTI VISSZASZEDÉS (Csaba, 2026-08-09) =====
// „Mindenképpen sorrendben kell visszaszedni azokat, amik már nincsenek képben —
// vagy darabszám-korláttal, vagy a maximum terület alapján. Amik a külső részről
// tűnnek el, azoknak még a pozíciójukat sem kell tárolni, mert a kifelé építkezés
// az íves elhelyezéssel elég gyors. Nem kell halmozni."
//
// ⚠️ KÉT SZABÁLY, MINDKETTŐ MÉRVE — ezek megsértése szétveri a képet:
//
//  1. CSAK ÖSSZEFÜGGŐ FAROK. Ha egyetlen elemet kihagyunk a sorrend közepéből
//     (például „megvédenénk" a horgonyt az elengedéstől), a maradék FELE új helyre
//     kerül: mérve 599/1199 síkidom mozdult el. A visszaszedés tehát SOHA nem
//     elemenkénti döntés.
//  2. HOLTVERSENY-CSOPORTOT NEM VÁGUNK FÉLBE. Azonos méretűeknél az azonosító
//     dönt; ha a csoport felét megtartjuk, 83 síkidom ugrik el, a legnagyobb
//     elmozdulás 7,78 (a legerősebb gyökér sugarának hétszerese). A tiszta
//     MÉRET-KÜSZÖB ezt magától megoldja: az egyformák együtt lépik át.
//     (A mai teszt-adatban 10 405 gyökérből 9 910 egypontos — csupa holtverseny,
//     tehát ez nem elméleti aggály.)
//
// Ekkora látszó ÁTMÉRŐ fölött szedjük vissza a testvért (a képernyő kisebbik
// oldalának többszöröseként). A horgonyváltás a képernyő KÉTSZERESÉNÉL történik,
// ezért ennél nagyobbnak kell lennie — különben azt szednénk vissza, amibe épp
// belenagyítasz.
export const VISSZASZEDES_ATMERO_ARANY = 4;

// Darabszám-korlát szülőnként: ennyi lerakott gyereknél többet nem tartunk. A
// sorrend VÉGÉRŐL vágunk, ugyanazzal a két szabállyal.
//
// 2026-08-11-en 4000 → 12 000 (Csaba modellje): a lapozásnál a lerakandó ABLAK a
// legkisebbtől nagyjából a 12 000.-ig tart — a fölötte lévők úgyis a maximális méret
// fölött vannak abban a nagyításban. Ezt az ablakot a MÉRETNEK kell vágnia
// (`VISSZASZEDES_ATMERO_ARANY`), nem a darabszámnak; a 4000-es korlát hamarabb
// harapott volna, és a mérettől független — vagyis épp azt a rendet borítaná fel,
// amit a méret-alapú visszaszedés őriz. A darabszám így VÉSZFÉK marad, nem napi korlát.
export const MEGTARTOTT_DARAB = 12_000;

// ===== A MEGTARTÁSI FOLYOSÓ (Csaba, 2026-08-11 — a koino_1.0 nyomán) =====
// Csaba mérése: a 49. szinten állva a tár 5 094 csomópont volt, és ebből 5 040 a
// GYÖKÉR — a tár 99%-a olyan síkidom, ami 49 szinttel a látómezőn kívül van. A
// VILÁG-nál a visszaszedés 60 elemnél megállt, mert a `visszaszedes` csak a
// horgony SZÜLŐJÉNÉL dolgozik: amint a horgony lelépett a 0. szintről, a VILÁG
// már nem volt „a horgony szülője", és ott soha többé nem takarított senki.
//
// A KOINO_1.0 MEGOLDÁSA (`calculators.populateProcessedContents`, hierarchikus ág):
// a munkakészletet szintváltáskor egy FOLYOSÓRA szűkíti — nagyszülő (testvérek
// nélkül), a nagyszülő gyerekei, az aktív csomópont testvérei és azok gyerekei,
// plusz az aktív ág 3 szint mélyen. Minden más kimarad.
//
// MIÉRT 6 ÉS NEM 2 (Csaba választása): a koino_1.0 folyosója a nagyszülőig ér, ami
// a legnagyobb memória-nyereséget adja, de minden egyes kifelé lépésnél
// visszaállítást kíván. Hat szinttel a szokásos ki-be nagyítgatás a folyosón belül
// marad, a nyereség viszont gyakorlatilag ugyanaz (5 040 → néhány száz).
export const FOLYOSO_SZINT = 6;

// ===== AZ ÁGAK ELENGEDÉSE A MEMÓRIÁBÓL (külön kérdés!) =====
// Ez KORÁBBAN ugyanaz a kapcsoló volt, mint a rajzolás-szűrésé
// (`KEPERNYON_KIVULIEK_ELTUNTETESE` a modálban) — pedig két külön dologról szól.
// Csaba döntése arra vonatkozott, hogy a RAJZOLÁS ne hagyjon ki semmit; azzal
// viszont a memória-takarítás is némán megszűnt (a `takaritas` első sora).
//
// A KÖVETKEZMÉNY, amivel számolni kell: a csomópont-tár így MONOTON NŐ, elengedési
// út nincs. Egy hosszú, mélyre nagyító munkamenet minden lerakott csomópontot
// megtart, és a `_lathatoLista` képkockánként végig is olvassa őket. A
// `BETOLTESI_MELYSEG = 4` ezt a növekedést 16-szorosára gyorsította.
//
// `false` marad (a mai viselkedés), de KÜLÖN kapcsolható: ha a nézet hosszú
// használat után belassul, ez az első hely, ahol nézni kell. Bekapcsolva a régóta
// nem látott ágak gyerekei elengedődnek (a helyük NEM vész el: a szülő „még nem
// töltöttük be" állapotba áll vissza, és újra letöltődik).
//
// ⚠️ Ez ma a MÉLYSÉG szerinti ős-söprés (`osSopres`) miatt nem hiányzik: a tár
// növekedését az tartja kordában, méret-alapú társával együtt.
export const AGAK_ELENGEDESE = false;

// Ennyi képkockán át nem látott ág gyerekeit engedjük el
export const ELENGEDES_TURELEM = 240;

// A gerinc-bejárás alapértelmezett felső korlátja. A söprés/kiparkolás csak az
// első `FOLYOSO_SZINT` környékét nézi, ezért ott bőven elég — és nem várt,
// körkörös szülő-láncnál is véges marad a ciklus.
const GERINC_MAX = 64;

// ===== A GERINC: A HORGONY ÉS ŐSEI =====
// A horgonytól FÖLFELÉ, a legfelső elért csomópontig. A 0. elem maga a horgony.
// Erre a láncra épül minden keret-számítás, ezért amit itt találunk, azt SOHA nem
// engedjük el.
//
// ⚠️ A KORLÁTOT NEM SZABAD OTT HASZNÁLNI, AHOL A LÁNC VÉDELMET JELENT. Ha a
// takarítás csak az első 64 őst tartaná védettnek, egy 64-nél mélyebbre nagyított
// nézetben a fölötte lévő ős részfája — benne MAGA A HORGONY — elengedhetővé
// válna. A `takaritas` ezért korlát nélkül kéri a láncot; a söprés és a
// kiparkolás viszont csak a folyosót nézi, ott a korlát ártalmatlan.
//
// @param {Map} tar
// @param {string} horgonyId
// @param {number} korlat - hány szintet járjunk be legfeljebb
// @returns {string[]} azonosítók a horgonytól fölfelé
export function gerincLanc(tar, horgonyId, korlat = GERINC_MAX) {
  const gerinc = [];
  let id = horgonyId;
  for (let i = 0; i < korlat && id && tar.has(id); i++) {
    gerinc.push(id);
    id = tar.get(id).szuloId;
  }
  return gerinc;
}

// ===== EGY CSOMÓPONT ALATTI RÉSZFA TÖRLÉSE (a csomópont marad) =====
// A szülő visszaáll „még nem töltöttük be" állapotba, tehát a tartalma nem vész
// el: legközelebb újra letöltődik.
//
// @param {Map} tar
// @param {Object} cs
// @returns {number} hány csomópontot engedtünk el
export function reszfaTorlese(tar, cs) {
  let darab = 0;
  const sor = [...cs.gyerekIdk];
  while (sor.length) {
    const id = sor.pop();
    const gyerek = tar.get(id);
    if (!gyerek) continue;
    sor.push(...gyerek.gyerekIdk);
    tar.delete(id);
    darab++;
  }

  // A szülő visszaáll „még nem töltöttük be" állapotba
  cs.gyerekIdk = [];
  cs.varolista = [];
  cs.visszaszedettek = [];
  cs.varolistaRelTerulet = 0;
  cs.helyezettIdk = new Set();
  cs.helyezettPont = 0;
  cs.magSugarRel = Infinity;
  cs.kulsoSugar = 0;
  cs.betoltottGyerekPont = 0;
  cs.betoltottKuszob = Infinity;
  cs.mindenLetoltve = false;
  cs.kurzorPont = null;
  cs.kurzorId = null;
  return darab;
}

// ===== A LERAKOTTAK MÉRETEINEK ÚJRAMÉRÉSE =====
// A MÉRT belső lyuk (`magSugarRel`) és a külső perem (`kulsoSugar`) a ténylegesen
// lerakott gyerekekből. Nem becslés: a rajzolás és az állapot-napló is ezt olvassa.
//
// @param {Map} tar
// @param {Object} cs
export function meretekUjramerese(tar, cs) {
  let mag = Infinity;
  let kulso = 0;

  for (const gid of cs.gyerekIdk) {
    const gy = tar.get(gid);
    if (!gy) continue;
    const tavolsag = Math.hypot(gy.relX, gy.relY);
    mag = Math.min(mag, tavolsag - gy.relR);
    kulso = Math.max(kulso, tavolsag + gy.relR);
  }

  cs.magSugarRel = Number.isFinite(mag) ? Math.max(0, mag) : Infinity;
  cs.kulsoSugar = kulso;
}

// ===== MÉRET SZERINTI VISSZASZEDÉS =====
// Felelősség: a lerakott testvérek számát KORLÁTOSAN tartani úgy, hogy a kép ne
// változzon — se most, se visszanagyításkor. Lásd a `VISSZASZEDES_ATMERO_ARANY`
// melletti magyarázatot: a pakoló előtag-stabil, tehát a kanonikus sorrend
// VÉGÉRŐL ingyen elengedhetünk, de KIZÁRÓLAG összefüggő farkat.
//
// Hol van értelme: a HORGONY SZÜLŐJÉNÉL. Ott vannak azok a testvérek, amik a
// nagyítás során túlnőttek a képernyőn — a horgony maga és a nála kisebbek
// (a befelé eső gyűrűk) maradnak.
//
// @param {Object} beallitasok
// @param {Map} beallitasok.tar
// @param {string} beallitasok.horgonyId
// @param {Object} beallitasok.nezet          - { skala, eltolasX, eltolasY }
// @param {number} beallitasok.kepernyoMeret  - a képernyő kisebbik oldala
// @returns {boolean} változott-e valami (kell-e újrarajzolni)
export function visszaszedes({ tar, horgonyId, nezet, kepernyoMeret }) {
  const horgony = tar.get(horgonyId);
  if (!horgony || !horgony.szuloId) return false;

  const szulo = tar.get(horgony.szuloId);
  if (!szulo || szulo.gyerekIdk.length === 0) return false;

  // A szülő képernyő-sugara a horgony keretéből visszaszámolva
  const szKeret = szuloKeretben(tar, horgonyId);
  if (!szKeret) return false;
  const szuloKepSugar = nezet.skala * szKeret.r;
  if (!(szuloKepSugar > 0)) return false;

  // A KANONIKUS SORREND — pontosan az, amit a pakoló használ
  // (növekvő sugár, holtversenynél azonosító). Ez nem stílus: az előtag-
  // stabilitás CSAK erre a sorrendre igaz.
  const gyerekek = szulo.gyerekIdk
    .map(id => tar.get(id))
    .filter(Boolean)
    // PONTOSAN a pakoló kanonikus sorrendje (`pakolasiSorrend`) — az előtag-
    // stabilitás csak erre igaz. A `relR` itt a `sugar` szerepét tölti be.
    .sort((a, b) => pakolasiSorrend(
      { id: a.id, sugar: a.relR, letrehozva: a.letrehozva },
      { id: b.id, sugar: b.relR, letrehozva: b.letrehozva }
    ));

  // A horgonyt és a nála kisebbeket SOSEM engedjük el — de nem kivételként
  // (az szétverné a képet), hanem úgy, hogy a vágás nem mehet alá.
  const horgonyIndex = gyerekek.findIndex(g => g.id === horgonyId);
  const alsoHatar = Math.max(0, horgonyIndex + 1);

  const maxAtmero = kepernyoMeret * VISSZASZEDES_ATMERO_ARANY;

  // A VÁGÁS: a sorrend végéről addig lépünk visszafelé, amíg a testvér látszó
  // átmérője túl nagy VAGY a darabszám-korlát fölött vagyunk.
  let vagas = gyerekek.length;
  while (vagas > alsoHatar) {
    const gy = gyerekek[vagas - 1];
    const tulNagy = 2 * szuloKepSugar * gy.relR > maxAtmero;
    const tulSok = vagas > MEGTARTOTT_DARAB;
    if (!tulNagy && !tulSok) break;
    vagas--;
  }

  // HOLTVERSENY-VÉDELEM: ha a vágás egy azonos méretű csoport KÖZEPÉRE esne, a
  // csoport egészét bent hagyjuk. Mérve: félbevágott csoportnál 83 síkidom
  // ugrott el, a legnagyobb elmozdulás 7,78.
  while (vagas > alsoHatar && vagas < gyerekek.length &&
         gyerekek[vagas - 1].relR === gyerekek[vagas].relR) {
    vagas++;
  }
  if (vagas >= gyerekek.length) return false;

  // --- AZ ELENGEDÉS ---
  const elengedendok = gyerekek.slice(vagas);
  const megtartott = new Set(gyerekek.slice(0, vagas).map(g => g.id));

  for (const gy of elengedendok) {
    // A részfát is elengedjük — ott van a valódi memória
    reszfaTorlese(tar, gy);
    tar.delete(gy.id);

    // Az ADATA megmarad, a HELYE nem: visszatéréskor a pakoló újraszámolja
    szulo.visszaszedettek.push({
      id: gy.id, entitasTipus: gy.entitasTipus, cim: gy.cim, pont: gy.pont,
      relR: gy.relR, vanGyereke: gy.vanGyereke,
      kategoriaIkonok: gy.kategoriaIkonok, tipusIkon: gy.tipusIkon,
      javaslatTipus: gy.javaslatTipus
    });

    szulo.helyezettIdk.delete(gy.id);
    szulo.helyezettPont = Math.max(0, szulo.helyezettPont - (gy.pont ?? 0));
  }

  szulo.gyerekIdk = szulo.gyerekIdk.filter(id => megtartott.has(id));

  // A visszaszedettek CSÖKKENŐ méret szerint állnak: a legnagyobb ment el
  // utoljára, és kicsinyítéskor ő jön vissza először.
  // A pakolási sorrend FORDÍTOTTJA (a paraméterek felcserélve) — így pontosan
  // az az elem jön vissza először, amelyik utoljára ment el.
  szulo.visszaszedettek.sort((a, b) => pakolasiSorrend(
    { id: b.id, sugar: b.relR, letrehozva: b.letrehozva },
    { id: a.id, sugar: a.relR, letrehozva: a.letrehozva }
  ));

  meretekUjramerese(tar, szulo);

  console.log('sikidomTar.visszaszedes', {
    szulo: szulo.id,
    elengedve: elengedendok.length,
    maradt: szulo.gyerekIdk.length,
    visszaszedettOsszesen: szulo.visszaszedettek.length,
    maxAtmero: Math.round(maxAtmero)
  });

  return true;
}

// ===== MÉLYSÉG SZERINTI ŐS-SÖPRÉS (Csaba, 2026-08-11) =====
// Felelősség: a folyosón KÍVÜL eső ősök gyerekeit elengedni — mérettől
// függetlenül. Lásd `FOLYOSO_SZINT`.
//
// MIT NEM BÁNTUNK SOHA:
//   - a GERINCET (a horgony és minden őse): rájuk épül a keret-számítás;
//   - a folyosón belüli szinteket: ott a méret-alapú `visszaszedes` dolgozik.
//
// ⚠️ MIÉRT SZABAD ITT A SORREND KÖZEPÉBŐL IS ELENGEDNI. A `visszaszedes`-nél az
// „összefüggő farok" szabálya azért kötelező, mert ott a szint LÁTSZIK: ha a
// gerinc-gyereknél KISEBB testvéreket vennénk el, a gerinc-gyerek helye
// elmozdulna, és a kép kirántana a kezed alól. A folyosón kívüli szint viszont
// NINCS a képen (a `_lathatoLista` csak `FELFELE_SZINTEK = 3` szinttel a horgony
// fölött kezd), és amíg parkol, NEM IS PAKOLJUK újra. Visszafelé jövet pedig a
// szintet EGYBEN állítjuk vissza (`kiparkolas`), és a pakolás a TELJES
// készletből determinisztikus — tehát pontosan ugyanazokat a helyeket adja.
//
// A gerinc-gyerek maradnia KELL a `gyerekIdk`-ban: rajta keresztül vezet a
// keret-lánc lefelé.
//
// @param {Map} tar
// @param {string} horgonyId
// @returns {boolean} változott-e valami
export function osSopres(tar, horgonyId) {
  let valtozott = false;

  const gerinc = gerincLanc(tar, horgonyId);

  // A folyosón belül semmit nem bántunk; azon túl minden ősnél söprünk
  for (let i = FOLYOSO_SZINT; i < gerinc.length; i++) {
    const os = tar.get(gerinc[i]);
    if (!os) continue;

    // a gerinc-gyerek: ő vezet lefelé, ő marad
    const gerincGyerekId = gerinc[i - 1];
    if (os.gyerekIdk.length <= 1) continue;      // nincs mit elengedni

    const elengedendok = os.gyerekIdk
      .filter(gid => gid !== gerincGyerekId)
      .map(gid => tar.get(gid))
      .filter(Boolean);

    if (elengedendok.length === 0) continue;

    for (const gy of elengedendok) {
      reszfaTorlese(tar, gy);
      tar.delete(gy.id);

      // Az ADAT megmarad — visszatéréskor nem kell újra letölteni
      os.visszaszedettek.push({
        id: gy.id, entitasTipus: gy.entitasTipus, cim: gy.cim, pont: gy.pont,
        relR: gy.relR, letrehozva: gy.letrehozva, vanGyereke: gy.vanGyereke,
        kategoriaIkonok: gy.kategoriaIkonok, tipusIkon: gy.tipusIkon,
        javaslatTipus: gy.javaslatTipus
      });

      os.helyezettIdk.delete(gy.id);
      os.helyezettPont = Math.max(0, os.helyezettPont - (gy.pont ?? 0));
    }

    os.gyerekIdk = [gerincGyerekId];

    // A PARKOLÁS JELZÉSE. Amíg ez igaz, a szint készlete HIÁNYOS a sorrend
    // közepén is — tehát ezen a csomóponton PAKOLNI TILOS, amíg vissza nem
    // állítottuk (lásd `kiparkolas`).
    os.parkolt = true;
    valtozott = true;

    console.log('sikidomTar.osSopres', {
      os: os.id, szintTavolsag: i, elengedve: elengedendok.length,
      parkolvaOsszesen: os.visszaszedettek.length
    });
  }

  return valtozott;
}

// ===== KIPARKOLÁS: a parkolt szint TELJES visszaállítása =====
// Amikor egy parkolt ős visszakerül a folyosóba, a készletét EGYBEN adjuk vissza
// a várólistára — nem adagolva, ahogy a `visszahozatal` teszi. Ez azért fontos,
// mert a parkoláskor a sorrend KÖZEPÉBŐL is engedtünk el: csak a teljes készlet
// ad újra azonos helyeket.
//
// @param {Map} tar
// @param {string} horgonyId
// @returns {boolean} változott-e valami
export function kiparkolas(tar, horgonyId) {
  let valtozott = false;

  const gerinc = gerincLanc(tar, horgonyId);

  // A folyosóba visszakerült ősök: a gerinc első FOLYOSO_SZINT eleme
  for (let i = 0; i < Math.min(FOLYOSO_SZINT, gerinc.length); i++) {
    const os = tar.get(gerinc[i]);
    if (!os || !os.parkolt) continue;

    if (os.visszaszedettek.length > 0) {
      os.varolista.push(...os.visszaszedettek.splice(0));
      os.varolistaRelTerulet = os.varolista
        .reduce((s, v) => s + Math.PI * (v.relR ?? 0) * (v.relR ?? 0), 0);
    }
    os.parkolt = false;
    valtozott = true;

    console.log('sikidomTar.kiparkolas', {
      os: os.id, visszaadva: os.varolista.length
    });
  }

  return valtozott;
}

// ===== A VISSZASZEDETTEK VISSZAHOZATALA (kicsinyítéskor) =====
// Amint a szülő képernyő-sugara annyira lecsökkent, hogy a visszaszedettek már
// beleférnének a megengedett átmérőbe, visszatesszük őket a VÁRÓLISTÁRA — onnan
// a szokásos, teljes újrapakolás állítja vissza a helyüket. Az előtag-stabilitás
// miatt PONTOSAN a régi helyükre kerülnek.
//
// Hiszterézis: csak a küszöb 80%-a alatt hozzuk vissza, hogy a határon ácsorogva
// ne kapkodjon oda-vissza.
//
// @param {Object} cs
// @param {number} kepSugar       - a csomópont képernyő-sugara
// @param {number} kepernyoMeret  - a képernyő kisebbik oldala
// @returns {boolean} változott-e valami
export function visszahozatal(cs, kepSugar, kepernyoMeret) {
  if (cs.visszaszedettek.length === 0 || !(kepSugar > 0)) return false;

  // ŐRSZEM: parkolt szinten a `visszaszedettek` a sorrend KÖZEPÉRŐL is tartalmaz
  // elemeket, ezért ADAGOLVA nem adható vissza — a hiányos készlet szétvinné a
  // helyeket (mérve: 600 kör mozdult el, a legnagyobb eltérés a szülő sugarának
  // 86%-a). A parkolt szintet egyedül a `kiparkolas` állítja vissza, egyben.
  if (cs.parkolt) return false;

  const hatar = kepernyoMeret * VISSZASZEDES_ATMERO_ARANY * 0.8;

  let hozhato = 0;
  while (hozhato < cs.visszaszedettek.length &&
         2 * kepSugar * cs.visszaszedettek[hozhato].relR <= hatar &&
         cs.gyerekIdk.length + cs.varolista.length + hozhato < MEGTARTOTT_DARAB) {
    hozhato++;
  }

  // HOLTVERSENY-VÉDELEM visszafelé is: az azonos méretűek együtt jönnek vissza
  while (hozhato > 0 && hozhato < cs.visszaszedettek.length &&
         cs.visszaszedettek[hozhato - 1].relR === cs.visszaszedettek[hozhato].relR) {
    hozhato++;
  }

  if (hozhato === 0) return false;

  cs.varolista.push(...cs.visszaszedettek.splice(0, hozhato));
  cs.varolistaRelTerulet = cs.varolista
    .reduce((s, v) => s + Math.PI * (v.relR ?? 0) * (v.relR ?? 0), 0);

  console.log('sikidomTar.visszahozatal', {
    csomopont: cs.id, visszahozva: hozhato, maradtVisszaszedve: cs.visszaszedettek.length
  });

  return true;
}

// ===== TAKARÍTÁS =====
// A régóta nem látott ágak gyerekeit elengedjük, hogy a tár ne nőjön korlátlanul.
// A horgony ŐSEIT és magát a horgonyt sosem bántjuk — azokra a keret-számításhoz
// szükség van.
//
// @param {Object} beallitasok
// @param {Map} beallitasok.tar
// @param {string} beallitasok.horgonyId
// @param {number} beallitasok.kepkocka   - a mostani képkocka sorszáma
// @param {string} beallitasok.gyokerId   - a virtuális legfelső csomópont (sosem bántjuk)
// @returns {number} hány csomópontot engedtünk el
export function takaritas({ tar, horgonyId, kepkocka, gyokerId }) {
  // KÜLÖN kapcsoló, nem a rajzolás-szűrésé (lásd `AGAK_ELENGEDESE`)
  if (!AGAK_ELENGEDESE) return 0;

  // A TELJES ős-lánc védett, korlát nélkül (lásd a `gerincLanc` figyelmeztetését),
  // és vele a virtuális legfelső csomópont is.
  const vedett = new Set(gerincLanc(tar, horgonyId, Infinity));
  vedett.add(gyokerId);

  let elengedett = 0;
  for (const cs of [...tar.values()]) {
    if (vedett.has(cs.id)) continue;
    if (cs.gyerekIdk.length === 0) continue;
    if (kepkocka - cs.utoljaraLatva < ELENGEDES_TURELEM) continue;

    elengedett += reszfaTorlese(tar, cs);
  }

  if (elengedett > 0) {
    console.log('sikidomTar.takaritas', { elengedett, tarMeret: tar.size });
  }

  return elengedett;
}

// ===== EXPORTÁLÁS =====
export default {
  gerincLanc, reszfaTorlese, meretekUjramerese,
  visszaszedes, osSopres, kiparkolas, visszahozatal, takaritas,
  VISSZASZEDES_ATMERO_ARANY, MEGTARTOTT_DARAB, FOLYOSO_SZINT,
  AGAK_ELENGEDESE, ELENGEDES_TURELEM
};
