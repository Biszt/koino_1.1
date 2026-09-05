// koino/meres/szigetMeres.js

// Felelősség: MEGMÉRNI, MENNYIRE VÉD EGY BELÉPTETŐ SZABÁLY — a Szakasz 4 első kódja.
// Terv: [`docs/szakasz4_terv.md`](../../docs/szakasz4_terv.md), 10. szakasz.
//
// ===== MIÉRT KELL EZ, ÉS MIÉRT MOST =====
//
// A Szakasz 4 tervezése alatt KÉT állítás bukott meg — és mindkettőt a SZÁMOLÁS buktatta
// ki, nem a megérzés:
//
//   1. „a növekedés önfinanszírozó" — nem az: megmaradó keretnél a közösség
//      bizonyíthatóan nem tud nőni (szakasz4_terv 5.1);
//   2. „az elismerés legyen ingyenes, ha a tanúnak van kerete" (D48) — a hamis szigetet
//      ugyanúgy táplálja, és nem lejtőn, hanem SZIKLÁN (5.1/c).
//
// ⛔ Ebből az általános eredmény: **a gazdaság önmagában nem lehet a védelem, mert a
// számtan nem látja a különbséget valódi és hamis ember között.** A harmadik javaslat
// (horgony + táguló kör + több találkozó) már túl összetett ahhoz, hogy fejben
// ellenőrizzük. Ezért mérünk.
//
// ===== EZ NEM ÖNPRÓBA =====
//
// A `mind.js` próbái igen/nem választ adnak; ez SZÁMOKAT ad — mint a `skalaMeres.js`.
// Ezért külön belépő, és szándékosan NEM kerül a `mind.js`-be.
//
//   node koino/meres/szigetMeres.js              → a teljes összevetés
//   node koino/meres/szigetMeres.js 7            → más véletlen-mag (ismételhetőség)
//
// ===== ⭐ AMIT A SZIMULÁTORNAK ELŐSZÖR BIZONYÍTANIA KELL =====
//
// Mielőtt bármit elhinnénk neki arról, amit NEM tudunk, meg kell mutatnia azt, amit MÁR
// TUDUNK: az „A" szabálynak el kell szállnia, a „B"-nek meg kell fagynia. Ha ezt a kettőt
// nem reprodukálja, a szimulátor rossz, és nem a szabályok.
//
// ===== ⚠️ KÉT SZÁMOT MÉRÜNK, SOHA CSAK EGYET =====
//
// A tegnapi tanulság: egy védelmi próba EGYEDÜL átment volna úgy is, hogy közben a koino
// növekedésképtelen. Ezért minden szabálynál egyszerre nézzük:
//
//   · hány VALÓDI ember jutott be  (nő-e egyáltalán a közösség?)
//   · hány HAMIS azonosság jutott be  (véd-e?)
//
// ===== AMIT EZ A MODELL NEM MODELLEZ (őszintén) =====
//
// · Nincs benne kulcs, aláírás, esemény, hálózat — ez GRÁF-kísérlet, nem koino-kísérlet.
//   A valódi megvalósításban minden tanúsítás aláírt esemény lesz.
// · A „találkozó" itt annyi, hogy egy csoport tagjai kölcsönösen tanúsítják egymást.
// · A diszjunkt utakat MOHÓN számoljuk (alsó korlát) — ⭐ és ez szándékos: a valódi
//   koinóban is a JELENTKEZŐ mutat fel `k` utat, nem a maximumot keresi valaki (D43).

import { kiir } from './naplo.js';

// ===================================
// VÉLETLEN — magból, hogy ismételhető legyen
// ===================================

/**
 * Egyszerű, magvetett álvéletlen (nulla függőség, 6. szabály).
 * Ugyanaz a mag MINDIG ugyanazt a világot adja — enélkül a mérés nem összevethető.
 */
