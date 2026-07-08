/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Tags, Plus, Trash2, ShieldAlert, Check, X, Building2, Award, 
  BookOpen, Briefcase, RefreshCw 
} from "lucide-react";
import { motion } from "motion/react";
import { SystemTags, User, UserRole } from "../types";

interface TagManagerProps {
  tags: SystemTags;
  user: User;
  onRefreshData: () => void;
}

export default function TagManager({ tags, user, onRefreshData }: TagManagerProps) {
  const [activeTab, setActiveTab] = useState<"industries" | "qualifications" | "educationLevels" | "awardCategories">("industries");
  const [newTagText, setNewTagText] = useState("");
  
  const [globalAlert, setGlobalAlert] = useState<{ type: "success" | "error", message: string } | null>(null);

  const showAlert = (type: "success" | "error", message: string) => {
    setGlobalAlert({ type, message });
    setTimeout(() => setGlobalAlert(null), 4000);
  };

  const isQueryClerk = user.role === UserRole.QUERY_CLERK;
  const isEntryClerk = user.role === UserRole.ENTRY_CLERK;
  const canModify = !isQueryClerk && !isEntryClerk; // Only Admin or Super Admin can edit classifications

  // Add tag
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagText.trim()) return;

    if (!canModify) {
      showAlert("error", "权限不足：信息录入员及只读查询员无法修改分类。");
      return;
    }

    const currentList = tags[activeTab] || [];
    if (currentList.includes(newTagText.trim())) {
      showAlert("error", "该分类或标签已经存在，请勿重复添加。");
      return;
    }

    const updatedTags = {
      ...tags,
      [activeTab]: [...currentList, newTagText.trim()]
    };

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify(updatedTags)
      });

      if (response.ok) {
        showAlert("success", "已成功追加新分类条目并完成同步。");
        setNewTagText("");
        onRefreshData();
      } else {
        showAlert("error", "保存失败");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络连接错误");
    }
  };

  // Delete tag
  const handleDeleteTag = async (tagToDelete: string) => {
    if (!canModify) {
      showAlert("error", "权限不足：信息录入员及只读查询员无法修改分类。");
      return;
    }

    if (!window.confirm(`确认要彻底移除该分类项 "${tagToDelete}" 吗？移除后已登记项目仍保留该属性，但后续不可选。`)) {
      return;
    }

    const updatedTags = {
      ...tags,
      [activeTab]: (tags[activeTab] || []).filter(t => t !== tagToDelete)
    };

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify(updatedTags)
      });

      if (response.ok) {
        showAlert("success", "分类条目删除成功。");
        onRefreshData();
      } else {
        showAlert("error", "删除失败");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络故障");
    }
  };

  return (
    <div className="space-y-6" id="tag-manager-panel">
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

      {/* Header Info Banner */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Tags className="w-5 h-5 text-blue-600" />
          <span>系统核心资质及分类标签配置</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          在此可统一维护全局下拉菜单所需的选项字典。包含：重点监测企业行业分类、认定梯度资格资质、人才学历层次段和政策性奖励大类，确保业务数据填报的标准性与合规性。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="tags-main-grid">
        {/* Left selection list (categories list) */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-xl shadow-xs p-4 space-y-1" id="tag-categories-selector">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 pb-2 mb-2 border-b border-slate-100">标签分类维度字典</span>
          
          <button 
            onClick={() => setActiveTab("industries")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeTab === "industries" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>企业行业分类 ({tags.industries?.length || 0})</span>
          </button>

          <button 
            onClick={() => setActiveTab("qualifications")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeTab === "qualifications" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>企业资信/高新认定资质 ({tags.qualifications?.length || 0})</span>
          </button>

          <button 
            onClick={() => setActiveTab("educationLevels")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeTab === "educationLevels" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>人才学历梯队阶段 ({tags.educationLevels?.length || 0})</span>
          </button>

          <button 
            onClick={() => setActiveTab("awardCategories")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeTab === "awardCategories" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>奖励及资助扶持大类 ({tags.awardCategories?.length || 0})</span>
          </button>
        </div>

        {/* Right tags list editor */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-xl shadow-xs p-6 space-y-6" id="tag-items-editor">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                {activeTab === "industries" ? "企业重点监测行业分类配置" :
                 activeTab === "qualifications" ? "企业工商/认定资信资质词条" :
                 activeTab === "educationLevels" ? "人才学历审查层次字典" : "政策扶持资金与奖励大类"}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">当前在册生效的属性选项：</p>
            </div>
            
            {/* Tag add form */}
            {canModify && (
              <form onSubmit={handleAddTag} className="flex items-center space-x-2">
                <input 
                  id="new-tag-input"
                  type="text"
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  placeholder="追加新分类词条"
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 text-slate-800"
                  required
                />
                <button 
                  id="add-tag-btn"
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加词条</span>
                </button>
              </form>
            )}
          </div>

          {/* Render Active categories items list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" id="tag-items-grid">
            {(tags[activeTab] || []).length === 0 ? (
              <p className="text-center py-10 col-span-3 text-slate-400 text-xs">当前字典值为空。请在上方输入框中录入并追加新数据项。</p>
            ) : (
              (tags[activeTab] || []).map((tag, idx) => (
                <div 
                  key={idx} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-lg flex items-center justify-between text-xs transition-all group"
                >
                  <span className="font-semibold text-slate-800 truncate pr-2">{tag}</span>
                  {canModify ? (
                    <button 
                      type="button"
                      onClick={() => handleDeleteTag(tag)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                      title="废除当前选项"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>

          {!canModify && (
            <div className="p-3.5 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start space-x-2 text-[11px] text-yellow-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
              <span>注意：您当前登录的身份没有词库和分类词典的修改权（仅限超级管理员和业务管理员编辑）。您可以调阅和检索现有属性。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
