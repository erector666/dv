### Processing Roadmap

High-level tasks to make uploads fast, accurate, and consistent across languages.

- Backend-triggered processing
  - Upload once to `incoming/{userId}/...`
  - Storage onFinalize triggers OCR → language → classify → summarize
  - Save final PDF (optional), delete original after success

- Text-first AI pipeline
  - Extract text once; pass text (not URL) to AIs
  - Dual AI (Hugging Face + DeepSeek or fallback); pick best by confidence
  - Heuristics layer (Cyrillic/French months/keywords/filename hints) override weak AI language

- Normalized fields for fast UI
  - Top-level: `language`, `category`, `name`, `tags` (include `lang:xx`)
  - Rich `metadata`: `textExtraction.extractedText`, `summary`, `entities`, `languageDetection`

- Unicode-safe naming
  - Preserve Unicode (Cyrillic). Strip only OS-forbidden characters
  - Use suggested title from text; fallback to stable pattern

- Reliability & idempotency
  - Idempotency key = storage path
  - Timeouts 120s + exponential backoff; safe retries
  - Write `status` and `error` fields to Firestore for observability

- Performance
  - Keep OCR/AI on Functions/Run; avoid client PDF conversion
  - Consider min instances on hot paths to reduce cold starts

- UX
  - Card badges: language, processing state
  - Viewer: easy access to extracted text (copy/search/download)

---

### YAML Execution Guide

```yaml
env:
  prerequisites:
    - node: ">=18" (Functions uses Node 20; local dev OK on 18+)
    - firebase-tools: "^14.15.1"
    - project: gpt1-77ce0 (or your active Firebase project)
  secrets:
    - set: REACT_APP_FIREBASE_* in .env

commands:
  # 1) Install dependencies
  install:
    - npm ci
    - cd functions && npm ci && cd ..

  # 2) Local dev
  dev:
    - npm run start   # React app on port 3000

  # 3) Deploy/update Functions (HTTP endpoints, optional onFinalize)
  deploy:functions:
    - cd functions
    - npm run build
    - npm run deploy  # firebase deploy --only functions
    - cd ..

  # 4) Enable backend-trigger processing (optional, if using onFinalize)
  storage:onFinalize:
    - add: functions/src/index.ts (object finalize handler)
    - deploy: deploy:functions

  # 5) Verify pipeline
  verify:
    - upload: a PDF and an image (Cyrillic and French samples)
    - check: Firestore doc fields (language, category, tags lang:xx, metadata.textExtraction)
    - confirm: final PDF present under documents/{uid}/ and original removed

rollback:
  - remove onFinalize export if needed
  - redeploy functions
  - client can fall back to client-orchestrated processing

observability:
  logs:
    - client: browser console (classificationService/documentService)
    - server: Firebase Functions logs
  firestore:
    - status: processing|ready|error
    - error: last error message, if any
```

---

### Notes

- Prefer passing extracted text to classification endpoints; avoid URL-based re-fetch.
- Keep retries bounded; record per-stage timings to spot bottlenecks.
- Use `lang:xx` tags for quick UI filters and card badges.


