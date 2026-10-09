/* =========================================================
   PATIENT SERVICES — saveWork-style Dental Selection
   + Quantity × Unit Price Auto-Calc
   + INSURANCE AUTO-DISCOUNT (per linked service only)
   ========================================================= */

/* ─── GLOBAL STATE ─── */
window.editingServiceId = null;
window.editingServiceOriginal = null;
window.selectedServiceDentals = window.selectedServiceDentals || [];
window.insurances = window.insurances || [];
window.insuranceServiceLinks = window.insuranceServiceLinks || {};

/* =========================================================
   INSURANCE — LOAD + POPULATE SELECT
   (البيانات تُدار من صفحة control.html / control.js
    ويتم جلبها هنا من جدول insurances)
   + تحميل روابط الخدمات المرتبطة insurance_services
========================================================= */

async function loadInsurances() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) return;

    const userId = userData.user.id;

    const { data, error } = await supabaseClient
        .from('insurances')
        .select('*')
        .eq('user_id', userId)
        .order('name');

    if (error) {
        console.error('Load insurances error:', error);
        window.insurances = [];
        populateInsuranceSelect();
        return;
    }

    window.insurances = data || [];

    /* ─── تحميل روابط الخدمات المرتبطة بكل تأمين ─── */
    await loadInsuranceServiceLinks(userId);

    populateInsuranceSelect();
}


/* =========================================================
   تحميل جدول الربط insurance_services
   وبناء خريطة: "insuranceId:serviceId" => discount_percent
   ========================================================= */

async function loadInsuranceServiceLinks(userId) {

    window.insuranceServiceLinks = {};

    const { data, error } = await supabaseClient
        .from('insurance_services')
        .select('insurance_id, service_id, discount_percent')
        .eq('user_id', userId);

    if (error) {
        console.error('Load insurance service links error:', error);
        return;
    }

    (data || []).forEach(row => {
        window.insuranceServiceLinks[
            `${row.insurance_id}:${row.service_id}`
        ] = Number(row.discount_percent) || 0;
    });
}


/* =========================================================
   جلب نسبة الخصم المرتبطة بخدمة معينة لتأمين معين
   تُرجع النسبة إن وُجد رابط، وإلا تُرجع null
   ========================================================= */

function getLinkedInsurancePercent(insuranceId, serviceId) {

    if (!insuranceId || !serviceId) return null;

    const key = `${insuranceId}:${serviceId}`;

    if (window.insuranceServiceLinks?.hasOwnProperty(key)) {
        return window.insuranceServiceLinks[key];
    }

    return null;
}


function populateInsuranceSelect() {
    const select = document.getElementById('serviceInsurance');
    if (!select) return;

    const current = select.value;

    select.innerHTML = `<option value="">بدون تأمين</option>` +
        (window.insurances || []).map(ins =>
            `<option value="${ins.id}">${ins.name}</option>`
        ).join('');

    if ((window.insurances || []).some(i => String(i.id) === current)) {
        select.value = current;
    }
}

/* =========================================================
   DENTAL CHART TOGGLE / CLOSE
   ========================================================= */
function toggleServiceDentalChart() {
    const panel = document.getElementById('serviceDentalChartPanel');
    const btn = document.getElementById('openServiceDentalChartBtn');
    const arrow = document.getElementById('serviceDentalSelectorArrow');
    if (!panel) return;

    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        closeServiceDentalChart();
    } else {
        panel.classList.add('open');
        if (btn) btn.classList.add('open');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    }
}

function closeServiceDentalChart() {
    const panel = document.getElementById('serviceDentalChartPanel');
    const btn = document.getElementById('openServiceDentalChartBtn');
    const arrow = document.getElementById('serviceDentalSelectorArrow');
    if (panel) panel.classList.remove('open');
    if (btn) btn.classList.remove('open');
    if (arrow) arrow.style.transform = '';
}

/* =========================================================
   DENTAL SELECTION — موحدة بـ window.selectedServiceDentals
   ========================================================= */
