import { createRoot } from 'react-dom/client';
import { Ai8 } from './components/ai8';
import './style.css';

const div = document.createElement('div');
div.id = '__root_ai8';
document.body.appendChild(div);

const rootContainer = document.querySelector('#__root_ai8');
if (!rootContainer) throw new Error("Can't find ai8 root element");
const root = createRoot(rootContainer);
root.render(<Ai8 />);
