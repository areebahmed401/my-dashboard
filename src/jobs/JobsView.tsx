import { useState } from 'react'
import DomainView from '../DomainView'
import Segmented from '../components/Segmented'
import ApplicationsView from './ApplicationsView'
import DocumentsView from './DocumentsView'

type Tab = 'applications' | 'docs' | 'tasks'
const SLUG: Record<Tab, string> = { applications: '', docs: '/docs', tasks: '/tasks' }

// The sub-tab lives in the hash (#job-search, #job-search/docs, #job-search/tasks)
function tabFromHash(): Tab {
  const sub = window.location.hash.split('/')[1]
  return sub === 'docs' || sub === 'tasks' ? sub : 'applications'
}

export default function JobsView() {
  const [tab, setTabState] = useState<Tab>(tabFromHash)

  // replaceState fires no hashchange, so no scroll jump and no history entry per tab
  const setTab = (t: Tab) => {
    window.history.replaceState(null, '', `#job-search${SLUG[t]}`)
    setTabState(t)
  }

  return (
    <div className="mt-4 space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        label="Job search section"
        accent="job-search"
        options={[
          { value: 'applications', label: 'Applications' },
          { value: 'docs', label: 'Documents' },
          { value: 'tasks', label: 'Tasks' },
        ]}
      />
      {tab === 'applications' ? <ApplicationsView /> : tab === 'docs' ? <DocumentsView /> : <DomainView domain="job-search" />}
    </div>
  )
}
