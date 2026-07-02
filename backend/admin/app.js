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
let activeTab = 'dashboard';
let mockMode = true; // Default to true for sandbox demo ease, can toggle to live

// Filters and Sorting State
let searchText = '';
let filterRole = 'all';
let filterVerify = 'all';
let sortBy = 'created_at-desc';

// Selected item in Verification Inbox
let selectedUserId = null;

// Initialize on Load
window.addEventListener('DOMContentLoaded', async () => {
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Load configuration from server
  await loadServerConfig();
  
  // Load localStorage overrides if any
  loadLocalSettings();
  
  // Initialize Supabase Client
  initSupabase();
  
  // Bind search box input
  const globalSearchInput = document.getElementById('global-search');
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      searchText = e.target.value;
      if (activeTab === 'users') {
        renderUserDirectory();
      }
    });
  }

  // Initial fetch
  await refreshData();
});

// Load DB Configuration from Node server API
async function loadServerConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    dbConfig.supabaseUrl = data.supabaseUrl || '';
    dbConfig.supabaseAnonKey = data.supabaseAnonKey || '';
    dbConfig.supabaseServiceRoleKey = data.supabaseServiceRoleKey || '';
  } catch (err) {
    console.error('Failed to load server config:', err);
    showToast('Failed to fetch server credentials. Running offline.', 'error');
  }
}

// Load settings from localStorage
function loadLocalSettings() {
  const savedUrl = localStorage.getItem('admin_supabase_url');
  const savedAnon = localStorage.getItem('admin_supabase_anon_key');
  const savedService = localStorage.getItem('admin_supabase_service_role_key');
  const savedMock = localStorage.getItem('admin_mock_mode');

  if (savedUrl) dbConfig.supabaseUrl = savedUrl;
  if (savedAnon) dbConfig.supabaseAnonKey = savedAnon;
  if (savedService) dbConfig.supabaseServiceRoleKey = savedService;
  
  if (savedMock !== null) {
    mockMode = savedMock === 'true';
  } else {
    // If we have a service role key, we can default mockMode to false
    mockMode = !dbConfig.supabaseServiceRoleKey;
  }

  // Set form inputs in settings modal
  document.getElementById('settings-supabase-url').value = dbConfig.supabaseUrl;
  document.getElementById('settings-supabase-anon-key').value = dbConfig.supabaseAnonKey;
  document.getElementById('settings-supabase-service-role').value = dbConfig.supabaseServiceRoleKey;
  
  updateMockModeUI();
}

// Initialize Supabase client
function initSupabase() {
  const statusPill = document.getElementById('db-status-pill');
  const statusText = document.getElementById('db-status-text');
  const roleLevelText = document.getElementById('role-level-text');

  if (!dbConfig.supabaseUrl || !dbConfig.supabaseAnonKey) {
    statusPill.className = 'connection-status-pill unconfigured';
    statusText.innerText = 'Unconfigured';
    roleLevelText.innerText = 'Offline';
    showToast('Database credentials unconfigured. Open settings to configure.', 'warning');
    return;
  }

  try {
    // Use service role key if provided, else fall back to anon key
    const activeKey = dbConfig.supabaseServiceRoleKey || dbConfig.supabaseAnonKey;
    supabaseClient = createClient(dbConfig.supabaseUrl, activeKey, {
      auth: {
        persistSession: false
      }
    });

    if (dbConfig.supabaseServiceRoleKey) {
      statusPill.className = 'connection-status-pill connected';
      statusText.innerText = 'Connected (Admin)';
      roleLevelText.innerText = 'Full Database Access';
    } else {
      statusPill.className = 'connection-status-pill connected-anon';
      statusText.innerText = 'Connected (Anon)';
      roleLevelText.innerText = 'Read-Only (Standard)';
    }
  } catch (err) {
    console.error('Supabase init failed:', err);
    statusPill.className = 'connection-status-pill unconfigured';
    statusText.innerText = 'Error';
    roleLevelText.innerText = 'Error';
    showToast('Connection initialization failed.', 'error');
  }
}

