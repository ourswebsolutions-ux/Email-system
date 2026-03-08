'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  IconButton,
  Autocomplete,
  Chip,
  Box,
  Stack,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material'

import { useSession } from 'next-auth/react'
import { showError, showSuccess } from '@/front-helper'
import { sendNotification } from '@/utils/frontend-helper'

interface Assignment {
  userId: string | null
  emails: string[]
}

interface UserEntry {
  label: string
  emails: string[]
}

export default function EmailAssignmentForm() {

  const { data: session } = useSession()

  const isSuperAdmin =
    session?.user?.roles?.some((r: any) => r.role.name === 'super-admin') ?? false

  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])
  const [mode, setMode] = useState<'assign' | 'add'>('assign')

  const [emails, setEmails] = useState<{ id: string; to: string; uid: number }[]>([])

  const [assignments, setAssignments] = useState<Assignment[]>([
    { userId: null, emails: [] }
  ])

  const [userEntries, setUserEntries] = useState<UserEntry[]>([
    { label: '', emails: [] }
  ])

  // ================= USERS =================

  useEffect(() => {

    const loadUsers = async () => {

      try {

        const res = await fetch('/api/users')
        const json = await res.json()

        const formatted = json.data.users.map((u: any) => ({
          id: u.id,
          fullName: `${u.first_name} ${u.last_name}`
        }))

        setUsers(formatted)

      } catch (err) {
        console.error('Failed to load users:', err)
      }

    }

    loadUsers()

  }, [])

  // ================= INBOX EMAILS =================

  useEffect(() => {

    const loadInbox = async () => {

      const allEmails: { id: string; to: string; uid: number }[] = []

      let page = 1
      let hasMore = true

      while (hasMore) {

        const res = await fetch(`/api/apps/emails/email-list?folder=inbox&page=${page}`)

        if (!res.ok) break

        const json = await res.json()

        if (!json.emails || json.emails.length === 0) {
          hasMore = false
          break
        }

        const formatted = json.emails
          .filter((email: any) => email.folder === 'inbox' && !email.deletedAt)
          .reduce((acc: any[], email: any) => {

            if (!acc.some(e => e.to === email.to)) {
              acc.push({
                id: email.id,
                to: email.to,
                uid: email.uid
              })
            }

            return acc

          }, [])

        allEmails.push(...formatted)

        page++

      }

      setEmails(allEmails)

    }

    loadInbox()

  }, [])

  // ================= ASSIGN MODE =================

  const canAddAssignRow = () => {

    const last = assignments[assignments.length - 1]

    return last.userId !== null && last.emails.length > 0

  }

  const addAssignRow = () => {

    if (assignments.length >= 10 || !canAddAssignRow()) return

    setAssignments([...assignments, { userId: null, emails: [] }])

  }

  const removeAssignRow = (i: number) => {

    if (assignments.length === 1) return

    setAssignments(assignments.filter((_, idx) => idx !== i))

  }

  const updateAssignUser = (i: number, val: any) => {

    const next = [...assignments]

    next[i].userId = val?.id ?? null

    setAssignments(next)

  }

  const updateAssignEmails = (i: number, val: string[]) => {

    const next = [...assignments]

    next[i].emails = val

    setAssignments(next)

  }

  const handleAssignSubmit = async () => {

    const payload = assignments
      .filter(a => a.userId && a.emails.length > 0)
      .flatMap(a =>
        a.emails.map(to => {

          const emailObj = emails.find(e => e.to === to)

          return {
            userId: a.userId!,
            email: to,
            emailId: emailObj?.id || null,
            uid: emailObj?.uid || null
          }

        })
      )

    if (payload.length === 0) return

    try {

      const res = await fetch('/api/user-email-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxes: payload })
      })

      if (res.ok) {

        setAssignments([{ userId: null, emails: [] }])

        sendNotification(
          'Emails successfully assigned to user',
          false,
          '/email/list'
        )

        showSuccess('Email Assign successfully')

      }

    } catch (err) {

      showError(err)

    }

  }

  // ================= ADD MODE =================

  const canAddAddRow = () => {

    const last = userEntries[userEntries.length - 1]

    return last.label.trim() && last.emails.length > 0

  }

  const addAddRow = () => {

    if (userEntries.length >= 10 || !canAddAddRow()) return

    setUserEntries([...userEntries, { label: '', emails: [] }])

  }

  const removeAddRow = (i: number) => {

    if (userEntries.length === 1) return

    setUserEntries(userEntries.filter((_, idx) => idx !== i))

  }

  const updateAddLabel = (i: number, val: string) => {

    const next = [...userEntries]

    next[i].label = val

    setUserEntries(next)

  }

  const updateAddEmails = (i: number, val: string[]) => {

    const next = [...userEntries]

    next[i].emails = val

    setUserEntries(next)

  }

  const handleAddSubmit = async () => {

    const payload = userEntries
      .filter(e => e.label.trim() && e.emails.length > 0)
      .flatMap(entry =>
        entry.emails.map(email => ({
          displayName: entry.label.trim(),
          emailAddress: email
        }))
      )

    if (payload.length === 0) return

    try {

      const res = await fetch('/api/apps/emails/add-mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxes: payload })
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.message || 'Failed to add mailboxes')
        return
      }

      showSuccess('Mailboxes added successfully')

      setUserEntries([{ label: '', emails: [] }])

      window.location.href = '/apps/email'

    } catch (err) {

      showError(err)

    }

  }

  // ================= UI =================

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>

          <CardHeader
            title={isSuperAdmin ? 'Email Management' : 'Add My Emails'}
            action={
              isSuperAdmin && (
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={(_, v) => v && setMode(v)}
                  size="small"
                >
                  <ToggleButton value="assign">
                    Assign Emails
                  </ToggleButton>

                  <ToggleButton value="add">
                    Add Emails
                  </ToggleButton>

                </ToggleButtonGroup>
              )
            }
          />

          <CardContent>

            {/* ================= ASSIGN MODE ================= */}

            {isSuperAdmin && mode === 'assign' ? (

              <>
                {assignments.map((ass, i) => (

                  <Grid container spacing={3} key={i} alignItems="center" sx={{ mb: 3 }}>

                    <Grid item xs={12} sm={5}>

                      <Autocomplete
                        options={users}
                        getOptionLabel={o => o.fullName}
                        value={users.find(u => u.id === ass.userId) ?? null}
                        onChange={(_, v) => updateAssignUser(i, v)}
                        renderInput={p => <TextField {...p} label="Select User" />}
                        isOptionEqualToValue={(o, v) => o.id === v.id}
                      />

                    </Grid>

                    <Grid item xs={12} sm={6}>

                      <Autocomplete
                        multiple
                        options={emails.map(e => e.to)}
                        value={ass.emails}
                        onChange={(_, newValue) => updateAssignEmails(i, newValue)}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Emails" />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                      />

                    </Grid>

                    <Grid item xs={12} sm={1}>

                      {i === assignments.length - 1 ? (

                        <IconButton
                          onClick={addAssignRow}
                          disabled={assignments.length >= 10 || !canAddAssignRow()}
                        >
                          +
                        </IconButton>

                      ) : (

                        <IconButton
                          onClick={() => removeAssignRow(i)}
                          color="error"
                        >
                          🗑
                        </IconButton>

                      )}

                    </Grid>

                  </Grid>

                ))}

                <Box sx={{ mt: 4, textAlign: 'right' }}>

                  <Button
                    variant="contained"
                    onClick={handleAssignSubmit}
                  >
                    Save
                  </Button>

                </Box>

              </>

            ) : (

              /* ================= ADD MODE ================= */

              <Stack spacing={4}>

                {userEntries.map((entry, i) => (

                  <Grid container spacing={3} key={i} alignItems="center">

                    <Grid item xs={12} sm={5}>

                      <TextField
                        fullWidth
                        label="Label"
                        value={entry.label}
                        onChange={e => updateAddLabel(i, e.target.value)}
                      />

                    </Grid>

                    <Grid item xs={12} sm={6}>

                      <Autocomplete
                        multiple
                        freeSolo
                        options={[]}
                        value={entry.emails}
                        onChange={(_, newValue) => updateAddEmails(i, newValue)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Emails"
                            placeholder="example@domain.com"
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                      />

                    </Grid>

                    <Grid item xs={12} sm={1}>

                      {i === userEntries.length - 1 ? (

                        <IconButton
                          onClick={addAddRow}
                          disabled={userEntries.length >= 10 || !canAddAddRow()}
                        >
                          +
                        </IconButton>

                      ) : (

                        <IconButton
                          onClick={() => removeAddRow(i)}
                          color="error"
                        >
                          🗑
                        </IconButton>

                      )}

                    </Grid>

                  </Grid>

                ))}

                <Box sx={{ textAlign: 'right' }}>

                  <Button
                    variant="contained"
                    onClick={handleAddSubmit}
                    disabled={!userEntries.some(e => e.label && e.emails.length)}
                  >
                    Add
                  </Button>

                </Box>

              </Stack>

            )}

          </CardContent>

        </Card>
      </Grid>
    </Grid>
  )
}
