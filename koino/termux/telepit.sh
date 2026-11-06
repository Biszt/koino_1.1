#!/bin/sh
# koino/termux/telepit.sh

# Felelősség: AZ ELSŐ INDÍTÁS a telefonon (Termux) — a bemásolt egy sor a letöltés után ezt hívja: ellenőrzi, hogy a Node tud-e
# Ed25519-et (a koino minden műveletet aláír — ha ez nincs meg, semmi más nem számít), a Termux PATH-jára teszi a `koino`
# parancsot (a további indításhoz és a program parancsaihoz), és elindítja (`indit.sh`).
#
# A bemásolandó sor (docs/telepites_telefon.md, „A legegyszerűbb út”; ⭐ D122: a meghívó a végén — a lap „Meghívóim” ablaka adja):
#   yes | pkg upgrade && pkg install -y nodejs git procps && { if [ -d ~/koino_1.1 ]; then git -C ~/koino_1.1 fetch --depth 1
#   origin main && git -C ~/koino_1.1 reset --hard FETCH_HEAD || echo …; else git clone --depth 1
#   https://github.com/Biszt/koino_1.1.git ~/koino_1.1; fi; } && sh ~/koino_1.1/koino/termux/telepit.sh
#
# ⭐⭐ D123 (PR7): a sor a már telepített programot FRISSÍTI is (a git a program mappáját a legújabbra állítja — az adat a
# `~/koino-adat`-ban, a mappán kívül: nem érinti), és ez a szkript már az új kód: ha egy másik Termux-ablakban még a régi koino fut,
# leállítja (lent, „A FUTÓ KOINO LEÁLLÍTÁSA”). `KOINO_INDITAS=nem`: a telepítő nem indítja el a programot (a próbáknak).
# ⚠️ A program magától nem frissül (csak ha a sort bemásolod): hogy melyik kódot futtatja egy koinó, az a közösség dolga (a
# koino-verzió kártya, D119 — és ha a gépeden más a számítás magja, mint amivel a koinó született, a lap kimondja: D123).

KONYVTAR=$(cd "$(dirname "$0")/.." && pwd)

if [ -z "$PREFIX" ] || [ ! -d "$PREFIX/bin" ]; then
  echo "Ez a telepítő a Termuxnak készült (a \$PREFIX nincs beállítva). Számítógépen: node koino/koino.js felulet"
  exit 1
fi

# ===== ⭐ A KÖLTÖZÉS (2026-11-06): a P2P koino saját tárba költözött =====
#
# Ez a régi tár (`koino_1.1`) fagyasztott másolata — csak a régi meghívó-sorok miatt áll itt. Az új program a github.com/Biszt/koino
# tárban van, a telefonon a `~/koino` mappában: letöltjük (vagy frissítjük), és az ő telepítője folytat, a meghívóval. Az adat
# (`~/koino-adat`) közös, marad; a régi helyről futó koinót az új telepítő leállítja, és a `koino` parancs az új helyre mutat.
if [ "$KOINO_KOLTOZES" != "nem" ]; then
  UJ_HELY="$HOME/koino"
  if [ -d "$UJ_HELY/.git" ]; then
    git -C "$UJ_HELY" fetch --depth 1 origin main && git -C "$UJ_HELY" reset --hard FETCH_HEAD
  else
    git clone --depth 1 https://github.com/Biszt/koino.git "$UJ_HELY"
  fi
  if [ -f "$UJ_HELY/termux/telepit.sh" ]; then
    echo "· A koino új helyre költözött: $UJ_HELY — onnan folytatom."
    exec sh "$UJ_HELY/termux/telepit.sh" "$@"
  fi
  echo "⚠ Az új helyet (github.com/Biszt/koino) most nem sikerült letölteni — a régi program indul."
fi

# ===== A VIZSGA: tud-e a Node Ed25519-et? =====
if ! node -e "crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']).then(()=>process.exit(0),()=>process.exit(1))"; then
  echo "⚠ A telefon Node-ja nem tud Ed25519-aláírást — a koino így nem futhat. Frissítsd: pkg upgrade nodejs"
  exit 1
fi
echo "✓ A Node tud Ed25519-et ($(node -v))"

# ===== ⭐ D123 (PR7): A FUTÓ KOINO LEÁLLÍTÁSA =====
#
# Ha egy másik Termux-ablakban még fut a koino (ebből a mappából), az a régi kódot futtatja, és a felület portját is fogja — ezért
# leállítjuk: az indítót és a két folyamatot TERM-mel (az indító csapdája a sajátjait is leállítja, és az ébren tartást elengedi),
# ami 10 mp után is fut, azt erővel. A `pkill` a `procps` csomagé (a telepítő sor hozza); ha nincs, a felület induláskor kimondja,
# hogy egy koino már fut.
if command -v pkill >/dev/null 2>&1; then
  if pgrep -f "$KONYVTAR/koino.js" >/dev/null 2>&1 || pgrep -f "$KONYVTAR/termux/indit.sh" >/dev/null 2>&1; then
    pkill -TERM -f "$KONYVTAR/termux/indit.sh" 2>/dev/null
    pkill -TERM -f "$KONYVTAR/koino.js" 2>/dev/null
    i=0
    while pgrep -f "$KONYVTAR/koino.js" >/dev/null 2>&1 && [ "$i" -lt 20 ]; do
      sleep 0.5
      i=$((i + 1))
    done
    pkill -KILL -f "$KONYVTAR/koino.js" 2>/dev/null
    echo "· A futó koinót leállítottam — az új programmal indul újra."
  fi
fi

# ===== A `koino` PARANCS =====
cat > "$PREFIX/bin/koino" <<EOF
#!$PREFIX/bin/sh
exec sh "$KONYVTAR/termux/indit.sh" "\$@"
EOF
chmod 700 "$PREFIX/bin/koino"
echo "✓ Telepítve. A következő indításhoz elég ennyi: koino"
echo
if [ "$KOINO_INDITAS" = "nem" ]; then
  echo "(KOINO_INDITAS=nem — nem indítom el)"
  exit 0
fi

# ⭐ D122: a meghívó (ha a telepítő sor végén ott van) az indítóhoz megy — az fogadja el
exec sh "$KONYVTAR/termux/indit.sh" "$@"
