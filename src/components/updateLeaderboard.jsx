
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "../firebase";
import * as XLSX from "xlsx";


const normalizeKey = (key) => (key ? key.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "");
const parseNumberSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};


const fetchExcelData = async () => {
  try {
    const response = await fetch("/H.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    return jsonData.map((row, idx) => {
      const normalizedRow = {};
      Object.keys(row).forEach((k) => {
        normalizedRow[normalizeKey(k)] = row[k];
      });

      const arcadeKey = Object.keys(normalizedRow).find((k) => k.includes("arcade"));
      const arcadeVal = arcadeKey ? normalizedRow[arcadeKey] : "";

      const ofskillRaw = (normalizedRow.ofskillbadgescompleted || "0").toString();
      const completedStr = ofskillRaw.split("/")[0];

      return {
        id: idx + 1,
        name: normalizedRow.username || "Unknown",
        completedPaths: parseNumberSafe(completedStr),
        totalPaths: 19,
        eligibleForGoodies: (normalizedRow.eligibleforgoodies || "").toString().toLowerCase() === "true",
        arcadeGames:
          arcadeVal.toString().trim().toLowerCase() === "1" ||
          arcadeVal.toString().trim().toLowerCase() === "yes"
            ? "Yes"
            : "No",
        originalIndex: idx,
      };
    });
  } catch (e) {
    console.error("Error loading Excel file:", e);
    return [];
  }
};


const unlockedComparator = (a, b) => {
  const ac = Number(a.completedPaths);
  const bc = Number(b.completedPaths);
  if (bc !== ac) return bc - ac; // more completedPaths first

  
  const aPrev = Number(a.prevRank ?? Infinity);
  const bPrev = Number(b.prevRank ?? Infinity);
  if (aPrev !== bPrev) return aPrev - bPrev;

  // Final fallback: Excel original order
  return a.originalIndex - b.originalIndex;
};


const lockedComparator = (a, b) => {
  const aPrev = Number(a.prevRank ?? Infinity);
  const bPrev = Number(b.prevRank ?? Infinity);
  if (aPrev !== bPrev) return aPrev - bPrev;

  // Prefer older completion time (if available)
  const aTime = a.lastCompletedAt ? new Date(a.lastCompletedAt).getTime() : Infinity;
  const bTime = b.lastCompletedAt ? new Date(b.lastCompletedAt).getTime() : Infinity;
  if (aTime !== bTime) return aTime - bTime;

  return a.name.localeCompare(b.name);
};


const findOrderingViolations = (arr) => {
  const violations = [];
  for (let i = 0; i < arr.length - 1; i++) {
    const cur = Number(arr[i].completedPaths);
    for (let j = i + 1; j < arr.length; j++) {
      const later = Number(arr[j].completedPaths);
      if (later > cur) {
        violations.push({
          higherIndex: j,
          lowerIndex: i,
          higher: arr[j],
          lower: arr[i],
        });
    
        break;
      }
    }
  }
  return violations;
};


