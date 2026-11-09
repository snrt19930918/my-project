// 二装施工过程管理 · 示例数据与类型定义

export type RoleId = 'customer' | 'drafter' | 'pm' | 'quoter' | 'finance' | 'agent';

export type NodeId =
    | 'create'
    | 'assign'
    | 'deepen'
    | 'review'
    | 'contract'
    | 'inspect'
    | 'construction'
    | 'declare'
    | 'acceptance'
    | 'collection';

// 服务单持久状态：创建即「服务中」；「待处理」是节点处置态，按查看者派生，不写入服务单状态
export type OrderStatus = '服务中' | '已完成' | '已终止' | '待确认' | '已结束';

// 查看者看到的状态：当前节点处理人额外可见「待处理」
export type DisplayStatus = OrderStatus | '待处理';

// 合同服务项：仅代办 / 仅施工 / 完整施工代办
export type ContractType = '仅代办' | '仅施工' | '完整施工代办';

// 工作量清单条目：绘图员按深化图纸拆解的系统-部件点位工作量（新装 / 拆除 / 移位）
export interface WorkloadItem {
    system: string;
    component: string;
    fresh: number;
    remove: number;
    move: number;
}

// 绘图员默认提交的工作量清单（示例数据 / 历史合同推导）
export const DEFAULT_WORKLOADS: WorkloadItem[] = [
    { system: '消防喷淋系统', component: '喷头', fresh: 24, remove: 6, move: 8 },
    { system: '消防喷淋系统', component: '管道', fresh: 12, remove: 3, move: 5 },
    { system: '火灾自动报警系统', component: '探测器', fresh: 18, remove: 4, move: 2 },
];

// 收款记录：财务可多次填写，ratio 为本次填写后的累计收款比例（0-100）
export interface CollectionRecord {
    time: string;
    amount: number;
    ratio: number;
    by: string;
    note?: string;
}

// 报价员「确认合同」生成的合同记录
export interface ContractRecord {
    id: string;
    type: ContractType;
    totalPrice?: number;
    signedTime: string;
    submitter: string;
    receiverRole: RoleId;
    receiverName: string;
    // 工作量确认方式：采用绘图员提交版本，或线下重勘后上传最终确认版
    workloadMode: '采用绘图员版本' | '上传最终确认版';
    // 合同最终确认的工作量清单：施工节点按此清单逐行扣减
    workloads?: WorkloadItem[];
    // 工作量清单附件 / 深化图纸附件
    workloadAttachments?: string[];
    drawingAttachments?: string[];
    attachments: string[];
    quoteAttachments: string[];
    remark?: string;
    collections: CollectionRecord[];
}

export interface Role {
    id: RoleId;
    label: string;
    name: string;
    dept?: string;
}

export interface User {
    id: string;
    name: string;
    role: RoleId;
    dept?: string;
}

export interface Node {
    id: NodeId;
    label: string;
    optional?: boolean;
}

// 「结束服务」会签请求（发起人 + 项目经理/报价员会签）
export interface EndRequest {
    reason: string;
    initiator: string;
    initiatorRole: RoleId;
    time: string;
    pmConfirmed: boolean;
    quoterConfirmed: boolean;
    pmName?: string;
    quoterName?: string;
    pmTime?: string;
    quoterTime?: string;
}

export interface Order {
    id: string;
    project: string;
    projectType: '商业广场' | '办公楼';
    location: string;
    area: number;
    customer: string;
    phone?: string;
    email?: string;
    currentNode: NodeId;
    status: OrderStatus;
    hasInspect: boolean;
    hasDeclare: boolean;
    assignee: string;
    assigneeRole: RoleId;
    createTime: string;
    updateTime: string;
    // 报价员已确认的合同（可签订两份：仅施工 + 仅代办）；未显式配置时按服务内容推导
    contracts?: ContractRecord[];
    // 该项目后台未配置跟进人员时，客户下单后进入项目经理评估指派节点（全体项目经理可见）
    needAssign?: boolean;
    endRequest?: EndRequest;
    // 补签合同新增节点早于当前节点时：服务单回退至新增节点，办完自动回到原节点
    rollback?: RollbackContext;
    // 回退前已完成、回退期间仍需保持「已完成」的节点
    completedNodes?: NodeId[];
    // 施工节点已从合同确认清单中扣减的累计完成量
    constructionDone?: WorkloadItem[];
}

// 补签回退上下文
export interface RollbackContext {
    // 回退前的当前节点（新增节点办完后自动回流的目标）
    returnNode: NodeId;
    returnRole: RoleId;
    returnAssignee: string;
    // 本次回退新增的节点（按完整流程顺序）
    insertedNodes: NodeId[];
    // 新增节点处置人（报价员确认合同时所选）
    handlerRole: RoleId;
    handlerAssignee: string;
    contractType: ContractType;
    time: string;
}

export interface ProjectStaff {
    pm?: string;
    drafter?: string;
    quoter?: string;
    finance?: string;
    agent?: string;
}

export interface Project {
    id: string;
    name: string;
    type: '商业广场' | '办公楼';
    address: string;
    // 后台为该项目配置的各岗位跟进人员；未配置时客户下单进入项目经理指派池
    staff?: ProjectStaff;
}

export const ROLES: Role[] = [
    { id: 'customer', label: '客户', name: '林女士' },
    { id: 'drafter', label: '绘图员', name: '王强', dept: '设计部' },
    { id: 'pm', label: '项目经理', name: '张伟', dept: '工程部' },
    { id: 'quoter', label: '报价员', name: '李娜', dept: '商务部' },
    { id: 'finance', label: '财务人员', name: '赵敏', dept: '财务部' },
    { id: 'agent', label: '代办人员', name: '孙磊', dept: '外勤部' },
];

