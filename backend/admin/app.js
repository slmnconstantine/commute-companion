// Destructure createClient from global supabase object (loaded via CDN)
const { createClient } = supabase;

// Application State
let dbConfig = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  supabaseServiceRoleKey: ''
};

let supabaseClient = null;
let usersData = [];
let tripsData = [];
let bookingsData = [];
let vehiclesData = [];
let hubPostsData = [];
let reportsData = [];

let activeTab = 'dashboard';

// Filter and Search States
let searchText = '';

// Users Filter
let filterRole = 'all';
let filterVerify = 'all';
let sortBy = 'created_at-desc';

// Verification Inbox Selected User
let selectedUserId = null;

// Trips Filter
let filterTrip = 'all';
let tripSearchText = '';

// Bookings Filter
let filterBooking = 'all';
let filterPayment = 'all';

// Hub Filter
let hubSearchText = '';
let hubFilterStatus = 'all';

// Lightbox Action Callback
let currentLightboxAction = null;

// Sync, Theme, Sound & Pagination States
let lastSyncedAt = Date.now();
let syncTickerTimer = null;
let soundAlertsEnabled = localStorage.getItem('coco_sound_enabled') !== 'false';
let currentTheme = localStorage.getItem('coco_theme_mode') || 'light';

// Selection State for Bulk Actions
let selectedUserIds = new Set();

// Pagination State
let paginationState = {
  users: { page: 1, limit: 12 },
  trips: { page: 1, limit: 10 },
  bookings: { page: 1, limit: 10 },
  hub: { page: 1, limit: 10 }
};

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  // Apply theme & controls
  applyInitialTheme();
  updateSoundIcon();
  setupKeyboardShortcuts();
  startSyncTicker();

  if (window.lucide) lucide.createIcons();
  
  // 1. Check for active session in sessionStorage
  const activeSession = getSavedSession();
  if (activeSession && activeSession.supabaseUrl && activeSession.supabaseServiceRoleKey) {
    dbConfig = { ...activeSession };
    hideAuthOverlay();
    initSupabase();
    await refreshData();
    setupAdminRealtime();
    return;
  }

  // 2. Otherwise, display login screen gate
  showAuthOverlay();
});

// Get session from sessionStorage
function getSavedSession() {
  try {
    const raw = sessionStorage.getItem('coco_admin_session');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Show the Authentication Gate
function showAuthOverlay() {
  const overlay = document.getElementById('admin-auth-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
      const input = document.getElementById('admin-password-input');
      if (input) {
        input.value = '';
        input.focus();
      }
    });
  }
}

// Hide the Authentication Gate
function hideAuthOverlay() {
  const overlay = document.getElementById('admin-auth-overlay');
  if (overlay) {
    overlay.classList.remove('visible');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  }
}

// Display error in Authentication Gate
function showAuthError(message) {
  const banner = document.getElementById('auth-error-banner');
  const text = document.getElementById('auth-error-text');
  if (banner && text) {
    text.textContent = message;
    banner.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  }
}

// Toggle password input visibility
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    if (icon) icon.setAttribute('data-lucide', 'eye');
  }
  if (window.lucide) lucide.createIcons();
}

// Handle Admin Login submission
async function handleAdminLogin(event) {
  if (event) event.preventDefault();

  const passwordInput = document.getElementById('admin-password-input');
  const errorBanner = document.getElementById('auth-error-banner');
  const btn = document.getElementById('btn-admin-login');
  const btnText = document.getElementById('btn-login-text');
  const btnSpinner = document.getElementById('btn-login-spinner');
  const btnIcon = document.getElementById('btn-login-icon');
  const card = document.querySelector('.auth-gate-card');

  const password = passwordInput ? passwordInput.value.trim() : '';
  if (!password) {
    showAuthError('Please enter the administrator passcode.');
    return;
  }

  // Reset error state & set loading
  if (errorBanner) errorBanner.style.display = 'none';
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Verifying...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  if (btnIcon) btnIcon.style.display = 'none';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Invalid administrator password');
    }

    if (data.config) {
      dbConfig = {
        supabaseUrl: data.config.supabaseUrl,
        supabaseAnonKey: data.config.supabaseAnonKey,
        supabaseServiceRoleKey: data.config.supabaseServiceRoleKey
      };
      sessionStorage.setItem('coco_admin_session', JSON.stringify(dbConfig));
    }

    hideAuthOverlay();
    showToast('Administrator session authenticated.', 'success');

    // Initialize Supabase & load platform data
    initSupabase();
    await refreshData();
    setupAdminRealtime();
  } catch (err) {
    console.error('[Admin Login] Failed:', err);
    showAuthError(err.message || 'Authentication failed. Please check credentials.');
    if (card) {
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 600);
    }
    if (passwordInput) passwordInput.select();
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Authenticate & Unlock';
    if (btnSpinner) btnSpinner.style.display = 'none';
    if (btnIcon) btnIcon.style.display = 'inline-block';
    if (window.lucide) lucide.createIcons();
  }
}

// Handle Admin Logout / Lock
function handleAdminLogout() {
  if (confirm('Lock the Admin Portal and sign out of this session?')) {
    sessionStorage.removeItem('coco_admin_session');
    dbConfig = {
      supabaseUrl: '',
      supabaseAnonKey: '',
      supabaseServiceRoleKey: ''
    };
    supabaseClient = null;
    showAuthOverlay();
    showToast('Admin session locked.', 'info');
  }
}


// Initialize Supabase Client
function initSupabase() {
  const statusPill = document.getElementById('db-status-pill');
  const statusText = document.getElementById('db-status-text');
  const roleLevelText = document.getElementById('role-level-text');

  if (!dbConfig.supabaseUrl || !dbConfig.supabaseAnonKey) {
    statusPill.className = 'connection-status-pill unconfigured';
    statusText.innerText = 'Unconfigured';
    roleLevelText.innerText = 'Offline';
    return;
  }

  try {
    const activeKey = dbConfig.supabaseServiceRoleKey || dbConfig.supabaseAnonKey;
    supabaseClient = createClient(dbConfig.supabaseUrl, activeKey, {
      auth: { persistSession: false }
    });

    if (dbConfig.supabaseServiceRoleKey) {
      statusPill.className = 'connection-status-pill connected';
      statusText.innerText = 'Connected (Admin)';
      roleLevelText.innerText = 'Full Service Role';
    } else {
      statusPill.className = 'connection-status-pill connected-anon';
      statusText.innerText = 'Connected (Live DB)';
      roleLevelText.innerText = 'Direct RPC Access';
    }
  } catch (err) {
    console.error('Supabase initialization failed:', err);
    statusPill.className = 'connection-status-pill unconfigured';
    statusText.innerText = 'Error';
    roleLevelText.innerText = 'Error';
  }
}

