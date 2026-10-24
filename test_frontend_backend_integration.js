const http = require('http');

const API_BASE = 'http://localhost:5000/api';

function apiCall(endpoint, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE}${endpoint}`);
    const postData = body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', err => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('================================================================');
  console.log('   HOMEEASE FRONTEND-BACKEND END-TO-END INTEGRATION TEST SUITE   ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health check verification
    const health = await apiCall('/health');
    assert(health.status === 200 && health.body.database?.connected === true, 'Backend health check responds with 200 and DB connected');

    // 2. Customer Registration Flow
    const uid = Math.floor(1000 + Math.random() * 9000);
    const custEmail = `student.alex.${uid}@homeease.edu`;
    const custPass = 'AlexStudent2026!';
    const custReg = await apiCall('/auth/register', 'POST', {
      name: 'Alex Johnson',
      email: custEmail,
      password: custPass,
      role: 'customer',
      phone: '+1 (555) 019-2834'
    });
    assert(custReg.status === 201, 'Customer registration API returns HTTP 201');
    assert(custReg.body.token != null, 'Customer receives valid JWT token upon registration');
    assert(custReg.body.user.role === 'customer', 'User role correctly registered as "customer"');
    const custToken = custReg.body.token;

    // 3. Provider Registration Flow
    const proEmail = `electrician.marcus.${uid}@homeease.edu`;
    const proPass = 'MarcusPro2026!';
    const proReg = await apiCall('/auth/register', 'POST', {
      name: 'Marcus Vance',
      email: proEmail,
      password: proPass,
      role: 'provider',
      phone: '+1 (555) 028-4921',
      services: ['Electrician', 'Appliance Repair'],
      city: 'Springfield'
    });
    assert(proReg.status === 201, 'Provider registration API returns HTTP 201');
    assert(proReg.body.token != null, 'Provider receives valid JWT token');
    assert(proReg.body.user.role === 'provider', 'User role correctly registered as "provider"');
    const proToken = proReg.body.token;

    // 4. Customer Login Flow
    const custLogin = await apiCall('/auth/login', 'POST', {
      email: custEmail,
      password: custPass
    });
    assert(custLogin.status === 200, 'Customer login with valid credentials succeeds (HTTP 200)');
    assert(custLogin.body.user.email === custEmail, 'Customer profile payload matches authenticated user');

    // 5. Provider Login Flow
    const proLogin = await apiCall('/auth/login', 'POST', {
      email: proEmail,
      password: proPass
    });
    assert(proLogin.status === 200, 'Provider login with valid credentials succeeds (HTTP 200)');
    assert(proLogin.body.user.role === 'provider', 'Provider login returns role: provider');

    // 6. Session Persistence / Verification (GET /auth/me)
    const custMe = await apiCall('/auth/me', 'GET', null, custToken);
    assert(custMe.status === 200 && custMe.body.user.name === 'Alex Johnson', 'Customer session verified via GET /api/auth/me');

    const proMe = await apiCall('/auth/me', 'GET', null, proToken);
    assert(proMe.status === 200 && proMe.body.user.name === 'Marcus Vance', 'Provider session verified via GET /api/auth/me');

    // 7. Customer Booking Creation Flow
    const createBooking = await apiCall('/bookings', 'POST', {
      serviceCategory: 'Electrician',
      address: 'Apt 4B, Greenwood Heights, College Road',
      city: 'Springfield',
      pincode: '97477',
      preferredDate: 'Tomorrow, Oct 25, 2026',
      preferredTimeSlot: 'Morning (09:00 AM - 12:00 PM)',
      issueDescription: 'Kitchen main power outlet sparked and trips the fuse.',
      price: 29
    }, custToken);
    assert(createBooking.status === 201, 'Customer booking creation succeeds (HTTP 201)');
    assert(createBooking.body.data.status === 'pending', 'Created booking status is initialized as "pending"');
    assert(createBooking.body.data.bookingRef.startsWith('HE-'), `Generated real booking ref: ${createBooking.body.data.bookingRef}`);
    const bookingId = createBooking.body.data._id;

    // 8. Verify Booking appears in Customer Dashboard (GET /bookings/my)
    const custBookings = await apiCall('/bookings/my', 'GET', null, custToken);
    assert(custBookings.status === 200, 'Customer retrieves personal bookings list (HTTP 200)');
    const foundInCustDashboard = custBookings.body.data.some(b => b._id === bookingId);
    assert(foundInCustDashboard === true, 'Created booking is immediately present in Customer Dashboard feed');

    // 9. Provider Available Requests Feed (GET /bookings/available)
    const availableLeads = await apiCall('/bookings/available', 'GET', null, proToken);
    assert(availableLeads.status === 200, 'Provider retrieves available pending leads matching trade (HTTP 200)');
    const foundInLeads = availableLeads.body.data.some(b => b._id === bookingId);
    assert(foundInLeads === true, 'Created customer booking appears in Provider Available Requests feed');

    // 10. Provider Accepts Booking Flow (PUT /bookings/:id/accept)
    const acceptRes = await apiCall(`/bookings/${bookingId}/accept`, 'PUT', {}, proToken);
    assert(acceptRes.status === 200, 'Provider accepts pending booking successfully (HTTP 200)');
    assert(acceptRes.body.data.status === 'accepted', 'Booking status transitions to "accepted"');
    assert(acceptRes.body.data.provider._id != null, 'Assigned provider ID is linked to booking');

    // 11. Concurrency / Double Acceptance Protection
    // Create a 2nd provider and verify they cannot accept the already-accepted booking
    const pro2Email = `electrician.elena.${uid}@homeease.edu`;
    const pro2Reg = await apiCall('/auth/register', 'POST', {
      name: 'Elena Rodriguez',
      email: pro2Email,
      password: 'ElenaPass2026!',
      role: 'provider',
      services: ['Electrician']
    });
    const doubleAccept = await apiCall(`/bookings/${bookingId}/accept`, 'PUT', {}, pro2Reg.body.token);
    assert(doubleAccept.status === 409, 'Second provider attempting to accept assigned booking receives HTTP 409 Conflict');

    // 12. Provider Marks Job In-Progress (PUT /bookings/:id/status)
    const inProgressRes = await apiCall(`/bookings/${bookingId}/status`, 'PUT', {
      status: 'in_progress',
      note: 'Technician on-site testing socket voltage.'
    }, proToken);
    assert(inProgressRes.status === 200, 'Provider marks booking as in_progress (HTTP 200)');
    assert(inProgressRes.body.data.status === 'in_progress', 'Booking status verified as "in_progress"');

    // 13. Provider Marks Job Completed (PUT /bookings/:id/status)
    const completeRes = await apiCall(`/bookings/${bookingId}/status`, 'PUT', {
      status: 'completed',
      note: 'Replaced charred 15A socket receptacle. Tested safe.'
    }, proToken);
    assert(completeRes.status === 200, 'Provider marks booking as completed (HTTP 200)');
    assert(completeRes.body.data.status === 'completed', 'Booking status verified as "completed"');

    // 14. Customer Cancelling an Eligible Pending Booking Flow
    const booking2Res = await apiCall('/bookings', 'POST', {
      serviceCategory: 'Plumber',
      address: '100 University Ave, Room 12',
      preferredDate: 'Oct 29, 2026',
      preferredTimeSlot: 'Afternoon',
      issueDescription: 'Bathroom faucet drip'
    }, custToken);
    const booking2Id = booking2Res.body.data._id;

    const cancelRes = await apiCall(`/bookings/${booking2Id}/cancel`, 'PUT', {
      reason: 'No longer needed'
    }, custToken);
    assert(cancelRes.status === 200, 'Customer cancels eligible pending booking (HTTP 200)');
    assert(cancelRes.body.data.status === 'cancelled', 'Booking status successfully updated to "cancelled"');

    // 15. Unauthorized Access Checks (Role Security)
    // A) Customer tries to access Provider available leads
    const unauthorizedLeads = await apiCall('/bookings/available', 'GET', null, custToken);
    assert(unauthorizedLeads.status === 403, 'Customer blocked from Provider leads API (HTTP 403 Forbidden)');

    // B) Customer tries to update provider profile
    const unauthorizedProfile = await apiCall('/providers/profile', 'PUT', { isAvailable: false }, custToken);
    assert(unauthorizedProfile.status === 403, 'Customer blocked from updating provider profile (HTTP 403 Forbidden)');

    // C) Provider tries to create a customer booking
    const unauthorizedCreate = await apiCall('/bookings', 'POST', {
      serviceCategory: 'Plumber',
      address: 'Fake Address',
      preferredDate: 'Today',
      preferredTimeSlot: 'Morning'
    }, proToken);
    assert(unauthorizedCreate.status === 403, 'Provider blocked from creating customer bookings (HTTP 403 Forbidden)');

    // D) Customer tries to cancel an already completed booking
    const cancelCompleted = await apiCall(`/bookings/${bookingId}/cancel`, 'PUT', {}, custToken);
    assert(cancelCompleted.status === 400, 'Customer blocked from cancelling completed booking (HTTP 400 Bad Request)');

    // E) Unauthenticated request with missing/invalid token
    const unauthMe = await apiCall('/auth/me', 'GET', null, 'invalid_token_123');
    assert(unauthMe.status === 401, 'Request with invalid token rejected with HTTP 401 Unauthorized');

    // 16. Demo Profile Flow (alex.demo@homeease.edu / marcus.demo@homeease.edu)
    const demoLogin = await apiCall('/auth/login', 'POST', {
      email: 'alex.demo@homeease.edu',
      password: 'CustomerPass2026!'
    }).catch(() => null);

    let demoToken = null;
    if (demoLogin && demoLogin.status === 200) {
      demoToken = demoLogin.body.token;
    } else {
      const demoReg = await apiCall('/auth/register', 'POST', {
        name: 'Alex Johnson',
        email: 'alex.demo@homeease.edu',
        password: 'CustomerPass2026!',
        role: 'customer'
      });
      demoToken = demoReg.body.token;
    }
    assert(demoToken != null, 'College 1-Click Demo Customer account authenticates with real backend JWT');

  } catch (err) {
    console.error('Unexpected integration error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runIntegrationTests();
