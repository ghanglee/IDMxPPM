# Invalid businessRule samples (idmXSD v2.0 Rev 12)

Each file is `BR_minimal_r12.xml` with exactly one defect. All must be rejected by the schema.

| File | Defect |
|---|---|
| `01_no_statement.xml` | businessRule without statement |
| `02_two_statements.xml` | two statements (one statement per business rule) |
| `03_statement_with_xml_lang.xml` | xml:lang on statement (translations are out of scope) |
| `04_empty_images.xml` | images without image |
| `05_image_without_images.xml` | image directly under businessRule (must be inside images) |
| `06_description_before_statement.xml` | description before statement (order: statement, images, description, reference) |
| `07_proposition_ed2.xml` | ed. 2 proposition wrapper (removed in Rev 12) |
| `08_empty_statement.xml` | empty statement |
