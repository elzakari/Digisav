import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import './i18n'
import { subscribeAppEvents } from '@/lib/appEvents'

const queryClient = new QueryClient()

subscribeAppEvents((event) => {
  if (event.type === 'groups_changed') {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey as any[];
        const key0 = k?.[0];
        return (
          key0 === 'my-groups' ||
          key0 === 'member-stats' ||
          key0 === 'group' ||
          key0 === 'group-dashboard' ||
          key0 === 'group-transactions' ||
          key0 === 'group-contributions' ||
          key0 === 'group-stats' ||
          key0 === 'sysadmin-groups'
        );
      },
    });
  }

  if (event.type === 'group_recordings_changed') {
    queryClient.invalidateQueries({ queryKey: ['group-dashboard', event.groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-transactions', event.groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-contributions', event.groupId] });
    queryClient.invalidateQueries({ queryKey: ['group-stats', event.groupId] });
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
