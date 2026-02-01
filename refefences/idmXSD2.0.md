<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:include schemaLocation="specId.xsd"/>
	<xs:include schemaLocation="authoring.xsd"/>
	<xs:include schemaLocation="uc.xsd"/>
	<xs:include schemaLocation="businessContextMap.xsd"/>
	<xs:include schemaLocation="er.xsd"/>
	<xs:element name="idm">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="specId" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="authoring" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="uc" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="businessContextMap" minOccurs="0" maxOccurs="unbounded"/>
				<xs:element ref="er" minOccurs="0" maxOccurs="1"/>
				<xs:element name="subIdm" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="idm"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
</xs:schema>

<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:element name="specId">
		<xs:complexType>
			<xs:attribute name="guid" type="uuid" use="required"/>
			<xs:attribute name="shortTitle" type="xs:string" use="required"/>
			<xs:attribute name="localShortTitle" type="xs:string" use="optional"/>
			<xs:attribute name="fullTitle" type="xs:string" use="required"/>
			<xs:attribute name="subTitle" type="xs:string" use="optional"/>
			<xs:attribute name="idmCode" type="xs:string" use="required"/>
			<xs:attribute name="localCode" type="xs:string" use="optional"/>
			<xs:attribute name="documentStatus" type="xs:string" use="required"/>
			<xs:attribute name="localDocumentStatus" type="xs:string" use="optional"/>
			<xs:attribute name="version" type="xs:string" use="optional"/>
		</xs:complexType>
		<xs:key name="key_guid">
			<xs:selector xpath="."/>
			<xs:field xpath="@guid"/>
		</xs:key>
	</xs:element>
	<xs:simpleType name="uuid">
		<xs:restriction base="xs:normalizedString">
			<xs:length value="36" fixed="true"/>
			<xs:pattern value="[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"/>
		</xs:restriction>
	</xs:simpleType>
</xs:schema>

<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:include schemaLocation="specId.xsd"/>
	<xs:include schemaLocation="authoring.xsd"/>
	<xs:include schemaLocation="uc.xsd"/>
	<xs:include schemaLocation="businessContextMap.xsd"/>
	<xs:element name="er">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="specId" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="authoring" minOccurs="1" maxOccurs="1"/>
				<xs:element name="constraint" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
						<xs:attribute name="associatedInformationUnit" use="optional"/>
						<xs:attribute name="associatedBusinessRule" use="optional"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="correspondingMvd" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="basis" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
<!--ISO 29481-3 Clause 10. An ER shall not be empty and shall have at least one information unit or a sub-ER. -->
				<xs:choice minOccours="1" maxOccurs="unbounded">
				    <xs:element ref="informationUnit"/>
				    <xs:element name="subEr">
			        	<xs:complexType>
				            <xs:sequence>
				                <xs:element ref="er"/>
				            </xs:sequence>
				        </xs:complexType>
				    </xs:element>
				</xs:choice>>
<!--ISO 29481-3 Clause 10. An ER shall not be empty and shall have at least one information unit or a sub-ER. -->		
		</xs:complexType>
		<xs:key name="key_erGuid">
			<xs:selector xpath="./specId"/>
			<xs:field xpath="@guid"/>
		</xs:key>
		<xs:key name="key_informationUnitId">
			<xs:selector xpath="./informationUnit"/>
			<xs:field xpath="@id"/>
		</xs:key>
		<xs:key name="key_constraint">
			<xs:selector xpath="./constraint"/>
			<xs:field xpath="@id"/>
		</xs:key>
		<xs:keyref name="keyref_associatedInformationUnit" refer="key_informationUnitId">
			<xs:selector xpath="./constraint"/>
			<xs:field xpath="@associatedInformationUnit"/>
		</xs:keyref>
		<xs:keyref name="keyref_associatedEr" refer="key_erGuid">
			<xs:selector xpath="./associatedEr"/>
			<xs:field xpath="associatedEr"/>
		</xs:keyref>
	</xs:element>
	<!-- Information Unit -->
	<xs:element name="informationUnit">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="examples" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="correspondingExternalElement" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="basis" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="subInformationUnit" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence minOccurs="0" maxOccurs="unbounded">
							<xs:element ref="informationUnit"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
			<xs:attribute name="id" type="xs:string" use="required"/>
			<xs:attribute name="name" type="xs:string" use="required"/>
			<xs:attribute name="dataType" type="xs:string" use="required"/>
			<xs:attribute name="isMandatory" type="xs:boolean" use="required"/>
			<xs:attribute name="definition" type="xs:string" use="required"/>
		</xs:complexType>
	</xs:element>
	<xs:element name="associatedEr"/>