// 各角色下的可指派用户（示例数据，用于「下一节点接收用户」选择）
export const USERS: User[] = [
    { id: 'drafter-1', name: '王强', role: 'drafter', dept: '设计部' },
    { id: 'drafter-2', name: '陈晨', role: 'drafter', dept: '设计部' },
    { id: 'drafter-3', name: '林浩', role: 'drafter', dept: '设计部' },
    { id: 'pm-1', name: '张伟', role: 'pm', dept: '工程部' },
    { id: 'pm-2', name: '刘洋', role: 'pm', dept: '工程部' },
    { id: 'quoter-1', name: '李娜', role: 'quoter', dept: '商务部' },
    { id: 'quoter-2', name: '黄敏', role: 'quoter', dept: '商务部' },
    { id: 'finance-1', name: '赵敏', role: 'finance', dept: '财务部' },
    { id: 'finance-2', name: '周芳', role: 'finance', dept: '财务部' },
    { id: 'agent-1', name: '孙磊', role: 'agent', dept: '外勤部' },
    { id: 'agent-2', name: '郭涛', role: 'agent', dept: '外勤部' },
];

export function usersForRole(role: RoleId): User[] {
    return USERS.filter((u) => u.role === role);
}

// 后台「角色权限配置」下发的权限点（小程序端示例）：
// canCreate 控制是否展示「创建服务单」入口；客户默认可创建，员工由后台授权。
export const ROLE_CAN_CREATE: Record<RoleId, boolean> = {
    customer: true,
    drafter: true,
    pm: true,
    quoter: true,
    finance: true,
    agent: true,
};

export const NODES: Node[] = [
    { id: 'create', label: '创建' },
    { id: 'assign', label: '评估指派', optional: true },
    { id: 'deepen', label: '图纸深化' },
    { id: 'review', label: '审核' },
    { id: 'contract', label: '确认合同' },
    { id: 'inspect', label: '审图', optional: true },
    { id: 'construction', label: '施工', optional: true },
    { id: 'declare', label: '申报', optional: true },
    { id: 'acceptance', label: '验收办结', optional: true },
    // 合同收款与合同服务并行，服务支线完成后作为最终办结门槛
    { id: 'collection', label: '合同收款', optional: true },
];

export const PROJECTS: Project[] = [
    { id: 'p1', name: '上海静安大悦城', type: '商业广场', address: '静安区西藏北路166号', staff: { pm: '张伟', drafter: '王强', quoter: '李娜' } },
    { id: 'p2', name: '虹桥天地', type: '办公楼', address: '闵行区申长路688号', staff: { pm: '刘洋', drafter: '陈晨', quoter: '黄敏' } },
    { id: 'p3', name: '陆家嘴中心', type: '办公楼', address: '浦东新区世纪大道8号', staff: { pm: '张伟', drafter: '林浩', quoter: '李娜' } },
    { id: 'p4', name: '港汇恒隆广场', type: '商业广场', address: '徐汇区虹桥路1号', staff: { pm: '张伟', drafter: '王强', quoter: '李娜' } },
    { id: 'p5', name: '环球港', type: '商业广场', address: '普陀区中山北路3300号' },
    { id: 'p6', name: '新天地广场', type: '商业广场', address: '黄浦区马当路245号' },
];

const PROJECT_STAFF_SLOTS: { key: keyof ProjectStaff; label: string }[] = [
    { key: 'pm', label: '项目经理' },
    { key: 'drafter', label: '绘图员' },
    { key: 'quoter', label: '报价员' },
    { key: 'finance', label: '财务人员' },
    { key: 'agent', label: '代办人员' },
];

// 项目已配置的各岗位跟进人员（用于判断项目是否可在项目列表中选择）
function projectStaffList(projectName: string): { role: string; name: string }[] {
    const staff = PROJECTS.find((p) => p.name === projectName)?.staff;
    if (!staff) return [];
    return PROJECT_STAFF_SLOTS.filter((s) => staff[s.key]).map((s) => ({ role: s.label, name: staff[s.key] as string }));
}

// 项目是否已配置跟进人员：未配置时客户下单进入「全体项目经理可见」的指派池
export function projectHasFollowers(projectName: string): boolean {
    return projectStaffList(projectName).length > 0;
}

