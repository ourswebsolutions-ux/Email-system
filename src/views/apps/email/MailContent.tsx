// React Imports
import { useState } from 'react'
import type { MouseEvent } from 'react'

// Types Imports
import { useSession } from 'next-auth/react'

import type { AppDispatch } from '@/redux-store'
import type { EmailState } from '@/types/apps/emailTypes'

// Slice Imports
import { moveEmailsToFolder, deleteTrashEmails, toggleReadEmails, toggleStarEmail } from '@/redux-store/slices/email'

// Component Imports
import MailContentSearch from './MailContentSearch'
import MailContentActions from './MailContentActions'
import MailContentList from './MailContentList'
import MailDetails from './MailDetails'

type Props = {
  folder?: string
  label?: string
  store: EmailState
  dispatch: AppDispatch
  uniqueLabels: string[]
  isInitialMount: boolean
  setSidebarOpen: (value: boolean) => void
  isBelowLgScreen: boolean
  isBelowMdScreen: boolean
  isBelowSmScreen: boolean
  setBackdropOpen: (value: boolean) => void
  handleDelete: (uids: number[]) => void
  handlePremanentDelete: (uids: number[]) => void
  setReload: (value: boolean) => void
  reload: (value: boolean) => void
  handleRead: (uids: number[]) => void
  handleFetchData: () => void
  searchTerm : string
  setSearchTerm : string
}

const MailContent = (props: Props) => {
  // Props
  const {
    folder,
    label,
    store,
    dispatch,
    uniqueLabels,
    isInitialMount,
    setSidebarOpen,
    isBelowLgScreen,
    isBelowMdScreen,
    isBelowSmScreen,
    setBackdropOpen,
    handleDelete,
    handlePremanentDelete,
    setReload,
    reload,
    handleRead,
    handleFetchData,
    setSearchTerm,
    searchTerm
  } = props

  // States
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)


  // Vars
  const emails = store.filteredEmails ?? []
  const currentEmail = emails.find(email => email.id === store.currentEmailId)
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.roles?.some((r: any) => r.role.name === 'super-admin') ?? false

  const areFilteredEmailsNone =
    emails.length === 0 ||
    emails.filter(
      email =>
        email?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email?.to?.some(user =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).length === 0
  // Action for deleting single email
  const handleSingleEmailDelete = (e: MouseEvent, emailId: number) => {
    e.stopPropagation()
    const ids = [emailId]

    if (folder === 'trash') handlePremanentDelete(ids)
    else handleDelete(ids)

    setSelectedEmails(prev => {
      const next = new Set(prev)

      next.delete(emailId)

      return next
    })
  }


  // Toggle read status for single email
  const handleToggleIsReadStatus = async (e: MouseEvent, id: number) => {
    e.stopPropagation()
    handleRead([id])
    dispatch(toggleReadEmails({ emailIds: [id] }))
  }

  // Toggle star for single email
  const handleToggleStarEmail = (e: MouseEvent, id: number) => {
    e.stopPropagation()
    dispatch(toggleStarEmail({ emailId: id }))
  }

  return (
    <div className='flex flex-col items-center justify-center is-full bs-full relative overflow-hidden bg-backgroundPaper'>
      <MailContentSearch
        isBelowScreen={isBelowMdScreen}
        searchTerm={searchTerm}
        setSidebarOpen={setSidebarOpen}
        setBackdropOpen={setBackdropOpen}
        setSearchTerm={setSearchTerm}
      />

      <MailContentActions
        areFilteredEmailsNone={areFilteredEmailsNone}
        selectedEmails={selectedEmails}
        setSelectedEmails={setSelectedEmails}
        emails={emails}
        folder={folder}
        label={label}
        uniqueLabels={uniqueLabels}
        setReload={setReload}
        dispatch={dispatch}
        handleDelete={handleDelete}
        handlePremanentDelete={handlePremanentDelete}
        handleRead={handleRead}
        handleFetchData={handleFetchData}
        isSuperAdmin={isSuperAdmin}
      />


      <MailContentList
        isInitialMount={isInitialMount}
        isBelowSmScreen={isBelowSmScreen}
        isBelowLgScreen={isBelowLgScreen}
        reload={reload}
        handleDelete={handleDelete}
        areFilteredEmailsNone={areFilteredEmailsNone}
        searchTerm={searchTerm}
        selectedEmails={selectedEmails}
        dispatch={dispatch}
        store={store}
        emails={emails}
        folder={folder}
        setSelectedEmails={setSelectedEmails}
        setDrawerOpen={setDrawerOpen}
        handleToggleStarEmail={handleToggleStarEmail}
        handleSingleEmailDelete={handleSingleEmailDelete}
        handleToggleIsReadStatus={handleToggleIsReadStatus}
        handlePremanentDelete={handlePremanentDelete}
        handleRead={handleRead}
        isSuperAdmin={isSuperAdmin}
      />
      <MailDetails
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        isBelowSmScreen={isBelowSmScreen}
        isBelowLgScreen={isBelowLgScreen}
        currentEmail={currentEmail}
        emails={emails}
        folder={folder}
        label={label}
        dispatch={dispatch}
        handleSingleEmailDelete={handleSingleEmailDelete}
        handleToggleIsReadStatus={handleToggleIsReadStatus}
        handleToggleStarEmail={handleToggleStarEmail}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  )
}

export default MailContent
