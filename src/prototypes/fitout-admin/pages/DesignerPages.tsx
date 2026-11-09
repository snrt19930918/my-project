// 系统配置：流程设计器（流程引擎编辑台）
// 独立草稿式设计器：发布结果只在设计器版本与预览内生效，不接管现有服务单运行时流程。
import React, { useState } from 'react';
import {
    Save, Plus, Trash2, ChevronRight, ChevronLeft, ShieldCheck, AlertTriangle, Check,
    GripVertical, Rocket, Eye, Copy, ArrowUp, ArrowDown, Info, FileText, Layers, ListChecks,
} from 'lucide-react';
import { type AdminNav, AdminShell, Switch, Modal } from '../components';
import {
    FLOW_BRANCHES, NODES, POSITIONS, NODE_PERMISSIONS, NODE_TIMEOUT_RULES,
    formatTimeoutShort, type TimeoutUnit,
} from '../data';

/* ===== 类型 ===== */

type NodeKind = 'start' | 'task' | 'auto' | 'end' | 'parallel';

interface DesignerNode {
    id: string;
    label: string;
    optional: boolean;
    kind: NodeKind;
    condition?: string;
    custom?: boolean;
}

type FieldType =
    | 'text' | 'textarea' | 'number' | 'amount' | 'date' | 'daterange'
    | 'select' | 'radio' | 'checkbox' | 'upload' | 'image' | 'table' | 'note';

interface FormField {
    id: string;
    label: string;
    type: FieldType;
    required: boolean;
    placeholder?: string;
    options?: string;
    visibility: 'all' | 'handler';
    editable: boolean;
}

interface NodePermission {
    positions: string[];
    viewScope: 'all' | 'biz' | 'handler';
    allowTransfer: boolean;
    allowWithdraw: boolean;
    allowSign: boolean;
}

interface TimeoutCfg {
    enabled: boolean;
    unit: TimeoutUnit;
    receive: number | null;
    warning: number;
    alarm: number;
}

interface DesignerState {
    nodes: Record<string, DesignerNode[]>;
    parallel: DesignerNode[];
    fields: Record<string, FormField[]>;
    perms: Record<string, NodePermission>;
    timeouts: Record<string, TimeoutCfg>;
}

interface Issue {
    level: 'error' | 'warn';
    text: string;
    nodeId?: string;
}

interface Notice {
    kind: 'success' | 'error' | 'info';
    title: string;
    desc?: string;
}

type DesignerTab = 'basic' | 'perm' | 'form' | 'timeout';

const DESIGNER_TABS: { id: DesignerTab; label: string }[] = [
    { id: 'basic', label: '基本信息' },
    { id: 'perm', label: '处置权限' },
    { id: 'form', label: '表单设计' },
    { id: 'timeout', label: '超时与通知' },
];

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
    text: '单行文本',
    textarea: '多行文本',
    number: '数字',
    amount: '金额',
    date: '日期',
    daterange: '日期区间',
    select: '下拉选择',
    radio: '单选',
    checkbox: '多选',
    upload: '附件上传',
    image: '图片上传',
    table: '表格',
    note: '说明文字',
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABEL) as FieldType[];
const OPTION_TYPES: FieldType[] = ['select', 'radio', 'checkbox'];

const KIND_LABEL: Record<NodeKind, string> = {
    start: '起始节点',
    task: '人工处置',
    auto: '自动节点',
    end: '结束节点',
    parallel: '并行节点',
};

const VIEW_SCOPE_LABEL: Record<NodePermission['viewScope'], string> = {
    all: '全部账号',
    biz: '业务管理员及以上',
    handler: '仅处置人与管理员',
};

const CUSTOM_NODE_ID = 'material';

/* ===== 初始种子 ===== */

function nodeFrom(id: string): DesignerNode {
    const def = NODES.find((n) => n.id === id);
    return {
        id,
        label: def?.label ?? id,
        optional: Boolean(def?.optional),
        kind: id === 'create' ? 'start' : id === 'acceptance' ? 'end' : id === 'collection' ? 'parallel' : 'task',
    };
}

function insertBeforeLast(list: DesignerNode[], node: DesignerNode): DesignerNode[] {
    if (list.length === 0) return [node];
    return [...list.slice(0, -1), node, list[list.length - 1]];
}

function seedPerms(): Record<string, NodePermission> {
    const ids = [...new Set([...NODES.map((n) => n.id as string), CUSTOM_NODE_ID])];
    const out: Record<string, NodePermission> = {};
    ids.forEach((id) => {
        out[id] = {
            positions: POSITIONS.filter((p) => p.permissions.some((x) => (x as string) === id)).map((p) => p.id),
            viewScope: 'all',
            allowTransfer: true,
            allowWithdraw: id !== 'create',
            allowSign: ['review', 'contract', 'acceptance'].includes(id),
        };
    });
    out[CUSTOM_NODE_ID] = { positions: ['pm'], viewScope: 'all', allowTransfer: true, allowWithdraw: true, allowSign: false };
    return out;
}

function seedFields(): Record<string, FormField[]> {
    return {
        review: [
            { id: 'f-review-result', label: '审核结论', type: 'radio', required: true, options: '审核通过\n驳回', visibility: 'handler', editable: true },
            { id: 'f-review-note', label: '驳回意见', type: 'textarea', required: false, placeholder: '驳回时必填', visibility: 'handler', editable: true },
            { id: 'f-review-file', label: '审核附件', type: 'upload', required: false, visibility: 'all', editable: true },
        ],
        construction: [
            { id: 'f-cons-date', label: '施工时间', type: 'date', required: true, visibility: 'handler', editable: true },
            { id: 'f-cons-note', label: '施工说明', type: 'textarea', required: false, visibility: 'handler', editable: true },
            { id: 'f-cons-photo', label: '现场照片', type: 'image', required: false, visibility: 'all', editable: true },
        ],
        [CUSTOM_NODE_ID]: [
            { id: 'f-mat-result', label: '验收结论', type: 'radio', required: true, options: '合格\n不合格', visibility: 'handler', editable: true },
            { id: 'f-mat-list', label: '材料清单', type: 'table', required: true, visibility: 'all', editable: true },
            { id: 'f-mat-photo', label: '现场照片', type: 'image', required: false, visibility: 'all', editable: true },
        ],
    };
}