function veletlenGenerator(mag) {
  let a = mag >>> 0;
  return function () {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===================================
// A VILÁG
// ===================================
//
// Az emberek egy KÖRÖN helyezkednek el (0..N-1) — ez a „földrajz". Egy találkozóra
// egymáshoz közeliek jönnek össze. Enélkül a gráf egyenletes kása lenne, és pont azt nem
// tudnánk megmérni, ami a horgony-körnél a kérdés: TÁGUL-E, vagy megreked.

const BEALLITAS = {
  valodiEmberek: 1500,      // ennyi valódi ember létezhet összesen
  alapitok: 20,             // az alapítói emberek száma összesen — ők a kezdeti horgonyok
  alapitoKorok: 4,          // ⭐ ENNYI KÜLÖN körbe szervezve (lásd lent, miért kell)
  alapitoKeret: 60,         // az alapítók induló kerete (a „véges induló készlet")
  k: 5,                     // belépési minimum: ennyi tanúsítás / ennyi külön út
  m: 3,                     // horgonnyá váláshoz ennyi EGYMÁST NEM ISMERŐ horgony-tanú
  maxUtHossz: 4,            // egy felmutatott út legfeljebb ilyen hosszú lehet
  korok: 30,                // ennyi kört futtatunk
  talalkozoKorben: 25,      // körönként ennyi találkozó
  talalkozoMeret: 12,       // egy találkozón ennyien vannak
  talalkozoSugar: 80,       // a találkozó a körön ekkora szeletből hívja az embereket
  ujakTalalkozon: 3,        // egy találkozóra ennyi kívülállót hívnak meg
  tamadasKezdete: 8,        // ettől a körtől lép színre a támadó
  hamisProbalkozas: 40,     // a támadó körönként ennyi hamis azonosságot próbál bevinni
  ovatos: 0,                // ⭐ 1 = ÓVATOS támadó (lásd `tamadoKore`)
  alapos: 0,                // ⭐⭐ 1 = ALAPOS támadó: egész hamis TÁRSADALMAT épít
  tavoliArany: 0.1,         // ⭐ a találkozók ennyied része NEM helyi (lásd `talalkozokKore`)
};

/**
 * A beállítások felülírhatók környezeti változóból — hogy ugyanaz a kód mérje meg a
 * „mi lett volna, ha" eseteket, kódmódosítás nélkül. Például:
 *
 *   KOROK=100 node koino/meres/szigetMeres.js          → hosszabb futás
 *   ALAPITO_KOROK=1 node koino/meres/szigetMeres.js    → egyetlen alapítói klikk
 *   GORBE=1 node koino/meres/szigetMeres.js            → körönkénti kimutatás
 */
function kornyezetbol(b) {
  for (const kulcs of Object.keys(b)) {
    const nev = kulcs.replace(/[A-Z]/g, (c) => '_' + c).toUpperCase();
    if (process.env[nev] !== undefined) b[kulcs] = Number(process.env[nev]);
  }
  return b;
}

/** Az egész közösség maradék kerete — ez mutatja meg, mikor fogy el a „tüzelő". */
function osszesKeret(vilag) {
  let osszeg = 0;
  for (let i = 0; i < vilag.tag.length; i++) {
    if (vilag.tag[i]) osszeg += Math.max(0, keret(vilag, i));
  }
  return osszeg;
}

function ujVilag(b, veletlen) {
  const vilag = {
    b,
    veletlen,
    // Minden ember egy index. 0..valodiEmberek-1 a valódiak, utána jönnek a hamisak.
    valodi: [],
    tag: [],
    horgony: [],
    alapito: [],
    kapott: [],   // kapott[i] = Set(kik tanúsították i-t)
    adott: [],    // adott[i]  = Set(kiket tanúsított i)
    megtevesztett: new Set(),
    hamisKezdet: b.valodiEmberek,
    elismeres: 0,   // tanúsítás olyannak, aki már tag
    tamogatas: 0,   // tanúsítás olyannak, aki még kívül van
  };

  for (let i = 0; i < b.valodiEmberek; i++) {
    vilag.valodi.push(true);
    vilag.tag.push(false);
    vilag.horgony.push(false);
    vilag.alapito.push(false);
    vilag.kapott.push(new Set());
    vilag.adott.push(new Set());
  }

  // ===== AZ ALAPÍTÁS — és miért TÖBB kör, nem egy =====
  //
  // ⚠️ EZT A SZIMULÁTOR ELSŐ FUTÁSA TANÍTOTTA (2026-09-05). Egyetlen alapítói klikkel a
  // horgony-kör SOHA nem tágul: a feltétel `m` olyan horgony-tanút kér, akik egymást nem
  // ismerik — egy klikkben viszont mindenki ismer mindenkit, tehát az egész alapítás
  // EGYETLEN független csoportnak számít, és senki nem tud horgonnyá válni.
  //
  // ⛔ EZ ELDÖNTETLEN KÉRDÉS, NEM MEGOLDÁS. Az `alapitoKorok` azért paraméter, hogy
  // MINDKÉT világot meg tudjuk mérni:
  //
  //     alapitoKorok = 1  → egyetlen alapítói klikk: a horgony-kör NEM tágul (mérve)
  //     alapitoKorok >= m → több, egymást nem ismerő alapítói kör: tágulhat
  //
  // ⚠️ Az „legyen több alapítói kör" NEM Csaba döntése — ezt Claude tette hozzá, hogy a
  // saját horgony-szabálya elinduljon, és ez rossz sorrend: előbb a szabály bukását kell
  // kimondani, nem a világot átírni alatta. Csaba két mondata ez volt: *„a horgonynak ne
  // egy pontban kell lennie, hanem egy körben, ami tágul"* és *„mi lenne, ha a horgonnyá
  // váláshoz kéne több személyes találkozó?"*. A „több találkozó" → „több, egymást nem
  // ismerő csoport" fordítás Claude ugrása (indoka: a gráf csak ez utóbbit látja) — és
  // épp ez az ugrás termelte a bootstrap-gondot. A döntés Csabáé.
  const korMeret = Math.ceil(b.alapitok / b.alapitoKorok);
  const tavolsag = Math.floor(b.valodiEmberek / b.alapitoKorok);
  vilag.alapitoKorei = [];
  for (let c = 0; c < b.alapitoKorok; c++) {
    const kor = [];
    for (let t = 0; t < korMeret && c * korMeret + t < b.alapitok; t++) {
      // ⭐ A köröket SZÉTSZÓRJUK a „földrajzon" — külön társaságok, külön helyeken.
      kor.push(c * tavolsag + t);
    }
    vilag.alapitoKorei.push(kor);
    for (const i of kor) {
      vilag.tag[i] = true;
      vilag.horgony[i] = true;
      vilag.alapito[i] = true;
    }
    // egy körön belül mindenki tanúsít mindenkit — de a körök közt SEMMI
    for (const i of kor) for (const j of kor) if (i !== j) elFelvetel(vilag, i, j);
  }

  return vilag;
}

/** Új (hamis) azonosság felvétele a világba — a támadó gyártja. */
function ujHamis(vilag) {
  const i = vilag.valodi.length;
  vilag.valodi.push(false);
  vilag.tag.push(false);
  vilag.horgony.push(false);
  vilag.alapito.push(false);
  vilag.kapott.push(new Set());
  vilag.adott.push(new Set());
  return i;
}

// ===================================
// A TANÚSÍTÁS — az él
// ===================================

/** Nyers él-felvétel, szabály-ellenőrzés nélkül (a világ építéséhez). */
function elFelvetel(vilag, tanu, kit) {
  if (tanu === kit) return false;
  if (vilag.adott[tanu].has(kit)) return false;
  vilag.adott[tanu].add(kit);
  vilag.kapott[kit].add(tanu);
  return true;
}

/**
 * A KERET (D44, Csaba szabálya): amennyivel a kapott tanúsítások száma a belépési
 * minimum fölött van, mínusz amit már elköltött.
 *
 * ⚠️ Az alapítók nem fizetik a `k`-t (nem kellett belépniük), viszont kapnak egy véges
 * induló készletet — ez a „véges alapítói készlet", amiről az 5.1 szól.
 */
function keret(vilag, i) {
  const b = vilag.b;
  const induló = vilag.alapito[i] ? b.alapitoKeret : 0;
  const belepesiKoltseg = vilag.alapito[i] ? 0 : b.k;
  return induló + vilag.kapott[i].size - belepesiKoltseg - vilag.adott[i].size;
}

/**
 * Tanúsítás a szabály szerint. A „keretes" szabályoknál (B, D) fogyaszt — és ha nincs
 * miből, akkor MEG SEM TÖRTÉNIK. Pont ezt akarjuk látni.
 */
function tanusit(vilag, szabaly, tanu, kit) {
  if (!vilag.tag[tanu]) return false;              // csak tag tanúsíthat
  if (szabaly.keretes && keret(vilag, tanu) <= 0) return false;
  const sikerult = elFelvetel(vilag, tanu, kit);
  if (sikerult) {
    // ⭐ Hova megy a keret? Két teljesen külön dologra, és ezt eddig egy néven hívtuk:
    //   · ELISMERÉS  — olyat tanúsítok, aki MÁR tag (nem juttat be senkit)
    //   · TÁMOGATÁS  — olyat tanúsítok, aki még KÍVÜL van (ez visz be embert)
    if (vilag.tag[kit]) vilag.elismeres++;
    else vilag.tamogatas++;
  }
  return sikerult;
}

// ===================================
// A HORGONY-KÖR — és hogy tágul-e
// ===================================
//
// ⭐ Csaba szabálya (2026-09-04): horgony az lesz, akit legalább `m` olyan HORGONY
// tanúsított, akik EGYMÁST NEM ISMERIK. Ez a „több különböző találkozó" gráf-alakja:
// egy találkozón mindenki ismer mindenkit, tehát EGY találkozó csak EGYET ér.
//
// ⚠️ A független halmazt MOHÓN számoljuk: alsó korlát. Ez szándékos (D43) — és a valódi
// koinóban is a jelentkező mutatja fel a független tanúit, nem a maximumot keresi.

/**
 * Hány EGYMÁST NEM ISMERŐ ember van a listában? (mohó, tehát alsó korlát — D43)
 *
 * ⭐ Ez a legfontosabb egyetlen szám az egész szakaszban: egy TALÁLKOZÓN mindenki ismer
 * mindenkit, tehát egy találkozó ebből EGYET ér. Aki több különböző körből kapott
 * tanúsítást, annál ez a szám nagy — és ez az, amit egy hamis sziget nehezen hamisít.
 */
function mohoFuggetlen(vilag, lista) {
  const valasztott = [];
  for (const t of lista) {
    const ismeriValamelyiket = valasztott.some(
      (v) => vilag.adott[t].has(v) || vilag.adott[v].has(t)
    );
    if (!ismeriValamelyiket) valasztott.push(t);
  }
  return valasztott.length;
}

function fuggetlenHorgonyTanuk(vilag, i) {
  const horgonyTanuk = [...vilag.kapott[i]].filter((t) => vilag.horgony[t]);
  return mohoFuggetlen(vilag, horgonyTanuk);
}

// ===================================
// A JELZÉSEK (D49) — nem tiltunk, hanem feltárunk
// ===================================
//
// ⚠️ MINDEGYIK TÉNY, EGYIK SEM ÍTÉLET (D49/b). Nincs köztük „gyanú-pontszám": ugyanaz a
// szám, ami egy valódi emberről melegen hangzik („négy külön körből ismerik"), egy zárt
// foltból érkezőről hidegen. EGY mérce, két olvasat.
//
// 🔍 És a mérce, amivel egy jelzés értékét eldöntjük: akkor ér valamit, ha a SZIGETRE
// kigyullad, a becsületes közösségre viszont NEM. Amelyik mindkettőre gyullad, az
// rosszabb a semminél — hozzászoknak, és megszűnik jelzés lenni.

/**
 * ⭐ TORLÓDÁS — összesített jelzés a koinóról, NEM emberekről (D49/c, 3. védőkorlát).
 *
 * „Hány felvétel vezethető vissza ugyanarra a néhány tanúra?" Egy egészséges közösségben
 * a tanúsítás sok ezer ember között oszlik el; egy szigetnél viszont ugyanaz a néhány
 * megtévesztett ember szerepel minden felvételnél — akkor is, ha egyébként óvatos.
 *
 * @returns a legtöbbet tanúsító `hany` ember részesedése az összes tanúsításból
 */
function torlodas(vilag, hany) {
  const szamlalo = new Map();
  for (let i = 0; i < vilag.tag.length; i++) {
    if (!vilag.tag[i]) continue;
    for (const t of vilag.kapott[i]) {
      szamlalo.set(t, (szamlalo.get(t) ?? 0) + 1);
    }
  }
  const osszes = [...szamlalo.values()].reduce((a, c) => a + c, 0);
  if (!osszes) return 0;
  const legnagyobbak = [...szamlalo.values()].sort((a, c) => c - a).slice(0, hany);
  return legnagyobbak.reduce((a, c) => a + c, 0) / osszes;
}

// ===================================
// ⭐⭐ A BEMUTATKOZÁSOK TENGERE (Csaba, 2026-09-05)
// ===================================
//
// „A nem létező e-emberek mindig szigeteket alkotnak, a létező e-emberek pedig beolvadnak
// a bemutatkozások tengerébe."
//
// ⭐ MIÉRT MÁS EZ, MINT MINDEN EDDIGI? Minden korábbi jelzésünk egy KITÜNTETETT PONTHOZ
// mért („milyen messze vagy a horgonyoktól"), és a támadó ezt úgy verte meg, hogy
// ELFOGLALTA a horgonyokat — magát a mérőoszlopot. Ez itt nem ponthoz mér, hanem a
// tengerhez; a tengert pedig nem lehet elfoglalni, mert nincs benne kitüntetett hely.
//
// ⭐⭐ ÉS AMI EZT MOST LEHETŐVÉ TESZI: ez a mérés SZUBJEKTÍV — „tőlem nézve". Két napja
// elvetettük az ilyet, mert készülékenként más eredményt ad, és attól szétesne a
// szavazatszámlálás. De az akkor volt igaz, amikor a mérés DÖNTÖTT. A D49 óta nem dönt,
// csak megmutat — és egy jelzés nyugodtan lehet szubjektív, mert senkit nem zár ki vele.
//
// A mérés: én elindulok a saját kapcsolataim mentén, te a tieid mentén — TALÁLKOZUNK-E?
// Két valódi ember sétái gyorsan összeérnek (ugyanaz a tenger); egy hamis azonosságé a
// szigeten belül maradnak, mert kifelé csak a néhány megtévesztett emberen át vezet út.
//
// ⚠️ A gráfot IRÁNYÍTATLANUL nézzük: a bemutatkozás kölcsönös („találkoztunk"), nem
// egyirányú állítás, mint a tanúsítás.

function szomszedok(vilag, i) {
  const lista = [];
  for (const sz of vilag.adott[i]) if (vilag.tag[sz]) lista.push(sz);
  for (const sz of vilag.kapott[i]) if (vilag.tag[sz]) lista.push(sz);
  return lista;
}

/** Egy véletlen séta végpontja — `hossz` lépés a bemutatkozások mentén. */
function setaVege(vilag, kezdo, hossz) {
  let hol = kezdo;
  for (let l = 0; l < hossz; l++) {
    const szomszed = szomszedok(vilag, hol);
    if (!szomszed.length) return hol;
    hol = szomszed[Math.floor(vilag.veletlen() * szomszed.length)];
  }
  return hol;
}

/** Hova jutok el `db` darab `hossz` hosszú sétával? */
function setaHalmaz(vilag, kezdo, db, hossz) {
  const hol = new Set();
  for (let s = 0; s < db; s++) hol.add(setaVege(vilag, kezdo, hossz));
  return hol;
}

/**
 * ⭐ A JELZÉS: hány ponton ér össze a két ember sétáinak halmaza?
 * @returns a metszet mérete (0 = sehol nem találkoztunk)
 */
function tengerTalalkozas(vilag, en, o, db, hossz) {
  const enyem = setaHalmaz(vilag, en, db, hossz);
  const ove = setaHalmaz(vilag, o, db, hossz);
  let metszet = 0;
  for (const p of ove) if (enyem.has(p)) metszet++;
  return metszet;
}

function szemelyJelzesek(vilag, i) {
  const tanuk = [...vilag.kapott[i]].filter((t) => vilag.tag[t]);

  // 1. hányan tanúsították (nyers szám — ez a könnyen hamisítható)
  // 2. hány EGYMÁST NEM ISMERŐ körből (ez a nehezen hamisítható)
  const fuggetlen = mohoFuggetlen(vilag, tanuk);

  // 3. összefonódás: a tanú-párok hány százaléka ismeri egymást?
  //    1.0 = mind egyetlen zárt társaság; 0.0 = csupa idegen egymásnak
  let parok = 0;
  let ismerosok = 0;
  for (let a = 0; a < tanuk.length; a++) {
    for (let b = a + 1; b < tanuk.length; b++) {
      parok++;
      if (vilag.adott[tanuk[a]].has(tanuk[b]) || vilag.adott[tanuk[b]].has(tanuk[a])) ismerosok++;
    }
  }
  const osszefonodas = parok ? ismerosok / parok : 0;

  // 4. mennyire megállapodottak a tanúi (ŐKET hányan ismerik, átlagosan)
  const megallapodottsag = tanuk.length
    ? tanuk.reduce((osszeg, t) => osszeg + vilag.kapott[t].size, 0) / tanuk.length
    : 0;

  return { tanuk: tanuk.length, fuggetlen, osszefonodas, megallapodottsag };
}

/**
 * A horgony-kör frissítése. Csak NŐHET (élek csak keletkeznek) — ezért addig ismételjük,
 * amíg új horgony kerül be: egy friss horgony másokat is horgonnyá tehet. Ez maga a
 * „táguló kör".
 */
function horgonyokFrissitese(vilag) {
  let valtozott = true;
  let ujak = 0;
  while (valtozott) {
    valtozott = false;
    for (let i = 0; i < vilag.tag.length; i++) {
      if (!vilag.tag[i] || vilag.horgony[i]) continue;
      if (fuggetlenHorgonyTanuk(vilag, i) >= vilag.b.m) {
        vilag.horgony[i] = true;
        valtozott = true;
        ujak++;
      }
    }
  }
  return ujak;
}

// ===================================
// A DISZJUNKT UTAK — a szűk keresztmetszet mérése
// ===================================

/** Egy legrövidebb út a horgonyoktól a célig, a már felhasznált embereket kihagyva. */
function egyUt(vilag, cel, maxHossz, hasznalt) {
  const elozo = new Map();
  const sor = [];
  for (let i = 0; i < vilag.tag.length; i++) {
    if (vilag.horgony[i] && !hasznalt.has(i)) {
      elozo.set(i, null);
      sor.push([i, 0]);
    }
  }
  let fej = 0;
  while (fej < sor.length) {
    const [csucs, tav] = sor[fej++];
    if (tav >= maxHossz) continue;
    for (const kovetkezo of vilag.adott[csucs]) {
      if (kovetkezo === cel) {
        const ut = [cel];
        let p = csucs;
        while (p !== null && p !== undefined) {
          ut.push(p);
          p = elozo.get(p);
        }
        return ut;
      }
      // közbenső csak TAG lehet, és még nem használt
      if (!vilag.tag[kovetkezo]) continue;
      if (hasznalt.has(kovetkezo) || elozo.has(kovetkezo)) continue;
      elozo.set(kovetkezo, csucs);
      sor.push([kovetkezo, tav + 1]);
    }
  }
  return null;
}

/**
 * Hány CSÚCS-DISZJUNKT út vezet a horgonyoktól a célig, legfeljebb `maxHossz` hosszan?
 * Mohó: egymás után keresünk utakat, és a felhasznált embereket kivesszük.
 */
function diszjunktUtak(vilag, cel, maxHossz, maxDb) {
  const hasznalt = new Set();
  let db = 0;
  while (db < maxDb) {
    const ut = egyUt(vilag, cel, maxHossz, hasznalt);
    if (!ut) break;
    for (const cs of ut) if (cs !== cel) hasznalt.add(cs);
    db++;
  }
  return db;
}

// ===================================
// A NÉGY SZABÁLY
// ===================================

const SZABALYOK = [
  {
    nev: 'A — puszta darabszám',
    keretes: false,
    leiras: 'k tanúsítás bármely tagtól',
    felveheto: (vilag, jelolt) => szamlaltTanuk(vilag, jelolt) >= vilag.b.k,
  },
  {
    nev: 'B — + keret (D44)',
    keretes: true,
    leiras: 'k tanúsítás, de a tanú keretéből',
    felveheto: (vilag, jelolt) => szamlaltTanuk(vilag, jelolt) >= vilag.b.k,
  },
  {
    nev: 'C — horgony + utak',
    keretes: false,
    leiras: 'k diszjunkt út a horgonyoktól',
    felveheto: (vilag, jelolt) =>
      diszjunktUtak(vilag, jelolt, vilag.b.maxUtHossz, vilag.b.k) >= vilag.b.k,
  },
  {
    nev: 'D — horgony + utak + keret',
    keretes: true,
    leiras: 'mindkettő együtt',
    felveheto: (vilag, jelolt) =>
      diszjunktUtak(vilag, jelolt, vilag.b.maxUtHossz, vilag.b.k) >= vilag.b.k,
  },
];

/** Hány TAG tanúsította a jelöltet? */
function szamlaltTanuk(vilag, jelolt) {
  let db = 0;
  for (const t of vilag.kapott[jelolt]) if (vilag.tag[t]) db++;
  return db;
}

// ===================================
// A KÖR — mi történik egy időszakban
// ===================================

function talalkozokKore(vilag, szabaly) {
  const b = vilag.b;
  const tagok = [];
  for (let i = 0; i < b.valodiEmberek; i++) if (vilag.tag[i]) tagok.push(i);
  if (!tagok.length) return;

  for (let t = 0; t < b.talalkozoKorben; t++) {
    // A találkozó helye: egy meglévő tag környéke — így a kör a tagság PEREMÉN terjed.
    const kozep = tagok[Math.floor(vilag.veletlen() * tagok.length)];
    const jelenlevok = [];

    // ⭐ TÁVOLI TALÁLKOZÓ (2026-09-05, mérésből): a találkozók egy része NEM helyi —
    // valaki elköltözik, más városban van rokona, utazik. Enélkül a modell világa egy
    // hosszú KÖR, amiben nincs is „tenger", csak part: két becsületes ember a kör két
    // átellenes pontjáról sosem ér össze, és attól a tenger-jelzés ingataggá vált
    // (magonként 0% és 46% közt szórt a téves megjelölés). A valódi társas hálók
    // „kis világ"-ok: kevés távoli él is elég, hogy minden mindennel összeérjen.
    const sugar = vilag.veletlen() < b.tavoliArany
      ? Math.floor(b.valodiEmberek / 2)
      : b.talalkozoSugar;

    // meglévő tagok a környékről
    for (let probak = 0; probak < b.talalkozoMeret * 6; probak++) {
      if (jelenlevok.length >= b.talalkozoMeret) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * sugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (vilag.tag[ki] && !jelenlevok.includes(ki)) jelenlevok.push(ki);
    }

    // és néhány kívülálló, akit meghívtak
    const ujak = [];
    for (let probak = 0; probak < b.ujakTalalkozon * 8; probak++) {
      if (ujak.length >= b.ujakTalalkozon) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * b.talalkozoSugar);
      const ki = (kozep + eltolas + b.valodiEmberek) % b.valodiEmberek;
      if (!vilag.tag[ki] && !ujak.includes(ki)) ujak.push(ki);
    }

    // ⭐ A TALÁLKOZÓ: mindenki tanúsít mindenkit, akit lát.
    for (const a of jelenlevok) {
      for (const c of jelenlevok) if (a !== c) tanusit(vilag, szabaly, a, c);
      for (const u of ujak) tanusit(vilag, szabaly, a, u);
    }
  }
}

function valodiakFelvetele(vilag, szabaly) {
  const b = vilag.b;
  let felvettek = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) continue;
    if (vilag.kapott[i].size === 0) continue;
    if (szabaly.felveheto(vilag, i)) {
      vilag.tag[i] = true;
      felvettek++;
    }
  }
  return felvettek;
}

