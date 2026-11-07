#!/bin/bash
# next on 127.0.0.1:3001, the front door on :3000 (the public port), and the one-minute scheduler
node server.js &
node front.mjs &
node cron.mjs &
wait -n
exit $?
