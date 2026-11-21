# xPPM neo-Seoul quick tutorial — video plan and narration scripts

Ten videos following the tutorial outline, 1920×1080, 30 fps, English voice-over (synthetic voice, Kokoro TTS) with burnt-in captions and `.srt` subtitles.
Production: screen states captured from xPPM neo-Seoul 1.7.0 in a scripted browser session (device scale 2), slides rendered from HTML; cursor, click ripples, spotlight highlights and zooms added in post. Scripts: `video/qa.cjs` (1–4), `video/qb.cjs` (5a–5f), `video/render.py`.

| # | Video | Learning goals | Duration |
|---|---|---|---|
| 1 | Installing xPPM neo-Seoul | Where to download; installer file names per platform; start screen | 0:35 |
| 2 | Starting a project | Blank, sample and existing projects; what a blank project contains | 0:34 |
| 3 | Opening and saving a project | Open formats; save the .idm project file; export idmXML 2.0 and HTML | 0:57 |
| 4 | The interface | The five parts of an IDM and where each is in the app; validate and save | 1:17 |
| 5a | Creating a header | Header identifiers, version, status, authors; catch-up files | 0:52 |
| 5b | Specifying a use case | Summary, aim and scope, uses, region; actor roles ↔ pools and lanes; external actor; phase | 1:14 |
| 5c | Specifying a process map | The defect management process; append tasks; data objects; output associations | 2:03 |
| 5d | Specifying exchange requirements | Forms → data objects → ERs; IUs from fields; data type, mandatory, definition; sub-IUs | 1:39 |
| 5e | Mapping information units to external elements | External mappings; built-in schemas (IFC); BCF; custom schema from the BCF 3.0 preset | 1:56 |
| 5f | Specifying rules | Business rule → constraint → expression; validate; export idmXML and HTML | 1:48 |
| | **Total** | | **12:59** |

## Video 1 — Installing xPPM neo-Seoul

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | Welcome to the xPPM neo-Seoul quick tutorial. In about twenty minutes, you will learn how to author an information delivery manual, an IDM, from a blank project. |
| 2 | slide | Open the releases page of the xPPM neo-Seoul repository on GitHub, and download the file for your computer: a disk image for macOS, an installer or a portable program for Windows, or an AppImage for Linux. |
| 3 | app view + highlight | Install it as usual and start xPPM neo-Seoul. The start screen appears. In the next video, we start a project. |

## Video 2 — Starting a project

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | There are three ways to start. |
| 2 | app view + highlight | Blank Project starts an empty IDM. Use it to author a new IDM; we will use it in part five. |
| 3 | app view + highlight | Sample Project opens a complete example IDM, useful to explore the app. |
| 4 | app view + highlight | Open Project opens an IDM you already have: a project file, an idmXML file, an IDS, or a BPMN diagram. |
| 5 | click, app view | Click Blank Project. The new IDM has a header, a use case, and a process map with one pool and a start event. |

## Video 3 — Opening and saving a project

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | Opening and saving a project. |
| 2 | click | To open a file, click Open Project, on the start screen or in the left bar, and choose its format. |
| 3 | app view + highlight | The IDM Project format is the app's own project file. idmXML 2.0 is the exchange format of ISO 29481-3. You can also open idmXML 1.0, IDS, BPMN and reviewed HTML files. |
| 4 | click | To save, click Save and Export in the left bar. |
| 5 | app view (zoom) + highlight | Save the IDM Project file to keep working on it later. It keeps everything, including the layout of the process map. |
| 6 | app view (zoom) + highlight | Export idmXML 2.0 to exchange the IDM with other tools, following ISO 29481-3. Export an HTML document to share a readable version with reviewers. |

## Video 4 — The interface

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | Before we build an IDM, let us look at what an IDM consists of, and where each part is in the app. |
| 2 | slide | An IDM has five parts: a header, a use case, a process map, exchange requirements with their information units, and rules. ISO 29481-1 defines the method, and ISO 29481-3 the data schema. |
| 3 | app view + highlight | The bar on the left opens the parts. The first button opens the IDM header: identifiers, authors and revisions. |
| 4 | click, app view + highlight | The second opens the use case: purpose, uses, region, actor roles, and project phases. |
| 5 | app view + highlight | The process map is always in the middle: a BPMN editor with a palette for events, tasks, gateways, data objects, pools and lanes. |
| 6 | click, app view + highlight | The third button opens the exchange requirements. Select one to see its information units on the right, and select an information unit to edit it. |
| 7 | click, app view + highlight | Rules opens the business rules and constraints. The same dialog is available from the use case. |
| 8 | app view + highlight | Finally, Validate checks the IDM against ISO 29481-3, and Save and Export saves it. Now let us build an IDM ourselves. |

