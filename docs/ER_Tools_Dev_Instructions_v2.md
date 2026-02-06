ER-First Architecture: UI Design & Development Checklist

## Core Concept
The ER-first architecture uses erHierarchy as the single source of truth for all Exchange Requirements, replacing the old dataObjectErMap approach. BPMN Data Objects can optionally be associated with ERs via dataObjectErMap.

## Three-Pane Design
Pane	Location	Purpose
ER Hierarchy	ContentPane (left sidebar)	Navigation - shows full ER tree structure
Individual ER	ERPanel (center/right)	Shows selected ER's content (IUs, Sub-ERs)
Detail Panel	Bottom of ERPanel	Edit details of clicked item (ER, Sub-ER, or IU)

## Design Rules
## Rule 1: ER Hierarchy as Navigation
The ER Hierarchy in ContentPane shows the complete tree of all ERs
Clicking an ER in the hierarchy changes which ER is displayed in the Individual ER pane
This is the only way to change which ER is being viewed/edited
## Rule 2: Single Top-Level ER (Root ER)
Only ONE top-level ER is allowed in erHierarchy
All other ERs must be nested as Sub-ERs
On import, if multiple top-level ERs exist, prompt users to select one as the root ER and the others are consolidated under the selected root ER or create a new top-level ER named as "er_" + ShortTitle of the IDM specification and consolidate the others as sub-ERs under the new top-level ER. The hierarchy of the ERs should be preserved.
If multiple top-level ERs are created by placing multiple data objects in the BPMN diagram, prompt users to select one as the root ER and the others are consolidated under the selected root ER or create a new top-level ER named as "er_" + ShortTitle of the IDM specification and consolidate the others as sub-ERs under the new top-level ER.
Users can switch the top-level ER by outdenting a second-level ER. This action triggers a prompt:
"Do you want to make '[ER Name]' the new Root ER?"
- **Option A: New Root (Dissolve Old)**: The old root is deleted. Its children (excluding the new root) are promoted/merged as children of the new root.
- **Option B: New Root (Keep Old)**: The old root becomes a sub-ER of the new root.
- **Cancel**: The outdent action is cancelled.
## Rule 3: Individual ER Pane Shows Selected ER's Tree
Displays the currently selected ER in the ER Hierarchy pane and its contents:
Information Units (IUs)
Sub-ERs (and their IUs/Sub-ERs recursively)
Title shows "Individual ER" with the selected ER's name
## Rule 4: Clicking in Individual ER Pane Does NOT Change Displayed ER
Clicking an item (ER, Sub-ER, or IU) in the Individual ER pane:
✅ Shows that item's details in the bottom Detail Panel
❌ Does NOT navigate to a different ER (no drill-down)
Users can only change the displayed ER via the ER Hierarchy
## Rule 5: Detail Panel Shows Clicked Item
When any row is clicked in Individual ER pane, its details appear in the bottom panel
Works for: Root ER, Sub-ERs, Information Units
Enables editing of the selected item's properties
## Rule 6: Top-Level ER Editable
The top-level (root) ER can be clicked in ER Hierarchy
Its details appear in the Detail Panel for editing
Users can specify name, description, etc.
## Rule 7: Sub-ER Adding#
When "+ER" is clicked in the Individual ER pane, Sub-ERs can be added from:
Current IDM - Select from existing ERs (Move operation: moves ER from current location to here)
Import erXML - Import from external erXML file
Added Sub-ERs become children of the currently selected ER in the Individual ER pane. 
The details of the added Sub-ERs are displayed in the Detail Panel for editing.

Data Structures

// Source of truth
erHierarchy = [
  {
    id: 'root-er-id',
    name: 'Root ER',
    description: '...',
    informationUnits: [...],
    subERs: [
      {
        id: 'sub-er-1',
        name: 'Sub-ER 1',
        informationUnits: [...],
        subERs: [...]  // Recursive
      }
    ]
  }
  // Only ONE top-level ER allowed (Rule 2)
]

// Optional BPMN association
dataObjectErMap = {
  'DataObject_xyz': 'er-id-123'  // Maps BPMN element to ER
}

## Key Callbacks
Callback	Purpose
onSelectER(erId)	Change which ER is displayed (ER Hierarchy only)
onUpdateER(erId, updatedData)	Update an ER's data
onAddER()	Add new root ER (blocked if one exists)
onDeleteER(erId)	Delete an ER
onIndent(erId)	Make ER a sub-ER of sibling above
onOutdent(erId)	Promote sub-ER (intercepted if targeting level-2 ER to trigger Root Switch)

## Empty States
State	Message
No ER selected	"No ER selected" / "Select an ER from the ER Hierarchy"
ER selected but empty	"ER is empty" / "Add Information Units using the toolbar"
No ERs in project	"No ERs in project"

## Implementation Checklist
 erHierarchy as source of truth
 Single top-level ER enforcement (Rule 2)
 consolidateErHierarchy() for imports
 ER Hierarchy navigation in ContentPane
 Individual ER pane shows selected ER's tree
 Click in Individual ER → Detail Panel only (no drill-down)
 Top-level ER clickable and editable
 Sub-ER adding from current IDM (using allERsFlat)
 Sub-ER adding via erXML import
 Updated empty state messages
 Header title "Individual ER", 
