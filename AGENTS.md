# AGENTS.md

Context guide for AI agents and contributors working in this repository.
**This repository contains the planning/specification docs and the working MV3 demo in `extension/`.**

---

## 1. Project in one paragraph

A **Chrome Extension (Manifest V3)** that extracts personal schedule events from user data (open web pages, Gmail messages, email attachments, user-selected text), then lets the user review, store, and manage them with reminders. The architecture separates **data collection** from a **shared NLP pipeline** so new sources can be added later (Outlook, PDF, DOCX, etc.).

Collection channels (build order is intentional):
1. **Browser Page Parser** — implemented first (uses `activeTab` + `scripting`, filters noise with **Mozilla Readability**).
2. **Gmail API** — added in the final sprint (read-only email + attachments).

Both feed one **Document Processing Layer** and one **NLP Pipeline**.

Inference runs **locally by default** (`llama.cpp` at `127.0.0.1:8080`). The approved extension
**provider choice** — local, any OpenAI-compatible endpoint (Gemini), or a home workstation via
Cloudflared — is **implemented** in `extension/` (KS-14) with per-origin consent and optional host
permissions. Keep the local default, and do not claim real Gemini/Cloudflared verification until
`docs/kiem-thu-demo.md` §8 has been run. See `docs/ke-hoach-da-provider.md` §8.

A local **PhoBERT TASK/NON_TASK screening service** (handed-over `ml_hasevent_filter/`, FastAPI at
`127.0.0.1:8081`; `8000` kept as an alias) is approved as a **document-level pre-filter** before the
LLM (Slice F, 2026-10-26). **F0 + F1 + F2 are implemented** (F2 on 2026-10-27): contracts + pure core,
HTTP client + settings card + storage + manifest/CSP, and the **job now runs screening → decision →
LLM** with a capture-tab checkbox, a conclusion line and a "Trích xuất toàn bộ" button. The default
mode is **`report`** (`DEFAULT_FILTER_MODE`) until F3 measures the model, so **no document is skipped
today** unless the user picks `screen`. When enabled it only decides whether to call the LLM — it
never trims the text sent to it. See `docs/ke-hoach-bo-loc-noi-dung.md`.

---

## 2. Repository layout

| File | Role | Language |
|---|---|---|
| `base_idea.md` | Original problem statement; defines the **7-field event structure**. Source of truth for *what*. | Vietnamese |
| `proposed_technical.md` | Technical architecture, NLP pipeline, I/O formats, security, roadmap. Source of truth for *how*. | Vietnamese |
| `script.md` | Complete usage scenarios **KS-01 … KS-14** (+ appendices: data model, requirement matrices, roadmap mapping). Source of truth for *behavior*. | Vietnamese |
| `unfinished_script.svg` | Excalidraw draft of the original 4 flows; the seed for `script.md`. | — |
| `ke_hoach_thiet_ke_frontend.md` | Minimum frontend design plan for **Penpot** (P0 scope + P1 boards B26–B28 for KS-14; UI code exists, Penpot boards not drawn). Source of truth for *UI*. | Vietnamese |
| `ke_hoach_phat_trien.md` | Development plan: **TypeScript + Vite** stack, data contracts, model strategy, sprints (S0–S6 + S7 provider choice + Slice F screening), acceptance criteria. Source of truth for *build order*. | Vietnamese |
| `README.md` | Repo overview, demo features, how to build/load, next steps. | Vietnamese |
| `extension/` | Working MV3 demo (TypeScript + Vite; local llama.cpp default + optional OpenAI-compatible provider, document-level PhoBERT screening wired into the job with `report` as default). See `extension/README.md` for the file map. | TypeScript |
| `docs/DEVIATIONS.md` | Where the demo intentionally differs from the plan, and why. | Vietnamese |
| `docs/kiem-thu-demo.md` | Manual test checklist mapped to KS scenarios. | Vietnamese |
| `docs/ke-hoach-llm-trich-xuat.md` | Implementation plan for the local LLM extraction layer (contracts, offscreen job, prompt, slices, eval). Source of truth for *LLM scope/order*. | Vietnamese |
| `docs/ke-hoach-da-provider.md` | Implemented provider-choice plan (local default, OpenAI-compatible remote, Gemini, Cloudflared workstation, consent, key) + implementation notes. Source of truth for *inference location*. | Vietnamese |
| `docs/ke-hoach-bo-loc-noi-dung.md` | Approved plan for the local **PhoBERT document-level screening** step before the LLM (Slice F0–F3, decisions, contracts, eval). Source of truth for *screening scope*. **F0 + F1 + F2 implemented (job wired, default `report`); F3 measurement pending.** | Vietnamese |
| `ml_hasevent_filter/` | Handed-over PhoBERT model + FastAPI service consumed over HTTP. **Do not modify.** | Python |
| `docs/ban-giao-slice-d.md` | Handoff from accepted Slice C to Slice D: reviewed scope, closed decisions, task order, acceptance criteria, KS-08 deviations. | Vietnamese |
| `docs/ban-giao-slice-e.md` | Handoff from accepted Slice D to Slice E: evaluation sample set, deterministic eval harness, real-model measurement protocol, model decision. | Vietnamese |
| `docs/ket-qua-danh-gia-slice-e.md` | Measured Slice E results (recall, invented dates, latency, 9B/4B/27B comparison, model decision). | Vietnamese |
| `docs/archive/` | Historical acceptance records, completed plans, and superseded assessments. **Do not use as current sources.** See `docs/archive/README.md`. | Vietnamese |
| `.github/workflows/ci.yml` | Quality gate: typecheck, lint, test, build. | YAML |