## Video 5a — Creating a header

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | In part five, you build a complete IDM for defect management, step by step, starting from a blank project. After each step, a catch-up file lets you continue from the same point. |
| 2 | click | Click Blank Project. The IDM header is open on the left. |
| 3 | click, typing | Enter the full title, Defect Management Using BCF, and the short title, DMBCF. |
| 4 | click, app view (zoom) + highlight | Keep version one point zero, and set the status to working draft. |
| 5 | click, typing | Add an author: click Person, open the new entry, and enter the given and family name. |
| 6 | app view + highlight | The creation date is filled in automatically, and the revision history records later changes. The header is done. The catch-up file for this step is DMBCF_5a_header.idm. |

## Video 5b — Specifying a use case

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | The use case says what the IDM is for, who takes part, and where and when it applies. |
| 2 | click, typing | Open the use case. Write a short summary of the information exchange. |
| 3 | click, typing | Under aim and scope, state the purpose and what is out of scope. |
| 4 | click, typing | Add the use. Choose User-defined Use, type Construction Quality Management, and click Add. You can also pick a use from the NBIMS-US list. |
| 5 | click, app view + highlight | Select the target region, Korea, and remove International. The language is English. |
| 6 | app view, click, typing | Under actor roles, the blank project already has one actor, linked to its pool. Rename it General contractor. Click Sub-actor: the pool is divided into lanes. Name them Site quality inspector and BIM coordinator. |
| 7 | click, typing | Click Add Actor for the owner's representative. The app also adds a pool for it. Tick External: it receives the daily report, but its own process is outside the IDM. |
| 8 | click, app view + highlight | Finally, tick the ISO 22263 project phase, production. The catch-up file DMBCF_5b_use_case.idm contains the complete use case, with all actors, keywords and references. |

## Video 5c — Specifying a process map

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | The process map shows who does what, in which order, and where information is exchanged. |
| 2 | slide | First, the process. A site quality inspector identifies a defect, and a BIM coordinator logs it. The quality manager triages and assigns it to a trade subcontractor, who rectifies it. The inspector verifies the work, and the defect is closed, or reopened. Every day at five p.m., a defect status report goes to the owner's representative. |
| 3 | app view + highlight | Now draw it. The pools and lanes are already there: they were created from the actor roles of the use case. The general contractor has three lanes; the subcontractor and the owner's representative have a pool each. |
| 4 | click, app view (zoom) | Select the start event in the inspector's lane, and append a task from its context pad. Name it 1, Identify defect. |
| 5 | click, app view (zoom) + highlight | The inspector hands over a form, so add a data object from the palette, place it next to the task, and name it Defect inspection form. |
| 6 | click, app view (zoom) + highlight | Then connect the task to the data object: the form is the output of the task. Data objects mark where information is exchanged; they will become exchange requirements. |
| 7 | click | Drawing the whole process takes a while. Close the project without saving, and open the catch-up file DMBCF_5c_process_map.idm with the complete map. |
| 8 | app view + highlight | Here is the full map. Three pools: the general contractor with three lanes, the trade subcontractor, and the external owner's representative. |
| 9 | app view + highlight | Gateways make decisions: an invalid defect is rejected, and a failed verification reopens the defect. Message flows connect the pools, and a timer starts the daily reporting at five p.m. |
| 10 | app view + highlight | The eight data objects are the forms exchanged between activities. In the next step, each becomes an exchange requirement. |
| 11 | click, app view + highlight | Pools and lanes are linked to the actor roles of the use case: in Actor Roles, the tags Pool and Lane show the links. |

