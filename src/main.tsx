import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { removePrototypeSamples } from './cleanPrototypeData';
import './styles.css';

removePrototypeSamples();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

