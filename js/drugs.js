/**
 * DENTIX PRO — Drugs Manager
 * Clean, secure, and modern drug management
 */

// =========================
// UTILITY FUNCTIONS
// =========================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format number with safe defaults
 */
function safeNum(value, decimals = 2) {
    const num = Number(value);
    if (isNaN(num) || value == null || value === '') return null;
    return num.toFixed(decimals);
}

/**
 * Format integer with safe defaults
 */
function safeInt(value) {
    const num = Number(value);
    if (isNaN(num) || value == null || value === '') return null;
    return Math.round(num);
}

// =========================
// LOAD CATEGORIES
// =========================

async function loadCategories() {
    const select = document.getElementById('category');
    if (!select) return;

    try {
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user) {
            console.error('❌ Auth error:', userError);
            showToast('Authentication required', 'error');
            return;
        }

        const userId = userData.user.id;

        const { data, error } = await supabaseClient
            .from('drug_categories')
            .select('*')
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .order('name');

        if (error) {
            console.error('❌ Categories error:', error);
            showToast('Failed to load categories', 'error');
            return;
        }

        // Save current selection
        const currentValue = select.value;

        select.innerHTML = '<option value="">Select Category</option>';

        (data || []).forEach(category => {
            const isGlobal = category.user_id === null;
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = `${category.name}${isGlobal ? ' (Global)' : ''}`;
            select.appendChild(option);
        });

        // Restore selection if valid
        if (currentValue) {
            select.value = currentValue;
        }

    } catch (error) {
        console.error('❌ loadCategories error:', error);
        showToast('An error occurred', 'error');
    }
}

// =========================
// SAVE DRUG
// =========================

async function saveDrug() {
    try {
        // Get current user
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user) {
            showToast('Please sign in to save drugs', 'error');
            return;
        }

        const userId = userData.user.id;

        // Get form values
        const drug_name = document.getElementById('drugName').value.trim();
        const category_id = document.getElementById('category').value;
        const concentration = document.getElementById('concentration').value.trim();
        const dosage_form = document.getElementById('dosageForm').value;
        const min_age = Number(document.getElementById('minAge').value) || null;
        const max_age = Number(document.getElementById('maxAge').value) || null;
        const mg_per_kg = Number(document.getElementById('mgPerKg').value) || null;
        const frequency_per_day = Number(document.getElementById('frequency').value) || null;
        const max_daily_dose = Number(document.getElementById('maxDose').value) || null;
        const duration_days = Number(document.getElementById('duration').value) || null;
        const notes = document.getElementById('notes').value.trim();

        // Validation
        if (!drug_name) {
            showToast('Please enter drug name', 'error');
            document.getElementById('drugName').focus();
            return;
        }

        if (!category_id) {
            showToast('Please select a category', 'error');
            document.getElementById('category').focus();
            return;
        }

        if (!dosage_form) {
            showToast('Please select dosage form', 'error');
            document.getElementById('dosageForm').focus();
            return;
        }

        // Validate age range
        if (min_age != null && max_age != null && min_age > max_age) {
            showToast('Min age cannot be greater than max age', 'error');
            return;
        }

        // Show loading state
        const saveBtn = document.querySelector('.btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        // Save to database
        const { error } = await supabaseClient
            .from('drugs')
            .insert([{
                user_id: userId,
                category_id,
                drug_name,
                concentration: concentration || null,
                dosage_form,
                min_age,
                max_age,
                mg_per_kg,
                frequency_per_day,
                max_daily_dose,
                duration_days,
                notes: notes || null
            }]);

        // Restore button
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;

        if (error) {
            console.error('❌ Save drug error:', error);
            showToast(error.message || 'Failed to save drug', 'error');
            return;
        }

        showToast('Drug saved successfully', 'success');
        clearForm();
        await loadCategories();
        await loadDrugs();

    } catch (error) {
        console.error('❌ saveDrug error:', error);
        showToast(error?.message || 'An error occurred while saving', 'error');

        // Restore button on error
        const saveBtn = document.querySelector('.btn-primary');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Save Drug';
            saveBtn.disabled = false;
        }
    }
}

// =========================
// CLEAR FORM
// =========================

