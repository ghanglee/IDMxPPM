/**
 * Sample Project Data - GDE-IDM (Generic Data Exchange IDM)
 * Based on the GDE-IDM_sample.idm file
 */

export const SAMPLE_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="xPPM-Neo-Seoul" exporterVersion="1.0.0">
  <bpmn2:collaboration id="Collaboration_IDM">
    <bpmn2:participant id="Participant_Sender" name="Sender" processRef="Process_Sender" />
    <bpmn2:participant id="Participant_Receiver" name="Receiver" processRef="Process_Receiver" />
    <bpmn2:messageFlow id="MessageFlow_1" sourceRef="Task_Send" targetRef="Task_Receive" />
    <bpmn2:messageFlow id="Flow_0odbo6e" sourceRef="Activity_1g80d75" targetRef="Task_Prepare" />
  </bpmn2:collaboration>
  <bpmn2:process id="Process_Sender" isExecutable="false">
    <bpmn2:laneSet id="LaneSet_Sender">
      <bpmn2:lane id="Lane_Sender">
        <bpmn2:flowNodeRef>StartEvent_1</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Prepare</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Send</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>EndEvent_Sender</bpmn2:flowNodeRef>
      </bpmn2:lane>
    </bpmn2:laneSet>
    <bpmn2:dataObjectReference id="DataObject_Exchange" name="er_PrepData" dataObjectRef="DataObject_1" />
    <bpmn2:dataObject id="DataObject_1" />
    <bpmn2:dataObjectReference id="DataObjectReference_1owrwqd" name="er_SubmissionPackage" dataObjectRef="DataObject_15cfbh7" />
    <bpmn2:dataObject id="DataObject_15cfbh7" />
    <bpmn2:startEvent id="StartEvent_1" name="Start">
      <bpmn2:outgoing>Flow_1</bpmn2:outgoing>
    </bpmn2:startEvent>
    <bpmn2:task id="Task_Prepare" name="Prepare Data">
      <bpmn2:incoming>Flow_1</bpmn2:incoming>
      <bpmn2:outgoing>Flow_2</bpmn2:outgoing>
      <bpmn2:dataOutputAssociation id="DataOutputAssociation_1">
        <bpmn2:targetRef>DataObject_Exchange</bpmn2:targetRef>
      </bpmn2:dataOutputAssociation>
    </bpmn2:task>
    <bpmn2:task id="Task_Send" name="Send Information">
      <bpmn2:incoming>Flow_2</bpmn2:incoming>
      <bpmn2:outgoing>Flow_3</bpmn2:outgoing>
      <bpmn2:dataOutputAssociation id="DataOutputAssociation_1roc3ll">
        <bpmn2:targetRef>DataObjectReference_1owrwqd</bpmn2:targetRef>
      </bpmn2:dataOutputAssociation>
    </bpmn2:task>
    <bpmn2:endEvent id="EndEvent_Sender" name="End">
      <bpmn2:incoming>Flow_3</bpmn2:incoming>
    </bpmn2:endEvent>
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_Prepare" />
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Task_Prepare" targetRef="Task_Send" />
    <bpmn2:sequenceFlow id="Flow_3" sourceRef="Task_Send" targetRef="EndEvent_Sender" />
  </bpmn2:process>
  <bpmn2:process id="Process_Receiver" isExecutable="false">
    <bpmn2:laneSet id="LaneSet_Receiver">
      <bpmn2:lane id="Lane_Receiver">
        <bpmn2:flowNodeRef>Gateway_0dex9fn</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Process</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>EndEvent_Receiver</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Activity_1g80d75</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Receive</bpmn2:flowNodeRef>
      </bpmn2:lane>
    </bpmn2:laneSet>
    <bpmn2:sequenceFlow id="Flow_07uckrj" name="Disapproved" sourceRef="Gateway_0dex9fn" targetRef="Activity_1g80d75" />
    <bpmn2:exclusiveGateway id="Gateway_0dex9fn" name="Verify Information">
      <bpmn2:incoming>Flow_04c11lq</bpmn2:incoming>
      <bpmn2:outgoing>Flow_1ozcnf0</bpmn2:outgoing>
      <bpmn2:outgoing>Flow_07uckrj</bpmn2:outgoing>
    </bpmn2:exclusiveGateway>
    <bpmn2:task id="Task_Process" name="Use Data">
      <bpmn2:incoming>Flow_1ozcnf0</bpmn2:incoming>
      <bpmn2:outgoing>Flow_5</bpmn2:outgoing>
    </bpmn2:task>
    <bpmn2:endEvent id="EndEvent_Receiver" name="Complete">
      <bpmn2:incoming>Flow_5</bpmn2:incoming>
    </bpmn2:endEvent>
    <bpmn2:sequenceFlow id="Flow_04c11lq" sourceRef="Task_Receive" targetRef="Gateway_0dex9fn" />
    <bpmn2:sequenceFlow id="Flow_1ozcnf0" name="Approved" sourceRef="Gateway_0dex9fn" targetRef="Task_Process" />
    <bpmn2:sequenceFlow id="Flow_5" sourceRef="Task_Process" targetRef="EndEvent_Receiver" />
    <bpmn2:task id="Activity_1g80d75" name="Request Revision">
      <bpmn2:incoming>Flow_07uckrj</bpmn2:incoming>
    </bpmn2:task>
    <bpmn2:task id="Task_Receive" name="Receive Information">
      <bpmn2:outgoing>Flow_04c11lq</bpmn2:outgoing>
    </bpmn2:task>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_IDM">
      <bpmndi:BPMNShape id="Participant_Sender_di" bpmnElement="Participant_Sender" isHorizontal="true">
        <dc:Bounds x="120" y="50" width="700" height="200" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Sender_di" bpmnElement="Lane_Sender" isHorizontal="true">
        <dc:Bounds x="150" y="50" width="670" height="200" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DataObject_Exchange_di" bpmnElement="DataObject_Exchange">
        <dc:Bounds x="402" y="175" width="36" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="389" y="232" width="63" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="DataObjectReference_1owrwqd_di" bpmnElement="DataObjectReference_1owrwqd">
        <dc:Bounds x="572" y="175" width="36" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="547" y="232" width="87" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="192" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="198" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Prepare_di" bpmnElement="Task_Prepare">
        <dc:Bounds x="290" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Send_di" bpmnElement="Task_Send">
        <dc:Bounds x="460" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Sender_di" bpmnElement="EndEvent_Sender">
        <dc:Bounds x="632" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="640" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="228" y="120" />
        <di:waypoint x="290" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="390" y="120" />
        <di:waypoint x="460" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="560" y="120" />
        <di:waypoint x="632" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Participant_Receiver_di" bpmnElement="Participant_Receiver" isHorizontal="true">
        <dc:Bounds x="120" y="350" width="700" height="270" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Lane_Receiver_di" bpmnElement="Lane_Receiver" isHorizontal="true">
        <dc:Bounds x="150" y="350" width="670" height="270" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_0dex9fn_di" bpmnElement="Gateway_0dex9fn" isMarkerVisible="true">
        <dc:Bounds x="375" y="515" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="357" y="575" width="86" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Process_di" bpmnElement="Task_Process">
        <dc:Bounds x="490" y="500" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Receiver_di" bpmnElement="EndEvent_Receiver">
        <dc:Bounds x="632" y="522" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="622" y="565" width="48" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1g80d75_di" bpmnElement="Activity_1g80d75">
        <dc:Bounds x="210" y="500" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Receive_di" bpmnElement="Task_Receive">
        <dc:Bounds x="350" y="370" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_07uckrj_di" bpmnElement="Flow_07uckrj">
        <di:waypoint x="375" y="540" />
        <di:waypoint x="310" y="540" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="316" y="493" width="62" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_04c11lq_di" bpmnElement="Flow_04c11lq">
        <di:waypoint x="400" y="450" />
        <di:waypoint x="400" y="515" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_1ozcnf0_di" bpmnElement="Flow_1ozcnf0">
        <di:waypoint x="425" y="540" />
        <di:waypoint x="490" y="540" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="431" y="522" width="48" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="590" y="540" />
        <di:waypoint x="632" y="540" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="DataOutputAssociation_1_di" bpmnElement="DataOutputAssociation_1">
        <di:waypoint x="380" y="160" />
        <di:waypoint x="402" y="182" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="DataOutputAssociation_1roc3ll_di" bpmnElement="DataOutputAssociation_1roc3ll">
        <di:waypoint x="550" y="160" />
        <di:waypoint x="572" y="184" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="MessageFlow_1_di" bpmnElement="MessageFlow_1">
        <di:waypoint x="510" y="160" />
        <di:waypoint x="510" y="280" />
        <di:waypoint x="400" y="280" />
        <di:waypoint x="400" y="370" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_0odbo6e_di" bpmnElement="Flow_0odbo6e">
        <di:waypoint x="260" y="500" />
        <di:waypoint x="260" y="280" />
        <di:waypoint x="340" y="280" />
        <di:waypoint x="340" y="160" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

