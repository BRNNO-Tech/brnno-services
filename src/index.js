import React from 'react';
import { createRoot } from 'react-dom/client';
import BRNNOMarketplace from './BRNNOMarketplace';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<BRNNOMarketplace />);
