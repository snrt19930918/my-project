// 系统配置：流程编排 + 岗位配置 + 通知与超时
import React, { useState } from 'react';
import { Save, ChevronRight, Plus, Trash2, ShieldCheck, AlertTriangle, Mail } from 'lucide-react';
import { type AdminNav, AdminShell, Switch, Modal } from '../components';
import {
    FLOW_BRANCHES, FLOW_PARALLEL, NODES, NODE_PERMISSIONS, POSITIONS, ADMIN_PERMISSIONS,
    NODE_TIMEOUT_RULES, NOTIFY_EVENTS, NOTIFICATION_RULES, NOTIFY_NODE_SCOPES,
    MAIL_TEMPLATES, RECIPIENTS, CUSTOMER_ALLOWED_EVENTS,
    formatTimeout, formatTimeoutShort,
    type NodeId, type Position, type AdminPermissionId, type NodeTimeoutRule, type TimeoutUnit,
    type NotificationRule, type NotifyEventId, type NotifyScope, type RecipientId,
} from '../data';

export function FlowConfig({ nav }: { nav: AdminNav }) {
    const [branch, setBranch] = useState(FLOW_BRANCHES[0].id);
    const [selected, setSelected] = useState<NodeId | null>(null);
    const [timeouts, setTimeouts] = useState<NodeTimeoutRule[]>(NODE_TIMEOUT_RULES);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const active = FLOW_BRANCHES.find((b) => b.id === branch)!;
    const selNode = selected ? NODES.find((n) => n.id === selected) : null;
    const selPermission = selNode ? NODE_PERMISSIONS[selNode.id] : '';
    const holders = selNode ? POSITIONS.filter((p) => p.permissions.includes(selNode.id)).map((p) => p.name) : [];
    const selTimeout = selected ? timeouts.find((t) => t.nodeId === selected) ?? null : null;
    const ruleOf = (nodeId: NodeId) => timeouts.find((t) => t.nodeId === nodeId);

    const patchTimeout = (patch: Partial<NodeTimeoutRule>) => {
        if (!selected) return;
        setTimeouts(timeouts.map((t) => (t.nodeId === selected ? { ...t, ...patch } : t)));
        setSaved(false);
        setError(null);
    };

    const applyToAll = () => {
        if (!selTimeout) return;
        setTimeouts(timeouts.map((t) => (t.nodeId === 'create' ? t : {
            ...t,
            receiveValue: selTimeout.receiveValue,
            warningValue: selTimeout.warningValue,
            alarmValue: selTimeout.alarmValue,
            unit: selTimeout.unit,
            enabled: selTimeout.enabled,
        })));
        setSaved(false);
        setError(null);
    };

    const saveFlow = () => {
        const invalid = timeouts.find((t) => {
            if (!t.enabled || t.nodeId === 'create') return false;
            const badNumber = [t.receiveValue, t.warningValue, t.alarmValue]
                .some((v) => v === null || !Number.isFinite(v) || (v as number) <= 0);
            if (badNumber) return true;
            return (t.receiveValue as number) > t.warningValue || t.warningValue > t.alarmValue;
        });
        if (invalid) {
            const label = NODES.find((n) => n.id === invalid.nodeId)?.label ?? invalid.nodeId;
            setError(`「${label}」超时规则不合法：时限需为正整数，且 接收时限 ≤ 预警时限 ≤ 告警时限`);
            setSaved(false);
            return;
        }
        setError(null);
        setSaved(true);
    };

    return (
        <AdminShell nav={nav} page="flow-config" crumb={['系统配置', '流程编排']} title="流程编排" sub="服务类型分支、节点流转规则与节点级超时阈值"
            actions={
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => nav.go('flow-designer')}>在流程设计器中编辑 <ChevronRight size={15} /></button>
                    <button className="btn btn-primary" onClick={saveFlow}><Save size={16} /> 保存配置</button>
                </div>
            }>
            <div className="card">
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {FLOW_BRANCHES.map((b) => (
                        <button key={b.id} className={`btn btn-sm ${branch === b.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setBranch(b.id); setSelected(null); }}>{b.label}</button>
                    ))}
                </div>
                <div className="flow-canvas">
                    {active.nodes.map((nid, i) => {
                        const n = NODES.find((x) => x.id === nid)!;
                        const isSel = selected === nid;
                        return (
                            <React.Fragment key={nid}>
                                {i > 0 && <span className="flow-arrow"><ChevronRight size={18} /></span>}
                                <div className="flow-node">
                                    <div className={`fn-box ${n.optional ? 'is-optional' : ''} ${isSel ? 'is-current' : ''}`} onClick={() => setSelected(nid)}>
                                        <div className="fn-name">{n.label}</div>
                                        <div className="fn-role">{NODE_PERMISSIONS[n.id]}</div>
                                        <div className="fn-role" style={{ color: ruleOf(nid)?.enabled ? 'var(--text-2)' : 'var(--text-3)' }}>
                                            {nid === 'create'
                                                ? '超时 不适用'
                                                : ruleOf(nid)?.enabled
                                                    ? `预警 ${formatTimeoutShort(ruleOf(nid)!.warningValue, ruleOf(nid)!.unit)} · 告警 ${formatTimeoutShort(ruleOf(nid)!.alarmValue, ruleOf(nid)!.unit)}`
                                                    : '超时 未启用'}
                                        </div>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '12px 0 0' }}>虚线节点为可选节点：评估指派仅在项目未配置跟进人员时触发；审图 / 施工 / 申报 / 验收按已签合同的服务项动态生成。</p>

                <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>并行支线 · 合同收款</div>
                    <div className="flow-canvas" style={{ padding: '14px 16px' }}>
                        {FLOW_PARALLEL.map((nid) => {
                            const n = NODES.find((x) => x.id === nid)!;
                            return (
                                <div className="flow-node" key={nid}>
                                    <div className={`fn-box ${selected === nid ? 'is-current' : ''}`} onClick={() => setSelected(nid)}>
                                        <div className="fn-name">{n.label}</div>
                                        <div className="fn-role">{NODE_PERMISSIONS[n.id]}</div>
                                    </div>
                                </div>
                            );
                        })}
                        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 14 }}>
                            与主流程并行；全部合同收款 100% 且服务支线完结后，服务单才最终办结。
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title"><span>{selNode ? `节点处置权限 · ${selNode.label}` : '节点处置权限'}</span></div>
                    {selNode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="field">
                                <label className="f-label">处置权限</label>
                                <div><span className="badge blue"><ShieldCheck size={14} /> {selPermission}</span></div>
                                <span className="f-hint">权限名称按处置节点操作权限自动命名</span>
                            </div>
                            <div className="field">
                                <label className="f-label">可处置岗位（已绑定该权限）</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {holders.length === 0
                                        ? <span style={{ fontSize: 13, color: 'var(--text-3)' }}>暂无可处置岗位，请先到「岗位配置」绑定</span>
                                        : holders.map((h) => <span key={h} className="badge green">{h}</span>)}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav.go('position-config')}>去岗位配置绑定权限</button>
                        </div>
                    ) : <div className="empty">点击上方节点查看处置权限</div>}
                </div>

                <div className="card">
                    <div className="card-title">
                        <span>{selNode ? `超时规则 · ${selNode.label}` : '超时规则'}</span>
                        {selTimeout && selTimeout.nodeId !== 'create'
                            ? <span className="link" onClick={applyToAll}>应用到全部节点</span>
                            : null}
                    </div>
                    {!selNode || !selTimeout ? (
                        <div className="empty">点击上方节点，配置该节点的接收 / 预警 / 告警时限</div>
                    ) : selTimeout.nodeId === 'create' ? (
                        <div className="empty">创建节点为服务单发起动作，不参与超时监控</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13 }}>启用超时监控</span>
                                <Switch checked={selTimeout.enabled} onChange={(v) => patchTimeout({ enabled: v })} />
                            </div>
                            <div className="field">
                                <label className="f-label">时限单位</label>
                                <select value={selTimeout.unit} onChange={(e) => patchTimeout({ unit: e.target.value as TimeoutUnit })}>
                                    <option value="hour">小时</option>
                                    <option value="workday">工作日（按 8 小时 / 日折算）</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                                <div className="field">
                                    <label className="f-label">接收时限</label>
                                    <input className="f-input" type="number" min={1} value={selTimeout.receiveValue ?? ''}
                                        onChange={(e) => patchTimeout({ receiveValue: e.target.value === '' ? null : Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label className="f-label">预警时限</label>
                                    <input className="f-input" type="number" min={1} value={selTimeout.warningValue}
                                        onChange={(e) => patchTimeout({ warningValue: Number(e.target.value) })} />
                                </div>
                                <div className="field">
                                    <label className="f-label">告警时限</label>
                                    <input className="f-input" type="number" min={1} value={selTimeout.alarmValue}
                                        onChange={(e) => patchTimeout({ alarmValue: Number(e.target.value) })} />
                                </div>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                                进入节点起算；需满足 接收 ≤ 预警 ≤ 告警。到达预警 / 告警时限后，按「通知与超时」中该节点的事件规则推送。
                                工作日按 8 小时 / 日折算，节假日顺延与工作日历为后续规划。
                                {!selTimeout.enabled && ' 当前节点未启用超时监控，不会产生预警 / 告警通知。'}
                            </p>
                            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav.go('notify-config')}>
                                去配置该节点通知规则
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', background: 'var(--error-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 14, fontWeight: 500 }}>
                        <AlertTriangle size={16} /> 配置未保存
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{error}</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setError(null)}>知道了</button>
                </div>
            )}

            {saved && (
                <div className="card" style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
                    <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>流程配置已保存生效</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                        新发起的服务单按更新后的流转规则执行；已进入节点并生成时限的服务单保持原时限、不重算，新进入节点按新的超时阈值计算。
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setSaved(false)}>知道了</button>
                </div>
            )}
        </AdminShell>
    );
}

export function PositionConfig({ nav }: { nav: AdminNav }) {
    const [positions, setPositions] = useState<Position[]>(POSITIONS);
    const [selectedId, setSelectedId] = useState(POSITIONS[0].id);
    const [saved, setSaved] = useState(false);
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [removing, setRemoving] = useState<Position | null>(null);

    const selected = positions.find((p) => p.id === selectedId) ?? positions[0];

    const togglePerm = (nodeId: NodeId) => {
        setPositions(positions.map((p) => p.id === selectedId
            ? { ...p, permissions: p.permissions.includes(nodeId) ? p.permissions.filter((x) => x !== nodeId) : [...p.permissions, nodeId] }
            : p));
    };

    const toggleAdminPerm = (permId: AdminPermissionId) => {
        setPositions(positions.map((p) => p.id === selectedId
            ? { ...p, adminPermissions: p.adminPermissions.includes(permId) ? p.adminPermissions.filter((x) => x !== permId) : [...p.adminPermissions, permId] }
            : p));
    };

    const addPosition = () => {
        if (!newName.trim()) return;
        const id = 'pos' + Date.now();
        setPositions([...positions, { id, name: newName.trim(), permissions: [], adminPermissions: [] }]);
        setSelectedId(id);
        setNewName('');
        setAdding(false);
    };

    const removePosition = (p: Position) => {
        setPositions(positions.filter((x) => x.id !== p.id));
        if (selectedId === p.id) setSelectedId(positions[0]?.id ?? '');
        setRemoving(null);
    };

    return (
        <AdminShell nav={nav} page="position-config" crumb={['系统配置', '岗位配置']} title="岗位配置" sub="自定义岗位并绑定节点处置权限与后台管理权限，系统按岗位权限判断节点操作与后台模块访问"
            actions={<button className="btn btn-primary" onClick={() => setSaved(true)}><Save size={16} /> 保存配置</button>}>
            <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start' }}>
                <div className="card">
                    <div className="card-title">
                        <span>岗位列表</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}><Plus size={14} /> 新增岗位</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {positions.map((p) => {
                            const isSel = p.id === selectedId;
                            const isCustom = p.id.startsWith('pos');
                            return (
                                <div key={p.id} className={`notif-row`} style={isSel ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 2px var(--brand-soft)' } : undefined}>
                                    <div className="nr-main" style={{ cursor: 'pointer' }} onClick={() => setSelectedId(p.id)}>
                                        <div className="nr-name">{p.name}</div>
                                        <div className="nr-desc">节点权限 {p.permissions.length} 项 · 后台权限 {p.adminPermissions.length} 项</div>
                                    </div>
                                    {isCustom && (
                                        <button type="button" style={{ border: 0, background: 'transparent', color: 'var(--error)', cursor: 'pointer', display: 'flex' }} onClick={() => setRemoving(p)} aria-label="删除岗位"><Trash2 size={16} /></button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card">
                    <div className="card-title"><span>权限绑定 · {selected.name}</span></div>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px' }}>
                        节点处置权限决定服务单节点操作；后台管理权限决定 Web 管理后台可访问的功能模块。两类权限相互独立，可同时绑定。
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>节点处置权限</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>已绑定 {selected.permissions.length} 项</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>勾选该岗位可处置的节点；权限名称按处置节点操作权限命名。</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {NODES.map((n) => {
                            const checked = selected.permissions.includes(n.id);
                            return (
                                <label key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${checked ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: checked ? 'var(--brand-soft)' : '#fff' }}>
                                    <input type="checkbox" checked={checked} onChange={() => togglePerm(n.id)} style={{ accentColor: 'var(--brand)' }} />
                                    <span style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{n.label}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{NODE_PERMISSIONS[n.id]}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    <div style={{ height: 1, background: 'var(--border)', margin: '20px 0 16px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <ShieldCheck size={15} color="var(--brand)" /> 后台管理权限（Web 管理后台）
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>已绑定 {selected.adminPermissions.length} 项</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>
                        控制后台功能模块访问；未开通业务管理员的岗位，其用户登录后台仅可查看、处理本人相关的服务单。
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {ADMIN_PERMISSIONS.map((p) => {
                            const checked = selected.adminPermissions.includes(p.id);
                            return (
                                <label key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', border: `1px solid ${checked ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: checked ? 'var(--brand-soft)' : '#fff' }}>
                                    <input type="checkbox" checked={checked} onChange={() => toggleAdminPerm(p.id)} style={{ accentColor: 'var(--brand)', marginTop: 2 }} />
                                    <span style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6, marginTop: 2 }}>{p.desc}</span>
                                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>可用模块：{p.scope}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </div>

            {adding && (
                <Modal title="新增岗位" onClose={() => setAdding(false)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setAdding(false)}>取消</button>
                        <button className="btn btn-primary" onClick={addPosition} disabled={!newName.trim()}>创建</button>
                    </>}>
                    <div className="field"><label className="f-label"><span className="req">*</span>岗位名称</label><input className="f-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="如：材料员、监理员" onKeyDown={(e) => { if (e.key === 'Enter') addPosition(); }} /></div>
                </Modal>
            )}

            {removing && (
                <Modal title="确认删除岗位" onClose={() => setRemoving(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setRemoving(null)}>取消</button>
                        <button className="btn btn-danger" onClick={() => removePosition(removing)}>确认删除</button>
                    </>}>
                    <p style={{ color: 'var(--text-2)', margin: 0 }}>删除后「{removing.name}」将失去全部节点处置权限，关联员工需重新绑定岗位。</p>
                </Modal>
            )}

            {saved && (
                <div className="card" style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
                    <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>岗位配置已保存生效</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>节点处置权限与后台管理权限调整后，相关账号重新登录即可按新权限加载菜单与数据范围。</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setSaved(false)}>知道了</button>
                </div>
            )}
        </AdminShell>
    );
}

