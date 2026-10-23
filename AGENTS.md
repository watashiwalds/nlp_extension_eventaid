# AGENTS.md

Context guide for AI agents and contributors working in this repository.
**This is a planning/specification repository — not (yet) a code repository.**

---

## 1. Project in one paragraph

A **Chrome Extension (Manifest V3)** that extracts personal schedule events from user data (open web pages, Gmail messages, email attachments, user-selected text), then lets the user review, store, and manage them with reminders. The architecture separates **data collection** from a **shared NLP pipeline** so new sources can be added later (Outlook, PDF, DOCX, etc.).

Collection channels (build order is intentional):
1. **Browser Page Parser** — implemented first (uses `activeTab` + `scripting`, filters noise with **Mozilla Readability**).
2. **Gmail API** — added in the final sprint (read-only email + attachments).

Both feed one **Document Processing Layer** and one **NLP Pipeline**.

---

## 2. Repository layout

| File | Role | Language |
|---|---|---|
| `base_idea.md` | Original problem statement; defines the **7-field event structure**. Source of truth for *what*. | Vietnamese |
| `proposed_technical.md` | Technical architecture, NLP pipeline, I/O formats, security, roadmap. Source of truth for *how*. | Vietnamese |
| `script.md` | Complete usage scenarios **KS-01 … KS-13** (+ appendices: data model, requirement matrices, roadmap mapping). Source of truth for *behavior*. | Vietnamese |
| `unfinished_script.svg` | Excalidraw draft of the original 4 flows; the seed for `script.md`. | — |
| `ke_hoach_thiet_ke_frontend.md` | Minimum frontend design plan for **Penpot** (P0 scope). Source of truth for *UI*. | Vietnamese |
| `ke_hoach_phat_trien.md` | Development plan: **TypeScript + Vite** stack, data contracts, model strategy, sprints, acceptance criteria. Source of truth for *build order*. | Vietnamese |
| `README.md` | Repo overview, demo features, how to build/load, next steps. | Vietnamese |
| `extension/` | Working MV3 demo (TypeScript + Vite, no ML). See `extension/README.md` for the file map. | TypeScript |
| `docs/DEVIATIONS.md` | Where the demo intentionally differs from the plan, and why. | Vietnamese |
| `docs/kiem-thu-demo.md` | Manual test checklist mapped to KS scenarios. | Vietnamese |
| `docs/phien-lam-viec-tiep-theo.md` | Handoff for the next session: manual test results, open issues, fix plan. | Vietnamese |
| `docs/thiet-ke-demo-va-san-sang-llama-cpp.md` | Demo architecture summary + readiness assessment for local llama.cpp event extraction. | Vietnamese |
| `docs/ke-hoach-llm-trich-xuat.md` | Implementation plan for the local LLM extraction layer (contracts, offscreen job, prompt, slices, eval). Source of truth for *LLM scope/order*. | Vietnamese |
| `docs/kiem-tra-slice-b.md` | Slice B acceptance record: provider, settings, side-panel run, real-model results, UI checks, and known gaps. | Vietnamese |
| `docs/ke-hoach-sau-nghiem-thu-b.md` | Post-acceptance plan for Slice B: event-first profile matching, deferred items, and verification steps. | Vietnamese |
| `.github/workflows/ci.yml` | Quality gate: typecheck, lint, test, build. | YAML |

> **All documentation is written in Vietnamese.** Keep new prose in Vietnamese unless explicitly told otherwise.
> This `AGENTS.md` is intentionally in English (agent-facing).

