/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Eye, EyeOff, Building2, UserCheck, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("admin@enterprise.gov.cn");
  const [password, setPassword] = useState("********");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async (presetUser: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: presetUser, password: "password" })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "登录失败，请重试。");
      }
    } catch (err) {
      console.error(err);
      setError("无法连接到身份验证服务器。");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("请输入用户名/邮箱");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || "用户名不存在或已停用");
      }
    } catch (err) {
      console.error(err);
      setError("登录失败：网络连接异常");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden text-slate-100 font-sans" id="login-container">
      {/* Decorative background grid and nodes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      {/* Top Bar - Brand Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-10 border-b border-slate-800/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-md border border-blue-500/30">
            <Building2 className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">人才与企业信息综合管理平台</h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">人才与企业信息综合服务枢纽</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-full border border-slate-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>系统专网安全通道已启用</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-10 py-10">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-xl border border-slate-800/80 shadow-2xl p-8"
          id="login-card"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-blue-500/10 text-blue-400 mb-3 border border-blue-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">系统安全认证登录</h2>
            <p className="text-sm text-slate-400 mt-1">请输入业务凭证以访问综合管理服务</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start space-x-2 text-red-300 text-xs"
              id="login-error-alert"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleFormSubmit} className="space-y-5" id="login-form">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">用户名 / 系统邮箱</label>
              <input 
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="example@enterprise.gov.cn"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">安全访问密钥 (密码)</label>
              <div className="relative">
                <input 
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入访问密码"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-500/15 cursor-pointer flex justify-center items-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "身份验证并登录"
              )}
            </button>
          </form>

          {/* Preset Accounts for Fast Review */}
          <div className="mt-8 pt-6 border-t border-slate-800/80" id="quick-role-selector">
            <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">快捷角色审核专用通道</span>
            <div className="grid grid-cols-2 gap-2">
              <button 
                id="quick-login-super"
                type="button"
                onClick={() => handleDemoLogin("admin@enterprise.gov.cn")}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                <div className="truncate">
                  <span className="block font-medium">超级管理员</span>
                  <span className="text-[9px] text-slate-500">高级管理层</span>
                </div>
              </button>
              <button 
                id="quick-login-admin"
                type="button"
                onClick={() => handleDemoLogin("manager@enterprise.gov.cn")}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0"></div>
                <div className="truncate">
                  <span className="block font-medium">业务管理员</span>
                  <span className="text-[9px] text-slate-500">业务经办员</span>
                </div>
              </button>
              <button 
                id="quick-login-clerk"
                type="button"
                onClick={() => handleDemoLogin("clerk1@enterprise.gov.cn")}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <div className="truncate">
                  <span className="block font-medium">信息录入员</span>
                  <span className="text-[9px] text-slate-500">数据录入岗</span>
                </div>
              </button>
              <button 
                id="quick-login-query"
                type="button"
                onClick={() => handleDemoLogin("query@enterprise.gov.cn")}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-left text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0"></div>
                <div className="truncate">
                  <span className="block font-medium">数据查询员</span>
                  <span className="text-[9px] text-slate-500">只读检索岗</span>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer - Legal / Institutional Credit */}
      <footer className="w-full text-center py-5 border-t border-slate-850 text-slate-500 text-xs relative z-10 bg-slate-950/50">
        <p>中华人民共和国 辖区高端人才与重点企业数字化综合保障平台</p>
        <p className="text-[10px] text-slate-600 mt-1">政企数智化综合保障系统 • 技术支持：AI Studio 建设组</p>
      </footer>
    </div>
  );
}
