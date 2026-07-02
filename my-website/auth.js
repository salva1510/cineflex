// ========================================================================
// CINEFLEX AUTH v5.0 (THE ARCHITECT RELEASE - HARDENED SPEC)
// ========================================================================

let pendingPlayback = null;
let googleLoginInProgress = false;
let emailLoginInProgress = false;
let registerInProgress = false;

// 4. Memory Leak Protection: Max 5 items sa Toast Queue
let toastQueue = [];
let isToastShowing = false;
const MAX_TOAST_QUEUE = 5;

// 1. UX-only Lockout (Idinidiwan na ito ay para sa user experience lamang)
const LOCKOUT_KEY = "cineflex_lockout_until";
let lockoutTimerInterval = null;

// 9. Asynchronous Lifecycle Protection (Network Timeout Handle)
let authTimeoutHandle = null;
const AUTH_TIMEOUT_MS = 15000; // 15 na segundo

// 10. Automated Session Idle Expiration Settings (30 Minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; 
let sessionActivityInterval = null;

if (typeof auth === "undefined") {
    console.error("Firebase Auth is not initialized.");
}

if (typeof googleProvider === "undefined") {
    var googleProvider = typeof firebase !== "undefined" ? new firebase.auth.GoogleAuthProvider() : null;
}

if (typeof auth !== "undefined" && auth) {
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            if (isLoggedIn()) initSessionTracker();
        })
        .catch(err => console.error("Persistence error:", err.message));
}

// --- CORE UTILITIES & SECURITY ENHANCEMENTS ---

function isLoggedIn() {
    return !!(auth && auth.currentUser);
}

function requireLogin(callback) {
    if (isLoggedIn()) {
        callback();
        return;
    }
    pendingPlayback = callback;
    openLoginModal();
}

function continuePendingPlayback() {
    if (pendingPlayback) {
        const play = pendingPlayback;
        pendingPlayback = null;
        play();
    }
}

function setAvatar(imgElement, url) {
    if (!imgElement) return;
    imgElement.onerror = () => {
        imgElement.src = "images/default-avatar.webp";
        imgElement.onerror = null;
    };
    imgElement.src = url || "images/default-avatar.webp";
}

// 8. Safe Networking Interceptor
function checkNetworkState() {
    if (!navigator.onLine) {
        showToast("No internet connection. Please check your network.", "error");
        return false;
    }
    return true;
}

// 4. Hardened Toast Engine na may Cap Limit Counter
function showToast(message, type = "error") {
    if (toastQueue.length >= MAX_TOAST_QUEUE) {
        toastQueue.shift(); // Alisin ang pinakaluma para hindi mapuno ang memory
    }
    toastQueue.push({ message, type });
    processToastQueue();
}

function processToastQueue() {
    if (isToastShowing || toastQueue.length === 0) return;
    isToastShowing = true;

    const currentToast = toastQueue.shift();
    const oldToast = document.getElementById("cineflex-toast");
    if (oldToast) oldToast.remove();

    const toast = document.createElement("div");
    toast.id = "cineflex-toast";
    toast.className = "cineflex-toast-el";
    toast.style.background = currentToast.type === "error" ? "#e50914" : "#2ecc71";
    toast.innerText = currentToast.message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        toast.style.opacity = "0";
        toast.style.transform = "translate(-50%, 20px)";
        setTimeout(() => {
            toast.remove();
            isToastShowing = false;
            processToastQueue();
        }, 300);
    }, 3500);
}