A git repository now exists at the root and the demo code lives in `extension/`. The stack is locked in §3; keep this file in sync when code changes.
The demo deliberately contains **no classifier/LLM** (manual events only) — see `docs/DEVIATIONS.md` before assuming a pipeline feature exists.

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
| Classifier | **scikit-learn TF-IDF + Logistic Regression** → JSON → TS inference | No ONNX Runtime / WASM |
| LLM | **llama.cpp server** via `fetch` (`127.0.0.1:8080`) | `InferenceProvider` interface; model-agnostic (empty model = loaded model); `MockProvider` for UI work |
| Training / eval | **Python + scikit-learn + pandas** | `tools/train_classifier.py`, `tools/eval/` |
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
- **Host permission is limited to `http://127.0.0.1:8080/*`** (the local llama.cpp server). Do not add broad `<all_urls>` host permissions.
- **All inference is local.** Page/email content must never be sent to a remote backend. The only network call is to the local llama.cpp server.
- **No remote code and no WASM in the MVP.** CSP stays `script-src 'self'`; model weights and JS are bundled or loaded as data, never as executable remote code.
- **All extension code is bundled by Vite** into `dist/`; no CDN imports or runtime script loading.
- **Gmail scope must stay read-only**: `https://www.googleapis.com/auth/gmail.readonly`. It is a restricted scope → public distribution may require OAuth verification.
- **A user must actively trigger** extraction; no silent/background reading of pages or mail.
- **Never execute scripts/macros from input documents** (PDF/DOCX/HTML). Parse content only.
- **Do not add a remote backend for OCR/inference.** If one is ever introduced, it requires explicit user notice, data-handling guarantees, and an update to §3.
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
Shared NLP Pipeline            (classify → extract → normalize → validate → dedup → profile match)
          │
          ▼
Schedule Store / Review UI     (IndexedDB; review & edit; notifications; export)
```

Runtime topology (how the pieces actually talk):

```text
src/platform/content ──NormalizedDocument──► src/platform/background (SW)
                                                  │  ▲
                                                  ▼  │ progress / result
                                      src/platform/offscreen
                                      ├─ src/core/classifier.ts
                                      └─ src/platform/offscreen/llm.ts ──HTTP──► llama-server 127.0.0.1:8080
                                                  │
                                                  ▼
                                      IndexedDB ◄──► src/ui/sidepanel.ts
