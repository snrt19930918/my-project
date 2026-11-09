// 登录与授权模块
import React, { useState } from 'react';
import { Phone, ShieldCheck, Building2 } from 'lucide-react';
import { type AppNav, NavBar, Field, PhoneStatusBar } from '../components';

export function LoginPage({ nav }: { nav: AppNav }) {
    const handleAuth = () => {
        nav.go(nav.role === 'customer' ? 'profile-complete' : 'staff-home');
    };
    return (
        <>
            <PhoneStatusBar />
            <div className="page-body" style={{ justifyContent: 'center', alignItems: 'center', background: '#fff' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '40px 24px', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#1677ff,#4096ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Building2 size={34} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>智慧建筑二装施工</div>
                            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>消防二次装修 · 全流程管理</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#666', fontSize: 13, textAlign: 'center' }}>
                        <ShieldCheck size={16} color="#52c41a" />
                        授权手机号即可登录使用二装施工服务
                    </div>
                    <button className="btn btn-primary btn-block" style={{ maxWidth: 300 }} onClick={handleAuth}>
                        <Phone size={16} />
                        微信手机号授权登录
                    </button>
                    <div style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>登录即代表同意《服务协议》与《隐私政策》</div>
                </div>
            </div>
        </>
    );
}

export function ProfileComplete({ nav }: { nav: AppNav }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState(false);

    const submit = () => {
        if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(true);
            return;
        }
        nav.go('customer-home');
    };

    return (
        <>
            <PhoneStatusBar />
            <NavBar title="完善信息" />
            <div className="page-body">
                <div className="form-card">
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                        为便于接收服务通知与业务对接，请先补全以下信息。
                    </div>
                    <Field label="客户名称" required>
                        <input
                            className="f-input" placeholder="请输入客户名称 / 企业名称" value={name}
                            onChange={(e) => { setName(e.target.value); setError(false); }}
                        />
                    </Field>
                    <Field label="电子邮箱" required hint="用于接收服务通知">
                        <input
                            className="f-input" type="email" placeholder="请输入电子邮箱" value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(false); }}
                        />
                    </Field>
                    {error && <div style={{ color: '#f5222d', fontSize: 12 }}>请填写正确的客户名称与邮箱</div>}
                </div>
            </div>
            <div className="bottom-action">
                <button className="btn btn-primary btn-block" onClick={submit}>确认提交</button>
            </div>
        </>
    );
}