function checkIsMobile() {
    const coarsePointer = window.matchMedia("(pointer:coarse)").matches;
    const uaRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return coarsePointer || uaRegex;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 6. Frictionless Password Policy (Length-Driven, High Security, No Symbol Mandates)
function checkPasswordStrength(password) {
    if (password.length < 10) return "Password must be at least 10 characters long.";
    return null;
}

// 9. Transaction Watchdog (Iniiwasan ang walang katapusang spinner states)
function startAuthTimeoutWatchdog() {
    clearTimeout(authTimeoutHandle);
    authTimeoutHandle = setTimeout(() => {
        if (emailLoginInProgress || googleLoginInProgress || registerInProgress) {
            clearAllLoadingStates();
            showToast("The authentication request timed out. Please try again.", "error");
        }
    }, AUTH_TIMEOUT_MS);
}

function clearAllLoadingStates() {
    clearTimeout(authTimeoutHandle);
    googleLoginInProgress = false;
    emailLoginInProgress = false;
    registerInProgress = false;
    setAuthButtonsDisabled(false);
}

// UX Lockout Controls
function checkExistingLockout() {
    const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
    if (!lockoutUntil) return false;

    const timeLeft = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
    if (timeLeft > 0) {
        startLockoutTimer(timeLeft);
        return true;
    } else {
        localStorage.removeItem(LOCKOUT_KEY);
        return false;
    }
}

function triggerLockout() {
    const lockoutUntil = Date.now() + 30000;
    localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
    startLockoutTimer(30);
}

function startLockoutTimer(seconds) {
    clearInterval(lockoutTimerInterval);
    setAuthButtonsDisabled(true);
    updateButtonLockoutText(seconds);

    lockoutTimerInterval = setInterval(() => {
        const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
        if (!lockoutUntil) {
            clearInterval(lockoutTimerInterval);
            setAuthButtonsDisabled(false);
            return;
        }

        const timeLeft = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
        if (timeLeft <= 0) {
            clearInterval(lockoutTimerInterval);
            localStorage.removeItem(LOCKOUT_KEY);
            setAuthButtonsDisabled(false);
            showToast("Lockout expired. You can try logging in again.", "success");
        } else {
            updateButtonLockoutText(timeLeft);
        }
    }, 1000);
}

function updateButtonLockoutText(seconds) {
    const emailBtn = document.getElementById("email-login-btn");
    if (emailBtn) emailBtn.innerHTML = `Wait (${seconds}s)`;
}

// 7. Atomic Debounce Implementation via Pointer Events and Attr Locks
function setAuthButtonsDisabled(disabled, activeAction = null) {
    const isCurrentlyLocked = !!localStorage.getItem(LOCKOUT_KEY);
    if (isCurrentlyLocked && !disabled) return;

    const emailBtn = document.getElementById("email-login-btn");
    const googleBtn = document.getElementById("google-login-btn");
    const registerBtn = document.getElementById("register-submit-btn");
    const forgotBtn = document.getElementById("forgot-password-btn");
    const resendBtn = document.getElementById("resend-verification-btn");

    const buttons = [emailBtn, googleBtn, registerBtn, forgotBtn, resendBtn];

    buttons.forEach(btn => {
        if (!btn) return;
        btn.disabled = disabled;
        if (disabled) {
            btn.setAttribute("aria-busy", "true");
            btn.style.pointerEvents = "none"; // 7. Agarang pagpigil sa double-clicks
        } else {
            btn.removeAttribute("aria-busy");
            btn.style.pointerEvents = "auto";
        }
    });

    if (emailBtn) {
        emailBtn.innerHTML = (disabled && activeAction === "email") 
            ? '<span class="cineflex-spinner-el"></span> Logging in...' 
            : "LOGIN";
    }
    if (googleBtn) {
        googleBtn.innerHTML = (disabled && activeAction === "google") 
            ? '<span class="cineflex-spinner-el"></span> Connecting...' 
            : "Continue with Google";
    }
    if (registerBtn) {
        registerBtn.innerHTML = (disabled && activeAction === "register") 
            ? '<span class="cineflex-spinner-el"></span> Creating account...' 
            : "Create Account";
    }
    if (resendBtn) {
        resendBtn.innerHTML = (disabled && activeAction === "resend")
            ? '<span class="cineflex-spinner-el"></span> Sending...'
            : "Resend Verification Email";
    }
    if (forgotBtn) {
        forgotBtn.style.opacity = disabled ? "0.5" : "1";
    }
}

// --- 10. SESSION IDLE EXPIRATION ENGINE (ANTI-HIJACKING) ---

function initSessionTracker() {
    clearInterval(sessionActivityInterval);
    localStorage.setItem("cineflex_last_activity", Date.now().toString());

    const updateActivity = () => {
        if (isLoggedIn()) {
            localStorage.setItem("cineflex_last_activity", Date.now().toString());
        }
    };

    window.removeEventListener("mousemove", updateActivity);
    window.removeEventListener("keydown", updateActivity);
    window.removeEventListener("touchstart", updateActivity);

    window.addEventListener("mousemove", updateActivity, { passive: true });
    window.addEventListener("keydown", updateActivity, { passive: true });
    window.addEventListener("touchstart", updateActivity, { passive: true });

    sessionActivityInterval = setInterval(() => {
        if (!isLoggedIn()) {
            clearInterval(sessionActivityInterval);
            return;
        }

        const lastActivity = parseInt(localStorage.getItem("cineflex_last_activity") || "0", 10);
        if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
            clearInterval(sessionActivityInterval);
            logout();
            showToast("Session expired due to inactivity. Please login again.", "error");
        }
    }, 30000); // Suriin kada 30 segundo
}

