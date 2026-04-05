// Data

const AUTH_TOKEN_KEY = "authToken";
const API_BASE_URL =
  document.querySelector('meta[name="api-base-url"]')?.content?.trim() ||
  window.location.origin;
const API_ROUTES = {
  register: "/api/register",
  login: "/api/login",
  profile: "/api/profile",
  adminDashboard: "/api/admin/dashboard",
  accounts: "/api/accounts",
  departments: "/api/departments",
  employees: "/api/employees",
  requests: "/api/requests",
  requestsMe: "/api/requests/me",
  guestContent: "/api/content/guest",
};

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function setOutputText(elementId, value) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

let currentUser = null;

// Authentication States

function setAuthState(isAuthenticated, user = null) {
  currentUser = user;

  if (isAuthenticated && user) {
    document.body.classList.remove("not-authenticated");
    document.body.classList.add("authenticated");
    document.body.classList.toggle("is-admin", user.role === "admin");

    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.username || user.email || "User";

    const currentUserNameEl = document.getElementById("currentUserName");
    if (currentUserNameEl) currentUserNameEl.textContent = displayName;
  } else {
    document.body.classList.remove("authenticated", "is-admin");
    document.body.classList.add("not-authenticated");
    const nameEl = document.getElementById("currentUserName");
    if (nameEl) nameEl.textContent = "";
  }
}

function getAuthHeader() {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function checkAuthOnLoad() {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;

  try {
    const response = await fetch(apiUrl(API_ROUTES.profile), {
      headers: getAuthHeader(),
    });

    if (!response.ok) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthState(false);
      return;
    }

    const data = await response.json();
    setAuthState(true, data.user);
  } catch (error) {
    console.error("Profile load error", error);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthState(false);
  }
}

// Routing

const routes = {
  "": "home-page",
  "/": "home-page",
  "/register": "register-page",
  "/verify-email": "verification-page",
  "/login": "login-page",
  "/profile": "profile-page",
  "/admin-dashboard": "admin-dashboard-page",
  "/requests": "requests-page",
  "/accounts": "accounts-page",
  "/departments": "departments-page",
  "/employees": "employees-page",
};

function navigateTo(hash) {
  if (!hash.startsWith("#")) hash = "#" + hash;
  window.location.hash = hash;
}

function getDefaultAuthenticatedRoute(user) {
  return user?.role === "admin" ? "/admin-dashboard" : "/profile";
}

function handleRouting() {
  let hash = (window.location.hash || "#/").replace("#", "").toLowerCase();
  if (hash === "") hash = "/";

  // If user is already logged in, keep them away from the public home page.
  if (hash === "/" && currentUser) {
    return navigateTo(getDefaultAuthenticatedRoute(currentUser));
  }

  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));

  const protectedRoutes = [
    "/profile",
    "/admin-dashboard",
    "/requests",
    "/accounts",
    "/departments",
    "/employees",
  ];
  const isProtected = protectedRoutes.some((p) => hash.startsWith(p));
  if (isProtected && !currentUser) {
    showToast("Please login first", "warning");
    return navigateTo("/login");
  }

  const adminRoutes = [
    "/admin-dashboard",
    "/accounts",
    "/departments",
    "/employees",
  ];
  const isAdminRoute = adminRoutes.some((p) => hash.startsWith(p));
  if (isAdminRoute && (!currentUser || currentUser.role !== "admin")) {
    showToast("Admin access only", "danger");
    return navigateTo("/profile");
  }

  const pageId = routes[hash] || "home-page";
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");

  if (pageId === "profile-page") renderProfile();
  if (pageId === "admin-dashboard-page") renderAdminDashboard();
  if (pageId === "verification-page") renderVerification();
  if (pageId === "requests-page") renderRequests();
  if (pageId === "accounts-page") renderAccounts();
  if (pageId === "departments-page") renderDepartments();
  if (pageId === "employees-page") renderEmployees();
}

