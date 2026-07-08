/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building2, Search, Filter, Plus, FileSpreadsheet, Download, Trash2, 
  Edit, Eye, Users, FileText, Check, X, ShieldAlert, Globe, Phone, 
  MapPin, Calendar, Award, BarChart3, TrendingUp, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { Enterprise, Talent, User, UserRole, SystemTags, translateIndustry } from "../types";
import SmartExcelImporter from "./SmartExcelImporter";

interface EnterpriseManagerProps {
  enterprises: Enterprise[];
  talents: Talent[];
  tags: SystemTags;
  user: User;
  onRefreshData: () => void;
}

export default function EnterpriseManager({ enterprises, talents, tags, user, onRefreshData }: EnterpriseManagerProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterScale, setFilterScale] = useState("");
  const [filterQual, setFilterQual] = useState(""); // Little Giant, High-tech, etc.
  const [filterAboveScale, setFilterAboveScale] = useState(""); // Above-scale status

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterIndustry, filterScale, filterQual, filterAboveScale]);

  // Modals / Details State
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(null);
  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId) || null;
  const setSelectedEnterprise = (ent: Enterprise | null) => {
    setSelectedEnterpriseId(ent ? ent.id : null);
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEnterpriseId, setEditingEnterpriseId] = useState<string | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState("");
  const [formCreditCode, setFormCreditCode] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEstDate, setFormEstDate] = useState("");
  const [formIntro, setFormIntro] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formContactPhone, setFormContactPhone] = useState("");
  const [formContactTitle, setFormContactTitle] = useState("");
  
  const [formIsHighTech, setFormIsHighTech] = useState(false);
  const [formIsSpecialized, setFormIsSpecialized] = useState(false);
  const [formIsLittleGiant, setFormIsLittleGiant] = useState(false);
  const [formIsGazelle, setFormIsGazelle] = useState(false);

  const [formEmployeeCount, setFormEmployeeCount] = useState<number | "">("");
  const [formRevenueScale, setFormRevenueScale] = useState("");
  const [formIsAboveScale, setFormIsAboveScale] = useState(false);
  const [formIsSteadyGrowth, setFormIsSteadyGrowth] = useState(false);
  
  const [formResearchStaffCount, setFormResearchStaffCount] = useState<number | "">("");
  const [formResearchRatio, setFormResearchRatio] = useState("");
  const [formPatentsCount, setFormPatentsCount] = useState<number | "">("");

  // Import / CSV text
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Alerts
  const [globalAlert, setGlobalAlert] = useState<{ type: "success" | "error", message: string } | null>(null);

  const showAlert = (type: "success" | "error", message: string) => {
    setGlobalAlert({ type, message });
    setTimeout(() => setGlobalAlert(null), 4000);
  };

  const canModify = user.role !== UserRole.QUERY_CLERK;
  const canDelete = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

  // Filter enterprises
  const filteredEnterprises = enterprises.filter(e => {
    const matchSearch = searchTerm === "" || 
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (e.creditCode && e.creditCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.contactName && e.contactName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchIndustry = filterIndustry === "" || e.industry === filterIndustry;
    const matchScale = filterScale === "" || e.revenueScale === filterScale;

    // Filter by qualifications checkboxes
    let matchQual = true;
    if (filterQual === "HighTech") matchQual = e.isHighTech;
    else if (filterQual === "Specialized") matchQual = e.isSpecializedNew;
    else if (filterQual === "LittleGiant") matchQual = e.isLittleGiant;
    else if (filterQual === "Gazelle") matchQual = e.isGazelle;

    // Filter by Above Scale
    let matchAboveScale = true;
    if (filterAboveScale === "AboveScale") matchAboveScale = e.isAboveScale;
    else if (filterAboveScale === "BelowScale") matchAboveScale = !e.isAboveScale;

    return matchSearch && matchIndustry && matchScale && matchQual && matchAboveScale;
  });

  const totalPages = Math.ceil(filteredEnterprises.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredEnterprises.length);
  const paginatedEnterprises = filteredEnterprises.slice(startIndex, endIndex);

  // Export Enterprises to CSV
  const exportToCSV = () => {
    try {
      const headers = ["企业名称", "统一社会信用代码", "注册地址", "成立日期", "行业分类", "企业网址", "高新技术企业(是/否)", "专精特新(是/否)", "小巨人(是/否)", "瞪羚企业(是/否)", "员工人数", "营收规模", "是否规上企业"];
      const rows = filteredEnterprises.map(e => [
        e.name,
        e.creditCode,
        e.address || "",
        e.establishedDate || "",
        e.industry,
        e.website || "",
        e.isHighTech ? "是" : "否",
        e.isSpecializedNew ? "是" : "否",
        e.isLittleGiant ? "是" : "否",
        e.isGazelle ? "是" : "否",
        e.employeeCount,
        e.revenueScale,
        e.isAboveScale ? "是" : "否"
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `重点监测企业导出表_${new Date().toLocaleDateString("zh-CN")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showAlert("success", `已成功导出 ${filteredEnterprises.length} 家重点监测企业记录`);
    } catch (err) {
      console.error(err);
      showAlert("error", "导出 CSV 失败");
    }
  };

  // Download Enterprise CSV Import Template
  const downloadTemplate = () => {
    const headers = ["企业名称(必填)", "统一社会信用代码(必填)", "行业分类", "注册地址", "联系人姓名", "联系人电话", "营收规模(10M - 100M CNY/100M - 500M CNY/> 5B CNY)", "高新技术企业(是/否)", "小巨人企业(是/否)", "员工人数"];
    const exampleRow = ["大疆先进制造有限公司", "91440300MA5P67Q8XX", "Advanced Manufacturing", "深圳市宝安区高新技术区D栋", "周经理", "13611112222", "> 5B CNY", "是", "是", "1450"];
    const csvContent = "\uFEFF" + [headers.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "重点企业批量录入模板.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import from pasted CSV
  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setImportFeedback("请输入企业 CSV 数据。");
      return;
    }

    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        setImportFeedback("请确保数据行包含表头！");
        return;
      }

      const parseCSVLine = (line: string) => {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const importedList = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 2 || !values[0] || !values[1]) continue;

        const name = values[0];
        const creditCode = values[1];
        const industry = values[2] || "Other";
        const address = values[3] || "";
        const contactName = values[4] || "";
        const contactPhone = values[5] || "";
        const revenueScale = values[6] || "10M - 100M CNY";
        const isHighTech = values[7] === "是" || values[7]?.toLowerCase() === "yes";
        const isLittleGiant = values[8] === "是" || values[8]?.toLowerCase() === "yes";
        const employeeCount = Number(values[9]) || 50;

        importedList.push({
          name,
          creditCode,
          industry,
          address,
          contactName,
          contactPhone,
          revenueScale,
          isHighTech,
          isSpecializedNew: isLittleGiant,
          isLittleGiant,
          isGazelle: false,
          employeeCount,
          isAboveScale: employeeCount > 100,
          isSteadyGrowth: true
        });
      }

      if (importedList.length === 0) {
        setImportFeedback("未检测到有效企业记录。请检查信用代码及字段。");
        return;
      }

      const response = await fetch("/api/enterprises/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify(importedList)
      });

      if (response.ok) {
        showAlert("success", `成功批量导入 ${importedList.length} 家监测企业档案！`);
        setIsImportModalOpen(false);
        setCsvText("");
        setImportFeedback(null);
        onRefreshData();
      } else {
        const data = await response.json();
        setImportFeedback(data.error || "服务器保存异常");
      }
    } catch (err) {
      console.error(err);
      setImportFeedback("解析发生致命格式错误。");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingEnterpriseId(null);
    setFormName("");
    setFormCreditCode("");
    setFormAddress("");
    setFormEstDate("");
    setFormIntro("");
    setFormIndustry("");
    setFormWebsite("");
    setFormContactName("");
    setFormContactPhone("");
    setFormContactTitle("");
    
    setFormIsHighTech(false);
    setFormIsSpecialized(false);
    setFormIsLittleGiant(false);
    setFormIsGazelle(false);

    setFormEmployeeCount("");
    setFormRevenueScale("");
    setFormIsAboveScale(false);
    setFormIsSteadyGrowth(false);
    
    setFormResearchStaffCount("");
    setFormResearchRatio("");
    setFormPatentsCount("");

    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (ent: Enterprise) => {
    setEditingEnterpriseId(ent.id);
    setFormName(ent.name);
    setFormCreditCode(ent.creditCode);
    setFormAddress(ent.address || "");
    setFormEstDate(ent.establishedDate || "");
    setFormIntro(ent.intro || "");
    setFormIndustry(ent.industry || "");
    setFormWebsite(ent.website || "");
    setFormContactName(ent.contactName || "");
    setFormContactPhone(ent.contactPhone || "");
    setFormContactTitle(ent.contactTitle || "");
    
    setFormIsHighTech(ent.isHighTech);
    setFormIsSpecialized(ent.isSpecializedNew);
    setFormIsLittleGiant(ent.isLittleGiant);
    setFormIsGazelle(ent.isGazelle);

    setFormEmployeeCount(ent.employeeCount || "");
    setFormRevenueScale(ent.revenueScale || "");
    setFormIsAboveScale(ent.isAboveScale);
    setFormIsSteadyGrowth(ent.isSteadyGrowth);
    
    setFormResearchStaffCount(ent.researchStaffCount || "");
    setFormResearchRatio(ent.researchStaffRatio || "");
    setFormPatentsCount(ent.patentsCount || "");

    setIsEditModalOpen(true);
  };

  // Save (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCreditCode.trim()) {
      showAlert("error", "企业名称和统一社会信用代码为核心必填要素。");
      return;
    }

    // Verify credit code format: 18 chars
    if (formCreditCode.trim().length !== 18) {
      if (!window.confirm("输入的社会信用代码不是标准的 18 位。确定以此进行强制登记吗？")) {
        return;
      }
    }

    const payload = {
      name: formName.trim(),
      creditCode: formCreditCode.trim().toUpperCase(),
      address: formAddress.trim(),
      establishedDate: formEstDate,
      intro: formIntro.trim(),
      industry: formIndustry,
      website: formWebsite.trim(),
      contactName: formContactName.trim(),
      contactPhone: formContactPhone.trim(),
      contactTitle: formContactTitle.trim(),
      isHighTech: formIsHighTech,
      isSpecializedNew: formIsSpecialized,
      isLittleGiant: formIsLittleGiant,
      isGazelle: formIsGazelle,
      employeeCount: formEmployeeCount === "" ? null : Number(formEmployeeCount),
      revenueScale: formRevenueScale,
      isAboveScale: formIsAboveScale,
      isSteadyGrowth: formIsSteadyGrowth,
      researchStaffCount: formResearchStaffCount === "" ? null : Number(formResearchStaffCount),
      researchStaffRatio: formResearchRatio,
      patentsCount: formPatentsCount === "" ? null : Number(formPatentsCount)
    };

    try {
      const method = editingEnterpriseId ? "PUT" : "POST";
      const url = editingEnterpriseId ? `/api/enterprises/${editingEnterpriseId}` : "/api/enterprises";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showAlert("success", editingEnterpriseId ? "企业档案更新成功" : "新增监测企业登记完成");
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        onRefreshData();
      } else {
        const errData = await response.json();
        showAlert("error", errData.error || "保存失败。");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络连接错误，无法保存企业。");
    }
  };

  // Delete Enterprise profile
  const handleDeleteEnterprise = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/enterprises/${id}`, {
        method: "DELETE",
        headers: {
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        }
      });

      if (response.ok) {
        showAlert("success", `已彻底剔除企业 "${name}"，对应人才关系已进行降维及解耦处置。`);
        setSelectedEnterprise(null);
        onRefreshData();
      } else {
        showAlert("error", "删除失败。");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络连接错误，无法删除。");
    }
  };

  const translateEducation = (edu: string) => {
    switch (edu) {
      case "Bachelor": return "学士/本科";
      case "Master": return "硕士研究生";
      case "Doctorate": return "博士研究生";
      case "Post-Doc": return "博士后科研人员";
      case "Other": return "其他学历阶段";
      default: return edu;
    }
  };

  const formatRevenueScale = (scale: string | null | undefined) => {
    if (!scale) return "暂未登记";
    switch (scale.trim()) {
      case "> 5B CNY":
        return "> 50亿人民币";
      case "1B - 5B CNY":
        return "10亿 - 50亿人民币";
      case "100M - 500M CNY":
        return "1亿 - 5亿人民币";
      case "10M - 100M CNY":
        return "1千万 - 1亿人民币";
      default:
        let formatted = scale;
        formatted = formatted.replace(/>\s*5B\s*CNY/gi, "> 50亿人民币");
        formatted = formatted.replace(/1B\s*-\s*5B\s*CNY/gi, "10亿 - 50亿人民币");
        formatted = formatted.replace(/100M\s*-\s*500M\s*CNY/gi, "1亿 - 5亿人民币");
        formatted = formatted.replace(/10M\s*-\s*100M\s*CNY/gi, "1千万 - 1亿人民币");
        formatted = formatted.replace(/CNY/gi, "人民币");
        return formatted;
    }
  };

  return (
    <div className="space-y-6" id="enterprise-manager-panel">
      {/* Toast Alert */}
      {globalAlert && (
        <div 
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 flex items-center space-x-3 text-sm transition-all border ${
            globalAlert.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
          }`}
          id="global-alert-toast"
        >
          <Check className="w-5 h-5 shrink-0" />
          <span>{globalAlert.message}</span>
        </div>
      )}

      {selectedEnterprise ? (
        /* ==================== 1. ENTERPRISE DETAILS SCREEN (FULL-WIDTH BENTO GRID) ==================== */
        <div className="space-y-6 animate-fade-in" id="enterprise-detail-page-container">
          {/* Breadcrumb / Actions Navigation bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/85 rounded-xl p-4 shadow-2xs gap-3">
            <div className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={() => setSelectedEnterprise(null)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <span>&larr; 返回重点监测企业列表</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">重点骨干监测企业综合资信档案</span>
            </div>

            <div className="flex items-center gap-2">
              {canModify && (
                <button 
                  type="button"
                  onClick={() => openEditModal(selectedEnterprise)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>编辑资信指标</span>
                </button>
              )}
              {canDelete && (
                <button 
                  type="button"
                  onClick={() => {
                    if (window.confirm(`确定要彻底吊销删除重点监测企业 "${selectedEnterprise.name}" 吗？此操作将使关联该企业的人才关系降维，且不可逆。`)) {
                      handleDeleteEnterprise(selectedEnterprise.id, selectedEnterprise.name);
                    }
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>彻底吊销删除</span>
                </button>
              )}
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Main Enterprise Profiles and Associated High-level Scholars */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-5">
                  <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-100 tracking-wider">
                      {translateIndustry(selectedEnterprise.industry)}
                    </span>
                    {selectedEnterprise.isLittleGiant && (
                      <span className="bg-red-50 text-red-700 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">国家级专精特新小巨人</span>
                    )}
                    {selectedEnterprise.isHighTech && (
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">国家高新技术企业</span>
                    )}
                    {selectedEnterprise.isSpecializedNew && (
                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">省级专精特新</span>
                    )}
                    {selectedEnterprise.isGazelle && (
                      <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold">瞪羚独角兽企业</span>
                    )}
                    {selectedEnterprise.isAboveScale && (
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">规上工业</span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-tight">{selectedEnterprise.name}</h2>
                  <p className="text-xs font-mono text-slate-400 mt-2 tracking-wider">统一社会信用代码: {selectedEnterprise.creditCode || "暂未公开"}</p>
                </div>

                {/* Grid info metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">年度营收及财务资产梯队</span>
                    <span className="font-bold text-slate-800 text-[13px]">{formatRevenueScale(selectedEnterprise.revenueScale)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">在册骨干员工总量</span>
                    <span className="font-bold text-slate-800 text-[13px]">
                      {selectedEnterprise.employeeCount ? `${selectedEnterprise.employeeCount} 人` : "暂无登记"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">工商设立登记日期</span>
                    <span className="font-bold text-slate-800 text-[13px] flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                      {selectedEnterprise.establishedDate || "暂无登记"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">所属主要行业分类</span>
                    <span className="font-bold text-slate-800 text-[13px]">{translateIndustry(selectedEnterprise.industry)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">企业官方互联网网址</span>
                    <span className="font-bold text-blue-600 text-[13px] flex items-center truncate">
                      <Globe className="w-4 h-4 mr-1.5 text-slate-400 shrink-0" />
                      {selectedEnterprise.website ? (
                        <a href={`http://${selectedEnterprise.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {selectedEnterprise.website}
                        </a>
                      ) : "未录入"}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                    <span className="text-slate-400 block font-medium">统计直报口径规模</span>
                    <span className={`font-bold text-[13px] ${selectedEnterprise.isAboveScale ? "text-emerald-600" : "text-slate-500"}`}>
                      {selectedEnterprise.isAboveScale ? "国家规模以上企业" : "规下成长型企业"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs pt-2">
                  <span className="text-slate-400 block font-medium">企业主办公注册地址</span>
                  <p className="font-bold text-slate-800 flex items-start text-sm leading-relaxed">
                    <MapPin className="w-4.5 h-4.5 mr-2 text-blue-600 shrink-0 mt-0.5" />
                    <span>{selectedEnterprise.address || "未备案注册地址"}</span>
                  </p>
                </div>

                {selectedEnterprise.intro && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-slate-400 block text-xs font-bold uppercase tracking-wider">企业经营宗旨、项目主营及背景简介</span>
                    <p className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl text-slate-700 text-xs leading-relaxed whitespace-pre-line font-normal">
                      {selectedEnterprise.intro}
                    </p>
                  </div>
                )}
              </div>

              {/* Scholar Mapping Directory */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Users className="w-4.5 h-4.5 text-blue-600" />
                    <span>绑定在本企业名下的在册高层次学者 ({talents.filter(t => t.enterpriseId === selectedEnterprise.id).length} 人)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">政企两端动态映射</span>
                </div>

                {talents.filter(t => t.enterpriseId === selectedEnterprise.id).length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-1.5">
                    <Users className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                    <p className="font-bold">暂无直接关联的高层次研究学者</p>
                    <p className="text-[10px]">请前往高层次人才库，添加或编辑人才档案时在此企业建立映射关联。</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {talents.filter(t => t.enterpriseId === selectedEnterprise.id).map((talent) => (
                      <div 
                        key={talent.id} 
                        className="flex items-center space-x-3.5 p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl hover:bg-slate-100/80 transition-all shadow-2xs"
                      >
                        <img 
                          src={talent.avatar} 
                          alt={talent.name} 
                          className="w-11 h-11 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0" 
                        />
                        <div className="min-w-0 flex-1 text-xs">
                          <span className="font-bold text-slate-900 block text-sm">{talent.name}</span>
                          <span className="text-slate-500 block truncate mt-0.5">{talent.title || "学术领军带头人"}</span>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                            {translateEducation(talent.education)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Archive of Raw Cleaned & Non-structured Extended Fields */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <FileText className="w-4.5 h-4.5 text-emerald-600" />
                    <span>原始清洗导入与完整非结构化扩展字段全览</span>
                  </h3>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">全量真实无损呈现</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">企业全称</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.name || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">统一社会信用代码</span>
                    <span className="text-slate-800 font-mono font-medium">{selectedEnterprise.creditCode || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">行业分类</span>
                    <span className="text-slate-800 font-medium">{translateIndustry(selectedEnterprise.industry) || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">设立登记日期</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.establishedDate || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">注册官方网址</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.website || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">主办公地址</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.address || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">在册骨干员工数量</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.employeeCount ? `${selectedEnterprise.employeeCount} 人` : "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">年度营收规模</span>
                    <span className="text-slate-800 font-medium">{formatRevenueScale(selectedEnterprise.revenueScale) || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">专职研发(R&D)总量</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.researchStaffCount ? `${selectedEnterprise.researchStaffCount} 人` : "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">研发经费比例</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.researchStaffRatio || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">发明专利软著项数</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.patentsCount ? `${selectedEnterprise.patentsCount} 项` : "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">专属政企联络人</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.contactName || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">联络人电话</span>
                    <span className="text-slate-800 font-mono font-medium">{selectedEnterprise.contactPhone || "—"}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-150 flex justify-between">
                    <span className="text-slate-500 font-semibold">联络人担任职务</span>
                    <span className="text-slate-800 font-medium">{selectedEnterprise.contactTitle || "—"}</span>
                  </div>
                </div>

                {/* Non-structured extra parameters area */}
                <div className="bg-amber-50/25 border border-amber-100 p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>其他非结构化及自定义导入字段</span>
                  </div>
                  {selectedEnterprise.customFields && Object.keys(selectedEnterprise.customFields).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      {Object.entries(selectedEnterprise.customFields).map(([label, val]) => (
                        <div key={label} className="bg-white border border-slate-150 p-3 rounded-lg flex flex-col space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold truncate" title={label}>{label}</span>
                          <span className="font-bold text-slate-800 break-words">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">本次数据清洗导入中未检测到其他非结构化自定义多维扩展属性。</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: R&D indices, Coordinator Point and Custom attributes */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* R&D Monitor Panel */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center space-x-1.5">
                  <BarChart3 className="w-4.5 h-4.5 text-blue-600" />
                  <span>科技创新与研发比例(R&D)</span>
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">专职研发 Headcount</span>
                    <strong className="text-slate-800 font-mono text-[13px]">
                      {selectedEnterprise.researchStaffCount ? `${selectedEnterprise.researchStaffCount} 人` : "暂无登记"}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">研发经费占营收比重</span>
                    <strong className="text-blue-700 font-mono text-[13px]">
                      {selectedEnterprise.researchStaffRatio || "暂无登记"}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">自主申报专利累计数</span>
                    <strong className="text-emerald-700 font-mono text-[13px]">
                      {selectedEnterprise.patentsCount ? `${selectedEnterprise.patentsCount} 项` : "暂无登记"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Designated Gov-Ent Liaison */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center space-x-1.5">
                  <Phone className="w-4.5 h-4.5 text-blue-600" />
                  <span>政企协调专属指定负责人</span>
                </h3>

                {selectedEnterprise.contactName ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center space-x-3.5">
                      <img 
                        src={selectedEnterprise.contactAvatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"} 
                        alt={selectedEnterprise.contactName} 
                        className="w-12 h-12 rounded-full object-cover border border-slate-300 shadow-2xs shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{selectedEnterprise.contactName}</p>
                        <p className="text-xs text-slate-500">{selectedEnterprise.contactTitle || "政企高级经理"}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-xs pt-1">
                      <div className="flex items-center text-slate-600">
                        <Phone className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                        <span className="font-mono">{selectedEnterprise.contactPhone || "暂未公开电话"}</span>
                      </div>
                      <div className="flex items-center text-slate-600">
                        <FileText className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                        <span className="truncate">coordinator@{selectedEnterprise.website || "gov.cn"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-slate-400 py-3 text-xs">暂无联络人登记，请点击编辑补录数据</p>
                )}
              </div>

              {/* Custom attributes evaluator */}
              {selectedEnterprise.customFields && Object.keys(selectedEnterprise.customFields).length > 0 && (
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center space-x-1.5">
                    <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                    <span>并轨扩容多维自定义指标</span>
                  </h3>
                  
                  <div className="space-y-2.5">
                    {Object.entries(selectedEnterprise.customFields).map(([label, val]) => (
                      <div key={label} className="bg-emerald-50/25 border border-emerald-100 p-3 rounded-lg text-xs space-y-1">
                        <span className="text-slate-400 text-[10px] block font-bold truncate" title={label}>{label}</span>
                        <span className="font-bold text-slate-800 block text-sm" title={String(val)}>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ==================== 2. ENTERPRISE LIST SCREEN (EXPANDED TO FULL-WIDTH 3 COLS) ==================== */
        <>
          {/* Header Info Panel */}
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>辖区重点骨干企业监测数据库</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                实时监测辖区规模以上企业、高新技术企业、专精特新“小巨人”等核心创新主体，建立企业与高精尖专业人才的动态双向映射结构。
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button 
                id="import-ent-csv-btn"
                onClick={() => setIsSmartImportOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>批量录入</span>
              </button>
              <button 
                id="export-ent-csv-btn"
                onClick={exportToCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>导出CSV</span>
              </button>
              {canModify && (
                <button 
                  id="add-enterprise-main-btn"
                  onClick={openCreateModal}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>登记重点企业</span>
                </button>
              )}
            </div>
          </div>

          {/* Searching & Filter inputs */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3" id="ent-filters-container">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                id="ent-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索企业名称 / 信用代码 / 联系人..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-800"
              />
            </div>

            <div>
              <select 
                id="ent-filter-industry-select"
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">产业方向: 全部</option>
                {tags.industries?.map((ind, idx) => (
                  <option key={idx} value={ind}>{translateIndustry(ind)}</option>
                ))}
              </select>
            </div>

            <div>
              <select 
                id="ent-filter-scale-select"
                value={filterScale}
                onChange={(e) => setFilterScale(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">营收阶梯: 全部</option>
                <option value="> 5B CNY">&gt; 50亿元 (超大型)</option>
                <option value="1B - 5B CNY">10亿 - 50亿元 (中大型)</option>
                <option value="100M - 500M CNY">1亿 - 5亿元 (中型规上)</option>
                <option value="10M - 100M CNY">1000万 - 1亿元 (初创中小型)</option>
              </select>
            </div>

            <div>
              <select 
                id="ent-filter-qual-select"
                value={filterQual}
                onChange={(e) => setFilterQual(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">核心资质认定: 全部</option>
                <option value="HighTech">国家高新技术企业</option>
                <option value="Specialized">省专精特新中小企业</option>
                <option value="LittleGiant">国家小巨人企业</option>
                <option value="Gazelle">瞪羚独角兽企业</option>
              </select>
            </div>

            <div>
              <select 
                id="ent-filter-abovesize-select"
                value={filterAboveScale}
                onChange={(e) => setFilterAboveScale(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">统计规模: 全部</option>
                <option value="AboveScale">规上重点企业</option>
                <option value="BelowScale">规下成长型企业</option>
              </select>
            </div>
          </div>

          {/* Grid: Left Table list (expanded to full-width lg:col-span-3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="enterprises-main-grid">
            <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden" id="enterprises-list-panel">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-3.5 pl-5">企业基本名称 / 统一社会信用代码</th>
                      <th className="p-3.5">重点产业方向</th>
                      <th className="p-3.5">资质梯度认定</th>
                      <th className="p-3.5">在册高端学者</th>
                      <th className="p-3.5 text-right pr-5">操作/档案</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700" id="enterprises-table-body">
                    {filteredEnterprises.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold">未匹配到符合筛选的企业记录</p>
                          <p className="text-[11px] mt-1 text-slate-400">请扩大关键词或变更筛选资质</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedEnterprises.map((ent) => {
                        const associatedTalents = talents.filter(t => t.enterpriseId === ent.id);
                        const isSelected = selectedEnterprise?.id === ent.id;

                        return (
                          <tr 
                            key={ent.id}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              isSelected ? "bg-blue-50/35 border-l-2 border-l-blue-600" : ""
                            }`}
                            onClick={() => setSelectedEnterprise(ent)}
                          >
                            <td className="p-3.5 pl-5">
                              <div className="space-y-1">
                                <span className="font-bold text-slate-900 block text-sm hover:text-blue-700 transition-colors">{ent.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 block tracking-wider">{ent.creditCode}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div>
                                <span className="font-medium text-slate-800 block">{translateIndustry(ent.industry)}</span>
                                <span className="text-[10px] text-slate-400 block">{formatRevenueScale(ent.revenueScale)}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1 max-w-[240px]">
                                {ent.isLittleGiant && (
                                  <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-red-100">小巨人</span>
                                )}
                                {ent.isHighTech && (
                                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-blue-100">高新技术</span>
                                )}
                                {ent.isSpecializedNew && (
                                  <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold border border-amber-100">专精特新</span>
                                )}
                                {ent.isAboveScale && (
                                  <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9px] font-medium border border-slate-200">规上主体</span>
                                )}
                                {!ent.isLittleGiant && !ent.isHighTech && !ent.isSpecializedNew && !ent.isAboveScale && (
                                  <span className="text-slate-400 text-[10px]">成长型中小企业</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center space-x-1">
                                <Users className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                                <span className="font-bold text-slate-900">{associatedTalents.length}</span>
                                <span className="text-slate-400">名学者</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end space-x-2">
                                <button 
                                  onClick={() => setSelectedEnterprise(ent)}
                                  title="查阅资质大屏"
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200 transition-all cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                {canModify && (
                                  <button 
                                    onClick={() => openEditModal(ent)}
                                    title="更新企业档案"
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-all cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button 
                                    onClick={() => {
                                      if (window.confirm(`确定要彻底删除重点监测企业 "${ent.name}" 吗？此操作无法撤销。`)) {
                                        handleDeleteEnterprise(ent.id, ent.name);
                                      }
                                    }}
                                    title="彻底撤销档案"
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200 transition-all cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination control panel */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px] font-medium border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span>每页显示</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>10 条</option>
                    <option value={15}>15 条</option>
                    <option value={20}>20 条</option>
                    <option value={50}>50 条</option>
                    <option value={100}>100 条</option>
                  </select>
                  <span>当前展示 {filteredEnterprises.length > 0 ? startIndex + 1 : 0}-{endIndex} 条，共 <strong className="text-slate-800">{filteredEnterprises.length}</strong> 家企业记录</span>
                </div>
                
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer text-slate-600 shadow-2xs"
                  >
                    上一页
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 font-bold font-mono">
                      {currentPage}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded font-bold font-mono">
                      {totalPages}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-[11px] font-bold hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer text-slate-600 shadow-2xs"
                  >
                    下一页
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-slate-100/60 flex items-center justify-between text-slate-400 text-[10px]">
                <span>当前筛选匹配：{filteredEnterprises.length} 家在册监测企业</span>
                <span>库中总登记：{enterprises.length} 家</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Smart Excel Import Modal */}
      {isSmartImportOpen && (
        <SmartExcelImporter
          existingEnterprises={enterprises}
          tags={tags}
          onImportCompleted={(importedData) => {
            setIsSmartImportOpen(false);
            showAlert("success", `智能清洗导入引擎已并轨合并 ${importedData.length} 家重点监测企业数据。`);
            onRefreshData();
          }}
          onClose={() => setIsSmartImportOpen(false)}
        />
      )}

      {/* CSV Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden" id="import-ent-modal">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>批量录入骨干企业 (CSV)</span>
              </h3>
              <button onClick={() => { setIsImportModalOpen(false); setImportFeedback(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800">参照标准企业格式</span>
                  <p className="text-[11px] text-slate-400">导入器会智能识别统一社会信用代码等要素，如信用代码冲突将被自动过滤。</p>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载企业模板</span>
                </button>
              </div>

              <form onSubmit={handleCSVImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">粘贴企业 CSV 行数据 (带表头以逗号分隔)</label>
                  <textarea 
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="企业名称(必填),统一社会信用代码(必填),行业分类,注册地址,联系人姓名,联系人电话,营收规模,高新技术企业(是/否),小巨人企业(是/否),员工人数&#10;宏图智造技术有限公司,91440300MA5P67Q899,Advanced Manufacturing,广州天河高新区科学大道32号,王总,13800001234,> 5B CNY,是,是,1200"
                    rows={8}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                  />
                </div>

                {importFeedback && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded text-red-700 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{importFeedback}</span>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-2 border-t border-slate-100 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsImportModalOpen(false); setImportFeedback(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-all cursor-pointer"
                  >
                    确认开始批量录入
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Enterprise Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" id="enterprise-form-modal">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingEnterpriseId ? "修改骨干监测企业资信档案" : "新成立及新登记监测企业备案"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">请录入真实的工商及财务数据资产</p>
              </div>
              <button 
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-6" id="ent-fields-form">
              
              {/* Part 1: Basic Industrial Info */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">工商及核心资产备案</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">企业全称 (必填)</label>
                    <input 
                      id="ent-form-name"
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. 飞图技术系统服务有限公司"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">统一社会信用代码 (18位必填)</label>
                    <input 
                      type="text"
                      value={formCreditCode}
                      onChange={(e) => setFormCreditCode(e.target.value)}
                      placeholder="e.g. 91440101MA59AABCD1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">产业重点方向</label>
                    <select 
                      value={formIndustry}
                      onChange={(e) => setFormIndustry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">-- 请选择产业重点方向 --</option>
                      {tags.industries?.map((ind, idx) => (
                        <option key={idx} value={ind}>{translateIndustry(ind)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">成立年份</label>
                    <input 
                      type="date"
                      value={formEstDate}
                      onChange={(e) => setFormEstDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">企业网址</label>
                    <input 
                      type="text"
                      value={formWebsite}
                      onChange={(e) => setFormWebsite(e.target.value)}
                      placeholder="e.g. www.flytech.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">注册及主办公地址</label>
                    <input 
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="请输入企业详细大楼及门牌号"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">主要经营产品背景描述</label>
                    <textarea 
                      value={formIntro}
                      onChange={(e) => setFormIntro(e.target.value)}
                      placeholder="请简短描述主营范围，包含业务、技术优势及重要客户群。"
                      rows={3}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Part 2: Qualifications checklists */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">核心资质及高新认定</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formIsHighTech}
                      onChange={(e) => setFormIsHighTech(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="font-bold text-slate-800">国家高新技术企业</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formIsSpecialized}
                      onChange={(e) => setFormIsSpecialized(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="font-bold text-slate-800">省专精特新企业</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formIsLittleGiant}
                      onChange={(e) => setFormIsLittleGiant(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="font-bold text-slate-800">专精特新“小巨人”</span>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all">
                    <input 
                      type="checkbox" 
                      checked={formIsGazelle}
                      onChange={(e) => setFormIsGazelle(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500 rounded"
                    />
                    <span className="font-bold text-slate-800">瞪羚/准独角兽企业</span>
                  </label>
                </div>
              </div>

              {/* Part 3: Scale metrics */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">经营及投融资统计</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">注册员工总 headcount</label>
                    <input 
                      type="number"
                      value={formEmployeeCount}
                      onChange={(e) => setFormEmployeeCount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">年度营收资产规模</label>
                    <select 
                      value={formRevenueScale}
                      onChange={(e) => setFormRevenueScale(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none cursor-pointer"
                      required
                    >
                      <option value="">-- 请选择营收资产规模 --</option>
                      <option value="> 5B CNY">&gt; 50亿元 (超大型)</option>
                      <option value="1B - 5B CNY">10亿 - 50亿元 (中大型)</option>
                      <option value="100M - 500M CNY">1亿 - 5亿元 (中型规上)</option>
                      <option value="10M - 100M CNY">1000万 - 1亿元 (初创中小型)</option>
                    </select>
                  </div>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all mt-5">
                    <input 
                      type="checkbox" 
                      checked={formIsAboveScale}
                      onChange={(e) => setFormIsAboveScale(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">规上统计重点企业</span>
                      <span className="text-[9px] text-slate-400 block">纳入国家规上企业统计系统</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer hover:bg-slate-100 transition-all mt-5">
                    <input 
                      type="checkbox" 
                      checked={formIsSteadyGrowth}
                      onChange={(e) => setFormIsSteadyGrowth(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    <div>
                      <span className="font-bold text-slate-800 block">重点稳增长支持对象</span>
                      <span className="text-[9px] text-slate-400 block">辖区稳增长名录库扶持企业</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Part 4: R&D indicators */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">科技创新与研发比例(R&D)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">专职研发人才 headcount</label>
                    <input 
                      type="number"
                      value={formResearchStaffCount}
                      onChange={(e) => setFormResearchStaffCount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">专职研发占全体比重 (%)</label>
                    <input 
                      type="text"
                      value={formResearchRatio}
                      onChange={(e) => setFormResearchRatio(e.target.value)}
                      placeholder="e.g. 34%"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">累积发明专利及软著(项)</label>
                    <input 
                      type="number"
                      value={formPatentsCount}
                      onChange={(e) => setFormPatentsCount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Part 5: Contact person */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">政企联络指定负责人</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">负责人姓名</label>
                    <input 
                      type="text"
                      value={formContactName}
                      onChange={(e) => setFormContactName(e.target.value)}
                      placeholder="请输入姓名"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">担任职务</label>
                    <input 
                      type="text"
                      value={formContactTitle}
                      onChange={(e) => setFormContactTitle(e.target.value)}
                      placeholder="e.g. 政企事务高级经理"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">专线联络方式 (电话)</label>
                    <input 
                      type="text"
                      value={formContactPhone}
                      onChange={(e) => setFormContactPhone(e.target.value)}
                      placeholder="请输入电话"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-5 mt-6 shrink-0">
                <button 
                  type="button" 
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer"
                >
                  {editingEnterpriseId ? "确认更新并保存" : "确立监测并备案入库"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
