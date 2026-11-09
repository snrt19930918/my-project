// 项目点位：列表 + 详情配置
import React, { useState } from 'react';
import { Plus, MapPin, ChevronRight, Search } from 'lucide-react';
import { type AdminNav, AdminShell, ProjectBadge, Modal, SearchInput } from '../components';
import { PROJECTS, STAFF_ACCOUNTS, type Project, type ProjectStatus } from '../data';

const TEAM_ROLES = [
    { key: 'drafter', label: '绘图员' },
    { key: 'pm', label: '项目经理' },
    { key: 'quoter', label: '报价员' },
    { key: 'finance', label: '财务人员' },
    { key: 'agent', label: '代办人员' },
    { key: 'worker', label: '施工人员' },
];

const STAFF_OPTIONS = STAFF_ACCOUNTS.map((s) => s.name);

export function ProjectList({ nav }: { nav: AdminNav }) {
    const [kw, setKw] = useState('');
    const [status, setStatus] = useState<'全部' | ProjectStatus>('全部');

    const filtered = PROJECTS.filter((p) => {
        const matchKw = p.name.includes(kw) || p.address.includes(kw);
        const matchStatus = status === '全部' || p.status === status;
        return matchKw && matchStatus;
    });

    return (
        <AdminShell nav={nav} page="project-list" crumb={['项目点位']} title="项目点位" sub="建筑项目全量管理与专属团队配置"
            actions={<button className="btn btn-primary" onClick={() => nav.openProject('new')}><Plus size={16} /> 新增项目</button>}>
            <div className="card">
                <div className="toolbar">
                    <SearchInput value={kw} onChange={setKw} placeholder="搜索项目名称或地址" />
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                        <option value="全部">全部状态</option>
                        <option value="启用">启用</option>
                        <option value="停用">停用</option>
                        <option value="临时">临时</option>
                    </select>
                    <span className="tb-spacer" />
                    <button className="btn btn-ghost btn-sm"><MapPin size={15} /> 地图定位查找</button>
                </div>
            </div>

            <div className="table-wrap">
                <table className="table">
                    <thead>
                        <tr><th>项目名称</th><th>类型</th><th>地址</th><th>负责人</th><th>工单数</th><th>状态</th><th>操作</th></tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>暂无匹配的项目</td></tr>
                        ) : filtered.map((p) => (
                            <tr key={p.id} onClick={() => nav.openProject(p.id)} style={{ cursor: 'pointer' }}>
                                <td className="td-main">{p.name}</td>
                                <td>{p.type}</td>
                                <td style={{ color: 'var(--text-2)' }}>{p.address}</td>
                                <td>{p.manager}</td>
                                <td>{p.orderCount}</td>
                                <td><ProjectBadge status={p.status} /></td>
                                <td><span className="op-link" onClick={(e) => { e.stopPropagation(); nav.openProject(p.id); }}>详情配置</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminShell>
    );
}

export function ProjectDetail({ nav, project }: { nav: AdminNav; project: Project | null }) {
    const isNew = !project;
    const [team, setTeam] = useState<Record<string, string>>(project?.team ?? { drafter: '', pm: '', quoter: '', finance: '', agent: '', worker: '' });
    const [name, setName] = useState(project?.name ?? '');
    const [alias, setAlias] = useState(project?.alias ?? '');
    const [confirm, setConfirm] = useState<'停用' | '转正' | null>(null);
    const [saved, setSaved] = useState(false);

    const setRole = (key: string, v: string) => setTeam((t) => ({ ...t, [key]: v }));

    return (
        <AdminShell nav={nav} page="project-list" crumb={['项目点位', isNew ? '新增项目' : project!.name]} title={isNew ? '新增项目' : '项目详情与团队配置'} sub="项目官方名称由地图服务拉取，核心流转以官方名称为准"
            actions={<>
                <button className="btn btn-ghost" onClick={() => nav.go('project-list')}>返回列表</button>
                <button className="btn btn-primary" onClick={() => setSaved(true)}>保存</button>
            </>}>
            <div className="card">
                <div className="card-title"><span>项目基础信息</span></div>
                <div className="info-list">
                    <div className="info-row"><span className="ir-k">官方名称</span><span className="ir-v">{isNew ? (name || '—') : name}</span></div>
                    <div className="info-row"><span className="ir-k">项目别名</span><span className="ir-v">{isNew ? '可补充别名' : (alias || '—')}</span></div>
                    <div className="info-row"><span className="ir-k">项目类型</span><span className="ir-v">{project?.type ?? '商业广场'}</span></div>
                    <div className="info-row"><span className="ir-k">项目地址</span><span className="ir-v">{project?.address ?? '由地图点选自动填充'}</span></div>
                    <div className="info-row"><span className="ir-k">当前状态</span><span className="ir-v">{project ? <ProjectBadge status={project.status} /> : <span className="badge orange">临时</span>}</span></div>
                    <div className="info-row"><span className="ir-k">项目负责人</span><span className="ir-v">{project?.manager ?? '待配置'}</span></div>
                </div>
            </div>

            <div className="card">
                <div className="card-title"><span>专属服务团队配置</span><span className="link">节点流转优先匹配项目配置人员</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {TEAM_ROLES.map((r) => (
                        <div className="field" key={r.key}>
                            <label className="f-label">{r.label}</label>
                            <select value={team[r.key] ?? ''} onChange={(e) => setRole(r.key, e.target.value)}>
                                <option value="">未配置（走共享池）</option>
                                {STAFF_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {!isNew && project!.status !== '停用' && (
                <div className="card" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    {project!.status === '临时'
                        ? <button className="btn btn-primary" onClick={() => setConfirm('转正')}>临时项目转正</button>
                        : <button className="btn btn-danger" onClick={() => setConfirm('停用')}>停用项目</button>}
                </div>
            )}

            {saved && (
                <Modal title="保存成功" onClose={() => setSaved(false)} footer={<button className="btn btn-primary" onClick={() => { setSaved(false); nav.go('project-list'); }}>返回列表</button>}>
                    <p style={{ color: 'var(--text-2)', margin: 0 }}>项目信息与专属团队配置已保存，在途工单将自动同步流转规则。</p>
                </Modal>
            )}

            {confirm && (
                <Modal title={confirm === '停用' ? '确认停用项目' : '确认临时项目转正'} onClose={() => setConfirm(null)}
                    footer={<>
                        <button className="btn btn-ghost" onClick={() => setConfirm(null)}>取消</button>
                        <button className={`btn ${confirm === '停用' ? 'btn-danger' : 'btn-primary'}`} onClick={() => setConfirm(null)}>{confirm === '停用' ? '确认停用' : '确认转正'}</button>
                    </>}>
                    <p style={{ color: 'var(--text-2)', margin: 0 }}>
                        {confirm === '停用' ? '停用后该项目不可再发起新服务单，已有在途工单不受影响。' : '转正后该项目将启用专属团队配置，纳入正常项目库。'}
                    </p>
                </Modal>
            )}
        </AdminShell>
    );
}
