import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { removePrototypeSamples } from './cleanPrototypeData';
import { addPrototypeSamples } from './prototypeSamples';
import './styles.css';

removePrototypeSamples();
if (import.meta.env.MODE !== 'test') addPrototypeSamples();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

