// 二装施工过程管理 · 共享组件
import React, { useState, type ReactNode } from 'react';
import {
    ArrowLeft, Home, FileText, User, MapPin,
    ChevronRight, Check, Upload, X, FileCheck2,
} from 'lucide-react';
import {
    type RoleId, type Order, type DisplayStatus, nodeState, visibleNodes, nodeLabel, ROLES, usersForRole, canWithdraw,
    needsMoreContracts, orderNeedsCollection, orderCollectionDone, orderContracts, isActiveOrder,
} from './data';

export interface AppNav {
    role: RoleId;
    go: (page: string) => void;
    openOrder: (id: string) => void;
    // 写回服务单状态（原型内共享 ORDERS 数据）
    updateOrder: (patch: Partial<Order>) => void;
}

const STATUS_CLASS: Record<DisplayStatus, string> = {
    待处理: 'todo',
    服务中: 'doing',
    已完成: 'done',
    已终止: 'term',
    待确认: 'confirm',
    已结束: 'ended',
};

export function StatusTag({ status, role, assigneeRole }: { status: DisplayStatus; role?: RoleId; assigneeRole?: RoleId }) {
    // 服务单持久状态创建即「服务中」；「待处理」仅当前节点处理人可见。
    // 客户与财务视角无「待处理」，财务收款态由「待收款 / 已收讫」标签表达。
    let resolved: DisplayStatus = status;
    if (status === '服务中') {
        if (role && role !== 'customer' && role !== 'finance' && assigneeRole === role) resolved = '待处理';
    } else if (status === '待处理') {
        if (role === 'customer' || role === 'finance' || (role && assigneeRole && assigneeRole !== role)) resolved = '服务中';
    }
    return <span className={`status-tag ${STATUS_CLASS[resolved]}`}>{resolved}</span>;
}

export function NavBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
    return (
        <div className="nav-bar">
            {onBack && (
                <div className="nb-left">
                    <button type="button" onClick={onBack} aria-label="返回"><ArrowLeft size={20} /></button>
                </div>
            )}
            <span className="nb-title">{title}</span>
            {right && <div className="nb-right">{right}</div>}
        </div>
    );
}

export function PhoneStatusBar() {
    return (
        <div className="phone-statusbar">
            <span>9:41</span>
            <span className="sb-right">
                <span>●●●</span>
                <span>▮▮▮</span>
                <span>100%</span>
            </span>
        </div>
    );
}