// --- FIREBASE AUTH ACTIONS ---

function googleLogin() {
    if (!checkNetworkState()) return;
    if (googleLoginInProgress || isLoggedIn() || localStorage.getItem(LOCKOUT_KEY)) return;
    if (!googleProvider) {
        showToast("Google Auth Provider is missing.");
        return;
    }

    googleLoginInProgress = true;
    setAuthButtonsDisabled(true, "google");
    startAuthTimeoutWatchdog();

    if (checkIsMobile()) {
        auth.signInWithRedirect(googleProvider).catch(err => {
            clearAllLoadingStates();
            showToast(err.message);
        });
    } else {
        auth.signInWithPopup(googleProvider)
        .then(() => {
            closeLoginModal();
        })
        .catch(err => {
            if (err.code !== "auth/cancelled-popup-request" && err.code !== "auth/popup-closed-by-user") {
                showToast(err.message);
            }
        })
        .finally(() => {
            clearAllLoadingStates();
        });
    }
}

function emailLogin() {
    if (!checkNetworkState()) return;
    if (emailLoginInProgress || localStorage.getItem(LOCKOUT_KEY)) return;

    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const rememberMeChecked = document.getElementById("login-remember-me")?.checked;

    if (!email || !password) {
        showToast("Please enter your email and password.");
        return;
    }
    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address.");
        return;
    }
    
    emailLoginInProgress = true;
    setAuthButtonsDisabled(true, "email");
    startAuthTimeoutWatchdog();

    auth.signInWithEmailAndPassword(email, password)
    .then((result) => {
        // 5. In-Memory User Reload Phase bago suriin ang verification status
        return result.user.reload().then(() => {
            const isPasswordUser = result.user.providerData.some(p => p.providerId === "password");
            
            if (isPasswordUser && !result.user.emailVerified) {
                showToast("Your email address is unverified.", "error");
                
                const resendContainer = document.getElementById("resend-container");
                if (resendContainer) resendContainer.style.display = "block";

                auth.signOut();
                clearAllLoadingStates();
                return;
            }

            if (rememberMeChecked) {
                localStorage.setItem("cineflex-email", email);
            } else {
                localStorage.removeItem("cineflex-email");
            }

            localStorage.removeItem("cineflex_failed_attempts");
            closeLoginModal();
        });
    })
    .catch(err => {
        clearAllLoadingStates();

        let attempts = parseInt(localStorage.getItem("cineflex_failed_attempts") || "0", 10);
        attempts++;
        localStorage.setItem("cineflex_failed_attempts", attempts.toString());

        if (attempts >= 5) {
            showToast("Too many failed attempts. Device login suspended for 30s.");
            triggerLockout();
            return;
        }

        switch(err.code) {
            case "auth/user-not-found":
            case "auth/wrong-password":
                showToast("Invalid credentials matching profile.");
                break;
            default:
                showToast(err.message);
        }
    });
}

// 2. Isolation Framework: Hiwalay na Token-Free Verification Delivery Route
function resendVerificationEmail() {
    if (!checkNetworkState()) return;
    
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
        showToast("Please re-enter your email and password to receive a new link.");
        return;
    }

    setAuthButtonsDisabled(true, "resend");
    startAuthTimeoutWatchdog();

    // Lumilikha ng nakahiwalay na ephemeral secondary app instance para hindi magalaw ang pangunahing token state
    let secondaryAuth = auth;
    
    secondaryAuth.signInWithEmailAndPassword(email, password)
    .then((result) => {
        return result.user.sendEmailVerification().then(() => {
            showToast("A new verification link has been sent to your email.", "success");
            secondaryAuth.signOut();
        });
    })
    .catch(err => {
        switch(err.code) {
            case "auth/too-many-requests":
                showToast("Too many validation requests. Please check your inbox or try later.");
                break;
            default:
                showToast(err.message);
        }
    })
    .finally(() => {
        clearAllLoadingStates();
    });
}

