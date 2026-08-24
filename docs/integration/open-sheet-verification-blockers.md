# Open Sheet verification blockers

Last updated: 2026-07-21 (Asia/Saigon)

> Original Google Sheet-backed BridgeMapping activation remains blocked. The separately authorized API-native Module 1 pilot uses Neon/PostgreSQL and does not claim these Sheet blockers are resolved.

## Classification

- **unverified:** the blueprint exports a value or label, but the current Google Sheet has not been inspected.
- **assumption:** a branch/module relationship suggests a mapping, but the JSON does not state it directly. Assumptions are never emitted as active BridgeMapping values.
- **blocker:** information required for a safe live bridge is missing, contradictory, or not yet owner-approved.

## Blocking items

### B1 — Spreadsheet and tab identity is unverified

All modules export the spreadsheet reference <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> and restore path <code>" RIS 3.5 - SEO Template (110125)"</code>. The current file identity, exact tab inventory, numeric Sheet tab IDs, hidden/renamed tabs, and write permissions are unverified. Leading spaces in tab names are material.

### B2 — Twenty clear-range modules omit `sheetId`

The following JSON modules define a spreadsheet and range but no target sheet. A sibling route may suggest a tab, but adopting it would be an assumption, not a confirmed mapping.

| Scenario | Module ID | Exact range | Status |
| --- | ---: | --- | --- |
| 2 | 6 | range=A2:A | requires_sheet_verification |
| 2 | 15 | range=A2:A | requires_sheet_verification |
| 2 | 20 | range=A2:A | requires_sheet_verification |
| 2 | 25 | range=A2:A | requires_sheet_verification |
| 5 | 35 | range=C{{33.`__ROW_NUMBER__`}}:F{{33.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 5 | 44 | range=C{{42.`__ROW_NUMBER__`}}:F{{42.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 5 | 56 | range=C{{54.`__ROW_NUMBER__`}}:F{{54.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 5 | 68 | range=C{{66.`__ROW_NUMBER__`}}:F{{66.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 7 | 9 | range=I{{3.`__ROW_NUMBER__`}}:J{{3.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 7 | 24 | range=I{{22.`__ROW_NUMBER__`}}:J{{22.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 7 | 33 | range=I{{31.`__ROW_NUMBER__`}}:J{{31.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 7 | 42 | range=I{{40.`__ROW_NUMBER__`}}:J{{40.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 8 | 7 | range=K{{3.`__ROW_NUMBER__`}}:K{{3.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 8 | 15 | range=K{{12.`__ROW_NUMBER__`}}:K{{12.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 8 | 21 | range=K{{19.`__ROW_NUMBER__`}}:K{{19.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 8 | 27 | range=K{{25.`__ROW_NUMBER__`}}:K{{25.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 10 | 7 | range=M{{3.`__ROW_NUMBER__`}}:S{{3.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 10 | 31 | range=M{{29.`__ROW_NUMBER__`}}:S{{29.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 10 | 49 | range=M{{47.`__ROW_NUMBER__`}}:S{{47.`__ROW_NUMBER__`}} | requires_sheet_verification |
| 10 | 67 | range=M{{65.`__ROW_NUMBER__`}}:S{{65.`__ROW_NUMBER__`}} | requires_sheet_verification |

A fresh Make export that retains `sheetId`, or a screenshot/text export of each listed module's selected Sheet tab, is required. A Google Sheet workbook export alone cannot prove which tab each omitted `sheetId` module targets.

### B3 — Headers, indexed fields, and row semantics are unverified

Make expressions refer to zero-based fields such as `` `0` ``, `` `8` ``, and `` `24` ``. Exported `metadata.interface` labels are recorded in the module map, but they do not prove the live header row or column order. The meaning of Setup rows 2, 3, 4, and 5 is also absent from the JSON.

**Assumption not approved for bridge use:** the four router branches appear to correlate Setup rows 2–5 with base/variant tabs. Internal cross-tab references in modules 3, 5, 7, and 8 prevent treating that route pattern as authoritative.

### B4 — Completion protocol is absent

No blueprint sends an HTTP callback or webhook response to Antigravity. No stable completion/status cell is identified. Therefore all ten completion modes are `unknown`; neither callback nor polling can be activated until an explicit, verified completion signal is selected for each pilot/scenario.

### B5 — Webhook invocation contract is absent

Every scenario has a custom webhook module, but the exports declare no payload schema and downstream modules do not reference the webhook bundle. The JSON contains numeric hook references and labels, not a safe application request contract. Future live authorization must supply the secret webhook URL out of band and decide whether the bridge writes inputs to Sheet before sending an empty/minimal trigger.

### B6 — Internal blueprint contradictions need owner/Make review

- Scenario 3: Module 41 writes Keyword Research (Working)!A3 inside the route whose other working-sheet modules target the exact leading-space tab " Keyword Research(Working) 1".
- Scenario 5: Module 50 writes On-Page SEO while its route reads " On-Page SEO 1" with module 42.
- Scenario 5: Module 52 targets " On-Page SEO 1" but uses the Setup reader module 41 row number instead of module 42's On-Page SEO row number.
- Scenario 5: Module 62 targets On-Page SEO 2 but uses the Setup reader module 53 row number instead of module 54's On-Page SEO row number.
- Scenario 7: The Setup row-4 route reads " On-Page SEO 1" with module 31, then module 36 reads and module 38 writes On-Page SEO 2 using module 31's row number.
- Scenario 8: Module 23 writes On-Page SEO 3 using the row number read from On-Page SEO 2 by module 19.

These modules are documented exactly as exported. Reconciliation v1 does not silently repair them.

### B7 — Module 12 has no observable Sheet result

Module 12 reads `On-Page SEO!A2:Z500` and can create a published or draft WordPress post. It writes no `Upload Status` range, exposes no callback, and contains no Facebook module. A safe idempotent result/remote-ID contract is required before this scenario can ever be a pilot; it is not a suitable first pilot.

## Exact live-Sheet coverage that must be verified

The table below lists literal configured Sheet/address pairs. Repeated rows are collapsed per scenario. `<missing sheetId>` entries remain covered by B2.

| Scenario | Exact sheet | Configured address | Operations |
| --- | --- | --- | --- |
| 1 | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 1 | "Sitemap-Working" | cell=A1 | update_cell |
| 1 | "Sitemap" | cell=D3:D200 | update_cell |
| 1 | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 1 | "Sitemap-Working" | cell=A3 | update_cell |
| 1 | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 1 | "Sitemap-Working" | cell=A5 | update_cell |
| 1 | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 1 | "Sitemap-Working" | cell=A7 | update_cell |
| 2 | <missing sheetId> | range=A2:A | clear |
| 2 | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "Sitemap" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "Keywords" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 2 | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "Sitemap1" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "keywords 1" | rowNumber={{17.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 2 | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "Sitemap2" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "keyword 2" | rowNumber={{22.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 2 | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "Sitemap3" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 2 | "keywords 3" | rowNumber={{27.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 3 | "Keyword Research (Working)" | cell=A1 | clear, update_cell |
| 3 | "Keyword Research (Working)" | cell=A3 | clear, update_cell |
| 3 | "Keyword Research (Working)" | cell=A5 | clear, update_cell |
| 3 | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 3 | " Keyword Research(Working) 1" | cell=A1 | clear, update_cell |
| 3 | " Keyword Research(Working) 1" | cell=A3 | clear |
| 3 | " Keyword Research(Working) 1" | cell=A5 | clear, update_cell |
| 3 | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 3 | "Keyword Research (Working) 2" | cell=A1 | clear, update_cell |
| 3 | "Keyword Research (Working) 2" | cell=A3 | clear, update_cell |
| 3 | "Keyword Research (Working) 2" | cell=A5 | clear, update_cell |
| 3 | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 3 | "Keyword Research (Working) 3" | cell=A1 | clear, update_cell |
| 3 | "Keyword Research (Working) 3" | cell=A3 | clear, update_cell |
| 3 | "Keyword Research (Working) 3" | cell=A5 | clear, update_cell |
| 3 | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 4 | "Keyword Research (Working)" | cell=A7 | clear, update_cell |
| 4 | "Imported Keywords" | range=A2:B; tableFirstRow=A1:B1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | "On-Page SEO" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | <missing sheetId> | range=C{{33.`__ROW_NUMBER__`}}:F{{33.`__ROW_NUMBER__`}} | clear |
| 5 | "On-Page SEO" | rowNumber={{33.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | " On-Page SEO 1" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | <missing sheetId> | range=C{{42.`__ROW_NUMBER__`}}:F{{42.`__ROW_NUMBER__`}} | clear |
| 5 | " On-Page SEO 1" | rowNumber={{42.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | "On-Page SEO" | rowNumber={{42.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | " On-Page SEO 1" | rowNumber={{41.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | "On-Page SEO 2" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | <missing sheetId> | range=C{{54.`__ROW_NUMBER__`}}:F{{54.`__ROW_NUMBER__`}} | clear |
| 5 | "On-Page SEO 2" | rowNumber={{54.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | "On-Page SEO 2" | rowNumber={{53.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 5 | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | "On-Page SEO 3" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 5 | <missing sheetId> | range=C{{66.`__ROW_NUMBER__`}}:F{{66.`__ROW_NUMBER__`}} | clear |
| 5 | "On-Page SEO 3" | rowNumber={{66.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 6 | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 6 | "Home Page" | cell=A2 | update_cell |
| 6 | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 6 | "Home Page 1" | cell=A2 | update_cell |
| 6 | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 6 | "Home Page 2" | cell=A2 | update_cell |
| 6 | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 6 | "Home Page 3" | cell=A2 | update_cell |
| 7 | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | <missing sheetId> | range=I{{3.`__ROW_NUMBER__`}}:J{{3.`__ROW_NUMBER__`}} | clear |
| 7 | "On-Page SEO" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 7 | "On-Page SEO" | cell=I{{3.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | " On-Page SEO 1" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | <missing sheetId> | range=I{{22.`__ROW_NUMBER__`}}:J{{22.`__ROW_NUMBER__`}} | clear |
| 7 | " On-Page SEO 1" | rowNumber={{22.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 7 | " On-Page SEO 1" | cell=I{{22.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | <missing sheetId> | range=I{{31.`__ROW_NUMBER__`}}:J{{31.`__ROW_NUMBER__`}} | clear |
| 7 | " On-Page SEO 1" | rowNumber={{31.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 7 | "On-Page SEO 2" | cell=I{{31.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | "On-Page SEO 2" | rowNumber={{31.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 7 | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 7 | <missing sheetId> | range=I{{40.`__ROW_NUMBER__`}}:J{{40.`__ROW_NUMBER__`}} | clear |
| 7 | "On-Page SEO 3" | rowNumber={{40.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 7 | "On-Page SEO 3" | cell=I{{40.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | <missing sheetId> | range=K{{3.`__ROW_NUMBER__`}}:K{{3.`__ROW_NUMBER__`}} | clear |
| 8 | "On-Page SEO" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 8 | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | " On-Page SEO 1" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | <missing sheetId> | range=K{{12.`__ROW_NUMBER__`}}:K{{12.`__ROW_NUMBER__`}} | clear |
| 8 | " On-Page SEO 1" | rowNumber={{12.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 8 | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | "On-Page SEO 2" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | <missing sheetId> | range=K{{19.`__ROW_NUMBER__`}}:K{{19.`__ROW_NUMBER__`}} | clear |
| 8 | "On-Page SEO 3" | rowNumber={{19.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 8 | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 8 | <missing sheetId> | range=K{{25.`__ROW_NUMBER__`}}:K{{25.`__ROW_NUMBER__`}} | clear |
| 8 | "On-Page SEO 3" | rowNumber={{25.`__ROW_NUMBER__`}}; includesHeaders=true | update_row |
| 10 | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | <missing sheetId> | range=M{{3.`__ROW_NUMBER__`}}:S{{3.`__ROW_NUMBER__`}} | clear |
| 10 | "On-Page SEO" | cell=M{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=N{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=O{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=P{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=Q{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=R{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO" | cell=S{{3.`__ROW_NUMBER__`}} | update_cell |
| 10 | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | " On-Page SEO 1" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | <missing sheetId> | range=M{{29.`__ROW_NUMBER__`}}:S{{29.`__ROW_NUMBER__`}} | clear |
| 10 | " On-Page SEO 1" | cell=M{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=N{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=O{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=P{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=Q{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=R{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | " On-Page SEO 1" | cell=S{{29.`__ROW_NUMBER__`}} | update_cell |
| 10 | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | "On-Page SEO 2" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | <missing sheetId> | range=M{{47.`__ROW_NUMBER__`}}:S{{47.`__ROW_NUMBER__`}} | clear |
| 10 | "On-Page SEO 2" | cell=M{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=N{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=O{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=P{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=Q{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=R{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 2" | cell=S{{47.`__ROW_NUMBER__`}} | update_cell |
| 10 | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |
| 10 | <missing sheetId> | range=M{{65.`__ROW_NUMBER__`}}:S{{65.`__ROW_NUMBER__`}} | clear |
| 10 | "On-Page SEO 3" | cell=M{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=N{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=O{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=P{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=Q{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=R{{65.`__ROW_NUMBER__`}} | update_cell |
| 10 | "On-Page SEO 3" | cell=S{{65.`__ROW_NUMBER__`}} | update_cell |
| 12 | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | read |

## Minimum information the owner needs to provide later

1. A read-only `.xlsx` export of the referenced spreadsheet, preserving every referenced tab, header row, formulas, and the exact tab names.
2. A tab manifest containing each exact tab title and its numeric Google Sheet `sheetId`/gid. This is necessary because workbook exports do not reliably preserve the API tab ID contract.
3. For the 20 modules in B2, a fresh Make blueprint export that includes `sheetId`, or screenshots/text from the Make editor showing the selected tab for each module ID.
4. Confirmation of what Setup rows 2–5 represent and the authoritative header/column meanings for `Setup`, all Sitemap/Keywords/Keyword Research variants, all On-Page SEO variants, Imported Keywords, and Home Page variants.
5. Confirmation that every literal write/clear address is writable and whether formulas, protected ranges, merged cells, or data-validation rules occupy those targets.
6. For the selected pilot, one explicit completion contract: the exact poll sheet/cell/range and terminal condition, or a separately reviewed callback design. Existing JSON proves neither.
7. A reviewed disposition for each internal anomaly in B6: confirm it is intentional or provide a corrected Make export. Do not correct the mapping only in Markdown.
8. Later, and only after Phase 3 is authorized, the webhook URL/ownership and invocation policy through the server-side secret resolver. Do not place the secret URL in these documents or browser code.

## Pilot blocker summary

The evidence-only assessment originally recommended Module 4 because it has the smallest Sheet-backed graph. The owner later selected Module 1 with a revised API-native Neon/PostgreSQL scenario. All blockers in this document still apply before any original Sheet-backed scenario or mapping is activated; they do not block the separately documented Module 1 rewrite.

