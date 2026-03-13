# MCP Server — Local Setup Notes

Notes from getting the MCP server prototype running against the Direct File backend on macOS with Colima/Docker.

## Only Certain Components Need to be Started

The MCP server only needs the backend API and its dependencies — not the full Docker Compose stack. We started a subset of services:

```sh
docker compose up -d api csp-simulator
```

This automatically pulls in the transitive dependencies:
- **direct-file-db** (Postgres 15)
- **localstack** (S3, SQS, KMS, SNS, IAM, Lambda mocks)
- **redis**

Services that are not needed:
- `screener` — static site; has a pre-existing `npm ci` lock file mismatch (`picocolors@1.1.0` vs `1.1.1`)
- `email-service` / `email-service-db` — not required for MCP tool testing
- `state-api` / `state-api-db` — not required for core tax return operations
- `wiremock` — mock service, not needed
- Monitoring stack (`otel-collector`, `prometheus`, `grafana`) — behind a Docker Compose profile

## Issues Encountered and Fixes

### 1. Postgres data directory permissions (Colima)

**Symptom:** `chown: changing ownership of '/var/lib/postgresql/data': Permission denied`

**Cause:** The Docker Compose file runs Postgres as uid/gid 999 by default. On macOS with Colima, the container can't `chown` host-mounted directories.

**Fix:** Pass your local user/group IDs when starting:

```sh
DF_DB_USER_ID=$(id -u) DF_DB_GROUP_ID=$(id -g) docker compose up -d api csp-simulator
```

If the data directory is in a bad state, clean it first:

```sh
rm -rf docker/db/postgres/data
mkdir -p docker/db/postgres/data
```

### 2. Missing localstack fixture files

**Symptom:** `error while creating mount source path '.../sample-tax-return.xml': chown ... Permission denied`

**Cause:** The `docker-compose.yaml` mounts several state-api localstack files that aren't tracked in git. When Docker tries to mount a missing file path, it creates an empty directory instead, which then fails on subsequent runs.

**Fix:** Create empty placeholder files:

```sh
mkdir -p state-api/docker/localstack
touch state-api/docker/localstack/sample-tax-return.xml \
      state-api/docker/localstack/fakestate.cer \
      state-api/docker/localstack/fakestate_expired.cer
```

### 3. TypeScript build — vitest.config.ts outside rootDir

**Symptom:** `error TS6059: File 'vitest.config.ts' is not under 'rootDir' ... 'src'`

**Cause:** The `tsconfig.json` had `rootDir: "./src"` but no `include`/`exclude`, so `tsc` picked up `vitest.config.ts` at the project root via the default include pattern (`**/*`).

**Fix:** Added explicit `include` and `exclude` to `tsconfig.json`:

```json
{
  "compilerOptions": { ... },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Screener build failure (not fixed — not needed)

**Symptom:** `npm ci` fails with `lock file's picocolors@1.1.0 does not satisfy picocolors@1.1.1`

**Cause:** The upstream `df-client/package-lock.json` is out of sync with resolved dependency versions. Running `npm install --package-lock-only` fixes it locally but introduces a larger diff (346 deletions, 53 insertions) that causes a downstream Vite build failure with `@trussworks/react-uswds` exports.

**Status:** Not fixed. This is a pre-existing upstream issue unrelated to the MCP server. The screener is not needed for MCP server testing.

## Complete Startup Sequence

From the repo root:

```sh
# 1. Create missing fixture files (one-time)
mkdir -p direct-file/state-api/docker/localstack
touch direct-file/state-api/docker/localstack/sample-tax-return.xml \
      direct-file/state-api/docker/localstack/fakestate.cer \
      direct-file/state-api/docker/localstack/fakestate_expired.cer

# 2. Start backend services (Colima-compatible)
cd direct-file/
DF_DB_USER_ID=$(id -u) DF_DB_GROUP_ID=$(id -g) docker compose up -d api csp-simulator

# 3. Verify the API is up
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/df/file/api/swagger-ui/index.html
# Expected: 200

# 4. Build and verify the MCP server
cd mcp-server/
npm install
npm run build
npm test

# 5. Smoke test MCP server against the live backend
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | \
  DIRECT_FILE_API_URL=http://localhost:8080 node dist/index.js 2>/dev/null
# Expected: JSON response with serverInfo.name = "direct-file"
```

## Services Running After Setup

| Container | Port | Purpose |
|:----------|:-----|:--------|
| direct-file-api | 8080 | Backend API (what the MCP server connects to) |
| direct-file-csp-simulator | 5000 | CSP auth simulator (browser login) |
| direct-file-db | 5435 | Postgres database |
| localstack | 4566 | AWS service mocks (S3, SQS, KMS, etc.) |
| redis | 6379 | Session/cache store |
