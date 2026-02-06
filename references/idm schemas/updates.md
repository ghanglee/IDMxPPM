Summary of Differences: idm1_0.xsd vs idm2_0.xsd
1. Namespace Version

v1.0: https://standards.buildingsmart.org/IDM/idmXML/0.2 with version="1.0"
v2.0: https://standards.buildingsmart.org/IDM/idmXML/2.0 (no version attribute)

2. Terminology Change: "Phase" → "Stage"

v1.0: standardProjectPhase, localProjectPhase
v2.0: standardProjectStage, localProjectStage

This renaming also affects the unique constraint name: unique_standardProjectPhaseName → unique_standardprojectStageName
3. Author Element Structure

v1.0: <xs:choice> without explicit minOccurs/maxOccurs on the choice itself; maxOccurs="unbounded" placed on individual child elements (person, organization)
v2.0: <xs:choice minOccurs="1" maxOccurs="unbounded"> on the choice; no maxOccurs on child elements

This is a subtle but meaningful change — v2.0 allows mixing persons and organizations within a single author, while v1.0 allows only one type but multiple of that type.
4. Exchange Requirements (er) Structure — Major Change

v1.0: informationUnit is a direct required child (minOccurs="1" maxOccurs="unbounded"), followed by optional subEr
v2.0: Uses <xs:choice minOccurs="1" maxOccurs="unbounded"> requiring either informationUnit OR subEr (at least one), implementing ISO 29481-3 Clause 10 explicitly with comments

This is the most significant structural change, ensuring an ER is never empty.
5. Element Ordering in er

v1.0: specId → authoring → informationUnit → constraint → correspondingMvd → description → subEr
v2.0: specId → authoring → constraint → correspondingMvd → description → choice(informationUnit|subEr)

6. Documentation

v2.0 includes section header comments and explicitly references ISO 29481-3 Clause 10 compliance for the ER non-empty requirement