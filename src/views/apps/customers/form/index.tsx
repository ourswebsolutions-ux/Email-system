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
const dummyEmails = [
  'info@company.com', 'support@company.com', 'hr@company.com',
  'billing@company.com', 'sales@company.com', 'admin@company.com',
  'team@company.com', 'marketing@company.com', 'finance@company.com'
]

interface Assignment { userId: string | null; emails: string[] }
interface UserEntry { label: string; email: string }

export default function EmailAssignmentForm() {
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.roles?.some((r: any) => r.role.name === 'super-admin') ?? false

  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])
  const [mode, setMode] = useState<'assign' | 'add'>('assign')
  const [emails, setEmails] = useState<{ id: string; to: string }[]>([])

  // Assign mode
  const [assignments, setAssignments] = useState<Assignment[]>([{ userId: null, emails: [] }])

  // Add mode
  const [userEntries, setUserEntries] = useState<UserEntry[]>([{ label: '', email: '' }])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch('/api/users')
        const json = await res.json()

        if (!res.ok) throw new Error(json.message)

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

  useEffect(() => {
    const loadInbox = async () => {
      const allEmails: { id: string; to: string; uid: number }[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`/api/apps/emails/email-list?folder=inbox&page=${page}`)

        if (!res.ok) {
          console.error(`Failed to fetch page ${page}`)
          break
        }

        const json = await res.json()

        if (!json.emails || json.emails.length === 0) {
          hasMore = false
          break
        }

        // Filter & deduplicate
        const formatted = json.emails
          .filter((email: any) => email.folder === 'inbox' && !email.deletedAt)
          .reduce((acc: any[], email: any) => {
            if (!acc.some(e => e.to === email.to)) {
              acc.push({ id: email.id, to: email.to, uid: email.uid })
            }


            return acc
          }, [])

        allEmails.push(...formatted)
        page++
      }

      setEmails(allEmails)
      console.log('Total emails fetched:', allEmails.length)
    }

    loadInbox()
  }, [])

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

  const updateAssignUser = (i: number, val: { id: string; fullName: string } | null) => {
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
            email: to,                  // store actual email string
            emailId: emailObj?.id || null,
            uid: emailObj?.uid || null  // <-- include uid
          }
        })
      )

    if (payload.length === 0) return

    try {
      const res = await fetch('/api/apps/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxes: payload })
      })

      if (res.ok) {
        setAssignments([{ userId: null, emails: [] }])
        console.log('Saved')
        sendNotification(
          `${payload.email}successfully assign to the other user `,
          false,
          '/email/list'
        )
        showSuccess("email Assign successfully")
      } else {
        console.error('Failed to save assignments')
      }
    } catch (err) {
      showError(err)
      console.error(err)
    }
  }

  const canAddAddRow = () => {
    const last = userEntries[userEntries.length - 1]


    return last.label.trim() && last.email.trim()
  }

  const addAddRow = () => {
    if (userEntries.length >= 10 || !canAddAddRow()) return
    setUserEntries([...userEntries, { label: '', email: '' }])
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

  const updateAddEmail = (i: number, val: string) => {
    const next = [...userEntries]

    next[i].email = val
    setUserEntries(next)
  }

  const handleAddSubmit = async () => {
    const payload = userEntries
      .filter(e => e.label.trim() && e.email.trim())
      .map(entry => ({
        displayName: entry.label.trim(),
        emailAddress: entry.email.trim(),
      }));

    if (payload.length === 0) return;

    try {
      const res = await fetch('/api/apps/emails/add-mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mailboxes: payload }),
      });

      if (!res.ok) {
        const err = await res.json();

        console.error('Failed:', err);
        alert(err.message || 'Failed to add mailboxes');

        return;
      }

      showSuccess('Mailboxes added successfully')

      // Optional: reset form
      setUserEntries([{ label: '', email: '' }]);

      window.location = '/apps/email'// You can also trigger a refresh of emails list if you want


    } catch (err) {

      console.error('Add mailboxes error:', err);
      showError(err)
    }
  };

  return (
    <Grid container spacing={6}>
      <Grid item xs={12}>
        <Card>
          <CardHeader
            title={isSuperAdmin ? "Email Management" : "Add My Emails"}
            action={
              isSuperAdmin && (
                <ToggleButtonGroup
                  value={mode}
                  exclusive
                  onChange={(_, v) => v && setMode(v)}
                  size="small"
                >
                  <ToggleButton value="assign">Assign Emails</ToggleButton>
                  <ToggleButton value="add">Add Emails</ToggleButton>
                </ToggleButtonGroup>
              )
            }
          />
          <CardContent>
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
                        options={emails}
                        getOptionLabel={(o) => `${o.to}`}
                        value={emails.filter(e => ass.emails.includes(e.to))}
                        isOptionEqualToValue={(option, value) => option.to === value.to}
                        onChange={(_, newValue) => updateAssignEmails(i, newValue.map(v => v.to))}
                        renderInput={(params) => (
                          <TextField {...params} label="Select Emails" placeholder="Select..." />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              label={option.to}
                              size="small"
                              {...getTagProps({ index })}
                            />
                          ))
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {i === assignments.length - 1 ? (
                        <IconButton onClick={addAssignRow} disabled={assignments.length >= 10 || !canAddAssignRow()}>
                          <i className="tabler-plus" />
                        </IconButton>
                      ) : (
                        <IconButton onClick={() => removeAssignRow(i)} color="error">
                          <i className="tabler-trash" />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                ))}
                <Box sx={{ mt: 4, textAlign: 'right' }}>
                  <Button variant="contained" onClick={handleAssignSubmit}>Save</Button>
                </Box>
              </>
            ) : (
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
                      <TextField
                        fullWidth
                        label="Email"
                        value={entry.email}
                        onChange={e => updateAddEmail(i, e.target.value)}
                        placeholder="example@domain.com"
                      />
                    </Grid>
                    <Grid item xs={12} sm={1}>
                      {i === userEntries.length - 1 ? (
                        <IconButton onClick={addAddRow} disabled={userEntries.length >= 10 || !canAddAddRow()}>
                          <i className="tabler-plus" />
                        </IconButton>
                      ) : (
                        <IconButton onClick={() => removeAddRow(i)} color="error">
                          <i className="tabler-trash" />
                        </IconButton>
                      )}
                    </Grid>
                  </Grid>
                ))}
                <Box sx={{ textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    onClick={handleAddSubmit}
                    disabled={!userEntries.some(e => e.label.trim() && e.email.trim())}
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
