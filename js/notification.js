
/* =========================================================
   NOTIFICATION SYSTEM
   ========================================================= */

let notificationRealtimeChannel = null;
let notificationToastContainer = null;
let notificationInitialized = false;
let notificationRefreshInterval = null;
let missedVisitCheckInterval = null;
let labDeliveryCheckInterval = null;
let notificationCleanupInterval = null;

// ── NEW: Realtime channels for source tables ──
let visitsRealtimeChannel = null;
let labWorksRealtimeChannel = null;
let inventoryRealtimeChannel = null;

let knownNotificationIds = new Set();
let notificationsFirstLoad = true;
let shownNotificationIds = new Set();


/* =========================================================
   TOAST CONTAINER
   ========================================================= */

function createNotificationToastContainer() {
    let container = document.getElementById("notificationToastContainer");
    if (container) {
        notificationToastContainer = container;
        return;
    }
    container = document.createElement("div");
    container.id = "notificationToastContainer";
    container.className = "notification-toast-container";
    document.body.appendChild(container);
    notificationToastContainer = container;
}


/* =========================================================
   NOTIFICATION SOUND
   ========================================================= */

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const audioContext = new AudioContext();
        if (audioContext.state === "suspended") {
            audioContext.close();
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.5);
    }
    catch (error) {
        console.warn("Notification sound unavailable:", error);
    }
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeNotificationHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   SHOW NOTIFICATION TOAST
   ========================================================= */

