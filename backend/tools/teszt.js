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

  // 3 tartalom létrehozása tesztEmber1 tokenével
  console.log('\n── 3 tartalom létrehozása (tesztEmber1) ──');

  // Segédfüggvény: tartalom adatok összeállítása sorszám alapján
  const tartalomAdat = (sorszam) => ({
    cim: `A klímaváltozás hatásai${sorszam}`,
    szoveg: 'Részletes leírás a klímaváltozás következményeiről és a lehetséges megoldásokról.',
    tartalomTipusId: '',    // Nem kötelező mező
    kategoriaIds: [],       // Üres tömb – nincs kategória
    statusz: 'Lathato',
    javaslatElfogadasiKuszob: 81,
    reszveteliAranyKuszob: 31,
    minimumDontesiIdo: 10,
    maximumDontesiIdo: 31001,
    kezdoTudatpont: 15,     // Kötelező, min. 1
    szuloId: '',            // Nincs szülő entitás
    szuloTipus: '',
  });

  // 1. tartalom – MongoDB _id elmentése
  const tartalom1Valasz = await keres('/tartalom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(tartalomAdat(1)),
  });
  const tartalom1Id = tartalom1Valasz.tartalom._id;

  // 2. tartalom – MongoDB _id elmentése
  const tartalom2Valasz = await keres('/tartalom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(tartalomAdat(2)),
  });
  const tartalom2Id = tartalom2Valasz.tartalom._id;

  // 3. tartalom – MongoDB _id elmentése
  const tartalom3Valasz = await keres('/tartalom', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
    body: JSON.stringify(tartalomAdat(3)),
  });
  const tartalom3Id = tartalom3Valasz.tartalom._id;

  console.log('\n  ✔ Létrehozott tartalom ID-k:');
  console.log(`     Tartalom1: ${tartalom1Id}`);
  console.log(`     Tartalom2: ${tartalom2Id}`);
  console.log(`     Tartalom3: ${tartalom3Id}`);

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

  // Tudatpont hozzárendelések – egyenként 12 pont mindhárom tartalomhoz
  console.log('\n── Tudatpont hozzárendelések (tesztEmber2, 12 pont/tartalom) ──');

  // Tartalom1-hez 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: tartalom1Id, entitasTipus: 'Tartalom', pontok: 12 }),
  });

  // Tartalom2-höz 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: tartalom2Id, entitasTipus: 'Tartalom', pontok: 12 }),
  });

  // Tartalom3-hoz 12 pont
  await keres('/tudatpont/hozzarendeles', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ entitasId: tartalom3Id, entitasTipus: 'Tartalom', pontok: 12 }),
  });

  // Csomag javaslat létrehozása – tesztEmber2 tokenével
  // (jogosult, mert mindhárom tartalomhoz adott már tudatpontot)
  console.log('\n── Csomag javaslat létrehozása (tesztEmber2) ──');
  const javaslatValasz = await keres('/javaslat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({
      javaslatTipus: 'Csomag',
      szuloId: tartalom1Id,            // A javaslat szülő entitása
      egyezmenyTarhelyId: tartalom1Id, // Az egyezmény tárolási helye
      indoklas:
        'Ez egy komplex átszervezési javaslat, amely három különböző műveletet tartalmaz: ' +
        'egy tartalmat át kell helyezni másik szülő alá, egy másikat frissíteni kell, ' +
        'és egy harmadikat törölni kell, mert elavult.',
      erintettEntitasok: [
        {
          // Tartalom1 → áthelyezés Tartalom2 alá
          entitasId: tartalom1Id,
          entitasTipus: 'Tartalom',
          muvelet: 'Athelyezes',
          modositasAdatok: { ujSzuloId: tartalom2Id, ujSzuloTipus: 'Tartalom' },
        },
        {
          // Tartalom2 → cím és szöveg frissítése
          entitasId: tartalom2Id,
          entitasTipus: 'Tartalom',
          muvelet: 'Modositas',
          modositasAdatok: {
            cim: 'Frissített cím a csomagban',
            szoveg: 'Ez a tartalom most frissült egy csomag javaslat részeként.',
            kategoriaIds: [],
          },
        },
        {
          // Tartalom3 → törlés
          entitasId: tartalom3Id,
          entitasTipus: 'Tartalom',
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