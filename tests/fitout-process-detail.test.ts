import { describe, expect, it } from 'vitest';
import { canWithdraw, canCancelService } from '../src/prototypes/fitout-process/data';
import type { Order } from '../src/prototypes/fitout-process/data';

// 最小可用 Order 工厂，按场景覆盖 currentNode / status / 可选节点
function makeOrder(overrides: Partial<Order> = {}): Order {
    return {
        id: 'TEST-0001',
        project: '测试项目',
        projectType: '商业广场',
        location: '测试位置',
        area: 320,
        customer: '林女士',
        currentNode: 'deepen',
        status: '待处理',
        hasInspect: false,
        hasDeclare: false,
        stagedPayment: false,
        assignee: '王强',
        assigneeRole: 'drafter',
        createTime: '2026-09-22 10:00',
        updateTime: '2026-09-22 10:00',
        ...overrides,
    };
}

describe('撤回按钮（canWithdraw）', () => {
    it('绘图员在「图纸深化」尚未提交时不可撤回', () => {
        const order = makeOrder({ currentNode: 'deepen', status: '待处理' });
        expect(canWithdraw('drafter', order)).toBe(false);
    });

    it('绘图员提交后（服务单进入「审核」、尚未推进）可撤回', () => {
        const order = makeOrder({ currentNode: 'review', status: '待处理' });
        expect(canWithdraw('drafter', order)).toBe(true);
    });

    it('客户无撤回操作，创建后（服务单进入「图纸深化」）也不可撤回', () => {
        const order = makeOrder({ currentNode: 'deepen', status: '待处理' });
        expect(canWithdraw('customer', order)).toBe(false);
    });

    it('项目经理在「审核」节点不可撤回他人的图纸提交', () => {
        const order = makeOrder({ currentNode: 'review', status: '待处理' });
        expect(canWithdraw('pm', order)).toBe(false);
    });

    it('项目经理提交审核通过后（服务单进入「报价合同」）可撤回', () => {
        const order = makeOrder({ currentNode: 'quote', status: '待处理' });
        expect(canWithdraw('pm', order)).toBe(true);
    });

    it('报价员在「报价合同」节点不可撤回（上一节点为项目经理）', () => {
        const order = makeOrder({ currentNode: 'quote', status: '待处理' });
        expect(canWithdraw('quoter', order)).toBe(false);
    });

    it('财务确认收款后进入「代办审图」可撤回', () => {
        const order = makeOrder({ currentNode: 'inspect', status: '待处理', hasInspect: true });
        expect(canWithdraw('finance', order)).toBe(true);
    });

    it('财务确认收款后无代办审图、直接进入「施工」可撤回', () => {
        const order = makeOrder({ currentNode: 'construction', status: '待处理', hasInspect: false });
        expect(canWithdraw('finance', order)).toBe(true);
    });

    it('首个节点「创建」无上一节点，不可撤回', () => {
        const order = makeOrder({ currentNode: 'create', status: '待处理' });
        expect(canWithdraw('customer', order)).toBe(false);
    });

    it('服务单已完成后不可撤回', () => {
        const order = makeOrder({ currentNode: 'acceptance', status: '已完成' });
        expect(canWithdraw('pm', order)).toBe(false);
    });

    it('服务单已终止后不可撤回', () => {
        const order = makeOrder({ currentNode: 'quote', status: '已终止' });
        expect(canWithdraw('quoter', order)).toBe(false);
    });
});

describe('取消服务单按钮（canCancelService）', () => {
    it('客户在「图纸深化」且「待处理」（绘图员未开始）可取消', () => {
        const order = makeOrder({ currentNode: 'deepen', status: '待处理' });
        expect(canCancelService('customer', order)).toBe(true);
    });

    it('客户在「图纸深化」但「服务中」（绘图员已开始）不可取消', () => {
        const order = makeOrder({ currentNode: 'deepen', status: '服务中' });
        expect(canCancelService('customer', order)).toBe(false);
    });

    it('非客户角色不可取消服务单', () => {
        const order = makeOrder({ currentNode: 'deepen', status: '待处理' });
        expect(canCancelService('drafter', order)).toBe(false);
        expect(canCancelService('pm', order)).toBe(false);
    });

    it('客户在其他节点不可取消服务单', () => {
        const order = makeOrder({ currentNode: 'review', status: '待处理' });
        expect(canCancelService('customer', order)).toBe(false);
    });
});
