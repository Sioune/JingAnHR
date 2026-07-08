/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { 
  Search, Filter, Plus, FileSpreadsheet, Download, FileText, Trash2, 
  Edit, Eye, Award, Link, Check, X, ShieldAlert, Sparkles, Upload, 
  HelpCircle, AlertCircle, FileUp, Info, PlusCircle, Paperclip, Users
} from "lucide-react";
import { motion } from "motion/react";
import { Talent, Enterprise, AwardRecord, User, UserRole, SystemTags, AttachedFile, translateIndustry } from "../types";

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

const translateAwardLevel = (level: string) => {
  switch (level) {
    case "National": return "国家级";
    case "Provincial": return "省级";
    case "Municipal": return "市级";
    case "District/County": return "区县级";
    case "Institutional": return "单位/院校级";
    default: return level;
  }
};

const translateAwardStatus = (status: string) => {
  switch (status) {
    case "Awarded": return "已正式获授";
    case "Approved": return "审批认定完成";
    case "Under Review": return "专家评审中";
    case "Not Approved": return "审核未通过";
    case "Additional Info Required": return "材料需退回修改";
    case "Expired": return "资助已届满";
    default: return status;
  }
};

interface TalentManagerProps {
  talents: Talent[];
  enterprises: Enterprise[];
  tags: SystemTags;
  user: User;
  onRefreshData: () => void;
}

