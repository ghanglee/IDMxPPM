# Screenshots Required for User Manual

This document lists all screenshots needed for the IDMxPPM neo-Seoul User Manual.

## Screenshot Naming Convention

Save all screenshots in: `docs/images/`

Use PNG format for best quality.

---

## Required Screenshots

### 1. Getting Started

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `startup-screen.png` | Startup screen with three options | Launch app fresh (no project open) |
| `startup-screen-dark.png` | Startup screen in dark theme | Same, with dark theme enabled |

### 2. Main Interface

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `main-interface.png` | Full interface with all panels visible | Open sample project, open Specification pane, select a Data Object |
| `vertical-menu.png` | Cropped vertical menu bar | Crop from main interface |
| `theme-toggle.png` | Theme toggle button | Crop top-right corner |

### 3. Creating Projects

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `blank-project.png` | New blank project | Click "Blank Project" on startup |
| `sample-project.png` | Sample project | Click "Sample Project" on startup |
| `new-project-dialog.png` | New project dialog | Click "New Project" when project is open |

### 4. BPMN Editor

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `bpmn-editor.png` | BPMN editor with diagram | Open sample project, show full editor |
| `bpmn-palette.png` | Element palette on left | Crop left side of BPMN editor |
| `bpmn-toolbar.png` | Bottom toolbar | Crop bottom toolbar of BPMN editor |
| `data-object-tooltip.png` | Tooltip on Data Object hover | Hover over a Data Object |
| `data-object-selected.png` | Selected Data Object with ER panel | Double-click a Data Object |

### 5. Content Panes

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `specification-panel.png` | Full Specification panel | Click Specification icon |
| `authors-section.png` | Authors section expanded | Expand Authors section in Specification |
| `use-case-panel.png` | Full Use Case panel | Click Use Case icon |
| `actor-roles.png` | Actor Roles section | Show Actor Roles in Use Case panel |
| `project-phases.png` | Project Phases section | Show Target Project Phases |

### 6. Exchange Requirements

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `er-list.png` | ER list in Content Pane | Click Exchange Req icon |
| `er-panel.png` | Individual ER Panel | Double-click a Data Object |
| `er-panel-full.png` | ER Panel with all sections | Scroll to show complete panel |

### 7. Information Units

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `information-unit.png` | Single Information Unit expanded | Expand an Information Unit |
| `information-unit-nested.png` | Nested sub-units | Add sub-units to show hierarchy |
| `data-type-dropdown.png` | Data type dropdown open | Click data type dropdown |

### 8. External Mapping

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `external-mapping.png` | External Mappings section | Show mappings in an Info Unit |
| `schema-search.png` | Schema search modal | Click search button, enter query |
| `schema-search-results.png` | Search results list | Perform a search for IFC element |
| `other-schema.png` | "Other" schema with custom fields | Select "Other" schema |

### 9. Sub-ERs

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `sub-er-section.png` | Sub-ERs section in ER Panel | Show Sub-ERs section |
| `sub-er-modal.png` | Add Sub-ER modal | Click + in Sub-ERs section |
| `sub-er-current-tab.png` | Current IDM tab | Show Current IDM tab in modal |
| `sub-er-import-tab.png` | Import erXML tab | Switch to Import tab |

### 10. Save & Export

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `export-dialog.png` | Save & Export dialog | Click Save & Export icon |
| `export-formats.png` | Export format options | Show all format radio buttons |
| `export-options.png` | idmXML export options | Select idmXML format |

### 11. Validation

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `validation-panel.png` | Validation results | Click Validate icon |
| `validation-success.png` | Successful validation | Validate complete project |
| `validation-errors.png` | Validation with errors | Validate incomplete project |

### 12. Dialogs

| Filename | Description | How to Capture |
|----------|-------------|----------------|
| `close-confirm-dialog.png` | Close confirmation dialog | Try to close with unsaved changes |
| `about-dialog.png` | About dialog | Click version in status bar |

---

## Screenshot Tips

1. **Resolution**: Capture at 2x resolution if possible for retina displays
2. **Theme**: Capture in dark theme for consistency (or provide both)
3. **Window Size**: Use consistent window size (1280x720 recommended)
4. **Annotations**: Add numbered callouts if needed using image editing software
5. **Cropping**: Crop to show only relevant UI elements for detail shots

## Creating an Images Directory

```bash
mkdir -p docs/images
```

## Image Optimization

After capturing, optimize images for web:

```bash
# Using ImageOptim (macOS) or similar tool
# Or use online tools like TinyPNG
```

---

## Inserting Screenshots into Manual

Replace the comment placeholders in USER_MANUAL.md:

```markdown
<!-- SCREENSHOT: filename.png -->
<!-- Caption: Description -->
```

With actual images:

```markdown
![Description](images/filename.png)
*Caption: Description*
```