// ===================================
// A TÁMADÓ
// ===================================
//
// ⚠️ SZÁNDÉKOSAN ERŐS. Nem véletlenszerűen téveszt meg embereket, hanem a leghasznosabbakat
// választja: HORGONYOKAT, akik ráadásul EGYMÁST NEM ISMERIK — mert így ad a legtöbb
// diszjunkt utat. Ha a szabály egy ilyen támadó ellen áll, akkor mond valamit.

/** Lista összekeverése a világ magvetett véletlenjével (ismételhető marad). */
function keverve(vilag, lista) {
  const masolat = [...lista];
  for (let i = masolat.length - 1; i > 0; i--) {
    const j = Math.floor(vilag.veletlen() * (i + 1));
    [masolat[i], masolat[j]] = [masolat[j], masolat[i]];
  }
  return masolat;
}

function megtevesztettekValasztasa(vilag, mennyit) {
  const jeloltek = [];
  for (let i = 0; i < vilag.b.valodiEmberek; i++) {
    if (vilag.tag[i] && vilag.horgony[i]) jeloltek.push(i);
  }
  const valasztott = [];
  for (const j of jeloltek) {
    if (valasztott.length >= mennyit) break;
    const ismeriValamelyiket = valasztott.some(
      (v) => vilag.adott[j].has(v) || vilag.adott[v].has(j)
    );
    if (!ismeriValamelyiket) valasztott.push(j);
  }
  // ha nem jött össze elég egymást nem ismerő, feltöltjük bármelyik taggal
  for (let i = 0; i < vilag.b.valodiEmberek && valasztott.length < mennyit; i++) {
    if (vilag.tag[i] && !valasztott.includes(i)) valasztott.push(i);
  }
  for (const v of valasztott) vilag.megtevesztett.add(v);
  return valasztott;
}