export const SAMPLE_HEADER_DATA = {
  title: "Information Delivery Manual for the Generic Data Exchange",
  shortTitle: "GDE-IDM",
  authors: [
    { type: 'person', givenName: 'Sample', familyName: 'Author', affiliation: 'Sample Organization' }
  ],
  organization: "",
  version: "1.0",
  creationDate: new Date().toISOString().split('T')[0],
  status: "NP",
  language: "EN",
  regions: ['international'],  // Array of region codes (ISO 3166-1)
  region: "international",     // Legacy single value for backward compatibility
  projectStages: [],
  projectStagesIso: [],
  projectStagesAia: [],
  projectStagesRiba: [],
  useCategories: [],
  uses: [],
  summary: `The Generic Data Exchange Information Delivery Manual (GDE-IDM) aims to define a standardized, domain-agnostic framework for specifying information exchange requirements across the lifecycle of built assets and related digital systems. It provides a structured method to describe what information is required, when it is required, and in what form it should be delivered, independent of specific software platforms, data schemas, or organizational practices.

The GDE-IDM is intended to support interoperability, automation, and consistent information management by enabling clear and machine-interpretable definitions of exchange requirements for diverse applications, including design, construction, operation, and digital twin environments.

This manual specifies:
- A generic conceptual model for defining information delivery milestones, exchange requirements, and submission packages.
- Standardized terminology and classification of data types, information containers, and exchange structures.
- Process-independent mechanisms for describing information requirements, including geometry, attributes, documents, multimedia, and structured data.
- Guidance for mapping generic exchange requirements to external schemas and standards (e.g., IFC, BPMN, SysML, JSON-based APIs).
- Recommendations for implementation in software systems, automated workflows, and AI-driven information management applications.

The GDE-IDM is applicable to stakeholders involved in the specification, generation, validation, and exchange of digital information in the architecture, engineering, construction, and operation (AECO) domain, as well as related domains requiring structured information interoperability.

This manual does not prescribe specific software tools, proprietary data formats, or organizational processes. Instead, it provides a neutral and extensible framework that can be adopted and adapted by organizations, standards bodies, and software vendors to support consistent and interoperable data exchange.`,
  revisionHistory: [],
  contributors: [],
  copyright: "",
  keywords: [],
  relatedStandards: [],
  externalReferences: [],
  objectives: "Define exchange requirements for BIM processes",
  benefits: "",
  limitations: "",
  actors: "",
  preconditions: "",
  postconditions: "",
  triggeringEvents: "",
  requiredCapabilities: "",
  complianceCriteria: "",
  actorsList: [
    // Pools (Participants) represent groups/organizations for external exchanges
    // Lanes within Pools represent individuals for internal exchanges
    { id: "actor-Participant_Sender", name: "Sender", role: "", actorType: "group", bpmnId: "Participant_Sender", bpmnShapeName: "Sender", subActors: [] },
    { id: "actor-Participant_Receiver", name: "Receiver", role: "", actorType: "group", bpmnId: "Participant_Receiver", bpmnShapeName: "Receiver", subActors: [] }
  ]
};

