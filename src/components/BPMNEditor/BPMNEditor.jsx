import React, { useEffect, useRef, useState, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { DEFAULT_DIAGRAM, EMPTY_DIAGRAM } from './defaultDiagram';
import {
  UndoIcon,
  RedoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomFitIcon,
  PanIcon,
  ExportSVGIcon,
  ExportBPMNIcon,
  ImportBPMNIcon,
  ExportPNGIcon,
  AutoLayoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '../icons';
import './BPMNEditor.css';

/**
 * BPMN Editor Component
 *
 * ISO 29481-1 Annex C compliant BPMN 2.0 editor
 * Uses bpmn-js for full BPMN modeling capabilities
 * Toolbar contains BPMN-specific tools only (zoom, export, etc.)
 *
 * @param {Object} props
 * @param {string} props.xml - Initial BPMN XML to load
 * @param {function} props.onDataObjectSelect - Callback when Data Object is selected (for ER editing)
 * @param {function} props.onNewDataObject - Callback when a new Data Object is created (for ER-first workflow)
 * @param {function} props.onChange - Callback when diagram changes
 * @param {function} props.onReady - Callback when modeler is ready
 * @param {function} props.onImportBpmn - Callback when BPMN is imported (receives new XML content)
 * @param {function} props.onToggleCollapse - Callback to toggle BPMN visibility
 * @param {boolean} props.canCollapse - Whether the collapse button should be shown
 */
const BPMNEditor = ({
  xml,
  onDataObjectSelect,
  onNewDataObject,
  onChange,
  onReady,
  onImportBpmn,
  onToggleCollapse,
  canCollapse = false
}) => {
  const containerRef = useRef(null);
  const paletteContainerRef = useRef(null);
  const modelerRef = useRef(null);
  const isImportingRef = useRef(false); // Track when importing to prevent modal during import
  const [isReady, setIsReady] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanMode, setIsPanMode] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  // Check when container is ready with dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const checkDimensions = () => {
      const container = containerRef.current;
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        setContainerReady(true);
      }
    };

    // Check immediately
    checkDimensions();

    // Also check after a short delay (for layout settling)
    const timer = setTimeout(checkDimensions, 50);

    // Use ResizeObserver for reliable dimension detection
    const resizeObserver = new ResizeObserver(checkDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  // Initialize bpmn-js modeler
  useEffect(() => {
    if (!containerRef.current || !containerReady) return;

    const container = containerRef.current;

    // Create modeler instance
    // Note: keyboard binding is now implicit in bpmn-js v18+
    const modeler = new BpmnModeler({
      container: container
    });

    modelerRef.current = modeler;

    // Import diagram
    const loadDiagram = async () => {
      try {
        // Set flag to prevent onNewDataObject during import
        isImportingRef.current = true;

        // Determine which diagram to load initially
        let diagramXml;
        if (xml === 'EMPTY' || xml === 'BLANK' || xml === null || xml === undefined) {
          // BLANK = new blank project, EMPTY = fallback empty state
          diagramXml = EMPTY_DIAGRAM;
        } else if (xml === 'DEFAULT') {
          // DEFAULT = sample project with two pools
          diagramXml = DEFAULT_DIAGRAM;
        } else {
          diagramXml = xml;
        }
        const { warnings } = await modeler.importXML(diagramXml);

        // Reset flag after import completes
        isImportingRef.current = false;

        if (warnings.length) {
          console.warn('BPMN import warnings:', warnings);
        }

        // Fit diagram to viewport
        const canvas = modeler.get('canvas');
        canvas.zoom('fit-viewport');

        // Move palette to separate container for proper layout separation
        setTimeout(() => {
          if (paletteContainerRef.current && container) {
            const palette = container.querySelector('.djs-palette');
            if (palette && palette.parentNode !== paletteContainerRef.current) {
              paletteContainerRef.current.appendChild(palette);
            }
          }
        }, 50);

        setIsReady(true);
        setError(null);

        if (onReady) {
          onReady(modeler);
        }
      } catch (err) {
        console.error('Failed to import BPMN diagram:', err);
        setError(err.message);
        isImportingRef.current = false; // Reset flag on error
      }
    };

    loadDiagram();

    // Setup event listeners
    const eventBus = modeler.get('eventBus');

    // Selection changed
    eventBus.on('selection.changed', (e) => {
      const selected = e.newSelection[0];
      setSelectedElement(selected || null);

      // Check if Data Object is selected
      if (selected && (
        selected.type === 'bpmn:DataObjectReference' ||
        selected.type === 'bpmn:DataObject' ||
        selected.type === 'bpmn:DataStoreReference'
      )) {
        if (onDataObjectSelect) {
          const businessObject = selected.businessObject;
          onDataObjectSelect({
            id: selected.id,
            type: selected.type,
            name: businessObject?.name || '',
            element: selected
          });
        }
      }
    });

    // Double-click on Data Object
    eventBus.on('element.dblclick', (e) => {
      const element = e.element;
      if (element.type === 'bpmn:DataObjectReference' ||
          element.type === 'bpmn:DataObject' ||
          element.type === 'bpmn:DataStoreReference') {
        if (onDataObjectSelect) {
          const businessObject = element.businessObject;
          onDataObjectSelect({
            id: element.id,
            type: element.type,
            name: businessObject?.name || '',
            element: element,
            forceOpen: true
          });
        }
        setTooltip({ visible: false, x: 0, y: 0, text: '' });
      }
    });

    // Hover tooltip for Data Objects
    eventBus.on('element.hover', (e) => {
      const element = e.element;
      if (element.type === 'bpmn:DataObjectReference' ||
          element.type === 'bpmn:DataObject' ||
          element.type === 'bpmn:DataStoreReference') {
        const canvas = modeler.get('canvas');
        const viewbox = canvas.viewbox();

        // Calculate tooltip position based on element position
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const scale = viewbox.scale || 1;
          const x = (element.x - viewbox.x) * scale + containerRect.left + (element.width * scale) / 2;
          const y = (element.y - viewbox.y) * scale + containerRect.top - 10;

          setTooltip({
            visible: true,
            x,
            y,
            text: 'Double-click to specify this Exchange Requirement'
          });
        }
      }
    });

    eventBus.on('element.out', (e) => {
      const element = e.element;
      if (element.type === 'bpmn:DataObjectReference' ||
          element.type === 'bpmn:DataObject' ||
          element.type === 'bpmn:DataStoreReference') {
        setTooltip({ visible: false, x: 0, y: 0, text: '' });
      }
    });

    // New Data Object created (for ER-first workflow)
    eventBus.on('shape.added', (e) => {
      const element = e.element;
      // Only trigger for Data Objects created from palette (not during import)
      if (isImportingRef.current) return; // Skip during import

      if (onNewDataObject && (
        element.type === 'bpmn:DataObjectReference' ||
        element.type === 'bpmn:DataObject' ||
        element.type === 'bpmn:DataStoreReference'
      )) {
        // Small delay to ensure the element is fully added
        setTimeout(() => {
          const businessObject = element.businessObject;
          onNewDataObject({
            id: element.id,
            type: element.type,
            name: businessObject?.name || '',
            element: element
          });
        }, 100);
      }
    });

    // Diagram changed
    eventBus.on('commandStack.changed', async () => {
      if (onChange) {
        try {
          const { xml: newXml } = await modeler.saveXML({ format: true });
          onChange(newXml);
        } catch (err) {
          console.error('Failed to export BPMN XML:', err);
        }
      }
    });

    // Cleanup
    return () => {
      modeler.destroy();
    };
  }, [containerReady]); // Run when container is ready

  // Respond to xml prop changes (including close project)
  useEffect(() => {
    if (!modelerRef.current || !isReady) return;

    const loadNewDiagram = async () => {
      try {
        // Set flag to prevent onNewDataObject during import
        isImportingRef.current = true;

        // Determine which diagram to load
        let diagramXml;
        if (xml === 'EMPTY' || xml === 'BLANK' || xml === null || xml === undefined) {
          // Empty canvas for closed project, new blank project, or initial state
          diagramXml = EMPTY_DIAGRAM;
        } else if (xml === 'DEFAULT') {
          // Default sample diagram for new project
          diagramXml = DEFAULT_DIAGRAM;
        } else {
          // Custom diagram provided
          diagramXml = xml;
        }

        const { warnings } = await modelerRef.current.importXML(diagramXml);

        // Reset flag after import completes
        isImportingRef.current = false;

        if (warnings.length) {
          console.warn('BPMN import warnings:', warnings);
        }

        // Fit diagram to viewport
        const canvas = modelerRef.current.get('canvas');
        canvas.zoom('fit-viewport');
        setZoomLevel(canvas.zoom());
        setError(null);
      } catch (err) {
        console.error('Failed to import BPMN diagram:', err);
        setError(err.message);
        isImportingRef.current = false; // Reset flag on error
      }
    };

    loadNewDiagram();
  }, [xml, isReady]);

  // Expose modeler methods via ref callback
  useEffect(() => {
    if (!modelerRef.current || !isReady) return;

    // Register keyboard listeners for Electron menu commands
    if (window.electronAPI) {
      window.electronAPI.onMenuUndo(() => {
        const commandStack = modelerRef.current.get('commandStack');
        commandStack.undo();
      });

      window.electronAPI.onMenuRedo(() => {
        const commandStack = modelerRef.current.get('commandStack');
        commandStack.redo();
      });

      window.electronAPI.onMenuZoomIn(() => {
        const canvas = modelerRef.current.get('canvas');
        canvas.zoom(canvas.zoom() * 1.2);
      });

      window.electronAPI.onMenuZoomOut(() => {
        const canvas = modelerRef.current.get('canvas');
        canvas.zoom(canvas.zoom() / 1.2);
      });

      window.electronAPI.onMenuZoomFit(() => {
        const canvas = modelerRef.current.get('canvas');
        canvas.zoom('fit-viewport');
      });

      window.electronAPI.onMenuExportBPMN(async () => {
        await exportBPMN();
      });
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeAllListeners('menu-undo');
        window.electronAPI.removeAllListeners('menu-redo');
        window.electronAPI.removeAllListeners('menu-zoom-in');
        window.electronAPI.removeAllListeners('menu-zoom-out');
        window.electronAPI.removeAllListeners('menu-zoom-fit');
        window.electronAPI.removeAllListeners('menu-export-bpmn');
      }
    };
  }, [isReady]);

  // Export BPMN XML
  const exportBPMN = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      
      if (window.electronAPI) {
        await window.electronAPI.exportBPMN({
          content: xml,
          defaultName: 'process-map.bpmn'
        });
      } else {
        // Fallback for browser
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'process-map.bpmn';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export BPMN failed:', err);
    }
  }, []);

  // Import BPMN XML
  const importBPMN = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.xml';

    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();

        // Validate that it's a BPMN file
        if (!content.includes('bpmn:definitions') && !content.includes('definitions')) {
          alert('The selected file does not appear to be a valid BPMN file.');
          return;
        }

        // Call the parent callback to update the BPMN XML
        if (onImportBpmn) {
          onImportBpmn(content);
        }
      } catch (err) {
        console.error('Import BPMN failed:', err);
        alert('Failed to import BPMN file: ' + err.message);
      }
    };

    input.click();
  }, [onImportBpmn]);

  // Export SVG
  const exportSVG = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const { svg } = await modelerRef.current.saveSVG();

      if (window.electronAPI) {
        await window.electronAPI.exportSVG({
          content: svg,
          defaultName: 'process-map.svg'
        });
      } else {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'process-map.svg';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export SVG failed:', err);
    }
  }, []);

  // Export PNG
  const exportPNG = useCallback(async () => {
    if (!modelerRef.current) return;

    try {
      const { svg } = await modelerRef.current.saveSVG();

      // Create canvas and convert SVG to PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Convert SVG to base64 data URL
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = async () => {
        // Set canvas dimensions with 2x scale for better quality
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        // Get PNG data
        canvas.toBlob(async (blob) => {
          if (window.electronAPI) {
            // Convert blob to base64 for Electron
            const reader = new FileReader();
            reader.onload = async () => {
              const base64 = reader.result.split(',')[1];
              await window.electronAPI.saveFile({
                content: base64,
                defaultName: 'process-map.png',
                encoding: 'base64',
                filters: [{ name: 'PNG Image', extensions: ['png'] }]
              });
            };
            reader.readAsDataURL(blob);
          } else {
            // Browser fallback
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'process-map.png';
            a.click();
            URL.revokeObjectURL(downloadUrl);
          }
        }, 'image/png');

        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error('Export PNG failed:', err);
    }
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      const newZoom = canvas.zoom() * 1.2;
      canvas.zoom(newZoom);
      setZoomLevel(newZoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      const newZoom = canvas.zoom() / 1.2;
      canvas.zoom(newZoom);
      setZoomLevel(newZoom);
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      canvas.zoom('fit-viewport');
      setZoomLevel(canvas.zoom());
    }
  }, []);

  const handleZoomChange = useCallback((e) => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      const newZoom = parseFloat(e.target.value);
      canvas.zoom(newZoom);
      setZoomLevel(newZoom);
    }
  }, []);

  // Toggle pan mode
  const togglePanMode = useCallback(() => {
    setIsPanMode(prev => !prev);
    // Pan mode is handled by bpmn-js internally with space+drag
    // This is just a visual indicator
  }, []);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    const commandStack = modelerRef.current?.get('commandStack');
    if (commandStack) commandStack.undo();
  }, []);

  const handleRedo = useCallback(() => {
    const commandStack = modelerRef.current?.get('commandStack');
    if (commandStack) commandStack.redo();
  }, []);

  // Auto Layout - Arrange elements to avoid overlapping
  const handleAutoLayout = useCallback(() => {
    if (!modelerRef.current) return;

    try {
      const elementRegistry = modelerRef.current.get('elementRegistry');
      const modeling = modelerRef.current.get('modeling');

      // Get all shape elements (not connections, labels, or root elements)
      const allElements = elementRegistry.getAll();
      const shapes = allElements.filter(el => {
        // Skip root elements, connections, labels, and containers
        if (!el.parent) return false;
        if (el.type === 'bpmn:Process') return false;
        if (el.type === 'bpmn:Collaboration') return false;
        if (el.type === 'bpmn:Participant') return false;
        if (el.type === 'bpmn:Lane') return false;
        if (el.waypoints) return false; // connections have waypoints
        if (el.labelTarget) return false; // labels
        if (!el.width || !el.height) return false;
        return true;
      });

      if (shapes.length < 2) {
        console.log('Auto-layout: Not enough elements to arrange');
        return;
      }

      console.log('Auto-layout: Processing', shapes.length, 'elements');

      // Group shapes by their immediate parent
      const shapesByParent = new Map();
      shapes.forEach(shape => {
        const parentId = shape.parent?.id || 'root';
        if (!shapesByParent.has(parentId)) {
          shapesByParent.set(parentId, []);
        }
        shapesByParent.get(parentId).push(shape);
      });

      const padding = 30; // Minimum gap between elements
      let totalMoves = 0;

      // Helper: Check if two rectangles overlap (with padding)
      const checkOverlap = (pos1, pos2) => {
        const left1 = pos1.x - padding / 2;
        const right1 = pos1.x + pos1.width + padding / 2;
        const top1 = pos1.y - padding / 2;
        const bottom1 = pos1.y + pos1.height + padding / 2;

        const left2 = pos2.x - padding / 2;
        const right2 = pos2.x + pos2.width + padding / 2;
        const top2 = pos2.y - padding / 2;
        const bottom2 = pos2.y + pos2.height + padding / 2;

        // Check if rectangles overlap
        if (left1 >= right2 || right1 <= left2 || top1 >= bottom2 || bottom1 <= top2) {
          return null; // No overlap
        }

        // Calculate overlap amounts
        const overlapX = Math.min(right1, right2) - Math.max(left1, left2);
        const overlapY = Math.min(bottom1, bottom2) - Math.max(top1, top2);

        return { overlapX, overlapY };
      };

      // Process each parent group separately
      shapesByParent.forEach((groupShapes, parentId) => {
        if (groupShapes.length < 2) return;

        // Create position map for this group
        const positions = new Map();
        groupShapes.forEach(shape => {
          positions.set(shape.id, {
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            shape: shape
          });
        });

        // Iteratively resolve overlaps within this group
        const maxIterations = 50;
        for (let iteration = 0; iteration < maxIterations; iteration++) {
          let hasOverlap = false;

          for (let i = 0; i < groupShapes.length; i++) {
            for (let j = i + 1; j < groupShapes.length; j++) {
              const shape1 = groupShapes[i];
              const shape2 = groupShapes[j];
              const pos1 = positions.get(shape1.id);
              const pos2 = positions.get(shape2.id);

              const overlap = checkOverlap(pos1, pos2);
              if (overlap) {
                hasOverlap = true;

                // Move the element that is lower/right (data objects typically)
                // Prefer vertical movement for data objects
                const isDataObj1 = shape1.type.includes('DataObject') || shape1.type.includes('DataStore');
                const isDataObj2 = shape2.type.includes('DataObject') || shape2.type.includes('DataStore');

                if (overlap.overlapX < overlap.overlapY && !isDataObj1 && !isDataObj2) {
                  // Move horizontally
                  const moveX = overlap.overlapX / 2 + 5;
                  if (pos1.x <= pos2.x) {
                    pos2.x += moveX;
                  } else {
                    pos1.x += moveX;
                  }
                } else {
                  // Move vertically - prefer moving data objects down
                  const moveY = overlap.overlapY / 2 + 10;
                  if (isDataObj2 || (!isDataObj1 && pos1.y <= pos2.y)) {
                    pos2.y += moveY;
                  } else {
                    pos1.y += moveY;
                  }
                }
                totalMoves++;
              }
            }
          }

          if (!hasOverlap) {
            console.log('Auto-layout: Group', parentId, 'resolved in', iteration + 1, 'iterations');
            break;
          }
        }

        // Apply the calculated positions for this group
        groupShapes.forEach(shape => {
          const newPos = positions.get(shape.id);
          const deltaX = Math.round(newPos.x - shape.x);
          const deltaY = Math.round(newPos.y - shape.y);

          if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
            modeling.moveElements([shape], { x: deltaX, y: deltaY });
          }
        });
      });

      console.log('Auto-layout: Applied', totalMoves, 'position adjustments');

      // Fit to viewport after layout
      const canvas = modelerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
      setZoomLevel(canvas.zoom());

    } catch (err) {
      console.error('Auto-layout failed:', err);
    }
  }, []);

  // Get selected element info for display
  const getElementInfo = () => {
    if (!selectedElement) return null;
    
    const type = selectedElement.type.replace('bpmn:', '');
    const name = selectedElement.businessObject?.name || selectedElement.id;
    const isDataObject = ['DataObjectReference', 'DataObject', 'DataStoreReference'].includes(type);
    
    return { type, name, isDataObject };
  };

  const elementInfo = getElementInfo();

  return (
    <div className="bpmn-editor">
      {/* Collapse/Expand Toggle Button */}
      {canCollapse && onToggleCollapse && (
        <button
          className="bpmn-collapse-btn"
          onClick={onToggleCollapse}
          title="Hide BPMN Editor"
        >
          <ChevronLeftIcon size={16} />
        </button>
      )}

      {/* Data Object Tooltip */}
      {tooltip.visible && (
        <div
          className="data-object-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bpmn-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Workspace container with palette and canvas separated */}
      <div className="bpmn-workspace">
        {/* Palette container - bpmn-js palette will be moved here */}
        <div className="bpmn-palette-container" ref={paletteContainerRef} />

        {/* Canvas container - bpmn.io watermark must remain visible (license requirement) */}
        <div className="bpmn-canvas" ref={containerRef} />
      </div>

      {/* Footer toolbar with BPMN-specific tools */}
      <div className="bpmn-footer-toolbar">
        {/* Edit tools */}
        <div className="footer-group">
          <button className="footer-btn" onClick={handleUndo} title="Undo (Ctrl+Z)">
            <UndoIcon size={18} />
          </button>
          <button className="footer-btn" onClick={handleRedo} title="Redo (Ctrl+Shift+Z)">
            <RedoIcon size={18} />
          </button>
        </div>

        <div className="footer-divider" />

        {/* Zoom controls */}
        <div className="footer-group footer-zoom-group">
          <button className="footer-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOutIcon size={18} />
          </button>
          <input
            type="range"
            className="zoom-slider"
            min="0.2"
            max="3"
            step="0.1"
            value={zoomLevel}
            onChange={handleZoomChange}
            title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          />
          <button className="footer-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomInIcon size={18} />
          </button>
          <button className="footer-btn" onClick={handleZoomFit} title="Fit to View">
            <ZoomFitIcon size={18} />
          </button>
          <span className="zoom-label">{Math.round(zoomLevel * 100)}%</span>
        </div>

        <div className="footer-divider" />

        {/* Pan mode */}
        <div className="footer-group">
          <button
            className={`footer-btn ${isPanMode ? 'active' : ''}`}
            onClick={togglePanMode}
            title="Pan Mode (Space+Drag)"
          >
            <PanIcon size={18} />
          </button>
        </div>

        <div className="footer-divider" />

        {/* Auto Layout */}
        <div className="footer-group">
          <button
            className="footer-btn"
            onClick={handleAutoLayout}
            title="Auto Layout - Arrange elements to avoid overlapping"
          >
            <AutoLayoutIcon size={18} />
          </button>
        </div>

        <div className="footer-spacer" />

        {/* Import button */}
        {onImportBpmn && (
          <>
            <div className="footer-group">
              <button className="footer-btn footer-btn-import" onClick={importBPMN} title="Import BPMN Diagram (replace current diagram)">
                <ImportBPMNIcon size={18} />
                <span>Import BPMN</span>
              </button>
            </div>
            <div className="footer-divider" />
          </>
        )}

        {/* Export buttons */}
        <div className="footer-group footer-group-export">
          <span className="footer-group-label">Export:</span>
          <button className="footer-btn footer-btn-export" onClick={exportSVG} title="Export SVG">
            <ExportSVGIcon size={18} />
            <span>SVG</span>
          </button>
          <button className="footer-btn footer-btn-export" onClick={exportBPMN} title="Export BPMN XML">
            <ExportBPMNIcon size={18} />
            <span>BPMN</span>
          </button>
          <button className="footer-btn footer-btn-export" onClick={exportPNG} title="Export PNG Image">
            <ExportPNGIcon size={18} />
            <span>PNG</span>
          </button>
        </div>

        <div className="footer-divider" />

        {/* Attribution (license requirement) */}
        <div className="footer-attribution">
          <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">
            bpmn.io
          </a>
        </div>
      </div>
    </div>
  );
};

export default React.memo(BPMNEditor);
