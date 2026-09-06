// koino/js/tar/esemenyTar.js

// Felelősség: az aláírt események megőrzése, és a SAJÁT LÁNC kezelése.
//
// KÉT SZABÁLY, AMI SOHA NEM SÉRÜLHET:
//   1. ELLENŐRIZETLEN ESEMÉNY NEM KERÜL A TÁRBA. Minden mentés előtt ellenőrizzük az
//      aláírást és az azonosítót — akkor is, ha „a sajátunk". Így a tár gondolata
//      önmagában bizonyíték, és soha nem kell utólag megbízni benne.
//   2. AZ ESEMÉNYEKET NEM MÓDOSÍTJUK ÉS NEM TÖRÖLJÜK. Egy esemény megtörtént; ami
//      „változik", az egy ÚJABB esemény a láncban (a szavazat módosítása is új esemény).
//
// ⚠️ A TÁROLÓT KÍVÜLRŐL KAPJA (D29, 2026-08-28). Ez a fájl csak a LOGIKÁT tudja; hogy
// az adat fájlban, memóriában vagy máshol él, az a tároló dolga. Így a szabályok EGY
// példányban léteznek: ha később más tárolót teszünk alá, a lánc-kezelés nem másolódik
// és nem csúszhat szét.
//
// ⭐ A TÁROLÓ MŰVELETEI A 3.2 ÓTA KÉRDEZHETŐK (2026-09-03): `esemeny(azonosito)` ·
// `szerzoLanca(szerzo)` · `szeletEsemenyei(entitas)` · `sorszamSzerint(szerzo, n)` ·
// `hozzafuz(esemeny)`. A régi `betolt()` megmaradt, de **csak a próbák és a kis koino
// állapotszámítása hívja** — a hétköznapi műveletek közül egyetlen sem.
// *Ez a kilencedik szabály: az illesztés ne kényszerítse a teljes betöltést.*
//
// A SAJÁT LÁNC: minden e-ember eseményei egymásra mutatnak (`elozo`), és sorszámozva
// vannak. Ez adja a D17 „saját lánc-következetesség"-ét — és ezért lepleződik le itt,
// MENTÉSKOR, ha valaki két különböző eseményt írt alá ugyanarról a pontról.
//
// Használják: muveletek.js és minden, ami eseményt olvas.

import { esemenyEllenorzese, elagazasE, szelet } from '../esemeny/esemeny.js';

// ===================================
// ESEMÉNY MENTÉSE
// ===================================

/**
 * Elment egy eseményt — ellenőrzés után.
 *
 * @param {Object} tar - a tároló (betolt/hozzafuz)
 * @param {Object} esemeny
 * @returns {Promise<{mentve: boolean, ok?: string, marMegvolt?: boolean, elagazas?: Object}>}
 *   mentve=false + ok      → elutasítva (érvénytelen)
 *   mentve=true + elagazas → elmentve, DE ellentmondás derült ki (lásd lentebb)
 */