window.addEventListener("hashchange", handleRouting);
window.addEventListener("load", async () => {
  configureAuthFields();
  await checkAuthOnLoad();
  if (!window.location.hash) navigateTo("/");
  handleRouting();
});

document.getElementById("btnLoadGuestContent")?.addEventListener("click", async () => {
  try {
    setOutputText("guestContentOutput", "Loading...");
    const response = await fetch(apiUrl(API_ROUTES.guestContent));
    const data = await response.json();

    if (!response.ok) {
      setOutputText("guestContentOutput", data);
      return showToast(data.error || "Failed to load guest content", "danger");
    }

    setOutputText("guestContentOutput", data);
    showToast("Guest content loaded", "success");
  } catch (error) {
    console.error("Guest content error", error);
    setOutputText("guestContentOutput", { error: "Network error" });
    showToast("Network error", "danger");
  }
});

function configureAuthFields() {
  const registerInput = document.getElementById("registerEmail");
  const loginInput = document.getElementById("loginEmail");
  const verifyTitle = document.querySelector("#verification-page h3");
  const verifyText = document.querySelector("#verification-page .alert");
  const verifyPrompt = document.querySelector("#verification-page p");
  const verifyButton = document.getElementById("btnSimulateVerify");

  if (registerInput) {
    registerInput.type = "text";
    registerInput.placeholder = "Choose a username";
    const label = registerInput.nextElementSibling;
    if (label) label.textContent = "Username";
  }

  if (loginInput) {
    loginInput.type = "text";
    loginInput.placeholder = "Enter your username";
    const label = loginInput.nextElementSibling;
    if (label) label.textContent = "Username";
  }

  if (verifyTitle) verifyTitle.textContent = "Registration Complete";
  if (verifyText) {
    verifyText.innerHTML =
      'Your account for <strong><span id="verifyEmailDisplay"></span></strong> has been created.';
  }
  if (verifyPrompt) {
    verifyPrompt.textContent = "You can now continue to the login page.";
  }
  if (verifyButton) verifyButton.style.display = "none";
}

// Toast

function showToast(message, type = "info") {
  const bg =
    {
      success: "bg-success text-white",
      danger: "bg-danger text-white",
      warning: "bg-warning text-dark",
      info: "bg-info text-white",
    }[type] || "bg-info text-white";

  const toast = document.createElement("div");
  toast.className = `toast align-items-center ${bg} border-0`;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.querySelector(".toast-container").appendChild(toast);
  new bootstrap.Toast(toast, { autohide: true, delay: 3500 }).show();
}

// Register
document
  .getElementById("registerForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) return form.classList.add("was-validated");

    const data = new FormData(form);
    const username = String(data.get("registerEmail") || "")
      .trim()
      .toLowerCase();
    const password = String(data.get("registerPassword") || "");
    const firstName = String(data.get("registerFirstName") || "").trim();
    const lastName = String(data.get("registerLastName") || "").trim();

    try {
      const response = await fetch(apiUrl(API_ROUTES.register), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, firstName, lastName }),
      });

      const result = await response.json();

      if (!response.ok) {
        return showToast(result.error || "Registration failed", "danger");
      }

      document.getElementById("verifyEmailDisplay").textContent = username;
      showToast("Registration successful. You can now log in.", "success");
      form.reset();
      navigateTo("/verify-email");
    } catch (error) {
      console.error("Registration error", error);
      showToast("Network error", "danger");
    }
  });

// verification

document.getElementById("btnSimulateVerify")?.addEventListener("click", () => {
  navigateTo("/login");
});

function renderVerification() {
  const el = document.getElementById("verifyEmailDisplay");
  if (el && !el.textContent.trim()) {
    el.textContent = "your account";
  }
}

// login

document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!form.checkValidity()) return form.classList.add("was-validated");

  const data = new FormData(form);
  const username = String(data.get("loginEmail") || "")
    .trim()
    .toLowerCase();
  const password = String(data.get("loginPassword") || "");

  try {
    const response = await fetch(apiUrl(API_ROUTES.login), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return showToast(result.error || "Login failed", "danger");
    }

    sessionStorage.setItem(AUTH_TOKEN_KEY, result.token);
    setAuthState(true, result.user);
    showToast(`Welcome, ${result.user.username}!`, "success");
    navigateTo(getDefaultAuthenticatedRoute(result.user));
  } catch (error) {
    console.error("Login error", error);
    showToast("Network error", "danger");
  }
});

