/**
 * @name 快递官网首页
 */

import React, { useMemo, useState } from 'react';
import {
    ArrowRight,
    Boxes,
    Check,
    ChevronRight,
    Clock,
    CreditCard,
    Globe2,
    Headphones,
    Package,
    Route,
    Search,
    ShieldCheck,
    Store,
    Truck,
} from 'lucide-react';
import './style.css';

const navLinks = [
    { label: '首页', href: '#home' },
    { label: '寄件', href: '#send' },
    { label: '查件', href: '#track' },
    { label: '运费时效', href: '#pricing' },
    { label: '服务网点', href: '#network' },
    { label: '商家服务', href: '#merchant' },
    { label: '帮助中心', href: '#help' },
];

const serviceCards = [
    {
        id: 'personal',
        tag: '个人寄件',
        title: '在家下单，快递上门取件',
        desc: '不用出门，手机填好地址，快递员按约定时间上门取件，全程物流可追踪。',
        points: ['在线预估运费', '预约上门取件', '丢损按保价赔付'],
        cta: '开始寄件',
        icon: Package,
    },
    {
        id: 'merchant',
        tag: '小商家发货',
        title: '批量发货，月结更省心',
        desc: '订单批量导入，一件代发或批量下单，月结账期缓解现金流压力。',
        points: ['订单批量下单', '电商平台对接', '专属商家客服'],
        cta: '商家入驻',
        icon: Store,
    },
];

const steps = [
    { title: '线上下单', desc: '填写寄收信息与重量，系统自动预估运费。' },
    { title: '上门取件', desc: '快递员按预约时间上门，当面称重揽收。' },
    { title: '运输分拣', desc: '进入转运网络，全程可实时追踪位置。' },
    { title: '签收送达', desc: '收件人签收后推送完成通知。' },
];

const pricingPlans = [
    {
        name: '同城寄',
        tag: '当日达',
        price: '8',
        unit: '首重 1kg 起',
        features: ['同城当日送达', '上门取件免费', '实时物流追踪'],
    },
    {
        name: '省内寄',
        tag: '次日达',
        price: '12',
        unit: '首重 1kg 起',
        features: ['省内次日送达', '覆盖县域乡镇', '保价服务可选'],
    },
    {
        name: '跨省寄',
        tag: '1-3 天',
        price: '16',
        unit: '首重 1kg 起',
        features: ['全国主要城市可达', '空陆联运提速', '大件专属通道'],
    },
];

const guarantees = [
    { icon: Truck, title: '上门取件', desc: '预约时段内上门，当面称重，透明计费。' },
    { icon: Route, title: '全程追踪', desc: '从揽收到签收，每个节点都有物流轨迹。' },
    { icon: ShieldCheck, title: '保价赔付', desc: '按保价金额赔付，丢损有保障。' },
    { icon: Clock, title: '时效承诺', desc: '核心线路承诺时效，超时可申诉。' },
    { icon: Boxes, title: '批量发货', desc: '小商家批量下单，效率翻倍。' },
    { icon: Headphones, title: '在线客服', desc: '7×12 小时在线，寄件问题随时问。' },
];

const merchantFeatures = [
    { icon: Boxes, title: '批量下单', desc: 'Excel 批量导入订单，一键生成运单并打印面单。' },
    { icon: CreditCard, title: '月结账期', desc: '先发货后结算，月结账期缓解小商家资金压力。' },
    { icon: Globe2, title: '电商对接', desc: '对接主流电商平台，订单自动同步，发货免手动录入。' },
    { icon: Headphones, title: '专属客服', desc: '一对一商家客服，处理异常件与售后更及时。' },
];

const networkStats = [
    { value: '300+', label: '覆盖城市' },
    { value: '8000+', label: '服务网点' },
    { value: '20000+', label: '末端驿站' },
    { value: '98.6%', label: '准时签收率' },
];

type ShipTab = 'personal' | 'merchant';

const destinationOptions = [
    { value: 'same-city', label: '同城', base: 8 },
    { value: 'province', label: '省内', base: 12 },
    { value: 'cross-province', label: '跨省', base: 16 },
];

