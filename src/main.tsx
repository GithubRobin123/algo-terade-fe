import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// AG Grid v35+ requires explicit module registration.
ModuleRegistry.registerModules([AllCommunityModule]);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
