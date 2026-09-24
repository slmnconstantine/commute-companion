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

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide) lucide.createIcons();
  
  // 1. Load configuration from Node server API
  await loadServerConfig();
  
  // 2. Load localStorage overrides if any
  loadLocalSettings();
  
  // 3. Initialize Supabase Client
  initSupabase();
  
  // 4. Initial fetch across all platform tables
  await refreshData();

  // 5. Initialize Realtime Subscriptions for reports and hub updates
  setupAdminRealtime();
});

// Load DB Configuration from Node server API
async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.supabaseUrl) dbConfig.supabaseUrl = data.supabaseUrl;
    if (data.supabaseAnonKey) dbConfig.supabaseAnonKey = data.supabaseAnonKey;
    if (data.supabaseServiceRoleKey) dbConfig.supabaseServiceRoleKey = data.supabaseServiceRoleKey;
  } catch (err) {
    console.error('Failed to load server config:', err);
  }
}

// Load settings from localStorage
function loadLocalSettings() {
  const savedUrl = localStorage.getItem('admin_supabase_url');
  const savedAnon = localStorage.getItem('admin_supabase_anon_key');
  const savedService = localStorage.getItem('admin_supabase_service_role_key');

  if (savedUrl) dbConfig.supabaseUrl = savedUrl;
  if (savedAnon) dbConfig.supabaseAnonKey = savedAnon;
  if (savedService) dbConfig.supabaseServiceRoleKey = savedService;

  // Pre-fill inputs in settings modal
  const urlInput = document.getElementById('settings-supabase-url');
  const anonInput = document.getElementById('settings-supabase-anon-key');
  const serviceInput = document.getElementById('settings-supabase-service-role');
  if (urlInput) urlInput.value = dbConfig.supabaseUrl;
  if (anonInput) anonInput.value = dbConfig.supabaseAnonKey;
  if (serviceInput) serviceInput.value = dbConfig.supabaseServiceRoleKey;
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
  }, 500);
}