/**
 * ⭐⭐ AZ ALAPOS TÁMADÓ SAJÁT TALÁLKOZÓI — a hamis társadalom.
 *
 * Az óvatos támadó azért lepleződött le, mert az azonosságai TÚL CSUPASZAK voltak:
 * pontosan `k` tanú, ismeretlen tanúk, nulla összefonódás. De semmi nem akadályozza meg
 * abban, hogy a saját szigetén BELÜL is „találkozókat tartson" — a 880 azonosságot
 * egymással is összekösse, helyi csoportokba rendezve, ugyanolyan alakúra, mint a valódi.
 *
 * ⚠️ EZ MIND INGYEN VAN NEKI, hiszen minden azonosság az övé. Ha ettől a személyes
 * jelzések normálisnak látszanak, akkor a jelzések ÖNMAGUKBAN nem elegendők.
 *
 * A találkozók itt is HELYIEK (egy ablakból hívnak), mert a valódi világ összefonódását
 * épp a helyi átfedés adja — globálisan szórt csoportokkal a támadó feltűnően ALACSONY
 * összefonódást kapna, és attól megint kilógna.
 */
function hamisTalalkozok(vilag, szabaly) {
  const b = vilag.b;
  const hamisTagok = [];
  for (let i = vilag.hamisKezdet; i < vilag.tag.length; i++) {
    if (vilag.tag[i]) hamisTagok.push(i);
  }
  if (hamisTagok.length < b.talalkozoMeret) return;

  for (let t = 0; t < b.talalkozoKorben; t++) {
    const kozep = Math.floor(vilag.veletlen() * hamisTagok.length);
    const ablak = Math.min(b.talalkozoSugar, hamisTagok.length);
    const jelenlevok = [];
    for (let probak = 0; probak < b.talalkozoMeret * 6; probak++) {
      if (jelenlevok.length >= b.talalkozoMeret) break;
      const eltolas = Math.floor((vilag.veletlen() - 0.5) * 2 * ablak);
      const hely = (kozep + eltolas + hamisTagok.length) % hamisTagok.length;
      const ki = hamisTagok[hely];
      if (!jelenlevok.includes(ki)) jelenlevok.push(ki);
    }
    for (const a of jelenlevok) {
      for (const c of jelenlevok) if (a !== c) tanusit(vilag, szabaly, a, c);
    }
  }
}

