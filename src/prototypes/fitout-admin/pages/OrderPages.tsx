// 服务单管理：列表 + 详情
// 服务单管理：5 个持久状态 + 派生的「待处理」节点处置态、新节点、角色门控、评估指派、合同两次签订、并行收款、结束服务会签、金额脱敏、共享池
import React, { useEffect, useState } from 'react';
import {
    ChevronLeft, FileText, Download, Plus, X, Send, AlertTriangle, ShieldAlert, Info, ClipboardCheck, RefreshCw,
} from 'lucide-react';
import { type AdminNav, AdminShell, StatusTag, ProgressSteps, SearchInput, Modal, Field, UploadBox, ReceiverSelect } from '../components';
import {
    ORDERS, PROJECTS, NODES,
    visibleNodes, nodeState, nodeLabel, nodeSubmission, amountToChinese, roleLabel, serviceScope,
    orderContracts, contractRatio, orderCollectionDone, orderServiceDone, hasAgencyContract,
    needsMoreContracts, orderCollectionProgress, isSharedPoolOrder, canEndService, canWithdraw,
    orderTags, isOrderActive, displayStatus, formatMoney, canViewContractAmount,
    resolveAdvance, supplementRollbackNodes, completedBeforeCurrent,
    workUsersForRole, viewerUserName, hasConstructionContract, hasAdminPerm, isOrderRelated,
    orderConfirmedWorkloads, orderConstructionDone, workloadVolume,
    type Order, type DisplayStatus, type ViewerRole, type RoleId, type NodeId,
    type ContractType, type ContractRecord, type CollectionRecord, type EndRequest, type WorkloadItem,
} from '../data';

// 工作量清单：系统-部件结构（绘图员拆解点位工作量，合同最终确认后用于施工扣减）
const SYSTEM_OPTIONS = ['消防喷淋系统', '消火栓系统', '火灾自动报警系统', '气体灭火系统', '防排烟系统'];
const COMPONENT_OPTIONS = ['喷头', '管道', '阀门', '探测器', '手动报警按钮', '控制模块'];

interface Workload {
    id: number;
    system: string;
    component: string;
    fresh: number;
    remove: number;
    move: number;
}

const REVIEW_FILES = [
    { name: '图纸深化-深化图.pdf', size: '2.4 MB' },
    { name: '图纸深化-计算书.pdf', size: '0.8 MB' },
];
const REVIEW_WORKLOADS = [
    { system: '消防喷淋系统', component: '喷头', fresh: 24, remove: 6, move: 8 },
    { system: '消防喷淋系统', component: '管道', fresh: 12, remove: 3, move: 5 },
    { system: '火灾自动报警系统', component: '探测器', fresh: 18, remove: 4, move: 2 },
];

// 工作量清单只读表：绘图员表单 / 报价员合同表单 / 施工扣减统一使用同一结构
function WorkloadTable({ items }: { items: WorkloadItem[] }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', background: '#f7f8fa', fontSize: 12, color: 'var(--text-2)', padding: '8px 10px' }}>
                <span style={{ flex: 1.6 }}>系统 · 部件</span>
                <span style={{ flex: 1, textAlign: 'center' }}>新装</span>
                <span style={{ flex: 1, textAlign: 'center' }}>拆除</span>
                <span style={{ flex: 1, textAlign: 'center' }}>移位</span>
            </div>
            {items.map((w, i) => (
                <div key={i} style={{ display: 'flex', fontSize: 13, padding: '9px 10px', borderTop: '1px solid #f0f0f0' }}>
                    <span style={{ flex: 1.6 }}>{w.system} · {w.component}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{w.fresh}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{w.remove}</span>
                    <span style={{ flex: 1, textAlign: 'center' }}>{w.move}</span>
                </div>
            ))}
        </div>
    );
}

type ActKind = 'assign' | 'submit' | 'review' | 'progress' | 'acceptance' | 'agent' | 'contract' | 'supplement' | 'collection' | 'endApply' | 'endConfirm' | 'withdraw';
interface Act { label: string; kind: ActKind; primary?: boolean; weak?: boolean }

type ModalKind = 'assign' | 'submit' | 'review' | 'reject' | 'progress' | 'acceptance' | 'agent' | 'contract' | 'collection' | 'endApply' | 'endConfirm' | 'withdraw' | null;

// 按查看者视角解析状态：服务单持久状态为「服务中」，「待处理」仅当前节点处理人可见；财务与管理员不出现「待处理」
function viewStatus(order: Order, role: ViewerRole): DisplayStatus {
    return displayStatus(order, role);
}

function nowStamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 按角色与当前节点生成可执行操作
function actionsFor(role: ViewerRole, order: Order): Act[] {
    const acts: Act[] = [];

    if (role === 'admin') {
        if (isOrderActive(order) && isSharedPoolOrder(order) && order.currentNode === 'assign') {
            acts.push({ label: '分派工单', kind: 'assign', primary: true });
        }
        return acts;
    }

    const pendingSign = order.endRequest && ((role === 'pm' && !order.endRequest.pmConfirmed) || (role === 'quoter' && !order.endRequest.quoterConfirmed));

    // 待确认状态仅保留结束服务会签操作
    if (order.status === '待确认') {
        return pendingSign ? [{ label: '结束服务会签', kind: 'endConfirm', primary: true }] : [];
    }
    if (!isOrderActive(order)) return [];

    switch (order.currentNode) {
        case 'assign':
            if (role === 'pm') acts.push({ label: '评估并指派', kind: 'assign', primary: true });
            break;
        case 'deepen':
            if (role === 'drafter') acts.push({ label: '提交图纸', kind: 'submit', primary: true });
            break;
        case 'review':
            if (role === 'pm') acts.push({ label: '审核', kind: 'review', primary: true });
            break;
        case 'contract':
            if (role === 'quoter') acts.push({ label: '确认合同', kind: 'contract', primary: true });
            break;
        case 'construction':
            if (role === 'pm') acts.push({ label: '更新施工量', kind: 'progress', primary: true });
            break;
        case 'acceptance':
            if (role === 'pm') acts.push({ label: '提交验收', kind: 'acceptance', primary: true });
            break;
        case 'inspect':
        case 'declare':
            if (role === 'agent') acts.push({ label: '上传代办凭证', kind: 'agent', primary: true });
            break;
        case 'collection':
            break;
        default:
            break;
    }

    // 报价员可并行补签另一类服务合同
    if (role === 'quoter' && order.currentNode !== 'contract' && needsMoreContracts(order)) {
        acts.push({ label: '继续确认合同', kind: 'supplement', primary: true });
    }
    // 财务可并行跟进已签合同的收款
    if (role === 'finance' && orderContracts(order).length > 0 && !orderCollectionDone(order) && isOrderActive(order)) {
        acts.push({ label: '更新收款进度', kind: 'collection', primary: acts.length === 0 });
    }
    if (pendingSign) acts.push({ label: '会签确认', kind: 'endConfirm', primary: true });
    if (canWithdraw(role, order)) acts.push({ label: '撤回', kind: 'withdraw' });
    if (canEndService(role, order)) acts.push({ label: '结束服务', kind: 'endApply', weak: true });

    return acts;
}

