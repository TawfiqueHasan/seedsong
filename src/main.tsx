import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './styles/app.css';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