> **All documentation is written in Vietnamese.** Keep new prose in Vietnamese unless explicitly told otherwise.
> This `AGENTS.md` is intentionally in English (agent-facing).

A git repository now exists at the root and the demo code lives in `extension/`. The stack is locked in §3; keep this file in sync when code changes.
The demo contains **document-level content screening (Slice F2: runs in the job, default `report` so nothing is skipped)** and **LLM extraction** (Slices A–C accepted; see §11) and **provider choice (KS-14)** — check `docs/DEVIATIONS.md` before assuming a pipeline feature exists. **F3 measurement (raise default to `screen`) and the P7 manual checks are still pending.**

---

## 3. Tech stack (locked)

**TypeScript + Vite, no UI framework.** Chosen for code governance: the extension has four runtime contexts exchanging messages, where the compiler catches contract drift. Full rationale and tasks: `ke_hoach_phat_trien.md`.

| Layer | Choice | Notes |
|---|---|---|
| Language | **TypeScript 5.x, `strict: true`** | No `any` without a justified comment |
| Build | **Vite + `@crxjs/vite-plugin`** | Manifest in TS; HMR; output in `dist/` |
| UI | **HTML + CSS + TS view functions** | No React/Vue/Tailwind |
| State | Typed pub/sub store (~50 lines) | No Redux/Zustand |
| Storage | **IndexedDB** + typed wrapper (~150 lines) | No Dexie |
| Validation | **Zod** | Runtime validation of LLM output and messages; types inferred from schemas |
| Page extraction | **`@mozilla/readability`** (npm) | Bundled by Vite |
| Content screening | **PhoBERT TASK/NON_TASK microservice** (FastAPI, `127.0.0.1:8081` default, `8000` alias, handed-over `ml_hasevent_filter/`) — **F0 + F1 + F2 done (client, settings, job wiring, capture UI); default mode `report` until F3 measures** | Document-level only; never trims the text sent to the LLM. Port `platform/inference/phobert-filter.ts`, pure core `core/extraction/prefilter.ts`, job `platform/offscreen/run-job.ts`, settings `platform/storage/filter-settings.ts` + `ui/views/filter-settings.ts`. Supersedes the old TF-IDF plan. No ONNX Runtime / WASM in the extension |
| LLM | **llama.cpp server** via `fetch` (`127.0.0.1:8080`) by default; **any OpenAI-compatible endpoint** (Gemini, home workstation via Cloudflared) as an opt-in | `InferenceProvider` interface; factory in `platform/inference/factory.ts`; model-agnostic (empty model = loaded model); `MockProvider` for UI work; provider choice in `docs/ke-hoach-da-provider.md` |
| Training / eval | **Python + pandas** for eval; the PhoBERT model is handed over (no training in this repo) | `ml_hasevent_filter/` (do not modify), `tools/eval/` |
| Tests | **Vitest** + manual KS checklist | No Playwright in the MVP |

