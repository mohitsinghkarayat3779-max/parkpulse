import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRevenueModel, RevenueModelInputs } from './revenueCalculator';

test('Revenue model calculation with baseline metrics', () => {
  const inputs: RevenueModelInputs = {
    monthlyActiveUsers: 50000,
    proConversionRate: 0.04, // 2,000 subscribers
    proSubscriptionPrice: 4.99, // ~$9,980
    garageBookingsPerUserMonth: 0.2, // 10,000 bookings
    averageBookingValue: 12.0, // $120,000 GBV
    platformTakeRate: 0.18, // $21,600 take
    sponsoredPinsPerCityMonth: 50,
    sponsoredPinPrice: 100, // $5,000
    enterpriseDataDeals: 2,
    averageDataDealPriceMonth: 5000, // $10,000
  };

  const output = calculateRevenueModel(inputs);

  assert.equal(output.proSubscribers, 2000);
  assert.equal(output.proMonthlyRevenue, 9980);
  assert.equal(output.garageMonthlyRevenue, 21600);
  assert.equal(output.sponsoredPinsMonthlyRevenue, 5000);
  assert.equal(output.dataLicensingMonthlyRevenue, 10000);
  assert.equal(output.totalMonthlyRecurringRevenue, 46580);
  assert.equal(output.totalAnnualRecurringRevenue, 558960);
  assert.ok(output.averageRevenuePerUser > 0.9);
});
