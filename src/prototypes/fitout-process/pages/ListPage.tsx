// 服务单列表模块
import React, { useState } from 'react';
import { Inbox } from 'lucide-react';
import { type AppNav, OrderListItem, BottomTabBar, Empty, PhoneStatusBar } from '../components';
import { ORDERS, NODES, nodeLabel, staffListOrders, displayStatus } from '../data';

const STATUS_OPTIONS = ['全部', '待处理', '服务中', '待确认', '已完成', '已结束', '已终止'] as const;

export function OrderList({ nav }: { nav: AppNav }) {
    const [status, setStatus] = useState<string>('全部');
    const [node, setNode] = useState<string>('全部');

    const base = nav.role === 'customer'
        ? ORDERS.filter((o) => o.customer === '林女士')
        : staffListOrders(nav.role);

    const isFinance = nav.role === 'finance';
    // 客户与财务视角不展示「待处理」：待处理为节点处置态，仅当前节点处理人可见
    const hidesPending = nav.role === 'customer' || isFinance;
    const statusOptions = STATUS_OPTIONS.filter((s) => !hidesPending || s !== '待处理');
    const list = base.filter((o) => {
        const shown = displayStatus(o, nav.role);
        if (status !== '全部' && shown !== status) return false;
        if (node !== '全部' && o.currentNode !== node) return false;
        return true;
    });

    return (
        <>
            <PhoneStatusBar />
            <div className="page-body">
                <div className="section-title"><span>服务单</span></div>
                <div className="filter-bar">
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        {statusOptions.map((s) => <option key={s} value={s}>{s === '全部' ? '状态：全部' : s}</option>)}
                    </select>
                    <select value={node} onChange={(e) => setNode(e.target.value)}>
                        <option value="全部">节点：全部</option>
                        {NODES.map((n) => <option key={n.id} value={n.id}>{nodeLabel(n.id)}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {list.length === 0 ? (
                        <Empty icon={Inbox} text="暂无符合条件的服务单" />
                    ) : list.map((o) => <OrderListItem key={o.id} order={o} nav={nav} />)}
                </div>
            </div>
            <BottomTabBar active="orders" nav={nav} />
        </>
    );
}
