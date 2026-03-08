'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// MUI Imports
import { useMediaQuery } from '@mui/material'
import Backdrop from '@mui/material/Backdrop'
import Pagination from '@mui/material/Pagination'
import type { Theme } from '@mui/material/styles'

// Third-party Imports
import classnames from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

// Type Imports
import type { RootState } from '@/redux-store'

// Slice Imports
import { filterEmails, setEmails } from '@/redux-store/slices/email'

// Component Imports
import SidebarLeft from './SidebarLeft'
import MailContent from './MailContent'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'

import { showError, showSuccess } from '@/front-helper'

// Util Imports
import { commonLayoutClasses } from '@layouts/utils/layoutClasses'
import { email } from 'valibot'
import { error } from 'console'

const EmailWrapper = ({ folder = 'inbox', label }: { folder?: string; label?: string }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [backdropOpen, setBackdropOpen] = useState(false)

  // ✅ Pagination State
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [reload, setReload] = useState(false)
  const isInitialMount = useRef(true)
const [searchTerm, setSearchTerm] = useState('')

  const { settings } = useSettings()
  const emailStore = useSelector((state: RootState) => state.emailReducer)
  const dispatch = useDispatch()

  const isBelowLgScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('lg'))
  const isBelowMdScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'))
  const isBelowSmScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'))

  // ✅ Reset page when folder/label changes
  useEffect(() => {
    setPage(1)
  }, [folder, label])

const handleFetchData = () => {
  // Build query params
  const params = new URLSearchParams()
  params.set('folder', folder)
  params.set('page', String(page))

  if (label) params.set('label', label)

  // ✅ New: pass searchTerm to backend
  if (searchTerm) params.set('to', searchTerm)

  // Optionally: implement "from", "to", "subject" filters from separate inputs
  // params.set('from', fromInputValue)
  // params.set('to', toInputValue)
  // params.set('subject', subjectInputValue)

  // Choose API URL depending on folder
  const apiUrl =
    folder === 'trash'
      ? `/api/apps/emails/delete?${params.toString()}` // deleted emails
      : `/api/apps/emails/get?${params.toString()}`    // normal folders

  fetch(apiUrl)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      if (data?.emails) {
        setTotalPages(data.pages || 1)

        const mapped = data.emails.map((e: any) => ({
          id: Number(e.uid) || e.id,
          from: { name: e.fromName || `New Email`, email: e.fromEmail || '', avatar: '' },
          to: [{ name: 'me', email: e.to || '' }],
          subject: e.subject || 'This Email is Empty',
          message: e.body || e.htmlBody || 'No Email ',
          time: e.date || e.createdAt,
          isRead: e.isRead,
          isStarred: e.isStarred,
          labels: e.labels || [],
          folder: e.folder,
          hasAttachment: e.hasAttachment,
          attachments: e.attachments || [],
          replies: [],
          cc: [],
          bcc: []
        }))

        dispatch(setEmails(mapped))
      }
    })
    .catch(() => setReload(false))
}


  // ✅ Fetch Emails With Pagination
 useEffect(() => {
  // Always fetch immediately
  handleFetchData();

  // Only set interval if NOT searching
  if (!searchTerm) {
    const intervalId = setInterval(() => {
      handleFetchData();
    }, 5000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }

  // If searching, return undefined (no interval)
  return;
}, [dispatch, folder, label, page, searchTerm]);
  // ✅ Delete Emails
  const handleDelete = async (uids: number[]) => {
    if (!uids.length) return

    try {
      const res = await fetch('/api/apps/emails/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: uids })
      })

      const data = await res.json()

      if (data.success) {
        showSuccess("Email deleted Successfully")
        dispatch(setEmails(emailStore.emails.filter(e => !uids.includes(Number(e.id)))))
      }

      if (!data.success) {
        showError(data.error ||'Something went wrong')
        dispatch(setEmails(emailStore.emails.filter(e => !uids.includes(Number(e.id)))))
      }


    } catch (err) {
      
      console.error('Delete failed', err)
    }
  }



useEffect(() => {
  setPage(1) // reset page
  handleFetchData()
}, [folder, label, page, searchTerm])


  const handlePremanentDelete = async (uids: number[]) => {
    if (!uids.length) return

    try {
      const res = await fetch('/api/apps/emails/permanent-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIds: uids })
      })

      const data = await res.json()

      if (data.success) {
        showSuccess(" Parmanent Email deleted Successfully")

        dispatch(setEmails(emailStore.emails.filter(e => !uids.includes(Number(e.id)))))
      }
    } catch (err) {
      showError('Delete failed')

      console.error('Delete failed', err)
    }
  }



  const handleRead = async (uids: number[]) => {
    if (!uids.length) return

    try {
      const res = await fetch('/api/apps/emails/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: uids })
      })

      const data = await res.json()

      if (data.success) {
        // showSuccess("Opened")
      }
    } catch (err) {

      console.error('Delete failed', err)
    }
  }


  // Compute labels
  const uniqueLabels = [...new Set(emailStore.emails.flatMap(email => email.labels))]

  useEffect(() => {
    dispatch(filterEmails({ emails: emailStore.emails, folder, label, uniqueLabels }))
  }, [emailStore.emails, folder, label])

  const handleBackdropClick = () => {
    setSidebarOpen(false)
    setBackdropOpen(false)
  }

  useEffect(() => {
    if (isInitialMount.current) isInitialMount.current = false
  }, [])

  useEffect(() => {
    if (backdropOpen && !sidebarOpen) setBackdropOpen(false)
  }, [sidebarOpen])

  useEffect(() => {
    if (backdropOpen && !isBelowMdScreen) setBackdropOpen(false)
    if (sidebarOpen && !isBelowMdScreen) setSidebarOpen(false)
  }, [isBelowMdScreen])

  return (
    <div
      className={classnames(
        commonLayoutClasses.contentHeightFixed,
        'flex flex-col is-full overflow-hidden rounded relative',
        {
          border: settings.skin === 'bordered',
          'shadow-md': settings.skin !== 'bordered'
        }
      )}
    >
      <div className="flex flex-1 overflow-hidden">
        <SidebarLeft
          store={emailStore}
          isBelowLgScreen={isBelowLgScreen}
          isBelowMdScreen={isBelowMdScreen}
          isBelowSmScreen={isBelowSmScreen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          folder={folder}
          uniqueLabels={uniqueLabels}
          label={label || ''}
        />

        <Backdrop open={backdropOpen} onClick={handleBackdropClick} className='absolute z-10' />

        <MailContent
          store={emailStore}
          dispatch={dispatch}
          folder={folder}
          handleDelete={handleDelete}
          handlePremanentDelete={handlePremanentDelete}
          handleRead={handleRead}
          label={label}
          uniqueLabels={uniqueLabels}
          isInitialMount={isInitialMount.current}
          setSidebarOpen={setSidebarOpen}
          isBelowLgScreen={isBelowLgScreen}
          isBelowMdScreen={isBelowMdScreen}
          isBelowSmScreen={isBelowSmScreen}
          setBackdropOpen={setBackdropOpen}
          setReload={setReload}
          reload={reload}
          handleFetchData={handleFetchData}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}


        />
      </div>

      {/* ✅ Pagination Section */}
      <div className="flex justify-center p-3 border-t">
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </div>
    </div>
  )
}

export default EmailWrapper