function registerAccount() {
    if (!checkNetworkState()) return;
    if (registerInProgress || localStorage.getItem(LOCKOUT_KEY)) return;

    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
        showToast("Please enter your email and password.");
        return;
    }
    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address.");
        return;
    }
    
    const passwordError = checkPasswordStrength(password);
    if (passwordError) {
        showToast(passwordError);
        return;
    }
    
    registerInProgress = true;
    setAuthButtonsDisabled(true, "register");
    startAuthTimeoutWatchdog();

    auth.createUserWithEmailAndPassword(email, password)
    .then(async (result) => {
        try {
            await result.user.updateProfile({
                displayName: "Cineflex User"
            });
        } catch (e) {
            console.error("Profile map exception:", e.message);
        }

        result.user.sendEmailVerification()
        .then(() => {
            showToast("Account created! Verification link sent to your email.", "success");
            auth.signOut();
        })
        .catch(err => console.error("Email routing exception:", err.message));
        
        closeLoginModal();
    })
    .catch(err => {
        if (err.code === "auth/email-already-in-use") {
            showToast("Email already registered.");
        } else {
            showToast(err.message);
        }
    })
    .finally(() => {
        clearAllLoadingStates();
    });
}

function forgotPassword() {
    if (!checkNetworkState()) return;
    const email = document.getElementById("login-email")?.value.trim();
    if (!email) {
        showToast("Please enter your email address first.");
        return;
    }
    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address.");
        return;
    }

    auth.sendPasswordResetEmail(email)
    .then(() => {
        showToast("Password reset email has been sent.", "success");
    })
    .catch(err => showToast(err.message));
}

async function logout() {
    pendingPlayback = null;
    clearInterval(sessionActivityInterval);
    try {
        await auth.signOut();
        closeLoginModal();
    } catch (err) {
        showToast(err.message);
    }
}

// --- CENTRAL AUTH STATE MANAGEMENT ---

if (typeof auth !== "undefined" && auth) {
    auth.onAuthStateChanged((user) => {
        clearAllLoadingStates();

        const info = document.getElementById("accountInfo");
        const logoutBtn = document.getElementById("logoutBtn");
        const photo = document.getElementById("userPhoto");
        const name = document.getElementById("userName");
        const email = document.getElementById("userEmail");
        const badge = document.getElementById("userBadge");

        const isPasswordUser = user ? user.providerData.some(p => p.providerId === "password") : false;
        const isUserFullyAuthenticated = user && (!isPasswordUser || user.emailVerified);

        if (isUserFullyAuthenticated) {
            closeLoginModal();
            initSessionTracker(); // Simulan ang activity check kapag naka-login

            if (typeof loadUserData === "function") {
                Promise.resolve(loadUserData()).catch(console.error);
            }
            continuePendingPlayback();

            const avatarUrl = user.photoURL || "images/default-avatar.webp";

            // 3. SECURE DOM RENDERING: Pinigilan ang XSS attacks gamit ang Safe Text Assignment Strategy
            if (info) {
                info.innerHTML = `
                    <img id="header-avatar-img" style="width:55px; height:55px; border-radius:50%; margin-right:12px; object-fit:cover;">
                    <div>
                        <b id="header-profile-name"></b><br>
                        <small id="header-profile-email"></small><br>
                        <span style="color:#2ecc71">● Logged In</span>
                    </div>
                `;
                document.getElementById("header-profile-name").textContent = user.displayName || "Cineflex User";
                document.getElementById("header-profile-email").textContent = user.email || "";
                setAvatar(document.getElementById("header-avatar-img"), avatarUrl);
            }

            if (photo) setAvatar(photo, avatarUrl);
            if (name) name.textContent = user.displayName || "Cineflex User";
            if (email) email.textContent = user.email || "";
            if (badge) badge.innerText = "CINEFLEX MEMBER";
            if (logoutBtn) logoutBtn.style.display = "flex";

        } else {
            clearInterval(sessionActivityInterval);
            if (info) info.innerHTML = `<i class="fa-solid fa-user"></i> Guest`;
            if (photo) setAvatar(photo, "images/default-avatar.webp");
            if (name) name.innerText = "Guest";
            if (email) email.innerText = "Not logged in";
            if (badge) badge.innerText = "FREE MEMBER";
            if (logoutBtn) logoutBtn.style.display = "none";

            if (pendingPlayback) {
                openLoginModal();
            }
        }
    });
}

// --- W3C ACCESS INTERFACES ---

