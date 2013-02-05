#!/usr/bin/env bash

cd "$(dirname "$0")"

PSWIP_PORT=9074
DEBUG_PORT=9222
DEVTOOLS_URL="http://localhost:$DEBUG_PORT/devtools/devtools.html?ws=127.0.0.1:$PSWIP_PORT"

"/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"\
  --user-data-dir="$TMPDIR/.chrome-user-data-UI"\
  --remote-debugging-port="$DEBUG_PORT"\
  "$DEVTOOLS_URL" &

DEBUG_PID="$!"
node index.js $PSWIP_PORT

kill "$DEBUG_PID"
