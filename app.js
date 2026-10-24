/**
 * ===================================================================
 * HomeEase - Main Application Controller
 * Pure Vanilla JavaScript integrated with Node/Express/MongoDB Backend
 * ===================================================================
 */

/**
 * Resolves the Backend API Base URL safely across local development and production.
 * Priority order:
 * 1. window.__HOMEEASE_CONFIG__?.API_BASE_URL (optional external config)
 * 2. window.HOMEEASE_API_URL (runtime global injection)
 * 3. localStorage.getItem('homeease_custom_api_url') (browser console override for testing)
 * 4. Localhost / 127.0.0.1 default: 'http://localhost:5000/api'
 * 5. Production fallback: Same-origin '/api' (if served unified) or 'http://localhost:5000/api'
 */
function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    if (window.__HOMEEASE_CONFIG__ && window.__HOMEEASE_CONFIG__.API_BASE_URL) {
      return window.__HOMEEASE_CONFIG__.API_BASE_URL.replace(/\/+$/, '');
    }
    if (window.HOMEEASE_API_URL) {
      return window.HOMEEASE_API_URL.replace(/\/+$/, '');
    }
    const customStoredUrl = localStorage.getItem('homeease_custom_api_url');
    if (customStoredUrl) {
      return customStoredUrl.replace(/\/+$/, '');
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
      return 'http://localhost:5000/api';
    }
  }
  return 'http://localhost:5000/api';
}

const API_BASE = getApiBaseUrl();

// Application State
const AppState = {
  currentScreen: 'home',
  token: localStorage.getItem('homeease_jwt_token') || null,
  currentUser: null,
  selectedBooking: {
    service: 'Electrician',
    price: '29.00',
    date: 'Tomorrow, Oct 25, 2026',
    timeslot: 'Morning (09:00 AM - 12:00 PM)',
    address: 'Apt 4B, Greenwood Heights, College Road',
    city: 'Springfield',
    zip: '97477',
    notes: 'Kitchen sink drainage clogged, water leaking under pipe'
  },
  customerBookings: [],
  availableLeads: [],
  providerActiveJobs: [],
  providerStats: {
    leads: 0,
    active: 0,
    completed: 0,
    earnings: 0
  }
};

// Attempt to restore user profile from localStorage if present
try {
  const cachedUser = localStorage.getItem('homeease_user');
  if (cachedUser) {
    AppState.currentUser = JSON.parse(cachedUser);
  }
} catch (e) {
  console.warn('Failed to parse cached user:', e);
}

// Available Screen Names & Page Titles
const ScreenTitles = {
  'home': 'Home',
  'services': 'Services',
  'book': 'Book Service',
  'customer-dashboard': 'My Bookings',
  'provider-dashboard': 'Provider View',
  'login': 'Account Access'
};

// Toast Auto-dismiss Timer
let toastTimer = null;

// ===================================================================
// 0. Unified API Fetch Helper
// ===================================================================

/**
 * Universal fetch wrapper that manages headers, JWT Bearer tokens, and error handling
 * @param {string} endpoint - API path, e.g. '/auth/login'
 * @param {object} options - Fetch options (method, body, etc.)
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (AppState.token) {
    headers['Authorization'] = `Bearer ${AppState.token}`;
  }

  const fetchOptions = {
    ...options,
    headers
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, fetchOptions);
    const data = await res.json().catch(() => ({}));

    // Handle token expiry or invalid session
    if (res.status === 401) {
      if (AppState.token) {
        console.warn('[HomeEase API] 401 Unauthorized - Token expired or invalid');
        handleLogout(false);
        showToast('Session expired. Please sign in again.', 'lock');
      }
      throw new Error(data.message || 'Session expired or unauthorized');
    }

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      console.error('[HomeEase API Network Error]', err);
      showToast('Cannot connect to backend server at http://localhost:5000', 'cloud_off');
    }
    throw err;
  }
}

// ===================================================================
// 1. Core Navigation Manager & Role Guard
// ===================================================================

/**
 * Navigate to a specific screen with role-based UI access enforcement
 * @param {string} screenId - Target screen identifier
 */