</xs:schema>


<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:include schemaLocation="specId.xsd"/>
	<xs:include schemaLocation="authoring.xsd"/>
	<xs:include schemaLocation="businessContextMap.xsd"/>
	<xs:include schemaLocation="er.xsd"/>
	<xs:element name="uc">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="specId" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="authoring" minOccurs="1" maxOccurs="1"/>
				<xs:element name="summary" minOccurs="1" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="aimAndScope" minOccurs="1" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="language" minOccurs="1" maxOccurs="1"/>
				<xs:element name="use" minOccurs="1" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="classification" minOccurs="0" maxOccurs="1"/>
						</xs:sequence>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="region" minOccurs="1" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="type" default="USR">
								<xs:simpleType>
									<xs:restriction base="xs:string">
										<xs:enumeration value="continent"/>
										<xs:enumeration value="country"/>
										<xs:enumeration value="USR"/>
									</xs:restriction>
								</xs:simpleType>
							</xs:element>
						</xs:sequence>
						<xs:attribute name="value" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="standardProjectStage" minOccurs="1" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="name">
								<xs:simpleType>
									<xs:restriction base="xs:string">
										<xs:enumeration value="inception"/>
										<xs:enumeration value="brief"/>
										<xs:enumeration value="design"/>
										<xs:enumeration value="production"/>
										<xs:enumeration value="maintenance"/>
										<xs:enumeration value="demolition"/>
									</xs:restriction>
								</xs:simpleType>
							</xs:element>
							<xs:element ref="outcomes" minOccurs="0" maxOccurs="1"/>
							<xs:element ref="informationRequirements" minOccurs="0" maxOccurs="1"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="localProjectStage" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="name" minOccurs="1" maxOccurs="1"/>
							<xs:element ref="outcomes" minOccurs="0" maxOccurs="1"/>
							<xs:element ref="informationRequirements" minOccurs="0" maxOccurs="1"/>
							<xs:element ref="classification" minOccurs="0" maxOccurs="1"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="constructionEntity" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="classification" minOccurs="0" maxOccurs="1"/>
						</xs:sequence>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="businessRule" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="proposition" minOccurs="1" maxOccurs="1">
								<xs:complexType>
									<xs:sequence>
										<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
									</xs:sequence>
								</xs:complexType>
							</xs:element>
							<xs:element name="reference" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="actor" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="classification" minOccurs="0" maxOccurs="1"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="benefits" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="limitations" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="requiredResources" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="requiredCompetencies" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="scopeKeyword" minOccurs="0" maxOccurs="unbounded"/>
				<xs:element name="benefitKeyword" minOccurs="0" maxOccurs="unbounded"/>
				<xs:element name="reference" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:attribute name="basisStandard" type="xs:boolean" use="required"/>
						<xs:attribute name="fullCitation" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="userDefinedProperty" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="subUc" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="uc"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
		</xs:complexType>
		<xs:key name="key_ucGuid">
			<xs:selector xpath="specId"/>
			<xs:field xpath="@guid"/>
		</xs:key>
		<xs:unique name="unique_useName">
			<xs:selector xpath="use"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:unique name="unique_standardprojectStageName">
			<xs:selector xpath="standardPhase"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:unique name="unique_regionType">
			<xs:selector xpath="region"/>
			<xs:field xpath="@type"/>
		</xs:unique>
		<xs:unique name="unique_constructionEntityName">
			<xs:selector xpath="constructionEntity"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:unique name="unique_actorName">
			<xs:selector xpath="actor"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:unique name="unique_referenceFullcitation">
			<xs:selector xpath="reference"/>
			<xs:field xpath="@fullCitation"/>
		</xs:unique>
		<xs:unique name="unique_userDefinedPropertyName">
			<xs:selector xpath="userDefinedProperty"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:key name="key_businessRuleId">
			<xs:selector xpath="busuinessRule"/>
			<xs:field xpath="@id"/>
		</xs:key>
		<xs:unique name="unique_businessRuleName">
			<xs:selector xpath="businessRule"/>
			<xs:field xpath="@name"/>
		</xs:unique>
		<xs:keyref name="keyref_associatedBusinessRules" refer="key_businessRuleId">
			<xs:selector xpath="./constraint"/>
			<xs:field xpath="@associatedBusinessRule"/>
		</xs:keyref>
	</xs:element>
	<!-- Classification -->
	<xs:element name="classification">
		<xs:complexType>
			<xs:attribute name="id" type="xs:string" use="required"/>
			<xs:attribute name="name" type="xs:string" use="required"/>
			<xs:attribute name="version" type="xs:string" use="optional"/>
			<xs:attribute name="publicationYear" type="xs:gYear" use="optional"/>
		</xs:complexType>
	</xs:element>
	<!-- Outcomes -->
	<xs:element name="outcomes">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Information Requirements -->
	<xs:element name="informationRequirements">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="description" minOccurs="1" maxOccurs="unbounded"/>
				<xs:element ref="associatedEr" minOccurs="0" maxOccurs="unbounded"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Description -->
	<xs:element name="description">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="image" minOccurs="0" maxOccurs="unbounded"/>
			</xs:sequence>
			<xs:attribute name="title" type="xs:string" use="optional"/>
		</xs:complexType>
	</xs:element>
	<!-- Image -->
	<xs:element name="image">
		<xs:complexType>
			<xs:attribute name="caption" type="xs:string" use="required"/>
			<xs:attribute name="filePath" type="xs:string" use="required"/>
		</xs:complexType>
	</xs:element>
