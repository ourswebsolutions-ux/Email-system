

import { Button, DialogActions, Dialog, DialogTitle, DialogContent, DialogContentText, Backdrop, CircularProgress } from '@mui/material';

interface ConfirmationDialogProps {
  title?: string;
  description?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void;

  IsLoading: boolean;
}

const ConfirmationDialog = ({ title = 'Are you sure?', description, open, setOpen, onConfirm, IsLoading }: ConfirmationDialogProps) => {
  const handleClose = () => setOpen(false);

  return (
    <Dialog
      component='form'
      open={open}
      onClose={handleClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
        {title}
      </DialogTitle>

      <DialogContent>
        {description && (
          <DialogContentText id="confirmation-dialog-description" sx={{ color: 'text.secondary' }}>
            {description}
          </DialogContentText>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: 2 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          color="primary"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
          }}
        >
          Cancel
        </Button>

        <Button
          onClick={onConfirm}  // Arrow function to invoke onConfirm with onsubmit
          variant="contained"
          color="error"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: 'rgba(211, 47, 47, 0.9)' },
          }}
        >
          Confirm
        </Button>
      </DialogActions>


      <Backdrop open={!!IsLoading} sx={{ zIndex: 1201 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Dialog>
  );
};

export default ConfirmationDialog;
