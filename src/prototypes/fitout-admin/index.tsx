/**
 * @name 二装施工过程管理 · Web 管理后台
 */

import React, { useState } from 'react';
import { useHashPage } from '../../common/useHashPage';
import { PROJECTS, ORDERS, VIEWER_ROLES, type ViewerRole, type AdminPermissionId, hasAdminPerm } from './data';
import { type AdminNav } from './components';
import { LoginPage } from './pages/LoginPages';
import { Dashboard } from './pages/DashboardPages';
import { ProjectList, ProjectDetail } from './pages/ProjectPages';
import { StaffAccounts, OwnerAccounts } from './pages/AccountPages';
import { OrderList, OrderDetail } from './pages/OrderPages';
import { Report } from './pages/ReportPages';
import { FlowConfig, PositionConfig, NotifyConfig } from './pages/ConfigPages';
import { FlowDesigner } from './pages/DesignerPages';
import './style.css';

const PAGE_OPTIONS = [
    { id: 'login', label: '登录' },
    { id: 'dashboard', label: '概览驾驶舱' },
    { id: 'project-list', label: '项目点位 · 列表' },
    { id: 'project-detail', label: '项目点位 · 详情配置' },
    { id: 'staff-accounts', label: '账号管理 · 员工账户' },
    { id: 'owner-accounts', label: '账号管理 · 业主信息' },
    { id: 'order-list', label: '服务单管理 · 列表' },
    { id: 'order-detail', label: '服务单管理 · 详情' },
    { id: 'report', label: '统计报表' },
    { id: 'flow-config', label: '系统配置 · 流程编排' },
    { id: 'flow-designer', label: '系统配置 · 流程设计器' },
    { id: 'position-config', label: '系统配置 · 岗位配置' },
    { id: 'notify-config', label: '系统配置 · 通知与超时' },
];

// 页面访问所需的后台管理权限；未列出的页面所有账号可进入
const PAGE_PERM: Record<string, AdminPermissionId | undefined> = {
    'project-list': 'biz',
    'project-detail': 'biz',
    'staff-accounts': 'sys',
    'owner-accounts': 'sys',
    report: 'biz',
    'flow-config': 'sys',
    'flow-designer': 'sys',
    'position-config': 'sys',
    'notify-config': 'sys',
};

// 演示用后台权限组合：实际系统以岗位配置中的绑定结果为准
const ADMIN_PERM_OPTIONS: { id: string; label: string; perms: AdminPermissionId[] }[] = [
    { id: 'none', label: '无后台管理权限', perms: [] },
    { id: 'biz', label: '业务管理员', perms: ['biz'] },
    { id: 'sys', label: '系统管理员', perms: ['sys'] },
    { id: 'both', label: '业务管理员 + 系统管理员', perms: ['biz', 'sys'] },
];

export default function FitoutAdmin() {
    const { page, setPage } = useHashPage('dashboard');
    const [orderId, setOrderId] = useState<string>('FW20260922001');
    const [projectId, setProjectId] = useState<string>('p1');
    const [viewer, setViewer] = useState<ViewerRole>('admin');
    const [adminPermKey, setAdminPermKey] = useState<string>('both');

    const adminPerms = ADMIN_PERM_OPTIONS.find((o) => o.id === adminPermKey)?.perms ?? [];

    const go = (p: string) => setPage(p);
    const openOrder = (id: string) => { setOrderId(id); setPage('order-detail'); };
    const openProject = (id: string) => { setProjectId(id); setPage('project-detail'); };
    const logout = () => setPage('login');
    const nav: AdminNav = { go, openOrder, openProject, logout, viewer, adminPerms };

    const order = ORDERS.find((o) => o.id === orderId) ?? ORDERS[0];
    const project = PROJECTS.find((p) => p.id === projectId) ?? null;

    const renderPage = () => {
        // 直接通过 hash 访问无权限页面时，回到概览并提示
        const needPerm = PAGE_PERM[page];
        if (needPerm && !hasAdminPerm(adminPerms, needPerm)) {
            const label = PAGE_OPTIONS.find((p) => p.id === page)?.label ?? page;
            return <Dashboard nav={nav} notice={`当前账号未开通「${needPerm === 'biz' ? '业务管理员' : '系统管理员'}」权限，无法访问「${label}」，已返回概览驾驶舱。`} />;
        }

        switch (page) {
            case 'login': return <LoginPage nav={nav} />;
            case 'dashboard': return <Dashboard nav={nav} />;
            case 'project-list': return <ProjectList nav={nav} />;
            case 'project-detail': return <ProjectDetail nav={nav} project={project} />;
            case 'staff-accounts': return <StaffAccounts nav={nav} />;
            case 'owner-accounts': return <OwnerAccounts nav={nav} />;
            case 'order-list': return <OrderList nav={nav} />;
            case 'order-detail': return <OrderDetail nav={nav} order={order} />;
            case 'report': return <Report nav={nav} />;
            case 'flow-config': return <FlowConfig nav={nav} />;
            case 'flow-designer': return <FlowDesigner nav={nav} />;
            case 'position-config': return <PositionConfig nav={nav} />;
            case 'notify-config': return <NotifyConfig nav={nav} />;
            default: return <Dashboard nav={nav} />;
        }
    };

    return (
        <div className="app-canvas">
            <div className="demo-toolbar">
                <span className="t-title">二装施工过程管理 · Web 管理后台</span>
                <div className="t-group">
                    <span className="t-label">跳页</span>
                    <select value={page} onChange={(e) => setPage(e.target.value)}>
                        {PAGE_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>
                <div className="t-group">
                    <span className="t-label">角色</span>
                    <select value={viewer} onChange={(e) => setViewer(e.target.value as ViewerRole)}>
                        {VIEWER_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                </div>
                <div className="t-group">
                    <span className="t-label">后台权限</span>
                    <select value={adminPermKey} onChange={(e) => setAdminPermKey(e.target.value)}>
                        {ADMIN_PERM_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                </div>
                <div className="t-group">
                    <span className="t-label">视角说明</span>
                    <span style={{ fontSize: 11, color: '#8b98ab' }}>{VIEWER_ROLES.find((r) => r.id === viewer)?.desc}</span>
                </div>
            </div>

            <div className="admin-stage">{renderPage()}</div>
        </div>
    );
}
