/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Settings, Users, ShieldAlert, Check, X, Shield, RefreshCw, Database, 
  Trash2, FileDown, Search, ArrowLeft, ArrowRight, Save, Play, Trash, 
  Activity, Key, Mail, UserPlus, AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { User, UserRole, OperationLog, SystemConfig } from "../types";

interface SystemSettingsProps {
  user: User;
  logs: OperationLog[];
  onRefreshData: () => void;
}

export default function SystemSettings({ user, logs, onRefreshData }: SystemSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"users" | "logs" | "backup">("users");
  
  // Backups and Settings Config State
  const [backupFreq, setBackupFreq] = useState<SystemConfig["backupFrequency"]>("WEEKLY");
  const [retentionDays, setRetentionDays] = useState(30);
  const [autoCleanAttachments, setAutoCleanAttachments] = useState(true);
  const [autoCleanAge, setAutoCleanAge] = useState(3);

  // Users List State (loaded from server)
  const [usersList, setUsersList] = useState<User[]>([]);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>(UserRole.ENTRY_CLERK);

  // Pagination & Search for Logs
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // Global Alert
  const [globalAlert, setGlobalAlert] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showAlert = (type: "success" | "error", message: string) => {
    setGlobalAlert({ type, message });
    setTimeout(() => setGlobalAlert(null), 4500);
  };

  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  // Fetch users & config on load
  const loadSystemSettings = async () => {
    try {
      // Fetch users
      const resUsers = await fetch("/api/users");
      const dataUsers = await resUsers.json();
      setUsersList(dataUsers || []);

      // Fetch config
      const resConfig = await fetch("/api/config");
      const dataConfig = await resConfig.json();
      if (dataConfig && dataConfig.backupFrequency) {
        setBackupFreq(dataConfig.backupFrequency);
        setRetentionDays(dataConfig.backupRetentionDays || 30);
        setAutoCleanAttachments(dataConfig.autoCleanAttachments !== false);
        setAutoCleanAge(dataConfig.autoCleanAgeYears || 3);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadSystemSettings();
  }, []);

  // Save Config Parameters
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showAlert("error", "权限不足：只有超级管理员可配置系统维护参数。");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({
          backupFrequency: backupFreq,
          backupRetentionDays: Number(retentionDays),
          autoCleanAttachments: autoCleanAttachments,
          autoCleanAgeYears: Number(autoCleanAge)
        })
      });

      if (response.ok) {
        showAlert("success", "已成功保存并下发全新系统维护与冷备容灾参数。");
        onRefreshData();
      } else {
        showAlert("error", "参数保存失败。");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "网络连接错误");
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Action (manual backup or manual clean)
  const triggerSystemAction = async (action: "backup" | "clean") => {
    if (!isSuperAdmin) {
      showAlert("error", "权限不足：只有系统超级管理员可执行维护及物理清洗作业。");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch("/api/system/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        showAlert("success", data.message || "维护任务执行成功。");
        onRefreshData();
      } else {
        showAlert("error", data.error || "任务执行失败");
      }
    } catch (err) {
      console.error(err);
      showAlert("error", "维护任务请求超时，请检查服务端连接。");
    } finally {
      setActionLoading(false);
    }
  };

  // Create mock user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showAlert("error", "只有超级管理员方可新建系统操作账号。");
      return;
    }

    if (!newUsername.trim() || !newName.trim()) {
      showAlert("error", "姓名和电子邮箱均为必填项。");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase(),
          name: newName.trim(),
          role: newRole,
          status: "ACTIVE"
        })
      });

      if (response.ok) {
        showAlert("success", `已成功创建业务账号 "${newName}" 并授予 ${newRole} 凭证！`);
        setNewUsername("");
        setNewName("");
        setNewUserOpen(false);
        loadSystemSettings();
        onRefreshData();
      } else {
        showAlert("error", "创建失败。");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle user status (Active / Disabled)
  const toggleUserStatus = async (targetUser: User) => {
    if (!isSuperAdmin) {
      showAlert("error", "权限不足：您无权锁定或解锁业务员账号。");
      return;
    }

    if (targetUser.id === user.id) {
      showAlert("error", "安全断路器拦截：您不能禁用自己当前正处于会话中的账号！");
      return;
    }

    const nextStatus = targetUser.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        showAlert("success", `账号 "${targetUser.name}" 状态已更改为 ${nextStatus === "ACTIVE" ? "【启用】" : "【禁用锁定】"}`);
        loadSystemSettings();
        onRefreshData();
      } else {
        showAlert("error", "状态切换失败");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Modify user role
  const changeUserRole = async (targetUser: User, nextRole: UserRole) => {
    if (!isSuperAdmin) {
      showAlert("error", "权限不足：您无权修改系统业务组授权梯度。");
      return;
    }

    try {
      const response = await fetch(`/api/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Operator-User": user.username,
          "X-Operator-Name": user.name,
          "X-Operator-Role": user.role
        },
        body: JSON.stringify({ role: nextRole })
      });

      if (response.ok) {
        showAlert("success", `已重设业务员 "${targetUser.name}" 授权为 ${nextRole}`);
        loadSystemSettings();
        onRefreshData();
      } else {
        showAlert("error", "修改授权失败");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Log filter processing
  const filteredLogs = logs.filter(log => {
    const matchSearch = logSearch === "" || 
      log.name.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.username.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.target.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.details.toLowerCase().includes(logSearch.toLowerCase());

    const matchAction = logActionFilter === "" || log.actionType === logActionFilter;
    return matchSearch && matchAction;
  });

  // Logs pagination helpers
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage) || 1;
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  return (
    <div className="space-y-6" id="system-settings-panel">
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

      {/* Header Info Panel */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <Settings className="w-5 h-5 text-blue-600" />
          <span>系统管理及底层高阶运维服务</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          在此可审计全平台操作运行日志、管理业务团队登录账号及操作凭据。超级管理员亦可启动数据库冷备及申报材料/扫描文档物理清洗维护作业。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="settings-main-layout">
        {/* Left selector */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-xl shadow-xs p-4 space-y-1" id="settings-selector">
          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2.5 pb-2 mb-2 border-b border-slate-100">运维与核验大项</span>
          
          <button 
            onClick={() => setActiveSubTab("users")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeSubTab === "users" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>业务账号及授权体系 ({usersList.length})</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("logs")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeSubTab === "logs" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>审计日志追溯中心 ({logs.length})</span>
          </button>

          <button 
            onClick={() => setActiveSubTab("backup")}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-all ${
              activeSubTab === "backup" 
                ? "bg-blue-50 text-blue-800 font-bold border-l-2 border-l-blue-600" 
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>容灾冷备及附件归档维护</span>
          </button>
        </div>

        {/* Right sub-tabs content */}
        <div className="lg:col-span-3 bg-white border border-slate-200/80 rounded-xl shadow-xs p-6" id="settings-content-panel">
          
          {/* Subtab 1: Account Users Manager */}
          {activeSubTab === "users" && (
            <div className="space-y-6" id="users-tab-content">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">业务团队登录账号及操作权限审查</h3>
                  <p className="text-xs text-slate-400 mt-0.5">登记在案的办事员、专家评审秘书和系统管理群</p>
                </div>

                {isSuperAdmin && (
                  <button 
                    id="add-user-modal-btn"
                    onClick={() => setNewUserOpen(!newUserOpen)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>添加办事员</span>
                  </button>
                )}
              </div>

              {/* Create User Small Form inline */}
              {newUserOpen && (
                <motion.form 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleCreateUser} 
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
                  id="create-user-inline-form"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">系统邮箱(唯一凭证)</label>
                    <input 
                      type="email" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. clerk2@enterprise.gov.cn"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">办事员姓名</label>
                    <input 
                      type="text" 
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. 钱科长"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">业务部门授权阶梯</label>
                    <select 
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value={UserRole.ADMIN}>业务管理员</option>
                      <option value={UserRole.ENTRY_CLERK}>信息录入员</option>
                      <option value={UserRole.QUERY_CLERK}>数据查询员</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs transition-all cursor-pointer"
                    >
                      确认下发账号
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Users List Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200/60">
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                      <th className="p-3 pl-4">姓名</th>
                      <th className="p-3">系统登录凭证 (E-mail)</th>
                      <th className="p-3">角色权限授权等级</th>
                      <th className="p-3">账户核状态</th>
                      {isSuperAdmin && <th className="p-3 text-right pr-4">运维控制</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700" id="users-table-body">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold border">
                              {usr.name[0]}
                            </div>
                            <span className="font-bold text-slate-900">{usr.name}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono">{usr.username}</td>
                        <td className="p-3">
                          {isSuperAdmin && usr.id !== user.id ? (
                            <select 
                              value={usr.role}
                              onChange={(e) => changeUserRole(usr, e.target.value as UserRole)}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-800 cursor-pointer focus:outline-none"
                            >
                              <option value="SUPER_ADMIN">超级管理员</option>
                              <option value="ADMIN">业务管理员</option>
                              <option value="ENTRY_CLERK">信息录入员</option>
                              <option value="QUERY_CLERK">只读查询员</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              usr.role === "SUPER_ADMIN" ? "bg-red-50 text-red-700" :
                              usr.role === "ADMIN" ? "bg-yellow-50 text-yellow-700" :
                              usr.role === "ENTRY_CLERK" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {usr.role}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`w-2.5 h-2.5 rounded-full inline-block mr-1.5 ${
                            usr.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                          }`} />
                          <span className="font-semibold">{usr.status === "ACTIVE" ? "启用" : "注销禁用"}</span>
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3 text-right pr-4">
                            {usr.id !== user.id ? (
                              <button 
                                type="button"
                                onClick={() => toggleUserStatus(usr)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  usr.status === "ACTIVE" 
                                    ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200" 
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200"
                                }`}
                              >
                                {usr.status === "ACTIVE" ? "封锁注销" : "复核启用"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">会话主控中</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!isSuperAdmin && (
                <div className="p-3.5 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start space-x-2 text-[11px] text-yellow-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                  <span>注意：您当前是以非超管身份登录。账户配置体系已加锁，如需对经办人员分配新密钥，请联系系统超级管理员。</span>
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Audit Logs Manager */}
          {activeSubTab === "logs" && (
            <div className="space-y-4" id="logs-tab-content">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">辖区平台业务操作追溯审计系统</h3>
                  <p className="text-xs text-slate-400 mt-0.5">实时记载一切新增、修改、导入导出及大模型解析履职轨迹</p>
                </div>
              </div>

              {/* Audit search filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={logSearch}
                    onChange={(e) => { setLogSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="搜索经办姓名 / 账号 / details..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <select 
                    value={logActionFilter}
                    onChange={(e) => { setLogActionFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none cursor-pointer text-slate-700"
                  >
                    <option value="">操作动作大类: 全部</option>
                    <option value="LOGIN">系统鉴权登录</option>
                    <option value="CREATE">新增档案及录入</option>
                    <option value="UPDATE">要素变更及修改</option>
                    <option value="DELETE">档案彻底销毁</option>
                    <option value="IMPORT">批量数据导入</option>
                    <option value="BACKUP">冷备容灾操作</option>
                    <option value="PARSE_CV">AI 简历大模型解析</option>
                  </select>
                </div>

                <div className="text-right text-[11px] text-slate-400 flex items-center justify-end">
                  <span>共计追溯审计到 <strong className="text-slate-700">{filteredLogs.length}</strong> 条轨迹</span>
                </div>
              </div>

              {/* Logs Rows */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1" id="audit-logs-list">
                {currentLogs.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 text-xs">无对应经办日志归档</p>
                ) : (
                  currentLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-50 border rounded-lg text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-100 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold ${
                            log.actionType === "CREATE" ? "bg-green-100 text-green-800" :
                            log.actionType === "DELETE" ? "bg-red-100 text-red-800" :
                            log.actionType === "LOGIN" ? "bg-blue-100 text-blue-800" :
                            log.actionType === "PARSE_CV" ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-800"
                          }`}>
                            {log.actionType}
                          </span>
                          <span className="font-bold text-slate-900">{log.name}</span>
                          <span className="text-slate-400">({log.role})</span>
                        </div>
                        <p className="text-slate-700"><strong className="text-slate-900">[{log.target}]</strong> - {log.details}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block font-mono">{new Date(log.time).toLocaleString("zh-CN")}</span>
                        <span className="text-[9px] text-slate-500 font-mono">ID: {log.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs text-slate-400">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>上一页</span>
                  </button>
                  <span>第 {currentPage} / {totalPages} 页</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span>下一页</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subtab 3: Backup Database and Attachment maintenance */}
          {activeSubTab === "backup" && (
            <div className="space-y-6" id="backup-tab-content">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">综合冷备份容灾与历史资料物理清洗</h3>
                <p className="text-xs text-slate-400 mt-0.5">防范物理断电与服务器硬盘异常，归口安全管理条例</p>
              </div>

              {/* Split Action: Manual trigger left, Config parameters form right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Immediate Tasks Triggers */}
                <div className="space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <span className="block text-xs font-bold text-slate-900 flex items-center">
                      <Database className="w-4 h-4 text-blue-600 mr-1.5 shrink-0" />
                      <span>立即触发冷备份与清理作业</span>
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      备份数据库会将包括用户权限、在册骨干企业档案、人才基本经历、所受表彰资金在内的所有底层要素打包生成容灾 JSON 快照，保存在服务器 `/data/backups/` 物理归档库。
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-slate-200/50">
                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => triggerSystemAction("backup")}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white rounded text-xs font-bold transition-all shadow-xs flex justify-center items-center space-x-1 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>立即生成备份数据快照</span>
                    </button>

                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => triggerSystemAction("clean")}
                      className="w-full py-2 bg-red-50 hover:bg-red-100 disabled:bg-red-50/50 text-red-600 border border-red-200 rounded text-xs font-bold transition-all flex justify-center items-center space-x-1 cursor-pointer"
                    >
                      <Trash className="w-3.5 h-3.5" />
                      <span>物理清洗 3 年前无用审批材料</span>
                    </button>
                  </div>
                </div>

                {/* Automation Parameters Form */}
                <form onSubmit={handleSaveConfig} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="block text-xs font-bold text-slate-900 flex items-center">
                      <Settings className="w-4 h-4 text-blue-600 mr-1.5 shrink-0" />
                      <span>自动化机制配置参数</span>
                    </span>

                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">自动备份周期</label>
                        <select 
                          value={backupFreq}
                          onChange={(e) => setBackupFreq(e.target.value as any)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="DAILY">每日凌晨冷备</option>
                          <option value="WEEKLY">每周日夜间备份</option>
                          <option value="MONTHLY">每月首日快照</option>
                          <option value="MANUAL">仅允许手动导出</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">快照保留时长 (天)</label>
                        <input 
                          type="number"
                          value={retentionDays}
                          onChange={(e) => setRetentionDays(Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      <label className="flex items-center space-x-2 cursor-pointer mt-2">
                        <input 
                          type="checkbox"
                          checked={autoCleanAttachments}
                          onChange={(e) => setAutoCleanAttachments(e.target.checked)}
                          className="rounded text-blue-600"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">自动清理过期冗余材料</span>
                          <span className="text-[9px] text-slate-400 block">清理库中老旧、届满的电子扫描佐证PDF附件</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200/50">
                    <button 
                      type="submit"
                      disabled={actionLoading}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all shadow-xs flex justify-center items-center space-x-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>保存并实施自动化参数</span>
                    </button>
                  </div>
                </form>
              </div>

              {!isSuperAdmin && (
                <div className="p-3.5 bg-yellow-50 border border-yellow-100 rounded-lg flex items-start space-x-2 text-[11px] text-yellow-800">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-yellow-600" />
                  <span>注意：非超级管理员无权调整底层灾备、更改持久化周期快照或者下达物理清洗指令。请使用超管特权账号执行。</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