function showNotificationToast(notification) {
    if (!notification || !notification.id) {
        console.warn("⚠️ Invalid notification for toast:", notification);
        return;
    }

    if (shownNotificationIds.has(notification.id)) {
        console.log("ℹ️ Toast already shown:", notification.id);
        return;
    }

    shownNotificationIds.add(notification.id);
    createNotificationToastContainer();

    const type = notification.type || "";
    const toast = document.createElement("div");
    toast.className = "notification-toast";

    if (type === "expired_waiting_visit" || type === "missed_waiting_visit") {
        toast.classList.add("missed-visit-toast");
    }

    let icon = "fa-bell";
    if (type === "expired_waiting_visit" || type === "missed_waiting_visit") {
        icon = "fa-clock";
    }
    else if (type === "appointment_request") {
        icon = "fa-calendar-plus";
    }
    else if (type === "lab_delivery_due") {
        icon = "fa-gears";
    }
    else if (type === "low_stock") {
        icon = "fa-box-open";
    }

toast.innerHTML = `
        <div class="notification-toast-icon">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="notification-toast-content">
            <div class="notification-toast-title">
                ${escapeNotificationHTML(notification.title || `<span data-i18n="454">New Notification</span>`)}
            </div>
            <div class="notification-toast-message">
                ${escapeNotificationHTML(notification.message || "")}
            </div>
            <div class="notification-toast-time" data-i18n="455">الآن</div>
        </div>
        <button type="button" class="notification-toast-close" aria-label="Close" data-i18n-aria="456">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    notificationToastContainer.prepend(toast);
    console.log("🔔 TOAST SHOWN:", notification);
    playNotificationSound();

    let removed = false;
    function removeToast() {
        if (removed) return;
        removed = true;
        toast.classList.add("notification-toast-hide");
        setTimeout(() => toast.remove(), 350);
    }

    toast.addEventListener("click", removeToast);

    const closeButton = toast.querySelector(".notification-toast-close");
    if (closeButton) {
        closeButton.addEventListener("click", event => {
            event.stopPropagation();
            removeToast();
        });
    }

    setTimeout(removeToast, 5 * 60 * 1000);
}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatNotificationTime(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} min ago`;
    }
    if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    if (diff < 604800) {
        const days = Math.floor(diff / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


/* =========================================================
   LOAD NOTIFICATIONS
   ========================================================= */

async function loadNotifications() {
    try {
        const userId = await getUserId();
        if (!userId) {
            console.warn("Notifications: user not found");
            return;
        }

        await createLowStockNotifications();

        const { data, error } = await supabaseClient
            .from("notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("Notifications error:", error);
            return;
        }

        const notifications = data || [];
        console.log("🔔 Notifications loaded:", notifications.length);

        const unreadCount = notifications.filter(n => !n.is_read).length;
        const countElement = document.getElementById("notificationCount");
        if (countElement) {
            countElement.textContent = unreadCount;
            countElement.style.display = unreadCount > 0 ? "flex" : "none";
        }

        const container = document.getElementById("notificationsContainer");
        if (!container) {
            console.warn("notificationsContainer not found");
            return;
        }

        if (!notifications.length) {
            container.innerHTML = `
                <div class="no-notifications">
                    <i class="fa-regular fa-bell-slash"></i>
                    <span>No notifications</span>
                </div>
            `;
            return;
        }

        container.innerHTML = "";

        notifications.forEach(n => {
            const item = document.createElement("div");
            item.className = "notification-item";
            if (!n.is_read) item.classList.add("unread");
            item.dataset.notificationId = n.id;

            const icon = document.createElement("div");
            icon.className = "notification-icon";
            icon.innerHTML = `<i class="fa-solid fa-bell"></i>`;

            const content = document.createElement("div");
            content.className = "notification-content";

            const title = document.createElement("div");
            title.className = "notification-title";
            title.textContent = n.title || "New Notification";

            const message = document.createElement("div");
            message.className = "notification-message";
            message.textContent = n.message || "";

            const time = document.createElement("div");
            time.className = "notification-time";
            time.textContent = formatNotificationTime(n.created_at);

            content.appendChild(title);
            content.appendChild(message);
            content.appendChild(time);

            content.addEventListener("click", () => {
                openNotification(n.id, n.type, n.reference_id || null);
            });

            item.appendChild(icon);
            item.appendChild(content);

            if (!n.is_read) {
                const dot = document.createElement("span");
                dot.className = "notification-dot";
                item.appendChild(dot);
            }

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "delete-notification-btn";
            deleteButton.title = "Delete notification";
            deleteButton.innerHTML = `<i class="fa-solid fa-trash"></i>`;
            deleteButton.addEventListener("click", event => {
                event.stopPropagation();
                deleteNotification(n.id);
            });

            item.appendChild(deleteButton);
            container.appendChild(item);
        });

        console.log("✅ Notification list rendered:", notifications.length);
    }
    catch (error) {
        console.error("loadNotifications error:", error);
    }
}


/* =========================================================
   ADD / UPDATE / REMOVE NOTIFICATION IN LIST
   ========================================================= */

function addNotificationToList(n) {
    if (!n || !n.id) return;

    const container = document.getElementById("notificationsContainer");
    if (!container) return;

    const existing = container.querySelector(`[data-notification-id="${n.id}"]`);
    if (existing) return;

    const emptyMessage = container.querySelector(".no-notifications");
    if (emptyMessage) emptyMessage.remove();

    const item = document.createElement("div");
    item.className = "notification-item unread";
    item.dataset.notificationId = n.id;

    const icon = document.createElement("div");
    icon.className = "notification-icon";
    icon.innerHTML = `<i class="fa-solid fa-bell"></i>`;

    const content = document.createElement("div");
    content.className = "notification-content";

    const title = document.createElement("div");
    title.className = "notification-title";
    title.textContent = n.title || "New Notification";

    const message = document.createElement("div");
    message.className = "notification-message";
    message.textContent = n.message || "";

    const time = document.createElement("div");
    time.className = "notification-time";
    time.textContent = "Just now";

    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(time);

    content.addEventListener("click", () => {
        openNotification(n.id, n.type, n.reference_id || null);
    });

    const dot = document.createElement("span");
    dot.className = "notification-dot";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-notification-btn";
    deleteButton.title = "Delete notification";
    deleteButton.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    deleteButton.addEventListener("click", event => {
        event.stopPropagation();
        deleteNotification(n.id);
    });

    item.appendChild(icon);
    item.appendChild(content);
    item.appendChild(dot);
    item.appendChild(deleteButton);
    container.prepend(item);

    console.log("⚡ Notification added instantly:", n.id);
}

function updateNotificationInList(n) {
    if (!n || !n.id) return;

    const item = document.querySelector(`.notification-item[data-notification-id="${n.id}"]`);
    if (!item) return;

    if (n.is_read) {
        item.classList.remove("unread");
        const dot = item.querySelector(".notification-dot");
        if (dot) dot.remove();
    }
    else {
        item.classList.add("unread");
    }
}

function removeNotificationFromList(notificationId) {
    if (!notificationId) return;
    const item = document.querySelector(`.notification-item[data-notification-id="${notificationId}"]`);
    if (item) item.remove();
}


/* =========================================================
   UPDATE UNREAD COUNT
   ========================================================= */

async function updateNotificationCountRealtime() {
    const userId = await getUserId();
    if (!userId) return;

    const { count, error } = await supabaseClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) {
        console.error("Realtime notification count error:", error);
        return;
    }

    const countElement = document.getElementById("notificationCount");
    if (!countElement) return;

    countElement.textContent = count || 0;
    countElement.style.display = count > 0 ? "flex" : "none";
}


/* =========================================================
   OPEN NOTIFICATION  ←  CORE
   ========================================================= */

async function openNotification(notificationId, type, referenceId) {
    console.log("🖱️ openNotification clicked:", { notificationId, type, referenceId });

    const userId = await getUserId();
    if (!userId) return;

    await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

    updateNotificationInList({ id: notificationId, is_read: true });
    updateNotificationCountRealtime();

    const panel = document.getElementById("notificationsPanel");
    if (panel) panel.classList.remove("show");

    setTimeout(() => navigateToNotificationSource(type, referenceId), 150);
}


/* =========================================================
   REVEAL PATH (open details, tabs, hidden sections)
   ========================================================= */

function revealPath(element) {
    if (!element) return;
    let parent = element.parentElement;
    while (parent) {
        if (parent.tagName === 'DETAILS') parent.open = true;
        if (parent.classList.contains('hidden')) parent.classList.remove('hidden');
        if (parent.style.display === 'none') parent.style.display = '';
        parent = parent.parentElement;
    }
}


/* =========================================================
   HIGHLIGHT & SCROLL
   ========================================================= */

function highlightAndScroll(element) {
    if (!element) return false;

    console.log("✨ Highlighting element:", element);

    revealPath(element);

    // Force layout recalc then scroll
    element.getBoundingClientRect();
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Visual flash effect
    const originalTransition = element.style.transition;
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalTransform = element.style.transform;

    element.style.transition = 'all 0.4s ease';
    element.style.outline = '3px solid rgba(56,189,248,0.9)';
    element.style.outlineOffset = '4px';
    element.style.transform = 'scale(1.01)';
    element.style.borderRadius = '12px';

    setTimeout(() => {
        element.style.transition = originalTransition;
        element.style.outline = originalOutline;
        element.style.outlineOffset = originalOutlineOffset;
        element.style.transform = originalTransform;
        element.style.borderRadius = '';
    }, 3000);

    return true;
}


/* =========================================================
   FIND INVENTORY ITEM  ←  محسّن مع debugging
   ========================================================= */

function findInventoryItem(itemId) {
    console.log("🔍 findInventoryItem called with:", itemId, "type:", typeof itemId);

    if (!itemId) {
        console.warn("❌ itemId is empty");
        return null;
    }

    const strId = String(itemId).trim();
    const container = document.getElementById('inventoryContainer');

    console.log("📦 inventoryContainer exists:", !!container);

    // 1) Exact id match: lowThreshold-16
    let el = document.getElementById(`lowThreshold-${strId}`);
    console.log("🔎 By id 'lowThreshold-" + strId + "':", !!el);
    if (el) {
        const row = el.closest('.inventory-row');
        console.log("📍 Found row by closest('.inventory-row'):", !!row);
        if (row) return row;
    }

    // 2) Any input ending with -{id}
    el = document.querySelector(`input[id$="-${strId}"]`);
    console.log("🔎 By input[id$='-" + strId + "']:", !!el);
    if (el) {
        const row = el.closest('.inventory-row');
        if (row) return row;
    }

    // 3) Search inside inventoryContainer rows
    if (container) {
        const rows = container.querySelectorAll('.inventory-row');
        console.log("🔎 Total .inventory-row count:", rows.length);

        for (const row of rows) {
            // Check if row contains any element with id containing the itemId
            if (row.querySelector(`[id*="${strId}"]`)) {
                console.log("📍 Found row by inner id containing:", strId);
                return row;
            }
            // Check if row innerHTML contains the id
            if (row.innerHTML.includes(strId)) {
                console.log("📍 Found row by innerHTML containing:", strId);
                return row;
            }
        }
    }

    console.warn("❌ Could not find inventory row for itemId:", strId);
    return null;
}


/* =========================================================
   NAVIGATE TO INVENTORY
   ========================================================= */

function navigateToInventory(itemId) {
    console.log("🧭 navigateToInventory:", itemId);
    window.location.href = 'storage.html';
}


/* =========================================================
   NAVIGATE TO VISIT
   ========================================================= */

function navigateToVisit(visitId) {
    console.log("🧭 navigateToVisit:", visitId);
    window.location.href = 'dashboard.html#appointmentssContainer';
}


/* =========================================================
   NAVIGATE TO LAB WORK
   ========================================================= */

function navigateToLabWork(workId) {
    console.log("🧭 navigateToLabWork:", workId);

    const deliverySection = document.getElementById('deliveryReminders');

    if (deliverySection) {
        revealPath(deliverySection);
        deliverySection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        setTimeout(() => {
            highlightAndScroll(deliverySection);
        }, 300);
    } else {
        showToast('تم فتح قسم تسليمات المعمل', 'info');
    }
}


/* =========================================================
   NAVIGATE TO NOTIFICATION SOURCE  ←  SWITCH كامل
   ========================================================= */

function navigateToNotificationSource(type, referenceId) {
    console.log("🧭 navigateToNotificationSource:", { type, referenceId });

    switch (type) {
        case 'low_stock':
            navigateToInventory(referenceId);
            break;

        case 'lab_delivery_due':
            navigateToLabWork(referenceId);
            break;

        case 'expired_waiting_visit':
        case 'missed_waiting_visit':
        case 'visit_time_started':
            navigateToVisit(referenceId);
            break;

        case 'appointment_request': {
            window.location.href = 'dashboard.html#appointmentRequestsSection';
            break;
        }

        default:
            console.log('No navigator for type:', type);
    }
}

/* =========================================================
   DELETE NOTIFICATION
   ========================================================= */

async function deleteNotification(notificationId) {
    if (!notificationId) return;

    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabaseClient
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (error) {
        console.error("Delete notification error:", error);
        return;
    }

    knownNotificationIds.delete(String(notificationId));
    removeNotificationFromList(notificationId);
    await loadNotifications();
}


/* =========================================================
   MARK ONE AS READ
   ========================================================= */

async function markNotificationRead(notificationId) {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);

    if (error) {
        console.error("Mark notification read error:", error);
        return;
    }

    updateNotificationInList({ id: notificationId, is_read: true });
    updateNotificationCountRealtime();
}


