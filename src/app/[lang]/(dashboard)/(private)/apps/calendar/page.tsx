// MUI Imports
import Card from '@mui/material/Card'

// Component Imports


// Styled Component Imports
import AppFullCalendar from '@/libs/styles/AppFullCalendar'

const CalendarApp = () => {
  return (
    <Card className='overflow-visible'>
      <AppFullCalendar className='app-calendar'>

      </AppFullCalendar>
    </Card>
  )
}

export default CalendarApp
