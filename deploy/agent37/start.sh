#!/bin/bash
# next on 127.0.0.1:3001, the front door on :3000 (the public port), and the one-minute scheduler
# the standalone server listens on $HOSTNAME, which the platform sets to the machine name: pin it to loopback
HOSTNAME=127.0.0.1 PORT=3001 node server.js &
node front.mjs &
node cron.mjs &
wait -n
exit $?