/* =========================================================
   MARK ALL AS READ
   ========================================================= */

async function markAllNotificationsRead() {
    const userId = await getUserId();
    if (!userId) return;

    const { error } = await supabaseClient
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

    if (error) {
        console.error("Mark all notifications error:", error);
        return;
    }

    document.querySelectorAll(".notification-item.unread").forEach(item => {
        item.classList.remove("unread");
        const dot = item.querySelector(".notification-dot");
        if (dot) dot.remove();
    });

    const countElement = document.getElementById("notificationCount");
    if (countElement) {
        countElement.textContent = "0";
        countElement.style.display = "none";
    }
}


/* =========================================================
   TOGGLE NOTIFICATION PANEL
   ========================================================= */

function toggleNotifications() {
    const panel = document.getElementById("notificationsPanel");
    if (!panel) return;
    panel.classList.toggle("show");
    if (panel.classList.contains("show")) {
        loadNotifications();
    }
}

document.addEventListener("click", event => {
    const wrapper = document.querySelector(".notification-wrapper");
    const panel = document.getElementById("notificationsPanel");
    if (!wrapper || !panel) return;
    if (!wrapper.contains(event.target)) {
        panel.classList.remove("show");
    }
});


/* =========================================================
   CHECK EXPIRED WAITING VISITS
   ========================================================= */

