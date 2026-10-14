# IDM samples

Samples are split by idmXSD version (ISO 29481-3).

## idmXML_v1.0 — idmXSD 1.0 (no namespace, `idm.xsd`)

The idmXSD 1.0 samples are contributed project files that are not distributed with this repository.
Keep local copies in this folder; it is ignored by git except for its README.

## idmXML_v2.0 — idmXSD 2.0 (namespace `https://standards.iso.org/iso/29481/-3/ed-2/en`)

| Folder | Contents |
|---|---|
| `businessRule/r12/` | Rev 12 business-rule samples (minimal, full, WindowCost) and eight invalid cases; see its README |
| `FireSafetyDesignReview/` | 6 business rules, 6 constraints (SPARQL, Python and SHACL expressions), synonyms, 3 pools / 3 lanes; `.xml` (Rev 12) and `.idm` (app project) |
| `MEPEquipmentHandover/` | 7 business rules, 7 constraints (SPARQL expression), COBie and IFC mappings, 2 pools / 3 lanes; `.xml` (Rev 12) and `.idm` |
| `CostEstimation_WindowsDoors/` | `idmWindowCostEstimation.idm` (app project; the copy the app loads is in `public/samples/`) |

All idmXML 2.0 files in this folder (except `invalid/`) validate against the Rev 12 schema in
`_local/references/idm schemas/idmXSD_v2/` with libxml2 and Xerces; `tests/run_tests.py` checks them.
The two new `.idm` files were produced by the app's own importer (`parseIdmXml`), and the app's
exporter (`generateIdmXml`) turns them back into Rev 12-valid XML with the same business rules,
constraints, expressions, synonyms and actor mappings.

Regulatory values in the new samples (Korean Building Act decree articles, EIR clauses) are illustrative.