function tamadoKore(vilag, szabaly) {
  const b = vilag.b;
  const megtevesztettek = [...vilag.megtevesztett];
  if (!megtevesztettek.length) return 0;

  const hamisak = [];
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.tag[i]) hamisak.push(i);
  }

  let bejutott = 0;
  for (let p = 0; p < b.hamisProbalkozas; p++) {
    const uj = ujHamis(vilag);

    if (b.ovatos || b.alapos) {
      // ⭐⭐ AZ ÓVATOS TÁMADÓ — aki TUDJA, hogy nézzük a jelzéseket.
      //
      // Az „hangos" támadó azért bukott le, mert MINDENT túlteljesített: tömegesen
      // tanúsított, és mindenkit mindenkivel összekötött. Ez a támadó ezt kerüli:
      //   · PONTOSAN `k` tanúsítást szerez, egyet sem többet;
      //   · a tanúkat VÉLETLENSZERŰEN válogatja a rendelkezésére állókból;
      //   · és a hamisak NEM tanúsítják tömegesen egymást.
      //
      // ⚠️ ÉS EGY TANULSÁG A SAJÁT HIBÁMBÓL (2026-09-05): az első változat azt kérte a
      // támadótól, hogy a tanúi EGYÁLTALÁN ne ismerjék egymást — és ettől nem tudott
      // összeszedni ötöt, tehát „megvédtük" magunkat. Ez hamis siker volt: egy VALÓDI
      // ember tanúi 53%-ban ismerik egymást, tehát a nulla összefonódás FELTŰNŐBB lenne.
      // Az óvatos támadó nem a függetlenséget maximalizálja, hanem ÁTLAGOSNAK látszik.
      //
      // ⚠️ Ha a jelzések csak a hangosat fogják meg, akkor a csendest HITELESÍTJÜK velük.
      const jeloltek = keverve(vilag, [...megtevesztettek, ...hamisak]);
      for (const t of jeloltek.slice(0, b.k)) tanusit(vilag, szabaly, t, uj);
    } else {
      // 1. a megtévesztettek tanúsítják
      for (const mt of megtevesztettek) tanusit(vilag, szabaly, mt, uj);
      // 2. és a már bent lévő hamisak is (ingyen, ha a szabály engedi)
      for (const h of hamisak) tanusit(vilag, szabaly, h, uj);
    }

    if (szabaly.felveheto(vilag, uj)) {
      vilag.tag[uj] = true;
      hamisak.push(uj);
      bejutott++;
    }
  }

  // ⭐⭐ Az ALAPOS támadó a felvételek után megtartja a saját találkozóit is.
  if (b.alapos) hamisTalalkozok(vilag, szabaly);

  return bejutott;
}

