import fs from 'fs';

const rules = fs.readFileSync('firestore.rules', 'utf-8');

const cols = [
    'treasuries', 'treasury_transactions', 'customers', 'suppliers', 'partners', 
    'op_work_orders', 'op_manufacturing', 'acc_checks', 'hr_payroll', 'hr_requests', 
    'hr_personnel', 'hr_contracts', 'hr_performance', 'hr_commissions',
    'installments', 'financial_settlements', 'sales', 'acc_expenses',
    'products', 'purchases', 'sales_returns', 'purchase_returns', 'activity_logs',
    'stock_transfers', 'inventory_audits', 'customer_transactions', 'supplier_transactions',
    'employees', 'manufacturingOrders', 'licenses', 'affiliates', 'affiliate_referrals',
    'device_notifications', 'devices', 'global_notifications', 'system_updates', 'app_suggestions', 'app_support_tickets',
    'acc_chart', 'acc_cost_centers', 'acc_assets', 'op_time_tracking', 'op_rentals', 'op_reservations', 'op_workflow', 'op_lease_contracts'
];

for (const col of cols) {
    if (!rules.includes(`match /${col}/`)) {
        console.log(`Missing: ${col}`);
    }
}
