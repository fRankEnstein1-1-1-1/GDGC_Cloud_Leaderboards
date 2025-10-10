import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Check, Users, Star, Gift, Github, Twitter, Instagram, Linkedin, Moon, Sun , Link} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/theme-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import {db} from '../firebase'
import {collection, getDocs, setDoc, doc} from "firebase/firestore";
// this function will convert the excel data to required json
const fetchExcelData = async () => {
  try {
    const response = await fetch('/H.xlsx');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with normalized keys
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }).map(row => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = row[key];
      });
      return normalizedRow;
    });

    // Now safely extract values
    return jsonData.map((row, index) => ({
      id: index + 1,
      name: row.username || 'Unknown',

  arcadeGames: (() => {
  
 // console.log("Row keys:", Object.keys(row));
  //console.log("Row arcade raw value:", row["ofarcadegamescompleted"]);

  // Dynamically detect the key (case-insensitive)
  const arcadeKey = Object.keys(row).find(k =>
    k.toLowerCase().includes('arcade')
  );

  // Debug: show which key was matched
  console.log("Detected arcade key:", arcadeKey);

  const valRaw = arcadeKey ? row[arcadeKey] : '';
  console.log("Raw arcade value before processing:", valRaw);

  const val = (valRaw ?? '').toString().trim();
  console.log("Processed arcade string value:", val);

  // Handle numeric or string
  if (val === '1' || val === '1.0' || val === 'yes' || val === 'true') return 'Yes';
  if (val === '0' || val === '0.0' || val === 'no' || val === 'false') return 'No';

  const numVal = parseFloat(val);
  console.log("Parsed numeric value:", numVal);

  if (!isNaN(numVal)) return numVal === 1 ? 'Yes' : 'No';

  // Fallback
  return '-';
})(),



completedPaths: parseInt(row['ofskillbadgescompleted']) || 0,
      totalPaths: 19,
      eligibleForGoodies:
        (row.eligibleforgoodies || '').toString().toLowerCase() === 'true'
    }));
  } catch (error) {
    console.error('Error loading Excel file:', error);
    return [];
  }
};



