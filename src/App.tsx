/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Building2, Users, LayoutDashboard, Tags, Settings, LogOut, 
  UserCheck, Shield, Menu, X, Bell, Calendar, ChevronRight, CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Talent, Enterprise, SystemTags, OperationLog } from "./types";
import Login from "./components/Login";
import DashboardOverview from "./components/DashboardOverview";
import TalentManager from "./components/TalentManager";
import EnterpriseManager from "./components/EnterpriseManager";
import TagManager from "./components/TagManager";
import SystemSettings from "./components/SystemSettings";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Database states
  const [talents, setTalents] = useState<Talent[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [tags, setTags] = useState<SystemTags>({ industries: [], qualifications: [], educationLevels: [], awardCategories: [] });
  const [logs, setLogs] = useState<OperationLog[]>([]);

  // Loading indicator
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // Time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch all core datasets from server
  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [resTalents, resEnterprises, resTags, resLogs] = await Promise.all([
        fetch("/api/talents"),
        fetch("/api/enterprises"),
        fetch("/api/tags"),
        fetch("/api/logs")
      ]);

      const [dataTalents, dataEnterprises, dataTags, dataLogs] = await Promise.all([
        resTalents.json(),
        resEnterprises.json(),
        resTags.json(),
        resLogs.json()
      ]);

      setTalents(dataTalents || []);
      setEnterprises(dataEnterprises || []);
      setTags(dataTags || { industries: [], qualifications: [], educationLevels: [], awardCategories: [] });
      setLogs(dataLogs || []);
    } catch (err) {
      console.error("Error loading system database:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger reloading on user log in or data modifications
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const handleLoginSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setActiveView("dashboard");
  };

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Count pending reviews in database
  const pendingAwardsCount = talents
    .flatMap(t => t.awards || [])
    .filter(a => a.status === "Under Review" || a.status === "Additional Info Required")
    .length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="main-application-frame">
      
      {/* Dynamic Top Navigation Bar */}
      <header className="bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between text-white sticky top-0 z-40 shadow-sm" id="global-header">
        <div className="flex items-center space-x-4">
          <button 
            id="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-colors cursor-pointer"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md border border-blue-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-white leading-tight">人才与企业信息综合管理平台</h1>
              <p className="text-[10px] text-slate-400 tracking-wider hidden sm:block">人才与企业信息数字化综合保障平台</p>
            </div>
          </div>
        </div>

        {/* Header Right Widgets */}
        <div className="flex items-center space-x-5" id="header-widgets">
          {/* Real-time Digital Clock */}
          <div className="hidden lg:flex flex-col items-end text-xs font-mono text-slate-400">
            <span className="font-semibold text-white">{currentTime.toLocaleTimeString("zh-CN", { hour12: false })}</span>
            <span>{currentTime.toLocaleDateString("zh-CN")} • 实时安全信道</span>
          </div>

          {/* Pending Reviews Notification Indicator */}
          <div className="relative">
            <button 
              id="bell-notification-btn"
              onClick={() => setShowNotification(!showNotification)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-full transition-all relative cursor-pointer"
            >
              <Bell className="w-4.5 h-4.5" />
              {pendingAwardsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            {/* Notification Drawer Popover */}
            {showNotification && (
              <div 
                className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 text-slate-800 p-4"
                id="notification-popover"
              >
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <span className="font-bold text-xs text-slate-900">系统实时申报核验提醒</span>
                  <button onClick={() => setShowNotification(false)} className="text-slate-400 hover:text-slate-600 text-xs">关闭</button>
                </div>
                
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto" id="notification-items">
                  {pendingAwardsCount > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs space-y-1">
                      <p className="font-bold text-amber-800">您今天有待审批的重大资助项目</p>
                      <p className="text-slate-600">当前人才库共有 <strong className="text-amber-900">{pendingAwardsCount} 人</strong> 申报在评或需要追加材料（详见详情审查单）。</p>
                      <button 
                        onClick={() => { setActiveView("talents"); setShowNotification(false); }}
                        className="text-blue-600 hover:text-blue-700 font-bold block mt-1 hover:underline"
                      >
                        去人才池进行资助认定
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs space-y-1">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="font-semibold text-slate-700">暂无待处理警报</p>
                      <p>当前所有政企资质和高层次人才均已完成核实。</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile identifier & Log out button */}
          <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-white">{user.name}</span>
              <span className="block text-[10px] text-slate-400">
                {user.role === "SUPER_ADMIN" ? "超级管理员" :
                 user.role === "ADMIN" ? "业务管理员" :
                 user.role === "ENTRY_CLERK" ? "信息录入员" : "只读查询员"}
              </span>
            </div>
            
            <button 
              id="logout-btn"
              onClick={handleLogout}
              title="退出登录"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Core Layout: Sidebar + Screen Context */}
      <div className="flex-1 flex" id="main-content-layout">
        
        {/* Responsive Sidebar Navigation Drawer */}
        <aside 
          className={`bg-slate-900 border-r border-slate-800/60 text-slate-300 transition-all duration-300 shrink-0 z-30 ${
            sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0"
          }`}
          id="global-sidebar"
        >
          <div className="p-4 space-y-5 flex flex-col justify-between h-[calc(100vh-73px)] sticky top-[73px]">
            {/* Main Tabs Selection list */}
            <div className="space-y-1.5" id="sidebar-nav-list">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pb-2 border-b border-slate-800/60">业务核心面板</span>
              
              <button 
                id="nav-dashboard-btn"
                onClick={() => setActiveView("dashboard")}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeView === "dashboard" 
                    ? "bg-slate-800 text-white font-bold border-l-3 border-l-blue-600 active-highlight" 
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
                <span>实时综合概览</span>
              </button>

              <button 
                id="nav-talents-btn"
                onClick={() => setActiveView("talents")}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeView === "talents" 
                    ? "bg-slate-800 text-white font-bold border-l-3 border-l-blue-600 active-highlight" 
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Users className="w-4.5 h-4.5 shrink-0" />
                <span>高层次人才资源数据库</span>
              </button>

              <button 
                id="nav-enterprises-btn"
                onClick={() => setActiveView("enterprises")}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeView === "enterprises" 
                    ? "bg-slate-800 text-white font-bold border-l-3 border-l-blue-600 active-highlight" 
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Building2 className="w-4.5 h-4.5 shrink-0" />
                <span>重点监测骨干企业库</span>
              </button>

              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pb-2 pt-5 border-b border-slate-800/60">系统维护与核验</span>

              <button 
                id="nav-tags-btn"
                onClick={() => setActiveView("tags")}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeView === "tags" 
                    ? "bg-slate-800 text-white font-bold border-l-3 border-l-blue-600 active-highlight" 
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Tags className="w-4.5 h-4.5 shrink-0" />
                <span>资质与分类词库字典</span>
              </button>

              <button 
                id="nav-system-btn"
                onClick={() => setActiveView("system")}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-xs font-semibold text-left transition-all ${
                  activeView === "system" 
                    ? "bg-slate-800 text-white font-bold border-l-3 border-l-blue-600 active-highlight" 
                    : "hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                <Settings className="w-4.5 h-4.5 shrink-0" />
                <span>系统管理与安全审计</span>
              </button>
            </div>

            {/* Sidebar Footer credit */}
            <div className="bg-slate-950/40 border border-slate-800/50 p-3 rounded-lg text-[10px] text-slate-500 leading-normal" id="sidebar-credit">
              <span className="block font-bold text-slate-400">系统授权凭证有效</span>
              <p className="mt-0.5">TLS专线加密通信信道已确立。</p>
            </div>
          </div>
        </aside>

        {/* Dynamic Screens Stage container */}
        <main className="flex-1 bg-slate-100 overflow-y-auto px-6 py-6" id="main-viewport-stage">
          {loading && (
            <div className="h-1.5 bg-blue-100 overflow-hidden relative mb-4 rounded" id="view-load-progress">
              <div className="absolute top-0 left-0 bottom-0 bg-blue-600 animate-[pulse_1s_infinite]" style={{ width: "40%" }}></div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === "dashboard" && (
                <DashboardOverview 
                  talents={talents} 
                  enterprises={enterprises} 
                  logs={logs} 
                  user={user} 
                  onNavigate={setActiveView} 
                />
              )}

              {activeView === "talents" && (
                <TalentManager 
                  talents={talents} 
                  enterprises={enterprises} 
                  tags={tags} 
                  user={user} 
                  onRefreshData={fetchAllData} 
                />
              )}

              {activeView === "enterprises" && (
                <EnterpriseManager 
                  enterprises={enterprises} 
                  talents={talents} 
                  tags={tags} 
                  user={user} 
                  onRefreshData={fetchAllData} 
                />
              )}

              {activeView === "tags" && (
                <TagManager 
                  tags={tags} 
                  user={user} 
                  onRefreshData={fetchAllData} 
                />
              )}

              {activeView === "system" && (
                <SystemSettings 
                  user={user} 
                  logs={logs} 
                  onRefreshData={fetchAllData} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
