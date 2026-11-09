// 统计报表
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { type AdminNav, AdminShell, BarChart, LineChart } from '../components';
import { SERVICE_DISTRIBUTION, PROJECT_ORDER_STATS, MONTHLY_TREND, OVERVIEW_METRICS, ORDERS, serviceTypeOf, isOrderActive } from '../data';

export function Report({ nav }: { nav: AdminNav }) {
    const [dim, setDim] = useState<'服务类型' | '项目'>('服务类型');

    const barData = dim === '服务类型'
        ? SERVICE_DISTRIBUTION.map((d) => ({ label: d.name.length > 4 ? d.name.slice(0, 4) : d.name, value: d.value }))
        : PROJECT_ORDER_STATS.map((d) => ({ label: d.name.length > 5 ? d.name.slice(0, 5) : d.name, value: d.count }));

    return (
        <AdminShell nav={nav} page="report" crumb={['统计报表']} title="统计报表" sub="多维度业务数据统计与导出"
            actions={<button className="btn btn-outline"><Download size={16} /> 导出报表</button>}>
            <div className="stat-grid">
                <div className="stat-card"><span className="sc-label">工单总量</span><span className="sc-num blue">{OVERVIEW_METRICS.total}</span><span className="sc-foot">全部服务单</span></div>
                <div className="stat-card"><span className="sc-label">在途工单</span><span className="sc-num blue">{OVERVIEW_METRICS.active}</span><span className="sc-foot">服务中 + 待确认</span></div>
                <div className="stat-card"><span className="sc-label">完结工单</span><span className="sc-num green">{OVERVIEW_METRICS.done}</span><span className="sc-foot">已完成 + 已结束</span></div>
                <div className="stat-card"><span className="sc-label">完结率</span><span className="sc-num orange">{Math.round((OVERVIEW_METRICS.done / OVERVIEW_METRICS.total) * 100)}%</span><span className="sc-foot">完结 / 总量</span></div>
            </div>

            <div className="card">
                <div className="toolbar">
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(['服务类型', '项目'] as const).map((d) => (
                            <button key={d} className={`btn btn-sm ${dim === d ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDim(d)}>{d}</button>
                        ))}
                    </div>
                    <span className="tb-spacer" />
                    <select defaultValue="近6个月"><option value="近6个月">近 6 个月</option><option value="本年度">本年度</option></select>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title"><span>各{dim}工单量</span></div>
                    <div className="chart-box"><BarChart data={barData} /></div>
                </div>
                <div className="card">
                    <div className="card-title"><span>月度工单趋势</span></div>
                    <div className="chart-box"><LineChart data={MONTHLY_TREND.map((d) => ({ label: d.month, value: d.count }))} /></div>
                </div>
            </div>

            <div className="card">
                <div className="card-title"><span>服务类型统计明细</span></div>
                <div className="table-wrap" style={{ border: 'none' }}>
                    <table className="table">
                        <thead><tr><th>服务类型</th><th>工单量</th><th>占比</th><th>在途</th><th>完结</th></tr></thead>
                        <tbody>
                            {SERVICE_DISTRIBUTION.map((d) => {
                                const list = ORDERS.filter((o) => serviceTypeOf(o) === d.name);
                                const active = list.filter(isOrderActive).length;
                                const done = list.filter((o) => o.status === '已完成' || o.status === '已结束').length;
                                const pct = Math.round((d.value / OVERVIEW_METRICS.total) * 100);
                                return (
                                    <tr key={d.name}>
                                        <td className="td-main">{d.name}</td>
                                        <td>{d.value}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ flex: 1, maxWidth: 140, height: 8, background: '#f0f2f5', borderRadius: 4, overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: d.color }} />
                                                </div>
                                                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{pct}%</span>
                                            </div>
                                        </td>
                                        <td>{active}</td>
                                        <td>{done}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminShell>
    );
}
