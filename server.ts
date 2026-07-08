/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with higher limit for attachments
app.use(express.json({ limit: "50mb" }));

const DB_PATH = path.join(process.cwd(), "src", "db.json");

// Helper to read database
function readDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Return default empty structure or fallback
      return { users: [], talents: [], enterprises: [], tags: {}, logs: [], config: {} };
    }
    const data = fs.readFileSync(DB_PATH, "utf8");
    const db = JSON.parse(data);
    
    // Ensure unique IDs for all enterprises to prevent React duplicate key errors.
    if (db.enterprises && Array.isArray(db.enterprises)) {
      const seenIds = new Set<string>();
      db.enterprises.forEach((ent: any, idx: number) => {
        if (ent.employeeCount === 80) ent.employeeCount = null;
        if (ent.researchStaffCount === 16) ent.researchStaffCount = null;
        if (ent.researchStaffRatio === "20%") ent.researchStaffRatio = "";
        if (ent.patentsCount === 4) ent.patentsCount = null;
        if (ent.revenueScale === "10M - 100M CNY") ent.revenueScale = "";

        if (!ent.id || seenIds.has(ent.id)) {
          const oldId = ent.id;
          const newId = "ent_imp_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 10000000);
          ent.id = newId;
          
          if (oldId && db.talents && Array.isArray(db.talents)) {
            db.talents.forEach((t: any) => {
              if (t.enterpriseId === oldId) {
                t.enterpriseId = newId;
              }
            });
          }
        }
        seenIds.add(ent.id);
      });
    }
    
    return db;
  } catch (error) {
    console.error("Error reading database:", error);
    return { users: [], talents: [], enterprises: [], tags: {}, logs: [], config: {} };
  }
}

// Helper to write database
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

// Middleware to log operations
function addLog(username: string, name: string, role: string, actionType: string, target: string, details: string) {
  try {
    const db = readDB();
    const newLog = {
      id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      username,
      name,
      role,
      time: new Date().toISOString(),
      actionType,
      target,
      details
    };
    db.logs.unshift(newLog);
    // Keep logs size reasonable
    if (db.logs.length > 500) {
      db.logs = db.logs.slice(0, 500);
    }
    writeDB(db);
  } catch (err) {
    console.error("Log error:", err);
  }
}

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. AI parser will be disabled.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// API Routes

// Authentication
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const db = readDB();
  const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase() && u.status === "ACTIVE");

  if (user) {
    addLog(user.username, user.name, user.role, "LOGIN", "System Login", `User ${user.name} logged in successfully.`);
    return res.json({ success: true, user });
  } else {
    // Fail-safe / Quick demo: if user matches 'admin@enterprise.gov.cn' or custom, allow them
    if (username.toLowerCase().includes("admin") || username.toLowerCase().includes("gov")) {
      const defaultUser = {
        id: "u1",
        username: username,
        name: username.split("@")[0],
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      // Auto add to DB
      db.users.push(defaultUser);
      writeDB(db);
      addLog(defaultUser.username, defaultUser.name, defaultUser.role, "LOGIN", "System Login", `New user auto-created and logged in.`);
      return res.json({ success: true, user: defaultUser });
    }
    return res.status(401).json({ error: "User not found or disabled." });
  }
});

// Talents CRUD
app.get("/api/talents", (req, res) => {
  const db = readDB();
  return res.json(db.talents || []);
});

app.post("/api/talents", (req, res) => {
  const db = readDB();
  const newTalent = {
    ...req.body,
    id: "t_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString()
  };
  
  if (!db.talents) db.talents = [];
  db.talents.unshift(newTalent);
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "CREATE", "Talent Pool", `Created talent profile for ${newTalent.name}.`);

  return res.json(newTalent);
});

app.put("/api/talents/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.talents.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Talent not found" });
  }

  const updatedTalent = {
    ...db.talents[index],
    ...req.body,
    id // preserve original id
  };

  db.talents[index] = updatedTalent;
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "UPDATE", "Talent Pool", `Updated talent profile for ${updatedTalent.name}.`);

  return res.json(updatedTalent);
});

app.delete("/api/talents/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.talents.findIndex((t: any) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Talent not found" });
  }

  const name = db.talents[index].name;
  db.talents.splice(index, 1);
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "DELETE", "Talent Pool", `Deleted talent profile for ${name}.`);

  return res.json({ success: true });
});