function seedTimeouts(): Record<string, TimeoutCfg> {
    const out: Record<string, TimeoutCfg> = {};
    NODE_TIMEOUT_RULES.forEach((t) => {
        out[t.nodeId] = {
            enabled: t.enabled,
            unit: t.unit,
            receive: t.receiveValue,
            warning: t.warningValue,
            alarm: t.alarmValue,
        };
    });
    out[CUSTOM_NODE_ID] = { enabled: false, unit: 'hour', receive: 4, warning: 24, alarm: 48 };
    return out;
}

function seed(): DesignerState {
    const nodes: Record<string, DesignerNode[]> = {};
    FLOW_BRANCHES.forEach((b) => {
        nodes[b.id] = b.nodes.map((id) => nodeFrom(id));
    });
    nodes.construction = insertBeforeLast(nodes.construction, {
        id: CUSTOM_NODE_ID,
        label: '材料验收',
        optional: false,
        kind: 'task',
        custom: true,
        condition: '施工节点完成且材料清单已上传',
    });
    return {
        nodes,
        parallel: [nodeFrom('collection')],
        fields: seedFields(),
        perms: seedPerms(),
        timeouts: seedTimeouts(),
    };
}

/* ===== 工具函数 ===== */

function permissionNameOf(node: DesignerNode): string {
    return (NODE_PERMISSIONS as Record<string, string>)[node.id] ?? `${node.label}处置权`;
}

function validateDraft(s: DesignerState, branchId: string): Issue[] {
    const issues: Issue[] = [];
    const nodes = s.nodes[branchId] ?? [];
    if (nodes.length < 2) {
        issues.push({ level: 'error', text: '当前服务分支至少需要保留起始节点与结束节点' });
    }
    const checkNode = (n: DesignerNode) => {
        if (!n.label.trim()) {
            issues.push({ level: 'error', nodeId: n.id, text: '存在未命名的节点' });
        }
        const perm = s.perms[n.id];
        if (!perm || perm.positions.length === 0) {
            issues.push({ level: 'error', nodeId: n.id, text: `「${n.label}」未绑定任何处置岗位` });
        }
        (s.fields[n.id] ?? []).forEach((f) => {
            if (!f.label.trim()) {
                issues.push({ level: 'error', nodeId: n.id, text: `「${n.label}」存在未命名的表单字段` });
            }
            if (OPTION_TYPES.includes(f.type) && !f.options?.trim()) {
                issues.push({ level: 'error', nodeId: n.id, text: `「${n.label}」字段「${f.label}」缺少选项` });
            }
        });
        const t = s.timeouts[n.id];
        if (n.id !== 'create' && t?.enabled) {
            const vals = [t.receive, t.warning, t.alarm];
            if (vals.some((v) => v === null || !Number.isFinite(v) || (v as number) <= 0)) {
                issues.push({ level: 'error', nodeId: n.id, text: `「${n.label}」超时时限需为正整数` });
            } else if ((t.receive as number) > t.warning || t.warning > t.alarm) {
                issues.push({ level: 'error', nodeId: n.id, text: `「${n.label}」超时阈值需满足 接收 ≤ 预警 ≤ 告警` });
            }
        }
        if (n.custom && !n.condition?.trim()) {
            issues.push({ level: 'warn', nodeId: n.id, text: `自定义节点「${n.label}」未填写触发条件` });
        }
    };
    nodes.forEach(checkNode);
    s.parallel.forEach(checkNode);
    if (nodes[0]?.id !== 'create') {
        issues.push({ level: 'warn', text: '主流程首个节点建议为「创建」节点' });
    }
    return issues;
}

/* ===== 表单字段预览控件 ===== */

function FieldPreview({ field }: { field: FormField }) {
    if (field.type === 'note') {
        return <div className="dfp-box" style={{ textAlign: 'left', color: 'var(--text-2)' }}>说明文字占位</div>;
    }
    if (field.type === 'upload' || field.type === 'image') {
        return <div className="dfp-box">{field.type === 'image' ? '上传图片（示意）' : '上传附件（示意）'}</div>;
    }
    if (field.type === 'table') {
        return <div className="dfp-box">材料 / 工作量清单表格（示意）</div>;
    }
    if (field.type === 'radio' || field.type === 'checkbox') {
        const opts = (field.options ?? '').split('\n').map((o) => o.trim()).filter(Boolean);
        return (
            <div className="dfp-chips">
                {opts.length === 0
                    ? <span className="dfp-chip">未配置选项</span>
                    : opts.map((o) => <span className="dfp-chip" key={o}>{o}</span>)}
            </div>
        );
    }
    if (field.type === 'select') {
        return (
            <select className="dfp-input" disabled defaultValue="">
                <option value="">{field.placeholder || '请选择'}</option>
                {(field.options ?? '').split('\n').map((o) => o.trim()).filter(Boolean).map((o) => <option key={o}>{o}</option>)}
            </select>
        );
    }
    if (field.type === 'textarea') {
        return <textarea className="dfp-input" rows={2} placeholder={field.placeholder} disabled />;
    }
    const inputType = field.type === 'number' || field.type === 'amount'
        ? 'number'
        : field.type === 'date' || field.type === 'daterange' ? 'date' : 'text';
    return <input className="dfp-input" type={inputType} placeholder={field.placeholder || '请输入'} disabled />;
}

/* ===== 页面 ===== */

