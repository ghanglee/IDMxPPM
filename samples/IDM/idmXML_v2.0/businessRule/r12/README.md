# businessRule samples — idmXSD v2.0 Revision 12

In Rev 12 a business rule consists of:

```
businessRule (id, name)
├── statement      1..1   the rule in natural language (non-empty text; no translations)
├── images         0..1   graphical examples
│   └── image      1..*
├── description    0..*   commentary on the rule (scope, exceptions, interpretation)
└── reference      0..*   sources, e.g. a legal clause
```

The rule is linked from ER constraints (Rev 11) via `constraint/associatedBusinessRule/@ref`. Each constraint states it informally (`description`) and/or formally (`expression` + `formalRuleLanguage`).

| File | Shows |
|---|---|
| `BR_minimal_r12.xml` | Smallest valid business rule: id, name, statement |
| `BR_full_r12.xml` | Statement, two images, two commentary descriptions, two references; two constraints linking BR-07/BR-08 to information units, with RuleML, LegalRuleML, SPARQL (CDATA) and SHACL (external file) expressions; information units with synonyms |
| `WindowCostIDM_BusinessRules_r12.xml` | `samples/WindowCostIDM_BusinessRules.xml` converted to Rev 12: English statement kept (ko/de translations dropped), `image` moved into `images`, commentary added to BR-2 and BR-3 |
| `invalid/` | Eight files, each with one defect that the schema must reject (see `invalid/README.md`) |

**Validation:** all files were checked against the monolithic and the modularized schema with libxml2, Xerces (JDK) and Python `xmlschema`. The three valid files pass and all eight invalid files are rejected.

**Regenerate:** `python3 "_local/references/idm schemas/idmXSD_v2/tests/make_br_samples.py" <repo root>`

**Note:** the RuleML and LegalRuleML markup shows the structure only and has not been validated against those languages' schemas. The image files referenced in `BR_full_r12.xml` (`images/…png`) are placeholders.