// Fetch all profiles from Supabase database
async function refreshData() {
  if (!supabaseClient) {
    // Fill dummy users for zero config demonstration
    loadMockUsers();
    updateUI();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    usersData = data || [];
    
    // If database is empty, fill with mock data for display
    if (usersData.length === 0) {
      loadMockUsers();
      showToast('Database empty. Loaded demonstration users.', 'info');
    }
    
    updateUI();
  } catch (err) {
    console.error('Fetch users failed:', err);
    showToast('RLS / Fetch failed. Displaying mock data.', 'warning');
    loadMockUsers();
    updateUI();
  }
}

// Generate beautiful demonstration accounts if DB is empty or disconnected
function loadMockUsers() {
  usersData = [
    {
      id: '0e3f5ae6-5982-405f-ace7-2808c7ac5d0f',
      full_name: 'Jane Doe',
      username: 'jane_doe',
      role: 'commuter',
      is_verified: false,
      verified_badge: false,
      government_id_url: 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
      rating_avg: 4.8,
      total_ratings: 12,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString() // 7 days ago
    },
    {
      id: '60966180-4fc9-4965-a89d-29889292e472',
      full_name: 'Ann Rose Destacamento',
      username: 'annrose',
      role: 'commuter',
      is_verified: false,
      verified_badge: false,
      government_id_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
      rating_avg: 4.2,
      total_ratings: 5,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: '74d8bfe5-2590-4afb-be2d-60e638dbc4ca',
      full_name: 'Ripercaube',
      username: 'Ripercaube_123',
      role: 'commuter',
      is_verified: false,
      verified_badge: false,
      government_id_url: null,
      avatar_url: null,
      rating_avg: 0,
      total_ratings: 0,
      created_at: new Date(Date.now() - 12 * 86400000).toISOString()
    },
    {
      id: 'daec943a-0e0b-4ed6-888d-d0de513ad243',
      full_name: 'Solomon Constantine',
      username: 'slmn11',
      role: 'driver',
      is_verified: true,
      verified_badge: true,
      government_id_url: 'https://images.unsplash.com/photo-1557177324-56c542165309?auto=format&fit=crop&q=80&w=600',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      rating_avg: 4.9,
      total_ratings: 48,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: '3f1e4a2c-fb69-4cd7-83b4-b1ed0f6a606e',
      full_name: 'Solomon Tester',
      username: 'slmn',
      role: 'driver',
      is_verified: true,
      verified_badge: true,
      government_id_url: null,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
      rating_avg: 4.7,
      total_ratings: 24,
      created_at: new Date(Date.now() - 40 * 86400000).toISOString()
    },
    {
      id: 'a2371514-5b14-4b15-b4fc-83dea902c1b5',
      full_name: 'Solomon Hub',
      username: 'slmncons',
      role: 'commuter',
      is_verified: true,
      verified_badge: true,
      government_id_url: null,
      avatar_url: null,
      rating_avg: 5.0,
      total_ratings: 2,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
      id: '7841d492-2abd-4695-a967-bb2245094046',
      full_name: 'Test Commuter',
      username: 'test_commuter_99',
      role: 'commuter',
      is_verified: false,
      verified_badge: false,
      government_id_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
      avatar_url: null,
      rating_avg: 0,
      total_ratings: 0,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  ];
}

// Update UI Layout with values
function updateUI() {
  // Nav badges
  document.getElementById('badge-total-users').innerText = usersData.length;
  
  const pendingCount = usersData.filter(u => u.government_id_url && !u.is_verified).length;
  const pendingBadge = document.getElementById('badge-pending-verifications');
  pendingBadge.innerText = pendingCount;
  pendingBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';

  // Render current active tab content
  calculateStats();
  renderUserDirectory();
  renderVerificationInbox();
  renderQuickInboxPreview();

  // Re-run Lucide Icons to render new icons
  lucide.createIcons();
}

// Swtich tab panel view
function switchTab(tabId) {
  activeTab = tabId;
  
  // Set navbar classes
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`btn-tab-${tabId}`).classList.add('active');

  // Set tab view panels visibility
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`view-${tabId}`).classList.add('active');

  // Refresh view contents
  updateUI();
}