async function checkMissedWaitingVisits() {
    console.log("🔎 CHECKING WAITING VISITS...");

    try {
        const userId = await getUserId();
        if (!userId) {
            console.warn("❌ No userId");
            return;
        }

        const lang = userPreferences?.language || "ar";
        const t = translations?.[lang] || {};

        const now = new Date();

        const { data: visits, error } = await supabaseClient
            .from("patient_visits")
            .select(`
                id,
                patient_id,
                patient_name,
                patient_phone,
                user_id,
                appointment_start,
                appointment_end,
                visit_result,
                is_deleted,
                patients(id, full_name)
            `)
            .eq("user_id", userId)
            .eq("visit_result", "waiting")
            .eq("is_deleted", false)
            .not("appointment_start", "is", null);

        if (error) {
            console.error("❌ Visits query error:", error);
            return;
        }

        if (!visits || !visits.length) return;

        const startedVisits = visits.filter(visit => {
            const startTime = new Date(visit.appointment_start);
            return !isNaN(startTime.getTime()) && startTime <= now;
        });

        console.log("🟡 WAITING VISITS THAT HAVE STARTED:", startedVisits);

        for (const visit of startedVisits) {
            const endTime = visit.appointment_end ? new Date(visit.appointment_end) : null;
            const hasEnded = endTime && !isNaN(endTime.getTime()) && endTime <= now;

            const notificationType = hasEnded ? "expired_waiting_visit" : "visit_time_started";

            const { data: existing } = await supabaseClient
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", notificationType)
                .eq("reference_id", visit.id);

            if (existing && existing.length > 0) continue;

            const patientName = visit.patients?.full_name || visit.patient_name || (t["386"] || "Unknown Patient");

            let title, message;
            if (hasEnded) {
                title = t["460"] || "Visit Requires Attention";
                message = (t["461"] || "The scheduled visit for {name} has ended and is still waiting.").replace("{name}", patientName);
            }
            else {
                title = t["462"] || "Visit Time Started";
                message = (t["463"] || "The scheduled visit for {name} has started and no visit result has been recorded yet.").replace("{name}", patientName);
            }

            const { data: notification, error: insertError } = await supabaseClient
                .from("notifications")
                .insert({
                    user_id: userId,
                    type: notificationType,
                    title: title,
                    message: message,
                    reference_id: visit.id,
                    is_read: false
                })
                .select()
                .single();

            if (insertError) {
                console.error("❌ Notification INSERT error:", insertError);
                continue;
            }

            console.log("✅ NOTIFICATION CREATED:", notification);
            showNotificationToast(notification);
            await loadNotifications();
        }
    }
    catch (error) {
        console.error("❌ checkMissedWaitingVisits ERROR:", error);
    }
}