export const ORDERS: Order[] = [
    {
        id: 'FW20260922001',
        project: '上海静安大悦城',
        projectType: '商业广场',
        location: '3F-18 铺位 · 精品咖啡',
        area: 320,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'deepen',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-22 10:20',
        updateTime: '2026-09-22 14:30',
    },
    {
        id: 'FW20260921008',
        project: '上海静安大悦城',
        projectType: '商业广场',
        location: '4F-15 铺位 · 精品茶饮',
        area: 360,
        customer: '刘先生',
        phone: '150****8899',
        email: 'liu@example.com',
        currentNode: 'review',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-21 16:20',
        updateTime: '2026-09-22 09:10',
    },
    {
        id: 'FW20260920006',
        project: '新天地广场',
        projectType: '商业广场',
        location: 'B1-06 铺位 · 生鲜超市',
        area: 460,
        customer: '陈先生',
        phone: '139****7788',
        email: 'chen@example.com',
        currentNode: 'inspect',
        status: '服务中',
        hasInspect: true,
        hasDeclare: false,
        assignee: '孙磊',
        assigneeRole: 'agent',
        createTime: '2026-09-20 09:10',
        updateTime: '2026-09-21 17:05',
    },
    {
        id: 'FW20260918002',
        project: '虹桥天地',
        projectType: '办公楼',
        location: 'T2-1205 室 · 互联网公司',
        area: 180,
        customer: '周女士',
        phone: '136****3344',
        email: 'zhou@example.com',
        currentNode: 'contract',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '李娜',
        assigneeRole: 'quoter',
        createTime: '2026-09-18 11:40',
        updateTime: '2026-09-22 09:20',
    },
    {
        id: 'FW20260915003',
        project: '陆家嘴中心',
        projectType: '办公楼',
        location: 'L3-301 室 · 律师事务所',
        area: 520,
        customer: '吴先生',
        phone: '137****5566',
        email: 'wu@example.com',
        currentNode: 'construction',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-15 14:00',
        updateTime: '2026-09-22 10:00',
    },
    {
        id: 'FW20260921007',
        project: '环球港',
        projectType: '商业广场',
        location: '4F-09 铺位 · 时尚服饰',
        area: 390,
        customer: '郑女士',
        phone: '135****9900',
        email: 'zheng@example.com',
        currentNode: 'inspect',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '孙磊',
        assigneeRole: 'agent',
        createTime: '2026-09-21 08:30',
        updateTime: '2026-09-21 16:20',
    },
    {
        id: 'FW20260910004',
        project: '港汇恒隆广场',
        projectType: '商业广场',
        location: '5F-22 铺位 · 火锅餐饮',
        area: 260,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'acceptance',
        status: '已完成',
        hasInspect: false,
        hasDeclare: false,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-10 10:00',
        updateTime: '2026-09-19 18:30',
    },
    {
        id: 'FW20260905005',
        project: '环球港',
        projectType: '商业广场',
        location: '2F-11 铺位 · 美妆集合店',
        area: 210,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'contract',
        status: '已终止',
        hasInspect: false,
        hasDeclare: false,
        assignee: '李娜',
        assigneeRole: 'quoter',
        createTime: '2026-09-05 13:20',
        updateTime: '2026-09-08 15:00',
    },
    {
        id: 'FW20260919009',
        project: '港汇恒隆广场',
        projectType: '商业广场',
        location: '6F-08 铺位 · 精品书店',
        area: 280,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'collection',
        status: '服务中',
        hasInspect: true,
        hasDeclare: false,
        assignee: '赵敏',
        assigneeRole: 'finance',
        createTime: '2026-09-19 10:00',
        updateTime: '2026-09-22 15:00',
    },
    {
        id: 'FW20260922011',
        project: '环球港',
        projectType: '商业广场',
        location: '2F-05 铺位 · 精品咖啡',
        area: 240,
        customer: '刘先生',
        phone: '150****2212',
        email: 'liu2@example.com',
        currentNode: 'deepen',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-22 08:40',
        updateTime: '2026-09-22 08:40',
    },
    {
        id: 'FW20260922012',
        project: '陆家嘴中心',
        projectType: '办公楼',
        location: 'L1-101 室 · 科技公司',
        area: 360,
        customer: '吴先生',
        phone: '137****2213',
        email: 'wu2@example.com',
        currentNode: 'review',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-22 09:10',
        updateTime: '2026-09-22 09:10',
    },
    {
        id: 'FW20260922013',
        project: '新天地广场',
        projectType: '商业广场',
        location: 'B2-09 铺位 · 家居店',
        area: 280,
        customer: '陈先生',
        phone: '139****2214',
        email: 'chen2@example.com',
        currentNode: 'contract',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '李娜',
        assigneeRole: 'quoter',
        createTime: '2026-09-22 10:00',
        updateTime: '2026-09-22 10:00',
    },
    {
        id: 'FW20260920014',
        project: '虹桥天地',
        projectType: '办公楼',
        location: 'T3-1501 室 · 金融公司',
        area: 300,
        customer: '周女士',
        phone: '136****2215',
        email: 'zhou2@example.com',
        currentNode: 'construction',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-20 13:20',
        updateTime: '2026-09-22 11:30',
    },
    {
        id: 'FW20260921015',
        project: '港汇恒隆广场',
        projectType: '商业广场',
        location: '6F-21 铺位 · 眼镜店',
        area: 400,
        customer: '郑女士',
        phone: '135****2216',
        email: 'zheng2@example.com',
        currentNode: 'inspect',
        status: '服务中',
        hasInspect: true,
        hasDeclare: false,
        assignee: '孙磊',
        assigneeRole: 'agent',
        createTime: '2026-09-21 09:30',
        updateTime: '2026-09-22 10:45',
    },
    {
        id: 'FW20260906016',
        project: '环球港',
        projectType: '商业广场',
        location: '1F-02 铺位 · 便利店',
        area: 180,
        customer: '刘先生',
        phone: '150****2217',
        email: 'liu3@example.com',
        currentNode: 'collection',
        status: '已完成',
        hasInspect: false,
        hasDeclare: false,
        assignee: '赵敏',
        assigneeRole: 'finance',
        createTime: '2026-09-06 09:00',
        updateTime: '2026-09-15 17:00',
    },
    {
        id: 'FW20260922017',
        project: '上海静安大悦城',
        projectType: '商业广场',
        location: '2F-03 铺位 · 精品烘焙',
        area: 320,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'deepen',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-22 15:30',
        updateTime: '2026-09-22 15:30',
    },
    {
        id: 'FW20260923018',
        project: '陆家嘴中心',
        projectType: '办公楼',
        location: 'L5-502 室 · 贸易公司',
        area: 300,
        customer: '黄先生',
        phone: '138****2318',
        email: 'huang@example.com',
        currentNode: 'deepen',
        status: '待确认',
        hasInspect: false,
        hasDeclare: false,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-23 09:00',
        updateTime: '2026-09-23 11:20',
        endRequest: {
            reason: '客户经营方向调整，取消本次装修计划',
            initiator: '王强',
            initiatorRole: 'drafter',
            time: '2026-09-23 11:20',
            pmConfirmed: false,
            quoterConfirmed: false,
        },
    },
    {
        id: 'FW20260918019',
        project: '环球港',
        projectType: '商业广场',
        location: '3F-16 铺位 · 宠物店',
        area: 220,
        customer: '刘先生',
        phone: '150****2319',
        email: 'liu4@example.com',
        currentNode: 'construction',
        status: '已结束',
        hasInspect: false,
        hasDeclare: false,
        assignee: '赵敏',
        assigneeRole: 'finance',
        createTime: '2026-09-18 10:00',
        updateTime: '2026-09-20 16:40',
        endRequest: {
            reason: '客户资金链紧张，暂缓施工并结束服务',
            initiator: '赵敏',
            initiatorRole: 'finance',
            time: '2026-09-20 09:30',
            pmConfirmed: true,
            quoterConfirmed: true,
            pmName: '张伟',
            quoterName: '李娜',
            pmTime: '2026-09-20 10:15',
            quoterTime: '2026-09-20 16:40',
        },
    },
    // 客户下单 · 项目后台未配置跟进人员 → 进入全体项目经理可见的指派池
    {
        id: 'FW20260924020',
        project: '环球港',
        projectType: '商业广场',
        location: '3F-08 铺位 · 儿童成长中心',
        area: 340,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'assign',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '待分配',
        assigneeRole: 'pm',
        needAssign: true,
        createTime: '2026-09-24 09:20',
        updateTime: '2026-09-24 09:20',
    },
    // 客户下单 · 项目已配置跟进人员 → 自动流转至绘图员，无需项目经理评估
    {
        id: 'FW20260924021',
        project: '上海静安大悦城',
        projectType: '商业广场',
        location: '1F-12 铺位 · 花艺生活馆',
        area: 260,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'deepen',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-24 10:05',
        updateTime: '2026-09-24 10:05',
    },
    // 已签仅施工合同，代办合同待报价员补充确认；施工与收款并行推进
    {
        id: 'FW20260926022',
        project: '上海静安大悦城',
        projectType: '商业广场',
        location: '2F-16 铺位 · 轻食餐厅',
        area: 300,
        customer: '林女士',
        phone: '138****2211',
        email: 'lin@example.com',
        currentNode: 'construction',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '张伟',
        assigneeRole: 'pm',
        createTime: '2026-09-24 14:20',
        updateTime: '2026-09-26 15:10',
        contracts: [
            {
                id: 'HT20260925022-1',
                type: '仅施工',
                totalPrice: 98000,
                signedTime: '2026-09-25 10:30',
                submitter: '李娜',
                receiverRole: 'pm',
                receiverName: '张伟',
                workloadMode: '上传最终确认版',
                attachments: ['施工合同.pdf'],
                quoteAttachments: ['施工报价单.pdf'],
                remark: '客户先签订施工合同，代办合同待确认',
                collections: [
                    { time: '2026-09-26 14:00', amount: 58800, ratio: 60, by: '赵敏', note: '首款到账' },
                ],
            },
        ],
    },
    // 施工与代办两份合同分别收款：施工合同已收齐，代办合同收款中；服务支线已完成
    {
        id: 'FW20260924023',
        project: '陆家嘴中心',
        projectType: '办公楼',
        location: 'L8-806 室 · 咨询公司',
        area: 320,
        customer: '周女士',
        phone: '136****2215',
        email: 'zhou2@example.com',
        currentNode: 'inspect',
        status: '服务中',
        hasInspect: true,
        hasDeclare: true,
        assignee: '孙磊',
        assigneeRole: 'agent',
        createTime: '2026-09-20 09:40',
        updateTime: '2026-09-26 11:30',
        // 施工/验收已完成、收款进行中补签仅代办：新增审图/申报早于当前收款节点，服务单回退至审图，办完自动回到收款
        rollback: {
            returnNode: 'collection',
            returnRole: 'finance',
            returnAssignee: '赵敏',
            insertedNodes: ['inspect', 'declare'],
            handlerRole: 'agent',
            handlerAssignee: '孙磊',
            contractType: '仅代办',
            time: '2026-09-24 09:50',
        },
        completedNodes: ['create', 'deepen', 'review', 'contract', 'construction', 'acceptance'],
        contracts: [
            {
                id: 'HT20260922023-1',
                type: '仅施工',
                totalPrice: 128000,
                signedTime: '2026-09-22 14:10',
                submitter: '李娜',
                receiverRole: 'pm',
                receiverName: '张伟',
                workloadMode: '采用绘图员版本',
                attachments: ['施工合同.pdf'],
                quoteAttachments: ['施工报价单.pdf'],
                collections: [
                    { time: '2026-09-23 10:20', amount: 76800, ratio: 60, by: '赵敏', note: '首款' },
                    { time: '2026-09-25 16:40', amount: 51200, ratio: 100, by: '赵敏', note: '施工合同收齐' },
                ],
            },
            {
                id: 'HT20260924023-2',
                type: '仅代办',
                totalPrice: 26000,
                signedTime: '2026-09-24 09:50',
                submitter: '李娜',
                receiverRole: 'agent',
                receiverName: '孙磊',
                workloadMode: '采用绘图员版本',
                attachments: ['代办合同.pdf'],
                quoteAttachments: ['代办报价单.pdf'],
                collections: [
                    { time: '2026-09-26 11:30', amount: 13000, ratio: 50, by: '赵敏', note: '代办合同首款' },
                ],
            },
        ],
    },
    // 合同收款已收齐、施工服务仍在进行：财务列表显示「服务中 + 已收讫」
    {
        id: 'FW20260925024',
        project: '新天地广场',
        projectType: '商业广场',
        location: '3F-12 铺位 · 轻餐吧',
        area: 260,
        customer: '黄先生',
        phone: '138****2416',
        email: 'huang2@example.com',
        currentNode: 'construction',
        status: '服务中',
        hasInspect: false,
        hasDeclare: false,
        assignee: '赵敏',
        assigneeRole: 'finance',
        createTime: '2026-09-25 10:40',
        updateTime: '2026-09-26 16:20',
        contracts: [
            {
                id: 'HT20260925024-1',
                type: '仅施工',
                totalPrice: 104000,
                signedTime: '2026-09-25 11:20',
                submitter: '李娜',
                receiverRole: 'pm',
                receiverName: '张伟',
                workloadMode: '采用绘图员版本',
                attachments: ['施工合同.pdf'],
                quoteAttachments: ['施工报价单.pdf'],
                collections: [
                    { time: '2026-09-26 10:00', amount: 62400, ratio: 60, by: '赵敏', note: '首款' },
                    { time: '2026-09-26 16:20', amount: 41600, ratio: 100, by: '赵敏', note: '施工合同收齐' },
                ],
            },
        ],
    },
];