// ===================================
// EGY FUTÁS
// ===================================

function futtatas(szabaly, megtevesztettSzam, mag) {
  const b = BEALLITAS;
  const vilag = ujVilag(b, veletlenGenerator(mag));
  let hamisBent = 0;
  const gorbe = [];

  for (let kor = 0; kor < b.korok; kor++) {
    talalkozokKore(vilag, szabaly);
    horgonyokFrissitese(vilag);
    const ujTagok = valodiakFelvetele(vilag, szabaly);
    horgonyokFrissitese(vilag);

    if (kor === b.tamadasKezdete) {
      megtevesztettekValasztasa(vilag, megtevesztettSzam);
    }
    if (kor >= b.tamadasKezdete) {
      hamisBent += tamadoKore(vilag, szabaly);
      horgonyokFrissitese(vilag);
    }

    let tagokMost = 0;
    for (let i = 0; i < b.valodiEmberek; i++) if (vilag.tag[i]) tagokMost++;
    gorbe.push({ kor: kor + 1, ujTagok, tagok: tagokMost, keret: osszesKeret(vilag) });
  }

  let valodiTagok = 0;
  let horgonyok = 0;
  let hamisHorgony = 0;
  for (let i = 0; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) valodiTagok++;
    if (vilag.horgony[i]) horgonyok++;
  }
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.horgony[i]) hamisHorgony++;
  }

  return {
    valodiTagok, horgonyok, hamisBent, hamisHorgony, gorbe, vilag,
    maradekKeret: osszesKeret(vilag),
    elismeres: vilag.elismeres,
    tamogatas: vilag.tamogatas,
  };
}

// ===================================
// A MÉRÉS
// ===================================

function sor(oszlopok, szelessegek) {
  return oszlopok
    .map((o, i) => String(o).padEnd(szelessegek[i]).slice(0, szelessegek[i]))
    .join('  ');
}

/**
 * ⭐ KÖRÖNKÉNTI KIMUTATÁS — erre a kérdésre válaszol: „hogyan nőtt, és miért állt meg?"
 * Támadó nélkül fut, mert itt nem a védelem a kérdés, hanem a NÖVEKEDÉS.
 */
function gorbeKiiras(mag) {
  const b = BEALLITAS;
  for (const szabaly of SZABALYOK.filter((sz) => sz.nev.startsWith('A') || sz.nev.startsWith('B'))) {
    const e = futtatas(szabaly, 0, mag);
    kiir('');
    kiir(`▶ ${szabaly.nev} — körönként, támadó nélkül`);
    kiir('-'.repeat(62));
    kiir(sor(['kör', 'új tag', 'összes tag', 'maradék keret'], [6, 10, 12, 14]));
    for (const g of e.gorbe) {
      if (g.kor % 2 === 0 || g.kor <= 4 || g.ujTagok === 0) {
        kiir(sor([g.kor, g.ujTagok, g.tagok, szabaly.keretes ? g.keret : '—'], [6, 10, 12, 14]));
      }
    }
    const osszes = e.elismeres + e.tamogatas;
    const arany = osszes ? Math.round((e.elismeres / osszes) * 100) : 0;
    kiir('');
    kiir(`   HOVA MENT A TANÚSÍTÁS?  elismerés (már tagnak): ${e.elismeres}  ·  ` +
         `támogatás (kívülállónak): ${e.tamogatas}  →  ${arany}% elismerés`);
  }
  kiir('');
}

/**
 * ⭐ A JELZÉSEK MÉRÉSE (D49) — a legfontosabb kérdés: KÜLÖNBÖZTETNEK-E?
 *
 * A leggyengébb szabállyal futtatunk (A), mert épp ez a D49 helyzete: a minimum
 * szándékosan alacsony, a hamisak bejutnak — a kérdés az, hogy LÁTSZANAK-E.
 */
