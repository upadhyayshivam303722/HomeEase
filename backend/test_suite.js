const http = require('http');

const API_BASE = 'http://127.0.0.1:5000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
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
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('       HOMEEASE BACKEND API VERIFICATION SUITE       ');
  console.log('====================================================\n');

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
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'GET /api/health returns 200');
    assert(health.body.success === true, 'Health check indicates success');
    assert(health.body.database && health.body.database.connected === true, 'Database connection is active and healthy');

    // 2. Auth: Admin registration rejection
    const adminAttempt = await request('POST', '/api/auth/register', {
      name: 'Hacker Admin',
      email: 'hacker@example.com',
      password: 'password123',
      role: 'admin'
    });
    assert(adminAttempt.status === 400, 'Disallows registration as administrator (HTTP 400)');
    assert(adminAttempt.body.success === false, 'Admin rejection response body has success: false');

    // 3. Auth: Customer Registration
    const randId = Math.floor(Math.random() * 100000);
    const customerEmail = `alex.turner.${randId}@example.com`;
    const customerReg = await request('POST', '/api/auth/register', {
      name: 'Alex Turner',
      email: customerEmail,
      password: 'mypassword123',
      role: 'customer',
      phone: '+1 555-0199'
    });
    assert(customerReg.status === 201, 'Customer registration returns 201');
    assert(customerReg.body.token != null, 'Customer registration returns JWT token');
    assert(customerReg.body.user && !customerReg.body.user.password, 'Password hash is NEVER returned in response');
    const customerToken = customerReg.body.token;
    const customerId = customerReg.body.user.id;

    // 4. Auth: Duplicate Email Rejection
    const dupReg = await request('POST', '/api/auth/register', {
      name: 'Duplicate Alex',
      email: customerEmail,
      password: 'mypassword123',
      role: 'customer'
    });
    assert(dupReg.status === 400, 'Rejects duplicate email with HTTP 400');

    // 5. Auth: Provider Registration
    const providerEmail = `marcus.vance.${randId}@example.com`;
    const providerReg = await request('POST', '/api/auth/register', {
      name: 'Marcus Vance',
      email: providerEmail,
      password: 'providerpass123',
      role: 'provider',
      phone: '+1 555-0244',
      services: ['Electrician', 'Appliance Repair'],
      city: 'Downtown Metro',
      pincode: '94103'
    });
    assert(providerReg.status === 201, 'Provider registration returns 201');
    assert(providerReg.body.user && providerReg.body.user.role === 'provider', 'Provider role correctly assigned');
    assert(providerReg.body.user.providerProfile != null, 'Provider profile auto-initialized upon registration');
    const providerToken = providerReg.body.token;
    const providerId = providerReg.body.user.id;

    // 6. Auth: Second Provider Registration (for double-accept testing)
    const provider2Email = `elena.rodriguez.${randId}@example.com`;
    const provider2Reg = await request('POST', '/api/auth/register', {
      name: 'Elena Rodriguez',
      email: provider2Email,
      password: 'providerpass456',
      role: 'provider',
      phone: '+1 555-0288',
      services: ['Electrician'],
      city: 'Downtown Metro',
      pincode: '94103'
    });
    const provider2Token = provider2Reg.body.token;

    // 7. Auth: Login with wrong password
    const badLogin = await request('POST', '/api/auth/login', {
      email: customerEmail,
      password: 'wrong_password'
    });
    assert(badLogin.status === 401, 'Rejects invalid credentials with HTTP 401');

    // 8. Auth: Login with correct password
    const goodLogin = await request('POST', '/api/auth/login', {
      email: customerEmail,
      password: 'mypassword123'
    });
    assert(goodLogin.status === 200, 'Customer login returns 200');
    assert(goodLogin.body.token != null, 'Customer login yields valid JWT');

    // 9. Auth: GET /api/auth/me (Protected)
    const meRes = await request('GET', '/api/auth/me', null, customerToken);
    assert(meRes.status === 200, 'GET /api/auth/me returns 200 with valid JWT');
    assert(meRes.body.user.email === customerEmail, 'Authenticated user profile matches token');

    // 10. Provider: Query providers list
    const provList = await request('GET', '/api/providers');
    assert(provList.status === 200, 'GET /api/providers returns 200');
    assert(provList.body.count >= 2, `Providers found: ${provList.body.count}`);

    // 11. Provider: Query by category & location
    const provFiltered = await request('GET', '/api/providers?category=Electrician&city=Downtown');
    assert(provFiltered.status === 200, 'GET /api/providers with category & city filter returns 200');
    assert(provFiltered.body.count >= 1, 'Provider filter returns matching electricians');

    // 12. Provider: Update profile
    const updateProfile = await request('PUT', '/api/providers/profile', {
      businessName: 'Vance Elite Electrical Solutions',
      services: ['Electrician', 'Smart Home Setup'],
      hourlyRate: 65,
      city: 'Downtown Metro',
      isAvailable: true,
      bio: 'Over 10 years of precision electrical and home automation experience.'
    }, providerToken);
    assert(updateProfile.status === 200, 'PUT /api/providers/profile returns 200');
    assert(updateProfile.body.data.businessName === 'Vance Elite Electrical Solutions', 'Provider business name updated');
    assert(updateProfile.body.data.hourlyRate === 65, 'Hourly rate updated');

    // 13. Security check: Customer cannot update provider profile
    const unauthorizedProvUpdate = await request('PUT', '/api/providers/profile', {
      hourlyRate: 100
    }, customerToken);
    assert(unauthorizedProvUpdate.status === 403, 'Customer role blocked from updating provider profile (HTTP 403 Forbidden)');

    // 14. Bookings: Customer creates booking
    const bookingRes = await request('POST', '/api/bookings', {
      serviceCategory: 'Electrician',
      address: '742 Evergreen Terrace, Apt 4B',
      city: 'Downtown Metro',
      pincode: '94103',
      preferredDate: '2026-10-28',
      preferredTimeSlot: '10:00 AM - 12:00 PM',
      issueDescription: 'Master bedroom main circuit breaker trips continuously when AC turns on.',
      price: 85,
      isUrgent: false
    }, customerToken);
    assert(bookingRes.status === 201, 'Customer booking creation returns 201');
    assert(bookingRes.body.data.status === 'pending', 'Initial booking status is pending');
    assert(bookingRes.body.data.bookingRef.startsWith('HE-'), `Generated booking ref: ${bookingRes.body.data.bookingRef}`);
    const bookingId = bookingRes.body.data._id;

    // 15. Bookings: Provider blocked from creating booking
    const providerCreateBooking = await request('POST', '/api/bookings', {
      serviceCategory: 'Electrician',
      address: 'Fake Address',
      preferredDate: '2026-10-28',
      preferredTimeSlot: '10:00 AM'
    }, providerToken);
    assert(providerCreateBooking.status === 403, 'Provider blocked from customer booking endpoint (HTTP 403 Forbidden)');

    // 16. Bookings: Customer lists their bookings
    const customerBookings = await request('GET', '/api/bookings/my', null, customerToken);
    assert(customerBookings.status === 200, 'Customer GET /api/bookings/my returns 200');
    assert(customerBookings.body.data.some(b => b._id === bookingId), 'Customer bookings list contains newly created booking');

    // 17. Bookings: Provider checks available requests
    const availableBookings = await request('GET', '/api/bookings/available', null, providerToken);
    assert(availableBookings.status === 200, 'Provider GET /api/bookings/available returns 200');
    assert(availableBookings.body.data.some(b => b._id === bookingId), 'Available bookings feed includes pending request');

    // 18. Bookings: Provider 1 accepts the pending booking
    const acceptRes = await request('PUT', `/api/bookings/${bookingId}/accept`, {}, providerToken);
    assert(acceptRes.status === 200, 'Provider 1 accepts booking successfully (HTTP 200)');
    assert(acceptRes.body.data.status === 'accepted', 'Booking status transitioned to accepted');
    assert(acceptRes.body.data.provider._id === providerId, 'Provider ID correctly assigned to booking');

    // 19. Bookings: Race condition / double-accept prevention!
    // Provider 2 tries to accept the same booking that was already accepted
    const doubleAcceptRes = await request('PUT', `/api/bookings/${bookingId}/accept`, {}, provider2Token);
    assert(doubleAcceptRes.status === 409, 'Second provider rejected with HTTP 409 Conflict when attempting to accept already-assigned booking');

    // 20. Bookings: Provider updates status to in_progress
    const inProgressRes = await request('PUT', `/api/bookings/${bookingId}/status`, {
      status: 'in_progress',
      note: 'Technician has arrived on site with multimeter and replacement fuses.'
    }, providerToken);
    assert(inProgressRes.status === 200, 'Assigned provider marks booking as in_progress (HTTP 200)');
    assert(inProgressRes.body.data.status === 'in_progress', 'Booking status is now in_progress');

    // 21. Bookings: Unauthorized provider tries to alter booking status
    const unauthorizedStatusUpdate = await request('PUT', `/api/bookings/${bookingId}/status`, {
      status: 'completed'
    }, provider2Token);
    assert(unauthorizedStatusUpdate.status === 403, 'Unassigned provider blocked from altering booking status (HTTP 403 Forbidden)');

    // 22. Bookings: Provider marks booking as completed
    const completeRes = await request('PUT', `/api/bookings/${bookingId}/status`, {
      status: 'completed',
      note: 'Replaced faulty 30A circuit breaker and tested voltage under load. Fully operational.'
    }, providerToken);
    assert(completeRes.status === 200, 'Assigned provider marks booking as completed (HTTP 200)');
    assert(completeRes.body.data.status === 'completed', 'Booking status is now completed');

    // 23. Bookings: Customer creates a 2nd booking and cancels it while pending
    const booking2Res = await request('POST', '/api/bookings', {
      serviceCategory: 'Plumber',
      address: '100 Market St, Suite 200',
      preferredDate: '2026-10-29',
      preferredTimeSlot: '2:00 PM - 4:00 PM',
      issueDescription: 'Leaking kitchen faucet needs washer replacement.'
    }, customerToken);
    const booking2Id = booking2Res.body.data._id;

    const cancelRes = await request('PUT', `/api/bookings/${booking2Id}/cancel`, {
      reason: 'Resolved issue by tightening valve myself.'
    }, customerToken);
    assert(cancelRes.status === 200, 'Customer cancels eligible pending booking (HTTP 200)');
    assert(cancelRes.body.data.status === 'cancelled', 'Booking status updated to cancelled');

    // 24. Bookings: Customer cannot cancel an already completed booking
    const cancelCompletedAttempt = await request('PUT', `/api/bookings/${bookingId}/cancel`, {
      reason: 'Should fail'
    }, customerToken);
    assert(cancelCompletedAttempt.status === 400, 'Customer cannot cancel a completed booking (HTTP 400)');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
