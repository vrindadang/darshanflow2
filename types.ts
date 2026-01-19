
import React from 'react';

export enum Role {
  REQUESTOR = 'REQUESTOR',
  APPROVER = 'APPROVER',
  FINANCE = 'FINANCE'
}

export enum RequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DISBURSED = 'DISBURSED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  schoolId?: string; // Only for Requestors
  email?: string;
}

export interface School {
  id: string;
  name: string;
  shortCode: string;
}

export interface ExpenseRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  category: string;
  description: string;
  amount: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  approverComments?: string;
  financeComments?: string;
  rejectionReason?: string;
  attachmentName?: string;
  attachmentData?: string; // Base64 encoded file data
  session: string;
  expenseDate: string;
  exceedsBudgetReason?: string;
}

export interface Notification {
  id: string;
  userId?: string;
  role?: Role;
  schoolId?: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  requestId?: string;
}

export interface QuarterlyBudget {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

export interface BudgetRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  session: string;
  data: Record<string, QuarterlyBudget>; // Category -> { q1, q2, q3, q4 }
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  note?: string;
  attachmentName?: string;
  adminComments?: string;
}

export type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
};

export type BudgetMap = Record<string, Record<string, QuarterlyBudget>>;

export interface BudgetLog {
  id: string;
  timestamp: string;
  adminName: string;
  schoolName: string;
  session: string;
  category: string;
  quarter: string;
  oldAmount: number;
  newAmount: number;
}
