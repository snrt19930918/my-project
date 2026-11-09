// 二装施工过程管理 · Web 管理后台 · 示例数据与类型定义
// 业务口径与小程序端 fitout-process/data.ts 保持一致：5 个服务单持久状态 + 派生的「待处理」节点处置态

export type RoleId = 'customer' | 'drafter' | 'pm' | 'quoter' | 'finance' | 'agent';

// Web 端角色模拟：系统管理员只读，员工角色按岗位权限门控
export type ViewerRole = 'admin' | 'drafter' | 'pm' | 'quoter' | 'finance' | 'agent';

// Web 后台管理权限：与节点处置权限并列，控制后台功能模块访问
export type AdminPermissionId = 'biz' | 'sys';

export const ADMIN_PERMISSIONS: { id: AdminPermissionId; label: string; desc: string; scope: string }[] = [
    {
        id: 'biz',
        label: '业务管理员',
        desc: '可使用业务管理模块的项目管理与服务单管理，查看与管理全量业务数据，并查看全局统计报表。',
        scope: '业务管理 · 项目点位 / 服务单管理、数据与配置 · 统计报表',
    },
    {
        id: 'sys',
        label: '系统管理员',
        desc: '可使用账号管理与数据与配置模块的系统管理功能。',
        scope: '账号管理 · 员工账户 / 业主信息、数据与配置 · 流程编排 / 岗位配置 / 通知与超时',
    },
];

export function hasAdminPerm(perms: AdminPermissionId[], id: AdminPermissionId): boolean {
    return perms.includes(id);
}

export function adminPermLabel(perms: AdminPermissionId[]): string {
    if (perms.length === 0) return '无后台管理权限';
    return ADMIN_PERMISSIONS.filter((p) => perms.includes(p.id)).map((p) => p.label).join(' + ');
}

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

export type ProjectStatus = '启用' | '停用' | '临时';
export type AccountStatus = '启用' | '停用';

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
    contracts?: ContractRecord[];
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

export interface Project {
    id: string;
    name: string;
    alias?: string;
    type: '商业广场' | '办公楼';
    address: string;
    status: ProjectStatus;
    manager: string;
    orderCount: number;
    // 专属服务团队：岗位 -> 负责人；为空表示走共享池
    team: Record<string, string>;
}

export interface StaffAccount {
    id: string;
    name: string;
    role: string;
    dept: string;
    phone: string;
    status: AccountStatus;
    createTime: string;
}

export interface OwnerAccount {
    id: string;
    name: string;
    phone: string;
    email: string;
    orderCount: number;
    status: AccountStatus;
    registerTime: string;
}

export const ROLES: Role[] = [
    { id: 'customer', label: '客户', name: '林女士' },
    { id: 'drafter', label: '绘图员', name: '王强', dept: '设计部' },
    { id: 'pm', label: '项目经理', name: '张伟', dept: '工程部' },
    { id: 'quoter', label: '报价员', name: '李娜', dept: '商务部' },
    { id: 'finance', label: '财务人员', name: '赵敏', dept: '财务部' },
    { id: 'agent', label: '代办人员', name: '孙磊', dept: '外勤部' },
];

// Web 角色模拟下拉：仅员工角色可处置业务，系统管理员为只读视角
export const VIEWER_ROLES: { id: ViewerRole; label: string; desc: string }[] = [
    { id: 'admin', label: '系统管理员', desc: '只读运营视角，可分派共享池工单' },
    { id: 'drafter', label: '绘图员 · 王强', desc: '创建、图纸深化' },
    { id: 'pm', label: '项目经理 · 张伟', desc: '评估指派、审核、施工、验收、结束服务会签' },
    { id: 'quoter', label: '报价员 · 李娜', desc: '确认/补签合同、结束服务会签' },
    { id: 'finance', label: '财务人员 · 赵敏', desc: '合同收款，可查看完整金额' },
    { id: 'agent', label: '代办人员 · 孙磊', desc: '审图、申报代办凭证' },
];

export function viewerRoleLabel(role: ViewerRole): string {
    return VIEWER_ROLES.find((r) => r.id === role)?.label ?? role;
}

export function viewerUserName(role: ViewerRole): string {
    if (role === 'admin') return '系统管理员';
    return ROLES.find((r) => r.id === role)?.name ?? role;
}