## Video 5d — Specifying exchange requirements

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | An exchange requirement defines the information that one exchange must carry. |
| 2 | slide | In this process, the information is exchanged as forms: an inspection form, a log entry, a triage record, an assignment notice, and so on. Each form becomes one exchange requirement. |
| 3 | slide | Here is the defect inspection form. Each field will become an information unit: inspection number, date, inspector, location with storey, space and grid, and so on. |
| 4 | click, typing | Double-click the data object Defect inspection form. Choose Create New ER, keep the name, and click Create ER. |
| 5 | click | The new exchange requirement opens on the right. Click plus IU to add an information unit. |
| 6 | click, typing | Name it Inspection number. Keep String or Text as the data type, tick Mandatory, and write a definition. |
| 7 | app view (zoom), click, app view (zoom) + highlight | Add two more units, Location and Storey. Then select Storey and click the indent button: Storey becomes a sub-unit of Location. |
| 8 | app view (zoom), click | Synonyms, examples and figures can be added in the same editor. Repeating this for all eight forms takes time, so open the catch-up file DMBCF_5d_exchange_requirements.idm. |
| 9 | app view + highlight | In the catch-up file, a root exchange requirement, Defect management information, groups eight sub-ERs, one per form. Each data object is linked to its ER. |
| 10 | click, app view (zoom) | Select the defect inspection form: ten information units, with data types, mandatory flags and definitions. Location has three sub-units. |

## Video 5e — Mapping information units to external elements

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | A mapping tells software developers where an information unit is stored in a data format that tools already support. |
| 2 | slide | Each information unit can have one or more corresponding external elements. Built-in schemas include bSDD, IFC and CityGML, and you can add your own. |
| 3 | click | Open the defect inspection form, expand Location, and select Storey. |
| 4 | click, typing, app view (zoom) | Click Add Mapping, choose IFC 4x3 ADD2, and search for IfcBuildingStorey. The search lists the attributes the entity defines itself; pick one and click Apply. |
| 5 | click, typing, app view (zoom) + highlight | The storey name is inherited from IfcRoot, so edit the path directly: IfcBuildingStorey dot Name. The path is free text; search only helps you find it. |
| 6 | slide | BCF, the BIM Collaboration Format of buildingSMART, exchanges issues as topics, with viewpoints that point to model elements. It is a natural format for defects, so we map the defect information to BCF. |
| 7 | click | Open the defect log entry, expand Defect, and select Title. |
| 8 | click | BCF 3.0 is not built in. Click Add Mapping, and in the basis list choose Add schema. Start from the BCF 3.0 preset, with its 120 element paths, and click Add schema. |
| 9 | click, typing, app view (zoom) + highlight | Now search the BCF elements for Title, and apply Markup slash Topic slash Title. |
| 10 | click | The catch-up file DMBCF_5e_mappings.idm has all 64 mappings. Close the project without saving and open it. |
| 11 | click, app view (zoom) + highlight | Information that BCF does not define, such as severity, travels as a label from the project extensions file. Some information is not exchanged at all. |

## Video 5f — Specifying rules

| Shot | On screen | Narration |
|---|---|---|
| 1 | slide | Rules state what the exchanged information must satisfy. |
| 2 | slide | A business rule is a statement in natural language. A constraint restricts information units. An expression states the constraint in a rule language that software can check. |
| 3 | click | Open the use case, and click Business rules. |
| 4 | click, typing | Click Add. Name the rule Safety-critical defects, and write the statement: a defect flagged as safety-critical shall have the priority P1, Critical. Click Done. |
| 5 | click | Now add a constraint for this rule. Define it in the triage record, where the information units are. |
| 6 | click | Click Select IUs, and choose Safety-critical and Priority. |
| 7 | click, typing | Write the constraint, using Insert IU reference to refer to information units by their id: if Safety-critical is true, then Priority equals P1, Critical. |
| 8 | app view (zoom) + highlight, click, app view (zoom) | A formal expression in SHACL, SPARQL, Python or another rule language can be added with Add expression. Click Done. |
| 9 | click | The catch-up file DMBCF_5f_rules_complete.idm is the finished IDM, with fourteen rules and their constraints. Open it. |
| 10 | click, app view (zoom) | Click Validate. The IDM is checked against ISO 29481-3: no errors, no warnings. |
| 11 | click | Finally, Save and Export. Export idmXML 2.0 to exchange the IDM with other tools, and an HTML document to share it with reviewers. |
| 12 | slide | This is the exported HTML document. You have built a complete IDM: header, use case, process map, exchange requirements, mappings, and rules. Thank you for watching. |