function jelzesekKiirasa(mag) {
  const b = BEALLITAS;
  const szabaly = SZABALYOK[0];
  const e = futtatas(szabaly, Number(process.env.MEGTEVESZTETT ?? 8), mag);
  const vilag = e.vilag;

  const valodiak = [];
  const hamisak = [];
  for (let i = b.alapitok; i < b.valodiEmberek; i++) {
    if (vilag.tag[i]) valodiak.push(szemelyJelzesek(vilag, i));
  }
  for (let i = vilag.hamisKezdet; i < vilag.valodi.length; i++) {
    if (vilag.tag[i]) hamisak.push(szemelyJelzesek(vilag, i));
  }

  const atlag = (lista, mezo) =>
    lista.length ? lista.reduce((o, j) => o + j[mezo], 0) / lista.length : 0;
  const sz = (x) => (Math.round(x * 100) / 100).toString();

  kiir('');
  const stilus = b.alapos ? 'ALAPOS (hamis társadalmat épít)' : b.ovatos ? 'ÓVATOS' : 'hangos';
  kiir(`  ${valodiak.length} valódi tag  ·  ${hamisak.length} bejutott hamis azonosság` +
       `  ·  támadó: ${stilus}`);
  // ⛔ A LEGFONTOSABB EGYETLEN SZÁM. Ha hamis azonosság bekerül a horgony-körbe, akkor a
  // MÉRCE veszett el — és onnantól minden más szám érdektelen, mert a sziget önmagához
  // képest méri a távolságot.
  kiir(`  horgonyok: ${e.horgonyok} valódi  ·  ⛔ ${e.hamisHorgony} HAMIS`);
  kiir('');
  // ⭐ Összesített jelzés a koinóról (D49/c): a nyolc legtöbbet tanúsító ember
  // részesedése az összes tanúsításból — támadóval és nélküle.
  const tiszta = futtatas(szabaly, 0, mag);
  kiir(`  TORLÓDÁS (a 8 legtöbbet tanúsító ember részesedése):  ` +
       `támadó nélkül ${Math.round(torlodas(tiszta.vilag, 8) * 100)}%  ·  ` +
       `támadóval ${Math.round(torlodas(vilag, 8) * 100)}%`);
  kiir('');
  kiir(sor(['jelzés', 'VALÓDI átlag', 'HAMIS átlag'], [26, 14, 14]));
  kiir('-'.repeat(56));

  const jelzesek = [
    ['hányan tanúsították', 'tanuk'],
    ['hány FÜGGETLEN körből', 'fuggetlen'],
    ['tanúk összefonódása', 'osszefonodas'],
    ['tanúk megállapodottsága', 'megallapodottsag'],
  ];
  for (const [nev, mezo] of jelzesek) {
    kiir(sor([nev, sz(atlag(valodiak, mezo)), sz(atlag(hamisak, mezo))], [26, 14, 14]));
  }

  // ⭐⭐ A DÖNTŐ SZÁM. Egy jelzés akkor ér valamit, ha a szigetre kigyullad, a becsületes
  // közösségre viszont NEM. Ezért minden jelzésnél megkeressük a LEGJOBB küszöböt, és
  // kiírjuk MINDKÉT oldalt: hány hamisat kap el, és hány becsületest jelöl meg tévesen.
  //
  // ⚠️ A TÉVES MEGJELÖLÉS ITT NEM KELLEMETLENSÉG, HANEM A LÉNYEG. Épp azokat érinti,
  // akikért az egész befogadás-gondolat szól: akinek kevés vagy egyszínű a kapcsolata —
  // a magányost, a frissen érkezettet, a menekültet (D49/c).
  kiir('');
  kiir('  Ha egy jelzés alapján JELÖLNÉNK — a legjobb küszöbbel:');
  kiir('');
  kiir(sor(['jelzés', 'küszöb', 'hamis elkapva', 'becsületes tévesen'], [26, 10, 15, 18]));
  kiir('-'.repeat(74));
  for (const [nev, mezo] of jelzesek) {
    let legjobb = null;
    const ertekek = [...new Set([...valodiak, ...hamisak].map((j) => j[mezo]))].sort((a, c) => a - c);
    for (const kuszob of ertekek) {
      for (const irany of ['alatta', 'felette']) {
        const talal = (j) => (irany === 'alatta' ? j[mezo] <= kuszob : j[mezo] >= kuszob);
        const hamisAny = hamisak.length ? hamisak.filter(talal).length / hamisak.length : 0;
        const valodiAny = valodiak.length ? valodiak.filter(talal).length / valodiak.length : 0;
        const josag = hamisAny - valodiAny;
        if (!legjobb || josag > legjobb.josag) {
          legjobb = { josag, kuszob, irany, hamisAny, valodiAny };
        }
      }
    }
    const jel = legjobb.irany === 'alatta' ? '≤' : '≥';
    kiir(sor([
      nev,
      `${jel} ${sz(legjobb.kuszob)}`,
      `${Math.round(legjobb.hamisAny * 100)}%`,
      `${Math.round(legjobb.valodiAny * 100)}%`,
    ], [26, 10, 15, 18]));
  }

  // ===================================
  // ⭐⭐ A SZERKEZETI JELZÉS — ami a személyes jelzések után marad
  // ===================================
  //
  // A személyes jelzések mind arról szólnak, hogy MILYEN a jelölt környezete. Az alapos
  // támadó ezeket mind utánozza, mert a saját szigetén belül bármit felépíthet ingyen.
  //
  // ⭐ Amit NEM tud utánozni: hogy a szigete mindössze néhány élen lóg a valódi világon.
  // Ezt egyetlen szám méri: hány CSÚCS-DISZJUNKT út vezet a horgonyoktól hozzá.
  //
  // ⚠️ Mintavétellel, mert ez a számítás drága (személyenként több gráfbejárás).
  const mintaMeret = Number(process.env.MINTA ?? 30);
  // ⚠️ A korlátnak BŐVEN a megtévesztettek száma FÖLÖTT kell lennie, különben elrejti a
  // különbséget: a sziget legfeljebb annyi külön úton érhető el, ahány megtévesztett
  // embere van, a valódi ember viszont sokkal többön. (Először 8-cal mértem, ami épp
  // annyi volt, mint a megtévesztettek száma — és „nincs különbség" jött ki. Nem volt.)
  const utKorlat = Number(process.env.UT_KORLAT ?? 30);
  const mintaVetel = (tol, ig, hamisE) => {
    const talalt = [];
    for (let i = tol; i < ig && talalt.length < mintaMeret * 12; i++) {
      if (vilag.tag[i] && (hamisE || i >= b.alapitok)) talalt.push(i);
    }
    return keverve(vilag, talalt).slice(0, mintaMeret);
  };
  const vMinta = mintaVetel(b.alapitok, b.valodiEmberek, false);
  const hMinta = mintaVetel(vilag.hamisKezdet, vilag.tag.length, true);
  const utak = (lista) =>
    lista.length
      ? lista.reduce((o, i) => o + diszjunktUtak(vilag, i, b.maxUtHossz, utKorlat), 0) / lista.length
      : 0;

  kiir('');
  kiir('  ⭐ SZERKEZETI JELZÉS — hány külön út vezet a horgonyoktól idáig?');
  kiir(`     (${mintaMeret} fős minta mindkét oldalról, út ≤ ${b.maxUtHossz})`);
  kiir('');
  kiir(sor(['', 'átlag', 'legkisebb', 'legnagyobb'], [14, 12, 12, 12]));
  kiir('-'.repeat(52));
  const utErtekek = {};
  for (const [nev, minta] of [['VALÓDI', vMinta], ['HAMIS', hMinta]]) {
    const ertekek = minta.map((i) => diszjunktUtak(vilag, i, b.maxUtHossz, utKorlat));
    utErtekek[nev] = ertekek;
    const atl = ertekek.length ? ertekek.reduce((a, c) => a + c, 0) / ertekek.length : 0;
    kiir(sor([nev, sz(atl), Math.min(...ertekek), Math.max(...ertekek)], [14, 12, 12, 12]));
  }
  if (utErtekek.HAMIS?.length) {
    const hMax = Math.max(...utErtekek.HAMIS);
    const vAlatta = utErtekek.VALODI ?? utErtekek['VALÓDI'];
    const tevesen = vAlatta.filter((e) => e <= hMax).length / vAlatta.length;
    kiir('');
    kiir(`  Ha a küszöb „≤ ${hMax} út" lenne: 100% hamis elkapva, ` +
         `${Math.round(tevesen * 100)}% becsületes tévesen.`);
  }

  // ===================================
  // ⭐⭐ A BEMUTATKOZÁSOK TENGERE — Csaba javaslata
  // ===================================
  const setaDb = Number(process.env.SETA_DB ?? 200);
  const setaHossz = Number(process.env.SETA_HOSSZ ?? 10);
  // Kérdezők: néhány véletlen VALÓDI tag. Ők azok, akik „ránéznek" valakire.
  const kerdezok = keverve(vilag, vMinta).slice(0, 5);

  const talalkozasok = (celok) => {
    const ertekek = [];
    for (const cel of celok) {
      for (const kerdezo of kerdezok) {
        if (kerdezo === cel) continue;
        ertekek.push(tengerTalalkozas(vilag, kerdezo, cel, setaDb, setaHossz));
      }
    }
    return ertekek;
  };

  const vTal = talalkozasok(vMinta);
  const hTal = talalkozasok(hMinta);
  const atl = (l) => (l.length ? l.reduce((a, c) => a + c, 0) / l.length : 0);
  const nulla = (l) => (l.length ? l.filter((e) => e === 0).length / l.length : 0);

  kiir('');
  kiir('  ⭐⭐ A BEMUTATKOZÁSOK TENGERE — összeérnek-e a sétáink?');
  kiir(`     (${setaDb} séta, ${setaHossz} lépés, 5 kérdező · irányítatlan gráf)`);
  kiir('');
  kiir(sor(['', 'átlagos metszet', 'SOHA nem ért össze'], [14, 18, 22]));
  kiir('-'.repeat(56));
  kiir(sor(['VALÓDI', sz(atl(vTal)), `${Math.round(nulla(vTal) * 100)}%`], [14, 18, 22]));
  kiir(sor(['HAMIS', sz(atl(hTal)), `${Math.round(nulla(hTal) * 100)}%`], [14, 18, 22]));

  // ⭐ És a döntő szám ennél is: a legjobb küszöb mindkét oldala.
  let legjobbSeta = null;
  for (const kuszob of [...new Set([...vTal, ...hTal])].sort((a, c) => a - c)) {
    const h = hTal.filter((e) => e <= kuszob).length / (hTal.length || 1);
    const v = vTal.filter((e) => e <= kuszob).length / (vTal.length || 1);
    if (!legjobbSeta || h - v > legjobbSeta.josag) legjobbSeta = { josag: h - v, kuszob, h, v };
  }
  if (legjobbSeta) {
    kiir('');
    kiir(`  Ha a küszöb „a metszet ≤ ${legjobbSeta.kuszob}" lenne: ` +
         `${Math.round(legjobbSeta.h * 100)}% hamis elkapva, ` +
         `${Math.round(legjobbSeta.v * 100)}% becsületes tévesen.`);
  }

  // ⭐ A DÖNTŐ SZÁM: ha a „független körök" alapján jelölnénk, kit kapnánk el, és kit
  // jelölnénk meg tévesen? Egy jelzés, ami a becsületesekre is gyullad, rosszabb a semminél.
  kiir('');
  kiir('  A „hány független körből" jelzés eloszlása:');
  kiir('');
  kiir(sor(['független körök', 'VALÓDI', 'HAMIS'], [20, 12, 12]));
  kiir('-'.repeat(46));
  for (let f = 1; f <= 5; f++) {
    const cimke = f === 5 ? '5 vagy több' : String(f);
    const v = valodiak.filter((j) => (f === 5 ? j.fuggetlen >= 5 : j.fuggetlen === f)).length;
    const h = hamisak.filter((j) => (f === 5 ? j.fuggetlen >= 5 : j.fuggetlen === f)).length;
    kiir(sor([cimke, v, h], [20, 12, 12]));
  }
  kiir('');
}

