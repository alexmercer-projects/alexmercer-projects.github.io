/* Demo data for the Copperwick quote automation. Every name, town, phone and email is made up. */
var DEMO_SETTINGS = {
  'Business name': 'Copperwick Moving Co.',
  'Reference prefix': 'CWM',
  'Office name': 'Dana Price',
  'Office email': 'office@example.com',
  'Office phone': '(555) 010-2290',
  'Reply-to email': 'quotes@example.com',
  'Long-distance name': 'Sam Whitlock',
  'Long-distance email': 'longdistance@example.com',
  'Reply within (business hours)': 2,
  'Rush if moving within (days)': 7,
  'Duplicate window (days)': 14,
  'Flag moves further out than (days)': 365,
  'Max links in notes': 1,
  'Morning digest hour': 7,
  'Site visit for': '4 bedrooms, 5+ bedrooms',
  'Open (hour)': 8,
  'Close (hour)': 18,
  'Open days': 'Mon, Tue, Wed, Thu, Fri, Sat'
};

var DEMO_ROUTING = [
  { town: 'Alder Flats', area: 'North', estimator: 'Rosa Delgado', email: 'rosa@example.com' },
  { town: 'Brannock', area: 'North', estimator: 'Rosa Delgado', email: 'rosa@example.com' },
  { town: 'Pell Corner', area: 'North', estimator: 'Rosa Delgado', email: 'rosa@example.com' },
  { town: 'Coldwater', area: 'South', estimator: 'Marcus Bell', email: 'marcus@example.com' },
  { town: 'Sorrel Bend', area: 'South', estimator: 'Marcus Bell', email: 'marcus@example.com' },
  { town: 'Wyeth', area: 'South', estimator: 'Marcus Bell', email: 'marcus@example.com' },
  { town: 'Dunmore Ridge', area: 'East', estimator: 'Jen Okafor', email: 'jen@example.com' },
  { town: 'Easton Mills', area: 'East', estimator: 'Jen Okafor', email: 'jen@example.com' },
  { town: 'Fallow Creek', area: 'East', estimator: 'Jen Okafor', email: 'jen@example.com' }
];

var DEMO_HOME_SIZES = ['Studio', '1 bedroom', '2 bedrooms', '3 bedrooms', '4 bedrooms', '5+ bedrooms', 'Office or storage unit'];
var DEMO_OUTSIDE = 'Outside the area (long distance)';

/** The demo's clock starts here (Tue Nov 17 2026, 10:05 AM) and runs forward from page load. */
var DEMO_START = [2026, 10, 17, 10, 5];

/**
 * Example requests from the last few days, replayed through processRequest so
 * every seeded row was made by the same rules. [days ago, hour, minute, request, later status]
 */
var DEMO_HISTORY = [
  [4, 9, 12, { name: 'Priya Natarajan', email: 'priya.n@example.com', phone: '555-010-3318', moveIn: 18, fromTown: 'Brannock', toTown: 'Pell Corner', homeSize: '2 bedrooms', notes: '' }, 'Booked'],
  [4, 13, 40, { name: 'Tom Arkwright', email: 'tom.arkwright@example.com', phone: '555-010-7742', moveIn: 30, fromTown: 'Wyeth', toTown: DEMO_OUTSIDE, homeSize: '3 bedrooms', notes: 'Moving for work, flexible on the date' }, 'Quoted'],
  [3, 8, 5, { name: 'Lena Fischer', email: 'lena.f@example.com', phone: '555-010-2091', moveIn: 11, fromTown: 'Easton Mills', toTown: 'Dunmore Ridge', homeSize: '1 bedroom', notes: 'Third floor, no elevator' }, 'Quoted'],
  [1, 21, 47, { name: 'buy followers', email: 'promo@example.com', phone: '', moveIn: 5, fromTown: 'Coldwater', toTown: 'Coldwater', homeSize: 'Studio', notes: 'Cheap SEO http://example.com/a http://example.com/b www.example.com', website: 'example.com' }, null],
  [2, 10, 18, { name: 'Marisol Ortega', email: 'marisol.ortega@example.com', phone: '555-010-6650', moveIn: 6, fromTown: 'Coldwater', toTown: 'Sorrel Bend', homeSize: '3 bedrooms', notes: 'Upright piano' }, 'Contacted'],
  [2, 15, 2, { name: 'Ben Achterberg', email: 'ben.a@example.com', phone: '555-010-1184', moveIn: 45, fromTown: 'Fallow Creek', toTown: 'Alder Flats', homeSize: '4 bedrooms', notes: '' }, 'Contacted'],
  [1, 9, 31, { name: 'Grace Whitfield', email: 'grace.whitfield@gmial.com', phone: '555-010-5527', moveIn: 21, fromTown: 'Alder Flats', toTown: 'Brannock', homeSize: '2 bedrooms', notes: '' }, null],
  [1, 11, 54, { name: 'Omar Haddad', email: 'omar.h@example.com', phone: '555-010-8803', moveIn: 9, fromTown: 'Dunmore Ridge', toTown: 'Fallow Creek', homeSize: 'Office or storage unit', notes: 'Small office, 6 desks' }, null],
  [1, 16, 20, { name: 'Hannah Lowe', email: 'hannah.lowe@example.com', phone: '555-010-4416', moveIn: 4, fromTown: 'Sorrel Bend', toTown: 'Wyeth', homeSize: '1 bedroom', notes: 'Need boxes too' }, 'Contacted'],
  [0, 8, 47, { name: 'Diego Ramos', email: 'diego.ramos@example.com', phone: '555-010-2675', moveIn: 25, fromTown: 'Pell Corner', toTown: 'Easton Mills', homeSize: '3 bedrooms', notes: 'Want a quote for packing as well' }, null]
];