/* =========================================================
   CHECK LAB DELIVERIES DUE TODAY
   ========================================================= */

async function checkLabDeliveriesToday() {
    console.log("🔎 CHECKING LAB DELIVERIES DUE TODAY...");

    try {
        const userId = await getUserId();
        if (!userId) {
            console.warn("❌ No userId for lab delivery check");
            return;
        }

        const lang = userPreferences?.language || "ar";
        const t = translations?.[lang] || {};

        const today = new Date().toLocaleDateString("en-CA");
        console.log("📅 TODAY:", today);

        const { data: works, error } = await supabaseClient
            .from("lab_works")
            .select("id, user_id, lab_id, work_name, work_type, patient_name, delivery_date, received")
            .eq("user_id", userId)
            .eq("delivery_date", today)
            .eq("received", false);

        if (error) {
            console.error("❌ Lab deliveries query error:", error);
            return;
        }

        if (!works || !works.length) {
            console.log("📦 No lab deliveries due today");
            return;
        }

        console.log("📦 LAB DELIVERIES DUE TODAY:", works);

        for (const work of works) {
            const { data: existing } = await supabaseClient
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", "lab_delivery_due")
                .eq("reference_id", work.id);

            if (existing && existing.length > 0) {
                console.log("ℹ️ Lab notification already exists:", work.id);
                continue;
            }

            const patientName = work.patient_name || (t["386"] || "Unknown Patient");
            const workName = work.work_name || work.work_type || (t["467"] || "Lab Work");

            const title = t["465"] || "Lab Delivery Due Today";
            const message = (t["466"] || "{workName} for {patientName} is due today and has not been received.")
                .replace("{workName}", workName)
                .replace("{patientName}", patientName);

            const { data: notification, error: insertError } = await supabaseClient
                .from("notifications")
                .insert({
                    user_id: userId,
                    type: "lab_delivery_due",
                    title: title,
                    message: message,
                    reference_id: work.id,
                    is_read: false
                })
                .select()
                .single();

            if (insertError) {
                console.error("❌ Lab notification INSERT error:", insertError);
                continue;
            }

            console.log("✅ LAB NOTIFICATION CREATED:", notification);
            await loadNotifications();
        }
    }
    catch (error) {
        console.error("❌ checkLabDeliveriesToday ERROR:", error);
    }
}