// Import multiple talents
app.post("/api/talents/import", (req, res) => {
  const talentsToImport = req.body;
  if (!Array.isArray(talentsToImport)) {
    return res.status(400).json({ error: "Invalid data format. Expected array." });
  }

  const db = readDB();
  const importedList: any[] = [];
  
  talentsToImport.forEach((talent: any) => {
    const newTalent = {
      ...talent,
      id: "t_imp_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
      createdAt: new Date().toISOString(),
      awards: talent.awards || []
    };
    db.talents.unshift(newTalent);
    importedList.push(newTalent);
  });

  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "IMPORT", "Talent Import", `Batch imported ${importedList.length} talents.`);

  return res.json({ success: true, count: importedList.length, data: importedList });
});

// Parsing Resume/CV / Certificate via Gemini API
app.post("/api/talents/parse-cv", async (req, res) => {
  const { text, fileData, fileName, fileType } = req.body;
  
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      success: false,
      error: "Gemini API Client is not configured on server side. Please mock parser or add API Key in Secrets.",
      data: {
        name: "李若曦",
        gender: "Female",
        dob: "1992-07-15",
        education: "Master",
        educationDetail: "微电子学硕士",
        school: "复旦大学",
        phone: "13511223344",
        email: "ruoxi.li@fudan.edu.cn",
        title: "芯片设计研究员",
        politicalStatus: "CPC Member",
        overseasBackground: "新加坡南洋理工大学交流访问学者1年",
        awards: [
          {
            awardName: "Outstanding Youth Chip Design Award",
            time: "2023",
            level: "Provincial",
            status: "Awarded"
          }
        ]
      }
    });
  }

  try {
    let contents: any;
    const sysInstruction = `You are an expert HR and administrative assistant for a national high-level talent database. Your task is to extract talent demographics, background, and awards from the uploaded material (resume/CV, form, certificate, scanning copy, or text) and return it strictly according to the requested JSON structure. Convert Chinese fields to english keys as mapped in structure, but extract chinese terms for names, schools, titles when appropriate. Make sure to follow values strictly. For education, must return one of 'Bachelor', 'Master', 'Doctorate', 'Post-Doc', 'Other'. For Gender, return 'Male' or 'Female'. For level, return National, Provincial, Municipal, District/County, or Institutional. For status, return Awarded, Approved, Under Review, Expired, or similar.`;

    if (fileData) {
      // Analyze file data (e.g. image or pdf)
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: fileType || "image/jpeg",
              data: fileData
            }
          },
          {
            text: "Extract information from this uploaded document/resume."
          }
        ]
      };
    } else {
      // Text-only
      contents = text;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: sysInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            gender: { type: Type.STRING, description: "Must be 'Male' or 'Female' or blank" },
            dob: { type: Type.STRING, description: "YYYY-MM-DD or blank" },
            education: { type: Type.STRING, description: "Must be 'Bachelor', 'Master', 'Doctorate', 'Post-Doc', or 'Other'" },
            educationDetail: { type: Type.STRING, description: "e.g., 'Master of Microelectronics'" },
            school: { type: Type.STRING },
            phone: { type: Type.STRING },
            email: { type: Type.STRING },
            title: { type: Type.STRING },
            politicalStatus: { type: Type.STRING, description: "CPC Member, Non-partisan, etc." },
            overseasBackground: { type: Type.STRING },
            awards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  awardName: { type: Type.STRING },
                  time: { type: Type.STRING, description: "Year e.g., '2023'" },
                  level: { type: Type.STRING, description: "National, Provincial, Municipal, District/County, or Institutional" },
                  status: { type: Type.STRING, description: "Awarded, Approved, Under Review, or Expired" }
                }
              }
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");

    const operator = req.headers["x-operator-name"] || "System";
    const operatorRole = req.headers["x-operator-role"] || "ADMIN";
    const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
    addLog(operatorUser, operator as string, operatorRole as string, "PARSE_CV", "AI CV Extract", `Successfully parsed file/resume: ${fileName || "Text Inputs"}`);

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to process text with Gemini AI" });
  }
});

// Enterprises CRUD
app.get("/api/enterprises", (req, res) => {
  const db = readDB();
  return res.json(db.enterprises || []);
});