function updateServiceDentalsUI() {
    const container = document.getElementById('serviceSelectedDentalsContainer');
    const hiddenInput = document.getElementById('serviceDentalNumber');
    const btnText = document.getElementById('serviceDentalSelectorText');

    // Update hidden input
    if (hiddenInput) {
        hiddenInput.value = window.selectedServiceDentals.join(',');
    }

    // Update button text
    if (btnText) {
        const count = window.selectedServiceDentals.length;
        btnText.textContent = count > 0 ? `${count} سن محدد` : 'اختيار الأسنان';
    }

    // Render chips
    if (container) {
        container.innerHTML = '';
        window.selectedServiceDentals.forEach(num => {
            const chip = document.createElement('div');
            chip.className = 'selected-dental-chip';
            chip.innerHTML = `
                <span class="selected-chip-icon"><i class="fa-solid fa-tooth"></i></span>
                <strong>${num}</strong>
                <button type="button" class="remove-dental-chip" data-dental="${num}" title="إزالة">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            container.appendChild(chip);
        });
    }

    // Auto-sync quantity with selected dentals count
    const qtyInput = document.getElementById('serviceQuantity');
    if (qtyInput && window.selectedServiceDentals.length > 0 && !window.editingServiceId) {
        qtyInput.value = window.selectedServiceDentals.length;
        calculateServiceTotal();
    }
}

// Click on chart teeth
document.addEventListener('click', function (e) {
    const dentalEl = e.target.closest('#serviceDentalChartPanel .dental[data-dental]');
    if (!dentalEl) return;

    const dentalNum = dentalEl.dataset.dental;
    if (!dentalNum) return;

    const idx = window.selectedServiceDentals.indexOf(dentalNum);
    if (idx > -1) {
        window.selectedServiceDentals.splice(idx, 1);
        dentalEl.classList.remove('selected');
    } else {
        window.selectedServiceDentals.push(dentalNum);
        dentalEl.classList.add('selected');
    }

    updateServiceDentalsUI();
});

// Remove chip handler
document.addEventListener('click', function (e) {
    const removeBtn = e.target.closest('.remove-dental-chip');
    if (!removeBtn) return;

    const dentalNum = removeBtn.dataset.dental;
    if (!dentalNum) return;

    const idx = window.selectedServiceDentals.indexOf(dentalNum);
    if (idx > -1) {
        window.selectedServiceDentals.splice(idx, 1);
    }

    // Also unmark in chart
    const chartDental = document.querySelector(`#serviceDentalChartPanel .dental[data-dental="${dentalNum}"]`);
    if (chartDental) chartDental.classList.remove('selected');

    updateServiceDentalsUI();
});

function clearServiceDentalSelection() {
    window.selectedServiceDentals = [];
    document.querySelectorAll('#serviceDentalChartPanel .dental.selected').forEach(el => el.classList.remove('selected'));
    updateServiceDentalsUI();
}

function setServiceDentalSelection(dentalsArray) {
    clearServiceDentalSelection();
    if (!dentalsArray || !dentalsArray.length) return;

    dentalsArray.forEach(num => {
        const strNum = String(num);
        window.selectedServiceDentals.push(strNum);
        const el = document.querySelector(`#serviceDentalChartPanel .dental[data-dental="${strNum}"]`);
        if (el) el.classList.add('selected');
    });

    updateServiceDentalsUI();
}

/* =========================================================
   AUTO-CALC: Unit Price × Quantity = Total
   ========================================================= */
function calculateServiceTotal() {
    const unitPriceInput = document.getElementById('serviceUnitPrice');
    const qtyInput = document.getElementById('serviceQuantity');
    const totalInput = document.getElementById('serviceTotal');

    if (!unitPriceInput || !qtyInput || !totalInput) return;

    const unitPrice = Math.max(parseFloat(unitPriceInput.value) || 0, 0);
    const qty = Math.max(parseInt(qtyInput.value) || 1, 1);

    totalInput.value = (unitPrice * qty).toFixed(2);
    calculateRemain();
}

/* =========================================================
   INPUT EVENTS
   ========================================================= */
document.addEventListener('input', function (e) {
    if (e.target.id === 'serviceUnitPrice' || e.target.id === 'serviceQuantity') {
        calculateServiceTotal();
    }
    if (e.target.id === 'serviceTotal' || e.target.id === 'serviceDiscount' || e.target.id === 'servicePaid') {
        calculateRemain();
    }
});

document.addEventListener('change', function (e) {
    if (e.target.id === 'serviceDiscountType') {
        calculateRemain();
    }
    if (e.target.id === 'serviceInsurance') {
        /* عند تغيير جهة التأمين → إعادة الحساب مع الخصم التلقائي */
        calculateRemain();
    }
    if (e.target.id === 'serviceName') {
        const option = e.target.options[e.target.selectedIndex];
        const price = option?.dataset?.price ?? 0;
        const unitInput = document.getElementById('serviceUnitPrice');
        if (unitInput && price) {
            unitInput.value = price;
        }
        calculateServiceTotal();
        /* ─── إعادة حساب الخصم: قد تتغير نسبة خصم التأمين للخدمة الجديدة ─── */
        calculateRemain();
    }
});

/* =========================================================
   CALCULATE SERVICE AMOUNTS
   + INSURANCE AUTO-DISCOUNT (per linked service only)
   + حقل الخصم قابل للتعديل دائمًا
   ========================================================= */
function calculateRemain() {
    const totalInput = document.getElementById('serviceTotal');
    const discountInput = document.getElementById('serviceDiscount');
    const discountTypeInput = document.getElementById('serviceDiscountType');
    const paidInput = document.getElementById('servicePaid');
    const netTotalInput = document.getElementById('serviceNetTotal');
    const remainInput = document.getElementById('serviceRemain');
    const insuranceSelect = document.getElementById('serviceInsurance');
    const serviceSelect = document.getElementById('serviceName');

    if (!totalInput || !discountInput || !paidInput || !remainInput) return;

    const total = Math.max(parseFloat(totalInput.value) || 0, 0);

    let discountAmount = 0;
    const insuranceId = insuranceSelect?.value || '';

    /* حقل الخصم قابل للكتابة دائمًا */
    discountInput.readOnly = false;

    if (insuranceId) {
        /* ─── خصم التأمين: من جدول الربط فقط ─── */
        const insurance = (window.insurances || []).find(i => String(i.id) === String(insuranceId));

        if (insurance) {
            /*
             * نسبة الخصم:
             * من جدول الربط insurance_services إن كانت الخدمة مرتبطة،
             * وإذا كانت الخدمة غير مرتبطة → لا خصم (0%)
             */
            const clinicServiceId = serviceSelect?.value || '';
            const linkedPercent = getLinkedInsurancePercent(insuranceId, clinicServiceId);

            const percent = linkedPercent !== null
                ? linkedPercent
                : 0;

            if (discountTypeInput) discountTypeInput.value = 'percentage';
            discountInput.value = percent;
            discountAmount = total * (Math.min(percent, 100) / 100);
        }
    } else {
        /* ─── خصم يدوي عادي ─── */
        const rawDiscount = discountInput.value.trim();
        const discountValue = rawDiscount === '' ? 0 : Math.max(parseFloat(rawDiscount) || 0, 0);
        const discountType = discountTypeInput?.value || 'amount';

        if (discountType === 'amount') {
            discountAmount = discountValue;
        } else if (discountType === 'percentage') {
            discountAmount = total * (Math.min(discountValue, 100) / 100);
        }
    }

    discountAmount = Math.min(discountAmount, total);
    const netTotal = Math.max(total - discountAmount, 0);
    const paid = Math.max(parseFloat(paidInput.value) || 0, 0);
    const remain = Math.max(netTotal - paid, 0);

    if (netTotalInput) netTotalInput.value = netTotal.toFixed(2);
    remainInput.value = remain.toFixed(2);

    paidInput.style.borderColor = paid > netTotal ? '#ef4444' : '';
}

/* =========================================================
   SAVE / UPDATE PATIENT SERVICE
   ========================================================= */
async function savePatienttService() {
    if (!window.currentVisitId) {
        alert('Please select or create a visit first');
        return;
    }

    /* ─── SERVICE NAME ─── */
    const serviceSelect = document.getElementById('serviceName');
    const service_name = serviceSelect.options[serviceSelect.selectedIndex]?.text || '';
    if (!service_name || service_name === 'اختر الخدمة') {
        alert('اختر الخدمة أولاً');
        return;
    }

    /* ─── DOCTOR ─── */
    const doctorSelect = document.getElementById('serviceDoctor');
    const doctorId = doctorSelect?.value ? Number(doctorSelect.value) : null;

    /* ─── DOCTOR PERCENT ─── */
    const doctorPercentInput = document.getElementById('serviceDoctorPercent');
    let doctor_percent = Number(doctorPercentInput?.value || 0);
    if (!doctorId) doctor_percent = 0;
    if (doctor_percent < 0 || doctor_percent > 100) {
        alert('نسبة الطبيب يجب أن تكون بين 0 و100%');
        return;
    }

    /* ─── UNIT PRICE & QUANTITY ─── */
    const unit_price = Math.max(Number(document.getElementById('serviceUnitPrice')?.value || 0), 0);
    const quantity = Math.max(Number(document.getElementById('serviceQuantity')?.value || 1), 1);

    /* ─── TOTAL ─── */
    const total_amount = Math.max(Number(document.getElementById('serviceTotal')?.value || 0), 0);

    /* ─── INSURANCE ─── */
    const insuranceSelect = document.getElementById('serviceInsurance');
    const insuranceId = insuranceSelect?.value ? Number(insuranceSelect.value) : null;
    const insurance = insuranceId
        ? (window.insurances || []).find(i => Number(i.id) === insuranceId)
        : null;

    /*
     * نسبة الخصم:
     * من جدول الربط insurance_services إن كانت الخدمة مرتبطة بهذا التأمين،
     * وإذا كانت غير مرتبطة → لا خصم (0%)
     * (لا توجد نسبة خصم عامة لجهة التأمين)
     */
    const clinicServiceId = serviceSelect?.value || '';
    const linkedPercent = getLinkedInsurancePercent(insuranceId, clinicServiceId);

    const insurance_percent = insurance
        ? (linkedPercent !== null ? linkedPercent : 0)
        : 0;

    /* ─── DISCOUNT (يدوي أو من التأمين) ─── */
    let discountValue;
    let discountType;
    let discount_amount = 0;

    if (insurance) {
        /* خصم التأمين من الخدمات المرتبطة فقط */
        discountType = 'percentage';
        discountValue = insurance_percent;
        discount_amount = total_amount * (insurance_percent / 100);
    } else {
        discountValue = Number(document.getElementById('serviceDiscount')?.value || 0);
        discountType = document.getElementById('serviceDiscountType')?.value || 'amount';

        if (discountType === 'percentage') {
            discount_amount = total_amount * (discountValue / 100);
        } else {
            discount_amount = discountValue;
        }
    }
    discount_amount = Math.min(Math.max(discount_amount, 0), total_amount);

    /* ─── VALIDATION ─── */
    if (total_amount < 0) { alert('إجمالي المبلغ غير صحيح'); return; }
    if (discount_amount < 0) { alert('الخصم لا يمكن أن يكون سالبًا'); return; }
    if (discount_amount > total_amount) { alert('الخصم لا يمكن أن يكون أكبر من إجمالي المبلغ'); return; }

    /* ─── NET TOTAL ─── */
    const net_amount = Math.max(total_amount - discount_amount, 0);

    /* ─── DOCTOR AMOUNT ─── */
    const doctor_amount = doctorId ? (net_amount * doctor_percent / 100) : 0;
    const doctorAmountInput = document.getElementById('serviceDoctorAmount');
    if (doctorAmountInput) doctorAmountInput.value = doctor_amount.toFixed(2);

    /* ─── PAID ─── */
    const paid_amount = Number(document.getElementById('servicePaid')?.value || 0);
    if (paid_amount < 0) { alert('المدفوع لا يمكن أن يكون سالبًا'); return; }
    if (paid_amount > net_amount) { alert('المدفوع لا يمكن أن يكون أكبر من المبلغ بعد الخصم'); return; }

    // ─── PAYMENT METHOD ───
    const paymentMethod = document.getElementById('servicePaymentMethod')?.value || 'cash';

    if (!['cash', 'card'].includes(paymentMethod)) {
        alert('اختر طريقة دفع صحيحة');
        return;
    }

    /* ─── REMAIN ─── */
    const remain_amount = Math.max(net_amount - paid_amount, 0);

    /* ─── UPDATE UI ─── */
    const netTotalInput = document.getElementById('serviceNetTotal');
    if (netTotalInput) netTotalInput.value = net_amount.toFixed(2);
    const remainInput = document.getElementById('serviceRemain');
    if (remainInput) remainInput.value = remain_amount.toFixed(2);

    /* ─── USER ─── */
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) { alert('User not found'); return; }
    const userId = userData.user.id;

    /* ─── DENTALS — نستخدم window.selectedServiceDentals الموحدة ─── */
    const dentalNumbers = window.selectedServiceDentals.filter(Boolean);

    /* =========================================================
       EDIT MODE
       ========================================================= */
    if (window.editingServiceId) {
        const { data: currentService, error: getError } = await supabaseClient
            .from('patientt_services')
            .select('id, paid_amount, total_amount, discount_amount')
            .eq('id', window.editingServiceId)
            .single();

        if (getError) { console.error('Get service error:', getError); alert(getError.message); return; }

        const currentPaid = Number(currentService.paid_amount || 0);
        if (currentPaid > net_amount) {
            alert(`لا يمكن أن يصبح المبلغ بعد الخصم أقل من المدفوع الحالي (${currentPaid})`);
            return;
        }
        const newRemain = Math.max(net_amount - currentPaid, 0);

        const { error: updateError } = await supabaseClient
            .from('patientt_services')
            .update({
                service_name: service_name,
                doctor_id: doctorId,
                doctor_percent: doctor_percent,
                doctor_amount: doctor_amount,
                total_amount: total_amount,
                unit_price: unit_price,
                quantity: quantity,
                insurance_id: insuranceId,
                insurance_percent: insurance_percent,
                discount_type: discountType,
                discount_value: discountValue,
                discount_amount: discount_amount,
                remain_amount: newRemain
            })
            .eq('id', window.editingServiceId);

        if (updateError) { console.error('Update service error:', updateError); alert(updateError.message); return; }

        // Update dentals
        await saveServiceDentals(window.editingServiceId, dentalNumbers);

        // Reset edit mode
        window.editingServiceId = null;
        const btn = document.getElementById('saveServiceBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Save Service</span>';
        const cancelBtn = document.getElementById('cancelEditServiceBtn');
        if (cancelBtn) cancelBtn.style.display = 'none';
        const paidInput = document.getElementById('servicePaid');
        if (paidInput) paidInput.readOnly = false;

        showToast('Service Updated');
    }

    /* =========================================================
       ADD NEW SERVICE
       ========================================================= */
    else {
        const { data: newService, error: insertError } = await supabaseClient
            .from('patientt_services')
            .insert([{
                patient_id: patientId,
                visit_id: window.currentVisitId,
                user_id: userId,
                service_name: service_name,
                doctor_id: doctorId,
                doctor_percent: doctor_percent,
                doctor_amount: doctor_amount,
                total_amount: total_amount,
                unit_price: unit_price,
                quantity: quantity,
                insurance_id: insuranceId,
                insurance_percent: insurance_percent,
                discount_type: discountType,
                discount_value: discountValue,
                discount_amount: discount_amount,
                paid_amount: paid_amount,
                remain_amount: remain_amount
            }])
            .select()
            .single();

        if (insertError) { console.error('Insert service error:', insertError); alert(insertError.message); return; }

        // Save dentals
        await saveServiceDentals(newService.id, dentalNumbers);

        // Initial payment
        if (paid_amount > 0) {
            const { error: paymentError } = await supabaseClient
                .from('patient_service_payments')
                .insert([{
                    service_id: newService.id,
                    user_id: userId,
                    amount: paid_amount,
                    previous_paid: 0,
                    previous_remain: net_amount,
                    new_paid: paid_amount,
                    new_remain: remain_amount,
                    action_type: 'initial',
                    payment_method: paymentMethod,
                    note: 'Initial Payment',
                    payment_date: new Date().toISOString()
                }]);
            if (paymentError) {
                console.error('Initial payment error:', paymentError);
                alert('تم حفظ الخدمة ولكن حدث خطأ أثناء تسجيل الدفعة: ' + paymentError.message);
                return;
            }
        }

        showToast('Service Saved');
    }

    /* ─── RESET FORM ─── */
    resetServiceForm();

    /* ─── RELOAD ─── */
    await loadPatienttServices();
    await refreshRelatedVisitCard(window.currentVisitId);
    await loadVisits();
}

/* =========================================================
   SAVE / DELETE SERVICE DENTALS
   ========================================================= */
async function saveServiceDentals(serviceId, dentalsArray) {
    if (!serviceId) {
        throw new Error('Service ID is missing');
    }

    // Normalize teeth numbers
    const teeth = [...new Set(
        (dentalsArray || [])
            .map(t => String(t).trim())
            .filter(Boolean)
    )];

    console.log('🦷 Saving service teeth:', { serviceId, teeth });

    /* ---------------------------------------------------------
       DELETE OLD TEETH
       --------------------------------------------------------- */
    const { error: deleteError } = await supabaseClient
        .from('patient_service_teeth')
        .delete()
        .eq('service_id', serviceId);

    if (deleteError) {
        console.error('❌ Delete old service teeth error:', deleteError);
        throw deleteError;
    }

    /* ---------------------------------------------------------
       NO TEETH SELECTED
       --------------------------------------------------------- */
    if (teeth.length === 0) {
        console.log('ℹ️ No teeth selected for service:', serviceId);
        return true;
    }

    /* ---------------------------------------------------------
       PREPARE RECORDS
       --------------------------------------------------------- */
    const records = teeth.map(toothNumber => ({
        service_id: serviceId,
        tooth_number: toothNumber
    }));

    console.log('🦷 Inserting service teeth:', records);

    /* ---------------------------------------------------------
       INSERT
       --------------------------------------------------------- */
    const { data, error: insertError } = await supabaseClient
        .from('patient_service_teeth')
        .insert(records)
        .select();

    if (insertError) {
        console.error('❌ Insert service teeth error:', insertError);
        alert('تم حفظ الخدمة ولكن لم يتم حفظ الأسنان.\n\nالخطأ:\n' + insertError.message);
        throw insertError;
    }

    console.log('✅ Service teeth saved successfully:', data);
    return true;
}

async function loadServiceDentals(serviceId) {
    if (!serviceId) return [];
    const { data, error } = await supabaseClient
        .from('patient_service_teeth')
        .select('tooth_number')
        .eq('service_id', serviceId);

    if (error) { console.error('Load dentals error:', error); return []; }
    return (data || []).map(t => t.tooth_number);
}

/* =========================================================
   RESET SERVICE FORM
   ========================================================= */
function resetServiceForm() {
    const fields = [
        'serviceName', 'serviceDoctor', 'serviceDoctorPercent',
        'serviceDoctorAmount', 'serviceUnitPrice', 'serviceTotal',
        'serviceDiscount', 'serviceNetTotal', 'servicePaid', 'serviceRemain'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        }
    });

    /* ─── RESET INSURANCE ─── */
    const insuranceSelect = document.getElementById('serviceInsurance');
    if (insuranceSelect) insuranceSelect.selectedIndex = 0;

    /* ─── إعادة الخصم للوضع اليدوي (قابل للكتابة دائمًا) ─── */
    const discountInput = document.getElementById('serviceDiscount');
    if (discountInput) discountInput.readOnly = false;

    const qtyInput = document.getElementById('serviceQuantity');
    if (qtyInput) qtyInput.value = '1';

    clearServiceDentalSelection();
    closeServiceDentalChart();
}

