import React from 'react';
import {
  NewProjectIcon,
  OpenIcon,
  SpecificationIcon,
  UseCaseIcon,
  ExchangeReqIcon,
  ValidateIcon,
  SaveExportIcon,
  CloseIcon,
  HelpIcon,
  ServerIcon
} from '../icons';
import './VerticalMenuBar.css';

/**
 * VerticalMenuBar Component
 * Left-side navigation with progressive disclosure
 */
const VerticalMenuBar = ({
  isProjectOpen = false,
  activePane = null,
  onMenuItemClick,
  onNewProject,
  onOpenProject,
  onValidate,
  onSaveExport,
  onCloseProject,
  onHelp,
  onAbout,
  onServerConnect,
  isServerConnected = false
}) => {
  const menuItems = [
    {
      id: 'new',
      label: 'New Project',
      icon: NewProjectIcon,
      onClick: onNewProject,
      showAlways: true,
      hideWhenOpen: true
    },
    {
      id: 'open',
      label: 'Open Project',
      icon: OpenIcon,
      onClick: onOpenProject,
      showAlways: true,
      hideWhenOpen: true
    },
    {
      id: 'specification',
      label: 'IDM Header',
      icon: SpecificationIcon,
      onClick: () => onMenuItemClick?.('specification'),
      showWhenOpen: true
    },
    {
      id: 'useCase',
      label: 'Use Case',
      icon: UseCaseIcon,
      onClick: () => onMenuItemClick?.('useCase'),
      showWhenOpen: true
    },
    {
      id: 'exchangeReq',
      label: 'Exchange Requirements',
      icon: ExchangeReqIcon,
      onClick: () => onMenuItemClick?.('exchangeReq'),
      showWhenOpen: true
    },
    {
      id: 'validate',
      label: 'Validate',
      icon: ValidateIcon,
      onClick: onValidate,
      showWhenOpen: true,
      isAction: true
    },
    {
      id: 'saveExport',
      label: 'Save & Export',
      icon: SaveExportIcon,
      onClick: onSaveExport,
      showWhenOpen: true,
      isAction: true
    },
    {
      id: 'closeProject',
      label: 'Close Project',
      icon: CloseIcon,
      onClick: onCloseProject,
      showWhenOpen: true,
      isAction: true,
      isDanger: true
    },
    {
      id: 'help',
      label: 'Help / User Manual',
      icon: HelpIcon,
      onClick: onHelp,
      showAlways: true,
      isAction: true
    }
  ];

  const visibleItems = menuItems.filter(item => {
    if (item.showAlways && !item.hideWhenOpen) return true;
    if (item.showAlways && item.hideWhenOpen && !isProjectOpen) return true;
    if (item.showWhenOpen && isProjectOpen) return true;
    return false;
  });

  return (
    <div className="vertical-menu-bar">
      <div className="vertical-menu-items">
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activePane === item.id;

          return (
            <button
              key={item.id}
              className={`vertical-menu-btn ${isActive ? 'active' : ''} ${item.isAction ? 'action' : ''} ${item.isDanger ? 'danger' : ''}`}
              onClick={item.onClick}
              title={item.label}
            >
              <Icon size={22} />
            </button>
          );
        })}
      </div>

      <div className="vertical-menu-spacer" />

      {/* Server connection button */}
      <div className="vertical-menu-server">
        <button
          className={`vertical-menu-btn action ${isServerConnected ? 'server-connected' : ''}`}
          onClick={onServerConnect}
          title={isServerConnected ? 'Connected to Server' : 'Connect to Server'}
        >
          <ServerIcon size={22} />
          {isServerConnected && <span className="server-dot" />}
        </button>
      </div>

      {/* Footer - IDMxPPM branding */}
      <div className="vertical-menu-footer">
        <button
          className="idmxppm-link"
          onClick={onAbout}
          title="IDMxPPM is powered by BIG Yonsei (Building Informatics Group at Yonsei University, Seoul, Korea)."
        >
          <span>IDM</span>
          <span>xPPM</span>
        </button>
      </div>
    </div>
  );
};

export default VerticalMenuBar;
