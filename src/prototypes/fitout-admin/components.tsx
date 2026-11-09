// 二装施工过程管理 · Web 管理后台 · 共享组件
import React, { useState, type ReactNode } from 'react';
import {
    LayoutDashboard, Building2, FileText, Users, BarChart3, Settings,
    LogOut, Bell, X, Search, Check, Upload,
} from 'lucide-react';
import { type Order, type DisplayStatus, type ProjectStatus, type AccountStatus, visibleNodes, nodeState, ROLES, workUsersForRole, type RoleId, type ViewerRole, viewerRoleLabel, viewerUserName, type AdminPermissionId, hasAdminPerm, adminPermLabel } from './data';

export interface AdminNav {
    go: (page: string) => void;
    openOrder: (id: string) => void;
    openProject: (id: string) => void;
    logout: () => void;
    // 当前模拟角色：系统管理员只读，员工角色按岗位权限门控
    viewer: ViewerRole;
    // 当前账号的后台管理权限（来自岗位配置，演示环境下由工具栏切换）
    adminPerms: AdminPermissionId[];
}

// 侧边栏导航结构：perm 为访问所需的后台管理权限，未设置则所有账号可见
export const NAV_GROUPS: { title: string; items: { id: string; label: string; icon: typeof LayoutDashboard; perm?: AdminPermissionId }[] }[] = [
    { title: '总览', items: [{ id: 'dashboard', label: '概览驾驶舱', icon: LayoutDashboard }] },
    {
        title: '业务管理',
        items: [
            { id: 'project-list', label: '项目点位', icon: Building2, perm: 'biz' },
            { id: 'order-list', label: '服务单管理', icon: FileText },
        ],
    },
    {
        title: '账号管理',
        items: [
            { id: 'staff-accounts', label: '员工账户', icon: Users, perm: 'sys' },
            { id: 'owner-accounts', label: '业主信息', icon: Users, perm: 'sys' },
        ],
    },
    {
        title: '数据与配置',
        items: [
            { id: 'report', label: '统计报表', icon: BarChart3, perm: 'biz' },
            { id: 'flow-config', label: '流程编排', icon: Settings, perm: 'sys' },
            { id: 'flow-designer', label: '流程设计器', icon: Settings, perm: 'sys' },
            { id: 'position-config', label: '岗位配置', icon: Settings, perm: 'sys' },
            { id: 'notify-config', label: '通知与超时', icon: Settings, perm: 'sys' },
        ],
    },
];

const STATUS_CLASS: Record<DisplayStatus, string> = {
    待处理: 'todo',
    服务中: 'doing',
    待确认: 'confirm',
    已完成: 'done',
    已结束: 'ended',
    已终止: 'term',
};

// 服务单持久状态创建即「服务中」；「待处理」为节点处置态，仅当前处理角色本人可见。
// 系统管理员与财务均显示「服务中」，财务收款态由「待收款 / 已收讫」标签表达。
export function StatusTag({ status, role, assigneeRole }: { status: DisplayStatus; role?: ViewerRole; assigneeRole?: RoleId }) {
    let shown: DisplayStatus = status;
    if (status === '服务中') {
        if (role && role !== 'admin' && role !== 'finance' && assigneeRole === role) shown = '待处理';
    } else if (status === '待处理') {
        if (!role || role === 'admin' || role === 'finance' || assigneeRole !== role) shown = '服务中';
    }
    return <span className={`status-tag ${STATUS_CLASS[shown]}`}>{shown}</span>;
}

export function ProjectBadge({ status }: { status: ProjectStatus }) {
    const cls = status === '启用' ? 'green' : status === '停用' ? 'gray' : 'orange';
    return <span className={`badge ${cls}`}>{status}</span>;
}

export function AccountBadge({ status }: { status: AccountStatus }) {
    const cls = status === '启用' ? 'green' : 'gray';
    return <span className={`badge ${cls}`}>{status}</span>;
}