// Calculate dashboard analytics stats
function calculateStats() {
  const total = usersData.length;
  const drivers = usersData.filter(u => u.role === 'driver').length;
  const commuters = usersData.filter(u => u.role === 'commuter').length;
  
  // Avg rating
  const ratedUsers = usersData.filter(u => u.rating_avg > 0);
  const avgRating = ratedUsers.length > 0
    ? (ratedUsers.reduce((sum, u) => sum + u.rating_avg, 0) / ratedUsers.length).toFixed(1)
    : '0.0';

  // Verification counts
  const verified = usersData.filter(u => u.is_verified || u.verified_badge).length;
  const pending = usersData.filter(u => u.government_id_url && !u.is_verified && !u.verified_badge).length;
  const unverified = total - verified - pending;

  // Set metric text
  document.getElementById('stat-total-users').innerText = total;
  document.getElementById('stat-drivers').innerText = drivers;
  document.getElementById('stat-commuters').innerText = commuters;
  document.getElementById('stat-avg-rating').innerText = avgRating;

  document.getElementById('stat-verified-count').innerText = verified;
  document.getElementById('stat-pending-count').innerText = pending;
  document.getElementById('stat-unverified-count').innerText = unverified;

  // Percentage strings
  const driversPct = total > 0 ? Math.round((drivers / total) * 100) : 0;
  const commutersPct = total > 0 ? Math.round((commuters / total) * 100) : 0;

  document.getElementById('stat-drivers-percentage').style.width = `${driversPct}%`;
  document.getElementById('stat-drivers-pct-text').innerText = `${driversPct}%`;

  document.getElementById('stat-commuters-percentage').style.width = `${commutersPct}%`;
  document.getElementById('stat-commuters-pct-text').innerText = `${commutersPct}%`;

  // Funnel progress bars
  const verifiedPct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const unverifiedPct = total > 0 ? Math.round((unverified / total) * 100) : 0;

  document.getElementById('funnel-verified-bar').style.width = `${verifiedPct}%`;
  document.getElementById('funnel-pending-bar').style.width = `${pendingPct}%`;
  document.getElementById('funnel-unverified-bar').style.width = `${unverifiedPct}%`;
}

// Render Dashboard Quick Action checklist
function renderQuickInboxPreview() {
  const container = document.getElementById('quick-inbox-list');
  const pending = usersData.filter(u => u.government_id_url && !u.is_verified);

  if (pending.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="check-circle" class="empty-icon text-green"></i>
        <p>All verification reviews completed!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = pending.map(user => `
    <div class="quick-item-row animate-slide-up">
      <div class="quick-item-info">
        <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
          ${!user.avatar_url ? user.full_name.substring(0, 2).toUpperCase() : ''}
        </div>
        <div class="quick-item-meta">
          <h5>${escapeHTML(user.full_name)}</h5>
          <span>Role: ${user.role} • ID Document submitted</span>
        </div>
      </div>
      <button class="btn-chevron" onclick="goToSubmission('${user.id}')" title="Review Document">
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
  `).join('');
}

// Helper to transition from dashboard to specific pending user in verification inbox
function goToSubmission(userId) {
  selectedUserId = userId;
  switchTab('verification');
}

// Set filters from UI click events
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
  if (activeTab === 'users') {
    renderUserDirectory();
  }
}