function clearForm() {
    const fields = [
        'drugName', 'category', 'concentration', 'dosageForm',
        'minAge', 'maxAge', 'mgPerKg', 'frequency', 
        'maxDose', 'duration', 'notes'
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset placeholder
    changeConcentrationPlaceholder();

    // Focus first field
    document.getElementById('drugName')?.focus();
}

// =========================
// LOAD DRUGS
// =========================

async function loadDrugs() {
    const searchInput = document.getElementById('searchInput');
    const container = document.getElementById('drugsContainer');
    const countEl = document.getElementById('drugCount');

    if (!container) return;

    try {
        const search = searchInput?.value.trim().toLowerCase() || '';

        // Get current user
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user) {
            console.error('❌ Auth error:', userError);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-user-lock"></i>
                    <p>Please sign in to view drugs</p>
                </div>
            `;
            return;
        }

        const userId = userData.user.id;

        // Load global + clinic drugs
        const { data, error } = await supabaseClient
            .from('drugs')
            .select(`
                *,
                drug_categories (id, name, user_id)
            `)
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .order('drug_name');

        if (error) {
            console.error('❌ Drugs error:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Failed to load drugs</p>
                </div>
            `;
            return;
        }

        // Filter
        const filtered = (data || []).filter(drug => {
            return String(drug.drug_name || '')
                .toLowerCase()
                .includes(search);
        });

        // Update count
        if (countEl) {
            countEl.textContent = `${filtered.length} drug${filtered.length !== 1 ? 's' : ''}`;
        }

        // Clear container
        container.innerHTML = '';

        // No results
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-box-open"></i>
                    <p>${search ? 'No drugs match your search' : 'No drugs found. Add your first drug above.'}</p>
                </div>
            `;
            return;
        }

        // Render drugs using DOM API (XSS-safe)
        filtered.forEach((drug, index) => {
            const isGlobal = drug.user_id === null;
            const categoryName = drug.drug_categories?.name || 'Uncategorized';

            const card = document.createElement('div');
            card.className = 'drug-card';
            card.style.animationDelay = `${index * 0.05}s`;

            // Build details HTML safely
            const details = [];
            if (drug.concentration) {
                details.push(`<div class="drug-detail"><strong>Concentration:</strong> <span>${escapeHtml(drug.concentration)}</span></div>`);
            }
            if (drug.dosage_form) {
                details.push(`<div class="drug-detail"><strong>Form:</strong> <span>${escapeHtml(drug.dosage_form)}</span></div>`);
            }
            if (drug.min_age != null || drug.max_age != null) {
                const ageRange = `${drug.min_age ?? '0'} - ${drug.max_age ?? '∞'}`;
                details.push(`<div class="drug-detail"><strong>Age:</strong> <span>${escapeHtml(ageRange)} years</span></div>`);
            }
            if (drug.mg_per_kg) {
                details.push(`<div class="drug-detail"><strong>Dose:</strong> <span>${drug.mg_per_kg} mg/kg/day</span></div>`);
            }
            if (drug.frequency_per_day) {
                details.push(`<div class="drug-detail"><strong>Frequency:</strong> <span>${drug.frequency_per_day}x / day</span></div>`);
            }
            if (drug.max_daily_dose) {
                details.push(`<div class="drug-detail"><strong>Max:</strong> <span>${drug.max_daily_dose} mg/day</span></div>`);
            }
            if (drug.duration_days) {
                details.push(`<div class="drug-detail"><strong>Duration:</strong> <span>${drug.duration_days} days</span></div>`);
            }

            const badgeClass = isGlobal ? 'global' : 'clinic';
            const badgeIcon = isGlobal ? 'fa-globe' : 'fa-building';
            const badgeText = isGlobal ? 'Global Drug' : 'Clinic Drug';

            const notesHtml = drug.notes 
                ? `<div class="drug-notes">${escapeHtml(drug.notes)}</div>` 
                : '';

            const deleteBtn = !isGlobal 
                ? `<button class="delete-btn" onclick="deleteDrug(${drug.id})" title="Delete drug" aria-label="Delete ${escapeHtml(drug.drug_name)}">
                     <i class="fa-solid fa-trash"></i>
                   </button>` 
                : '';

            card.innerHTML = `
                <div class="drug-info">
                    <div class="drug-meta">
                        <span class="category-badge">${escapeHtml(categoryName)}</span>
                        <span class="drug-badge ${badgeClass}">
                            <i class="fa-solid ${badgeIcon}"></i> ${badgeText}
                        </span>
                    </div>
                    <div class="drug-name">${escapeHtml(drug.drug_name)}</div>
                    <div class="drug-details">
                        ${details.join('')}
                    </div>
                    ${notesHtml}
                </div>
                <div class="drug-actions">
                    ${deleteBtn}
                </div>
            `;

            container.appendChild(card);
        });

    } catch (error) {
        console.error('❌ loadDrugs error:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>An error occurred while loading drugs</p>
            </div>
        `;
    }
}

// Debounced version for search
const debounceLoadDrugs = debounce(loadDrugs, 300);

// =========================
// DELETE DRUG
// =========================

async function deleteDrug(id) {
    if (!id) return;

    const confirmed = await showConfirm('Are you sure you want to delete this drug?');
    if (!confirmed) return;

    try {
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData?.user) {
            showToast('Authentication required', 'error');
            return;
        }

        const userId = userData.user.id;

        const { error } = await supabaseClient
            .from('drugs')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('❌ Delete drug error:', error);
            showToast(error.message || 'Failed to delete drug', 'error');
            return;
        }

        showToast('Drug deleted successfully', 'success');
        await loadDrugs();

    } catch (error) {
        console.error('❌ deleteDrug error:', error);
        showToast('An error occurred while deleting', 'error');
    }
}

// =========================
// CONCENTRATION PLACEHOLDER
// =========================

function changeConcentrationPlaceholder() {
    const dosageForm = document.getElementById('dosageForm')?.value;
    const concentrationInput = document.getElementById('concentration');
    if (!concentrationInput) return;

    const placeholders = {
        'Suspension': 'Concentration (mg / 5 mL)',
        'Syrup': 'Concentration (mg / 5 mL)',
        'Drops': 'Concentration (mg / mL)',
        'Tablet': 'Strength per unit (mg per tablet)',
        'Capsule': 'Strength per unit (mg per capsule)',
        'Suppository': 'Strength per unit (mg per suppository)',
        'Injection': 'Concentration (mg / mL)',
        'Inhaler': 'Strength per puff (mcg)'
    };

    concentrationInput.placeholder = placeholders[dosageForm] || 'Concentration';
}

// =========================
// TOAST NOTIFICATION
// =========================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;

    // Force reflow
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}



// =========================
// INIT
// =========================

document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    loadDrugs();

    // Set initial placeholder
    changeConcentrationPlaceholder();
});
