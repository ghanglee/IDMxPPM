# IDMxPPM

**Information Delivery Manual (IDM) Authoring Tool**

*neo-Seoul Edition*

An open-source desktop application for authoring Information Delivery Manuals compliant with ISO 29481-1 (Methodology and format) and ISO 29481-3 (Data schema - idmXML).

## Overview

IDMxPPM (eXtended Process to Product Modeling) enables BIM professionals, standards developers, and researchers to:

- **Define BIM exchange requirements** using BPMN 2.0 process diagrams
- **Specify detailed information requirements** for each data exchange
- **Map requirements to external standards** (IFC, bSDD, CityGML, etc.)
- **Export specifications** in ISO 29481-3 compliant idmXML format

## Features

### BPMN Process Editor
- Full BPMN 2.0 compliant diagram editor powered by [bpmn.io](https://bpmn.io)
- Drag-and-drop element palette
- Pools, Lanes, Tasks, Gateways, Data Objects, Message Flows
- Auto-layout for automatic element arrangement
- Export to SVG, PNG, and BPMN XML

### Exchange Requirement Editor
- Define Exchange Requirements (ERs) by double-clicking Data Objects
- Hierarchical Information Units with sub-units
- Data type specification (String, Numeric, Boolean, Date, 3D Model, Document, etc.)
- Mandatory/Optional field indicators

### External Element Mapping
- Search and map to IFC 2x3, IFC 4x3, IFC 5
- Integration with buildingSMART Data Dictionary (bSDD) API
- Support for CityGML, UniFormat, OmniClass, MasterFormat
- Custom schema mapping for other standards

### Standards Compliance

| Standard | Description |
|----------|-------------|
| ISO 29481-1 | IDM Methodology and format |
| ISO 29481-2 | Interaction framework (BPMN representation) |
| ISO 29481-3 | Data schema (idmXML) |

### File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| IDMxPPM Project | `.idm` / `.json` | Full project with BPMN diagram and all ER data |
| idmXML | `.xml` | ISO 29481-3 compliant export (includes embedded BPMN) |
| BPMN Diagram | `.bpmn` | BPMN 2.0 XML format (diagram only) |
| Exchange Requirement | `.erxml` | Individual ER for import/export |

## Installation

### Pre-built Releases

Download the latest release for your platform:
- **macOS**: `IDMxPPM-x.x.x.dmg`
- **Windows**: `IDMxPPM-x.x.x-setup.exe`

### Build from Source

```bash
# Clone the repository
git clone https://github.com/ghanglee/IDMxPPM.git
cd IDMxPPM

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run build:mac    # macOS
npm run build:win    # Windows
npm run build:all    # Both platforms
```

## Quick Start

1. **Launch the application** - You'll see the Startup Screen
2. **Choose a project type**:
   - **Blank Project**: Start with an empty BPMN canvas
   - **Sample Project**: Start with a pre-configured GDE-IDM sample
   - **Open Project**: Load an existing project file
3. **Create your process map** using the BPMN editor
4. **Define Exchange Requirements** by double-clicking Data Objects
5. **Add Information Units** to specify required data items
6. **Map to external schemas** (IFC, bSDD, etc.)
7. **Export** as idmXML for ISO 29481-3 compliance

## Documentation

- [User Manual](docs/USER_MANUAL.md) - Comprehensive guide to using IDMxPPM

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Electron |
| UI Library | React |
| Build Tool | Vite |
| BPMN Editor | bpmn-js (bpmn.io) |
| Styling | CSS Variables (Dark/Light themes) |

## License

This project is dual-licensed:

### Open Source License

**GNU General Public License v3.0 (GPL-3.0)**

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

See [LICENSE](LICENSE) for the full license text.

### Commercial License

For proprietary use without GPL obligations, a commercial license is available. Contact [glee@yonsei.ac.kr](mailto:glee@yonsei.ac.kr) for licensing inquiries.

## Acknowledgments

- **BPMN Editor**: Powered by [bpmn.io](https://bpmn.io) - Copyright (c) 2014-present Camunda Services GmbH, licensed under the bpmn.io License
- **buildingSMART**: For the bSDD API and IFC standards

## Author

**Ghang Lee**

Building Informatics Group (BIG), Yonsei University, Seoul, Korea

- Website: [big.yonsei.ac.kr](http://big.yonsei.ac.kr/)
- Email: [glee@yonsei.ac.kr](mailto:glee@yonsei.ac.kr)
- GitHub: [github.com/ghanglee](https://github.com/ghanglee)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Issues

If you encounter any issues or have suggestions, please [open an issue](https://github.com/ghanglee/IDMxPPM/issues).

---

*IDMxPPM neo-Seoul Edition - Making IDM authoring accessible and efficient.*