// Refresh all platform data (Users, Vehicles, Trips, Bookings, Hub Posts)
async function refreshData() {
  if (!supabaseClient) {
    showToast('Supabase client not connected. Please check configuration in settings.', 'error');
    updateUI();
    return;
  }

  try {
    const [profilesRes, vehiclesRes, tripsRes, bookingsRes, hubRes, reportsRes] = await Promise.all([
      supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('vehicles').select('*'),
      supabaseClient.from('trips').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('bookings').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('hub_posts').select('*').order('created_at', { ascending: false }),
      supabaseClient.from('reports').select('*').order('created_at', { ascending: false }),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (vehiclesRes.error) throw vehiclesRes.error;
    if (tripsRes.error) throw tripsRes.error;
    if (bookingsRes.error) throw bookingsRes.error;
    if (hubRes.error) throw hubRes.error;

    usersData = profilesRes.data || [];
    vehiclesData = vehiclesRes.data || [];
    tripsData = tripsRes.data || [];
    bookingsData = bookingsRes.data || [];
    hubPostsData = hubRes.data || [];
    reportsData = (reportsRes && reportsRes.data) ? reportsRes.data : [];

    // Associate vehicles with driver profiles
    const vehicleMap = new Map();
    vehiclesData.forEach(v => {
      if (v.driver_id) vehicleMap.set(v.driver_id, v);
    });

    usersData.forEach(u => {
      u.vehicle = vehicleMap.get(u.id) || null;
    });

    // Associate driver info with trips
    const userMap = new Map();
    usersData.forEach(u => userMap.set(u.id, u));

    tripsData.forEach(t => {
      t.driver = userMap.get(t.driver_id) || null;
      t.vehicle = t.driver ? vehicleMap.get(t.driver_id) : null;
      t.bookings = bookingsData.filter(b => b.trip_id === t.id);
    });

    // Associate commuter and trip info with bookings
    const tripMap = new Map();
    tripsData.forEach(t => tripMap.set(t.id, t));

    bookingsData.forEach(b => {
      b.commuter = userMap.get(b.commuter_id) || null;
      b.trip = tripMap.get(b.trip_id) || null;
    });

    // Associate author info and active reports with hub posts
    const autoPurgePostIds = [];
    hubPostsData.forEach(p => {
      p.author = userMap.get(p.author_id) || null;
      p.reports = reportsData.filter(r => r.post_id === p.id && r.status !== 'dismissed' && r.status !== 'resolved');
      const uniqueUsers = new Set(p.reports.map(r => r.reporter_id).filter(Boolean));
      p.uniqueReportCount = uniqueUsers.size;
      if (p.uniqueReportCount > 20) {
        autoPurgePostIds.push(p.id);
      }
    });

    if (autoPurgePostIds.length > 0) {
      console.warn(`[Auto-Moderation] Auto-purging ${autoPurgePostIds.length} post(s) exceeding 20 unique user reports:`, autoPurgePostIds);
      autoPurgePostIds.forEach(postId => {
        supabaseClient.from('post_comments').delete().eq('post_id', postId).then(() => {});
        supabaseClient.from('post_likes').delete().eq('post_id', postId).then(() => {});
        supabaseClient.from('reports').delete().eq('post_id', postId).then(() => {});
        supabaseClient.from('hub_posts').delete().eq('id', postId).then(() => {});
      });
      hubPostsData = hubPostsData.filter(p => !autoPurgePostIds.includes(p.id));
      reportsData = reportsData.filter(r => !autoPurgePostIds.includes(r.post_id));
      showToast(`Auto-Moderation: ${autoPurgePostIds.length} post(s) reported by >20 unique users were automatically removed.`, 'warning');
    }

    updateUI();
    lastSyncedAt = Date.now();
    updateSyncTimeTicker();
  } catch (err) {
    console.error('Live database fetch failed:', err);
    showToast(`Failed to load data from live database: ${err.message || 'Error'}`, 'error');
    updateUI();
  }
}

// Manual Refresh Trigger
async function manualRefresh() {
  const btn = document.getElementById('btn-refresh-data');
  if (btn) btn.classList.add('spinning');
  showToast('Refreshing platform records from database...', 'info');
  await refreshData();
  setTimeout(() => {
    if (btn) btn.classList.remove('spinning');
    showToast('Platform records up to date.', 'success');
  }, 400);
}

// Update UI Layout with values
function updateUI() {
  // Navigation badges: Unread notifications & new additions
  const now = Date.now();
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // 1. User Directory: Unverified accounts awaiting review or new signups this week
  const badgeUsers = document.getElementById('badge-total-users');
  if (badgeUsers) {
    const unverifiedCount = usersData.filter(u => !u.is_verified).length;
    const newUsersCount = usersData.filter(u => u.created_at && (now - new Date(u.created_at).getTime()) < ONE_WEEK_MS).length;
    
    if (unverifiedCount > 0) {
      badgeUsers.innerText = `${unverifiedCount}`;
      badgeUsers.className = 'nav-badge badge-pending';
      badgeUsers.title = `${unverifiedCount} unverified account(s) awaiting review`;
      badgeUsers.style.display = 'inline-block';
    } else if (newUsersCount > 0) {
      badgeUsers.innerText = `+${newUsersCount}`;
      badgeUsers.className = 'nav-badge badge-new';
      badgeUsers.title = `${newUsersCount} new user(s) joined this week`;
      badgeUsers.style.display = 'inline-block';
    } else {
      badgeUsers.style.display = 'none';
    }
  }
  
  // 2. Verification Inbox: Pending driver document submissions
  const pendingCount = usersData.filter(u => u.government_id_url && !u.is_verified).length;
  const pendingBadge = document.getElementById('badge-pending-verifications');
  if (pendingBadge) {
    pendingBadge.innerText = pendingCount;
    pendingBadge.title = `${pendingCount} pending document review(s)`;
    pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Dynamic Browser Tab Title with Pending Count
  if (pendingCount > 0) {
    document.title = `(${pendingCount}) Commute Companion - Admin`;
  } else {
    document.title = 'Commute Companion - Admin Control Portal';
  }

  // 3. Trips & Rides: Active / live rides needing monitoring or new trips this week
  const badgeTrips = document.getElementById('badge-total-trips');
  if (badgeTrips) {
    const activeTripsCount = tripsData.filter(t => t.status === 'open' || t.status === 'ongoing').length;
    const newTripsCount = tripsData.filter(t => t.created_at && (now - new Date(t.created_at).getTime()) < ONE_WEEK_MS).length;
    
    if (activeTripsCount > 0) {
      badgeTrips.innerText = `${activeTripsCount}`;
      badgeTrips.className = 'nav-badge badge-pending';
      badgeTrips.title = `${activeTripsCount} active/ongoing ride(s) live`;
      badgeTrips.style.display = 'inline-block';
    } else if (newTripsCount > 0) {
      badgeTrips.innerText = `+${newTripsCount}`;
      badgeTrips.className = 'nav-badge badge-new';
      badgeTrips.title = `${newTripsCount} new trip(s) this week`;
      badgeTrips.style.display = 'inline-block';
    } else {
      badgeTrips.style.display = 'none';
    }
  }

  // 4. Bookings & GCash: Submitted payment receipts needing verification or new reservations
  const badgeBookings = document.getElementById('badge-total-bookings');
  if (badgeBookings) {
    const pendingReceiptsCount = bookingsData.filter(b => b.payment_status === 'submitted' || (b.payment_status === 'pending' && b.payment_proof_url)).length;
    const pendingReservationsCount = bookingsData.filter(b => b.status === 'pending').length;
    const newBookingsCount = bookingsData.filter(b => b.created_at && (now - new Date(b.created_at).getTime()) < ONE_WEEK_MS).length;

    if (pendingReceiptsCount > 0) {
      badgeBookings.innerText = `${pendingReceiptsCount}`;
      badgeBookings.className = 'nav-badge badge-pending';
      badgeBookings.title = `${pendingReceiptsCount} submitted payment receipt(s) awaiting verification`;
      badgeBookings.style.display = 'inline-block';
    } else if (pendingReservationsCount > 0) {
      badgeBookings.innerText = `${pendingReservationsCount}`;
      badgeBookings.className = 'nav-badge badge-pending';
      badgeBookings.title = `${pendingReservationsCount} pending reservation(s)`;
      badgeBookings.style.display = 'inline-block';
    } else if (newBookingsCount > 0) {
      badgeBookings.innerText = `+${newBookingsCount}`;
      badgeBookings.className = 'nav-badge badge-new';
      badgeBookings.title = `${newBookingsCount} new booking(s) this week`;
      badgeBookings.style.display = 'inline-block';
    } else {
      badgeBookings.style.display = 'none';
    }
  }

  // 5. Community Hub: Reported posts needing moderation or new discussions
  const badgeHub = document.getElementById('badge-total-posts');
  const badgeReported = document.getElementById('badge-reported-posts');
  const reportedCount = hubPostsData.filter(p => p.reports && p.reports.length > 0).length;
  const newPostsCount = hubPostsData.filter(p => p.created_at && (now - new Date(p.created_at).getTime()) < ONE_WEEK_MS).length;

  if (badgeReported) {
    if (reportedCount > 0) {
      badgeReported.innerText = `${reportedCount} reported`;
      badgeReported.title = `${reportedCount} post(s) flagged by users`;
      badgeReported.style.display = 'inline-block';
    } else {
      badgeReported.style.display = 'none';
    }
  }

  if (badgeHub) {
    if (reportedCount > 0) {
      badgeHub.style.display = 'none'; // Avoid duplicate badge when reported badge is showing
    } else if (newPostsCount > 0) {
      badgeHub.innerText = `+${newPostsCount}`;
      badgeHub.className = 'nav-badge badge-new';
      badgeHub.title = `${newPostsCount} new community post(s) this week`;
      badgeHub.style.display = 'inline-block';
    } else {
      badgeHub.style.display = 'none';
    }
  }

  // Render stats and active tab
  calculateStats();

  if (activeTab === 'dashboard') {
    renderQuickInboxPreview();
    renderRecentActivityFeed();
  } else if (activeTab === 'users') {
    renderUserDirectory();
  } else if (activeTab === 'verification') {
    renderVerificationInbox();
  } else if (activeTab === 'trips') {
    renderTripsManagement();
  } else if (activeTab === 'bookings') {
    renderBookingsManagement();
  } else if (activeTab === 'hub') {
    renderHubModeration();
  }

  if (window.lucide) lucide.createIcons();
}

// Switch Tab Navigation
function switchTab(tabId) {
  activeTab = tabId;
  
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  const tabBtn = document.getElementById(`btn-tab-${tabId}`);
  if (tabBtn) tabBtn.classList.add('active');

  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.add('active');

  // Dynamic Breadcrumb
  const breadcrumbLabels = {
    dashboard: 'Dashboard',
    users: 'User Directory',
    verification: 'Verification Inbox',
    trips: 'Trips & Rides',
    bookings: 'Bookings & GCash',
    hub: 'Community Hub'
  };
  const bc = document.getElementById('bc-current-tab');
  if (bc) bc.textContent = breadcrumbLabels[tabId] || 'Portal';

  // Auto-close mobile drawer if opened
  toggleSidebarDrawer(false);

  updateUI();
}

// Animated Metric Counter (Count-up effect)
function animateMetricCounter(elementId, targetValue, duration = 600, isCurrency = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const startValue = parseFloat(el.getAttribute('data-current-val') || '0') || 0;
  el.setAttribute('data-current-val', targetValue);

  if (startValue === targetValue) {
    el.innerText = isCurrency ? formatCurrency(targetValue) : targetValue;
    return;
  }

  const startTime = performance.now();

  function updateCount(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const currentVal = Math.round(startValue + (targetValue - startValue) * easeOut);

    el.innerText = isCurrency ? formatCurrency(currentVal) : currentVal;

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    } else {
      el.innerText = isCurrency ? formatCurrency(targetValue) : targetValue;
    }
  }

  requestAnimationFrame(updateCount);
}

// Start & Update Last Synced Indicator
function startSyncTicker() {
  if (syncTickerTimer) clearInterval(syncTickerTimer);
  updateSyncTimeTicker();
  syncTickerTimer = setInterval(updateSyncTimeTicker, 5000);
}

function updateSyncTimeTicker() {
  const indicator = document.getElementById('sync-time-indicator');
  if (!indicator) return;

  const seconds = Math.floor((Date.now() - lastSyncedAt) / 1000);
  if (seconds < 10) {
    indicator.textContent = 'Live • Synced just now';
  } else if (seconds < 60) {
    indicator.textContent = `Live • Synced ${seconds}s ago`;
  } else {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      indicator.textContent = `Live • Synced ${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      indicator.textContent = `Live • Synced ${hours}h ago`;
    }
  }
}

// Calculate Dashboard KPI Analytics
function calculateStats() {
  const total = usersData.length;
  const drivers = usersData.filter(u => u.role === 'driver').length;
  const commuters = usersData.filter(u => u.role === 'commuter').length;

  const verified = usersData.filter(u => u.is_verified || u.verified_badge).length;
  const pending = usersData.filter(u => u.government_id_url && !u.is_verified && !u.verified_badge).length;
  const unverified = Math.max(0, total - verified - pending);

  const activeTrips = tripsData.filter(t => t.status === 'open' || t.status === 'ongoing').length;
  const reservations = bookingsData.filter(b => b.is_reservation).length;

  // Total Platform Fees (10% of fares)
  const totalPlatformFees = bookingsData
    .filter(b => b.status === 'accepted' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.platform_fee || (b.fare_paid ? b.fare_paid * 0.1 : 0)), 0);

  // Animate metric counters smoothly
  animateMetricCounter('stat-total-users', total);
  animateMetricCounter('stat-drivers', drivers);
  animateMetricCounter('stat-commuters', commuters);
  animateMetricCounter('stat-total-trips', tripsData.length);
  animateMetricCounter('stat-active-trips', activeTrips);
  animateMetricCounter('stat-total-bookings', bookingsData.length);
  animateMetricCounter('stat-reservation-count', reservations);
  animateMetricCounter('stat-platform-fees', totalPlatformFees, 600, true);

  animateMetricCounter('stat-verified-count', verified);
  animateMetricCounter('stat-pending-count', pending);
  animateMetricCounter('stat-unverified-count', unverified);

  // Percentage bars
  const driversPct = total > 0 ? Math.round((drivers / total) * 100) : 0;
  const commutersPct = total > 0 ? Math.round((commuters / total) * 100) : 0;

  document.getElementById('stat-drivers-percentage').style.width = `${driversPct}%`;
  document.getElementById('stat-drivers-pct-text').innerText = `${driversPct}%`;

  document.getElementById('stat-commuters-percentage').style.width = `${commutersPct}%`;
  document.getElementById('stat-commuters-pct-text').innerText = `${commutersPct}%`;

  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const unverifiedPct = total > 0 ? Math.round((unverified / total) * 100) : 0;

  document.getElementById('funnel-verified-bar').style.width = `${verifiedPct}%`;
  document.getElementById('funnel-pending-bar').style.width = `${pendingPct}%`;
  document.getElementById('funnel-unverified-bar').style.width = `${unverifiedPct}%`;
}

// Render Dashboard Quick Review Preview
function renderQuickInboxPreview() {
  const container = document.getElementById('quick-inbox-list');
  if (!container) return;

  const pending = usersData.filter(u => u.government_id_url && !u.is_verified);

  if (pending.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="check-circle" class="empty-icon text-green"></i>
        <p>All verification reviews are up to date!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = pending.slice(0, 5).map(user => `
    <div class="quick-item-row animate-slide-up">
      <div class="quick-item-info">
        <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
          ${!user.avatar_url ? (user.full_name || 'U').substring(0, 2).toUpperCase() : ''}
        </div>
        <div class="quick-item-meta">
          <h5>${escapeHTML(user.full_name)}</h5>
          <span>Role: ${user.role} • ${user.vehicle ? `${user.vehicle.model} (${user.vehicle.plate_number})` : 'ID Document Attached'}</span>
        </div>
      </div>
      <button class="btn-chevron" onclick="goToSubmission('${user.id}')" title="Review Document">
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
  `).join('');
}

// Render Recent Activity Timeline on Dashboard
function renderRecentActivityFeed() {
  const container = document.getElementById('recent-activity-feed');
  if (!container) return;

  const events = [];

  // Recent trips
  tripsData.forEach(t => {
    events.push({
      type: 'trip',
      title: `Ride Published: ${t.origin_label.split(',')[0]} → ${t.destination_label.split(',')[0]}`,
      desc: `Driver: ${t.driver?.full_name || 'Driver'} • Fare: ${formatCurrency(t.fare_per_seat)}`,
      time: new Date(t.created_at || Date.now()),
      icon: 'map-pin',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10b981'
    });
  });

  // Recent bookings
  bookingsData.forEach(b => {
    events.push({
      type: 'booking',
      title: b.is_reservation
        ? `Seat Reservation: ₱${b.reservation_fee || 0} deposit via GCash`
        : `Ride Booking: ${b.seats_booked} seat(s) requested`,
      desc: `Commuter: ${b.commuter?.full_name || 'Passenger'} • Status: ${b.status}`,
      time: new Date(b.created_at || Date.now()),
      icon: b.is_reservation ? 'wallet' : 'user-check',
      iconBg: b.is_reservation ? 'rgba(0, 125, 254, 0.15)' : 'rgba(162, 89, 255, 0.15)',
      iconColor: b.is_reservation ? '#007DFE' : '#a259ff'
    });
  });

  // Recent users
  usersData.forEach(u => {
    events.push({
      type: 'user',
      title: `User Registered: ${u.full_name}`,
      desc: `Role: ${u.role} • ${u.is_verified ? 'Verified' : 'Unverified'}`,
      time: new Date(u.created_at || Date.now()),
      icon: 'user-plus',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      iconColor: '#3b82f6'
    });
  });

  // Recent reports
  reportsData.forEach(r => {
    events.push({
      type: 'report',
      title: `Moderation Alert: Post Reported`,
      desc: `Reason: ${r.reason || 'Flagged content'} • Status: ${r.status || 'pending'}`,
      time: new Date(r.created_at || Date.now()),
      icon: 'flag',
      iconBg: 'rgba(239, 68, 68, 0.15)',
      iconColor: '#ef4444'
    });
  });

  events.sort((a, b) => b.time - a.time);
  const displayEvents = events.slice(0, 6);

  if (displayEvents.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">No recent events recorded yet.</p>`;
    return;
  }

  container.innerHTML = displayEvents.map(evt => `
    <div class="timeline-item animate-slide-up">
      <div class="timeline-icon-box" style="background: ${evt.iconBg}; color: ${evt.iconColor}">
        <i data-lucide="${evt.icon}"></i>
      </div>
      <div class="timeline-content">
        <h5>${escapeHTML(evt.title)}</h5>
        <p>${escapeHTML(evt.desc)}</p>
      </div>
      <div class="timeline-time">${formatTimeAgo(evt.time)}</div>
    </div>
  `).join('');
}

function goToSubmission(userId) {
  selectedUserId = userId;
  switchTab('verification');
}

// ═════ 2. USER DIRECTORY RENDERER ═════
function setRoleFilter(role) {
  filterRole = role;
  paginationState.users.page = 1;
  document.querySelectorAll('#filter-role-all, #filter-role-drivers, #filter-role-commuters').forEach(btn => {
    btn.classList.remove('active');
  });
  if (role === 'all') document.getElementById('filter-role-all').classList.add('active');
  if (role === 'driver') document.getElementById('filter-role-drivers').classList.add('active');
  if (role === 'commuter') document.getElementById('filter-role-commuters').classList.add('active');
  renderUserDirectory();
}

function setVerifyFilter(status) {
  filterVerify = status;
  paginationState.users.page = 1;
  document.querySelectorAll('#filter-verify-all, #filter-verify-verified, #filter-verify-pending, #filter-verify-unverified').forEach(btn => {
    btn.classList.remove('active');
  });
  if (status === 'all') document.getElementById('filter-verify-all').classList.add('active');
  if (status === 'verified') document.getElementById('filter-verify-verified').classList.add('active');
  if (status === 'pending') document.getElementById('filter-verify-pending').classList.add('active');
  if (status === 'unverified') document.getElementById('filter-verify-unverified').classList.add('active');
  renderUserDirectory();
}

function setSorting(value) {
  sortBy = value;
  paginationState.users.page = 1;
  renderUserDirectory();
}

function handleGlobalSearch(val) {
  searchText = val.trim().toLowerCase();
  paginationState.users.page = 1;
  paginationState.trips.page = 1;
  paginationState.bookings.page = 1;
  paginationState.hub.page = 1;
  if (activeTab === 'users') renderUserDirectory();
  else if (activeTab === 'trips') renderTripsManagement();
  else if (activeTab === 'bookings') renderBookingsManagement();
  else if (activeTab === 'hub') renderHubModeration();
}

function renderUserDirectory() {
  const grid = document.getElementById('users-grid');
  if (!grid) return;
  
  let filtered = usersData.filter(user => {
    const matchSearch = !searchText || 
      (user.full_name && user.full_name.toLowerCase().includes(searchText)) || 
      (user.username && user.username.toLowerCase().includes(searchText)) ||
      (user.gcash_number && user.gcash_number.includes(searchText)) ||
      user.id.includes(searchText);
      
    const matchRole = filterRole === 'all' || user.role === filterRole;
    
    let matchVerify = true;
    if (filterVerify === 'verified') matchVerify = user.is_verified || user.verified_badge;
    else if (filterVerify === 'pending') matchVerify = user.government_id_url && !user.is_verified && !user.verified_badge;
    else if (filterVerify === 'unverified') matchVerify = !user.government_id_url && !user.is_verified && !user.verified_badge;

    return matchSearch && matchRole && matchVerify;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'created_at-desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'created_at-asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'full_name-asc') return (a.full_name || '').localeCompare(b.full_name || '');
    if (sortBy === 'rating_avg-desc') return (b.rating_avg || 0) - (a.rating_avg || 0);
    return 0;
  });

  if (filtered.length === 0) {
    grid.innerHTML = renderEmptyStateCard({
      icon: 'users',
      title: 'No user accounts found',
      description: 'We couldn’t find any users matching your current role, verification, or search filters.',
      actionText: 'Reset Filters',
      actionFn: 'resetUserFilters()'
    });
    renderPaginationBar('users', 0, 'users-pagination');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Slice according to pagination
  const { page, limit } = paginationState.users;
  const pagedUsers = filtered.slice((page - 1) * limit, page * limit);

  grid.innerHTML = pagedUsers.map((user, idx) => {
    const isUserVerified = user.is_verified || user.verified_badge;
    const isUserPending = user.government_id_url && !user.is_verified && !user.verified_badge;
    
    let verifyBadgeHtml = '';
    if (isUserVerified) {
      verifyBadgeHtml = `<span class="badge-verify verified"><i data-lucide="check-circle-2"></i> Verified</span>`;
    } else if (isUserPending) {
      verifyBadgeHtml = `<span class="badge-verify pending"><i data-lucide="hourglass"></i> Pending Review</span>`;
    } else {
      verifyBadgeHtml = `<span class="badge-verify unverified"><i data-lucide="shield-alert"></i> Unverified</span>`;
    }

    const initials = (user.full_name || 'User').substring(0, 2).toUpperCase();
    const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="user-card animate-slide-up" style="animation-delay: ${Math.min(idx * 0.03, 0.3)}s;">
        <!-- Card selection checkbox for bulk action -->
        <label class="custom-checkbox-wrapper" style="position: absolute; top: 16px; right: 16px; z-index: 2;" title="Select user for bulk action">
          <input type="checkbox" class="user-select-chk" data-user-id="${user.id}"
            onchange="toggleUserSelection('${user.id}', this.checked)"
            ${selectedUserIds.has(user.id) ? 'checked' : ''}>
        </label>

        <div class="card-header-meta">
          <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
            ${!user.avatar_url ? initials : ''}
          </div>
          <div class="user-badge-container">
            <h4 class="user-display-name">${escapeHTML(user.full_name)}</h4>
            <span class="user-username">@${escapeHTML(user.username || 'unnamed')}</span>
          </div>
        </div>
        
        <div class="user-card-body">
          <div class="pills-row">
            <span class="badge-role ${user.role}">${user.role}</span>
            ${verifyBadgeHtml}
            ${user.vehicle ? `<span class="badge-role badge-vehicle">${escapeHTML(user.vehicle.model)}</span>` : ''}
          </div>

          ${user.gcash_number ? `
            <div class="user-gcash-box">
              <i data-lucide="wallet"></i>
              <span>GCash: <strong>${escapeHTML(user.gcash_number)}</strong> (${escapeHTML(user.gcash_name || user.full_name)})</span>
            </div>
          ` : ''}
        </div>
        
        <div class="rating-row">
          <i data-lucide="star"></i>
          <strong>${user.rating_avg ? user.rating_avg.toFixed(1) : '0.0'}</strong>
          <span>(${user.total_ratings || 0} reviews)</span>
        </div>
        
        <div class="card-footer">
          <span class="joined-text">Joined: ${joinedDate}</span>
          <button class="btn-card-action" onclick="openUserEditModal('${user.id}')">
            <i data-lucide="edit-3"></i>
            Manage
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Render pagination bar
  renderPaginationBar('users', filtered.length, 'users-pagination');
  updateBulkActionBar();

  if (window.lucide) lucide.createIcons();
}

// ═════ 3. VERIFICATION INBOX RENDERER ═════
function renderVerificationInbox() {
  const submissionsContainer = document.getElementById('inbox-submissions-list');
  const viewerContainer = document.getElementById('inbox-submission-viewer');
  if (!submissionsContainer || !viewerContainer) return;
  
  const pendingUsers = usersData.filter(u => u.government_id_url && !u.is_verified);

  if (selectedUserId && !pendingUsers.some(u => u.id === selectedUserId)) {
    selectedUserId = null;
  }

  if (pendingUsers.length === 0) {
    submissionsContainer.innerHTML = renderEmptyStateCard({
      icon: 'check-circle-2',
      title: 'Inbox Zero',
      description: 'All driver applications and ID documents have been reviewed!'
    });
    viewerContainer.innerHTML = `
      <div class="empty-viewer-state">
        <i data-lucide="eye" class="empty-viewer-icon"></i>
        <h3>Select a submission to review</h3>
        <p>Verify Government ID documents, cross-reference account credentials, inspect vehicle details, and approve accounts.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  submissionsContainer.innerHTML = pendingUsers.map(user => `
    <div class="submission-item ${selectedUserId === user.id ? 'active' : ''}" onclick="selectSubmission('${user.id}')">
      <div class="submission-item-meta">
        <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
          ${!user.avatar_url ? (user.full_name || 'U').substring(0, 2).toUpperCase() : ''}
        </div>
        <div class="submission-item-details">
          <h4>${escapeHTML(user.full_name)}</h4>
          <span>@${escapeHTML(user.username || 'unnamed')} • ${user.role}</span>
        </div>
      </div>
      <i data-lucide="chevron-right" class="text-dark"></i>
    </div>
  `).join('');

  if (!selectedUserId) {
    selectedUserId = pendingUsers[0].id;
  }

  const selectedUser = pendingUsers.find(u => u.id === selectedUserId);
  if (selectedUser) {
    viewerContainer.innerHTML = `
      <div class="viewer-header">
        <div class="viewer-user-profile">
          <div class="viewer-avatar" style="${selectedUser.avatar_url ? `background-image: url(${selectedUser.avatar_url})` : ''}">
            ${!selectedUser.avatar_url ? (selectedUser.full_name || 'U').substring(0, 2).toUpperCase() : ''}
          </div>
          <div class="viewer-meta">
            <h3>${escapeHTML(selectedUser.full_name)}</h3>
            <span>Username: @${escapeHTML(selectedUser.username || 'unnamed')} • ID: ${selectedUser.id}</span>
            <div class="viewer-pills">
              <span class="badge-role ${selectedUser.role}">${selectedUser.role}</span>
              <span class="badge-verify pending"><i data-lucide="hourglass"></i> Pending Approval</span>
              ${selectedUser.gcash_number ? `<span class="badge-role" style="background: rgba(0, 125, 254, 0.12); color: #007DFE;">GCash: ${selectedUser.gcash_number}</span>` : ''}
            </div>
          </div>
        </div>
      </div>

      ${selectedUser.vehicle ? `
        <div class="vehicle-info-box" style="margin-bottom: 16px;">
          <h4>Vehicle Details (Driver Application)</h4>
          <div class="vehicle-spec-grid">
            <div class="vehicle-spec-item"><span>Model:</span> <strong>${escapeHTML(selectedUser.vehicle.model || 'N/A')}</strong></div>
            <div class="vehicle-spec-item"><span>Plate Number:</span> <strong>${escapeHTML(selectedUser.vehicle.plate_number || 'N/A')}</strong></div>
            <div class="vehicle-spec-item"><span>Color:</span> <strong>${escapeHTML(selectedUser.vehicle.color || 'N/A')}</strong></div>
            <div class="vehicle-spec-item"><span>Capacity:</span> <strong>${selectedUser.vehicle.capacity || 1} seat(s)</strong></div>
          </div>
        </div>
      ` : ''}

      <div class="document-view-container">
        <div class="document-title">Uploaded Government Document / Driver's License</div>
        <div class="document-image-frame" onclick="openLightbox('${selectedUser.government_id_url}', '${escapeHTML(selectedUser.full_name)}\\'s Document')">
          <img src="${selectedUser.government_id_url}" alt="Government ID" onerror="handleImageLoadError(this)">
          <div class="image-zoom-overlay">
            <i data-lucide="maximize-2"></i>
            Click to expand and inspect
          </div>
        </div>
      </div>

      ${selectedUser.police_clearance_url ? `
        <div class="document-view-container" style="margin-top: 16px;">
          <div class="document-title" style="display: flex; align-items: center; gap: 6px; color: var(--accent-secondary, #0D9488);">
            <i data-lucide="shield-check" style="width: 16px; height: 16px;"></i> National Police Clearance (NPC)
          </div>
          <div class="document-image-frame" onclick="openLightbox('${selectedUser.police_clearance_url}', '${escapeHTML(selectedUser.full_name)}\\'s Police Clearance')">
            <img src="${selectedUser.police_clearance_url}" alt="Police Clearance" onerror="handleImageLoadError(this)">
            <div class="image-zoom-overlay">
              <i data-lucide="maximize-2"></i>
              Click to expand and inspect
            </div>
          </div>
        </div>
      ` : ''}

      <div class="viewer-actions-row">
        <button class="btn btn-danger" onclick="rejectVerification('${selectedUser.id}')">
          <i data-lucide="x-circle"></i>
          Reject Submission
        </button>
        <button class="btn btn-primary" onclick="approveVerification('${selectedUser.id}')">
          <i data-lucide="check-circle-2"></i>
          Approve Verification
        </button>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

function selectSubmission(userId) {
  selectedUserId = userId;
  renderVerificationInbox();
}

// APPROVE identity verification workflow
async function approveVerification(userId) {
  showLoading(true);
  try {
    // Execute live database update via RPC, fallback to direct update
    const { error: rpcErr } = await supabaseClient.rpc('admin_verify_user', {
      target_user_id: userId,
      approve: true
    });

    if (rpcErr) {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ is_verified: true, verified_badge: true })
        .eq('id', userId);
      if (error) throw error;
    }

    showToast(`Verification approved successfully.`, 'success');
    await refreshData();
  } catch (err) {
    console.error('Approve failed:', err);
    showToast(`Approval failed: ${err.message || 'Error occurred.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// REJECT identity verification workflow
async function rejectVerification(userId) {
  showLoading(true);
  try {
    const { error: rpcErr } = await supabaseClient.rpc('admin_verify_user', {
      target_user_id: userId,
      approve: false
    });

    if (rpcErr) {
      const { error } = await supabaseClient
        .from('profiles')
        .update({ government_id_url: null, is_verified: false, verified_badge: false })
        .eq('id', userId);
      if (error) throw error;
    }

    showToast(`ID Submission rejected. User record reset.`, 'success');
    await refreshData();
  } catch (err) {
    console.error('Reject failed:', err);
    showToast(`Rejection failed: ${err.message || 'Error occurred.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// ═════ 4. TRIPS & RIDES RENDERER ═════
function setTripFilter(status) {
  filterTrip = status;
  paginationState.trips.page = 1;
  document.querySelectorAll('#filter-trip-all, #filter-trip-open, #filter-trip-ongoing, #filter-trip-completed, #filter-trip-cancelled').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`filter-trip-${status}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderTripsManagement();
}

function handleTripSearch(val) {
  tripSearchText = val.trim().toLowerCase();
  paginationState.trips.page = 1;
  renderTripsManagement();
}

function renderTripsManagement() {
  const grid = document.getElementById('trips-grid');
  if (!grid) return;

  let filtered = tripsData.filter(trip => {
    const matchStatus = filterTrip === 'all' || trip.status === filterTrip;
    const matchSearch = !tripSearchText ||
      (trip.origin_label && trip.origin_label.toLowerCase().includes(tripSearchText)) ||
      (trip.destination_label && trip.destination_label.toLowerCase().includes(tripSearchText)) ||
      (trip.driver && trip.driver.full_name && trip.driver.full_name.toLowerCase().includes(tripSearchText)) ||
      trip.id.includes(tripSearchText);

    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = renderEmptyStateCard({
      icon: 'map-pin-off',
      title: 'No carpool trips found',
      description: 'No trips match the selected status filter or origin/destination search query.',
      actionText: 'Reset Filters',
      actionFn: 'resetTripFilters()'
    });
    renderPaginationBar('trips', 0, 'trips-pagination');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Slice according to pagination
  const { page, limit } = paginationState.trips;
  const pagedTrips = filtered.slice((page - 1) * limit, page * limit);

  grid.innerHTML = pagedTrips.map(trip => {
    const depDate = new Date(trip.departure_time);
    const timeString = depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = depDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return `
      <div class="trip-card animate-slide-up">
        <div class="trip-card-header">
          <div class="trip-driver-info">
            <div class="user-avatar" style="${trip.driver?.avatar_url ? `background-image: url(${trip.driver.avatar_url})` : ''}">
              ${!trip.driver?.avatar_url ? (trip.driver?.full_name || 'D').substring(0, 2).toUpperCase() : ''}
            </div>
            <div>
              <h4 style="font-size: 14px; font-weight: 600; color: var(--text-title);">${escapeHTML(trip.driver?.full_name || 'Driver')}</h4>
              <span style="font-size: 11px; color: var(--text-muted);">${trip.vehicle ? `${trip.vehicle.model} • ${trip.vehicle.plate_number}` : 'Car'}</span>
            </div>
          </div>
          <span class="badge-trip-status badge-trip-${trip.status}">${trip.status}</span>
        </div>

        <div class="trip-route-box">
          <div class="trip-route-stop">
            <div class="trip-route-dot pickup"></div>
            <span class="trip-route-text" title="${escapeHTML(trip.origin_label)}">${escapeHTML(trip.origin_label)}</span>
          </div>
          <div class="trip-route-stop">
            <div class="trip-route-dot dropoff"></div>
            <span class="trip-route-text" title="${escapeHTML(trip.destination_label)}">${escapeHTML(trip.destination_label)}</span>
          </div>
        </div>

        <div class="trip-meta-grid">
          <div class="trip-meta-item">
            <span class="trip-meta-label">Departure</span>
            <span class="trip-meta-val">${dateString} • ${timeString}</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Fare / Seat</span>
            <span class="trip-meta-val" style="color: var(--accent-secondary);">${trip.fare_per_seat === 0 ? 'FREE' : formatCurrency(trip.fare_per_seat)}</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Available Seats</span>
            <span class="trip-meta-val">${trip.available_seats} remaining</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Bookings</span>
            <span class="trip-meta-val">${trip.bookings?.length || 0} passengers</span>
          </div>
        </div>

        <div class="trip-card-actions">
          <button class="btn btn-secondary btn-small" onclick="openTripDetailModal('${trip.id}')">
            <i data-lucide="info"></i>
            Inspect Trip
          </button>
          ${trip.status === 'open' || trip.status === 'ongoing' ? `
            <button class="btn btn-danger btn-small" onclick="adminCancelTrip('${trip.id}')">
              <i data-lucide="slash"></i>
              Cancel Trip
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  renderPaginationBar('trips', filtered.length, 'trips-pagination');
  if (window.lucide) lucide.createIcons();
}

// Cancel trip admin action
async function adminCancelTrip(tripId) {
  if (!confirm('Are you sure you want to cancel this trip as Admin? This will mark all bookings as cancelled.')) {
    return;
  }

  showLoading(true);
  try {
    const { error: rpcErr } = await supabaseClient.rpc('admin_cancel_trip', { target_trip_id: tripId });
    if (rpcErr) {
      const { error } = await supabaseClient.from('trips').update({ status: 'cancelled' }).eq('id', tripId);
      if (error) throw error;
    }
    showToast('Trip cancelled successfully in database.', 'success');
    await refreshData();
  } catch (err) {
    console.error('Cancel trip failed:', err);
    showToast(`Cancel failed: ${err.message || 'Error occurred'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// Open Trip Details Modal
function openTripDetailModal(tripId) {
  const trip = tripsData.find(t => t.id === tripId);
  if (!trip) return;

  const modal = document.getElementById('trip-detail-modal');
  const body = document.getElementById('trip-modal-body');
  
  const tripBookings = bookingsData.filter(b => b.trip_id === trip.id);

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="color: var(--text-title); font-size: 16px;">${escapeHTML(trip.driver?.full_name || 'Driver')}</h4>
          <span style="font-size: 12px; color: var(--text-muted);">${trip.driver?.gcash_number ? `GCash: ${trip.driver.gcash_number}` : 'No GCash configured'}</span>
        </div>
        <span class="badge-trip-status badge-trip-${trip.status}">${trip.status}</span>
      </div>

      <div class="trip-route-box">
        <div class="trip-route-stop">
          <div class="trip-route-dot pickup"></div>
          <span class="trip-route-text"><strong>Pickup:</strong> ${escapeHTML(trip.origin_label)}</span>
        </div>
        <div class="trip-route-stop">
          <div class="trip-route-dot dropoff"></div>
          <span class="trip-route-text"><strong>Drop-off:</strong> ${escapeHTML(trip.destination_label)}</span>
        </div>
      </div>

      <div class="trip-meta-grid">
        <div class="trip-meta-item"><span>Fare per seat:</span> <strong>${formatCurrency(trip.fare_per_seat)}</strong></div>
        <div class="trip-meta-item"><span>Seats left:</span> <strong>${trip.available_seats}</strong></div>
      </div>

      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: var(--text-title); margin-bottom: 8px;">Booked Commuters (${tripBookings.length})</h5>
        ${tripBookings.length === 0 ? '<p style="color: var(--text-muted); font-size: 12px;">No bookings recorded yet.</p>' : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${tripBookings.map(b => `
              <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 13px; font-weight: 600; color: var(--text-title);">${escapeHTML(b.commuter?.full_name || 'Passenger')}</span>
                  <span style="font-size: 11px; color: var(--text-muted);">(${b.seats_booked} seat)</span>
                  ${b.is_reservation ? '<span class="badge-gcash-reservation" style="font-size: 10px; padding: 2px 6px;">Reserved (₱' + (b.reservation_fee || 0) + ')</span>' : ''}
                </div>
                <span class="badge-payment-status badge-pay-${b.payment_status || 'unpaid'}">${b.status}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeTripDetailModal() {
  document.getElementById('trip-detail-modal').classList.remove('active');
}

// ═════ 5. BOOKINGS & GCASH RENDERER ═════
function setBookingFilter(type) {
  filterBooking = type;
  paginationState.bookings.page = 1;
  document.querySelectorAll('#filter-booking-all, #filter-booking-reservations, #filter-booking-standard').forEach(btn => btn.classList.remove('active'));
  if (type === 'all') document.getElementById('filter-booking-all').classList.add('active');
  if (type === 'reservation') document.getElementById('filter-booking-reservations').classList.add('active');
  if (type === 'standard') document.getElementById('filter-booking-standard').classList.add('active');
  renderBookingsManagement();
}

function setPaymentFilter(status) {
  filterPayment = status;
  paginationState.bookings.page = 1;
  document.querySelectorAll('#filter-pay-all, #filter-pay-submitted, #filter-pay-verified, #filter-pay-unpaid').forEach(btn => btn.classList.remove('active'));
  const btn = document.getElementById(`filter-pay-${status}`);
  if (btn) btn.classList.add('active');
  renderBookingsManagement();
}

function renderBookingsManagement() {
  const grid = document.getElementById('bookings-grid');
  if (!grid) return;

  let filtered = bookingsData.filter(b => {
    let matchType = true;
    if (filterBooking === 'reservation') matchType = b.is_reservation === true;
    if (filterBooking === 'standard') matchType = !b.is_reservation;

    let matchPay = true;
    if (filterPayment !== 'all') matchPay = (b.payment_status || 'unpaid') === filterPayment;

    return matchType && matchPay;
  });

  if (filtered.length === 0) {
    grid.innerHTML = renderEmptyStateCard({
      icon: 'wallet',
      title: 'No bookings found',
      description: 'No passenger bookings or GCash seat reservations match your current filter criteria.',
      actionText: 'Reset Filters',
      actionFn: 'resetBookingFilters()'
    });
    renderPaginationBar('bookings', 0, 'bookings-pagination');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Slice according to pagination
  const { page, limit } = paginationState.bookings;
  const pagedBookings = filtered.slice((page - 1) * limit, page * limit);

  grid.innerHTML = pagedBookings.map(booking => {
    const isReservation = booking.is_reservation;
    const paymentStatus = booking.payment_status || 'unpaid';

    return `
      <div class="booking-card ${isReservation ? 'reservation-highlight' : ''} animate-slide-up">
        <div class="booking-card-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="user-avatar" style="${booking.commuter?.avatar_url ? `background-image: url(${booking.commuter.avatar_url})` : ''}">
              ${!booking.commuter?.avatar_url ? (booking.commuter?.full_name || 'P').substring(0, 2).toUpperCase() : ''}
            </div>
            <div>
              <h4 style="font-size: 14px; font-weight: 600; color: var(--text-title);">${escapeHTML(booking.commuter?.full_name || 'Commuter')}</h4>
              <span style="font-size: 11px; color: var(--text-muted);">${booking.seats_booked || 1} seat(s) booked</span>
            </div>
          </div>
          <span class="badge-role" style="text-transform: capitalize;">${booking.status}</span>
        </div>

        <div class="booking-pills-row">
          ${isReservation ? `
            <span class="badge-gcash-reservation">
              <i data-lucide="wallet"></i>
              GCash Seat Reservation (₱${booking.reservation_fee || 0})
            </span>
          ` : `
            <span class="badge-role commuter">Standard Cash</span>
          `}
          <span class="badge-payment-status badge-pay-${paymentStatus}">
            Payment: ${paymentStatus}
          </span>
        </div>

        <div class="trip-meta-grid">
          <div class="trip-meta-item">
            <span class="trip-meta-label">Total Fare</span>
            <span class="trip-meta-val">${formatCurrency(booking.fare_paid || 0)}</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Platform Fee (10%)</span>
            <span class="trip-meta-val" style="color: var(--accent-secondary);">${formatCurrency(booking.platform_fee || ((booking.fare_paid || 0) * 0.1))}</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Ride Driver</span>
            <span class="trip-meta-val">${escapeHTML(booking.trip?.driver?.full_name || 'Driver')}</span>
          </div>
          <div class="trip-meta-item">
            <span class="trip-meta-label">Deposit Amount</span>
            <span class="trip-meta-val" style="color: #007DFE;">₱${booking.reservation_fee || 0}</span>
          </div>
        </div>

        ${booking.payment_proof_url ? `
          <div class="receipt-preview-banner" onclick="openLightbox('${booking.payment_proof_url}', 'GCash Receipt - ${escapeHTML(booking.commuter?.full_name || 'Commuter')}', '${booking.id}')">
            <div class="receipt-preview-left">
              <img src="${booking.payment_proof_url}" class="receipt-thumb-img" alt="Receipt">
              <div>
                <strong style="color: #007DFE; font-size: 12px; display: block;">View GCash Receipt Proof</strong>
                <span style="color: var(--text-muted); font-size: 11px;">Tap to open full receipt verification</span>
              </div>
            </div>
            <i data-lucide="chevron-right" style="color: #007DFE; width: 16px;"></i>
          </div>
        ` : ''}

        <div class="trip-card-actions">
          <span style="font-size: 11px; color: var(--text-dark);">Booked: ${new Date(booking.created_at).toLocaleDateString()}</span>
          ${isReservation && paymentStatus !== 'verified' ? `
            <button class="btn btn-primary btn-small" onclick="adminVerifyPayment('${booking.id}', 'verified')">
              <i data-lucide="check-circle-2"></i>
              Verify GCash Payment
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  renderPaginationBar('bookings', filtered.length, 'bookings-pagination');
  if (window.lucide) lucide.createIcons();
}

// Verify booking payment admin action
async function adminVerifyPayment(bookingId, newStatus) {
  showLoading(true);
  try {
    const { error: rpcErr } = await supabaseClient.rpc('admin_verify_booking_payment', {
      target_booking_id: bookingId,
      new_status: newStatus
    });

    if (rpcErr) {
      const { error } = await supabaseClient.from('bookings').update({ payment_status: newStatus }).eq('id', bookingId);
      if (error) throw error;
    }

    showToast(`GCash payment marked as ${newStatus} in database.`, 'success');
    closeLightbox();
    await refreshData();
  } catch (err) {
    console.error('Verify payment failed:', err);
    showToast(`Action failed: ${err.message || 'Error occurred'}`, 'error');
  } finally {
    showLoading(false);
  }
}



// ═════ 6. COMMUNITY HUB MODERATION ═════
function handleHubSearch(val) {
  hubSearchText = val.trim().toLowerCase();
  paginationState.hub.page = 1;
  renderHubModeration();
}

function handleHubFilterStatus(val) {
  hubFilterStatus = val;
  paginationState.hub.page = 1;
  renderHubModeration();
}

// Render Community Hub Moderation Tab
function renderHubModeration() {
  const container = document.getElementById('hub-posts-grid');
  if (!container) return;

  let filtered = hubPostsData.filter(post => {
    const text = (post.message || post.content || '').toLowerCase();
    const authorName = (post.author?.full_name || '').toLowerCase();
    const tag = (post.status_tag || '').toLowerCase();
    const matchesSearch = !hubSearchText || text.includes(hubSearchText) || authorName.includes(hubSearchText) || tag.includes(hubSearchText);
    const matchesStatus = hubFilterStatus === 'all' || (hubFilterStatus === 'reported' && post.reports && post.reports.length > 0);
    return matchesSearch && matchesStatus;
  });

  // Prioritize reported posts so the admin immediately sees flagged content
  filtered.sort((a, b) => {
    const aRep = a.reports && a.reports.length > 0 ? 1 : 0;
    const bRep = b.reports && b.reports.length > 0 ? 1 : 0;
    if (aRep !== bRep) return bRep - aRep;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  if (filtered.length === 0) {
    container.innerHTML = renderEmptyStateCard({
      icon: 'message-square-off',
      title: hubFilterStatus === 'reported' ? 'No reported posts pending review!' : 'No community posts found',
      description: hubFilterStatus === 'reported' ? 'All user flags have been resolved or dismissed.' : 'No discussions match your filter or search query.',
      actionText: 'Reset Filters',
      actionFn: 'resetHubFilters()'
    });
    renderPaginationBar('hub', 0, 'hub-pagination');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Slice according to pagination
  const { page, limit } = paginationState.hub;
  const pagedPosts = filtered.slice((page - 1) * limit, page * limit);

  container.innerHTML = pagedPosts.map(post => {
    const isReported = post.reports && post.reports.length > 0;
    const bodyText = post.message || post.content || '';
    const images = post.image_urls || [];
    
    return `
    <div class="hub-card animate-slide-up" style="${isReported ? 'border: 1.5px solid #EF4444;' : ''}">
      ${isReported ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 6px; color: #DC2626; font-size: 12px; font-weight: 600;">
            <i data-lucide="flag" style="width: 14px; height: 14px;"></i>
            <span>Reported by ${post.uniqueReportCount || new Set(post.reports.map(r => r.reporter_id)).size} user(s) (${post.reports.length} report${post.reports.length === 1 ? '' : 's'}): ${post.reports.map(r => escapeHTML(r.reason)).join('; ')}</span>
          </div>
          <button class="btn btn-secondary btn-small" onclick="adminDismissReports('${post.id}')" title="Dismiss reports and mark as reviewed" style="font-size: 11px; padding: 4px 8px; flex-shrink: 0;">
            <i data-lucide="check-check" style="width: 12px; height: 12px;"></i> Dismiss
          </button>
        </div>
      ` : ''}

      <div class="hub-author-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="user-avatar" style="${post.author?.avatar_url ? `background-image: url(${post.author.avatar_url})` : ''}">
            ${!post.author?.avatar_url ? (post.author?.full_name || 'A').substring(0, 2).toUpperCase() : ''}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <h4 style="font-size: 14px; font-weight: 600; color: var(--text-title);">${escapeHTML(post.author?.full_name || 'Community Member')}</h4>
              ${post.is_pinned ? `<span style="font-size: 10px; background: rgba(13, 148, 136, 0.15); color: #0D9488; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Pinned</span>` : ''}
              ${post.trip_id ? `<span style="font-size: 10px; background: rgba(2, 132, 199, 0.15); color: #0284C7; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Attached Ride</span>` : ''}
            </div>
            <span style="font-size: 11px; color: var(--text-muted);">@${escapeHTML(post.author?.username || 'member')} • ${post.author?.role || 'user'}</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          ${post.status_tag ? `
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 600; background: var(--bg-card-subtle); color: var(--text-title); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border-subtle);">
              ${escapeHTML(post.status_tag)}
            </span>
          ` : ''}
          <button class="btn btn-danger btn-small" onclick="adminDeleteHubPost('${post.id}')" title="Delete inappropriate post">
            <i data-lucide="trash-2"></i>
            Delete
          </button>
        </div>
      </div>

      <p class="hub-content-body" style="margin: 10px 0; font-size: 14px; line-height: 1.5; color: var(--text-title);">${escapeHTML(bodyText)}</p>

      ${images.length > 0 ? `
        <div style="display: flex; gap: 10px; margin: 10px 0;">
          ${images.map(url => `
            <img src="${url}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 1px solid var(--border-subtle); cursor: pointer;" onclick="openLightbox('${url}', 'Attached Post Image')" title="Click to view full image" />
          `).join('')}
        </div>
      ` : ''}

      <div class="hub-footer-meta" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted);">
        <span>${post.location_label ? `<i data-lucide="map-pin" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle;"></i> ${escapeHTML(post.location_label)}` : ''}</span>
        <span>Posted: ${new Date(post.created_at).toLocaleDateString()}</span>
      </div>
    </div>
    `;
  }).join('');

  renderPaginationBar('hub', filtered.length, 'hub-pagination');
  if (window.lucide) lucide.createIcons();
}

// ═════ CONFIRMATION MODAL SYSTEM ═════
let confirmActionCallback = null;

function showConfirmModal({ title, message, confirmText = 'Confirm', isDanger = true, onConfirm }) {
  const modal = document.getElementById('confirm-dialog-modal');
  if (!modal) {
    if (confirm(message)) {
      onConfirm();
    }
    return;
  }

  document.getElementById('confirm-dialog-title').innerText = title;
  document.getElementById('confirm-dialog-message').innerText = message;
  
  const actionBtn = document.getElementById('btn-confirm-dialog-action');
  actionBtn.innerText = confirmText;
  actionBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
  
  confirmActionCallback = onConfirm;
  
  actionBtn.onclick = async () => {
    const callbackToRun = confirmActionCallback;
    closeConfirmModal();
    if (callbackToRun) {
      try {
        await callbackToRun();
      } catch (err) {
        console.error('Confirm action execution error:', err);
      }
    }
  };

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeConfirmModal() {
  const modal = document.getElementById('confirm-dialog-modal');
  if (modal) modal.classList.remove('active');
  confirmActionCallback = null;
}

// Dismiss/Resolve reports for a post
function adminDismissReports(postId) {
  showConfirmModal({
    title: 'Dismiss Post Reports',
    message: 'Are you sure you want to mark all pending reports for this post as reviewed and dismissed? The post will stay in the community feed.',
    confirmText: 'Dismiss Reports',
    isDanger: false,
    onConfirm: async () => {
      showLoading(true);
      try {
        // 1. Update status to dismissed
        const { error: updateErr } = await supabaseClient
          .from('reports')
          .update({ status: 'dismissed' })
          .eq('post_id', postId);

        // 2. If update failed, delete the reports directly
        if (updateErr) {
          console.warn('Update report status failed, falling back to delete:', updateErr);
          const { error: delErr } = await supabaseClient
            .from('reports')
            .delete()
            .eq('post_id', postId);
          if (delErr) throw delErr;
        }

        // 3. Optimistically update local data immediately
        reportsData = reportsData.filter(r => r.post_id !== postId);
        hubPostsData.forEach(p => {
          if (p.id === postId) p.reports = [];
        });
        updateUI();

        showToast('Reports marked as dismissed.', 'success');
        await refreshData();
      } catch (err) {
        console.error('Dismiss report error:', err);
        showToast(`Dismiss failed: ${err.message}`, 'error');
        await refreshData();
      } finally {
        showLoading(false);
      }
    }
  });
}

// Delete hub post admin action
function adminDeleteHubPost(postId) {
  const post = hubPostsData.find(p => p.id === postId);
  const snippet = post?.message ? `"${post.message.substring(0, 50)}${post.message.length > 50 ? '...' : ''}"` : 'this post';

  showConfirmModal({
    title: 'Delete Community Hub Post',
    message: `Are you sure you want to permanently delete ${snippet}? All comments, likes, and reports attached to this post will also be deleted from the database.`,
    confirmText: 'Permanently Delete',
    isDanger: true,
    onConfirm: async () => {
      showLoading(true);
      try {
        // 1. Delete associated reports first to ensure clean cascade
        await supabaseClient.from('reports').delete().eq('post_id', postId);

        // 2. Call RPC to delete post
        const { error: rpcErr } = await supabaseClient.rpc('admin_delete_hub_post', { target_post_id: postId });

        // 3. Direct table delete to ensure post is deleted even if RPC had any issue
        const { error: directErr } = await supabaseClient.from('hub_posts').delete().eq('id', postId);

        if (rpcErr && directErr) {
          throw directErr || rpcErr;
        }

        // 4. Optimistic local update so UI removes the card immediately
        hubPostsData = hubPostsData.filter(p => p.id !== postId);
        reportsData = reportsData.filter(r => r.post_id !== postId);
        updateUI();

        showToast('Community post deleted from database.', 'success');
        await refreshData();
      } catch (err) {
        console.error('Delete hub post failed:', err);
        showToast(`Delete failed: ${err.message || 'Error occurred'}`, 'error');
        await refreshData();
      } finally {
        showLoading(false);
      }
    }
  });
}

// ═════ USER EDIT / DETAIL MODAL ═════
function openUserEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-full-name').value = user.full_name || '';
  document.getElementById('edit-username').value = user.username || '';
  document.getElementById('edit-role').value = user.role || 'commuter';
  document.getElementById('edit-rating').value = user.rating_avg || 0;
  
  document.getElementById('edit-gcash-number').value = user.gcash_number || '';
  document.getElementById('edit-gcash-name').value = user.gcash_name || '';

  document.getElementById('edit-is-verified').checked = !!user.is_verified;
  document.getElementById('edit-verified-badge').checked = !!user.verified_badge;

  // Display vehicle info if driver
  handleRoleChange(user.role);
  const vehicleBox = document.getElementById('modal-vehicle-section');
  const vehicleDetails = document.getElementById('modal-vehicle-details');
  if (user.vehicle) {
    vehicleBox.style.display = 'block';
    vehicleDetails.innerHTML = `
      <div class="vehicle-spec-grid">
        <div class="vehicle-spec-item"><span>Model:</span> <strong>${escapeHTML(user.vehicle.model || 'N/A')}</strong></div>
        <div class="vehicle-spec-item"><span>Plate:</span> <strong>${escapeHTML(user.vehicle.plate_number || 'N/A')}</strong></div>
        <div class="vehicle-spec-item"><span>Type:</span> <strong>${escapeHTML(user.vehicle.type || 'N/A')}</strong></div>
        <div class="vehicle-spec-item"><span>Color:</span> <strong>${escapeHTML(user.vehicle.color || 'N/A')}</strong></div>
      </div>
    `;
  } else {
    vehicleBox.style.display = 'none';
  }

  updateModalIdPreview(user.government_id_url);
  document.getElementById('user-edit-modal').classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function handleRoleChange(role) {
  const vehicleBox = document.getElementById('modal-vehicle-section');
  if (role === 'driver') {
    const userId = document.getElementById('edit-user-id').value;
    const user = usersData.find(u => u.id === userId);
    if (user?.vehicle) vehicleBox.style.display = 'block';
  } else {
    vehicleBox.style.display = 'none';
  }
}

function closeUserEditModal() {
  document.getElementById('user-edit-modal').classList.remove('active');
}

function updateModalIdPreview(url) {
  const frame = document.getElementById('edit-id-preview-container');
  const clearBtn = document.getElementById('btn-clear-id');
  
  if (url) {
    frame.innerHTML = `<img id="edit-id-image" src="${url}" alt="Document" onerror="handleImageLoadError(this)">`;
    clearBtn.style.display = 'flex';
  } else {
    frame.innerHTML = `
      <div class="document-placeholder">
        <i data-lucide="file-text"></i>
        <p>No document submitted</p>
      </div>
    `;
    clearBtn.style.display = 'none';
    if (window.lucide) lucide.createIcons();
  }
}

function clearGovernmentId() {
  updateModalIdPreview(null);
}

async function saveUserProfile() {
  const userId = document.getElementById('edit-user-id').value;
  const fullName = document.getElementById('edit-full-name').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const role = document.getElementById('edit-role').value;
  const rating = parseFloat(document.getElementById('edit-rating').value) || 0;
  const gcashNumber = document.getElementById('edit-gcash-number').value.trim();
  const gcashName = document.getElementById('edit-gcash-name').value.trim();
  const isVerified = document.getElementById('edit-is-verified').checked;
  const verifiedBadge = document.getElementById('edit-verified-badge').checked;

  const idImgElement = document.getElementById('edit-id-image');
  const governmentIdUrl = idImgElement ? idImgElement.src : null;

  if (!fullName) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  showLoading(true);
  try {
    const { error: rpcErr } = await supabaseClient.rpc('admin_update_profile', {
      target_user_id: userId,
      new_full_name: fullName,
      new_username: username || null,
      new_role: role,
      new_rating: rating,
      new_is_verified: isVerified,
      new_verified_badge: verifiedBadge,
      new_government_id_url: governmentIdUrl,
      new_gcash_number: gcashNumber || null,
      new_gcash_name: gcashName || null
    });

    if (rpcErr) {
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          full_name: fullName,
          username: username || null,
          role,
          rating_avg: rating,
          is_verified: isVerified,
          verified_badge: verifiedBadge,
          government_id_url: governmentIdUrl,
          gcash_number: gcashNumber || null,
          gcash_name: gcashName || null
        })
        .eq('id', userId);
      if (error) throw error;
    }
    
    showToast('User details updated successfully in database.', 'success');
    closeUserEditModal();
    await refreshData();
  } catch (err) {
    console.error('Update profile failed:', err);
    showToast(`Update failed: ${err.message || 'Error occurred.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

async function deleteUserProfile() {
  const userId = document.getElementById('edit-user-id').value;
  const fullName = document.getElementById('edit-full-name').value;
  
  if (!confirm(`Are you absolutely sure you want to delete account: ${fullName}? All linked records will be affected.`)) {
    return;
  }

  showLoading(true);
  try {
    const { error: rpcErr } = await supabaseClient.rpc('admin_delete_user', { target_user_id: userId });
    if (rpcErr) {
      const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
      if (error) throw error;
    }
    showToast('Profile deleted successfully from database.', 'success');
    closeUserEditModal();
    await refreshData();
  } catch (err) {
    console.error('Delete failed:', err);
    showToast(`Delete failed: ${err.message || 'Error occurred.'}`, 'error');
  } finally {
    showLoading(false);
  }
}


// ═════ LIGHTBOX MODAL ═════
function openLightbox(url, caption, bookingId = null) {
  if (!url) return;
  const modal = document.getElementById('lightbox-modal');
  document.getElementById('lightbox-image').src = url;
  document.getElementById('lightbox-caption').innerText = caption;

  const actionsContainer = document.getElementById('lightbox-actions-container');
  if (bookingId) {
    actionsContainer.innerHTML = `
      <button class="btn btn-primary" onclick="adminVerifyPayment('${bookingId}', 'verified')">
        <i data-lucide="check-circle-2"></i>
        Verify Payment
      </button>
      <button class="btn btn-danger" onclick="adminVerifyPayment('${bookingId}', 'unpaid')">
        <i data-lucide="x-circle"></i>
        Reject Payment
      </button>
    `;
  } else {
    actionsContainer.innerHTML = '';
  }

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.remove('active');
}

function handleLightboxClick(e) {
  if (e.target.id === 'lightbox-modal') {
    closeLightbox();
  }
}

function handleImageLoadError(img) {
  img.style.display = 'none';
  const parent = img.parentNode;
  if (!parent.querySelector('.document-placeholder')) {
    const placeholder = document.createElement('div');
    placeholder.className = 'document-placeholder';
    placeholder.innerHTML = `
      <i data-lucide="image-off"></i>
      <p>Failed to load image.<br><small style="color: var(--text-dark)">Invalid image URL or access denied.</small></p>
    `;
    parent.appendChild(placeholder);
    if (window.lucide) lucide.createIcons();
  }
}

// ═════ TOAST NOTIFICATIONS ═════
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'check-circle';
  if (type === 'error') iconName = 'x-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${escapeHTML(message)}</span>
  `;
  
  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();
  
  setTimeout(() => toast.classList.add('active'), 10);
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

function showLoading(isLoading) {
  const saveBtn = document.getElementById('btn-save-user');
  const deleteBtn = document.getElementById('btn-delete-profile');
  if (saveBtn) saveBtn.disabled = isLoading;
  if (deleteBtn) deleteBtn.disabled = isLoading;
}

// Format Utilities
function formatCurrency(amount) {
  return '₱' + Number(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ═════ ADMIN REALTIME NOTIFICATIONS & AUDIO ═════
let adminRealtimeChannel = null;
let titleFlashInterval = null;

function setupAdminRealtime() {
  if (!supabaseClient) return;

  if (adminRealtimeChannel) {
    try {
      supabaseClient.removeChannel(adminRealtimeChannel);
    } catch (e) {}
  }

  try {
    adminRealtimeChannel = supabaseClient
      .channel('admin_live_moderation')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        async (payload) => {
          console.log('[Admin Realtime] New report received:', payload.new);
          const reason = payload.new?.reason || 'Safety / Moderation issue';
          playNotificationSound();
          showToast(`🚨 Moderation Alert: New report submitted! (${reason})`, 'warning');
          flashDocumentTitle('⚠️ New Report Alert!');
          await refreshData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hub_posts' },
        async (payload) => {
          console.log('[Admin Realtime] New hub post:', payload.new);
          showToast('💬 New Community Hub post published.', 'info');
          await refreshData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'hub_posts' },
        async (payload) => {
          await refreshData();
        }
      )
      .subscribe((status) => {
        console.log('[Admin Realtime] Channel subscription status:', status);
      });
  } catch (err) {
    console.error('[Admin Realtime] Setup failed:', err);
  }
}

function playNotificationSound() {
  if (!soundAlertsEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

function flashDocumentTitle(alertText) {
  if (titleFlashInterval) clearInterval(titleFlashInterval);
  const originalTitle = 'Commute Companion - Admin Control Portal';
  let isAlert = true;
  let count = 0;
  titleFlashInterval = setInterval(() => {
    document.title = isAlert ? alertText : originalTitle;
    isAlert = !isAlert;
    count++;
    if (count > 8) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
      document.title = originalTitle;
    }
  }, 1000);
}

// ════════════════════════════════════════════════════════════════
// NEW UX/UI HELPERS: EMPTY STATES, PAGINATION, BULK, EXPORT, SHORTCUTS
// ════════════════════════════════════════════════════════════════

// Rich Empty State Card Generator
function renderEmptyStateCard({ icon = 'search', title = 'No results found', description = 'Try adjusting your filters.', actionText, actionFn }) {
  return `
    <div class="empty-state-card animate-fade-in">
      <div class="empty-icon-wrap">
        <i data-lucide="${icon}"></i>
      </div>
      <h4>${escapeHTML(title)}</h4>
      <p>${escapeHTML(description)}</p>
      ${actionText && actionFn ? `
        <button class="btn btn-secondary btn-small" onclick="${actionFn}" style="margin-top: 6px;">
          <i data-lucide="rotate-ccw"></i>
          <span>${escapeHTML(actionText)}</span>
        </button>
      ` : ''}
    </div>
  `;
}

// Pagination Bar Component
function renderPaginationBar(tabKey, totalCount, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const state = paginationState[tabKey];
  if (!state) return;

  const totalPages = Math.ceil(totalCount / state.limit) || 1;
  if (state.page > totalPages) state.page = totalPages;
  if (state.page < 1) state.page = 1;

  if (totalCount === 0) {
    container.innerHTML = '';
    return;
  }

  const startRecord = (state.page - 1) * state.limit + 1;
  const endRecord = Math.min(state.page * state.limit, totalCount);

  let pageButtonsHtml = '';
  const maxButtons = 5;
  let startPage = Math.max(1, state.page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    pageButtonsHtml += `<button class="pagination-btn" onclick="changePage('${tabKey}', 1)">1</button>`;
    if (startPage > 2) pageButtonsHtml += `<span style="padding: 0 4px; color: var(--text-dark);">...</span>`;
  }

  for (let p = startPage; p <= endPage; p++) {
    pageButtonsHtml += `
      <button class="pagination-btn ${p === state.page ? 'active' : ''}" onclick="changePage('${tabKey}', ${p})">
        ${p}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) pageButtonsHtml += `<span style="padding: 0 4px; color: var(--text-dark);">...</span>`;
    pageButtonsHtml += `<button class="pagination-btn" onclick="changePage('${tabKey}', ${totalPages})">${totalPages}</button>`;
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing <strong>${startRecord}–${endRecord}</strong> of <strong>${totalCount}</strong> records
    </div>
    <div class="pagination-controls">
      <button class="pagination-btn" onclick="changePage('${tabKey}', ${state.page - 1})" ${state.page <= 1 ? 'disabled' : ''} title="Previous Page">
        <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
      </button>
      ${pageButtonsHtml}
      <button class="pagination-btn" onclick="changePage('${tabKey}', ${state.page + 1})" ${state.page >= totalPages ? 'disabled' : ''} title="Next Page">
        <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
      </button>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function changePage(tabKey, newPage) {
  if (paginationState[tabKey]) {
    paginationState[tabKey].page = newPage;
    if (tabKey === 'users') renderUserDirectory();
    else if (tabKey === 'trips') renderTripsManagement();
    else if (tabKey === 'bookings') renderBookingsManagement();
    else if (tabKey === 'hub') renderHubModeration();

    const mainView = document.querySelector('.content-view');
    if (mainView) mainView.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Bulk Actions for Users
function toggleUserSelection(userId, isChecked) {
  if (isChecked) {
    selectedUserIds.add(userId);
  } else {
    selectedUserIds.delete(userId);
  }
  updateBulkActionBar();
}

function handleSelectAllUsers(isChecked) {
  const checkboxes = document.querySelectorAll('.user-select-chk');
  checkboxes.forEach(chk => {
    chk.checked = isChecked;
    const uid = chk.getAttribute('data-user-id');
    if (uid) {
      if (isChecked) selectedUserIds.add(uid);
      else selectedUserIds.delete(uid);
    }
  });
  updateBulkActionBar();
}

function updateBulkActionBar() {
  const bar = document.getElementById('user-bulk-bar');
  const countSpan = document.getElementById('bulk-selected-count');
  if (!bar) return;

  const count = selectedUserIds.size;
  if (countSpan) countSpan.textContent = count;

  if (count > 0) {
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
    const selectAllChk = document.getElementById('user-select-all');
    if (selectAllChk) selectAllChk.checked = false;
  }
  if (window.lucide) lucide.createIcons();
}

function clearUserSelection() {
  selectedUserIds.clear();
  document.querySelectorAll('.user-select-chk').forEach(c => c.checked = false);
  const selectAllChk = document.getElementById('user-select-all');
  if (selectAllChk) selectAllChk.checked = false;
  updateBulkActionBar();
}

async function bulkVerifySelectedUsers() {
  if (selectedUserIds.size === 0) return;
  const count = selectedUserIds.size;

  openConfirmModal(
    'Bulk Verify Users',
    `Are you sure you want to verify all ${count} selected user account(s)? This will grant them verified badges and driver credentials.`,
    async () => {
      showToast(`Verifying ${count} users...`, 'info');
      try {
        const userIdsArray = Array.from(selectedUserIds);
        const { error } = await supabaseClient
          .from('profiles')
          .update({ is_verified: true, verified_badge: true })
          .in('id', userIdsArray);

        if (error) throw error;

        showToast(`Successfully verified ${count} user(s)!`, 'success');
        clearUserSelection();
        await refreshData();
      } catch (err) {
        console.error('Bulk verify failed:', err);
        showToast(`Bulk verify failed: ${err.message || 'Error'}`, 'error');
      }
    }
  );
}

function bulkExportSelectedUsers() {
  if (selectedUserIds.size === 0) return;
  const selectedProfiles = usersData.filter(u => selectedUserIds.has(u.id));
  const headers = ['User ID', 'Full Name', 'Username', 'Role', 'Status', 'GCash Number', 'Vehicle Model', 'Plate Number', 'Date Joined'];
  const rows = selectedProfiles.map(u => [
    u.id,
    u.full_name || '',
    u.username || '',
    u.role || '',
    (u.is_verified || u.verified_badge) ? 'Verified' : (u.government_id_url ? 'Pending' : 'Unverified'),
    u.gcash_number || '',
    u.vehicle?.model || '',
    u.vehicle?.plate_number || '',
    u.created_at || ''
  ]);
  exportToCSV('coco_selected_users', headers, rows);
}

// CSV Export Helpers
function exportToCSV(filename, headers, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map(row => row.map(escapeCell).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(`Exported ${rows.length} record(s) to CSV!`, 'success');
}

function exportUsersCSV() {
  const headers = ['User ID', 'Full Name', 'Username', 'Role', 'Status', 'GCash Number', 'Vehicle Model', 'Plate Number', 'Date Joined'];
  const rows = usersData.map(u => [
    u.id,
    u.full_name || '',
    u.username || '',
    u.role || '',
    (u.is_verified || u.verified_badge) ? 'Verified' : (u.government_id_url ? 'Pending' : 'Unverified'),
    u.gcash_number || '',
    u.vehicle?.model || '',
    u.vehicle?.plate_number || '',
    u.created_at || ''
  ]);
  exportToCSV('coco_users_directory', headers, rows);
}

function exportTripsCSV() {
  const headers = ['Trip ID', 'Driver Name', 'Origin', 'Destination', 'Seats Available', 'Fare (PHP)', 'Status', 'Departure Time', 'Created At'];
  const rows = tripsData.map(t => [
    t.id,
    t.driver?.full_name || '',
    t.origin_label || '',
    t.destination_label || '',
    t.available_seats ?? '',
    t.fare_per_seat ?? '',
    t.status || '',
    t.departure_time || '',
    t.created_at || ''
  ]);
  exportToCSV('coco_trips_rides', headers, rows);
}

function exportBookingsCSV() {
  const headers = ['Booking ID', 'Trip ID', 'Commuter Name', 'Seats Booked', 'Type', 'Reservation Fee', 'Fare Paid', 'Payment Status', 'Booking Status', 'Created At'];
  const rows = bookingsData.map(b => [
    b.id,
    b.trip_id || '',
    b.commuter?.full_name || '',
    b.seats_booked || 1,
    b.is_reservation ? 'GCash Reservation' : 'Standard Cash',
    b.reservation_fee || 0,
    b.fare_paid || 0,
    b.payment_status || 'unpaid',
    b.status || '',
    b.created_at || ''
  ]);
  exportToCSV('coco_bookings_reservations', headers, rows);
}

// Filter Reset Handlers
function resetUserFilters() {
  searchText = '';
  filterRole = 'all';
  filterVerify = 'all';
  sortBy = 'created_at-desc';
  paginationState.users.page = 1;

  const searchInput = document.getElementById('global-search');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('select-sort');
  if (sortSelect) sortSelect.value = 'created_at-desc';

  ['all', 'drivers', 'commuters'].forEach(r => {
    const el = document.getElementById(`filter-role-${r}`);
    if (el) el.classList.toggle('active', r === 'all');
  });

  ['all', 'verified', 'pending', 'unverified'].forEach(v => {
    const el = document.getElementById(`filter-verify-${v}`);
    if (el) el.classList.toggle('active', v === 'all');
  });

  renderUserDirectory();
  showToast('User filters reset.', 'info');
}

function resetTripFilters() {
  tripSearchText = '';
  filterTrip = 'all';
  paginationState.trips.page = 1;

  const tripInput = document.getElementById('trips-search');
  if (tripInput) tripInput.value = '';

  ['all', 'open', 'ongoing', 'completed', 'cancelled'].forEach(s => {
    const el = document.getElementById(`filter-trip-${s}`);
    if (el) el.classList.toggle('active', s === 'all');
  });

  renderTripsManagement();
  showToast('Trip filters reset.', 'info');
}

function resetBookingFilters() {
  filterBooking = 'all';
  filterPayment = 'all';
  paginationState.bookings.page = 1;

  ['all', 'reservations', 'standard'].forEach(b => {
    const el = document.getElementById(`filter-booking-${b}`);
    if (el) el.classList.toggle('active', b === 'all');
  });

  ['all', 'submitted', 'verified', 'unpaid'].forEach(p => {
    const el = document.getElementById(`filter-pay-${p}`);
    if (el) el.classList.toggle('active', p === 'all');
  });

  renderBookingsManagement();
  showToast('Booking filters reset.', 'info');
}

function resetHubFilters() {
  hubSearchText = '';
  hubFilterStatus = 'all';
  paginationState.hub.page = 1;

  const hubInput = document.getElementById('hub-search');
  if (hubInput) hubInput.value = '';

  const hubSelect = document.getElementById('hub-filter-status');
  if (hubSelect) hubSelect.value = 'all';

  renderHubModeration();
  showToast('Hub filters reset.', 'info');
}

// Theme & Audio & Responsive Drawer Handlers
function applyInitialTheme() {
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
  updateThemeIcon();
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  currentTheme = isDark ? 'dark' : 'light';
  localStorage.setItem('coco_theme_mode', currentTheme);
  updateThemeIcon();
  showToast(`Switched to ${isDark ? 'Dark' : 'Light'} theme`, 'info');
}

function updateThemeIcon() {
  const icon = document.getElementById('theme-toggle-icon');
  if (!icon) return;
  const isDark = document.body.classList.contains('dark-mode');
  icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
  if (window.lucide) lucide.createIcons();
}

function toggleAudioAlerts() {
  soundAlertsEnabled = !soundAlertsEnabled;
  localStorage.setItem('coco_sound_enabled', String(soundAlertsEnabled));
  updateSoundIcon();
  if (soundAlertsEnabled) {
    playNotificationSound();
    showToast('Sound alerts enabled', 'info');
  } else {
    showToast('Sound alerts muted', 'warning');
  }
}

function updateSoundIcon() {
  const icon = document.getElementById('sound-toggle-icon');
  const btn = document.getElementById('btn-sound-toggle');
  if (icon) {
    icon.setAttribute('data-lucide', soundAlertsEnabled ? 'volume-2' : 'volume-x');
  }
  if (btn) {
    btn.classList.toggle('active', soundAlertsEnabled);
  }
  if (window.lucide) lucide.createIcons();
}

function toggleSidebarDrawer(forceState) {
  const sidebar = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  const isOpen = forceState !== undefined ? forceState : !sidebar.classList.contains('drawer-open');
  if (isOpen) {
    sidebar.classList.add('drawer-open');
    if (backdrop) backdrop.classList.add('active');
  } else {
    sidebar.classList.remove('drawer-open');
    if (backdrop) backdrop.classList.remove('active');
  }
}

function openShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function closeShortcutsModal() {
  const modal = document.getElementById('shortcuts-modal');
  if (modal) modal.classList.remove('active');
}

// Global Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // 1. Ctrl+K or Cmd+K: Focus Global Search
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      const searchInput = document.getElementById('global-search');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // 2. Escape: Close open modals, clear selection, or blur search
    if (e.key === 'Escape') {
      const confirmModal = document.getElementById('confirm-dialog-modal');
      const shortcutsModal = document.getElementById('shortcuts-modal');
      const lightboxModal = document.getElementById('lightbox-modal');
      const userModal = document.getElementById('user-edit-modal');
      const tripModal = document.getElementById('trip-detail-modal');

      if (confirmModal && confirmModal.classList.contains('active')) {
        closeConfirmModal();
        return;
      }
      if (shortcutsModal && shortcutsModal.classList.contains('active')) {
        closeShortcutsModal();
        return;
      }
      if (lightboxModal && lightboxModal.classList.contains('active')) {
        closeLightbox();
        return;
      }
      if (userModal && userModal.classList.contains('active')) {
        closeUserEditModal();
        return;
      }
      if (tripModal && tripModal.classList.contains('active')) {
        closeTripDetailModal();
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        activeEl.blur();
        return;
      }

      if (selectedUserIds.size > 0) {
        clearUserSelection();
        return;
      }

      toggleSidebarDrawer(false);
      return;
    }

    // If typing in input, textarea, select -> ignore single-key shortcuts
    const targetTag = (e.target && e.target.tagName) || '';
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || e.target.isContentEditable) {
      return;
    }

    // 3. Tab switching keys 1 to 6
    if (e.key === '1') switchTab('dashboard');
    else if (e.key === '2') switchTab('users');
    else if (e.key === '3') switchTab('verification');
    else if (e.key === '4') switchTab('trips');
    else if (e.key === '5') switchTab('bookings');
    else if (e.key === '6') switchTab('hub');
    // 4. Quick Actions
    else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      const modal = document.getElementById('shortcuts-modal');
      if (modal && modal.classList.contains('active')) closeShortcutsModal();
      else openShortcutsModal();
    }
    else if (e.key === 't' || e.key === 'T') {
      toggleTheme();
    }
    else if (e.key === 'r' || e.key === 'R') {
      manualRefresh();
    }
    else if (e.key === 'm' || e.key === 'M') {
      toggleAudioAlerts();
    }
  });
}