function navigateTo(screenId) {
  if (!ScreenTitles[screenId]) {
    console.warn('Unknown screen:', screenId);
    return;
  }

  // --- Role-Based Access Enforcement ---
  if (screenId === 'customer-dashboard') {
    if (!AppState.token || !AppState.currentUser) {
      showToast('Please log in as a Customer to view your dashboard.', 'login');
      navigateTo('login');
      return;
    }
    if (AppState.currentUser.role === 'provider') {
      showToast('You are logged in as a Service Provider. Redirecting to Provider Portal.', 'engineering');
      navigateTo('provider-dashboard');
      return;
    }
  }

  if (screenId === 'provider-dashboard') {
    if (!AppState.token || !AppState.currentUser) {
      showToast('Please log in with a Service Provider account.', 'engineering');
      navigateTo('login');
      return;
    }
    if (AppState.currentUser.role === 'customer') {
      showToast('Access Denied: Service Provider account required.', 'block');
      navigateTo('customer-dashboard');
      return;
    }
  }

  // Hide all screens
  const screens = document.querySelectorAll('.screen-view');
  screens.forEach(s => s.classList.add('hidden'));

  // Show target screen
  const target = document.getElementById(`screen-${screenId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  AppState.currentScreen = screenId;

  // Update Top Header Title
  const titleEl = document.getElementById('header-page-title');
  if (titleEl) {
    titleEl.textContent = ScreenTitles[screenId];
  }

  // Update Bottom Nav Active Tab
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    const tabScreen = tab.getAttribute('data-screen');
    if (tabScreen === screenId) {
      tab.classList.add('active', 'text-secondary', 'font-semibold');
      tab.classList.remove('text-on-surface-variant');
    } else {
      tab.classList.remove('active', 'text-secondary', 'font-semibold');
      tab.classList.add('text-on-surface-variant');
    }
  });

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close Quick Menu if open
  const quickMenu = document.getElementById('quick-menu');
  if (quickMenu && !quickMenu.classList.contains('hidden')) {
    quickMenu.classList.add('hidden');
  }

  // Refresh dynamic screen data if entering a dashboard
  if (screenId === 'customer-dashboard' && AppState.currentUser?.role === 'customer') {
    loadCustomerBookings();
  } else if (screenId === 'provider-dashboard' && AppState.currentUser?.role === 'provider') {
    loadProviderDashboard();
  } else if (screenId === 'login') {
    updateLoginScreenBanner();
  }
}

/**
 * Toggle header quick navigation menu
 */
function toggleQuickMenu() {
  const quickMenu = document.getElementById('quick-menu');
  if (quickMenu) {
    quickMenu.classList.toggle('hidden');
  }
}

/**
 * Profile avatar click handler
 */
function openProfileScreen() {
  if (AppState.currentScreen === 'login') {
    if (AppState.currentUser?.role === 'provider') {
      navigateTo('provider-dashboard');
    } else if (AppState.currentUser?.role === 'customer') {
      navigateTo('customer-dashboard');
    } else {
      navigateTo('home');
    }
  } else {
    navigateTo('login');
  }
}

// ===================================================================
// 2. Cross-Screen Booking Flows (Req 5 & 6)
// ===================================================================

/**
 * Open Book screen and preselect the service chosen from Home or Services
 * @param {string} serviceName - e.g., 'Electrician', 'Plumber', 'Home Cleaning', 'Appliance Repair'
 * @param {string} price - e.g., '29.00'
 */
function openBookingWithService(serviceName, price) {
  let targetCategory = 'Electrician';
  if (serviceName.toLowerCase().includes('plumb')) {
    targetCategory = 'Plumber';
  } else if (serviceName.toLowerCase().includes('clean') || serviceName.toLowerCase().includes('scrub')) {
    targetCategory = 'Home Cleaning';
  } else if (serviceName.toLowerCase().includes('appliance') || serviceName.toLowerCase().includes('hvac')) {
    targetCategory = 'Appliance Repair';
  }

  const chips = document.querySelectorAll('.booking-service-chip');
  chips.forEach(chip => {
    const chipService = chip.getAttribute('data-service');
    const checkIcon = chip.querySelector('.service-check');
    const symbolIcon = chip.querySelector('.material-symbols-outlined');
    const priceText = chip.querySelector('.chip-price');

    if (chipService === targetCategory) {
      chip.classList.add('ring-2', 'ring-secondary');
      if (checkIcon) checkIcon.classList.remove('hidden');
      if (symbolIcon) {
        symbolIcon.classList.remove('text-on-surface-variant');
        symbolIcon.classList.add('text-secondary');
      }
      if (priceText) {
        priceText.classList.add('text-secondary');
        priceText.classList.remove('text-on-surface');
      }
    } else {
      chip.classList.remove('ring-2', 'ring-secondary');
      if (checkIcon) checkIcon.classList.add('hidden');
      if (symbolIcon) {
        symbolIcon.classList.add('text-on-surface-variant');
        symbolIcon.classList.remove('text-secondary');
      }
      if (priceText) {
        priceText.classList.remove('text-secondary');
        priceText.classList.add('text-on-surface');
      }
    }
  });

  // Update AppState
  AppState.selectedBooking.service = targetCategory;
  AppState.selectedBooking.price = price;

  // Update Payment Summary
  const labelEl = document.getElementById('booking-summary-label');
  const basePriceEl = document.getElementById('booking-summary-base-price');
  const totalPriceEl = document.getElementById('booking-summary-total-price');

  if (labelEl) labelEl.textContent = `Estimated Base Visit (${targetCategory})`;
  if (basePriceEl) basePriceEl.textContent = `$${price}`;
  if (totalPriceEl) totalPriceEl.textContent = `$${price}`;

  navigateTo('book');
  showToast(`Selected ${serviceName} ($${price}). Pick your slot below.`, 'add_task');
}

/**
 * Handle category chip click on Book screen
 */
function selectBookingCategory(el, serviceName, price) {
  document.querySelectorAll('.booking-service-chip').forEach(chip => {
    chip.classList.remove('ring-2', 'ring-secondary');
    const check = chip.querySelector('.service-check');
    if (check) check.classList.add('hidden');
    const icon = chip.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.classList.remove('text-secondary');
      icon.classList.add('text-on-surface-variant');
    }
    const priceText = chip.querySelector('.chip-price');
    if (priceText) {
      priceText.classList.remove('text-secondary');
      priceText.classList.add('text-on-surface');
    }
  });

  el.classList.add('ring-2', 'ring-secondary');
  const check = el.querySelector('.service-check');
  if (check) check.classList.remove('hidden');
  const icon = el.querySelector('.material-symbols-outlined');
  if (icon) {
    icon.classList.remove('text-on-surface-variant');
    icon.classList.add('text-secondary');
  }
  const priceText = el.querySelector('.chip-price');
  if (priceText) {
    priceText.classList.add('text-secondary');
    priceText.classList.remove('text-on-surface');
  }

  AppState.selectedBooking.service = serviceName;
  AppState.selectedBooking.price = price;

  const labelEl = document.getElementById('booking-summary-label');
  const basePriceEl = document.getElementById('booking-summary-base-price');
  const totalPriceEl = document.getElementById('booking-summary-total-price');

  if (labelEl) labelEl.textContent = `Estimated Base Visit (${serviceName})`;
  if (basePriceEl) basePriceEl.textContent = `$${price}`;
  if (totalPriceEl) totalPriceEl.textContent = `$${price}`;
}

/**
 * Handle date chip selection on Book screen
 */
function setBookingDate(btn, dateText) {
  document.querySelectorAll('.booking-date-chip').forEach(chip => {
    chip.classList.remove('bg-secondary', 'text-on-secondary', 'font-semibold');
    chip.classList.add('bg-surface-container-low', 'text-on-surface-variant');
  });

  btn.classList.add('bg-secondary', 'text-on-secondary', 'font-semibold');
  btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant');

  const displayEl = document.getElementById('booking-display-date');
  if (displayEl) {
    displayEl.textContent = dateText;
  }
  AppState.selectedBooking.date = dateText;
}

/**
 * Update time slot radio selection visuals
 */
function updateBookingTimeSlot() {
  const slots = document.querySelectorAll('.booking-time-slot');
  slots.forEach(slot => {
    const radio = slot.querySelector('input[type="radio"]');
    const icon = slot.querySelector('.material-symbols-outlined');
    if (radio && radio.checked) {
      slot.classList.add('ring-1', 'ring-secondary/50');
      if (icon) {
        icon.classList.remove('text-on-surface-variant');
        icon.classList.add('text-secondary');
      }
      AppState.selectedBooking.timeslot = radio.value;
    } else {
      slot.classList.remove('ring-1', 'ring-secondary/50');
      if (icon) {
        icon.classList.add('text-on-surface-variant');
        icon.classList.remove('text-secondary');
      }
    }
  });
}

/**
 * Confirm booking request -> Sends POST /api/bookings to real backend
 */
async function handleBookingConfirmation() {
  // Authorization check
  if (!AppState.token || !AppState.currentUser) {
    showToast('Please sign in as a Customer to confirm this booking request.', 'login');
    navigateTo('login');
    return;
  }

  if (AppState.currentUser.role !== 'customer') {
    showToast('Booking home services is for Customer accounts. Please switch to a customer account.', 'error');
    return;
  }

  const addressEl = document.getElementById('booking-address');
  const cityEl = document.getElementById('booking-city');
  const zipEl = document.getElementById('booking-zip');
  const issueEl = document.getElementById('booking-issue');

  const address = addressEl ? addressEl.value.trim() : '';
  const city = cityEl ? cityEl.value.trim() : 'Springfield';
  const pincode = zipEl ? zipEl.value.trim() : '97477';
  const issueDescription = issueEl ? issueEl.value.trim() : '';
  const serviceCategory = AppState.selectedBooking.service || 'Electrician';
  const price = parseFloat(AppState.selectedBooking.price) || 29;
  const preferredDate = AppState.selectedBooking.date || 'Tomorrow, Oct 25, 2026';
  const preferredTimeSlot = AppState.selectedBooking.timeslot || 'Morning (09:00 AM - 12:00 PM)';

  if (!address) {
    showToast('Please enter your street address before confirming.', 'home_pin');
    if (addressEl) addressEl.focus();
    return;
  }

  // Find confirmation button and show loading spinner
  const confirmBtn = document.querySelector('#screen-book button[onclick="handleBookingConfirmation()"]');
  const originalBtnContent = confirmBtn ? confirmBtn.innerHTML : '';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[20px]">sync</span>
      <span>Submitting to HomeEase Backend...</span>
    `;
  }

  try {
    const response = await apiFetch('/bookings', {
      method: 'POST',
      body: {
        serviceCategory,
        address,
        city,
        pincode,
        preferredDate,
        preferredTimeSlot,
        issueDescription: issueDescription || `${serviceCategory} standard visit and diagnosis`,
        price
      }
    });

    const booking = response.data;

    // Update modal with real generated booking reference and data
    const modalRef = document.getElementById('modal-booking-ref');
    const modalService = document.getElementById('modal-booking-service');
    const modalDate = document.getElementById('modal-booking-date');
    const modalAmount = document.getElementById('modal-booking-amount');

    if (modalRef) modalRef.textContent = booking.bookingRef || '#HE-READY';
    if (modalService) modalService.textContent = booking.serviceCategory;
    if (modalDate) modalDate.textContent = `${booking.preferredDate} • ${booking.preferredTimeSlot.split(' ')[0]}`;
    if (modalAmount) modalAmount.textContent = `$${booking.price}.00`;

    // Show modal
    const modal = document.getElementById('booking-confirm-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }

    showToast(`Booking ${booking.bookingRef} successfully created!`, 'task_alt');
  } catch (err) {
    console.error('[Booking Error]', err);
    showToast(`Booking failed: ${err.message}`, 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = originalBtnContent;
    }
  }
}

/**
 * Modal confirmed -> navigate to Customer Dashboard and view live bookings
 */
function completeBookingAndRedirect() {
  const modal = document.getElementById('booking-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
  }

  navigateTo('customer-dashboard');
}

// ===================================================================
// 3. Customer Dashboard Backend Integration
// ===================================================================

/**
 * Fetch and render the authenticated customer's live bookings from MongoDB
 */
async function loadCustomerBookings() {
  const list = document.getElementById('upcoming-bookings-list');
  const emptyState = document.getElementById('customer-empty-state');
  const upcomingSec = document.getElementById('upcoming-section');
  const activeCountEl = document.getElementById('customer-active-count');
  const allCountEl = document.getElementById('all-bookings-count');
  const pendingCountEl = document.getElementById('pending-count');
  const greetingEl = document.getElementById('customer-greeting');

  if (greetingEl && AppState.currentUser) {
    greetingEl.textContent = `Welcome back, ${AppState.currentUser.name}!`;
  }

  if (list) {
    list.innerHTML = `
      <div class="col-span-full py-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
        <span class="material-symbols-outlined animate-spin text-3xl text-secondary">sync</span>
        <p class="font-label-md text-sm">Fetching your live bookings from MongoDB...</p>
      </div>
    `;
  }

  try {
    const res = await apiFetch('/bookings/my');
    const bookings = res.data || [];
    AppState.customerBookings = bookings;

    // Filter counts
    const activeBookings = bookings.filter(b => ['pending', 'accepted', 'in_progress'].includes(b.status));
    const pendingBookings = bookings.filter(b => b.status === 'pending');

    if (activeCountEl) activeCountEl.textContent = activeBookings.length;
    if (allCountEl) allCountEl.textContent = bookings.length;
    if (pendingCountEl) pendingCountEl.textContent = pendingBookings.length;

    if (bookings.length === 0) {
      if (list) list.innerHTML = '';
      if (emptyState) {
        emptyState.classList.remove('hidden');
        emptyState.classList.add('flex');
      }
      return;
    }

    if (emptyState) {
      emptyState.classList.add('hidden');
      emptyState.classList.remove('flex');
    }

    if (!list) return;
    list.innerHTML = '';

    bookings.forEach(booking => {
      const card = createCustomerBookingCard(booking);
      list.appendChild(card);
    });
  } catch (err) {
    console.error('[Load Customer Bookings Error]', err);
    if (list) {
      list.innerHTML = `
        <div class="col-span-full py-8 text-center text-error bg-error-container/20 rounded-2xl p-6 border border-error/30">
          <span class="material-symbols-outlined text-3xl mb-1">warning</span>
          <p class="font-label-lg font-bold">Could not load bookings</p>
          <p class="font-body-sm text-xs mt-1">${err.message}</p>
          <button onclick="loadCustomerBookings()" class="mt-3 px-4 py-2 bg-secondary text-on-secondary rounded-xl text-xs font-bold">Try Again</button>
        </div>
      `;
    }
  }
}

/**
 * Generate a responsive booking card element adhering to the original design
 */
function createCustomerBookingCard(booking) {
  const card = document.createElement('article');
  card.className = 'booking-card bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-4 transition-transform duration-200 border border-surface-container';
  card.setAttribute('data-status', booking.status);
  card.setAttribute('id', `booking-card-${booking._id}`);

  // Status Styling Configuration
  let statusBadgeHtml = '';
  if (booking.status === 'pending') {
    statusBadgeHtml = `
      <div class="inline-flex items-center gap-1.5 bg-[#FEF3C7] text-[#B45309] px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
        <span class="material-symbols-outlined text-[14px]">hourglass_top</span>
        <span>Pending Provider Acceptance</span>
      </div>
    `;
  } else if (booking.status === 'accepted') {
    statusBadgeHtml = `
      <div class="inline-flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
        <span class="material-symbols-outlined text-[14px]">check_circle</span>
        <span>Accepted by Provider</span>
      </div>
    `;
  } else if (booking.status === 'in_progress') {
    statusBadgeHtml = `
      <div class="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
        <span class="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
        <span>Service In Progress</span>
      </div>
    `;
  } else if (booking.status === 'completed') {
    statusBadgeHtml = `
      <div class="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
        <span class="material-symbols-outlined text-[14px]">verified</span>
        <span>Job Completed</span>
      </div>
    `;
  } else {
    statusBadgeHtml = `
      <div class="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-label-sm text-xs font-semibold">
        <span class="material-symbols-outlined text-[14px]">cancel</span>
        <span>Cancelled</span>
      </div>
    `;
  }

  // Assigned Pro Section
  let proSectionHtml = '';
  if (booking.provider) {
    const proName = booking.provider.name || 'Assigned Technician';
    const proPhone = booking.provider.phone || '+1 (555) 019-2831';
    proSectionHtml = `
      <div class="bg-surface-container-low rounded-xl p-3 mt-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs flex-shrink-0">
            ${proName.charAt(0)}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <span class="font-label-md text-sm font-bold text-on-surface truncate">${proName}</span>
              <span class="material-symbols-outlined text-secondary text-[14px]" style="font-variation-settings: 'FILL' 1;">verified</span>
            </div>
            <span class="font-body-sm text-xs text-on-surface-variant block truncate">Verified Service Professional</span>
          </div>
        </div>
        <button type="button" onclick="showToast('Calling Provider: ${proPhone}', 'call')" class="p-2 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high transition-colors">
          <span class="material-symbols-outlined text-[18px]">phone</span>
        </button>
      </div>
    `;
  } else {
    proSectionHtml = `
      <div class="bg-surface-container-low/70 rounded-xl p-2.5 mt-2 flex items-center gap-2 text-on-surface-variant text-xs">
        <span class="material-symbols-outlined text-secondary text-[16px] animate-pulse">radar</span>
        <span class="italic">Dispatching to verified providers in ${booking.city || 'your area'}...</span>
      </div>
    `;
  }

  // Cancellation & Action Buttons
  let actionButtonsHtml = '';
  if (booking.status === 'pending') {
    actionButtonsHtml = `
      <div class="flex items-center gap-3 pt-3 border-t border-surface-container">
        <button class="flex-1 h-10 bg-error-container text-error rounded-xl font-label-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform" onclick="cancelBookingBackend('${booking._id}')" type="button">
          <span class="material-symbols-outlined text-[18px]">cancel</span>
          <span>Cancel Booking</span>
        </button>
        <button class="flex-1 h-10 bg-surface-container text-on-surface rounded-xl font-label-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform" onclick="openDetailsModal('${booking.serviceCategory}', '${booking.provider ? booking.provider.name : 'Assigning Pro'}', '$${booking.price}.00', '${booking.preferredDate}')" type="button">
          <span class="material-symbols-outlined text-[18px]">info</span>
          <span>Details</span>
        </button>
      </div>
    `;
  } else {
    actionButtonsHtml = `
      <div class="flex items-center gap-3 pt-3 border-t border-surface-container">
        <button class="w-full h-10 bg-surface-container text-on-surface rounded-xl font-label-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform" onclick="openDetailsModal('${booking.serviceCategory}', '${booking.provider ? booking.provider.name : 'Completed'}', '$${booking.price}.00', '${booking.preferredDate}')" type="button">
          <span class="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>View Service Details &amp; Receipt</span>
        </button>
      </div>
    `;
  }

  card.innerHTML = `
    <div>
      <div class="flex items-start justify-between gap-2 mb-3">
        ${statusBadgeHtml}
        <div class="text-right">
          <span class="font-headline-md text-xl text-secondary font-bold">$${booking.price}</span>
          <span class="font-label-sm text-xs text-on-surface-variant block -mt-0.5">${booking.bookingRef}</span>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-xl bg-surface-container-high text-secondary flex-shrink-0 flex items-center justify-center">
          <span class="material-symbols-outlined text-3xl">build_circle</span>
        </div>
        <div class="min-w-0 flex-1">
          <span class="font-label-sm text-xs text-secondary uppercase font-bold tracking-wide">${booking.serviceCategory}</span>
          <h3 class="font-headline-sm text-base font-bold text-on-surface truncate">${booking.issueDescription || 'Home Fix & Inspection'}</h3>
          <p class="font-body-sm text-xs text-on-surface-variant truncate">${booking.address}</p>
        </div>
      </div>
      
      ${proSectionHtml}

      <div class="grid grid-cols-2 gap-3 py-2 text-xs mt-2">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[18px]">event</span>
          <div class="min-w-0">
            <span class="text-on-surface-variant block">Schedule</span>
            <span class="font-bold text-on-surface truncate block">${booking.preferredDate}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-secondary text-[18px]">schedule</span>
          <div class="min-w-0">
            <span class="text-on-surface-variant block">Slot</span>
            <span class="font-bold text-on-surface truncate block">${booking.preferredTimeSlot}</span>
          </div>
        </div>
      </div>
    </div>

    ${actionButtonsHtml}
  `;

  return card;
}

/**
 * Cancel an eligible pending booking via PUT /api/bookings/:id/cancel
 * @param {string} bookingId
 */
async function cancelBookingBackend(bookingId) {
  const card = document.getElementById(`booking-card-${bookingId}`);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }

  try {
    const res = await apiFetch(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: { reason: 'Cancelled by customer via dashboard' }
    });

    showToast('Booking cancelled successfully.', 'cancel');
    await loadCustomerBookings();
  } catch (err) {
    console.error('[Cancel Error]', err);
    showToast(`Cancellation failed: ${err.message}`, 'error');
    if (card) {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
    }
  }
}

