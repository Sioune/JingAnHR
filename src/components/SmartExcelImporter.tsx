import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  FileSpreadsheet, Upload, AlertCircle, Check, X, ChevronRight, 
  Settings, ArrowRight, RefreshCw, Layers, Info, CheckSquare, Square, Plus, Trash2, HelpCircle
} from "lucide-react";
import { Enterprise, SystemTags } from "../types";

interface SmartExcelImporterProps {
  existingEnterprises: Enterprise[];
  tags: SystemTags;
  onImportCompleted: (importedData: any[]) => void;
  onClose: () => void;
}

interface SheetInfo {
  name: string;
  rowCount: number;
  headers: string[];
  selected: boolean;
}

interface RawDataRow {
  sheetName: string;
  rowIdx: number;
  row: any[];
}

interface MappedRow {
  sheetName: string;
  rowIdx: number;
  data: Partial<Enterprise> & { customFields?: { [key: string]: any } };
  status: "ready" | "conflict" | "invalid";
  errors: string[];
  selected: boolean;
}

const FIELD_DEFINITIONS = [
  { key: "name", label: "企业全称", required: true, synonyms: ["企业名称", "公司名称", "公司全称", "企业全称", "单位名称", "名称", "企业", "公司", "name", "enterprise", "company"] },
  { key: "creditCode", label: "统一社会信用代码", required: false, synonyms: ["信用代码", "统一社会信用代码", "社会信用代码", "工商代码", "税号", "工商注册号", "credit", "code", "creditcode", "socialcreditcode"] },
  { key: "industry", label: "产业重点方向", required: false, synonyms: ["行业分类", "产业分类", "产业重点方向", "行业", "产业", "industry", "category"] },
  { key: "address", label: "注册地址", required: false, synonyms: ["注册地址", "地址", "公司地址", "企业地址", "办公地址", "address", "location"] },
  { key: "establishedDate", label: "成立日期", required: false, synonyms: ["成立日期", "成立时间", "注册时间", "established", "date"] },
  { key: "intro", label: "企业背景简介", required: false, synonyms: ["简介", "公司简介", "企业简介", "介绍", "intro", "introduction"] },
  { key: "website", label: "官方网站", required: false, synonyms: ["网址", "公司网址", "企业网址", "网站", "website", "url"] },
  { key: "contactName", label: "联系人姓名", required: false, synonyms: ["联系人", "联系人姓名", "负责人", "专线主管", "contact", "contactname"] },
  { key: "contactPhone", label: "联系电话", required: false, synonyms: ["联系电话", "电话", "联系人电话", "手机", "手机号", "phone", "mobile"] },
  { key: "contactTitle", label: "联系人职务", required: false, synonyms: ["联系人职务", "职务", "联系人职称", "title", "contacttitle"] },
  { key: "employeeCount", label: "总员工人数", required: false, synonyms: ["员工人数", "人数", "员工总量", "总人数", "员工数", "employees", "staff"] },
  { key: "revenueScale", label: "营收资产规模", required: false, synonyms: ["营收规模", "年产值", "营业收入", "营收", "规模", "revenue", "scale"] },
  { key: "isHighTech", label: "是否高新技术企业", required: false, synonyms: ["高新技术企业", "高新", "高企", "hightech"] },
  { key: "isSpecializedNew", label: "是否专精特新企业", required: false, synonyms: ["专精特新", "specialized"] },
  { key: "isLittleGiant", label: "是否小巨人企业", required: false, synonyms: ["小巨人", "littlegiant"] },
  { key: "isGazelle", label: "是否瞪羚企业", required: false, synonyms: ["瞪羚企业", "瞪羚", "gazelle"] },
  { key: "researchStaffCount", label: "研发人数", required: false, synonyms: ["研发人数", "研发员工", "研发headcount", "researchstaff"] },
  { key: "researchStaffRatio", label: "研发经费占比", required: false, synonyms: ["研发比例", "研发经费比重", "研发人数占比", "researchratio"] },
  { key: "patentsCount", label: "自主专利总量", required: false, synonyms: ["专利数", "自主专利", "专利总量", "专利", "patents"] }
];

