/**
 * DENTIX PRO — Dose Calculator
 * Smart pediatric & adult dosing with safety checks
 */

// =========================
// UTILITY FUNCTIONS
// =========================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Safe number parsing
 */
function safeNumber(value, defaultValue = 0) {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Format dose value
 */
function formatDose(value, unit = '') {
    if (value == null || isNaN(value)) return '-';
    const formatted = value < 0.01 ? value.toFixed(4) : value < 1 ? value.toFixed(3) : value.toFixed(2);
    return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// =========================
// LOAD DRUGS
// =========================

async function loadDrugsForCalculator() {
    const select = document.getElementById('drugSelect');
    if (!select) return;

    try {
        // Get current user for filtering
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        let query = supabaseClient
            .from('drugs')
            .select(`
                *,
                drug_categories (id, name)
            `)
            .order('drug_name');

        // Filter by user if authenticated
        if (!userError && userData?.user) {
            query = query.or(`user_id.is.null,user_id.eq.${userData.user.id}`);
        } else {
            query = query.is('user_id', null);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Load drugs error:', error);
            select.innerHTML = '<option value="">Error loading drugs</option>';
            showToast('Failed to load drugs', 'error');
            return;
        }

        select.innerHTML = '<option value="">Select a drug...</option>';

        if (!data || data.length === 0) {
            select.innerHTML = '<option value="">No drugs available</option>';
            return;
        }

        data.forEach(drug => {
            const option = document.createElement('option');
            const categoryName = drug.drug_categories?.name || 'No category';

            // Store drug data as JSON string
            try {
                option.value = JSON.stringify({
                    id: drug.id,
                    drug_name: drug.drug_name,
                    category_name: categoryName,
                    dosage_form: drug.dosage_form,
                    concentration: drug.concentration,
                    mg_per_kg: drug.mg_per_kg,
                    frequency_per_day: drug.frequency_per_day,
                    max_daily_dose: drug.max_daily_dose,
                    min_age: drug.min_age,
                    max_age: drug.max_age,
                    notes: drug.notes
                });
            } catch (e) {
                console.warn('Failed to stringify drug:', drug.drug_name);
                return;
            }

            option.textContent = `${drug.drug_name} (${categoryName})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('❌ loadDrugsForCalculator error:', error);
        select.innerHTML = '<option value="">Error loading drugs</option>';
    }
}

// =========================
// CALCULATE DOSE
// =========================

function calculateDose() {
    const ageInput = document.getElementById('age');
    const weightInput = document.getElementById('weight');
    const drugSelect = document.getElementById('drugSelect');
    const resultBox = document.getElementById('resultBox');
    const resultContent = document.getElementById('resultContent');

    if (!resultBox || !resultContent) return;

    const age = safeNumber(ageInput?.value, 0);
    const weight = safeNumber(weightInput?.value, 0);
    const drugValue = drugSelect?.value;

    // Validation
    if (!age || age <= 0) {
        resultBox.style.display = 'block';
        resultContent.innerHTML = `
            <div class="warning-box">
                <i class="fa-solid fa-circle-exclamation"></i>
                Please enter a valid age
            </div>
        `;
        return;
    }

    if (!drugValue) {
        resultBox.style.display = 'block';
        resultContent.innerHTML = `
            <div class="warning-box">
                <i class="fa-solid fa-circle-exclamation"></i>
                Please select a drug
            </div>
        `;
        return;
    }

    // Parse drug data safely
    let drug;
    try {
        drug = JSON.parse(drugValue);
    } catch (e) {
        console.error('Failed to parse drug data:', e);
        resultBox.style.display = 'block';
        resultContent.innerHTML = `
            <div class="warning-box">
                <i class="fa-solid fa-circle-exclamation"></i>
                Invalid drug data. Please reload the page.
            </div>
        `;
        return;
    }

    // Check age range
    if (drug.min_age != null && age < drug.min_age) {
        resultBox.style.display = 'block';
        resultContent.innerHTML = `
            <div class="warning-box">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Patient age (${age}) is below the minimum age (${drug.min_age} years) for this drug.
            </div>
        `;
        return;
    }

    if (drug.max_age != null && age > drug.max_age) {
        resultBox.style.display = 'block';
        resultContent.innerHTML = `
            <div class="warning-box">
                <i class="fa-solid fa-triangle-exclamation"></i>
                Patient age (${age}) exceeds the maximum age (${drug.max_age} years) for this drug.
            </div>
        `;
        return;
    }

    const mgPerKg = safeNumber(drug.mg_per_kg, 0);
    const concentration = safeNumber(drug.concentration, 0);
    const maxDose = safeNumber(drug.max_daily_dose, 0);
    const frequency = Math.max(1, safeNumber(drug.frequency_per_day, 1));
    const hoursBetween = (24 / frequency).toFixed(1);
    const form = String(drug.dosage_form || '').toLowerCase();

    // Build result
    let resultHtml = '';
    let warningHtml = '';
    let notesHtml = '';

    // Notes
    if (drug.notes) {
        notesHtml = `
            <div class="note-box">
                <i class="fa-solid fa-circle-info"></i>
                <span>${escapeHtml(drug.notes)}</span>
            </div>
        `;
    }

    // =========================
    // PEDIATRIC (0-11 years)
    // =========================

    if (age < 12) {
        if (!weight || weight <= 0) {
            resultBox.style.display = 'block';
            resultContent.innerHTML = `
                <div class="warning-box">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    Weight is required for pediatric dosing
                </div>
            `;
            return;
        }

        const totalDoseMg = weight * mgPerKg;
        const doseMgPerDose = totalDoseMg / frequency;

        // Max dose check
        if (maxDose > 0 && totalDoseMg > maxDose) {
            warningHtml = `
                <div class="warning-box">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>EXCEEDS MAXIMUM DAILY DOSE</strong><br>
                        Calculated: ${formatDose(totalDoseMg, 'mg/day')} | Max allowed: ${formatDose(maxDose, 'mg/day')}
                    </div>
                </div>
            `;
        }

        // Form-specific calculations
        let doseFormHtml = '';

        if (form.includes('susp') || form.includes('syrup')) {
            if (concentration > 0) {
                const doseMl = (doseMgPerDose * 5) / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Syrup Dose (per dose)</strong>
                        <span>${formatDose(doseMl, 'mL')}</span>
                    </div>
                `;
            }
        } else if (form.includes('tablet')) {
            if (concentration > 0) {
                const units = doseMgPerDose / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Tablets Per Dose</strong>
                        <span>${formatDose(units, 'tablet(s)')}</span>
                    </div>
                `;
            }
        } else if (form.includes('capsule')) {
            if (concentration > 0) {
                const units = doseMgPerDose / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Capsules Per Dose</strong>
                        <span>${formatDose(units, 'capsule(s)')}</span>
                    </div>
                `;
            }
        } else if (form.includes('drops')) {
            if (concentration > 0) {
                // Standard: 1 mL ≈ 20 drops
                const doseMl = doseMgPerDose / concentration;
                const drops = doseMl * 20;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Drops Per Dose</strong>
                        <span>${formatDose(drops, 'drops')}</span>
                    </div>
                    <div class="info-item">
                        <strong>Volume Per Dose</strong>
                        <span>${formatDose(doseMl, 'mL')}</span>
                    </div>
                `;
            }
        } else if (form.includes('injection')) {
            if (concentration > 0) {
                const doseMl = doseMgPerDose / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Injection Volume (per dose)</strong>
                        <span>${formatDose(doseMl, 'mL')}</span>
                    </div>
                `;
            }
        } else if (form.includes('suppository')) {
            if (concentration > 0) {
                const units = doseMgPerDose / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Suppositories Per Dose</strong>
                        <span>${formatDose(units, 'unit(s)')}</span>
                    </div>
                `;
            }
        }

        resultHtml = `
            <h3><i class="fa-solid fa-child"></i> Pediatric Dose</h3>

            <div class="info-grid">
                <div class="info-item">
                    <strong>Drug</strong>
                    <span>${escapeHtml(drug.drug_name)}</span>
                </div>
                <div class="info-item">
                    <strong>Category</strong>
                    <span>${escapeHtml(drug.category_name || '-')}</span>
                </div>
                <div class="info-item">
                    <strong>Patient Weight</strong>
                    <span>${formatDose(weight, 'kg')}</span>
                </div>
                <div class="info-item">
                    <strong>Patient Age</strong>
                    <span>${age} years</span>
                </div>
                <div class="info-item">
                    <strong>Total Daily Dose</strong>
                    <span class="dose-value">${formatDose(totalDoseMg, 'mg/day')}</span>
                </div>
                <div class="info-item">
                    <strong>Per Dose (${frequency}x/day)</strong>
                    <span class="dose-value">${formatDose(doseMgPerDose, 'mg')}</span>
                </div>
                <div class="info-item">
                    <strong>Interval</strong>
                    <span>Every ${hoursBetween} hours</span>
                </div>
                ${doseFormHtml}
            </div>

            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(148,163,184,0.08);">
                <small style="color: var(--text-muted);">
                    <i class="fa-solid fa-calculator"></i> 
                    Based on ${mgPerKg} mg/kg/day × ${weight} kg = ${formatDose(totalDoseMg, 'mg/day')}
                </small>
            </div>
        `;

    // =========================
    // ADULT (12+ years)
    // =========================

    } else {
        let totalDoseMg = 0;
        let doseFormHtml = '';
        let dosageHtml = '';

        if (form.includes('susp') || form.includes('syrup')) {
            if (!weight || weight <= 0) {
                resultBox.style.display = 'block';
                resultContent.innerHTML = `
                    <div class="warning-box">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        Weight is required for syrup/suspension dosing
                    </div>
                `;
                return;
            }

            totalDoseMg = weight * mgPerKg;
            const doseMgPerDose = totalDoseMg / frequency;

            if (concentration > 0) {
                const doseMl = (doseMgPerDose * 5) / concentration;
                doseFormHtml = `
                    <div class="info-item">
                        <strong>Syrup Dose</strong>
                        <span>${formatDose(doseMl, 'mL')} every ${hoursBetween}h</span>
                    </div>
                `;
            }

            dosageHtml = `
                <div class="info-item">
                    <strong>Total Daily Dose</strong>
                    <span class="dose-value">${formatDose(totalDoseMg, 'mg/day')}</span>
                </div>
                <div class="info-item">
                    <strong>Per Dose (${frequency}x/day)</strong>
                    <span class="dose-value">${formatDose(doseMgPerDose, 'mg')}</span>
                </div>
            `;

        } else if (form.includes('tablet')) {
            dosageHtml = `
                <div class="info-item">
                    <strong>Dosage</strong>
                    <span>1 tablet every ${hoursBetween} hours</span>
                </div>
            `;
        } else if (form.includes('capsule')) {
            dosageHtml = `
                <div class="info-item">
                    <strong>Dosage</strong>
                    <span>1 capsule every ${hoursBetween} hours</span>
                </div>
            `;
        } else if (form.includes('injection')) {
            if (concentration > 0 && weight > 0) {
                totalDoseMg = weight * mgPerKg;
                const doseMgPerDose = totalDoseMg / frequency;
                const doseMl = doseMgPerDose / concentration;
                dosageHtml = `
                    <div class="info-item">
                        <strong>Total Daily Dose</strong>
                        <span class="dose-value">${formatDose(totalDoseMg, 'mg/day')}</span>
                    </div>
                    <div class="info-item">
                        <strong>Injection Volume</strong>
                        <span>${formatDose(doseMl, 'mL')} every ${hoursBetween}h</span>
                    </div>
                `;
            } else {
                dosageHtml = `
                    <div class="info-item">
                        <strong>Dosage</strong>
                        <span>Every ${hoursBetween} hours</span>
                    </div>
                `;
            }
        } else {
            dosageHtml = `
                <div class="info-item">
                    <strong>Dosage</strong>
                    <span>Every ${hoursBetween} hours</span>
                </div>
            `;
        }

        // Max dose check for adults
        if (maxDose > 0 && totalDoseMg > 0 && totalDoseMg > maxDose) {
            warningHtml = `
                <div class="warning-box">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>EXCEEDS MAXIMUM DAILY DOSE</strong><br>
                        Calculated: ${formatDose(totalDoseMg, 'mg/day')} | Max allowed: ${formatDose(maxDose, 'mg/day')}
                    </div>
                </div>
            `;
        }

        resultHtml = `
            <h3><i class="fa-solid fa-user"></i> Adult Dose</h3>

            <div class="info-grid">
                <div class="info-item">
                    <strong>Drug</strong>
                    <span>${escapeHtml(drug.drug_name)}</span>
                </div>
                <div class="info-item">
                    <strong>Category</strong>
                    <span>${escapeHtml(drug.category_name || '-')}</span>
                </div>
                <div class="info-item">
                    <strong>Patient Age</strong>
                    <span>${age} years</span>
                </div>
                ${weight > 0 ? `
                <div class="info-item">
                    <strong>Patient Weight</strong>
                    <span>${formatDose(weight, 'kg')}</span>
                </div>
                ` : ''}
                ${dosageHtml}
                ${doseFormHtml}
                <div class="info-item">
                    <strong>Frequency</strong>
                    <span>${frequency} times per day</span>
                </div>
            </div>
        `;
    }

    // Render result
    resultBox.style.display = 'block';
    resultContent.innerHTML = resultHtml + warningHtml + notesHtml;

    // Smooth scroll to result
    resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =========================
// ESTIMATE WEIGHT
// =========================

function estimateWeight() {
    const ageInput = document.getElementById('age');
    const weightInput = document.getElementById('weight');
    const hintEl = document.getElementById('weightHint');

    const ageValue = ageInput?.value?.trim();

    if (!ageValue || ageValue === '') {
        showToast('Please enter age first', 'error');
        ageInput?.focus();
        return;
    }

    const age = parseFloat(ageValue);

    if (isNaN(age) || age < 0) {
        showToast('Please enter a valid age', 'error');
        ageInput?.focus();
        return;
    }

    if (age >= 12) {
        showToast('Weight estimation is available for children only (0-11 years)', 'error');
        return;
    }

    let estimatedWeight;

    if (age < 1) {
        // Infants: average 3.5 kg at birth, ~8-10 kg at 1 year
        estimatedWeight = 4 + (age * 6); // Approximate growth
        if (estimatedWeight > 10) estimatedWeight = 10;
    } else if (age <= 5) {
        // 1-5 years: weight = (age × 2) + 8
        estimatedWeight = (age * 2) + 8;
    } else {
        // 6-11 years: weight = (age × 3) + 7
        estimatedWeight = (age * 3) + 7;
    }

    // Round to 1 decimal
    estimatedWeight = Math.round(estimatedWeight * 10) / 10;

    if (weightInput) {
        weightInput.value = estimatedWeight;
    }

    if (hintEl) {
        hintEl.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            Estimated pediatric weight: <strong>${estimatedWeight} kg</strong>
            <br><small style="opacity: 0.7;">Based on standard pediatric growth charts</small>
        `;
    }

    showToast(`Estimated weight: ${estimatedWeight} kg`, 'success');
}


// =========================
// INIT
// =========================

document.addEventListener('DOMContentLoaded', () => {
    loadDrugsForCalculator();
});
