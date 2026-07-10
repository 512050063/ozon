import assert from 'assert';
import {
  applyCashFlowBalanceToTotals,
  applyOfficialOpeningDebtToTotals,
  buildFinanceExpenseRows,
  calculateDisplayedFinanceNetTotal,
  summarizeFinanceOperations,
} from '../src/services/ozonFinanceService';

const operations = [
  {
    operation_id: 1,
    operation_date: '2026-06-04 00:00:00',
    operation_type: 'OperationAgentDeliveredToCustomer',
    operation_type_name: 'Доставка покупателю',
    type: 'orders',
    accruals_for_sale: 276,
    amount: 226.95,
    sale_commission: -33.12,
    delivery_charge: 0,
    return_delivery_charge: 0,
    services: [
      { name: 'MarketplaceServiceItemRedistributionLastMilePVZ', price: -15.93 },
    ],
    items: [
      { sku: 4068839713, name: 'Полотенце для лица' },
    ],
    posting: {
      posting_number: '32562479-0772-1',
      delivery_schema: 'RFBS',
    },
  },
  {
    operation_id: 2,
    operation_date: '2026-06-04 00:00:00',
    operation_type: 'OperationMarketplaceAgencyFeeAggregator3PLGlobal',
    operation_type_name: 'Агентское вознаграждение за заключение и сопровождение договора транспортно-экспедиционных услуг по организации международной перевозки',
    type: 'services',
    accruals_for_sale: 0,
    amount: -15,
    sale_commission: 0,
    delivery_charge: 0,
    return_delivery_charge: 0,
    services: [],
    items: [],
    posting: {
      posting_number: '32562479-0772-1',
      delivery_schema: '',
    },
  },
  {
    operation_id: 3,
    operation_date: '2026-06-17 00:00:00',
    operation_type: 'OperationMarketplaceAcceleratedProductReviews',
    operation_type_name: 'Ускоренный сбор отзывов',
    type: 'services',
    accruals_for_sale: 0,
    amount: -420,
    sale_commission: 0,
    delivery_charge: 0,
    return_delivery_charge: 0,
    services: [],
    items: [],
    posting: {
      posting_number: '',
      delivery_schema: '',
    },
  },
  {
    operation_id: 4,
    operation_date: '2026-06-20 00:00:00',
    operation_type: 'MarketplaceRedistributionOfAcquiringOperation',
    operation_type_name: 'Оплата эквайринга',
    type: 'other',
    accruals_for_sale: 0,
    amount: -6.58,
    sale_commission: 0,
    delivery_charge: 0,
    return_delivery_charge: 0,
    services: [
      { name: 'MarketplaceRedistributionOfAcquiringOperation', price: -6.58 },
    ],
    items: [],
    posting: {
      posting_number: '47798085-0428',
      delivery_schema: '',
    },
  },
];

const summary = summarizeFinanceOperations(operations as any);

assert.equal(summary.accruals_for_sale, 276);
assert.equal(summary.sale_commission, -33.12);
assert.equal(summary.processing_and_delivery, -15);
assert.equal(summary.services_amount, -420);
assert.equal(summary.partner_services, -22.51);
assert.equal(summary.others_amount, 0);
assert.equal(summary.sales_income, 226.95);
assert.equal(summary.discount_points, 49.05);
assert.equal(summary.partner_program, 0);
assert.equal(summary.opening_debt, 0);

const rows = buildFinanceExpenseRows(summary);
const byKey = Object.fromEntries(rows.map(row => [row.key, row]));

assert.equal(byKey.advertising.value, -420);
assert.equal(byKey.ozon_commission.value, -33.12);
assert.equal(byKey.delivery.value, -15);
assert.equal(byKey.partner_services.value, -22.51);
assert.equal(byKey.other_services.value, 0);

const totalExpense = rows.reduce((sum: number, row: { value: number }) => sum + row.value, 0);
assert.equal(Number(totalExpense.toFixed(2)), -490.63);

const targetBalance = applyCashFlowBalanceToTotals(summary, -470.63);
assert.equal(targetBalance.opening_debt, -256);

assert.equal(calculateDisplayedFinanceNetTotal({
  ...summary,
  accruals_for_sale: 0,
  refunds_and_cancellations: 0,
  sale_commission: 0,
  processing_and_delivery: 0,
  services_amount: 0,
  partner_services: -13,
  opening_debt: 0,
}), -13);
assert.equal(calculateDisplayedFinanceNetTotal({
  ...summary,
  accruals_for_sale: 4206,
  refunds_and_cancellations: 0,
  sale_commission: -504,
  processing_and_delivery: -240,
  services_amount: -3420,
  partner_services: -285,
  opening_debt: -13,
}), -256);
assert.equal(calculateDisplayedFinanceNetTotal({
  ...summary,
  accruals_for_sale: 970,
  refunds_and_cancellations: 0,
  sale_commission: -116,
  processing_and_delivery: -60,
  services_amount: -3720,
  partner_services: -125,
  opening_debt: -256,
}), -3307);
assert.equal(calculateDisplayedFinanceNetTotal({
  ...summary,
  accruals_for_sale: 0,
  refunds_and_cancellations: 0,
  sale_commission: 0,
  processing_and_delivery: 0,
  services_amount: 0,
  partner_services: -1,
  opening_debt: -3307,
}), -3308);

const staleLocalOpeningDebt = {
  ...summary,
  accruals_for_sale: 0,
  refunds_and_cancellations: 0,
  sale_commission: 0,
  processing_and_delivery: 0,
  services_amount: 0,
  partner_services: -1,
  opening_debt: -3594,
};
assert.equal(
  applyOfficialOpeningDebtToTotals(staleLocalOpeningDebt, { opening_debt: -3307 }).opening_debt,
  -3307,
);
assert.equal(
  calculateDisplayedFinanceNetTotal(applyOfficialOpeningDebtToTotals(staleLocalOpeningDebt, { opening_debt: -3307 })),
  -3308,
);
assert.equal(
  applyOfficialOpeningDebtToTotals(staleLocalOpeningDebt, { opening_debt: null }).opening_debt,
  -3594,
);

console.log('financeReportService.test passed');