/* =========================================================
   LOAD PATIENT SERVICES (WITH DENTALS & QUANTITY & INSURANCE)
   ========================================================= */
async function loadPatienttServices() {
    const tbody = document.getElementById('patienttServicesList');
    if (!tbody) { console.error('patienttServicesList not found'); return; }
    tbody.innerHTML = '';

    if (!window.currentVisitId) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Select a visit first</td></tr>';
        return;
    }

    /* ─── ORIGINAL SERVICES ─── */
    const { data: originalServices, error: originalError } = await supabaseClient
        .from('patientt_services')
        .select('*')
        .eq('patient_id', patientId)
        .eq('visit_id', window.currentVisitId)
        .order('id', { ascending: false });

    if (originalError) { console.error('Original services error:', originalError); alert(originalError.message); return; }

    /* ─── RECALLED SERVICES ─── */
    const { data: recallLinks, error: recallError } = await supabaseClient
        .from('patient_service_visits')
        .select('id, service_id, visit_id, is_original, created_at')
        .eq('visit_id', window.currentVisitId)
        .eq('is_original', false);

    if (recallError) { console.error('Recalled services error:', recallError); alert(recallError.message); return; }

    const recalledServiceIds = (recallLinks || []).map(l => Number(l.service_id));

    let recalledServices = [];
    if (recalledServiceIds.length) {
        const { data: recalledData, error: recalledDataError } = await supabaseClient
            .from('patientt_services')
            .select('*')
            .eq('patient_id', patientId)
            .in('id', recalledServiceIds);

        if (recalledDataError) { console.error('Recalled service details error:', recalledDataError); alert(recalledDataError.message); return; }
        recalledServices = recalledData || [];
    }

    /* ─── MERGE ─── */
    const services = [];
    for (const s of (originalServices || [])) services.push({ ...s, isRecalled: false, recallDate: null });
    for (const s of recalledServices) {
        const link = (recallLinks || []).find(l => Number(l.service_id) === Number(s.id));
        services.push({ ...s, isRecalled: true, recallDate: link?.created_at || null });
    }

    if (!services.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">No Services Found</td></tr>';
        return;
    }

    /* ─── DOCTORS ─── */
    const doctorIds = [...new Set(services.map(s => Number(s.doctor_id)).filter(id => id > 0))];
    let doctors = [];
    if (doctorIds.length) {
        const { data, error } = await supabaseClient
            .from('doctors')
            .select('id, doctor_name, specialization')
            .in('id', doctorIds);
        if (error) console.error('Load service doctors error:', error);
        else doctors = data || [];
    }
    const doctorLookup = new Map();
    doctors.forEach(d => doctorLookup.set(Number(d.id), d));

    /* ─── RENDER ─── */
    for (const service of services) {
        const doctor = doctorLookup.get(Number(service.doctor_id)) || null;
        const doctorName = doctor?.doctor_name || '';

        const { data: payments, error: paymentError } = await supabaseClient
            .from('patient_service_payments')
            .select('*')
            .eq('service_id', service.id);
        if (paymentError) console.error('Payment error:', paymentError);

        const total = Number(service.total_amount || 0);
        const discountType = service.discount_type || 'amount';
        const discountValue = Number(service.discount_value || 0);
        const discountAmount = Number(service.discount_amount || 0);
        const netTotal = Math.max(total - discountAmount, 0);

        let paid = 0;
        if (payments) payments.forEach(p => paid += Number(p.amount || 0));
        const remain = Math.max(netTotal - paid, 0);

        const quantity = Number(service.quantity || 1);
        const unitPrice = Number(service.unit_price || 0);

        /* ─── INSURANCE ─── */
        const insurance = service.insurance_id
            ? (window.insurances || []).find(i => Number(i.id) === Number(service.insurance_id))
            : null;
        const insuranceName = insurance?.name || '';
        const insurancePercent = Number(service.insurance_percent || 0);

        /* ─── DENTALS ─── */
        const serviceDentals = await loadServiceDentals(service.id);
        const dentalBadgesHTML = serviceDentals.length
            ? `<div class="dental-badges">${serviceDentals.map(t => `<span class="dental-badge">${t}</span>`).join('')}</div>`
            : '<span class="service-no-dental">—</span>';

        const serviceBadge = service.isRecalled
            ? '<span class="recalled-service-badge" title="هذه الخدمة مستدعاة من زيارة سابقة"><i class="fa-solid fa-rotate"></i> Recalled</span>'
            : '';

        const serviceDate = service.created_at ? new Date(service.created_at).toLocaleDateString('en-GB') : '—';
        const recallInfo = service.isRecalled && service.recallDate
            ? `<div style="margin-top:5px;font-size:11px;color:#38bdf8;"><i class="fa-solid fa-rotate"></i> Recalled: ${new Date(service.recallDate).toLocaleDateString('en-GB')}</div>`
            : '';

        const doctorHTML = doctorName
            ? `<div class="service-doctor-wrapper" title="الطبيب الذي قام بالخدمة"><i class="fa-solid fa-user-doctor"></i><span>${typeof escapeHTML === 'function' ? escapeHTML(doctorName) : doctorName}</span></div>`
            : '';

        const serviceName = service.service_name || 'Service';
        const safeServiceName = typeof escapeHTML === 'function' ? escapeHTML(serviceName) : serviceName;

        tbody.innerHTML += `
<tr class="service-row ${service.isRecalled ? 'recalled-service-row' : ''}">

    <!-- SERVICE -->
    <td class="service-main-cell">

        <div class="service-name-wrapper">

            ${doctorHTML}

            <div class="service-name-text">
                ${safeServiceName}
            </div>

            ${serviceBadge}

        </div>


        <!-- HIDDEN DETAILS -->
        <div class="service-hover-details">

            <!-- PRICE -->
            <div class="service-detail-item">

                <i class="fa-solid fa-money-bill"></i>

                <span class="detail-label">
                    السعر:
                </span>

                <strong>
                    ${total.toFixed(2)}
                </strong>

            </div>


            <!-- DISCOUNT -->
            ${
                discountAmount > 0
                ? `
                <div class="service-detail-item discount-detail">

                    <i class="fa-solid fa-tag"></i>

                    <span class="detail-label">
                        الخصم:
                    </span>

                    <strong>
                        ${
                            discountType === 'percentage'
                            ? `-${discountValue}% (${discountAmount.toFixed(2)})`
                            : `-${discountValue.toFixed(2)}`
                        }
                    </strong>

                </div>
                `
                : ''
            }


            <!-- INSURANCE -->
            ${
                insuranceName
                ? `
                <div class="service-detail-item insurance-detail">

                    <i class="fa-solid fa-shield-halved"></i>

                    <span class="detail-label">
                        التأمين:
                    </span>

                    <strong>
                        ${insuranceName} — ${insurancePercent}%
                    </strong>

                </div>
                `
                : ''
            }


            <!-- QUANTITY -->
            <div class="service-detail-item">

                <i class="fa-solid fa-hashtag"></i>

                <span class="detail-label">
                    العدد:
                </span>

                <strong>
                    ${quantity}
                </strong>

            </div>


            <!-- TEETH -->
            <div class="service-detail-item teeth-detail">

                <i class="fa-solid fa-teeth"></i>

                <span class="detail-label">
                    الأسنان:
                </span>

                <div class="hover-dental-badges">

                    ${
                        serviceDentals.length
                        ? serviceDentals
                            .map(
                                t =>
                                `<span class="hover-dental-badge">${t}</span>`
                            )
                            .join('')
                        : '<span class="no-teeth">لا توجد أسنان محددة</span>'
                    }

                </div>

            </div>


            <!-- DOCTOR -->
            ${
                doctorName
                ? `
                <div class="service-detail-item">

                    <i class="fa-solid fa-user-doctor"></i>

                    <span class="detail-label">
                        الطبيب:
                    </span>

                    <strong>
                        ${
                            typeof escapeHTML === 'function'
                            ? escapeHTML(doctorName)
                            : doctorName
                        }
                    </strong>

                </div>
                `
                : ''
            }


            <!-- DATE -->
            <div class="service-detail-item">

                <i class="fa-solid fa-calendar"></i>

                <span class="detail-label">
                    التاريخ:
                </span>

                <strong>
                    ${serviceDate}
                </strong>

            </div>


            <!-- RECALL -->
            ${
                service.isRecalled
                ? `
                <div class="service-detail-item recall-detail">

                    <i class="fa-solid fa-rotate"></i>

                    <span>
                        خدمة مستدعاة من زيارة سابقة
                    </span>

                </div>
                `
                : ''
            }

        </div>

    </td>


  <td>
    <span class="table-amount table-due">
        ${netTotal.toFixed(2)}
    </span>
</td>

<td>
    <span class="table-amount table-paid">
        ${paid.toFixed(2)}
    </span>
</td>

<td>
    <span class="table-amount table-remain">
        ${remain.toFixed(2)}
    </span>
</td>


    <!-- STATUS -->
    <td>

        <label class="service-completion-toggle">

            <input
                type="checkbox"
                ${service.is_completed ? "checked" : ""}
                onchange="toggleServiceCompletion(
                    '${service.id}',
                    this.checked
                )"
            >

            <span class="service-toggle-slider"></span>

        </label>

    </td>


    <!-- ACTIONS -->
    <td>

        <div class="action-buttons">

            <button
                class="action-btn payment-btn"
                onclick="openAddPayment(${service.id})"
                title="إضافة دفعة"
            >
                <i class="fa-solid fa-money-bill-wave"></i>
                <span>دفعة</span>
            </button>


            <button
                class="action-btn history-btn"
                onclick="showPaymentHistory(${service.id})"
                title="سجل المدفوعات"
            >
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>السجل</span>
            </button>


            <button
                class="action-btn print-btn"
                onclick="printServiceInvoice(${service.id})"
                title="طباعة الفاتورة"
            >
                <i class="fa-solid fa-print"></i>
                <span>فاتورة</span>
            </button>


            ${
                service.isRecalled
                ? `
                <button
                    class="action-btn remove-recall-btn"
                    onclick="removeRecalledService(${service.id})"
                    title="إزالة الخدمة المستدعاة"
                >
                    <i class="fa-solid fa-link-slash"></i>
                    <span>إزالة</span>
                </button>
                `
                : ''
            }

        </div>

    </td>

</tr>
`;
    }
    initServiceHoverDetails();
}