// logout

document.getElementById("btnLogout")?.addEventListener("click", (e) => {
  e.preventDefault();
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  setAuthState(false);
  showToast("Logged out", "info");
  navigateTo("/");
});

// profile

function renderProfile() {
  if (!currentUser) return;
  const safeFirst = String(currentUser.firstName || "").trim();
  const safeLast = String(currentUser.lastName || "").trim();
  const fallbackName =
    safeFirst || safeLast
      ? `${safeFirst} ${safeLast}`.trim()
      : currentUser.username || currentUser.email || "User";

  document.getElementById("profileName").textContent =
    fallbackName;
  document.getElementById("profileEmail").textContent =
    currentUser.email || currentUser.username || "—";
  document.getElementById("profileRole").textContent =
    String(currentUser.role || "user").toUpperCase();
}

async function renderAdminDashboard() {
  // Admin-only route; routing layer already verifies `currentUser.role === "admin"`.
  if (!currentUser) return;

  const statUsers = document.getElementById("adminStatUsers");
  const statEmployees = document.getElementById("adminStatEmployees");
  const statDepartments = document.getElementById("adminStatDepartments");
  const statRequests = document.getElementById("adminStatRequests");

  try {
    const response = await fetch(apiUrl(API_ROUTES.adminDashboard), {
      headers: getAuthHeader(),
    });
    const data = await response.json();

    if (!response.ok) {
      return showToast(data.error || "Failed to load dashboard", "danger");
    }

    if (statUsers) statUsers.textContent = String(data.totalUsers ?? 0);
    if (statEmployees)
      statEmployees.textContent = String(data.totalEmployees ?? 0);
    if (statDepartments)
      statDepartments.textContent = String(data.totalDepartments ?? 0);
    if (statRequests)
      statRequests.textContent = String(data.totalRequests ?? 0);
  } catch (error) {
    console.error("Admin dashboard error", error);
    showToast("Network error", "danger");
  }
}

document.getElementById("btnLoadAdminDashboard")?.addEventListener("click", async () => {
  if (!currentUser) {
    return showToast("Please login first", "warning");
  }

  try {
    setOutputText("adminDashboardOutput", "Loading...");
    const response = await fetch(apiUrl(API_ROUTES.adminDashboard), {
      headers: getAuthHeader(),
    });
    const data = await response.json();

    if (!response.ok) {
      setOutputText("adminDashboardOutput", data);
      return showToast(data.error || "Failed to load admin dashboard", "danger");
    }

    setOutputText("adminDashboardOutput", data);
    showToast("Admin dashboard loaded", "success");
  } catch (error) {
    console.error("Admin dashboard error", error);
    setOutputText("adminDashboardOutput", { error: "Network error" });
    showToast("Network error", "danger");
  }
});

// profile edit

function openProfileModal() {
  if (!currentUser) return;

  const modalEl = document.getElementById("profileModal");
  const form = document.getElementById("profileForm");
  if (!modalEl || !form) return;

  form.classList.remove("was-validated");
  form.reset();

  form.elements.firstName.value = currentUser.firstName || "";
  form.elements.lastName.value = currentUser.lastName || "";
  form.elements.email.value = currentUser.email || "";
  form.elements.password.value = "";

  const modal =
    bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}

document.getElementById("btnEditProfile")?.addEventListener("click", (e) => {
  e.preventDefault();
  showToast("Profile editing not yet implemented", "info");
});

// request