function main() {
  const mag = Number(process.argv[2] ?? 42);
  const b = kornyezetbol(BEALLITAS);

  if (process.env.JELZESEK) {
    kiir('');
    kiir('A JELZÉSEK MÉRÉSE (D49) — különböztetnek-e valódi és hamis között?');
    kiir('='.repeat(70));
    jelzesekKiirasa(mag);
    return;
  }

  if (process.env.GORBE) {
    kiir('');
    kiir(`NÖVEKEDÉSI GÖRBE — ${b.valodiEmberek} ember · ${b.alapitok} alapító ` +
         `(${b.alapitoKorok} körben) · induló keret ${b.alapitoKeret} · k=${b.k}`);
    kiir('='.repeat(62));
    gorbeKiiras(mag);
    return;
  }

  kiir('');
  kiir('A HAMIS SZIGET MÉRÉSE — a Szakasz 4 beléptető szabályai');
  kiir('='.repeat(74));
  kiir('');
  kiir(`  ${b.valodiEmberek} valódi ember · ${b.alapitok} alapító · k=${b.k} · m=${b.m} · ` +
       `út≤${b.maxUtHossz} · ${b.korok} kör · mag=${mag}`);
  kiir(`  a támadó a ${b.tamadasKezdete}. körtől körönként ${b.hamisProbalkozas} ` +
       `hamis azonosságot próbál bevinni`);
  kiir('');

  const megtevesztesek = [0, 2, 4, 5, 8, 20];
  const szel = [22, 12, 10, 12, 14];

  for (const szabaly of SZABALYOK) {
    kiir('');
    kiir(`▶ ${szabaly.nev}  (${szabaly.leiras})`);
    kiir('-'.repeat(74));
    kiir(sor(['megtévesztett ember', 'valódi tag', 'horgony', 'HAMIS BENT', 'hamis horgony'], szel));
    for (const mt of megtevesztesek) {
      const e = futtatas(szabaly, mt, mag);
      kiir(sor([`  ${mt}`, e.valodiTagok, e.horgonyok, e.hamisBent, e.hamisHorgony], szel));
    }
  }

  kiir('');
  kiir('='.repeat(74));
  kiir('');
  kiir('MIT KELL NÉZNI:');
  kiir('  · „valódi tag" — NŐ-E a közösség? Ha ez megáll, a szabály befagyasztotta a koinót,');
  kiir('    akkor is, ha közben tökéletesen véd.');
  kiir('  · „HAMIS BENT" — hány hamis azonosság jutott be. A 0 megtévesztettnél mindig 0');
  kiir('    kell legyen; ha nem az, a szimulátor a hibás.');
  kiir('  · ⭐ A KÜSZÖB: a „C" és „D" szabálynál a hamisak száma ott ugorjon meg, ahol a');
  kiir('    megtévesztettek száma eléri a k-t. Ez a szűk keresztmetszet.');
  kiir('  · „hamis horgony" — bejutott-e hamis azonosság a horgony-körbe. Ha igen, a');
  kiir('    mérce elveszett, és minden más szám érdektelen.');
  kiir('');
}

main();
