// 服务单详情模块 + 节点操作弹窗 + 确认合同页
import React, { useEffect, useState } from 'react';
import {
    FileText, Download, Check, X, ChevronDown, Send, FileCheck2, Plus, AlertTriangle, Wallet, RefreshCw,
} from 'lucide-react';
import {
    type AppNav, NavBar, Field, UploadBox, Sheet, ConfirmDialog, ProgressSteps, StatusTag, PhoneStatusBar, ReceiverSelect,
} from '../components';
import {
    visibleNodes, nodeState, nodeLabel, amountToChinese, nodeSubmission, canWithdraw, canCancelService, canEndService, usersForRole,
    orderContracts, contractRatio, orderCollectionDone, orderNeedsCollection, orderServiceDone, needsMoreContracts, orderCollectionProgress,
    roleLabel, canViewContractAmount, isActiveOrder, supplementRollbackNodes, completedBeforeCurrent, resolveAdvance, hasConstructionContract,
    orderConfirmedWorkloads, orderConstructionDone, workloadVolume,
    type Order, type RoleId, type ContractType, type ContractRecord, type WorkloadItem,
} from '../data';

// 工作量清单：系统-部件结构，绘图员按深化结果动态拆分增删
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

// 图纸审核视图：绘图员已提交的图纸与工作量（示例）
const REVIEW_FILES = [
    { name: '图纸深化-深化图.pdf', size: '2.4 MB' },
    { name: '图纸深化-计算书.pdf', size: '0.8 MB' },
];
const REVIEW_WORKLOADS = [
    { system: '消防喷淋系统', component: '喷头', fresh: 24, remove: 6, move: 8 },
    { system: '消防喷淋系统', component: '管道', fresh: 12, remove: 3, move: 5 },
    { system: '火灾自动报警系统', component: '探测器', fresh: 18, remove: 4, move: 2 },
];