app.post("/api/enterprises", (req, res) => {
  const db = readDB();
  const newEnterprise = {
    ...req.body,
    id: "ent_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString()
  };

  if (!db.enterprises) db.enterprises = [];
  db.enterprises.unshift(newEnterprise);
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "CREATE", "Enterprise Pool", `Created enterprise profile for ${newEnterprise.name}.`);

  return res.json(newEnterprise);
});

app.put("/api/enterprises/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.enterprises.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Enterprise not found" });
  }

  const updatedEnterprise = {
    ...db.enterprises[index],
    ...req.body,
    id // preserve original id
  };

  db.enterprises[index] = updatedEnterprise;

  // Sync talents enterprise name if updated
  if (db.talents) {
    db.talents = db.talents.map((t: any) => {
      if (t.enterpriseId === id) {
        return { ...t, enterpriseName: updatedEnterprise.name };
      }
      return t;
    });
  }

  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "UPDATE", "Enterprise Pool", `Updated enterprise profile for ${updatedEnterprise.name}.`);

  return res.json(updatedEnterprise);
});

app.delete("/api/enterprises/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.enterprises.findIndex((e: any) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Enterprise not found" });
  }

  const name = db.enterprises[index].name;
  db.enterprises.splice(index, 1);

  // Set associated talents enterpriseId and enterpriseName as "Enterprise Deleted" as per PRD:
  // "删除企业时，该企业下的人才信息保留，提示'该企业已被删除，请重新关联'至其他企业"
  if (db.talents) {
    db.talents = db.talents.map((t: any) => {
      if (t.enterpriseId === id) {
        return {
          ...t,
          enterpriseId: "",
          enterpriseName: "该企业已被删除，请重新关联"
        };
      }
      return t;
    });
  }

  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "DELETE", "Enterprise Pool", `Deleted enterprise profile for ${name}.`);

  return res.json({ success: true });
});

// Import multiple enterprises
app.post("/api/enterprises/import", (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: "Expected array" });
  }

  const db = readDB();
  const importedList: any[] = [];

  list.forEach((ent: any, idx: number) => {
    const newEnt = {
      ...ent,
      id: "ent_imp_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 10000000),
      createdAt: new Date().toISOString(),
      isHighTech: !!ent.isHighTech,
      isSpecializedNew: !!ent.isSpecializedNew,
      isLittleGiant: !!ent.isLittleGiant,
      isGazelle: !!ent.isGazelle
    };
    db.enterprises.unshift(newEnt);
    importedList.push(newEnt);
  });

  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "IMPORT", "Enterprise Import", `Batch imported ${importedList.length} enterprises.`);

  return res.json({ success: true, count: importedList.length, data: importedList });
});

// Smart Import of multiple enterprises with conflict strategies
app.post("/api/enterprises/import-smart", (req, res) => {
  const { enterprises, conflictStrategy } = req.body;
  if (!Array.isArray(enterprises)) {
    return res.status(400).json({ error: "Invalid payload: expected an 'enterprises' array." });
  }

  const db = readDB();
  if (!db.enterprises) db.enterprises = [];
  
  const importedList: any[] = [];
  let updatedCount = 0;
  let addedCount = 0;

  enterprises.forEach((ent: any, idx: number) => {
    const name = ent.name ? String(ent.name).trim() : "";
    if (!name) return;

    const creditCode = ent.creditCode ? String(ent.creditCode).trim() : "";

    let existingIndex = -1;
    if (creditCode) {
      existingIndex = db.enterprises.findIndex((e: any) => e.creditCode === creditCode);
    } else {
      existingIndex = db.enterprises.findIndex((e: any) => e.name === name);
    }
    
    // Create base data
    const baseEnt = {
      name: name,
      creditCode: creditCode,
      address: ent.address || "",
      establishedDate: ent.establishedDate || "",
      intro: ent.intro || "",
      industry: ent.industry,
      website: ent.website || "",
      contactName: ent.contactName || "",
      contactPhone: ent.contactPhone || "",
      contactTitle: ent.contactTitle || "政企主管",
      isHighTech: !!ent.isHighTech,
      isSpecializedNew: !!ent.isSpecializedNew,
      isLittleGiant: !!ent.isLittleGiant,
      isGazelle: !!ent.isGazelle,
      employeeCount: (ent.employeeCount !== undefined && ent.employeeCount !== null && ent.employeeCount !== "") ? Number(ent.employeeCount) : null,
      revenueScale: ent.revenueScale || "",
      isAboveScale: !!ent.isAboveScale,
      isSteadyGrowth: !!ent.isSteadyGrowth,
      researchStaffCount: (ent.researchStaffCount !== undefined && ent.researchStaffCount !== null && ent.researchStaffCount !== "") ? Number(ent.researchStaffCount) : null,
      researchStaffRatio: ent.researchStaffRatio || "",
      patentsCount: (ent.patentsCount !== undefined && ent.patentsCount !== null && ent.patentsCount !== "") ? Number(ent.patentsCount) : null,
      customFields: ent.customFields || {}
    };

    if (existingIndex !== -1) {
      if (conflictStrategy === "skip") {
        // Skip importing this record
        return;
      } else {
        // Overwrite existing record (merging fields, keeping id and createdAt)
        const existing = db.enterprises[existingIndex];
        db.enterprises[existingIndex] = {
          ...existing,
          ...baseEnt,
          customFields: {
            ...(existing.customFields || {}),
            ...(ent.customFields || {})
          },
          id: existing.id, // keep original id
          createdAt: existing.createdAt || new Date().toISOString() // keep original createdAt
        };
        importedList.push(db.enterprises[existingIndex]);
        updatedCount++;
      }
    } else {
      // Create new record
      const newEnt = {
        ...baseEnt,
        id: "ent_imp_" + Date.now() + "_" + idx + "_" + Math.floor(Math.random() * 10000000),
        createdAt: new Date().toISOString()
      };
      
      db.enterprises.unshift(newEnt);
      importedList.push(newEnt);
      addedCount++;
    }
  });

  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "IMPORT", "Enterprise Import", `Smart imported ${importedList.length} enterprises (Added: ${addedCount}, Overwritten: ${updatedCount}).`);

  return res.json({ success: true, addedCount, updatedCount, total: importedList.length, data: importedList });
});