// 后台壳：侧边栏 + 顶栏 + 内容区
export function AdminShell({ nav, page, crumb, title, sub, actions, children }: {
    nav: AdminNav; page: string; crumb: string[]; title: string; sub?: string; actions?: ReactNode; children: ReactNode;
}) {
    // 侧边栏按当前账号的后台管理权限过滤；无可见条目的分组整体隐藏
    const visibleGroups = NAV_GROUPS
        .map((g) => ({ ...g, items: g.items.filter((it) => !it.perm || hasAdminPerm(nav.adminPerms, it.perm)) }))
        .filter((g) => g.items.length > 0);

    return (
        <div className="admin-shell">
            <aside className="sidebar">
                <div className="sb-logo">
                    <span className="logo-mark">二装</span>
                    <div>
                        <div className="logo-text">二装施工过程管理</div>
                        <div className="logo-sub">Web 管理后台</div>
                    </div>
                </div>
                <nav className="sb-nav">
                    {visibleGroups.map((g) => (
                        <div className="sb-group" key={g.title}>
                            <div className="sb-group-title">{g.title}</div>
                            {g.items.map((it) => {
                                const Icon = it.icon;
                                const isActive = page === it.id;
                                return (
                                    <button key={it.id} type="button" className={`sb-item${isActive ? ' is-active' : ''}`} onClick={() => nav.go(it.id)}>
                                        <Icon size={17} />
                                        <span>{it.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="sb-foot">
                    <div className="sb-user">
                        <span className="avatar">{viewerUserName(nav.viewer).slice(0, 1)}</span>
                        <div>
                            <div className="u-name">{viewerUserName(nav.viewer)}</div>
                            <div className="u-role" title={adminPermLabel(nav.adminPerms)}>
                                {nav.viewer === 'admin' ? '运营管控端 · 只读' : viewerRoleLabel(nav.viewer)}
                            </div>
                            <div className="u-role">{adminPermLabel(nav.adminPerms)}</div>
                        </div>
                    </div>
                    <button type="button" className="sb-logout" onClick={nav.logout}><LogOut size={15} /> 退出登录</button>
                </div>
            </aside>

            <div className="admin-main">
                <div className="topbar">
                    <div className="tb-crumb">
                        {crumb.map((c, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span className="sep">/</span>}
                                <span className={i === crumb.length - 1 ? 'current' : ''}>{c}</span>
                            </React.Fragment>
                        ))}
                    </div>
                    <div className="tb-right">
                        {hasAdminPerm(nav.adminPerms, 'sys') && (
                            <button type="button" className="bell" onClick={() => nav.go('notify-config')} aria-label="消息"><Bell size={18} /><span className="dot" /></button>
                        )}
                    </div>
                </div>
                <div className="content">
                    <div className="page-head">
                        <div>
                            <h2 className="ph-title">{title}</h2>
                            {sub && <div className="ph-sub">{sub}</div>}
                        </div>
                        {actions}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}

// 弹窗
export function Modal({ title, onClose, footer, children, width }: { title: string; onClose: () => void; footer?: ReactNode; children: ReactNode; width?: number }) {
    return (
        <div className="modal-mask" onClick={onClose}>
            <div className="modal-dialog" style={width ? { width } : undefined} onClick={(e) => e.stopPropagation()}>
                <div className="md-head">
                    <span className="md-title">{title}</span>
                    <button type="button" className="md-close" onClick={onClose} aria-label="关闭"><X size={20} /></button>
                </div>
                <div className="md-body">{children}</div>
                {footer && <div className="md-foot">{footer}</div>}
            </div>
        </div>
    );
}

// 开关
export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="switch">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <span className="slider" />
        </label>
    );
}

// 服务单详情 · 全流程进度条
export function ProgressSteps({ order }: { order: Order }) {
    // 合同收款是并行支线，主进度条不展示，收款进度在合同卡单独呈现
    const nodes = visibleNodes(order).filter((n) => n.id !== 'collection');
    return (
        <div className="progress-steps">
            {nodes.map((n) => {
                const st = nodeState(order, n.id);
                return (
                    <div
                        key={n.id}
                        className={`p-step ${st}`}
                        title={st === 'returning' ? '补签回退：新增节点完成后自动回到该节点，原处置进度保留' : undefined}
                    >
                        <span className="p-line" />
                        <span className="p-dot">{st === 'done' ? <Check size={13} /> : null}</span>
                        <span className="p-label">
                            {n.label}
                            {st === 'returning' && <em className="p-back">待回办</em>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// 环形占比图（SVG）
export function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const R = 54;
    const C = 2 * Math.PI * R;
    let offset = 0;
    return (
        <div className="donut-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={R} fill="none" stroke="#f0f2f5" strokeWidth="18" />
                {data.map((d) => {
                    const frac = d.value / total;
                    const dash = frac * C;
                    const el = (
                        <circle key={d.name} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="18"
                            strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />
                    );
                    offset += dash;
                    return el;
                })}
                <text x="70" y="66" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1f1f1f">{total}</text>
                <text x="70" y="86" textAnchor="middle" fontSize="11" fill="#8b94a3">工单总数</text>
            </svg>
            <div className="donut-legend">
                {data.map((d) => (
                    <div className="lg-item" key={d.name}>
                        <span className="lg-dot" style={{ background: d.color }} />
                        <span className="lg-name">{d.name}</span>
                        <span className="lg-val">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// 柱状图（纯 CSS）
export function BarChart({ data, color = '#1677ff' }: { data: { label: string; value: number }[]; color?: string }) {
    const max = Math.max(...data.map((d) => d.value));
    return (
        <div className="chart-bars">
            {data.map((d) => (
                <div className="chart-bar" key={d.label}>
                    <div className="bar" style={{ height: `${(d.value / max) * 130 + 8}px`, background: color }}>
                        <span style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: '#8b94a3' }}>{d.value}</span>
                    </div>
                    <span className="bar-label">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// 折线图（SVG）
export function LineChart({ data, color = '#1677ff' }: { data: { label: string; value: number }[]; color?: string }) {
    const W = 560;
    const H = 180;
    const padX = 40;
    const padTop = 20;
    const padBottom = 30;
    const max = Math.max(...data.map((d) => d.value), 1);
    const n = data.length;
    const stepX = (W - padX * 2) / Math.max(n - 1, 1);
    const y = (v: number) => padTop + (H - padTop - padBottom) * (1 - v / max);
    const pts = data.map((d, i) => ({ x: padX + i * stepX, y: y(d.value), ...d }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    const area = `${padX},${H - padBottom} ${line} ${padX + (n - 1) * stepX},${H - padBottom}`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="180" preserveAspectRatio="none">
            <defs>
                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((f) => (
                <line key={f} x1={padX} x2={W - padX} y1={padTop + (H - padTop - padBottom) * f} y2={padTop + (H - padTop - padBottom) * f} stroke="#f0f2f5" strokeWidth="1" />
            ))}
            <polygon points={area} fill="url(#lineFill)" />
            <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p) => (
                <g key={p.label}>
                    <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2.5" />
                    <text x={p.x} y={H - 8} textAnchor="middle" fontSize="11" fill="#8b94a3">{p.label}</text>
                </g>
            ))}
        </svg>
    );
}

// 搜索输入
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <Search size={15} color="#8b94a3" style={{ position: 'absolute', left: 10 }} />
            <input className="tb-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ paddingLeft: 30 }} />
        </div>
    );
}

// 工作推进表单字段（与小程序端 Field 一致）
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

// 附件上传占位（与小程序端 UploadBox 一致）
export function UploadBox({ label = '点击上传' }: { label?: string }) {
    return (
        <div className="upload-box">
            <Upload className="ub-icon" size={22} />
            <span>{label}</span>
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
    const users = workUsersForRole(role);
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