### Deliberately avoided (and why)

- **React / Vue / Svelte / Tailwind** — 17 screens do not justify the ecosystem; TS view functions + plain CSS are enough.
- **Dexie / ONNX Runtime** — replaced by a thin wrapper and a JSON-exported linear model.
- **Playwright** — manual checklist per scenario first; add later only if time allows.
- **WASM / WebGPU inference** — the MVP uses the local llama.cpp server.

### Structural rules that follow from the stack

- **Single contract source:** `src/shared/contracts.ts` (types + Zod schemas); `src/shared/messages.ts` for message unions. Never redefine payloads elsewhere.
- **Strict layering:** `src/core/**` is pure (no `chrome.*`, no `platform/`, no `ui/`) → `src/platform/**` adapters → `src/ui/**` views. **No reverse imports**; enforce with ESLint `import/no-restricted-paths`.
- `src/core/**` must stay importable from `tools/eval/run_eval.ts` in Node.
- Content script uses `@mozilla/readability` at build time; Vite/CRXJS bundles it. If CRXJS cannot inject it on demand, fall back to a Vite multi-entry build (see plan §4.2).
- `dist/` is the load-unpacked target; it is not committed.
- No `wasm-unsafe-eval` is needed in the CSP: `script-src 'self'`.
- File size target: ~300 lines, one responsibility (ESLint `max-lines`).

---

## 4. Platform & technical constraints (do not violate)

- **Chrome Extension Manifest V3.**
- Permissions: `activeTab`, `scripting`, `storage`, `unlimitedStorage`, `offscreen`, `alarms`, `notifications`, `sidePanel`, `contextMenus` (+ `identity` only when Gmail is added).
- **Host permission is minimal by default:** static `http://127.0.0.1:8080/*` for the local llama.cpp server. Remote inference uses `optional_host_permissions` (`https://*/*`, `http://localhost:8080/*`, `http://[::1]:8080/*`) + a runtime `chrome.permissions.request()` for the exact origin the user entered. Local aliases are requested at runtime and need no consent. **Slice F1 (implemented)** added static `http://127.0.0.1:8081/*`, `http://localhost:8081/*`, `http://127.0.0.1:8000/*` and `http://localhost:8000/*` for the local PhoBERT screening service — loopback only, not remote; the settings form accepts only those two ports. Do not add a broad static `<all_urls>` host permission.
- **Inference is local by default.** Page/email content must not leave the browser unless the user has explicitly selected a remote endpoint and given one-time consent for that origin. The provider-choice implementation is the only approved remote-inference path (`docs/ke-hoach-da-provider.md`); keep the local default and the two-layer guard (`ui/actions/extract.ts` + `offscreen/run-job.ts`).
- **Remote inference constraints:** opt-in only, never a silent default; **HTTPS only for every non-local host** (only `127.0.0.1`, `::1`, `localhost` may use HTTP); consent stored per non-local origin with a revoke action; API key stored locally, never exported in JSON or logged; no page/email content sent to an endpoint the user has not selected; bounded retries and clear 401/403/404/429/5xx errors. Do not add any other remote backend for OCR/inference.
- **No remote code and no WASM in the MVP.** CSP stays `script-src 'self'`; `connect-src` may list only the local server and approved remote endpoint patterns. Model weights and JS are bundled or loaded as data, never as executable remote code.
- **All extension code is bundled by Vite** into `dist/`; no CDN imports or runtime script loading.
- **Gmail scope must stay read-only**: `https://www.googleapis.com/auth/gmail.readonly`. It is a restricted scope → public distribution may require OAuth verification.
- **A user must actively trigger** extraction; no silent/background reading of pages or mail.
- **Never execute scripts/macros from input documents** (PDF/DOCX/HTML). Parse content only.
- **Do not add a remote backend for OCR/inference** outside the approved provider-choice plan. Any new remote service requires explicit user notice, data-handling guarantees, and an update to §3 and `docs/ke-hoach-da-provider.md`.
- **Limit document text size** fed to the model; report when truncation occurs.
- Readability failure → **fall back to raw DOM** (`raw_fallback`); bypass Readability entirely for user text selections.
- **Never invent uncertain fields.** If year/timezone/location is absent from the source, mark it `uncertain` — do not guess.