export function roleLabel(role: RoleId): string {
    return ROLES.find((r) => r.id === role)?.label ?? role;
}

// 合同金额脱敏：仅财务人员视图与报价员确认合同表单可查看完整金额
export function canViewContractAmount(role: RoleId): boolean {
    return role === 'finance';
}

// 已推进到合同之后的服务节点（用于推导历史示例数据的合同记录）
const POST_CONTRACT_NODES: NodeId[] = ['inspect', 'construction', 'declare', 'acceptance', 'collection'];

// 服务单的合同记录：显式配置优先，历史示例数据按服务内容推导
export function orderContracts(order: Order): ContractRecord[] {
    if (order.contracts) return order.contracts;
    if (order.status === '已终止') return [];
    const pastContract = POST_CONTRACT_NODES.includes(order.currentNode) || order.status === '已完成' || order.status === '已结束';
    if (!pastContract) return [];

    const hasAgency = order.hasInspect || order.hasDeclare;
    const type: ContractType = hasAgency ? '完整施工代办' : '仅施工';
    const totalPrice = order.area * 400;
    const ratio =
        order.status === '已完成' ? 100 :
        order.status === '已结束' ? 60 :
        order.currentNode === 'collection' ? 60 :
        order.currentNode === 'acceptance' ? 80 :
        order.currentNode === 'declare' ? 70 :
        order.currentNode === 'construction' ? 40 : 30;
    return [{
        id: `HT-${order.id.slice(2)}-1`,
        type,
        totalPrice,
        signedTime: order.updateTime,
        submitter: QUOTER_NAME,
        receiverRole: hasAgency ? 'agent' : 'pm',
        receiverName: hasAgency ? AGENT_NAME : PM_NAME,
        workloadMode: '采用绘图员版本',
        workloads: DEFAULT_WORKLOADS,
        workloadAttachments: ['工作量清单.xlsx'],
        drawingAttachments: ['深化图纸.pdf', '计算书.pdf'],
        attachments: hasAgency ? ['施工合同.pdf', '代办合同.pdf'] : ['施工合同.pdf'],
        quoteAttachments: hasAgency ? ['施工报价单.pdf', '代办报价单.pdf'] : ['施工报价单.pdf'],
        remark: '系统按服务内容推导的历史合同记录',
        collections: ratio > 0 ? [{ time: order.updateTime, amount: Math.round(totalPrice * ratio / 100), ratio, by: FINANCE_NAME }] : [],
    }];
}