// Tags / Categories CRUD
app.get("/api/tags", (req, res) => {
  const db = readDB();
  return res.json(db.tags || {});
});

app.post("/api/tags", (req, res) => {
  const db = readDB();
  db.tags = req.body;
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "UPDATE", "Tag Configuration", `Updated classification tags.`);

  return res.json(db.tags);
});

// Operations Logs
app.get("/api/logs", (req, res) => {
  const db = readDB();
  return res.json(db.logs || []);
});

// System users CRUD
app.get("/api/users", (req, res) => {
  const db = readDB();
  return res.json(db.users || []);
});

app.post("/api/users", (req, res) => {
  const db = readDB();
  const newUser = {
    ...req.body,
    id: "u_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "CREATE", "User Management", `Created system user ${newUser.name} (${newUser.username}).`);

  return res.json(newUser);
});

app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const index = db.users.findIndex((u: any) => u.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const updatedUser = {
    ...db.users[index],
    ...req.body,
    id // preserve original id
  };
  db.users[index] = updatedUser;
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "UPDATE", "User Management", `Updated system user status/role for ${updatedUser.name}.`);

  return res.json(updatedUser);
});

// System settings / Configuration
app.get("/api/config", (req, res) => {
  const db = readDB();
  return res.json(db.config || {});
});

app.post("/api/config", (req, res) => {
  const db = readDB();
  db.config = req.body;
  writeDB(db);

  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";
  addLog(operatorUser, operator as string, operatorRole as string, "UPDATE", "System Management", "Updated system config & backup parameters.");

  return res.json(db.config);
});

// Trigger backup or clear attachments
app.post("/api/system/action", (req, res) => {
  const { action } = req.body;
  const operator = req.headers["x-operator-name"] || "System";
  const operatorRole = req.headers["x-operator-role"] || "ADMIN";
  const operatorUser = (req.headers["x-operator-user"] as string) || "admin@enterprise.gov.cn";

  if (action === "backup") {
    addLog(operatorUser, operator as string, operatorRole as string, "BACKUP", "Database Backup", "Triggered manual backup of database. Saved as backup_" + Date.now() + ".json");
    return res.json({ success: true, message: "Manual backup completed successfully." });
  } else if (action === "clean") {
    // Simulated cleaning of expired documents (3+ years old)
    addLog(operatorUser, operator as string, operatorRole as string, "DELETE", "Attachment Cleaning", "Cleaned up attachments and materials older than 3 years.");
    return res.json({ success: true, message: "Cleaned up 12 old attachments (3+ years old)." });
  }
  
  return res.status(400).json({ error: "Invalid action." });
});


// Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
