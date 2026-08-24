# Blueprint Reconciliation v1

Last updated: 2026-07-21 (Asia/Saigon)

> Status: evidence extraction for the ten supplied blueprints is complete. This document is not approval to activate a live bridge or begin Phase 3.

## Decision

The supplied JSON proves the configured Make module graph, literal spreadsheet references, literal sheet/range/cell values, and inter-module expressions. It does not prove the current Google Sheet structure, a webhook request contract, or a completion protocol. All ten scenarios therefore remain in `completion.mode = unknown`, and BridgeMapping activation remains blocked pending the owner's review plus the verification items in `open-sheet-verification-blockers.md`.

No live webhook was called, no Google Sheet was read or written, no callback was implemented, the automation registry remains mock-only, and Phase 3 was not started.

## Scope and evidence rules

- Included exactly 10 supplied blueprint JSON files: modules 1, 2, 3, 4, 5, 6, 7, 8, 10, and 12. Additional blueprints are excluded and do not block this v1 result.
- Actual Make behavior comes from blueprint JSON. The legacy integration matrix is compared as a claim set, not used to overwrite JSON.
- Exact whitespace is preserved. JSON-quoted names below make leading spaces visible.
- Header labels shown beside indexed fields come from Make's exported `metadata.interface`. They are evidence of the export, but the current live headers still require Sheet verification.
- Dynamic expressions such as <code>{{3.`__ROW_NUMBER__`}}</code> are recorded literally. Their dependency on another module is classified as <code>inferred_from_module_references</code>.
- Matrix timeout/retry values are not adopted as blueprint facts. The supplied blueprints do not define an Antigravity timeout or retry policy; those values may only return through a reviewed system decision.

## Confidence legend

| Level | Meaning in this reconciliation |
| --- | --- |
| `confirmed_from_blueprint` | Literal module presence or configuration in a supplied JSON file. |
| `inferred_from_module_references` | Derived from an explicit Make expression linking one module ID/field to another. |
| `requires_sheet_verification` | The JSON omits the mapping, or the mapping/header must be checked against the current live Sheet before bridge use. |

## Cross-blueprint findings

- Total extracted: **294 Make modules**, including **173 Google Sheet modules**.
- Google Sheet operations: <code>read</code> 58, <code>update_cell</code> 50, <code>clear</code> 33, <code>update_row</code> 32. There are **no search modules and no append modules** in these ten blueprints.
- Every Google Sheet module uses the same literal spreadsheet reference <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code>. The exported restore path is <code>" RIS 3.5 - SEO Template (110125)"</code>; its leading space is preserved.
- All ten scenarios begin with a <code>gateway:CustomWebHook</code> module. None exports a request payload schema, and none of the downstream module expressions references the webhook bundle.
- No scenario contains an HTTP module or `gateway:WebhookResponse`; therefore there is no callback to Antigravity in the supplied JSON.
- `polling` is a possible future orchestration choice, not a behavior proved by these blueprints. Completion remains `unknown` for all ten.
- Exact sheet names with leading/trailing whitespace: <code>" Keyword Research(Working) 1"</code>, <code>" On-Page SEO 1"</code>.
- 20 clear-range modules have a spreadsheet and range but no <code>sheetId</code>; those mappings are <code>requires_sheet_verification</code>.

### Scenario inventory

| Scenario | Webhook module / exported hook | Modules | Google Sheet operations | Exact referenced sheets | Callback | Completion |
| --- | --- | ---: | --- | --- | --- | --- |
| 1 — RIS 3.5 Module #1 - Sitemap | #9 / 1486236 (CreateSitemap1) | 16 | read=4, update_cell=5 | "Setup", "Sitemap-Working", "Sitemap" | no | unknown |
| 2 — RIS 3.5 Module #2 - Sitemap Keywords | #1 / 1486286 (SitemapKeywords) | 22 | clear=4, read=8, update_row=4 | <missing sheetId>, "Setup", "Sitemap", "Keywords", "Sitemap1", "keywords 1", "Sitemap2", "keyword 2", "Sitemap3", "keywords 3" | no | unknown |
| 3 — RIS 3.5 Module #3 - ICN Keywords | #9 / 1486327 (ICN Keywords) | 42 | clear=12, read=4, update_cell=12 | "Keyword Research (Working)", "Setup", " Keyword Research(Working) 1", "Keyword Research (Working) 2", "Keyword Research (Working) 3" | no | unknown |
| 4 — RIS 3.5 Module #4 - Imported Keywords | #45 / 1486349 (Imported Keywords) | 6 | clear=1, read=1, update_cell=1 | "Keyword Research (Working)", "Imported Keywords" | no | unknown |
| 5 — RIS 3.5 Module #5 - On-Page SEO | #32 / 1486397 (On-Page-SEO) | 50 | read=8, clear=4, update_row=16 | "Setup", "On-Page SEO", <missing sheetId>, " On-Page SEO 1", "On-Page SEO 2", "On-Page SEO 3" | no | unknown |
| 6 — RIS 3.5 Module #6 - Home Page Content | #9 / 1486441 (Home Page Content) | 14 | read=4, update_cell=4 | "Setup", "Home Page", "Home Page 1", "Home Page 2", "Home Page 3" | no | unknown |
| 7 — RIS 3.5 Module #7 - Content Headline | #1 / 1486473 (Content Headline) | 38 | read=12, clear=4, update_row=8 | "Setup", "On-Page SEO", <missing sheetId>, " On-Page SEO 1", "On-Page SEO 2", "On-Page SEO 3" | no | unknown |
| 8 — RIS 3.5 Module #8 - Content Intro | #1 / 1486483 (Content Intro) | 26 | read=8, clear=4, update_row=4 | "Setup", "On-Page SEO", <missing sheetId>, " On-Page SEO 1", "On-Page SEO 2", "On-Page SEO 3" | no | unknown |
| 10 — RIS 3.5 Module #10 - Content Sections | #1 / 1486519 (Content Sections) | 74 | read=8, clear=4, update_cell=28 | "Setup", "On-Page SEO", <missing sheetId>, " On-Page SEO 1", "On-Page SEO 2", "On-Page SEO 3" | no | unknown |
| 12 — RIS 3.5 Module #12 - Upload to WordPress &amp; FB | #3 / 1486533 (Upload to Wordpress) | 6 | read=1 | "On-Page SEO" | no | unknown |

## Global conflicts with `blueprint_integration_matrix.md`

- The matrix treats `Setup!A2:J2` as a universal Antigravity write contract. The blueprints contain no Setup write modules. They read rows 2 through 5; modules 7, 8, and 10 read `A:Z`, not only `A:J`.
- The matrix maps Setup column A to location and B to industry. Exported Make interfaces label A only as `(A)`, B as `Primary Keyword (B)`, C as `Tone of Voice (C)`, D as `Language (D)`, and E as `Website Brief (E)`. These labels still require live Sheet verification and must not yet become a domain mapping.
- The matrix asserts a callback completion route for every scenario. The blueprint graph proves that no callback-capable module is present.
- The matrix's provider keys, environment-variable names, webhook request shapes, persistence targets, timeouts, and retries are application/system design claims. They are not Make behavior encoded in the JSON.
- Every matrix target range differs materially from at least one literal blueprint target; the per-scenario sections below enumerate the differences.

## Per-blueprint reconciliation

### 1. RIS 3.5 Module #1 - Sitemap