function ShipPanel() {
    const [tab, setTab] = useState<ShipTab>('personal');
    const [destination, setDestination] = useState('province');
    const [weight, setWeight] = useState(1);

    const estimate = useMemo(() => {
        const option = destinationOptions.find((item) => item.value === destination) ?? destinationOptions[0];
        const w = Math.max(1, weight);
        const price = option.base + (w - 1) * 6;
        return Math.round(price);
    }, [destination, weight]);

    return (
        <div className="ec-ship-panel">
            <div className="ec-ship-tabs" role="tablist" aria-label="寄件类型">
                <button
                    type="button"
                    className={tab === 'personal' ? 'is-active' : ''}
                    onClick={() => setTab('personal')}
                >
                    个人寄件
                </button>
                <button
                    type="button"
                    className={tab === 'merchant' ? 'is-active' : ''}
                    onClick={() => setTab('merchant')}
                >
                    商家发货
                </button>
            </div>

            <div className="ec-ship-form">
                <div className="ec-ship-row">
                    <label>
                        <span>寄往</span>
                        <select value={destination} onChange={(e) => setDestination(e.target.value)}>
                            {destinationOptions.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>重量 (kg)</span>
                        <input
                            type="number"
                            min={1}
                            value={weight}
                            onChange={(e) => setWeight(Number(e.target.value) || 1)}
                        />
                    </label>
                </div>
                <div className="ec-ship-estimate">
                    <div>
                        <small>预估运费</small>
                        <strong>
                            <em>¥</em>
                            {estimate}
                            <i>起</i>
                        </strong>
                    </div>
                    <button type="button">
                        {tab === 'personal' ? '立即寄件' : '批量下单'}
                        <ArrowRight size={16} />
                    </button>
                </div>
                <p className="ec-ship-hint">
                    {tab === 'personal' ? '快递员按预约时间上门取件' : '支持 Excel 批量导入与月结账期'}
                </p>
            </div>
        </div>
    );
}

export default function ExpressCourierHome() {
    return (
        <div className="ec-home">
            <header className="ec-header">
                <div className="ec-header-inner">
                    <a className="ec-logo" href="#home">
                        <span className="ec-logo-mark" aria-hidden="true">
                            <Truck size={20} strokeWidth={2.2} />
                        </span>
                        <span className="ec-logo-text">
                            速达快递
                            <small>SUDA EXPRESS</small>
                        </span>
                    </a>

                    <nav className="ec-nav" aria-label="主导航">
                        {navLinks.map((link) => (
                            <a key={link.label} href={link.href}>{link.label}</a>
                        ))}
                    </nav>

                    <div className="ec-header-actions">
                        <a className="ec-login" href="#login">登录 / 注册</a>
                        <a className="ec-btn ec-btn-primary" href="#send">立即寄件</a>
                    </div>
                </div>
            </header>

            <main>
                <section className="ec-hero" id="home">
                    <div className="ec-hero-inner">
                        <div className="ec-hero-copy">
                            <p className="ec-eyebrow">个人寄件 · 小商家发货，一站搞定</p>
                            <h1>上门取件，全国寄送</h1>
                            <p className="ec-hero-sub">
                                不用出门，手机下单，快递员按约定时间上门。全程物流追踪，丢损按保价赔付。
                            </p>
                            <ul className="ec-hero-trust">
                                <li><Check size={16} /> 上门取件</li>
                                <li><Check size={16} /> 全程追踪</li>
                                <li><Check size={16} /> 保价赔付</li>
                            </ul>
                        </div>
                        <ShipPanel />
                    </div>
                </section>

                <section className="ec-track-strip" id="track">
                    <div className="ec-track-strip-inner">
                        <span className="ec-track-label">快递查询</span>
                        <div className="ec-track-input">
                            <Search size={18} />
                            <input type="text" placeholder="输入快递单号，查询物流轨迹" />
                        </div>
                        <button type="button" className="ec-btn ec-btn-dark">查询</button>
                    </div>
                </section>

                <section className="ec-section" id="send">
                    <div className="ec-section-inner">
                        <div className="ec-section-head">
                            <h2>选择你的寄件方式</h2>
                            <p>个人寄件与小商家发货，各有专属流程与优惠。</p>
                        </div>
                        <div className="ec-service-grid">
                            {serviceCards.map((card) => {
                                const Icon = card.icon;
                                return (
                                    <article className="ec-service-card" key={card.id}>
                                        <div className="ec-service-icon" aria-hidden="true">
                                            <Icon size={24} />
                                        </div>
                                        <span className="ec-service-tag">{card.tag}</span>
                                        <h3>{card.title}</h3>
                                        <p>{card.desc}</p>
                                        <ul>
                                            {card.points.map((point) => (
                                                <li key={point}><Check size={15} /> {point}</li>
                                            ))}
                                        </ul>
                                        <a className="ec-text-link" href="#send">
                                            {card.cta}
                                            <ChevronRight size={16} />
                                        </a>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="ec-section ec-section-alt">
                    <div className="ec-section-inner">
                        <div className="ec-section-head">
                            <h2>寄件四步走</h2>
                            <p>从下单到签收，每一步都清清楚楚。</p>
                        </div>
                        <ol className="ec-steps">
                            {steps.map((step, index) => (
                                <li key={step.title}>
                                    <span className="ec-step-index">{String(index + 1).padStart(2, '0')}</span>
                                    <h3>{step.title}</h3>
                                    <p>{step.desc}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="ec-section" id="pricing">
                    <div className="ec-section-inner">
                        <div className="ec-section-head">
                            <h2>运费与时效参考</h2>
                            <p>实际运费以下单时系统估算为准。</p>
                        </div>
                        <div className="ec-pricing-grid">
                            {pricingPlans.map((plan) => (
                                <article className="ec-pricing-card" key={plan.name}>
                                    <div className="ec-pricing-head">
                                        <h3>{plan.name}</h3>
                                        <span>{plan.tag}</span>
                                    </div>
                                    <div className="ec-pricing-value">
                                        <em>¥</em>
                                        {plan.price}
                                        <i>起</i>
                                    </div>
                                    <p className="ec-pricing-unit">{plan.unit}</p>
                                    <ul>
                                        {plan.features.map((feature) => (
                                            <li key={feature}><Check size={15} /> {feature}</li>
                                        ))}
                                    </ul>
                                    <a className="ec-btn ec-btn-outline" href="#send">去下单</a>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="ec-section ec-section-alt">
                    <div className="ec-section-inner">
                        <div className="ec-section-head">
                            <h2>为什么选速达</h2>
                            <p>从寄出到送达，每一环都有保障。</p>
                        </div>
                        <div className="ec-guarantee-grid">
                            {guarantees.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article className="ec-guarantee-card" key={item.title}>
                                        <span className="ec-guarantee-icon" aria-hidden="true">
                                            <Icon size={22} />
                                        </span>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="ec-section" id="merchant">
                    <div className="ec-section-inner">
                        <div className="ec-section-head">
                            <h2>小商家发货专区</h2>
                            <p>批量、省心、还能月结，让发货不再占用你的精力。</p>
                        </div>
                        <div className="ec-merchant-grid">
                            {merchantFeatures.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <article className="ec-merchant-card" key={item.title}>
                                        <span className="ec-merchant-icon" aria-hidden="true">
                                            <Icon size={24} />
                                        </span>
                                        <h3>{item.title}</h3>
                                        <p>{item.desc}</p>
                                    </article>
                                );
                            })}
                        </div>
                        <div className="ec-merchant-cta">
                            <div>
                                <h3>准备开始批量发货？</h3>
                                <p>提交入驻申请，专属客服将与你联系开通商家服务。</p>
                            </div>
                            <a className="ec-btn ec-btn-primary" href="#merchant">商家入驻 <ArrowRight size={16} /></a>
                        </div>
                    </div>
                </section>

                <section className="ec-section ec-section-alt" id="network">
                    <div className="ec-section-inner">
                        <div className="ec-network">
                            <div className="ec-network-copy">
                                <p className="ec-eyebrow">服务网络</p>
                                <h2>覆盖全国，触达县乡</h2>
                                <p>
                                    自营 + 加盟网点协同，让每一件包裹都能更快到达。无论在城市还是乡镇，都能就近寄取。
                                </p>
                                <a className="ec-text-link" href="#network">
                                    查找附近网点
                                    <ChevronRight size={16} />
                                </a>
                            </div>
                            <div className="ec-network-stats">
                                {networkStats.map((stat) => (
                                    <div className="ec-stat" key={stat.label}>
                                        <strong>{stat.value}</strong>
                                        <span>{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="ec-footer">
                <div className="ec-footer-inner">
                    <div className="ec-footer-brand">
                        <a className="ec-logo" href="#home">
                            <span className="ec-logo-mark" aria-hidden="true">
                                <Truck size={20} strokeWidth={2.2} />
                            </span>
                            <span className="ec-logo-text">
                                速达快递
                                <small>SUDA EXPRESS</small>
                            </span>
                        </a>
                        <p>面向个人寄件与小商家的快递服务平台。</p>
                    </div>
                    <div className="ec-footer-links">
                        <div>
                            <h4>寄件服务</h4>
                            <a href="#send">个人寄件</a>
                            <a href="#merchant">商家发货</a>
                            <a href="#pricing">运费时效</a>
                        </div>
                        <div>
                            <h4>支持</h4>
                            <a href="#track">快递查询</a>
                            <a href="#help">帮助中心</a>
                            <a href="#network">服务网点</a>
                        </div>
                        <div>
                            <h4>关于</h4>
                            <a href="#about">公司介绍</a>
                            <a href="#join">加入我们</a>
                            <a href="#contact">联系我们</a>
                        </div>
                    </div>
                </div>
                <div className="ec-footer-bottom">
                    <span>© 2026 速达快递 · 本页面为原型演示</span>
                    <span>隐私政策 · 服务条款</span>
                </div>
            </footer>
        </div>
    );
}
