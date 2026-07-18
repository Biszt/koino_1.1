// backend/tools/osLancPotlas.js

// EGYSZERI MIGRÁCIÓ: az osLanc mező pótlása a régi értesítésekben.
// Az osLanc mező 2026-07-15-én került be (A1) — az ELŐTTE keletkezett értesítésekből
// hiányzik, ezért azok NEM számítanak bele a kártya-badge részfa-számlálásába és az
// ág-szűrt postafiókba (a fő menü badge-e jó volt, az nem osLanc-alapú).
// Ez a szkript minden osLanc nélküli értesítéshez felépíti az esemény entitásának
// ős-láncát UGYANAZZAL a logikával, mint az éles létrehozás
// (ertesitesiBeallitasService.szuloKereses), és beírja az adatbázisba.
// Futtatás (Docker dev): docker exec koino-backend node tools/osLancPotlas.js
// Többször is futtatható — csak a hiányos rekordokhoz nyúl.

// ===== IMPORTOK =====
require('dotenv').config();
const mongoose = require('mongoose');
const Ertesites = require('../models/ertesites');
const { szuloKereses } = require('../services/ertesitesiBeallitasService');

// ===== ŐS-LÁNC FELÉPÍTÉSE EGY ENTITÁSHOZ =====
// Ugyanaz a bejárás, mint a cimzettekFeloldasa-ban: első elem maga az entitás,
// utána a szülők a gyökérig. Ha az entitás már nem létezik (törölték), a lánc
// az entitás önmagából áll — az is helyes: a saját kártyáján így is számítana.
async function osLancFelepitese(entitasId, entitasTipus) {
  const osLanc = [];
  let aktId = entitasId;
  let aktTipus = entitasTipus;
  while (aktId && aktTipus) {
    osLanc.push({ entitasId: aktId, entitasTipus: aktTipus });
    const szulo = await szuloKereses(aktId, aktTipus);
    if (!szulo) break;
    aktId = szulo.szuloId;
    aktTipus = szulo.szuloTipus;
  }
  return osLanc;
}

// ===== FŐ FUTÁS =====
async function futtatas() {
  console.log('osLancPotlas - KEZDÉS');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('osLancPotlas - MongoDB kapcsolat él');

  // A hiányos értesítések: nincs osLanc mező, vagy üres a tömb
  const hianyosak = await Ertesites.find({
    $or: [{ osLanc: { $exists: false } }, { osLanc: { $size: 0 } }],
  }).select('entitasId entitasTipus');

  console.log('osLancPotlas - hiányos értesítések:', hianyosak.length);

  // Entitásonként CSAK EGYSZER építjük fel a láncot (cache), mert sok értesítés
  // szólhat ugyanarról az entitásról
  const lancCache = new Map(); // '<tipus>:<id>' -> osLanc
  let frissitett = 0;

  for (const ertesites of hianyosak) {
    const kulcs = `${ertesites.entitasTipus}:${ertesites.entitasId}`;

    if (!lancCache.has(kulcs)) {
      const lanc = await osLancFelepitese(ertesites.entitasId, ertesites.entitasTipus);
      lancCache.set(kulcs, lanc);
      console.log('osLancPotlas - lánc felépítve', { kulcs, lancHossz: lanc.length });
    }

    await Ertesites.updateOne(
      { _id: ertesites._id },
      { $set: { osLanc: lancCache.get(kulcs) } }
    );
    frissitett++;
  }

  console.log('osLancPotlas - VÉGE', {
    frissitett,
    kulonbozoEntitas: lancCache.size,
  });

  await mongoose.disconnect();
  process.exit(0);
}

// Hibakezelés: a hiba kiírása után nem-nulla kilépési kód
futtatas().catch((hiba) => {
  console.error('osLancPotlas - HIBA', hiba);
  process.exit(1);
});