export async function esemenyMentese(tar, esemeny) {
  console.log('esemenyMentese - KEZDÉS', { azonosito: esemeny?.azonosito, tipus: esemeny?.tipus });

  // ----- 1. ELLENŐRZÉS -----
  const ellenorzes = await esemenyEllenorzese(esemeny);
  if (!ellenorzes.rendben) {
    console.log('esemenyMentese - VÉGE (ELUTASÍTVA)', { ok: ellenorzes.ok });
    return { mentve: false, ok: ellenorzes.ok };
  }

  // ----- 2. MÁR MEGVAN? -----
  // Az azonosító a gondolat lenyomata, tehát ha már megvan, akkor BÁJTRA ugyanaz.
  // Ezért az ismételt mentés nem hiba, hanem semmit-nem-csinálás. (Ez teszi a hálózati
  // összefésülést triviálissá.)
  //
  // ⭐ 3.2: EZ MÁR NEM OLVASSA VÉGIG A TÁRAT. Eddig `tar.betolt()` volt itt, ezért minden
  // mentés ára a tár méretével nőtt — mérve: 100 000 eseménynél 495 ms EGYETLEN mentés,
  // vagyis N esemény beírása négyzetes. Most azonosító szerint kérdezünk, ami O(1).
  if (await tar.esemeny(esemeny.azonosito)) {
    console.log('esemenyMentese - VÉGE (már megvolt)');
    return { mentve: true, marMegvolt: true };
  }

  // ----- 3. ELÁGAZÁS-KERESÉS: a kettős cselekvés leleplezése -----
  // Szintén célzott kérdés: elég a szerző láncának EGYETLEN pontját megnézni — oda
  // ütközhet be egy második esemény.
  const ottLevok = await tar.sorszamSzerint(esemeny.szerzo, esemeny.sorszam);
  const utkozo = ottLevok.find((meglevo) => elagazasE(meglevo, esemeny));

  // ----- 4. MENTÉS -----
  // Az elágazást is elmentjük! A két esemény EGYÜTT a bizonyíték (D17/D19) — ha az
  // egyiket eldobnánk, épp a bizonyítékot dobnánk el.
  await tar.hozzafuz(esemeny);

  if (utkozo) {
    console.warn('esemenyMentese - ELÁGAZÁS! Ugyanaz a szerző két eseményt írt alá ugyanarról a pontról', {
      szerzo: esemeny.szerzo,
      sorszam: esemeny.sorszam,
      egyik: utkozo.azonosito,
      masik: esemeny.azonosito
    });
    console.log('esemenyMentese - VÉGE (elmentve, de ELLENTMONDÁS)');
    return { mentve: true, elagazas: { egyik: utkozo, masik: esemeny } };
  }

  console.log('esemenyMentese - VÉGE (elmentve)');
  return { mentve: true };
}

// ===================================
// LEKÉRDEZÉSEK
// ===================================

/**
 * Egy esemény lekérése az azonosítója alapján.
 * @param {Object} tar
 * @param {string} azonosito
 * @returns {Promise<Object|undefined>}
 */
export async function esemenyLekerese(tar, azonosito) {
  return tar.esemeny(azonosito);
}

/**
 * Egy szerző adott sorszámú eseményei.
 * (Rendes esetben legfeljebb egy — ha több, az elágazás.)
 * @param {Object} tar
 * @param {string} szerzo
 * @param {number} sorszam
 * @returns {Promise<Array<Object>>}
 */
export async function sorszamSzerint(tar, szerzo, sorszam) {
  return tar.sorszamSzerint(szerzo, sorszam);
}

/**
 * Egy szerző ÖSSZES eseménye, sorszám szerint növekvő sorrendben.
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<Array<Object>>}
 */
export async function sajatLancEsemenyei(tar, szerzo) {
  return (await tar.szerzoLanca(szerzo)).sort((a, b) => a.sorszam - b.sorszam);
}

/**
 * Egy koino ÖSSZES eseménye (az állapotszámításhoz).
 *
 * ⚠️ **EZ AZ EGYETLEN MŰVELET, AMI NEM SKÁLÁZIK — és ez tudatos.** Az `allapotSzamitasa`
 * tiszta függvény: azt számolja ki, amit kap. Kis koinóban ez a teljes halmaz, és úgy is
 * kell; nagyban viszont a hívó **szeletet** ad neki (`entitasEsemenyei`), és akkor ez a
 * függvény nem szerepel az útban.
 *
 * ⛔ **Új kódban ne ezt hívd** — kérdezz szeletet vagy láncot.
 *
 * @param {Object} tar
 * @param {string} koino
 * @returns {Promise<Array<Object>>}
 */
export async function koinoEsemenyei(tar, koino) {
  return (await tar.betolt()).filter((e) => e.koino === koino);
}

// ===================================
// A SZELET — egy entitás eseményei
// ===================================
//
// ✅ 3.2 ÓTA EZ CÉLZOTT KÉRDÉS. A 3.1-ben még `tar.betolt()`-tel ment, azzal a
// megjegyzéssel, hogy „ami itt most számít, az a HELYES KÉRDÉS — a megvalósítás mögötte
// kicserélhető". Így is lett: a tároló azóta **szelet szerint tartja nyilván** az
// eseményeket, és egyetlen hívó sem változott tőle. *(9. szabály: az illesztés az első
// naptól milliárdos, a megvalósítás mögötte lehet egyszerű — és cserélhető.)*

