// 概览驾驶舱
import React from 'react';
import { FileText, Clock, CheckCircle2, AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import { type AdminNav, AdminShell, LineChart, Donut } from '../components';
import {
    OVERVIEW_METRICS, WEEKLY_TREND, SERVICE_DISTRIBUTION, OVERDUE_ITEMS, ORDERS,
    hasAdminPerm, viewerUserName, relatedOrdersFor, overviewMetricsFor, weeklyTrendFor, serviceDistributionFor,
} from '../data';

export function Dashboard({ nav, notice }: { nav: AdminNav; notice?: string }) {
    // 概览驾驶舱不设访问门控：业务管理员看全局，其余账号只看本人相关数据
    const biz = hasAdminPerm(nav.adminPerms, 'biz');
    const userName = viewerUserName(nav.viewer);
    const scopeOrders = biz ? ORDERS : relatedOrdersFor(userName, nav.viewer);
    const metrics = biz ? OVERVIEW_METRICS : overviewMetricsFor(scopeOrders);
    const overdueItems = biz ? OVERDUE_ITEMS : OVERDUE_ITEMS.filter((it) => it.assignee === userName);
    const overdueCount = overdueItems.length;
    const trend = biz ? WEEKLY_TREND : weeklyTrendFor(scopeOrders);
    const distribution = biz ? SERVICE_DISTRIBUTION : serviceDistributionFor(scopeOrders);

    const stats = [
        { label: '工单总量', value: metrics.total, color: 'blue', icon: FileText, foot: biz ? '全部服务单' : '本人相关服务单' },
        { label: '在途工单', value: metrics.active, color: 'blue', icon: Clock, foot: `服务中 + 待确认（会签 ${metrics.pendingConfirm}）` },
        { label: '完结工单', value: metrics.done, color: 'green', icon: CheckCircle2, foot: '已完成 + 已结束' },
        { label: '超时工单', value: overdueCount, color: 'red', icon: AlertTriangle, foot: '待跟进' },
    ];

    return (
        <AdminShell nav={nav} page="dashboard" crumb={['概览驾驶舱']} title="概览驾驶舱"
            sub={biz ? '业务核心指标总览与超时预警' : '本人相关业务数据与超时预警'}
            actions={<span className={`badge ${biz ? 'blue' : 'orange'}`}>{biz ? '全局数据' : '仅本人相关数据'}</span>}>
            {notice && (
                <div className="banner warn" style={{ marginBottom: 16 }}>
                    <span className="bn-icon"><ShieldAlert size={18} /></span>
                    <div className="bn-main">
                        <div className="bn-title">无访问权限</div>
                        <div className="bn-sub">{notice}</div>
                    </div>
                </div>
            )}

            <div className="stat-grid">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label} onClick={() => nav.go('order-list')} style={{ cursor: 'pointer' }}>
                            <div className="sc-top">
                                <span className="sc-label">{s.label}</span>
                                <span className="sc-icon" style={{ background: `var(--brand-soft)`, color: 'var(--brand)' }}><Icon size={20} /></span>
                            </div>
                            <span className={`sc-num ${s.color}`}>{s.value}</span>
                            <span className="sc-foot">{s.foot}</span>
                        </div>
                    );
                })}
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title">
                        <span>近 7 日新增工单趋势</span>
                        {biz && <span className="link" onClick={() => nav.go('report')}>查看报表</span>}
                    </div>
                    <div className="chart-box"><LineChart data={trend.map((d) => ({ label: d.day, value: d.count }))} /></div>
                </div>

                <div className="card">
                    <div className="card-title"><span>服务类型占比</span></div>
                    {distribution.length === 0
                        ? <div className="empty">暂无本人相关服务单</div>
                        : <Donut data={distribution} />}
                </div>
            </div>

            <div className="card">
                <div className="card-title">
                    <span>超时与预警待办</span>
                    <span className="link" onClick={() => nav.go('order-list')}>查看全部</span>
                </div>
                {overdueItems.length === 0 ? (
                    <div className="empty">暂无本人相关的超时与预警待办</div>
                ) : (
                    <div className="alert-list">
                        {overdueItems.map((it) => {
                            const order = ORDERS.find((o) => o.id === it.id);
                            const overdue = it.time.startsWith('超时');
                            return (
                                <div className="alert-item" key={it.id} onClick={() => nav.openOrder(it.id)} style={{ cursor: 'pointer' }}>
                                    <span className="al-dot" style={{ background: overdue ? 'var(--error)' : 'var(--warning)' }} />
                                    <div className="al-main">
                                        <div className="al-title">{it.id} · {order?.location}</div>
                                        <div className="al-sub">当前节点：{it.node} · 处理人：{it.assignee}</div>
                                    </div>
                                    <span className={`badge ${overdue ? 'red' : 'orange'}`}>{it.time}</span>
                                    <ChevronRight size={16} color="#c8cdd4" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AdminShell>
    );
}