export const updateLeaderboard = async () => {
  try {
    console.log("🏁 Starting leaderboard update...");
    const excelData = await fetchExcelData();
    console.log(`Excel rows: ${excelData.length}`);

    // Fetch previous data
    const orderSnapshot = await getDocs(collection(db, "leaderboard_order"));
    const previousOrder = orderSnapshot.docs.map((d) => d.data());
    console.log(`Firestore docs loaded: ${previousOrder.length}`);

    
    const prevByName = (name) => previousOrder.find((p) => p.name === name) || null;

    // Enrich
    const enriched = excelData.map((s) => {
      const prev = prevByName(s.name);
      const prevLockedAndComplete = Boolean(prev?.locked) && Number(prev?.completedPaths) === Number(prev?.totalPaths);
      const isNowFinisher = Number(s.completedPaths) === Number(s.totalPaths);
      const locked = prevLockedAndComplete || isNowFinisher;
      
      const prevRank = prevLockedAndComplete ? (prev.rank ?? Infinity) : Infinity;
      return {
        ...s,
        prev,
        prevRank,
        lastCompletedAt: prev?.lastCompletedAt ?? null,
        locked,
      };
    });

    // Separate
    let lockedStudents = enriched.filter((s) => s.locked);
    let unlockedStudents = enriched.filter((s) => !s.locked);

    console.log(`Initial locked count: ${lockedStudents.length}, unlocked: ${unlockedStudents.length}`);

    // Detect newly completed (19/19) but not marked locked (edge-case) and promote them
    const newlyCompleted = unlockedStudents.filter((s) => Number(s.completedPaths) === Number(s.totalPaths));
    if (newlyCompleted.length) {
      console.log(`Promoting ${newlyCompleted.length} newly completed students to locked.`);
      newlyCompleted.forEach((s) => (s.locked = true));
    
      lockedStudents = [...lockedStudents, ...newlyCompleted];
      unlockedStudents = unlockedStudents.filter((s) => Number(s.completedPaths) !== Number(s.totalPaths));
    }

    // Sort locked finishers and unlocked students
    lockedStudents.sort(lockedComparator);
    unlockedStudents.sort(unlockedComparator);

    // Merge: locked first, then unlocked
    let finalStudents = [...lockedStudents, ...unlockedStudents];

    // Assign ranks
    finalStudents.forEach((s, i) => (s.rank = i + 1));

    const violations = findOrderingViolations(finalStudents);
    if (violations.length > 0) {
      console.warn("⚠️ Ordering violations detected! Will correct them. Sample violations:", violations.slice(0, 5).map(v => ({
        lowerName: v.lower.name, lowerCompleted: v.lower.completedPaths, lowerRank: v.lower.rank,
        higherName: v.higher.name, higherCompleted: v.higher.completedPaths, higherRank: v.higher.rank
      })));
      
      finalStudents = [
        ...finalStudents
      ].sort((a, b) => {
        // strict by completedPaths
        const ac = Number(a.completedPaths), bc = Number(b.completedPaths);
        if (bc !== ac) return bc - ac;
        // tie-break: if both were locked originally and had prevRank, prefer lower prevRank
        const aPrev = Number(a.prevRank ?? Infinity), bPrev = Number(b.prevRank ?? Infinity);
        if (aPrev !== bPrev) return aPrev - bPrev;
        // fallback
        return a.originalIndex - b.originalIndex;
      });
      // reassign ranks
      finalStudents.forEach((s, i) => (s.rank = i + 1));
      console.log(" Ordering corrected by strict re-sort.");
    } else {
      console.log(" No ordering violations detected.");
    }

    // Final sanity log: show boundary between locked and unlocked
    const lockedCount = finalStudents.filter((s) => s.locked).length;
    console.log(`Final: locked finishers = ${lockedCount}, total students = ${finalStudents.length}`);
    console.log("Top 8:", finalStudents.slice(0, 8).map((s) => `${s.rank}. ${s.name} (${s.completedPaths})`));
    console.log("Last 8:", finalStudents.slice(-8).map((s) => `${s.rank}. ${s.name} (${s.completedPaths})`));

    // Write batch
    const batch = writeBatch(db);
    let updates = 0;

    finalStudents.forEach((s) => {
      const prev = s.prev;
      const ref = doc(db, "leaderboard_order", s.name);
      const prevCompleted = prev && Number(prev.completedPaths) === Number(s.totalPaths);
      const nowCompleted = Number(s.completedPaths) === Number(s.totalPaths);
      const newLastCompletedAt = nowCompleted && !prevCompleted ? new Date().toISOString() : prev?.lastCompletedAt || null;

      batch.set(ref, {
        name: s.name,
        rank: s.rank,
        completedPaths: s.completedPaths,
        totalPaths: s.totalPaths,
        arcadeGames: s.arcadeGames,
        eligibleForGoodies: s.eligibleForGoodies,
        lastCompletedAt: newLastCompletedAt,
        locked: s.locked,
        updatedAt: new Date().toISOString(),
      });
      updates++;
    });

    await batch.commit();
    console.log(`✅ Leaderboard updated. Documents written: ${updates}`);
  } catch (err) {
    console.error(" Error updating leaderboard:", err);
  }
};