/**
 * Egy entitás (szelet) összes eseménye.
 *
 * A szelet-kulcs típus-független: `esemeny.entitas ?? esemeny.azonosito` — lásd az
 * `esemeny.js` `szelet()` függvényét.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} entitas
 * @returns {Promise<Array<Object>>}
 */
export async function entitasEsemenyei(tar, koino, entitas) {
  // ⭐ 3.2: célzott kérdés — a tároló szelet szerint tartja nyilván az eseményeket, tehát
  // ez már NEM olvassa végig a tárat. A koino-szűrés csak biztonsági öv (a fájl amúgy is
  // koinónként külön van).
  return (await tar.szeletEsemenyei(entitas)).filter((e) => e.koino === koino);
}

/**
 * Hányadik lesz a következő eseményem EZEN AZ ENTITÁSON?
 *
 * ⭐ MIÉRT KELL EZ? Mert szeletelt tárban a koino-szintű `sorszam` hézagjai NORMÁLISSÁ
 * válnak: ha csak azokat az eseményeket tárolom, amik az általam tartott entitásokra
 * vonatkoznak, akkor a szerző láncából jogosan hiányoznak darabok. Ezzel a hézag megszűnne
 * JEL lenni — pedig épp az volt a szelektív mutogatás nyoma.
 *
 * Az entitás-szintű sorszám visszaadja a jelet: az ENTITÁSON BELÜLI hézag újra gyanús, az
 * entitások közti pedig várt és ártalmatlan.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} szerzo
 * @param {string} entitas
 * @returns {Promise<number>}
 */
export async function kovetkezoEntitasSorszam(tar, koino, szerzo, entitas) {
  const sajatjai = (await entitasEsemenyei(tar, koino, entitas))
    .filter((e) => e.szerzo === szerzo);
  if (!sajatjai.length) return 1;
  return Math.max(...sajatjai.map((e) => e.entitasSorszam ?? 1)) + 1;
}

/**
 * ⭐ A HORGONY: pár IDEGEN esemény ebből a szeletből, amit már ismerünk.
 *
 * MIT OLD MEG? Az `ido` a szerző órája, tehát hazudható — egy visszadátumozott szavazat
 * beférhetne egy már lezárt döntésbe (`javaslatSzamitas.js` figyelmeztetése). Ha viszont az
 * eseményem hivatkozik egy MÁSIK ember eseményére, akkor bizonyíthatóan AZUTÁN keletkezett:
 * nem hivatkozhatnék olyasmire, ami akkor még nem létezett.
 *
 * ⚠️ AMIT NEM OLD MEG: aki semmit nem horgonyoz, arról továbbra sem tudjuk, mikor írt. A
 * horgony a hazugságot MEGDRÁGÍTJA és BIZONYÍTHATÓVÁ teszi, nem zárja ki — ugyanaz a szint,
 * amit a D42 bemondott összege ad, és ugyanaz a filozófia (D19).
 *
 * ⚠️ MIÉRT CSAK EBBŐL A SZELETBŐL? Mert a szeletelt tárban csak ezt látjuk biztosan — és
 * mert a döntés bemenete úgyis entitás-helyi. Egy másik szeletből vett horgonyt a másik gép
 * esetleg nem tudná ellenőrizni.
 *
 * @param {Object} tar
 * @param {string} koino
 * @param {string} entitas
 * @param {string} sajatSzerzo - a saját kulcsunk (a sajátjainkat kihagyjuk)
 * @param {number} [darab] - hány horgony (alap: 1 — ennyi elég a „azután" bizonyításához)
 * @returns {Promise<Array<string>>}
 */