async function renderRequests() {
  if (!currentUser) return;
  const tbody = document.querySelector("#requestsTable tbody");
  tbody.innerHTML = "";

  try {
    const response = await fetch(apiUrl(API_ROUTES.requestsMe), {
      headers: getAuthHeader(),
    });
    const userReqs = await response.json();

    if (!response.ok) {
      return showToast(userReqs.error || "Failed to load requests", "danger");
    }

    state.requests = userReqs;

    if (userReqs.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center py-4">No requests yet.</td></tr>';
      return;
    }

    userReqs.forEach((req) => {
      const badgeClass =
        {
          Pending: "bg-warning text-dark",
          Approved: "bg-success",
          Rejected: "bg-danger",
        }[req.status] || "bg-secondary";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(req.date).toLocaleDateString()}</td>
        <td>${req.type}</td>
        <td>${req.items.map((i) => `${i.name} (${i.qty})`).join(", ")}</td>
        <td><span class="badge ${badgeClass}">${req.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Requests load error", error);
    showToast("Network error", "danger");
  }
}

document.getElementById("btnAddItem")?.addEventListener("click", () => {
  const container = document.getElementById("itemsContainer");
  const row = document.createElement("div");
  row.className = "request-item-row input-group mb-2";
  row.innerHTML = `
    <input type="text" class="form-control" placeholder="Item name" name="itemName[]" required>
    <input type="number" class="form-control" placeholder="Qty" name="itemQty[]" min="1" style="max-width:90px;" required>
    <button type="button" class="btn btn-outline-danger btn-remove-item">×</button>
  `;
  container.appendChild(row);
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-remove-item")) {
    e.target.closest(".request-item-row")?.remove();
  }
});

document.getElementById("btnSubmitRequest")?.addEventListener("click", async () => {
  const form = document.getElementById("newRequestForm");
  if (!form.checkValidity()) return form.classList.add("was-validated");

  const data = new FormData(form);
  const type = data.get("type");
  const names = data.getAll("itemName[]");
  const qtys = data.getAll("itemQty[]");

  const items = names
    .map((n, i) => ({
      name: n.trim(),
      qty: Number(qtys[i]),
    }))
    .filter((it) => it.name && it.qty > 0);

  if (items.length === 0) return showToast("Add at least one item", "warning");

  try {
    const response = await fetch(apiUrl(API_ROUTES.requests), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ type, items }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return showToast(result.error || "Failed to submit request", "danger");
    }

    bootstrap.Modal.getInstance(
      document.getElementById("newRequestModal"),
    ).hide();
    form.reset();
    document.getElementById("itemsContainer").innerHTML = `
      <div class="request-item-row input-group mb-2">
        <input type="text" class="form-control" placeholder="Item name" name="itemName[]" required>
        <input type="number" class="form-control" placeholder="Qty" name="itemQty[]" min="1" style="max-width:90px;" required>
        <button type="button" class="btn btn-outline-danger btn-remove-item">×</button>
      </div>
    `;
    showToast("Request submitted", "success");
    await renderRequests();
  } catch (error) {
    console.error("Request submit error", error);
    showToast("Network error", "danger");
  }
});

// accounts

async function renderAccounts() {
  const tbody = document.querySelector("#accountsTable tbody");
  tbody.innerHTML = "";

  try {
    const response = await fetch(apiUrl(API_ROUTES.accounts), {
      headers: getAuthHeader(),
    });
    const accounts = await response.json();

    if (!response.ok) {
      return showToast(accounts.error || "Failed to load accounts", "danger");
    }

    state.accounts = accounts;

    accounts.forEach((acc) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${acc.firstName} ${acc.lastName}</td>
      <td>${acc.email}</td>
      <td>${acc.role}</td>
      <td>${acc.verified ? "Yes" : "No"}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-edit-acc" data-id="${
          acc.id
        }">Edit</button>
        <button class="btn btn-sm btn-outline-warning btn-reset-pw" data-id="${
          acc.id
        }">Reset PW</button>
        <button class="btn btn-sm btn-outline-danger btn-delete-acc" data-id="${
          acc.id
        }">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  } catch (error) {
    console.error("Accounts load error", error);
    showToast("Network error", "danger");
  }
}