// 工作量清单只读表：绘图员/报价员表单与合同确认统一使用同一结构
function WorkloadTable({ items }: { items: WorkloadItem[] }) {
    return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', background: '#f7f8fa', fontSize: 12, color: '#666', padding: '8px 10px' }}>
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

type ModalKind = 'submit' | 'assign' | 'review' | 'reject' | 'progress' | 'collection' | 'accept' | 'agent' | 'withdraw' | 'cancel' | 'end' | 'sign' | null;

interface Action { label: string; kind: ModalKind | 'contract' | 'accept' | 'agent'; primary?: boolean; danger?: boolean; }

function roleActions(role: RoleId, order: Order): Action[] {
    if (!isActiveOrder(order)) return [];
    const n = order.currentNode;
    switch (role) {
        case 'drafter':
            return n === 'deepen'
                ? [{ label: '提交图纸', kind: 'submit', primary: true }]
                : [];
        case 'pm':
            if (n === 'assign') return [{ label: '评估并指派', kind: 'assign', primary: true }];
            if (n === 'review') return [{ label: '审核', kind: 'review', primary: true }];
            if (n === 'construction') return [{ label: '更新施工量', kind: 'progress', primary: true }];
            if (n === 'acceptance') return [{ label: '提交验收', kind: 'accept', primary: true }];
            return [];
        case 'quoter':
            // 「确认合同」可进行两次：首次签订，或在服务进行中补充另一类服务合同
            if (n === 'contract') {
                return [{ label: orderContracts(order).length ? '继续确认合同' : '确认合同', kind: 'contract', primary: true }];
            }
            return [];
        case 'finance':
            if (n === 'collection') return [{ label: '更新收款进度', kind: 'collection', primary: true }];
            return [];
        case 'agent':
            return (n === 'inspect' || n === 'declare') ? [{ label: '上传代办凭证', kind: 'agent', primary: true }] : [];
        default:
            return [];
    }
}

export function OrderDetail({ nav, order }: { nav: AppNav; order: Order }) {
    const [modal, setModal] = useState<ModalKind>(null);
    const [toast, setToast] = useState('');
    const [workloads, setWorkloads] = useState<Workload[]>([
        { id: 1, system: '消防喷淋系统', component: '喷头', fresh: 24, remove: 6, move: 8 },
        { id: 2, system: '火灾自动报警系统', component: '探测器', fresh: 18, remove: 4, move: 2 },
    ]);
    const [nextWid, setNextWid] = useState(3);
    const [openNode, setOpenNode] = useState<string | null>(order.currentNode);
    // 施工扣减：以合同最终确认的工作量清单为基数，逐行累计已完量
    const confirmedWorkloads = orderConfirmedWorkloads(order);
    const [constructionDone, setConstructionDone] = useState<WorkloadItem[]>(orderConstructionDone(order));
    const [deductInputs, setDeductInputs] = useState<Record<number, { fresh: string; remove: string; move: string }>>({});
    useEffect(() => {
        setConstructionDone(orderConstructionDone(order));
        setDeductInputs({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order.id]);
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
    const submitConstruction = () => {
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
        const updated: Order = { ...order, constructionDone: next };
        const r = pct >= 100 ? resolveAdvance(updated) : null;
        nav.updateOrder({ constructionDone: next, ...(r?.patch ?? {}) });
        showToast(
            r
                ? (r.returned ? `施工已完成，已自动回到「${nodeLabel(r.next)}」，原节点进度保留` : `施工进度已达 100%，节点推进至「${nodeLabel(r.next)}」`)
                : (pct >= 100 ? '施工进度已达 100%，施工节点完成' : `施工量已更新，施工进度 ${pct}%`)
        );
    };
    const submitAcceptance = () => {
        const r = resolveAdvance(order);
        if (r) nav.updateOrder(r.patch);
        showToast(r ? (r.returned ? `验收已提交，已自动回到「${nodeLabel(r.next)}」` : `验收已提交，节点推进至「${nodeLabel(r.next)}」`) : '验收已提交，服务支线已完结');
    };
    const submitAgent = () => {
        const r = resolveAdvance(order);
        if (!r) {
            showToast('代办凭证已上传');
            return;
        }
        nav.updateOrder(r.patch);
        showToast(r.returned
            ? `新增节点已完成，已自动回到「${nodeLabel(r.next)}」，原节点处置进度保留`
            : `凭证已上传，节点推进至「${nodeLabel(r.next)}」`);
    };
    const req = order.endRequest;
    const [endReason, setEndReason] = useState('');
    const [endPmId, setEndPmId] = useState(usersForRole('pm')[0]?.id ?? '');
    const [endQuoterId, setEndQuoterId] = useState(usersForRole('quoter')[0]?.id ?? '');
    const [surveyTime, setSurveyTime] = useState('');
    const [surveyNote, setSurveyNote] = useState('');
    const [assignDrafterId, setAssignDrafterId] = useState(usersForRole('drafter')[0]?.id ?? '');
    const [assignNote, setAssignNote] = useState('');

    const addWorkload = () => {
        setWorkloads((prev) => [...prev, { id: nextWid, system: SYSTEM_OPTIONS[0], component: COMPONENT_OPTIONS[0], fresh: 0, remove: 0, move: 0 }]);
        setNextWid((n) => n + 1);
    };
    const updateWorkload = (id: number, patch: Partial<Workload>) => {
        setWorkloads((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    };
    const removeWorkload = (id: number) => {
        setWorkloads((prev) => prev.filter((w) => w.id !== id));
    };
    const actions = roleActions(nav.role, order);
    const canWd = canWithdraw(nav.role, order);
    const canCancel = canCancelService(nav.role, order);
    const canEnd = canEndService(nav.role, order);
    const nodes = visibleNodes(order);
    const isStaff = nav.role !== 'customer';
    const contracts = orderContracts(order);
    const showAmount = canViewContractAmount(nav.role);
    const collectionDone = orderCollectionDone(order);
    const collectionProgress = orderCollectionProgress(order);
    const serviceDone = orderServiceDone(order);
    // 报价员补充签订另一类服务合同；财务并行跟进收款，均不改变当前服务节点
    const canConfirmMore = nav.role === 'quoter' && order.currentNode !== 'contract' && needsMoreContracts(order);
    const canCollect = nav.role === 'finance' && order.currentNode !== 'collection' && orderNeedsCollection(order);
    const collectionParallel = contracts.length > 0 && !collectionDone && !serviceDone && isActiveOrder(order);
    // 回退链内不选下一节点处理人：处置人已由报价员确认合同时指定
    const inRollbackChain = !!order.rollback && order.rollback.insertedNodes.includes(order.currentNode);
    // 会签：当前用户为项目经理/报价员且自身尚未确认
    const needSign = !!req && (nav.role === 'pm' || nav.role === 'quoter') &&
        (nav.role === 'pm' ? !req.pmConfirmed : !req.quoterConfirmed);
    const showBottom = actions.length > 0 || canWd || canCancel || canEnd || needSign || canConfirmMore || canCollect;

    const fire = (kind: ModalKind | 'contract' | 'accept' | 'agent') => {
        if (kind === 'contract') { nav.go('contract-confirm'); return; }
        if (kind === 'accept') { setModal('accept'); return; }
        if (kind === 'progress') setDeductInputs({});
        setModal(kind);
    };

    const showToast = (msg: string) => { setModal(null); setToast(msg); };

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="服务单详情" onBack={() => nav.go('order-list')} />
            <div className="page-body">
                <div className="detail-head">
                    <div className="dh-id">
                        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{order.id}</span>
                        <StatusTag status={order.status} role={nav.role} assigneeRole={order.assigneeRole} />
                        {nav.role === 'finance' && contracts.length > 0 && (
                            <span className={`collect-badge${collectionDone ? ' is-done' : ''}`}>{collectionDone ? '已收讫' : '待收款'}</span>
                        )}
                    </div>
                    <div className="dh-title">{order.location}</div>
                    <div className="dh-sub">项目：{order.project} · {order.projectType}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                        当前节点：<span style={{ color: 'var(--brand)', fontWeight: 600 }}>{nodeLabel(order.currentNode)}</span>
                        {collectionParallel ? <span style={{ color: '#c47f17', fontWeight: 600 }}> · 合同收款并行中</span> : null}
                        {' '}· 负责人 {order.assignee}
                    </div>
                </div>

                {order.rollback && (
                    <div className="rollback-banner">
                        <div className="rb-head"><RefreshCw size={16} /><span>补签回退中</span></div>
                        <div className="rb-text">
                            服务单已回退至「{nodeLabel(order.rollback.insertedNodes[0])}」；
                            {order.rollback.insertedNodes.map(nodeLabel).join(' → ')} 完成后将自动回到「{nodeLabel(order.rollback.returnNode)}」，原处置进度保留。
                        </div>
                        <div className="rb-meta">补签合同：{order.rollback.contractType} · 新增节点处置人：{order.rollback.handlerAssignee} · {order.rollback.time}</div>
                    </div>
                )}

                {order.currentNode === 'assign' && isActiveOrder(order) && (
                    <div className="assign-banner">
                        <div className="ab-head"><AlertTriangle size={16} /><span>{isStaff ? '待项目经理评估指派' : '已收到您的服务需求'}</span></div>
                        {isStaff ? (
                            <>
                                <div className="ab-text">客户下单的项目未收录于项目库，服务单在全体项目经理待办中可见。请线下与客户沟通并完成现场勘验后，指派绘图员进入正常流转。</div>
                                <div className="ab-meta">项目：{order.project} · 客户：{order.customer} · 提交：{order.createTime}</div>
                            </>
                        ) : (
                            <div className="ab-text">项目经理将尽快与您联系，安排现场勘验后指派服务人员，请保持电话畅通。</div>
                        )}
                    </div>
                )}

                {req && (
                    <div className={`end-banner ${order.status === '已结束' ? 'is-ended' : 'is-pending'}`}>
                        <div className="eb-head">
                            {order.status === '已结束' ? <FileCheck2 size={16} /> : <AlertTriangle size={16} />}
                            <span>{order.status === '已结束' ? '本次服务已结束' : '结束服务会签中'}</span>
                        </div>
                        <div className="eb-reason">结束原因：{req.reason}</div>
                        <div className="eb-meta">发起人：{req.initiator} · {req.time}</div>
                        <div className="eb-signs">
                            <div className={`eb-sign ${req.pmConfirmed ? 'ok' : 'wait'}`}>
                                <span>项目经理</span>
                                <span>{req.pmConfirmed ? `已确认 · ${req.pmName ?? ''} ${req.pmTime ?? ''}` : '待确认'}</span>
                            </div>
                            <div className={`eb-sign ${req.quoterConfirmed ? 'ok' : 'wait'}`}>
                                <span>报价员</span>
                                <span>{req.quoterConfirmed ? `已确认 · ${req.quoterName ?? ''} ${req.quoterTime ?? ''}` : '待确认'}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="card" style={{ paddingBottom: 10 }}>
                    <div className="section-title"><span>全流程进度</span></div>
                    <ProgressSteps order={order} />
                </div>

                {hasConstructionContract(order) && (
                    <div className="card">
                        <div className="section-title">
                            <span>施工工作量</span>
                            <span className="sh-meta">按合同确认清单扣减</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${constructionPercent}%`, height: '100%', background: constructionPercent >= 100 ? '#52c41a' : 'var(--brand)' }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: constructionPercent >= 100 ? '#52c41a' : 'var(--brand)' }}>{constructionPercent}%</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                            合同确认 {plannedVolume} 点位 · 已完成 {doneVolume} 点位；施工进度达 100% 后施工节点完成
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <WorkloadTable items={confirmedWorkloads} />
                        </div>
                    </div>
                )}

                {contracts.length > 0 && (
                    <div className="card">
                        <div className="section-title">
                            <span>合同与收款</span>
                            <span className="sh-meta">{contracts.length > 1 ? '多合同 · 分别确认' : '单合同收款'}</span>
                        </div>
                        <div className="contract-list">
                            {contracts.map((c, idx) => {
                                const ratio = contractRatio(c);
                                return (
                                    <div className="contract-item" key={c.id}>
                                        <div className="ci-top">
                                            <span className="ci-type">合同 {idx + 1} · {c.type}</span>
                                            <span className={`ci-ratio ${ratio >= 100 ? 'is-done' : ''}`}>{ratio >= 100 ? '已收齐' : `${ratio}%`}</span>
                                        </div>
                                        <div className="ci-meta">{c.id} · 签订 {c.signedTime}</div>
                                        <div className="ci-bar"><span style={{ width: `${ratio}%` }} /></div>
                                        <div className="ci-foot">
                                            <span>{c.totalPrice ? (showAmount ? `总价 ¥${c.totalPrice.toLocaleString()}` : '总价已脱敏') : '总价未填写'}</span>
                                            <span>收款 {c.collections.length} 次</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`collection-banner ${collectionDone ? 'is-done' : serviceDone ? 'is-wait' : 'is-going'}`}>
                            {collectionDone
                                ? (serviceDone ? '施工服务与合同收款均已完成，服务单已办结' : '合同收款已完结，待施工服务完成后服务单办结')
                                : serviceDone
                                    ? `施工服务已完成，待合同收款 100% 后服务单办结（已结清 ${collectionProgress.done}/${collectionProgress.total} 份合同）`
                                    : `合同收款与合同服务并行进行中（已结清 ${collectionProgress.done}/${collectionProgress.total} 份合同）`}
                        </div>
                        {canCollect && (
                            <button className="btn btn-outline btn-block" onClick={() => setModal('collection')}>
                                <Wallet size={15} /> 更新收款进度
                            </button>
                        )}
                    </div>
                )}

                <div className="card">
                    <div className="section-title"><span>基础信息</span></div>
                    <div className="info-list">
                        <div className="info-row"><span className="ir-k">项目名称</span><span className="ir-v">{order.project}</span></div>
                        <div className="info-row"><span className="ir-k">项目类型</span><span className="ir-v">{order.projectType}</span></div>
                        <div className="info-row"><span className="ir-k">施工位置</span><span className="ir-v">{order.location}</span></div>
                        <div className="info-row"><span className="ir-k">施工面积</span><span className="ir-v">{order.area} ㎡</span></div>
                        <div className="info-row"><span className="ir-k">代办服务</span><span className="ir-v">{[order.hasInspect ? '代办审图' : '', order.hasDeclare ? '代办申报' : ''].filter(Boolean).join('、') || '无'}</span></div>
                        {isStaff && (
                            <>
                                <div className="info-row"><span className="ir-k">客户名称</span><span className="ir-v">{order.customer}</span></div>
                                <div className="info-row"><span className="ir-k">联系方式</span><span className="ir-v">{order.phone ?? '—'}</span></div>
                                <div className="info-row"><span className="ir-k">电子邮箱</span><span className="ir-v">{order.email ?? '—'}</span></div>
                            </>
                        )}
                    </div>
                </div>

                <div className="section-title"><span>节点文件</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {nodes.map((n) => {
                        const st = nodeState(order, n.id);
                        const isCurrent = n.id === order.currentNode;
                        const expandable = st === 'done' || (st === 'current' && order.status !== '已终止');
                        const isOpen = openNode === n.id;
                        const sub = st === 'done' ? nodeSubmission(order, n.id, nav.role) : null;
                        return (
                            <div className="node-file" key={n.id}>
                                <div className="nf-head" style={{ cursor: expandable ? 'pointer' : 'default' }} onClick={() => expandable && setOpenNode(isOpen ? null : n.id)}>
                                    <span className={`nf-state ${st}`}>{st === 'done' ? <Check size={11} /> : null}</span>
                                    <span className="nf-title">{n.label}</span>
                                    <span className="nf-meta">
                                        {st === 'returning'
                                            ? `待回办 · 进度保留${n.id === 'construction' ? ` ${constructionPercent}%` : ''}`
                                            : isCurrent ? (order.rollback ? '当前节点 · 补签回退' : '当前节点') : ''}
                                    </span>
                                    {expandable && <ChevronDown size={16} color="#bbb" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flex: '0 0 auto' }} />}
                                </div>
                                {expandable && isOpen && (
                                    <div className="nf-body">
                                        {sub ? (
                                            <>
                                                <div className="nf-meta-line">
                                                    <span>提交用户：{sub.submitter}</span>
                                                    <span>提交时间：{sub.time}</span>
                                                    <span>版本号：{sub.version}</span>
                                                </div>
                                                <div className="nf-form">
                                                    {sub.formRecords.map((r) => (
                                                        <div className="nf-form-row" key={r.label}>
                                                            <span className="nf-form-k">{r.label}</span>
                                                            <span className="nf-form-v">{r.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {sub.attachments.length > 0 && sub.attachments.map((a) => (
                                                    <div className="file-chip" key={a}>
                                                        <FileText size={15} color="#1677ff" />
                                                        <span className="fc-name">{a}</span>
                                                        <Download size={14} color="#999" />
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div style={{ fontSize: 12, color: '#999' }}>等待当前节点负责人处理</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {showBottom && (
                    <div className="bottom-action">
                        {actions.map((a) => (
                            <button key={a.label} className={`btn ${a.danger ? 'btn-danger' : a.primary ? 'btn-primary' : 'btn-outline'}`} onClick={() => fire(a.kind)}>
                                {a.label}
                            </button>
                        ))}
                        {canConfirmMore && (
                            <button className="btn btn-outline" onClick={() => nav.go('contract-confirm')}>
                                继续确认合同
                            </button>
                        )}
                        {canCollect && (
                            <button className="btn btn-outline" onClick={() => setModal('collection')}>
                                <Wallet size={15} /> 更新收款进度
                            </button>
                        )}
                        {needSign && (
                            <button className="btn btn-primary" onClick={() => setModal('sign')}>
                                会签确认
                            </button>
                        )}
                        {canWd && <button className="btn btn-outline" onClick={() => fire('withdraw')}>撤回</button>}
                        {canCancel && <button className="btn btn-danger" onClick={() => fire('cancel')}>取消服务单</button>}
                        {canEnd && (
                            <button className="btn btn-danger-ghost" onClick={() => setModal('end')}>
                                结束服务
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 项目经理评估指派：现场勘验后指派绘图员 */}
            {modal === 'assign' && (
                <Sheet
                    title="评估并指派"
                    onClose={() => setModal(null)}
                    footer={
                        <button
                            className="btn btn-primary"
                            disabled={!surveyNote.trim()}
                            onClick={() => showToast('已指派绘图员，服务单流转至图纸深化')}
                        >
                            指派并流转
                        </button>
                    }
                >
                    <div className="assign-tip">
                        客户下单的自定义项目，请先线下与客户沟通并完成现场勘验，再指派绘图员；指派后服务单进入「图纸深化」，由绘图员正常推进。
                    </div>
                    <Field label="现场勘验时间" required>
                        <input className="f-input" type="datetime-local" value={surveyTime} onChange={(e) => setSurveyTime(e.target.value)} />
                    </Field>
                    <Field label="现场勘验结论" required>
                        <textarea
                            className="f-input"
                            rows={3}
                            placeholder="请输入勘验结论，如现场尺寸、施工条件、是否需补图"
                            style={{ resize: 'none' }}
                            value={surveyNote}
                            onChange={(e) => setSurveyNote(e.target.value)}
                        />
                    </Field>
                    <Field label="指派绘图员" required hint="可切换为该项目的其他绘图员">
                        <select className="f-input" value={assignDrafterId} onChange={(e) => setAssignDrafterId(e.target.value)}>
                            {usersForRole('drafter').map((u) => (
                                <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="指派说明">
                        <input className="f-input" placeholder="选填，如现场需补拍照片" value={assignNote} onChange={(e) => setAssignNote(e.target.value)} />
                    </Field>
                </Sheet>
            )}

            {/* 图纸深化提交 */}
            {modal === 'submit' && (
                <Sheet title="提交图纸" onClose={() => setModal(null)} footer={<button className="btn btn-primary" onClick={() => showToast('提交成功，节点已推进至审核')}>提交</button>}>
                    <Field label="深化图纸附件" required hint="支持 PDF / DWG，可上传多份"><UploadBox label="上传深化图纸" /></Field>
                    <Field label="工作量清单" required hint="按深化图纸拆解的系统-部件点位工作量（新装 / 拆除 / 移位），可动态增删">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {workloads.map((w) => (
                                <div key={w.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                                        <select
                                            value={w.system}
                                            onChange={(e) => updateWorkload(w.id, { system: e.target.value })}
                                            style={{ flex: '1 1 0', minWidth: 0, border: '1px solid var(--border)', borderRadius: 6, padding: '8px', fontSize: 13, background: '#fff', color: '#1f1f1f' }}
                                        >
                                            {SYSTEM_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <select
                                            value={w.component}
                                            onChange={(e) => updateWorkload(w.id, { component: e.target.value })}
                                            style={{ flex: '1 1 0', minWidth: 0, border: '1px solid var(--border)', borderRadius: 6, padding: '8px', fontSize: 13, background: '#fff', color: '#1f1f1f' }}
                                        >
                                            {COMPONENT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <button type="button" onClick={() => removeWorkload(w.id)} aria-label="删除" style={{ border: 0, background: 'transparent', color: '#999', cursor: 'pointer', padding: 4, flex: '0 0 auto' }}>
                                            <X size={16} />
                                        </button>
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
                            <button type="button" className="btn btn-outline btn-block" onClick={addWorkload}>
                                <Plus size={15} /> 添加部件
                            </button>
                        </div>
                    </Field>
                    <Field label="工作量清单附件" required hint="上传与上表一致的清单文件，支持 xlsx / pdf">
                        <UploadBox label="上传工作量清单" />
                    </Field>
                    <Field label="备注"><input className="f-input" placeholder="选填" /></Field>
                    <ReceiverSelect role="pm" />
                </Sheet>
            )}

            {/* 图纸审核 */}
            {modal === 'review' && (
                <Sheet
                    title="图纸审核"
                    onClose={() => setModal(null)}
                    footer={
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal('reject')}>驳回</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => showToast('审核通过，节点已推进至确认合同')}>审核通过</button>
                        </div>
                    }
                >
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
                        <div className="file-chip">
                            <FileText size={15} color="#1677ff" />
                            <span className="fc-name">工作量清单.xlsx</span>
                            <Download size={14} color="#999" />
                        </div>
                    </Field>
                    <Field label="绘图员备注">
                        <div style={{ fontSize: 13, color: '#666' }}>按深化结果，喷淋系统新增 24 个喷头、移位 8 个；详见图纸。</div>
                    </Field>
                    <ReceiverSelect role="quoter" />
                </Sheet>
            )}

            {/* 审核驳回 */}
            {modal === 'reject' && (
                <Sheet title="驳回" onClose={() => setModal(null)} footer={<button className="btn btn-danger" onClick={() => showToast('已驳回，节点退回绘图员')}>确认驳回</button>}>
                    <Field label="驳回意见" required><textarea className="f-input" rows={4} placeholder="请输入驳回意见" style={{ resize: 'none' }} /></Field>
                    <Field label="附件（可选）"><UploadBox label="上传附件" /></Field>
                </Sheet>
            )}

            {/* 施工量更新：从合同确认工作量清单逐行扣减 */}
            {modal === 'progress' && (
                <Sheet title="更新施工量" onClose={() => setModal(null)} footer={<button className="btn btn-primary" onClick={submitConstruction}>提交</button>}>
                    <div className="collection-banner is-going" style={{ marginBottom: 12 }}>
                        施工量从合同最终确认的工作量清单中逐行扣减，施工进度达 100% 后施工节点完成并流转。
                    </div>
                    <Field label="施工时间"><input className="f-input" type="date" /></Field>
                    <Field label="施工进度" hint={`合同确认 ${plannedVolume} 点位 · 已完成 ${doneVolume} 点位`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{ width: `${constructionPercent}%`, height: '100%', background: constructionPercent >= 100 ? '#52c41a' : 'var(--brand)', transition: 'width 0.2s' }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: constructionPercent >= 100 ? '#52c41a' : 'var(--brand)' }}>{constructionPercent}%</span>
                        </div>
                    </Field>
                    <Field label="合同确认工作量清单" required hint="填写本次完成量，系统按行累计扣减，本次完成量不超过剩余量">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {confirmedWorkloads.map((w, i) => {
                                const d = constructionDone[i] ?? { fresh: 0, remove: 0, move: 0 };
                                const remain = remainingOf(i);
                                return (
                                    <div key={`${w.system}-${w.component}-${i}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600 }}>{w.system} · {w.component}</span>
                                            <span style={{ fontSize: 11, color: '#999' }}>剩余 {remain.fresh + remain.remove + remain.move} 点位</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                                            合同量：新装 {w.fresh} · 拆除 {w.remove} · 移位 {w.move}；已完成：新装 {d.fresh} · 拆除 {d.remove} · 移位 {d.move}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {(['fresh', 'remove', 'move'] as const).map((key) => (
                                                <div key={key} style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 11, color: '#999', marginBottom: 4 }}>
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
                    {!inRollbackChain && <ReceiverSelect role={order.hasDeclare ? 'agent' : 'pm'} />}
                </Sheet>
            )}

            {/* 提交验收 */}
            {modal === 'accept' && (
                <Sheet title="提交验收" onClose={() => setModal(null)} footer={<button className="btn btn-primary" onClick={submitAcceptance}>提交验收</button>}>
                    <Field label="验收文件附件" required><UploadBox label="上传验收文件" /></Field>
                    <Field label="验收说明"><textarea className="f-input" rows={3} placeholder="选填" style={{ resize: 'none' }} /></Field>
                    <div className="collection-banner is-going" style={{ marginTop: 12 }}>
                        验收完成后服务支线完结；合同收款支线由财务并行跟进，全部合同收款 100% 后服务单最终完成。
                    </div>
                </Sheet>
            )}

            {/* 代办凭证：上传办理结果与回执 */}
            {modal === 'agent' && (
                <Sheet
                    title={nodeLabel(order.currentNode)}
                    onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={submitAgent}>提交凭证</button>}
                >
                    <Field label="办理结果" required>
                        <select className="f-input" defaultValue={order.currentNode === 'inspect' ? '审图通过' : '申报通过'}>
                            <option>{order.currentNode === 'inspect' ? '审图通过' : '申报通过'}</option>
                            <option>办理中</option>
                            <option>不通过</option>
                        </select>
                    </Field>
                    <Field label="代办凭证" required>
                        <UploadBox label={order.currentNode === 'inspect' ? '上传审图意见书' : '上传申报回执'} />
                    </Field>
                    <Field label="备注">
                        <textarea className="f-input" rows={2} placeholder="选填" style={{ resize: 'none' }} />
                    </Field>
                </Sheet>
            )}

            {/* 合同收款：可多次填写累计收款比例，多合同分别确认 */}
            {modal === 'collection' && (
                <Sheet
                    title="合同收款确认"
                    onClose={() => setModal(null)}
                    footer={
                        <button className="btn btn-primary" onClick={() => showToast('收款进度已更新，合同收款支线同步刷新')}>
                            <RefreshCw size={15} /> 提交收款进度
                        </button>
                    }
                >
                    <div className="collection-tip">
                        财务可多次填写累计收款比例；每份合同收款至 100% 后该合同收款完成。全部合同收齐且施工服务完成后，服务单最终完成。
                        {contracts.length > 1 ? ' 当前为多合同收款，按合同分别确认。' : ' 当前为单合同收款。'}
                    </div>
                    {contracts.map((c, idx) => {
                        const ratio = contractRatio(c);
                        return (
                            <div className="collection-item" key={c.id}>
                                <div className="ci-top">
                                    <span className="ci-type">合同 {idx + 1} · {c.type}</span>
                                    <span className={`ci-ratio ${ratio >= 100 ? 'is-done' : ''}`}>{ratio >= 100 ? '已收齐' : `${ratio}%`}</span>
                                </div>
                                <div className="ci-meta">
                                    {c.id} · {c.totalPrice ? (showAmount ? `合同总价 ¥${c.totalPrice.toLocaleString()}` : '合同总价已脱敏') : '合同总价未填写'}
                                </div>
                                <div className="ci-bar"><span style={{ width: `${ratio}%` }} /></div>
                                <Field label="本次填写后累计收款比例" required>
                                    <input className="f-input" type="number" min={0} max={100} defaultValue={ratio} placeholder="0-100" />
                                </Field>
                                <Field label="本次收款金额">
                                    <input className="f-input" type="number" placeholder="选填" />
                                </Field>
                                {c.collections.length > 0 && (
                                    <div className="collection-history">
                                        {c.collections.map((r, i) => (
                                            <div className="ch-row" key={i}>
                                                <span>{r.time}</span>
                                                <span>{showAmount ? `¥${r.amount.toLocaleString()} · 累计 ${r.ratio}%` : `累计收款 ${r.ratio}%`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </Sheet>
            )}

            {/* 撤回确认 */}
            {modal === 'withdraw' && (
                <ConfirmDialog title="确认撤回" body="撤回后节点将回到待处理状态，可重新提交。是否继续？" confirmText="确认撤回" onConfirm={() => showToast('已撤回')} onCancel={() => setModal(null)} />
            )}

            {/* 取消服务单确认 */}
            {modal === 'cancel' && (
                <ConfirmDialog title="取消服务单" body="取消后服务单将终止，不可恢复。是否继续？" confirmText="确认取消" onConfirm={() => showToast('服务单已取消')} onCancel={() => setModal(null)} />
            )}

            {/* 结束服务（弱化的危险操作）：填写原因 + 选择会签人 */}
            {modal === 'end' && (
                <Sheet
                    title="结束服务"
                    onClose={() => setModal(null)}
                    footer={
                        <button
                            className="btn btn-danger-ghost"
                            disabled={!endReason.trim()}
                            onClick={() => showToast('结束申请已提交，等待项目经理与报价员会签')}
                        >
                            提交结束申请
                        </button>
                    }
                >
                    <div className="end-tip">
                        提交后服务单进入「待确认」，需项目经理与报价员会签确认，全部确认后结束本次服务并生成服务记录。
                    </div>
                    <Field label="结束原因" required>
                        <textarea
                            className="f-input"
                            rows={4}
                            placeholder="请说明结束本次服务的原因"
                            style={{ resize: 'none' }}
                            value={endReason}
                            onChange={(e) => setEndReason(e.target.value)}
                        />
                    </Field>
                    <Field label="会签确认" hint="项目经理与报价员均需确认">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {nav.role === 'pm' ? (
                                <div className="sign-role self">
                                    <span>项目经理</span>
                                    <span>发起人默认确认</span>
                                </div>
                            ) : (
                                <div className="sign-role">
                                    <span>项目经理</span>
                                    <select className="f-input" value={endPmId} onChange={(e) => setEndPmId(e.target.value)}>
                                        {usersForRole('pm').map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {nav.role === 'quoter' ? (
                                <div className="sign-role self">
                                    <span>报价员</span>
                                    <span>发起人默认确认</span>
                                </div>
                            ) : (
                                <div className="sign-role">
                                    <span>报价员</span>
                                    <select className="f-input" value={endQuoterId} onChange={(e) => setEndQuoterId(e.target.value)}>
                                        {usersForRole('quoter').map((u) => (
                                            <option key={u.id} value={u.id}>{u.name}{u.dept ? ` · ${u.dept}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </Field>
                </Sheet>
            )}

            {/* 会签确认 */}
            {modal === 'sign' && req && (
                <Sheet
                    title="会签确认"
                    onClose={() => setModal(null)}
                    footer={<button className="btn btn-primary" onClick={() => showToast('会签已确认')}>确认会签</button>}
                >
                    <div className="end-tip">
                        项目经理与报价员均确认后，本次服务结束并生成服务记录。
                    </div>
                    <Field label="结束原因">
                        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{req.reason}</div>
                    </Field>
                    <Field label="发起信息">
                        <div style={{ fontSize: 13, color: '#666' }}>{req.initiator} · {req.time}</div>
                    </Field>
                    <Field label="会签进度">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div className={`sign-role ${req.pmConfirmed ? 'ok' : 'wait'}`}>
                                <span>项目经理</span>
                                <span>{req.pmConfirmed ? `已确认 · ${req.pmName ?? ''}` : '待确认'}</span>
                            </div>
                            <div className={`sign-role ${req.quoterConfirmed ? 'ok' : 'wait'}`}>
                                <span>报价员</span>
                                <span>{req.quoterConfirmed ? `已确认 · ${req.quoterName ?? ''}` : '待确认'}</span>
                            </div>
                        </div>
                    </Field>
                </Sheet>
            )}

            {/* 操作反馈 */}
            {toast && (
                <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 13, padding: '8px 16px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> {toast}
                    </div>
                </div>
            )}
        </>
    );
}

export function ContractConfirm({ nav, order }: { nav: AppNav; order: Order }) {
    const contracts = orderContracts(order);
    const isSecond = contracts.length > 0;
    const signedConstruction = contracts.some((c) => c.type === '仅施工' || c.type === '完整施工代办');
    const signedAgency = contracts.some((c) => c.type === '仅代办' || c.type === '完整施工代办');
    const available: ContractType[] = !isSecond
        ? ['仅代办', '仅施工', '完整施工代办']
        : signedConstruction && !signedAgency
            ? ['仅代办']
            : signedAgency && !signedConstruction
                ? ['仅施工']
                : [];
    const noMore = available.length === 0;
    const defaultType: ContractType = available.includes('完整施工代办') ? '完整施工代办' : (available[0] ?? '完整施工代办');
    const [type, setType] = useState<ContractType>(defaultType);
    const [workloadMode, setWorkloadMode] = useState<'采用绘图员版本' | '上传最终确认版'>('采用绘图员版本');
    const [totalPrice, setTotalPrice] = useState('');
    const [toast, setToast] = useState('');
    const includesConstruction = type !== '仅代办';
    const includesAgency = type !== '仅施工';
    const receiverRole: RoleId = includesAgency ? 'agent' : 'pm';
    const [receiverId, setReceiverId] = useState(usersForRole(receiverRole)[0]?.id ?? '');
    const receiverUsers = usersForRole(receiverRole);
    const effectiveReceiverId = receiverUsers.some((u) => u.id === receiverId) ? receiverId : (receiverUsers[0]?.id ?? '');
    const receiverName = receiverUsers.find((u) => u.id === effectiveReceiverId)?.name ?? roleLabel(receiverRole);
    const rollbackPreview = isSecond && !noMore ? supplementRollbackNodes(order, type) : [];
    const agencyItems = [order.hasInspect ? '代办审图' : '', order.hasDeclare ? '代办申报' : ''].filter(Boolean).join('、') || '—';
    const signedTypes = contracts.map((c) => c.type);

    const submit = () => {
        const record: ContractRecord = {
            id: `HT${order.id.slice(2)}-${contracts.length + 1}`,
            type,
            totalPrice: totalPrice ? Number(totalPrice) : undefined,
            signedTime: order.updateTime,
            submitter: '李娜',
            receiverRole,
            receiverName,
            workloadMode: includesConstruction ? workloadMode : '采用绘图员版本',
            attachments: [includesAgency ? '代办合同.pdf' : '施工合同.pdf'],
            quoteAttachments: [includesAgency ? '代办报价单.pdf' : '施工报价单.pdf'],
            collections: [],
        };
        const nextContracts = [...contracts, record];
        if (!isSecond) {
            const preview: Order = { ...order, contracts: nextContracts };
            const r = resolveAdvance(preview, { role: receiverRole, name: receiverName });
            nav.updateOrder({ contracts: nextContracts, ...(r?.patch ?? {}) });
            setToast('合同已确认，服务节点已按合同服务类型生成');
        } else if (rollbackPreview.length) {
            // 先快照回退信息：nav.updateOrder 会就地改写 order
            const returnLabel = nodeLabel(order.currentNode);
            const returnNode = order.currentNode;
            const returnRole = order.assigneeRole;
            const returnAssignee = order.assignee;
            const insertedLabel = rollbackPreview.map(nodeLabel).join(' → ');
            nav.updateOrder({
                contracts: nextContracts,
                currentNode: rollbackPreview[0],
                assigneeRole: receiverRole,
                assignee: receiverName,
                rollback: {
                    returnNode,
                    returnRole,
                    returnAssignee,
                    insertedNodes: rollbackPreview,
                    handlerRole: receiverRole,
                    handlerAssignee: receiverName,
                    contractType: type,
                    time: order.updateTime,
                },
                completedNodes: Array.from(new Set([...(order.completedNodes ?? []), ...completedBeforeCurrent(order, rollbackPreview)])),
            });
            setToast(`补充合同已确认，服务单已回退至「${nodeLabel(rollbackPreview[0])}」；${insertedLabel} 完成后自动回到「${returnLabel}」，原进度保留`);
        } else {
            nav.updateOrder({ contracts: nextContracts });
            setToast('补充合同已确认，服务节点已按合同服务类型追加');
        }
        window.setTimeout(() => nav.openOrder(order.id), 1400);
    };

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="确认合同" onBack={() => nav.openOrder(order.id)} />
            <div className="page-body">
                <div className="detail-head">
                    <div className="dh-id"><span style={{ fontWeight: 600 }}>{order.id}</span><StatusTag status={order.status} role={nav.role} assigneeRole={order.assigneeRole} /></div>
                    <div className="dh-title">{order.location}</div>
                    <div className="dh-sub">项目：{order.project} · {order.projectType}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>报价员 · 合同确认与收款支线并行，不跟踪付款方式与比例</div>
                </div>

                {noMore && (
                    <div className="collection-banner is-done">
                        {order.location} 的施工及代办服务合同均已确认，报价员处置节点已结束。
                    </div>
                )}

                {isSecond && !noMore && (
                    <div className="collection-banner is-going">
                        本次为第 {contracts.length + 1} 次确认合同：已签「{signedTypes.join('」「')}」合同，可继续补充签订「{available.join('、')}」合同；签订后按新合同服务类型增加服务节点。
                    </div>
                )}

                {!noMore && (
                    <>
                        <div className="form-card">
                            <div style={{ fontSize: 14, fontWeight: 600 }}>合同服务项</div>
                            <Field label="本次签订合同服务项" required hint="仅代办 / 仅施工可各签一次，也可一次签订完整施工代办合同">
                                <div className="contract-type-list">
                                    {([
                                        ['仅代办', '仅提供代办服务，不含施工'],
                                        ['仅施工', '仅提供施工服务，不含代办'],
                                        ['完整施工代办', '施工与代办合并为一份合同'],
                                    ] as [ContractType, string][]).map(([t, desc]) => {
                                        const signed = signedTypes.includes(t) || (signedTypes.includes('完整施工代办'));
                                        const disabled = signed || !available.includes(t);
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                className={`contract-type ${type === t ? 'is-active' : ''}${disabled ? ' is-disabled' : ''}`}
                                                disabled={disabled}
                                                onClick={() => setType(t)}
                                            >
                                                <span className="ct-name">{t}</span>
                                                <span className="ct-desc">{desc}</span>
                                                {signed && <span className="ct-tag">已签</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>
                            {includesAgency && (
                                <div className="contract-subinfo">代办内容：{agencyItems}（来自服务内容，按合同自动带出）</div>
                            )}
                        </div>

                        <div className="form-card">
                            <div style={{ fontSize: 14, fontWeight: 600 }}>图纸与工作量确认</div>
                            {includesConstruction ? (
                                <>
                                    <Field label="绘图员提交版本">
                                        <div className="draft-version">
                                            <div className="dv-head">王强 · V1 · {order.updateTime}</div>
                                            <div className="dv-files">深化图纸.pdf · 计算书.pdf · 工作量清单.xlsx</div>
                                        </div>
                                    </Field>
                                    <Field label="工作量清单" hint="绘图员按深化图纸拆解的系统-部件点位工作量">
                                        <WorkloadTable items={REVIEW_WORKLOADS} />
                                    </Field>
                                    <Field label="深化图纸附件" required>
                                        <div className="file-chip">
                                            <FileText size={15} color="#1677ff" />
                                            <span className="fc-name">深化图纸.pdf</span>
                                            <Download size={14} color="#999" />
                                        </div>
                                    </Field>
                                    <Field label="工作量清单附件" required>
                                        <div className="file-chip">
                                            <FileText size={15} color="#1677ff" />
                                            <span className="fc-name">工作量清单.xlsx</span>
                                            <Download size={14} color="#999" />
                                        </div>
                                    </Field>
                                    <Field label="工作量确认" required hint="请确认最终深化图纸及工作量清单是否为绘图员提交版本；合同最终确认的工作量将用于施工节点更新施工量（扣减）">
                                        <div className="contract-type-list">
                                            <button type="button" className={`contract-type ${workloadMode === '采用绘图员版本' ? 'is-active' : ''}`} onClick={() => setWorkloadMode('采用绘图员版本')}>
                                                <span className="ct-name">与绘图员提交版本一致</span>
                                                <span className="ct-desc">直接采用绘图员提交的图纸与工作量</span>
                                            </button>
                                            <button type="button" className={`contract-type ${workloadMode === '上传最终确认版' ? 'is-active' : ''}`} onClick={() => setWorkloadMode('上传最终确认版')}>
                                                <span className="ct-name">线下重勘，上传最终确认版</span>
                                                <span className="ct-desc">重勘后的图纸与施工量将追加至绘图员过程文件</span>
                                            </button>
                                        </div>
                                    </Field>
                                    {workloadMode === '上传最终确认版' && (
                                        <>
                                            <Field label="最终深化图纸附件" required><UploadBox label="上传最终深化图纸" /></Field>
                                            <Field label="最终工作量清单附件" required><UploadBox label="上传施工量清单" hint="支持 xlsx / pdf" /></Field>
                                            <div className="contract-subinfo">上传后将更新至绘图员「图纸深化」过程文件，不回流绘图员节点；该版本作为施工节点扣减的基准清单。</div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="contract-subinfo">本合同不含施工服务，无需确认工作量；最终深化图纸采用绘图员提交版本。</div>
                            )}
                        </div>

                        <div className="form-card">
                            <div style={{ fontSize: 14, fontWeight: 600 }}>附件与合同信息</div>
                            <Field label="合同附件" required><UploadBox label="上传签章合同" /></Field>
                            <Field label="报价单附件" required><UploadBox label="上传报价单" /></Field>
                            <Field label="合同总价" hint="非必填，按实际合同需要选填">
                                <input className="f-input" type="number" placeholder="0.00" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} />
                                <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>大写：{totalPrice ? amountToChinese(Number(totalPrice)) : '—'}</div>
                            </Field>
                            <Field label="备注"><textarea className="f-input" rows={3} placeholder="选填" style={{ resize: 'none' }} /></Field>
                        </div>

                        <div className="form-card">
                            <ReceiverSelect
                                role={receiverRole}
                                label={isSecond ? '新增节点处置用户' : '下一节点接收用户'}
                                value={effectiveReceiverId}
                                onChange={setReceiverId}
                            />
                            <div className="contract-subinfo">
                                下一步流转：本合同{includesAgency ? '包含代办服务，确认后流转至代办人员处理审图/申报' : '仅含施工服务，确认后流转至项目经理处理施工'}（{roleLabel(receiverRole)}）。
                            </div>
                            {isSecond && (
                                <div className={`collection-banner ${rollbackPreview.length ? 'is-going' : 'is-done'}`} style={{ marginTop: 10 }}>
                                    {rollbackPreview.length
                                        ? `本次补签新增「${rollbackPreview.map(nodeLabel).join('、')}」位于当前节点之前，确认后服务单将回退至「${nodeLabel(rollbackPreview[0])}」，完成后自动回到「${nodeLabel(order.currentNode)}」，原节点处置进度保留。`
                                        : '本次补签新增节点位于当前节点之后，确认后按完整流程顺序追加，不回退。'}
                                </div>
                            )}
                            <div className="collection-banner is-going" style={{ marginTop: 10 }}>
                                确认后生成对应合同收款项目；财务并行跟进实际收付款，可多次更新收款比例，收款 100% 后该合同收款完成。
                            </div>
                        </div>
                    </>
                )}
            </div>

            {!noMore && (
                <div className="bottom-action">
                    <button className="btn btn-primary btn-block" onClick={submit}>
                        <Send size={15} /> {isSecond ? '确认补充合同' : '确认合同并流转'}
                    </button>
                </div>
            )}

            {toast && (
                <div style={{ position: 'absolute', top: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'rgba(0,0,0,0.78)', color: '#fff', fontSize: 13, padding: '8px 16px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> {toast}
                    </div>
                </div>
            )}
        </>
    );
}