// 单份合同的最新累计收款比例
export function contractRatio(contract: ContractRecord): number {
    return contract.collections.length ? contract.collections[contract.collections.length - 1].ratio : 0;
}

// 合同收款支线是否完结：全部已签合同收款 100%
export function orderCollectionDone(order: Order): boolean {
    const contracts = orderContracts(order);
    return contracts.length > 0 && contracts.every((c) => contractRatio(c) >= 100);
}

export function orderNeedsCollection(order: Order): boolean {
    if (!isActiveOrder(order)) return false;
    const contracts = orderContracts(order);
    return contracts.length > 0 && !orderCollectionDone(order);
}

// 服务支线是否完结：进入合同收款节点或服务单已完成
export function orderServiceDone(order: Order): boolean {
    return order.status === '已完成' || order.currentNode === 'collection';
}

export function hasConstructionContract(order: Order): boolean {
    return orderContracts(order).some((c) => c.type !== '仅代办');
}

// 合同最终确认的工作量清单：取含施工服务且已配置清单的合同，否则沿用绘图员提交版本
export function orderConfirmedWorkloads(order: Order): WorkloadItem[] {
    const contract = [...orderContracts(order)].reverse().find((c) => c.type !== '仅代办' && c.workloads?.length);
    return contract?.workloads ?? DEFAULT_WORKLOADS;
}

// 施工节点累计完成量：优先取显式扣减记录，历史数据按节点位置推导
export function orderConstructionDone(order: Order): WorkloadItem[] {
    const planned = orderConfirmedWorkloads(order);
    if (order.constructionDone) return order.constructionDone;
    const visible = visibleNodes(order);
    const ci = visible.findIndex((n) => n.id === 'construction');
    const cur = visible.findIndex((n) => n.id === order.currentNode);
    const passed = order.status === '已完成' || order.status === '已结束' || order.completedNodes?.includes('construction') || (ci >= 0 && cur > ci);
    const ratio = passed ? 1 : 0.5;
    return planned.map((w) => ({
        system: w.system,
        component: w.component,
        fresh: Math.round(w.fresh * ratio),
        remove: Math.round(w.remove * ratio),
        move: Math.round(w.move * ratio),
    }));
}

// 工作量合计：新装 + 拆除 + 移位点位总量
export function workloadVolume(items: WorkloadItem[]): number {
    return items.reduce((sum, w) => sum + w.fresh + w.remove + w.move, 0);
}

// 施工进度：按合同确认清单总量与已扣减完成量计算，100% 时施工节点完成
export function constructionProgress(order: Order): { planned: number; done: number; percent: number } {
    const planned = workloadVolume(orderConfirmedWorkloads(order));
    const done = workloadVolume(orderConstructionDone(order));
    const percent = planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;
    return { planned, done, percent };
}

export function hasAgencyContract(order: Order): boolean {
    return orderContracts(order).some((c) => c.type !== '仅施工');
}

// 报价员是否还需补充签订另一类服务合同（仅施工 ↔ 仅代办）
export function needsMoreContracts(order: Order): boolean {
    if (!isActiveOrder(order)) return false;
    const contracts = orderContracts(order);
    if (contracts.length === 0) return false;
    if (contracts.some((c) => c.type === '完整施工代办')) return false;
    const construction = hasConstructionContract(order);
    const agency = hasAgencyContract(order);
    if (construction && agency) return false;
    if (construction && !agency) return order.hasInspect || order.hasDeclare;
    return true;
}

export function orderCollectionProgress(order: Order): { done: number; total: number; ratio: number } {
    const contracts = orderContracts(order);
    const done = contracts.filter((c) => contractRatio(c) >= 100).length;
    const ratio = contracts.length
        ? Math.round(contracts.reduce((sum, c) => sum + contractRatio(c), 0) / contracts.length)
        : 0;
    return { done, total: contracts.length, ratio };
}

// 补签合同将新增、且位置早于当前节点的节点（按完整流程顺序）：服务单需回退至这些节点
export function supplementRollbackNodes(order: Order, contractType: ContractType): NodeId[] {
    const before = new Set(visibleNodes(order).map((n) => n.id));
    const preview: Order = {
        ...order,
        contracts: [
            ...orderContracts(order),
            {
                id: 'preview',
                type: contractType,
                signedTime: order.updateTime,
                submitter: '',
                receiverRole: 'agent',
                receiverName: '',
                workloadMode: '采用绘图员版本',
                attachments: [],
                quoteAttachments: [],
                collections: [],
            },
        ],
    };
    const after = visibleNodes(preview);
    const curIdx = after.findIndex((n) => n.id === order.currentNode);
    return after.filter((n, i) => !before.has(n.id) && i < curIdx).map((n) => n.id);
}

// 回退前已完成、回退期间需保持「已完成」的节点（不含本次回退的新增节点）
export function completedBeforeCurrent(order: Order, rollbackNodes: NodeId[]): NodeId[] {
    const visible = visibleNodes(order);
    const cur = visible.findIndex((n) => n.id === order.currentNode);
    if (cur < 0) return [];
    return visible.slice(0, cur).filter((n) => !rollbackNodes.includes(n.id)).map((n) => n.id);
}

