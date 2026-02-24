'use client'

import { useState, useEffect } from 'react'

import { Box, Typography, Grid, Card, CardContent, Button } from '@mui/material'
import { People as PeopleIcon, Email as EmailIcon } from '@mui/icons-material'

import DynamicTable from '@/components/DynamicTable'

const columns = [
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'assignedTo', header: 'Assigned To' },
    { accessorKey: 'date', header: 'Date' },
    { accessorKey: 'totalUsers', header: 'Total Users' }
]

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null)
    const [assignedEmails, setAssignedEmails] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const res = await fetch('/api/apps/dashboard')
                const json = await res.json()

                if (!res.ok) throw new Error(json.error)

                setStats(json.stats)

                // Map emails for table
                const formattedEmails = json.latestEmails.map((email: any) => ({
                    id: email.id,
                    email: email.to || '-',
                    assignedTo:
                        email.assignments && email.assignments.length > 0
                            ? email.assignments
                                .map(
                                    (a: any) =>
                                        `${a.user?.first_name || ''} ${a.user?.last_name || ''}`
                                )
                                .join(', ')
                            : 'Unassigned',
                    date: email.createdAt
                        ? new Date(email.createdAt).toLocaleDateString()
                        : '-',
                    totalUsers: email.assignments
                        ? email.assignments.length
                        : 0
                }))

                setAssignedEmails(formattedEmails)
            } catch (err) {
                console.error('Dashboard load failed:', err)
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [])


console.log(assignedEmails)

    return (
        <Box sx={{ p: 4 }}>
            {/* Top Summary Cards - DESIGN UNTOUCHED */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PeopleIcon color="primary" sx={{ mr: 2 }} />
                                <Box>
                                    <Typography variant="subtitle2">
                                        Total Users
                                    </Typography>
                                    <Typography variant="h5">
                                        {stats?.totalUsers ?? stats?.myAssignedEmails ?? 0}
                                    </Typography>
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
                                    <Typography variant="subtitle2">
                                        All Emails
                                    </Typography>
                                    <Typography variant="h5">
                                        {stats?.totalEmails ?? assignedEmails.length}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Two-Column Layout Below - DESIGN UNTOUCHED */}
            <Grid container spacing={3}>
                {/* Left Column */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Assigned Emails Table
                            </Typography>

                            <DynamicTable
                                resource="email"
                                permissionKey="email"
                                data={assignedEmails}
                                columns={columns}
                                pagination={{
                                    totalRecords: assignedEmails.length,
                                    totalPages: Math.ceil(assignedEmails.length / 5) || 1,
                                    page: 1,
                                    pageSize: 5
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quick Actions
                            </Typography>

                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    href="/apps/email"
                                >
                                    View All Inboxes
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    href="/user/list"
                                >
                                    View All Users
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    href="/email/form"
                                >
                                    Assign Emails
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    )
}
