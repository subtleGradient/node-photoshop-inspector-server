#!/usr/bin/env bash

cd "$(dirname "$0")"

URL="http://m.facebook.com/"
DEVTOOLS_URL="http://localhost:9222/devtools/devtools.html?ws=127.0.0.1:9074"

"/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"\
  --user-data-dir="$TMPDIR/.chrome-user-data-DEBUG"\
  --remote-debugging-port="9222"\
  "$URL" &
DEBUG_PID="$!"

"/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"\
  --user-data-dir="$TMPDIR/.chrome-user-data-UI"\
  "$DEVTOOLS_URL" &
UI_PID="$!"

sleep 1 && open -a Terminal &

node index.js

kill "$UI_PID"
kill "$DEBUG_PID"
