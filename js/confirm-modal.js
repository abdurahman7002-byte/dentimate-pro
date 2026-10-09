/* =========================================================
   DENTIX PRO — UNIFIED CONFIRM MODAL
   Replaces all native confirm() dialogs
========================================================= */

(function() {
    'use strict';

    /* ---------------------------------------------------------
       Create modal HTML if not exists
    --------------------------------------------------------- */
    if (!document.getElementById('dentixConfirmModal')) {
        const modalHTML = `
            <div id="dentixConfirmModal" class="dcm-overlay" style="display:none;">
                <div class="dcm-panel" onclick="event.stopPropagation()">
                    <div class="dcm-icon-wrap">
                        <i class="fa-solid fa-circle-question"></i>
                    </div>
                    <h3 class="dcm-title">تأكيد العملية</h3>
                    <p class="dcm-message" id="dcmMessage">هل أنت متأكد؟</p>
                    <div class="dcm-actions">
                        <button type="button" class="dcm-btn dcm-cancel" id="dcmCancel">
                            <i class="fa-solid fa-xmark"></i>
                            <span>إلغاء</span>
                        </button>
                        <button type="button" class="dcm-btn dcm-confirm" id="dcmConfirm">
                            <i class="fa-solid fa-check"></i>
                            <span>تأكيد</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHTML;
        document.body.appendChild(wrapper.firstElementChild);
    }

    let resolvePromise = null;

    const overlay = document.getElementById('dentixConfirmModal');
    const messageEl = document.getElementById('dcmMessage');
    const confirmBtn = document.getElementById('dcmConfirm');
    const cancelBtn = document.getElementById('dcmCancel');

    /* ---------------------------------------------------------
       Close & resolve
    --------------------------------------------------------- */
    function closeModal(result) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        if (resolvePromise) {
            resolvePromise(result);
            resolvePromise = null;
        }
    }

    /* ---------------------------------------------------------
       Event listeners (once)
    --------------------------------------------------------- */
    confirmBtn.addEventListener('click', () => closeModal(true));
    cancelBtn.addEventListener('click', () => closeModal(false));

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(false);
    });

    document.addEventListener('keydown', (e) => {
        if (overlay.style.display === 'flex') {
            if (e.key === 'Escape') closeModal(false);
            if (e.key === 'Enter') closeModal(true);
        }
    });

    /* ---------------------------------------------------------
       Public API
    --------------------------------------------------------- */
    window.showConfirm = function(message, title = 'تأكيد العملية') {
        return new Promise((resolve) => {
            resolvePromise = resolve;
            messageEl.textContent = message;
            
            const titleEl = overlay.querySelector('.dcm-title');
            if (titleEl) titleEl.textContent = title;
            
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    };
})();