// Render User Accounts Grid Directory
function renderUserDirectory() {
  const grid = document.getElementById('users-grid');
  
  // Filter data
  let filtered = usersData.filter(user => {
    // Search text match
    const matchSearch = !searchText || 
      user.full_name.toLowerCase().includes(searchText) || 
      (user.username && user.username.toLowerCase().includes(searchText)) ||
      user.id.includes(searchText);
      
    // Role filter match
    const matchRole = filterRole === 'all' || user.role === filterRole;
    
    // Verification status filter match
    let matchVerify = true;
    if (filterVerify === 'verified') matchVerify = user.is_verified || user.verified_badge;
    else if (filterVerify === 'pending') matchVerify = user.government_id_url && !user.is_verified && !user.verified_badge;
    else if (filterVerify === 'unverified') matchVerify = !user.government_id_url && !user.is_verified && !user.verified_badge;

    return matchSearch && matchRole && matchVerify;
  });

  // Sort data
  filtered.sort((a, b) => {
    if (sortBy === 'created_at-desc') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'created_at-asc') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'full_name-asc') return a.full_name.localeCompare(b.full_name);
    if (sortBy === 'rating_avg-desc') return (b.rating_avg || 0) - (a.rating_avg || 0);
    return 0;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i data-lucide="users" class="empty-icon"></i>
        <p>No user accounts matched the filter criteria.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map((user, idx) => {
    const isUserVerified = user.is_verified || user.verified_badge;
    const isUserPending = user.government_id_url && !user.is_verified && !user.verified_badge;
    
    let verifyBadgeHtml = '';
    if (isUserVerified) {
      verifyBadgeHtml = `<span class="badge-verify verified"><i data-lucide="check-circle-2"></i> Verified</span>`;
    } else if (isUserPending) {
      verifyBadgeHtml = `<span class="badge-verify pending"><i data-lucide="hourglass"></i> Pending</span>`;
    } else {
      verifyBadgeHtml = `<span class="badge-verify unverified"><i data-lucide="shield-alert"></i> Unverified</span>`;
    }

    const initials = user.full_name.substring(0, 2).toUpperCase();
    const joinedDate = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <div class="user-card animate-slide-up" style="animation-delay: ${Math.min(idx * 0.03, 0.4)}s;">
        <div class="card-header-meta">
          <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
            ${!user.avatar_url ? initials : ''}
          </div>
          <div class="user-badge-container">
            <h4 class="user-display-name">${escapeHTML(user.full_name)}</h4>
            <span class="user-username">@${escapeHTML(user.username || 'unnamed')}</span>
          </div>
        </div>
        
        <div class="pills-row">
          <span class="badge-role ${user.role}">${user.role}</span>
          ${verifyBadgeHtml}
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

  lucide.createIcons();
}

// Render Verification ID reviews inbox
function renderVerificationInbox() {
  const submissionsContainer = document.getElementById('inbox-submissions-list');
  const viewerContainer = document.getElementById('inbox-submission-viewer');
  
  const pendingUsers = usersData.filter(u => u.government_id_url && !u.is_verified);

  // If inbox selectedUser is not in the pending list anymore, reset it
  if (selectedUserId && !pendingUsers.some(u => u.id === selectedUserId)) {
    selectedUserId = null;
  }

  // Set up list
  if (pendingUsers.length === 0) {
    submissionsContainer.innerHTML = `
      <div class="empty-state">
        <i data-lucide="check" class="empty-icon text-green"></i>
        <p>No pending verification submissions!</p>
      </div>
    `;
    viewerContainer.innerHTML = `
      <div class="empty-viewer-state">
        <i data-lucide="eye" class="empty-viewer-icon"></i>
        <h3>Select a submission to review</h3>
        <p>Verify Government ID documents, cross-reference account credentials, and toggle user verification status.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  submissionsContainer.innerHTML = pendingUsers.map(user => `
    <div class="submission-item ${selectedUserId === user.id ? 'active' : ''}" onclick="selectSubmission('${user.id}')">
      <div class="submission-item-meta">
        <div class="user-avatar" style="${user.avatar_url ? `background-image: url(${user.avatar_url})` : ''}">
          ${!user.avatar_url ? user.full_name.substring(0, 2).toUpperCase() : ''}
        </div>
        <div class="submission-item-details">
          <h4>${escapeHTML(user.full_name)}</h4>
          <span>@${escapeHTML(user.username || 'unnamed')} • ${user.role}</span>
        </div>
      </div>
      <i data-lucide="chevron-right" class="text-dark"></i>
    </div>
  `).join('');

  // Set up detailed view
  if (!selectedUserId) {
    // Auto-select first one if none selected
    selectedUserId = pendingUsers[0].id;
  }

  const selectedUser = pendingUsers.find(u => u.id === selectedUserId);
  if (selectedUser) {
    viewerContainer.innerHTML = `
      <div class="viewer-header">
        <div class="viewer-user-profile">
          <div class="viewer-avatar" style="${selectedUser.avatar_url ? `background-image: url(${selectedUser.avatar_url})` : ''}">
            ${!selectedUser.avatar_url ? selectedUser.full_name.substring(0, 2).toUpperCase() : ''}
          </div>
          <div class="viewer-meta">
            <h3>${escapeHTML(selectedUser.full_name)}</h3>
            <span>Username: @${escapeHTML(selectedUser.username || 'unnamed')} • ID: ${selectedUser.id}</span>
            <div class="viewer-pills">
              <span class="badge-role ${selectedUser.role}">${selectedUser.role}</span>
              <span class="badge-verify pending"><i data-lucide="hourglass"></i> Verification Review</span>
            </div>
          </div>
        </div>
      </div>

      <div class="document-view-container">
        <div class="document-title">Uploaded Government ID document</div>
        <div class="document-image-frame" onclick="openLightbox('${selectedUser.government_id_url}', '${escapeHTML(selectedUser.full_name)}\\'s Government ID')">
          <img src="${selectedUser.government_id_url}" alt="Government ID" onerror="handleImageLoadError(this)">
          <div class="image-zoom-overlay">
            <i data-lucide="maximize-2"></i>
            Click to expand
          </div>
        </div>
      </div>

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

  lucide.createIcons();
}

function handleImageLoadError(img) {
  img.style.display = 'none';
  const parent = img.parentNode;
  
  // Check if placeholder is already there
  if (!parent.querySelector('.document-placeholder')) {
    const placeholder = document.createElement('div');
    placeholder.className = 'document-placeholder';
    placeholder.innerHTML = `
      <i data-lucide="image-off"></i>
      <p>Failed to load ID document image.<br><small style="color: var(--text-dark)">Invalid image URL or storage access denied.</small></p>
    `;
    parent.appendChild(placeholder);
    lucide.createIcons();
  }
}

function selectSubmission(userId) {
  selectedUserId = userId;
  renderVerificationInbox();
}

// APPROVE identity verification workflow
async function approveVerification(userId) {
  showLoading(true);
  try {
    if (mockMode) {
      // Offline mock save
      const user = usersData.find(u => u.id === userId);
      if (user) {
        user.is_verified = true;
        user.verified_badge = true;
      }
      showToast(`Approved verification for ${user.full_name} (Mock Mode)`, 'success');
      updateUI();
    } else {
      // Live database save
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          is_verified: true,
          verified_badge: true
        })
        .eq('id', userId);

      if (error) throw error;
      
      showToast(`Verification Approved successfully`, 'success');
      await refreshData();
    }
  } catch (err) {
    console.error('Approve failed:', err);
    showToast(`Approval failed: ${err.message || 'Row Level Security policy blocked.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// REJECT identity verification workflow
async function rejectVerification(userId) {
  showLoading(true);
  try {
    if (mockMode) {
      // Offline mock save
      const user = usersData.find(u => u.id === userId);
      if (user) {
        user.government_id_url = null;
        user.is_verified = false;
        user.verified_badge = false;
      }
      showToast(`Rejected ID submission for ${user.full_name} (Mock Mode)`, 'warning');
      updateUI();
    } else {
      // Live database save
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          government_id_url: null,
          is_verified: false,
          verified_badge: false
        })
        .eq('id', userId);

      if (error) throw error;
      
      showToast(`ID Submission Rejected. Government ID url reset.`, 'success');
      await refreshData();
    }
  } catch (err) {
    console.error('Reject failed:', err);
    showToast(`Rejection failed: ${err.message || 'Row Level Security policy blocked.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// Settings modal trigger
function openSettingsModal() {
  document.getElementById('settings-modal').classList.add('active');
  testSettingsConnection();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.remove('active');
}

// Verify connection live status in settings modal
async function testSettingsConnection() {
  const url = document.getElementById('settings-supabase-url').value.trim();
  const anon = document.getElementById('settings-supabase-anon-key').value.trim();
  const service = document.getElementById('settings-supabase-service-role').value.trim();
  const box = document.getElementById('settings-status-box');

  if (!url || !anon) {
    box.className = 'modal-status-box';
    box.innerHTML = `<i data-lucide="alert-circle" class="status-icon"></i> <span>Credentials missing. Add URL and Anon Key.</span>`;
    lucide.createIcons();
    return;
  }

  box.className = 'modal-status-box';
  box.innerHTML = `<span>Checking connection...</span>`;

  try {
    const keyToUse = service || anon;
    const testClient = createClient(url, keyToUse);
    const { data, error } = await testClient.from('profiles').select('id').limit(1);

    if (error) throw error;
    
    box.className = 'modal-status-box success';
    if (service) {
      box.innerHTML = `<i data-lucide="check-circle" class="status-icon"></i> <span>Connected! Admin Service Role privileges verified.</span>`;
    } else {
      box.innerHTML = `<i data-lucide="check-circle" class="status-icon"></i> <span>Connected with Anon Key (Read Only capability).</span>`;
    }
  } catch (err) {
    box.className = 'modal-status-box error';
    box.innerHTML = `<i data-lucide="x-circle" class="status-icon"></i> <span>Connection failed: ${err.message || 'Invalid key or URL'}</span>`;
  }
  lucide.createIcons();
}

// Add connection key change listeners to validate
document.getElementById('settings-supabase-url').addEventListener('change', testSettingsConnection);
document.getElementById('settings-supabase-anon-key').addEventListener('change', testSettingsConnection);
document.getElementById('settings-supabase-service-role').addEventListener('change', testSettingsConnection);

// Save configuration credentials to localStorage
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

  // Re-init client
  initSupabase();
  closeSettingsModal();
  
  // Refresh views
  showToast('Settings saved. Refreshing database data...', 'success');
  refreshData();
}

// User Edit modal management
function openUserEditModal(userId) {
  const user = usersData.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-full-name').value = user.full_name;
  document.getElementById('edit-username').value = user.username || '';
  document.getElementById('edit-role').value = user.role;
  document.getElementById('edit-rating').value = user.rating_avg || 0;
  
  document.getElementById('edit-is-verified').checked = user.is_verified;
  document.getElementById('edit-verified-badge').checked = user.verified_badge;

  // Set ID Preview URL
  updateModalIdPreview(user.government_id_url);

  document.getElementById('user-edit-modal').classList.add('active');
}

function closeUserEditModal() {
  document.getElementById('user-edit-modal').classList.remove('remove');
  document.getElementById('user-edit-modal').classList.remove('active');
}

function updateModalIdPreview(url) {
  const frame = document.getElementById('edit-id-preview-container');
  const clearBtn = document.getElementById('btn-clear-id');
  
  if (url) {
    frame.innerHTML = `<img id="edit-id-image" src="${url}" alt="Government ID" onerror="handleImageLoadError(this)">`;
    clearBtn.style.display = 'flex';
  } else {
    frame.innerHTML = `
      <div class="document-placeholder">
        <i data-lucide="file-text"></i>
        <p>No document submitted</p>
      </div>
    `;
    clearBtn.style.display = 'none';
    lucide.createIcons();
  }
}

// Clear government ID URL
function clearGovernmentId() {
  updateModalIdPreview(null);
}

// Mock helper to generate a government ID image URL for demo reviews
function generateMockId() {
  const mockIdUrls = [
    'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1557177324-56c542165309?auto=format&fit=crop&q=80&w=600'
  ];
  
  // Pick random ID
  const randUrl = mockIdUrls[Math.floor(Math.random() * mockIdUrls.length)];
  updateModalIdPreview(randUrl);
  showToast('Generated Mock ID document URL', 'success');
}

// Update profile details save handler
async function saveUserProfile() {
  const userId = document.getElementById('edit-user-id').value;
  const fullName = document.getElementById('edit-full-name').value.trim();
  const username = document.getElementById('edit-username').value.trim();
  const role = document.getElementById('edit-role').value;
  const rating = parseFloat(document.getElementById('edit-rating').value) || 0;
  
  const isVerified = document.getElementById('edit-is-verified').checked;
  const verifiedBadge = document.getElementById('edit-verified-badge').checked;

  const idImgElement = document.getElementById('edit-id-image');
  const governmentIdUrl = idImgElement ? idImgElement.src : null;

  if (!fullName) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  const updates = {
    full_name: fullName,
    username: username || null,
    role: role,
    rating_avg: rating,
    is_verified: isVerified,
    verified_badge: verifiedBadge,
    government_id_url: governmentIdUrl
  };

  showLoading(true);
  try {
    if (mockMode) {
      // Mock save
      const user = usersData.find(u => u.id === userId);
      if (user) {
        Object.assign(user, updates);
      }
      showToast(`User details updated (Mock Mode)`, 'success');
      updateUI();
      closeUserEditModal();
    } else {
      // Live database save
      const { error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      showToast(`User details updated successfully`, 'success');
      closeUserEditModal();
      await refreshData();
    }
  } catch (err) {
    console.error('Update profile failed:', err);
    showToast(`Update failed: ${err.message || 'Row Level Security policy blocked.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// Delete user profile operation
async function deleteUserProfile() {
  const userId = document.getElementById('edit-user-id').value;
  const fullName = document.getElementById('edit-full-name').value;
  
  if (!confirm(`Are you absolutely sure you want to delete account: ${fullName}? This operation is irreversible.`)) {
    return;
  }

  showLoading(true);
  try {
    if (mockMode) {
      // Mock deletion
      usersData = usersData.filter(u => u.id !== userId);
      showToast(`Deleted profile of ${fullName} (Mock Mode)`, 'warning');
      updateUI();
      closeUserEditModal();
    } else {
      // Live database deletion
      const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      showToast(`Profile deleted successfully`, 'success');
      closeUserEditModal();
      await refreshData();
    }
  } catch (err) {
    console.error('Delete failed:', err);
    showToast(`Delete failed: ${err.message || 'Row Level Security policy blocked.'}`, 'error');
  } finally {
    showLoading(false);
  }
}

// Mock Mode toggle
function toggleMockMode() {
  mockMode = !mockMode;
  localStorage.setItem('admin_mock_mode', mockMode);
  updateMockModeUI();
  
  const msg = mockMode 
    ? 'Mock Mode Enabled. Writes will be simulated locally.'
    : 'Mock Mode Disabled. Admin operations will write to live database.';
  showToast(msg, mockMode ? 'info' : 'warning');
}

function updateMockModeUI() {
  const pill = document.getElementById('btn-mock-mode-toggle');
  const label = document.getElementById('mock-mode-label');
  
  if (mockMode) {
    pill.className = 'mock-mode-pill active';
    label.innerText = 'Mock Mode: Active';
  } else {
    pill.className = 'mock-mode-pill';
    label.innerText = 'Mock Mode: Disabled';
  }
}

// Lightbox modal details
function openLightbox(url, caption) {
  if (!url) return;
  const modal = document.getElementById('lightbox-modal');
  document.getElementById('lightbox-image').src = url;
  document.getElementById('lightbox-caption').innerText = caption;
  modal.classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox-modal').classList.remove('active');
}

// Toast System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
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
  lucide.createIcons();
  
  // Micro-interaction: slide-in trigger
  setTimeout(() => {
    toast.classList.add('active');
  }, 10);

  // Auto-remove toast after 4 seconds
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      toast.remove();
    }, 350);
  }, 4000);
}

// Global loader spinner visual feedback
function showLoading(isLoading) {
  const saveBtn = document.getElementById('btn-save-user');
  const deleteBtn = document.getElementById('btn-delete-profile');
  const saveSettingsBtn = document.getElementById('btn-save-settings');

  if (saveBtn) {
    saveBtn.disabled = isLoading;
    if (isLoading) saveBtn.innerHTML = 'Saving...';
    else saveBtn.innerHTML = 'Save Changes';
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = isLoading;
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.disabled = isLoading;
  }
}

// HTML XSS Escaping Helper
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
