# xPPM neo-Seoul quick tutorial (about 20 minutes)

A hands-on introduction to authoring an Information Delivery Manual (IDM, ISO 29481-1 / ISO 29481-3) with
xPPM neo-Seoul. Parts 1–4 introduce the app. In part 5 you build a complete IDM from a blank project. The example is
construction **defect management**: identification, logging, triage, assignment, resolution, verification and closure,
supported by reporting and analysis. The forms of the process become exchange requirements (ERs), their fields become
information units (IUs), the IUs are mapped to external elements (IFC and the **BIM Collaboration Format, BCF 3.0**),
and business rules state what the exchanged information must satisfy.

All project data (Riverside Medical Office Building, Example Builders Co., Ltd., people, e-mail addresses at
example.com, IFC GlobalIds) is fictitious. Regulatory references are illustrative.

## Outline

1. Installing xPPM neo-Seoul
2. How to start a project
3. How to open and save a project
4. Basic interfaces — a. Header, b. Use case, c. Process map (PM), d. Exchange requirement (ER), e. Rule
5. Learning through an example
   - a. Creating a header
   - b. Specifying a use case
   - c. Specifying a PM — i. overview of the defect management process; ii. how to depict it as a PM
   - d. Specifying an ER — i. the forms exchanged between activities; ii. converting the forms into data objects and ERs; iii. specifying required information items as information units of an ER
   - e. Mapping information units to external elements — i. what is BCF; ii. mapping defect information items to BCF elements
   - f. Specifying rules

## Downloads

| File | What it is | Used in |
|---|---|---|
| `catch-up/DMBCF_5a_header.idm … DMBCF_5f_rules_complete.idm` | The IDM at the end of each step of part 5 (open with **Open Project › IDM Project (.idm)**) | 3, 5a–5f |
| `IDM_DefectManagementBCF.idm` | The finished IDM (same as `DMBCF_5f_rules_complete.idm`) | 3, 5f |
| `IDM_DefectManagementBCF.xml` | The finished IDM as idmXML 2.0 (ISO 29481-3, idmXSD 2.0 Rev 14), valid against the schema | 5f |
| `forms/01 … 08 *.pdf` | Eight filled-in sample forms, one per process step; grey field codes are the IU ids | 5c, 5d |
| `bcf/RMOB_Defects_2026-11-13.bcfzip` | BCF 3.0 file with 8 defect topics (valid against the BCF-XML 3.0 schemas) | 5e |
| `bcf/RMOB_Defect_Register_2026-11-13.csv` | The same topics as a flat register | 5e |
| `exports/` | What xPPM neo-Seoul exports from the finished IDM: idmXML and HTML | 3, 5f |
| `videos/` | Ten videos (MP4, 1920×1080) with English voice-over, burnt-in captions and `.srt` subtitles | all |

## Step by step

### 1 Installing xPPM neo-Seoul

Download the file for your computer from <https://github.com/ghanglee/IDMxPPM/releases> (`<version>` is the release number, e.g. 1.7.0):

| Computer | File |
|---|---|
| macOS, Apple silicon | `xPPM neo-Seoul-<version>-arm64.dmg` |
| macOS, Intel | `xPPM neo-Seoul-<version>.dmg` |
| Windows, installer | `xPPM neo-Seoul Setup <version>.exe` |
| Windows, portable | `xPPM neo-Seoul <version>.exe` |
| Linux | `xPPM neo-Seoul-<version>.AppImage` |

Install it as usual and start the app. The start screen appears.

### 2 How to start a project

- **Blank Project** starts an empty IDM (used in part 5): a header, a use case, and a process map with one pool and a start event.
- **Sample Project** opens a complete example IDM to explore.
- **Open Project** opens an existing IDM project (.idm), idmXML 2.0 or 1.0, IDS, BPMN or reviewed HTML file.

### 3 How to open and save a project

1. **Open Project** (start screen, or left bar when no project is open) and choose the format. With a project open, use **Close Project** first.
2. **Save & Export** › **IDM Project (.idm)** keeps everything, including the process map layout. Save it while you work.
3. **idmXML 2.0** is the ISO 29481-3 exchange format for other tools; **HTML document** is a readable version for reviewers.

### 4 Basic interfaces