export const SAMPLE_ER_DATA_MAP = {
  "DataObject_Exchange": {
    id: "ER-PrepData",
    name: "er_PrepData",
    description: "The information required for data preparation prior to processing or exchange, including data cleaning, transformation, normalization, and validation inputs.",
    informationUnits: [
      {
        id: "iu-3d-model",
        name: "3D model",
        dataType: "3D Model",
        isMandatory: true,
        definition: "A BIM model is a digital representation of the physical and functional characteristics of a built asset, serving as a shared knowledge resource for information about the facility and forming a reliable basis for decisions throughout its lifecycle.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [],
        subInformationUnits: []
      },
      {
        id: "iu-checklist",
        name: "submission check list",
        dataType: "Structured (list, graph, table, JSON)",
        isMandatory: true,
        definition: "A submission checklist is a structured list of required items, criteria, and verification steps used to ensure that all necessary information, documents, and data have been prepared and included before a formal submission.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [],
        subInformationUnits: []
      }
    ],
    subERs: []
  },
  "DataObjectReference_1owrwqd": {
    id: "ER-SubmissionPackage",
    name: "er_SubmissionPackage",
    description: "The collection of information, documents, and model data required for a formal submission at a defined project milestone, including BIM models, associated metadata, reports, and supporting documentation to satisfy contractual, regulatory, or organizational requirements.",
    informationUnits: [
      {
        id: "iu-document",
        name: "document",
        dataType: "Document (PDF, DOCX, etc.)",
        isMandatory: true,
        definition: "In this IDM, document-based information containers are limited to PDF and DOC formats.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [],
        subInformationUnits: []
      },
      {
        id: "iu-cad-drawings",
        name: "CAD drawings",
        dataType: "2D Vector Drawing",
        isMandatory: true,
        definition: "CAD drawings are digital graphical representations of design information created using computer-aided design (CAD) software, typically comprising 2D or 3D geometric elements, annotations, and symbols used to document, communicate, and analyze design intent.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [],
        subInformationUnits: []
      },
      {
        id: "iu-project-data",
        name: "project data",
        dataType: "Structured (list, graph, table, JSON)",
        isMandatory: true,
        definition: "Project data is information that describes, identifies, and contextualizes a project, including administrative, organizational, temporal, and classification information used to manage, reference, and interpret project-related information.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [
          { id: "cee-1", basis: "IFC 4x3 ADD2", name: "IfcProject" }
        ],
        subInformationUnits: []
      },
      {
        id: "iu-arch-program",
        name: "architectural program",
        dataType: "Structured (list, graph, table, JSON)",
        isMandatory: false,
        definition: "An architectural program is a structured specification of required spaces and their attributes, typically including space names, functions, and target floor areas, used to guide the design of a building.",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [
          { id: "cee-2", basis: "IFC 4x3 ADD2", name: "IfcSpace" }
        ],
        subInformationUnits: []
      }
    ],
    subERs: []
  }
};

