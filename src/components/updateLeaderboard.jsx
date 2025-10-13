// updateLeaderboard.js
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";

// --- Fetch Excel data ---
const fetchExcelData = async () => {
  const response = await fetch("/H.xlsx");
  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  return jsonData.map((row, index) => ({
    id: index + 1,
    name: row.Username || "Unknown",
    completedPaths: Number((row["Of Skill Badges Completed"] || "0").toString().split("/")[0]) || 0,
    totalPaths: 19,
    eligibleForGoodies:
      (row.EligibleForGoodies || "").toString().toLowerCase() === "true",
  }));
};

// --- Update Firestore Leaderboard ---
export const updateLeaderboard = async () => {
  try {
    console.log("🏁 Starting leaderboard update...");
    const excelData = await fetchExcelData();

    // Fetch previous data
    const orderSnapshot = await getDocs(collection(db, "leaderboard_order"));
    const previousOrder = orderSnapshot.docs.map((doc) => doc.data());

    // Sort logic
    const sorted = excelData.sort((a, b) => {
      if (b.completedPaths !== a.completedPaths)
        return b.completedPaths - a.completedPaths;
      return a.name.localeCompare(b.name);
    });

    // Assign ranks
    sorted.forEach((s, i) => (s.rank = i + 1));

    // Batch update Firestore
    const batch = writeBatch(db);
    sorted.forEach((s) => {
      const ref = doc(db, "leaderboard_order", s.name);
      batch.set(ref, {
        ...s,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    console.log(`✅ Leaderboard updated successfully (${sorted.length} users).`);
  } catch (error) {
    console.error("❌ Error updating leaderboard:", error);
  }
};
