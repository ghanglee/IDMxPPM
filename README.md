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
- **Collaborate via server** with optional centralized spec storage and multi-user access

## Features

### BPMN Process Editor
- Full BPMN 2.0 compliant diagram editor powered by [bpmn.io](https://bpmn.io)
- Drag-and-drop element palette with Pools, Lanes, Tasks, Gateways, Data Objects, Message Flows
- Auto-layout for automatic element arrangement
- Zoom controls, pan mode, undo/redo
- Export to SVG, PNG, and BPMN XML

### Exchange Requirement (ER) Editor
- **ER-first architecture** with hierarchical tree table view
- Define ERs with Information Units (IUs) and nested Sub-ERs
- Data type specification (String, Numeric, Boolean, Date, Image, 3D Model, Document, Structured, etc.)
- Mandatory/Optional field indicators per ISO 29481
- Import/Export individual ERs as `.erxml` files
- Auto-save with visual status indicator

### External Element Mapping
- Search and map to IFC 2x3 and IFC 4x3 ADD2
- Integration with buildingSMART Data Dictionary (bSDD) API
- Support for CityGML, UniFormat, OmniClass, MasterFormat
- Exact and semantic matching modes with debounced auto-search
- Custom schema mapping for other standards

### Server Integration (Optional)
- **Self-hosted server** with Express.js + MongoDB backend
- **User authentication** with JWT-based login/registration
- **Role-based access control** (viewer, editor, admin)
- **Server Browser** for searching, filtering, and opening specs from the server
- **Save to Server** for centralized spec storage
- **Docker deployment** with Docker Compose (MongoDB 7 + Node.js 20)

### Standards Compliance

| Standard | Description |
|----------|-------------|
| ISO 29481-1 | IDM Methodology and format |
| ISO 29481-3 | Data schema (idmXML / idmXSD 2.0) |
| ISO/IEC 19510 | Business Process Model and Notation (BPMN) |

### File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| IDM Project | `.idm` | Full project with BPMN diagram, ER hierarchy, and library |
| idmXML | `.xml` | ISO 29481-3 compliant export with embedded BPMN and images (base64) |
| HTML Document | `.html` | Self-contained printable document with BPMN (SVG) and images |
| ZIP Bundle | `.zip` | idmXML + BPMN + images + project data in one archive |
| BPMN Diagram | `.bpmn` | BPMN 2.0 XML format (diagram only) |
| Exchange Requirement | `.erxml` | Individual ER for import/export |
| Server | (cloud) | Save/load specs to/from connected MongoDB server |

### Import Support
- IDM Project (`.idm`), idmXML (`.xml`), ZIP Bundle (`.zip`), BPMN (`.bpmn`)
- **Legacy xPPM** (`.xppm`) format with full data conversion

## Installation

### Pre-built Releases

Download the latest release from the [GitHub Releases page](https://github.com/ghanglee/IDMxPPM/releases):

| Platform | File | Notes |
|----------|------|-------|
| macOS (Apple Silicon) | `IDMxPPM - Neo Seoul-arm64.dmg` | M1/M2/M3/M4 Macs |
| macOS (Intel) | `IDMxPPM - Neo Seoul-x64.dmg` | Intel-based Macs |
| Windows | `IDMxPPM - Neo Seoul Setup x.x.x.exe` | 64-bit Windows |
| Linux | `IDMxPPM - Neo Seoul-x.x.x.AppImage` | 64-bit Linux |

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
npm run build:mac    # macOS (x64 + arm64)
npm run build:win    # Windows (x64)
npm run build:linux  # Linux (AppImage)
npm run build:all    # All platforms
```

### Server Setup (Optional)

```bash
cd server
cp .env.example .env    # Edit with your settings
docker-compose up -d    # Starts MongoDB + API server
```

See [API User Manual](docs/API_User_Manual.md) for detailed server deployment and configuration.

## Quick Start

1. **Launch the application** - You'll see the Startup Screen
2. **Choose a project type**:
   - **Blank Project**: Start with an empty BPMN canvas
   - **Sample Project**: Start with a pre-configured GDE-IDM sample
   - **Open Project**: Load an existing project file
   - **Open from Server**: Browse specs on a connected server
3. **Create your process map** using the BPMN editor
4. **Define Exchange Requirements** by double-clicking Data Objects or using the ER panel
5. **Add Information Units** to specify required data items
6. **Map to external schemas** (IFC, bSDD, etc.)
7. **Export** as idmXML, HTML, ZIP bundle, or save to server

## Documentation

- [User Manual (v1.2.0)](user_manuals/V1.2.0/USER_MANUAL.md) - Comprehensive guide to using IDMxPPM
- [Tutorial Series (v1.2.0)](user_manuals/V1.2.0/IDMxPPM-Tutorials.html) - Step-by-step interactive tutorials
- [API User Manual](docs/API_User_Manual.md) - Server deployment, REST API reference, and configuration

## Technology Stack

### Desktop Client

| Component | Technology |
|-----------|------------|
| Framework | Electron |
| UI Library | React |
| Build Tool | Vite |
| BPMN Editor | bpmn-js (bpmn.io) |
| Styling | CSS Variables (Dark/Light themes) |

### Server Backend (Optional)

| Component | Technology |
|-----------|------------|
| Web Framework | Express.js |
| Database | MongoDB 7 (Mongoose) |
| Authentication | JWT (jsonwebtoken) |
| Containerization | Docker + Docker Compose |

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