/**
 * Filter bookings displayed on customer dashboard
 */
function filterCustomerBookings(status, activeBtn) {
  const tabs = document.querySelectorAll('.customer-filter-tab');
  tabs.forEach(tab => {
    tab.classList.remove('bg-inverse-surface', 'text-inverse-on-surface');
    tab.classList.add('bg-surface-container', 'text-on-surface-variant');
  });

  if (activeBtn) {
    activeBtn.classList.remove('bg-surface-container', 'text-on-surface-variant');
    activeBtn.classList.add('bg-inverse-surface', 'text-inverse-on-surface');
  }

  const cards = document.querySelectorAll('#screen-customer-dashboard .booking-card');
  let visibleCount = 0;

  cards.forEach(card => {
    const cardStatus = card.getAttribute('data-status');
    if (status === 'all' || cardStatus === status) {
      card.style.display = 'flex';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const emptyState = document.getElementById('customer-empty-state');
  if (visibleCount === 0 && emptyState) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');
  } else if (emptyState) {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }
}

// ===================================================================
// 4. Provider Portal Backend Integration
// ===================================================================

/**
 * Fetch and render provider's active job and available incoming leads
 */
async function loadProviderDashboard() {
  const leadsList = document.getElementById('provider-leads-list');
  const activeJobCard = document.getElementById('active-job-card');
  const onlineSwitch = document.getElementById('provider-online-switch');
  const leadsCountEl = document.getElementById('pro-stat-leads');
  const activeCountEl = document.getElementById('pro-stat-active');
  const completedCountEl = document.getElementById('pro-stat-completed');
  const earningsCountEl = document.getElementById('pro-stat-earnings');

  // 1. Load provider profile to sync online status
  try {
    const profileRes = await apiFetch('/providers/profile/me');
    if (profileRes.data && onlineSwitch) {
      onlineSwitch.checked = Boolean(profileRes.data.isAvailable);
      syncProviderOnlineVisuals(onlineSwitch.checked);
    }
  } catch (err) {
    console.warn('[Provider Profile Sync]', err.message);
  }

  // 2. Load available unassigned job requests (Leads)
  if (leadsList) {
    leadsList.innerHTML = `
      <div class="py-6 text-center text-on-surface-variant">
        <span class="material-symbols-outlined animate-spin text-2xl text-secondary">sync</span>
        <p class="font-label-sm text-xs mt-1">Scanning for incoming service requests...</p>
      </div>
    `;
  }

  try {
    const leadsRes = await apiFetch('/bookings/available');
    const leads = leadsRes.data || [];
    AppState.availableLeads = leads;

    if (leadsCountEl) leadsCountEl.textContent = leads.length;

    if (!leadsList) return;

    if (leads.length === 0) {
      leadsList.innerHTML = `
        <div class="bg-surface-container-low rounded-2xl p-6 text-center text-on-surface-variant border border-surface-container">
          <span class="material-symbols-outlined text-secondary text-3xl mb-1">radar</span>
          <p class="font-label-md text-sm font-bold text-on-surface">No Pending Requests</p>
          <p class="font-body-sm text-xs mt-1">Your profile is online and waiting for new homeowner requests in your trade.</p>
        </div>
      `;
    } else {
      leadsList.innerHTML = '';
      leads.forEach(lead => {
        const leadEl = createProviderLeadCard(lead);
        leadsList.appendChild(leadEl);
      });
    }
  } catch (err) {
    console.error('[Load Leads Error]', err);
    if (leadsList) {
      leadsList.innerHTML = `<p class="text-xs text-error p-3">Failed to load leads: ${err.message}</p>`;
    }
  }

  // 3. Load provider's assigned jobs (Active & Completed)
  try {
    const myJobsRes = await apiFetch('/bookings/my');
    const jobs = myJobsRes.data || [];

    const activeJobs = jobs.filter(j => ['accepted', 'in_progress'].includes(j.status));
    const completedJobs = jobs.filter(j => j.status === 'completed');

    let totalEarnings = completedJobs.reduce((sum, j) => sum + (j.price || 45), 0);
    if (totalEarnings === 0 && completedJobs.length > 0) totalEarnings = completedJobs.length * 45;

    if (activeCountEl) activeCountEl.textContent = activeJobs.length;
    if (completedCountEl) completedCountEl.textContent = completedJobs.length;
    if (earningsCountEl) earningsCountEl.textContent = `$${totalEarnings}`;

    // Render active job card
    if (activeJobCard) {
      if (activeJobs.length === 0) {
        activeJobCard.innerHTML = `
          <div class="py-8 text-center text-on-surface-variant space-y-2">
            <span class="material-symbols-outlined text-secondary text-4xl">handyman</span>
            <h3 class="font-headline-sm text-base font-bold text-on-surface">No Active Job In Progress</h3>
            <p class="font-body-sm text-xs max-w-xs mx-auto">
              Accept one of the available requests from the right panel to begin servicing customers.
            </p>
          </div>
        `;
      } else {
        const currentJob = activeJobs[0];
        renderActiveJobCard(activeJobCard, currentJob);
      }
    }
  } catch (err) {
    console.error('[Load Provider Jobs Error]', err);
  }
}

/**
 * Render single incoming lead card for provider
 */
function createProviderLeadCard(lead) {
  const card = document.createElement('div');
  card.className = 'bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-3 border border-surface-container relative transition-all';
  card.setAttribute('id', `lead-card-${lead._id}`);

  const customerName = lead.customer?.name || 'Verified Customer';

  card.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="bg-secondary-container text-on-secondary-container font-label-sm text-xs px-2.5 py-0.5 rounded-full font-bold">
            ${lead.serviceCategory}
          </span>
          <span class="font-label-sm text-xs text-on-surface-variant font-medium">${lead.city || 'Campus Area'}</span>
        </div>
        <h3 class="font-headline-sm text-base font-bold text-on-surface">${lead.issueDescription || 'Service Diagnosis'}</h3>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="font-headline-md text-xl text-secondary font-bold">$${lead.price}.00</span>
        <p class="font-label-sm text-xs text-on-surface-variant">Est. Payout</p>
      </div>
    </div>
    <div class="space-y-2 bg-surface-container-low rounded-xl p-3.5 text-xs">
      <div class="flex items-start gap-2">
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant flex-shrink-0">home_pin</span>
        <p class="font-semibold text-on-surface">${lead.address}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant flex-shrink-0">schedule</span>
        <p class="font-bold text-secondary">${lead.preferredDate} • ${lead.preferredTimeSlot}</p>
      </div>
      <div class="flex items-center gap-2 text-on-surface-variant">
        <span class="material-symbols-outlined text-[18px] flex-shrink-0">person</span>
        <span>Customer: <strong>${customerName}</strong></span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 pt-1">
      <button class="h-10 bg-surface-container text-on-surface font-label-lg text-xs rounded-xl active:bg-surface-container-high transition-colors font-bold" onclick="declineLead('${lead._id}')">
        Dismiss
      </button>
      <button class="h-10 bg-secondary text-on-secondary font-label-lg text-xs rounded-xl shadow-sm active:opacity-90 transition-opacity font-bold flex items-center justify-center gap-1.5" onclick="acceptLeadBackend('${lead._id}')">
        <span class="material-symbols-outlined text-[16px]">thumb_up</span>
        Accept Job
      </button>
    </div>
  `;

  return card;
}

/**
 * Render active job card on provider dashboard
 */
function renderActiveJobCard(container, job) {
  const customerName = job.customer?.name || 'Homeowner';
  const customerPhone = job.customer?.phone || '+1 (555) 019-2831';
  const isInProgress = job.status === 'in_progress';

  container.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <div class="inline-flex items-center gap-1.5 bg-secondary-container text-on-secondary-container rounded-full px-2.5 py-0.5 font-label-sm text-xs font-semibold">
          <span class="w-2 h-2 rounded-full ${isInProgress ? 'bg-secondary animate-ping' : 'bg-secondary'}"></span>
          ${isInProgress ? 'Job In Progress' : 'Accepted • Ready to Start'}
        </div>
        <h3 class="font-headline-sm text-lg font-bold text-on-surface">${job.serviceCategory} - ${job.bookingRef}</h3>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="font-headline-md text-2xl text-secondary font-bold">$${job.price}.00</span>
        <p class="font-label-sm text-xs text-on-surface-variant">Direct Pay</p>
      </div>
    </div>

    <!-- Customer Detail Row -->
    <div class="bg-surface-container-low rounded-xl p-4 space-y-2.5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-label-lg text-sm font-bold flex-shrink-0">
            ${customerName.charAt(0)}
          </div>
          <div class="min-w-0">
            <p class="font-label-lg text-sm font-bold text-on-surface truncate">${customerName}</p>
            <p class="font-body-sm text-xs text-on-surface-variant truncate">Customer • ${job.city || 'Springfield'}</p>
          </div>
        </div>
        <button aria-label="Call Customer" class="w-9 h-9 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm active:scale-95 transition-transform" onclick="showToast('Calling Customer ${customerName}: ${customerPhone}', 'call')">
          <span class="material-symbols-outlined text-[18px]">phone</span>
        </button>
      </div>
      <div class="flex items-start gap-2 pt-1 text-on-surface-variant text-xs">
        <span class="material-symbols-outlined text-[16px] text-secondary flex-shrink-0 mt-0.5">location_on</span>
        <span class="font-semibold text-on-surface">${job.address}</span>
      </div>
      <div class="flex items-center gap-2 text-on-surface-variant text-xs">
        <span class="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">schedule</span>
        <span class="font-bold text-on-surface">${job.preferredDate} • ${job.preferredTimeSlot}</span>
      </div>
      <div class="text-xs text-on-surface-variant italic pt-1 border-t border-surface-container">
        "${job.issueDescription || 'Standard diagnosis and checkup'}"
      </div>
    </div>

    <div class="flex flex-col gap-2 pt-1">
      ${
        isInProgress
          ? `
        <button class="w-full h-11 bg-secondary text-on-secondary rounded-xl font-label-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:opacity-90 transition-all" onclick="updateJobStatusBackend('${job._id}', 'completed')">
          <span class="material-symbols-outlined text-[20px]">check_circle</span>
          <span>Mark as Completed</span>
        </button>
      `
          : `
        <button class="w-full h-11 bg-secondary text-on-secondary rounded-xl font-label-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm active:opacity-90 transition-all" onclick="updateJobStatusBackend('${job._id}', 'in_progress')">
          <span class="material-symbols-outlined text-[20px]">play_circle</span>
          <span>Start Work (Mark In-Progress)</span>
        </button>
      `
      }
      <button class="w-full h-10 bg-surface-container text-on-surface rounded-xl font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 active:bg-surface-container-high transition-colors" onclick="showToast('Navigating to: ${job.address}', 'directions')">
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant">directions</span>
        <span>Route to Location</span>
      </button>
    </div>
  `;
}

/**
 * Provider accepts an available booking -> calls PUT /api/bookings/:id/accept
 * @param {string} bookingId
 */
async function acceptLeadBackend(bookingId) {
  const card = document.getElementById(`lead-card-${bookingId}`);
  if (card) {
    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';
  }

  try {
    const res = await apiFetch(`/bookings/${bookingId}/accept`, {
      method: 'PUT'
    });

    showToast('Job lead accepted successfully! Added to your active jobs.', 'check_circle');
    await loadProviderDashboard();
  } catch (err) {
    console.error('[Accept Lead Error]', err);
    if (err.message.includes('already been accepted') || err.message.includes('no longer available')) {
      showToast('This job was already accepted by another provider.', 'warning');
    } else {
      showToast(`Error accepting job: ${err.message}`, 'error');
    }
    if (card) {
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
    }
    await loadProviderDashboard();
  }
}

/**
 * Provider updates job status (in_progress or completed) -> PUT /api/bookings/:id/status
 */
async function updateJobStatusBackend(bookingId, status) {
  try {
    const res = await apiFetch(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: {
        status,
        note: `Status updated to ${status} by provider`
      }
    });

    if (status === 'completed') {
      showToast('Great job! Service marked completed and added to payout.', 'celebration');
    } else {
      showToast('Job is now In Progress. Time logged.', 'play_circle');
    }

    await loadProviderDashboard();
  } catch (err) {
    console.error('[Update Job Status Error]', err);
    showToast(`Failed to update status: ${err.message}`, 'error');
  }
}

/**
 * Decline/dismiss lead from queue
 */
function declineLead(bookingId) {
  const card = document.getElementById(`lead-card-${bookingId}`);
  if (card) {
    card.classList.add('opacity-0', '-translate-x-full');
    setTimeout(() => {
      card.remove();
      const leadsEl = document.getElementById('pro-stat-leads');
      if (leadsEl) {
        const current = parseInt(leadsEl.textContent, 10) || 1;
        leadsEl.textContent = Math.max(0, current - 1);
      }
      showToast('Job lead dismissed from feed.', 'delete');
    }, 200);
  }
}

/**
 * Toggle provider online/offline status in MongoDB
 */
async function toggleProviderOnlineStatus(checkbox) {
  const isOnline = checkbox.checked;
  syncProviderOnlineVisuals(isOnline);

  try {
    await apiFetch('/providers/profile', {
      method: 'PUT',
      body: { isAvailable: isOnline }
    });

    if (isOnline) {
      showToast('Status: Online & Active. Receiving nearby job requests.', 'radar');
    } else {
      showToast('Status: Paused. No new job leads will be assigned.', 'pause_circle');
    }
  } catch (err) {
    console.error('[Provider Status Update Error]', err);
    showToast(`Could not update online status: ${err.message}`, 'error');
  }
}

function syncProviderOnlineVisuals(isOnline) {
  const indicator = document.getElementById('provider-status-indicator');
  const text = document.getElementById('provider-status-text');

  if (isOnline) {
    if (indicator) {
      indicator.classList.remove('bg-outline');
      indicator.classList.add('bg-secondary');
    }
    if (text) {
      text.textContent = 'Online & Active';
      text.classList.remove('text-outline');
      text.classList.add('text-secondary');
    }
  } else {
    if (indicator) {
      indicator.classList.remove('bg-secondary');
      indicator.classList.add('bg-outline');
    }
    if (text) {
      text.textContent = 'Offline (Paused)';
      text.classList.remove('text-secondary');
      text.classList.add('text-outline');
    }
  }
}

// ===================================================================
// 5. Authentication (Register / Login / Logout / Demo Profiles)
// ===================================================================

/**
 * Real Backend Login Submission
 */
async function handleLoginSubmit() {
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('btn-submit-login');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';

  if (!email || !password) {
    showToast('Please enter both email and password.', 'error');
    return;
  }

  const originalContent = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
      <span>Authenticating...</span>
    `;
  }

  try {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    // Save JWT token and user info
    AppState.token = res.token;
    AppState.currentUser = res.user;
    localStorage.setItem('homeease_jwt_token', res.token);
    localStorage.setItem('homeease_user', JSON.stringify(res.user));

    updateAuthUI();

    showToast(`Welcome back, ${res.user.name}!`, 'check_circle');

    // Route according to role
    if (res.user.role === 'provider') {
      navigateTo('provider-dashboard');
    } else {
      navigateTo('customer-dashboard');
    }
  } catch (err) {
    console.error('[Login Error]', err);
    showToast(`Login failed: ${err.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }
  }
}