export function assignPoolOrders(): Order[] {
    return ORDERS.filter((o) => o.currentNode === 'assign' && isActiveOrder(o));
}

// 按角色过滤服务单：待我处理 = 服务中且当前节点由该角色处置
export function ordersForRole(role: RoleId): Order[] {
    if (role === 'customer') {
        return ORDERS.filter((o) => o.customer === '林女士');
    }
    // 员工「待我处理」列表：仅展示服务中、当前节点归属该角色的服务单
    return ORDERS.filter((o) => o.assigneeRole === role && isActiveOrder(o));
}

// 客户工作台分类：待确认仍属进行中；已结束与已终止同归历史终止类，避免单据从三个 tab 全部消失
export function customerOrdersByTab(tab: '进行中' | '已完成' | '已终止'): Order[] {
    const mine = ORDERS.filter((o) => o.customer === '林女士');
    if (tab === '进行中') return mine.filter((o) => o.status === '服务中' || o.status === '待确认');
    if (tab === '已完成') return mine.filter((o) => o.status === '已完成');
    return mine.filter((o) => o.status === '已终止' || o.status === '已结束');
}

// 员工角色负责的节点（用于判断「服务中」：是否已处理过该服务单）
const ROLE_NODES: Partial<Record<RoleId, NodeId[]>> = {
    drafter: ['deepen'],
    pm: ['assign', 'review', 'construction', 'acceptance'],
    quoter: ['contract'],
    finance: ['collection'],
    agent: ['inspect', 'declare'],
};

// 服务单是否在途：创建即服务中，直至完成 / 结束 / 终止
export function isActiveOrder(order: Order): boolean {
    return order.status === '服务中';
}

// 是否为当前节点处理人（仅该用户可见节点处置态「待处理」）
export function isPendingFor(order: Order, role: RoleId): boolean {
    if (role === 'customer' || role === 'finance') return false;
    return isActiveOrder(order) && order.assigneeRole === role;
}

// 查看者看到的状态：「待处理」为派生口径，不改变服务单持久状态
export function displayStatus(order: Order, role?: RoleId): DisplayStatus {
    if (role && isPendingFor(order, role)) return '待处理';
    return order.status;
}

// 员工「服务中」列表：本人负责节点已推进、服务单仍在流转（未完结）。
export function staffDoingOrders(role: RoleId): Order[] {
    const active = ORDERS.filter(isActiveOrder);
    const nodes = ROLE_NODES[role] ?? [];
    return active.filter((o) => {
        const visible = visibleNodes(o);
        const curIdx = visible.findIndex((n) => n.id === o.currentNode);
        return nodes.some((nid) => {
            const idx = visible.findIndex((n) => n.id === nid);
            return idx >= 0 && idx <= curIdx && nid !== o.currentNode;
        });
    });
}

// 员工工作台统计
// 待处理：服务中且当前节点由该角色处置（负责用户可见「待处理」）
// 服务中：当前用户负责节点已推进、仍在流转（未完结）的服务单
export function staffStats(role: RoleId): { todo: number; doing: number } {
    const active = ORDERS.filter(isActiveOrder);
    const todo = active.filter((o) => o.assigneeRole === role).length;
    // 财务视角「服务中」口径与财务可见服务单列表保持一致
    const doing = role === 'finance'
        ? staffListOrders('finance').filter(isActiveOrder).length
        : staffDoingOrders(role).length;
    return { todo, doing };
}

// 员工服务单列表：当前指派给自己 + 已处理过仍在流转的服务单（含可撤回项）
// 另：项目经理/报价员作为「结束服务」会签人，可看到待会签的服务单
export function staffListOrders(role: RoleId): Order[] {
    const doingIds = new Set(staffDoingOrders(role).map((o) => o.id));
    return ORDERS.filter((o) => {
        if (o.assigneeRole === role || doingIds.has(o.id)) return true;
        if (o.endRequest && o.status === '待确认' && (role === 'pm' || role === 'quoter')) return true;
        // 报价员可继续补充签订另一类服务合同；财务并行跟进已签合同的收款
        if (role === 'quoter' && needsMoreContracts(o)) return true;
        if (role === 'finance' && orderNeedsCollection(o)) return true;
        return false;
    });
}

// 是否可发起「结束服务」：员工处于当前处置节点、服务单仍在流转且未发起过
export function canEndService(role: RoleId, order: Order): boolean {
    if (role === 'customer') return false;
    if (order.endRequest) return false;
    if (!isActiveOrder(order)) return false;
    return role === nodeHandlerRole(order.currentNode);
}

// 「结束服务」待确认（会签）列表：项目经理/报价员需要确认的服务单
export function pendingConfirmOrders(role: RoleId): Order[] {
    if (role !== 'pm' && role !== 'quoter') return [];
    return ORDERS.filter((o) => {
        if (!o.endRequest) return false;
        return role === 'pm' ? !o.endRequest.pmConfirmed : !o.endRequest.quoterConfirmed;
    });
}

function nodeVisible(order: Order, n: Node): boolean {
    if (!n.optional) return true;
    switch (n.id) {
        case 'assign': return !!order.needAssign;
        // 服务节点按已签合同的服务项动态生成
        case 'inspect': return order.hasInspect && hasAgencyContract(order);
        case 'declare': return order.hasDeclare && hasAgencyContract(order);
        case 'construction': return hasConstructionContract(order);
        case 'acceptance': return hasConstructionContract(order);
        case 'collection': return orderContracts(order).length > 0;
        default: return true;
    }
}

// 节点状态计算（用于详情进度条）
export type NodeState = 'done' | 'current' | 'todo' | 'returning';

