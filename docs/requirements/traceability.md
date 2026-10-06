# Traceability matrix

Coverage reflects specifications and completed static Pencil frames; application behavior remains unimplemented. Actual frame node IDs are recorded in the design canvas inventory.

| Goal | Requirement | Story / criteria | API | Data | UI | Planned test |
| --- | --- | --- | --- | --- | --- | --- |
| BG-01 | REQ-01 | US-09 / AC-21, AC-22 | Host/remote v1 | Deployment manifest (not DB) | UI-18 | TC-10 |
| BG-01 | REQ-02 | US-03, US-09 / AC-06, AC-23 | API-03, API-11 | DB-01, DB-06, DB-07 | UI-05, UI-17 | TC-03, TC-11 |
| BG-02 | REQ-03 | US-01 / AC-01–AC-03 | API-01 | DB-02, DB-03, DB-04 | UI-01–UI-03 | TC-01 |
| BG-02 | REQ-04 | US-02 / AC-04, AC-05 | API-02 | DB-03–DB-05 | UI-04 | TC-02 |
| BG-02 | REQ-05 | US-03 / AC-06, AC-07 | API-03 | DB-06–DB-08 | UI-05, UI-06 | TC-03 |
| BG-02 | REQ-06 | US-04 / AC-10–AC-12 | API-04, API-05 | DB-07–DB-09 | UI-07, UI-08 | TC-05, TC-07 |
| BG-02 | REQ-07 | US-05, US-06 / AC-13–AC-17 | API-06–API-08 | DB-02–DB-04, DB-07, DB-09 | UI-09–UI-12 | TC-06, TC-07, TC-08 |
| BG-02 | REQ-08 | US-07, US-08 / AC-18–AC-20 | API-09, API-10 | DB-02, DB-03, DB-07, DB-09 | UI-13–UI-16 | TC-09 |
| BG-01, BG-02 | REQ-09 | US-04, US-05, US-09 / AC-12, AC-14, AC-23 | API-04–API-11 | DB-01, DB-02, DB-07 | UI-09–UI-17 | TC-07, TC-11 |
| BG-03 | REQ-10 | US-10 / AC-24, AC-25 | All relevant APIs | No new tables | UI-01–UI-18, CMP-01–CMP-14 | TC-13 |
| BG-02 | REQ-11 | US-03, US-04 / AC-08, AC-09, AC-11 | API-03, API-05 | DB-04, DB-06–DB-09 | UI-05, UI-08 | TC-03–TC-05 |
| BG-03 | REQ-12 | US-10 / AC-24, AC-25 | No new endpoint | No new table | All screens/foundations | DOC-01–DOC-05, TC-13 |

An API/data/UI item need not exist for every AC: deployment independence has an artifact manifest, not a database table. Avoid inventing entities merely to fill columns.

## Business rule enforcement

BR-01 → API-01/API-07/API-09/API-10, DB-02/DB-03, UI-11/UI-13/UI-15.
BR-02/BR-10 → API-02/API-03, DB-07, UI-04–UI-06.
BR-03/BR-04/BR-05/BR-09 → API-03/API-07, DB-04/DB-06/DB-07, UI-05/UI-11/UI-12.
BR-06 → API-04–API-08, DB-01/DB-02/DB-07, seller/buyer screens.
BR-07 → API-05, DB-04/DB-08/DB-09, UI-08/UI-10.
BR-08 → API-04/API-08/API-10, DB-07, UI-08/UI-10/UI-16.
BR-11 → API-09/API-10, DB-02/DB-03/DB-09, UI-14/UI-15.
BR-12 → host contract/API-11 + protected endpoints, DB-01, UI-17/UI-18.

## Orphan audit

All twelve confirmed requirements link to goals and stories; all eighteen primary screens link to acceptance criteria. All eleven API groups and nine data groups are used by stories. Shared components support screen requirements rather than separate features.

Outstanding implementation coverage: all application behavior, including authorization, transactions, idempotency, independent remote deployment and accessibility. All 18 primary screens now have desktop/mobile Pencil frames with story/criteria context annotations. Static design coverage does not establish that acceptance criteria pass at runtime.
