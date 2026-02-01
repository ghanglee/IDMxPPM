import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/app.css';

// bpmn-js CSS - try/catch로 감싸서 에러 방지
try {
  await import('bpmn-js/dist/assets/diagram-js.css');
  await import('bpmn-js/dist/assets/bpmn-js.css');
  await import('bpmn-js/dist/assets/bpmn-font/css/bpmn.css');
} catch (e) {
  console.warn('bpmn-js CSS not loaded:', e);
}

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