---

## 5. Architecture map

```text
Data Sources
├── Gmail API            (email body + attachments)
└── Browser Page Parser  (open page / open Gmail msg / selected text)
          │
          ▼
Document Processing Layer      (per-format parsers: HTML, PDF, DOCX, TXT, ICS, OCR)
          │
          ▼
Shared NLP Pipeline            (screen → extract → normalize → validate → dedup → profile match)
          │
          ▼
Schedule Store / Review UI     (IndexedDB; review & edit; notifications; export)
```

Runtime topology (how the pieces actually talk):

```text
src/platform/capture ──NormalizedDocument──► IndexedDB / side panel
                                                  │
                                                  │ RUN_EXTRACTION / CANCEL_EXTRACTION
                                                  ▼
                                      src/platform/background (SW)
                                      ├─ chrome.storage.session: extraction_job
                                      └─ offscreen document
                                                  │  ▲
                                                  ▼  │ JOB_PROGRESS / JOB_DONE / …
                                      src/platform/offscreen
                                      ├─ src/platform/offscreen/run-job.ts
                                      ├─ prefilter + phobert-filter.ts ──HTTP──► PhoBERT service 127.0.0.1:8081  (F2, skip only in `screen`)
                                      ├─ src/core/extraction/pipeline.ts
                                      └─ src/platform/inference/factory.ts
                                            ├─ llama-cpp.ts ──HTTP──► llama-server 127.0.0.1:8080
                                            └─ openai-compatible.ts ──HTTPS──► user-selected endpoint
                                                  │
                                                  ▼
                                      IndexedDB ◄──► src/ui/sidepanel.ts
```

System components (from `script.md` §0): Side panel (Full UI), Small UI pop-out, Content script, Service worker, Offscreen inference host, **Content screening service (Slice F, F2 wired)**, **Inference provider (local/remote)**, Gmail API client, Document Processing Layer, NLP pipeline, Storage (IndexedDB + `chrome.storage`), Notification engine.

---

## 6. Domain model

### Event — 7 fields (from `base_idea.md`)
`start` · `end`/duration · `label` (công_vụ / giải_trí / cá_nhân / kỷ_niệm / …) · `title` · `summary` (1–5 bullet points: topic, requirements, location, post-event outcome) · `relatedProfiles` · `sources`.

### Event lifecycle (`status`)
`nhap` (draft/pending review) → `dang_theo_doi` (tracked) → `hoan_thanh` (done) or `huy` (cancelled).
Completion is triggered **automatically** when the end time passes (service worker) **or manually** ("✓ Đã xong" in KS-09).

### Extraction method (`NormalizedDocument.extractionMethod`)
`readability` | `raw_dom` | `selection` | `parser`.

### Other key fields
- `tags: string[]` — custom tags (max 5, each ≤ 24 chars; default `[]` for older records). Kept separate from the fixed `label` enum.
- `validation.uncertain[]` — e.g. `nam_chua_ro`, `gio_chua_ro`, `ngay_khong_khop`, `mui_gio_gia_dinh`.
- `start`/`end` are `DateTimeRef`: `value` = full local datetime, `date` = `YYYY-MM-DD` when only the date is known, `raw` = source text. Date-only events keep `value: null`; notifications must use `value` only.
- `notifications.{milestones, fired, mute}` — milestones: `1_tuan_truoc` / `1_ngay_truoc` / `ngay_dien_ra`.
- `completedAt`, `versionHistory` (populated by KS-12 updates).
- An event with **no `start.value`** (including date-only) is excluded from notification milestones until the user fills in the time.

### Inference settings (`LlmSettings`) — provider choice implemented
`provider`: `local` (default) | `openai-compatible`; `endpoint`, `apiKey`, `model`;
`consentByOrigin: Record<origin, ISO timestamp>`. The API key is local-only and never exported.
Old records without `provider`/`consentByOrigin` are read with local/empty defaults. When
`provider='local'`, remote endpoint/key/model may stay stored but are ignored (except a local
alias); use `core/inference/provider-choice.ts` rather than re-implementing that rule.

See **Appendix A** of `script.md` for the documented interfaces. Once code exists, `src/shared/contracts.ts` is the canonical implementation — keep the two in sync.