export function OrderList({ nav }: { nav: AdminNav }) {
    const role = nav.viewer;
    // 未开通业务管理员权限的账号仅可查看、处理本人相关的服务单
    const biz = hasAdminPerm(nav.adminPerms, 'biz');
    const userName = viewerUserName(role);
    const [kw, setKw] = useState('');
    const [status, setStatus] = useState<'全部' | DisplayStatus>('全部');
    const [node, setNode] = useState('全部');
    const [project, setProject] = useState('全部');
    const [onlyPool, setOnlyPool] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 8;

    const scopeOrders = biz ? ORDERS : ORDERS.filter((o) => isOrderRelated(o, userName, role));

    const filtered = scopeOrders.filter((o) => {
        const mKw = o.id.includes(kw) || o.location.includes(kw) || o.customer.includes(kw) || o.project.includes(kw);
        const mStatus = status === '全部' ? true : viewStatus(o, role) === status;
        const mNode = node === '全部' || o.currentNode === node;
        const mProject = project === '全部' || o.project === project;
        const mPool = !onlyPool || isSharedPoolOrder(o);
        return mKw && mStatus && mNode && mProject && mPool;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageData = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const statusOptions: DisplayStatus[] = ['待处理', '服务中', '待确认', '已完成', '已结束', '已终止'];

    return (
        <AdminShell nav={nav} page="order-list" crumb={['服务单管理']} title="服务单管理"
            sub={biz ? `全量服务单筛选与状态跟进 · 当前角色：${userName}` : `仅本人相关服务单 · 当前角色：${userName}`}>
            {!biz && (
                <div className="banner info" style={{ marginBottom: 12 }}>
                    <span className="bn-icon"><Info size={16} /></span>
                    <div className="bn-main">
                        <div className="bn-sub">当前账号未开通业务管理员权限，仅展示与本人相关的服务单（当前处理人、项目专属团队、合同提交/接收、收款或会签参与、回退处置）。</div>
                    </div>
                </div>
            )}
            <div className="card">
                <div className="toolbar">
                    <SearchInput value={kw} onChange={(v) => { setKw(v); setPage(1); }} placeholder="搜索编号 / 位置 / 客户 / 项目" />
                    <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}>
                        <option value="全部">全部状态</option>
                        {statusOptions.filter((s) => !((role === 'finance' || role === 'admin') && s === '待处理')).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={node} onChange={(e) => { setNode(e.target.value); setPage(1); }}>
                        <option value="全部">全部节点</option>
                        {NODES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                    <select value={project} onChange={(e) => { setProject(e.target.value); setPage(1); }}>
                        <option value="全部">全部项目</option>
                        {PROJECTS.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                    <button type="button" className={`btn btn-sm ${onlyPool ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setOnlyPool((v) => !v); setPage(1); }}>
                        共享池
                    </button>
                    <span className="tb-spacer" />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {role === 'finance' ? '财务视图：可查看合同完整金额，服务单统一按服务中呈现，收款态见待收款 / 已收讫' : '按岗位权限展示可处置操作'}
                    </span>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead><tr><th>编号</th><th>施工位置 / 项目</th><th>客户</th><th>当前节点</th><th>状态与标签</th><th>收款</th><th>更新时间</th><th>操作</th></tr></thead>
                    <tbody>
                        {pageData.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>暂无匹配的服务单</td></tr>
                        ) : pageData.map((o) => {
                            const tags = orderTags(role, o);
                            const contracts = orderContracts(o);
                            const progress = orderCollectionProgress(o);
                            const collectionText = contracts.length === 0 ? '—' : orderCollectionDone(o) ? '已收讫' : `${progress.ratio}%`;
                            return (
                                <tr key={o.id} onClick={() => nav.openOrder(o.id)} style={{ cursor: 'pointer' }}>
                                    <td className="td-main">{o.id}</td>
                                    <td>
                                        <div style={{ color: 'var(--text)' }}>{o.location}</div>
                                        <div className="td-sub">{o.project}</div>
                                    </td>
                                    <td>{o.customer}</td>
                                    <td><span className="badge blue">{nodeLabel(o.currentNode)}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <StatusTag status={o.status} role={role} assigneeRole={o.assigneeRole} />
                                            {tags.length > 0 && (
                                                <div className="tag-chips">
                                                    {tags.map((t) => <span key={t.label} className={`tag-chip ${t.tone}`}>{t.label}</span>)}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`tag-chip ${collectionText === '已收讫' ? 'green' : 'gray'}`}>{collectionText}</span>
                                    </td>
                                    <td style={{ color: 'var(--text-2)' }}>{o.updateTime}</td>
                                    <td><span className="op-link" onClick={(e) => { e.stopPropagation(); nav.openOrder(o.id); }}>查看详情</span></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="pagination">
                    <span>共 {filtered.length} 条</span>
                    <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>上一页</button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button key={i} className={safePage === i + 1 ? 'is-active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>
                    ))}
                    <button disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>下一页</button>
                </div>
            </div>
        </AdminShell>
    );
}

export function OrderDetail({ nav, order }: { nav: AdminNav; order: Order }) {
    const role = nav.viewer;
    const roleId: RoleId | null = role === 'admin' ? null : role;

    const [live, setLive] = useState<Order>(order);
    useEffect(() => {
        setLive(order);
        setConstructionDone(orderConstructionDone(order));
        setDeductInputs({});
    }, [order.id]);

    const [modal, setModal] = useState<ModalKind>(null);
    const [toast, setToast] = useState('');
    const [workloads, setWorkloads] = useState<Workload[]>([
        { id: 1, system: '消防喷淋系统', component: '喷头', fresh: 24, remove: 6, move: 8 },
        { id: 2, system: '火灾自动报警系统', component: '探测器', fresh: 18, remove: 4, move: 2 },
    ]);
    const [nextWid, setNextWid] = useState(3);
    // 施工扣减：以合同最终确认的工作量清单为基数，逐行累计已完量
    const [constructionDone, setConstructionDone] = useState<WorkloadItem[]>(() => orderConstructionDone(order));
    const [deductInputs, setDeductInputs] = useState<Record<number, { fresh: string; remove: string; move: string }>>({});
    const [rejectNote, setRejectNote] = useState('');
    const [assignDrafter, setAssignDrafter] = useState(workUsersForRole('drafter')[0]?.name ?? '王强');
    const [surveyTime, setSurveyTime] = useState('');
    const [surveyConclusion, setSurveyConclusion] = useState('');
    const [assignNote, setAssignNote] = useState('');

    // 合同表单
    const [contractType, setContractType] = useState<ContractType>('仅施工');
    const [workloadMode, setWorkloadMode] = useState<'采用绘图员版本' | '上传最终确认版'>('采用绘图员版本');
    const [contractTotal, setContractTotal] = useState('');
    const [contractRemark, setContractRemark] = useState('');
    // 收款表单：按合同分别填写累计比例，金额选填
    const [collectInputs, setCollectInputs] = useState<Record<string, { ratio: string; amount: string }>>({});
    // 结束服务
    const [endReason, setEndReason] = useState('');
    const [endPmId, setEndPmId] = useState(workUsersForRole('pm')[0]?.id ?? '');
    const [endQuoterId, setEndQuoterId] = useState(workUsersForRole('quoter')[0]?.id ?? '');
    // 合同接收用户（补签时即新增节点处置用户）
    const [contractReceiverId, setContractReceiverId] = useState(workUsersForRole('pm')[0]?.id ?? '');

    if (!order) {
        return (
            <AdminShell nav={nav} page="order-list" crumb={['服务单管理', '详情']} title="服务单详情">
                <div className="card"><div className="empty">未找到该服务单</div></div>
            </AdminShell>
        );
    }

    const contracts = orderContracts(live);
    const collection = orderCollectionProgress(live);
    const nodes = visibleNodes(live);
    const nodePath = nodes.filter((n) => n.id !== 'collection');
    const curIdx = nodePath.findIndex((n) => n.id === live.currentNode);
    // 回退链内不选下一节点处理人：处置人已由报价员确认合同时指定
    const inRollbackChain = !!live.rollback && live.rollback.insertedNodes.includes(live.currentNode);
    const acts = actionsFor(role, live);
    const showAmount = canViewContractAmount(role);

    const addWorkload = () => {
        setWorkloads((prev) => [...prev, { id: nextWid, system: SYSTEM_OPTIONS[0], component: COMPONENT_OPTIONS[0], fresh: 0, remove: 0, move: 0 }]);
        setNextWid((n) => n + 1);
    };
    const updateWorkload = (id: number, patch: Partial<Workload>) => {
        setWorkloads((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    };
    const removeWorkload = (id: number) => setWorkloads((prev) => prev.filter((w) => w.id !== id));

    const showToast = (msg: string) => { setModal(null); setToast(msg); };
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(t);
    }, [toast]);

    // 未开通业务管理员权限时，直达非本人相关服务单展示无权限空态（置于所有 hooks 之后）
    if (!hasAdminPerm(nav.adminPerms, 'biz') && !isOrderRelated(order, viewerUserName(role), role)) {
        return (
            <AdminShell nav={nav} page="order-list" crumb={['服务单管理', '详情']} title="服务单详情">
                <div className="card">
                    <div className="empty">
                        <ShieldAlert size={22} color="var(--warning)" style={{ marginBottom: 10 }} />
                        <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500 }}>无权查看该服务单</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6 }}>当前账号未开通业务管理员权限，仅可查看与本人相关的服务单。</div>
                        <button className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} onClick={() => nav.go('order-list')}>返回服务单列表</button>
                    </div>
                </div>
            </AdminShell>
        );
    }

    const fire = (kind: ActKind) => {
        if (kind === 'contract' || kind === 'supplement') {
            const allowed = availableContractTypes();
            const firstType = allowed[0] ?? '仅施工';
            setContractType(firstType);
            setContractReceiverId(workUsersForRole(receiverRoleFor(firstType))[0]?.id ?? '');
            setWorkloadMode('采用绘图员版本');
            setContractTotal('');
            setContractRemark('');
            setModal('contract');
            return;
        }
        if (kind === 'collection') {
            const init: Record<string, { ratio: string; amount: string }> = {};
            contracts.forEach((c) => { init[c.id] = { ratio: String(contractRatio(c)), amount: '' }; });
            setCollectInputs(init);
            setModal('collection');
            return;
        }
        if (kind === 'endApply') { setEndReason(''); setModal('endApply'); return; }
        if (kind === 'endConfirm') { setModal('endConfirm'); return; }
        if (kind === 'withdraw') { setModal('withdraw'); return; }
        if (kind === 'progress') { setDeductInputs({}); setModal('progress'); return; }
        if (kind === 'review') { setModal('review'); return; }
        if (kind === 'assign') { setSurveyTime(''); setSurveyConclusion(''); setAssignNote(''); setModal('assign'); return; }
        setModal(kind);
    };

    // 当前可签合同类型：已签的不可重复，完整合同与单类合同互斥
    function availableContractTypes(): ContractType[] {
        const types = contracts.map((c) => c.type);
        if (types.includes('完整施工代办')) return [];
        if (types.includes('仅施工')) return ['仅代办'];
        if (types.includes('仅代办')) return ['仅施工'];
        return ['仅施工', '仅代办', '完整施工代办'];
    }

    const receiverRoleFor = (type: ContractType): RoleId => (type === '仅施工' ? 'pm' : 'agent');

    // 合同签订后的下一节点
    function nextNodeAfterContract(type: ContractType): { node: NodeId; role: RoleId } {
        if (type === '仅施工') return { node: 'construction', role: 'pm' };
        if (type === '仅代办') return { node: live.hasInspect ? 'inspect' : 'declare', role: 'agent' };
        if (live.hasInspect) return { node: 'inspect', role: 'agent' };
        return { node: 'construction', role: 'pm' };
    }

    // 合同接收用户与补签回退预告
    const contractReceiverRole = receiverRoleFor(contractType);
    const contractReceiverOptions = workUsersForRole(contractReceiverRole);
    const effectiveContractReceiverId = contractReceiverOptions.some((u) => u.id === contractReceiverId)
        ? contractReceiverId
        : (contractReceiverOptions[0]?.id ?? '');
    const supplementPreview = live.currentNode === 'contract' || availableContractTypes().length === 0
        ? []
        : supplementRollbackNodes(live, contractType);

    function submitContract() {
        const type = contractType;
        const receiverRole = receiverRoleFor(type);
        const receiverUsers = workUsersForRole(receiverRole);
        const receiverUser = receiverUsers.find((u) => u.id === contractReceiverId) ?? receiverUsers[0];
        const receiverName = receiverUser?.name ?? roleLabel(receiverRole);
        const total = contractTotal.trim() ? Number(contractTotal) : undefined;
        const workloadSnapshot = workloads.map((w) => ({ system: w.system, component: w.component, fresh: w.fresh, remove: w.remove, move: w.move }));
        const record: ContractRecord = {
            id: `HT${Date.now()}`,
            type,
            totalPrice: total && isFinite(total) ? total : undefined,
            signedTime: nowStamp(),
            submitter: viewerUserName(role),
            receiverRole,
            receiverName,
            workloadMode: type === '仅代办' ? '采用绘图员版本' : workloadMode,
            workloads: type === '仅代办' ? undefined : workloadSnapshot,
            workloadAttachments: [type !== '仅代办' && workloadMode === '上传最终确认版' ? '工作量清单（最终确认版）.xlsx' : '工作量清单.xlsx'],
            drawingAttachments: type !== '仅代办' && workloadMode === '上传最终确认版' ? ['深化图纸（最终确认版）.pdf'] : ['深化图纸.pdf', '计算书.pdf'],
            attachments: [type === '仅代办' ? '代办合同.pdf' : '施工合同.pdf'],
            quoteAttachments: [type === '仅代办' ? '代办报价单.pdf' : '施工报价单.pdf'],
            remark: contractRemark.trim() || undefined,
            collections: [],
        };
        const isFirst = live.currentNode === 'contract';
        const nextContracts = [...orderContracts(live).map((c) => ({ ...c, collections: [...c.collections] })), record];
        if (isFirst) {
            const next = nextNodeAfterContract(type);
            setLive((o) => ({
                ...o,
                contracts: nextContracts,
                currentNode: next.node,
                assigneeRole: next.role,
                assignee: receiverName,
                updateTime: nowStamp(),
            }));
            showToast('合同已确认，节点已推进');
            return;
        }
        // 补签：新增节点位置早于当前节点的，服务单回退至新增节点；晚于当前节点的按完整流程顺序追加
        const rollbackNodes = supplementRollbackNodes(live, type);
        if (rollbackNodes.length > 0) {
            const returnNode = live.currentNode;
            const returnRole = live.assigneeRole;
            const returnAssignee = live.assignee;
            const returnLabel = nodeLabel(returnNode);
            const insertedLabel = rollbackNodes.map(nodeLabel).join(' → ');
            setLive((o) => ({
                ...o,
                contracts: nextContracts,
                currentNode: rollbackNodes[0],
                assigneeRole: receiverRole,
                assignee: receiverName,
                rollback: {
                    returnNode,
                    returnRole,
                    returnAssignee,
                    insertedNodes: rollbackNodes,
                    handlerRole: receiverRole,
                    handlerAssignee: receiverName,
                    contractType: type,
                    time: nowStamp(),
                },
                completedNodes: Array.from(new Set([...(o.completedNodes ?? []), ...completedBeforeCurrent(live, rollbackNodes)])),
                updateTime: nowStamp(),
            }));
            showToast(`补签合同已确认，服务单已回退至「${nodeLabel(rollbackNodes[0])}」；${insertedLabel} 完成后自动回到「${returnLabel}」，原处置进度保留`);
            return;
        }
        setLive((o) => ({ ...o, contracts: nextContracts, updateTime: nowStamp() }));
        showToast('补签合同已提交，服务节点已按完整流程顺序追加');
    }

    function submitCollection() {
        const updated = orderContracts(live).map((c) => {
            const input = collectInputs[c.id];
            if (!input) return c;
            const ratio = Number(input.ratio);
            const current = contractRatio(c);
            if (!isFinite(ratio) || ratio < 0 || ratio > 100 || ratio <= current) return c;
            const amountText = input.amount.trim();
            const amount = amountText ? Number(amountText) : 0;
            if (!isFinite(amount) || amount < 0) return c;
            const record: CollectionRecord = { time: nowStamp(), amount, ratio, by: viewerUserName(role) };
            return { ...c, collections: [...c.collections, record] };
        });
        const changed = updated.some((c, i) => c.collections.length !== contracts[i].collections.length);
        if (!changed) {
            setToast('请至少为一份合同填写高于当前累计比例的收款进度（0-100）');
            return;
        }
        const allDone = updated.length > 0 && updated.every((c) => contractRatio(c) >= 100);
        const serviceDone = orderServiceDone(live);
        setLive((o) => ({
            ...o,
            contracts: updated,
            status: allDone && serviceDone ? '已完成' : o.status,
            updateTime: nowStamp(),
        }));
        showToast(allDone && serviceDone ? '收款已收齐且服务已完结，服务单已办结' : '收款记录已更新');
    }

    function submitEndApply() {
        if (!endReason.trim()) { setToast('请填写结束原因'); return; }
        if (!roleId) return;
        const me = viewerUserName(role);
        const pm = workUsersForRole('pm').find((u) => u.id === endPmId);
        const quoter = workUsersForRole('quoter').find((u) => u.id === endQuoterId);
        const req: EndRequest = {
            reason: endReason.trim(),
            initiator: me,
            initiatorRole: roleId,
            time: nowStamp(),
            pmConfirmed: roleId === 'pm',
            quoterConfirmed: roleId === 'quoter',
            pmName: roleId === 'pm' ? me : pm?.name,
            quoterName: roleId === 'quoter' ? me : quoter?.name,
            pmTime: roleId === 'pm' ? nowStamp() : undefined,
            quoterTime: roleId === 'quoter' ? nowStamp() : undefined,
        };
        setLive((o) => ({ ...o, status: '待确认', endRequest: req, updateTime: nowStamp() }));
        showToast('结束服务申请已提交，等待项目经理与报价员会签');
    }

    function submitEndConfirm() {
        if (!live.endRequest || !roleId) return;
        const me = viewerUserName(role);
        const req: EndRequest = { ...live.endRequest };
        if (roleId === 'pm') { req.pmConfirmed = true; req.pmName = me; req.pmTime = nowStamp(); }
        if (roleId === 'quoter') { req.quoterConfirmed = true; req.quoterName = me; req.quoterTime = nowStamp(); }
        const done = req.pmConfirmed && req.quoterConfirmed;
        setLive((o) => ({ ...o, endRequest: req, status: done ? '已结束' : '待确认', updateTime: nowStamp() }));
        showToast(done ? '双方会签完成，服务已正式结束' : '会签已确认，等待另一方确认');
    }

    function submitAssign(drafter: string) {
        setLive((o) => ({ ...o, assignee: drafter, assigneeRole: 'drafter', currentNode: 'deepen', needAssign: false, updateTime: nowStamp() }));
        showToast(`已指派 ${drafter}，节点推进至图纸深化`);
    }

    function advance(node: NodeId, role2: RoleId) {
        setLive((o) => ({
            ...o,
            currentNode: node,
            assigneeRole: role2,
            assignee: workUsersForRole(role2)[0]?.name ?? roleLabel(role2),
            updateTime: nowStamp(),
        }));
    }

    // 施工扣减：合同确认清单为基数，逐行填写本次完成量并累计
    const confirmedWorkloads = orderConfirmedWorkloads(live);
    const plannedVolume = workloadVolume(confirmedWorkloads);
    const doneVolume = workloadVolume(constructionDone);
    const constructionPercent = plannedVolume > 0 ? Math.min(100, Math.round((doneVolume / plannedVolume) * 100)) : 0;
    const remainingOf = (i: number) => {
        const p = confirmedWorkloads[i];
        const d = constructionDone[i] ?? { fresh: 0, remove: 0, move: 0 };
        return {
            fresh: Math.max(0, p.fresh - d.fresh),
            remove: Math.max(0, p.remove - d.remove),
            move: Math.max(0, p.move - d.move),
        };
    };
    const setDeduct = (i: number, key: 'fresh' | 'remove' | 'move', value: string) => {
        setDeductInputs((prev) => ({ ...prev, [i]: { ...(prev[i] ?? { fresh: '', remove: '', move: '' }), [key]: value } }));
    };
    function submitConstruction() {
        const next = confirmedWorkloads.map((p, i) => {
            const base = constructionDone[i] ?? { fresh: 0, remove: 0, move: 0 };
            const input = deductInputs[i];
            const remain = remainingOf(i);
            const add = (v: string | undefined, remainValue: number) => {
                const n = Number(v);
                return isFinite(n) && n > 0 ? Math.min(remainValue, n) : 0;
            };
            return {
                system: p.system,
                component: p.component,
                fresh: base.fresh + add(input?.fresh, remain.fresh),
                remove: base.remove + add(input?.remove, remain.remove),
                move: base.move + add(input?.move, remain.move),
            };
        });
        const total = workloadVolume(confirmedWorkloads);
        const done = workloadVolume(next);
        const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
        setConstructionDone(next);
        setDeductInputs({});
        // 施工进度持久化到服务单：补签回退后回流时保留已更新进度
        const updated: Order = { ...live, constructionDone: next };
        if (pct >= 100) {
            const r = resolveAdvance(updated);
            if (r) {
                setLive((o) => ({ ...o, constructionDone: next, ...r.patch, updateTime: nowStamp() }));
                showToast(r.returned ? `施工已完成，已自动回到「${nodeLabel(r.next)}」，原处置进度保留` : `施工进度已达 100%，节点推进至「${nodeLabel(r.next)}」`);
            } else {
                setLive((o) => ({ ...o, constructionDone: next, updateTime: nowStamp() }));
                showToast('施工进度已达 100%，施工节点完成');
            }
        } else {
            setLive((o) => ({ ...o, constructionDone: next }));
            showToast(`施工量已更新，施工进度 ${pct}%（剩余 ${total - done} 点位）`);
        }
    }

    const pendingForMe = !!live.endRequest && roleId !== null && (
        (roleId === 'pm' && !live.endRequest.pmConfirmed) || (roleId === 'quoter' && !live.endRequest.quoterConfirmed)
    );
    // 节点文件按节点状态展示：已完成、当前节点与待回办节点均展示
    const fileNodes = nodes.filter((n) => {
        const st = nodeState(live, n.id);
        return st !== 'todo';
    });
    const serviceProgress = live.currentNode === 'collection' ? '服务支线已完结' : `当前 ${Math.max(curIdx + 1, 0)} / ${nodePath.length}`;

    const actionButtons = (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {acts.map((a) => (
                <button
                    key={a.label}
                    className={`btn ${a.weak ? 'btn-end-service' : a.primary ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => fire(a.kind)}
                >
                    {a.label}
                </button>
            ))}
            {role === 'admin' && acts.length === 0 && <span className="readonly-hint"><ShieldAlert size={14} /> 系统管理员只读，切换角色可执行节点操作</span>}
            <button className="btn btn-ghost" onClick={() => nav.go('order-list')}><ChevronLeft size={16} /> 返回列表</button>
        </div>
    );

    return (
        <>
            <AdminShell
                nav={nav}
                page="order-list"
                crumb={['服务单管理', live.id]}
                title={`服务单 ${live.id}`}
                sub={`当前节点：${nodeLabel(live.currentNode)} · 处理人 ${live.assignee}（${roleLabel(live.assigneeRole)}）`}
                actions={actionButtons}
            >
                {/* 状态与主流程 */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 600 }}>{live.id}</span>
                            <StatusTag status={live.status} role={role} assigneeRole={live.assigneeRole} />
                            <div className="tag-chips">
                                {orderTags(role, live).map((t) => <span key={t.label} className={`tag-chip ${t.tone}`}>{t.label}</span>)}
                            </div>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>更新时间 {live.updateTime}</span>
                    </div>
                    <ProgressSteps order={live} />
                    {live.rollback && (
                        <div className="banner" style={{ marginTop: 12, background: '#fff7e6', border: '1px solid #ffd591' }}>
                            <span className="bn-icon" style={{ color: '#d46b08' }}><RefreshCw size={18} /></span>
                            <div className="bn-main">
                                <div className="bn-title" style={{ color: '#d46b08' }}>补签回退中</div>
                                <div className="bn-sub">
                                    服务单已回退至「{nodeLabel(live.rollback.insertedNodes[0])}」；{live.rollback.insertedNodes.map(nodeLabel).join(' → ')} 完成后将自动回到「{nodeLabel(live.rollback.returnNode)}」，原处置进度保留。
                                </div>
                                <div className="bn-sub" style={{ marginTop: 4, color: 'var(--text-3)' }}>
                                    补签合同：{live.rollback.contractType} · 新增节点处置人：{live.rollback.handlerAssignee} · {live.rollback.time}
                                </div>
                            </div>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                        <span>服务支线：{nodePath.length} 个节点 · {serviceProgress}</span>
                        <span>合同收款：{contracts.length === 0 ? '合同待确认' : collection.total === collection.done ? '全部合同已收讫' : `${collection.done} / ${collection.total} 份合同收讫 · 平均 ${collection.ratio}%`}</span>
                    </div>
                </div>

                {/* 评估指派提示 */}
                {live.currentNode === 'assign' && isOrderActive(live) && (
                    <div className="banner info">
                        <span className="bn-icon"><Info size={18} /></span>
                        <div className="bn-main">
                            <div className="bn-title">{isSharedPoolOrder(live) ? '该项目未配置跟进人员，工单已进入共享池' : '工单待项目经理评估指派'}</div>
                            <div className="bn-sub">
                                全体项目经理可在共享池中评估并指派绘图员；已配置跟进人员的项目下单后自动流转至绘图员，无需评估。
                                {isSharedPoolOrder(live) && (role === 'admin' || role === 'pm') ? ' 当前角色可执行分派。' : ''}
                            </div>
                        </div>
                    </div>
                )}

                {/* 结束服务会签提示 */}
                {live.endRequest && (
                    <div className={`banner ${live.status === '已结束' ? 'purple' : 'danger'}`}>
                        <span className="bn-icon"><AlertTriangle size={18} /></span>
                        <div className="bn-main">
                            <div className="bn-title">
                                结束服务{live.status === '已结束' ? '已完成' : '会签中'}
                                <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 8, fontSize: 12 }}>
                                    发起人 {live.endRequest.initiator}（{roleLabel(live.endRequest.initiatorRole)}） · {live.endRequest.time}
                                </span>
                            </div>
                            <div className="bn-sub">结束原因：{live.endRequest.reason}</div>
                            <div className="sign-row">
                                <span className={`sign-item ${live.endRequest.pmConfirmed ? 'is-done' : ''}`}>
                                    <span className="sign-dot" /> 项目经理会签 {live.endRequest.pmConfirmed ? `已确认 · ${live.endRequest.pmTime ?? ''}` : '待确认'}
                                </span>
                                <span className={`sign-item ${live.endRequest.quoterConfirmed ? 'is-done' : ''}`}>
                                    <span className="sign-dot" /> 报价员会签 {live.endRequest.quoterConfirmed ? `已确认 · ${live.endRequest.quoterTime ?? ''}` : '待确认'}
                                </span>
                                {pendingForMe && <span className="badge red">待我会签</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* 金额脱敏提示 */}
                {contracts.length > 0 && !showAmount && (
                    <div className="banner warn">
                        <span className="bn-icon"><AlertTriangle size={18} /></span>
                        <div className="bn-main">
                            <div className="bn-title">合同金额已脱敏</div>
                            <div className="bn-sub">仅财务视图与报价员确认合同表单可查看完整金额；收款比例对所有员工可见。切换右上角角色为「财务人员」可查看金额。</div>
                        </div>
                    </div>
                )}

                {/* 基础信息 */}
                <div className="card">
                    <div className="card-title"><span>基础信息</span></div>
                    <div className="info-list">
                        <div className="info-row"><span className="ir-k">所属项目</span><span className="ir-v">{live.project}</span></div>
                        <div className="info-row"><span className="ir-k">施工位置</span><span className="ir-v">{live.location}</span></div>
                        <div className="info-row"><span className="ir-k">施工面积</span><span className="ir-v">{live.area}㎡</span></div>
                        <div className="info-row"><span className="ir-k">客户</span><span className="ir-v">{live.customer}（{live.phone ?? '—'}）</span></div>
                        <div className="info-row"><span className="ir-k">服务项</span><span className="ir-v">{serviceScope(live)}</span></div>
                        <div className="info-row"><span className="ir-k">当前处理人</span><span className="ir-v">{live.assignee}（{roleLabel(live.assigneeRole)}）</span></div>
                        <div className="info-row"><span className="ir-k">创建时间</span><span className="ir-v">{live.createTime}</span></div>
                        <div className="info-row"><span className="ir-k">合同与收款</span><span className="ir-v">{contracts.length === 0 ? '合同待确认' : `${contracts.length} 份合同 · 收款 ${collection.ratio}%`}</span></div>
                    </div>
                </div>

                {/* 施工工作量 */}
                {hasConstructionContract(live) && (['construction', 'declare', 'acceptance', 'collection'].includes(live.currentNode) || live.status === '已完成') && (
                    <div className="card">
                        <div className="card-title">
                            <span>施工工作量</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>按合同确认清单逐行扣减</span>
                        </div>
                        <div className="collection-line" style={{ marginTop: 0 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>施工进度</span>
                            <div className={`collection-bar ${constructionPercent >= 100 ? 'done' : ''}`}><i style={{ width: `${constructionPercent}%` }} /></div>
                            <span className="collection-pct">{constructionPercent}%</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 12px' }}>
                            合同确认 {plannedVolume} 点位 · 已完成 {doneVolume} 点位；施工进度达 100% 后施工节点完成
                        </div>
                        <WorkloadTable items={confirmedWorkloads} />
                    </div>
                )}

                {/* 合同与收款 */}
                <div className="card">
                    <div className="card-title">
                        <span>合同与收款</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>合同可两次签订（仅施工 / 仅代办） · 收款为并行支线</span>
                    </div>
                    {contracts.length === 0 ? (
                        <div className="empty" style={{ padding: '28px 16px' }}>
                            <FileText size={22} />
                            <span>合同尚未确认。报价员确认合同后，系统按合同服务项生成审图 / 施工 / 申报 / 验收节点。</span>
                        </div>
                    ) : contracts.map((c, i) => {
                        const ratio = contractRatio(c);
                        const received = c.collections.reduce((s, r) => s + r.amount, 0);
                        return (
                            <div className="contract-card" key={c.id}>
                                <div className="cc-head">
                                    <div className="cc-title">
                                        合同 {i + 1} · {c.type}
                                        <span className={`tag-chip ${ratio >= 100 ? 'green' : 'orange'}`}>{ratio >= 100 ? '已收讫' : '收款中'}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{c.signedTime} · {c.submitter} 提交</span>
                                </div>
                                <div className="cc-rows">
                                    <div className="cc-row"><span className="cc-k">合同总价</span><span className="cc-v">{c.totalPrice ? (showAmount ? formatMoney(c.totalPrice) : <span className="cc-mask">总价已脱敏</span>) : '未填写（选填）'}</span></div>
                                    <div className="cc-row"><span className="cc-k">累计已收款</span><span className="cc-v">{showAmount ? formatMoney(received) : <span className="cc-mask">金额已脱敏</span>}</span></div>
                                    <div className="cc-row"><span className="cc-k">工作量确认</span><span className="cc-v">{c.workloadMode}</span></div>
                                    <div className="cc-row"><span className="cc-k">工作量清单</span><span className="cc-v">{c.workloads?.length ? `${c.workloads.length} 项 · 共 ${workloadVolume(c.workloads)} 点位` : '—'}</span></div>
                                    <div className="cc-row"><span className="cc-k">深化图纸附件</span><span className="cc-v">{c.drawingAttachments?.join('、') ?? '—'}</span></div>
                                    <div className="cc-row"><span className="cc-k">工作量清单附件</span><span className="cc-v">{c.workloadAttachments?.join('、') ?? '—'}</span></div>
                                    <div className="cc-row"><span className="cc-k">下一节点接收</span><span className="cc-v">{roleLabel(c.receiverRole)} · {c.receiverName}</span></div>
                                    <div className="cc-row"><span className="cc-k">合同附件</span><span className="cc-v">{c.attachments.join('、')}</span></div>
                                    <div className="cc-row"><span className="cc-k">报价单</span><span className="cc-v">{c.quoteAttachments.join('、')}</span></div>
                                    {c.remark && <div className="cc-row" style={{ gridColumn: '1 / -1' }}><span className="cc-k">备注</span><span className="cc-v">{c.remark}</span></div>}
                                </div>
                                <div className="collection-line">
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>收款进度</span>
                                    <div className={`collection-bar ${ratio >= 100 ? 'done' : ''}`}><i style={{ width: `${Math.min(ratio, 100)}%` }} /></div>
                                    <span className="collection-pct">{ratio}%</span>
                                </div>
                                {c.collections.length > 0 && (
                                    <div className="collection-log">
                                        {c.collections.map((r, idx) => (
                                            <div key={idx}>
                                                {r.time} · {showAmount ? formatMoney(r.amount) : '金额已脱敏'} · 累计 {r.ratio}% · {r.by}{r.note ? ` · ${r.note}` : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 节点文件 */}
                <div className="card">
                    <div className="card-title"><span>节点文件（{fileNodes.length}）</span></div>
                    {fileNodes.length === 0 ? (
                        <div className="empty">暂无已提交节点文件</div>
                    ) : fileNodes.map((n) => {
                        const sub = nodeSubmission(live, n.id, role);
                        return (
                            <div className="submission" key={n.id}>
                                <div className="sb-head">
                                    <FileText size={15} color="#1677ff" />
                                    <span style={{ fontWeight: 600 }}>{n.label}</span>
                                    <span className="sb-version">{sub.version}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>提交人 {sub.submitter}</span>
                                    <span className="sb-time">{sub.time}</span>
                                </div>
                                {sub.formRecords.length > 0 && (
                                    <div className="sb-forms">
                                        {sub.formRecords.map((f, i) => (
                                            <div className="sb-form" key={i}>
                                                <span className="sf-k">{f.label}</span>
                                                <span className="sf-v">{f.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sub.attachments.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                        {sub.attachments.map((a) => (
                                            <span className="file-chip" key={a} style={{ padding: '6px 10px' }}>
                                                <FileText size={14} color="#1677ff" />
                                                <span className="fc-name">{a}</span>
                                                <Download size={13} color="#999" />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* 操作历史 */}
                <div className="card">
                    <div className="card-title"><span>操作历史</span></div>
                    <div className="alert-list">
                        <div className="alert-item">
                            <span className="al-dot" style={{ background: 'var(--brand)' }} />
                            <div className="al-main">
                                <div className="al-title">服务单创建</div>
                                <div className="al-sub">{live.createTime} · 客户 {live.customer}</div>
                            </div>
                        </div>
                        {contracts.map((c) => (
                            <div className="alert-item" key={`c-${c.id}`}>
                                <span className="al-dot" style={{ background: 'var(--success)' }} />
                                <div className="al-main">
                                    <div className="al-title">合同确认 · {c.type}</div>
                                    <div className="al-sub">{c.signedTime} · 提交人 {c.submitter} · 下一节点 {roleLabel(c.receiverRole)}</div>
                                </div>
                            </div>
                        ))}
                        {contracts.flatMap((c) => c.collections.map((r, i) => (
                            <div className="alert-item" key={`r-${c.id}-${i}`}>
                                <span className="al-dot" style={{ background: 'var(--brand)' }} />
                                <div className="al-main">
                                    <div className="al-title">合同收款 · {c.type} 累计 {r.ratio}%</div>
                                    <div className="al-sub">{r.time} · {r.by} · {showAmount ? formatMoney(r.amount) : '金额已脱敏'}</div>
                                </div>
                            </div>
                        )))}
                        {live.endRequest && (
                            <div className="alert-item">
                                <span className="al-dot" style={{ background: live.status === '已结束' ? 'var(--purple)' : 'var(--error)' }} />
                                <div className="al-main">
                                    <div className="al-title">结束服务申请 · {live.status === '已结束' ? '已完成会签' : '会签中'}</div>
                                    <div className="al-sub">{live.endRequest.time} · 发起人 {live.endRequest.initiator} · {live.endRequest.reason}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </AdminShell>

            {/* 评估指派 */}
            {modal === 'assign' && (
                <Modal title="评估并指派" onClose={() => setModal(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setModal(null)}>取消</button>
                        <button className="btn btn-primary" disabled={!surveyTime || !surveyConclusion.trim()} onClick={() => submitAssign(assignDrafter)}>指派并流转</button>
                    </>}>
                    <div className="banner info" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><Info size={16} /></span>
                        <div className="bn-main"><div className="bn-sub">该项目后台未配置跟进人员，客户下单后进入项目经理评估指派节点；请先线下与客户沟通并完成现场勘验，再指派绘图员。</div></div>
                    </div>
                    <Field label="现场勘验时间" required>
                        <input className="f-input" type="datetime-local" value={surveyTime} onChange={(e) => setSurveyTime(e.target.value)} />
                    </Field>
                    <Field label="现场勘验结论" required>
                        <textarea className="f-input" rows={3} placeholder="请输入勘验结论，如现场尺寸、施工条件、是否需补图" value={surveyConclusion} onChange={(e) => setSurveyConclusion(e.target.value)} style={{ resize: 'none' }} />
                    </Field>
                    <Field label="指派绘图员" required hint="可切换为该项目的其他绘图员">
                        <select className="f-input" value={assignDrafter} onChange={(e) => setAssignDrafter(e.target.value)}>
                            {workUsersForRole('drafter').map((u) => <option key={u.id} value={u.name}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>)}
                        </select>
                    </Field>
                    <Field label="指派说明"><input className="f-input" placeholder="选填，如现场需补拍照片" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} /></Field>
                </Modal>
            )}

            {/* 提交图纸 */}
            {modal === 'submit' && (
                <Modal title="提交图纸" onClose={() => setModal(null)} footer={<button className="btn btn-primary" onClick={() => { advance('review', 'pm'); showToast('图纸已提交，节点推进至审核'); }}>提交</button>}>
                    <Field label="深化图纸附件" required><UploadBox label="上传深化图纸 / 计算书" /></Field>
                    <Field label="工作量清单" required hint="按深化图纸拆解的系统-部件点位工作量（新装 / 拆除 / 移位），可动态增删">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {workloads.map((w) => (
                                <div key={w.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                                        <select value={w.system} onChange={(e) => updateWorkload(w.id, { system: e.target.value })} className="f-input" style={{ flex: '1 1 0', minWidth: 0 }}>
                                            {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select value={w.component} onChange={(e) => updateWorkload(w.id, { component: e.target.value })} className="f-input" style={{ flex: '1 1 0', minWidth: 0 }}>
                                            {COMPONENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <button type="button" onClick={() => removeWorkload(w.id)} aria-label="删除" style={{ border: 0, background: 'transparent', color: '#999', cursor: 'pointer', padding: 4, flex: '0 0 auto' }}><X size={16} /></button>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>新装</div>
                                            <input className="f-input" type="number" min={0} value={w.fresh} onChange={(e) => updateWorkload(w.id, { fresh: Number(e.target.value) })} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>拆除</div>
                                            <input className="f-input" type="number" min={0} value={w.remove} onChange={(e) => updateWorkload(w.id, { remove: Number(e.target.value) })} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>移位</div>
                                            <input className="f-input" type="number" min={0} value={w.move} onChange={(e) => updateWorkload(w.id, { move: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" className="btn btn-outline" onClick={addWorkload}><Plus size={15} /> 添加部件</button>
                        </div>
                    </Field>
                    <Field label="工作量清单附件" required hint="上传与上表一致的清单文件，支持 xlsx / pdf"><UploadBox label="上传工作量清单" /></Field>
                    <Field label="备注"><input className="f-input" placeholder="选填" /></Field>
                    <ReceiverSelect role="pm" />
                </Modal>
            )}

            {/* 图纸审核 */}
            {modal === 'review' && (
                <Modal title="图纸审核" onClose={() => setModal(null)}
                    footer={<div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline" onClick={() => setModal('reject')}>驳回</button>
                        <button className="btn btn-primary" onClick={() => { advance('contract', 'quoter'); showToast('审核通过，节点推进至确认合同'); }}>审核通过</button>
                    </div>}>
                    <Field label="深化图纸附件">
                        {REVIEW_FILES.map((f) => (
                            <div className="file-chip" key={f.name}>
                                <FileText size={15} color="#1677ff" />
                                <span className="fc-name">{f.name}</span>
                                <span className="fc-time">{f.size}</span>
                                <Download size={14} color="#999" />
                            </div>
                        ))}
                    </Field>
                    <Field label="工作量清单" hint="按深化图纸拆解的系统-部件点位工作量">
                        <WorkloadTable items={REVIEW_WORKLOADS} />
                    </Field>
                    <Field label="工作量清单附件">
                        <span className="file-chip" style={{ padding: '6px 10px' }}>
                            <FileText size={14} color="#1677ff" />
                            <span className="fc-name">工作量清单.xlsx</span>
                            <Download size={13} color="#999" />
                        </span>
                    </Field>
                    <Field label="绘图员备注"><div style={{ fontSize: 13, color: '#666' }}>按深化结果，喷淋系统新增 24 个喷头、移位 8 个；详见图纸。</div></Field>
                    <ReceiverSelect role="quoter" />
                </Modal>
            )}

            {/* 驳回 */}
            {modal === 'reject' && (
                <Modal title="驳回" onClose={() => setModal(null)} footer={<button className="btn btn-danger" onClick={() => showToast('已驳回，节点退回绘图员')}>确认驳回</button>}>
                    <Field label="驳回意见" required>
                        <textarea className="f-input" rows={4} placeholder="请输入驳回意见" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} style={{ resize: 'none' }} />
                    </Field>
                    <Field label="附件（可选）"><UploadBox label="上传附件" /></Field>
                </Modal>
            )}

            {/* 施工量更新：从合同确认工作量清单逐行扣减，进度 100% 时节点完成 */}
            {modal === 'progress' && (
                <Modal title="更新施工量" onClose={() => setModal(null)} footer={<button className="btn btn-primary" onClick={submitConstruction}>提交并推进</button>}>
                    <div className="banner info" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><ClipboardCheck size={16} /></span>
                        <div className="bn-main"><div className="bn-sub">施工量从合同最终确认的工作量清单中逐行扣减，施工进度达 100% 后施工节点完成并流转至下一节点。</div></div>
                    </div>
                    <Field label="施工时间"><input className="f-input" type="date" /></Field>
                    <Field label="施工进度" hint={`合同确认 ${plannedVolume} 点位 · 已完成 ${doneVolume} 点位`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className={`collection-bar ${constructionPercent >= 100 ? 'done' : ''}`} style={{ flex: 1 }}><i style={{ width: `${constructionPercent}%` }} /></div>
                            <span className="collection-pct">{constructionPercent}%</span>
                        </div>
                    </Field>
                    <Field label="合同确认工作量清单" required hint="填写本次完成量，系统按行累计扣减；施工进度达 100% 后施工节点完成">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {confirmedWorkloads.map((w, i) => {
                                const d = constructionDone[i] ?? { fresh: 0, remove: 0, move: 0 };
                                const remain = remainingOf(i);
                                return (
                                    <div key={`${w.system}-${w.component}-${i}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{w.system} · {w.component}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>剩余 {remain.fresh + remain.remove + remain.move} 点位</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                                            合同量：新装 {w.fresh} · 拆除 {w.remove} · 移位 {w.move}；已完成：新装 {d.fresh} · 拆除 {d.remove} · 移位 {d.move}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {(['fresh', 'remove', 'move'] as const).map((key) => (
                                                <div key={key} style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                                                        {key === 'fresh' ? '本次新装' : key === 'remove' ? '本次拆除' : '本次移位'}（剩 {remain[key]}）
                                                    </div>
                                                    <input
                                                        className="f-input"
                                                        type="number"
                                                        min={0}
                                                        max={remain[key]}
                                                        placeholder="0"
                                                        disabled={remain[key] === 0}
                                                        value={deductInputs[i]?.[key] ?? ''}
                                                        onChange={(e) => setDeduct(i, key, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Field>
                    <Field label="施工说明"><textarea className="f-input" rows={3} placeholder="选填" style={{ resize: 'none' }} /></Field>
                    {!inRollbackChain && <ReceiverSelect role={live.hasDeclare && hasAgencyContract(live) ? 'agent' : 'pm'} />}
                </Modal>
            )}

            {/* 提交验收 */}
            {modal === 'acceptance' && (
                <Modal title="提交验收" onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={() => {
                        const needCollection = orderContracts(live).length > 0 && !orderCollectionDone(live);
                        if (needCollection) { advance('collection', 'finance'); showToast('验收通过，服务支线完结，待合同收款办结'); }
                        else { setLive((o) => ({ ...o, status: '已完成', updateTime: nowStamp() })); showToast('验收通过且合同已收齐，服务单已办结'); }
                    }}>提交验收</button>}>
                    <Field label="验收文件附件" required><UploadBox label="上传验收报告 / 竣工验收单" /></Field>
                    <Field label="验收说明"><textarea className="f-input" rows={3} placeholder="选填" style={{ resize: 'none' }} /></Field>
                    <div className="banner info" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><ClipboardCheck size={16} /></span>
                        <div className="bn-main"><div className="bn-sub">验收完成后服务支线完结；合同收款支线由财务并行跟进，全部合同收款 100% 后服务单最终完成。</div></div>
                    </div>
                </Modal>
            )}

            {/* 代办凭证 */}
            {modal === 'agent' && (
                <Modal title={nodeLabel(live.currentNode)} onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={() => {
                        const r = resolveAdvance(live);
                        if (r) setLive((o) => ({ ...o, ...r.patch, updateTime: nowStamp() }));
                        showToast(r
                            ? (r.returned ? `新增节点已完成，已自动回到「${nodeLabel(r.next)}」，原节点处置进度保留` : `代办凭证已上传，节点推进至「${nodeLabel(r.next)}」`)
                            : '代办凭证已上传');
                    }}>提交凭证</button>}>
                    <Field label="办理结果" required>
                        <select className="f-input" defaultValue={live.currentNode === 'inspect' ? '审图通过' : '申报通过'}>
                            <option>{live.currentNode === 'inspect' ? '审图通过' : '申报通过'}</option>
                            <option>办理中</option>
                            <option>不通过</option>
                        </select>
                    </Field>
                    <Field label="代办凭证" required><UploadBox label={live.currentNode === 'inspect' ? '上传审图意见书' : '上传申报回执'} /></Field>
                    <Field label="备注"><textarea className="f-input" rows={2} placeholder="选填" style={{ resize: 'none' }} /></Field>
                </Modal>
            )}

            {/* 确认合同 / 补签合同 */}
            {modal === 'contract' && (
                <Modal title={live.currentNode === 'contract' ? '确认合同' : '补签合同'} onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={submitContract} disabled={availableContractTypes().length === 0}><Send size={15} /> 提交合同</button>}>
                    <Field label="服务项" required hint="已签订的服务项不可重复；完整合同与单类合同互斥">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {(['仅施工', '仅代办', '完整施工代办'] as ContractType[]).map((t) => {
                                const allowed = availableContractTypes().includes(t);
                                const checked = contractType === t;
                                return (
                                    <button key={t} type="button" disabled={!allowed}
                                        className={`chip ${checked && allowed ? 'is-checked' : ''}`}
                                        style={{ padding: '8px 16px', opacity: allowed ? 1 : 0.4, cursor: allowed ? 'pointer' : 'not-allowed' }}
                                        onClick={() => {
                                            if (!allowed) return;
                                            setContractType(t);
                                            setContractReceiverId(workUsersForRole(receiverRoleFor(t))[0]?.id ?? '');
                                        }}>
                                        {t}{!allowed ? '（已签/不可选）' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>
                    {contractType !== '仅施工' && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            代办内容：{[live.hasInspect ? '代办审图' : '', live.hasDeclare ? '代办申报' : ''].filter(Boolean).join('、') || '—'}（按服务内容自动带出）
                        </div>
                    )}
                    {contractType === '仅代办' ? (
                        <Field label="图纸与工作量">
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>本合同不含施工服务，无需确认工作量；最终深化图纸采用绘图员提交版本。</div>
                        </Field>
                    ) : (
                        <>
                            <Field label="绘图员提交版本">
                                <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{workUsersForRole('drafter')[0]?.name ?? '绘图员'} · V1 · {live.updateTime}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>深化图纸.pdf · 计算书.pdf · 工作量清单.xlsx</div>
                            </Field>
                            <Field label="工作量清单" hint="绘图员按深化图纸拆解的系统-部件点位工作量">
                                <WorkloadTable items={REVIEW_WORKLOADS} />
                            </Field>
                            <Field label="工作量确认" required hint="请确认最终深化图纸及工作量清单是否为绘图员提交版本；合同最终确认的工作量将用于施工节点更新施工量（扣减）">
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <button type="button" className={`chip ${workloadMode === '采用绘图员版本' ? 'is-checked' : ''}`} style={{ padding: '8px 16px' }} onClick={() => setWorkloadMode('采用绘图员版本')}>与绘图员提交版本一致</button>
                                    <button type="button" className={`chip ${workloadMode === '上传最终确认版' ? 'is-checked' : ''}`} style={{ padding: '8px 16px' }} onClick={() => setWorkloadMode('上传最终确认版')}>线下重勘，上传最终确认版</button>
                                </div>
                            </Field>
                            <Field label="深化图纸附件" required>
                                {workloadMode === '采用绘图员版本' ? (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {['深化图纸.pdf', '计算书.pdf'].map((f) => (
                                            <span className="file-chip" key={f} style={{ padding: '6px 10px' }}>
                                                <FileText size={14} color="#1677ff" />
                                                <span className="fc-name">{f}</span>
                                                <Download size={13} color="#999" />
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <UploadBox label="上传最终深化图纸" />
                                )}
                            </Field>
                            <Field label="工作量清单附件" required>
                                {workloadMode === '采用绘图员版本' ? (
                                    <span className="file-chip" style={{ padding: '6px 10px' }}>
                                        <FileText size={14} color="#1677ff" />
                                        <span className="fc-name">工作量清单.xlsx</span>
                                        <Download size={13} color="#999" />
                                    </span>
                                ) : (
                                    <UploadBox label="上传最终工作量清单（xlsx / pdf）" />
                                )}
                            </Field>
                            {workloadMode === '上传最终确认版' && (
                                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>上传后将更新至绘图员「图纸深化」过程文件，不回流绘图员节点；该版本作为施工节点扣减的基准清单。</div>
                            )}
                        </>
                    )}
                    <Field label="合同总价" hint="非必填，按实际合同需要选填；填写后自动生成大写金额">
                        <input className="f-input" type="number" placeholder="0.00" value={contractTotal} onChange={(e) => setContractTotal(e.target.value)} />
                        <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
                            大写：{contractTotal ? amountToChinese(Number(contractTotal)) : '—'}
                        </div>
                    </Field>
                    <Field label="合同附件上传" required><UploadBox label="上传签章合同" /></Field>
                    <Field label="报价单上传" required><UploadBox label="上传报价单" /></Field>
                    <Field label="备注"><textarea className="f-input" rows={2} placeholder="选填" value={contractRemark} onChange={(e) => setContractRemark(e.target.value)} style={{ resize: 'none' }} /></Field>
                    <ReceiverSelect
                        role={contractReceiverRole}
                        label={live.currentNode === 'contract' ? '下一节点接收用户' : '新增节点处置用户'}
                        value={effectiveContractReceiverId}
                        onChange={setContractReceiverId}
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        下一步流转：本合同{contractType !== '仅施工' ? '包含代办服务，确认后流转至代办人员处理审图/申报' : '仅含施工服务，确认后流转至项目经理处理施工'}（{roleLabel(contractReceiverRole)}）。
                    </div>
                    {live.currentNode !== 'contract' && (
                        <div className="banner" style={{ padding: '10px 12px', background: supplementPreview.length ? '#fff7e6' : '#f6ffed', border: `1px solid ${supplementPreview.length ? '#ffd591' : '#b7eb8f'}` }}>
                            <span className="bn-icon" style={{ color: supplementPreview.length ? '#d46b08' : '#389e0d' }}><Info size={16} /></span>
                            <div className="bn-main">
                                <div className="bn-sub">
                                    {supplementPreview.length
                                        ? `本次补签新增「${supplementPreview.map(nodeLabel).join('、')}」位于当前节点之前，确认后服务单将回退至「${nodeLabel(supplementPreview[0])}」，完成后自动回到「${nodeLabel(live.currentNode)}」，原节点处置进度保留。`
                                        : '本次补签新增节点位于当前节点之后，确认后按完整流程顺序追加，不回退。'}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="banner info" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><ClipboardCheck size={16} /></span>
                        <div className="bn-main"><div className="bn-sub">确认后生成对应合同收款项目；财务并行跟进实际收付款，可多次更新收款比例，收款 100% 后该合同收款完成。</div></div>
                    </div>
                </Modal>
            )}

            {/* 合同收款：按合同分别填写累计比例，可多次提交 */}
            {modal === 'collection' && (
                <Modal title="合同收款确认" onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={submitCollection}><RefreshCw size={15} /> 提交收款进度</button>}>
                    <div className="banner info" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><ClipboardCheck size={16} /></span>
                        <div className="bn-main"><div className="bn-sub">财务可多次填写累计收款比例；每份合同收款至 100% 后该合同收款完成，全部合同收齐且施工服务完成后服务单最终完成。</div></div>
                    </div>
                    {contracts.map((c, i) => {
                        const ratio = contractRatio(c);
                        const input = collectInputs[c.id] ?? { ratio: String(ratio), amount: '' };
                        return (
                            <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>合同 {i + 1} · {c.type}</span>
                                    <span className={`tag-chip ${ratio >= 100 ? 'green' : 'orange'}`}>{ratio >= 100 ? '已收齐' : `${ratio}%`}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 8px' }}>
                                    {c.id} · {c.totalPrice ? (showAmount ? formatMoney(c.totalPrice) : '合同总价已脱敏') : '合同总价未填写'}
                                </div>
                                <div className={`collection-bar ${ratio >= 100 ? 'done' : ''}`}><i style={{ width: `${Math.min(ratio, 100)}%` }} /></div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                                    <div style={{ flex: 1 }}>
                                        <Field label="本次填写后累计收款比例" required hint="需高于当前比例（0-100）">
                                            <input className="f-input" type="number" min={0} max={100} placeholder={String(ratio)} disabled={ratio >= 100}
                                                value={input.ratio}
                                                onChange={(e) => setCollectInputs((prev) => ({ ...prev, [c.id]: { ...input, ratio: e.target.value } }))} />
                                        </Field>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <Field label="本次收款金额">
                                            <input className="f-input" type="number" placeholder="选填" disabled={ratio >= 100}
                                                value={input.amount}
                                                onChange={(e) => setCollectInputs((prev) => ({ ...prev, [c.id]: { ...input, amount: e.target.value } }))} />
                                            <div style={{ fontSize: 11, color: '#999' }}>大写：{input.amount ? amountToChinese(Number(input.amount)) : '—'}</div>
                                        </Field>
                                    </div>
                                </div>
                                {c.collections.length > 0 && (
                                    <div className="collection-log">
                                        {c.collections.map((r, idx) => (
                                            <div key={idx}>
                                                {r.time} · {showAmount ? formatMoney(r.amount) : '金额已脱敏'} · 累计 {r.ratio}% · {r.by}{r.note ? ` · ${r.note}` : ''}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Modal>
            )}

            {/* 结束服务申请 */}
            {modal === 'endApply' && (
                <Modal title="申请结束服务" onClose={() => setModal(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setModal(null)}>取消</button>
                        <button className="btn btn-end-service" disabled={!endReason.trim()} onClick={submitEndApply}>提交结束申请</button>
                    </>}>
                    <div className="banner danger" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><AlertTriangle size={16} /></span>
                        <div className="bn-main">
                            <div className="bn-title">结束服务为重要操作</div>
                            <div className="bn-sub">
                                提交后需项目经理与报价员双方会签；发起方若为项目经理或报价员，默认视为该方已确认，仅需另一方确认。
                            </div>
                        </div>
                    </div>
                    <Field label="结束原因" required>
                        <textarea className="f-input" rows={3} placeholder="请说明结束服务的原因" value={endReason} onChange={(e) => setEndReason(e.target.value)} style={{ resize: 'none' }} />
                    </Field>
                    <Field label="会签确认" hint="项目经理与报价员均需确认；发起方默认确认，另一方由发起人选择">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {role === 'pm' ? (
                                <div className="sign-item is-done"><span className="sign-dot" /> 项目经理 · 发起人默认确认</div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-2)', flex: '0 0 48px' }}>项目经理</span>
                                    <select className="f-input" value={endPmId} onChange={(e) => setEndPmId(e.target.value)}>
                                        {workUsersForRole('pm').map((u) => <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>)}
                                    </select>
                                </div>
                            )}
                            {role === 'quoter' ? (
                                <div className="sign-item is-done"><span className="sign-dot" /> 报价员 · 发起人默认确认</div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 12, color: 'var(--text-2)', flex: '0 0 48px' }}>报价员</span>
                                    <select className="f-input" value={endQuoterId} onChange={(e) => setEndQuoterId(e.target.value)}>
                                        {workUsersForRole('quoter').map((u) => <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </Field>
                </Modal>
            )}

            {/* 结束服务会签 */}
            {modal === 'endConfirm' && live.endRequest && (
                <Modal title="会签确认" onClose={() => setModal(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setModal(null)}>稍后处理</button>
                        <button className="btn btn-primary" onClick={submitEndConfirm}>确认会签</button>
                    </>}>
                    <div className="banner danger" style={{ padding: '10px 12px' }}>
                        <span className="bn-icon"><AlertTriangle size={16} /></span>
                        <div className="bn-main">
                            <div className="bn-title">服务单 {live.id} · {live.location}</div>
                            <div className="bn-sub">发起人 {live.endRequest.initiator}（{roleLabel(live.endRequest.initiatorRole)}） · {live.endRequest.time}</div>
                        </div>
                    </div>
                    <div className="info-list">
                        <div className="info-row"><span className="ir-k">结束原因</span><span className="ir-v">{live.endRequest.reason}</span></div>
                        <div className="info-row"><span className="ir-k">当前节点</span><span className="ir-v">{nodeLabel(live.currentNode)}</span></div>
                        <div className="info-row"><span className="ir-k">项目经理</span><span className="ir-v">{live.endRequest.pmConfirmed ? `已确认 · ${live.endRequest.pmTime ?? ''}` : '待确认'}</span></div>
                        <div className="info-row"><span className="ir-k">报价员</span><span className="ir-v">{live.endRequest.quoterConfirmed ? `已确认 · ${live.endRequest.quoterTime ?? ''}` : '待确认'}</span></div>
                    </div>
                </Modal>
            )}

            {/* 撤回 */}
            {modal === 'withdraw' && (
                <Modal title="确认撤回" onClose={() => setModal(null)}
                    footer={<>
                        <button className="btn btn-outline" onClick={() => setModal(null)}>取消</button>
                        <button className="btn btn-primary" onClick={() => showToast('已撤回，节点回到待处理状态')}>确认撤回</button>
                    </>}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>撤回后节点将回到待处理状态，可重新提交。是否继续？</div>
                </Modal>
            )}

            {toast && (
                <div style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 13, padding: '8px 16px', borderRadius: 999 }}>
                    {toast}
                </div>
            )}
        </>
    );
}
