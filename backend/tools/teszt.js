// teszt.js
// Futtatás: node teszt.js  (Node.js 18+ szükséges)

const ALAP_URL = 'http://localhost:3000/api'; // Az API alap URL-je

// HTTP kérést végez, logolja az eredményt, hiba esetén kilép
async function keres(utvonal, beallitasok = {}) {
  const teljesUrl = `${ALAP_URL}${utvonal}`;
  const modszer = beallitasok.method || 'GET';

  // Kérés adatainak kiírása a konzolra
  console.log(`\n┌─ ${modszer} ${teljesUrl}`);

  // HTTP kérés küldése – headers külön kezeljük, hogy Content-Type ne vesszen el
  const valasz = await fetch(teljesUrl, {
    method: modszer,                         // HTTP metódus (POST, GET, stb.)
    headers: {
      'Content-Type': 'application/json',    // Mindig kell, különben Express nem dolgozza fel a body-t
      ...beallitasok.headers,                // Bearer token felülírja ha van, de Content-Type megmarad
    },
    body: beallitasok.body,                  // JSON string vagy undefined
  });

  // Válasz feldolgozása JSON-ként
  const adat = await valasz.json();

  // Státusz és válasz kiírása
  const sikerjel = valasz.ok ? '✔' : '✘';
  console.log(`└─ ${sikerjel} Státusz: ${valasz.status}`);
  console.log(`   Válasz:`, JSON.stringify(adat, null, 2));

  // Hiba esetén leállítjuk a futást
  if (!valasz.ok) {
    throw new Error(`HTTP ${valasz.status} – ${adat.message || JSON.stringify(adat)}`);
  }

  return adat; // Visszaadjuk a JSON választ
}