export function NotifyConfig({ nav }: { nav: AdminNav }) {
    const [rules, setRules] = useState<NotificationRule[]>(NOTIFICATION_RULES);
    const [scope, setScope] = useState<NotifyScope>('common');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState<NotificationRule | null>(null);
    const [previewKey, setPreviewKey] = useState('common|signoff');
    const [fallback, setFallback] = useState('项目经理 → 系统管理员');

    const eventDef = (id: NotifyEventId) => NOTIFY_EVENTS.find((e) => e.id === id)!;
    const scopeName = (s: NotifyScope) => (s === 'common' ? '通用事件' : NODES.find((n) => n.id === s)?.label ?? s);
    const ruleKey = (r: NotificationRule) => `${r.scope}|${r.eventId}`;
    const scopeRules = rules.filter((r) => r.scope === scope);
    const nodeTimeout = scope === 'common' ? null : NODE_TIMEOUT_RULES.find((t) => t.nodeId === scope) ?? null;
    const counts = (s: NotifyScope) => {
        const rs = rules.filter((r) => r.scope === s);
        return { enabled: rs.filter((r) => r.enabled).length, total: rs.length };
    };

    const patchRule = (eventId: NotifyEventId, patch: Partial<NotificationRule>) => {
        setRules(rules.map((r) => (r.scope === scope && r.eventId === eventId ? { ...r, ...patch } : r)));
        setSaved(false);
        setError(null);
    };

    const saveEditing = () => {
        if (!editing) return;
        setRules(rules.map((r) => (r.scope === editing.scope && r.eventId === editing.eventId ? editing : r)));
        setEditing(null);
        setSaved(false);
        setError(null);
    };

    const validate = (): string | null => {
        for (const r of rules) {
            if (!r.enabled) continue;
            const label = `${scopeName(r.scope)} · ${eventDef(r.eventId).name}`;
            const ch = r.channels;
            if (!ch.app && !ch.mini && !ch.email) return `「${label}」至少需启用一个推送渠道`;
            if (r.recipients.length === 0) return `「${label}」未配置收件人`;
            if (ch.email && !r.templateId) return `「${label}」已开启邮件渠道但未选择邮件模板`;
        }
        return null;
    };

    const saveNotify = () => {
        const err = validate();
        if (err) { setError(err); setSaved(false); return; }
        setError(null);
        setSaved(true);
    };

    // 预览：随「节点 + 事件 + 模板」联动，占位符按事件上下文填充
    const previewRule = rules.find((r) => ruleKey(r) === previewKey) ?? scopeRules[0] ?? rules[0];
    const previewNode = previewRule.scope === 'common' ? null : previewRule.scope;
    const previewTimeout = previewNode ? NODE_TIMEOUT_RULES.find((t) => t.nodeId === previewNode) ?? null : null;
    const previewTemplate = MAIL_TEMPLATES.find((t) => t.id === previewRule.templateId)
        ?? MAIL_TEMPLATES.find((t) => t.eventId === previewRule.eventId);
    const previewVars: Record<string, string> = {
        编号: 'FW20260920006',
        节点: previewNode ? scopeName(previewNode) : '审图',
        处理人: '孙磊',
        时限: previewTimeout ? formatTimeout(previewTimeout.warningValue, previewTimeout.unit) : '24 小时',
        超时时长: '2 小时',
        剩余时限: '4 小时',
        驳回意见: '图纸缺少消防点位标注',
        合同类型: '仅施工',
        未收比例: '40%',
        发起人: '张伟',
        原因: '客户取消剩余施工',
        会签进度: '1 / 2',
        结束时间: '2026-10-20 14:30',
    };
    const previewBody = previewTemplate
        ? previewTemplate.body.replace(/\{([^}]+)\}/g, (_, k: string) => previewVars[k] ?? `{${k}}`)
        : '该事件暂未配置邮件模板';

    const toggleRecipient = (id: RecipientId) => {
        if (!editing) return;
        setEditing({
            ...editing,
            recipients: editing.recipients.includes(id)
                ? editing.recipients.filter((x) => x !== id)
                : [...editing.recipients, id],
        });
    };

    return (
        <AdminShell nav={nav} page="notify-config" crumb={['系统配置', '通知与超时']} title="通知与超时"
            sub="按节点配置事件推送渠道、收件人与模板；超时阈值在「流程编排」按节点维护，本页只读引用"
            actions={<button className="btn btn-primary" onClick={saveNotify}><Save size={16} /> 保存配置</button>}>
            <div className="banner info" style={{ marginBottom: 16 }}>
                <div className="bn-main">
                    <div className="bn-title">配置口径</div>
                    <div className="bn-sub">
                        超时阈值（接收 / 预警 / 告警）归流程编排，按节点维护；本页负责「节点 × 事件」的分发策略：
                        走哪些渠道、发给谁、用哪个模板、推送几次。已发送记录不随规则变更追溯。
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: '300px 1fr', alignItems: 'start' }}>
                <div className="card">
                    <div className="card-title"><span>配置范围</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(['common', ...NOTIFY_NODE_SCOPES] as NotifyScope[]).map((s) => {
                            const isSel = s === scope;
                            const c = counts(s);
                            const t = s === 'common' ? null : NODE_TIMEOUT_RULES.find((x) => x.nodeId === s) ?? null;
                            return (
                                <div key={s} className="notif-row"
                                    style={isSel ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 2px var(--brand-soft)' } : undefined}>
                                    <div className="nr-main" style={{ cursor: 'pointer' }} onClick={() => { setScope(s); setError(null); }}>
                                        <div className="nr-name">{s === 'common' ? '通用事件' : scopeName(s)}</div>
                                        <div className="nr-desc">
                                            已启用 {c.enabled}/{c.total} 条{t ? ` · ${t.enabled ? `${formatTimeoutShort(t.warningValue, t.unit)} / ${formatTimeoutShort(t.alarmValue, t.unit)}` : '超时未启用'}` : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">
                        <span>{scope === 'common' ? '通用事件 · 通知规则' : `${scopeName(scope)} · 通知规则`}</span>
                        {scope !== 'common' && (
                            <span className="link" onClick={() => nav.go('flow-config')}>去流程编排调整超时阈值</span>
                        )}
                    </div>

                    {scope !== 'common' && nodeTimeout && (
                        <div className="banner info" style={{ marginBottom: 14 }}>
                            <div className="bn-main">
                                <div className="bn-title">超时阈值来源：流程编排 · {scopeName(scope)}</div>
                                <div className="bn-sub">
                                    接收 {formatTimeout(nodeTimeout.receiveValue, nodeTimeout.unit)} → 预警 {formatTimeout(nodeTimeout.warningValue, nodeTimeout.unit)} → 告警 {formatTimeout(nodeTimeout.alarmValue, nodeTimeout.unit)}
                                    {!nodeTimeout.enabled && '；该节点未启用超时监控，预警 / 告警不会触发'}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {scopeRules.map((r) => {
                            const def = eventDef(r.eventId);
                            const tplOptions = MAIL_TEMPLATES.filter((t) => t.eventId === r.eventId);
                            const emailMissingTemplate = r.enabled && r.channels.email && !r.templateId;
                            return (
                                <div className="notif-row" key={ruleKey(r)} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, opacity: r.enabled ? 1 : 0.6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div className="nr-main">
                                            <div className="nr-name">
                                                {def.name}
                                                {def.timeout && <span className="badge orange" style={{ marginLeft: 8 }}>{def.timeout === 'warning' ? '到达预警时限' : '到达告警时限'}</span>}
                                                {!r.enabled && <span className="badge gray" style={{ marginLeft: 8 }}>未启用</span>}
                                            </div>
                                            <div className="nr-desc">
                                                {def.desc}
                                                {def.timeout && nodeTimeout && ` · 节点时限 ${formatTimeout(def.timeout === 'warning' ? nodeTimeout.warningValue : nodeTimeout.alarmValue, nodeTimeout.unit)}`}
                                            </div>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setPreviewKey(ruleKey(r))}>预览</button>
                                        <Switch checked={r.enabled} onChange={(v) => patchRule(r.eventId, { enabled: v })} />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                                        <div className="nr-channels">
                                            <span className="nr-channel">应用内 <Switch checked={r.channels.app} onChange={(v) => patchRule(r.eventId, { channels: { ...r.channels, app: v } })} /></span>
                                            <span className="nr-channel">小程序 <Switch checked={r.channels.mini} onChange={(v) => patchRule(r.eventId, { channels: { ...r.channels, mini: v } })} /></span>
                                            <span className="nr-channel">邮件 <Switch checked={r.channels.email} onChange={(v) => patchRule(r.eventId, { channels: { ...r.channels, email: v } })} /></span>
                                        </div>

                                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                            收件人：{r.recipients.length ? r.recipients.map((id) => RECIPIENTS.find((x) => x.id === id)?.label).join('、') : '未配置'}
                                        </span>
                                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>编辑收件人</button>

                                        {r.channels.email && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-3)' }}><Mail size={13} /> 模板</span>
                                                <select style={{ padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: '#fff', color: 'var(--text)' }}
                                                    value={r.templateId ?? ''} onChange={(e) => patchRule(r.eventId, { templateId: e.target.value || undefined })}>
                                                    <option value="">请选择模板</option>
                                                    {tplOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </span>
                                        )}

                                        {def.timeout && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>频次</span>
                                                <select style={{ padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: '#fff', color: 'var(--text)' }}
                                                    value={r.frequency ?? 'once'} onChange={(e) => patchRule(r.eventId, { frequency: e.target.value as 'once' | 'every24h3' })}>
                                                    <option value="once">仅推送 1 次</option>
                                                    <option value="every24h3">每 24 小时 1 次，最多 3 次</option>
                                                </select>
                                            </span>
                                        )}
                                    </div>

                                    {emailMissingTemplate && (
                                        <span style={{ fontSize: 12, color: 'var(--error)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <AlertTriangle size={13} /> 已开启邮件但未选择模板，保存时会被拦截
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-title"><span>兜底与升级</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="field">
                            <label className="f-label">节点无处理人时升级</label>
                            <select value={fallback} onChange={(e) => { setFallback(e.target.value); setSaved(false); }}>
                                <option>项目经理 → 系统管理员</option>
                                <option>仅系统管理员</option>
                                <option>项目经理 → 运营（抄送）</option>
                            </select>
                            <span className="f-hint">岗位空缺或项目未配置团队时，按此顺序兜底，避免通知丢失。</span>
                        </div>
                        <div className="field">
                            <label className="f-label">收件人去重</label>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>同一服务单 + 节点 + 事件 5 分钟内去重；跨节点合并时排除客户。</div>
                        </div>
                        <div className="field">
                            <label className="f-label">告警后仍超时</label>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>按告警频次重复推送，并进入概览驾驶舱「超时与预警待办」；不自动结束服务单。</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-title">
                        <span>模板预览</span>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
                            {scopeName(previewRule.scope)} · {eventDef(previewRule.eventId).name} · {previewTemplate?.name ?? '无模板'}
                        </span>
                    </div>
                    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, fontSize: 13, color: 'var(--text-2)', background: '#f8fafc', lineHeight: 1.7 }}>
                        {previewBody}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '10px 0 0' }}>
                        { previewRule.channels.email ? '预览按当前所选事件与模板渲染，示例数据不随服务单变化。' : '该事件当前未开启邮件渠道，此预览仅供模板核对。' }
                    </p>
                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" disabled title="发送记录为后续规划">查看发送记录</button>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center' }}>发送记录与失败重试 3 次为后续规划</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="card" style={{ borderColor: 'var(--error)', background: 'var(--error-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--error)', fontSize: 14, fontWeight: 500 }}>
                        <AlertTriangle size={16} /> 配置未保存
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{error}</div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setError(null)}>知道了</button>
                </div>
            )}

            {editing && (
                <Modal title={`编辑收件人 · ${eventDef(editing.eventId).name}`} onClose={() => setEditing(null)} width={520}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
                        <button className="btn btn-primary" onClick={saveEditing} disabled={editing.recipients.length === 0}>保存</button>
                    </>}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px' }}>
                        收件人按服务单与项目专属团队解析并自动去重；同一事件同一轮仅推送一次。客户仅接收进度类事件，超时告警强制排除。
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {RECIPIENTS.map((rc) => {
                            const checked = editing.recipients.includes(rc.id);
                            const customerBlocked = rc.id === 'customer' && !CUSTOMER_ALLOWED_EVENTS.includes(editing.eventId);
                            return (
                                <label key={rc.id} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                                    border: `1px solid ${checked ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 8,
                                    cursor: customerBlocked ? 'not-allowed' : 'pointer', opacity: customerBlocked ? 0.5 : 1,
                                    background: checked ? 'var(--brand-soft)' : '#fff',
                                }}>
                                    <input type="checkbox" checked={checked} disabled={customerBlocked} onChange={() => toggleRecipient(rc.id)} style={{ accentColor: 'var(--brand)', marginTop: 2 }} />
                                    <span style={{ flex: 1 }}>
                                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{rc.label}</span>
                                        <span style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                                            {rc.note}{customerBlocked && '（该事件不允许发送客户）'}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </Modal>
            )}

            {saved && (
                <div className="card" style={{ borderColor: 'var(--success)', background: 'var(--success-soft)' }}>
                    <div style={{ color: 'var(--success)', fontSize: 14, fontWeight: 500 }}>通知配置已保存生效</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
                        规则对新产生的事件即时生效；超时阈值仍以「流程编排」中该节点的配置为准，已进入节点的服务单按进入时的阈值计算。
                    </div>
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setSaved(false)}>知道了</button>
                </div>
            )}
        </AdminShell>
    );
}