export function FlowDesigner({ nav }: { nav: AdminNav }) {
    const [state, setState] = useState<DesignerState>(seed);
    const [branch, setBranch] = useState(FLOW_BRANCHES[0].id);
    const [selectedId, setSelectedId] = useState('review');
    const [tab, setTab] = useState<DesignerTab>('basic');

    const [mode, setMode] = useState<'draft' | 'published'>('draft');
    const [draftVersion, setDraftVersion] = useState('1.4');
    const [publishedVersion, setPublishedVersion] = useState('1.3');
    const [records, setRecords] = useState<{ version: string; time: string; action: string }[]>([
        { version: '1.3', time: '2026-10-20 10:12', action: '当前生效版本' },
    ]);
    const [dirty, setDirty] = useState(false);
    const [notice, setNotice] = useState<Notice | null>(null);
    const [issues, setIssues] = useState<Issue[] | null>(null);

    const [addOpen, setAddOpen] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [fieldModal, setFieldModal] = useState<{ nodeId: string; field: FormField; isNew: boolean } | null>(null);
    const [publishOpen, setPublishOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewStep, setPreviewStep] = useState(0);
    const [dragId, setDragId] = useState<string | null>(null);

    const readOnly = mode === 'published';
    const branchNodes = state.nodes[branch] ?? [];
    const selectedNode = [...branchNodes, ...state.parallel].find((n) => n.id === selectedId) ?? null;
    const fallbackPerm: NodePermission = { positions: [], viewScope: 'all', allowTransfer: true, allowWithdraw: true, allowSign: false };
    const selectedPerm = selectedNode ? state.perms[selectedNode.id] ?? fallbackPerm : null;
    const selectedFields = selectedNode ? state.fields[selectedNode.id] ?? [] : [];
    const selectedTimeout = selectedNode ? state.timeouts[selectedNode.id] ?? null : null;

    const mutate = (updater: (s: DesignerState) => DesignerState) => {
        setState((prev) => updater(prev));
        setDirty(true);
        setIssues(null);
        setNotice(null);
    };

    const patchNode = (id: string, patch: Partial<DesignerNode>) => mutate((s) => {
        if (s.nodes[branch].some((n) => n.id === id)) {
            return { ...s, nodes: { ...s.nodes, [branch]: s.nodes[branch].map((n) => (n.id === id ? { ...n, ...patch } : n)) } };
        }
        return { ...s, parallel: s.parallel.map((n) => (n.id === id ? { ...n, ...patch } : n)) };
    });

    const patchPerm = (id: string, patch: Partial<NodePermission>) => mutate((s) => ({
        ...s,
        perms: { ...s.perms, [id]: { ...(s.perms[id] ?? fallbackPerm), ...patch } },
    }));

    const setFields = (nodeId: string, updater: (list: FormField[]) => FormField[]) => mutate((s) => ({
        ...s,
        fields: { ...s.fields, [nodeId]: updater(s.fields[nodeId] ?? []) },
    }));

    const patchTimeout = (id: string, patch: Partial<TimeoutCfg>) => mutate((s) => ({
        ...s,
        timeouts: { ...s.timeouts, [id]: { ...(s.timeouts[id] ?? { enabled: false, unit: 'hour', receive: 4, warning: 24, alarm: 48 }), ...patch } },
    }));

    const changeBranch = (id: string) => {
        setBranch(id);
        const next = state.nodes[id] ?? [];
        if (!next.some((n) => n.id === selectedId)) setSelectedId(next[0]?.id ?? '');
        setIssues(null);
        setNotice(null);
    };

    const toggleStandard = (nodeId: string) => {
        if (readOnly || nodeId === 'create') return;
        const exists = branchNodes.some((n) => n.id === nodeId);
        if (exists) {
            mutate((s) => ({ ...s, nodes: { ...s.nodes, [branch]: s.nodes[branch].filter((n) => n.id !== nodeId) } }));
            if (selectedId === nodeId) setSelectedId(branchNodes.find((n) => n.id !== nodeId)?.id ?? '');
            return;
        }
        mutate((s) => ({ ...s, nodes: { ...s.nodes, [branch]: insertBeforeLast(s.nodes[branch], nodeFrom(nodeId)) } }));
        setSelectedId(nodeId);
    };

    const addCustomNode = () => {
        const name = newNodeName.trim();
        if (!name) return;
        const id = `custom-${Date.now()}`;
        const node: DesignerNode = { id, label: name, optional: false, kind: 'task', custom: true };
        mutate((s) => ({
            ...s,
            nodes: { ...s.nodes, [branch]: insertBeforeLast(s.nodes[branch], node) },
            perms: { ...s.perms, [id]: { positions: [], viewScope: 'all', allowTransfer: true, allowWithdraw: true, allowSign: false } },
            fields: { ...s.fields, [id]: [] },
            timeouts: { ...s.timeouts, [id]: { enabled: false, unit: 'hour', receive: 4, warning: 24, alarm: 48 } },
        }));
        setSelectedId(id);
        setTab('basic');
        setNewNodeName('');
        setAddOpen(false);
    };

    const deleteNode = (id: string) => {
        if (readOnly || id === 'create' || id === 'collection') return;
        mutate((s) => ({ ...s, nodes: { ...s.nodes, [branch]: s.nodes[branch].filter((n) => n.id !== id) } }));
        if (selectedId === id) setSelectedId(branchNodes.find((n) => n.id !== id)?.id ?? '');
    };

    const moveNode = (id: string, dir: -1 | 1) => {
        if (readOnly) return;
        mutate((s) => {
            const list = [...s.nodes[branch]];
            const idx = list.findIndex((n) => n.id === id);
            const to = idx + dir;
            if (idx < 0 || to < 0 || to >= list.length) return s;
            const [item] = list.splice(idx, 1);
            list.splice(to, 0, item);
            return { ...s, nodes: { ...s.nodes, [branch]: list } };
        });
    };

    const onDropNode = (targetId: string) => {
        if (!dragId || dragId === targetId || readOnly) return;
        mutate((s) => {
            const list = [...s.nodes[branch]];
            const from = list.findIndex((n) => n.id === dragId);
            const to = list.findIndex((n) => n.id === targetId);
            if (from < 0 || to < 0) return s;
            const [item] = list.splice(from, 1);
            list.splice(to, 0, item);
            return { ...s, nodes: { ...s.nodes, [branch]: list } };
        });
        setDragId(null);
    };

    const runValidate = () => {
        const found = validateDraft(state, branch);
        setIssues(found);
        setNotice(null);
        const errors = found.filter((i) => i.level === 'error').length;
        if (errors === 0) {
            setNotice({
                kind: 'success',
                title: '校验通过',
                desc: found.length > 0 ? `结构、权限、表单与超时规则通过，另有 ${found.length} 条提醒。` : '结构、权限、表单与超时规则均通过，可发布。',
            });
        }
    };

    const tryPublish = () => {
        const found = validateDraft(state, branch);
        const errors = found.filter((i) => i.level === 'error');
        setIssues(found);
        if (errors.length > 0) {
            setNotice({ kind: 'error', title: '存在校验未通过项，无法发布', desc: `请先处理 ${errors.length} 条错误项后再发布。` });
            return;
        }
        setNotice(null);
        setPublishOpen(true);
    };

    const confirmPublish = () => {
        setRecords([{ version: draftVersion, time: '2026-10-30 15:20', action: '发布为当前生效版本' }, ...records]);
        setPublishedVersion(draftVersion);
        setMode('published');
        setDirty(false);
        setPublishOpen(false);
        setNotice({
            kind: 'success',
            title: `v${draftVersion} 已发布`,
            desc: '新发起服务单按新版本执行；在途服务单保持原版本，不重算已生成的节点时限。',
        });
    };

    const copyToDraft = () => {
        const next = (Number(publishedVersion) + 0.1).toFixed(1);
        setDraftVersion(next);
        setMode('draft');
        setDirty(false);
        setNotice({ kind: 'info', title: `已复制为草稿 v${next}`, desc: '草稿继承已发布版本的流程、表单与权限，可继续编辑；发布前不影响现有运行时流程。' });
    };

    const saveDraft = () => {
        setDirty(false);
        setNotice({ kind: 'success', title: '草稿已保存', desc: `v${draftVersion} 草稿已保存到本地演示态，发布后才会影响新发起服务单。` });
    };

    const openNewField = (nodeId: string) => {
        setFieldModal({
            nodeId,
            isNew: true,
            field: { id: `field-${Date.now()}`, label: '', type: 'text', required: false, visibility: 'handler', editable: true },
        });
    };

    const openEditField = (nodeId: string, field: FormField) => {
        setFieldModal({ nodeId, isNew: false, field: { ...field } });
    };

    const patchFieldDraft = (patch: Partial<FormField>) => {
        setFieldModal((prev) => (prev ? { ...prev, field: { ...prev.field, ...patch } } : prev));
    };

    const saveField = () => {
        if (!fieldModal) return;
        const f = fieldModal.field;
        if (!f.label.trim()) return;
        setFields(fieldModal.nodeId, (list) => (
            fieldModal.isNew ? [...list, f] : list.map((x) => (x.id === f.id ? f : x))
        ));
        setFieldModal(null);
    };

    const moveField = (nodeId: string, id: string, dir: -1 | 1) => {
        setFields(nodeId, (list) => {
            const idx = list.findIndex((f) => f.id === id);
            const to = idx + dir;
            if (idx < 0 || to < 0 || to >= list.length) return list;
            const next = [...list];
            const [item] = next.splice(idx, 1);
            next.splice(to, 0, item);
            return next;
        });
    };

    const removeField = (nodeId: string, id: string) => setFields(nodeId, (list) => list.filter((f) => f.id !== id));

    const timeoutSummary = (id: string) => {
        if (id === 'create') return '超时 不适用';
        const t = state.timeouts[id];
        if (!t || !t.enabled) return '超时 未启用';
        return `预警 ${formatTimeoutShort(t.warning, t.unit)} · 告警 ${formatTimeoutShort(t.alarm, t.unit)}`;
    };

    const previewNodes = branchNodes;
    const activePreview = previewNodes[Math.min(previewStep, Math.max(previewNodes.length - 1, 0))] ?? null;

    const renderNodeCard = (node: DesignerNode) => (
        <div
            key={node.id}
            className={`designer-node${selectedId === node.id ? ' is-selected' : ''}${node.optional ? ' is-optional' : ''}${dragId === node.id ? ' is-dragging' : ''}`}
            draggable={!readOnly}
            onDragStart={() => setDragId(node.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDropNode(node.id)}
            onClick={() => setSelectedId(node.id)}
        >
            <div className="dn-head">
                <span className="dn-grip"><GripVertical size={12} /></span>
                <span className="dn-name">{node.label || '未命名节点'}</span>
            </div>
            <div className="dn-meta">{permissionNameOf(node)}</div>
            <div className="dn-timeout">{timeoutSummary(node.id)}</div>
            <div className="dn-tags">
                {node.optional && <span className="badge gray">可选</span>}
                {node.custom && <span className="badge orange">自定义</span>}
                <span className="badge blue">{KIND_LABEL[node.kind]}</span>
            </div>
        </div>
    );

    return (
        <AdminShell
            nav={nav}
            page="flow-designer"
            crumb={['系统配置', '流程设计器']}
            title="流程设计器"
            sub="流程引擎编辑台：自定义流程节点、节点表单与处置权限，校验通过后发布；不接管现有服务单运行时流程"
            actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        style={{ padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', color: 'var(--text)' }}
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'draft' | 'published')}
                    >
                        <option value="draft">v{draftVersion} 草稿（编辑中）</option>
                        <option value="published">v{publishedVersion} 当前生效（只读）</option>
                    </select>
                    <button className="btn btn-ghost" onClick={runValidate}><ListChecks size={15} /> 校验</button>
                    <button className="btn btn-ghost" onClick={saveDraft} disabled={readOnly}><Save size={15} /> 保存草稿</button>
                    {readOnly
                        ? <button className="btn btn-primary" onClick={copyToDraft}><Copy size={15} /> 复制为新草稿</button>
                        : <button className="btn btn-primary" onClick={tryPublish}><Rocket size={15} /> 发布</button>}
                    <button className="btn btn-outline" onClick={() => { setPreviewStep(0); setPreviewOpen(true); }}><Eye size={15} /> 预览</button>
                </div>
            }
        >
            {readOnly && (
                <div className="banner info">
                    <span className="bn-icon"><Info size={16} /></span>
                    <div className="bn-main">
                        <div className="bn-title">当前查看已发布版本 v{publishedVersion}（只读）</div>
                        <div className="bn-sub">已发布版本不可直接修改；如需调整，请点击「复制为新草稿」再编辑，发布前不影响现有运行时流程。</div>
                    </div>
                </div>
            )}

            <div className="designer-layout">
                <aside className="card designer-left">
                    <div className="card-title"><span>服务分支</span><span className="badge gray">{branchNodes.length} 节点</span></div>
                    <div className="designer-branch-list">
                        {FLOW_BRANCHES.map((b) => (
                            <button
                                key={b.id}
                                type="button"
                                className={`designer-branch${branch === b.id ? ' is-active' : ''}`}
                                onClick={() => changeBranch(b.id)}
                            >
                                <span>{b.label}</span>
                                <span className="db-count">{state.nodes[b.id]?.length ?? 0}</span>
                            </button>
                        ))}
                    </div>

                    <div className="designer-divider" />

                    <div className="card-title"><span>节点库</span><span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>点击添加 / 移除</span></div>
                    <div className="designer-palette">
                        {NODES.filter((n) => n.id !== 'collection').map((n) => {
                            const added = branchNodes.some((x) => x.id === n.id);
                            return (
                                <button
                                    key={n.id}
                                    type="button"
                                    className={`designer-palette-item${added ? ' is-added' : ''}`}
                                    disabled={readOnly || n.id === 'create'}
                                    onClick={() => toggleStandard(n.id)}
                                    title={n.id === 'create' ? '创建节点为固定起始节点，不可移除' : undefined}
                                >
                                    <span>{n.label}</span>
                                    <span className={`badge ${added ? 'green' : 'blue'}`}>{added ? '已加入' : '+ 添加'}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setAddOpen(true)} disabled={readOnly}>
                        <Plus size={14} /> 新增自定义节点
                    </button>

                    <div className="designer-divider" />

                    <div className="card-title"><span>版本记录</span><span className="badge gray">{records.length}</span></div>
                    <div className="designer-versions">
                        {records.map((r) => (
                            <div className="designer-version" key={`${r.version}-${r.time}`}>
                                <div className="dv-main">
                                    <span className="dv-version">v{r.version}</span>
                                    <span className="dv-action">{r.action}</span>
                                    <span className="dv-time">{r.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <section className="card designer-center">
                    <div className="card-title">
                        <span>{FLOW_BRANCHES.find((b) => b.id === branch)?.label} · 主流程</span>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
                            {dirty ? <span className="badge orange">草稿未保存</span> : <span className="badge green">已保存</span>}
                            <span>{branchNodes.length} 节点</span>
                        </span>
                    </div>
                    <div className="designer-canvas">
                        {branchNodes.map((n, i) => (
                            <React.Fragment key={n.id}>
                                {i > 0 && <span className="designer-connector"><ChevronRight size={16} /></span>}
                                {renderNodeCard(n)}
                            </React.Fragment>
                        ))}
                        {branchNodes.length === 0 && <div className="designer-canvas-empty">当前分支暂无节点，从左侧节点库添加</div>}
                    </div>
                    <p className="designer-canvas-hint">
                        拖拽节点可调整顺序；虚线节点为可选节点；切换服务分支后各分支编排独立保留。自定义节点会写入草稿并通过校验后才能发布。
                    </p>

                    <div className="designer-lane">
                        <div className="designer-lane-title"><Layers size={14} /> 并行支线 · 合同收款</div>
                        <div className="designer-canvas">
                            {state.parallel.map((n) => renderNodeCard(n))}
                        </div>
                        <p className="designer-canvas-hint">与主流程并行；全部合同收款 100% 且服务支线完结后，服务单才最终办结。</p>
                    </div>
                </section>

                <aside className="card designer-right">
                    {!selectedNode ? (
                        <div className="empty">从画布中选择节点进行配置</div>
                    ) : (
                        <>
                            <div className="card-title">
                                <span>{selectedNode.label || '未命名节点'}</span>
                                <span style={{ display: 'flex', gap: 4 }}>
                                    {selectedNode.custom && <span className="badge orange">自定义</span>}
                                    {selectedNode.optional && <span className="badge gray">可选</span>}
                                    <span className="badge blue">{KIND_LABEL[selectedNode.kind]}</span>
                                </span>
                            </div>

                            <div className="designer-tabs">
                                {DESIGNER_TABS.map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        className={`designer-tab${tab === t.id ? ' is-active' : ''}`}
                                        onClick={() => setTab(t.id)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {tab === 'basic' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="field">
                                        <label className="f-label"><span className="req">*</span>节点名称</label>
                                        <input className="f-input" value={selectedNode.label} disabled={readOnly}
                                            onChange={(e) => patchNode(selectedNode.id, { label: e.target.value })} />
                                    </div>
                                    <div className="field">
                                        <label className="f-label">节点类型</label>
                                        <select value={selectedNode.kind} disabled={readOnly || selectedNode.id === 'collection'}
                                            onChange={(e) => patchNode(selectedNode.id, { kind: e.target.value as NodeKind })}>
                                            {(Object.keys(KIND_LABEL) as NodeKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                                        </select>
                                        <span className="f-hint">自动节点无需人工处置；并行节点与主流程同时推进。</span>
                                    </div>
                                    <div className="designer-switch-row">
                                        <span style={{ fontSize: 13 }}>可选节点（按条件触发）</span>
                                        {readOnly
                                            ? <span className="badge gray">{selectedNode.optional ? '已开启' : '已关闭'}</span>
                                            : <Switch checked={selectedNode.optional} onChange={(v) => patchNode(selectedNode.id, { optional: v })} />}
                                    </div>
                                    <div className="field">
                                        <label className="f-label">触发条件</label>
                                        <input className="f-input" value={selectedNode.condition ?? ''} disabled={readOnly}
                                            placeholder="如：施工节点完成且材料清单已上传"
                                            onChange={(e) => patchNode(selectedNode.id, { condition: e.target.value })} />
                                        <span className="f-hint">用于说明可选节点 / 自定义节点的进入条件，便于后续流程扩展。</span>
                                    </div>
                                    <div className="designer-node-actions">
                                        <button className="btn btn-ghost btn-sm" disabled={readOnly || selectedNode.id === 'create' || branchNodes.findIndex((n) => n.id === selectedNode.id) <= 0}
                                            onClick={() => moveNode(selectedNode.id, -1)}><ArrowUp size={14} /> 上移</button>
                                        <button className="btn btn-ghost btn-sm" disabled={readOnly || selectedNode.id === 'create' || branchNodes.findIndex((n) => n.id === selectedNode.id) >= branchNodes.length - 1}
                                            onClick={() => moveNode(selectedNode.id, 1)}><ArrowDown size={14} /> 下移</button>
                                        {selectedNode.id !== 'collection' && (
                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }}
                                                disabled={readOnly || selectedNode.id === 'create'} onClick={() => deleteNode(selectedNode.id)}>
                                                <Trash2 size={14} /> 删除节点
                                            </button>
                                        )}
                                    </div>
                                    {selectedNode.id === 'create' && <span className="f-hint">创建节点为流程固定起点，不可删除。</span>}
                                </div>
                            )}

                            {tab === 'perm' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div className="field">
                                        <label className="f-label">处置权限</label>
                                        <span className="badge blue" style={{ alignSelf: 'flex-start' }}><ShieldCheck size={13} /> {permissionNameOf(selectedNode)}</span>
                                        <span className="f-hint">权限名称按节点名称自动生成，岗位配置页按此权限名绑定。</span>
                                    </div>
                                    <div className="field">
                                        <label className="f-label">可处置岗位</label>
                                        <div className="designer-check-grid">
                                            {POSITIONS.map((p) => {
                                                const checked = (selectedPerm ?? fallbackPerm).positions.includes(p.id);
                                                return (
                                                    <label key={p.id} className={`designer-check${checked ? ' is-on' : ''}`}>
                                                        <input type="checkbox" checked={checked} disabled={readOnly}
                                                            style={{ accentColor: 'var(--brand)' }}
                                                            onChange={() => patchPerm(selectedNode.id, {
                                                                positions: checked
                                                                    ? (selectedPerm ?? fallbackPerm).positions.filter((x) => x !== p.id)
                                                                    : [...(selectedPerm ?? fallbackPerm).positions, p.id],
                                                            })} />
                                                        {p.name}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label className="f-label">查看范围</label>
                                        <select value={(selectedPerm ?? fallbackPerm).viewScope} disabled={readOnly}
                                            onChange={(e) => patchPerm(selectedNode.id, { viewScope: e.target.value as NodePermission['viewScope'] })}>
                                            {(Object.keys(VIEW_SCOPE_LABEL) as NodePermission['viewScope'][]).map((k) => <option key={k} value={k}>{VIEW_SCOPE_LABEL[k]}</option>)}
                                        </select>
                                    </div>
                                    <div className="designer-switch-row">
                                        <span style={{ fontSize: 13 }}>允许转交</span>
                                        {readOnly
                                            ? <span className="badge gray">{(selectedPerm ?? fallbackPerm).allowTransfer ? '已开启' : '已关闭'}</span>
                                            : <Switch checked={(selectedPerm ?? fallbackPerm).allowTransfer} onChange={(v) => patchPerm(selectedNode.id, { allowTransfer: v })} />}
                                    </div>
                                    <div className="designer-switch-row">
                                        <span style={{ fontSize: 13 }}>允许撤回</span>
                                        {readOnly
                                            ? <span className="badge gray">{(selectedPerm ?? fallbackPerm).allowWithdraw ? '已开启' : '已关闭'}</span>
                                            : <Switch checked={(selectedPerm ?? fallbackPerm).allowWithdraw} onChange={(v) => patchPerm(selectedNode.id, { allowWithdraw: v })} />}
                                    </div>
                                    <div className="designer-switch-row">
                                        <span style={{ fontSize: 13 }}>结束服务会签</span>
                                        {readOnly
                                            ? <span className="badge gray">{(selectedPerm ?? fallbackPerm).allowSign ? '已开启' : '已关闭'}</span>
                                            : <Switch checked={(selectedPerm ?? fallbackPerm).allowSign} onChange={(v) => patchPerm(selectedNode.id, { allowSign: v })} />}
                                    </div>
                                    <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav.go('position-config')}>
                                        去岗位配置管理岗位
                                    </button>
                                </div>
                            )}

                            {tab === 'form' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>节点表单字段</span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => openNewField(selectedNode.id)} disabled={readOnly}>
                                            <Plus size={13} /> 添加字段
                                        </button>
                                    </div>
                                    {selectedFields.length === 0 && <div className="empty" style={{ padding: 24 }}>该节点尚未配置表单字段</div>}
                                    {selectedFields.map((f, idx) => (
                                        <div className="designer-field-row" key={f.id}>
                                            <div className="dfr-main" onClick={() => { if (!readOnly) openEditField(selectedNode.id, f); }}>
                                                <div className="dfr-label">
                                                    {f.label || '未命名字段'}
                                                    {f.required && <span style={{ color: 'var(--error)' }}> *</span>}
                                                </div>
                                                <div className="dfr-meta">
                                                    {FIELD_TYPE_LABEL[f.type]} · {f.visibility === 'handler' ? '仅处置人可见' : '全部可见'}
                                                    {f.editable && ' · 可编辑'}
                                                </div>
                                            </div>
                                            <button className="dfr-btn" disabled={readOnly || idx === 0} onClick={() => moveField(selectedNode.id, f.id, -1)} aria-label="上移字段"><ArrowUp size={13} /></button>
                                            <button className="dfr-btn" disabled={readOnly || idx === selectedFields.length - 1} onClick={() => moveField(selectedNode.id, f.id, 1)} aria-label="下移字段"><ArrowDown size={13} /></button>
                                            <button className="dfr-btn danger" disabled={readOnly} onClick={() => removeField(selectedNode.id, f.id)} aria-label="删除字段"><Trash2 size={13} /></button>
                                        </div>
                                    ))}

                                    {selectedFields.length > 0 && (
                                        <div className="designer-form-preview">
                                            <div className="dfp-title"><FileText size={13} style={{ verticalAlign: -2, marginRight: 4 }} />表单预览</div>
                                            {selectedFields.map((f) => (
                                                <div className="dfp-field" key={`p-${f.id}`}>
                                                    <div className="dfp-label">{f.label}{f.required && <span className="req"> *</span>}</div>
                                                    <FieldPreview field={f} />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {tab === 'timeout' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {selectedNode.id === 'create' ? (
                                        <div className="empty">创建节点为服务单发起动作，不参与超时监控</div>
                                    ) : (
                                        <>
                                            <div className="designer-switch-row">
                                                <span style={{ fontSize: 13 }}>启用超时监控</span>
                                                {readOnly
                                                    ? <span className="badge gray">{selectedTimeout?.enabled ? '已开启' : '已关闭'}</span>
                                                    : <Switch checked={selectedTimeout?.enabled ?? false} onChange={(v) => patchTimeout(selectedNode.id, { enabled: v })} />}
                                            </div>
                                            <div className="field">
                                                <label className="f-label">时限单位</label>
                                                <select value={selectedTimeout?.unit ?? 'hour'} disabled={readOnly}
                                                    onChange={(e) => patchTimeout(selectedNode.id, { unit: e.target.value as TimeoutUnit })}>
                                                    <option value="hour">小时</option>
                                                    <option value="workday">工作日（按 8 小时 / 日折算）</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                                <div className="field">
                                                    <label className="f-label">接收</label>
                                                    <input className="f-input" type="number" min={1} disabled={readOnly}
                                                        value={selectedTimeout?.receive ?? ''}
                                                        onChange={(e) => patchTimeout(selectedNode.id, { receive: e.target.value === '' ? null : Number(e.target.value) })} />
                                                </div>
                                                <div className="field">
                                                    <label className="f-label">预警</label>
                                                    <input className="f-input" type="number" min={1} disabled={readOnly}
                                                        value={selectedTimeout?.warning ?? ''}
                                                        onChange={(e) => patchTimeout(selectedNode.id, { warning: Number(e.target.value) })} />
                                                </div>
                                                <div className="field">
                                                    <label className="f-label">告警</label>
                                                    <input className="f-input" type="number" min={1} disabled={readOnly}
                                                        value={selectedTimeout?.alarm ?? ''}
                                                        onChange={(e) => patchTimeout(selectedNode.id, { alarm: Number(e.target.value) })} />
                                                </div>
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                                                进入节点起算，需满足 接收 ≤ 预警 ≤ 告警；达到阈值后的渠道、收件人与模板在「通知与超时」页配置。
                                            </p>
                                            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav.go('notify-config')}>
                                                去配置节点通知规则
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </aside>
            </div>

            {issues && issues.length > 0 && (
                <div className="card" style={{ borderColor: 'var(--error)', background: 'var(--error-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 14, fontWeight: 500 }}>
                        <AlertTriangle size={16} /> 校验结果（{issues.filter((i) => i.level === 'error').length} 错误 / {issues.filter((i) => i.level === 'warn').length} 提醒）
                    </div>
                    <ul className="designer-issues">
                        {issues.map((it, i) => (
                            <li key={i} className={it.level === 'warn' ? 'is-warn' : ''}>
                                {it.level === 'warn' ? '提醒：' : '错误：'}{it.text}
                                {it.nodeId && <span className="link" onClick={() => setSelectedId(it.nodeId!)}>定位节点</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {notice && (
                <div className="card" style={{
                    borderColor: notice.kind === 'success' ? 'var(--success)' : notice.kind === 'error' ? 'var(--error)' : 'var(--brand)',
                    background: notice.kind === 'success' ? 'var(--success-soft)' : notice.kind === 'error' ? 'var(--error-soft)' : 'var(--brand-soft)',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500,
                        color: notice.kind === 'success' ? 'var(--success)' : notice.kind === 'error' ? 'var(--error)' : 'var(--brand)',
                    }}>
                        {notice.kind === 'success' ? <Check size={16} /> : notice.kind === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
                        {notice.title}
                    </div>
                    {notice.desc && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{notice.desc}</div>}
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setNotice(null)}>知道了</button>
                </div>
            )}

            {addOpen && (
                <Modal title="新增自定义节点" onClose={() => setAddOpen(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>取消</button>
                        <button className="btn btn-primary" onClick={addCustomNode} disabled={!newNodeName.trim()}>创建</button>
                    </>}>
                    <div className="field">
                        <label className="f-label"><span className="req">*</span>节点名称</label>
                        <input className="f-input" value={newNodeName} placeholder="如：材料验收、消防复检"
                            onChange={(e) => setNewNodeName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addCustomNode(); }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                        新增节点会插入当前分支末尾前，默认无处置岗位；创建后请在「处置权限」绑定岗位，否则校验不通过。
                    </p>
                </Modal>
            )}

            {fieldModal && (
                <Modal title={fieldModal.isNew ? '添加表单字段' : `编辑字段 · ${fieldModal.field.label || '未命名'}`} onClose={() => setFieldModal(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setFieldModal(null)}>取消</button>
                        <button className="btn btn-primary" onClick={saveField} disabled={!fieldModal.field.label.trim()}>保存</button>
                    </>}>
                    <div className="field">
                        <label className="f-label"><span className="req">*</span>字段名称</label>
                        <input className="f-input" value={fieldModal.field.label} placeholder="如：审核结论、施工时间"
                            onChange={(e) => patchFieldDraft({ label: e.target.value })} />
                    </div>
                    <div className="field">
                        <label className="f-label">字段类型</label>
                        <select value={fieldModal.field.type} onChange={(e) => patchFieldDraft({ type: e.target.value as FieldType })}>
                            {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABEL[t]}</option>)}
                        </select>
                    </div>
                    {OPTION_TYPES.includes(fieldModal.field.type) && (
                        <div className="field">
                            <label className="f-label">选项（每行一个）</label>
                            <textarea className="f-input" rows={4} value={fieldModal.field.options ?? ''} placeholder="审核通过&#10;驳回"
                                onChange={(e) => patchFieldDraft({ options: e.target.value })} />
                        </div>
                    )}
                    <div className="field">
                        <label className="f-label">占位提示</label>
                        <input className="f-input" value={fieldModal.field.placeholder ?? ''} placeholder="选填"
                            onChange={(e) => patchFieldDraft({ placeholder: e.target.value })} />
                    </div>
                    <div className="designer-switch-row">
                        <span style={{ fontSize: 13 }}>必填字段</span>
                        <Switch checked={fieldModal.field.required} onChange={(v) => patchFieldDraft({ required: v })} />
                    </div>
                    <div className="field">
                        <label className="f-label">可见范围</label>
                        <select value={fieldModal.field.visibility} onChange={(e) => patchFieldDraft({ visibility: e.target.value as FormField['visibility'] })}>
                            <option value="all">全部可见</option>
                            <option value="handler">仅处置人可见</option>
                        </select>
                    </div>
                    <div className="designer-switch-row">
                        <span style={{ fontSize: 13 }}>处置人可编辑</span>
                        <Switch checked={fieldModal.field.editable} onChange={(v) => patchFieldDraft({ editable: v })} />
                    </div>
                </Modal>
            )}

            {publishOpen && (
                <Modal title={`发布 v${draftVersion} 草稿`} onClose={() => setPublishOpen(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setPublishOpen(false)}>取消</button>
                        <button className="btn btn-primary" onClick={confirmPublish}>确认发布</button>
                    </>}>
                    <div className="banner warn">
                        <span className="bn-icon"><AlertTriangle size={16} /></span>
                        <div className="bn-main">
                            <div className="bn-title">发布影响提示</div>
                            <div className="bn-sub">
                                发布后新发起的服务单按 v{draftVersion} 执行；在途服务单保持原版本，不重算已生成的节点时限。
                                本次为原型演示，发布结果仅在设计器版本记录与预览内生效，不写入后端。
                            </div>
                        </div>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>
                        当前分支 {FLOW_BRANCHES.find((b) => b.id === branch)?.label}：{branchNodes.length} 个节点，
                        表单字段 {branchNodes.reduce((sum, n) => sum + (state.fields[n.id]?.length ?? 0), 0)} 个。
                    </p>
                </Modal>
            )}

            {previewOpen && (
                <Modal title={`流程预览 · ${FLOW_BRANCHES.find((b) => b.id === branch)?.label}`} width={760} onClose={() => setPreviewOpen(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setPreviewStep((v) => Math.max(0, v - 1))} disabled={previewStep === 0}>
                            <ChevronLeft size={15} /> 上一步
                        </button>
                        <button className="btn btn-primary" onClick={() => setPreviewStep((v) => Math.min(Math.max(previewNodes.length - 1, 0), v + 1))}
                            disabled={previewStep >= previewNodes.length - 1}>
                            下一步 <ChevronRight size={15} />
                        </button>
                        <button className="btn btn-ghost" onClick={() => setPreviewOpen(false)}>关闭</button>
                    </>}>
                    <div className="preview-steps">
                        {previewNodes.map((n, i) => (
                            <React.Fragment key={n.id}>
                                {i > 0 && <span className="preview-arrow"><ChevronRight size={13} /></span>}
                                <span className={`preview-step${i === previewStep ? ' is-current' : i < previewStep ? ' is-done' : ''}`}>
                                    {i < previewStep ? '✓ ' : ''}{n.label || '未命名'}
                                </span>
                            </React.Fragment>
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                        第 {Math.min(previewStep + 1, Math.max(previewNodes.length, 1))} / {previewNodes.length} 步；合同收款为并行支线，不在主流程步进中展示。
                    </p>
                    {activePreview && (
                        <div className="preview-node">
                            <div className="pn-head">
                                <span className="pn-title">{activePreview.label || '未命名节点'}</span>
                                <span className="badge blue">{permissionNameOf(activePreview)}</span>
                            </div>
                            {(state.fields[activePreview.id] ?? []).length === 0 ? (
                                <div className="empty" style={{ padding: 16 }}>该节点无需填写表单，直接推进</div>
                            ) : (
                                (state.fields[activePreview.id] ?? []).map((f) => (
                                    <div className="dfp-field" key={`pv-${f.id}`}>
                                        <div className="dfp-label">{f.label}{f.required && <span className="req"> *</span>}</div>
                                        <FieldPreview field={f} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </Modal>
            )}
        </AdminShell>
    );
}