async function futtatas() {
  console.log('\n══════════════════════════════════════════');
  console.log('  KOINO API TESZT INDÍTÁSA');
  console.log('══════════════════════════════════════════');

  // ╔══════════════════════════════════════════╗
  // ║  1. SZAKASZ – ELŐKÉSZÍTÉS               ║
  // ╚══════════════════════════════════════════╝
  console.log('\n╔══ 1. SZAKASZ: Előkészítés ══╗');

  // tesztEmber1 regisztrálása
  console.log('\n── tesztEmber1 regisztráció ──');
  await keres('/eember/regisztracio', {
    method: 'POST',
    body: JSON.stringify({
      eemberNev: 'tesztEmber1',
      email: 'teszt1@examples.com',
      jelszo: 'jelszo123',
      nev: 'Teszt Ember',
      lokacio: { orszag: 'Magyarország', regio: 'Komárom-Esztergom', telepules: 'Tatabánya' },
    }),
  });

  // tesztEmber2 regisztrálása
  console.log('\n── tesztEmber2 regisztráció ──');
  await keres('/eember/regisztracio', {
    method: 'POST',
    body: JSON.stringify({
      eemberNev: 'tesztEmber2',
      email: 'teszt2@examples.com',
      jelszo: 'jelszo123',
      nev: 'Teszt Ember',
      lokacio: { orszag: 'Magyarország', regio: 'Komárom-Esztergom', telepules: 'Tatabánya' },
    }),
  });

  // tesztEmber1 bejelentkezik – JWT token elmentése
  console.log('\n── tesztEmber1 bejelentkezés ──');
  const bejelentkezes1 = await keres('/eember/bejelentkezes', {
    method: 'POST',
    body: JSON.stringify({ azonosito: 'teszt1@examples.com', jelszo: 'jelszo123' }),
  });
  const token1 = bejelentkezes1.token; // JWT token elmentése

  // 3 gondolat létrehozása tesztEmber1 tokenével
  console.log('\n── 3 gondolat létrehozása (tesztEmber1) ──');

  // Segédfüggvény: gondolat adatok összeállítása sorszám alapján
  const gondolatAdat = (sorszam) => ({
    cim: `A klímaváltozás hatásai${sorszam}`,
    szoveg: 'Részletes leírás a klímaváltozás következményeiről és a lehetséges megoldásokról.',
    gondolatTipusId: '',    // Nem kötelező mező
    kategoriaIds: [],       // Üres tömb – nincs kategória
    javaslatElfogadasiKuszob: 81,
    reszveteliAranyKuszob: 31,
    minimumDontesiIdo: 10,
    maximumDontesiIdo: 31001,
    kezdoTudatpont: 15,     // Kötelező, min. 1
    szuloId: '',            // Nincs szülő entitás
    szuloTipus: '',
  });

  // 1. gondolat – MongoDB _id elmentése
  const gondolat1Valasz = await keres('/gondolat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(gondolatAdat(1)),
  });
  const gondolat1Id = gondolat1Valasz.gondolat._id;

  // 2. gondolat – MongoDB _id elmentése
  const gondolat2Valasz = await keres('/gondolat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(gondolatAdat(2)),
  });
  const gondolat2Id = gondolat2Valasz.gondolat._id;

  // 3. gondolat – MongoDB _id elmentése
  const gondolat3Valasz = await keres('/gondolat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(gondolatAdat(3)),
  });
  const gondolat3Id = gondolat3Valasz.gondolat._id;

  console.log('\n  ✔ Létrehozott gondolat ID-k:');
  console.log(`     Gondolat1: ${gondolat1Id}`);
  console.log(`     Gondolat2: ${gondolat2Id}`);
  console.log(`     Gondolat3: ${gondolat3Id}`);

  // ╔══════════════════════════════════════════╗
  // ║  2. SZAKASZ – tesztEmber2 MŰVELETEI     ║
  // ╚══════════════════════════════════════════╝
  console.log('\n╔══ 2. SZAKASZ: tesztEmber2 műveletei ══╗');

  // tesztEmber2 bejelentkezik – JWT token elmentése
  console.log('\n── tesztEmber2 bejelentkezés ──');
  const bejelentkezes2 = await keres('/eember/bejelentkezes', {
    method: 'POST',
    body: JSON.stringify({ azonosito: 'teszt2@examples.com', jelszo: 'jelszo123' }),
  });
  const token2 = bejelentkezes2.token; // JWT token elmentése

  // Tudatpont hozzárendelések – egyenként 12 pont mindhárom gondolathoz
  console.log('\n── Tudatpont hozzárendelések (tesztEmber2, 12 pont/gondolat) ──');

  // Gondolat1-hez 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: gondolat1Id, entitasTipus: 'Gondolat', pontok: 12 }),
  });

  // Gondolat2-höz 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: gondolat2Id, entitasTipus: 'Gondolat', pontok: 12 }),
  });

  // Gondolat3-hoz 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: gondolat3Id, entitasTipus: 'Gondolat', pontok: 12 }),
  });

  // Csomag javaslat létrehozása – tesztEmber2 tokenével
  // (jogosult, mert mindhárom gondolathoz adott már tudatpontot)
  console.log('\n── Csomag javaslat létrehozása (tesztEmber2) ──');
  const javaslatValasz = await keres('/javaslat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({
      javaslatTipus: 'Csomag',
      szuloId: gondolat1Id,            // A javaslat szülő entitása
      egyezmenyTarhelyId: gondolat1Id, // Az egyezmény tárolási helye
      indoklas:
        'Ez egy komplex átszervezési javaslat, amely három különböző műveletet tartalmaz: ' +
        'egy gondolatot át kell helyezni másik szülő alá, egy másikat frissíteni kell, ' +
        'és egy harmadikat törölni kell, mert elavult.',
      erintettEntitasok: [
        {
          // Gondolat1 → áthelyezés Gondolat2 alá
          entitasId: gondolat1Id,
          entitasTipus: 'Gondolat',
          muvelet: 'Athelyezes',
          modositasAdatok: { ujSzuloId: gondolat2Id, ujSzuloTipus: 'Gondolat' },
        },
        {
          // Gondolat2 → cím és szöveg frissítése
          entitasId: gondolat2Id,
          entitasTipus: 'Gondolat',
          muvelet: 'Modositas',
          modositasAdatok: {
            cim: 'Frissített cím a csomagban',
            szoveg: 'Ez a gondolat most frissült egy csomag javaslat részeként.',
            kategoriaIds: [],
          },
        },
        {
          // Gondolat3 → törlés
          entitasId: gondolat3Id,
          entitasTipus: 'Gondolat',
          muvelet: 'Torles',
        },
      ],
      kezdoTudatpont: 150, // A javaslat indításához szükséges kezdő tudatpontok
    }),
  });

  // Javaslat ID kinyerése a válaszból
  const javaslatId = javaslatValasz.javaslat?.javaslatok?.[0]?._id;
  console.log(`\n  ✔ Létrehozott javaslat ID: ${javaslatId}`);

  // ╔══════════════════════════════════════════╗
  // ║  3. SZAKASZ – tesztEmber1 SZAVAZ        ║
  // ╚══════════════════════════════════════════╝
  console.log('\n╔══ 3. SZAKASZ: tesztEmber1 szavaz ══╗');

  // tesztEmber1 újra bejelentkezik – friss token szerzése
  console.log('\n── tesztEmber1 újra bejelentkezés ──');
  const bejelentkezes1Ujra = await keres('/eember/bejelentkezes', {
    method: 'POST',
    body: JSON.stringify({ azonosito: 'teszt1@examples.com', jelszo: 'jelszo123' }),
  });
  const token1Ujra = bejelentkezes1Ujra.token; // Friss JWT token elmentése

  // tesztEmber1 "Tamogat" szavazatot ad le a javaslathoz
  console.log('\n── Szavazat leadása: Tamogat (tesztEmber1) ──');
  await keres('/javaslat/szavazat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1Ujra}` },
    body: JSON.stringify({ javaslatId: javaslatId, szavazatTipus: 'Tamogat' }),
  });

  console.log('\n══════════════════════════════════════════');
  console.log('  ✔ TESZT SIKERESEN LEFUTOTT');
  console.log('══════════════════════════════════════════\n');
}

// Futtatás és globális hiba kezelés
futtatas().catch((hiba) => {
  console.error('\n══════════════════════════════════════════');
  console.error('  ✘ TESZT HIBA:', hiba.message);
  console.error('══════════════════════════════════════════\n');
  process.exit(1); // Kilépés hibakóddal
});