export function BottomTabBar({ active, nav }: { active: string; nav: AppNav }) {
    const items = [
        { id: 'workbench', label: '工作台', icon: Home, page: nav.role === 'customer' ? 'customer-home' : 'staff-home' },
        { id: 'orders', label: '服务单', icon: FileText, page: 'order-list' },
        { id: 'me', label: '我的', icon: User, page: 'user' },
    ];
    return (
        <div className="bottom-tab">
            {items.map((it) => {
                const Icon = it.icon;
                const isActive = active === it.id || (active === 'workbench' && it.id === 'workbench');
                return (
                    <button key={it.id} type="button" className={`bt-item${isActive ? ' is-active' : ''}`} onClick={() => nav.go(it.page)}>
                        <Icon size={20} />
                        <span>{it.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
    return (
        <div className="seg">
            {options.map((o) => (
                <button key={o.value} type="button" className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
    return (
        <div className="field">
            <label className="f-label">
                {required && <span className="req">*</span>}
                {label}
            </label>
            {children}
            {hint && <span className="f-hint">{hint}</span>}
        </div>
    );
}

// 下一节点接收用户选择：按下一节点负责角色预选默认负责人，可切换
export function ReceiverSelect({ role, label, value, onChange }: {
    role: RoleId;
    label?: string;
    value?: string;
    onChange?: (id: string) => void;
}) {
    const users = usersForRole(role);
    const [inner, setInner] = useState(users[0]?.id ?? '');
    const roleLabel = ROLES.find((r) => r.id === role)?.label ?? role;
    const selected = value && users.some((u) => u.id === value) ? value : inner;
    const handle = (id: string) => {
        setInner(id);
        onChange?.(id);
    };
    return (
        <Field label={label ?? '下一节点接收用户'} hint={`系统已预选「${roleLabel}」负责人，可切换`}>
            <select className="f-input" value={selected} onChange={(e) => handle(e.target.value)}>
                {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>
                ))}
            </select>
        </Field>
    );
}

export function UploadBox({ label = '点击上传', hint }: { label?: string; hint?: string }) {
    return (
        <div className="upload-box">
            <Upload className="ub-icon" size={22} />
            <span>{label}</span>
            {hint && <span style={{ fontSize: 11 }}>{hint}</span>}
        </div>
    );
}

export function Empty({ icon: Icon = FileCheck2, text, action }: { icon?: typeof FileCheck2; text: string; action?: ReactNode }) {
    return (
        <div className="empty">
            <Icon className="e-icon" size={44} strokeWidth={1.2} />
            <span style={{ fontSize: 14 }}>{text}</span>
            {action}
        </div>
    );
}

export function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="modal-mask" onClick={onClose}>
            <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <span className="mh-title">{title}</span>
                    <button type="button" onClick={onClose} aria-label="关闭"><X size={20} /></button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}

export function ConfirmDialog({ title, body, confirmText = '确认', danger, onConfirm, onCancel }: {
    title: string; body: ReactNode; confirmText?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div className="modal-mask modal-center" onClick={onCancel}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="md-title">{title}</div>
                <div className="md-body">{body}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline btn-block" onClick={onCancel}>取消</button>
                    <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'} btn-block`} onClick={onConfirm}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}

// 详情页全流程进度条
export function ProgressSteps({ order }: { order: Order }) {
    const nodes = visibleNodes(order);
    return (
        <div style={{ position: 'relative' }}>
            <div className="progress-steps">
                {nodes.map((n) => {
                    const st = nodeState(order, n.id);
                    return (
                        <div
                            key={n.id}
                            className={`p-step ${st}`}
                            title={st === 'returning' ? '补签回退：新增节点完成后自动回到该节点，原处置进度保留' : undefined}
                        >
                            <span className="p-dot">{st === 'done' ? <Check size={12} /> : null}</span>
                            <span className="p-label">
                                {n.label}
                                {st === 'returning' && <em className="p-back">待回办</em>}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 结束服务会签状态标签：待确认服务单用高识别度标签区分普通服务单
function SignBadge({ order, role }: { order: Order; role?: RoleId }) {
    if (order.status !== '待确认' || !order.endRequest) return null;
    const mine = role === 'pm' || role === 'quoter';
    const waitingMe = role === 'pm' ? !order.endRequest.pmConfirmed : role === 'quoter' ? !order.endRequest.quoterConfirmed : false;
    return <span className={`confirm-badge${mine && waitingMe ? ' is-mine' : ''}`}>{mine && waitingMe ? '待我会签' : '结束服务会签中'}</span>;
}

export function OrderListItem({ order, nav, hideMainStatus }: { order: Order; nav: AppNav; hideMainStatus?: boolean }) {
    const pendingAssign = order.currentNode === 'assign' && isActiveOrder(order);
    // 报价员：已签一类合同，仍可补充另一类服务合同；财务：已签合同收款未达 100%
    const pendingContract = nav.role === 'quoter' && needsMoreContracts(order);
    const isFinance = nav.role === 'finance';
    const pendingCollection = isFinance && orderNeedsCollection(order);
    // 财务服务单列表：服务中工单的收款节点区分「待收款 / 已收讫」
    const collectionReceived = isFinance && isActiveOrder(order) && orderContracts(order).length > 0 && orderCollectionDone(order);
    return (
        <div className={`list-item${order.status === '待确认' ? ' is-confirm' : ''}${pendingAssign ? ' is-assign' : ''}`} onClick={() => nav.openOrder(order.id)}>
            <div className="li-main">
                <div className="li-title">
                    <span>{order.location}</span>
                    {!hideMainStatus && <StatusTag status={order.status} role={nav.role} assigneeRole={order.assigneeRole} />}
                    {pendingAssign && <span className="assign-badge">{nav.role === 'pm' ? '待我指派' : '待指派'}</span>}
                    {pendingContract && <span className="assign-badge">待确认合同</span>}
                    {pendingCollection && <span className="collect-badge">待收款</span>}
                    {collectionReceived && <span className="collect-badge is-done">已收讫</span>}
                    <SignBadge order={order} role={nav.role} />
                    {canWithdraw(nav.role, order) && <span className="withdraw-tag">可撤回</span>}
                </div>
                <div className="li-meta">
                    <span>{order.project}</span>
                    <span className="dot" />
                    <span>{order.customer}</span>
                </div>
                <div className="li-meta">
                    <MapPin size={12} />
                    <span>{order.id}</span>
                    <span className="dot" />
                    <span>当前节点：{nodeLabel(order.currentNode)}</span>
                    <span className="dot" />
                    <span>{order.updateTime}</span>
                </div>
            </div>
            <ChevronRight size={16} color="#bbb" />
        </div>
    );
}