| Part | Where | What you edit |
|---|---|---|
| a. Header | left bar, first button | identifiers, title, version, status, authors, revisions |
| b. Use case | left bar, second button | summary, aim and scope, uses, region, language, actor roles, project phases |
| c. Process map | middle (always) | BPMN: pools, lanes, events, tasks, gateways, data objects, message flows |
| d. Exchange requirements | left bar, third button | ER hierarchy; information units with data type, definition, examples, mappings |
| e. Rules | left bar / use case › Business rules | business rules, constraints, formal expressions |

**Validate** checks the IDM against ISO 29481-3. **Save & Export** saves and exports it.

### 5 Learning through an example

#### The process at a glance

| Step | Who (actor role / lane) | Process map task | Form = data object = ER | BCF result |
|---|---|---|---|---|
| 1 Identification | General contractor / Site quality inspector | 1 Identify defect | Defect inspection form (ER01) | — (paper or mobile form) |
| 2 Logging | General contractor / BIM coordinator | 2 Log defect as BCF topic | Defect log entry (BCF topic) (ER02) | new Topic, TopicStatus = Open, viewpoint + snapshot |
| 3 Triage | General contractor / Quality manager | 3 Triage defect, gateway *Valid defect?* | Triage record (ER03) | Priority, Labels, triage Comment; Rejected if not valid |
| 4 Assignment | General contractor / Quality manager | 4 Assign defect to responsible party | Defect assignment notice (ER04) | AssignedTo, DueDate, TopicStatus = Assigned |
| 5 Resolution | Trade subcontractor | 5 Rectify defect and report | Rectification report (ER05) | Comment with after-photo viewpoint, TopicStatus = Resolved |
| 6 Verification | General contractor / Site quality inspector | 6 Verify rectification, gateway *Rectification accepted?* | Verification record (ER06) | Comment; Reopened if failed (loop back to step 4) |
| 7 Closure | General contractor / BIM coordinator | 7 Close defect | Defect closure record (ER07) | TopicStatus = Closed |
| Reporting and analysis | General contractor / Quality manager → Owner's representative (external) | timer *Every day 17:00*, Report and analyse defects | Defect status report (ER08) | aggregated from all topics |


#### 5a Creating a header

1. **Blank Project**. The IDM header opens on the left.
2. Full title *Defect Management Using BCF*, short title *DMBCF*; version 1.0; status *WD* (working draft).
3. **Person** adds an author; enter the given and family name.

Catch-up file: `catch-up/DMBCF_5a_header.idm`.

#### 5b Specifying a use case

1. **Use Case**: summary; aim and scope, including what is out of scope (claims, warranty).
2. Use: **User-defined Use** *Construction Quality Management*. Region *Korea*; language English.
3. Actor roles: rename the first actor *General contractor*; **Sub-actor** adds lanes *Site quality inspector*, *BIM coordinator* (and *Quality manager*).
4. **Add Actor** *Trade subcontractor* and *Owner's representative*; each gets a pool. Tick **External** for the owner's representative: it receives the daily report, but its own process is outside the IDM.
5. Project phase ISO 22263 *production*.

Catch-up file: `catch-up/DMBCF_5b_use_case.idm` (with all actors, keywords and references).

#### 5c Specifying a process map

i. The process: see the table above. ii. Depicting it:

