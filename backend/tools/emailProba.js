// backend/tools/emailProba.js

// FEJLESZTŐI PRÓBA-ESZKÖZ: a koino levélküldésének ellenőrzése.
//
// Mire való? Megmutatja, milyen üzemmódban van a levél-kapu, és — ha meg van adva egy
// cím — küld rá egy próbalevelet. Így a levélküldés BEÁLLÍTÁSA (szolgáltató, API-kulcs,
// feladó-domain hitelesítése) külön ellenőrizhető, MIELŐTT bármelyik valódi funkció
// (cím-megerősítés, jelszó-helyreállítás, értesítés) ráépülne.
//
// FONTOS: ez az eszköz e-embert NEM érint. Nem nyúl az adatbázishoz, nem olvas
// e-mail-címeket — kizárólag arra a címre küld, amit a parancssorban megadsz.
//
// Futtatás — csak az üzemmód kiírása (nem küld semmit):
//   docker exec koino-backend      node tools/emailProba.js
//   docker exec koino-backend-prod node tools/emailProba.js
//
// Futtatás — próbalevél küldése egy címre:
//   docker exec koino-backend-prod node tools/emailProba.js sajat.cimem@pelda.hu
//
// Napló módban (ez az alapértelmezés, és a fejlesztői környezetben ez fut) a levél NEM
// hagyja el a gépet: a teljes tartalma a konzolra íródik. Valódi küldéshez a
// backend/.env.prod-ban be kell állítani: EMAIL_SZOLGALTATO, EMAIL_API_KULCS, EMAIL_FELADO.

// ===== IMPORTOK =====
// A dotenv-et védetten hívjuk: a prod a .env.prod-ot env_file-ként injektálja
// (nincs .env fájl a konténerben), ezért ott a dotenv hiánya/üres futása nem baj.
try { require('dotenv').config(); } catch (_) { /* prod: env_file adja a változókat */ }

const emailKuldoService = require('../services/emailKuldoService');
const emailSablonok     = require('../services/emailSablonok');

// ===== FŐ FUTÁS =====
async function futtatas() {
  console.log('emailProba - KEZDÉS');

  // ----- 1. LÉPÉS: AZ ÜZEMMÓD KIÍRÁSA -----
  // Ez önmagában is hasznos: megmondja, valódi küldésre van-e beállítva a rendszer,
  // és ha nem, PONTOSAN miért nem (hiányzó kulcs, hiányzó feladó, ismeretlen szolgáltató).
  const uzemmod = emailKuldoService.uzemmodLekerdezese();

  console.log('');
  console.log('========== A LEVÉL-KAPU ÁLLAPOTA ==========');
  console.log('  Üzemmód:          ', uzemmod.mod);
  console.log('  Indok:            ', uzemmod.ok);
  console.log('  Feladó beállítva: ', uzemmod.feladoBeallitva ? 'igen' : 'NEM');
  console.log('  Publikus URL:     ', uzemmod.publikusUrl);
  console.log('===========================================');
  console.log('');

  if (uzemmod.mod === 'naplo') {
    console.log('emailProba - NAPLÓ MÓD: valódi levél NEM megy ki, csak a konzolra íródik.');
    console.log('  (Ez fejlesztés közben a helyes és elvárt állapot.)');
    console.log('');
  }

  // ----- 2. LÉPÉS: A CÍMZETT KIOLVASÁSA -----
  // process.argv[0] = node, [1] = a script útvonala, [2] = az első valódi paraméter
  const cimzett = process.argv[2];

  if (!cimzett) {
    console.log('emailProba - VÉGE: nincs megadva címzett, nem küldünk próbalevelet.');
    console.log('  Próbalevél küldéséhez: node tools/emailProba.js sajat.cimem@pelda.hu');
    process.exit(0);
  }

  // ----- 3. LÉPÉS: A PRÓBALEVÉL ÖSSZEÁLLÍTÁSA ÉS KÜLDÉSE -----
  const idopontSzoveg = new Date().toLocaleString('hu-HU');
  const level = emailSablonok.probaLevel(idopontSzoveg);

  console.log('emailProba - próbalevél küldése...');

  // Az ALACSONY SZINTŰ kuldes()-t hívjuk, mert a címzett itt NEM egy e-ember, hanem egy
  // parancssorban megadott cím. (E-embernek szóló levélnél mindig a kuldesEemberNek()
  // a helyes út — az ellenőrzi a cím megerősítettségét is.)
  const eredmeny = await emailKuldoService.kuldes({
    cimzett,
    targy:  level.targy,
    szoveg: level.szoveg,
    html:   level.html,
    indok:  'proba',
  });

  console.log('');
  console.log('========== AZ EREDMÉNY ==========');
  console.log('  Sikeres:', eredmeny.sikeres ? 'IGEN' : 'NEM');
  console.log('  Üzemmód:', eredmeny.mod);
  if (eredmeny.hiba) console.log('  Hiba:   ', eredmeny.hiba);
  console.log('=================================');
  console.log('');

  if (eredmeny.sikeres && eredmeny.mod !== 'naplo') {
    console.log('emailProba - A levél átadva a szolgáltatónak.');
    console.log('  Ellenőrizd a postafiókot — ÉS a spam mappát is! Ha a spamben landolt,');
    console.log('  a feladó-domain hitelesítése (SPF/DKIM/DMARC) hiányzik vagy hibás.');
  }

  console.log('emailProba - VÉGE');
  process.exit(eredmeny.sikeres ? 0 : 1);
}

// Hibakezelés: a hiba kiírása után nem-nulla kilépési kód
futtatas().catch((hiba) => {
  console.error('emailProba - HIBA', hiba);
  process.exit(1);
});
