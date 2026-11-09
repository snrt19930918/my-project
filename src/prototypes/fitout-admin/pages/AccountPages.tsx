// 账号管理：员工账户 + 业主信息
import React, { useState } from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { type AdminNav, AdminShell, AccountBadge, Modal, SearchInput, Switch } from '../components';
import { STAFF_ACCOUNTS, OWNER_ACCOUNTS, type StaffAccount, type OwnerAccount } from '../data';

const ROLE_OPTIONS = ['绘图员', '项目经理', '报价员', '财务人员', '代办人员', '施工人员'];
const DEPT_OPTIONS = ['设计部', '工程部', '商务部', '财务部', '外勤部'];

export function StaffAccounts({ nav }: { nav: AdminNav }) {
    const [list, setList] = useState<StaffAccount[]>(STAFF_ACCOUNTS);
    const [kw, setKw] = useState('');
    const [role, setRole] = useState('全部');
    const [editing, setEditing] = useState<StaffAccount | null>(null);
    const [isNew, setIsNew] = useState(false);
    const [stopping, setStopping] = useState<StaffAccount | null>(null);

    const filtered = list.filter((a) => {
        const mKw = a.name.includes(kw) || a.phone.includes(kw);
        const mRole = role === '全部' || a.role === role;
        return mKw && mRole;
    });

    const openEdit = (a: StaffAccount) => { setIsNew(false); setEditing(a); };
    const openNew = () => { setIsNew(true); setEditing({ id: '', name: '', role: '绘图员', dept: '设计部', phone: '', status: '启用', createTime: '' }); };

    const save = () => {
        if (!editing) return;
        if (isNew) {
            setList([...list, { ...editing, id: 'a' + Date.now(), createTime: '2026-09-22 15:00' }]);
        } else {
            setList(list.map((a) => (a.id === editing.id ? editing : a)));
        }
        setEditing(null);
    };

    return (
        <AdminShell nav={nav} page="staff-accounts" crumb={['账号管理', '员工账户']} title="员工账户" sub="员工账户、岗位权限与所属团队管理"
            actions={<button className="btn btn-primary" onClick={openNew}><Plus size={16} /> 新增账户</button>}>
            <div className="card">
                <div className="toolbar">
                    <SearchInput value={kw} onChange={setKw} placeholder="搜索姓名或手机号" />
                    <select value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="全部">全部岗位</option>
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead><tr><th>姓名</th><th>岗位</th><th>部门</th><th>手机号</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>暂无匹配的账户</td></tr>
                        ) : filtered.map((a) => (
                            <tr key={a.id}>
                                <td className="td-main">{a.name}</td>
                                <td><span className="badge blue">{a.role}</span></td>
                                <td>{a.dept}</td>
                                <td style={{ color: 'var(--text-2)' }}>{a.phone}</td>
                                <td><AccountBadge status={a.status} /></td>
                                <td>
                                    <span className="op-link" onClick={() => openEdit(a)}>编辑</span>
                                    {a.status === '启用' ? <span className="op-link danger" onClick={() => setStopping(a)}>停用</span> : <span className="op-link" onClick={() => setList(list.map((x) => x.id === a.id ? { ...x, status: '启用' } : x))}>启用</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing && (
                <Modal title={isNew ? '新增员工账户' : '编辑员工账户'} onClose={() => setEditing(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
                        <button className="btn btn-primary" onClick={save}>保存</button>
                    </>}>
                    <div className="field"><label className="f-label"><span className="req">*</span>姓名</label><input className="f-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                    <div className="field"><label className="f-label"><span className="req">*</span>岗位</label>
                        <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>{ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}</select>
                    </div>
                    <div className="field"><label className="f-label">部门</label>
                        <select value={editing.dept} onChange={(e) => setEditing({ ...editing, dept: e.target.value })}>{DEPT_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
                    </div>
                    <div className="field"><label className="f-label"><span className="req">*</span>手机号</label><input className="f-input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="用于登录身份匹配" /></div>
                </Modal>
            )}

            {stopping && (
                <Modal title="确认停用账户" onClose={() => setStopping(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setStopping(null)}>取消</button>
                        <button className="btn btn-danger" onClick={() => { setList(list.map((a) => a.id === stopping.id ? { ...a, status: '停用' as const } : a)); setStopping(null); }}>确认停用</button>
                    </>}>
                    <p style={{ color: 'var(--text-2)', margin: 0 }}>停用后 {stopping.name} 将无法登录小程序端处理业务，其名下待办将退回共享工作池。</p>
                </Modal>
            )}
        </AdminShell>
    );
}

export function OwnerAccounts({ nav }: { nav: AdminNav }) {
    const [list, setList] = useState<OwnerAccount[]>(OWNER_ACCOUNTS);
    const [kw, setKw] = useState('');
    const [status, setStatus] = useState('全部');
    const [mask, setMask] = useState(true);
    const [editing, setEditing] = useState<OwnerAccount | null>(null);
    const [stopping, setStopping] = useState<OwnerAccount | null>(null);

    const filtered = list.filter((a) => {
        const mKw = a.name.includes(kw) || a.email.includes(kw) || a.phone.includes(kw);
        const mStatus = status === '全部' || a.status === status;
        return mKw && mStatus;
    });

    return (
        <AdminShell nav={nav} page="owner-accounts" crumb={['账号管理', '业主信息']} title="业主信息" sub="业主基础信息与账号状态管理，敏感信息脱敏展示">
            <div className="card">
                <div className="toolbar">
                    <SearchInput value={kw} onChange={setKw} placeholder="搜索姓名 / 手机号 / 邮箱" />
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="全部">全部状态</option>
                        <option value="启用">启用</option>
                        <option value="停用">停用</option>
                    </select>
                    <span className="tb-spacer" />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
                        {mask ? <EyeOff size={15} /> : <Eye size={15} />} 脱敏展示
                        <Switch checked={mask} onChange={setMask} />
                    </span>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead><tr><th>姓名</th><th>手机号</th><th>企业邮箱</th><th>关联服务单</th><th>状态</th><th>操作</th></tr></thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>暂无匹配的业主</td></tr>
                        ) : filtered.map((a) => (
                            <tr key={a.id}>
                                <td className="td-main">{a.name}</td>
                                <td style={{ color: 'var(--text-2)' }}>{mask ? a.phone : '13812345678'}</td>
                                <td style={{ color: 'var(--text-2)' }}>{a.email}</td>
                                <td>{a.orderCount}</td>
                                <td><AccountBadge status={a.status} /></td>
                                <td>
                                    <span className="op-link" onClick={() => setEditing(a)}>修正信息</span>
                                    {a.status === '启用' ? <span className="op-link danger" onClick={() => setStopping(a)}>停用</span> : <span className="op-link" onClick={() => setList(list.map((x) => x.id === a.id ? { ...x, status: '启用' } : x))}>启用</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing && (
                <Modal title="修正业主信息" onClose={() => setEditing(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setEditing(null)}>取消</button>
                        <button className="btn btn-primary" onClick={() => setEditing(null)}>保存</button>
                    </>}>
                    <div className="field"><label className="f-label">姓名</label><input className="f-input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                    <div className="field"><label className="f-label">企业邮箱</label><input className="f-input" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>手机号、邮箱变更需短信校验；变更操作全程留痕。</p>
                </Modal>
            )}

            {stopping && (
                <Modal title="确认停用业主账号" onClose={() => setStopping(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setStopping(null)}>取消</button>
                        <button className="btn btn-danger" onClick={() => { setList(list.map((a) => a.id === stopping.id ? { ...a, status: '停用' as const } : a)); setStopping(null); }}>确认停用</button>
                    </>}>
                    <p style={{ color: 'var(--text-2)', margin: 0 }}>停用后 {stopping.name} 将无法通过小程序发起或跟进服务单。</p>
                </Modal>
            )}
        </AdminShell>
    );
}
