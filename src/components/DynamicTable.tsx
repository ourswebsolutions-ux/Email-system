'use client'

import { useMemo, useCallback, useContext } from 'react'

import { useRouter, useParams } from 'next/navigation'

import type { ColumnDef } from '@tanstack/react-table'
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Box, Typography, Select, MenuItem } from '@mui/material'

import { useCanDoAction, showLoading, hideLoading, showSuccess, showError } from '@/utils/frontend-helper'
import { SettingsContext } from '@core/contexts/settingsContext'

interface DynamicTableProps<T> {
  resource: string
  permissionKey: string
  data: T[]
  columns: ColumnDef<T>[]
  pagination: {
    totalRecords: number
    totalPages: number
    page: number
    pageSize: number
  }
}

const DynamicTable = <T extends { id: string }>({
  resource,
  permissionKey,
  data,
  columns,
  pagination,
}: DynamicTableProps<T>) => {
  const router = useRouter()
  const candoAction = useCanDoAction()
  const { permissions = [] } = useContext(SettingsContext)!.settings
  const { lang } = useParams()

  const handleView = useCallback(
    (id: string) => {
      router.push(`/${resource}/show/${id}`)
    },
    [router, resource]
  )

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/${resource}/form/${id}`)
    },
    [router, resource]
  )

  const handleDelete = useCallback(async (id: string, rowData: T) => {
    if (!window.confirm(`Are you sure Delete this ${permissionKey}?`)) return

    try {
      showLoading()

      let res: Response

      if (permissionKey === "users") {
        const url = `/api/${resource}?userId=${id}`

        res = await fetch(url, { method: 'DELETE' })
      }
      else if (permissionKey === "email") {         
        res = await fetch('/api/apps/assign/unassign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: (rowData as any).email,
            userId: (rowData as any).assignedUserIds
          })
        })
      }
      else {
        // fallback or error
        throw new Error("Unknown resource type")
      }

      const json = await res.json()

      if (res.ok) {
        showSuccess(json.message || "Deleted successfully")
        router.refresh()
      } else {
        showError(json.error || "Delete failed")
      }
    } catch (error) {
      showError(String(error))
    } finally {
      hideLoading()
    }
  }, [permissionKey, resource, router])

  const actionsColumn = useMemo<ColumnDef<T>>(
    () => ({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {candoAction(`read:${permissionKey}`) && (
            <Button
              size='small'
              variant='outlined'
              color='secondary'
              onClick={() => handleView(row.original.id)}
              startIcon={<i className='tabler-eye' />}
            >
              View
            </Button>
          )}
          {/* {candoAction(`update:${permissionKey}`) && (
            <Button size='small' variant='outlined' onClick={() => handleEdit(row.original.id)}>
              Edit
            </Button>
          )} */}
          {candoAction(`delete:${permissionKey}`) && (
            <Button
              size='small'
              variant='outlined'
              onClick={() => handleDelete(row.original.id, row.original)}
              color='error'
              startIcon={<i className='tabler-trash' />}
            >
              Delete
            </Button>
          )}

        </Box>
      ),
      size: 120,
    }),
    [handleView, handleEdit, handleDelete, permissions, permissionKey]
  )

  const allColumns = useMemo(() => [...columns, actionsColumn], [columns, actionsColumn])

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    filterFns: {
      fuzzy: () => false,
    },
    state: {
      pagination: {
        pageIndex: pagination.page - 1,
        pageSize: pagination.pageSize,
      },
    },
  })

  const handlePageChange = (newPageIndex: number) => {
    const newPage = newPageIndex + 1

    // Construct the new URL with query parameters
    const newUrl = `?page=${newPage}&pageSize=${pagination.pageSize}`

    router.push(newUrl)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    const newUrl = `?page=1&pageSize=${newPageSize}`

    router.push(newUrl)
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Table sx={{ minWidth: 800 }}>
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableCell key={header.id} sx={{ width: header.getSize() }}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} sx={{ width: cell.column.getSize() }}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mt: 2,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 1,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography sx={{
          fontSize: '0.875rem',
          color: 'text.secondary',
          fontWeight: 'medium'
        }}>
          Showing {table.getRowModel().rows.length} of {pagination.totalRecords} records
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}>
          <Button
            variant='outlined'
            disabled={!table.getCanPreviousPage()}
            onClick={() => handlePageChange(table.getState().pagination.pageIndex - 1)}
            sx={{
              minWidth: 80,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
                borderColor: 'primary.dark'
              },
              '&:disabled': {
                borderColor: 'action.disabled',
                color: 'action.disabled'
              }
            }}
          >
            Previous
          </Button>
          <Typography sx={{
            fontSize: '0.875rem',
            color: 'text.secondary',
            px: 1
          }}>
            Page {table.getState().pagination.pageIndex + 1} of {pagination.totalPages}
          </Typography>
          <Button
            variant='outlined'
            disabled={!table.getCanNextPage()}
            onClick={() => handlePageChange(table.getState().pagination.pageIndex + 1)}
            sx={{
              minWidth: 80,
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
                borderColor: 'primary.dark'
              },
              '&:disabled': {
                borderColor: 'action.disabled',
                color: 'action.disabled'
              }
            }}
          >
            Next
          </Button>
          <Select
            value={pagination.pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            sx={{
              height: 36,
              minWidth: 80,
              '.MuiSelect-select': {
                py: 0.75,
                fontSize: '0.875rem'
              }
            }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={30}>30</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </Box>
      </Box>
    </Box>
  )
}

export default DynamicTable