/* =========================================================
   CHECK LOW STOCK
   ========================================================= */

async function createLowStockNotifications() {
    const userId = await getUserId();
    if (!userId) return;

    try {
        const lang = userPreferences?.language || "ar";
        const t = translations?.[lang] || {};

        const { data: items, error } = await supabaseClient
            .from("inventory_items")
            .select("id, item_name, quantity, low_stock_threshold")
            .eq("user_id", userId);

        if (error) {
            console.error("Low stock check error:", error);
            return;
        }

        if (!items?.length) return;

        const lowStockItems = items.filter(item => {
            const quantity = Number(item.quantity || 0);
            const threshold = Number(item.low_stock_threshold || 0);
            return quantity <= threshold;
        });

        if (!lowStockItems.length) return;

        for (const item of lowStockItems) {
            const { data: existing } = await supabaseClient
                .from("notifications")
                .select("id")
                .eq("user_id", userId)
                .eq("type", "low_stock")
                .eq("reference_id", item.id)
                .limit(1);

            if (existing?.length) continue;

            const title = t["468"] || "Low Stock";
            const message = (t["469"] || "{itemName} is low in stock. Current quantity: {quantity}")
                .replace("{itemName}", item.item_name)
                .replace("{quantity}", Number(item.quantity || 0));

            const { error: insertError } = await supabaseClient
                .from("notifications")
                .insert({
                    user_id: userId,
                    type: "low_stock",
                    title: title,
                    message: message,
                    reference_id: item.id,
                    is_read: false
                });

            if (insertError) {
                console.error("Low stock notification insert error:", insertError);
            }
        }
    }
    catch (error) {
        console.error("createLowStockNotifications error:", error);
    }
}
/* =========================================================
   CLEANUP EXPIRED NOTIFICATIONS
   ========================================================= */

async function cleanupExpiredNotifications() {
    const userId = await getUserId();
    if (!userId) return;

    try {
        const { data: notifications, error } = await supabaseClient
            .from("notifications")
            .select("id, type, reference_id")
            .eq("user_id", userId)
            .eq("is_read", false);

        if (error || !notifications?.length) return;

        for (const n of notifications) {
            let shouldDelete = false;

            switch (n.type) {
                case "expired_waiting_visit":
                case "missed_waiting_visit":
                case "visit_time_started": {
                    const { data: visit } = await supabaseClient
                        .from("patient_visits")
                        .select("visit_result, is_deleted")
                        .eq("id", n.reference_id)
                        .single();

                    if (!visit || visit.is_deleted || visit.visit_result !== "waiting") {
                        shouldDelete = true;
                    }
                    break;
                }

                case "lab_delivery_due": {
                    const { data: work } = await supabaseClient
                        .from("lab_works")
                        .select("received")
                        .eq("id", n.reference_id)
                        .single();

                    if (!work || work.received) {
                        shouldDelete = true;
                    }
                    break;
                }

                case "low_stock": {
                    const { data: item } = await supabaseClient
                        .from("inventory_items")
                        .select("quantity, low_stock_threshold")
                        .eq("id", n.reference_id)
                        .single();

                    if (!item || Number(item.quantity) > Number(item.low_stock_threshold)) {
                        shouldDelete = true;
                    }
                    break;
                }
            }

            if (shouldDelete) {
                await supabaseClient
                    .from("notifications")
                    .delete()
                    .eq("id", n.id)
                    .eq("user_id", userId);

                removeNotificationFromList(n.id);
                knownNotificationIds.delete(String(n.id));
                console.log("🗑️ Auto-deleted expired notification:", n.id, n.type);
            }
        }

        updateNotificationCountRealtime();
    }
    catch (err) {
        console.error("Cleanup notifications error:", err);
    }
}


