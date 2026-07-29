import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Chart } from 'chart.js';
import { UnitProvider } from './contexts/UnitContext';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import App from './App.jsx';
import './App.css';

Chart.defaults.font.family = "'Vazirmatn', system-ui, sans-serif";

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UnitProvider>
        <App />
      </UnitProvider>
    </BrowserRouter>
  </React.StrictMode>
);
