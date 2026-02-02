IDMxPPM (neo-Seoul Edition)

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
	•	Validation Engine
Validate IDM specifications against ISO 29481 requirements and report completeness issues.
	•	idmXML Export and Import
Generate ISO 29481-3 compliant idmXML files with embedded BPMN models.
	•	Cross-Platform Desktop Application
Built with Electron, React, and Vite for macOS and Windows.

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
HTML Document	.html	Self-contained HTML with embedded SVG BPMN (printable)
ZIP Bundle	.zip	Archive with idmXML, BPMN, images, and project data
BPMN Diagram	.bpmn	BPMN 2.0 XML process map
Exchange Requirement	.erxml	Individual ER export/import


⸻

📚 Standards and References
	•	ISO 29481-1: IDM Methodology and Format
	•	ISO 29481-3: IDM Data Schema (idmXML)
	•	ISO 19510: BPMN 2.0 Representation
	•	ISO 19650 Series: Information Management
	•	ISO 12006-3: Taxonomy and Data Dictionaries
	•	ISO 16739-1: Industry Foundation Classes (IFC)

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