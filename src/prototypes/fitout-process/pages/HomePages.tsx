// 工作台模块
import React, { useState } from 'react';
import { Bell, Plus, ChevronRight, ClipboardList, Inbox, AlertTriangle } from 'lucide-react';
import { type AppNav, OrderListItem, Segmented, BottomTabBar, StatusTag, Empty, PhoneStatusBar } from '../components';
import {
    ROLES, customerOrdersByTab, ordersForRole, staffStats, nodeLabel, ROLE_CAN_CREATE, pendingConfirmOrders, assignPoolOrders,
    staffListOrders, needsMoreContracts, orderNeedsCollection, orderContracts,
} from '../data';

export function CustomerHome({ nav }: { nav: AppNav }) {
    const [tab, setTab] = useState<'进行中' | '已完成' | '已终止'>('进行中');
    const orders = customerOrdersByTab(tab);
    const role = ROLES.find((r) => r.id === 'customer')!;

    return (
        <>
            <PhoneStatusBar />
            <div className="page-body">
                <div className="hero">
                    <div className="hero-hi">
                        <span>您好，{role.name}</span>
                        <button style={{ background: 'rgba(255,255,255,0.2)', border: 0, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative' }} onClick={() => nav.go('notifications')}>
                            <Bell size={18} />
                            <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#f5222d' }} />
                        </button>
                    </div>
                    <div className="hero-sub">欢迎使用二装施工服务，全程进度透明可追踪</div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => nav.go('create')}>
                    <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                        <Plus size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>创建服务单</div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>提交消防二装施工需求，开启全流程服务</div>
                    </div>
                    <ChevronRight size={18} color="#bbb" />
                </div>

                <div style={{ marginTop: 4 }}>
                    <div className="section-title">
                        <span>我的服务单</span>
                        <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                    </div>
                    <Segmented
                        options={[{ value: '进行中' as const, label: '进行中' }, { value: '已完成' as const, label: '已完成' }, { value: '已终止' as const, label: '已终止' }]}
                        value={tab}
                        onChange={setTab}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                        {orders.length === 0 ? (
                            <Empty icon={Inbox} text={tab === '进行中' ? '暂无进行中的服务单' : '暂无服务单'} action={<button className="btn btn-primary btn-sm" onClick={() => nav.go('create')}><Plus size={14} /> 创建服务单</button>} />
                        ) : orders.map((o) => <OrderListItem key={o.id} order={o} nav={nav} />)}
                    </div>
                </div>
            </div>
            <BottomTabBar active="workbench" nav={nav} />
        </>
    );
}

export function StaffHome({ nav }: { nav: AppNav }) {
    const role = ROLES.find((r) => r.id === nav.role)!;
    const stats = staffStats(nav.role);
    const todos = ordersForRole(nav.role);
    const signs = pendingConfirmOrders(nav.role);
    const assigns = nav.role === 'pm' ? assignPoolOrders() : [];
    const contractTodos = nav.role === 'quoter' ? staffListOrders('quoter').filter(needsMoreContracts) : [];
    const collectTodos = nav.role === 'finance' ? staffListOrders('finance').filter(orderNeedsCollection) : [];
    // 财务视图统一按「待收款」口径展示，避免与「待我处理」重复
    const isFinance = nav.role === 'finance';
    const listOrders = isFinance ? collectTodos : todos;

    return (
        <>
            <PhoneStatusBar />
            <div className="page-body">
                <div className="hero">
                    <div className="hero-hi">
                        <span>{role.name} · {role.label}</span>
                        <button style={{ background: 'rgba(255,255,255,0.2)', border: 0, borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative' }} onClick={() => nav.go('notifications')}>
                            <Bell size={18} />
                            <span style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: '50%', background: '#f5222d' }} />
                        </button>
                    </div>
                    <div className="hero-sub">{role.dept ? role.dept + ' · ' : ''}今日待办概览</div>
                </div>

                {ROLE_CAN_CREATE[nav.role] && (
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => nav.go('create')}>
                        <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                            <Plus size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>创建服务单</div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>代客户提交二装施工需求，需补充客户信息</div>
                        </div>
                        <ChevronRight size={18} color="#bbb" />
                    </div>
                )}

                <div className="stat-cards">
                    <div className="stat-card" onClick={() => nav.go('order-list')}>
                        <span className={`sc-num ${isFinance ? 'green' : 'warn'}`}>{isFinance ? collectTodos.length : stats.todo}</span>
                        <span className="sc-label">{isFinance ? '待收款' : '待处理'}</span>
                    </div>
                    <div className="stat-card" onClick={() => nav.go('order-list')}>
                        <span className="sc-num blue">{stats.doing}</span>
                        <span className="sc-label">服务中</span>
                    </div>
                    {(nav.role === 'pm' || nav.role === 'quoter') && (
                        <div className="stat-card" onClick={() => nav.go('order-list')}>
                            <span className="sc-num red">{signs.length}</span>
                            <span className="sc-label">待我会签</span>
                        </div>
                    )}
                </div>

                {nav.role === 'pm' && assigns.length > 0 && (
                    <div className="assign-section">
                        <div className="assign-section-head">
                            <span><AlertTriangle size={14} /> 待我评估指派（客户自定义项目）</span>
                            <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {assigns.map((o) => (
                                <div className="assign-card" key={o.id} onClick={() => nav.openOrder(o.id)}>
                                    <div className="sign-card-top">
                                        <span className="sign-card-id">{o.id}</span>
                                        <span className="assign-badge">待我指派</span>
                                    </div>
                                    <div className="sign-card-title">{o.location}</div>
                                    <div className="sign-card-meta">
                                        <span>{o.project}</span>
                                        <span className="dot" />
                                        <span>{o.customer} 下单</span>
                                        <span className="dot" />
                                        <span>{o.createTime}</span>
                                    </div>
                                    <div className="assign-card-tip">请线下沟通并完成现场勘验后指派绘图员</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {nav.role === 'quoter' && contractTodos.length > 0 && (
                    <div className="assign-section">
                        <div className="assign-section-head">
                            <span><ClipboardList size={14} /> 待补充合同（第二份服务合同）</span>
                            <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {contractTodos.map((o) => (
                                <div className="assign-card" key={o.id} onClick={() => nav.openOrder(o.id)}>
                                    <div className="sign-card-top">
                                        <span className="sign-card-id">{o.id}</span>
                                        <span className="assign-badge">待确认合同</span>
                                    </div>
                                    <div className="sign-card-title">{o.location}</div>
                                    <div className="sign-card-meta">
                                        <span>{o.project}</span>
                                        <span className="dot" />
                                        <span>已签「{orderContracts(o).map((c) => c.type).join('、')}」</span>
                                    </div>
                                    <div className="assign-card-tip">可继续确认另一类服务合同并上传新合同信息，服务节点按合同类型增加</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(nav.role === 'pm' || nav.role === 'quoter') && signs.length > 0 && (
                    <div className="sign-section">
                        <div className="sign-section-head">
                            <span><AlertTriangle size={14} /> 待我会签（结束服务）</span>
                            <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {signs.map((o) => (
                                <div className="sign-card" key={o.id} onClick={() => nav.openOrder(o.id)}>
                                    <div className="sign-card-top">
                                        <span className="sign-card-id">{o.id}</span>
                                        <span className="confirm-badge">结束服务会签</span>
                                    </div>
                                    <div className="sign-card-title">{o.location}</div>
                                    <div className="sign-card-reason">结束原因：{o.endRequest?.reason}</div>
                                    <div className="sign-card-meta">
                                        <span>{o.project}</span>
                                        <span className="dot" />
                                        <span>{o.endRequest?.initiator} 发起</span>
                                        <span className="dot" />
                                        <span>{o.endRequest?.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 4 }}>
                    <div className="section-title">
                        <span>{isFinance ? '待收款' : '待我处理'}</span>
                        <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                    </div>
                    {isFinance && <div className="collect-tip-line">财务并行跟进实际收付款，可多次更新累计收款比例</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: isFinance ? 8 : 0 }}>
                        {listOrders.length === 0 ? (
                            <Empty icon={ClipboardList} text={isFinance ? '暂无待收款的服务单' : '暂无待我处理的服务单'} />
                        ) : listOrders.map((o) => <OrderListItem key={o.id} order={o} nav={nav} hideMainStatus={isFinance} />)}
                    </div>
                </div>
            </div>
            <BottomTabBar active="workbench" nav={nav} />
        </>
    );
}
