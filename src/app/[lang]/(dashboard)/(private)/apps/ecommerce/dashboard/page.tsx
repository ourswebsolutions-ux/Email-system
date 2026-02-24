// app/dashboard/page.tsx
'use client'
import { useState, useEffect } from 'react'

import { Box, Typography, Grid, Card, CardContent, Button, List, ListItem, ListItemText } from '@mui/material'
import { People as PeopleIcon, Email as EmailIcon } from '@mui/icons-material'



import DynamicTable from '@/components/DynamicTable'

const assignedEmails = [
  { id: '1', email: 'info@company.com', assignedTo: 'Ali Khan', date: '2025-01-10', totalUsers: 3 },
  { id: '2', email: 'support@site.pk', assignedTo: 'Sara Ahmed', date: '2025-02-05', totalUsers: 2 },
  { id: '3', email: 'sales@biz.com', assignedTo: 'Omar Farooq', date: '2025-03-15', totalUsers: 5 },
  { id: '4', email: 'hr@org.pk', assignedTo: 'Ayesha Malik', date: '2025-04-01', totalUsers: 1 },
  { id: '5', email: 'team@startup.io', assignedTo: 'Bilal Raza', date: '2025-05-20', totalUsers: 4 }
]

const columns = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'assignedTo', header: 'Assigned To' },
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'totalUsers', header: 'Total Users' }
]

const notifications = [
  { id: '1', message: 'Email info@company.com assigned to Ali Khan', date: '2026-02-20' },
  { id: '2', message: 'New user Sara Ahmed registered', date: '2026-02-19' },
  { id: '3', message: 'Email support@site.pk reassigned to Sara Ahmed', date: '2026-02-18' }
]

export default function Dashboard() {

const [emails, setEmails] = useState<{ id: string; to: string }[]>([])

  const [users, setUsers] = useState<{ id: string; fullName: string }[]>([])

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
        const res = await fetch(`/api/apps/emails/get?folder=inbox&page=${page}`)

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

  return (
    <Box sx={{ p: 4 }}>
      {/* Top Summary Cards - KEEP UNTOUCHED */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="subtitle2">Total Users</Typography>
                  <Typography variant="h5">{users.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="subtitle2">All Emails</Typography>
                  <Typography variant="h5">{emails.length}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="subtitle2">All Assigned  Emails</Typography>
                  <Typography variant="h5">4,392</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Two-Column Layout Below */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} md={8}>
          {/* Top Card: Assigned Emails with Total Users */}

          {/* Assigned Emails Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Emails Table
              </Typography>
              <DynamicTable
                resource="assigned-emails"
                permissionKey="emails"
                data={assignedEmails}
                columns={columns}
                pagination={{
                  totalRecords: assignedEmails.length,
                  totalPages: Math.ceil(assignedEmails.length / 5),
                  page: 1,
                  pageSize: 5
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} md={4}>
          {/* Notifications */}
          {/* <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <List dense>
                {notifications.map((note) => (
                  <ListItem key={note.id}>
                    <ListItemText primary={note.message} secondary={note.date} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card> */}

          {/* Quick Actions */}
          <Card>
            <CardContent>

              <Typography variant="h6" gutterBottom >
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <a href='/apps/email'>
                  <Button variant="outlined" size="small" fullWidth>
                    View All Inboxes
                  </Button>
                </a>
                <a href='/user/list'>

                  <Button variant="outlined" size="small" fullWidth>
                    View All Users
                  </Button>
                </a>
                <a href='/email/form'>

                  <Button variant="outlined" size="small" fullWidth>
                    Assign Emails
                  </Button>
                </a>

              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