export default function TalentManager({ talents, enterprises, tags, user, onRefreshData }: TalentManagerProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEdu, setFilterEdu] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterAwardStatus, setFilterAwardStatus] = useState("");
  const [filterEnterprise, setFilterEnterprise] = useState("");

  // UI Modals / Drawers State
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTalentId, setEditingTalentId] = useState<string | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState("");
  const [formGender, setFormGender] = useState<"Male" | "Female">("Male");
  const [formNation, setFormNation] = useState("Han");
  const [formNationality, setFormNationality] = useState("China");
  const [formDob, setFormDob] = useState("");
  const [formEdu, setFormEdu] = useState<Talent["education"]>("Master");
  const [formEduDetail, setFormEduDetail] = useState("");
  const [formSchool, setFormSchool] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPolitical, setFormPolitical] = useState("CPC Member");
  const [formEnterpriseId, setFormEnterpriseId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formSocialTitles, setFormSocialTitles] = useState("");
  const [formOverseas, setFormOverseas] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [formAwards, setFormAwards] = useState<AwardRecord[]>([]);

  // CSV Template / Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [dragOverCsv, setDragOverCsv] = useState(false);

  // AI Parse State
  const [aiText, setAiText] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiUploadedFileBase64, setAiUploadedFileBase64] = useState<string | null>(null);
  const [aiFileName, setAiFileName] = useState("");
  const [aiFileType, setAiFileType] = useState("");
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // Form Temp Award States
  const [tempAwardName, setTempAwardName] = useState("");
  const [tempAwardTime, setTempAwardTime] = useState("");
  const [tempAwardLevel, setTempAwardLevel] = useState<AwardRecord["level"]>("Provincial");
  const [tempAwardStatus, setTempAwardStatus] = useState<AwardRecord["status"]>("Approved");
  const [tempAwardBonus, setTempAwardBonus] = useState("50000");
  const [tempAwardOpinion, setTempAwardOpinion] = useState("");

  // Alert State
  const [globalAlert, setGlobalAlert] = useState<{ type: "success" | "error", message: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEdu, filterIndustry, filterAwardStatus, filterEnterprise]);

  const showAlert = (type: "success" | "error", message: string) => {
    setGlobalAlert({ type, message });
    setTimeout(() => setGlobalAlert(null), 4000);
  };

  // Check Permissions
  const canModify = user.role !== UserRole.QUERY_CLERK;
  const canDelete = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

  // Filter talents
  const filteredTalents = talents.filter(t => {
    const matchSearch = searchTerm === "" || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (t.school && t.school.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.educationDetail && t.educationDetail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchEdu = filterEdu === "" || t.education === filterEdu;
    
    // Enterprise matches
    let matchIndustry = true;
    if (filterIndustry !== "") {
      const ent = enterprises.find(e => e.id === t.enterpriseId);
      matchIndustry = ent ? ent.industry === filterIndustry : false;
    }

    const matchEnt = filterEnterprise === "" || t.enterpriseId === filterEnterprise;
    
    // Awards match status
    const matchAwardStatus = filterAwardStatus === "" || 
      t.awards.some(a => a.status === filterAwardStatus);

    return matchSearch && matchEdu && matchIndustry && matchEnt && matchAwardStatus;
  });

  const totalPages = Math.ceil(filteredTalents.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTalents.length);
  const paginatedTalents = filteredTalents.slice(startIndex, endIndex);

  // Export filtered talents to CSV
  const exportToCSV = () => {
    try {
      const headers = ["姓名", "性别", "出生日期", "学历", "学历明细", "毕业院校", "联系电话", "电子邮箱", "政治面貌", "关联企业名称", "职务职称", "奖项数量"];
      const rows = filteredTalents.map(t => [
        t.name,
        t.gender === "Male" ? "男" : "女",
        t.dob || "",
        t.education,
        t.educationDetail || "",
        t.school || "",
        t.phone || "",
        t.email || "",
        t.politicalStatus || "",
        t.enterpriseName || "",
        t.title || "",
        t.awards?.length || 0
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `高层次人才导出表_${new Date().toLocaleDateString("zh-CN")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showAlert("success", `已成功导出 ${filteredTalents.length} 条人才记录至 CSV`);
    } catch (err) {
      console.error(err);
      showAlert("error", "导出 CSV 失败。");
    }
  };

  // Download Import CSV Template
  const downloadTemplate = () => {
    const headers = ["姓名(必填)", "性别(男/女)", "出生日期(YYYY-MM-DD)", "最高学历(Bachelor/Master/Doctorate/Post-Doc)", "学历明细", "毕业院校", "联系电话", "政治面貌", "职务职称", "海外留学背景"];
    const exampleRow = ["刘博士", "男", "1988-05-20", "Doctorate", "高分子材料博士", "复旦大学", "13812345678", "中共党员", "高级研究员", "美国加州大学柏克莱分校博士后2年"];
    const csvContent = "\uFEFF" + [headers.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "人才信息批量导入模板.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse pasted CSV text
  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setImportFeedback("请输入或粘贴 CSV 数据。");
      return;
    }

    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        setImportFeedback("数据行不足，请确保包含标题行及至少一行有效数据。");
        return;
      }

      // Very basic CSV parser
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

      const headers = parseCSVLine(lines[0]);
      const importedTalents = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || !values[0]) continue;

        // Map column indices safely
        const name = values[0];
        const gender = (values[1] === "女" || values[1]?.toLowerCase() === "female") ? "Female" : "Male";
        const dob = values[2] || "";
        
        let education: Talent["education"] = "Master";
        const rawEdu = values[3]?.toLowerCase();
        if (rawEdu?.includes("bach") || rawEdu?.includes("本")) education = "Bachelor";
        else if (rawEdu?.includes("doc") || rawEdu?.includes("博")) education = "Doctorate";
        else if (rawEdu?.includes("post") || rawEdu?.includes("后")) education = "Post-Doc";
        else if (rawEdu?.includes("mast") || rawEdu?.includes("硕")) education = "Master";
        else education = "Other";

        const educationDetail = values[4] || "";
        const school = values[5] || "";
        const phone = values[6] || "";
        const politicalStatus = values[7] || "CPC Member";
        const title = values[8] || "";
        const overseasBackground = values[9] || "";

        importedTalents.push({
          name,
          gender,
          dob,
          education,
          educationDetail,
          school,
          phone,
          politicalStatus,
          title,
          overseasBackground,
          status: "Active",
          awards: []
        });
      }

      if (importedTalents.length === 0) {
        setImportFeedback("未解析到任何有效人才记录。");
        return;
      }

      // Send to server
      const response = await fetch("/api/talents/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify(importedTalents)
      });

      if (response.ok) {
        showAlert("success", `成功批量导入 ${importedTalents.length} 名人才记录！`);
        setIsImportModalOpen(false);
        setCsvText("");
        setImportFeedback(null);
        onRefreshData();
      } else {
        const data = await response.json();
        setImportFeedback(data.error || "服务器导入保存失败。");
      }
    } catch (err: any) {
      console.error(err);
      setImportFeedback("CSV 解析格式错误，请使用标准英文逗号分隔。");
    }
  };

  // AI Resume Parser trigger
  const handleAIResumeParse = async () => {
    if (!aiText.trim() && !aiUploadedFileBase64) {
      setAiError("请先粘贴个人简介、证书材料或上传简历图片/PDF。");
      return;
    }

    setAiParsing(true);
    setAiError(null);
    try {
      const response = await fetch("/api/talents/parse-cv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({
          text: aiText,
          fileData: aiUploadedFileBase64,
          fileName: aiFileName,
          fileType: aiFileType
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        // Pre-fill form fields with parsed results
        const data = result.data;
        if (data.name) setFormName(data.name);
        if (data.gender) setFormGender(data.gender);
        if (data.dob) setFormDob(data.dob);
        if (data.education) setFormEdu(data.education);
        if (data.educationDetail) setFormEduDetail(data.educationDetail);
        if (data.school) setFormSchool(data.school);
        if (data.phone) setFormPhone(data.phone);
        if (data.email) setFormEmail(data.email);
        if (data.politicalStatus) setFormPolitical(data.politicalStatus);
        if (data.title) setFormTitle(data.title);
        if (data.overseasBackground) setFormOverseas(data.overseasBackground);
        
        if (data.awards && Array.isArray(data.awards)) {
          const generatedAwards = data.awards.map((aw: any, idx: number) => ({
            id: "aw_ai_" + idx + "_" + Date.now(),
            awardName: aw.awardName || "未命名奖项",
            time: aw.time || new Date().getFullYear().toString(),
            level: aw.level || "Provincial",
            status: aw.status || "Awarded",
            bonus: aw.bonus || 0,
            opinion: aw.opinion || "由 AI 智能提取"
          }));
          setFormAwards(generatedAwards);
        }

        showAlert("success", "AI 智能解析成功！相关要素已自动填入当前表单中。");
        // Clear AI inputs
        setAiText("");
        setAiUploadedFileBase64(null);
        setAiFileName("");
      } else {
        setAiError(result.error || "AI 解析失败，请重试或手动输入表格。");
      }
    } catch (err: any) {
      console.error(err);
      setAiError("无法连接到 AI 智能解析器服务。");
    } finally {
      setAiParsing(false);
    }
  };

  // File Upload Helper for AI
  const handleAIFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiFileName(file.name);
    setAiFileType(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(",")[1];
      setAiUploadedFileBase64(base64String);
      showAlert("success", `文件 ${file.name} 上传成功，准备进行 AI 提取。`);
    };
    reader.readAsDataURL(file);
  };

  // Add award to form
  const handleAddAwardToForm = () => {
    if (!tempAwardName.trim() || !tempAwardTime.trim()) {
      showAlert("error", "奖项名称及获得时间为必填项");
      return;
    }

    const newAw: AwardRecord = {
      id: "aw_" + Date.now() + "_" + Math.floor(Math.random() * 100),
      awardName: tempAwardName,
      time: tempAwardTime,
      level: tempAwardLevel,
      status: tempAwardStatus,
      bonus: Number(tempAwardBonus) || 0,
      opinion: tempAwardOpinion
    };

    setFormAwards([...formAwards, newAw]);
    
    // Clear temp states
    setTempAwardName("");
    setTempAwardTime("");
    setTempAwardOpinion("");
  };

  // Remove award from form
  const handleRemoveAwardFromForm = (awardId: string) => {
    setFormAwards(formAwards.filter(a => a.id !== awardId));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTalentId(null);
    setFormName("");
    setFormGender("Male");
    setFormNation("Han");
    setFormNationality("China");
    setFormDob("");
    setFormEdu("Master");
    setFormEduDetail("");
    setFormSchool("");
    setFormPhone("");
    setFormEmail("");
    setFormPolitical("CPC Member");
    setFormEnterpriseId("");
    setFormTitle("");
    setFormSocialTitles("");
    setFormOverseas("");
    setFormAvatar("");
    setFormAwards([]);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (talent: Talent) => {
    setEditingTalentId(talent.id);
    setFormName(talent.name);
    setFormGender(talent.gender);
    setFormNation(talent.nation || "Han");
    setFormNationality(talent.nationality || "China");
    setFormDob(talent.dob || "");
    setFormEdu(talent.education);
    setFormEduDetail(talent.educationDetail || "");
    setFormSchool(talent.school || "");
    setFormPhone(talent.phone || "");
    setFormEmail(talent.email || "");
    setFormPolitical(talent.politicalStatus || "CPC Member");
    setFormEnterpriseId(talent.enterpriseId || "");
    setFormTitle(talent.title || "");
    setFormSocialTitles(talent.socialTitles?.join(", ") || "");
    setFormOverseas(talent.overseasBackground || "");
    setFormAvatar(talent.avatar || "");
    setFormAwards(talent.awards || []);
    setIsEditModalOpen(true);
  };

  // Form Submit (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showAlert("error", "姓名是必填项。");
      return;
    }

    // Lookup enterprise name
    let entName = "";
    if (formEnterpriseId) {
      const ent = enterprises.find(e => e.id === formEnterpriseId);
      entName = ent ? ent.name : "";
    }

    const payload = {
      name: formName.trim(),
      gender: formGender,
      nation: formNation,
      nationality: formNationality,
      dob: formDob,
      education: formEdu,
      educationDetail: formEduDetail.trim(),
      school: formSchool.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim(),
      politicalStatus: formPolitical,
      enterpriseId: formEnterpriseId,
      enterpriseName: entName,
      title: formTitle.trim(),
      socialTitles: formSocialTitles ? formSocialTitles.split(",").map(s => s.trim()).filter(s => s.length > 0) : [],
      overseasBackground: formOverseas.trim(),
      avatar: formAvatar.trim() || (formGender === "Male" 
        ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200" 
        : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"),
      awards: formAwards,
      status: "Active"
    };

    try {
      const method = editingTalentId ? "PUT" : "POST";
      const url = editingTalentId ? `/api/talents/${editingTalentId}` : "/api/talents";

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
        showAlert("success", editingTalentId ? "更新人才信息成功" : "新增人才登记成功");
        setIsCreateModalOpen(false);
        setIsEditModalOpen(false);
        onRefreshData();
      } else {
        showAlert("error", "保存人才信息失败，请重试。");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络通信故障，无法保存。");
    }
  };

  // Delete Talent Profile
  const handleDeleteTalent = async (id: string, name: string) => {
    if (!window.confirm(`确定要彻底删除人才 "${name}" 的所有档案、申报历史及对应附件吗？此操作不可逆！`)) {
      return;
    }

    try {
      const response = await fetch(`/api/talents/${id}`, {
        method: "DELETE",
        headers: {
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        }
      });

      if (response.ok) {
        showAlert("success", `已成功删除 "${name}" 的信息档案。`);
        setSelectedTalent(null);
        onRefreshData();
      } else {
        showAlert("error", "删除失败。");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络故障，无法执行删除。");
    }
  };

  // Export beautiful Word Recommendation printable layout
  const exportWordForm = (talent: Talent) => {
    // Generate a beautiful new print window containing a structured government table
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showAlert("error", "由于浏览器拦截，无法在新窗口打开打印单。请允许弹窗。");
      return;
    }

    const awardRows = talent.awards?.map(aw => `
      <tr>
        <td style="padding: 10px; border: 1px solid #334155; font-weight: bold; text-align: center; width: 30%;">${aw.time}年</td>
        <td style="padding: 10px; border: 1px solid #334155; width: 70%;">
          <strong>${aw.awardName}</strong> (${translateAwardLevel(aw.level)})
          <span style="display: block; font-size: 11px; color: #64748b; margin-top: 4px;">状态: ${translateAwardStatus(aw.status)} | 奖补: ${aw.bonus ? "¥" + aw.bonus.toLocaleString() : "无" }</span>
          ${aw.opinion ? `<span style="display: block; font-size: 11px; font-style: italic; color: #475569; margin-top: 3px;">专家意见: ${aw.opinion}</span>` : ""}
        </td>
      </tr>
    `).join("") || "<tr><td colspan='2' style='padding: 10px; text-align: center; color: #64748b;'>暂无奖项及资助申报历史</td></tr>";

    printWindow.document.write(`
      <html>
        <head>
          <title>${talent.name} - 辖区高层次人才推荐表</title>
          <style>
            body { font-family: 'SimSun', 'STSong', 'Liberation Serif', serif; padding: 40px; color: #000; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 12px 10px; text-align: left; font-size: 14px; }
            .bg-label { background-color: #f1f5f9; font-weight: bold; text-align: center; width: 15%; }
            .content { width: 35%; }
            .full-row { width: 85%; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 13px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="background: #f1f5f9; padding: 15px; margin-bottom: 20px; border-radius: 6px; text-align: right;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #1e40af; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">立即打印或导出 Word/PDF</button>
          </div>
          <div class="header">
            <h1 class="title">辖区高层次紧缺骨干人才资格审查及推荐呈批表</h1>
            <p style="margin-top: 5px; font-size: 12px; color: #475569;">填表日期: ${new Date(talent.createdAt).toLocaleDateString("zh-CN")} • 审核编号: HB-TL-${talent.id.toUpperCase()}</p>
          </div>
          
          <table>
            <tr>
              <td class="bg-label">姓名</td>
              <td class="content">${talent.name}</td>
              <td class="bg-label">性别</td>
              <td class="content">${talent.gender === "Male" ? "男" : "女"}</td>
              <td rowspan="4" style="text-align: center; width: 15%; padding: 5px;">
                <img src="${talent.avatar}" style="max-width: 100%; max-height: 120px; object-fit: cover;" alt="Photo" />
              </td>
            </tr>
            <tr>
              <td class="bg-label">民族</td>
              <td class="content">${talent.nation || "汉族"}</td>
              <td class="bg-label">国籍</td>
              <td class="content">${talent.nationality || "中国"}</td>
            </tr>
            <tr>
              <td class="bg-label">出生日期</td>
              <td class="content">${talent.dob || "未核验"}</td>
              <td class="bg-label">最高学历</td>
              <td class="content">${translateEducation(talent.education)}</td>
            </tr>
            <tr>
              <td class="bg-label">毕业院校</td>
              <td class="content" colspan="3">${talent.school || "无"}</td>
            </tr>
            <tr>
              <td class="bg-label">专业背景</td>
              <td class="content" colspan="2">${talent.educationDetail || "无"}</td>
              <td class="bg-label">政治面貌</td>
              <td class="content">${talent.politicalStatus || "群众"}</td>
            </tr>
            <tr>
              <td class="bg-label">联系电话</td>
              <td class="content" colspan="2">${talent.phone || "未录入"}</td>
              <td class="bg-label">电子邮箱</td>
              <td class="content">${talent.email || "未录入"}</td>
            </tr>
            <tr>
              <td class="bg-label">现任职务职称</td>
              <td class="full-row" colspan="4">${talent.title || "暂无明确职务"}</td>
            </tr>
            <tr>
              <td class="bg-label">现关联重点企业</td>
              <td class="full-row" colspan="4"><strong>${talent.enterpriseName || "未绑定注册企业"}</strong></td>
            </tr>
            <tr>
              <td class="bg-label">社会主要职务</td>
              <td class="full-row" colspan="4">${talent.socialTitles?.join("、") || "暂无社会兼职"}</td>
            </tr>
            <tr>
              <td className="bg-label">海外留学研究背景</td>
              <td className="full-row" colSpan={4} style={{ height: "60px", verticalAlign: "top" }}>${talent.overseasBackground || "无海外求学或境外交流、访学背景。"}</td>
            </tr>
            <tr>
              <td className="bg-label" style={{ height: "100px" }}>入选政策项目与申报进度</td>
              <td className="full-row" colSpan={4}>
                <table style={{ width: "100%", border: "none", marginTop: "0" }}>
                  ${awardRows}
                </table>
              </td>
            </tr>
          </table>
          <div class="footer">
            <span>经办人签字: __________________</span>
            <span>审核部门盖章: __________________</span>
            <span>打印时间: ${new Date().toLocaleString()}</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" id="talent-manager-panel">
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

      {selectedTalent ? (
        /* ==================== 1. TALENT DETAILS SCREEN (FULL-WIDTH BENTO GRID) ==================== */
        <div className="space-y-6 animate-fade-in" id="talent-detail-page-container">
          {/* Breadcrumb / Actions Navigation bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200/85 rounded-xl p-4 shadow-2xs gap-3">
            <div className="flex items-center space-x-3">
              <button 
                type="button"
                onClick={() => setSelectedTalent(null)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
              >
                <span>&larr; 返回高层次人才列表</span>
              </button>
              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block"></div>
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">高层次骨干人才综合资质档案</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                id="export-word-print-btn"
                onClick={() => exportWordForm(selectedTalent)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>生成呈批表</span>
              </button>
              {canModify && (
                <button 
                  type="button"
                  onClick={() => openEditModal(selectedTalent)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>编辑专家信息</span>
                </button>
              )}
              {canDelete && (
                <button 
                  type="button"
                  onClick={() => handleDeleteTalent(selectedTalent.id, selectedTalent.name)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>彻底销毁档案</span>
                </button>
              )}
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Talent Profile & Demographics & Background */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
                <div className="flex items-start space-x-5 border-b border-slate-100 pb-5">
                  <img 
                    src={selectedTalent.avatar} 
                    alt={selectedTalent.name} 
                    className="w-20 h-20 rounded-xl object-cover border-2 border-slate-100 shadow-sm shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-extrabold text-slate-900 truncate">{selectedTalent.name}</h2>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedTalent.education === "Doctorate" ? "bg-red-50 text-red-700 border border-red-100" :
                        selectedTalent.education === "Post-Doc" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                        selectedTalent.education === "Master" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600 border border-slate-200"
                      }`}>
                        {translateEducation(selectedTalent.education)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-semibold">
                      {selectedTalent.title || "高级研究员"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-full truncate flex items-center">
                      <Link className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                      <strong>关联重点监测企业: </strong>
                      <span className="ml-1 text-slate-600 font-semibold">
                        {selectedTalent.enterpriseName === "该企业已被删除，请重新关联" ? "该企业已被删除，请重新关联" : (selectedTalent.enterpriseName || "未绑定任何重点企业")}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Core Demographics Fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Info className="w-4.5 h-4.5 text-blue-600" />
                    <span>基本身份特征要素</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">最高学历/阶段</span>
                      <span className="font-bold text-slate-800 text-[13px]">{translateEducation(selectedTalent.education)}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">专业背书</span>
                      <span className="font-bold text-slate-800 text-[13px] truncate block" title={selectedTalent.educationDetail}>{selectedTalent.educationDetail || "未登记"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">政治面貌</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedTalent.politicalStatus || "非党员/群众"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">毕业院校</span>
                      <span className="font-bold text-slate-800 text-[13px] truncate block" title={selectedTalent.school}>{selectedTalent.school || "未知"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">民族/国籍</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedTalent.nation || "汉族"} / {selectedTalent.nationality || "中国"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">出生日期</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedTalent.dob || "未核验"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">联系电话</span>
                      <span className="font-bold text-slate-800 text-[13px]">{selectedTalent.phone || "密级隔离"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">工作电子邮箱</span>
                      <span className="font-bold text-slate-800 text-[13px] truncate block" title={selectedTalent.email}>{selectedTalent.email || "未备案"}</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-1">
                      <span className="text-slate-400 block font-medium">在册状态</span>
                      <span className="font-bold text-emerald-700 text-[13px]">在职监管中</span>
                    </div>
                  </div>

                  {selectedTalent.socialTitles && selectedTalent.socialTitles.length > 0 && (
                    <div className="pt-2 text-xs">
                      <span className="text-slate-400 block mb-1.5 font-semibold">社会主要兼职职务</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTalent.socialTitles.map((st, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded text-[10px] font-semibold border border-slate-200">{st}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedTalent.overseasBackground && (
                    <div className="pt-2 text-xs">
                      <span className="text-slate-400 block mb-1.5 font-semibold">留学、境外交流访问工作经历背景</span>
                      <p className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl text-slate-700 text-[11px] leading-relaxed italic font-medium">
                        "{selectedTalent.overseasBackground}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Embedded Awards history */}
            <div className="lg:col-span-1 space-y-6">
              
              <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <Award className="w-4.5 h-4.5 text-amber-500" />
                    <span>入选政策项目与申报进度</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">累计资助申报: {selectedTalent.awards?.length || 0}项</p>
                </div>
                
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {selectedTalent.awards?.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10">该名人才尚未绑定获奖及政策性资金资助项目历史</p>
                  ) : (
                    selectedTalent.awards?.map((aw, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-xl text-xs space-y-2 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-slate-500 font-bold">{aw.time}年</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            aw.status === "Awarded" || aw.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            aw.status === "Under Review" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            aw.status === "Additional Info Required" ? "bg-red-50 text-red-700 border border-red-100 animate-pulse" : "bg-slate-100 text-slate-600"
                          }`}>
                            {translateAwardStatus(aw.status)}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 leading-snug">{aw.awardName}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>资助级别：<strong>{translateAwardLevel(aw.level)}</strong></span>
                          {aw.bonus ? <span className="font-mono text-slate-900 font-bold">奖励金额：¥{aw.bonus.toLocaleString()}</span> : null}
                        </div>
                        {aw.opinion && (
                          <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-200/40 pt-1.5 mt-1.5 font-sans">
                            审核意见："{aw.opinion}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* ==================== 2. TALENT LIST SCREEN ==================== */
        <>
          {/* Header Panel */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>辖区高层次人才资源数据库</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                统一监管辖区内创新型科技骨干、研究员和博士后等，支持 AI 简历智能识别要素填表、审核流程追踪 and 呈批表导出。
              </p>
            </div>

            {/* Action button grouping */}
            <div className="flex flex-wrap items-center gap-2">
              <button 
                id="import-csv-btn"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>批量导入</span>
              </button>
              <button 
                id="export-csv-btn"
                onClick={exportToCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>导出CSV</span>
              </button>
              {canModify && (
                <button 
                  id="add-talent-main-btn"
                  onClick={openCreateModal}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>登记高层次人才</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Multi-dimensional Filters bar */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3" id="filters-container">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                id="talent-search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索姓名 / 毕业学校 / 职称..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-800"
              />
            </div>

            <div>
              <select 
                id="filter-edu-select"
                value={filterEdu}
                onChange={(e) => setFilterEdu(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">最高学历: 全部</option>
                {tags.educationLevels?.map((edu, idx) => (
                  <option key={idx} value={edu}>{edu}</option>
                ))}
              </select>
            </div>

            <div>
              <select 
                id="filter-industry-select"
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">关联企业行业: 全部</option>
                {tags.industries?.map((ind, idx) => (
                  <option key={idx} value={ind}>{translateIndustry(ind)}</option>
                ))}
              </select>
            </div>

            <div>
              <select 
                id="filter-ent-select"
                value={filterEnterprise}
                onChange={(e) => setFilterEnterprise(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">绑定企业: 全部</option>
                {enterprises.map((ent) => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select 
                id="filter-award-status-select"
                value={filterAwardStatus}
                onChange={(e) => setFilterAwardStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
              >
                <option value="">奖项资助状态: 全部</option>
                <option value="Awarded">已获资助</option>
                <option value="Approved">审核通过</option>
                <option value="Under Review">专家评审中</option>
                <option value="Additional Info Required">材料需退回修改</option>
              </select>
            </div>
          </div>

          {/* Talent List Table Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="talents-data-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 tracking-wider">
                    <th className="p-3.5 pl-5">基本身份特征</th>
                    <th className="p-3.5">学历与学术背景</th>
                    <th className="p-3.5">绑定企业与职称</th>
                    <th className="p-3.5">资助情况</th>
                    <th className="p-3.5 text-right pr-5">管理档案</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedTalents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400">
                        未检索到符合当前多维筛选条件的高层次人才记录
                      </td>
                    </tr>
                  ) : (
                    paginatedTalents.map((talent) => {
                      const totalAwardBonus = talent.awards?.reduce((acc, curr) => acc + (curr.bonus || 0), 0) || 0;
                      return (
                        <tr 
                          key={talent.id} 
                          onClick={() => setSelectedTalent(talent)}
                          className="hover:bg-slate-50/80 transition-all cursor-pointer border-b border-slate-100"
                        >
                          <td className="p-3.5 pl-5">
                            <div className="flex items-center space-x-3">
                              <img 
                                src={talent.avatar} 
                                alt={talent.name} 
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">{talent.name}</span>
                                <span className="text-[10px] text-slate-400">{talent.gender === "Male" ? "男" : "女"} • {talent.dob ? (new Date().getFullYear() - new Date(talent.dob).getFullYear()) + "岁" : "年龄不详"}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold mb-1 ${
                                talent.education === "Doctorate" ? "bg-red-50 text-red-700 border border-red-100" :
                                talent.education === "Post-Doc" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                                talent.education === "Master" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-50 text-slate-600 border border-slate-200"
                              }`}>
                                {translateEducation(talent.education)}
                              </span>
                              <p className="font-medium text-slate-700 max-w-[150px] truncate">{talent.educationDetail}</p>
                              <p className="text-[10px] text-slate-400 max-w-[150px] truncate">{talent.school}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div>
                              <p className={`font-bold max-w-[180px] truncate ${
                                talent.enterpriseName === "该企业已被删除，请重新关联" ? "text-red-500 text-[11px] animate-pulse font-medium" : "text-slate-800"
                              }`}>
                                {talent.enterpriseName || "未关联重点企业"}
                              </p>
                              <p className="text-[10px] text-slate-400 max-w-[180px] truncate">{talent.title || "暂无明确职称"}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div>
                              <p className="font-mono font-bold text-slate-900">
                                {totalAwardBonus > 0 ? `¥${(totalAwardBonus / 10000).toFixed(1)}万` : "无申报额度"}
                              </p>
                              <span className="text-[10px] text-slate-400 flex items-center">
                                <Award className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                                {talent.awards?.length || 0}项获奖与补贴
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => setSelectedTalent(talent)}
                                title="查看电子档案"
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded border border-slate-200"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canModify && (
                                <button 
                                  onClick={() => openEditModal(talent)}
                                  title="编辑人才信息"
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  onClick={() => handleDeleteTalent(talent.id, talent.name)}
                                  title="彻底销毁档案"
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded border border-red-200"
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

            {/* Pagination Panel */}
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
                <span>当前展示 {filteredTalents.length > 0 ? startIndex + 1 : 0}-{endIndex} 条，共 <strong className="text-slate-800">{filteredTalents.length}</strong> 人记录</span>
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
              <span>当前筛选呈现 {filteredTalents.length} 个高层次学者/科技创新代表</span>
              <span>库中总登记：{talents.length} 人</span>
            </div>
          </div>
        </>
      )}

      {/* CSV Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden" id="import-csv-modal">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>批量导入人才档案 (CSV)</span>
              </h3>
              <button onClick={() => { setIsImportModalOpen(false); setImportFeedback(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-800">使用批量模板</span>
                  <p className="text-[11px] text-slate-400">请下载并参照格式规范填写数据，否则可能会导致个别项解析失败。</p>
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载导入模板</span>
                </button>
              </div>

              <form onSubmit={handleCSVImport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">粘贴 CSV 纯文本内容 (带表头以逗号分隔)</label>
                  <textarea 
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="姓名(必填),性别(男/女),出生日期(YYYY-MM-DD),最高学历(Bachelor/Master/Doctorate/Post-Doc),学历明细,毕业院校,联系电话,政治面貌,职务职称,海外留学背景&#10;张教授,男,1980-04-12,Doctorate,材料学博士,浙江大学,13912341234,中共党员,实验室主任,麻省理工访问学者"
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
                    开始批量读取并保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Talent Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" id="talent-form-modal">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingTalentId ? "修改高层次引进人才档案" : "新引进高端专家与紧缺人才登记录入"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">请确保输入所有必要的凭据与证明要素</p>
              </div>
              <button 
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Modal Body: Left AI Assist Parser, Right Structured Fields Form */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              {/* Left Side (Lg span 4): AI Smart Parser Widget */}
              <div className="lg:col-span-4 p-5 bg-slate-50/50 space-y-4" id="ai-parse-widget">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>AI 简历/申报材料一键智能解析</span>
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    可在此直接粘贴专家的个人履历纯文本，或者上传简历照片/PDF证书扫描件，通过 Gemini AI 提取姓名、毕业学校、学历、已获荣誉等自动一键回填。
                  </p>
                </div>

                {/* AI upload & Input elements */}
                <div className="space-y-3">
                  <textarea 
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="例如：张建国，男，1985年生。复旦大学微电子学博士，2014-2018年在美国留学做博士后。现担任Nexus智能制造副总裁。2023年荣获国家杰出青年基金资助，获得20万元奖励..."
                    rows={6}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-700"
                  />

                  {/* Drag and drop or click upload mock container */}
                  <div 
                    onClick={() => aiFileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-lg p-4 text-center cursor-pointer transition-all bg-white"
                  >
                    <FileUp className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <span className="block text-[11px] font-bold text-slate-700">
                      {aiFileName ? aiFileName : "上传简历/证明扫描件"}
                    </span>
                    <span className="block text-[9px] text-slate-400 mt-0.5">支持 JPG / PNG / PDF • 小于 10MB</span>
                    <input 
                      type="file" 
                      ref={aiFileInputRef}
                      onChange={handleAIFileChange}
                      accept="image/*,application/pdf"
                      className="hidden"
                    />
                  </div>

                  {aiError && (
                    <div className="p-2.5 bg-red-50 border border-red-100 rounded text-red-700 text-[10px] flex items-start space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={handleAIResumeParse}
                    disabled={aiParsing}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded text-xs font-bold transition-all shadow-xs flex justify-center items-center space-x-1 cursor-pointer"
                  >
                    {aiParsing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>大模型深度解析中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>一键大模型识别回填</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side (Lg span 8): Structured Fields Form */}
              <form onSubmit={handleFormSubmit} className="lg:col-span-8 p-6 space-y-6 flex flex-col justify-between" id="talent-fields-form">
                
                {/* Form fields groups */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">基本身份履历核验</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">姓名(必填)</label>
                      <input 
                        id="form-name-input"
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="请输入姓名"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">性别</label>
                      <div className="flex items-center space-x-4 mt-1.5">
                        <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="gender" 
                            checked={formGender === "Male"} 
                            onChange={() => setFormGender("Male")}
                            className="text-blue-600 focus:ring-blue-500" 
                          />
                          <span>男</span>
                        </label>
                        <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="gender" 
                            checked={formGender === "Female"} 
                            onChange={() => setFormGender("Female")}
                            className="text-blue-600 focus:ring-blue-500" 
                          />
                          <span>女</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">出生日期</label>
                      <input 
                        type="date"
                        value={formDob}
                        onChange={(e) => setFormDob(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">民族</label>
                      <input 
                        type="text"
                        value={formNation}
                        onChange={(e) => setFormNation(e.target.value)}
                        placeholder="e.g. 汉族"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">国籍</label>
                      <input 
                        type="text"
                        value={formNationality}
                        onChange={(e) => setFormNationality(e.target.value)}
                        placeholder="e.g. 中国"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">政治面貌</label>
                      <input 
                        type="text"
                        value={formPolitical}
                        onChange={(e) => setFormPolitical(e.target.value)}
                        placeholder="e.g. 中共党员"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">最高学历阶段</label>
                      <select 
                        value={formEdu}
                        onChange={(e) => setFormEdu(e.target.value as Talent["education"])}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                      >
                        {tags.educationLevels?.map((edu, idx) => (
                          <option key={idx} value={edu}>{edu}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">专业背书明细</label>
                      <input 
                        type="text"
                        value={formEduDetail}
                        onChange={(e) => setFormEduDetail(e.target.value)}
                        placeholder="e.g. 计算机科学与技术硕士"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">毕业/研究高校</label>
                      <input 
                        type="text"
                        value={formSchool}
                        onChange={(e) => setFormSchool(e.target.value)}
                        placeholder="请输入毕业院校"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">联系电话</label>
                      <input 
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="请输入联系方式"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">电子邮箱</label>
                      <input 
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="example@email.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 pt-2">企事业单位绑定与职称</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">现关联重点监测企业</label>
                      <select 
                        value={formEnterpriseId}
                        onChange={(e) => setFormEnterpriseId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800 cursor-pointer"
                      >
                        <option value="">暂不关联企业 (独立研究员)</option>
                        {enterprises.map((ent) => (
                          <option key={ent.id} value={ent.id}>{ent.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">现任职称及内部职务</label>
                      <input 
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. 首席科学家兼研发总监"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">留学及境外学术研究背景 (描述)</label>
                      <input 
                        type="text"
                        value={formOverseas}
                        onChange={(e) => setFormOverseas(e.target.value)}
                        placeholder="e.g. 曾于美国斯坦福大学从事微纳米机械组装博士后工作4年"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">社会主要职务（多个用逗号隔开）</label>
                      <input 
                        type="text"
                        value={formSocialTitles}
                        onChange={(e) => setFormSocialTitles(e.target.value)}
                        placeholder="e.g. 区人大代表, 市材料协会理事长"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                      />
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 pt-2">奖项资助绑定记录({formAwards.length})</h4>

                  {/* Render linked awards in modal form */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto" id="form-awards-list">
                    {formAwards.map((aw) => (
                      <div key={aw.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{aw.awardName} ({aw.time}年)</p>
                          <p className="text-[10px] text-slate-400">
                            级别: {aw.level} | 资助额: ¥{aw.bonus?.toLocaleString() || "0"} | 状态: <strong>{aw.status}</strong>
                          </p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAwardFromForm(aw.id)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Award micro-form inside modal */}
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
                    <span className="block font-bold text-slate-700">追加新的政策奖励/配套补贴申报：</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">奖励项目名称</label>
                        <input 
                          type="text"
                          value={tempAwardName}
                          onChange={(e) => setTempAwardName(e.target.value)}
                          placeholder="e.g. 市级领军创新人才补贴"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">获得/申报年度</label>
                        <input 
                          type="text"
                          value={tempAwardTime}
                          onChange={(e) => setTempAwardTime(e.target.value)}
                          placeholder="e.g. 2023"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">资助层级</label>
                        <select 
                          value={tempAwardLevel}
                          onChange={(e) => setTempAwardLevel(e.target.value as AwardRecord["level"])}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800 cursor-pointer"
                        >
                          <option value="National">国家级</option>
                          <option value="Provincial">省级</option>
                          <option value="Municipal">市级</option>
                          <option value="District/County">区县级</option>
                          <option value="Institutional">高校企事业单位级</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">审批资助状态</label>
                        <select 
                          value={tempAwardStatus}
                          onChange={(e) => setTempAwardStatus(e.target.value as AwardRecord["status"])}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800 cursor-pointer"
                        >
                          <option value="Awarded">已正式获授</option>
                          <option value="Approved">审批认定完成</option>
                          <option value="Under Review">专家评审材料中</option>
                          <option value="Additional Info Required">材料需退回修改</option>
                          <option value="Expired">资助已届满过期</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">发放奖补金额 (CNY)</label>
                        <input 
                          type="number"
                          value={tempAwardBonus}
                          onChange={(e) => setTempAwardBonus(e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">经办专家评审意见</label>
                      <input 
                        type="text"
                        value={tempAwardOpinion}
                        onChange={(e) => setTempAwardOpinion(e.target.value)}
                        placeholder="请输入合规核验及评审委员会决议详情"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded focus:outline-none text-slate-800"
                      />
                    </div>

                    <button 
                      type="button"
                      onClick={handleAddAwardToForm}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>确认追加当前项目</span>
                    </button>
                  </div>
                </div>

                {/* Form Footer */}
                <div className="flex items-center justify-end space-x-3 border-t border-slate-100 pt-5 mt-6 shrink-0">
                  <button 
                    type="button" 
                    onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold text-slate-600 transition-all cursor-pointer"
                  >
                    取消登记
                  </button>
                  <button 
                    type="submit" 
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer"
                  >
                    {editingTalentId ? "保存并更新档案" : "确认备案并入库"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