const ModeToggle = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="absolute h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Navbar = () => {
  return (
    <nav className="flex items-center py-4 px-4 sm:px-6 bg-background border-b">
      <img src='/logo.png' className='h-[2rem] mr-2' alt="Logo"/>
      <h1 className="text-lg sm:text-xl font-bold truncate mr-auto text-left">
        <span className="hidden sm:inline">Google Developer Group on Campus</span>
        <span className="sm:hidden">GDGC</span>
      </h1>
      <div className="flex items-center space-x-2 ">
      <a href="https://gdgc.dbit.in/" target="_blank" rel="noopener noreferrer" >
          <Link className="h-5 w-5"></Link>
        </a>
        <a href="https://www.linkedin.com/company/google-developers-group-campus-dbit/" target="_blank" rel="noopener noreferrer" >
          <Linkedin className="h-5 w-5" />
        </a>
        <a href="https://www.instagram.com/gdgc.dbit/" target="_blank" rel="noopener noreferrer" >
          <Instagram className="h-5 w-5" />
        </a>
        <ModeToggle />
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

useEffect(() => {
  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchExcelData();

      // 🔹 Fetch previous order (to preserve history + timestamps)
      const orderSnapshot = await getDocs(collection(db, "leaderboard_order"));
      const previousOrder = orderSnapshot.docs.map(doc => doc.data());

      // 🔹 Sort logic
      const sortedStudents = data
        .map((student, index) => {
          const prev = previousOrder.find(p => p.name === student.name);
          return {
            ...student,
            originalIndex: index,
            prevRank: prev ? prev.rank : Infinity,
            lastCompletedAt: prev?.lastCompletedAt || null, // ⏰ carry old timestamp
          };
        })
        .sort((a, b) => {
          // 1️⃣ Highest completed paths first
          if (b.completedPaths !== a.completedPaths)
            return b.completedPaths - a.completedPaths;

          // 2️⃣ Earlier completer ranks higher
          if (a.lastCompletedAt && b.lastCompletedAt) {
            return new Date(a.lastCompletedAt) - new Date(b.lastCompletedAt);
          }

          // 3️⃣ If both completed but no timestamps, preserve previous rank
          if (previousOrder.length && a.prevRank !== Infinity && b.prevRank !== Infinity)
            return a.prevRank - b.prevRank;

          // 4️⃣ fallback to order in Excel
          return a.originalIndex - b.originalIndex;
        });

      // 🔹 Save current order + timestamps globally to Firestore
      const batchWrites = sortedStudents.map(async (s, i) => {
        const ref = doc(db, "leaderboard_order", s.name);
        const prev = previousOrder.find(p => p.name === s.name);

        // 🕓 Preserve the first time they reached full completion
        const alreadyCompleted = prev && prev.completedPaths === s.totalPaths;
        const newCompletion = s.completedPaths === s.totalPaths;

        const lastCompletedAt =
          newCompletion && !alreadyCompleted
            ? new Date().toISOString()
            : prev?.lastCompletedAt || null;

        await setDoc(ref, {
          name: s.name,
          rank: i + 1,
          completedPaths: s.completedPaths,
          totalPaths: s.totalPaths,
          lastCompletedAt,
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(batchWrites);

      // 🔹 Update UI
      setStudents(sortedStudents.map((s, i) => ({ ...s, id: i + 1 })));
      setError(null);
    } catch (err) {
      setError("Failed to load student data");
      console.error("Error loading data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  loadData();
}, []);



  // const filteredStudents = students.filter(student =>
  //   student.name.toLowerCase().includes(searchTerm.toLowerCase())
  // );


  const filteredStudents = students.filter(student =>
  (student.name || "").toLowerCase().includes(searchTerm.toLowerCase())
);


  const getRankIcon = (index) => {
    switch(index) {
      case 0: return <Trophy className="ml-auto mr-auto h-6 w-6 text-yellow-500" />;
      case 1: return <Medal className="ml-auto mr-auto h-6 w-6 text-gray-400" />;
      case 2: return <Medal className="ml-auto mr-auto h-6 w-6 text-amber-600" />;
      default: return index + 1;
    }
  };

  const totalParticipants = students.length;
  const totalCompletions = students.filter(student => student.completedPaths === student.totalPaths).length;
  const eligibleForGoodies = students.filter(student => student.eligibleForGoodies).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 md:p-8 w-screen">
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-100 dark:bg-blue-400/0 shadow-[0_0_20px_rgba(59,130,246,0.5)] dark:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all duration-300 hover:shadow-[0_0_10px_rgba(59,130,246,0.6)] dark:hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <Users className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParticipants}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-100 dark:bg-green-400/0 shadow-[0_0_20px_rgba(34,197,94,0.5)] dark:shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300 hover:shadow-[0_0_10px_rgba(34,197,94,0.6)] dark:hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Completions</CardTitle>
            <Star className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletions}</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-100 dark:bg-purple-400/0 shadow-[0_0_20px_rgba(147,51,234,0.5)] dark:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all duration-300 hover:shadow-[0_0_10px_rgba(147,51,234,0.6)] dark:hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible for Goodies</CardTitle>
            <Gift className="h-4 w-4 " />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eligibleForGoodies}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl font-bold">Cloud Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead className="text-center">Name</TableHead>
                  <TableHead className="text-center">Completed Paths</TableHead>
                  <TableHead className="text-center">Arcade Games</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Goodies</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell className="text-center">{getRankIcon(student.id - 1)}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    {/* <TableCell>{`${student.completedPaths} / ${student.totalPaths}`}</TableCell> */}
   <TableCell>
  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
    <div
      className="h-2 rounded-full transition-all duration-500 ease-in-out"
      style={{
        width: `${(student.completedPaths / student.totalPaths) * 100}%`,
        background: "linear-gradient(to right, #4285F4, #EA4335, #FBBC05, #34A853)",
      }}
    ></div>
  </div>
  <p className="text-xs text-center mt-1">{`${student.completedPaths} / ${student.totalPaths}`}</p>
</TableCell>


                    <TableCell>
                      {student.arcadeGames === 'Yes' ?(
                        <Badge className="bg-green-500 hover:bg-green-600 text-green-100 dark:bg-green-600/40">
                        {student.arcadeGames}
                      </Badge>
                      ) : (
                        <Badge className="bg-red-500 hover:bg-red-600 text-red-100 dark:bg-red-600/40">
                          {student.arcadeGames}
                        </Badge>
                      )
                      }
                    
                    </TableCell>
                    <TableCell>
                      {student.completedPaths === student.totalPaths ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-green-100 dark:bg-green-600/40">
                          <Check className="mr-1 h-4 w-4" /> Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600 text-yellow-100 dark:bg-yellow-600/40">
                          In Progress
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.eligibleForGoodies ? (
                        <Badge className="bg-purple-500 hover:bg-purple-600 text-purple-100 dark:bg-purple-600/40">
                          <Gift className="mr-1 h-4 w-4" /> Eligible
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-500 hover:bg-gray-600 text-gray-100 dark:bg-gray-600/40">
                          Not Eligible
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex">
          <Dashboard />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;