/* =====================================================
   POSITION SERVICE HOVER DETAILS
===================================================== */
function positionServiceHoverDetails(row, details) {
    if (!row || !details) return;

    const rowRect = row.getBoundingClientRect();
    let centerX = rowRect.left + (rowRect.width / 2);

    details.style.left = `${centerX}px`;
    details.style.top = '0px';

    const detailsRect = details.getBoundingClientRect();
    const gap = 12;

    let top = rowRect.top - detailsRect.height - gap;

    if (top < 15) {
        top = rowRect.bottom + gap;
    }

    const halfWidth = detailsRect.width / 2;
    const minCenter = halfWidth + 15;
    const maxCenter = window.innerWidth - halfWidth - 15;

    if (centerX < minCenter) centerX = minCenter;
    if (centerX > maxCenter) centerX = maxCenter;

    details.style.left = `${centerX}px`;
    details.style.top = `${top}px`;
}

/* =====================================================
   INIT SERVICE HOVER
===================================================== */
function initServiceHoverDetails() {
    const rows = document.querySelectorAll('.services-table .service-row');

    rows.forEach(row => {
        const details = row.querySelector('.service-hover-details');
        if (!details) return;

        row.addEventListener('mouseenter', () => {
            if (details.parentElement !== document.body) {
                document.body.appendChild(details);
            }

            details.classList.add('is-visible');

            requestAnimationFrame(() => {
                positionServiceHoverDetails(row, details);
            });
        });

        row.addEventListener('mouseleave', () => {
            details.classList.remove('is-visible');
        });
    });
}