/* =========================================================
   REALTIME — Notifications table
   ========================================================= */

async function startNotificationRealtime() {
    const userId = await getUserId();
    if (!userId) {
        console.log("❌ Notification realtime: user not found");
        return;
    }

    if (notificationRealtimeChannel) {
        try {
            await supabaseClient.removeChannel(notificationRealtimeChannel);
        }
        catch (error) {
            console.error("Remove old notification channel error:", error);
        }
        notificationRealtimeChannel = null;
    }

    const channelName = "notifications-" + userId + "-" + Date.now();

    notificationRealtimeChannel = supabaseClient
        .channel(channelName)
        .on("postgres_changes", {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`
        }, async payload => {
            console.log("🔔 REALTIME INSERT:", payload.new);
            showNotificationToast(payload.new);
            addNotificationToList(payload.new);
            updateNotificationCountRealtime();
        })
        .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`
        }, async payload => {
            console.log("🔄 REALTIME UPDATE:", payload.new);
            updateNotificationInList(payload.new);
            updateNotificationCountRealtime();
        })
        .on("postgres_changes", {
            event: "DELETE",
            schema: "public",
            table: "notifications"
        }, async payload => {
            console.log("🗑️ REALTIME DELETE:", payload.old);
            removeNotificationFromList(payload.old.id);
            updateNotificationCountRealtime();
        })
        .subscribe(status => {
            console.log("🔔 Notification Realtime status:", status);
            if (status === "SUBSCRIBED") console.log("✅ Notification Realtime CONNECTED");
            if (status === "CHANNEL_ERROR") console.error("❌ Notification Realtime CHANNEL ERROR");
            if (status === "TIMED_OUT") console.error("⏱️ Notification Realtime TIMED OUT");
            if (status === "CLOSED") console.warn("⚠️ Notification Realtime CLOSED");
        });
}


/* =========================================================
   REALTIME — Source tables (auto-remove when cause gone)
   ========================================================= */

async function startSourceRealtime() {
    const userId = await getUserId();
    if (!userId) return;

    // ── 1. patient_visits ──
    if (visitsRealtimeChannel) {
        try { await supabaseClient.removeChannel(visitsRealtimeChannel); } catch(e){}
        visitsRealtimeChannel = null;
    }
    visitsRealtimeChannel = supabaseClient
        .channel("patient_visits_changes_" + Date.now())
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "patient_visits",
            filter: `user_id=eq.${userId}`
        }, async () => {
            console.log("🔄 patient_visits changed → running cleanup");
            await cleanupExpiredNotifications();
        })
        .subscribe();

    // ── 2. lab_works ──
    if (labWorksRealtimeChannel) {
        try { await supabaseClient.removeChannel(labWorksRealtimeChannel); } catch(e){}
        labWorksRealtimeChannel = null;
    }
    labWorksRealtimeChannel = supabaseClient
        .channel("lab_works_changes_" + Date.now())
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "lab_works",
            filter: `user_id=eq.${userId}`
        }, async () => {
            console.log("🔄 lab_works changed → running cleanup");
            await cleanupExpiredNotifications();
        })
        .subscribe();

    // ── 3. inventory_items ──
    if (inventoryRealtimeChannel) {
        try { await supabaseClient.removeChannel(inventoryRealtimeChannel); } catch(e){}
        inventoryRealtimeChannel = null;
    }
    inventoryRealtimeChannel = supabaseClient
        .channel("inventory_items_changes_" + Date.now())
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "inventory_items",
            filter: `user_id=eq.${userId}`
        }, async () => {
            console.log("🔄 inventory_items changed → running cleanup");
            await cleanupExpiredNotifications();
        })
        .subscribe();
}