// accounts CRUD

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function openAccountModal(acc = null) {
  const modalEl = document.getElementById("accountModal");
  const modal =
    bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  const form = document.getElementById("accountForm");

  form.reset();
  form.classList.remove("was-validated");

  const pwHint = document.getElementById("accountPwHint");
  document.getElementById("accountModalLabel").textContent = acc
    ? "Edit Account"
    : "Add Account";

  // When adding, password is required; when editing, leave blank to keep.
  form.elements.password.required = !acc;
  if (pwHint) pwHint.textContent = acc ? "(leave blank to keep)" : "(min 6)";

  if (acc) {
    document.getElementById("accountId").value = acc.id;
    form.elements.firstName.value = acc.firstName || "";
    form.elements.lastName.value = acc.lastName || "";
    form.elements.email.value = acc.email || "";
    form.elements.role.value = acc.role || "employee";
    form.elements.verified.checked = Boolean(acc.verified);
  } else {
    document.getElementById("accountId").value = "";
    form.elements.role.value = "employee";
    form.elements.verified.checked = false;
  }

  modal.show();
}
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-reset-pw")) {
    const id = e.target.dataset.id;

    document.getElementById("resetAccountId").value = id;
    document.getElementById("resetNewPassword").value = "";

    const modal = new bootstrap.Modal(
      document.getElementById("resetPasswordModal"),
    );
    modal.show();
  }
});
document
  .getElementById("btnConfirmResetPassword")
  ?.addEventListener("click", async () => {
    const id = document.getElementById("resetAccountId").value;
    const newPass = document.getElementById("resetNewPassword").value.trim();

    if (newPass.length < 6) {
      return showToast("Password must be at least 6 characters", "warning");
    }

    const response = await fetch(apiUrl(`${API_ROUTES.accounts}/${id}/password`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ password: newPass }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return showToast(payload.error || "Password reset failed", "danger");
    }

    bootstrap.Modal.getInstance(
      document.getElementById("resetPasswordModal"),
    ).hide();

    showToast("Password reset successfully", "success");
    await renderAccounts();
  });
document.getElementById("btnAddAccount")?.addEventListener("click", () => {
  openAccountModal(null);
});

document.getElementById("btnSaveAccount")?.addEventListener("click", async () => {
  const form = document.getElementById("accountForm");
  if (!form.checkValidity()) return form.classList.add("was-validated");

  const formData = new FormData(form);
  const id = String(formData.get("id") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "employee");
  const verified = form.elements.verified.checked;

  try {
    if (!id) {
      if (password.length < 6) {
        return showToast(
          "Password must be at least 6 characters",
          "warning",
        );
      }

      const response = await fetch(apiUrl(API_ROUTES.accounts), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role,
          verified,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return showToast(payload.error || "Account creation failed", "danger");
      }

      showToast("Account created", "success");
      forceCloseModalSafe("accountModal");
      await renderAccounts();
      if (document.getElementById("employees-page")?.classList.contains("active"))
        await renderEmployees();
      if (document.getElementById("requests-page")?.classList.contains("active"))
        await renderRequests();
      return;
    }

    // Edit
    const payload = {
      firstName,
      lastName,
      email,
      role,
      verified,
    };

    if (password.trim()) {
      if (password.length < 6) {
        return showToast(
          "Password must be at least 6 characters",
          "warning",
        );
      }
      payload.password = password;
    }

    const response = await fetch(apiUrl(`${API_ROUTES.accounts}/${id}`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return showToast(result.error || "Account update failed", "danger");
    }

    // Update UI state if editing the currently logged-in account.
    if (currentUser && String(currentUser.id) === String(id)) {
      currentUser.firstName = result.firstName;
      currentUser.lastName = result.lastName;
      currentUser.email = result.email;
      currentUser.username = result.email;
      currentUser.role = result.role;
      currentUser.verified = result.verified;
      document.getElementById("currentUserName").textContent = `${result.firstName} ${result.lastName}`;
      document.body.classList.toggle("is-admin", result.role === "admin");
    }

    showToast("Account updated", "success");
    forceCloseModalSafe("accountModal");
    await renderAccounts();
    if (document.getElementById("employees-page")?.classList.contains("active"))
      await renderEmployees();
    if (document.getElementById("requests-page")?.classList.contains("active"))
      await renderRequests();
  } catch (error) {
    console.error("Account save error", error);
    showToast("Network error", "danger");
  }
});

function forceCloseModalSafe(modalId) {
  const el = document.getElementById(modalId);
  if (!el) return;
  const instance = bootstrap.Modal.getInstance(el);
  if (instance) instance.hide();

  // Cleanup: prevents stuck dark backdrop in edge cases
  document.body.classList.remove("modal-open");
  document.querySelectorAll(".modal-backdrop").forEach((b) => b.remove());
  document.body.style.removeProperty("padding-right");
}

async function resetAccountPassword(accId) {
  const acc = state.accounts.find((a) => a.id === accId);
  if (!acc) return showToast("Account not found", "danger");

  const newPw = prompt(`Enter new password for ${acc.email} (min 6 chars):`);
  if (newPw === null) return; // cancelled
  if (String(newPw).length < 6)
    return showToast("Password must be at least 6 characters", "warning");

  const response = await fetch(apiUrl(`${API_ROUTES.accounts}/${accId}/password`), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ password: newPw }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return showToast(payload.error || "Password reset failed", "danger");
  }

  showToast("Password updated", "success");
  await renderAccounts();
}

