import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { Button } from '@/components/ui/button'
import Dashboard from './components/dashboard'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar } from "@/components/ui/calendar"
import { ThemeProvider } from './components/theme-provider'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Dashboard className='w-screen h-screen'></Dashboard>
  )
}

export default App