// 各角色下的可指派用户（用于「下一节点接收用户」选择）
export const WORK_USERS: User[] = [
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

export function workUsersForRole(role: RoleId): User[] {
    return WORK_USERS.filter((u) => u.role === role);
}

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

// 节点处置权限（权限名称按处置节点操作权限命名）
export const NODE_PERMISSIONS: Record<NodeId, string> = {
    create: '创建处置权',
    assign: '评估指派处置权',
    deepen: '图纸深化处置权',
    review: '审核处置权',
    contract: '合同处置权',
    inspect: '审图处置权',
    construction: '施工处置权',
    declare: '申报处置权',
    acceptance: '验收处置权',
    collection: '合同收款处置权',
};

// 岗位（可自定义），绑定功能权限；系统按「岗位是否绑定节点处置权限」判断处置权
// adminPermissions 为 Web 后台管理权限，与节点处置权限相互独立
export interface Position {
    id: string;
    name: string;
    permissions: NodeId[];
    adminPermissions: AdminPermissionId[];
}

export const POSITIONS: Position[] = [
    { id: 'drafter', name: '绘图员', permissions: ['create', 'deepen'], adminPermissions: [] },
    { id: 'pm', name: '项目经理', permissions: ['assign', 'review', 'construction', 'acceptance'], adminPermissions: ['biz'] },
    { id: 'quoter', name: '报价员', permissions: ['contract'], adminPermissions: [] },
    { id: 'finance', name: '财务人员', permissions: ['collection'], adminPermissions: [] },
    { id: 'agent', name: '代办人员', permissions: ['inspect', 'declare'], adminPermissions: [] },
    { id: 'worker', name: '施工人员', permissions: ['construction'], adminPermissions: [] },
    { id: 'sysadmin', name: '系统管理员', permissions: [], adminPermissions: ['sys'] },
];

export const PROJECTS: Project[] = [
    {
        id: 'p1', name: '上海静安大悦城', type: '商业广场', address: '静安区西藏北路166号', status: '启用', manager: '张伟', orderCount: 5,
        team: { drafter: '王强', pm: '张伟', quoter: '李娜', finance: '赵敏', agent: '孙磊', worker: '周涛' },
    },
    {
        id: 'p2', name: '虹桥天地', type: '办公楼', address: '闵行区申长路688号', status: '启用', manager: '刘洋', orderCount: 2,
        team: { drafter: '陈晨', pm: '刘洋', quoter: '黄敏', finance: '赵敏', agent: '孙磊', worker: '周涛' },
    },
    {
        id: 'p3', name: '陆家嘴中心', type: '办公楼', address: '浦东新区世纪大道8号', status: '启用', manager: '张伟', orderCount: 4,
        team: { drafter: '林浩', pm: '张伟', quoter: '李娜', finance: '赵敏', agent: '孙磊', worker: '周涛' },
    },
    {
        id: 'p4', name: '港汇恒隆广场', type: '商业广场', address: '徐汇区虹桥路1号', status: '停用', manager: '张伟', orderCount: 3,
        team: { drafter: '王强', pm: '张伟', quoter: '李娜', finance: '赵敏', agent: '孙磊', worker: '周涛' },
    },
    {
        id: 'p5', name: '环球港', type: '商业广场', address: '普陀区中山北路3300号', status: '启用', manager: '—', orderCount: 6,
        team: { drafter: '', pm: '', quoter: '', finance: '', agent: '', worker: '' },
    },
    {
        id: 'p6', name: '新天地广场', type: '商业广场', address: '黄浦区马当路245号', status: '临时', manager: '—', orderCount: 3,
        team: { drafter: '', pm: '', quoter: '', finance: '', agent: '', worker: '' },
    },
];

export const STAFF_ACCOUNTS: StaffAccount[] = [
    { id: 'a1', name: '王强', role: '绘图员', dept: '设计部', phone: '138****0001', status: '启用', createTime: '2026-06-01 09:00' },
    { id: 'a2', name: '张伟', role: '项目经理', dept: '工程部', phone: '138****0002', status: '启用', createTime: '2026-06-01 09:10' },
    { id: 'a3', name: '李娜', role: '报价员', dept: '商务部', phone: '138****0003', status: '启用', createTime: '2026-06-01 09:20' },
    { id: 'a4', name: '赵敏', role: '财务人员', dept: '财务部', phone: '138****0004', status: '启用', createTime: '2026-06-01 09:30' },
    { id: 'a5', name: '孙磊', role: '代办人员', dept: '外勤部', phone: '138****0005', status: '启用', createTime: '2026-06-01 09:40' },
    { id: 'a6', name: '周涛', role: '施工人员', dept: '工程部', phone: '138****0006', status: '停用', createTime: '2026-06-01 09:50' },
    { id: 'a7', name: '陈晨', role: '绘图员', dept: '设计部', phone: '138****0007', status: '启用', createTime: '2026-06-02 09:00' },
    { id: 'a8', name: '林浩', role: '绘图员', dept: '设计部', phone: '138****0008', status: '启用', createTime: '2026-06-02 09:10' },
    { id: 'a9', name: '刘洋', role: '项目经理', dept: '工程部', phone: '138****0009', status: '启用', createTime: '2026-06-02 09:20' },
    { id: 'a10', name: '黄敏', role: '报价员', dept: '商务部', phone: '138****0010', status: '启用', createTime: '2026-06-02 09:30' },
    { id: 'a11', name: '周芳', role: '财务人员', dept: '财务部', phone: '138****0011', status: '启用', createTime: '2026-06-02 09:40' },
    { id: 'a12', name: '郭涛', role: '代办人员', dept: '外勤部', phone: '138****0012', status: '启用', createTime: '2026-06-02 09:50' },
];

export const OWNER_ACCOUNTS: OwnerAccount[] = [
    { id: 'o1', name: '林女士', phone: '138****2211', email: 'lin@example.com', orderCount: 8, status: '启用', registerTime: '2026-08-12 10:20' },
    { id: 'o2', name: '刘先生', phone: '150****8899', email: 'liu@example.com', orderCount: 4, status: '启用', registerTime: '2026-08-15 14:05' },
    { id: 'o3', name: '陈先生', phone: '139****7788', email: 'chen@example.com', orderCount: 2, status: '启用', registerTime: '2026-09-01 09:30' },
    { id: 'o4', name: '周女士', phone: '136****3344', email: 'zhou@example.com', orderCount: 3, status: '启用', registerTime: '2026-09-03 16:40' },
    { id: 'o5', name: '吴先生', phone: '137****5566', email: 'wu@example.com', orderCount: 2, status: '启用', registerTime: '2026-09-08 11:12' },
    { id: 'o6', name: '郑女士', phone: '135****9900', email: 'zheng@example.com', orderCount: 2, status: '停用', registerTime: '2026-09-12 13:55' },
    { id: 'o7', name: '黄先生', phone: '138****2318', email: 'huang@example.com', orderCount: 2, status: '启用', registerTime: '2026-09-23 10:10' },
];

export const ORDERS: Order[] = [
    { id: 'FW20260922001', project: '上海静安大悦城', projectType: '商业广场', location: '3F-18 铺位 · 精品咖啡', area: 320, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'deepen', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '王强', assigneeRole: 'drafter', createTime: '2026-09-22 10:20', updateTime: '2026-09-22 14:30' },
    { id: 'FW20260921008', project: '上海静安大悦城', projectType: '商业广场', location: '4F-15 铺位 · 精品茶饮', area: 360, customer: '刘先生', phone: '150****8899', email: 'liu@example.com', currentNode: 'review', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-21 16:20', updateTime: '2026-09-22 09:10' },
    { id: 'FW20260920006', project: '新天地广场', projectType: '商业广场', location: 'B1-06 铺位 · 生鲜超市', area: 460, customer: '陈先生', phone: '139****7788', email: 'chen@example.com', currentNode: 'inspect', status: '服务中', hasInspect: true, hasDeclare: false, assignee: '孙磊', assigneeRole: 'agent', createTime: '2026-09-20 09:10', updateTime: '2026-09-21 17:05' },
    { id: 'FW20260918002', project: '虹桥天地', projectType: '办公楼', location: 'T2-1205 室 · 互联网公司', area: 180, customer: '周女士', phone: '136****3344', email: 'zhou@example.com', currentNode: 'contract', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '李娜', assigneeRole: 'quoter', createTime: '2026-09-18 11:40', updateTime: '2026-09-22 09:20' },
    { id: 'FW20260915003', project: '陆家嘴中心', projectType: '办公楼', location: 'L3-301 室 · 律师事务所', area: 520, customer: '吴先生', phone: '137****5566', email: 'wu@example.com', currentNode: 'construction', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-15 14:00', updateTime: '2026-09-22 10:00' },
    { id: 'FW20260921007', project: '环球港', projectType: '商业广场', location: '4F-09 铺位 · 时尚服饰', area: 390, customer: '郑女士', phone: '135****9900', email: 'zheng@example.com', currentNode: 'inspect', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '孙磊', assigneeRole: 'agent', createTime: '2026-09-21 08:30', updateTime: '2026-09-21 16:20' },
    { id: 'FW20260910004', project: '港汇恒隆广场', projectType: '商业广场', location: '5F-22 铺位 · 火锅餐饮', area: 260, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'acceptance', status: '已完成', hasInspect: false, hasDeclare: false, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-10 10:00', updateTime: '2026-09-19 18:30' },
    { id: 'FW20260905005', project: '环球港', projectType: '商业广场', location: '2F-11 铺位 · 美妆集合店', area: 210, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'contract', status: '已终止', hasInspect: false, hasDeclare: false, assignee: '李娜', assigneeRole: 'quoter', createTime: '2026-09-05 13:20', updateTime: '2026-09-08 15:00' },
    { id: 'FW20260919009', project: '港汇恒隆广场', projectType: '商业广场', location: '6F-08 铺位 · 精品书店', area: 280, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'collection', status: '服务中', hasInspect: true, hasDeclare: false, assignee: '赵敏', assigneeRole: 'finance', createTime: '2026-09-19 10:00', updateTime: '2026-09-22 15:00' },
    { id: 'FW20260922011', project: '环球港', projectType: '商业广场', location: '2F-05 铺位 · 精品咖啡', area: 240, customer: '刘先生', phone: '150****2212', email: 'liu2@example.com', currentNode: 'deepen', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '王强', assigneeRole: 'drafter', createTime: '2026-09-22 08:40', updateTime: '2026-09-22 08:40' },
    { id: 'FW20260922012', project: '陆家嘴中心', projectType: '办公楼', location: 'L1-101 室 · 科技公司', area: 360, customer: '吴先生', phone: '137****2213', email: 'wu2@example.com', currentNode: 'review', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-22 09:10', updateTime: '2026-09-22 09:10' },
    { id: 'FW20260922013', project: '新天地广场', projectType: '商业广场', location: 'B2-09 铺位 · 家居店', area: 280, customer: '陈先生', phone: '139****2214', email: 'chen2@example.com', currentNode: 'contract', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '李娜', assigneeRole: 'quoter', createTime: '2026-09-22 10:00', updateTime: '2026-09-22 10:00' },
    { id: 'FW20260920014', project: '虹桥天地', projectType: '办公楼', location: 'T3-1501 室 · 金融公司', area: 300, customer: '周女士', phone: '136****2215', email: 'zhou2@example.com', currentNode: 'construction', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-20 13:20', updateTime: '2026-09-22 11:30' },
    { id: 'FW20260921015', project: '港汇恒隆广场', projectType: '商业广场', location: '6F-21 铺位 · 眼镜店', area: 400, customer: '郑女士', phone: '135****2216', email: 'zheng2@example.com', currentNode: 'inspect', status: '服务中', hasInspect: true, hasDeclare: false, assignee: '孙磊', assigneeRole: 'agent', createTime: '2026-09-21 09:30', updateTime: '2026-09-22 10:45' },
    { id: 'FW20260906016', project: '环球港', projectType: '商业广场', location: '1F-02 铺位 · 便利店', area: 180, customer: '刘先生', phone: '150****2217', email: 'liu3@example.com', currentNode: 'collection', status: '已完成', hasInspect: false, hasDeclare: false, assignee: '赵敏', assigneeRole: 'finance', createTime: '2026-09-06 09:00', updateTime: '2026-09-15 17:00' },
    { id: 'FW20260922017', project: '上海静安大悦城', projectType: '商业广场', location: '2F-03 铺位 · 精品烘焙', area: 320, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'deepen', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '王强', assigneeRole: 'drafter', createTime: '2026-09-22 15:30', updateTime: '2026-09-22 15:30' },
    {
        id: 'FW20260923018', project: '陆家嘴中心', projectType: '办公楼', location: 'L5-502 室 · 贸易公司', area: 300, customer: '黄先生', phone: '138****2318', email: 'huang@example.com', currentNode: 'deepen', status: '待确认', hasInspect: false, hasDeclare: false, assignee: '王强', assigneeRole: 'drafter', createTime: '2026-09-23 09:00', updateTime: '2026-09-23 11:20',
        endRequest: {
            reason: '客户经营方向调整，取消本次装修计划', initiator: '王强', initiatorRole: 'drafter', time: '2026-09-23 11:20',
            pmConfirmed: false, quoterConfirmed: false,
        },
    },
    {
        id: 'FW20260918019', project: '环球港', projectType: '商业广场', location: '3F-16 铺位 · 宠物店', area: 220, customer: '刘先生', phone: '150****2319', email: 'liu4@example.com', currentNode: 'construction', status: '已结束', hasInspect: false, hasDeclare: false, assignee: '赵敏', assigneeRole: 'finance', createTime: '2026-09-18 10:00', updateTime: '2026-09-20 16:40',
        endRequest: {
            reason: '客户资金链紧张，暂缓施工并结束服务', initiator: '赵敏', initiatorRole: 'finance', time: '2026-09-20 09:30',
            pmConfirmed: true, quoterConfirmed: true, pmName: '张伟', quoterName: '李娜', pmTime: '2026-09-20 10:15', quoterTime: '2026-09-20 16:40',
        },
    },
    // 客户下单 · 项目后台未配置跟进人员 → 进入全体项目经理可见的指派池
    { id: 'FW20260924020', project: '环球港', projectType: '商业广场', location: '3F-08 铺位 · 儿童成长中心', area: 340, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'assign', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '待分配', assigneeRole: 'pm', needAssign: true, createTime: '2026-09-24 09:20', updateTime: '2026-09-24 09:20' },
    // 客户下单 · 项目已配置跟进人员 → 自动流转至绘图员，无需项目经理评估
    { id: 'FW20260924021', project: '上海静安大悦城', projectType: '商业广场', location: '1F-12 铺位 · 花艺生活馆', area: 260, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'deepen', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '王强', assigneeRole: 'drafter', createTime: '2026-09-24 10:05', updateTime: '2026-09-24 10:05' },
    // 已签仅施工合同，代办合同待报价员补充确认；施工与收款并行推进
    {
        id: 'FW20260926022', project: '上海静安大悦城', projectType: '商业广场', location: '2F-16 铺位 · 轻食餐厅', area: 300, customer: '林女士', phone: '138****2211', email: 'lin@example.com', currentNode: 'construction', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '张伟', assigneeRole: 'pm', createTime: '2026-09-24 14:20', updateTime: '2026-09-26 15:10',
        contracts: [{
            id: 'HT20260925022-1', type: '仅施工', totalPrice: 98000, signedTime: '2026-09-25 10:30', submitter: '李娜',
            receiverRole: 'pm', receiverName: '张伟', workloadMode: '上传最终确认版',
            attachments: ['施工合同.pdf'], quoteAttachments: ['施工报价单.pdf'], remark: '客户先签订施工合同，代办合同待确认',
            collections: [{ time: '2026-09-26 14:00', amount: 58800, ratio: 60, by: '赵敏', note: '首款到账' }],
        }],
    },
    // 施工与代办两份合同分别收款：施工合同已收齐，代办合同收款中；服务支线已完成
    {
        id: 'FW20260924023', project: '陆家嘴中心', projectType: '办公楼', location: 'L8-806 室 · 咨询公司', area: 320, customer: '周女士', phone: '136****2215', email: 'zhou2@example.com',
        currentNode: 'inspect', status: '服务中', hasInspect: true, hasDeclare: true, assignee: '孙磊', assigneeRole: 'agent',
        createTime: '2026-09-20 09:40', updateTime: '2026-09-26 11:30',
        // 施工/验收已完成、收款进行中补签仅代办：新增审图/申报早于当前收款节点，服务单回退至审图，办完自动回到收款
        rollback: {
            returnNode: 'collection', returnRole: 'finance', returnAssignee: '赵敏',
            insertedNodes: ['inspect', 'declare'], handlerRole: 'agent', handlerAssignee: '孙磊',
            contractType: '仅代办', time: '2026-09-24 09:50',
        },
        completedNodes: ['create', 'deepen', 'review', 'contract', 'construction', 'acceptance'],
        contracts: [
            {
                id: 'HT20260922023-1', type: '仅施工', totalPrice: 128000, signedTime: '2026-09-22 14:10', submitter: '李娜',
                receiverRole: 'pm', receiverName: '张伟', workloadMode: '采用绘图员版本',
                attachments: ['施工合同.pdf'], quoteAttachments: ['施工报价单.pdf'],
                collections: [
                    { time: '2026-09-23 10:20', amount: 76800, ratio: 60, by: '赵敏', note: '首款' },
                    { time: '2026-09-25 16:40', amount: 51200, ratio: 100, by: '赵敏', note: '施工合同收齐' },
                ],
            },
            {
                id: 'HT20260924023-2', type: '仅代办', totalPrice: 26000, signedTime: '2026-09-24 09:50', submitter: '李娜',
                receiverRole: 'agent', receiverName: '孙磊', workloadMode: '采用绘图员版本',
                attachments: ['代办合同.pdf'], quoteAttachments: ['代办报价单.pdf'],
                collections: [{ time: '2026-09-26 11:30', amount: 13000, ratio: 50, by: '赵敏', note: '代办合同首款' }],
            },
        ],
    },
    // 合同收款已收齐、施工服务仍在进行：财务列表显示「服务中 + 已收讫」
    {
        id: 'FW20260925024', project: '新天地广场', projectType: '商业广场', location: '3F-12 铺位 · 轻餐吧', area: 260, customer: '黄先生', phone: '138****2416', email: 'huang2@example.com', currentNode: 'construction', status: '服务中', hasInspect: false, hasDeclare: false, assignee: '赵敏', assigneeRole: 'finance', createTime: '2026-09-25 10:40', updateTime: '2026-09-26 16:20',
        contracts: [{
            id: 'HT20260925024-1', type: '仅施工', totalPrice: 104000, signedTime: '2026-09-25 11:20', submitter: '李娜',
            receiverRole: 'pm', receiverName: '张伟', workloadMode: '采用绘图员版本',
            attachments: ['施工合同.pdf'], quoteAttachments: ['施工报价单.pdf'],
            collections: [
                { time: '2026-09-26 10:00', amount: 62400, ratio: 60, by: '赵敏', note: '首款' },
                { time: '2026-09-26 16:20', amount: 41600, ratio: 100, by: '赵敏', note: '施工合同收齐' },
            ],
        }],
    },
];

export function roleLabel(role: RoleId): string {
    return ROLES.find((r) => r.id === role)?.label ?? role;
}

// 合同金额脱敏：仅财务人员视图可查看完整金额
export function canViewContractAmount(role: RoleId | ViewerRole): boolean {
    return role === 'finance';
}

export function formatMoney(value: number): string {
    return `¥${value.toLocaleString('zh-CN')}.00`;
}

const POST_CONTRACT_NODES: NodeId[] = ['inspect', 'construction', 'declare', 'acceptance', 'collection'];
const DRAFTER_NAME = '王强';
const PM_NAME = '张伟';
const QUOTER_NAME = '李娜';
const FINANCE_NAME = '赵敏';
const AGENT_NAME = '孙磊';

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

export function orderCollectionDone(order: Order): boolean {
    const contracts = orderContracts(order);
    return contracts.length > 0 && contracts.every((c) => contractRatio(c) >= 100);
}

export function orderNeedsCollection(order: Order): boolean {
    if (!isOrderActive(order)) return false;
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
    if (!isOrderActive(order)) return false;
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

// 共享池：项目未配置跟进人员或待指派的服务单
export function isSharedPoolOrder(order: Order): boolean {
    return order.assignee === '待分配' || !!order.needAssign;
}

export function assignPoolOrders(): Order[] {
    return ORDERS.filter((o) => isSharedPoolOrder(o) && o.currentNode === 'assign' && isOrderActive(o));
}

// 后台数据口径：未开通业务管理员的账号仅可查看与本人相关的服务单
// 判定范围：当前处理人、项目专属团队、合同提交/接收、收款记录、会签参与、回退处置人
export function isOrderRelated(order: Order, userName: string, role?: ViewerRole): boolean {
    if (!userName) return false;
    if (order.assignee === userName) return true;
    if (role === 'pm' && isSharedPoolOrder(order)) return true;
    const project = PROJECTS.find((p) => p.name === order.project);
    if (project && Object.values(project.team).includes(userName)) return true;
    for (const c of order.contracts ?? []) {
        if (c.submitter === userName || c.receiverName === userName) return true;
        if ((c.collections ?? []).some((r) => r.by === userName)) return true;
    }
    const end = order.endRequest;
    if (end && (end.initiator === userName || end.pmName === userName || end.quoterName === userName)) return true;
    const rollback = order.rollback;
    if (rollback && (rollback.returnAssignee === userName || rollback.handlerAssignee === userName)) return true;
    return false;
}

export function relatedOrdersFor(userName: string, role?: ViewerRole): Order[] {
    return ORDERS.filter((o) => isOrderRelated(o, userName, role));
}

// 结束服务待确认（会签）列表
export function pendingConfirmOrders(role: RoleId): Order[] {
    if (role !== 'pm' && role !== 'quoter') return [];
    return ORDERS.filter((o) => {
        if (!o.endRequest) return false;
        return role === 'pm' ? !o.endRequest.pmConfirmed : !o.endRequest.quoterConfirmed;
    });
}

// 服务单是否在途：创建即服务中，直至完成 / 结束 / 终止
export function isOrderActive(order: Order): boolean {
    return order.status === '服务中';
}

// 是否为当前节点处理人（仅该用户可见节点处置态「待处理」）
export function isPendingFor(order: Order, role: ViewerRole): boolean {
    if (role === 'admin' || role === 'finance') return false;
    return isOrderActive(order) && order.assigneeRole === role;
}

// 查看者看到的状态：「待处理」为派生口径，不改变服务单持久状态
export function displayStatus(order: Order, role?: ViewerRole): DisplayStatus {
    if (role && isPendingFor(order, role)) return '待处理';
    return order.status;
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

export function visibleNodes(order: Order): Node[] {
    return NODES.filter((n) => nodeVisible(order, n));
}

export function nodeLabel(nodeId: NodeId): string {
    return NODES.find((n) => n.id === nodeId)?.label ?? nodeId;
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
    if (order.rollback?.returnNode === nodeId && nodeId !== 'collection' && isOrderActive(order)) return 'returning';
    if (order.status === '已完成') return 'done';
    if (order.status === '已终止' || order.status === '已结束' || order.status === '待确认') return idx < cur ? 'done' : 'todo';
    if (idx < cur) return 'done';
    if (idx === cur) return 'current';
    return 'todo';
}

// 节点 -> 处理角色（用于权限门控、撤回与会签判定）
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
    return workUsersForRole(role)[0]?.name ?? ROLES.find((r) => r.id === role)?.name ?? role;
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

// 是否可撤回：本人为上一节点处理者，且服务单已提交到下一节点、尚未推进到下下节点
export function canWithdraw(role: RoleId, order: Order): boolean {
    if (role === 'customer') return false;
    if (!isOrderActive(order)) return false;
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

// 是否可发起「结束服务」：员工处于当前处置节点、服务单仍在流转且未发起过
export function canEndService(role: RoleId, order: Order): boolean {
    if (role === 'customer') return false;
    if (order.endRequest) return false;
    if (!isOrderActive(order)) return false;
    return role === nodeHandlerRole(order.currentNode);
}

// 结束服务会签是否由当前角色完成
export function endConfirmDone(role: RoleId, order: Order): boolean {
    if (!order.endRequest) return false;
    if (role === 'pm') return order.endRequest.pmConfirmed;
    if (role === 'quoter') return order.endRequest.quoterConfirmed;
    return false;
}

// 列表标签：会签、待指派、待确认合同、待收款、已收讫、可撤回
export interface OrderTag {
    label: string;
    tone: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

export function orderTags(role: ViewerRole, order: Order): OrderTag[] {
    const tags: OrderTag[] = [];
    if (order.endRequest) {
        const needMe = (role === 'pm' && !order.endRequest.pmConfirmed) || (role === 'quoter' && !order.endRequest.quoterConfirmed);
        if (needMe) tags.push({ label: '待我会签', tone: 'red' });
        if (order.status === '待确认') tags.push({ label: '结束服务会签中', tone: 'orange' });
        if (order.status === '已结束') tags.push({ label: '已结束服务', tone: 'gray' });
    }
    if (order.currentNode === 'assign' && isOrderActive(order)) {
        tags.push({ label: isSharedPoolOrder(order) ? '待指派' : '待评估指派', tone: 'orange' });
    }
    // 财务视图统一按「待收款 / 已收讫」口径展示，不再叠加「待我处理」
    if (role !== 'admin' && role !== 'finance' && order.assigneeRole === role && isOrderActive(order)) {
        tags.push({ label: '待我处理', tone: 'blue' });
    }
    if (role === 'quoter' && needsMoreContracts(order)) {
        tags.push({ label: '待补签合同', tone: 'orange' });
    }
    if (role === 'finance' && orderNeedsCollection(order)) tags.push({ label: '待收款', tone: 'orange' });
    if (role === 'finance' && orderCollectionDone(order) && isOrderActive(order)) tags.push({ label: '已收讫', tone: 'green' });
    if (role !== 'admin' && canWithdraw(role, order)) tags.push({ label: '可撤回', tone: 'gray' });
    return tags;
}

// 服务范围文案
export function serviceScope(order: Order): string {
    const agency = [order.hasInspect ? '审图代办' : '', order.hasDeclare ? '申报代办' : ''].filter(Boolean);
    return ['施工', ...agency].join(' + ');
}

// 节点提交记录（详情页节点文件区）
export interface NodeSubmission {
    submitter: string;
    time: string;
    version: string;
    formRecords: { label: string; value: string }[];
    attachments: string[];
}

export function nodeSubmission(order: Order, nodeId: NodeId, viewerRole: RoleId | ViewerRole = 'admin'): NodeSubmission {
    const agency = [order.hasInspect ? '代办审图' : '', order.hasDeclare ? '代办申报' : ''].filter(Boolean).join('、') || '无';
    switch (nodeId) {
        case 'create':
            return {
                submitter: order.customer, time: order.createTime, version: 'V1',
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
                submitter: order.assignee === '待分配' ? PM_NAME : order.assignee, time: order.updateTime, version: 'V1',
                formRecords: [
                    { label: '现场勘验结论', value: '现场尺寸与图纸一致，具备施工条件' },
                    { label: '指派绘图员', value: '王强 · 设计部' },
                    { label: '指派说明', value: '已完成现场勘验，转绘图深化' },
                ],
                attachments: ['现场勘验记录.pdf'],
            };
        case 'deepen': {
            const reconfirmed = orderContracts(order).some((c) => c.workloadMode === '上传最终确认版');
            return {
                submitter: DRAFTER_NAME, time: order.updateTime, version: reconfirmed ? 'V2' : 'V1',
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
                submitter: PM_NAME, time: order.updateTime, version: 'V1',
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
                        { label: `合同 ${i + 1} · 合同总价`, value: c.totalPrice ? (showAmount ? formatMoney(c.totalPrice) : '金额已脱敏') : '未填写' },
                        { label: `合同 ${i + 1} · 收款进度`, value: `${contractRatio(c)}%` },
                        { label: `合同 ${i + 1} · 工作量确认`, value: c.workloadMode },
                        { label: `合同 ${i + 1} · 下一节点`, value: `${roleLabel(c.receiverRole)} · ${c.receiverName}` },
                    ]),
                    {
                        label: '合同总价合计',
                        value: totalPrice ? (showAmount ? `${formatMoney(totalPrice)} · ${amountToChinese(totalPrice)}` : '金额已脱敏') : '未填写',
                    },
                ],
                attachments: contracts.flatMap((c) => [...c.attachments, ...c.quoteAttachments]),
            };
        }
        case 'inspect':
            return {
                submitter: AGENT_NAME, time: order.updateTime, version: 'V1',
                formRecords: [{ label: '审图结果', value: '审图通过' }],
                attachments: ['审图意见书.pdf'],
            };
        case 'construction': {
            const progress = constructionProgress(order);
            return {
                submitter: PM_NAME, time: order.updateTime, version: 'V1',
                formRecords: [
                    { label: '施工工作量进度', value: `${progress.percent}%（已完成 ${progress.done} / 合同确认 ${progress.planned} 点位）` },
                    { label: '扣减依据', value: '按合同最终确认的工作量清单逐行扣减' },
                ],
                attachments: ['施工进度照片.jpg', '施工记录.pdf'],
            };
        }
        case 'declare':
            return {
                submitter: AGENT_NAME, time: order.updateTime, version: 'V1',
                formRecords: [{ label: '申报状态', value: '申报通过' }],
                attachments: ['申报回执.pdf'],
            };
        case 'acceptance':
            return {
                submitter: PM_NAME, time: order.updateTime, version: 'V1',
                formRecords: [{ label: '验收结果', value: '验收通过' }],
                attachments: ['验收报告.pdf', '竣工验收单.pdf'],
            };
        case 'collection': {
            const contracts = orderContracts(order);
            const received = contracts.reduce((sum, c) => sum + c.collections.reduce((s, r) => s + r.amount, 0), 0);
            const showAmount = canViewContractAmount(viewerRole);
            return {
                submitter: FINANCE_NAME, time: order.updateTime, version: 'V1',
                formRecords: [
                    ...contracts.map((c, i) => ({
                        label: `合同 ${i + 1} · ${c.type}收款`,
                        value: `${contractRatio(c)}%（已填写 ${c.collections.length} 次）`,
                    })),
                    { label: '累计已收款', value: showAmount ? formatMoney(received) : '金额已脱敏' },
                    { label: '收款支线状态', value: orderCollectionDone(order) ? '已完结（100%）' : '进行中' },
                ],
                attachments: ['收款凭证.pdf', '发票.pdf'],
            };
        }
        default:
            return { submitter: order.assignee, time: order.updateTime, version: 'V1', formRecords: [], attachments: [] };
    }
}

// 人民币金额转大写
const CN_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CN_INT_UNITS = ['', '拾', '佰', '仟'];
const CN_GROUP_UNITS = ['', '万', '亿', '万亿'];

function groupToChinese(g: string): string {
    let res = '';
    let zero = false;
    for (let i = 0; i < g.length; i++) {
        const d = Number(g[i]);
        const pos = g.length - 1 - i;
        if (d === 0) { zero = true; }
        else {
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

// ===== 概览 / 报表 / 配置 =====

const ACTIVE_STATUS: OrderStatus[] = ['服务中', '待确认'];

export const OVERVIEW_METRICS = {
    total: ORDERS.length,
    active: ORDERS.filter((o) => ACTIVE_STATUS.includes(o.status)).length,
    done: ORDERS.filter((o) => o.status === '已完成' || o.status === '已结束').length,
    pendingConfirm: ORDERS.filter((o) => o.status === '待确认').length,
    sharedPool: assignPoolOrders().length,
    overdue: 4,
};

// 概览指标：业务管理员取全局，其他账号按本人相关服务单重算
export function overviewMetricsFor(orders: Order[]) {
    return {
        total: orders.length,
        active: orders.filter((o) => ACTIVE_STATUS.includes(o.status)).length,
        done: orders.filter((o) => o.status === '已完成' || o.status === '已结束').length,
        pendingConfirm: orders.filter((o) => o.status === '待确认').length,
        sharedPool: orders.filter((o) => isSharedPoolOrder(o) && o.currentNode === 'assign' && isOrderActive(o)).length,
    };
}

export const WEEKLY_TREND = [
    { day: '09-19', count: 1 },
    { day: '09-20', count: 3 },
    { day: '09-21', count: 3 },
    { day: '09-22', count: 5 },
    { day: '09-23', count: 1 },
    { day: '09-24', count: 3 },
    { day: '09-25', count: 1 },
];

// 近 7 日趋势：按服务单创建时间统计指定范围数据
export function weeklyTrendFor(orders: Order[]) {
    return WEEKLY_TREND.map((d) => ({
        day: d.day,
        count: orders.filter((o) => o.createTime.startsWith(`2026-${d.day}`)).length,
    }));
}

// 服务类型占比：按服务项与合同内容统计
export function serviceTypeOf(order: Order): string {
    if (orderContracts(order).length > 0 && !hasConstructionContract(order)) return '纯代办';
    if (order.hasInspect && order.hasDeclare) return '组合（施工+审图+申报）';
    if (order.hasInspect) return '施工+审图';
    if (order.hasDeclare) return '施工+申报';
    return '纯施工';
}

const SERVICE_COLORS: Record<string, string> = {
    纯施工: '#1677ff',
    '施工+审图': '#52c41a',
    '施工+申报': '#faad14',
    '组合（施工+审图+申报）': '#722ed1',
    纯代办: '#f5222d',
};

export function serviceDistributionFor(orders: Order[]) {
    return Object.entries(
        orders.reduce<Record<string, number>>((acc, o) => {
            const t = serviceTypeOf(o);
            acc[t] = (acc[t] ?? 0) + 1;
            return acc;
        }, {}),
    ).map(([name, value]) => ({ name, value, color: SERVICE_COLORS[name] ?? '#1677ff' }));
}

export const SERVICE_DISTRIBUTION = serviceDistributionFor(ORDERS);

export const OVERDUE_ITEMS = [
    { id: 'FW20260920006', node: '审图', time: '超时 2 小时', assignee: '孙磊' },
    { id: 'FW20260924020', node: '评估指派', time: '超时 5 小时', assignee: '张伟' },
    { id: 'FW20260921007', node: '审图', time: '预警 3 小时', assignee: '孙磊' },
    { id: 'FW20260924023', node: '合同收款', time: '预警 4 小时', assignee: '赵敏' },
];

export const MONTHLY_TREND = [
    { month: '4月', count: 8 },
    { month: '5月', count: 12 },
    { month: '6月', count: 10 },
    { month: '7月', count: 15 },
    { month: '8月', count: 18 },
    { month: '9月', count: 23 },
];

export const PROJECT_ORDER_STATS = PROJECTS.map((p) => ({ name: p.name, count: p.orderCount }));

// 流程编排 · 服务类型分支（合同收款为并行支线，不计入主链路）
export const FLOW_BRANCHES: { id: string; label: string; nodes: NodeId[] }[] = [
    {
        id: 'construction',
        label: '纯施工',
        nodes: ['create', 'assign', 'deepen', 'review', 'contract', 'construction', 'acceptance'],
    },
    {
        id: 'agency',
        label: '纯代办',
        nodes: ['create', 'assign', 'contract', 'inspect', 'declare'],
    },
    {
        id: 'combo',
        label: '组合服务',
        nodes: ['create', 'assign', 'deepen', 'review', 'contract', 'inspect', 'construction', 'declare', 'acceptance'],
    },
];

// 并行支线：合同收款与主链路并行，全部合同 100% 且服务支线完结才办结
export const FLOW_PARALLEL: NodeId[] = ['collection'];

// ===== 通知与超时配置 =====
// 职责边界：流程编排维护「节点三级超时阈值」（什么时候算超时）；
// 通知与超时维护「节点 × 事件」的渠道、收件人、模板与频次（发给谁、怎么发）。
// 两页通过 nodeId 单向引用，本页只读展示流程编排的阈值，不重复录入。

export type TimeoutUnit = 'hour' | 'workday';

export const TIMEOUT_UNIT_LABEL: Record<TimeoutUnit, string> = { hour: '小时', workday: '工作日' };

// 工作日按 8 小时/日折算为自然时长；节假日顺延与工作日历为后续规划
export const WORKDAY_HOURS = 8;

export function timeoutToHours(value: number, unit: TimeoutUnit): number {
    return unit === 'workday' ? value * WORKDAY_HOURS : value;
}

export function formatTimeout(value: number | null, unit: TimeoutUnit): string {
    if (value === null) return '不适用';
    return `${value} ${TIMEOUT_UNIT_LABEL[unit]}`;
}

// 流程编排节点盒的紧凑写法（24 h / 2 天）
export function formatTimeoutShort(value: number, unit: TimeoutUnit): string {
    return unit === 'workday' ? `${value} 天` : `${value} h`;
}

export interface NodeTimeoutRule {
    nodeId: NodeId;
    receiveValue: number | null; // 接收时限；创建节点不适用
    warningValue: number;
    alarmValue: number;
    unit: TimeoutUnit;
    enabled: boolean;
}

// 节点级超时阈值（流程编排 · 选中节点后编辑）；同一节点在不同服务分支共用一份
export const NODE_TIMEOUT_RULES: NodeTimeoutRule[] = [
    { nodeId: 'create', receiveValue: null, warningValue: 4, alarmValue: 8, unit: 'hour', enabled: false },
    { nodeId: 'assign', receiveValue: 2, warningValue: 12, alarmValue: 24, unit: 'hour', enabled: true },
    { nodeId: 'deepen', receiveValue: 4, warningValue: 48, alarmValue: 96, unit: 'hour', enabled: true },
    { nodeId: 'review', receiveValue: 4, warningValue: 24, alarmValue: 48, unit: 'hour', enabled: true },
    { nodeId: 'contract', receiveValue: 4, warningValue: 48, alarmValue: 72, unit: 'hour', enabled: true },
    { nodeId: 'inspect', receiveValue: 1, warningValue: 2, alarmValue: 3, unit: 'workday', enabled: true },
    { nodeId: 'construction', receiveValue: 4, warningValue: 48, alarmValue: 96, unit: 'hour', enabled: true },
    { nodeId: 'declare', receiveValue: 1, warningValue: 2, alarmValue: 3, unit: 'workday', enabled: true },
    { nodeId: 'acceptance', receiveValue: 4, warningValue: 24, alarmValue: 48, unit: 'hour', enabled: true },
    { nodeId: 'collection', receiveValue: 4, warningValue: 72, alarmValue: 120, unit: 'hour', enabled: true },
];

export type RecipientId =
    | 'handler' | 'prevHandler' | 'projectPm' | 'drafter' | 'quoter'
    | 'finance' | 'creator' | 'staff' | 'customer' | 'ops';

export const RECIPIENTS: { id: RecipientId; label: string; note: string }[] = [
    { id: 'handler', label: '节点处理人', note: '待处理取当前处理人，已提交取下一节点处理人' },
    { id: 'prevHandler', label: '前置节点处理人', note: '告警升级用，按服务单自动去重' },
    { id: 'projectPm', label: '项目经理', note: '取项目专属团队' },
    { id: 'drafter', label: '绘图员', note: '取项目专属团队' },
    { id: 'quoter', label: '报价员', note: '取项目专属团队' },
    { id: 'finance', label: '财务', note: '合同收款相关' },
    { id: 'creator', label: '创建人', note: '员工代建时含经办员工' },
    { id: 'staff', label: '相关员工', note: '参与过该服务单节点的员工' },
    { id: 'customer', label: '客户', note: '仅进度类事件可发，超时告警强制排除' },
    { id: 'ops', label: '运营（抄送）', note: '仅邮件抄送' },
];

export type NotifyEventId =
    | 'nodePending' | 'nodeSubmitted' | 'nodeRejected' | 'paymentRemind'
    | 'timeoutWarning' | 'timeoutAlarm' | 'signoff' | 'signoffDone';

export interface NotifyEventDef {
    id: NotifyEventId;
    name: string;
    desc: string;
    kind: 'node' | 'common';
    onlyNode?: NodeId; // 仅该节点触发
    timeout?: 'warning' | 'alarm';
    channels: { app: boolean; mini: boolean; email: boolean };
    recipients: RecipientId[];
    frequency?: 'once' | 'every24h3';
}

// 事件口径对齐 PRD 附录 D.1：按节点生效的事件 + 整单级通用事件
export const NOTIFY_EVENTS: NotifyEventDef[] = [
    { id: 'nodePending', name: '节点待处理', desc: '服务单进入新的节点，提醒处理人接收', kind: 'node', channels: { app: true, mini: true, email: true }, recipients: ['handler'] },
    { id: 'nodeSubmitted', name: '节点已提交', desc: '当前处理人提交节点，通知下一处理人与创建人', kind: 'node', channels: { app: true, mini: false, email: false }, recipients: ['handler', 'creator'] },
    { id: 'nodeRejected', name: '审核驳回', desc: '项目经理驳回深化图纸，退回绘图员', kind: 'node', onlyNode: 'review', channels: { app: true, mini: false, email: true }, recipients: ['drafter'] },
    { id: 'paymentRemind', name: '收款提醒', desc: '合同生成或未收齐，提醒财务跟进', kind: 'node', onlyNode: 'collection', channels: { app: true, mini: false, email: false }, recipients: ['finance'] },
    { id: 'timeoutWarning', name: '超时预警', desc: '到达节点预警时限，提醒当前处理人', kind: 'node', timeout: 'warning', channels: { app: true, mini: false, email: true }, recipients: ['handler'], frequency: 'once' },
    { id: 'timeoutAlarm', name: '超时告警', desc: '到达节点告警时限，升级至前置节点处理人', kind: 'node', timeout: 'alarm', channels: { app: true, mini: true, email: true }, recipients: ['handler', 'prevHandler'], frequency: 'every24h3' },
    { id: 'signoff', name: '结束服务会签', desc: '发起结束服务，提醒项目经理与报价员会签', kind: 'common', channels: { app: true, mini: true, email: false }, recipients: ['projectPm', 'quoter'] },
    { id: 'signoffDone', name: '结束服务完成', desc: '双方会签完成，通知相关员工与客户', kind: 'common', channels: { app: true, mini: false, email: false }, recipients: ['creator', 'staff', 'customer'] },
];

export interface MailTemplate {
    id: string;
    name: string;
    eventId: NotifyEventId;
    body: string;
}

// 模板变量：{编号} {节点} {处理人} {时限} {超时时长} {剩余时限} {驳回意见}
// {合同类型} {未收比例} {发起人} {原因} {会签进度} {结束时间}
export const MAIL_TEMPLATES: MailTemplate[] = [
    { id: 'tpl-pending', name: '节点待处理模板', eventId: 'nodePending', body: '服务单 {编号} 已进入「{节点}」，请在 {时限} 内处理。' },
    { id: 'tpl-submitted', name: '节点已提交模板', eventId: 'nodeSubmitted', body: '服务单 {编号} 的「{节点}」已由 {处理人} 提交，请关注后续进度。' },
    { id: 'tpl-rejected', name: '审核驳回模板', eventId: 'nodeRejected', body: '服务单 {编号} 的图纸深化被驳回，驳回意见：{驳回意见}，请修改后重新提交。' },
    { id: 'tpl-payment', name: '收款提醒模板', eventId: 'paymentRemind', body: '服务单 {编号} 合同「{合同类型}」尚未收齐，未收比例 {未收比例}，请跟进收款。' },
    { id: 'tpl-warning', name: '超时预警模板', eventId: 'timeoutWarning', body: '服务单 {编号} 在节点「{节点}」已超时 {超时时长}，剩余时限 {剩余时限}，请尽快处理。' },
    { id: 'tpl-alarm', name: '超时告警模板', eventId: 'timeoutAlarm', body: '服务单 {编号} 在节点「{节点}」已超过告警时限 {超时时长}，请立即处理。' },
    { id: 'tpl-signoff', name: '结束服务会签模板', eventId: 'signoff', body: '服务单 {编号} 由 {发起人} 发起结束服务，原因：{原因}，会签进度 {会签进度}，请确认。' },
    { id: 'tpl-signoff-done', name: '结束服务完成模板', eventId: 'signoffDone', body: '服务单 {编号} 已于 {结束时间} 结束服务，服务单转为只读。' },
];

export type NotifyScope = NodeId | 'common';

export interface NotificationRule {
    scope: NotifyScope; // 节点或通用事件
    eventId: NotifyEventId;
    channels: { app: boolean; mini: boolean; email: boolean };
    recipients: RecipientId[];
    templateId?: string;
    frequency?: 'once' | 'every24h3';
    enabled: boolean;
}

// 业务节点（创建节点无处理环节，不产生节点通知）
export const NOTIFY_NODE_SCOPES: NodeId[] = NODES.filter((n) => n.id !== 'create').map((n) => n.id);

const defaultTemplateFor = (eventId: NotifyEventId) => MAIL_TEMPLATES.find((t) => t.eventId === eventId)?.id;

// 首批规则：默认继承事件口径，可在页面按节点逐条调整
export const NOTIFICATION_RULES: NotificationRule[] = (() => {
    const rows: NotificationRule[] = [];
    NOTIFY_NODE_SCOPES.forEach((nodeId) => {
        NOTIFY_EVENTS.filter((e) => e.kind === 'node' && (!e.onlyNode || e.onlyNode === nodeId)).forEach((e) => {
            rows.push({
                scope: nodeId,
                eventId: e.id,
                channels: { ...e.channels },
                recipients: [...e.recipients],
                templateId: defaultTemplateFor(e.id),
                frequency: e.frequency,
                enabled: true,
            });
        });
    });
    NOTIFY_EVENTS.filter((e) => e.kind === 'common').forEach((e) => {
        rows.push({
            scope: 'common',
            eventId: e.id,
            channels: { ...e.channels },
            recipients: [...e.recipients],
            templateId: defaultTemplateFor(e.id),
            frequency: e.frequency,
            enabled: true,
        });
    });
    return rows;
})();

// 客户可见范围：仅进度类事件允许加入客户收件人
export const CUSTOMER_ALLOWED_EVENTS: NotifyEventId[] = ['nodeSubmitted', 'signoffDone'];
