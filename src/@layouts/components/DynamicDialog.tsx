// MUI Imports
import Dialog from '@mui/material/Dialog'

import DialogActions from '@mui/material/DialogActions'

import type { Breakpoint } from '@mui/material/styles'

interface DialogsProps {
  children: React.ReactNode
  open: boolean
  setOpen: (open: boolean) => void
  actions?: React.ReactNode
  fullWidth?: boolean
  maxWidth?: Breakpoint
}

const DialogsSizes = ({ open, setOpen, fullWidth, maxWidth, children, actions }: DialogsProps) => {
  // States

  const handleClose = () => setOpen(false)

  return (
    <>
      <Dialog
        open={open}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        onClose={handleClose}
        aria-labelledby='max-width-dialog-title'
      >
        {children}
        <DialogActions className='dialog-actions-dense'>{actions}</DialogActions>
      </Dialog>
    </>
  )
}

export default DialogsSizes
