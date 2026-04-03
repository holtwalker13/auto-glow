import { Navigate, Route, Routes } from 'react-router-dom'
import BookingWizard from './BookingWizard'
import { AdminDashboard } from './pages/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingWizard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
