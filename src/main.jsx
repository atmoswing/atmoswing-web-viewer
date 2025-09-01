import { StrictMode } from 'react'
import {createRoot} from 'react-dom/client'
import {ConfigProvider} from './contexts/ConfigContext.jsx';
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ConfigProvider>
            <App/>
        </ConfigProvider>
    </StrictMode>,
)
