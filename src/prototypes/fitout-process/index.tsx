/**
 * @name 二装施工过程管理
 */

import React, { useState } from 'react';
import { useHashPage } from '../../common/useHashPage';
import { ROLES, ORDERS, type RoleId, type Project, type Order } from './data';
import { type AppNav } from './components';
import { LoginPage, ProfileComplete } from './pages/LoginPages';
import { CustomerHome, StaffHome } from './pages/HomePages';
import { CreateOrder, ProjectSelect, ProjectCustom } from './pages/CreatePages';
import { OrderList } from './pages/ListPage';
import { OrderDetail, ContractConfirm } from './pages/DetailPage';
import { UserCenter, Notifications } from './pages/UserPages';
import './style.css';

const PAGE_OPTIONS = [
    { id: 'login', label: '授权登录' },
    { id: 'profile-complete', label: '客户信息补全' },
    { id: 'customer-home', label: '客户工作台' },
    { id: 'staff-home', label: '员工工作台' },
    { id: 'create', label: '服务单创建' },
    { id: 'project-select', label: '项目选择' },
    { id: 'project-custom', label: '地图选点项目' },
    { id: 'order-list', label: '服务单列表' },
    { id: 'order-detail', label: '服务单详情' },
    { id: 'contract-confirm', label: '确认合同' },
    { id: 'user', label: '个人中心' },
    { id: 'notifications', label: '消息通知' },
];

export default function FitoutProcess() {
    const { page, setPage } = useHashPage('customer-home');
    const [role, setRole] = useState<RoleId>('customer');
    const [orderId, setOrderId] = useState<string>('FW20260922001');
    const [project, setProject] = useState<Project | null>(null);
    const [, bumpVersion] = useState(0);

    const go = (p: string) => setPage(p);
    const openOrder = (id: string) => { setOrderId(id); setPage('order-detail'); };
    // 原型内共享 ORDERS：就地把节点推进/回退结果写回服务单，并触发重渲染
    const updateOrder = (patch: Partial<Order>) => {
        const target = ORDERS.find((o) => o.id === orderId);
        if (target) Object.assign(target, patch);
        bumpVersion((v) => v + 1);
    };
    const nav: AppNav = { role, go, openOrder, updateOrder };

    const order = ORDERS.find((o) => o.id === orderId) ?? ORDERS[0];

    const switchRole = (r: RoleId) => {
        setRole(r);
        setPage(r === 'customer' ? 'customer-home' : 'staff-home');
    };

    const renderPage = () => {
        switch (page) {
            case 'login': return <LoginPage nav={nav} />;
            case 'profile-complete': return <ProfileComplete nav={nav} />;
            case 'customer-home': return <CustomerHome nav={nav} />;
            case 'staff-home': return <StaffHome nav={nav} />;
            case 'create': return <CreateOrder nav={nav} project={project} onPick={() => go('project-select')} />;
            case 'project-select': return <ProjectSelect nav={nav} onSelect={(p) => { setProject(p); go('create'); }} />;
            case 'project-custom': return <ProjectCustom nav={nav} onSelect={(p) => { setProject(p); go('create'); }} />;
            case 'order-list': return <OrderList nav={nav} />;
            case 'order-detail': return <OrderDetail nav={nav} order={order} />;
            case 'contract-confirm': return <ContractConfirm nav={nav} order={order} />;
            case 'user': return <UserCenter nav={nav} />;
            case 'notifications': return <Notifications nav={nav} />;
            default: return <CustomerHome nav={nav} />;
        }
    };

    return (
        <div className="app-canvas">
            <div className="demo-toolbar">
                <span className="t-title">二装施工过程管理 · 小程序端</span>
                <div className="t-group">
                    <span className="t-label">角色</span>
                    <div className="role-seg">
                        {ROLES.map((r) => (
                            <button key={r.id} type="button" className={role === r.id ? 'is-active' : ''} onClick={() => switchRole(r.id)}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="t-group">
                    <span className="t-label">跳页</span>
                    <select value={page} onChange={(e) => setPage(e.target.value)}>
                        {PAGE_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="phone-stage">
                <div className="phone">{renderPage()}</div>
            </div>
        </div>
    );
}