async function deleteAccount(accId) {
  const acc = state.accounts.find((a) => a.id === accId);
  if (!acc) return showToast("Account not found", "danger");

  if (
    currentUser &&
    normalizeEmail(currentUser.email) === normalizeEmail(acc.email)
  ) {
    return showToast(
      "You cannot delete your own account while logged in.",
      "warning",
    );
  }

  // Prevent deleting the last remaining admin (avoid locking the system)
  if (acc.role === "admin") {
    const adminCount = state.accounts.filter((a) => a.role === "admin").length;
    if (adminCount <= 1) {
      return showToast(
        "You cannot delete the last remaining admin account.",
        "warning",
      );
    }
  }

  if (
    !confirm(
      `Delete account: ${acc.email}? This will also remove related employee records and requests.`,
    )
  )
    return;

  try {
    const response = await fetch(
      apiUrl(`${API_ROUTES.accounts}/${accId}`),
      {
        method: "DELETE",
        headers: getAuthHeader(),
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return showToast(payload.error || "Account deletion failed", "danger");
    }

    await renderAccounts();
    // If currently viewing employees/requests, refresh those tables
    if (document.getElementById("employees-page")?.classList.contains("active"))
      await renderEmployees();
    if (document.getElementById("requests-page")?.classList.contains("active"))
      await renderRequests();

    showToast("Account deleted", "info");
  } catch (error) {
    console.error("Account delete error", error);
    showToast("Network error", "danger");
  }
}

// departments CRUD

async function renderDepartments() {
  const tbody = document.querySelector("#departmentsTable tbody");
  tbody.innerHTML = "";
  try {
    const response = await fetch(apiUrl(API_ROUTES.departments), {
      headers: getAuthHeader(),
    });
    const departments = await response.json();

    if (!response.ok) {
      return showToast(departments.error || "Failed to load departments", "danger");
    }

    state.departments = departments;

    departments.forEach((dept) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dept.name}</td>
        <td>${dept.description || "—"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-edit-dept" data-id="${
            dept.id
          }">Edit</button>
          <button class="btn btn-sm btn-outline-danger btn-delete-dept" data-id="${
            dept.id
          }">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Departments load error", error);
    showToast("Network error", "danger");
  }
}

function openDepartmentModal(dept = null) {
  const modalEl = document.getElementById("departmentModal");
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById("departmentForm");
  form.reset();

  document.getElementById("departmentModalLabel").textContent = dept
    ? "Edit Department"
    : "Add Department";

  if (dept) {
    document.getElementById("deptId").value = dept.id;
    form.elements.name.value = dept.name;
    form.elements.description.value = dept.description || "";
  } else {
    document.getElementById("deptId").value = "";
  }

  modal.show();
}