export function nodeState(order: Order, nodeId: NodeId): NodeState {
    const visible = visibleNodes(order);
    const idx = visible.findIndex((n) => n.id === nodeId);
    const cur = visible.findIndex((n) => n.id === order.currentNode);
    // 回退前已完成：回退期间保持「已完成」，不回退重办
    if (order.completedNodes?.includes(nodeId)) return 'done';
    // 回退目标节点：新增节点办完后自动回到该节点，原处置进度保留（合同收款为并行支线，不标待回办）
    if (order.rollback?.returnNode === nodeId && nodeId !== 'collection' && isActiveOrder(order)) return 'returning';
    if (order.status === '已完成') return 'done';
    if (order.status === '已终止' || order.status === '已结束' || order.status === '待确认') return idx < cur ? 'done' : 'todo';
    if (idx < cur) return 'done';
    if (idx === cur) return 'current';
    return 'todo';
}

export function visibleNodes(order: Order): Node[] {
    return NODES.filter((n) => nodeVisible(order, n));
}

export function nodeLabel(nodeId: NodeId): string {
    return NODES.find((n) => n.id === nodeId)?.label ?? nodeId;
}

// 节点 -> 处理角色（用于判定撤回权限）
export function nodeHandlerRole(nodeId: NodeId): RoleId {
    switch (nodeId) {
        case 'create': return 'customer';
        case 'assign': return 'pm';
        case 'deepen': return 'drafter';
        case 'review': return 'pm';
        case 'contract': return 'quoter';
        case 'inspect': return 'agent';
        case 'construction': return 'pm';
        case 'declare': return 'agent';
        case 'acceptance': return 'pm';
        case 'collection': return 'finance';
        default: return 'customer';
    }
}

// 按完整流程顺序找到当前节点之后第一个未完成节点（自动跳过回退前已完成的节点）
export function nextPendingNode(order: Order): NodeId | null {
    const visible = visibleNodes(order);
    const cur = visible.findIndex((n) => n.id === order.currentNode);
    for (let i = cur + 1; i < visible.length; i++) {
        const id = visible[i].id;
        if (order.completedNodes?.includes(id)) continue;
        return id;
    }
    return null;
}

// 角色默认处理人（原型示例数据取该角色首个用户）
export function defaultAssigneeName(role: RoleId): string {
    return USERS.find((u) => u.role === role)?.name ?? ROLES.find((r) => r.id === role)?.name ?? role;
}

export interface AdvanceResult {
    next: NodeId;
    // 是否为「新增节点办完、自动回流原节点」
    returned: boolean;
    patch: Partial<Order>;
}

// 当前节点提交后应推进到的节点，及需要写回服务单的状态
export function resolveAdvance(order: Order, handler?: { role: RoleId; name: string }): AdvanceResult | null {
    const next = nextPendingNode(order);
    if (!next) return null;
    const rb = order.rollback;
    if (rb && next === rb.returnNode) {
        return {
            next,
            returned: true,
            patch: {
                currentNode: next,
                assigneeRole: rb.returnRole,
                assignee: rb.returnAssignee,
                rollback: undefined,
                completedNodes: Array.from(new Set([...(order.completedNodes ?? []), ...rb.insertedNodes])),
            },
        };
    }
    if (rb && rb.insertedNodes.includes(next)) {
        return { next, returned: false, patch: { currentNode: next, assigneeRole: rb.handlerRole, assignee: rb.handlerAssignee } };
    }
    const role = handler?.role ?? nodeHandlerRole(next);
    return { next, returned: false, patch: { currentNode: next, assigneeRole: role, assignee: handler?.name ?? defaultAssigneeName(role) } };
}

// 是否可撤回：本人为上一节点处理者，且服务单已提交到下一节点、尚未推进到下下节点
// 客户无撤回操作，仅员工可撤回
export function canWithdraw(role: RoleId, order: Order): boolean {
    if (role === 'customer') return false;
    if (!isActiveOrder(order)) return false;
    // 回退链内：只允许新增节点处置人对已提交的新增节点撤回
    if (order.rollback) {
        const chain = order.rollback.insertedNodes;
        const i = chain.indexOf(order.currentNode);
        return i > 0 && role === order.rollback.handlerRole;
    }
    const visible = visibleNodes(order);
    const curIdx = visible.findIndex((n) => n.id === order.currentNode);
    if (curIdx <= 0) return false;
    return role === nodeHandlerRole(visible[curIdx - 1].id);
}

// 是否可取消服务单（客户专用）：创建后、绘图员尚未进行图纸深化
export function canCancelService(role: RoleId, order: Order): boolean {
    if (role !== 'customer') return false;
    if (!isActiveOrder(order)) return false;
    return order.currentNode === 'deepen' || order.currentNode === 'assign';
}

// 人民币金额转大写（用于表单大写金额标签）
const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_INT_UNITS = ['', '拾', '佰', '仟'];
const CN_GROUP_UNITS = ['', '万', '亿', '万亿'];

function groupToChinese(g: string): string {
    let res = '';
    let zero = false;
    for (let i = 0; i < g.length; i++) {
        const d = Number(g[i]);
        const pos = g.length - 1 - i;
        if (d === 0) {
            zero = true;
        } else {
            if (zero && res !== '') res += '零';
            zero = false;
            res += CN_DIGITS[d] + CN_INT_UNITS[pos];
        }
    }
    return res;
}

function intToChinese(n: number): string {
    if (n === 0) return '零';
    const s = String(n);
    const groups: string[] = [];
    for (let i = s.length; i > 0; i -= 4) groups.unshift(s.slice(Math.max(0, i - 4), i));
    let res = '';
    for (let i = 0; i < groups.length; i++) {
        const conv = groupToChinese(groups[i]);
        if (!conv) continue;
        const unitIdx = groups.length - 1 - i;
        if (i > 0 && groups[i].length < 4) res += '零';
        res += conv + CN_GROUP_UNITS[unitIdx];
    }
    return res;
}

export function amountToChinese(value: number | string): string {
    const n = Number(value);
    if (!isFinite(n) || n < 0) return '';
    const fen = Math.round(n * 100);
    if (fen === 0) return '零元整';
    const yuan = Math.floor(fen / 100);
    const jiao = Math.floor((fen % 100) / 10);
    const f = fen % 10;
    let res = '';
    if (yuan > 0) res += intToChinese(yuan) + '元';
    if (jiao === 0 && f === 0) {
        res += '整';
    } else {
        if (jiao > 0) res += CN_DIGITS[jiao] + '角';
        else if (f > 0 && yuan > 0) res += '零';
        if (f > 0) res += CN_DIGITS[f] + '分';
    }
    return res;
}

