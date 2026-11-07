#!/usr/bin/env bash
# build Ivyward and put it on Agent37. first run creates the instance; later runs update it in place (same id,
# same URL, same env). needs:
#   AGENT37_API_KEY      from the Agent37 dashboard (workspace API keys)
#   deploy/agent37/env.production   the app's environment, KEY=value per line (never committed; see README)
#   AGENT37_INSTANCE_ID  after the first run (printed at the end), so later runs update instead of creating
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${AGENT37_API_KEY:?set AGENT37_API_KEY}"
ENVFILE=deploy/agent37/env.production
[ -f "$ENVFILE" ] || { echo "missing $ENVFILE (copy env.example and fill it in)"; exit 1; }
API=https://api.agent37.com/v1
auth=(-H "authorization: Bearer $AGENT37_API_KEY" -H "content-type: application/json")
# a call that shows Agent37's own error message when it fails (curl -f would hide it)
call() { # METHOD PATH [BODY]
  local out code
  out=$(mktemp)
  code=$(curl -sS -o "$out" -w "%{http_code}" "${auth[@]}" -X "$1" "$API$2" ${3:+-d "$3"}) || { echo "network error calling $1 $2" >&2; rm -f "$out"; return 1; }
  if [ "$code" -ge 300 ]; then echo "Agent37 said $code to $1 $2: $(head -c 600 "$out")" >&2; rm -f "$out"; return 1; fi
  cat "$out"; rm -f "$out"
}

# the app can't start without its settings: stop before building anything
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY CRON_SECRET FRONT_PROXY_SECRET; do
  grep -qE "^$k=.+" "$ENVFILE" || { echo "env.production is missing $k (is the AGENT37_ENV secret set?)"; exit 1; }
done

# 1. a clean export of the committed code, the Dockerfile at its root, public build settings only
CTX=$(mktemp -d)
git archive HEAD | tar -x -C "$CTX"
cp deploy/agent37/Dockerfile "$CTX/Dockerfile"
printf 'node_modules\n.next\n.git\n' > "$CTX/.dockerignore"
grep -E '^NEXT_PUBLIC_[A-Z0-9_]+=' "$ENVFILE" > "$CTX/.env.production" || true

# 2. build the template (a new revision each time)
npx --yes agent37 templates build "$CTX" --name ivyward --default-port 3000
rm -rf "$CTX"

# 3. the instance's environment as JSON (server secrets live only here and on the instance)
ENV_JSON=$(node -e '
  const fs=require("fs"); const out={};
  for (const line of fs.readFileSync(process.argv[1],"utf8").split(/\r?\n/)) {
    const m=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/); if(!m) continue;
    out[m[1]]=m[2].replace(/^"(.*)"$/,"$1");
  }
  process.stdout.write(JSON.stringify(out));' "$ENVFILE")

# the instance is found by name, so no id needs saving between deploys
if [ -z "${AGENT37_INSTANCE_ID:-}" ]; then
  AGENT37_INSTANCE_ID=$(call GET "/instances" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);const list=j.data??j.instances??j;const hit=(Array.isArray(list)?list:[]).find(i=>i.name==="Ivyward production"&&i.status!=="deleted");process.stdout.write(hit?.id??"")}catch{}})') || true
fi

if [ -z "${AGENT37_INSTANCE_ID:-}" ]; then
  # 4a. first deploy: always on (no sleeping), 2 vCPU / 4 GB, one public port with a stable name
  BODY=$(node -e 'const env=JSON.parse(process.argv[1]); process.stdout.write(JSON.stringify({template:"ivyward",name:"Ivyward production",resources:{cpu:2,memory:4,disk:10},region:process.env.REGION||"eu",env,auto_sleep:false,public_ports:[{port:3000,prefix:"ivyward",label:"Ivyward"}]}))' "$ENV_JSON")
  OUT=$(call POST "/instances" "$BODY")
  echo "$OUT" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log("instance:",j.id);console.log("set AGENT37_INSTANCE_ID="+j.id+" for later deploys");console.log(JSON.stringify(j.public_ports??j.urls??{},null,1))})'
else
  # 4b. later deploys: refresh the environment, then move the instance onto the new revision (disk kept)
  call PATCH "/instances/$AGENT37_INSTANCE_ID" "{\"env\":$ENV_JSON}" > /dev/null || echo "note: env update failed; continuing"
  call POST "/instances/$AGENT37_INSTANCE_ID/update" '{"template":"ivyward"}' > /dev/null
  echo "updated $AGENT37_INSTANCE_ID"
fi
