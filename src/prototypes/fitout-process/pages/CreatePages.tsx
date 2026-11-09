// 服务单创建模块
import React, { useState } from 'react';
import { MapPin, ChevronRight, Search, Check, Building2, Landmark, Navigation } from 'lucide-react';
import { type AppNav, NavBar, Field, UploadBox, PhoneStatusBar, ReceiverSelect, Empty } from '../components';
import { PROJECTS, projectHasFollowers, type Project } from '../data';

export function CreateOrder({ nav, project, onPick }: { nav: AppNav; project: Project | null; onPick: () => void }) {
    const [floor, setFloor] = useState('');
    const [shopNo, setShopNo] = useState('');
    const [storeName, setStoreName] = useState('');
    const [area, setArea] = useState('');
    const [inspect, setInspect] = useState(false);
    const [declare, setDeclare] = useState(false);
    const [serviceType, setServiceType] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [contact, setContact] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState(false);
    const isStaff = nav.role !== 'customer';
    const areaNum = Number(area) || 0;
    const showIntent = areaNum > 300;

    const submit = () => {
        if (!project || !floor.trim() || !shopNo.trim() || !storeName.trim() || !area) {
            setError(true);
            return;
        }
        if (isStaff && (!customerName.trim() || !contact.trim() || !phone.trim() || !email.trim())) {
            setError(true);
            return;
        }
        // 客户下单：项目已配置跟进人员则自动流转至绘图员；未配置则进入项目经理指派池
        if (nav.role === 'customer' && project) {
            nav.openOrder(projectHasFollowers(project.name) ? 'FW20260924021' : 'FW20260924020');
            return;
        }
        nav.openOrder('FW20260922001');
    };

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="创建服务单" onBack={() => nav.go(nav.role === 'customer' ? 'customer-home' : 'staff-home')} />
            <div className="page-body">
                <div className="form-card">
                    <Field label="项目选择" required>
                        <button
                            type="button" className="f-input" style={{ textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                            onClick={onPick}
                        >
                            {project ? (
                                <span style={{ color: '#1f1f1f' }}>
                                    <span style={{ fontWeight: 600 }}>{project.name}</span>
                                    <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{project.address}</span>
                                </span>
                            ) : (
                                <span style={{ color: '#999' }}>请选择项目</span>
                            )}
                            <ChevronRight size={16} color="#bbb" />
                        </button>
                    </Field>
                    <Field label="施工位置" required>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="f-input" placeholder="楼层" value={floor} onChange={(e) => { setFloor(e.target.value); setError(false); }} />
                            <input className="f-input" placeholder="铺位号" value={shopNo} onChange={(e) => { setShopNo(e.target.value); setError(false); }} />
                        </div>
                        <input className="f-input" placeholder="店铺名称" value={storeName} onChange={(e) => { setStoreName(e.target.value); setError(false); }} />
                    </Field>
                    <Field label="施工面积" required>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input className="f-input" type="number" placeholder="请输入施工面积" value={area} onChange={(e) => { setArea(e.target.value); setError(false); }} />
                            <span style={{ color: '#999', whiteSpace: 'nowrap' }}>㎡</span>
                        </div>
                        {showIntent && <span className="f-hint" style={{ color: 'var(--brand)' }}>施工面积超过 300㎡，请确认是否需要代办服务</span>}
                    </Field>
                    <Field label="初始图纸上传" required hint="支持多图上传，可上传客户提供的原始消防施工图纸">
                        <UploadBox label="上传初始图纸" hint="JPG / PNG / PDF" />
                    </Field>

                    {showIntent && (
                        <div style={{ border: '1px solid var(--brand-soft)', borderRadius: 8, padding: 12, background: '#f7fbff' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>服务内容</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { key: 'construct', label: '施工' },
                                    { key: 'agency', label: '仅代办' },
                                ].map((opt) => (
                                    <label key={opt.key} className={`chip ${serviceType === opt.key ? 'is-checked' : ''}`} style={{ cursor: 'pointer', justifyContent: 'flex-start', padding: '8px 12px' }} onClick={() => setServiceType(opt.key)}>
                                        <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1px solid ${serviceType === opt.key ? 'var(--brand)' : '#d9d9d9'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                                            {serviceType === opt.key && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--brand)' }} />}
                                        </span>
                                        <span style={{ fontWeight: 500 }}>{opt.label}</span>
                                        <span style={{ fontSize: 12, color: '#999' }}>代办审图、代办申报，可多选</span>
                                    </label>
                                ))}
                            </div>
                            {serviceType && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, paddingLeft: 8, borderLeft: '2px solid var(--brand-soft)' }}>
                                    {[
                                        { val: inspect, set: setInspect, label: '代办审图', desc: '由代办人员完成监管部门审图' },
                                        { val: declare, set: setDeclare, label: '代办申报', desc: '由代办人员完成竣工申报' },
                                    ].map((it) => (
                                        <label key={it.label} className={`chip ${it.val ? 'is-checked' : ''}`} style={{ cursor: 'pointer', justifyContent: 'flex-start', padding: '8px 12px' }} onClick={() => it.set(!it.val)}>
                                            <span style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${it.val ? 'var(--brand)' : '#d9d9d9'}`, background: it.val ? 'var(--brand)' : '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                                {it.val && <Check size={12} />}
                                            </span>
                                            <span style={{ fontWeight: 500 }}>{it.label}</span>
                                            <span style={{ fontSize: 12, color: '#999' }}>{it.desc}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {isStaff && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>客户信息</div>
                            <div className="f-hint" style={{ color: '#999', marginTop: -6 }}>员工代客户创建，需手动补充完整客户信息</div>
                            <Field label="客户名称" required><input className="f-input" placeholder="请输入客户名称 / 企业名称" value={customerName} onChange={(e) => { setCustomerName(e.target.value); setError(false); }} /></Field>
                            <Field label="联系人" required><input className="f-input" placeholder="请输入联系人姓名" value={contact} onChange={(e) => { setContact(e.target.value); setError(false); }} /></Field>
                            <Field label="联系电话" required><input className="f-input" placeholder="请输入联系电话" value={phone} onChange={(e) => { setPhone(e.target.value); setError(false); }} /></Field>
                            <Field label="电子邮箱" required><input className="f-input" placeholder="请输入电子邮箱" value={email} onChange={(e) => { setEmail(e.target.value); setError(false); }} /></Field>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>服务指派</div>
                            <div className="f-hint" style={{ color: '#999', marginTop: -6 }}>线下已完成沟通评估，提交后直接指派绘图员进入图纸深化</div>
                            <ReceiverSelect role="drafter" />
                        </div>
                    )}
                </div>
                {error && <div style={{ color: '#f5222d', fontSize: 12 }}>{isStaff ? '请完善必填项（项目、施工位置、施工面积、客户信息）' : '请完善必填项（项目、楼层、铺位号、店铺名称、施工面积）'}</div>}
            </div>
            <div className="bottom-action">
                <button className="btn btn-primary btn-block" onClick={submit}>提交创建</button>
            </div>
        </>
    );
}

export function ProjectSelect({ nav, onSelect }: { nav: AppNav; onSelect: (p: Project) => void }) {
    const [kw, setKw] = useState('');
    // 仅展示项目库中已配置跟进团队的项目；未收录项目走「自定义项目 + 地图选点」
    const list = PROJECTS
        .filter((p) => projectHasFollowers(p.name))
        .filter((p) => p.name.includes(kw.trim()) || p.address.includes(kw.trim()));

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="选择项目" onBack={() => nav.go('create')} />
            <div className="page-body">
                <div className="filter-bar">
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#bbb' }} />
                        <input className="fb-input" style={{ paddingLeft: 30 }} placeholder="搜索项目名称 / 地址" value={kw} onChange={(e) => setKw(e.target.value)} />
                    </div>
                </div>

                <div style={{ height: 120, borderRadius: 8, background: 'linear-gradient(160deg,#e8f1fd,#d7e9ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexDirection: 'column', gap: 6 }}>
                    <MapPin size={24} color="#1677ff" />
                    <div style={{ fontSize: 12, color: '#666' }}>项目点位示意（商业广场 · 办公楼）</div>
                </div>

                <button type="button" className="custom-project-entry" onClick={() => nav.go('project-custom')}>
                    <span className="cpe-icon"><Navigation size={18} /></span>
                    <div className="cpe-main">
                        <div className="cpe-title">自定义项目</div>
                        <div className="cpe-desc">项目不在列表中？在地图上点选位置，自动带出项目名称与地址</div>
                    </div>
                    <ChevronRight size={16} color="#bbb" />
                </button>

                <div className="section-title"><span>项目列表</span></div>
                {list.length === 0 ? (
                    <Empty icon={MapPin} text="未找到项目，可使用「自定义项目」地图选点" />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {list.map((p) => (
                            <div key={p.id} className="list-item" onClick={() => onSelect(p)}>
                                <div style={{ width: 40, height: 40, borderRadius: 8, background: p.type === '商业广场' ? 'var(--brand-soft)' : '#f0f2f5', color: p.type === '商业广场' ? 'var(--brand)' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                                    {p.type === '商业广场' ? <Landmark size={20} /> : <Building2 size={20} />}
                                </div>
                                <div className="li-main">
                                    <div className="li-title" style={{ fontSize: 15 }}>{p.name}</div>
                                    <div className="li-meta"><span>{p.type}</span><span className="dot" /><span>{p.address}</span></div>
                                </div>
                                <ChevronRight size={16} color="#bbb" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

// 地图点位示意数据：未收录的项目可通过点选自动带出名称与地址
const MAP_POIS: { id: string; name: string; address: string; type: Project['type']; x: number; y: number }[] = [
    { id: 'poi1', name: '环球港', address: '普陀区中山北路3300号', type: '商业广场', x: 24, y: 32 },
    { id: 'poi2', name: '静安嘉里中心', address: '静安区南京西路1515号', type: '商业广场', x: 48, y: 20 },
    { id: 'poi3', name: '新天地广场', address: '黄浦区马当路245号', type: '商业广场', x: 62, y: 66 },
    { id: 'poi4', name: '徐汇滨江万科中心', address: '徐汇区龙腾大道1800号', type: '办公楼', x: 30, y: 76 },
];

export function ProjectCustom({ nav, onSelect }: { nav: AppNav; onSelect: (p: Project) => void }) {
    const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [type, setType] = useState<Project['type']>('商业广场');

    const pickPoi = (p: typeof MAP_POIS[number]) => {
        setPin({ x: p.x, y: p.y });
        setName(p.name);
        setAddress(p.address);
        setType(p.type);
    };

    const pickMap = (e: React.MouseEvent<HTMLDivElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPin({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
        });
        setName('');
        setAddress('');
    };

    const canSubmit = !!pin && !!name.trim() && !!address.trim();

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="地图选点项目" onBack={() => nav.go('project-select')} />
            <div className="page-body">
                <div className="f-hint" style={{ color: '#999' }}>在地图上点选项目位置，或点击已有项目点位，自动带出项目名称与地址。</div>
                <div className="map-picker" onClick={pickMap}>
                    {MAP_POIS.map((p) => (
                        <button
                            type="button"
                            key={p.id}
                            className="map-poi"
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                            onClick={(e) => { e.stopPropagation(); pickPoi(p); }}
                        >
                            <MapPin size={16} />
                            <span>{p.name}</span>
                        </button>
                    ))}
                    {pin && (
                        <div className="map-pin" style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
                            <MapPin size={26} fill="#1677ff" color="#fff" />
                        </div>
                    )}
                </div>

                <div className="form-card" style={{ marginTop: 12 }}>
                    <Field label="项目名称" required>
                        <input className="f-input" placeholder="点选后自动带出，可修改" value={name} onChange={(e) => setName(e.target.value)} />
                    </Field>
                    <Field label="项目地址" required>
                        <input className="f-input" placeholder="点选后自动带出，可修改" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </Field>
                    <Field label="项目类型" required>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {(['商业广场', '办公楼'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`chip ${type === t ? 'is-checked' : ''}`}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                    onClick={() => setType(t)}
                                >
                                    {t === '商业广场' ? <Landmark size={14} /> : <Building2 size={14} />}
                                    {t}
                                </button>
                            ))}
                        </div>
                    </Field>
                </div>
            </div>
            <div className="bottom-action">
                <button
                    className="btn btn-primary btn-block"
                    disabled={!canSubmit}
                    onClick={() => onSelect({ id: `custom-${Date.now()}`, name: name.trim(), type, address: address.trim() })}
                >
                    使用该点位
                </button>
            </div>
        </>
    );
}