// 节点提交记录（用于详情页节点文件区展开展示）
export interface NodeSubmission {
    submitter: string;
    time: string;
    version: string;
    formRecords: { label: string; value: string }[];
    attachments: string[];
}

const DRAFTER_NAME = '王强';
const PM_NAME = '张伟';
const QUOTER_NAME = '李娜';
const FINANCE_NAME = '赵敏';
const AGENT_NAME = '孙磊';

export function nodeSubmission(order: Order, nodeId: NodeId, viewerRole: RoleId = 'customer'): NodeSubmission {
    const agency = [order.hasInspect ? '代办审图' : '', order.hasDeclare ? '代办申报' : ''].filter(Boolean).join('、') || '无';
    switch (nodeId) {
        case 'create':
            return {
                submitter: order.customer,
                time: order.createTime,
                version: 'V1',
                formRecords: [
                    { label: '项目名称', value: order.project },
                    { label: '项目类型', value: order.projectType },
                    { label: '施工位置', value: order.location },
                    { label: '施工面积', value: `${order.area} ㎡` },
                    { label: '代办服务', value: agency },
                ],
                attachments: ['初始图纸.pdf'],
            };
        case 'assign':
            return {
                submitter: order.assignee === '待分配' ? PM_NAME : order.assignee,
                time: order.updateTime,
                version: 'V1',
                formRecords: [
                    { label: '现场勘验结论', value: '现场尺寸与图纸一致，具备施工条件' },
                    { label: '指派绘图员', value: '王强 · 设计部' },
                    { label: '指派说明', value: '已完成现场勘验，转绘图深化' },
                ],
                attachments: ['现场勘验记录.pdf'],
            };
        case 'deepen': {
            // 报价员在确认合同阶段线下重勘后，最终确认版会追加回绘图员过程文件
            const reconfirmed = orderContracts(order).some((c) => c.workloadMode === '上传最终确认版');
            return {
                submitter: DRAFTER_NAME,
                time: order.updateTime,
                version: reconfirmed ? 'V2' : 'V1',
                formRecords: [
                    { label: '工作量清单', value: '消防喷淋 · 喷头：新装 24 / 拆除 6 / 移位 8 等' },
                    { label: '备注', value: reconfirmed ? '报价员线下重勘后已更新最终确认版' : '按现场复核调整' },
                ],
                attachments: reconfirmed
                    ? ['深化图纸.pdf', '计算书.pdf', '工作量清单.xlsx', '深化图纸（最终确认版）.pdf', '工作量清单（最终确认版）.xlsx']
                    : ['深化图纸.pdf', '计算书.pdf', '工作量清单.xlsx'],
            };
        }
        case 'review':
            return {
                submitter: PM_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [{ label: '审核结果', value: '通过' }],
                attachments: [],
            };
        case 'contract': {
            const contracts = orderContracts(order);
            const totalPrice = contracts.reduce((sum, c) => sum + (c.totalPrice ?? 0), 0);
            const showAmount = canViewContractAmount(viewerRole);
            return {
                submitter: QUOTER_NAME,
                time: contracts[contracts.length - 1]?.signedTime ?? order.updateTime,
                version: contracts.length > 1 ? 'V2' : 'V1',
                formRecords: [
                    ...contracts.flatMap((c, i) => [
                        { label: `合同 ${i + 1} · 服务项`, value: c.type },
                        { label: `合同 ${i + 1} · 合同总价`, value: c.totalPrice ? (showAmount ? `¥${c.totalPrice.toLocaleString()}.00` : '金额已脱敏') : '未填写' },
                        { label: `合同 ${i + 1} · 收款进度`, value: `${contractRatio(c)}%` },
                        { label: `合同 ${i + 1} · 工作量确认`, value: c.workloadMode },
                        { label: `合同 ${i + 1} · 下一节点`, value: `${roleLabel(c.receiverRole)} · ${c.receiverName}` },
                    ]),
                    {
                        label: '合同总价合计',
                        value: totalPrice
                            ? (showAmount ? `¥${totalPrice.toLocaleString()}.00 · ${amountToChinese(totalPrice)}` : '金额已脱敏')
                            : '未填写',
                    },
                ],
                attachments: contracts.flatMap((c) => [...c.attachments, ...c.quoteAttachments]),
            };
        }
        case 'inspect':
            return {
                submitter: AGENT_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [{ label: '审图结果', value: '审图通过' }],
                attachments: ['审图意见书.pdf'],
            };
        case 'construction': {
            const progress = constructionProgress(order);
            return {
                submitter: PM_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [
                    { label: '施工工作量进度', value: `${progress.percent}%（已完成 ${progress.done} / 合同确认 ${progress.planned} 点位）` },
                    { label: '扣减依据', value: '按合同最终确认的工作量清单逐行扣减' },
                ],
                attachments: ['施工进度照片.jpg', '施工记录.pdf'],
            };
        }
        case 'declare':
            return {
                submitter: AGENT_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [{ label: '申报状态', value: '申报通过' }],
                attachments: ['申报回执.pdf'],
            };
        case 'acceptance':
            return {
                submitter: PM_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [{ label: '验收结果', value: '验收通过' }],
                attachments: ['验收报告.pdf', '竣工验收单.pdf'],
            };
        case 'collection': {
            const contracts = orderContracts(order);
            const received = contracts.reduce((sum, c) => sum + c.collections.reduce((s, r) => s + r.amount, 0), 0);
            const showAmount = canViewContractAmount(viewerRole);
            return {
                submitter: FINANCE_NAME,
                time: order.updateTime,
                version: 'V1',
                formRecords: [
                    ...contracts.map((c, i) => ({
                        label: `合同 ${i + 1} · ${c.type}收款`,
                        value: `${contractRatio(c)}%（已填写 ${c.collections.length} 次）`,
                    })),
                    { label: '累计已收款', value: showAmount ? `¥${received.toLocaleString()}.00` : '金额已脱敏' },
                    { label: '收款支线状态', value: orderCollectionDone(order) ? '已完结（100%）' : '进行中' },
                ],
                attachments: ['收款凭证.pdf', '发票.pdf'],
            };
        }
        default:
            return {
                submitter: order.assignee,
                time: order.updateTime,
                version: 'V1',
                formRecords: [],
                attachments: [],
            };
    }
}