---

## 7. Glossary (Vietnamese ↔ English)

Use Vietnamese in docs, but map to these English concepts:

| Vietnamese | English |
|---|---|
| Kịch bản | Scenario (`KS-xx`) |
| Sự kiện | Event |
| Hồ sơ | Profile |
| Nguồn trích | Source reference |
| Nhãn | Label / tag |
| Nhắc việc / Thông báo | Reminder / Notification |
| Hợp nhất / gộp trùng | Merge / dedup |
| Lọc nhiễu | Noise filtering |
| Vùng chọn (bôi đen) | Text selection |
| Xử lý xong | Processing complete |

*Convention:* `ND` = user action, `HT` = system response (see `script.md` §0).

---

## 8. Documentation conventions

- **Scenario IDs are stable.** `KS-01 … KS-14` are referenced across files, matrices, and the roadmap. Never renumber; append new scenarios (`KS-15`, …).
- **Keep cross-references in sync.** If you add/rename a scenario, update: the catalog table (`script.md` §1), the requirement matrices (§3), Appendix B (roadmap map), and any references in `ke_hoach_thiet_ke_frontend.md` and `ke_hoach_phat_trien.md`.
- **Event field names must match Appendix A** of `script.md` exactly (`start`, `end`, `label`, `title`, `summary`, `relatedProfiles`, `sources`, `status`, …). When code exists, update `src/shared/contracts.ts` in the same change.
- **Message payloads live in `src/shared/messages.ts`.** Changing a message requires updating every sender/receiver and the contract tests.
- **`proposed_technical.md` uses numbered sections (§1–§10).** Preserve numbering when referencing (e.g. "§6 formats", "§7 NormalizedDocument").
- **Each scenario should have:** objective, precondition, user↔system step table, alternative flows, and a **result/postcondition** line. Maintain this shape when editing.
- **Roadmap phases (Appendix B):** Phase 1 Browser Page Parser → Phase 2 Gmail API → Phase 3 extraction quality → Phase 4 schedule management (KS-09 full, KS-10, KS-12, KS-13) → **post-Phase-4 provider choice (KS-14, implemented F1–F5; manual endpoint checks pending)**.

### Editing the SVG
`unfinished_script.svg` is Excalidraw. Text rows are encoded as `<g transform="translate(X Y)">` … `<text x y>…</text>`. Prefer deriving content into `script.md` rather than hand-editing the SVG.

---

## 9. Working guidelines for agents