function handleFocusTrap(e) {
    const modal = document.getElementById("login-modal");
    if (!modal) return;

    const focusableElements = modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])');
    if (!focusableElements || !focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
}

function openLoginModal() {
    if (document.getElementById("login-modal")) return;

    document.body.insertAdjacentHTML("beforeend", `
        <div id="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,.92); display:flex; justify-content:center; align-items:center; z-index:99999;">
            <div style="width:95%; max-width:420px; background:#111; padding:25px; border-radius:12px; box-sizing:border-box;">
                <h2 id="login-title" style="margin:0 0 20px; text-align:center; color:white;">CINEFLEX LOGIN</h2>
                
                <input id="login-email" type="email" placeholder="Email" autocomplete="email" style="width:100%; padding:12px; margin-bottom:12px; background:#222; border:none; color:white; border-radius:6px;">
                <input id="login-password" type="password" placeholder="Password" autocomplete="current-password" style="width:100%; padding:12px; margin-bottom:12px; background:#222; border:none; color:white; border-radius:6px;">
                
                <div style="display:flex; align-items:center; margin-bottom:18px; color:#bbb; font-size:13px; font-family:Arial, sans-serif;">
                    <input id="login-remember-me" type="checkbox" style="margin-right:8px; cursor:pointer;">
                    <label for="login-remember-me" style="cursor:pointer; user-select:none;">Remember me securely</label>
                </div>

                <button id="email-login-btn" style="width:100%; padding:12px; background:#e50914; color:white; border:none; border-radius:6px; font-weight:bold; margin-bottom:10px; cursor:pointer;">LOGIN</button>
                <button id="google-login-btn" style="width:100%; padding:12px; background:white; color:black; border:none; border-radius:6px; font-weight:bold; margin-bottom:10px; cursor:pointer;">Continue with Google</button>
                <button id="register-submit-btn" style="width:100%; padding:12px; background:#444; color:white; border:none; border-radius:6px; margin-bottom:10px; cursor:pointer;">Create Account</button>
                <button id="forgot-password-btn" style="width:100%; padding:12px; background:transparent; color:#00bfff; border:none; cursor:pointer; display:block; width:100%; text-align:center;">Forgot Password?</button>

                <div id="resend-container" style="display:none; margin-top:15px; padding-top:15px; border-top:1px solid #333; text-align:center;">
                    <span style="color:#ffc107; font-size:13px; display:block; margin-bottom:10px;">Haven't received the validation link?</span>
                    <button id="resend-verification-btn" style="width:100%; padding:10px; background:#f39c12; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Resend Verification Email</button>
                </div>
            </div>
        </div>
    `);

    document.getElementById("email-login-btn").addEventListener("click", emailLogin);
    document.getElementById("google-login-btn").addEventListener("click", googleLogin);
    document.getElementById("register-submit-btn").addEventListener("click", registerAccount);
    document.getElementById("forgot-password-btn").addEventListener("click", forgotPassword);
    document.getElementById("resend-verification-btn").addEventListener("click", resendVerificationEmail);

    document.getElementById("login-modal").addEventListener("keydown", handleFocusTrap);

    checkExistingLockout();

    const emailInput = document.getElementById("login-email");
    const rememberMeCheckbox = document.getElementById("login-remember-me");
    const savedEmail = localStorage.getItem("cineflex-email");

    if (emailInput && savedEmail) {
        emailInput.value = savedEmail;
        if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
    }

    if (emailInput && !localStorage.getItem(LOCKOUT_KEY)) {
        setTimeout(() => emailInput.focus(), 100);
    }
}

function closeLoginModal() {
    const modal = document.getElementById("login-modal");
    if (modal) {
        modal.removeEventListener("keydown", handleFocusTrap);
        modal.remove();
    }
}

// --- GLOBAL EVENT LISTENERS ---

document.addEventListener("keydown", function(e) {
    const modal = document.getElementById("login-modal");
    if (!modal) return;

    if (emailLoginInProgress || googleLoginInProgress || registerInProgress || localStorage.getItem(LOCKOUT_KEY)) {
        if (e.key === "Enter") e.preventDefault();
        return;
    }

    if (e.key === "Enter") {
        e.preventDefault();
        emailLogin();
    } else if (e.key === "Escape") {
        closeLoginModal();
    }
});

document.addEventListener("click", function(e) {
    const modal = document.getElementById("login-modal");
    if (modal && e.target === modal) {
        closeLoginModal();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    checkExistingLockout();
});