1. The pools and lanes already exist from the actor roles.
2. Select the start event in the inspector's lane and append a task from its context pad: *1 Identify defect*.
3. Add a data object from the palette, *Defect inspection form*, and connect the task to it (the form is the task's output).
4. Complete the map, or open the catch-up file: seven tasks, gateways *Valid defect?* (→ rejected) and *Rectification accepted?* (→ reopen to task 4), message flows to the subcontractor and the owner's representative, a timer *Every day 17:00*, eight data objects.

Catch-up file: `catch-up/DMBCF_5c_process_map.idm`.

#### 5d Specifying exchange requirements

i. The forms: `forms/01 … 08` — one per step. ii. One form = one data object = one ER. iii. One field = one IU.

1. Double-click the data object *Defect inspection form* › **Create New ER**.
2. **+ IU** *Inspection number* (String, mandatory) with a definition; add *Location* and *Storey*.
3. Select *Storey* and **Indent** it under *Location* (sub-IU).
4. The catch-up file has the root ER *Defect management information* with eight sub-ERs (Appendix A).

Catch-up file: `catch-up/DMBCF_5d_exchange_requirements.idm`.

#### 5e Mapping information units to external elements

i. BCF (buildingSMART BIM Collaboration Format) exchanges issues as *topics* with *viewpoints* pointing to model elements; one topic per defect. ii. Mapping:

1. Select *Storey* › **+ Add Mapping** › *IFC 4x3 ADD2*; search *IfcBuildingStorey*; edit the path to `IfcBuildingStorey.Name` (the name is inherited from IfcRoot).
2. Select *Title* under *Defect* in the defect log entry › **+ Add Mapping** › **+ Add schema…** › preset *BCF 3.0* (120 element paths) › **Add schema**.
3. Search *Title* and apply `Markup/Topic/Title`.
4. Severity has no BCF field: it travels as a label (`Markup/Topic/Labels/Label`) from `extensions.xml`. Root cause is not exchanged.

Catch-up file: `catch-up/DMBCF_5e_mappings.idm` (all 64 mappings, Appendix A).

#### 5f Specifying rules

1. **Use Case** › **Business rules…** › **+ Add**: *Safety-critical defects* — “A defect that is flagged as safety-critical shall have the priority P1 - Critical.” **Done**.
2. Constraints › **+ Add**: defined in ER *Triage record*; **Select IUs** *Safety-critical*, *Priority*.
3. Description: `IU-TRI-05 = true IMPLIES IU-TRI-03 = 'P1 - Critical'`. **+ Add expression** adds a formal expression (SHACL, SPARQL, Python, Schematron, RuleML, LegalRuleML).
4. Open the finished IDM, **Validate** (0 errors, 0 warnings), and **Save & Export** idmXML 2.0 and HTML. Compare with `exports/`.

Catch-up file: `catch-up/DMBCF_5f_rules_complete.idm` (14 business rules, Appendix B).

## Design notes for instructors

- *One form = one data object = one ER.* Learners derive ERs from documents they know; the root ER groups them.
- *BCF as exchange view definition.* BCF carries the defect record across tools; IDM adds what BCF leaves open:
  which fields are mandatory, which vocabularies are allowed (extensions.xml), which status transitions are valid,
  and which response times apply.
- *Mapping notation.* `basis="BCF 3.0"`, `name` = XPath-like path in `markup.bcf` (`Markup/Topic/...`), in the
  viewpoint file (`VisualizationInfo/...`) or in `extensions.xml`. In the app, BCF 3.0 appears as a schema of its own in the basis list (detected from the mappings). Use **+ Add schema…** in a basis list to add BCF 3.0 from the preset with its 120 element paths: the schema can then be searched and mapping fields suggest element names.
- *Rules at three levels.* Business rule (natural language, owner: the quality plan) → constraint (restriction on IUs)
  → expression (machine-checkable, any rule language). The `true = violation` convention is used in Python/SPARQL.
- *Known limits.* The app stores one use classification for all uses; standard phase outcomes are not edited in the
  app.


## Appendix A — Exchange requirements, information units and BCF 3.0 mapping


### ER01 Defect inspection form — step: 1 Identification

Information the site quality inspector records on site when a defect is identified (paper or mobile form).

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-INS-01 | Inspection number | String / Text | M | — |  |
| IU-INS-02 | Inspected on | Date / Time | M | `Markup/Topic/CreationDate` |  |
| IU-INS-03 | Inspected by | String / Text | M | `Markup/Topic/CreationAuthor` |  |
| IU-INS-04 | Location | String / Text | M | — |  |
| IU-INS-041 | &nbsp;&nbsp;Storey | String / Text | M | `Markup/Header/Files/File/@IfcSpatialStructureElement` | IFC4.3: `IfcBuildingStorey.Name` |
| IU-INS-042 | &nbsp;&nbsp;Space | String / Text | M | — | IFC4.3: `IfcSpace.Name` |
| IU-INS-043 | &nbsp;&nbsp;Grid reference | String / Text | O | — | IFC4.3: `IfcGridAxis.AxisTag` |
| IU-INS-05 | Affected element | String / Text | O | `VisualizationInfo/Components/Selection/Component/@IfcGuid` | IFC4.3: `IfcRoot.GlobalId` |
| IU-INS-06 | Defect description | String / Text | M | `Markup/Topic/Description` |  |
| IU-INS-07 | Trade | String / Text | M | `Markup/Topic/Labels/Label` |  |
| IU-INS-08 | Photograph | Image | M | `Markup/Topic/Viewpoints/ViewPoint/Snapshot` |  |
| IU-INS-09 | Possible safety hazard | Boolean | M | `Markup/Topic/Labels/Label` |  |
| IU-INS-10 | Inspection reference | String / Text | O | `Markup/Topic/ReferenceLinks/ReferenceLink` |  |

### ER02 Defect log entry (BCF topic) — step: 2 Logging

The defect as a BCF topic in the project issue register, linked to the coordination model by a viewpoint.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-LOG-01 | Defect | Structured (list, graph, table, JSON) | M | `Markup/Topic` |  |
| IU-LOG-011 | &nbsp;&nbsp;Topic GUID | String / Text | M | `Markup/Topic/@Guid` |  |
| IU-LOG-012 | &nbsp;&nbsp;Defect number | String / Text | M | `Markup/Topic/@ServerAssignedId` |  |
| IU-LOG-013 | &nbsp;&nbsp;Title | String / Text | M | `Markup/Topic/Title` |  |
| IU-LOG-014 | &nbsp;&nbsp;Topic type | String / Text | M | `Markup/Topic/@TopicType` |  |
| IU-LOG-015 | &nbsp;&nbsp;Status | String / Text | M | `Markup/Topic/@TopicStatus` |  |
| IU-LOG-016 | &nbsp;&nbsp;Description | String / Text | M | `Markup/Topic/Description` |  |
| IU-LOG-017 | &nbsp;&nbsp;Created on | Date / Time | M | `Markup/Topic/CreationDate` |  |
| IU-LOG-018 | &nbsp;&nbsp;Created by | String / Text | M | `Markup/Topic/CreationAuthor` |  |
| IU-LOG-019 | &nbsp;&nbsp;Labels | String / Text | O | `Markup/Topic/Labels/Label` |  |
| IU-LOG-02 | Model reference | String / Text | M | `Markup/Header/Files/File` |  |
| IU-LOG-03 | Viewpoint | 3D Model | M | `Markup/Topic/Viewpoints/ViewPoint` |  |
| IU-LOG-031 | &nbsp;&nbsp;Camera | Structured (list, graph, table, JSON) | M | `VisualizationInfo/PerspectiveCamera` |  |
| IU-LOG-032 | &nbsp;&nbsp;Selected components | String / Text | M | `VisualizationInfo/Components/Selection/Component/@IfcGuid` |  |
| IU-LOG-033 | &nbsp;&nbsp;Snapshot | Image | M | `Markup/Topic/Viewpoints/ViewPoint/Snapshot` |  |
| IU-LOG-04 | Source inspection form | Document (PDF, DOCX, etc.) | M | `Markup/Topic/DocumentReferences/DocumentReference` |  |
| IU-LOG-05 | Related defects | String / Text | O | `Markup/Topic/RelatedTopics/RelatedTopic/@Guid` |  |
| IU-LOG-06 | Construction stage | String / Text | O | `Markup/Topic/Stage` |  |

### ER03 Triage record — step: 3 Triage

Decision of the quality manager on validity, severity, priority and category of a logged defect.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-TRI-01 | Triage decision | String / Text | M | `Markup/Topic/@TopicStatus` |  |
| IU-TRI-02 | Severity | String / Text | M | `Markup/Topic/Labels/Label` |  |
| IU-TRI-03 | Priority | String / Text | M | `Markup/Topic/Priority` |  |
| IU-TRI-04 | Defect category | String / Text | M | `Markup/Topic/Labels/Label` |  |
| IU-TRI-05 | Safety-critical | Boolean | M | `Markup/Topic/Labels/Label` |  |
| IU-TRI-06 | Duplicate of | String / Text | O | `Markup/Topic/RelatedTopics/RelatedTopic/@Guid` |  |
| IU-TRI-07 | Triage comment | Structured (list, graph, table, JSON) | M | `Markup/Topic/Comments/Comment` |  |
| IU-TRI-071 | &nbsp;&nbsp;Triaged on | Date / Time | M | `Markup/Topic/Comments/Comment/Date` |  |
| IU-TRI-072 | &nbsp;&nbsp;Triaged by | String / Text | M | `Markup/Topic/Comments/Comment/Author` |  |
| IU-TRI-073 | &nbsp;&nbsp;Rationale | String / Text | M | `Markup/Topic/Comments/Comment/Comment` |  |
| IU-TRI-08 | Root cause (preliminary) | String / Text | O | — |  |

### ER04 Defect assignment notice — step: 4 Assignment

Instruction from the general contractor to the responsible trade subcontractor to rectify a defect by a due date.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-ASG-01 | Notice number | String / Text | M | — |  |
| IU-ASG-02 | Responsible party | String / Text | M | — |  |
| IU-ASG-03 | Assignee | String / Text | M | `Markup/Topic/AssignedTo` |  |
| IU-ASG-04 | Due date | Date / Time | M | `Markup/Topic/DueDate` |  |
| IU-ASG-05 | Required action | String / Text | M | `Markup/Topic/Comments/Comment/Comment` |  |
| IU-ASG-06 | Issued on | Date / Time | M | `Markup/Topic/Comments/Comment/Date` |  |
| IU-ASG-07 | Back-charge applicable | Boolean | O | — |  |

### ER05 Rectification report — step: 5 Resolution

Report of the trade subcontractor that the defect has been rectified, with evidence.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-RES-01 | Rectification description | String / Text | M | `Markup/Topic/Comments/Comment/Comment` |  |
| IU-RES-02 | Completed on | Date / Time | M | `Markup/Topic/Comments/Comment/Date` |  |
| IU-RES-03 | Completed by | String / Text | M | `Markup/Topic/Comments/Comment/Author` |  |
| IU-RES-04 | After photograph | Image | M | `Markup/Topic/Comments/Comment/Viewpoint/@Guid` |  |
| IU-RES-05 | Cause found | String / Text | O | — |  |
| IU-RES-06 | Requested status | String / Text | M | `Markup/Topic/@TopicStatus` |  |

### ER06 Verification record — step: 6 Verification

Result of the re-inspection of a rectified defect by the site quality inspector.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-VER-01 | Verified on | Date / Time | M | `Markup/Topic/Comments/Comment/Date` |  |
| IU-VER-02 | Verified by | String / Text | M | `Markup/Topic/Comments/Comment/Author` |  |
| IU-VER-03 | Verification result | String / Text | M | `Markup/Topic/Comments/Comment/Comment` |  |
| IU-VER-04 | Remarks | String / Text | O | `Markup/Topic/Comments/Comment/Comment` |  |
| IU-VER-05 | Verification photograph | Image | O | `Markup/Topic/Comments/Comment/Viewpoint/@Guid` |  |
| IU-VER-06 | Failed verifications | Numeric | M | — |  |

### ER07 Defect closure record — step: 7 Closure

Formal closure of the defect by the BIM coordinator after a passed verification.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-CLO-01 | Final status | String / Text | M | `Markup/Topic/@TopicStatus` |  |
| IU-CLO-02 | Closed on | Date / Time | M | `Markup/Topic/ModifiedDate` |  |
| IU-CLO-03 | Closed by | String / Text | M | `Markup/Topic/ModifiedAuthor` |  |
| IU-CLO-04 | Days to close | Numeric | M | — |  |
| IU-CLO-05 | Closure sign-off | Document (PDF, DOCX, etc.) | O | `Markup/Topic/DocumentReferences/DocumentReference` |  |

### ER08 Defect status report — step: Reporting and analysis

Daily summary and analysis of all defect topics for the owner's representative.

| IU | Name | Data type | M/O | BCF 3.0 element | Other mapping |
|---|---|---|---|---|---|
| IU-RPT-01 | Reporting date | Date / Time | M | — |  |
| IU-RPT-02 | Defect register extract | Structured (list, graph, table, JSON) | M | `BCF file (.bcfzip)` |  |
| IU-RPT-03 | Defects by status | Structured (list, graph, table, JSON) | M | `Markup/Topic/@TopicStatus` |  |
| IU-RPT-04 | Defects by priority | Structured (list, graph, table, JSON) | M | `Markup/Topic/Priority` |  |
| IU-RPT-05 | Defects by trade | Structured (list, graph, table, JSON) | M | `Markup/Topic/Labels/Label` |  |
| IU-RPT-06 | Overdue defects | Structured (list, graph, table, JSON) | M | `Markup/Topic/DueDate` |  |
| IU-RPT-07 | Average days to close | Numeric | M | — |  |
| IU-RPT-08 | Prepared by | String / Text | M | — |  |

## Appendix B — Business rules and constraints

| Rule | Statement | Constraint(s) | IUs | Formal expressions |
|---|---|---|---|---|
| **BR-DM-01** Unique defect identification | Every defect shall have a globally unique identifier and a project defect number that is never reused. | C-DM-01 (ER02) | IU-LOG-011, IU-LOG-012 | Python |
| **BR-DM-02** Defect location | Every defect shall be located by storey and space and, where it affects a modelled element, by the IFC GlobalId of that element. | C-DM-02 (ER01)<br>C-DM-03 (ER02) | IU-INS-041, IU-INS-042, IU-INS-05<br>IU-LOG-032, IU-LOG-033 | description only<br>Schematron |
| **BR-DM-03** Photographic evidence | Every defect found in an inspection shall include at least one photograph of the defect, carried as the snapshot of the first viewpoint of the BCF topic. | C-DM-03 (ER02) | IU-LOG-032, IU-LOG-033 | Schematron |
| **BR-DM-04** Controlled vocabularies | The topic type, topic status, priority, labels and users of a defect shall be values defined in the project BCF extensions (extensions.xml). | C-DM-04 (ER02) | IU-LOG-014, IU-LOG-015, IU-LOG-019 | Schematron |
| **BR-DM-05** Defect status lifecycle | The status of a defect shall change only along the transitions of the defect status lifecycle. | C-DM-05 (ER02) | IU-LOG-015 | Python |
| **BR-DM-06** Triage deadline | A logged defect shall be triaged within 2 working days of its creation date. | C-DM-06 (ER03) | IU-LOG-017, IU-TRI-071 | Python |
| **BR-DM-07** Rectification period by priority | The due date of a defect shall be no later than 1 day (P1 - Critical), 7 days (P2 - High), 14 days (P3 - Medium) or 30 days (P4 - Low) after triage. | C-DM-07 (ER04) | IU-TRI-03, IU-TRI-071, IU-ASG-04 | Python, SPARQL |
| **BR-DM-08** Safety-critical defects | A defect that is flagged as safety-critical shall have the priority P1 - Critical. | C-DM-08 (ER03) | IU-TRI-05, IU-TRI-03 | SHACL |
| **BR-DM-09** Single responsible assignee | An assigned defect shall have exactly one assignee, who is a registered project user of the responsible party. | C-DM-09 (ER04) | IU-ASG-03, IU-ASG-02 | Schematron |
| **BR-DM-10** Evidence of rectification | A defect shall be set to Resolved only with a rectification description and at least one photograph taken after rectification. | C-DM-10 (ER05) | IU-RES-01, IU-RES-04, IU-RES-06 | description only |
| **BR-DM-11** Independent verification | The person who verifies a rectification shall not be the assignee of the defect. | C-DM-11 (root ER) | IU-VER-02, IU-ASG-03 | RuleML |
| **BR-DM-12** Closure after passed verification | A defect shall be closed only after a verification with the result Passed; a rejected defect shall record the reason for rejection. | C-DM-12 (root ER) | IU-CLO-01, IU-VER-03, IU-TRI-01, IU-TRI-073 | LegalRuleML |
| **BR-DM-13** Escalation of repeated failures | A defect whose rectification fails verification more than twice shall be escalated to the project manager. | C-DM-13 (ER06) | IU-VER-06 | description only |
| **BR-DM-14** Daily defect status report | A defect status report shall be issued every working day with the number of defects by status, priority and trade, the list of overdue defects and the average time to close. | C-DM-14 (ER08) | IU-RPT-01, IU-RPT-03, IU-RPT-04, IU-RPT-05, IU-RPT-06, IU-RPT-07 | SPARQL |

## Appendix C — Project BCF vocabulary (extensions.xml)

- **TopicTypes**: Defect, Clash, Request, Remark
- **TopicStatuses**: Open, Assigned, In progress, Resolved, Reopened, Closed, Rejected
- **Priorities**: P1 - Critical, P2 - High, P3 - Medium, P4 - Low
- **TopicLabels**: Trade: Doors and hardware, Trade: Finishes, Trade: Fire stopping, Trade: Metalwork, Trade: MEP, Category: Workmanship, Category: Material, Category: Damage, Category: Missing work, Category: Safety, Severity: Critical, Severity: Major, Severity: Minor, Severity: Cosmetic, Safety, Escalated
- **Users**: minji.park@example.com, daniel.kim@example.com, seojun.lee@example.com, jiho.choi@example.com, yuna.han@example.com, hyunwoo.kang@example.com, hana.jung@example.com
- **Stages**: Structure, Envelope, Fit-out, Commissioning, Handover
- **SnippetTypes**: IFC4X3
