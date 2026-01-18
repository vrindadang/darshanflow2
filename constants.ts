import { RequestStatus, ExpenseRequest, School, BudgetMap } from './types.ts';

const LOCATIONS = [
  '5th Mile', 'Ambala', 'Amritsar', 'Bigas', 'Bhubaneswar', 'Dasuya', 'Delhi', 'Devlali', 
  'Ferozepur', 'Gularia Bhat', 'Hisar', 'Jalandhar', 'Jansath', 'Kaithal', 'Kalka', 
  'Lucknow', 'Ludhiana', 'Meerut', 'Modasa', 'Pune', 'Rathonda', 'Sundargarh'
];

export const SCHOOLS: School[] = LOCATIONS.map((location, i) => {
  const codeStr = location.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const shortCode = `DA${codeStr}`;
  return {
    id: `school-${i + 1}`,
    name: `Darshan Academy, ${location}`,
    shortCode: shortCode
  };
});

// Precise hierarchy based on the provided PDF document
export const BUDGET_GROUPS = [
  {
    name: 'A. ESTABLISHMENT EXPENSES',
    items: [
      'Audit Fee', 'ESI', 'Teacher Charges', 'Coaches Charges', 'Legal & Professional - Others',
      'Provident Fund', 'Diesal Cost (Generator)', 'Maintenance Charges (Generator)', 
      'Interest on Car Loan', 'Salary & Wages', 'EL-encashment', 'Gratuity', 
      'Medical Expenses', 'House Keeping Material', 'AMC - Equipments', 
      'Supporting Staff Salary', 'Security Service', 'Smart Class Expenses'
    ]
  },
  {
    name: 'B. ACTIVITY EXPENSES',
    items: [
      'Educational Workshops & Seminars', 'Garden & Ground', 'Misc. Expenses (Activity)', 
      'Newspapers, Books & Periodicals', 'Scholarship', 'School Activity', 
      'Annual Day', 'Sports Day', 'All lab Consumables', 
      'Music Material purchase / repair', 'Sports Material/Repair', 'Activity Material', 
      'Math Lab Material', 'Science Lab Material', 'Student Trip for Sports', 
      'Staff Walfare-DA', 'DEF/ Other DA Staff'
    ]
  },
  {
    name: 'C. CONTINGENCY EXPENSES',
    items: [
      'Advertisement & Publicity Expenses- Others', 'Recruitment and Hiring Expenses', 
      'Admission Drive Expenses', 'Affiliation Fee', 'Bank Charges', 'Electricity Charges', 
      'Visitor Refreshment', 'Hire Charges of Vehicles', 'Insurance', 
      'Insurance Vehicles', 'Postage & Courier Expenses', 'Photostate Expenses- Outsource', 
      'Office Stationery', 'Library Stationery', 'Art & Craft Material', 'Printer Rent', 
      'Examination Stationery', 'Student Id Card / Staff ID', 'Rates & Taxes', 
      'Other Subscription Membership Fees', 'Practical Fees', 'CBSE Reg. Fees', 
      'Picnic Expenses/ Educational trip', 'C/o Diesel/ Petrol/CNG (Vehicle)', 
      'Maintenance Charges (Vehicle)', 'Telephone & Internet Charges', 
      'Travelling & Conveyance Expenses', 'Water Charges', 'R.O. Rent Charges'
    ]
  },
  {
    name: 'D. REPAIRS & RENEWALS',
    items: [
      'Building Repairs/Sanitary Repair', 'Computer Repair', 'CCTV Repair', 
      'Electric Equipment Repairs', 'Furniture Repairs', 'Misc. Others Repairs'
    ]
  },
  {
    name: 'E. DEPRECIATION',
    items: ['TO DEPRECIATION']
  },
  {
    name: 'F. CAPITALIST EXPENSES',
    items: [
      'New Construction (Building)', 'School Furniture (Capital)', 'Air Conditioner', 'Invertor', 
      'CCTV Camera (Capital)', 'Gen Set', 'Water Cooler', 'New PC', 'Monitor', 
      'New Touch Panel', 'New Smart Board', 'Printer (Capital)', 
      'Vehicle A/c New Vehicle', 'Library Books (Capital)'
    ]
  }
];

export const CATEGORIES = BUDGET_GROUPS.flatMap(group => group.items);

export const SESSIONS = ['2024-25', '2025-26', '2026-27', '2027-28'];

export const INITIAL_BUDGETS: BudgetMap = {};
SCHOOLS.forEach(school => {
  INITIAL_BUDGETS[school.id] = {};
  CATEGORIES.forEach(cat => {
    INITIAL_BUDGETS[school.id][cat] = { q1: 75000, q2: 75000, q3: 75000, q4: 75000 };
  });
});

export const MOCK_REQUESTS: ExpenseRequest[] = [
  {
    id: 'DA5TH/2024-25/1001',
    schoolId: 'school-1',
    schoolName: 'Darshan Academy, 5th Mile',
    category: 'Educational Workshops & Seminars',
    description: 'Faculty development program for senior wing teachers on new CBSE guidelines.',
    amount: 15500,
    status: RequestStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    session: '2024-25',
    expenseDate: '2024-05-15'
  },
  {
    id: 'DAAMB/2024-25/1002',
    schoolId: 'school-2',
    schoolName: 'Darshan Academy, Ambala',
    category: 'Salary & Wages',
    description: 'Arrears for supporting staff for the month of April.',
    amount: 42000,
    status: RequestStatus.APPROVED,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    approverComments: 'Verified with payroll sheet. Approved.',
    session: '2024-25',
    expenseDate: '2024-05-10'
  },
  {
    id: 'DAAMR/2024-25/1003',
    schoolId: 'school-3',
    schoolName: 'Darshan Academy, Amritsar',
    category: 'Electricity Charges',
    description: 'Monthly electricity bill for the main campus building.',
    amount: 12800,
    status: RequestStatus.DISBURSED,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    approverComments: 'Regular monthly expense.',
    financeComments: 'UTR: PAY_AMR_9928172',
    session: '2024-25',
    expenseDate: '2024-05-02'
  },
  {
    id: 'DADEL/2024-25/1004',
    schoolId: 'school-7',
    schoolName: 'Darshan Academy, Delhi',
    category: 'Annual Day',
    description: 'Advance payment for auditorium booking and stage lighting.',
    amount: 50000,
    status: RequestStatus.REJECTED,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    approverComments: 'Please provide quotation from at least two more vendors.',
    session: '2024-25',
    expenseDate: '2024-06-20'
  },
  {
    id: 'DAPUN/2024-25/1005',
    schoolId: 'school-20',
    schoolName: 'Darshan Academy, Pune',
    category: 'Building Repairs/Sanitary Repair',
    description: 'Emergency plumbing repairs in the primary block washrooms.',
    amount: 8400,
    status: RequestStatus.PENDING,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    session: '2024-25',
    expenseDate: '2024-05-21'
  }
];