- Source: <code>RIS 3.5 Module #1 - Sitemap.blueprint.json</code>; SHA-256 <code>1ba26ce51daa1154ad27181fbc8face8f7464bf87a47bb81998cc3454e400e07</code>.
- Scenario module IDs: <code>9</code>, <code>12</code>, <code>1</code>, <code>11</code>, <code>3</code>, <code>23</code>, <code>24</code>, <code>13</code>, <code>19</code>, <code>15</code>, <code>16</code>, <code>17</code>, <code>18</code>, <code>20</code>, <code>21</code>, <code>22</code>.
- Custom webhook: module <code>9</code>, exported hook reference <code>1486236</code>, restore label <code>"CreateSitemap1"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix says Antigravity writes Setup!A2:J2; the scenario only reads Setup!A2:J2 through Setup!A5:J5.
- The matrix names Sitemap!A2:A as the output. The blueprint writes Sitemap!D3:D200 and Sitemap-Working!A1, A3, A5, and A7.
- The matrix declares an Antigravity callback; the blueprint contains no HTTP or webhook-response module.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | google-sheets:getSheetContent / read | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `5` → Competitor 1 (F); `6` → Competitor 2 (G); `7` → Competitor 3 (H); `8` → Competitor 4 (I); `9` → Competitor 5 (J); `3` → Language (D) | module_output_bundle: "Setup" @ A2:J2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:updateCell / update_cell | "Sitemap-Working" | cell=A1 | value={{11.choices[].message.content}}; refs: {{11.choices[].message.content}} | — | sheet_write: "Sitemap-Working" @ A1 | confirmed_from_blueprint + inferred_from_module_references |
| 24 | google-sheets:updateCell / update_cell | "Sitemap" | cell=D3:D200 | value={{23.choices[].message.content}}; refs: {{23.choices[].message.content}} | — | sheet_write: "Sitemap" @ D3:D200 | confirmed_from_blueprint + inferred_from_module_references |
| 13 | google-sheets:getSheetContent / read | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `5` → Competitor 1 (F); `6` → Competitor 2 (G); `7` → Competitor 3 (H); `8` → Competitor 4 (I); `9` → Competitor 5 (J); `3` → Language (D) | module_output_bundle: "Setup" @ A3:J3 | confirmed_from_blueprint + inferred_from_module_references |
| 15 | google-sheets:updateCell / update_cell | "Sitemap-Working" | cell=A3 | value={{19.choices[].message.content}}; refs: {{19.choices[].message.content}} | — | sheet_write: "Sitemap-Working" @ A3 | confirmed_from_blueprint + inferred_from_module_references |
| 16 | google-sheets:getSheetContent / read | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `5` → Competitor 1 (F); `6` → Competitor 2 (G); `7` → Competitor 3 (H); `8` → Competitor 4 (I); `9` → Competitor 5 (J); `3` → Language (D) | module_output_bundle: "Setup" @ A4:J4 | confirmed_from_blueprint + inferred_from_module_references |
| 18 | google-sheets:updateCell / update_cell | "Sitemap-Working" | cell=A5 | value={{17.choices[].message.content}}; refs: {{17.choices[].message.content}} | — | sheet_write: "Sitemap-Working" @ A5 | confirmed_from_blueprint + inferred_from_module_references |
| 20 | google-sheets:getSheetContent / read | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `5` → Competitor 1 (F); `6` → Competitor 2 (G); `7` → Competitor 3 (H); `8` → Competitor 4 (I); `9` → Competitor 5 (J); `3` → Language (D) | module_output_bundle: "Setup" @ A5:J5 | confirmed_from_blueprint + inferred_from_module_references |
| 22 | google-sheets:updateCell / update_cell | "Sitemap-Working" | cell=A7 | value={{21.choices[].message.content}}; refs: {{21.choices[].message.content}} | — | sheet_write: "Sitemap-Working" @ A7 | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 2. RIS 3.5 Module #2 - Sitemap Keywords