</xs:schema>

<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:idm="https://standards.buildingsmart.org/IDM/idmXML/0.2" xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:include schemaLocation="specId.xsd"/>
	<xs:include schemaLocation="authoring.xsd"/>
	<xs:include schemaLocation="uc.xsd"/>
	<xs:include schemaLocation="businessContextMap.xsd"/>
	<xs:element name="er">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="specId" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="authoring" minOccurs="1" maxOccurs="1"/>
				<xs:element name="constraint" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
						<xs:attribute name="associatedInformationUnit" use="optional"/>
						<xs:attribute name="associatedBusinessRule" use="optional"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="correspondingMvd" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="basis" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
<!--ISO 29481-3 Clause 10. An ER shall not be empty and shall have at least one information unit or a sub-ER. -->
				<xs:choice minOccours="1" maxOccurs="unbounded">
				    <xs:element ref="informationUnit"/>
				    <xs:element name="subEr">
			        	<xs:complexType>
				            <xs:sequence>
				                <xs:element ref="er"/>
				            </xs:sequence>
				        </xs:complexType>
				    </xs:element>
				</xs:choice>>
<!--ISO 29481-3 Clause 10. An ER shall not be empty and shall have at least one information unit or a sub-ER. -->		
		</xs:complexType>
		<xs:key name="key_erGuid">
			<xs:selector xpath="./specId"/>
			<xs:field xpath="@guid"/>
		</xs:key>
		<xs:key name="key_informationUnitId">
			<xs:selector xpath="./informationUnit"/>
			<xs:field xpath="@id"/>
		</xs:key>
		<xs:key name="key_constraint">
			<xs:selector xpath="./constraint"/>
			<xs:field xpath="@id"/>
		</xs:key>
		<xs:keyref name="keyref_associatedInformationUnit" refer="key_informationUnitId">
			<xs:selector xpath="./constraint"/>
			<xs:field xpath="@associatedInformationUnit"/>
		</xs:keyref>
		<xs:keyref name="keyref_associatedEr" refer="key_erGuid">
			<xs:selector xpath="./associatedEr"/>
			<xs:field xpath="associatedEr"/>
		</xs:keyref>
	</xs:element>
	<!-- Information Unit -->
	<xs:element name="informationUnit">
		<xs:complexType>
			<xs:sequence>
				<xs:element name="examples" minOccurs="0" maxOccurs="1">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
				<xs:element name="correspondingExternalElement" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
						</xs:sequence>
						<xs:attribute name="basis" type="xs:string" use="required"/>
						<xs:attribute name="name" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="subInformationUnit" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence minOccurs="0" maxOccurs="unbounded">
							<xs:element ref="informationUnit"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
			<xs:attribute name="id" type="xs:string" use="required"/>
			<xs:attribute name="name" type="xs:string" use="required"/>
			<xs:attribute name="dataType" type="xs:string" use="required"/>
			<xs:attribute name="isMandatory" type="xs:boolean" use="required"/>
			<xs:attribute name="definition" type="xs:string" use="required"/>
		</xs:complexType>
	</xs:element>
	<xs:element name="associatedEr"/>