```

System components (from `script.md` §0): Side panel (Full UI), Small UI pop-out, Content script, Service worker, Offscreen inference host, Classifier, Local LLM client, Gmail API client, Document Processing Layer, NLP pipeline, Storage (IndexedDB + `chrome.storage`), Notification engine.

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
- `validation.uncertain[]` — e.g. `nam_chua_ro`, `mui_gio_gia_dinh`.
- `notifications.{milestones, fired, mute}` — milestones: `1_tuan_truoc` / `1_ngay_truoc` / `ngay_dien_ra`.
- `completedAt`, `versionHistory` (populated by KS-12 updates).
- An event with **no valid `start`** is excluded from notification milestones until the user fills it in.

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

- **Scenario IDs are stable.** `KS-01 … KS-13` are referenced across files, matrices, and the roadmap. Never renumber; append new scenarios (`KS-14`, …).
- **Keep cross-references in sync.** If you add/rename a scenario, update: the catalog table (`script.md` §1), the requirement matrices (§3), Appendix B (roadmap map), and any references in `ke_hoach_thiet_ke_frontend.md` and `ke_hoach_phat_trien.md`.
- **Event field names must match Appendix A** of `script.md` exactly (`start`, `end`, `label`, `title`, `summary`, `relatedProfiles`, `sources`, `status`, …). When code exists, update `src/shared/contracts.ts` in the same change.
- **Message payloads live in `src/shared/messages.ts`.** Changing a message requires updating every sender/receiver and the contract tests.
- **`proposed_technical.md` uses numbered sections (§1–§10).** Preserve numbering when referencing (e.g. "§6 formats", "§7 NormalizedDocument").
- **Each scenario should have:** objective, precondition, user↔system step table, alternative flows, and a **result/postcondition** line. Maintain this shape when editing.
- **Roadmap phases (Appendix B):** Phase 1 Browser Page Parser → Phase 2 Gmail API → Phase 3 extraction quality → Phase 4 schedule management (KS-09 full, KS-10, KS-12, KS-13).

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
| Change classifier or LLM model | `ke_hoach_phat_trien.md` §6–§7, then `proposed_technical.md` |
| Adjust architecture/NLP/security | `proposed_technical.md` |
| Clarify original requirements | `base_idea.md` (rarely — treat as historical intent) |
| Backport a new flow into scenarios | `script.md` (derive from `unfinished_script.svg` if relevant) |

---

## 11. Current status

- **Demo (implemented):** `extension/` — page capture (filtered **page snapshot** with landmark/noise removal + Readability + raw DOM fallback + forced raw + selection + context-menu selection + **context-menu page scan**), **dedicated capture tab**, document viewer, profile CRUD, manual event CRUD (7 fields + **custom tags**, status machine, source refs, uncertain flags), **per-profile plans on overview**, **date/time split inputs**, **upcoming-first event ordering**, JSON export/import, and **direct local LLM extraction from the side panel** (Slice B: llama.cpp provider, per-chunk progress, cancel, drafts saved as `nhap`). **No offscreen/notifications, no Gmail API.**
- **Verified:** `npm run typecheck`, `npm run lint`, `npm test` (161 tests / 19 files incl. jsdom smoke, parse, page-snapshot, tag, extraction-core, profile-match, provider and settings tests), `npm run build` all pass; `dist/` loads unpacked.
- **LLM extraction (Slices A + B done, accepted 2026-10-23):** contracts carry `origin`/`extractionMeta`/`EventCandidate`/`ExtractionJob`/`LlmSettings`; `src/core/extraction/**` has chunk/prompt/schema/normalize/dedup/pipeline + `profile-match` + `MockProvider`; `src/core/ports/inference.ts` defines `InferenceProvider`; `src/platform/inference/llama-cpp.ts` implements it (health + `/v1/models`, timeout, abort, OpenAI-schema first with fallback, `enable_thinking:false`). Settings form + connection check exist. **Verified against llama.cpp build b10101 with Qwen3.5-4B Q5_K_S (8k context): 6 sample docs, 0 invented dates, 0.3–8.6 s/doc; prompt v2 at measurement time, now prompt v3; only OpenAI `response_format` actually enforces the schema. Chrome UI E2E passed; real-model rerun with v3/profile matching passed 2026-10-23 (9 events, 0 duplicates, 0 invented dates, 0.26–8.4 s/doc; missing-year guard added to `normalizeDateTime`); Slices C–E remain** (`docs/ke-hoach-llm-trich-xuat.md` §9.3, `docs/kiem-tra-slice-b.md`).
- **Post-acceptance fix done:** event-first extraction + deterministic profile matching after normalize (SB-01, prompt v3); truncation toast also hints at increasing limits (SB-03). See `docs/ke-hoach-sau-nghiem-thu-b.md`. Review UI and paraphrase dedup are deferred to Slice D.
- **Manual checks pending:** re-run `docs/kiem-thu-demo.md` in Chrome for context menu (page + selection), side-panel widths 320/360/400px, click areas, Gmail best-effort capture, and SPA/regression checks (KT-13/KT-14).
- **Build plan:** `ke_hoach_phat_trien.md` — 7 sprints / 14 weeks; web first, Gmail in the final sprint.
- **Tech stack:** locked in §3 (TypeScript + Vite, no UI framework, local llama.cpp server, linear classifier).
- **Quality gate:** `tsc --noEmit` + ESLint + Vitest + `vite build`; `dist/` is the load-unpacked target.
- **Inference:** local `llama-server`; **no hard-coded model name** (empty setting uses the loaded model). Verified with Qwen3.5-4B Q5_K_S, 8k context, `enable_thinking:false`; measured 0.3–8.6 s per short doc. p95 target remains 35–60 s per page.
- **Storage:** results are saved as drafts (`nhap`); user review moves them to `dang_theo_doi`.
- **Frontend design scope:** frozen at **P0**, **light mode only**, notification UI capped at **2 buttons** (Chrome Notification API limit; a 3rd action moves into the side panel).
- **Open follow-ups:** golden set + classifier dataset; OAuth verification requirements; confirmation of Chrome notification button limit; sync `proposed_technical.md` with the new pipeline.
- **Next demo steps:** offscreen + `alarms`/`notifications` (Slice C) → review/dedup UI (Slice D) → quality measurement (Slice E) → Gmail/PDF/DOCX (see `README.md` §6).
