/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  ENTRY_CLERK = "ENTRY_CLERK",
  QUERY_CLERK = "QUERY_CLERK"
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
}

export interface AwardRecord {
  id: string;
  awardName: string;
  time: string; // YYYY-MM-DD or YYYY
  status: "Awarded" | "Approved" | "Under Review" | "Not Approved" | "Additional Info Required" | "Expired";
  level: "National" | "Provincial" | "Municipal" | "District/County" | "Institutional";
  grade?: string; // 一等奖, 二等奖, etc.
  bonus?: number; // Reward amount in CNY
  opinion?: string; // Review comments
  files?: AttachedFile[];
}

export interface AttachedFile {
  id: string;
  name: string;
  size: string; // e.g., "2.4 MB"
  uploadedAt: string;
  type: "pdf" | "docx" | "jpg" | "png" | "other";
  url?: string; // Data URI or local path
}

export interface Talent {
  id: string;
  name: string;
  avatar?: string;
  gender: "Male" | "Female";
  nation?: string;
  nationality?: string;
  dob?: string; // YYYY-MM-DD
  education: "Bachelor" | "Master" | "Doctorate" | "Post-Doc" | "Other";
  educationDetail?: string; // e.g., "PhD Computer Science"
  school?: string; // Graduation school
  phone?: string;
  email?: string;
  politicalStatus?: string; // e.g., "CPC Member"
  enterpriseId?: string; // Associated enterprise ID
  enterpriseName?: string; // Cached enterprise name
  title?: string; // Job title e.g. "Lead Scientist"
  socialTitles?: string[]; // 社会职务 (e.g., 人大代表)
  overseasBackground?: string; // 海外留学背景 description
  awards: AwardRecord[];
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface Enterprise {
  id: string;
  name: string;
  creditCode: string; // 统一社会信用代码
  address?: string;
  establishedDate?: string;
  intro?: string;
  industry: string; // industry category
  industryCategory?: string; // e.g. "Advanced Manufacturing & Robotics"
  website?: string;
  contactName?: string;
  contactPhone?: string;
  contactAvatar?: string;
  contactTitle?: string;
  
  // Qualifications
  isHighTech: boolean;
  isSpecializedNew: boolean; // 专精特新
  isLittleGiant: boolean; // 小巨人
  isGazelle: boolean; // 瞪羚
  otherQualifications?: string[];
  
  // Scale
  employeeCount: number;
  revenueScale: string; // e.g., "1B - 5B CNY"
  isAboveScale: boolean; // 是否规上企业
  isSteadyGrowth: boolean; // 是否稳增长企业
  
  annualRevenue2023?: string; // e.g. "¥ 4.5B"
  researchStaffCount?: number; // R&D personnel count
  researchStaffRatio?: string; // R&D percentage e.g. "34%"
  patentsCount?: number; // Patents held
  
  customFields?: { [key: string]: any };
  createdAt: string;
}

export interface SystemTags {
  industries: string[];
  qualifications: string[];
  educationLevels: string[];
  awardCategories: string[];
}

export interface OperationLog {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  time: string;
  actionType: "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "IMPORT" | "EXPORT" | "BACKUP" | "PARSE_CV";
  target: string; // Description of the target of the action
  details: string;
}

export interface SystemConfig {
  backupFrequency: "DAILY" | "WEEKLY" | "MONTHLY" | "MANUAL";
  backupRetentionDays: number;
  autoCleanAttachments: boolean;
  autoCleanAgeYears: number;
}

export function translateIndustry(ind: string): string {
  if (!ind) return "";
  switch (ind.trim()) {
    case "Information Technology": return "信息技术";
    case "Advanced Manufacturing": return "先进制造";
    case "Biomedical": return "生物医药";
    case "Green Energy": return "绿色能源";
    case "New Materials": return "新材料";
    case "Aerospace": return "航空航天";
    case "Consumer Electronics": return "消费电子";
    case "Other": return "其他";
    default: return ind;
  }
}