/* =========================================================
   EDIT SERVICE (WITH DENTALS & INSURANCE)
   ========================================================= */
async function editPatienttService(id) {
    const details = document.getElementById('addServiceDetails');
    if (details) {
        details.open = true;
        details.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const { data: service, error } = await supabaseClient
        .from('patientt_services')
        .select('*')
        .eq('id', id)
        .single();

    if (error) { console.error('Edit service error:', error); alert(error.message); return; }
    if (!service) { alert('الخدمة غير موجودة'); return; }

    window.editingServiceId = id;

    /* ─── SERVICE NAME ─── */
    const serviceSelect = document.getElementById('serviceName');
    if (serviceSelect) {
        let found = false;
        for (let i = 0; i < serviceSelect.options.length; i++) {
            if (serviceSelect.options[i].text.trim() === String(service.service_name || '').trim()) {
                serviceSelect.selectedIndex = i; found = true; break;
            }
        }
        if (!found) console.warn('Service not found in select:', service.service_name);
    }

    /* ─── DOCTOR ─── */
    const doctorSelect = document.getElementById('serviceDoctor');
    if (doctorSelect) {
        doctorSelect.value = '';
        if (service.doctor_id) {
            const doctorId = String(service.doctor_id);
            let doctorFound = false;
            for (let i = 0; i < doctorSelect.options.length; i++) {
                if (String(doctorSelect.options[i].value) === doctorId) {
                    doctorSelect.selectedIndex = i; doctorFound = true; break;
                }
            }
            if (!doctorFound) {
                try {
                    const { data: doctor, error: doctorError } = await supabaseClient
                        .from('doctors').select('id, doctor_name').eq('id', service.doctor_id).single();
                    if (!doctorError && doctor) {
                        const option = document.createElement('option');
                        option.value = doctor.id;
                        option.textContent = doctor.doctor_name;
                        doctorSelect.appendChild(option);
                        doctorSelect.value = String(doctor.id);
                    }
                } catch (e) { console.error('Doctor loading error:', e); }
            }
        }
    }

    /* ─── UNIT PRICE & QUANTITY ─── */
    const unitPriceInput = document.getElementById('serviceUnitPrice');
    if (unitPriceInput) unitPriceInput.value = service.unit_price ?? 0;

    const qtyInput = document.getElementById('serviceQuantity');
    if (qtyInput) qtyInput.value = service.quantity ?? 1;

    /* ─── TOTAL ─── */
    const totalInput = document.getElementById('serviceTotal');
    if (totalInput) totalInput.value = service.total_amount ?? 0;

    /* ─── INSURANCE ─── */
    const insuranceSelect = document.getElementById('serviceInsurance');
    if (insuranceSelect) {
        insuranceSelect.value = service.insurance_id ? String(service.insurance_id) : '';
    }

    /* ─── DISCOUNT (القيمة الأصلية وليس المبلغ المحسوب) ─── */
    const discountInput = document.getElementById('serviceDiscount');
    if (discountInput) discountInput.value = service.discount_value ?? 0;

    const discountTypeInput = document.getElementById('serviceDiscountType');
    if (discountTypeInput) discountTypeInput.value = service.discount_type ?? 'amount';

    /* ─── PAID (readonly) ─── */
    const paidInput = document.getElementById('servicePaid');
    if (paidInput) { paidInput.value = service.paid_amount ?? 0; paidInput.readOnly = true; }

    /* ─── REMAIN (readonly) ─── */
    const remainInput = document.getElementById('serviceRemain');
    if (remainInput) { remainInput.value = service.remain_amount ?? 0; remainInput.readOnly = true; }

    /* ─── DENTALS — نستخدم window.selectedServiceDentals الموحدة ─── */
    const serviceDentals = await loadServiceDentals(id);
    setServiceDentalSelection(serviceDentals);

    /* ─── إعادة الحساب مع التأمين ─── */
    calculateRemain();

    /* ─── ORIGINAL ─── */
    window.editingServiceOriginal = {
        total: Number(service.total_amount || 0),
        discount: Number(service.discount_amount || 0),
        paid: Number(service.paid_amount || 0),
        remain: Number(service.remain_amount || 0),
        doctorId: service.doctor_id ? Number(service.doctor_id) : null
    };

    /* ─── BUTTONS ─── */
    const btn = document.getElementById('saveServiceBtn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-pen"></i> <span>Update Service</span>';
    const cancelBtn = document.getElementById('cancelEditServiceBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    if (serviceSelect) serviceSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });

    console.log('✏️ Editing service:', { id, serviceName: service.service_name, doctorId: service.doctor_id, dentals: serviceDentals });
}

function cancelServiceEdit() {
    window.editingServiceId = null;
    window.editingServiceOriginal = null;
    resetServiceForm();

    const btn = document.getElementById('saveServiceBtn');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Add Service</span>';
    const cancelBtn = document.getElementById('cancelEditServiceBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
}

/* =========================================================
   DELETE SERVICE (WITH DENTALS)
   ========================================================= */
async function deletePatienttService(id) {
    const { error: paymentDeleteError } = await supabaseClient
        .from('patient_service_payments').delete().eq('service_id', id);
    if (paymentDeleteError) { alert(paymentDeleteError.message); return; }

    const { error: dentalsDeleteError } = await supabaseClient
        .from('patient_service_teeth').delete().eq('service_id', id);
    if (dentalsDeleteError) console.error('Dentals delete error:', dentalsDeleteError);

    const { error } = await supabaseClient
        .from('patientt_services').delete().eq('id', id);
    if (error) { alert(error.message); return; }

    showToast('Service Deleted');
    loadVisits();
    loadPatienttServices();
}

/* =========================================================
   RECALL SERVICE
   ========================================================= */
async function recallPatientService(serviceId) {
    if (!window.currentVisitId) { showToast('اختر الزيارة الحالية أولاً'); return; }
    if (!patientId) { showToast('لم يتم تحديد المريض'); return; }

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) { showToast('User not found'); return; }
    const userId = userData.user.id;

    const { data: service, error: serviceError } = await supabaseClient
        .from('patientt_services')
        .select('id, patient_id, visit_id, service_name, total_amount, paid_amount, remain_amount')
        .eq('id', serviceId)
        .eq('patient_id', patientId)
        .eq('user_id', userId)
        .single();

    if (serviceError) { console.error('Recall service error:', serviceError); showToast('الخدمة غير موجودة أو لا تخص هذا المريض'); return; }
    if (Number(service.visit_id) === Number(window.currentVisitId)) { showToast('هذه الخدمة موجودة بالفعل في الزيارة الحالية'); return; }

    const { data: existingRecall, error: existingError } = await supabaseClient
        .from('patient_service_visits').select('id')
        .eq('service_id', service.id).eq('visit_id', window.currentVisitId).maybeSingle();

    if (existingError) { console.error('Recall check error:', existingError); showToast('حدث خطأ أثناء التحقق'); return; }
    if (existingRecall) { showToast('الخدمة مستدعاة بالفعل في هذه الزيارة'); return; }

    const { error: insertError } = await supabaseClient
        .from('patient_service_visits')
        .insert({ service_id: service.id, visit_id: window.currentVisitId, user_id: userId, is_original: false });

    if (insertError) { console.error('Recall insert error:', insertError); showToast(insertError.message); return; }

    showToast('تم استدعاء الخدمة بنجاح');
    await loadPatienttServices();
}

/* =========================================================
   PAYMENT FUNCTIONS
   MODIFIED: Added payment_method (cash/card)
   ========================================================= */
function openAddPayment(serviceId) {
    window.selectedPaymentServiceId = serviceId;
    supabaseClient.from('patientt_services').select('*').eq('id', serviceId).single()
        .then(({ data, error }) => {
            if (error) { alert(error.message); return; }
            document.getElementById('paymentServiceName').textContent = data.service_name;
            document.getElementById('paymentCurrentRemain').textContent = data.remain_amount;
            const methodSelect = document.getElementById('paymentMethodSelect');
            if (methodSelect) methodSelect.value = 'cash';
            document.getElementById('addPaymentModal').classList.add('show');
        });
}

function closeAddPayment() {
    document.getElementById('addPaymentModal').classList.remove('show');
    document.getElementById('newPaymentAmount').value = '';
    const methodSelect = document.getElementById('paymentMethodSelect');
    if (methodSelect) methodSelect.value = 'cash';
    window.selectedPaymentServiceId = null;
}

async function savePayment() {
    const serviceId = window.selectedPaymentServiceId;
    if (!serviceId) { alert('No service selected'); return; }

    const amount = Number(document.getElementById('newPaymentAmount')?.value || 0);
    if (!Number.isFinite(amount) || amount <= 0) { alert('Enter valid amount'); return; }

    const paymentMethod = document.getElementById('paymentMethodSelect')?.value || 'cash';

    const { data: service, error } = await supabaseClient
        .from('patientt_services')
        .select('id, total_amount, discount_amount, paid_amount, remain_amount')
        .eq('id', serviceId).single();

    if (error) { console.error('❌ Service error:', error); alert(error.message); return; }
    if (!service) { alert('Service not found'); return; }

    const total = Math.max(Number(service.total_amount || 0), 0);
    let discount = Number(service.discount_amount || 0);
    if (!Number.isFinite(discount)) discount = 0;
    discount = Math.min(Math.max(discount, 0), total);

    const dueAmount = Math.max(total - discount, 0);
    const previousPaid = Math.max(Number(service.paid_amount || 0), 0);
    const calculatedPreviousRemain = Math.max(dueAmount - previousPaid, 0);

    if (previousPaid > dueAmount) {
        console.warn('⚠️ Previous paid exceeds discounted due amount', { serviceId, total, discount, dueAmount, previousPaid });
    }

    const maxPayment = Math.max(dueAmount - previousPaid, 0);
    if (amount > maxPayment) { alert(`Payment cannot exceed the remaining amount.\n\nRemaining: ${maxPayment.toFixed(2)} EGP`); return; }

    const newPaid = previousPaid + amount;
    const newRemain = Math.max(dueAmount - newPaid, 0);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) { alert('Unable to get user'); return; }
    const userId = userData.user.id;

    const { error: paymentError } = await supabaseClient.from('patient_service_payments').insert([{
        service_id: serviceId, user_id: userId, amount: amount,
        previous_paid: previousPaid, previous_remain: calculatedPreviousRemain,
        new_paid: newPaid, new_remain: newRemain, action_type: 'payment',
        note: 'New Payment', payment_date: new Date().toISOString(),
        payment_method: paymentMethod
    }]);

    if (paymentError) { console.error('❌ Payment insert error:', paymentError); alert(paymentError.message); return; }

    const { error: updateError } = await supabaseClient.from('patientt_services')
        .update({ paid_amount: newPaid, remain_amount: newRemain }).eq('id', serviceId);

    if (updateError) { console.error('❌ Service update error:', updateError); alert(updateError.message); return; }

    closeAddPayment();
    showToast('Payment Added');
    loadPatienttServices();
    loadVisits();
}

/* =========================================================
   SHOW PAYMENT HISTORY
   MODIFIED: Added delete button per payment row
   ========================================================= */
async function showPaymentHistory(serviceId) {
    const { data: service, error: serviceError } = await supabaseClient
        .from('patientt_services').select('*').eq('id', serviceId).single();
    window.currentHistoryServiceId = serviceId;
    if (serviceError) { alert(serviceError.message); return; }

    const { data: payments, error: paymentError } = await supabaseClient
        .from('patient_service_payments')
        .select('*')
        .eq('service_id', serviceId)
        .order('payment_date', { ascending: true });

    if (paymentError) {
        console.error('Payment error:', paymentError);
        alert(paymentError.message);
        return;
    }

    const originalTotal = Math.max(Number(service.total_amount || 0), 0);
    const discount = Math.min(Math.max(Number(service.discount_amount || 0), 0), originalTotal);
    const totalAfterDiscount = Math.max(originalTotal - discount, 0);

    document.getElementById('historyServiceName').textContent = service.service_name;
    document.getElementById('historyTotal').textContent = totalAfterDiscount.toFixed(2);
    document.getElementById('historyPaid').textContent = Number(service.paid_amount || 0).toFixed(2);
    document.getElementById('historyRemain').textContent = Number(service.remain_amount || 0).toFixed(2);

    const tbody = document.getElementById('paymentHistoryBody');
    tbody.innerHTML = '';

    if (!payments || !payments.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:35px;color:#94a3b8;">No Payment History</td></tr>';
    } else {
        payments.forEach(payment => {
            const methodLabel = payment.payment_method === 'card' ? '💳 كارد' : '💵 كاش';
            const methodClass = payment.payment_method === 'card' ? 'method-card' : 'method-cash';

            tbody.innerHTML += `
        <tr>
          <td>${new Date(payment.payment_date).toLocaleString('en-GB')}</td>
          <td>${payment.amount}</td>
          <td><span class="payment-method-badge ${methodClass}">${methodLabel}</span></td>
          <td>${payment.previous_paid || 0}</td>
          <td>${payment.new_paid || 0}</td>
          <td>${payment.previous_remain || 0}</td>
          <td>${payment.new_remain || 0}</td>
          <td>${payment.note || '-'}</td>
          <td>
            <button class="delete-payment-btn" onclick="deletePayment(${payment.id}, ${serviceId})" title="حذف الدفعة">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>`;
        });
    }
    document.getElementById('paymentHistoryModal').classList.add('show');
}

/* =========================================================
   DELETE PAYMENT
   يحذف الدفعة ويُعيد حساب paid_amount و remain_amount
   ========================================================= */
async function deletePayment(paymentId, serviceId) {
    if (!await showConfirm('هل تريد حذف هذه الدفعة؟ سيتم تحديث الرصيد تلقائياً.')) return;

    const { data: service, error: svcErr } = await supabaseClient
        .from('patientt_services')
        .select('total_amount, discount_amount')
        .eq('id', serviceId)
        .single();

    if (svcErr) { alert('خطأ في جلب بيانات الخدمة'); return; }

    const total = Math.max(Number(service.total_amount || 0), 0);
    const discount = Math.min(Math.max(Number(service.discount_amount || 0), 0), total);
    const dueAmount = Math.max(total - discount, 0);

    const { error: delErr } = await supabaseClient
        .from('patient_service_payments')
        .delete()
        .eq('id', paymentId);

    if (delErr) { alert('فشل حذف الدفعة'); console.error(delErr); return; }

    const { data: remainingPayments, error: remErr } = await supabaseClient
        .from('patient_service_payments')
        .select('amount')
        .eq('service_id', serviceId);

    if (remErr) { alert('فشل إعادة حساب الرصيد'); console.error(remErr); return; }

    const newPaid = (remainingPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const newRemain = Math.max(dueAmount - newPaid, 0);

    const { error: updErr } = await supabaseClient
        .from('patientt_services')
        .update({ paid_amount: newPaid, remain_amount: newRemain })
        .eq('id', serviceId);

    if (updErr) { alert('فشل تحديث الرصيد'); console.error(updErr); return; }

    showToast('✅ تم حذف الدفعة وتحديث الرصيد');
    showPaymentHistory(serviceId);
    loadPatienttServices();
    loadVisits();
}

function closePaymentHistory() {
    document.getElementById('paymentHistoryModal').classList.remove('show');
}

function editServiceFromHistory() {
    const id = window.currentHistoryServiceId;
    closePaymentHistory();
    loadVisits();
    editPatienttService(id);
}

async function deleteServiceFromHistory() {
    const id = window.currentHistoryServiceId;
    if (!await showConfirm('هل تريد حذف الخدمة وجميع الدفعات؟')) return;
    await deletePatienttService(id);
    loadVisits();
    closePaymentHistory();
}

/* =========================================================
   CLINIC SERVICES DROPDOWN
   ========================================================= */
async function loadClinicServicesDropdown() {
    const select = document.getElementById('serviceName');
    if (!select) { console.log('serviceName select not found'); return; }

    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;

    const { data, error } = await supabaseClient
        .from('clinic_services').select('*').eq('user_id', userId).order('service_name');

    if (error) { console.log(error); return; }
    console.log('clinic services:', data);

    select.innerHTML = '<option value="">اختر الخدمة</option>';
    data.forEach(service => {
        console.log(service.service_name, service.service_price);
        select.innerHTML += `<option value="${service.id}" data-price="${service.service_price ?? 0}">${service.service_name}</option>`;
    });
}

/* =========================================================
   TOGGLE SERVICE COMPLETION
   ========================================================= */
async function toggleServiceCompletion(serviceId, isCompleted) {
    if (!serviceId) return;

    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) { showToast("تعذر التحقق من المستخدم"); return; }

        const { error } = await supabaseClient
            .from("patientt_services")
            .update({ is_completed: Boolean(isCompleted) })
            .eq("id", serviceId)
            .eq("user_id", user.id);

        if (error) {
            console.error("toggleServiceCompletion error:", error);
            showToast("تعذر تحديث حالة الخدمة");
            return;
        }

        showToast(isCompleted ? "تم تحديد الخدمة كمكتملة ✓" : "تم تحديد الخدمة كغير مكتملة");

    } catch (error) {
        console.error("toggleServiceCompletion error:", error);
        showToast("حدث خطأ أثناء تحديث حالة الخدمة");
    }
}

/* =========================================================
   SERVICE DENTAL SELECTOR — نسخة موحدة ومصححة
   ========================================================= */
function initServiceDentalSelector() {
    const chart = document.getElementById('serviceDentalChartPanel');
    if (!chart) return;

    chart.querySelectorAll('.dental').forEach(tooth => {
        if (tooth.dataset.dentalInitialized === 'true') return;
        tooth.dataset.dentalInitialized = 'true';

        tooth.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const number = this.dataset.dental;
            if (!number) return;

            const idx = window.selectedServiceDentals.indexOf(number);
            if (idx === -1) {
                window.selectedServiceDentals.push(number);
                this.classList.add('selected');
            } else {
                window.selectedServiceDentals.splice(idx, 1);
                this.classList.remove('selected');
            }
            updateServiceDentalsUI();
        });
    });

    updateServiceDentalsUI();
}

/* =========================================================
   INITIALIZE
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
    initServiceDentalSelector();
    loadInsurances();          /* ← تحميل جهات التأمين + الروابط */
    loadClinicServicesDropdown();
});