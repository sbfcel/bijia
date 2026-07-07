import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AuthGuard from './components/AuthGuard'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import KeywordListPage from './pages/KeywordListPage'
import KeywordFormPage from './pages/KeywordFormPage'
import ProductListPage from './pages/ProductListPage'
import TaskListPage from './pages/TaskListPage'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/keywords" element={<KeywordListPage />} />
                  <Route path="/keywords/new" element={<KeywordFormPage />} />
                  <Route path="/keywords/:id" element={<KeywordFormPage />} />
                  <Route path="/products" element={<ProductListPage />} />
                  <Route path="/tasks" element={<TaskListPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </AuthGuard>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App