async function stopSourceRealtime() {
    if (visitsRealtimeChannel) {
        try { await supabaseClient.removeChannel(visitsRealtimeChannel); } catch(e){}
        visitsRealtimeChannel = null;
    }
    if (labWorksRealtimeChannel) {
        try { await supabaseClient.removeChannel(labWorksRealtimeChannel); } catch(e){}
        labWorksRealtimeChannel = null;
    }
    if (inventoryRealtimeChannel) {
        try { await supabaseClient.removeChannel(inventoryRealtimeChannel); } catch(e){}
        inventoryRealtimeChannel = null;
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initNotifications() {
    if (notificationInitialized) return;
    notificationInitialized = true;

    try {
        createNotificationToastContainer();
        await loadNotifications();
        await startNotificationRealtime();
        await startSourceRealtime();   // ← NEW
        console.log("🔔 Notification system initialized");
    }
    catch (error) {
        console.error("Notification initialization error:", error);
    }
}

async function stopNotificationRealtime() {
    if (notificationRealtimeChannel) {
        try {
            await supabaseClient.removeChannel(notificationRealtimeChannel);
        }
        catch (error) {
            console.error("Stop notification realtime error:", error);
        }
        notificationRealtimeChannel = null;
    }
    await stopSourceRealtime();   // ← NEW
}


/* =========================================================
   AUTO REFRESH
   ========================================================= */

function startNotificationAutoRefresh() {
    stopNotificationAutoRefresh();

    notificationRefreshInterval = setInterval(loadNotifications, 5000);
    missedVisitCheckInterval = setInterval(checkMissedWaitingVisits, 5000);
    labDeliveryCheckInterval = setInterval(checkLabDeliveriesToday, 5000);
    notificationCleanupInterval = setInterval(cleanupExpiredNotifications, 5000); // ← was 10000

    checkMissedWaitingVisits();
    checkLabDeliveriesToday();
    cleanupExpiredNotifications();
}

function stopNotificationAutoRefresh() {
    if (notificationRefreshInterval) {
        clearInterval(notificationRefreshInterval);
        notificationRefreshInterval = null;
    }
    if (missedVisitCheckInterval) {
        clearInterval(missedVisitCheckInterval);
        missedVisitCheckInterval = null;
    }
    if (labDeliveryCheckInterval) {
        clearInterval(labDeliveryCheckInterval);
        labDeliveryCheckInterval = null;
    }
    if (notificationCleanupInterval) {
        clearInterval(notificationCleanupInterval);
        notificationCleanupInterval = null;
    }
}


/* =========================================================
   GLOBAL TOAST SYSTEM
   ========================================================= */

function showToast(message, type = "success", duration = 3000) {
    let container = document.getElementById("globalToastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "globalToastContainer";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `global-toast ${type}`;

    let icon = "fa-solid fa-check";
    if (type === "error") icon = "fa-solid fa-circle-exclamation";
    else if (type === "warning") icon = "fa-solid fa-triangle-exclamation";
    else if (type === "info") icon = "fa-solid fa-circle-info";

    toast.innerHTML = `
        <div class="global-toast-icon"><i class="${icon}"></i></div>
        <div class="global-toast-message">${message}</div>
        <button class="global-toast-close" onclick="this.parentElement.remove()" type="button">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 300);
    }, duration);
}


/* =========================================================
   MORE MENU
   ========================================================= */

function toggleMoreMenu() {
    const overlay = document.getElementById("moreMenuOverlay");
    if (!overlay) return;
    overlay.classList.toggle("open");
    document.body.classList.toggle("more-menu-open", overlay.classList.contains("open"));
}

function closeMoreMenu(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.getElementById("moreMenuOverlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("more-menu-open");
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMoreMenu();
});

document.addEventListener("click", event => {
    const link = event.target.closest(".more-menu-item");
    if (link) closeMoreMenu();
});


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    initNotifications();
    startNotificationAutoRefresh();
});