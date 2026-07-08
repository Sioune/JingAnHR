/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, Building2, Award, Calendar, FileText, ArrowRight, TrendingUp, 
  MapPin, CheckCircle, Clock, AlertTriangle, ChevronRight, Activity, 
  TrendingDown, Briefcase, Plus, Search
} from "lucide-react";
import { motion } from "motion/react";
import { Talent, Enterprise, OperationLog, UserRole, User, translateIndustry } from "../types";

const translateAwardLevel = (level: string) => {
  switch (level) {
    case "National": return "国家";
    case "Provincial": return "省";
    case "Municipal": return "市";
    case "District/County": return "区县";
    case "Institutional": return "单位/院校";
    default: return level;
  }
};

interface DashboardOverviewProps {
  talents: Talent[];
  enterprises: Enterprise[];
  logs: OperationLog[];
  user: User;
  onNavigate: (view: string) => void;
}

export default function DashboardOverview({ talents, enterprises, logs, user, onNavigate }: DashboardOverviewProps) {
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [hoveredIndustryIndex, setHoveredIndustryIndex] = useState<number | null>(null);

  // Compute stats
  const totalTalents = talents.length;
  const totalEnterprises = enterprises.length;
  
  // Total awards count across all talents
  const totalAwards = talents.reduce((acc, t) => acc + (t.awards?.length || 0), 0);
  
  // High-Tech enterprises count
  const totalHighTech = enterprises.filter(e => e.isHighTech).length;
  // Little Giants
  const totalLittleGiants = enterprises.filter(e => e.isLittleGiant).length;
  // Specialized and Innovative
  const totalSpecialized = enterprises.filter(e => e.isSpecializedNew).length;

  // Active awards vs Under Review
  const allAwardsList = talents.flatMap(t => t.awards.map(a => ({ ...a, talentName: t.name })));
  const pendingAwards = allAwardsList.filter(a => a.status === "Under Review" || a.status === "Additional Info Required");
  const approvedAwardsCount = allAwardsList.filter(a => a.status === "Awarded" || a.status === "Approved").length;

  // Industry breakdown data
  const industryCounts: { [key: string]: number } = {};
  enterprises.forEach(e => {
    const ind = translateIndustry(e.industry) || "其他";
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });

  const industryData = Object.keys(industryCounts).map(name => ({
    name,
    value: industryCounts[name],
    percentage: Math.round((industryCounts[name] / (totalEnterprises || 1)) * 100)
  })).sort((a, b) => b.value - a.value);

  // Growth Trend over last 6 months (mock database)
  const growthData = [
    { month: "1月", count: 142, newTalents: 15, activeEnts: 48 },
    { month: "2月", count: 158, newTalents: 18, activeEnts: 52 },
    { month: "3月", count: 180, newTalents: 22, activeEnts: 58 },
    { month: "4月", count: 204, newTalents: 24, activeEnts: 62 },
    { month: "5月", count: 235, newTalents: 31, activeEnts: 68 },
    { month: "6月", count: talents.length + 225, newTalents: talents.length, activeEnts: enterprises.length }
  ];

  // Colors for SVG Charts
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#64748b"];

  // SVG dimensions for Line Chart
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 20;

  const getCoordinates = (index: number, val: number, maxVal: number) => {
    const x = paddingX + (index / (growthData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (val / maxVal) * (svgHeight - paddingY * 2);
    return { x, y };
  };

  const maxCount = Math.max(...growthData.map(d => d.count)) * 1.1;

  // Generate SVG path for line
  const linePoints = growthData.map((d, i) => {
    const { x, y } = getCoordinates(i, d.count, maxCount);
    return `${x},${y}`;
  }).join(" ");

  // Generate SVG path for area fill
  const areaPoints = `${getCoordinates(0, 0, maxCount).x},${svgHeight - paddingY} ` + 
                     linePoints + 
                     ` ${getCoordinates(growthData.length - 1, 0, maxCount).x},${svgHeight - paddingY}`;

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-1" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -z-1" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center space-x-2 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span>实时数据中心已连接</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-2">
            您好，{user.name} <span className="font-normal text-slate-500">({user.role === UserRole.SUPER_ADMIN ? "系统超级管理员" : user.role === UserRole.ADMIN ? "业务管理员" : user.role === UserRole.ENTRY_CLERK ? "信息录入员" : "只读查询员"})</span>
          </h2>
          <p className="text-sm text-slate-500">
            欢迎登录人才与企业信息综合管理平台。今天您有 <span className="text-blue-600 font-semibold">{pendingAwards.length} 项</span> 待审核奖项及引进申报。
          </p>
        </div>

        {/* Shortcuts Buttons */}
        <div className="flex items-center space-x-3 mt-4 md:mt-0 z-10 shrink-0">
          {user.role !== UserRole.QUERY_CLERK && (
            <>
              <button 
                id="dash-add-talent-btn"
                onClick={() => onNavigate("talents")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>登记人才</span>
              </button>
              <button 
                id="dash-add-enterprise-btn"
                onClick={() => onNavigate("enterprises")}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>登记企业</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="bento-stats">
        {/* Talents Card */}
        <div 
          onClick={() => onNavigate("talents")}
          className="gov-card p-5 cursor-pointer hover:shadow-md border-l-4 border-l-blue-600 group"
          id="stat-talents-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">高层次人才总量</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-all">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 font-sans">{totalTalents}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +15%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">包含博士后及博士研究生等领军科技人才</p>
        </div>

        {/* Enterprises Card */}
        <div 
          onClick={() => onNavigate("enterprises")}
          className="gov-card p-5 cursor-pointer hover:shadow-md border-l-4 border-l-slate-800 group"
          id="stat-enterprises-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">监测服务企业数</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800 group-hover:bg-slate-200 transition-all">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 font-sans">{totalEnterprises}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +8.4%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            包含高新企业 <span className="font-semibold text-slate-700">{totalHighTech}</span> 家
          </p>
        </div>

        {/* Active Awards / Qualification Card */}
        <div 
          onClick={() => onNavigate("talents")}
          className="gov-card p-5 cursor-pointer hover:shadow-md border-l-4 border-l-emerald-600 group"
          id="stat-awards-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">已授认定人次</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-all">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 font-sans">{approvedAwardsCount}</span>
            <span className="text-xs font-medium text-slate-500">/ {totalAwards}总申请</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            当前处于在评状态：<span className="text-orange-600 font-semibold">{pendingAwards.length} 人</span>
          </p>
        </div>

        {/* Regional Quality Indicators */}
        <div 
          onClick={() => onNavigate("enterprises")}
          className="gov-card p-5 cursor-pointer hover:shadow-md border-l-4 border-l-purple-600 group"
          id="stat-quality-card"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">专精特新/小巨人</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-100 transition-all">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 font-sans">{totalSpecialized}</span>
            <span className="text-xs text-slate-500 font-medium">/ {totalLittleGiants} 小巨人</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">占辖区规模以上重点产业 28.5% 权重</p>
        </div>
      </div>

      {/* Main Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-layout">
        {/* Trend Growth Chart (Line Chart) */}
        <div className="lg:col-span-2 gov-card p-6 flex flex-col justify-between" id="trend-chart-card">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>新增高层次人才引进增长趋势</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">辖区近6个月以来引进人才动态累积折线图</p>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <span className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="text-slate-600">总在册人才</span>
                </span>
              </div>
            </div>

            {/* Custom Interactive SVG Line Chart */}
            <div className="relative mt-6 h-[200px]" id="svg-chart-container">
              <svg width="100%" height={svgHeight} className="overflow-visible">
                {/* Defs for gradients */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingY + ratio * (svgHeight - paddingY * 2);
                  const value = Math.round(maxCount * (1 - ratio));
                  return (
                    <g key={idx}>
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={svgWidth - paddingX} 
                        y2={y} 
                        stroke="#e2e8f0" 
                        strokeWidth="1" 
                        strokeDasharray="4 4" 
                      />
                      <text 
                        x={paddingX - 10} 
                        y={y + 4} 
                        textAnchor="end" 
                        className="text-[10px] font-mono text-slate-400 fill-current"
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}

                {/* X Axis labels */}
                {growthData.map((d, i) => {
                  const { x } = getCoordinates(i, d.count, maxCount);
                  return (
                    <text 
                      key={i} 
                      x={x} 
                      y={svgHeight - 4} 
                      textAnchor="middle" 
                      className="text-[10px] text-slate-500 fill-current font-medium"
                    >
                      {d.month}
                    </text>
                  );
                })}

                {/* Area under line */}
                <polygon points={areaPoints} fill="url(#chartGradient)" />

                {/* Main trend line */}
                <polyline 
                  points={linePoints} 
                  fill="none" 
                  stroke="#2563eb" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {growthData.map((d, i) => {
                  const { x, y } = getCoordinates(i, d.count, maxCount);
                  const isHovered = hoveredTrendIndex === i;
                  return (
                    <g 
                      key={i} 
                      onMouseEnter={() => setHoveredTrendIndex(i)} 
                      onMouseLeave={() => setHoveredTrendIndex(null)}
                      className="cursor-pointer"
                    >
                      <circle 
                        cx={x} 
                        cy={y} 
                        r={isHovered ? 6 : 4} 
                        fill="#ffffff" 
                        stroke="#2563eb" 
                        strokeWidth={isHovered ? 3 : 2} 
                        transition="all 0.1s"
                      />
                      
                      {/* Invisible hover helper */}
                      <circle cx={x} cy={y} r={16} fill="transparent" />
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredTrendIndex !== null && (
                <div 
                  className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-lg border border-slate-700 text-xs z-20 space-y-1"
                  style={{
                    left: `${(hoveredTrendIndex / (growthData.length - 1)) * 75 + 10}%`,
                    top: "10px"
                  }}
                  id="chart-tooltip"
                >
                  <p className="font-semibold text-[11px] text-blue-300">{growthData[hoveredTrendIndex].month} 统计指标</p>
                  <p>人才总累积: <span className="font-mono font-bold text-white">{growthData[hoveredTrendIndex].count}人</span></p>
                  <p>当月新登记: <span className="font-mono text-emerald-400 font-bold">+{growthData[hoveredTrendIndex].newTalents}人</span></p>
                  <p>关联企业: <span className="font-mono text-slate-300">{growthData[hoveredTrendIndex].activeEnts}家</span></p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>信息统计口径：截止至 {new Date().toLocaleDateString("zh-CN")}</span>
            <button 
              onClick={() => onNavigate("talents")}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-0.5 hover:underline"
            >
              <span>查看人才池明细</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Industry Breakdown (Donut Representation / Progress) */}
        <div className="gov-card p-6 flex flex-col justify-between" id="industry-chart-card">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>监测企业行业及梯队分布</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">本辖区内企业主要支柱产业及分布结构</p>

            {/* List with Progress Bars */}
            <div className="space-y-3.5 mt-5" id="industry-progress-bars">
              {industryData.slice(0, 5).map((industry, index) => (
                <div 
                  key={index}
                  onMouseEnter={() => setHoveredIndustryIndex(index)}
                  onMouseLeave={() => setHoveredIndustryIndex(null)}
                  className="space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 group-hover:text-blue-700 transition-colors">{industry.name}</span>
                    <span className="font-mono text-slate-500 font-semibold">{industry.value} 家 ({industry.percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${industry.percentage}%`,
                        backgroundColor: colors[index % colors.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => onNavigate("enterprises")}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold text-center transition-all border border-slate-200/60 block"
            >
              筛选与多维度分析企业群
            </button>
          </div>
        </div>
      </div>

      {/* Under review awards & Activity Logs Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-bottom-layout">
        {/* Pending / Active Review Board */}
        <div className="lg:col-span-2 gov-card p-6" id="pending-reviews-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>申报中/待补充材料人才奖项审核清单</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">当前处于未完成审核或需追加证明的申报项目 ({pendingAwards.length} 项)</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 font-mono text-xs font-bold">{pendingAwards.length}</span>
          </div>

          {/* Under Review items list */}
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1" id="pending-awards-list">
            {pendingAwards.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p>所有申报奖项与引进核销均已审批归档</p>
              </div>
            ) : (
              pendingAwards.map((award, index) => (
                <div 
                  key={index} 
                  className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs transition-all ${
                    award.status === "Additional Info Required" 
                      ? "bg-red-50/50 border-red-100 hover:bg-red-50" 
                      : "bg-amber-50/50 border-amber-100 hover:bg-amber-50"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{award.talentName}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-medium">
                        {translateAwardLevel(award.level)}级
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700">{award.awardName}</p>
                    {award.opinion && (
                      <p className="text-slate-500 italic mt-1 font-sans">
                        审核意见: "{award.opinion}"
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 sm:mt-0 flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      award.status === "Additional Info Required" 
                        ? "bg-red-100 text-red-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {award.status === "Additional Info Required" ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 mr-0.5" />
                          <span>需补充材料</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 mr-0.5" />
                          <span>专家评审中</span>
                        </>
                      )}
                    </span>

                    <button 
                      onClick={() => onNavigate("talents")}
                      className="p-1.5 hover:bg-slate-200/50 rounded text-slate-500 hover:text-slate-800"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent System Activity Logs */}
        <div className="gov-card p-6 flex flex-col justify-between" id="recent-logs-panel">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>系统运行日志摘要</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">业务部门关键操作行为实时追踪</p>

            <div className="space-y-3.5 mt-5 max-h-[220px] overflow-y-auto pr-1" id="dash-logs-list">
              {logs.slice(0, 4).map((log, index) => (
                <div key={index} className="flex space-x-2.5 text-xs">
                  <div className="mt-0.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full block ${
                      log.actionType === "CREATE" ? "bg-green-500" :
                      log.actionType === "DELETE" ? "bg-red-500" :
                      log.actionType === "LOGIN" ? "bg-blue-400" : "bg-slate-400"
                    }`} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-slate-800">{log.name}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-400 text-[10px]">{new Date(log.time).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600 line-clamp-1">{log.target}: {log.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <button 
              onClick={() => onNavigate("system")}
              className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold text-center transition-all border border-slate-200/60 block"
            >
              浏览历史操作审计日志
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
