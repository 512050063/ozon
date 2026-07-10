export interface PaymentRecordStats {
  totalCount: number;
  successCount: number;
  totalAmount: number;
  paidUserCount: number;
}

interface PaymentRecordDelegate {
  count(args: any): Promise<number>;
  aggregate(args: any): Promise<any>;
  findMany(args: any): Promise<Array<{ userId: number }>>;
}

export const getPaymentRecordStats = async (
  paymentRecord: PaymentRecordDelegate,
  where: any
): Promise<PaymentRecordStats> => {
  const successWhere = { ...where, status: 'success' };

  const [totalCount, successCount, amountStats, paidUsers] = await Promise.all([
    paymentRecord.count({ where }),
    paymentRecord.count({ where: successWhere }),
    paymentRecord.aggregate({
      where: successWhere,
      _sum: {
        amount: true,
      },
    }),
    paymentRecord.findMany({
      where: successWhere,
      distinct: ['userId'],
      select: {
        userId: true,
      },
    }),
  ]);

  return {
    totalCount,
    successCount,
    totalAmount: Number(amountStats._sum?.amount || 0),
    paidUserCount: paidUsers.length,
  };
};
