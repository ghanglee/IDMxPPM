# IDM samples

Samples are split by idmXSD version (ISO 29481-3).

## idmXML_v1.0 — idmXSD 1.0 (no namespace, `idm.xsd`)

The idmXSD 1.0 samples are contributed project files that are not distributed with this repository.
Keep local copies in this folder; it is ignored by git except for its README.

## idmXML_v2.0 — idmXSD 2.0 (namespace `https://standards.iso.org/iso/29481/-3/ed-2/en`)

| Folder | Contents |
|---|---|
| `FireSafetyDesignReview/` | **Startup sample** (Rev 14). ER hierarchy (root ER, design model with three sub-ERs, review report), 7 business rules (one with an embedded image), 7 constraints with SPARQL, Python, SHACL, LegalRuleML and RuleML expressions, 19 synonyms in five languages, an IU description with an embedded image, 3 EVDs (IFC, CityGML, BCF), 3 pools / 3 lanes with an external actor role, 2 data objects linked to ERs, a classified local project phase; `.xml` and `.idm` (app project; the copy the app loads is in `public/samples/`) |
| `businessRule/r12/` | Rev 12 business-rule samples (minimal, full, WindowCost) and eight invalid cases; see its README |
| `MEPEquipmentHandover/` | 7 business rules, 7 constraints (SPARQL expression), COBie and IFC mappings, 2 EVDs, 2 pools / 3 lanes; `.xml` and `.idm` |
| `CostEstimation_WindowsDoors/` | `idmWindowCostEstimation.idm` (app project; the former startup sample) |
| `DefectManagementBCF/` | **Tutorial sample** (Rev 14) "Defect Management Using BCF": 3 pools / 3 lanes (external owner's representative), steps 1-7 with reopen loop and weekly reporting timer, 8 data objects linked to 8 ERs (one per form, 74 IUs), 60 IU mappings to BCF 3.0 elements, 14 business rules (2 with images), 14 constraints with Python, Schematron, SHACL, SPARQL, RuleML and LegalRuleML expressions, 2 cross-ER constraints on the root ER; `.xml` and `.idm`. Forms, BCF file and videos: `_local/video_tutorials/v1.7/DefectManagementBCF/` |

All idmXML 2.0 files in this folder (except `invalid/`) validate against the Rev 14 schema in
`_local/references/idm schemas/idmXSD_v2/` with libxml2, Xerces and xmlschema; `tests/run_tests.py` checks them.
The `.idm` files are app project files; the app exports them back to Rev 14-valid XML
(round-trip tests in `_local/roundtrip_tests/`). The FireSafetyDesignReview XML also contains
outcomes and information requirements for the standard project phase, which the app does not edit yet.
The Rev 12 version of FireSafetyDesignReview is archived in `_local/samples_archive/FireSafetyDesignReview_r12/`.

Regulatory values in the new samples (Korean Building Act decree articles, EIR clauses) are illustrative.
