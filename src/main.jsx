import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import './index.css';

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL is not defined. Please check your environment variables.");
}
const convex = new ConvexReactClient(convexUrl || "");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
      <Analytics />
    </ConvexProvider>
  </React.StrictMode>,
);
