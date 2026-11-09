// 登录页
import React, { useState } from 'react';
import { type AdminNav } from '../components';

export function LoginPage({ nav }: { nav: AdminNav }) {
    const [account, setAccount] = useState('admin');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = () => {
        if (!account || !password) {
            setError('请输入账号和密码');
            return;
        }
        nav.go('dashboard');
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="lc-logo">
                    <span className="logo-mark">二装</span>
                </div>
                <h1 className="lc-title">二装施工过程管理</h1>
                <p className="lc-sub">Web 管理后台 · 按岗位后台管理权限加载功能菜单</p>

                {error && <div className="lc-error">{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="field">
                        <label className="f-label">账号</label>
                        <input className="f-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="请输入账号" />
                    </div>
                    <div className="field">
                        <label className="f-label">密码</label>
                        <input className="f-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontSize: 15 }} onClick={submit}>登录</button>
                </div>
            </div>
        </div>
    );
}