export const SAMPLE_ER_HIERARCHY = [
  {
    id: "er-sample-root",
    guid: "db387697-ab4c-4827-ab96-f3ecd3969570",
    name: "er_GDE-IDM",
    description: "IDM for the generic data exchange",
    informationUnits: [
      {
        id: "iu-project-definition",
        name: "project definition",
        dataType: "String / Text",
        isMandatory: true,
        definition: "project definition",
        examples: "",
        exampleImages: [],
        correspondingExternalElements: [
          {
            id: "cee-root-1",
            basis: "IFC 4x3 ADD2",
            name: "IfcProject",
            description: "Root element of IFC model",
            uri: "",
            category: "Project"
          }
        ],
        subInformationUnits: []
      }
    ],
    subERs: [
      {
        ...SAMPLE_ER_DATA_MAP["DataObject_Exchange"],
        guid: "ER-PrepData"
      },
      {
        ...SAMPLE_ER_DATA_MAP["DataObjectReference_1owrwqd"],
        guid: "ER-SubmissionPackage",
        subERs: [
          {
            id: "sub-er-prepdata-copy",
            name: "er_PrepData",
            description: SAMPLE_ER_DATA_MAP["DataObject_Exchange"].description,
            informationUnits: SAMPLE_ER_DATA_MAP["DataObject_Exchange"].informationUnits,
            linkedTo: "DataObject_Exchange",
            sourceERId: "ER-PrepData"
          }
        ]
      }
    ]
  }
];

export const SAMPLE_DATA_OBJECT_ER_MAP = {
  "DataObject_Exchange": "ER-PrepData",
  "DataObjectReference_1owrwqd": "ER-SubmissionPackage"
};

export const SAMPLE_ER_LIBRARY = [
  {
    id: "ER-PrepData",
    name: "er_PrepData",
    description: "The information required for data preparation prior to processing or exchange, including data cleaning, transformation, normalization, and validation inputs.",
    informationUnits: SAMPLE_ER_DATA_MAP["DataObject_Exchange"].informationUnits,
    subERs: []
  },
  {
    id: "ER-SubmissionPackage",
    name: "er_SubmissionPackage",
    description: "The collection of information, documents, and model data required for a formal submission at a defined project milestone, including BIM models, associated metadata, reports, and supporting documentation to satisfy contractual, regulatory, or organizational requirements.",
    informationUnits: SAMPLE_ER_DATA_MAP["DataObjectReference_1owrwqd"].informationUnits,
    subERs: []
  }
];

export default {
  SAMPLE_BPMN_XML,
  SAMPLE_HEADER_DATA,
  SAMPLE_ER_DATA_MAP,
  SAMPLE_ER_HIERARCHY,
  SAMPLE_DATA_OBJECT_ER_MAP,
  SAMPLE_ER_LIBRARY
};
