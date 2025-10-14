// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import { Button } from '@/components/ui/button'
// import Dashboard from './components/dashboard'
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
//   AlertDialogTrigger,
// } from "@/components/ui/alert-dialog"
// import { Calendar } from "@/components/ui/calendar"
// import { ThemeProvider } from './components/theme-provider'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <Dashboard className='w-screen h-screen'></Dashboard>
//   )
// }

// export default App

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./components/dashboard";
import Admin from "./components/Admin"; // this is the admin trigger page
import { ThemeProvider } from "./components/theme-provider";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <Router>
        <Routes>
          {/* Public dashboard */}
          <Route path="/" element={<Dashboard />} />

          {/* Admin-only route */}
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </ThemeProvider>
    //  <div >
    //   <h1 className="text-3xl font-bold mb-4"> Site Under Maintenance</h1>
    //   <p className="text-lg text-gray-600">
    //     Please check back after notifications. Sorry for the inconvenience!
    //   </p>
    // </div>
  );
}

export default App;






