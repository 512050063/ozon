import assert from 'assert';
import { getPaymentRecordStats } from '../src/services/paymentRecordStatsService';

const calls: Array<{ method: string; args: any }> = [];

const paymentRecord = {
  async count(args: any) {
    calls.push({ method: 'count', args });
    return args.where.status === 'success' ? 3 : 5;
  },
  async aggregate(args: any) {
    calls.push({ method: 'aggregate', args });
    return { _sum: { amount: 697 } };
  },
  async findMany(args: any) {
    calls.push({ method: 'findMany', args });
    return [{ userId: 1 }, { userId: 2 }];
  },
};

async function main() {
  const where = {
    user: {
      OR: [
        { username: { contains: 'admin' } },
        { nickname: { contains: 'admin' } },
      ],
    },
  };

  const stats = await getPaymentRecordStats(paymentRecord, where);

  assert.deepStrictEqual(stats, {
    totalCount: 5,
    successCount: 3,
    totalAmount: 697,
    paidUserCount: 2,
  });
  assert.deepStrictEqual(calls.map(call => call.method), ['count', 'count', 'aggregate', 'findMany']);
  assert.strictEqual(calls[1].args.where.status, 'success');
  assert.strictEqual(calls[2].args.where.status, 'success');
  assert.strictEqual(calls[3].args.where.status, 'success');
  assert.deepStrictEqual(calls[3].args.distinct, ['userId']);
  assert.deepStrictEqual(calls[3].args.select, { userId: true });

  console.log('paymentRecordStats.test passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