// Update UI Layout with values
function updateUI() {
  // Navigation badges
  document.getElementById('badge-total-users').innerText = usersData.length;
  
  const pendingCount = usersData.filter(u => u.government_id_url && !u.is_verified).length;
  const pendingBadge = document.getElementById('badge-pending-verifications');
  pendingBadge.innerText = pendingCount;
  pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';

  const badgeTrips = document.getElementById('badge-total-trips');
  if (badgeTrips) badgeTrips.innerText = tripsData.length;

  const badgeBookings = document.getElementById('badge-total-bookings');
  if (badgeBookings) badgeBookings.innerText = bookingsData.length;

  const badgeHub = document.getElementById('badge-total-posts');
  if (badgeHub) badgeHub.innerText = hubPostsData.length;

  // Reported posts badge
  const reportedCount = hubPostsData.filter(p => p.reports && p.reports.length > 0).length;
  const badgeReported = document.getElementById('badge-reported-posts');
  if (badgeReported) {
    if (reportedCount > 0) {
      badgeReported.innerText = `${reportedCount} reported`;
      badgeReported.style.display = 'inline-block';
    } else {
      badgeReported.style.display = 'none';
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

  updateUI();
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

  // Set metric text
  document.getElementById('stat-total-users').innerText = total;
  document.getElementById('stat-drivers').innerText = drivers;
  document.getElementById('stat-commuters').innerText = commuters;
  document.getElementById('stat-total-trips').innerText = tripsData.length;
  document.getElementById('stat-active-trips').innerText = activeTrips;
  document.getElementById('stat-total-bookings').innerText = bookingsData.length;
  document.getElementById('stat-reservation-count').innerText = reservations;
  document.getElementById('stat-platform-fees').innerText = formatCurrency(totalPlatformFees);

  document.getElementById('stat-verified-count').innerText = verified;
  document.getElementById('stat-pending-count').innerText = pending;
  document.getElementById('stat-unverified-count').innerText = unverified;

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
  renderUserDirectory();
}

function handleGlobalSearch(val) {
  searchText = val.trim().toLowerCase();
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
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="users" class="empty-icon"></i>
        <p>No user accounts matched the current filter criteria.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map((user, idx) => {
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
    submissionsContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="check-circle" class="empty-icon text-green"></i>
        <p>No pending verification submissions!</p>
      </div>
    `;
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
  document.querySelectorAll('#filter-trip-all, #filter-trip-open, #filter-trip-ongoing, #filter-trip-completed, #filter-trip-cancelled').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`filter-trip-${status}`);
  if (activeBtn) activeBtn.classList.add('active');
  renderTripsManagement();
}

function handleTripSearch(val) {
  tripSearchText = val.trim().toLowerCase();
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
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="map-pin-off" class="empty-icon"></i>
        <p>No trips found matching the selected filters.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(trip => {
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
  document.querySelectorAll('#filter-booking-all, #filter-booking-reservations, #filter-booking-standard').forEach(btn => btn.classList.remove('active'));
  if (type === 'all') document.getElementById('filter-booking-all').classList.add('active');
  if (type === 'reservation') document.getElementById('filter-booking-reservations').classList.add('active');
  if (type === 'standard') document.getElementById('filter-booking-standard').classList.add('active');
  renderBookingsManagement();
}

function setPaymentFilter(status) {
  filterPayment = status;
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
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="wallet" class="empty-icon"></i>
        <p>No bookings or GCash reservations found for this filter.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(booking => {
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
  renderHubModeration();
}

function handleHubFilterStatus(val) {
  hubFilterStatus = val;
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
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="message-square-off" class="empty-icon"></i>
        <p>${hubFilterStatus === 'reported' ? 'No reported posts pending review!' : 'No community hub posts found.'}</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(post => {
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

// ═════ SETTINGS & CONNECTION MODAL ═════
function openSettingsModal() {
  document.getElementById('settings-modal').classList.add('active');
  testSettingsConnection();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('active');
}

async function testSettingsConnection() {
  const url = document.getElementById('settings-supabase-url').value.trim();
  const anon = document.getElementById('settings-supabase-anon-key').value.trim();
  const service = document.getElementById('settings-supabase-service-role').value.trim();
  const box = document.getElementById('settings-status-box');

  if (!url || !anon) {
    box.className = 'modal-status-box';
    box.innerHTML = `<i data-lucide="alert-circle" class="status-icon"></i> <span>Credentials missing. Provide URL and Anon Key.</span>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  box.className = 'modal-status-box';
  box.innerHTML = `<span>Checking connection to Supabase...</span>`;

  try {
    const keyToUse = service || anon;
    const testClient = createClient(url, keyToUse);
    const { data, error } = await testClient.from('profiles').select('id').limit(1);

    if (error) throw error;
    
    box.className = 'modal-status-box success';
    box.innerHTML = `<i data-lucide="check-circle" class="status-icon"></i> <span>Connected! Live connection verified.</span>`;
  } catch (err) {
    box.className = 'modal-status-box error';
    box.innerHTML = `<i data-lucide="x-circle" class="status-icon"></i> <span>Connection failed: ${err.message || 'Check URL and Key'}</span>`;
  }
  if (window.lucide) lucide.createIcons();
}

function saveSettings() {
  const url = document.getElementById('settings-supabase-url').value.trim();
  const anon = document.getElementById('settings-supabase-anon-key').value.trim();
  const service = document.getElementById('settings-supabase-service-role').value.trim();

  localStorage.setItem('admin_supabase_url', url);
  localStorage.setItem('admin_supabase_anon_key', anon);
  localStorage.setItem('admin_supabase_service_role_key', service);

  dbConfig.supabaseUrl = url;
  dbConfig.supabaseAnonKey = anon;
  dbConfig.supabaseServiceRoleKey = service;

  initSupabase();
  closeSettingsModal();
  
  showToast('Settings saved. Refreshing database data...', 'success');
  refreshData();
  setupAdminRealtime();
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
