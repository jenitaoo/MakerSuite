import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import App from './App';
import { setupChunkErrorHandler } from './utils/chunkErrorHandler';
import './index.css';

const queryClient = new QueryClient();

// Setup chunk error handling FIRST, before anything else
setupChunkErrorHandler();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);