/**
 * Real Backend Registration Submission
 */
async function handleRegisterSubmit() {
  const nameInput = document.getElementById('reg-name');
  const phoneInput = document.getElementById('reg-phone');
  const emailInput = document.getElementById('reg-email');
  const passInput = document.getElementById('reg-password');
  const submitBtn = document.getElementById('btn-submit-reg');
  const roleRadio = document.querySelector('input[name="account-type"]:checked');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const role = roleRadio ? roleRadio.value : 'customer';

  if (!name || !email || !password) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters long.', 'error');
    return;
  }

  const originalContent = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="material-symbols-outlined animate-spin text-[18px]">sync</span>
      <span>Creating Account...</span>
    `;
  }

  try {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: {
        name,
        email,
        password,
        role,
        phone,
        services: role === 'provider' ? ['Electrician', 'Appliance Repair'] : undefined,
        city: 'Springfield'
      }
    });

    AppState.token = res.token;
    AppState.currentUser = res.user;
    localStorage.setItem('homeease_jwt_token', res.token);
    localStorage.setItem('homeease_user', JSON.stringify(res.user));

    updateAuthUI();

    showToast(`Account created! Welcome, ${res.user.name}.`, 'celebration');

    if (role === 'provider') {
      navigateTo('provider-dashboard');
    } else {
      navigateTo('customer-dashboard');
    }
  } catch (err) {
    console.error('[Register Error]', err);
    showToast(`Registration failed: ${err.message}`, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalContent;
    }
  }
}

/**
 * Sign out user and clear stored tokens
 */
function handleLogout(showMessage = true) {
  AppState.token = null;
  AppState.currentUser = null;
  AppState.customerBookings = [];
  AppState.availableLeads = [];
  AppState.providerActiveJobs = [];

  localStorage.removeItem('homeease_jwt_token');
  localStorage.removeItem('homeease_user');

  updateAuthUI();

  if (showMessage) {
    showToast('Signed out of HomeEase successfully.', 'logout');
  }

  navigateTo('home');
}

/**
 * 1-Click College Demo Profiles (Connects via REAL Backend Authentication)
 * Automatically ensures demo account exists in MongoDB and signs in with real JWT!
 * @param {'customer' | 'provider'} role
 */
async function loginDemo(role) {
  const isCustomer = role === 'customer';
  const demoEmail = isCustomer ? 'alex.demo@homeease.edu' : 'marcus.demo@homeease.edu';
  const demoPass = isCustomer ? 'CustomerPass2026!' : 'ElectricianPro99!';
  const demoName = isCustomer ? 'Alex Johnson' : 'Marcus Vance';

  // Autofill login inputs on UI
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = demoEmail;
  if (passInput) passInput.value = demoPass;

  showToast(`Authenticating demo ${role} with backend...`, 'sync');

  try {
    // Try logging in
    let res = null;
    try {
      res = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email: demoEmail, password: demoPass }
      });
    } catch (loginErr) {
      // If demo account doesn't exist yet on clean DB, auto-register it!
      if (loginErr.message.includes('Invalid email or password') || loginErr.message.includes('401')) {
        console.log('[Demo] Auto-registering demo account in MongoDB:', demoEmail);
        res = await apiFetch('/auth/register', {
          method: 'POST',
          body: {
            name: demoName,
            email: demoEmail,
            password: demoPass,
            role: role,
            phone: isCustomer ? '+1 555-0199' : '+1 555-0244',
            services: isCustomer ? undefined : ['Electrician', 'Appliance Repair', 'Plumber'],
            city: 'Springfield'
          }
        });
      } else {
        throw loginErr;
      }
    }

    if (res && res.token) {
      AppState.token = res.token;
      AppState.currentUser = res.user;
      localStorage.setItem('homeease_jwt_token', res.token);
      localStorage.setItem('homeease_user', JSON.stringify(res.user));

      updateAuthUI();

      showToast(`Signed in as Demo ${isCustomer ? 'Customer (Alex)' : 'Pro (Marcus)'} with live backend JWT!`, 'verified');

      if (role === 'provider') {
        navigateTo('provider-dashboard');
      } else {
        navigateTo('customer-dashboard');
      }
    }
  } catch (err) {
    console.error('[Demo Login Error]', err);
    showToast(`Demo authentication failed: ${err.message}`, 'error');
  }
}

/**
 * Synchronize Header, Avatar, and Quick Menu with current authentication state
 */
function updateAuthUI() {
  const nameEl = document.getElementById('header-user-name');
  const avatarEl = document.getElementById('header-avatar');
  const dotEl = document.getElementById('header-role-dot');
  const logoutBtn = document.getElementById('quick-menu-logout-btn');

  if (AppState.currentUser && AppState.token) {
    const isProvider = AppState.currentUser.role === 'provider';
    const shortName = AppState.currentUser.name.split(' ')[0];

    if (nameEl) nameEl.textContent = shortName;
    if (dotEl) {
      dotEl.className = isProvider
        ? 'absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#F59E0B] rounded-full ring-2 ring-white'
        : 'absolute bottom-0 right-0 w-2.5 h-2.5 bg-secondary rounded-full ring-2 ring-white';
      dotEl.style.display = 'block';
    }

    if (avatarEl) {
      avatarEl.src = isProvider
        ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFGssBGPQoYGu8yTKep03zHzaj-MwbkZpiraB-27iT0AgkhNWZ7WOgfPNh6jYaxR1id_qkbeRheL5PA08bmzWu4ubsnNtqApnWYapZn2bXMe84ZwamOsXhnsdfK_v-ICh29o6_HAaq9AuP06-WBPNHxiInhSM37xghBNdrik9ot2g7bDuMlZyA92ULUhDQoKq7eDtNSJsp7lp-z4wvsF0nA11vFal2o-Ekh_iCiv20W2gcgTuQWKHD'
        : 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsnx4Tzx7H-O5aqk8CnGYORcnwKdrpdpa_IDPOMDGh5su9VEC6JyIV9ag_kDxwbKU-Nc-WiJADAevyxYUueoatC7oR5CqhEiryElly5tAV-e4bS9Q9f8czouDbF4oTmFrE6qV4RAMNGkOoWcLHzaVnRnKjH2zGxJUFegP4ABz0CJHtvrm1DM7tuvw0JQaTMgH2dogdK7V9rUfDCamSZHopSszTZblNuznyzk3pDwaK1bExVcxAr0V';
    }

    if (logoutBtn) {
      logoutBtn.classList.remove('hidden');
    }
  } else {
    if (nameEl) nameEl.textContent = 'Sign In';
    if (dotEl) dotEl.style.display = 'none';
    if (logoutBtn) logoutBtn.classList.add('hidden');
  }

  updateLoginScreenBanner();
}

/**
 * Updates the session banner shown at top of login screen
 */
function updateLoginScreenBanner() {
  const banner = document.getElementById('logged-in-banner');
  const nameEl = document.getElementById('logged-in-name');
  const emailEl = document.getElementById('logged-in-email');
  const roleEl = document.getElementById('logged-in-role');
  const avatarEl = document.getElementById('logged-in-avatar');

  if (!banner) return;

  if (AppState.currentUser && AppState.token) {
    banner.classList.remove('hidden');
    if (nameEl) nameEl.textContent = AppState.currentUser.name;
    if (emailEl) emailEl.textContent = AppState.currentUser.email;
    if (roleEl) roleEl.textContent = `${AppState.currentUser.role.toUpperCase()} ACCOUNT`;
    if (avatarEl) avatarEl.textContent = AppState.currentUser.name.charAt(0).toUpperCase();
  } else {
    banner.classList.add('hidden');
  }
}

/**
 * Toggle Login / Register form modes
 */
function switchAuthMode(mode) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const authTitle = document.getElementById('auth-title');
  const authSubtitle = document.getElementById('auth-subtitle');

  if (mode === 'login') {
    tabLogin.className = 'flex-1 py-2.5 rounded-lg font-label-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 bg-surface-container-lowest text-on-surface shadow-sm';
    tabRegister.className = 'flex-1 py-2.5 rounded-lg font-label-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 bg-transparent text-on-surface-variant';
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    authTitle.textContent = 'Welcome Back to HomeEase';
    authSubtitle.textContent = 'Access your service bookings and track verified pros.';
  } else {
    tabRegister.className = 'flex-1 py-2.5 rounded-lg font-label-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 bg-surface-container-lowest text-on-surface shadow-sm';
    tabLogin.className = 'flex-1 py-2.5 rounded-lg font-label-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 bg-transparent text-on-surface-variant';
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    authTitle.textContent = 'Join HomeEase Marketplace';
    authSubtitle.textContent = 'Join thousands of homeowners and licensed professionals.';
  }
}

/**
 * Password visibility toggler
 */
function togglePassVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input && icon) {
    const isPass = input.getAttribute('type') === 'password';
    input.setAttribute('type', isPass ? 'text' : 'password');
    icon.textContent = isPass ? 'visibility_off' : 'visibility';
  }
}

/**
 * Registration role radio button style sync
 */
function syncRoleStyles() {
  const custLabel = document.getElementById('label-role-customer');
  const proLabel = document.getElementById('label-role-provider');
  const selectedRadio = document.querySelector('input[name="account-type"]:checked');
  const selectedRole = selectedRadio ? selectedRadio.value : 'customer';

  if (selectedRole === 'customer') {
    if (custLabel) custLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer transition-all border border-secondary';
    if (proLabel) proLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl bg-surface-container shadow-sm cursor-pointer transition-all border border-transparent';
  } else {
    if (proLabel) proLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer transition-all border border-secondary';
    if (custLabel) custLabel.className = 'flex items-center gap-2.5 p-3 rounded-xl bg-surface-container shadow-sm cursor-pointer transition-all border border-transparent';
  }
}

// ===================================================================
// 6. Services Filter Logic (from homeease_services)
// ===================================================================

function filterServicesCategory(category, activeBtn) {
  const pills = document.querySelectorAll('.category-pill');
  pills.forEach(pill => {
    pill.className = 'category-pill flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container shadow-sm font-label-md text-sm transition-all duration-200';
  });

  if (activeBtn) {
    activeBtn.className = 'category-pill active flex items-center gap-1.5 px-4 py-2 rounded-full bg-tertiary-container text-on-primary shadow-sm font-label-md text-sm transition-all duration-200';
  }

  const cards = document.querySelectorAll('.service-card');
  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category');
    if (category === 'all' || cardCat === category) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

// ===================================================================
// 7. Modals & Detail Popups
// ===================================================================

function openDetailsModal(service, provider, price, time) {
  const sEl = document.getElementById('details-modal-service');
  const pEl = document.getElementById('details-modal-provider');
  const prEl = document.getElementById('details-modal-price');
  const tEl = document.getElementById('details-modal-time');

  if (sEl) sEl.textContent = service;
  if (pEl) pEl.textContent = provider;
  if (prEl) prEl.textContent = price;
  if (tEl) tEl.textContent = time;

  const modal = document.getElementById('customer-details-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeDetailsModal() {
  const modal = document.getElementById('customer-details-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// ===================================================================
// 8. Global Toast Notification System
// ===================================================================

/**
 * Show a unified floating toast notification
 * @param {string} message - Message to display
 * @param {string} icon - Material Symbols icon name
 */
function showToast(message, icon = 'check_circle') {
  const toast = document.getElementById('global-toast');
  const toastMsg = document.getElementById('global-toast-msg');
  const toastIcon = document.getElementById('global-toast-icon');

  if (!toast || !toastMsg || !toastIcon) return;

  toastMsg.textContent = message;
  toastIcon.textContent = icon;

  if (toastTimer) {
    clearTimeout(toastTimer);
  }

  toast.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

  toastTimer = setTimeout(() => {
    hideToast();
  }, 3400);
}

function hideToast() {
  const toast = document.getElementById('global-toast');
  if (toast) {
    toast.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
    toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
  }
}

// ===================================================================
// 9. Startup & Initialization
// ===================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verify token & session with backend
  if (AppState.token) {
    try {
      const meRes = await apiFetch('/auth/me');
      if (meRes.user) {
        AppState.currentUser = meRes.user;
        localStorage.setItem('homeease_user', JSON.stringify(meRes.user));
      }
    } catch (e) {
      console.warn('Saved session token expired, resetting to guest');
      AppState.token = null;
      AppState.currentUser = null;
      localStorage.removeItem('homeease_jwt_token');
      localStorage.removeItem('homeease_user');
    }
  }

  // 2. Synchronize navigation and UI state
  updateAuthUI();

  // 3. Start on homepage
  navigateTo('home');

  // 4. Check backend health in background
  try {
    const health = await apiFetch('/health');
    console.log('[HomeEase API Status]', health);
  } catch (err) {
    console.warn('[HomeEase API Offline] Backend not reachable at http://localhost:5000');
  }
});
