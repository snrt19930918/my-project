// 个人中心模块
import React, { useState } from 'react';
import { Bell, Settings, Info, Headphones, ChevronRight, LogOut, User } from 'lucide-react';
import { type AppNav, NavBar, Segmented, BottomTabBar, PhoneStatusBar } from '../components';
import { ROLES } from '../data';

export function UserCenter({ nav }: { nav: AppNav }) {
    const role = ROLES.find((r) => r.id === nav.role)!;
    const items = [
        { icon: Bell, label: '消息通知', page: 'notifications' },
        { icon: Settings, label: '我的设置', page: '' },
        { icon: Info, label: '关于我们', page: '' },
        { icon: Headphones, label: '联系客服', page: '' },
    ];

    return (
        <>
            <PhoneStatusBar />
            <div className="page-body">
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flex: '0 0 auto' }}>
                        {role.name.slice(0, 1)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>{role.name}</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            {nav.role === 'customer' ? '客户' : `${role.dept} · ${role.label}`}
                        </div>
                    </div>
                    <ChevronRight size={16} color="#bbb" />
                </div>

                <div className="card" style={{ padding: '4px 0' }}>
                    {items.map((it, i) => {
                        const Icon = it.icon;
                        return (
                            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', borderBottom: i < items.length - 1 ? '1px solid #f0f0f0' : 'none' }} onClick={() => it.page && nav.go(it.page)}>
                                <Icon size={18} color="#666" />
                                <span style={{ flex: 1, fontSize: 14 }}>{it.label}</span>
                                <ChevronRight size={16} color="#bbb" />
                            </div>
                        );
                    })}
                </div>

                <button className="btn btn-outline btn-block" style={{ marginTop: 8, color: '#f5222d', borderColor: '#f5222d' }} onClick={() => nav.go('login')}>
                    <LogOut size={15} /> 退出登录
                </button>
            </div>
            <BottomTabBar active="me" nav={nav} />
        </>
    );
}

const NOTICES = [
    { type: '进度', title: '服务单已创建', desc: 'FW20260922001 已创建，当前节点：图纸深化', time: '今天 10:20', read: false },
    { type: '进度', title: '节点流转提醒', desc: 'FW20260918002 已推进至确认合同节点，请处理', time: '今天 09:00', read: false },
    { type: '预警', title: '节点临期预警', desc: 'FW20260920006 审图节点即将到期，请尽快处理', time: '昨天 18:30', read: false },
    { type: '进度', title: '服务已完成', desc: 'FW20260910004 已办结，感谢您的使用', time: '09-19 18:30', read: true },
    { type: '进度', title: '图纸审核通过', desc: 'FW20260910004 图纸审核已通过，进入确认合同阶段', time: '09-12 14:00', read: true },
];

export function Notifications({ nav }: { nav: AppNav }) {
    const [tab, setTab] = useState<'全部' | '进度通知' | '预警通知'>('全部');
    const list = NOTICES.filter((n) => tab === '全部' || (tab === '进度通知' ? n.type === '进度' : n.type === '预警'));

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="消息通知" onBack={() => nav.go('user')} />
            <div className="page-body">
                <Segmented
                    options={[{ value: '全部' as const, label: '全部' }, { value: '进度通知' as const, label: '进度通知' }, { value: '预警通知' as const, label: '预警通知' }]}
                    value={tab}
                    onChange={setTab}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {list.map((n, i) => (
                        <div key={i} className="notice-item" onClick={() => nav.openOrder('FW20260922001')}>
                            <span className={`ni-dot ${n.read ? 'read' : ''}`} />
                            <div className="ni-main">
                                <div className="ni-title" style={{ color: n.read ? '#666' : '#1f1f1f' }}>{n.title}</div>
                                <div className="ni-desc">{n.desc}</div>
                                <div className="ni-time">{n.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
