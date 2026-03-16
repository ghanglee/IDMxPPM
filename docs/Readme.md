# IDMxPPM neo-Seoul (v1.3.1)

IDMxPPM is an Information Delivery Manual (IDM) authoring and management tool compliant with ISO 29481. It provides an integrated environment for modeling use cases, defining exchange requirements (ERs), and generating machine-readable IDM specifications.

The neo-Seoul edition focuses on usability, interoperability, and rapid development of IDM specifications through a BPMN-first workflow.

⸻

✨ Key Features
	•	ISO 29481-Compliant IDM Authoring
Create Use Cases, Exchange Requirements, and Information Units aligned with ISO 29481-1 and ISO 29481-3 (idmXML).
	•	BPMN-First Workflow
Use BPMN process maps as the primary workspace and link Data Objects directly to Exchange Requirements.
	•	Exchange Requirement (ER) Editor
Hierarchical ER and Information Unit modeling with mandatory/optional indicators, examples, and constraints.
	•	External Schema Mapping
Map information units to external schemas such as IFC, bSDD, CityGML, and classification systems (UniFormat, OmniClass, MasterFormat).
	•	IDS Export & Import
Export Exchange Requirements as buildingSMART Information Delivery Specification (IDS) files for IFC model validation. Import IDS files to create structured IDM specifications -- each IDS specification becomes a parent IU (dataType: Structured) with property requirements as sub-IUs under a single root ER.
	•	LOIN Export & Import
Bi-directional support for Level of Information Need (EN 17412 / ISO 7817-1). Each LOIN object type maps to a parent IU (dataType: Structured) with properties as sub-IUs, enabling clean round-trip conversion. Supports CEN 17412, EN 17412-3, and ISO 7817-3 schema variants.
	•	Review Mode HTML Export
Self-contained HTML with embedded commenting UI. Reviewers add comments in the browser; import reviewed HTML back to restore comments.
	•	Validation Engine
Validate IDM specifications against ISO 29481 requirements and report completeness issues.
	•	idmXML Export and Import
Generate ISO 29481-3 compliant idmXML files with embedded BPMN models. Supports both idmXSD v1.0 and v2.0 with automatic version detection on import.
	•	Cross-Platform Desktop Application
Built with Electron, React, and Vite for macOS, Windows, and Linux.
	•	Optional Server Backend
Self-hosted Express/MongoDB server for centralized IDM specification storage and multi-user collaboration.

⸻

🏗 System Architecture Overview

IDMxPPM follows a layered architecture:
	•	Desktop Application Layer: Electron-based cross-platform runtime
	•	Frontend UI Layer: React components with Vite bundling and theme support
	•	Process Modeling Module: bpmn-js for BPMN 2.0 process maps
	•	Core IDM Logic Layer: Use case management, ER modeling, validation, idmXML generation
	•	Data Storage Layer: JSON project files, BPMN XML, ERXML, and idmXML outputs

⸻

🚀 Getting Started

Prerequisites
	•	Node.js (>= 18)
	•	npm or yarn

Installation

# Clone the repository
git clone https://github.com/<your-org>/idmxppm.git
cd idmxppm

# Install dependencies
npm install

Development Mode

npm run dev          # Start Vite dev server
npm run electron:dev # Launch Electron app

Build for Distribution

npm run build         # Production build
npm run build:mac     # macOS DMG
npm run build:win     # Windows EXE
npm run build:all     # All platforms


⸻

📁 File Formats

Format	Extension	Description
IDMxPPM Project	.idm	Full project including BPMN, ERs, and ER library
idmXML Specification	.xml	ISO 29481-3 compliant with embedded BPMN and images
IDS	.ids	buildingSMART Information Delivery Specification (import & export)
LOIN XML	.xml	Level of Information Need, EN 17412 / ISO 7817-1 (import & export)
HTML Document	.html	Self-contained HTML with embedded SVG BPMN and optional review mode
ZIP Bundle	.zip	Archive with idmXML, BPMN, images, and project data
Legacy xPPM	.xppm	Import from previous xPPM tool with BPMN and image loading
BPMN Diagram	.bpmn	BPMN 2.0 XML process map
Exchange Requirement	.erxml	Individual ER export/import


⸻

📚 Standards and References
	•	ISO 29481-1: IDM Methodology and Format
	•	ISO 29481-3: IDM Data Schema (idmXML / idmXSD 2.0)
	•	ISO/IEC 19510: BPMN 2.0 Representation
	•	EN 17412 / ISO 7817-1: Level of Information Need (LOIN)
	•	buildingSMART IDS: Information Delivery Specification
	•	ISO 16739-1: Industry Foundation Classes (IFC)
	•	ISO 19650 Series: Information Management
	•	ISO 12006-3: Taxonomy and Data Dictionaries

⸻

🧪 Validation and Compliance

IDMxPPM provides automated validation of:
	•	Required IDM elements (Use Case, ER, Information Units)
	•	Mandatory attributes per ISO 29481
	•	Structural consistency between process maps and ERs

Validation errors and warnings are presented in the Validation Panel but do not block saving.

⸻

🔐 License

IDMxPPM (neo-Seoul Edition) is distributed under a dual-licensing model.

Open Source License (GPL v3)

This software is licensed under the GNU General Public License v3 (GPL v3). You may redistribute and/or modify it under the terms of the GPL v3. Derivative works must also be released under the GPL v3 with source code made available.

Commercial License

If you wish to use IDMxPPM in proprietary or closed-source commercial products, you must obtain a separate commercial license.

For commercial licensing inquiries, custom integrations, or enterprise features, please contact:
Ghang Lee (glee@yonsei.ac.kr)

⸻

👥 Authors and Contributors
	•	Ghang Lee, Yonsei University – Project Lead and Principal Investigator
	•	Contributors are welcome. Please submit pull requests or open issues.

⸻

🤝 Contributing

Contributions are welcome. Please:
	1.	Fork the repository
	2.	Create a feature branch
	3.	Submit a pull request with a clear description

⸻

📌 Citation

If you use IDMxPPM in academic research, please cite:

Lee, G. IDMxPPM: An ISO 29481-Compliant Information Delivery Manual Authoring Tool, Yonsei University, 2026.

⸻

📝 Acknowledgments
	•	bpmn-js by Camunda (MIT License)
	•	buildingSMART International for IDM and IFC standards
	•	The Building Informatics Group (BIG), Yonsei University

⸻

📧 Contact

For questions, collaboration, or research inquiries:
	•	Email: glee@yonsei.ac.kr
	•	Affiliation: Building Informatics Group, Yonsei University