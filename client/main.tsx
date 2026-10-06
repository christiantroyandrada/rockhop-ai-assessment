import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ReadingList } from './books/ReadingList.tsx';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root missing');
createRoot(root).render(
  <StrictMode>
    <ReadingList />
  </StrictMode>,
);