**Do**
- Read the relevant source file before editing; the docs are interdependent.
- Keep `ke_hoach_phat_trien.md` (build order) and `ke_hoach_thiet_ke_frontend.md` (UI scope) consistent with any behavior change.
- Preserve Vietnamese prose, existing heading structure, and ID/numbering schemes.
- Before finishing a code change, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`.
- Flag logical gaps (orphan states, missing postconditions, unmatched validation↔notification rules) instead of silently "fixing" the spec.
- When a change touches behavior, verify it against `base_idea.md` (requirements) and `proposed_technical.md` (feasibility).

**Don't**
- Don't translate the docs to English unless asked.
- Don't introduce requirements that contradict the read-only / active-trigger / no-invented-fields rules.
- Don't send page/email content to a remote endpoint without an explicit, per-origin user consent — the local default is part of the product contract.
- Don't delete or rewrite `unfinished_script.svg` (original source artifact).
- Don't add a UI framework, Dexie, ONNX Runtime, or a second state library without an ADR.
- Don't introduce a build step other than Vite; don't add remote CDN imports.

---

## 10. Common tasks & where to edit

| Task | Edit |
|---|---|
| Add/change a usage scenario | `script.md` §2, then sync §1, §3, Appendix B, and the design plan |
| Change the event schema | `script.md` Appendix A (canonical), then `src/shared/contracts.ts` |
| Change a message/contract | `src/shared/contracts.ts` + `src/shared/messages.ts`, then sync Appendix A |
| Fix build/manifest config | `vite.config.ts` / `manifest.config.ts` |
| Adjust frontend design scope | `ke_hoach_thiet_ke_frontend.md` |
| Adjust tech stack / sprint plan | `ke_hoach_phat_trien.md` (and §3 of this file) |
| Change screening or LLM model | `ke_hoach_phat_trien.md` §6–§7, `docs/ke-hoach-bo-loc-noi-dung.md`, then `proposed_technical.md` |
| Change inference location/provider | `docs/ke-hoach-da-provider.md`, then update `script.md` KS-14, `proposed_technical.md` §9, `ke_hoach_phat_trien.md` §7/§9, `ke_hoach_thiet_ke_frontend.md`, and `AGENTS.md` §3–§4 |
| Content screening (Slice F) | `docs/ke-hoach-bo-loc-noi-dung.md`, then update `script.md` KS-04/KS-05, `proposed_technical.md` §8–§9, `ke_hoach_phat_trien.md` §6/§9, `AGENTS.md` §3–§5, and `docs/DEVIATIONS.md` |
| Adjust architecture/NLP/security | `proposed_technical.md` |
| Clarify original requirements | `base_idea.md` (rarely — treat as historical intent) |
| Backport a new flow into scenarios | `script.md` (derive from `unfinished_script.svg` if relevant) |

---

## 11. Current status

- **Demo (implemented):** `extension/` — page capture (filtered **page snapshot** with landmark/noise removal + Readability + raw DOM fallback + forced raw + selection + context-menu selection + **context-menu page scan**), **dedicated capture tab**, document viewer, profile CRUD, manual event CRUD (7 fields + **custom tags**, status machine, source refs, uncertain flags), **per-profile plans on overview**, **date/time split inputs**, **upcoming-first event ordering**, JSON export/import, **LLM extraction in an offscreen job** (Slices B + C: llama.cpp default + optional OpenAI-compatible provider, per-chunk progress, persist/reopen, cancel, completion notification, drafts saved as `nhap`), **Slice D review** (`Máy đề xuất`/confidence badges, review mode + bulk approve/delete, confirmed date warnings, paraphrase duplicate suggestions), **provider choice (KS-14: local default, remote endpoint, consent, permissions, key)**, and **document-level screening (Slice F2: checkbox, conclusion line, "Trích xuất toàn bộ"; default `report`)**. **No Gmail API; event reminders (`chrome.alarms`, KS-10) are not implemented.**
- **Verified:** `npm run typecheck`, `npm run lint` (0 warnings), `npm test` (405 tests / 42 files incl. jsdom smoke, parse, page-snapshot, tag, extraction-core, review/confidence/similar, profile-match, provider local/remote/factory/permissions, settings, job-state, offscreen-runner, **screening job scenarios + capture UI**, and Slice E eval tests; the live `llama-server` suite adds 17 skipped tests), `npm run build` all pass; `dist/` includes `src/platform/offscreen/index.html` and loads unpacked. Remote endpoint testing with Gemini/Cloudflared is **not** part of this automated run.
- **LLM extraction (Slices A + B accepted 2026-10-23; Slice C accepted 2026-10-24; Slice D accepted 2026-10-24):** contracts carry `origin`/`extractionMeta`/`EventCandidate`/`ExtractionJob`/`LlmSettings`; `src/core/extraction/**` has chunk/prompt/schema/normalize/dedup/pipeline + `profile-match` + `MockProvider`; `src/core/ports/inference.ts` defines `InferenceProvider`; `src/platform/inference/llama-cpp.ts` implements it (health + `/v1/models`, timeout, abort, OpenAI-schema first with fallback, `enable_thinking:false`). Settings form + connection check exist. **Verified against llama.cpp build b10101 with Qwen3.5-4B Q5_K_S (8k context): 6 sample docs, 0 invented dates, 0.3–8.6 s/doc; prompt v2 at measurement time, now prompt v4; only OpenAI `response_format` actually enforces the schema. Chrome UI E2E passed; real-model rerun with v3/profile matching passed 2026-10-23 (9 events, 0 duplicates, 0 invented dates, 0.26–8.4 s/doc; missing-year guard added to `normalizeDateTime`). Slice C offscreen/notification work passed manual acceptance 2026-10-24; Slice D review/duplicate UI passed manual acceptance 2026-10-24; Slice E was measured on 2026-10-24 — 15 fixtures, deterministic MockProvider suite + live `llama-server` harness, 9B IQ4_XS selected, 4B Q5_K_S eliminated for recall < 80%**; **supplementary 27B measurement on 2026-10-26: Ternary-Bonsai-2-27B PTQ1_0 reached recall 90.9%, 0 invented dates, 0 JSON errors, but p95 127.3 s > 90 s, so it was eliminated and 9B remains selected** (`docs/ke-hoach-llm-trich-xuat.md` §9.3, `docs/ban-giao-slice-e.md`, `docs/ket-qua-danh-gia-slice-e.md`, `docs/kiem-tra-slice-d.md`; historical records in `docs/archive/kiem-tra-slice-b.md` and `docs/archive/kiem-tra-slice-c.md`).
- **Post-acceptance fix done:** event-first extraction + deterministic profile matching after normalize (SB-01, prompt v3); truncation toast also hints at increasing limits (SB-03); date-only sources now keep `DateTimeRef.date` instead of losing the date, ISO dates are checked against the source (`ngay_khong_khop`), and prompt v4 forbids inventing `00:00` (SB-12). Historical details: `docs/archive/ke-hoach-sau-nghiem-thu-b.md`. Slice D adds the review mode, bulk approve/delete, confidence/origin badges, full-quote source view and paraphrase duplicate suggestions (`src/core/event-review.ts`, `src/core/extraction/{confidence,similar}.ts`, `src/ui/{views/event-card.ts,views/event-review.ts,actions/review.ts}`).
- **Slice D (accepted 2026-10-24):** review mode sorts attention-needing `llm` drafts first without changing global `sortEvents()`; selection/approve/delete are UI-only state; date-only/no-date approval requires confirmation; duplicate suggestions are display-only (no auto-merge). KS-08 deviations recorded in `docs/DEVIATIONS.md`; checklist in `docs/kiem-thu-demo.md` §4.1; record in `docs/kiem-tra-slice-d.md`.
- **Provider choice (KS-14, implemented 2026-10-26):** `docs/ke-hoach-da-provider.md` + `script.md` KS-14 define local default, any OpenAI-compatible endpoint (Gemini), home workstation via Cloudflared, per-origin consent, key handling, optional host permission and acceptance. Code shipped: `OpenAiCompatibleProvider`, factory, provider-choice rules, consent UI, permission flow, key revoke/delete and error mapping. **2026-10-26 fix 1:** Gemini's `/models` returns IDs prefixed `models/` and the health check used to overwrite the configured model, so `/chat/completions` returned 404 after a successful connection check; the provider now keeps the user's model, only auto-detects when the field is empty, strips the `models/` prefix and skips embedding models, and includes 404 response detail. **2026-10-26 fix 2 (hypothesis-based):** extraction with `gemini-3.5-flash-lite` then returned 400 `Request contains an invalid argument`; remote requests now send `EXTRACTION_WIRE_SCHEMA` (generator-only constraints such as nested `maxItems`, `minimum`/`maximum`, `maxLength` stripped; `required`/`enum`/`additionalProperties` kept) and downgrade once to `json_object` on 400/422, while local keeps the full schema and Zod stays authoritative. **Manual checks with real Gemini/Cloudflared endpoints are still pending** (the Gemini runs that exposed these bugs were not a full §8 pass); do not claim those were verified.
- **Content screening — Slice F (F0 + F1 + F2 implemented; F3 + P7 pending):** local PhoBERT TASK/NON_TASK microservice (`ml_hasevent_filter/`, FastAPI at `127.0.0.1:8081`, `8000` alias) used as a **document-level** pre-filter. **F0** = contracts + pure core (`core/ports/content-filter.ts`, `core/extraction/{filter-types,prefilter,mock-filter}.ts`). **F1 (2026-10-27)** = `platform/inference/phobert-filter.ts` (`/health` 2 s, `/analyze`, Zod response, `FilterError`), `platform/storage/filter-settings.ts`, settings card (`ui/views/filter-settings.ts`, `ui/actions/filter-settings.ts`, `ui/settings-wiring.ts`), `store.contentFilter`, manifest/CSP for ports 8081 + 8000 on loopback. **F2 (2026-10-27, commit `a30bbd5`)** = `run-job.ts` runs screening (health → windows sized by `filterCharBudget` → sequential `/analyze` → `summarizeFilter`) and short-circuits before creating any provider when `screen` + `no_event`; `donePatch()` + filter-aware notification + `offscreen/main.ts` deps (`loadFilterSettings`, `PhobertTaskFilter`, `filterRunMode`, abort mapping); capture UI (`screeningToggle`, `screeningResult`, `extract-events-all`), `store.filterScreenEnabled`/`lastExtraction`. Modes `off`/`report`/`screen`; **default is `report` (`DEFAULT_FILTER_MODE`) until F3 proves 0 positive documents skipped**; skip threshold `0.85` + at least 3 sentences, fail-open, never screens selections/pasted text, and the LLM always receives the full text (no sentence trimming). Live probe 2026-10-27 (`device: cuda`): positive doc → `has_event` 3/3, 23 ms; four negative docs → none skipped (2 `uncertain`, 2 false-positive `has_event`), which is why `report` stays the default. Estimated **5–6.5 person-days**, independent of S7. Plan: `docs/ke-hoach-bo-loc-noi-dung.md` §12.4; checklist §9 of `docs/kiem-thu-demo.md` still pending.
- **Manual checks pending:** re-run `docs/kiem-thu-demo.md` in Chrome for context menu (page + selection), side-panel widths 320/360/400px, click areas, Gmail best-effort capture, and SPA/regression checks (KT-13/KT-14). Slice C offscreen/notification checks and Slice D review checks are closed by acceptance (2026-10-24). **Provider-choice checks (§8) are still pending: a real Gemini run exposed the model-override 404 and then a 400 `invalid argument` (both addressed on 2026-10-26), so §8.2 must be re-run**; the F1 client was verified against the live service on 8081 in Node (`health` → `device: cuda`, `analyze` 28 ms), but pressing "Kiểm tra kết nối" in Chrome is still pending, and **screening behaviour checks (P7, `docs/kiem-thu-demo.md` §9) are now unblocked but not yet run**.
- **Build plan:** `ke_hoach_phat_trien.md` — 7 sprints / 14 weeks; web first, Gmail in the final sprint; **S7 (post-demo) = provider choice**, code F1–F5 done, real-endpoint checks pending; **Slice F (post-demo, independent) = PhoBERT screening**, 5–6.5 person-days.
- **Tech stack:** locked in §3 (TypeScript + Vite, no UI framework, local llama.cpp server by default, optional OpenAI-compatible endpoint implemented, local PhoBERT screening microservice **client + settings + job wiring implemented, default `report`**).
- **Quality gate:** `tsc --noEmit` + ESLint + Vitest + `vite build`; `dist/` is the load-unpacked target.
- **Inference:** local `llama-server` by default; **no hard-coded model name** (empty setting uses the loaded model). Verified with Qwen3.5-4B Q5_K_S and Qwen3.5-9B IQ4_XS, 8k context, `enable_thinking:false`; Slice E measured 2–10 s/doc (4B) and 20–34 s/doc (9B). p95 acceptance target is ≤ 90 s/page; 9B measured 34 s. Ternary-Bonsai-2-27B PTQ1_0 (b10827) was measured on 2026-10-26: recall 90,9%, 0 invented dates, but p95 127,3 s → eliminated. **Remote OpenAI-compatible endpoint is implemented**; Gemini/Cloudflared still need real-endpoint measurement.
- **Storage:** results are saved as drafts (`nhap`); user review moves them to `dang_theo_doi`.
- **Frontend design scope:** frozen at **P0**, **light mode only**, notification UI capped at **2 buttons** (Chrome Notification API limit; a 3rd action moves into the side panel). **P1 addition:** boards B26–B28 for KS-14 — UI code implemented, Penpot boards not yet drawn.
- **Open follow-ups:** golden set (currently 15/150); screening eval set + real-model measurement (Slice F3); OAuth verification requirements; confirmation of Chrome notification button limit; sync `proposed_technical.md` with the new pipeline; **run KS-14 manual checks (Gemini `response_format` + thinking, Cloudflared 100 s timeout, `[::1]` host permission)**.
- **Next demo steps:** finish Slice F (P7 manual checks, then F3 measurement and the `screen` default) and remaining KS-14 real-endpoint checks → event reminders (`chrome.alarms`, KS-10) → Gmail/PDF/DOCX (see `README.md` §6).