export default function SmartExcelImporter({ 
  existingEnterprises, 
  tags, 
  onImportCompleted, 
  onClose 
}: SmartExcelImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  
  // Sheet details
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  
  // Master aggregate data across selected sheets
  const [allUniqueHeaders, setAllUniqueHeaders] = useState<string[]>([]);
  const [headerToSheets, setHeaderToSheets] = useState<{ [header: string]: string[] }>({});
  
  // Column alignment mappings (fieldKey -> Header Name)
  const [columnMap, setColumnMap] = useState<{ [key: string]: string }>({});
  
  // Dynamic fields configured to import as Custom Attributes (headerName -> boolean)
  const [customFieldsToImport, setCustomFieldsToImport] = useState<string[]>([]);

  // Wizard steps & states
  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [importing, setImporting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingPercent, setProcessingPercent] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<"overwrite" | "skip">("overwrite");
  const [parsedRows, setParsedRows] = useState<MappedRow[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect header row index for a sheet
  const detectHeaderRowIdxForSheet = (rawData: any[][]): number => {
    let detectedHeaderIdx = 0;
    let maxMatches = -1;
    const synonymsLower = FIELD_DEFINITIONS.flatMap(f => f.synonyms.map(s => s.toLowerCase()));

    const scanLimit = Math.min(rawData.length, 12);
    for (let r = 0; r < scanLimit; r++) {
      const row = rawData[r];
      if (!Array.isArray(row) || row.length < 2) continue;
      
      let matches = 0;
      row.forEach(cell => {
        const valStr = String(cell).trim().toLowerCase();
        if (valStr && synonymsLower.some(syn => valStr.includes(syn) || syn.includes(valStr))) {
          matches++;
        }
      });

      if (matches > maxMatches && row.length >= 2) {
        maxMatches = matches;
        detectedHeaderIdx = r;
      }
    }
    return detectedHeaderIdx;
  };

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls"))) {
      processFile(droppedFile);
    } else {
      setErrorFeedback("仅支持上传 Excel (.xlsx / .xls) 格式文件。");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  // 1. Process Loaded Excel File and detect all sheets
  const processFile = (fileToProcess: File) => {
    setFile(fileToProcess);
    setErrorFeedback(null);
    sheetHeadersCacheRef.current = {}; // Reset headers cache
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        setWorkbook(wb);
        
        // Scan each sheet
        const sheetsFound: SheetInfo[] = wb.SheetNames.map(name => {
          const sheet = wb.Sheets[name];
          const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          const headerRowIdx = detectHeaderRowIdxForSheet(rawData);
          const headers = (rawData[headerRowIdx] || []).map(h => String(h).trim()).filter(Boolean);
          const rowCount = Math.max(0, rawData.length - headerRowIdx - 1);

          return {
            name,
            rowCount,
            headers,
            selected: rowCount > 0 // Auto select sheets with rows
          };
        });

        setSheets(sheetsFound);

        // Compute union of headers across selected sheets
        compileAggregatedHeaders(wb, sheetsFound);
        setStep("mapping");
      } catch (err: any) {
        console.error(err);
        setErrorFeedback(`解析 Excel 文件失败: ${err.message || "未知错误"}`);
      }
    };
    reader.readAsArrayBuffer(fileToProcess);
  };

  // Compile aggregate headers from selected sheets
  const compileAggregatedHeaders = (wb: XLSX.WorkBook, currentSheets: SheetInfo[]) => {
    const activeSheets = currentSheets.filter(s => s.selected);
    const uniqueHeadersSet = new Set<string>();
    const mapping: { [header: string]: string[] } = {};

    activeSheets.forEach(sheetInfo => {
      sheetInfo.headers.forEach(h => {
        uniqueHeadersSet.add(h);
        if (!mapping[h]) mapping[h] = [];
        mapping[h].push(sheetInfo.name);
      });
    });

    const list = Array.from(uniqueHeadersSet);
    setAllUniqueHeaders(list);
    setHeaderToSheets(mapping);

    // Dynamic initial fuzzy matching for predefined fields
    const newMap: { [key: string]: string } = {};
    FIELD_DEFINITIONS.forEach(field => {
      let matchedHeader = "";
      
      // 1. Precise Match
      for (const header of list) {
        if (field.synonyms.some(syn => syn.toLowerCase() === header.toLowerCase())) {
          matchedHeader = header;
          break;
        }
      }

      // 2. Fuzzy Containment Match
      if (!matchedHeader) {
        for (const header of list) {
          if (field.synonyms.some(syn => header.toLowerCase().includes(syn.toLowerCase()) || syn.toLowerCase().includes(header.toLowerCase()))) {
            matchedHeader = header;
            break;
          }
        }
      }

      newMap[field.key] = matchedHeader; // Empty string if no match
    });

    setColumnMap(newMap);
    setCustomFieldsToImport([]); // Reset custom fields
  };

  // Handle individual Sheet Selection Checkbox toggle
  const toggleSheetSelection = (sheetName: string) => {
    if (!workbook) return;
    const updatedSheets = sheets.map(s => s.name === sheetName ? { ...s, selected: !s.selected } : s);
    setSheets(updatedSheets);
    compileAggregatedHeaders(workbook, updatedSheets);
  };

  // Cache for sheet full headers to avoid repetitive XLSX.utils.sheet_to_json calls during row parsing
  const sheetHeadersCacheRef = useRef<{ [sheetName: string]: string[] }>({});

  // Helper to query cell value in a sheet-agnostic way
  const getCellValueByHeader = (rawRow: RawDataRow, headerName: string): any => {
    if (!headerName || !workbook) return "";
    
    let headers = sheetHeadersCacheRef.current[rawRow.sheetName];
    if (!headers) {
      const sheet = workbook.Sheets[rawRow.sheetName];
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const headerRowIdx = detectHeaderRowIdxForSheet(rawData);
      headers = (rawData[headerRowIdx] || []).map(h => String(h).trim());
      sheetHeadersCacheRef.current[rawRow.sheetName] = headers;
    }

    const colIdx = headers.indexOf(headerName);
    if (colIdx !== -1) {
      return rawRow.row[colIdx];
    }
    return "";
  };

  // Deduplication Helpers:
  // Get all columns currently mapped to predefined fields
  const getMappedPredefinedHeaders = (): string[] => {
    return Object.keys(columnMap).map(key => columnMap[key]).filter(Boolean);
  };

  // Check if a header is mapped (predefined or custom)
  const isHeaderMapped = (header: string): boolean => {
    return getMappedPredefinedHeaders().includes(header) || customFieldsToImport.includes(header);
  };

  // Set individual unmapped column as custom field
  const addAsCustomField = (header: string) => {
    if (isHeaderMapped(header)) return;
    setCustomFieldsToImport(prev => [...prev, header]);
  };

  // Remove custom field mapping
  const removeCustomField = (header: string) => {
    setCustomFieldsToImport(prev => prev.filter(h => h !== header));
  };

  // One-Click Import All Unmapped Columns as Custom Fields
  const handleAutoMapAllRemaining = () => {
    const unmapped = allUniqueHeaders.filter(h => !isHeaderMapped(h));
    setCustomFieldsToImport(prev => [...prev, ...unmapped]);
  };

  const handleMapChange = (fieldKey: string, headerName: string) => {
    setColumnMap(prev => ({
      ...prev,
      [fieldKey]: headerName
    }));
  };

  // Proceed to Preview Verification
  const handleProceedToPreview = () => {
    if (!columnMap["name"]) {
      setErrorFeedback("【企业全称】是不可或缺的必须字段，请完成该字段的列名对齐！");
      return;
    }

    setErrorFeedback(null);
    generateParsedRowsAsync();
  };

  // Type converters
  const parseBoolean = (val: any): boolean => {
    if (val === undefined || val === null) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    const str = String(val).trim().toLowerCase();
    if (!str) return false;
    
    // Check if it clearly means "No" / is empty / negative placeholder
    const isNegative = ["否", "无", "不对", "没有", "no", "n", "false", "0", "非", "null", "undefined", "—", "-", "/"].some(term => str === term || str.includes(term));
    if (isNegative) return false;
    
    // Otherwise, if it has any characters, since it's mapped to a boolean field (e.g. "isSpecializedNew")
    // and is not a negative term, it represents a positive qualification (e.g. "专精特新", "高新技术企业") or "是", "yes", "1", etc.
    return true;
  };

  const parseNumber = (val: any): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = Number(String(val).replace(/[^0-9.]/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const normalizeCreditCode = (val: any): string => {
    if (!val) return "";
    return String(val).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const normalizeRevenueScale = (val: any): string => {
    if (!val) return "10M - 100M CNY";
    const str = String(val).trim();
    if (str.includes("> 5B") || str.includes("50亿") || str.includes("50亿元") || str.includes("50亿以上")) {
      return "> 5B CNY";
    }
    if (str.includes("1B - 5B") || str.includes("10亿") || str.includes("10亿元") || str.includes("十亿")) {
      return "1B - 5B CNY";
    }
    if (str.includes("100M - 500M") || str.includes("1亿") || str.includes("1亿元") || str.includes("一亿")) {
      return "100M - 500M CNY";
    }
    return "10M - 100M CNY";
  };

  // Compile row aggregates across selected sheets using mapped columns asynchronously in non-blocking chunks
  const generateParsedRowsAsync = () => {
    if (!workbook) return;
    setIsProcessing(true);
    setProcessingPercent(0);
    setProcessingStatus("正在初始化解析引擎，载入工作簿数据...");

    const activeSheets = sheets.filter(s => s.selected);
    const allRowsToProcess: { sheetName: string; rowIdx: number; row: any[] }[] = [];

    let sheetIndex = 0;

    const loadNextSheet = () => {
      if (sheetIndex < activeSheets.length) {
        const sheetInfo = activeSheets[sheetIndex];
        setProcessingStatus(`正在提取工作表 [${sheetInfo.name}] 的行数据...`);
        setProcessingPercent(Math.round((sheetIndex / activeSheets.length) * 15));

        setTimeout(() => {
          try {
            const sheet = workbook.Sheets[sheetInfo.name];
            const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            const headerRowIdx = detectHeaderRowIdxForSheet(rawData);

            for (let r = headerRowIdx + 1; r < rawData.length; r++) {
              const row = rawData[r];
              if (!row || row.every(cell => cell === "" || cell === undefined)) continue;
              allRowsToProcess.push({
                sheetName: sheetInfo.name,
                rowIdx: r,
                row
              });
            }
          } catch (e) {
            console.error(e);
          }
          sheetIndex++;
          loadNextSheet();
        }, 16);
      } else {
        processRowsInChunks(allRowsToProcess);
      }
    };

    const processRowsInChunks = (rows: { sheetName: string; rowIdx: number; row: any[] }[]) => {
      const total = rows.length;
      if (total === 0) {
        setParsedRows([]);
        setIsProcessing(false);
        setStep("preview");
        return;
      }

      const list: MappedRow[] = [];
      let currentIndex = 0;
      const chunkSize = 200; // Process 200 rows at a time for optimal rendering and high responsiveness

      const nextChunk = () => {
        const end = Math.min(currentIndex + chunkSize, total);
        setProcessingStatus(`正在清洗对齐并轨数据: 第 ${currentIndex + 1} 至 ${end} 行 (共 ${total} 行)...`);
        const percent = 15 + Math.round((currentIndex / total) * 85);
        setProcessingPercent(percent);

        for (let i = currentIndex; i < end; i++) {
          const task = rows[i];
          const rawRowObj: RawDataRow = {
            sheetName: task.sheetName,
            rowIdx: task.rowIdx,
            row: task.row
          };

          const errors: string[] = [];
          let status: MappedRow["status"] = "ready";

          const nameVal = getCellValueByHeader(rawRowObj, columnMap["name"]);
          const creditVal = getCellValueByHeader(rawRowObj, columnMap["creditCode"]);

          const name = nameVal ? String(nameVal).trim() : "";
          const creditCode = normalizeCreditCode(creditVal);

          if (!name) {
            errors.push("表格中此行缺失企业名称");
            status = "invalid";
          }

          if (creditCode && creditCode.length !== 18) {
            errors.push(`信用代码 ${creditCode} 长度为 ${creditCode.length} 位 (标准格式应为 18 位)`);
          }

          // Check duplicates
          if (status !== "invalid") {
            if (creditCode) {
              const isDuplicate = existingEnterprises.some(e => e.creditCode === creditCode);
              if (isDuplicate) {
                status = "conflict";
              }
            } else if (name) {
              const isDuplicate = existingEnterprises.some(e => e.name === name);
              if (isDuplicate) {
                status = "conflict";
              }
            }
          }

          // Extract predefined fields
          const industry = columnMap["industry"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["industry"])).trim()
            : tags.industries?.[0] || "Information Technology";

          const address = columnMap["address"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["address"])).trim() 
            : "";

          const establishedDate = columnMap["establishedDate"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["establishedDate"])).trim() 
            : "";

          const intro = columnMap["intro"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["intro"])).trim() 
            : "";

          const website = columnMap["website"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["website"])).trim() 
            : "";

          const contactName = columnMap["contactName"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["contactName"])).trim() 
            : "";

          const contactPhone = columnMap["contactPhone"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["contactPhone"])).trim() 
            : "";

          const contactTitle = columnMap["contactTitle"] 
            ? String(getCellValueByHeader(rawRowObj, columnMap["contactTitle"])).trim() 
            : "政企主管";

          const rawEmployeeCountVal = columnMap["employeeCount"] ? getCellValueByHeader(rawRowObj, columnMap["employeeCount"]) : "";
          const employeeCount = (rawEmployeeCountVal !== undefined && rawEmployeeCountVal !== null && rawEmployeeCountVal !== "")
            ? parseNumber(rawEmployeeCountVal) 
            : null;

          const rawRevenueScaleVal = columnMap["revenueScale"] ? getCellValueByHeader(rawRowObj, columnMap["revenueScale"]) : "";
          const revenueScale = (rawRevenueScaleVal !== undefined && rawRevenueScaleVal !== null && rawRevenueScaleVal !== "")
            ? normalizeRevenueScale(rawRevenueScaleVal) 
            : "";

          const isHighTech = columnMap["isHighTech"] 
            ? parseBoolean(getCellValueByHeader(rawRowObj, columnMap["isHighTech"])) 
            : false;

          const isSpecializedNew = columnMap["isSpecializedNew"] 
            ? parseBoolean(getCellValueByHeader(rawRowObj, columnMap["isSpecializedNew"])) 
            : false;

          const isLittleGiant = columnMap["isLittleGiant"] 
            ? parseBoolean(getCellValueByHeader(rawRowObj, columnMap["isLittleGiant"])) 
            : false;

          const isGazelle = columnMap["isGazelle"] 
            ? parseBoolean(getCellValueByHeader(rawRowObj, columnMap["isGazelle"])) 
            : false;

          const rawResearchStaffCountVal = columnMap["researchStaffCount"] ? getCellValueByHeader(rawRowObj, columnMap["researchStaffCount"]) : "";
          const researchStaffCount = (rawResearchStaffCountVal !== undefined && rawResearchStaffCountVal !== null && rawResearchStaffCountVal !== "")
            ? parseNumber(rawResearchStaffCountVal) 
            : null;

          const rawResearchStaffRatioVal = columnMap["researchStaffRatio"] ? getCellValueByHeader(rawRowObj, columnMap["researchStaffRatio"]) : "";
          const researchStaffRatio = (rawResearchStaffRatioVal !== undefined && rawResearchStaffRatioVal !== null && rawResearchStaffRatioVal !== "")
            ? String(rawResearchStaffRatioVal).trim() 
            : "";

          const rawPatentsCountVal = columnMap["patentsCount"] ? getCellValueByHeader(rawRowObj, columnMap["patentsCount"]) : "";
          const patentsCount = (rawPatentsCountVal !== undefined && rawPatentsCountVal !== null && rawPatentsCountVal !== "")
            ? parseNumber(rawPatentsCountVal) 
            : null;

          // Compile customFields
          const customFields: { [key: string]: any } = {};
          customFieldsToImport.forEach(headerName => {
            const val = getCellValueByHeader(rawRowObj, headerName);
            if (val !== undefined && val !== null && val !== "") {
              customFields[headerName] = val;
            }
          });

          list.push({
            sheetName: task.sheetName,
            rowIdx: task.rowIdx,
            status,
            errors,
            selected: status !== "invalid",
            data: {
              name,
              creditCode,
              industry,
              address,
              establishedDate,
              intro,
              website,
              contactName,
              contactPhone,
              contactTitle,
              employeeCount,
              revenueScale,
              isHighTech,
              isSpecializedNew,
              isLittleGiant,
              isGazelle,
              researchStaffCount,
              researchStaffRatio,
              patentsCount,
              isAboveScale: employeeCount > 100,
              isSteadyGrowth: true,
              customFields
            }
          });
        }

        currentIndex = end;

        if (currentIndex < total) {
          setTimeout(nextChunk, 0);
        } else {
          setParsedRows(list);
          setIsProcessing(false);
          setStep("preview");
        }
      };

      nextChunk();
    };

    loadNextSheet();
  };

  const toggleRowSelect = (idx: number) => {
    setParsedRows(prev => prev.map((row, i) => i === idx ? { ...row, selected: !row.selected } : row));
  };

  const toggleSelectAll = (checked: boolean) => {
    setParsedRows(prev => prev.map(row => row.status !== "invalid" ? { ...row, selected: checked } : row));
  };

  const handleStartImport = async () => {
    const recordsToImport = parsedRows.filter(r => r.selected);
    if (recordsToImport.length === 0) {
      setErrorFeedback("您未勾选选择任何需要并轨导入的企业。");
      return;
    }

    setImporting(true);
    setErrorFeedback(null);

    try {
      const payloadList = recordsToImport.map(r => {
        const item = { ...r.data };
        const isConflict = existingEnterprises.some(e => e.creditCode === item.creditCode);
        if (isConflict && conflictStrategy === "skip") {
          return null;
        }

        return {
          ...item,
          isConflict: isConflict,
          existingId: existingEnterprises.find(e => e.creditCode === item.creditCode)?.id || null
        };
      }).filter(Boolean);

      const response = await fetch("/api/enterprises/import-smart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          enterprises: payloadList,
          conflictStrategy
        })
      });

      if (response.ok) {
        const result = await response.json();
        onImportCompleted(result.data || []);
      } else {
        const errObj = await response.json();
        setErrorFeedback(errObj.error || "大批量清洗导入写入数据库失败，请核查格式。");
      }
    } catch (err: any) {
      console.error(err);
      setErrorFeedback(`批量并轨导入网络异常: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" id="smart-excel-importer-container">
        
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>骨干企业智能多工作表(Sheet)清洗并轨系统</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              完全载入任意个 Sheet 及数万条记录，去重排除，并支持未知列名一键动态扩容导入、确保数据完整不丢失。
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Track */}
        <div className="bg-slate-100/50 border-b border-slate-200/50 px-8 py-2.5 flex items-center space-x-8 text-xs font-semibold text-slate-400">
          <div className={`flex items-center space-x-2 ${step === "upload" ? "text-blue-600 font-bold" : "text-slate-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === "upload" ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-slate-200 border-slate-300"}`}>1</span>
            <span>解析 Excel 子表</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
          <div className={`flex items-center space-x-2 ${step === "mapping" ? "text-blue-600 font-bold" : step === "preview" ? "text-emerald-700" : "text-slate-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === "mapping" ? "bg-blue-50 border-blue-600 text-blue-600" : step === "preview" ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "bg-slate-200 border-slate-300"}`}>2</span>
            <span>列名绑定与扩容</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5" />
          <div className={`flex items-center space-x-2 ${step === "preview" ? "text-blue-600 font-bold" : "text-slate-500"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] ${step === "preview" ? "bg-blue-50 border-blue-600 text-blue-600" : "bg-slate-200 border-slate-300"}`}>3</span>
            <span>核准并轨</span>
          </div>
        </div>

        {/* Error Bar */}
        {errorFeedback && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-3 flex items-start space-x-2.5 text-xs text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorFeedback}</span>
          </div>
        )}

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6" id="wizard-step-body">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 space-y-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-md border border-blue-100 relative">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white"></span>
              </div>
              
              <div className="space-y-2 max-w-md">
                <h4 className="text-sm font-bold text-slate-800">
                  大容量数据并轨清洗引擎正在高效作业中
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  我们正在采用非阻塞切片式异步清洗算法，多线程级调度，确保即便处理数万行数据，您的浏览器界面依然流畅自然，绝不卡死。
                </p>
              </div>

              {/* Progress Container */}
              <div className="w-full max-w-md bg-slate-100 rounded-full h-3 border border-slate-200 overflow-hidden relative shadow-inner">
                <div 
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-full transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${processingPercent}%` }}
                ></div>
              </div>

              {/* Status and Percentage */}
              <div className="space-y-1 text-center">
                <span className="text-[13px] font-bold text-blue-600 font-mono">
                  {processingPercent}%
                </span>
                <p className="text-xs text-slate-500 font-medium font-mono truncate max-w-lg bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-lg shadow-2xs">
                  {processingStatus}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: UPLOAD */}
              {step === "upload" && (
            <div className="space-y-6 py-4">
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={handleFileSelectClick}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-slate-50/50 rounded-xl p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">点击或将您的 Excel 文件拖拽到这里上传</p>
                  <p className="text-xs text-slate-400 mt-1.5">支持大容量包含多个 Sheet 的 .xlsx / .xls 电子表格</p>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx, .xls"
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest flex items-center">
                  <Info className="w-3.5 h-3.5 mr-1" />
                  骨干企业清洗引擎 2.0 特色
                </span>
                <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                  <li><strong>全工作簿扫描：</strong>自动检测并载入 Excel 中的所有子 Sheet，您可以灵活勾选哪些工作表参与汇总导入。</li>
                  <li><strong>非定规扩容技术：</strong>除了系统原生的十几项骨干指标，您的 Excel 任何自定义列（如注册资本、经营范围等）均能一键转换自动同步，数据零丢失。</li>
                  <li><strong>对齐去重：</strong>支持按已被绑定的列头在其他下拉菜单中排除，不搞混、更直观。</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === "mapping" && (
            <div className="space-y-6">
              
              {/* Sheet Select Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center">
                  <Layers className="w-4 h-4 text-blue-600 mr-1.5" />
                  选择参与本次汇总导入的工作表 (Sheet)
                </span>
                
                <div className="flex flex-wrap gap-2">
                  {sheets.map((sheet, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => toggleSheetSelection(sheet.name)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer ${
                        sheet.selected 
                          ? "bg-white border-blue-500 text-blue-700 shadow-xs" 
                          : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                      }`}
                    >
                      <span>{sheet.selected ? "☑" : "☐"}</span>
                      <span className="font-bold">{sheet.name}</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                        {sheet.rowCount} 行
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Mapping Form with option exclusion */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>要素与 Excel 列名对齐 (一键去重对齐)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                    去重模式：已匹配的列名会自动在其他下拉框中排除，避免混淆
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FIELD_DEFINITIONS.map((field) => {
                    const currentHeader = columnMap[field.key] || "";
                    const isMapped = !!currentHeader;

                    // Available headers for this specific field is:
                    // headers that are NOT mapped to other fields, plus current mapped header for this field.
                    const otherMappedHeaders = getMappedPredefinedHeaders().filter(h => h !== currentHeader);
                    const availableHeaders = allUniqueHeaders.filter(h => !otherMappedHeaders.includes(h) && !customFieldsToImport.includes(h));

                    return (
                      <div 
                        key={field.key} 
                        className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                          isMapped 
                            ? "bg-emerald-50/15 border-emerald-200" 
                            : field.required 
                              ? "bg-red-50/30 border-red-200 animate-pulse" 
                              : "bg-slate-50/20 border-slate-200/50 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-800 flex items-center">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1 font-bold">*</span>}
                          </span>
                          <p className="text-[10px] text-slate-400 truncate">别名参考: {field.synonyms.slice(0, 4).join(", ")}</p>
                        </div>

                        <div className="shrink-0 min-w-[200px]">
                          <select 
                            value={currentHeader}
                            onChange={(e) => handleMapChange(field.key, e.target.value)}
                            className={`w-full px-2.5 py-1.5 rounded text-xs focus:outline-none cursor-pointer border ${
                              isMapped 
                                ? "bg-white border-emerald-300 text-slate-800 font-semibold" 
                                : "bg-white border-slate-200 text-slate-400"
                            }`}
                          >
                            <option value="">-- 暂不绑定此列 --</option>
                            {availableHeaders.map((headerName, hIdx) => {
                              const foundSheets = headerToSheets[headerName] || [];
                              return (
                                <option key={hIdx} value={headerName}>
                                  {headerName} ({foundSheets.join(",")})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Field Expansion Panel (The Core requested feature!) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center">
                      <Plus className="w-4.5 h-4.5 text-blue-600 mr-1 shrink-0" />
                      <span>未映射列名 - 一键生成新增字段 (数据库自动无缝扩容)</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      为了不丢失原始表格的数据，您可以把未对齐的列设为“自定义扩展字段”。这些数据会自动同步采纳在企业档案中。
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAutoMapAllRemaining}
                    disabled={allUniqueHeaders.filter(h => !isHeaderMapped(h)).length === 0}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1 shrink-0"
                  >
                    <span>✨ 一键将所有未映射列转为自定义扩展字段</span>
                  </button>
                </div>

                {/* Listing unmapped columns */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>剩余未映射 Excel 列：<strong>{allUniqueHeaders.filter(h => !isHeaderMapped(h)).length}</strong> 个</span>
                    <span>已激活的自定义扩展列：<strong>{customFieldsToImport.length}</strong> 个</span>
                  </div>

                  {/* Badges container */}
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 bg-white border border-slate-150 rounded-lg">
                    {allUniqueHeaders.length === 0 ? (
                      <span className="text-xs text-slate-400 p-2">未检测到任何列头</span>
                    ) : (
                      allUniqueHeaders.map((header, hIdx) => {
                        const isMappedAsPredefined = getMappedPredefinedHeaders().includes(header);
                        const isMappedAsCustom = customFieldsToImport.includes(header);

                        if (isMappedAsPredefined) return null;

                        return (
                          <div 
                            key={hIdx}
                            className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-2.5 transition-all ${
                              isMappedAsCustom 
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold" 
                                : "bg-slate-50 border-slate-200 text-slate-600"
                            }`}
                          >
                            <span>{header}</span>
                            {isMappedAsCustom ? (
                              <button
                                type="button"
                                onClick={() => removeCustomField(header)}
                                className="text-red-500 hover:text-red-700 font-bold hover:bg-red-50 px-1 rounded transition-all shrink-0"
                                title="移出扩展字段"
                              >
                                ✕
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addAsCustomField(header)}
                                className="text-blue-600 hover:text-blue-800 font-bold hover:bg-blue-50 px-1 rounded transition-all shrink-0"
                                title="设为自定义扩展字段"
                              >
                                + 设为扩展
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                    {allUniqueHeaders.filter(h => !isHeaderMapped(h)).length === 0 && (
                      <div className="text-xs text-slate-400 p-3 flex items-center space-x-1 w-full justify-center">
                        <Check className="w-4 h-4 text-emerald-600 font-bold" />
                        <span>所有的字段都已经对齐映射/设置为自定义扩展列完毕，无未映射列！</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === "preview" && (
            <div className="space-y-6">
              
              {/* Conflict Strategy Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center">
                    <RefreshCw className="w-4 h-4 text-blue-600 mr-1.5" />
                    <span>库中存量并轨排重策略</span>
                  </span>
                  <p className="text-[11px] text-slate-400">若信用代码在现有数据库中已存在，采用何种清洗模式：</p>
                </div>

                <div className="flex items-center space-x-3 text-xs bg-white p-2 rounded-lg border border-slate-200 shrink-0">
                  <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="conflict-strategy" 
                      checked={conflictStrategy === "overwrite"}
                      onChange={() => setConflictStrategy("overwrite")}
                      className="text-blue-600"
                    />
                    <span>合并覆盖更新数据 (Overwrite)</span>
                  </label>
                  <span className="text-slate-300">|</span>
                  <label className="flex items-center space-x-1.5 cursor-pointer font-bold text-slate-700">
                    <input 
                      type="radio" 
                      name="conflict-strategy" 
                      checked={conflictStrategy === "skip"}
                      onChange={() => setConflictStrategy("skip")}
                      className="text-blue-600"
                    />
                    <span>跳过不导入 (Skip)</span>
                  </label>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-150 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="checkbox" 
                      checked={parsedRows.length > 0 && parsedRows.filter(r => r.status !== "invalid").every(r => r.selected)}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="text-blue-600 rounded cursor-pointer"
                    />
                    <span>导入总览审核清单 (共 {parsedRows.length} 条有效记录)</span>
                  </div>
                  <div className="flex items-center space-x-4 text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 inline-block" />可直接导入: {parsedRows.filter(r => r.status === "ready").length}</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1 inline-block" />覆盖更新: {parsedRows.filter(r => r.status === "conflict").length}</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-500 mr-1 inline-block" />阻断(缺失信息): {parsedRows.filter(r => r.status === "invalid").length}</span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[45vh]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 pl-4 w-12">选择</th>
                        <th className="p-3 w-16 text-center">状态</th>
                        <th className="p-3 min-w-[150px]">子表来源 / 企业名称</th>
                        <th className="p-3 min-w-[150px] font-mono">社会信用代码</th>
                        <th className="p-3">产业重点方向</th>
                        <th className="p-3">扩展字段总量</th>
                        <th className="p-3">异常核查</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((row, idx) => {
                        const statusClass = 
                          row.status === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          row.status === "conflict" ? "bg-amber-50 text-amber-700 border-amber-100" :
                          "bg-red-50 text-red-700 border-red-100";

                        const statusLabel = 
                          row.status === "ready" ? "新录入" :
                          row.status === "conflict" ? "已存在" :
                          "阻断";

                        const customKeys = Object.keys(row.data.customFields || {});

                        return (
                          <tr 
                            key={idx} 
                            className={`hover:bg-slate-50/50 transition-all ${
                              !row.selected && row.status !== "invalid" ? "opacity-60 bg-slate-50/20" : ""
                            }`}
                          >
                            <td className="p-3 pl-4">
                              <input 
                                type="checkbox"
                                disabled={row.status === "invalid"}
                                checked={row.selected}
                                onChange={() => toggleRowSelect(idx)}
                                className="text-blue-600 rounded disabled:opacity-40 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-[10px] bg-slate-100 font-medium px-1.5 py-0.5 rounded text-slate-500 block w-max mb-1">
                                工作表: {row.sheetName}
                              </span>
                              <span className="font-bold text-slate-800 block truncate max-w-[240px]">{row.data.name}</span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-600">{row.data.creditCode}</td>
                            <td className="p-3 text-slate-500 font-medium">{row.data.industry}</td>
                            <td className="p-3">
                              {customKeys.length > 0 ? (
                                <div className="space-y-1">
                                  <span className="px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[10px]">
                                    {customKeys.length} 个扩展字段
                                  </span>
                                  <span className="block text-[9px] text-slate-400 max-w-[150px] truncate" title={customKeys.join(", ")}>
                                    {customKeys.slice(0, 2).join(", ")}{customKeys.length > 2 ? "..." : ""}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400 text-[10px]">
                              {row.errors.length > 0 ? (
                                <span className="text-red-500 font-semibold flex items-center space-x-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-[120px]">{row.errors[0]}</span>
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold flex items-center">
                                  <Check className="w-3.5 h-3.5 mr-0.5" />
                                  合格
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-150 px-6 py-4 flex items-center justify-between">
          <div>
            {step === "preview" && (
              <span className="text-xs font-semibold text-slate-500">
                准备并轨合并：已勾选 <strong className="text-blue-600">{parsedRows.filter(r => r.selected).length}</strong> / {parsedRows.filter(r => r.status !== "invalid").length} 家，包含共 <strong className="text-blue-600">{customFieldsToImport.length}</strong> 项动态扩容扩展指标。
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {step === "upload" && (
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                取消
              </button>
            )}

            {step === "mapping" && (
              <>
                <button 
                  type="button" 
                  disabled={isProcessing}
                  onClick={() => setStep("upload")}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-600 transition-all disabled:opacity-50 cursor-pointer"
                >
                  重新选择文件
                </button>
                <button 
                  type="button" 
                  disabled={isProcessing}
                  onClick={handleProceedToPreview}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在清洗并轨数据...</span>
                    </>
                  ) : (
                    <>
                      <span>下一步：校验汇总清单</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            {step === "preview" && (
              <>
                <button 
                  type="button" 
                  disabled={importing}
                  onClick={() => setStep("mapping")}
                  className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-600 transition-all disabled:opacity-50 cursor-pointer"
                >
                  上一步 (调整映射)
                </button>
                <button 
                  type="button" 
                  disabled={importing}
                  onClick={handleStartImport}
                  className="inline-flex items-center space-x-1.5 px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在导入并扩容数据库中...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>确认并完成导入 ({parsedRows.filter(r => r.selected).length}家)</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
