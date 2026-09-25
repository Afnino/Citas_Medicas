import { ClerkProvider } from '@clerk/react'
import { esES } from '@clerk/localizations'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/schedule/styles.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider localization={esES} afterSignOutUrl="/">
      <MantineProvider>
        <App />
      </MantineProvider>
    </ClerkProvider>
  </StrictMode>,
)
