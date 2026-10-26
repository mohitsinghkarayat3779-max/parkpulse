export interface RevenueModelInputs {
  monthlyActiveUsers: number; // e.g. 50,000 MAU
  proConversionRate: number; // e.g. 0.04 (4%)
  proSubscriptionPrice: number; // e.g. $4.99/mo
  garageBookingsPerUserMonth: number; // e.g. 0.8
  averageBookingValue: number; // e.g. $12.00
  platformTakeRate: number; // e.g. 0.18 (18%)
  sponsoredPinsPerCityMonth: number; // e.g. 120
  sponsoredPinPrice: number; // e.g. $75/mo
  enterpriseDataDeals: number; // e.g. 2
  averageDataDealPriceMonth: number; // e.g. $5,000/mo
}

export interface RevenueModelOutputs {
  proSubscribers: number;
  proMonthlyRevenue: number;
  garageMonthlyRevenue: number;
  sponsoredPinsMonthlyRevenue: number;
  dataLicensingMonthlyRevenue: number;
  totalMonthlyRecurringRevenue: number;
  totalAnnualRecurringRevenue: number;
  averageRevenuePerUser: number;
}

export function calculateRevenueModel(inputs: RevenueModelInputs): RevenueModelOutputs {
  const proSubscribers = Math.round(inputs.monthlyActiveUsers * inputs.proConversionRate);
  const proMonthlyRevenue = proSubscribers * inputs.proSubscriptionPrice;

  const totalMonthlyBookings = inputs.monthlyActiveUsers * inputs.garageBookingsPerUserMonth;
  const grossBookingVolume = totalMonthlyBookings * inputs.averageBookingValue;
  const garageMonthlyRevenue = grossBookingVolume * inputs.platformTakeRate;

  const sponsoredPinsMonthlyRevenue =
    inputs.sponsoredPinsPerCityMonth * inputs.sponsoredPinPrice;

  const dataLicensingMonthlyRevenue =
    inputs.enterpriseDataDeals * inputs.averageDataDealPriceMonth;

  const totalMRR =
    proMonthlyRevenue +
    garageMonthlyRevenue +
    sponsoredPinsMonthlyRevenue +
    dataLicensingMonthlyRevenue;

  const totalARR = totalMRR * 12;
  const arpu = inputs.monthlyActiveUsers > 0 ? totalMRR / inputs.monthlyActiveUsers : 0;

  return {
    proSubscribers,
    proMonthlyRevenue: Math.round(proMonthlyRevenue),
    garageMonthlyRevenue: Math.round(garageMonthlyRevenue),
    sponsoredPinsMonthlyRevenue: Math.round(sponsoredPinsMonthlyRevenue),
    dataLicensingMonthlyRevenue: Math.round(dataLicensingMonthlyRevenue),
    totalMonthlyRecurringRevenue: Math.round(totalMRR),
    totalAnnualRecurringRevenue: Math.round(totalARR),
    averageRevenuePerUser: parseFloat(arpu.toFixed(2)),
  };
}
