import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

// Sin React.StrictMode: en modo desarrollo (npm run dev) hacía que cada
// pantalla cargara sus datos dos veces, duplicando las llamadas a TiDB.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