</xs:schema>

<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
	<xs:include schemaLocation="specId.xsd"/>
	<xs:include schemaLocation="authoring.xsd"/>
	<xs:include schemaLocation="uc.xsd"/>
	<xs:include schemaLocation="er.xsd"/>
	<xs:element name="businessContextMap">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="specId" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="authoring" minOccurs="1" maxOccurs="1"/>
				<xs:choice minOccurs="1" maxOccurs="unbounded">
					<xs:element ref="pm"/>
					<xs:element ref="im"/>
				</xs:choice>
				<xs:element name="subBusinessContextMap" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="businessContextMap"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Process Map -->
	<xs:element name="pm">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="diagram" minOccurs="1" maxOccurs="1"/>
				<xs:element name="dataObjectAndEr" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="associatedDataObject" minOccurs="1" maxOccurs="1"/>
							<xs:element ref="associatedEr" minOccurs="1" maxOccurs="1"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
				<xs:element name="subPm" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element ref="pm"/>
						</xs:sequence>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Interaction Map -->
	<xs:element name="im">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="diagram" minOccurs="1" maxOccurs="1"/>
				<xs:element ref="tm" minOccurs="1" maxOccurs="unbounded"/>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Transaction Map -->
	<xs:element name="tm">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="diagram" minOccurs="1" maxOccurs="1"/>
				<xs:element name="messageAndEr" minOccurs="0" maxOccurs="unbounded">
					<xs:complexType>
						<xs:sequence>
							<xs:element name="associatedMessage" minOccurs="1" maxOccurs="1"/>
							<xs:element ref="associatedEr" minOccurs="1" maxOccurs="1"/>
						</xs:sequence>
						<xs:attribute name="id" type="xs:string" use="required"/>
					</xs:complexType>
				</xs:element>
			</xs:sequence>
		</xs:complexType>
	</xs:element>
	<!-- Diagram -->
	<xs:element name="diagram">
		<xs:complexType>
			<xs:sequence>
				<xs:element ref="description" minOccurs="0" maxOccurs="unbounded"/>
			</xs:sequence>
			<xs:attribute name="id" type="xs:string" use="required"/>
			<xs:attribute name="name" type="xs:string" use="required"/>
			<xs:attribute name="notation" type="xs:string" use="required"/>
			<xs:attribute name="diagramFilePath" type="xs:string" use="required"/>
			<xs:attribute name="imageFilePath" type="xs:string" use="optional"/>
		</xs:complexType>
	</xs:element>
</xs:schema>

