#!/bin/sh
# koino/termux/indit.sh

# Felelősség: A KOINO EGY PARANCCSAL A TELEFONON (Termux) — a két folyamat (az őrjárat és a felület) indítása, a lap
# megnyitása a böngészőben, és a leállítás egy Ctrl+C-vel. Csaba (2026-11-01): „a d30-as szabályt ne rugjuk fel. maradjon a
# termux. megtudjuk oldani, hogy 1 parancs csomag bemásolássával a termuxban elég legyen?”
#
# ⭐ A program szerkezete nem változik (CS5 (A): két külön folyamat, a felület nem indít őrjáratot) — ez csak a telefonos
# indítás kényelme: a `koino` parancs (a `telepit.sh` teszi a Termux PATH-jára) ezt hívja.
#
# ⭐ HA MÉG NINCS KOINÓ: csak a felület indul; a lapon csatlakozol egy koinóhoz („🔗 Csatlakozás egy koinóhoz…”, a felület
# saját becenevével), és amint a becenév a koinó nevére mutat, az őrjárat magától elindul. ⚠️ Előbb nem: a jegyzetlen
# becenévvel az őrjárat egy üres, régi alakú koinót nyitna (a ⑦ terepi próba 2. lelete).
#
# ⭐ ARGUMENTUMMAL a program parancsa fut, ugyanazzal az adat-mappával: `koino belep`, `koino meghiv <horgony>`, `koino ter`.
# ⭐⭐ D122: ha az első argumentum egy MEGHÍVÓ (`koino-meghivo:2:…` — a meghívó telepítő sorának vége), előbb elfogadja (csatlakozás,
# a meghívó készüléke társnak, belépés), aztán indul: a lap már a koinóban nyílik, és a következő csere után tag vagy.
#
# Beállítható (környezet): KOINO_ADAT (alapból ~/koino-adat), KOINO_AZONOSITO (a becenév, alapból sajat), KOINO_ORJARAT_PORT
# (7373), KOINO_FELULET_PORT (7499), KOINO_KOR (az őrjárat köre percben, 1).
# Csak POSIX sh (a Termux `sh`-ja dash). Hálózatot és rendszer-beállítást nem érint.

KONYVTAR=$(cd "$(dirname "$0")/.." && pwd)
PROGRAM="$KONYVTAR/koino.js"
KOINO_ADAT="${KOINO_ADAT:-$HOME/koino-adat}"
export KOINO_ADAT
# ⭐ A program ebből tudja, hogy a `koino` parancs indította — a lap a `koino …` alakú parancsot javasolja.
KOINO_INDITO=koino
export KOINO_INDITO
BECENEV="${KOINO_AZONOSITO:-sajat}"
ORJARAT_PORT="${KOINO_ORJARAT_PORT:-7373}"
FELULET_PORT="${KOINO_FELULET_PORT:-7499}"
KOR="${KOINO_KOR:-1}"

# ===== ⭐ D122: A MEGHÍVÓ (az első argumentum) =====
MEGHIVO=""
case "$1" in
  *koino-meghivo:*) MEGHIVO="$1"; shift ;;
esac

# ===== ARGUMENTUMMAL: a program parancsa =====
if [ $# -gt 0 ]; then
  exec node "$PROGRAM" "$@"
fi

mkdir -p "$KOINO_ADAT"
if [ -n "$MEGHIVO" ]; then
  echo "· A meghívó: csatlakozás és belépés…"
  node "$PROGRAM" csatlakoz "$MEGHIVO"     || echo "⚠ A meghívót most nem sikerült elfogadni — a lapon is beillesztheted („🔗 Csatlakozás egy koinóhoz…”)."
fi
NAPLO_ORJARAT="$KOINO_ADAT/orjarat.log"
NAPLO_FELULET="$KOINO_ADAT/felulet.log"
ORJARAT=""
FELULET=""

# ===== A LEÁLLÍTÁS — mindkét folyamat, és az ébren tartás vége =====
#
# ⚠️ A háttérben indított folyamat egy nem interaktív héjban a Ctrl+C-t nem kapja meg (POSIX) — ezért a csapda állítja le.
leallitas() {
  [ -n "$ORJARAT" ] && kill "$ORJARAT" 2>/dev/null
  [ -n "$FELULET" ] && kill "$FELULET" 2>/dev/null
  command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock
  echo
  echo "A koino leállt."
  exit "${1:-0}"
}
trap 'leallitas 0' INT TERM

# Van-e már koinó a becenév alatt? (a `koino`, a `csatlakoz` és a lap csatlakozása jegyzi — `becenevek.json`)
van_koino() {
  grep -q "\"$BECENEV\"" "$KOINO_ADAT/becenevek.json" 2>/dev/null
}

orjarat_indul() {
  node "$PROGRAM" orjarat "$KOR" "$ORJARAT_PORT" > "$NAPLO_ORJARAT" 2>&1 &
  ORJARAT=$!
  echo "✓ Az őrjárat fut ($ORJARAT_PORT-es kapu, $KOR percenként) — a naplója: $NAPLO_ORJARAT"
}

# ===== AZ INDÍTÁS =====

# Alvás közben a telefon a hálózatot és a programot is lelassítja — amíg a koino fut, ébren tartjuk.
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

node "$PROGRAM" felulet "$FELULET_PORT" > "$NAPLO_FELULET" 2>&1 &
FELULET=$!
CIM=""
i=0
while [ -z "$CIM" ] && [ "$i" -lt 60 ]; do
  sleep 0.5
  i=$((i + 1))
  CIM=$(grep -o "http://127.0.0.1:$FELULET_PORT/?kulcs=[A-Za-z0-9_-]*" "$NAPLO_FELULET" 2>/dev/null | head -n 1)
  kill -0 "$FELULET" 2>/dev/null || break
done
if [ -z "$CIM" ]; then
  echo "⚠ A felület nem indult el (fut már egy koino? — akkor elég a böngészőben a régi lap). A naplója:"
  tail -n 5 "$NAPLO_FELULET"
  leallitas 1
fi
echo "✓ A felület fut: $CIM"
command -v termux-open-url >/dev/null 2>&1 && termux-open-url "$CIM"

if van_koino; then
  orjarat_indul
else
  echo "· Még nincs koinód: a lapon csatlakozz egyhez („🔗 Csatlakozás egy koinóhoz…”) — az őrjárat utána magától indul."
fi
echo "Leállítás: Ctrl+C"

# ===== A FIGYELÉS — a csatlakozásra vár, és kimondja, ha egy folyamat leállt =====
while :; do
  sleep 2
  if [ -z "$ORJARAT" ] && van_koino; then
    orjarat_indul
  fi
  if ! kill -0 "$FELULET" 2>/dev/null; then
    echo "⚠ A felület leállt. A naplója:"
    tail -n 5 "$NAPLO_FELULET"
    FELULET=""
    leallitas 1
  fi
  if [ -n "$ORJARAT" ] && ! kill -0 "$ORJARAT" 2>/dev/null; then
    echo "⚠ Az őrjárat leállt. A naplója:"
    tail -n 5 "$NAPLO_ORJARAT"
    ORJARAT=""
    leallitas 1
  fi
done
