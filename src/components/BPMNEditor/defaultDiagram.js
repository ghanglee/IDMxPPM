// Default BPMN 2.0 diagram for new documents
// Based on ISO 29481-1 Annex C process map structure

export const DEFAULT_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="xPPM-Neo-Seoul"
  exporterVersion="1.0.0">
  
  <bpmn2:collaboration id="Collaboration_IDM">
    <bpmn2:participant id="Participant_Sender" name="Sender" processRef="Process_Sender" />
    <bpmn2:participant id="Participant_Receiver" name="Receiver" processRef="Process_Receiver" />
    <bpmn2:messageFlow id="MessageFlow_1" sourceRef="Task_Send" targetRef="Task_Receive" />
  </bpmn2:collaboration>
  
  <bpmn2:process id="Process_Sender" isExecutable="false">
    <bpmn2:laneSet id="LaneSet_Sender">
      <bpmn2:lane id="Lane_Sender" name="Sender Role">
        <bpmn2:flowNodeRef>StartEvent_1</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Prepare</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Send</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>EndEvent_Sender</bpmn2:flowNodeRef>
      </bpmn2:lane>
    </bpmn2:laneSet>
    
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
    </bpmn2:task>
    
    <bpmn2:endEvent id="EndEvent_Sender" name="End">
      <bpmn2:incoming>Flow_3</bpmn2:incoming>
    </bpmn2:endEvent>
    
    <bpmn2:dataObjectReference id="DataObject_Exchange" name="Exchange Data" dataObjectRef="DataObject_1" />
    <bpmn2:dataObject id="DataObject_1" />
    
    <bpmn2:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_Prepare" />
    <bpmn2:sequenceFlow id="Flow_2" sourceRef="Task_Prepare" targetRef="Task_Send" />
    <bpmn2:sequenceFlow id="Flow_3" sourceRef="Task_Send" targetRef="EndEvent_Sender" />
  </bpmn2:process>
  
  <bpmn2:process id="Process_Receiver" isExecutable="false">
    <bpmn2:laneSet id="LaneSet_Receiver">
      <bpmn2:lane id="Lane_Receiver" name="Receiver Role">
        <bpmn2:flowNodeRef>Task_Receive</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>Task_Process</bpmn2:flowNodeRef>
        <bpmn2:flowNodeRef>EndEvent_Receiver</bpmn2:flowNodeRef>
      </bpmn2:lane>
    </bpmn2:laneSet>
    
    <bpmn2:task id="Task_Receive" name="Receive Information">
      <bpmn2:outgoing>Flow_4</bpmn2:outgoing>
    </bpmn2:task>
    
    <bpmn2:task id="Task_Process" name="Process Data">
      <bpmn2:incoming>Flow_4</bpmn2:incoming>
      <bpmn2:outgoing>Flow_5</bpmn2:outgoing>
    </bpmn2:task>
    
    <bpmn2:endEvent id="EndEvent_Receiver" name="Complete">
      <bpmn2:incoming>Flow_5</bpmn2:incoming>
    </bpmn2:endEvent>
    
    <bpmn2:sequenceFlow id="Flow_4" sourceRef="Task_Receive" targetRef="Task_Process" />
    <bpmn2:sequenceFlow id="Flow_5" sourceRef="Task_Process" targetRef="EndEvent_Receiver" />
  </bpmn2:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_IDM">
      
      <!-- Sender Pool -->
      <bpmndi:BPMNShape id="Participant_Sender_di" bpmnElement="Participant_Sender" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="700" height="200" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Lane_Sender_di" bpmnElement="Lane_Sender" isHorizontal="true">
        <dc:Bounds x="150" y="60" width="670" height="200" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="192" y="142" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="198" y="185" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Prepare_di" bpmnElement="Task_Prepare">
        <dc:Bounds x="290" y="120" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Send_di" bpmnElement="Task_Send">
        <dc:Bounds x="460" y="120" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="EndEvent_Sender_di" bpmnElement="EndEvent_Sender">
        <dc:Bounds x="632" y="142" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="640" y="185" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="DataObject_Exchange_di" bpmnElement="DataObject_Exchange">
        <dc:Bounds x="322" y="210" width="36" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="302" y="267" width="76" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      
      <!-- Receiver Pool -->
      <bpmndi:BPMNShape id="Participant_Receiver_di" bpmnElement="Participant_Receiver" isHorizontal="true">
        <dc:Bounds x="120" y="310" width="700" height="200" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Lane_Receiver_di" bpmnElement="Lane_Receiver" isHorizontal="true">
        <dc:Bounds x="150" y="310" width="670" height="200" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Receive_di" bpmnElement="Task_Receive">
        <dc:Bounds x="290" y="370" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Process_di" bpmnElement="Task_Process">
        <dc:Bounds x="460" y="370" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="EndEvent_Receiver_di" bpmnElement="EndEvent_Receiver">
        <dc:Bounds x="632" y="392" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="622" y="435" width="47" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      
      <!-- Edges -->
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="228" y="160" />
        <di:waypoint x="290" y="160" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="390" y="160" />
        <di:waypoint x="460" y="160" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3">
        <di:waypoint x="560" y="160" />
        <di:waypoint x="632" y="160" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4">
        <di:waypoint x="390" y="410" />
        <di:waypoint x="460" y="410" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5">
        <di:waypoint x="560" y="410" />
        <di:waypoint x="632" y="410" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="MessageFlow_1_di" bpmnElement="MessageFlow_1">
        <di:waypoint x="510" y="200" />
        <di:waypoint x="510" y="285" />
        <di:waypoint x="340" y="285" />
        <di:waypoint x="340" y="370" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="DataOutputAssociation_1_di" bpmnElement="DataOutputAssociation_1">
        <di:waypoint x="340" y="200" />
        <di:waypoint x="340" y="210" />
      </bpmndi:BPMNEdge>
      
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

// Empty diagram with single pool
export const EMPTY_DIAGRAM = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions 
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn"
  exporter="xPPM-Neo-Seoul"
  exporterVersion="1.0.0">
  
  <bpmn2:collaboration id="Collaboration_1">
    <bpmn2:participant id="Participant_1" name="Process" processRef="Process_1" />
  </bpmn2:collaboration>
  
  <bpmn2:process id="Process_1" isExecutable="false">
    <bpmn2:startEvent id="StartEvent_1" name="Start" />
  </bpmn2:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1">
      <bpmndi:BPMNShape id="Participant_1_di" bpmnElement="Participant_1" isHorizontal="true">
        <dc:Bounds x="120" y="60" width="600" height="250" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="192" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="198" y="205" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;
