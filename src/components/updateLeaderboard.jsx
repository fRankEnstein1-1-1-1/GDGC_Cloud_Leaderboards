// updateLeaderboard.js
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";

// --- Fetch Excel data (Reintegrated full extraction logic) ---
const fetchExcelData = async () => {
  try {
    const response = await fetch("/H.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    // Use a simplified function to safely access keys (based on your original logic)
    const normalizeKey = (key) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    return jsonData.map((row, index) => {
      const normalizedRow = {};
      Object.keys(row).forEach(key => {
        normalizedRow[normalizeKey(key)] = row[key];
      });

      // Find the arcade key dynamically
      const arcadeKey = Object.keys(normalizedRow).find(k => k.includes('arcade'));
      const arcadeVal = arcadeKey ? normalizedRow[arcadeKey] : '';

      return {
        id: index + 1,
        name: normalizedRow.username || "Unknown",
        completedPaths: Number((normalizedRow.ofskillbadgescompleted || "0").toString().split("/")[0]) || 0,
        totalPaths: 19,
        eligibleForGoodies: (normalizedRow.eligibleforgoodies || "").toString().toLowerCase() === "true",
        
        // Ensure arcadeGames is correctly extracted and standardized
        arcadeGames: (arcadeVal.toString().trim().toLowerCase() === '1' || arcadeVal.toString().trim().toLowerCase() === 'yes') ? 'Yes' : 'No',
      };
    });
  } catch (error) {
    console.error('Error loading Excel file in sync script:', error);
    return [];
  }
};

// --- Update Firestore Leaderboard (REVISED LOGIC) ---
export const updateLeaderboard = async () => {
  try {
    console.log("🏁 Starting leaderboard update...");
    const excelData = await fetchExcelData();

    // 1. Fetch previous data
    const orderSnapshot = await getDocs(collection(db, "leaderboard_order"));
    const previousOrder = orderSnapshot.docs.map((doc) => doc.data());

    // 2. Enrich Students (Original Step 3)
    const enrichedStudents = excelData.map((student, index) => {
      const prev = previousOrder.find((p) => p.name === student.name);

      const shouldBeLocked =
        student.totalPaths === 19 && student.completedPaths === 19;
      
      // Respect previous lock if it exists
      const locked = prev?.locked || shouldBeLocked;

      return {
        ...student,
        originalIndex: index,
        prevRank: prev?.rank ?? Infinity,
        lastCompletedAt: prev?.lastCompletedAt ?? null, // Default to NULL
        locked,
      };
    });
// 3. Separate Locked and Unlocked Students
  const lockedStudents = enrichedStudents.filter((s) => s.locked);
 const unlockedStudents = enrichedStudents.filter((s) => !s.locked);
// 4. Sort Unlocked Students (REVISED: Dependent ONLY on Completed Paths)
unlockedStudents.sort((a, b) => {
 const aCompleted = Number(a.completedPaths);
 const bCompleted = Number(b.completedPaths);

  // 1️⃣ Primary: higher completion first (DESCENDING)
  // This is the ONLY ranking factor.
  if (bCompleted !== aCompleted) {
        return bCompleted - aCompleted;
    }

  // 2️⃣ Secondary/Stability: If completed paths are equal, maintain stability 
    // based on the original order from the Excel sheet.
  // This ensures ties are resolved neutrally and predictably.
 return a.originalIndex - b.originalIndex;
});
    // 5. Sort Locked Students (preserve old rank)
    lockedStudents.sort((a, b) => a.prevRank - b.prevRank);

    // 6. Merge Locked + Unlocked (Original Step 7)
   // 6️⃣ Merge Locked + Unlocked Fairly (new logic)
const finalStudents = [];
let unlockedIndex = 0;

for (const student of lockedStudents) {
  // Fill all unlocked students *ahead* of this locked student
  while (
    unlockedIndex < unlockedStudents.length &&
    unlockedStudents[unlockedIndex].completedPaths > student.completedPaths
  ) {
    finalStudents.push(unlockedStudents[unlockedIndex]);
    unlockedIndex++;
  }

  // Now insert the locked one
  finalStudents.push(student);
}

// Add remaining unlocked ones
while (unlockedIndex < unlockedStudents.length) {
  finalStudents.push(unlockedStudents[unlockedIndex]);
  unlockedIndex++;
}

// Assign ranks
finalStudents.forEach((s, i) => (s.rank = i + 1));


   // --- 7. Final Batch Update (Robust Logic) ---
    const batch = writeBatch(db);
    let updatesCount = 0;

    finalStudents.forEach((s) => {
      const prev = previousOrder.find((p) => p.name === s.name);
      const ref = doc(db, "leaderboard_order", s.name);

      // Logic to determine new lastCompletedAt
      const alreadyCompleted = prev && prev.completedPaths === s.totalPaths;
      const newCompletion = s.completedPaths === s.totalPaths;

      const newLastCompletedAt =
        newCompletion && !alreadyCompleted
          ? new Date().toISOString()
          : prev?.lastCompletedAt || null; // Fallback to NULL is critical
      
      // ✅ MODIFIED: Use batch.set for all students to ensure all fields are written.
      // This is generally safer and ensures new fields (like arcadeGames, eligibleForGoodies)
      // are always present, even if the student was previously 'locked'.
      // The rank, which is the only truly dynamic field for unlocked students,
      // is always calculated correctly in finalStudents.
      
      batch.set(ref, {
        name: s.name,
        rank: s.rank, 
        completedPaths: s.completedPaths,
        totalPaths: s.totalPaths,
        // 🚀 These fields are now guaranteed to be saved/updated for all students
        arcadeGames: s.arcadeGames, 
        eligibleForGoodies: s.eligibleForGoodies, 
        lastCompletedAt: newLastCompletedAt, 
        locked: s.locked, 
        updatedAt: new Date().toISOString(),
      });
      updatesCount++;
    });
    // ❌ REMOVED: The conditional logic for prev?.locked and batch.update is removed.
    // The previous logic:
    // if (prev?.locked) { ... batch.update ... return; }

    await batch.commit();

    console.log(`✅ Leaderboard updated successfully (${updatesCount} documents updated/set).`);
  } catch (error) {
    console.error("❌ Error updating leaderboard:", error);
  }
};