- Source: <code>RIS 3.5 Module #2 - Sitemap Keywords.blueprint.json</code>; SHA-256 <code>c17db1aa429990fba65bf8a5232cff1c089a0fd4f6f5fa9294d1762cc491090d</code>.
- Scenario module IDs: <code>1</code>, <code>14</code>, <code>6</code>, <code>7</code>, <code>3</code>, <code>13</code>, <code>5</code>, <code>15</code>, <code>16</code>, <code>17</code>, <code>18</code>, <code>19</code>, <code>20</code>, <code>21</code>, <code>22</code>, <code>23</code>, <code>24</code>, <code>25</code>, <code>26</code>, <code>27</code>, <code>28</code>, <code>29</code>.
- Custom webhook: module <code>1</code>, exported hook reference <code>1486286</code>, restore label <code>"SitemapKeywords"</code>, <code>maxResults=2</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix says input is written to Sitemap!A2:A and output is Sitemap Keywords!A2:D. Neither mapping exists in the blueprint.
- The blueprint reads Sitemap/Sitemap1/Sitemap2/Sitemap3 at D4:D and updates Keywords/keywords 1/keyword 2/keywords 3 rows.
- Four clear-range modules omit sheetId, so their target sheet cannot be proved from JSON.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 6 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=A2:A | — | — | sheet_clear: <missing sheetId> @ A2:A | requires_sheet_verification |
| 7 | google-sheets:getSheetContent / read | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D) | module_output_bundle: "Setup" @ A2:J2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:getSheetContent / read | "Sitemap" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected Sitemap Labels (D); `__ROW_NUMBER__` → Row number | module_output_bundle: "Sitemap" @ D4:D | confirmed_from_blueprint + inferred_from_module_references |
| 5 | google-sheets:updateRow / update_row | "Keywords" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | values.0={{13.choices[].message.content}}; refs: {{13.choices[].message.content}}, {{3.`__ROW_NUMBER__`}} | — | sheet_write: "Keywords" @ {{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 15 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=A2:A | — | — | sheet_clear: <missing sheetId> @ A2:A | requires_sheet_verification |
| 16 | google-sheets:getSheetContent / read | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D) | module_output_bundle: "Setup" @ A3:J3 | confirmed_from_blueprint + inferred_from_module_references |
| 17 | google-sheets:getSheetContent / read | "Sitemap1" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected Sitemap Labels (D); `__ROW_NUMBER__` → Row number | module_output_bundle: "Sitemap1" @ D4:D | confirmed_from_blueprint + inferred_from_module_references |
| 19 | google-sheets:updateRow / update_row | "keywords 1" | rowNumber={{17.`__ROW_NUMBER__`}}; includesHeaders=true | values.0={{18.choices[].message.content}}; refs: {{18.choices[].message.content}}, {{17.`__ROW_NUMBER__`}} | — | sheet_write: "keywords 1" @ {{17.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 20 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=A2:A | — | — | sheet_clear: <missing sheetId> @ A2:A | requires_sheet_verification |
| 21 | google-sheets:getSheetContent / read | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D) | module_output_bundle: "Setup" @ A4:J4 | confirmed_from_blueprint + inferred_from_module_references |
| 22 | google-sheets:getSheetContent / read | "Sitemap2" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected Sitemap Labels (D); `__ROW_NUMBER__` → Row number | module_output_bundle: "Sitemap2" @ D4:D | confirmed_from_blueprint + inferred_from_module_references |
| 24 | google-sheets:updateRow / update_row | "keyword 2" | rowNumber={{22.`__ROW_NUMBER__`}}; includesHeaders=true | values.0={{23.choices[].message.content}}; refs: {{23.choices[].message.content}}, {{22.`__ROW_NUMBER__`}} | — | sheet_write: "keyword 2" @ {{22.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 25 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=A2:A | — | — | sheet_clear: <missing sheetId> @ A2:A | requires_sheet_verification |
| 26 | google-sheets:getSheetContent / read | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D) | module_output_bundle: "Setup" @ A5:J5 | confirmed_from_blueprint + inferred_from_module_references |
| 27 | google-sheets:getSheetContent / read | "Sitemap3" | range=D4:D; tableFirstRow=D1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected Sitemap Labels (D); `__ROW_NUMBER__` → Row number | module_output_bundle: "Sitemap3" @ D4:D | confirmed_from_blueprint + inferred_from_module_references |
| 29 | google-sheets:updateRow / update_row | "keywords 3" | rowNumber={{27.`__ROW_NUMBER__`}}; includesHeaders=true | values.0={{28.choices[].message.content}}; refs: {{28.choices[].message.content}}, {{27.`__ROW_NUMBER__`}} | — | sheet_write: "keywords 3" @ {{27.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 3. RIS 3.5 Module #3 - ICN Keywords

- Source: <code>RIS 3.5 Module #3 - ICN Keywords.blueprint.json</code>; SHA-256 <code>c8870fb1f2bce013cf9fbaaacdc0ceef5bea21ec7a35895994ec42e6ec590f8b</code>.
- Scenario module IDs: <code>9</code>, <code>33</code>, <code>26</code>, <code>27</code>, <code>28</code>, <code>1</code>, <code>29</code>, <code>3</code>, <code>31</code>, <code>21</code>, <code>32</code>, <code>23</code>, <code>34</code>, <code>35</code>, <code>36</code>, <code>37</code>, <code>38</code>, <code>39</code>, <code>40</code>, <code>41</code>, <code>42</code>, <code>43</code>, <code>44</code>, <code>45</code>, <code>46</code>, <code>47</code>, <code>48</code>, <code>49</code>, <code>50</code>, <code>51</code>, <code>52</code>, <code>53</code>, <code>54</code>, <code>55</code>, <code>56</code>, <code>57</code>, <code>58</code>, <code>59</code>, <code>60</code>, <code>61</code>, <code>62</code>, <code>63</code>.
- Custom webhook: module <code>9</code>, exported hook reference <code>1486327</code>, restore label <code>"ICN Keywords"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names Seed Keywords!A2:A and ICN Keywords!A2:E. Neither sheet is referenced by the blueprint.
- The blueprint clears and writes A1, A3, and A5 in four Keyword Research working-sheet variants while reading Setup rows 2 through 5.

Internal blueprint anomalies (recorded, not corrected):

- **Blocker:** Module 41 writes Keyword Research (Working)!A3 inside the route whose other working-sheet modules target the exact leading-space tab " Keyword Research(Working) 1".

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 26 | google-sheets:clearCell / clear | "Keyword Research (Working)" | cell=A1 | — | — | sheet_clear: "Keyword Research (Working)" @ A1 | confirmed_from_blueprint |
| 27 | google-sheets:clearCell / clear | "Keyword Research (Working)" | cell=A3 | — | — | sheet_clear: "Keyword Research (Working)" @ A3 | confirmed_from_blueprint |
| 28 | google-sheets:clearCell / clear | "Keyword Research (Working)" | cell=A5 | — | — | sheet_clear: "Keyword Research (Working)" @ A5 | confirmed_from_blueprint |
| 1 | google-sheets:getSheetContent / read | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A2:J2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:updateCell / update_cell | "Keyword Research (Working)" | cell=A1 | value={{29.choices[].message.content}}; refs: {{29.choices[].message.content}} | — | sheet_write: "Keyword Research (Working)" @ A1 | confirmed_from_blueprint + inferred_from_module_references |
| 21 | google-sheets:updateCell / update_cell | "Keyword Research (Working)" | cell=A3 | value={{31.choices[].message.content}}; refs: {{31.choices[].message.content}} | — | sheet_write: "Keyword Research (Working)" @ A3 | confirmed_from_blueprint + inferred_from_module_references |
| 23 | google-sheets:updateCell / update_cell | "Keyword Research (Working)" | cell=A5 | value={{32.choices[].message.content}}; refs: {{32.choices[].message.content}} | — | sheet_write: "Keyword Research (Working)" @ A5 | confirmed_from_blueprint + inferred_from_module_references |
| 34 | google-sheets:clearCell / clear | " Keyword Research(Working) 1" [whitespace significant] | cell=A1 | — | — | sheet_clear: " Keyword Research(Working) 1" [whitespace significant] @ A1 | confirmed_from_blueprint |
| 35 | google-sheets:clearCell / clear | " Keyword Research(Working) 1" [whitespace significant] | cell=A3 | — | — | sheet_clear: " Keyword Research(Working) 1" [whitespace significant] @ A3 | confirmed_from_blueprint |
| 36 | google-sheets:clearCell / clear | " Keyword Research(Working) 1" [whitespace significant] | cell=A5 | — | — | sheet_clear: " Keyword Research(Working) 1" [whitespace significant] @ A5 | confirmed_from_blueprint |
| 37 | google-sheets:getSheetContent / read | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A3:J3 | confirmed_from_blueprint + inferred_from_module_references |
| 39 | google-sheets:updateCell / update_cell | " Keyword Research(Working) 1" [whitespace significant] | cell=A1 | value={{38.choices[].message.content}}; refs: {{38.choices[].message.content}} | — | sheet_write: " Keyword Research(Working) 1" [whitespace significant] @ A1 | confirmed_from_blueprint + inferred_from_module_references |
| 41 | google-sheets:updateCell / update_cell | "Keyword Research (Working)" | cell=A3 | value={{40.choices[].message.content}}; refs: {{40.choices[].message.content}} | — | sheet_write: "Keyword Research (Working)" @ A3 | confirmed_from_blueprint + inferred_from_module_references |
| 43 | google-sheets:updateCell / update_cell | " Keyword Research(Working) 1" [whitespace significant] | cell=A5 | value={{42.choices[].message.content}}; refs: {{42.choices[].message.content}} | — | sheet_write: " Keyword Research(Working) 1" [whitespace significant] @ A5 | confirmed_from_blueprint + inferred_from_module_references |
| 44 | google-sheets:clearCell / clear | "Keyword Research (Working) 2" | cell=A1 | — | — | sheet_clear: "Keyword Research (Working) 2" @ A1 | confirmed_from_blueprint |
| 45 | google-sheets:clearCell / clear | "Keyword Research (Working) 2" | cell=A3 | — | — | sheet_clear: "Keyword Research (Working) 2" @ A3 | confirmed_from_blueprint |
| 46 | google-sheets:clearCell / clear | "Keyword Research (Working) 2" | cell=A5 | — | — | sheet_clear: "Keyword Research (Working) 2" @ A5 | confirmed_from_blueprint |
| 47 | google-sheets:getSheetContent / read | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A4:J4 | confirmed_from_blueprint + inferred_from_module_references |
| 49 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 2" | cell=A1 | value={{48.choices[].message.content}}; refs: {{48.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 2" @ A1 | confirmed_from_blueprint + inferred_from_module_references |
| 51 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 2" | cell=A3 | value={{50.choices[].message.content}}; refs: {{50.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 2" @ A3 | confirmed_from_blueprint + inferred_from_module_references |
| 53 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 2" | cell=A5 | value={{52.choices[].message.content}}; refs: {{52.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 2" @ A5 | confirmed_from_blueprint + inferred_from_module_references |
| 54 | google-sheets:clearCell / clear | "Keyword Research (Working) 3" | cell=A1 | — | — | sheet_clear: "Keyword Research (Working) 3" @ A1 | confirmed_from_blueprint |
| 55 | google-sheets:clearCell / clear | "Keyword Research (Working) 3" | cell=A3 | — | — | sheet_clear: "Keyword Research (Working) 3" @ A3 | confirmed_from_blueprint |
| 56 | google-sheets:clearCell / clear | "Keyword Research (Working) 3" | cell=A5 | — | — | sheet_clear: "Keyword Research (Working) 3" @ A5 | confirmed_from_blueprint |
| 57 | google-sheets:getSheetContent / read | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A5:J5 | confirmed_from_blueprint + inferred_from_module_references |
| 59 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 3" | cell=A1 | value={{58.choices[].message.content}}; refs: {{58.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 3" @ A1 | confirmed_from_blueprint + inferred_from_module_references |
| 61 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 3" | cell=A3 | value={{60.choices[].message.content}}; refs: {{60.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 3" @ A3 | confirmed_from_blueprint + inferred_from_module_references |
| 63 | google-sheets:updateCell / update_cell | "Keyword Research (Working) 3" | cell=A5 | value={{62.choices[].message.content}}; refs: {{62.choices[].message.content}} | — | sheet_write: "Keyword Research (Working) 3" @ A5 | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 4. RIS 3.5 Module #4 - Imported Keywords

- Source: <code>RIS 3.5 Module #4 - Imported Keywords.blueprint.json</code>; SHA-256 <code>29aa0b091a1ee1ff77a62b1a8055c28f0e6aa5aa088b3436960169177cbc84c9</code>.
- Scenario module IDs: <code>45</code>, <code>46</code>, <code>1</code>, <code>40</code>, <code>47</code>, <code>43</code>.
- Custom webhook: module <code>45</code>, exported hook reference <code>1486349</code>, restore label <code>"Imported Keywords"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix says Antigravity appends Imported Keywords!A2:D and treats that range as output.
- The blueprint only reads Imported Keywords!A2:B, then clears and writes Keyword Research (Working)!A7; it has no append module.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 46 | google-sheets:clearCell / clear | "Keyword Research (Working)" | cell=A7 | — | — | sheet_clear: "Keyword Research (Working)" @ A7 | confirmed_from_blueprint |
| 1 | google-sheets:getSheetContent / read | "Imported Keywords" | range=A2:B; tableFirstRow=A1:B1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Keyword (A) | module_output_bundle: "Imported Keywords" @ A2:B | confirmed_from_blueprint + inferred_from_module_references |
| 43 | google-sheets:updateCell / update_cell | "Keyword Research (Working)" | cell=A7 | value={{47.choices[].message.content}}; refs: {{47.choices[].message.content}} | — | sheet_write: "Keyword Research (Working)" @ A7 | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 5. RIS 3.5 Module #5 - On-Page SEO

- Source: <code>RIS 3.5 Module #5 - On-Page SEO.blueprint.json</code>; SHA-256 <code>7e7dfdd94fb8be1988a2d2760f7e348738c169d1e49090518e52e435a705ca27</code>.
- Scenario module IDs: <code>32</code>, <code>40</code>, <code>18</code>, <code>33</code>, <code>34</code>, <code>35</code>, <code>36</code>, <code>3</code>, <code>37</code>, <code>5</code>, <code>38</code>, <code>7</code>, <code>39</code>, <code>9</code>, <code>41</code>, <code>42</code>, <code>43</code>, <code>44</code>, <code>45</code>, <code>46</code>, <code>47</code>, <code>48</code>, <code>49</code>, <code>50</code>, <code>51</code>, <code>52</code>, <code>53</code>, <code>54</code>, <code>55</code>, <code>56</code>, <code>57</code>, <code>58</code>, <code>59</code>, <code>60</code>, <code>61</code>, <code>62</code>, <code>63</code>, <code>64</code>, <code>65</code>, <code>66</code>, <code>67</code>, <code>68</code>, <code>69</code>, <code>70</code>, <code>71</code>, <code>72</code>, <code>73</code>, <code>74</code>, <code>75</code>, <code>76</code>.
- Custom webhook: module <code>32</code>, exported hook reference <code>1486397</code>, restore label <code>"On-Page-SEO"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names Selected Keywords!A2:A and On-Page SEO!A2:D. Selected Keywords is absent.
- The blueprint reads On-Page SEO variants at A2:F, clears dynamic C:F ranges, and writes zero-based values.2 through values.5 to rows in the On-Page SEO variants.
- Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.

Internal blueprint anomalies (recorded, not corrected):

- **Blocker:** Module 50 writes On-Page SEO while its route reads " On-Page SEO 1" with module 42.
- **Blocker:** Module 52 targets " On-Page SEO 1" but uses the Setup reader module 41 row number instead of module 42's On-Page SEO row number.
- **Blocker:** Module 62 targets On-Page SEO 2 but uses the Setup reader module 53 row number instead of module 54's On-Page SEO row number.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 18 | google-sheets:getSheetContent / read | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D); `0` → (A) | module_output_bundle: "Setup" @ A2:J2 | confirmed_from_blueprint + inferred_from_module_references |
| 33 | google-sheets:getSheetContent / read | "On-Page SEO" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `1` → Create<br>NEW<br>On-Page SEO? <br>(Y/N) (B) | module_output_bundle: "On-Page SEO" @ A2:F | confirmed_from_blueprint + inferred_from_module_references |
| 35 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=C{{33.`__ROW_NUMBER__`}}:F{{33.`__ROW_NUMBER__`}} | refs: {{33.`__ROW_NUMBER__`}}, {{33.`1`}} | — | sheet_clear: <missing sheetId> @ C{{33.`__ROW_NUMBER__`}}:F{{33.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 3 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{33.`__ROW_NUMBER__`}}; includesHeaders=true | values.2={{36.choices[].message.content}}; refs: {{36.choices[].message.content}}, {{33.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{33.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 5 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{33.`__ROW_NUMBER__`}}; includesHeaders=true | values.3={{37.choices[].message.content}}; refs: {{37.choices[].message.content}}, {{33.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{33.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 7 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{33.`__ROW_NUMBER__`}}; includesHeaders=true | values.4={{38.choices[].message.content}}; refs: {{38.choices[].message.content}}, {{33.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{33.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 9 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{33.`__ROW_NUMBER__`}}; includesHeaders=true | values.5={{39.choices[].message.content}}; refs: {{39.choices[].message.content}}, {{33.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{33.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 41 | google-sheets:getSheetContent / read | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D); `0` → (A); `__ROW_NUMBER__` → Row number | module_output_bundle: "Setup" @ A3:J3 | confirmed_from_blueprint + inferred_from_module_references |
| 42 | google-sheets:getSheetContent / read | " On-Page SEO 1" [whitespace significant] | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `1` → Create<br>NEW<br>On-Page SEO? <br>(Y/N) (B) | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ A2:F | confirmed_from_blueprint + inferred_from_module_references |
| 44 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=C{{42.`__ROW_NUMBER__`}}:F{{42.`__ROW_NUMBER__`}} | refs: {{42.`__ROW_NUMBER__`}}, {{42.`1`}} | — | sheet_clear: <missing sheetId> @ C{{42.`__ROW_NUMBER__`}}:F{{42.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 46 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{42.`__ROW_NUMBER__`}}; includesHeaders=true | values.2={{45.choices[].message.content}}; refs: {{45.choices[].message.content}}, {{42.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{42.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 48 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{42.`__ROW_NUMBER__`}}; includesHeaders=true | values.3={{47.choices[].message.content}}; refs: {{47.choices[].message.content}}, {{42.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{42.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 50 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{42.`__ROW_NUMBER__`}}; includesHeaders=true | values.4={{49.choices[].message.content}}; refs: {{49.choices[].message.content}}, {{42.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{42.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 52 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{41.`__ROW_NUMBER__`}}; includesHeaders=true | values.5={{51.choices[].message.content}}; refs: {{51.choices[].message.content}}, {{41.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{41.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 53 | google-sheets:getSheetContent / read | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D); `0` → (A); `__ROW_NUMBER__` → Row number | module_output_bundle: "Setup" @ A4:J4 | confirmed_from_blueprint + inferred_from_module_references |
| 54 | google-sheets:getSheetContent / read | "On-Page SEO 2" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `1` → Create<br>NEW<br>On-Page SEO? <br>(Y/N) (B) | module_output_bundle: "On-Page SEO 2" @ A2:F | confirmed_from_blueprint + inferred_from_module_references |
| 56 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=C{{54.`__ROW_NUMBER__`}}:F{{54.`__ROW_NUMBER__`}} | refs: {{54.`__ROW_NUMBER__`}}, {{54.`1`}} | — | sheet_clear: <missing sheetId> @ C{{54.`__ROW_NUMBER__`}}:F{{54.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 58 | google-sheets:updateRow / update_row | "On-Page SEO 2" | rowNumber={{54.`__ROW_NUMBER__`}}; includesHeaders=true | values.2={{57.choices[].message.content}}; refs: {{57.choices[].message.content}}, {{54.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 2" @ {{54.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 60 | google-sheets:updateRow / update_row | "On-Page SEO 2" | rowNumber={{54.`__ROW_NUMBER__`}}; includesHeaders=true | values.3={{59.choices[].message.content}}; refs: {{59.choices[].message.content}}, {{54.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 2" @ {{54.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 62 | google-sheets:updateRow / update_row | "On-Page SEO 2" | rowNumber={{53.`__ROW_NUMBER__`}}; includesHeaders=true | values.4={{61.choices[].message.content}}; refs: {{61.choices[].message.content}}, {{53.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 2" @ {{53.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 64 | google-sheets:updateRow / update_row | "On-Page SEO 2" | rowNumber={{54.`__ROW_NUMBER__`}}; includesHeaders=true | values.5={{63.choices[].message.content}}; refs: {{63.choices[].message.content}}, {{54.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 2" @ {{54.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 65 | google-sheets:getSheetContent / read | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `3` → Language (D); `0` → (A) | module_output_bundle: "Setup" @ A5:J5 | confirmed_from_blueprint + inferred_from_module_references |
| 66 | google-sheets:getSheetContent / read | "On-Page SEO 3" | range=A2:F; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `1` → Create<br>NEW<br>On-Page SEO? <br>(Y/N) (B) | module_output_bundle: "On-Page SEO 3" @ A2:F | confirmed_from_blueprint + inferred_from_module_references |
| 68 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=C{{66.`__ROW_NUMBER__`}}:F{{66.`__ROW_NUMBER__`}} | refs: {{66.`__ROW_NUMBER__`}}, {{66.`1`}} | — | sheet_clear: <missing sheetId> @ C{{66.`__ROW_NUMBER__`}}:F{{66.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 70 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{66.`__ROW_NUMBER__`}}; includesHeaders=true | values.2={{69.choices[].message.content}}; refs: {{69.choices[].message.content}}, {{66.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{66.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 72 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{66.`__ROW_NUMBER__`}}; includesHeaders=true | values.3={{71.choices[].message.content}}; refs: {{71.choices[].message.content}}, {{66.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{66.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 74 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{66.`__ROW_NUMBER__`}}; includesHeaders=true | values.4={{73.choices[].message.content}}; refs: {{73.choices[].message.content}}, {{66.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{66.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 76 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{66.`__ROW_NUMBER__`}}; includesHeaders=true | values.5={{75.choices[].message.content}}; refs: {{75.choices[].message.content}}, {{66.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{66.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 6. RIS 3.5 Module #6 - Home Page Content

- Source: <code>RIS 3.5 Module #6 - Home Page Content.blueprint.json</code>; SHA-256 <code>0a0946e10f52f658588800e0bf538b4c26a6959fac19c93a28498211710dba5c</code>.
- Scenario module IDs: <code>9</code>, <code>11</code>, <code>1</code>, <code>10</code>, <code>3</code>, <code>12</code>, <code>13</code>, <code>14</code>, <code>15</code>, <code>16</code>, <code>17</code>, <code>18</code>, <code>19</code>, <code>20</code>.
- Custom webhook: module <code>9</code>, exported hook reference <code>1486441</code>, restore label <code>"Home Page Content"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix says Antigravity writes Setup!E2 and output is Home Page!A2:D.
- The blueprint does not write Setup; it reads Setup rows 2 through 5 and writes only A2 in Home Page, Home Page 1, Home Page 2, and Home Page 3.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | google-sheets:getSheetContent / read | "Setup" | range=A2:J2; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A2:J2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:updateCell / update_cell | "Home Page" | cell=A2 | value={{10.choices[].message.content}}; refs: {{10.choices[].message.content}} | — | sheet_write: "Home Page" @ A2 | confirmed_from_blueprint + inferred_from_module_references |
| 12 | google-sheets:getSheetContent / read | "Setup" | range=A3:J3; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A3:J3 | confirmed_from_blueprint + inferred_from_module_references |
| 14 | google-sheets:updateCell / update_cell | "Home Page 1" | cell=A2 | value={{13.choices[].message.content}}; refs: {{13.choices[].message.content}} | — | sheet_write: "Home Page 1" @ A2 | confirmed_from_blueprint + inferred_from_module_references |
| 15 | google-sheets:getSheetContent / read | "Setup" | range=A4:J4; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A4:J4 | confirmed_from_blueprint + inferred_from_module_references |
| 17 | google-sheets:updateCell / update_cell | "Home Page 2" | cell=A2 | value={{16.choices[].message.content}}; refs: {{16.choices[].message.content}} | — | sheet_write: "Home Page 2" @ A2 | confirmed_from_blueprint + inferred_from_module_references |
| 18 | google-sheets:getSheetContent / read | "Setup" | range=A5:J5; tableFirstRow=A1:J1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `1` → Primary Keyword (B); `0` → (A); `3` → Language (D) | module_output_bundle: "Setup" @ A5:J5 | confirmed_from_blueprint + inferred_from_module_references |
| 20 | google-sheets:updateCell / update_cell | "Home Page 3" | cell=A2 | value={{19.choices[].message.content}}; refs: {{19.choices[].message.content}} | — | sheet_write: "Home Page 3" @ A2 | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 7. RIS 3.5 Module #7 - Content Headline

- Source: <code>RIS 3.5 Module #7 - Content Headline.blueprint.json</code>; SHA-256 <code>4ba1be0bcdc898a6a0b11349c30c3fc76614564f3f1cb70596dd3cf2fee5c5b4</code>.
- Scenario module IDs: <code>1</code>, <code>20</code>, <code>2</code>, <code>3</code>, <code>6</code>, <code>9</code>, <code>18</code>, <code>14</code>, <code>17</code>, <code>19</code>, <code>16</code>, <code>21</code>, <code>22</code>, <code>23</code>, <code>24</code>, <code>25</code>, <code>26</code>, <code>27</code>, <code>28</code>, <code>29</code>, <code>30</code>, <code>31</code>, <code>32</code>, <code>33</code>, <code>34</code>, <code>35</code>, <code>36</code>, <code>37</code>, <code>38</code>, <code>39</code>, <code>40</code>, <code>41</code>, <code>42</code>, <code>43</code>, <code>44</code>, <code>45</code>, <code>46</code>, <code>47</code>.
- Custom webhook: module <code>1</code>, exported hook reference <code>1486473</code>, restore label <code>"Content Headline"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names On-Page SEO!A2:D as bridge input and Content Headline!A2:C as output. Content Headline is not referenced as a sheet.
- The blueprint reads Setup and On-Page SEO variants, clears dynamic I:J ranges, and writes zero-based values.8 and values.9 back to On-Page SEO variants.
- Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.

Internal blueprint anomalies (recorded, not corrected):

- **Blocker:** The Setup row-4 route reads " On-Page SEO 1" with module 31, then module 36 reads and module 38 writes On-Page SEO 2 using module 31's row number.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 2 | google-sheets:getSheetContent / read | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A2:Z2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:getSheetContent / read | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `3` → Title Tag (D) | module_output_bundle: "On-Page SEO" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 9 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=I{{3.`__ROW_NUMBER__`}}:J{{3.`__ROW_NUMBER__`}} | refs: {{3.`__ROW_NUMBER__`}}, {{3.`6`}} | — | sheet_clear: <missing sheetId> @ I{{3.`__ROW_NUMBER__`}}:J{{3.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 14 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | values.8={{18.choices[].message.content}}; refs: {{18.choices[].message.content}}, {{3.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 17 | google-sheets:getCell / read | "On-Page SEO" | cell=I{{3.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | refs: {{3.`__ROW_NUMBER__`}} | value | module_output_bundle: "On-Page SEO" @ I{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 16 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | values.9={{19.choices[].message.content}}; refs: {{19.choices[].message.content}}, {{3.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 21 | google-sheets:getSheetContent / read | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A3:Z3 | confirmed_from_blueprint + inferred_from_module_references |
| 22 | google-sheets:getSheetContent / read | " On-Page SEO 1" [whitespace significant] | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `3` → Title Tag (D) | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 24 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=I{{22.`__ROW_NUMBER__`}}:J{{22.`__ROW_NUMBER__`}} | refs: {{22.`__ROW_NUMBER__`}}, {{22.`6`}} | — | sheet_clear: <missing sheetId> @ I{{22.`__ROW_NUMBER__`}}:J{{22.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 26 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{22.`__ROW_NUMBER__`}}; includesHeaders=true | values.8={{25.choices[].message.content}}; refs: {{25.choices[].message.content}}, {{22.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{22.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 27 | google-sheets:getCell / read | " On-Page SEO 1" [whitespace significant] | cell=I{{22.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | refs: {{22.`__ROW_NUMBER__`}} | value | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ I{{22.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 29 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{22.`__ROW_NUMBER__`}}; includesHeaders=true | values.9={{28.choices[].message.content}}; refs: {{28.choices[].message.content}}, {{22.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{22.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 30 | google-sheets:getSheetContent / read | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A4:Z4 | confirmed_from_blueprint + inferred_from_module_references |
| 31 | google-sheets:getSheetContent / read | " On-Page SEO 1" [whitespace significant] | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `3` → Title Tag (D) | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 33 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=I{{31.`__ROW_NUMBER__`}}:J{{31.`__ROW_NUMBER__`}} | refs: {{31.`__ROW_NUMBER__`}}, {{31.`6`}} | — | sheet_clear: <missing sheetId> @ I{{31.`__ROW_NUMBER__`}}:J{{31.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 35 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{31.`__ROW_NUMBER__`}}; includesHeaders=true | values.8={{34.choices[].message.content}}; refs: {{34.choices[].message.content}}, {{31.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{31.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 36 | google-sheets:getCell / read | "On-Page SEO 2" | cell=I{{31.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | refs: {{31.`__ROW_NUMBER__`}} | value | module_output_bundle: "On-Page SEO 2" @ I{{31.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 38 | google-sheets:updateRow / update_row | "On-Page SEO 2" | rowNumber={{31.`__ROW_NUMBER__`}}; includesHeaders=true | values.9={{37.choices[].message.content}}; refs: {{37.choices[].message.content}}, {{31.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 2" @ {{31.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 39 | google-sheets:getSheetContent / read | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A5:Z5 | confirmed_from_blueprint + inferred_from_module_references |
| 40 | google-sheets:getSheetContent / read | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `3` → Title Tag (D) | module_output_bundle: "On-Page SEO 3" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 42 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=I{{40.`__ROW_NUMBER__`}}:J{{40.`__ROW_NUMBER__`}} | refs: {{40.`__ROW_NUMBER__`}}, {{40.`6`}} | — | sheet_clear: <missing sheetId> @ I{{40.`__ROW_NUMBER__`}}:J{{40.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 44 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{40.`__ROW_NUMBER__`}}; includesHeaders=true | values.8={{43.choices[].message.content}}; refs: {{43.choices[].message.content}}, {{40.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{40.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 45 | google-sheets:getCell / read | "On-Page SEO 3" | cell=I{{40.`__ROW_NUMBER__`}}; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | refs: {{40.`__ROW_NUMBER__`}} | value | module_output_bundle: "On-Page SEO 3" @ I{{40.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 47 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{40.`__ROW_NUMBER__`}}; includesHeaders=true | values.9={{46.choices[].message.content}}; refs: {{46.choices[].message.content}}, {{40.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{40.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 8. RIS 3.5 Module #8 - Content Intro

- Source: <code>RIS 3.5 Module #8 - Content Intro.blueprint.json</code>; SHA-256 <code>7f3e3354f3d79af5d14d741208230ff31ed497dee7c92f65a8745f288bb97d34</code>.
- Scenario module IDs: <code>1</code>, <code>10</code>, <code>2</code>, <code>3</code>, <code>4</code>, <code>7</code>, <code>9</code>, <code>8</code>, <code>11</code>, <code>12</code>, <code>14</code>, <code>15</code>, <code>16</code>, <code>17</code>, <code>18</code>, <code>19</code>, <code>20</code>, <code>21</code>, <code>22</code>, <code>23</code>, <code>24</code>, <code>25</code>, <code>26</code>, <code>27</code>, <code>28</code>, <code>29</code>.
- Custom webhook: module <code>1</code>, exported hook reference <code>1486483</code>, restore label <code>"Content Intro"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names Content Headline!A2:C as input and Content Intro!A2:C as output. Neither sheet is referenced.
- The blueprint reads Setup and On-Page SEO variants, clears dynamic K:K cells, and writes zero-based values.10 back to On-Page SEO variants.
- Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.

Internal blueprint anomalies (recorded, not corrected):

- **Blocker:** Module 23 writes On-Page SEO 3 using the row number read from On-Page SEO 2 by module 19.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 2 | google-sheets:getSheetContent / read | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A2:Z2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:getSheetContent / read | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `8` → Article Headline (I); `9` → Excerpt (J) | module_output_bundle: "On-Page SEO" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 7 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=K{{3.`__ROW_NUMBER__`}}:K{{3.`__ROW_NUMBER__`}} | refs: {{3.`__ROW_NUMBER__`}}, {{3.`6`}} | — | sheet_clear: <missing sheetId> @ K{{3.`__ROW_NUMBER__`}}:K{{3.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 8 | google-sheets:updateRow / update_row | "On-Page SEO" | rowNumber={{3.`__ROW_NUMBER__`}}; includesHeaders=true | values.10={{9.choices[].message.content}}; refs: {{9.choices[].message.content}}, {{3.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO" @ {{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 11 | google-sheets:getSheetContent / read | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A3:Z3 | confirmed_from_blueprint + inferred_from_module_references |
| 12 | google-sheets:getSheetContent / read | " On-Page SEO 1" [whitespace significant] | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `8` → Article Headline (I); `9` → Excerpt (J) | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 15 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=K{{12.`__ROW_NUMBER__`}}:K{{12.`__ROW_NUMBER__`}} | refs: {{12.`__ROW_NUMBER__`}}, {{12.`6`}} | — | sheet_clear: <missing sheetId> @ K{{12.`__ROW_NUMBER__`}}:K{{12.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 17 | google-sheets:updateRow / update_row | " On-Page SEO 1" [whitespace significant] | rowNumber={{12.`__ROW_NUMBER__`}}; includesHeaders=true | values.10={{16.choices[].message.content}}; refs: {{16.choices[].message.content}}, {{12.`__ROW_NUMBER__`}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ {{12.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 18 | google-sheets:getSheetContent / read | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A4:Z4 | confirmed_from_blueprint + inferred_from_module_references |
| 19 | google-sheets:getSheetContent / read | "On-Page SEO 2" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `8` → Article Headline (I); `9` → Excerpt (J) | module_output_bundle: "On-Page SEO 2" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 21 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=K{{19.`__ROW_NUMBER__`}}:K{{19.`__ROW_NUMBER__`}} | refs: {{19.`__ROW_NUMBER__`}}, {{19.`6`}} | — | sheet_clear: <missing sheetId> @ K{{19.`__ROW_NUMBER__`}}:K{{19.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 23 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{19.`__ROW_NUMBER__`}}; includesHeaders=true | values.10={{22.choices[].message.content}}; refs: {{22.choices[].message.content}}, {{19.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{19.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 24 | google-sheets:getSheetContent / read | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A5:Z5 | confirmed_from_blueprint + inferred_from_module_references |
| 25 | google-sheets:getSheetContent / read | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `8` → Article Headline (I); `9` → Excerpt (J) | module_output_bundle: "On-Page SEO 3" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 27 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=K{{25.`__ROW_NUMBER__`}}:K{{25.`__ROW_NUMBER__`}} | refs: {{25.`__ROW_NUMBER__`}}, {{25.`6`}} | — | sheet_clear: <missing sheetId> @ K{{25.`__ROW_NUMBER__`}}:K{{25.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 29 | google-sheets:updateRow / update_row | "On-Page SEO 3" | rowNumber={{25.`__ROW_NUMBER__`}}; includesHeaders=true | values.10={{28.choices[].message.content}}; refs: {{28.choices[].message.content}}, {{25.`__ROW_NUMBER__`}} | — | sheet_write: "On-Page SEO 3" @ {{25.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 10. RIS 3.5 Module #10 - Content Sections

- Source: <code>RIS 3.5 Module #10 - Content Sections.blueprint.json</code>; SHA-256 <code>3d636bdb1320d368632bcbea51199727a07eb44a09247dc7a31cd31851a96e88</code>.
- Scenario module IDs: <code>1</code>, <code>27</code>, <code>2</code>, <code>3</code>, <code>4</code>, <code>7</code>, <code>20</code>, <code>6</code>, <code>21</code>, <code>9</code>, <code>22</code>, <code>11</code>, <code>23</code>, <code>13</code>, <code>24</code>, <code>15</code>, <code>25</code>, <code>17</code>, <code>26</code>, <code>19</code>, <code>28</code>, <code>29</code>, <code>30</code>, <code>31</code>, <code>32</code>, <code>33</code>, <code>34</code>, <code>35</code>, <code>36</code>, <code>37</code>, <code>38</code>, <code>39</code>, <code>40</code>, <code>41</code>, <code>42</code>, <code>43</code>, <code>44</code>, <code>45</code>, <code>46</code>, <code>47</code>, <code>48</code>, <code>49</code>, <code>50</code>, <code>51</code>, <code>52</code>, <code>53</code>, <code>54</code>, <code>55</code>, <code>56</code>, <code>57</code>, <code>58</code>, <code>59</code>, <code>60</code>, <code>61</code>, <code>62</code>, <code>63</code>, <code>64</code>, <code>65</code>, <code>66</code>, <code>67</code>, <code>68</code>, <code>69</code>, <code>70</code>, <code>71</code>, <code>72</code>, <code>73</code>, <code>74</code>, <code>75</code>, <code>76</code>, <code>77</code>, <code>78</code>, <code>79</code>, <code>80</code>, <code>81</code>.
- Custom webhook: module <code>1</code>, exported hook reference <code>1486519</code>, restore label <code>"Content Sections"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names Content Intro!A2:C as input and Content Sections!A2:E as output. Neither sheet is referenced.
- The blueprint reads Setup and On-Page SEO variants, clears dynamic M:S ranges, and writes cells M through S back to those variants.
- Four clear-range modules omit sheetId, so their exact target sheets cannot be proved from JSON.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 2 | google-sheets:getSheetContent / read | "Setup" | range=A2:Z2; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `0` → (A); `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A2:Z2 | confirmed_from_blueprint + inferred_from_module_references |
| 3 | google-sheets:getSheetContent / read | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `7` → No. of <br>Sub-Sections (H); `11` → Article Outline (L); `10` → Introduction (K); `4` → Description (E) | module_output_bundle: "On-Page SEO" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 7 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=M{{3.`__ROW_NUMBER__`}}:S{{3.`__ROW_NUMBER__`}} | refs: {{3.`__ROW_NUMBER__`}}, {{3.`6`}} | — | sheet_clear: <missing sheetId> @ M{{3.`__ROW_NUMBER__`}}:S{{3.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 6 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=M{{3.`__ROW_NUMBER__`}} | value={{20.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{20.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ M{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 9 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=N{{3.`__ROW_NUMBER__`}} | value={{21.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{21.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ N{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 11 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=O{{3.`__ROW_NUMBER__`}} | value={{22.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{22.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ O{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 13 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=P{{3.`__ROW_NUMBER__`}} | value={{23.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{23.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ P{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 15 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=Q{{3.`__ROW_NUMBER__`}} | value={{24.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{24.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ Q{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 17 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=R{{3.`__ROW_NUMBER__`}} | value={{25.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{25.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ R{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 19 | google-sheets:updateCell / update_cell | "On-Page SEO" | cell=S{{3.`__ROW_NUMBER__`}} | value={{26.choices[].message.content}}; refs: {{3.`__ROW_NUMBER__`}}, {{26.choices[].message.content}} | — | sheet_write: "On-Page SEO" @ S{{3.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 28 | google-sheets:getSheetContent / read | "Setup" | range=A3:Z3; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `1` → Primary Keyword (B); `0` → (A); `2` → Tone of Voice (C); `3` → Language (D) | module_output_bundle: "Setup" @ A3:Z3 | confirmed_from_blueprint + inferred_from_module_references |
| 29 | google-sheets:getSheetContent / read | " On-Page SEO 1" [whitespace significant] | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `7` → No. of <br>Sub-Sections (H); `11` → Article Outline (L); `10` → Introduction (K) | module_output_bundle: " On-Page SEO 1" [whitespace significant] @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 31 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=M{{29.`__ROW_NUMBER__`}}:S{{29.`__ROW_NUMBER__`}} | refs: {{29.`__ROW_NUMBER__`}}, {{29.`6`}} | — | sheet_clear: <missing sheetId> @ M{{29.`__ROW_NUMBER__`}}:S{{29.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 33 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=M{{29.`__ROW_NUMBER__`}} | value={{32.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{32.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ M{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 35 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=N{{29.`__ROW_NUMBER__`}} | value={{34.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{34.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ N{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 37 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=O{{29.`__ROW_NUMBER__`}} | value={{36.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{36.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ O{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 39 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=P{{29.`__ROW_NUMBER__`}} | value={{38.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{38.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ P{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 41 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=Q{{29.`__ROW_NUMBER__`}} | value={{40.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{40.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ Q{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 43 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=R{{29.`__ROW_NUMBER__`}} | value={{42.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{42.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ R{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 45 | google-sheets:updateCell / update_cell | " On-Page SEO 1" [whitespace significant] | cell=S{{29.`__ROW_NUMBER__`}} | value={{44.choices[].message.content}}; refs: {{29.`__ROW_NUMBER__`}}, {{44.choices[].message.content}} | — | sheet_write: " On-Page SEO 1" [whitespace significant] @ S{{29.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 46 | google-sheets:getSheetContent / read | "Setup" | range=A4:Z4; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `0` → (A); `2` → Tone of Voice (C); `3` → Language (D); `1` → Primary Keyword (B) | module_output_bundle: "Setup" @ A4:Z4 | confirmed_from_blueprint + inferred_from_module_references |
| 47 | google-sheets:getSheetContent / read | "On-Page SEO 2" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `7` → No. of <br>Sub-Sections (H); `11` → Article Outline (L); `10` → Introduction (K) | module_output_bundle: "On-Page SEO 2" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 49 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=M{{47.`__ROW_NUMBER__`}}:S{{47.`__ROW_NUMBER__`}} | refs: {{47.`__ROW_NUMBER__`}}, {{47.`6`}} | — | sheet_clear: <missing sheetId> @ M{{47.`__ROW_NUMBER__`}}:S{{47.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 51 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=M{{47.`__ROW_NUMBER__`}} | value={{50.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{50.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ M{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 53 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=N{{47.`__ROW_NUMBER__`}} | value={{52.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{52.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ N{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 55 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=O{{47.`__ROW_NUMBER__`}} | value={{54.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{54.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ O{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 57 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=P{{47.`__ROW_NUMBER__`}} | value={{56.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{56.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ P{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 59 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=Q{{47.`__ROW_NUMBER__`}} | value={{58.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{58.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ Q{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 61 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=R{{47.`__ROW_NUMBER__`}} | value={{60.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{60.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ R{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 63 | google-sheets:updateCell / update_cell | "On-Page SEO 2" | cell=S{{47.`__ROW_NUMBER__`}} | value={{62.choices[].message.content}}; refs: {{47.`__ROW_NUMBER__`}}, {{62.choices[].message.content}} | — | sheet_write: "On-Page SEO 2" @ S{{47.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 64 | google-sheets:getSheetContent / read | "Setup" | range=A5:Z5; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `4` → Website Brief (E); `0` → (A); `2` → Tone of Voice (C); `3` → Language (D); `1` → Primary Keyword (B) | module_output_bundle: "Setup" @ A5:Z5 | confirmed_from_blueprint + inferred_from_module_references |
| 65 | google-sheets:getSheetContent / read | "On-Page SEO 3" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `__ROW_NUMBER__` → Row number; `6` → Create<br>NEW<br>Article? <br>(Y/N) (G); `11` → Article Outline (L); `10` → Introduction (K); `7` → No. of <br>Sub-Sections (H) | module_output_bundle: "On-Page SEO 3" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |
| 67 | google-sheets:clearValuesFromRange / clear | <missing sheetId> | range=M{{65.`__ROW_NUMBER__`}}:S{{65.`__ROW_NUMBER__`}} | refs: {{65.`__ROW_NUMBER__`}}, {{65.`6`}} | — | sheet_clear: <missing sheetId> @ M{{65.`__ROW_NUMBER__`}}:S{{65.`__ROW_NUMBER__`}} | requires_sheet_verification + inferred_from_module_references |
| 69 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=M{{65.`__ROW_NUMBER__`}} | value={{68.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{68.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ M{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 71 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=N{{65.`__ROW_NUMBER__`}} | value={{70.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{70.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ N{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 73 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=O{{65.`__ROW_NUMBER__`}} | value={{72.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{72.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ O{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 75 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=P{{65.`__ROW_NUMBER__`}} | value={{74.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{74.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ P{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 77 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=Q{{65.`__ROW_NUMBER__`}} | value={{76.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{76.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ Q{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 79 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=R{{65.`__ROW_NUMBER__`}} | value={{78.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{78.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ R{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |
| 81 | google-sheets:updateCell / update_cell | "On-Page SEO 3" | cell=S{{65.`__ROW_NUMBER__`}} | value={{80.choices[].message.content}}; refs: {{65.`__ROW_NUMBER__`}}, {{80.choices[].message.content}} | — | sheet_write: "On-Page SEO 3" @ S{{65.`__ROW_NUMBER__`}} | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects: none in the blueprint.

### 12. RIS 3.5 Module #12 - Upload to WordPress & FB

- Source: <code>RIS 3.5 Module #12 - Upload to WordPress &amp; FB.blueprint.json</code>; SHA-256 <code>20af842095811df949ab7dca6a30794c6992e9fa7f56c106d20643f0193f127f</code>.
- Scenario module IDs: <code>3</code>, <code>4</code>, <code>5</code>, <code>6</code>, <code>2</code>, <code>7</code>.
- Custom webhook: module <code>3</code>, exported hook reference <code>1486533</code>, restore label <code>"Upload to Wordpress"</code>, <code>maxResults=1</code>. The export declares no payload schema.
- Spreadsheet: <code>/1JlsR8LYiXKNKIoh-TtkBAyoDRVbGIu2oMQudm9YAIOE</code> (restore path <code>" RIS 3.5 - SEO Template (110125)"</code>).
- Antigravity callback: no. Completion mode: `unknown`; polling is not encoded in the blueprint.
- Timeout/retry: not defined as an Antigravity policy in the blueprint.

Matrix conflicts:

- The matrix names Upload Status!A2:D as output. The blueprint has no Google Sheet write or Upload Status sheet reference.
- The blueprint reads On-Page SEO!A2:Z500 and routes rows to two wordpress:createPost modules (publish and draft). No Facebook module is present despite the scenario name.
- The matrix declares a callback and remote persistence fields; neither is encoded in the blueprint.

Google Sheet module evidence:

| ID | Make module / operation | Exact sheet | Exact address | Write/input mapping | Fields referenced downstream | Output/destination | Confidence |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 4 | google-sheets:getSheetContent / read | "On-Page SEO" | range=A2:Z500; tableFirstRow=A1:Z1; includesHeaders=true; valueRenderOption=FORMATTED_VALUE; dateTimeRenderOption=FORMATTED_STRING | — | `0` → Selected SEO Keywords (A); `3` → Title Tag (D); `4` → Description (E); `5` → Slug (F); `8` → Article Headline (I); `19` → Featured Image (Lasts ONE Hour) (T); `10` → Introduction (K); `24` → Article Outline Heading (Y); `11` → Article Outline (L); `12` → Sub-Section 1 (M); `13` → Sub-Section 2 (N); `14` → Sub-Section 3 (O); `15` → Sub-Section 4 (P); `16` → Sub-Section 5 (Q); `17` → Sub-Section 6 (R); `18` → Sub-Section 7 (S); `9` → Excerpt (J); `20` → UPLOAD to WordPress (Y/N)? (U); `22` → Custom Content (W); `21` → UPLOAD <br>Custom Content <br>(Y/N)? (V) | module_output_bundle: "On-Page SEO" @ A2:Z500 | confirmed_from_blueprint + inferred_from_module_references |

Non-Sheet side effects:

- Module <code>2</code> <code>wordpress:createPost</code> creates a WordPress <code>posts</code> with status <code>publish</code>. Referenced fields: <code>4.`3`</code>, <code>4.`4`</code>, <code>4.`5`</code>, <code>4.`8`</code>, <code>4.`19`</code>, <code>4.`10`</code>, <code>4.`24`</code>, <code>4.`11`</code>, <code>4.`12`</code>, <code>4.`13`</code>, <code>4.`14`</code>, <code>4.`15`</code>, <code>4.`16`</code>, <code>4.`17`</code>, <code>4.`18`</code>, <code>4.`9`</code>, <code>4.`20`</code>. This is an external side effect, not a completion callback or Sheet output.
- Module <code>7</code> <code>wordpress:createPost</code> creates a WordPress <code>posts</code> with status <code>draft</code>. Referenced fields: <code>4.`3`</code>, <code>4.`4`</code>, <code>4.`5`</code>, <code>4.`8`</code>, <code>4.`22`</code>, <code>4.`9`</code>, <code>4.`20`</code>, <code>4.`21`</code>. This is an external side effect, not a completion callback or Sheet output.

## Evidence-only pilot recommendation before the owner decision

**Recommended candidate: Module 4 — Imported Keywords**, after its blockers are resolved. It is the smallest graph (6 modules), has only three Google Sheet operations, reads one source range (`Imported Keywords!A2:B`), and has one clear/write output cell (`Keyword Research (Working)!A7`). It has no WordPress publishing side effect.

This is only a pilot suitability assessment. Module 4 still has no declared webhook payload, callback, or completion marker; the meaning and writability of A7 and the live headers of A:B must be verified. The pilot must not start until the owner reviews this reconciliation and separately authorizes Phase 3.

**Later owner decision (2026-07-21):** Module 1 was selected instead, using an API-native Neon/PostgreSQL bridge and a revised Make scenario that removes the Google Sheet runtime dependency. This does not change the evidence above or authorize any original Sheet-backed mapping. See `docs/integration/module1-neon-pilot.md`.

## Machine-readable companion

`blueprint-module-map.json` contains the exhaustive module paths, exact configuration, write mappings, exported interfaces, downstream references, confidence values, conflicts, anomalies, source hashes, and safety/activation flags. It is evidence input for a future BridgeMapping config, not an active config.