export async function horgonyok(tar, koino, entitas, sajatSzerzo, darab = 1) {
  const idegenek = (await entitasEsemenyei(tar, koino, entitas))
    .filter((e) => e.szerzo !== sajatSzerzo);
  if (!idegenek.length) return [];

  // A LEGFRISSEBBEKET választjuk — azok kötik meg legszorosabban az időt. Az `ido` itt
  // csak RENDEZÉSRE szolgál (a horgony ereje az azonosítóból jön, nem az órából), ezért
  // ártalmatlan, hogy hazudható.
  return [...idegenek]
    .sort((a, b) => (b.ido - a.ido) || (a.azonosito < b.azonosito ? -1 : 1))
    .slice(0, darab)
    .map((e) => e.azonosito);
}

// ===================================
// A SAJÁT LÁNC VÉGE — a következő esemény helye
// ===================================

/**
 * Megmondja, hova fűzzük a következő saját eseményt.
 *
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<{elozo: string|null, sorszam: number}>}
 */
export async function lancVege(tar, szerzo) {
  console.log('lancVege - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(tar, szerzo);
  if (esemenyek.length === 0) {
    console.log('lancVege - VÉGE (üres lánc, ez lesz az első)');
    return { elozo: null, sorszam: 1 };
  }

  const utolso = esemenyek[esemenyek.length - 1];
  console.log('lancVege - VÉGE', { utolsoSorszam: utolso.sorszam });
  return { elozo: utolso.azonosito, sorszam: utolso.sorszam + 1 };
}

// ===================================
// A LÁNC ÉPSÉGÉNEK ELLENŐRZÉSE
// ===================================

/**
 * Végigjárja egy szerző láncát, és megnézi, ép-e.
 *
 * Három dolgot néz:
 *   - HÉZAG: hiányzik-e egy sorszám (ilyenkor nem tudunk mindent — ez a hálózaton
 *     természetes állapot lesz, nem hiba);
 *   - ELÁGAZÁS: ugyanarra a sorszámra több esemény (ez CSALÁS, és bizonyított);
 *   - SZAKADÁS: az `elozo` nem a tényleges előző eseményre mutat.
 *
 * @param {Object} tar
 * @param {string} szerzo
 * @returns {Promise<{ep: boolean, hosszu: number, hezagok: Array<number>, elagazasok: Array<number>, szakadasok: Array<number>}>}
 */
export async function lancEllenorzese(tar, szerzo) {
  console.log('lancEllenorzese - KEZDÉS', { szerzo: szerzo.slice(0, 8) + '…' });

  const esemenyek = await sajatLancEsemenyei(tar, szerzo);
  const hezagok = [];
  const elagazasok = [];
  const szakadasok = [];

  // Sorszám → események (rendesen egy, elágazásnál több)
  const sorszamonkent = new Map();
  for (const e of esemenyek) {
    if (!sorszamonkent.has(e.sorszam)) sorszamonkent.set(e.sorszam, []);
    sorszamonkent.get(e.sorszam).push(e);
  }

  const legnagyobb = esemenyek.length ? Math.max(...sorszamonkent.keys()) : 0;

  for (let sorszam = 1; sorszam <= legnagyobb; sorszam++) {
    const ittLevok = sorszamonkent.get(sorszam);

    if (!ittLevok) { hezagok.push(sorszam); continue; }
    if (ittLevok.length > 1) { elagazasok.push(sorszam); continue; }

    // Szakadás: az `elozo` a tényleges előző eseményre mutat-e?
    const e = ittLevok[0];
    const elozoek = sorszamonkent.get(sorszam - 1);
    if (sorszam === 1) {
      if (e.elozo !== null) szakadasok.push(sorszam);
    } else if (elozoek && elozoek.length === 1 && e.elozo !== elozoek[0].azonosito) {
      szakadasok.push(sorszam);
    }
  }

  const eredmeny = {
    ep: hezagok.length === 0 && elagazasok.length === 0 && szakadasok.length === 0,
    hosszu: legnagyobb,
    hezagok,
    elagazasok,
    szakadasok
  };

  console.log('lancEllenorzese - VÉGE', eredmeny);
  return eredmeny;
}