document
  .getElementById("btnAddDepartment")
  ?.addEventListener("click", () => openDepartmentModal());

document.getElementById("btnSaveDepartment")?.addEventListener("click", async () => {
  const form = document.getElementById("departmentForm");
  if (!form.checkValidity()) return form.classList.add("was-validated");

  const data = new FormData(form);
  const id = String(data.get("id") || "");
  const name = String(data.get("name") || "").trim();
  const description = String(data.get("description") || "").trim();

  try {
    if (id) {
      const response = await fetch(
        apiUrl(`${API_ROUTES.departments}/${id}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({ name, description }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return showToast(
          payload.error || "Department update failed",
          "danger",
        );
      }
    } else {
      const response = await fetch(apiUrl(API_ROUTES.departments), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ name, description }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return showToast(
          payload.error || "Department creation failed",
          "danger",
        );
      }
    }

    await renderDepartments();
    if (document.getElementById("employees-page")?.classList.contains("active"))
      await renderEmployees();

    bootstrap.Modal.getInstance(
      document.getElementById("departmentModal"),
    ).hide();
    showToast(id ? "Department updated" : "Department created", "success");
    forceCloseModalSafe("departmentModal");
  } catch (error) {
    console.error("Department save error", error);
    showToast("Network error", "danger");
  }
});

// employees crud

function populateEmployeeDropdowns() {
  const userSel = document.getElementById("selectUserEmail");
  const deptSel = document.getElementById("selectDept");

  userSel.innerHTML = '<option value="">Select user...</option>';
  state.accounts
    .filter((a) => a.role !== "admin")
    .forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a.email;
      opt.textContent = `${a.firstName} ${a.lastName} (${a.email})`;
      userSel.appendChild(opt);
    });

  deptSel.innerHTML = '<option value="">Select department...</option>';
  state.departments.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.name;
    deptSel.appendChild(opt);
  });
}

async function renderEmployees() {
  const tbody = document.querySelector("#employeesTable tbody");
  tbody.innerHTML = "";

  try {
    const [employeesRes, accountsRes, departmentsRes] = await Promise.all([
      fetch(apiUrl(API_ROUTES.employees), { headers: getAuthHeader() }),
      fetch(apiUrl(API_ROUTES.accounts), { headers: getAuthHeader() }),
      fetch(apiUrl(API_ROUTES.departments), { headers: getAuthHeader() }),
    ]);

    const [employees, accounts, departments] = await Promise.all([
      employeesRes.json(),
      accountsRes.json(),
      departmentsRes.json(),
    ]);

    if (!employeesRes.ok) {
      return showToast(employees.error || "Failed to load employees", "danger");
    }
    // If accounts/departments fail, show a generic error.
    if (!accountsRes.ok || !departmentsRes.ok) {
      return showToast("Failed to load supporting data", "danger");
    }

    state.employees = employees;
    state.accounts = accounts;
    state.departments = departments;

    employees.forEach((emp) => {
      const user = accounts.find((a) => a.email === emp.userEmail) || {};
      const dept =
        departments.find((d) => d.id === emp.departmentId) || {};

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${emp.employeeId}</td>
        <td>${user.firstName || ""} ${user.lastName || ""}<br><small>${
          emp.userEmail
        }</small></td>
        <td>${emp.position}</td>
        <td>${dept.name || "—"}</td>
        <td>${
          emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : "—"
        }</td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-edit-emp" data-id="${
            emp.id
          }">Edit</button>
          <button class="btn btn-sm btn-outline-danger btn-delete-emp" data-id="${
            emp.id
          }">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Employees load error", error);
    showToast("Network error", "danger");
  }
}

function openEmployeeModal(emp = null) {
  const modalEl = document.getElementById("employeeModal");
  const modal = new bootstrap.Modal(modalEl);
  const form = document.getElementById("employeeForm");
  form.reset();

  document.getElementById("employeeModalLabel").textContent = emp
    ? "Edit Employee"
    : "Add Employee";
  populateEmployeeDropdowns();

  if (emp) {
    document.getElementById("empId").value = emp.id;
    form.elements.employeeId.value = emp.employeeId;
    form.elements.userEmail.value = emp.userEmail;
    form.elements.position.value = emp.position;
    form.elements.departmentId.value = emp.departmentId;
    form.elements.hireDate.value = emp.hireDate || "";
  } else {
    document.getElementById("empId").value = "";
  }

  modal.show();
}

document
  .getElementById("btnAddEmployee")
  ?.addEventListener("click", () => openEmployeeModal());

document.getElementById("btnSaveEmployee")?.addEventListener("click", async () => {
  const form = document.getElementById("employeeForm");
  if (!form.checkValidity()) return form.classList.add("was-validated");

  const data = new FormData(form);
  const id = data.get("id");
  const employeeId = data.get("employeeId").trim();
  const userEmail = data.get("userEmail");

  const payload = {
    employeeId,
    userEmail,
    position: data.get("position").trim(),
    departmentId: data.get("departmentId"),
    hireDate: data.get("hireDate"),
  };

  try {
    const response = id
      ? await fetch(apiUrl(`${API_ROUTES.employees}/${id}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        })
      : await fetch(apiUrl(API_ROUTES.employees), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return showToast(result.error || "Employee save failed", "danger");
    }

    await renderEmployees();
  bootstrap.Modal.getInstance(document.getElementById("employeeModal")).hide();
  showToast(id ? "Employee updated" : "Employee added", "success");
  } catch (error) {
    console.error("Employee save error", error);
    showToast("Network error", "danger");
  }
});

// event delegation for edit/delete

document.addEventListener("click", (e) => {
  const t = e.target;

  // Accounts
  if (t.classList.contains("btn-edit-acc")) {
    const id = t.dataset.id;
    const acc = state.accounts.find((a) => a.id === id);
    if (acc) openAccountModal(acc);
  }
  if (t.classList.contains("btn-reset-acc")) {
    const id = t.dataset.id;
    resetAccountPassword(id);
  }
  if (t.classList.contains("btn-delete-acc")) {
    const id = t.dataset.id;
    deleteAccount(id);
  }

  // Departments
  if (t.classList.contains("btn-edit-dept")) {
    const id = t.dataset.id;
    const dept = state.departments.find((d) => d.id === id);
    if (dept) openDepartmentModal(dept);
  }
  if (t.classList.contains("btn-delete-dept")) {
    const id = t.dataset.id;
    if (!confirm("Delete department?")) return;
    (async () => {
      try {
        const response = await fetch(
          apiUrl(`${API_ROUTES.departments}/${id}`),
          {
            method: "DELETE",
            headers: getAuthHeader(),
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return showToast(payload.error || "Department deletion failed", "danger");
        }

        await renderDepartments();
        if (document.getElementById("employees-page")?.classList.contains("active"))
          await renderEmployees();
        showToast("Department deleted", "info");
      } catch (error) {
        console.error("Department delete error", error);
        showToast("Network error", "danger");
      }
    })();
  }

  // Employees
  if (t.classList.contains("btn-edit-emp")) {
    const id = t.dataset.id;
    const emp = state.employees.find((e) => e.id === id);
    if (emp) openEmployeeModal(emp);
  }
  if (t.classList.contains("btn-delete-emp")) {
    const id = t.dataset.id;
    if (!confirm("Delete employee record?")) return;
    (async () => {
      try {
        const response = await fetch(apiUrl(`${API_ROUTES.employees}/${id}`), {
          method: "DELETE",
          headers: getAuthHeader(),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          return showToast(payload.error || "Employee deletion failed", "danger");
        }

        await renderEmployees();
        showToast("Employee record deleted", "info");
      } catch (error) {
        console.error("Employee delete error", error);
        showToast("Network error", "danger");
      }
    })();
  }
});
